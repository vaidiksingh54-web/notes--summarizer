/**
 * CogniStudy AI - Profile Management
 */

document.addEventListener("DOMContentLoaded", async () => {
  initBackendConnectionCard();
  initEditProfileModal();
  await window.store.ready;
  renderProfileDetails();
});

function renderProfileDetails() {
  const user = window.store.getUser();
  const stats = window.store.getStats();

  const nameEl = document.getElementById("profile-name-text");
  const emailEl = document.getElementById("profile-email-text");
  const phoneEl = document.getElementById("profile-phone-text");
  const collegeEl = document.getElementById("profile-college-text");
  const courseEl = document.getElementById("profile-course-text");
  const bioEl = document.getElementById("profile-bio-text");
  const avatarEl = document.getElementById("profile-avatar-circle");

  if (nameEl) nameEl.textContent = user.name || "Student";
  if (emailEl) emailEl.textContent = user.email || "";
  if (phoneEl) phoneEl.textContent = user.phone || "Not added";
  if (collegeEl) collegeEl.textContent = user.college || "Your college";
  if (courseEl) courseEl.textContent = user.course || "Your course";
  if (bioEl) bioEl.textContent = user.bio || "Student.";
  if (avatarEl) avatarEl.textContent = user.avatar || "ST";

  const notesEl = document.getElementById("profile-stat-notes");
  const fcEl = document.getElementById("profile-stat-fc");
  const quizEl = document.getElementById("profile-stat-quiz");
  
  if (notesEl) notesEl.textContent = stats.notesCount;
  if (fcEl) fcEl.textContent = stats.flashcardsCount;
  if (quizEl) quizEl.textContent = stats.quizzesCount;
}

function initEditProfileModal() {
  const signoutBtn = document.getElementById("btn-profile-signout") || document.getElementById("btn-end-demo-session");
  signoutBtn?.addEventListener("click", () => {
    window.store.logout().finally(() => {
      window.showToast("Signed out.", "info");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 400);
    });
  });

  const editBtn = document.getElementById("btn-open-edit-profile");
  const saveBtn = document.getElementById("btn-save-profile-modal");

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const user = window.store.getUser();
      document.getElementById("edit-name-input").value = user.name || "";
      document.getElementById("edit-email-input").value = user.email || "";
      document.getElementById("edit-phone-input").value = user.phone || "";
      document.getElementById("edit-college-input").value = user.college || "";
      document.getElementById("edit-course-input").value = user.course || "";
      document.getElementById("edit-bio-input").value = user.bio || "";
      window.openModal("modal-edit-profile");
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const name = document.getElementById("edit-name-input").value.trim();
      const email = document.getElementById("edit-email-input").value.trim();
      const phone = document.getElementById("edit-phone-input").value.trim();
      const college = document.getElementById("edit-college-input").value.trim();
      const course = document.getElementById("edit-course-input").value.trim();
      const bio = document.getElementById("edit-bio-input").value.trim();

      if (!name || !email) {
        window.showToast("Name and email are required!", "error");
        return;
      }

      const initials = name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "ST";

      saveBtn.disabled = true;
      try {
        await window.store.saveProfile({
          ...window.store.getUser(), name, email, phone, college, course, bio, avatar: initials
        });
        window.closeModal("modal-edit-profile");
        renderProfileDetails();
        document.querySelectorAll(".user-name-display").forEach(el => el.textContent = name);
        document.querySelectorAll(".user-email-display").forEach(el => el.textContent = email);
        document.querySelectorAll(".user-avatar-display").forEach(el => el.textContent = initials);
        window.showToast("Profile updated.", "success");
      } catch (error) {
        window.showToast(error.message || "Unable to update profile.", "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
}


function initBackendConnectionCard() {
  const input = document.getElementById("input-backend-url");
  const badge = document.getElementById("backend-status-badge");
  const saveBtn = document.getElementById("btn-save-backend-url");
  const testBtn = document.getElementById("btn-test-backend-url");
  const resetBtn = document.getElementById("btn-reset-backend-url");
  const resultDiv = document.getElementById("backend-test-result");

  if (!input) return;

  const savedUrl = localStorage.getItem("cogni_api_url") || window.COGNISTUDY_API_URL || "";
  input.value = savedUrl;

  async function checkHealth(url) {
    if (badge) {
      badge.className = "badge badge-cyan";
      badge.textContent = "Checking...";
    }
    try {
      const cleanUrl = (url || "").trim().replace(/\/+$/, "");
      const endpoint = cleanUrl ? `${cleanUrl}/api/health` : "/api/health";
      const res = await fetch(endpoint, { method: "GET", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) throw new Error("Static server");
      const data = await res.json();
      if (badge) {
        badge.className = "badge badge-green";
        badge.style.background = "rgba(34, 197, 94, 0.2)";
        badge.style.color = "#22c55e";
        badge.textContent = "Online & Connected";
      }
      return data;
    } catch (_err) {
      if (badge) {
        badge.className = "badge badge-gray";
        badge.style.background = "";
        badge.style.color = "";
        badge.textContent = url ? "Offline / Unreachable" : "Local Cache Mode";
      }
      return null;
    }
  }

  checkHealth(savedUrl);

  testBtn?.addEventListener("click", async () => {
    const url = input.value.trim();
    testBtn.disabled = true;
    testBtn.textContent = "Pinging...";
    if (resultDiv) {
      resultDiv.style.display = "block";
      resultDiv.style.color = "var(--text-muted)";
      resultDiv.innerHTML = "Connecting to backend API...";
    }
    const health = await checkHealth(url);
    testBtn.disabled = false;
    testBtn.textContent = "Test Live API";
    if (health) {
      if (resultDiv) {
        resultDiv.style.color = "#22c55e";
        resultDiv.innerHTML = `✓ Backend online! Storage: <strong>${health.storage}</strong> • Gemini AI: <strong>${health.geminiConfigured ? "Configured" : "Not Set"}</strong>`;
      }
      window.showToast("Backend connection verified!", "success");
    } else {
      if (resultDiv) {
        resultDiv.style.color = "#ef4444";
        resultDiv.innerHTML = url
          ? `✕ Could not reach ${url}. Verify the backend server URL is active.`
          : `✕ Integrated API not detected on this origin (running in local cache mode).`;
      }
      window.showToast("Backend API not reachable.", "error");
    }
  });

  saveBtn?.addEventListener("click", async () => {
    const url = input.value.trim().replace(/\/+$/, "");
    if (url) {
      localStorage.setItem("cogni_api_url", url);
    } else {
      localStorage.removeItem("cogni_api_url");
    }
    window.COGNISTUDY_API_URL = url;
    window.showToast("Backend configuration saved!", "success");
    await checkHealth(url);
    if (window.store) {
      await window.store.loadFromApi();
      renderProfileDetails();
    }
  });

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem("cogni_api_url");
    window.COGNISTUDY_API_URL = "";
    input.value = "";
    checkHealth("");
    if (resultDiv) resultDiv.style.display = "none";
    window.showToast("Backend URL reset to integrated server.", "info");
  });
}
