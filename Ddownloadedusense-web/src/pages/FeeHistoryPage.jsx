import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import store from '../dataStore';
import api, { get } from '../api.js';
import { useLang } from '../context/LanguageContext';
import { initiatePaymobPayment } from '../utils/paymob';

/* ── Admin persistence helpers ── */
function loadFeeOverrides(stuId) {
  try { return JSON.parse(localStorage.getItem(`es_fees_${stuId}`) || '{}'); } catch { return {}; }
}
function saveFeeOverrides(stuId, overrides) {
  localStorage.setItem(`es_fees_${stuId}`, JSON.stringify(overrides));
}
function loadCustomRecords(stuId) {
  try { return JSON.parse(localStorage.getItem(`es_fees_custom_${stuId}`) || '[]'); } catch { return []; }
}
function saveCustomRecords(stuId, records) {
  localStorage.setItem(`es_fees_custom_${stuId}`, JSON.stringify(records));
}
function loadDeletedIds(stuId) {
  try { return new Set(JSON.parse(localStorage.getItem(`es_fees_deleted_${stuId}`) || '[]')); } catch { return new Set(); }
}
function saveDeletedIds(stuId, ids) {
  localStorage.setItem(`es_fees_deleted_${stuId}`, JSON.stringify([...ids]));
}
const MONTHS = ['Jan 2025','Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025','Jul 2025','Aug 2025','Sep 2025','Oct 2025','Nov 2025','Dec 2025','Jan 2026','Feb 2026'];
const DESCRIPTIONS = ['Tuition Installment','Lab & Technology Fee','Semester Registration Fee','Library Fee','Activity Fee','Examination Fee'];

/* ── Local fee data generator ── */
function buildLocalFees(stuId) {
  const seed = stuId ? stuId.charCodeAt(0) * 31 + (stuId.charCodeAt(1) || 7) : 42;
  const rng = (s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; })(seed);

  const baseFee = 4800;
  const months  = ['Sep 2024','Oct 2024','Nov 2024','Dec 2024','Jan 2025','Feb 2025'];
  const records = months.map((month, i) => {
    const amount = +(baseFee / 6 + rng() * 120 - 60).toFixed(2);
    const status  = i < 4 ? 'paid' : i === 4 ? 'paid' : 'pending';
    return {
      id: `FEE-${stuId}-${i + 1}`,
      month,
      description: i === 0 ? 'Semester Registration Fee'
        : i % 3 === 0 ? 'Lab & Technology Fee'
        : 'Tuition Installment',
      amount,
      status,
      paidDate: status === 'paid' ? `${month.split(' ')[0]} ${15 + (i % 5)}, ${month.split(' ')[1]}` : null,
      method: ['Bank Transfer','Credit Card','Online Portal'][i % 3],
    };
  });

  // Financial aid
  const aid = [];
  if (rng() > 0.3) {
    aid.push({
      id: `AID-${stuId}-1`,
      type: 'Merit Scholarship',
      amount: +(baseFee * (0.15 + rng() * 0.1)).toFixed(2),
      description: 'Academic Excellence Award — GPA above 3.5',
      appliedDate: 'Sep 2024',
      status: 'approved',
    });
  }
  if (rng() > 0.5) {
    aid.push({
      id: `AID-${stuId}-2`,
      type: 'Financial Need Grant',
      amount: +(500 + rng() * 300).toFixed(2),
      description: 'Need-based support grant from university fund',
      appliedDate: 'Oct 2024',
      status: 'approved',
    });
  }

  const totalFees = records.reduce((a, r) => a + r.amount, 0);
  const totalPaid = records.filter(r => r.status === 'paid').reduce((a, r) => a + r.amount, 0);
  const totalAid  = aid.reduce((a, r) => a + r.amount, 0);
  const balance   = +(totalFees - totalPaid - totalAid).toFixed(2);

  return { records, aid, totalFees: +totalFees.toFixed(2), totalPaid: +totalPaid.toFixed(2), totalAid, balance };
}

/* ── Receipt download — only for API-sourced (real) records ── */
function downloadReceipt(record, stuName, isFromAPI) {
  if (!isFromAPI) {
    alert('Receipt download is only available for payments processed through the university payment portal.');
    return;
  }
  const text = [
    '══════════════════════════════════',
    '       EduSense University        ',
    '        PAYMENT RECEIPT           ',
    '══════════════════════════════════',
    `Receipt #: ${record.id}`,
    `Date:      ${record.paidDate || 'N/A'}`,
    `Student:   ${stuName}`,
    '──────────────────────────────────',
    `Description: ${record.description}`,
    `Amount:      $${record.amount.toFixed(2)}`,
    `Method:      ${record.method}`,
    `Status:      ${record.status.toUpperCase()}`,
    '──────────────────────────────────',
    'Thank you for your payment.',
    'Keep this receipt for your records.',
    '══════════════════════════════════',
  ].join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `receipt-${record.id}.txt`; a.click();
  URL.revokeObjectURL(url);
}

export default function FeeHistoryPage({ theme: C, stu, user, role }) {
  const { t, isRTL } = useLang();
  const isAdmin = role === 'admin';

  const [allStudents, setAllStudents] = useState([]);
  useEffect(() => {
    if (isAdmin) api.getStudents().then(setAllStudents).catch(() => {});
  }, [isAdmin]);

  // Admin student picker
  const [selectedStuId, setSelectedStuId] = useState(isAdmin ? '' : (stu?.id || ''));
  const [stuSearch, setStuSearch] = useState('');

  useEffect(() => {
    if (isAdmin && allStudents.length && !selectedStuId) setSelectedStuId(allStudents[0]?.id || allStudents[0]?.student_id || '');
  }, [isAdmin, allStudents, selectedStuId]);

  const activeStu = isAdmin
    ? allStudents.find(s => (s.id || s.student_id) === selectedStuId) || allStudents[0]
    : (stu || user);

  const [feeOverrides, setFeeOverrides] = useState(() =>
    isAdmin ? loadFeeOverrides(selectedStuId) : {}
  );
  const [customRecords, setCustomRecords] = useState(() =>
    isAdmin ? loadCustomRecords(selectedStuId) : []
  );
  const [deletedIds, setDeletedIds] = useState(() =>
    isAdmin ? loadDeletedIds(selectedStuId) : new Set()
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ description: DESCRIPTIONS[0], amount: '', month: MONTHS[0], status: 'pending' });

  const reloadAdminState = useCallback((id) => {
    setFeeOverrides(loadFeeOverrides(id));
    setCustomRecords(loadCustomRecords(id));
    setDeletedIds(loadDeletedIds(id));
  }, []);

  useEffect(() => {
    if (isAdmin) reloadAdminState(selectedStuId);
  }, [selectedStuId, isAdmin, reloadAdminState]);

  const [data, setData] = useState(() => buildLocalFees(activeStu?.id || ''));
  const [tab, setTab]       = useState('fees');
  const [fromAPI, setFromAPI] = useState(false);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    const id = isAdmin ? selectedStuId : stu?.id;
    setData(buildLocalFees(id || ''));
    setFromAPI(false);
    get(`/api/fees/${id}`)
      .then(res => {
        if (!res) return;
        if (res.records) {
          // Full history format
          setData(res); setFromAPI(true);
        } else if (res.amount !== undefined || res.paid !== undefined) {
          // Simple {paid, amount, due_date} format from backend — convert to a single record
          const amount   = parseFloat(res.amount) || 1500;
          const isPaid   = Boolean(res.paid);
          const dueDate  = res.due_date || '';
          const month    = dueDate
            ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Current Semester';
          const record = {
            id: `FEE-LIVE-${id}`,
            month,
            description: 'University Registration & Tuition Fee',
            amount,
            status: isPaid ? 'paid' : 'pending',
            paidDate: isPaid ? dueDate : null,
            method: 'University Payment Portal',
          };
          setData({
            records: [record],
            aid: [],
            totalFees: amount,
            totalPaid: isPaid ? amount : 0,
            totalAid: 0,
            balance: isPaid ? 0 : amount,
          });
          setFromAPI(true);
        }
      })
      .catch(() => {});
  }, [selectedStuId, stu?.id, isAdmin]);

  // Merge base records with overrides, filter deleted, add custom
  const baseRecords = data.records
    .filter(r => !deletedIds.has(r.id))
    .map(r => { const ov = feeOverrides[r.id]; return ov ? { ...r, ...ov } : r; });
  const records = [...baseRecords, ...customRecords.filter(r => !deletedIds.has(r.id))];

  function markAsPaid(recordId) {
    const today = new Date();
    const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const paidDate = `${ms[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const updated = { ...feeOverrides, [recordId]: { status: 'paid', paidDate, method: 'Admin Override' } };
    saveFeeOverrides(selectedStuId, updated);
    setFeeOverrides(updated);
    // Persist paid status to DB (best-effort)
    api.setFeeStatus(selectedStuId, { paid: true }).catch(() => {});
  }

  function revertToPending(recordId) {
    const updated = { ...feeOverrides };
    delete updated[recordId];
    saveFeeOverrides(selectedStuId, updated);
    setFeeOverrides(updated);
  }

  function deleteRecord(recordId) {
    const updated = new Set(deletedIds);
    updated.add(recordId);
    saveDeletedIds(selectedStuId, updated);
    setDeletedIds(updated);
  }

  function addFeeRecord() {
    const amount = parseFloat(addForm.amount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    const id = `FEE-CUSTOM-${selectedStuId}-${Date.now()}`;
    const rec = { id, month: addForm.month, description: addForm.description, amount, status: addForm.status, paidDate: null, method: 'Admin Added' };
    const updated = [...customRecords, rec];
    saveCustomRecords(selectedStuId, updated);
    setCustomRecords(updated);
    setAddForm({ description: DESCRIPTIONS[0], amount: '', month: MONTHS[0], status: 'pending' });
    setShowAddForm(false);
  }

  const { aid } = data;
  const totalAid  = data.totalAid;
  const totalFees = records.reduce((a, r) => a + r.amount, 0);
  const totalPaid = records.filter(r => r.status === 'paid').reduce((a, r) => a + r.amount, 0);
  const balance   = +(totalFees - totalPaid - totalAid).toFixed(2);

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>💳 {t('fee_title')}</div>
        <div style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
          background: fromAPI ? '#10b98122' : '#f59e0b22',
          color: fromAPI ? '#10b981' : '#f59e0b',
          border: `1px solid ${fromAPI ? '#10b98133' : '#f59e0b33'}`,
        }}>
          {fromAPI ? '🟢 Live' : '🟡 Demo data'}
        </div>
        {isAdmin && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>Student:</label>
            <input
              value={stuSearch}
              onChange={e => setStuSearch(e.target.value)}
              placeholder="Search name/ID…"
              style={{ height: 34, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, width: 150 }}
            />
            <select
              value={selectedStuId}
              onChange={e => { setSelectedStuId(e.target.value); setStuSearch(''); }}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: C.card, color: C.text, border: `1px solid ${C.border}`, cursor: 'pointer', outline: 'none', maxWidth: 260 }}
            >
              {allStudents
                .filter(s => !stuSearch || (s.name||s.full_name||'').toLowerCase().includes(stuSearch.toLowerCase()) || (s.id||s.student_id||'').toLowerCase().includes(stuSearch.toLowerCase()))
                .map(s => {
                  const id = s.id || s.student_id || '';
                  const name = s.name || s.full_name || id;
                  return <option key={id} value={id}>{name} — {id}</option>;
                })}
            </select>
          </div>
        )}
      </div>
      {isAdmin && activeStu && (
        <div style={{
          fontSize: 11, color: C.text2, marginBottom: 12,
          padding: '8px 14px', background: C.card, borderRadius: 10,
          border: `1px solid ${C.border}`, display: 'inline-flex', gap: 16,
        }}>
          <span>🎓 <b>{activeStu.name}</b></span>
          <span>🏛️ {activeStu.dept}</span>
          <span>📅 Year {activeStu.year}</span>
          <span>🆔 {activeStu.id}</span>
        </div>
      )}
      {!isAdmin && <div style={{ fontSize: 12, color: C.text2, marginBottom: 20 }}>{t('fee_sub')}</div>}

      {/* ── Summary cards ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          [t('total_fees'),  `$${totalFees.toFixed(2)}`,  C.blue,    '📋'],
          [t('paid'),        `$${totalPaid.toFixed(2)}`,  '#10b981', '✅'],
          ['Aid Received',   `$${totalAid.toFixed(2)}`,   '#8b5cf6', '🎁'],
          [t('balance'),     `$${Math.max(0, balance).toFixed(2)}`, balance > 0 ? '#ef4444' : '#10b981', balance > 0 ? '⚠️' : '✅'],
        ].map(([label, val, col, icon]) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{
              flex: 1, minWidth: 140, background: C.card,
              borderRadius: 14, border: `1px solid ${col}33`,
              padding: '16px 18px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: col }}>{val}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ marginBottom: 24, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Payment Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
            {totalFees > 0 ? Math.round((totalPaid + totalAid) / totalFees * 100) : 0}% covered
          </span>
        </div>
        <div style={{ height: 10, background: C.bg3, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, totalFees > 0 ? (totalPaid / totalFees) * 100 : 0)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#10b981', borderRadius: 6 }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, totalFees > 0 ? ((totalPaid + totalAid) / totalFees) * 100 : 0)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(90deg,#10b981,#8b5cf6)', borderRadius: 6 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.text3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} /> Paid
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.text3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#8b5cf6' }} /> Aid
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.text3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: C.bg3, border: `1px solid ${C.border}` }} /> Remaining
          </div>
        </div>
      </div>

      {/* ── Admin toolbar ── */}
      {isAdmin && (
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={() => setShowAddForm(v => !v)}
            style={{
              background: showAddForm ? C.card : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              border: showAddForm ? `1px solid ${C.border}` : 'none',
              borderRadius: 10, padding: '9px 18px', fontSize: 12, fontWeight: 700,
              color: showAddForm ? C.text2 : '#fff', cursor: 'pointer',
            }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Fee Record'}
          </button>

          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 12, background: C.card, borderRadius: 14, border: `1px solid ${C.blue}`, padding: '18px 20px' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>New Fee Record</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Description</div>
                  <select value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}>
                    {DESCRIPTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Month</div>
                  <select value={addForm.month} onChange={e => setAddForm(f => ({ ...f, month: e.target.value }))}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Amount ($)</div>
                  <input type="number" min="0" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 800"
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Status</div>
                  <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', height: 36, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 10px', fontSize: 12, color: C.text }}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <button onClick={addFeeRecord}
                style={{ background: C.green, border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                ✅ Add Record
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[['fees','💳 Fee History'],['aid','🎁 Financial Aid']].map(([id,label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            style={{
              padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: tab === id ? C.blue : C.card,
              color: tab === id ? '#fff' : C.text2,
              border: `1px solid ${tab === id ? C.blue : C.border}`,
              transition: 'all 0.15s',
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── Fee records ── */}
      {tab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {records.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: C.card, borderRadius: 14,
                border: `1px solid ${rec.status === 'paid' ? '#10b98133' : '#f59e0b33'}`,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              {/* Timeline dot */}
              <div style={{ flexShrink: 0, textAlign: 'center', width: 44 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', margin: '0 auto',
                  background: rec.status === 'paid' ? '#10b98120' : '#f59e0b20',
                  border: `2px solid ${rec.status === 'paid' ? '#10b981' : '#f59e0b'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {rec.status === 'paid' ? '✅' : '⏳'}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{rec.description}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  {rec.month}
                  {rec.paidDate && ` · Paid on ${rec.paidDate}`}
                  {rec.method && ` · via ${rec.method}`}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: rec.status === 'paid' ? '#10b981' : '#f59e0b' }}>
                  ${rec.amount.toFixed(2)}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700, marginTop: 4,
                  padding: '2px 8px', borderRadius: 20,
                  background: rec.status === 'paid' ? '#10b98120' : '#f59e0b20',
                  color: rec.status === 'paid' ? '#10b981' : '#f59e0b',
                }}>
                  {rec.status.toUpperCase()}
                </div>
              </div>

              {rec.status === 'paid' && !isAdmin && (
                <button
                  onClick={() => downloadReceipt(rec, activeStu?.name || 'Student', fromAPI)}
                  title={t('download_receipt')}
                  style={{
                    flexShrink: 0, background: C.bg3, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '6px 12px', fontSize: 11,
                    fontWeight: 600, color: C.text2, cursor: 'pointer',
                  }}
                >
                  ⬇️ Receipt
                </button>
              )}
              {rec.status === 'pending' && !isAdmin && (
                <button
                  disabled={payingId === rec.id}
                  onClick={async () => {
                    setPayingId(rec.id);
                    try {
                      await initiatePaymobPayment(activeStu, rec.amount, rec.id);
                    } catch (err) {
                      alert('Payment failed to start. Please try again.');
                      console.error(err);
                    } finally {
                      setPayingId(null);
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    background: payingId === rec.id
                      ? '#94a3b8'
                      : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none',
                    borderRadius: 8, padding: '6px 14px', fontSize: 11,
                    fontWeight: 700, color: '#fff',
                    cursor: payingId === rec.id ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  }}
                >
                  {payingId === rec.id ? '⏳ Loading...' : '💳 Pay Now'}
                </button>
              )}
              {isAdmin && rec.status === 'pending' && (
                <button onClick={() => markAsPaid(rec.id)} style={{ flexShrink: 0, background: '#10b98120', border: '1px solid #10b98150', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#10b981', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ✅ Mark Paid
                </button>
              )}
              {isAdmin && rec.status === 'paid' && (feeOverrides[rec.id] || customRecords.some(r => r.id === rec.id)) && (
                <button onClick={() => revertToPending(rec.id)} style={{ flexShrink: 0, background: '#f59e0b20', border: '1px solid #f59e0b50', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#f59e0b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ↩️ Revert
                </button>
              )}
              {isAdmin && (
                <button onClick={() => deleteRecord(rec.id)} style={{ flexShrink: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }} title="Delete record">
                  🗑️
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Financial aid records ── */}
      {tab === 'aid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {aid.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.text3, padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No financial aid records found</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 8 }}>
                Contact the Financial Aid office for assistance
              </div>
            </div>
          ) : aid.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                background: C.card, borderRadius: 14,
                border: `1px solid #8b5cf633`,
                padding: '18px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#8b5cf620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>🎓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.type}</div>
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{item.description}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>Applied: {item.appliedDate}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>
                    −${item.amount.toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginTop: 4,
                    background: '#10b98120', color: '#10b981',
                  }}>
                    {item.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
