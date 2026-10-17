import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ApiError } from "../src/types.js";
import { GeminiStudyAi } from "../src/services/gemini.js";
import { authHeaders, json, signup, startTestServer } from "./helpers.js";

let baseUrl: string;
let close: () => Promise<void>;

before(async () => {
  ({ baseUrl, close } = await startTestServer());
});

after(async () => close());

test("summary and flashcards run on the server after login", async () => {
  const account = await signup(baseUrl, "Kiran Das", "kiran@college.edu");
  const headers = authHeaders(account.data.token, true);

  const success = await json(baseUrl, "/api/summarize", {
    method: "POST",
    headers,
    body: JSON.stringify({ text: "This text is long enough to receive a sample summary." }),
  });
  assert.equal(success.status, 200);
  assert.equal(success.data.summary, "Summary generated for test.");

  const withOptions = await json(baseUrl, "/api/summarize", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: "This text is long enough to receive a sample summary with custom options.",
      length: "comprehensive",
      difficulty: "advanced",
      style: "bulleted",
    }),
  });
  assert.equal(withOptions.status, 200);
  assert.equal(withOptions.data.summary, "Summary generated for test.");

  const invalid = await json(baseUrl, "/api/summarize", {
    method: "POST",
    headers,
    body: JSON.stringify({ text: "too short" }),
  });
  assert.equal(invalid.status, 400);

  const providerError = await json(baseUrl, "/api/summarize", {
    method: "POST",
    headers,
    body: JSON.stringify({ text: "This text is long enough to reach a provider failure." }),
  });
  assert.equal(providerError.status, 502);

  const cards = await json(baseUrl, "/api/flashcards/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({ topic: "Logic gates", count: 4, difficulty: "medium" }),
  });
  assert.equal(cards.status, 200);
  assert.equal(cards.data.cards.length, 4);

  const chat = await json(baseUrl, "/api/ai/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: "Explain photosynthesis",
      context: "Photosynthesis is the process by which green plants make food.",
    }),
  });
  assert.equal(chat.status, 200);
  assert.equal(chat.data.reply, 'Tutor answer for "Explain photosynthesis"');

  const quiz = await json(baseUrl, "/api/quiz/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({ topic: "Computer Science", count: 3, difficulty: "hard" }),
  });
  assert.equal(quiz.status, 200);
  assert.equal(quiz.data.questions.length, 3);
  assert.equal(quiz.data.questions[0].options.length, 4);

  const transformed = await json(baseUrl, "/api/ai/transform", {
    method: "POST",
    headers,
    body: JSON.stringify({ text: "Photosynthesis converts solar light into chemical energy.", action: "shorten" }),
  });
  assert.equal(transformed.status, 200);
  assert.ok(transformed.data.transformed);

  const mindmap = await json(baseUrl, "/api/mindmap/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({ topic: "Water Conservation", depth: 3 }),
  });
  assert.equal(mindmap.status, 200);
  assert.equal(mindmap.data.mindmap.title, "Water Conservation");
  assert.equal(mindmap.data.mindmap.children.length, 2);
});

test("Gemini AI fails explicitly without a server key", async () => {
  const summarizer = new GeminiStudyAi("");
  await assert.rejects(
    summarizer.summarize("This text is long enough to request a summary."),
    (error: unknown) => error instanceof ApiError &&
      error.statusCode === 503 && error.code === "GEMINI_NOT_CONFIGURED",
  );
});
