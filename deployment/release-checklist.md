# Production Pre-Release Checklist: CogniStudy AI

Use this checklist prior to promoting any release to preview or production environments.

---

## 1. Code & Build Validation
- [ ] TypeScript compilation passes cleanly (`npm run lint`).
- [ ] Unit & integration tests pass with 0 errors (`npm test`).
- [ ] Production build generates all 17 HTML entry points and static asset maps (`npm run build`).
- [ ] No extraneous console logs, debugging breakpoints, or sensitive data leaks in client scripts.

## 2. Environment & Secrets Configuration
- [ ] `.env` is absent from Git repository and verified in `.gitignore`.
- [ ] `GEMINI_API_KEY` is provisioned in the hosting environment secrets manager.
- [ ] `PORT` is either left to the cloud provider default or configured explicitly.
- [ ] `.env.example` contains only safe placeholder tokens.

## 3. Database & Storage Architecture
- [ ] Developer understands data storage is currently in-memory.
- [ ] No customer data is expected to persist across process restarts until a database is connected.
- [ ] If database is connected: schema migrations verified backward-compatible.

## 4. API & Frontend Compatibility
- [ ] All API routes respond with expected JSON payloads and standard status codes (200, 201, 204, 400, 401, 404, 409, 502, 503).
- [ ] Client store (`js/store.js`) properly sends `Authorization: Bearer <token>` on protected routes.
- [ ] 401 responses trigger seamless redirect to `login.html`.
- [ ] Safe external link openers used instead of blocked `window.open` calls.

## 5. Security & Privacy Compliance
- [ ] Passwords hashed using Node's cryptographic `scrypt` with random salt and timing-safe comparison.
- [ ] Request body parser limited to 1 MB to prevent memory exhaustion attacks.
- [ ] All user inputs validated and sanitized against cross-site scripting (XSS).
- [ ] Legal policies published: Privacy Policy, Terms of Service, Cookie Notice, Accessibility Statement, and Academic Disclaimer.

## 6. Health & Smoke Testing
- [ ] `GET /api/health` returns `200 OK` with `status: "ok"`.
- [ ] Student signup and login flows verified end-to-end.
- [ ] Note summarization verified (or returns appropriate 503 if API key unconfigured).
- [ ] Flashcard 3D flip and deck save functionality verified.
- [ ] Quiz execution, timer, and score calculation verified.
- [ ] 404 handler verified on invalid routes (`/non-existent-page`).

## 7. Rollback Readiness
- [ ] Previous stable git tag / container image verified in registry.
- [ ] Rollback steps documented and verified by deployment engineer.
