import type { Express, RequestHandler } from "express";
import { ApiError } from "../types.js";
import type { Repository } from "../repository/repository.js";
import { studentIdOf } from "../services/auth.js";
import { parseActivity, parseProfile } from "../validation.js";

export function registerProfileRoutes(app: Express, repository: Repository, requireAuth: RequestHandler): void {
  app.get("/api/profile", requireAuth, (request, response, next) => {
    const profile = repository.getProfile(studentIdOf(request));
    if (!profile) return next(new ApiError(404, "PROFILE_NOT_FOUND", "Student profile was not found."));
    response.json({ profile });
  });

  app.put("/api/profile", requireAuth, (request, response, next) => {
    try {
      const studentId = studentIdOf(request);
      const current = repository.getProfile(studentId);
      if (!current) throw new ApiError(404, "PROFILE_NOT_FOUND", "Student profile was not found.");
      const profile = parseProfile(request.body, current);
      if (repository.isEmailTaken(profile.email, studentId)) {
        throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
      }
      response.json({ profile: repository.updateProfile(studentId, profile) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/activities", requireAuth, (request, response) => {
    response.json({ activities: repository.listActivities(studentIdOf(request)) });
  });

  app.post("/api/activities", requireAuth, (request, response, next) => {
    try {
      response.status(201).json({
        activity: repository.addActivity(studentIdOf(request), parseActivity(request.body)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/activities/:id", requireAuth, (request, response, next) => {
    if (!repository.deleteActivity(studentIdOf(request), request.params.id)) {
      return next(new ApiError(404, "ACTIVITY_NOT_FOUND", "Activity was not found."));
    }
    response.status(204).end();
  });

  app.get("/api/notifications", requireAuth, (request, response) => {
    response.json({ notifications: repository.listNotifications(studentIdOf(request)) });
  });

  app.patch("/api/notifications/read", requireAuth, (request, response) => {
    response.json({ notifications: repository.markNotificationsRead(studentIdOf(request)) });
  });
}
