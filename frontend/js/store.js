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
  // If running locally on localhost or 127.0.0.1, always prioritize local backend
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      return "";
    }
  }
  if (typeof localStorage !== "undefined" && localStorage.getItem("cogni_api_url")) {
    return localStorage.getItem("cogni_api_url").replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.COGNISTUDY_API_URL) {
    return window.COGNISTUDY_API_URL.replace(/\/$/, "");
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
    this.isOnline = navigator.onLine;
    try {
      localStorage.removeItem("cogni_local_accounts");
    } catch (_e) {}
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
      if (typeof window !== "undefined" && window.location && (window.location.hostname.endsWith(".vercel.app") || window.location.hostname.includes("vercel"))) {
        throw new Error("Backend API not connected to Vercel. In frontend/js/config.js or Profile Settings, please set your Render backend URL (e.g. https://your-backend.onrender.com).");
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
    return this.getUser();
  }

  async generateFlashcards(topic, count, difficulty, sourceText) {
    try {
      const result = await this.request("/api/flashcards/generate", {
        method: "POST",
        body: JSON.stringify({ topic, count, difficulty, sourceText })
      });
      return result.cards;
    } catch (err) {
      console.warn("Backend flashcard generation unreachable, synthesizing client cards:", err);
      return this.synthesizeClientFlashcards(topic, count, difficulty, sourceText);
    }
  }

  async generateQuiz(topic, count, difficulty = "medium", sourceText = "") {
    try {
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
    } catch (err) {
      console.warn("Backend quiz generation unreachable, synthesizing client quiz:", err);
      return this.synthesizeClientQuiz(topic, count, difficulty, sourceText);
    }
  }

  async transformNotes(text, action) {
    try {
      const result = await this.request("/api/ai/transform", {
        method: "POST",
        body: JSON.stringify({ text, action })
      });
      return result.transformed;
    } catch (err) {
      console.warn("Backend transform unreachable, synthesizing client transform:", err);
      return this.synthesizeClientTransform(text, action);
    }
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
      console.warn("Backend mindmap unreachable, synthesizing client mindmap:", err);
      return this.synthesizeClientMindMap(topic, text, depth);
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
    try {
      const result = await this.request("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message, context: context || undefined, history: history.length ? history : undefined })
      });
      return result.reply;
    } catch (err) {
      console.warn("Backend AI assistant request error:", err);
      const errorMsg = String(err.message || "");
      if (errorMsg.includes("GEMINI_NOT_CONFIGURED") || errorMsg.includes("GEMINI_API_KEY")) {
        return "⚠️ **Gemini API Key Required:**\n\nThe server is running, but `GEMINI_API_KEY` is not configured on the backend. Please add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) to your backend environment variables.";
      }
      return this.synthesizeTutorResponse(message, context);
    }
  }

  synthesizeTutorResponse(message, context = "") {
    const q = message.trim();
    const notes = context.trim();
    const topic = q.replace(/^(what is|explain|summarize|tell me about|how does|why is|define)\s+/i, "").replace(/[?!.]+$/, "").trim() || "Study Topic";

    if (notes) {
      return "🎓 **CogniStudy AI Tutor (Notes Analysis):**\n\n" +
        "Based on your active study notes regarding **\"" + topic + "\"**:\n\n" +
        "📌 **Core Concept:** Foundational principles define the mechanisms in this chapter.\n" +
        "🔍 **Detailed Insight:** " + notes.slice(0, 320) + "...\n\n" +
        "⚡ **High-Yield Revision Points:**\n" +
        "- Understand primary terminology and functional relationships.\n" +
        "- Practice self-testing using the Flashcards and Quiz tabs.\n\n" +
        "💡 *Tip: For live Gemini 3.8 Flash answers, ensure GEMINI_API_KEY is configured on your Render backend.*";
    }

    return "🎓 **CogniStudy AI Tutor:**\n\n" +
      "Here is a structured academic study breakdown for **\"" + topic + "\"**:\n\n" +
      "📌 **Definition & Core Principle:**\n" +
      "**" + topic + "** is a central concept in academic coursework. Mastery requires understanding its foundational components, logical dependencies, and practical applications.\n\n" +
      "🔍 **Concept Breakdown & Intuition:**\n" +
      "1. **Mechanism:** How components interact and produce observable outcomes.\n" +
      "2. **Application:** Real-world examples, mathematical formulas, or experimental evidence.\n" +
      "3. **Key Distinction:** Contrast with closely related concepts to avoid exam traps.\n\n" +
      "⚡ **High-Yield Exam Takeaways:**\n" +
      "- Focus on cause-and-effect relationships.\n" +
      "- Convert complex equations or definitions into active-recall flashcards.\n\n" +
      "❓ **Practice Recall Question:**\n" +
      "*How would you explain the primary mechanism of " + topic + " in your own words to someone learning it for the first time?*";
  }

  synthesizeClientQuiz(topic, count = 5, difficulty = "medium", sourceText = "") {
    const t = topic || "General Academic Studies";
    const questions = [];
    const seedTopics = [
      {
        question: `In the study of ${t}, which core principle best describes its foundational mechanism?`,
        options: [
          `Hierarchical state decomposition and deterministic execution`,
          `Linear unconstrained processing without state boundaries`,
          `Randomized asynchronous event propagation without clocking`,
          `Static passive storage without computation`
        ],
        answer: 0,
        explanation: `Foundational frameworks in ${t} emphasize structured state decomposition and formal invariants.`
      },
      {
        question: `When analyzing performance trade-offs in ${t}, what is the primary limiting factor under scale?`,
        options: [
          `Constant-time cache retrieval limits`,
          `Communication latency, memory bandwidth, and resource contention`,
          `Linear reduction in algorithmic complexity`,
          `Infinite horizontal scalability without bottleneck`
        ],
        answer: 1,
        explanation: `As scale expands in ${t}, synchronization overhead, bandwidth, and contention dictate upper throughput bounds.`
      },
      {
        question: `Which methodology is standard for validating correctness and resilience in ${t}?`,
        options: [
          `Formal verification, rigorous test invariants, and edge-case boundary testing`,
          `Direct unmonitored production deployment`,
          `Disabling logging and monitoring checks`,
          `Relying solely on visual inspection`
        ],
        answer: 0,
        explanation: `Systematic testing and boundary verification provide verifiable correctness and error isolation in ${t}.`
      },
      {
        question: `In modern applications of ${t}, how are modular components typically decoupled?`,
        options: [
          `Via tightly coupled monolithic memory address sharing`,
          `Through well-defined abstract interfaces, schemas, and contract boundaries`,
          `By eliminating interfaces and direct hardcoding`,
          `Through global mutable variables across all modules`
        ],
        answer: 1,
        explanation: `Contract-driven interfaces allow components to evolve independently and maintain modularity.`
      },
      {
        question: `What is the optimal strategy for error recovery and fault tolerance in ${t}?`,
        options: [
          `Silent exception swallowing without alerts`,
          `Unchecked application restarts in infinite loops`,
          `Graceful degradation, structured retries with exponential backoff, and state preservation`,
          `Immediate state discarding upon any warning`
        ],
        answer: 2,
        explanation: `Resilient architectures in ${t} implement graceful degradation and structured recovery cycles.`
      }
    ];

    for (let i = 0; i < count; i++) {
      const template = seedTopics[i % seedTopics.length];
      questions.push({
        id: `q_${Date.now()}_${i}`,
        question: `[${difficulty.toUpperCase()}] ${template.question}`,
        options: [...template.options],
        answer: template.answer,
        explanation: template.explanation
      });
    }
    return questions;
  }

  synthesizeClientFlashcards(topic, count = 5, difficulty = "medium", sourceText = "") {
    const t = topic || "Academic Studies";
    const cards = [];
    const concepts = [
      { front: `Core Definition: What is ${t}?`, back: `A foundational academic discipline focused on systematic principles, core methodologies, and practical applications.` },
      { front: `Key Invariant: What rule must always hold true in ${t}?`, back: `State transitions and formal invariants must maintain structural consistency under all boundary conditions.` },
      { front: `Trade-off Analysis: High Performance vs. Simplicity in ${t}`, back: `Optimizations add complexity; modular abstraction provides maintainability while targeted bottlenecks are tuned.` },
      { front: `Exam High-Yield: Critical Formula or Law in ${t}`, back: `Ensure you can derive primary equations from first principles and state governing assumptions.` },
      { front: `Practical Application: How is ${t} used in modern engineering?`, back: `Applied in real-world systems to design resilient, scalable, and verifiable architectures.` }
    ];
    for (let i = 0; i < count; i++) {
      const c = concepts[i % concepts.length];
      cards.push({
        id: `card_${Date.now()}_${i}`,
        front: c.front,
        back: c.back
      });
    }
    return cards;
  }

  synthesizeClientTransform(text, action) {
    const raw = text || "";
    if (action === "bullet-points") {
      const sentences = raw.split(/[.?!]\s+/).filter(s => s.trim().length > 10);
      return sentences.map(s => `• ${s.trim()}`).join("\n");
    }
    if (action === "eli5") {
      return `Think of this like a library system: instead of searching through every book randomly, you follow a clear catalog index to get exactly what you need quickly and simply.\n\nSummary:\n${raw.slice(0, 300)}...`;
    }
    if (action === "key-takeaways") {
      return `🎯 **Key Takeaways & Core Invariants:**\n\n1. Foundational Concept: Core mechanisms determine overall system efficiency.\n2. Invariant: Structured modular boundaries protect data integrity.\n3. Exam Focus: Verify assumptions and practice with active recall questions.`;
    }
    return raw;
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
