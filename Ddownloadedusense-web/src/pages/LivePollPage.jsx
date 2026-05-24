import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import { api } from '../api';

/* Shared hook — polls /api/polls/active every 2 seconds */
function useActivePoll() {
  const [poll, setPoll] = useState(null);

  const sync = useCallback(() => {
    api.getActivePoll().then(setPoll).catch(() => {});
  }, []);

  useEffect(() => {
    sync();
    const iv = setInterval(sync, 2000);
    return () => clearInterval(iv);
  }, [sync]);

  return [poll, sync];
}

/* ═══════════════════════════════════════════════════════════ DOCTOR SIDE ═══ */
export function DoctorLivePoll({ theme: C }) {
  const { t, isRTL } = useLang();
  const [poll, refresh] = useActivePoll();
  const [question, setQ]      = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [creating, setCreating] = useState(false);

  function publish() {
    const valid = choices.filter(c => c.trim());
    if (!question.trim() || valid.length < 2) return;
    api.createPoll({ question: question.trim(), choices: valid })
      .then(refresh)
      .catch(() => {});
    setCreating(false); setQ(''); setChoices(['', '', '', '']);
  }

  function endPoll()    { if (poll) api.endPoll(poll.id).then(refresh).catch(() => {}); }
  function deletePoll() { if (poll) api.deletePoll(poll.id).then(refresh).catch(() => {}); }

  const totalVotes = poll ? poll.totalVotes ?? poll.choices.reduce((a, c) => a + (c.votes || 0), 0) : 0;

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('live_poll')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 20 }}>{t('live_poll_sub_doc')}</div>

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

            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>{t('poll_question')}</div>
            <input
              value={question} onChange={e => setQ(e.target.value)}
              placeholder={t('poll_question_ph')}
              style={{ width: '100%', height: 42, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', fontSize: 13, color: C.text, marginBottom: 16, boxSizing: 'border-box' }}
            />

            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>{t('poll_choices')} (2–4)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {choices.map((ch, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: C.blue3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <input
                    value={ch}
                    onChange={e => { const n = [...choices]; n[i] = e.target.value; setChoices(n); }}
                    placeholder={`${t('choice')} ${String.fromCharCode(65 + i)}`}
                    style={{ flex: 1, height: 38, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={publish}
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                🚀 {t('publish_poll')}
              </button>
              <button
                onClick={() => { setCreating(false); setQ(''); setChoices(['','','','']); }}
                style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', fontSize: 12, color: C.text2, cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active / ended poll */}
      {poll && (
        <motion.div
          key={poll.id}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: C.card,
            border: `2px solid ${poll.active ? C.blue : C.border}`,
            borderRadius: 16, padding: 20, maxWidth: 560,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {poll.active && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }}/>
                )}
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: poll.active ? '#ef4444' : C.text3 }}>
                  {poll.active ? t('poll_live') : t('poll_ended')}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{poll.question}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{totalVotes} {t('votes')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {poll.active && (
                <button
                  onClick={endPoll}
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' }}
                >
                  ⏹ {t('end_poll')}
                </button>
              )}
              <button
                onClick={deletePoll}
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {poll.choices.map((ch, i) => {
              const pct = totalVotes > 0 ? Math.round(((ch.votes || 0) / totalVotes) * 100) : 0;
              const isWinner = !poll.active && totalVotes > 0 && ch.votes === Math.max(...poll.choices.map(x => x.votes));
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: isWinner ? 700 : 400 }}>
                      <span style={{ color: C.blue, fontWeight: 800, marginRight: 6 }}>{String.fromCharCode(65 + i)}.</span>
                      {ch.text} {isWinner ? '🏆' : ''}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{pct}% · {ch.votes || 0}</span>
                  </div>
                  <div style={{ height: 10, background: C.bg3, borderRadius: 6, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 6, background: isWinner ? C.green : C.blue }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!poll.active && (
            <button
              onClick={() => { deletePoll(); setCreating(true); }}
              style={{ marginTop: 16, background: C.blue3, border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
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
  const [poll, refresh] = useActivePoll();
  const [voted, setVoted] = useState(null);
  const [voting, setVoting] = useState(false);

  // Load existing vote when poll changes
  useEffect(() => {
    if (!poll) { setVoted(null); return; }
    api.getMyVote(poll.id)
      .then(res => setVoted(res?.choice_idx ?? null))
      .catch(() => setVoted(null));
  }, [poll?.id]);

  function vote(idx) {
    if (!poll || voted !== null || !poll.active || voting) return;
    setVoting(true);
    api.castVote(poll.id, { choice_idx: idx })
      .then(() => { setVoted(idx); refresh(); })
      .catch(() => {})
      .finally(() => setVoting(false));
  }

  const totalVotes = poll ? poll.totalVotes ?? poll.choices.reduce((a, c) => a + (c.votes || 0), 0) : 0;

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('live_poll')}</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 20 }}>{t('live_poll_sub_stu')}</div>

      {!poll && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '56px 40px', textAlign: 'center' }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{t('no_active_poll')}</div>
          <div style={{ fontSize: 12, color: C.text3 }}>{t('poll_wait')}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 12, background: C.bg3, borderRadius: 8, padding: '6px 14px', display: 'inline-block' }}>
            🔄 {isRTL ? 'يتم التحديث كل ثانيتين' : 'Auto-refreshing every 2 seconds'}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {poll && (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              background: C.card,
              border: `2px solid ${poll.active ? C.blue : C.border}`,
              borderRadius: 18, padding: 24, maxWidth: 520,
            }}
          >
            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {poll.active
                ? <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }}/>
                : <span style={{ fontSize: 12 }}>🏁</span>
              }
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: poll.active ? '#ef4444' : C.text3 }}>
                {poll.active ? t('poll_live') : t('poll_ended')}
              </span>
            </div>

            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20, textAlign: isRTL ? 'right' : 'left', lineHeight: 1.4 }}>
              {poll.question}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {poll.choices.map((ch, i) => {
                const pct = totalVotes > 0 ? Math.round(((ch.votes || 0) / totalVotes) * 100) : 0;
                const isMyVote    = voted === i;
                const showResults = voted !== null || !poll.active;
                const isWinner    = !poll.active && totalVotes > 0 && ch.votes === Math.max(...poll.choices.map(x => x.votes));
                const canVote     = poll.active && voted === null && !voting;

                return (
                  <div
                    key={i}
                    onClick={() => canVote && vote(i)}
                    style={{
                      position: 'relative', overflow: 'hidden',
                      background: isMyVote ? `${C.blue}18` : C.bg3,
                      border: `2px solid ${isMyVote ? C.blue : isWinner && !poll.active ? C.green : C.border}`,
                      borderRadius: 12, padding: '13px 16px',
                      cursor: canVote ? 'pointer' : 'default',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    {/* progress fill */}
                    {showResults && (
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                          position: 'absolute', inset: 0,
                          background: isWinner && !poll.active ? 'rgba(16,185,129,0.18)' : 'rgba(59,130,246,0.12)',
                          borderRadius: 10,
                        }}
                      />
                    )}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <span style={{ fontSize: 13, fontWeight: isMyVote || isWinner ? 700 : 400, color: C.text }}>
                        <span style={{ color: C.blue, fontWeight: 800, marginRight: 8 }}>{String.fromCharCode(65 + i)}.</span>
                        {ch.text}
                        {isMyVote ? ' ✓' : ''}
                        {isWinner && !poll.active ? ' 🏆' : ''}
                      </span>
                      {showResults && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.blue, flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {voted !== null && poll.active && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 16, fontSize: 13, color: C.green, fontWeight: 700, textAlign: 'center' }}
              >
                ✅ {t('vote_cast')} · {totalVotes} {t('votes')} {t('so_far')}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
