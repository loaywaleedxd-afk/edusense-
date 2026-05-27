import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { spawn, execFile } from 'child_process'

// Student photos — resolve relative to project root in dev; unused in prod (served by backend)
const PHOTOS_DIR = process.env.PHOTOS_DIR
  || path.resolve(__dirname, '../../emotion_system/student_photos')

// Email credentials must be set via environment variables — never hardcode them.
// Create a .env file (git-ignored) with:
//   VITE_SMTP_USER=edusense.system@gmail.com
//   VITE_SMTP_PASS=your_app_password_here
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.VITE_SMTP_USER || '',
    pass: process.env.VITE_SMTP_PASS || '',
  },
  tls: { rejectUnauthorized: false },
})

export default defineConfig({
  plugins: [
    react(),

    // ── Progressive Web App ────────────────────────────────────────────────────
    VitePWA({
      registerType: 'autoUpdate',
      // Only activate in production (not dev server)
      devOptions: { enabled: false },

      // Files to pre-cache (app shell)
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],

      manifest: {
        name: 'EduSense',
        short_name: 'EduSense',
        description: 'AI-Powered University Management System',
        theme_color: '#1a1a3e',
        background_color: '#1a1a3e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Pre-cache all JS/CSS/HTML/images built by Vite
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Main bundle is ~2.7 MB — raise the limit (default is 2 MB)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,

        // Don't cache backend API calls — always need fresh data
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/ws\//, /^\/photos\//],

        runtimeCaching: [
          {
            // API: Network first, fall back to cache (24h max age)
            urlPattern: /\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'edusense-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Student photos: cache on first load, serve from cache next time
            urlPattern: /\/photos\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'edusense-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),

    {
      name: 'serve-student-photos',
      configureServer(server) {

        // ── Email API ──────────────────────────────────────────────
        server.middlewares.use('/api/send-email', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405; res.end('Method Not Allowed'); return;
          }
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { to, name, username, password, role, id } = JSON.parse(body);
              if (!to) { res.statusCode = 400; res.end(JSON.stringify({ error: 'No recipient email' })); return; }
              const roleEmoji = role.includes('Student') ? '🎓' : role.includes('Doctor') || role.includes('Lecturer') ? '👨‍🏫' : '👨‍👩‍👧';
              const idLabel   = role.includes('Student') ? 'Student ID' : role.includes('Doctor') || role.includes('Lecturer') ? 'Doctor ID' : 'Linked Student';
              const idRow     = id ? `<tr><td style="padding:12px 16px;font-size:13px;color:#546e7a;font-weight:600;background:#f8f9fa;width:140px">${idLabel}</td><td style="padding:12px 16px;font-size:13px;color:#1a237e;font-weight:700;font-family:monospace">${id}</td></tr>` : '';
              const tips      = role.includes('Student')
                ? ['📊 View your Dashboard to see your engagement and attendance stats','📝 Check My Grades to see your exam results','✅ View your Attendance record by course','💬 Join your course Community Chat']
                : role.includes('Doctor') || role.includes('Lecturer')
                ? ['📷 Start a Live Session to monitor your classroom in real-time','✅ Manage Attendance for your courses','📊 View Analytics for student performance','💬 Post Announcements in Community Chat']
                : ['📊 View your child\'s Dashboard and performance summary','✅ Track Attendance records by course','📈 Monitor Academic Progress and grades'];
              const tipsHtml  = tips.map(t=>`<li style="margin-bottom:6px">${t}</li>`).join('');

              await transporter.sendMail({
                from: '"EduSense System" <edusense.system@gmail.com>',
                to,
                subject: `Your EduSense Account Credentials — ${role}`,
                html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f0f4f8">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">

  <!-- Header -->
  <div style="background:#1a237e;padding:28px 32px;text-align:center">
    <div style="font-size:30px;font-weight:900;color:#ffffff;letter-spacing:3px">EduSense</div>
    <div style="font-size:11px;color:#90caf9;letter-spacing:3px;margin-top:6px;text-transform:uppercase">Classroom Emotion &amp; Attendance AI System</div>
  </div>

  <!-- Welcome banner -->
  <div style="background:linear-gradient(135deg,#1565c0 0%,#42a5f5 100%);padding:36px 32px;text-align:center">
    <div style="font-size:44px;margin-bottom:12px">${roleEmoji}</div>
    <div style="font-size:24px;font-weight:700;color:#ffffff;margin-bottom:6px">Welcome, ${name}!</div>
    <div style="font-size:13px;color:#bbdefb">Your ${role} account has been created</div>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:32px">
    <p style="color:#37474f;font-size:14px;line-height:1.7;margin:0 0 24px">
      Your EduSense account is ready. Use the credentials below to log in to the desktop application.
    </p>

    <!-- Credentials table -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;margin-bottom:24px">
      <tr style="background:#1a237e">
        <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase">🔐 Login Credentials</td>
      </tr>
      <tr style="border-bottom:1px solid #e0e0e0">
        <td style="padding:13px 16px;font-size:13px;color:#546e7a;font-weight:600;width:140px;background:#f8f9fa">Username</td>
        <td style="padding:13px 16px;font-size:14px;color:#1a237e;font-weight:700;font-family:monospace">${username}</td>
      </tr>
      <tr style="border-bottom:1px solid #e0e0e0">
        <td style="padding:13px 16px;font-size:13px;color:#546e7a;font-weight:600;background:#f8f9fa">Password</td>
        <td style="padding:13px 16px;font-size:14px;color:#e65100;font-weight:700;font-family:monospace;letter-spacing:2px">${password}</td>
      </tr>
      <tr style="border-bottom:1px solid #e0e0e0">
        <td style="padding:13px 16px;font-size:13px;color:#546e7a;font-weight:600;background:#f8f9fa">Role</td>
        <td style="padding:13px 16px;font-size:13px;color:#1565c0;font-weight:600">${roleEmoji} ${role}</td>
      </tr>
      ${idRow}
    </table>

    <!-- Getting started -->
    <div style="border-left:4px solid #26a69a;padding:16px 20px;background:#e0f2f1;margin-bottom:28px">
      <div style="font-size:13px;font-weight:700;color:#00796b;margin-bottom:10px">✅ Getting Started</div>
      <ul style="margin:0;padding:0 0 0 18px;color:#37474f;font-size:13px;line-height:1.8">${tipsHtml}</ul>
    </div>

    <!-- Login button -->
    <div style="text-align:center;margin-bottom:20px">
      <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}" style="background:#1a237e;color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;display:inline-block;letter-spacing:0.5px">🔐 Login to EduSense</a>
    </div>

    <p style="color:#e53935;font-size:12px;text-align:center;margin:0">⚠️ Please change your password after your first login for security.</p>
  </div>

  <!-- Footer -->
  <div style="background:#1a237e;padding:16px 32px;text-align:center">
    <p style="color:#90caf9;font-size:11px;margin:0">EduSense Academic System &nbsp;·&nbsp; ${new Date().getFullYear()} &nbsp;·&nbsp; edusense.system@gmail.com</p>
  </div>

</div>
</body></html>`,
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        });

        // ── Emotion saver ─────────────────────────────────────────
        const EMOTIONS_DIR = process.env.EMOTIONS_DIR
          || path.resolve(__dirname, '../../emotion_system/student_emotions');
        if (!fs.existsSync(EMOTIONS_DIR)) fs.mkdirSync(EMOTIONS_DIR, { recursive: true });

        server.middlewares.use('/api/save-emotion', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { studentId, courseId, emotion, timestamp } = JSON.parse(body);
              if (!studentId || !emotion) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing fields' })); return; }
              const filePath = path.join(EMOTIONS_DIR, `${studentId}.json`);
              let records = [];
              if (fs.existsSync(filePath)) {
                try { records = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
              }
              records.push({ emotion, courseId: courseId || '', timestamp: timestamp || new Date().toISOString() });
              fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
            }
          });
        });

        // ── R Analysis runner ──────────────────────────────────────
        const R_DIR = process.env.R_ANALYSIS_DIR
          || path.resolve(__dirname, '../../emotion_system/r_analysis');
        const RSCRIPT = process.env.RSCRIPT_PATH || 'Rscript';

        server.middlewares.use('/api/run-r', (req, res) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end(); return;
          }
          if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { script } = JSON.parse(body);
              const allowed = ['install_packages.R', 'analysis.R', 'shiny_dashboard.R'];
              if (!allowed.includes(script)) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Unknown script' })); return; }
              const scriptPath = path.join(R_DIR, script);
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.setHeader('Transfer-Encoding', 'chunked');
              res.statusCode = 200;
              const proc = spawn(RSCRIPT, [scriptPath], { cwd: R_DIR });
              proc.stdout.on('data', d => res.write(d.toString()));
              proc.stderr.on('data', d => res.write(d.toString()));
              proc.on('close', code => { res.write(`\n[Process exited with code ${code}]`); res.end(); });
              proc.on('error', err => { res.write(`\n[Error: ${err.message}]`); res.end(); });
            } catch (e) {
              res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
            }
          });
        });

        // ── Student photos ─────────────────────────────────────────
        // ── Demo screenshot capture ────────────────────────────────
        server.middlewares.use('/api/save-frame', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
          let body = ''
          req.on('data', d => body += d)
          req.on('end', () => {
            try {
              const { frame, index } = JSON.parse(body)
              const FRAMES_DIR = process.env.FRAMES_DIR
                || path.resolve(__dirname, '../../demo_frames')
              fs.mkdirSync(FRAMES_DIR, { recursive: true })
              const b64 = frame.split(',')[1] || frame
              const buf = Buffer.from(b64, 'base64')
              const name = String(index).padStart(5, '0') + '.jpg'
              fs.writeFileSync(path.join(FRAMES_DIR, name), buf)
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ ok: true, file: name }))
            } catch(e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message }))
            }
          })
        })

        server.middlewares.use('/student_photos', (req, res, next) => {
          let filename = decodeURIComponent(req.url.replace(/^\//, ''))
          let filePath = path.join(PHOTOS_DIR, filename)
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            fs.createReadStream(filePath).pipe(res)
          } else {
            const altPath = filePath.replace(/\.jpg$/, '.0.jpg')
            if (fs.existsSync(altPath)) {
              res.setHeader('Content-Type', 'image/jpeg')
              res.setHeader('Cache-Control', 'public, max-age=3600')
              fs.createReadStream(altPath).pipe(res)
            } else {
              next()
            }
          }
        })
      }
    }
  ],

  build: {
    // Raise warning threshold — large chunks are expected with face-api.js
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        // Split vendor code into separately-cached chunks.
        // Browser only re-downloads a chunk when it actually changes.
        manualChunks(id) {
          // face-api.js is huge (~2 MB) — give it its own chunk
          if (id.includes('face-api')) return 'face-api';
          // Framer Motion animations
          if (id.includes('framer-motion')) return 'framer-motion';
          // React core (react + react-dom)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor';
          // Everything else in node_modules goes into a shared vendor chunk
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },

  server: {
    proxy: {
      // Forward all /api/* calls to the FastAPI backend during dev
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Don't rewrite the path — FastAPI already has /api/* routes
      },
      // WebSocket proxy for live emotion sessions
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
      // Student photos served by backend
      '/photos': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
