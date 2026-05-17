import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getAttendance, markAttendance, submitExcuse, getLectures } from '../../api';
import { C } from '../../theme';

const TABS = ['Records', 'QR Check-In', 'Submit Excuse'];

export default function AttendanceScreen({ user }) {
  const [tab, setTab]           = useState(0);
  const [records, setRecords]   = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  // Excuse form
  const [excuseCourse, setExcuseCourse] = useState('');
  const [excuseWeek, setExcuseWeek]     = useState('');
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseStatus, setExcuseStatus] = useState('');

  const sid = user.username?.toUpperCase() || 'S001';

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [a, l] = await Promise.all([getAttendance(sid), getLectures()]);
      setRecords(Array.isArray(a) ? a : []);
      setLectures(Array.isArray(l) ? l : []);
    } catch { setRecords([]); setLectures([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function handleQRScan({ data }) {
    setScanning(false);
    try {
      const res = await markAttendance(sid, data, 'qr');
      setScanResult(res.duplicate ? '⚠️ Already marked present for this lecture.' : `✅ Attendance marked!\nLecture: ${data}`);
    } catch {
      setScanResult('❌ Failed to submit. Check your connection.');
    }
  }

  async function handleExcuseSubmit() {
    if (!excuseReason.trim()) { Alert.alert('Error', 'Please enter a reason.'); return; }
    try {
      await submitExcuse(sid, excuseCourse, parseInt(excuseWeek) || 1, excuseReason);
      setExcuseStatus('✅ Excuse submitted successfully!');
      setExcuseCourse(''); setExcuseWeek(''); setExcuseReason('');
    } catch {
      setExcuseStatus('❌ Failed to submit. Please try again.');
    }
  }

  const attended = records.filter(r => r.status === 'present').length;
  const total    = records.length;
  const rate     = total ? Math.round((attended / total) * 100) : 0;

  if (scanning) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={handleQRScan} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Point at the QR code on the board</Text>
          <TouchableOpacity onPress={() => setScanning(false)} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Attendance</Text>
        <Text style={styles.sub}>{rate}% · {attended}/{total} lectures</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} onPress={() => setTab(i)} style={[styles.tabBtn, tab === i && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.green} />}>

          {/* TAB 0: Records */}
          {tab === 0 && (
            <>
              <View style={styles.statsRow}>
                {[
                  { label: 'Rate', value: `${rate}%`, color: rate >= 75 ? C.green : C.red },
                  { label: 'Attended', value: attended, color: C.green },
                  { label: 'Missed', value: total - attended, color: C.red },
                  { label: 'Total', value: total, color: C.blue },
                ].map((s, i) => (
                  <View key={i} style={styles.statBox}>
                    <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.statLbl}>{s.label}</Text>
                  </View>
                ))}
              </View>
              {records.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No attendance records yet.</Text></View>
              ) : records.map((r, i) => (
                <View key={i} style={styles.record}>
                  <View style={[styles.dot, { backgroundColor: r.status === 'present' ? C.green : C.red }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recTitle}>{r.course_name || `Lecture ${r.lecture_id}`}</Text>
                    <Text style={styles.recSub}>{r.check_in_time?.split(' ')[0] || '—'} · {r.method || 'manual'}</Text>
                  </View>
                  <Text style={[styles.recStatus, { color: r.status === 'present' ? C.green : C.red }]}>
                    {r.status === 'present' ? '✅ Present' : '❌ Absent'}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* TAB 1: QR Check-In */}
          {tab === 1 && (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>📷 QR Attendance</Text>
              <Text style={styles.qrHint}>Scan the QR code displayed by your lecturer to mark attendance.</Text>
              {scanResult ? (
                <View style={[styles.resultBox, { borderColor: scanResult.startsWith('✅') ? C.green : C.red }]}>
                  <Text style={[styles.resultText, { color: scanResult.startsWith('✅') ? C.green : C.red }]}>{scanResult}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.scanBigBtn}
                onPress={async () => {
                  if (!permission?.granted) await requestPermission();
                  setScanResult(''); setScanning(true);
                }}
              >
                <Text style={styles.scanBigIcon}>📷</Text>
                <Text style={styles.scanBigText}>Open QR Scanner</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: Excuse */}
          {tab === 2 && (
            <View style={styles.excuseSection}>
              <Text style={styles.qrTitle}>📝 Submit Absence Excuse</Text>
              <Text style={styles.fieldLabel}>COURSE CODE</Text>
              <TextInput value={excuseCourse} onChangeText={setExcuseCourse} placeholder="e.g. CS201" placeholderTextColor={C.text3} style={styles.input} />
              <Text style={styles.fieldLabel}>WEEK NUMBER</Text>
              <TextInput value={excuseWeek} onChangeText={setExcuseWeek} placeholder="e.g. 3" placeholderTextColor={C.text3} style={styles.input} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>REASON</Text>
              <TextInput
                value={excuseReason} onChangeText={setExcuseReason}
                placeholder="Explain your absence..."
                placeholderTextColor={C.text3}
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
              />
              {excuseStatus ? (
                <Text style={[styles.excuseStatus, { color: excuseStatus.startsWith('✅') ? C.green : C.red }]}>{excuseStatus}</Text>
              ) : null}
              <TouchableOpacity onPress={handleExcuseSubmit} style={styles.submitBtn}>
                <Text style={styles.submitText}>Submit Excuse</Text>
              </TouchableOpacity>
            </View>
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
  tabBar: { flexDirection: 'row', backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.green },
  tabText: { color: C.text3, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: C.green },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  statsRow: { flexDirection: 'row', margin: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: C.border },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { color: C.text3, fontSize: 10, marginTop: 2 },
  record: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recTitle: { color: C.text, fontWeight: '700', fontSize: 13 },
  recSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  recStatus: { fontSize: 12, fontWeight: '700' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: { width: 240, height: 240, borderWidth: 3, borderColor: C.green, borderRadius: 16, marginBottom: 24 },
  scanHint: { color: '#fff', fontSize: 14, marginBottom: 20 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  cancelText: { color: '#fff', fontWeight: '700' },
  qrSection: { padding: 20 },
  excuseSection: { padding: 20 },
  qrTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  qrHint: { color: C.text3, fontSize: 13, marginBottom: 20, lineHeight: 20 },
  resultBox: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 20 },
  resultText: { fontSize: 14, lineHeight: 20 },
  scanBigBtn: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 30, alignItems: 'center' },
  scanBigIcon: { fontSize: 48, marginBottom: 12 },
  scanBigText: { color: C.text, fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 10, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14 },
  excuseStatus: { fontSize: 13, marginTop: 12, fontWeight: '600' },
  submitBtn: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: C.text3, fontSize: 14 },
});
