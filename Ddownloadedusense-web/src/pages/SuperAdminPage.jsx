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
  const [importOpen,   setImportOpen]   = useState('');   // schema name that has panel open
  const [importBusy,   setImportBusy]   = useState('');   // 'csv:schema' | 'photo:schema'
  const [importResult, setImportResult] = useState({});   // { schema: { csv, photo } }

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

      // Fetch stats for each tenant in parallel
      const statsMap = {};
      await Promise.all(data.map(async t => {
        try {
          const sr = await fetch(`${API}/api/super/tenants/${t.schema_name}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (sr.ok) statsMap[t.schema_name] = await sr.json();
        } catch {}
      }));
      setStats(statsMap);
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

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalStudents  = Object.values(stats).reduce((s, v) => s + (v.students || 0), 0);
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</span>
                        {badge(t.active)}
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
                          { label: 'Students', value: s.students ?? '–' },
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                      <button
                        onClick={() => copyDNS(t.domain)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: copied === t.domain ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
                          border: `1px solid ${copied === t.domain ? C.green : C.blue}44`,
                          color: copied === t.domain ? C.green : C.blue, cursor: 'pointer',
                        }}
                      >
                        {copied === t.domain ? '✓ Copied!' : '📋 Copy DNS'}
                      </button>
                      <button
                        onClick={() => toggleActive(t)}
                        disabled={isbusy}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: t.active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          border: `1px solid ${t.active ? C.red : C.green}44`,
                          color: t.active ? C.red : C.green, cursor: 'pointer',
                        }}
                      >
                        {isbusy ? '…' : t.active ? '⏸ Deactivate' : '▶ Reactivate'}
                      </button>
                      <button
                        onClick={() => setImportOpen(v => v === t.schema_name ? '' : t.schema_name)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: 'rgba(168,85,247,0.1)',
                          border: `1px solid ${C.purple}44`,
                          color: C.purple, cursor: 'pointer',
                        }}
                      >
                        {importOpen === t.schema_name ? '✕ Close Import' : '⬆ Import Data'}
                      </button>
                    </div>
                  </div>

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
    </div>
  );
}
