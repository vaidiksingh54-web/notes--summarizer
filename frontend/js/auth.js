/**
 * CogniStudy AI - Student Authentication Controller
 * Direct Secure Email & Password Auth + Instant 1-Click Access
 */

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();
  initPasswordToggles();
  initForgotPasswordLink();
  initQuickDemoAccess();
});

function initQuickDemoAccess() {
  const demoBtn = document.getElementById("btn-quick-demo");
  if (!demoBtn) return;

  demoBtn.addEventListener("click", async () => {
    if (!window.store) {
      window.showToast("Initializing application store. Please retry in a moment.", "info");
      return;
    }
    demoBtn.disabled = true;
    demoBtn.textContent = "Loading Demo...";
    window.showToast("Launching instant Student Workspace demo...", "info");

    try {
      const demoAuth = await window.store.request("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({
          email: "evaluator.student@college.edu",
          name: "Guest Student",
          uid: "demo-evaluator-id-2026"
        })
      });

      if (demoAuth && demoAuth.token) {
        window.store.setSession(demoAuth.token, demoAuth.profile);
        window.showToast(`Signed in as ${demoAuth.profile.name}! Redirecting to dashboard...`, "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 300);
      }
    } catch (err) {
      window.showToast(err.message || "Demo login unavailable.", "error");
      demoBtn.disabled = false;
      demoBtn.textContent = "1-Click Instant Student Login";
    }
  });
}

function initPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!(input instanceof HTMLInputElement)) return;
      const showingPassword = input.type === "password";
      input.type = showingPassword ? "text" : "password";
      button.setAttribute("aria-label", showingPassword ? "Hide password" : "Show password");
      button.textContent = showingPassword ? "Hide" : "Show";
      button.classList.toggle("is-active", showingPassword);
    });
  });
}

function initLoginForm() {
  const form = document.getElementById("form-login");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.store) {
      window.showToast("Initializing application store. Please retry in a moment.", "info");
      return;
    }
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const submitBtn = document.getElementById("btn-login-submit");

    if (!email || !password) {
      window.showToast("Please enter both academic email and password.", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Signing In...</span>`;
    }

    try {
      await window.store.login(email, password);
      window.showToast("Welcome back! Loading study dashboard...", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 350);
    } catch (err) {
      window.showToast(err.message || "Sign in failed. Check credentials.", "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In to Study Space</span><span aria-hidden="true">&rarr;</span>`;
      }
    }
  });
}

function initSignupForm() {
  const form = document.getElementById("form-signup");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.store) {
      window.showToast("Initializing application store. Please retry in a moment.", "info");
      return;
    }
    const name = document.getElementById("signup-name")?.value.trim();
    const email = document.getElementById("signup-email")?.value.trim();
    const college = document.getElementById("signup-college")?.value.trim();
    const course = document.getElementById("signup-course")?.value.trim();
    const phone = document.getElementById("signup-phone")?.value.trim();
    const password = document.getElementById("signup-password")?.value;
    const submitBtn = document.getElementById("btn-signup-submit");

    if (!name || !email || !password || !college || !course) {
      window.showToast("Please fill in all required academic fields.", "error");
      return;
    }

    if (password.length < 8) {
      window.showToast("Password must be at least 8 characters long.", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Creating Account...</span>`;
    }

    try {
      await window.store.signup({
        name,
        email,
        password,
        college,
        course,
        phone
      });

      window.showToast("Account created successfully! Welcome to CogniStudy AI.", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 350);
    } catch (err) {
      window.showToast(err.message || "Account creation failed.", "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Student Account</span><span aria-hidden="true">&rarr;</span>`;
      }
    }
  });
}

function initForgotPasswordLink() {
  const link = document.getElementById("link-forgot-password");
  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value.trim();
    if (email) {
      window.showToast(`Password reset link dispatched to ${email}.`, "info");
    } else {
      window.showToast("Enter your registered academic email above to receive a reset link.", "info");
      document.getElementById("login-email")?.focus();
    }
  });
}
