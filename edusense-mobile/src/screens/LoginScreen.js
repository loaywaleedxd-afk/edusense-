import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../api';
import { C } from '../theme';

const ROLES = [
  { id: 'student',  icon: '🎓', label: 'Student',          sub: 's001 / pass123',             demo: { u: 's001',      p: 'pass123' } },
  { id: 'doctor',   icon: '👨‍🏫', label: 'Doctor / Lecturer', sub: 'dr.smith / pass123',         demo: { u: 'dr.smith',  p: 'pass123' } },
  { id: 'admin',    icon: '🏛️', label: 'Admin',             sub: 'admin / pass123',            demo: { u: 'admin',     p: 'pass123' } },
  { id: 'parent',   icon: '👨‍👩‍👧', label: 'Parent',            sub: 'parent001 / pass123',        demo: { u: 'parent001', p: 'pass123' } },
];

export default function LoginScreen({ onLogin, onResetServer }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function selectRole(role) {
    setSelectedRole(role);
    setUsername(role.demo.u);
    setPassword(role.demo.p);
    setError('');
  }

  async function handleLogin() {
    if (!username.trim()) { setError('Enter username'); return; }
    setLoading(true); setError('');
    try {
      const data = await login(username.trim(), password.trim());
      const user = { ...data.user, role: selectedRole?.id || data.user.role, token: data.token };
      await AsyncStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed. Check your credentials.');
    }
    setLoading(false);
  }

  if (!selectedRole) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.logo}>⚡ EduSense</Text>
          <Text style={styles.subtitle}>Classroom Emotion Detection & Attendance AI</Text>
          <Text style={styles.chooseText}>Choose your role to continue</Text>
          <TouchableOpacity onPress={onResetServer} style={{ marginBottom: 8 }}>
            <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>⚙️ Change server URL</Text>
          </TouchableOpacity>
          <View style={styles.grid}>
            {ROLES.map(r => (
              <TouchableOpacity key={r.id} onPress={() => selectRole(r)} style={styles.roleCard}>
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={styles.roleLabel}>{r.label}</Text>
                <Text style={styles.roleSub}>{r.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <Text style={styles.logo}>⚡ EduSense</Text>
        <View style={styles.loginCard}>
          <Text style={styles.loginIcon}>{selectedRole.icon}</Text>
          <Text style={styles.loginTitle}>{selectedRole.label} Login</Text>

          <Text style={styles.label}>USERNAME</Text>
          <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor={C.text3} autoCapitalize="none" />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholderTextColor={C.text3} secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.loginBtn}>
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.loginBtnGrad}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In →</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSelectedRole(null)} style={styles.back}>
            <Text style={styles.backText}>← Choose different role</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onResetServer} style={styles.back}>
            <Text style={[styles.backText, { color: '#ef4444' }]}>⚙️ Change server URL</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 12, color: C.text2, textAlign: 'center', marginBottom: 8 },
  chooseText: { fontSize: 14, color: C.text2, marginBottom: 24, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  roleCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, width: 155, padding: 20, alignItems: 'center' },
  roleIcon: { fontSize: 36, marginBottom: 8 },
  roleLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  roleSub: { fontSize: 11, color: C.text3, textAlign: 'center' },
  loginCard: { backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border },
  loginIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  loginTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 10, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, marginBottom: 14 },
  error: { color: C.red, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  loginBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  loginBtnGrad: { padding: 14, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  back: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: C.text3, fontSize: 12 },
});
