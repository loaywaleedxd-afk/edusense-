import { useState, useRef, useEffect } from 'react';

const SYSTEM_PROMPT = `You are EduSense AI Assistant, a smart and friendly helper built into the EduSense platform.

EduSense is an intelligent classroom management system with these features:
- Real-time emotion monitoring using AI face detection (happy, sad, angry, focused, etc.)
- QR code attendance system (students scan a QR code to mark attendance)
- Grade calculator (weighted: midterm, final exam, assignments, attendance)
- Absence excuse system (students submit excuses, doctors/lecturers approve them)
- Smart alerts when students are disengaged during lectures
- Parent portal to monitor their child's performance and emotions
- Four roles: Student, Doctor/Lecturer, Admin, Parent

You can help users with:
- How to use any feature of EduSense
- Understanding their grades, attendance, and emotion reports
- How to submit or approve absence excuses
- How to scan QR codes for attendance
- General education and study advice
- Any other questions they have

Be friendly, concise, and supportive. Answer in the same language the user writes in.`;

export default function ChatWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: `Hi${user?.name ? ' ' + user.name.split(' ')[0] : ''}! I'm your EduSense AI assistant. Ask me anything about the platform or your studies!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  async function sendMessage() {
    if (!input.trim() || loading || !API_KEY) return;
    const userText = input.trim();
    setInput('');
    const next = [...messages, { role: 'user', text: userText }];
    setMessages(next);
    setLoading(true);

    try {
      // Gemini requires conversation to start with a user message — skip the initial greeting
      const firstUserIdx = next.findIndex(m => m.role === 'user');
      const contents = next.slice(firstUserIdx).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const systemText = SYSTEM_PROMPT +
        (user ? `\n\nCurrent user: ${user.name}, Role: ${user.role}` : '');

      const history = contents.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text
      }));

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemText },
            ...history
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'model', text: `Error: ${data.error.message}` }]);
      } else {
        const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
        setMessages(prev => [...prev, { role: 'model', text: reply }]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'model', text: `Error: ${err.message}` }
      ]);
    }
    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          fontSize: 24,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg) scale(1.05)' : 'scale(1)'
        }}
        title="EduSense AI Assistant"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 340,
            height: 480,
            borderRadius: 16,
            background: '#0f172a',
            border: '1px solid rgba(99,102,241,0.3)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            overflow: 'hidden',
            fontFamily: "'Segoe UI', system-ui, sans-serif"
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>🤖</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>EduSense Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Powered by Groq AI • Free</div>
            </div>
            <div style={{
              marginLeft: 'auto',
              width: 8, height: 8, borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 6px #4ade80'
            }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: m.role === 'user'
                    ? '16px 16px 4px 16px'
                    : '16px 16px 16px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                    : 'rgba(255,255,255,0.08)',
                  color: '#f1f5f9',
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '9px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  fontSize: 18,
                  letterSpacing: 4
                }}>
                  •••
                </div>
              </div>
            )}
            {!API_KEY && (
              <div style={{
                padding: 12, borderRadius: 10,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', fontSize: 12, textAlign: 'center'
              }}>
                API key not configured.<br />Add VITE_GEMINI_API_KEY to Hostinger environment variables.
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              rows={1}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '8px 12px',
                color: '#f1f5f9',
                fontSize: 13,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                maxHeight: 80,
                overflowY: 'auto'
              }}
              disabled={loading || !API_KEY}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !API_KEY}
              style={{
                width: 38, height: 38,
                borderRadius: '50%',
                background: input.trim() && !loading && API_KEY
                  ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: input.trim() && !loading && API_KEY ? 'pointer' : 'default',
                color: '#fff',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
