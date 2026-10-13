# Deployment Architecture & Operations: CogniStudy AI

This document outlines the deployment workflow, hosting architecture, health check verification, and common operational failure modes.

---

## 1. Deployment Architecture

```
                    Internet / Student Browser
                                │
                                ▼
                       [ Reverse Proxy / CDN ]
                                │
                                ▼
                CogniStudy AI Server (Node.js 22)
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
    Static Multi-Page App                  Express REST API
    (HTML / CSS / Vanilla JS)             (/api/health, /api/auth,
            │                             /api/items, /api/summarize)
            │                                       │
            │                         ┌─────────────┴─────────────┐
            │                         ▼                           ▼
            │               InMemoryRepository             Gemini AI API
            │               (Per-student Maps)          (google.genai SDK)
            │                         │
            ▼                         ▼
   Student Browser View       [ Future: User Database ]
```

---

## 2. Deployment Prerequisites

1. **Node.js Environment**: Node.js 20 or 22 LTS with `npm`.
2. **Environment Secret**: `GEMINI_API_KEY` configured in the server environment (e.g. Secret Manager or Cloud Run env vars).
3. **Execution Command**:
   ```bash
   NODE_ENV=production PORT=3000 node --import tsx server.ts
   ```

---

## 3. Verified Deployment Steps

1. **Clone & Install**:
   ```bash
   npm ci --omit=dev  # or npm install
   ```
2. **Run Lint and Tests**:
   ```bash
   npm run lint
   npm test
   ```
3. **Compile Build Bundle**:
   ```bash
   npm run build
   ```
4. **Launch Application Server**:
   ```bash
   npm start
   ```
5. **Verify Endpoint Health**:
   ```bash
   curl -s http://localhost:3000/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "storage": "in-memory-per-student",
     "auth": "student-accounts",
     "geminiConfigured": true
   }
   ```

---

## 4. Common Failure Points & Remedies

| Symptom / Failure | Root Cause | Verified Resolution |
| :--- | :--- | :--- |
| `503 GEMINI_NOT_CONFIGURED` on `/api/summarize` | `GEMINI_API_KEY` missing or set to placeholder | Set valid `GEMINI_API_KEY` in environment secrets. |
| `401 UNAUTHENTICATED` on `/api/bootstrap` or `/api/items` | Student not signed in or session token expired | Redirect to `login.html` and authenticate student account. |
| Data lost after container restart | Server storage is in-memory by design | Connect a persistent SQL/Firestore database adapter implementing `Repository`. |
| Port binding error `EADDRINUSE` | Port 3000 or 5000 occupied by previous process | Terminate existing Node process or configure `PORT=<free_port>`. |
| `405 Method Not Allowed` on API calls | Static server running without API proxy (e.g., Live Server) | Run full-stack dev server with `npm run dev` on port 3000. |
