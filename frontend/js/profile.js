/**
 * CogniStudy AI - Profile Management
 */

document.addEventListener("DOMContentLoaded", async () => {
  await window.store.ready;
  renderProfileDetails();
  initEditProfileModal();
});

function renderProfileDetails() {
  const user = window.store.getUser();
  const stats = window.store.getStats();

  const nameEl = document.getElementById("profile-name-text");
  const emailEl = document.getElementById("profile-email-text");
  const phoneEl = document.getElementById("profile-phone-text");
  const collegeEl = document.getElementById("profile-college-text");
  const courseEl = document.getElementById("profile-course-text");
  const bioEl = document.getElementById("profile-bio-text");
  const avatarEl = document.getElementById("profile-avatar-circle");

  if (nameEl) nameEl.textContent = user.name || "Student";
  if (emailEl) emailEl.textContent = user.email || "";
  if (phoneEl) phoneEl.textContent = user.phone || "Not added";
  if (collegeEl) collegeEl.textContent = user.college || "Your college";
  if (courseEl) courseEl.textContent = user.course || "Your course";
  if (bioEl) bioEl.textContent = user.bio || "Student.";
  if (avatarEl) avatarEl.textContent = user.avatar || "ST";

  const notesEl = document.getElementById("profile-stat-notes");
  const fcEl = document.getElementById("profile-stat-fc");
  const quizEl = document.getElementById("profile-stat-quiz");
  
  if (notesEl) notesEl.textContent = stats.notesCount;
  if (fcEl) fcEl.textContent = stats.flashcardsCount;
  if (quizEl) quizEl.textContent = stats.quizzesCount;
}

function initEditProfileModal() {
  document.getElementById("btn-end-demo-session")?.addEventListener("click", () => {
    window.store.logout().finally(() => {
      window.showToast("Signed out.", "info");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 400);
    });
  });

  const editBtn = document.getElementById("btn-open-edit-profile");
  const saveBtn = document.getElementById("btn-save-profile-modal");

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const user = window.store.getUser();
      document.getElementById("edit-name-input").value = user.name || "";
      document.getElementById("edit-email-input").value = user.email || "";
      document.getElementById("edit-phone-input").value = user.phone || "";
      document.getElementById("edit-college-input").value = user.college || "";
      document.getElementById("edit-course-input").value = user.course || "";
      document.getElementById("edit-bio-input").value = user.bio || "";
      window.openModal("modal-edit-profile");
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const name = document.getElementById("edit-name-input").value.trim();
      const email = document.getElementById("edit-email-input").value.trim();
      const phone = document.getElementById("edit-phone-input").value.trim();
      const college = document.getElementById("edit-college-input").value.trim();
      const course = document.getElementById("edit-course-input").value.trim();
      const bio = document.getElementById("edit-bio-input").value.trim();

      if (!name || !email) {
        window.showToast("Name and email are required!", "error");
        return;
      }

      const initials = name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "ST";

      saveBtn.disabled = true;
      try {
        await window.store.saveProfile({
          ...window.store.getUser(), name, email, phone, college, course, bio, avatar: initials
        });
        window.closeModal("modal-edit-profile");
        renderProfileDetails();
        document.querySelectorAll(".user-name-display").forEach(el => el.textContent = name);
        document.querySelectorAll(".user-email-display").forEach(el => el.textContent = email);
        document.querySelectorAll(".user-avatar-display").forEach(el => el.textContent = initials);
        window.showToast("Profile updated.", "success");
      } catch (error) {
        window.showToast(error.message || "Unable to update profile.", "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
}
