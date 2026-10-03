// ===========================================================================
// ROUND 195 -- THE SOUTHERN CONTINENT.
//
// The user: "This is the southern continent: twelve new regions keyed to the
// overworld map in sa_marked_grid_850x1100.png, intended as the game's final
// chapter and post-game ... This round is the ground they stand on."
//
// WHY THEY ARE NOT IN regions.js. Twelve more regions in the world grid needed
// the grid to grow from 3x3 to 5x4, and that was measured before it was
// written (three restarts a stage, on the test box):
//
//   3x3, 7 regions, tileType 45.6 MB .............. 17.1 s
//   5x4, 7 regions, tileType 104.9 MB ............. 23.8 s   (+6.7 s, the grid)
//   5x4, 9 regions ................................ 26.4 s   (+1.3 s a region)
//
// A region costs 1.3 s of every boot -- against the 0.5 s the brief allowed --
// and the grid growth costs 6.7 s before a single southern region exists.
// Nineteen regions would have put restart near 45 s and added something like
// an hour and a half to the regression.
//
// So the south is built the way round 194 builds a generated square: the
// authored data lives here, and ONE region at a time is built into the spare
// world slot when the party travels to it. Boot pays nothing. The grid stays
// 3x3. (The other half of that trade: the twelve never exist at the same
// time, so travel between them is the overworld map rather than gates.)
//
// WHAT IS MEASURED AND WHAT IS WRITTEN. Every number describing GROUND -- the
// ocean bands, the peaks, the lakes, the rivers, the cover densities, where a
// settlement can stand -- was measured off `sa_biome_index_850x1100.png` by
// tools/build_round195_south.py. A region box is 32 overworld cells and a
// region is REGION_TILES = 2048 tiles, so one cell is 64 tiles. The names,
// the blurbs and the bands are written.
//
// DEEPER GOLD, NOT DIAMOND. Nothing in ranks.js changes and no monster here is
// above gold. `band` (see monsters.js) picks where in gold's own 153-to-957
// effective-HP span a group draws from: the landing coast draws from the
// bottom of it, the deepest country from the top. The northern gold regions
// keep the full span -- the south goes above the north rather than pushing the
// north down.
// ===========================================================================
import { REGION_TILES } from './regions.js';

const R = (tx, ty) => ({ tx, ty });

/** The southern overworld sheet, in its own cells (see overworld.js). */
export const SOUTH_COLS = 850;
export const SOUTH_ROWS = 1100;
/** A region box is 32 cells; a region is REGION_TILES tiles. */
export const SOUTH_BOX_CELLS = 32;
export const SOUTH_TILES_PER_CELL = REGION_TILES / SOUTH_BOX_CELLS;   // 64

/**
 * The twelve, in the order the chain runs: the landing coast first, the
 * deepest country last. `index` continues the north's 0-6 so site tiers, den
 * tiers and everything else keyed off it read the south as later.
 */
export const SOUTH_REGIONS = [
  {
    id: 'wallgate', name: 'Wallgate', index: 7, rank: 'gold',
    keyedTo: 'Caracas', cellBox: [165, 127, 196, 158], centreCell: [181, 143],
    forestDensity: 0.37, rockDensity: 0.23,
    blurb: 'Grass country behind a coastal ridge, and the first southern ground a northerner sets foot on.',
    // Measured off the biome index: grassland 40%, ocean 32%, forest 16%, plains 8%; 64% dry ground.
    ground: 'meadow', accentPack: 'grass_plank',
    ocean: { northTo: 320, westTo: 384 },
    arrival: R(980, 940),
    settlements: [
      { id: 'wal_city', name: 'Wallgate', kind: 'city', at: R(800, 800), radius: 26, houses: 16 },
      { id: 'wal_town', name: 'Reefhold', kind: 'village', at: R(1312, 736), radius: 13, houses: 7 },
      { id: 'wal_hamlet', name: 'Lowshore', kind: 'hamlet', at: R(864, 1376), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(288, 1248), rx: 60, ry: 40 },
      { at: R(224, 1312), rx: 60, ry: 40 },
    ],
    rivers: [
      { width: 7, bridgesEvery: 280, points: [R(1632, 0), R(1440, 736), R(1248, 1056), R(992, 1376), R(800, 1696), R(608, 2046)] },
    ],
    roads: [
      { width: 4, points: [R(980, 940), R(800, 800)] },
      { width: 3, farms: true, points: [R(800, 800), R(1056, 768), R(1312, 736)] },
      { width: 3, farms: true, points: [R(1312, 736), R(1088, 1056), R(864, 1376)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.00, 0.45], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.00, 0.40], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.35, 0.70], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'sandwatch', name: 'Sandwatch', index: 8, rank: 'gold',
    keyedTo: 'Fortaleza', cellBox: [638, 126, 669, 157], centreCell: [654, 142],
    forestDensity: 0.23, rockDensity: 0.28,
    blurb: 'Dry dune coast: plains, grass, and a wind that takes the paint off a door.',
    // Measured off the biome index: plains 51%, grassland 31%, ocean 16%; 84% dry ground.
    ground: 'sbs_dry', accentPack: 'sbs_dry',
    rockPalette: 'bonefield',
    ocean: { northTo: 320 },
    arrival: R(788, 812),
    settlements: [
      { id: 'san_city', name: 'Sandwatch', kind: 'city', at: R(608, 672), radius: 26, houses: 15 },
      { id: 'san_town', name: 'Duneward', kind: 'village', at: R(1376, 800), radius: 13, houses: 7 },
      { id: 'san_hamlet', name: 'Saltcross', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(1120, 992), rx: 60, ry: 40 },
      { at: R(192, 256), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.05, 0.50], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.00, 0.45], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.40, 0.75], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'cliffgate', name: 'Cliffgate', index: 9, rank: 'gold',
    keyedTo: 'Salvador', cellBox: [694, 255, 725, 286], centreCell: [710, 271],
    forestDensity: 0.91, rockDensity: 0.19,
    blurb: 'A bay under a cliff, with the old harbour stairs cut into it and nothing using them.',
    // Measured off the biome index: tropical 41%, ocean 37%, forest 22%; 63% dry ground.
    ground: 'jungle_soil', accentPack: 'swamp',
    ocean: { eastFrom: 1280 },
    arrival: R(788, 812),
    settlements: [
      { id: 'cli_city', name: 'Cliffgate', kind: 'city', at: R(608, 672), radius: 26, houses: 15 },
      { id: 'cli_town', name: 'Stairfoot', kind: 'village', at: R(1056, 608), radius: 13, houses: 7 },
      { id: 'cli_hamlet', name: 'Bellrock', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(832, 640), R(1056, 608)] },
      { width: 3, farms: true, points: [R(1056, 608), R(992, 1024), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.60, 0.95], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.55, 0.90], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.80, 1.00], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'hornbay', name: 'Hornbay', index: 10, rank: 'gold',
    keyedTo: 'Rio de Janeiro', cellBox: [667, 437, 698, 468], centreCell: [683, 453],
    forestDensity: 0.83, rockDensity: 0.24,
    blurb: 'A drowned coast of bays and headlands, more water than ground.',
    // Measured off the biome index: ocean 40%, forest 32%, tropical 26%; 60% dry ground.
    ground: 'meadow', accentPack: 'grass_plank',
    ocean: { southFrom: 1600, eastFrom: 1600 },
    arrival: R(788, 812),
    settlements: [
      { id: 'hor_city', name: 'Hornbay', kind: 'city', at: R(608, 672), radius: 26, houses: 16 },
      { id: 'hor_town', name: 'Sparhead', kind: 'village', at: R(1376, 800), radius: 13, houses: 7 },
      { id: 'hor_hamlet', name: 'Tideguard', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.40, 0.75], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.35, 0.70], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.60, 0.90], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'scarpgate', name: 'Scarpgate', index: 11, rank: 'gold',
    keyedTo: 'Sao Paulo', cellBox: [632, 455, 663, 486], centreCell: [648, 471],
    forestDensity: 1.33, rockDensity: 0.33,
    blurb: 'Rainforest on a plateau, and a scarp with the sea a thousand feet below it.',
    // Measured off the biome index: tropical 57%, forest 35%; 94% dry ground.
    ground: 'jungle_soil', accentPack: 'swamp',
    ocean: null,
    arrival: R(788, 812),
    settlements: [
      { id: 'sca_city', name: 'Scarpgate', kind: 'city', at: R(608, 672), radius: 26, houses: 18 },
      { id: 'sca_town', name: 'Rainhold', kind: 'village', at: R(1376, 800), radius: 13, houses: 7 },
      { id: 'sca_hamlet', name: 'Lowstep', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(32, 1184), rx: 60, ry: 40 },
      { at: R(448, 192), rx: 110, ry: 76 },
    ],
    rivers: [
      { width: 7, bridgesEvery: 280, points: [R(288, 0), R(256, 224), R(224, 416), R(128, 608), R(96, 800), R(32, 2046)] },
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.35, 0.70], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.30, 0.65], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.55, 0.85], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'ironhead', name: 'Ironhead', index: 12, rank: 'gold',
    keyedTo: 'Belo Horizonte', cellBox: [645, 388, 676, 419], centreCell: [661, 404],
    forestDensity: 1.33, rockDensity: 0.18,
    blurb: 'Iron country under heavy canopy: red ground, red water, and something in it that eats compasses.',
    // Measured off the biome index: tropical 89%, river 11%; 89% dry ground.
    ground: 'jungle_soil', accentPack: 'swamp',
    ocean: null,
    arrival: R(788, 812),
    settlements: [
      { id: 'iro_city', name: 'Ironhead', kind: 'city', at: R(608, 672), radius: 26, houses: 15 },
      { id: 'iro_town', name: 'Redcut', kind: 'village', at: R(1376, 800), radius: 13, houses: 7 },
      { id: 'iro_hamlet', name: 'Oremouth', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(800, 32), rx: 60, ry: 40 },
      { at: R(992, 2016), rx: 60, ry: 40 },
    ],
    rivers: [
      { width: 7, bridgesEvery: 280, points: [R(2016, 0), R(1472, 1056), R(832, 1248), R(608, 1440), R(352, 1632), R(128, 1824), R(64, 2046)] },
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.55, 0.90], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.50, 0.85], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.75, 1.00], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'newmark', name: 'Newmark', index: 13, rank: 'gold',
    keyedTo: 'Brasilia', cellBox: [566, 347, 597, 378], centreCell: [582, 363],
    forestDensity: 1.48, rockDensity: 0.23,
    blurb: 'A city marked out on empty savanna by people who never came back to build it.',
    // Measured off the biome index: tropical 98%; 100% dry ground.
    ground: 'jungle_soil', accentPack: 'swamp',
    ocean: null,
    arrival: R(788, 812),
    settlements: [
      { id: 'new_city', name: 'Newmark', kind: 'city', at: R(608, 672), radius: 26, houses: 14 },
      { id: 'new_town', name: 'Stakeline', kind: 'village', at: R(1376, 800), radius: 13, houses: 6 },
      { id: 'new_hamlet', name: 'The Measure', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.60, 0.95], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.55, 0.90], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.80, 1.00], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'merehead', name: 'Merehead', index: 14, rank: 'gold',
    keyedTo: 'Porto Alegre', cellBox: [627, 573, 658, 604], centreCell: [643, 589],
    forestDensity: 1.06, rockDensity: 0.35,
    blurb: 'The head of a long lagoon, forest on three sides and brackish water on the fourth.',
    // Measured off the biome index: forest 40%, tropical 29%, grassland 19%, plains 7%; 97% dry ground.
    ground: 'meadow', accentPack: 'grass_plank',
    ocean: null,
    arrival: R(788, 812),
    settlements: [
      { id: 'mer_city', name: 'Merehead', kind: 'city', at: R(608, 672), radius: 26, houses: 15 },
      { id: 'mer_town', name: 'Reedgate', kind: 'village', at: R(1376, 800), radius: 13, houses: 7 },
      { id: 'mer_hamlet', name: 'Lagoon Watch', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
      { width: 7, bridgesEvery: 280, points: [R(224, 0), R(192, 1568), R(192, 1696), R(160, 1824), R(160, 2046)] },
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.55, 0.90], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.50, 0.85], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.75, 1.00], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'silverreach', name: 'Silverreach', index: 15, rank: 'gold',
    keyedTo: 'Buenos Aires', cellBox: [575, 671, 606, 702], centreCell: [591, 687],
    forestDensity: 0.37, rockDensity: 0.29,
    blurb: 'Flat grass river country, the widest sky in the game and nowhere to hide on it.',
    // Measured off the biome index: grassland 72%, plains 10%, ocean 9%, forest 7%; 90% dry ground.
    ground: 'meadow', accentPack: 'grass_plank',
    ocean: null,
    arrival: R(788, 812),
    settlements: [
      { id: 'sil_city', name: 'Silverreach', kind: 'city', at: R(608, 672), radius: 26, houses: 17 },
      { id: 'sil_town', name: 'Cattlemarch', kind: 'village', at: R(1184, 608), radius: 13, houses: 7 },
      { id: 'sil_hamlet', name: 'Two Fords', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
      { width: 7, bridgesEvery: 280, points: [R(32, 0), R(32, 1504), R(32, 1632), R(32, 1760), R(32, 1888), R(32, 2046)] },
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(896, 640), R(1184, 608)] },
      { width: 3, farms: true, points: [R(1184, 608), R(1056, 1024), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.40, 0.75], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.35, 0.70], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.60, 0.90], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'valeward', name: 'Valeward', index: 16, rank: 'gold',
    keyedTo: 'Santiago', cellBox: [433, 741, 464, 772], centreCell: [449, 757],
    forestDensity: 0.19, rockDensity: 1.07,
    blurb: 'One valley between two ranges, with the only road in at either end.',
    // Measured off the biome index: mountain 51%, ocean 22%, plains 19%, desert 6%; 78% dry ground.
    ground: 'mountain', accentPack: 'mountain',
    ocean: { southFrom: 1856, westTo: 256 },
    peaks: { eastFrom: 128, patchiness: 0.8 },
    arrival: R(788, 812),
    settlements: [
      { id: 'val_city', name: 'Valeward', kind: 'city', at: R(608, 672), radius: 26, houses: 15 },
      { id: 'val_town', name: 'Snowgate', kind: 'village', at: R(1376, 800), radius: 13, houses: 6 },
      { id: 'val_hamlet', name: 'Coldwater', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.50, 0.85], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.45, 0.80], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.70, 1.00], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'dustquay', name: 'Dustquay', index: 17, rank: 'gold',
    keyedTo: 'Lima', cellBox: [169, 502, 200, 533], centreCell: [185, 518],
    forestDensity: 0.16, rockDensity: 0.63,
    blurb: 'A rainless coast pinned between a cold sea and a wall of rock.',
    // Measured off the biome index: ocean 45%, desert 25%, mountain 25%, tropical 6%; 55% dry ground.
    ground: 'sbs_dry', accentPack: 'sbs_dry',
    rockPalette: 'bonefield',
    ocean: { southFrom: 1536, westTo: 512 },
    peaks: { northTo: 1280, patchiness: 0.55 },
    arrival: R(788, 812),
    settlements: [
      { id: 'dus_city', name: 'Dustquay', kind: 'city', at: R(608, 672), radius: 26, houses: 15 },
      { id: 'dus_town', name: 'Saltworks', kind: 'village', at: R(1376, 800), radius: 13, houses: 6 },
      { id: 'dus_hamlet', name: 'Dry Landing', kind: 'hamlet', at: R(1568, 1312), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1472, 1056), R(1568, 1312)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.45, 0.80], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.40, 0.75], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.65, 0.95], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
  {
    id: 'highfen', name: 'Highfen', index: 18, rank: 'gold',
    keyedTo: 'Bogota', cellBox: [103, 253, 134, 284], centreCell: [119, 269],
    forestDensity: 1.38, rockDensity: 0.34,
    blurb: 'High wet forest with no open water in it at all; everything drips and nothing pools.',
    // Measured off the biome index: tropical 57%, forest 39%; 100% dry ground.
    ground: 'jungle_soil', accentPack: 'swamp',
    ocean: null,
    arrival: R(788, 812),
    settlements: [
      { id: 'hig_city', name: 'Highfen', kind: 'city', at: R(608, 672), radius: 26, houses: 16 },
      { id: 'hig_town', name: 'Cloudrest', kind: 'village', at: R(1376, 800), radius: 13, houses: 7 },
      { id: 'hig_hamlet', name: 'Green Stair', kind: 'hamlet', at: R(928, 1440), radius: 9, houses: 5, bountyBoard: true },
    ],
    lakes: [
      { at: R(192, 192), rx: 110, ry: 76 },
      { at: R(640, 192), rx: 110, ry: 76 },
    ],
    rivers: [
    ],
    roads: [
      { width: 4, points: [R(788, 812), R(608, 672)] },
      { width: 3, farms: true, points: [R(608, 672), R(992, 736), R(1376, 800)] },
      { width: 3, farms: true, points: [R(1376, 800), R(1152, 1120), R(928, 1440)] },
    ],
    spawnGroups: [
      { tier: 4, band: [0.45, 0.80], size: [4, 12], from: 0.00, weight: 6, label: 'pack', roamChance: 0.5 },
      { tier: 4, band: [0.40, 0.75], size: [16, 38], from: 0.05, weight: 3, label: 'super pack' },
      { tier: 4, band: [0.65, 0.95], size: [1, 1], from: 0.00, weight: 4, label: 'solo', roams: true },
    ],
  },
];

export const SOUTH_BY_ID = Object.fromEntries(SOUTH_REGIONS.map(r => [r.id, r]));


/**
 * THE ONE DOOR. The brief: "The southern continent should have ONE door, not
 * twelve." It is a ship, the pattern Ontaria already uses for Elehyd, from the
 * southern shore of the northern map to Wallgate -- and it is gated at gold,
 * which is the rank the south is written for.
 */
export const SOUTH_CROSSING = {
  kind: 'ship',
  fromMap: 'north',
  // The port square on the northern sheet: the Gulf coast, reachable on foot.
  fromSquare: { sx: 17, sy: 10 },
  to: 'wallgate',
  requiredRank: 'gold',
  label: 'the southern packet',
  allow: 'Nine days south and no port worth the name until the end of it. Stow what you cannot afford to lose.',
  refuse: 'South is a gold country from the moment you step off the gangway. Under gold you would not make the quay.',
};

/** The floors test_round65 holds every authored region to, asserted here for
 *  the south as well even though these twelve are not in REGIONS. */
export function southFaults() {
  const out = [];
  for (const r of SOUTH_REGIONS) {
    if ((r.lakes || []).length < 2) out.push(`${r.id}: ${(r.lakes || []).length} lakes`);
    if ((r.roads || []).length < 2) out.push(`${r.id}: ${(r.roads || []).length} roads`);
    if ((r.settlements || []).length < 3) out.push(`${r.id}: ${(r.settlements || []).length} settlements`);
    const houses = (r.settlements || []).reduce((n, s) => n + (s.houses || 0), 0);
    if (houses < 15) out.push(`${r.id}: ${houses} houses`);
    if (!(r.spawnGroups || []).length) out.push(`${r.id}: no spawn groups`);
    for (const g of (r.spawnGroups || [])) {
      if (g.tier !== 4) out.push(`${r.id}: a group at tier ${g.tier}, and the south is gold`);
      if (!g.band) out.push(`${r.id}: a group with no band`);
      else if (!(g.band[0] >= 0 && g.band[1] <= 1 && g.band[0] < g.band[1])) out.push(`${r.id}: band ${g.band}`);
    }
    if (!r.ground || !r.accentPack) out.push(`${r.id}: no ground art`);
    if (!r.cellBox || r.cellBox.length !== 4) out.push(`${r.id}: no cell box`);
    if (!r.arrival) out.push(`${r.id}: no arrival`);
  }
  const ids = SOUTH_REGIONS.map(r => r.id);
  if (new Set(ids).size !== ids.length) out.push('two regions share an id');
  const idx = SOUTH_REGIONS.map(r => r.index);
  if (new Set(idx).size !== idx.length) out.push('two regions share an index');
  return out;
}
