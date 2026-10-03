// ============================================================================
// ROUND 64 -- WHAT IS INSIDE THE CAVE.
//
// The user: "Lets get the quests and cave interiors established." And, from the
// same message, the shape of the best one: "a blood cult hideout that is hidden
// inside what from the outside looks like a normal barn".
//
// A landmark with a door in it that does not open is worse than a landmark with
// no door. Round 63 put twenty-four cave mouths, barns and shrines in the world
// and every one of them was scenery. This makes them rooms.
//
// -------------------------------------------------------------------------
// WHY THIS REUSES THE ROUND-22 INTERIOR SYSTEM WHOLE
// -------------------------------------------------------------------------
// interiors.js already solved this problem, and solved it well: a room is a
// walled rectangle of ordinary world tiles standing in a reserved band past the
// last region, and a door is a teleport between a doorstep outside and an entry
// pad inside. The player never leaves WorldScene, so inventory, essences,
// abilities, combat, the minimap and the shop screen all work indoors for free.
// That reasoning is written out at length at the top of interiors.js and it
// applies to a cave exactly as it applied to a smithy.
//
// So a den is an INTERIOR_ROOM like any other. What is new is only:
//
//   * the rooms are a generic POOL, claimed at world-build time by whichever
//     sites got placed, because sites are procedural and rooms have to exist
//     before the band is laid out;
//   * a den's door hangs off a SITE'S STRUCTURE rather than off a singleton
//     town building, which is the one thing the round-22 door code could not
//     already do;
//   * and the dressing is the round-64 palette: recoloured rock and tree props
//     standing inside the room, which is what makes a cave read as "a pocket
//     dimension very inclined to a single element" rather than as a dark
//     rectangle with barrels in it.
// ============================================================================

/**
 * The pool.
 *
 * Sized off what the world actually places: measured at 24 structure-bearing
 * sites, plus the hidden lairs this round adds, plus room to grow. A room in
 * the pool that nobody claims costs a floor rect and a wall ring in a corner of
 * the map no player will ever stand in, so the pool is deliberately generous --
 * running OUT would mean two caves sharing an interior, which is the one
 * outcome worth spending a few unused rectangles to avoid.
 */
import { CAVE_W, CAVE_H, CAVE_DOOR_X, CAVE_DOOR_SPAN } from './caveShapes.js';
// ROUND 103 -- THE POOL IS SIZED PER REGION NOW, NOT ONCE.
//
// 36 was measured against a FOUR-region world and hard-coded. Round 103 took
// the world to seven, which wants 47 rooms, and the pool ran out -- the exact
// outcome the note above says the generous sizing exists to avoid ("running
// OUT would mean two caves sharing an interior"). It did not error: the last
// eleven landmarks simply had no room behind their door. Caught by
// test_round64's "every landmark with a building has a room behind it",
// reporting 36 of 47.
//
// Nine per region is what the old number was: 36 across four. Twelve, so the
// generosity the note describes is real again -- 84 rooms against 47 claimed,
// and a room nobody claims is a rectangle of void in a band no player stands
// in. regions.js imports nothing but iso.js, so this stays a shallow leaf.
import { REGIONS } from './regions.js';

export const DEN_ROOMS_PER_REGION = 12;
export const DEN_ROOM_COUNT = DEN_ROOMS_PER_REGION * REGIONS.length;

/**
 * Smaller than the smithy's 18x14 on purpose. A cave should feel like it
 * closes in, and a smaller room is also cheaper: the wall ring is the bulk of
 * an interior's sprite cost, and thirty-six of them at the smithy's size would
 * roughly triple the scene's static display list on its own.
 */
// ROUND 88 -- THE ROOM IS THE CAVE'S GRID NOW.
//
// These were 13x11 rectangles and every den in the game was the same one. A
// cave has a shape as of this round (see caveShapes.js), and a shape needs
// room to be one -- 21x17, which is bigger and yet CHEAPER: the walls are
// TILE_VOID, which the ground renderer draws as nothing, so the wall ring
// that used to be the bulk of an interior's sprite cost is gone entirely.
export const DEN_ROOM_W = CAVE_W, DEN_ROOM_H = CAVE_H;

export const DEN_ROOMS = [];
for (let i = 0; i < DEN_ROOM_COUNT; i++) {
  DEN_ROOMS.push({
    id: `den_${i}`,
    // No `building`: a den's door is hung off a site's structure by
    // _buildDenDoorways, not off a singleton in this.buildings. The round-22
    // door loop skips rooms whose building it cannot find, which is exactly
    // the behaviour an unclaimed den wants.
    building: null,
    denSlot: i,
    name: 'A dark place',
    enterLabel: 'go inside',
    floor: 'forge',
    x: 0, y: 0, w: DEN_ROOM_W, h: DEN_ROOM_H,
    door: { at: CAVE_DOOR_X, span: CAVE_DOOR_SPAN },
    props: [],
    npcs: [],
    // ROUND 88 -- the den paints itself, tile by tile, exactly as the sewer
    // does. `caveFamily` is filled in at claim time (_claimDenRooms), because
    // which shape a cave gets depends on what KIND of site it is -- a cult
    // chamber wants a room to stand a ritual in, a mine wants workings.
    // `tileAt` and `caveFloor` are ATTACHED IN interiors.js rather than
    // written here: they need TILE_VOID, and importing interiors.js from this
    // file closes an import cycle (interiors -> dens -> interiors).
    caveFamily: null,
    caveSeed: `den_${i}`,
  });
}

/**
 * What each kind of site is like on the inside.
 *
 * `rocks` / `trees` are counts of PALETTE props -- the recoloured boulders and
 * trees from round 64's palette set, standing inside the room. A den with no
 * palette (a barn, a shrine) still gets them; they simply come out in ordinary
 * colours, which is the right answer for a barn.
 *
 * `fights` says whether the place holds anything. A shrine and a barn do not;
 * a mine, a vent, a barrow and a cult chamber very much do.
 *
 * Names follow the standing rule: the NAME carries the flavour, the BLURB says
 * plainly what is in the room.
 */
export const DEN_INTERIORS = {
  mineCave: {
    name: 'The Deep Seam', enterLabel: 'go down into the workings',
    blurb: 'Spoil heaps, a dead handcart, and the seam still showing in the rock.',
    rocks: 13, trees: 0, treeScale: 1.4, fights: true, wallPalette: true,
    props: ['handcart', 'ingotStack', 'barrelStack', 'brazierIron', 'crateProduce', 'toolBench'],
  },
  magmaCave: {
    name: 'The Burning Throat', enterLabel: 'go down into the vent',
    blurb: 'The floor is warm through your boots and the air moves the wrong way.',
    rocks: 11, trees: 3, treeScale: 1.3, fights: true, wallPalette: true,
    props: ['firePit', 'hearthStone', 'brazierBowl', 'stoveIron', 'coalTray'],
  },
  barrow: {
    name: 'The Barrow Deep', enterLabel: 'go into the barrow',
    blurb: 'A low chamber, everything in it laid out and nothing of it disturbed.',
    rocks: 11, trees: 4, treeScale: 1.3, fights: true, wallPalette: true,
    props: ['idol', 'amphora', 'scrollStand', 'brazierIron', 'sculpture'],
  },
  cultChamber: {
    name: 'The Red Room', enterLabel: 'go down into the chamber',
    blurb: 'A table, a drain in the floor, and the stains going up the walls.',
    rocks: 9, trees: 6, treeScale: 1.5, fights: true, wallPalette: true,
    props: ['tableDark', 'idol', 'brazierBowl', 'firePit', 'stoolWood', 'jugCluster'],
  },
  hiddenLair: {
    // The user's own example, and the reason the exterior is a barn: the joke
    // only works if the outside is boring.
    name: 'The Grove Under the Barn', enterLabel: 'open the barn doors',
    blurb: 'The barn has no floor. It has a slope, and a wood growing out of it.',
    rocks: 7, trees: 9, treeScale: 1.6, fights: true,
    props: ['idol', 'tableDark', 'brazierBowl', 'sacks'],
  },
  shrine: {
    name: 'The Shrine Cell', enterLabel: 'step into the shrine',
    blurb: 'One room, one seat, and offerings somebody is still bringing.',
    rocks: 5, trees: 2, treeScale: 1.2, fights: false,
    props: ['idol', 'benchStone', 'brazierIron', 'planter', 'scrollStand'],
  },
  farmFields: {
    name: 'The Long Barn', enterLabel: 'go into the barn',
    blurb: 'Sacks, crates, and a cart nobody has hitched in a while.',
    rocks: 2, trees: 0, treeScale: 1.2, fights: false,
    props: ['sacks', 'crateProduce', 'handcart', 'barrelStack', 'stoolWood', 'choppingBlock'],
  },
};

export const DEN_SITE_KEYS = Object.keys(DEN_INTERIORS);

/** Does this site type lead anywhere? */
export function denInteriorFor(siteKey) { return DEN_INTERIORS[siteKey] || null; }

/**
 * How many monsters a den holds, by region index.
 *
 * A den is a room the player chooses to walk into, so it can be denser than the
 * open world without being unfair -- but it is also a small room with one exit,
 * so the count stays low enough that a fight there is a fight and not a pin.
 */
export const DEN_PACK_SIZE = [3, 3, 4, 4];

/**
 * How much likelier the inside is to be holding something than the doorstep.
 *
 * Deliberately a small number. The surface roll is 22% for a stone and 7% for
 * an essence; 1.6x takes those to about 35% and 11%, which is a better reason
 * to go in without making the den the efficient way to farm -- the user's rule
 * for these places is that a find is "a fun bonus of exploration not the easy
 * way to collect your essences or awakening stones", and it applies indoors.
 * The den and the surface share ONE refresh timer, so clearing a cave does not
 * also let you pick up the thing standing outside it.
 */
export const DEN_FIND_BONUS = 1.6;

/**
 * The species a den can hold: the families its fiction allows, at a threat tier
 * the region has earned, and nothing else.
 *
 * Falls back through "right tier, any family" to "any tier, right family"
 * rather than returning nothing. An empty den is a silent failure of exactly
 * the kind this codebase keeps finding -- a room that was promised monsters,
 * printed as holding monsters, and holds none.
 */
export function denMonsterKeys(families, tier, monsterTypes, keysAtTier) {
  const fam = new Set(families || []);
  const atTier = keysAtTier(tier) || [];
  const both = atTier.filter(k => fam.has(monsterTypes[k] && monsterTypes[k].family));
  if (both.length) return both;
  const anyTier = Object.keys(monsterTypes).filter(k => fam.has(monsterTypes[k].family));
  if (anyTier.length) return anyTier;
  return atTier;
}
