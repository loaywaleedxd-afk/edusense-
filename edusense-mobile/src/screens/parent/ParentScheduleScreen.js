import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getLectures } from '../../api';
import { C } from '../../theme';

const COLORS = [C.blue, C.purple, C.green, C.amber, C.cyan, C.red];

export default function ParentScheduleScreen({ user }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading]   = useState(true);
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

  const courseMap = {};
  lectures.forEach((l, i) => {
    if (!courseMap[l.course_code]) courseMap[l.course_code] = { ...l, lecs: [], color: COLORS[Object.keys(courseMap).length % COLORS.length] };
    courseMap[l.course_code].lecs.push(l);
  });

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.sub}>Child's course timetable</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.green} />} contentContainerStyle={{ padding: 12 }}>
        {Object.values(courseMap).map((co, i) => (
          <View key={i} style={styles.courseSection}>
            <View style={[styles.courseHeader, { borderLeftColor: co.color, borderLeftWidth: 4 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.courseCode, { color: co.color }]}>{co.course_code}</Text>
                <Text style={styles.courseName}>{co.course_name}</Text>
              </View>
              <Text style={styles.lecCount}>{co.lecs.length} lectures</Text>
            </View>
            {co.lecs.map((lec, j) => {
              const now = new Date();
              const lecDate = lec.date ? new Date(lec.date) : null;
              const status = !lecDate ? 'scheduled'
                : lecDate < now ? 'ended'
                : lecDate.toDateString() === now.toDateString() ? 'live'
                : 'scheduled';
              const statusColor = { live: C.green, ended: C.text3, scheduled: C.blue }[status];
              return (
                <View key={j} style={styles.lecRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lecTitle}>Week {lec.week} · {lec.date || 'TBA'}</Text>
                    <Text style={styles.lecMeta}>🕐 {lec.start_time || '—'} – {lec.end_time || '—'} · 🏫 {lec.room || 'TBA'}</Text>
                    <Text style={styles.lecDoctor}>👤 {lec.doctor || 'TBA'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {status === 'live' ? '● Live' : status === 'ended' ? 'Ended' : 'Upcoming'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
        {lectures.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No lectures scheduled.</Text>
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
  courseSection: { marginBottom: 16 },
  courseHeader: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  courseCode: { fontWeight: '800', fontSize: 14 },
  courseName: { color: C.text, fontWeight: '600', fontSize: 13, marginTop: 2 },
  lecCount: { color: C.text3, fontSize: 11 },
  lecRow: { backgroundColor: C.bg2, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  lecTitle: { color: C.text, fontWeight: '600', fontSize: 13 },
  lecMeta: { color: C.text3, fontSize: 11, marginTop: 3 },
  lecDoctor: { color: C.text3, fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: C.text3, fontSize: 14 },
});
