import { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

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

const MODEL_URL = '/models';

// ── Two-tier model loading ────────────────────────────────────────────────────
// Tier 1 (base): emotion detection — must succeed for camera to work
// Tier 2 (full): landmarks + recognition — loaded separately so a failure
//                here doesn't block emotion detection
let baseLoaded  = false;
let baseLoading = false;
let fullLoaded  = false;

async function ensureModels() {
  if (baseLoaded) return true;
  if (baseLoading) {
    while (baseLoading) await new Promise(r => setTimeout(r, 100));
    return baseLoaded;
  }
  baseLoading = true;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    baseLoaded = true;
  } catch (e) {
    console.error('face-api base models failed to load', e);
  }
  baseLoading = false;
  return baseLoaded;
}

async function ensureFullModels() {
  if (fullLoaded) return true;
  await ensureModels(); // base must load first
  try {
    await Promise.all([
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    fullLoaded = true;
  } catch (e) {
    console.warn('face-api recognition models unavailable:', e.message);
  }
  return fullLoaded;
}

// ── Load an image from either an HTTP URL or a data: URI ─────────────────────
// Rejects after 6 seconds so a broken/slow URL never hangs the whole build.
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img   = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('img load timeout')), 6000);
    img.onload  = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('img load failed')); };
    img.src = src;
  });
}

// ── Build a FaceMatcher from {id, photo} student objects ─────────────────────
// photo can be an HTTP URL or a base64 data: URI.
// Resolves to null (never throws) so callers can always await safely.
// Hard limit of 50 s — if model download or photo scanning takes longer,
// returns null so the camera still works without recognition.
// Call this as early as possible (e.g. when DocLive panel opens) so the
// 6 MB recognition weights start downloading in the background.
export function prewarmRecognitionModels() {
  ensureFullModels().catch(() => {});
}

export async function buildFaceMatcher(students, onProgress) {
  // Race against a 150-second hard timeout (recognition model is ~6 MB)
  return Promise.race([
    _buildFaceMatcherCore(students, onProgress),
    new Promise(resolve => setTimeout(() => resolve(null), 150_000)),
  ]);
}

async function _buildFaceMatcherCore(students, onProgress) {
  try {
    const ok = await Promise.race([
      ensureFullModels(),
      new Promise(resolve => setTimeout(() => resolve(false), 120_000)),
    ]);
    if (!ok) return null; // recognition models failed/timed-out

    const labeled = [];
    let processed = 0;
    for (const s of students) {
      if (!s.photo) { processed++; continue; }
      try {
        const img = await loadImg(s.photo);
        const det = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (det) labeled.push(new faceapi.LabeledFaceDescriptors(s.id, [det.descriptor]));
      } catch {
        // skip students whose photo can't be encoded
      }
      processed++;
      onProgress?.(processed, students.length);
    }
    return labeled.length > 0 ? new faceapi.FaceMatcher(labeled, 0.55) : null;
  } catch {
    return null;
  }
}

export default function WebcamFeed({
  theme: C,
  onCapture,
  onFaceDetected,
  onEmotionDetected,
  mode = '',
  courseId = '',
  compact = false,
  faceMatcher = null,   // FaceMatcher built from student photos
}) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef   = useRef(null);
  const busyRef   = useRef(false);

  const [active,    setActive]    = useState(false);
  const [ready,     setReady]     = useState(false);
  const [captured,  setCaptured]  = useState(null);
  const [error,     setError]     = useState('');
  const [modelReady,setModelReady]= useState(false);
  const [faces,     setFaces]     = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Load face-api models on mount
  useEffect(() => {
    ensureModels().then(ok => setModelReady(ok));
  }, []);

  // ── Capture frame to canvas ─────────────────────────────────────────────
  function grabFrame() {
    const vid    = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas || !ready) return false;
    canvas.width  = vid.videoWidth  || 640;
    canvas.height = vid.videoHeight || 480;
    canvas.getContext('2d').drawImage(vid, 0, 0);
    return true;
  }

  // ── Detection loop using face-api.js ────────────────────────────────────
  const runLoop = useCallback(async () => {
    if (!active || !ready || !modelReady || busyRef.current) {
      loopRef.current = setTimeout(runLoop, 800);
      return;
    }
    const vid = videoRef.current;
    if (!vid) { loopRef.current = setTimeout(runLoop, 800); return; }

    busyRef.current = true;
    setAnalyzing(true);
    try {
      // Use recognition pipeline only when faceMatcher AND full models are ready
      const useRecognition = !!faceMatcher && fullLoaded;
      let detections;
      if (useRecognition) {
        detections = await faceapi
          .detectAllFaces(vid, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceExpressions()
          .withFaceDescriptors();
      } else {
        detections = await faceapi
          .detectAllFaces(vid, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceExpressions();
      }

      if (detections.length > 0) {
        const vidW = vid.videoWidth  || 640;
        const vidH = vid.videoHeight || 480;

        const mapped = detections.map((d) => {
          const box  = d.detection.box;
          const exps = d.expressions;
          const topEmo = Object.entries(exps).sort((a, b) => b[1] - a[1])[0];
          const emotion    = topEmo[0];
          const confidence = topEmo[1];
          const engScore = Math.min(1, (exps.happy||0)*1.5 + (exps.neutral||0)*0.8 + (exps.surprised||0)*0.6);

          // Face recognition: match descriptor against known students
          let student_id   = null;
          let student_name = null;
          if (useRecognition && d.descriptor) {
            const match = faceMatcher.findBestMatch(d.descriptor);
            if (match.label !== 'unknown') {
              student_id = match.label;
            }
          }

          return {
            emotion, confidence, engagement_score: engScore,
            student_id, student_name,
            box: {
              x: (box.x / vidW) * 100,
              y: (box.y / vidH) * 100,
              w: (box.width  / vidW) * 100,
              h: (box.height / vidH) * 100,
            },
          };
        });

        setFaces(mapped);
        onFaceDetected?.();
        mapped.forEach(f => onEmotionDetected?.(f.emotion, f.student_id, mapped));
      } else {
        setFaces([]);
      }
    } catch (e) {
      console.warn('face-api detection error', e);
      setFaces([]);
    }
    busyRef.current = false;
    setAnalyzing(false);
    if (active) loopRef.current = setTimeout(runLoop, 800);
  }, [active, ready, modelReady, onFaceDetected, onEmotionDetected]);

  useEffect(() => {
    if (!active || !ready) { clearTimeout(loopRef.current); setFaces([]); return; }
    runLoop();
    return () => clearTimeout(loopRef.current);
  }, [active, ready, modelReady]);

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
    if (!grabFrame()) return;
    const frame = canvasRef.current.toDataURL('image/jpeg', 0.7);
    setCaptured(frame);
    onCapture?.(frame, false);
  }

  useEffect(() => () => stopCamera(), []);

  const h = compact ? 180 : 260;

  return (
    <div>
      {/* Model status bar */}
      {!modelReady && (
        <div style={{
          fontSize: 11, color: '#fbbf24', background: '#2d1a00',
          border: '1px solid #f59e0b', borderRadius: 8,
          padding: '6px 12px', marginBottom: 6, lineHeight: 1.5,
        }}>
          ⏳ Loading AI emotion models…
        </div>
      )}
      {modelReady && (
        <div style={{
          fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.1)',
          border: '1px solid #10b981', borderRadius: 6,
          padding: '3px 10px', marginBottom: 6, display: 'inline-block',
        }}>
          🧠 Browser AI Ready
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

        {/* Face detection boxes (browser AI) */}
        {active && ready && faces.map((f, i) => {
          const col   = EMOTION_COLORS[f.emotion] || '#3b82f6';
          const emoji = EMOTION_EMOJI[f.emotion]  || '😐';
          const conf  = Math.round(f.confidence * 100);
          const eng   = Math.round((f.engagement_score || 0) * 100);
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
              {/* Top label */}
              <div style={{ position: 'absolute', top: -22, left: 0, fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 700 }}>
                👤 Face {i + 1}
              </div>
              {/* Bottom: emotion */}
              <div style={{ position: 'absolute', bottom: -22, left: 0, fontSize: 9, color: '#fff', background: `${col}dd`, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 700 }}>
                {emoji} {f.emotion} {conf}% · eng {eng}%
              </div>
            </div>
          );
        })}

        {/* LIVE badge */}
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
            🧠 Analyzing…
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
