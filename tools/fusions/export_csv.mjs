// node tools/fusions/export_csv.mjs <out.csv>  -- every shipped fusion, for review.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const E = JSON.parse(fs.readFileSync(path.join(HERE, 'brief/essences.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(HERE, 'brief/stones.json'), 'utf8'));
const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [['Essence', 'Stone', 'Slot', 'Name', 'Kind', 'Category', 'Shape', 'Role', 'Cooldown (s)', 'Description', 'Reviewed'].map(q).join(',')];
const OUT = path.join(HERE, 'out');
const C = JSON.parse(fs.readFileSync(path.join(HERE, 'chunks.json'), 'utf8'));
const reviewed = new Set();
for (const c of C) if (fs.existsSync(path.join(HERE, 'done', `${c.id}.reviewed`))) for (const s of c.stones) reviewed.add(`${c.essence}|${s}`);
let n = 0;
for (const ess of fs.readdirSync(OUT).sort()) {
  const dir = path.join(OUT, ess);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    const stone = f.replace(/\.json$/, '');
    let doc; try { doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    (doc.fusions || []).forEach((x, i) => {
      rows.push([(E[ess] || {}).name || ess, (S[stone] || {}).name || stone, ['Attack 1', 'Attack 2', 'Active', 'Passive'][i] || i,
        x.name, x.kind, x.category, x.template, x.role || '', x.cooldown ?? '', x.desc, reviewed.has(`${ess}|${stone}`) ? 'yes' : 'not yet'].map(q).join(','));
      n++;
    });
  }
}
fs.writeFileSync(process.argv[2] || 'fusions.csv', '﻿' + rows.join('\r\n') + '\r\n');
console.log(n, 'fusions');
