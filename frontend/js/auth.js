/**
 * CogniStudy AI - Student account authentication
 */

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();
  initPasswordToggles();
  initGoogleAuth();
  initForgotPasswordLink();
});

function initGoogleAuth() {
  const googleBtns = document.querySelectorAll("#btn-google-login, #btn-google-signup");
  if (!googleBtns.length) return;

  // Initialize official Google Identity Services if client ID is configured
  if (typeof google !== "undefined" && google.accounts && google.accounts.id && window.GOOGLE_CLIENT_ID) {
    try {
      google.accounts.id.initialize({
        client_id: window.GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
    } catch (err) {
      console.warn("Google GSI initialization warning:", err);
    }
  }

  googleBtns.forEach((googleBtn) => {
    googleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      triggerGoogleSignIn(googleBtn);
    });
  });
}

async function triggerGoogleSignIn(btn) {
  // 1. If Google Identity Services is available and Client ID is set:
  if (typeof google !== "undefined" && google.accounts && google.accounts.id && window.GOOGLE_CLIENT_ID) {
    try {
      google.accounts.id.prompt();
      return;
    } catch (gsiErr) {
      console.warn("Google One-Tap prompt error:", gsiErr);
    }
  }

  // 2. Clear, honest guidance if no Client ID is configured yet
  window.showToast(
    "Google Sign-In requires your Google Client ID in js/config.js. Or sign in directly with email and password below.",
    "info"
  );
  document.getElementById("login-email")?.focus();
}

async function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    window.showToast("No Google credential returned.", "error");
    return;
  }

  try {
    const parts = response.credential.split(".");
    if (parts.length !== 3) throw new Error("Invalid Google token format.");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    const email = payload.email;
    const name = payload.name || payload.given_name || "Google Student";
    const uid = payload.sub;

    if (!email || !uid) throw new Error("Google credential missing email or identity.");

    const backendAuth = await window.store.request("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ email, name, uid })
    });

    if (!backendAuth || !backendAuth.token) {
      throw new Error("Unable to create session from Google credential.");
    }

    window.store.setSession(backendAuth.token, backendAuth.profile);
    window.showToast(`Welcome, ${backendAuth.profile.name}! Signed in with Google.`, "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 400);
  } catch (err) {
    console.error("Google credential exchange error:", err);
    window.showToast(err.message || "Google authentication failed.", "error");
  }
}

function initPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!(input instanceof HTMLInputElement)) return;
      const showingPassword = input.type === "password";
      input.type = showingPassword ? "text" : "password";
      button.textContent = showingPassword ? "Hide" : "Show";
      button.setAttribute("aria-label", `${showingPassword ? "Hide" : "Show"} password`);
      button.setAttribute("aria-pressed", String(showingPassword));
    });
  });
}

function initLoginForm() {
  const loginForm = document.getElementById("form-login");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const submit = loginForm.querySelector("button[type='submit']");
    if (!email || !password) {
      window.showToast("Enter your student email and password.", "error");
      return;
    }
    const origHtml = submit ? submit.innerHTML : "";
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = `<span>Signing in...</span>`;
    }
    try {
      await window.store.login(email, password);
      window.showToast("Signed in.", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } catch (error) {
      window.showToast(error.message || "Unable to sign in.", "error");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = origHtml;
      }
    }
  });
}

function initSignupForm() {
  const signupForm = document.getElementById("form-signup");
  if (!signupForm) return;

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = {
      name: document.getElementById("signup-name")?.value.trim(),
      email: document.getElementById("signup-email")?.value.trim(),
      password: document.getElementById("signup-password")?.value,
      college: document.getElementById("signup-college")?.value.trim(),
      course: document.getElementById("signup-course")?.value.trim(),
      phone: document.getElementById("signup-phone")?.value.trim()
    };
    const submit = signupForm.querySelector("button[type='submit']");
    if (!fields.name || !fields.email || !fields.password || !fields.college || !fields.course) {
      window.showToast("Fill name, email, password, college, and course.", "error");
      return;
    }
    const origHtml = submit ? submit.innerHTML : "";
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = `<span>Creating account...</span>`;
    }
    try {
      await window.store.signup(fields);
      window.showToast("Student account created.", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } catch (error) {
      window.showToast(error.message || "Unable to create account.", "error");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = origHtml;
      }
    }
  });
}

function initForgotPasswordLink() {
  const forgotLink = document.getElementById("link-forgot-password");
  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email")?.value.trim();
      const promptMsg = email 
        ? `Password reset request received for '${email}'. Please check your inbox or contact your administrator.`
        : "Please enter your student email in the email field above, then click 'Forgot password?'.";
      window.showToast(promptMsg, "info");
    });
  }
}
