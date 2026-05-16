import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStudentEngagement } from '../../api';
import { C } from '../../theme';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const engagement = await getStudentEngagement(user.username || 's001');
      setData(engagement);
    } catch { setData(null); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const att = data?.attendance || {};
  const attRate = att.total ? Math.round((att.attended / att.total) * 100) : 0;
  const topEmotion = data?.emotion_breakdown?.[0]?.emotion || 'neutral';
  const avgEng = data?.emotion_breakdown?.reduce((a, e) => a + (e.avg_engagement || 0), 0) / (data?.emotion_breakdown?.length || 1);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Welcome back 👋</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>{user.role} · {user.username}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}
        >
          <View style={styles.statsGrid}>
            <StatCard icon="✅" label="Attendance" value={`${attRate}%`} sub={`${att.attended||0}/${att.total||0} lectures`} color={C.green} />
            <StatCard icon="🧠" label="Engagement" value={`${Math.round(avgEng || 0)}%`} sub="Average score" color={C.blue} />
            <StatCard icon="😊" label="Top Emotion" value={topEmotion} sub="Most frequent" color={C.purple} />
            <StatCard icon="📚" label="Records" value={data?.emotion_breakdown?.reduce((a,e)=>a+e.emotion_count,0)||0} sub="Emotion records" color={C.amber} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
            {(data?.emotion_breakdown || []).map((e, i) => (
              <View key={i} style={styles.emotionRow}>
                <Text style={styles.emotionName}>{e.emotion}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${Math.min(e.emotion_count * 10, 100)}%`, backgroundColor: C.blue }]} />
                </View>
                <Text style={styles.emotionCount}>{e.emotion_count}</Text>
              </View>
            ))}
            {!data?.emotion_breakdown?.length && (
              <Text style={styles.empty}>No emotion data yet. Attend a live lecture to start tracking.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance Summary</Text>
            <View style={styles.attBox}>
              <View style={styles.attItem}>
                <Text style={styles.attNum}>{att.attended || 0}</Text>
                <Text style={styles.attLabel}>Attended</Text>
              </View>
              <View style={[styles.attItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border }]}>
                <Text style={[styles.attNum, { color: C.red }]}>{(att.total || 0) - (att.attended || 0)}</Text>
                <Text style={styles.attLabel}>Missed</Text>
              </View>
              <View style={styles.attItem}>
                <Text style={styles.attNum}>{att.total || 0}</Text>
                <Text style={styles.attLabel}>Total</Text>
              </View>
            </View>
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
  welcome: { fontSize: 13, color: C.text2 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginVertical: 2 },
  role: { fontSize: 12, color: C.text3 },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.red },
  logoutText: { color: C.red, fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, width: '47%', alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.text2, fontWeight: '600' },
  statSub: { fontSize: 10, color: C.text3, marginTop: 2 },
  section: { margin: 12, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  emotionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emotionName: { color: C.text2, fontSize: 12, width: 72, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 8, backgroundColor: C.bg3, borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, borderRadius: 4 },
  emotionCount: { color: C.text3, fontSize: 11, width: 24, textAlign: 'right' },
  empty: { color: C.text3, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  attBox: { flexDirection: 'row' },
  attItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  attNum: { fontSize: 28, fontWeight: '800', color: C.green },
  attLabel: { fontSize: 11, color: C.text3, marginTop: 4 },
});
