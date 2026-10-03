// ============================================================================
// ROUND 283 -- WHAT A LEGENDARY NEEDS TO GROW, AND WHERE IT COMES FROM.
//
// [Dread Salvation]'s growth conditions, word for word from the user:
//   "Growth Conditions (bronze): •1 kilogram of blood gold •4 kilograms of
//    low grade (bronze rank) star-fall silver •100 bronze-rank iron
//    quintessence gems. •100 bronze-rank magic quintessence gems. •1000
//    bronze rank spirit coins. •Ritual of bronze ascension."
//
// Asked whether to build these: "Add them as real materials". So:
//   - BLOOD GOLD and STAR-FALL SILVER are real materials, found as 250 g
//     nuggets. Star-fall silver comes in grades by rank ("low grade (bronze
//     rank)"); blood gold is one metal.
//   - QUINTESSENCE GEMS are the game's quintessence, which has a rank now.
//   - SPIRIT COINS are the game's coins at that rank.
//   - THE RITUAL is performed in the Society's ritual hall ("Add a ritual
//     hall to the adventure society"), and is the act of growing itself.
//
// Each condition is kept as its text (what the card prints) AND as a need
// (what the ritual checks and consumes), parsed from the text so the two
// cannot say different things.
// ============================================================================

export const NUGGET_GRAMS = 250;
const RANKS = ['iron', 'bronze', 'silver', 'gold'];

export const GROWTH_MATERIAL_DEFS = {
  bloodGold: { id: 'bloodGold', name: 'Blood Gold Nugget', growth: true, family: 'growth',
    desc: `A ${NUGGET_GRAMS} g nugget of blood gold, dark red in the seam. A growth material: legendary items grow on it.` },
};
for (const r of RANKS.slice(1)) {
  const id = `starfallSilver_${r}`;
  GROWTH_MATERIAL_DEFS[id] = { id, name: `Star-fall Silver Nugget (${r} rank)`, growth: true, family: 'growth', rank: r,
    desc: `A ${NUGGET_GRAMS} g nugget of low grade (${r} rank) star-fall silver. A growth material: legendary items grow on it.` };
}
export const GROWTH_MATERIAL_IDS = Object.keys(GROWTH_MATERIAL_DEFS);

/** A growth-material drop, or null. Bronze rank and up only -- the conditions
 *  are all for growing past iron -- and rare: 1 in 120 kills at bronze. */
export function rollGrowthMaterial(rng, rank) {
  const i = RANKS.indexOf(rank);
  if (i < 1) return null;
  if (rng() >= 1 / 120 * (1 + 0.25 * (i - 1))) return null;
  return rng() < 0.35 ? 'bloodGold' : `starfallSilver_${rank}`;
}
/** A vein's chance of giving up a nugget beside its ore, by the vein's tier
 *  (2 = bronze band). */
export function rollVeinNugget(rng, tier) {
  const rank = RANKS[Math.max(0, Math.min(3, (tier | 0) - 1))];
  if (RANKS.indexOf(rank) < 1) return null;
  if (rng() >= 0.06) return null;
  return rng() < 0.3 ? 'bloodGold' : `starfallSilver_${rank}`;
}

// ---------------------------------------------------------------------------
// Parsing a condition line into a need.
// ---------------------------------------------------------------------------
const NUM = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
const num = (s) => NUM[String(s).toLowerCase()] || Number(String(s).replace(/,/g, ''));

/**
 * One condition line -> { kind, qty, id?, rank?, essence? } or null.
 *   "1 kilogram of blood gold"
 *   "4 kilograms of low grade (bronze rank) star-fall silver"
 *   "100 bronze-rank iron quintessence gems."
 *   "1000 bronze rank spirit coins."
 *   "Ritual of bronze ascension."
 */
export function parseGrowthCondition(line) {
  const t = String(line).replace(/^[•\s]+/, '').replace(/\.$/, '').trim();
  let m = /^(\S+)\s+kilograms?\s+of\s+blood\s+gold$/i.exec(t);
  if (m) return { kind: 'material', id: 'bloodGold', qty: Math.round(num(m[1]) * 1000 / NUGGET_GRAMS), grams: num(m[1]) * 1000 };
  m = /^(\S+)\s+kilograms?\s+of\s+low\s+grade\s+\((\w+)\s+rank\)\s+star-fall\s+silver$/i.exec(t);
  if (m) return { kind: 'material', id: `starfallSilver_${m[2].toLowerCase()}`, qty: Math.round(num(m[1]) * 1000 / NUGGET_GRAMS), grams: num(m[1]) * 1000 };
  m = /^(\S+)\s+(\w+)-rank\s+(\w+)\s+quintessence\s+gems$/i.exec(t);
  if (m) return { kind: 'quintessence', qty: num(m[1]), rank: m[2].toLowerCase(), essence: m[3][0].toUpperCase() + m[3].slice(1).toLowerCase() };
  m = /^(\S+)\s+(\w+)\s+rank\s+spirit\s+coins$/i.exec(t);
  if (m) return { kind: 'coins', qty: num(m[1]), rank: m[2].toLowerCase() };
  m = /^Ritual\s+of\s+(\w+)\s+ascension$/i.exec(t);
  if (m) return { kind: 'ritual', rank: m[1].toLowerCase() };
  return null;
}

/** The whole block, text and needs together. */
export function growthBlock(to, lines) {
  return { to, conditions: lines.slice(), needs: lines.map(parseGrowthCondition) };
}

/** The rank after this one, or null at the top. No diamond. */
export function nextGrowthRank(rank) {
  const i = RANKS.indexOf(rank);
  return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null;
}
export { RANKS as GROWTH_RANKS };
