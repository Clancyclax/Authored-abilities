// ============================================================================
// ROUND 91 -- THE AUCTION HOUSE STARTS TRADING IN MATERIALS.
//
// The user's ask, verbatim:
//
//   "Monster cores and quintessence should share a tab at the Auction House
//    with 6 randomized (cores or quintessence's) for sale resetting each day.
//    They should be relatively expensive but this allows players a chance to
//    sell what they have to purchase what they need. Available cores should be
//    rank gated by region. i.e. no bronze, silver, or gold cores in region 1s
//    auction house."
//
//   "There should also be a tab for gatherables and monster parts. 7 slots
//    randomized also resetting daily."
//
// WHAT THIS IS FOR, and the middle sentence is the whole design: *a chance to
// sell what they have to purchase what they need*. Round 90 built a crafting
// machine with four ingredient types, three of which come from three different
// activities -- you mine stock, you fight for cores, you kill the right
// element for quintessence. A player who has done one of them and not the
// others stalls, and stalling is only interesting the first time. This is the
// release valve, and it is priced so it stays a valve rather than becoming the
// tap.
//
// FOUR TIMES WHAT THEY WOULD PAY YOU. That is the ruling, and it is steep on
// purpose: you sell four of a thing you have to buy one you need. The tab is
// the last resort for the material blocking a commission, not a way to shop
// your way past the world.
//
// THE REGION GATE IS THE SAME BAND CRAFTING ALREADY USES. `REGION_STOCK_TIERS`
// says which tiers are in a region's ground; this says the auction house sells
// the same window. One table, so a region cannot end up selling a core its own
// monsters do not drop -- which is exactly what "no bronze, silver, or gold
// cores in region 1" is asking for, stated as a rule instead of a list.
// ============================================================================

import { REGION_STOCK_TIERS, CRAFT_RANKS, CORE_DEFS, coreId, STOCK_DEFS, stockId,
         STOCK_FAMILIES } from './crafting.js';

/** The two new tabs, and how many lots each cuts a day. The user's numbers. */
export const MATERIAL_LOT_COUNT = 6;
export const GATHER_LOT_COUNT = 7;

/** What the auctioneer charges over what they would pay you for the same
 *  thing. The ruling. */
export const AUCTION_MARKUP = 4;

/** Which kinds sit under which tab. Named here rather than inferred from the
 *  lot, so the tab a kind belongs to is a fact one file states. */
export const AUCTION_TABS = {
  material: { key: 'material', label: 'Cores & Quintessence', kinds: ['core', 'quintessence'], count: MATERIAL_LOT_COUNT },
  gather:   { key: 'gather',   label: 'Gatherables & Parts',  kinds: ['stock', 'part'],        count: GATHER_LOT_COUNT },
};
export const AUCTION_TAB_KEYS = Object.keys(AUCTION_TABS);
export const AUCTION_TAB_FOR_KIND = (() => {
  const m = {};
  for (const t of Object.values(AUCTION_TABS)) for (const k of t.kinds) m[k] = t.key;
  return m;
})();

/**
 * THE REGION WINDOW.
 *
 * A region's ground carries two adjacent stock tiers, and its monsters fight
 * at ranks to match. The auction house sells inside the same window, so what
 * is on the block is a readable statement about how far you have travelled:
 * Cadence sells Dim and Iron cores and tier 0-1 stock, Vashra sells the top of
 * everything.
 *
 * The rarity ceiling for quintessence is derived from the same band rather
 * than written down twice -- a region that trades in Iron-rank materials
 * trades in Uncommon ones.
 */
export const RARITY_LADDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Divine'];

export function regionBand(regionId) {
  return REGION_STOCK_TIERS[regionId] || REGION_STOCK_TIERS.nek;
}

/** The highest quintessence rarity a region's auction may stock. Tier 0-1 →
 *  Uncommon, and one rung of rarity per rung of tier from there. Legendary and
 *  Divine are never on the block: a material that changes your life is not
 *  something a market cuts six of every morning. */
export function rarityCeilingFor(regionId) {
  const top = Math.max(...regionBand(regionId));
  return RARITY_LADDER[Math.min(3, 1 + Math.max(0, top - 1))];
}

/** Every core a region may sell. */
export function coresFor(regionId) {
  return regionBand(regionId).map(t => CORE_DEFS[coreId(t)]).filter(Boolean);
}

/** Every stock row a region may sell -- three families across its own band. */
export function stockFor(regionId) {
  const out = [];
  for (const t of regionBand(regionId)) {
    for (const f of STOCK_FAMILIES) {
      const d = STOCK_DEFS[stockId(f, t)];
      if (d) out.push(d);
    }
  }
  return out;
}

/** Every quintessence a region may sell, given the catalogue. */
export function quintessenceFor(regionId, QUINTESSENCE_DEFS) {
  const cap = RARITY_LADDER.indexOf(rarityCeilingFor(regionId));
  return Object.values(QUINTESSENCE_DEFS || {})
    .filter(q => RARITY_LADDER.indexOf(q.rarity) <= cap);
}

/**
 * The day's lots for one tab, in one region.
 *
 * `valueOf(kind, id)` is the scene's own `_sellValue` passed in -- the price is
 * FOUR TIMES what the auctioneer would pay you for the same item, which means
 * it rides every ladder the shop already uses and there is no second price
 * table to keep in step. That is the same reasoning round 86 applied when it
 * deleted quintessence's private value table.
 *
 * Deterministic in `rand`, so a suite can ask for a day twice and get the same
 * block, and the runtime hands it `Math.random`.
 */
export function rollAuctionLots(tabKey, regionId, cat, rand = Math.random) {
  const tab = AUCTION_TABS[tabKey];
  if (!tab) return [];
  const pool = [];
  if (tab.kinds.includes('core')) {
    for (const c of coresFor(regionId)) pool.push({ kind: 'core', id: c.id, name: c.name, rank: c.rank });
  }
  if (tab.kinds.includes('quintessence')) {
    for (const q of quintessenceFor(regionId, cat.QUINTESSENCE_DEFS)) {
      pool.push({ kind: 'quintessence', id: q.id, name: q.name, rarity: q.rarity });
    }
  }
  if (tab.kinds.includes('stock')) {
    for (const d of stockFor(regionId)) pool.push({ kind: 'stock', id: d.id, name: d.name, rank: d.rank });
  }
  if (tab.kinds.includes('part')) {
    for (const p of Object.values(cat.PART_DEFS || {})) pool.push({ kind: 'part', id: p.id, name: p.name });
  }
  if (!pool.length) return [];
  // THE KIND IS CHOSEN FIRST, and evenly. Rolling uniformly over the merged
  // pool looks fair and is not: the gather tab's pool is nineteen monster
  // parts against six stock rows, so a seven-lot block came out six parts and
  // one bar, and the Nek's material block came out five quintessence and one
  // core against a pool of thirty-five and two. A tab is named for two things
  // and should sell both, so the slots alternate between the kinds that have
  // anything in them and the row is picked inside the kind.
  const byKind = new Map();
  for (const e of pool) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind).push(e);
  }
  const kinds = tab.kinds.filter(k => byKind.has(k));
  const lots = [];
  // Never the same row twice in one day's block -- six lots that are all Iron
  // Cores is a tab, not a market. A pool smaller than the slot count still
  // fills every slot; the quantity is what varies once the rows run out.
  const used = new Set();
  for (let i = 0; i < tab.count; i++) {
    const kind = kinds[i % kinds.length];
    const rows = byKind.get(kind);
    let pick = null;
    for (let t = 0; t < 24 && !pick; t++) {
      const cand = rows[Math.floor(rand() * rows.length)];
      if (!used.has(`${cand.kind}:${cand.id}`) || used.size >= pool.length) pick = cand;
    }
    if (!pick) pick = rows[i % rows.length];
    used.add(`${pick.kind}:${pick.id}`);
    // HOW MANY. A core is bought by the dozen (a Bronze commission wants
    // fourteen) and a part is bought one at a time, so the quantity is a
    // property of what the thing is FOR rather than a shared roll.
    const qty = pick.kind === 'core' ? 3 + Math.floor(rand() * 6)
      : pick.kind === 'quintessence' ? 4 + Math.floor(rand() * 9)
      : pick.kind === 'stock' ? 2 + Math.floor(rand() * 4)
      : 1;
    const unit = Math.max(1, Math.round(cat.valueOf(pick.kind, pick.id) * AUCTION_MARKUP));
    lots.push({ ...pick, tab: tabKey, qty, unit, price: unit * qty });
  }
  return lots;
}

/**
 * Faults a suite can assert against.
 *
 * The one that matters is the GATE, and it is checked by asking every region
 * for its block rather than by reading the table: "no bronze, silver, or gold
 * cores in region 1's auction house" is a statement about what comes out, and
 * a table can be right while the roll that reads it is not.
 */
export function auctionFaults(cat) {
  const out = [];
  const regions = Object.keys(REGION_STOCK_TIERS);
  for (const [key, tab] of Object.entries(AUCTION_TABS)) {
    if (!tab.count || tab.count < 1) out.push(`${key} cuts no lots`);
    if (!tab.kinds.length) out.push(`${key} holds no kinds`);
    if (!tab.label) out.push(`${key} has no label`);
  }
  if (MATERIAL_LOT_COUNT !== 6) out.push(`the material tab cuts ${MATERIAL_LOT_COUNT}, and the ask was 6`);
  if (GATHER_LOT_COUNT !== 7) out.push(`the gather tab cuts ${GATHER_LOT_COUNT}, and the ask was 7`);
  if (AUCTION_MARKUP < 2) out.push(`a markup of ${AUCTION_MARKUP} is not "relatively expensive"`);

  for (const rg of regions) {
    const band = regionBand(rg);
    // THE ASK, STATED AS A CHECK: region 1 sells no bronze, silver or gold core.
    for (const c of coresFor(rg)) {
      if (!band.includes(c.tier)) out.push(`${rg} sells a ${c.rank} core, outside its band ${band}`);
      if (c.rank === 'diamond') out.push(`${rg} sells a diamond core`);
    }
    for (const d of stockFor(rg)) {
      if (!band.includes(d.tier)) out.push(`${rg} sells ${d.name}, outside its band ${band}`);
    }
    const cap = RARITY_LADDER.indexOf(rarityCeilingFor(rg));
    if (cap < 1) out.push(`${rg}'s quintessence ceiling is ${rarityCeilingFor(rg)} -- nothing to sell`);
    if (cap > 3) out.push(`${rg} sells Legendary quintessence`);
    for (const q of quintessenceFor(rg, cat.QUINTESSENCE_DEFS)) {
      if (RARITY_LADDER.indexOf(q.rarity) > cap) out.push(`${rg} sells ${q.name} (${q.rarity})`);
    }
    // And the blocks themselves, rolled rather than reasoned about.
    for (const key of AUCTION_TAB_KEYS) {
      const lots = rollAuctionLots(key, rg, cat, mulberry(`${rg}|${key}`));
      if (lots.length !== AUCTION_TABS[key].count) {
        out.push(`${rg}'s ${key} block has ${lots.length} lots, expected ${AUCTION_TABS[key].count}`);
      }
      for (const l of lots) {
        if (!AUCTION_TABS[key].kinds.includes(l.kind)) out.push(`a ${l.kind} lot on the ${key} tab`);
        if (!(l.qty > 0)) out.push(`${l.name} x${l.qty}`);
        if (!(l.price > 0)) out.push(`${l.name} costs ${l.price}`);
        if (!l.name) out.push(`a ${l.kind} lot with no name`);
        if (l.kind === 'core' && !band.includes(CORE_DEFS[l.id].tier)) {
          out.push(`${rg} put a ${CORE_DEFS[l.id].rank} core on the block`);
        }
        // THE MARKUP, checked on the lot rather than on the constant: a price
        // that is not four times the sell value is a promise the screen makes
        // and the maths does not.
        const want = Math.max(1, Math.round(cat.valueOf(l.kind, l.id) * AUCTION_MARKUP)) * l.qty;
        if (l.price !== want) out.push(`${l.name} is ${l.price}, expected ${want}`);
      }
      // A block of six identical rows is a tab, not a market -- but only where
      // the pool is big enough to do better.
      const pool = new Set(lots.map(l => `${l.kind}:${l.id}`));
      if (pool.size < Math.min(AUCTION_TABS[key].count, 3)) {
        out.push(`${rg}'s ${key} block is ${pool.size} distinct rows`);
      }
      // AND IT SELLS BOTH THINGS IT IS NAMED FOR. The tab is "Cores &
      // Quintessence"; a block of six quintessence and no core is a tab whose
      // name is half a lie, and that is exactly what a uniform roll over the
      // merged pool produced.
      const kindsSeen = new Set(lots.map(l => l.kind));
      for (const k of AUCTION_TABS[key].kinds) {
        if (!kindsSeen.has(k)) out.push(`${rg}'s ${key} block has no ${k} in it`);
      }
    }
  }
  // The gate has to actually BITE: the first region and the last must not sell
  // the same cores, or "rank gated by region" is a table with no consequence.
  const first = coresFor(regions[0]).map(c => c.rank).join(',');
  const last = coresFor(regions[regions.length - 1]).map(c => c.rank).join(',');
  if (first === last) out.push('every region sells the same cores');
  if (coresFor('nek').some(c => ['bronze', 'silver', 'gold'].includes(c.rank))) {
    out.push('region 1 sells a bronze, silver or gold core');
  }
  // Determinism: the same day twice is the same block.
  const a = rollAuctionLots('material', 'nek', cat, mulberry('same'));
  const b = rollAuctionLots('material', 'nek', cat, mulberry('same'));
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push('the same day gives two different blocks');
  return out;
}

/** A seeded generator for the fault checker, so "the same day twice" is a
 *  question it can actually ask. */
function mulberry(seed) {
  let h = 2166136261;
  for (let i = 0; i < String(seed).length; i++) {
    h ^= String(seed).charCodeAt(i); h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
