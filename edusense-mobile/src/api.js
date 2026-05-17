import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getBaseUrl() {
  const saved = await AsyncStorage.getItem('backend_url');
  return saved || 'http://192.168.1.1:8000';
}

export async function apiClient() {
  const base = await getBaseUrl();
  return axios.create({ baseURL: base, timeout: 10000 });
}

// Auth
export async function login(username, password) {
  const c = await apiClient();
  return (await c.post('/api/auth/login', { username, password })).data;
}

// Students
export async function getStudents() {
  const c = await apiClient();
  return (await c.get('/api/students/')).data;
}
export async function getStudent(id) {
  const c = await apiClient();
  return (await c.get(`/api/students/${id}`)).data;
}
export async function getStudentEngagement(id) {
  const c = await apiClient();
  return (await c.get(`/api/students/${id}/engagement-summary`)).data;
}

// Lectures / Schedule
export async function getLectures() {
  const c = await apiClient();
  return (await c.get('/api/lectures/')).data;
}

// Attendance
export async function getAttendance(studentId) {
  const c = await apiClient();
  return (await c.get(`/api/attendance/student/${studentId}`)).data;
}
export async function markAttendance(studentId, lectureId, method = 'qr') {
  const c = await apiClient();
  return (await c.post('/api/attendance/mark', {
    student_id: studentId, lecture_id: lectureId,
    status: 'present', method,
  })).data;
}
export async function submitExcuse(studentId, courseCode, week, reason) {
  const c = await apiClient();
  return (await c.post('/api/excuses/', { student_id: studentId, course_code: courseCode, week, reason })).data;
}
export async function getExcuses(studentId) {
  const c = await apiClient();
  return (await c.get(`/api/excuses/student/${studentId}`)).data;
}

// Emotions
export async function getEmotions(studentId) {
  const c = await apiClient();
  return (await c.get(`/api/emotions/student/${studentId}`)).data;
}

// Analytics
export async function getAnalytics() {
  const c = await apiClient();
  return (await c.get('/api/analytics')).data;
}
export async function getEngagementOverview() {
  const c = await apiClient();
  return (await c.get('/api/analytics/engagement-overview')).data;
}
export async function getLectureComparison() {
  const c = await apiClient();
  return (await c.get('/api/analytics/lecture-comparison')).data;
}

// Grades
export async function getStudentGrades(studentId) {
  const c = await apiClient();
  return (await c.get(`/api/grades/student/${studentId}`)).data;
}
export async function getCourseGrades(courseCode) {
  const c = await apiClient();
  return (await c.get(`/api/grades/course/${courseCode}`)).data;
}
export async function saveGrade(studentId, courseCode, courseName, grade) {
  const c = await apiClient();
  return (await c.post('/api/grades/', { student_id: studentId, course_code: courseCode, course_name: courseName, grade })).data;
}

// Messages
export async function getMessages(courseCode = 'general') {
  const c = await apiClient();
  return (await c.get(`/api/messages/?course_code=${courseCode}`)).data;
}
export async function sendMessage(courseCode, senderId, senderName, senderRole, text) {
  const c = await apiClient();
  return (await c.post('/api/messages/', { course_code: courseCode, sender_id: senderId, sender_name: senderName, sender_role: senderRole, text })).data;
}

// Health
export async function checkHealth() {
  const c = await apiClient();
  return (await c.get('/api/health')).data;
}
