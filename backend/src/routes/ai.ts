import type { Express, RequestHandler } from "express";
import type { StudyAi } from "../types.js";
import { parseChatRequest, parseFlashcardRequest, parseMindMapRequest, parseQuizRequest, parseSummaryText, parseTransformRequest } from "../validation.js";

export function registerAiRoutes(app: Express, ai: StudyAi, requireAuth: RequestHandler): void {
  app.post("/api/summarize", requireAuth, async (request, response, next) => {
    try {
      response.json({ summary: await ai.summarize(parseSummaryText(request.body)) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/flashcards/generate", requireAuth, async (request, response, next) => {
    try {
      response.json({ cards: await ai.generateFlashcards(parseFlashcardRequest(request.body)) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/quiz/generate", requireAuth, async (request, response, next) => {
    try {
      const input = parseQuizRequest(request.body);
      const questions = await ai.generateQuiz(input);
      response.json({ questions });
    } catch (error) {
      next(error);
    }
  });

  const handleMindMap = async (request: any, response: any, next: any) => {
    try {
      const input = parseMindMapRequest(request.body);
      const mindmap = await ai.generateMindMap(input);
      response.json({ mindmap });
    } catch (error) {
      next(error);
    }
  };

  app.post("/api/mindmap", requireAuth, handleMindMap);
  app.post("/api/mindmap/generate", requireAuth, handleMindMap);


  app.post("/api/ai/chat", requireAuth, async (request, response, next) => {
    try {
      const input = parseChatRequest(request.body);
      const reply = await ai.chat(input);
      response.json({ reply });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/transform", requireAuth, async (request, response, next) => {
    try {
      const { text, action } = parseTransformRequest(request.body);
      const transformed = await ai.transformText(text, action);
      response.json({ transformed });
    } catch (error) {
      next(error);
    }
  });
}

