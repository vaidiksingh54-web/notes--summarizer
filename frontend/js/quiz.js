/**
 * CogniStudy AI - AI Quiz Generator & Interactive Testing Engine
 */

let currentQuiz = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // { 0: 2, 1: 0, ... }
let timerInterval = null;
let secondsElapsed = 0;



document.addEventListener("DOMContentLoaded", async () => {
  initQuizGenerator();
  await window.store.ready;
  checkUrlParamsForQuiz();
});

function initQuizGenerator() {
  const generateBtn = document.getElementById("btn-generate-quiz");
  const topicInput = document.getElementById("quiz-topic-input");
  const countSelect = document.getElementById("quiz-question-count");

  const urlParams = new URLSearchParams(window.location.search);
  const passedTopic = urlParams.get("topic");
  if (passedTopic && topicInput) {
    topicInput.value = decodeURIComponent(passedTopic);
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const topic = topicInput?.value.trim() || "General Studies";
      const count = parseInt(countSelect?.value || "5", 10);
      const difficulty = document.getElementById("quiz-difficulty")?.value || "medium";
      const prepTopic = sessionStorage.getItem("cogni_prep_quiz");
      const prepText = sessionStorage.getItem("cogni_prep_quiz_text");
      const sourceText = prepText && prepTopic && prepTopic.trim() === topic ? prepText : undefined;
      if (prepText) {
        sessionStorage.removeItem("cogni_prep_quiz");
        sessionStorage.removeItem("cogni_prep_quiz_text");
      }

      const emptyView = document.getElementById("quiz-empty-view");
      const loadingView = document.getElementById("quiz-loading-view");
      const playerView = document.getElementById("quiz-player-view");
      const resultsView = document.getElementById("quiz-results-view");

      if (emptyView) emptyView.style.display = "none";
      if (resultsView) resultsView.style.display = "none";
      if (playerView) playerView.style.display = "none";
      if (loadingView) loadingView.style.display = "flex";
      generateBtn.disabled = true;

      try {
        currentQuiz = await window.store.generateQuiz(topic, count, difficulty, sourceText);
        currentQuestionIndex = 0;
        userAnswers = {};
        if (loadingView) loadingView.style.display = "none";
        if (playerView) playerView.style.display = "block";

        startQuizTimer();
        document.getElementById("quiz-title-header").textContent = topic;
        renderCurrentQuestion();
        window.showToast(`Quiz generated! ${currentQuiz.length} questions ready.`, "success");
      } catch (error) {
        if (loadingView) loadingView.style.display = "none";
        if (emptyView) emptyView.style.display = "block";
        window.showToast(error.message || "Unable to generate quiz.", "error");
      } finally {
        generateBtn.disabled = false;
      }
    });
  }

  const nextBtn = document.getElementById("btn-quiz-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (userAnswers[currentQuestionIndex] === undefined) {
        window.showToast("Please select an answer before continuing!", "error");
        return;
      }

      if (currentQuestionIndex < currentQuiz.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
      } else {
        finishQuiz();
      }
    });
  }

  const retryBtn = document.getElementById("btn-quiz-retry");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      userAnswers = {};
      currentQuestionIndex = 0;
      startQuizTimer();
      document.getElementById("quiz-results-view").style.display = "none";
      document.getElementById("quiz-player-view").style.display = "block";
      renderCurrentQuestion();
    });
  }

  const saveQuizBtn = document.getElementById("btn-save-quiz");
  if (saveQuizBtn) {
    saveQuizBtn.addEventListener("click", async () => {
      const topic = document.getElementById("quiz-title-header")?.textContent || "Custom Quiz";
      const scoreStr = calculateScoreString();
      const newQuiz = {
        id: `quiz-${Date.now()}`,
        type: "quiz",
        title: topic,
        category: "Practice Test",
        date: "Today",
        progress: 100,
        isFavorite: false,
        score: scoreStr,
        questions: currentQuiz
      };

      saveQuizBtn.disabled = true;
      try {
        await window.store.saveItem(newQuiz);
        window.showToast("Quiz and results saved to Library.", "success");
        try {
          await window.store.addActivity({ title: topic, type: "Completed Quiz", score: scoreStr, icon: "🧠" });
        } catch (error) {
          window.showToast(`Quiz saved, but activity could not be recorded: ${error.message}`, "error");
        }
      } catch (error) {
        window.showToast(error.message || "Unable to save quiz.", "error");
      } finally {
        saveQuizBtn.disabled = false;
      }
    });
  }

  const scheduleReviewBtn = document.getElementById("btn-schedule-quiz-review");
  if (scheduleReviewBtn) {
    scheduleReviewBtn.addEventListener("click", () => {
      const topic = document.getElementById("quiz-title-header")?.textContent || "Quiz Review";
      const scoreStr = calculateScoreString();
      const details = `Review incorrect items for ${topic}.\nAchieved Score: ${scoreStr}.\nFocus on weak areas identified in CogniStudy AI.`;
      const url = window.store.generateGoogleCalendarUrl(`Revision: ${topic}`, details, 30);
      window.openSafeExternalLink(url);
      window.showToast("Opening Google Calendar to schedule revision session...", "info");
    });
  }
}

function startQuizTimer() {
  clearInterval(timerInterval);
  secondsElapsed = 0;
  const timerEl = document.getElementById("quiz-timer-display");
  if (timerEl) timerEl.textContent = "00:00";

  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, "0");
    const secs = (secondsElapsed % 60).toString().padStart(2, "0");
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);
}

function renderCurrentQuestion() {
  const q = currentQuiz[currentQuestionIndex];
  if (!q) return;

  document.getElementById("quiz-question-number").textContent = `QUESTION ${currentQuestionIndex + 1} OF ${currentQuiz.length}`;
  document.getElementById("quiz-question-text").textContent = q.question;

  const pct = ((currentQuestionIndex + 1) / currentQuiz.length) * 100;
  const bar = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = `${pct}%`;

  const nextBtn = document.getElementById("btn-quiz-next");
  if (nextBtn) {
    nextBtn.textContent = currentQuestionIndex === currentQuiz.length - 1 ? "Submit Quiz 🎉" : "Next Question →";
  }

  const container = document.getElementById("quiz-options-container");
  if (!container) return;

  container.innerHTML = q.options.map((opt, i) => {
    const isSelected = userAnswers[currentQuestionIndex] === i;
    return `
      <div class="glass-card quiz-option-card ${isSelected ? 'selected' : ''}" data-option-index="${i}" style="display: flex; align-items: center; gap: 14px; padding: 16px 20px; cursor: pointer; border-radius: var(--radius-md); margin-bottom: 12px; border: 1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}; background: ${isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-card)'};">
        <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}; display: flex; align-items: center; justify-content: center; background: ${isSelected ? 'var(--accent-cyan)' : 'transparent'};">
          ${isSelected ? '<span style="color: #070B19; font-weight: 800; font-size: 13px;">✓</span>' : ''}
        </div>
        <div style="font-size: 0.98rem; color: #fff; font-weight: 500;">${escapeHtml(opt)}</div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".quiz-option-card").forEach(el => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.getAttribute("data-option-index"), 10);
      userAnswers[currentQuestionIndex] = idx;
      renderCurrentQuestion();
    });
  });
}

function getCorrectOptionIndex(q) {
  if (typeof q.correct === "number") return q.correct;
  if (typeof q.answer === "number") return q.answer;
  return 0;
}

function calculateScoreString() {
  let correctCount = 0;
  currentQuiz.forEach((q, idx) => {
    if (userAnswers[idx] === getCorrectOptionIndex(q)) correctCount++;
  });
  return `${correctCount}/${currentQuiz.length}`;
}

function finishQuiz() {
  clearInterval(timerInterval);
  document.getElementById("quiz-player-view").style.display = "none";
  const resultsView = document.getElementById("quiz-results-view");
  if (resultsView) resultsView.style.display = "block";

  let correct = 0;
  let wrong = 0;

  currentQuiz.forEach((q, idx) => {
    if (userAnswers[idx] === getCorrectOptionIndex(q)) {
      correct++;
    } else {
      wrong++;
    }
  });

  const percentage = Math.round((correct / currentQuiz.length) * 100);
  
  document.getElementById("score-percentage").textContent = `${percentage}%`;
  document.getElementById("score-ratio").textContent = `${correct} / ${currentQuiz.length}`;
  document.getElementById("score-correct-count").textContent = correct;
  document.getElementById("score-wrong-count").textContent = wrong;
  
  const scoreMsg = document.getElementById("score-feedback-msg");
  if (scoreMsg) {
    if (percentage >= 80) {
      scoreMsg.textContent = "Outstanding mastery! You have a solid grasp of these core concepts.";
    } else if (percentage >= 60) {
      scoreMsg.textContent = "Good progress! A quick review of the explanations will help solidify your understanding.";
    } else {
      scoreMsg.textContent = "Keep practicing! Review the detailed answer explanations below.";
    }
  }

  const reviewContainer = document.getElementById("quiz-review-breakdown");
  if (reviewContainer) {
    reviewContainer.innerHTML = currentQuiz.map((q, idx) => {
      const userChoice = userAnswers[idx];
      const correctIdx = getCorrectOptionIndex(q);
      const isCorrect = userChoice === correctIdx;
      return `
        <div class="glass-card" style="padding: 18px; margin-bottom: 14px; border-left: 4px solid ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-faint);">QUESTION ${idx + 1}</span>
            <span class="badge ${isCorrect ? 'badge-emerald' : 'badge-amber'}">${isCorrect ? 'Correct' : 'Needs Review'}</span>
          </div>
          <p style="font-weight: 600; color: #fff; margin-bottom: 10px;">${escapeHtml(q.question)}</p>
          <div style="font-size: 0.88rem; margin-bottom: 6px;">
            <span style="color: var(--text-muted);">Your answer:</span> 
            <span style="color: ${isCorrect ? '#34d399' : '#fb7185'}; font-weight: 500;">${escapeHtml(q.options[userChoice] || "Unanswered")}</span>
          </div>
          ${!isCorrect ? `
            <div style="font-size: 0.88rem; margin-bottom: 8px;">
              <span style="color: var(--text-muted);">Correct answer:</span> 
              <span style="color: #34d399; font-weight: 500;">${escapeHtml(q.options[correctIdx] || "")}</span>
            </div>
          ` : ''}
          <div style="font-size: 0.82rem; color: var(--text-faint); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 6px;">
            💡 <strong>Explanation:</strong> ${escapeHtml(q.explanation || "")}
          </div>
        </div>
      `;
    }).join("");
  }

  window.showToast("Quiz completed! Review your score breakdown below.", "info");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function checkUrlParamsForQuiz() {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("id");
  if (quizId) {
    const item = window.store.getItemById(quizId);
    if (item && item.type === "quiz" && item.questions) {
      currentQuiz = item.questions;
      currentQuestionIndex = 0;
      userAnswers = {};

      const emptyView = document.getElementById("quiz-empty-view");
      const playerView = document.getElementById("quiz-player-view");
      if (emptyView) emptyView.style.display = "none";
      if (playerView) playerView.style.display = "block";

      document.getElementById("quiz-title-header").textContent = item.title;
      startQuizTimer();
      renderCurrentQuestion();
      window.showToast(`Loaded test: "${item.title}"`, "info");
    }
  }
}
