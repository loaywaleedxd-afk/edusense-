import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { getStudents, apiClient } from '../../api';
import { C } from '../../theme';

export default function AdminStudentsScreen() {
  const [students, setStudents]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [newName, setNewName]     = useState('');
  const [newId, setNewId]         = useState('');
  const [newEmail, setNewEmail]   = useState('');
  const [saving, setSaving]       = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data); setFiltered(data);
    } catch { setStudents([]); setFiltered([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    ));
  }, [search, students]);

  async function handleAddStudent() {
    if (!newId.trim() || !newName.trim()) { Alert.alert('Error', 'ID and Name are required.'); return; }
    setSaving(true);
    try {
      const c = await apiClient();
      await c.post('/api/students/', {
        student_id: newId.trim().toUpperCase(),
        name: newName.trim(),
        email: newEmail.trim() || `${newId.trim().toLowerCase()}@university.edu`,
        password: newId.trim().toLowerCase(),
      });
      setShowAdd(false); setNewName(''); setNewId(''); setNewEmail('');
      await load(true);
    } catch {
      Alert.alert('Error', 'Failed to add student. The student ID may already exist.');
    }
    setSaving(false);
  }

  const total = students.length;
  const active = students.filter(s => (s.attendance_rate ?? 0) > 0).length;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.sub}>{total} enrolled · {active} active</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or ID..."
          placeholderTextColor={C.text3}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{showAdd ? '✕' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>Add New Student</Text>
          <TextInput value={newId} onChangeText={setNewId} placeholder="Student ID (e.g. S295)" placeholderTextColor={C.text3} style={styles.input} autoCapitalize="characters" />
          <TextInput value={newName} onChangeText={setNewName} placeholder="Full Name" placeholderTextColor={C.text3} style={styles.input} />
          <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="Email (optional)" placeholderTextColor={C.text3} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity onPress={handleAddStudent} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Student</Text>}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
        <Text style={styles.countLabel}>Showing {filtered.length} students</Text>
        {filtered.map((s, i) => {
          const rate = Math.round(s.attendance_rate ?? 0);
          const color = rate >= 75 ? C.green : rate >= 50 ? C.amber : rate > 0 ? C.red : C.text3;
          return (
            <View key={i} style={styles.studentCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(s.name || s.student_id)?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{s.name || s.student_id}</Text>
                <Text style={styles.studentId}>{s.student_id} · {s.email || '—'}</Text>
              </View>
              <View style={[styles.rateBadge, { backgroundColor: `${color}22` }]}>
                <Text style={[styles.rateText, { color }]}>{rate}%</Text>
              </View>
            </View>
          );
        })}
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
  toolbar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput: { flex: 1, backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontSize: 14 },
  addBtn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addForm: { backgroundColor: C.card, margin: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  addFormTitle: { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, color: C.text, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: C.blue, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  countLabel: { color: C.text3, fontSize: 11, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${C.blue}33`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: C.blue, fontWeight: '800', fontSize: 16 },
  studentName: { color: C.text, fontWeight: '600', fontSize: 13 },
  studentId: { color: C.text3, fontSize: 11, marginTop: 2 },
  rateBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  rateText: { fontWeight: '700', fontSize: 12 },
});
