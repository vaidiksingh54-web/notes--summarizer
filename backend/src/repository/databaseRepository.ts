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

function copy<T>(value: T): T {
  return structuredClone(value);
}

function publicStudent(student: StoredStudent): PublicStudent {
  return { id: student.id, profile: copy(student.profile) };
}

export class InMemoryRepository implements Repository {
  private studentsById = new Map<string, StoredStudent>();
  private studentsByEmail = new Map<string, string>();
  private sessions = new Map<string, { studentId: string; expiresAt: number }>();
  private items = new Map<string, Map<string, StudyItem>>();
  private activities = new Map<string, Activity[]>();
  private notifications = new Map<string, Notification[]>();

  constructor() {
    this.seedDemoStudent();
  }

  private seedDemoStudent(): void {
    const id = "student-demo-001";
    const email = "demo@cognistudy.ai";
    // Scrypt hash for password "CogniStudy123!"
    const passwordHash = "0123456789abcdef0123456789abcdef:3fa6557216112ba000b4c441cc1777857516d2d8f2e20f965a56181d1adf8295d1885848490f6ed1c2cb1b9457424374b7a236dfb92ed69c293f7ed002172661";
    const profile: Profile = {
      name: "Alex Chen",
      email,
      phone: "+1 555-0199",
      college: "Stanford University",
      course: "Computer Science & Cognitive Psychology",
      age: 21,
      bio: "Undergraduate researcher focused on educational AI, neural systems, and distributed workflows.",
      avatar: "AC",
    };

    const student: StoredStudent = { id, email, passwordHash, profile };
    this.studentsById.set(id, student);
    this.studentsByEmail.set(email, id);

    const itemsMap = new Map<string, StudyItem>();
    itemsMap.set("note-demo-1", {
      id: "note-demo-1",
      type: "note",
      title: "Cellular Respiration & ATP Synthesis",
      category: "Biology",
      date: "Today",
      progress: 100,
      isFavorite: true,
      tags: ["Biology", "Metabolism", "ATP"],
      content: "<h2>Cellular Respiration Overview</h2><p>Cellular respiration is a metabolic pathway that breaks down glucose and produces ATP.</p><h3>Key Stages</h3><ul><li><strong>Glycolysis:</strong> Cytoplasm, generates 2 net ATP.</li><li><strong>Citric Acid Cycle:</strong> Mitochondrial matrix.</li><li><strong>Oxidative Phosphorylation:</strong> Electron transport chain producing the bulk of cellular ATP.</li></ul>",
    });

    itemsMap.set("mindmap-demo-1", {
      id: "mindmap-demo-1",
      type: "mindmap",
      title: "Water Conservation & Resource Management",
      category: "Environmental Science",
      date: "Today",
      progress: 100,
      isFavorite: true,
      tags: ["Ecology", "Conservation", "Mind Map"],
      nodeCount: 16,
      rootNode: {
        id: "root-water",
        title: "Water Conservation",
        notes: "Fundamental strategies for sustainable freshwater management.",
        color: "#818cf8",
        children: [
          {
            id: "node-scarcity",
            title: "Causes of Scarcity",
            color: "#f97316",
            children: [
              { id: "node-ind-waste", title: "Industrial Pollution", children: [] },
              { id: "node-agri-runoff", title: "Agricultural Runoffs", children: [] },
              { id: "node-overconsumption", title: "Irresponsible Consumption", children: [] }
            ]
          },
          {
            id: "node-prevention",
            title: "Mitigation & Prevention",
            color: "#ec4899",
            children: [
              { id: "node-rainwater", title: "Rainwater Harvesting", children: [] },
              { id: "node-civic-infra", title: "Civic Infrastructure", children: [] },
              { id: "node-awareness", title: "Community Education", children: [] }
            ]
          },
          {
            id: "node-domestic",
            title: "Daily Domestic Practices",
            color: "#38bdf8",
            children: [
              { id: "node-leak-repairs", title: "Plumbing Leak Repairs", children: [] },
              { id: "node-aerators", title: "Shower Aerators & Restrictors", children: [] },
              { id: "node-full-loads", title: "Full Dishwasher Loads", children: [] }
            ]
          }
        ]
      }
    });

    this.items.set(id, itemsMap);
    this.activities.set(id, [
      {
        id: "act-1",
        title: "Generated Mind Map: Water Conservation",
        type: "Mind Map",
        score: "Complete",
        date: "Today",
        icon: "🕸"
      },
      {
        id: "act-2",
        title: "Summarized: Cellular Respiration",
        type: "Note",
        score: "Complete",
        date: "Today",
        icon: "📝"
      }
    ]);

    this.notifications.set(id, [
      {
        id: "notif-1",
        title: "Welcome to CogniStudy AI",
        message: "Your AI study assistant with Mind Map Maker, Summarizer, and Flashcards is active.",
        time: "Just now",
        read: false
      }
    ]);
  }


  createStudent(email: string, passwordHash: string, profile: Profile): PublicStudent {
    const id = `student-${randomBytes(8).toString("hex")}`;
    const student: StoredStudent = { id, email, passwordHash, profile: copy(profile) };
    this.studentsById.set(id, student);
    this.studentsByEmail.set(email, id);
    this.items.set(id, new Map());
    this.activities.set(id, []);
    this.notifications.set(id, [{
      id: `notif-${id}`,
      title: "Welcome",
      message: `Hi ${profile.name}. Your student account is ready. Summaries and flashcards stay on your account.`,
      time: "Just now",
      read: false,
    }]);
    return publicStudent(student);
  }

  findStudentByEmail(email: string): StoredStudent | undefined {
    const id = this.studentsByEmail.get(email);
    const student = id ? this.studentsById.get(id) : undefined;
    return student && copy(student);
  }

  getStudent(id: string): PublicStudent | undefined {
    const student = this.studentsById.get(id);
    return student && publicStudent(student);
  }

  createSession(studentId: string): string {
    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, { studentId, expiresAt: Date.now() + SESSION_MS });
    return token;
  }

  getStudentIdForSession(token: string): string | undefined {
    if (token.startsWith("firebase_")) {
      const firebaseUid = token.slice(9).trim();
      if (firebaseUid.length > 0) {
        const studentId = `student-fb-${firebaseUid.slice(0, 32)}`;
        if (!this.studentsById.has(studentId)) {
          const profile: Profile = {
            name: "Google Student",
            email: `student-${firebaseUid.slice(0, 8)}@google.com`,
            phone: "",
            college: "Google Auth",
            course: "General Studies",
            age: 20,
            bio: "Google Verified Student",
            avatar: "GS",
          };
          this.studentsById.set(studentId, {
            id: studentId,
            email: profile.email,
            passwordHash: `google-oauth-${firebaseUid}`,
            profile,
          });
        }
        return studentId;
      }
    }

    const session = this.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return session.studentId;
  }

  deleteSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  listItems(studentId: string, filter = "all"): StudyItem[] {
    const items = [...(this.items.get(studentId)?.values() ?? [])].reverse();
    return copy(filter === "favorites" ? items.filter((item) => item.isFavorite)
      : filter === "all" ? items : items.filter((item) => item.type === filter));
  }

  getItem(studentId: string, id: string): StudyItem | undefined {
    const item = this.items.get(studentId)?.get(id);
    return item && copy(item);
  }

  createItem(studentId: string, item: StudyItem): StudyItem {
    const bucket = this.items.get(studentId) ?? new Map<string, StudyItem>();
    bucket.set(item.id, copy(item));
    this.items.set(studentId, bucket);
    return copy(item);
  }

  updateItem(studentId: string, id: string, changes: Partial<StudyItem>): StudyItem | undefined {
    const bucket = this.items.get(studentId);
    const existing = bucket?.get(id);
    if (!bucket || !existing) return undefined;
    const updated = { ...existing, ...copy(changes), id };
    bucket.set(id, updated);
    return copy(updated);
  }

  deleteItem(studentId: string, id: string): boolean {
    return this.items.get(studentId)?.delete(id) ?? false;
  }

  getProfile(studentId: string): Profile | undefined {
    const student = this.studentsById.get(studentId);
    return student && copy(student.profile);
  }

  updateProfile(studentId: string, profile: Profile): Profile | undefined {
    const student = this.studentsById.get(studentId);
    if (!student) return undefined;
    if (student.email !== profile.email) {
      this.studentsByEmail.delete(student.email);
      this.studentsByEmail.set(profile.email, studentId);
      student.email = profile.email;
    }
    student.profile = copy(profile);
    return copy(student.profile);
  }

  isEmailTaken(email: string, exceptStudentId?: string): boolean {
    const ownerId = this.studentsByEmail.get(email);
    return Boolean(ownerId && ownerId !== exceptStudentId);
  }

  listActivities(studentId: string): Activity[] {
    return copy(this.activities.get(studentId) ?? []);
  }

  addActivity(studentId: string, activity: Activity): Activity {
    const list = this.activities.get(studentId) ?? [];
    list.unshift(copy(activity));
    this.activities.set(studentId, list.slice(0, 50));
    return copy(activity);
  }

  deleteActivity(studentId: string, id: string): boolean {
    const list = this.activities.get(studentId) ?? [];
    const next = list.filter((activity) => activity.id !== id);
    this.activities.set(studentId, next);
    return next.length !== list.length;
  }

  listNotifications(studentId: string): Notification[] {
    return copy(this.notifications.get(studentId) ?? []);
  }

  markNotificationsRead(studentId: string): Notification[] {
    const next = (this.notifications.get(studentId) ?? []).map((notification) => ({ ...notification, read: true }));
    this.notifications.set(studentId, next);
    return this.listNotifications(studentId);
  }
}
