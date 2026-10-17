import type { Express, RequestHandler } from "express";
import { ApiError } from "../types.js";
import type { Repository } from "../repository/repository.js";
import { studentIdOf } from "../services/auth.js";
import { parseItemChanges, parseStudyItem } from "../validation.js";

export function registerItemRoutes(app: Express, repository: Repository, requireAuth: RequestHandler): void {
  app.get("/api/items", requireAuth, async (request, response, next) => {
    try {
      const filter = typeof request.query.type === "string" ? request.query.type : "all";
      if (!["all", "note", "flashcards", "quiz", "mindmap", "favorites"].includes(filter)) {
        throw new ApiError(400, "INVALID_FILTER", "type must be all, note, flashcards, quiz, mindmap, or favorites.");
      }
      response.json({ items: await repository.listItems(studentIdOf(request), filter) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/items", requireAuth, async (request, response, next) => {
    try {
      const studentId = studentIdOf(request);
      const item = parseStudyItem(request.body);
      if (await repository.getItem(studentId, item.id)) {
        throw new ApiError(409, "ITEM_EXISTS", "An item with this id already exists.");
      }
      response.status(201).json({ item: await repository.createItem(studentId, item) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/items/:id", requireAuth, async (request, response, next) => {
    try {
      const item = await repository.getItem(studentIdOf(request), request.params.id);
      if (!item) return next(new ApiError(404, "ITEM_NOT_FOUND", "Study item was not found."));
      response.json({ item });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/items/:id", requireAuth, async (request, response, next) => {
    try {
      const studentId = studentIdOf(request);
      const item = parseItemChanges(request.params.id, request.body);
      const updated = await repository.updateItem(studentId, request.params.id, item);
      if (!updated) throw new ApiError(404, "ITEM_NOT_FOUND", "Study item was not found.");
      response.json({ item: updated });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/items/:id/favorite", requireAuth, async (request, response, next) => {
    try {
      if (typeof request.body?.isFavorite !== "boolean") {
        throw new ApiError(400, "INVALID_FIELD", "isFavorite must be a boolean.");
      }
      const studentId = studentIdOf(request);
      const existing = await repository.getItem(studentId, request.params.id);
      if (!existing) throw new ApiError(404, "ITEM_NOT_FOUND", "Study item was not found.");
      const item = await repository.updateItem(studentId, request.params.id, {
        ...existing,
        isFavorite: request.body.isFavorite,
      });
      response.json({ item });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/items/:id", requireAuth, async (request, response, next) => {
    try {
      if (!(await repository.deleteItem(studentIdOf(request), request.params.id))) {
        return next(new ApiError(404, "ITEM_NOT_FOUND", "Study item was not found."));
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}
