/**
 * CogniStudy AI - Student account authentication
 */

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();
  initPasswordToggles();
  initGoogleAuth();
});

function initGoogleAuth() {
  const googleBtns = document.querySelectorAll("#btn-google-login, #btn-google-signup");
  if (!googleBtns.length) return;

  googleBtns.forEach((googleBtn) => {
    googleBtn.addEventListener("click", async () => {
      googleBtn.disabled = true;
      const originalText = googleBtn.innerHTML;
      googleBtn.innerHTML = `<span>Connecting with Google...</span>`;
      try {
        // Allow up to 2.5 seconds for module-based Firebase service to initialize
        let attempts = 0;
        while (!window.firebaseService && attempts < 25) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }
        if (!window.firebaseService) {
          throw new Error("Firebase auth service is still loading. Please try again in a moment.");
        }
        const { user, profile } = await window.firebaseService.signInWithGoogle();
        let sessionToken = `firebase_${user.uid}`;
        let sessionProfile = profile;
        if (window.store) {
          try {
            const backendAuth = await window.store.request("/api/auth/google", {
              method: "POST",
              body: JSON.stringify({ email: user.email, name: profile.name, uid: user.uid }),
            });
            if (backendAuth && backendAuth.token) {
              sessionToken = backendAuth.token;
              sessionProfile = backendAuth.profile;
            }
          } catch (_err) {
            // Continue with firebase_ token if direct backend sync fails
          }
          window.store.setSession(sessionToken, sessionProfile);
          if (typeof window.store.onFirebaseAuthUser === "function") {
            await window.store.onFirebaseAuthUser(user);
          }
        }
        if (typeof window.showToast === "function") {
          window.showToast(`Welcome, ${sessionProfile.name}!`, "success");
        }
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (error) {
        console.error("Google sign-in error:", error);
        const msg = error?.message || String(error);
        if (msg.includes("unauthorized-domain") || error?.code === "auth/unauthorized-domain") {
          const isIp = window.location.hostname === "127.0.0.1";
          const advice = isIp
            ? "Google Sign-In requires 'localhost'. Please open http://localhost:3000 in your browser, or add '127.0.0.1' under Firebase Console > Authentication > Settings > Authorized Domains."
            : "This domain is not authorized in Firebase Auth. Add this domain under Firebase Console > Authentication > Settings > Authorized Domains, or sign in with your student email and password.";
          if (typeof window.showToast === "function") {
            window.showToast(advice, "error");
          }
          document.getElementById("login-email")?.focus();
        } else if (msg.includes("popup-blocked") || error?.code === "auth/popup-blocked") {
          if (typeof window.showToast === "function") {
            window.showToast("Popup blocked by browser. Please allow popups or use email sign-in.", "error");
          }
        } else if (msg.includes("popup-closed-by-user") || error?.code === "auth/popup-closed-by-user") {
          if (typeof window.showToast === "function") {
            window.showToast("Sign-in window closed. Please try again.", "info");
          }
        } else {
          if (typeof window.showToast === "function") {
            window.showToast(msg || "Google sign-in was cancelled or failed.", "error");
          }
        }
      } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalText;
      }
    });
  });
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
    if (submit) submit.disabled = true;
    try {
      await window.store.login(email, password);
      window.showToast("Signed in.", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } catch (error) {
      window.showToast(error.message || "Unable to sign in.", "error");
    } finally {
      if (submit) submit.disabled = false;
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
    if (submit) submit.disabled = true;
    try {
      await window.store.signup(fields);
      window.showToast("Student account created.", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } catch (error) {
      window.showToast(error.message || "Unable to create account.", "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}
