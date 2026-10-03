// ============================================================================
// ROUND 200 -- MOUNTS.
//
// The user's item, in full, because every number below is one of its lines:
//
//   "2) New abilities: Mount abilities
//    2.1) These can be a later tier (bronze or higher) of a permanent summon.
//         In it's most basic form it's just a flat 100% movement speed increase
//         (maximum 200% movement speed increase)
//    2.2) Mounts may be able to cross water, cross lava, sense enemies, sense
//         treasure, be more resistant to attacks, or other bonuses while mounted
//    2.4) These are all created from existing monster models, ensure that all
//         color variations exist as mounts as well.
//    2.5) Mounts are not a required piece of every kit, but should be an option.
//    2.6) No kit should have multiple mount abilities
//    2.7) For a normal mount the player gains a 30% dodge bonus while mounted,
//         however if hit while mounted the player is 'dismounted' and forced
//         into combat. Players cannot mount in combat and even once combat ends
//         it takes 10 seconds before they can mount.
//    2.8) Mounts are currently not for the overworld map."
//
// ---------------------------------------------------------------------------
// A MOUNT IS NOT A NEW ABILITY. THAT IS THE WHOLE DESIGN.
//
// 2.1 says "a later tier of a permanent summon", and this game already has a
// permanent summon -- `summonBonded`, the bonded familiar -- and already has a
// shape for "this ability gains something at bronze": WATER_WALK_RIDERS, whose
// own note says two abilities that grow with rank should grow at the same three
// ranks or the player carries two mental models. So a mount is a bonded
// familiar that can be ridden from Bronze, and MOUNT_RIDERS below is the same
// table in the same shape at the same three ranks.
//
// No new atom, no new template, no second summon system. What IS new is one
// flag on the spec -- `mount` -- and the three things that read it.
//
// WHY NOT EVERY FAMILIAR. Two reasons, and they agree:
//
//   2.5 says a mount is an option rather than a fixture, so some bonded
//   familiars have to stay familiars.
//
//   There are pictures of thirteen creatures being ridden and ninety-odd
//   creatures in the game. A kit that promised a ridden slime would have to
//   draw one. `MOUNTABLE` is therefore exactly the thirteen the art exists for,
//   which is an honest gate rather than a balance one -- and it is read off
//   MOUNT_ART rather than listed twice, so importing a fourteenth pack makes it
//   rideable and nothing here has to be told.
//
// ---------------------------------------------------------------------------
// WHAT A MOUNT CAN DO IS WHAT THE CREATURE IS.
//
// 2.2 lists six powers and says "or other bonuses". Handing them out at random
// would make a phoenix and a boar interchangeable; the list is instead read off
// what the roster ALREADY says about each creature. A phoenix is in
// AIRBORNE_FAMILIES, so it crosses water and lava because it is not touching
// either. A toad crosses water because it is a toad. A hellhound walks out of
// Cinder. The two heaviest things on the list are the two that shrug off a
// blow. Nothing here is a new fact about a creature -- it is the fact the
// bestiary already carries, spent.
// ============================================================================

import { MOUNT_ART, MOUNT_FAMILIES } from './mountArt.js';
import { RANK_ORDER } from './ranks.js';
import { AIRBORNE_FAMILIES, FAMILY_DISPLAY_NAME } from './monsters.js';

/** The rank a familiar first becomes rideable at. 2.1, verbatim. */
export const MOUNT_MIN_RANK = 'bronze';

/** 2.1: "a flat 100% movement speed increase (maximum 200%)". Bronze pays the
 *  flat one; the ceiling is reached at Gold, which is where every other
 *  rank-ridered ability in this game tops out. Stated as a MULTIPLIER of the
 *  player's speed, so +1.00 is "twice as fast". */
export const MOUNT_SPEED_BY_RANK = { bronze: 1.00, silver: 1.50, gold: 2.00 };
export const MOUNT_SPEED_MAX = 2.00;

/** 2.7, verbatim: thirty per cent, and a hit takes you off. */
export const MOUNT_DODGE = 0.30;

/** 2.7: "even once combat ends it takes 10 seconds before they can mount." */
export const MOUNT_COMBAT_QUIET_S = 10;

/** How much of a blow a heavy mount eats, for the families that get `tough`.
 *  A fraction of incoming damage, not a flat number, so it stays worth having
 *  against a gold-rank monster. */
export const MOUNT_TOUGH_CUT = 0.25;

/** How far a sensing mount reaches, in world units. Deliberately shorter than
 *  the perception passive's own ranges: a mount is a second pair of eyes, not
 *  a replacement for the ability whose whole job this is. */
export const MOUNT_SENSE_RANGE = 640;

// ---------------------------------------------------------------------------
// THE TRAITS, AND WHICH CREATURE HAS WHICH.
//
// `water` / `lava` are the two that change where you can go, so they are the
// two that had to be checked against what already exists: round 177's water
// walking opens water and leaves lava shut, deliberately, and a mount that
// crossed lava without that being said out loud would be the same bug from the
// other side. They are separate traits here for the same reason.
// ---------------------------------------------------------------------------
export const MOUNT_TRAITS = {
  water: { key: 'water', label: 'crosses water', text: 'it will carry you over open water' },
  lava: { key: 'lava', label: 'crosses lava', text: 'and over a flow without slowing' },
  enemies: { key: 'enemies', label: 'senses enemies', text: 'it knows what is waiting before you do' },
  treasure: { key: 'treasure', label: 'senses treasure', text: 'and it knows what is worth stopping for' },
  tough: { key: 'tough', label: 'takes the blow', text: 'it takes the worst of what lands' },
};

/**
 * Per family, the two traits it earns -- the first at Silver, the second at
 * Gold. Read against the roster rather than assigned: anything in
 * AIRBORNE_FAMILIES gets both crossings, because a thing in the air is over
 * both; the rest are what the creature plainly is.
 */
function traitsFor(family) {
  if (AIRBORNE_FAMILIES && AIRBORNE_FAMILIES.has && AIRBORNE_FAMILIES.has(family)) {
    return ['water', 'lava'];
  }
  return ({
    giantToad: ['water', 'enemies'],      // amphibian first, and it sits watching
    hydra: ['water', 'tough'],            // it lives in the water and it is enormous
    hellhound: ['lava', 'enemies'],       // it comes out of Cinder and it hunts
    glasscat: ['treasure', 'enemies'],    // a creature made of crystal knows crystal
    boar: ['treasure', 'water'],          // it roots things up
    demonsloth: ['tough', 'lava'],        // the heaviest thing on the list
    spinosaurus: ['tough', 'water'],      // the second heaviest, and it wades
    mantis: ['enemies', 'treasure'],      // it is the one that sees
    raptor: ['enemies', 'water'],         // pack hunter
    hornram: ['tough', 'treasure'],       // it goes through things
    direbuck: ['enemies', 'water'],       // it startles first
  })[family] || ['enemies', 'water'];
}

/** The rider table, in WATER_WALK_RIDERS' own shape and at its own three
 *  ranks. Bronze is the mount itself; Silver and Gold are the creature. */
export function mountRidersAt(family, rank) {
  const at = RANK_ORDER.indexOf(rank);
  if (at < RANK_ORDER.indexOf(MOUNT_MIN_RANK)) return [];
  const [a, b] = traitsFor(family);
  const out = [{ rank: 'bronze', trait: null, text: 'you can ride it' }];
  if (at >= RANK_ORDER.indexOf('silver')) out.push({ rank: 'silver', trait: a, ...MOUNT_TRAITS[a] });
  if (at >= RANK_ORDER.indexOf('gold')) out.push({ rank: 'gold', trait: b, ...MOUNT_TRAITS[b] });
  return out;
}

/** Everything the runtime needs to know about riding this ability right now.
 *  One call, so no caller has to remember the rank comparison. */
export function mountStateFor(ability, rank) {
  const family = ability && (ability.mountFamily || ability.familiarFamily);
  if (!ability || !ability.mount || !family || !MOUNT_ART[family]) return null;
  const at = RANK_ORDER.indexOf(rank);
  if (at < RANK_ORDER.indexOf(MOUNT_MIN_RANK)) return null;
  const riders = mountRidersAt(family, rank);
  const traits = new Set(riders.map(r => r.trait).filter(Boolean));
  return {
    family,
    art: MOUNT_ART[family],
    // Below Bronze there is no mount at all, so the table is only ever read at
    // bronze/silver/gold and the fallback is the floor rather than zero.
    speedPct: MOUNT_SPEED_BY_RANK[rank] !== undefined
      ? MOUNT_SPEED_BY_RANK[rank] : MOUNT_SPEED_BY_RANK.bronze,
    dodge: MOUNT_DODGE,
    traits,
    riders,
    label: MOUNT_ART[family].label || FAMILY_DISPLAY_NAME[family] || family,
  };
}

/** Which creatures can be ridden: exactly the ones there is art of. Read off
 *  MOUNT_ART so a fourteenth pack needs no edit here. */
export const MOUNTABLE = new Set(MOUNT_FAMILIES);
export function isMountable(family) { return MOUNTABLE.has(family); }

/** 2.6, as a number the kit builder can hold. See awakening.js, where
 *  WATER_WALK_CAP already says the same thing about the same kind of power:
 *  a second copy of a binary capability is a wasted socket. */
export const MOUNT_CAP = 1;

/**
 * 2.5 -- "not a required piece of every kit, but should be an option".
 *
 * How often a bonded familiar of a rideable creature comes out rideable.
 * Seeded off the ability's own key at generation, so it is a property of the
 * ability rather than a coin flipped each time the kit is rebuilt -- a mount
 * that appeared and vanished between two openings of the panel would read as
 * a bug and would also make MOUNT_CAP meaningless.
 *
 * A third: high enough that a player who wants one and has the essences for it
 * will see one, low enough that the bonded familiar stays what it was.
 */
export const MOUNT_CHANCE = 1 / 3;

export function mountFaults() {
  const out = [];
  for (const f of MOUNT_FAMILIES) {
    const a = MOUNT_ART[f];
    if (!a) { out.push(`${f} is in MOUNT_FAMILIES with no art`); continue; }
    if (!(a.cell > 0) || !(a.runFrames > 0)) out.push(`${f}: cell ${a.cell} frames ${a.runFrames}`);
    if (!Array.isArray(a.shades) || !a.shades.length) out.push(`${f} has no shades`);
    const [x, y] = traitsFor(f);
    if (!MOUNT_TRAITS[x] || !MOUNT_TRAITS[y]) out.push(`${f} claims trait ${x}/${y}`);
    if (x === y) out.push(`${f} has the same trait twice`);
    // Every mount is rideable at bronze and no earlier, and gains exactly one
    // thing at each of the two ranks above -- the promise MOUNT_RIDERS makes.
    if (mountRidersAt(f, 'iron').length) out.push(`${f} is rideable below bronze`);
    for (const [rank, n] of [['bronze', 1], ['silver', 2], ['gold', 3]]) {
      const got = mountRidersAt(f, rank).length;
      if (got !== n) out.push(`${f} at ${rank}: ${got} riders, expected ${n}`);
    }
  }
  const speeds = Object.values(MOUNT_SPEED_BY_RANK);
  if (Math.max(...speeds) !== MOUNT_SPEED_MAX) out.push('the speed table does not reach the stated ceiling');
  if (Math.min(...speeds) !== 1.00) out.push('the speed table does not start at the stated +100%');
  for (let i = 1; i < speeds.length; i++) if (speeds[i] <= speeds[i - 1]) out.push('speed does not climb with rank');
  return out;
}
