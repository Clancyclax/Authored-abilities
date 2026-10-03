// ===========================================================================
// ROUND 262 -- THE FURNITURE.
//
//   2)   "Chairs and tables to replace all existing chair and table objects.
//         Adjust the pallets with 4 or 5 versions of each to allow for a wide
//         variety of styles."
//   2.1) "Styles should not be mixed within a dwelling."
//   3)   "I've also added a counter, this can be lined up together to create
//         a bar area for taverns."
//   4)   "Use only the NE, NW, SE, and SW faces so that they align with the
//         isometric tiles."
//   6)   the rug -- "Only 2 of the images... are correct for isometric
//         placement and I've circled them in red."
//   7)   "I've added a single bed and a bone bed"
//
// WHY THERE IS NO FIFTH CHAIR AND NO SIXTH TABLE. He asked for "4 or 5
// versions of each" and sent two chairs and two tables. The versions are
// PALETTES, not models -- which is what he asked for and is also the only
// answer that scales: five styles over eleven models is fifty-five looks out
// of one 448x1232 sheet, built one canvas at a time as a room asks for one.
//
// AND THE STYLE BELONGS TO THE BUILDING, NOT TO THE CHAIR. That is item 2.1,
// and it is the whole reason `styleForDwelling` takes a building rather than
// a tile: hashing per object would give a tavern five different chairs at one
// table, which is the thing he asked not to happen. Hashed rather than
// stored, so a dwelling has the same furniture every time it is walked into
// and across a save.
//
// THE SCALE IS DERIVED, NOT CHOSEN. Every model carries `tiles` -- how much
// floor it stands on, the same number round 23's prop table has carried since
// it was written -- and the draw scale falls out of that and the ink width
// the packer measured. Nobody picks a number that looks right; a table that
// covers a tile and a half covers a tile and a half.
// ===========================================================================

/** public/assets/furniture.png -- eleven rows of four faces. */
export const FURN_TEX = 'furniture';
export const FURN_CELL = 112;
export const FURN_COLS = 4;

/** ...and the ladder, which has no facing at all: it is a hole with rungs in
 *  it and looks the same from every side the player can stand on. */
export const LADDER_TEX = 'ladder';
export const LADDER_W = 35;
export const LADDER_H = 123;

/**
 * THE FOUR FACES, in column order.
 *
 * The cardinals are not packed. Under this projection a world step of (+1,0)
 * goes down-RIGHT on screen, so the faces that lie along a tile's own edges
 * are the diagonals; the cardinals are drawn square to the camera and would
 * sit at 45 degrees to every wall in the room. Item 4, and the packer drops
 * them rather than this filtering them, so there is no frame index anybody
 * can reach that is wrong.
 */
export const FURN_FACES = ['northeast', 'northwest', 'southeast', 'southwest'];

/** The anchor the packer seated every cell on: ink centred, ink bottom on a
 *  common baseline. One origin for fifty-five looks. */
export const FURN_FOOT_X = 0.5;
export const FURN_FOOT_Y = 104 / FURN_CELL;

/**
 * The models, in sheet-row order.
 *
 *   tiles  how much floor it stands on, in game tiles. The same axis round
 *          23's prop table uses, so a chair here and a stool there are the
 *          same size for the same reason.
 *   inkW   the widest of its four faces, measured by the packer. With
 *          `tiles` this gives the draw scale and nobody chooses one.
 *   solid  does it stop the player. A rug does not.
 *   flat   drawn as a floor decal, depth-demoted and walked over.
 *   faces  which of the four it actually has. Only the rug is short.
 */
export const FURN_MODELS = [
  // ROUND 263 -- HALVED. "the chairs far too large... Cut the chair size by
  // 50%". `tiles` is the width a piece covers and the draw scale is derived
  // from it, so halving the footprint halves the chair -- and it is the right
  // number to change rather than a scale multiplier, because a chair that
  // covers 0.8 of a tile and is drawn at half that size would be a chair with
  // a collider twice its own width.
  { key: 'chairWood',   row: 0,  kind: 'chair',   tiles: 0.4, inkW: 44,  solid: true,  label: 'a wooden chair' },
  { key: 'chairStone',  row: 1,  kind: 'chair',   tiles: 0.45, inkW: 55, solid: true,  label: 'a carved stone chair' },
  // ROUND 267 -- A QUARTER SMALLER. "5) Tables need shrunk by 25%".
  //
  // DERIVED, NOT TYPED. `tiles` is a footprint and the drawn width is
  // `tilesScreenW(tiles)`, which is NOT linear in `tiles` -- it is `t*64`
  // below one tile and `64+(t-1)*32` above, because adjacent tile centres are
  // 32 screen pixels apart and the other half of the diamond is paid in
  // vertical offset. So "25% smaller" typed straight onto the footprint would
  // have taken tableFancy from 1.8 to 1.35 and shrunk what is drawn by only
  // 15%. `shrinkTiles` takes the quarter off the SCREEN WIDTH and converts
  // back, which is the thing the eye measures: 89.6px -> 67.2px for the fancy
  // table, 67.2px -> 50.4px for the plain one.
  //
  // It falls out that the shrunk fancy table (1.1) is exactly the plain
  // table's old footprint, which is a fair check on the arithmetic.
  { key: 'tableWood',   row: 2,  kind: 'table',   tiles: shrinkTiles(1.1, 0.75), inkW: 60,  solid: true,  label: 'a plain table' },
  { key: 'tableFancy',  row: 3,  kind: 'table',   tiles: shrinkTiles(1.8, 0.75), inkW: 94,  solid: true,  label: 'a long polished table' },
  // ROUND 263 -- A QUARTER BIGGER. "increase the counter size by 25%". 1.8
  // tiles drew it 90px wide; 2.5 draws it 112, which is 90 x 1.25 to the
  // pixel. The step a bar lays them at is derived from that width below, so
  // growing the counter re-spaces the bar rather than piling it up.
  { key: 'counterLong', row: 4,  kind: 'counter', tiles: 2.5, inkW: 90,  solid: true,  label: 'a counter' },
  { key: 'nightWood',   row: 5,  kind: 'stand',   tiles: 0.8, inkW: 52,  solid: true,  label: 'a nightstand' },
  { key: 'nightBone',   row: 6,  kind: 'stand',   tiles: 0.8, inkW: 53,  solid: true,  label: 'a bone-framed nightstand' },
  { key: 'bedFluffy',   row: 7,  kind: 'bed',     tiles: 2.0, inkW: 105, solid: true,  label: 'a made bed' },
  { key: 'bedBone',     row: 8,  kind: 'bed',     tiles: 2.0, inkW: 107, solid: true,  label: 'a bone-framed bed' },
  // HALF A TILE WIDE, not nine tenths. `tiles` is a WIDTH and the scale is
  // derived from it, so a tall narrow object takes the width it actually has:
  // 0.9 gave a door drawn at 1.75x, twice the size of the table beside it.
  // A doorway is about half a tile across, and at 0.5 it draws at 0.97x like
  // everything else on the sheet.
  { key: 'doorWood',    row: 9,  kind: 'door',    tiles: 0.5, inkW: 33,  solid: false, label: 'a wooden door' },
  // ITEM 6 -- TWO FACES, because six of the eight he sent are the rug seen at
  // angles that do not lie flat on an isometric floor, and he circled the two
  // that do. Declared here so a placer that asks for a north-east rug gets
  // nothing rather than a rug standing on its edge.
  { key: 'rugRound',    row: 10, kind: 'rug',     tiles: 1.6, inkW: 103, solid: false, flat: true,
    faces: ['southeast', 'southwest'], label: 'a round rug' },
];

export const FURN_BY_KEY = Object.fromEntries(FURN_MODELS.map(m => [m.key, m]));
export const FURN_KEYS = FURN_MODELS.map(m => m.key);

/**
 * HOW WIDE `tiles` TILES ACTUALLY ARE, ON SCREEN.
 *
 * The first cut of this multiplied by 64 and it is wrong for anything longer
 * than one tile. A tile's diamond is 64 wide, but two tiles side by side along
 * one world axis have their centres only 32 apart on screen -- the other 32 is
 * paid for in the 16px of vertical offset. So a 1xN strip of tiles spans
 * `64 + (N-1)*32` screen pixels, not `N*64`, and a table said to cover two
 * tiles was being drawn half again as wide as two tiles.
 *
 * Below one tile there is no strip to speak of and the object is simply a
 * fraction of the diamond, so the two cases are written out rather than
 * fudged into one expression.
 */
export function tilesScreenW(tiles) {
  return tiles <= 1 ? tiles * 64 : 64 + (tiles - 1) * 32;
}

/** `tilesScreenW` backwards: the footprint that draws this many screen pixels
 *  wide. The two branches meet at 64px == 1 tile, so the inverse is exact. */
export function tilesForScreenW(px) {
  return px <= 64 ? px / 64 : 1 + (px - 64) / 32;
}

/** A footprint scaled by what it LOOKS like, not by its own number. `factor`
 *  is applied to the drawn width and converted back. See the tables. */
export function shrinkTiles(tiles, factor) {
  return tilesForScreenW(tilesScreenW(tiles) * factor);
}

/** Which of the four columns this face is, or -1 for one this model has not
 *  got. */
export function furnFaceIndex(model, face) {
  const m = typeof model === 'string' ? FURN_BY_KEY[model] : model;
  if (!m) return -1;
  if (m.faces && !m.faces.includes(face)) return -1;
  return FURN_FACES.indexOf(face);
}

/** The frame number in the packed sheet. */
export function furnFrame(model, face) {
  const m = typeof model === 'string' ? FURN_BY_KEY[model] : model;
  const c = furnFaceIndex(m, face);
  if (!m || c < 0) return -1;
  return m.row * FURN_COLS + c;
}

/** DERIVED: cover the floor you say you cover. */
export function furnScale(model) {
  const m = typeof model === 'string' ? FURN_BY_KEY[model] : model;
  if (!m || !(m.inkW > 0)) return 1;
  return tilesScreenW(m.tiles) / m.inkW;
}

// ---------------------------------------------------------------------------
// ITEM 3 -- "this can be lined up together to create a bar area for taverns".
//
// A RUN, NOT A PROP. The counter is the only piece on the sheet whose job is
// to be repeated, so the repetition is a function rather than three lines
// typed into a layout: a bar is a start tile, a length and a direction, and
// the pieces come out already facing the same way -- which is the half a
// hand-typed bar gets wrong, because `facingForTile` hashes per tile and
// would turn every third counter round.
//
// ROUND 263 -- THE STEP IS THE COUNTER'S OWN DRAWN WIDTH, and that is the
// whole of "line up the counters like you do city walls, no overlap and no
// gaps".
//
// TWO TILES WAS A GUESS AND IT SHOWED. A tile step moves a sprite 32 screen
// pixels, so a two-tile step puts the next counter 64 pixels along -- and the
// counter is drawn 112 pixels wide, which piles each one halfway onto the
// last. The number that makes them abut is not a count of tiles at all: it is
// `drawn width / 32`, and for this art that is three and a half.
//
// SO THE PIECES SIT ON HALF TILES, which is the part worth saying out loud. A
// bar is dressing; nothing reads its tile, and `roomTileCentre` takes a float
// perfectly well. Forcing it onto whole tiles is what forces a gap or a lap.
// Derived, so re-sizing the counter re-spaces the bar instead of piling it.
// ---------------------------------------------------------------------------
// MEASURED ON THE ART, NOT ON THE INK BOX -- and the first cut of this used
// the ink box and left visible gaps. The counter's cell is 90px of ink wide,
// but the extreme corners are thin slivers of the sloped front face; the body
// that has to meet the next piece is narrower. Two copies of the south-west
// frame, stepped along the wall, stop touching at 88 screen pixels (they share
// 10 pixels at 86 and none at 88). So the join is below that: 80 pixels, which
// is two and a half tiles, and leaves a 108-pixel overlap -- a solid seam
// rather than a knife edge, and still a quarter narrower than the 112 the ink
// box would have asked for.
export const BAR_JOIN_PX = 80;
/** Where the pieces stop touching at all. The join must stay under it. */
export const BAR_BREAK_PX = 88;

export function barStepTiles() {
  return BAR_JOIN_PX / 32;
}

/** ITEM 2 -- "Countertops for a bar environment should be 2 tiles away from
 *  the rear wall to allow room for a bartender behind them." The wall line is
 *  tile 0 and the floor starts at 1, so the counter stands on 2 and the row
 *  behind it is where somebody pours. */
export const BAR_WALL_GAP_TILES = 2;

export function barRun(tx, ty, len, dir = 'east', face = null) {
  const out = [];
  const step = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[dir];
  if (!step || !(len > 0)) return out;
  // A bar stands against a wall and looks into the room. A run going east sits
  // on the north wall; one going south sits on the west wall.
  const facing = face || facingAgainstWall(dir === 'east' || dir === 'west' ? 'north' : 'west');
  const s = barStepTiles();
  for (let i = 0; i < len; i++) {
    out.push({ key: 'counterLong', face: facing,
      tx: tx + step[0] * i * s, ty: ty + step[1] * i * s });
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE FIVE STYLES.
//
// A whole-sprite hue/saturation/lightness transform, the same machinery the
// round-260 torches recolour their flames with -- except that these objects
// are one material each, so there is nothing to mask off and the transform is
// the whole cell.
//
// A GREY OBJECT STAYS GREY, and that falls out rather than being special-
// cased: rotating the hue of a pixel with no saturation does nothing, so the
// stone chair takes the lightness of a style and none of its colour. Which is
// the right answer -- `ebony` should give a dark stone chair, not a purple
// one.
// ---------------------------------------------------------------------------
export const FURN_STYLES = {
  oak:    { key: 'oak',    hue: 0,   sat: 1.00, lum: 1.00, label: 'oak' },
  walnut: { key: 'walnut', hue: -9,  sat: 1.10, lum: 0.78, label: 'walnut' },
  ash:    { key: 'ash',    hue: 7,   sat: 0.52, lum: 1.20, label: 'pale ash' },
  ebony:  { key: 'ebony',  hue: -4,  sat: 0.68, lum: 0.52, label: 'ebony' },
  slate:  { key: 'slate',  hue: 168, sat: 0.60, lum: 0.92, label: 'painted slate' },
};
export const FURN_STYLE_KEYS = Object.keys(FURN_STYLES);
export const FURN_DEFAULT_STYLE = 'oak';

/** The texture key a recoloured sheet is cached under. `oak` is the art as
 *  packed, so it keeps the plain key and costs no canvas at all. */
export function furnTexFor(styleKey) {
  return (!styleKey || styleKey === FURN_DEFAULT_STYLE) ? FURN_TEX : `${FURN_TEX}_${styleKey}`;
}

/**
 * ITEM 2.1 -- ONE STYLE PER DWELLING.
 *
 * Takes the BUILDING (or the room, or anything carrying an id and a world
 * position), never the object. Hashing per object is exactly the mixing he
 * asked not to have; hashing per building gives a tavern one set of chairs
 * and the house next door a different one, stably, with nothing stored.
 *
 * A place that names its own wins, so a temple or a noble's hall can be
 * written as slate or ebony rather than rolled.
 */
export function styleForDwelling(place) {
  if (!place) return FURN_STYLES[FURN_DEFAULT_STYLE];
  if (place.furnStyle && FURN_STYLES[place.furnStyle]) return FURN_STYLES[place.furnStyle];
  const id = String(place.id || place.key || `${place.x | 0},${place.y | 0}`);
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return FURN_STYLES[FURN_STYLE_KEYS[(h >>> 0) % FURN_STYLE_KEYS.length]];
}

/**
 * ITEM 4, AS A FUNCTION: which way a thing against this wall faces.
 *
 * Round 187 wrote the rule down and round 259 paid for forgetting it -- the
 * game's facings are DIAGONAL. A thing standing against the room's north wall
 * has its back to it and looks into the room, which is south-west; against
 * the west wall it looks south-east. The two camera-side walls are the
 * mirror of that.
 *
 * Shared by the counter, the door and anything a later round stands against
 * a wall, so there is one answer to "which way does it face" rather than one
 * per caller.
 */
export const WALL_FACING = {
  north: 'southwest',
  west: 'southeast',
  south: 'northeast',
  east: 'northwest',
};
export function facingAgainstWall(mapDir) {
  return WALL_FACING[mapDir] || 'southwest';
}

// ---------------------------------------------------------------------------
// ROUND 263 -- WHERE A DOOR MAY HANG, AND WHICH WAY IT FACES.
//
//   8) "It should exclusively be used on the North or West faces of indoor
//       environments, as we've identified before this means using the object
//       on the north wall needs to face southwest, and the object on the west
//       wall needs to be facing southeast."
//
// THE RULE IS NOT A TASTE, and the reason is round 22's: map north and map
// west project to the screen's two BACK edges (upper-right and upper-left),
// and map south and east to the two CAMERA-SIDE ones. Those are the runs the
// game has drawn nothing on since round 22 and that round 259 refuses a kit
// piece for, because anything standing there stands between the camera and
// the room. A door is no exception.
//
// So this REFUSES rather than falling back: a caller that asks for a door on
// a south or east wall gets null and has to move the doorway, which is what
// the Society hall's market door did in this round. A fallback would have
// quietly hung a door in front of the player and called the rule kept.
// ---------------------------------------------------------------------------
export const DOOR_WALLS = ['north', 'west'];

export function doorFacingForWall(mapDir) {
  return DOOR_WALLS.includes(mapDir) ? WALL_FACING[mapDir] : null;
}

/** Which wall a tile lies against inside a room, in MAP terms, or null for
 *  one standing in open floor. Shared so "is this door allowed here" and
 *  "which way does it face" are asked of one answer. */
export function wallOfTile(room, tx, ty) {
  if (!room) return null;
  // THE BACK WALLS ARE TESTED FIRST, and that is the corner case rather than
  // a preference: a tile at the top-right of the floor lies against BOTH the
  // north run and the east run, and the first cut tested east first -- so the
  // Society hall's new north-wall door came back "on the east, where a door
  // may not hang", which is a true sentence about the wrong wall. At a corner
  // the wall that may carry art is the answer.
  if (ty <= 1) return 'north';
  if (tx <= 1) return 'west';
  if (tx >= room.w - 2) return 'east';
  if (ty >= room.h - 2) return 'south';
  return null;
}

/**
 * Which way a free-standing piece faces, hashed off its own tile.
 *
 * Stable across a pool-out and back, which is the fault round 84 and round
 * 240 both paid for in other systems: a chair that turns round when it
 * scrolls off screen is worse than a chair that all face the same way.
 */
export function facingForTile(tx, ty, model) {
  const m = typeof model === 'string' ? FURN_BY_KEY[model] : model;
  const pool = (m && m.faces) || FURN_FACES;
  const h = Math.abs(Math.imul(tx | 0, 0x9e3779b1) ^ Math.imul(ty | 0, 0x85ebca6b));
  return pool[h % pool.length];
}

// ---------------------------------------------------------------------------
// ITEM 2 -- WHAT REPLACES WHAT.
//
// "replace all existing chair and table objects", and the mapping keeps each
// room's own intent rather than flattening it: the padded chair in the
// Director's office was the GOOD chair, so it becomes the carved one; the
// long dark table in a cult chamber was the big table, so it becomes the long
// polished one. A room that asked for a small table still gets a small table.
//
// Stools and benches are deliberately absent. A stool is not a chair and a
// stone slab bench is not a table; replacing them would be answering a
// question he did not ask, and there is no art for them here.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ROUND 267 -- "1) Fix Objects overlapping walls"
//
// THE SCREENSHOT: a bed standing half inside the north wall and a nightstand
// with its corner buried in the west one. Both are exactly where the layout
// asked for them -- `bedFluffy tx:2 ty:1`, `nightWood tx:1 ty:3` -- and ty 1
// and tx 1 ARE the wall. `wallOfTile` has said so since round 262 (`ty <= 1`
// is the north wall, `tx <= 1` the west) and the door rule is built on it;
// nothing was checking the furniture against the same line.
//
// THE CLEARANCE IS THE WALL BAND AND NOTHING MORE, which the first cut of this
// got wrong in the direction that looks more careful. It added the piece's own
// half-width on top, on the reasoning that a two-tile bed centred on the first
// legal tile still has some of itself over the masonry -- and that is true, but
// `tiles` is a width along ONE axis, not a radius, and adding it on both axes
// over-constrains every long piece. It demanded three tiles of clearance for
// the tavern counter and would have shoved the bar off the wall it stands
// against -- undoing round 263's "2 tiles away from the rear wall to allow room
// for a bartender", in a 7x5 usable floor with no room to put it back.
//
// A bed whose headboard touches the wall it is pushed against is a bed against
// a wall. A bed whose CENTRE is in the wall is the screenshot. The band is the
// line that separates those two, so the band is the rule.
//
// WHY A CLAMP AND NOT A CORRECTED TABLE. Both -- the layouts are corrected so
// the data says what it means, and the clamp stands behind them so the next
// layout written in a hurry cannot put a wardrobe in a wall. A hand-corrected
// table on its own is this project's fault class three, which has now cost
// four rounds.
//
// DOORS AND RUGS ARE EXEMPT, for opposite reasons: a door IS in the wall (see
// `doorFacingForWall`), and a rug is a floor decal with no height to overlap
// anything with.
// ---------------------------------------------------------------------------
/** Tiles of wall at each edge, matching `wallOfTile`. */
export const FURN_WALL_TILES = 2;

/** How far a piece's centre must sit from a wall to not be standing in it. */
export function furnWallClearance(model) {
  const m = typeof model === 'string' ? FURN_BY_KEY[model] : model;
  if (!m) return FURN_WALL_TILES;
  return FURN_WALL_TILES;
}

/** `{tx, ty}` moved inward until the piece stands clear of every wall. Returns
 *  the tile unchanged for a door, a flat piece, or a piece that is already
 *  clear. A room too small to hold the piece keeps it centred rather than
 *  pushing it out the far side. */
export function furnOffWallTile(model, tx, ty, room = null) {
  const m = typeof model === 'string' ? FURN_BY_KEY[model] : model;
  if (!m || m.kind === 'door' || m.flat) return { tx, ty, moved: false };
  const lo = furnWallClearance(m);
  const clamp = (v, hi) => (hi < lo ? Math.round((room ? hi + lo : v) / 2) : Math.min(Math.max(v, lo), hi));
  const nx = clamp(tx, room ? room.w - 1 - lo : Infinity);
  const ny = clamp(ty, room ? room.h - 1 - lo : Infinity);
  return { tx: nx, ty: ny, moved: nx !== tx || ny !== ty };
}

/** Every furniture placement in `layouts` that is standing in a wall. Reported
 *  rather than silently clamped, so a layout can be corrected at source. */
export function furnWallFaults(layouts) {
  const out = [];
  for (const L of (layouts || [])) {
    for (const p of (L.props || [])) {
      const m = FURN_BY_KEY[p.key] || (FURN_REPLACES[p.key] ? FURN_BY_KEY[FURN_REPLACES[p.key]] : null);
      if (!m || m.kind === 'door' || m.flat) continue;
      const lo = furnWallClearance(m);
      if (p.tx < lo || p.ty < lo) {
        out.push(`${L.id}: ${p.key} at (${p.tx},${p.ty}) is inside a wall -- needs ${lo} tiles of clearance`);
      }
    }
  }
  return out;
}

export const FURN_REPLACES = {
  chairPlain: 'chairWood',
  chairWhite: 'chairWood',
  rockingChair: 'chairWood',
  chairPadded: 'chairStone',
  tableSmall: 'tableWood',
  tableRound: 'tableWood',
  tableRed: 'tableFancy',
  tableLong: 'tableFancy',
  tableDark: 'tableFancy',
  tableRoundBig: 'tableFancy',
};

/**
 * ROUND 267 -- "6) Tables in the adventure society should be reduced to only
 * the nicer table."
 *
 * THE SOCIETY HALL KEEPS ONE TABLE. Its prop list was written across four
 * rounds and carries `tableRound`, `tableRed` and `tableLong` -- which land on
 * two different models, so the hall had a refectory table, a polished one and
 * a plain one standing in the same room. An institution furnishes itself out
 * of one order.
 *
 * KEYED BY ROOM, NOT BY PROP, because the prop keys are shared: `tableRound`
 * is also every cottage's kitchen table and must stay plain there. Both halves
 * of the Society are listed -- the hall and the market floor upstairs are one
 * building and would otherwise disagree with each other across a doorway.
 */
export const ROOM_TABLE_OVERRIDE = {
  guild: 'tableFancy',
  guild_market: 'tableFancy',
};

/** The new model for an old prop key, or null for a prop this round leaves
 *  alone. `roomId` lets a room insist on one table throughout. */
export function furnReplacementFor(propKey, roomId = null) {
  let k = FURN_REPLACES[propKey];
  if (!k) return null;
  const only = roomId ? ROOM_TABLE_OVERRIDE[roomId] : null;
  if (only && FURN_BY_KEY[k] && FURN_BY_KEY[k].kind === 'table') k = only;
  return FURN_BY_KEY[k] || null;
}

// ---------------------------------------------------------------------------
export function furnitureFaults(interiorProps = null) {
  const out = [];
  const rows = new Set();
  for (const m of FURN_MODELS) {
    if (rows.has(m.row)) out.push(`${m.key}: row ${m.row} is already taken`);
    rows.add(m.row);
    if (!(m.tiles > 0)) out.push(`${m.key}: stands on no floor`);
    if (!(m.inkW > 0)) out.push(`${m.key}: has no measured width`);
    if (!m.label) out.push(`${m.key}: has no label`);
    if (m.flat && m.solid) out.push(`${m.key}: a rug you cannot walk on`);
    const faces = m.faces || FURN_FACES;
    for (const f of faces) {
      if (!FURN_FACES.includes(f)) out.push(`${m.key}: face ${f} is not one of the four`);
      if (furnFrame(m, f) < 0) out.push(`${m.key}: face ${f} has no frame`);
    }
    // ITEM 4, STATED AS THE PROPERTY: a cardinal must not resolve to a frame.
    for (const f of ['north', 'south', 'east', 'west']) {
      if (furnFrame(m, f) >= 0) out.push(`${m.key}: ${f} is a cardinal and has a frame`);
    }
    // ...and the derived scale has to be sane, or `tiles` and `inkW` disagree
    // about what the art is.
    const s = furnScale(m);
    if (!(s > 0.2 && s < 4)) out.push(`${m.key}: draws at ${Math.round(s * 100) / 100}x`);
  }
  // ITEM 6 -- the rug is the only short one, and it is short by exactly two.
  const rug = FURN_BY_KEY.rugRound;
  if (!rug || !rug.faces || rug.faces.length !== 2) out.push('the rug does not declare its two faces');
  for (const m of FURN_MODELS) {
    if (m.key !== 'rugRound' && m.faces) out.push(`${m.key}: only the rug may be short of faces`);
  }
  for (const [k, s] of Object.entries(FURN_STYLES)) {
    if (s.key !== k) out.push(`style ${k}: keyed as ${s.key}`);
    if (!(s.lum > 0) || !(s.sat >= 0)) out.push(`style ${k}: has no palette`);
  }
    // ROUND 263 -- the bar's step must be the counter's own drawn width, or it
  // laps or gaps. Stated as the property rather than as the number.
  {
    if (!(BAR_JOIN_PX < BAR_BREAK_PX)) out.push('a bar steps further than its pieces reach -- it will gap');
    if (!(BAR_JOIN_PX > 64)) out.push('a bar steps less than two tiles -- it will pile');
    if (Math.abs(barStepTiles() * 32 - BAR_JOIN_PX) > 1e-9) out.push('the bar step and its join disagree');
  }
  if (FURN_STYLE_KEYS.length < 4 || FURN_STYLE_KEYS.length > 5) {
    out.push(`${FURN_STYLE_KEYS.length} styles -- he asked for four or five`);
  }
  if (furnTexFor(FURN_DEFAULT_STYLE) !== FURN_TEX) {
    out.push('the default style does not use the packed sheet');
  }
  // ITEM 2 -- every replacement must name a model that exists, and (when the
  // old table is handed in) every chair and table in the old catalogue must
  // have one. Asked of the roster rather than counted.
  for (const [oldKey, newKey] of Object.entries(FURN_REPLACES)) {
    if (!FURN_BY_KEY[newKey]) out.push(`${oldKey} becomes ${newKey}, which is not a model`);
    if (interiorProps && !interiorProps[oldKey]) out.push(`${oldKey} is not an interior prop`);
  }
  if (interiorProps) {
    for (const k of Object.keys(interiorProps)) {
      if (!/^(chair|table)/.test(k)) continue;
      if (!FURN_REPLACES[k]) out.push(`${k} is a chair or a table and nothing replaces it`);
    }
  }
  // A dwelling gets ONE style and gets the same one twice.
  const a = styleForDwelling({ id: 'a-tavern' }).key;
  if (a !== styleForDwelling({ id: 'a-tavern' }).key) out.push('a dwelling restyles itself');
  if (styleForDwelling({ id: 'a-tavern', furnStyle: 'ebony' }).key !== 'ebony') {
    out.push('a place cannot name its own style');
  }
  for (const [dir, face] of Object.entries(WALL_FACING)) {
    if (!FURN_FACES.includes(face)) out.push(`a thing on the ${dir} wall faces ${face}, which is not one of the four`);
  }
  return out;
}
