// ROUND 298 -- the identity briefs and the work order for the fusion authors.
import fs from 'fs';
const E = await import('../../src/data/essenceCatalog.js');
const S = await import('../../src/data/stoneCatalog.js');
const { ESSENCES } = await import('../../src/data/abilities.js');
const M = await import('../../src/data/essenceMotifs.js');
const SA = await import('../../src/data/essenceAbilities.js');
const CP = await import('../../src/data/canonPlacement.js');
const I = await import('../../src/data/essenceIdentity.js');
const essIds = Object.keys(ESSENCES).filter(id => E.ESSENCE_CATALOG[id]);
const ess = {};
for (const id of essIds) {
  const c = E.ESSENCE_CATALOG[id];
  ess[id] = { id, name: c.name, rarity: c.rarity, family: c.family, phrase: c.phrase, desc: c.desc,
    levers: ((M.ESSENCE_MOTIFS[id] || {}).levers || []), healthRule: I.HEALTH_ESSENCES.includes(id) };
}
const stones = {};
for (const id of S.STONE_IDS) {
  const c = S.STONE_CATALOG[id];
  stones[id] = { id, name: c.name, rarity: c.rarity, family: c.family, phrase: c.phrase, desc: c.desc, godOnly: !!c.godOnly };
}
fs.mkdirSync('tools/fusions/brief', { recursive: true });
fs.writeFileSync('tools/fusions/brief/essences.json', JSON.stringify(ess, null, 1));
fs.writeFileSync('tools/fusions/brief/stones.json', JSON.stringify(stones, null, 1));
// Priority: how likely a player is to hold the pair (drop weights).
const EW = E.ESSENCE_RARITY_WEIGHTS || {};
const SW = S.STONE_RARITY_WEIGHTS;
const pairs = [];
let canonSkipped = 0;
for (const e of essIds) for (const s of S.STONE_IDS) {
  if (e === 'essLife' && s === 'stoneFire') continue;   // authored by hand already (round 297); topped up separately
  if (CP.canonForSocket(e, s, 0)) { canonSkipped++; continue; }
  const w = (EW[E.ESSENCE_CATALOG[e].rarity] || 10) * (S.STONE_CATALOG[s].godOnly ? 0.5 : (SW[S.STONE_CATALOG[s].rarity] || 10));
  pairs.push({ e, s, w });
}
// Chunks: one essence, up to 24 stones of similar weight.
const byE = {};
for (const p of pairs) (byE[p.e] = byE[p.e] || []).push(p);
const chunks = [];
for (const [e, list] of Object.entries(byE)) {
  list.sort((a, b) => b.w - a.w || a.s.localeCompare(b.s));
  for (let i = 0; i < list.length; i += 24) {
    const part = list.slice(i, i + 24);
    chunks.push({ id: `${e}__${String(i / 24).padStart(2, '0')}`, essence: e, stones: part.map(p => p.s), weight: part.reduce((n, p) => n + p.w, 0) });
  }
}
chunks.sort((a, b) => b.weight - a.weight || a.id.slice(-2).localeCompare(b.id.slice(-2)) || a.id.localeCompare(b.id));
fs.writeFileSync('tools/fusions/chunks.json', JSON.stringify(chunks));
console.log(essIds.length, 'essences', S.STONE_IDS.length, 'stones', pairs.length, 'pairs', canonSkipped, 'canon pairs skipped', chunks.length, 'chunks');
console.log(chunks.slice(0, 3).map(c => `${c.id} w${c.weight} ${c.stones.length}`).join(' | '));
