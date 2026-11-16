/**
 * Shared look for every SVG on the profile: colors, fonts, the card frame and
 * the small animation helpers. GitHub READMEs strip CSS, so all styling lives
 * inside the SVGs themselves.
 */
export const C = {
  bg: '#0d0b14',
  bg2: '#151021',
  bg3: '#1c1530',
  border: '#2a1f3d',
  grid: '#211933',
  text: '#ede9fe',
  soft: '#c9bfe6',
  muted: '#8b80a8',
  primary: '#a855f7',
  light: '#c084fc',
  pale: '#e9d5ff',
  deep: '#6d28d9',
  indigo: '#6366f1',
  pink: '#d946ef',
};

export const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', -apple-system, sans-serif";
export const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** animation-delay attribute for staggered entrances */
export const delay = (i, step = 0.08, base = 0) => `style="animation-delay:${(base + step * i).toFixed(2)}s"`;

/**
 * Rough text width for wrapping (SVG has no automatic line breaks).
 * Slightly generous so the text also fits with wider Linux fonts.
 */
export function textWidth(str, size) {
  let w = 0;
  for (const ch of str) {
    if (' .,:;\'!|ilIjtf()[]'.includes(ch)) w += 0.3;
    else if ('mwMW@'.includes(ch)) w += 0.86;
    else if (/[A-Z0-9]/.test(ch)) w += 0.64;
    else w += 0.54;
  }
  return w * size;
}

export function wrap(str, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of str.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const BASE_CSS = `
  text { font-family: ${FONT}; }
  .t { fill: ${C.text}; font-size: 18px; font-weight: 700; }
  .s { fill: ${C.muted}; font-size: 11px; }
  .lbl { fill: ${C.muted}; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; }
  .val { fill: ${C.text}; font-size: 16px; font-weight: 700; font-family: ${MONO}; }
  .fade { animation: fade 0.7s ease-out both; }
  .rise { animation: rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
  .reveal { transform-box: view-box; transform-origin: 0 0; animation: reveal 1.6s cubic-bezier(0.3, 0, 0.2, 1) 0.2s both; }
  .streak { animation: streak 7s linear infinite; }
  .glow { animation: glow 6s ease-in-out infinite alternate; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes reveal { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes streak { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -1000; } }
  @keyframes glow { from { opacity: 0.55; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .fade, .rise, .reveal, .streak, .glow, .anim { animation: none !important; }
  }`;

/**
 * Card frame: dark rounded panel, soft purple glow in the corner and a light
 * streak that keeps travelling around the border.
 */
export function frame(w, h, body, { defs = '', css = '', glow = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img">
<defs>
  <linearGradient id="g-text" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.pale}"/><stop offset="1" stop-color="${C.primary}"/>
  </linearGradient>
  <linearGradient id="g-accent" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.pink}"/><stop offset="0.5" stop-color="${C.primary}"/><stop offset="1" stop-color="${C.indigo}"/>
  </linearGradient>
  <linearGradient id="g-streak" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.primary}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${C.pale}"/>
    <stop offset="1" stop-color="${C.primary}" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="g-glow" cx="1" cy="0" r="1">
    <stop offset="0" stop-color="${C.primary}" stop-opacity="0.22"/>
    <stop offset="0.6" stop-color="${C.primary}" stop-opacity="0"/>
  </radialGradient>
  ${defs}
</defs>
<style>${BASE_CSS}${css}</style>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="${C.bg}" stroke="${C.border}"/>
${glow ? `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="url(#g-glow)" class="glow"/>` : ''}
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" pathLength="1000" stroke="${C.light}" stroke-width="1.5"
  stroke-dasharray="70 930" stroke-linecap="round" opacity="0.85" class="streak"/>
${body}
</svg>
`;
}

/** Section title with a gradient accent bar, used at the top of each card */
export function title(text, sub, x = 32, y = 44) {
  return `<g class="rise">
  <rect x="${x}" y="${y - 17}" width="4" height="22" rx="2" fill="url(#g-accent)"/>
  <text x="${x + 16}" y="${y}" class="t">${esc(text)}</text>
  ${sub ? `<text x="${x + 16}" y="${y + 20}" class="s" font-size="12">${esc(sub)}</text>` : ''}
</g>`;
}
