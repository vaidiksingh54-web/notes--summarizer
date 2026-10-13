# Environments & Configuration: CogniStudy AI

This document details verified environment configurations, runtime variables, and external service requirements for CogniStudy AI.

---

## 1. Environment Overview

| Environment | Host/Runtime | Port | Execution Command | Storage Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Development (Vite + Express)** | Node.js 22 LTS | `3000` | `npm run dev` (`tsx server.ts`) | In-memory student sessions; data resets on server restart |
| **Standalone API Dev** | Node.js 22 LTS | `5000` | `npm run dev:api` | In-memory repository (`InMemoryRepository`) |
| **Production Preview** | Node.js 22 LTS | `3000` or `$PORT` | `npm start` (`node --import tsx server.ts`) | In-memory (until database repository adapter is connected) |
| **Cloud Run / Container** | Cloud Run Container | `$PORT` (default 3000/8080) | `npm start` | In-memory (stateless container instances; requires DB adapter for persistence) |

---

## 2. Environment Variables & Purpose

| Variable | Required? | Verified Default | Description & Security Handling |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3000` (`5000` in standalone) | Network port for Express HTTP server. Configurable by cloud platforms. |
| `HOST` | Optional | `0.0.0.0` in server / `127.0.0.1` standalone | Network binding interface. |
| `GEMINI_API_KEY` | Optional for app boot; Required for AI | `""` (placeholder in `.env.example`) | Secret API key used strictly server-side by `@google/genai` for summarization & flashcard synthesis. Never exposed to browser or client bundles. |
| `NODE_ENV` | Optional | `development` / `production` | Switches between Vite dev middleware mode (`development`) and Express static file serving from `dist/` (`production`). |
| `APP_URL` | Optional | Host URL | Base URL used for origin headers and self-referential endpoints. |

---

## 3. Configuration Differences: Dev vs Production

- **Development (`NODE_ENV=development`)**:
  - Express mounts `vite.middlewares` via Vite's `createServer({ server: { middlewareMode: true }, appType: 'mpa' })`.
  - Source HTML and CSS are served on the fly with live updates.
  - API routes (`/api/*`) are handled directly by Express router without proxy overhead.
- **Production (`NODE_ENV=production`)**:
  - Express serves compiled assets from `dist/` using `express.static`.
  - Multi-page HTML files (`index.html`, `dashboard.html`, `notes.html`, `flashcards.html`, `quiz.html`, etc.) are pre-bundled with minified CSS and script bundles.

---

## 4. Secrets Handling

- `.env` is listed in `.gitignore` to prevent leaking API keys or local settings to version control.
- `.env.example` contains only placeholder tokens (`GEMINI_API_KEY="MY_GEMINI_API_KEY"`).
- Client-side code (`js/*.js`) never imports `@google/genai` or references `process.env`. All AI queries pass through authenticated `/api/summarize` and `/api/flashcards/generate` endpoints.

---

## 5. Verified Dependencies vs Missing Infrastructure

- **Verified Working**:
  - Node.js 22 LTS
  - Express 4.21+
  - `@google/genai` 2.4+
  - Vite 8.3+
  - TypeScript 7 / `tsx`
- **Known Development Limitation**:
  - Data storage currently uses `InMemoryRepository` (`backend/src/repository/databaseRepository.ts`).
  - Student accounts and study materials do not persist across server restarts until a PostgreSQL/Cloud SQL or Firestore repository adapter is connected.
