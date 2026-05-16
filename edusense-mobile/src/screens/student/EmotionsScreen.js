import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getEmotions } from '../../api';
import { C } from '../../theme';

const EMOTION_COLORS = {
  happy: C.green, engaged: C.blue, neutral: C.text3,
  confused: C.amber, bored: C.purple, sad: C.red,
};

const EMOTION_ICONS = {
  happy: '😊', engaged: '🎯', neutral: '😐',
  confused: '😕', bored: '😴', sad: '😢',
};

export default function EmotionsScreen({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getEmotions(user.username || 's001');
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const emotionCounts = records.reduce((acc, r) => {
    acc[r.emotion] = (acc[r.emotion] || 0) + 1;
    return acc;
  }, {});
  const total = records.length;
  const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Emotions</Text>
        <Text style={styles.sub}>{total} records total</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} size="large" /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.blue} />}>
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>😊</Text>
              <Text style={styles.emptyText}>No emotion data yet.</Text>
              <Text style={styles.emptyHint}>Attend a live lecture to start tracking your emotions.</Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
                {sorted.map(([emotion, count]) => (
                  <View key={emotion} style={styles.emotionRow}>
                    <Text style={styles.emotionIcon}>{EMOTION_ICONS[emotion] || '😐'}</Text>
                    <Text style={styles.emotionName}>{emotion}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, {
                        width: `${Math.round((count / total) * 100)}%`,
                        backgroundColor: EMOTION_COLORS[emotion] || C.blue,
                      }]} />
                    </View>
                    <Text style={[styles.emotionPct, { color: EMOTION_COLORS[emotion] || C.blue }]}>
                      {Math.round((count / total) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Records</Text>
                {records.slice(0, 20).map((r, i) => (
                  <View key={i} style={styles.record}>
                    <Text style={styles.recordIcon}>{EMOTION_ICONS[r.emotion] || '😐'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordEmotion}>{r.emotion}</Text>
                      <Text style={styles.recordMeta}>
                        Lecture {r.lecture_id || i + 1} · Engagement {r.engagement_score || 0}%
                      </Text>
                    </View>
                    <View style={[styles.engBadge, {
                      backgroundColor: (r.engagement_score || 0) >= 70 ? `${C.green}22` : `${C.amber}22`
                    }]}>
                      <Text style={[styles.engText, {
                        color: (r.engagement_score || 0) >= 70 ? C.green : C.amber
                      }]}>
                        {r.engagement_score || 0}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  section: { margin: 12, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  emotionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emotionIcon: { fontSize: 18, width: 28 },
  emotionName: { color: C.text2, fontSize: 12, width: 68, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 8, backgroundColor: C.bg3, borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, borderRadius: 4 },
  emotionPct: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  record: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  recordIcon: { fontSize: 22, marginRight: 12 },
  recordEmotion: { color: C.text, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' },
  recordMeta: { color: C.text3, fontSize: 11, marginTop: 2 },
  engBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  engText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.text2, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyHint: { color: C.text3, fontSize: 12, textAlign: 'center' },
});
