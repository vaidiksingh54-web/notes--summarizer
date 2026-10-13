import type { Express } from "express";
import { ApiError } from "../types.js";
import type { Repository } from "../repository/repository.js";
import { authPayload, bearerToken, hashPassword, verifyPassword } from "../services/auth.js";
import { parseLogin, parseSignup, studentAvatar } from "../validation.js";

export function registerAuthRoutes(app: Express, repository: Repository): void {
  app.post("/api/signup", async (request, response, next) => {
    try {
      const input = parseSignup(request.body);
      if (repository.isEmailTaken(input.email)) {
        throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
      }
      const profile = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        college: input.college,
        course: input.course,
        age: 18,
        bio: `Student at ${input.college}.`,
        avatar: studentAvatar(input.name),
      };
      const student = repository.createStudent(input.email, await hashPassword(input.password), profile);
      response.status(201).json(authPayload(repository.createSession(student.id), student.profile));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (request, response, next) => {
    try {
      const input = parseLogin(request.body);
      const student = repository.findStudentByEmail(input.email);
      const valid = student ? await verifyPassword(input.password, student.passwordHash) : false;
      if (!student || !valid) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }
      response.json(authPayload(repository.createSession(student.id), student.profile));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", (request, response, next) => {
    const token = bearerToken(request);
    if (!token || !repository.getStudentIdForSession(token)) {
      next(new ApiError(401, "UNAUTHENTICATED", "Sign in with your student account to continue."));
      return;
    }
    repository.deleteSession(token);
    response.status(204).end();
  });
}
