/**
 * CogniStudy AI - AI Flashcards Generator & Interactive 3D Study Deck
 */

let currentDeck = [];
let currentIndex = 0;
let masteredCards = new Set();

document.addEventListener("DOMContentLoaded", async () => {
  initFlashcardGenerator();
  await window.store.ready;
  checkUrlParamsForDeck();
});

function initFlashcardGenerator() {
  const generateBtn = document.getElementById("btn-generate-flashcards");
  const topicInput = document.getElementById("fc-topic-input");
  const cardCountSelect = document.getElementById("fc-card-count");

  const urlParams = new URLSearchParams(window.location.search);
  const passedTopic = urlParams.get("topic");
  if (passedTopic && topicInput) {
    topicInput.value = decodeURIComponent(passedTopic);
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const topic = topicInput?.value.trim();
      const count = parseInt(cardCountSelect?.value || "6", 10);
      const difficulty = document.getElementById("fc-difficulty")?.value || "medium";
      const prepTopic = sessionStorage.getItem("cogni_prep_flashcards");
      const prepText = sessionStorage.getItem("cogni_prep_flashcards_text");
      const sourceText = prepText && prepTopic && prepTopic.trim() === topic ? prepText : undefined;
      if (prepText) {
        sessionStorage.removeItem("cogni_prep_flashcards");
        sessionStorage.removeItem("cogni_prep_flashcards_text");
      }

      if (!topic) {
        window.showToast("Enter a topic first.", "error");
        topicInput?.focus();
        return;
      }

      const emptyView = document.getElementById("fc-empty-state");
      const loadingView = document.getElementById("fc-loading-state");
      const playerView = document.getElementById("fc-player-stage");

      if (emptyView) emptyView.style.display = "none";
      if (playerView) playerView.style.display = "none";
      if (loadingView) loadingView.style.display = "flex";
      generateBtn.disabled = true;

      try {
        currentDeck = await window.store.generateFlashcards(topic, count, difficulty, sourceText);
        currentIndex = 0;
        masteredCards.clear();
        if (loadingView) loadingView.style.display = "none";
        if (playerView) playerView.style.display = "block";
        document.getElementById("deck-title-display").textContent = topic;
        updateCardDisplay();
        window.showToast(`Generated ${currentDeck.length} flashcards.`, "success");
      } catch (error) {
        if (loadingView) loadingView.style.display = "none";
        if (emptyView) emptyView.style.display = "block";
        window.showToast(error.message || "Unable to generate flashcards.", "error");
      } finally {
        generateBtn.disabled = false;
      }
    });
  }

  const cardInner = document.getElementById("flashcard-inner");
  const flipBtn = document.getElementById("btn-flip-card");
  
  if (cardInner) {
    cardInner.addEventListener("click", () => {
      cardInner.classList.toggle("flipped");
    });
  }

  if (flipBtn && cardInner) {
    flipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cardInner.classList.toggle("flipped");
    });
  }

  const prevBtn = document.getElementById("btn-prev-card");
  const nextBtn = document.getElementById("btn-next-card");
  
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        resetFlipAndDisplay();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentIndex < currentDeck.length - 1) {
        currentIndex++;
        resetFlipAndDisplay();
      }
    });
  }

  const shuffleBtn = document.getElementById("btn-shuffle-deck");
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      currentDeck.sort(() => Math.random() - 0.5);
      currentIndex = 0;
      resetFlipAndDisplay();
      window.showToast("Deck shuffled!", "info");
    });
  }

  const restartBtn = document.getElementById("btn-restart-deck");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      currentIndex = 0;
      masteredCards.clear();
      resetFlipAndDisplay();
      window.showToast("Deck restarted", "info");
    });
  }

  const masterBtn = document.getElementById("btn-mark-mastered");
  if (masterBtn) {
    masterBtn.addEventListener("click", () => {
      masteredCards.add(currentIndex);
      window.showToast(`Card ${currentIndex + 1} marked as Mastered! 🎉`, "success");
      updateMasteredProgress();
      if (currentIndex < currentDeck.length - 1) {
        currentIndex++;
        resetFlipAndDisplay();
      }
    });
  }

  const saveDeckBtn = document.getElementById("btn-save-deck");
  if (saveDeckBtn) {
    saveDeckBtn.addEventListener("click", async () => {
      const topic = document.getElementById("deck-title-display")?.textContent || "Custom Flashcards";
      const newDeck = {
        id: `fc-${Date.now()}`,
        type: "flashcards",
        title: topic,
        category: "Study Deck",
        date: "Today",
        progress: Math.round((masteredCards.size / currentDeck.length) * 100),
        isFavorite: false,
        cardCount: currentDeck.length,
        cards: currentDeck
      };

      saveDeckBtn.disabled = true;
      try {
        await window.store.saveItem(newDeck);
        window.showToast("Flashcard deck saved to Library.", "success");
        try {
          await window.store.addActivity({ title: topic, type: "Created Flashcards", score: `${currentDeck.length} cards`, icon: "🃏" });
        } catch (error) {
          window.showToast(`Deck saved, but activity could not be recorded: ${error.message}`, "error");
        }
      } catch (error) {
        window.showToast(error.message || "Unable to save flashcards.", "error");
      } finally {
        saveDeckBtn.disabled = false;
      }
    });
  }
}

function resetFlipAndDisplay() {
  const cardInner = document.getElementById("flashcard-inner");
  if (cardInner) cardInner.classList.remove("flipped");
  setTimeout(updateCardDisplay, 150);
}

function updateCardDisplay() {
  if (currentDeck.length === 0) return;

  const card = currentDeck[currentIndex];
  document.getElementById("card-index-indicator").textContent = `CARD ${currentIndex + 1} / ${currentDeck.length}`;
  document.getElementById("fc-front-question").textContent = card.question || card.front || "";
  document.getElementById("fc-back-answer").textContent = card.answer || card.back || "";

  const prevBtn = document.getElementById("btn-prev-card");
  const nextBtn = document.getElementById("btn-next-card");
  if (prevBtn) prevBtn.disabled = currentIndex === 0;
  if (nextBtn) nextBtn.disabled = currentIndex === currentDeck.length - 1;

  const progressBar = document.getElementById("deck-progress-bar");
  if (progressBar) {
    const pct = ((currentIndex + 1) / currentDeck.length) * 100;
    progressBar.style.width = `${pct}%`;
  }

  updateMasteredProgress();
}

function updateMasteredProgress() {
  const masteredEl = document.getElementById("mastered-count-display");
  if (masteredEl && currentDeck.length > 0) {
    masteredEl.textContent = `${masteredCards.size} / ${currentDeck.length} Mastered`;
  }
}

function checkUrlParamsForDeck() {
  const params = new URLSearchParams(window.location.search);
  const deckId = params.get("id");
  if (deckId) {
    const item = window.store.getItemById(deckId);
    if (item && item.type === "flashcards" && item.cards) {
      currentDeck = item.cards;
      currentIndex = 0;
      masteredCards.clear();

      const emptyView = document.getElementById("fc-empty-state");
      const playerView = document.getElementById("fc-player-stage");
      if (emptyView) emptyView.style.display = "none";
      if (playerView) playerView.style.display = "block";

      document.getElementById("deck-title-display").textContent = item.title;
      updateCardDisplay();
      window.showToast(`Loaded deck: "${item.title}"`, "info");
    }
  }
}
