import type { Express, RequestHandler } from "express";
import { ApiError } from "../types.js";
import type { Repository } from "../repository/repository.js";
import { studentIdOf } from "../services/auth.js";
import { parseActivity, parseProfile } from "../validation.js";

export function registerProfileRoutes(app: Express, repository: Repository, requireAuth: RequestHandler): void {
  app.get("/api/profile", requireAuth, async (request, response, next) => {
    try {
      const profile = await repository.getProfile(studentIdOf(request));
      if (!profile) return next(new ApiError(404, "PROFILE_NOT_FOUND", "Student profile was not found."));
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/profile", requireAuth, async (request, response, next) => {
    try {
      const studentId = studentIdOf(request);
      const current = await repository.getProfile(studentId);
      if (!current) throw new ApiError(404, "PROFILE_NOT_FOUND", "Student profile was not found.");
      const profile = parseProfile(request.body, current);
      if (await repository.isEmailTaken(profile.email, studentId)) {
        throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
      }
      response.json({ profile: await repository.updateProfile(studentId, profile) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/activities", requireAuth, async (request, response, next) => {
    try {
      response.json({ activities: await repository.listActivities(studentIdOf(request)) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/activities", requireAuth, async (request, response, next) => {
    try {
      response.status(201).json({
        activity: await repository.addActivity(studentIdOf(request), parseActivity(request.body)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (request, response, next) => {
    try {
      if (!(await repository.deleteActivity(studentIdOf(request), request.params.id))) {
        return next(new ApiError(404, "ACTIVITY_NOT_FOUND", "Activity was not found."));
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications", requireAuth, async (request, response, next) => {
    try {
      response.json({ notifications: await repository.listNotifications(studentIdOf(request)) });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/notifications/read", requireAuth, async (request, response, next) => {
    try {
      response.json({ notifications: await repository.markNotificationsRead(studentIdOf(request)) });
    } catch (error) {
      next(error);
    }
  });
}

