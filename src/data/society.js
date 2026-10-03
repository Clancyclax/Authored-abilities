// ============================================================================
// ROUND 88 -- THE ADVENTURE SOCIETY.
//
// The biggest known gap in the build, deferred from round 78 to 79 to 80 and
// then unscheduled for six rounds. README.md has said "There is no guild quest
// chain yet. It is the biggest known gap" since round 81. This is it.
//
// THE USER'S DESIGN, verbatim, and it is the whole shape:
//
//   "1 plus pull the inspiration and actions from the notes for the guild
//    chain. Stars are about being an effective adventurer for 2 stars and a
//    politically savvy adventurer at 3 stars. Going up a rank drops you down a
//    star, higher rank = higher expectations."
//
// "1" is the rank ladder: contracts gated on rank, authored premises with
// generated objectives, the shape godQuests.js already proves works.
//
// WHY THE STAR MECHANIC IS THE GOOD PART, and why it is worth building rather
// than a plain 1..N progress bar:
//
//   Every other progression in this game only goes up. Rank goes up. Essence
//   standing goes up. God standing goes up. The star is the first number in
//   Sparkstone that can go DOWN, and it goes down for succeeding -- the moment
//   you reach Iron, your three stars as a Normal-rank adventurer become two
//   stars as an Iron one, because you are now being measured against Iron.
//
//   That is a real feeling and it is true to the setting: a Society that
//   re-grades you the day you get stronger is a Society with standards rather
//   than a shop that sells ranks. It also solves the thing that makes most
//   quest ladders go slack in the late game -- the ladder cannot be outgrown,
//   because outgrowing it is what resets it.
//
// THE THREE STARS ARE THREE DIFFERENT JOBS, not one job three times:
//
//   1 star   You are registered. Do the work: kill the thing, clear the cave,
//            bring the proof. Competence, demonstrated.
//   2 stars  "being an effective adventurer" -- the work, done well and
//            unsupervised. Longer contracts, harder quarry, and the Society
//            stops telling you how.
//   3 stars  "a politically savvy adventurer" -- the contracts stop being
//            about monsters. Who wants this done, who does not, and what the
//            Society will not say out loud. The quarry is a means.
//
// WHAT IT IS CAST FROM. Round 78's note says the chain was always meant to be
// cast from the cultists, priests and undead that round added. `cultists.js`
// holds ten fully authored cults -- name, rank, three-essence build, blurb,
// battle cry -- and has been imported by NOTHING since round 78: twenty
// spritesheets load every session to draw nobody. The three-star contracts are
// where they finally get used, because a cult is exactly the kind of problem
// that is political rather than martial.
// ============================================================================

import { RANK_ORDER } from './ranks.js';
import { CULTS, CULT_BY_SLUG } from './cultists.js';

/** The player field. An ordinary plain-data field, so saves.js's "copy every
 *  player field" loop carries it with no work -- the same reason `godChains`
 *  needed no save code (see saves.js's own note on that). */
export const SOCIETY_FLAG = 'society';

/** Ranks the Society grades at. Diamond is deliberately absent: there is no
 *  diamond-rank content anywhere in this build and there is not going to be. */
export const SOCIETY_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold'];

export const MAX_STARS = 3;

/**
 * How many contracts a star costs, per rank.
 *
 * Rising, because the whole point of the demotion is that the same star means
 * more at a higher rank. If a Gold star cost what a Normal one did, the
 * re-grade would be an inconvenience rather than a standard.
 */
export const STAR_CONTRACTS = { normal: 2, iron: 3, bronze: 3, silver: 4, gold: 4 };

/**
 * THE RE-GRADE. The user's rule, as a function.
 *
 * Rank up, lose a star. Never below one -- you are still a member, and a
 * Society that could demote you out of itself for getting stronger would be a
 * Society nobody sane would join. The floor is what makes it a standard rather
 * than a punishment.
 */
export function regradeOnRankUp(stars) {
  return Math.max(1, (stars || 1) - 1);
}

/** What the Society calls you. The name carries the flavour; the description
 *  states the mechanic -- so these are titles, and `starBrief` below is the
 *  plain statement of what the tier actually asks. */
export const STAR_TITLES = ['Registered', 'Contracted', 'Confidential'];

export const STAR_BRIEF = [
  'Ordinary contracts, posted openly. Do the work and bring the proof.',
  'Standing contracts, unsupervised. Harder quarry, and nobody checks on you.',
  'Sealed contracts. The Society will not say these were theirs.',
];

export function starTitle(stars) { return STAR_TITLES[Math.max(0, Math.min(2, (stars || 1) - 1))]; }
export function starBrief(stars) { return STAR_BRIEF[Math.max(0, Math.min(2, (stars || 1) - 1))]; }

/**
 * The contract vocabulary per star, and it narrows as it climbs.
 *
 * One star takes anything -- that is what a general membership is. Three stars
 * is `delve` and `hunt` only, because a sealed contract is a specific problem
 * in a specific place, and "kill six of whatever is out there" is not a thing
 * anyone seals.
 */
export const STAR_KINDS = {
  1: ['cull', 'hunt', 'gather', 'survey'],
  2: ['cull', 'hunt', 'delve', 'relic'],
  3: ['delve', 'hunt'],
};

/**
 * THE CONTRACTS.
 *
 * Five ranks x three stars. Each is an authored premise with a generated
 * objective under it -- the godQuests.js shape, and the reason that shape is
 * right is stated in that file's header: the six objective kinds are built,
 * asserted and hooked, and what a chain adds is which kinds it asks for and
 * every word the player reads.
 *
 * `giver` is who says it, and it moves up the building as the stars do: the
 * clerk at the desk handles registration, the Guildmaster hands out real work,
 * and at three stars you are not spoken to in the hall at all.
 *
 * `cult` names a cult from cultists.js where the contract is about one. Only
 * three-star contracts carry it, which is the whole distinction the user drew:
 * a cult is not a monster problem, it is a people problem with monsters in it.
 */
export const CONTRACTS = {
  normal: [
    {
      star: 1, title: 'The Registration Fee',
      giver: 'clerk',
      brief: 'Everyone starts here. There is a form, and there is a field, and the field is the part that matters. '
        + 'Bring back proof and I will stamp the form.',
      done: 'Stamped. You are on the roll.',
    },
    {
      star: 2, title: 'Nobody Is Coming',
      giver: 'yorin',
      brief: 'Second star means I stop sending someone with you. That is the whole difference and it is a large one. '
        + 'Take the contract, do not report in, come back when it is finished.',
      done: 'You came back. That is two.',
    },
    {
      star: 3, title: 'A Quiet Word About the Ossuary',
      giver: 'yorin', cult: 'bone',
      brief: 'The Pale Order keeps an ossuary and pays its dues to the town, so officially they are a burial society '
        + 'and officially I have no opinion. Go and find out what they are waiting for. If anyone asks, you were lost.',
      done: 'You were lost. I remember it clearly.',
    },
  ],
  iron: [
    {
      star: 1, title: 'The Iron Standard',
      giver: 'clerk',
      brief: 'You are Iron now, so you are back to one star. Same work, measured against what an Iron-ranker '
        + 'should be able to do. Most people find that harder than they expect.',
      done: 'Iron, and earning it.',
    },
    {
      star: 2, title: 'The Long Contract',
      giver: 'yorin',
      brief: 'This one runs longer than you will want it to. That is the test. An adventurer who is excellent for '
        + 'an afternoon is a liability on a fortnight.',
      done: 'Finished, and on time.',
    },
    {
      star: 3, title: 'An Hour For An Hour',
      giver: 'yorin', cult: 'blood',
      brief: 'The Red Hour has a member on the town council. I am not telling you that so you can do anything about '
        + 'it. I am telling you so that when you go and deal with their people in the field, you understand why '
        + 'this contract does not exist.',
      done: 'It never existed.',
    },
  ],
  bronze: [
    {
      star: 1, title: 'Re-Graded',
      giver: 'clerk',
      brief: 'Bronze. One star. You know how this works by now, and knowing how it works does not make it shorter.',
      done: 'Bronze, and on the board again.',
    },
    {
      star: 2, title: 'Without Instruction',
      giver: 'yorin',
      brief: 'I am not going to tell you which one, or where, or how many. A Bronze second star is somebody who can '
        + 'be handed a problem instead of a task.',
      done: 'You worked it out. Good.',
    },
    {
      star: 3, title: 'The Unmade Are Not Our Business',
      giver: 'yorin', cult: 'void',
      brief: 'The Unmade have been in the Undercity for longer than the Society has been in Cadence, and there is a '
        + 'standing agreement that we do not go down there. I am not asking you to break it. I am asking you to be '
        + 'somewhere near it, for reasons of your own, and to tell me what you saw.',
      done: 'Nothing to report. Officially.',
    },
  ],
  silver: [
    {
      star: 1, title: 'The Silver Roll',
      giver: 'clerk',
      brief: 'Silver. There are eleven people on this roll and you are the eleventh. Start again.',
      done: 'Eleven of eleven.',
    },
    {
      star: 2, title: 'What The Board Does Not Post',
      giver: 'yorin',
      brief: 'The board carries what a town will pay for. This is the other list -- the things that need doing that '
        + 'nobody has thought to want yet. There is no bounty on it because nobody has died of it so far.',
      done: 'And now nobody will.',
    },
    {
      star: 3, title: 'The Gilded Mouth',
      giver: 'yorin', cult: 'gold',
      brief: 'The Gilded Mouth funds two of our chapter houses. I want you to understand that completely before you '
        + 'go. Whatever you find, you bring to me and to nobody else, and if you decide the right thing to do is '
        + 'nothing, I will accept that answer.',
      done: 'I will accept that answer.',
    },
  ],
  gold: [
    {
      star: 1, title: 'The Last Re-Grade',
      giver: 'clerk',
      brief: 'Gold. One star. You are one of a handful of people this Society can honestly say it does not outrank.',
      done: 'One star at Gold is worth more than three at Iron. Everybody says so. Nobody believes it until they get here.',
    },
    {
      star: 2, title: 'The Standard You Set',
      giver: 'yorin',
      brief: 'At this point the contracts are not testing you. They are being written down as what a Gold-ranker did, '
        + 'so that the next one has something to be measured against. Do it properly.',
      done: 'Written down.',
    },
    {
      star: 3, title: 'What The Society Is For',
      giver: 'yorin', cult: 'deep',
      brief: 'The Drowned Choir is not a cult. It is three of our own chapter houses that stopped filing reports '
        + 'four years ago and started filing something else. You are the only person I can send who does not have '
        + 'a reason to protect them.',
      done: 'Then it is done, and I am sorry it was you.',
    },
  ],
};

/** The Society's own vocabulary of quarry, so its contracts do not read like
 *  the god chains'. Deliberately broad at one star and narrow at three. */
export const SOCIETY_FAMILIES = {
  1: ['rat', 'slime', 'wolf', 'boar'],
  2: ['raptor', 'saberCanis', 'spider', 'wraith'],
  3: ['wraith', 'revenant', 'drake'],
};

export const SOCIETY_SITES = { 1: ['mineCave'], 2: ['barrow', 'mineCave'], 3: ['cultChamber', 'hiddenLair'] };

/** A fresh membership. One star at Normal, nothing paid out yet. */
export function newSocietyState() {
  return { rank: 'normal', stars: 1, done: 0, paid: [], joined: false, everRanks: [] };
}

/** The contract a state is currently on, or null when the tier is finished. */
export function currentContract(st) {
  if (!st || !st.joined) return null;
  const list = CONTRACTS[st.rank];
  if (!list) return null;
  return list.find(c => c.star === st.stars) || null;
}

/** How many of this tier's contracts are still owed. */
export function contractsNeeded(st) {
  return STAR_CONTRACTS[st.rank] || 3;
}

/** A stable id for a step, so the offer can be cached and seeded off it -- the
 *  same rule `_godStepOffer` follows, and for the reason its note gives: a step
 *  that picked a different monster every time the player reopened the dialogue
 *  would be unfinishable. */
export function societyStepId(st, n) {
  return `society|${st.rank}|${st.stars}|${n}`;
}

/** The kinds and quarry this tier asks in. */
export function societyPref(st) {
  return {
    kinds: STAR_KINDS[st.stars] || STAR_KINDS[1],
    families: SOCIETY_FAMILIES[st.stars] || SOCIETY_FAMILIES[1],
    siteKeys: SOCIETY_SITES[st.stars] || SOCIETY_SITES[1],
  };
}

/**
 * Advance one contract. Returns what CHANGED, so the caller can say it out
 * loud rather than recomputing it -- the round-85 lesson that an advancement
 * the player is not told about did not happen for them.
 */
export function completeContract(st) {
  const out = { star: false, tier: false };
  st.done = (st.done || 0) + 1;
  if (st.done >= contractsNeeded(st)) {
    st.done = 0;
    if (st.stars < MAX_STARS) { st.stars++; out.star = true; }
    else out.tier = true;    // three stars at this rank: nothing more until you rank up
  }
  return out;
}

/**
 * THE RE-GRADE, applied. Called when the player's rank rises.
 *
 * Returns null when nothing happened, or a description of what did, because
 * this is the one progression event in the game that costs the player
 * something and it must never happen silently.
 */
export function applyRankUp(st, newRank) {
  if (!st || !st.joined) return null;
  if (!SOCIETY_RANKS.includes(newRank)) return null;
  if (RANK_ORDER.indexOf(newRank) <= RANK_ORDER.indexOf(st.rank)) return null;
  const before = { rank: st.rank, stars: st.stars };
  st.rank = newRank;
  st.stars = regradeOnRankUp(st.stars);
  st.done = 0;
  if (!st.everRanks.includes(newRank)) st.everRanks.push(newRank);
  return { before, after: { rank: st.rank, stars: st.stars } };
}

/** The line the Society says when it re-grades you. The mechanic is stated
 *  plainly, because a demotion the player has to infer reads as a bug. */
export function regradeLines(change) {
  if (!change) return [];
  const { before, after } = change;
  return [
    `Your rank has risen to ${cap(after.rank)}.`,
    `The Adventure Society has re-graded you: ${before.stars} ${plural(before.stars)} at ${cap(before.rank)} `
      + `becomes ${after.stars} ${plural(after.stars)} at ${cap(after.rank)}.`,
    `You are held to what ${article(after.rank)} ${cap(after.rank)}-rank adventurer should be able to do now. `
      + 'The work is the same. The standard is not.',
    `[ ${starTitle(after.stars)} — ${starBrief(after.stars)} ]`,
  ];
}

function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
/** "a Bronze-rank adventurer" but "an Iron-rank adventurer". Small, and the
 *  kind of thing that makes generated prose read as generated. */
function article(rank) { return /^[aeiou]/i.test(String(rank || '')) ? 'an' : 'a'; }
function plural(n) { return n === 1 ? 'star' : 'stars'; }

/** Pay for a finished tier. Rides the rank ladder rather than inventing one. */
export const SOCIETY_PAY = { normal: 60, iron: 150, bronze: 320, silver: 600, gold: 1000 };
export function contractPay(st) {
  return Math.round((SOCIETY_PAY[st.rank] || 60) * (1 + (st.stars - 1) * 0.6));
}

/**
 * The fault check. Everything here is a promise to the player that is easy to
 * break silently in a data table:
 *
 *   - every rank has exactly three stars' worth of contracts, in order
 *   - every contract has the prose the dialogue reads
 *   - every cult a contract names is a real cult in cultists.js
 *   - only three-star contracts are about cults, which is the user's own
 *     distinction and the thing that makes the third star a different job
 *   - the re-grade can never drop a member below one star, at any rank
 *   - a tier is always reachable: the kinds it asks for are kinds the quest
 *     system actually builds
 */
export const KNOWN_KINDS = ['cull', 'hunt', 'gather', 'survey', 'delve', 'relic'];

export function societyFaults() {
  const out = [];
  for (const rank of SOCIETY_RANKS) {
    const list = CONTRACTS[rank];
    if (!list) { out.push(`no contracts at ${rank}`); continue; }
    if (list.length !== MAX_STARS) out.push(`${rank} has ${list.length} contracts, not ${MAX_STARS}`);
    list.forEach((c, i) => {
      if (c.star !== i + 1) out.push(`${rank} contract ${i} is star ${c.star}`);
      for (const f of ['title', 'brief', 'done', 'giver']) {
        if (!c[f]) out.push(`${rank} star ${c.star} has no ${f}`);
      }
      if (c.cult && !CULT_BY_SLUG[c.cult]) out.push(`${rank} star ${c.star} names unknown cult ${c.cult}`);
      if (c.cult && c.star !== 3) out.push(`${rank} star ${c.star} is about a cult but is not a third-star contract`);
      if (c.star === 3 && !c.cult) out.push(`${rank} star 3 is not about anybody`);
    });
    if (!STAR_CONTRACTS[rank]) out.push(`${rank} has no contract count`);
    if (!SOCIETY_PAY[rank]) out.push(`${rank} has no pay`);
  }
  // The re-grade floor, asserted rather than trusted.
  for (let s = 1; s <= MAX_STARS; s++) {
    if (regradeOnRankUp(s) < 1) out.push(`a rank-up from ${s} stars drops a member out of the Society`);
    if (s > 1 && regradeOnRankUp(s) >= s) out.push(`a rank-up from ${s} stars does not cost a star`);
  }
  // Rising expectations, asserted: the same star must cost more at each rank.
  for (let i = 1; i < SOCIETY_RANKS.length; i++) {
    const a = STAR_CONTRACTS[SOCIETY_RANKS[i - 1]], b = STAR_CONTRACTS[SOCIETY_RANKS[i]];
    if (b < a) out.push(`${SOCIETY_RANKS[i]} asks less than ${SOCIETY_RANKS[i - 1]}`);
  }
  // Every kind the ladder asks for has to be a kind the quest system builds,
  // or a tier is a dead end the player can reach and not leave.
  for (const s of [1, 2, 3]) {
    for (const k of STAR_KINDS[s]) if (!KNOWN_KINDS.includes(k)) out.push(`star ${s} asks for unknown kind ${k}`);
    if (!STAR_KINDS[s].length) out.push(`star ${s} asks for nothing`);
    if (!(SOCIETY_FAMILIES[s] || []).length) out.push(`star ${s} has no quarry`);
  }
  // No diamond content, anywhere, ever. A standing directive with its own
  // check because a table is exactly where it would come back.
  if (SOCIETY_RANKS.includes('diamond')) out.push('the Society grades at diamond');
  // The cults the chain uses must be the authored ones rather than invented.
  const used = [];
  for (const rank of SOCIETY_RANKS) for (const c of (CONTRACTS[rank] || [])) if (c.cult) used.push(c.cult);
  if (new Set(used).size !== used.length) out.push('two contracts are about the same cult');
  if (!used.length) out.push('the chain never uses the cult roster');
  return out;
}

/** A census, for the notes and for a suite to print. */
export function societyCensus() {
  let contracts = 0, cults = 0, steps = 0;
  for (const rank of SOCIETY_RANKS) {
    for (const c of (CONTRACTS[rank] || [])) { contracts++; if (c.cult) cults++; }
    steps += STAR_CONTRACTS[rank] * MAX_STARS;
  }
  return { ranks: SOCIETY_RANKS.length, contracts, cults, steps, cultsAvailable: CULTS.length };
}
