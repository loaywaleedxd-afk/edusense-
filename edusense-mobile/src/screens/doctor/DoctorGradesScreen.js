import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { getStudents, getCourseGrades, saveGrade, getLectures } from '../../api';
import { C } from '../../theme';

function letterGrade(g) {
  if (g >= 90) return { l: 'A+', c: C.green };
  if (g >= 85) return { l: 'A',  c: C.green };
  if (g >= 80) return { l: 'B+', c: C.blue };
  if (g >= 75) return { l: 'B',  c: C.blue };
  if (g >= 70) return { l: 'C+', c: C.amber };
  if (g >= 65) return { l: 'C',  c: C.amber };
  if (g >= 60) return { l: 'D',  c: '#f97316' };
  return { l: 'F', c: C.red };
}

export default function DoctorGradesScreen({ user }) {
  const [courses, setCourses]       = useState([]);
  const [students, setStudents]     = useState([]);
  const [grades, setGrades]         = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [tab, setTab]               = useState(0); // 0=enter, 1=results
  const [gradeInputs, setGradeInputs] = useState({});
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saved, setSaved]           = useState('');

  useEffect(() => {
    async function init() {
      try {
        const [lecs, studs] = await Promise.all([getLectures(), getStudents()]);
        const unique = [...new Map(lecs.map(l => [l.course_code, l])).values()];
        setCourses(unique);
        setStudents(studs);
        if (unique.length > 0) setSelectedCourse(unique[0]);
      } catch {}
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    getCourseGrades(selectedCourse.course_code).then(g => {
      setGrades(g);
      const inputs = {};
      g.forEach(gr => { inputs[gr.student_id] = String(gr.grade); });
      setGradeInputs(inputs);
    }).catch(() => setGrades([]));
  }, [selectedCourse]);

  async function handleSaveAll() {
    if (!selectedCourse) return;
    setSaving(true); setSaved('');
    let count = 0;
    for (const [sid, val] of Object.entries(gradeInputs)) {
      const g = parseFloat(val);
      if (!isNaN(g) && g >= 0 && g <= 100) {
        await saveGrade(sid, selectedCourse.course_code, selectedCourse.course_name, g).catch(() => {});
        count++;
      }
    }
    setSaved(`✅ Saved ${count} grades`);
    const updated = await getCourseGrades(selectedCourse.course_code).catch(() => []);
    setGrades(updated);
    setSaving(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>;

  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.grade, 0) / grades.length) : 0;
  const passed = grades.filter(g => g.grade >= 60).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grades</Text>
      </View>

      {/* Course selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseBar} contentContainerStyle={{ padding: 10, gap: 8 }}>
        {courses.map((c, i) => (
          <TouchableOpacity key={i} onPress={() => setSelectedCourse(c)} style={[styles.chip, selectedCourse?.course_code === c.course_code && styles.chipActive]}>
            <Text style={[styles.chipText, selectedCourse?.course_code === c.course_code && styles.chipTextActive]}>{c.course_code}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['Enter Grades', 'Results'].map((t, i) => (
          <TouchableOpacity key={i} onPress={() => setTab(i)} style={[styles.tabBtn, tab === i && styles.tabActive]}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView>
        {tab === 0 && (
          <View style={{ padding: 12 }}>
            {saved ? <Text style={styles.savedMsg}>{saved}</Text> : null}
            {students.slice(0, 50).map((s, i) => {
              const existing = grades.find(g => g.student_id === s.student_id);
              return (
                <View key={i} style={styles.gradeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{s.name || s.student_id}</Text>
                    <Text style={styles.studentId}>{s.student_id}</Text>
                  </View>
                  <TextInput
                    value={gradeInputs[s.student_id] ?? (existing ? String(existing.grade) : '')}
                    onChangeText={v => setGradeInputs(prev => ({ ...prev, [s.student_id]: v }))}
                    placeholder="0-100"
                    placeholderTextColor={C.text3}
                    keyboardType="numeric"
                    style={styles.gradeInput}
                  />
                </View>
              );
            })}
            <TouchableOpacity onPress={handleSaveAll} disabled={saving} style={styles.saveBtn}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Save All Grades</Text>}
            </TouchableOpacity>
          </View>
        )}

        {tab === 1 && (
          <View style={{ padding: 12 }}>
            <View style={styles.statsRow}>
              {[
                { label: 'Graded', value: grades.length, color: C.blue },
                { label: 'Average', value: `${avg}%`, color: C.purple },
                { label: 'Passed', value: passed, color: C.green },
                { label: 'Failed', value: grades.length - passed, color: C.red },
              ].map((s, i) => (
                <View key={i} style={styles.statBox}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLbl}>{s.label}</Text>
                </View>
              ))}
            </View>
            {grades.length === 0 ? (
              <Text style={styles.emptyText}>No grades entered yet.</Text>
            ) : grades.map((g, i) => {
              const lg = letterGrade(g.grade);
              return (
                <View key={i} style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{g.full_name || g.student_id}</Text>
                    <Text style={styles.studentId}>{g.student_id}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${lg.c}22` }]}>
                    <Text style={[styles.badgeLetter, { color: lg.c }]}>{lg.l}</Text>
                    <Text style={[styles.badgeNum, { color: lg.c }]}>{g.grade}%</Text>
                  </View>
                </View>
              );
            })}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  courseBar: { maxHeight: 52, backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.purple, borderColor: C.purple },
  chipText: { color: C.text2, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.purple },
  tabText: { color: C.text3, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: C.purple },
  gradeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  studentName: { color: C.text, fontWeight: '600', fontSize: 13 },
  studentId: { color: C.text3, fontSize: 11, marginTop: 2 },
  gradeInput: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, color: C.text, width: 70, textAlign: 'center', fontSize: 14 },
  saveBtn: { backgroundColor: C.purple, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  savedMsg: { color: C.green, textAlign: 'center', marginBottom: 12, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { color: C.text3, fontSize: 10, marginTop: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 58 },
  badgeLetter: { fontSize: 16, fontWeight: '800' },
  badgeNum: { fontSize: 10, marginTop: 2 },
  emptyText: { color: C.text3, textAlign: 'center', paddingTop: 30, fontSize: 14 },
});
