import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api';
import { C } from '../../theme';

function SettingRow({ label, desc, value, onToggle }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {desc ? <Text style={styles.settingDesc}>{desc}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: C.bg3, true: C.purple }} thumbColor={value ? '#fff' : C.text3} />
    </View>
  );
}

export default function AdminSettingsScreen({ onLogout }) {
  const [settings, setSettings] = useState({
    qrAttendance: true, emotionTracking: true, communityChat: true,
    aiChat: true, gradeVisibility: true, parentAccess: true,
    notifications: true, autoAlerts: true,
  });

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailForm, setEmailForm] = useState({
    smtp_host: 'smtp.gmail.com', smtp_port: '587',
    sender_email: '', sender_password: '', sender_name: 'EduSense',
  });
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    loadEmailConfig();
  }, []);

  async function loadEmailConfig() {
    try {
      const c = await apiClient();
      const res = await c.get('/api/email/config');
      if (res.data.configured) {
        setEmailConfigured(true);
        setEmailForm(prev => ({
          ...prev,
          smtp_host: res.data.smtp_host || 'smtp.gmail.com',
          smtp_port: String(res.data.smtp_port || 587),
          sender_email: res.data.sender_email || '',
          sender_name: res.data.sender_name || 'EduSense',
        }));
      }
    } catch {}
  }

  async function saveEmailConfig() {
    if (!emailForm.sender_email || !emailForm.sender_password) {
      Alert.alert('Error', 'Email and password are required.'); return;
    }
    setSavingEmail(true);
    try {
      const c = await apiClient();
      await c.post('/api/email/config', {
        smtp_host: emailForm.smtp_host,
        smtp_port: parseInt(emailForm.smtp_port) || 587,
        sender_email: emailForm.sender_email,
        sender_password: emailForm.sender_password,
        sender_name: emailForm.sender_name,
      });
      setEmailConfigured(true);
      setShowEmailForm(false);
      Alert.alert('Saved', 'Email configuration saved. Doctors can now send attendance reports.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save email config.');
    }
    setSavingEmail(false);
  }

  function toggle(key) { setSettings(prev => ({ ...prev, [key]: !prev[key] })); }

  async function handleResetServer() {
    Alert.alert('Reset Backend URL', 'This will clear the saved backend URL and log you out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('backend_url');
        await AsyncStorage.removeItem('user');
        onLogout?.();
      }},
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>System configuration</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.card}>
          <SettingRow label="QR Attendance" desc="Allow students to scan QR codes" value={settings.qrAttendance} onToggle={() => toggle('qrAttendance')} />
          <SettingRow label="Emotion Tracking" desc="Enable AI emotion detection" value={settings.emotionTracking} onToggle={() => toggle('emotionTracking')} />
          <SettingRow label="Community Chat" desc="Allow course-based messaging" value={settings.communityChat} onToggle={() => toggle('communityChat')} />
          <SettingRow label="AI Chat" desc="Enable Groq-powered AI assistant" value={settings.aiChat} onToggle={() => toggle('aiChat')} />
        </View>

        <Text style={styles.sectionTitle}>Privacy & Access</Text>
        <View style={styles.card}>
          <SettingRow label="Grade Visibility" desc="Students can see their grades" value={settings.gradeVisibility} onToggle={() => toggle('gradeVisibility')} />
          <SettingRow label="Parent Access" desc="Parents can view child data" value={settings.parentAccess} onToggle={() => toggle('parentAccess')} />
        </View>

        <Text style={styles.sectionTitle}>Email (Attendance Reports)</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={() => setShowEmailForm(!showEmailForm)} style={styles.actionRow}>
            <View>
              <Text style={styles.actionLabel}>SMTP Email Setup</Text>
              <Text style={styles.settingDesc}>{emailConfigured ? `Configured: ${emailForm.sender_email}` : 'Not configured'}</Text>
            </View>
            <Text style={[styles.badge, emailConfigured ? styles.badgeGreen : styles.badgeGray]}>
              {emailConfigured ? 'Active' : 'Setup'}
            </Text>
          </TouchableOpacity>

          {showEmailForm && (
            <View style={styles.emailForm}>
              <Text style={styles.emailFormTitle}>SMTP Configuration</Text>
              <Text style={styles.emailHint}>For Gmail: use an App Password (not your regular password). Enable 2FA then generate one at myaccount.google.com/apppasswords</Text>
              {[
                { key: 'sender_name',    label: 'Sender Name',     placeholder: 'EduSense',          secure: false },
                { key: 'sender_email',   label: 'Sender Email',    placeholder: 'you@gmail.com',      secure: false, kb: 'email-address' },
                { key: 'sender_password',label: 'App Password',    placeholder: 'xxxx xxxx xxxx xxxx',secure: true  },
                { key: 'smtp_host',      label: 'SMTP Host',       placeholder: 'smtp.gmail.com',     secure: false },
                { key: 'smtp_port',      label: 'SMTP Port',       placeholder: '587',                secure: false, kb: 'number-pad' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    value={emailForm[f.key]}
                    onChangeText={v => setEmailForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.text3}
                    secureTextEntry={f.secure}
                    keyboardType={f.kb || 'default'}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              ))}
              <TouchableOpacity onPress={saveEmailConfig} disabled={savingEmail} style={styles.saveBtn}>
                {savingEmail ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Email Config</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow label="Push Notifications" desc="Send alerts to users" value={settings.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow label="Auto Alerts" desc="Generate automatic attendance alerts" value={settings.autoAlerts} onToggle={() => toggle('autoAlerts')} />
        </View>

        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={handleResetServer} style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.actionLabel, { color: C.red }]}>Reset Backend URL</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionCard}>
          <Text style={styles.versionText}>EduSense Mobile v1.0.0</Text>
          <Text style={styles.versionSub}>Expo SDK 54 · FastAPI · Groq AI</Text>
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
  sectionTitle: { fontSize: 11, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  settingLabel: { color: C.text, fontWeight: '600', fontSize: 14 },
  settingDesc: { color: C.text3, fontSize: 11, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  actionLabel: { color: C.text, fontSize: 14, fontWeight: '600' },
  actionArrow: { color: C.text3, fontSize: 20 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  badgeGreen: { backgroundColor: `${C.green}22`, color: C.green },
  badgeGray:  { backgroundColor: `${C.text3}22`, color: C.text3 },
  emailForm: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  emailFormTitle: { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  emailHint: { color: C.amber, fontSize: 11, marginBottom: 14, lineHeight: 16 },
  inputLabel: { color: C.text3, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, color: C.text, fontSize: 13, marginBottom: 12 },
  saveBtn: { backgroundColor: C.blue, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  versionCard: { marginTop: 24, alignItems: 'center', paddingBottom: 20 },
  versionText: { color: C.text3, fontSize: 13, fontWeight: '600' },
  versionSub: { color: C.text3, fontSize: 11, marginTop: 4 },
});
