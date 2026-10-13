import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { authHeaders, json, signup, startTestServer } from "./helpers.js";

let baseUrl: string;
let close: () => Promise<void>;

before(async () => {
  ({ baseUrl, close } = await startTestServer());
});

after(async () => close());

test("study items are private to their owner and support updates and deletion", async () => {
  const first = await signup(baseUrl, "Riya Sharma", "riya@college.edu");
  const item = {
    id: "note-riya",
    type: "note",
    title: "My notes",
    category: "General",
    date: "Today",
    progress: 100,
    isFavorite: false,
    content: "<p>Private</p>",
  };
  const created = await json(baseUrl, "/api/items", {
    method: "POST",
    headers: authHeaders(first.data.token, true),
    body: JSON.stringify(item),
  });
  assert.equal(created.status, 201);

  const second = await signup(baseUrl, "Aman Patel", "aman@college.edu");
  const otherItems = await json(baseUrl, "/api/items", { headers: authHeaders(second.data.token) });
  assert.deepEqual(otherItems.data.items, []);
  assert.equal((await json(baseUrl, "/api/items/note-riya", {
    headers: authHeaders(second.data.token),
  })).status, 404);

  const favorite = await json(baseUrl, "/api/items/note-riya/favorite", {
    method: "PATCH",
    headers: authHeaders(first.data.token, true),
    body: JSON.stringify({ isFavorite: true }),
  });
  assert.equal(favorite.status, 200);
  assert.equal(favorite.data.item.isFavorite, true);

  const duplicate = await json(baseUrl, "/api/items", {
    method: "POST",
    headers: authHeaders(first.data.token, true),
    body: JSON.stringify(item),
  });
  assert.equal(duplicate.status, 409);

  assert.equal((await json(baseUrl, "/api/items/note-riya", {
    method: "DELETE",
    headers: authHeaders(first.data.token),
  })).status, 204);
  assert.equal((await json(baseUrl, "/api/items/note-riya", {
    headers: authHeaders(first.data.token),
  })).status, 404);
});
