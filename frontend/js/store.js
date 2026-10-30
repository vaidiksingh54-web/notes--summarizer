/**
 * CogniStudy AI - Student session, persistent study cache, and API store
 */

const TOKEN_KEY = "cogni_session_token";
const USER_CACHE_KEY = "cogni_cached_user";
const ITEMS_CACHE_KEY = "cogni_cached_items";
const ACTIVITIES_CACHE_KEY = "cogni_cached_activities";
const NOTIFS_CACHE_KEY = "cogni_cached_notifications";
const LOCAL_REGISTRY_KEY = "cogni_local_registry";

const memoryStorage = new Map();

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_e) {
    return memoryStorage.get(key) ?? null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_e) {
    memoryStorage.set(key, String(value));
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (_e) {
    memoryStorage.delete(key);
  }
}

function safeReadJson(key, fallback) {
  const raw = safeGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
}

const EMPTY_USER = {
  name: "Student",
  email: "",
  phone: "",
  college: "",
  course: "",
  age: 18,
  bio: "",
  avatar: "ST",
  isLoggedIn: false
};

// Clear stale legacy Render URL override if saved from older builds
(function cleanupLegacyApiUrl() {
  const saved = safeGet("cogni_api_url");
  if (saved && saved.includes("notes-summarizer-tpa1.onrender.com")) {
    safeRemove("cogni_api_url");
  }
})();

function currentPage() {
  if (typeof window === "undefined" || !window.location) return "index";
  const clean = window.location.pathname.replace(/\/+$/, "");
  const segment = (clean.split("/").pop() || "index").toLowerCase();
  return segment.replace(/\.html$/i, "");
}

function getApiBaseUrl() {
  const customSaved = safeGet("cogni_api_url");
  if (customSaved && customSaved.trim()) {
    return customSaved.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.COGNISTUDY_API_URL && window.COGNISTUDY_API_URL.trim()) {
    return window.COGNISTUDY_API_URL.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    const port = window.location.port;
    // Automatically bridge VS Code Live Server (5500/5501/5502) to local Express dev server on 3000
    if (port === "5500" || port === "5501" || port === "5502") {
      const host = window.location.hostname || "localhost";
      return `http://${host}:3000`;
    }
  }
  return "";
}

const PROTECTED_PAGES = new Set(["dashboard", "profile"]);

if (typeof window !== "undefined") {
  const current = currentPage();
  if (PROTECTED_PAGES.has(current) && !safeGet(TOKEN_KEY)) {
    window.location.replace("login.html");
  }
}

function computeInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

class StudyStore {
  constructor() {
    const cachedUser = safeReadJson(USER_CACHE_KEY, null);
    const hasToken = Boolean(safeGet(TOKEN_KEY));

    this.user = cachedUser && hasToken
      ? { ...EMPTY_USER, ...cachedUser, isLoggedIn: true }
      : { ...EMPTY_USER };
    this.items = safeReadJson(ITEMS_CACHE_KEY, []);
    this.notifications = safeReadJson(NOTIFS_CACHE_KEY, []);
    this.activities = safeReadJson(ACTIVITIES_CACHE_KEY, []);
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    this.ready = this.loadFromApi();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        document.querySelector(".offline-banner")?.classList.remove("active");
        if (typeof window.showToast === "function") {
          window.showToast("Connection restored.", "success");
        }
        this.loadFromApi();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        document.querySelector(".offline-banner")?.classList.add("active");
        if (typeof window.showToast === "function") {
          window.showToast("You are currently offline. Local study cache is active.", "info");
        }
      });

      window.addEventListener("storage", (event) => {
        if (event.key === TOKEN_KEY) {
          if (!event.newValue) {
            this.user = { ...EMPTY_USER };
            if (PROTECTED_PAGES.has(currentPage())) window.location.replace("login.html");
          } else {
            this.loadFromApi();
          }
        }
      });
    }
  }

  persistLocalCache() {
    safeSet(ITEMS_CACHE_KEY, JSON.stringify(this.items));
    safeSet(ACTIVITIES_CACHE_KEY, JSON.stringify(this.activities));
    safeSet(NOTIFS_CACHE_KEY, JSON.stringify(this.notifications));
    if (this.user && this.user.isLoggedIn) {
      safeSet(USER_CACHE_KEY, JSON.stringify(this.user));
    }
  }

  getToken() {
    return safeGet(TOKEN_KEY);
  }

  setSession(token, profile) {
    safeSet(TOKEN_KEY, token);
    safeRemove("cogni_demo_session");
    this.user = { ...EMPTY_USER, ...profile, isLoggedIn: true };
    safeSet(USER_CACHE_KEY, JSON.stringify(this.user));
  }

  isLocalToken(token) {
    return typeof token === "string" && token.startsWith("local_session_");
  }

  async loadFromApi() {
    const token = this.getToken();
    if (!token || this.isLocalToken(token)) return;

    try {
      const data = await this.request("/api/bootstrap");
      this.user = { ...EMPTY_USER, ...data.profile, isLoggedIn: true };

      // Merge any unsynced locally created items with server items
      const serverItems = Array.isArray(data.items) ? data.items : [];
      const serverIds = new Set(serverItems.map((i) => i.id));
      const unsyncedLocal = this.items.filter((i) => i && i.id && !serverIds.has(i.id));
      this.items = [...serverItems, ...unsyncedLocal];

      if (Array.isArray(data.notifications)) this.notifications = data.notifications;
      if (Array.isArray(data.activities) && data.activities.length > 0) {
        this.activities = data.activities;
      }
      this.persistLocalCache();
    } catch (error) {
      const msg = String(error?.message || "");
      if (msg.includes("Sign in") || msg.includes("UNAUTHENTICATED")) {
        safeRemove(TOKEN_KEY);
        safeRemove(USER_CACHE_KEY);
        this.user = { ...EMPTY_USER };
        if (PROTECTED_PAGES.has(currentPage())) window.location.replace("login.html");
        return;
      }
      console.warn("Using cached local workspace data:", error);
    }
  }

  async request(path, options = {}) {
    const token = this.getToken();
    const base = getApiBaseUrl();
    const url = path.startsWith("http") ? path : `${base}${path}`;
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(token && !this.isLocalToken(token) ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
    } catch (networkErr) {
      const err = new Error(`Backend API unreachable (${networkErr.message || "network error"}).`);
      err.isBackendOffline = true;
      throw err;
    }

    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json().catch(() => ({})) : {};

    if (response.status === 401 && PROTECTED_PAGES.has(currentPage()) && !this.isLocalToken(token)) {
      safeRemove(TOKEN_KEY);
      safeRemove(USER_CACHE_KEY);
      window.location.replace("login.html");
    }

    if ((response.status === 404 || response.status === 405) && !isJson) {
      const err = new Error("Static server detected without backend API.");
      err.isBackendOffline = true;
      throw err;
    }

    if (response.status === 405) {
      const err = new Error("Static server detected without backend API.");
      err.isBackendOffline = true;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(data.error || `Request failed with status ${response.status}.`);
      err.code = data.code;
      err.status = response.status;
      if (response.status === 404 && data.code !== "ITEM_NOT_FOUND" && data.code !== "PROFILE_NOT_FOUND" && data.code !== "ACTIVITY_NOT_FOUND") {
        err.isBackendOffline = true;
      }
      throw err;
    }
    return data;
  }

  async signup(fields) {
    try {
      const result = await this.request("/api/signup", {
        method: "POST",
        body: JSON.stringify(fields)
      });
      this.setSession(result.token, result.profile);
      await this.loadFromApi();
      return result.profile;
    } catch (err) {
      if (!err.isBackendOffline) throw err;
      // Seamless local account fallback for static-only hosting
      const registry = safeReadJson(LOCAL_REGISTRY_KEY, {});
      const cleanEmail = String(fields.email || "").trim().toLowerCase();
      if (registry[cleanEmail]) {
        throw new Error("An account with this email already exists.");
      }
      const profile = {
        name: String(fields.name || "Student").trim(),
        email: cleanEmail,
        phone: String(fields.phone || "").trim(),
        college: String(fields.college || "").trim(),
        course: String(fields.course || "").trim(),
        age: 18,
        bio: `Student at ${String(fields.college || "University").trim()}.`,
        avatar: computeInitials(fields.name)
      };
      registry[cleanEmail] = { password: fields.password, profile };
      safeSet(LOCAL_REGISTRY_KEY, JSON.stringify(registry));
      const token = `local_session_${Date.now()}`;
      this.notifications = [{
        id: `notif_${Date.now()}`,
        title: "Welcome to CogniStudy AI",
        message: `Hi ${profile.name}! Your study workspace is ready.`,
        time: "Just now",
        read: false
      }];
      this.setSession(token, profile);
      this.persistLocalCache();
      return profile;
    }
  }

  async login(email, password) {
    try {
      const result = await this.request("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      this.setSession(result.token, result.profile);
      await this.loadFromApi();
      return result.profile;
    } catch (err) {
      if (!err.isBackendOffline) throw err;
      const registry = safeReadJson(LOCAL_REGISTRY_KEY, {});
      const cleanEmail = String(email || "").trim().toLowerCase();
      const account = registry[cleanEmail];
      if (!account || account.password !== password) {
        throw new Error("Email or password is incorrect.");
      }
      const token = `local_session_${Date.now()}`;
      this.setSession(token, account.profile);
      this.persistLocalCache();
      return account.profile;
    }
  }

  async demoLogin() {
    try {
      const demoAuth = await this.request("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({
          email: "evaluator.student@college.edu",
          name: "Guest Student",
          uid: "demo-evaluator-id-2026"
        })
      });
      if (demoAuth && demoAuth.token) {
        this.setSession(demoAuth.token, demoAuth.profile);
        await this.loadFromApi();
        return demoAuth.profile;
      }
    } catch (err) {
      if (!err.isBackendOffline) throw err;
    }
    const demoProfile = {
      name: "Guest Student",
      email: "evaluator.student@college.edu",
      phone: "",
      college: "Academic Demo Workspace",
      course: "Computer Science",
      age: 20,
      bio: "Instant demo student profile.",
      avatar: "GS"
    };
    this.setSession(`local_session_${Date.now()}`, demoProfile);
    this.persistLocalCache();
    return demoProfile;
  }

  async logout() {
    try {
      if (window.firebaseService) {
        await window.firebaseService.signOut();
      }
    } catch (_e) {}
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        await this.request("/api/logout", { method: "POST" });
      } catch (_error) {}
    }
    safeRemove(TOKEN_KEY);
    safeRemove(USER_CACHE_KEY);
    this.user = { ...EMPTY_USER };
  }

  getUser() {
    return { ...this.user };
  }

  getItems(type = "all") {
    if (type === "all") return [...this.items];
    if (type === "favorites") return this.items.filter((i) => i.isFavorite);
    return this.items.filter((i) => i.type === type);
  }

  getItemById(id) {
    return this.items.find((i) => i.id === id);
  }

  async saveItem(item) {
    const cleanId = String(item.id || `${item.type || "item"}-${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, "-");
    const prepared = {
      ...item,
      id: cleanId,
      date: item.date || new Date().toLocaleDateString(),
      isFavorite: Boolean(item.isFavorite)
    };
    const existsOnServer = this.items.some((existing) => existing.id === cleanId && existing._synced);
    let saved = prepared;

    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        const result = await this.request(existsOnServer ? `/api/items/${encodeURIComponent(cleanId)}` : "/api/items", {
          method: existsOnServer ? "PUT" : "POST",
          body: JSON.stringify(prepared)
        });
        saved = { ...result.item, _synced: true };
      } catch (err) {
        if (err.status === 409) {
          try {
            const retry = await this.request(`/api/items/${encodeURIComponent(cleanId)}`, {
              method: "PUT",
              body: JSON.stringify(prepared)
            });
            saved = { ...retry.item, _synced: true };
          } catch (_retryErr) {}
        } else {
          console.warn("Saved item in local study cache:", err);
        }
      }
    }

    this.items = [saved, ...this.items.filter((existing) => existing.id !== saved.id)];
    this.persistLocalCache();
    return saved;
  }

  async deleteItem(id) {
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        await this.request(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (err) {
        console.warn("Backend delete skipped:", err);
      }
    }
    this.items = this.items.filter((item) => item.id !== id);
    this.persistLocalCache();
  }

  async toggleFavorite(id) {
    const item = this.getItemById(id);
    if (!item) throw new Error("Study item was not found.");
    const newStatus = !item.isFavorite;
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        const result = await this.request(`/api/items/${encodeURIComponent(id)}/favorite`, {
          method: "PATCH",
          body: JSON.stringify({ isFavorite: newStatus })
        });
        if (result && result.item) {
          item.isFavorite = result.item.isFavorite;
        }
      } catch (err) {
        console.warn("Backend favorite update skipped:", err);
      }
    }
    this.items = this.items.map((existing) => existing.id === id ? { ...existing, isFavorite: newStatus } : existing);
    this.persistLocalCache();
    return newStatus;
  }

  async renameItem(id, newTitle) {
    const item = this.getItemById(id);
    if (!item) throw new Error("Study item was not found.");
    return this.saveItem({ ...item, title: newTitle });
  }

  async duplicateItem(id) {
    const item = this.getItemById(id);
    if (item) {
      const copy = {
        ...item,
        id: `${item.type}-${Date.now()}`,
        title: `${item.title} (Copy)`,
        date: new Date().toLocaleDateString(),
        _synced: false
      };
      return this.saveItem(copy);
    }
    return null;
  }

  getNotifications() {
    return [...this.notifications];
  }

  async markNotificationsRead() {
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        const result = await this.request("/api/notifications/read", { method: "PATCH" });
        this.notifications = result.notifications;
        this.persistLocalCache();
        return;
      } catch (_err) {}
    }
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.persistLocalCache();
  }

  getActivities() {
    return [...this.activities];
  }

  async addActivity(activity) {
    let saved = {
      ...activity,
      id: activity.id || `act-${Date.now()}`,
      date: activity.date || new Date().toLocaleDateString()
    };
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        const result = await this.request("/api/activities", {
          method: "POST",
          body: JSON.stringify(activity)
        });
        saved = result.activity;
      } catch (_err) {}
    }

    this.activities = [saved, ...this.activities].slice(0, 50);
    this.persistLocalCache();
    return saved;
  }

  async deleteActivity(id) {
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        await this.request(`/api/activities/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (_err) {}
    }
    this.activities = this.activities.filter((activity) => activity.id !== id);
    this.persistLocalCache();
  }

  async saveProfile(profile) {
    const token = this.getToken();
    if (token && !this.isLocalToken(token)) {
      try {
        const result = await this.request("/api/profile", {
          method: "PUT",
          body: JSON.stringify(profile)
        });
        this.user = { ...this.user, ...result.profile, isLoggedIn: true };
        this.persistLocalCache();
        return this.getUser();
      } catch (_err) {}
    }
    this.user = { ...this.user, ...profile };
    this.persistLocalCache();
    return this.getUser();
  }

  async summarizeNotes(text, options = {}) {
    const trimmed = String(text || "").trim();
    if (trimmed.length < 20) {
      throw new Error("Please enter at least 20 characters of study material to summarize.");
    }
    try {
      const result = await this.request("/api/summarize", {
        method: "POST",
        body: JSON.stringify({
          text: trimmed.slice(0, 25000),
          length: options.length || "medium",
          difficulty: options.difficulty || "intermediate",
          style: options.style || "detailed"
        })
      });
      if (result && result.summary) return result.summary;
    } catch (err) {
      if (err.code === "GEMINI_NOT_CONFIGURED") throw err;
      if (!err.isBackendOffline && err.status && err.status < 500) throw err;
      console.warn("Backend summarize fallback:", err);
    }
    return this.synthesizeClientSummary(trimmed, options);
  }

  synthesizeClientSummary(text, options = {}) {
    const clean = text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
    const sentences = clean.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()).filter((s) => s.length > 25) || [clean];
    const limit = options.length === "short" ? 4 : options.length === "comprehensive" ? 10 : 6;
    const selected = sentences.slice(0, limit);
    const words = clean.match(/\b[A-Z][a-zA-Z-]{3,}\b/g) || [];
    const keyTerms = [...new Set(words)].slice(0, 6);

    if (options.style === "bulleted") {
      return `## Key Study Summary\n\n` +
        selected.map((s) => `- ${s}`).join("\n") +
        (keyTerms.length ? `\n\n### Core Terms\n- **${keyTerms.join("** • **")}**` : "");
    }
    if (options.style === "cheatsheet") {
      return `## Rapid-Recall Exam Cheatsheet\n\n` +
        `### Core Takeaways\n` +
        selected.slice(0, 5).map((s) => `- ${s}`).join("\n") +
        (keyTerms.length ? `\n\n### High-Yield Vocabulary\n` + keyTerms.map((t) => `- **${t}**: Essential concept from source text.`).join("\n") : "");
    }
    return `## Executive Overview\n\n${selected.slice(0, 2).join(" ")}\n\n` +
      `### Key Concepts & Points\n` +
      selected.slice(2).map((s) => `- ${s}`).join("\n") +
      (keyTerms.length ? `\n\n### Essential Terminology\n- **${keyTerms.join("**, **")}**` : "");
  }

  async generateFlashcards(topic, count, difficulty, sourceText) {
    const cardCount = Math.min(Math.max(Number(count) || 6, 1), 10);
    try {
      const result = await this.request("/api/flashcards/generate", {
        method: "POST",
        body: JSON.stringify({
          topic: String(topic || "Study Topic").trim(),
          count: cardCount,
          difficulty: difficulty || "medium",
          sourceText: sourceText ? String(sourceText).slice(0, 25000) : undefined
        })
      });
      if (result && Array.isArray(result.cards) && result.cards.length > 0) {
        return result.cards.map((c, idx) => ({
          id: c.id || `card_${Date.now()}_${idx}`,
          question: String(c.question || c.front || `Concept ${idx + 1}: ${topic}`),
          answer: String(c.answer || c.back || "Review study notes for details.")
        }));
      }
    } catch (err) {
      if (err.code === "GEMINI_NOT_CONFIGURED") throw err;
      console.warn("Flashcard generation fallback active:", err);
    }
    return this.synthesizeClientFlashcards(topic, cardCount, difficulty, sourceText);
  }

  async generateQuiz(topic, count, difficulty = "medium", sourceText = "") {
    const qCount = Math.min(Math.max(Number(count) || 5, 1), 20);
    try {
      const result = await this.request("/api/quiz/generate", {
        method: "POST",
        body: JSON.stringify({
          topic: String(topic || "General Knowledge").trim(),
          count: qCount,
          difficulty: difficulty || "medium",
          sourceText: sourceText ? String(sourceText).slice(0, 25000) : undefined
        })
      });
      if (result && Array.isArray(result.questions) && result.questions.length > 0) {
        return result.questions.map((q, idx) => ({
          id: q.id || `q_${Date.now()}_${idx}`,
          question: String(q.question || ""),
          options: Array.isArray(q.options) ? q.options.map(String) : ["Option A", "Option B", "Option C", "Option D"],
          correct: typeof q.correct === "number" ? q.correct : (typeof q.answer === "number" ? q.answer : 0),
          explanation: String(q.explanation || "Review the core principles for this topic.")
        }));
      }
    } catch (err) {
      if (err.code === "GEMINI_NOT_CONFIGURED") throw err;
      console.warn("Quiz generation fallback active:", err);
    }
    return this.synthesizeClientQuiz(topic, qCount, difficulty, sourceText);
  }

  async transformNotes(text, action) {
    try {
      const result = await this.request("/api/ai/transform", {
        method: "POST",
        body: JSON.stringify({ text: String(text || "").slice(0, 25000), action })
      });
      if (result && result.transformed) return result.transformed;
    } catch (err) {
      if (err.code === "GEMINI_NOT_CONFIGURED") throw err;
      console.warn("Transform fallback active:", err);
    }
    return this.synthesizeClientTransform(text, action);
  }

  async generateMindMap(topic, text = "", depth = 3) {
    try {
      const result = await this.request("/api/mindmap/generate", {
        method: "POST",
        body: JSON.stringify({
          topic: topic ? String(topic).trim() : undefined,
          text: text ? String(text).slice(0, 35000) : undefined,
          depth: Number(depth) || 3
        })
      });
      if (result && result.mindmap) return result.mindmap;
    } catch (err) {
      if (err.code === "GEMINI_NOT_CONFIGURED") throw err;
      console.warn("Mind map fallback active:", err);
    }
    return this.synthesizeClientMindMap(topic, text, depth);
  }

  synthesizeClientMindMap(topic, text = "", depth = 3) {
    const mainTitle = (topic?.trim() || "Concept Architecture").slice(0, 60);
    const content = (text || "").trim();

    if (!content) {
      return {
        title: mainTitle,
        notes: `Structured conceptual hierarchy for ${mainTitle}`,
        children: [
          {
            title: "Core Fundamentals",
            children: [
              { title: `Definition of ${mainTitle}`, children: [{ title: "Primary principles", children: [] }] },
              { title: "Key Terminology", children: [{ title: "Essential vocabulary", children: [] }] }
            ]
          },
          {
            title: "Structure & Mechanisms",
            children: [
              { title: "Primary Components", children: [{ title: "Core building blocks", children: [] }] },
              { title: "Key Processes", children: [{ title: "Cause & effect flow", children: [] }] }
            ]
          },
          {
            title: "Context & Significance",
            children: [
              { title: "Practical Applications", children: [{ title: "Real-world impact", children: [] }] },
              { title: "Exam Takeaways", children: [{ title: "High-yield facts", children: [] }] }
            ]
          }
        ]
      };
    }

    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
      const isHeader = /^(\d+[\.\)]\s*|#{1,4}\s+|[A-Z\s]{4,}:|[A-Z][a-zA-Z\s]{2,25}:)/.test(line);
      const isBullet = /^[-*•–]\s*/.test(line);

      if (isHeader) {
        const cleanTitle = line.replace(/^(\d+[\.\)]\s*|#{1,4}\s+|:\s*)/g, "").replace(/:$/, "").trim();
        if (cleanTitle.length > 1) {
          currentSection = { title: cleanTitle.slice(0, 45), items: [] };
          sections.push(currentSection);
        }
      } else if (currentSection && isBullet) {
        const cleanItem = line.replace(/^[-*•–]\s*/, "").trim();
        if (cleanItem) currentSection.items.push(cleanItem.slice(0, 50));
      } else if (!currentSection) {
        currentSection = { title: line.slice(0, 40), items: [] };
        sections.push(currentSection);
      } else if (currentSection.items.length < 5) {
        currentSection.items.push(line.slice(0, 50));
      }
    }

    const primaryBranches = (sections.length > 0 ? sections : [{ title: "Core Concepts", items: [content.slice(0, 50)] }])
      .slice(0, 6)
      .map((sec) => ({
        title: sec.title,
        children: (sec.items.length > 0 ? sec.items.slice(0, 4) : ["High-yield takeaway", "Key concept"])
          .map((item) => ({
            title: item,
            children: depth > 3 ? [{ title: "Detail & application", children: [] }] : []
          }))
      }));

    return {
      title: mainTitle,
      notes: `Extracted mind map structure synthesized from notes`,
      children: primaryBranches
    };
  }

  async askAssistant(message, context = "", history = []) {
    const cleanHistory = Array.isArray(history)
      ? history
          .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
          .slice(-20)
          .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content.slice(0, 10000)
          }))
      : [];

    try {
      const result = await this.request("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: String(message || "").trim(),
          context: context ? String(context).slice(0, 35000) : undefined,
          history: cleanHistory.length ? cleanHistory : undefined
        })
      });
      if (result && result.reply) return result.reply;
    } catch (err) {
      console.warn("AI assistant request warning:", err);
      const errorMsg = String(err.message || "");
      if (err.code === "GEMINI_NOT_CONFIGURED" || errorMsg.includes("GEMINI_NOT_CONFIGURED") || errorMsg.includes("GEMINI_API_KEY")) {
        return "⚠️ **AI Configuration Needed:**\n\nPlease verify that `GEMINI_API_KEY` is configured in the **Settings > Secrets** panel (or server environment variables) to enable live Gemini responses.";
      }
      if (!err.isBackendOffline && err.status && err.status < 500) {
        throw err;
      }
    }
    return this.synthesizeTutorResponse(message, context);
  }

  synthesizeTutorResponse(message, context = "") {
    const q = String(message || "").trim();
    const lowerQ = q.toLowerCase();
    const notes = String(context || "").trim();
    const cleanedTopic = q
      .replace(/^(what is|what are|explain|summarize|tell me about|how does|how do|why is|define|please|create|generate|give me)\s+/i, "")
      .replace(/[?!.]+$/, "")
      .trim() || "your study topic";

    if (lowerQ.includes("practice question") || lowerQ.includes("quiz")) {
      const subject = notes ? notes.split(/\n/)[0].replace(/^Current Study Topic:\s*/i, "").slice(0, 60) : cleanedTopic;
      const sampleQuiz = this.synthesizeClientQuiz(subject, 3, "medium", notes);
      return `### 🧠 3 Active-Recall Practice Questions\n\n` +
        sampleQuiz.map((item, idx) =>
          `**Q${idx + 1}. ${item.question}**\n` +
          item.options.map((opt, oIdx) => `- ${String.fromCharCode(65 + oIdx)}) ${opt}`).join("\n") +
          `\n- **Answer:** ${String.fromCharCode(65 + item.correct)} — *${item.explanation}*`
        ).join("\n\n");
    }

    if (lowerQ.includes("eli5") || lowerQ.includes("simple") || lowerQ.includes("analogy")) {
      if (notes && notes.length > 40) {
        const simplified = this.synthesizeClientTransform(notes, "simplify");
        return `${simplified}\n\n💡 **Intuitive Analogy:** Think of these concepts like building blocks—mastering the core definition first makes every connected branch fit into place naturally.`;
      }
      return `### 💡 Simple Explanation: ${cleanedTopic}\n\n` +
        `- **In plain words:** **${cleanedTopic}** is best understood by breaking it down into *what it is*, *why it matters*, and *how it works in everyday life*.\n` +
        `- **Real-world analogy:** Imagine organizing a library—instead of memorizing every page randomly, **${cleanedTopic}** gives you clear categories and rules so everything connects logically.\n` +
        `- **Quick check:** Try explaining **${cleanedTopic}** out loud in two sentences without looking at your notes!`;
    }

    if (lowerQ.includes("exam") || lowerQ.includes("high-yield") || lowerQ.includes("formula")) {
      if (notes && notes.length > 40) {
        const cheat = this.synthesizeClientSummary(notes, { length: "medium", style: "cheatsheet" });
        return `${cheat}\n\n🎯 **Exam Strategy:** Focus on contrasting definitions and cause-and-effect steps during rapid revision.`;
      }
      return `### 🎯 High-Yield Exam Key Points: ${cleanedTopic}\n\n` +
        `- **Must-Know Definitions:** Be ready to define **${cleanedTopic}** concisely in the first sentence of any written answer.\n` +
        `- **Core Comparisons:** Examiners frequently test how **${cleanedTopic}** differs from closely related concepts.\n` +
        `- **Common Pitfall:** Avoid vague statements—always anchor your explanation with at least one concrete example or mechanism.`;
    }

    if (notes && notes.length > 30) {
      const summary = this.synthesizeClientSummary(notes, { length: "medium", style: "bulleted" });
      return `🎓 **CogniStudy AI Tutor (Notes Analysis):**\n\n${summary}\n\n💡 **Next Step:** Click **Insert into Notes** or convert these points into **Flashcards** / **Quiz** for active recall!`;
    }

    return `🎓 **CogniStudy AI Tutor — ${cleanedTopic}**\n\n` +
      `- **Core Overview:** **${cleanedTopic}** centers on foundational principles, key terminology, and structured relationships within the subject.\n` +
      `- **How to Master It:** Break **${cleanedTopic}** into 3–4 main subtopics, connect cause-and-effect mechanisms, and anchor each with a concrete example.\n` +
      `- **Active Recall Prompt:** Can you list the top 3 takeaways of **${cleanedTopic}** from memory?\n\n` +
      `*Tip: Paste lecture notes on the page and keep "Attach notes context" checked for direct analysis of your material.*`;
  }

  synthesizeClientQuiz(topic, count = 5, difficulty = "medium", sourceText = "") {
    const t = String(topic || "Academic Studies").trim();
    const questions = [];
    const sentences = String(sourceText || "")
      .replace(/\[\d+\]/g, "")
      .match(/[^.!?]+[.!?]+/g)
      ?.map((s) => s.trim())
      .filter((s) => s.length > 35) || [];

    if (sentences.length >= 2) {
      for (let i = 0; i < count; i++) {
        const fact = sentences[i % sentences.length];
        const correctIdx = i % 4;
        const distractors = [
          `It is completely unrelated to ${t} and never occurs in practice.`,
          `It reverses all primary assumptions described in the study text.`,
          `It applies exclusively outside the scope of ${t}.`
        ];
        const options = [...distractors];
        options.splice(correctIdx, 0, fact.slice(0, 140));
        questions.push({
          id: `q_${Date.now()}_${i}`,
          question: `Based on your study material on ${t}, which statement is accurate?`,
          options,
          correct: correctIdx,
          explanation: `From your notes: ${fact}`
        });
      }
      return questions;
    }

    const templates = [
      {
        question: `Which study approach best establishes a comprehensive understanding of ${t}?`,
        options: [
          `Analyzing foundational definitions, core facts, historical/scientific context, and real-world examples of ${t}`,
          `Ignoring primary sources and skipping foundational terminology`,
          `Memorizing isolated words without understanding context`,
          `Focusing only on unrelated subjects`
        ],
        correct: 0,
        explanation: `Mastering ${t} starts with connecting core definitions, context, and concrete examples.`
      },
      {
        question: `When preparing for an examination on ${t}, what should be prioritized first?`,
        options: [
          `Unverified trivia with no connection to the syllabus`,
          `Primary themes, key classifications, timeline/mechanisms, and major takeaways of ${t}`,
          `Skipping review of core concepts`,
          `Avoiding practice questions altogether`
        ],
        correct: 1,
        explanation: `High-yield exam preparation on ${t} focuses on major themes, classifications, and verified facts.`
      },
      {
        question: `How can complex subtopics within ${t} be organized most effectively for revision?`,
        options: [
          `Into a structured hierarchy linking main branches to supporting facts and examples`,
          `As a single unformatted paragraph without headings`,
          `By discarding definitions and key dates/formulas`,
          `Without any logical grouping`
        ],
        correct: 0,
        explanation: `Hierarchical organization (such as mind maps and structured notes) boosts recall of ${t}.`
      },
      {
        question: `Which active recall method is most effective for retaining key facts about ${t}?`,
        options: [
          `Passively skimming headings once before the test`,
          `Self-testing with targeted questions, flashcards, and explaining ${t} in your own words`,
          `Reading without taking any notes or testing comprehension`,
          `Cramming without reviewing explanations`
        ],
        correct: 1,
        explanation: `Active retrieval practice and self-explanation significantly strengthen long-term memory of ${t}.`
      },
      {
        question: `When evaluating an analytical question about ${t}, what strengthens your answer most?`,
        options: [
          `Vague generalizations without supporting evidence`,
          `Repeating the question prompt word-for-word`,
          `Clear thesis statements backed by accurate terminology and specific examples from ${t}`,
          `Omitting key definitions`
        ],
        correct: 2,
        explanation: `Strong academic answers on ${t} combine precise terminology with concrete supporting evidence.`
      }
    ];

    for (let i = 0; i < count; i++) {
      const tpl = templates[i % templates.length];
      questions.push({
        id: `q_${Date.now()}_${i}`,
        question: tpl.question,
        options: [...tpl.options],
        correct: tpl.correct,
        explanation: tpl.explanation
      });
    }
    return questions;
  }

  synthesizeClientFlashcards(topic, count = 6, difficulty = "medium", sourceText = "") {
    const t = String(topic || "Academic Studies").trim();
    const cards = [];
    const sentences = String(sourceText || "")
      .replace(/\[\d+\]/g, "")
      .match(/[^.!?]+[.!?]+/g)
      ?.map((s) => s.trim())
      .filter((s) => s.length > 30) || [];

    if (sentences.length >= 2) {
      for (let i = 0; i < count; i++) {
        const s = sentences[i % sentences.length];
        cards.push({
          id: `card_${Date.now()}_${i}`,
          question: `Key Point ${i + 1} (${t}): What important takeaway is highlighted in this section?`,
          answer: s
        });
      }
      return cards;
    }

    const concepts = [
      { question: `Core Overview: What is the central focus of ${t}?`, answer: `${t} encompasses foundational principles, key terminology, and real-world applications essential for mastering the subject.` },
      { question: `Key Components: What are the primary building blocks studied in ${t}?`, answer: `Core definitions, classification frameworks, cause-and-effect relationships, and practical examples within ${t}.` },
      { question: `Analytical Focus: How do main concepts in ${t} connect to one another?`, answer: `Foundational principles establish the rules and context that govern advanced mechanisms and real-world outcomes in ${t}.` },
      { question: `Common Exam Pitfall: What should you watch out for when answering questions on ${t}?`, answer: `Distinguish closely related terms carefully and support claims with specific evidence or examples from ${t}.` },
      { question: `Practical Significance: Why is ${t} important in academic and real-world contexts?`, answer: `Understanding ${t} enables informed analysis, problem-solving, and application across related domains.` },
      { question: `Active Recall Check: How would you summarize ${t} in 2 concise sentences?`, answer: `State the core definition of ${t} first, then highlight its primary mechanism or significance with one concrete example.` }
    ];

    for (let i = 0; i < count; i++) {
      const c = concepts[i % concepts.length];
      cards.push({
        id: `card_${Date.now()}_${i}`,
        question: c.question,
        answer: c.answer
      });
    }
    return cards;
  }

  synthesizeClientTransform(text, action) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    const sentences = raw.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()).filter(Boolean) || [raw];

    if (action === "shorten") {
      return `### Concise Summary\n\n` + sentences.slice(0, Math.max(2, Math.ceil(sentences.length * 0.35))).map((s) => `- ${s}`).join("\n");
    }
    if (action === "expand") {
      return `### Detailed Study Breakdown\n\n${raw}\n\n### Study Context & Review Takeaways\n- Review how each concept above connects to foundational definitions.\n- Identify concrete examples and test recall using Flashcards or Quiz mode.`;
    }
    if (action === "bullets" || action === "bullet-points") {
      return sentences.map((s) => `- ${s.replace(/^[-•*]\s*/, "")}`).join("\n");
    }
    if (action === "simplify" || action === "eli5") {
      return `### Simplified Explanation\n\nIn simple terms:\n\n` + sentences.slice(0, 5).map((s) => `- ${s}`).join("\n");
    }
    if (action === "rephrase") {
      return `### Academic Revision Notes\n\n` + sentences.map((s) => s.trim()).join(" ");
    }
    if (action === "key-takeaways") {
      return this.synthesizeClientSummary(raw, { length: "short", style: "bulleted" });
    }
    return raw;
  }

  getStats() {
    const items = this.getItems();
    const notesCount = items.filter((i) => i.type === "note").length;
    const flashcardsCount = items.filter((i) => i.type === "flashcards").length;
    const quizzesCount = items.filter((i) => i.type === "quiz").length;
    const mindmapsCount = items.filter((i) => i.type === "mindmap").length;
    return {
      notesCount,
      flashcardsCount,
      quizzesCount,
      mindmapsCount,
      studyProgress: Math.min(100, Math.round(notesCount * 25 + flashcardsCount * 20 + quizzesCount * 20 + mindmapsCount * 20))
    };
  }

  generateGoogleCalendarUrl(title, details, durationMinutes = 45) {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const formatDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatDate(start)}/${formatDate(end)}`;
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `[Study Session] ${title}`);
    url.searchParams.set("details", `${details}\n\nPrepared with CogniStudy AI`);
    url.searchParams.set("dates", dates);
    return url.toString();
  }
}

window.store = new StudyStore();
