// ============================================================================
// ROUND 295 -- 5.9, THE PETITION FOR REINSTATEMENT (outlaw arc, O2 + O3).
//
// The user, round 291: "5.9) If the player keeps civilian casualties to a
// minimum the outlaw story should have an opportuinity at silver rank before
// the monster surge starts to meet with an adventure society official and
// petition for their reinstatement as well as the companions."
//
// Round 292: "Outlaw arc, both 2 and 3." So Prism (O2) is the one who brings
// the official, and the underworld's record of the Division (O3,
// divisionRecord.js) is what the player trades.
//
// Round 295, on the companions: "Decided per companion." Each outlaw
// companion in the party answers the adjudicator. A redeemed arc is pardoned,
// a hardened one refuses and goes back to its bandit city, and an unsure one
// is pardoned only if the player vouches for them.
//
// THE GATE (`petitionOpen`), all of it, in one place:
//   - on the outlaw route
//   - Silver or above
//   - the surge has not begun ("before the monster surge starts")
//   - clean hands: civilians at or under CIVILIAN_PETITION_LIMIT (depravity.js)
//   - the record holds RECORD_NEED pages
//   - not already petitioned
//
// Prism's notes (O2): she leaves one after each fight she walks away from.
// On clean hands she is trying to understand the player; on dirty hands she
// is building a case.
// ============================================================================
import { RANK_ORDER } from './ranks.js';
import { CIVILIAN_PETITION_LIMIT } from './depravity.js';
import { RECORD_NEED } from './divisionRecord.js';

export const PETITION_RANK = 'silver';

/** The adjudicator. The same woman in Society grey the player meets at
 *  Slagward when the surge breaks; this is earlier, and she has a name. */
export const ADJUDICATOR = {
  name: 'Adjudicator Hesper Lane',
  short: 'Lane',
  art: ['npc_confident_woman', 'npc_female_adventurer', 'npc_noble_standing'],
  dialogue: 'A woman in Society grey, with a satchel of files and no escort. She looks at you the way a clerk looks at a form that has been filled in wrong.',
};

/**
 * Whether the petition can be made now, and if not, why not.
 * @param {object} p        the player
 * @param {object} s        { outlaw, rank, surgeBegun, civilians, pages }
 */
export function petitionOpen(p, s) {
  const pet = (p && p.petition) || {};
  if (pet.done) return { ok: false, why: 'done' };
  if (pet.closed) return { ok: false, why: pet.closed };
  if (!s.outlaw) return { ok: false, why: 'notOutlaw' };
  if (RANK_ORDER.indexOf(s.rank) < RANK_ORDER.indexOf(PETITION_RANK)) return { ok: false, why: 'rank' };
  if (s.surgeBegun) return { ok: false, why: 'surge' };
  if ((s.civilians || 0) > CIVILIAN_PETITION_LIMIT) return { ok: false, why: 'civilians' };
  if ((s.pages || 0) < RECORD_NEED) return { ok: false, why: 'record' };
  return { ok: true, why: null };
}

/** Which way an outlaw companion goes when asked, from their arc. */
export function companionVerdict(state) {
  return state === 'redeemed' ? 'pardoned' : state === 'hardened' ? 'refused' : 'vouch';
}

// ---- Prism's notes -----------------------------------------------------------
//
// One after each fight she walks away from, in order, the last repeating.
// `clean`: she is trying to understand you. `dirty`: she is building a case.
export const PRISM_NOTES = [
  {
    clean: 'I was told you were a murderer. You had every chance to finish me today and you kept backing off. I\'m writing that down, because nobody at the Society will. — P.',
    dirty: 'Every time we meet, I write it up for the Society. This is the first page of your file. I\'d like the rest of it to be short. — P.',
  },
  {
    clean: 'The crews say you ask about the Department\'s carts. So do I. If you find out where they went, tell me before you tell anyone else. — P.',
    dirty: 'Two more names went into your file this week. I read them out at the hall so somebody would say them. — P.',
  },
  {
    clean: 'I asked the Society what you actually did. The answer was much shorter than the poster. — P.',
    dirty: 'The Society asked me whether you can be brought in alive. I said yes. I\'m less sure than I sounded. — P.',
  },
  {
    clean: 'There is a woman at the Society who hears petitions from people they\'ve struck off. She has heard four and granted one. Get to Silver, bring her something she can use, and keep your hands clean. — P.',
    dirty: 'I\'m building the case against you properly now, with dates and witnesses. Nobody will be able to argue with it. — P.',
  },
  {
    clean: 'Whatever you\'re collecting about the Division, keep at it. It may be the only thing the Society will listen to. — P.',
    dirty: 'This is my last note. After this I come with a warrant and a full team. — P.',
  },
];

/** Her note after the nth fight (1-based). */
export function prismNoteFor(n, clean) {
  const note = PRISM_NOTES[Math.max(0, Math.min(PRISM_NOTES.length - 1, (n || 1) - 1))];
  return clean ? note.clean : note.dirty;
}

// ---- The meeting --------------------------------------------------------------

export const PETITION_LINES = {
  parley: '"I\'m not here to fight." Prism keeps her hands where you can see them.\n\n'
    + '"There\'s a Society adjudicator on the road behind me. She hears petitions from people who\'ve been struck off. '
    + 'I told her about you, and about what you\'ve been collecting on the Division. Stay here. She\'ll come to you."',
  parleyLeft: 'Prism waits until you are out of sight, then goes. A note is pinned where she was standing: "Next time, stay put. — P."',
  arrive: 'The adjudicator walks up the road alone. Prism falls in a step behind her.',
  intro: '"Prism says you have a record of the Division from the other side of the law. Show me."',
  read: (titles) => `She reads every page standing up: ${titles}.\n\n`
    + '"The Society has been chasing these people for two years. You did this in a season, from the wrong side of the law."',
  hands0: '"Your file says you robbed. It says nobody died by your hand. I checked."',
  hands1: '"Your file has one death on it. Prism tells me it is the only one. I\'ll take her word for it, once."',
  crew: '"Now the people you travel with."',
  vouchAsk: (name) => `Lane turns to you. "${name} won't answer for themselves. Will you answer for them?"`,
  vouchYes: (name) => `Lane writes ${name}'s name down. "On your word, then. Your word is on file now too."`,
  vouchNo: (name) => `Lane crosses ${name}'s name off. ${name} shrugs and walks back toward the crews.`,
  verdict: (names) => 'Lane signs the last sheet and hands it to Prism to witness.\n\n'
    + `"The Society reinstates you at your rank${names ? `, and ${names} with you` : ''}. `
    + 'Your outlaw status is struck from every region. The record comes with me, and so will you when we need a witness."\n\n'
    + 'Prism signs under her name. "I\'ll walk back with you, if you\'ll have me."',
  verdictNote: '[ You are reinstated with the Adventure Society. You are no longer an outlaw anywhere. Prism has rejoined you. ]',
  act4: 'A Society courier finds you on the road with a letter from Adjudicator Lane.\n\n'
    + '"Vashra. The trail from your record ends there. Go as the Society\'s witness, and take your record with you."',
  closedSurge: 'The surge has begun. Whatever Prism was arranging with the Society, there is nobody left to hear it now.',
};

/** Each outlaw companion's answer, by where their arc came to. */
export const PETITION_ANSWERS = {
  lucy: {
    ask: '"Lucy. You\'re on the Roadwolves\' roll for eleven robberies."',
    redeemed: '"Twelve. You missed one." Lucy shrugs. "I\'m done with it, though. I\'d rather hit the ones who hit back, and you lot pay for that."',
    unsure: 'Lucy looks at you instead of at Lane. "Ask them. They know what I\'m like better than I do."',
    hardened: '"I\'m not signing anything. I was born on the road and I\'ll die on it. Good luck with your badge." She walks off toward Gallowsreach without looking back.',
  },
  jole: {
    ask: '"Jole. You were a priest of the Healer."',
    redeemed: '"I still am, on alternate days. I keep a ledger of who I heal for nothing. I\'d like to keep adding to it somewhere I\'m not being shot at."',
    unsure: '"I would like to say yes. Avarice would like me to ask what it pays. Ask my friend here. Their judgement is better than either of ours."',
    hardened: '"Reinstatement is a debt with better manners. I\'ll pass." He bows to Lane and walks back to his church.',
  },
  ariani: {
    ask: '"Ariani. Three counts of fraud, and one of selling a person."',
    redeemed: '"Twice, technically. I\'d like to stop. Doing it the other way has turned out to be more interesting."',
    unsure: 'Ariani studies Lane for a long moment, then you. "Darling, you decide. I\'ll know whether I like the answer when I hear it."',
    hardened: '"Pardon me? No, thank you. I\'d have to stop." She kisses your cheek and walks away toward Tollmarket.',
  },
  slice: {
    ask: '"Slice. You held a Bronze badge once."',
    redeemed: '"I did. I still read contracts the way the Society taught me. I\'ve started tearing up the wrong ones. Put me back on the books and I\'ll tear them up for you."',
    unsure: '"I go where the work is. Whether that\'s here depends on what my employer says about me." He nods at you.',
    hardened: '"I have a list with eleven names left on it. Your Society can have me when it\'s empty." He leaves the way he came.',
  },
};

/** Every line in this file, for the house tells. */
export function petitionLines() {
  const out = [];
  for (const n of PRISM_NOTES) out.push(n.clean, n.dirty);
  for (const [k, v] of Object.entries(PETITION_LINES)) {
    out.push(typeof v === 'function' ? v(k === 'read' ? 'a waybill, a reading, a ledger' : 'Lucy') : v);
  }
  for (const a of Object.values(PETITION_ANSWERS)) out.push(a.ask, a.redeemed, a.unsure, a.hardened);
  out.push(ADJUDICATOR.dialogue);
  return out;
}

/** Nothing here disagrees with itself. */
export function petitionFaults(outlawIds = null) {
  const out = [];
  if (PRISM_NOTES.length < 4) out.push('fewer than four notes');
  for (const [i, n] of PRISM_NOTES.entries()) if (!n.clean || !n.dirty) out.push(`note ${i + 1}: both ways`);
  if (outlawIds) for (const id of outlawIds) {
    const a = PETITION_ANSWERS[id];
    if (!a || !a.ask || !a.redeemed || !a.unsure || !a.hardened) out.push(`${id}: no full answer`);
  }
  for (const id of Object.keys(PETITION_ANSWERS)) if (outlawIds && !outlawIds.includes(id)) out.push(`${id}: not an outlaw companion`);
  return out;
}
