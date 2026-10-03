// ============================================================================
// ROUND 285 (item 18 / 2.2) -- VERTICALITY MOCKUPS FOR THE NEK.
//
//   "mock up a few quick versions of canyons, cliffs, waterfalls and ramps for
//    the NEK and I'll make corrections so that you can work to apply across
//    the map as they make sense."
//
// Four authored sites, stamped into open ground near the Nek's arrival road.
// Each is a height map in ASCII plus a list of ramps, so a correction is an
// edit to a picture rather than to code.
//
//   map characters
//     .  0   ground            1 2 3   raised ground at that level
//     ~  river at level 0      w W M   river at levels 1, 2, 3
//     o  pool at level 0       p P Q   pool at levels 1, 2, 3
//
//   a ramp: { x, y, w, h, dir, hi, lo, style }
//     the rectangle it covers, the way it runs DOWNHILL ('S' 'E' 'N' 'W'),
//     the level at its top and at its foot, and 'ramp' (packed earth) or
//     'stairs' (cut stone).
//
//   a climb (round 286): { x, y, dir, style } -- a ladder or vines from the
//     top tile (x, y) down the face on side `dir` to the tile below it.
//
// The camera looks from the south-east, so the cliff faces a player sees are
// the ones on the south and east sides of high ground. Every mockup puts its
// high ground to the north and west for that reason.
// ============================================================================

const LEVEL = { '.': 0, '1': 1, '2': 2, '3': 3 };
const WATER = {
  '~': [0, 'river'], w: [1, 'river'], W: [2, 'river'], M: [3, 'river'],
  o: [0, 'pool'], p: [1, 'pool'], P: [2, 'pool'], Q: [3, 'pool'],
};

function fill(w, h, ch) { return Array.from({ length: h }, () => ch.repeat(w)); }
function put(rows, x, y, ch) {
  if (y < 0 || y >= rows.length || x < 0 || x >= rows[y].length) return;
  rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
}
function rect(rows, x0, y0, w, h, ch) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(rows, x, y, ch);
}

// --- A. THE ESCARPMENT --------------------------------------------------------
// Three terraces stepping down toward the viewer, each joined to the next by a
// different kind of way up: cut stairs, a long earth ramp, a side ramp.
const escarpment = (() => {
  const rows = fill(34, 22, '.');
  rect(rows, 0, 0, 34, 15, '1');
  rect(rows, 0, 0, 34, 10, '2');
  rect(rows, 0, 0, 26, 7, '3');
  rect(rows, 0, 10, 8, 1, '1'); rect(rows, 8, 10, 20, 2, '2');   // a bay and a spur in the middle terrace
  rect(rows, 9, 15, 13, 1, '1');                                 // a lip on the bottom terrace
  return {
    id: 'escarpment', name: 'A. The escarpment',
    notes: 'Three terraces (levels 3, 2, 1) stepping down to the road. Stone stairs 3->2, '
      + 'a long earth ramp 2->1, stone stairs 1->0, and a side ramp running east off the top terrace.',
    map: rows,
    ramps: [
      { x: 16, y: 7, w: 2, h: 2, dir: 'S', hi: 3, lo: 2, style: 'stairs' },
      { x: 19, y: 12, w: 2, h: 3, dir: 'S', hi: 2, lo: 1, style: 'ramp' },
      { x: 4, y: 15, w: 2, h: 2, dir: 'S', hi: 1, lo: 0, style: 'stairs' },
      { x: 26, y: 3, w: 3, h: 2, dir: 'E', hi: 3, lo: 2, style: 'ramp' },
    ],
    // ROUND 286 -- "ladders or climbable vines ... some places for sure".
    climbs: [{ x: 27, y: 14, dir: 'S', style: 'ladder' }],
  };
})();

// --- B. THE CANYON -----------------------------------------------------------
// A gorge cut two levels down through high ground, with a river on its floor
// and a bench along its north wall. It opens onto the plain at its east end.
const canyon = (() => {
  const W = 42, H = 26;
  const rows = fill(W, H, '2');
  // Straight runs with one dogleg: a diagonal edge in this projection is a
  // saw of one-tile steps, so a canyon reads cleanest along the grid.
  // The south rim is one level, not two: seen from the south-east a
  // two-level south wall hides the whole floor it stands over.
  rect(rows, 0, 17, W, H - 17, '1');
  for (let x = 0; x < W; x++) {
    const off = x < 20 ? 0 : 2;
    rect(rows, x, 6 + off, 1, 2, '1');     // the bench under the north wall
    rect(rows, x, 8 + off, 1, 9 - off, '.');    // the floor
    rect(rows, x, 12 + off, 1, 2, '~');    // the river
  }
  rect(rows, 19, 12, 2, 4, '~');            // the river turns at the dogleg
  // It opens onto the plain in the east.
  for (let y = 0; y < H; y++) for (let x = 36; x < W; x++) {
    const c = rows[y][x];
    if (c === '2' || c === '1') put(rows, x, y, '.');
  }
  return {
    id: 'canyon', name: 'B. The canyon',
    notes: 'A gorge: two levels deep under the north rim (with a one-level bench), one level under the south rim, river along the floor, one dogleg, '
      + 'opening onto the plain to the east. Stairs down from the rim to the bench; a ramp from the bench to the floor.',
    map: rows,
    ramps: [
      { x: 5, y: 4, w: 2, h: 2, dir: 'S', hi: 2, lo: 1, style: 'stairs' },
      { x: 12, y: 8, w: 2, h: 2, dir: 'S', hi: 1, lo: 0, style: 'ramp' },
      { x: 26, y: 10, w: 2, h: 2, dir: 'S', hi: 1, lo: 0, style: 'ramp' },
      { x: 28, y: 17, w: 2, h: 2, dir: 'N', hi: 1, lo: 0, style: 'ramp' },
    ],
  };
})();

// --- C. THE FALLS ------------------------------------------------------------
// A river comes off the highland in two drops: one level into a pool on a
// shelf, then two levels into a basin on the plain.
const falls = (() => {
  const rows = fill(32, 26, '.');
  rect(rows, 0, 0, 32, 12, '2');
  rect(rows, 0, 0, 32, 6, '3');
  rect(rows, 14, 0, 3, 6, 'M');     // river on the highland
  rect(rows, 11, 6, 9, 3, 'P');     // the shelf pool
  rect(rows, 14, 9, 3, 3, 'W');     // river across the shelf
  rect(rows, 9, 13, 13, 4, 'o');    // the basin
  rect(rows, 14, 12, 3, 1, '~');    // the foot of the falls, a dry ledge either side
  rect(rows, 14, 17, 3, 9, '~');    // and away south
  return {
    id: 'falls', name: 'C. The falls',
    notes: 'A two-tier waterfall: a one-level drop from the highland (3) into a shelf pool (2), '
      + 'then a two-level drop into a basin on the plain, with a dry ledge along the cliff foot and a cave behind the lower fall. The river splits the high ground in two, so each side has its own stairs and ramp.',
    map: rows,
    ramps: [
      // The river splits the highland and the shelf in two, so each side
      // has its own way up and down.
      { x: 4, y: 6, w: 2, h: 2, dir: 'S', hi: 3, lo: 2, style: 'stairs' },
      { x: 25, y: 6, w: 2, h: 2, dir: 'S', hi: 3, lo: 2, style: 'stairs' },
      { x: 4, y: 12, w: 2, h: 4, dir: 'S', hi: 2, lo: 0, style: 'ramp' },
      { x: 25, y: 12, w: 2, h: 4, dir: 'S', hi: 2, lo: 0, style: 'ramp' },
    ],
  };
})();

// --- D. RAMPS AND STAIRS -----------------------------------------------------
// One mesa, every way up: a long gentle ramp, stone stairs in two flights with
// a landing, and a ramp off the east side.
const approaches = (() => {
  const rows = fill(34, 22, '.');
  rect(rows, 12, 11, 16, 3, '1');   // the skirt, east of the long ramp
  rect(rows, 8, 3, 18, 8, '2');     // the mesa
  return {
    id: 'approaches', name: 'D. Ramps and stairs',
    notes: 'A two-level mesa with a one-level skirt. A long gentle earth ramp (0->2 over 8 tiles), '
      + 'stone stairs in two flights with a landing on the skirt, and an earth ramp off the east face.',
    map: rows,
    ramps: [
      { x: 10, y: 11, w: 2, h: 8, dir: 'S', hi: 2, lo: 0, style: 'ramp' },
      { x: 16, y: 11, w: 3, h: 2, dir: 'S', hi: 2, lo: 1, style: 'stairs' },
      { x: 16, y: 14, w: 3, h: 2, dir: 'S', hi: 1, lo: 0, style: 'stairs' },
      { x: 26, y: 5, w: 4, h: 2, dir: 'E', hi: 2, lo: 0, style: 'ramp' },
    ],
    climbs: [{ x: 25, y: 9, dir: 'E', style: 'vines' }],
  };
})();

export const VERTICALITY_MOCKUPS = [escarpment, canyon, falls, approaches];

/** Parse a mockup into tiles: [{dx, dy, level, water}] (water: null|'river'|'pool'). */
export function parseMockup(m) {
  const out = [];
  m.map.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const c = row[dx];
      if (c in LEVEL) out.push({ dx, dy, level: LEVEL[c], water: null });
      else if (c in WATER) out.push({ dx, dy, level: WATER[c][0], water: WATER[c][1] });
      else out.push({ dx, dy, level: 0, water: null });
    }
  });
  return out;
}

export function mockupSize(m) {
  return { w: Math.max(...m.map.map(r => r.length)), h: m.map.length };
}
