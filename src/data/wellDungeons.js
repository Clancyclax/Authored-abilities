// ===========================================================================
// ROUND 157 -- THE POOL OF WELL SEWERS.
//
// "Build all of the well sewers." / "The well over the sewer entrance becomes
// the sewer entrance."
//
// Same shape as `dens.js`, and for the same three reasons that file states: a
// pool of rooms declared up front, claimed at world build by whatever turns
// out to be there, with its `tileAt` attached in interiors.js because the tile
// ids live there and importing them here would close a cycle.
//
// WHY A POOL AND NOT ONE PER SETTLEMENT. How many wells there are is a
// question about the built world, not about the data: `landmarkFor` gives a
// well to a settlement by kind and radius, round 156 adds a wellhead to every
// city and town, and the user has hand-placed one in The Nek. Measured on the
// r156 build there are 21. A pool sized above that is claimed by whatever the
// city-prop pass actually laid, so adding a well to the map is not also a
// change to this file.
//
// A room nobody claims stays unstamped -- `tileAt` returns null everywhere
// without a seed, which `_stampInteriorBand` reads as "nothing to say" -- so
// the spare slots cost a rectangle of void in a band no player stands in.
// That is exactly the trade dens.js documents.
// ===========================================================================
import { WELL_DUNGEON_W, WELL_DUNGEON_H } from './wellDungeonGen.js';

/** Twenty-one wells on the r156 build; 28 leaves room for the settlements the
 *  user is still adding without this number becoming a second thing to edit
 *  every time a hamlet appears. `_claimWellDungeons` reports a shortfall rather
 *  than silently building fewer, the way `_denPoolShort` does. */
export const WELL_DUNGEON_COUNT = 28;

export const WELL_DUNGEON_ROOMS = [];
for (let i = 0; i < WELL_DUNGEON_COUNT; i++) {
  WELL_DUNGEON_ROOMS.push({
    id: `wellsewer_${i}`,
    // No `building`. A well is a city PROP, not a building, so this room's
    // door is hung off the prop by `_hangWellDoorway` -- which is the same
    // arrangement a den has, where the door hangs off a site's structure.
    building: null,
    wellSlot: i,
    name: 'A drain',
    enterLabel: 'climb down the well',
    blurb: 'Brick, standing water, and something further in.',
    floor: 'sewer',
    x: 0, y: 0, w: WELL_DUNGEON_W, h: WELL_DUNGEON_H,
    // A formality, as it is for Cadence's sewer: nothing hangs off it, but
    // `buildRoomWalls` phase-aligns the perimeter to it. The player arrives at
    // the foot of the ladder, which the layout decides, not here.
    door: { at: 2, span: 2 },
    /** No street door, for the reason `SEWER_ROOM` gives: round 46 asserts
     *  every interior finds its doorstep, and this one's doorstep is a hole in
     *  the ground rather than a building front. */
    noExterior: true,
    /** THE ROOM PAINTS ITS OWN EDGES, so `_buildRoomContents` lays a collider
     *  on every rock tile and draws no wall ring at all. Round 88 made a den
     *  do this and wrote down why: the rock is INSIDE the rectangle, not
     *  around it, and a rectangular perimeter of wall panels round a branching
     *  tunnel system would be sixty sprites of masonry standing in front of
     *  walls the ground renderer already draws for nothing. */
    selfShaped: true,
    /** ...and built when somebody opens it. Twenty-eight of these up front is
     *  exactly the display-list cost round 64 refused to pay for the dens, for
     *  rooms in a band no camera reaches until a door is used. */
    lazy: true,
    props: [],
    npcs: [],
    // Filled in at claim time by `_claimWellDungeons`.
    dungeonSeed: null,
    dungeonCave: false,
    settlement: null,
  });
}

/** Which wells get item 1.5.5's way out through the rock.
 *
 *  "SOME sewers might connect to caves in the wild nearby" -- some, so this is
 *  a share rather than all of them, and it is seeded on the settlement so a
 *  place either has a back way out or does not, the same on every load. One in
 *  three: often enough that a player who has been down two or three has met
 *  one, rare enough that finding it is finding something. */
export const WELL_DUNGEON_CAVE_SHARE = 1 / 3;

/**
 * WHAT LIVES DOWN THERE.
 *
 * Not `REGION_DEN_FAMILIES`, which is the list for a cave in that region and
 * runs to hellhounds, chimeras and dragons at the top tiers. A drain under a
 * street is a drain: the things in it are the things that get into drains, and
 * Cadence's authored sewer already says so -- slimes, and one man who should
 * not be there.
 *
 * Filtered against whatever the roster actually has at the tier, and if that
 * comes back empty the caller falls back to the region's own families rather
 * than shipping an empty sewer -- which is the rule `denMonsterKeys` states
 * and the reason it states it.
 */
// ROUND 173 -- four more things to meet at the bottom of a well. A quill
// fiend and a gnoll are ordinary enough to fill one; a spirit serpent and a
// harbinger belong in a hole in the ground more than they belong in a field.
export const WELL_FILL_FAMILIES = ['slime', 'spider', 'bat', 'skeleton', 'giantToad', 'shade',
  'quillFiend', 'gnoll', 'spiritSerpent', 'shellborn'];
/** And the thing at the end. Bigger, and of a kind that would have had to
 *  climb in: a golem of the muck, something from the water, something that
 *  came up from further down. */
export const WELL_BOSS_FAMILIES = ['slimeGolem', 'crocodile', 'medusa', 'minotaur', 'hydra', 'demon',
  // ROUND 173. All three are tier 3-4 at every shade, which is what a boss
  // pick needs: the well takes the region's HIGHEST declared band, and a
  // family that bottoms out at tier 1 would be a boss you could tread on.
  'harbinger', 'sixArmApe', 'tidalTroll'];

/** Item 1.5.3's two halves. The RANK does the work -- a boss is drawn one tier
 *  above its own sewer's fill -- and these make a single monster of that tier
 *  into a fight rather than a stronger wanderer. Measured against the astral
 *  camp leader, which is this project's existing "one of them is the big one"
 *  and uses 2.4 health and 1.5 damage; a little under that, because a camp
 *  leader is a Hierophant and this is a thing in a drain. */
export const WELL_BOSS_HP_MULT = 2.2;
export const WELL_BOSS_DMG_MULT = 1.35;
export const WELL_BOSS_SCALE = 1.22;

/** How many ordinary groups stand between the ladder and the boss. Two to
 *  four, one per branch chamber where there is one: a sewer whose only fight
 *  is at the end is a corridor, and one with a pack every ten tiles is the
 *  slog the "stretched out" instruction is trying to avoid. */
export const WELL_FILL_GROUPS = [2, 4];
export const WELL_FILL_PACK = [2, 3];

// ===========================================================================
// ROUND 161 -- WHAT THESE PLACES ARE CALLED.
//
// THE USER:
//   "From now on sewer will refer to the starting map in cadence and
//    everywhere else will be a 'Well Dungeon'."
//
// So there is exactly ONE sewer in the game -- Cadence's hand-authored
// Undercity -- and the twenty generated ones are WELL DUNGEONS. The words are
// not interchangeable any more and this file's job is to stop them reading as
// if they were.
//
// The NAME the player sees was "Under Milrow", which is flavour and says
// nothing about what kind of place it is -- and under Cadence it collided
// outright with the Undercity, which is genuinely under Cadence. It is "The
// Well Under Milrow" now: still flavour, and the word "Well" is in it, which
// is also the verb the player used to get there.
//
// WHAT DID NOT CHANGE, AND WHY. The room IDS are still `wellsewer_<n>` and the
// slot is still `wellSlot`. Those are written into SAVE FILES -- a delve
// contract records `denRoom` as a room id -- so renaming them to match the new
// vocabulary would point every active contract in an existing save at a room
// that no longer exists, in exchange for a string no player ever reads. A name
// on screen and an identifier on disk are different things with different
// obligations, and only one of them is what the user is talking about.
// ===========================================================================

/** What a well dungeon is called. The NAME carries the flavour and the BLURB
 *  says plainly what is in the room, which is this project's standing rule for
 *  both -- so the blurb is where the words "well dungeon" belong. */
export function wellDungeonName(placeName) {
  return placeName ? `The Well Under ${placeName}` : 'The Well Under the Street';
}
export function wellDungeonBlurb(hasCave) {
  return hasCave
    ? 'A well dungeon: brick and standing water, and a passage where the brick gives out.'
    : 'A well dungeon: brick and standing water, running out under the street.';
}

