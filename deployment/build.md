# Build Process: CogniStudy AI

This document provides verified instructions for installing dependencies, running static checks, compiling assets, and preparing production builds.

---

## 1. Prerequisites

- **Node.js**: version `20.x` or `22.x` LTS (verified on `v22.23.2`)
- **Package Manager**: `npm` (v10+)
- **System Memory**: Minimum 1 GB RAM for Vite multi-page bundling and TypeScript compilation

---

## 2. Dependency Installation

To install all runtime and development packages:

```bash
npm install
```

Installed packages:
- Production: `@google/genai`, `@tailwindcss/vite`, `@vitejs/plugin-react`, `dotenv`, `express`, `lucide-react`, `motion`, `react`, `react-dom`, `vite`
- Dev/Tooling: `@types/express`, `@types/node`, `@types/react`, `@types/react-dom`, `autoprefixer`, `esbuild`, `tailwindcss`, `tsx`, `typescript`

---

## 3. Build Commands

### Step 1: Type Checking & Static Validation
```bash
npm run lint
```
Executes `tsc --noEmit` across backend and client files.

### Step 2: Test Suite Verification
```bash
npm test
```
Executes Node.js built-in test runner via `tsx --test` against:
- `backend/test/auth.test.ts` (account creation, login, session validation, logout)
- `backend/test/items.test.ts` (CRUD, owner isolation, favorites, deletion)
- `backend/test/ai.test.ts` (Gemini summarize validation, mock generation, missing key error)
- `backend/test/profile.test.ts` (profile edits, activity history, notification marks)

### Step 3: Production Asset Compilation
```bash
npm run build
```
Executes:
1. `vite build`: Compiles all 17 HTML entry points into `dist/` with hashed CSS and asset bundles.
2. `node scripts/copy-assets.mjs`: Copies static `css/` and `js/` folders into `dist/` ensuring backward compatibility for vanilla script imports.

### Step 4: Clean Artifacts
```bash
npm run clean
```
Recursively removes the `dist/` build directory.

---

## 4. Generated Artifacts

Following `npm run build`, the `dist/` directory contains:
```
dist/
├── index.html
├── dashboard.html
├── notes.html
├── flashcards.html
├── quiz.html
├── library.html
├── profile.html
├── login.html
├── signup.html
├── privacy.html
├── terms.html
├── cookies.html
├── accessibility.html
├── disclaimer.html
├── help.html
├── 404.html
├── 500.html
├── assets/
│   ├── components-*.css
│   └── auth-*.css
├── css/
└── js/
```

---

## 5. Verified Build Process Verification

- All HTML entry points must resolve without missing asset paths.
- TypeScript compiler passes with 0 diagnostic errors (`tsc --noEmit`).
- Test suite completes with 100% passing tests.
