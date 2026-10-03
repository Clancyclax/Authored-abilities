// ===========================================================================
// ROUND 246 -- THE LAMPS, SPLIT BY REGION.
//
// The user, attaching seventeen of them:
//
//   "I've attached various lampposts that should be split up by region and not
//    mixed together. These will need placed at the city entrances and
//    strategically on the roads."
//   ...and, asked whether they should wait for the lighting work: "Lamps go in
//    prior to the lighting build."
//
// WHICH IS THE RIGHT ORDER, and worth saying why. The lighting round draws a
// mask with a hole punched for each light source, and the single biggest thing
// that decides whether that reads as a lit world or as a sprinkling of glowing
// dots is WHERE the lights are. Placing the posts first means the lighting pass
// arrives with a world that already has lamps at its gates and along its roads
// and only has to make them shine. Doing it the other way round would mean
// tuning a lighting system against light sources that did not exist yet.
//
// SPLIT BY LOOK, NOT BY NUMBER. "Not mixed together" is the whole instruction:
// a region's lamps have to read as one town's ironmongery rather than as a
// sample book. Each row below says what the art actually is, because the file
// names are `Lamposts_various_magical_and_11` and carry nothing -- and a table
// whose keys mean nothing is a table the next round guesses at.
//
// Regions and their character, from regions.js's own blurbs:
//
//   nek       grasslands and forests, the starting city where two rivers meet
//   ontaria   oceanside forests, cities in the northwest, villages on water
//   elehyd    desolate badlands and icy peaks; roads fade into dirt
//   bratugal  jungle, rainforest and swamp around one great city
//   sirukh    a hot island of dunes and salt pan
//   cinder    ash plains and lava fields
//   ixcuatl   a stepped city swallowed by jungle, nobody has lived here in a
//             long time
// ===========================================================================

/** Column into public/assets/lampposts.png. One row of 80px cells. */
export const LAMP_CELL = 80;

export const LAMP_ROWS = {
  orbCradle: 0,     // pale carved stone, two hands cradling a white orb
  frostTree: 1,     // a bare pale tree, frost-white, a light in the fork
  ironPlated: 2,    // dark timber and riveted iron, mail hanging, warm lantern
  townHook: 3,      // dark wood post, curved iron arm, warm flame
  batSkull: 4,      // black iron, bat wings, a skull under each
  ironCross: 5,     // plain iron cross-post, sturdy, warm lantern
  candelabra: 6,    // gilt candelabra, three white flames
  blueFlame: 7,     // slim steel post, a cold blue-white flame
  groveTree: 8,     // living tree hung with two green-glass lanterns
  furnace: 9,       // iron gantry, an open furnace and a second lantern
  coilBronze: 10,   // bronze curl on a twisted rope-like base, green glass
  copperShade: 11,  // plain post, simple copper shade
  lashedBeam: 12,   // lashed timber crossbeam, a hanging oil lantern
  clockwork: 13,    // brass gears and linkage, a lantern on the arm
  gothicHook: 14,   // black wrought iron, twisted stem, hooded lantern
  stonePillar: 15,  // tall pale pillar with violet gem insets
  signpost: 16,     // a lantern atop a signpost with direction boards
};

/**
 * Which lamps belong to which region.
 *
 * TWO OR THREE EACH, deliberately. One would make a region look like it was
 * built by a single contractor; five would be the sample book the user asked
 * not to have. Within a region the pick is hashed off the post's own position,
 * so a street is varied and a given corner always has the same lamp.
 */
export const LAMPS_BY_REGION = {
  // Warm, ordinary, wood-and-iron: the one place in the game that is simply a
  // working town.
  nek: ['townHook', 'ironCross', 'copperShade'],
  // Ports and ledgers. Brass and rope, kept clean because somebody is paid to.
  ontaria: ['clockwork', 'coilBronze'],
  // Cold light on pale stone. Nothing here burns; it glows.
  elehyd: ['orbCradle', 'frostTree', 'blueFlame'],
  // The great city in the jungle: gilt where it is rich, green glass and
  // growing wood where the swamp has got in.
  bratugal: ['candelabra', 'groveTree'],
  // Improvised and sun-bleached -- lashed timber, and the old pillars that
  // were already standing.
  sirukh: ['lashedBeam', 'stonePillar'],
  // Everything here is a furnace or is made of what was left of one.
  cinder: ['furnace', 'ironPlated'],
  // Nobody has lived here in a long time, and the lamps were never friendly.
  ixcuatl: ['batSkull', 'gothicHook'],
};

/**
 * The one lamp that is NOT a region's own: a signpost with direction boards
 * and a lantern on top.
 *
 * It belongs to the ROAD rather than to a place, which is why it is the only
 * one shared -- a traveller's marker at a junction means the same thing in
 * every region, and that is the point of it. It is also the only one in the
 * set that carries information, so it goes where a decision is made.
 */
export const ROAD_SIGNPOST = 'signpost';

/** How far apart lamps stand along a road, in tiles. Far enough that a lit
 *  road is a chain of pools rather than a continuous glare, which is the look
 *  the lighting round will be aiming at. */
export const LAMP_ROAD_SPACING = 14;

/** How far off the carriageway a lamp stands, in tiles. On the verge: a lamp
 *  in the road is something carts drive through. */
export const LAMP_VERGE_TILES = 2;

/** Lamps flanking a gate, and how far apart. A city entrance gets a matched
 *  pair, which is what makes it read as an entrance rather than as more road. */
export const LAMP_GATE_SPREAD = 3;

/** The lamps this region uses, in order. Unknown regions fall back to the
 *  starting region's, which is the only set that is deliberately plain. */
export function lampsFor(regionId) {
  return LAMPS_BY_REGION[regionId] || LAMPS_BY_REGION.nek;
}

/**
 * Which lamp stands at this spot.
 *
 * Hashed off the tile, so the choice is stable -- a lamp does not change model
 * when the viewport pools it out and back in, which is the fault round 84 and
 * round 240 both paid for in other systems.
 */
export function lampAt(regionId, tx, ty) {
  const pool = lampsFor(regionId);
  const h = Math.abs(Math.imul(tx | 0, 0x9e3779b1) ^ Math.imul(ty | 0, 0x85ebca6b));
  return pool[h % pool.length];
}

/** Faults: what would make this table wrong. */
export function lamppostFaults(regionIds = Object.keys(LAMPS_BY_REGION)) {
  const out = [];
  const seen = new Map();
  for (const [region, keys] of Object.entries(LAMPS_BY_REGION)) {
    if (!keys.length) out.push(`${region}: has no lamps`);
    for (const k of keys) {
      if (LAMP_ROWS[k] === undefined) out.push(`${region}: names a lamp ${k} that is not in the sheet`);
      // "not mixed together" is the instruction, so a lamp shared between two
      // regions is a fault rather than a saving.
      if (seen.has(k)) out.push(`${k} is used by both ${seen.get(k)} and ${region}`);
      seen.set(k, region);
    }
  }
  // Every region the world builds must have a set, or it silently borrows the
  // Nek's and two places look the same.
  for (const id of regionIds) {
    if (!LAMPS_BY_REGION[id]) out.push(`region ${id} has no lamps of its own`);
  }
  // Every lamp in the sheet is used by somebody, or it is art nobody sees --
  // the census fault this project has hit four times.
  for (const k of Object.keys(LAMP_ROWS)) {
    if (k === ROAD_SIGNPOST) continue;
    if (!seen.has(k)) out.push(`${k} is in the sheet and no region uses it`);
  }
  if (LAMP_ROWS[ROAD_SIGNPOST] === undefined) out.push('the road signpost is not in the sheet');
  if (seen.has(ROAD_SIGNPOST)) out.push('the road signpost belongs to the road, not to a region');
  return out;
}
