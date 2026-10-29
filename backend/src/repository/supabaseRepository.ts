import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type {
  Activity,
  Notification,
  Profile,
  PublicStudent,
  StoredStudent,
  StudyItem,
} from "../types.js";
import type { Repository } from "./repository.js";
import { SqliteRepository } from "./sqliteRepository.js";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export class SupabaseRepository implements Repository {
  private client: SupabaseClient | null = null;
  private fallback: SqliteRepository;
  private supabaseActive = true;

  constructor(
    supabaseUrl = process.env.SUPABASE_URL,
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY
  ) {
    this.fallback = new SqliteRepository();
    if (!supabaseUrl || !supabaseKey) {
      this.supabaseActive = false;
      return;
    }
    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (err) {
      console.warn("Failed to initialize Supabase client, using SQLite fallback:", err);
      this.supabaseActive = false;
    }
  }

  async createStudent(email: string, passwordHash: string, profile: Profile): Promise<PublicStudent> {
    if (this.supabaseActive && this.client) {
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
        try {
          await this.fallback.createStudent(email, passwordHash, profile);
        } catch (_e) {}
        return { id: studentId, profile };
      } catch (err: unknown) {
        console.warn("Supabase createStudent failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.createStudent(email, passwordHash, profile);
  }

  async findStudentByEmail(email: string): Promise<StoredStudent | undefined> {
    if (this.supabaseActive && this.client) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await this.client
          .from("students")
          .select("id, email, password_hash, profile")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (data) {
          return {
            id: data.id,
            email: data.email,
            passwordHash: data.password_hash,
            profile: data.profile as Profile,
          };
        }
      } catch (err: unknown) {
        console.warn("Supabase findStudentByEmail failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.findStudentByEmail(email);
  }

  async getStudent(id: string): Promise<PublicStudent | undefined> {
    if (this.supabaseActive && this.client) {
      try {
        const { data, error } = await this.client
          .from("students")
          .select("id, email, profile")
          .eq("id", id)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (data) {
          return {
            id: data.id,
            profile: data.profile as Profile,
          };
        }
      } catch (err: unknown) {
        console.warn("Supabase getStudent failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.getStudent(id);
  }

  async createSession(studentId: string): Promise<string> {
    if (this.supabaseActive && this.client) {
      try {
        const token = randomBytes(32).toString("hex");
        const expiresAt = Date.now() + SESSION_MS;
        const { error } = await this.client.from("sessions").insert({
          token,
          student_id: studentId,
          expires_at: expiresAt,
        });
        if (error) throw new Error(error.message);
        try {
          await this.fallback.createSession(studentId);
        } catch (_e) {}
        return token;
      } catch (err: unknown) {
        console.warn("Supabase createSession failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.createSession(studentId);
  }

  async getStudentIdForSession(token: string): Promise<string | undefined> {
    if (this.supabaseActive && this.client) {
      try {
        const now = Date.now();
        const { data, error } = await this.client
          .from("sessions")
          .select("student_id, expires_at")
          .eq("token", token)
          .gt("expires_at", now)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (data) return data.student_id;
      } catch (err: unknown) {
        console.warn("Supabase getStudentIdForSession failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.getStudentIdForSession(token);
  }

  async deleteSession(token: string): Promise<boolean> {
    if (this.supabaseActive && this.client) {
      try {
        const { error } = await this.client.from("sessions").delete().eq("token", token);
        if (error) throw new Error(error.message);
        this.fallback.deleteSession(token);
        return true;
      } catch (err: unknown) {
        console.warn("Supabase deleteSession failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.deleteSession(token);
  }

  async listItems(studentId: string, filter?: string): Promise<StudyItem[]> {
    if (this.supabaseActive && this.client) {
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
        if (data) {
          return data.map((row) => ({
            ...(typeof row.data === "object" && row.data !== null ? row.data : {}),
            id: row.id,
            type: row.type,
            isFavorite: Boolean(row.is_favorite),
          })) as StudyItem[];
        }
      } catch (err: unknown) {
        console.warn("Supabase listItems failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.listItems(studentId, filter);
  }

  async getItem(studentId: string, id: string): Promise<StudyItem | undefined> {
    if (this.supabaseActive && this.client) {
      try {
        const { data, error } = await this.client
          .from("study_items")
          .select("id, type, is_favorite, data")
          .eq("student_id", studentId)
          .eq("id", id)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (data) {
          return {
            ...(typeof data.data === "object" && data.data !== null ? data.data : {}),
            id: data.id,
            type: data.type,
            isFavorite: Boolean(data.is_favorite),
          } as StudyItem;
        }
      } catch (err: unknown) {
        console.warn("Supabase getItem failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.getItem(studentId, id);
  }

  async createItem(studentId: string, item: StudyItem): Promise<StudyItem> {
    if (this.supabaseActive && this.client) {
      try {
        const cleanId = String(item.id || `item_${Date.now()}`);
        const { error } = await this.client.from("study_items").insert({
          id: cleanId,
          student_id: studentId,
          type: item.type,
          is_favorite: Boolean(item.isFavorite),
          data: item,
        });
        if (error) throw new Error(error.message);
        try {
          await this.fallback.createItem(studentId, item);
        } catch (_e) {}
        return item;
      } catch (err: unknown) {
        console.warn("Supabase createItem failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.createItem(studentId, item);
  }

  async updateItem(studentId: string, id: string, changes: Partial<StudyItem>): Promise<StudyItem | undefined> {
    if (this.supabaseActive && this.client) {
      try {
        const current = await this.getItem(studentId, id);
        if (!current) return undefined;

        const merged: StudyItem = { ...current, ...changes };
        const updates: Record<string, unknown> = { data: merged };
        if (changes.type !== undefined) updates.type = changes.type;
        if (changes.isFavorite !== undefined) updates.is_favorite = Boolean(changes.isFavorite);

        const { error } = await this.client
          .from("study_items")
          .update(updates)
          .eq("student_id", studentId)
          .eq("id", id);

        if (error) throw new Error(error.message);
        try {
          await this.fallback.updateItem(studentId, id, changes);
        } catch (_e) {}
        return merged;
      } catch (err: unknown) {
        console.warn("Supabase updateItem failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.updateItem(studentId, id, changes);
  }

  async deleteItem(studentId: string, id: string): Promise<boolean> {
    if (this.supabaseActive && this.client) {
      try {
        const { error } = await this.client
          .from("study_items")
          .delete()
          .eq("student_id", studentId)
          .eq("id", id);
        if (error) throw new Error(error.message);
        this.fallback.deleteItem(studentId, id);
        return true;
      } catch (err: unknown) {
        console.warn("Supabase deleteItem failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.deleteItem(studentId, id);
  }

  async getProfile(studentId: string): Promise<Profile | undefined> {
    const student = await this.getStudent(studentId);
    return student?.profile;
  }

  async updateProfile(studentId: string, profile: Profile): Promise<Profile | undefined> {
    if (this.supabaseActive && this.client) {
      try {
        const { error } = await this.client
          .from("students")
          .update({ profile })
          .eq("id", studentId);

        if (error) throw new Error(error.message);
        try {
          await this.fallback.updateProfile(studentId, profile);
        } catch (_e) {}
        return profile;
      } catch (err: unknown) {
        console.warn("Supabase updateProfile failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.updateProfile(studentId, profile);
  }

  async isEmailTaken(email: string, exceptStudentId?: string): Promise<boolean> {
    if (this.supabaseActive && this.client) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        let query = this.client.from("students").select("id").eq("email", cleanEmail);
        if (exceptStudentId) {
          query = query.neq("id", exceptStudentId);
        }
        const { data, error } = await query.limit(1);
        if (error) throw new Error(error.message);
        return Boolean(data && data.length > 0);
      } catch (err: unknown) {
        console.warn("Supabase isEmailTaken failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.isEmailTaken(email, exceptStudentId);
  }

  async listActivities(studentId: string): Promise<Activity[]> {
    if (this.supabaseActive && this.client) {
      try {
        const { data, error } = await this.client
          .from("activities")
          .select("id, data, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (data) return data.map((row) => row.data as Activity);
      } catch (err: unknown) {
        console.warn("Supabase listActivities failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.listActivities(studentId);
  }

  async addActivity(studentId: string, activity: Activity): Promise<Activity> {
    if (this.supabaseActive && this.client) {
      try {
        const cleanId = String(activity.id || `act_${Date.now()}`);
        const timestamp = Date.now();
        const { error } = await this.client.from("activities").insert({
          id: cleanId,
          student_id: studentId,
          data: activity,
          created_at: timestamp,
        });
        if (error) throw new Error(error.message);
        try {
          await this.fallback.addActivity(studentId, activity);
        } catch (_e) {}
        return activity;
      } catch (err: unknown) {
        console.warn("Supabase addActivity failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.addActivity(studentId, activity);
  }

  async deleteActivity(studentId: string, id: string): Promise<boolean> {
    if (this.supabaseActive && this.client) {
      try {
        const { error } = await this.client
          .from("activities")
          .delete()
          .eq("student_id", studentId)
          .eq("id", id);
        if (error) throw new Error(error.message);
        this.fallback.deleteActivity(studentId, id);
        return true;
      } catch (err: unknown) {
        console.warn("Supabase deleteActivity failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.deleteActivity(studentId, id);
  }

  async listNotifications(studentId: string): Promise<Notification[]> {
    if (this.supabaseActive && this.client) {
      try {
        const { data, error } = await this.client
          .from("notifications")
          .select("id, title, message, time, read, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (data) {
          return data.map((row) => ({
            id: row.id,
            title: row.title,
            message: row.message,
            time: row.time,
            read: Boolean(row.read),
          }));
        }
      } catch (err: unknown) {
        console.warn("Supabase listNotifications failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.listNotifications(studentId);
  }

  async markNotificationsRead(studentId: string): Promise<Notification[]> {
    if (this.supabaseActive && this.client) {
      try {
        const { error } = await this.client
          .from("notifications")
          .update({ read: true })
          .eq("student_id", studentId);
        if (error) throw new Error(error.message);
        try {
          await this.fallback.markNotificationsRead(studentId);
        } catch (_e) {}
        return this.listNotifications(studentId);
      } catch (err: unknown) {
        console.warn("Supabase markNotificationsRead failed, falling back to SQLite:", err instanceof Error ? err.message : err);
        this.supabaseActive = false;
      }
    }
    return this.fallback.markNotificationsRead(studentId);
  }
}
