// ROUND 23 -- the two city guards.
//
// The user's ask, verbatim: "I've attached interior objects as well as 2 city
// guards who can patrol the spawn area. They should attack any monsters that
// get within 10 tiles of the spawn point. They have running, idle, and attack
// animations."
//
// Everything here is a number with a reason. The behaviour itself lives in
// WorldScene._updateGuards; this file is the data it reads, kept separate for
// the same reason monsters.js and npcs.js are -- so the tuning is legible
// without reading a state machine.
//
// -----------------------------------------------------------------------
// WHEN THE GUARDS ACTUALLY FIGHT
// -----------------------------------------------------------------------
// Worth being explicit, because it is easy to look at this and conclude the
// guards are broken: NO MONSTER SPAWNS ANYWHERE NEAR THE ALERT RADIUS. The
// nearest wilderness spawn ring starts at CITY_RADIUS + 80 = 2,030 units from
// town centre, and the alert radius below is 320. So a guard will never pick
// a fight on its own.
//
// That is the correct reading of the ask rather than a gap in it. The
// situation it covers is the one that actually happens in play: the player
// pulls something in the wilderness, runs for town, and arrives at the square
// with a wolf on their heels. Monsters chase well past their own leash
// (type.aggro * type.chaseDropMult), so a pursued monster genuinely can end
// up in the plaza -- and that is the moment the watch is supposed to earn its
// keep.
//
// GUARD_ALERT_TILES is therefore a literal reading of "within 10 tiles of the
// spawn point", and is one number to change if it should be a wider cordon.

// --- geometry --------------------------------------------------------------
// The alert cordon, in TILES from the spawn point, exactly as asked.
export const GUARD_ALERT_TILES = 10;
// How far from the spawn point a guard will chase before giving up and
// walking back. Deliberately larger than the cordon: a monster that steps one
// tile outside the line mid-swing should not make a guard instantly forget
// about it, which is what a leash equal to the cordon would do.
export const GUARD_LEASH_TILES = 20;
// Radius of the patrol ring the guards walk when nothing is happening. Sits
// inside the plaza (TOWN_SQUARE_RADIUS is 510) so the watch is visibly ON the
// square rather than orbiting somewhere out in the streets, and outside the
// alert cordon so a guard on patrol is always a step or two from the line
// they are meant to be holding.
export const GUARD_PATROL_RADIUS = 384;
// Waypoints per lap. Eight makes the route read as a circuit of the square
// rather than a lap of a race track, and lands a waypoint on each diagonal.
export const GUARD_PATROL_POINTS = 8;

// --- movement --------------------------------------------------------------
export const GUARD_PATROL_SPEED = 62;   // an unhurried walk
export const GUARD_CHASE_SPEED = 178;   // slightly faster than the player's 150, so an
                                        // intercept actually intercepts
export const GUARD_WAYPOINT_EPS = 26;   // "close enough, move to the next one"
export const GUARD_RADIUS = 13;         // collision footprint, a hair over the player's 12

// --- combat ----------------------------------------------------------------
export const GUARD_ATTACK_RANGE = 44;   // + the target's own radius
export const GUARD_DAMAGE = 16;         // two-shots the tier-0 roster the near ring is stocked with
export const GUARD_ATTACK_COOLDOWN = 1.15;
// The 17-frame spear thrust, and the frame the point actually lands on.
// Damage on frame 9 rather than frame 0 so the hit reads as the consequence
// of the animation instead of preceding it.
export const GUARD_ATTACK_FRAME_MS = 52;
export const GUARD_ATTACK_HIT_FRAME = 9;
export const GUARD_RUN_FRAME_MS = 80;

// --- staying alive ---------------------------------------------------------
// Guards can be hurt by what they are fighting (see _updateGuards' retaliation
// branch) but they do not die and leave a corpse in the town square. At zero
// they fall back to their post, out of the fight, and recover -- which keeps
// the stakes real without this round having to grow a death/respawn system for
// friendly NPCs.
export const GUARD_MAX_HP = 140;
export const GUARD_RECOVER_SECONDS = 14;
export const GUARD_REGEN_PER_SEC = 6;   // out of combat, back to full in ~23s from a bad fight

// --- ROUND 41: the watch has its own essence builds ------------------------
// The user's ask: "Guards should have their own essence builds to make them
// tough enough to protect the player. In the first town they should be bronze
// rank with a full suite of abilities available if they get into combat."
//
// BRONZE is two ranks above the starting player (RANK_ORDER: normal, iron,
// bronze, ...), and the multipliers below are what that rank means in
// numbers: a bronze watchman has roughly three times a starting character's
// staying power and hits about twice as hard, which is what makes standing
// behind one an actual plan rather than a wish.
export const GUARD_RANK = 'bronze';
export const GUARD_RANK_HP_MULT = 3.0;
export const GUARD_RANK_DMG_MULT = 2.0;
// How many generated ACTIVES a guard carries. Twelve is the player's own
// full kit size (ACTIVE_TARGET), and "a full suite" is the ask; the cast
// picker below only ever fires one at a time.
export const GUARD_KIT_ACTIVES = 12;
// A guard casts at most one ability this often, on top of each ability's own
// cooldown -- so a fight reads as a swordsman who also has powers, not as a
// firework display.
export const GUARD_CAST_INTERVAL = 2.4;
// Which essences and stones each guard is built from. Fixed rather than
// rolled: these are named characters, and a watchman whose kit changed every
// time the page reloaded would be a different person each session.
export const GUARD_BUILDS = {
  // Aldric holds the line: iron, earth and a spear, struck with fire and
  // thunder. Sera moves: light, swift water, cut with ice.
  guardM: { essences: ['essIron', 'essEarth', 'essSpear'], stones: ['stoneIron', 'stoneEarth', 'stoneFire', 'stoneLightning'] },
  guardF: { essences: ['essLight', 'essSwift', 'essWater'], stones: ['stoneLight', 'stoneSwift', 'stoneIce', 'stoneWater'] },
  // ROUND 197 -- the city guard holds a gate rather than a square, so he is
  // built to stand in one: iron and earth like Aldric, and a shield instead of
  // a second way to hurt somebody. Every id here was checked against the
  // catalogues -- the first draft asked for an `essOrder` and a `stoneOrder`,
  // neither of which this game has, and a kit built from a missing essence is
  // a guard with nothing to fight with.
  // ROUND 198 -- AND A FOURTH STONE, BECAUSE THREE MADE HIM A WEAKER GUARD.
  //
  // A kit is every essence crossed with every stone, so three and three is
  // nine actives against Aldric's and Sera's twelve -- and `GUARD_KIT_ACTIVES`
  // twenty lines up says twelve is the number, because twelve is the player's
  // own full kit. `test_round41` caught it the first time this tree ran
  // anywhere ("guards carry a full suite of actives", kit 9, templates 7), and
  // it is a real gap rather than a check counting the roster: the man posted
  // on the gate was quietly a quarter weaker than the two walking the square.
  //
  // `stoneArmour` rather than a second way to hurt somebody, which is round
  // 197's own reasoning for him -- same `guard` family as the shield, and
  // layered steel is what you give somebody whose job is to still be there.
  guardCity: { essences: ['essIron', 'essEarth', 'essShield'], stones: ['stoneIron', 'stoneEarth', 'stoneShield', 'stoneArmour'] },
};

// --- the watch itself ------------------------------------------------------
// `phase` is where on the shared patrol ring each guard starts, as a fraction
// of a lap -- 0 and 0.5 puts them on opposite sides of the square, so the
// cordon is covered from two directions instead of both of them walking in
// step.
export const GUARDS = [
  {
    id: 'guardM',
    name: 'Watchman Aldric',
    art: 'guardM',
    phase: 0,
    dialogue: "Ten paces past that fountain and you're the wilderness's problem, not mine. Inside it, anything with teeth answers to me.",
  },
  // ROUND 197 -- A THIRD FACE ON THE GATES.
  //
  // Round 44 posted a pair at every gate of every walled city and there were
  // two guards in the game, so every gate in the world is Aldric and Sera.
  // The city guard delivered in round 196 was drawn for exactly this post --
  // helm, shield, spear -- and giving him a `phase` puts him on the patrol
  // ring with the other two when he is not on a gate.
  {
    id: 'guardCity',
    name: 'Gatewarden Calloway Vos',
    art: 'guardCity',
    phase: 0.25,
    dialogue: "Names at the gate, business inside it. Most days that is the whole job, and the days it is not are the ones I am paid for.",
  },
  {
    id: 'guardF',
    name: 'Watchwoman Sera Kell',
    art: 'guardF',
    phase: 0.5,
    dialogue: "Bring them to the square if you're losing a fight. That's what the watch is for — no shame in it, and it's a better story than dying in a ditch.",
  },
];

// The patrol ring, as world offsets from the spawn point. Generated rather
// than hand-typed so the ring stays a ring if GUARD_PATROL_RADIUS moves.
export function guardPatrolRoute(phase = 0) {
  const pts = [];
  for (let i = 0; i < GUARD_PATROL_POINTS; i++) {
    const a = ((i / GUARD_PATROL_POINTS) + phase) * Math.PI * 2;
    pts.push({ ox: Math.cos(a) * GUARD_PATROL_RADIUS, oy: Math.sin(a) * GUARD_PATROL_RADIUS });
  }
  return pts;
}
