import type { Express, RequestHandler } from "express";
import type { StudyAi } from "../types.ts";
import { parseChatRequest, parseFlashcardRequest, parseMindMapRequest, parseQuizRequest, parseSummaryRequest, parseTransformRequest } from "../validation.ts";

export function registerAiRoutes(app: Express, ai: StudyAi, requireAuth: RequestHandler, optionalAuth?: RequestHandler): void {
  const chatAuth = optionalAuth || ((_req: any, _res: any, next: any) => next());
  const openAiAuth = optionalAuth || ((_req: any, _res: any, next: any) => next());

  const handleSummary = async (request: any, response: any, next: any) => {
    try {
      const { text, length, difficulty, style } = parseSummaryRequest(request.body);
      response.json({ summary: await ai.summarize(text, { length, difficulty, style }) });
    } catch (error) {
      next(error);
    }
  };

  app.post("/api/summarize", openAiAuth, handleSummary);
  app.post("/api/ai/summarize", openAiAuth, handleSummary);

  const handleFlashcards = async (request: any, response: any, next: any) => {
    try {
      response.json({ cards: await ai.generateFlashcards(parseFlashcardRequest(request.body)) });
    } catch (error) {
      next(error);
    }
  };

  app.post("/api/flashcards/generate", openAiAuth, handleFlashcards);
  app.post("/api/ai/flashcards", openAiAuth, handleFlashcards);

  const handleQuiz = async (request: any, response: any, next: any) => {
    try {
      const input = parseQuizRequest(request.body);
      const questions = await ai.generateQuiz(input);
      response.json({ questions });
    } catch (error) {
      next(error);
    }
  };

  app.post("/api/quiz/generate", openAiAuth, handleQuiz);
  app.post("/api/ai/quiz", openAiAuth, handleQuiz);

  const handleMindMap = async (request: any, response: any, next: any) => {
    try {
      const input = parseMindMapRequest(request.body);
      const mindmap = await ai.generateMindMap(input);
      response.json({ mindmap });
    } catch (error) {
      next(error);
    }
  };

  app.post("/api/mindmap", openAiAuth, handleMindMap);
  app.post("/api/mindmap/generate", openAiAuth, handleMindMap);
  app.post("/api/ai/mindmap", openAiAuth, handleMindMap);

  app.post("/api/ai/chat", chatAuth, async (request, response, next) => {
    try {
      const input = parseChatRequest(request.body);
      const reply = await ai.chat(input);
      response.json({ reply });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/transform", openAiAuth, async (request, response, next) => {
    try {
      const { text, action } = parseTransformRequest(request.body);
      const transformed = await ai.transformText(text, action);
      response.json({ transformed });
    } catch (error) {
      next(error);
    }
  });
}
