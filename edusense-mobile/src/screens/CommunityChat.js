import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { getMessages, sendMessage, getLectures } from '../api';
import { C } from '../theme';

export default function CommunityChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [courses, setCourses]   = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('general');
  const scrollRef = useRef(null);

  async function loadCourses() {
    try {
      const lecs = await getLectures();
      const unique = [...new Map(lecs.map(l => [l.course_code, l])).values()];
      setCourses(unique);
    } catch {}
  }

  async function loadMessages() {
    setLoading(true);
    try {
      const data = await getMessages(selectedCourse);
      setMessages(Array.isArray(data) ? data : []);
    } catch { setMessages([]); }
    setLoading(false);
  }

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => { loadMessages(); }, [selectedCourse]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage(selectedCourse, user.username, user.name, user.role, text);
      await loadMessages();
    } catch {}
    setSending(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Community Chat</Text>
      </View>

      {/* Course Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseBar} contentContainerStyle={{ padding: 10, gap: 8 }}>
        <TouchableOpacity onPress={() => setSelectedCourse('general')} style={[styles.courseChip, selectedCourse === 'general' && styles.courseChipActive]}>
          <Text style={[styles.courseChipText, selectedCourse === 'general' && styles.courseChipTextActive]}>General</Text>
        </TouchableOpacity>
        {courses.map((c, i) => (
          <TouchableOpacity key={i} onPress={() => setSelectedCourse(c.course_code)} style={[styles.courseChip, selectedCourse === c.course_code && styles.courseChipActive]}>
            <Text style={[styles.courseChipText, selectedCourse === c.course_code && styles.courseChipTextActive]}>{c.course_code}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.blue} /></View>
      ) : (
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ padding: 12 }}>
          {messages.length === 0 && (
            <View style={styles.emptyMsg}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet. Be the first!</Text>
            </View>
          )}
          {messages.map((m, i) => {
            const isMe = m.sender_id === user.username;
            return (
              <View key={i} style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                {!isMe && <Text style={styles.senderName}>{m.sender_name} · {m.sender_role}</Text>}
                <Text style={[styles.msgText, isMe ? styles.myText : styles.otherText]}>{m.text}</Text>
                <Text style={styles.msgTime}>{m.created_at?.split('T')[1]?.slice(0,5) || m.created_at?.split(' ')[1]?.slice(0,5) || ''}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={C.text3}
          style={styles.input}
          multiline
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSend} disabled={!input.trim() || sending} style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendIcon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: C.bg2 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  courseBar: { maxHeight: 52, backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border },
  courseChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border },
  courseChipActive: { backgroundColor: C.blue, borderColor: C.blue },
  courseChipText: { color: C.text2, fontSize: 12, fontWeight: '600' },
  courseChipTextActive: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messages: { flex: 1 },
  emptyMsg: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: C.text3, fontSize: 14 },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: C.blue },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  senderName: { color: C.text3, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  myText: { color: '#fff' },
  otherText: { color: C.text },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', padding: 10, backgroundColor: C.bg2, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: C.bg3, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, color: C.text, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: C.blue, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: C.bg3 },
  sendIcon: { color: '#fff', fontSize: 16 },
});
