import { useState, useEffect } from 'react';
import store from '../dataStore';
import { useLang } from '../context/LanguageContext';
import useMobile from '../hooks/useMobile';

const ROLE_COLORS = { doctor: '#8b5cf6', admin: '#10b981', student: '#3b82f6', parent: '#f59e0b' };
const KIND_ICON = { grade:'📝', appeal:'📋', new_appeal:'📋', attendance:'⚠️', warning:'⚠️', danger:'🚨', info:'ℹ️' };

export default function Topbar({ theme: C, user, pageTitle, isDark, onToggleMode, onLogout, onMenuOpen }) {
  const { lang, toggleLang, isRTL, t } = useLang();
  const isMobile = useMobile();
  const roleColor = ROLE_COLORS[user?.role] || '#3b82f6';
  const initials  = user?.initials || user?.name?.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') || '??';
  const [notifOpen, setNotifOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [, refresh] = useState(0);

  // Poll every 2 seconds so the badge updates when other components add notifications
  useEffect(() => {
    const id = setInterval(() => refresh(n => n + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const notifications = store.getUserNotifications(user) || [];
  const unread = notifications.filter(n => !n.read).length;

  function markRead(id) { store.markAlertRead(id); refresh(n=>n+1); }
  function markAll()    { store.markAllUserAlertsRead(user); setNotifOpen(false); refresh(n=>n+1); }

  return (
    <div style={{
      height: 64, background: C.card, display: 'flex', alignItems: 'center',
      paddingLeft: isRTL ? 16 : 24, paddingRight: isRTL ? 24 : 16,
      borderBottom: `1px solid ${C.border}`,
      flexShrink: 0, position: 'relative', zIndex: 10,
      flexDirection: isRTL ? 'row-reverse' : 'row',
    }}>
      {/* Hamburger — mobile only */}
      {isMobile && (
        <button onClick={onMenuOpen} style={{
          background: 'none', border: 'none', fontSize: 22, color: C.text,
          cursor: 'pointer', padding: '4px 8px', marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0,
          lineHeight: 1, flexShrink: 0,
        }}>☰</button>
      )}

      {/* Breadcrumb */}
      <div style={{ flex: 1, fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.text, textAlign: isRTL ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageTitle}</div>

      {/* Right (or left in RTL) controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setNotifOpen(o => !o)} style={{
            background: notifOpen ? C.blue3 : C.bg3,
            border: `1px solid ${notifOpen ? C.blue3 : C.border}`,
            borderRadius: 20, width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', position: 'relative',
          }}>
            🔔
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 17, height: 17, fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${C.card}`,
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {/* Backdrop */}
          {notifOpen && <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={() => setNotifOpen(false)}/>}

          {/* Dropdown panel */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 46, right: 0, width: isMobile ? 'calc(100vw - 24px)' : 340, maxHeight: 440,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 1000, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:0, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, flex:1, textAlign: isRTL ? 'right' : 'left' }}>
                  {t('notifications')} {unread > 0 && <span style={{ color:C.blue }}>({unread})</span>}
                </div>
                {unread > 0 && (
                  <button onClick={markAll} style={{ background:'none', border:'none', fontSize:11, color:C.blue, cursor:'pointer', fontWeight:700 }}>
                    {t('mark_all_read')}
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ overflowY:'auto', flex:1 }}>
                {notifications.length === 0
                  ? <div style={{ padding:32, textAlign:'center', color:C.text3, fontSize:12 }}>{t('no_notifications')}</div>
                  : notifications.slice(0, 40).map((n, i) => {
                    const icon = KIND_ICON[n.alertKind] || KIND_ICON[n.type] || '🔔';
                    const timeStr = (() => {
                      try { return new Date(n.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
                      catch { return ''; }
                    })();
                    return (
                      <div key={i} onClick={() => markRead(n.id)} style={{
                        padding:'11px 16px', borderBottom:`1px solid ${C.border}`,
                        background: n.read ? 'transparent' : `${C.blue}18`,
                        cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start',
                        transition:'background 0.1s',
                      }}>
                        <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>{n.title}</div>
                          <div style={{ fontSize:11, color:C.text3, lineHeight:1.4, wordBreak:'break-word' }}>{n.message}</div>
                          {timeStr && <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>{timeStr}</div>}
                        </div>
                        {!n.read && <div style={{ width:8, height:8, borderRadius:'50%', background:C.blue, flexShrink:0, marginTop:4 }}/>}
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>

        {/* Support button */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setSupportOpen(o => !o)} title="Help & Support" style={{
            background: supportOpen ? '#7c3aed22' : C.bg3,
            border: `1px solid ${supportOpen ? '#7c3aed' : C.border}`,
            borderRadius: 20, width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, cursor: 'pointer',
          }}>🎧</button>

          {supportOpen && <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={() => setSupportOpen(false)}/>}

          {supportOpen && (
            <div style={{
              position: 'absolute', top: 46, right: 0, width: 280,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 1000, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}`, background: 'linear-gradient(135deg,#7c3aed18,#3b82f618)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>🎧 Help & Support</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>We're here to help you</div>
              </div>

              {/* Options */}
              <div style={{ padding: '8px 0' }}>
                {[
                  { icon: '📧', label: 'Email Support', sub: 'support@edusense.io', action: () => window.open('mailto:support@edusense.io') },
                  { icon: '📖', label: 'User Guide', sub: 'How to use EduSense', action: () => window.open('https://edusense.io/guide', '_blank') },
                  { icon: '🐛', label: 'Report a Bug', sub: 'Tell us what went wrong', action: () => window.open('mailto:support@edusense.io?subject=Bug Report') },
                  { icon: '💬', label: 'Live Chat', sub: 'Chat with our team', action: () => window.open('mailto:support@edusense.io?subject=Live Chat Request') },
                ].map((item, i) => (
                  <button key={i} onClick={() => { item.action(); setSupportOpen(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg3}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: C.bg3 }}>
                <div style={{ fontSize: 10, color: C.text3, textAlign: 'center' }}>
                  EduSense v2.0 · <span style={{ color: '#7c3aed' }}>edusense.io</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language toggle */}
        <button onClick={toggleLang} title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'} style={{
          background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 20,
          padding: isMobile ? '7px 10px' : '7px 14px', fontSize: 11, fontWeight: 700, color: C.text2,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <span>{lang === 'en' ? '🇦🇪' : '🇬🇧'}</span>
          {!isMobile && <span>{lang === 'en' ? 'عربي' : 'EN'}</span>}
        </button>

        {/* Mode toggle */}
        <button onClick={onToggleMode} style={{
          background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 20,
          padding: isMobile ? '7px 10px' : '7px 14px', fontSize: 11, fontWeight: 700, color: C.text2,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <span>{isDark ? '☀️' : '🌙'}</span>
          {!isMobile && <span>{isDark ? t('light') : t('dark')}</span>}
        </button>

        {!isMobile && <div style={{ width:1, height:36, background:C.border }}/>}

        {/* Avatar */}
        <div style={{
          width:34, height:34, borderRadius:'50%', background:roleColor,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700, color:'#fff', flexShrink:0,
          overflow:'hidden', border:`2px solid ${roleColor}`,
        }}>
          {user?.photoUrl
            ? <img src={user.photoUrl} alt={initials} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : null}
          <span style={{ display: user?.photoUrl ? 'none' : 'flex' }}>{initials}</span>
        </div>

        {/* Name + role — desktop only */}
        {!isMobile && (
          <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{user?.name || 'User'}</div>
            <div style={{ fontSize:10, color:C.text3 }}>{(user?.role||'').replace(/^\w/,c=>c.toUpperCase())}</div>
          </div>
        )}

        {/* Sign out */}
        <button onClick={onLogout} style={{
          background: C.red_dim, border: `1px solid ${C.red}`, borderRadius:8,
          padding: isMobile ? '8px 10px' : '8px 14px', fontSize:11, color:C.red2, fontWeight:600, cursor:'pointer',
        }}
          onMouseEnter={e=>e.currentTarget.style.background=C.red}
          onMouseLeave={e=>e.currentTarget.style.background=C.red_dim}
        >{isMobile ? '⏻' : t('sign_out')}</button>
      </div>
    </div>
  );
}
