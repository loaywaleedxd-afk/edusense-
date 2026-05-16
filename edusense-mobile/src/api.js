import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getBaseUrl() {
  const saved = await AsyncStorage.getItem('backend_url');
  return saved || 'http://192.168.1.1:8000';
}

export async function apiClient() {
  const base = await getBaseUrl();
  return axios.create({ baseURL: base, timeout: 8000 });
}

export async function login(username, password) {
  const client = await apiClient();
  const res = await client.post('/api/auth/login', { username, password });
  return res.data;
}

export async function getStudents() {
  const client = await apiClient();
  const res = await client.get('/api/students');
  return res.data;
}

export async function getStudent(studentId) {
  const client = await apiClient();
  const res = await client.get(`/api/students/${studentId}`);
  return res.data;
}

export async function getStudentEngagement(studentId) {
  const client = await apiClient();
  const res = await client.get(`/api/students/${studentId}/engagement-summary`);
  return res.data;
}

export async function getLectures() {
  const client = await apiClient();
  const res = await client.get('/api/lectures');
  return res.data;
}

export async function getAttendance(studentId) {
  const client = await apiClient();
  const res = await client.get(`/api/attendance?student_id=${studentId}`);
  return res.data;
}

export async function getAnalytics() {
  const client = await apiClient();
  const res = await client.get('/api/analytics');
  return res.data;
}

export async function getEmotions(studentId) {
  const client = await apiClient();
  const res = await client.get(`/api/emotions?student_id=${studentId}`);
  return res.data;
}

export async function checkHealth() {
  const client = await apiClient();
  const res = await client.get('/api/health');
  return res.data;
}
