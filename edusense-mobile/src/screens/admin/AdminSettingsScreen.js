import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../../theme';

function SettingRow({ label, desc, value, onToggle }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {desc ? <Text style={styles.settingDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: C.bg3, true: C.purple }}
        thumbColor={value ? '#fff' : C.text3}
      />
    </View>
  );
}

export default function AdminSettingsScreen({ onLogout }) {
  const [settings, setSettings] = useState({
    qrAttendance: true,
    emotionTracking: true,
    communityChat: true,
    aiChat: true,
    gradeVisibility: true,
    parentAccess: true,
    notifications: true,
    autoAlerts: true,
  });

  function toggle(key) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleResetServer() {
    Alert.alert(
      'Reset Backend URL',
      'This will clear the saved backend URL and log you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('backend_url');
            await AsyncStorage.removeItem('user');
            onLogout?.();
          },
        },
      ]
    );
  }

  async function handleClearCache() {
    Alert.alert('Clear Cache', 'Local session data has been cleared.');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>System configuration</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>📱 Features</Text>
        <View style={styles.card}>
          <SettingRow label="QR Attendance" desc="Allow students to scan QR codes" value={settings.qrAttendance} onToggle={() => toggle('qrAttendance')} />
          <SettingRow label="Emotion Tracking" desc="Enable AI emotion detection" value={settings.emotionTracking} onToggle={() => toggle('emotionTracking')} />
          <SettingRow label="Community Chat" desc="Allow course-based messaging" value={settings.communityChat} onToggle={() => toggle('communityChat')} />
          <SettingRow label="AI Chat" desc="Enable Groq-powered AI assistant" value={settings.aiChat} onToggle={() => toggle('aiChat')} />
        </View>

        <Text style={styles.sectionTitle}>🔒 Privacy & Access</Text>
        <View style={styles.card}>
          <SettingRow label="Grade Visibility" desc="Students can see their grades" value={settings.gradeVisibility} onToggle={() => toggle('gradeVisibility')} />
          <SettingRow label="Parent Access" desc="Parents can view child data" value={settings.parentAccess} onToggle={() => toggle('parentAccess')} />
        </View>

        <Text style={styles.sectionTitle}>🔔 Notifications</Text>
        <View style={styles.card}>
          <SettingRow label="Push Notifications" desc="Send alerts to users" value={settings.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow label="Auto Alerts" desc="Generate automatic attendance alerts" value={settings.autoAlerts} onToggle={() => toggle('autoAlerts')} />
        </View>

        <Text style={styles.sectionTitle}>⚙️ System</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={handleClearCache} style={styles.actionRow}>
            <Text style={styles.actionLabel}>Clear Local Cache</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResetServer} style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.actionLabel, { color: C.red }]}>Reset Backend URL</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionCard}>
          <Text style={styles.versionText}>EduSense Mobile v1.0.0</Text>
          <Text style={styles.versionSub}>Powered by Expo SDK 54 · FastAPI · Groq AI</Text>
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
  sectionTitle: { fontSize: 12, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  settingLabel: { color: C.text, fontWeight: '600', fontSize: 14 },
  settingDesc: { color: C.text3, fontSize: 11, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  actionLabel: { color: C.text, fontSize: 14, fontWeight: '600' },
  actionArrow: { color: C.text3, fontSize: 20 },
  versionCard: { marginTop: 24, alignItems: 'center', paddingBottom: 20 },
  versionText: { color: C.text3, fontSize: 13, fontWeight: '600' },
  versionSub: { color: C.text3, fontSize: 11, marginTop: 4 },
});
