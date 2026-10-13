# Rollback & Recovery Guide: CogniStudy AI

This document defines disaster recovery, revision rollback, and failure recovery protocols based on the verified architecture.

---

## 1. Current Rollback Capabilities

| Dimension | Supported Status | Recovery Process |
| :--- | :--- | :--- |
| **Application Code / Frontend** | FULLY SUPPORTED | Revert to previous Git commit/tag, rebuild (`npm run build`), and restart server process. |
| **Server Configuration** | FULLY SUPPORTED | Revert environment variable definitions (`PORT`, `GEMINI_API_KEY`). |
| **Database Migrations** | NOT APPLICABLE / NOT IMPLEMENTED | No database exists in the codebase yet. Data is in-memory and resets on process restart. |
| **Automated Blue/Green / Canary** | PLATFORM DEPENDENT | Configured via host platform (e.g. Cloud Run revisions, Docker tags, Vercel deployments). |

---

## 2. Fast Rollback Procedure (Host Level)

If a newly deployed commit introduces errors in production:

1. **Rollback Source Code**:
   ```bash
   git checkout <PREVIOUS_KNOWN_GOOD_TAG_OR_COMMIT>
   ```
2. **Re-install & Verify**:
   ```bash
   npm install
   npm run lint
   npm test
   ```
3. **Rebuild Static Output**:
   ```bash
   npm run build
   ```
4. **Restart Process**:
   ```bash
   npm start
   ```
5. **Verify Health Endpoint**:
   ```bash
   curl -I http://localhost:3000/api/health
   ```

---

## 3. Database Migration Considerations (Future Integration)

When you connect your own database adapter to the `Repository` interface:
- **Zero Schema Locks**: Ensure schema migrations are backward-compatible with previous application code revisions before dropping or renaming columns.
- **Rollback Scripts**: Maintain corresponding downward migration scripts (`down.sql` or ORM rollback scripts).
- **In-Memory Notice**: Currently, because no database exists, no schema migrations are running.

---

## 4. Disaster Recovery & Emergency Fallback

- If the server experiences fatal errors, requests are directed to `500.html` by reverse proxies.
- If connectivity to the backend is interrupted, client-side store activates `.offline-banner` with actionable messages.
- If Gemini API provider outages occur, `/api/summarize` returns explicit `502 GEMINI_PROVIDER_ERROR` with retry recommendations rather than silent failures.
