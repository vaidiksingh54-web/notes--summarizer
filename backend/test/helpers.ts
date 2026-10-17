import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createApp } from "../src/app.js";
import { ApiError, type StudyAi } from "../src/types.js";

export function createTestAi(): StudyAi {
  return {
    summarize: async (text) => {
      if (text.includes("provider failure")) {
        throw new ApiError(502, "GEMINI_PROVIDER_ERROR", "The AI provider failed. Please try again later.");
      }
      return "Summary generated for test.";
    },
    generateFlashcards: async (request) => Array.from({ length: request.count }, (_, index) => ({
      question: `${request.topic} question ${index + 1}`,
      answer: `${request.topic} answer ${index + 1}`,
    })),
    chat: async (request) => {
      if (request.message.includes("provider failure")) {
        throw new ApiError(502, "GEMINI_PROVIDER_ERROR", "The AI provider failed. Please try again later.");
      }
      return `Tutor answer for "${request.message}"`;
    },
    generateQuiz: async (request) => Array.from({ length: request.count }, (_, index) => ({
      question: `${request.topic} question ${index + 1}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      explanation: `Explanation for ${request.topic} question ${index + 1}`,
    })),
    transformText: async (text, action) => `Transformed (${action}): ${text.slice(0, 40)}`,
    generateMindMap: async (request) => ({
      title: request.topic || "Test Concept",
      children: [
        {
          title: "Major Theme A",
          children: [
            { title: "Detail 1", children: [] },
            { title: "Detail 2", children: [] },
          ],
        },
        {
          title: "Major Theme B",
          children: [
            { title: "Detail 3", children: [] },
          ],
        },
      ],
    }),
  };
}

import { InMemoryRepository } from "../src/repository/databaseRepository.js";
import type { Repository } from "../src/repository/repository.js";

export async function startTestServer(ai?: StudyAi, repository?: Repository): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server: Server = createServer(createApp({
    ai: ai ?? createTestAi(),
    repository: repository ?? new InMemoryRepository(),
  }));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

export async function json(baseUrl: string, path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

export function authHeaders(token: string, jsonBody = false): HeadersInit {
  return {
    authorization: ["Bearer", token].join(" "),
    ...(jsonBody ? { "content-type": "application/json" } : {}),
  };
}

export function signup(baseUrl: string, name: string, email: string) {
  return json(baseUrl, "/api/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password: "student12",
      college: "City Engineering College",
      course: "Computer Science",
    }),
  });
}
