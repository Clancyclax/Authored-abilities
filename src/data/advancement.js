// ===========================================================================
// ROUND 85 ITEM 2 -- WHAT THE GAME TELLS YOU WHEN YOU ADVANCE.
//
//   "Add new pop up text when certain actions are taken."
//
// Three moments, and the user wrote the templates:
//
//   2.1  absorbing an essence
//   2.2  bonding the fourth, and reaching iron rank
//   2.3  using an awakening stone
//
// WHY THIS IS A DATA MODULE AND NOT A METHOD ON THE SCENE. Every number in
// these messages is a claim about the character -- how many essences, what
// percentage, which attribute, how many of five abilities. A claim is a thing
// that can be wrong, and the way it goes wrong is that the text is written
// once against the state as it was and then the state changes underneath it.
// So the text is BUILT FROM a state snapshot by a pure function, and a suite
// can hand that function a made-up character and check every line without a
// browser, a world, or a fight.
//
// THE TEMPLATES ARE THE USER'S, punctuation included. Where a line needed a
// number they did not specify -- the percentage, the ability counts -- it is
// derived rather than invented, and `advancementFaults` asserts each template
// still contains the phrases they wrote.
// ===========================================================================

import { RANK_LABELS, RANK_ORDER } from './ranks.js';

/** Four essence slots: three bonded essences and the confluence they form. */
export const ESSENCES_FOR_IRON = 4;
/** Five abilities per essence: its innate, plus one per awakening stone.
 *  This is not a new number -- it is `1 + STONE_SLOT_CAP`, and the kit's own
 *  budget of 20 abilities across 4 slots has always been this times four. */
export const ABILITIES_PER_ESSENCE = 5;

/**
 * 2.1 -- an essence has been absorbed.
 *
 * `s` is a snapshot: {
 *   essenceName, bonded, attribute, attrRankLabel, innateName,
 *   awakenedInSlot
 * }
 */
export function essenceAbsorbedLines(s) {
  const pct = Math.round((s.bonded / ESSENCES_FOR_IRON) * 100);
  const out = [
    `You have absorbed [${s.essenceName} Essence]. `
      + `You have absorbed ${s.bonded} of ${ESSENCES_FOR_IRON} essences.`,
    `Progress to iron rank: ${pct}% (${s.bonded}/${ESSENCES_FOR_IRON} essences).`,
    `[${s.essenceName} Essence] has bonded to your [${s.attribute}] attribute, `
      + `changing your [${s.attribute}] from normal to [${s.attrRankLabel}].`,
    `Master all ${s.essenceName} essence abilities to increase your [${s.attribute}] attribute.`,
    // ROUND 201 -- and HOW it advances, which is the half the player could not
    // see. "Master all" says the destination; this says the pace, and the pace
    // is what makes neglecting one ability cost something.
    linkedAttributeLine(s),
  ];
  // The innate is the first of the five, and it arrives with the essence. A
  // slot whose essence grants no innate says nothing rather than claiming an
  // ability with no name -- which is what the first draft of this did.
  if (s.innateName) {
    out.push(abilityAwakenedLine({
      essenceName: s.essenceName,
      abilityName: s.innateName,
      awakened: s.awakenedInSlot || 1,
    }));
  }
  return out;
}

/**
 * 2.3 -- an ability has been awakened, by an essence's innate or by a stone.
 *
 * The user's example, exactly:
 *
 *   "You have awakened the blood essence ability [Leech Bite]. You have
 *    awakened 2 of 5 blood essence abilities."
 *
 * Note the essence name is LOWER CASE inside the phrase -- "the blood essence
 * ability", not "the Blood essence ability" -- which is how they wrote it and
 * how it reads.
 */
export function abilityAwakenedLine(s) {
  const e = String(s.essenceName || '').toLowerCase();
  const line = `You have awakened the ${e} essence ability [${s.abilityName}]. `
    + `You have awakened ${s.awakened} of ${ABILITIES_PER_ESSENCE} ${e} essence abilities.`;
  // ROUND 201 -- the fifth one finishes the essence, and the books say so.
  // Appended to this line rather than pushed as its own, so the sentence the
  // user wrote keeps its shape and every existing caller gets the completion
  // without having to learn a second function.
  return s.awakened >= ABILITIES_PER_ESSENCE
    ? `${line} ${essenceCompleteLine(s)}` : line;
}

// ===========================================================================
// ROUND 201 -- THE TWO LINES THE BOOKS PRINT AND WE DID NOT.
//
// docs/ABILITY_CANON_GAP.md, §1: canon shows two messages this module had no
// function for. Both are one line each; the first is the interesting one,
// because it states a RULE and we implemented a different rule.
//
//   "Linked attribute [Recovery] will advance in conjunction with lowest-rank
//    adept essence ability."
//
// We used the mean (abilityLevels.js's syncSlotsFromAbilities). Round 201 also
// changes that to the lowest, so this line is true when it is printed -- see
// §3 of the gap document and `lowestStanding`. Printing it against the mean
// would have been worse than not printing it at all: a promise the player can
// check and find false teaches them not to read the rest.
//
// The second is the completion of the awakening count 2.3 already tracks.
// ===========================================================================

/**
 * The linked-attribute rule, stated. `s` is {attribute, essenceName}.
 *
 * Lower case inside the phrase, the same way 2.3 writes "the blood essence
 * ability" -- which is how the user wrote it and how it reads.
 */
export function linkedAttributeLine(s) {
  const e = String(s.essenceName || '').toLowerCase();
  return `Linked attribute [${s.attribute}] will advance in conjunction with `
    + `lowest-rank ${e} essence ability.`;
}

/** All five of an essence's abilities are awakened. */
export function essenceCompleteLine(s) {
  const e = String(s.essenceName || '').toLowerCase();
  return `You have awakened all ${e} essence abilities.`;
}

/**
 * 2.2 -- the fourth essence is bonded and the character is iron rank.
 *
 * `benefitLines` comes from rankBenefits.js, which is also what the runtime
 * reads -- so the four promises here are the four mechanics, generated from
 * the same numbers.
 */
export function ironRankLines(benefitLines) {
  return [
    `You have absorbed ${ESSENCES_FOR_IRON}/${ESSENCES_FOR_IRON} essences.`,
    'All your attributes have reached iron rank.',
    'You have reached iron rank.',
    ...benefitLines,
  ];
}

/** The rank label an attribute wears once its slot has an essence in it:
 *  "Iron 0" at the bottom of iron, "Bronze 3" three levels into bronze. */
export function attributeRankLabel(rank, level) {
  const r = RANK_LABELS[rank] || RANK_LABELS[RANK_ORDER[0]];
  return `${r} ${level | 0}`;
}

/** Faults a suite can assert against -- and specifically, that each template
 *  still says what the user asked for. Checked as PHRASES rather than as whole
 *  strings, so a comma can be fixed without failing the build and a missing
 *  clause cannot slip through. */
export function advancementFaults() {
  const out = [];
  const a = essenceAbsorbedLines({
    essenceName: 'Blood', bonded: 1, attribute: 'Power',
    attrRankLabel: 'Iron 0', innateName: 'Leech Bite', awakenedInSlot: 1,
  });
  const need21 = [
    'You have absorbed [Blood Essence].',
    'You have absorbed 1 of 4 essences.',
    'Progress to iron rank: 25% (1/4 essences).',
    'has bonded to your [Power] attribute',
    'from normal to [Iron 0]',
    'Master all Blood essence abilities to increase your [Power] attribute.',
    'You have awakened the blood essence ability [Leech Bite].',
    'You have awakened 1 of 5 blood essence abilities.',
    // ROUND 201 -- the rule, stated, and it is the rule the game implements.
    'Linked attribute [Power] will advance in conjunction with lowest-rank blood essence ability.',
  ];
  const joined21 = a.join(' ');
  for (const phrase of need21) {
    if (!joined21.includes(phrase)) out.push(`2.1 no longer says "${phrase}"`);
  }
  if (a.length !== 6) out.push(`2.1 produced ${a.length} lines, expected 6`);
  // The completion line appears on the fifth and on no earlier one.
  const fifth = abilityAwakenedLine({ essenceName: 'Blood', abilityName: 'Sanguine Coil', awakened: 5 });
  if (!fifth.includes('You have awakened all blood essence abilities.')) {
    out.push('awakening the fifth ability does not say the essence is complete');
  }
  const fourth = abilityAwakenedLine({ essenceName: 'Blood', abilityName: 'Sanguine Coil', awakened: 4 });
  if (fourth.includes('all blood essence abilities')) {
    out.push('the essence reads complete at four of five');
  }

  // The user's own worked example for 2.3, reproduced exactly.
  const line = abilityAwakenedLine({ essenceName: 'Blood', abilityName: 'Leech Bite', awakened: 2 });
  const want = 'You have awakened the blood essence ability [Leech Bite]. '
    + 'You have awakened 2 of 5 blood essence abilities.';
  if (line !== want) out.push(`2.3 does not match the example:\n  got  ${line}\n  want ${want}`);

  const iron = ironRankLines(['A.', 'B.', 'C.', 'D.']);
  const need22 = [
    'You have absorbed 4/4 essences.',
    'All your attributes have reached iron rank.',
    'You have reached iron rank.',
  ];
  const joined22 = iron.join(' ');
  for (const phrase of need22) {
    if (!joined22.includes(phrase)) out.push(`2.2 no longer says "${phrase}"`);
  }
  if (iron.length !== 7) out.push(`2.2 produced ${iron.length} lines, expected 3 + 4 benefits`);

  // An essence whose slot grants no innate must not claim an unnamed ability.
  const noInnate = essenceAbsorbedLines({
    essenceName: 'Blood', bonded: 1, attribute: 'Power', attrRankLabel: 'Iron 0', innateName: null,
  });
  if (noInnate.length !== 5) out.push('2.1 invents an ability when there is no innate');
  if (attributeRankLabel('iron', 0) !== 'Iron 0') out.push('attribute rank label is wrong');
  return out;
}
