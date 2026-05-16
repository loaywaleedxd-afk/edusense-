import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { TouchableOpacity } from 'react-native';
import { getAttendance } from '../../api';
import { C } from '../../theme';

export default function AttendanceScreen({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getAttendance(user.username || 's001');
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  function handleQRScan({ data }) {
    setScanning(false);
    setScanResult(`✅ QR scanned: ${data}\nToken submitted to server.`);
  }

  if (scanning) {
    return (
      <View style={styles.container}>
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
        <TouchableOpacity
          onPress={async () => {
            if (!permission?.granted) { await requestPermission(); }
            setScanResult(''); setScanning(true);
          }}
          style={styles.qrBtn}
        >
          <Text style={styles.qrBtnText}>📷 Scan QR</Text>
        </TouchableOpacity>
      </View>

      {scanResult ? (
        <View style={styles.scanResultBox}>
          <Text style={styles.scanResultText}>{scanResult}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
          {records.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No attendance records found.</Text>
              <Text style={styles.emptyHint}>Attend a lecture and scan the QR code to mark attendance.</Text>
            </View>
          ) : (
            records.map((r, i) => (
              <View key={i} style={styles.record}>
                <View style={[styles.statusDot, { backgroundColor: r.status === 'present' ? C.green : C.red }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recTitle}>Lecture {r.lecture_id || i + 1}</Text>
                  <Text style={styles.recSub}>{r.date || '—'} · {r.method || 'manual'}</Text>
                </View>
                <Text style={[styles.recStatus, { color: r.status === 'present' ? C.green : C.red }]}>
                  {r.status === 'present' ? '✅ Present' : '❌ Absent'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  qrBtn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  qrBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { width: 240, height: 240, borderWidth: 3, borderColor: C.blue, borderRadius: 16, marginBottom: 20 },
  scanHint: { color: '#fff', fontSize: 14, marginBottom: 20 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  cancelText: { color: '#fff', fontWeight: '700' },
  scanResultBox: { margin: 12, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.green },
  scanResultText: { color: C.green, fontSize: 13, lineHeight: 20 },
  record: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, margin: 10, marginBottom: 0, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recTitle: { color: C.text, fontWeight: '700', fontSize: 14 },
  recSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  recStatus: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.text2, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyHint: { color: C.text3, fontSize: 12, textAlign: 'center' },
});
