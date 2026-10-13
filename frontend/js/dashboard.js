/**
 * CogniStudy AI - Dashboard View Logic
 */

document.addEventListener("DOMContentLoaded", async () => {
  await window.store.ready;
  renderDashboardStats();
  renderRecentActivity();
  initCalendarPlannerWidget();
  document.getElementById("dashboard-recent-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-activity-action]");
    if (!button) return;
    const activity = window.store.getActivities().find(item => item.id === button.dataset.id);
    if (!activity) return;
    if (button.dataset.activityAction === "open") window.openItemFromActivity(activity.title, activity.type);
    if (button.dataset.activityAction === "calendar") window.scheduleActivityInCalendar(activity.title);
    if (button.dataset.activityAction === "dismiss") await window.removeActivity(activity.id);
  });
});

function renderDashboardStats() {
  const stats = window.store.getStats();
  const notesCountEl = document.getElementById("stat-notes-count");
  const flashcardsCountEl = document.getElementById("stat-flashcards-count");
  const quizzesCountEl = document.getElementById("stat-quizzes-count");
  const progressEl = document.getElementById("stat-progress-pct");

  if (notesCountEl) notesCountEl.textContent = stats.notesCount;
  if (flashcardsCountEl) flashcardsCountEl.textContent = stats.flashcardsCount;
  if (quizzesCountEl) quizzesCountEl.textContent = stats.quizzesCount;
  if (progressEl) progressEl.textContent = `${stats.studyProgress}%`;
}

function renderRecentActivity() {
  const container = document.getElementById("dashboard-recent-list");
  if (!container) return;

  const activities = window.store.getActivities();
  if (activities.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-faint); padding: 32px;">No study activity yet. Try generating your first notes!</div>`;
    return;
  }

  container.innerHTML = activities.map((act) => `
    <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(99, 102, 241, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
          ${escapeHtml(act.icon || "📝")}
        </div>
        <div>
          <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${escapeHtml(act.title)}</div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--text-faint); margin-top: 2px;">
            <span>${escapeHtml(act.type)}</span>
            <span>•</span>
            <span>${escapeHtml(act.score)}</span>
            <span>•</span>
            <span>${escapeHtml(act.date)}</span>
          </div>
        </div>
      </div>
      
      <div class="three-dot-wrapper">
        <button class="three-dot-btn" data-activity-title="${escapeHtml(act.title)}" aria-label="Options">⋮</button>
        <div class="three-dot-menu">
          <button class="three-dot-item" data-activity-action="open" data-id="${escapeHtml(act.id)}">
            <span>↗</span> Open
          </button>
          <button class="three-dot-item" data-activity-action="calendar" data-id="${escapeHtml(act.id)}">
            <span>📅</span> Add to Google Calendar
          </button>
          <button class="three-dot-item danger" data-activity-action="dismiss" data-id="${escapeHtml(act.id)}">
            <span>🗑</span> Dismiss
          </button>
        </div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".three-dot-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      const isShown = menu.classList.contains("show");
      document.querySelectorAll(".three-dot-menu").forEach(m => m.classList.remove("show"));
      if (!isShown) menu.classList.add("show");
    });
  });
}

window.openItemFromActivity = function(title, type) {
  const items = window.store.getItems();
  const match = items.find(i => i.title.toLowerCase().includes(title.toLowerCase()));
  if (match) {
    if (match.type === "note") window.location.href = `notes.html?id=${match.id}`;
    else if (match.type === "flashcards") window.location.href = `flashcards.html?id=${match.id}`;
    else if (match.type === "quiz") window.location.href = `quiz.html?id=${match.id}`;
  } else {
    window.location.href = "library.html";
  }
};

window.scheduleActivityInCalendar = function(title) {
  const url = window.store.generateGoogleCalendarUrl(title, "Scheduled revision session with CogniStudy AI", 45);
  window.openSafeExternalLink(url);
  window.showToast("Opening Google Calendar...", "info");
};

window.removeActivity = function(id) {
  return window.store.deleteActivity(id).then(() => {
    renderRecentActivity();
    window.showToast("Activity removed from history.", "info");
  }).catch(error => window.showToast(error.message || "Unable to remove activity.", "error"));
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function initCalendarPlannerWidget() {
  const syncBtn = document.getElementById("btn-sync-study-calendar");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      const url = window.store.generateGoogleCalendarUrl("CogniStudy Daily Revision Block", "Daily 45-minute focus session for active recall and quiz testing.", 45);
      window.openSafeExternalLink(url);
      window.showToast("Exporting study block to Google Calendar...", "info");
    });
  }
}
