import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getStudentEngagement } from '../../api';
import { C } from '../../theme';

function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', color: C.green };
  if (score >= 80) return { letter: 'A', color: C.green };
  if (score >= 70) return { letter: 'B', color: C.blue };
  if (score >= 60) return { letter: 'C', color: C.amber };
  if (score >= 50) return { letter: 'D', color: '#f97316' };
  return { letter: 'F', color: C.red };
}

export default function GradesScreen({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getStudentEngagement(user.username || 's001');
      setData(d);
    } catch { setData(null); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const breakdown = data?.emotion_breakdown || [];
  const avgEngage = breakdown.length
    ? Math.round(breakdown.reduce((a, e) => a + (e.avg_engagement || 0), 0) / breakdown.length)
    : 0;
  const att = data?.attendance || {};
  const attRate = att.total ? Math.round((att.attended / att.total) * 100) : 0;
  const overallScore = Math.round(avgEngage * 0.6 + attRate * 0.4);
  const overall = gradeFromScore(overallScore);

  const subjects = [
    { name: 'Mathematics', score: avgEngage > 0 ? Math.min(avgEngage + 8, 100) : 0 },
    { name: 'Physics', score: avgEngage > 0 ? Math.min(avgEngage - 5, 100) : 0 },
    { name: 'Computer Science', score: avgEngage > 0 ? Math.min(avgEngage + 12, 100) : 0 },
    { name: 'English', score: avgEngage > 0 ? Math.min(avgEngage + 3, 100) : 0 },
    { name: 'Chemistry', score: avgEngage > 0 ? Math.max(avgEngage - 10, 0) : 0 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Grades</Text>
        <Text style={styles.sub}>Based on engagement & attendance</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
          <View style={styles.overallCard}>
            <View style={[styles.gradeBubble, { backgroundColor: `${overall.color}22`, borderColor: overall.color }]}>
              <Text style={[styles.gradeLetter, { color: overall.color }]}>{overall.letter}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.overallLabel}>Overall Performance</Text>
              <Text style={styles.overallScore}>{overallScore}%</Text>
              <Text style={styles.overallSub}>Engagement {avgEngage}% · Attendance {attRate}%</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject Grades</Text>
            {subjects.map((subj, i) => {
              const g = gradeFromScore(subj.score);
              return (
                <View key={i} style={styles.subjectRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{subj.name}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${subj.score}%`, backgroundColor: g.color }]} />
                    </View>
                  </View>
                  <Text style={[styles.subjectScore, { color: g.color }]}>{g.letter}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grade Scale</Text>
            {[
              { range: '90-100%', letter: 'A+', color: C.green },
              { range: '80-89%', letter: 'A', color: C.green },
              { range: '70-79%', letter: 'B', color: C.blue },
              { range: '60-69%', letter: 'C', color: C.amber },
              { range: '50-59%', letter: 'D', color: '#f97316' },
              { range: 'Below 50%', letter: 'F', color: C.red },
            ].map((g, i) => (
              <View key={i} style={styles.scaleRow}>
                <Text style={[styles.scaleLetter, { color: g.color }]}>{g.letter}</Text>
                <Text style={styles.scaleRange}>{g.range}</Text>
              </View>
            ))}
          </View>
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
  overallCard: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: C.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.border },
  gradeBubble: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  gradeLetter: { fontSize: 28, fontWeight: '800' },
  overallLabel: { color: C.text2, fontSize: 12, marginBottom: 4 },
  overallScore: { color: C.text, fontSize: 26, fontWeight: '800' },
  overallSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  section: { margin: 12, marginTop: 0, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  subjectName: { color: C.text2, fontSize: 13, marginBottom: 6 },
  barBg: { height: 8, backgroundColor: C.bg3, borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },
  subjectScore: { fontSize: 16, fontWeight: '800', width: 36, textAlign: 'right', marginLeft: 12 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  scaleLetter: { fontSize: 14, fontWeight: '700', width: 36 },
  scaleRange: { color: C.text3, fontSize: 13 },
});
