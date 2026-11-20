import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type {
  Activity,
  Notification,
  Profile,
  PublicStudent,
  StoredStudent,
  StudyItem,
} from "../types.ts";
import type { Repository } from "./repository.ts";
import { SqliteRepository } from "./sqliteRepository.ts";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const NETWORK_BACKOFF_MS = 15_000;

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /your[-_]?project|your[-_]?supabase|example\.supabase\.co|placeholder|<project|YOUR_|MY_SUPABASE/i.test(trimmed);
}

function detectKeyRole(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith("sb_secret_")) return "service_role";
  if (trimmed.startsWith("sb_publishable_")) return "anon";
  const parts = trimmed.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role) return payload.role;
    } catch {
      // Ignore malformed JWT payload
    }
  }
  return "unknown";
}

export interface SupabaseStatus {
  configured: boolean;
  connected: boolean;
  keyRole: string;
  lastError: string | null;
}

export class SupabaseRepository implements Repository {
  private client: SupabaseClient | null = null;
  private fallback: SqliteRepository;
  private configured = false;
  private connected = false;
  private keyRole = "none";
  private lastError: string | null = null;
  private retryAfter = 0;

  constructor(
    supabaseUrl = process.env.SUPABASE_URL,
    supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_ANON_KEY
  ) {
    this.fallback = new SqliteRepository();

    const cleanUrl = supabaseUrl?.trim();
    const cleanKey = supabaseKey?.trim();

    if (!cleanUrl || !cleanKey || isPlaceholderValue(cleanUrl) || isPlaceholderValue(cleanKey)) {
      this.configured = false;
      this.lastError = !cleanUrl || !cleanKey
        ? "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
        : "Placeholder SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY detected. Replace with your real Supabase Project URL and service_role key.";
      if (cleanUrl || cleanKey) {
        console.warn(`[Supabase] ${this.lastError}`);
      }
      return;
    }

    if (!/^https?:\/\/[a-z0-9.-]+/i.test(cleanUrl)) {
      this.configured = false;
      this.lastError = "SUPABASE_URL must be a valid https://<project-ref>.supabase.co URL.";
      console.warn(`[Supabase] ${this.lastError}`);
      return;
    }

    this.keyRole = detectKeyRole(cleanKey);
    if (this.keyRole === "anon") {
      console.warn(
        "[Supabase] Warning: An 'anon' / publishable key was provided instead of the 'service_role' secret key. " +
        "Row Level Security (RLS) in supabase_setup.sql requires SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    try {
      this.client = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const timeoutSignal = AbortSignal.timeout(8000);
            const signal = init?.signal
              ? AbortSignal.any([init.signal, timeoutSignal])
              : timeoutSignal;
            return fetch(input, { ...init, signal });
          },
        },
      });
      this.configured = true;
    } catch (err) {
      this.configured = false;
      this.lastError = err instanceof Error ? err.message : String(err);
      console.warn("[Supabase] Failed to initialize client, using local fallback:", this.lastError);
    }
  }

  private canAttemptSupabase(): boolean {
    return Boolean(this.configured && this.client && Date.now() >= this.retryAfter);
  }

  private markSuccess(): void {
    this.connected = true;
    this.lastError = null;
    this.retryAfter = 0;
  }

  private handleFailure(operation: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.connected = false;
    this.lastError = message;

    if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|TimeoutError|aborted/i.test(message)) {
      this.retryAfter = Date.now() + NETWORK_BACKOFF_MS;
      console.warn(`[Supabase] Network error in ${operation} (retrying in 15s): ${message}`);
    } else if (/Could not find the table|relation .* does not exist|PGRST205/i.test(message)) {
      console.warn(
        `[Supabase] Missing database table in ${operation}: ${message}. ` +
        `Run supabase_setup.sql in your Supabase Dashboard -> SQL Editor.`
      );
    } else if (/row-level security|permission denied|42501/i.test(message)) {
      console.warn(
        `[Supabase] RLS permission error in ${operation}: ${message}. ` +
        `Ensure SUPABASE_SERVICE_ROLE_KEY is set to your service_role secret key.`
      );
    } else {
      console.warn(`[Supabase] ${operation} error:`, message);
    }
  }

  getStatus(): SupabaseStatus {
    return {
      configured: this.configured,
      connected: this.connected,
      keyRole: this.keyRole,
      lastError: this.lastError,
    };
  }

  async verifyConnection(): Promise<SupabaseStatus> {
    if (!this.configured || !this.client) {
      return this.getStatus();
    }
    if (Date.now() < this.retryAfter) {
      return this.getStatus();
    }
    try {
      const { error } = await this.client.from("students").select("id", { head: true, count: "exact" });
      if (error) throw new Error(error.message);
      this.markSuccess();
    } catch (err) {
      this.handleFailure("verifyConnection", err);
    }
    return this.getStatus();
  }

  async createStudent(email: string, passwordHash: string, profile: Profile): Promise<PublicStudent> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const studentId = `student-${Date.now()}-${randomBytes(4).toString("hex")}`;
        const cleanEmail = email.trim().toLowerCase();
        const { error } = await this.client.from("students").insert({
          id: studentId,
          email: cleanEmail,
          password_hash: passwordHash,
          profile,
        });
        if (error) throw new Error(error.message);

        await this.client.from("notifications").upsert(
          {
            id: `notif-${studentId}`,
            student_id: studentId,
            title: "Welcome to CogniStudy AI",
            message: `Hi ${profile.name}. Your student account is connected to cloud storage.`,
            time: "Just now",
            read: false,
            created_at: Date.now(),
          },
          { onConflict: "id" }
        );

        this.markSuccess();
        return { id: studentId, profile };
      } catch (err: unknown) {
        this.handleFailure("createStudent", err);
      }
    }
    return this.fallback.createStudent(email, passwordHash, profile);
  }

  async findStudentByEmail(email: string): Promise<StoredStudent | undefined> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await this.client
          .from("students")
          .select("id, email, password_hash, profile")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (error) throw new Error(error.message);
        this.markSuccess();
        if (!data) return undefined;
        return {
          id: data.id,
          email: data.email,
          passwordHash: data.password_hash,
          profile: data.profile as Profile,
        };
      } catch (err: unknown) {
        this.handleFailure("findStudentByEmail", err);
      }
    }
    return this.fallback.findStudentByEmail(email);
  }

  async getStudent(id: string): Promise<PublicStudent | undefined> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("students")
          .select("id, email, profile")
          .eq("id", id)
          .maybeSingle();

        if (error) throw new Error(error.message);
        this.markSuccess();
        if (!data) return undefined;
        return {
          id: data.id,
          profile: data.profile as Profile,
        };
      } catch (err: unknown) {
        this.handleFailure("getStudent", err);
      }
    }
    return this.fallback.getStudent(id);
  }

  async createSession(studentId: string): Promise<string> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const token = randomBytes(32).toString("hex");
        const expiresAt = Date.now() + SESSION_MS;
        const { error } = await this.client.from("sessions").insert({
          token,
          student_id: studentId,
          expires_at: expiresAt,
        });
        if (error) throw new Error(error.message);
        this.markSuccess();
        return token;
      } catch (err: unknown) {
        this.handleFailure("createSession", err);
      }
    }
    return this.fallback.createSession(studentId);
  }

  async getStudentIdForSession(token: string): Promise<string | undefined> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const now = Date.now();
        const { data, error } = await this.client
          .from("sessions")
          .select("student_id, expires_at")
          .eq("token", token)
          .gt("expires_at", now)
          .maybeSingle();

        if (error) throw new Error(error.message);
        this.markSuccess();
        return data ? data.student_id : undefined;
      } catch (err: unknown) {
        this.handleFailure("getStudentIdForSession", err);
      }
    }
    return this.fallback.getStudentIdForSession(token);
  }

  async deleteSession(token: string): Promise<boolean> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { error } = await this.client.from("sessions").delete().eq("token", token);
        if (error) throw new Error(error.message);
        this.markSuccess();
        return true;
      } catch (err: unknown) {
        this.handleFailure("deleteSession", err);
      }
    }
    return this.fallback.deleteSession(token);
  }

  async listItems(studentId: string, filter?: string): Promise<StudyItem[]> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        let query = this.client
          .from("study_items")
          .select("id, type, is_favorite, data")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (filter === "favorites") {
          query = query.eq("is_favorite", true);
        } else if (filter && filter !== "all") {
          query = query.eq("type", filter);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        this.markSuccess();
        return (data ?? []).map((row) => ({
          ...(typeof row.data === "object" && row.data !== null ? row.data : {}),
          id: row.id,
          type: row.type,
          isFavorite: Boolean(row.is_favorite),
        })) as StudyItem[];
      } catch (err: unknown) {
        this.handleFailure("listItems", err);
      }
    }
    return this.fallback.listItems(studentId, filter);
  }

  async getItem(studentId: string, id: string): Promise<StudyItem | undefined> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("study_items")
          .select("id, type, is_favorite, data")
          .eq("student_id", studentId)
          .eq("id", id)
          .maybeSingle();

        if (error) throw new Error(error.message);
        this.markSuccess();
        if (!data) return undefined;
        return {
          ...(typeof data.data === "object" && data.data !== null ? data.data : {}),
          id: data.id,
          type: data.type,
          isFavorite: Boolean(data.is_favorite),
        } as StudyItem;
      } catch (err: unknown) {
        this.handleFailure("getItem", err);
      }
    }
    return this.fallback.getItem(studentId, id);
  }

  async createItem(studentId: string, item: StudyItem): Promise<StudyItem> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const cleanId = String(item.id || `item_${Date.now()}`);
        const cleanItem: StudyItem = { ...item, id: cleanId };
        const { error } = await this.client.from("study_items").upsert(
          {
            id: cleanId,
            student_id: studentId,
            type: cleanItem.type,
            is_favorite: Boolean(cleanItem.isFavorite),
            data: cleanItem,
          },
          { onConflict: "student_id,id" }
        );
        if (error) throw new Error(error.message);
        this.markSuccess();
        return cleanItem;
      } catch (err: unknown) {
        this.handleFailure("createItem", err);
      }
    }
    return this.fallback.createItem(studentId, item);
  }

  async updateItem(studentId: string, id: string, changes: Partial<StudyItem>): Promise<StudyItem | undefined> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const current = await this.getItem(studentId, id);
        if (!current) return undefined;

        const merged: StudyItem = { ...current, ...changes, id };
        const updates: Record<string, unknown> = { data: merged };
        if (changes.type !== undefined) updates.type = changes.type;
        if (changes.isFavorite !== undefined) updates.is_favorite = Boolean(changes.isFavorite);

        const { error } = await this.client
          .from("study_items")
          .update(updates)
          .eq("student_id", studentId)
          .eq("id", id);

        if (error) throw new Error(error.message);
        this.markSuccess();
        return merged;
      } catch (err: unknown) {
        this.handleFailure("updateItem", err);
      }
    }
    return this.fallback.updateItem(studentId, id, changes);
  }

  async deleteItem(studentId: string, id: string): Promise<boolean> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("study_items")
          .delete()
          .eq("student_id", studentId)
          .eq("id", id)
          .select("id");
        if (error) throw new Error(error.message);
        this.markSuccess();
        return Boolean(data && data.length > 0);
      } catch (err: unknown) {
        this.handleFailure("deleteItem", err);
      }
    }
    return this.fallback.deleteItem(studentId, id);
  }

  async getProfile(studentId: string): Promise<Profile | undefined> {
    const student = await this.getStudent(studentId);
    return student?.profile;
  }

  async updateProfile(studentId: string, profile: Profile): Promise<Profile | undefined> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("students")
          .update({ profile })
          .eq("id", studentId)
          .select("id");

        if (error) throw new Error(error.message);
        this.markSuccess();
        return data && data.length > 0 ? profile : undefined;
      } catch (err: unknown) {
        this.handleFailure("updateProfile", err);
      }
    }
    return this.fallback.updateProfile(studentId, profile);
  }

  async isEmailTaken(email: string, exceptStudentId?: string): Promise<boolean> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        let query = this.client.from("students").select("id").eq("email", cleanEmail);
        if (exceptStudentId) {
          query = query.neq("id", exceptStudentId);
        }
        const { data, error } = await query.limit(1);
        if (error) throw new Error(error.message);
        this.markSuccess();
        return Boolean(data && data.length > 0);
      } catch (err: unknown) {
        this.handleFailure("isEmailTaken", err);
      }
    }
    return this.fallback.isEmailTaken(email, exceptStudentId);
  }

  async listActivities(studentId: string): Promise<Activity[]> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("activities")
          .select("id, data, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        this.markSuccess();
        return (data ?? []).map((row) => row.data as Activity);
      } catch (err: unknown) {
        this.handleFailure("listActivities", err);
      }
    }
    return this.fallback.listActivities(studentId);
  }

  async addActivity(studentId: string, activity: Activity): Promise<Activity> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const cleanId = String(activity.id || `act_${Date.now()}`);
        const cleanActivity: Activity = { ...activity, id: cleanId };
        const timestamp = Date.now();
        const { error } = await this.client.from("activities").upsert(
          {
            id: cleanId,
            student_id: studentId,
            data: cleanActivity,
            created_at: timestamp,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(error.message);
        this.markSuccess();
        return cleanActivity;
      } catch (err: unknown) {
        this.handleFailure("addActivity", err);
      }
    }
    return this.fallback.addActivity(studentId, activity);
  }

  async deleteActivity(studentId: string, id: string): Promise<boolean> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("activities")
          .delete()
          .eq("student_id", studentId)
          .eq("id", id)
          .select("id");
        if (error) throw new Error(error.message);
        this.markSuccess();
        return Boolean(data && data.length > 0);
      } catch (err: unknown) {
        this.handleFailure("deleteActivity", err);
      }
    }
    return this.fallback.deleteActivity(studentId, id);
  }

  async listNotifications(studentId: string): Promise<Notification[]> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { data, error } = await this.client
          .from("notifications")
          .select("id, title, message, time, read, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        this.markSuccess();
        return (data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          time: row.time,
          read: Boolean(row.read),
        }));
      } catch (err: unknown) {
        this.handleFailure("listNotifications", err);
      }
    }
    return this.fallback.listNotifications(studentId);
  }

  async markNotificationsRead(studentId: string): Promise<Notification[]> {
    if (this.canAttemptSupabase() && this.client) {
      try {
        const { error } = await this.client
          .from("notifications")
          .update({ read: true })
          .eq("student_id", studentId);
        if (error) throw new Error(error.message);
        this.markSuccess();
        return this.listNotifications(studentId);
      } catch (err: unknown) {
        this.handleFailure("markNotificationsRead", err);
      }
    }
    return this.fallback.markNotificationsRead(studentId);
  }
}
