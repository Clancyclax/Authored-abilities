// ROUND 298 -- the mechanic vocabulary the fusion authors write in: every
// template the generator can make, with the fields its runtime reads, taken
// from real generated abilities rather than from memory.
import fs from 'fs';
const A = await import('../../src/data/awakening.js');
const { ESSENCES } = await import('../../src/data/abilities.js');
const { STONE_IDS } = await import('../../src/data/stoneCatalog.js');
const eids = Object.keys(ESSENCES);
const SKIP = /^(_|rankAspects$|stats$|desc$|name$|color$|catKey$|phrase|signature|essenceId$|stoneId$|innate$|lever|spine|motif|cmp|composed|nameParts|flavour|charter|seat|shape$|clauseVariant|scaleVariant|twistLabel)/;
const byT = {};
let n = 0;
for (const cat of A.ABILITY_CATEGORIES) {
  for (let i = 0; i < 6; i++) {
    const e = ESSENCES[eids[(i * 37 + cat.key.length * 11) % eids.length]];
    const s = STONE_IDS[(i * 53 + cat.key.length * 7) % STONE_IDS.length];
    let g = null;
    try { g = A.generateCategoryAbility(cat.key, e, s, `vocab|${cat.key}|${i}`, new Set(), { kitRank: 'iron' }); } catch (err) { continue; }
    if (!g || !g.template) continue;
    n++;
    const t = g.template;
    const rec = byT[t] = byT[t] || { template: t, kinds: new Set(), categories: new Set(), fieldCount: {}, samples: 0, example: null, exampleDesc: null, cats: new Set() };
    rec.kinds.add(g.kind); rec.categories.add(A.abilityCategoryOf(g)); rec.cats.add(cat.key); rec.samples++;
    for (const [k, v] of Object.entries(g)) {
      if (SKIP.test(k) || v === null || v === undefined || v === false || v === '') continue;
      rec.fieldCount[k] = (rec.fieldCount[k] || 0) + 1;
    }
    if (!rec.example || Object.keys(g).length > Object.keys(rec.example).length) {
      const ex = {};
      for (const [k, v] of Object.entries(g)) { if (!SKIP.test(k) && v !== null && v !== undefined && v !== false && v !== '' && typeof v !== 'function') ex[k] = v; }
      rec.example = ex; rec.exampleDesc = g.desc; rec.exampleStats = g.stats;
    }
  }
}
const out = Object.values(byT).map(r => ({
  template: r.template, kinds: [...r.kinds], categories: [...r.categories], fromCategoryRows: [...r.cats].slice(0, 8),
  samples: r.samples,
  usualFields: Object.entries(r.fieldCount).filter(([, c]) => c >= r.samples * 0.6).map(([k]) => k).sort(),
  optionalFields: Object.entries(r.fieldCount).filter(([, c]) => c < r.samples * 0.6).map(([k]) => k).sort(),
  example: r.example, exampleDesc: r.exampleDesc, exampleStats: r.exampleStats,
})).sort((a, b) => b.samples - a.samples);
fs.writeFileSync(process.argv[2] || 'tools/fusions/vocab.json', JSON.stringify(out, null, 1));
console.log(n, 'abilities,', out.length, 'templates');
console.log(out.map(o => `${o.template}(${o.kinds.join('/')}:${o.categories.join('/')})`).join(' '));
