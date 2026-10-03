// ===========================================================================
// ROUND 223 -- A VEHICLE ESSENCE GIVES YOU A VEHICLE.
//
// The user, on a vehicle-essence kit:
//
//   1    "The first ability should always be a vehicle."
//   1.1  "Other abilities should apply to the vehicle."
//   1.2  "You should be able to ride it in any outdoor environment."
//   1.4  "Most abilities should trigger while in the vehicle."
//   4    "Summon heavy truck should have been the vehicle summon."
//   4.1  cow-themed upgrades -- "Grazer: self-repair in grass", "Auroch:
//        immune to slows"
//   4.2  "Map animal patterns onto vehicles so animal awakening stones spawn
//        specific vehicles" -- leopard, cow, giraffe, lion, wolf, snake,
//        lizard, frog, bat, "and the rest"
//
// ---------------------------------------------------------------------------
// WHAT WAS ALREADY THERE, AND WHY IT DID NOT ADD UP TO A VEHICLE.
//
// Round 196 built NINE VEHICLES -- art, move cycles, terrain, interiors,
// prices -- as things you BUY from a vendor. Round 200 built MOUNTS, as
// bonded familiars you can ride from bronze, and in the same round gave the
// vehicle essence a table of twelve BOONS: cheaper vehicles, fewer ambushes,
// better loot, rest bonuses. Every one of those is a discount on somebody
// else's vehicle.
//
// So a player who took the vehicle essence got a coupon. The essence about
// vehicles was the one essence in the game whose abilities did not give you
// the thing it was about -- and item 4 is the user noticing the shape of the
// hole from the other side: an ability called "Summon heavy truck" existed
// in the generated pool as an ordinary creature summon, because the
// generator had a summon category and a vehicle vocabulary and no idea the
// two were the same sentence.
//
// This file is the join. A vehicle becomes a thing a kit can OFFER and a
// player can RIDE, through the mount runtime that already exists -- round
// 200's `mods.mount`, `_mountUp`, `_mountSpeedMult`, `_mountCrosses` and the
// sprite branch are untouched, and a vehicle simply presents the same shape
// a rideable familiar does. Writing a second riding system beside the first
// one was the other option, and it is the fault this project keeps finding.
// ===========================================================================

import { VEHICLES, TERRAIN_ANY } from './vehicles.js';
import { RANK_ORDER } from './ranks.js';

/** Vehicle rows by id, so nothing below re-scans the list. */
export const VEHICLE_BY_ID = Object.fromEntries(VEHICLES.map(v => [v.id, v]));

// ---------------------------------------------------------------------------
// ROUND 224 -- WHAT A VEHICLE IS THAT A MOUNT IS NOT.
//
// The user, on the difference:
//
//   "Vehicles you get from the Vehicle Essence will get a health pool, and
//    can be used in combat, and can be shielded. The vehicle essence should
//    generate abilities to 'repair' the vehicle but normally cant be healed.
//    It should also be immune to curses, bleeds, poisons, as its not a living
//    thing. Alternatively some essence abilities or awakening stones (such as
//    flesh or blood) might grant abilities to make the vehicle semi organic
//    allowing healing."
//
// Four rules, and they are one design: a vehicle is a BODY YOU DO NOT HEAL.
// Round 223 gave it a soak -- a flat discount on what reached you -- and that
// was the cheap version of this. A discount cannot be spent, cannot run out,
// and cannot be repaired, so it could not be any of the things he is asking
// for. A pool can.
//
// THE IMMUNITY AND ITS COUNTER ARRIVE TOGETHER. He sent [Haemorrhage] in the
// same message, whose silver rung is [Blood From a Stone] -- "negates
// immunity to blood and poison effects. This includes intrinsic immunities,
// such as from not having a biology or corporeal form." A blanket immunity
// with no counter is a wall rather than a rule, and the counter was in the
// same breath as the rule.
// ---------------------------------------------------------------------------

/** What a vehicle is born immune to, because it is not alive. The user's
 *  three (curses, bleeds, poisons) plus `wounding`, which is the tag a bleed
 *  actually carries -- naming only `blood` would leave a wounding effect with
 *  no blood tag landing on a wagon.
 *
 *  Deliberately NOT `SUBTYPE_IMMUNE_TAGS.mechanical`, which is the right list
 *  for a clockwork MONSTER and is missing `curse`. Changing that row to suit
 *  a vehicle would quietly re-balance every mechanical creature in the game. */
export const VEHICLE_IMMUNE_TAGS = ['blood', 'wounding', 'poison', 'curse'];

/** ...and the stones that trade it away. "Some essence abilities or awakening
 *  stones (such as flesh or blood) might grant abilities to make the vehicle
 *  semi organic allowing healing" -- so a semi-organic vehicle CAN be healed
 *  and CAN be bled, which is a real trade rather than a free upgrade. */
export const ORGANIC_WORDS = new Set(['Flesh', 'Blood', 'Bone', 'Sinew', 'Heart', 'Vein']);
export const ORGANIC_FAMILIES = new Set(['blood', 'life']);
export function makesOrganic(stone) {
  if (!stone) return false;
  const w = stone.name || stone.word || '';
  return ORGANIC_WORDS.has(w) || ORGANIC_FAMILIES.has(stone.family);
}

/** A vehicle's own health, by rank. It is a body in a fight now, so it is
 *  priced like one: enough to matter, not enough to be a second character. */
export const VEHICLE_HP_BY_RANK = { iron: 60, bronze: 110, silver: 180, gold: 280 };

/** How much of a blow meant for the rider the vehicle takes INTO ITS POOL.
 *  Round 223's `soak` was a discount that vanished into nothing; this is the
 *  same fraction, spent out of a tank that can be emptied and repaired. */
export const VEHICLE_BASE_SOAK = 0.35;

/** A vehicle is rideable from the first rank. Deliberately NOT round 200's
 *  `MOUNT_MIN_RANK` of bronze: a familiar has to GROW into being rideable
 *  because it is a creature that starts small, and a wagon does not. The
 *  user's line is "the first ability should always be a vehicle", and an
 *  essence whose first ability you cannot use until bronze does not satisfy
 *  it. */
export const VEHICLE_MOUNT_MIN_RANK = 'iron';

/** What riding one is worth, by rank. Flatter than MOUNT_SPEED_BY_RANK, and
 *  starting lower: a vehicle is available two ranks earlier, so it arrives
 *  slower and catches up. */
export const VEHICLE_SPEED_BY_RANK = { iron: 0.60, bronze: 1.00, silver: 1.40, gold: 1.80 };

// ---------------------------------------------------------------------------
// 4.2 -- WHICH VEHICLE AN ANIMAL CALLS.
//
// "Map animal patterns onto vehicles so animal awakening stones spawn
// specific vehicles (leopard, cow, giraffe, lion, wolf, snake, lizard, frog,
// bat, and the rest)."
//
// Four of his nine examples are not on this game's roster -- there is no
// leopard, giraffe or lion stone -- which is the useful part of the note:
// he is describing a RULE, not a list. So the rule is what is written, in
// two layers:
//
//   the WORD   for the animals whose match is specific and obvious. A cow
//              draws a wagon; a bat is a thing that flies at night.
//   the FAMILY for everything else, which is "and the rest" as a table
//              rather than as a promise to come back later.
//
// The family layer is what makes a leopard work the day somebody adds one:
// it is a `beast`, and a beast gets the thing that runs on the ground.
// ---------------------------------------------------------------------------
export const VEHICLE_BY_ANIMAL = {
  // The cow, and the one the user named upgrades for.
  Cattle: 'wagon_wood',
  Grazen: 'wagon_wood',
  Heidel: 'wagon_metal',        // a heidel is the setting's draught beast
  // Things that fly go in the things that fly.
  Bat: 'airboat',
  Bird: 'skyship',
  Wing: 'skyship',
  Duck: 'airboat',
  Bee: 'airboat', Wasp: 'airboat', Locust: 'airboat',
  // Things that swim take the flat-bottomed boat.
  Fish: 'airboat', Shark: 'airboat', Whale: 'airboat', Manatee: 'airboat',
  Frog: 'airboat', Octopus: 'airboat', Coral: 'airboat', Tentacle: 'airboat',
  // Things with a shell take the one with a shell.
  Spider: 'beetle', Crocodile: 'beetle', Lizard: 'beetle',
  // Things that travel in a pack take the thing a pack travels in.
  Wolf: 'van_steel', Dog: 'van_steel', Ape: 'van_steel',
  // The heavy ones.
  Bear: 'wagon_metal', Goat: 'wagon_metal', Sloth: 'clockwork_house',
  // The ones whose whole character is what they carry.
  Snake: 'van_rune', Venom: 'van_rune',
};

/** ...and the rest, by family. EVERY family in the stone catalogue has a row,
 *  not only the animal ones.
 *
 *  The first cut covered the seven animal families and defaulted everything
 *  else to the covered wagon, which measured 32 of 40 kits driving the same
 *  wagon -- the user's 4.2 is about animal stones, but "everything that is
 *  not an animal gets the plainest thing on the list" is how an essence with
 *  nine vehicles ends up feeling like it has one. A fire stone should call
 *  something that looks like it was made of fire, and a craft stone should
 *  call the clockwork house, for exactly the reason the whole generator puts
 *  the material in the stone's hands. */
export const VEHICLE_BY_FAMILY = {
  // the animals
  beast: 'van_steel', smallbeast: 'van_steel',
  flyer: 'airboat', aquatic: 'airboat',
  serpent: 'van_rune', insect: 'beetle', reptile: 'beetle',
  // the elements -- what each one would be made of
  fire: 'van_rune', storm: 'skyship', air: 'skyship', cold: 'wagon_metal',
  water: 'airboat', earth: 'beetle', life: 'wagon_wood', light: 'skyship',
  dark: 'van_rune', death: 'dragonhouse', blood: 'van_rune',
  // the trades and the disciplines
  craft: 'clockwork_house', alchemy: 'clockwork_house',
  order: 'clockwork_house', mind: 'van_rune', identity: 'van_rune',
  space: 'skyship', motion: 'van_steel', force: 'wagon_metal',
  guard: 'wagon_metal',
  // the weapon families -- a weapon essence that calls a vehicle calls the
  // one that carries the arsenal
  blade: 'van_steel', bludgeon: 'wagon_metal', polearm: 'wagon_metal',
  ranged: 'van_steel',
};

/**
 * ROUND 223 -- AND THE ABILITY'S OWN NAME WINS OVER BOTH.
 *
 * Measured on the first cut, and it is the fault the user has reported five
 * times in other places: "Summon Heavy Truck ... It is a bayou airboat" and
 * "Summon Motorcycle ... It is a covered wagon". The name comes from round
 * 6's skill-name bank and the vehicle came from the stone, and nothing made
 * them agree -- so the card named one vehicle and granted another.
 *
 * The name is the more specific statement about THIS ability (it is the only
 * part of it that already said "truck"), so it wins. Same ordering as
 * `weaponForAffinity`, and the same reason.
 *
 * `Summon Heavy Truck` is also item 4 arriving by itself: "summon heavy
 * truck should have been the vehicle summon". It is one now, and it is a
 * steel camper rather than whatever the socket happened to hold.
 */
export const VEHICLE_BY_NAME_WORD = [
  [/\btruck\b/i, 'van_steel'],
  [/\bcamper|caravan|rv\b/i, 'van_steel'],
  [/\bmotorcycle|bike|cycle\b/i, 'van_steel'],
  [/\bwagon|cart|dray\b/i, 'wagon_wood'],
  [/\bcarriage|coach|hauler|rig\b/i, 'wagon_metal'],
  [/\bairboat|skiff|raft|barge\b/i, 'airboat'],
  [/\bboat|ship|galley|vessel\b/i, 'skyship'],
  [/\bbeetle|carapace|shell-?car\b/i, 'beetle'],
  [/\bclockwork|cottage|house\b/i, 'clockwork_house'],
  [/\bdragon\b/i, 'dragonhouse'],
];

/** The vehicle this ability's NAME names, or null. */
export function vehicleForName(name) {
  const n = String(name || '');
  for (const [re, id] of VEHICLE_BY_NAME_WORD) if (re.test(n)) return id;
  return null;
}

/** The vehicle this stone or essence calls, or null if it is not an animal
 *  at all. Word first, family second -- the specific statement wins, which
 *  is the same ordering `weaponForAffinity` uses. */
export function vehicleForAnimal(def) {
  if (!def) return null;
  const word = def.name || def.word || null;
  if (word && VEHICLE_BY_ANIMAL[word]) return VEHICLE_BY_ANIMAL[word];
  const fam = def.family || null;
  return (fam && VEHICLE_BY_FAMILY[fam]) || null;
}

/** THE ONE ANSWER, in the order the three sources deserve: what the ability
 *  already calls itself, then what the stone is, then the plainest thing on
 *  round 196's list. Every caller asks this rather than composing the three
 *  itself -- the charter's door and the kit sweep both need it, and two
 *  copies of a precedence rule is one copy too many. */
export function vehicleFor(name, stone, seed = null) {
  const said = vehicleForName(name);
  if (said) return said;
  const fromStone = vehicleForAnimal(stone);
  if (fromStone) return fromStone;
  // NEITHER THE NAME NOR THE SOCKET HAS AN OPINION -- a signature ability has
  // no stone at all -- and the two obvious fallbacks both measured as a
  // monoculture: the plainest wagon gave 26 of 40 kits the same wagon, and
  // the essence's own family gave 34 of 40 the same camper. Neither is wrong
  // about any one kit and both are wrong about the set.
  //
  // So the fallback is SEEDED rather than fixed: stable for a given kit (the
  // same three essences always call the same vehicle, which is what stops a
  // reload changing what is parked outside) and spread across round 196's
  // nine. A random pick would have been the same variety and none of the
  // stability.
  const ids = Object.keys(VEHICLE_BY_ID);
  if (!seed) return 'wagon_wood';
  let h = 2166136261;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ids[Math.abs(h) % ids.length];
}

// ---------------------------------------------------------------------------
// 4.1 -- THE UPGRADES, AND THE TWO THE USER WROTE HIMSELF.
//
// "Cow themed upgrades. Grazer: self repair in grass. Auroch: immune to
// slows."
//
// Those two are transcribed rather than interpreted, and the rest of the
// table is written to their pattern: each vehicle earns a NAMED upgrade at
// silver and another at gold, and the name is the vehicle becoming a
// particular kind of itself. That is a better shape than round 200's mount
// traits, which are five generic capabilities dealt out by family -- "senses
// treasure" says nothing about being a hydra.
//
// EVERY FIELD HERE IS READ. Round 220's census found 96 of 128 rank-up
// grants read by nobody, and a table of nine flavourful upgrade names with
// nothing behind them would be that fault in a new file. `grants` names the
// field and the suite checks each one against the runtime that pays it.
// ---------------------------------------------------------------------------
export const VEHICLE_UPGRADES = {
  wagon_wood: [
    { rank: 'silver', name: 'Grazer', grants: { grazes: 2 },
      text: 'left standing on grass it mends itself, and you with it, 2 a second' },
    { rank: 'gold', name: 'Auroch', grants: { unslowable: true },
      text: 'nothing can slow it' },
  ],
  wagon_metal: [
    { rank: 'silver', name: 'Ironside', grants: { soak: 0.25 },
      text: 'it takes a quarter of every blow meant for you' },
    { rank: 'gold', name: 'Ram', grants: { ramDamage: 12 },
      text: 'anything you drive into is thrown aside for 12' },
  ],
  clockwork_house: [
    { rank: 'silver', name: 'Wound Tight', grants: { grazes: 1 },
      text: 'it winds itself as it walks and mends you 1 a second' },
    { rank: 'gold', name: 'Long Case', grants: { unslowable: true },
      text: 'its legs do not care what the ground is doing' },
  ],
  beetle: [
    { rank: 'silver', name: 'Carapace', grants: { soak: 0.30 },
      text: 'its shell takes 30% of every blow meant for you' },
    { rank: 'gold', name: 'Burrower', grants: { crosses: 'water' },
      text: 'it goes under water rather than around it' },
  ],
  van_steel: [
    { rank: 'silver', name: 'Long Haul', grants: { unslowable: true },
      text: 'nothing on the road slows it' },
    { rank: 'gold', name: 'Armoured', grants: { soak: 0.35 },
      text: 'it takes 35% of every blow meant for you' },
  ],
  van_rune: [
    { rank: 'silver', name: 'Warded', grants: { soak: 0.25 },
      text: 'the runes take a quarter of every blow meant for you' },
    { rank: 'gold', name: 'Phase-Bound', grants: { crosses: 'lava' },
      text: 'it crosses a flow without slowing' },
  ],
  airboat: [
    { rank: 'silver', name: 'Shallow Draught', grants: { crosses: 'water' },
      text: 'it carries you over open water' },
    { rank: 'gold', name: 'Skimmer', grants: { unslowable: true },
      text: 'nothing underneath it can slow it' },
  ],
  skyship: [
    { rank: 'silver', name: 'High Line', grants: { crosses: 'water' },
      text: 'it carries you over open water' },
    { rank: 'gold', name: 'Above It All', grants: { crosses: 'lava' },
      text: 'and over a flow without slowing' },
  ],
  dragonhouse: [
    { rank: 'silver', name: 'Hearthed', grants: { grazes: 3 },
      text: 'its hearth mends you 3 a second while you ride' },
    { rank: 'gold', name: 'Wyrmborne', grants: { crosses: 'lava' },
      text: 'it crosses a flow without slowing' },
  ],
};

/** The upgrades this vehicle has reached at this rank. */
export function vehicleUpgradesAt(vehicleId, rank) {
  const rows = VEHICLE_UPGRADES[vehicleId] || [];
  const at = RANK_ORDER.indexOf(rank);
  return rows.filter(r => at >= RANK_ORDER.indexOf(r.rank));
}

/**
 * Everything the runtime needs to ride this ability's vehicle right now, in
 * the SAME SHAPE `mountStateFor` returns -- so `mods.mount` holds one kind of
 * thing and every reader downstream is untouched. That is the whole reason
 * this function exists rather than a second mount branch in WorldScene.
 */
export function vehicleStateFor(ability, rank) {
  const id = ability && ability.vehicleId;
  const v = id && VEHICLE_BY_ID[id];
  if (!v) return null;
  const at = RANK_ORDER.indexOf(rank);
  if (at < RANK_ORDER.indexOf(VEHICLE_MOUNT_MIN_RANK)) return null;
  const ups = vehicleUpgradesAt(id, rank);
  const traits = new Set();
  // A vehicle's own terrain first -- round 196 authored that, and a skyship
  // that could not cross water until silver would be a skyship that is worse
  // than the boat it flies over.
  if (v.terrain === TERRAIN_ANY) { traits.add('water'); traits.add('lava'); }
  const grants = {};
  for (const u of ups) {
    if (u.grants.crosses) traits.add(u.grants.crosses);
    for (const [k, val] of Object.entries(u.grants)) {
      if (k === 'crosses') continue;
      grants[k] = typeof val === 'number' ? Math.max(grants[k] || 0, val) : val;
    }
  }
  return {
    vehicle: true, vehicleId: id, family: `veh_${id}`,
    // ROUND 224 -- the pool, and what it is proof against. `organic` is
    // stamped by the charter from the stone in the socket; a vehicle made of
    // flesh trades the immunity for being healable.
    maxHp: VEHICLE_HP_BY_RANK[rank] || VEHICLE_HP_BY_RANK.iron,
    soak: Math.max(VEHICLE_BASE_SOAK, (grants.soak || 0)),
    immuneTags: ability.vehicleOrganic ? [] : VEHICLE_IMMUNE_TAGS.slice(),
    organic: !!ability.vehicleOrganic,
    art: { cell: v.move.cell, runFrames: v.move.framesPerDir,
      sheet: v.move.sheet, still: v.art, label: v.name },
    speedPct: VEHICLE_SPEED_BY_RANK[rank] !== undefined
      ? VEHICLE_SPEED_BY_RANK[rank] : VEHICLE_SPEED_BY_RANK.iron,
    // A vehicle is a bigger target than a horse and does not dodge. What it
    // does instead is SOAK, which is what its upgrades grant.
    dodge: 0,
    traits, grants,
    // The same `{rank, text}` shape `mountRidersAt` returns, so the card's
    // rank-rider line prints a vehicle's upgrades with no second formatter.
    riders: [{ rank: VEHICLE_MOUNT_MIN_RANK, trait: null, text: 'you can ride it' }]
      .concat(ups.map(u => ({ rank: u.rank, trait: u.name, label: u.name, text: u.text }))),
    label: v.name,
  };
}

/** Faults in this table. Asserted rather than trusted: a vehicle with no
 *  upgrades is a vehicle whose rank-ups print nothing, and an upgrade that
 *  grants nothing is round 220's census fault committed in a new file. */
export function vehicleMountFaults() {
  const out = [];
  const READ = ['grazes', 'unslowable', 'soak', 'ramDamage', 'crosses'];
  for (const v of VEHICLES) {
    const rows = VEHICLE_UPGRADES[v.id];
    if (!rows || rows.length !== 2) { out.push(`${v.id} has ${rows ? rows.length : 0} upgrades, expected 2`); continue; }
    const ranks = rows.map(r => r.rank).join(',');
    if (ranks !== 'silver,gold') out.push(`${v.id} upgrades at ${ranks}, expected silver,gold`);
    for (const r of rows) {
      if (!r.name) out.push(`${v.id} has an upgrade with no name`);
      if (!r.text) out.push(`${v.id}'s ${r.name} says nothing`);
      const keys = Object.keys(r.grants || {});
      if (!keys.length) out.push(`${v.id}'s ${r.name} is a name with nothing behind it`);
      for (const k of keys) if (!READ.includes(k)) out.push(`${v.id}'s ${r.name} grants ${k}, which nothing reads`);
    }
  }
  // The user's two, by name and by effect.
  const cow = VEHICLE_UPGRADES.wagon_wood || [];
  if (!cow.some(u => u.name === 'Grazer' && u.grants.grazes > 0)) out.push('the cow has no Grazer that mends');
  if (!cow.some(u => u.name === 'Auroch' && u.grants.unslowable)) out.push('the cow has no Auroch that ignores slows');
  // Every animal family reaches a vehicle -- "and the rest", checked.
  for (const fam of Object.keys(VEHICLE_BY_FAMILY)) {
    const id = vehicleForAnimal({ family: fam });
    if (!id || !VEHICLE_BY_ID[id]) out.push(`family ${fam} reaches no vehicle`);
  }
  for (const [word, id] of Object.entries(VEHICLE_BY_ANIMAL)) {
    if (!VEHICLE_BY_ID[id]) out.push(`${word} names ${id}, which is not a vehicle`);
  }
  for (const [re, id] of VEHICLE_BY_NAME_WORD) {
    if (!VEHICLE_BY_ID[id]) out.push(`${re} names ${id}, which is not a vehicle`);
  }
  // The card must not name one vehicle and grant another -- item 4's fault,
  // as a check rather than as a memory.
  if (vehicleFor('Summon Heavy Truck', { name: 'Bat', family: 'flyer' }) !== 'van_steel') {
    out.push('an ability named for a truck does not grant one');
  }
  return out;
}
