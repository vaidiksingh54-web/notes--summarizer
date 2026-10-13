# CogniStudy AI - Python Backend

Modern, high-performance study platform backend built with Python, Flask, SQLite, and Google Gemini AI.

## Project Structure

```
backend/
├── app.py                      # Application entry point & Flask application factory
├── config.py                   # Environment configuration & settings
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── README.md                   # Backend documentation
│
├── routes/                     # Modular API endpoints (Flask Blueprints)
│   ├── auth.py                 # User signup, login, session validation, logout
│   ├── user.py                 # Student profile retrieval & updates
│   ├── summarize.py            # AI summarization of study material
│   ├── upload.py               # Document & notes upload (PDF, TXT, MD, DOCX)
│   ├── notes.py                # CRUD operations for notes and study items
│   ├── quiz.py                 # Quiz generation and score tracking
│   ├── flashcards.py           # Flashcard deck generation & study items
│   ├── explain.py              # AI concept tutor & interactive study assistant
│   ├── history.py              # Student study activity logging & history
│   ├── search.py               # Full-text search across study items
│   ├── download.py             # Export study notes to Markdown, JSON, and PDF
│   └── dashboard.py            # Dashboard metrics, bootstrap data, and notifications
│
├── services/                   # Business logic and external integrations
│   ├── ai_service.py           # Gemini API client with graceful fallback
│   ├── summary_service.py      # Multi-format note summarizer
│   ├── quiz_service.py         # Multi-choice question generator
│   ├── flashcard_service.py    # Study flashcard card generator
│   ├── explain_service.py      # Detailed academic tutor explanations
│   ├── pdf_service.py          # PDF text extraction & basic PDF export
│   ├── document_service.py     # Multi-format document parser
│   ├── ocr_service.py          # Multimodal optical character recognition
│   ├── translation_service.py  # Multi-language academic translation
│   ├── text_to_speech_service.py # Audio study speech synthesis
│   ├── speech_to_text_service.py # Voice note speech transcription
│   └── export_service.py       # Exporter for MD, JSON, and PDF formats
│
├── models/                     # Data models and structures
│   ├── user.py                 # User profile model
│   ├── note.py                 # Study note item model
│   ├── summary.py              # Note summary model
│   ├── quiz.py                 # Quiz & question model
│   ├── flashcard.py            # Flashcard deck model
│   ├── history.py              # Study activity history model
│   └── user_session.py         # Auth session model
│
├── schemas/                    # Input validation and payload schemas
│   ├── auth_schema.py          # Signup/login payload validator
│   ├── user_schema.py          # Profile update validator
│   ├── note_schema.py          # Note CRUD validator
│   ├── summary_schema.py       # Summarization request validator
│   ├── quiz_schema.py          # Quiz generator validator
│   └── flashcard_schema.py     # Flashcard generator validator
│
├── database/                   # Persistent SQLite storage layer
│   ├── connection.py           # Thread-safe database connection provider
│   ├── database.py             # Complete CRUD repository queries
│   └── migrations.py           # Schema tables & indexes DDL
│
├── auth/                       # Security & credential utilities
│   ├── password.py             # PBKDF2-HMAC-SHA256 password hashing
│   ├── jwt.py                  # HS256 JWT token generation & verification
│   └── permissions.py          # Resource ownership access control
│
├── utils/                      # Helper utilities
│   ├── validation.py           # Input sanitization & field checkers
│   ├── error_handler.py        # Centralized ApiException handler
│   ├── file_validator.py       # Safe file upload size & extension filter
│   ├── text_chunker.py         # Text chunking for long documents
│   ├── logger.py               # Structured logging
│   └── helpers.py              # Slugs, response formatters, formatting
│
├── middleware/                 # Request processing middleware
│   ├── auth_middleware.py      # @require_auth Bearer token decorator
│   ├── cors.py                 # Cross-Origin Resource Sharing headers
│   └── rate_limit.py           # In-memory IP rate limiter
│
├── tests/                      # Automated test suite
│   ├── test_auth.py            # Signup, login, duplicate check tests
│   ├── test_summarize.py       # Note summarization tests
│   ├── test_upload.py          # File upload & extraction tests
│   ├── test_quiz.py            # Quiz generation & scoring tests
│   ├── test_notes.py           # Notes CRUD & favorites tests
│   └── test_history.py         # Activity logging & cleanup tests
│
└── uploads/                    # Local storage directory for uploads
    └── .gitkeep
```

## Setup & Running

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables
Copy `.env` or set environment variables:
```bash
GEMINI_API_KEY="your-gemini-api-key"
PORT=5000
HOST=0.0.0.0
```

### 3. Run Development Server
```bash
python3 backend/app.py
```

### 4. Run Automated Test Suite
```bash
TESTING=true python3 -m unittest discover -s backend/tests -p "test_*.py" -v
```

## Authentication & API Contract
- Authentication uses `Authorization: Bearer <token>` headers.
- Passwords are encrypted with `PBKDF2-HMAC-SHA256` (100,000 iterations).
- Tokens are HS256 signed JWTs backed by database session records.
- Cross-origin requests (CORS) and preflight requests are enabled out-of-the-box.
