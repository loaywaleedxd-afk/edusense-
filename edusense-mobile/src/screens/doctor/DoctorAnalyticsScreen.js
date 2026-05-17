import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { getEngagementOverview, getLectureComparison, getAnalytics } from '../../api';
import { C } from '../../theme';

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmotionBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.emotionRow}>
      <Text style={styles.emotionLabel}>{label}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.emotionPct, { color }]}>{pct}%</Text>
    </View>
  );
}

const EMOTION_COLORS = {
  happy: C.green, focused: C.blue, confused: C.amber,
  bored: C.text3, neutral: C.cyan, angry: C.red, sad: '#a78bfa',
};

export default function DoctorAnalyticsScreen({ user }) {
  const [overview, setOverview]     = useState(null);
  const [comparison, setComparison] = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [ov, cmp, an] = await Promise.all([
        getEngagementOverview().catch(() => null),
        getLectureComparison().catch(() => []),
        getAnalytics().catch(() => null),
      ]);
      setOverview(ov); setComparison(Array.isArray(cmp) ? cmp : []); setAnalytics(an);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const emotions = overview?.emotion_distribution || analytics?.emotion_distribution || [];
  const totalEmotions = emotions.reduce((a, e) => a + (e.count || 0), 0);
  const avgEng = analytics?.avg_engagement_rate ?? overview?.avg_engagement ?? 0;
  const avgAtt = analytics?.avg_attendance_rate ?? 0;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.sub}>Classroom insights</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
        {/* Overview stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="👥" label="Students" value={analytics?.total_students ?? '—'} color={C.blue} />
          <StatCard icon="📋" label="Lectures" value={analytics?.total_lectures ?? '—'} color={C.purple} />
          <StatCard icon="✅" label="Attendance" value={`${Math.round(avgAtt)}%`} color={C.green} />
          <StatCard icon="🧠" label="Engagement" value={`${Math.round(avgEng)}%`} color={C.amber} />
        </View>

        {/* Emotion distribution */}
        {emotions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>😊 Emotion Distribution</Text>
            {emotions.map((e, i) => (
              <EmotionBar
                key={i}
                label={e.emotion || e.dominant_emotion || '?'}
                count={e.count || e.student_count || 0}
                total={totalEmotions}
                color={EMOTION_COLORS[e.emotion?.toLowerCase()] || C.blue}
              />
            ))}
          </View>
        )}

        {/* Lecture comparison */}
        {comparison.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Lecture Engagement</Text>
            {comparison.slice(0, 10).map((lec, i) => {
              const eng = Math.round(lec.avg_engagement || 0);
              const color = eng >= 70 ? C.green : eng >= 50 ? C.amber : C.red;
              return (
                <View key={i} style={styles.lecRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lecName}>{lec.course_name || lec.course_code || `Lecture ${lec.lecture_id}`}</Text>
                    <Text style={styles.lecSub}>Week {lec.week} · {lec.students_present || 0} students</Text>
                  </View>
                  <View style={[styles.engBadge, { backgroundColor: `${color}22` }]}>
                    <Text style={[styles.engVal, { color }]}>{eng}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {emotions.length === 0 && comparison.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No analytics data yet.</Text>
            <Text style={styles.emptySub}>Start lectures and have students attend to see data here.</Text>
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
  lecRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  lecName: { color: C.text, fontWeight: '600', fontSize: 13 },
  lecSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  engBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  engVal: { fontSize: 14, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: C.text2, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: C.text3, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
