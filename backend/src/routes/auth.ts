import type { Express } from "express";
import { ApiError, type Profile } from "../types.ts";
import type { Repository } from "../repository/repository.ts";
import { authPayload, bearerToken, hashPassword, verifyPassword } from "../services/auth.ts";
import { parseLogin, parseSignup, studentAvatar } from "../validation.ts";

export function registerAuthRoutes(app: Express, repository: Repository): void {
  app.post("/api/signup", async (request, response, next) => {
    try {
      const input = parseSignup(request.body);
      if (await repository.isEmailTaken(input.email)) {
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
      const student = await repository.createStudent(input.email, await hashPassword(input.password), profile);
      const token = await repository.createSession(student.id);
      response.status(201).json(authPayload(token, student.profile));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (request, response, next) => {
    try {
      const input = parseLogin(request.body);
      const student = await repository.findStudentByEmail(input.email);
      const valid = student ? await verifyPassword(input.password, student.passwordHash) : false;
      if (!student || !valid) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }
      const token = await repository.createSession(student.id);
      response.json(authPayload(token, student.profile));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/google", async (request, response, next) => {
    try {
      const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
      const name = typeof request.body?.name === "string" ? request.body.name.trim() : "Google Student";
      const uid = typeof request.body?.uid === "string" ? request.body.uid.trim() : "";
      if (!email || !uid) {
        throw new ApiError(400, "INVALID_FIELDS", "email and uid are required for Google authentication.");
      }
      const existing = await repository.findStudentByEmail(email);
      let student: { id: string; profile: Profile };
      if (existing) {
        if (!existing.passwordHash.startsWith("google-oauth-")) {
          throw new ApiError(
            409,
            "ACCOUNT_EXISTS_PASSWORD",
            "An account with this email was registered using password authentication. Please sign in with your email and password."
          );
        }
        student = existing;
      } else {
        student = await repository.createStudent(email, `google-oauth-${uid}`, {
          name,
          email,
          phone: "",
          college: "Google Verified",
          course: "General Studies",
          age: 20,
          bio: "Student verified via Google OAuth.",
          avatar: studentAvatar(name),
        });
      }
      const token = await repository.createSession(student.id);
      response.json(authPayload(token, student.profile));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", async (request, response, next) => {
    try {
      const token = bearerToken(request);
      const studentId = token ? await repository.getStudentIdForSession(token) : undefined;
      if (!token || !studentId) {
        next(new ApiError(401, "UNAUTHENTICATED", "Sign in with your student account to continue."));
        return;
      }
      await repository.deleteSession(token);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}
