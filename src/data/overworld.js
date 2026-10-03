// ===========================================================================
// ROUND 194 -- THE OVERWORLD.
//
// The user: "Change to the transition between regions. On exiting a region the
// player moves to an overworld map ... Upon a player choosing to enter a square
// a playable map is generated based on the pixels present within that square."
//
// WHAT THE PIXELS ARE. `public/assets/overworld_biomes.png` is the biome index
// the user built from satellite imagery: 1200 x 650 greyscale, one pixel per
// overworld cell (~7.1 km), the pixel VALUE being the biome id in `BIOMES`
// below. Nothing about it is decorative -- it is the terrain source, and the
// map the player looks at is drawn from the same array, so what they see on
// the overworld is what the square generates.
//
// THE GRID. 1200 x 650 divides evenly by 50, which is the whole reason the
// user's grid document settled on that padding: 24 x 13 squares of 50 cells
// (~355 km) each. A square is what the player enters, and it builds as a
// 1024-tile playable map -- a quarter of a named region.
//
// WHAT IS AUTHORED AND WHAT IS NOT. The five North American named regions --
// the Nek, Ontaria, Elehyd, Sirukh Sands and the Cinderwaste -- have their own
// hand-built maps and sit inside their own boxes on this grid. The squares
// they touch are marked and are entered the way they always were, through
// their gates and ships. Everything else is generated.
// ===========================================================================

/** The biome index image, and the grid over it. */
export const OW_COLS = 1200;
export const OW_ROWS = 650;
/** One square, in overworld cells. 1200 x 650 / 50 = 24 x 13 squares. */
export const OW_SQUARE = 50;
export const OW_SQ_COLS = OW_COLS / OW_SQUARE;   // 24
export const OW_SQ_ROWS = OW_ROWS / OW_SQUARE;   // 13
/** ...and how many game tiles a square becomes when it is entered. */
export const OW_SQUARE_TILES = 1024;
/** Cells per square edge -> tiles per cell: 1024 / 50 = 20.48. */
export const OW_TILES_PER_CELL = OW_SQUARE_TILES / OW_SQUARE;
/** How much of the map the overworld screen shows: four major cells across,
 *  three down, a major cell being 200 overworld cells (the user's own grid). */
export const OW_MAJOR = 200;
export const OW_VIEW_COLS = OW_MAJOR * 4;
export const OW_VIEW_ROWS = OW_MAJOR * 3;

/**
 * The biome table, ids matching the pixel values in the index image.
 *
 * `water` is what stops a party with no boat; `ground` is the tile the square
 * generator paints for it; `tree`/`rock` are how thick the cover comes out.
 */
export const BIOMES = [
  { id: 0,  key: 'ocean',     name: 'Ocean',        colour: '#1a2c54', water: 'deep',    ground: 'water', tree: 0,    rock: 0 },
  { id: 1,  key: 'lake',      name: 'Lake',         colour: '#30609c', water: 'light',   ground: 'water', tree: 0,    rock: 0 },
  { id: 2,  key: 'ice',       name: 'Ice',          colour: '#eef4f8', water: null,      ground: 'snow',  tree: 0.02, rock: 0.5 },
  { id: 3,  key: 'tundra',    name: 'Tundra',       colour: '#96b084', water: null,      ground: 'tundra', tree: 0.18, rock: 0.7 },
  { id: 4,  key: 'mountain',  name: 'Mountains',    colour: '#7e7e84', water: null,      ground: 'rock',  tree: 0.25, rock: 1.9 },
  { id: 5,  key: 'forest',    name: 'Forest',       colour: '#1e4e28', water: null,      ground: 'grass', tree: 1.35, rock: 0.5 },
  { id: 6,  key: 'grassland', name: 'Grassland',    colour: '#7ab054', water: null,      ground: 'grass', tree: 0.35, rock: 0.3 },
  { id: 7,  key: 'plains',    name: 'Plains',       colour: '#928c60', water: null,      ground: 'plains', tree: 0.2, rock: 0.35 },
  { id: 8,  key: 'desert',    name: 'Desert',       colour: '#d0b278', water: null,      ground: 'sand',  tree: 0.05, rock: 0.6 },
  { id: 9,  key: 'tropical',  name: 'Tropical',     colour: '#96c466', water: null,      ground: 'grass', tree: 1.5,  rock: 0.2 },
  { id: 10, key: 'river',     name: 'River',        colour: '#4a8cc4', water: 'light',   ground: 'water', tree: 0,    rock: 0 },
  { id: 11, key: 'volcanic',  name: 'Volcanic',     colour: '#cc5c1c', water: null,      ground: 'ash',   tree: 0.02, rock: 1.6 },
  { id: 12, key: 'lava',      name: 'Lava',         colour: '#80140e', water: 'lava',    ground: 'lava',  tree: 0,    rock: 0.4 },
];
export const BIOME_BY_ID = Object.fromEntries(BIOMES.map(b => [b.id, b]));

/**
 * Which FAMILY of ground a biome is. A region has one ground pack and one
 * accent pack, so a square cannot draw thirteen biomes -- what it can do is
 * draw "the ground here" and "the other ground here", and the family is what
 * decides which cells are the other one. Without this a forest square paved
 * every grassland cell with the accent pack and came out looking like a car
 * park with trees in it.
 */
export const BIOME_FAMILY = {
  ocean: 'wet', lake: 'wet', river: 'wet',
  forest: 'green', grassland: 'green', tropical: 'green',
  plains: 'dry', desert: 'dry',
  ice: 'cold', tundra: 'cold',
  mountain: 'rock',
  volcanic: 'fire', lava: 'fire',
};
export const familyOf = (id) => BIOME_FAMILY[(BIOME_BY_ID[id] || {}).key] || 'green';

// ---------------------------------------------------------------------------
// THE RANK ZONES, off the user's own annotated map.
//
// The boxes are the panels drawn on the rank-zone screenshot, converted from
// that image's pixels to grid cells with the transform the overworld export
// shipped (col = (x * 4.695706 + 955.823) / 6, row likewise minus the 213-row
// crop). A square outside every box takes the rank of the nearest box, so the
// far north-east water and the southern edge are never rankless.
// ---------------------------------------------------------------------------
export const RANK_ZONES = [
  { rank: 'silver',  c0: 164, r0: 2,   c1: 445,  r1: 287, label: 'the northern reaches' },
  { rank: 'bronze',  c0: 449, r0: 2,   c1: 1098, r1: 187, label: 'the ice and the sands' },
  { rank: 'iron',    c0: 764, r0: 190, c1: 1098, r1: 507, label: 'the east' },
  { rank: 'gold',    c0: 445, r0: 190, c1: 764,  r1: 509, label: 'the interior' },
  { rank: 'gold',    c0: 162, r0: 291, c1: 445,  r1: 512, label: 'the west coast' },
  { rank: 'gold',    c0: 764, r0: 507, c1: 1098, r1: 575, label: 'the southern woods' },
  { rank: 'diamond', c0: 162, r0: 575, c1: 1098, r1: 650, label: 'the far south' },
];

/** The five named regions on this map, in grid cells, with their settlements
 *  (the labels the overworld screen draws). Bratugal and Ixcuatl are on the
 *  southern continent and are not on this sheet. */
export const OW_REGIONS = [
  { id: 'elehyd', name: 'Elehyd', c0: 275, r0: 127, c1: 314, r1: 164,
    places: [['Karsk Landing', 283.6, 156.7, 'city'], ['Coldharrow', 291.8, 156.3, 'hamlet'], ['Gravemarch', 304.7, 158.5, 'hamlet']] },
  { id: 'sirukh', name: 'Sirukh Sands', c0: 709, r0: 134, c1: 742, r1: 167,
    places: [['Tolbrand Quay', 724.6, 140.3, 'town'], ['Salt Gate', 731.6, 151.3, 'village'], ['Dunmouth', 719.0, 156.9, 'hamlet']] },
  { id: 'cinder', name: 'The Cinderwaste', c0: 336, r0: 224, c1: 373, r1: 261,
    places: [['Ashfall Station', 345.6, 235.1, 'village'], ['Kiln Halt', 354.6, 241.8, 'hamlet'], ['Slagward', 362.7, 247.8, 'village']] },
  { id: 'ontaria', name: 'Ontaria', c0: 795, r0: 366, c1: 832, r1: 403,
    places: [['Harrowmoor', 806.1, 375.3, 'city'], ['Little Gale', 799.5, 380.1, 'town'], ['Sailmend', 809.8, 397.2, 'village'], ['Cobb Point', 818.8, 399.0, 'village']] },
  { id: 'nek', name: 'The Nek', c0: 984, r0: 357, c1: 1021, r1: 394,
    places: [['Cadence', 1000.4, 376.0, 'city'], ['Milrow', 997.4, 381.5, 'hamlet'], ['Fenn Cross', 991.4, 387.8, 'hamlet']] },
];

export const RANK_ORDER_OW = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];

// ---------------------------------------------------------------------------
// ROUND 195 -- TWO SHEETS.
//
// The overworld is no longer one map. The north is the 1200 x 650 index round
// 194 shipped; the south is the user's southern continent, 850 x 1100, and its
// twelve regions are AUTHORED (src/data/south.js) rather than generated -- so
// on that sheet a named region is a place you can go, which is the opposite of
// the north, where a named region has its own boot-built map and is reached
// through its own gates.
//
// Everything below that used to read the module constants now takes an
// optional sheet, defaulting to the north, so round 194's callers are
// unchanged and nothing had to be renamed to add a continent.
// ---------------------------------------------------------------------------
export const SHEETS = {
  north: {
    id: 'north', name: 'The northern continent', asset: 'overworld_biomes',
    cols: OW_COLS, rows: OW_ROWS,
    rankZones: RANK_ZONES, regions: OW_REGIONS,
    // A named region here keeps its own roads: it is entered through its gates
    // and ships, not off the map.
    regionsEnterable: false,
  },
  south: {
    id: 'south', name: 'The southern continent', asset: 'overworld_biomes_south',
    cols: 850, rows: 1100,        // and registerSouthSheet confirms it from south.js
    // The whole south is gold, and deeper gold the further in -- which is the
    // `band` on each region's spawn groups, not a rank.
    rankZones: [{ rank: 'gold', c0: 0, r0: 0, c1: 849, r1: 1099, label: 'the south' }],
    regions: [],            // filled by registerSouthSheet, to avoid a cycle
    regionsEnterable: true,
  },
};
export const sheetOf = (id) => SHEETS[id] || SHEETS.north;

/** south.js hands its twelve over here rather than overworld.js importing it,
 *  because south.js reads REGION_TILES from regions.js and this file is
 *  imported by things that must not pull the world in. */
export function registerSouthSheet(regions, dims = {}) {
  // The sheet's SHAPE comes with the regions rather than being written here
  // twice. south.js knows how big its map is and how many tiles a cell is
  // worth; this file would only be repeating those numbers, and a repeated
  // number is the fault this project keeps finding in its own data.
  const sh = SHEETS.south;
  if (dims.cols) sh.cols = dims.cols;
  if (dims.rows) sh.rows = dims.rows;
  if (dims.rows && sh.rankZones.length === 1) {
    sh.rankZones[0].c1 = sh.cols - 1;
    sh.rankZones[0].r1 = sh.rows - 1;
  }
  const perCell = dims.tilesPerCell || 64;        // region tiles to one cell
  sh.regions = regions.map(r => ({
    id: r.id, name: r.name,
    c0: r.cellBox[0], r0: r.cellBox[1], c1: r.cellBox[2], r1: r.cellBox[3],
    places: (r.settlements || []).map(st => [st.name,
      r.cellBox[0] + st.at.tx / perCell, r.cellBox[1] + st.at.ty / perCell, st.kind]),
    authored: true,
  }));
  return sh.regions;
}

/** The cell box a square covers. */
export const squareBox = (sx, sy) => ({
  c0: sx * OW_SQUARE, r0: sy * OW_SQUARE, c1: sx * OW_SQUARE + OW_SQUARE - 1, r1: sy * OW_SQUARE + OW_SQUARE - 1,
});
export const squareKey = (sx, sy) => `${sx},${sy}`;
export const sqColsOf = (sheet) => Math.floor(sheetOf(sheet).cols / OW_SQUARE);
export const sqRowsOf = (sheet) => Math.floor(sheetOf(sheet).rows / OW_SQUARE);
export const inGrid = (sx, sy, sheet = 'north') =>
  sx >= 0 && sy >= 0 && sx < sqColsOf(sheet) && sy < sqRowsOf(sheet);

/**
 * The seed for a square: its position and nothing else.
 *
 * 4.2 -- "The seed shouldn't change between players or resets so that if a
 * player explores an area it's always the same area." So no run seed, no save
 * id, no time: two players comparing notes about the cave on the ridge at
 * 14,6 are talking about the same cave.
 */
export function squareSeed(sx, sy) {
  let h = 0x9e3779b9 ^ ((sx & 0xffff) * 0x85ebca6b) ^ (((sy & 0xffff) + 1) * 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** A square's rank: the zone it sits in, or the nearest zone if it sits
 *  outside every one of them (the ocean margins). */
export function squareRank(sx, sy, sheet = 'north') {
  const b = squareBox(sx, sy);
  const cx = (b.c0 + b.c1) / 2, cy = (b.r0 + b.r1) / 2;
  let best = null, bestD = Infinity;
  for (const z of sheetOf(sheet).rankZones) {
    const dx = cx < z.c0 ? z.c0 - cx : cx > z.c1 ? cx - z.c1 : 0;
    const dy = cy < z.r0 ? z.r0 - cy : cy > z.r1 ? cy - z.r1 : 0;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = z; }
    if (d === 0) break;
  }
  return best ? best.rank : 'iron';
}

/** The named region a square overlaps, if any. */
export function namedRegionAt(sx, sy, sheet = 'north') {
  const b = squareBox(sx, sy);
  for (const r of sheetOf(sheet).regions) {
    if (r.c1 < b.c0 || r.c0 > b.c1 || r.r1 < b.r0 || r.r0 > b.r1) continue;
    return r;
  }
  return null;
}

/**
 * What is in a square, read off the biome index.
 *
 * `cells` is the whole 1200x650 index as a Uint8Array (see `loadBiomeIndex`).
 * Returns the histogram, the water share, the dominant land biome and whether
 * a river runs through it -- everything the map screen labels a square with
 * and everything the generator plans from.
 */
export function squareStats(cells, sx, sy, sheet = 'north') {
  const b = squareBox(sx, sy);
  const stride = sheetOf(sheet).cols;
  const hist = new Array(BIOMES.length).fill(0);
  for (let r = b.r0; r <= b.r1; r++) {
    const base = r * stride;
    for (let c = b.c0; c <= b.c1; c++) hist[cells[base + c]]++;
  }
  const total = OW_SQUARE * OW_SQUARE;
  const water = hist[0] + hist[1] + hist[10];
  let domId = 5, domN = -1;
  for (const bi of BIOMES) {
    if (bi.water || bi.id === 2) continue;
    if (hist[bi.id] > domN) { domN = hist[bi.id]; domId = bi.id; }
  }
  if (domN <= 0) domId = hist[2] > 0 ? 2 : 0;
  return {
    hist, total,
    ocean: hist[0] / total,
    water: water / total,
    land: 1 - water / total,
    river: hist[10] > 0,
    lava: hist[12] > 0 || hist[11] > 0,
    dominant: domId,
    dominantName: (BIOME_BY_ID[domId] || BIOMES[5]).name,
  };
}

/**
 * MAY THE PARTY GO HERE?
 *
 *   3   "Until the party gets a mode of transport that can cross water they
 *        cannot enter ocean tiles, or any region which overlaps with a named
 *        region grid."
 *   5   "Players who do not meet the minimum requirements for a region can't
 *        cross into it and receive a 'Going into a higher ranked region is
 *        certain death until I'm stronger' message."
 *
 * Returns `{ ok, why, reason }`; `reason` is one of 'water', 'named', 'rank',
 * 'edge', so the caller can decide how to say it.
 */
/**
 * ROUND 197 -- WHEELS DO NOT CLIMB.
 *
 * The user's own division of the nine: "the Beetle, clockwork house, covered
 * wagons and camper vans are all ground only transport, the ship, dragon, and
 * airboat are all terrain able to cross oceans and mountain tiles." So the
 * mountains are what a ground vehicle cannot do, and they are the reason to
 * save for an airboat.
 *
 * IT GATES THE VEHICLE, NOT THE PARTY. A party on foot crosses a pass exactly
 * as it always has -- nothing that was reachable before this round stops being
 * reachable. The refusal only appears when the party is riding something with
 * wheels or legs, which is a choice they made and can undo by getting out.
 *
 * MEASURED BEFORE IT WAS SET. At 40% of a square's cells, this closes 6 of the
 * north's 204 land squares and 3 of the south's 161 -- enough to be a wall
 * across the two ranges that have one, and not so much that the map turns into
 * a corridor. At 55% it would have been 3 and 1, which is not a wall at all.
 */
export const MOUNTAIN_SHUT = 0.40;
export function mountainShare(st) {
  return (st.hist[4] || 0) / (st.total || 1);
}

export function canEnterSquare(cells, sx, sy, opts = {}) {
  const sheet = opts.sheet || 'north';
  if (!inGrid(sx, sy, sheet)) return { ok: false, reason: 'edge', why: 'There is nothing out that way.' };
  const named = namedRegionAt(sx, sy, sheet);
  // ROUND 195 -- on the southern sheet a named region IS the destination: the
  // twelve are authored and built on arrival, so the map is how you reach them.
  if (named && !sheetOf(sheet).regionsEnterable && !opts.boat) {
    return { ok: false, reason: 'named', region: named,
      why: `${named.name} keeps its own roads. Travel there the way you always have.` };
  }
  const st = squareStats(cells, sx, sy, sheet);
  if (named && sheetOf(sheet).regionsEnterable) {
    const rank = squareRank(sx, sy, sheet);
    const have = RANK_ORDER_OW.indexOf(opts.rank || 'normal');
    if (RANK_ORDER_OW.indexOf(rank) > Math.max(1, have)) {
      return { ok: false, reason: 'rank', rank, region: named,
        why: 'Going into a higher ranked region is certain death until I\'m stronger.' };
    }
    return { ok: true, rank, stats: st, named, authored: true };
  }
  if (st.land < 0.12 && !opts.boat) {
    return { ok: false, reason: 'water', why: 'Open water. We would need something that floats.' };
  }
  if (opts.wheels && mountainShare(st) >= MOUNTAIN_SHUT) {
    return { ok: false, reason: 'mountain',
      why: 'The pass is no road. Nothing on wheels or legs is getting over that.' };
  }
  const rank = squareRank(sx, sy, sheet);
  const have = RANK_ORDER_OW.indexOf(opts.rank || 'normal');
  const need = RANK_ORDER_OW.indexOf(rank);
  if (need > Math.max(1, have)) {
    return { ok: false, reason: 'rank', rank,
      why: 'Going into a higher ranked region is certain death until I\'m stronger.' };
  }
  return { ok: true, rank, stats: st, named };
}

/** Can the party step from one square to the next? Movement on the overworld
 *  is orthogonal, and water is a wall until there is a boat. */
export function canStepTo(cells, sx, sy, opts = {}) {
  const sheet = opts.sheet || 'north';
  if (!inGrid(sx, sy, sheet)) return { ok: false, reason: 'edge', why: 'There is nothing out that way.' };
  // A southern region's own square is always steppable: the box may be half
  // sea (Hornbay is 40% ocean) and the region is still the place you are going.
  if (namedRegionAt(sx, sy, sheet) && sheetOf(sheet).regionsEnterable) return { ok: true };
  const st = squareStats(cells, sx, sy, sheet);
  if (st.land < 0.12 && !opts.boat) {
    return { ok: false, reason: 'water', why: 'Open water. We would need something that floats.' };
  }
  if (opts.wheels && mountainShare(st) >= MOUNTAIN_SHUT) {
    return { ok: false, reason: 'mountain',
      why: 'The pass is no road. Nothing on wheels or legs is getting over that.' };
  }
  return { ok: true };
}

/** Decode the loaded biome index image into one byte per cell. The image is
 *  greyscale, so the red channel IS the biome id. */
export function decodeBiomeIndex(imageData, sheet = 'north') {
  const sh = sheetOf(sheet);
  const out = new Uint8Array(sh.cols * sh.rows);
  const d = imageData.data;
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = d[p];
  return out;
}

/** The 50x50 block of cells a square covers, as its own array. */
export function squareCells(cells, sx, sy, sheet = 'north') {
  const b = squareBox(sx, sy);
  const stride = sheetOf(sheet).cols;
  const out = new Uint8Array(OW_SQUARE * OW_SQUARE);
  for (let r = 0; r < OW_SQUARE; r++) {
    const src = (b.r0 + r) * stride + b.c0;
    out.set(cells.subarray(src, src + OW_SQUARE), r * OW_SQUARE);
  }
  return out;
}

/** A square's name, for the banner and the map. Deterministic, seeded, and
 *  built from what is actually in the square rather than from a bag of
 *  fantasy nouns: "the Ashen Reach", "Coldwater Bend". */
const NAME_HEAD = {
  ocean: ['Shoal', 'Drowned', 'Salt'], lake: ['Coldwater', 'Still', 'Deep'],
  ice: ['Hoarfrost', 'White', 'Glass'], tundra: ['Wind', 'Bare', 'Grey'],
  mountain: ['Stone', 'High', 'Iron'], forest: ['Green', 'Elder', 'Black'],
  grassland: ['Long', 'Open', 'Wide'], plains: ['Dust', 'Amber', 'Flat'],
  desert: ['Sand', 'Sun', 'Bleached'], tropical: ['Fever', 'Rain', 'Vine'],
  river: ['River', 'Ford', 'Current'], volcanic: ['Ash', 'Cinder', 'Smoke'],
  lava: ['Ember', 'Fire', 'Slag'],
};
const NAME_TAIL = ['Reach', 'Hollow', 'Bend', 'March', 'Wold', 'Flats', 'Rise', 'Draw', 'Stand', 'Verge'];

export function squareName(cells, sx, sy, dominant = null, sheet = 'north') {
  const named = namedRegionAt(sx, sy, sheet);
  if (named) return named.name;
  // `dominant` is passed by the generator, which has already read the square's
  // OWN cells; without it this reads the whole index, and a caller that hands
  // in a 50x50 block would be indexing it as if it were 1200 wide -- which is
  // how the first square in the game came out named "Shoal Draw" in the middle
  // of a forest.
  const domId = dominant == null ? squareStats(cells, sx, sy, sheet).dominant : dominant;
  const bi = BIOME_BY_ID[domId] || BIOMES[5];
  const seed = squareSeed(sx, sy);
  const heads = NAME_HEAD[bi.key] || NAME_HEAD.forest;
  const head = heads[seed % heads.length];
  const tail = NAME_TAIL[(seed >>> 5) % NAME_TAIL.length];
  return `${head}${tail === 'Flats' || tail === 'Reach' ? ' ' : ' '}${tail}`;
}
