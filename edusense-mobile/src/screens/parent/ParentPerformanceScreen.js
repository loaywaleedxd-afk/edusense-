import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getStudentGrades, getStudentEngagement, getAttendance } from '../../api';
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

export default function ParentPerformanceScreen({ user }) {
  const [grades, setGrades]         = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const childId = user.child_id || user.username || 'S001';

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [g, e, a] = await Promise.all([
        getStudentGrades(childId.toUpperCase()).catch(() => []),
        getStudentEngagement(childId.toUpperCase()).catch(() => null),
        getAttendance(childId.toUpperCase()).catch(() => []),
      ]);
      setGrades(g); setEngagement(e); setAttendance(a);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const avgGrade = grades.length ? Math.round(grades.reduce((a, g) => a + g.grade, 0) / grades.length) : null;
  const attended = attendance.filter(r => r.status === 'present').length;
  const attRate  = attendance.length ? Math.round((attended / attendance.length) * 100) : 0;
  const avgEng   = engagement?.emotion_breakdown?.length
    ? Math.round(engagement.emotion_breakdown.reduce((a, e) => a + (e.avg_engagement || 0), 0) / engagement.emotion_breakdown.length)
    : 0;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.sub}>Academic overview · {childId}</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
        <View style={styles.statsGrid}>
          {[
            { icon: '✅', label: 'Attendance', value: `${attRate}%`, color: attRate >= 75 ? C.green : C.red },
            { icon: '🧠', label: 'Engagement', value: `${avgEng}%`, color: C.blue },
            { icon: '📝', label: 'Avg Grade', value: avgGrade != null ? `${avgGrade}%` : '—', color: C.purple },
            { icon: '📚', label: 'Courses', value: grades.length, color: C.amber },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {grades.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Grades by Course</Text>
            {grades.map((g, i) => {
              const lg = letterGrade(g.grade);
              return (
                <View key={i} style={styles.gradeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseName}>{g.course_name || g.course_code}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${g.grade}%`, backgroundColor: lg.c }]} />
                    </View>
                  </View>
                  <View style={[styles.gradeBadge, { backgroundColor: `${lg.c}22` }]}>
                    <Text style={[styles.gradeLetter, { color: lg.c }]}>{lg.l}</Text>
                    <Text style={[styles.gradeNum, { color: lg.c }]}>{g.grade}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No grades available yet.</Text>
          </View>
        )}

        {avgGrade != null && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Overall Assessment</Text>
            {[
              avgGrade >= 85 && '🌟 Excellent academic performance',
              avgGrade >= 70 && avgGrade < 85 && '📈 Good performance with room to improve',
              avgGrade < 70 && '⚠️ Additional support may be needed',
              attRate < 75 && '🚨 Attendance below required threshold',
              avgEng < 50 && '😴 Low classroom engagement detected',
            ].filter(Boolean).map((msg, i) => (
              <Text key={i} style={styles.summaryItem}>{msg}</Text>
            ))}
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, width: '47%', alignItems: 'center' },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.text2, fontWeight: '600' },
  section: { margin: 12, marginTop: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  courseName: { color: C.text2, fontSize: 12, marginBottom: 6 },
  barBg: { height: 8, backgroundColor: C.bg3, borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },
  gradeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 56, marginLeft: 12 },
  gradeLetter: { fontSize: 16, fontWeight: '800' },
  gradeNum: { fontSize: 10, marginTop: 2 },
  summaryCard: { margin: 12, marginTop: 0, backgroundColor: `${C.purple}15`, borderRadius: 14, borderWidth: 1, borderColor: C.purple, padding: 16 },
  summaryTitle: { color: C.purple, fontWeight: '700', fontSize: 14, marginBottom: 10 },
  summaryItem: { color: C.text2, fontSize: 13, marginBottom: 6, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: C.text3, fontSize: 14 },
});
