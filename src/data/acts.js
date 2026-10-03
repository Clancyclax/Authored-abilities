// ===========================================================================
// ROUND 179 -- THE ACT SPINE, AND THE SEVENTH REGION'S PLACE IN IT.
//
// THE USER:
//
//   "Sirukh Sands, the Cinderwaste and Ixcuatl need to be folded into the
//    acts. The division story, the god quests, companion story beats and the
//    adventure society should progress through these regions as well.
//
//    Act 2 starts in Ontaria, Act 2.5 is Sirukh Sands
//    Act 3 starts in Elehyd, act 3.5 is the cinderwaste
//    Act 4 starts in bratugal, act 4.5 is Ixcuatl"
//
// Until this round there was no such table. There were SEVEN separate
// hardcoded copies of the list `['nek', 'ontaria', 'elehyd', 'bratugal']` --
// in surge.js, godQuests.js, division.js, astral.js, cityChange.js and two
// probes -- each of them one author's idea of "the four regions that matter",
// and each of them a place the seventh region would have had to be remembered
// separately. That is fault class 2 at scale: several copies, one of them
// authoritative, and nothing saying which.
//
// So this file is the sentence and everything else reads it.
//
// ---------------------------------------------------------------------------
// THE HALF-ACTS ARE NOT SMALLER ACTS
// ---------------------------------------------------------------------------
// A .5 is a place the story goes TO and comes BACK from, which is why the map
// puts them where it does: Sirukh Sands is an island off Ontaria's coast, the
// Cinderwaste is directly south of Elehyd ("ash plains and lava fields below
// Elehyd", its own blurb), and Ixcuatl is directly south of Bratugal. Each
// half-act hangs off the whole act before it rather than continuing onward,
// so the player's path is a spine with three limbs and not a chain of seven.
//
// ---------------------------------------------------------------------------
// AND THE SURGE'S ARITHMETIC IS A CONSEQUENCE OF THIS TABLE, NOT A SECOND ONE
// ---------------------------------------------------------------------------
// THE USER:
//
//   "The monster surge should kick off when the players are in the
//    cinderwaste... an official from the adventure society approaches and
//    lets them know that the surge has started and they are being asked to
//    help defend the areas that need it more as the forces at cinderwaste are
//    more then adequate. This leaves the players Cadence, Ontaria, Sirukh
//    Sands, and Elehyd to defend through the surge. (our 4 cities) As those
//    are all the places the player can access."
//
// Read that last clause again, because it is the whole design: the four
// cities are not a list somebody chose. They are EVERYWHERE THE PLAYER HAS
// ALREADY BEEN when the surge starts. The surge starts in Act 3.5, so the
// defendable regions are exactly the acts before 3.5 -- four of them -- and
// the locked ones are exactly the acts after.
//
// `SURGE_REGIONS` is therefore derived below rather than written down again.
// Move `SURGE_ACT` and the four cities move with it, the save limit still
// reads "three of the four you can reach", and no second table has to be
// remembered. The previous four survived only because Bratugal was Act 4's
// ground and the player was assumed to live there by then; under the user's
// ordering Bratugal is somewhere you have not been, so it leaves the list on
// its own, without anybody editing a list.
// ===========================================================================

import { REGIONS } from './regions.js';

/**
 * Every act, in the order the player takes them.
 *
 * `kind` is what the act IS rather than how big it is: a `main` act opens a
 * region and moves the story on, an `interlude` is the half-act hanging off
 * it. Nothing keys off the .5 in the number -- it is there because it is what
 * the user called them, and a system that parsed the fraction would be reading
 * a label as data.
 */
export const ACTS = [
  { act: 1, region: 'nek', kind: 'main' },
  { act: 2, region: 'ontaria', kind: 'main' },
  { act: 2.5, region: 'sirukh', kind: 'interlude', hangsOff: 'ontaria' },
  { act: 3, region: 'elehyd', kind: 'main' },
  { act: 3.5, region: 'cinder', kind: 'interlude', hangsOff: 'elehyd' },
  { act: 4, region: 'bratugal', kind: 'main' },
  { act: 4.5, region: 'ixcuatl', kind: 'interlude', hangsOff: 'bratugal' },
];

/** Where the surge begins. The Cinderwaste, and therefore Act 3.5. */
export const SURGE_ACT = 3.5;

/** Region ids in the order the story visits them. */
export const ACT_ORDER = ACTS.map(a => a.region);

/** The act each region belongs to. */
export const REGION_ACT = Object.fromEntries(ACTS.map(a => [a.region, a.act]));

/** The act row for a region, or null for somewhere not on the spine. */
export function actOf(regionId) {
  return ACTS.find(a => a.region === regionId) || null;
}

/** Is `a` reached before `b` in the story? Ids, not act numbers. */
export function actBefore(a, b) {
  const x = REGION_ACT[a], y = REGION_ACT[b];
  return x !== undefined && y !== undefined && x < y;
}

/**
 * THE FOUR CITIES -- everywhere the player has been when the surge starts.
 *
 * Not a list. The Cinderwaste is where the surge begins and where the player
 * is standing when they hear about it, and its own garrison is "more than
 * adequate" (the user), so it defends itself and is not among them.
 */
export const SURGE_REGIONS = ACTS.filter(a => a.act < SURGE_ACT).map(a => a.region);

/** Where the player is standing when the surge starts, and which defends
 *  itself. One region, named as a constant because three systems ask. */
export const SURGE_TRIGGER_REGION = ACTS.find(a => a.act === SURGE_ACT).region;

/**
 * Locked until the surge has resolved.
 *
 * THE USER: "Bratugal and Ixucatl can only be experienced post surge and dont
 * need any activities or programming prior to or during the monster surge."
 *
 * Derived for the same reason as the four: these are the acts the surge has
 * not reached yet, and the fact that there are two of them is an outcome of
 * where the surge starts rather than a decision taken twice.
 */
export const POST_SURGE_REGIONS = ACTS.filter(a => a.act > SURGE_ACT).map(a => a.region);

/** Can the player be in this region yet? `surgeOver` is the only gate there
 *  is; everywhere up to and including the Cinderwaste is open from the start,
 *  because the story walks there in order and nothing else needs a lock. */
export function regionOpen(regionId, surgeOver) {
  return !POST_SURGE_REGIONS.includes(regionId) || !!surgeOver;
}

/**
 * Faults a suite can assert without booting the game.
 *
 * The three that matter are the ones a future round could break by editing one
 * table and not another -- which is the failure this file exists to make
 * impossible, so it is asserted rather than assumed.
 */
export function actFaults(regions) {
  const out = [];
  const seen = new Set();
  for (const a of ACTS) {
    if (seen.has(a.region)) out.push(`${a.region} appears twice`);
    seen.add(a.region);
    if (a.kind === 'interlude' && !a.hangsOff) out.push(`${a.region} is an interlude hanging off nothing`);
    if (a.hangsOff && !ACTS.some(b => b.region === a.hangsOff)) {
      out.push(`${a.region} hangs off ${a.hangsOff}, which is not an act`);
    }
    // An interlude must come after the act it hangs off, or the player reaches
    // the limb before the branch.
    if (a.hangsOff && !(REGION_ACT[a.hangsOff] < a.act)) {
      out.push(`${a.region} comes before ${a.hangsOff}, which it hangs off`);
    }
  }
  for (let i = 1; i < ACTS.length; i++) {
    if (!(ACTS[i].act > ACTS[i - 1].act)) out.push(`act ${ACTS[i].act} does not follow ${ACTS[i - 1].act}`);
  }
  if (regions) {
    for (const r of regions) if (!seen.has(r.id)) out.push(`region ${r.id} is in no act`);
    for (const a of ACTS) {
      if (!regions.some(r => r.id === a.region)) out.push(`act ${a.act} names ${a.region}, which is not a region`);
    }
  }
  // The arithmetic the user specified, checked rather than trusted. If either
  // of these stops holding, the surge is no longer "save three of the four you
  // can reach" and somebody needs to have decided that on purpose.
  if (SURGE_REGIONS.length !== 4) {
    out.push(`the surge asks ${SURGE_REGIONS.length} cities, not four`);
  }
  if (!ACTS.some(a => a.act === SURGE_ACT)) out.push('the surge starts in no act');
  if (SURGE_REGIONS.includes(SURGE_TRIGGER_REGION)) {
    out.push('the region the surge starts in is also one it asks you to defend');
  }
  for (const id of POST_SURGE_REGIONS) {
    if (SURGE_REGIONS.includes(id)) out.push(`${id} is both locked and defendable`);
  }
  return out;
}


// ===========================================================================
// ROUND 182 -- WHAT RANK IT TAKES TO STAND THERE.
//
// Round 180 built the travel graph, and the graph already knows this: every
// crossing carries a `requiredRank`, so the rank a region demands is the
// HARDEST GATE ON THE EASIEST PATH TO IT. Elehyd wants Silver because the
// packet does; the Cinderwaste wants Silver because you have to be in Elehyd
// first and the haul road asks no more; Ixcuatl wants Gold although its own
// road asks nothing, because the only way in is through Bratugal.
//
// WHY THIS IS DERIVED AND NOT WRITTEN. `godQuests.js` had its own four-rung
// ladder -- `CHAPTER_RANK = ['normal','bronze','silver','gold']` -- which was
// a second copy of the same fact and was correct only while the regions and
// the ranks lined up one-to-one. Seven regions and four ranks do not, and the
// thing that decides which is which is the graph. A chapter gated at a rank
// that cannot reach its own region is a chapter nobody can take, and nothing
// would have said so.
// ===========================================================================

/** Low to high. The one ordering; `ranks.js` has the player-facing labels. */
export const RANK_LADDER = ['normal', 'iron', 'bronze', 'silver', 'gold'];

const rankIdx = (r) => {
  const i = RANK_LADDER.indexOf(r);
  return i < 0 ? 0 : i;
};

/**
 * The rank each region demands, by the easiest route to it.
 *
 * A widening search from The Nek that keeps, for each region, the lowest
 * "hardest gate on the way" seen so far -- which is the right question: a
 * player takes the gentlest road, and a region reachable two ways asks for
 * whichever of them asks less.
 */
export const RANK_TO_REACH = (() => {
  const best = { [ACT_ORDER[0]]: 0 };
  for (let pass = 0; pass < REGIONS.length + 1; pass++) {
    for (const r of REGIONS) {
      if (best[r.id] === undefined) continue;
      for (const e of (r.exits || [])) {
        const need = Math.max(best[r.id], rankIdx(e.requiredRank));
        if (best[e.to] === undefined || need < best[e.to]) best[e.to] = need;
      }
    }
  }
  const out = {};
  for (const id of ACT_ORDER) out[id] = RANK_LADDER[best[id] === undefined ? 0 : best[id]];
  return out;
})();

/** The rank a region demands, or 'normal' for one off the spine. */
export function rankToReach(regionId) {
  return RANK_TO_REACH[regionId] || 'normal';
}
