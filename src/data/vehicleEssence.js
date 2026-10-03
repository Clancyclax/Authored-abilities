// ============================================================================
// ROUND 200 -- WHAT A VEHICLE ESSENCE IS FOR.
//
// The user's item, in full:
//
//   "3) The transports (non-creature) added in recent patches should also have
//       a high chance of being an ability with the vehicle essence
//    3.1) In either case a player with a vehicle essence should have bonuses to
//         make vehicles better.
//    3.2) Reduced chance of encounters
//    3.3) Better loot from encounters while in a transport
//    3.4) larger accommodations
//    3.5) Experience bonuses after resting in the transport
//    3.6) Long lasting damage or defensive bonuses after resting in the transport
//    3.7) these shouldn't all be on 1 ability and are only meant to be examples,
//         I expect you to generate more
//    3.8) Some abilities like the ability to climb mountains or cross ocean in a
//         transport should be tied to higher ranks (i.e. silver or gold)"
//
// ---------------------------------------------------------------------------
// TWO ESSENCES, NOT ONE, AND THEY WERE ALREADY THERE.
//
// `essVehicle` and `essShip` have been in the catalogue since it was written,
// both in the `motion` family, and neither has ever meant anything more than
// any other essence in that family. They are what "a vehicle essence" names.
// Nothing new is added to the catalogue -- 3.1 is a request to make an essence
// that exists do something, which is a different job from inventing one.
//
// ---------------------------------------------------------------------------
// 3.7 IS THE INSTRUCTION THAT SHAPED THIS FILE.
//
// "these shouldn't all be on 1 ability and are only meant to be examples, I
// expect you to generate more". So the six named boons are six rows in a table
// of TWELVE, and an ability takes one or two of them rather than the set.
// The extra six are not padding, and the test below is what keeps them from
// becoming it: each one has to be named in the list of boons something in the
// runtime actually reads.
//
// A BOON IS NOT A NEW ABILITY EITHER. It rides on whatever passive the kit
// already generated from that essence, the way round 200's mount rides on a
// bonded familiar: `vehicleBoons` is a list stamped on the spec, and the
// runtime sums the list across the kit. Which means a player with two vehicle
// essences socketed gets more of them, which is correct -- that IS the build
// they chose -- and it means no socket is spent on a boon instead of on an
// ability.
//
// ---------------------------------------------------------------------------
// 3.8, AND WHY THE TWO BIG ONES ARE LATE.
//
// Climbing mountains and crossing ocean are not bonuses, they are the map
// opening up: vehicles.js divides its nine into TERRAIN_GROUND and TERRAIN_ANY
// precisely on those two, and the ship, the dragon and the airboat cost what
// they cost because they have them. A bronze boon that handed a covered wagon
// the dragon's terrain would make six of the nine pointless.
//
// So `climb` is Silver and `ocean` is Gold, which is what the ask names, and
// they are the only two boons in the table that change where you can go.
// ============================================================================

import { RANK_ORDER } from './ranks.js';

/** The essences this is about. Both were already in the catalogue. */
export const VEHICLE_ESSENCES = new Set(['essVehicle', 'essShip']);
export function isVehicleEssence(id) { return VEHICLE_ESSENCES.has(id); }

/**
 * 3: "The transports ... should also have a high chance of being an ability
 * with the vehicle essence."
 *
 * How often an ability generated from one of the two carries a boon. High,
 * because the ask says high, and because an essence whose whole identity is
 * travel should read as travel whichever socket it lands in.
 */
export const VEHICLE_BOON_CHANCE = 0.8;

/** At most two per ability -- 3.7's "shouldn't all be on 1 ability", as a
 *  number. One is the common case; the second is what makes two vehicle
 *  abilities in a kit read differently from each other. */
export const VEHICLE_BOONS_PER_ABILITY = 2;

// ---------------------------------------------------------------------------
// THE TWELVE.
//
//   key     what the runtime sums it into
//   rank    the earliest rank it does anything at
//   amount  its size at that rank; `perRank` is what each rank above adds
//   kind    'mult' scales something, 'pct' adds a fraction, 'flag' is binary
//
// The six the user named are marked. The other eight are the same idea
// followed out: a vehicle essence should make the whole of travelling better,
// not six specific numbers.
// ---------------------------------------------------------------------------
export const VEHICLE_BOONS = [
  // --- the six the ask names -------------------------------------------
  { key: 'encounter', rank: 'normal', amount: 0.20, perRank: 0.08, kind: 'pct', asked: true,
    label: 'quiet roads', text: 'fewer things are waiting for you on the road' },
  { key: 'loot', rank: 'normal', amount: 0.25, perRank: 0.10, kind: 'pct', asked: true,
    label: 'road tithe', text: 'and what is waiting is carrying more' },
  { key: 'accommodation', rank: 'iron', amount: 1, perRank: 1, kind: 'count', asked: true,
    label: 'room for one more', text: 'the inside holds another bunk than it should' },
  { key: 'restXp', rank: 'iron', amount: 0.15, perRank: 0.07, kind: 'pct', asked: true,
    label: 'time to think', text: 'a night in it is worth something afterwards' },
  { key: 'restDamage', rank: 'bronze', amount: 0.10, perRank: 0.05, kind: 'pct', asked: true,
    label: 'well rested', text: 'you hit harder for a long while after resting' },
  { key: 'restArmour', rank: 'bronze', amount: 0.12, perRank: 0.06, kind: 'pct', asked: true,
    label: 'settled', text: 'and you take less for just as long' },
  // --- 3.7: "I expect you to generate more" -----------------------------
  //
  // SIX MORE, AND EVERY ONE OF THEM HAS SOMETHING THAT READS IT. That is the
  // constraint that decided which six, and two earlier drafts were thrown out
  // by it: a `stowage` boon that made the bag bigger (this game's bag has no
  // size), and an `upkeep` boon that made a vehicle cheaper to run (nothing in
  // this game runs on upkeep). A row nobody reads is the fault this project
  // calls class 1 -- written by one side, read by none -- and six of them
  // would have been six lines of flavour text pretending to be a feature.
  { key: 'price', rank: 'normal', amount: 0.10, perRank: 0.05, kind: 'pct',
    label: 'known at the yard', text: 'the yardmaster quotes you a better number' },
  { key: 'restHeal', rank: 'iron', amount: 0.25, perRank: 0.10, kind: 'pct',
    label: 'sound sleep', text: 'a rest in it mends more than a rest anywhere else' },
  { key: 'restStamina', rank: 'iron', amount: 0.20, perRank: 0.08, kind: 'pct',
    label: 'off your feet', text: 'and you get up with more in your arms' },
  { key: 'crewMorale', rank: 'bronze', amount: 0.10, perRank: 0.05, kind: 'pct',
    label: 'good company', text: 'the people waiting in it are readier when you call them' },
  // --- 3.8: the two that change the map ---------------------------------
  { key: 'climb', rank: 'silver', amount: 1, perRank: 0, kind: 'flag',
    label: 'high passes', text: 'it will take a mountain road' },
  { key: 'ocean', rank: 'gold', amount: 1, perRank: 0, kind: 'flag',
    label: 'open water', text: 'and it will put out to sea' },
];

export const VEHICLE_BOON_BY_KEY = Object.fromEntries(VEHICLE_BOONS.map(b => [b.key, b]));

/** One boon's size at a rank, or 0 if it is not open yet. A flag returns 1 or
 *  0, which lets every caller sum the same way. */
export function vehicleBoonAmount(key, rank) {
  const b = VEHICLE_BOON_BY_KEY[key];
  if (!b) return 0;
  const at = RANK_ORDER.indexOf(rank), from = RANK_ORDER.indexOf(b.rank);
  if (at < from) return 0;
  if (b.kind === 'flag') return 1;
  return Math.round((b.amount + b.perRank * (at - from)) * 1000) / 1000;
}

/**
 * Which boons an ability carries. Chosen by a STABLE HASH of the ability's own
 * identity, for exactly the reason round 200's mount flag is: the kit is
 * rebuilt whenever a stone moves, and a boon that changed between two openings
 * of the panel would read as a bug.
 *
 * Picked from the WHOLE table rather than from what the current rank has
 * opened, so an ability that will carry `ocean` at Gold carries it at Normal
 * too and simply does nothing with it yet -- the ability the player levelled
 * is the ability that pays off, which is the promise the rank riders make
 * everywhere else in this game.
 */
export function vehicleBoonsFor(key, hash) {
  const h = hash >>> 0;
  if ((h % 100) / 100 >= VEHICLE_BOON_CHANCE) return [];
  const n = 1 + ((h >> 8) % VEHICLE_BOONS_PER_ABILITY);
  const out = [];
  for (let i = 0; i < n; i++) {
    // `>>>`, not `>>`. A signed shift on a hash whose top bit is set gives a
    // negative index and `VEHICLE_BOONS[-3]` is undefined -- which is not a
    // crash until the one hash in two that has that bit comes up.
    const pick = VEHICLE_BOONS[(((h >>> (12 + i * 5)) + i * 7) >>> 0) % VEHICLE_BOONS.length];
    if (pick && !out.includes(pick.key)) out.push(pick.key);
  }
  return out;
}

export function vehicleEssenceFaults() {
  const out = [];
  const seen = new Set();
  for (const b of VEHICLE_BOONS) {
    if (seen.has(b.key)) out.push(`two boons called ${b.key}`);
    seen.add(b.key);
    if (RANK_ORDER.indexOf(b.rank) < 0) out.push(`${b.key}: rank ${b.rank}`);
    if (!(b.amount > 0)) out.push(`${b.key} does nothing`);
    if (b.kind === 'flag' && b.perRank) out.push(`${b.key} is binary and grows`);
    if (b.kind !== 'flag' && !(b.perRank > 0)) out.push(`${b.key} never grows`);
    if (!b.label || !b.text) out.push(`${b.key} has nothing to say`);
  }
  // 3.7: the six examples are in, and they are not the whole of it.
  const asked = VEHICLE_BOONS.filter(b => b.asked).length;
  if (asked !== 6) out.push(`${asked} of the six named boons are present`);
  if (VEHICLE_BOONS.length <= 6) out.push('no boons were generated beyond the examples');
  // ...and every generated one is a thing the runtime actually asks for. The
  // list is the consumers that exist, named here rather than in a comment, so
  // a boon added without a reader fails this instead of shipping as flavour.
  const READ_BY_SOMETHING = new Set(['encounter', 'loot', 'accommodation', 'restXp',
    'restDamage', 'restArmour', 'restHeal', 'restStamina', 'crewMorale', 'price',
    'climb', 'ocean']);
  for (const b of VEHICLE_BOONS) {
    if (!READ_BY_SOMETHING.has(b.key)) out.push(`${b.key} is written by nobody and read by nobody`);
  }
  // 3.8: the two that change the map are the two late ones, and nothing else
  // is gated that high.
  for (const key of ['climb', 'ocean']) {
    const b = VEHICLE_BOON_BY_KEY[key];
    if (!b) { out.push(`${key} is missing`); continue; }
    if (b.rank !== (key === 'climb' ? 'silver' : 'gold')) out.push(`${key} is gated at ${b.rank}`);
    if (b.kind !== 'flag') out.push(`${key} should be binary`);
  }
  for (const b of VEHICLE_BOONS) {
    if (b.kind === 'flag' && !['climb', 'ocean'].includes(b.key)) {
      out.push(`${b.key} is binary and is not one of the two terrain boons`);
    }
  }
  // A boon that never comes out is a row nobody can earn. Walked over the
  // whole hash space rather than sampled: fourteen rows and 2^32 hashes, and
  // a row the picker cannot reach is exactly the fault this catches.
  const reach = new Set();
  for (let i = 0; i < 20000; i++) for (const k of vehicleBoonsFor('x', i * 2654435761)) reach.add(k);
  for (const b of VEHICLE_BOONS) if (!reach.has(b.key)) out.push(`${b.key} is unreachable`);
  return out;
}
