const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function req(path, options = {}) {
  const token = localStorage.getItem('edu_token')
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  // Auth
  login: (creds) => req('/auth/login', { method: 'POST', body: JSON.stringify(creds) }),

  // Students
  getStudents: () => req('/students/'),
  getStudent: (id) => req(`/students/${id}`),
  getStudentEngagement: (id) => req(`/students/${id}/engagement-summary`),

  // Lectures
  getLectures: () => req('/lectures/'),
  getLecture: (id) => req(`/lectures/${id}`),
  getLiveSummary: (id) => req(`/lectures/${id}/live-summary`),
  updateLectureStatus: (id, status) => req(`/lectures/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status })
  }),
  createLecture: (data) => req('/lectures/', { method: 'POST', body: JSON.stringify(data) }),

  // Attendance
  markAttendance: (data) => req('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  getLectureAttendance: (id) => req(`/attendance/lecture/${id}`),
  getStudentAttendance: (id) => req(`/attendance/student/${id}`),
  getAttendanceSummary: (id) => req(`/attendance/summary/${id}`),

  // Emotions
  analyzeFrame: (data) => req('/emotions/analyze-frame', { method: 'POST', body: JSON.stringify(data) }),
  getLectureEmotions: (id) => req(`/emotions/lecture/${id}`),
  getEmotionDistribution: (id) => req(`/emotions/distribution/${id}`),
  getEmotionTrends: (id) => req(`/emotions/trends/${id}`),
  getStudentEmotions: (id) => req(`/emotions/student/${id}`),

  // Analytics
  getEngagementOverview: () => req('/analytics/engagement-overview'),
  getLectureComparison: () => req('/analytics/lecture-comparison'),
  getStudentClusters: () => req('/analytics/student-clusters'),
  getTimeTrends: () => req('/analytics/time-trends'),
  getLowEngagementAlerts: (id, threshold) =>
    req(`/analytics/alerts/low-engagement/${id}?threshold=${threshold}`),
  runRAnalysis: (lectureId) => req(`/analytics/run-r-analysis${lectureId ? `?lecture_id=${lectureId}` : ''}`),
}

export default api
