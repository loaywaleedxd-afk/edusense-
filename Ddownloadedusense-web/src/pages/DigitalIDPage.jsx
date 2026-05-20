import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import store from '../dataStore';
import { useLang } from '../context/LanguageContext';

function useQRCode(data) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!data) return;
    QRCode.toDataURL(data, { width: 160, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } })
      .then(setSrc).catch(() => setSrc(''));
  }, [data]);
  return src;
}

export default function DigitalIDPage({ theme: C, stu, user }) {
  const { t } = useLang();
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const photoUrl = stu?.capturedPhoto || store.getPhotoUrl(stu) || null;
  const qrData = JSON.stringify({
    id: stu?.id,
    name: stu?.name || user?.name,
    dept: stu?.dept,
    year: stu?.year,
    email: stu?.email || user?.email,
    issuer: 'EduSense University',
    ts: new Date().getFullYear(),
  });
  const qrSrc = useQRCode(qrData);

  const gpa = stu?.gpa || 0;
  const standing = store.getAcademicStanding?.(stu?.id) || 'Good Standing';

  async function downloadID() {
    setDownloading(true);
    try {
      // Use html2canvas approach via canvas
      const canvas = document.createElement('canvas');
      canvas.width = 540;
      canvas.height = 340;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 540, 340);
      grad.addColorStop(0, '#1e3a5f');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, 540, 340, 18);
      ctx.fill();

      // Header stripe
      const stripe = ctx.createLinearGradient(0, 0, 540, 0);
      stripe.addColorStop(0, '#3b82f6');
      stripe.addColorStop(1, '#6366f1');
      ctx.fillStyle = stripe;
      ctx.fillRect(0, 0, 540, 7);

      // Logo / institution
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui';
      ctx.fillText('⚡ EduSense University', 20, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px system-ui';
      ctx.fillText('OFFICIAL STUDENT IDENTIFICATION CARD', 20, 64);

      // Photo circle
      ctx.fillStyle = stu?.color || '#3b82f6';
      ctx.beginPath();
      ctx.arc(75, 185, 58, 0, Math.PI * 2);
      ctx.fill();

      if (photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            img.onload = res; img.onerror = rej;
            img.src = photoUrl;
          });
          ctx.save();
          ctx.beginPath();
          ctx.arc(75, 185, 56, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, 19, 129, 112, 112);
          ctx.restore();
        } catch {/* use color circle */}
      }

      // Emoji fallback
      if (!photoUrl) {
        ctx.font = '52px system-ui';
        ctx.fillText(stu?.emoji || '👤', 47, 207);
      }

      // Student info
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui';
      ctx.fillText(stu?.name || user?.name || 'Student', 150, 125);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px system-ui';
      ctx.fillText((stu?.dept || 'Computer Science').toUpperCase(), 150, 145);

      const fields = [
        ['Student ID', stu?.id || '—'],
        ['Year', `Year ${stu?.year || 1}`],
        ['GPA', `${gpa.toFixed?.(2) || gpa} / 4.00`],
        ['Status', standing],
      ];
      fields.forEach(([label, val], i) => {
        const y = 175 + i * 34;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '10px system-ui';
        ctx.fillText(label, 150, y);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui';
        ctx.fillText(val, 150, y + 16);
      });

      // QR code
      if (qrSrc) {
        const qrImg = new Image();
        await new Promise((res, rej) => {
          qrImg.onload = res; qrImg.onerror = rej;
          qrImg.src = qrSrc;
        });
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(398, 105, 122, 122, 10);
        ctx.fill();
        ctx.drawImage(qrImg, 403, 110, 112, 112);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px system-ui';
      ctx.fillText('Scan to verify', 420, 242);

      // Footer
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(0, 300, 540, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px system-ui';
      ctx.fillText(`Valid: Academic Year ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`, 20, 325);
      ctx.fillText('This card is property of EduSense University', 260, 325);

      // Download
      const link = document.createElement('a');
      link.download = `EduSense-ID-${stu?.id || 'student'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ padding: '8px 20px 40px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        🪪 {t('id_card_title')}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 28 }}>
        Your official digital student identification card
      </div>

      {/* ── Card flip container ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ perspective: 1000 }} ref={cardRef}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            style={{
              width: 480, height: 295,
              transformStyle: 'preserve-3d',
              position: 'relative', cursor: 'pointer',
            }}
            onClick={() => setFlipped(f => !f)}
          >
            {/* ── FRONT ── */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius: 18, overflow: 'hidden',
              background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              {/* Top stripe */}
              <div style={{
                height: 7,
                background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              }} />

              <div style={{ padding: '16px 22px 18px' }}>
                {/* Institution */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>EduSense University</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
                      OFFICIAL STUDENT IDENTIFICATION CARD
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>🎓</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                  {/* Photo */}
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: stu?.color || '#3b82f6',
                    border: '3px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {photoUrl
                      ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      : <span style={{ fontSize: 42 }}>{stu?.emoji || '👤'}</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                      {stu?.name || user?.name || 'Student'}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', marginBottom: 12 }}>
                      {(stu?.dept || 'Computer Science').toUpperCase()}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                      {[
                        [t('student_id'), stu?.id || '—'],
                        [t('year'), `Year ${stu?.year || 1}`],
                        ['GPA', `${gpa.toFixed?.(2) || gpa} / 4.00`],
                        ['Status', standing],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QR */}
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    {qrSrc ? (
                      <div style={{
                        background: '#fff', borderRadius: 10,
                        padding: 6, width: 88, height: 88,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <img src={qrSrc} alt="QR" style={{ width: 76, height: 76 }} />
                      </div>
                    ) : (
                      <div style={{ width: 88, height: 88, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        📱
                      </div>
                    )}
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{t('scan_qr')}</div>
                  </div>
                </div>
              </div>

              {/* Footer strip */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 36, background: 'rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', padding: '0 22px',
                justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                  Valid: {new Date().getFullYear()}–{new Date().getFullYear() + 1}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                  Click to flip →
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                  Property of EduSense University
                </div>
              </div>
            </div>

            {/* ── BACK ── */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 18, overflow: 'hidden',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <div style={{ height: 7, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              <div style={{ padding: '20px 24px' }}>
                {/* Mag stripe simulation */}
                <div style={{
                  height: 40, background: '#111827', borderRadius: 4, marginBottom: 20,
                  display: 'flex', alignItems: 'center', padding: '0 16px',
                }}>
                  <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg,#374151 0,#374151 4px,#1f2937 4px,#1f2937 8px)' }} />
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 14, letterSpacing: '0.08em' }}>
                      CARD DETAILS
                    </div>
                    {[
                      ['Full Name', stu?.name || user?.name || '—'],
                      ['Email', stu?.email || user?.email || '—'],
                      ['Department', stu?.dept || 'Computer Science'],
                      ['Academic Year', `Year ${stu?.year || 1}`],
                      ['GPA', `${gpa.toFixed?.(2) || gpa} / 4.00`],
                      ['Standing', standing],
                    ].map(([label, val]) => (
                      <div key={label} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {qrSrc && (
                      <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                        <img src={qrSrc} alt="QR" style={{ width: 110, height: 110 }} />
                        <div style={{ fontSize: 9, color: '#374151', marginTop: 4, fontWeight: 600 }}>SCAN TO VERIFY</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: 16, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                  fontSize: 9, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6,
                }}>
                  This card is the property of EduSense University. If found, please return to the Registrar's Office.
                  Unauthorized use is prohibited and subject to disciplinary action.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
        <motion.button
          onClick={() => setFlipped(f => !f)}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          style={{
            background: '#6366f122', border: '1px solid #6366f144',
            borderRadius: 12, padding: '11px 24px', fontSize: 13,
            fontWeight: 700, color: '#818cf8', cursor: 'pointer',
          }}
        >
          🔄 {t('flip_card')}
        </motion.button>
        <motion.button
          onClick={downloadID}
          disabled={downloading}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            border: 'none', borderRadius: 12, padding: '11px 28px',
            fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: downloading ? 'wait' : 'pointer',
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? '⏳ Generating…' : `⬇️ ${t('download_id')}`}
        </motion.button>
      </div>

      {/* ── Info ── */}
      <div style={{
        maxWidth: 480, margin: '24px auto 0',
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: '14px 18px', fontSize: 12, color: C.text2, lineHeight: 1.7,
      }}>
        <b style={{ color: C.text }}>ℹ️ About your Digital ID</b><br />
        • Click the card or the flip button to see front/back views.<br />
        • The QR code encodes your student details for verification.<br />
        • Use the Download button to save a PNG image of your ID.
      </div>
    </div>
  );
}
