# EduSense — Technical Documentation
**Version 3.0 · AI-Powered University Management System**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [User Roles & Access](#3-user-roles--access)
4. [Feature Reference](#4-feature-reference)
5. [Technology Stack](#5-technology-stack)
6. [Project Structure](#6-project-structure)
7. [Data Model](#7-data-model)
8. [Authentication & Security](#8-authentication--security)
9. [QR Attendance System](#9-qr-attendance-system)
10. [Email Notifications](#10-email-notifications)
11. [Internationalization (i18n)](#11-internationalization-i18n)
12. [Backend API](#12-backend-api)
13. [Deployment](#13-deployment)
14. [Demo Credentials](#14-demo-credentials)
15. [Known Limitations & Roadmap](#15-known-limitations--roadmap)

---

## 1. System Overview

EduSense is a full-featured university management system built as a React single-page application (SPA) with a FastAPI backend. It provides dedicated portals for four roles:

| Role | Description |
|------|-------------|
| **Student** | Personal academic dashboard, QR attendance, appeals, bookings |
| **Doctor (Lecturer)** | Live session control, QR generation, grade management, AI insights |
| **Admin** | Full system control, user management, audit log, analytics |
| **Parent** | Child performance monitoring, attendance alerts |

The system is currently deployed as a **full demo** on Hostinger. All data is seeded from a real student dataset and persists in the browser's localStorage during a session. The FastAPI backend is built and ready to be connected for real multi-user persistence.

---

## 2. Architecture

### Current (Demo Mode)
```
Browser / Mobile
    │
    ▼ HTTPS
React SPA (Hostinger)
    │
    ├── localStorage (edusense_store)   ← all persistent data
    ├── sessionStorage (es_pending_qr)  ← cross-login QR state
    └── EmailJS API                     ← email notifications
```

### Production (with Backend)
```
Browser / Mobile
    │
    ▼ HTTPS
React SPA (Hostinger / Vercel / CDN)
    │
    ▼ REST API (JWT Bearer token)
FastAPI Backend (Railway / Render / VPS)
    │
    ▼ SQL
SQLite → PostgreSQL (scale up)
```

### State Management
- **`src/dataStore.js`** — singleton DataStore class, instantiated once at app start
- Data loaded from `src/data/store.json` (seed) + `src/data/credentials.js` (users)
- Persisted to localStorage key `edusense_store` on every write
- QR session state uses isolated key `es_qr` (never overwritten by main persist cycle)
- Backend API calls are fire-and-forget via `_callAPI()` — failures fall back to local data silently

---

## 3. User Roles & Access

### Student
- Views own dashboard: GPA, attendance rate, emotion scores, engagement trend
- Checks in via QR (mobile scan or manual code entry)
- Downloads PDF transcript via jsPDF
- Submits grade appeals, tracks status
- Books office hours with lecturers
- Views timetable, academic calendar, graduation roadmap
- Digital ID card, fee history, GPA calculator

### Doctor (Lecturer)
- Manages own courses only
- Starts live sessions → generates QR code (real URL encoded as base64)
- Views per-student emotion and attention data
- AI Insights dashboard: class-wide engagement analytics
- Sends low-attendance email alerts (one click per student)
- Reviews grade appeals, approves/rejects
- Manages office hours slots
- Live lecture polls

### Admin
- Full access to all students, doctors, courses, departments
- Creates new user accounts (student / doctor / parent / admin)
- Sends credentials via email on account creation
- Manages exams, announcements, fees
- Audit log: filterable by action type, actor, date range
- At-Risk dashboard: students below 75% attendance
- Exam proctoring panel (webcam monitoring)
- Academic advising management
- Final decision on grade appeals

### Parent
- Reads linked child's attendance, GPA, emotion data
- Receives automatic alerts when child attendance < 75%
- Views exam results and course grades
- Cannot modify any data

---

## 4. Feature Reference

### QR Attendance (cross-device)
The QR code contains the full session data encoded as a URL:
```
https://edusense.hostinger.com/?checkin=<base64(JSON)>
```
JSON payload: `{ courseId, week, createdAt }`

When a student scans the QR with their phone:
1. URL opens in mobile browser
2. `App.jsx` reads the `?checkin=` param on init
3. Data is saved to `sessionStorage` (survives the login redirect)
4. After login, `StudentPage` detects `pendingQR` and auto-checks-in
5. QR sessions expire after 90 minutes

### Grade Appeal Workflow
```
Student submits appeal
    → Doctor reviews → Approve / Reject / Escalate
    → Admin makes final decision
    → Student sees status update in real time
```

### PDF Transcript Export
Generated client-side using jsPDF. Includes:
- Student name, ID, department, year
- Course-by-course grade table
- GPA summary
- University header with EduSense branding

### Audit Log
Every data-modifying action records:
```json
{
  "id": "uuid",
  "action": "GradeChange",
  "actor": "dr.ahmed",
  "target": "S019",
  "detail": "CS401: 78 → 85",
  "timestamp": "2025-05-20T14:33:00Z"
}
```
Filterable by: action type, date range, actor. Visible to Admin only.

### Email Notifications
Sent via EmailJS (no SMTP credentials in code):
- **Low attendance alert** — sent by doctor, to student email
- **Withdrawal notice** — when student is withdrawn from a course
- **Account credentials** — when admin creates a new user account

### Onboarding Tour
First-login modal walkthrough per role. Completion tracked in localStorage key `es_tour_{role}`. Shows relevant features for each role. Can be dismissed and won't reappear.

---

## 5. Technology Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI framework |
| Vite | 8 | Build tool / dev server |
| Framer Motion | latest | Page transitions, animations |
| Recharts | latest | Charts (engagement, emotion, trends) |
| jsPDF | latest | Client-side PDF generation |
| qrcode.react | latest | QR code rendering |
| EmailJS | v3 API | Email delivery (no SMTP server needed) |

### Backend (FastAPI)
| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.111.1 | REST API framework |
| uvicorn | 0.30.1 | ASGI server |
| aiosqlite | 0.20.0 | Async SQLite |
| bcrypt | 4.1.3 | Password hashing |
| python-jose | 3.3.0 | JWT token signing |
| pydantic | 2.7.4 | Request/response validation |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Hostinger | Frontend static hosting (HTTPS) |
| Railway or Render | FastAPI backend hosting |
| EmailJS | Transactional email (free tier: 200/month) |

---

## 6. Project Structure

```
portal/
├── Ddownloadedusense-web/          # React frontend
│   ├── src/
│   │   ├── App.jsx                 # Root: routing, auth, QR init, rate limiting
│   │   ├── dataStore.js            # Singleton data layer (auth, CRUD, persistence)
│   │   ├── api.js                  # API client (BASE = VITE_API_URL)
│   │   ├── theme.js                # DARK / LIGHT theme objects
│   │   ├── data/
│   │   │   ├── store.json          # Seed data (students, doctors, courses)
│   │   │   └── credentials.js      # Student + doctor login credentials
│   │   ├── context/
│   │   │   └── LanguageContext.jsx # i18n provider (en / ar, RTL toggle)
│   │   ├── hooks/
│   │   │   └── useMobile.jsx       # Responsive breakpoint hook
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Split-screen login, role selection
│   │   │   ├── StudentPage.jsx     # Student portal (all student features)
│   │   │   ├── DoctorPage.jsx      # Lecturer portal
│   │   │   ├── AdminPage.jsx       # Admin portal
│   │   │   ├── ParentPage.jsx      # Parent portal
│   │   │   ├── AuditLogPage.jsx    # Filterable audit log
│   │   │   ├── AIInsightPage.jsx   # AI analytics overlay
│   │   │   ├── ExamProctoringPage.jsx
│   │   │   ├── AdvisingPage.jsx
│   │   │   ├── AtRiskPage.jsx
│   │   │   ├── GPACalculatorPage.jsx
│   │   │   ├── TimetablePage.jsx
│   │   │   ├── DigitalIDPage.jsx
│   │   │   ├── FeeHistoryPage.jsx
│   │   │   ├── OfficeHoursPage.jsx
│   │   │   ├── AcademicCalendarPage.jsx
│   │   │   ├── GraduationRoadmapPage.jsx
│   │   │   └── LivePollPage.jsx
│   │   └── components/
│   │       ├── Sidebar.jsx         # Role-aware nav sidebar
│   │       ├── Topbar.jsx          # Header with theme, language, user
│   │       ├── Charts.jsx          # Reusable Recharts wrappers
│   │       ├── OnboardingTour.jsx  # First-login walkthrough
│   │       ├── EmptyState.jsx      # Empty list placeholder component
│   │       ├── NotificationToast.jsx
│   │       ├── ChatWidget.jsx
│   │       ├── QRCode.jsx
│   │       └── ...
│   ├── .env                        # Local env vars (gitignored)
│   ├── .env.example                # Template for env vars
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
│
└── emotion_system/
    └── backend/                    # FastAPI backend
        ├── main.py                 # App entry point, router registration
        ├── requirements.txt
        ├── runtime.txt             # python-3.10.11
        ├── Procfile                # Heroku/Railway start command
        ├── railway.json            # Railway deployment config
        ├── render.yaml             # Render deployment config
        └── routers/                # 20+ API route modules
```

---

## 7. Data Model

### Student Record
```json
{
  "id": "S019",
  "name": "مرام تامر عبدالحى",
  "emoji": "👩",
  "color": "#3b82f6",
  "dept": "Computer Science",
  "year": 2,
  "email": "231014184.0@university.edu",
  "phone": "",
  "emotion": "neutral",
  "attention": "moderate",
  "engagement": 70,
  "attentionScore": 61,
  "attendanceRate": 75,
  "gpa": 2.1,
  "present": false,
  "confidence": 0.82,
  "hasFace": true
}
```

### Doctor Record
```json
{
  "id": "D001",
  "name": "Dr. Ahmed Smith",
  "dept": "Computer Science",
  "title": "Professor",
  "email": "ahmed@university.edu",
  "courses": 3,
  "students": 45,
  "engagement": 72
}
```

### Attendance Record
Stored per student per course per week:
```json
{
  "studentId": "S019",
  "courseId": "CS401",
  "week": 7,
  "attended": true,
  "score": 1.0,
  "method": "qr",
  "timestamp": 1716220000000
}
```

### Grade Appeal
```json
{
  "id": "appeal_1716220000",
  "studentId": "S019",
  "courseId": "CS401",
  "reason": "I believe the midterm grade does not reflect my work.",
  "currentGrade": 65,
  "requestedGrade": 75,
  "status": "pending",       // pending | doctor_approved | doctor_rejected | admin_approved | admin_rejected
  "doctorNote": "",
  "adminNote": "",
  "createdAt": 1716220000000
}
```

### QR Session
Stored in localStorage key `es_qr`:
```json
{
  "sessions": [
    {
      "token": "uuid-v4",
      "courseId": "CS401",
      "week": 7,
      "createdAt": 1716220000000
    }
  ]
}
```

### Audit Log Entry
```json
{
  "id": "audit_1716220000",
  "action": "GradeChange",
  "actor": "dr.ahmed",
  "actorRole": "doctor",
  "target": "S019",
  "detail": "CS401 midterm: 65 → 75",
  "timestamp": 1716220000000
}
```

---

## 8. Authentication & Security

### Demo Authentication Flow
```
User enters username + password
    → Rate limiter check (sessionStorage: es_login_rate)
    → If locked: throw error with remaining seconds
    → store.authenticate(username, password)
        → Try backend API first (api.login)
        → On failure: fall back to local credential match
    → On success: reset rate counter, set user state
    → On failure: increment counter (5 failures → 30s lockout)
```

### Rate Limiting
- Max attempts: **5**
- Lockout duration: **30 seconds**
- State stored in: `sessionStorage` (resets on tab close)
- Reset on: successful login, explicit logout

### Security Properties (Demo)
| Property | Status |
|----------|--------|
| HTTPS | ✅ Active (Hostinger) |
| XSS protection | ✅ React escapes all interpolated values |
| Login brute-force protection | ✅ Rate limiting (5 attempts / 30s) |
| SMTP credentials in bundle | ✅ None (EmailJS used, no raw SMTP) |
| .env in git | ✅ Gitignored |
| Session persistence across refresh | ✅ None (user state is in-memory only) |
| SQL injection | ✅ N/A (no SQL in demo mode) |

### Security Properties (Backend Mode)
| Property | Status |
|----------|--------|
| JWT authentication | ✅ python-jose with HS256 |
| Password storage | ✅ bcrypt hashing |
| Token expiry | ✅ Configurable (default 8h) |
| RBAC | ✅ Per-route role enforcement |
| SQL injection | ✅ Pydantic validation + parameterized queries |

---

## 9. QR Attendance System

### How It Works

**Doctor side (PC):**
1. Doctor navigates to QR tab in their session panel
2. Clicks "Generate QR" → `createQRSession()` is called
3. Session is stored in `es_qr` localStorage key
4. QR renders as a scannable image containing the full check-in URL:
   ```
   https://edusense.hostinger.com/?checkin=<base64>
   ```
5. Base64 decodes to: `{ courseId, week, createdAt }`

**Student side (Mobile):**
1. Student scans QR with phone camera
2. Phone opens the URL in mobile browser
3. `App.jsx` reads `?checkin=` param and saves to `sessionStorage`
4. URL parameter is cleared (`replaceState`) to avoid re-triggers
5. Student logs in (or is already logged in)
6. `StudentPage` detects `pendingQR` on mount
7. Checks session age: expires after **90 minutes**
8. If valid: calls `store.markAttendance()` and shows success message
9. Clears `pendingQR` from sessionStorage

### Edge Cases Handled
- QR scanned before login → data survives the login redirect via `sessionStorage`
- QR scanned on same device as generator → works correctly (isolated `es_qr` key)
- Expired QR (> 90 min) → clear error message, no false check-in
- Malformed QR → try/catch, shows "Invalid QR code" message

---

## 10. Email Notifications

Email is sent via **EmailJS** — no SMTP server or credentials required on the server.

### Configured Templates
| Template ID | Trigger | Recipient |
|-------------|---------|-----------|
| `template_dxys6ih` | Low attendance alert | Student |
| `template_dxys6ih` | Course withdrawal notice | Student |
| `template_n1v9mtb` | New account credentials | New user (any role) |

### Configuration
```js
// In DoctorPage.jsx and AdminPage.jsx
service_id:  'service_it50w6l'
user_id:     '3nrjXvpxGXf0G01Xj'
template_id: 'template_xxx'
```

No credentials are stored in the codebase. EmailJS authenticates via domain allowlist and public user ID.

### Fallback
If EmailJS fails, AdminPage shows a "Open in Mail App instead" button which opens `mailto:` with pre-filled subject and body.

---

## 11. Internationalization (i18n)

### Context
`src/context/LanguageContext.jsx` provides:
- `lang` — `'en'` | `'ar'`
- `isRTL` — boolean (true when `lang === 'ar'`)
- `t(key)` — translation lookup function
- `toggleLang()` — switch language

### RTL Layout
When `isRTL` is true:
- Root `direction: 'rtl'` applied to all pages
- `flex-direction: row-reverse` on horizontal layouts
- Sidebar slides from right
- Text alignment switches
- All animated transitions respect direction

### Translation Keys
Translation strings cover: navigation labels, page titles, status messages, button labels, form placeholders, error messages, and data labels — across all 4 portals.

---

## 12. Backend API

The FastAPI backend (`emotion_system/backend/`) is fully built with 20+ route modules.

### Base URL
```
http://localhost:8000        (development)
$VITE_API_URL               (production, set in .env)
```

### Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Authenticate, returns JWT token |
| `GET`  | `/api/init` | Bulk load all user-relevant data post-login |
| `GET`  | `/api/students` | List all students (admin/doctor) |
| `GET`  | `/api/students/{id}` | Single student record |
| `POST` | `/api/attendance` | Record attendance entry |
| `GET`  | `/api/courses` | List courses |
| `POST` | `/api/grades` | Submit grade |
| `GET`  | `/api/health` | Health check (used by Render) |

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Connecting the Backend
1. Deploy the FastAPI app (see Deployment section)
2. Set `VITE_API_URL=https://your-api.railway.app` in `.env`
3. Rebuild and redeploy the frontend
4. The `dataStore.js` `authenticate()` method will now use the real backend and fall back to local only if the API is unreachable

---

## 13. Deployment

### Frontend (Hostinger)

The frontend is a static Vite build deployed to Hostinger:

```bash
cd Ddownloadedusense-web
npm run build         # outputs to dist/
# Upload dist/ contents to Hostinger public_html via FTP or File Manager
```

**Environment variables** — set in `.env` before building:
```env
VITE_API_URL=https://your-backend-url.railway.app
VITE_APP_URL=https://edusense.hostinger.com
```

### Backend (Railway — Recommended)

```bash
# From repo root
railway login
railway init
railway up
```

Railway auto-detects the `railway.json` config:
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

Set environment variables in Railway dashboard:
- `DB_PATH` → `/opt/railway/src/edusense.db`
- `SECRET_KEY` → generate a random 32-char string
- `ALLOWED_ORIGINS` → `https://edusense.hostinger.com`

### Backend (Render — Alternative)

Config is in `render.yaml`:
```yaml
services:
  - type: web
    name: edusense-backend
    runtime: python
    rootDir: emotion_system/backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /api/health
```

---

## 14. Demo Credentials

### Quick Access (click-to-login)
The login page shows role cards. Clicking a card auto-fills the demo credentials.

| Role | Username | Password |
|------|----------|----------|
| Student | `231014184.0` | `WGaub52Z` |
| Doctor | `dr.ahmed` | `Ahmed@2024` |
| Admin | `admin` | `Admin@EduSense2025!` |
| Parent | `parent` | `Parent@EduSense2025!` |

### Other Doctor Accounts
| Username | Password |
|----------|----------|
| `dr.laila` | `Laila@2024` |
| `dr.khalid` | `Khalid@2024` |
| `dr.sara` | `Sara@2024` |

> All demo data is seeded from real university records (anonymised for demo purposes).

---

## 15. Known Limitations & Roadmap

### Current Demo Limitations

| Limitation | Impact | Fix |
|------------|--------|-----|
| Data lives in localStorage | Not shared between users/devices | Connect FastAPI backend |
| Credentials in JS bundle | Visible in DevTools | Move auth to backend |
| Email quota (200/month, EmailJS free) | High-volume alerts may fail | Upgrade EmailJS or use backend SMTP |
| No real camera integration | Emotion data is simulated | Phase 3: TensorFlow.js |
| Single-user sessions | Multiple admins see different states | Backend + PostgreSQL |

### Planned Roadmap

**Phase 2 — Backend Integration (1–2 months)**
- Connect FastAPI backend to frontend
- PostgreSQL for persistent multi-user data
- Real JWT auth replacing client-side credential check
- Deploy to Railway or Render

**Phase 3 — AI Camera (2–4 months)**
- Live webcam capture during lectures
- Emotion classification via TensorFlow.js (browser) or server model
- Per-student engagement score updated in real time
- Proctoring alert triggers on suspicious behaviour

**Phase 4 — SaaS (4–8 months)**
- Multi-tenant: one instance, many institutions
- Institution subdomain routing
- Subscription billing (Stripe)
- Mobile apps (React Native)
- LMS integration (Moodle, Blackboard, Canvas)
- White-label branding per institution

---

*EduSense v3.0 — Prepared for client delivery. Confidential.*
