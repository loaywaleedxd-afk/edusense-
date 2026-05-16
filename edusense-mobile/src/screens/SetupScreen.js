import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { checkHealth } from '../api';
import { C } from '../theme';

export default function SetupScreen({ onDone }) {
  const [url, setUrl] = useState('http://192.168.1.1:8000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function connect() {
    setLoading(true); setError('');
    try {
      await AsyncStorage.setItem('backend_url', url.trim());
      await checkHealth();
      onDone();
    } catch {
      setError('Cannot connect. Make sure the backend is running and the IP is correct.');
    }
    setLoading(false);
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <Text style={styles.logo}>⚡ EduSense</Text>
        <Text style={styles.subtitle}>Classroom Emotion & Attendance AI</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Backend Setup</Text>
          <Text style={styles.hint}>
            Start the backend on your PC, then enter your PC's local IP address.{'\n'}
            Find it by running <Text style={styles.code}>ipconfig</Text> on your PC.
          </Text>

          <Text style={styles.label}>Backend URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.x.x:8000"
            placeholderTextColor={C.text3}
            autoCapitalize="none"
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={connect} disabled={loading} style={styles.btn}>
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.btnGrad}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>🔗 Connect to Backend</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.text2, textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border },
  heading: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  hint: { fontSize: 12, color: C.text2, marginBottom: 20, lineHeight: 18 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: C.cyan },
  label: { fontSize: 11, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, marginBottom: 16 },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  btn: { borderRadius: 12, overflow: 'hidden' },
  btnGrad: { padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
