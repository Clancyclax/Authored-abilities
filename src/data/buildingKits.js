// ============================================================================
// ROUND 200 -- THE BUILDING KITS.
//
// The user: "Additionally new objects for interior structures. A variety of
// walls for rooms or cave backgrounds, ramps, arches, stairs, and more."
//
// Six sheets, twenty pieces each, packed by tools/extract_round200_kits.py.
// Three things about them were MEASURED rather than assumed, and all three
// are what let this file be as small as it is:
//
// ONE KIT, SIX MATERIALS. The six alpha masks are identical to the pixel --
// 112,247 opaque pixels in the same places on all six. So a piece index means
// the same shape in every material, and KIT_PIECES is one table rather than
// six. The extractor asserts it on every run.
//
// THE CELLS SHARE ONE ORIGIN. Pasting a floor, two walls and a pillar on top
// of each other at their raw cell offsets composes a room corner, correct to
// the pixel, with nothing nudged. That is the property that matters most: no
// piece needs its own anchor measured, because every piece is already drawn
// relative to the same tile. KIT_FOOT_X/Y below is that one anchor, read off
// the floor tile's own diamond, and it hangs all twenty.
//
// THE KIT'S TILE IS ONE AND A HALF OF OURS. Its floor diamond is 96x48 and
// ISO_TW/ISO_TH are 64 and 32, so KIT_SCALE is exactly two thirds -- a ratio
// that falls out of the art rather than a number picked to look right.
//
// ---------------------------------------------------------------------------
// WHICH WAY A PIECE FACES, AND HOW THAT WAS SETTLED.
//
// Round 187 wrote the rule down: map north is object NORTHEAST, because a
// world step of (+TILE, 0) projects to screen (+32, +16). A wall hugging the
// tile's upper-right screen edge is therefore a wall on the tile's NORTH side.
//
// That is the reasoning; it was checked rather than trusted. Piece 1 laid on
// four tiles running world-east composes one seamless wall with the floor on
// its south side, and piece 1 laid running world-south does not. Piece 2 is
// its perpendicular, piece 3 the pillar that closes the corner between them,
// and an 8+10 pair drops into a run of piece 1 as a flush doorway. Every
// `dir` below is that test, not that paragraph.
//
// SO A KIT WALL IS DECLARED BY MAP DIRECTION -- 'north' or 'west' -- and
// `kitWallFor(mapDir)` is the only thing a caller needs. There is no south or
// east piece and there does not need to be one: the south wall of a room is
// the north wall of the tile below it, which is the same rule the game's own
// wall panels have followed since round 22.
// ============================================================================

/** The source cell. The sheets' own grid is fractional (619/4, 979/5) and the
 *  extractor pads to 620x980 rather than resampling -- see its header for why
 *  a one-pixel drift inside the art is not a fault worth resampling to fix. */
export const KIT_CELL_W = 155, KIT_CELL_H = 196;
export const KIT_COLS = 4, KIT_ROWS = 5;
export const KIT_COUNT = KIT_COLS * KIT_ROWS;

/** The tile centre inside a cell, as a fraction -- the anchor every piece
 *  hangs from. Measured on BOTH floor pieces (the widest row of a flat iso
 *  diamond is its centre line): (76.5, 151) and (77.5, 152). They disagree by
 *  the one pixel the art itself is drawn off by; this is the mean. */
export const KIT_FOOT_X = 77.0 / KIT_CELL_W;   // 0.4968
export const KIT_FOOT_Y = 151.5 / KIT_CELL_H;  // 0.7730

/** 64/96. A kit floor laid on a game tile covers it exactly. */
export const KIT_SCALE = 2 / 3;

// The six materials. `slug` is the file (public/assets/kit_<slug>.png) and the
// texture key; `label` is what a player would be shown. Identified by measured
// colour, because every upload was called `image.png` -- the two dark sheets
// are separated by their most saturated pixels, which are (242,153,42) on the
// lava and a dull olive on the dark stone.
export const KIT_MATERIALS = [
  { slug: 'log',        label: 'Log',         cold: false, warmth: 'warm' },
  { slug: 'lava',       label: 'Lava Rock',   cold: false, warmth: 'hot' },
  { slug: 'ice',        label: 'Ice',         cold: true,  warmth: 'cold' },
  { slug: 'darkstone',  label: 'Dark Stone',  cold: false, warmth: 'neutral' },
  { slug: 'greenbrick', label: 'Green Brick', cold: false, warmth: 'neutral' },
  { slug: 'greybrick',  label: 'Grey Brick',  cold: false, warmth: 'neutral' },
];

export const KIT_SLUGS = KIT_MATERIALS.map(m => m.slug);
export const KIT_TEX = Object.fromEntries(KIT_MATERIALS.map(m => [m.slug, `kit_${m.slug}`]));

// ---------------------------------------------------------------------------
// THE TWENTY PIECES.
//
//   role    what it is, for the placer that chooses pieces
//   dir     which of the tile's edges it stands on, in MAP terms, or null
//   solid   does it stop the player
//   radius  the collider, in world units, centred on the tile. Interior
//           collision in this game is discs (`interiorSolids`), so a wall is a
//           disc covering the half-tile it stands on rather than a box -- the
//           same approximation WALL_RADIUS has made since round 22.
//   flat    drawn as a floor decal: depth-demoted, walked over
//   pair    the other half of a two-piece arch, by index
// ---------------------------------------------------------------------------
export const KIT_PIECES = [
  { idx: 0,  key: 'floorPlank',    role: 'floor',  dir: null,    solid: false, radius: 0,  flat: true,
    label: 'plank floor' },
  { idx: 1,  key: 'wallNorth',     role: 'wall',   dir: 'north', solid: true,  radius: 16, flat: false,
    label: 'wall' },
  { idx: 2,  key: 'wallWest',      role: 'wall',   dir: 'west',  solid: true,  radius: 16, flat: false,
    label: 'wall' },
  { idx: 3,  key: 'pillarNorth',   role: 'pillar', dir: 'north', solid: true,  radius: 10, flat: false,
    label: 'pillar' },
  { idx: 4,  key: 'postNorth',     role: 'post',   dir: 'north', solid: true,  radius: 12, flat: false,
    label: 'buttress' },
  { idx: 5,  key: 'postWest',      role: 'post',   dir: 'west',  solid: true,  radius: 12, flat: false,
    label: 'buttress' },
  { idx: 6,  key: 'pillarWest',    role: 'pillar', dir: 'west',  solid: true,  radius: 10, flat: false,
    label: 'pillar' },
  { idx: 7,  key: 'archNorthA',    role: 'arch',   dir: 'north', solid: true,  radius: 10, flat: false,
    pair: 9,  label: 'arch' },
  { idx: 8,  key: 'archNorthAFull', role: 'arch',  dir: 'north', solid: true,  radius: 10, flat: false,
    pair: 10, label: 'arch' },
  { idx: 9,  key: 'archNorthB',    role: 'arch',   dir: 'north', solid: true,  radius: 10, flat: false,
    pair: 7,  label: 'arch' },
  { idx: 10, key: 'archNorthBFull', role: 'arch',  dir: 'north', solid: true,  radius: 10, flat: false,
    pair: 8,  label: 'arch' },
  { idx: 11, key: 'stairLow',      role: 'stair',  dir: null,    solid: false, radius: 0,  flat: false,
    label: 'low steps' },
  { idx: 12, key: 'stairFull',     role: 'stair',  dir: null,    solid: false, radius: 0,  flat: false,
    label: 'stair' },
  { idx: 13, key: 'rubbleSlab',    role: 'rubble', dir: null,    solid: false, radius: 0,  flat: false,
    label: 'broken ground' },
  { idx: 14, key: 'rubbleBlock',   role: 'rubble', dir: null,    solid: true,  radius: 15, flat: false,
    label: 'rock mass' },
  { idx: 15, key: 'floorSlab',     role: 'floor',  dir: null,    solid: false, radius: 0,  flat: true,
    label: 'flagstone floor' },
  { idx: 16, key: 'archWestA',     role: 'arch',   dir: 'west',  solid: true,  radius: 10, flat: false,
    pair: 18, label: 'arch' },
  { idx: 17, key: 'archWestAFull', role: 'arch',   dir: 'west',  solid: true,  radius: 10, flat: false,
    pair: 19, label: 'arch' },
  { idx: 18, key: 'archWestB',     role: 'arch',   dir: 'west',  solid: true,  radius: 10, flat: false,
    pair: 16, label: 'arch' },
  { idx: 19, key: 'archWestBFull', role: 'arch',   dir: 'west',  solid: true,  radius: 10, flat: false,
    pair: 17, label: 'arch' },
];

export const KIT_PIECE_BY_KEY = Object.fromEntries(KIT_PIECES.map(p => [p.key, p]));

/** The wall piece for a map direction. See the header: there is no south or
 *  east piece, because a room's south wall is the tile below it wearing a
 *  north wall. Callers that think in map terms should come through here
 *  rather than naming an index, which is round 187's whole lesson. */
export function kitWallFor(mapDir) {
  return (mapDir === 'west' || mapDir === 'east') ? KIT_PIECE_BY_KEY.wallWest
    : KIT_PIECE_BY_KEY.wallNorth;
}

/** The two halves of a doorway in a wall on `mapDir`, full-height legs. Both
 *  go on the SAME tile -- an arch is one tile wide, which the composition
 *  test showed and is why `pair` is an index rather than an offset. */
export function kitArchFor(mapDir) {
  return (mapDir === 'west' || mapDir === 'east')
    ? [KIT_PIECE_BY_KEY.archWestAFull, KIT_PIECE_BY_KEY.archWestBFull]
    : [KIT_PIECE_BY_KEY.archNorthAFull, KIT_PIECE_BY_KEY.archNorthBFull];
}

/** The pillar that closes the corner where a `north` run meets a `west` one. */
export function kitPillarFor(mapDir) {
  return (mapDir === 'west' || mapDir === 'east') ? KIT_PIECE_BY_KEY.pillarWest
    : KIT_PIECE_BY_KEY.pillarNorth;
}

// ---------------------------------------------------------------------------
// WHICH MATERIAL A PLACE IS BUILT OF.
//
// Keyed on what the game already knows about a region rather than on a new
// per-site field: Elehyd is the cold one and its caves are ice, Cinder is the
// lava one and its caves are basalt. A region with nothing to say gets grey
// brick, which is the neutral.
// ---------------------------------------------------------------------------
export const KIT_BY_REGION = {
  nek: 'greybrick',
  ontaria: 'log',
  elehyd: 'ice',
  bratugal: 'darkstone',
  sirukh: 'greenbrick',
  cinder: 'lava',
  ixcuatl: 'greenbrick',
};

export function kitForRegion(regionId) {
  return KIT_BY_REGION[regionId] || 'greybrick';
}

// ---------------------------------------------------------------------------
// ROUND 258 (item 3) -- AND THE ROOMS, WHICH THIS KIT HAS NEVER DRESSED.
//
//   "Building interiors don't seem to be utilizing any of the new walls I
//    added. Everywhere still has the crummy, ill fitting wooden walls."
//
// He is right and the reason is narrower than it looks. Round 200 wired these
// six sheets into CAVES (`_dressDenKit`) and stopped there. Every built room
// -- house, hall, temple, forge, the Division's lab -- still draws round 23's
// placeholder, which is not art at all: `_drawInteriorPlaceholders` paints
// brown quads with coursing lines every fourteen pixels onto a canvas when
// the real texture is absent. That is the "crummy, ill fitting wooden wall".
// It was honest scaffolding for art that had not arrived; the art arrived.
//
// THE MATERIAL COMES OFF THE ROOM'S OWN FLOOR, which is a field every room
// already declares and which already says what kind of place it is. A second
// field per room would be a second thing to keep in step with the first, and
// the first is right: a forge is dark stone, a marble temple is grey brick,
// a sewer is the green brick its floor was recoloured to match in round 83.
// ---------------------------------------------------------------------------
export const KIT_BY_FLOOR = {
  hall: 'greybrick',
  marble: 'greybrick',
  forge: 'darkstone',
  sewer: 'greenbrick',
  ice: 'ice',
  wood: 'log',
  cave: 'darkstone',
  cinder: 'lava',
};

/** The material a built room's walls are made of. `room.kitMaterial` wins
 *  where a room names one; otherwise the floor decides; otherwise grey brick,
 *  because the fallback has to be a KIT -- falling back to nothing is what
 *  put the brown placeholder on every wall in the game. */
export function kitForRoom(room) {
  if (!room) return 'greybrick';
  if (room.kitMaterial && KIT_TEX[room.kitMaterial]) return room.kitMaterial;
  const byFloor = KIT_BY_FLOOR[room.floor];
  if (byFloor && KIT_TEX[byFloor]) return byFloor;
  return 'greybrick';
}

/**
 * The piece a wall PANEL should be drawn as.
 *
 * `buildRoomWalls` speaks in screen facings and in two kinds of panel; this
 * kit speaks in map directions and twenty indices. Round 187's rule is the
 * bridge and it is written down there: map north is object NORTHEAST, because
 * a world step of (+TILE, 0) projects to screen (+32, +16).
 *
 * THE CAMERA-SIDE RUNS GET NOTHING, and the first cut of this round got that
 * wrong in a way worth writing down. Round 23 put a "low trim" on the south
 * and east runs so the room would read as enclosed, and I reached for the
 * nearest low piece in the kit. The nearest low piece is `rubbleSlab`, which
 * is a broken slab with a stepped top -- tiled along a run it reads as a
 * flight of stairs laid end to end. The user, immediately: "Don't tile stairs
 * across the south and east faces of a room. Why would you think that makes
 * sense?"
 *
 * There is no low WALL in this kit, and inventing one out of a rubble piece
 * is how you get stairs in a wall. So the camera-side runs get no sprite at
 * all, which is the ordinary isometric answer -- the floor's own edge is the
 * room's edge, the colliders are unchanged, and nothing can draw over the
 * player standing at the front of the room.
 */
export function kitPieceForPanel(piece, facing) {
  if (piece === 'front') return null;
  const mapDir = (facing === 'northwest' || facing === 'west'
    || facing === 'southeast' || facing === 'east') ? 'west' : 'north';
  return kitWallFor(mapDir);
}

// ---------------------------------------------------------------------------
// ROUND 260 -- THE CORNER OVERLAP.
//
//   "trim away this overlap and continue with the next round."
//
// Round 259 put both runs on the corner tile and they DO meet there -- but
// each of them brings a piece of the other run with it, and the two copies
// fight. Measured on the sheet, relative to the anchor at (77.0, 151.5):
//
//   wallNorth   x [-19 .. +47]     wallWest   x [-48 .. +18]
//
// The tile's top vertex is x = 0. So each wall piece is its own 48px run PLUS
// a ~19px RETURN wrapping past the vertex onto the perpendicular face. That
// return is what makes a run END cleanly where nothing meets it -- and at the
// corner, where something does meet it, it is a second copy of the corner
// column drawn over the first. Whichever piece sorts last wins and its return
// juts out over the other run's coping: the lip in his screenshot.
//
// THE TRIM IS THE VERTEX ITSELF, not a taste. Each piece is cropped to its
// own side of x = 0 -- the west run keeps everything left of the vertex, the
// north run everything from the vertex right -- so the two are DISJOINT and
// the corner looks the same whichever order they sort in. That last property
// is the one worth having: the two depths at the corner tile are equal
// (isoDepth(tx-TILE/2, ty) === isoDepth(tx, ty-TILE/2)), so before this the
// corner's appearance rode on the order `buildRoomWalls` happened to emit.
//
// Only the tile that wears BOTH runs is cropped. A run that ends anywhere
// else -- beside a doorway, at a room's mouth -- still wants its return.
// ---------------------------------------------------------------------------

/** The tile's top vertex, as a column in the source cell. */
export const KIT_CORNER_SPLIT = Math.round(KIT_FOOT_X * KIT_CELL_W);   // 77

/** The crop, in frame pixels, for a wall piece sharing a corner tile with the
 *  other run. `null` for anything else, so a caller that passes a pillar or a
 *  floor gets no crop rather than a wrong one. */
export function kitCornerCrop(dir) {
  if (dir === 'west') return { x: 0, y: 0, w: KIT_CORNER_SPLIT, h: KIT_CELL_H };
  if (dir === 'north') {
    return { x: KIT_CORNER_SPLIT, y: 0, w: KIT_CELL_W - KIT_CORNER_SPLIT, h: KIT_CELL_H };
  }
  return null;
}

// ---------------------------------------------------------------------------
/** Self-check, in the shape `cityPropFaults` established: the data lane calls
 *  it and a suite asserts it is empty. Every fault here is one that would
 *  otherwise show up as a piece drawn in the wrong place or a wall you can
 *  walk through, both of which are easy to miss by eye and trivial to catch
 *  here. */
export function buildingKitFaults() {
  const bad = [];
  const seen = new Set();
  for (const p of KIT_PIECES) {
    if (!(p.idx >= 0 && p.idx < KIT_COUNT)) bad.push(`${p.key}: idx ${p.idx} is off the sheet`);
    if (seen.has(p.idx)) bad.push(`${p.key}: idx ${p.idx} is already taken`);
    seen.add(p.idx);
    if (p.solid && !(p.radius > 0)) bad.push(`${p.key}: solid with no radius`);
    if (!p.solid && p.radius) bad.push(`${p.key}: radius on a piece nothing collides with`);
    if (p.flat && p.solid) bad.push(`${p.key}: a floor you cannot walk on`);
    if (p.dir && p.dir !== 'north' && p.dir !== 'west') bad.push(`${p.key}: dir ${p.dir}`);
    if (p.role === 'wall' && !p.dir) bad.push(`${p.key}: a wall on no edge`);
    if (p.pair !== undefined) {
      const o = KIT_PIECES[p.pair];
      if (!o) bad.push(`${p.key}: pairs with ${p.pair}, which is not a piece`);
      else if (o.pair !== p.idx) bad.push(`${p.key} pairs with ${o.key}, which pairs with ${o.pair}`);
      else if (o.dir !== p.dir) bad.push(`${p.key} (${p.dir}) pairs with ${o.key} (${o.dir})`);
    }
  }
  // Every index on the sheet is spoken for. A kit with a silent hole in it is
  // twenty pieces of art of which nineteen can ever be placed.
  for (let i = 0; i < KIT_COUNT; i++) if (!seen.has(i)) bad.push(`piece ${i} is declared by nobody`);
  for (const m of KIT_MATERIALS) {
    if (!/^[a-z]+$/.test(m.slug)) bad.push(`material slug ${m.slug}`);
  }
  for (const [region, slug] of Object.entries(KIT_BY_REGION)) {
    if (!KIT_SLUGS.includes(slug)) bad.push(`${region} is built of ${slug}, which is not a kit`);
  }
  return bad;
}
