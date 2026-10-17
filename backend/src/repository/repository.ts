import type {
  Activity,
  Notification,
  Profile,
  PublicStudent,
  StoredStudent,
  StudyItem,
} from "../types.js";

export interface Repository {
  createStudent(email: string, passwordHash: string, profile: Profile): PublicStudent | Promise<PublicStudent>;
  findStudentByEmail(email: string): StoredStudent | undefined | Promise<StoredStudent | undefined>;
  getStudent(id: string): PublicStudent | undefined | Promise<PublicStudent | undefined>;
  createSession(studentId: string): string | Promise<string>;
  getStudentIdForSession(token: string): string | undefined | Promise<string | undefined>;
  deleteSession(token: string): boolean | Promise<boolean>;
  listItems(studentId: string, filter?: string): StudyItem[] | Promise<StudyItem[]>;
  getItem(studentId: string, id: string): StudyItem | undefined | Promise<StudyItem | undefined>;
  createItem(studentId: string, item: StudyItem): StudyItem | Promise<StudyItem>;
  updateItem(studentId: string, id: string, changes: Partial<StudyItem>): StudyItem | undefined | Promise<StudyItem | undefined>;
  deleteItem(studentId: string, id: string): boolean | Promise<boolean>;
  getProfile(studentId: string): Profile | undefined | Promise<Profile | undefined>;
  updateProfile(studentId: string, profile: Profile): Profile | undefined | Promise<Profile | undefined>;
  isEmailTaken(email: string, exceptStudentId?: string): boolean | Promise<boolean>;
  listActivities(studentId: string): Activity[] | Promise<Activity[]>;
  addActivity(studentId: string, activity: Activity): Activity | Promise<Activity>;
  deleteActivity(studentId: string, id: string): boolean | Promise<boolean>;
  listNotifications(studentId: string): Notification[] | Promise<Notification[]>;
  markNotificationsRead(studentId: string): Notification[] | Promise<Notification[]>;
}
