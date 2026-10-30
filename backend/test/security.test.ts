import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { securityHeaders, createRateLimiter } from "../src/middleware/security.js";

test("securityHeaders sets protective HTTP headers", async () => {
  const app = express();
  app.use(securityHeaders);
  app.get("/test", (_req, res) => res.json({ ok: true }));

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/test`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("createRateLimiter blocks requests exceeding threshold and returns 429", async () => {
  const app = express();
  const limiter = createRateLimiter({
    windowMs: 1000,
    max: 2,
    message: "Rate limit reached.",
    skipInTests: false,
  });
  app.use("/limited", limiter);
  app.get("/limited", (_req, res) => res.json({ ok: true }));

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;

  try {
    const res1 = await fetch(`http://127.0.0.1:${port}/limited`);
    assert.equal(res1.status, 200);

    const res2 = await fetch(`http://127.0.0.1:${port}/limited`);
    assert.equal(res2.status, 200);

    const res3 = await fetch(`http://127.0.0.1:${port}/limited`);
    assert.equal(res3.status, 429);
    assert.ok(res3.headers.get("retry-after"));
    const data = await res3.json();
    assert.equal(data.code, "RATE_LIMITED");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

