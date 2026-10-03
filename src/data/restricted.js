// ============================================================================
// ROUND 271 -- THE RESTRICTED ESSENCES.
//
//   "1.2) The restricted essences are Death and Corrupt, having either bans you
//         from the adventure society.
//    1.3) For gameplay purposes having either should generally result in the
//         Undeath confluence which actively gets you hunted by the society.
//    1.3.1) The exception is if you have the opposite essence in the combo.
//         i.e. death, life, anything (Cycle), or Corrupt, pure, anything
//         (cycle)
//    1.4) For players with a restricted essence but not the undeath confluence
//         the adventure society will administer a personality test and send
//         you on a mission to wipe out a cult somewhere on the map to evaluate
//         you."
//
// Three questions live here, all of them pure so a suite can ask them without
// a scene:
//
//   restrictedRuling(ids)  -- what a trio's confluence IS under the rule
//                             (Undeath, Cycle, or no ruling at all)
//   societyVerdict(...)    -- what the Society does about a member or an
//                             applicant: nothing, evaluate, or hunt
//   the personality test   -- its questions, its scoring, and what the score
//                             sends you to do
//
// THE COUNTER RULE, as ruled in round 271: a trio is Cycle only when EVERY
// restricted essence in it has its opposite beside it. Death + Corrupt + Life
// is still Undeath -- Life answers Death, and nothing answers Corrupt.
// ============================================================================
import { CULTS } from './cultists.js';
import { RANK_ORDER } from './ranks.js';

export const UNDEATH = 'Undeath';
export const CYCLE = 'Cycle';

/** The two essences the Society will not register, and what answers each. */
export const RESTRICTED_ESSENCES = {
  essDeath: { name: 'Death', opposite: 'essLife', oppositeName: 'Life' },
  essCorrupt: { name: 'Corrupt', opposite: 'essPure', oppositeName: 'Pure' },
};
export const RESTRICTED_IDS = Object.keys(RESTRICTED_ESSENCES);

export function isRestricted(id) {
  return !!RESTRICTED_ESSENCES[id];
}

/** The restricted essences among these ids, in id order, once each. */
export function restrictedHeld(ids) {
  const set = new Set((ids || []).filter(Boolean));
  return RESTRICTED_IDS.filter(id => set.has(id));
}

/**
 * What the rule makes of a TRIO. `null` when there is nothing restricted in
 * it (the ordinary resolver answers), otherwise `Cycle` or `Undeath`.
 *
 * Asked by `resolveConfluenceName` AFTER the sheet: "Dont overwrite any TTRPG
 * listed or cannon essence combinations". Bone + Death + Magic stays Animate;
 * this rules only the trios the sheet never named.
 */
export function restrictedRuling(ids) {
  const list = (ids || []).filter(Boolean);
  if (list.length < 3) return null;
  const held = restrictedHeld(list);
  if (!held.length) return null;
  const set = new Set(list);
  const answered = held.every(id => set.has(RESTRICTED_ESSENCES[id].opposite));
  return answered ? CYCLE : UNDEATH;
}

/**
 * What the Society does about a person, given what they have bonded.
 *
 *   'clear'    -- nothing restricted, or nothing it has not already weighed
 *   'evaluate' -- a restricted essence without Undeath: the test, then a cult
 *   'hunt'     -- Undeath: no test, no appeal
 *
 * `clearedFor` is what a PASSED evaluation covered. A member cleared while
 * holding Death who later bonds Corrupt is weighed again, because the Society
 * weighed a person with one of them, not a person with both.
 */
export function societyVerdict({ slotEssence, confluenceName, clearedFor } = {}) {
  if (confluenceName === UNDEATH) return 'hunt';
  const held = restrictedHeld(slotEssence);
  if (!held.length) return 'clear';
  const cleared = new Set(clearedFor || []);
  return held.every(id => cleared.has(id)) ? 'clear' : 'evaluate';
}

// ----------------------------------------------------------------------------
// THE PERSONALITY TEST.
//
// Administered by the desk, not by the Guildmaster: it is paperwork before it
// is judgement. Five questions, three answers each. The answers are scored
// +1 (steady), 0 (guarded) or -1 (troubling). No answer is marked as the right
// one on screen -- a test that shows its key is a quiz.
//
// The score does not decide WHETHER you are sent after a cult. Everyone with
// a restricted essence is. It decides how hard a cult, and how many of them the
// Society needs to see dead before it believes you.
// ----------------------------------------------------------------------------
export const PERSONALITY_TEST = [
  {
    q: 'A village well has been fouled. The only cure you can offer would come from the essence we are discussing. The headwoman asks you not to. What do you do?',
    answers: [
      { label: 'Respect her wishes and find another way, even if it is slower.', score: 1 },
      { label: 'Explain what it would do and let her decide with the facts.', score: 0 },
      { label: 'Cure it. She will thank me when her children stop being sick.', score: -1 },
    ],
  },
  {
    q: 'You are offered a bargain by something that should not be able to speak. It knows your name. What do you do?',
    answers: [
      { label: 'Walk away and report it to the Society.', score: 1 },
      { label: 'Hear it out. Listening costs nothing.', score: 0 },
      { label: 'Ask what it wants for what it is offering.', score: -1 },
    ],
  },
  {
    q: 'A member of your team is dying. You could keep them on their feet a while longer, but not as themselves. Do you?',
    answers: [
      { label: 'No. I stay with them.', score: 1 },
      { label: 'Only if they asked me to while they still could.', score: 0 },
      { label: 'Yes. The team needs every pair of hands.', score: -1 },
    ],
  },
  {
    q: 'Why did you take this essence?',
    answers: [
      { label: 'It was what I had when I needed something. I did not choose it for what it is.', score: 1 },
      { label: 'Because it works, and I intend to use it carefully.', score: 0 },
      { label: 'Because people are afraid of it, and afraid people step aside.', score: -1 },
    ],
  },
  {
    q: 'Someone you beat in a fair fight begs you to spare them, and you know they will come back for you. What do you do?',
    answers: [
      { label: 'Spare them and hand them to the watch.', score: 1 },
      { label: 'Spare them, and make sure they understand what the next time costs.', score: 0 },
      { label: 'Finish it. Mercy is how you get stabbed in the back.', score: -1 },
    ],
  },
];

/** The band a total score falls in. */
export function testBand(total) {
  if (total >= 3) return 'steady';
  if (total >= 0) return 'guarded';
  return 'troubling';
}

/** What the assessor writes at the bottom of the form, per band. */
export const TEST_REMARKS = {
  steady: 'You answer like somebody who has thought about it. That counts for more than you would expect.',
  guarded: 'You are careful about what you say. The Society is careful about what it believes.',
  troubling: 'I will be honest with you: the form does not read well. The mission will be harder, and it will be watched.',
};

/** How many of the cult must fall, per band. */
export const EVAL_NEED = { steady: 6, guarded: 8, troubling: 10 };

/**
 * The cult an evaluation is sent after. Nearest in rank to the region's own,
 * one rank harder on a troubling form, and never a cult that runs one of the
 * restricted essences: sending a Death user to kill the Long Vigil would be
 * testing whether they are a Death user.
 */
export function evaluationCult(regionTier, band, seed = 0) {
  const want = Math.max(0, Math.min(RANK_ORDER.length - 1, (regionTier || 0) + (band === 'troubling' ? 1 : 0)));
  const pool = CULTS.filter(c => !isRestricted(c.essence));
  let best = Infinity;
  for (const c of pool) best = Math.min(best, Math.abs(RANK_ORDER.indexOf(c.rank) - want));
  const near = pool.filter(c => Math.abs(RANK_ORDER.indexOf(c.rank) - want) === best);
  const cult = near[Math.abs(seed | 0) % near.length];
  return { cult, tier: want };
}

// ----------------------------------------------------------------------------
// OUTLAWS, PER REGION.
//
// Round 271 records it; the hunters (round 274) and the bandit cities (round
// 273) read it. A player field, so saves carry it with no save code.
// ----------------------------------------------------------------------------
export function markOutlaw(player, regionId, reason) {
  if (!player || !regionId) return false;
  player.outlaw = player.outlaw || {};
  if (player.outlaw[regionId]) return false;
  player.outlaw[regionId] = { reason: reason || 'outlaw' };
  return true;
}

export function isOutlawIn(player, regionId) {
  return !!(player && player.outlaw && regionId && player.outlaw[regionId]);
}

/** Nothing in the module disagrees with itself. */
export function restrictedFaults() {
  const out = [];
  for (const [id, r] of Object.entries(RESTRICTED_ESSENCES)) {
    if (!r.opposite || isRestricted(r.opposite)) out.push(`${id}: its opposite must be an ordinary essence`);
  }
  for (const [i, t] of PERSONALITY_TEST.entries()) {
    const scores = t.answers.map(a => a.score).sort();
    if (scores.join() !== '-1,0,1') out.push(`question ${i + 1}: needs one answer of each score`);
  }
  for (const band of ['steady', 'guarded', 'troubling']) {
    if (!TEST_REMARKS[band] || !EVAL_NEED[band]) out.push(`band ${band}: missing remark or need`);
  }
  return out;
}
