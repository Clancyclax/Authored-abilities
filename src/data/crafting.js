// ============================================================================
// ROUND 90 -- CRAFTING. The machine, built from CRAFTING_SPEC.md.
//
// The user's original ask, and it is worth keeping at the top because every
// decision below answers some part of it:
//
//   "Based on the quintessence available, and various metals, woods, fibers,
//    and monster parts players should be able to have the blacksmith or
//    armorsmith create them items. The quintessence used should drive the
//    stats and effects on the weapons or gear created. Obviously the power,
//    quantity, and overall complexity of the effects should be rank gated.
//    This grants players a way to build on or reinforce their build synergies."
//
// And round 90's ruling on MONSTER CORES, verbatim:
//
//   "They are critical for setting the items rank, but also may require a 5-30
//    of them to create the item. Monster cores should be stackable in
//    inventory. They don't replace any other ingredient in craft, just
//    additional."
//
// THE ONE SENTENCE: you bring a crafter a FRAME (what the thing is), STOCK
// (what its body is), CORES (what rank it may reach) and QUINTESSENCE (what it
// does), and they hand you back an item whose effects were chosen by the
// quintessence rather than rolled by the game.
//
// WHY THIS FILE IMPORTS ALMOST NOTHING. The effect resolver's whole design is
// that it does NOT own a second effect table: it asks `thematicDebuffsFor` --
// the same function awakening.js asks when it decides what an ability may
// inflict -- so a Fire quintessence offers burn and sunder because fire
// ABILITIES offer burn and sunder. Add a debuff to debuffs.js and every
// quintessence that should reach it reaches it that day. That structural
// promise is the reason `expose` was written into debuffs.js in this same
// round rather than into this file.
// ============================================================================

import { DEBUFFS, thematicDebuffsFor, debuffMagnitude, debuffDuration } from './debuffs.js';
import { GROWTH_MATERIAL_DEFS } from './growthMaterials.js';   // ROUND 283
import { motifFor } from './essenceMotifs.js';
import { elementForFamily } from './essenceLevers.js';
import { RANK_ORDER, RANK_LABELS } from './ranks.js';
// ROUND 96 -- what each crafter makes of your confluence. See crafterTalk.js.
import { crafterConfluenceLine } from './crafterTalk.js';
import { BUFF_BASE, MINOR_STAT_BY_KEY, GEAR_SLOTS, slotArmorFor,
         gearRankMult, gearLevelMult, GEAR_CAPPED_STAT_EXPONENT } from './stats.js';

// ---------------------------------------------------------------------------
// RANKS. Crafting uses the five real ranks and never the sixth -- the standing
// directive is that no diamond-rank content exists anywhere, so a bench that
// could reach it would be the one place in the build that contradicts it.
// ---------------------------------------------------------------------------
export const CRAFT_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold'];
export const craftRankIndex = (r) => Math.max(0, CRAFT_RANKS.indexOf(r));

// ===========================================================================
// 1. STOCK -- "how good is the body?"
//
// Three families, five tiers, fifteen rows, one axis. Deliberately small: the
// tier IS the rank, so "what am I allowed to make" has exactly one answer and
// it is a material you can see in your bag.
// ===========================================================================

export const STOCK_FAMILIES = ['metal', 'wood', 'fibre'];
export const STOCK_FAMILY_LABEL = { metal: 'Metal', wood: 'Wood', fibre: 'Fibre' };

const STOCK_ROWS = {
  metal: ['Copper', 'Iron', 'Steel', 'Silversteel', 'Skyiron'],
  wood:  ['Pine', 'Ash', 'Ironbark', 'Duskwood', 'Heartwood'],
  fibre: ['Flax', 'Wool', 'Silk', 'Spidersilk', 'Cloudweave'],
};

// What each family is FOR. Not a restriction -- you may build a sword out of
// cloudweave and it will be a strange sword -- but a bias, applied to the
// item's inherent numbers, so the three families are three different answers
// rather than three names for the same bar.
//
// The three multipliers are deliberately a triangle with no best corner:
// metal is the armour, wood is the swing, fibre is the recovery.
const STOCK_BIAS = {
  metal: { armor: 1.30, weaponDmgPct: 1.00, regen: 0.85, label: 'holds an edge and turns a blow' },
  wood:  { armor: 0.80, weaponDmgPct: 1.25, regen: 1.00, label: 'swings faster than it has any right to' },
  fibre: { armor: 0.70, weaponDmgPct: 0.95, regen: 1.35, label: 'sits light and lets you keep going' },
};

const STOCK_DESC = {
  metal: 'Smelted from a vein. The body of anything that has to survive being hit.',
  wood:  'Cut from a stand. Lighter than metal and, worked well, no weaker.',
  fibre: 'Retted from a patch. What everything soft is made of, and some things that are not.',
};

/** `stockId('metal', 2)` -> 'stockSteel'. One place builds these. */
export function stockId(family, tier) {
  const name = STOCK_ROWS[family] && STOCK_ROWS[family][tier];
  return name ? `stock${name}` : null;
}

export const STOCK_DEFS = (() => {
  const defs = {};
  for (const family of STOCK_FAMILIES) {
    STOCK_ROWS[family].forEach((name, tier) => {
      const rank = CRAFT_RANKS[tier];
      defs[stockId(family, tier)] = {
        id: stockId(family, tier), name, family, tier, rank,
        label: `${name}`,
        // The description states the mechanic; the name carries the flavour.
        // That is the standing naming rule and it applies to materials too.
        desc: `${STOCK_DESC[family]} Builds ${RANK_LABELS[rank]}-rank gear; it ${STOCK_BIAS[family].label}.`,
        bias: STOCK_BIAS[family],
      };
    });
  }
  return defs;
})();

export const STOCK_IDS = Object.keys(STOCK_DEFS);
export const STOCK_LIST = STOCK_IDS.map(id => STOCK_DEFS[id]);
// ROUND 283 -- the growth materials (blood gold, star-fall silver) share the
// stock bag and its defs table, so they drop, stack, list and sell like
// stock. Added AFTER the two lists above, so no recipe, node or generator
// that walks the smith's stock ever meets one.
for (const d of Object.values(GROWTH_MATERIAL_DEFS)) {
  STOCK_DEFS[d.id] = { ...d, label: d.name, family: 'growth',
    rank: d.rank || 'silver', tier: d.rank ? CRAFT_RANKS.indexOf(d.rank) : 3 };
}

// ===========================================================================
// 2. HARVEST NODES -- where stock comes from.
//
// "Nodes in the world, not a new drop table." Ore veins, stands of timber and
// fibre plants, region-gated so Skyiron is in Bratugal and you will not be
// making gold-rank anything in the Nek.
//
// THE REGION GATE IS A BAND, NOT A ROW. A region carries two adjacent tiers,
// which is what stops the ladder being four cliffs: you find the next tier
// before you have finished the last one, so the material you are hoarding is
// always about to be worth something and never suddenly worthless.
// ===========================================================================

export const NODE_KINDS = {
  vein:  { key: 'vein',  family: 'metal', label: 'Ore Vein',    verb: 'mine',    color: '#b0a48f' },
  stand: { key: 'stand', family: 'wood',  label: 'Timber Stand', verb: 'cut',    color: '#8d6e4a' },
  patch: { key: 'patch', family: 'fibre', label: 'Fibre Patch',  verb: 'gather', color: '#8fae7a' },
};
export const NODE_KIND_KEYS = Object.keys(NODE_KINDS);
export const NODE_BY_FAMILY = Object.fromEntries(
  Object.values(NODE_KINDS).map(k => [k.family, k]));

/** Which tiers a region's nodes may carry. Two adjacent rungs each, and the
 *  four bands overlap by one so the world is a ladder rather than four steps. */
// ROUND 103 -- THE THREE NEW REGIONS JOIN IT, and a region absent from this
// table is a bug rather than a default.
//
// `_buildHarvestNodes` reads a region's band from here and falls back to
// `[0, 1]` when there is no row, so Sirukh, the Cinderwaste and Ixcuatl each
// filled thirty-four nodes with NORMAL-rank ore -- 102 nodes of the wrong
// material, on an island, a lava field and a gold-rank ruin. Nothing errored,
// because a fallback that is a real band looks exactly like a correct answer.
// Caught by test_round90's "every node carries a tier its region is allowed".
//
// Each band matches the region's own declared spawn tiers (regions.js), which
// is the same rule the four original rows follow: what you fight there is what
// you can dig there.
export const REGION_STOCK_TIERS = {
  nek:      [0, 1],
  ontaria:  [1, 2],
  elehyd:   [2, 3],
  bratugal: [3, 4],
  sirukh:   [1, 2],   // Act II island, Bronze country
  cinder:   [3, 4],   // Act III lava field, Silver into Gold
  // Act IV. Silver into Gold, not gold twice: the integrity check wants a
  // band of two ADJACENT tiers (a region where both ends are the same tier is
  // not a band), and it wants a realm hanging off it to be able to be better
  // -- which nothing above gold can be, gold being the ceiling everywhere by
  // the user's standing rule. Bratugal's own band is 3,4 for the same reason
  // and this is the same country one act later.
  ixcuatl:  [3, 4],
};

/** An astral realm's nodes are ONE TIER ABOVE the region they hang off, which
 *  is the whole reason to go through the portal for materials rather than for
 *  the fight. Clamped at gold, because gold is the ceiling anywhere. */
export function realmStockTiers(regionId) {
  const band = REGION_STOCK_TIERS[regionId] || [0, 1];
  return band.map(t => Math.min(CRAFT_RANKS.length - 1, t + 1));
}

/** How many nodes of each kind a region gets. Chosen against the region size
 *  (1024 tiles a side) rather than pulled out of the air: 34 nodes over a
 *  million tiles is one every 30,000, which is roughly the density round 64
 *  placed den sites at -- close enough to walk into, far enough that finding
 *  one is a small event. */
export const NODES_PER_REGION = 34;
export const NODES_PER_REALM = 12;

/** How much one harvest yields, by tier. Falls as the tier rises, so the
 *  material cost curve in §5 bites: a gold item wants 16 stock and each
 *  Skyiron vein gives 1-2, which is a dozen veins rather than a stroll. */
export const NODE_YIELD = [[2, 4], [2, 3], [1, 3], [1, 2], [1, 2]];

/** Seconds before a harvested node comes back. Long enough that a player does
 *  not stand on one farming it, short enough that a region does not run out. */
export const NODE_RESPAWN_S = 300;

export function nodeYield(tier, rand = Math.random) {
  const [lo, hi] = NODE_YIELD[Math.max(0, Math.min(4, tier))] || [1, 1];
  return lo + Math.floor(rand() * (hi - lo + 1));
}

// ===========================================================================
// 3. MONSTER CORES -- round 90's new drop, and the second half of the rank gate.
//
//   "1 per monster and are the rank of the monster... critical for setting the
//    items rank, but also may require a 5-30 of them to create the item."
//
// FIVE ROWS, ONE PER RANK, and the reason there are only five is the reason
// there are only fifteen stock rows: a bag nobody can read is a bag nobody
// uses. A core does not care what the monster was made of -- the quintessence
// already answers that -- it cares only how hard it was to kill.
//
// HOW THE RANK IS ACTUALLY SET, which is the one place the spec and the ruling
// had to be reconciled. CRAFTING_SPEC.md §2.2 says the stock tier sets the
// rank; the ruling says cores are critical for setting it. Both are true and
// the rule is the LOWER OF THE TWO: the stock is the body and the cores are
// what makes the body hold a rank, and neither alone gets you there. That is
// also the more interesting rule, because it means the two materials come from
// two different activities -- you mine for one and you fight for the other --
// and a player who only does one of them stalls.
// ===========================================================================

export const CORE_NAMES = ['Dim Core', 'Iron Core', 'Bronze Core', 'Silver Core', 'Gold Core'];
export const CORE_COLORS = ['#9e9e9e', '#8b93a6', '#c97a3d', '#e7e9ec', '#f4c430'];

export function coreId(tier) {
  const rank = CRAFT_RANKS[Math.max(0, Math.min(4, tier))];
  return `core${rank.charAt(0).toUpperCase()}${rank.slice(1)}`;
}

export const CORE_DEFS = (() => {
  const defs = {};
  CRAFT_RANKS.forEach((rank, tier) => {
    defs[coreId(tier)] = {
      id: coreId(tier), tier, rank,
      name: CORE_NAMES[tier],
      color: CORE_COLORS[tier],
      desc: `The knot of power left where a ${RANK_LABELS[rank]}-rank creature stopped being one. `
          + `A craft may reach ${RANK_LABELS[rank]} rank only if these are the cores fed into it.`,
    };
  });
  return defs;
})();
export const CORE_IDS = Object.keys(CORE_DEFS);
export const CORE_LIST = CORE_IDS.map(id => CORE_DEFS[id]);
export const CORE_BY_TIER = CORE_LIST.slice();

/** One per monster, at the monster's own rank. Not a roll: the ruling says
 *  "1 per monster", so this is a guarantee and the only thing the tier moves
 *  is WHICH core, never whether there is one. */
export function coreDropFor(rankIdx) {
  return { id: coreId(Math.max(0, Math.min(4, rankIdx | 0))), qty: 1 };
}

// ===========================================================================
// 4. THE FRAMES -- what you may commission, and at which bench.
// ===========================================================================

export const BENCHES = {
  blacksmith:  { key: 'blacksmith',  label: 'Blacksmith',   makes: 'weapon' },
  armoursmith: { key: 'armoursmith', label: 'Armoursmith',  makes: 'armour' },
  jewelcrafter: { key: 'jewelcrafter', label: 'Jewelcrafter', makes: 'jewel' },
};
export const BENCH_KEYS = Object.keys(BENCHES);

export const ARMOUR_FRAMES = ['helmet', 'chest', 'gloves', 'belt', 'legs', 'boots'];
export const JEWEL_FRAMES = ['ring', 'amulet'];

/** Which gear slots a bench may build. Weapons are named by the WEAPONS table
 *  and passed in, so this file needs no copy of it. */
export function framesForBench(benchKey, weaponIds = []) {
  if (benchKey === 'armoursmith') return ARMOUR_FRAMES.map(s => ({ kind: 'gear', id: s }));
  if (benchKey === 'jewelcrafter') return JEWEL_FRAMES.map(s => ({ kind: 'gear', id: s }));
  return weaponIds.map(id => ({ kind: 'weapon', id }));
}

// ===========================================================================
// 5. THE THREE LEVERS -- power, quantity, complexity.
// ===========================================================================

/** POWER, from the RARITY of the quintessence spent. The spec's own ladder. */
export const POWER_BY_RARITY = {
  Common: 1.0, Uncommon: 1.6, Rare: 2.4, Epic: 3.4, Legendary: 5.0, Divine: 5.0,
};

/**
 * WHAT THAT LADDER IS MEASURED AGAINST, and this number is DERIVED rather than
 * picked -- which is the only reason it can be trusted.
 *
 * The spec's promise: "a crafted item should almost never beat a lucky drop on
 * raw numbers; it beats it by being the one you actually wanted." The first
 * draft of this file did not honour that and it was not close: a gold Skyiron
 * cuirass came out with +540% cooldown reduction and 96.9% inherent armour
 * against a DROPPED gold Epic chest's 1.5% mana regen and 16.8% armour. Three
 * hundred times over. It passed every fault check in this file, because every
 * check asserted a shape and none of them asserted a MAGNITUDE against the
 * thing crafting is supposed to lose to.
 *
 * The anchor: the very best a drop can concentrate into ONE stat is
 * `1.25^4` (rollBuffs, a Legendary rolling a single buff). The very best
 * crafting can reach is a Legendary quintessence at confluence resonance,
 * `5.0 * 1.75`. Setting those equal is the whole rule, and it means the
 * strongest crafted effect in the game ties the luckiest drop and everything
 * below it loses -- while crafting still wins on being able to choose five of
 * them and choose WHICH five.
 */
/** The percentage column is the same stat, larger. Named, because the anchor
 *  below has to divide by it -- the first draft did not, and the percentage
 *  column then overshot the drop ceiling it was anchored to by exactly this
 *  factor (measured: crafted 0.779 crit damage against a drop ceiling of
 *  0.537). A constant used in two places must not be typed in two places. */
export const PERCENT_COLUMN_MULT = 1.45;

export const CRAFT_MAGNITUDE_ANCHOR =
  Math.pow(1.25, 4) / (POWER_BY_RARITY.Legendary * 1.75 * PERCENT_COLUMN_MULT);

/** How far a quintessence's rarity may push a DEBUFF past its listed strength.
 *  Narrow, because a debuff's `cap` in debuffs.js is already the number the
 *  whole game is balanced against -- see the note in rollCraftEffect. */
export const DEBUFF_POTENCY_STEP = 0.09;
export const DEBUFF_POTENCY_CAP = 1.6;

/** QUANTITY, from the ITEM'S RANK, which came from the stock and the cores. */
export const EFFECTS_BY_RANK = { normal: 1, iron: 2, bronze: 3, silver: 4, gold: 5 };

/**
 * COMPLEXITY, from the quintessence's rarity. Seven columns, and the four the
 * round-87 answer named are the middle four.
 *
 * `ability` is in the grid and is NOT reachable by crafting -- the Epic cap in
 * §8 of the spec puts it out of reach. It stays here because this grid is also
 * the drop table's grid, and a column deleted for being unreachable is a
 * column somebody re-invents differently in two rounds' time.
 */
export const COMPLEXITY_COLUMNS = ['flat', 'percent', 'onhit', 'stacking', 'exposing', 'conditional', 'ability'];
export const COMPLEXITY_BY_RARITY = {
  Common:    ['flat'],
  Uncommon:  ['flat', 'percent'],
  Rare:      ['flat', 'percent', 'onhit'],
  Epic:      ['flat', 'percent', 'onhit', 'stacking', 'exposing', 'conditional'],
  Legendary: ['flat', 'percent', 'onhit', 'stacking', 'exposing', 'conditional', 'ability'],
  Divine:    ['flat', 'percent', 'onhit', 'stacking', 'exposing', 'conditional', 'ability'],
};

/** RESONANCE. Checked at the moment of crafting and baked in -- an item is a
 *  record of who you were when you made it. */
export const RESONANCE = {
  none:       { mult: 1.00, tierUp: 0, label: '' },
  essence:    { mult: 1.35, tierUp: 0, label: 'Resonant' },
  confluence: { mult: 1.75, tierUp: 1, label: 'In Confluence' },
};

/** THE CAP. "Crafted gear cannot reach Legendary." Whatever you feed it. */
export const CRAFT_RARITY_CAP = 'Epic';
const RARITY_LADDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Divine'];

/** One tier up the rarity ladder, held to the crafting cap. */
export function bumpRarity(rarity, steps = 1) {
  const i = RARITY_LADDER.indexOf(rarity);
  const cap = RARITY_LADDER.indexOf(CRAFT_RARITY_CAP);
  if (i < 0) return CRAFT_RARITY_CAP;
  return RARITY_LADDER[Math.max(0, Math.min(cap, i + steps))];
}

// ===========================================================================
// 6. THE COST TABLES.
// ===========================================================================

/** The crafter's fee, as a fraction of what the item would sell for. */
export const FEE_BY_RANK = { normal: 0.40, iron: 0.55, bronze: 0.70, silver: 0.85, gold: 1.00 };

/**
 * What a commission eats. `quint` is PER EFFECT, so a gold item with five
 * effects wants 240 quintessence across the five kinds you chose -- that is
 * the real gate, and it is a season of killing the right things.
 *
 * `cores` is round 90's column and it is the ruling's own band: "5-30 of them".
 * Five at Normal, thirty at Gold, and the three rungs between are the curve
 * that band implies rather than a straight line -- the jump is steepest at the
 * top, where a Gold Core is also the hardest thing in the world to get one of.
 */
export const COST_BY_RANK = {
  normal: { stock: 2,  quint: 3,  parts: 0, cores: 5 },
  iron:   { stock: 4,  quint: 6,  parts: 1, cores: 9 },
  bronze: { stock: 7,  quint: 12, parts: 1, cores: 14 },
  silver: { stock: 11, quint: 24, parts: 1, cores: 21 },
  gold:   { stock: 16, quint: 48, parts: 2, cores: 30 },
};

// ===========================================================================
// 7. THE EFFECT RESOLVER.
//
// quintessence -> its essence -> that essence's element + levers
//              -> thematicDebuffsFor(element, levers)
//              -> the candidate pool the crafter rolls from
//
// Pure functions. No scene, no Phaser, testable in the data lane in
// milliseconds -- which matters, because the fault check that has to run here
// is reachability over all 35 quintessences at all 5 ranks.
// ===========================================================================

/** The flat/percentage stats a quintessence's element is entitled to. Kept
 *  narrow on purpose: a fire quintessence that could roll dodge would make the
 *  element mean nothing. */
// SIX EACH, NOT FOUR. A gold item takes five effects and the first draft's
// four-stat pools could not fill one without repeating itself -- a Common
// commission came out granting "+4.8% Fire Resistance" twice, which reads as a
// bug even though it is only a small pool doing what small pools do. Six is
// the smallest number that lets the widest item be five distinct things.
const ELEMENT_STATS = {
  fire:      ['critDamage', 'attackSpeed', 'resist_fire', 'maxStamina', 'critChance', 'staminaRegen'],
  frost:     ['armor', 'blockChance', 'resist_frost', 'maxHp', 'hpRegen', 'critDamage'],
  lightning: ['attackSpeed', 'critChance', 'resist_lightning', 'castSpeed', 'cooldownReduction', 'dodgeChance'],
  nature:    ['hpRegen', 'staminaRegen', 'resist_nature', 'maxHp', 'maxStamina', 'armor'],
  shadow:    ['critChance', 'dodgeChance', 'resist_shadow', 'cooldownReduction', 'critDamage', 'attackSpeed'],
  radiant:   ['manaRegen', 'maxMana', 'resist_radiant', 'castSpeed', 'hpRegen', 'blockChance'],
  physical:  ['armor', 'maxHp', 'blockChance', 'critDamage', 'maxStamina', 'attackSpeed'],
};

/**
 * What a quintessence is, mechanically: the element it deals in and the levers
 * its essence pulls. Both read off the same tables `awakening.js` reads, which
 * is the whole structural promise of this system.
 *
 * `ESSENCES` is passed in rather than imported, for the reason quintessence.js
 * gives: essenceCatalog.js is large and this module is imported by the scene.
 */
export function quintProfile(quintDef, ESSENCES) {
  if (!quintDef) return null;
  // The essence's ID IS THE CATALOGUE KEY -- the value has no `id` field. Read
  // it off the entry, or `motifFor(undefined)` returns null for all thirty-five
  // and the lever half of the thematic filter silently does nothing. That is
  // exactly what happened in the first draft of this file, and the only reason
  // it was caught is that the pool sizes were MEASURED rather than asserted.
  let essDef = null;
  for (const [key, e] of Object.entries(ESSENCES || {})) {
    if (e && e.name === quintDef.essence) { essDef = { ...e, id: e.id || key }; break; }
  }
  const mat = elementForFamily(essDef && essDef.family);
  const motif = essDef ? motifFor(essDef.id) : null;
  return {
    id: quintDef.id,
    name: quintDef.name,
    essence: quintDef.essence,
    essenceId: essDef && essDef.id,
    rarity: quintDef.rarity || 'Common',
    element: (mat && mat.element) || 'physical',
    levers: (motif && motif.levers) || [],
  };
}

/**
 * The candidate pool one quintessence offers, split by complexity column.
 *
 * Returns `{ stats, debuffs, columns }`. `columns` is what the §3.3 grid
 * allows at this rarity, so the caller never has to know the grid.
 */
export function candidatesFor(profile) {
  if (!profile) return { stats: [], debuffs: [], columns: [] };
  const stats = ELEMENT_STATS[profile.element] || ELEMENT_STATS.physical;
  // THE ONE CALL THAT MATTERS. Same function, same arguments, as the ability
  // generator's. A fire quintessence burns because fire abilities burn.
  const debuffs = thematicDebuffsFor(profile.element, profile.levers);
  const columns = (COMPLEXITY_BY_RARITY[profile.rarity] || ['flat'])
    // The Epic cap: `ability` is in the grid and out of reach at a bench.
    .filter(c => c !== 'ability');
  return { stats: stats.slice(), debuffs: debuffs.slice(), columns };
}

/** Deterministic hash, so the same commission from the same materials at the
 *  same moment is the same item -- a bench is not a slot machine. */
function hash(str) {
  const s = String(str);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  // THE FINALISER, AND IT IS NOT DECORATION. Plain FNV-1a's LOW BIT is just
  // the XOR of every input byte's low bit, so `hash(x) % 4` over a set of
  // strings that differ only in even ways returns the same parity every time.
  // Measured: the conditional column drew from CRAFT_CONDITIONS with
  // `h('cond') % 4` and produced `afflicted` 303 times and `company` 286 over
  // six hundred items -- and `lowHp` and `alone`, indices 0 and 2, NOT ONCE.
  // Two of the four states a conditional effect can hang off were unreachable
  // and nothing anywhere reported a problem, because every one of them is a
  // legal answer.
  //
  // Three xorshift-multiply rounds spread the entropy into the low bits, which
  // is what makes `% n` a fair pick. Found by measuring the distribution
  // rather than by reading the picker, which looks correct either way.
  h ^= h >>> 16; h = Math.imul(h, 2246822507);
  h ^= h >>> 13; h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * ONE effect, rolled from one quintessence at one item rank.
 *
 * The roll is bounded and repeatable rather than a slot machine, which is what
 * the round-87 ruling asked for: the POOL is yours (you chose the
 * quintessence), the KINDS are gated (the grid), the COUNT is fixed (the
 * rank), and RESONANCE is shown before you commit. You are betting on WHICH of
 * the things you chose you get, at a magnitude you already know.
 */
export function rollCraftEffect(profile, itemRank, resonance, seed, avoid = null) {
  const cand = candidatesFor(profile);
  if (!cand.columns.length) return null;
  const res = RESONANCE[resonance] || RESONANCE.none;
  const raw = (POWER_BY_RARITY[profile.rarity] || 1) * res.mult;
  // TWO POWERS, because the two kinds of effect are measured against two
  // different things. A STAT is measured against what a drop can roll, so it
  // takes the anchored ladder above. A DEBUFF is measured against its own
  // `cap` in debuffs.js, which is already the ceiling the whole game is tuned
  // to -- so a scale of 8.75 there would not be a strong item, it would be a
  // debuff eight times its own stated maximum. Potency is therefore a narrow
  // band around 1: a Legendary at confluence hits 1.6x a Common's, and the
  // cap does the rest.
  const power = raw * CRAFT_MAGNITUDE_ANCHOR;
  const potency = Math.min(DEBUFF_POTENCY_CAP, 1 + (raw - 1) * DEBUFF_POTENCY_STEP);
  const h = (salt) => hash(`${seed}|${profile.id}|${salt}`);

  // The column. Resonance with your CONFLUENCE lifts it one rung -- which is
  // the mechanical statement of "the confluence is the strongest", because a
  // tier of complexity is worth more than a multiplier.
  let cols = cand.columns.slice();
  if (res.tierUp > 0) {
    const all = COMPLEXITY_COLUMNS.filter(c => c !== 'ability');
    const top = all.indexOf(cols[cols.length - 1]);
    for (let i = 1; i <= res.tierUp; i++) {
      const next = all[top + i];
      if (next && !cols.includes(next)) cols.push(next);
    }
  }
  // Debuff columns need a debuff to carry; if the pool is empty (it never is,
  // and craftingFaults asserts that), fall back to the stat columns rather
  // than returning nothing and silently eating the material.
  if (!cand.debuffs.length) cols = cols.filter(c => c === 'flat' || c === 'percent');
  if (!cols.length) return null;
  const column = cols[h('col') % cols.length];

  if (column === 'flat' || column === 'percent') {
    // Skip what this item already carries, so the re-roll in resolveCraft is a
    // fallback rather than the only defence against a duplicate.
    const free = avoid ? cand.stats.filter(st => !avoid.has(`s:${st}`)) : cand.stats;
    const from = free.length ? free : cand.stats;
    const stat = from[h('stat') % from.length];
    const base = BUFF_BASE[stat] || 0.05;
    const def = MINOR_STAT_BY_KEY[stat];
    // The percentage column is the same stat at 1.45x. Both are ordinary
    // `buffs` entries, so the whole stat stack, the paperdoll and the compare
    // tooltip read them with no changes at all -- the same reasoning that made
    // inherent armour a buff in round 74.
    const mult = power * (column === 'percent' ? PERCENT_COLUMN_MULT : 1.0);
    // A FLOOR, AND FOUR DECIMALS RATHER THAN THREE. `hpRegen`'s base band is
    // 0.002 per second; at the anchored ladder's bottom rung that is 0.0004,
    // which rounded to three places is ZERO -- an effect the player chose a
    // material for and paid a fee for that does nothing at all. The fault
    // checker caught it the moment the anchor tightened, which is the whole
    // reason it asserts `amount > 0` rather than trusting the arithmetic.
    const amount = (def && def.kind === 'flat')
      ? Math.max(1, Math.round(base * mult))
      : Math.max(Math.round(base * 0.2 * 10000) / 10000,
                 Math.round(base * mult * 10000) / 10000);
    return { column, kind: 'buff', stat, amount };
  }

  // Every remaining column carries a debuff.
  const all = column === 'exposing' ? [DEBUFFS.expose] : cand.debuffs;
  const freeD = avoid ? all.filter(d => !avoid.has(`d:${d.key}`)) : all;
  const pool = freeD.length ? freeD : all;
  const def = pool[h('dbf') % pool.length] || cand.debuffs[0];
  if (!def) return null;
  const rankIdx = craftRankIndex(itemRank);
  // Chance rises with the item's rank, magnitude with the quintessence's
  // rarity. Two different inputs moving two different numbers is what stops
  // the two levers collapsing into one.
  const chance = Math.min(0.60, 0.14 + rankIdx * 0.07);
  const stacks = column === 'stacking' ? 2 : 1;
  const duration = debuffDuration(def, ((h('dur') % 1000) / 1000));
  const eff = {
    column, kind: 'debuff', debuff: def.key, chance, stacks, duration,
    potency: Math.round(potency * 100) / 100,
    magnitude: Math.round(debuffMagnitude(def, stacks, potency) * 1000) / 1000,
  };
  // STACKING raises this debuff's own cap by one ON THIS ITEM. That is the
  // column that makes a build: five stacks of poison is a plan, and it needs
  // gear designed for it.
  if (column === 'stacking') eff.capBonus = 1;
  // CONDITIONAL fires on a state rather than on a hit.
  if (column === 'conditional') {
    eff.cond = CRAFT_CONDITIONS[h('cond') % CRAFT_CONDITIONS.length];
    eff.chance = Math.min(0.9, chance * 2.2);
  }
  return eff;
}

/** The states a conditional effect may hang off. Every one of them is a
 *  question the runtime can already answer, which is the only reason there are
 *  four rather than fourteen. */
export const CRAFT_CONDITIONS = [
  { key: 'lowHp',    label: 'while you are below half health' },
  { key: 'afflicted', label: 'while the target already carries an affliction' },
  { key: 'alone',    label: 'while you are fighting alone' },
  { key: 'company',  label: 'while a companion stands with you' },
];
export const CRAFT_CONDITION_BY_KEY = Object.fromEntries(CRAFT_CONDITIONS.map(c => [c.key, c]));

/** What the effect says on the card. The description states the mechanic --
 *  the standing naming rule -- and the NAME is where the flavour lives. */
export function craftEffectText(eff) {
  if (!eff) return '';
  if (eff.kind === 'buff') {
    const def = MINOR_STAT_BY_KEY[eff.stat];
    const label = (def && def.label) || eff.stat;
    const shown = def && def.kind === 'flat'
      ? `+${Math.round(eff.amount)}`
      : `+${Math.round(eff.amount * 1000) / 10}%`;
    return `${shown} ${label}`;
  }
  const def = DEBUFFS[eff.debuff];
  if (!def) return '';
  const pct = Math.round(eff.chance * 100);
  const st = eff.stacks > 1 ? ` ${eff.stacks} stacks of` : '';
  const cap = eff.capBonus ? `, and lets it stack ${eff.capBonus} higher than it otherwise could` : '';
  const cond = eff.cond ? ` ${eff.cond.label},` : '';
  return `${pct}% chance on hit${cond} to apply${st} ${def.label} for ${eff.duration}s${cap}.`;
}

// ===========================================================================
// 8. THE RECIPE RESOLVER -- frame + stock + cores + parts + quintessence -> item.
// ===========================================================================

/**
 * What rank a commission may reach, and WHY it cannot reach higher. Returns
 * `{ rank, tier, limitedBy }` so the bench can say the reason out loud rather
 * than greying a row out and leaving the player to guess.
 */
export function craftRankFor(stockDef, coreTier) {
  const st = stockDef ? stockDef.tier : 0;
  const ct = Math.max(0, Math.min(4, coreTier | 0));
  const tier = Math.min(st, ct);
  return {
    tier, rank: CRAFT_RANKS[tier],
    limitedBy: st === ct ? 'both' : (st < ct ? 'stock' : 'cores'),
  };
}

/** Which of the player's essences a quintessence resonates with. `slots` is
 *  `{ essences: [ids], confluenceId }` -- read off what already exists. */
export function resonanceFor(profile, bonded) {
  if (!profile || !bonded) return 'none';
  const names = (bonded.essenceNames || []).map(n => String(n).toLowerCase());
  const conf = String(bonded.confluenceName || '').toLowerCase();
  const mine = String(profile.essence || '').toLowerCase();
  if (conf && conf === mine) return 'confluence';
  // A confluence is named for a concept, not an essence, so the match that
  // matters more often is on the ELEMENT the confluence deals in.
  if (conf && bonded.confluenceElement && bonded.confluenceElement === profile.element) {
    return 'confluence';
  }
  if (names.includes(mine)) return 'essence';
  return 'none';
}

/**
 * The whole commission, resolved. Pure: give it the same inputs and the same
 * seed and it returns the same item, which is what makes it testable.
 *
 * `spec` is:
 *   frame     { kind: 'gear'|'weapon', id }
 *   stock     a STOCK_DEFS entry
 *   coreTier  0-4
 *   quints    [{ profile, resonance }]  -- one per effect
 *   part      an optional PART_DEFS entry
 *   seed      any string
 */
export function resolveCraft(spec) {
  const { frame, stock, coreTier, quints = [], part = null, seed = 'craft' } = spec || {};
  if (!frame || !stock) return null;
  const { rank, tier, limitedBy } = craftRankFor(stock, coreTier);
  const count = EFFECTS_BY_RANK[rank] || 1;

  // The rarity a crafted item wears: the best quintessence in it, one rung up
  // for a confluence resonance, held to the Epic cap.
  let rarity = 'Common';
  let bestRes = 'none';
  for (const q of quints) {
    if (!q || !q.profile) continue;
    if (RARITY_LADDER.indexOf(q.profile.rarity) > RARITY_LADDER.indexOf(rarity)) rarity = q.profile.rarity;
    if (q.resonance === 'confluence') bestRes = 'confluence';
    else if (q.resonance === 'essence' && bestRes === 'none') bestRes = 'essence';
  }
  rarity = bumpRarity(rarity, bestRes === 'confluence' ? 1 : 0);

  // The effects. One per slot, drawn round-robin from the quintessences fed
  // in, so two materials in a three-effect item give you two of one and one of
  // the other rather than three of whichever was listed first.
  const effects = [];
  const taken = new Set();
  for (let i = 0; i < count && quints.length; i++) {
    const q = quints[i % quints.length];
    // RE-ROLLED UNTIL IT IS NOT A DUPLICATE. A five-effect item that granted
    // "+85 Max Stamina" twice is not a bug in the roll -- it is what a uniform
    // pick over a four-stat pool does -- but it reads as one, and the whole
    // proposition of a bench is that you got five things you chose. Bounded at
    // six tries so a pool smaller than the effect count still fills the item.
    let eff = null;
    for (let t = 0; t < 6; t++) {
      const cand = rollCraftEffect(q.profile, rank, q.resonance || 'none', `${seed}|${i}|${t}`, taken);
      if (!cand) break;
      const sig = cand.kind === 'buff' ? `s:${cand.stat}` : `d:${cand.debuff}`;
      eff = cand;
      if (!taken.has(sig)) { taken.add(sig); break; }
    }
    if (eff) effects.push(eff);
  }

  // The buffs the stat stack will actually read. Flat and percentage effects
  // become ordinary buff entries; the inherent armour of an armour slot is
  // prepended exactly as rollGearItem does it, then biased by the stock family.
  const buffs = [];
  const isGear = frame.kind === 'gear';
  if (isGear && GEAR_SLOTS.includes(frame.id)) {
    const inherent = slotArmorFor(frame.id) * (stock.bias.armor || 1);
    if (inherent > 0) buffs.push({ stat: 'armor', amount: Math.round(inherent * 1000) / 1000, inherent: true });
  }
  // The rank/level curve, applied exactly as rollGearItem applies it -- INCLUDING
  // the cube-root softening on capped stats, which the first draft dropped. A
  // percentage stat that took the full 10.6x gold multiplier came out at 540%
  // cooldown reduction; stats.js softens exactly these, for exactly this
  // reason, and a crafted piece has to sit on the same ladder as a dropped one
  // or the two systems are not comparable at all.
  const power = gearRankMult(rank) * gearLevelMult(0);
  const soft = Math.pow(power, GEAR_CAPPED_STAT_EXPONENT);
  for (const e of effects) {
    if (e.kind !== 'buff') continue;
    const bias = e.stat === 'armor' ? stock.bias.armor
      : /Regen$/.test(e.stat) ? stock.bias.regen
      : 1;
    const def = MINOR_STAT_BY_KEY[e.stat];
    const amount = def && def.kind === 'flat'
      ? Math.max(1, Math.round(e.amount * bias * power))
      : Math.max(0.0001, Math.round(e.amount * bias * soft * 10000) / 10000);
    // WRITTEN BACK ONTO THE EFFECT, not only into the buff. The bench shows
    // the effect list and the paperdoll shows the buff list, and the first
    // draft had them disagree: the card promised "+6.8% attack speed" while
    // the item granted 15%, because the card was reading the number from
    // before the stock bias and the rank curve. One number, written once.
    e.amount = amount;
    buffs.push({ stat: e.stat, amount });
  }
  for (const b of buffs) {
    if (!b.inherent) continue;     // the rolled ones were scaled above
    b.amount = Math.round(b.amount * soft * 10000) / 10000;
  }

  const craftEffects = effects.filter(e => e.kind === 'debuff');
  const cost = { ...COST_BY_RANK[rank] };
  cost.quintTotal = cost.quint * count;

  return {
    frame, rank, tier, rarity, limitedBy,
    effectCount: count,
    effects, buffs, craftEffects,
    part: part ? part.id : null,
    resonance: bestRes,
    stock: stock.id,
    core: coreId(tier),
    cost,
    name: craftName(frame, stock, effects, rarity),
  };
}

// The name carries the flavour; the description states the mechanic. So the
// name is built from the MATERIAL and the FRAME and says nothing about the
// numbers -- "Skyiron Cuirass" tells you what it is made of and what it is,
// which is exactly what a smith's docket would say.
const FRAME_NOUN = {
  helmet: 'Helm', chest: 'Cuirass', gloves: 'Gauntlets', belt: 'Girdle',
  legs: 'Leggings', boots: 'Greaves', ring: 'Band', amulet: 'Pendant', shield: 'Shield',
};
export function craftName(frame, stock, effects, rarity) {
  const noun = frame.kind === 'gear'
    ? (FRAME_NOUN[frame.id] || frame.id)
    : (frame.label || frame.id);
  const lead = effects.find(e => e.kind === 'debuff');
  const tail = lead && DEBUFFS[lead.debuff] ? ` of ${DEBUFFS[lead.debuff].label}` : '';
  return `${stock.name} ${noun}${tail}`.replace(/\s+/g, ' ').trim();
}

/** The item a commission becomes, in the same shape `rollGearItem` returns so
 *  every existing consumer -- equip, the paperdoll, the sell value, the
 *  comparison tooltip -- reads it with no changes at all. */
let nextCraftUid = 900001;
export function craftedGearItem(resolved) {
  if (!resolved || resolved.frame.kind !== 'gear') return null;
  return {
    uid: nextCraftUid++,
    slot: resolved.frame.id,
    rarity: resolved.rarity,
    rank: resolved.rank,
    level: 0,
    name: resolved.name,
    buffs: resolved.buffs,
    // The three fields that make it a crafted item rather than a dropped one.
    crafted: true,
    craftEffects: resolved.craftEffects,
    craftResonance: resolved.resonance,
  };
}

// ===========================================================================
// 9. WHAT THE CRAFTERS SAY.
//
// The ruling for round 90 was "the whole machine, GENERIC SAYINGS" -- so the
// 56 authored confluence lines of CRAFTING_SPEC.md §7 are deliberately NOT
// here. What is here is the three registers with generated lines, keyed on
// what the crafter can actually see about you, so the shape is in place and
// the authored lines drop into `CONFLUENCE_LINES` later without moving
// anything else.
// ===========================================================================

export const IDLE_LINES = {
  blacksmith: [
    "Everything I make outlives the man who ordered it. Bear that in mind.",
    "Bring me stock and cores and I will bring you something that holds.",
    "The forge does not care what you intend. It cares what you brought.",
  ],
  armoursmith: [
    "Stand still. Half of what I do is measuring, and the half that isn't is worse.",
    "Plate is a promise. I do not make promises I have not weighed.",
    "You want it light or you want it to work. Pick, and then let me argue.",
  ],
  jewelcrafter: [
    "Small work. Small work is the hard kind; there is nowhere to hide a mistake.",
    "A ring is a sentence you wear. Be careful what it says.",
    "I set what you bring. What it does afterwards is between you and it.",
  ],
};

/** ESSENCE-AWARE. One line per element the crafter has an opinion about,
 *  keyed to their trade -- so the smith talks about the quench and the
 *  jeweller talks about the light. */
export const ESSENCE_LINES = {
  blacksmith: {
    fire:      "You're carrying fire. Good -- you'll not flinch when the quench spits.",
    frost:     "Frost. Everything I make for you will run cold to the touch and stay that way.",
    lightning: "Storm-bonded. Keep your hands off the anvil while I work; it remembers.",
    nature:    "Green essence. I can work it, but the metal will want to grow, and metal should not want things.",
    shadow:    "Dark. The steel takes it well. That is not a compliment to the steel.",
    radiant:   "Light. It makes for an honest blade -- everything it does, it does where you can see it.",
    physical:  "Nothing exotic in you. Nothing wrong with that; most of what I make is for people like you.",
  },
  armoursmith: {
    fire:      "Fire-bonded. I will line it, then. You will thank me the first hot day.",
    frost:     "Frost. The joints will want oiling or they will seize on you at the worst moment.",
    lightning: "Storm. I will keep the seams away from your skin. Trust me on this one.",
    nature:    "Green. Whatever I fit you will end up with something growing in the buckles. It always does.",
    shadow:    "Dark essence. I will keep the finish dull. You did not want to be seen anyway.",
    radiant:   "Light. It will show every scratch. Some people take that as a record.",
    physical:  "Plain and solid. Easiest customer I will have all week.",
  },
  jewelcrafter: {
    fire:      "Fire. It will not sit still in the setting. I will cage it rather than seat it.",
    frost:     "Frost. It sets beautifully and it will fog every morning for the rest of your life.",
    lightning: "Storm. I will use a closed setting, unless you enjoy surprises.",
    nature:    "Green. It will keep growing after I am done. That is the charm and that is the problem.",
    shadow:    "Dark. I can set that, but the stone will drink the light out of everything beside it. Some people like that.",
    radiant:   "Light. Easy to set, impossible to sell quietly. Wear it or do not.",
    physical:  "No colour in you at all. I will make it plain and it will outlast the rest.",
  },
};

/** CONFLUENCE-AWARE, and generic per the round-90 ruling. Three of them,
 *  picked by whether the confluence reads as violent, protective or strange,
 *  because one line across a hundred confluences is a line a player sees twice
 *  and recognises as the seam. */
export const CONFLUENCE_FALLBACKS = {
  violent: "That confluence is not a thing people carry by accident. I will make what you ask and I will not ask what for.",
  protective: "I have fitted one other of those. They walked back in afterwards, which is more than most manage. Stand still.",
  strange: "...I have read about your confluence. The book was wrong about at least one thing, and I would rather not find out which.",
};

const VIOLENT_WORDS = /blade|blood|war|ruin|doom|rage|reaper|slaughter|wrath|apocal|carnage|hunt|storm|fury/i;
const PROTECT_WORDS = /guard|ward|shield|bastion|sentinel|keeper|aegis|bulwark|judge|adjud|balance|mend|healer/i;

/** Which fallback a confluence gets. Reads its NAME, which is the only thing
 *  the crafter could plausibly know about it. */
export function confluenceRegister(name) {
  const n = String(name || '');
  if (VIOLENT_WORDS.test(n)) return 'violent';
  if (PROTECT_WORDS.test(n)) return 'protective';
  return 'strange';
}

/** THE AUTHORED LINES. Empty by design in round 90 -- the ruling was "the
 *  whole machine, generic sayings", so this is the socket the 56 lines of
 *  CRAFTING_SPEC.md §7 drop into without anything else moving. Anything
 *  present here wins over the fallback. */
export const CONFLUENCE_LINES = {};

export function crafterLine(benchKey, { elements = [], confluenceName = null } = {}, rand = Math.random) {
  const bench = BENCHES[benchKey] ? benchKey : 'blacksmith';
  if (confluenceName) {
    if (CONFLUENCE_LINES[confluenceName]) return CONFLUENCE_LINES[confluenceName];
    // ROUND 96 -- THE SOCKET THIS FILE LEFT OPEN IN ROUND 90 IS FILLED.
    //
    // The note above CONFLUENCE_LINES has said since round 90 that it is "the
    // socket the 56 lines drop into without anything else moving". What drops
    // into it is not 56 lines but a generator, on the user's own brief:
    //
    //   "a weaponsmith, jewelry crafter, or armorsmith should have their own
    //    insights and quirks as they talk about your confluence essence and the
    //    distinct tricky ways it may affect their product."
    //
    // The key thing that had to change is that the old lookup was keyed on the
    // CONFLUENCE ALONE -- so all three benches said the same sentence, which is
    // the opposite of the ask. crafterTalk.js is keyed on the pair.
    const talk = crafterConfluenceLine(bench, confluenceName);
    if (talk) return talk;
    // Still the last resort, for a confluence with no concept entry at all.
    return CONFLUENCE_FALLBACKS[confluenceRegister(confluenceName)];
  }
  const el = elements.filter(e => ESSENCE_LINES[bench][e]);
  if (el.length) return ESSENCE_LINES[bench][el[Math.floor(rand() * el.length)]];
  const idle = IDLE_LINES[bench];
  return idle[Math.floor(rand() * idle.length)];
}

// ===========================================================================
// 10. THE FAULT CHECK.
//
// The promises here are the ones reading cannot see. Chief among them, and it
// is the one CRAFTING_SPEC.md §9 named as mattering most: EVERY QUINTESSENCE
// MUST YIELD A NON-EMPTY POOL AT EVERY RANK IT CAN LEGALLY BE USED AT. A
// quintessence whose pool is empty is a material you can spend and get nothing
// for, and nobody finds that by reading -- they find it by following a recipe
// to a dead end.
// ===========================================================================

export function craftingFaults(ESSENCES, QUINTESSENCE_DEFS) {
  const out = [];

  // --- stock -------------------------------------------------------------
  if (STOCK_IDS.length !== 15) out.push(`${STOCK_IDS.length} stock rows, expected 15`);
  const seenNames = new Set();
  for (const s of STOCK_LIST) {
    if (seenNames.has(s.name)) out.push(`two stock rows are called ${s.name}`);
    seenNames.add(s.name);
    if (!CRAFT_RANKS.includes(s.rank)) out.push(`${s.name} is ${s.rank} rank`);
    if (s.rank === 'diamond') out.push(`${s.name} is diamond-rank stock`);
    if (!s.desc || !/rank gear/.test(s.desc)) out.push(`${s.name}'s description does not state the mechanic`);
  }
  // Every family must reach every rank, or a build is locked out of a tier by
  // its choice of material rather than by its progress.
  for (const f of STOCK_FAMILIES) {
    for (let t = 0; t < 5; t++) {
      if (!STOCK_DEFS[stockId(f, t)]) out.push(`${f} has no tier ${t}`);
    }
  }

  // --- nodes -------------------------------------------------------------
  for (const f of STOCK_FAMILIES) {
    if (!NODE_BY_FAMILY[f]) out.push(`${f} has no node kind to come from`);
  }
  // Every tier must be reachable from some region, or it is a row in a table
  // and a lie in a recipe -- the same fault quintessence.js checks for.
  const reachable = new Set();
  for (const band of Object.values(REGION_STOCK_TIERS)) for (const t of band) reachable.add(t);
  for (const band of Object.keys(REGION_STOCK_TIERS)) for (const t of realmStockTiers(band)) reachable.add(t);
  for (let t = 0; t < 5; t++) if (!reachable.has(t)) out.push(`tier ${t} stock is in no region`);
  for (const [rg, band] of Object.entries(REGION_STOCK_TIERS)) {
    if (band.length !== 2) out.push(`${rg} carries ${band.length} tiers, expected 2`);
    if (band[1] !== band[0] + 1) out.push(`${rg}'s tiers ${band} are not adjacent`);
    if (realmStockTiers(rg)[0] <= band[0]) out.push(`${rg}'s realm is no better than its region`);
  }
  for (let t = 0; t < 5; t++) {
    const [lo, hi] = NODE_YIELD[t];
    if (!(lo >= 1 && hi >= lo)) out.push(`tier ${t} yields ${lo}-${hi}`);
  }

  // --- cores -------------------------------------------------------------
  if (CORE_IDS.length !== 5) out.push(`${CORE_IDS.length} core rows, expected 5`);
  for (const c of CORE_LIST) {
    if (c.rank === 'diamond') out.push(`${c.name} is diamond-rank`);
    if (!c.desc || !/rank only if/.test(c.desc)) out.push(`${c.name}'s description does not state the mechanic`);
  }
  // One per monster, at the monster's rank, whatever rank index it is given.
  for (let r = 0; r < 6; r++) {
    const d = coreDropFor(r);
    if (!CORE_DEFS[d.id]) out.push(`rank ${r} drops ${d.id}, which is not a core`);
    if (d.qty !== 1) out.push(`rank ${r} drops ${d.qty} cores, and the rule is one per monster`);
    if (CORE_DEFS[d.id] && CORE_DEFS[d.id].rank === 'diamond') out.push('a monster drops a diamond core');
  }
  // The band the ruling gave: "5-30 of them".
  for (const [rank, c] of Object.entries(COST_BY_RANK)) {
    if (!(c.cores >= 5 && c.cores <= 30)) out.push(`${rank} wants ${c.cores} cores, outside the 5-30 band`);
    if (!(c.stock > 0 && c.quint > 0)) out.push(`${rank} wants no stock or no quintessence`);
  }
  const coreCurve = CRAFT_RANKS.map(r => COST_BY_RANK[r].cores);
  for (let i = 1; i < coreCurve.length; i++) {
    if (coreCurve[i] <= coreCurve[i - 1]) out.push('the core cost does not rise with rank');
  }
  // Cores are ADDITIONAL, never a replacement: the stock and quintessence
  // columns must still rise too, or the ruling's "they don't replace any other
  // ingredient" has quietly stopped being true.
  const stockCurve = CRAFT_RANKS.map(r => COST_BY_RANK[r].stock);
  for (let i = 1; i < stockCurve.length; i++) {
    if (stockCurve[i] <= stockCurve[i - 1]) out.push('the stock cost does not rise with rank');
  }

  // --- the rank gate -----------------------------------------------------
  // The lower of the two, and the reason is reported.
  const steel = STOCK_DEFS[stockId('metal', 2)];
  if (craftRankFor(steel, 4).rank !== 'bronze') out.push('good cores lift a commission past its stock');
  if (craftRankFor(steel, 0).rank !== 'normal') out.push('good stock lifts a commission past its cores');
  if (craftRankFor(steel, 0).limitedBy !== 'cores') out.push('the bench does not say the cores were the limit');
  if (craftRankFor(steel, 4).limitedBy !== 'stock') out.push('the bench does not say the stock was the limit');

  // --- the effect resolver, and the reachability promise ------------------
  const defs = QUINTESSENCE_DEFS || {};
  const quintCount = Object.keys(defs).length;
  if (!quintCount) { out.push('no quintessence catalogue was passed in'); return out; }
  for (const qd of Object.values(defs)) {
    const p = quintProfile(qd, ESSENCES);
    if (!p) { out.push(`${qd.id}: no profile`); continue; }
    const cand = candidatesFor(p);
    if (!cand.stats.length) out.push(`${qd.name}: no stat pool -- a material you can spend for nothing`);
    if (!cand.debuffs.length) out.push(`${qd.name}: no debuff pool -- ${p.element}/${p.levers.join('+') || 'no levers'}`);
    if (!cand.columns.length) out.push(`${qd.name}: no complexity columns at ${p.rarity}`);
    // THE PROMISE: an effect at every rank it can legally be used at.
    for (const rank of CRAFT_RANKS) {
      for (const res of ['none', 'essence', 'confluence']) {
        const eff = rollCraftEffect(p, rank, res, `fault|${rank}|${res}`);
        if (!eff) { out.push(`${qd.name} yields nothing at ${rank} (${res})`); continue; }
        if (!COMPLEXITY_COLUMNS.includes(eff.column)) out.push(`${qd.name} rolled column ${eff.column}`);
        if (eff.column === 'ability') out.push(`${qd.name} reached the ability column, which crafting cannot`);
        if (eff.kind === 'debuff' && !DEBUFFS[eff.debuff]) out.push(`${qd.name} rolled unknown debuff ${eff.debuff}`);
        if (eff.kind === 'buff' && !(eff.amount > 0)) out.push(`${qd.name} rolled ${eff.stat} at ${eff.amount}`);
        if (!craftEffectText(eff)) out.push(`${qd.name}'s ${eff.column} effect has no card text`);
      }
    }
    // The grid is a gate, not a suggestion: a Common quintessence must never
    // reach a debuff column however lucky the seed.
    if (p.rarity === 'Common') {
      for (let s = 0; s < 40; s++) {
        const eff = rollCraftEffect(p, 'gold', 'none', `grid|${s}`);
        if (eff && eff.kind === 'debuff') { out.push(`${qd.name} is Common and reached ${eff.column}`); break; }
      }
    }
  }

  // --- THE PICKER IS FAIR ------------------------------------------------
  //
  // Added after the first draft's picker made two of the four conditional
  // states unreachable and every check above still passed -- because a biased
  // pick returns a legal answer every time. The only way to see it is to
  // COUNT, so this counts.
  {
    const rich = Object.values(defs).find(d => (COMPLEXITY_BY_RARITY[d.rarity] || []).includes('conditional'));
    if (rich) {
      const p = quintProfile(rich, ESSENCES);
      const conds = new Set(), stats = new Set(), cols = new Set();
      for (let i = 0; i < 600; i++) {
        const eff = rollCraftEffect(p, 'gold', 'none', `fair|${i}`);
        if (!eff) continue;
        cols.add(eff.column);
        if (eff.cond) conds.add(eff.cond.key);
        if (eff.kind === 'buff') stats.add(eff.stat);
      }
      for (const c of CRAFT_CONDITIONS) {
        if (!conds.has(c.key)) out.push(`the conditional "${c.key}" is never rolled -- the picker is biased`);
      }
      const pool = candidatesFor(p).stats;
      for (const st of pool) {
        if (!stats.has(st)) out.push(`${rich.name} can never roll ${st} -- the picker is biased`);
      }
      for (const col of COMPLEXITY_BY_RARITY[rich.rarity]) {
        if (col === 'ability') continue;
        if (!cols.has(col)) out.push(`${rich.name} never reaches the ${col} column`);
      }
    }
  }

  // --- THE MAGNITUDE CEILING ---------------------------------------------
  //
  // "A crafted item should almost never beat a lucky drop on raw numbers; it
  // beats it by being the one you actually wanted." That is the spec's whole
  // proposition and it is a NUMBER, so it is checked as one. The ceiling on
  // both sides is a percentage stat at its most concentrated: for a drop,
  // `BUFF_BASE * 1.25^4` (rollBuffs, a Legendary rolling a single buff); for a
  // craft, the anchored ladder at its top corner.
  {
    const bestCraft = POWER_BY_RARITY.Legendary * RESONANCE.confluence.mult
      * CRAFT_MAGNITUDE_ANCHOR * PERCENT_COLUMN_MULT;
    const bestDrop = Math.pow(1.25, 4);
    if (bestCraft > bestDrop * 1.01) {
      out.push(`the best craft is ${bestCraft.toFixed(3)}x base against a drop's ${bestDrop.toFixed(3)}x`);
    }
    if (bestCraft < bestDrop * 0.9) {
      out.push(`the best craft is only ${bestCraft.toFixed(3)}x base -- crafting has stopped being worth it`);
    }
  }

  // --- the Epic cap ------------------------------------------------------
  const legendary = Object.values(defs).find(d => d.rarity === 'Legendary');
  if (legendary) {
    const p = quintProfile(legendary, ESSENCES);
    const item = resolveCraft({
      frame: { kind: 'gear', id: 'chest' },
      stock: STOCK_DEFS[stockId('metal', 4)], coreTier: 4,
      quints: [{ profile: p, resonance: 'confluence' }], seed: 'cap',
    });
    if (!item) out.push('a gold commission resolves to nothing');
    else {
      if (RARITY_LADDER.indexOf(item.rarity) > RARITY_LADDER.indexOf(CRAFT_RARITY_CAP)) {
        out.push(`a legendary quintessence produced a ${item.rarity} item`);
      }
      if (item.effects.some(e => e.column === 'ability')) out.push('a crafted item altered an ability');
      if (item.effectCount !== 5) out.push(`a gold item has ${item.effectCount} effects, expected 5`);
      if (!item.buffs.length) out.push('a crafted chestpiece carries no buffs at all');
      if (!item.buffs.some(b => b.inherent)) out.push('a crafted chestpiece has no inherent armour');
      if (!item.name) out.push('a crafted item has no name');
      const g = craftedGearItem(item);
      if (!g || !g.slot || !g.rarity || !g.rank || !Array.isArray(g.buffs)) {
        out.push('a crafted item is not shaped like a gear item');
      }
    }
  }

  // Determinism: the same commission twice is the same item. A bench that
  // rerolled would make "shown before you commit" a lie.
  const twice = ['a', 'b'].map(() => resolveCraft({
    frame: { kind: 'gear', id: 'ring' },
    stock: STOCK_DEFS[stockId('fibre', 2)], coreTier: 2,
    quints: [{ profile: quintProfile(Object.values(defs)[0], ESSENCES), resonance: 'none' }],
    seed: 'determinism',
  }));
  if (twice[0] && twice[1] && JSON.stringify(twice[0].effects) !== JSON.stringify(twice[1].effects)) {
    out.push('the same commission twice gives two different items');
  }

  // --- resonance ---------------------------------------------------------
  if (!(RESONANCE.confluence.mult > RESONANCE.essence.mult)) {
    out.push('a confluence resonance is worth no more than an essence one');
  }
  if (RESONANCE.confluence.tierUp < 1) out.push('a confluence resonance buys no complexity');
  const anyP = quintProfile(Object.values(defs)[0], ESSENCES);
  if (resonanceFor(anyP, { essenceNames: [anyP.essence] }) !== 'essence') {
    out.push('a bonded essence does not resonate with its own quintessence');
  }
  if (resonanceFor(anyP, { essenceNames: [] }) !== 'none') {
    out.push('an unbonded essence resonates anyway');
  }

  // --- what the crafters say ---------------------------------------------
  for (const b of BENCH_KEYS) {
    if (!IDLE_LINES[b] || IDLE_LINES[b].length < 3) out.push(`${b} has fewer than three idle lines`);
    for (const el of ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant', 'physical']) {
      if (!ESSENCE_LINES[b] || !ESSENCE_LINES[b][el]) out.push(`${b} has nothing to say about ${el}`);
    }
    if (!crafterLine(b, {}, () => 0)) out.push(`${b} says nothing at all`);
    if (!crafterLine(b, { elements: ['fire'] }, () => 0)) out.push(`${b} says nothing to a fire customer`);
  }
  for (const reg of ['violent', 'protective', 'strange']) {
    if (!CONFLUENCE_FALLBACKS[reg]) out.push(`no ${reg} confluence fallback`);
  }
  if (confluenceRegister('The Reaper') !== 'violent') out.push('a reaper does not read as violent');
  if (confluenceRegister('The Adjudicator') !== 'protective') out.push('an adjudicator does not read as protective');
  if (confluenceRegister('The Cartographer') !== 'strange') out.push('an unclassifiable confluence has no fallback');
  if (!crafterLine('blacksmith', { confluenceName: 'The Reaper' })) out.push('no line for a confluence');

  return out;
}
