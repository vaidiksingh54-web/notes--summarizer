/**
 * NoteWise AI — Frontend Prototype Script
 * 
 * Scope Notice:
 * - This script provides pure clientside demonstration interactions.
 * - No backend, database, external AI API keys, or live authentication services are used.
 * - Files (.txt and .md) are parsed directly in the browser using the HTML5 FileReader API.
 * - Quizzes are generated from a local curated question bank based on detected note keywords.
 * - Demo user profile information is stored only in the browser's localStorage for session persistence.
 */

/* ==========================================================================
   DOM Element Selectors
   ========================================================================== */

// Navigation & Global
const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");
const authTrigger = document.querySelector("#authTrigger");
const authTriggerText = document.querySelector("#authTriggerText");
const navAvatar = document.querySelector("#navAvatar");
const toast = document.querySelector("#toast");

// Summarizer Elements
const notesInput = document.querySelector("#notesInput");
const charCount = document.querySelector("#charCount");
const loadDemoBtn = document.querySelector("#loadDemo");
const fileInput = document.querySelector("#fileInput");
const fileName = document.querySelector("#fileName");
const fileDropLabel = document.querySelector("#fileDropLabel");
const generateBtn = document.querySelector("#generateBtn");
const clearNotesBtn = document.querySelector("#clearNotesBtn");
const summarizerMsg = document.querySelector("#summarizerMsg");
const outputContent = document.querySelector("#outputContent");
const emptyState = document.querySelector("#emptyState");
const loadingState = document.querySelector("#loadingState");
const loadingText = document.querySelector("#loadingText");
const summaryResult = document.querySelector("#summaryResult");
const summaryTitle = document.querySelector("#summaryTitle");
const summaryBody = document.querySelector("#summaryBody");
const keyPoints = document.querySelector("#keyPoints");
const importantTerms = document.querySelector("#importantTerms");
const readTime = document.querySelector("#readTime");
const outputActions = document.querySelector("#outputActions");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const sendToQuizBtn = document.querySelector("#sendToQuizBtn");
const regenerateBtn = document.querySelector("#regenerateBtn");
const clearBtn = document.querySelector("#clearBtn");

// Quiz Generator Elements
const quizNotesInput = document.querySelector("#quizNotesInput");
const quizCharCount = document.querySelector("#quizCharCount");
const useSummarizerNotesBtn = document.querySelector("#useSummarizerNotes");
const loadQuizDemoBtn = document.querySelector("#loadQuizDemo");
const generateQuizBtn = document.querySelector("#generateQuizBtn");
const clearQuizInputBtn = document.querySelector("#clearQuizInputBtn");
const quizMsg = document.querySelector("#quizMsg");
const quizEmptyState = document.querySelector("#quizEmptyState");
const quizLoadingState = document.querySelector("#quizLoadingState");
const quizLoadingText = document.querySelector("#quizLoadingText");
const quizRunner = document.querySelector("#quizRunner");
const quizProgressText = document.querySelector("#quizProgressText");
const quizDiffTag = document.querySelector("#quizDiffTag");
const quizProgressBar = document.querySelector("#quizProgressBar");
const quizQuestionText = document.querySelector("#quizQuestionText");
const quizOptionsList = document.querySelector("#quizOptionsList");
const quizPrevBtn = document.querySelector("#quizPrevBtn");
const quizNextBtn = document.querySelector("#quizNextBtn");
const quizSubmitBtn = document.querySelector("#quizSubmitBtn");
const quizScoreResult = document.querySelector("#quizScoreResult");
const quizScorePercent = document.querySelector("#quizScorePercent");
const quizScoreFraction = document.querySelector("#quizScoreFraction");
const quizScoreTitle = document.querySelector("#quizScoreTitle");
const quizScoreMessage = document.querySelector("#quizScoreMessage");
const quizReviewList = document.querySelector("#quizReviewList");
const quizRetakeBtn = document.querySelector("#quizRetakeBtn");
const quizNewBtn = document.querySelector("#quizNewBtn");

// Modals: Auth & Profile
const authModal = document.querySelector("#authModal");
const authClose = document.querySelector("#authClose");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authSubmit = document.querySelector("#authSubmit");
const authName = document.querySelector("#authName");
const authNameLabel = document.querySelector("#authNameLabel");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const passwordToggle = document.querySelector("#passwordToggle");
const forgotPassword = document.querySelector("#forgotPassword");

const profileModal = document.querySelector("#profileModal");
const profileClose = document.querySelector("#profileClose");
const profileTitle = document.querySelector("#profileTitle");
const profileHeaderMeta = document.querySelector("#profileHeaderMeta");
const profileAvatarDisplay = document.querySelector("#profileAvatarDisplay");
const editProfileBtn = document.querySelector("#editProfileBtn");
const profileViewMode = document.querySelector("#profileViewMode");
const profileEditMode = document.querySelector("#profileEditMode");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const signOutBtn = document.querySelector("#signOutBtn");
const profileSummarize = document.querySelector("#profileSummarize");
const profileQuiz = document.querySelector("#profileQuiz");

// Profile Fields
const viewName = document.querySelector("#viewName");
const viewEmail = document.querySelector("#viewEmail");
const viewMobile = document.querySelector("#viewMobile");
const viewAge = document.querySelector("#viewAge");
const viewAddress = document.querySelector("#viewAddress");
const viewCollege = document.querySelector("#viewCollege");
const viewCourse = document.querySelector("#viewCourse");
const viewSemester = document.querySelector("#viewSemester");
const viewBio = document.querySelector("#viewBio");

const editName = document.querySelector("#editName");
const editEmail = document.querySelector("#editEmail");
const editMobile = document.querySelector("#editMobile");
const editAge = document.querySelector("#editAge");
const editAddress = document.querySelector("#editAddress");
const editCollege = document.querySelector("#editCollege");
const editCourse = document.querySelector("#editCourse");
const editSemester = document.querySelector("#editSemester");
const editBio = document.querySelector("#editBio");

/* ==========================================================================
   State & Fictional Demo Data Models
   ========================================================================== */

let selectedLength = "short";
let selectedFormat = "paragraphs";
let generatedSummaryText = "";
let toastTimer = null;
let authMode = "login";
let isLoggedIn = false;
let summaryRequestId = 0;
let quizRequestId = 0;

// Summarizer Demo Content
const demoBiologyNotes = `Photosynthesis is the fundamental biological process through which green plants, algae, and certain cyanobacteria convert radiant solar energy into chemical energy in the form of glucose. This reaction takes place inside the chloroplasts, specialized cellular organelles containing the pigment chlorophyll, which absorbs light primarily in the blue and red wavelengths while reflecting green. 

The process occurs in two primary stages:
1. The light-dependent reactions take place within the thylakoid membranes. Here, absorbed photons energize electrons, driving photolysis (water molecules are split into hydrogen ions, electrons, and molecular oxygen gas). As electrons travel down the electron transport chain, high-energy molecules ATP and NADPH are synthesized.
2. The light-independent reactions (commonly known as the Calvin cycle or dark reactions) occur in the stroma of the chloroplast. ATP and NADPH provide the required biochemical energy to fix inorganic carbon dioxide (CO2) into glyceraldehyde-3-phosphate (G3P), which subsequently synthesizes glucose and other vital carbohydrates.

Environmental factors influencing photosynthetic efficiency include photon flux density (light intensity), ambient carbon dioxide concentration, ambient temperature, and water availability.`;

const demoComputerScienceNotes = `Artificial Intelligence (AI) and Machine Learning (ML) represent computational paradigms that enable software systems to learn from data patterns without explicit rule-based programming. Core subfields include Supervised Learning, Unsupervised Learning, and Reinforcement Learning.

In Supervised Learning, algorithms are trained on labeled datasets with defined input-output mappings (e.g., classification and regression). Key algorithms include Linear Regression, Decision Trees, Support Vector Machines (SVM), and Deep Neural Networks.
Unsupervised Learning extracts latent structures and clusters from unlabeled data, commonly utilizing K-Means Clustering, Principal Component Analysis (PCA), and autoencoders.
Reinforcement Learning optimizes decision policies through agents interacting with dynamic environments via feedback signals of rewards and penalties.

Deep Learning utilizes multilayer neural networks featuring artificial neurons, activation functions (such as ReLU, Sigmoid, and GELU), backpropagation for gradient calculation, and optimizers such as Adam and SGD. Modern breakthroughs in Natural Language Processing (NLP) stem from the Transformer architecture, which replaces recurrence with self-attention mechanisms to process contextual sequences in parallel.`;

// Fictional Student Profile Default Model
const defaultProfile = {
  name: "Alex Rivera",
  email: "demo@example.com",
  mobile: "+1 (555) 019-2834",
  age: "21",
  address: "124 Innovation Way, Tech District, CA",
  college: "Demo University",
  course: "B.Tech Computer Science",
  semester: "3rd Year (Semester 6)",
  bio: "Focusing on Artificial Intelligence, distributed computing, and rapid exam preparation.",
  notesSummarized: 24,
  quizzesCompleted: 12,
  avgScore: "92%",
  streak: 7
};

let userProfile = { ...defaultProfile };

function normalizeProfile(profile) {
  const merged = {
    ...defaultProfile,
    ...(profile && typeof profile === "object" ? profile : {})
  };

  [
    "name",
    "email",
    "mobile",
    "age",
    "address",
    "college",
    "course",
    "semester",
    "bio",
    "avgScore"
  ].forEach(field => {
    if (typeof merged[field] !== "string") {
      merged[field] = String(defaultProfile[field]);
    }
  });

  ["notesSummarized", "quizzesCompleted", "streak"].forEach(field => {
    const numericValue = Number(merged[field]);
    merged[field] = Number.isFinite(numericValue) ? numericValue : defaultProfile[field];
  });

  return merged;
}

/* ==========================================================================
   Curated Local Question Bank for Interactive Quiz Generation
   ========================================================================== */

const quizBank = {
  biology: [
    {
      question: "Where do the light-dependent reactions of photosynthesis specifically take place?",
      options: [
        "In the thylakoid membranes of chloroplasts",
        "Within the fluid stroma surrounding thylakoids",
        "Inside the inner mitochondrial matrix",
        "In the outer cellular cytoplasm"
      ],
      answer: 0,
      difficulty: "easy",
      explanation: "Light-dependent reactions occur in the thylakoid membranes where chlorophyll pigment molecules absorb light photons."
    },
    {
      question: "Which chemical by-product is released during the photolysis stage of photosynthesis?",
      options: [
        "Carbon Dioxide (CO2)",
        "Molecular Oxygen (O2)",
        "Methane (CH4)",
        "Nitrogen Gas (N2)"
      ],
      answer: 1,
      difficulty: "easy",
      explanation: "Water molecules (H2O) are split during photolysis, releasing O2 gas into the atmosphere as a by-product."
    },
    {
      question: "What are the two primary high-energy chemical carriers produced during the light reactions for use in the Calvin cycle?",
      options: [
        "NADH and FADH2",
        "ATP and NADPH",
        "Glucose and Ribose",
        "Pyruvate and Lactate"
      ],
      answer: 1,
      difficulty: "medium",
      explanation: "ATP and NADPH synthesized during light reactions provide the chemical energy and reducing power for the Calvin cycle."
    },
    {
      question: "In which sub-compartment of the chloroplast does carbon fixation in the Calvin cycle occur?",
      options: [
        "Thylakoid lumen",
        "Granum junction",
        "Chloroplast stroma",
        "Inner membrane interspace"
      ],
      answer: 2,
      difficulty: "medium",
      explanation: "The Calvin cycle takes place in the stroma, the enzymatic liquid matrix enclosing the grana within chloroplasts."
    },
    {
      question: "Which enzyme is primarily responsible for catalyzing the initial fixation of carbon dioxide in C3 photosynthetic pathways?",
      options: [
        "ATP Synthase",
        "RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase)",
        "DNA Polymerase III",
        "Phosphofructokinase"
      ],
      answer: 1,
      difficulty: "hard",
      explanation: "RuBisCO is the primary catalyst that fixes atmospheric CO2 onto ribulose-1,5-bisphosphate to form 3-PGA."
    },
    {
      question: "How does an elevation in temperature past an enzyme's optimum point typically impact photosynthesis?",
      options: [
        "Accelerates the rate indefinitely",
        "Causes thermal denaturation of vital photosynthetic enzymes, sharply reducing the rate",
        "Has zero effect because photolysis is solely photon-dependent",
        "Converts chlorophyll from green to red"
      ],
      answer: 1,
      difficulty: "hard",
      explanation: "Excessive temperatures denature enzymatic catalysts such as RuBisCO, causing a rapid decline in photosynthetic output."
    }
  ],
  cs: [
    {
      question: "Which paradigm of Machine Learning relies upon labeled training data with known input-output pairs?",
      options: [
        "Supervised Learning",
        "Unsupervised Learning",
        "Self-organizing Clustering",
        "Pure Heuristic Search"
      ],
      answer: 0,
      difficulty: "easy",
      explanation: "Supervised learning algorithms are trained using feature sets that have corresponding ground-truth target labels."
    },
    {
      question: "Which of the following algorithms is commonly applied for clustering unlabeled data in Unsupervised Learning?",
      options: [
        "Linear Regression",
        "K-Means Clustering",
        "Binary Logistic Regression",
        "Convolutional Filter"
      ],
      answer: 1,
      difficulty: "easy",
      explanation: "K-Means partitions observations into k distinct clusters based on Euclidean distance to geometric centroids."
    },
    {
      question: "What core mechanism enables Transformer architectures to process entire sequence contexts simultaneously without recurrent cells?",
      options: [
        "Recurrent Feedback Loops",
        "Self-Attention Mechanism",
        "Random Dropout Pruning",
        "Max Pooling Layers"
      ],
      answer: 1,
      difficulty: "medium",
      explanation: "Self-attention computes dynamic relational weights across all tokens in a sequence concurrently."
    },
    {
      question: "In Deep Learning optimization, what is the role of backpropagation?",
      options: [
        "To initialize model weights to zero",
        "To calculate gradients of the loss function with respect to weights using the chain rule",
        "To compress the dataset into binary format",
        "To prevent CPU thermal throttling"
      ],
      answer: 1,
      difficulty: "medium",
      explanation: "Backpropagation applies the calculus chain rule backwards from output to input to compute weight gradients."
    },
    {
      question: "Which activation function is most widely adopted in hidden layers of deep networks to mitigate the vanishing gradient problem?",
      options: [
        "Standard Sigmoid",
        "Rectified Linear Unit (ReLU)",
        "Linear Step Function",
        "Constant Bias Unit"
      ],
      answer: 1,
      difficulty: "hard",
      explanation: "ReLU, defined as max(0, x), retains a constant derivative of 1 for positive values, preventing gradient saturation."
    },
    {
      question: "What distinguishes Reinforcement Learning fundamentally from Supervised and Unsupervised Learning?",
      options: [
        "It only works with textual datasets",
        "It optimizes actions through reward and penalty feedback signals from an environment",
        "It eliminates mathematical matrices",
        "It cannot be combined with neural networks"
      ],
      answer: 1,
      difficulty: "hard",
      explanation: "Reinforcement Learning trains autonomous agents to maximize cumulative rewards through trial-and-error environmental interaction."
    }
  ],
  general: [
    {
      question: "What is the primary cognitive benefit of Active Recall over passive re-reading during revision?",
      options: [
        "It stimulates neurological retrieval pathways, creating far stronger memory consolidation",
        "It takes less physical effort than reading",
        "It replaces the necessity of understanding concepts",
        "It guarantees 100% test scores without sleep"
      ],
      answer: 0,
      difficulty: "easy",
      explanation: "Active recall forces the brain to retrieve information from memory, significantly enhancing synaptic retention."
    },
    {
      question: "How does the Spaced Repetition method optimize human memory retention?",
      options: [
        "By reviewing material at systematic increasing intervals just before forgetting occurs",
        "By cramming 14 hours continuously prior to an exam",
        "By reading the entire textbook in reverse order",
        "By memorizing only the first letter of each paragraph"
      ],
      answer: 0,
      difficulty: "medium",
      explanation: "Spaced repetition counters Ebbinghaus's forgetting curve by revisiting material at strategic time intervals."
    },
    {
      question: "What is the Feynman Technique in academic learning?",
      options: [
        "Explaining a complex topic in simple terms as if teaching it to a beginner to identify knowledge gaps",
        "Writing 5,000 words on a topic without looking at sources",
        "Using mathematical formulas exclusively for humanities subjects",
        "Memorizing flashcards while listening to loud audio"
      ],
      answer: 0,
      difficulty: "medium",
      explanation: "The Feynman Technique clarifies understanding by translating complex concepts into plain, concise language."
    }
  ]
};

// Quiz Runner Live Session State
let activeQuizQuestions = [];
let currentQuestionIndex = 0;
let userSelectedAnswers = {};
let selectedQuizCount = 3;
let selectedQuizDifficulty = "easy";

/* ==========================================================================
   Toast & Alert Helper Functions
   ========================================================================== */

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function showInlineMsg(element, text, type = "warning") {
  if (!element) return;
  element.className = `inline-msg ${type}`;
  element.innerHTML = `<span>${type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️'}</span> ${text}`;
  element.hidden = false;
}

function hideInlineMsg(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = "";
}

/* ==========================================================================
   User Profile & Authentication State Management (Local Demo)
   ========================================================================== */

function initProfileState() {
  // Check if demo profile was previously saved in localStorage
  try {
    const savedProfile = localStorage.getItem("notewise_demo_profile");
    if (savedProfile) {
      userProfile = normalizeProfile(JSON.parse(savedProfile));
    }
    const savedAuth = localStorage.getItem("notewise_demo_auth");
    if (savedAuth === "true") {
      isLoggedIn = true;
    }
  } catch (e) {
    console.warn("Local storage unavailable; running in temporary browser state.");
  }
  updateAuthUI();
  populateProfileFields();
}

function updateAuthUI() {
  if (isLoggedIn) {
    const initials = userProfile.name
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "AR";
    
    authTriggerText.textContent = userProfile.name.split(" ")[0] || "Profile";
    navAvatar.textContent = initials;
    authTrigger.setAttribute("aria-label", `Open ${userProfile.name}'s profile`);
  } else {
    authTriggerText.textContent = "Sign in";
    navAvatar.textContent = "↗";
    authTrigger.setAttribute("aria-label", "Open sign in dialog");
  }
}

function populateProfileFields() {
  // Update view mode display
  viewName.textContent = userProfile.name;
  viewEmail.textContent = userProfile.email;
  viewMobile.textContent = userProfile.mobile;
  viewAge.textContent = userProfile.age;
  viewAddress.textContent = userProfile.address;
  viewCollege.textContent = userProfile.college;
  viewCourse.textContent = userProfile.course;
  viewSemester.textContent = userProfile.semester;
  viewBio.textContent = userProfile.bio;

  profileTitle.textContent = userProfile.name;
  profileHeaderMeta.textContent = `${userProfile.email} · ${userProfile.college}`;
  
  const initials = userProfile.name
    .split(" ")
    .map(p => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AR";
  profileAvatarDisplay.textContent = initials;

  // Stats
  document.querySelector("#statNotesCount").textContent = userProfile.notesSummarized;
  document.querySelector("#statQuizCount").textContent = userProfile.quizzesCompleted;
  document.querySelector("#statAvgScore").textContent = userProfile.avgScore;
  document.querySelector("#statStreak").textContent = userProfile.streak;

  // Update edit form values
  editName.value = userProfile.name;
  editEmail.value = userProfile.email;
  editMobile.value = userProfile.mobile;
  editAge.value = userProfile.age;
  editAddress.value = userProfile.address;
  editCollege.value = userProfile.college;
  editCourse.value = userProfile.course;
  editSemester.value = userProfile.semester;
  editBio.value = userProfile.bio;
}

function saveProfileEdits() {
  userProfile.name = editName.value.trim() || userProfile.name;
  userProfile.email = editEmail.value.trim() || userProfile.email;
  userProfile.mobile = editMobile.value.trim() || userProfile.mobile;
  userProfile.age = editAge.value.trim() || userProfile.age;
  userProfile.address = editAddress.value.trim() || userProfile.address;
  userProfile.college = editCollege.value.trim() || userProfile.college;
  userProfile.course = editCourse.value.trim() || userProfile.course;
  userProfile.semester = editSemester.value.trim() || userProfile.semester;
  userProfile.bio = editBio.value.trim() || userProfile.bio;

  try {
    localStorage.setItem("notewise_demo_profile", JSON.stringify(userProfile));
  } catch (e) {
    console.warn("Could not save to localStorage.");
  }

  populateProfileFields();
  updateAuthUI();
  toggleProfileEditMode(false);
  showToast("Demo profile updated locally in current browser.");
}

function toggleProfileEditMode(isEditing) {
  profileViewMode.hidden = isEditing;
  profileEditMode.hidden = !isEditing;
}

/* ==========================================================================
   Modals Management (Auth & Profile)
   ========================================================================== */

function toggleModal(modal, open) {
  if (!modal) return;
  modal.hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) {
    const focusable = modal.querySelector("button, input, textarea");
    if (focusable) focusable.focus();
  }
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.authMode === mode);
  });
  const isSignUp = mode === "signup";
  authTitle.textContent = isSignUp ? "Create demo account." : "Welcome back.";
  authSubmit.innerHTML = `${isSignUp ? "Create demo account" : "Sign in to NoteWise"} <span>↗</span>`;
  authName.hidden = !isSignUp;
  authNameLabel.hidden = !isSignUp;
  authName.required = isSignUp;
  forgotPassword.hidden = isSignUp;
}

/* ==========================================================================
   Navigation & Mobile Hamburger Menu
   ========================================================================== */

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

// Smooth-scroll navigation handlers & mobile auto-close
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const targetId = link.getAttribute("href");
    if (targetId === "#" || !targetId) return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      event.preventDefault();
      // Close mobile drawer if open
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");

      targetElement.scrollIntoView({ behavior: "smooth" });
      history.pushState(null, "", targetId);
    }
  });
});

// Auth / Profile trigger button in header
authTrigger.addEventListener("click", () => {
  // If mobile nav is open, close it first
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");

  if (isLoggedIn) {
    toggleProfileEditMode(false);
    toggleModal(profileModal, true);
  } else {
    setAuthMode("login");
    toggleModal(authModal, true);
  }
});

// Modal Close Triggers
authClose.addEventListener("click", () => toggleModal(authModal, false));
profileClose.addEventListener("click", () => toggleModal(profileModal, false));

// Backdrop click closes modals
[authModal, profileModal].forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) toggleModal(modal, false);
  });
});

// Global Escape Key Listener
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    toggleModal(authModal, false);
    toggleModal(profileModal, false);
    if (mainNav.classList.contains("open")) {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }
  }
});

// Auth form switching & submission
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode));
});

passwordToggle.addEventListener("click", () => {
  const isText = authPassword.type === "text";
  authPassword.type = isText ? "password" : "text";
  passwordToggle.textContent = isText ? "Show" : "Hide";
  passwordToggle.setAttribute("aria-label", isText ? "Show password" : "Hide password");
});

forgotPassword.addEventListener("click", () => {
  showToast("Password reset is simulated in this frontend demo.");
});

authForm.addEventListener("submit", event => {
  event.preventDefault();
  isLoggedIn = true;
  if (authMode === "signup" && authName.value.trim()) {
    userProfile.name = authName.value.trim();
  }
  try {
    localStorage.setItem("notewise_demo_auth", "true");
    localStorage.setItem("notewise_demo_profile", JSON.stringify(userProfile));
  } catch (e) {
    console.warn("Storage write failed.");
  }
  updateAuthUI();
  populateProfileFields();
  toggleModal(authModal, false);
  authForm.reset();
  showToast(authMode === "signup" ? "Demo account created! Welcome to NoteWise AI." : `Welcome back, ${userProfile.name}!`);
});

// Profile Modal Actions
editProfileBtn.addEventListener("click", () => toggleProfileEditMode(true));
cancelEditBtn.addEventListener("click", () => {
  populateProfileFields();
  toggleProfileEditMode(false);
});

profileEditMode.addEventListener("submit", event => {
  event.preventDefault();
  saveProfileEdits();
});

signOutBtn.addEventListener("click", () => {
  isLoggedIn = false;
  try {
    localStorage.removeItem("notewise_demo_auth");
  } catch (e) {
    console.warn("Storage clear failed.");
  }
  updateAuthUI();
  toggleModal(profileModal, false);
  showToast("Signed out of demo session.");
});

profileSummarize.addEventListener("click", () => {
  toggleModal(profileModal, false);
  document.querySelector("#summarizer").scrollIntoView({ behavior: "smooth" });
});

profileQuiz.addEventListener("click", () => {
  toggleModal(profileModal, false);
  document.querySelector("#quiz-generator").scrollIntoView({ behavior: "smooth" });
});

/* ==========================================================================
   AI Notes Summarizer Logic
   ========================================================================== */

function updateSummarizerCharCount() {
  const count = notesInput.value.length;
  charCount.textContent = `${count.toLocaleString()} / 12,000 characters`;
}

notesInput.addEventListener("input", () => {
  updateSummarizerCharCount();
  if (notesInput.value.trim()) {
    hideInlineMsg(summarizerMsg);
  }
});

// Load Demo Notes
loadDemoBtn.addEventListener("click", () => {
  notesInput.value = demoBiologyNotes;
  updateSummarizerCharCount();
  hideInlineMsg(summarizerMsg);
  showToast("Biology lecture notes loaded into Summarizer.");
});

// Clear Notes Input Button
clearNotesBtn.addEventListener("click", () => {
  if (!loadingState.hidden) {
    summaryRequestId++;
    setSummarizerLoading(false);
  }
  notesInput.value = "";
  updateSummarizerCharCount();
  fileInput.value = "";
  fileName.textContent = "Browse from your device";
  hideInlineMsg(summarizerMsg);
  showToast("Notes cleared.");
});

// File Upload Support (.txt and .md via HTML5 FileReader; PDF/DOCX simulated note)
function handleSelectedFile(file) {
  if (!file) return;

  fileName.textContent = `Selected: ${file.name}`;
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "txt" || ext === "md") {
    const reader = new FileReader();
    reader.onload = (e) => {
      notesInput.value = e.target.result;
      updateSummarizerCharCount();
      showInlineMsg(summarizerMsg, `Successfully read text from "${file.name}" in-browser.`, "success");
      showToast(`Loaded ${file.name} directly into workspace.`);
    };
    reader.onerror = () => {
      showInlineMsg(summarizerMsg, "Error reading text file in browser.", "error");
    };
    reader.readAsText(file);
  } else {
    // For PDF and DOCX
    notesInput.value = demoBiologyNotes;
    updateSummarizerCharCount();
    showInlineMsg(
      summarizerMsg,
      `Detected .${ext} file. In this frontend prototype, demo content was loaded. (Live PDF/DOCX text extraction requires backend services: pdf-parse / Mammoth.js in future release).`,
      "warning"
    );
    showToast(`Loaded simulated text for .${ext} file.`);
  }
}

fileInput.addEventListener("change", () => {
  handleSelectedFile(fileInput.files[0]);
});

["dragenter", "dragover"].forEach(eventName => {
  fileDropLabel.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    fileDropLabel.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(eventName => {
  fileDropLabel.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    fileDropLabel.classList.remove("dragging");
  });
});

fileDropLabel.addEventListener("drop", event => {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  // Keep the input state in sync where the browser permits assigning a FileList.
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
  } catch (error) {
    // The dropped file is still processed if this browser blocks assignment.
  }

  handleSelectedFile(file);
});

// Summary Style Selector Buttons (Length & Format)
document.querySelectorAll('.option[data-group="length"]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.option[data-group="length"]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedLength = btn.dataset.value;
  });
});

document.querySelectorAll('.option[data-group="format"]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.option[data-group="format"]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedFormat = btn.dataset.value;
  });
});

function setSummarizerLoading(isLoading) {
  emptyState.hidden = isLoading;
  summaryResult.hidden = true;
  loadingState.hidden = !isLoading;
  outputActions.hidden = true;
  generateBtn.disabled = isLoading;
  regenerateBtn.disabled = isLoading;
}

function renderSummaryOutput() {
  const inputLower = notesInput.value.toLowerCase();
  const isCS = inputLower.includes("machine learning") || inputLower.includes("algorithm") || inputLower.includes("ai") || inputLower.includes("neural");

  const title = isCS ? "Artificial Intelligence & Machine Learning Overview" : "Photosynthesis & Energy Conversion";
  const lengthDetailed = selectedLength === "detailed";
  const lengthMedium = selectedLength === "medium";

  let bodyHtml = "";
  let pointsList = [];
  let termsList = [];

  if (isCS) {
    termsList = lengthDetailed
      ? ["Supervised Learning", "Unsupervised Learning", "Transformers", "Backpropagation", "ReLU", "Reinforcement Learning"]
      : ["Machine Learning", "Neural Networks", "Transformers", "Supervised Learning"];

    pointsList = lengthDetailed
      ? [
          "Supervised learning algorithms map labeled inputs to outputs (regression and classification).",
          "Unsupervised methods discover hidden structures and groupings (K-Means, PCA).",
          "Deep learning leverages backpropagation and non-linear activations (ReLU) to optimize neural network weights.",
          "Modern NLP is driven by self-attention in the Transformer architecture, processing sequences in parallel."
        ]
      : [
          "Machine learning allows computers to recognize patterns from data without hand-crafted rules.",
          "Supervised and unsupervised paradigms address labeled and unlabeled challenges respectively.",
          "Transformers utilize self-attention mechanisms for advanced natural language tasks."
        ];

    const paragraphText = lengthDetailed
      ? "Artificial Intelligence and Machine Learning enable computers to deduce high-dimensional patterns from empirical data. Supervised learning maps labeled inputs, unsupervised learning clusters raw inputs, and deep neural networks calculate gradients via backpropagation. Recent state-of-the-art NLP models leverage self-attention within Transformers for parallel context synthesis."
      : lengthMedium
        ? "Machine Learning provides automated learning mechanisms across supervised, unsupervised, and reinforcement paradigms. Deep neural networks apply backpropagation for optimization, while Transformers lead natural language representation."
        : "Machine learning allows systems to identify patterns and make predictions from data through supervised, unsupervised, and deep learning architectures.";

    if (selectedFormat === "bullets") {
      bodyHtml = `<ul class="formatted-bullets">${pointsList.map(p => `<li>${p}</li>`).join("")}</ul>`;
    } else if (selectedFormat === "keypoints") {
      bodyHtml = `<p><strong>Core Concept:</strong> ${paragraphText}</p><p><strong>Strategic Takeaway:</strong> Self-attention and backpropagation form the algorithmic backbone of modern deep learning applications.</p>`;
    } else {
      bodyHtml = `<p>${paragraphText}</p>`;
    }

    generatedSummaryText = `${title}\n\n${paragraphText}\n\nKey Points:\n${pointsList.map(p => `• ${p}`).join("\n")}\n\nImportant Terms: ${termsList.join(", ")}`;
  } else {
    // Biology / Default
    termsList = lengthDetailed
      ? ["Chloroplasts", "Chlorophyll", "Photolysis", "Calvin cycle", "ATP", "NADPH", "RuBisCO"]
      : ["Chloroplasts", "Chlorophyll", "Calvin cycle", "ATP"];

    pointsList = lengthDetailed
      ? [
          "Light-dependent reactions in thylakoid membranes convert solar photons into ATP and NADPH.",
          "Photolysis splits water molecules, producing electrons and releasing molecular oxygen (O2).",
          "The light-independent Calvin cycle fixes atmospheric CO2 into glucose within the stroma.",
          "Light intensity, temperature, and carbon dioxide concentration govern the maximum photosynthetic rate."
        ]
      : [
          "Chlorophyll absorbs solar photons within thylakoid membranes.",
          "Water molecules undergo photolysis, releasing oxygen gas as a by-product.",
          "The Calvin cycle synthesizes glucose using ATP and NADPH in the chloroplast stroma."
        ];

    const paragraphText = lengthDetailed
      ? "Photosynthesis is the cellular process by which photoautotrophic organisms convert light energy into chemical energy stored in glucose. Light-dependent reactions in the thylakoid membrane produce ATP, NADPH, and oxygen via water photolysis. Subsequently, the Calvin cycle in the stroma fixes carbon dioxide into carbohydrates, regulated by ambient temperature, photon flux, and CO2 availability."
      : lengthMedium
        ? "Photosynthesis takes place within chloroplasts where chlorophyll captures solar radiation. Light-dependent reactions generate ATP and NADPH while discharging oxygen, fueling the stroma's Calvin cycle to synthesize glucose."
        : "Plants transform sunlight into chemical energy inside chloroplasts, generating glucose and releasing oxygen gas through light reactions and the Calvin cycle.";

    if (selectedFormat === "bullets") {
      bodyHtml = `<ul class="formatted-bullets">${pointsList.map(p => `<li>${p}</li>`).join("")}</ul>`;
    } else if (selectedFormat === "keypoints") {
      bodyHtml = `<p><strong>Core Concept:</strong> ${paragraphText}</p><p><strong>Significance:</strong> Provides the fundamental energetic foundation and atmospheric oxygen for terrestrial food webs.</p>`;
    } else {
      bodyHtml = `<p>${paragraphText}</p>`;
    }

    generatedSummaryText = `${title}\n\n${paragraphText}\n\nKey Points:\n${pointsList.map(p => `• ${p}`).join("\n")}\n\nImportant Terms: ${termsList.join(", ")}`;
  }

  summaryTitle.textContent = title;
  summaryBody.innerHTML = bodyHtml;
  keyPoints.innerHTML = pointsList.map(pt => `<li>${pt}</li>`).join("");
  importantTerms.innerHTML = termsList.map(t => `<span>${t}</span>`).join("");
  readTime.textContent = `${lengthDetailed ? "4" : lengthMedium ? "3" : "2"} MIN READ`;

  loadingState.hidden = true;
  summaryResult.hidden = false;
  outputActions.hidden = false;
  generateBtn.disabled = false;
  regenerateBtn.disabled = false;
}

function handleGenerateSummary() {
  const content = notesInput.value.trim();
  if (!content) {
    showInlineMsg(summarizerMsg, "Please paste notes or load sample content before generating a summary.", "warning");
    showToast("Add some notes first to generate a summary.");
    notesInput.focus();
    return;
  }

  hideInlineMsg(summarizerMsg);
  setSummarizerLoading(true);
  const requestId = ++summaryRequestId;

  const steps = [
    "Analyzing notes structure...",
    "Extracting key concepts...",
    "Preparing demo summary view..."
  ];
  let stepIdx = 0;
  loadingText.textContent = steps[stepIdx];

  const timer = setInterval(() => {
    stepIdx++;
    if (stepIdx < steps.length) {
      loadingText.textContent = steps[stepIdx];
    }
  }, 450);

  setTimeout(() => {
    clearInterval(timer);
    if (requestId !== summaryRequestId) return;
    renderSummaryOutput();
    showToast("Demo summary generated successfully.");
  }, 1450);
}

generateBtn.addEventListener("click", handleGenerateSummary);
regenerateBtn.addEventListener("click", handleGenerateSummary);

// Clear Summarizer Output
clearBtn.addEventListener("click", () => {
  summaryRequestId++;
  emptyState.hidden = false;
  loadingState.hidden = true;
  summaryResult.hidden = true;
  outputActions.hidden = true;
  generateBtn.disabled = false;
  regenerateBtn.disabled = false;
  generatedSummaryText = "";
  showToast("Summary output cleared.");
});

// Copy Summary
copyBtn.addEventListener("click", async () => {
  if (!generatedSummaryText) return;
  try {
    await navigator.clipboard.writeText(generatedSummaryText);
    showToast("Summary copied to clipboard.");
  } catch (e) {
    showToast("Copy permission denied in browser.");
  }
});

// Download Summary (.txt file)
downloadBtn.addEventListener("click", () => {
  if (!generatedSummaryText) return;
  const blob = new Blob([generatedSummaryText], { type: "text/plain;charset=utf-8" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = "NoteWise-AI-Summary.txt";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);
  showToast("Downloaded NoteWise-AI-Summary.txt");
});

// Send Notes to Quiz Generator
sendToQuizBtn.addEventListener("click", () => {
  quizNotesInput.value = notesInput.value;
  updateQuizCharCount();
  hideInlineMsg(quizMsg);
  document.querySelector("#quiz-generator").scrollIntoView({ behavior: "smooth" });
  showToast("Notes sent to Quiz Generator! Click Generate Quiz to begin.");
});

/* ==========================================================================
   AI Quiz Generator Logic (Interactive Runner & Result Screen)
   ========================================================================== */

function updateQuizCharCount() {
  const count = quizNotesInput.value.length;
  quizCharCount.textContent = `${count.toLocaleString()} / 12,000 characters`;
}

quizNotesInput.addEventListener("input", () => {
  updateQuizCharCount();
  if (quizNotesInput.value.trim()) {
    hideInlineMsg(quizMsg);
  }
});

// Quick Load Buttons
useSummarizerNotesBtn.addEventListener("click", () => {
  if (!notesInput.value.trim()) {
    showToast("Please enter or load notes in the Summarizer first.");
    return;
  }
  quizNotesInput.value = notesInput.value;
  updateQuizCharCount();
  hideInlineMsg(quizMsg);
  showToast("Loaded notes from Summarizer.");
});

loadQuizDemoBtn.addEventListener("click", () => {
  quizNotesInput.value = demoComputerScienceNotes;
  updateQuizCharCount();
  hideInlineMsg(quizMsg);
  showToast("Computer Science sample notes loaded into Quiz Generator.");
});

clearQuizInputBtn.addEventListener("click", () => {
  quizRequestId++;
  quizNotesInput.value = "";
  updateQuizCharCount();
  hideInlineMsg(quizMsg);
  quizLoadingState.hidden = true;
  quizRunner.hidden = true;
  quizScoreResult.hidden = true;
  quizEmptyState.hidden = false;
  generateQuizBtn.disabled = false;
  showToast("Quiz notes cleared.");
});

// Quiz Options: Count & Difficulty Selection
document.querySelectorAll('.quiz-option[data-group="quiz-count"]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.quiz-option[data-group="quiz-count"]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedQuizCount = parseInt(btn.dataset.value, 10);
  });
});

document.querySelectorAll('.quiz-option[data-group="quiz-diff"]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.quiz-option[data-group="quiz-diff"]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedQuizDifficulty = btn.dataset.value;
  });
});

// Topic Detection & Question Bank Filtering
function buildQuizQuestions(notesText, count, difficulty) {
  const lower = notesText.toLowerCase();
  let pool = [];

  if (lower.includes("photosynthesis") || lower.includes("chloroplast") || lower.includes("biology") || lower.includes("plant")) {
    pool = [...quizBank.biology, ...quizBank.general];
  } else if (lower.includes("machine learning") || lower.includes("algorithm") || lower.includes("intelligence") || lower.includes("neural") || lower.includes("computer")) {
    pool = [...quizBank.cs, ...quizBank.general];
  } else {
    pool = [...quizBank.general, ...quizBank.biology, ...quizBank.cs];
  }

  // Filter or prioritize by requested difficulty
  let matched = pool.filter(q => q.difficulty === difficulty);
  if (matched.length < count) {
    const remaining = pool.filter(q => q.difficulty !== difficulty);
    matched = matched.concat(remaining);
  }

  // Cap at count requested
  return matched.slice(0, count);
}

function handleGenerateQuiz() {
  const text = quizNotesInput.value.trim();
  if (!text) {
    showInlineMsg(quizMsg, "Please provide study notes to generate quiz questions.", "warning");
    showToast("Add notes to generate a practice quiz.");
    quizNotesInput.focus();
    return;
  }

  hideInlineMsg(quizMsg);
  quizEmptyState.hidden = true;
  quizScoreResult.hidden = true;
  quizRunner.hidden = true;
  quizLoadingState.hidden = false;
  generateQuizBtn.disabled = true;
  const requestId = ++quizRequestId;

  const steps = [
    "Analyzing study material...",
    "Formulating question stems...",
    "Building interactive quiz..."
  ];
  let stepIdx = 0;
  quizLoadingText.textContent = steps[stepIdx];

  const interval = setInterval(() => {
    stepIdx++;
    if (stepIdx < steps.length) {
      quizLoadingText.textContent = steps[stepIdx];
    }
  }, 450);

  setTimeout(() => {
    clearInterval(interval);
    if (requestId !== quizRequestId) return;
    quizLoadingState.hidden = true;
    generateQuizBtn.disabled = false;

    activeQuizQuestions = buildQuizQuestions(text, selectedQuizCount, selectedQuizDifficulty);
    currentQuestionIndex = 0;
    userSelectedAnswers = {};

    renderCurrentQuizQuestion();
    quizRunner.hidden = false;
    showToast(`Quiz generated with ${activeQuizQuestions.length} questions.`);
  }, 1400);
}

generateQuizBtn.addEventListener("click", handleGenerateQuiz);

// Quiz Runner Question Display
function renderCurrentQuizQuestion() {
  const q = activeQuizQuestions[currentQuestionIndex];
  if (!q) return;

  const total = activeQuizQuestions.length;
  quizProgressText.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
  quizDiffTag.textContent = q.difficulty.toUpperCase();
  quizProgressBar.style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;
  quizQuestionText.textContent = q.question;

  const letters = ["A", "B", "C", "D"];
  quizOptionsList.innerHTML = q.options.map((opt, i) => {
    const isSelected = userSelectedAnswers[currentQuestionIndex] === i;
    return `
      <div class="quiz-option-card ${isSelected ? 'selected' : ''}" data-opt-index="${i}" role="radio" aria-checked="${isSelected}" tabindex="0">
        <span class="quiz-option-letter">${letters[i]}</span>
        <span class="quiz-option-text">${opt}</span>
      </div>
    `;
  }).join("");

  // Attach click & keyboard listeners to option cards
  quizOptionsList.querySelectorAll(".quiz-option-card").forEach(card => {
    const handleSelect = () => {
      const idx = parseInt(card.dataset.optIndex, 10);
      userSelectedAnswers[currentQuestionIndex] = idx;
      quizOptionsList.querySelectorAll(".quiz-option-card").forEach(c => {
        c.classList.remove("selected");
        c.setAttribute("aria-checked", "false");
      });
      card.classList.add("selected");
      card.setAttribute("aria-checked", "true");
    };

    card.addEventListener("click", handleSelect);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    });
  });

  // Navigation button states
  quizPrevBtn.disabled = currentQuestionIndex === 0;
  quizPrevBtn.style.opacity = currentQuestionIndex === 0 ? "0.4" : "1";

  if (currentQuestionIndex === total - 1) {
    quizNextBtn.hidden = true;
    quizSubmitBtn.hidden = false;
  } else {
    quizNextBtn.hidden = false;
    quizSubmitBtn.hidden = true;
  }
}

quizPrevBtn.addEventListener("click", () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderCurrentQuizQuestion();
  }
});

quizNextBtn.addEventListener("click", () => {
  if (currentQuestionIndex < activeQuizQuestions.length - 1) {
    currentQuestionIndex++;
    renderCurrentQuizQuestion();
  }
});

// Quiz Submission & Scoring
quizSubmitBtn.addEventListener("click", () => {
  const answeredCount = Object.keys(userSelectedAnswers).length;
  const total = activeQuizQuestions.length;

  if (answeredCount < total) {
    showToast(`Please answer all ${total} questions before submitting (answered: ${answeredCount}/${total}).`);
    return;
  }

  let correctCount = 0;
  activeQuizQuestions.forEach((q, i) => {
    if (userSelectedAnswers[i] === q.answer) {
      correctCount++;
    }
  });

  const percent = Math.round((correctCount / total) * 100);

  // Update profile stats in demo state
  userProfile.quizzesCompleted += 1;
  document.querySelector("#statQuizCount").textContent = userProfile.quizzesCompleted;
  try {
    localStorage.setItem("notewise_demo_profile", JSON.stringify(userProfile));
  } catch (e) {}

  // Render Score Screen
  quizScorePercent.textContent = `${percent}%`;
  quizScoreFraction.textContent = `${correctCount} / ${total} Correct`;

  if (percent >= 80) {
    quizScoreTitle.textContent = "Outstanding Mastery!";
    quizScoreMessage.textContent = "Excellent work! You have thoroughly grasped the core concepts covered in this material.";
  } else if (percent >= 50) {
    quizScoreTitle.textContent = "Good Effort!";
    quizScoreMessage.textContent = "Solid foundational comprehension. Review the explanations below to refine tricky areas.";
  } else {
    quizScoreTitle.textContent = "Keep Practicing!";
    quizScoreMessage.textContent = "Consider generating a detailed summary in the Summarizer above before re-testing yourself.";
  }

  // Build Question Review Cards
  const letters = ["A", "B", "C", "D"];
  quizReviewList.innerHTML = activeQuizQuestions.map((q, i) => {
    const userChoice = userSelectedAnswers[i];
    const isCorrect = userChoice === q.answer;
    const userChoiceText = userChoice !== undefined ? `${letters[userChoice]}. ${q.options[userChoice]}` : "No answer selected";
    const correctText = `${letters[q.answer]}. ${q.options[q.answer]}`;

    return `
      <article class="review-item ${isCorrect ? 'is-correct' : 'is-incorrect'}">
        <div class="review-item-header">
          <strong>Q${i + 1}: ${q.question}</strong>
          <span class="result-badge ${isCorrect ? 'pass' : 'fail'}">${isCorrect ? '✓ Correct' : '✕ Incorrect'}</span>
        </div>
        <div class="review-answer-meta">
          <span><strong>Your answer:</strong> ${userChoiceText}</span>
          ${!isCorrect ? `<span style="color: var(--green); margin-top: 3px;"><strong>Correct answer:</strong> ${correctText}</span>` : ''}
        </div>
        <div class="review-explanation">
          <strong>Explanation:</strong> ${q.explanation}
        </div>
      </article>
    `;
  }).join("");

  quizRunner.hidden = true;
  quizScoreResult.hidden = false;
  showToast(`Quiz completed! You scored ${percent}%.`);
});

// Retake & New Quiz
quizRetakeBtn.addEventListener("click", () => {
  userSelectedAnswers = {};
  currentQuestionIndex = 0;
  quizScoreResult.hidden = true;
  renderCurrentQuizQuestion();
  quizRunner.hidden = false;
  showToast("Quiz restarted. Good luck!");
});

quizNewBtn.addEventListener("click", () => {
  quizRequestId++;
  quizScoreResult.hidden = true;
  quizRunner.hidden = true;
  quizEmptyState.hidden = false;
  generateQuizBtn.disabled = false;
  quizNotesInput.focus();
});

/* ==========================================================================
   Initialization
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initProfileState();
  updateSummarizerCharCount();
  updateQuizCharCount();
});
