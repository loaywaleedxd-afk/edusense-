import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getStudentGrades, getStudentEngagement, getAttendance, getLectures } from '../../api';
import { C } from '../../theme';

function letterGrade(pct) {
  if (pct >= 90) return { l: 'A+', c: C.green };
  if (pct >= 85) return { l: 'A',  c: C.green };
  if (pct >= 80) return { l: 'B+', c: C.blue };
  if (pct >= 75) return { l: 'B',  c: C.blue };
  if (pct >= 70) return { l: 'C+', c: C.amber };
  if (pct >= 65) return { l: 'C',  c: C.amber };
  if (pct >= 60) return { l: 'D',  c: '#f97316' };
  return { l: 'F', c: C.red };
}

export default function PerformanceScreen({ user }) {
  const [grades, setGrades]       = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [lectures, setLectures]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sid = user.username?.toUpperCase() || 'S001';

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [g, e, a, l] = await Promise.all([
        getStudentGrades(sid).catch(() => []),
        getStudentEngagement(sid).catch(() => null),
        getAttendance(sid).catch(() => []),
        getLectures().catch(() => []),
      ]);
      setGrades(g); setEngagement(e); setAttendance(a); setLectures(l);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const att = engagement?.attendance || {};
  const attRate = att.total ? Math.round((att.attended / att.total) * 100) : 0;
  const avgEng  = engagement?.emotion_breakdown?.length
    ? Math.round(engagement.emotion_breakdown.reduce((a, e) => a + (e.avg_engagement || 0), 0) / engagement.emotion_breakdown.length)
    : 0;

  // Build course performance from lectures + attendance + grades
  const courseMap = {};
  lectures.forEach(l => {
    if (!courseMap[l.course_code]) courseMap[l.course_code] = { name: l.course_name, code: l.course_code, total: 0, attended: 0 };
    courseMap[l.course_code].total++;
    if (attendance.find(a => a.lecture_id === l.lecture_id && a.status === 'present')) courseMap[l.course_code].attended++;
  });
  grades.forEach(g => {
    if (courseMap[g.course_code]) courseMap[g.course_code].grade = g.grade;
    else courseMap[g.course_code] = { name: g.course_name, code: g.course_code, total: 0, attended: 0, grade: g.grade };
  });
  const courses = Object.values(courseMap);

  const avgGrade = grades.length ? Math.round(grades.reduce((a, g) => a + g.grade, 0) / grades.length) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.sub}>Academic overview</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { icon: '✅', label: 'Attendance', value: `${attRate}%`, color: attRate >= 75 ? C.green : C.red },
              { icon: '🧠', label: 'Engagement', value: `${avgEng}%`, color: C.blue },
              { icon: '📝', label: 'Avg Grade', value: avgGrade != null ? `${avgGrade}%` : '—', color: C.purple },
              { icon: '📚', label: 'Courses', value: courses.length, color: C.amber },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Per Course */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance per Course</Text>
            {courses.length === 0 ? (
              <Text style={styles.emptyText}>No course data yet.</Text>
            ) : (
              courses.map((co, i) => {
                const coAtt = co.total ? Math.round((co.attended / co.total) * 100) : 0;
                const g = co.grade != null ? letterGrade(co.grade) : null;
                return (
                  <View key={i} style={styles.courseRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseName}>{co.name || co.code}</Text>
                      <Text style={styles.courseCode}>{co.code}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaChip}>Att {coAtt}%</Text>
                        <Text style={styles.metaChip}>Eng {avgEng}%</Text>
                      </View>
                    </View>
                    {g ? (
                      <View style={[styles.gradeBadge, { backgroundColor: `${g.c}22` }]}>
                        <Text style={[styles.gradeLetter, { color: g.c }]}>{g.l}</Text>
                        <Text style={[styles.gradeNum, { color: g.c }]}>{co.grade}%</Text>
                      </View>
                    ) : (
                      <View style={[styles.gradeBadge, { backgroundColor: `${C.text3}22` }]}>
                        <Text style={[styles.gradeLetter, { color: C.text3 }]}>—</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* Grades list */}
          {grades.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Grades</Text>
              {grades.map((g, i) => {
                const lg = letterGrade(g.grade);
                return (
                  <View key={i} style={styles.gradeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gradeCourse}>{g.course_name || g.course_code}</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${g.grade}%`, backgroundColor: lg.c }]} />
                      </View>
                    </View>
                    <Text style={[styles.gradeVal, { color: lg.c }]}>{lg.l} · {g.grade}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.text3, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, width: '47%', alignItems: 'center' },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.text2, fontWeight: '600' },
  section: { margin: 12, marginTop: 0, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  courseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  courseName: { color: C.text, fontWeight: '600', fontSize: 13 },
  courseCode: { color: C.text3, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaChip: { backgroundColor: C.bg3, color: C.text2, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gradeBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  gradeLetter: { fontSize: 18, fontWeight: '800' },
  gradeNum: { fontSize: 10, marginTop: 2 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  gradeCourse: { color: C.text2, fontSize: 12, marginBottom: 6 },
  barBg: { height: 8, backgroundColor: C.bg3, borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },
  gradeVal: { fontSize: 13, fontWeight: '700', marginLeft: 12, minWidth: 80, textAlign: 'right' },
  emptyText: { color: C.text3, textAlign: 'center', fontSize: 13, paddingVertical: 8 },
});
