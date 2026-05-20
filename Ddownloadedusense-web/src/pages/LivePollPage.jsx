import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';

const POLL_KEY = 'es_live_poll';

function loadPoll() {
  try { return JSON.parse(localStorage.getItem(POLL_KEY) || 'null'); }
  catch { return null; }
}
function savePoll(p) {
  localStorage.setItem(POLL_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event('es_poll_update'));
}
function clearPoll() {
  localStorage.removeItem(POLL_KEY);
  window.dispatchEvent(new Event('es_poll_update'));
}

/* ═══════════════════════════════════════════════════════════ DOCTOR SIDE ═══ */
export function DoctorLivePoll({ theme: C }) {
  const { t, isRTL } = useLang();
  const [poll, setPoll]       = useState(loadPoll);
  const [question, setQ]      = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [creating, setCreating] = useState(false);

  const sync = useCallback(() => setPoll(loadPoll()), []);
  useEffect(() => {
    window.addEventListener('es_poll_update', sync);
    const iv = setInterval(sync, 2000);
    return () => { window.removeEventListener('es_poll_update', sync); clearInterval(iv); };
  }, [sync]);

  function publish() {
    const valid = choices.filter(c => c.trim());
    if (!question.trim() || valid.length < 2) return;
    savePoll({
      id: Date.now(),
      question: question.trim(),
      choices: valid.map(text => ({ text, votes: 0 })),
      active: true,
      createdAt: new Date().toISOString(),
    });
    setCreating(false); setQ(''); setChoices(['', '', '', '']);
  }

  function endPoll() { if (poll) savePoll({ ...poll, active: false }); }
  function deletePoll() { clearPoll(); }

  const totalVotes = poll ? poll.choices.reduce((a, c) => a + c.votes, 0) : 0;

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('live_poll')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>{t('live_poll_sub_doc')}</div>

      {!poll && !creating && (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setCreating(true)}
          style={{
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none',
            borderRadius: 12, padding: '14px 28px', fontSize: 14, fontWeight: 700,
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>📊</span> {t('create_poll')}
        </motion.button>
      )}

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, maxWidth: 560 }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>{t('new_poll')}</div>
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4 }}>{t('poll_question')}</div>
            <input
              value={question} onChange={e => setQ(e.target.value)}
              placeholder={t('poll_question_ph')}
              style={{ width: '100%', height: 40, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', fontSize: 13, color: C.text, marginBottom: 14, boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 6 }}>{t('poll_choices')} (2–4)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {choices.map((ch, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.blue3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{String.fromCharCode(65 + i)}</div>
                  <input
                    value={ch} onChange={e => { const n=[...choices]; n[i]=e.target.value; setChoices(n); }}
                    placeholder={`${t('choice')} ${String.fromCharCode(65+i)}`}
                    style={{ flex: 1, height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={publish} style={{ background: C.blue3, border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>🚀 {t('publish_poll')}</button>
              <button onClick={() => setCreating(false)} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 12, color: C.text2, cursor: 'pointer' }}>{t('cancel')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active / ended poll results */}
      {poll && (
        <motion.div
          key={poll.id}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: C.card, border: `1px solid ${poll.active ? C.blue : C.border}`, borderRadius: 16, padding: 20, maxWidth: 560 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {poll.active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>}
                <span style={{ fontSize: 10, fontWeight: 700, color: poll.active ? '#ef4444' : C.text3 }}>
                  {poll.active ? t('poll_live') : t('poll_ended')}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{poll.question}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{totalVotes} {t('votes')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {poll.active && <button onClick={endPoll} style={{ background: C.amber_dim || 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' }}>⏹ {t('end_poll')}</button>}
              <button onClick={deletePoll} style={{ background: C.red_dim || 'rgba(239,68,68,0.12)', border: `1px solid ${C.red}`, borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: C.red, cursor: 'pointer' }}>🗑️</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {poll.choices.map((ch, i) => {
              const pct = totalVotes > 0 ? Math.round((ch.votes / totalVotes) * 100) : 0;
              const isWinner = !poll.active && ch.votes === Math.max(...poll.choices.map(x => x.votes));
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: 12, color: C.text, fontWeight: isWinner ? 700 : 400 }}>
                      {String.fromCharCode(65+i)}. {ch.text} {isWinner && !poll.active ? '🏆' : ''}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{pct}% ({ch.votes})</span>
                  </div>
                  <div style={{ height: 10, background: C.bg3, borderRadius: 6, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 6, background: isWinner && !poll.active ? C.green : C.blue }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!poll.active && (
            <button onClick={() => setCreating(true)} style={{ marginTop: 14, background: C.blue3, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              📊 {t('new_poll')}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ STUDENT SIDE ═══ */
export function StudentLivePoll({ theme: C }) {
  const { t, isRTL } = useLang();
  const [poll, setPoll]   = useState(loadPoll);
  const [voted, setVoted] = useState(null);

  const sync = useCallback(() => setPoll(loadPoll()), []);
  useEffect(() => {
    window.addEventListener('es_poll_update', sync);
    const iv = setInterval(sync, 2000);
    return () => { window.removeEventListener('es_poll_update', sync); clearInterval(iv); };
  }, [sync]);

  // Reset voted state when a new poll appears
  useEffect(() => { setVoted(null); }, [poll?.id]);

  function vote(idx) {
    if (!poll || voted !== null || !poll.active) return;
    const updated = { ...poll, choices: poll.choices.map((c, i) => i === idx ? { ...c, votes: c.votes + 1 } : c) };
    savePoll(updated);
    setVoted(idx);
  }

  const totalVotes = poll ? poll.choices.reduce((a, c) => a + c.votes, 0) : 0;

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('live_poll')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>{t('live_poll_sub_stu')}</div>

      {!poll && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 14, color: C.text2 }}>{t('no_active_poll')}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{t('poll_wait')}</div>
        </div>
      )}

      {poll && (
        <motion.div
          key={poll.id}
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          style={{ background: C.card, border: `2px solid ${poll.active ? C.blue : C.border}`, borderRadius: 18, padding: 24, maxWidth: 520 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {poll.active && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}/>}
            <span style={{ fontSize: 10, fontWeight: 700, color: poll.active ? '#ef4444' : C.text3 }}>
              {poll.active ? t('poll_live') : t('poll_ended')}
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 18, textAlign: isRTL ? 'right' : 'left' }}>{poll.question}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {poll.choices.map((ch, i) => {
              const pct = totalVotes > 0 ? Math.round((ch.votes / totalVotes) * 100) : 0;
              const isMyVote = voted === i;
              const showResults = voted !== null || !poll.active;
              const isWinner = !poll.active && ch.votes === Math.max(...poll.choices.map(x => x.votes));

              return (
                <motion.button
                  key={i}
                  whileHover={!showResults ? { scale: 1.02 } : {}}
                  whileTap={!showResults ? { scale: 0.98 } : {}}
                  onClick={() => vote(i)}
                  disabled={showResults}
                  style={{
                    background: isMyVote ? `${C.blue}22` : showResults ? C.bg3 : C.bg3,
                    border: `2px solid ${isMyVote ? C.blue : isWinner && !poll.active ? C.green : C.border}`,
                    borderRadius: 12, padding: '12px 14px', cursor: showResults ? 'default' : 'pointer',
                    textAlign: isRTL ? 'right' : 'left', position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* progress fill */}
                  {showResults && (
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ position: 'absolute', inset: 0, background: isWinner && !poll.active ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)', borderRadius: 10 }}
                    />
                  )}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: 13, fontWeight: isMyVote || isWinner ? 700 : 400, color: C.text }}>
                      <span style={{ color: C.blue, fontWeight: 800, marginRight: 8 }}>{String.fromCharCode(65+i)}.</span>
                      {ch.text} {isMyVote ? '✓' : ''} {isWinner && !poll.active ? '🏆' : ''}
                    </span>
                    {showResults && <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{pct}%</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {voted !== null && poll.active && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 14, fontSize: 12, color: C.green, fontWeight: 600, textAlign: 'center' }}>
              ✅ {t('vote_cast')} · {totalVotes} {t('votes')} {t('so_far')}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
