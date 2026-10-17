export type StudyItemType = "note" | "flashcards" | "quiz" | "mindmap";

export interface StudyItem {
  id: string;
  type: StudyItemType;
  title: string;
  category: string;
  date: string;
  progress: number;
  isFavorite: boolean;
  content?: string;
  tags?: string[];
  cardCount?: number;
  cards?: Array<{ question: string; answer: string }>;
  score?: string;
  questions?: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
  rootNode?: MindMapNode;
  nodeCount?: number;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  age: number;
  bio: string;
  avatar: string;
}

export interface Activity {
  id: string;
  title: string;
  type: string;
  score: string;
  date: string;
  icon: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface StoredStudent {
  id: string;
  email: string;
  passwordHash: string;
  profile: Profile;
}

export interface PublicStudent {
  id: string;
  profile: Profile;
}

export interface FlashcardRequest {
  topic: string;
  count: number;
  difficulty: "easy" | "medium" | "hard";
  sourceText?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "model";
  content: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
  history?: ChatMessage[];
}

export interface QuizRequest {
  topic: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
  sourceText?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface MindMapNode {
  id?: string;
  title: string;
  notes?: string;
  color?: string;
  children?: MindMapNode[];
  collapsed?: boolean;
}

export interface MindMapRequest {
  topic?: string;
  text?: string;
  depth?: number;
}

export interface SummaryOptions {
  length?: "short" | "medium" | "comprehensive";
  difficulty?: "beginner" | "intermediate" | "advanced";
  style?: "detailed" | "bulleted" | "cheatsheet";
}

export interface StudyAi {
  summarize(text: string, options?: SummaryOptions): Promise<string>;
  generateFlashcards(request: FlashcardRequest): Promise<Array<{ question: string; answer: string }>>;
  generateQuiz(request: QuizRequest): Promise<QuizQuestion[]>;
  chat(request: ChatRequest): Promise<string>;
  transformText(text: string, action: string): Promise<string>;
  generateMindMap(request: MindMapRequest): Promise<MindMapNode>;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
