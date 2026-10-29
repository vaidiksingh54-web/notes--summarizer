/**
 * CogniStudy AI - Core Application Logic
 * Initializes global navbar, dropdowns, notifications, modal system, toasts, and mobile drawer.
 */

// Global safe Assistant openers
window.openAiAssistant = function(prefillPrompt) {
  let panel = document.getElementById("ai-assistant-panel");
  if (!panel) {
    initAiAssistantWidget();
    panel = document.getElementById("ai-assistant-panel");
  }
  if (panel) {
    panel.classList.add("active");
    const input = document.getElementById("ai-user-input");
    if (input) {
      if (prefillPrompt) input.value = prefillPrompt;
      setTimeout(() => input.focus(), 60);
    }
  }
};

window.toggleAiAssistant = function() {
  const panel = document.getElementById("ai-assistant-panel");
  if (panel && panel.classList.contains("active")) {
    panel.classList.remove("active");
  } else {
    window.openAiAssistant();
  }
};

function bootApp() {
  initNavbar();
  initDropdowns();
  initModals();
  initSidebar();
  initOfflineState();
  syncUserProfileUI();
  initAiAssistantWidget();
  if (window.location.hash === "#assistant") {
    setTimeout(() => window.openAiAssistant(), 250);
  }
  if (window.store && window.store.ready) {
    window.store.ready.then(() => {
      syncUserProfileUI();
      renderNotifications();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}

// Safe Link Opener without window.open
// Universal Clipboard Copy with Fallback
window.copyToClipboard = function(text, successMsg = "Copied to clipboard!") {
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => window.showToast(successMsg, "success"))
      .catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }

  function fallbackCopy(str, msg) {
    try {
      const el = document.createElement("textarea");
      el.value = str;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.top = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      if (ok) {
        window.showToast(msg, "success");
      } else {
        window.showToast("Could not copy text automatically. Please select and copy.", "error");
      }
    } catch (_e) {
      window.showToast("Clipboard copy failed.", "error");
    }
  }
};

window.openSafeExternalLink = function(url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Toast Notification Manager
window.showToast = function(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "✦";
  if (type === "success") icon = "✓";
  if (type === "error") icon = "✕";

  const iconEl = document.createElement("span");
  iconEl.style.fontWeight = "700";
  iconEl.style.fontSize = "1.1rem";
  iconEl.textContent = icon;
  const messageEl = document.createElement("div");
  messageEl.style.flex = "1";
  messageEl.textContent = message;
  toast.append(iconEl, messageEl);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3200);
};

// Modal Manager
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
};

function initModals() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.active").forEach((m) => {
        m.classList.remove("active");
      });
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}

function initNavbar() {
  const notifBtn = document.getElementById("btn-notification");
  const notifPanel = document.getElementById("panel-notification");
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(notifPanel);
      notifPanel.classList.toggle("show");
      renderNotifications();
    });
  }

  const createBtn = document.getElementById("btn-create-nav");
  const createDropdown = document.getElementById("dropdown-create-menu");
  if (createBtn && createDropdown) {
    createBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(createDropdown);
      createDropdown.classList.toggle("show");
    });
  }

  const avatarBtn = document.getElementById("btn-avatar-nav");
  const profileDropdown = document.getElementById("dropdown-profile-menu");
  if (avatarBtn && profileDropdown) {
    avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(profileDropdown);
      profileDropdown.classList.toggle("show");
    });
  }

  const markReadBtn = document.getElementById("btn-mark-all-read");
  if (markReadBtn) {
    markReadBtn.addEventListener("click", async () => {
      try {
        await window.store.markNotificationsRead();
        renderNotifications();
        showToast("All notifications marked as read", "info");
      } catch (error) {
        showToast(error.message || "Unable to update notifications.", "error");
      }
    });
  }

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.store.logout().finally(() => {
        showToast("Signed out.", "info");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 400);
      });
    });
  }
}

function renderNotifications() {
  const list = document.getElementById("notification-list");
  if (!list) return;

  const notifs = window.store.getNotifications();
  const unreadCount = notifs.filter(notification => !notification.read).length;
  const badge = document.querySelector(".nav-badge");
  if (badge) {
    badge.textContent = unreadCount ? String(unreadCount) : "";
    badge.style.display = unreadCount ? "" : "none";
  }
  if (notifs.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-faint); padding: 18px;">No new notifications</div>`;
    return;
  }

  list.replaceChildren(...notifs.map(n => {
    const card = document.createElement("div");
    card.style.cssText = `padding: 10px 12px; border-radius: var(--radius-sm); margin-bottom: 6px; background: ${n.read ? "transparent" : "rgba(99, 102, 241, 0.08)"}; border-left: 3px solid ${n.read ? "transparent" : "var(--accent-cyan)"};`;
    const heading = document.createElement("div");
    heading.style.cssText = "display:flex; justify-content:space-between; font-size:.85rem; font-weight:600; color:#fff;";
    const title = document.createElement("span");
    title.textContent = n.title;
    const time = document.createElement("span");
    time.style.cssText = "font-size:.72rem; color:var(--text-faint);";
    time.textContent = n.time;
    const message = document.createElement("div");
    message.style.cssText = "font-size:.8rem; color:var(--text-muted); margin-top:3px;";
    message.textContent = n.message;
    heading.append(title, time);
    card.append(heading, message);
    return card;
  }));
}

function initDropdowns() {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-dropdown") && !e.target.closest(".three-dot-wrapper")) {
      closeAllDropdowns();
    }
  });

  document.querySelectorAll("[data-dropdown-toggle]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = btn.getAttribute("data-dropdown-toggle");
      const targetMenu = document.getElementById(targetId);
      if (targetMenu) {
        const isShown = targetMenu.classList.contains("show");
        closeAllDropdowns();
        if (!isShown) targetMenu.classList.add("show");
      }
    });
  });
}

function closeAllDropdowns(exceptElement = null) {
  document.querySelectorAll(".dropdown-menu, .three-dot-menu").forEach(el => {
    if (el !== exceptElement) {
      el.classList.remove("show");
    }
  });
}

function initSidebar() {
  const toggleBtn = document.getElementById("mobile-sidebar-toggle");
  const sidebar = document.getElementById("app-sidebar");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.addEventListener("click", () => {
        if (sidebar.classList.contains("mobile-open")) {
          sidebar.classList.remove("mobile-open");
        }
      });
    }
  }
}

function initOfflineState() {
  let banner = document.querySelector(".offline-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "offline-banner";
    banner.textContent = "You are currently offline. Local cache active; server sync is paused.";
    const nav = document.querySelector(".app-navbar");
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(banner, nav.nextSibling);
    }
  }
  if (!navigator.onLine) {
    banner.classList.add("active");
  }
}

function syncUserProfileUI() {
  const user = window.store.getUser();
  document.querySelectorAll(".user-name-display").forEach(el => el.textContent = user.name || "Student");
  document.querySelectorAll(".user-email-display").forEach(el => el.textContent = user.email || "");
  document.querySelectorAll(".user-college-display").forEach(el => el.textContent = user.college || "");
  document.querySelectorAll(".user-course-display").forEach(el => el.textContent = user.course || "");
  document.querySelectorAll(".user-avatar-display").forEach(el => el.textContent = user.avatar || "ST");
}

function initAiAssistantWidget() {
  if (document.getElementById("ai-assistant-root")) return;

  const root = document.createElement("div");
  root.id = "ai-assistant-root";
  root.innerHTML = `
    <button class="ai-assistant-trigger" id="ai-assistant-toggle-btn" aria-label="Open AI Study Assistant">
      <span class="sparkle-icon">✦</span>
      <span>AI Study Tutor</span>
    </button>

    <div class="ai-assistant-panel" id="ai-assistant-panel" role="dialog" aria-labelledby="ai-panel-title">
      <div class="ai-panel-header">
        <div class="ai-panel-title-wrap">
          <div class="ai-panel-avatar">✦</div>
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;" id="ai-panel-title">CogniStudy AI Tutor</div>
            <div style="font-size: 0.72rem; color: #34d399; display: flex; align-items: center; gap: 4px;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#34d399;"></span>
              Powered by Gemini 3.8 Flash
            </div>
          </div>
        </div>
        <div class="ai-panel-header-actions">
          <button class="ai-icon-btn" id="ai-btn-clear" title="Clear chat history">🧹</button>
          <button class="ai-icon-btn" id="ai-btn-close" title="Minimize assistant">✕</button>
        </div>
      </div>

      <div class="ai-panel-context-bar" id="ai-context-banner" style="display: none;">
        <span>📝 Connected to current study notes</span>
        <button class="ai-msg-action-btn" id="ai-btn-summarize-context" style="color: var(--accent-cyan);">⚡ Summarize Now</button>
      </div>

      <div class="ai-panel-quickchips">
        <button class="ai-chip" data-ai-prompt="Please summarize the key ideas and core takeaways into concise bullet points.">📝 Summarize Notes</button>
        <button class="ai-chip" data-ai-prompt="Explain this concept in simple, intuitive terms with a real-world analogy (ELI5).">💡 Explain Simply</button>
        <button class="ai-chip" data-ai-prompt="Create 3 high-yield active-recall quiz questions based on this material with answers.">🧠 3 Practice Questions</button>
        <button class="ai-chip" data-ai-prompt="Highlight the most crucial definitions, high-yield formulas, and exam tips.">🎯 Exam Key Points</button>
      </div>

      <div class="ai-messages-container" id="ai-messages-box">
        <div class="ai-message assistant">
          <p><strong>Hi there! 🎓</strong></p>
          <p>I'm your embedded CogniStudy AI Tutor. I can help you:</p>
          <ul>
            <li><strong>Summarize lengthy notes</strong> and lecture transcripts</li>
            <li><strong>Clarify complex terms</strong> and difficult concepts</li>
            <li><strong>Generate instant flashcard questions</strong> and test your knowledge</li>
          </ul>
          <p style="font-size: 0.8rem; color: var(--text-faint); margin-top: 4px;">Type below or tap a quick action chip to start!</p>
        </div>
      </div>

      <form class="ai-input-area" id="ai-chat-form">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label class="ai-context-toggle">
            <input type="checkbox" id="ai-check-attach-context" checked>
            <span>Attach notes context</span>
          </label>
          <span style="font-size: 0.72rem; color: var(--text-faint);">Shift+Enter for newline</span>
        </div>
        <div class="ai-input-row">
          <textarea
            id="ai-user-input"
            class="ai-input-field"
            placeholder="Ask AI tutor, e.g. 'Summarize this chapter'..."
            rows="1"
          ></textarea>
          <button type="submit" class="ai-send-btn" id="ai-btn-send" title="Send question">
            ➤
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const toggleBtn = document.getElementById("ai-assistant-toggle-btn");
  const panel = document.getElementById("ai-assistant-panel");
  const closeBtn = document.getElementById("ai-btn-close");
  const clearBtn = document.getElementById("ai-btn-clear");
  const form = document.getElementById("ai-chat-form");
  const input = document.getElementById("ai-user-input");
  const sendBtn = document.getElementById("ai-btn-send");
  const messagesBox = document.getElementById("ai-messages-box");
  const contextBanner = document.getElementById("ai-context-banner");
  const summarizeContextBtn = document.getElementById("ai-btn-summarize-context");
  const attachContextCheck = document.getElementById("ai-check-attach-context");

  let conversationHistory = [];

  function getAvailableNotesText() {
    if (typeof window.getCurrentNoteContent === "function") {
      const text = window.getCurrentNoteContent();
      if (text && text.length > 20) return text;
    }
    const notesInput = document.getElementById("notes-source-input");
    if (notesInput && notesInput.value.trim().length > 20) {
      return notesInput.value.trim();
    }
    const editor = document.getElementById("notes-editor-content");
    if (editor && editor.innerText.trim().length > 20) {
      return editor.innerText.trim();
    }
    return "";
  }

  function checkContextAvailability() {
    const notes = getAvailableNotesText();
    if (notes) {
      contextBanner.style.display = "flex";
    } else {
      contextBanner.style.display = "none";
    }
  }

  toggleBtn.addEventListener("click", () => {
    panel.classList.toggle("active");
    if (panel.classList.contains("active")) {
      checkContextAvailability();
      input.focus();
    }
  });

  document.querySelectorAll(".nav-link-assistant, .sidebar-item-assistant, [data-open-assistant]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      panel.classList.add("active");
      checkContextAvailability();
      input?.focus();
    });
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.remove("active");
  });

  clearBtn.addEventListener("click", () => {
    conversationHistory = [];
    messagesBox.innerHTML = `
      <div class="ai-message assistant">
        <p>Chat cleared! Ready for your next study questions or notes to summarize.</p>
      </div>
    `;
    if (typeof window.showToast === "function") {
      window.showToast("Chat history cleared.", "info");
    }
  });

  document.querySelectorAll(".ai-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-ai-prompt");
      if (prompt) {
        input.value = prompt;
        sendMessage();
      }
    });
  });

  summarizeContextBtn.addEventListener("click", () => {
    input.value = "Please summarize these notes thoroughly with main definitions, core principles, and bullet points.";
    sendMessage();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.style.height = "auto";
    appendUserMessage(text);

    let context = "";
    if (attachContextCheck.checked) {
      context = getAvailableNotesText();
    }

    const typingEl = showTypingIndicator();
    sendBtn.disabled = true;

    try {

      const reply = await window.store.askAssistant(text, context, conversationHistory);
      removeTypingIndicator(typingEl);
      appendAssistantMessage(reply);

      conversationHistory.push({ role: "user", content: text });
      conversationHistory.push({ role: "assistant", content: reply });
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
    } catch (error) {
      removeTypingIndicator(typingEl);
      appendAssistantMessage(`⚠️ **AI Assistant:** ${error.message || "Failed to contact AI service."}`);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function appendUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "ai-message user";
    msg.textContent = text;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function appendAssistantMessage(text) {
    const msg = document.createElement("div");
    msg.className = "ai-message assistant";
    msg.innerHTML = formatMarkdown(text);

    const footer = document.createElement("div");
    footer.className = "ai-message-footer";

    const copyBtn = document.createElement("button");
    copyBtn.className = "ai-msg-action-btn";
    copyBtn.innerHTML = "📋 Copy";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "✓ Copied!";
        setTimeout(() => { copyBtn.innerHTML = "📋 Copy"; }, 1800);
      });
    };
    footer.appendChild(copyBtn);

    if (typeof window.insertIntoNoteEditor === "function") {
      const insertBtn = document.createElement("button");
      insertBtn.className = "ai-msg-action-btn";
      insertBtn.style.color = "var(--accent-cyan)";
      insertBtn.innerHTML = "📝 Insert into Notes ↗";
      insertBtn.onclick = () => {
        window.insertIntoNoteEditor(text);
      };
      footer.appendChild(insertBtn);
    }

    msg.appendChild(footer);
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function showTypingIndicator() {
    const el = document.createElement("div");
    el.className = "ai-typing-indicator";
    el.innerHTML = '<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>';
    messagesBox.appendChild(el);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return el;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  function formatMarkdown(raw) {
    const escaped = raw.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);

    return escaped
      .replace(/^### (.*$)/gim, '<h4 style="font-size:0.95rem; font-weight:700; color:#fff; margin:8px 0 4px;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="font-size:1.02rem; font-weight:700; color:#fff; margin:10px 0 6px;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#fff;">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code style="background:rgba(255,255,255,0.12); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.82rem;">$1</code>')
      .replace(/^\s*[-•*]\s+(.*)$/gim, '<li style="margin-left:14px;">$1</li>')
      .replace(/(<li>.*<\/li>)/gims, '<ul style="margin:6px 0;">$1</ul>')
      .replace(/\n\n+/g, '</p><p style="margin-top:6px;">')
      .replace(/\n/g, '<br>');
  }
}

