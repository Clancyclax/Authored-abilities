// ===========================================================================
// ROUND 85 ITEM 2.2 -- WHAT REACHING A RANK ACTUALLY GIVES YOU.
//
// The user's 2.2 message announces four things at iron rank:
//
//   * damage reduction against normal-rank damage sources
//   * increased resistance to normal-rank effects
//   * the ability to sense auras
//   * the ability to sustain yourself using sources of concentrated magic
//
// A message that announces a mechanic the game does not have is worse than no
// message: the player is told they are tougher, plays as though they are, and
// dies. So this file is the four of them, and the announcement is generated
// FROM it -- one table, read by both the text and the runtime, so the promise
// and the behaviour cannot drift.
//
// ONE OF THE FOUR WAS ALREADY TRUE, and that is worth writing down rather than
// papering over. `RANK_GAP_MULT.down1 = 0.34` has been in WorldScene since
// round 43: a monster one rank below you does 34% of its damage. The moment
// the player reaches iron, every normal-rank monster in the game starts
// hitting them for a third. The announcement did not need a new mechanism, it
// needed to stop being vague -- so `rankDamageReduction` below READS that
// table rather than adding a second one beside it, and the message quotes the
// real number.
//
// The other three are new.
// ===========================================================================

import { RANK_ORDER } from './ranks.js';

/** Rank name -> index. `-1` for anything unknown, so a bad value fails
 *  low rather than granting benefits. */
export function rankIndexOf(rank) {
  return RANK_ORDER.indexOf(rank);
}

// ---------------------------------------------------------------------------
// 1. DAMAGE REDUCTION AGAINST LOWER-RANK SOURCES
// ---------------------------------------------------------------------------
// Not a new lever -- the reading of an existing one. The caller passes the
// same RANK_GAP_MULT table the damage path uses, so there is exactly one place
// in the project that decides how much a rank is worth.

/**
 * How much of a lower-ranked attacker's damage you shed, 0..1.
 *
 * `gapMult` is RANK_GAP_MULT; the multiplier for a one-rank gap downward is
 * `down1`, and the reduction is one minus it. Passed in rather than imported
 * because the table lives in the scene, and a copy of it here is a copy that
 * can go stale.
 */
export function rankDamageReduction(playerRankIdx, sourceRankIdx, gapMult) {
  const gap = sourceRankIdx - playerRankIdx;
  if (gap >= 0) return 0;
  const mult = gap <= -3 ? gapMult.down3 : gap === -2 ? gapMult.down2 : gapMult.down1;
  return Math.max(0, 1 - mult);
}

// ---------------------------------------------------------------------------
// 2. RESISTANCE TO LOWER-RANK EFFECTS
// ---------------------------------------------------------------------------
// New. Debuff potency already scales UP with the monster's rank (WorldScene's
// `_rollMonsterDebuffs`: `1 + 0.15 * rank`) and has never scaled DOWN with the
// player's -- so a normal-rank spider's venom was exactly as bad on a gold
// hunter as on the day they started. This is the missing half of a rule the
// game already half-had.

/** Fraction cut from a lower-ranked source's debuff potency and duration.
 *  Half per rank of gap, floored at a tenth so nothing becomes literally
 *  immune -- a poison that cannot touch you at all stops being a mechanic and
 *  starts being a message you ignore. */
export function rankEffectResistance(playerRankIdx, sourceRankIdx) {
  const gap = playerRankIdx - sourceRankIdx;
  if (gap <= 0) return 0;
  return Math.min(0.9, 1 - Math.pow(0.5, gap));
}

// ---------------------------------------------------------------------------
// 3. AURA SENSE
// ---------------------------------------------------------------------------
// New. In the source material this is the first thing an iron-ranker notices:
// they can feel what is around them. Mechanically it is the answer to a
// question the player has been asking since round 19 -- "is there anything in
// that treeline" -- and it became a much bigger deal last round, when the
// sewer stopped letting them see.

/** How far auras are felt, in tiles, by rank index. Normal feels nothing.
 *  Deliberately shorter than the minimap's own window at every rank, so it
 *  reveals monsters and never the map. */
export const AURA_SENSE_TILES = [0, 10, 14, 18, 24, 24];

export function auraSenseTiles(playerRankIdx) {
  return AURA_SENSE_TILES[Math.max(0, Math.min(AURA_SENSE_TILES.length - 1, playerRankIdx))] || 0;
}

// ---------------------------------------------------------------------------
// 4. SUSTAINING ON CONCENTRATED MAGIC
// ---------------------------------------------------------------------------
// New. In the books this is what stops an iron-ranker needing to eat: they
// live on ambient magic. A hunger clock is not a thing this game has and is
// not a thing worth adding for one line of text, so the mechanic is the other
// half of the same idea -- an iron-ranker RECOVERS from ambient magic, a
// little everywhere and a lot where magic is concentrated.
//
// "Concentrated magic" is not a new kind of place: the game already has eight
// temples, the Department of Essence Development, and the god shrines. Standing
// in one is the strong version; being iron rank at all is the weak one.

/** Fraction of max HP/mana/stamina recovered per second, by rank index, just
 *  for being of a rank that can do it at all. Small enough that it never
 *  replaces a potion in a fight and large enough to notice on a long walk. */
export const AMBIENT_SUSTAIN = [0, 0.0035, 0.005, 0.007, 0.010, 0.010];
/** The multiplier while standing in concentrated magic. */
export const CONCENTRATED_SUSTAIN_MULT = 6;
/** How close counts as standing in it, in world units. */
export const CONCENTRATED_RADIUS = 190;

export function ambientSustain(playerRankIdx, inConcentratedMagic) {
  const base = AMBIENT_SUSTAIN[Math.max(0, Math.min(AMBIENT_SUSTAIN.length - 1, playerRankIdx))] || 0;
  return base * (inConcentratedMagic ? CONCENTRATED_SUSTAIN_MULT : 1);
}

/**
 * The four benefits of a rank, as lines of text.
 *
 * GENERATED FROM THE SAME NUMBERS THE RUNTIME USES, which is the whole reason
 * this lives beside them rather than in the dialogue that prints it. The
 * percentages in the message are measured, not written down twice.
 */
export function rankBenefitLines(rankIdx, gapMult) {
  if (rankIdx < 1) return [];
  const dr = Math.round(rankDamageReduction(rankIdx, rankIdx - 1, gapMult) * 100);
  const er = Math.round(rankEffectResistance(rankIdx, rankIdx - 1) * 100);
  const prev = RANK_ORDER[rankIdx - 1];
  return [
    `You have gained damage reduction against ${prev}-rank damage sources. `
      + `They now deal ${100 - dr}% of their damage to you.`,
    `You have gained increased resistance to ${prev}-rank effects. `
      + `Their afflictions land at ${100 - er}% strength and duration.`,
    `You have gained the ability to sense auras. `
      + `Living things within ${auraSenseTiles(rankIdx)} tiles now show on your map, `
      + `through walls and in the dark.`,
    'You have gained the ability to sustain yourself using sources of concentrated magic. '
      + 'You recover slowly wherever you stand, and quickly near a temple or a shrine.',
  ];
}

/** Faults a suite can assert against. */
export function rankBenefitFaults(gapMult) {
  const out = [];
  if (!gapMult || !(gapMult.down1 > 0)) { out.push('no rank gap table given'); return out; }
  // Normal rank gets nothing -- the benefits are what arriving at iron MEANS,
  // and a normal-rank character who already had them would make the message a
  // lie in the other direction.
  if (rankDamageReduction(0, 0, gapMult) !== 0) out.push('normal rank already reduces damage');
  if (rankEffectResistance(0, 0) !== 0) out.push('normal rank already resists effects');
  if (auraSenseTiles(0) !== 0) out.push('normal rank already senses auras');
  if (ambientSustain(0, true) !== 0) out.push('normal rank already sustains on magic');
  // And every one of them must actually turn on at iron.
  if (!(rankDamageReduction(1, 0, gapMult) > 0)) out.push('iron rank does not reduce damage');
  if (!(rankEffectResistance(1, 0) > 0)) out.push('iron rank does not resist effects');
  if (!(auraSenseTiles(1) > 0)) out.push('iron rank does not sense auras');
  if (!(ambientSustain(1, false) > 0)) out.push('iron rank does not sustain');
  if (!(ambientSustain(1, true) > ambientSustain(1, false))) {
    out.push('concentrated magic is no better than ambient');
  }
  // Monotonic: a higher rank is never worse off than a lower one.
  for (let i = 2; i < RANK_ORDER.length; i++) {
    if (auraSenseTiles(i) < auraSenseTiles(i - 1)) out.push(`aura sense shrinks at ${RANK_ORDER[i]}`);
    if (ambientSustain(i, false) < ambientSustain(i - 1, false)) {
      out.push(`sustain shrinks at ${RANK_ORDER[i]}`);
    }
  }
  if (rankBenefitLines(1, gapMult).length !== 4) out.push('iron rank does not announce four benefits');
  if (rankBenefitLines(0, gapMult).length !== 0) out.push('normal rank announces benefits');
  return out;
}
