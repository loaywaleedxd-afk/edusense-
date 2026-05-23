/**
 * SuperAdminPage.jsx
 * ==================
 * Secret superadmin dashboard — only reachable when role === 'superadmin'.
 * No navbar link. Accessed directly after login.
 *
 * Features:
 *  - List all registered universities with live stats
 *  - Add a new university (schema + domain)
 *  - Deactivate / reactivate a university
 *  - One-click DNS instruction copy
 */

import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const C = {
  bg:      '#0a0a0f',
  card:    '#13131a',
  border:  '#1e1e2e',
  text:    '#e2e8f0',
  text2:   '#94a3b8',
  text3:   '#64748b',
  green:   '#10b981',
  red:     '#ef4444',
  blue:    '#3b82f6',
  yellow:  '#f59e0b',
  purple:  '#a855f7',
  accent:  '#6366f1',
};

function badge(active) {
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
      color: active ? C.green : C.red,
      border: `1px solid ${active ? C.green : C.red}44`,
    }}>
      {active ? '● Active' : '○ Inactive'}
    </span>
  );
}

export default function SuperAdminPage({ user, onLogout }) {
  const token = localStorage.getItem('edusense_token') || '';

  const [tenants,   setTenants]   = useState([]);
  const [stats,     setStats]     = useState({});   // { schema: {...} }
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [copied,    setCopied]    = useState('');
  const [busy,      setBusy]      = useState('');   // schema being acted on

  const [form, setForm] = useState({
    schema_name: '', name: '', domain: '', contact_email: '',
  });
  const [formErr, setFormErr] = useState('');

  // ── Import panel state ──────────────────────────────────────────────────────
  const [importOpen,   setImportOpen]   = useState('');
  const [importBusy,   setImportBusy]   = useState('');
  const [importResult, setImportResult] = useState({});

  // ── Admin creation modal ─────────────────────────────────────────────────────
  const [adminModal,  setAdminModal]  = useState('');   // schema name
  const [adminForm,   setAdminForm]   = useState({ username:'', full_name:'', email:'', password:'' });
  const [adminBusy,   setAdminBusy]   = useState(false);
  const [adminResult, setAdminResult] = useState(null);

  // ── Subscription / billing panel ─────────────────────────────────────────────
  const [billingOpen,   setBillingOpen]   = useState('');
  const [billingForm,   setBillingForm]   = useState({});
  const [billingBusy,   setBillingBusy]   = useState(false);
  const [billingResult, setBillingResult] = useState(null);

  // ── Onboarding & storage (fetched per-tenant on demand) ──────────────────────
  const [onboarding, setOnboarding] = useState({});   // { schema: steps[] }
  const [storage,    setStorage]    = useState({});   // { schema: storage info }

  // ── Fetch tenant list ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    // Do NOT clear error here — action errors (toggleActive, handleCreate)
    // must stay visible after load() refreshes the list.
    // Each action clears the error itself at the start.
    try {
      const r = await fetch(`${API}/api/super/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setTenants(data);

      // Fetch stats + onboarding + storage for each tenant in parallel
      const statsMap = {}, onboardMap = {}, storageMap = {};
      await Promise.all(data.map(async t => {
        const h = { Authorization: `Bearer ${token}` };
        const sc = t.schema_name;
        try { const r = await fetch(`${API}/api/super/tenants/${sc}/stats`,      { headers: h }); if (r.ok) statsMap[sc]   = await r.json(); } catch {}
        try { const r = await fetch(`${API}/api/super/tenants/${sc}/onboarding`, { headers: h }); if (r.ok) onboardMap[sc] = await r.json(); } catch {}
        try { const r = await fetch(`${API}/api/super/tenants/${sc}/storage`,    { headers: h }); if (r.ok) storageMap[sc] = await r.json(); } catch {}
      }));
      setStats(statsMap);
      setOnboarding(onboardMap);
      setStorage(storageMap);
    } catch (e) {
      setError(e.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── Create tenant ───────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    if (!form.schema_name || !form.name || !form.domain) {
      setFormErr('Schema, name and domain are required.'); return;
    }
    setBusy('creating');
    try {
      const r = await fetch(`${API}/api/super/tenants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Failed to create');
      setShowForm(false);
      setForm({ schema_name: '', name: '', domain: '', contact_email: '' });
      await load();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy('');
    }
  }

  // ── Create Admin ────────────────────────────────────────────────────────────
  async function handleCreateAdmin(schema) {
    setAdminBusy(true); setAdminResult(null);
    try {
      const r = await fetch(`${API}/api/super/tenants/${schema}/create-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `Error ${r.status}`);
      setAdminResult({ ok: true, msg: `Admin '${adminForm.username}' created!` });
      setAdminForm({ username:'', full_name:'', email:'', password:'' });
      await load();
    } catch (e) {
      setAdminResult({ ok: false, msg: e.message });
    } finally {
      setAdminBusy(false);
    }
  }

  // ── Update subscription ──────────────────────────────────────────────────────
  async function handleBillingUpdate(schema) {
    setBillingBusy(true); setBillingResult(null);
    try {
      const r = await fetch(`${API}/api/super/tenants/${schema}/subscription`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(billingForm),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `Error ${r.status}`);
      setBillingResult({ ok: true, msg: 'Subscription updated!' });
      await load();
    } catch (e) {
      setBillingResult({ ok: false, msg: e.message });
    } finally {
      setBillingBusy(false);
    }
  }

  // ── Export data ──────────────────────────────────────────────────────────────
  function handleExport(schema) {
    const url = `${API}/api/super/tenants/${schema}/export`;
    const a   = document.createElement('a');
    a.href    = url;
    a.setAttribute('download', `${schema}_export.zip`);
    // Include auth token via fetch + blob (can't set headers on <a>)
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const burl = URL.createObjectURL(blob);
        a.href = burl;
        a.click();
        setTimeout(() => URL.revokeObjectURL(burl), 5000);
      });
  }

  // ── CSV template download (client-side, no server needed) ──────────────────
  function downloadCsvTemplate() {
    const csv = [
      'student_id,full_name,email,department,year,password',
      '231014001,Ahmed Mohamed,ahmed@uni.edu,Computer Science,2,Ahmed@2025',
      '231014002,Sara Ali,sara@uni.edu,Engineering,1,Sara@2025',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'students_template.csv';
    a.click();
  }

  // ── Upload CSV ──────────────────────────────────────────────────────────────
  async function handleCsvUpload(schema, file) {
    if (!file) return;
    setImportBusy(`csv:${schema}`);
    setImportResult(p => ({ ...p, [schema]: { ...p[schema], csv: null } }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/api/super/tenants/${schema}/import-students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `Error ${r.status}`);
      setImportResult(p => ({ ...p, [schema]: { ...p[schema], csv: d } }));
      await load();
    } catch (e) {
      setImportResult(p => ({ ...p, [schema]: { ...p[schema], csv: { error: e.message } } }));
    } finally {
      setImportBusy('');
    }
  }

  // ── Upload Photos ZIP ───────────────────────────────────────────────────────
  async function handlePhotoUpload(schema, file) {
    if (!file) return;
    setImportBusy(`photo:${schema}`);
    setImportResult(p => ({ ...p, [schema]: { ...p[schema], photo: null } }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/api/super/tenants/${schema}/import-photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `Error ${r.status}`);
      setImportResult(p => ({ ...p, [schema]: { ...p[schema], photo: d } }));
    } catch (e) {
      setImportResult(p => ({ ...p, [schema]: { ...p[schema], photo: { error: e.message } } }));
    } finally {
      setImportBusy('');
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────────────
  async function toggleActive(t) {
    setBusy(t.schema_name);
    setError('');
    try {
      let res;
      if (t.active) {
        res = await fetch(`${API}/api/super/tenants/${t.schema_name}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await fetch(`${API}/api/super/tenants/${t.schema_name}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || `Request failed (${res.status})`);
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setBusy('');
      await load();   // always reload, even on error
    }
  }

  // ── Copy DNS instruction ────────────────────────────────────────────────────
  function copyDNS(domain) {
    navigator.clipboard.writeText(`${domain}  →  A record  →  YOUR_VPS_IP`);
    setCopied(domain);
    setTimeout(() => setCopied(''), 2000);
  }

  // ── Summary stats (student_count now comes directly from list_tenants) ──────
  const totalStudents  = tenants.reduce((s, t) => s + (t.student_count ?? (stats[t.schema_name]?.students ?? 0)), 0);
  const totalUnis      = tenants.length;
  const activeUnis     = tenants.filter(t => t.active).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>EduSense</div>
            <div style={{ fontSize: 10, color: C.purple, fontWeight: 700, letterSpacing: 1 }}>SUPER ADMIN</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: C.text3 }}>{user?.name || 'superadmin'}</span>
          <button
            onClick={load}
            disabled={loading}
            title="Refresh all data"
            style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, fontSize: 14, cursor: 'pointer' }}
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <button
            onClick={onLogout}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, fontSize: 12, cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Universities', value: totalUnis, icon: '🏫', color: C.blue },
            { label: 'Active',             value: activeUnis, icon: '✅', color: C.green },
            { label: 'Total Students',     value: totalStudents.toLocaleString(), icon: '🎓', color: C.purple },
          ].map(s => (
            <div key={s.label} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ fontSize: 32 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Universities</div>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: '9px 20px', borderRadius: 10, background: C.accent,
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {showForm ? '✕ Cancel' : '+ Add University'}
          </button>
        </div>

        {/* ── Add form ── */}
        {showForm && (
          <form onSubmit={handleCreate} style={{
            background: C.card, border: `1px solid ${C.accent}44`, borderRadius: 14,
            padding: 24, marginBottom: 24,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>New University</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'schema_name', label: 'Schema slug', placeholder: 'harvard (lowercase, no spaces)' },
                { key: 'name',        label: 'University name', placeholder: 'Harvard University' },
                { key: 'domain',      label: 'Domain', placeholder: 'harvard.edusense.com' },
                { key: 'contact_email', label: 'Contact email', placeholder: 'admin@harvard.edu (optional)' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, color: C.text3, marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
            {formErr && (
              <div style={{ marginTop: 12, fontSize: 12, color: C.red, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                ⚠️ {formErr}
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={busy === 'creating'}
                style={{
                  padding: '9px 24px', borderRadius: 8, background: C.green,
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {busy === 'creating' ? 'Creating…' : '✓ Create University'}
              </button>
            </div>
          </form>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: C.red }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Tenant table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', color: C.text3, padding: 60 }}>Loading…</div>
        ) : tenants.length === 0 ? (
          <div style={{
            textAlign: 'center', color: C.text3, padding: 60,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏫</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No universities yet</div>
            <div style={{ fontSize: 13 }}>Click "Add University" to register the first one.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tenants.map(t => {
              const s = stats[t.schema_name] || {};
              const isbusy = busy === t.schema_name;
              return (
                <div key={t.schema_name} style={{
                  background: C.card, border: `1px solid ${t.active ? C.border : C.red + '33'}`,
                  borderRadius: 14, padding: '20px 24px',
                  opacity: t.active ? 1 : 0.65,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

                    {/* Left: info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</span>
                        {badge(t.active)}
                        {/* Plan badge */}
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: t.plan === 'enterprise' ? 'rgba(168,85,247,0.2)' : t.plan === 'pro' ? 'rgba(59,130,246,0.2)' : t.plan === 'basic' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.2)',
                          color: t.plan === 'enterprise' ? C.purple : t.plan === 'pro' ? C.blue : t.plan === 'basic' ? C.green : C.text3,
                          border: `1px solid ${t.plan === 'enterprise' ? C.purple : t.plan === 'pro' ? C.blue : t.plan === 'basic' ? C.green : C.text3}44`,
                          textTransform: 'uppercase', letterSpacing: 1,
                        }}>{t.plan || 'trial'}</span>
                        {/* Billing status badge */}
                        {t.billing_status && t.billing_status !== 'trial' && (
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                            background: t.billing_status === 'active' ? 'rgba(16,185,129,0.12)' : t.billing_status === 'suspended' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                            color: t.billing_status === 'active' ? C.green : t.billing_status === 'suspended' ? C.red : C.yellow,
                            border: `1px solid ${t.billing_status === 'active' ? C.green : t.billing_status === 'suspended' ? C.red : C.yellow}44`,
                          }}>{t.billing_status}</span>
                        )}
                        {/* Expiry warning */}
                        {t.expires_at && (() => {
                          const daysLeft = Math.ceil((new Date(t.expires_at) - Date.now()) / 86400000);
                          if (daysLeft <= 7 && daysLeft > 0)
                            return <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>⚠ Expires in {daysLeft}d</span>;
                          if (daysLeft <= 0)
                            return <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>⚠ EXPIRED</span>;
                        })()}
                      </div>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: C.text3 }}>
                          🔑 <code style={{ color: C.yellow }}>{t.schema_name}</code>
                        </span>
                        <span style={{ fontSize: 12, color: C.text3 }}>
                          🌐 <span style={{ color: C.blue }}>{t.domain}</span>
                        </span>
                        {t.contact_email && (
                          <span style={{ fontSize: 12, color: C.text3 }}>
                            ✉️ {t.contact_email}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: C.text3 }}>
                          📅 {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Users',    value: s.users    ?? '–' },
                          { label: 'Students', value: t.student_count ?? s.students ?? '–' },
                          { label: 'Courses',  value: s.lectures ?? '–' },
                          { label: 'Emotions', value: (s.emotion_records ?? '–').toLocaleString?.() ?? s.emotion_records ?? '–' },
                          { label: 'Present',  value: s.attendance_present ?? '–' },
                        ].map(st => (
                          <div key={st.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{st.value}</div>
                            <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{st.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 148 }}>
                      {[
                        { label: copied === t.domain ? '✓ Copied!' : '📋 Copy DNS',
                          bg: copied === t.domain ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
                          border: copied === t.domain ? C.green : C.blue,
                          color:  copied === t.domain ? C.green : C.blue,
                          onClick: () => copyDNS(t.domain) },
                        { label: '👤 Create Admin',
                          bg: 'rgba(59,130,246,0.12)', border: C.blue, color: C.blue,
                          onClick: () => { setAdminModal(t.schema_name); setAdminResult(null); setAdminForm({ username:'', full_name:'', email:'', password:'' }); } },
                        { label: '💳 Subscription',
                          bg: 'rgba(245,158,11,0.12)', border: C.yellow, color: C.yellow,
                          onClick: () => { setBillingOpen(v => v === t.schema_name ? '' : t.schema_name); setBillingResult(null); setBillingForm({ plan: t.plan, billing_status: t.billing_status, expires_at: t.expires_at ? t.expires_at.slice(0,10) : '', face_recognition_enabled: t.face_recognition_enabled, max_students: t.max_students }); } },
                        { label: '⬆ Import Data',
                          bg: 'rgba(168,85,247,0.1)', border: C.purple, color: C.purple,
                          onClick: () => setImportOpen(v => v === t.schema_name ? '' : t.schema_name) },
                        { label: '💾 Export ZIP',
                          bg: 'rgba(16,185,129,0.1)', border: C.green, color: C.green,
                          onClick: () => handleExport(t.schema_name) },
                        { label: isbusy ? '…' : t.active ? '⏸ Deactivate' : '▶ Reactivate',
                          bg: t.active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          border: t.active ? C.red : C.green,
                          color:  t.active ? C.red : C.green,
                          onClick: () => toggleActive(t), disabled: isbusy },
                      ].map((btn, bi) => (
                        <button key={bi} onClick={btn.onClick} disabled={btn.disabled}
                          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: btn.bg, border: `1px solid ${btn.border}44`,
                            color: btn.color, cursor: btn.disabled ? 'not-allowed' : 'pointer' }}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Onboarding progress + Storage ── */}
                  {(() => {
                    const ob = onboarding[t.schema_name];
                    const st = storage[t.schema_name];
                    if (!ob && !st) return null;
                    return (
                      <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {ob && (
                          <div style={{ flex: 2, minWidth: 200 }}>
                            <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Onboarding {ob.completed}/{ob.total}
                            </div>
                            <div style={{ height: 4, background: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                              <div style={{ height: '100%', width: `${ob.percent}%`, background: ob.percent === 100 ? C.green : C.blue, borderRadius: 4, transition: 'width 0.4s' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {ob.steps.map(step => (
                                <span key={step.key} style={{ fontSize: 10, color: step.done ? C.green : C.text3 }}>
                                  {step.done ? '✓' : '○'} {step.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {st && (
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Storage ~{st.total_size_mb} MB
                            </div>
                            <div style={{ height: 4, background: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                              <div style={{ height: '100%', width: `${Math.min(100, (st.total_size_mb / 500) * 100)}%`, background: C.purple, borderRadius: 4 }} />
                            </div>
                            <div style={{ fontSize: 10, color: C.text3 }}>
                              {st.total_rows.toLocaleString()} rows · {st.photos.count} photos ({st.photos.size_mb} MB)
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Billing / Subscription Panel ── */}
                  {billingOpen === t.schema_name && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: C.yellow }}>💳 Subscription Settings</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                        {/* Plan */}
                        <div>
                          <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>Plan</div>
                          <select value={billingForm.plan || 'trial'} onChange={e => setBillingForm(p => ({...p, plan: e.target.value}))}
                            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', color: C.text, fontSize: 12 }}>
                            {['trial','basic','pro','enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                          </select>
                        </div>
                        {/* Billing Status */}
                        <div>
                          <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>Billing Status</div>
                          <select value={billingForm.billing_status || 'trial'} onChange={e => setBillingForm(p => ({...p, billing_status: e.target.value}))}
                            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', color: C.text, fontSize: 12 }}>
                            {['trial','active','overdue','suspended'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                          </select>
                        </div>
                        {/* Expiry */}
                        <div>
                          <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>Expires</div>
                          <input type="date" value={billingForm.expires_at || ''}
                            onChange={e => setBillingForm(p => ({...p, expires_at: e.target.value}))}
                            style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', color: C.text, fontSize: 12 }} />
                        </div>
                        {/* Max Students */}
                        <div>
                          <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>Max Students</div>
                          <input type="number" value={billingForm.max_students || 500}
                            onChange={e => setBillingForm(p => ({...p, max_students: parseInt(e.target.value)||500}))}
                            style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', color: C.text, fontSize: 12 }} />
                        </div>
                        {/* Face Recognition toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: 'span 2' }}>
                          <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, textTransform: 'uppercase' }}>Face Recognition</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <div onClick={() => setBillingForm(p => ({...p, face_recognition_enabled: !p.face_recognition_enabled}))}
                              style={{ width: 38, height: 20, borderRadius: 10, background: billingForm.face_recognition_enabled ? C.green : C.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                              <div style={{ position: 'absolute', top: 2, left: billingForm.face_recognition_enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                            </div>
                            <span style={{ fontSize: 11, color: billingForm.face_recognition_enabled ? C.green : C.text3 }}>
                              {billingForm.face_recognition_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </div>
                      </div>
                      {billingResult && (
                        <div style={{ fontSize: 11, marginBottom: 10, padding: '7px 12px', borderRadius: 7,
                          color: billingResult.ok ? C.green : C.red,
                          background: billingResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                          {billingResult.ok ? '✓' : '⚠'} {billingResult.msg}
                        </div>
                      )}
                      <button onClick={() => handleBillingUpdate(t.schema_name)} disabled={billingBusy}
                        style={{ padding: '8px 20px', borderRadius: 8, background: C.yellow, border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {billingBusy ? 'Saving…' : '💾 Save Subscription'}
                      </button>
                    </div>
                  )}

                  {/* ── Import Panel ── */}
                  {importOpen === t.schema_name && (
                    <div style={{
                      marginTop: 20, paddingTop: 20,
                      borderTop: `1px solid ${C.border}`,
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                    }}>

                      {/* CSV Column */}
                      <div style={{ background: C.bg, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📋 Import Students (CSV)</div>
                        <div style={{ fontSize: 11, color: C.text3, marginBottom: 12, lineHeight: 1.6 }}>
                          Upload a CSV file with columns:<br />
                          <code style={{ color: C.yellow, fontSize: 10 }}>student_id, full_name, email, department, year, password</code>
                        </div>
                        <button
                          onClick={downloadCsvTemplate}
                          style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: 'rgba(245,158,11,0.1)', border: `1px solid ${C.yellow}44`,
                            color: C.yellow, cursor: 'pointer', marginBottom: 10, display: 'block',
                          }}
                        >
                          ⬇ Download Template
                        </button>
                        <label style={{
                          display: 'block', padding: '10px 14px', borderRadius: 8,
                          border: `2px dashed ${C.purple}55`, textAlign: 'center',
                          cursor: 'pointer', fontSize: 12, color: C.text2,
                          background: 'rgba(168,85,247,0.05)',
                        }}>
                          {importBusy === `csv:${t.schema_name}` ? '⏳ Uploading…' : '📂 Click to choose CSV file'}
                          <input
                            type="file" accept=".csv" style={{ display: 'none' }}
                            disabled={!!importBusy}
                            onChange={e => handleCsvUpload(t.schema_name, e.target.files[0])}
                          />
                        </label>
                        {/* CSV result */}
                        {importResult[t.schema_name]?.csv && (() => {
                          const r = importResult[t.schema_name].csv;
                          if (r.error) return (
                            <div style={{ marginTop: 10, fontSize: 11, color: C.red, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 7 }}>
                              ⚠ {r.error}
                            </div>
                          );
                          return (
                            <div style={{ marginTop: 10, fontSize: 11, borderRadius: 7, padding: '10px 12px', background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.green}33` }}>
                              <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>✓ Import complete</div>
                              <div style={{ color: C.text2 }}>Created: <strong style={{ color: C.green }}>{r.created}</strong></div>
                              <div style={{ color: C.text2 }}>Skipped (already exist): <strong style={{ color: C.yellow }}>{r.skipped}</strong></div>
                              {r.errors?.length > 0 && (
                                <div style={{ marginTop: 6, color: C.red }}>
                                  Errors: {r.errors.slice(0, 3).map((e, i) => <div key={i} style={{ fontSize: 10 }}>{e}</div>)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Photos ZIP Column */}
                      <div style={{ background: C.bg, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🖼 Import Photos + Face Recognition (ZIP)</div>
                        <div style={{ fontSize: 11, color: C.text3, marginBottom: 12, lineHeight: 1.6 }}>
                          Upload a ZIP where each photo is named:<br />
                          <code style={{ color: C.yellow, fontSize: 10 }}>student_id.jpg</code> — e.g. <code style={{ color: C.yellow, fontSize: 10 }}>231014184.jpg</code><br />
                          Photos are saved and face encodings generated automatically.
                        </div>
                        <label style={{
                          display: 'block', padding: '10px 14px', borderRadius: 8,
                          border: `2px dashed ${C.blue}55`, textAlign: 'center',
                          cursor: 'pointer', fontSize: 12, color: C.text2,
                          background: 'rgba(59,130,246,0.05)', marginTop: 34,
                        }}>
                          {importBusy === `photo:${t.schema_name}` ? '⏳ Processing photos…' : '📂 Click to choose ZIP file'}
                          <input
                            type="file" accept=".zip" style={{ display: 'none' }}
                            disabled={!!importBusy}
                            onChange={e => handlePhotoUpload(t.schema_name, e.target.files[0])}
                          />
                        </label>
                        {/* Photo result */}
                        {importResult[t.schema_name]?.photo && (() => {
                          const r = importResult[t.schema_name].photo;
                          if (r.error) return (
                            <div style={{ marginTop: 10, fontSize: 11, color: C.red, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 7 }}>
                              ⚠ {r.error}
                            </div>
                          );
                          return (
                            <div style={{ marginTop: 10, fontSize: 11, borderRadius: 7, padding: '10px 12px', background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.green}33` }}>
                              <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>✓ Photos imported</div>
                              <div style={{ color: C.text2 }}>Face encoded: <strong style={{ color: C.green }}>{r.encoded}</strong></div>
                              <div style={{ color: C.text2 }}>Saved only: <strong style={{ color: C.yellow }}>{r.saved_only}</strong></div>
                              <div style={{ color: C.text2 }}>Failed: <strong style={{ color: C.red }}>{r.failed}</strong></div>
                              {r.note && <div style={{ marginTop: 6, color: C.text3, fontSize: 10 }}>{r.note}</div>}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Admin Modal ── */}
      {adminModal && (
      <div onClick={() => setAdminModal('')} style={{
        position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.card, borderRadius: 18, border: `1px solid ${C.border}`,
          padding: '28px 28px 24px', width: 420, maxWidth: '92vw',
          boxShadow: '0 28px 72px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>👤 Create Admin Account</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 3 }}>For schema: <code style={{ color: C.yellow }}>{adminModal}</code></div>
            </div>
            <button onClick={() => setAdminModal('')} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, width: 28, height: 28, fontSize: 13, color: C.text2, cursor: 'pointer' }}>✕</button>
          </div>
          {[
            { key: 'username',  label: 'Username',  placeholder: 'admin_harvard', type: 'text' },
            { key: 'full_name', label: 'Full Name',  placeholder: 'Dr. John Admin', type: 'text' },
            { key: 'email',     label: 'Email',      placeholder: 'admin@harvard.edu', type: 'email' },
            { key: 'password',  label: 'Password',   placeholder: 'Min 8 characters', type: 'password' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</div>
              <input type={f.type} value={adminForm[f.key]} placeholder={f.placeholder}
                onChange={e => setAdminForm(p => ({...p, [f.key]: e.target.value}))}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
            </div>
          ))}
          {adminResult && (
            <div style={{ fontSize: 12, marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              color: adminResult.ok ? C.green : C.red,
              background: adminResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
              {adminResult.ok ? '✓' : '⚠'} {adminResult.msg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleCreateAdmin(adminModal)} disabled={adminBusy}
              style={{ flex: 1, padding: '10px 0', borderRadius: 9, background: C.blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {adminBusy ? 'Creating…' : '✓ Create Admin'}
            </button>
            <button onClick={() => setAdminModal('')}
              style={{ padding: '10px 18px', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
