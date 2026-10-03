// node tools/fusions/vocab.mjs [template ...]  -- the fields and a real example
// for each template (no args: the list of allowed templates).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const V = JSON.parse(fs.readFileSync(path.join(HERE, 'vocab.json'), 'utf8'));
const BANNED = new Set(['aura', 'perception', 'townPortal', 'altResource', 'transform', 'weaponAffinity', 'unarmedFocus', 'twoHandWield']);
const want = process.argv.slice(2);
if (!want.length) { for (const v of V) if (!BANNED.has(v.template)) console.log(`${v.template}  [${v.kinds.join('/')}: ${v.categories.join('/')}]`); process.exit(0); }
for (const t of want) {
  const v = V.find(x => x.template === t);
  if (!v) { console.log(`${t}: unknown template`); continue; }
  console.log(`== ${t}  kinds ${v.kinds.join('/')}  categories ${v.categories.join('/')}${BANNED.has(t) ? '  (NOT ALLOWED)' : ''}`);
  console.log(`usual fields: ${v.usualFields.join(', ')}`);
  console.log(`optional fields: ${v.optionalFields.join(', ')}`);
  console.log(`example: ${JSON.stringify(v.example)}`);
  console.log(`its card text: ${v.exampleDesc}`);
}
