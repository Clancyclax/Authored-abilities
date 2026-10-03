// ===========================================================================
// ROUND 166 (item 3) -- THE MONSTER SURGE.
//
// THE USER:
//   "3) Monster Surge : Every decade there is a massive increase in the spawn
//    rate of monsters. All across the world, all at the same time. Whole
//    villages evacuate to fortified towns."
//   "In act 3 part 2 the monster surge will kick off."
//   "3.1) During the surge each city in the first 3 acts will need help. The
//    player can only help defend 3 of the cities from Act 1 or 2 and the surge
//    ends once they have completed the monster surge quest chains for 3/4
//    regions."
//   "3.1.1) The player can choose which regions to help defend, and the one
//    they don't make it too is fully destroyed."
//
// ---------------------------------------------------------------------------
// WHAT THIS ROUND IS, AND WHAT IT IS NOT
// ---------------------------------------------------------------------------
// This is the SURGE ITSELF: a world state that starts, escalates every spawn
// in the game, is persisted, and ends. The quest chains of 3.1 and 3.2 are the
// next round and they hang off `SURGE_REGIONS` below, which is here now so
// that when they arrive there is somewhere for them to record a saved city and
// a lost one.
//
// Everything a surge changes about the world is in THIS FILE as a number, and
// the scene reads it. Round 134's own note on the spawn knobs is the reason:
// they were module-level constants read directly at their use sites, so a
// change to density meant editing an expression in the middle of a placement
// function. A surge has to move four of them at once and put them back.
// ===========================================================================

// ===========================================================================
// ROUND 167 -- THE USER'S CORRECTION, AND WHAT I HAD READ WRONG
// ===========================================================================
//   "Correction active at zone 2 of act 3 which is likely early silver as the
//    player is intended to require the massive quantity of monsters from the
//    surge to have enough experience to hit gold rank. The surge ends roughly
//    1 real world hour after the player hits gold rank. Moving to act 4 can't
//    happen until the surge is complete."
//
// I HAD READ "act 3 part 2" AS AN ERA AND IT IS A ZONE. Round 166's note says
// so in as many words -- "Act 3 is Silver-to-Gold and its second part is the
// Gold era, so `gold` is where the world turns" -- and that reading put the
// surge AFTER the climb it is supposed to fuel. The player was meant to arrive
// at Gold and find a surge; they are meant to arrive at Gold BECAUSE of one.
//
// So three things change, and the first is the shape of the whole file:
//
//   THE SURGE IS KEYED ON THE STORY, NOT THE RANK. It starts at the second
//   zone of Act 3 -- division stage `div3_dust`, the first stage in Elehyd --
//   whatever rank the player happens to be. The era arc below survives as
//   what it always really was: the RUMOUR, which builds while the surge is
//   still ahead. It no longer decides anything.
//
//   IT CANNOT END BEFORE GOLD. Holding the third region at Silver banks it and
//   the surge stays up, because the surge is the road to Gold and a road that
//   closes before you arrive is not one. Reaching Gold with three already held
//   ends it on the spot.
//
//   AND THEN IT IS ON A CLOCK. One real hour of play after Gold, the surge
//   resolves itself whatever the player has done -- and EVERY region still
//   pending falls, which is a change of kind and not of degree: round 166
//   could only ever lose one. A player who dawdles can lose three.
// ===========================================================================

import { RANK_ORDER } from './ranks.js';

/**
 * Where the world is in the decade.
 *
 * KEYED ON THE STORY for the surge itself, and on the era for everything that
 * comes before it. The years are narrative (see eras.js) and so is the decade
 * -- the stone by the north road, the almanac, the old men -- but WHEN IT LANDS
 * is a place in the plot, because the plot is the thing the player controls.
 */
export const SURGE_PHASE = {
  QUIET: 'quiet',      // it is a story about the last one
  DUE: 'due',          // the almanac says we are inside the window
  COMING: 'coming',    // the outlying farms are emptying
  ACTIVE: 'active',    // it has started
  OVER: 'over',        // it has been resolved, one way or the other
};

/**
 * THE RUMOUR, which is all the era decides now.
 *
 * Round 166 had `gold: ACTIVE` here and that was the whole of the mistake:
 * the era is a rank-keyed fact, so keying the surge on it meant the surge
 * could not start until the climb it exists to fuel was already over. What is
 * left is the 2.1 arc, which was always the honest use of this table -- people
 * mention it, then worry about it, then brace for it, and the era is exactly
 * the right clock for that because the rumour IS about how long it has been.
 *
 * NOTHING HERE IS `ACTIVE` ANY MORE, and the faults check below enforces that
 * rather than trusting this comment.
 */
export const PHASE_BY_ERA = {
  arrival: SURGE_PHASE.QUIET,
  iron: SURGE_PHASE.DUE,
  bronze: SURGE_PHASE.DUE,
  silver: SURGE_PHASE.COMING,
  gold: SURGE_PHASE.COMING,
};

export function phaseForEra(eraId) {
  return PHASE_BY_ERA[eraId] || SURGE_PHASE.QUIET;
}

// ---------------------------------------------------------------------------
// WHERE IT STARTS: "zone 2 of act 3".
//
// Act 3 runs div3_crossing -> div3_overseer. Its first zone is the crossing,
// which is still Ontaria; its SECOND is the arrival in Elehyd, `div3_dust`.
// That is the stage the user is naming and it is early Silver for a player on
// the intended curve -- but the STAGE is the trigger and the rank is only the
// expectation, which is the right way round: a grinder who arrives at Bronze
// gets the surge, and a player who has crawled the whole world at Silver
// without touching the plot does not.
//
// DERIVED FROM THE STAGE LIST, NOT WRITTEN AS 12. An index written here would
// be a second copy of an ordering that division.js owns -- and round 102's own
// note in that file is about exactly this ("so that adding a stage to Act 3
// does not silently move what a test believes Act 4 is").
// ---------------------------------------------------------------------------
// ===========================================================================
// ROUND 181 -- AND THE TRIGGER IS A PLACE NOW, NOT A STAGE.
//
// THE USER: "The monster surge should kick off when the players are in the
// cinderwaste. The first time they enter the city it should be on high alert,
// an official from the adventure society approaches and lets them know that
// the surge has started and they are being asked to help defend the areas
// that need it more as the forces at cinderwaste are more then adequate."
//
// So the surge begins when the player walks into SLAGWARD, and everything
// above about `div3_dust` describes the approach to it rather than the thing
// itself. The stage is renamed rather than kept with a name that has stopped
// being true: it is the last stage of Act 3, the one that sends the player
// south, and the three checks in the data lane that assert it sits inside Act
// 3 are still asserting something worth knowing.
//
// WHY A PLACE IS A BETTER TRIGGER THAN A STAGE, now that there is an Act 3.5:
// the old note below says "the STAGE is the trigger and the rank is only the
// expectation, which is the right way round". That still holds, and a place is
// the same idea taken one step further -- the surge starts when the player is
// standing where the news reaches them, which is the only way the scene the
// user asked for can happen at all. An announcement nobody is present for is
// a banner.
export const SURGE_TRIGGER_SETTLEMENT = 'cin_slag';

/** The stage that sends the player south to the Cinderwaste. Renamed in round
 *  181 from SURGE_START_STAGE_ID, because it stopped being where the surge
 *  starts and a name that lies is worse than no name. */
export const SURGE_APPROACH_STAGE_ID = 'div3_dust';

/** Index of the stage that sends the player south, or -1 if it has gone. */
export function surgeApproachStage(stages) {
  return (stages || []).findIndex(s => s && s.id === SURGE_APPROACH_STAGE_ID);
}

/**
 * It cannot end before Gold, and one real hour after Gold it ends by itself.
 *
 * THE HOUR IS MEASURED IN PLAY, NOT IN WALL CLOCK. `_clockT` is the scene's
 * elapsed-play scalar and the only thing saves persist about time, so a player
 * who closes the game for a week comes back with the same hour left. A
 * wall-clock deadline would resolve the surge while nobody was looking, which
 * is the one way to make "the region you did not reach" mean nothing at all.
 *
 * 3600 seconds of play is six in-world days at GAME_DAY_SECONDS = 600.
 */
export const SURGE_END_RANK = 'gold';
export const SURGE_GOLD_SECONDS = 3600;

/** The surge cannot close before this. */
export function surgeCanEnd(rank) { return rank === SURGE_END_RANK; }

/** Is the world under a surge right now? The one question most callers ask. */
export function isSurging(phase) {
  return phase === SURGE_PHASE.ACTIVE;
}

/**
 * THE PHASE, from the three things that decide it.
 *
 * Pure, and takes its inputs rather than reaching for them, so the suite can
 * ask what the world would look like at any point without building one.
 */
export function surgePhaseFor({ eraId, surgeBegun, surgeOver }) {
  if (surgeOver) return SURGE_PHASE.OVER;
  // ROUND 181 -- one flag, set when the player walks into Slagward and hears
  // it from somebody. It used to be `stageIndex >= startStage`, which asked
  // the division chain how far along the story was; with the surge announced
  // in Act 3.5 that test would have turned the world over one region early,
  // in Elehyd, with nobody there to say so.
  if (surgeBegun) return SURGE_PHASE.ACTIVE;
  return phaseForEra(eraId);
}

// ===========================================================================
// WHAT A SURGE DOES TO THE WORLD
//
// "a massive increase in the spawn rate of monsters. All across the world, all
// at the same time."
//
// FOUR NUMBERS, AND THEY ARE NOT ALL THE SAME KIND OF MORE. A surge that
// multiplied one knob by six would be the same world with bigger packs; the
// thing the user is describing is the country being unsafe in a way it was
// not, which takes density AND size AND things that were not there before.
//
//   density   more groups in the same ground -- the gaps between encounters
//             close up. This is the one that changes how it FEELS to cross a
//             region, because it is the one you meet while travelling.
//   pack      each group is bigger. Multiplied on top of round 134's own
//             PACK_SIZE_MULT rather than replacing it, so a band that was
//             already a super pack is still the biggest thing out there.
//   extra     the far-country second group, which normally lands half the
//             time past 55% danger, now lands nearly always and much closer
//             in. The safe half of a region stops being the safe half.
//   tierUp    "the addition of bronze and silver rank monsters that are only
//             appearing due to the surge" (3.2). A share of groups come up a
//             rank from what their band asked for.
//
// THE NUMBERS ARE DELIBERATELY NOT HUGE, and that is a measurement rather than
// timidity. Spawn groups instantiate lazily within SPAWN_WAKE_RADIUS, so what
// the player actually pays is live monsters near them -- and density, pack
// size and the extra far-country group all COMPOUND into that one number. The
// first set of these multipliers looked like 3.7x on paper and measured 7.25x
// on the ground; see the note under the table.
// ===========================================================================
export const SURGE_SPAWN = {
  density: 1.8,        // groups per square of region
  pack: 1.5,           // monsters per group, on top of PACK_SIZE_MULT
  extraFrom: 0.25,     // the second group starts at 25% danger, not 55%
  extraChance: 0.70,   // ...and lands 70% of the time, not 50%
  tierUp: 0.22,        // a bit over a fifth of groups come up a rank
  tierUpMax: 3,        // ...and never past Silver: Gold stays "occasional"
};

// ---------------------------------------------------------------------------
// THE NUMBERS ABOVE ARE THE SECOND SET, AND THE FIRST SET IS WHY
// ---------------------------------------------------------------------------
// The first cut read density 2.2, pack 1.7, extraFrom 0.15, extraChance 0.85,
// tierUp 0.30. On paper that is 3.7x the monsters in a square of country. On
// the built world, standing in open ground in The Nek, it was:
//
//   live monsters around the player   32 -> 232   (x7.25)
//   Gold-rank groups                  6.4% -> 12.6% of the world
//
// Two things wrong with it, and neither was visible in the design.
//
// The 7.25x is the extra far-country group COMPOUNDING with the density: both
// multiply the number of groups in the same ground, so 1.8x density and a
// second group landing 70% of the time instead of 50% is already most of the
// way to "massive" -- and 232 monsters converging on one player is not a horde
// to fight, it is a wall to die against. The tick cost was never the problem
// (3.68ms -> 4.96ms against a 16.7ms budget); playability was.
//
// The Gold share is the user's own words: "massive hordes of iron, bronze and
// silver rank monsters with OCCASIONAL gold rank monsters" (2.3). A promotion
// ceiling of Silver is what makes that sentence true -- Gold groups during a
// surge are the ones the region already declared, not ones the surge invented.
//
// MEASURED, NOT REASONED. tools/probe_round166_surge.cjs is what produced both
// numbers and what should produce them again before either of these moves.

/** Nothing at all, for every phase that is not a surge. The shape matches so
 *  no caller has to branch on the phase to read a multiplier. */
export const SURGE_SPAWN_NONE = {
  density: 1, pack: 1, extraFrom: null, extraChance: null, tierUp: 0, tierUpMax: 0,
};

export function surgeSpawnFor(phase) {
  return isSurging(phase) ? SURGE_SPAWN : SURGE_SPAWN_NONE;
}

// ===========================================================================
// THE FOUR REGIONS, AND THE ONE THAT DOES NOT MAKE IT
//
// "The player can only help defend 3 of the cities from Act 1 or 2 and the
// surge ends once they have completed the monster surge quest chains for 3/4
// regions. The player can choose which regions to help defend, and the one
// they don't make it too is fully destroyed."
//
// THE FOUR ARE THE FIRST THREE ACTS' OWN REGIONS, which is what "each city in
// the first 3 acts" names: The Nek and Ontaria are Acts 1 and 2, Elehyd is
// Act 3, Bratugal is Act 4's ground but is where the player LIVES by the time
// the surge starts. Four cities, three of which can be reached.
//
// The state lives here as a table of what can happen rather than as the quest
// chain, which is next round. What this round has to get right is that a
// region has THREE states and not two: a city nobody has been to yet is not a
// city that fell, and a build that cannot tell them apart would show the
// player a ruin before they had a chance to go.
// ===========================================================================
// ROUND 179 -- THE FOUR ARE NOW DERIVED, AND THE PARAGRAPH ABOVE IS WIDENED.
//
// What it says was true of the old ordering and is not true of the user's:
// Bratugal is no longer "Act 4's ground where the player LIVES by the time the
// surge starts". Under the seven-act spine the surge begins in the Cinderwaste
// at Act 3.5, and Bratugal is Act 4 -- somewhere the player has NOT been.
//
//   THE USER: "This leaves the players Cadence, Ontaria, Sirukh Sands, and
//   Elehyd to defend through the surge. (our 4 cities) As those are all the
//   places the player can access."
//
// So the four cities are everywhere reached before the surge starts, which is
// a fact about the act table rather than a list. acts.js derives it; this file
// re-exports it under the name six other modules already import, so the
// definition moved and nothing else had to.
//
// It is STILL FOUR, and still three of them, which is why the save limit below
// did not move either. Bratugal left the list without anybody editing a list.
//
// Imported AND re-exported, not just re-exported: `export { X } from` forwards
// the name to importers without binding it in this module's own scope, and
// `surgeFaults` below reads it. The first cut did only the forwarding and the
// file threw on its own function.
import { SURGE_REGIONS } from './acts.js';
export { SURGE_REGIONS };
export const SURGE_SAVE_LIMIT = 3;

export const REGION_SURGE_STATE = {
  PENDING: 'pending',  // under attack, nobody has come
  SAVED: 'saved',      // the chain was completed here
  LOST: 'lost',        // the surge ended with this one unvisited
};

/**
 * What the world looks like in a region that fell.
 *
 * "it should be swarming with monsters and maybe 2-4 survivors hiding in a
 * still standing house or temple." The numbers are the user's; the rest of
 * this object is what the next round will need to build that and is here so
 * the shape is agreed before anything reads it.
 */
export const LOST_REGION = {
  survivorsMin: 2, survivorsMax: 4,
  // A lost city is worse than a surging one, not merely as bad -- but it is
  // somewhere the player is meant to walk into and get back out of, so it is
  // scaled against the surge rather than against nothing. Gold is uncapped
  // here, and only here: a region that fell is where the things that took it
  // still are.
  density: 2.4, pack: 1.8, tierUp: 0.45, tierUpMax: 4,
};

/** A fresh record of where the four regions stand. */
export function newSurgeRecord() {
  const out = {};
  for (const id of SURGE_REGIONS) out[id] = REGION_SURGE_STATE.PENDING;
  return out;
}

/** How many of the four are being held. */
export function savedCount(record) {
  return SURGE_REGIONS.filter(id => record[id] === REGION_SURGE_STATE.SAVED).length;
}

/**
 * Has the player done the thing that ends it?
 *
 * Three saved -- the user's own rule. NOTE WHAT THIS DOES NOT ASK: the rank.
 * This is "the work is done", not "the surge is over", and round 167 split the
 * two because they stopped being the same question.
 */
export function surgeResolved(record) {
  return savedCount(record) >= SURGE_SAVE_LIMIT;
}

/**
 * WHY THE SURGE IS ENDING, THIS INSTANT, OR NULL.
 *
 * Two ways out and a floor under both of them.
 *
 *   THE FLOOR IS GOLD. "The player is intended to require the massive quantity
 *   of monsters from the surge to have enough experience to hit gold rank" --
 *   so the surge cannot be turned off before the player has got what it is for.
 *   Holding all three cities at Silver banks the work; the surge ends the
 *   moment they rank up, not the moment they finish.
 *
 *   'held' -- three regions saved and the player is Gold. The intended ending,
 *   and the one region left over is the one that falls.
 *
 *   'deadline' -- an hour of play at Gold, whatever the player has done. This
 *   is the change of KIND in round 167: every region still pending falls, so
 *   a player who spent the hour elsewhere can lose two or three cities rather
 *   than one. That is the cost of the hour being real.
 *
 * `goldAt` is stamped when the player is FIRST both Gold and surging -- which
 * is not necessarily when they ranked up, because a player can reach Gold
 * before ever walking into Elehyd.
 */
export function surgeEndReason({ rank, record, goldAt, clockT }) {
  if (!surgeCanEnd(rank)) return null;
  if (surgeResolved(record)) return 'held';
  if (goldAt != null && (clockT - goldAt) >= SURGE_GOLD_SECONDS) return 'deadline';
  return null;
}

/** Seconds of play left on the hour, or null if the clock has not started. */
export function surgeSecondsLeft({ goldAt, clockT }) {
  if (goldAt == null) return null;
  return Math.max(0, SURGE_GOLD_SECONDS - (clockT - goldAt));
}

/** Close the surge out: whatever was still pending has fallen. */
export function resolveSurge(record) {
  const out = { ...record };
  for (const id of SURGE_REGIONS) {
    if (out[id] === REGION_SURGE_STATE.PENDING) out[id] = REGION_SURGE_STATE.LOST;
  }
  // ROUND 179 -- AND VASHRA, WHICH IS NOT ONE OF THE FOUR.
  //
  // THE USER: "keep it but make it a toggle. If the player doesn't save any
  // cities at all, then Vashra also fell. Otherwise Vashra suffered no ill
  // effects."
  //
  // Bratugal is Act 4 now and the player cannot reach it while the surge is
  // on, so it can never be *defended* -- which is exactly why it is the right
  // city to carry the consequence of defending nothing. Save one and the far
  // side of the world held on its own. Save none and it did not, and the six
  // survivors and the fallen line already written for Vashra are what Act 4
  // opens on.
  //
  // Written into the record rather than computed at the door, because a
  // player's Act 4 must not change if they go back and save something after
  // arriving: the surge resolved once, and this is what it resolved to.
  out[LOST_REGION_ON_TOTAL_LOSS] = savedCount(out) === 0
    ? REGION_SURGE_STATE.LOST
    : REGION_SURGE_STATE.SAVED;
  return out;
}

/**
 * The city that falls only if nothing else was held.
 *
 * Named rather than written into `resolveSurge` so the suites can ask which
 * region carries this rule instead of hardcoding 'bratugal' a fifth time.
 */
export const LOST_REGION_ON_TOTAL_LOSS = 'bratugal';

/** Did Vashra survive? Distinct from `savedCount`, which counts only the four
 *  the player could actually reach, and from which this is derived. */
export function vashraHeld(record) {
  return (record || {})[LOST_REGION_ON_TOTAL_LOSS] !== REGION_SURGE_STATE.LOST;
}

// ===========================================================================
// WHAT THE STREET SAYS WHILE IT IS HAPPENING
//
// Round 165 gave every era six street lines and the Gold set assumes a surge
// is on -- "everyone who could get behind a wall is behind a wall". That was
// true when the surge WAS the Gold era. It is not now, in both directions:
// a Silver player past `div3_dust` is standing in a surge while the street
// tells them one is coming, and a Gold player an hour past the deadline is
// told to get behind a wall that is no longer needed.
//
// So the PHASE takes the street back off the era while it has something to
// say. The era lines are untouched and still carry the rumour; these two sets
// sit on top of them for as long as they are true.
// ===========================================================================
export const SURGE_STREET_LINES = {
  [SURGE_PHASE.ACTIVE]: [
    'Started in the east. There\'s a man in the tap room who ran here from it.',
    'Don\'t go out on the road. I\'m not being dramatic.',
    'Society\'s stopped posting contracts. It\'s musters now.',
    'Four cities. There\'s one of you.',
    'My brother\'s on the Elehyd wall. I\'d rather not know which bit of it.',
    'Month of food behind these gates. I\'ve asked about the second month.',
  ],
  [SURGE_PHASE.OVER]: [
    'It\'s over. I keep saying it out loud.',
    'Gates are open. Half of them have got nowhere to go back to.',
    'They\'re still counting. It\'s been nine days.',
    'There\'ll be a stone. There\'s always a stone.',
    'You were there. My sister says she saw you. She didn\'t.',
    'Roads are safe enough for carts. Not for children yet.',
  ],
};

/**
 * One line the player has not had, or null once they have had them all.
 * Same contract as `eraStreetLine` -- see eras.js -- deliberately, so the
 * scene's one street-line function does not grow a second shape.
 */
export function surgeStreetLine(phase, speakerName, heard) {
  const pool = SURGE_STREET_LINES[phase];
  if (!pool || !pool.length) return null;
  const had = heard || [];
  const left = pool.filter(l => !had.includes(l));
  if (!left.length) return null;
  // Stable per speaker, so the same person says the same thing twice rather
  // than cycling the whole set at one NPC the player keeps bumping into.
  let h = 0;
  const key = `${phase}|${speakerName || ''}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return left[h % left.length];
}

/** Faults in this file's own tables, for the data lane. */
export function surgeFaults() {
  const out = [];
  const phases = new Set(Object.values(SURGE_PHASE));
  for (const [era, ph] of Object.entries(PHASE_BY_ERA)) {
    if (!phases.has(ph)) out.push(`era ${era}: phase '${ph}' is not one of the five`);
  }
  // The arc has to actually be an arc: quiet, then due, then coming, then the
  // thing itself. A table where every era is 'quiet' would pass every other
  // check in this file.
  const order = [SURGE_PHASE.QUIET, SURGE_PHASE.DUE, SURGE_PHASE.COMING, SURGE_PHASE.ACTIVE];
  const seen = ['arrival', 'iron', 'bronze', 'silver', 'gold'].map(e => PHASE_BY_ERA[e]);
  let at = -1;
  for (const ph of seen) {
    const i = order.indexOf(ph);
    if (i < 0) { out.push(`phase '${ph}' is not on the arc`); continue; }
    if (i < at) out.push('the rumour arc goes backwards');
    at = Math.max(at, i);
  }
  if (seen[0] !== SURGE_PHASE.QUIET) out.push('the world starts mid-surge');
  // ROUND 167. The era table is the RUMOUR and must not be able to start the
  // surge again: that is exactly the fault this round exists to correct, and
  // a comment saying so is not a check.
  if (seen.includes(SURGE_PHASE.ACTIVE)) {
    out.push('an era is ACTIVE -- the surge is keyed on the story stage, not the rank');
  }
  if (seen[seen.length - 1] !== SURGE_PHASE.COMING) {
    out.push('the rumour never builds -- the last era is not COMING');
  }
  // ...and the thing that DOES start it has to exist. A renamed or deleted
  // stage would otherwise leave `surgeApproachStage` at -1 and a world in which
  // the surge simply never happens, silently.
  if (!SURGE_APPROACH_STAGE_ID) out.push('no stage sends the player south');
  // ROUND 181 -- and the place the surge is announced in has to be a real
  // settlement in the region the act table says the surge starts in, or the
  // trigger is a string nothing can ever match and the world never turns.
  if (!SURGE_TRIGGER_SETTLEMENT) out.push('no settlement announces the surge');
  // The hour has to be an hour of something. Zero would resolve the surge on
  // the frame the player hits Gold.
  if (!(SURGE_GOLD_SECONDS > 0)) out.push('the deadline after Gold is not a duration');
  if (!RANK_ORDER.includes(SURGE_END_RANK)) {
    out.push(`the surge ends at rank '${SURGE_END_RANK}', which is not a rank`);
  }
  for (const [phase, lines] of Object.entries(SURGE_STREET_LINES)) {
    if (!Object.values(SURGE_PHASE).includes(phase)) out.push(`street lines for unknown phase '${phase}'`);
    if (lines.length < 4) out.push(`phase ${phase} has only ${lines.length} street lines`);
    if (new Set(lines).size !== lines.length) out.push(`phase ${phase} repeats a street line`);
  }
  // A surge that does not escalate anything is a flag.
  if (!(SURGE_SPAWN.density > 1 && SURGE_SPAWN.pack > 1)) {
    out.push('the surge does not increase spawns');
  }
  if (SURGE_SPAWN.tierUp <= 0) out.push('no monster comes up a rank during the surge');
  // ...and one that escalates without limit is a slideshow. 4x on each of two
  // compounding knobs is ~16x the monsters on screen; this is the ceiling the
  // measurement in this file's header is about.
  // The compound ceiling, and it is set from the MEASUREMENT above rather than
  // from taste: 1.8 x 1.5 put 232 monsters around the player once the extra
  // far-country group was counted in, and that is the top of what a player can
  // be asked to stand in. Anything above 3 here needs the probe run again.
  if (SURGE_SPAWN.density * SURGE_SPAWN.pack > 3) {
    out.push(`density x pack is ${(SURGE_SPAWN.density * SURGE_SPAWN.pack).toFixed(1)}, `
      + 'which measured past what a player can fight -- re-run probe_round166_surge');
  }
  // ...and Gold stays occasional, which is the user's own word.
  if (SURGE_SPAWN.tierUpMax > 3) {
    out.push('the surge promotes monsters to Gold, but Gold is meant to be occasional');
  }
  if (SURGE_REGIONS.length <= SURGE_SAVE_LIMIT) {
    out.push('every region can be saved, so nothing is ever lost');
  }
  if (LOST_REGION.survivorsMin < 1 || LOST_REGION.survivorsMax < LOST_REGION.survivorsMin) {
    out.push('a lost region has no survivors to find');
  }
  return out;
}
