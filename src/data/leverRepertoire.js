// ===========================================================================
// ROUND 53 -- LEVER REPERTOIRES AND THE BUILD'S SPINE.
//
// The user, after reading ten randomly drawn builds:
//
//   "The idea is probably to have a larger set of levers for each essence and
//    then based on the 3 essences and confluence essences it identifies a set
//    of mostly shared levers to promote synergy. This actually is lore
//    appropriate as well, people are warned not to absorb too many awakening
//    stones before they get all their essences or their build may end up
//    disjointed."
//
// This is the answer to a problem three rounds of work could not reach from the
// generator side. Measured in round 52: two builds sharing ONE essence in three
// still overlapped ~74% of their shapes, because `bind` sits on 40% of the 146
// essences and `ward` on 35%. A lever carried by a third of the catalogue wins
// a third of the catalogue's sockets no matter what else is socketed, and no
// amount of candidate scoring reaches that -- it is a property of the DATA.
//
// The fix is not to re-author 146 motifs. It is to change what a lever list
// MEANS:
//
//   BEFORE  an essence's levers were the levers it uses. Fixed, always, in
//           every build, regardless of what it was bonded alongside.
//
//   AFTER   an essence's levers are the levers it CAN reach -- a repertoire.
//           Which of them it actually uses is decided by the company it keeps.
//
// So a Fire essence in a trio that agrees on `burst` is an explosive Fire; the
// same Fire essence beside two essences that agree on `linger` is a smouldering
// one. Same essence, different build, genuinely different abilities. And two
// trios that share nothing with each other now diverge hard, because their
// spines are different -- which is the separation problem, solved at the layer
// it actually lives on.
//
// THE LORE FALLS OUT OF IT RATHER THAN BEING PAINTED ON. A build coheres when
// its three essences agree. Bond three essences that agree on nothing and the
// generator has no spine to build around -- exactly the disjointed build the
// in-world warning describes. See COHERENCE below: that outcome is real, it is
// worse, and the UI says so.
// ===========================================================================

import { LEVERS } from './essenceLevers.js';
import { ESSENCE_MOTIFS } from './essenceMotifs.js';

/**
 * What each stone/essence FAMILY can reach for, beyond its authored core.
 *
 * The authored `levers` in essenceMotifs.js stay exactly as they are -- they
 * are the essence's core, its most characteristic mechanics, and several were
 * written by the user personally. This table adds the levers a family could
 * plausibly extend INTO when the rest of the build asks it to. An essence never
 * uses one of these on its own; it only reaches for one that its trio agrees on.
 *
 * Keyed by family rather than by essence for a reason beyond effort: the family
 * is what an essence has in common with its neighbours, so extending through it
 * keeps Ape and Bear reaching for the same NEIGHBOURHOOD while their authored
 * cores keep them distinct. Extending through lever-adjacency instead would
 * have done the opposite -- every ward essence reaching for the same two levers
 * regardless of what it is -- which is the concentration this file exists to
 * break, rebuilt one layer down.
 *
 * THE TABLE COUNTERBALANCES THE CORES RATHER THAN MIRRORING THEM, and the
 * first draft got this exactly backwards. Measured, core frequency across the
 * 146 authored motifs runs bind 58, ward 51, linger 41 at the top and turn 2,
 * renew 1 at the bottom. A first pass that extended each family into whatever
 * suited it thematically reproduced that shape one layer up: `bind` landed on
 * 43% of all spines and `renew` on none, so the build-level fix inherited the
 * exact concentration it was written to break. So the dominant seven (bind,
 * ward, linger, swift, stalk, reach, shift) appear here only where a family
 * would be a lie without them, and the scarce end carries the weight.
 *
 * `renew` is deliberately spread across six families here (aquatic, water,
 * light, life, blood, craft -- a craft stone's mending label is already
 * "Repair"). The user: "Renew being the only way to generate hots is
 * a weakness. The right awakening stones in a blood essence should generate
 * abilities that deal damage and generate a heal over time for a percentage of
 * damage dealt." Blood reaching `renew` through its trio is that sentence in
 * data form.
 */
export const FAMILY_LEVERS = {
  // --- martial ---
  blade:      ['siphon', 'stealth', 'burst', 'fate', 'linger'],
  bludgeon:   ['taunt', 'burst', 'turn', 'raw', 'chain'],
  polearm:    ['taunt', 'reach', 'fate', 'chain', 'anchor'],   // a polearm holds ground
  ranged:     ['stalk', 'fate', 'burst', 'reach', 'chain'],
  guard:      ['taunt', 'allies', 'mend', 'call', 'bulwark'],
  craft:      ['call', 'renew', 'fate', 'turn', 'reach'],
  force:      ['raw', 'burst', 'taunt', 'chain', 'anchor'],   // it puts things down
  // --- creatures ---
  beast:      ['allies', 'call', 'taunt', 'raw', 'stalk'],
  smallbeast: ['stealth', 'fate', 'swift', 'stalk', 'shift'],
  flyer:      ['swift', 'reach', 'stalk', 'burst', 'shift'],
  aquatic:    ['renew', 'mend', 'allies', 'turn', 'shift'],
  serpent:    ['stealth', 'siphon', 'linger', 'turn', 'stalk'],
  // --- elements ---
  fire:       ['burst', 'chain', 'linger', 'raw', 'reach'],
  water:      ['renew', 'mend', 'allies', 'shift', 'anchor'],  // drowning is holding
  air:        ['swift', 'turn', 'chain', 'shift', 'reach'],
  earth:      ['taunt', 'call', 'raw', 'bulwark', 'anchor'],   // walls, and being one
  cold:       ['anchor', 'turn', 'linger', 'fate', 'bulwark'], // freeze, and rime
  storm:      ['chain', 'burst', 'turn', 'swift', 'reach'],
  light:      ['renew', 'mend', 'allies', 'fate', 'absolve'],  // light burns it out
  dark:       ['stealth', 'siphon', 'turn', 'linger', 'stalk'],
  // --- the abstract ---
  life:       ['renew', 'mend', 'allies', 'call', 'absolve'],
  death:      ['siphon', 'call', 'linger', 'stealth', 'turn'],
  blood:      ['siphon', 'renew', 'mend', 'linger', 'raw'],
  mind:       ['turn', 'fate', 'stealth', 'stalk', 'shift'],
  motion:     ['swift', 'chain', 'burst', 'shift', 'turn'],
  order:      ['fate', 'allies', 'mend', 'turn', 'absolve'],   // it restores the proper state
  space:      ['shift', 'turn', 'fate', 'reach', 'anchor'],
  identity:   ['call', 'turn', 'fate', 'stealth', 'shift'],
  // ROUND 206 -- ALCHEMY HAD NO ROW, AND NOBODY NOTICED FOR FOUR ROUNDS.
  //
  // The family was added with its own entry in `STONE_ELEMENTS` (nature,
  // Corrosion, Draught) and this table was not updated, so Reagent and Elixir
  // drew from nothing. Found by the round-206 token census: of 10,878 essence
  // pairs, exactly 560 connected to nothing at all, and every one of them was
  // an alchemy pair.
  //
  // Same fault class as round 205's Sickle -- a family added to one table and
  // not to its pair -- which is why `essenceTokenFaults` now asserts that every
  // family carrying an essence has a row here.
  //
  // The five are the two halves of what alchemy is: `linger` and `turn` for the
  // corrosion and the transmutation, `renew` and `mend` for the draught, and
  // `absolve` for the antidote -- which is the one lever the family has a stone
  // literally named after.
  // ROUND 206, second cut: `burst` in place of `mend`. The first draft gave
  // alchemy two healing levers (`renew` and `mend`) and no way to spend
  // anything, which left it wanting only support tokens -- so Reagent and
  // Elixir still met nothing from `mind`, `smallbeast` or `space`, whose
  // offers are all precision (`crit`, `mark`, `unseen`). 84 trios in the
  // catalogue could not close a loop and every one of them held an alchemy
  // essence.
  //
  // `burst` -- "spends everything at once and asks for the cooldown
  // afterwards" -- is the Crucible and the Catalyst, which are two of this
  // family's four stones, and it wants `stack` and `mark`, which is exactly
  // what those families supply. The draught keeps `renew`; `mend` was the
  // weaker of the two healing levers and said nothing `renew` does not.
  alchemy:    ['linger', 'turn', 'renew', 'burst', 'absolve'],
};

/** Weights. A lever the essence was AUTHORED with speaks twice as loudly as one
 *  it can merely reach for -- so two essences that were written around the same
 *  mechanic always out-vote three that could each sort of manage it. */
export const CORE_WEIGHT = 2;
export const EXTENDED_WEIGHT = 1;

/**
 * HOW DISTINCTIVE IS AGREEING ON THIS LEVER?
 *
 * The counterbalanced extension table above was not enough on its own, and the
 * measurement says why: with a flat score, `bind` reached 37% of all spines and
 * `renew` reached none. That is not a table problem, it is arithmetic. `bind`
 * is authored onto 58 of 146 essences, so roughly one random trio in six has
 * two essences carrying it in core -- the spine was being formed by the levers
 * that are merely COMMON, which is the exact concentration this file exists to
 * break, and no extension table can outvote it.
 *
 * So agreement is priced by how surprising it is. Three essences that all
 * happen to bind is a coincidence; three that all reach for renewal is a build.
 * The weight is the standard inverse-frequency shape, computed from the motif
 * data itself so that re-authoring a motif re-prices it automatically and this
 * file can never drift out of step with essenceMotifs.js.
 */
const CORE_FREQUENCY = (() => {
  const n = {};
  const ids = Object.keys(ESSENCE_MOTIFS);
  for (const id of ids) for (const lv of (ESSENCE_MOTIFS[id].levers || [])) n[lv] = (n[lv] || 0) + 1;
  return { counts: n, total: ids.length };
})();

/** Rarer levers weigh more. Floored at 1 so a common lever is never worth
 *  LESS than its raw agreement, and softened with a square root so `renew`
 *  (on one essence) does not outweigh everything else by a factor of five. */
export function distinctiveness(lever) {
  const c = CORE_FREQUENCY.counts[lever] || 0.5;
  return Math.max(1, Math.sqrt(CORE_FREQUENCY.total / c) / 2);
}

/** The floor for CONTRIBUTION: below this the lever is not shared at all, it is
 *  one essence's own business. 3 means at least two essences put something in
 *  -- one core and one reach, or three reaches. This is checked on the RAW
 *  score, before distinctiveness, so no amount of rarity can promote a lever
 *  only one essence carries. */
export const SHARED_FLOOR = 3;

/** The bar an eligible lever must clear once distinctiveness is applied. Tuned
 *  so two cores of a COMMON lever still qualify (the trio really does agree on
 *  it) while three reaches for a RARE one also do. */
export const SPINE_BAR = 3.6;

/** Above this the trio has agreed on something emphatic, and the build is
 *  Bound rather than merely Loose.
 *
 *  Tuned by sweep to land 74% bound / 25% loose / 1% disjoint over 4,000 random
 *  trios. Loose has to be common enough that a player meets it and learns what
 *  it means, and rare enough that it reads as a build they could have assembled
 *  better rather than as the normal state of the game. Disjointed stays at the
 *  1% it falls out at -- it is the outcome the in-world warning is about, and a
 *  warning about something that happens to a quarter of everyone is just a
 *  description of the game. */
export const BOUND_BAR = 4.6;

/** How many levers a spine may hold. A trio that agreed on six things has not
 *  agreed on anything in particular, and a spine that wide would put us back
 *  where round 52 was. Four is the width of a build's identity. */
export const SPINE_CAP = 4;

/**
 * The three coherence tiers, and what each means in the fiction.
 *
 * The user asked for the disjointed outcome to be REAL: "people are warned not
 * to absorb too many awakening stones before they get all their essences or
 * their build may end up disjointed." A warning that costs nothing is set
 * dressing, so a disjointed build genuinely gets less -- a weaker confluence
 * and no shared mechanics to build around. It is recoverable (rebond an
 * essence) and it is legible (the UI says which tier you are in and why),
 * because a punishment the player cannot see or fix is just a bug.
 */
export const COHERENCE = {
  bound: {
    id: 'bound',
    label: 'Bound',
    blurb: 'the three essences agree, and the confluence is built on what they share',
  },
  loose: {
    id: 'loose',
    label: 'Loosely bound',
    blurb: 'the three lean the same way without agreeing outright; the confluence is thinner for it',
  },
  disjoint: {
    id: 'disjoint',
    label: 'Disjointed',
    blurb: 'these three essences have nothing in common, and the confluence has nothing to be built from',
  },
};

/** Every lever an essence can reach: its authored core first, in the authored
 *  order, then whatever its family extends into that the core did not name. */
export function repertoireFor(essDef, motif) {
  const core = (motif && motif.levers) ? motif.levers.filter(l => LEVERS[l]) : [];
  const fam = (essDef && essDef.family) || null;
  const ext = ((fam && FAMILY_LEVERS[fam]) || []).filter(l => LEVERS[l] && !core.includes(l));
  return { core, extended: ext, all: [...core, ...ext] };
}

/** The weight one essence lends a lever. */
function weightOf(rep, lever) {
  if (rep.core.includes(lever)) return CORE_WEIGHT;
  if (rep.extended.includes(lever)) return EXTENDED_WEIGHT;
  return 0;
}

/**
 * THE SPINE: what this particular set of essences agrees on.
 *
 * Takes the repertoires (not the raw motifs) so the caller decides whether the
 * confluence votes alongside the three -- it does not, and deliberately: the
 * confluence is DOWNSTREAM of the agreement, the thing built out of it. Letting
 * it vote would be letting the conclusion into the premises.
 *
 * Returns the spine, every lever's score (for the UI and the tests), and which
 * coherence tier the build landed in.
 */
export function leverSpine(reps) {
  const raw = {};
  for (const rep of reps) {
    for (const lv of rep.all) raw[lv] = (raw[lv] || 0) + weightOf(rep, lv);
  }
  const scored = Object.entries(raw)
    .filter(([, r]) => r >= SHARED_FLOOR)              // genuinely shared, always
    .map(([lv, r]) => ({ lever: lv, raw: r, score: r * distinctiveness(lv) }))
    .sort((a, b) => b.score - a.score || a.lever.localeCompare(b.lever));

  const eligible = scored.filter(e => e.score >= SPINE_BAR);

  let tier;
  if (eligible.some(e => e.score >= BOUND_BAR)) tier = COHERENCE.bound;
  else if (eligible.length) tier = COHERENCE.loose;
  else tier = COHERENCE.disjoint;

  return {
    spine: eligible.slice(0, SPINE_CAP).map(e => e.lever),
    detail: eligible.slice(0, SPINE_CAP),
    scores: raw,
    ranked: scored,
    tier: tier.id,
    tierLabel: tier.label,
    tierBlurb: tier.blurb,
  };
}

/**
 * Which levers THIS essence may actually use in THIS build.
 *
 * Its authored core, always -- an essence never stops being itself -- plus any
 * extended lever the trio agreed on. This is the function that keeps round 51's
 * charters tight: charters are built from these, not from the whole repertoire,
 * so widening what an essence CAN reach does not widen what it may PRODUCE
 * until the build earns it. Without that line, seven levers per essence would
 * have unioned into a charter that permits nearly everything, and three rounds
 * of separation work would have evaporated on contact.
 */
export function activeLeversFor(rep, spine) {
  const out = [...rep.core];
  for (const lv of spine) {
    if (!out.includes(lv) && rep.extended.includes(lv)) out.push(lv);
  }
  return out;
}

/** The probe order for a build: what it agreed on first, then what each essence
 *  is on its own. A spine lever the essence cannot reach at all is skipped --
 *  the trio agreeing on `mend` does not teach an Axe essence to heal. */
export function leverOrderFor(rep, spine) {
  const active = activeLeversFor(rep, spine);
  const lead = spine.filter(l => active.includes(l));
  return [...lead, ...active.filter(l => !lead.includes(l))];
}
