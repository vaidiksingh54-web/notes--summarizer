# Evidence-Based Production Page & UX State Audit

**Project**: CogniStudy AI  
**Repository Architecture**: Multi-page HTML/CSS/Vanilla JS frontend with Node.js/Express TypeScript backend.  
**Audit Date**: October 2026  
**Auditor**: Senior Full-Stack Engineer & Product Auditor  

---

## Audit Table

| Category | Page or state | Status | Evidence | Applicability reason | Required action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Legal** | Privacy Policy | EXISTS_AND_ADEQUATE | `privacy.html`, `js/store.js` (handles student emails, names, notes, flashcards, and server-side Gemini requests) | Application collects personal student details and processes user study notes through AI services. | Retain `privacy.html` and keep linked in all footers. |
| **Legal** | Terms of Service | EXISTS_AND_ADEQUATE | `terms.html`, `index.html` footer | Public study app featuring user accounts, content generation, and academic study assistance. | Retain `terms.html` with explicit acceptable use and verification rules. |
| **Legal** | Cookie Policy / Storage Notice | EXISTS_AND_ADEQUATE | `cookies.html`, `js/store.js` (`localStorage.setItem(TOKEN_KEY)`) | App utilizes browser `localStorage` for essential session authentication tokens. | Retain `cookies.html` clarifying essential storage and absence of ad trackers. |
| **Legal** | Cookie Preferences | NOT_APPLICABLE | `js/store.js`, `package.json` (zero ad-tracking, Google Analytics, or marketing SDKs installed) | No non-essential cookies, marketing trackers, or third-party advertising scripts are loaded. | Exclude; essential storage does not require an opt-out preference modal. |
| **Legal** | Refund Policy | NOT_APPLICABLE | `package.json`, `backend/src/routes/` (no Stripe, PayPal, or subscription billing endpoints) | Application has no checkout, payment gateway, or monetized paywalls. | Exclude from project. |
| **Legal** | Cancellation Policy | NOT_APPLICABLE | `backend/src/routes/` (zero recurring subscriptions or booked appointments) | App does not process recurring subscriptions or paid bookings. | Exclude from project. |
| **Legal** | Shipping Policy | NOT_APPLICABLE | Codebase inspection shows purely digital study aids (notes, flashcards, quizzes) | No physical goods are sold or shipped. | Exclude from project. |
| **Legal** | Return / Exchange Policy | NOT_APPLICABLE | No physical merchandise or inventory in application | No physical products to return or exchange. | Exclude from project. |
| **Legal** | Academic Disclaimer | EXISTS_AND_ADEQUATE | `disclaimer.html`, `index.html` footer, `help.html` | Generative AI models can produce hallucinations; academic integrity policies require explicit disclosures. | Retain `disclaimer.html` ensuring students understand AI study assistance boundaries. |
| **Legal** | Accessibility Statement | EXISTS_AND_ADEQUATE | `accessibility.html`, `css/base.css` (WCAG AA contrast, reduced-motion rules, keyboard focus) | Public-facing academic website accessed by diverse students with varying accessibility needs. | Retain `accessibility.html` documenting supported accessible capabilities. |
| **Legal** | Data Processing Agreement (DPA) | NOT_APPLICABLE | B2C/individual student study app, not an enterprise B2B data sub-processor | No enterprise B2B customers executing sub-processing contracts for employee data. | Exclude from project. |
| **Legal** | Acceptable Use Policy | EXISTS_AND_ADEQUATE | Section 1 of `terms.html` | Prohibits abusive, defamatory, or copyright-violating text submissions in summarizer. | Retain as part of consolidated terms. |
| **Legal** | Security Policy | EXISTS_AND_ADEQUATE | `backend/src/services/auth.ts` (`scrypt` password hashing, timing-safe compare, 1MB payload limits) | Informs users of security practices without exposing internal server infrastructure. | Covered in documentation and Help Center. |
| **Legal** | Responsible Disclosure | NOT_APPLICABLE | Academic project with no external bug bounty program or formal security triage team | Small student-focused educational tool with no public vulnerability reporting protocol. | Exclude until enterprise security program is launched. |
| **Legal** | Community Guidelines | NOT_APPLICABLE | `backend/src/routes/items.ts` (items are isolated per student ID; no public social feed or comment forums) | No peer-to-peer user messaging, social comments, public profiles, or community feeds. | Exclude from project. |
| **Customer Lifecycle** | Login | EXISTS_AND_ADEQUATE | `login.html`, `js/auth.js`, `backend/src/routes/auth.ts` (`POST /api/login`) | User accounts are supported for student private study workspace isolation. | Retain verified login page with password reveal toggle and safe redirect. |
| **Customer Lifecycle** | Register / Signup | EXISTS_AND_ADEQUATE | `signup.html`, `js/auth.js`, `backend/src/routes/auth.ts` (`POST /api/signup`) | New students must be able to create an account to start storing notes. | Retain verified signup page with validated academic fields (college, course). |
| **Customer Lifecycle** | Email Verification | NOT_APPLICABLE | `backend/src/routes/auth.ts`, `backend/src/services/auth.ts` (no SMTP/SES mailer configured) | No transactional email provider (SendGrid, Postmark, AWS SES) configured in project. | Exclude until email service provider is provisioned. |
| **Customer Lifecycle** | Forgot Password | NOT_APPLICABLE | No database or email service; accounts are temporary in-memory during development | Cannot send reset emails without an email transport provider or persistent database. | Exclude until database and mail transport are integrated. |
| **Customer Lifecycle** | Reset Password | NOT_APPLICABLE | Same as Forgot Password above | No mailer or persistent user store. | Exclude until email integration is added. |
| **Customer Lifecycle** | Onboarding | EXISTS_AND_ADEQUATE | `index.html` (How It Works section), `help.html` (step-by-step guides for all 4 tools) | First-time students require clear orientation for notes, flashcards, and quizzes. | Retain embedded guides and Help Center walkthroughs. |
| **Customer Lifecycle** | Account Settings | EXISTS_AND_ADEQUATE | `profile.html`, `js/profile.js`, `backend/src/routes/profile.ts` (`GET/PUT /api/profile`) | Allows editing student name, email, phone, college, course, and bio. | Retain profile view and modal editor. |
| **Customer Lifecycle** | Billing & Subscription | NOT_APPLICABLE | No payment provider or subscription tiers in project | Product is free student study aid with zero paid tiers. | Exclude from project. |
| **Customer Lifecycle** | Payment Success/Failure | NOT_APPLICABLE | No payment gateway in project | No transaction processing. | Exclude from project. |
| **Customer Lifecycle** | Support & Help Center | EXISTS_AND_ADEQUATE | `help.html`, `index.html#faq` | Students require troubleshooting and guidance on study features and calendar sync. | Retain comprehensive `help.html` documentation. |
| **UX & System States** | 404 Not Found | EXISTS_AND_ADEQUATE | `404.html`, `backend/src/app.ts` (`ApiError(404)`) | Users navigating to invalid URLs need helpful recovery links. | Retain `404.html` with safe return navigation. |
| **UX & System States** | 403 Forbidden | EXISTS_AND_ADEQUATE | `backend/src/services/auth.ts`, `backend/test/items.test.ts` (unauthorized access returns 401/404) | Prevents students from reading or mutating other students' study materials. | Handled via API authorization middleware. |
| **UX & System States** | 500 Server Error | EXISTS_AND_ADEQUATE | `500.html`, `backend/src/app.ts` (centralized error middleware returning 500) | Server crashes or uncaught exceptions need friendly recovery screen with retry button. | Retain `500.html`. |
| **UX & System States** | Maintenance Mode | NOT_APPLICABLE | App is a standalone single-container app without maintenance worker proxies | Maintenance mode is managed at host/CDN level if ever needed. | Exclude from application layer. |
| **UX & System States** | Offline State | EXISTS_AND_ADEQUATE | `js/app.js` (`.offline-banner`), `js/store.js` (`window.addEventListener('offline')`) | Students studying in poor Wi-Fi need clear indication that server sync is paused. | Retain dynamic top alert banner. |
| **UX & System States** | Empty State | EXISTS_AND_ADEQUATE | `library.html` (`#library-empty-view`), `flashcards.html` (`#fc-empty-state`), `quiz.html` (`#quiz-empty-view`) | Surfaces with zero items must guide user to create their first note or deck. | Retain dedicated empty state illustrations and CTA buttons. |
| **UX & System States** | No Search Results | EXISTS_AND_ADEQUATE | `js/library.js` (filters display `#library-empty-view` when query matches 0 items) | Search queries with no matching cards must explain and prompt query reset. | Verified functional in library search. |
| **UX & System States** | Loading State | EXISTS_AND_ADEQUATE | `notes.html` (`#output-loading-state`), `flashcards.html` (`#fc-loading-state`), `quiz.html` (`#quiz-loading-view`) | AI generation takes 1–3 seconds; spinners with progress step labels prevent abandonment. | Retain multi-step animated spinners. |
| **UX & System States** | Error State | EXISTS_AND_ADEQUATE | `window.showToast(..., "error")`, `notes.html` (renders error in output card if API fails) | API rejections (400, 409, 502, 503) must show actionable toast notifications. | Retain explicit error messages. |
| **UX & System States** | Success State | EXISTS_AND_ADEQUATE | `window.showToast(..., "success")`, score celebration in `quiz.html` | Confirms note save, flashcard mastery, deck creation, and profile updates. | Retain toast and score completion banners. |
| **UX & System States** | Session Expired | EXISTS_AND_ADEQUATE | `js/store.js` (intercepts 401 status, clears token, and routes to `login.html`) | Expired or invalid tokens must not trap users in infinite loops. | Verified in `store.request()`. |

---

## Consolidated Missing Owner Information

The following business/legal facts are intentionally flagged as **UNKNOWN / NEEDS OWNER CONFIRMATION**:
1. **Legal Business Entity Name**: Currently branded as "CogniStudy AI (Student Edition)". Legal registered corporate entity (LLC, Inc., or University Lab) has not been declared.
2. **Designated Privacy Officer Contact**: Currently routes to Help Center; no dedicated DPO email has been assigned.
3. **Formal Jurisdiction / Governing Law**: The jurisdiction for arbitration or dispute resolution has not been selected by the project owner.
4. **Permanent Database Credentials**: Intentionally omitted per user brief ("I will choose and manage the database myself").
