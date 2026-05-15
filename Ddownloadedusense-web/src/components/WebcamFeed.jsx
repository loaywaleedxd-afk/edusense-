import { useRef, useEffect, useState, useCallback } from 'react';

const PYTHON_URL = 'http://localhost:8765';

const EMOTION_COLORS = {
  happy:    '#10b981',
  neutral:  '#3b82f6',
  surprised:'#a855f7',
  surprise: '#a855f7',
  angry:    '#ef4444',
  sad:      '#64748b',
  disgusted:'#84cc16',
  disgust:  '#84cc16',
  fearful:  '#f97316',
  fear:     '#f97316',
  confused: '#f59e0b',
  bored:    '#6b7280',
};

const EMOTION_EMOJI = {
  happy:'😊', neutral:'😐', surprised:'😲', surprise:'😲',
  angry:'😠', sad:'😢', disgusted:'🤢', disgust:'🤢',
  fearful:'😨', fear:'😨', confused:'🤔', bored:'😑',
};

export default function WebcamFeed({
  theme: C,
  onCapture,
  onFaceDetected,
  onEmotionDetected,
  mode = '',
  courseId = '',
  compact = false,
}) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef     = useRef(null);
  const busyRef     = useRef(false);   // prevent overlapping requests

  const [active,      setActive]      = useState(false);
  const [ready,       setReady]       = useState(false);
  const [captured,    setCaptured]    = useState(null);
  const [error,       setError]       = useState('');
  const [serverOk,    setServerOk]    = useState(null); // null=unknown, true, false
  const [faces,       setFaces]       = useState([]);
  const [analyzing,   setAnalyzing]   = useState(false);

  // ── Check Python server every 10 s ───────────────────────────────────────
  useEffect(() => {
    let alive = true;
    function check() {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 2000);
      fetch(`${PYTHON_URL}/health`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => { clearTimeout(tid); if (alive) setServerOk(d.status === 'ok'); })
        .catch(() => { if (alive) setServerOk(false); });
    }
    check();
    const id = setInterval(check, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ── Capture frame to base64 (natural orientation) ────────────────────────
  function grabFrame() {
    const vid    = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas || !ready) return null;
    canvas.width  = vid.videoWidth  || 640;
    canvas.height = vid.videoHeight || 480;
    canvas.getContext('2d').drawImage(vid, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  // ── Detection loop ───────────────────────────────────────────────────────
  const runLoop = useCallback(async () => {
    if (!active || !ready || busyRef.current) {
      loopRef.current = setTimeout(runLoop, 800);
      return;
    }
    const frame = grabFrame();
    if (!frame) { loopRef.current = setTimeout(runLoop, 800); return; }

    busyRef.current = true;
    setAnalyzing(true);
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 4000);
      const res  = await fetch(`${PYTHON_URL}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
        body:    JSON.stringify({ frame, course_id: courseId }),
        signal:  ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (data.detections?.length > 0) {
        setFaces(data.detections);
        setServerOk(true);
        onFaceDetected?.();
        const top = data.detections[0];
        onEmotionDetected?.(top.emotion, top.student_id, data.detections);
      } else {
        setFaces([]);
      }
    } catch {
      setServerOk(false);
      setFaces([]);
    }
    busyRef.current = false;
    setAnalyzing(false);
    if (active) loopRef.current = setTimeout(runLoop, 800);
  }, [active, ready, courseId, onFaceDetected, onEmotionDetected]);

  useEffect(() => {
    if (!active || !ready) { clearTimeout(loopRef.current); setFaces([]); return; }
    runLoop();
    return () => clearTimeout(loopRef.current);
  }, [active, ready]);

  // ── Camera control ───────────────────────────────────────────────────────
  async function startCamera() {
    setError(''); setReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API not supported in this browser.'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch (e) {
      const msgs = {
        NotAllowedError:  'Camera access denied — allow camera in your browser address bar.',
        NotFoundError:    'No camera found. Please connect a webcam.',
        NotReadableError: 'Camera is in use by another application.',
      };
      setError(msgs[e.name] || `Camera error: ${e.message}`);
    }
  }

  function stopCamera() {
    clearTimeout(loopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.load(); }
    setActive(false); setReady(false); setFaces([]); setCaptured(null);
  }

  async function captureFrame() {
    const frame = grabFrame();
    if (!frame) return;
    setCaptured(frame);

    // Also register face with Python server
    let studentRegistered = false;
    try {
      const res = await fetch(`${PYTHON_URL}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ frame, course_id: courseId }),
        signal:  AbortSignal.timeout(4000),
      });
      const data = await res.json();
      studentRegistered = data.total_faces > 0;
    } catch {}

    onCapture?.(frame, studentRegistered);
  }

  useEffect(() => () => stopCamera(), []);

  const h = compact ? 180 : 260;

  return (
    <div>
      {/* Server status bar */}
      {serverOk === false && (
        <div style={{
          fontSize: 11, color: '#fbbf24', background: '#2d1a00',
          border: '1px solid #f59e0b', borderRadius: 8,
          padding: '6px 12px', marginBottom: 6, lineHeight: 1.5,
        }}>
          ⚠️ Python server not running — start it with:<br/>
          <code style={{ fontSize: 10 }}>
            cd emotion_system &amp;&amp; .venv\Scripts\python.exe face_server.py
          </code>
        </div>
      )}
      {serverOk === true && (
        <div style={{
          fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.1)',
          border: '1px solid #10b981', borderRadius: 6,
          padding: '3px 10px', marginBottom: 6, display: 'inline-block',
        }}>
          🐍 Python AI Server Connected
        </div>
      )}

      {/* Video container */}
      <div style={{ position: 'relative', background: '#0f172a', borderRadius: 10, overflow: 'hidden', height: h }}>

        <video
          ref={videoRef}
          autoPlay muted playsInline
          onLoadedMetadata={() => setReady(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: active ? 'block' : 'none',
          }}
        />

        {/* Camera-off placeholder */}
        {!active && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8, color: '#475569' }}>
            <div style={{ fontSize: compact ? 32 : 48 }}>📷</div>
            <div style={{ fontSize: 11 }}>Camera Off</div>
          </div>
        )}

        {/* Starting spinner */}
        {active && !ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ color: '#fff', fontSize: 12 }}>Starting camera…</div>
          </div>
        )}

        {/* Face detection boxes (real, from Python) */}
        {active && ready && faces.map((f, i) => {
          const col  = EMOTION_COLORS[f.emotion] || '#3b82f6';
          const emoji = EMOTION_EMOJI[f.emotion]  || '😐';
          const conf  = Math.round(f.confidence * 100);
          const eng   = Math.round((f.engagement_score || 0) * 100);
          const label = f.student_id || 'Unknown';
          return (
            <div key={i} style={{
              position: 'absolute',
              left:  `${f.box.x}%`, top:  `${f.box.y}%`,
              width: `${f.box.w}%`, height: `${f.box.h}%`,
              border: `2px solid ${col}`, borderRadius: 4, pointerEvents: 'none',
            }}>
              {/* Corner brackets */}
              {[['0%','0%',0,1,0,1],['100%','0%',0,1,1,0],['0%','100%',1,0,0,1],['100%','100%',1,0,1,0]].map(([l,t,bt,bp,br,bl],k) => (
                <div key={k} style={{
                  position: 'absolute', left: l, top: t, width: 12, height: 12,
                  borderTop:    bp ? 'none' : `3px solid ${col}`,
                  borderBottom: bt ? 'none' : `3px solid ${col}`,
                  borderLeft:   br ? 'none' : `3px solid ${col}`,
                  borderRight:  bl ? 'none' : `3px solid ${col}`,
                  transform: `translate(${l==='100%'?'-100%':'0'},${t==='100%'?'-100%':'0'})`,
                }}/>
              ))}
              {/* Top: student ID */}
              <div style={{ position: 'absolute', top: -22, left: 0, fontSize: 9, color: '#fff', background: label !== 'Unknown' ? `${col}ee` : 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 700 }}>
                {label !== 'Unknown' ? `✓ ${label}` : '? Unknown'}
              </div>
              {/* Bottom: emotion + confidence */}
              <div style={{ position: 'absolute', bottom: -22, left: 0, fontSize: 9, color: '#fff', background: `${col}dd`, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 700 }}>
                {emoji} {f.emotion} {conf}% · eng {eng}%
              </div>
            </div>
          );
        })}

        {/* LIVE badge + mode + analyzing dot */}
        {active && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s infinite' }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>LIVE</span>
            </div>
            {mode && (
              <div style={{ background: 'rgba(0,0,0,0.72)', borderRadius: 20, padding: '3px 10px', fontSize: 9, fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap' }}>
                {mode}
              </div>
            )}
          </div>
        )}

        {/* Analyzing indicator */}
        {active && ready && analyzing && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(16,185,129,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: 9, color: '#fff', fontWeight: 700 }}>
            🐍 Analyzing…
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }}/>

      {error && (
        <div style={{ fontSize: 11, color: C.red2, marginTop: 6, background: C.red_dim, padding: '8px 12px', borderRadius: 8, lineHeight: 1.5 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={active ? stopCamera : startCamera}
          style={{
            flex: 1, height: 36, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: active ? C.red_dim : C.green,
            border: active ? `1px solid ${C.red}` : 'none',
            color: active ? C.red2 : '#fff',
          }}
        >
          {active ? '⏹ Stop Camera' : '▶ Start Camera'}
        </button>
        {active && ready && (
          <button
            onClick={captureFrame}
            style={{ flex: 1, height: 36, background: C.blue3, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
          >
            📸 Capture Frame
          </button>
        )}
      </div>

      {/* Captured preview */}
      {captured && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: C.text3, marginBottom: 4 }}>📸 Captured:</div>
          <img src={captured} alt="Captured" style={{ width: '100%', borderRadius: 8, border: `2px solid ${C.green}`, transform: 'scaleX(-1)' }}/>
        </div>
      )}
    </div>
  );
}
