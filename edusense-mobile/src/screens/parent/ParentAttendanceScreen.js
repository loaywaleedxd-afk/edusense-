import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getAttendance } from '../../api';
import { C } from '../../theme';

export default function ParentAttendanceScreen({ user }) {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const childId = user.child_id || user.username || 'S001';

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getAttendance(childId.toUpperCase());
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const attended = records.filter(r => r.status === 'present').length;
  const total    = records.length;
  const rate     = total ? Math.round((attended / total) * 100) : 0;
  const color    = rate >= 75 ? C.green : rate >= 60 ? C.amber : C.red;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.sub}>Child ID: {childId}</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.green} />}>
        <View style={[styles.rateCard, { borderColor: color }]}>
          <Text style={[styles.rateNum, { color }]}>{rate}%</Text>
          <Text style={styles.rateLbl}>Overall Attendance Rate</Text>
          {rate < 75 && (
            <Text style={[styles.warning, { color }]}>
              {rate < 60 ? '🚨 Critical — immediate action required' : '⚠️ Below minimum threshold (75%)'}
            </Text>
          )}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Attended', value: attended, color: C.green },
            { label: 'Missed', value: total - attended, color: C.red },
            { label: 'Total', value: total, color: C.blue },
          ].map((s, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Records</Text>
          {records.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records found.</Text>
          ) : records.map((r, i) => (
            <View key={i} style={styles.record}>
              <View style={[styles.dot, { backgroundColor: r.status === 'present' ? C.green : C.red }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>{r.course_name || `Lecture ${r.lecture_id}`}</Text>
                <Text style={styles.recSub}>{r.check_in_time?.split(' ')[0] || r.date || '—'} · {r.method || 'manual'}</Text>
              </View>
              <Text style={[styles.recStatus, { color: r.status === 'present' ? C.green : C.red }]}>
                {r.status === 'present' ? '✅ Present' : '❌ Absent'}
              </Text>
            </View>
          ))}
        </View>
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
  rateCard: { margin: 16, borderRadius: 16, borderWidth: 2, padding: 24, backgroundColor: C.card, alignItems: 'center' },
  rateNum: { fontSize: 56, fontWeight: '900' },
  rateLbl: { color: C.text2, fontSize: 14, marginTop: 4 },
  warning: { fontSize: 13, marginTop: 10, fontWeight: '600', textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { color: C.text3, fontSize: 10, marginTop: 2 },
  section: { margin: 16, marginTop: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  record: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recTitle: { color: C.text, fontWeight: '600', fontSize: 13 },
  recSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  recStatus: { fontSize: 12, fontWeight: '700' },
  emptyText: { color: C.text3, textAlign: 'center', paddingVertical: 20 },
});
