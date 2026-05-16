import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStudentEngagement, getAttendance, getEmotions } from '../../api';
import { C } from '../../theme';

export default function ParentDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const childId = user.username || 's001';

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [eng, att, emo] = await Promise.all([
        getStudentEngagement(childId),
        getAttendance(childId),
        getEmotions(childId),
      ]);
      setData(eng);
      setAttendance(Array.isArray(att) ? att : []);
      setEmotions(Array.isArray(emo) ? emo : []);
    } catch { setData(null); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const att = data?.attendance || {};
  const attRate = att.total ? Math.round((att.attended / att.total) * 100) : 0;
  const topEmotion = data?.emotion_breakdown?.[0]?.emotion || 'neutral';
  const avgEng = data?.emotion_breakdown?.length
    ? Math.round(data.emotion_breakdown.reduce((a, e) => a + (e.avg_engagement || 0), 0) / data.emotion_breakdown.length)
    : 0;

  const positiveEmotions = ['happy', 'engaged'];
  const positiveCount = emotions.filter(e => positiveEmotions.includes(e.emotion)).length;
  const sentimentPct = emotions.length ? Math.round((positiveCount / emotions.length) * 100) : 0;

  function getSentimentMessage() {
    if (sentimentPct >= 70) return { msg: 'Your child is doing great! 🌟', color: C.green };
    if (sentimentPct >= 50) return { msg: 'Your child is doing okay.', color: C.amber };
    return { msg: 'Your child may need some support.', color: C.red };
  }
  const sentiment = getSentimentMessage();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0d1f12', '#14532d']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Parent View 👨‍👩‍👧</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>Monitoring: {childId}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.green} />}>
          <View style={[styles.sentimentBanner, { backgroundColor: `${sentiment.color}18`, borderColor: sentiment.color }]}>
            <Text style={[styles.sentimentText, { color: sentiment.color }]}>{sentiment.msg}</Text>
            <Text style={styles.sentimentSub}>Based on {emotions.length} emotion records</Text>
          </View>

          <View style={styles.statsGrid}>
            {[
              { icon: '✅', label: 'Attendance', value: `${attRate}%`, color: attRate >= 75 ? C.green : C.red },
              { icon: '🧠', label: 'Engagement', value: `${avgEng}%`, color: C.blue },
              { icon: '😊', label: 'Top Emotion', value: topEmotion, color: C.purple },
              { icon: '❤️', label: 'Positivity', value: `${sentimentPct}%`, color: C.green },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
            {attendance.slice(0, 8).map((r, i) => (
              <View key={i} style={styles.attRecord}>
                <View style={[styles.dot, { backgroundColor: r.status === 'present' ? C.green : C.red }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recTitle}>Lecture {r.lecture_id || i + 1}</Text>
                  <Text style={styles.recSub}>{r.date || '—'}</Text>
                </View>
                <Text style={[styles.recStatus, { color: r.status === 'present' ? C.green : C.red }]}>
                  {r.status === 'present' ? 'Present' : 'Absent'}
                </Text>
              </View>
            ))}
            {attendance.length === 0 && <Text style={styles.emptyText}>No attendance records yet.</Text>}
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
  welcome: { fontSize: 13, color: '#86efac' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginVertical: 2 },
  role: { fontSize: 12, color: '#16a34a' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.red },
  logoutText: { color: C.red, fontSize: 12, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  sentimentBanner: { margin: 12, borderRadius: 12, padding: 16, borderWidth: 1 },
  sentimentText: { fontSize: 16, fontWeight: '700' },
  sentimentSub: { color: C.text3, fontSize: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginTop: 0 },
  statCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, width: '47%', alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.text2, fontWeight: '600' },
  section: { margin: 12, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  attBox: { flexDirection: 'row' },
  attItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  attNum: { fontSize: 26, fontWeight: '800', color: C.green },
  attLabel: { fontSize: 11, color: C.text3, marginTop: 4 },
  attRecord: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recTitle: { color: C.text, fontWeight: '600', fontSize: 13 },
  recSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  recStatus: { fontWeight: '700', fontSize: 12 },
  emptyText: { color: C.text3, textAlign: 'center', fontSize: 13, paddingVertical: 8 },
});
