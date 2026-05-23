export const DARK = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35',
  card: '#131f38', card2: '#182540', sidebar: '#080d1a', hover: '#1a2a4a',
  blue: '#3b82f6', blue2: '#60a5fa', blue3: '#1d4ed8', blue_dim: '#172a50',
  cyan: '#06b6d4', cyan2: '#22d3ee',
  green: '#10b981', green2: '#34d399', green_dim: '#052e1a',
  amber: '#f59e0b', amber2: '#fbbf24', amber_dim: '#2d1a00',
  red: '#ef4444', red2: '#f87171', red_dim: '#2d0808',
  purple: '#8b5cf6', purple2: '#a78bfa', purple_dim: '#1e0d3d',
  pink: '#ec4899',
  text: '#f8fafc', text2: '#94a3b8', text3: '#475569', text4: '#1e293b',
  border: '#1e2d48', border2: '#253655', border3: '#2d4268',
  happy: '#10b981', neutral: '#6366f1', confused: '#8b5cf6',
  bored: '#64748b', surprise: '#f59e0b', sad: '#475569',
  angry: '#ef4444', disgust: '#dc2626', fear: '#f97316',
};

export const LIGHT = {
  bg: '#f1f5f9', bg2: '#e8eef6', bg3: '#dde5f0',
  card: '#ffffff', card2: '#f8fafc', sidebar: '#1e293b', hover: '#e2e8f2',
  blue: '#2563eb', blue2: '#3b82f6', blue3: '#1d4ed8', blue_dim: '#dbeafe',
  cyan: '#0891b2', cyan2: '#06b6d4',
  green: '#059669', green2: '#10b981', green_dim: '#d1fae5',
  amber: '#d97706', amber2: '#f59e0b', amber_dim: '#fef3c7',
  red: '#dc2626', red2: '#ef4444', red_dim: '#fee2e2',
  purple: '#7c3aed', purple2: '#8b5cf6', purple_dim: '#ede9fe',
  pink: '#db2777',
  text: '#0f172a', text2: '#334155', text3: '#64748b', text4: '#94a3b8',
  border: '#cbd5e1', border2: '#94a3b8', border3: '#64748b',
  happy: '#059669', neutral: '#4f46e5', confused: '#7c3aed',
  bored: '#475569', surprise: '#d97706', sad: '#64748b',
  angry: '#dc2626', disgust: '#b91c1c', fear: '#ea580c',
};

export const EMOTION_ICONS = {
  happy: '😊', neutral: '😐', confused: '😕', bored: '😴',
  surprise: '😮', sad: '😢', angry: '😠', disgust: '🤢', fear: '😨',
};

export const EMOTION_COLORS_DARK = {
  happy: '#10b981', neutral: '#6366f1', confused: '#8b5cf6',
  bored: '#64748b', surprise: '#f59e0b', sad: '#475569',
  angry: '#ef4444', disgust: '#dc2626', fear: '#f97316',
};

export const DEPARTMENTS = ['Computer Science', 'Engineering', 'Mathematics', 'Physics', 'Data Science'];
export const TITLES = ['Professor', 'Associate Professor', 'Lecturer', 'Assistant Professor'];

// ── Per-tenant branding ───────────────────────────────────────────────────────
function _lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function _darken(hex, amt) { return _lighten(hex, -amt); }

/**
 * buildTheme(isDark, primaryColor?)
 * Returns a full theme object where the "blue" accent is replaced with
 * the university's chosen primary color. Falls back to default if none set.
 */
export function buildTheme(isDark, primaryColor) {
  const base = isDark ? { ...DARK } : { ...LIGHT };
  if (!primaryColor || primaryColor === '#3b82f6') return base;
  return {
    ...base,
    blue:     primaryColor,
    blue2:    _lighten(primaryColor, isDark ? 40 : -30),
    blue3:    _darken(primaryColor, 30),
    blue_dim: primaryColor + (isDark ? '28' : '22'),
    accent:   primaryColor,
  };
}
