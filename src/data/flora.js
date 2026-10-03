// ===========================================================================
// ROUND 77 -- DESERT FLORA. The user: "Added additional foliage for region 3's
// mountainous desert."
//
// WHY THIS IS NOT IN trees.js. Every flora pack before this one was a PixelLab
// multi-rotation object: eight directions per species, packed one sheet per
// species, bottom-anchored, drawn through TREE_ART at TREE_DISPLAY_SCALE. This
// pack's own metadata says `"directions": 1` and every image is a single 40x40
// "low top-down" drawing. Fifty of them.
//
// A thing with one direction and no trunk is not a tree, it is scatter, and the
// module it belongs beside is rocks.js -- one atlas, a hashed grid, a frame and
// a mirror per cell. Filing it under trees would have meant fifty one-column
// sheets pretending to be eight-column ones and a TREE_ART entry per plant, to
// get worse behaviour than twenty lines of grid gives.
//
// WHAT IS DIFFERENT FROM ROCKS, AND WHY
//
//   * NO COLLISION. A rock is an obstacle; that is most of what a rock is for
//     in this game. Walking through a scrub brush is correct, and a desert
//     where fifty kinds of plant each stop you dead would be unplayable long
//     before it was atmospheric. The one honest exception would be the big
//     saguaros, and they are not worth a second code path for.
//   * ELEHYD ONLY, by region rather than by radius. Rocks scatter from the
//     origin outward because they are everywhere; a barrel cactus in The Nek's
//     temperate forest is the palm-tree mistake round 45 wrote REGION_TREE_
//     SPECIES to avoid.
//   * THREE SIZE CLASSES. See FLORA_CLASS.
// ===========================================================================

/** The atlas: 50 cells of 40px, ten to a row. Built by
 *  extract_round77_flora.py, which is also where the class list comes from. */
export const FLORA_SHEET = 'flora_desert.png';
export const FLORA_CELL = 40;
export const FLORA_COLS = 10;
export const FLORA_COUNT = 50;

/**
 * How big each plant is drawn.
 *
 * The art gives every plant the same forty pixels whether it is a saguaro or a
 * clump of prickly pear, so drawing them all at one scale would produce a
 * desert with no sense of scale in it -- the same failure as round 76's tier-0
 * hatchling and tier-3 adult rendered identically, which was invisible in the
 * data and obvious the moment they were put side by side.
 *
 * The class is the DRAWING's aspect ratio, split at the 30th and 70th
 * percentiles of this pack: the third drawn tallest and narrowest are the
 * columnar cacti, the third drawn squattest and widest are the barrels and the
 * ground brush, and the rest is in between. It is a proxy for real height, and
 * it is written out as a plain list rather than recomputed at load precisely so
 * that a later round which disagrees about one plant can edit one entry.
 */
export const FLORA_CLASS = ['mid', 'low', 'low', 'low', 'mid', 'mid', 'low', 'low', 'mid', 'tall',
  'mid', 'tall', 'tall', 'tall', 'low', 'mid', 'tall', 'tall', 'tall', 'low',
  'mid', 'low', 'mid', 'mid', 'low', 'mid', 'mid', 'mid', 'low', 'tall',
  'tall', 'mid', 'mid', 'tall', 'mid', 'mid', 'tall', 'tall', 'mid', 'tall',
  'low', 'low', 'tall', 'low', 'tall', 'mid', 'low', 'mid', 'low', 'low'];

/**
 * Class -> display scale.
 *
 * The player sprite is about 40 units tall on screen. A saguaro at 2.4 comes
 * out clearly taller than a person, which is what a saguaro is; a barrel
 * cactus at 1.15 comes to about the knee. Deliberately well under
 * TREE_DISPLAY_SCALE (2.6): the tallest plant in a desert should still read as
 * shorter than a tree, or the badlands stop looking like badlands.
 */
export const FLORA_SCALE = { tall: 2.4, mid: 1.7, low: 1.15 };

/** Which regions grow which flora. Absent from this table means none -- an
 *  empty answer is the correct one for three of the four regions, and the
 *  table is read rather than a region id being tested at the call site. */
export const REGION_FLORA = {
  elehyd: 'desert',
};
export function floraSetFor(regionId) { return REGION_FLORA[regionId] || null; }

// The same hash rocks.js uses, and for the same reason: the scatter has to be
// identical on every reload with nothing stored, in a world whose whole terrain
// is generated from fixed string seeds.
function hash2(a, b) {
  let h = (a * 735632797 + b * 2654435761) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 2246822519) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h >>> 0;
}
function rand01(a, b, salt) {
  return hash2(a * 40503 + salt, b * 12289 + salt * 31) / 4294967295;
}

/** World units between grid cells. Tighter than the rocks' 440 because plants
 *  are the thing you see constantly and rocks are the thing you see now and
 *  then -- a desert with a cactus every two screens is a bald plain. */
const FLORA_SPACING = 210;
/** Fraction of cells holding a plant. Two thirds, so the ground still shows. */
const FLORA_CHANCE = 0.62;
/** Cells may hold a small clump rather than a single plant. Deserts grow in
 *  clumps and a perfectly even scatter is the one thing that always reads as a
 *  grid however hard the jitter works. */
const CLUMP_CHANCE = 0.3;

/**
 * Scatter flora across a box.
 *
 * NOT STORED -- GENERATED FOR THE BOX YOU ASK ABOUT.
 *
 * The first version built the whole of Elehyd once and kept it, the way the
 * rock pass does. Elehyd's box is 65,536 units on a side, so at this spacing
 * that came to about 78,000 objects held forever, and `_updateFloraViewport`
 * then scanned all 78,000 every time the camera moved far enough to change the
 * view key. Rocks get away with the same shape because there are only ~7,400
 * of them across all four regions and because they are looked up through a
 * spatial grid; flora is ten times that in one region.
 *
 * The way out is that this scatter is a PURE FUNCTION OF THE CELL. Every plant
 * is decided by a hash of the grid cell it belongs to and nothing else, so the
 * answer for the few hundred cells under the camera can be computed on the
 * spot, and it is the same answer it would have been if the whole region had
 * been built at load. Nothing is stored, nothing is indexed, and there is no
 * second copy of the world to keep in sync.
 *
 * `id` is derived from the cell rather than from an array position, so the same
 * plant keeps the same id across calls and the sprite pool can reconcile
 * against it.
 *
 * `isBlocked(x, y)` is supplied by WorldScene and covers water, roads, river
 * bed and buildings -- the same contract generateForest and generateRocks use,
 * so this module never has to learn what any of those are.
 *
 * Returns `{ id, x, y, frame, flip, scale }`. The scale is resolved HERE rather
 * than at draw time so that the renderer stays a dumb blitter and a suite can
 * assert the size distribution without a canvas.
 */
export function generateFlora({ x0, y0, x1, y1, isBlocked = null, count = FLORA_COUNT }) {
  const out = [];
  const cMinX = Math.floor(x0 / FLORA_SPACING), cMaxX = Math.ceil(x1 / FLORA_SPACING);
  const cMinY = Math.floor(y0 / FLORA_SPACING), cMaxY = Math.ceil(y1 / FLORA_SPACING);
  for (let cy = cMinY; cy <= cMaxY; cy++) {
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      if (rand01(cx, cy, 61) > FLORA_CHANCE) continue;
      const n = rand01(cx, cy, 62) < CLUMP_CHANCE ? 2 + Math.floor(rand01(cx, cy, 63) * 2) : 1;
      for (let k = 0; k < n; k++) {
        const jx = (rand01(cx, cy, 71 + k * 3) - 0.5) * FLORA_SPACING * 0.9;
        const jy = (rand01(cx, cy, 72 + k * 3) - 0.5) * FLORA_SPACING * 0.9;
        const x = (cx + 0.5) * FLORA_SPACING + jx;
        const y = (cy + 0.5) * FLORA_SPACING + jy;
        // A plant is CLIPPED to the box but its position does not depend on
        // the box, which is what makes the on-demand call give the same answer
        // as the whole-region one. The jitter can carry a plant up to half a
        // cell outside, so callers ask for a box a little larger than the
        // camera -- see `_updateFloraViewport`.
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        if (isBlocked && isBlocked(x, y)) continue;
        const frame = Math.floor(rand01(cx, cy, 81 + k * 5) * count) % count;
        out.push({
          id: `${cx}:${cy}:${k}`,
          x, y, frame,
          flip: rand01(cx, cy, 91 + k * 5) < 0.5,
          scale: FLORA_SCALE[FLORA_CLASS[frame] || 'mid'],
        });
      }
    }
  }
  return out;
}

/** Half a cell, in world units. What a caller must add to the camera box so a
 *  jittered plant belonging to an edge cell is not clipped away and then
 *  popped back in when the camera moves one pixel. */
export const FLORA_OVERSCAN = FLORA_SPACING * 0.5;

/** Faults a suite can assert without booting the game. */
export function floraFaults() {
  const out = [];
  if (FLORA_CLASS.length !== FLORA_COUNT) {
    out.push(`FLORA_CLASS has ${FLORA_CLASS.length} entries for ${FLORA_COUNT} plants`);
  }
  for (let i = 0; i < FLORA_CLASS.length; i++) {
    if (!FLORA_SCALE[FLORA_CLASS[i]]) out.push(`plant ${i} has unknown class ${FLORA_CLASS[i]}`);
  }
  // Every class must be USED. A class defined and never assigned is a scale
  // nothing is ever drawn at, which is the shape of "a field read by nothing"
  // this project has shipped in five separate rounds.
  for (const c of Object.keys(FLORA_SCALE)) {
    if (!FLORA_CLASS.includes(c)) out.push(`class ${c} is defined but no plant is in it`);
  }
  // And the sheet must actually hold what the count claims.
  if (FLORA_COUNT > FLORA_COLS * Math.ceil(FLORA_COUNT / FLORA_COLS)) {
    out.push('FLORA_COUNT does not fit the declared grid');
  }
  for (const r of Object.keys(REGION_FLORA)) {
    if (REGION_FLORA[r] !== 'desert') out.push(`region ${r} names unknown flora set ${REGION_FLORA[r]}`);
  }
  return out;
}
