import { ApiError, type Activity, type ChatRequest, type FlashcardRequest, type MindMapNode, type MindMapRequest, type Profile, type QuizQuestion, type QuizRequest, type StudyItem } from "./types.ts";

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function requireObject(value: unknown, name = "Request body"): Record<string, unknown> {
  if (!object(value)) {
    throw new ApiError(400, "INVALID_BODY", `${name} must be a JSON object.`);
  }
  return value;
}

function stringField(
  value: unknown,
  name: string,
  options: { required?: boolean; max?: number } = {},
): string | undefined {
  if (value === undefined && !options.required) return undefined;
  if (typeof value !== "string" || (options.required && value.trim().length === 0)) {
    throw new ApiError(400, "INVALID_FIELD", `${name} must be a non-empty string.`);
  }
  if (value.length > (options.max ?? 500)) {
    throw new ApiError(400, "INVALID_FIELD", `${name} must be at most ${options.max ?? 500} characters.`);
  }
  return value;
}

function numberField(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new ApiError(400, "INVALID_FIELD", `${name} must be a number between ${min} and ${max}.`);
  }
  return value;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseSummaryRequest(body: unknown): {
  text: string;
  length?: "short" | "medium" | "comprehensive";
  difficulty?: "beginner" | "intermediate" | "advanced";
  style?: "detailed" | "bulleted" | "cheatsheet";
} {
  const input = requireObject(body);
  const text = stringField(input.text, "text", { required: true, max: 25_000 })!;
  if (text.trim().length < 20) {
    throw new ApiError(400, "INVALID_FIELD", "text must contain at least 20 non-whitespace characters.");
  }
  let length: "short" | "medium" | "comprehensive" | undefined = undefined;
  if (input.length !== undefined) {
    if (input.length !== "short" && input.length !== "medium" && input.length !== "comprehensive") {
      throw new ApiError(400, "INVALID_FIELD", "length must be short, medium, or comprehensive.");
    }
    length = input.length;
  }
  let difficulty: "beginner" | "intermediate" | "advanced" | undefined = undefined;
  if (input.difficulty !== undefined) {
    if (input.difficulty !== "beginner" && input.difficulty !== "intermediate" && input.difficulty !== "advanced") {
      throw new ApiError(400, "INVALID_FIELD", "difficulty must be beginner, intermediate, or advanced.");
    }
    difficulty = input.difficulty;
  }
  let style: "detailed" | "bulleted" | "cheatsheet" | undefined = undefined;
  if (input.style !== undefined) {
    if (input.style !== "detailed" && input.style !== "bulleted" && input.style !== "cheatsheet") {
      throw new ApiError(400, "INVALID_FIELD", "style must be detailed, bulleted, or cheatsheet.");
    }
    style = input.style;
  }
  return { text, length, difficulty, style };
}

export function parseSummaryText(body: unknown): string {
  return parseSummaryRequest(body).text;
}

export function parseSignup(body: unknown): {
  name: string;
  email: string;
  password: string;
  college: string;
  course: string;
  phone: string;
} {
  const input = requireObject(body);
  const email = normalizeEmail(stringField(input.email, "email", { required: true, max: 254 })!);
  if (!isValidEmail(email)) {
    throw new ApiError(400, "INVALID_FIELD", "email must be a valid email address.");
  }
  const password = stringField(input.password, "password", { required: true, max: 200 })!;
  if (password.length < 8) {
    throw new ApiError(400, "INVALID_FIELD", "password must be at least 8 characters.");
  }
  return {
    name: stringField(input.name, "name", { required: true, max: 100 })!.trim(),
    email,
    password,
    college: stringField(input.college, "college", { required: true, max: 150 })!.trim(),
    course: stringField(input.course, "course", { required: true, max: 150 })!.trim(),
    phone: stringField(input.phone ?? "", "phone", { max: 40 }) ?? "",
  };
}

export function parseLogin(body: unknown): { email: string; password: string } {
  const input = requireObject(body);
  const email = normalizeEmail(stringField(input.email, "email", { required: true, max: 254 })!);
  const password = stringField(input.password, "password", { required: true, max: 200 })!;
  return { email, password };
}

export function parseFlashcardRequest(body: unknown): FlashcardRequest {
  const input = requireObject(body);
  const topic = stringField(input.topic, "topic", { required: true, max: 200 })!.trim();
  if (topic.length < 2) {
    throw new ApiError(400, "INVALID_FIELD", "topic must be at least 2 characters.");
  }
  const count = numberField(input.count, "count", 1, 10);
  if (!Number.isInteger(count)) {
    throw new ApiError(400, "INVALID_FIELD", "count must be an integer.");
  }
  const difficulty = input.difficulty ?? "medium";
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    throw new ApiError(400, "INVALID_FIELD", "difficulty must be easy, medium, or hard.");
  }
  const sourceText = input.sourceText === undefined
    ? undefined
    : stringField(input.sourceText, "sourceText", { max: 25_000 });
  return { topic, count, difficulty, sourceText };
}

export function parseGeneratedCards(
  value: unknown,
  expectedCount: number,
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value) || value.length < 1) {
    throw new ApiError(502, "GEMINI_EMPTY_RESPONSE", "Gemini did not return any flashcards.");
  }
  const cards = value.slice(0, expectedCount).map((entry, index) => {
    const card = requireObject(entry, `cards[${index}]`);
    return {
      question: stringField(card.question ?? card.front, `cards[${index}].question`, { required: true, max: 2_000 })!,
      answer: stringField(card.answer ?? card.back, `cards[${index}].answer`, { required: true, max: 5_000 })!,
    };
  });
  return cards;
}

export function parseQuizRequest(body: unknown): QuizRequest {
  const input = requireObject(body);
  const topic = stringField(input.topic, "topic", { required: true, max: 200 })!.trim();
  if (topic.length < 2) {
    throw new ApiError(400, "INVALID_FIELD", "topic must be at least 2 characters.");
  }
  const count = numberField(input.count, "count", 1, 20);
  if (!Number.isInteger(count)) {
    throw new ApiError(400, "INVALID_FIELD", "count must be an integer.");
  }
  const difficulty = input.difficulty ?? "medium";
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    throw new ApiError(400, "INVALID_FIELD", "difficulty must be easy, medium, or hard.");
  }
  const sourceText = input.sourceText === undefined
    ? undefined
    : stringField(input.sourceText, "sourceText", { max: 25_000 });
  return { topic, count, difficulty, sourceText };
}

export function parseGeneratedQuiz(
  value: unknown,
  expectedCount: number,
): QuizQuestion[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new ApiError(502, "GEMINI_EMPTY_RESPONSE", "Gemini did not return any quiz questions.");
  }
  return value.slice(0, expectedCount).map((entry, index) => {
    const q = requireObject(entry, `questions[${index}]`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      throw new ApiError(502, "GEMINI_EMPTY_RESPONSE", `questions[${index}].options must contain between 2 and 6 choices.`);
    }
    const rawCorrect = typeof q.correct === "number" ? q.correct : (typeof q.answer === "number" ? q.answer : 0);
    const correct = Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < q.options.length
      ? rawCorrect
      : 0;
    return {
      question: stringField(q.question, `questions[${index}].question`, { required: true, max: 2_000 })!,
      options: q.options.map((opt: unknown) => String(opt || "").trim()),
      correct,
      explanation: stringField(q.explanation ?? "Review lesson materials for full context.", `questions[${index}].explanation`, { max: 5_000 }) || "",
    };
  });
}

export function parseTransformRequest(body: unknown): { text: string; action: string } {
  const input = requireObject(body);
  const text = stringField(input.text, "text", { required: true, max: 25_000 })!;
  const action = stringField(input.action, "action", { required: true, max: 50 })!;
  return { text, action };
}

export function parseMindMapRequest(body: unknown): MindMapRequest {
  const input = requireObject(body);
  const topic = input.topic === undefined
    ? undefined
    : stringField(input.topic, "topic", { max: 300 })?.trim();
  const text = input.text === undefined
    ? undefined
    : stringField(input.text, "text", { max: 35_000 })?.trim();

  if ((!topic || topic.length === 0) && (!text || text.length === 0)) {
    throw new ApiError(400, "INVALID_FIELD", "Either topic or text must be provided.");
  }
  const depth = input.depth === undefined
    ? 3
    : numberField(input.depth, "depth", 2, 5);

  return { topic, text, depth };
}

export function parseGeneratedMindMap(value: unknown): MindMapNode {
  let root = requireObject(value, "mindmap root");
  if (root.mindmap && typeof root.mindmap === "object") {
    root = root.mindmap as Record<string, unknown>;
  }
  const title = stringField(root.title, "root.title", { required: true, max: 200 })!;

  function sanitizeNode(raw: unknown, pathStr: string, currentDepth: number): MindMapNode {
    const nodeObj = requireObject(raw, pathStr);
    const nodeTitle = stringField(nodeObj.title, `${pathStr}.title`, { required: true, max: 200 })!;
    const node: MindMapNode = {
      title: nodeTitle,
      id: typeof nodeObj.id === "string" ? nodeObj.id : `node-${Math.random().toString(36).slice(2, 9)}`,
    };
    if (typeof nodeObj.notes === "string") {
      node.notes = nodeObj.notes.slice(0, 500);
    }
    if (typeof nodeObj.color === "string") {
      node.color = nodeObj.color.slice(0, 30);
    }
    if (Array.isArray(nodeObj.children) && currentDepth < 6) {
      node.children = nodeObj.children
        .filter((child) => child && typeof child === "object")
        .slice(0, 10)
        .map((child, idx) => sanitizeNode(child, `${pathStr}.children[${idx}]`, currentDepth + 1));
    } else {
      node.children = [];
    }
    return node;
  }

  return sanitizeNode(root, "root", 1);
}

export function parseStudyItem(value: unknown): StudyItem {
  const input = requireObject(value);
  const type = input.type;
  if (type !== "note" && type !== "flashcards" && type !== "quiz" && type !== "mindmap") {
    throw new ApiError(400, "INVALID_FIELD", "type must be note, flashcards, quiz, or mindmap.");
  }
  const rawId = typeof input.id === "string" && input.id.trim().length > 0
    ? input.id.trim()
    : `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const id = stringField(rawId, "id", { required: true, max: 100 })!;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ApiError(400, "INVALID_FIELD", "id may contain only letters, numbers, underscores, and hyphens.");
  }
  const item: StudyItem = {
    id,
    type,
    title: stringField(input.title, "title", { required: true, max: 200 })!,
    category: stringField(input.category ?? "General", "category", { required: true, max: 100 })!,
    date: stringField(input.date ?? new Date().toLocaleDateString(), "date", { required: true, max: 80 })!,
    progress: numberField(input.progress ?? 0, "progress", 0, 100),
    isFavorite: typeof input.isFavorite === "boolean" ? input.isFavorite : false,
  };

  if (type === "note") {
    const rawContent = typeof input.content === "object" && input.content !== null
      ? (typeof (input.content as { text?: unknown }).text === "string" ? (input.content as { text: string }).text : JSON.stringify(input.content))
      : input.content;
    item.content = stringField(rawContent, "content", { required: true, max: 100_000 })!;
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags) || input.tags.length > 30 ||
          input.tags.some((tag) => typeof tag !== "string" || tag.length > 50)) {
        throw new ApiError(400, "INVALID_FIELD", "tags must be an array of at most 30 strings (50 characters each).");
      }
      item.tags = input.tags as string[];
    }
  } else if (type === "flashcards") {
    if (!Array.isArray(input.cards) || input.cards.length < 1 || input.cards.length > 100) {
      throw new ApiError(400, "INVALID_FIELD", "cards must contain between 1 and 100 cards.");
    }
    item.cards = input.cards.map((entry, index) => {
      const card = requireObject(entry, `cards[${index}]`);
      return {
        question: stringField(card.question, `cards[${index}].question`, { required: true, max: 2_000 })!,
        answer: stringField(card.answer, `cards[${index}].answer`, { required: true, max: 5_000 })!,
      };
    });
    item.cardCount = numberField(input.cardCount ?? input.cards.length, "cardCount", 1, 100);
  } else if (type === "quiz") {
    if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 100) {
      throw new ApiError(400, "INVALID_FIELD", "questions must contain between 1 and 100 questions.");
    }
    item.questions = input.questions.map((entry, index) => {
      const question = requireObject(entry, `questions[${index}]`);
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 8 ||
          question.options.some((option) => typeof option !== "string" || option.length > 1_000)) {
        throw new ApiError(400, "INVALID_FIELD", `questions[${index}].options must contain 2 to 8 strings.`);
      }
      const correct = numberField(question.correct, `questions[${index}].correct`, 0, question.options.length - 1);
      if (!Number.isInteger(correct)) {
        throw new ApiError(400, "INVALID_FIELD", `questions[${index}].correct must be an integer.`);
      }
      return {
        question: stringField(question.question, `questions[${index}].question`, { required: true, max: 2_000 })!,
        options: question.options as string[],
        correct,
        explanation: stringField(question.explanation, `questions[${index}].explanation`, { required: true, max: 5_000 })!,
      };
    });
    if (input.score !== undefined) item.score = stringField(input.score, "score", { max: 30 });
  } else if (type === "mindmap") {
    if (input.rootNode) {
      item.rootNode = parseGeneratedMindMap(input.rootNode);
    }
    item.nodeCount = numberField(input.nodeCount ?? 1, "nodeCount", 1, 1000);
  }

  return item;
}

export function parseProfile(value: unknown, current: Profile): Profile {
  const input = requireObject(value);
  const profile: Profile = {
    name: stringField(input.name, "name", { required: true, max: 100 })!,
    email: normalizeEmail(stringField(input.email, "email", { required: true, max: 254 })!),
    phone: stringField(input.phone ?? "", "phone", { max: 40 }) ?? "",
    college: stringField(input.college ?? current.college ?? "", "college", { max: 150 }) ?? "",
    course: stringField(input.course ?? current.course ?? "", "course", { max: 150 }) ?? "",
    age: input.age === undefined ? current.age : numberField(input.age, "age", 0, 130),
    bio: stringField(input.bio ?? current.bio ?? "", "bio", { max: 1_000 }) ?? "",
    avatar: stringField(input.avatar ?? current.avatar ?? "ST", "avatar", { required: true, max: 4 })!,
  };
  if (!isValidEmail(profile.email)) {
    throw new ApiError(400, "INVALID_FIELD", "email must be a valid email address.");
  }
  return profile;
}

export function parseActivity(value: unknown): Activity {
  const input = requireObject(value);
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: stringField(input.title, "title", { required: true, max: 200 })!,
    type: stringField(input.type, "type", { required: true, max: 80 })!,
    score: stringField(input.score, "score", { required: true, max: 80 })!,
    date: new Date().toISOString(),
    icon: stringField(input.icon, "icon", { required: true, max: 20 })!,
  };
}

export function parseItemChanges(id: string, value: unknown): Partial<StudyItem> {
  const input = requireObject(value);
  return parseStudyItem({ ...input, id });
}

export function studentAvatar(name: string): string {
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  return initials || "ST";
}

export function parseChatRequest(body: unknown): ChatRequest {
  const input = requireObject(body);
  const message = stringField(input.message, "message", { required: true, max: 10_000 })!.trim();
  if (message.length === 0) {
    throw new ApiError(400, "INVALID_FIELD", "message must not be empty.");
  }
  const context = input.context === undefined
    ? undefined
    : stringField(input.context, "context", { max: 35_000 });

  let history: ChatRequest["history"] = undefined;
  if (input.history !== undefined) {
    if (!Array.isArray(input.history) || input.history.length > 20) {
      throw new ApiError(400, "INVALID_FIELD", "history must be an array of at most 20 messages.");
    }
    history = input.history.map((item, idx) => {
      const msg = requireObject(item, `history[${idx}]`);
      const role = msg.role;
      if (role !== "user" && role !== "assistant" && role !== "model") {
        throw new ApiError(400, "INVALID_FIELD", `history[${idx}].role must be 'user', 'assistant', or 'model'.`);
      }
      return {
        role,
        content: stringField(msg.content, `history[${idx}].content`, { required: true, max: 10_000 })!,
      };
    });
  }

  return { message, context, history };
}

