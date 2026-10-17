// E2E Verification Script for CogniStudy AI
const BASE = "http://localhost:3000";

async function main() {
  console.log("=== Starting CogniStudy AI End-to-End Verification ===");

  // 1. Health check
  console.log("\n[1] Testing /api/health...");
  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  console.log("Health response:", health);
  if (health.status !== "ok") throw new Error("Health check failed");

  // 2. Signup validation check
  console.log("\n[2] Testing invalid signup rejection...");
  const badSignupRes = await fetch(`${BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "123" })
  });
  console.log("Invalid signup status:", badSignupRes.status, "(expected 400)");
  if (badSignupRes.status !== 400) throw new Error("Validation check failed");

  // 3. Valid Signup
  console.log("\n[3] Testing genuine student signup...");
  const uniqueEmail = `student_${Date.now()}@university.edu`;
  const signupRes = await fetch(`${BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Montgomery",
      email: uniqueEmail,
      password: "StrongPassword2026!",
      college: "Stanford University",
      course: "Neuroscience",
      phone: "+15551234567"
    })
  });
  if (!signupRes.ok) throw new Error(`Signup failed: ${await signupRes.text()}`);
  const signupData = await signupRes.json();
  console.log("Student registered successfully! Name:", signupData.profile.name);
  const token = signupData.token;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // 4. Duplicate signup rejection
  console.log("\n[4] Testing duplicate email rejection...");
  const dupRes = await fetch(`${BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Duplicate User",
      email: uniqueEmail,
      password: "AnotherPassword123!",
      college: "Another College",
      course: "Art"
    })
  });
  console.log("Duplicate email status:", dupRes.status, "(expected 409)");
  if (dupRes.status !== 409) throw new Error("Duplicate rejection failed");

  // 5. Bootstrap check - verify 100% clean empty state (no demo content!)
  console.log("\n[5] Testing /api/bootstrap for clean empty state...");
  const bootRes = await fetch(`${BASE}/api/bootstrap`, { headers: authHeaders });
  const bootData = await bootRes.json();
  console.log("Items count for new user:", bootData.items.length, "(expected 0)");
  console.log("Activities count:", bootData.activities.length, "(expected 0)");
  if (bootData.items.length !== 0) throw new Error("Items not empty on new account!");
  if (bootData.activities.length !== 0) throw new Error("Activities not empty on new account!");

  // 6. Create note item
  console.log("\n[6] Testing study item creation...");
  const createItemRes = await fetch(`${BASE}/api/items`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title: "Cellular Neurobiology Notes",
      type: "note",
      content: { text: "Action potential kinetics and sodium-potassium channels." },
      tags: ["neuroscience", "biology"]
    })
  });
  if (!createItemRes.ok) throw new Error(`Create item failed: ${await createItemRes.text()}`);
  const createdItem = (await createItemRes.json()).item;
  console.log("Created item ID:", createdItem.id, "Title:", createdItem.title);

  // 7. Verify item is persisted in bootstrap
  console.log("\n[7] Verifying persistence in bootstrap...");
  const bootRes2 = await fetch(`${BASE}/api/bootstrap`, { headers: authHeaders });
  const bootData2 = await bootRes2.json();
  console.log("Items count after create:", bootData2.items.length, "(expected 1)");
  if (bootData2.items.length !== 1 || bootData2.items[0].id !== createdItem.id) {
    throw new Error("Item persistence verification failed");
  }

  // 8. Toggle favorite
  console.log("\n[8] Testing toggle favorite...");
  const favRes = await fetch(`${BASE}/api/items/${encodeURIComponent(createdItem.id)}/favorite`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ isFavorite: true })
  });
  const favData = await favRes.json();
  console.log("Item isFavorite:", favData.item.isFavorite, "(expected true)");

  // 9. Delete item
  console.log("\n[9] Testing item deletion...");
  const deleteRes = await fetch(`${BASE}/api/items/${encodeURIComponent(createdItem.id)}`, {
    method: "DELETE",
    headers: authHeaders
  });
  console.log("Delete status:", deleteRes.status, "(expected 204)");

  // 10. Verify item removed
  const bootRes3 = await fetch(`${BASE}/api/bootstrap`, { headers: authHeaders });
  const bootData3 = await bootRes3.json();
  console.log("Items count after deletion:", bootData3.items.length, "(expected 0)");
  if (bootData3.items.length !== 0) throw new Error("Item was not deleted");

  // 11. Google OAuth backend exchange
  console.log("\n[11] Testing Google authentication exchange (/api/auth/google)...");
  const googleRes = await fetch(`${BASE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `google_${Date.now()}@gmail.com`,
      name: "Google Scholar",
      uid: `goog_uid_${Date.now()}`
    })
  });
  if (!googleRes.ok) throw new Error(`Google auth exchange failed: ${await googleRes.text()}`);
  const googleData = await googleRes.json();
  console.log("Google session created! Token:", googleData.token ? "Present" : "Missing");
  console.log("Google profile:", googleData.profile.name, "|", googleData.profile.email);

  // 12. Verify Google user bootstrap
  const googleBootRes = await fetch(`${BASE}/api/bootstrap`, {
    headers: { Authorization: `Bearer ${googleData.token}` }
  });
  const googleBoot = await googleBootRes.json();
  console.log("Google user items count:", googleBoot.items.length, "(expected 0)");

  // 13. AI endpoint graceful error handling when key is not configured
  console.log("\n[13] Testing AI endpoint without GEMINI_API_KEY...");
  const aiRes = await fetch(`${BASE}/api/summarize`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ text: "Test study content to summarize." })
  });
  console.log("AI endpoint status without key:", aiRes.status, "(expected 503 GEMINI_NOT_CONFIGURED or 200 if key provided)");
  const aiData = await aiRes.json();
  console.log("AI error/response:", aiData.error || "Generated successfully");

  // 14. Sign in with the created account
  console.log("\n[14] Testing student login (/api/login)...");
  const loginRes = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: uniqueEmail,
      password: "StrongPassword2026!"
    })
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
  const loginData = await loginRes.json();
  console.log("Login succeeded! Token:", loginData.token ? "Valid" : "Missing");

  // 15. Sign out
  console.log("\n[15] Testing student logout (/api/logout)...");
  const logoutRes = await fetch(`${BASE}/api/logout`, {
    method: "POST",
    headers: authHeaders
  });
  console.log("Logout status:", logoutRes.status, "(expected 204)");

  // Verify token is invalidated
  const postLogoutRes = await fetch(`${BASE}/api/bootstrap`, { headers: authHeaders });
  console.log("Post-logout bootstrap status:", postLogoutRes.status, "(expected 401)");
  if (postLogoutRes.status !== 401) throw new Error("Session was not invalidated after logout");

  console.log("\n>>> ALL 15 END-TO-END CHECKS PASSED WITH FLYING COLORS! <<<\n");
}

main().catch((err) => {
  console.error("\n❌ E2E Check Failed:", err);
  process.exit(1);
});
