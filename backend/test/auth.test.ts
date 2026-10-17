import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { authHeaders, json, signup, startTestServer } from "./helpers.js";

let baseUrl: string;
let close: () => Promise<void>;

before(async () => {
  ({ baseUrl, close } = await startTestServer());
});

after(async () => close());

test("health is public and protected endpoints require a session", async () => {
  const health = await json(baseUrl, "/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.data.storage, "in-memory-per-student");
  assert.equal((await json(baseUrl, "/api/bootstrap")).status, 401);
});

test("students can sign up, log in, and log out", async () => {
  const created = await signup(baseUrl, "Riya Sharma", "riya@college.edu");
  assert.equal(created.status, 201);
  assert.equal(created.data.profile.name, "Riya Sharma");
  assert.equal(created.data.profile.college, "City Engineering College");

  const duplicate = await signup(baseUrl, "Riya Sharma", "riya@college.edu");
  assert.equal(duplicate.status, 409);

  const badLogin = await json(baseUrl, "/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "riya@college.edu", password: "wrongpass" }),
  });
  assert.equal(badLogin.status, 401);

  const login = await json(baseUrl, "/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "RIYA@COLLEGE.EDU", password: "student12" }),
  });
  assert.equal(login.status, 200);
  assert.equal((await json(baseUrl, "/api/bootstrap", { headers: authHeaders(login.data.token) })).status, 200);

  const logout = await json(baseUrl, "/api/logout", {
    method: "POST",
    headers: authHeaders(login.data.token),
  });
  assert.equal(logout.status, 204);
  assert.equal((await json(baseUrl, "/api/bootstrap", { headers: authHeaders(login.data.token) })).status, 401);
});

test("google authentication creates student account and supports firebase tokens", async () => {
  const googleAuth = await json(baseUrl, "/api/auth/google", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "sam@google.com",
      name: "Sam Altman",
      uid: "google-uid-12345",
    }),
  });
  assert.equal(googleAuth.status, 200);
  assert.ok(googleAuth.data.token);
  assert.equal(googleAuth.data.profile.email, "sam@google.com");

  // Verify access with the generated session token
  const bootstrap = await json(baseUrl, "/api/bootstrap", {
    headers: authHeaders(googleAuth.data.token),
  });
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.data.profile.name, "Sam Altman");

  // Verify direct firebase_ token access
  const directFb = await json(baseUrl, "/api/bootstrap", {
    headers: authHeaders("firebase_uid98765"),
  });
  assert.equal(directFb.status, 200);
  assert.ok(directFb.data.profile);
});

