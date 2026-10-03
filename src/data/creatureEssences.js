// ===========================================================================
// ROUND 252 -- WHAT A CREATURE IS MADE OF.
//
//   "Essences should be dropping far less often, and should 90% of the time
//    be tied to the creature that dropped it."
//
// THE FAULT THIS FIXES. `rollEssenceDrop` picks off the whole 148-entry
// catalog weighted by rarity and nothing else, so a spider could hand you
// Ship, a skeleton could hand you Chicken, and the only thing an essence ever
// told you about the thing you killed was that you had killed something. That
// is the opposite of what an essence is in this setting: it is the concept the
// creature embodied, gone loose.
//
// WHY A TABLE AND NOT A DERIVATION. Six of the forty-four monster families
// share a name with an essence (Lizard, Bat, Spider, Wolf, Elemental,
// Crocodile) and a name match would have covered those six and failed on the
// other thirty-eight -- and failed SILENTLY, which is the worse half. The
// interesting answers are the ones no rule produces: a hydra gives Growth
// because it regrows its heads, a bat gives Echo because of how it sees, a
// mantis gives Sickle because of what its arms are, a phoenix gives Renewal
// because that is the whole of what a phoenix is. Those are authored or they
// do not exist.
//
// THE GUARD IS `creatureEssenceFaults`, and it is pointed at the thing this
// project keeps getting wrong: a hand-maintained list beside a generator
// drifts. It takes the LIVE monster families and the LIVE essence catalog and
// refuses a family with no pool and a pool naming an essence that is not
// there -- so a monster added in a later round fails a suite rather than
// quietly falling back to the old everything-roll.
// ===========================================================================

/** How often a dropped essence is the creature's own. The user's number. */
export const CREATURE_TIE_CHANCE = 0.9;

/**
 * Monster family -> the essences that creature IS, most characteristic first.
 *
 * Two to four each. Fewer than two and a family becomes a slot machine with
 * one face; more than four and the tie stops reading as a tie -- the point is
 * that killing spiders is how you get Venom, and a pool of nine would make
 * that a coincidence again.
 */
export const CREATURE_ESSENCES = {
  // ----- the things that crawl ------------------------------------------
  slime:        ['essFungus', 'essGrowth', 'essFlesh'],
  slimeGolem:   ['essFungus', 'essEarth', 'essGrowth'],
  spider:       ['essSpider', 'essVenom', 'essThread'],
  scorpion:     ['essVenom', 'essSpike', 'essClaw'],
  // A mantis's arms ARE sickles. This is the entry that justifies the table.
  mantis:       ['essSickle', 'essClaw', 'essLocust'],
  giantToad:    ['essFrog', 'essVenom', 'essTentacle'],
  // ----- serpents and lizards -------------------------------------------
  lizard:       ['essLizard', 'essSnake', 'essClaw'],
  cobra:        ['essSnake', 'essVenom', 'essVisage'],
  // It grows the heads back. Nothing else in the catalog says that.
  hydra:        ['essSnake', 'essGrowth', 'essVenom'],
  flowerhydra:  ['essPlant', 'essGrowth', 'essVenom'],
  // ROUND 285 -- the carnivorous plants.
  bloomimp:     ['essPlant', 'essGrowth', 'essBrush'],
  snapmaw:      ['essPlant', 'essHunger', 'essGrowth'],
  vinegrasp:    ['essPlant', 'essTree', 'essClaw'],
  spiritSerpent:['essSnake', 'essVoid', 'essDimension'],
  medusa:       ['essSnake', 'essEye', 'essCrystal'],
  crocodile:    ['essCrocodile', 'essDeep', 'essArmour'],
  // ----- the great lizards ----------------------------------------------
  raptor:       ['essClaw', 'essLizard', 'essSwift'],
  steelRaptor:  ['essIron', 'essClaw', 'essTechnology'],
  spinosaurus:  ['essLizard', 'essFish', 'essSpike'],
  trex:         ['essLizard', 'might', 'essClaw'],
  dragon:       ['essLizard', 'fire', 'essWing'],
  // ----- beasts ----------------------------------------------------------
  wolf:         ['essWolf', 'essDog', 'essHunt'],
  hellhound:    ['essDog', 'fire', 'essMalign'],
  gnoll:        ['essDog', 'essHunger', 'essKnife'],
  boar:         ['essCattle', 'essSpike', 'might'],
  hornram:      ['essGoat', 'essSpike', 'might'],
  direbuck:     ['essDeer', 'essFoot', 'essSwift'],
  whitelion:    ['essCat', 'essClaw', 'essPure'],
  glasscat:     ['essGlass', 'essCat', 'essShimmer'],
  minotaur:     ['essCattle', 'essAxe', 'might'],
  sixArmApe:    ['essApe', 'essHand', 'might'],
  demonsloth:   ['essSloth', 'essMalign', 'essFeeble'],
  yeti:         ['essCold', 'essIce', 'essApe'],
  quillFiend:   ['essNeedle', 'essSpike', 'essPangolin'],
  // ----- things with wings -----------------------------------------------
  // A bat's essence is how it SEES, which is the sort of answer a name match
  // could never have produced.
  bat:          ['essBat', 'essEcho', 'essWing'],
  // Renewal. The entire idea of a phoenix, and it is sitting in the catalog
  // under the id `heal` because it was one of the first five.
  phoenix:      ['essBird', 'fire', 'heal'],
  thunderbird:  ['essBird', 'essLightning', 'essCloud'],
  birdangel:    ['essBird', 'essLight', 'essWing'],
  // ----- water -----------------------------------------------------------
  sharkcrab:    ['essShark', 'essClaw', 'essCoral'],
  shellborn:    ['essTurtle', 'essArmour', 'essCoral'],
  tidalTroll:   ['essWater', 'essDeep', 'essGrowth'],
  // ----- the dark --------------------------------------------------------
  shade:        ['shadow', 'essLurker', 'essVoid'],
  demon:        ['essMalign', 'essSin', 'essCorrupt'],
  skeleton:     ['essBone', 'essDeath', 'essFeeble'],
  harbinger:    ['essOmen', 'essDeath', 'shadow'],
  // ----- the made and the many -------------------------------------------
  elemental:    ['essElemental', 'essCrystal', 'essDust'],
  chimera:      ['essMyriad', 'essVisage', 'essClaw'],
};

/** Every family the table answers for. */
export const TIED_FAMILIES = Object.keys(CREATURE_ESSENCES);

/**
 * The essence this creature leaves behind.
 *
 * `roll` is the general rarity roll -- the caller passes `rollEssenceDrop` so
 * this module does not have to know how rarity weighting works, and so the
 * untied tenth still behaves exactly as every essence drop did before.
 *
 * Returns null only when there is no tie AND no fallback, which is the caller
 * asking for an essence in a game with no essences in it.
 */
export function essenceForCreature(family, rng = Math.random, roll = null, catalog = null) {
  const pool = CREATURE_ESSENCES[family];
  // The untied tenth, and every family the table has not been taught yet.
  // A missing family falls back rather than throwing, because a monster with
  // no pool should still drop something -- `creatureEssenceFaults` is what
  // makes sure nobody finds out about the gap that way.
  if (!pool || !pool.length || rng() >= CREATURE_TIE_CHANCE) {
    return roll ? roll(rng) : null;
  }
  const live = catalog ? pool.filter(id => catalog[id]) : pool;
  if (!live.length) return roll ? roll(rng) : null;
  // WEIGHTED TOWARDS THE FIRST, because the pools are written most
  // characteristic first and a spider should give Spider more often than it
  // gives Thread. Halving weights rather than a flat pick: 4/2/1 over three.
  let total = 0;
  const w = live.map((_, i) => { const x = 1 / (1 << i); total += x; return x; });
  let r = rng() * total;
  for (let i = 0; i < live.length; i++) { r -= w[i]; if (r <= 0) return live[i]; }
  return live[0];
}

/** True when this essence is one the creature could have left. Used by the
 *  suite, and by nothing in the runtime -- the runtime does the picking. */
export function isTiedEssence(family, essenceId) {
  return (CREATURE_ESSENCES[family] || []).includes(essenceId);
}

/**
 * Faults. Takes the live lists so the table cannot drift away from them.
 *
 * `families` is every family in MONSTER_TYPES; `catalog` is ESSENCE_CATALOG.
 */
export function creatureEssenceFaults(families = [], catalog = null) {
  const out = [];
  for (const f of families) {
    const pool = CREATURE_ESSENCES[f];
    if (!pool || !pool.length) { out.push(`no essence pool for ${f}`); continue; }
    if (pool.length < 2) out.push(`${f}: a pool of one is not a pool`);
    if (pool.length > 4) out.push(`${f}: ${pool.length} essences is not a tie`);
    if (new Set(pool).size !== pool.length) out.push(`${f}: repeats an essence`);
  }
  if (catalog) {
    for (const [f, pool] of Object.entries(CREATURE_ESSENCES)) {
      for (const id of pool) if (!catalog[id]) out.push(`${f}: no such essence ${id}`);
    }
  }
  // A table entry for a family that does not exist is dead weight that reads
  // as coverage. Only checked when the live list was supplied.
  if (families.length) {
    const live = new Set(families);
    for (const f of Object.keys(CREATURE_ESSENCES)) {
      if (!live.has(f)) out.push(`${f}: no monster has this family`);
    }
  }
  if (!(CREATURE_TIE_CHANCE > 0.5 && CREATURE_TIE_CHANCE <= 1)) {
    out.push('the tie is not a tie');
  }
  return out;
}
