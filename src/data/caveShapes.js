// ============================================================================
// ROUND 88 -- CAVES THAT ARE SHAPED LIKE CAVES.
//
// The user's ask, verbatim:
//
//   "Like the sewers in Cadence the caves throughout the regions should have
//    interesting and varied room shapes."
//
// WHAT WAS THERE. Every cave in the game -- all 36 pooled den rooms, mine
// workings, magma vents, barrows, cult chambers, the grove under the barn --
// was the SAME 13x11 RECTANGLE. `dens.js` built the pool in a plain loop with
// identical `w`/`h` and a door gap on the south wall, and the only thing that
// varied between a mine and a barrow was how many boulders got scattered into
// it. There was no cave generator, and no cave had ever had a shape.
//
// WHY THE SEWER IS THE RIGHT MODEL. `sewer.js` does not draw walls: every '#'
// in its map is a TILE_VOID tile, and the ground renderer already draws void
// as nothing, pooled by viewport, for zero sprites. A 50x36 maze therefore
// costs less than a 13x11 room with a wall ring around it. `_stampInteriorBand`
// has called `room.tileAt(tx, ty)` since round 82 and nothing but the sewer has
// ever used the hook. So the whole feature is: give a den a `tileAt`.
//
// FIVE FAMILIES, AND THEY ARE ACTUALLY DIFFERENT SHAPES rather than one shape
// with different numbers:
//
//   cavern    one big irregular room, smoothed -- what "a cave" means by default
//   chambers  two to four rounded rooms joined by short necks
//   gallery   a long winding passage with alcoves off it
//   ring      a loop around a central mass of rock
//   fissure   narrow branching cracks with widenings where they meet
//
// EVERY LAYOUT IS SEEDED ON THE SITE and generated once, so a cave's inside is
// the same cave every time you walk into it -- the same rule `houseLayoutFor`
// already applies to houses, and for the same reason: a place that rearranges
// itself between visits is not a place.
//
// THE PROMISE THIS FILE HAS TO KEEP is the one round 83's sewer props taught:
// a shape is worthless if it seals something off. `caveFaults()` floods the
// floor from the doorway and asserts every walkable tile is reachable -- not
// as a sample, for all five families across every seed the pool can produce.
// A cave with an unreachable pocket is a player walking a wall looking for a
// way in that does not exist.
// ============================================================================

// NO IMPORT FROM interiors.js, DELIBERATELY. interiors.js imports dens.js and
// dens.js is what carries these layouts, so pulling TILE_VOID in here closes a
// cycle -- `Cannot access 'DEN_ROOMS' before initialization`, at module load,
// before anything has a chance to be wrong in an interesting way. The void id
// is passed in by the one caller that owns it instead (see interiors.js, where
// the sewer's own tileAt already lives beside it).

/** A den's grid. Bigger than the old 13x11 because a shape needs room to be
 *  one -- a "winding passage" in eleven tiles is a corridor. Still small
 *  enough that thirty-six of them lay comfortably into the interior band, and
 *  walls cost nothing now, which is what pays for the extra size. */
export const CAVE_W = 21, CAVE_H = 17;

/** Where the way out is. The door sits on the south edge, as every den's has,
 *  so `roomEntryPoint` and the doorway hanging in WorldScene are unchanged. */
export const CAVE_DOOR_X = Math.floor(CAVE_W / 2) - 1;
export const CAVE_DOOR_SPAN = 2;

export const CAVE_FAMILIES = ['cavern', 'chambers', 'gallery', 'ring', 'fissure'];

/** Which family a den gets. Spread by index rather than rolled, so the pool
 *  is guaranteed to contain all five rather than merely likely to -- with 36
 *  rooms and a 1-in-5 roll, the chance of some family missing entirely is
 *  small but not zero, and "small but not zero" over a shipped build is
 *  "eventually, for somebody". */
/** The den kinds that are actually CAVES. The pool is shared by everything a
 *  landmark can lead into, and two of those are buildings: `farmFields` is a
 *  barn and `shrine` is a one-room cell. Both have walls, doors and a
 *  rectangular floor because that is what they are, and giving them a cave's
 *  shape produced exactly what you would expect -- The Long Barn as a jagged
 *  hole in the dark with no walls at all, seen in the first screenshot of
 *  this. The ask was that CAVES vary; a barn is not one. */
export const CAVE_SITE_KINDS = ['mineCave', 'magmaCave', 'barrow', 'cultChamber', 'hiddenLair'];

/** Which family a den gets, or `null` for the den kinds that are buildings and
 *  keep their rectangle and their wall panels.
 *
 *  Spread by index rather than rolled, so the pool is guaranteed to contain
 *  every family rather than merely likely to -- with a 1-in-5 roll the chance
 *  of one missing entirely is small but not zero, and over a shipped build
 *  "small but not zero" is "eventually, for somebody". */
export function caveFamilyFor(slot, siteKind) {
  if (siteKind && !CAVE_SITE_KINDS.includes(siteKind)) return null;
  // A cult chamber is a room, not a warren: the ritual needs a floor to stand
  // on. A mine is workings -- galleries and fissures are what digging leaves.
  if (siteKind === 'cultChamber') return 'chambers';
  if (siteKind === 'mineCave') return (slot % 2) ? 'gallery' : 'fissure';
  return CAVE_FAMILIES[slot % CAVE_FAMILIES.length];
}

// ---------------------------------------------------------------------------
// A tiny deterministic RNG, so a layout is a pure function of its seed string.
// Same shape as seededRng elsewhere in the project; kept local so this module
// has no dependency that could pull the scene in.
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = hash(seed) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const idx = (x, y) => y * CAVE_W + x;
const inBounds = (x, y) => x >= 1 && y >= 1 && x < CAVE_W - 1 && y < CAVE_H - 1;

/** Carve a filled disc. The primitive every family is built out of, so a cave
 *  is made of round things and never of rectangles -- which is most of what
 *  makes it read as rock rather than as masonry. */
function disc(g, cx, cy, r) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (!inBounds(x, y)) continue;
      const dx = x - cx, dy = (y - cy) * 1.25;   // squashed: the view is isometric
      if (dx * dx + dy * dy <= r2) g[idx(x, y)] = 1;
    }
  }
}

/** A thick line of discs, which is how every passage in here is dug. */
function tunnel(g, x0, y0, x1, y1, r) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r);
  }
}

/** One pass of cellular smoothing: rock with few rock neighbours becomes
 *  floor, floor with many becomes rock. Turns a pile of discs into something
 *  with a coastline instead of a set of visible circles. */
function smooth(g) {
  const out = g.slice();
  for (let y = 1; y < CAVE_H - 1; y++) {
    for (let x = 1; x < CAVE_W - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (!g[idx(x + dx, y + dy)]) n++;
      }
      out[idx(x, y)] = n >= 5 ? 0 : (n <= 3 ? 1 : g[idx(x, y)]);
    }
  }
  return out;
}

/** Every floor tile reachable from the door, as a set of indices. The one
 *  question that decides whether a layout is shippable. */
export function caveReachable(grid) {
  const seen = new Uint8Array(CAVE_W * CAVE_H);
  const start = idx(CAVE_DOOR_X, CAVE_H - 2);
  if (!grid[start]) return seen;
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const k = stack.pop();
    const x = k % CAVE_W, y = (k - x) / CAVE_W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= CAVE_W || ny >= CAVE_H) continue;
      const nk = idx(nx, ny);
      if (seen[nk] || !grid[nk]) continue;
      seen[nk] = 1; stack.push(nk);
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// THE FIVE FAMILIES
// ---------------------------------------------------------------------------
function digCavern(g, r) {
  const cx = CAVE_W / 2, cy = CAVE_H / 2;
  disc(g, cx, cy, 5.5 + r() * 1.5);
  // Four lobes off the middle, so the outline is irregular rather than round.
  for (let i = 0; i < 4 + Math.floor(r() * 3); i++) {
    const a = r() * Math.PI * 2;
    disc(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 3.4, 2.4 + r() * 1.8);
  }
}

function digChambers(g, r) {
  const n = 2 + Math.floor(r() * 3);
  const pts = [];
  // THE FIRST CHAMBER SITS OVER THE DOOR. Without it every chamber could roll
  // far from the entrance column, and on one seed in thirty-six all of them
  // were small enough to be eaten by the smoothing pass -- leaving the
  // connector corridor and nothing to connect, a 28-tile hallway to a dead
  // end. Anchoring one room to the way in makes "you walk into a chamber"
  // structural instead of likely.
  pts.push([CAVE_DOOR_X + 0.5, CAVE_H - 5]);
  disc(g, CAVE_DOOR_X + 0.5, CAVE_H - 5, 3.0 + r() * 1.2);
  for (let i = 1; i < n; i++) {
    const x = 4 + r() * (CAVE_W - 8);
    const y = 3 + r() * (CAVE_H - 7);
    pts.push([x, y]);
    // Minimum 3.0, not 2.6: a 2.6 disc is thin enough that two smoothing
    // passes can remove it entirely, which is a room that silently is not there.
    disc(g, x, y, 3.0 + r() * 1.4);
  }
  // Necks between consecutive chambers -- narrow, so they read as doorways in
  // the rock rather than as the rooms having merged.
  for (let i = 1; i < pts.length; i++) tunnel(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 1.1);
  return pts;
}

function digGallery(g, r) {
  // A passage that wanders from the door to the far end, with alcoves.
  let x = CAVE_DOOR_X, y = CAVE_H - 3;
  const pts = [[x, y]];
  const legs = 4 + Math.floor(r() * 3);
  for (let i = 0; i < legs; i++) {
    x = 3 + r() * (CAVE_W - 6);
    y = Math.max(2, CAVE_H - 3 - ((i + 1) / legs) * (CAVE_H - 6));
    pts.push([x, y]);
  }
  for (let i = 1; i < pts.length; i++) tunnel(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 1.5 + r() * 0.5);
  for (const [px, py] of pts) if (r() < 0.6) disc(g, px, py, 2.2 + r());
  return pts;
}

function digRing(g, r) {
  const cx = CAVE_W / 2, cy = CAVE_H / 2;
  const rad = 5 + r() * 1.2;
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
    tunnel(g, cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad * 0.62,
      cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad * 0.62, 1.5);
  }
  // The ring has to be joined to the door or the room is a moat.
  tunnel(g, CAVE_DOOR_X, CAVE_H - 2, cx, cy + rad * 0.62, 1.4);
}

function digFissure(g, r) {
  // Branching cracks. Each branch is thin; where two meet, a widening.
  const walk = (x, y, dir, depth) => {
    if (depth <= 0) return;
    const len = 3 + r() * 4;
    const nx = x + Math.cos(dir) * len, ny = y + Math.sin(dir) * len * 0.7;
    tunnel(g, x, y, nx, ny, 1.25 + r() * 0.4);
    if (r() < 0.55) disc(g, nx, ny, 1.9 + r() * 1.1);
    walk(nx, ny, dir + (r() - 0.5) * 1.5, depth - 1);
    if (r() < 0.5) walk(nx, ny, dir + (r() - 0.5) * 2.4, depth - 1);
  };
  // Three cracks off the entrance rather than one, fanning up and out: one
  // branch from the door is a corridor with a fork, not a fissure.
  walk(CAVE_DOOR_X, CAVE_H - 3, -Math.PI / 2, 5);
  walk(CAVE_DOOR_X, CAVE_H - 3, -Math.PI / 2 - 0.8, 4);
  walk(CAVE_DOOR_X, CAVE_H - 3, -Math.PI / 2 + 0.8, 4);
}

/**
 * Build one cave's grid. 1 = floor, 0 = rock.
 *
 * The door column is always carved last and always connected, and then
 * anything the shape left stranded is DELETED rather than tunnelled to. That
 * ordering is deliberate: joining an island up with a corridor produces the
 * one thing this file exists to avoid, a passage that goes nowhere and looks
 * like it should. Rock is a better answer than a lie.
 */
export function buildCaveGrid(seedKey, family) {
  const r = rng(seedKey);
  const g = new Uint8Array(CAVE_W * CAVE_H);
  switch (family) {
    case 'chambers': digChambers(g, r); break;
    case 'gallery': digGallery(g, r); break;
    case 'ring': digRing(g, r); break;
    case 'fissure': digFissure(g, r); break;
    default: digCavern(g, r); break;
  }
  // FISSURE IS NOT SMOOTHED, and that is the whole point of it. The smoothing
  // rule turns rock with three or fewer rock neighbours into floor and floor
  // with five or more into rock -- which is exactly what a one-tile-wide crack
  // has, so the first pass ate every branch and left a five-tile stub. A
  // narrow thing cannot survive a filter whose job is to remove narrow things.
  let out = family === 'fissure' ? g : smooth(g);
  // Cavern is smoothed twice -- it wants a soft coastline. Chambers is not:
  // the second pass rounds the narrow necks between rooms away, and the necks
  // are what make them separate rooms rather than one blob.
  if (family === 'cavern') out = smooth(out);
  // The tiles just INSIDE the doorway, always. `roomEntryPoint` puts the
  // player one tile in from the south gap, so that tile must be floor whatever
  // the shape did. The border row itself stays solid: the door is hung
  // externally by `_hangDenDoorway` and the room's own edge is rock, the same
  // as every other interior in the band.
  for (let dx = 0; dx < CAVE_DOOR_SPAN; dx++) {
    for (let dy = 2; dy <= 4; dy++) {
      const x = CAVE_DOOR_X + dx, y = CAVE_H - dy;
      if (x > 0 && x < CAVE_W - 1 && y > 0) out[idx(x, y)] = 1;
    }
  }
  // Join the entrance to the body of the cave: walk up the middle until
  // something already carved is met, so the door is never a closet.
  // Start ABOVE the tiles the block just carved. Starting at CAVE_H-4 meant
  // the first thing this loop looked at was floor it had written itself, so it
  // broke on its first iteration and never connected anything -- which showed
  // up as `chambers` layouts of exactly six tiles: the entrance stub, with
  // every actual chamber pruned as unreachable.
  for (let y = CAVE_H - 5; y >= 2; y--) {
    if (out[idx(CAVE_DOOR_X, y)]) break;
    out[idx(CAVE_DOOR_X, y)] = 1;
    out[idx(CAVE_DOOR_X + 1, y)] = 1;
  }
  // Anything still unreachable becomes rock. See the note above.
  const seen = caveReachable(out);
  for (let i = 0; i < out.length; i++) if (out[i] && !seen[i]) out[i] = 0;
  return out;
}

/** The layout cache. A cave is generated once per seed and kept, so walking
 *  in and out does not rebuild it and cannot produce a different room. */
const CACHE = new Map();
export function caveLayout(seedKey, family) {
  const k = `${family}|${seedKey}`;
  let v = CACHE.get(k);
  if (!v) { v = buildCaveGrid(seedKey, family); CACHE.set(k, v); }
  return v;
}

/** How many walkable tiles a layout has. Used by the fault check and by the
 *  dressing pass, which needs to know how much room it has to fill. */
export function caveFloorCount(grid) {
  let n = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) n++;
  return n;
}

/** Every walkable tile, as {tx, ty}. The dressing and spawn passes place
 *  things by picking from this rather than by rolling coordinates and hoping
 *  -- which is what the old rectangular room let them get away with. */
export function caveFloorTiles(grid) {
  const out = [];
  for (let y = 0; y < CAVE_H; y++) for (let x = 0; x < CAVE_W; x++) if (grid[idx(x, y)]) out.push({ tx: x, ty: y });
  return out;
}

/**
 * The tile id for a cave cell, for `room.tileAt`. Rock is TILE_VOID, which the
 * ground renderer draws as unlit nothing -- so a cave's walls cost no sprites
 * at all, the same trick the sewer uses.
 *
 * FLOOR RETURNS `null` ON PURPOSE. `_stampInteriorBand` treats null as "this
 * room has nothing special to say about this tile" and falls through to
 * `INTERIOR_FLOOR_TILE[room.floor]`. That lets this module decide the SHAPE
 * without knowing anything about floor ids -- which matters, because the
 * id table lives in WorldScene and importing it here would be a data module
 * reaching into the scene. It also means an Elehyd cave stays ice and every
 * other cave stays forge with no work: the room already knows its own floor,
 * and this never has to be told.
 */
export function caveTileAt(grid, tx, ty, voidTile) {
  if (tx < 0 || ty < 0 || tx >= CAVE_W || ty >= CAVE_H) return voidTile;
  return grid[idx(tx, ty)] ? null : voidTile;
}

/**
 * The fault check. Runs every family over every slot the pool can hand out
 * and asserts the things a shaped cave has to be true about, because none of
 * them are visible from reading a generator:
 *
 *   - the entrance tile is floor, so you can get in
 *   - every floor tile is reachable from it, so nothing is sealed
 *   - there is enough floor to be a room and not so much it is the old rect
 *   - the outer border is solid, so nothing leaks into the void margin
 *   - all five families actually produce distinguishable shapes
 */
export function caveFaults() {
  const out = [];
  const seenFam = new Set();
  const areas = {};
  for (let slot = 0; slot < 36; slot++) {
    for (const fam of CAVE_FAMILIES) {
      const grid = caveLayout(`den_${slot}`, fam);
      seenFam.add(fam);
      const total = caveFloorCount(grid);
      const seen = caveReachable(grid);
      let reach = 0;
      for (let i = 0; i < seen.length; i++) if (seen[i]) reach++;
      if (!grid[idx(CAVE_DOOR_X, CAVE_H - 2)]) out.push(`${fam} den_${slot}: the doorway is solid rock`);
      if (reach !== total) out.push(`${fam} den_${slot}: ${total - reach} floor tiles are sealed off`);
      if (total < 40) out.push(`${fam} den_${slot}: only ${total} floor tiles -- not a room`);
      if (total > CAVE_W * CAVE_H * 0.72) out.push(`${fam} den_${slot}: ${total} tiles is the old rectangle again`);
      for (let x = 0; x < CAVE_W; x++) {
        if (grid[idx(x, 0)]) out.push(`${fam} den_${slot}: floor on the north border`);
        if (grid[idx(x, CAVE_H - 1)]) out.push(`${fam} den_${slot}: floor on the south border`);
      }
      for (let y = 0; y < CAVE_H; y++) {
        if (grid[idx(0, y)]) out.push(`${fam} den_${slot}: floor on the west border`);
        if (grid[idx(CAVE_W - 1, y)]) out.push(`${fam} den_${slot}: floor on the east border`);
      }
      (areas[fam] = areas[fam] || []).push(total);
    }
  }
  for (const f of CAVE_FAMILIES) if (!seenFam.has(f)) out.push(`family ${f} is never produced`);
  // VARIETY, ASSERTED. The point of this file is that caves differ; a
  // generator that returned the same blob five ways would pass every check
  // above. Two families whose floor areas never differ by more than a couple
  // of tiles across 36 seeds are the same family with two names.
  const means = {};
  for (const f of CAVE_FAMILIES) means[f] = areas[f].reduce((a, b) => a + b, 0) / areas[f].length;
  const vals = Object.values(means);
  if (Math.max(...vals) - Math.min(...vals) < 8) {
    out.push(`the five families all come out the same size (${vals.map(v => v.toFixed(0)).join('/')})`);
  }
  return out;
}

/** A one-line census, for the notes and for a suite to print. */
export function caveCensus() {
  const out = {};
  for (const fam of CAVE_FAMILIES) {
    let total = 0;
    for (let slot = 0; slot < 36; slot++) total += caveFloorCount(caveLayout(`den_${slot}`, fam));
    out[fam] = Math.round(total / 36);
  }
  return out;
}
