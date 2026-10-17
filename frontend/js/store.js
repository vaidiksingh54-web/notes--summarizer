/**
 * CogniStudy AI - Student session and API store
 */

const TOKEN_KEY = "cogni_session_token";
const PUBLIC_PAGES = new Set([
  "",
  "index.html",
  "login.html",
  "signup.html",
  "privacy.html",
  "terms.html",
  "cookies.html",
  "accessibility.html",
  "disclaimer.html",
  "help.html",
  "404.html",
  "500.html",
]);

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

function currentPage() {
  return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.COGNISTUDY_API_URL) {
    return window.COGNISTUDY_API_URL.replace(/\/$/, "");
  }
  if (typeof localStorage !== "undefined" && localStorage.getItem("cogni_api_url")) {
    return localStorage.getItem("cogni_api_url").replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location && window.location.port && window.location.port !== "3000" && window.location.port !== "5000" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:3000";
  }
  return "";
}

if (!PUBLIC_PAGES.has(currentPage()) && !localStorage.getItem(TOKEN_KEY)) {
  window.location.replace("login.html");
}

class StudyStore {
  constructor() {
    this.user = { ...EMPTY_USER };
    this.items = [];
    this.notifications = [];
    this.activities = [];
    this.firebaseUser = null;
    this.isOnline = navigator.onLine;
    this.ready = this.loadFromApi();
    
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
        window.showToast("You are currently offline. Changes cannot sync with server.", "error");
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key === TOKEN_KEY) {
        if (!event.newValue) {
          this.user = { ...EMPTY_USER };
          if (!PUBLIC_PAGES.has(currentPage())) window.location.replace("login.html");
        } else {
          this.loadFromApi();
        }
      }
    });
  }

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  setSession(token, profile) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem("cogni_demo_session");
    this.user = { ...EMPTY_USER, ...profile, isLoggedIn: true };
  }

  async onFirebaseAuthUser(user) {
    this.firebaseUser = user;
    let token = this.getToken();
    let profile = null;

    // Exchange with backend /api/auth/google to establish a persistent session
    if (!token || token.startsWith("firebase_")) {
      try {
        const authRes = await this.request("/api/auth/google", {
          method: "POST",
          body: JSON.stringify({
            email: user.email || "",
            name: user.displayName || user.email?.split("@")[0] || "Student",
            uid: user.uid
          })
        });
        if (authRes && authRes.token) {
          token = authRes.token;
          profile = authRes.profile;
        }
      } catch (err) {
        console.warn("Backend Google auth exchange fallback:", err);
        token = `firebase_${user.uid}`;
      }
    }

    if (!profile) {
      let firestoreProfile = null;
      if (window.firebaseService) {
        try {
          firestoreProfile = await window.firebaseService.getProfile();
        } catch (err) {
          console.warn("Could not load Firestore profile:", err);
        }
      }
      profile = firestoreProfile || {
        id: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Student",
        email: user.email || "",
        phone: user.phoneNumber || "",
        college: "",
        course: "",
        age: 18,
        bio: "Google Verified Student",
        avatar: (user.displayName || "S").slice(0, 2).toUpperCase(),
        isLoggedIn: true
      };
    }

    this.setSession(token, profile);

    // Sync items from Firestore if available
    if (window.firebaseService) {
      try {
        const firestoreItems = await window.firebaseService.listItems();
        if (firestoreItems && firestoreItems.length > 0) {
          const map = new Map();
          for (const item of firestoreItems) map.set(item.id, item);
          for (const item of this.items) {
            if (!map.has(item.id)) map.set(item.id, item);
          }
          this.items = Array.from(map.values());
        }
      } catch (err) {
        console.warn("Could not load Firestore items:", err);
      }

      try {
        const firestoreActivities = await window.firebaseService.listActivities();
        if (firestoreActivities && firestoreActivities.length > 0) {
          this.activities = firestoreActivities;
        }
      } catch (err) {
        console.warn("Could not load Firestore activities:", err);
      }
    }

    await this.loadFromApi();
    window.dispatchEvent(new CustomEvent("store-data-updated"));
  }

  onFirebaseAuthSignOut() {
    this.firebaseUser = null;
  }

  async loadFromApi() {
    const token = this.getToken();
    if (!token) return;

    try {
      const data = await this.request("/api/bootstrap");
      this.user = { ...EMPTY_USER, ...data.profile, isLoggedIn: true };
      this.items = data.items;
      this.notifications = data.notifications;
      this.activities = data.activities;
    } catch (error) {
      if (String(error.message).includes("Sign in") || String(error.message).includes("UNAUTHENTICATED")) {
        localStorage.removeItem(TOKEN_KEY);
        if (!PUBLIC_PAGES.has(currentPage())) window.location.replace("login.html");
        return;
      }
      console.warn("Backend unavailable.", error);
      if (typeof window.showToast === "function") {
        window.showToast("Backend unavailable. Sign in again after starting the API.", "error");
      }
    }
  }

  async request(path, options = {}) {
    const token = this.getToken();
    const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
    } catch (networkErr) {
      const base = getApiBaseUrl();
      if (base) {
        if (base.includes("localhost")) {
          throw new Error("Cannot connect to CogniStudy backend at http://localhost:3000. Start the server with `npm run dev`.");
        } else {
          throw new Error(`Cannot connect to CogniStudy backend at ${base}. If using Render free tier, the server may take up to 45 seconds to wake up from idle. Please wait a moment and try again.`);
        }
      }
      throw networkErr;
    }

    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && !PUBLIC_PAGES.has(currentPage())) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.replace("login.html");
    }
    if (response.status === 404 && !getApiBaseUrl() && (window.location.hostname.endsWith(".vercel.app") || window.location.hostname.includes("vercel"))) {
      throw new Error("Backend API not connected to Vercel. In frontend/js/config.js, set window.COGNISTUDY_API_URL to your Render backend URL (e.g. https://your-backend.onrender.com).");
    }
    if (response.status === 405) {
      throw new Error("The API is not available on this web server. Start the app with `npm run dev` and open http://localhost:3000.");
    }
    if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}.`);
    return data;
  }

  async signup(fields) {
    const result = await this.request("/api/signup", {
      method: "POST",
      body: JSON.stringify(fields)
    });
    this.setSession(result.token, result.profile);
    return result.profile;
  }

  async login(email, password) {
    const result = await this.request("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.setSession(result.token, result.profile);
    return result.profile;
  }

  async logout() {
    try {
      if (window.firebaseService) {
        await window.firebaseService.signOut();
      }
    } catch (_e) {}
    try {
      await this.request("/api/logout", { method: "POST" });
    } catch (_error) {
      // Clear the local session even if the API is already down.
    }
    localStorage.removeItem(TOKEN_KEY);
    this.firebaseUser = null;
    this.user = { ...EMPTY_USER };
    this.items = [];
    this.notifications = [];
    this.activities = [];
  }

  getUser() {
    return { ...this.user };
  }

  getItems(type = "all") {
    if (type === "all") return [...this.items];
    if (type === "favorites") return this.items.filter(i => i.isFavorite);
    return this.items.filter(i => i.type === type);
  }

  getItemById(id) {
    return this.items.find(i => i.id === id);
  }

  async saveItem(item) {
    const exists = this.items.some(existing => existing.id === item.id);
    let saved = item;
    const token = this.getToken();
    if (token) {
      try {
        const result = await this.request(exists ? `/api/items/${encodeURIComponent(item.id)}` : "/api/items", {
          method: exists ? "PUT" : "POST",
          body: JSON.stringify(item)
        });
        saved = result.item;
      } catch (err) {
        console.warn("Backend item save failed, keeping locally:", err);
        saved = { ...item, id: item.id || `item_${Date.now()}`, date: item.date || new Date().toLocaleDateString() };
      }
    } else {
      saved = { ...item, id: item.id || `item_${Date.now()}`, date: item.date || new Date().toLocaleDateString() };
    }

    // Persist to Firestore if logged in with Firebase
    if (window.firebaseService && (this.firebaseUser || window.firebaseService.getCurrentUser())) {
      try {
        await window.firebaseService.saveItem(saved);
      } catch (err) {
        console.warn("Firestore save failed, keeping local state:", err);
      }
    }

    this.items = [saved, ...this.items.filter(existing => existing.id !== saved.id)];
    return saved;
  }

  async deleteItem(id) {
    const token = this.getToken();
    if (token) {
      try {
        await this.request(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (err) {
        console.warn("Backend delete skipped:", err);
      }
    }
    if (window.firebaseService && (this.firebaseUser || window.firebaseService.getCurrentUser())) {
      try {
        await window.firebaseService.deleteItem(id);
      } catch (err) {
        console.warn("Firestore delete failed:", err);
      }
    }
    this.items = this.items.filter(item => item.id !== id);
  }

  async toggleFavorite(id) {
    const item = this.getItemById(id);
    if (!item) throw new Error("Study item was not found.");
    const newStatus = !item.isFavorite;
    const token = this.getToken();
    if (token) {
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
    if (window.firebaseService && (this.firebaseUser || window.firebaseService.getCurrentUser())) {
      try {
        await window.firebaseService.toggleFavorite(id, item.isFavorite);
      } catch (err) {
        console.warn("Firestore toggle favorite failed:", err);
      }
    }
    this.items = this.items.map(existing => existing.id === id ? { ...existing, isFavorite: newStatus } : existing);
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
        date: new Date().toLocaleDateString()
      };
      return this.saveItem(copy);
    }
    return null;
  }

  getNotifications() {
    return [...this.notifications];
  }

  async markNotificationsRead() {
    const result = await this.request("/api/notifications/read", { method: "PATCH" });
    this.notifications = result.notifications;
  }

  getActivities() {
    return [...this.activities];
  }

  async addActivity(activity) {
    let saved = activity;
    const token = this.getToken();
    if (token) {
      try {
        const result = await this.request("/api/activities", {
          method: "POST",
          body: JSON.stringify(activity)
        });
        saved = result.activity;
      } catch (err) {
        saved = { ...activity, id: `act_${Date.now()}` };
      }
    } else {
      saved = { ...activity, id: `act_${Date.now()}` };
    }

    if (window.firebaseService && (this.firebaseUser || window.firebaseService.getCurrentUser())) {
      try {
        await window.firebaseService.addActivity(saved);
      } catch (err) {
        console.warn("Firestore activity save failed:", err);
      }
    }

    this.activities = [saved, ...this.activities].slice(0, 50);
    return saved;
  }

  async deleteActivity(id) {
    await this.request(`/api/activities/${encodeURIComponent(id)}`, { method: "DELETE" });
    this.activities = this.activities.filter(activity => activity.id !== id);
  }

  async saveProfile(profile) {
    const token = this.getToken();
    if (token) {
      try {
        const result = await this.request("/api/profile", {
          method: "PUT",
          body: JSON.stringify(profile)
        });
        this.user = { ...this.user, ...result.profile };
      } catch (err) {
        this.user = { ...this.user, ...profile };
      }
    } else {
      this.user = { ...this.user, ...profile };
    }

    if (window.firebaseService && (this.firebaseUser || window.firebaseService.getCurrentUser())) {
      try {
        await window.firebaseService.saveProfile(this.user);
      } catch (err) {
        console.warn("Firestore profile save failed:", err);
      }
    }
    return this.getUser();
  }

  async generateFlashcards(topic, count, difficulty, sourceText) {
    const result = await this.request("/api/flashcards/generate", {
      method: "POST",
      body: JSON.stringify({ topic, count, difficulty, sourceText })
    });
    return result.cards;
  }

  async generateQuiz(topic, count, difficulty = "medium", sourceText = "") {
    const result = await this.request("/api/quiz/generate", {
      method: "POST",
      body: JSON.stringify({
        topic,
        count: Number(count) || 5,
        difficulty,
        sourceText: sourceText || undefined
      })
    });
    return result.questions;
  }

  async transformNotes(text, action) {
    const result = await this.request("/api/ai/transform", {
      method: "POST",
      body: JSON.stringify({ text, action })
    });
    return result.transformed;
  }

  async generateMindMap(topic, text = "", depth = 3) {
    try {
      const result = await this.request("/api/mindmap/generate", {
        method: "POST",
        body: JSON.stringify({
          topic: topic || undefined,
          text: text || undefined,
          depth: Number(depth) || 3
        })
      });
      return result.mindmap;
    } catch (err) {
      throw err;
    }
  }

  synthesizeClientMindMap(topic, text = "", depth = 3) {
    const mainTitle = (topic?.trim() || "Concept Architecture").slice(0, 60);
    const content = text.trim();

    if (!content) {
      return {
        title: mainTitle,
        notes: `Structured conceptual hierarchy for ${mainTitle}`,
        children: [
          {
            title: "Core Fundamentals",
            children: [
              { title: "Key Principles", children: [{ title: "Foundational theory", children: [] }, { title: "Essential terms", children: [] }] },
              { title: "Standard Definitions", children: [{ title: "Primary definitions", children: [] }] }
            ]
          },
          {
            title: "Methodologies & Operations",
            children: [
              { title: "Implementation Steps", children: [{ title: "Phased workflow", children: [] }] },
              { title: "Best Practices", children: [{ title: "Efficiency optimization", children: [] }] }
            ]
          },
          {
            title: "Real-World Applications",
            children: [
              { title: "Industry Use Cases", children: [{ title: "Practical deployments", children: [] }] },
              { title: "Future Horizons", children: [{ title: "Emerging trends", children: [] }] }
            ]
          }
        ]
      };
    }

    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
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
      .map(sec => ({
        title: sec.title,
        children: (sec.items.length > 0 ? sec.items.slice(0, 4) : ["High-yield takeaway", "Key concept"])
          .map(item => ({
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
    const result = await this.request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, context: context || undefined, history: history.length ? history : undefined })
    });
    return result.reply;
  }

  getStats() {
    const items = this.getItems();
    const notesCount = items.filter(i => i.type === "note").length;
    const flashcardsCount = items.filter(i => i.type === "flashcards").length;
    const quizzesCount = items.filter(i => i.type === "quiz").length;
    const mindmapsCount = items.filter(i => i.type === "mindmap").length;
    return {
      notesCount,
      flashcardsCount,
      quizzesCount,
      mindmapsCount,
      studyProgress: Math.min(100, Math.round((notesCount * 25 + flashcardsCount * 20 + quizzesCount * 20 + mindmapsCount * 20)))
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
