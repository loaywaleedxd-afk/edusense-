/**
 * api.js — Thin async wrapper around the FastAPI backend.
 * All methods return parsed JSON or throw on HTTP error.
 *
 * Token is stored in localStorage under "edusense_token".
 * Import `api` to call endpoints, `setToken`/`clearToken` to manage auth.
 */

// In dev:  Vite proxies /api/* → localhost:8000  (see vite.config.js server.proxy)
// In prod: nginx proxies /api/* → backend container (same domain, relative path)
// VITE_API_URL can override both (e.g. for Railway or external backend)
const BASE = import.meta.env.VITE_API_URL || '';

// ── Token management ──────────────────────────────────────────────────────────
let _token = localStorage.getItem('edusense_token') || null;

export function setToken(t)  { _token = t; if (t) localStorage.setItem('edusense_token', t); }
export function clearToken() { _token = null; localStorage.removeItem('edusense_token'); }
export function getToken()   { return _token; }

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail?.detail || `${method} ${path} → ${res.status}`);
  }
  return res.json();
}

export const get  = (path)       => req('GET',    path);
export const post = (path, body) => req('POST',   path, body);
export const put  = (path, body) => req('PUT',    path, body);
export const del  = (path)       => req('DELETE', path);

// ── API surface ───────────────────────────────────────────────────────────────
export const api = {
  // Auth
  login:          (username, password) => post('/api/auth/login', { username, password }),
  me:             ()                   => get('/api/auth/me'),
  changePassword: (old_password, new_password) =>
                    post('/api/auth/change-password', { old_password, new_password }),

  // Init — bulk data load after login
  init: () => get('/api/init/'),

  // Students
  getStudents:    ()     => get('/api/students/'),
  getStudent:     (id)   => get(`/api/students/${id}`),
  createStudent:  (data) => post('/api/students/', data),
  deleteStudent:  (id)   => req('DELETE', `/api/students/${id}`),

  // Announcements
  getAnnouncements:   ()     => get('/api/announcements/'),
  addAnnouncement:    (data) => post('/api/announcements/', data),
  deleteAnnouncement: (id)   => del(`/api/announcements/${id}`),

  // Exam schedule
  getExams:   ()     => get('/api/exams/'),
  addExam:    (data) => post('/api/exams/', data),
  deleteExam: (id)   => del(`/api/exams/${id}`),

  // Course resources
  getResources:   ()     => get('/api/resources/'),
  addResource:    (data) => post('/api/resources/', data),
  deleteResource: (id)   => del(`/api/resources/${id}`),

  // Assignments
  getAssignments:   ()     => get('/api/assignments/'),
  addAssignment:    (data) => post('/api/assignments/', data),
  deleteAssignment: (id)   => del(`/api/assignments/${id}`),

  // Submissions
  getSubmissions:  ()     => get('/api/assignments/submissions'),
  upsertSubmission:(data) => post('/api/assignments/submissions', data),
  gradeSubmission: (data) => put('/api/assignments/submissions/grade', data),

  // Notifications
  getNotifications:    ()       => get('/api/notifications/'),
  addNotification:     (data)   => post('/api/notifications/', data),
  bulkNotifications:   (items)  => post('/api/notifications/bulk', items),
  markNotifRead:       (id)     => put(`/api/notifications/${id}/read`),
  markAllNotifsRead:   ()       => put('/api/notifications/read-all'),

  // Complaints
  getComplaints:   ()           => get('/api/complaints/'),
  upsertComplaint: (data)       => post('/api/complaints/', data),
  updateComplaint: (id, data)   => put(`/api/complaints/${id}`, data),

  // Grades
  getStudentGrades: (id)   => get(`/api/grades/student/${id}`),
  saveCourseGrade:  (data) => post('/api/grades/', data),

  // Attendance
  markAttendance:      (data)   => post('/api/attendance/mark', data),
  getStudentAttendance:(id)     => get(`/api/attendance/student/${id}`),

  // Messages
  getMessages:  (code) => get(`/api/messages/?course_code=${encodeURIComponent(code)}`),
  sendMessage:  (data) => post('/api/messages/', data),

  // Excuses
  submitExcuse:      (data) => post('/api/excuses/', data),
  getStudentExcuses: (id)   => get(`/api/excuses/student/${id}`),
  updateExcuse:      (id, data) => put(`/api/excuses/${id}`, data),

  // Fees
  getFeeStatus: (id)        => get(`/api/fees/${id}`),
  setFeeStatus: (id, data)  => put(`/api/fees/${id}`, data),

  // Registration
  getRegistration:   ()     => get('/api/registration/'),
  setRegistration:   (data) => put('/api/registration/', data),

  // Waitlist
  getWaitlist:   (courseId)             => get(`/api/waitlist/${courseId}`),
  joinWaitlist:  (courseId, studentId)  => post(`/api/waitlist/${courseId}/${studentId}`),
  leaveWaitlist: (courseId, studentId)  => del(`/api/waitlist/${courseId}/${studentId}`),

  // QR sessions
  createQR: (data) => post('/api/qr/create', data),
  useQR:    (data) => post('/api/qr/use', data),

  // Enrollments
  getEnrollments:   ()     => get('/api/enrollments/'),
  bulkEnrollments:  (data) => post('/api/enrollments/bulk', data),
  enroll:   (cid, sid)     => post(`/api/enrollments/${cid}/${sid}`),
  unenroll: (cid, sid)     => del(`/api/enrollments/${cid}/${sid}`),

  // ── Exam Proctoring ────────────────────────────────────────────────────────
  proctoringStart:      (data)       => post('/api/proctor/start', data),
  proctoringVerify:     (data)       => post('/api/proctor/verify-identity', data),
  proctoringCheck:      (data)       => post('/api/proctor/check-frame', data),
  proctoringEnd:        (data)       => post('/api/proctor/end', data),
  proctoringSessionList:(examId)     => get(`/api/proctor/sessions${examId ? `?exam_id=${examId}` : ''}`),
  proctoringEvents:     (sessionId)  => get(`/api/proctor/events/${sessionId}`),
  proctoringExamSummary:(examId)     => get(`/api/proctor/summary/${examId}`),

  // ── Academic Advising ──────────────────────────────────────────────────────
  getAppointments:       ()          => get('/api/advising/appointments'),
  bookAppointment:       (data)      => post('/api/advising/appointments', data),
  updateAppointment:     (id, data)  => put(`/api/advising/appointments/${id}`, data),
  cancelAppointment:     (id)        => del(`/api/advising/appointments/${id}`),
  getAdvisorNotes:       (studentId) => get(`/api/advising/notes/${studentId}`),
  addAdvisorNote:        (data)      => post('/api/advising/notes', data),
  deleteAdvisorNote:     (id)        => del(`/api/advising/notes/${id}`),
  getDegreeAudit:        (studentId) => get(`/api/advising/degree-audit/${studentId}`),
  getGraduationProgress: (studentId) => get(`/api/advising/graduation-progress/${studentId}`),

  // ── At-Risk Early Warning ──────────────────────────────────────────────────
  runRiskAssessment: ()           => post('/api/at-risk/assess', {}),
  getAtRiskStudents: (minLevel)   => get(`/api/at-risk/students?min_level=${minLevel || 'medium'}`),
  getStudentRisk:    (studentId)  => get(`/api/at-risk/student/${studentId}`),
  notifyAtRisk:      (studentId)  => post(`/api/at-risk/notify/${studentId}?notify_advisor=true&notify_parent=true`, {}),

  // ── User preferences ───────────────────────────────────────────────────────
  getPreferences:    ()     => get('/api/users/preferences'),
  updatePreferences: (data) => put('/api/users/preferences', data),

  // ── Academic Calendar ──────────────────────────────────────────────────────
  getCalendarEvents:  ()     => get('/api/calendar/'),
  addCalendarEvent:   (data) => post('/api/calendar/', data),
  deleteCalendarEvent:(id)   => del(`/api/calendar/${id}`),

  // ── Live Polls ─────────────────────────────────────────────────────────────
  getActivePoll:   ()          => get('/api/polls/active'),
  listPolls:       ()          => get('/api/polls/'),
  createPoll:      (data)      => post('/api/polls/', data),
  endPoll:         (id)        => put(`/api/polls/${id}/end`),
  deletePoll:      (id)        => del(`/api/polls/${id}`),
  castVote:        (id, data)  => post(`/api/polls/${id}/vote`, data),
  getMyVote:       (id)        => get(`/api/polls/${id}/my-vote`),
};

export default api;
