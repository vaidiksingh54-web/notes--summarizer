/**
 * CogniStudy AI - Study Library Manager
 */

let activeLibraryTab = "all";
let activeSearchQuery = "";
let pendingDeleteId = null;
let pendingRenameId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await window.store.ready;
  initLibraryTabs();
  initLibrarySearch();
  initModalsLibrary();
  renderLibraryCards();
});

function initLibraryTabs() {
  document.querySelectorAll("[data-lib-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-lib-tab]").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeLibraryTab = tab.getAttribute("data-lib-tab");
      renderLibraryCards();
    });
  });
}

function initLibrarySearch() {
  const searchInput = document.getElementById("library-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      activeSearchQuery = e.target.value.toLowerCase().trim();
      renderLibraryCards();
    });
  }
}

function renderLibraryCards() {
  const grid = document.getElementById("library-items-grid");
  const emptyView = document.getElementById("library-empty-view");
  if (!grid) return;

  let items = window.store.getItems(activeLibraryTab);

  if (activeSearchQuery) {
    items = items.filter(i => 
      i.title.toLowerCase().includes(activeSearchQuery) || 
      (i.category && i.category.toLowerCase().includes(activeSearchQuery))
    );
  }

  if (items.length === 0) {
    grid.innerHTML = "";
    if (emptyView) emptyView.style.display = "block";
    return;
  }

  if (emptyView) emptyView.style.display = "none";

  grid.innerHTML = items.map(item => {
    let icon = "📝";
    let badgeClass = "badge-cyan";
    let typeLabel = "Notes";
    let openUrl = `notes.html?id=${item.id}`;

    if (item.type === "flashcards") {
      icon = "🃏";
      badgeClass = "badge-purple";
      typeLabel = `${item.cardCount || (item.cards?.length || 5)} Cards`;
      openUrl = `flashcards.html?id=${item.id}`;
    } else if (item.type === "quiz") {
      icon = "🧠";
      badgeClass = "badge-emerald";
      typeLabel = item.score ? `Score: ${escapeHtml(item.score)}` : "Quiz";
      openUrl = `quiz.html?id=${item.id}`;
    } else if (item.type === "mindmap") {
      icon = "🕸";
      badgeClass = "badge-cyan";
      typeLabel = `${item.nodeCount || 1} Concepts`;
      openUrl = `mindmap.html?id=${item.id}`;
    }

    return `
      <div class="glass-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; min-height: 200px; position: relative;">
        <div>
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99, 102, 241, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
              ${icon}
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="three-dot-btn" onclick="toggleFavoriteItem('${item.id}', event)" title="Favorite" style="color: ${item.isFavorite ? '#fbbf24' : 'var(--text-faint)'};">
                ${item.isFavorite ? '★' : '☆'}
              </button>

              <div class="three-dot-wrapper">
                <button class="three-dot-btn" onclick="openThreeDotMenu('${item.id}', event)" aria-label="Menu">⋮</button>
                <div class="three-dot-menu" id="menu-${item.id}">
                  <button class="three-dot-item" onclick="window.location.href='${openUrl}'">
                    <span>↗</span> Open
                  </button>
                  <button class="three-dot-item" onclick="openRenameModal('${item.id}')">
                    <span>✏</span> Rename
                  </button>
                  <button class="three-dot-item" onclick="duplicateLibraryItem('${item.id}')">
                    <span>⎘</span> Duplicate
                  </button>
                  <button class="three-dot-item" onclick="downloadLibraryItem('${item.id}')">
                    <span>📥</span> Download
                  </button>
                  <button class="three-dot-item" onclick="shareLibraryItem('${item.id}')">
                    <span>🔗</span> Share
                  </button>
                  <button class="three-dot-item danger" onclick="confirmDeleteItem('${item.id}')">
                    <span>🗑</span> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <a href="${openUrl}" style="text-decoration: none;">
            <h3 style="font-size: 1.05rem; font-weight: 600; color: #fff; margin-bottom: 8px; line-height: 1.35;">${escapeHtml(item.title)}</h3>
          </a>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span class="badge ${badgeClass}">${typeLabel}</span>
            <span style="font-size: 0.78rem; color: var(--text-faint);">${escapeHtml(item.category || "General")}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 10px;">
          <span style="font-size: 0.78rem; color: var(--text-faint);">${escapeHtml(item.date)}</span>
          <a href="${openUrl}" class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.8rem;">
            Study ↗
          </a>
        </div>
      </div>
    `;
  }).join("");
}

window.openThreeDotMenu = function(id, e) {
  e.stopPropagation();
  const menu = document.getElementById(`menu-${id}`);
  const isShown = menu.classList.contains("show");
  document.querySelectorAll(".three-dot-menu").forEach(m => m.classList.remove("show"));
  if (!isShown) menu.classList.add("show");
};

window.toggleFavoriteItem = async function(id, e) {
  e.stopPropagation();
  try {
    const isFav = await window.store.toggleFavorite(id);
    renderLibraryCards();
    window.showToast(isFav ? "Added to Favorites ★" : "Removed from Favorites", "info");
  } catch (error) {
    window.showToast(error.message || "Unable to update favorite.", "error");
  }
};

window.duplicateLibraryItem = async function(id) {
  try {
    const copy = await window.store.duplicateItem(id);
    if (copy) {
      renderLibraryCards();
      window.showToast(`Duplicated "${copy.title}"`, "success");
    }
  } catch (error) {
    window.showToast(error.message || "Unable to duplicate item.", "error");
  }
};

window.downloadLibraryItem = function(id) {
  const item = window.store.getItemById(id);
  if (!item) return;

  const content = JSON.stringify(item, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${item.title.replace(/\s+/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.showToast("Item downloaded!", "info");
};

window.shareLibraryItem = function(id) {
  const item = window.store.getItemById(id);
  if (!item) return;
  const title = item.title;
  const destination = item.type === "flashcards" ? "flashcards.html" : item.type === "quiz" ? "quiz.html" : "notes.html";
  const url = `${window.location.origin}/${destination}?id=${encodeURIComponent(id)}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      window.showToast(`Share link for "${title}" copied to clipboard!`, "success");
    });
  } else {
    window.showToast(`Share link: ${url}`, "info");
  }
};

window.confirmDeleteItem = function(id) {
  pendingDeleteId = id;
  const item = window.store.getItemById(id);
  const titleDisplay = document.getElementById("delete-item-title-display");
  if (titleDisplay) titleDisplay.textContent = item ? `"${item.title}"` : "this item";
  window.openModal("modal-delete-confirm");
};

window.openRenameModal = function(id) {
  pendingRenameId = id;
  const item = window.store.getItemById(id);
  const input = document.getElementById("rename-title-input");
  if (input) input.value = item?.title || "";
  window.openModal("modal-rename-item");
};

function initModalsLibrary() {
  const confirmDeleteBtn = document.getElementById("btn-confirm-delete-action");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (pendingDeleteId) {
        confirmDeleteBtn.disabled = true;
        try {
          await window.store.deleteItem(pendingDeleteId);
          window.closeModal("modal-delete-confirm");
          renderLibraryCards();
          window.showToast("Item deleted from library.", "info");
          pendingDeleteId = null;
        } catch (error) {
          window.showToast(error.message || "Unable to delete item.", "error");
        } finally {
          confirmDeleteBtn.disabled = false;
        }
      }
    });
  }

  const confirmRenameBtn = document.getElementById("btn-confirm-rename-action");
  if (confirmRenameBtn) {
    confirmRenameBtn.addEventListener("click", async () => {
      const newTitle = document.getElementById("rename-title-input")?.value.trim();
      if (pendingRenameId && newTitle) {
        confirmRenameBtn.disabled = true;
        try {
          await window.store.renameItem(pendingRenameId, newTitle);
          window.closeModal("modal-rename-item");
          renderLibraryCards();
          window.showToast(`Renamed to "${newTitle}"`, "success");
          pendingRenameId = null;
        } catch (error) {
          window.showToast(error.message || "Unable to rename item.", "error");
        } finally {
          confirmRenameBtn.disabled = false;
        }
      }
    });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
