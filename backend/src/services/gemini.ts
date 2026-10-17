import { GoogleGenAI } from "@google/genai";
import { ApiError, type ChatRequest, type FlashcardRequest, type MindMapNode, type MindMapRequest, type QuizQuestion, type QuizRequest, type StudyAi, type SummaryOptions } from "../types.js";
import { parseGeneratedCards, parseGeneratedMindMap, parseGeneratedQuiz } from "../validation.js";

type GeminiClient = Pick<GoogleGenAI, "models">;
type GeminiClientFactory = (apiKey: string) => GeminiClient;

function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Continue to error throw below
      }
    }
    throw new ApiError(502, "GEMINI_EMPTY_RESPONSE", "Gemini returned a response that was not valid JSON.");
  }
}

export class GeminiStudyAi implements StudyAi {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly createClient: GeminiClientFactory = (key) =>
      new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      }),
  ) {}

  private requireKey(): string {
    const key = this.apiKey?.trim();
    if (!key || key === "YOUR_GEMINI_API_KEY" || key === "MY_GEMINI_API_KEY") {
      throw new ApiError(503, "GEMINI_NOT_CONFIGURED", "AI features are unavailable until GEMINI_API_KEY is configured on the server.");
    }
    return key;
  }

  private async generateText(prompt: string, responseMimeType?: string): Promise<string> {
    const key = this.requireKey();
    const client = this.createClient(key);
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
    ].filter(Boolean) as string[];
    let lastError: unknown;

    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          ...(responseMimeType ? { config: { responseMimeType } } : {}),
        });
        const text = response.text?.trim();
        if (text) {
          return text;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Gemini generation with ${model} failed, checking fallback:`, error);
      }
    }

    if (lastError instanceof ApiError) throw lastError;
    console.error("All Gemini model attempts failed:", lastError);
    throw new ApiError(502, "GEMINI_PROVIDER_ERROR", "The AI provider failed. Please try again later.");
  }

  async summarize(text: string, options?: SummaryOptions): Promise<string> {
    const lengthDirective =
      options?.length === "short"
        ? "Length: Ultra-concise study summary focusing strictly on core definitions and bottom-line takeaways."
        : options?.length === "comprehensive"
        ? "Length: In-depth comprehensive academic study guide exploring deep mechanisms, contextual nuance, and thorough explanations."
        : "Length: Balanced standard study summary covering key concepts, definitions, and main takeaways.";

    const styleDirective =
      options?.style === "bulleted"
        ? "Format: Structured high-yield bullet points with bold highlights for key terms and concepts."
        : options?.style === "cheatsheet"
        ? "Format: Rapid-recall exam cheatsheet with concise formulas, memory cues, and core definitions."
        : "Format: Detailed sections with clear headings, conceptual explanations, and revision takeaways.";

    const difficultyDirective =
      options?.difficulty === "beginner"
        ? "Audience: Introductory learner level using clear analogies and intuitive, accessible explanations."
        : options?.difficulty === "advanced"
        ? "Audience: Advanced undergraduate or research examination level using precise academic terminology."
        : "Audience: College undergraduate study level.";

    const prompt = `You are CogniStudy AI Tutor, an expert academic study assistant.
Create an accurate, structured study summary of the following notes.
${lengthDirective}
${styleDirective}
${difficultyDirective}

Return clean, readable text with markdown formatting (headings, bullet points, bold highlights) for optimal study clarity.

[SOURCE STUDY MATERIAL]:
${text}`;

    return this.generateText(prompt);
  }

  async generateFlashcards(request: FlashcardRequest): Promise<Array<{ question: string; answer: string }>> {
    const source = request.sourceText?.trim()
      ? `Use this source material:\n${request.sourceText}`
      : "Use accurate academic knowledge for the topic.";
    const text = await this.generateText(
      `Create exactly ${request.count} ${request.difficulty} study flashcards about "${request.topic}". ${source}
Return JSON only in this shape: {"cards":[{"question":"...","answer":"..."}]}
Do not wrap the JSON in markdown code blocks.`,
      "application/json",
    );
    const payload = parseModelJson(text);
    const cards = payload && typeof payload === "object" && "cards" in payload
      ? (payload as { cards: unknown }).cards
      : payload;
    return parseGeneratedCards(cards, request.count);
  }

  async chat(request: ChatRequest): Promise<string> {
    const contextPart = request.context?.trim()
      ? `\n\n[REFERENCE STUDY MATERIAL / NOTES]:\n${request.context.trim()}\n\nUse the above reference material to accurately answer, summarize, or extract key concepts when relevant.`
      : "";

    const historyPrompt = request.history?.length
      ? request.history
          .map((m) => `${m.role === "user" ? "Student" : "CogniStudy AI Tutor"}: ${m.content}`)
          .join("\n") + "\n"
      : "";

    const prompt = `You are CogniStudy AI Tutor, an expert academic tutor and study assistant.
Your mission is to help students learn effectively by:
1. Summarizing lengthy lectures, notes, and academic texts into crisp, structured takeaways.
2. Explaining difficult concepts using intuition, analogies, and clear formatting (bullet points, bold highlights).
3. Formulating active recall questions, definitions, and high-yield revision tips upon request.
Keep answers concise, direct, academically accurate, and easy to review.${contextPart}

${historyPrompt}Student: ${request.message}
CogniStudy AI Tutor:`;

    return this.generateText(prompt);
  }

  async generateQuiz(request: QuizRequest): Promise<QuizQuestion[]> {
    const source = request.sourceText?.trim()
      ? `Use this source material:\n${request.sourceText}`
      : "Use accurate academic knowledge for the topic.";
    const text = await this.generateText(
      `Create exactly ${request.count} multiple-choice test questions about "${request.topic}" at ${request.difficulty || "medium"} difficulty level. ${source}
Each question must have exactly 4 choices in "options", "correct" index (0, 1, 2, or 3), and an "explanation".
Return JSON only in this shape: {"questions":[{"question":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}]}
Do not wrap the JSON in markdown code blocks.`,
      "application/json",
    );
    const payload = parseModelJson(text);
    const questions = payload && typeof payload === "object" && "questions" in payload
      ? (payload as { questions: unknown }).questions
      : payload;
    return parseGeneratedQuiz(questions, request.count);
  }

  async transformText(text: string, action: string): Promise<string> {
    let directive = "Summarize the key ideas clearly.";
    if (action === "shorten") {
      directive = "Condense this text into an ultra-concise study overview focusing strictly on core definitions and bottom-line takeaways.";
    } else if (action === "expand") {
      directive = "Deepen this text by elaborating on underlying mechanisms, practical context, and academic details.";
    } else if (action === "simplify") {
      directive = "Explain this text using simple language, clear analogies, and intuitive breakdown (ELI5 style).";
    } else if (action === "bullets") {
      directive = "Format this material into clean, high-yield bullet points with bold highlights for key terms.";
    } else if (action === "rephrase") {
      directive = "Rephrase this content in polished, rigorous academic language suitable for exam revision.";
    }

    return this.generateText(`${directive}\n\n[SOURCE NOTES]:\n${text}`);
  }

  async generateMindMap(request: MindMapRequest): Promise<MindMapNode> {
    const topicInstruction = request.topic?.trim() ? `Topic: "${request.topic.trim()}"` : "";
    const sourceInstruction = request.text?.trim() ? `Source Material / Notes:\n${request.text.trim()}` : "";
    const depthInstruction = `Target depth: ${request.depth || 3} levels (Root -> Major Branches -> Subtopics -> Key Concepts/Details).`;

    const text = await this.generateText(
      `You are an expert academic concept map and mind map generator.
Analyze the following study material or topic and synthesize a clean, logical, hierarchical mind map tree.
${topicInstruction}
${sourceInstruction}
${depthInstruction}

Requirements:
1. Root node "title" must be concise and represent the central concept.
2. Root should have 4 to 8 primary branches in "children" representing major categories, phases, or themes.
3. Each primary branch should have 2 to 5 sub-branches in "children" containing high-yield subtopics or definitions.
4. Leaf nodes should contain brief key terms, formulas, examples, or takeaways (under 8 words each).
5. Output pure JSON ONLY matching this structure:
{
  "title": "Central Topic",
  "notes": "Short overview summary of this subject",
  "children": [
    {
      "title": "Major Theme 1",
      "children": [
        {
          "title": "Subtopic A",
          "children": [
            { "title": "Detail 1", "children": [] }
          ]
        }
      ]
    }
  ]
}
Do not wrap in markdown backticks or explanations. Return JSON only.`,
      "application/json",
    );
    const payload = parseModelJson(text);
    return parseGeneratedMindMap(payload);
  }
}

