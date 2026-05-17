import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getLectures, apiClient } from '../../api';
import { C } from '../../theme';

const COLORS = [C.blue, C.purple, C.green, C.amber, C.cyan, C.red];

export default function AdminCoursesScreen() {
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ course_code: '', course_name: '', doctor: '', room: '', week: '1' });
  const [saving, setSaving]       = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const lecs = await getLectures();
      const map = {};
      lecs.forEach(l => {
        if (!map[l.course_code]) map[l.course_code] = { ...l, lectureCount: 0 };
        map[l.course_code].lectureCount++;
      });
      setCourses(Object.values(map));
    } catch { setCourses([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.course_code.trim() || !form.course_name.trim()) { Alert.alert('Error', 'Course code and name are required.'); return; }
    setSaving(true);
    try {
      const c = await apiClient();
      await c.post('/api/lectures/', {
        course_code: form.course_code.trim().toUpperCase(),
        course_name: form.course_name.trim(),
        doctor: form.doctor.trim() || 'TBA',
        room: form.room.trim() || 'TBA',
        week: parseInt(form.week) || 1,
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '11:00',
      });
      setShowAdd(false); setForm({ course_code: '', course_name: '', doctor: '', room: '', week: '1' });
      await load(true);
    } catch { Alert.alert('Error', 'Failed to create course.'); }
    setSaving(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Courses</Text>
        <Text style={styles.sub}>{courses.length} active courses</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{showAdd ? '✕ Cancel' : '+ Add Course'}</Text>
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>New Course / Lecture</Text>
          <TextInput value={form.course_code} onChangeText={v => setForm(p => ({ ...p, course_code: v }))} placeholder="Course Code (e.g. CS301)" placeholderTextColor={C.text3} style={styles.input} autoCapitalize="characters" />
          <TextInput value={form.course_name} onChangeText={v => setForm(p => ({ ...p, course_name: v }))} placeholder="Course Name" placeholderTextColor={C.text3} style={styles.input} />
          <TextInput value={form.doctor} onChangeText={v => setForm(p => ({ ...p, doctor: v }))} placeholder="Lecturer Name" placeholderTextColor={C.text3} style={styles.input} />
          <TextInput value={form.room} onChangeText={v => setForm(p => ({ ...p, room: v }))} placeholder="Room" placeholderTextColor={C.text3} style={styles.input} />
          <TextInput value={form.week} onChangeText={v => setForm(p => ({ ...p, week: v }))} placeholder="Week Number" placeholderTextColor={C.text3} style={styles.input} keyboardType="numeric" />
          <TouchableOpacity onPress={handleAdd} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Create Course</Text>}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.green} />} contentContainerStyle={{ padding: 12 }}>
        {courses.map((co, i) => {
          const color = COLORS[i % COLORS.length];
          return (
            <View key={i} style={[styles.courseCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseCode}>{co.course_code}</Text>
                <Text style={styles.courseName}>{co.course_name}</Text>
                <Text style={styles.courseMeta}>👤 {co.doctor || 'TBA'} · 🏫 {co.room || 'TBA'}</Text>
              </View>
              <View style={[styles.lecCount, { backgroundColor: `${color}22` }]}>
                <Text style={[styles.lecCountNum, { color }]}>{co.lectureCount}</Text>
                <Text style={styles.lecCountLbl}>lecs</Text>
              </View>
            </View>
          );
        })}
        {courses.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No courses yet. Add one above.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.text3, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: { padding: 12, backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  addBtn: { backgroundColor: C.green, borderRadius: 10, padding: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  addForm: { backgroundColor: C.card, margin: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  addFormTitle: { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, color: C.text, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: C.green, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  courseCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  courseCode: { color: C.text2, fontWeight: '800', fontSize: 13, marginBottom: 2 },
  courseName: { color: C.text, fontWeight: '700', fontSize: 15 },
  courseMeta: { color: C.text3, fontSize: 11, marginTop: 4 },
  lecCount: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  lecCountNum: { fontSize: 20, fontWeight: '800' },
  lecCountLbl: { fontSize: 10, color: C.text3 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: C.text3, fontSize: 14 },
});
