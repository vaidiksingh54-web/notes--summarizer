import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { ApiError, type StudyAi } from "./types.js";
import { GeminiStudyAi } from "./services/gemini.js";
import { InMemoryRepository } from "./repository/databaseRepository.js";
import type { Repository } from "./repository/repository.js";
import { createRequireAuth, studentIdOf } from "./services/auth.js";
import { registerAiRoutes } from "./routes/ai.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerItemRoutes } from "./routes/items.js";
import { registerProfileRoutes } from "./routes/profile.js";

export function createApp(options: { repository?: Repository; ai?: StudyAi } = {}) {
  const repository = options.repository ?? new InMemoryRepository();
  const ai = options.ai ?? new GeminiStudyAi();
  const requireAuth = createRequireAuth(repository);
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb", strict: true }));

  app.get("/api/health", (_request, response) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    response.json({
      status: "ok",
      storage: "in-memory-per-student",
      auth: "student-accounts",
      geminiConfigured: Boolean(key && key !== "YOUR_GEMINI_API_KEY" && key !== "MY_GEMINI_API_KEY"),
    });
  });

  registerAuthRoutes(app, repository);
  registerAiRoutes(app, ai, requireAuth);
  registerItemRoutes(app, repository, requireAuth);
  registerProfileRoutes(app, repository, requireAuth);

  app.get("/api/bootstrap", requireAuth, (request, response) => {
    const studentId = studentIdOf(request);
    response.json({
      profile: repository.getProfile(studentId),
      items: repository.listItems(studentId),
      activities: repository.listActivities(studentId),
      notifications: repository.listNotifications(studentId),
    });
  });

  app.use("/api", (_request, _response, next) => {
    next(new ApiError(404, "API_NOT_FOUND", "API endpoint was not found."));
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ApiError) {
      response.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Request body must be valid JSON.", code: "INVALID_JSON" });
      return;
    }
    if (error?.type === "entity.too.large") {
      response.status(413).json({ error: "Request body exceeds the 1 MB limit.", code: "BODY_TOO_LARGE" });
      return;
    }
    console.error("Unhandled API error:", error);
    response.status(500).json({ error: "An unexpected server error occurred.", code: "INTERNAL_ERROR" });
  };
  app.use(errorHandler);

  return app;
}
