// ROUND 43 -- THE FOUR REGIONS OF PALLIMUSTUS.
//
// The user's world design, encoded. Everything the world generator needs to
// build a region lives here as data: where it sits in the world grid, what
// its ground is made of, which settlements stand in it, where its water and
// roads run, which ranks of monster live there and in what group sizes, and
// what it takes to leave.
//
// -----------------------------------------------------------------------
// WHY ONE ARRAY AND NOT FOUR MAPS
// -----------------------------------------------------------------------
// The tile map is a flat Uint8Array and anything outside it has no floor at
// all (the round-36 temples proved that the hard way -- they sat outside the
// array and rendered as black rooms for five rounds). So all four regions
// live in ONE array as a 2x2 grid of REGION_TILES squares, with a reserved
// INTERIOR BAND of rows below them for every interior. Travel between
// regions is a gate, a ship or a portal -- never a walk across a border --
// so their grid adjacency is bookkeeping, not geography.
//
// -----------------------------------------------------------------------
// RANK IS THE REGION'S PROPERTY, NOT THE DISTANCE'S
// -----------------------------------------------------------------------
// Round 41 capped coin rank by distance band. From here the REGION sets the
// band and distance-from-arrival only shifts the mix inside it: The Nek is
// Normal/Iron wherever you stand, Bratugal is Bronze/Silver/Gold wherever
// you stand. `spawnGroups[].from` is the fraction of the region's radius at
// which a group starts appearing, which is what "the standard danger
// increasing as you move farther away from the spawn point" means once rank
// itself is fixed by where you are in the world.
//
// -----------------------------------------------------------------------
// PACKS AND SUPER PACKS
// -----------------------------------------------------------------------
// The user, verbatim: "When I say 'packs' and 'super packs' I'm referring to
// groups of the same monster together. The intent is to allow players to
// feel how much stronger their abilities are getting as they move from
// killing 1-2 of a creature to dozens, while also demonstrating how much
// tougher enemies are getting at each rank." So a group is one SPECIES
// repeated, and the size band is the whole point: 10-30 of a rank you have
// outgrown, 2-8 of your own rank, 1 of the rank above you.
//
// TIERS ARE RANKS. monsterThreatTier returns 0-4 and the coin ladder already
// reads that as normal/iron/bronze/silver/gold (monsters.js
// COIN_RANK_BY_TIER). DIAMOND IS DELIBERATELY ABSENT -- the user's note:
// "no region is actually diamond rank and no monsters should be diamond
// rank", so tier 4 (gold) is the ceiling anywhere in the world.

import { TILE } from './iso.js';
// ROUND 134 (item 6) -- the desktop editor's overlay. A leaf module: it
// imports nothing, so this file importing it cannot create a cycle.
import { applyRegionEdits } from './regionEdits.js';
import { BANDIT_CITIES, banditSettlement } from './banditCities.js';

// One new tile id beyond the ones town.js (0-7) and interiors.js (8-11) own:
// a region's ROUGH ground -- Elehyd's icy peaks, Bratugal's bog. It renders
// from whichever pack that region names as its accent, so one id covers
// every biome's second surface.
export const TILE_ACCENT = 12;

// ===========================================================================
// ROUND 134 (item 6) -- WHAT A PAINT STROKE MAY BE MADE OF.
//
// The user asked for a region's terrain -- "biomes and coastline" -- to be
// editable in the desktop editor. A region's `terrain` array is a list of
// painted rectangles, each naming one of these; `_stampTerrainPatch` in
// WorldScene writes them into `tileType` after every generator has had its
// say, so a stroke is a correction that wins.
//
// A SHORT LIST, ON PURPOSE. `tileType` carries eighteen values and most of
// them are not terrain: TILE_CITY, TILE_STREET, TILE_PLAZA and TILE_DOCK are
// things a settlement or a jetty STAMPS and mean "a town is here", so
// painting one would claim a town that does not exist -- the streets would
// draw and nothing would stand on them. TILE_VOID is the dark beyond a room
// and TILE_GARDEN belongs to the soul space.
//
// What is left is the five surfaces a coastline and a biome band are actually
// made of: ground, rough ground, and the three depths of water. That is
// enough to widen a bay, cut an inlet, run a shoal along a shore, or push a
// band of peaks another mile south -- which is the whole of what was asked.
//
// Keyed by a WORD rather than by the number. A data file full of `type: 5` is
// a data file nobody can review, and this one is meant to be read in a diff.
export const TERRAIN_PAINT = {
  ground: { code: 0, label: 'Ground' },          // TILE_GRASS
  rough: { code: 12, label: 'Rough ground' },    // TILE_ACCENT -- peaks, bog
  shallows: { code: 4, label: 'Shallow water' },  // TILE_WATER_LIGHT
  deep: { code: 5, label: 'Deep water' },         // TILE_WATER_DEEP
  rapids: { code: 6, label: 'Rapids' },           // TILE_WATER_RAPIDS
};
export const TERRAIN_PAINT_KEYS = Object.keys(TERRAIN_PAINT);
/** The lookup the rasteriser uses: word -> tile id. */
export const TERRAIN_PAINT_CODES = Object.fromEntries(
  Object.entries(TERRAIN_PAINT).map(([k, v]) => [k, v.code]));
/** The widest single stroke, in tiles. A region is 1024 across; a stroke that
 *  could cover a quarter of it is a stroke somebody made by accident. */
export const TERRAIN_PATCH_MAX = 128;

/**
 * Faults in one region's `terrain` array.
 *
 * Same shape and same job as `placedFaults`: a patch that names a type the
 * rasteriser does not know draws nothing and says nothing, which is this
 * project's most repeated fault and the one worth a check every time.
 */
export function terrainFaults(region, regionTiles = 1024) {
  const out = [];
  (region.terrain || []).forEach((t, i) => {
    const at = `${region.id}.terrain[${i}]`;
    if (!t || typeof t !== 'object') { out.push(`${at} is not a patch`); return; }
    if (!TERRAIN_PAINT[t.type]) {
      out.push(`${at} paints '${t.type}'; the types are ${TERRAIN_PAINT_KEYS.join(', ')}`);
    }
    if (!t.at || typeof t.at.tx !== 'number' || typeof t.at.ty !== 'number') {
      out.push(`${at} has no position`); return;
    }
    const w = t.w === undefined ? 1 : t.w;
    const h = t.h === undefined ? 1 : t.h;
    for (const [n, v] of [['w', w], ['h', h]]) {
      if (!Number.isFinite(v) || v < 1 || v > TERRAIN_PATCH_MAX) {
        out.push(`${at} has ${n}=${v}; a patch is 1-${TERRAIN_PATCH_MAX} tiles`);
      }
    }
    if (t.at.tx < 0 || t.at.ty < 0
      || t.at.tx + w > regionTiles || t.at.ty + h > regionTiles) {
      out.push(`${at} runs from ${t.at.tx},${t.at.ty} for ${w}x${h}, off the region`);
    }
  });
  return out;
}

// ROUND 45 -- FRAME SUBSETS.
//
// The eight region packs shipped in round 37 and were wired up in round 43 by
// NAME, on the assumption that a pack's sixteen tiles are sixteen variants of
// one material. Two of them are not, and looking at regions 3 and 4 on screen
// this round made that obvious:
//
//   'mountain' is four different biomes in one pack -- grey rock (0-3, 13),
//   snow and ice (4-7, 14-15) and desert sand (8-12). Picking uniformly from
//   all sixteen scattered snow, stone and dune across the same hillside like
//   confetti.
//
//   'slate_dark' is not slate at all: it is dark, rippling, murky WATER, fish
//   included. Elehyd named it as its GROUND, so the entire badlands region
//   was rendering as the bottom of a lake.
//
// So a region can now name a subset of a pack's frames per role rather than
// the whole pack. Absent an entry, all of a pack's frames are used, which is
// what every other pack wants.
export const PACK_FRAMES = {
  mountain: {
    // Bare rock and stone for the ground you walk on...
    ground: [0, 1, 2, 3, 13, 15],
    // ...snow and ice for the peaks (TILE_ACCENT).
    accent: [4, 5, 6, 7, 14, 15],
    // ROUND 77 -- ...and the desert. See `desert` on Elehyd below.
    //
    // Round 45 identified frames 8-12 as desert sand and correctly kept them
    // OUT of both roles, because mixing dunes into a snowfield by hash is what
    // it was fixing. What it could not do was give them anywhere else to go,
    // so they have been loaded and drawn zero times for thirty-two rounds --
    // found by rendering all 288 tiles side by side for item 3, which is the
    // second time this round that looking at the art rather than the code
    // turned up something the code could not show.
    //
    // It matters because the user calls Elehyd "region 3's mountainous desert"
    // and has now sent fifty cacti for it, and the desert was not there: the
    // first screenshots of the new flora are saguaros standing on snow.
    desert: [8, 9, 10, 11, 12],
  },

  // ROUND 103 -- THE SCREAMING BRAIN SETS ARE VARIETY PACKS, NOT BIOME PACKS,
  // so every one of them needs a subset here or it reads as a patchwork quilt.
  //
  // "Dry" is sand AND cracked clay AND olive scrub AND grey gravel AND pink
  // stone -- six grounds, not six shades of one. Tiled at random it
  // checkerboards; grouping by luminance (the GRASS_TILE_GROUPS trick) only
  // half fixes it, because the spread is in HUE. Measured and then looked at,
  // which is the only way any of this was ever going to be decided.
  //
  // These subsets were FIRST picked by measuring mean hue, luminance and
  // saturation per tile. That failed: `sirukh` still checkerboarded, because a
  // saturation threshold cannot tell pink clay from cream sand when both are
  // pale and both are warm. The lists below were picked BY EYE off labelled
  // contact sheets (tools/label_sbs_sheet.py), which took twenty minutes and
  // is the only method that has ever worked on this pack.
  // A `groundGroups` entry, where present, is used INSTEAD of `ground` and is
  // read through patchPick: a low-frequency hash picks the group for a 6x6
  // patch, the tile's own hash picks within it. `ground` stays as the flat
  // union for anything that asks for the role directly.
  //
  // This is the other half of the checkerboard, and curation alone would not
  // have fixed it: the pack draw picked `subset[hash % subset.length]` per
  // tile with nothing tying neighbours together, so even eight tiles of one
  // hue alternated hard. Grouping also promotes the strongest tiles from
  // noise to terrain -- the dune ripples now arrive in fields of them, which
  // is what a dune is.
  sbs_dry: {
    // Cream and ochre sand. No clay reds (12, 26), no olive scrub (1, 19, 25),
    // no grey gravel (10, 13, 14, 15).
    ground: [2, 6, 21, 23, 24, 30, 31, 32, 33],
    // A GROUP HAS TO AGREE WITH ITSELF. The first pass grouped by "sand",
    // which put peach 2 next to yellow 21 next to cream 24 next to pink 31 --
    // patched, and still checkering inside every patch. The difference goes
    // BETWEEN groups; within a group the tiles have to be near enough to
    // interchangeable that the variation reads as grain.
    //
    // Repeated entries weight the roll: patchPick picks a group uniformly, so
    // the pale flats appear twice and carry 2/7 of the island each, and the
    // dune field is one seventh, which is roughly what a dune field is.
    groundGroups: [
      [21, 24], [21, 24],   // pale cream flats -- the bulk of the island
      [2, 31, 32], [2, 31, 32], // the warmer peach-pink flats
      [6],                  // flat ochre
      [23, 33],             // ripple, which wants to arrive in fields
      [30],                 // the one dune with a shadow in it, alone, so its
                            // chevron reads as relief instead of as noise
    ],
    // Salt pan, crust and shell gravel -- the pale end, for a desert island's
    // margins where the sea got in and then left.
    accent: [27, 28, 34, 35],
  },
  sbs_rocky: {
    // Basalt. Mid-to-dark grey with no cast: 33 is lilac and 21/28 are salmon,
    // which is how the measured pass got a pink volcano.
    ground: [11, 14, 15, 23, 25, 27],
    groundGroups: [
      [11, 14, 27],      // mid grey, rough
      [15, 23, 25],      // the darker flows
    ],
    // Lava. Orange cracks scattered sparsely over basalt, which is what a
    // cooling flow looks like from above. 20 and 26 are grey tiles with a
    // little glow in them and at tile size they read as pink dirt, not as
    // fire; the three left are unambiguous.
    accent: [19, 24, 29],
  },
  sbs_stones: {
    // Warm tan-grey worked paving and the bare earth between it.
    ground: [2, 10, 15, 17, 19, 21, 24],
    groundGroups: [
      [2, 21, 24],       // tan paving, still laid
      [10, 15, 19],      // grey-brown cobble, broken up
      [17],              // bare earth -- one tile is a group, and a patch of
                         // nothing but soil is exactly what a ruin has.
    ],
    // Moss in the joints and rubble in the gutters: the city losing.
    accent: [1, 6, 16, 29, 35],
  },
  // Not a water pack -- an ELEMENTS pack: twenty shades of sea, then fire,
  // acid, blood and slime. Cinder names it for the fire, and the two roles
  // here are what a lava river is made of. Anything asking `sbs_elements` for
  // ordinary water would want 0-16 and should say so in its own subset.
  // Roles are inverted against what the names suggest, deliberately. The
  // water pass calls the BANKS light and the CHANNEL deep, and a lava river
  // is the other way round: it crusts over at the edge where it touches cold
  // rock and runs brightest down the middle. So `water` is the crust and
  // `deep` is the molten core.
  //
  // Two frames each, not three. The first pass took 21, 24 and 32 together
  // and the river came back striped pink-red-brown, one tile at a time --
  // the same checkerboard the ground packs had, for the same reason, and a
  // river is nine tiles wide so there is nowhere for it to hide.
  sbs_elements: {
    water: [19, 20],       // crusted, cooling: the banks
    deep: [21, 32],        // molten: the channel
  },
  // ROUND 177 -- THE LAVA PACK, and the roles are the ones the note above
  // works out for `sbs_elements`: a flow crusts over at the edge where it
  // touches cold rock and runs brightest down the middle, so `water` is the
  // CRUST (the banks) and `deep` is the MOLTEN CORE (the channel).
  //
  // TWELVE TILES, from two deliveries in the same round ("more lava tiles to
  // increase variety"), read as one list rather than as a pack and an
  // expansion -- a tile belongs to the banks or the channel because of how
  // much of it is glowing, not because of which sheet it arrived in. Measured,
  // the second delivery is much the brighter, and splitting by sheet would
  // have put five molten tiles in the banks.
  //
  // THE MEASUREMENT GIVES THE ORDERING; WHERE TO CUT IS A DESIGN CALL, and
  // `extract_round177_lava.py` prints both candidates rather than applying one
  // quietly. The largest numeric gap is the WRONG cut:
  //
  //     3.5% -> 18.9%   a 15-point gap, but it leaves THREE bank tiles
  //    27.1% -> 31.2%   a 4-point gap, and the one that ships
  //
  // Cinder holds 2,225 shallow tiles against 3,706 deep, so three variants on
  // the banks repeat where a player walks and seven in the channel do not.
  // The second break is also where the PICTURES divide: everything below it is
  // dark rock with a seam or an ember in it, everything above is bright enough
  // that the rock is the minority of the tile.
  //
  // AND THE CHANNEL IS WEIGHTED, which is the one thing the screenshot said
  // that the numbers did not. `_groundTileVisual` picks with `sub[hash %
  // sub.length]` -- a flat uniform draw over whatever is in the list -- and
  // three of the seven molten tiles carry a STRONG MOTIF: spirals (8), a ring
  // of bubbles (6), and dark shapes suspended in the flow (11). Uniform, those
  // three are 43% of a nine-tile-wide river and the eye picks the pattern out
  // immediately; the four plainer ones (a pool, crazed cracks, a lattice, a
  // flow) are what a river should mostly be made of.
  //
  // Listed twice, because repeating an entry is how you weight a uniform draw
  // without teaching the picker a second concept. The motifs fall to 3 in 11
  // and read as things you come across rather than as wallpaper.
  region_lava: {
    water: [0, 1, 2, 4, 10],                        // crusted, cooling: the banks
    deep: [3, 3, 5, 5, 7, 7, 9, 9, 6, 8, 11],       // molten: the channel
  },
  sbs_ice: {
    // Kept for the region that has not been built yet. Pale and desaturated,
    // luminance 152-245, and the one palette in the whole pack that reads as
    // a coherent field with no curation beyond this line.
    ground: [0, 1, 2, 4, 5, 6, 9, 11, 12, 17, 21, 22],
    accent: [3, 7, 13, 15, 16],
  },
};
/**
 * ROUND 103 -- HOW DANGEROUS A REGION'S DENS ARE, on the four-step scale the
 * den tables use.
 *
 * The region's own top declared spawn tier, clamped to the tables' four rows.
 * Every den table in the game -- DEN_PACK_SIZE, REGION_DEN_FAMILIES,
 * denMonsterKeys -- is four entries indexed by this, and every one of them was
 * being indexed by the region's INDEX instead, which was the same number by
 * coincidence while there were four regions and stopped being one the moment
 * there were seven. One function, so the next thing to grow this way finds an
 * answer rather than a fifth copy of the coincidence.
 */
export function regionDenTier(region) {
  const r = typeof region === 'number' ? REGIONS[region] : region;
  if (!r) return 0;
  return Math.max(0, Math.min(3, Math.max(0, ...((r.spawnGroups || []).map(g => g.tier || 0)))));
}

export function packFrames(pack, role) {
  const e = PACK_FRAMES[pack];
  return (e && e[role]) || null;
}

/**
 * ROUND 77 -- is this tile in its region's desert band, and how strongly?
 *
 * Returns 0 outside the band, 1 deep inside it, and a fraction across the
 * blend. Takes REGION-LOCAL tile coordinates, like every other authoring
 * helper in this file.
 *
 * A fraction rather than a boolean because a hard edge between rock and sand
 * across the width of a region is the thing that would make this look
 * generated. The caller compares it against the tile's own position hash, so
 * the mixing is stable and needs nothing stored -- the same trick
 * `_stampSwamp` uses for the bog's edge.
 */
export function desertStrength(region, tx, ty) {
  const d = region && region.desert;
  if (!d) return 0;
  const blend = d.blend || 1;
  if (ty <= d.southOf) return 0;
  return Math.min(1, (ty - d.southOf) / blend);
}

// --- world geometry --------------------------------------------------------
// 1024 tiles a side: 32,768 world units, about 218 seconds to cross at a run.
// The user picked this size knowing that number.
export const REGION_TILES = 2048;
// ROUND 103 -- 2x2 -> 3x3. Acts 2, 3 and 4 each gain a region: a sandy desert
// island, a volcanic region, and an abandoned city. Nine slots for seven
// regions, and the two empty ones are deliberate headroom -- `regionAtTile`
// returns null for a slot no region claims, which is already how the map
// margins behave.
//
// 3x3 rather than 4x2 because the tile array is SQUARE: 4x2 would need it
// 4096 a side (16.8 MB) where 3x3 needs 3680 (13.5 MB), and a 4-wide world is
// a long thin map nobody asked for.
// ROUND 195 -- MEASURED, AND LEFT AT 3x3.
//
// The southern continent's twelve regions were going to need thirteen free
// slots, which meant growing the grid to 5x4. Measured on this box, three
// restarts a stage:
//
//   3x3, 7 regions, tileType 45.6 MB .............. 17.1 s
//   5x4, 7 regions, tileType 104.9 MB ............. 23.8 s   (+6.7 s, the grid)
//   5x4, 9 regions ................................ 26.4 s   (+1.3 s a region)
//
// REGION_TILES is 2048 (round 144 doubled it), so a 5x4 grid is a 104.9 MB
// tile array rather than the 26 MB a 1024-tile region would have cost -- and
// the grid growth costs 6.7 seconds of every boot of every suite before a
// single southern region is written.
//
// So the south is built the way round 194 builds a generated square: one
// region at a time, into the spare slot, on entry. That needs ONE free slot,
// which 3x3 already has, and the grid stays where it is. See src/data/south.js.
export const WORLD_COLS = 3, WORLD_ROWS = 3;
// Rows of tiles reserved BELOW the region grid for every interior in the
// game (see interiors.js). 128 tiles was room for the eleven rooms that
// existed plus the ones the story still needed, with void margin around each.
//
// ROUND 197 -- 224, AND MEASURED BEFORE IT WAS CHOSEN.
//
// The nine vehicle interiors are the first rooms in this game that are bigger
// than a building: the skyship is 40x80 and the dragon house is 80x80 on three
// levels, against a previous tallest of 45. `resiteInteriorsIntoBand` packs
// rooms into rows as tall as their tallest member, so an 80-tall room needs an
// 80-row band of its own, and the 157 rooms already here use about 68 of the
// 128. There were 60 rows left and the two big ones need 160.
//
// The cost is exactly what round 103's note says it is: MAP_TILES_TOTAL is
// `rows + this + the astral band`, so more rows is a bigger tile array. The
// number is the MEASURED requirement and not a round one: with the eleven
// vehicle rooms in it the packer's last occupied row is 130, so 176 leaves 46
// spare for the rooms the story still needs. That takes the array from 6752 to
// 6800 a side -- 45.6 MB to 46.2 MB, up 1.3%.
//
// The alternative was building vehicle interiors one at a time into a reserved
// slot, the way the south is built (round 195). It was rejected for a reason
// that is about the game rather than the memory: a party can leave a vehicle
// parked in one region and walk into another, and a single slot would mean the
// wagon's inside stops existing the moment anybody enters a skyship. These are
// homes, not scenery.
export const INTERIOR_BAND_TILES = 176;
// ROUND 88 -- AND A SECOND BAND UNDER IT, FOR THE ASTRAL REALMS.
//
// Measured before it was chosen: after `resiteInteriorsIntoBand` lays the 54
// interiors, the band's last occupied row is 2132 and there are 44 rows spare.
// A realm is 224 tiles a side (see astral.js for why that number and not the
// 341 the ask asked for), so four of them need 480 rows they cannot have.
//
// A SEPARATE band rather than a bigger one, and the separation is what makes
// this cheap: `_stampInteriorBand` walks every row it is given, and growing
// the interior band from 128 to 608 would have quadrupled a build-time loop
// that paints nothing for four fifths of its length. The realms are stamped
// ON ENTRY instead, one at a time, by the player who goes there -- so this
// band is reserved space that costs nothing until it is used.
export const ASTRAL_BAND_TILES = 480;
export const WORLD_TILES = REGION_TILES * WORLD_COLS;                    // 2048
export const INTERIOR_BAND_Y0 = REGION_TILES * WORLD_ROWS;               // first interior row
export const ASTRAL_BAND_Y0 = INTERIOR_BAND_Y0 + INTERIOR_BAND_TILES;    // 2176
export const INTERIOR_BAND_Y1 = ASTRAL_BAND_Y0;   // one past the last ordinary interior row
// ROUND 103 -- THE SQUARE ARRAY HAS TO COVER THE WIDER AXIS, NOT JUST THE ROWS.
//
// This was `REGION_TILES * WORLD_ROWS + bands` -- rows only -- and it was
// correct for exactly as long as the grid was square. `this.tileType` is
// `new Uint8Array(MAP_TILES * MAP_TILES)` and `_setTile` bounds-checks
// `tx >= MAP_TILES`, so the moment WORLD_COLS exceeded WORLD_ROWS the whole
// right-hand column of the world would have been OUTSIDE THE ARRAY: every
// tile written there dropped on the floor, every read back as TILE_VOID, no
// error anywhere. A third of the new world would simply have rendered as
// nothing, and the first symptom would have been an empty region.
//
// Flagged in WORLD_SCALE.md before the grid was touched, and fixed before it
// was touched, which is the only reason it is a note rather than a round.
export const MAP_TILES_TOTAL = Math.max(
  REGION_TILES * WORLD_COLS,
  REGION_TILES * WORLD_ROWS + INTERIOR_BAND_TILES + ASTRAL_BAND_TILES,
);                                                                       // 6752

// Region-local helpers: authoring is in TILES from the region's own corner.
const R = (tx, ty) => ({ tx, ty });

// --- the regions -----------------------------------------------------------
export const REGIONS = [
  {
    id: 'nek', name: 'The Nek', index: 0, col: 0, row: 0,
    // ROUND 107 -- HAND-PLACED OBJECTS. One entry of each of the four kinds,
    // in Cadence and just outside it, so the feature ships with something a
    // person can walk to rather than only with the machinery to express it.
    // An empty `placed` on every region would have been a system nobody could
    // tell was working.
    //
    // Coordinates are region-LOCAL tiles, the same as `settlements`, `lakes`
    // and every `R(x, y)` in this file. Cadence sits at 442,512 with a radius
    // of 61, so these are on and around its square.
    // THE COORDINATES ARE CHOSEN TO CONTEST GROUND THE GENERATOR WANTS, and
    // that is not decoration -- it is what makes the keep-clear testable.
    // The first draft put these on quiet ground, round 107's probe passed,
    // and then it went on passing with every keep-clear hook commented out.
    // A check that cannot fail is decoration; these tiles were read off the
    // running game (a stall at 447,510, spicePots at 447,512, the generated
    // fountain at 436,529, trees at 499,456-462) so that removing the guard
    // visibly puts a market stall inside a statue.
    placed: [
      // ROUND 187 -- both moved with the market (see `marketAt`), 230 tiles
      // west, keeping the contest with the generator they exist to provide.
      // Standing in the middle of the market row.
      { kind: 'cityProp', key: 'statue', at: R(659, 1023) },
      // Where the generated fountain goes.
      //
      // ROUND 162 -- A FOUNTAIN, NOT A WELL, AND THE PROP MATTERS NOW. The
      // user: "remove the 2nd well in Cadence. Only leave the well on the
      // original sewer exit."
      //
      // This entry is a round-107 TEST FIXTURE -- one of four placed on
      // contested ground so that removing a keep-clear hook visibly puts a
      // market stall inside a statue. Its job is to be a placed cityProp the
      // generator has to step around, and any prop does that job. A WELL
      // stopped being any prop in round 157, when a well became the mouth of a
      // dungeon: this fixture was quietly giving Cadence a second hole in the
      // ground seventeen tiles from the manhole, and round 161 found it
      // opening a generated dungeon named "Under Cadence".
      //
      // A fountain is what the line above it always said this tile was for, it
      // is what a city's square carries, and it is not a door. The fixture
      // keeps its purpose and Cadence keeps exactly one well.
      { kind: 'cityProp', key: 'fountain', at: R(648, 1041) },
      // In the thick of the trees east of the city.
      // ROUND 187 -- across the river now. 941,971 is inside the rebuilt
      // capital's north-east estate, on a mansion's lawn.
      { kind: 'scenery', key: 'tree', at: R(1101, 971) },
      { kind: 'scenery', key: 'rock', at: R(1091, 964) },
    ],
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 0.95, rockDensity: 0.9,
    blurb: 'Grasslands and forests, a city where two rivers meet.',
    // Region 1 keeps the hand-tuned grass atlas the game has always used --
    // it IS grassland, and the eight region packs were sent "in preparation
    // for the additional regions", not to repaint this one.
    ground: null, accentPack: 'grass_plank',
    // Where a new arrival stands. Region 1 is where the game begins, so this
    // is also the player's world spawn.
    // ROUND 49 -- MOVED 70 TILES WEST (40, then 10, then another 20). The user, on the outline: "Move the
    // entire city and all objects / NPCs 40 tiles west, this should put the
    // river running past instead of through the city." -- and then, once that
    // landed with the water hugging the east wall: "Move the whole city another
    // 10 tiles west", and then "Lets move the city another 20 tiles west". The
    // rivers are defined
    // below in their own region-tile coordinates and deliberately do NOT move
    // with it -- that is the whole point of the move: the water stays where it
    // is and the city steps out of it.
    //
    // Moving BOTH `arrival` and nek_city's `at` is what makes "the entire city
    // and all objects / NPCs" true in one edit rather than forty. townOrigin is
    // arrivalPoint(startRegion()), and every part of the capital is measured
    // from it -- the outline square, the bullseye, the wall, the quest board,
    // the player's spawn, the townsfolk, the watch and the gods. The
    // settlement's own `at` has to move with it or the two disagree: `at`
    // drives _inAnySettlement, the meditation check, the monster-spawn
    // exclusion and the region gate, none of which read townOrigin.
    // ROUND 187 -- ANOTHER 130 TILES WEST, for the same reason and measured
    // the same way. The capital is nine times the ground it was, so the river
    // round 49 stepped the old city out of runs straight through the new one:
    // the north-south channel at region tx 1024-1120 sits at dx 140-236 of a
    // city that reaches dx 251.
    //
    //   "Move the city map west so that it doesn't collide with the water."
    //
    // Rasterising the region's own rivers and lakes and sweeping the shift:
    // 2,799 water tiles inside the city at 0, still 2,799 at -80 (the channel
    // is wide), 223 at -120, 55 at -124 and ZERO at -130 with eight tiles of
    // margin. -130 it is; the rivers do not move, which is the whole point.
    arrival: R(754, 1024), isStart: true,
    settlements: [
      // ROUND 174 -- `marketAt` MOVES THE STALLS OUT OF THE SQUARE.
      //
      // The user: "move the stalls in the middle of the town square to the
      // large empty patch in the south portion of the city."
      //
      // The market row walks outward from a settlement's own centre, which is
      // right for a hamlet (its square IS its market) and wrong for a capital,
      // whose square holds a fountain and a wellhead and is meant to stay
      // open. This is the one optional override: where the row STARTS.
      //
      // MEASURED, not eyeballed. The largest clear paved square inside
      // Cadence's walls -- paved, no building, no prop -- is 32 tiles a side,
      // centred 33 tiles south and 2 west of the city origin. That is the
      // patch, and this is its coordinate.
      // ROUND 187 -- CADENCE CARRIES A RECTANGLE, and `radius` stays for
      // everything that still wants one number.
      //
      // The capital is traced from the user's street map now and is 443 x 266
      // tiles with the spiral off centre, so no disc describes it: it reaches
      // 251 tiles east of the origin and 101 north. `bounds` is read by
      // `_settlementCovers` in WorldScene -- the containment test every
      // outskirts sweep, chest roll and folk leash goes through -- and is
      // deliberately the SAME numbers as CADENCE_BOUNDS, which the importer
      // emits. They are checked against each other in the data lane rather
      // than kept in step by hand.
      //
      // `radius` is left at 61 rather than inflated to match. It is read by
      // the atlas frame and by callers that want "how big is this place" as a
      // single number, and 61 is still the right answer for the old walled
      // core the spiral sits in; the rectangle answers the containment
      // question, which is the one that was giving wrong answers.
      { id: 'nek_city', name: 'Cadence', kind: 'city', at: R(754, 1024), radius: 61, full: true,
        bounds: { x0: -191, x1: 251, y0: -101, y1: 164 },
        // ROUND 187 -- the market district's clear square: the largest
        // paved square in it with no building on it once the houses have
        // been put through the placement rules, 21 tiles a side at
        // (-105..-85, -3..17). Measured the same way round 174 measured the
        // last one. It was R(882,1057), the old city's south square, which the
        // rebuilt capital had put next to an estate.
        marketAt: R(659, 1031) },
      // "1 or 2 small communities (3-5 houses) should have their own bounty
      // boards along this road"
      { id: 'nek_hamlet_1', name: 'Milrow', kind: 'hamlet', at: R(720, 1320), radius: 9, houses: 4, bountyBoard: true },
      { id: 'nek_hamlet_2', name: 'Fenn Cross', kind: 'hamlet', at: R(400, 1660), radius: 9, houses: 5, bountyBoard: true },
    ],
    // "2 rivers merging at the city" -- two headwaters off the north edge
    // that join just above the city, and one river out of it to the south.
    // ROUND 74 (item 9) -- "Need 1-2 bridges across the river to explore the
    // full map."
    //
    // He was right and the number was worse than it looked. MEASURED before
    // this change: The Nek was 47.7% reachable on foot. These three rivers
    // make a Y -- two arms falling from the north edge to a confluence at
    // (512, 470), then one nine-tile channel running from there to the south
    // edge -- and not one of them carried a crossing of any kind, so the
    // water was an unbroken wall from the top of the map to the bottom.
    // 437,792 tiles (44.9%) sat behind it, plus a 72,172-tile wedge (7.4%)
    // between the two arms. Cadence is on the west bank, so a player spawning
    // there could reach neither.
    //
    // Two crossings on the long southern channel and one on each arm, placed
    // by FRACTION along each river rather than by a spacing (see _stampRiver
    // for why `bridgesEvery` could not say this). Three rivers, four bridges,
    // and the wedge and the whole eastern half both open.
    rivers: [
      { width: 7, bridgesAt: [0.55], points: [R(860, 0), R(904, 240), R(936, 500), R(984, 760), R(1024, 940)] },
      { width: 6, bridgesAt: [0.45], points: [R(1520, 0), R(1400, 220), R(1240, 500), R(1120, 760), R(1024, 940)] },
      { width: 9, bridgesAt: [0.28, 0.72], points: [R(1024, 940), R(1068, 1280), R(1120, 1600), R(1096, 2046)] },
    ],
    // "3 large lakes on the left side of the map"
    lakes: [
      { at: R(300, 600), rx: 62, ry: 88 },
      { at: R(240, 1120), rx: 54, ry: 76 },
      // ROUND 44 -- moved north off the southwest road. At R(380, 1600) this
      // lake swallowed Fenn Cross: the hamlet stamped its paving over the
      // water (settlements stamp last) and the result was five houses on an
      // island in the middle of a lake, reachable only by swimming.
      { at: R(350, 1430), rx: 70, ry: 58 },
    ],
    // "a road travels southwest to the edge of the map with scattered houses
    // and farmplots"
    // ROUND 65 -- `bridges: true` removed from three of these. It was read by
    // NOTHING: _stampRoad paves whatever it crosses ("a road crossing water IS
    // the bridge"), so the flag described behaviour that was unconditional
    // anyway. A field written, printed and read by nothing is the fault this
    // project keeps finding; deleted rather than left to look meaningful.
    roads: [
      // ROUND 49 -- ONE ROAD PER GATE, EACH RUNNING TO THE MAP EDGE.
      //
      // The user: "extend all the roads from the gaps in the city wall
      // continuing the same direction out to the edge of the map with some
      // minor turns or twists."
      //
      // The city sits at region tile (442,512) with a 100x100 square, so its
      // walls are x 392..492 and y 462..562. The three gates, in region tiles:
      //   west   (392, 484)   the west wall's northern gap
      //   north  (468, 462)   the north wall's eastern gap
      //   south  (468, 562)   the south wall's eastern gap
      // Each road below starts on its gate and leaves in that gate's own
      // direction. The waypoints between are the "minor turns or twists" --
      // enough that a road reads as a road rather than as a ruled line, not so
      // much that it stops going where it set out to go.
      //
      // THE NORTH ROAD IS ROUTED, NOT DRAWN STRAIGHT. The Nek's first river
      // runs from (430,0) through (452,120), (468,250) and (492,380) down to
      // the merge -- which is to say it occupies almost exactly the column a
      // straight road north would want. This one stays 50-60 tiles west of it
      // the whole way up, which is why it drifts west as it climbs.
      //
      // THE SOUTH ROAD IS THE OLD SOUTHWEST ROAD, re-anchored. It still runs
      // through Milrow and Fenn Cross and still ends on the region exit at
      // (52,986), because both hamlets and the gate to Ontaria are on it; what
      // changed is that it now leaves the city through the south gate instead
      // of starting inside the walls. Its dogleg east of Fenn Cross keeps it
      // clear of the third lake (175,715 / 70x58).
      // ROUND 187 -- THE THREE ROADS ARE REROUTED ONTO THE NEW CAPITAL'S STREETS.
      //
      //   "Look at where the NEK roads external to cadence connect to the
      //    city. Take those roads, reroute them to connect them to roads in
      //    Cadence."
      //
      // Each road now STARTS on a street of the traced city, and the segment
      // that leaves the circuit runs straight out, square to the wall, through
      // the one opening that wall gets on that side. `_stampCadenceMap` re-lays
      // the inside part after the city floor goes down (the floor would otherwise
      // pave over it), and the wall builder leaves a gap exactly where it
      // crosses -- nowhere else. Offsets from the city origin (754,1024):
      //   west   (-142,-58) -> (-219,-58)  across the west park to the ring
      //                                    road; the old line, unmoved outside
      //   north  (136,24) -> (155,24) -> (155,-129)  from the street south
      //                                    of the estates, up the corridor all
      //                                    four estate gates open onto --
      //                                    "only run roads between the estate
      //                                    properties" -- and out
      //   south  (114,160)  -> (114,188)   up the street the user painted a
      //                                    road through the old south wall to
      { width: 5, farms: true, points: [R(612, 966), R(535, 966), R(510, 972), R(360, 932), R(200, 904), R(0, 892)] },
      // ROUND 187 -- THE EAST BRIDGE, and the road that reaches it OUTSIDE
      // the wall. The user drew a small bridge over the river just below its
      // fork, landing against the capital's east wall, and chose "Bridge +
      // road along outside": the wall stays shut, and the bridge is reached
      // round the north-east corner from the north road.
      //
      // Measured on the ground, because the corner is tight: the east wall
      // stands at dx 256, the river's west bank at 262-265 here and at 260 by
      // dy -110. So the road is a three-wide PATH, kept at dx 259 (clear of
      // the wall's band, which ends at 257) until it is past the north wall's
      // band (dy -107), then along dy -112 to the north road at dx 155.
      // Offsets from the city origin (754,1024):
      //   (284,-85) east bank -> (259,-85) across the river -> (259,-104)
      //   -> (257,-112) round the corner -> (155,-112) the north road
      { width: 3, points: [R(1038, 939), R(1013, 939), R(1013, 920), R(1011, 912), R(909, 912)] },
      { width: 5, points: [R(890, 1048), R(909, 1048), R(909, 928), R(909, 895), R(900, 840), R(840, 680), R(820, 500), R(800, 280), R(790, 0)] },
      // ROUND 116, BUG 10 -- "Next region gate in the Nek is not at the edge
      // of the map, it should be." The road stopped at (52, 986), which is
      // fifty-two tiles short of the west edge and thirty-eight short of the
      // south one -- a gate standing in a field with more of The Nek behind
      // it. It runs to the corner now, and the exit below sits on the last
      // tile of it.
      { width: 5, farms: true, points: [R(868, 1184), R(868, 1212), R(820, 1260), R(720, 1320), R(600, 1400), R(520, 1540), R(400, 1660), R(280, 1800), R(104, 1972), R(6, 2040)] },
    ],
    // Normal super packs, Normal packs, solo Iron, small Iron packs.
    //
    // =======================================================================
    // ROUND 77 -- WHICH OF THESE MOVE.
    //
    // The user: "Not all monsters should be in packs waiting in an area, some
    // monsters should roam solo (generally the stronger monsters for a
    // region), some monsters in packs should roam to make the encounters and
    // danger feel dynamic."
    //
    // Two fields, and the whole of the answer is in which bands carry them:
    //
    //   roams        this band always roams. On every `solo` band, in every
    //                region, because a region's solo band IS its stronger
    //                monsters -- tier 1 in The Nek, tier 4 in Bratugal.
    //                Bratugal's already said so and nothing read it.
    //   roamChance   the fraction of this band's groups that roam, decided
    //                per group off its own position. A band is not all one
    //                thing: half the wolf packs hold a hunting ground and
    //                half of them walk it, which is the difference between a
    //                world with routes in it and a world of furniture.
    //
    // SUPER PACKS NEVER ROAM, and that is a design line rather than an
    // oversight. Thirty monsters have a place they are: a warren, a nest, a
    // hive. Thirty of them walking is a migration, which is a different piece
    // of content and would also be the frame budget's worst case moving at
    // speed through terrain it did not spawn on.
    // =======================================================================
    spawnGroups: [
      { tier: 0, size: [10, 30], from: 0.00, weight: 2, label: 'super pack' },
      { tier: 0, size: [2, 8], from: 0.00, weight: 5, label: 'pack', roamChance: 0.35 },
      { tier: 1, size: [1, 1], from: 0.25, weight: 4, label: 'solo', roams: true },
      { tier: 1, size: [2, 3], from: 0.55, weight: 2, label: 'small pack', roamChance: 0.5 },
      // ROUND 134 (item 14.2) -- BRONZE, FAR FROM CADENCE.
      //
      // The user: "increase the quantity of bronze ranks enemies wandering
      // around when you get far away from the main city".
      //
      // There were none to increase. The Nek's ladder stopped at tier 1, so
      // the hardest thing in the whole region was a lone iron-rank wanderer --
      // and The Nek is where the player stays until Bronze, because the
      // southwest gate will not pass them under it. A player who has reached
      // Bronze, recruited two companions and cannot leave yet had literally
      // nothing left in the region that could threaten them, which is the
      // report this item is.
      //
      // `from: 0.7` puts them in the outer third measured from the arrival
      // point, which is the far country in the sense the ask means: a long
      // walk from the capital, out past where the iron solos start. `roams`,
      // because "wandering around" is the user's word and a bronze that
      // stands still is a landmark rather than a danger. Small numbers -- one
      // or two -- because a bronze pair at this rank is already the hardest
      // encounter in the region and a pack of them would be a wall rather
      // than an escalation.
      { tier: 2, size: [1, 2], from: 0.70, weight: 3, label: 'bronze wanderer', roams: true },
    ],
    // "Map exit is at the end of the road to the south west and should have 2
    // gate guards that wont let a player through until they reach Bronze."
    exits: [{
      // ROUND 116, BUG 10 -- ON THE EDGE TILE, not fifty tiles inside it.
      // The pad's radius is 96 world units (three tiles) and the guards stand
      // 44 units south of it, so the gate has to be far enough in that both
      // are on the map: tile 5 puts the pad's west rim on tile 2 and leaves
      // The Nek behind you rather than around you.
      // ROUND 144 -- PINNED TO THE EDGE, not scaled with the interior.
      //
      // The world doubled this round and every authored coordinate doubled
      // with it, which is right for a town and wrong for a GATE: this one is
      // the way out of the region, and what it is anchored to is the map's
      // edge, not the region's middle. Scaled, it went from six tiles off the
      // southern boundary to twelve, and round 116's "the gate is within 8
      // tiles of the map edge" said so -- the check earning its place, since a
      // gate you reach and then keep walking past is a gate that does not read
      // as a way out. Back to the five-and-six it was authored with.
      kind: 'gate', at: R(5, 2042), to: 'ontaria', requiredRank: 'bronze', guards: 2,
      spine: true,
      label: 'the southwest gate',
      refuse: 'The road south is no place for a hunter under Bronze. Come back when the world has made you harder.',
      allow: 'Bronze already? Go on then — Ontaria keeps its own kind of trouble.',
    }],
  },

  {
    id: 'ontaria', name: 'Ontaria', index: 1, col: 1, row: 0,
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 0.8, rockDensity: 0.7,
    blurb: 'Oceanside forests and plains, cities in the northwest, villages on the water.',
    // ROUND 78 (7.4) -- MEADOW IS THE GROUND NOW, and grass_plank becomes the
    // accent. The user assigned Ontaria's wilderness tile by tile ("29, 36 and
    // 34 should be the majority... patches of 31 and 37... large patches of
    // 43... 32 and 33 rarely and randomly"), and every number in that sentence
    // is in the MEADOW pack, which this region was using only for its rough
    // ground. The two swap.
    //
    // The mix itself is not here: a `ground` pack name can only say "pick
    // uniformly from these frames", and the instruction is four different
    // distributions. See TILE_PLANS.ontaria_ground.
    ground: 'meadow', accentPack: 'grass_plank',
    // "Player arrives by road north of the main city"
    arrival: R(600, 240),
    settlements: [
      // ROUND 72 -- "Harrowmare should have the walls bordering as a hexagon,
      // and Karsk Landing as an Octagon."  `wall.sides` is the polygon's side
      // count and `wall.rotation` the angle of its FIRST VERTEX, in radians.
      // Both are read by WorldScene's _buildPolygonWalls; a settlement with no
      // `wall` block keeps the ring.  `plan: 'outline'` routes the settlement
      // to the Cadence-style planner (temple row, civic row, house lattice)
      // instead of the roadside lots, which put Harrowmoor's houses 131 tiles
      // from its centre and Karsk Landing's 284.
      //
      // rotation 0 puts hexagon vertices due east and west, so its six EDGES
      // face north, south and the four obliques -- and the north-south road
      // through the city pierces an edge rather than splitting a corner.
      // ROUND 188 -- 140 TILES NORTH. Laid out three times the size (see
      // gridCity.js), a square 372 tiles across centred where it stood would
      // have put 1,238 tiles of Ontaria's water inside the walls. Swept for
      // the nearest centre that is dry out to the wall and clear of every
      // other settlement: 140 north, straight up the road it already stood on.
      { id: 'ont_city', name: 'Harrowmoor', kind: 'city', at: R(600, 360), radius: 48,
        wall: { sides: 6, rotation: 0 }, plan: 'outline' },
      { id: 'ont_west', name: 'Little Gale', kind: 'town', at: R(240, 760), radius: 26 },
      { id: 'ont_village_a', name: 'Sailmend', kind: 'village', at: R(800, 1680), radius: 12, houses: 6 },
      { id: 'ont_village_b', name: 'Cobb Point', kind: 'village', at: R(1280, 1780), radius: 12, houses: 5 },
    ],
    // The ocean takes the south and east of the region.
    ocean: { southFrom: 1860, eastFrom: 1760 },
    rivers: [
      // ROUND 115 (item 9) -- ONTARIA'S RIVER HAD NO CROSSING EITHER.
      //
      // Round 79 found the same thing in Bratugal (see that region's note) and
      // three more survived it: this one, Cinder's lava flow and Ixcuatl's
      // first river all carried neither `bridgesAt` nor `bridgesEvery`. They
      // read as crossable in `test_round79b` only because a ROAD happened to
      // be paving ninety tiles of Ontaria's river out of existence, which is
      // the fault that round fixed -- and fixing it revealed that the
      // "crossing" was the bug.
      //
      // One span at the midpoint, which is where a road wants it.
      // ROUND 188 -- the river rose under the old Harrowmoor's floor, which
      // hid its first sixty tiles. The city moved north over the spot and is
      // three times the size, so the river now rises just south of its wall --
      // and well east of the gate, because the road out of the south gate runs
      // south-west from it and round 159 keeps open-country road ten tiles off
      // the water. (Round 188's first cut put the source at 612,575, four tiles
      // from that road.)
      { width: 7, bridgesAt: [0.5], points: [R(650, 600), R(680, 960), R(780, 1400), R(800, 1680)] },
    ],
    // ROUND 65 -- two inland meres behind the coast. Ontaria is "oceanside
    // forests and plains" and had no standing fresh water at all against The
    // Nek's three lakes; a coast with nothing behind it reads as a strip
    // rather than a country.
    lakes: [
      { at: R(1120, 680), rx: 52, ry: 40 },
      { at: R(1440, 1280), rx: 44, ry: 56 },
    ],
    roads: [
      // ROUND 188 -- the road from the arrival point down to the old city
      // centre is gone: both of its ends are inside the new Harrowmoor, and
      // the city's own north avenue runs where it ran.
      { width: 4, points: [R(600, 500), R(420, 640), R(240, 760)] },
      // ROUND 159 (the user's item 2) -- "the road in ontaria was moved at
      // least 10 tiles away from the river so that it doesn't overlap."
      //
      // IT WAS NOT SO MUCH BESIDE THE RIVER AS ON IT. This road ran
      // (600,500) -> (700,1040) -> (800,1680) and the river directly above
      // runs (600,500) -> (680,960) -> (780,1400) -> (800,1680): the SAME two
      // endpoints, tracking each other within twenty tiles for twelve hundred.
      // Measured on the stamped ground, 277 of Ontaria's 975 open-country road
      // tiles -- 28% -- lay within ten tiles of water, and the closest was ONE.
      // Round 79 had already pinned the consequence ("Ontaria's river is paved
      // for ninety tiles where a road runs down the valley beside it") and
      // round 115 stopped the paving without moving the road, so the two have
      // been sharing a valley ever since.
      //
      // Swung WEST, because the river bends east. The waypoints keep it 150 to
      // 230 tiles clear through the middle of its run and only converge at
      // Sailmend, where both the road and the river arrive at the village --
      // which is a village on a river, not an overlap.
      { width: 4, farms: true,
        points: [R(600, 500), R(520, 720), R(470, 1040), R(520, 1360), R(640, 1600), R(800, 1680)] },
      { width: 4, points: [R(800, 1680), R(1040, 1760), R(1280, 1780)] },
    ],
    spawnGroups: [
      // ROUND 77 -- see the note on The Nek's bands. Ontaria's pack band is
      // its ONLY pack band, so it carries the higher share: this is the
      // region the player crosses at Bronze and the one whose moors are
      // meant to feel exposed.
      { tier: 1, size: [2, 8], from: 0.00, weight: 6, label: 'pack', roamChance: 0.45 },
      { tier: 2, size: [1, 1], from: 0.30, weight: 4, label: 'solo', roams: true },
    ],
    // "Map exit to next region is by ship, guards will not let you board
    // unless the player is silver rank as next is a high magic area."
    exits: [{
      kind: 'ship', at: R(860, 1800), to: 'elehyd', requiredRank: 'silver', guards: 2,
      spine: true,
      label: 'the Elehyd packet',
      refuse: 'Elehyd is a high magic country. Under Silver you would not last the walk up from the dock.',
      allow: 'Silver. Right — mind the swell, and mind what waits on the other side.',
    },
    // ROUND 180 -- THE SALT PACKET, and Act 2.5's way on.
    //
    // A SECOND BERTH AT THE SAME HARBOUR rather than a second harbour. The
    // Elehyd packet's dock is the one stretch of Ontarian waterfront the
    // world builder is known to stamp cleanly, and a jetty invented somewhere
    // else on the coast is a jetty that might read out over grass. Harrowmoor
    // is the harbour; two boats leave from it, eighty tiles apart.
    //
    // Bronze, not Silver: Sirukh Sands hangs off Act 2, and gating it at the
    // rank that opens Act 3 would put the island behind the country it is
    // meant to come before.
    {
      kind: 'ship', at: R(940, 1800), to: 'sirukh', requiredRank: 'bronze', guards: 1,
      label: 'the salt packet',
      refuse: 'Sirukh is four days of open water and a reef at the end of it. Not under Bronze.',
      allow: 'Bronze. She sails on the tide — and she comes back, which is more than the Elehyd boat promises.',
    }],
  },

  {
    id: 'elehyd', name: 'Elehyd', index: 2, col: 0, row: 1,
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 0.12, rockDensity: 1.6,
    blurb: 'Desolate badlands and icy peaks; roads fade into dirt.',
    // ROUND 45 -- was ground:'slate_dark', which is the murky-water pack (see
    // PACK_FRAMES): the badlands rendered as a lake bed. Both roles draw from
    // 'mountain' now, ground taking its bare rock frames and the peaks taking
    // its snow and ice -- which is what "desolate badlands and icy peaks"
    // asks for, out of the one pack that actually contains both.
    ground: 'mountain', accentPack: 'mountain',
    // ROUND 77 -- THE DESERT HALF OF "MOUNTAINOUS DESERT".
    //
    // Same shape as Bratugal's `swamp` block below and deliberately so: a band
    // across part of a region where the ground draws from a different subset of
    // its own pack. Bratugal's runs west; Elehyd's runs SOUTH, because the
    // peaks are the north of the map and Karsk Landing sits at (220, 800) in
    // the southwest -- so the player arrives in the desert and climbs into the
    // mountains, which is the right way round for a region whose blurb is
    // "desolate badlands and icy peaks".
    //
    // `blend` is the width in tiles of the band where the two mix, so the
    // desert does not begin on a ruled line across the map. Inside it, the
    // chance of a sand tile rises from none to all with distance south.
    desert: { southOf: 940, blend: 300 },
    // "Players arrive via boat in the southwest city."
    arrival: R(440, 1600),
    settlements: [
      // rotation PI/8 turns the octagon an eighth of a side, which puts flat
      // edges on all four world axes AND on the four diagonals -- so half its
      // walls run along a world axis (as Cadence's square does) and half run
      // along a SCREEN axis.  A rotation of 0 would have given it eight
      // oblique edges and no face square to anything.
      { id: 'ele_city', name: 'Karsk Landing', kind: 'city', at: R(440, 1600), radius: 44,
        wall: { sides: 8, rotation: Math.PI / 8 }, plan: 'outline' },
      // ROUND 64 -- "the little scattered communities in EACH region should
      // have a bounty board with 5 items". Elehyd and Bratugal had exactly one
      // settlement apiece, so a region's worth of that ask had nowhere to
      // land. Both hamlets sit south of the east-west river and clear of the
      // northern peak band, on the same side of the water as the city.
      { id: 'ele_hamlet_1', name: 'Coldharrow', kind: 'hamlet', at: R(860, 1580), radius: 9, houses: 4, bountyBoard: true },
      { id: 'ele_hamlet_2', name: 'Gravemarch', kind: 'hamlet', at: R(1520, 1700), radius: 9, houses: 5, bountyBoard: true },
    ],
    // Icy peaks across the north: a band of mountain tiles rather than a
    // settlement or a lake.
    peaks: { northTo: 600, patchiness: 0.55 },
    rivers: [
      { width: 8, bridgesEvery: 260, points: [R(0, 1040), R(480, 1120), R(986, 1368), R(1460, 1314), R(2046, 1400)] },
      { width: 6, bridgesEvery: 300, points: [R(1120, 0), R(1200, 440), R(1286, 802), R(1400, 1280), R(1520, 2046)] },
    ],
    // ROUND 65 -- two frozen tarns under the peaks. Elehyd had no standing
    // water at all against The Nek's three lakes; meltwater that never gets
    // anywhere is the badlands' own version of a lake and gives the north
    // something to walk to.
    lakes: [
      { at: R(860, 660), rx: 34, ry: 26 },
      { at: R(1400, 600), rx: 28, ry: 34 },
    ],
    // "roads often fade into dirt" -- these are drawn as PATH, not street,
    // and stop short of their destination on purpose.
    roads: [
      // ROUND 65 -- `farms` on the road out of Karsk Landing. Roadside
      // steadings were a nek-and-ontaria-only feature purely because those
      // were the only regions whose roads carried the flag; a badlands holding
      // clinging to the last dirt road is exactly the detail this region was
      // missing.
      { width: 3, dirt: true, fade: 0.6, farms: true, points: [R(440, 1600), R(982, 1374), R(1402, 1278), R(2046, 1312)] },
      { width: 3, dirt: true, fade: 0.45, points: [R(440, 1600), R(360, 1240), R(420, 840), R(628, 0)] },
    ],
    spawnGroups: [
      { tier: 1, size: [10, 30], from: 0.00, weight: 3, label: 'super pack' },
      { tier: 2, size: [2, 8], from: 0.15, weight: 5, label: 'pack', roamChance: 0.4 },
      { tier: 3, size: [1, 1], from: 0.35, weight: 4, label: 'solo', roams: true },
    ],
    // "Map Exit is a portal specialist (sent by Rob Collins) who will only
    // teleport the player if they have reached gold rank. The portal
    // specialist doesn't even appear in the city until the player is at least
    // silver 9 in multiple abilities."
    exits: [{
      // ROUND 180 -- AND IT WAITS FOR THE SURGE NOW.
      //
      // THE USER: "Bratugal and Ixucatl can only be experienced post surge."
      // That is enforced here rather than by a new barrier system, because the
      // refusal this exit already performs is exactly the mechanism: the
      // specialist will not open the way, and now he has a second reason.
      //
      // Gold AND the surge resolved. The two are close but not the same -- the
      // surge cannot end before Gold (SURGE_END_RANK), but a player can be
      // Gold with the surge still running, and that is precisely the player
      // this gate is for: the one who would otherwise walk out of a country
      // that is under attack and into the next act.
      // ROUND 188 -- in Karsk Landing's plaza, on the corner away from the
      // market (the halls walk out from the plaza's market corner, and the
      // first try there stood the tavern in the menhirs). Its old spot, 36
      // tiles north-east of the centre, is inside the aristocrats' quarter of
      // the city at three times the size, and its ring cut an estate fence.
      kind: 'portal', at: R(452, 1588), to: 'bratugal', requiredRank: 'gold', guards: 0,
      spine: true, requiresSurgeOver: true,
      label: 'the portal specialist',
      hidden: { silverAbilities: 3 },
      refuse: 'I can open the way to Bratugal. I will not open it for anything under Gold — I have seen what comes back.',
      refuseSurge: 'Bratugal? While four cities are burning behind you? Come back when there is nothing left to hold, one way or the other.',
      allow: 'Gold. Rob said you would get here. Hold still, this is the unpleasant part.',
    },
    // ROUND 180 -- THE HAUL ROAD SOUTH, and Act 3.5's way on.
    //
    // A gate rather than a ship or a portal, because the Cinderwaste is
    // directly south of Elehyd -- "ash plains and lava fields below Elehyd",
    // its own blurb -- and you walk there. It is the haul road the Cinderwaste's
    // own people describe from the other end: "Everything up from Elehyd comes
    // through here because there's no other way through" (Hobb Kettleman,
    // Ashfall Station, round 178). This is that road's northern end.
    //
    // Silver, the rank that opened Elehyd. The half-act does not ask more of
    // the player than the act it hangs off.
    {
      kind: 'gate', at: R(700, 2042), to: 'cinder', requiredRank: 'silver', guards: 2,
      label: 'the haul road south',
      refuse: 'Down there the ground is hot enough to take a boot off. Under Silver you would not make the first relay.',
      allow: 'Silver. Keep to the road and watch where the crust has gone black.',
    }],
  },

  {
    id: 'bratugal', name: 'Bratugal', index: 3, col: 1, row: 1,
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 1.0, rockDensity: 0.5,
    blurb: 'Jungle, rainforest and swamp around one great city in the east.',
    ground: 'jungle_soil', accentPack: 'swamp',
    // ROUND 45 -- bog water, not river shallows. The swamp's wetness stamps
    // TILE_WATER_LIGHT pools across the western half, and those were drawing
    // the bright cyan river-shallows art: on jungle green they read as spilled
    // paint rather than as standing water. 'slate_dark' -- the pack Elehyd
    // wrongly used as its GROUND -- is dark, murky, rippling water with fish
    // in it, which is exactly what a bog pool should look like.
    waterPack: 'slate_dark',
    // "The player arrives via portal into the portal square."
    // ROUND 188 -- with the city: see bra_city below.
    arrival: R(1680, 1020),
    settlements: [
      // ROUND 72 -- "Make the grid in the bratugal city twice as large (wider
      // plots, and poplate it entirely with buildings facing south west".
      //
      // `grid` is passed to town.js's gridOptions, which is what BOTH the
      // ground stamp and the lot generator read -- see the note there for why
      // this is a parameter and not an edit to BLOCK_SIZE.  `blockScale: 2` is
      // the "twice as large" ask; `cityRadius` is the settlement's own radius
      // rather than the capital's CITY_RADIUS, so the grid fills the disc the
      // wall encloses; `guildLot: null` because Vashra has no guildmaster's
      // lawn and the reservation was punching an empty rectangle in its grid.
      // `facing` forces every building's facing, which is the rest of the ask.
      // ROUND 188 -- 20 east and 20 south, for the same reason: tripled, the
      // square reached 843 tiles of water at its old centre.
      { id: 'bra_city', name: 'Vashra', kind: 'city', at: R(1680, 1020), radius: 66, full: true,
        grid: { blockScale: 2, cityRadius: 66 * 32, guildLot: null, alleyTiles: 0 },
        facing: 'southwest', fill: true },
      // ROUND 64 -- see the note in Elehyd. Both sit on the DRY east half:
      // `swamp.westOf` is 520, and a hamlet in standing water is a hamlet
      // whose bounty board the player has to swim to.
      { id: 'bra_hamlet_1', name: 'Stiltrow', kind: 'hamlet', at: R(1760, 1520), radius: 9, houses: 4, bountyBoard: true },
      { id: 'bra_hamlet_2', name: 'Thornwick', kind: 'hamlet', at: R(1400, 380), radius: 9, houses: 5, bountyBoard: true },
    ],
    // Swamp takes the west half; the deeper west, the wetter.
    // ROUND 163 -- 0.55 -> 0.85, and the number means something different now.
    //
    // It was the chance of any one tile being wet under a per-tile hash, which
    // produced speckle; round 163 rebuilt the bog on smooth noise, where it is
    // the share of the FAR WEST the marsh covers, thinning to nothing at the
    // dry edge. At 0.55 the western band came out 16% bog, so a 50% slow for
    // walking off the path would have been a thing you met one step in six --
    // not a swamp to cross, just an occasional stumble. At 0.85 the deep marsh
    // is most of the ground and the trails through it are worth finding.
    swamp: { westOf: 1040, wetness: 0.85 },
    // ROUND 79 (bug 4) -- BRATUGAL'S TWO RIVERS HAD NO CROSSINGS AT ALL.
    //
    // Found while cutting the bridge models down to three-tile spans: these
    // two carried neither `bridgesAt` nor `bridgesEvery`, so nothing ever
    // paved a step across them. A ten-tile channel and an eight-tile one, both
    // impassable, cutting the rainforest into three pieces since the region
    // was written. Not a round-79 regression -- a round-79 FINDING, and the
    // measurement that turned it up is now a check in test_round79b.
    //
    // Two crossings on the long river and one on the short, at fractions along
    // their own length, exactly as The Nek names its own.
    rivers: [
      { width: 10, bridgesAt: [0.35, 0.7], points: [R(2046, 600), R(1640, 680), R(1200, 800), R(720, 940), R(0, 1228)] },
      { width: 8, bridgesAt: [0.5], points: [R(1400, 2046), R(1408, 1770), R(980, 1294), R(1200, 804)] },
    ],
    lakes: [
      { at: R(480, 1400), rx: 90, ry: 70 },
      { at: R(280, 760), rx: 76, ry: 96 },
    ],
    // "No roads outside of the main city." -- so the city gets its streets and
    // the jungle gets none. ROUND 65: Bratugal had `roads: []` outright, which
    // honoured the second half of that sentence and dropped the first: Vashra
    // was the only city in the world with no paved approach at all, and with
    // no road anywhere the region could not have a roadside anything. These
    // three all begin and end inside the city's own radius.
    roads: [
      { width: 5, points: [R(1660, 1000), R(1660, 860)] },
      { width: 5, points: [R(1660, 1000), R(1792, 1044)] },
      { width: 4, points: [R(1660, 1000), R(1572, 1120)] },
    ],
    // "super packs of bronze, packs of Silver and solo Gold... The gold rank
    // enemies have large territories and they path everywhere outside the
    // city randomly. silver rank enemies stick farther to the west with
    // bronze packs getting larger as you move farther west."
    spawnGroups: [
      { tier: 2, size: [10, 30], from: 0.00, weight: 4, label: 'super pack', growsWestward: true },
      { tier: 3, size: [2, 8], from: 0.25, weight: 4, label: 'pack', westOnly: true, roamChance: 0.5 },
      // This one has claimed to roam since the day the field was written and
      // has never moved a step: nothing in 25,000 lines ever read `roams`.
      // Round 77 is the round it becomes true.
      { tier: 4, size: [1, 1], from: 0.00, weight: 2, label: 'solo', roams: true },
    ],
    // ROUND 180 -- ACT 4.5. Ixcuatl is directly south of Bratugal and the way
    // there is the road past where the maps stop, which is the same direction
    // Act 4's own story already walks ("Where The Maps Stop", div4_west).
    //
    // No rank gate: a player standing in Bratugal has already cleared Gold and
    // the surge to get here, and asking again for the limb would be the gate
    // charging twice for the same door.
    exits: [{
      kind: 'gate', at: R(1100, 2042), to: 'ixcuatl', guards: 0,
      label: 'the road past the last marker',
      allow: 'The road goes on. Nobody has kept it for a long time.',
    }],
  },

  // ==========================================================================
  // ROUND 103 -- THE THREE SECOND-HALF REGIONS, one per act from II on.
  //
  //   Act II   Ontaria (1,0) -> SIRUKH SANDS (2,0), east across the water
  //   Act III  Elehyd  (0,1) -> THE CINDERWASTE (0,2), south, downhill, hot
  //   Act IV   Bratugal(1,1) -> IXCUATL (1,2), south, under the jungle
  //
  // EACH SITS BESIDE THE REGION IT BELONGS TO, which is not decoration: the
  // grid is what `regionAtTile` reads, so an act's two halves being adjacent
  // is what lets the player walk (or sail) between them rather than crossing
  // the world. The two unclaimed slots, (2,1) and (2,2), are headroom --
  // `regionAtTile` already returns null for ground no region owns, which is
  // how the map margins have always behaved.
  //
  // WHAT IS DELIBERATELY THIN HERE: settlements, rivers, roads and spawn bands
  // are a first pass sized off the region each one extends. They are meant to
  // be argued with. The ground packs are the part that is decided, because
  // that is what the tile round was for.
  // ==========================================================================
  {
    id: 'sirukh', name: 'Sirukh Sands', index: 4, col: 2, row: 0,
    // Almost nothing grows and there is little loose stone -- it is dune and
    // hardpan, so both scatters go very low. The Nek is 0.95/0.9 for scale.
    forestDensity: 0.06, rockDensity: 0.35,
    blurb: 'A hot island of dunes and salt pan, ringed by reef water.',
    // ROUND 103 -- the first region dressed from the Screaming Brain pack.
    // `sbs_dry` is sand, hardpan and cracked clay; `sbs_stones` carries the
    // pale flat rock the salt pans want. Curated per REGIONS_NEXT.md rather
    // than used whole -- the sets are variety packs and a whole one reads as
    // patchwork. The mix is TILE_PLANS.sirukh_ground.
    ground: 'sbs_dry', accentPack: 'sbs_dry',
    // ROUND 103 -- sun-bleached stone. The base rock sheet is Ontarian
    // granite with green tufts painted into it, and grass does not grow on a
    // dune. `bonefield` is the pale grey-tan ramp.
    rockPalette: 'bonefield',
    arrival: R(1024, 120),
    settlements: [
      // ROUND 179 -- A CITY, because Act 2.5's region is one the surge asks
      // you to defend and four separate systems find a region's city by
      // `kind === 'city'`: the summons letter, the fallen-region announcement,
      // the city-change ladder and the services a settlement offers. Sirukh
      // was the largest `town` in the game and every one of those four looked
      // straight past it -- a surge city with no city in it.
      //
      // Radius unchanged at 28, so the quay is a small city rather than a
      // second Cadence: it is an island port, and the point of it is that
      // everything has to come through one gate.
      { id: 'sir_town', name: 'Tolbrand Quay', kind: 'city', at: R(940, 380), radius: 28, houses: 18 },
      { id: 'sir_village', name: 'Salt Gate', kind: 'village', at: R(1360, 1040), radius: 12, houses: 5 },
      // A third community, because a region's boards are a main one and at
      // least two others (test_round64) -- and because a whole island with two
      // places on it is a shorter island than this one is.
      { id: 'sir_hamlet', name: 'Dunmouth', kind: 'hamlet', at: R(600, 1380), radius: 9, houses: 4, bountyBoard: true },
    ],
    // An ISLAND, so the ocean takes three sides rather than two. The north
    // edge is where the packet puts in.
    //
    // ROUND 159 (the user's item 3) -- FOUR SIDES, and `westTo` finally does
    // something. It has been declared here since round 103 under the comment
    // above and `_stampOcean` read only `southFrom` and `eastFrom`, so the
    // "island" has had sea on two sides for fifty rounds. That function knows
    // all four edges now; this adds the one that was missing.
    //
    // The north band stops at 90 rather than matching the others, because the
    // packet puts in at (1024,120) and the road from the quay starts there --
    // an island whose only dock is under water is not an island anybody
    // reaches. Ninety leaves thirty tiles of shore for it.
    //
    // ITEM 5.1 -- "place a few islands out in the water with secrets for
    // players who happen to have water walking through abilities." Three, one
    // off each of the deep sides, each far enough out that no shore reaches
    // them and each holding a chest (see `_buildIslandChests`). Sized in tiles
    // and squashed on the y axis for the projection, so they draw round.
    ocean: {
      southFrom: 1800, eastFrom: 1800, westTo: 180, northTo: 90,
      islands: [
        { at: { tx: 96, ty: 900 }, rx: 26, ry: 16 },
        { at: { tx: 1930, ty: 620 }, rx: 22, ry: 14 },
        { at: { tx: 1300, ty: 1920 }, rx: 30, ry: 18 },
      ],
    },
    rivers: [],
    lakes: [
      // Not lakes -- salt pans, which the water pass draws as standing water
      // and the eye reads as glare. Shallow and very wide.
      { at: R(600, 1200), rx: 90, ry: 44 },
      { at: R(1240, 1520), rx: 70, ry: 36 },
    ],
    roads: [
      { width: 4, points: [R(1024, 120), R(940, 380)] },
      { width: 3, farms: true, points: [R(940, 380), R(1120, 760), R(1360, 1040)] },
      { width: 4, points: [R(1366, 1042), R(2046, 1048)] },
      { width: 4, points: [R(1114, 1642), R(592, 1378), R(340, 1208), R(556, 1050), R(1066, 1154), R(1360, 1034)] },
      { width: 4, points: [R(1112, 1646), R(1128, 2046)] },
    ],
    // Act II country: the player crosses it around Bronze.
    spawnGroups: [
      { tier: 1, size: [2, 8], from: 0.00, weight: 5, label: 'pack', roamChance: 0.4 },
      { tier: 1, size: [10, 24], from: 0.35, weight: 2, label: 'super pack' },
      { tier: 2, size: [1, 1], from: 0.45, weight: 3, label: 'solo', roams: true },
    ],
    // ROUND 180 -- THE WAY BACK, which is what makes this a half-act rather
    // than a dead end. Round 179's note called Sirukh "reached from Ontaria and
    // returned from" and there was no way to do either; this is the returning
    // half, moored where the salt packet ties up.
    //
    // No rank and no guards on a return leg. A gate exists to stop a player
    // going somewhere too early, and there is no such thing as going back to
    // Ontaria too early.
    exits: [{
      kind: 'ship', at: R(1024, 200), to: 'ontaria', guards: 0,
      label: 'the salt packet, homeward',
      allow: 'She is loaded and riding low. Mind your footing on the way down.',
    }],
  },

  {
    id: 'cinder', name: 'The Cinderwaste', index: 5, col: 0, row: 2,
    // Nothing grows in ash. What there IS, is stone -- more of it than
    // anywhere else in the world, which is what the rockDensity says.
    forestDensity: 0.03, rockDensity: 1.9,
    blurb: 'Ash plains and lava fields below Elehyd, where the badlands catch fire.',
    // `sbs_rocky` is the darkest, most varied stone in the library and
    // `sbs_elements` carries what a lava field needs from a water pass.
    ground: 'sbs_rocky', accentPack: 'sbs_rocky',
    // ROUND 103 -- scorched. Same reason as Sirukh: the base rock art has
    // moss on it, and the Cinderwaste's first screenshot had three green
    // boulders in a lava field.
    rockPalette: 'ember',
    arrival: R(240, 160),
    settlements: [
      // Nobody lives here who is not working, so both of these are work
      // camps rather than towns -- but there are TWO of them, because one
      // was a region a player could cross without meeting anybody.
      // Measured by test_round65's own per-region floors: with a single camp
      // the Cinderwaste held 8 props against a floor of 15 and one road
      // against a floor of two.
      { id: 'cin_camp', name: 'Ashfall Station', kind: 'village', at: R(520, 600), radius: 14, houses: 7 },
      // The far end of the same operation: where what the Station cannot use
      // is carried to and left. Named for what it is.
      // ROUND 179 -- THE CINDERWASTE'S CITY, and the place the surge is
      // announced.
      //
      // THE USER: "The first time they enter the city it should be on high
      // alert, an official from the adventure society approaches and lets them
      // know that the surge has started... the forces at cinderwaste are more
      // then adequate."
      //
      // Slagward rather than Ashfall Station, on the user's call, and the
      // fiction agrees with it: the Station is a place to stop being outside
      // and Slagward is the smelting works, which is where an island of heat
      // keeps whatever it keeps. A garrison that is "more than adequate" has
      // to live somewhere, and it lives at the works.
      // ROUND 184 -- THE RADIUS WENT BACK. Round 179 promoted this to a city
      // and, in the same edit, grew it from r13/8 houses to r22/16 -- and the
      // lot placer could not fill the bigger footprint, so Slagward shipped as
      // a NAMED CITY WITH NO BUILDINGS IN IT for five rounds, with the surge's
      // opening scene set in it. Measured: r22 gave 0 structures, r13 gives 5.
      //
      // The `kind` was the part that mattered -- four systems find a region's
      // city by that flag and Sirukh/the Cinderwaste had none. The size was me
      // assuming a city has to look like one. A smelting works with a garrison
      // is a small city, and a small city with houses beats a large one
      // without.
      //
      // ROUND 186 -- AND "r22 GAVE 0 STRUCTURES" WAS NOT A MEASUREMENT OF r22.
      //
      // The probe that produced it (test_round100) read `_cityFloorHalf(st)`
      // raw and Slagward had none, because round 139's wall table was a list
      // and nobody had added it. In JavaScript that null walked through the
      // arithmetic as zero: the tile window collapsed to one tile and the
      // building filter to `|dx| <= 0 && |dy| <= 0`. It would have reported 0
      // structures at ANY radius. Round 184 reverted a size on a number the
      // instrument was incapable of producing, and the fix it declined was the
      // one thing that would have restored the instrument.
      //
      // Measured properly, with the square derived rather than listed: r13
      // stands up SEVEN of its eleven planned buildings, r16 stands all
      // eleven, and so do r20 and r24. Twenty, because sixteen is the
      // threshold itself and leaves nothing in hand, and because a city whose
      // footprint was smaller than a hamlet's paved disc was always the wrong
      // shape for the place the surge opens in. It is still the smallest
      // walled settlement in the world, which a frontier works should be.
      { id: 'cin_slag', name: 'Slagward', kind: 'city', at: R(1440, 1280), radius: 20, houses: 8 },
      // A relay on the haul road: three sheds, a water butt and whoever drew
      // the short straw. Sized so the region clears test_round65's floor of
      // fifteen standing structures, which it missed by one with two camps.
      { id: 'cin_relay', name: 'Kiln Halt', kind: 'hamlet', at: R(1000, 960), radius: 9, houses: 4, bountyBoard: true },
    ],
    ocean: null,
    rivers: [
      // Lava, drawn by the river pass. It is water as far as the code is
      // concerned and fire as far as the player is; the ground pack and the
      // water pack are what make the difference.
      // ROUND 115 (item 9) -- and this one had no crossing. See Ontaria.
      // Two, because it runs the whole diagonal of the region and one span
      // would still leave a quarter of Cinder behind it.
      { width: 9, bridgesAt: [0.33, 0.72], points: [R(240, 160), R(600, 840), R(1040, 1400), R(1280, 1980)] },
      { width: 6, bridgesAt: [0.5], points: [R(1388, 698), R(1820, 1156), R(1284, 1980)] },
      { width: 6, bridgesAt: [0.5], points: [R(1288, 1978), R(1266, 2046)] },
    ],
    lakes: [
      // Lava pools, not water. Both wide and shallow, because a deep one
      // reads as a hole in the world at this camera angle.
      { at: R(1400, 600), rx: 60, ry: 48 },
      { at: R(840, 1560), rx: 74, ry: 40 },
    ],
    // ROUND 177 -- its own pack, drawn for it.
    //
    // `sbs_elements` was the nearest thing the library had -- a variety pack
    // of twenty seas and then fire, acid, blood and slime, curated down to
    // four frames. It read as lava and it was never lava art. Six tiles
    // delivered this round are, so the flows draw from those and the elements
    // pack goes back to being what it is.
    waterPack: 'region_lava',
    // ROUND 177 -- AND IT SAYS SO, rather than being inferred from the art.
    //
    // Everything about Cinder's flows has been true of the PICTURE since they
    // were laid: `sbs_elements` gives the crust and the molten core, and on
    // screen it is unmistakably lava. Nothing in the game knew. The rivers are
    // `TILE_WATER_*` and every system that asks about them -- the mover, the
    // water-walking rider, the minimap's colour table -- got the answer
    // "water", because the only thing marking them as fire was which art pack
    // the region happened to name.
    //
    // A flag, and not `waterPack === 'sbs_elements'` as the test: that pack is
    // twenty shades of sea AND fire, acid, blood and slime (see its note in
    // the pack table), so a region could legitimately draw its ocean from it.
    // Which art a river uses is a decision about how it looks; whether it is
    // molten rock is a decision about what it is, and the second one is the
    // one three systems need to ask.
    lava: true,
    roads: [
      { width: 4, points: [R(240, 160), R(520, 600)] },
      // The haul road. It follows the ground the flows have already crossed
      // and cooled, which is why it bends the way it does.
      //
      // `farms: true` on a lava field, deliberately. The flag is what puts
      // outbuildings along a road -- sheds, barns, a house at the end of a
      // track -- and it is the only thing in the region schema that does.
      // Without it the Cinderwaste stood at 14 structures against
      // test_round65's floor of 15 and read as empty ground with two camps
      // in it. What these are is the ash-farms: crews working the fall for
      // sulphur and glass, which is what people actually do beside a
      // volcano, and it looks like sheds beside a haul road because that is
      // what it is.
      { width: 3, farms: true, points: [R(520, 600), R(1000, 960), R(1440, 1280)] },
      { width: 4, points: [R(1438, 1280), R(1828, 1154), R(2046, 1246)] },
      { width: 4, points: [R(520, 598), R(600, 838), R(606, 900), R(1014, 1420), R(1042, 1396), R(1434, 1280)] },
      { width: 4, points: [R(1016, 1422), R(570, 1528), R(4, 2044)] },
    ],
    // Act III country: Silver and up.
    spawnGroups: [
      { tier: 3, size: [2, 6], from: 0.00, weight: 5, label: 'pack', roamChance: 0.5 },
      { tier: 3, size: [10, 26], from: 0.40, weight: 2, label: 'super pack' },
      { tier: 4, size: [1, 1], from: 0.55, weight: 2, label: 'solo', roams: true },
    ],
    // ROUND 180 -- back up the haul road into Elehyd. The Cinderwaste is a
    // half-act and the road runs both ways; its own people describe the
    // traffic in both directions.
    exits: [{
      kind: 'gate', at: R(300, 220), to: 'elehyd', guards: 0,
      label: 'the haul road north',
      allow: 'North is uphill and cold at the top. You will feel it about the third relay.',
    }],
  },

  {
    id: 'ixcuatl', name: 'Ixcuatl', index: 6, col: 1, row: 2,
    // The jungle has taken it back, so the scatter is Bratugal's or heavier --
    // the point of the place is that it is a city you cannot see.
    forestDensity: 1.15, rockDensity: 0.8,
    blurb: 'A stepped city swallowed by jungle. Nobody has lived here in a long time.',
    // Stone under leaf. `sbs_stones` is the worked paving of a city that is
    // still there under everything, and the jungle pack is what grew over it.
    // ROUND 103 -- the accent is `sbs_stones`' OWN accent role, which is the
    // mossed pavers and the rubble. Naming a different pack got the jungle
    // sheet's frames chosen by an index that means nothing in it; naming this
    // one gets the five tiles that were picked to be the city losing.
    ground: 'sbs_stones', accentPack: 'sbs_stones',
    arrival: R(1024, 80),
    settlements: [
      // ROUND 103, SECOND PASS -- ONE LIVING CAMP, AND HERE IS WHY.
      //
      // The first cut gave this region no settlement at all: `kind: 'ruin'`
      // and a note saying the builders would learn it later. Two things were
      // wrong with that. The builders never did learn it, so the kind was
      // inert and the region generated as nothing -- 8 props against
      // test_round65's floor of 15, no roads, no NPCs, no quest board and no
      // bench. And it left an Act IV region with nowhere to stand, which is
      // not "atmospheric", it is a region a player crosses and leaves.
      //
      // A camp fixes both and is better story than the absence was. Act IV
      // is about the Division's missing people; a Society expedition digging
      // at the edge of the dead city is where they were last seen, and it
      // gives the region the one thing an abandoned place needs to read as
      // abandoned -- somebody there to say so.
      // Houses sized against test_round65's per-region floors rather than
      // guessed: a region needs 15 props and 12 people to talk to before it
      // reads as a place, and one six-house camp gave 10 and 8.
      // WEST OF THE RIVER, deliberately: it is what makes the causeway cross
      // the water instead of running down the valley beside it (see the roads
      // below, and round 79's Ontaria pin for what running beside it costs).
      { id: 'ixc_camp', name: 'Lastlight Camp', kind: 'village', at: R(320, 500), radius: 14, houses: 9 },
      // The dig itself, at the city's edge -- tents and a winch rather than a
      // village, which is what the smaller radius and the house count say.
      { id: 'ixc_dig', name: 'The Cut', kind: 'village', at: R(940, 860), radius: 11, houses: 5 },
      // And a forward post further in, where the causeway stops being safe.
      { id: 'ixc_post', name: 'Kepen Rest', kind: 'hamlet', at: R(1400, 1440), radius: 9, houses: 4, bountyBoard: true },
      // The city itself stays a ruin and stays unbuilt. `kind: 'ruin'` is
      // still a kind nothing knows, and it is still the right shape for what
      // this is -- but the region no longer DEPENDS on it, so it can be built
      // in its own round instead of being a hole in this one.
      { id: 'ixc_ruin', name: 'The Stepped City', kind: 'ruin', at: R(1368, 1174), radius: 60 },
    ],
    ocean: null,
    rivers: [
      // ROUND 115 (item 9) -- and this one. See Ontaria.
      { width: 6, bridgesAt: [0.5], points: [R(310, 2), R(720, 800), R(1164, 1284), R(1120, 1980)] },
      { width: 6, bridgesAt: [0.5], points: [R(2046, 0), R(1202, 804), R(1158, 1288)] },
    ],
    lakes: [
      { at: R(1122, 1980), rx: 50, ry: 44 },
      // A reservoir the city built and the jungle kept. Rectangular once.
      { at: R(1158, 1284), rx: 56, ry: 38 },
    ],
    // THE CAUSEWAYS. Not roads the way Ontaria has roads -- these are the
    // city's own raised ways, still there because they were built out of the
    // same stone the ground pack draws. "The roads are under the leaf litter"
    // was the first cut's note and it was a nice line about a region with
    // nothing in it; a causeway you can actually walk is the better version
    // of the same idea, and it is what gets a player from the camp to the
    // city without three minutes of hacking through canopy.
    roads: [
      { width: 4, points: [R(1024, 80), R(320, 500)] },
      // The dig has been here long enough to plant: `farms: true` puts the
      // camp's own plots and sheds along the causeway, which is the
      // difference between an expedition and a picture of one.
      //
      // ROUND 103, SECOND PASS -- THE MIDDLE POINT MOVED EAST, AND THAT IS
      // THE WHOLE EDIT. The first route ran (230,180) -> (400,380) -> the
      // ruin, which is almost exactly the line the river takes from (180,60)
      // to (360,400) -- so the road did not CROSS the river, it ran down the
      // valley on top of it, and `_stampRoad` paved twenty-seven tiles of
      // river out of existence. That is the identical fault round 79 pinned
      // in Ontaria and refused to let spread ("no NEW stretch of river has
      // been paved over by a road"), and test_round79b caught this one the
      // round it was introduced instead of two rounds later.
      //
      // The camp moved WEST of the river and the middle point went away
      // entirely: both legs now run from one side of the water to the other
      // and cross it once each, at an angle, which is what a causeway over a
      // river looks like from above. A road that shares a heading with a
      // river for any distance erases it, however the points are arranged.
      // Two legs, and the first one runs nearly EAST. A crossing's width on
      // the map is the road's width divided by the sine of the angle it meets
      // the water at, so a road that crosses at 25 degrees leaves a gap three
      // times its own width -- measured, a single diagonal leg here erased
      // twelve tiles of river against test_round79b's eight-tile ceiling for
      // what counts as a span. Crossing across the current instead of along
      // it costs one extra point and puts the gap back under the ceiling.
      // Width three rather than four for the same arithmetic: a causeway is a
      // raised way for people on foot, not a carriage road, and every tile of
      // width is another tile of river the crossing swallows.
      { width: 3, farms: true, points: [R(320, 500), R(1200, 800), R(1374, 1174)] },
    ],
    // Act IV country: Gold, and it is the hardest ground in the game.
    //
    // ROUND 103, SECOND PASS -- and one of them ROAMS. Every other region in
    // the world has a solo of its top tier walking around in it (round 77's
    // item 2.1, and test_round77a asserts it); this region declared two
    // stationary group bands and nothing that moves, so it was the one place
    // where nothing could come to you. On the hardest ground in the game.
    spawnGroups: [
      // ROUND 103, SECOND PASS -- A BAND, NOT A SINGLE TIER.
      //
      // This declared tier 4 and nothing else, and it was the only region in
      // the world with a one-tier band. That made it wrong in two ways at
      // once: nowhere for a Gold player to warm up, and -- the reason it was
      // caught -- the region's DENS hold Silver, because the den tables are
      // four rows deep and a Gold region indexes the top one, which is the
      // Bratugal row. test_round43's "every region matches its declared
      // bands" reported tier 3 in a region declaring only 4.
      //
      // Silver packs and Gold everything else, which is Bratugal's shape one
      // act later and is what "the hardest ground in the game" should feel
      // like: the ordinary things here are what you fought last act, and the
      // ones that are not are the reason to be careful.
      { tier: 3, size: [4, 12], from: 0.00, weight: 3, label: 'pack', roamChance: 0.5 },
      { tier: 4, size: [2, 8], from: 0.15, weight: 5, label: 'pack', roamChance: 0.55 },
      { tier: 4, size: [10, 30], from: 0.30, weight: 3, label: 'super pack' },
      { tier: 4, size: [1, 1], from: 0.40, weight: 2, label: 'solo', roams: true },
    ],
    // ROUND 180 -- back to Bratugal. Ixcuatl is the last limb and the road
    // out is the road in; there is nothing beyond it, which is the point of a
    // region whose own blurb says nobody has lived there in a long time.
    exits: [{
      kind: 'gate', at: R(1024, 160), to: 'bratugal', guards: 0,
      label: 'the road back',
      allow: 'Back the way you came. It is the only way there is.',
    }],
  },
];

// ROUND 134 (item 6) -- THE EDITOR'S OVERLAY, FOLDED IN HERE AND NOWHERE ELSE.
//
// `src/data/regionEdits.js` carries the two arrays the desktop editor writes:
// `placed` (round 107's override layer, which this round gives a `blank` kind
// so a building can be REMOVED as well as added) and `terrain` (painted
// rectangles over the tile types). See that file for why they are not written
// into this one.
//
// Applied BEFORE `REGION_BY_ID` is built and before anything exports, so every
// one of the several hundred reads of `REGIONS` in this codebase sees the
// finished list and none of them has to know an overlay exists.
applyRegionEdits(REGIONS);

// ===========================================================================
// ROUND 180 -- A REGION HAS EXITS, PLURAL, AND ONE OF THEM IS THE WAY ON.
//
// Until this round a region carried a single `exit`, which could not express a
// HALF-ACT: Act 2.5 is a place the story goes to and comes back from, so
// Ontaria needs two ways on and had room for one. Measured at the end of round
// 179, the consequence was not theoretical -- the exits formed the straight
// line nek -> ontaria -> elehyd -> bratugal and Sirukh Sands, the Cinderwaste
// and Ixcuatl were reachable from nothing at all.
//
// `exits` is the authored table now. `exit` is DERIVED and keeps its old
// meaning exactly -- "the way the main spine continues" -- so the half-dozen
// places that ask a region where the story goes next still get that answer and
// did not have to learn about limbs. The ones that mean "every way out of
// here" (the landmark builder, the exit pads) iterate `exits`.
//
// Deriving it rather than authoring both is the point: two hand-written copies
// of "which exit is the main one" is the fault class round 179 spent itself
// removing, and this file would have been the eighth place to keep in step.
for (const r of REGIONS) {
  r.exits = r.exits || [];
  r.exit = r.exits.find(e => e.spine) || null;
}

export const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// ROUND 273 -- each region's bandit city, appended LAST so every
// `settlements.find(x => x.kind === 'city')` still finds the region's own
// capital first. See banditCities.js.
for (const c of BANDIT_CITIES) {
  const r = REGION_BY_ID[c.region];
  if (r && !(r.settlements || []).some(x => x.id === c.id)) (r.settlements = r.settlements || []).push(banditSettlement(c));
}

// --- lookups ---------------------------------------------------------------
/** Region containing this world point, or null (the interior band). */
export function regionAt(wx, wy) {
  const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
  return regionAtTile(tx, ty);
}
// ===========================================================================
// ROUND 159 (the user's item 4) -- "Update the tile names so that the minimap
// and inventory map can accurately portray the regions with appropriately
// colored tiles." / "sand, vs grass, vs rock, vs lava."
//
// THERE ARE NO BIOME TILE TYPES, AND THAT IS WHY EVERY MAP IS GREEN.
//
// Measured for round 147's atlas: 400 samples of open ground in each of the
// seven regions come back 91-97% `TILE_GRASS`. `tileType` records grass,
// paths, plazas, streets, water and interior floors and NOTHING ELSE -- a
// region's whole look lives in which ground ART SET it draws with, which is
// `region.ground`, read in exactly one place in the renderer. So
// `_buildMinimapTerrainCache`, which colours from `tileType`, has been
// perfectly honest about a fact that does not carry the information.
//
// The map has never known what a region looks like. This is the table that
// tells it.
//
// THE COLOURS ARE MEASURED OFF THE ART, not chosen. Each is the median opaque
// pixel of that pack's own sheet, scaled to the lightness register the map
// already uses (the existing grass colour is a good deal darker than the
// meadow tile, because a map wants markers to read on top of it):
//
//   meadow       #849f5d      mountain     #c9c19a      jungle_soil  #355a2f
//   sbs_dry      #9d8160      sbs_rocky    #807361      sbs_stones   #b7a790
//
// `meadow` KEEPS THE MAP'S EXISTING GREEN rather than its own scaled median,
// because The Nek and Ontaria are grass and their maps were never wrong. A
// round that repaints something correct to make the arithmetic uniform has
// changed the thing it was not asked about.
//
// LAVA HAS NOWHERE TO LIVE YET. The ask names four surfaces and the game has
// three: no region declares lava, and there is no lava tile, art pack or
// terrain feature anywhere in the data. The Cinderwaste is the region it
// would belong to -- it already carries `rockPalette: 'ember'` -- so its
// ACCENT colour is an ember tone, which makes its accent patches read hot
// against the ash. That is as close as the current world gets, and it is a
// map colour rather than lava.
export const GROUND_MAP_COLOUR = {
  meadow: [58, 90, 58],          // the map's own green, unchanged
  mountain: [145, 139, 111],     // pale dry rock, the badlands
  jungle_soil: [38, 65, 34],     // dark wet green
  sbs_dry: [141, 116, 86],       // sand
  sbs_rocky: [92, 83, 70],       // ash and grit
  sbs_stones: [132, 120, 104],   // pale stone
};

/** ...and what a region's ACCENT patches read as. Falls back to the ground
 *  colour lightened, so a region that declares an accent pack this table has
 *  not heard of still reads as a variation of its own ground rather than as
 *  the shared grey. */
export const ACCENT_MAP_COLOUR = {
  sbs_rocky: [150, 74, 46],      // ember -- see the note on lava above
  swamp: [72, 96, 100],
  mountain: [166, 160, 136],
  sbs_dry: [166, 141, 108],
  sbs_stones: [152, 140, 122],
  grass_plank: [86, 104, 62],
};

/** The map colour for open ground in this region, and for its accent
 *  patches. A region with no `ground` pack is meadow: The Nek declares none
 *  and is a meadow, which is why the default reads as one. */
export function regionMapInk(region) {
  const g = (region && region.ground) || 'meadow';
  const a = (region && region.accentPack) || g;
  return {
    ground: GROUND_MAP_COLOUR[g] || GROUND_MAP_COLOUR.meadow,
    accent: ACCENT_MAP_COLOUR[a] || ACCENT_MAP_COLOUR[g] || null,
  };
}

export function regionAtTile(tx, ty) {
  if (tx < 0 || ty < 0 || ty >= INTERIOR_BAND_Y0 || tx >= WORLD_TILES) return null;
  const col = Math.floor(tx / REGION_TILES), row = Math.floor(ty / REGION_TILES);
  return REGIONS.find(r => r.col === col && r.row === row) || null;
}
/** A region's own origin, in world units. */
export function regionOrigin(region) {
  return { x: region.col * REGION_TILES * TILE, y: region.row * REGION_TILES * TILE };
}
/** Region-local tile coords -> absolute world units, on the tile CORNER.
 *  Not the tile centre, and the difference matters: the town's paving rings
 *  are struck in whole tiles from the town centre (round 30), so a centre
 *  sitting half a tile off the grid lands the ring boundaries asymmetrically
 *  -- measured as 4 of 14 mirrored pairs matching instead of 14 of 14. */
export function regionPoint(region, p) {
  const o = regionOrigin(region);
  return { x: o.x + p.tx * TILE, y: o.y + p.ty * TILE };
}
/** The world point a player lands on when they enter this region. */
export function arrivalPoint(region) { return regionPoint(region, region.arrival); }
/** The region the game starts in. */
export function startRegion() { return REGIONS.find(r => r.isStart) || REGIONS[0]; }

/** 0..1 -- how far this point is from its region's arrival, as a fraction of
 *  the region's half-width. Drives which spawn groups are allowed to appear. */
export function dangerFraction(region, wx, wy) {
  const a = arrivalPoint(region);
  const half = (REGION_TILES * TILE) / 2;
  return Math.min(1, Math.hypot(wx - a.x, wy - a.y) / half);
}

/**
 * Every settlement in the world, tagged with its region.
 *
 * ROUND 178 -- this carried the whole REGION OBJECT on every row, which is
 * why nothing ever called it: one settlement came back with several thousand
 * placed props hanging off it, and any caller wanting "which region is this
 * in" paid for the entire map to find out. It carries the id and the name
 * now, which is what a caller asking that question wants, and the region
 * table itself is one import away for anyone who needs the rest.
 */
export function allSettlements() {
  const out = [];
  for (const r of REGIONS) {
    for (const s of (r.settlements || [])) out.push({ ...s, region: r.id, regionName: r.name });
  }
  return out;
}
