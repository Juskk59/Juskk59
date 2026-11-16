#!/usr/bin/env node
/**
 * Builds the static, animated section cards used in README.md
 * (hero, contact buttons, about, projects, tech stack, experience, footer).
 *
 * GitHub strips CSS from READMEs, so each section is an SVG with its own
 * styles and animations. Edit the CONTENT object below and run:
 *
 *   node scripts/generate-sections.mjs
 *
 * Tech logos are downloaded from skillicons.dev at build time and inlined,
 * because an SVG shown through <img> cannot load external images.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, MONO, esc, delay, frame, title, wrap } from './theme.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.OUT_DIR || path.join(ROOT, 'assets', 'sections'));
const W = 880;

/* ---------------------------------------------------------------- content */
const CONTENT = {
  name: 'Julio Cesar Cester',
  role: 'Junior Full Stack Developer',
  rotating: ['front ends', 'back ends', 'integrations', 'automations'],
  stackLine: 'PHP  ·  JavaScript  ·  Python  ·  SQL',

  about: [
    "Hi! I'm Julio, a junior full stack developer from Londrina, Brazil. I work mostly with PHP, JavaScript and Python, on both the front end and the back end.",
    'Since 2025 I have been working on live e-commerce sites: building features and integrations, fixing bugs, making pages faster and taking changes from staging all the way to production. A lot of that work happens in direct contact with clients, which taught me to ask "why" before writing any code.',
    "I studied Systems Analysis and Development at IFPR, where I also worked with Java, Node.js, C++, MySQL and MongoDB. I'm always happy to pick up something outside my usual stack.",
  ],
  projects: [
    ['GameTracker', 'Python', 'Desktop app to organize and rate my personal game library, with login, cover images, simple stats and MongoDB storage.', ['Tkinter', 'MongoDB']],
    ['ControleEstoque', 'Python', 'Inventory manager for the desktop with user login, a Tkinter interface, an MVC structure and a MongoDB database.', ['Tkinter', 'MVC']],
    ['Processamento-De-Imagens', 'Python', 'Segments images and removes their background using K-means, erosion and dilation with OpenCV.', ['OpenCV', 'K-means']],
    ['Jokenpo', 'JavaScript', 'Rock, paper, scissors in the browser. A small practice project from the SENAC course.', ['HTML', 'CSS']],
    ['MySQL-Features', 'SQL', 'A script from class that goes through lots of MySQL commands and what each one is useful for.', ['MySQL']],
    ['Algoritmos-Java-SENAC-', 'Java', 'Exercises and algorithms I wrote during the Java developer course at SENAC.', ['Algorithms']],
  ],

  stack: [
    ['Languages', [['php', 'PHP'], ['js', 'JavaScript'], ['python', 'Python'], ['java', 'Java'], ['html', 'HTML'], ['css', 'CSS']]],
    ['Front end', [['tailwind', 'Tailwind'], ['alpinejs', 'Alpine.js'], ['vue', 'Vue'], ['react', 'React'], ['figma', 'Figma']]],
    ['Back end & data', [['local:magento', 'Magento'], ['nodejs', 'Node.js'], ['wordpress', 'WordPress'], ['mysql', 'MySQL'], ['mongodb', 'MongoDB']]],
    ['Tools', [['git', 'Git'], ['github', 'GitHub'], ['linux', 'Linux'], ['bash', 'Bash']]],
  ],

  experience: [
    ['Junior Full Stack Developer', 'Mage2 · Londrina, Brazil', 'Jan 2026 – Present', 'Front end and back end for live online stores with PHP, JavaScript, Tailwind CSS and Alpine.js, from staging to deploy.', true],
    ['Intern', 'Mage2 Commerce · Londrina, Brazil', 'Apr 2025 – Dec 2025', 'Layout and content changes with HTML, CSS, XML and JavaScript, plus technical support for clients.', false],
    ['Systems Analysis and Development', 'IFPR · Federal Institute of Paraná', 'Mar 2023 – Dec 2025', 'Front end, back end with Python, Node.js, Java and C++, MySQL and MongoDB databases, and UX/UI with Figma.', false],
  ],

  contacts: [
    ['linkedin', 'LinkedIn'],
    ['email', 'Email'],
    ['instagram', 'Instagram'],
  ],
};

/* ------------------------------------------------------------------ hero */
function hero() {
  const H = 300;
  const words = CONTENT.rotating
    .map((w, i) => `<text x="117" y="0" class="word w${i}" style="animation-delay:${i * 3}s" fill="url(#g-word)" font-size="17" font-weight="700">${esc(w)}</text>`)
    .join('');

  /* ---- animated git graph on the right ---- */
  const lane = { main: 160, feat: 92, fix: 228 };
  const col = { main: C.light, feat: C.pink, fix: '#818cf8' };
  const paths = {
    main: 'M578 160 L826 160',
    feat: 'M646 160 C664 160 664 92 682 92 L756 92 C770 92 770 160 784 160',
    fix: 'M692 160 C708 160 708 228 724 228 L790 228 C808 228 808 160 826 160',
  };
  const commits = [
    ['main', 602, 0.5], ['main', 646, 0.65], ['main', 692, 0.8],
    ['feat', 700, 1.45], ['feat', 742, 1.6],
    ['fix', 757, 1.95],
    ['main', 784, 2.25], ['main', 826, 2.55],
  ];
  const draw = (k, d) =>
    `<path d="${paths[k]}" stroke="${col[k]}" stroke-width="2.5" stroke-linecap="round" pathLength="1" class="draw" style="animation-delay:${d}s"/>
  <path d="${paths[k]}" stroke="${col[k]}" stroke-width="8" stroke-linecap="round" opacity="0.18" pathLength="1" class="draw" style="animation-delay:${d}s"/>`;
  const nodes = commits
    .map(([k, x, d], i) => {
      const y = lane[k];
      return `<g class="pop" style="animation-delay:${d}s">
    <circle cx="${x}" cy="${y}" r="7.5" fill="${C.bg}" stroke="${col[k]}" stroke-width="2.5"/>
    <circle cx="${x}" cy="${y}" r="3" fill="${col[k]}" class="wave" style="animation-delay:${(3 + i * 0.35).toFixed(2)}s"/>
  </g>`;
    })
    .join('\n  ');
  const packet = (k, dur, begin) => `<circle r="3.2" fill="${C.pale}" opacity="0">
    <animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${paths[k]}"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
  </circle>`;
  const tag = (x, y, text, color) => `<g transform="translate(${x} ${y})"><g class="pop" style="animation-delay:2.8s">
    <rect x="${-text.length * 3.7 - 9}" y="-11" width="${text.length * 7.4 + 18}" height="22" rx="11" fill="${C.bg2}" stroke="${color}" stroke-opacity="0.6"/>
    <text text-anchor="middle" y="4" fill="${color}" font-size="11" font-family="${MONO}" font-weight="600">${esc(text)}</text>
  </g></g>`;

  const css = `
  .orb { transform-box: fill-box; transform-origin: center; }
  .o1 { animation: drift1 16s ease-in-out infinite alternate; }
  .o2 { animation: drift2 19s ease-in-out infinite alternate; }
  .o3 { animation: drift3 23s ease-in-out infinite alternate; }
  @keyframes drift1 { from { transform: translate(0, 0) scale(1); } to { transform: translate(120px, 40px) scale(1.2); } }
  @keyframes drift2 { from { transform: translate(0, 0) scale(1.1); } to { transform: translate(-140px, -30px) scale(0.9); } }
  @keyframes drift3 { from { transform: translate(0, 0); } to { transform: translate(-60px, 50px); } }
  .shine { animation: shine 5s ease-in-out infinite; }
  @keyframes shine { 0% { transform: translateX(-260px); } 55%, 100% { transform: translateX(720px); } }
  .word { opacity: 0; animation: word 12s ease-in-out infinite both; }
  @keyframes word { 0% { opacity: 0; transform: translateY(8px); } 4%, 21% { opacity: 1; transform: none; } 25%, 100% { opacity: 0; transform: translateY(-8px); } }
  .draw { stroke-dasharray: 1; animation: draw 1.1s cubic-bezier(0.5, 0, 0.2, 1) both; }
  @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) both; }
  @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: none; } }
  .wave { transform-box: fill-box; transform-origin: center; animation: wave 4s ease-in-out infinite; }
  @keyframes wave { 0%, 100% { transform: scale(1); fill-opacity: 1; } 8% { transform: scale(1.9); fill-opacity: 0.6; } 16% { transform: scale(1); fill-opacity: 1; } }
  .ring { transform-box: fill-box; transform-origin: center; animation: ring 2.2s ease-out 3s infinite both; }
  @keyframes ring { from { transform: scale(1); opacity: 0.8; } to { transform: scale(2.8); opacity: 0; } }
  .future { animation: dash 1.2s linear infinite; }
  @keyframes dash { to { stroke-dashoffset: -12; } }
  @media (prefers-reduced-motion: reduce) { .word { animation: none; } .w0 { opacity: 1; } }`;

  const defs = `
  <clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16"/></clipPath>
  <clipPath id="name"><text x="48" y="124" font-size="46" font-weight="800" letter-spacing="-0.5">${esc(CONTENT.name)}</text></clipPath>
  <filter id="blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="45"/></filter>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${C.border}"/></pattern>
  <radialGradient id="fadeMask" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="dotMask"><rect width="${W}" height="${H}" fill="url(#fadeMask)"/></mask>
  <linearGradient id="g-name" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.pale}"/><stop offset="0.55" stop-color="${C.light}"/><stop offset="1" stop-color="${C.primary}"/>
  </linearGradient>
  <linearGradient id="g-shine" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="g-word" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.pink}"/><stop offset="1" stop-color="${C.light}"/>
  </linearGradient>`;

  const body = `
<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="url(#dots)" mask="url(#dotMask)"/>
  <g filter="url(#blur)">
    <circle class="orb o1" cx="160" cy="60" r="120" fill="${C.deep}" opacity="0.55"/>
    <circle class="orb o2" cx="720" cy="230" r="140" fill="${C.primary}" opacity="0.35"/>
    <circle class="orb o3" cx="480" cy="-10" r="110" fill="${C.pink}" opacity="0.22"/>
  </g>
</g>

<g class="rise" ${delay(1, 0.15)}>
  <g clip-path="url(#name)">
    <rect x="40" y="76" width="560" height="60" fill="url(#g-name)"/>
    <rect x="0" y="76" width="160" height="60" fill="url(#g-shine)" class="shine" opacity="0.6"/>
  </g>
</g>
<text x="50" y="164" fill="${C.soft}" font-size="21" font-weight="600" class="rise" ${delay(2, 0.15)}>${esc(CONTENT.role)}</text>
<g transform="translate(50 204)" class="rise" ${delay(3, 0.15)}>
  <text x="0" y="0" fill="${C.muted}" font-size="17">I like building</text>
  ${words}
</g>
<text x="50" y="242" fill="${C.muted}" font-size="12.5" font-family="${MONO}" class="rise" ${delay(4, 0.15)}>${esc(CONTENT.stackLine)}</text>

<g>
  ${tag(548, 160, 'main', col.main)}
  ${draw('main', 0.3)}
  <path d="M836 160 L856 160" stroke="${col.main}" stroke-width="2" stroke-dasharray="3 3" opacity="0.5" class="future"/>
  ${draw('feat', 0.9)}
  ${draw('fix', 1.3)}
  ${nodes}
  <circle cx="826" cy="160" r="7.5" fill="none" stroke="${C.pale}" stroke-width="2" class="ring"/>
  ${packet('main', 3.2, 3)}
  ${packet('feat', 3.8, 3.6)}
  ${packet('fix', 4.4, 4.4)}
  ${tag(720, 62, 'feature/ui', col.feat)}
  ${tag(757, 258, 'hotfix', col.fix)}
  ${tag(826, 128, 'HEAD', C.pale)}
</g>`;
  return frame(W, H, body, { defs, css, glow: false });
}

/* --------------------------------------------------------------- buttons */
const ICONS = {
  linkedin: `<path fill="${C.light}" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 4.892v4.892zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>`,
  email: `<rect x="2" y="4.5" width="20" height="15" rx="3" stroke="${C.light}" stroke-width="2"/><path d="M3 7l9 6.5L21 7" stroke="${C.light}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  instagram: `<rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="${C.light}" stroke-width="2"/><circle cx="12" cy="12" r="4.3" stroke="${C.light}" stroke-width="2"/><circle cx="17.6" cy="6.4" r="1.3" fill="${C.light}"/>`,
};

function button(icon, label) {
  const w = 200, h = 52;
  const defs = `<linearGradient id="g-btn" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.bg3}"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>`;
  return frame(
    w,
    h,
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="15" fill="url(#g-btn)"/>
<g class="rise">
  <g transform="translate(22 14) scale(1)">${ICONS[icon]}</g>
  <text x="58" y="31" fill="${C.text}" font-size="15" font-weight="700">${esc(label)}</text>
  <text x="${w - 24}" y="31" text-anchor="end" fill="${C.light}" font-size="15">↗</text>
</g>`,
    { defs, glow: false },
  );
}

/* ----------------------------------------------------------------- about */
function about() {
  const size = 15, lh = 25, maxW = W - 64;
  let y = 86;
  const paras = CONTENT.about
    .map((p, i) => {
      const lines = wrap(p, size, maxW);
      const g = `<g class="rise" ${delay(i + 1, 0.15)}>${lines
        .map((l, j) => `<text x="32" y="${y + j * lh}" fill="${C.soft}" font-size="${size}">${esc(l)}</text>`)
        .join('')}</g>`;
      y += lines.length * lh + 14;
      return g;
    })
    .join('\n');

  return frame(W, y + 10, `${title('About me')}\n${paras}`);
}

/* -------------------------------------------------------------- projects */
const LANG_COLOR = { Python: '#3572A5', JavaScript: '#f1e05a', Java: '#b07219', SQL: '#e38c00' };

function projectsTitle() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="56" viewBox="0 0 ${W} 56" fill="none" role="img">
<defs><linearGradient id="g-accent" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${C.pink}"/><stop offset="0.5" stop-color="${C.primary}"/><stop offset="1" stop-color="${C.indigo}"/>
</linearGradient>
<linearGradient id="g-rule" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.primary}" stop-opacity="0.6"/><stop offset="1" stop-color="${C.primary}" stop-opacity="0"/>
</linearGradient></defs>
<style>
  text { font-family: 'Segoe UI', Ubuntu, -apple-system, sans-serif; }
  .rule { transform-box: fill-box; transform-origin: left; animation: grow 1.4s cubic-bezier(0.3, 0, 0.2, 1) both; }
  @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) { .rule { animation: none; } }
</style>
<rect x="16" y="15" width="4" height="22" rx="2" fill="url(#g-accent)"/>
<text x="32" y="32" fill="${C.text}" font-size="18" font-weight="700">Projects</text>
<rect x="120" y="26" width="${W - 136}" height="1" fill="url(#g-rule)" class="rule"/>
</svg>
`;
}

async function projectCard([repo, lang, desc, tags], i) {
  const w = 430, h = 178;
  let stars = 0;
  try {
    const r = await fetch(`https://api.github.com/repos/Juskk59/${repo}`, { headers: { 'User-Agent': 'profile-sections' } });
    if (r.ok) stars = (await r.json()).stargazers_count || 0;
  } catch {}
  const name = repo.replace(/-+$/, '');
  const lines = wrap(desc, 13, w - 56).slice(0, 3);
  let tx = 28;
  const chips = [lang, ...tags]
    .map((t, j) => {
      const cw = Math.round(t.length * 6.6 + (j === 0 ? 34 : 22));
      const g = `<g transform="translate(${tx} ${h - 46})">
  <rect width="${cw}" height="24" rx="12" fill="${C.bg2}" stroke="${C.border}"/>
  ${j === 0 ? `<circle cx="13" cy="12" r="4.5" fill="${LANG_COLOR[t] || C.light}"/>` : ''}
  <text x="${j === 0 ? 24 : 11}" y="16" fill="${C.soft}" font-size="11.5" font-weight="600">${esc(t)}</text>
</g>`;
      tx += cw + 8;
      return g;
    })
    .join('');
  const body = `
<g class="rise" ${delay(i % 2, 0.12)}>
  <g transform="translate(28 26)">
    <rect width="30" height="30" rx="8" fill="${C.bg3}" stroke="${C.border}"/>
    <path transform="translate(7 7)" fill="${C.light}" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/>
  </g>
  <text x="70" y="46" fill="${C.text}" font-size="16" font-weight="700">${esc(name)}</text>
  <text x="${w - 28}" y="46" text-anchor="end" fill="${C.light}" font-size="16">↗</text>
  ${lines.map((l, j) => `<text x="28" y="${84 + j * 20}" fill="${C.soft}" font-size="13">${esc(l)}</text>`).join('')}
  ${chips}
  <text x="${w - 28}" y="${h - 29}" text-anchor="end" fill="${C.muted}" font-size="12.5" font-family="${MONO}">★ ${stars}</text>
</g>`;
  return frame(w, h, body);
}

/* ----------------------------------------------------------------- stack */
async function loadIcon(id, n) {
  const raw = id.startsWith('local:')
    ? await readFile(path.join(ROOT, 'assets', 'icons', `${id.slice(6)}.svg`), 'utf8')
    : await (await fetch(`https://skillicons.dev/icons?i=${id}`)).text();
  if (!raw.includes('<svg')) throw new Error(`Icon not found: ${id}`);
  // make ids unique so gradients from different icons don't collide
  const p = `i${n}-`;
  return raw
    .trim()
    .replace(/\sid="([^"]+)"/g, ` id="${p}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${p}$1"`)
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
    .replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1');
}

async function stack() {
  const panelW = (W - 64 - 16) / 2, panelH = 128, icon = 44, step = 60;
  let n = 0;
  const panels = [];
  for (const [gi, [label, items]] of CONTENT.stack.entries()) {
    const px = 32 + (gi % 2) * (panelW + 16);
    const py = 72 + Math.floor(gi / 2) * (panelH + 16);
    const icons = [];
    for (const [ii, [id, name]] of items.entries()) {
      const svg = (await loadIcon(id, n++)).replace('<svg', `<svg x="0" y="0" width="${icon}" height="${icon}"`);
      icons.push(`<g class="rise" ${delay(gi * 3 + ii, 0.06, 0.2)} transform="translate(${20 + ii * step} 42)">
  ${svg}
  <text x="${icon / 2}" y="${icon + 17}" text-anchor="middle" fill="${C.muted}" font-size="10.5">${esc(name)}</text>
</g>`);
    }
    panels.push(`<g transform="translate(${px} ${py})">
  <rect width="${panelW}" height="${panelH}" rx="12" fill="${C.bg2}" stroke="${C.border}"/>
  <text x="20" y="27" fill="${C.light}" font-size="11" font-weight="700" letter-spacing="0.12em" class="fade">${esc(label.toUpperCase())}</text>
  ${icons.join('\n')}
</g>`);
  }
  const H = 72 + 2 * panelH + 16 + 30;
  return frame(W, H, `${title('Tech stack')}\n${panels.join('\n')}`);
}

/* ------------------------------------------------------------ experience */
function experience() {
  const lineX = 44, textX = 76, maxW = W - textX - 40;
  let y = 92;
  const dots = [];
  const items = CONTENT.experience
    .map(([role, place, when, desc, current], i) => {
      const lines = wrap(desc, 13.5, maxW);
      dots.push({ y: y - 5, current });
      const g = `<g class="rise" ${delay(i + 1, 0.18)}>
  <text x="${textX}" y="${y}" fill="${C.text}" font-size="16" font-weight="700">${esc(role)}</text>
  <text x="${W - 36}" y="${y}" text-anchor="end" fill="${C.muted}" font-size="12" font-family="${MONO}">${esc(when)}</text>
  <text x="${textX}" y="${y + 21}" fill="${C.light}" font-size="13" font-weight="600">${esc(place)}</text>
  ${lines.map((l, j) => `<text x="${textX}" y="${y + 44 + j * 20}" fill="${C.soft}" font-size="13.5">${esc(l)}</text>`).join('')}
</g>`;
      y += 44 + (lines.length - 1) * 20 + 36;
      return g;
    })
    .join('\n');
  const top = dots[0].y, bottom = dots[dots.length - 1].y;
  const css = `
  .flow { animation: flow 1.6s linear infinite; }
  @keyframes flow { to { stroke-dashoffset: -16; } }
  .pulse { transform-box: fill-box; transform-origin: center; animation: pulse 2.2s ease-out infinite; }
  @keyframes pulse { from { transform: scale(1); opacity: 0.7; } to { transform: scale(2.6); opacity: 0; } }`;
  const defs = `<linearGradient id="g-line" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.light}"/><stop offset="1" stop-color="${C.deep}" stop-opacity="0.3"/></linearGradient>`;
  const timeline = `
<line x1="${lineX}" x2="${lineX}" y1="${top}" y2="${bottom}" stroke="url(#g-line)" stroke-width="2"/>
<line x1="${lineX}" x2="${lineX}" y1="${top}" y2="${bottom}" stroke="${C.pale}" stroke-width="2" stroke-dasharray="4 12" opacity="0.6" class="flow"/>
${dots
  .map(
    (d, i) => `<g class="fade" ${delay(i + 1, 0.18)}>
  ${d.current ? `<circle cx="${lineX}" cy="${d.y}" r="7" fill="${C.light}" class="pulse"/>` : ''}
  <circle cx="${lineX}" cy="${d.y}" r="7" fill="${C.bg}" stroke="${d.current ? C.light : C.deep}" stroke-width="2.5"/>
  <circle cx="${lineX}" cy="${d.y}" r="2.5" fill="${d.current ? C.pale : C.deep}"/>
</g>`,
  )
  .join('\n')}`;
  return frame(W, y - 8, `${title('Experience')}\n${timeline}\n${items}`, { defs, css });
}

/* ---------------------------------------------------------------- footer */
function footer() {
  const H = 110;
  const wave = (amp, period, y0) => {
    let d = `M0 ${y0}`;
    for (let x = 0; x <= W * 2; x += period / 2) {
      const dir = (x / (period / 2)) % 2 === 0 ? -1 : 1;
      d += ` Q${x + period / 4} ${y0 + dir * amp} ${x + period / 2} ${y0}`;
    }
    return d;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img">
<defs>
  <linearGradient id="g-wave" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.primary}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.light}"/><stop offset="1" stop-color="${C.primary}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="g-wave2" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.pink}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.pink}" stop-opacity="0.7"/><stop offset="1" stop-color="${C.pink}" stop-opacity="0"/>
  </linearGradient>
  <mask id="m"><rect width="${W}" height="${H}" fill="url(#g-wave)"/></mask>
</defs>
<style>
  text { font-family: 'Segoe UI', Ubuntu, -apple-system, sans-serif; }
  .w1 { animation: slide 9s linear infinite; }
  .w2 { animation: slide 13s linear infinite reverse; }
  @keyframes slide { from { transform: translateX(0); } to { transform: translateX(-240px); } }
  @media (prefers-reduced-motion: reduce) { .w1, .w2 { animation: none; } }
</style>
<g mask="url(#m)">
  <path class="w1" d="${wave(12, 240, 40)}" stroke="${C.light}" stroke-width="2"/>
  <path class="w2" d="${wave(8, 240, 46)}" stroke="${C.pink}" stroke-width="1.5" opacity="0.7"/>
</g>
<text x="${W / 2}" y="92" text-anchor="middle" fill="${C.muted}" font-size="13">Thanks for stopping by</text>
</svg>
`;
}

/* ------------------------------------------------------------------ main */
async function main() {
  await mkdir(OUT, { recursive: true });
  const files = {
    'hero.svg': hero(),
    'about.svg': about(),
    'projects.svg': projectsTitle(),
    'stack.svg': await stack(),
    'experience.svg': experience(),
    'footer.svg': footer(),
  };
  for (const [i, p] of CONTENT.projects.entries()) files[`project-${p[0].replace(/-+$/, '').toLowerCase()}.svg`] = await projectCard(p, i);
  for (const [icon, label] of CONTENT.contacts) files[`btn-${icon}.svg`] = button(icon, label);
  for (const [name, svg] of Object.entries(files)) await writeFile(path.join(OUT, name), svg);
  console.log(`Wrote ${Object.keys(files).length} files to ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
