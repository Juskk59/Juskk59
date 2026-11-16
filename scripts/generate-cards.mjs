#!/usr/bin/env node
/**
 * Generates the black & purple profile cards used in README.md:
 *   assets/generated/overview.svg   – all-time contributions, streaks, 12-month totals
 *   assets/generated/languages.svg  – languages weighted by my commits (last 12 months)
 *   assets/generated/activity.svg   – weekly contributions chart (last 12 months)
 *
 * Uses the GitHub GraphQL API. With a personal access token (classic, scopes:
 * repo, read:user, read:org) private contributions are counted too. Private
 * repository names are never written to the output, only aggregated numbers.
 *
 * Usage:
 *   GH_TOKEN=xxx GH_USER=Juskk59 node scripts/generate-cards.mjs
 *   node scripts/generate-cards.mjs --mock      # random data, for previewing the design
 *
 * No dependencies; requires Node 18+.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.resolve(process.env.OUT_DIR || path.join(ROOT, 'assets', 'generated'));
const USER = process.env.GH_USER || 'Juskk59';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const MOCK = process.argv.includes('--mock');
const EXCLUDED_LANGS = (process.env.EXCLUDE_LANGS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/* ------------------------------------------------------------------ theme */
const C = {
  bg: '#0d0b14',
  bg2: '#151021',
  border: '#2a1f3d',
  grid: '#211933',
  text: '#ede9fe',
  muted: '#8b80a8',
  primary: '#a855f7',
  light: '#c084fc',
  pale: '#e9d5ff',
  deep: '#6d28d9',
};
// purple ramp for languages (largest share first)
const LANG_COLORS = ['#c084fc', '#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', '#d8b4fe', '#4c1d95', '#5b4a7a'];
const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

/* ---------------------------------------------------------------- helpers */
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-cards-generator',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || !json.data) {
    throw new Error(`GraphQL error (${res.status}): ${JSON.stringify(json.errors || json)}`);
  }
  // partial errors happen when an organization blocks the token (SSO / PAT policy):
  // keep the data we did get instead of failing the whole run
  if (json.errors) console.warn(`GraphQL partial errors: ${json.errors.map((e) => e.message).join(' | ')}`);
  return json.data;
}

/* ------------------------------------------------------------ data fetch */
const Q_BASE = `
query($login: String!) {
  user(login: $login) {
    createdAt
    contributionsCollection {
      contributionYears
      totalCommitContributions
      restrictedContributionsCount
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        contributions { totalCount }
        repository {
          isFork
          languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges { size node { name } }
          }
        }
      }
    }
  }
}`;

const Q_YEAR = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const Q_OWNED_LANGS = `
query($login: String!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
      }
    }
  }
}`;

async function fetchData() {
  const base = (await gql(Q_BASE, { login: USER })).user;
  const cc = base.contributionsCollection;

  // all years -> full daily history (for all-time total + streaks)
  const days = new Map();
  let allTime = 0;
  const now = new Date();
  for (const year of cc.contributionYears) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
    const y = (await gql(Q_YEAR, { login: USER, from, to })).user.contributionsCollection.contributionCalendar;
    allTime += y.totalContributions;
    for (const w of y.weeks) for (const d of w.contributionDays) days.set(d.date, d.contributionCount);
  }

  // languages weighted by commits in each repository (last 12 months)
  const langs = new Map();
  for (const item of cc.commitContributionsByRepository) {
    const repo = item.repository;
    if (!repo || repo.isFork || !repo.languages.totalSize) continue;
    for (const e of repo.languages.edges) {
      const w = item.contributions.totalCount * (e.size / repo.languages.totalSize);
      langs.set(e.node.name, (langs.get(e.node.name) || 0) + w);
    }
  }
  let langNote = 'weighted by my commits · last 12 months';
  if (langs.size === 0) {
    // fallback: code size across repositories I can access
    const repos = (await gql(Q_OWNED_LANGS, { login: USER })).user.repositories.nodes;
    for (const r of repos) for (const e of r.languages.edges) langs.set(e.node.name, (langs.get(e.node.name) || 0) + e.size);
    langNote = 'by code size across my repositories';
  }

  const lastYearDays = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  return {
    since: new Date(base.createdAt).getUTCFullYear(),
    allTime,
    year: {
      total: cc.contributionCalendar.totalContributions,
      commits: cc.totalCommitContributions,
      prs: cc.totalPullRequestContributions,
      reviews: cc.totalPullRequestReviewContributions,
      issues: cc.totalIssueContributions,
      private: cc.restrictedContributionsCount,
    },
    days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)),
    lastYearDays,
    langs,
    langNote,
  };
}

function mockData() {
  const days = [];
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 3);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let d = new Date(start); d <= new Date(); d.setUTCDate(d.getUTCDate() + 1)) {
    const age = (new Date() - d) / 864e5;
    const weekday = d.getUTCDay();
    const active = rnd() < (age < 400 ? 0.82 : 0.35) * (weekday === 0 || weekday === 6 ? 0.35 : 1);
    days.push([d.toISOString().slice(0, 10), active ? Math.round(rnd() * (age < 400 ? 14 : 5)) + 1 : 0]);
  }
  const lastYearDays = days.slice(-365).map(([date, contributionCount]) => ({ date, contributionCount }));
  const total = lastYearDays.reduce((s, d) => s + d.contributionCount, 0);
  return {
    since: start.getUTCFullYear(),
    allTime: days.reduce((s, [, c]) => s + c, 0),
    year: { total, commits: Math.round(total * 0.86), prs: 41, reviews: 17, issues: 9, private: 0 },
    days,
    lastYearDays,
    langs: new Map([['PHP', 520], ['JavaScript', 260], ['Python', 140], ['HTML', 80], ['CSS', 60], ['Shell', 25], ['Less', 18]]),
    langNote: 'weighted by my commits · last 12 months',
  };
}

/* ---------------------------------------------------------------- metrics */
function computeMetrics(data) {
  const days = data.days;
  let longest = 0, run = 0;
  for (const [, c] of days) {
    run = c > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // current streak: today may still be empty, so start from yesterday in that case
  let i = days.length - 1;
  if (i >= 0 && days[i][1] === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i][1] > 0; i--) current++;

  const weekdayTotals = new Array(7).fill(0);
  let best = { date: null, count: 0 };
  for (const { date, contributionCount: c } of data.lastYearDays) {
    weekdayTotals[new Date(`${date}T12:00:00Z`).getUTCDay()] += c;
    if (c > best.count) best = { date, count: c };
  }
  const topWeekday = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const activeDays = data.lastYearDays.filter((d) => d.contributionCount > 0).length;
  return { longest, current, best, topWeekday, activeDays };
}

/* -------------------------------------------------------------- svg bits */
function frame(w, h, body, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img">
<defs>
  <linearGradient id="g-text" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.pale}"/><stop offset="1" stop-color="${C.primary}"/>
  </linearGradient>
  <radialGradient id="g-glow" cx="1" cy="0" r="1">
    <stop offset="0" stop-color="${C.primary}" stop-opacity="0.22"/>
    <stop offset="0.6" stop-color="${C.primary}" stop-opacity="0"/>
  </radialGradient>
  ${extraDefs}
</defs>
<style>
  text { font-family: ${FONT}; }
  .t { fill: ${C.text}; font-size: 16px; font-weight: 700; }
  .s { fill: ${C.muted}; font-size: 11px; }
  .lbl { fill: ${C.muted}; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; }
  .val { fill: ${C.text}; font-size: 16px; font-weight: 700; font-family: ${MONO}; }
  .fade { animation: fade 0.6s ease-out both; }
  .reveal { transform-box: view-box; transform-origin: 0 0; animation: reveal 1.6s cubic-bezier(0.3, 0, 0.2, 1) 0.2s both; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes reveal { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) { .fade, .reveal { animation: none; } }
</style>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="${C.bg}" stroke="${C.border}"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="url(#g-glow)"/>
${body}
</svg>
`;
}

const delay = (i) => `style="animation-delay:${(0.08 * i).toFixed(2)}s"`;

function overviewCard(data, m) {
  const W = 420, H = 230;
  const ringR = 34, circ = 2 * Math.PI * ringR;
  const ratio = m.longest ? Math.min(1, m.current / m.longest) : 0;
  const stats = [
    ['COMMITS · 12 MO', fmt(data.year.commits)],
    ['PULL REQUESTS', fmt(data.year.prs)],
    ['CODE REVIEWS', fmt(data.year.reviews)],
    ['LONGEST STREAK', `${fmt(m.longest)}d`],
    ['ACTIVE DAYS · 12 MO', fmt(m.activeDays)],
    ['MOST ACTIVE ON', WEEKDAYS[m.topWeekday].slice(0, 3)],
  ];
  const grid = stats
    .map(([l, v], i) => {
      const x = 24 + (i % 3) * 128;
      const y = 150 + Math.floor(i / 3) * 44;
      return `<g class="fade" ${delay(i + 3)}><text x="${x}" y="${y}" class="lbl">${esc(l)}</text><text x="${x}" y="${y + 20}" class="val">${esc(v)}</text></g>`;
    })
    .join('\n');

  return frame(
    W,
    H,
    `
<g class="fade"><text x="24" y="38" class="t">GitHub Activity</text>
<text x="24" y="56" class="s">Public + private work repositories</text></g>
<g class="fade" ${delay(1)}>
  <text x="24" y="104" font-size="38" font-weight="800" fill="url(#g-text)" font-family="${MONO}">${fmt(data.allTime)}</text>
  <text x="24" y="124" class="s">total contributions since ${data.since}</text>
</g>
<g class="fade" ${delay(2)} transform="translate(350 82)">
  <circle r="${ringR}" stroke="${C.grid}" stroke-width="7"/>
  <circle r="${ringR}" stroke="url(#g-text)" stroke-width="7" stroke-linecap="round"
    stroke-dasharray="${(circ * ratio).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90)"/>
  <text y="3" text-anchor="middle" font-size="21" font-weight="800" fill="${C.text}" font-family="${MONO}">${fmt(m.current)}</text>
  <text y="17" text-anchor="middle" class="lbl" font-size="7.5">DAY STREAK</text>
</g>
<line x1="24" x2="${W - 24}" y1="134" y2="134" stroke="${C.border}"/>
${grid}`,
  );
}

function languagesCard(data) {
  const W = 420, H = 230;
  const entries = [...data.langs.entries()].filter(([n]) => !EXCLUDED_LANGS.includes(n.toLowerCase())).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  let top = entries.slice(0, 7);
  const rest = entries.slice(7).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push(['Other', rest]);
  top = top.map(([name, v], i) => ({ name, pct: (v / total) * 100, color: LANG_COLORS[i % LANG_COLORS.length] }));

  // stacked bar
  const barX = 24, barW = W - 48, barY = 74;
  let x = barX;
  const segs = top
    .map((l) => {
      const w = (l.pct / 100) * barW;
      const r = `<rect x="${x.toFixed(2)}" y="${barY}" width="${Math.max(w, 0).toFixed(2)}" height="10" fill="${l.color}"/>`;
      x += w;
      return r;
    })
    .join('');

  const list = top
    .map((l, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const lx = 24 + col * 192, ly = 118 + row * 28;
      return `<g class="fade" ${delay(i + 2)} transform="translate(${lx} ${ly})">
  <circle cx="5" cy="-4" r="5" fill="${l.color}"/>
  <text x="18" y="0" fill="${C.text}" font-size="13" font-weight="600">${esc(l.name)}</text>
  <text x="172" y="0" text-anchor="end" fill="${C.muted}" font-size="12" font-family="${MONO}">${l.pct.toFixed(1)}%</text>
</g>`;
    })
    .join('\n');

  return frame(
    W,
    H,
    `
<g class="fade"><text x="24" y="38" class="t">Most Used Languages</text>
<text x="24" y="56" class="s">${esc(data.langNote)}</text></g>
<clipPath id="bar"><rect x="${barX}" y="${barY}" width="${barW}" height="10" rx="5"/></clipPath>
<g clip-path="url(#bar)" class="fade" ${delay(1)}><rect x="${barX}" y="${barY}" width="${barW}" height="10" fill="${C.grid}"/>${segs}</g>
${list}`,
  );
}

function activityCard(data, m) {
  const W = 860, H = 262;
  // aggregate the last 52 weeks into weekly sums
  const days = data.lastYearDays;
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    weeks.push({ date: chunk[0].date, days: chunk.length, count: chunk.reduce((s, d) => s + d.contributionCount, 0) });
  }
  // the current week is still in progress; leave it out so the line doesn't fake a drop
  if (weeks.length > 2 && weeks[weeks.length - 1].days < 7) weeks.pop();
  const px = 48, pw = W - px - 28, py = 100, ph = 116;
  const max = Math.max(4, ...weeks.map((w) => w.count));
  const niceMax = Math.ceil(max / 4) * 4;
  const X = (i) => px + (weeks.length > 1 ? (i / (weeks.length - 1)) * pw : 0);
  const Y = (v) => py + ph - (v / niceMax) * ph;

  // smooth path (Catmull-Rom -> Bezier)
  const pts = weeks.map((w, i) => [X(i), Y(w.count)]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(py + ph, p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(py + ph, p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${d} L${X(weeks.length - 1).toFixed(1)},${py + ph} L${px},${py + ph} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = py + ph - f * ph;
      return `<line x1="${px}" x2="${px + pw}" y1="${y}" y2="${y}" stroke="${C.grid}" ${f === 0 ? '' : 'stroke-dasharray="3 5"'}/>
<text x="${px - 10}" y="${y + 4}" text-anchor="end" class="s" font-family="${MONO}">${Math.round(f * niceMax)}</text>`;
    })
    .join('\n');

  // month labels at the first week of each month
  const starts = [];
  weeks.forEach((w, i) => {
    const mo = new Date(`${w.date}T12:00:00Z`).getUTCMonth();
    if (!starts.length || starts[starts.length - 1].mo !== mo) starts.push({ i, mo });
  });
  if (starts.length > 1 && starts[1].i - starts[0].i < 3) starts.shift();
  const monthLabels = starts
    .filter((s) => s.i <= weeks.length - 3)
    .map((s) => `<text x="${X(s.i).toFixed(1)}" y="${py + ph + 22}" class="s">${MONTHS[s.mo]}</text>`)
    .join('');

  const peakIdx = weeks.reduce((bi, w, i) => (w.count > weeks[bi].count ? i : bi), 0);
  const [pkx, pky] = pts[peakIdx];
  const peakLabelX = Math.min(Math.max(pkx, px + 60), px + pw - 60);
  const bestDay = m.best.date
    ? `${MONTHS[new Date(`${m.best.date}T12:00:00Z`).getUTCMonth()]} ${new Date(`${m.best.date}T12:00:00Z`).getUTCDate()}`
    : '–';

  const defs = `
  <linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.primary}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="${C.primary}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="g-line" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.deep}"/><stop offset="0.5" stop-color="${C.primary}"/><stop offset="1" stop-color="${C.pale}"/>
  </linearGradient>
  <clipPath id="reveal"><rect class="reveal" x="0" y="0" width="${W}" height="${H}"/></clipPath>`;

  const pill = (x, label, value) => `<g transform="translate(${x} 24)">
  <rect width="150" height="34" rx="9" fill="${C.bg2}" stroke="${C.border}"/>
  <text x="12" y="14" class="lbl" font-size="8.5">${esc(label)}</text>
  <text x="12" y="28" fill="${C.text}" font-size="12.5" font-weight="700" font-family="${MONO}">${esc(value)}</text>
</g>`;

  return frame(
    W,
    H,
    `
<g class="fade"><text x="24" y="38" class="t">Contributions · Last 12 Months</text>
<text x="24" y="56" class="s">Weekly totals, including private work repositories</text></g>
<g class="fade" ${delay(1)}>
${pill(W - 24 - 150 * 3 - 16, 'TOTAL · 12 MO', fmt(data.year.total))}
${pill(W - 24 - 150 * 2 - 8, 'BEST DAY', `${fmt(m.best.count)} · ${bestDay}`)}
${pill(W - 24 - 150, 'WEEKLY AVERAGE', (data.year.total / Math.max(1, weeks.length)).toFixed(1))}
</g>
${gridLines}
${monthLabels}
<g clip-path="url(#reveal)">
  <path d="${area}" fill="url(#g-area)"/>
  <path d="${d}" stroke="url(#g-line)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${pkx.toFixed(1)}" cy="${pky.toFixed(1)}" r="9" fill="${C.primary}" opacity="0.25"/>
  <circle cx="${pkx.toFixed(1)}" cy="${pky.toFixed(1)}" r="4" fill="${C.pale}"/>
</g>
<text x="${peakLabelX.toFixed(1)}" y="${(pky - 14).toFixed(1)}" text-anchor="middle" fill="${C.pale}" font-size="11" font-weight="700" font-family="${MONO}" class="fade" style="animation-delay:1.5s">peak ${fmt(weeks[peakIdx].count)}/wk</text>`,
    defs,
  );
}

/* ------------------------------------------------------------------- main */
async function main() {
  if (!MOCK && !TOKEN) {
    console.error('Missing GH_TOKEN. Run with --mock to preview with random data.');
    process.exit(1);
  }
  const data = MOCK ? mockData() : await fetchData();
  const m = computeMetrics(data);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'overview.svg'), overviewCard(data, m));
  await writeFile(path.join(OUT_DIR, 'languages.svg'), languagesCard(data));
  await writeFile(path.join(OUT_DIR, 'activity.svg'), activityCard(data, m));
  console.log(
    `Cards written to ${path.relative(ROOT, OUT_DIR)} · all-time ${data.allTime} · 12mo ${data.year.total} · streak ${m.current}/${m.longest}` +
      (data.year.private ? ` · ${data.year.private} restricted (token cannot see private repos)` : ''),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
