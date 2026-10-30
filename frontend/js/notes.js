/**
 * CogniStudy AI - AI Notes Generator & Interactive Editor
 */

document.addEventListener("DOMContentLoaded", async () => {
  initNotesGenerator();
  initNotesEditor();
  await window.store.ready;
  checkUrlParamsForEdit();
});

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function initNotesGenerator() {
  const notesTextarea = document.getElementById("notes-source-input");
  const charCounter = document.getElementById("char-count");
  const clearBtn = document.getElementById("btn-clear-notes");
  const generateBtn = document.getElementById("btn-generate-notes");
  const fileInput = document.getElementById("doc-file-input");
  const dropzone = document.getElementById("file-dropzone");
  const filePreview = document.getElementById("file-preview");

  if (!notesTextarea) return;

  notesTextarea.addEventListener("input", () => {
    const len = notesTextarea.value.length;
    if (charCounter) charCounter.textContent = `${len.toLocaleString()} / 25,000 characters`;
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      notesTextarea.value = "";
      notesTextarea.dispatchEvent(new Event("input"));
      if (filePreview) filePreview.style.display = "none";
      window.showToast("Cleared inputs", "info");
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        handleSelectedFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleSelectedFile(e.target.files[0]);
      }
    });
  }

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("js/vendor/pdf.worker.min.js", window.location.href).href;
}

function renderMarkdownToHtml(markdown) {
  if (!markdown) return "";
  const html = markdown
    .replace(/^### (.*$)/gim, '<h4 style="color:#38bdf8; margin:12px 0 6px;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="color:#fff; margin:16px 0 8px;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="color:#fff; margin:20px 0 10px;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#fff;">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*[-•*]\s+(.*)$/gim, '<li style="margin-left:18px; margin-bottom:4px;">$1</li>')
    .replace(/(<li>.*<\/li>)/gims, '<ul style="margin:8px 0; padding-left:14px;">$1</ul>')
    .replace(/<\/ul>\s*<ul[^>]*>/gim, '')
    .replace(/\n\n+/g, '</p><p style="margin-top:10px; line-height:1.6;">')
    .replace(/\n/g, '<br>');

  return `<p style="line-height:1.6;">${html}</p>`;
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF processing engine is loading. Please try again.");
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pageTexts = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str).join(" ");
    if (strings.trim()) {
      pageTexts.push(`--- Page ${i} ---\n${strings.trim()}`);
    }
  }

  const result = pageTexts.join("\n\n").trim();
  if (!result) {
    throw new Error("No readable text found in this PDF. It may contain scanned images. Please copy-paste your notes directly.");
  }
  return result;
}

  async function handleSelectedFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      window.showToast("File exceeds the 10 MB limit. Please upload a smaller document.", "error");
      return;
    }

    if (filePreview) {
      document.getElementById("preview-file-name").textContent = file.name;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      document.getElementById("preview-file-size").textContent = `${sizeMb} MB`;
      filePreview.style.display = "flex";
    }

    const lowerName = file.name.toLowerCase();
    if (file.type.includes("text") || lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        notesTextarea.value = e.target.result;
        notesTextarea.dispatchEvent(new Event("input"));
        window.showToast(`Imported ${file.name}`, "success");
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
      window.showToast(`Extracting text from ${file.name}...`, "info");
      try {
        const extracted = await extractTextFromPdf(file);
        notesTextarea.value = extracted;
        notesTextarea.dispatchEvent(new Event("input"));
        window.showToast(`Successfully extracted text from ${file.name}!`, "success");
      } catch (err) {
        window.showToast(err.message || "Failed to extract text from PDF.", "error");
      }
    } else {
      window.showToast("Direct extraction supports .txt, .md, and .pdf documents.", "error");
    }
  }

  const removeFileBtn = document.getElementById("btn-remove-file");
  if (removeFileBtn && filePreview) {
    removeFileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      filePreview.style.display = "none";
      if (fileInput) fileInput.value = "";
      if (notesTextarea && notesTextarea.value) {
        notesTextarea.value = "";
        notesTextarea.dispatchEvent(new Event("input"));
      }
      window.showToast("Uploaded file and extracted content removed.", "info");
    });
  }

  const charRow = document.getElementById("char-count")?.parentElement;
  
  function setInputTab(mode) {
    document.querySelectorAll("[data-input-tab]").forEach(t => {
      t.classList.toggle("active", t.getAttribute("data-input-tab") === mode);
    });
    if (mode === "doc") {
      if (notesTextarea) notesTextarea.style.display = "none";
      if (charRow) charRow.style.display = "none";
      if (dropzone) dropzone.style.display = "block";
    } else {
      if (notesTextarea) notesTextarea.style.display = "block";
      if (charRow) charRow.style.display = "flex";
      if (dropzone) dropzone.style.display = "none";
    }
  }

  // Initialize tabs (default to text, or doc if URL param ?mode=doc)
  const initialMode = new URLSearchParams(window.location.search).get("mode") === "doc" ? "doc" : "text";
  setInputTab(initialMode);

  document.querySelectorAll("[data-input-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      const mode = tab.getAttribute("data-input-tab");
      setInputTab(mode);
    });
  });

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const content = notesTextarea.value.trim();
      if (!content) {
        window.showToast("Please enter study notes or upload a document first.", "error");
        notesTextarea.focus();
        return;
      }

      const emptyState = document.getElementById("output-empty-state");
      const loadingState = document.getElementById("output-loading-state");
      const outputCard = document.getElementById("output-result-card");

      if (emptyState) emptyState.style.display = "none";
      if (outputCard) outputCard.style.display = "none";
      if (loadingState) loadingState.style.display = "flex";

      const loadingStepText = document.getElementById("loading-step-text");
      const steps = [
        "Analyzing study text and concepts...",
        "Synthesizing key definitions and principles...",
        "Formulating structured academic takeaways...",
        "Finalizing structured summary..."
      ];

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (loadingStepText && stepIndex < steps.length) {
          loadingStepText.textContent = steps[stepIndex];
          stepIndex++;
        }
      }, 450);

      const lengthVal = document.getElementById("option-length")?.value || "medium";
      const difficultyVal = document.getElementById("option-difficulty")?.value || "intermediate";
      const styleVal = document.getElementById("option-style")?.value || "detailed";

      generateBtn.disabled = true;
      try {
        const summary = await window.store.summarizeNotes(content, {
          length: lengthVal,
          difficulty: difficultyVal,
          style: styleVal
        });

        clearInterval(stepInterval);
        if (loadingState) loadingState.style.display = "none";
        if (outputCard) {
          outputCard.style.display = "flex";
          const titleEl = document.getElementById("generated-notes-title");
          const editorEl = document.getElementById("notes-editor-content");
          const headingMatch = summary.match(/^#{1,3}\s+(.+)$/m);
          const derivedTitle = headingMatch
            ? headingMatch[1].replace(/[*_`]/g, "").trim().slice(0, 70)
            : "AI Study Summary";
          if (titleEl) titleEl.textContent = derivedTitle || "AI Study Summary";
          if (editorEl) {
            editorEl.innerHTML = renderMarkdownToHtml(summary);
          }
        }
        window.showToast("Summary generated!", "success");
      } catch (error) {
        clearInterval(stepInterval);
        if (loadingState) loadingState.style.display = "none";
        if (emptyState) emptyState.style.display = "flex";
        window.showToast(error.message || "Unable to generate the summary.", "error");
      } finally {
        generateBtn.disabled = false;
      }
    });
  }
}

function initNotesEditor() {
  const editorEl = document.getElementById("notes-editor-content");
  if (!editorEl) return;

  // Expose current editor content for the embedded AI assistant
  window.getCurrentNoteContent = function() {
    return editorEl.innerText?.trim() || document.getElementById("notes-source-input")?.value?.trim() || "";
  };

  window.insertIntoNoteEditor = function(text) {
    if (!editorEl) return;
    const block = document.createElement("div");
    block.style.marginTop = "16px";
    block.style.padding = "12px";
    block.style.borderLeft = "3px solid var(--accent-cyan)";
    block.style.background = "rgba(56, 189, 248, 0.08)";
    block.style.borderRadius = "var(--radius-sm)";
    block.innerHTML = `<strong>✦ AI Assistant Summary:</strong><p style="margin-top:6px; line-height:1.5;">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
    editorEl.appendChild(block);
    editorEl.focus();
    window.showToast("Inserted AI summary into notes editor!", "success");
  };

  document.querySelectorAll("[data-format-command]").forEach(btn => {
    btn.addEventListener("click", () => {
      const command = btn.getAttribute("data-format-command");
      const val = btn.getAttribute("data-format-value") || null;
      document.execCommand(command, false, val);
      editorEl.focus();
    });
  });

  const aiToolsBtn = document.getElementById("btn-ai-tools");
  const aiToolsMenu = document.getElementById("menu-ai-tools");
  if (aiToolsBtn && aiToolsMenu) {
    aiToolsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      aiToolsMenu.classList.toggle("show");
    });

    document.querySelectorAll("[data-ai-action]").forEach(actionBtn => {
      actionBtn.addEventListener("click", () => {
        const action = actionBtn.getAttribute("data-ai-action");
        aiToolsMenu.classList.remove("show");
        handleAiTransformation(action);
      });
    });
  }

  const saveBtn = document.getElementById("btn-save-notes");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const title = document.getElementById("generated-notes-title")?.textContent || "Generated Notes";
      const content = editorEl.innerHTML;
      const currentId = new URLSearchParams(window.location.search).get("id");
      const newNote = {
        id: currentId || `note-${Date.now()}`,
        type: "note",
        title: title,
        category: "General",
        date: "Today",
        progress: 100,
        isFavorite: false,
        tags: ["AI Notes", "Summary"],
        content: content
      };

      saveBtn.disabled = true;
      try {
        const saved = await window.store.saveItem(newNote);
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("id", saved.id);
        window.history.replaceState({}, "", nextUrl.toString());
        window.showToast("Notes saved to your Library.", "success");
        try {
          await window.store.addActivity({ title, type: "Saved Notes", score: "Complete", icon: "📝" });
        } catch (error) {
          window.showToast(`Note saved, but activity could not be recorded: ${error.message}`, "error");
        }
      } catch (error) {
        window.showToast(error.message || "Unable to save notes.", "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  const copyBtn = document.getElementById("btn-copy-notes");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const textContent = editorEl.innerText;
      if (!textContent || !textContent.trim()) {
        window.showToast("No summary content to copy.", "error");
        return;
      }
      window.copyToClipboard(textContent, "Summary copied to clipboard!");
    });
  }

  const downloadBtn = document.getElementById("btn-download-notes");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const title = document.getElementById("generated-notes-title")?.textContent || "Notes";
      const textContent = editorEl.innerText;
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.showToast("Downloaded notes as text file!", "info");
    });
  }

  const makeMindMapBtn = document.getElementById("btn-convert-mindmap");
  if (makeMindMapBtn) {
    makeMindMapBtn.addEventListener("click", () => {
      const title = document.getElementById("generated-notes-title")?.textContent || "Study Material";
      sessionStorage.setItem("cogni_prep_mindmap", title);
      sessionStorage.setItem("cogni_prep_mindmap_text", editorEl.innerText.slice(0, 25000));
      window.location.href = "mindmap.html?topic=" + encodeURIComponent(title);
    });
  }

  const makeFlashcardsBtn = document.getElementById("btn-convert-flashcards");
  if (makeFlashcardsBtn) {
    makeFlashcardsBtn.addEventListener("click", () => {
      const title = document.getElementById("generated-notes-title")?.textContent || "Study Material";
      sessionStorage.setItem("cogni_prep_flashcards", title);
      sessionStorage.setItem("cogni_prep_flashcards_text", editorEl.innerText.slice(0, 25000));
      window.location.href = "flashcards.html?topic=" + encodeURIComponent(title);
    });
  }

  const makeQuizBtn = document.getElementById("btn-convert-quiz");
  if (makeQuizBtn) {
    makeQuizBtn.addEventListener("click", () => {
      const title = document.getElementById("generated-notes-title")?.textContent || "Study Material";
      sessionStorage.setItem("cogni_prep_quiz", title);
      sessionStorage.setItem("cogni_prep_quiz_text", editorEl.innerText.slice(0, 25000));
      window.location.href = "quiz.html?topic=" + encodeURIComponent(title);
    });
  }

  const calendarBtn = document.getElementById("btn-schedule-calendar");
  if (calendarBtn) {
    calendarBtn.addEventListener("click", () => {
      const title = document.getElementById("generated-notes-title")?.textContent || "Revision Block";
      const summary = editorEl.innerText.slice(0, 300);
      const calendarUrl = window.store.generateGoogleCalendarUrl(title, summary, 45);
      window.openSafeExternalLink(calendarUrl);
      window.showToast("Opening Google Calendar to schedule study session...", "info");
    });
  }
}

async function handleAiTransformation(action) {
  const editorEl = document.getElementById("notes-editor-content");
  if (!editorEl) return;

  const currentText = editorEl.innerText.trim();
  if (!currentText) {
    window.showToast("No notes content to transform.", "error");
    return;
  }

  window.showToast(`Applying AI '${action}'...`, "info");
  editorEl.style.opacity = "0.5";

  try {
    const transformed = await window.store.transformNotes(currentText, action);
    editorEl.style.opacity = "1";

    const formattedHtml = transformed
      .replace(/^### (.*$)/gim, '<h4 style="color:#fff; margin:8px 0 4px;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="color:#fff; margin:10px 0 6px;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#fff;">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^\s*[-•*]\s+(.*)$/gim, '<li style="margin-left:14px;">$1</li>')
      .replace(/(<li>.*<\/li>)/gims, '<ul style="margin:6px 0;">$1</ul>')
      .replace(/\n\n+/g, '</p><p style="margin-top:6px;">')
      .replace(/\n/g, '<br>');

    editorEl.innerHTML = `<p>${formattedHtml}</p>`;
    window.showToast(`Applied AI ${action}!`, "success");
  } catch (error) {
    editorEl.style.opacity = "1";
    window.showToast(error.message || `Failed to apply '${action}'.`, "error");
  }
}

function checkUrlParamsForEdit() {
  const params = new URLSearchParams(window.location.search);
  const noteId = params.get("id");
  if (noteId) {
    const item = window.store.getItemById(noteId);
    if (item && item.type === "note") {
      const emptyState = document.getElementById("output-empty-state");
      const outputCard = document.getElementById("output-result-card");
      const titleEl = document.getElementById("generated-notes-title");
      const editorEl = document.getElementById("notes-editor-content");
      if (emptyState) emptyState.style.display = "none";
      if (outputCard) outputCard.style.display = "flex";
      if (titleEl) titleEl.textContent = item.title;
      if (editorEl) editorEl.innerHTML = item.content;
      window.showToast(`Loaded "${item.title}" for editing`, "info");
    }
  }
}
