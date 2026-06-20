# theScaleOn Hiring Portal

A full-stack internship assessment portal with role-based MCQ tests and live proctoring.

---

## Stack
- **Backend:** Python 3.12 · FastAPI · SQLAlchemy · SQLite (local) / PostgreSQL (production)
- **Frontend:** React 18 · Vite · React Router · Axios
- **Auth:** JWT tokens (6h expiry) · bcrypt password hashing
- **Proctoring:** Webcam frame capture (canvas → JPEG, every 5s) · tab-switch / window-blur detection · 3-warning auto-submit

---

## Quick Start

### 1. Backend

```bash
cd backend

# Install dependencies (one-time)
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic python-jose \
    "passlib[bcrypt]" "bcrypt==4.0.1" python-multipart pillow

# Seed the database (creates admin account + roles + sample questions)
python -m app.seed

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API runs at: **http://localhost:8000**
Swagger docs: **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend

# Install dependencies (one-time)
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Default Credentials

### Admin Login
- **URL:** http://localhost:5173/admin/login
- **Email:** admin@thescaleon.com
- **Password:** scaleon@admin123

> ⚠️ Change this password before deploying.

### Candidates
Candidates don't self-register. Add them via the Admin Dashboard.
- Go to Admin → Candidates → Add New Candidate
- Set a name, email, access code (e.g. `SC-2025-001`), and role
- Share the email + access code with the candidate
- They log in at: http://localhost:5173/login

---

## Roles & Question Sets

Three separate roles with completely independent question banks:

| Role | Slug |
|------|------|
| AI Agent Developer | `ai_agent_developer` |
| Project Management | `project_management` |
| Social Media Marketing | `social_media_marketing` |

Each role has questions seeded across 3 sections:
- **Aptitude** (4 questions, 20 min) — same logical/quant base for all roles
- **Coding MCQ** (5 questions, 30 min) — role-specific technical knowledge
- **Case Study** (3 questions, 25 min) — role-specific scenario questions

Add your own questions via the admin panel under **Questions**.

---

## Proctoring System

### How it works
1. **Camera capture:** A JPEG frame (320×240, quality 50%) is taken every 5 seconds via canvas and uploaded to `/proctor/frame`. Stored in `backend/app/uploads/frames/<session_id>/`.
2. **Tab-switch detection:** `document.visibilitychange` + `window.blur` events trigger a `/proctor/event` API call.
3. **Warning system:** Each violation increments the session's `warning_count`. At 3 warnings, the session is auto-submitted immediately and the candidate is redirected to results.

### Warning types logged
- `tab_switch` — switched tabs or minimized
- `window_blur` — browser lost focus
- `camera_blocked` — camera access denied/revoked

### Admin review
- Go to Admin → Results → View Log next to any candidate
- See each warning with timestamp, type, and detail

---

## API Reference (key endpoints)

| Method | Endpoint | Who |
|--------|----------|-----|
| POST | `/auth/admin/login` | Admin login |
| POST | `/auth/candidate/login` | Candidate login |
| GET | `/admin/candidates` | List all candidates + latest results |
| POST | `/admin/candidates` | Add candidate |
| GET | `/admin/questions` | List questions (filter by role_id, section) |
| POST | `/admin/questions` | Add question |
| GET | `/admin/sessions/{id}/proctor-events` | Proctoring log for a session |
| POST | `/test/start` | Start/resume test session |
| GET | `/test/section/{section}` | Get questions for a section |
| POST | `/test/answer` | Save an answer |
| POST | `/test/advance-section` | Move to next section |
| POST | `/test/finish` | Submit and score the test |
| POST | `/proctor/frame` | Upload a webcam frame |
| POST | `/proctor/event` | Log a violation (triggers warning) |
| GET | `/proctor/status` | Get current session state |

---

## Moving to PostgreSQL (when deploying)

1. `pip install psycopg2-binary`
2. In `backend/app/database.py`, change:
   ```python
   DATABASE_URL = "postgresql://user:password@localhost/scaleon_portal"
   ```
3. Remove `connect_args={"check_same_thread": False}` (SQLite-only)
4. Re-run `python -m app.seed`

---

## Project Structure

```
scaleon-portal/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app + CORS + router registration
│       ├── database.py      # SQLAlchemy engine + session
│       ├── models.py        # DB models (Admin, Candidate, Question, TestSession, ...)
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── auth.py          # JWT + bcrypt utilities + auth dependencies
│       ├── seed.py          # Initial data seeder
│       ├── routers/
│       │   ├── auth_router.py    # /auth/...
│       │   ├── admin_router.py   # /admin/...
│       │   ├── test_router.py    # /test/...
│       │   └── proctor_router.py # /proctor/...
│       └── uploads/frames/  # Webcam snapshots (per session subfolder)
└── frontend/
    └── src/
        ├── App.jsx              # Router + auth guards
        ├── index.css            # theScaleOn design system
        ├── api/client.js        # Axios instance + interceptors
        ├── context/AuthContext.jsx
        └── pages/
            ├── AdminLogin.jsx
            ├── CandidateLogin.jsx
            ├── AdminDashboard.jsx   # Candidates + Questions + Results tabs
            ├── TestReady.jsx        # Pre-test instructions + camera check
            ├── TestExam.jsx         # Live test: MCQ + timer + proctoring
            └── TestResult.jsx       # Score display after submission
```
