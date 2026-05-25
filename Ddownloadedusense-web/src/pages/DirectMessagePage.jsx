/**
 * DirectMessagePage — private 1-on-1 chat (Doctor ↔ Student).
 * Left panel: contact list. Right panel: chat window.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getToken } from '../api';
import { pushToast } from '../components/NotificationToast';
import useMobile from '../hooks/useMobile';

function Avatar({ name, photo, size = 36 }) {
  if (photo) {
    return (
      <img src={photo}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        alt={name}
      />
    );
  }
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#3b82f6', color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700,
    }}>{initials}</div>
  );
}

export default function DirectMessagePage({ theme: C, user }) {
  const [contacts, setContacts] = useState([]);
  const [convos,   setConvos]   = useState([]);
  const [selected, setSelected] = useState(null); // { id, name, photo, role }
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [authError, setAuthError] = useState(false);
  const bottomRef    = useRef();
  const initFetched  = useRef(false);
  const isMobile     = useMobile();

  const myId = String(user?.id);

  // Load contacts & conversations; also poll conversations every 8s for new incoming DMs
  function loadConvos() {
    api.getDMConversations()
      .then(setConvos)
      .catch(err => { if (err.message?.includes('401') || err.message?.includes('Unauthorized')) setAuthError(true); });
  }

  useEffect(() => {
    if (initFetched.current) return;
    initFetched.current = true;
    // Messaging requires a valid JWT (server login). If no token, show auth error.
    if (!getToken()) { setAuthError(true); return; }
    api.getDMContacts()
      .then(setContacts)
      .catch(err => { if (err.message?.includes('401') || err.message?.includes('Unauthorized')) setAuthError(true); });
    loadConvos();
    // Poll every 8 s so new incoming conversations appear without page refresh
    const poll = setInterval(loadConvos, 8000);
    return () => clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages when conversation selected
  useEffect(() => {
    if (!selected) return;
    loadMessages();
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadMessages() {
    api.getDMMessages(selected.id).then(msgs => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }).catch(() => {});
  }

  // Poll for new messages every 5s when a conversation is open
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectConvo(convo) {
    setSelected({ id: convo.other_id, name: convo.other_name, photo: convo.other_photo, role: convo.other_role });
    // Mark unread as 0 locally
    setConvos(c => c.map(cv => cv.other_id === convo.other_id ? { ...cv, unread: 0 } : cv));
    setShowContacts(false);
  }

  function selectContact(contact) {
    setSelected({ id: String(contact.id), name: contact.name, photo: contact.photo, role: contact.role });
    // Add to convos if not there
    setConvos(c => c.some(cv => cv.other_id === String(contact.id))
      ? c
      : [{ other_id: String(contact.id), other_name: contact.name, other_photo: contact.photo,
            other_role: contact.role, last_at: '', unread: 0 }, ...c]
    );
    setShowContacts(false);
  }

  async function handleSend() {
    if (!text.trim() || !selected) return;
    if (!getToken()) {
      pushToast({ title: 'Not connected', message: 'Please log in via the server to send messages.', color: '#f59e0b' });
      return;
    }
    setSending(true);
    const optimistic = {
      id: Date.now(), sender_id: myId, receiver_id: selected.id,
      text: text.trim(), created_at: new Date().toISOString(), is_read: false,
    };
    setMessages(m => [...m, optimistic]);
    const t = text.trim();
    setText('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    try {
      await api.sendDM({ receiver_id: selected.id, text: t });
    } catch (err) {
      pushToast({ title: 'Send failed', message: err.message, color: C.red });
      setMessages(m => m.filter(x => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const sidebarWidth = isMobile ? '100%' : 280;

  const Panel = ({ children, style }) => (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, overflow: 'hidden', ...style,
    }}>{children}</div>
  );

  return (
    <div style={{ padding: isMobile ? 8 : 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 20 }}>💬 Messages</h2>
        <button
          onClick={() => setShowContacts(v => !v)}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, fontSize: 13,
            background: C.blue2, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}
        >✏️ New Message</button>
      </div>

      {/* Auth error — user is in local/offline mode without a JWT */}
      {authError && (
        <div style={{
          background: '#f59e0b18', border: '1px solid #f59e0b44',
          borderRadius: 10, padding: '14px 18px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <div>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>Server login required</div>
            <div style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>
              Messaging requires a live server connection. Please log out and sign in again while the server is running.
            </div>
          </div>
        </div>
      )}

      {/* New contact picker */}
      <AnimatePresence>
        {showContacts && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 12, marginBottom: 12, maxHeight: 200, overflowY: 'auto',
            }}
          >
            <div style={{ color: C.text2, fontSize: 12, marginBottom: 8 }}>Select a person to message</div>
            {contacts.map(c => (
              <div key={c.id}
                onClick={() => selectContact(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 8, cursor: 'pointer', transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg3}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar name={c.name} photo={c.photo} size={32} />
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: C.text2, fontSize: 11 }}>{c.role} {c.department ? `· ${c.department}` : ''}</div>
                </div>
              </div>
            ))}
            {contacts.length === 0 && <div style={{ color: C.text2, fontSize: 13 }}>No contacts available.</div>}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        {/* Conversation list */}
        {(!isMobile || !selected) && (
          <Panel style={{ width: isMobile ? '100%' : sidebarWidth, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>CONVERSATIONS</span>
              <button
                onClick={loadConvos}
                title="Refresh conversations"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: C.text3, padding: '2px 4px', borderRadius: 6 }}
              >↻</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {convos.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: C.text2, fontSize: 13 }}>
                  No conversations yet.<br />Click "New Message" to start one.
                </div>
              )}
              {convos.map(c => (
                <div key={c.other_id}
                  onClick={() => selectConvo(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', cursor: 'pointer',
                    background: selected?.id === c.other_id ? C.bg3 : 'transparent',
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <Avatar name={c.other_name} photo={c.other_photo} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.other_name}
                      {c.unread > 0 && (
                        <span style={{
                          background: C.blue2, color: '#fff', borderRadius: 10,
                          fontSize: 10, padding: '1px 6px', fontWeight: 700,
                        }}>{c.unread}</span>
                      )}
                    </div>
                    <div style={{ color: C.text2, fontSize: 11 }}>{c.other_role}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Chat window */}
        {(!isMobile || selected) && (
          <Panel style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text2 }}>
                Select a conversation to start messaging
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                }}>
                  {isMobile && (
                    <button onClick={() => setSelected(null)}
                      style={{ background: 'none', border: 'none', color: C.text, fontSize: 20, cursor: 'pointer' }}>
                      ←
                    </button>
                  )}
                  <Avatar name={selected.name} photo={selected.photo} />
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{selected.name}</div>
                    <div style={{ color: C.text2, fontSize: 11 }}>{selected.role}</div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.map(m => {
                    const isMe = String(m.sender_id) === myId;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          background: isMe ? C.blue2 : C.bg3,
                          color: isMe ? '#fff' : C.text, fontSize: 13,
                        }}>
                          <div>{m.text}</div>
                          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
                  <textarea
                    value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={handleKey} rows={1}
                    placeholder={`Message ${selected.name}…`}
                    style={{
                      flex: 1, background: C.bg3, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '8px 12px', color: C.text,
                      fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleSend} disabled={!text.trim() || sending}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: C.blue2, color: '#fff', cursor: 'pointer',
                      fontSize: 18, opacity: (!text.trim() || sending) ? 0.5 : 1,
                    }}
                  >➤</button>
                </div>
              </>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
