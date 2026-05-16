import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getLectures } from '../../api';
import { C } from '../../theme';

export default function DoctorLecturesScreen({ user }) {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lectures</Text>
        <Text style={styles.sub}>{lectures.length} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
          {lectures.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No lectures found.</Text>
            </View>
          ) : (
            lectures.map((l, i) => {
              const rate = l.attendance_rate != null ? Math.round(l.attendance_rate) : null;
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.numBadge}>
                    <Text style={styles.numText}>{l.id || i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lectureName}>{l.title || `Lecture ${l.id || i + 1}`}</Text>
                    <Text style={styles.lectureDate}>{l.date || '—'}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaChip}>👥 {l.students_count || 0} students</Text>
                      {l.topic && <Text style={styles.metaChip}>📌 {l.topic}</Text>}
                    </View>
                  </View>
                  {rate != null && (
                    <View style={[styles.rateBadge, { backgroundColor: rate >= 75 ? `${C.green}22` : `${C.red}22` }]}>
                      <Text style={[styles.rateText, { color: rate >= 75 ? C.green : C.red }]}>{rate}%</Text>
                    </View>
                  )}
                </View>
              );
            })
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
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  numBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.purple}22`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  numText: { color: C.purple, fontWeight: '800', fontSize: 14 },
  lectureName: { color: C.text, fontWeight: '700', fontSize: 14 },
  lectureDate: { color: C.text3, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  metaChip: { backgroundColor: C.bg3, color: C.text2, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rateBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },
  rateText: { fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.text2, fontSize: 15, fontWeight: '600' },
});
