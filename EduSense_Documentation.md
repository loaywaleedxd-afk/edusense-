# EduSense — Full System Documentation

**Version:** 3.0  
**Stack:** React 19 + Vite 8 · No backend · localStorage persistence  
**Location:** `D:\download\portal\Ddownloadedusense-web\`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Running the Project](#4-running-the-project)
5. [Authentication & User Roles](#5-authentication--user-roles)
6. [Data Layer — DataStore](#6-data-layer--datastore)
7. [Pages & Features](#7-pages--features)
   - 7.1 [Login Page](#71-login-page)
   - 7.2 [Doctor Page](#72-doctor-page)
   - 7.3 [Student Page](#73-student-page)
   - 7.4 [Admin Page](#74-admin-page)
   - 7.5 [Parent Page](#75-parent-page)
8. [Shared Components](#8-shared-components)
9. [Theme System](#9-theme-system)
10. [Feature Deep Dives](#10-feature-deep-dives)
    - 10.1 [Live Emotion Detection](#101-live-emotion-detection)
    - 10.2 [QR Code Attendance](#102-qr-code-attendance)
    - 10.3 [Grade Calculator](#103-grade-calculator)
    - 10.4 [Absence Excuse System](#104-absence-excuse-system)
    - 10.5 [System Alerts](#105-system-alerts)
11. [Credentials Reference](#11-credentials-reference)
12. [localStorage Schema](#12-localstorage-schema)

---

## 1. Project Overview

EduSense is a classroom intelligence web application for Egyptian universities. It combines real-time facial emotion detection with attendance management, grade tracking, and communication tools — all running entirely in the browser with no server required.

**Core capabilities:**
- Webcam-based emotion recognition during live lectures
- Attendance tracking (manual, QR code, face recognition)
- Grade management with weighted component calculator
- Student absence excuse submission and doctor review
- System alerts fired automatically when engagement drops
- Community chat per course
- Analytics dashboards for doctors, students, and administrators
- Parent monitoring portal

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Build Tool | Vite 8 |
| QR Code | `qrcode` npm package (v1.5.4) |
| Charts | Custom Canvas-based components (no chart library) |
| Webcam / Face Detection | Browser `getUserMedia` API + face-api.js (loaded from CDN) |
| Persistence | `localStorage` (key: `edusense_store`) |
| Styling | Inline styles (no CSS framework) |
| Module System | ES Modules (`"type": "module"` in package.json) |

---

## 3. Project Structure

```
Ddownloadedusense-web/
├── src/
│   ├── App.jsx                  # Root — routes by user role
│   ├── main.jsx                 # ReactDOM.createRoot entry point
│   ├── theme.js                 # DARK / LIGHT color palettes
│   ├── dataStore.js             # All data logic + localStorage
│   ├── data/
│   │   ├── store.json           # Seed data (real students from CSV)
│   │   └── credentials.js       # Student + Doctor login credentials
│   ├── pages/
│   │   ├── LoginPage.jsx        # Role selection + credential form
│   │   ├── DoctorPage.jsx       # Doctor dashboard (11 sections)
│   │   ├── StudentPage.jsx      # Student dashboard (9 sections)
│   │   ├── AdminPage.jsx        # Admin panel (6 sections)
│   │   └── ParentPage.jsx       # Parent monitoring portal
│   └── components/
│       ├── Sidebar.jsx          # Navigation sidebar with badges
│       ├── Topbar.jsx           # Top bar with user info + theme toggle
│       ├── StatCard.jsx         # Metric card (value + label + icon)
│       ├── Card.jsx             # Generic content card with title
│       ├── Badge.jsx            # Colored pill badge
│       ├── DataTable.jsx        # Sortable/searchable table
│       ├── Charts.jsx           # BarChart, LineChart, DonutChart, AttentionRing
│       ├── EmotionBars.jsx      # Horizontal emotion distribution bars
│       ├── AlertItem.jsx        # Single alert row component
│       ├── ScheduleItem.jsx     # Schedule entry component
│       ├── StudentFaceCard.jsx  # Student card with live emotion overlay
│       ├── WebcamFeed.jsx       # Webcam stream + face detection wrapper
│       └── QRCode.jsx           # Canvas QR code renderer
├── public/
│   └── student_photos/          # Student photos (filename = student email ID + .jpg)
├── package.json
└── vite.config.js
```

---

## 4. Running the Project

### First time setup

```powershell
cd D:\download\portal\Ddownloadedusense-web
& "C:\Program Files\nodejs\npm.cmd" install
```

### Every time you want to run

```powershell
cd D:\download\portal\Ddownloadedusense-web
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Then open your browser at: **http://localhost:5173**

### Stop the server

Press `Ctrl + C` in the terminal.

---

## 5. Authentication & User Roles

### Login Flow

1. User lands on **LoginPage** and selects a role tile (Student / Doctor / Admin / Parent).
2. Credentials are entered and validated against the in-memory `users` array built by `DataStore._makeUsers()`.
3. On success, `App.jsx` receives the user object and renders the matching page component.
4. The current user is **not** stored in localStorage — session ends on page refresh.

### Role Overview

| Role | Username | Password | What they can do |
|---|---|---|---|
| **Admin** | `admin` | `admin` | Manage students, doctors, courses, view system reports |
| **Doctor** | `dr.ahmed` | `Ahmed@2024` | Run live sessions, manage attendance, grades, chat |
| **Doctor** | `dr.laila` | `Laila@2024` | Same as above |
| **Doctor** | `dr.khalid` | `Khalid@2024` | Same as above |
| **Doctor** | `dr.sara` | `Sara@2024` | Same as above |
| **Student** | (see §11) | (see §11) | View own attendance, emotions, grades, submit excuses |
| **Parent** | `parent` | `parent` | Monitor child's attendance, emotions, schedule |

### User Object (returned after login)

```js
{
  username: 'dr.ahmed',
  name: 'Dr. Ahmed Smith',
  role: 'doctor',           // 'student' | 'doctor' | 'admin' | 'parent'
  email: 'ahmed@university.edu',
  id: 'D001',               // studentId or doctorId or 'ADM'
  studentId: '',
  doctorId: 'D001',
  initials: 'DA',           // for avatar display
  photoUrl: null,           // student photo path if available
}
```

---

## 6. Data Layer — DataStore

**File:** `src/dataStore.js`  
**Exported as:** `store` (singleton instance)

The DataStore class is the single source of truth for all application data. It initializes from `store.json` seed data and then merges any previously persisted changes from `localStorage`.

### Initialization Order

```
constructor()
  → _initDefaults()       loads students, doctors, courses, users, alerts
  → _loadPersisted()      merges saved changes from localStorage
```

### Core Data Objects

#### Student
```js
{
  id: 'S001',
  name: 'مرام تامر عبدالحى',
  emoji: '👩',
  color: '#3b82f6',
  dept: 'Computer Science',
  year: 2,
  email: '231014184.0@university.edu',
  phone: '',
  emotion: 'neutral',          // current detected emotion
  attention: 'moderate',       // 'attentive' | 'moderate' | 'distracted'
  engagement: 72,              // 0–100
  attentionScore: 65,          // 0–100
  attendanceRate: 75,          // 0–100 (percentage)
  gpa: 2.8,
  present: false,
  confidence: 0.91,            // face detection confidence
  hasFace: false,
  registeredAt: '',
  capturedPhoto: null,         // base64 data URL if photo was taken in app
}
```

#### Doctor
```js
{
  id: 'D001',
  name: 'Dr. Ahmed Smith',
  emoji: '👨‍🏫',
  color: '#3b82f6',
  dept: 'Computer Science',
  title: 'Professor',
  email: 'ahmed@university.edu',
  phone: '+20-1000000001',
  courses: 5,
  students: 120,
  engagement: 78,
  hasFace: false,
}
```

#### Course
```js
{
  id: 'CS401',
  name: 'Artificial Intelligence',
  code: 'CS401',
  room: 'Hall A',
  color: '#3b82f6',
  time: '09:00',
  duration: 90,               // minutes
  doctorId: 'D001',
  doctorName: 'Dr. Ahmed Smith',
  weeks: [1,2,3,...,16],      // active weeks (admin can edit)
  semester: 'Fall 2024',
  enrolledCount: 32,
}
```

### DataStore API Reference

#### Students
| Method | Description |
|---|---|
| `store.students` | Array of all student objects |
| `store.getStudent(id)` | Get single student by ID |
| `store.addStudent(data)` | Add new student, auto-assigns ID |
| `store.updateStudent(id, data)` | Merge data into student, persist |
| `store.deleteStudent(id)` | Remove student, persist |
| `store.getPhotoUrl(student)` | Returns `/student_photos/{emailId}.jpg` or null |

#### Doctors
| Method | Description |
|---|---|
| `store.doctors` | Array of all doctor objects |
| `store.getDoctor(id)` | Get single doctor by ID |
| `store.addDoctor(data)` | Add new doctor |
| `store.deleteDoctor(id)` | Remove doctor |
| `store.getDoctorCourses(doctorId)` | Courses assigned to a doctor |

#### Courses & Enrollment
| Method | Description |
|---|---|
| `store.courses` | Array of all courses |
| `store.getCourse(id)` | Get single course by code (e.g. `'CS401'`) |
| `store.addCourse(data)` | Create new course |
| `store.updateCourse(id, data)` | Update course fields (including `weeks` array) |
| `store.deleteCourse(id)` | Remove course |
| `store.enrollStudent(courseId, studentId)` | Add student to course |
| `store.unenrollStudent(courseId, studentId)` | Remove student from course |
| `store.getEnrolledStudents(courseId)` | Student objects enrolled in course |
| `store.getUnenrolledStudents(courseId)` | Students NOT in course |
| `store.getStudentCourses(studentId)` | Courses a student is enrolled in |

#### Attendance
| Method | Description |
|---|---|
| `store.markAttendance(courseId, studentId, confidence, method, week)` | Mark student present |
| `store.getAttendance(courseId, week)` | Attendance records for course+week |
| `store.getStudentAttendance(studentId)` | All attendance records for a student |
| `store.getStudentCourseAttendance(studentId, courseId)` | Per-week map for student+course |

**Attendance Record:**
```js
{
  studentId: 'S003',
  courseId: 'CS401',
  week: 4,
  time: '09:32:17',
  date: '2025-10-15',
  method: 'qr',          // 'manual' | 'qr' | 'face' | 'excused'
  confidence: 1.0,
  status: 'present',     // 'present' | 'excused'
}
```

**Attendance storage key:** `courseId_W##` (e.g. `CS401_W04`)

#### Exam Results
| Method | Description |
|---|---|
| `store.addExamResult(studentId, courseId, grade, doctorId)` | Save a numeric grade |
| `store.getStudentResults(studentId)` | All grades for a student: `{courseId: {grade, date}}` |
| `store.getCourseResults(courseId)` | All grades for a course |
| `store.deleteExamResult(studentId, courseId)` | Remove a grade |

#### Grade Weights & Calculator
| Method | Description |
|---|---|
| `store.setGradeWeights(courseId, weights)` | Save weight config for a course |
| `store.getGradeWeights(courseId)` | Get weights (default: midterm 30%, final 50%, assignments 15%, attendance 5%) |
| `store.setGradeComponents(studentId, courseId, components)` | Save component scores + auto-calculate final grade |
| `store.getGradeComponents(studentId, courseId)` | Retrieve saved component scores |

**Weight object:**
```js
{ midterm: 30, final: 50, assignments: 15, attendance: 5 }  // must sum to 100
```

**Components object:**
```js
{ midterm: 88, final: 75, assignments: 90, attendance: 100 }  // each 0–100
```

#### QR Attendance Sessions
| Method | Description |
|---|---|
| `store.createQRSession(courseId, week)` | Generates 6-char token, returns it |
| `store.useQRToken(token, studentId)` | Validates token and marks attendance. Returns `{ok, error?, courseId?, week?}` |

**QR Session rules:**
- Token is 6 uppercase alphanumeric characters (e.g. `7HJUD6`)
- Expires after **90 minutes** from creation
- Each student can only use a token **once** (`usedBy[]` array)
- QR value encoded: `EDUSENSE:TOKEN:COURSEID:WWEEK`

#### Absence Excuses
| Method | Description |
|---|---|
| `store.submitExcuse(data)` | Student submits excuse, status = `'pending'` |
| `store.updateExcuse(id, status, reviewedBy)` | Doctor approves/rejects. If approved, marks attendance as `'excused'` |
| `store.getExcuses(courseId)` | All excuses, optionally filtered by course |
| `store.getStudentExcuses(studentId)` | Excuses for a specific student |

**Excuse object:**
```js
{
  id: 'EX1747234567890',
  studentId: 'S019',
  studentName: 'مرام تامر عبدالحى',
  courseId: 'CS401',
  courseName: 'Artificial Intelligence',
  week: 4,
  reason: 'Medical emergency — hospital visit',
  status: 'pending',         // 'pending' | 'approved' | 'rejected'
  submittedAt: '2025-10-15T09:30:00.000Z',
  reviewedAt: null,
  reviewedBy: null,
}
```

#### System Alerts
| Method | Description |
|---|---|
| `store.addAlert(data)` | Add a new alert (prepended, max 100 kept) |
| `store.getAlerts(unreadOnly)` | Get all alerts, or only unread |
| `store.markAlertRead(id)` | Mark single alert as read |
| `store.markAllAlertsRead()` | Mark all alerts read |
| `store.clearAlert(id)` | Delete an alert |

**Alert object:**
```js
{
  id: 'AL1747234567890_abc',
  type: 'warning',     // 'warning' | 'info' | 'critical'
  title: 'Low Engagement — Ahmed Hassan',
  message: 'Emotion: bored during CS401',
  studentId: 'S002',
  courseId: 'CS401',
  read: false,
  createdAt: '2025-10-15T09:32:00.000Z',
}
```

#### Community Chat
| Method | Description |
|---|---|
| `store.postMessage(courseId, sender, senderId, role, text, type)` | Post a message |
| `store.getMessages(courseId)` | All messages for a course |
| `store.addReaction(courseId, msgId, emoji, senderId)` | Toggle emoji reaction |
| `store.deleteMessage(courseId, msgId)` | Delete a message |

### Persistence

`store._persist()` is called automatically after every write operation. It saves to `localStorage` key `edusense_store`:

```js
{
  students,
  doctors,
  courses,
  courseEnrollments,
  attendance,
  examResults,
  chatMessages,
}
```

Note: `excuses`, `gradeWeights`, `gradeComponents`, `qrSessions`, and `systemAlerts` are stored in instance properties and **also** saved via `_persist()` but are re-initialized as empty arrays on page refresh (they are not yet in the persisted key list). To make them fully persistent across refresh, add them to `_persist()` and restore them in `_loadPersisted()`.

---

## 7. Pages & Features

### 7.1 Login Page

**File:** `src/pages/LoginPage.jsx`

**Flow:**
1. Shows 4 role cards: Student, Doctor, Admin, Parent
2. User clicks a role → credential form appears
3. Demo credentials are shown below the form for convenience
4. `store.authenticate(username, password)` is called on submit
5. On success, calls `onLogin(user)` which updates `App.jsx` state

---

### 7.2 Doctor Page

**File:** `src/pages/DoctorPage.jsx`

The most feature-rich page. Doctor sees their own courses only (filtered by `doctorId`).

**Navigation sections:**

#### Dashboard
- Stats: My Courses count, My Students count, Present Today, Avg Engagement %
- Engagement + Attention trend line chart (16 weeks)
- Emotion distribution donut chart
- Today's schedule list
- Enrolled students table with emotion badges

#### Live Session
- Webcam feed component (`WebcamFeed.jsx`) with real-time face detection
- Student face cards grid — each card shows name, emotion icon, engagement %, attention ring
- Emotion detection triggers alerts automatically:
  - Emotions considered low-engagement: `bored`, `confused`, `sad`, `angry`, `fearful`, `fear`
  - Alert fires maximum **once per 5 minutes per student** (cooldown tracked via `useRef`)
  - Alert is added to `store.systemAlerts` and visible in Alerts page
- Live stats: Present count, Avg Engagement, Avg Attention, Dominant Emotion
- Emotion distribution bar chart updates in real time

#### Attendance
Three tabs:

**📋 Student Roster tab**
- Dropdown: select course + select week
- Student list — click any row to toggle present/absent
- "All Present" / "All Absent" bulk buttons
- Present/Absent counters

**📱 QR Check-In tab**
- Generates a QR session via `store.createQRSession(courseId, week)`
- Renders real QR code canvas (via `QRCode.jsx` component)
- QR value: `EDUSENSE:TOKEN:COURSEID:WWEEK`
- Displays large session code (e.g. `7HJUD6`) for students to type manually
- "Regenerate Code" button creates a new token
- Instructions tell students: My Attendance → QR Check-In → enter code

**📄 Excuses tab**
- Lists all pending excuses for the selected course
- Each excuse shows: student name, week, reason text, submitted date
- ✅ Approve button → calls `store.updateExcuse(id, 'approved', doctor.name)` → marks attendance as excused
- ❌ Reject button → calls `store.updateExcuse(id, 'rejected', doctor.name)`
- Approved excuses disappear from the pending list

#### My Lectures
- Table of all doctor's courses
- Columns: Course name, Code, Room, Time, Enrolled count, Status
- Each row is expandable to show enrolled student list

#### Students
- Full searchable table of all students enrolled in doctor's courses
- Columns: Photo/emoji, Name, Department, Year, Attendance %, GPA, Emotion, Engagement
- Click row to expand student detail panel

#### Exam Results (`DocGrades`)
- Course selector dropdown
- **⚙️ Grade Weights panel** (toggles open):
  - 4 inputs: Midterm %, Final Exam %, Assignments %, Attendance %
  - Live total validation — must equal 100%
  - "Save Weights" persists via `store.setGradeWeights()`
- Weight summary pill bar always visible below selector
- Student grade table with columns: ID, Name, Department, Grade, Letter, Status, Actions
- **Actions per student:**
  - 🧮 **Calc** — opens Grade Calculator modal:
    - 4 score inputs (0–100 each) with weight labels
    - Live calculated final grade preview (large colored number)
    - Letter grade below (A+ / A / B+ ... / F)
    - "Save & Apply Grade" calls `store.setGradeComponents()` → auto-calculates and saves
  - **Add** — direct grade entry (numeric input)
  - **Withd.** — mark student as withdrawn

#### Community
- Per-course discussion board
- Doctor can post as instructor (labeled with 👨‍🏫 badge)
- Emoji reactions on any message
- Delete own messages
- Pinned/announcement message type supported

#### Analytics
- System-wide statistics
- Department breakdown bar chart
- Attendance rate distribution
- Weekly engagement trends across all courses

#### Alerts (`DocAlerts`)
- Lists all system alerts from `store.systemAlerts`
- Color-coded cards:
  - 🟡 Yellow border = `warning`
  - 🔵 Blue border = `info`
  - 🔴 Red border = `critical`
- Unread count badge on sidebar nav item
- "Mark All Read" button
- "Clear All" button
- Per-alert: "Read" button (marks read) and "Dismiss" button (deletes)

#### Moodle
- Embedded iframe pointing to the university Moodle instance

#### R Analysis
- Embedded iframe for R-based statistical reports

---

### 7.3 Student Page

**File:** `src/pages/StudentPage.jsx`

Student sees only their own data — their enrolled courses, their attendance, their grades.

**Navigation sections:**

#### Dashboard
- Profile card: photo (from `student_photos/` directory or captured photo), name, department, year, GPA
- Stats: Attendance Rate %, Avg Engagement %, Avg Attention %, GPA
- Engagement + Attention trend chart (14 lectures)
- Emotion distribution donut chart
- Today's schedule
- Emotion log for today

#### My Attendance (`StudentAttendance`)
Three tabs:

**📋 Records tab**
- Summary cards: Attendance Rate, Courses Enrolled, Sessions Logged, Standing
- Enrolled Courses table: Course name, Weeks Attended / Total, Time, Method
- Click a course row to expand week-by-week attendance detail

**📱 QR Check-In tab**
- Text input for session code (e.g. `7HJUD6`)
- "Mark Me Present" button
- Calls `store.useQRToken(code, student.id)`
- Shows success: "✅ Checked in for Week X!"
- Shows error: "❌ Invalid code" / "❌ Code expired" / "❌ Already checked in"

**📄 Submit Excuse tab**
- Form fields:
  - Course dropdown (student's enrolled courses)
  - Week missed (1–16)
  - Reason / explanation textarea
- "Submit Excuse" button → calls `store.submitExcuse()`
- Shows past submitted excuses with status badges (Pending / Approved / Rejected)

#### My Emotions
- Emotion history chart
- Breakdown of emotions across sessions
- Personal emotion trend over weeks

#### Schedule
- Weekly timetable view
- Upcoming sessions list

#### Performance
- Engagement and attention history
- Comparison to class average

#### My Grades (`StudentGrades`)
- All enrolled courses with grade status
- For each course: numeric grade, letter grade, status
- Grade breakdown if components were entered by doctor

#### My Portfolio
- Student profile summary (exportable / printable view)
- Photo display using `capturedPhoto` (base64) or `student_photos/{id}.jpg`
- Stats summary: attendance, GPA, engagement
- Emotion history summary

#### Community
- Same course chat as Doctor view, but posted as student role

#### Moodle
- Embedded Moodle iframe

---

### 7.4 Admin Page

**File:** `src/pages/AdminPage.jsx`

Full system management. Admin sees all data across all doctors and courses.

**Navigation sections:**

#### Dashboard
- System-wide stats: Total Students, Total Doctors, Total Courses, Active Sessions
- Charts: department distribution, attendance trends
- Recent activity log

#### Students (`AdminStudents`)
- Full searchable/filterable student table
- Add new student form: Name, Department, Year, Email, Phone
- Edit any student field inline
- Delete student
- View student detail panel

#### Doctors (`AdminDoctors`)
- Doctor roster with title, department, email, phone
- Add new doctor form
- Delete doctor

#### Courses (`AdminCourses`)
- Course cards with color indicators
- Add new course: Name, Code, Room, Time, Duration, Doctor, Color, Semester
- Edit course details
- Delete course
- **Weeks Checklist panel** (expandable per course):
  - 16 checkboxes (W1–W16) in an 8-column grid
  - ✅ All button — activates all 16 weeks
  - ✗ None button — deactivates all weeks
  - Individual week toggle saves immediately via `store.updateCourse(id, {weeks: [...]})`
  - Active weeks badge shown on course card

#### Enrollments
- Manage which students are in which courses
- Course selector → shows enrolled + available students
- Enroll / Unenroll buttons

#### Reports
- System-wide attendance summary
- Per-department statistics
- Exportable tables

---

### 7.5 Parent Page

**File:** `src/pages/ParentPage.jsx`

Read-only monitoring view for a parent account. Linked to a specific student via `user.studentId`.

**Sections:**
- Child profile card with photo (from `student_photos/` or `capturedPhoto`) and emoji fallback
- Attendance rate overview
- Current emotion status
- Schedule for the week
- GPA and performance summary
- Emotion history chart
- Course-by-course attendance breakdown

---

## 8. Shared Components

### `Sidebar.jsx`
- Renders vertical navigation list
- Accepts `navItems` array: `{id, icon, label, live?, badge?}`
- `live: true` adds a pulsing red dot indicator
- `badge` can be a number or a **function** — if function, it is called on each render to get the current count (used for Alerts unread count)
- Highlights active item

### `Topbar.jsx`
- Shows page title, theme toggle (☀️ Light / 🌙 Dark), user avatar, user name, role, Sign Out button
- Avatar shows student photo if available, otherwise initials circle

### `StatCard.jsx`
- Props: `label`, `value`, `sub` (subtitle), `icon`, `accent` ('blue' | 'purple' | 'green' | 'amber' | 'red')
- Renders a colored metric card with icon background

### `Card.jsx`
- Generic bordered card with optional title
- Props: `title`, `children`, `style`

### `DataTable.jsx`
- Sortable, searchable table
- Props: `columns` (array of `{key, label, render?}`), `data`, `onRowClick`

### `Charts.jsx`
Exports four chart components (all custom canvas-based):

| Component | Description |
|---|---|
| `LineChart` | Multi-series line chart. Props: `series`, `labels`, `height` |
| `BarChart` | Vertical bar chart. Props: `data`, `labels`, `color`, `height` |
| `DonutChart` | Donut/pie chart. Props: `data` (array of `{label, value, color}`) |
| `AttentionRing` | Single circular progress ring. Props: `value` (0–100), `color` |

### `QRCode.jsx`
- Uses the `qrcode` npm package
- Renders to a `<canvas>` element
- Props: `value` (string to encode), `size` (px, default 200), `color` (hex, default `#3b82f6`)
- Background: `#0f172a` (dark), foreground: the `color` prop

### `WebcamFeed.jsx`
- Accesses browser webcam via `getUserMedia`
- Runs face-api.js models for emotion + landmark detection
- Calls `onEmotionDetected(studentId, emotion, confidence)` callback
- Shows video stream with face bounding boxes overlaid

### `StudentFaceCard.jsx`
- Card showing student name, photo/emoji, current emotion icon, engagement %, attention ring
- Updates live during Live Session

### `EmotionBars.jsx`
- Horizontal bar chart of emotion distribution (happy, neutral, confused, bored, etc.)
- Each bar has the emotion's color and a percentage label

### `AlertItem.jsx`
- Single alert display row: icon, message text, student/course info, time, severity badge

### `ScheduleItem.jsx`
- Single schedule entry: time, course name, room, status badge

### `Badge.jsx`
- Small colored pill. Props: `label`, `color`, `bg`

---

## 9. Theme System

**File:** `src/theme.js`

The app supports Dark mode (default) and Light mode. The active theme is passed as `theme` prop (aliased as `C`) to every component.

### Dark Theme (`DARK`)
```js
{
  bg: '#0f172a',        // page background (deep navy)
  card: '#1e293b',      // card background
  border: '#334155',    // border color
  text: '#f1f5f9',      // primary text
  text2: '#94a3b8',     // secondary text
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  cyan: '#06b6d4',
  pink: '#ec4899',
}
```

### Light Theme (`LIGHT`)
Same keys, different values — lighter backgrounds, darker text.

### Switching Themes
The toggle button in `Topbar` calls `onToggleMode()` → flips `isDark` state in `App.jsx` → re-renders entire tree with new `C` object.

---

## 10. Feature Deep Dives

### 10.1 Live Emotion Detection

**Location:** `DoctorPage.jsx` → `DocLive` function  
**Component:** `WebcamFeed.jsx`

**How it works:**
1. Doctor navigates to Live Session
2. `WebcamFeed` accesses the webcam and loads face-api.js models
3. Every frame, detected faces are matched to enrolled students by position/order
4. For each detected student, `handleEmotionDetected(studentId, emotion, confidence)` is called
5. The function updates the student's `emotion` field in the students array
6. If emotion is in the "low engagement" list AND 5 minutes have passed since the last alert for that student, a new system alert is created

**Alert cooldown mechanism:**
```js
const alertCooldown = useRef({});  // { studentId: lastAlertTimestamp }

// In handleEmotionDetected:
const now = Date.now();
const lastAlert = alertCooldown.current[studentId] || 0;
if (now - lastAlert > 5 * 60 * 1000) {
  alertCooldown.current[studentId] = now;
  store.addAlert({ type: 'warning', title: `Low Engagement — ${student.name}`, ... });
}
```

Using `useRef` (not `useState`) means the cooldown persists between renders without causing re-renders.

---

### 10.2 QR Code Attendance

**Doctor side:** `DocAttendance` → QR Check-In tab  
**Student side:** `StudentAttendance` → QR Check-In tab

**Full flow:**
```
Doctor selects course + week
  → clicks "Generate QR" or switches to QR Check-In tab
  → store.createQRSession(courseId, week) generates token e.g. "7HJUD6"
  → QRCode.jsx renders canvas QR encoding "EDUSENSE:7HJUD6:CS401:W1"
  → Session code displayed in large monospace text

Student opens My Attendance → QR Check-In tab
  → types the code "7HJUD6"
  → clicks "Mark Me Present"
  → store.useQRToken("7HJUD6", student.id)
    → validates: token exists? not expired (90 min)? student not already used it?
    → if valid: calls store.markAttendance(courseId, studentId, 1.0, 'qr', week)
    → returns { ok: true, courseId, week }
  → UI shows "✅ Checked in for Week 1!"
```

**Error cases:**
- `"Invalid code"` — token doesn't exist in `qrSessions`
- `"Code expired (valid for 90 min)"` — token older than 90 minutes
- `"Already checked in"` — student's ID already in `usedBy[]`

---

### 10.3 Grade Calculator

**Location:** `DoctorPage.jsx` → `DocGrades` function

**Two-step process:**

**Step 1 — Set weights (once per course):**
- Click ⚙️ Grade Weights button → panel expands
- Enter percentages for: Midterm, Final Exam, Assignments, Attendance
- Total must equal exactly 100%
- Save → `store.setGradeWeights(courseId, {midterm, final, assignments, attendance})`
- Default weights: 30 / 50 / 15 / 5

**Step 2 — Enter scores per student:**
- Click 🧮 Calc next to a student → modal opens
- Enter scores 0–100 for each component
- Live preview calculates: `(midterm * 0.30) + (final * 0.50) + (assignments * 0.15) + (attendance * 0.05)`
- Click "Save & Apply Grade" → `store.setGradeComponents()` which internally calls `store.addExamResult()` with the auto-calculated final grade

**Grade letter mapping:**
| Range | Letter |
|---|---|
| ≥ 90 | A+ |
| ≥ 85 | A |
| ≥ 80 | B+ |
| ≥ 75 | B |
| ≥ 70 | C+ |
| ≥ 65 | C |
| ≥ 60 | D+ |
| ≥ 50 | D |
| < 50 | F |

---

### 10.4 Absence Excuse System

**Student submits:** `StudentAttendance` → Submit Excuse tab  
**Doctor reviews:** `DocAttendance` → Excuses tab

**Flow:**
```
Student fills form:
  - Course: dropdown of enrolled courses
  - Week Missed: 1–16
  - Reason: free text

  → store.submitExcuse({ studentId, studentName, courseId, courseName, week, reason })
  → excuse saved with status = 'pending'

Doctor sees pending excuses for their course:
  → each excuse shows student name, week, reason, submitted date
  → Doctor clicks ✅ Approve:
    → store.updateExcuse(id, 'approved', doctor.name)
    → Automatically calls store.markAttendance(courseId, studentId, 1.0, 'excused', week)
    → Attendance record gets status = 'excused'
  → Doctor clicks ❌ Reject:
    → store.updateExcuse(id, 'rejected', doctor.name)
    → No attendance change

Student can view their excuse status under the form
```

---

### 10.5 System Alerts

**Generated by:** `DocLive` → `handleEmotionDetected` (automatically)  
**Displayed in:** `DocAlerts` page

**Alert types and colors:**

| Type | Border Color | When used |
|---|---|---|
| `warning` | Yellow `#f59e0b` | Low engagement detected |
| `info` | Blue `#3b82f6` | General informational events |
| `critical` | Red `#ef4444` | Student absent/not detected |

**Sidebar badge:**
The Alerts nav item uses `badge: () => store.getAlerts(true).length || 0` — a function that returns the current unread count. The Sidebar component calls it on each render to keep the badge current.

**Alert lifecycle:**
1. Created → `read: false`, appears at top of list
2. Doctor reads → click "Read" → `read: true`, badge count decreases
3. Doctor dismisses → click "Dismiss" → alert deleted from array

---

## 11. Credentials Reference

### Doctor Accounts

| Username | Password | Name | Department |
|---|---|---|---|
| `dr.ahmed` | `Ahmed@2024` | Dr. Ahmed Smith | Computer Science |
| `dr.laila` | `Laila@2024` | Dr. Laila Hassan | Mathematics |
| `dr.khalid` | `Khalid@2024` | Dr. Khalid Omar | Engineering |
| `dr.sara` | `Sara@2024` | Dr. Sara Nour | Physics |

### Admin Account

| Username | Password |
|---|---|
| `admin` | `admin` |

### Parent Account

| Username | Password | Linked Student |
|---|---|---|
| `parent` | `parent` | First student in the system |

### Sample Student Accounts

| Username | Password | Name |
|---|---|---|
| `231014184.0` | `WGaub52Z` | مرام تامر عبدالحى |
| `231006367.0` | `gAC72qFl` | محمد علاء لطفى |
| `231015291.0` | `41sNLjVH` | بيشوى مرقس حبيب |
| `231014670.0` | `td26fEeV` | رضوى شريف حماد |
| `231006507.0` | `VhDIq2An` | ندى شريف ابراهيم |

> Full student credential list is in `src/data/credentials.js` (122 student accounts)

---

## 12. localStorage Schema

**Key:** `edusense_store`  
**Format:** JSON string

```json
{
  "students": [ /* array of student objects with any persisted changes */ ],
  "doctors": [ /* array of doctor objects */ ],
  "courses": [ /* array of course objects including custom weeks arrays */ ],
  "courseEnrollments": {
    "CS401": ["S001", "S002", "S003", ...],
    "CS402": ["S004", "S005", ...]
  },
  "attendance": {
    "CS401_W01": {
      "S001": { "studentId": "S001", "week": 1, "method": "qr", "status": "present", ... }
    },
    "CS401_W04": {
      "S019": { "studentId": "S019", "week": 4, "method": "excused", "status": "excused", ... }
    }
  },
  "examResults": {
    "S001": {
      "CS401": { "grade": 82.5, "addedBy": "system", "date": "2025-10-15" }
    }
  },
  "chatMessages": {
    "CS401": [
      { "id": "CS401_1", "sender": "Dr. Ahmed Smith", "role": "doctor", "text": "...", ... }
    ]
  }
}
```

**To clear all saved data** (reset to defaults):
Open browser DevTools → Application → Local Storage → delete key `edusense_store` → refresh page.

---

*Documentation generated for EduSense v3.0 — May 2026*
