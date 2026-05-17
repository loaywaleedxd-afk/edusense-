import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getLectures } from '../../api';
import { C } from '../../theme';

const COURSE_COLORS = ['#3b82f6','#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899'];

export default function ScheduleScreen({ user }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getLectures();
      setLectures(Array.isArray(data) ? data : []);
    } catch { setLectures([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  function statusColor(status) {
    if (status === 'ended') return C.text3;
    if (status === 'active') return C.green;
    return C.blue;
  }

  function statusLabel(status) {
    if (status === 'ended') return 'Ended';
    if (status === 'active') return '● Live';
    return 'Scheduled';
  }

  const grouped = lectures.reduce((acc, l) => {
    const key = l.course_name || 'Unknown';
    if (!acc[key]) acc[key] = { color: COURSE_COLORS[Object.keys(acc).length % COURSE_COLORS.length], items: [] };
    acc[key].items.push(l);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <Text style={styles.sub}>{lectures.length} lectures total</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No schedule available yet.</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([courseName, { color, items }]) => (
              <View key={courseName} style={styles.courseSection}>
                <View style={[styles.courseHeader, { borderLeftColor: color }]}>
                  <Text style={[styles.courseName, { color }]}>{courseName}</Text>
                  <Text style={styles.courseCode}>{items[0]?.course_code || ''}</Text>
                </View>
                {items.map((l, i) => (
                  <View key={i} style={styles.lectureRow}>
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lectureDate}>{l.scheduled_at ? l.scheduled_at.split(' ')[0] : '—'}</Text>
                      <Text style={styles.lectureRoom}>Room: {l.room || '—'} · {l.duration_min || 90} min</Text>
                      {l.doctor_name && <Text style={styles.lectureDoctor}>👨‍🏫 {l.doctor_name}</Text>}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor(l.status)}22` }]}>
                      <Text style={[styles.statusText, { color: statusColor(l.status) }]}>
                        {statusLabel(l.status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
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
  courseSection: { margin: 12, marginBottom: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  courseHeader: { padding: 14, borderLeftWidth: 4, backgroundColor: C.bg2 },
  courseName: { fontSize: 15, fontWeight: '800' },
  courseCode: { color: C.text3, fontSize: 11, marginTop: 2 },
  lectureRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: C.border },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  lectureDate: { color: C.text, fontWeight: '600', fontSize: 13 },
  lectureRoom: { color: C.text3, fontSize: 11, marginTop: 2 },
  lectureDoctor: { color: C.text2, fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.text2, fontSize: 15, fontWeight: '600' },
});
