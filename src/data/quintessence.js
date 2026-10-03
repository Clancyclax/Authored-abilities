// ===========================================================================
// ROUND 86 ITEM 3 -- QUINTESSENCE, NAMED FOR ESSENCES.
//
//   "Quintessence is derived from the element of the monster being fought but
//    it should still be named using the essence names. i.e. there is no ember
//    or bloom essence, but there is a fire essence and a plant essence meaning
//    it should be fire quintessence and plant quintessence. This also makes
//    for rarer quintessence as the rarity of the essence maps to the rarity of
//    the quintessence."
//
// WHAT ROUND 85 GOT WRONG. It invented a vocabulary -- Ember, Rime, Bloom,
// Dawn -- and a rank ladder of its own, Dim through Perfect. Both were
// parallel systems: the game already has a hundred and forty-eight essences
// with names and rarities, and a "Bright Bloom Mote" told the player nothing
// about anything else in the game. Nothing in a build should have its own
// private taxonomy for a thing the build already names.
//
// WHAT IT IS NOW. A quintessence IS an essence's raw material, so it takes the
// essence's name and the essence's rarity, and its price comes off the same
// rarity ladder every stone and essence in the game is priced from. "Fire
// Quintessence" is common because Fire is a common essence; "Dimension
// Quintessence" is legendary because Dimension is.
//
// WHERE THE RANK WENT. Round 85 put the monster's rank in the id, which is
// what produced thirty-five rows. Rank drives QUANTITY and the odds of the
// rare drop instead:
//
//   "If a creature drops 20 plant quintessence it might drop a little growth
//    quintessence"
//
// -- so a dragon is still worth more than a rat, without a second axis in the
// name. One id per essence, and the bag reads as a list of materials.
//
// THE SECOND TABLE is the interesting half. Every element has one obvious
// common drop and a short list of rarer, related ones, each with its own
// chance: fire gives Fire and sometimes Smoke and rarely Sun. That is what
// makes an element worth farming for something other than volume.
// ===========================================================================

import { ELEMENT_TYPES } from './stats.js';

/**
 * THE CURATED SET. Not all 148 essences -- only the ones that read as a
 * MATERIAL, something a smith could hold. "Fire quintessence" is a thing;
 * "Adept quintessence" is not, and a bag with a hundred and forty-eight
 * possible rows is one nobody can read and no recipe can be written against.
 *
 * Every entry names a real essence, and `quintessenceFaults()` checks that --
 * so a typo here is caught by the catalogue rather than by a screenshot.
 */
export const QUINT_ESSENCES = [
  // The plain stuff, common and everywhere.
  'Fire', 'Water', 'Earth', 'Wind', 'Plant', 'Iron', 'Magic', 'Swift', 'Feast',
  // A step up: the things a creature has to be somewhat special to be made of.
  'Ice', 'Lightning', 'Dark', 'Light', 'Life', 'Death', 'Blood', 'Growth',
  'Bone', 'Venom', 'Claw', 'Sand', 'Smoke', 'Cloud', 'Balance',
  // Rare and above. These are the ones worth going looking for.
  'Sun', 'Moon', 'Crystal', 'Star', 'Deep',
  'Wing', 'Tentacle', 'Rune',
  'Dimension', 'Void', 'Sin',
];

/**
 * WHAT EACH ELEMENT LEAVES BEHIND.
 *
 * `primary` is the obvious one and drops on almost every kill. `rare` is the
 * user's second half -- thematically related, rarer, and rolled separately, so
 * twenty Plant does occasionally come with a Growth.
 *
 * The chances are per-kill and deliberately small; they are multiplied by the
 * monster's rank at the call site, so a gold-rank creature is several times
 * more likely to give up the good one than a rat is.
 */
// FROST'S PRIMARY IS WATER, NOT ICE, and that was the fault checker's doing.
// The first draft had Ice as the primary with Water in the rare list, and the
// check that a "rare" drop is never COMMONER than the primary caught it: Water
// is a common essence and Ice is uncommon, so the bonus drop was worth less
// than the ordinary one. Every element's primary is now the plainest material
// it could reasonably be made of, and the step up is what you are hoping for.
export const QUINT_BY_ELEMENT = {
  fire:      { primary: 'Fire',      rare: [['Smoke', 0.10], ['Sand', 0.05], ['Sun', 0.02], ['Rune', 0.006]] },
  frost:     { primary: 'Water',     rare: [['Ice', 0.10], ['Cloud', 0.05], ['Crystal', 0.02], ['Moon', 0.01]] },
  lightning: { primary: 'Lightning', rare: [['Cloud', 0.08], ['Star', 0.02], ['Rune', 0.006], ['Void', 0.004]] },
  nature:    { primary: 'Plant',     rare: [['Growth', 0.10], ['Venom', 0.06], ['Life', 0.03], ['Wing', 0.006]] },
  shadow:    { primary: 'Dark',      rare: [['Death', 0.08], ['Deep', 0.02], ['Tentacle', 0.006], ['Sin', 0.004]] },
  radiant:   { primary: 'Light',     rare: [['Balance', 0.08], ['Sun', 0.04], ['Moon', 0.02], ['Star', 0.02]] },
  // Not an element. Two thirds of the bestiary hits you with teeth, and what
  // it leaves behind is the raw stuff of a body rather than of a channel.
  formless:  { primary: 'Iron',      rare: [['Bone', 0.10], ['Blood', 0.06], ['Claw', 0.04], ['Swift', 0.04]] },
};

/**
 * WHERE YOU ARE, NOT ONLY WHAT YOU KILLED.
 *
 *   "a creature in an astral space might occasionally drop dimension
 *    quintessence in addition to an obvious common essence"
 *
 * A place can add to the table. The astral spaces themselves are not built --
 * the sewer prologue's cult was reaching INTO the astral and nothing in the
 * world goes there yet -- so this table exists with the one entry the user
 * named, wired to a hook the world can start answering the moment there is
 * somewhere to answer for. Written now because the alternative is discovering
 * later that drops have no idea where they happened.
 */
// WHERE YOU FIGHT ADDS TO WHAT YOU FIGHT. The four regions carry the plain
// materials an element has no claim on -- a thing killed on Ontaria's moors
// gives up earth whatever it was made of -- which is also what makes every row
// in the curated set reachable. `quintessenceFaults` checks that: a material
// nothing can drop is a row in a catalogue and a lie in a recipe.
export const QUINT_BY_PLACE = {
  nek:      [['Feast', 0.06], ['Plant', 0.05]],
  ontaria:  [['Earth', 0.08], ['Sand', 0.04]],
  elehyd:   [['Earth', 0.06], ['Wind', 0.06], ['Crystal', 0.01]],
  bratugal: [['Venom', 0.06], ['Growth', 0.04]],
  // Magic itself, wherever magic is thick on the ground -- the temples, the
  // Department, and whatever else `_nearConcentratedMagic` comes to answer for.
  magic:    [['Magic', 0.10], ['Rune', 0.008]],
  astral:   [['Dimension', 0.05], ['Void', 0.02]],
  // The Undercity, where a cult tore something open. The one place in the
  // build that has actually touched the astral, so it leaks a little.
  sewer:    [['Dimension', 0.01], ['Death', 0.04]],
};

/** `quintId('Fire')` -> 'quintFire'. One place builds these. */
export function quintId(essenceName) {
  return `quint${String(essenceName).replace(/[^A-Za-z]/g, '')}`;
}

/**
 * Build the catalogue against the real essence table.
 *
 * TAKES `ESSENCES` AS AN ARGUMENT rather than importing it, because
 * essenceCatalog.js is large and this module is imported by loot.js, which is
 * imported by everything. The scene calls this once at boot; the faults
 * checker calls it with the same table.
 */
export function buildQuintessenceDefs(ESSENCES) {
  // ROUND 90 -- BY ENTRY, NOT BY VALUE. An essence's id is the catalogue's KEY
  // (`essFire: { name: 'Fire', ... }`); the value carries no `id` field at all.
  // So `e.id` here was `undefined` for all thirty-five rows from the day round
  // 86 wrote it, and nothing noticed because nothing read `essenceId` until
  // crafting's effect resolver went looking for the essence's levers and found
  // none. The fault checker could not see it either: it only ever asked
  // whether the NAME resolved.
  const byName = {};
  for (const [key, e] of Object.entries(ESSENCES || {})) byName[e.name] = { ...e, id: e.id || key };
  const defs = {};
  for (const name of QUINT_ESSENCES) {
    const e = byName[name];
    if (!e) continue;                       // reported by quintessenceFaults
    const id = quintId(name);
    defs[id] = {
      id, essenceId: e.id, essence: name,
      name: `${name} Quintessence`,
      rarity: e.rarity,
      color: e.color || '#b0bec5',
      // The name carries the flavour, the description states the mechanic.
      desc: `Raw ${name.toLowerCase()} quintessence, drawn out of what it killed. `
        + 'A crafting material, and traders buy it by weight.',
      rank: 'iron',
    };
    // ROUND 283 -- QUINTESSENCE HAS A RANK. Asked how "100 bronze-rank iron
    // quintessence gems" should work: "Add ranks to quintessence". A gem takes
    // the rank of what dropped it. The plain id stays the iron one, so every
    // gem a player already carries is iron-rank and every recipe that names
    // it still finds it; the higher ranks are their own rows, carrying the
    // same fields so every reader of a quintessence def reads them unchanged.
    for (const rank of QUINT_RANKS.slice(1)) {
      const rid = quintRankId(id, rank);
      defs[rid] = { ...defs[id], id: rid, rank, baseId: id,
        name: `${rank[0].toUpperCase()}${rank.slice(1)}-rank ${name} Quintessence`,
        desc: `${name} quintessence drawn from a ${rank}-rank creature. `
          + 'A crafting material, and traders buy it by weight.' };
    }
  }
  return defs;
}

/** ROUND 283 -- the ranks a quintessence gem can carry. No diamond. */
export const QUINT_RANKS = ['iron', 'bronze', 'silver', 'gold'];
/** `quintRankId('quintFire', 'bronze')` -> 'quintFire_bronze'; iron is the plain id. */
export function quintRankId(baseId, rank) {
  return !rank || rank === 'iron' ? baseId : `${baseId}_${rank}`;
}
/** The rank a gem id carries, and its plain id. */
export function quintRankOf(id) {
  const m = /^(quint[A-Za-z]+)(?:_(bronze|silver|gold))?$/.exec(String(id || ''));
  return m ? { baseId: m[1], rank: m[2] || 'iron' } : { baseId: id, rank: 'iron' };
}

/** Filled in at boot by the scene, so everything reads one object. */
export let QUINTESSENCE_DEFS = {};
export function installQuintessenceDefs(ESSENCES) {
  QUINTESSENCE_DEFS = buildQuintessenceDefs(ESSENCES);
  return QUINTESSENCE_DEFS;
}

/**
 * Everything one kill leaves behind: the obvious drop, plus whatever the rare
 * table and the place gave up.
 *
 * Returns `[{ id, qty }]`. `tier` is the monster's threat tier 0-4, and it
 * moves both the quantity and the rare odds -- which is where "a dragon is
 * worth more than a rat" lives now that the rank is out of the name.
 */
export function quintessenceDrops(element, tier, place, rand = Math.random) {
  const kind = ELEMENT_TYPES.includes(element) ? element : 'formless';
  const row = QUINT_BY_ELEMENT[kind];
  if (!row) return [];
  const t = Math.max(0, Math.min(4, tier | 0));
  const out = [];
  // QUANTITY, from the rank. One from a rat, a handful from a dragon -- which
  // is the user's own "20 plant" arriving over a session of killing plants.
  const qty = 1 + Math.floor(rand() * (1 + t));
  // ROUND 283 -- the gem takes the rank of the creature: tiers 0-1 (normal,
  // iron) give iron-rank gems, 2 bronze, 3 silver, 4 gold.
  const rank = QUINT_RANKS[Math.max(0, t - 1)] || 'iron';
  const rid = (name) => quintRankId(quintId(name), rank);
  out.push({ id: rid(row.primary), qty });
  // The rare table, each entry rolled on its own so two can land at once.
  const luck = 1 + t * 0.5;
  for (const [name, chance] of row.rare) {
    if (rand() < chance * luck) out.push({ id: rid(name), qty: 1 });
  }
  for (const [name, chance] of (QUINT_BY_PLACE[place] || [])) {
    if (rand() < chance * luck) out.push({ id: rid(name), qty: 1 });
  }
  return out;
}

/** Faults a suite can assert against. Needs the essence catalogue, for the
 *  same reason the builder does. */
export function quintessenceFaults(ESSENCES) {
  const out = [];
  const byName = {};
  for (const e of Object.values(ESSENCES || {})) byName[e.name] = e;
  // EVERY NAME MUST BE A REAL ESSENCE. This is the whole point of the round:
  // "there is no ember or bloom essence".
  for (const name of QUINT_ESSENCES) {
    if (!byName[name]) out.push(`"${name}" is not the name of any essence`);
  }
  const defs = buildQuintessenceDefs(ESSENCES);
  // ROUND 283 -- one row per name per rank ("Add ranks to quintessence").
  if (Object.keys(defs).length !== QUINT_ESSENCES.length * QUINT_RANKS.length) {
    out.push(`${Object.keys(defs).length} rows built from ${QUINT_ESSENCES.length} names x ${QUINT_RANKS.length} ranks`);
  }
  for (const d of Object.values(defs)) {
    // Rarity is INHERITED, never chosen here.
    if (d.rarity !== byName[d.essence].rarity) {
      out.push(`${d.name} is ${d.rarity} but ${d.essence} essence is ${byName[d.essence].rarity}`);
    }
    if (d.rarity === 'Divine') out.push(`${d.name} is Divine-rank`);
    if (!d.desc) out.push(`${d.id}: no description`);
  }
  // Every element a monster can carry must have a row, and so must the absence
  // of one -- checked by calling, because a missing key is invisible to reading.
  for (const el of [...ELEMENT_TYPES, null, undefined, 'nonsense']) {
    const drops = quintessenceDrops(el, 2, null, () => 0.5);
    if (!drops.length) out.push(`no quintessence for element ${el}`);
    for (const d of drops) {
      if (!defs[d.id]) out.push(`element ${el} drops ${d.id}, which is not in the catalogue`);
      if (!(d.qty > 0)) out.push(`element ${el} drops ${d.id} x${d.qty}`);
    }
  }
  // Every name in both tables must be in the curated set, or it drops an id
  // the catalogue has never heard of.
  const inSet = new Set(QUINT_ESSENCES);
  for (const [el, row] of Object.entries(QUINT_BY_ELEMENT)) {
    if (!inSet.has(row.primary)) out.push(`${el}'s primary "${row.primary}" is not in the set`);
    for (const [n, c] of row.rare) {
      if (!inSet.has(n)) out.push(`${el}'s rare "${n}" is not in the set`);
      if (!(c > 0 && c < 1)) out.push(`${el}'s "${n}" has a chance of ${c}`);
      // A "rare" drop that is not rarer than the primary is not a rare drop.
      const pr = byName[row.primary], rr = byName[n];
      if (pr && rr) {
        const ladder = ['Common', 'Uncommon', 'Rare', 'Unknown', 'Epic', 'Legendary'];
        if (ladder.indexOf(rr.rarity) < ladder.indexOf(pr.rarity)) {
          out.push(`${el}: ${n} (${rr.rarity}) is commoner than its primary ${row.primary} (${pr.rarity})`);
        }
      }
    }
  }
  for (const [place, rows] of Object.entries(QUINT_BY_PLACE)) {
    for (const [n] of rows) if (!inSet.has(n)) out.push(`${place}'s "${n}" is not in the set`);
  }
  // EVERY ROW MUST BE REACHABLE. A material in the catalogue that nothing can
  // drop is a line in the bag nobody will ever see and a recipe ingredient
  // nobody can get -- which is exactly the sort of thing that is only found
  // when a player follows a recipe to a dead end.
  const reachable = new Set();
  for (const row of Object.values(QUINT_BY_ELEMENT)) {
    reachable.add(row.primary);
    for (const [n] of row.rare) reachable.add(n);
  }
  for (const rows of Object.values(QUINT_BY_PLACE)) for (const [n] of rows) reachable.add(n);
  for (const name of QUINT_ESSENCES) {
    if (!reachable.has(name)) out.push(`${name} Quintessence can never drop`);
  }
  // Rank must move both levers, or it moved nothing when it left the name.
  const low = quintessenceDrops('nature', 0, null, () => 0.99);
  const high = quintessenceDrops('nature', 4, null, () => 0.99);
  if (!(high[0].qty >= low[0].qty)) out.push('a gold-rank kill gives no more than a normal-rank one');
  const lowLuck = quintessenceDrops('nature', 0, null, () => 0.08);
  const highLuck = quintessenceDrops('nature', 4, null, () => 0.08);
  if (!(highLuck.length > lowLuck.length)) out.push('rank does not improve the rare table');
  return out;
}
