// ===========================================================================
// ROUND 269 (item 17) -- AURA STRENGTH AS SUPPRESSION: THE AURA CONTEST.
//
// The user, choosing the "aura contest" reading and then specifying it:
//
//   "it's a straight comparison of rank plus other factors so iron 9 beats
//    iron 8, but a second aura power is worth 3 minor thresholds, a third is
//    worth 3 more, a fourth 3 more. A summon subsumed into your aura counts as
//    1 or 2 minor thresholds higher as well. If facing multiple enemies with
//    auras suppression is the total power of your team's auras vs the total
//    power of the enemy auras where they interact."
//
// POWER IS COUNTED IN MINOR THRESHOLDS -- the unit the user named, and the one
// the rest of the game already levels in. A rank is ten of them, so Iron 9 is
// 19 and Bronze 0 is 20: "a straight comparison of rank" falls out of plain
// arithmetic and Iron 9 beats Iron 8 by exactly one.
//
//   + 3 for each aura power past the first, up to the fourth (+9 at most).
//   + 1 for each summon subsumed into the aura, or 2 for the bonded familiar.
//
// SIDES ARE TOTALS, where the auras interact. Each side's power is the sum of
// its members inside the contest radius, so a party of three can hold a
// stronger single monster off and a pack can do it to a lone player.
//
// WHAT LOSING COSTS. The losing side is suppressed: it deals less damage and
// moves more heavily, by an amount that grows with the margin and is capped
// so a contest shapes a fight rather than ending one. A margin inside
// CONTEST_DEADBAND is a stand-off and nobody is suppressed -- two equal
// auras pressing on each other is the books' description of two equals.
// ===========================================================================

// ===========================================================================
// ROUND 285 (item 17) -- "Monsters are treated as having auras; only sentient
// enemies have auras."
//
// The people this game puts against you -- cultists, bandits, the realm camps
// -- are all sentient and all carry an aura (they are read in
// `_personHostiles`). Of the monster families, only the ones that THINK get
// one: the rest are animals and constructs, and an animal is not pressing an
// aura on anybody. Listed rather than inferred, so the call is one line to
// change.
// ===========================================================================
export const SENTIENT_FAMILIES = new Set(['demon', 'harbinger', 'dragon', 'medusa', 'gnoll', 'birdangel']);

/** Does this monster have an aura at all? */
export function monsterHasAura(m) {
  if (!m) return false;
  if (m.sentient || (m.type && m.type.sentient)) return true;
  const fam = m.type && m.type.family;
  return SENTIENT_FAMILIES.has(fam);
}

export const THRESHOLDS_PER_RANK = 10;
export const EXTRA_AURA_POWER = 3;
export const MAX_AURA_POWERS = 4;
export const SUBSUMED_POWER = 1;
export const SUBSUMED_BONDED_POWER = 2;

/** World units within which auras meet. About the width of a skirmish. */
export const CONTEST_RADIUS = 360;
/** A margin this small is a stand-off. */
export const CONTEST_DEADBAND = 0;
/** Suppression per threshold of margin, and its ceiling. */
export const SUPPRESS_PER_THRESHOLD = 0.025;
export const SUPPRESS_CAP = 0.35;
/** Movement is dragged by this share of the damage suppression. */
export const SUPPRESS_MOVE_SHARE = 0.5;

/**
 * One aura's power, in minor thresholds.
 *
 * @param {number} rankIdx  0 Normal, 1 Iron, 2 Bronze, ...
 * @param {number} level    0-9 within the rank
 * @param {number} auraPowers  how many aura abilities this body has (>= 1 if it
 *                             has an aura at all; every being does)
 * @param {Array<'normal'|'bonded'>} subsumed  summons folded into the aura
 */
export function auraPower({ rankIdx = 0, level = 0, auraPowers = 1, subsumed = [] } = {}) {
  const base = Math.max(0, rankIdx) * THRESHOLDS_PER_RANK + Math.max(0, Math.min(9, level));
  const extra = EXTRA_AURA_POWER * Math.max(0, Math.min(MAX_AURA_POWERS, auraPowers) - 1);
  const summons = (subsumed || []).reduce((a, s) => a + (s === 'bonded' ? SUBSUMED_BONDED_POWER : SUBSUMED_POWER), 0);
  return base + extra + summons;
}

/** Two sides' totals, compared. */
export function contest(teamPowers, enemyPowers) {
  const team = (teamPowers || []).reduce((a, x) => a + x, 0);
  const enemy = (enemyPowers || []).reduce((a, x) => a + x, 0);
  const margin = team - enemy;
  let winner = 'even';
  if (!enemyPowers || !enemyPowers.length) winner = 'none';
  else if (margin > CONTEST_DEADBAND) winner = 'team';
  else if (margin < -CONTEST_DEADBAND) winner = 'enemy';
  return { team, enemy, margin, winner, suppression: suppressionFor(Math.abs(margin)) };
}

/** How hard the loser is pressed, for a margin in thresholds. */
export function suppressionFor(margin) {
  const m = Math.max(0, margin - CONTEST_DEADBAND);
  const dmg = Math.min(SUPPRESS_CAP, m * SUPPRESS_PER_THRESHOLD);
  return { dmg, move: dmg * SUPPRESS_MOVE_SHARE };
}

/** A monster has no level inside its rank; this gives it a stable one. */
export function monsterAuraLevel(uid) {
  let h = (Number(uid) || 0) * 2654435761;
  h ^= h >>> 15;
  return Math.abs(h) % 10;
}

export function auraContestFaults() {
  const out = [];
  const iron9 = auraPower({ rankIdx: 1, level: 9 });
  const iron8 = auraPower({ rankIdx: 1, level: 8 });
  const bronze0 = auraPower({ rankIdx: 2, level: 0 });
  if (!(iron9 > iron8)) out.push('Iron 9 does not beat Iron 8');
  if (!(bronze0 > iron9)) out.push('Bronze 0 does not beat Iron 9');
  if (auraPower({ rankIdx: 1, level: 0, auraPowers: 2 }) - auraPower({ rankIdx: 1, level: 0 }) !== 3) {
    out.push('a second aura power is not three thresholds');
  }
  if (auraPower({ rankIdx: 1, level: 0, auraPowers: 9 }) - auraPower({ rankIdx: 1, level: 0 }) !== 9) {
    out.push('aura powers past the fourth are counted');
  }
  if (contest([19], [18]).winner !== 'team') out.push('the stronger team does not win');
  if (contest([10, 10], [15]).winner !== 'team') out.push('team totals are not summed');
  if (suppressionFor(1000).dmg > SUPPRESS_CAP) out.push('suppression is uncapped');
  return out;
}
