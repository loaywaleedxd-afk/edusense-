import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { getLectures, getStudents, apiClient } from '../../api';
import { C } from '../../theme';
import StudentAvatar from '../../components/StudentAvatar';

export default function DoctorLiveSessionScreen({ user }) {
  const [lectures, setLectures]       = useState([]);
  const [students, setStudents]       = useState([]);
  const [selectedLec, setSelectedLec] = useState(null);
  const [liveStudents, setLiveStudents] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState(0); // 0=select, 1=live
  const [emailModal, setEmailModal]   = useState(false);
  const [emailAddr, setEmailAddr]     = useState('');
  const [sending, setSending]         = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const [lecs, studs] = await Promise.all([getLectures(), getStudents()]);
        setLectures(lecs); setStudents(studs);
        if (lecs.length > 0) setSelectedLec(lecs[0]);
      } catch {}
      setLoading(false);
    }
    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Pre-fill email from logged-in doctor
  useEffect(() => {
    if (user?.email) setEmailAddr(user.email);
  }, [user]);

  async function pollAttendance(lecId) {
    try {
      const c = await apiClient();
      const data = (await c.get(`/api/attendance/lecture/${lecId}`)).data;
      setLiveStudents(Array.isArray(data) ? data : []);
    } catch {}
  }

  function startSession() {
    if (!selectedLec) return;
    setTab(1);
    pollAttendance(selectedLec.lecture_id);
    pollRef.current = setInterval(() => pollAttendance(selectedLec.lecture_id), 5000);
  }

  function endSession() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setLiveStudents([]);
    setTab(0);
  }

  async function sendAttendanceEmail() {
    if (!emailAddr.trim()) { Alert.alert('Error', 'Enter an email address.'); return; }
    setSending(true);
    try {
      const c = await apiClient();
      const res = await c.post('/api/email/send-attendance', {
        lecture_id: selectedLec.lecture_id,
        recipient_email: emailAddr.trim(),
      });
      setEmailModal(false);
      Alert.alert('Sent!', `Attendance report sent to ${emailAddr}\n${res.data.present} present · ${res.data.absent} absent · ${res.data.rate}%`);
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to send email. Check email settings in Admin → Settings.';
      Alert.alert('Error', msg);
    }
    setSending(false);
  }

  const qrValue = selectedLec ? String(selectedLec.lecture_id) : '';
  const present = liveStudents.filter(s => s.status === 'present').length;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Session</Text>
        <Text style={styles.sub}>{tab === 1 ? `LIVE · ${present} present` : 'Select a lecture to start'}</Text>
      </View>

      {tab === 0 && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionLabel}>SELECT LECTURE</Text>
          {lectures.map((lec, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedLec(lec)}
              style={[styles.lecCard, selectedLec?.lecture_id === lec.lecture_id && styles.lecCardActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.lecName}>{lec.course_name}</Text>
                <Text style={styles.lecSub}>{lec.course_code} · Room {lec.room || '—'}</Text>
              </View>
              {selectedLec?.lecture_id === lec.lecture_id && (
                <Text style={{ color: C.green, fontSize: 18 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={startSession}
            disabled={!selectedLec}
            style={[styles.startBtn, !selectedLec && styles.startBtnDisabled]}
          >
            <Text style={styles.startBtnText}>Start Live Session</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === 1 && selectedLec && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* QR display */}
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Attendance QR Code</Text>
            <Text style={styles.qrHint}>Students scan this to mark attendance</Text>
            <View style={styles.qrBox}>
              <Text style={styles.qrValue}>{qrValue}</Text>
              <Text style={styles.qrId}>Lecture ID: {selectedLec.lecture_id}</Text>
            </View>
            <Text style={styles.qrCourse}>{selectedLec.course_name} · {selectedLec.course_code}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Present', value: present,                   color: C.green  },
              { label: 'Absent',  value: students.length - present, color: C.red    },
              { label: 'Total',   value: students.length,           color: C.blue   },
              { label: 'Rate',    value: students.length ? `${Math.round((present/students.length)*100)}%` : '0%', color: C.purple },
            ].map((s, i) => (
              <View key={i} style={styles.statBox}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => setEmailModal(true)} style={styles.emailBtn}>
              <Text style={styles.emailBtnText}>Email Report</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={endSession} style={styles.endBtn}>
              <Text style={styles.endBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>

          {/* Live list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checked-in ({liveStudents.length})</Text>
            {liveStudents.length === 0 ? (
              <Text style={styles.emptyText}>Waiting for students to scan...</Text>
            ) : liveStudents.map((s, i) => (
              <View key={i} style={styles.studentRow}>
                <StudentAvatar studentId={s.student_id} name={s.full_name} size={36} bgColor={C.green} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{s.full_name || s.student_id}</Text>
                  <Text style={styles.studentSub}>{s.student_id} · {s.check_in_time?.split(' ')[1]?.slice(0,5) || '—'}</Text>
                </View>
                <Text style={[styles.statusText, { color: s.status === 'present' ? C.green : C.red }]}>
                  {s.status === 'present' ? '✅' : '❌'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Email modal */}
      <Modal visible={emailModal} transparent animationType="slide" onRequestClose={() => setEmailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Email Attendance Report</Text>
            <Text style={styles.modalSub}>{selectedLec?.course_name} · {present} present</Text>
            <Text style={styles.inputLabel}>RECIPIENT EMAIL</Text>
            <TextInput
              value={emailAddr}
              onChangeText={setEmailAddr}
              placeholder="doctor@university.edu"
              placeholderTextColor={C.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.emailInput}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setEmailModal(false)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                <Text style={{ color: C.text3, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendAttendanceEmail} disabled={sending} style={[styles.modalBtn, styles.modalBtnSend]}>
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.text3, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 10, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  lecCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  lecCardActive: { borderColor: C.green, backgroundColor: `${C.green}11` },
  lecName: { color: C.text, fontWeight: '700', fontSize: 14 },
  lecSub: { color: C.text3, fontSize: 11, marginTop: 3 },
  startBtn: { backgroundColor: C.green, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  qrCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', marginBottom: 16 },
  qrTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4 },
  qrHint: { color: C.text3, fontSize: 12, marginBottom: 20 },
  qrBox: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 12, minWidth: 200 },
  qrValue: { fontSize: 48, fontWeight: '900', color: '#0f172a' },
  qrId: { fontSize: 12, color: '#64748b', marginTop: 8 },
  qrCourse: { color: C.text2, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { color: C.text3, fontSize: 10, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  emailBtn: { flex: 1, backgroundColor: C.blue, borderRadius: 12, padding: 14, alignItems: 'center' },
  emailBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  endBtn: { flex: 1, backgroundColor: C.red, borderRadius: 12, padding: 14, alignItems: 'center' },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  studentName: { color: C.text, fontWeight: '600', fontSize: 13 },
  studentSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  statusText: { fontSize: 16 },
  emptyText: { color: C.text3, textAlign: 'center', paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.card, borderRadius: 20, padding: 24, margin: 16, borderWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4 },
  modalSub: { color: C.text3, fontSize: 13, marginBottom: 20 },
  inputLabel: { fontSize: 10, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  emailInput: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, marginBottom: 16 },
  modalBtn: { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: C.bg3 },
  modalBtnSend: { backgroundColor: C.blue },
});
