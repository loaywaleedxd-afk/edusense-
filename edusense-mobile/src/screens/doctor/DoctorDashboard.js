import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAnalytics, getLectures } from '../../api';
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

export default function DoctorDashboard({ user, onLogout }) {
  const [analytics, setAnalytics] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [a, l] = await Promise.all([getAnalytics(), getLectures()]);
      setAnalytics(a);
      setLectures(Array.isArray(l) ? l.slice(0, 5) : []);
    } catch { setAnalytics(null); setLectures([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const totalStudents = analytics?.total_students || 0;
  const avgAttendance = analytics?.avg_attendance_rate ? Math.round(analytics.avg_attendance_rate) : 0;
  const totalLectures = analytics?.total_lectures || 0;
  const dominantEmotion = analytics?.emotion_distribution
    ? Object.entries(analytics.emotion_distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
    : 'neutral';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0533', '#2d1b69']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Lecturer Dashboard 👨‍🏫</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>{user.username}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
          <View style={styles.statsGrid}>
            <StatCard icon="👥" label="Students" value={totalStudents} color={C.blue} />
            <StatCard icon="✅" label="Avg Attendance" value={`${avgAttendance}%`} color={C.green} />
            <StatCard icon="📋" label="Lectures" value={totalLectures} color={C.purple} />
            <StatCard icon="😊" label="Top Emotion" value={dominantEmotion} color={C.amber} />
          </View>

          {analytics?.emotion_distribution && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Class Emotion Distribution</Text>
              {Object.entries(analytics.emotion_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([emotion, count], i) => {
                  const total = Object.values(analytics.emotion_distribution).reduce((a, b) => a + b, 0);
                  return (
                    <View key={i} style={styles.emotionRow}>
                      <Text style={styles.emotionName}>{emotion}</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${Math.round((count / total) * 100)}%`, backgroundColor: C.purple }]} />
                      </View>
                      <Text style={styles.emotionCount}>{count}</Text>
                    </View>
                  );
                })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Lectures</Text>
            {lectures.length === 0 ? (
              <Text style={styles.emptyText}>No lectures found.</Text>
            ) : (
              lectures.map((l, i) => (
                <View key={i} style={styles.lectureRow}>
                  <View style={styles.lectureNum}>
                    <Text style={styles.lectureNumText}>{l.id || i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lectureName}>{l.title || `Lecture ${l.id || i + 1}`}</Text>
                    <Text style={styles.lectureMeta}>{l.date || '—'} · {l.students_count || 0} students</Text>
                  </View>
                  <Text style={[styles.lectureAtt, { color: (l.attendance_rate || 0) >= 75 ? C.green : C.red }]}>
                    {l.attendance_rate ? `${Math.round(l.attendance_rate)}%` : '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  welcome: { fontSize: 13, color: '#a78bfa' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginVertical: 2 },
  role: { fontSize: 12, color: '#7c3aed' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.red },
  logoutText: { color: C.red, fontSize: 12, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, width: '47%', alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.text2, fontWeight: '600' },
  section: { margin: 12, marginTop: 0, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  emotionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emotionName: { color: C.text2, fontSize: 12, width: 72, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 8, backgroundColor: C.bg3, borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, borderRadius: 4 },
  emotionCount: { color: C.text3, fontSize: 11, width: 24, textAlign: 'right' },
  lectureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  lectureNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${C.purple}22`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  lectureNumText: { color: C.purple, fontWeight: '700', fontSize: 13 },
  lectureName: { color: C.text, fontWeight: '600', fontSize: 13 },
  lectureMeta: { color: C.text3, fontSize: 11, marginTop: 2 },
  lectureAtt: { fontSize: 13, fontWeight: '700' },
  emptyText: { color: C.text3, textAlign: 'center', fontSize: 13, paddingVertical: 12 },
});
