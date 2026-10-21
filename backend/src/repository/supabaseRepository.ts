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

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export class SupabaseRepository implements Repository {
  private client: SupabaseClient;

  constructor(
    supabaseUrl = process.env.SUPABASE_URL,
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY
  ) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required."
      );
    }
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createStudent(email: string, passwordHash: string, profile: Profile): Promise<PublicStudent> {
    const studentId = `student-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await this.client.from("students").insert({
      id: studentId,
      email: cleanEmail,
      password_hash: passwordHash,
      profile,
    });
    if (error) {
      throw new Error(`Supabase createStudent failed: ${error.message}`);
    }
    return { id: studentId, profile };
  }

  async findStudentByEmail(email: string): Promise<StoredStudent | undefined> {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await this.client
      .from("students")
      .select("id, email, password_hash, profile")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error || !data) return undefined;
    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      profile: data.profile as Profile,
    };
  }

  async getStudent(id: string): Promise<PublicStudent | undefined> {
    const { data, error } = await this.client
      .from("students")
      .select("id, email, profile")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return {
      id: data.id,
      profile: data.profile as Profile,
    };
  }

  async createSession(studentId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_MS;
    const { error } = await this.client.from("sessions").insert({
      token,
      student_id: studentId,
      expires_at: expiresAt,
    });
    if (error) throw new Error(`Supabase createSession failed: ${error.message}`);
    return token;
  }

  async getStudentIdForSession(token: string): Promise<string | undefined> {
    const now = Date.now();
    const { data, error } = await this.client
      .from("sessions")
      .select("student_id, expires_at")
      .eq("token", token)
      .gt("expires_at", now)
      .maybeSingle();

    if (error || !data) return undefined;
    return data.student_id;
  }

  async deleteSession(token: string): Promise<boolean> {
    const { error } = await this.client.from("sessions").delete().eq("token", token);
    return !error;
  }

  async listItems(studentId: string, filter?: string): Promise<StudyItem[]> {
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
    if (error || !data) return [];
    return data.map((row) => ({
      ...(typeof row.data === "object" && row.data !== null ? row.data : {}),
      id: row.id,
      type: row.type,
      isFavorite: Boolean(row.is_favorite),
    })) as StudyItem[];
  }

  async getItem(studentId: string, id: string): Promise<StudyItem | undefined> {
    const { data, error } = await this.client
      .from("study_items")
      .select("id, type, is_favorite, data")
      .eq("student_id", studentId)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return {
      ...(typeof data.data === "object" && data.data !== null ? data.data : {}),
      id: data.id,
      type: data.type,
      isFavorite: Boolean(data.is_favorite),
    } as StudyItem;
  }

  async createItem(studentId: string, item: StudyItem): Promise<StudyItem> {
    const cleanId = String(item.id || `item_${Date.now()}`);
    const { error } = await this.client.from("study_items").insert({
      id: cleanId,
      student_id: studentId,
      type: item.type,
      is_favorite: Boolean(item.isFavorite),
      data: item,
    });
    if (error) throw new Error(`Supabase createItem failed: ${error.message}`);
    return item;
  }

  async updateItem(studentId: string, id: string, changes: Partial<StudyItem>): Promise<StudyItem | undefined> {
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

    if (error) throw new Error(`Supabase updateItem failed: ${error.message}`);
    return merged;
  }

  async deleteItem(studentId: string, id: string): Promise<boolean> {
    const { error } = await this.client
      .from("study_items")
      .delete()
      .eq("student_id", studentId)
      .eq("id", id);
    return !error;
  }

  async getProfile(studentId: string): Promise<Profile | undefined> {
    const student = await this.getStudent(studentId);
    return student?.profile;
  }

  async updateProfile(studentId: string, profile: Profile): Promise<Profile | undefined> {
    const { error } = await this.client
      .from("students")
      .update({ profile })
      .eq("id", studentId);

    if (error) return undefined;
    return profile;
  }

  async isEmailTaken(email: string, exceptStudentId?: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    let query = this.client.from("students").select("id").eq("email", cleanEmail);
    if (exceptStudentId) {
      query = query.neq("id", exceptStudentId);
    }
    const { data } = await query.limit(1);
    return Boolean(data && data.length > 0);
  }

  async listActivities(studentId: string): Promise<Activity[]> {
    const { data, error } = await this.client
      .from("activities")
      .select("id, data, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => row.data as Activity);
  }

  async addActivity(studentId: string, activity: Activity): Promise<Activity> {
    const cleanId = String(activity.id || `act_${Date.now()}`);
    const timestamp = Date.now();
    const { error } = await this.client.from("activities").insert({
      id: cleanId,
      student_id: studentId,
      data: activity,
      created_at: timestamp,
    });
    if (error) throw new Error(`Supabase addActivity failed: ${error.message}`);
    return activity;
  }

  async deleteActivity(studentId: string, id: string): Promise<boolean> {
    const { error } = await this.client
      .from("activities")
      .delete()
      .eq("student_id", studentId)
      .eq("id", id);
    return !error;
  }

  async listNotifications(studentId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from("notifications")
      .select("id, title, message, time, read, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      time: row.time,
      read: Boolean(row.read),
    }));
  }

  async markNotificationsRead(studentId: string): Promise<Notification[]> {
    await this.client
      .from("notifications")
      .update({ read: true })
      .eq("student_id", studentId);

    return this.listNotifications(studentId);
  }
}
