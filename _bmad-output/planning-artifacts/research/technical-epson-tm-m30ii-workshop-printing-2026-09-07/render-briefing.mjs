import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Regenerate the offline HTML presentation from the canonical report.
const folder = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(folder, 'research.md');
const sourceResult = spawnSync('uv', ['run', '.agents/skills/bmad-deep-recon/scripts/recon_kit.py', 'escape-sources', input], { encoding: 'utf8' });
if (sourceResult.status !== 0) throw new Error(sourceResult.stderr || sourceResult.stdout);
const sourceTable = JSON.parse(sourceResult.stdout);
if (sourceTable.invalid_urls?.length) throw new Error('Source appendix contains invalid URLs');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function inline(raw) {
  const tokens = [];
  const token = html => `\u0000${tokens.push(html) - 1}\u0000`;
  let value = raw.replace(/`([^`]+)`/g, (_, code) => token(`<code>${esc(code)}</code>`));
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    if (!/^(https?:\/\/|[a-zA-Z0-9_.-]+\.(?:md|html|json)$)/.test(href)) return label;
    return token(`<a href="${esc(href)}">${esc(label)}</a>`);
  });
  value = esc(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/\[(\d+)\]/g, '<a class="cite" href="#src-$1">[$1]</a>');
  value = value.replace(/\b(unverified|verified|disputed)\b/gi, match => `<span class="badge ${match.toLowerCase()}">${match}</span>`);
  return value.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}
const markdown = fs.readFileSync(input, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
const lines = markdown.split('\n');
const sections = [];
let current = null;
for (const line of lines) {
  if (line.startsWith('# ')) continue;
  if (line.startsWith('## ')) {
    current = { title: line.slice(3), lines: [] };
    sections.push(current);
  } else if (current) current.lines.push(line);
}
function render(lines) {
  let out = '', paragraph = [], list = null, code = null, table = [];
  const flushParagraph = () => { if (paragraph.length) out += `<p>${inline(paragraph.join(' '))}</p>`; paragraph = []; };
  const flushList = () => { if (list) out += `</${list}>`; list = null; };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter(line => !/^\|[\s:|-]+\|$/.test(line));
    out += '<div class="table-wrap"><table>' + rows.map((row, i) => '<tr>' + row.replace(/^\||\|$/g, '').split('|').map(cell => `<${i ? 'td' : 'th'}>${inline(cell.trim())}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</table></div>';
    table = [];
  };
  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph(); flushList(); flushTable();
      if (code === null) code = []; else { out += `<pre><code>${esc(code.join('\n'))}</code></pre>`; code = null; }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (line.startsWith('|')) { flushParagraph(); flushList(); table.push(line); continue; }
    flushTable();
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    if (line.startsWith('### ')) { flushParagraph(); flushList(); out += `<h3>${inline(line.slice(4))}</h3>`; continue; }
    const item = line.match(/^(?:([-*]) |(\d+)\. )(.*)$/);
    if (item) {
      flushParagraph(); const next = item[1] ? 'ul' : 'ol';
      if (list !== next) { flushList(); list = next; out += `<${next}>`; }
      out += `<li>${inline(item[3])}</li>`; continue;
    }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList(); flushTable();
  return out;
}
const toc = sections.map(s => `<a href="#${slug(s.title)}">${esc(s.title)}</a>`).join('');
const body = sections.map((s, i) => {
  const content = s.title === 'Source appendix' ? `<details><summary>Expand cited sources</summary><div class="table-wrap">${sourceTable.html}</div></details>` : render(s.lines);
  return `<section id="${slug(s.title)}" class="${i === 0 ? 'summary' : ''}"><h2>${esc(s.title)}</h2>${content}</section>`;
}).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Epson TM-m30II workshop printing — research</title>
<style>
:root{color-scheme:light dark;--bg:#f4f6f8;--card:#fff;--text:#172033;--muted:#576477;--line:#d9e0e8;--accent:#125f85;--warn:#8b3100;--warnbg:#fff0d9}
@media(prefers-color-scheme:dark){:root{--bg:#111821;--card:#19232f;--text:#ecf1f7;--muted:#b4c1d1;--line:#36485d;--accent:#7dcbea;--warn:#ffd393;--warnbg:#503715}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,sans-serif}header{padding:42px max(24px,calc((100vw - 1220px)/2));background:var(--card);border-bottom:1px solid var(--line)}h1{font-size:clamp(28px,4vw,42px);line-height:1.15;margin:0 0 18px}header p{max-width:900px;color:var(--muted)}.meta{font-size:14px}.layout{display:grid;grid-template-columns:215px minmax(0,1fr);gap:28px;max-width:1268px;padding:28px 24px 60px;margin:auto}nav{position:sticky;top:20px;align-self:start}nav a{display:block;padding:7px 0;color:var(--muted);font-size:14px;text-decoration:none}a{color:var(--accent)}section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:28px;margin:0 0 22px;scroll-margin-top:20px}section.summary{border-top:5px solid var(--accent)}h2{margin-top:0;line-height:1.25;font-size:25px}h3{margin-top:28px;font-size:19px}p{margin:0 0 16px}li{margin-bottom:9px}code{font-size:.9em;overflow-wrap:anywhere}pre{overflow:auto;padding:18px;border:1px solid var(--line);border-radius:8px;line-height:1.5}.table-wrap{overflow-x:auto}table{border-collapse:collapse;min-width:620px;width:100%;font-size:14px}td,th{padding:11px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted)}.badge{display:inline-block;border-radius:5px;padding:0 5px;font-size:12px;font-weight:650}.unverified,.disputed{background:var(--warnbg);color:var(--warn);border:1px solid currentColor}.verified{color:var(--accent)}summary{cursor:pointer;color:var(--accent);font-weight:650}.cite{white-space:nowrap}@media(max-width:850px){.layout{display:block;padding:18px 12px}nav{position:relative;top:0;display:flex;overflow-x:auto;gap:16px;padding:0 10px 18px}nav a{white-space:nowrap}section{padding:22px 18px}header{padding:30px 24px}}@media print{nav{display:none}.layout{display:block}section{break-inside:avoid}details{display:block}}
</style></head><body><header><h1>Epson TM-m30II workshop printing</h1><p>Determine the printer capabilities and connection approach for one-tap bike tags and customer checklists from Windows laptops with Chrome.</p><div class="meta">Technical research · 7 September 2026 · Standard, up to two rounds · Normal verification · Documentation study; physical pilot pending</div></header><div class="layout"><nav aria-label="Report contents">${toc}</nav><main>${body}</main></div></body></html>`;
fs.writeFileSync(path.join(folder, 'research-briefing.html'), html);
console.log(JSON.stringify({file:path.join(folder,'research-briefing.html'),sections:sections.length,bytes:Buffer.byteLength(html),invalidSourceUrls:sourceTable.invalid_urls}));
