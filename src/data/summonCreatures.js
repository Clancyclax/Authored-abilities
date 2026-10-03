// ROUND 75 (item 6) -- WHAT YOUR SUMMON ACTUALLY IS.
//
// The user asked for "a host of new summons and monsters" and, asked whether
// the thirteen creatures were monsters or summons, answered: "Both, all of
// them." Asked how a player should GET each summon, they chose: the essence
// decides, AND it matters -- the creature carries its own stats, so a scorpion
// summon is not a reskinned minotaur.
//
// WHAT THIS REPLACES. `summon_creature` was a generated ability that spawned a
// coloured circle. `SUMMON_NOUNS` gave it a name ("calls a hound"), the circle
// gave it a body, and nothing connected either to the essence that made it --
// a Crocodile essence and a Lightning essence summoned the same dot in a
// different colour.
//
// THREE RUNGS, most specific first, and the first rung is the point:
//
//   1. THE ESSENCE ITSELF. A Crocodile essence summons a crocodile. There is
//      no cleverness here and that is exactly why it is right -- the game
//      already ships an essence called Crocodile and a creature that is a
//      crocodile, and any mapping that sent them to different places would be
//      wrong on its face. Ten of the thirteen have a literal essence.
//   2. THE ESSENCE FAMILY. Bear, Dog, Sloth and Heidel have no creature of
//      their own, but they are `beast`, and a beast summons the minotaur.
//   3. NOTHING. A Paper essence summons no creature, and the ability falls
//      back to the abstract summon it has always been rather than calling a
//      thunderbird because something had to be picked. Written down because
//      the tempting alternative -- hash the essence id into the thirteen --
//      would give every essence a creature and make none of them mean
//      anything.
//
// The stats are DERIVED from the wild monster, not typed again here. A summoned
// mantis is fast because the wild mantis is fast; if the roster is rebalanced
// the summons move with it, and there is no second table to drift out of sync.
// See `summonCreatureProfile`.
import { MONSTER_FAMILY_BASE, FAMILY_DISPLAY_NAME } from './monsters.js';
import { MONSTER_ART } from './monsterArt.js';
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { SUMMON_KINDS } from './activeSummons.js';

/**
 * ROUND 76 (item 2.1) -- ALL THIRTY-ONE FAMILIES, not thirteen.
 *
 * The user: "All of the monsters, and creatures, in the game should also be
 * in the summon pool for appropriate essences with the same amount of variety
 * (I.e. color palette swaps)."
 *
 * Round 75 bound the thirteen creatures added that round. The eighteen the
 * game already had were summonable by nothing, which meant a Wolf essence
 * could not call a wolf while a Deer essence could call a direbuck -- an
 * arbitrary line drawn by which round the art arrived in.
 *
 * The literal matches are the point again: essWolf calls a wolf, essSpider a
 * spider, essBat a bat, essBone a skeleton. Where round 75 had bound one of
 * these to a stand-in (essLizard -> cobra, essBone -> medusa) the LITERAL
 * creature wins now that it exists in the pool, and the stand-in keeps the
 * essences that have no creature of their own.
 *
 * Variety comes free: every family carries its five palette shades and
 * `_summonShadeFor` picks one per ability, so thirty-one families is a
 * hundred and fifty-five distinguishable minions.
 */

/** Rung 1: the essence that IS the creature. */
export const SUMMON_CREATURE_BY_ESSENCE = {
  essCrocodile: 'crocodile',
  essFrog: 'giantToad',
  essCattle: 'minotaur',
  essGoat: 'hornram',
  essApe: 'yeti',
  essDeer: 'direbuck',
  essCat: 'whitelion',
  essSnake: 'cobra',
  // ROUND 76 -- essLizard now calls a LIZARD. It was bound to the cobra in
  // round 75 because the lizard was not summonable then; it is, and a literal
  // match beats a stand-in every time.
  essLizard: 'lizard',
  essVenom: 'cobra',
  essSpider: 'mantis',      // the serpent family's other arthropod
  essLocust: 'mantis',
  essWasp: 'mantis',
  essBee: 'mantis',
  essBird: 'thunderbird',
  essLightning: 'thunderbird',
  fire: 'phoenix',
  essCold: 'yeti',
  essIce: 'yeti',
  essSand: 'scorpion',
  essDust: 'scorpion',
  // The gorgon is a snake-headed woman, so she answers to the DEATH and DARK
  // essences rather than to the serpent ones -- the serpents already have the
  // cobra, and a Venom essence summoning a medusa would be a stranger reading
  // of "venom" than a snake is.
  essDeath: 'medusa',
  essBlight: 'medusa',
  // ROUND 76 -- and essBone calls a BONEGUARD, for the same reason.
  essBone: 'skeleton',

  // --- ROUND 76: the eighteen families that round 75 left unsummonable -----
  essWolf: 'wolf',
  essDog: 'hellhound',          // a hound, and the roster's other canine
  essBat: 'bat',
  essSpider: 'spider',
  essCrystal: 'boar',           // the Gemtusk is a literal crystal boar
  essElemental: 'elemental',
  // The Ichorling is the roster's lowest rung and the one thing a Normal-rank
  // character can call at all -- see SUMMON_RANK_GATE. Bound to the essences
  // that are literally it: ooze, rot, and the alchemical.
  essFlesh: 'slime',
  essAlchemy: 'slime',
  essElixir: 'slime',
  essFungus: 'slime',
  essIron: 'slimeGolem',        // a construct with a stone core
  essArmour: 'slimeGolem',
  essCage: 'slimeGolem',
  essSmoke: 'shade',
  essLurker: 'shade',           // the Umbrathane is a humanoid shadow
  essMalign: 'demon',
  essClaw: 'raptor',
  essHunt: 'raptor',            // the roster's pack hunter
  essOctopus: 'hydra',          // many heads, many limbs -- the nearest thing
  essTentacle: 'spinosaurus',   // six arms
  essDeep: 'hydra',
  essMirror: 'chimera',         // three creatures wearing one body
  essVisage: 'chimera',
  essHunger: 'trex',
  might: 'trex',
  avatar: 'dragon',             // the biggest thing a character can become
  essZeal: 'dragon',
  // --- ROUND 285: the carnivorous plants ---------------------------------
  // "These ... can be summons as well as enemies." Bound to the essences that
  // are literally plants. Plant calls the Twinmaw, which does not move: it is
  // planted where it is called and bites whatever comes into reach. Brush and
  // Tree call the Thornlash's grasping vines; Growth calls the Bloomkin.
  essPlant: 'snapmaw',
  essBrush: 'vinegrasp',
  essTree: 'vinegrasp',
  essGrowth: 'bloomimp',
};

/** Rung 2: the family, for the essences with no creature of their own. */
export const SUMMON_CREATURE_BY_FAMILY = {
  aquatic: 'crocodile',
  serpent: 'cobra',
  beast: 'minotaur',
  smallbeast: 'direbuck',
  flyer: 'thunderbird',
  fire: 'phoenix',
  storm: 'thunderbird',
  cold: 'yeti',
  earth: 'scorpion',
  death: 'medusa',
  dark: 'medusa',
  // A firebird is as much a creature of light as of fire, and `fire` is a
  // one-essence family -- without this the phoenix would be reachable from
  // exactly one of the game's 148 essences, which is not a summon anyone
  // discovers. Same argument for the ram: `beast` already answers to the
  // minotaur, so the charging ram takes `force` (Might, Potent, Resolute,
  // Zeal), which is what a battering ram is.
  light: 'phoenix',
  force: 'hornram',
  blood: 'whitelion',
  life: 'giantToad',
  water: 'crocodile',

  // --- ROUND 79 (bug 9.1) -- THREE FAMILIES THE AUDIT FOUND EMPTY ---------
  //
  // Bug 9 was a Water x Cat summon on the placeholder, and the cause turned
  // out not to be a missing creature but a table only one of the game's three
  // summon paths was asking (see awakening.js's `bindFamiliarCreature`). While
  // in there, 54 of 148 essences answered nothing -- and three of those
  // families hold animals the game already draws.
  //
  //   guard  is Pangolin, Turtle and Shield. Three armoured things, and the
  //          Gemtusk is the roster's armoured charger.
  //   motion is Horse, Dance, Foot, Ship, Swift, Vehicle, Wheel. The raptor is
  //          the roster's runner.
  //   air    is Cloud and Wind, and the thunderbird lives in both.
  //
  // The families still deliberately empty are craft, blade, polearm, bludgeon,
  // ranged, mind, order and space -- see the note on rung 3 in the header. A
  // Paper essence summoning a hellhound because something had to be picked is
  // the failure this table was written to avoid, and the weapon essences among
  // them now summon the WEAPON instead, which is what they are.
  guard: 'boar',
  motion: 'raptor',
  air: 'thunderbird',
};

/**
 * The creature an essence calls, or null. Rungs 1 then 2 then nothing.
 *
 * ROUND 76 -- `parents` is how the CONFLUENCE gets a creature. A confluence's
 * essence id is the literal string 'confluence' for all 101 of them, so it
 * matched neither rung and its four sockets -- a quarter of every kit -- could
 * not offer a summon at all. Measured: that was the structural ceiling on
 * minion builds, holding them at five when the user asked for six to eight.
 *
 * A confluence is the thing the trio agreed on, so it inherits from them: the
 * creature its parent essences most agree on, and nothing if they do not
 * summon. A Sword/Shield/Paper confluence still calls nothing.
 */
// ============================================================================
// ROUND 121 -- THE STONE GETS ASKED FIRST.
//
// The user, on a "Star x Awakening Stone of Wolf" summon that arrived as two
// birds: "This is a very cool ability, with a very cool summon. If the
// awakening stone had been wing, bird or something bird related it would make
// a lot of sense... If this exact ability instead summoned a wolf shaded the
// same way it would be perfect."
//
// Measured: `summonCreatureFor('essStar')` is `phoenix`, and the stone was
// never consulted at all -- the resolver takes one argument and it is the
// ESSENCE. So the socket the player deliberately filled with Wolf had no vote
// in what walked out of it.
//
// This is the same rule the weapons already follow, and for the reason round
// 74 wrote down for `weaponForAffinity`: the stone is the thing the player
// chose to put in THIS socket, and the essence is what the result is made of.
// An Awakening Stone of Wolf in a Star essence is a player asking for a wolf;
// the Star is what makes it a wolf of light.
//
// Coverage, measured over all 192 stones: 46 name-match an essence with a
// creature of its own, 82 more resolve through their catalogue family, and 64
// have none and fall through to the essence exactly as before.
export function summonCreatureForSocket(stoneId, essId, parents = null) {
  if (stoneId) {
    // `stoneWolf` -> `essWolf`: the essence and the stone of a thing share a
    // name, which is why WEAPON_BY_IDENTITY is keyed by name too.
    const twin = stoneId.startsWith('stone') ? 'ess' + stoneId.slice(5) : null;
    if (twin && SUMMON_CREATURE_BY_ESSENCE[twin]) return SUMMON_CREATURE_BY_ESSENCE[twin];
    const row = STONE_CATALOG[stoneId];
    if (row && SUMMON_CREATURE_BY_FAMILY[row.family]) return SUMMON_CREATURE_BY_FAMILY[row.family];
  }
  return summonCreatureFor(essId, parents);
}

export function summonCreatureFor(essId, parents = null) {
  if (essId === 'confluence' && parents && parents.length) {
    const votes = {};
    for (const pid of parents) {
      const f = summonCreatureFor(pid);
      if (f) votes[f] = (votes[f] || 0) + 1;
    }
    const best = Object.entries(votes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return best ? best[0] : null;
  }
  if (!essId) return null;
  const exact = SUMMON_CREATURE_BY_ESSENCE[essId];
  if (exact) return exact;
  const def = ESSENCE_CATALOG[essId];
  return (def && SUMMON_CREATURE_BY_FAMILY[def.family]) || null;
}

/**
 * How a summoned creature of this family behaves, derived from the WILD one.
 *
 * The base `creature` summon kind (activeSummons.js) is the average: 1.0
 * damage, 1.1s between strikes, 46 reach, 78 speed. A family scales off that
 * by how it compares to the roster's own middle, so the summon inherits the
 * monster's character without inheriting its absolute numbers -- a summoned
 * thunderbird should feel like a thunderbird, not hit for 33.
 *
 * MIDPOINTS are computed from the roster rather than written down, so they
 * cannot go stale when a family is added or rebalanced.
 */
const CREATURE_MID = (() => {
  const rows = Object.values(MONSTER_FAMILY_BASE);
  const mid = (f) => {
    const xs = rows.map(f).sort((a, b) => a - b);
    return xs[Math.floor(xs.length / 2)];
  };
  return { dmg: mid((r) => r.dmg), speed: mid((r) => r.speed), hp: mid((r) => r.hp) };
})();

export function summonCreatureProfile(family) {
  const base = MONSTER_FAMILY_BASE[family];
  const art = MONSTER_ART[family];
  if (!base || !art) return null;
  const k = SUMMON_KINDS.creature;
  // Compressed with a square root: a thunderbird hits 5.5x a scorpion in the
  // wild, and a summon roster with a 5.5x damage spread would have one correct
  // answer and twelve wrong ones. The root keeps the ORDER -- a thunderbird is
  // still the hardest hitter -- inside a 2.3x spread that leaves a scorpion
  // worth summoning.
  const dmgMult = Math.round(Math.sqrt(base.dmg / CREATURE_MID.dmg) * 100) / 100;
  // ROUND 285 -- A ROOTED PLANT. Its cadence cannot come off a speed of 0
  // (that is a division by zero and an `interval` of Infinity); it bites at
  // the roster's middle cadence, and its reach is added to its range.
  const rooted = !!base.rooted;
  const speed = rooted ? 0 : Math.round(k.speed * Math.sqrt(base.speed / CREATURE_MID.speed));
  return {
    family,
    name: FAMILY_DISPLAY_NAME[family] || family,
    dmgMult,
    speed,
    ...(rooted ? { rooted: true } : {}),
    // Reach and cadence follow the creature's own body: a crocodile lunges
    // slowly from close, a mantis strikes fast, a thunderbird works at range.
    interval: rooted ? k.interval
      : Math.round(k.interval * (CREATURE_MID.speed / base.speed) * 100) / 100,
    range: Math.round(k.range * (0.7 + 0.6 * (art.cell / 100))) + (base.reach || 0),
    element: base.dmgType === 'magical' ? 'magical' : null,
  };
}

/** Every family that can be summoned, with its profile. */
export const SUMMON_CREATURES = (() => {
  const seen = new Set([
    ...Object.values(SUMMON_CREATURE_BY_ESSENCE),
    ...Object.values(SUMMON_CREATURE_BY_FAMILY),
  ]);
  const out = {};
  for (const f of seen) {
    const p = summonCreatureProfile(f);
    if (p) out[f] = p;
  }
  return out;
})();

/** The thirteen, in roster order -- for tests and the bestiary. */
export const SUMMON_CREATURE_KEYS = Object.keys(SUMMON_CREATURES).sort();

/**
 * Families with art that NOTHING can summon. Empty is the intended state; a
 * non-empty list means a creature was added to the art and forgotten here,
 * which is silent (it still spawns as a wild monster) and so has to be
 * asserted rather than noticed.
 */
export const SUMMON_CREATURE_GAPS = (() => {
  const ROUND75 = ['scorpion', 'direbuck', 'hornram', 'giantToad', 'cobra', 'mantis',
    'crocodile', 'whitelion', 'medusa', 'yeti', 'minotaur', 'phoenix', 'thunderbird'];
  return ROUND75.filter((f) => !SUMMON_CREATURES[f]);
})();

// ===========================================================================
// ROUND 207 -- THE ANIMAL WORDS THAT MAY NAME EACH FAMILY.
//
// Round 204 flagged it and it went unfixed for three rounds: "Call the Bee
// summons a lizard". Re-measured this round against the FAMILY rather than the
// creature's invented name -- which matters, because "Wolf Calls summons a
// Panterimp" is correct (a Panterimp is the wolf-family creature) and the
// first census counted it as a fault. The honest figure is 16 of 788 bonded
// familiars, 2.0%, naming an animal the family is not:
//
//   Bear Rear     -> minotaur     Rat Calls   -> direbuck
//   Goat Snare    -> hellhound    Hydra Multiply -> direbuck
//   Armour Bear   -> slimeGolem
//
// The map is family -> the words that may honestly name it, so a cobra may be
// called a snake and a hornram a ram, and neither counts against the rule.
// Same shape as `RELIC_WEAPON_NOUNS` in awakening.js, which has been doing
// this job for weapons since round 79.
//
// A family absent from this map is unconstrained: it means nobody has decided
// what may name it, and silence is the right answer to that rather than a
// guess. `summonCreatureFaults` reports the gap so it stays visible.
// ===========================================================================
export const CREATURE_NOUNS = {
  wolf: ['wolf', 'hound', 'dog'],
  hellhound: ['hound', 'dog', 'wolf', 'cerberus'],
  whitelion: ['lion', 'cat', 'panther'],
  direbuck: ['buck', 'deer', 'stag', 'hart'],
  hornram: ['ram', 'goat', 'horn'],
  minotaur: ['minotaur', 'bull', 'ox'],
  boar: ['boar', 'pig', 'tusk'],
  bat: ['bat'],
  cobra: ['cobra', 'snake', 'serpent', 'asp'],
  spider: ['spider', 'arachnid', 'web'],
  scorpion: ['scorpion', 'sting'],
  mantis: ['mantis'],
  lizard: ['lizard', 'skink'],
  crocodile: ['crocodile', 'croc', 'alligator'],
  giantToad: ['toad', 'frog'],
  spinosaurus: ['spinosaur', 'saurian'],
  raptor: ['raptor', 'claw'],
  trex: ['rex', 'tyrant', 'saurian'],
  hydra: ['hydra'],
  dragon: ['dragon', 'drake', 'wyrm'],
  chimera: ['chimera'],
  medusa: ['medusa', 'gorgon', 'snake'],
  phoenix: ['phoenix', 'firebird'],
  thunderbird: ['thunderbird', 'roc', 'bird'],
  yeti: ['yeti', 'ape'],
  skeleton: ['skeleton', 'bone'],
  shade: ['shade', 'shadow', 'wraith'],
  demon: ['demon', 'fiend', 'imp'],
  elemental: ['elemental'],
  slime: ['slime', 'ooze'],
  slimeGolem: ['slime', 'golem', 'ooze'],
  // ROUND 285 -- the carnivorous plants.
  // Only words no other family's names use, so adding them flags nothing
  // that was fine before: "thorn" or "vine" in a hound's name is not a lie.
  bloomimp: ['imp', 'bloomkin'],
  snapmaw: ['flytrap', 'twinmaw'],
  vinegrasp: ['thornlash'],
};

/**
 * Animals that appear in ability names and that NO creature family answers to.
 *
 * Without this the rule is blind to the fault it was written for. "Call the
 * Bee" bonds a lizard, and `bee` is in no family's allowed list -- so a rule
 * built only from `CREATURE_NOUNS` could not see the word at all and returned
 * "this name is fine", which is the same silent pass the round-205 identity
 * strip was making. Measured: `bear`, `rat` and `bee` were every one of them
 * invisible.
 *
 * These are words that MEAN an animal and that no family may claim, so finding
 * one in a familiar's name is always wrong.
 */
export const LOOSE_BEASTS = ['bee', 'wasp', 'locust', 'bear', 'rat', 'mouse',
  'rabbit', 'fox', 'skunk', 'flea', 'monkey', 'cattle', 'sloth', 'duck',
  'chicken', 'shark', 'whale', 'manatee', 'octopus', 'fish', 'coral',
  'tentacle', 'horse', 'pangolin', 'turtle', 'cage'];

/** Every animal word the naming rule knows, as one alternation. A word not in
 *  here is not judged at all -- the rule only fires on words it can resolve. */
export const CREATURE_WORDS = [...new Set([
  ...Object.values(CREATURE_NOUNS).flat(), ...LOOSE_BEASTS,
])];

/** True when the name promises an animal that is NOT the family being bonded.
 *  Silent when the name names no animal, or there is no family. */
export function namePromisesWrongBeast(name, family) {
  if (!name || !family) return false;
  const allowed = CREATURE_NOUNS[family];
  if (!allowed) return false;          // nobody has ruled on this family
  const n = String(name).toLowerCase();
  for (const w of CREATURE_WORDS) {
    if (!new RegExp(`\\b${w}s?\\b`, 'i').test(n)) continue;
    if (!allowed.includes(w)) return true;
  }
  return false;
}
