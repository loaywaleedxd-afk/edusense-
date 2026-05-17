import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { C } from '../../theme';
import { getBaseUrl } from '../../api';

const GROQ_API_KEY = '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';
const GROQ_MODEL = 'llama-3.1-8b-instant';

async function analyzeWithGroq(courseInfo, emotionData) {
  const prompt = `You are an educational AI assistant helping a university lecturer understand student comprehension.

Course: ${courseInfo}
Student Emotion Data: ${emotionData}

Based on this classroom emotion data, identify:
1. Which topics students are likely struggling with (confused/bored patterns)
2. Which topics are engaging students well (happy/focused patterns)
3. Specific recommendations for the lecturer
4. Suggested interventions for struggling students

Be concise and actionable. Format with clear sections.`;

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'No response from AI.';
}

export default function DoctorTopicDetectorScreen({ user }) {
  const [courseInfo, setCourseInfo] = useState('');
  const [emotionData, setEmotionData] = useState('');
  const [result, setResult]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState([]);

  async function handleAnalyze() {
    if (!courseInfo.trim()) return;
    setLoading(true); setResult('');
    try {
      const emotionStr = emotionData.trim() || 'No specific emotion data provided. Use general analysis.';
      const analysis = await analyzeWithGroq(courseInfo, emotionStr);
      setResult(analysis);
      setHistory(prev => [{ course: courseInfo, result: analysis, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
    } catch (e) {
      setResult('❌ Failed to analyze. Check your connection.');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Topic Detector</Text>
        <Text style={styles.sub}>AI-powered difficulty analysis</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>COURSE / TOPIC</Text>
          <TextInput
            value={courseInfo}
            onChangeText={setCourseInfo}
            placeholder="e.g. CS301 - Data Structures, Week 5: Binary Trees"
            placeholderTextColor={C.text3}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>EMOTION DATA (OPTIONAL)</Text>
          <TextInput
            value={emotionData}
            onChangeText={setEmotionData}
            placeholder="e.g. 40% confused, 20% bored, 30% focused, 10% happy during the recursion section"
            placeholderTextColor={C.text3}
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            multiline
          />

          <TouchableOpacity onPress={handleAnalyze} disabled={loading || !courseInfo.trim()} style={[styles.analyzeBtn, (loading || !courseInfo.trim()) && styles.analyzeBtnDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeBtnText}>🧠 Analyze Topics</Text>}
          </TouchableOpacity>
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Analysis Result</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}

        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent Analyses</Text>
            {history.map((h, i) => (
              <TouchableOpacity key={i} onPress={() => setResult(h.result)} style={styles.historyItem}>
                <Text style={styles.historyCourse}>{h.course}</Text>
                <Text style={styles.historyTime}>{h.time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!result && !loading && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 How to use</Text>
            <Text style={styles.tipText}>Enter your course name and optionally paste emotion summary data from your session. The AI will identify which topics students are struggling with and suggest improvements.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.text3, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  fieldLabel: { fontSize: 10, color: C.text3, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14 },
  analyzeBtn: { backgroundColor: C.purple, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resultCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.purple, padding: 16, marginBottom: 16 },
  resultTitle: { color: C.purple, fontWeight: '700', fontSize: 14, marginBottom: 10 },
  resultText: { color: C.text, fontSize: 13, lineHeight: 22 },
  historySection: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  historyTitle: { color: C.text2, fontWeight: '700', fontSize: 13, marginBottom: 10 },
  historyItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between' },
  historyCourse: { color: C.text, fontSize: 13, flex: 1 },
  historyTime: { color: C.text3, fontSize: 11 },
  tipCard: { backgroundColor: `${C.amber}15`, borderRadius: 14, borderWidth: 1, borderColor: C.amber, padding: 16 },
  tipTitle: { color: C.amber, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  tipText: { color: C.text2, fontSize: 13, lineHeight: 20 },
});
