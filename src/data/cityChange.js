// ===========================================================================
// ROUND 170 (items 2.2 and 2.3) -- THE MARCH OF TIME, IN THE CITIES.
//
// THE USER, asked where the years sit and who fills the streets:
//
//   "Act 1 is NEK
//    In Act 2 Cadence changes a little
//    In Act 3 Cadence and the Act 2 cities change a little more.
//    When the player reaches the 2nd region of Act 3 they are summoned to
//    defend the previous cities from the monster surge
//    When the surge is done the cities that survived are changed a little
//    more, and the cities that fell are reduced to rubble and bodies
//    In Act 4 Cadence, the Act 2, and Act 3 cities change again.
//
//    These are meant to show the march of time."
//
// ...and, on who the newcomers are: refugees from the wilds.
//
// ---------------------------------------------------------------------------
// WHAT THIS CORRECTS ABOUT MY OWN PLAN
// ---------------------------------------------------------------------------
// I was going to hang this on the ERA, because round 165's eras are the thing
// in this codebase that already means "time has passed". That would have been
// wrong in a way worth writing down: an era is keyed on RANK, so every city in
// the world would have changed at the same instant, the moment the player's
// weakest essence ticked over -- including the city the player is standing in
// for the first time. The user's schedule is not one clock. It is a LADDER PER
// CITY, and a city only starts changing once the player has left its act
// behind.
//
// A city the player has not finished with yet is the present, and the present
// does not show the march of time. That is why Vashra has no row below: Act 4
// is where the player IS, so Act 4's city is not somewhere they come back to.
//
// ---------------------------------------------------------------------------
// THE FOUR MILESTONES, AND WHY THEY ARE NOT FOUR NUMBERS
// ---------------------------------------------------------------------------
// Three of them are positions in the division chain and the fourth is the
// surge resolving. Keyed off `ACT2_FIRST`/`ACT3_FIRST`/`ACT4_FIRST` and
// `surgeOver` rather than written as stage indices, for the reason division.js
// states about its own seams: "so that adding a stage to Act 3 does not
// silently move what a test believes Act 4 is".
// ===========================================================================

import { SURGE_REGIONS } from './surge.js';
import { REGION_ACT, ACT_ORDER } from './acts.js';

export const MILESTONE = {
  ACT2: 'act2',
  ACT3: 'act3',
  SURGE: 'surge',     // the surge resolved, one way or the other
  ACT4: 'act4',
};

/** In the order they happen. The surge resolves in ACT 3.5 -- the Cinderwaste
 *  -- so it still sits between ACT3 and ACT4, and for a sharper reason than
 *  before: round 179 made Act 3.5 the place the surge is announced, and Act 4
 *  the first thing the player does once it is over. */
export const MILESTONE_ORDER = [MILESTONE.ACT2, MILESTONE.ACT3, MILESTONE.SURGE, MILESTONE.ACT4];

/**
 * WHICH MILESTONES MOVE WHICH CITY -- the user's table, transcribed.
 *
 * Read it as: a city is moved by every milestone that comes AFTER its own act.
 * Cadence is Act 1's, so all four move it. Karsk Landing is Act 3's, so only
 * the surge and Act 4 do. Vashra is Act 4's and nothing moves it, because the
 * player has not left it yet.
 *
 * Written out rather than derived from an act number, because the derivation
 * would be one line and a reader would have to reconstruct the user's sentence
 * from it. This IS the sentence.
 */
export const CITY_MILESTONES = {
  nek:      [MILESTONE.ACT2, MILESTONE.ACT3, MILESTONE.SURGE, MILESTONE.ACT4],
  ontaria:  [MILESTONE.ACT3, MILESTONE.SURGE, MILESTONE.ACT4],
  // ROUND 179 -- Tolbrand Quay, Act 2.5's city. The same three that move
  // Harrowmoor move it, because the same three things happen after you leave
  // it: the island is a limb off Ontaria and the player comes back the way
  // they went. It TIES with Ontaria rather than sitting between Ontaria and
  // Elehyd, and the monotonic check below is `>` rather than `>=` precisely so
  // a tie is allowed -- two cities left at the same point in the story have
  // the same amount of story left to be changed by.
  sirukh:   [MILESTONE.ACT3, MILESTONE.SURGE, MILESTONE.ACT4],
  elehyd:   [MILESTONE.SURGE, MILESTONE.ACT4],
  bratugal: [],
};

/**
 * The act each region belongs to, for the lines below to speak about.
 *
 * ROUND 179 -- this was `{ nek: 1, ontaria: 2, elehyd: 3, bratugal: 4 }`, one
 * of seven hardcoded copies of the four-region spine. It reads acts.js now,
 * which is the only place the ordering is written, and it covers all seven
 * regions rather than the four this file happened to need.
 */
export { REGION_ACT };

/** How far along a city is: 0 is as the player first saw it. */
export function cityStage(regionId, reached) {
  const mine = CITY_MILESTONES[regionId] || [];
  let n = 0;
  for (const m of mine) if (reached && reached[m]) n++;
  return n;
}

/** The most a city can change. Cadence's four is the longest ladder. */
export const MAX_STAGE = Math.max(...Object.values(CITY_MILESTONES).map(x => x.length));

// ===========================================================================
// WHAT CHANGES
//
// "Refugees from the wilds" -- the hamlets and the farms empty and the walls
// fill up. TWO NUMBERS MOVE IN OPPOSITE DIRECTIONS and that is the whole
// effect: a city that only gained people would read as prosperity.
//
//   refugees   people inside the walls who are not from here
//   outlying   what is left of the crowd in that region's hamlets and
//              villages, as a share of what was there
//
// The numbers are per STAGE, not per act, so one ladder serves a city that
// climbs four rungs and a city that climbs two.
// ===========================================================================
export const CITY_STAGE = [
  // stage 0 -- as the player found it.
  { refugees: 0,  outlying: 1.00, label: null },
  // stage 1 -- "changes a little". People are in from the outlying farms for
  // the season, or say they are.
  { refugees: 6,  outlying: 0.80, label: 'fuller than it was' },
  // stage 2 -- "a little more". The word has got round; nobody is calling it
  // a season any more.
  { refugees: 14, outlying: 0.55, label: 'crowded' },
  // stage 3 -- after the surge, in a city that held. Everyone who could get
  // behind a wall did, and most of them are still behind it.
  { refugees: 24, outlying: 0.25, label: 'packed to the walls' },
  // stage 4 -- Act 4. Years on, and the camp inside the walls is the town now.
  { refugees: 30, outlying: 0.15, label: 'a city of strangers' },
];

/**
 * What the street says, per stage, in a city that is filling up.
 *
 * SIX PER STAGE and none of them refers to another, for the same reason
 * eras.js's do not: the player meets them in whatever order they walk past
 * people, and a line that is the second half of something is a line that is
 * usually wrong.
 */
export const CITY_STAGE_LINES = {
  1: [
    '"There\'s a family on the green in a tent. Since spring, that."',
    '"My brother\'s lot have the back room. It was only ever full of boxes."',
    '"Rent\'s up twice and nobody\'s built anything."',
    '"More people at market. Good for me. I\'ll not pretend otherwise."',
    '"Someone\'s been sleeping in the mill. Nobody\'s said anything to him."',
    '"Busier, isn\'t it."',
  ],
  2: [
    '"Nobody says \'til harvest\' now. Have you noticed that?"',
    '"Three families in our house. The baby has the good room, which is fair."',
    '"I don\'t know a single door on this street."',
    '"There\'s a boy in the yard who won\'t say where he walked from."',
    '"We were full a while back. I don\'t know what this is."',
    '"Mind your bag in the crowd. I\'m not saying who."',
  ],
  3: [
    '"Everyone\'s in who\'s coming in."',
    '"There\'s a man asleep under the altar of Purity and nobody minds."',
    '"I heard four languages at the stalls. I only have the one."',
    '"Gates open at dawn and shut at noon. Nobody argues about noon."',
    '"You can tell who came in late. They still flinch at the bell."',
    '"I\'ve stopped going up on the wall to look."',
  ],
  4: [
    '"The camp\'s got street names now. Painted, proper ones."',
    '"My daughter\'s eleven and has never been outside these walls."',
    '"Eleven years I was a refugee. Then one day I was just from here."',
    '"There\'s more of them than us now. We don\'t say it."',
    '"There are shrines in this city to gods I\'d never heard of."',
    '"It held. My father didn\'t think it would."',
  ],
};

export function cityStageLine(stage, speakerName, heard) {
  const pool = CITY_STAGE_LINES[stage];
  if (!pool || !pool.length) return null;
  const had = heard || [];
  const left = pool.filter(l => !had.includes(l));
  if (!left.length) return null;
  let h = 0;
  const key = `${stage}|${speakerName || ''}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return left[h % left.length];
}

// ===========================================================================
// THE PEOPLE THEMSELVES.
//
// Not named characters -- there are thirty of them in a city at stage 4 and
// authoring thirty people per city is how a table gets written once and never
// read. What IS authored is where they came from and what that does to them,
// and the name is drawn from the world's own villager names so they sit
// alongside everybody else.
// ===========================================================================
export const REFUGEE_ORIGINS = [
  { from: 'a smallholder from two days east', line: '"We\'re on the list for a room. They said six weeks. That was six weeks back, but they\'ve a lot on."' },
  { from: 'a shepherd', line: '"Nine of them left. They\'re in the yard behind the tannery and the tanner\'s been decent about it."' },
  { from: 'a miller', line: '"I keep thinking about the stone. It\'d still be there. A stone doesn\'t burn."' },
  { from: 'a road warden', line: '"Eighteen years I kept that road. Nobody\'s asked me for the maps."' },
  { from: 'a charcoal burner', line: '"I\'ve a stack still banked up out there. Be ash by now, I should think."' },
  { from: 'a fisher', line: '"We put in at the wrong harbour and now we\'re foreign. I hold a licence for a port I can\'t get to."' },
  { from: 'a hedge-witch', line: '"People still ask me about the weather. I tell them what they want to hear."' },
  { from: 'a farrier', line: '"They\'ve got me on gate hinges. Hinges."' },
  { from: 'a widow off the moor', line: '"It\'s a good room. Good window. I keep the door shut, is all."' },
  { from: 'a boy with nobody', line: 'He won\'t say. Somebody in the yard reckons four days\' walk. He eats like it was more.' },
  { from: 'a carter', line: '"Three loads I got out. I don\'t know why it\'s three I remember."' },
  { from: 'a bell-founder', line: '"They\'ll want bells again. Somebody will want bells."' },
];

/** Faults in this file's own tables. */
export function cityChangeFaults() {
  const out = [];
  const ms = new Set(Object.values(MILESTONE));
  for (const [id, list] of Object.entries(CITY_MILESTONES)) {
    // ROUND 179 -- was `SURGE_REGIONS.includes(id)`, which stopped being the
    // right question the moment Bratugal left that list. A city can be moved
    // by the march of time without being one the surge asks you to defend --
    // Vashra is exactly that now, reached after the surge is already over --
    // so what a row here has to name is a region ON THE SPINE.
    if (!ACT_ORDER.includes(id)) out.push(`${id} is in no act, so no milestone can move it`);
    for (const m of list) if (!ms.has(m)) out.push(`${id}: unknown milestone '${m}'`);
    // A city's milestones must be in the order they happen, or a later one
    // could be counted before an earlier one.
    const idx = list.map(m => MILESTONE_ORDER.indexOf(m));
    for (let i = 1; i < idx.length; i++) {
      if (idx[i] <= idx[i - 1]) out.push(`${id}: milestones out of order`);
    }
    if (list.length > CITY_STAGE.length - 1) {
      out.push(`${id} climbs ${list.length} rungs and there are only ${CITY_STAGE.length - 1}`);
    }
  }
  // Every city that CAN fall is named, so none is silently left out.
  for (const id of SURGE_REGIONS) {
    if (!CITY_MILESTONES[id]) out.push(`${id} has no schedule at all`);
    if (!REGION_ACT[id]) out.push(`${id} belongs to no act`);
  }
  // THE USER'S OWN SHAPE, checked rather than trusted: Cadence moves most,
  // and a city later in the story moves less than one earlier.
  const lens = SURGE_REGIONS.map(id => (CITY_MILESTONES[id] || []).length);
  for (let i = 1; i < lens.length; i++) {
    if (lens[i] > lens[i - 1]) out.push('a later act\'s city changes more than an earlier one\'s');
  }
  // ROUND 179 -- still true, and now for a stronger reason. Vashra was Act 4's
  // city and the player was assumed to be living there; it is now a city the
  // player CANNOT REACH until the surge has resolved, so there is no stretch
  // of the story during which it could be somewhere they come back to.
  if ((CITY_MILESTONES.bratugal || []).length !== 0) {
    out.push('Act 4\'s own city changes before the player has ever seen it');
  }
  // The two numbers have to move in opposite directions, or the effect is
  // "the world got busier" rather than "the world came inside".
  for (let i = 1; i < CITY_STAGE.length; i++) {
    if (!(CITY_STAGE[i].refugees > CITY_STAGE[i - 1].refugees)) {
      out.push(`stage ${i}: no more refugees than stage ${i - 1}`);
    }
    if (!(CITY_STAGE[i].outlying < CITY_STAGE[i - 1].outlying)) {
      out.push(`stage ${i}: the outlying settlements did not empty any further`);
    }
    if (!CITY_STAGE_LINES[i] || CITY_STAGE_LINES[i].length < 4) {
      out.push(`stage ${i}: fewer than four things to say`);
    }
  }
  if (CITY_STAGE[0].refugees !== 0 || CITY_STAGE[0].outlying !== 1) {
    out.push('stage 0 is not the world as the player found it');
  }
  const lines = Object.values(CITY_STAGE_LINES).flat();
  if (new Set(lines).size !== lines.length) out.push('two stages share a line');
  const origins = REFUGEE_ORIGINS.map(o => o.line);
  if (new Set(origins).size !== origins.length) out.push('two refugees say the same thing');
  if (REFUGEE_ORIGINS.length < 8) out.push('too few origins: the city would repeat itself');
  return out;
}
