/**
 * ProfilePage — user profile & settings for all roles.
 * Shows editable name, email, bio, phone, photo (base64).
 * Doctor role gets extra research fields.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api, getToken } from '../api';
import { pushToast } from '../components/NotificationToast';

export default function ProfilePage({ theme: C, user }) {
  const [profile, setProfile]   = useState(null);
  const [saving,  setSaving]    = useState(false);
  const [form,    setForm]      = useState({});
  const [pwForm,  setPwForm]    = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [tab,     setTab]       = useState('profile'); // 'profile' | 'password'
  const fileRef = useRef();

  useEffect(() => {
    if (!getToken()) {
      // Local-auth mode: pre-fill from the user prop so the page isn't blank
      setForm({
        full_name: user?.name || '',
        email:     user?.email || '',
        bio: '', phone: '', photo: user?.photoUrl || '',
        title: '', department: '', doctor_bio: '',
        research_interests: '', website: '', office_location: '',
      });
      return;
    }
    api.getMyProfile().then(p => {
      setProfile(p);
      setForm({
        full_name:          p.full_name           || '',
        email:              p.email               || '',
        bio:                p.bio                 || '',
        phone:              p.phone               || '',
        photo:              p.photo               || '',
        // Doctor-specific
        title:              p.title               || '',
        department:         p.department          || '',
        doctor_bio:         p.doctor_bio          || '',
        research_interests: p.research_interests  || '',
        website:            p.website             || '',
        office_location:    p.office_location     || '',
      });
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { pushToast({ title: 'Photo too large', message: 'Max 2 MB', color: C.red }); return; }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateMyProfile(form);
      pushToast({ title: 'Profile saved', message: 'Your profile has been updated.', color: C.green });
    } catch (err) {
      pushToast({ title: 'Save failed', message: err.message, color: C.red });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (pwForm.new_password !== pwForm.confirm) {
      pushToast({ title: 'Passwords do not match', color: C.red }); return;
    }
    if (pwForm.new_password.length < 6) {
      pushToast({ title: 'Password too short', message: 'Min 6 characters', color: C.red }); return;
    }
    setPwSaving(true);
    try {
      await api.changePassword(pwForm.old_password, pwForm.new_password);
      pushToast({ title: 'Password changed', color: C.green });
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      pushToast({ title: 'Failed', message: err.message, color: C.red });
    } finally {
      setPwSaving(false);
    }
  }

  const isDoctor = profile?.role === 'doctor';

  const inputStyle = {
    width: '100%', background: C.bg3, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '9px 12px', color: C.text,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 12, color: C.text2, marginBottom: 4, display: 'block', fontWeight: 600 };

  const Field = ({ label, name, type = 'text', rows }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {rows ? (
        <textarea
          name={name} value={form[name] || ''} onChange={handleChange}
          rows={rows}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      ) : (
        <input
          type={type} name={name} value={form[name] || ''} onChange={handleChange}
          style={inputStyle}
        />
      )}
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: '0 auto' }}>
      <h2 style={{ color: C.text, marginBottom: 4, fontSize: 22 }}>👤 My Profile</h2>
      <p style={{ color: C.text2, marginBottom: 24, fontSize: 14 }}>
        Manage your account information and security settings.
      </p>

      {/* Auth notice — shown when user is in local/offline mode */}
      {!getToken() && (
        <div style={{
          background: '#f59e0b18', border: '1px solid #f59e0b44',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <div>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>Server login required</div>
            <div style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>
              Profile editing requires a live server connection. You can view your info below but changes won't be saved until you log in via the server.
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['profile', 'password'].map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: tab === t ? C.blue2 : C.bg3,
              color:      tab === t ? '#fff'  : C.text2,
            }}
          >{t === 'profile' ? '📋 Profile' : '🔒 Password'}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div style={{ background: C.card, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
          {/* Photo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
                background: C.bg3, border: `2px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}
            >
              {form.photo
                ? <img src={form.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="photo" />
                : <span style={{ fontSize: 32 }}>👤</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>
                {form.full_name || user?.name}
              </div>
              <div style={{ color: C.text2, fontSize: 13, marginBottom: 8 }}>
                {profile?.role?.toUpperCase()} · {profile?.username}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 6,
                  background: C.bg3, border: `1px solid ${C.border}`,
                  color: C.text2, cursor: 'pointer',
                }}
              >📷 Change Photo</button>
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>

          {/* Core fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Full Name" name="full_name" />
            <Field label="Email" name="email" type="email" />
            <Field label="Phone" name="phone" />
            {isDoctor && <Field label="Title" name="title" />}
          </div>
          <Field label="Bio" name="bio" rows={3} />

          {/* Doctor-only fields */}
          {isDoctor && (
            <>
              <div style={{
                borderTop: `1px solid ${C.border}`, margin: '8px 0 20px',
                paddingTop: 16,
              }}>
                <div style={{ color: C.text2, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                  🔬 Research & Academic Info
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                  <Field label="Department" name="department" />
                  <Field label="Office Location" name="office_location" />
                  <Field label="Website / LinkedIn" name="website" />
                </div>
                <Field label="Research Interests (comma-separated)" name="research_interests" />
                <Field label="Academic Bio" name="doctor_bio" rows={4} />
              </div>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={saving}
            style={{
              padding: '10px 28px', borderRadius: 8, border: 'none',
              background: C.blue2, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving…' : '💾 Save Profile'}</motion.button>
        </div>
      )}

      {tab === 'password' && (
        <div style={{ background: C.card, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 380 }}>
            {['old_password', 'new_password', 'confirm'].map(field => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  {field === 'old_password' ? 'Current Password'
                   : field === 'new_password' ? 'New Password'
                   : 'Confirm New Password'}
                </label>
                <input
                  type="password" value={pwForm[field]}
                  onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                  style={inputStyle}
                  placeholder={field === 'old_password' ? 'Enter current password' : ''}
                />
              </div>
            ))}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleChangePassword} disabled={pwSaving}
              style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: C.blue2, color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: pwSaving ? 'not-allowed' : 'pointer', opacity: pwSaving ? 0.7 : 1,
              }}
            >{pwSaving ? 'Changing…' : '🔒 Change Password'}</motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
