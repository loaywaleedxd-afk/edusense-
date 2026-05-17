import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity, Alert } from 'react-native';
import { apiClient } from '../../api';
import { C } from '../../theme';

export default function AdminLecturersScreen() {
  const [lecturers, setLecturers] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ username: '', name: '', email: '' });
  const [saving, setSaving]       = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const c = await apiClient();
      const data = (await c.get('/api/users/?role=doctor')).data;
      setLecturers(Array.isArray(data) ? data : []);
      setFiltered(Array.isArray(data) ? data : []);
    } catch { setLecturers([]); setFiltered([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(lecturers.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.username?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    ));
  }, [search, lecturers]);

  async function handleAdd() {
    if (!form.username.trim() || !form.name.trim()) { Alert.alert('Error', 'Username and name are required.'); return; }
    setSaving(true);
    try {
      const c = await apiClient();
      await c.post('/api/users/', {
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim() || `${form.username.trim()}@university.edu`,
        role: 'doctor',
        password: form.username.trim(),
      });
      setShowAdd(false); setForm({ username: '', name: '', email: '' });
      await load(true);
    } catch {
      Alert.alert('Error', 'Failed to add lecturer. Username may already exist.');
    }
    setSaving(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lecturers</Text>
        <Text style={styles.sub}>{lecturers.length} faculty members</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search lecturers..." placeholderTextColor={C.text3} style={styles.searchInput} />
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{showAdd ? '✕' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>Add Lecturer</Text>
          <TextInput value={form.username} onChangeText={v => setForm(p => ({ ...p, username: v }))} placeholder="Username (e.g. dr.smith)" placeholderTextColor={C.text3} style={styles.input} autoCapitalize="none" />
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Full Name" placeholderTextColor={C.text3} style={styles.input} />
          <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} placeholder="Email (optional)" placeholderTextColor={C.text3} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity onPress={handleAdd} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Add Lecturer</Text>}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
        {filtered.map((l, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(l.name || l.username)?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{l.name || l.username}</Text>
              <Text style={styles.sub2}>{l.username} · {l.email || '—'}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Lecturer</Text>
            </View>
          </View>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No lecturers found.</Text>
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
  toolbar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput: { flex: 1, backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontSize: 14 },
  addBtn: { backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addForm: { backgroundColor: C.card, margin: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  addFormTitle: { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, color: C.text, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: C.purple, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 12, marginBottom: 8, marginTop: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: `${C.purple}33`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: C.purple, fontWeight: '800', fontSize: 17 },
  name: { color: C.text, fontWeight: '700', fontSize: 14 },
  sub2: { color: C.text3, fontSize: 11, marginTop: 2 },
  roleBadge: { backgroundColor: `${C.purple}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  roleText: { color: C.purple, fontWeight: '700', fontSize: 11 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: C.text3, fontSize: 14 },
});
