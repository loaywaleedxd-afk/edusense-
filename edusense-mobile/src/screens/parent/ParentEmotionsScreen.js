import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getEmotions, getStudentEngagement } from '../../api';
import { C } from '../../theme';

const EMOTION_COLORS = {
  happy: C.green, focused: C.blue, confused: C.amber,
  bored: C.text3, neutral: C.cyan, angry: C.red, sad: '#a78bfa', engaged: C.green,
};
const EMOTION_ICONS = {
  happy: '😊', focused: '🎯', confused: '😕', bored: '😴',
  neutral: '😐', angry: '😠', sad: '😢', engaged: '⚡',
};

function EmotionCard({ emotion, count, total, avgEngagement }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = EMOTION_COLORS[emotion?.toLowerCase()] || C.blue;
  const icon = EMOTION_ICONS[emotion?.toLowerCase()] || '😐';
  return (
    <View style={[styles.emotionCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={styles.emotionIcon}>{icon}</Text>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.emotionName, { color }]}>{emotion}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        {avgEngagement != null && <Text style={styles.engText}>Avg engagement: {Math.round(avgEngagement)}%</Text>}
      </View>
      <Text style={[styles.emotionPct, { color }]}>{pct}%</Text>
    </View>
  );
}

export default function ParentEmotionsScreen({ user }) {
  const [emotions, setEmotions]     = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const childId = user.child_id || user.username || 'S001';

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [emo, eng] = await Promise.all([
        getEmotions(childId.toUpperCase()).catch(() => []),
        getStudentEngagement(childId.toUpperCase()).catch(() => null),
      ]);
      setEmotions(Array.isArray(emo) ? emo : []);
      setEngagement(eng);
    } catch {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const breakdown = engagement?.emotion_breakdown || [];
  const totalCount = breakdown.reduce((a, e) => a + (e.count || 0), 0);
  const recent = emotions.slice(0, 20);

  const positiveEmotions = ['happy', 'focused', 'engaged'];
  const positiveCount = breakdown.filter(e => positiveEmotions.includes(e.emotion?.toLowerCase())).reduce((a, e) => a + (e.count || 0), 0);
  const positivityScore = totalCount ? Math.round((positiveCount / totalCount) * 100) : 0;

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emotions</Text>
        <Text style={styles.sub}>Classroom emotional state</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.purple} />}>
        <View style={styles.scoreCard}>
          <Text style={[styles.scoreNum, { color: positivityScore >= 60 ? C.green : positivityScore >= 40 ? C.amber : C.red }]}>
            {positivityScore}%
          </Text>
          <Text style={styles.scoreLbl}>Positivity Score</Text>
          <Text style={styles.scoreSub}>
            {positivityScore >= 70 ? '🌟 Excellent emotional state' : positivityScore >= 50 ? '😊 Generally positive' : '⚠️ May need attention'}
          </Text>
        </View>

        {breakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
            {breakdown.map((e, i) => (
              <EmotionCard key={i} emotion={e.emotion} count={e.count || 0} total={totalCount} avgEngagement={e.avg_engagement} />
            ))}
          </View>
        )}

        {recent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Records</Text>
            {recent.map((e, i) => {
              const color = EMOTION_COLORS[e.emotion?.toLowerCase()] || C.blue;
              const icon = EMOTION_ICONS[e.emotion?.toLowerCase()] || '😐';
              return (
                <View key={i} style={styles.recentRow}>
                  <Text style={styles.recentIcon}>{icon}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.recentEmotion, { color }]}>{e.emotion}</Text>
                    <Text style={styles.recentTime}>{e.timestamp?.split('T')[0] || e.date || '—'}</Text>
                  </View>
                  {e.engagement != null && (
                    <Text style={styles.recentEng}>{Math.round(e.engagement)}% eng</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {breakdown.length === 0 && recent.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>😊</Text>
            <Text style={styles.emptyText}>No emotion data yet.</Text>
          </View>
        )}
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
  scoreCard: { margin: 16, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center' },
  scoreNum: { fontSize: 56, fontWeight: '900' },
  scoreLbl: { color: C.text2, fontSize: 14, marginTop: 4 },
  scoreSub: { color: C.text3, fontSize: 13, marginTop: 8 },
  section: { margin: 16, marginTop: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  emotionCard: { backgroundColor: C.bg3, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  emotionIcon: { fontSize: 24 },
  emotionName: { fontWeight: '700', fontSize: 13, textTransform: 'capitalize', marginBottom: 6 },
  barBg: { height: 6, backgroundColor: C.border, borderRadius: 3, flex: 1 },
  barFill: { height: 6, borderRadius: 3 },
  emotionPct: { fontWeight: '800', fontSize: 14, marginLeft: 10, minWidth: 36, textAlign: 'right' },
  engText: { color: C.text3, fontSize: 10, marginTop: 4 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  recentIcon: { fontSize: 20 },
  recentEmotion: { fontWeight: '600', fontSize: 13, textTransform: 'capitalize' },
  recentTime: { color: C.text3, fontSize: 11, marginTop: 2 },
  recentEng: { color: C.text3, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: C.text3, fontSize: 14 },
});
