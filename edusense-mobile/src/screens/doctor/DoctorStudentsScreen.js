import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { getStudents } from '../../api';
import { C } from '../../theme';
import StudentAvatar from '../../components/StudentAvatar';

export default function DoctorStudentsScreen({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch { setStudents([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = students.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  function attColor(rate) {
    if (!rate && rate !== 0) return C.text3;
    if (rate >= 75) return C.green;
    if (rate >= 60) return C.amber;
    return C.red;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.sub}>{students.length} enrolled</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or ID..."
          placeholderTextColor={C.text3}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>{search ? 'No students match your search.' : 'No students found.'}</Text>
            </View>
          ) : (
            filtered.map((s, i) => {
              const rate = s.attendance_rate != null ? Math.round(s.attendance_rate) : null;
              return (
                <View key={i} style={styles.card}>
                  <StudentAvatar studentId={s.student_id} name={s.name} size={44} bgColor={C.purple} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{s.name || s.student_id}</Text>
                    <Text style={styles.studentId}>{s.student_id} · {s.email || 'no email'}</Text>
                    <Text style={styles.studentCourse}>{s.course || s.department || '—'}</Text>
                  </View>
                  <View style={styles.rateBox}>
                    <Text style={[styles.rateText, { color: attColor(rate) }]}>
                      {rate != null ? `${rate}%` : '—'}
                    </Text>
                    <Text style={styles.rateLabel}>Att.</Text>
                  </View>
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
  searchBox: { padding: 12 },
  searchInput: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  studentName: { color: C.text, fontWeight: '700', fontSize: 14 },
  studentId: { color: C.text3, fontSize: 11, marginTop: 2 },
  studentCourse: { color: C.text2, fontSize: 11, marginTop: 2 },
  rateBox: { alignItems: 'center' },
  rateText: { fontSize: 16, fontWeight: '800' },
  rateLabel: { color: C.text3, fontSize: 10 },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.text2, fontSize: 15, fontWeight: '600' },
});
