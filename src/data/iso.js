// Shared isometric-projection math, ported 1:1 from sparkstone_prototype.html
// (see ISO_TW/ISO_TH/isoProject/isoUnproject/facingFromMove there). Keeping
// this identical is deliberate: every gameplay system stays in plain square
// "world" coordinates (movement, collision, distances, AI) and ONLY this
// module's isoProject() is used to figure out where something should be
// drawn. That's the exact split the original engine used, and it's why the
// migration doesn't have to re-derive any gameplay math -- only re-plumb it
// through Phaser GameObjects instead of raw canvas draws.
//
// IMPORTANT DIFFERENCE FROM THE ORIGINAL: in the original, isoProject()
// output went through a *manual* `camera.x/y` subtraction (worldToScreen)
// before hitting canvas draw calls. Here, isoProject() output is used
// directly as a Phaser GameObject's x/y -- i.e. "iso-space" IS this scene's
// coordinate space -- and Phaser's own Camera (scrollX/scrollY, startFollow)
// plays the role `camera.x/y` used to play. That's the one deliberate
// re-plumbing; the math itself is untouched.

export const TILE = 32; // world units per tile, matches the original
export const ISO_TW = 64, ISO_TH = 32; // on-screen diamond footprint of one TILE

// ===========================================================================
// ROUND 285 (item 18) -- ELEVATION.
//
//   "Start adding elevation to maps, so gliding lets players jump off ledges."
//
// Every gameplay system stays in flat world coordinates (the header above),
// so height is a DRAWING fact: a world point standing on raised ground is
// drawn `height * ELEV_PX` screen pixels higher. Putting that here, in the
// one function everything is drawn through, is what lets a rock, a monster,
// a dropped gem, a spark and the player all stand on a plateau without
// forty systems each learning about height. The scene registers the lookup
// (`setElevationSource`); with none registered this is the flat projection,
// exactly as before.
//
// `isoUnproject` is the inverse, and on raised ground the inverse needs the
// height it is trying to find -- so it solves for it in two fixed-point
// steps, which is exact on a plateau top and within a pixel on a ramp.
// ===========================================================================
export const ELEV_PX = 40;   // screen pixels per level of height
let _elevAt = null;
export function setElevationSource(fn) { _elevAt = typeof fn === 'function' ? fn : null; }
export function elevationAt(wx, wy) { return _elevAt ? (_elevAt(wx, wy) || 0) : 0; }

export function isoProject(wx, wy) {
  const gx = wx / TILE, gy = wy / TILE;
  const y = (gx + gy) * (ISO_TH / 2);
  if (_elevAt) {
    const h = _elevAt(wx, wy);
    if (h) return { x: (gx - gy) * (ISO_TW / 2), y: y - h * ELEV_PX };
  }
  return { x: (gx - gy) * (ISO_TW / 2), y };
}

/** The flat projection, ignoring height -- for the few draws that are about
 *  the ground plane itself (a cliff's foot). */
export function isoProjectFlat(wx, wy) {
  const gx = wx / TILE, gy = wy / TILE;
  return { x: (gx - gy) * (ISO_TW / 2), y: (gx + gy) * (ISO_TH / 2) };
}

function _unprojectFlat(ix, iy) {
  const gx = ix / ISO_TW + iy / ISO_TH;
  const gy = iy / ISO_TH - ix / ISO_TW;
  return { x: gx * TILE, y: gy * TILE };
}

export const ELEV_MAX_LEVEL = 3;
export function isoUnproject(ix, iy) {
  if (_elevAt) {
    // The highest surface under the pixel wins, because it is the one drawn
    // in front: try each whole level, top down, and take the first whose
    // ground really is that high.
    for (let L = ELEV_MAX_LEVEL; L >= 1; L--) {
      const w2 = _unprojectFlat(ix, iy + L * ELEV_PX);
      if (_elevAt(w2.x, w2.y) >= L - 0.01) return w2;
    }
    // A ramp, or flat ground: two fixed-point steps from the flat answer.
    let w = _unprojectFlat(ix, iy);
    for (let i = 0; i < 2; i++) {
      const h = _elevAt(w.x, w.y);
      if (!h) break;
      w = _unprojectFlat(ix, iy + h * ELEV_PX);
    }
    return w;
  }
  return _unprojectFlat(ix, iy);
}

// Painter's-algorithm depth key: anything "further along +X and +Y" (deeper
// into the screen under this projection) must draw on top. This is the same
// `d = o.x + o.y` sort key the original render() used across every obstacle/
// monster/NPC/pickup -- ported here as a depth value fed to setDepth().
export function isoDepth(wx, wy) {
  return wx + wy;
}

export const PLAYER_DIR_ORDER = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

// ===========================================================================
// ROUND 187 -- MAP NORTH IS NOT OBJECT NORTH. THE RULE, WRITTEN DOWN.
//
// THE USER, after finding every fence on the aristocratic estates turned one
// eighth of a turn wrong:
//
//   "Due to the difference between true north and isometric north all objects
//    are partially offset. This should have been a known rule long ago, please
//    log that due to this that on the map north is for an object northeast, on
//    the map east is for an object southeast, map west is object northwest,
//    and map south is object southwest."
//
//   map north  ->  object NORTHEAST
//   map east   ->  object SOUTHEAST
//   map south  ->  object SOUTHWEST
//   map west   ->  object NORTHWEST
//
// AND IT FALLS STRAIGHT OUT OF isoProject ABOVE, which is why it should have
// been written down years of rounds ago instead of rediscovered per system.
// A step of one tile due east in world space is (+TILE, 0), and
// isoProject turns that into (+ISO_TW/2, +ISO_TH/2) -- down AND right on
// screen, which is screen southeast. The four world axes land on the four
// screen diagonals, every time:
//
//   world +x (map east)   ->  screen (+32, +16)  ->  southeast
//   world +y (map south)  ->  screen (-32, +16)  ->  southwest
//   world -x (map west)   ->  screen (-32, -16)  ->  northwest
//   world -y (map north)  ->  screen (+32, -16)  ->  northeast
//
// WHAT THIS IS FOR. Any time a system knows which way something faces or runs
// in MAP terms -- a wall along the north border, a fence down the east side of
// a property, a building fronting the south road -- it has to come through
// here before it becomes an art facing. town.js's `findBuildingFacing` already
// arrives at the same four by walking the world axes and snapping, and its own
// note observes that a screen cardinal "simply never gets selected by this
// particular search". That note describes the consequence; this is the cause,
// and now it has a name both can use.
//
// THE COST OF NOT HAVING HAD IT: round 187 laid 775 estate fence posts using
// the city wall's broadside/end-on pairing instead, and every one of them was
// a facing out. The wall's pairing is not wrong for the wall -- a wall course
// is chosen so its ENDS line up along the run (see town.js, round 80) -- but
// that is a question about the art, and this is a question about the compass.
// Two different questions that had been answered by one table.
export const MAP_DIR_TO_FACING = {
  north: 'northeast',
  east: 'southeast',
  south: 'southwest',
  west: 'northwest',
};

/** The art facing for something described in MAP directions. */
export function facingForMapDir(mapDir) {
  return MAP_DIR_TO_FACING[mapDir] || 'southeast';
}

/** The art facing for a world-axis step, which is the same rule stated as a vector. */
export function facingForWorldStep(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? MAP_DIR_TO_FACING.east : MAP_DIR_TO_FACING.west;
  return dy >= 0 ? MAP_DIR_TO_FACING.south : MAP_DIR_TO_FACING.north;
}

// Re-projects a world-space movement vector through the same iso weighting
// before snapping to one of 8 screen-facing octants. This is the pattern
// every directional sprite in the original used (facingFromMove) -- and the
// pattern the building-facing bug (Phase 3 fix) skipped.
export function facingFromMove(mx, my) {
  if (mx === 0 && my === 0) return null;
  const sdx = (mx - my) * (ISO_TW / 2), sdy = (mx + my) * (ISO_TH / 2);
  let idx = Math.round(Math.atan2(sdy, sdx) / (Math.PI / 4));
  idx = ((idx % 8) + 8) % 8;
  return PLAYER_DIR_ORDER[idx];
}

// ROUND 50 -- the inverse of facingFromMove: given one of the eight screen
// octants, the WORLD direction that projects onto it.
//
// Needed because a building knows which way it faces long before anything
// asks where its front door is. Deriving the doorstep from the road search
// instead was what put every door in Cadence on the wrong wall (see
// isCarriagewayTile in town.js) -- and even with that search fixed, a
// building whose facing was chosen by hand (the temples face northwest
// because the user said so, not because a road is there) should hang its
// door off the face it actually presents.
//
// Unit vector in world space, so callers scale it by their own setback.
export function moveFromFacing(facing) {
  const idx = PLAYER_DIR_ORDER.indexOf(facing);
  if (idx < 0) return null;
  const th = (idx * Math.PI) / 4;
  const sdx = Math.cos(th), sdy = Math.sin(th);
  // Undo isoProject: sdx = (mx - my) * ISO_TW/2, sdy = (mx + my) * ISO_TH/2.
  const a = sdx / (ISO_TW / 2), b = sdy / (ISO_TH / 2);
  const mx = (a + b) / 2, my = (b - a) / 2;
  const len = Math.hypot(mx, my) || 1;
  return { dx: mx / len, dy: my / len };
}

// Deterministic per-tile variant hash, ported byte-for-byte from
// tileVariantHash() in the original -- picks which of the 16 grass/path/
// street tile variants a given (tx,ty) grid cell uses, stable across frames
// and reloads (no per-tile storage needed, just re-derived from position).
export function tileVariantHash(tx, ty) {
  let h = (tx * 928371 + ty * 123457) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * ROUND 163 -- SMOOTH NOISE, because a per-tile hash is not a landscape.
 *
 * `tileVariantHash` is the right tool for "which of the six grass frames does
 * this tile draw" -- every tile independent, no structure at any scale. It is
 * the WRONG tool for deciding where a marsh is, and Bratugal's bog was built
 * with it: measured, the swamp band came out 70% grass, 19% bog and 8% water
 * with every tile rolled on its own, so it read as coloured static rather than
 * as pools and reed beds. Two consequences, and the second is why this exists.
 *
 *   1. You cannot see it. There is no marsh to look at, only speckle.
 *   2. A rule that asks "am I standing in bog" flickers on and off with every
 *      step, because the answer changes tile to tile. Round 77 met this with
 *      the water-walking bonus and wrote it down -- "which in play reads as
 *      the ability flickering as you walk" -- and patched around it by
 *      counting the accent tiles as footing too. A 50% movement slow cannot be
 *      patched around that way: it has to be somewhere you are, not something
 *      you strobe through.
 *
 * Value noise: hash the corners of a coarse grid, interpolate between them
 * with a smoothstep. Deterministic on (tx, ty) exactly as the hash is, so a
 * marsh is the same marsh every load, and built ON the same hash so there is
 * one source of randomness in the terrain rather than two.
 *
 * `cell` is the feature size in tiles -- how far apart the pools are.
 */
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }

export function valueNoise2D(tx, ty, cell, seed = 0) {
  const gx = Math.floor(tx / cell), gy = Math.floor(ty / cell);
  const fx = smooth(tx / cell - gx), fy = smooth(ty / cell - gy);
  const c = (x, y) => (tileVariantHash(x * 2654435761 + seed, y * 40503 + seed) >>> 8) / 16777216;
  return lerp(
    lerp(c(gx, gy), c(gx + 1, gy), fx),
    lerp(c(gx, gy + 1), c(gx + 1, gy + 1), fx),
    fy);
}

/**
 * Two octaves of it, which is the least that stops a field of even blobs
 * reading as wallpaper: a big one that decides where the marsh is and a small
 * one that roughens its edges.
 */
export function terrainNoise(tx, ty, cell, seed = 0) {
  return valueNoise2D(tx, ty, cell, seed) * 0.68
    + valueNoise2D(tx, ty, Math.max(2, Math.round(cell / 2.7)), seed + 911) * 0.32;
}
