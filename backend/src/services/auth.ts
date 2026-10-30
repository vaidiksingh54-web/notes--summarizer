import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, RequestHandler } from "express";
import { ApiError, type Profile } from "../types.ts";
import type { Repository } from "../repository/repository.ts";

declare module "express-serve-static-core" {
  interface Request {
    studentId?: string;
  }
}

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex || !/^[a-f\d]+$/i.test(saltHex) || !/^[a-f\d]+$/i.test(hashHex)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function bearerToken(request: Request): string | undefined {
  const header = request.header("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1];
}

export function studentIdOf(request: Request): string {
  if (!request.studentId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in with your student account to continue.");
  }
  return request.studentId;
}

export function createRequireAuth(repository: Repository): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = bearerToken(request);
      const studentId = token ? await repository.getStudentIdForSession(token) : undefined;
      if (!studentId) {
        next(new ApiError(401, "UNAUTHENTICATED", "Sign in with your student account to continue."));
        return;
      }
      request.studentId = studentId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authPayload(token: string, profile: Profile) {
  return { token, profile };
}

export function createOptionalAuth(repository: Repository): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = bearerToken(request);
      if (token) {
        request.studentId = await repository.getStudentIdForSession(token);
      }
      next();
    } catch (_error) {
      next();
    }
  };
}
