import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getAnalytics, getEngagementOverview, getLectureComparison, getStudents } from '../../api';
import { C } from '../../theme';

const EMOTION_COLORS = {
  happy: C.green, focused: C.blue, confused: C.amber,
  bored: C.text3, neutral: C.cyan, angry: C.red, sad: '#a78bfa',
};

export default function AdminAnalyticsScreen() {
  const [analytics, setAnalytics]   = useState(null);
  const [overview, setOverview]     = useState(null);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [an, ov, studs] = await Promise.all([
        getAnalytics().catch(() => null),
        getEngagementOverview().catch(() => null),
        getStudents().catch(() => []),
      ]);
      setAnalytics(an); setOverview(ov); setStudents(studs);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const emotions = analytics?.emotion_distribution || overview?.emotion_distribution || [];
  const totalEmotions = emotions.reduce((a, e) => a + (e.count || 0), 0);
  const atRisk = students.filter(s => (s.attendance_rate ?? 0) < 75 && (s.attendance_rate ?? 0) > 0).length;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.sub}>System-wide overview</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
        <View style={styles.statsGrid}>
          {[
            { icon: '👥', label: 'Students', value: analytics?.total_students ?? students.length, color: C.blue },
            { icon: '📋', label: 'Lectures', value: analytics?.total_lectures ?? '—', color: C.purple },
            { icon: '✅', label: 'Avg Attendance', value: `${Math.round(analytics?.avg_attendance_rate ?? 0)}%`, color: C.green },
            { icon: '🧠', label: 'Avg Engagement', value: `${Math.round(analytics?.avg_engagement_rate ?? 0)}%`, color: C.amber },
            { icon: '⚠️', label: 'At Risk', value: atRisk, color: C.red },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {emotions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>😊 Emotion Distribution</Text>
            {emotions.map((e, i) => {
              const pct = totalEmotions > 0 ? Math.round(((e.count || 0) / totalEmotions) * 100) : 0;
              const color = EMOTION_COLORS[e.emotion?.toLowerCase()] || C.blue;
              return (
                <View key={i} style={styles.emotionRow}>
                  <Text style={styles.emotionLabel}>{e.emotion}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.emotionPct, { color }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Attendance distribution */}
        {students.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Attendance Distribution</Text>
            {[
              { label: '≥75% (Good)', count: students.filter(s => (s.attendance_rate ?? 0) >= 75).length, color: C.green },
              { label: '50–74% (Warning)', count: students.filter(s => (s.attendance_rate ?? 0) >= 50 && (s.attendance_rate ?? 0) < 75).length, color: C.amber },
              { label: '<50% (At Risk)', count: students.filter(s => (s.attendance_rate ?? 0) > 0 && (s.attendance_rate ?? 0) < 50).length, color: C.red },
              { label: 'No Data', count: students.filter(s => (s.attendance_rate ?? 0) === 0).length, color: C.text3 },
            ].map((row, i) => (
              <View key={i} style={styles.distRow}>
                <Text style={styles.distLabel}>{row.label}</Text>
                <View style={[styles.distBadge, { backgroundColor: `${row.color}22` }]}>
                  <Text style={[styles.distCount, { color: row.color }]}>{row.count}</Text>
                </View>
              </View>
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
  section: { margin: 12, marginTop: 0, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  emotionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emotionLabel: { color: C.text2, fontSize: 12, width: 72, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 8, backgroundColor: C.bg3, borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, borderRadius: 4 },
  emotionPct: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  distRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  distLabel: { color: C.text2, fontSize: 13 },
  distBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  distCount: { fontWeight: '800', fontSize: 14 },
});
