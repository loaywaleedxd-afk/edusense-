import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../theme';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY = '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';

const SYSTEM_PROMPT = `You are EduSense AI, a helpful assistant for an educational platform called EduSense.
You help students, parents, and teachers with questions about attendance, emotions, engagement, grades, and general education.
Keep responses concise and encouraging. Use a friendly, supportive tone.`;

export default function ChatScreen({ user }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm EduSense AI. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const updated = [...messages, { role: 'user', text }];
    setMessages(updated);
    setLoading(true);
    try {
      const history = updated
        .filter(m => m.role !== 'assistant' || updated.indexOf(m) > 0)
        .map(m => ({ role: m.role, content: m.text }));

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error('Invalid response from AI server.'); }
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not get a response.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${e.message || 'Something went wrong. Please try again.'}` }]);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 EduSense AI</Text>
        <Text style={styles.sub}>Ask me anything about your studies</Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ padding: 12 }}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {m.role === 'assistant' && <Text style={styles.aiLabel}>🤖 EduSense AI</Text>}
            <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.aiText]}>{m.text}</Text>
          </View>
        ))}
        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>🤖 EduSense AI</Text>
            <ActivityIndicator color={C.blue} size="small" style={{ marginTop: 4 }} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question..."
          placeholderTextColor={C.text3}
          style={styles.input}
          multiline
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={send} disabled={loading || !input.trim()} style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.text3, marginTop: 2 },
  messages: { flex: 1 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: C.blue },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  aiLabel: { fontSize: 10, color: C.text3, fontWeight: '700', marginBottom: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: C.text },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: C.bg2, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.text, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: C.blue, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: C.bg3 },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
