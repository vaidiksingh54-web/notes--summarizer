import type {
  Activity,
  Notification,
  Profile,
  PublicStudent,
  StoredStudent,
  StudyItem,
} from "../types.js";

export interface Repository {
  createStudent(email: string, passwordHash: string, profile: Profile): PublicStudent;
  findStudentByEmail(email: string): StoredStudent | undefined;
  getStudent(id: string): PublicStudent | undefined;
  createSession(studentId: string): string;
  getStudentIdForSession(token: string): string | undefined;
  deleteSession(token: string): boolean;
  listItems(studentId: string, filter?: string): StudyItem[];
  getItem(studentId: string, id: string): StudyItem | undefined;
  createItem(studentId: string, item: StudyItem): StudyItem;
  updateItem(studentId: string, id: string, changes: Partial<StudyItem>): StudyItem | undefined;
  deleteItem(studentId: string, id: string): boolean;
  getProfile(studentId: string): Profile | undefined;
  updateProfile(studentId: string, profile: Profile): Profile | undefined;
  isEmailTaken(email: string, exceptStudentId?: string): boolean;
  listActivities(studentId: string): Activity[];
  addActivity(studentId: string, activity: Activity): Activity;
  deleteActivity(studentId: string, id: string): boolean;
  listNotifications(studentId: string): Notification[];
  markNotificationsRead(studentId: string): Notification[];
}
