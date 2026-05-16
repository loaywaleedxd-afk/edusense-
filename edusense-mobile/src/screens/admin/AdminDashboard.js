import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAnalytics, getStudents } from '../../api';
import { C } from '../../theme';

function BigStat({ icon, label, value, color }) {
  return (
    <View style={[styles.bigStat, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={styles.bigStatIcon}>{icon}</Text>
      <View>
        <Text style={[styles.bigStatValue, { color }]}>{value}</Text>
        <Text style={styles.bigStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [a, s] = await Promise.all([getAnalytics(), getStudents()]);
      setAnalytics(a);
      setStudents(Array.isArray(s) ? s : []);
    } catch { setAnalytics(null); setStudents([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const atRisk = students.filter(s => s.attendance_rate != null && s.attendance_rate < 75).length;
  const avgAtt = analytics?.avg_attendance_rate ? Math.round(analytics.avg_attendance_rate) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0c1a2e', '#0f3460']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Admin Panel 🏛️</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>{user.username} · Administrator</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.cyan} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.cyan} />}>
          <View style={styles.statsGrid}>
            <BigStat icon="👥" label="Total Students" value={analytics?.total_students || students.length} color={C.blue} />
            <BigStat icon="📋" label="Total Lectures" value={analytics?.total_lectures || 0} color={C.purple} />
            <BigStat icon="✅" label="Avg Attendance" value={`${avgAtt}%`} color={C.green} />
            <BigStat icon="⚠️" label="At-Risk Students" value={atRisk} color={C.red} />
          </View>

          {analytics?.emotion_distribution && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Platform Emotion Distribution</Text>
              {Object.entries(analytics.emotion_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([emotion, count], i) => {
                  const total = Object.values(analytics.emotion_distribution).reduce((a, b) => a + b, 0);
                  return (
                    <View key={i} style={styles.emotionRow}>
                      <Text style={styles.emotionName}>{emotion}</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, {
                          width: `${Math.round((count / total) * 100)}%`,
                          backgroundColor: C.cyan,
                        }]} />
                      </View>
                      <Text style={styles.emotionPct}>{Math.round((count / total) * 100)}%</Text>
                    </View>
                  );
                })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>At-Risk Students ({atRisk})</Text>
            {students.filter(s => s.attendance_rate != null && s.attendance_rate < 75).slice(0, 10).map((s, i) => (
              <View key={i} style={styles.riskRow}>
                <View style={styles.riskAvatar}>
                  <Text style={styles.riskAvatarText}>{(s.name || 'S')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskName}>{s.name || s.student_id}</Text>
                  <Text style={styles.riskId}>{s.student_id}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: `${C.red}22` }]}>
                  <Text style={[styles.riskRate, { color: C.red }]}>
                    {Math.round(s.attendance_rate)}%
                  </Text>
                </View>
              </View>
            ))}
            {atRisk === 0 && <Text style={styles.emptyText}>No at-risk students. All students are on track! ✅</Text>}
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
  welcome: { fontSize: 13, color: '#67e8f9' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginVertical: 2 },
  role: { fontSize: 12, color: '#0891b2' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.red },
  logoutText: { color: C.red, fontSize: 12, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  statsGrid: { padding: 12, gap: 10 },
  bigStat: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 0, gap: 14 },
  bigStatIcon: { fontSize: 28 },
  bigStatValue: { fontSize: 24, fontWeight: '800' },
  bigStatLabel: { color: C.text2, fontSize: 12 },
  section: { margin: 12, marginTop: 0, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  emotionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emotionName: { color: C.text2, fontSize: 12, width: 72, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 8, backgroundColor: C.bg3, borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, borderRadius: 4 },
  emotionPct: { color: C.cyan, fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  riskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  riskAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.red}22`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  riskAvatarText: { color: C.red, fontWeight: '800', fontSize: 15 },
  riskName: { color: C.text, fontWeight: '600', fontSize: 13 },
  riskId: { color: C.text3, fontSize: 11, marginTop: 1 },
  riskBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  riskRate: { fontWeight: '800', fontSize: 14 },
  emptyText: { color: C.text3, textAlign: 'center', fontSize: 13, paddingVertical: 8 },
});
