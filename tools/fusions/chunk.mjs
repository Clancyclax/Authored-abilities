// node tools/fusions/chunk.mjs <chunkId>  -- your essence and your stones.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const C = JSON.parse(fs.readFileSync(path.join(HERE, 'chunks.json'), 'utf8'));
const E = JSON.parse(fs.readFileSync(path.join(HERE, 'brief/essences.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(HERE, 'brief/stones.json'), 'utf8'));
const id = process.argv[2];
const c = C.find(x => x.id === id);
if (!c) { console.log(`no chunk ${id}`); process.exit(1); }
const e = E[c.essence];
console.log(`ESSENCE ${c.essence}: ${e.name} (${e.rarity}, family ${e.family}; "${e.phrase}"; levers ${e.levers.join(', ')})${e.healthRule ? ' -- HEALTH RULE APPLIES' : ''}`);
console.log(`  catalogue: ${e.desc}`);
console.log(`STONES (${c.stones.length}):`);
for (const s of c.stones) console.log(`  ${s}: ${S[s].name} (${S[s].rarity}, family ${S[s].family}; "${S[s].phrase}") ${S[s].desc}`);
if (c.extra) console.log(`NOTE: ${c.extra}`);
console.log(`VALIDATE: node tools/fusions/validate.mjs ${c.essence} ${c.stones.join(' ')}`);
