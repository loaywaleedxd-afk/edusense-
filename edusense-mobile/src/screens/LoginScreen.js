import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { login, checkHealth, getBaseUrl } from '../api';
import { C } from '../theme';

const ROLES = [
  { id: 'student',  icon: '🎓', label: 'Student',          sub: '231014184.0 / WGaub52Z',  demo: { u: '231014184.0', p: 'WGaub52Z'   } },
  { id: 'doctor',   icon: '👨‍🏫', label: 'Doctor / Lecturer', sub: 'dr.ahmed / Ahmed@2024',   demo: { u: 'dr.ahmed',    p: 'Ahmed@2024' } },
  { id: 'admin',    icon: '🏛️', label: 'Admin',             sub: 'admin / admin',           demo: { u: 'admin',       p: 'admin'      } },
  { id: 'parent',   icon: '👨‍👩‍👧', label: 'Parent',            sub: 'parent / parent',         demo: { u: 'parent',      p: 'parent'     } },
];

export default function LoginScreen({ onLogin, onResetServer }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);

  React.useEffect(() => {
    getBaseUrl().then(setServerUrl).catch(() => {});
  }, []);

  function selectRole(role) {
    setSelectedRole(role);
    setUsername(role.demo.u);
    setPassword(role.demo.p);
    setError('');
  }

  async function handleTestConnection() {
    setTesting(true); setError('');
    try {
      await checkHealth();
      setError('✅ Backend connected! Now try logging in.');
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('Network') || msg.includes('timeout') || msg.includes('ECONNREFUSED')) {
        setError(`❌ Cannot reach backend at:\n${serverUrl}\n\nMake sure start_backend.bat is running.`);
      } else {
        setError(`❌ Error: ${msg}`);
      }
    }
    setTesting(false);
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
      if (!e.response) {
        // Network error — backend not reachable
        setError(`❌ Cannot reach backend.\nURL: ${serverUrl}\n\nIs start_backend.bat running?`);
      } else {
        const detail = e.response?.data?.detail || e.response?.data || 'Unknown error';
        setError(`❌ ${detail}\n(HTTP ${e.response?.status})`);
      }
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
          <TouchableOpacity onPress={onResetServer} style={{ marginBottom: 4 }}>
            <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>⚙️ Change server URL</Text>
          </TouchableOpacity>
          {serverUrl ? <Text style={{ color: '#64748b', fontSize: 10, textAlign: 'center', marginBottom: 4 }}>{serverUrl}</Text> : null}
          <TouchableOpacity onPress={handleTestConnection} disabled={testing} style={{ marginBottom: 12, backgroundColor: '#1e293b', borderRadius: 8, padding: 8 }}>
            {testing
              ? <ActivityIndicator size="small" color="#3b82f6" />
              : <Text style={{ color: '#3b82f6', fontSize: 12, textAlign: 'center' }}>🔗 Test Backend Connection</Text>}
          </TouchableOpacity>
          {error ? <Text style={{ color: error.startsWith('✅') ? '#22c55e' : '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</Text> : null}
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

          {error ? <Text style={[styles.error, error.startsWith('✅') && { color: '#22c55e' }]}>{error}</Text> : null}

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
          <TouchableOpacity onPress={handleTestConnection} disabled={testing} style={[styles.back, { marginTop: 4 }]}>
            {testing
              ? <ActivityIndicator size="small" color="#3b82f6" />
              : <Text style={[styles.backText, { color: '#3b82f6' }]}>🔗 Test Backend Connection</Text>}
          </TouchableOpacity>
          {serverUrl ? <Text style={{ color: '#64748b', fontSize: 10, textAlign: 'center' }}>{serverUrl}</Text> : null}
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
