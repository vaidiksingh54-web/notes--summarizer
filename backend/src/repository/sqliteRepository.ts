import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import type {
  Activity,
  Notification,
  Profile,
  PublicStudent,
  StoredStudent,
  StudyItem,
} from "../types.ts";
import type { Repository } from "./repository.ts";
import { InMemoryRepository } from "./databaseRepository.ts";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

interface SqliteStatement {
  run(...params: unknown[]): { changes: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

export class SqliteRepository implements Repository {
  private db: SqliteDb | null = null;
  private memoryFallback: InMemoryRepository | null = null;

  constructor(dbPath?: string) {
    try {
      const req = createRequire(import.meta.url);
      const { DatabaseSync } = req("node:sqlite") as { DatabaseSync: new (p: string) => SqliteDb };
      const resolvedPath = dbPath || process.env.DATABASE_PATH || path.resolve(process.cwd(), "backend/study_app.db");
      if (resolvedPath !== ":memory:") {
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      this.db = new DatabaseSync(resolvedPath);
      this.initTables();
    } catch (err) {
      console.warn("SQLite unavailable, using in-memory repository fallback:", err instanceof Error ? err.message : err);
      this.memoryFallback = new InMemoryRepository();
    }
  }

  private initTables(): void {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_items (
        id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        type TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        PRIMARY KEY (student_id, id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        time TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
      CREATE INDEX IF NOT EXISTS idx_study_items_student ON study_items (student_id);
      CREATE INDEX IF NOT EXISTS idx_activities_student ON activities (student_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications (student_id);
    `);
  }

  createStudent(email: string, passwordHash: string, profile: Profile): PublicStudent {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.createStudent(email, passwordHash, profile);
    const id = `student-${randomBytes(8).toString("hex")}`;
    this.db.prepare(
      "INSERT INTO students (id, email, password_hash, profile) VALUES (?, ?, ?, ?)"
    ).run(id, email, passwordHash, JSON.stringify(profile));

    this.db.prepare(
      "INSERT INTO notifications (id, student_id, title, message, time, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
    ).run(
      `notif-${id}`,
      id,
      "Welcome",
      `Hi ${profile.name}. Your student account is ready. Summaries and flashcards stay on your account.`,
      "Just now",
      Date.now()
    );

    return { id, profile };
  }

  findStudentByEmail(email: string): StoredStudent | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.findStudentByEmail(email);
    const row = this.db.prepare(
      "SELECT id, email, password_hash, profile FROM students WHERE lower(email) = lower(?)"
    ).get(email) as { id: string; email: string; password_hash: string; profile: string } | undefined;

    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      profile: JSON.parse(row.profile),
    };
  }

  getStudent(id: string): PublicStudent | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.getStudent(id);
    const row = this.db.prepare(
      "SELECT id, profile FROM students WHERE id = ?"
    ).get(id) as { id: string; profile: string } | undefined;

    if (!row) return undefined;
    return {
      id: row.id,
      profile: JSON.parse(row.profile),
    };
  }

  createSession(studentId: string): string {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.createSession(studentId);
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_MS;
    this.db.prepare(
      "INSERT INTO sessions (token, student_id, expires_at) VALUES (?, ?, ?)"
    ).run(token, studentId, expiresAt);
    return token;
  }

  getStudentIdForSession(token: string): string | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.getStudentIdForSession(token);
    const row = this.db.prepare(
      "SELECT student_id, expires_at FROM sessions WHERE token = ?"
    ).get(token) as { student_id: string; expires_at: number } | undefined;

    if (!row) return undefined;
    if (row.expires_at <= Date.now()) {
      this.deleteSession(token);
      return undefined;
    }
    return row.student_id;
  }

  deleteSession(token: string): boolean {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.deleteSession(token);
    const result = this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return Number(result.changes) > 0;
  }

  listItems(studentId: string, filter = "all"): StudyItem[] {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.listItems(studentId, filter);
    let query = "SELECT data FROM study_items WHERE student_id = ?";
    const params: (string | number)[] = [studentId];

    if (filter === "favorites") {
      query += " AND is_favorite = 1";
    } else if (filter !== "all") {
      query += " AND type = ?";
      params.push(filter);
    }

    query += " ORDER BY rowid DESC";

    const rows = this.db.prepare(query).all(...params) as Array<{ data: string }>;
    return rows.map((r) => JSON.parse(r.data));
  }

  getItem(studentId: string, id: string): StudyItem | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.getItem(studentId, id);
    const row = this.db.prepare(
      "SELECT data FROM study_items WHERE student_id = ? AND id = ?"
    ).get(studentId, id) as { data: string } | undefined;

    if (!row) return undefined;
    return JSON.parse(row.data);
  }

  createItem(studentId: string, item: StudyItem): StudyItem {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.createItem(studentId, item);
    const isFav = item.isFavorite ? 1 : 0;
    this.db.prepare(
      "INSERT INTO study_items (id, student_id, type, is_favorite, data) VALUES (?, ?, ?, ?, ?)"
    ).run(item.id, studentId, item.type, isFav, JSON.stringify(item));
    return structuredClone(item);
  }

  updateItem(studentId: string, id: string, changes: Partial<StudyItem>): StudyItem | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.updateItem(studentId, id, changes);
    const existing = this.getItem(studentId, id);
    if (!existing) return undefined;

    const updated: StudyItem = { ...existing, ...changes, id };
    const isFav = updated.isFavorite ? 1 : 0;

    this.db.prepare(
      "UPDATE study_items SET type = ?, is_favorite = ?, data = ? WHERE student_id = ? AND id = ?"
    ).run(updated.type, isFav, JSON.stringify(updated), studentId, id);

    return structuredClone(updated);
  }

  deleteItem(studentId: string, id: string): boolean {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.deleteItem(studentId, id);
    const result = this.db.prepare(
      "DELETE FROM study_items WHERE student_id = ? AND id = ?"
    ).run(studentId, id);
    return Number(result.changes) > 0;
  }

  getProfile(studentId: string): Profile | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.getProfile(studentId);
    const row = this.db.prepare("SELECT profile FROM students WHERE id = ?").get(studentId) as { profile: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.profile);
  }

  updateProfile(studentId: string, profile: Profile): Profile | undefined {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.updateProfile(studentId, profile);
    const existing = this.getStudent(studentId);
    if (!existing) return undefined;

    this.db.prepare(
      "UPDATE students SET email = ?, profile = ? WHERE id = ?"
    ).run(profile.email, JSON.stringify(profile), studentId);

    return structuredClone(profile);
  }

  isEmailTaken(email: string, exceptStudentId?: string): boolean {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.isEmailTaken(email, exceptStudentId);
    let query = "SELECT id FROM students WHERE lower(email) = lower(?)";
    const params: string[] = [email];
    if (exceptStudentId) {
      query += " AND id != ?";
      params.push(exceptStudentId);
    }
    const row = this.db.prepare(query).get(...params);
    return Boolean(row);
  }

  listActivities(studentId: string): Activity[] {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.listActivities(studentId);
    const rows = this.db.prepare(
      "SELECT data FROM activities WHERE student_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(studentId) as Array<{ data: string }>;
    return rows.map((r) => JSON.parse(r.data));
  }

  addActivity(studentId: string, activity: Activity): Activity {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.addActivity(studentId, activity);
    this.db.prepare(
      "INSERT INTO activities (id, student_id, data, created_at) VALUES (?, ?, ?, ?)"
    ).run(activity.id, studentId, JSON.stringify(activity), Date.now());
    return structuredClone(activity);
  }

  deleteActivity(studentId: string, id: string): boolean {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.deleteActivity(studentId, id);
    const result = this.db.prepare(
      "DELETE FROM activities WHERE student_id = ? AND id = ?"
    ).run(studentId, id);
    return Number(result.changes) > 0;
  }

  listNotifications(studentId: string): Notification[] {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.listNotifications(studentId);
    const rows = this.db.prepare(
      "SELECT id, title, message, time, read FROM notifications WHERE student_id = ? ORDER BY created_at DESC"
    ).all(studentId) as Array<{ id: string; title: string; message: string; time: string; read: number }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      time: r.time,
      read: Boolean(r.read),
    }));
  }

  markNotificationsRead(studentId: string): Notification[] {
    if (this.memoryFallback || !this.db) return this.memoryFallback!.markNotificationsRead(studentId);
    this.db.prepare(
      "UPDATE notifications SET read = 1 WHERE student_id = ?"
    ).run(studentId);
    return this.listNotifications(studentId);
  }

  close(): void {
    this.db?.close();
  }
}
