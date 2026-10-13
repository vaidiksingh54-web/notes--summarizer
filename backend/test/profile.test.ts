import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { authHeaders, json, signup, startTestServer } from "./helpers.js";

let baseUrl: string;
let close: () => Promise<void>;

before(async () => {
  ({ baseUrl, close } = await startTestServer());
});

after(async () => close());

test("students can update profiles and manage personal activity and notifications", async () => {
  const account = await signup(baseUrl, "Riya Sharma", "riya@college.edu");
  const headers = authHeaders(account.data.token, true);

  const profile = await json(baseUrl, "/api/profile", { headers });
  assert.equal(profile.status, 200);
  assert.equal(profile.data.profile.email, "riya@college.edu");

  const updated = await json(baseUrl, "/api/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      ...profile.data.profile,
      name: "Riya S.",
      bio: "Computer science student.",
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.profile.name, "Riya S.");

  const activity = await json(baseUrl, "/api/activities", {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "Completed notes", type: "note", score: "100%", icon: "book" }),
  });
  assert.equal(activity.status, 201);
  const activities = await json(baseUrl, "/api/activities", { headers });
  assert.equal(activities.data.activities.length, 1);

  const notifications = await json(baseUrl, "/api/notifications", { headers });
  assert.equal(notifications.data.notifications[0].read, false);
  const markedRead = await json(baseUrl, "/api/notifications/read", { method: "PATCH", headers });
  assert.equal(markedRead.data.notifications[0].read, true);

  assert.equal((await json(baseUrl, `/api/activities/${activity.data.activity.id}`, {
    method: "DELETE",
    headers,
  })).status, 204);
});
