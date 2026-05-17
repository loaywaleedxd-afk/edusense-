import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { getStudents, getAttendance, getLectures } from '../../api';
import { C } from '../../theme';

function AlertCard({ icon, title, body, color, time }) {
  return (
    <View style={[styles.alertCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.alertTop}>
        <Text style={styles.alertIcon}>{icon}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.alertTitle, { color }]}>{title}</Text>
          <Text style={styles.alertBody}>{body}</Text>
        </View>
        {time ? <Text style={styles.alertTime}>{time}</Text> : null}
      </View>
    </View>
  );
}

export default function DoctorAlertsScreen({ user }) {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [students, lectures] = await Promise.all([getStudents(), getLectures()]);

      const generated = [];

      // Low attendance alerts
      students.forEach(s => {
        const rate = s.attendance_rate ?? 0;
        if (rate < 60 && rate > 0) {
          generated.push({
            icon: '🚨', color: C.red, priority: 1,
            title: `Critical Attendance: ${s.name || s.student_id}`,
            body: `Attendance rate ${Math.round(rate)}% — student is at risk of failing.`,
            time: 'Now',
          });
        } else if (rate < 75 && rate > 0) {
          generated.push({
            icon: '⚠️', color: C.amber, priority: 2,
            title: `Low Attendance: ${s.name || s.student_id}`,
            body: `Attendance rate ${Math.round(rate)}% — approaching minimum threshold.`,
            time: 'Now',
          });
        }
      });

      // Low engagement alerts
      students.forEach(s => {
        const eng = s.avg_engagement ?? s.engagement ?? 0;
        if (eng > 0 && eng < 40) {
          generated.push({
            icon: '😴', color: C.amber, priority: 2,
            title: `Low Engagement: ${s.name || s.student_id}`,
            body: `Average engagement ${Math.round(eng)}% — student may need additional support.`,
            time: 'Now',
          });
        }
      });

      // General info alerts
      if (lectures.length > 0) {
        generated.push({
          icon: '📋', color: C.blue, priority: 3,
          title: `${lectures.length} Lectures Scheduled`,
          body: 'All upcoming lectures are configured. Monitor attendance in Live Session.',
          time: 'System',
        });
      }

      if (students.length > 0) {
        const atRisk = students.filter(s => (s.attendance_rate ?? 0) < 75 && (s.attendance_rate ?? 0) > 0).length;
        if (atRisk > 0) {
          generated.push({
            icon: '📊', color: C.purple, priority: 2,
            title: `${atRisk} Students Below 75% Attendance`,
            body: 'These students may require intervention or academic counseling.',
            time: 'Today',
          });
        }
      }

      if (generated.length === 0) {
        generated.push({
          icon: '✅', color: C.green, priority: 4,
          title: 'All Systems Normal',
          body: 'No alerts at this time. Students are performing well.',
          time: 'Now',
        });
      }

      generated.sort((a, b) => a.priority - b.priority);
      setAlerts(generated);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.amber} size="large" /></View>;

  const critical = alerts.filter(a => a.color === C.red).length;
  const warnings = alerts.filter(a => a.color === C.amber).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.sub}>{critical} critical · {warnings} warnings</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.amber} />}>
        <View style={styles.summaryRow}>
          {[
            { label: 'Critical', value: critical, color: C.red, icon: '🚨' },
            { label: 'Warnings', value: warnings, color: C.amber, icon: '⚠️' },
            { label: 'Info', value: alerts.filter(a => a.color !== C.red && a.color !== C.amber).length, color: C.blue, icon: 'ℹ️' },
          ].map((s, i) => (
            <View key={i} style={styles.summaryBox}>
              <Text style={styles.summaryIcon}>{s.icon}</Text>
              <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.summaryLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ padding: 12 }}>
          {alerts.map((alert, i) => (
            <AlertCard key={i} {...alert} />
          ))}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', margin: 12, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  summaryBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  summaryIcon: { fontSize: 20, marginBottom: 4 },
  summaryVal: { fontSize: 20, fontWeight: '800' },
  summaryLbl: { color: C.text3, fontSize: 10, marginTop: 2 },
  alertCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  alertTop: { flexDirection: 'row', alignItems: 'flex-start' },
  alertIcon: { fontSize: 22 },
  alertTitle: { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  alertBody: { color: C.text2, fontSize: 12, lineHeight: 18 },
  alertTime: { color: C.text3, fontSize: 10 },
});
