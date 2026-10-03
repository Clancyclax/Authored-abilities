// ROUND 76 (item 2) -- MINION BUILDS: THE CAP, THE CEILING, AND ONE JOB EACH.
//
// The user:
//
//   "much like a build may through essences and awakening stones tend to be
//    more attack, healing, stealth, or defensive focused it may also be more
//    summon focused. Not every build needs multiple summons, but it should be
//    very possible for a build to end up with 6-8 constant summons and 2-4
//    short duration summons and be a 'Minion build'. Henrietta Geller in the
//    lore is one of these adventurers."
//
// and, asked what the ceiling should be:
//
//   "cap 8, damage should be scaled to the players rank and power. No summon
//    should hit harder than a monster at the same rank. They should have
//    plenty of variation, auras, heals, attacks, spells, dots, but each
//    summon can really only do 1 of these things."
//
// Three rules, and the third is the interesting one.
//
// ONE JOB EACH. Before this round every summon was the same summon: it walked
// at the nearest enemy and hit it. A board of eight identical dots hitting the
// same wolf is not a minion build, it is one ability cast eight times. Giving
// each summon exactly ONE of five jobs is what makes eight of them read as a
// menagerie -- and the restriction matters more than the variety does. A
// summon that attacked AND healed AND carried an aura would be strictly better
// than three summons that each do one thing, and the cap would then be a
// formality rather than a decision.
//
// THE CEILING IS MEASURED, NOT CHOSEN. "No summon should hit harder than a
// monster at the same rank" is a testable sentence, so the ceiling is computed
// from the actual roster rather than typed in. Measured across all 155
// monsters (tier maps to rank through COIN_RANK_BY_TIER):
//
//     rank      n    min   median   max
//     normal    5      3        4     4
//     iron     14      4        6     7
//     bronze   28      6       10    13
//     silver   42     12       16    20
//     gold     66     17       30    67
//
// The MEDIAN is the ceiling, not the max. A gold-rank max of 67 is the wyrm,
// and a summon that hits as hard as the strongest thing in the game would make
// the rule meaningless. The median is what "a monster at the same rank" means
// to a player, who meets the ordinary ones far more often than the apex.
//
// EIGHT PERMANENT, FOUR TEMPORARY. The temporary ones are counted separately
// because they are a different decision: a permanent summon is a slot in your
// build, a short-lived one is a button you press in a fight. Sharing one cap
// would mean casting a 20-second creature silently evicted a minion you had
// been maintaining, which is the kind of thing a player never sees happen and
// cannot explain afterwards.
import { MONSTER_FAMILY_BASE, MONSTER_TYPES, monsterThreatTier, COIN_RANK_BY_TIER } from './monsters.js';
import { RANK_ORDER } from './ranks.js';

/** How many permanent summons may be out at once. The user's number. */
export const SUMMON_CAP = 8;
/** ...and how many short-duration ones on top of that. */
export const SUMMON_TEMP_CAP = 4;
/** A summon at or under this duration is TEMPORARY and uses the second cap. */
export const SUMMON_TEMP_SECONDS = 45;

/**
 * The five jobs. Each summon has exactly one.
 *
 * `weight` is how often the generator should pick this job when it has a free
 * choice. Attack is the plurality but not the majority -- a minion build whose
 * eight creatures were all attackers would be the same build the game already
 * had, only larger.
 */
/** ROUND 294 -- what a standard-bearer and a tender actually do, here so the
 *  card's sentence and the runtime read one set of numbers. */
export const SUMMON_AURA_RADIUS = 190;
export const SUMMON_AURA_PCT = 0.08;
export const SUMMON_HEAL_PCT = 0.025;

export const SUMMON_ROLES = {
  attack: {
    key: 'attack', weight: 34,
    label: 'attacker',
    blurb: (n) => `${n} that closes and strikes`,
    // It walks into the pack, so it is the sturdiest of the five.
    hpPct: 0.40,
    // Damage is the ceiling (see summonDamageCeiling); everything else scales
    // DOWN from it, because a creature that also does something else has
    // already been paid for that.
    dmgShare: 1.0,
  },
  spell: {
    key: 'spell', weight: 18,
    label: 'caster',
    blurb: (n) => `${n} that hangs back and throws ${'magic'}`,
    hpPct: 0.22,
    // Hits from range and never closes, so it lands more of its damage over a
    // fight than an attacker does -- and is worth less per hit for it.
    dmgShare: 0.78,
    ranged: true,
  },
  dot: {
    key: 'dot', weight: 16,
    label: 'afflicter',
    blurb: (n) => `${n} whose bite festers`,
    hpPct: 0.28,
    // Almost no damage on contact; the affliction is the payload.
    dmgShare: 0.35,
    applies: 'dot',
  },
  aura: {
    key: 'aura', weight: 18,
    label: 'standard-bearer',
    blurb: (n) => `${n} whose presence steadies those near it`,
    hpPct: 0.30,
    // Deals NOTHING. An aura minion that also chipped in would be two jobs.
    dmgShare: 0,
    aura: true,
  },
  heal: {
    key: 'heal', weight: 14,
    label: 'tender',
    blurb: (n) => `${n} that tends your wounds`,
    hpPct: 0.25,
    dmgShare: 0,
    heals: true,
  },
  // ROUND 76 (item 2.2) -- THE SIXTH ROLE, and the only one that is never
  // rolled. `weight: 0` means pickSummonRole cannot return it: a guardian is
  // reached ONLY through the odd-summon table (oddSummons.js), which is what
  // makes finding the Cast-Iron Duck mean something. If this were weighted
  // like the other five it would be an ordinary role that happened to have
  // twenty special names, and the table would be decoration.
  //
  // It is still ONE job under the user's rule. The defensive aura and the
  // taunt are not two things a guardian does, they are the two halves of
  // tanking -- a taunt that did not reduce what the pack then did to you
  // would be an ability that gets your minion killed on your behalf.
  guard: {
    key: 'guard', weight: 0,
    label: 'guardian',
    blurb: (n) => `${n} that stands between you and the pack`,
    // Unchanged: ODD_GUARD.hpPct has been 0.55 since round 76.
    hpPct: 0.55,
    dmgShare: 0,
    guards: true,
  },
};
// ===========================================================================
// ROUND 204 (item 5) -- EVERY SUMMON HAS HIT POINTS.
//
// The user: "Many abilities shown heal summons, how much health do the
// summons have? Do they all have health to restore?"
//
// The answer was no, and it was worse than no: exactly ONE role had health --
// `guard`, which `weight: 0` means the generator never rolls, so it is
// reachable only through the odd-summon table. Every wolf, turret, caster and
// tender in the game was unkillable and expired on a timer alone; a monster
// could stand inside one forever and nothing happened to either of them.
//
// Round 76's own note two roles up is the argument for fixing it, and it was
// already written: "A taunt from something that cannot die is not a tank, it
// is a permanent crowd-control field with no counterplay." That is exactly as
// true of an attacker that cannot die, and it is why minion builds have never
// had a real cost.
//
// The share is per role and it is the role's job that sets it: the attacker
// walks into the pack and the caster stands behind it. All of them are a
// fraction of the PLAYER'S maximum, which is round 76's scaling and means a
// summon stays relevant from iron to gold without a second ladder.
export function summonHpFor(role, playerMaxHp, override = null) {
  const r = SUMMON_ROLES[role] || SUMMON_ROLES.attack;
  const pct = (typeof override === 'number' && override > 0) ? override : r.hpPct;
  return Math.max(1, Math.round((playerMaxHp || 40) * pct));
}

export function summonRoleFaults() {
  const out = [];
  for (const k of Object.keys(SUMMON_ROLES)) {
    const r = SUMMON_ROLES[k];
    if (!(r.hpPct > 0)) out.push(`${k} has no hpPct: it would spawn unkillable`);
    if (r.hpPct > 1) out.push(`${k} is sturdier than the player who called it`);
  }
  // The guardian is the tank and must remain the sturdiest of them.
  const g = SUMMON_ROLES.guard.hpPct;
  for (const k of Object.keys(SUMMON_ROLES)) {
    if (k !== 'guard' && SUMMON_ROLES[k].hpPct >= g) out.push(`${k} is as sturdy as the guardian`);
  }
  return out;
}

export const SUMMON_ROLE_KEYS = Object.keys(SUMMON_ROLES);

/**
 * THE DAMAGE CEILING at a player rank, measured off the live roster.
 *
 * Computed once at module load from MONSTER_TYPES rather than written down, so
 * a rebalance of the monsters moves the summon ceiling with it and the rule
 * cannot quietly stop being true.
 */
export const SUMMON_DMG_CEILING = (() => {
  const byTier = {};
  for (const key of Object.keys(MONSTER_TYPES)) {
    const t = monsterThreatTier(key);
    (byTier[t] = byTier[t] || []).push(MONSTER_TYPES[key].dmg);
  }
  const out = {};
  for (const [tier, list] of Object.entries(byTier)) {
    list.sort((a, b) => a - b);
    const rank = COIN_RANK_BY_TIER[Math.min(+tier, COIN_RANK_BY_TIER.length - 1)];
    out[rank] = list[Math.floor(list.length / 2)];   // the median, see the header
  }
  // Every rank in the ladder gets an entry, so a lookup never returns
  // undefined and silently disables the cap.
  let last = 4;
  for (const r of RANK_ORDER) {
    if (out[r] === undefined) out[r] = last; else last = out[r];
  }
  return out;
})();

/**
 * What a summon of `role` may hit for, at `rank`, given the player's own
 * damage multiplier.
 *
 * The player's power raises the floor but never the ceiling: a heavily-built
 * character's minions reach the cap sooner, they do not exceed it. That is
 * what "no summon should hit harder than a monster at the same rank" means
 * read strictly, and reading it loosely is how minion builds become the only
 * build.
 */
export function summonDamageFor(role, rank, baseDmg, playerDmgMult = 1) {
  const spec = SUMMON_ROLES[role] || SUMMON_ROLES.attack;
  if (!spec.dmgShare) return 0;
  const ceiling = (SUMMON_DMG_CEILING[rank] || SUMMON_DMG_CEILING.normal) * spec.dmgShare;
  const wanted = (baseDmg || 1) * playerDmgMult * spec.dmgShare;
  return Math.max(1, Math.round(Math.min(wanted, ceiling)));
}

/**
 * WHICH FAMILIES A RANK MAY SUMMON.
 *
 * The user chose "all 31, apex gated by rank". A family's gate is derived from
 * the rank its own WEAKEST shade sits at -- so the gate is the same number the
 * monster tiering already computes, and a family that is rebalanced moves its
 * own gate. Nothing is typed twice.
 *
 * One deliberate softening: the gate is the family's weakest shade, not its
 * strongest. A player who can fight a thing should be able to call one, and
 * requiring the STRONGEST shade's rank would have locked the wyrm behind a
 * rank above anything else in the game.
 */
export const SUMMON_RANK_GATE = (() => {
  const out = {};
  for (const key of Object.keys(MONSTER_TYPES)) {
    const f = MONSTER_TYPES[key].family;
    const t = monsterThreatTier(key);
    out[f] = out[f] === undefined ? t : Math.min(out[f], t);
  }
  const gates = {};
  for (const [f, tier] of Object.entries(out)) {
    gates[f] = COIN_RANK_BY_TIER[Math.min(tier, COIN_RANK_BY_TIER.length - 1)];
  }
  return gates;
})();

/** Can a character of `rank` summon this family? */
export function summonAllowedAt(family, rank) {
  const gate = SUMMON_RANK_GATE[family];
  if (!gate) return true;                       // no gate recorded: allow
  return RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf(gate);
}

/** Every family a character of `rank` may call. */
export function summonableAt(rank) {
  return Object.keys(MONSTER_FAMILY_BASE).filter((f) => summonAllowedAt(f, rank));
}

/**
 * Pick a role for a generated summon. Seeded by the caller so one ability
 * always calls the same KIND of creature -- a minion whose job changed between
 * casts could not be built around.
 */
export function pickSummonRole(roll01) {
  const total = SUMMON_ROLE_KEYS.reduce((s, k) => s + SUMMON_ROLES[k].weight, 0);
  let n = Math.max(0, Math.min(0.999999, roll01)) * total;
  for (const k of SUMMON_ROLE_KEYS) {
    n -= SUMMON_ROLES[k].weight;
    if (n < 0) return k;
  }
  return 'attack';
}
