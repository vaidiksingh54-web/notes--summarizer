import express, { type ErrorRequestHandler } from "express";
import { ApiError, type StudyAi } from "./types.ts";
import { GeminiStudyAi } from "./services/gemini.ts";
import { InMemoryRepository } from "./repository/databaseRepository.ts";
import { SqliteRepository } from "./repository/sqliteRepository.ts";
import { SupabaseRepository } from "./repository/supabaseRepository.ts";
import type { Repository } from "./repository/repository.ts";
import { createRequireAuth, createOptionalAuth, studentIdOf } from "./services/auth.ts";
import { registerAiRoutes } from "./routes/ai.ts";
import { registerAuthRoutes } from "./routes/auth.ts";
import { registerItemRoutes } from "./routes/items.ts";
import { registerProfileRoutes } from "./routes/profile.ts";

import { securityHeaders, createRateLimiter } from "./middleware/security.ts";

export function createApp(options: { repository?: Repository; ai?: StudyAi } = {}) {
  let repository: Repository;
  if (options.repository) {
    repository = options.repository;
  } else if (process.env.STORAGE_TYPE === "in-memory") {
    repository = new InMemoryRepository();
  } else if (
    (process.env.STORAGE_TYPE === "supabase" || (!process.env.STORAGE_TYPE && process.env.SUPABASE_URL)) &&
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY)
  ) {
    try {
      repository = new SupabaseRepository();
    } catch (err) {
      console.error("Failed to initialize SupabaseRepository, falling back to SQLite:", err);
      repository = new SqliteRepository();
    }
  } else {
    try {
      repository = new SqliteRepository();
    } catch (err) {
      console.warn("SQLite initialization failed, falling back to InMemoryRepository:", err);
      repository = new InMemoryRepository();
    }
  }





  const ai = options.ai ?? new GeminiStudyAi();
  const requireAuth = createRequireAuth(repository);
  const optionalAuth = createOptionalAuth(repository);
  const app = express();

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb", strict: true }));

  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Too many authentication attempts. Please try again later.",
    skipInTests: true,
  });
  app.use("/api/login", authLimiter);
  app.use("/api/signup", authLimiter);

  const aiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 40,
    message: "AI rate limit reached. Please wait a minute before generating more content.",
    skipInTests: true,
  });
  app.use(
    ["/api/summarize", "/api/flashcards/generate", "/api/quiz/generate", "/api/mindmap", "/api/mindmap/generate", "/api/ai/chat", "/api/ai/transform"],
    aiLimiter,
  );


  app.get("/api/health", (_request, response) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    let storageType = "sqlite-persistent";
    if (repository instanceof InMemoryRepository) storageType = "in-memory-per-student";
    else if (repository instanceof SupabaseRepository) storageType = "supabase-persistent";
    response.json({
      status: "ok",
      storage: storageType,
      auth: "student-accounts",
      geminiConfigured: Boolean(key && key !== "YOUR_GEMINI_API_KEY" && key !== "MY_GEMINI_API_KEY"),
    });
  });

  registerAuthRoutes(app, repository);
  registerAiRoutes(app, ai, requireAuth, optionalAuth);
  registerItemRoutes(app, repository, requireAuth);
  registerProfileRoutes(app, repository, requireAuth);

  app.get("/api/bootstrap", requireAuth, async (request, response, next) => {
    try {
      const studentId = studentIdOf(request);
      const [profile, items, activities, notifications] = await Promise.all([
        repository.getProfile(studentId),
        repository.listItems(studentId),
        repository.listActivities(studentId),
        repository.listNotifications(studentId),
      ]);
      response.json({
        profile,
        items,
        activities,
        notifications,
      });
    } catch (error) {
      next(error);
    }
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
