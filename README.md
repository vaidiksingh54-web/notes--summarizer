# CogniStudy AI - Smart AI Study Assistant

Multipage academic web application and typed Node.js/Express backend built with TypeScript, Vite, and the official `@google/genai` SDK.

---

## 1. Quick Start & Local Development

### Prerequisites
- Node.js 20 or 22 LTS (Node 22 LTS recommended)
- npm v10+

### Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key if you want live AI summarization and flashcard generation. Keep `.env` private (it is git-ignored). Without an API key, all client pages and study tools remain accessible, while summary generation returns `503 GEMINI_NOT_CONFIGURED`.
3. Start the application:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`. In development, Express runs on port 3000 and mounts Vite's multi-page dev middleware, serving both the front-end pages and `/api/*` endpoints on the same origin.

### Other Run Modes
- **Separate Terminals**:
  - API only: `npm run dev:api` (runs on `http://127.0.0.1:5000`)
  - Web only: `npm run dev:web` (runs Vite dev on `http://localhost:3000` with `/api` proxying to `5000`)
- **Production Build & Preview**:
  ```bash
  npm run build
  npm start
  ```
  The server serves compiled static pages from `dist/` and handles `/api/*` routes.

---

## 2. API Endpoints

All responses are JSON (except `204 No Content` for successful deletions). Standard error responses follow `{ "error": "string", "code": "ERROR_CODE" }`.

| Method | Path | Auth Required? | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | Server status, storage type, and Gemini configuration status |
| `POST` | `/api/signup` | No | Create student account and start session |
| `POST` | `/api/login` | No | Authenticate credentials and return session token |
| `POST` | `/api/logout` | Yes | Invalidate active session token |
| `GET` | `/api/bootstrap` | Yes | Load student profile, study items, activities, and notifications |
| `POST` | `/api/summarize` | Yes | Generate structured summary via Gemini (accepts 20–25,000 chars) |
| `POST` | `/api/flashcards/generate` | Yes | Synthesize active-recall flashcard deck via Gemini |
| `GET` | `/api/items?type=all\|note\|flashcards\|quiz\|favorites` | Yes | List and filter study items |
| `POST` | `/api/items` | Yes | Create a study item (note, flashcard deck, or quiz) |
| `GET` | `/api/items/:id` | Yes | Retrieve a single study item |
| `PUT` | `/api/items/:id` | Yes | Update an existing study item |
| `PATCH` | `/api/items/:id/favorite` | Yes | Toggle favorite status |
| `DELETE` | `/api/items/:id` | Yes | Delete a study item |
| `GET`, `PUT` | `/api/profile` | Yes | Read or update student profile |
| `GET`, `POST` | `/api/activities` | Yes | Retrieve or log study activity |
| `DELETE` | `/api/activities/:id` | Yes | Dismiss an activity record |
| `GET` | `/api/notifications` | Yes | Retrieve student notifications |
| `PATCH` | `/api/notifications/read` | Yes | Mark all notifications as read |

---

## 3. Storage & Authentication Limitations

- **No Database Configured**: As requested, no database, schema, migrations, or database credentials are included in this project.
- **Temporary In-Memory Storage**: The development implementation (`InMemoryRepository` in `backend/src/repository/databaseRepository.ts`) stores data in Node.js server memory.
  - **Limitations**: All student accounts, session tokens, notes, flashcards, and quiz results are lost whenever the server process restarts.
  - **Single Instance**: Data is isolated to the single active Node.js server process and is not suitable for horizontal scaling across multiple container instances.
- **Authentication**: Passwords are cryptographically salted and hashed using Node's `scrypt` with timing-safe comparison. However, because account storage is in-memory, accounts reset on restart.

---

## 4. Connecting Your Own Database Later

All data access is strictly isolated behind the typed `Repository` interface:

1. **Repository Interface**: Located at `backend/src/repository/repository.ts`.
2. **Current Adapter**: `backend/src/repository/databaseRepository.ts` implements `InMemoryRepository`.
3. **Plugging In Your Database**:
   - Create your database adapter (e.g. `PostgresRepository`, `PrismaRepository`, or `MongoRepository`) implementing `Repository`.
   - In `backend/src/app.ts`:
     ```ts
     // Replace default InMemoryRepository with your database adapter:
     const repository = options.repository ?? new YourDatabaseRepository();
     ```
   - No route controllers or API endpoints need modification.

---

## 5. Security & Gemini AI Configuration

- `GEMINI_API_KEY` is read strictly from `process.env.GEMINI_API_KEY` on the server.
- The API key is **never** sent to the client browser or exposed in frontend code bundles.
- If the key is omitted or left as a placeholder, the app runs normally; calling `/api/summarize` returns a clear `503 GEMINI_NOT_CONFIGURED` error.
- All request bodies are strictly limited to 1 MB and validated before processing.

---

## 6. Verification Checks

Run these commands to verify the system:
- **TypeScript Typecheck**:
  ```bash
  npm run lint
  ```
- **Automated Test Suite**:
  ```bash
  npm test
  ```
- **Production Asset Build**:
  ```bash
  npm run build
  ```
