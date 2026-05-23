# EduSense University Management System — Full Documentation

> **Version:** 1.0.0  
> **Stack:** React 18 + Vite (frontend) · FastAPI + SQLite (backend)  
> **Last updated:** 2026-05-23

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Frontend — React 18 + Vite](#4-frontend--react-18--vite)
5. [Backend — FastAPI](#5-backend--fastapi)
6. [Database Schema](#6-database-schema)
7. [Authentication & Security](#7-authentication--security)
8. [API Reference — All Endpoints](#8-api-reference--all-endpoints)
9. [Real-Time Features](#9-real-time-features)
10. [Business Logic](#10-business-logic)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [File Storage](#12-file-storage)
13. [Environment Variables](#13-environment-variables)
14. [Running the Project](#14-running-the-project)
15. [Deployment](#15-deployment)
16. [Demo Credentials](#16-demo-credentials)
17. [GPA & Academic Calculations](#17-gpa--academic-calculations)
18. [Feature Summary](#18-feature-summary)

---

## 1. Project Overview

EduSense is a full-stack university management system built for Egyptian universities. It combines traditional academic management (grades, attendance, fees, assignments) with AI-powered features (real-time emotion detection, exam proctoring, at-risk student identification).

**User Roles:**

| Role | Description |
|------|-------------|
| `student` | Enrolled students — view own data, submit assignments, book office hours, pay fees |
| `doctor` | Instructors — manage courses, post grades, run live emotion sessions, advise students |
| `admin` | System administrators — full access to all data, user management, registration control |
| `parent` | Read-only monitoring of a linked child's academic performance |

---

## 2. Architecture

```
Browser
  │
  ├── React SPA (Vite dev: localhost:5173 | prod: edusense.cloud)
  │     ├── Vite proxy → /api/* → localhost:8000
  │     ├── Vite proxy → /ws   → ws://localhost:8000
  │     └── localStorage / sessionStorage (offline fallback)
  │
  └── FastAPI (uvicorn: localhost:8000)
        ├── 25+ routers (~117 endpoints)
        ├── aiosqlite → emotion_system.db (SQLite WAL)
        ├── JWT authentication (HS256, 12h expiry)
        ├── WebSocket (emotion streaming + push notifications)
        └── Paymob payment callback + HMAC-SHA512 verification
```

**Data flow for a typical request:**
1. React component calls an `api.js` helper function
2. `api.js` prepends `VITE_API_URL` and attaches `Authorization: Bearer <jwt>`
3. FastAPI router validates token via `require_auth()` dependency
4. Router reads/writes SQLite via `aiosqlite`
5. JSON response returned to React
6. If backend is unreachable, `dataStore.js` falls back to localStorage

---

## 3. Directory Structure

```
D:\download\portal/
│
├── Ddownloadedusense-web/              # React 18 SPA
│   ├── src/
│   │   ├── pages/                      # 20+ page components
│   │   ├── components/                 # Reusable UI components
│   │   ├── context/
│   │   │   └── LanguageContext.jsx     # i18n — Arabic/English + RTL
│   │   ├── hooks/
│   │   │   └── useMobile.js            # Responsive breakpoint hook
│   │   ├── data/                       # Local credentials + seed data
│   │   ├── utils/
│   │   │   ├── pdfExport.js            # jsPDF report generation
│   │   │   └── paymob.js               # Paymob payment gateway integration
│   │   ├── api.js                      # Fetch wrapper (auth header, base URL)
│   │   ├── dataStore.js                # Client-side state + localStorage fallback
│   │   ├── theme.js                    # UI color palette (dark/light)
│   │   └── main.jsx                    # React entry point
│   ├── vite.config.js                  # Build config + dev middleware
│   ├── package.json
│   ├── index.html
│   └── dist/                           # Production build output
│
├── emotion_system/
│   └── backend/
│       ├── routers/                    # 25 FastAPI router modules
│       │   ├── auth.py
│       │   ├── students.py
│       │   ├── lectures.py
│       │   ├── attendance.py
│       │   ├── emotions.py
│       │   ├── analytics.py
│       │   ├── grades.py
│       │   ├── messages.py
│       │   ├── announcements.py
│       │   ├── assignments.py
│       │   ├── exam_schedule.py
│       │   ├── excuses.py
│       │   ├── fees.py
│       │   ├── resources.py
│       │   ├── registration.py
│       │   ├── waitlist.py
│       │   ├── qr_sessions.py
│       │   ├── enrollments.py
│       │   ├── notifications.py
│       │   ├── complaints.py
│       │   ├── office_hours.py
│       │   ├── advising.py
│       │   ├── at_risk.py
│       │   ├── proctoring.py
│       │   ├── payment.py
│       │   ├── users.py
│       │   ├── email_router.py
│       │   └── init_data.py
│       ├── main.py                     # FastAPI app entry point
│       ├── database.py                 # SQLite schema + table init
│       ├── auth_utils.py               # JWT + bcrypt helpers
│       ├── emotion_engine.py           # Face detection & emotion logic
│       ├── websocket_manager.py        # WebSocket connection manager
│       ├── r_runner.py                 # R script execution router
│       ├── seed_data.py                # DB seeder (dev use only)
│       ├── requirements.txt
│       └── .env                        # Secrets (git-ignored, never commit)
│
├── tests/                              # Pytest test suite
├── nginx/                              # Nginx reverse proxy config
├── docker-compose.yml                  # Local dev orchestration
├── vps_setup.sh                        # Ubuntu VPS provisioning script
└── DOCUMENTATION.md                    # This file
```

---

## 4. Frontend — React 18 + Vite

### 4.1 Package Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.6 | UI framework |
| `react-dom` | ^19.2.6 | DOM rendering |
| `framer-motion` | ^12.39.0 | Page transitions and animations |
| `jspdf` | ^4.2.1 | Client-side PDF generation |
| `jspdf-autotable` | ^5.0.8 | PDF table plugin |
| `qrcode` | ^1.5.4 | QR code image generation |
| `@emailjs/browser` | ^4.4.1 | Client-side email sending |
| `nodemailer` | ^8.0.7 | Node.js email (Vite dev middleware) |

### 4.2 Page Components

| Page | Role(s) | Description |
|------|---------|-------------|
| `LoginPage` | All | JWT login with role redirect |
| `StudentPage` | student | Main dashboard: GPA, attendance, emotions, alerts |
| `DoctorPage` | doctor | Course management, live emotion sessions, grade posting |
| `AdminPage` | admin | User management, registrations, system config |
| `ParentPage` | parent | Read-only view of child's grades and attendance |
| `TimetablePage` | student, doctor | Weekly schedule with assignments and exams |
| `ExamProctoringPage` | doctor, admin | Start and monitor remote exam sessions |
| `LivePollPage` | doctor | Real-time in-class polling via WebSocket |
| `DigitalIDPage` | student, admin | Student ID card with face verification |
| `AdvisingPage` | student, doctor | Advising appointments, degree audit, notes |
| `GraduationRoadmapPage` | student | Visual degree progress toward graduation |
| `AtRiskPage` | doctor, admin | Early warning dashboard with multi-factor risk scores |
| `AIInsightPage` | doctor, admin | Engagement analytics, clusters, time trends |
| `AuditLogPage` | admin | System action audit trail |
| `OfficeHoursPage` | student, doctor | Office hour slot booking system |
| `FeeHistoryPage` | student | Fee payment status and history |
| `PaymentReturnPage` | student | Handles Paymob redirect after payment completes |
| `GPACalculatorPage` | student | What-if GPA calculator |
| `AcademicCalendarPage` | All | Calendar view of lectures, exams, assignments |

### 4.3 Component Library

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Role-aware navigation sidebar |
| `Topbar` | Header with notifications bell and user menu |
| `Card` | Base container card |
| `StatCard` | KPI card with icon and trend indicator |
| `DataTable` | Sortable/filterable data table |
| `Charts` | Bar, line, and pie chart wrappers |
| `EmotionBars` | Horizontal emotion distribution bars |
| `AnimatedPage` | Framer Motion page transition wrapper |
| `NotificationToast` | Toast alert stack |
| `ChatWidget` | Course community chat panel |
| `WebcamFeed` | Webcam capture component for proctoring and emotions |
| `StudentFaceCard` | Student photo + emotion overlay card |
| `QRCode` | Renders attendance QR token as scannable image |
| `ScheduleItem` | Calendar event row |
| `EmptyState` | Placeholder for empty list states |
| `OnboardingTour` | First-use feature walkthrough modal |

### 4.4 dataStore.js — Client-Side State Manager

`dataStore.js` is a singleton class instantiated once at app start. It manages all local state, syncs to the backend when available, and falls back to localStorage when the backend is unreachable.

**State objects stored:**

| Key | Type | Description |
|-----|------|-------------|
| `students` | Array | Student records with embedded emotion/attendance |
| `doctors` | Array | Instructor records with course assignments |
| `courses` | Array | Course catalog with schedule and semester info |
| `courseEnrollments` | Object | `{ courseId: [studentIds] }` |
| `attendance` | Object | `{ "courseId_W##": { studentId: record } }` |
| `examResults` | Object | `{ studentId: { courseCode: { grade, date, addedBy } } }` |
| `chatMessages` | Object | `{ courseCode: [messages] }` |
| `systemAlerts` | Array | Notifications with read/unread status |
| `complaints` | Array | Student appeals with responses |
| `registrationStatus` | Object | `{ is_open, semester, deadline }` |
| `studentFees` | Object | `{ studentId: { paid, amount, due_date } }` |
| `courseWaitlists` | Object | `{ courseId: [studentIds] }` |
| `announcements` | Array | Course posts by doctors |
| `examSchedule` | Array | Exams with date, room, and type |
| `courseResources` | Array | Study materials per course/week |
| `assignments` | Array | Homework with deadlines and attachments |
| `submissions` | Array | Student submissions with grades |
| `auditLog` | Array | Timestamped system action log |
| `officeSlots` | Array | Doctor availability slots |
| `officeBookings` | Array | Student bookings of slots |
| `qrSessions` | Object | `{ token: { courseId, week, usedBy[] } }` |

**Key methods:**

| Method | Description |
|--------|-------------|
| `authenticate(username, password)` | Tries backend JWT login first; falls back to local credential match |
| `markAttendance(courseId, studentId, confidence, method, week)` | Saves locally and syncs to `/api/attendance/mark` |
| `addExamResult(studentId, courseCode, grade, doctorId)` | Posts grade and sends push notification via WebSocket |
| `submitAssignment(assignmentId, studentId, content, fileData)` | Student submission with optional file attachment |
| `gradeSubmission(assignmentId, studentId, grade, feedback, doctorId)` | Teacher grading with feedback |
| `createQRSession(courseId, week)` | Generates 6-char QR token and syncs to `/api/qr/create` |
| `useQRToken(token, studentId)` | Marks attendance via QR, syncs to `/api/qr/use` |
| `checkAttendanceAlerts(studentId)` | Auto-generates low-attendance alerts on login |
| `calculateSemesterGPA(studentId)` | Weighted GPA on 4.0 scale |
| `getDegreeAudit(studentId)` | Progress toward CS degree (CS401–CS405) |
| `publishCourseGrades(courseId, doctorId)` | Batch notification to all enrolled students |

### 4.5 api.js

Thin fetch wrapper that:
- Prepends `VITE_API_URL` (or Vite proxy target `localhost:8000` in dev)
- Attaches `Authorization: Bearer <token>` from localStorage
- Parses and throws on non-2xx responses

### 4.6 Vite Dev Middleware (vite.config.js)

These routes are handled by Vite's Node.js server during development only (not in production):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/send-email` | POST | Send credential emails via nodemailer |
| `/api/save-emotion` | POST | Log emotion JSON to `student_emotions/` folder |
| `/api/run-r` | POST | Execute R analysis scripts |
| `/api/save-frame` | POST | Save webcam frames for recording demos |
| `/student_photos/*` | GET | Serve student photo files |

**Dev proxy rules (all forwarded to FastAPI):**
- `/api/*` → `http://localhost:8000`
- `/ws` → `ws://localhost:8000`
- `/photos/*` → `http://localhost:8000/photos`

### 4.7 Paymob Integration (utils/paymob.js)

**`initiatePaymobPayment(student, amount, feeId)`**
1. Stores pending fee in `sessionStorage`
2. Calls Paymob auth API → gets token
3. Creates payment link via Paymob API
4. Redirects student to Paymob hosted checkout page

**`handlePaymobReturn()`**
1. Reads all Paymob URL params from `window.location.search`
2. Sends them to `/api/payment/confirm` for HMAC verification
3. Backend verifies signature and marks fee as paid
4. Falls back to localStorage if backend is unreachable

---

## 5. Backend — FastAPI

### 5.1 Package Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.111.1 | Web framework |
| `uvicorn[standard]` | 0.30.1 | ASGI server |
| `aiosqlite` | 0.20.0 | Async SQLite driver |
| `bcrypt` | 4.1.3 | Password hashing (12 rounds) |
| `python-jose[cryptography]` | 3.3.0 | JWT token signing/verification |
| `pydantic` | 2.7.4 | Request/response validation |
| `python-multipart` | 0.0.9 | File upload handling |
| `aiofiles` | 23.2.1 | Async file I/O |
| `httpx` | 0.27.0 | Async HTTP client |

### 5.2 main.py

Entry point for the FastAPI application. Responsibilities:
- Registers all 25 routers with their URL prefixes
- Configures CORS middleware from `ALLOWED_ORIGINS` env var
- Mounts `/photos` static file directory
- Defines system endpoints (`/`, `/api/health`)
- Defines WebSocket endpoints (`/ws/{lecture_id}`, `/ws/notifications/{user_id}`)

**System endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Returns API name, status, version |
| GET | `/api/health` | Returns health status of all services |

### 5.3 auth_utils.py

| Function | Description |
|----------|-------------|
| `hash_password(plain)` | Returns bcrypt hash with 12 rounds |
| `verify_password(plain, hashed)` | Verifies against bcrypt; also accepts legacy plain-text |
| `create_token(data, expires_hours=12)` | Signs HS256 JWT with `JWT_SECRET` |
| `decode_token(token)` | Returns payload dict or `None` if invalid or expired |
| `require_auth()` | FastAPI dependency — raises HTTP 401 if token missing or invalid |
| `require_role(*roles)` | FastAPI dependency factory — raises HTTP 403 if user role not in list |

### 5.4 Router Registration

| URL Prefix | Module | Tags |
|-----------|--------|------|
| `/api/auth` | `auth.py` | Authentication |
| `/api/students` | `students.py` | Students |
| `/api/lectures` | `lectures.py` | Lectures |
| `/api/attendance` | `attendance.py` | Attendance |
| `/api/emotions` | `emotions.py` | Emotions |
| `/api/analytics` | `analytics.py` | Analytics |
| `/api/grades` | `grades.py` | Grades |
| `/api/messages` | `messages.py` | Messages |
| `/api/excuses` | `excuses.py` | Excuses |
| `/api/users` | `users.py` | Users |
| `/api/email` | `email_router.py` | Email |
| `/api/announcements` | `announcements.py` | Announcements |
| `/api/exams` | `exam_schedule.py` | ExamSchedule |
| `/api/resources` | `resources.py` | Resources |
| `/api/assignments` | `assignments.py` | Assignments |
| `/api/notifications` | `notifications.py` | Notifications |
| `/api/complaints` | `complaints.py` | Complaints |
| `/api/fees` | `fees.py` | Fees |
| `/api/registration` | `registration.py` | Registration |
| `/api/waitlist` | `waitlist.py` | Waitlist |
| `/api/qr` | `qr_sessions.py` | QR |
| `/api/enrollments` | `enrollments.py` | Enrollments |
| `/api/init` | `init_data.py` | Init |
| `/api/proctor` | `proctoring.py` | Proctoring |
| `/api/advising` | `advising.py` | Advising |
| `/api/at-risk` | `at_risk.py` | AtRisk |
| `/api/office-hours` | `office_hours.py` | OfficeHours |
| `/api/payment` | `payment.py` | Payment |

API docs available at:
- `http://localhost:8000/docs` — Swagger UI (interactive)
- `http://localhost:8000/redoc` — ReDoc (read-only)

---

## 6. Database Schema

**File:** `emotion_system/backend/emotion_system.db`  
**Engine:** SQLite with WAL (Write-Ahead Logging) mode

### Table List

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | User accounts (all roles) |
| 2 | `students` | Student profiles |
| 3 | `doctors` | Instructor profiles |
| 4 | `lectures` | Course sessions |
| 5 | `course_enrollments` | Student–course mapping |
| 6 | `attendance` | Check-in records |
| 7 | `emotion_records` | Real-time emotion tracking |
| 8 | `grades` | Course grades |
| 9 | `messages` | Community chat |
| 10 | `excuses` | Absence justifications |
| 11 | `system_alerts` | Push notifications |
| 12 | `alerts` | Legacy alert records |
| 13 | `announcements` | Doctor course posts |
| 14 | `exam_schedule` | Scheduled exams |
| 15 | `course_resources` | Study materials |
| 16 | `assignments` | Homework with deadlines |
| 17 | `submissions` | Student assignment submissions |
| 18 | `complaints` | Student appeals |
| 19 | `student_fees` | Fee payment status |
| 20 | `course_waitlist` | Enrollment overflow queue |
| 21 | `qr_sessions` | QR attendance tokens |
| 22 | `registration_status` | Semester open/close singleton |
| 23 | `proctoring_sessions` | Exam monitoring records |
| 24 | `office_hours_slots` | Doctor availability |
| 25 | `office_hours_bookings` | Student bookings |
| 26 | `advising_appointments` | Student–advisor meetings |
| 27 | `advising_notes` | Advisor notes per student |

### Detailed Table Schemas

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `username` | TEXT | UNIQUE NOT NULL |
| `password` | TEXT | NOT NULL (bcrypt hash) |
| `role` | TEXT | NOT NULL — `student`/`doctor`/`admin` |
| `full_name` | TEXT | |
| `email` | TEXT | UNIQUE |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### `students`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `student_id` | TEXT | UNIQUE — e.g. `S001` |
| `user_id` | INTEGER | FK → users.id |
| `department` | TEXT | e.g. `Computer Science` |
| `year` | INTEGER | Academic year 1–4 |
| `face_encoding` | BLOB | Binary face embedding (optional) |
| `photo_path` | TEXT | Relative path to photo |

#### `doctors`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `doctor_id` | TEXT | UNIQUE — e.g. `D001` |
| `user_id` | INTEGER | FK → users.id |
| `department` | TEXT | |
| `title` | TEXT | e.g. `Dr.` / `Prof.` |

#### `lectures`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `lecture_id` | TEXT | UNIQUE — e.g. `L001` |
| `doctor_id` | TEXT | FK → doctors.doctor_id |
| `course_name` | TEXT | |
| `course_code` | TEXT | e.g. `CS401` |
| `room` | TEXT | |
| `scheduled_at` | DATETIME | |
| `duration_min` | INTEGER | DEFAULT 90 |
| `days` | TEXT | JSON array e.g. `["Mon","Wed"]` |
| `semester` | TEXT | e.g. `Spring 2025` |
| `status` | TEXT | `scheduled`/`active`/`ended` |
| `color` | TEXT | Hex color for calendar display |

#### `course_enrollments`
| Column | Type | Constraints |
|--------|------|-------------|
| `course_id` | TEXT | COMPOSITE PK with student_id |
| `student_id` | TEXT | |

#### `attendance`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `student_id` | TEXT | FK |
| `lecture_id` | TEXT | FK |
| `week` | INTEGER | Week number |
| `check_in_time` | DATETIME | |
| `check_out_time` | DATETIME | |
| `method` | TEXT | `face_recognition`/`qr`/`manual` |
| `status` | TEXT | `present`/`absent`/`excused` |
| `confidence` | REAL | Face recognition confidence 0.0–1.0 |
| `date` | DATE | |

#### `emotion_records`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `student_id` | TEXT | FK |
| `lecture_id` | TEXT | FK |
| `timestamp` | DATETIME | |
| `emotion` | TEXT | `happy`/`neutral`/`confused`/`bored`/`surprise`/`sad`/`angry`/`fear` |
| `confidence` | REAL | Detection confidence |
| `attention_score` | REAL | 0.0–1.0 |
| `engagement_score` | REAL | 0.0–1.0 |

#### `grades`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `student_id` | TEXT | |
| `course_code` | TEXT | |
| `course_name` | TEXT | |
| `grade` | REAL | 0–100 |
| `doctor_id` | TEXT | |
| `created_at` | DATETIME | |
| — | — | UNIQUE(student_id, course_code) |

#### `student_fees`
| Column | Type | Constraints |
|--------|------|-------------|
| `student_id` | TEXT | PRIMARY KEY |
| `paid` | INTEGER | 0 or 1 |
| `amount` | REAL | EGP amount |
| `due_date` | DATE | |

#### `qr_sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| `token` | TEXT | PRIMARY KEY (6-char alphanumeric) |
| `course_id` | TEXT | |
| `week` | INTEGER | |
| `created_at` | DATETIME | |
| `used_by` | TEXT | JSON array of student IDs who already used this token |

#### `registration_status`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY (always = 1, singleton row) |
| `is_open` | INTEGER | 0 or 1 |
| `semester` | TEXT | e.g. `Spring 2026` |
| `deadline` | DATE | Registration closes on this date |

#### `proctoring_sessions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY |
| `student_id` | TEXT | |
| `exam_id` | TEXT | |
| `started_at` | DATETIME | |
| `ended_at` | DATETIME | |
| `identity_verified` | INTEGER | 0 or 1 |
| `flagged_events` | TEXT | JSON array of violation events |
| `proctor_notes` | TEXT | |

---

## 7. Authentication & Security

### 7.1 JWT Tokens

- **Algorithm:** HS256
- **Expiry:** 12 hours
- **Secret:** Read from `JWT_SECRET` env var (never hardcoded in code)
- **Payload:**
  ```json
  {
    "sub": "42",
    "role": "student",
    "name": "Ahmed Hassan",
    "exp": 1716480000
  }
  ```
- **Frontend storage:** `localStorage['edusense_token']`
- **Request header:** `Authorization: Bearer <token>`

### 7.2 Password Security

- All passwords hashed with **bcrypt at 12 rounds**
- Legacy plain-text passwords are **automatically upgraded** to bcrypt on the first successful login
- Password change requires providing the current password
- Minimum length: 8 characters

### 7.3 Role-Based Access Control (RBAC)

| Role | Scope |
|------|-------|
| `student` | Read own grades, attendance, emotions; submit assignments; book office hours; pay fees |
| `doctor` | Manage own courses; post grades; run emotion sessions; manage assignments; advise students |
| `admin` | Full system access: user creation, registration control, all student/doctor data |

Enforced via `require_role("doctor", "admin")` FastAPI dependencies on each route.

### 7.4 Login Rate Limiting

- **Limit:** Max 10 attempts per IP address per 5-minute window
- **Implementation:** In-memory `defaultdict` (resets on server restart)
- **Response:** `429 Too Many Requests` with retry message

### 7.5 Payment Verification (HMAC-SHA512)

When Paymob redirects a student back after payment:
1. Frontend sends all URL params to `/api/payment/confirm`
2. Backend reconstructs the HMAC string using Paymob's field order
3. Compares computed HMAC against the `hmac` param using `hmac.compare_digest` (constant-time)
4. Only writes to DB if signature matches and `success=true`
5. Returns `400 Invalid payment signature` on mismatch

**HMAC field order (must match exactly):**
`amount_cents`, `created_at`, `currency`, `error_occured`, `has_parent_transaction`, `id`, `integration_id`, `is_3d_secure`, `is_auth`, `is_capture`, `is_refunded`, `is_standalone_payment`, `is_voided`, `order`, `owner`, `pending`, `source_data.pan`, `source_data.sub_type`, `source_data.type`, `success`

### 7.6 CORS

- Locked to specific origins via `ALLOWED_ORIGINS` env var
- Default dev origins: `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`
- Production origin: `https://edusense.cloud`
- `allow_credentials=True` (required for JWT cookie support if added later)

### 7.7 Secrets Management

- All secrets in `emotion_system/backend/.env` (git-ignored)
- `.env` files blocked in both `.gitignore` files
- Frontend `.env.production` also git-ignored

---

## 8. API Reference — All Endpoints

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | None | Login with username/password → JWT token |
| GET | `/api/auth/me` | Any | Return current user's id, role, name |
| POST | `/api/auth/change-password` | Any | Change own password (requires current password) |

**Login request body:**
```json
{ "username": "s001", "password": "pass123" }
```

**Login response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "username": "s001",
    "name": "Ahmed Hassan",
    "email": "ahmed@university.edu",
    "role": "student"
  },
  "message": "Login successful"
}
```

---

### Students — `/api/students`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/students/` | doctor, admin | List all students |
| POST | `/api/students/` | admin | Create student + user account |
| GET | `/api/students/{student_id}` | Any | Get student profile |
| GET | `/api/students/{student_id}/engagement-summary` | doctor, admin | Emotion + attendance summary |

---

### Lectures — `/api/lectures`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lectures/` | Any | List all lectures (filter by doctor_id optional) |
| POST | `/api/lectures/` | doctor, admin | Create a lecture/course |
| GET | `/api/lectures/{lecture_id}` | Any | Get single lecture |
| PATCH | `/api/lectures/{lecture_id}/status` | doctor, admin | Update status: scheduled/active/ended |
| GET | `/api/lectures/{lecture_id}/live-summary` | doctor, admin | Real-time emotion summary |

---

### Attendance — `/api/attendance`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/attendance/mark` | Any | Mark student as present (face/QR/manual) |
| POST | `/api/attendance/checkout` | Any | Record check-out time |
| GET | `/api/attendance/lecture/{lecture_id}` | doctor, admin | All attendance for a lecture |
| GET | `/api/attendance/student/{student_id}` | Any | All attendance for a student |
| GET | `/api/attendance/summary/{lecture_id}` | doctor, admin | Attendance statistics for a lecture |

---

### Emotions — `/api/emotions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/emotions/analyze-frame` | doctor | Submit webcam frame for emotion detection |
| POST | `/api/emotions/record` | doctor | Save an emotion record to the database |
| GET | `/api/emotions/lecture/{lecture_id}` | doctor, admin | All emotion records for a lecture |
| GET | `/api/emotions/distribution/{lecture_id}` | doctor, admin | Emotion counts by type |
| GET | `/api/emotions/trends/{lecture_id}` | doctor, admin | Emotion timeline data |
| GET | `/api/emotions/student/{student_id}` | Any | A student's full emotion history |

---

### Analytics — `/api/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/engagement-overview` | doctor, admin | System-wide engagement stats |
| GET | `/api/analytics/lecture-comparison` | doctor, admin | Compare lectures by engagement |
| GET | `/api/analytics/student-clusters` | doctor, admin | Student groupings by behavior |
| GET | `/api/analytics/time-trends` | doctor, admin | Engagement over time |
| GET | `/api/analytics/alerts/low-engagement/{lecture_id}` | doctor, admin | Students below engagement threshold |
| POST | `/api/analytics/run-r-analysis` | admin | Trigger R script execution |

---

### Grades — `/api/grades`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/grades/student/{student_id}` | Any | All grades for a student |
| GET | `/api/grades/course/{course_code}` | doctor, admin | All grades for a course |
| POST | `/api/grades/` | doctor, admin | Post or update a grade |

---

### Messages — `/api/messages`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages/` | Any | Get messages (filter by course_code) |
| POST | `/api/messages/` | Any | Post a message to a course chat |

---

### Announcements — `/api/announcements`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/announcements/` | Any | List announcements (filter by course_id) |
| POST | `/api/announcements/` | doctor, admin | Create announcement |
| DELETE | `/api/announcements/{ann_id}` | doctor, admin | Delete announcement |

---

### Assignments — `/api/assignments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assignments/` | Any | List assignments (filter by course_id) |
| POST | `/api/assignments/` | doctor, admin | Create assignment with optional attachment |
| DELETE | `/api/assignments/{asn_id}` | doctor, admin | Delete assignment |
| GET | `/api/assignments/submissions` | Any | List submissions |
| POST | `/api/assignments/submissions` | student | Submit an assignment |
| PUT | `/api/assignments/submissions/grade` | doctor, admin | Grade a submission |

---

### Exam Schedule — `/api/exams`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exams/` | Any | List exams (filter by course_id) |
| POST | `/api/exams/` | doctor, admin | Schedule an exam |
| DELETE | `/api/exams/{exam_id}` | doctor, admin | Remove exam |

---

### Excuses — `/api/excuses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/excuses/` | student | Submit absence excuse |
| GET | `/api/excuses/student/{student_id}` | Any | Get a student's excuses |
| GET | `/api/excuses/` | doctor, admin | List all excuses |
| PUT | `/api/excuses/{excuse_id}` | doctor, admin | Approve or reject excuse |

---

### Fees — `/api/fees`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/fees/{student_id}` | Any | Get fee status for a student |
| PUT | `/api/fees/{student_id}` | admin | Manually update fee status |

---

### Resources — `/api/resources`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/resources/` | Any | List resources (filter by course_id/week) |
| POST | `/api/resources/` | doctor, admin | Upload resource with optional file |
| DELETE | `/api/resources/{res_id}` | doctor, admin | Remove resource |

---

### Registration — `/api/registration`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/registration/` | Any | Get current registration open/closed status |
| PUT | `/api/registration/` | admin | Open or close registration, set semester/deadline |

---

### Waitlist — `/api/waitlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/waitlist/{course_id}` | doctor, admin | View waitlist for a course |
| POST | `/api/waitlist/{course_id}/{student_id}` | Any | Join course waitlist |
| DELETE | `/api/waitlist/{course_id}/{student_id}` | Any | Leave waitlist |

---

### QR Sessions — `/api/qr`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/qr/create` | doctor | Generate QR attendance token |
| POST | `/api/qr/use` | student | Mark attendance using a QR token |

---

### Enrollments — `/api/enrollments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/enrollments/` | Any | List enrollments (filter by course_id or student_id) |
| POST | `/api/enrollments/bulk` | admin | Bulk enroll students in a course |
| POST | `/api/enrollments/{course_id}/{student_id}` | admin | Enroll single student |
| DELETE | `/api/enrollments/{course_id}/{student_id}` | admin | Drop student from course |

---

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications/` | Any | Get alerts for the current user |
| POST | `/api/notifications/` | Any | Create a notification |
| POST | `/api/notifications/bulk` | doctor, admin | Send to multiple users |
| PUT | `/api/notifications/{alert_id}/read` | Any | Mark single alert as read |
| PUT | `/api/notifications/read-all` | Any | Mark all alerts as read |

---

### Complaints — `/api/complaints`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/complaints/` | Any | List complaints (students see own; admins see all) |
| POST | `/api/complaints/` | student | Submit a complaint or grade appeal |
| PUT | `/api/complaints/{complaint_id}` | doctor, admin | Respond to or resolve a complaint |

---

### Office Hours — `/api/office-hours`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/office-hours/slots/{doctor_id}` | Any | Get available slots for a doctor |
| POST | `/api/office-hours/slots` | doctor | Create or update an availability slot |
| PATCH | `/api/office-hours/slots/{slot_id}` | doctor | Toggle slot available/unavailable |
| POST | `/api/office-hours/book` | student | Book a slot |
| GET | `/api/office-hours/bookings/student/{student_id}` | Any | Student's bookings |
| GET | `/api/office-hours/bookings/doctor/{doctor_id}` | doctor, admin | Doctor's upcoming bookings |
| DELETE | `/api/office-hours/booking/{booking_id}` | Any | Cancel a booking |

---

### Advising — `/api/advising`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/advising/appointments` | Any | List advising appointments |
| POST | `/api/advising/appointments` | Any | Request an advising appointment |
| PUT | `/api/advising/appointments/{appt_id}` | doctor, admin | Confirm or reschedule |
| DELETE | `/api/advising/appointments/{appt_id}` | Any | Cancel appointment |
| GET | `/api/advising/notes/{student_id}` | doctor, admin | Get advisor notes for a student |
| POST | `/api/advising/notes` | doctor, admin | Add advisor note |
| DELETE | `/api/advising/notes/{note_id}` | doctor, admin | Remove note |
| GET | `/api/advising/degree-audit/{student_id}` | Any | Full degree audit report |
| GET | `/api/advising/graduation-progress/{student_id}` | Any | Graduation readiness summary |

---

### At-Risk — `/api/at-risk`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/at-risk/assess` | doctor, admin | Run risk assessment for all students |
| GET | `/api/at-risk/students` | doctor, admin | List all students with risk scores |
| GET | `/api/at-risk/student/{student_id}` | doctor, admin | Detailed risk breakdown for one student |
| POST | `/api/at-risk/notify/{student_id}` | doctor, admin | Send alert email to advisor/parent |

---

### Proctoring — `/api/proctor`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/proctor/start` | student | Start an exam proctoring session |
| POST | `/api/proctor/verify-identity` | student | Submit webcam frame for identity check |
| POST | `/api/proctor/check-frame` | student | Stream frame during exam (flag violations) |
| POST | `/api/proctor/end` | student | End session and submit report |
| GET | `/api/proctor/sessions` | doctor, admin | List all proctoring sessions |
| GET | `/api/proctor/events/{session_id}` | doctor, admin | Flagged events for a session |
| GET | `/api/proctor/summary/{exam_id}` | doctor, admin | Aggregate violations for an exam |

---

### Payment — `/api/payment`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payment/confirm` | None | Verify Paymob HMAC signature and mark fee as paid |

---

### Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/` | admin | List all user accounts |
| POST | `/api/users/` | admin | Create a user account |

---

### Email — `/api/email`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/email/config` | admin | Save SMTP configuration |
| GET | `/api/email/config` | admin | Get current SMTP config |
| POST | `/api/email/send-attendance` | doctor, admin | Send attendance report email |

---

### Init — `/api/init`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/init/` | Any | Bootstrap data for the frontend on login |

---

## 9. Real-Time Features

### 9.1 Live Emotion Streaming — `WS /ws/{lecture_id}`

Used during doctor-led live sessions to broadcast real-time emotion data.

**Flow:**
1. Doctor starts live session → frontend opens WebSocket to `/ws/L001`
2. `emotion_engine.py` analyzes webcam frames
3. Doctor's client sends detected emotion JSON over the socket
4. `ConnectionManager` broadcasts to all connected clients for that `lecture_id`
5. Students and admin dashboards receive real-time updates

**Broadcast message format:**
```json
{
  "type": "emotion_update",
  "lecture_id": "L001",
  "data": { "emotion": "happy", "confidence": 0.87, "student_id": "S003" },
  "timestamp": "2026-05-23T10:30:00"
}
```

### 9.2 Push Notifications — `WS /ws/notifications/{user_id}`

Per-user channel for server-pushed alerts (grade posted, assignment graded, at-risk flag, etc.).

**On connect:** Server sends a welcome message  
**Keep-alive:** Client sends `"ping"` → server responds `"pong"`

**Notification format:**
```json
{
  "type": "grade_posted",
  "title": "New Grade Posted",
  "message": "Your CS401 grade has been posted: 87",
  "icon": "📊",
  "color": "#10b981"
}
```

---

## 10. Business Logic

### 10.1 At-Risk Risk Scoring (0–100)

Each student receives a composite risk score. Higher score = higher risk.

| Factor | Max Score | Thresholds |
|--------|-----------|-----------|
| Attendance | 30 pts | <50% → 30, 50–70% → 20, 70–80% → 10, ≥80% → 0 |
| Average grade | 30 pts | <50 → 30, 50–60 → 20, 60–70 → 10, ≥70 → 0 |
| Negative emotions | 20 pts | >70% negative → 20, 50–70% → 12, 30–50% → 6, <30% → 0 |
| Assignment submissions | 20 pts | <50% submitted → 20, 50–70% → 12, 70–85% → 6, ≥85% → 0 |

**Risk levels:**

| Score | Level |
|-------|-------|
| 0–19 | Low |
| 20–39 | Medium |
| 40–59 | High |
| 60–100 | Critical (email sent to advisor and parent) |

### 10.2 Degree Audit

**Required courses:** CS401, CS402, CS403, CS404, CS405 (each = 3 credit hours)

**Course status logic:**

| Condition | Status |
|-----------|--------|
| Grade ≥ 50 | `completed` |
| Grade < 50 | `failed` |
| Enrolled, no grade | `in_progress` |
| Not enrolled | `not_started` |

**Graduation requirement:** All 5 courses completed with grade ≥ 50 (15 credits total)

### 10.3 Attendance Alerts

Automatically checked on student login via `checkAttendanceAlerts()`:

| Threshold | Alert Level |
|-----------|-------------|
| < 75% attendance in a course | Warning |
| < 60% attendance in a course | Critical |

**Deduplication:** One alert per student+course combination per calendar day.

### 10.4 QR Attendance

- Token: 6-character alphanumeric string
- Validity: 90 minutes from creation
- One-time use per student (tracked in `used_by` JSON array)
- Synced to `qr_sessions` table in database

### 10.5 Emotion Engagement Weights

| Emotion | Engagement Score |
|---------|----------------|
| happy | 1.0 |
| neutral | 0.7 |
| surprise | 0.8 |
| confused | 0.45 |
| sad | 0.2 |
| angry | 0.2 |
| fear | 0.2 |
| bored | 0.1 |
| disgust | 0.1 |

### 10.6 Grade Appeal Workflow

```
Student submits complaint
    → Doctor reviews → Approve / Reject / Escalate to Admin
    → Admin makes final decision
    → Student sees status update via push notification
```

**Complaint statuses:** `pending` → `reviewed` → `resolved`

### 10.7 Exam Proctoring Violation Types

Events auto-flagged during remote exams:
- Face not detected in frame
- Multiple faces detected in frame
- Student looking away from screen
- Tab/window switching (focus loss)
- Unusual background activity

---

## 11. Third-Party Integrations

### 11.1 Paymob

**Purpose:** Online student fee payment  
**Integration type:** Payment Link (integration ID: `4087695`)  
**Currency:** EGP

**Full flow:**
1. Student clicks "Pay Now" → `initiatePaymobPayment()` called
2. Frontend calls Paymob auth API → receives auth token
3. Frontend creates payment link → receives hosted checkout URL
4. Student redirected to Paymob's page to complete payment
5. After payment, Paymob redirects to `RETURN_URL` with params
6. `PaymentReturnPage` calls `handlePaymobReturn()`
7. All params sent to `/api/payment/confirm`
8. Backend verifies HMAC-SHA512 signature
9. If valid and `success=true` → `student_fees` row updated to `paid=1`

**Required env vars:**
- `VITE_PAYMOB_API_KEY` — base64-encoded API key from Paymob dashboard
- `VITE_PAYMOB_INTEGRATION_ID` — `4087695`
- `PAYMOB_HMAC_SECRET` — from Paymob dashboard → Settings → API Keys

### 11.2 Brevo (Sendinblue)

**Purpose:** Transactional email (credential delivery, alerts)  
**Key:** `VITE_BREVO_API_KEY`  
**Sender address:** `VITE_BREVO_SENDER`

### 11.3 Gmail SMTP (Backend)

**Purpose:** Attendance reports and at-risk notification emails from FastAPI  
**Config:** `SMTP_USER` + `SMTP_PASS` (Gmail app password, not account password)

---

## 12. File Storage

### Files Stored as Base64 in SQLite

| File Type | Table | Column |
|-----------|-------|--------|
| Assignment attachments | `assignments` | `attachment_data` |
| Course resource files | `course_resources` | `file_data` |
| Student submission files | `submissions` | `file_data` |

### Files Stored on Filesystem

| Type | Path |
|------|------|
| Student photos | `emotion_system/student_photos/{studentId}.jpg` |
| Emotion records (dev only) | `emotion_system/student_emotions/{studentId}.json` |
| Demo frames | `demo_frames/{index:05d}.jpg` |
| Database | `emotion_system/backend/emotion_system.db` |

Student photos are served by FastAPI at `/photos/{filename}` via a `StaticFiles` mount.

---

## 13. Environment Variables

### Backend — `emotion_system/backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Long random string for JWT signing — never hardcode |
| `DB_PATH` | No | SQLite file path (default: `emotion_system.db`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `PAYMOB_HMAC_SECRET` | **Yes (prod)** | From Paymob dashboard → Settings → API Keys |
| `SMTP_USER` | No | Gmail address for sending emails |
| `SMTP_PASS` | No | Gmail app password |

### Frontend — `Ddownloadedusense-web/.env.production`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_APP_URL` | **Yes** | Public frontend URL (e.g. `https://edusense.cloud`) |
| `VITE_API_URL` | **Yes** | Backend API URL (e.g. `https://api.edusense.cloud`) |
| `VITE_PAYMOB_API_KEY` | **Yes** | Paymob API key (base64) |
| `VITE_PAYMOB_INTEGRATION_ID` | **Yes** | `4087695` |
| `VITE_BREVO_API_KEY` | No | Brevo transactional email key |
| `VITE_BREVO_SENDER` | No | From-address for emails |

> Both `.env` files are git-ignored and must never be committed.

---

## 14. Running the Project

### Prerequisites

- Python 3.12+
- Node.js 18+

### Backend Setup

```bash
cd emotion_system/backend

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env
# Edit .env — set JWT_SECRET and PAYMOB_HMAC_SECRET at minimum

# Start the server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --env-file .env

# Interactive API docs:
# http://localhost:8000/docs        Swagger UI
# http://localhost:8000/redoc       ReDoc
```

### Frontend Setup

```bash
cd Ddownloadedusense-web

# Install dependencies
npm install

# Start dev server (proxies /api to localhost:8000 automatically)
npm run dev

# Build for production
npm run build
# Output goes to: dist/
```

### Seed the Database (development only)

```bash
cd emotion_system/backend
python seed_data.py
```

Seeds: students, grades, announcements, exams, resources, assignments, enrollments, messages, fees (realistic data for all 15 students across 5 courses).

---

## 15. Deployment

### Docker Compose (local full-stack)

```bash
docker-compose up --build
```

Starts: React frontend (Nginx), FastAPI backend (uvicorn), Nginx reverse proxy.

### VPS — Ubuntu 20.04

```bash
bash vps_setup.sh
```

Provisions: Python 3.12, Node.js 18, Nginx, certbot (Let's Encrypt TLS), systemd service for backend.

### Nginx Config

Located in `nginx/`. Handles:
- TLS termination (Let's Encrypt)
- Forwards `/api/*` and `/ws/*` to FastAPI on `localhost:8000`
- Serves React SPA for all other routes (with fallback to `index.html` for client-side routing)

### Production Environment

Set these before starting uvicorn in production:

```env
JWT_SECRET=<long random string — at least 32 characters>
PAYMOB_HMAC_SECRET=<from Paymob dashboard>
ALLOWED_ORIGINS=https://edusense.cloud
DB_PATH=/var/www/edusense/emotion_system.db
```

### Frontend Build for Production

```bash
cd Ddownloadedusense-web
# Set VITE_API_URL in .env.production first
npm run build
# Upload dist/ to Hostinger public_html via FTP or File Manager
```

---

## 16. Demo Credentials

All accounts use bcrypt-hashed passwords in the database.

### Student Accounts

| Student ID | Username | Default Password |
|------------|---------|-----------------|
| S001 | s001 | pass123 |
| S002 | s002 | pass123 |
| ... | ... | ... |
| S015 | s015 | pass123 |

### Doctor Accounts

| Doctor ID | Username | Password |
|-----------|---------|----------|
| D001 | dr.ahmed | Ahmed@2024 |
| D002 | dr.laila | Laila@2024 |
| D003 | dr.khalid | Khalid@2024 |

### Admin Account

| Username | Password |
|----------|----------|
| admin | Admin@EduSense2025! |

> Passwords can be changed via `POST /api/auth/change-password` after login.

---

## 17. GPA & Academic Calculations

### Grade → GPA Points

| Grade Range | GPA Points |
|-------------|-----------|
| 90–100 | 4.0 |
| 85–89 | 4.0 |
| 80–84 | 3.5 |
| 75–79 | 3.0 |
| 70–74 | 2.5 |
| 65–69 | 2.0 |
| 60–64 | 1.5 |
| 50–59 | 1.0 |
| < 50 | 0.0 |

### Semester GPA Formula

```
GPA = Σ(grade_points × credit_hours) / Σ(credit_hours)
```

All courses assumed 3 credit hours each. GPA capped at 4.0.

### Academic Standing

| GPA Range | Standing |
|-----------|---------|
| ≥ 3.5 | Honors |
| 2.0–3.49 | Good Standing |
| 1.5–1.99 | Academic Warning |
| < 1.5 | Academic Probation |

### Degree Progress

```
Credits Earned   = count(completed courses) × 3
Credits Required = 15  (5 required courses × 3 credit hours each)
Progress %       = (completed courses / 5) × 100
```

---

## 18. Feature Summary

| Feature | Status | Notes |
|---------|--------|-------|
| JWT Authentication | ✅ | HS256, 12h expiry, env-var secret |
| bcrypt Password Hashing | ✅ | 12 rounds, legacy auto-upgrade |
| Role-Based Access Control | ✅ | student / doctor / admin |
| Login Rate Limiting | ✅ | 10 attempts / 5 min per IP |
| Paymob Payment + HMAC | ✅ | HMAC-SHA512 verified before DB write |
| CORS Lockdown | ✅ | Specific origins only |
| Real-Time Emotion Detection | ✅ | WebSocket + emotion_engine.py |
| QR Code Attendance | ✅ | 6-char token, 90min expiry, one-use |
| Face Recognition Attendance | ✅ | Face encoding stored in DB |
| Manual Attendance | ✅ | Doctor can mark manually |
| Grade Management | ✅ | Post, update, unique per student+course |
| Assignment Submission | ✅ | Text + file (base64 in SQLite) |
| Assignment Grading | ✅ | Grade + feedback |
| Exam Scheduling | ✅ | Full CRUD with room and duration |
| Office Hours Booking | ✅ | Slot system with DB persistence |
| Advising System | ✅ | Appointments, notes, degree audit |
| At-Risk Early Warning | ✅ | 4-factor scoring, email on critical |
| Degree Audit | ✅ | CS401–CS405 progress tracking |
| Exam Proctoring | ✅ | Remote webcam monitoring with violation flagging |
| Waitlist Management | ✅ | FIFO queue for full courses |
| Push Notifications | ✅ | WebSocket per-user channel |
| Community Chat | ✅ | Per-course messages |
| Announcement System | ✅ | Doctor broadcasts to course |
| Complaint / Appeal System | ✅ | Multi-stage: student → doctor → admin |
| PDF Export | ✅ | jsPDF + html2canvas for Arabic support |
| Audit Log | ✅ | Timestamped action history |
| Registration Control | ✅ | Admin opens/closes registration per semester |
| Enrollment Management | ✅ | Bulk and individual enroll/drop |
| Excuse / Absence System | ✅ | Submit, approve, reject |
| Analytics Dashboard | ✅ | Clusters, time trends, lecture comparison |
| Arabic / English Support | ✅ | LanguageContext + RTL layout |
| Mobile Responsive | ✅ | useMobile hook + Framer Motion |
| Offline Fallback | ✅ | localStorage sync when backend unreachable |
| Docker Deployment | ✅ | docker-compose.yml included |
| VPS Deployment | ✅ | vps_setup.sh for Ubuntu 20.04 |
| Swagger API Docs | ✅ | Auto-generated at /docs |

---

*EduSense v1.0.0 — Full-stack university management with AI emotion detection.*
