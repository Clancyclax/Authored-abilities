// Town/road/building generation, redesigned for this port's world size.
// Ported CONCEPTS from the original (sparkstone_prototype.html lines
// ~3258-3337 town-tile classification, ~3638-3720 buildingSpots generation,
// ~3298-3305 + ~6944-6954 building atlas layout) -- the ALGORITHM SHAPE is
// faithful (plaza disc + Manhattan avenue/street/alley grid + quadrant-lot
// building placement + a 4-column N/E/S/W building atlas), but every
// distance constant is rescaled down for this test map (the original's town
// alone is 1472px across on a 6144px map; this port's whole map is smaller
// than that). Ratios were NOT simply divided by a constant factor -- that
// would make streets sub-tile-width -- they were re-picked by hand to stay
// sensible at TILE=32 granularity while preserving the same structural
// relationships (plaza inside city inside wilderness, blocks wide enough to
// hold a building each).
//
// THE BUG THIS ROUND ACTUALLY FIXES: the original's `facingTowardRoad`
// finds which raw world-cardinal direction (N/S/E/W in plain world space)
// the nearest road tile is in, and feeds that directly into a 4-column
// building atlas with NO iso conversion -- which is wrong, because under
// this game's isometric projection a world-cardinal direction is NOT the
// same as a screen-cardinal direction (world +X renders as screen
// down-right, not screen-right). `findBuildingFacing` below does the same
// "which direction is the nearest road" search, but then runs that
// direction through the SAME iso-weighting `facingFromMove` uses for every
// other directional sprite in the game before picking a column.
//
// CORRECTION (this round): the Phase 3 fix above converted to a screen
// angle but then snapped it to the nearest of 4 SCREEN-CARDINAL directions
// (north/east/south/west on screen). That's still wrong, and provably so:
// this game's roads only ever run along the two world axes, and under this
// projection (isoProject: screen.x = wx - wy, screen.y = (wx+wy)/2) a
// world-axis-aligned road ALWAYS renders on screen at a slope of exactly
// +-1 in ISO_TW:ISO_TH-normalized space -- i.e. at a screen angle of
// +-26.57 deg or +-153.43 deg off horizontal, which is always closer to a
// 45 deg (diagonal) screen direction than a 90 deg (cardinal) one (since
// 26.57 < 45 - 18.43, the cardinal is always the *farther* of the two
// nearest snap targets). So a building facing "toward the road" can never
// legitimately read as facing screen-north/east/south/west here -- it
// should always land on screen-northeast/southeast/southwest/northwest.
// This matches what's visually obvious once you look at the town: the
// streets themselves only ever draw as diagonal lines on screen, never as
// vertical/horizontal ones, so a building "facing the street" has to face
// diagonally too.
//
// UPDATE (later this same round): the building atlas originally only had
// 4 columns per building (real front/back/side-left/side-right art, no
// true per-angle diagonal renders), which meant the fix above had to reuse
// those 4 columns and just relabel which screen angles mapped to which
// column. The user then re-uploaded every building pack with all 8 real
// rotations (see extract_town_buildings.py), so town_singletons.png/
// town_pool.png are now genuine 8-column atlases -- one real drawn frame
// per direction, no relabeling needed. `findBuildingFacing` below now
// calls the shared `facingFromMove` (iso.js) directly; it still only ever
// returns a diagonal in practice (see the math above), but that's a
// property of the road search, not a limitation of the art or the snap
// function anymore -- the north/east/south/west columns are real art too,
// just never selected by this particular search.

import { PLAYER_DIR_ORDER, facingFromMove } from './iso.js';

export const TILE_GRASS = 0, TILE_PATH = 1, TILE_PLAZA = 2, TILE_STREET = 3;
// NEW round 4 -- water, an entirely new terrain feature (see river.js for
// the actual river/lake shape and classification). 4 distinct byte values
// rather than one TILE_WATER + a separate "which water variant" side array,
// since this.tileType is already a plain per-tile Uint8Array read by
// collision/rendering/minimap -- one extra byte value per water look keeps
// every one of those a single flat lookup instead of two parallel arrays.
export const TILE_WATER_LIGHT = 4, TILE_WATER_DEEP = 5, TILE_WATER_RAPIDS = 6, TILE_WATER_FALLS = 7;
// ROUND 45 -- wooden decking, for Ontaria's packet jetty. Its own type rather
// than reusing TILE_PATH because a pier is laid over WATER: it has to be
// walkable where the tile under it would otherwise drown you, and it has to
// draw planks rather than gravel. 13, because 12 is already spoken for twice
// (TILE_ACCENT and TILE_GARDEN, in different contexts).
export const TILE_DOCK = 13;
// ROUND 50 -- the capital's own paving. "City tiles should be the red brick
// with the herringbone city streets tiles, no dirt tiles."
//
// Everything inside the wall used to be stamped TILE_PATH, which draws
// gravel: that is the dirt the user is looking at in the screenshot. It could
// not simply become TILE_STREET, because then the city ground and the roads
// running through it would be the same material and the streets would vanish
// into the courtyard -- which is the "roads read faintly inside the city"
// note that has been sitting open since round 49.
//
// So the city gets a type of its own. TILE_CITY is the red brick the whole
// square is laid in; TILE_STREET is the herringbone the roads are laid in.
// Two materials, one contrast, and no gravel anywhere inside the wall.
//
// 14, the first free byte: 12 is spoken for twice already (TILE_ACCENT and
// TILE_GARDEN) and 13 is the jetty.
export const TILE_CITY = 14;
// ROUND 82 -- and the sewer channel, which is water for every purpose that
// matters: nothing walks into it, nothing spawns in it, nothing is placed in
// it. Declared by NUMBER rather than by importing interiors.js, because
// interiors.js imports this file and a cycle here would take the whole tile
// system with it. The number is asserted against `TILE_SEWER_WATER` by
// `sewerFaults()`, so the two cannot drift apart silently.
export const TILE_SEWER_WATER_ID = 17;
export function isWaterTile(t) {
  return (t >= TILE_WATER_LIGHT && t <= TILE_WATER_FALLS) || t === TILE_SEWER_WATER_ID;
}

// v2: rescaled up from the first pass (TOWN_SQUARE_RADIUS 100/CITY_RADIUS
// 380/BLOCK_SIZE 140) after the first pass turned out to leave buildings
// overlapping the streets themselves -- a building lot sits BLOCK_SIZE/4
// from both the nearest street centerline and the mid-block alley
// centerline, so with the old BLOCK_SIZE=140 a lot only had 35px of offset
// to work with, and BUILDING_RADIUS (38, chosen independently at the time)
// alone was already bigger than that, before even subtracting the street's
// own half-width -- buildings ate into the street, and neighboring
// buildings' collision circles overlapped each other by several px (see
// the arithmetic in the round's PR notes). Rescaled everything by the same
// ~1.71x factor (240/140) together -- BLOCK_SIZE, TOWN_SQUARE_RADIUS,
// CITY_RADIUS, LOT_MARGIN all move together, not just BLOCK_SIZE alone,
// since computeBuildingSpots' ring-band filter needs enough room between
// the plaza edge and city edge to fit at least one ring of blocks -- and
// BUILDING_RADIUS was independently shrunk from 38 to 24 (still clearly
// bigger than the player's own 12px radius, but small enough to actually
// fit inside a lot with real clearance on every side). Verified by
// simulating computeBuildingSpots() with these exact numbers: the
// closest two building centers land 120px apart against a 48px
// (2*BUILDING_RADIUS) overlap threshold, and every lot clears its nearest
// street/alley centerline by 13-18px after subtracting both the road's
// own half-width and the building's radius -- see MIGRATION_PLAN.md for
// the full derivation.
// v3 (round 4): the user's explicit ask -- "expand ... the town to triple
// its current size, the roads should be twice as wide ... keep the same
// number of houses just spread out and scaled up." TOWN_SQUARE_RADIUS,
// CITY_RADIUS, BLOCK_SIZE, and LOT_MARGIN are all scaled by the SAME 3x
// factor together (this is a pure geometric scale of the v2 town, so
// computeBuildingSpots' ring-band filter produces the exact same lot COUNT
// as before -- verified by simulation: 44 lots either way -- while every
// distance in the layout triples, i.e. "spread out and scaled up"). Road
// half-widths get their OWN 2x factor per the separate explicit "twice as
// wide" instruction, not the town's 3x.
export const TOWN_SQUARE_RADIUS = 510; // plaza disc radius (170 * 3)
export const CITY_RADIUS = 1950;       // town edge -- inside this, streets are laid; outside, wilderness (650 * 3)
// ROUND 19 -- 704 rather than 720 so a block is a whole number of TILEs
// (704 / 32 = 22). The road classifier below now works in TILE UNITS, and
// that only produces roads of an exact, constant width if the block grid
// lands on tile boundaries.
export const BLOCK_SIZE = 704;         // spacing between parallel streets (22 tiles)
// Road widths in TILES. The user's ask: "make the city tile roads 2 squares
// wide instead of 1 square wide." Every road type is 2 tiles now; the old
// world-unit half-widths (26/16/32 against a 32-unit tile) produced roads
// that wandered between 1 and 2 tiles depending on where the grid line fell
// inside a tile, which is what read as "1 square wide" in places.
export const STREET_TILES = 2, ALLEY_TILES = 2, AVENUE_TILES = 2;
// Kept for anything still reasoning in world units (lot clearance below).
export const STREET_HALF_WIDTH = STREET_TILES * 16, ALLEY_HALF_WIDTH = ALLEY_TILES * 16, AVENUE_HALF_WIDTH = AVENUE_TILES * 16;
export const PATH_OUTER_LIMIT_FRAC = 0.48; // cardinal paths continue out to this fraction of the map's half-width
// Collision radius for a placed building (WorldScene._buildTownBuildings) --
// lives here, not just as a magic number in WorldScene, since it's load-
// bearing for the street-clearance math above and needs to move in lockstep
// with BLOCK_SIZE/STREET_HALF_WIDTH/ALLEY_HALF_WIDTH if either changes again.
//
// BUG FIX (this round): this used to be 24, sized purely off the LOT-SPACING
// math above (clearance from neighboring lots/streets) with no reference to
// how big the building actually RENDERS. Measured the real art instead: the
// building atlas's opaque ground-level footprint (town_pool.png/
// town_singletons.png, bottom ~22% of each 150px cell, i.e. the walls the
// roof sits on, not the roof overhang) is ~68-95px wide at native scale,
// which projects to a world-space collision radius of roughly
// (footprintHalfWidth / sqrt(2)) given this game's iso skew (isoProject's
// screen.x = wx - wy means a world-space circle of radius R becomes a
// screen ellipse with x half-width R*sqrt(2)) -- that math alone points at
// ~36-43 at the OLD 1.2 display scale. Landed on 34 (up from 24): most of
// the way there while staying safely under the lot-spacing ceiling derived
// above (2*34=68 world units between adjacent building centers, well under
// the 120px measured minimum spacing) and the per-lot street clearance
// margin (13-18px at radius 24 per the derivation above; a +10 radius bump
// eats some of that but never flips it negative for any lot). This directly
// fixes "collision is off" and, as a side effect, "roads don't line up with
// the entrance": with the old undersized circle, the invisible wall stopped
// you well short of the visible door/wall, in a spot that didn't look
// connected to the street it was supposedly facing -- one root cause, two
// symptoms, not two separate bugs.
// v3 (round 4): re-measured against the round-4 art at the new
// TOWN_DISPLAY_SCALE (see that constant's own comment for the full
// footprint-measurement derivation). The ask this round was explicit and
// geometric: "the houses should be able to fit very neatly onto the grid as
// a 5x5 or 4x5 [tile grid]." A world-space AXIS-ALIGNED SQUARE footprint of
// side L (world units) projects under this game's isoProject (screen.x =
// wx-wy, screen.y = (wx+wy)/2) to a screen DIAMOND of width 2L and height L
// -- NOT the circle-to-ellipse formula used for the v2 radius (that formula
// answers a different question, "how does a collision CIRCLE look on
// screen", not "how many tiles wide is this footprint"). Working backwards
// from the widest measured building footprint (~102px native at
// TOWN_CELL=150) so even the widest building stays inside a 5-tile
// (5*TILE=160 world unit) box: display scale (see below) is chosen so
// 102px * scale = 5-tile screen diamond width (2*160=320px) -> scale ~3.14.
// At that same scale the narrowest measured buildings (~86px native) render
// at ~270px screen width, i.e. ~4.2 tiles -- landing exactly in the user's
// named "4x5 or 5x5" range without any extra tuning. BUILDING_RADIUS is the
// (necessarily coarser) CIRCLE collision approximation of that same
// footprint: using a representative ~4.5-tile-wide footprint (L=144 world
// units), a circle inscribed in that square has radius L/2=72; landed on 76
// (a hair over the inscribed radius, safely under the L*sqrt(2)/2=~102
// circumscribed radius) so the invisible wall sits close to the visible
// wall on every side without ever reaching past a corner -- matches the
// ask's own "at least close to the boundary of the house" bar rather than
// promising pixel-exact wall collision (a circle can never exactly match a
// rectangular building footprint). Verify empirically via screenshot before
// treating either number as final.
export const BUILDING_RADIUS = 92;

// ROUND 19 -- the building sprite's anchor (TOWN_FOOT_X/TOWN_FOOT_Y) is not
// where the drawn house actually stands. The art leaves transparent padding
// below its ground line, so anchoring at 96% of the cell puts the anchor
// roughly 120 world units DOWN-SCREEN of the building's real base -- and
// the collision circle, which was centred on that anchor, sat south of the
// texture. The user's report, verbatim: "Based on the tiles it looks like
// the house collision is set south of the texture."
//
// Measured by drawing the projected collision footprint over the sprite and
// fitting it to the walls (see the round-19 notes): the base centre is
// -120 world units on BOTH axes from the anchor. Symmetric on purpose --
// under this projection screen-x is (wx - wy), so an equal shift on both
// axes moves the circle straight up-screen with no sideways drift.
export const BUILDING_COLLIDE_OFFSET = -120;
// Buffer (px) computeBuildingSpots keeps every lot away from the plaza
// edge, the city edge, and the guild lot -- scales with the town, same 3x
// factor as everything else above (was 68 against the v2 town size).
export const LOT_MARGIN = 204;

// Guild lot -- a carved-out rectangle (forced back to grass after the
// street grid pass) reserved for the guildmaster/shopkeeper/quest board,
// same concept as the original's GUILD_LOT, offsets relative to town center.
// Sized and centered to actually contain where npcs.js's buildNpcList and
// WorldScene's _buildQuestBoard place those three things (guildmaster
// (-70,-40), shopkeeper (70,-40), quest board (0,-100)), with margin -- this
// also keeps computeBuildingSpots() (which excludes lots within 40px of this
// rect) from placing a building on top of any of them.
export const GUILD_LOT = { x0: -390, x1: 390, y0: -450, y1: 30 }; // v3: (-130,130,-150,10) * 3, same town-wide scale factor

/**
 * ROUND 72 -- THE GRID IS A PARAMETER NOW, NOT A MODULE CONSTANT.
 *
 * The user: "Make the grid in the bratugal city twice as large (wider plots)".
 *
 * The obvious edit is to double BLOCK_SIZE where it is declared. That would be
 * wrong, and measurably so: BLOCK_SIZE, CITY_RADIUS and TOWN_SQUARE_RADIUS are
 * read by things that have nothing to do with Vashra -- CITY_RADIUS alone is
 * read by the monster spawn bands, by `_inTown`, and at four more sites in
 * WorldScene, all of which are asking about the CAPITAL. Doubling the constant
 * would have moved Cadence's street grid and every one of those bands as a
 * side effect of a request about a different city on a different continent.
 * That is this project's fault class "a field outliving its writer" run in
 * reverse: a constant read by more callers than the one you are editing for.
 *
 * So the grid is a parameter with the module constants as its defaults. Every
 * existing caller passes nothing and gets exactly what it got before; Vashra
 * passes its own. The options object is built in ONE place -- WorldScene's
 * `_settlementGrid` -- and read by both the ground stamp and the lot
 * generator, because a grid the paving and the lots disagree about is a city
 * with its houses in the road.
 */
export function gridOptions(o = {}) {
  return {
    blockSize: o.blockSize || BLOCK_SIZE,
    cityRadius: o.cityRadius || CITY_RADIUS,
    squareRadius: o.squareRadius || TOWN_SQUARE_RADIUS,
    lotMargin: o.lotMargin === undefined ? LOT_MARGIN : o.lotMargin,
    // ROUND 72 -- the alley is what makes "twice as large" a lie if it is left
    // alone. classifyTile lays a lane down the MIDDLE of every block as well as
    // around it, so doubling the block and keeping the alley gives you the same
    // plots you had, with one more lane through them. Measured on the first
    // pass: Vashra's streets came out 22 tiles apart, exactly the old spacing,
    // with the block nominally at 44. A grid asked to double suppresses it.
    alleyTiles: o.alleyTiles === undefined ? ALLEY_TILES : o.alleyTiles,
    // `null` is a MEANINGFUL value here and `undefined` is not, so the test is
    // for the property rather than for falsiness: Vashra has no guildmaster's
    // lawn to keep clear, and passing null must punch no hole in its grid.
    guildLot: 'guildLot' in o ? o.guildLot : GUILD_LOT,
  };
}

// Classify a single world tile (tx,ty already tile-grid coords) relative to
// the town center. Mirrors the original's per-tile loop shape.
export function classifyTile(tx, ty, tileSize, center, opts) {
  const G = gridOptions(opts);
  const BLOCK_SIZE = G.blockSize, CITY_RADIUS = G.cityRadius,
        TOWN_SQUARE_RADIUS = G.squareRadius, GUILD_LOT = G.guildLot;
  const wx = tx * tileSize + tileSize / 2, wy = ty * tileSize + tileSize / 2;
  const dx = wx - center.x, dy = wy - center.y;
  const dist = Math.hypot(dx, dy);
  const ax = Math.abs(dx), ay = Math.abs(dy);

  let t = TILE_GRASS;
  if (dist < TOWN_SQUARE_RADIUS) {
    t = TILE_PLAZA;
  } else if (dist < CITY_RADIUS) {
    // ROUND 19 -- measured in WHOLE TILES from the road's centre line, so a
    // road is exactly N tiles across everywhere rather than "however many
    // tile centres happened to fall inside a world-space band". `band(k, n)`
    // is true for the n tiles straddling a centre line k tiles away.
    const tdx = Math.round(dx / tileSize), tdy = Math.round(dy / tileSize);
    const blockTiles = Math.round(BLOCK_SIZE / tileSize);
    const band = (v, n) => {
      const half = Math.floor(n / 2);
      return v >= -half && v <= (n - 1 - half);
    };
    const onAvenue = band(tdx, AVENUE_TILES) || band(tdy, AVENUE_TILES);
    const modTiles = (v) => ((v % blockTiles) + blockTiles) % blockTiles;
    const nearestGrid = (v) => { const m = modTiles(v); return m <= blockTiles - m ? m : m - blockTiles; };
    const onStreet = band(nearestGrid(tdx), STREET_TILES) || band(nearestGrid(tdy), STREET_TILES);
    const halfBlock = blockTiles / 2;
    const nearestHalf = (v) => nearestGrid(v) - (nearestGrid(v) >= 0 ? halfBlock : -halfBlock);
    const onAlley = G.alleyTiles > 0
      && (band(nearestHalf(tdx), G.alleyTiles) || band(nearestHalf(tdy), G.alleyTiles));
    if (onAvenue || onStreet || onAlley) t = TILE_STREET;
  }

  // ROUND 31 -- "The north half of the plaza should be paved rings full
  // circle." The guild lot is still reserved (computeBuildingSpots keeps
  // buildings off it, which is the job that actually matters), but it no
  // longer punches a grass rectangle through the town square: it used to
  // strip the plaza's whole northern half, so round 30's concentric rings
  // came out as a three-quarter disc. Outside the plaza the lot still reads
  // as grass, so the guildmaster's approach keeps its lawn.
  const inPlaza = dist < TOWN_SQUARE_RADIUS;
  if (!inPlaza && GUILD_LOT
      && wx >= center.x + GUILD_LOT.x0 && wx <= center.x + GUILD_LOT.x1
      && wy >= center.y + GUILD_LOT.y0 && wy <= center.y + GUILD_LOT.y1) {
    t = TILE_GRASS;
  }

  return t;
}

// "Made ground" -- paving of any kind. Read by the forest and rock scatters
// (nothing grows out of a street), by the legacy wall ring (a wall never
// crosses a road) and by findRoadDirection. TILE_CITY belongs here for the
// first two reasons: the city square is paved, so no oak grows in it.
export function isRoadTile(t) { return t === TILE_STREET || t === TILE_PLAZA || t === TILE_PATH || t === TILE_CITY; }

// ROUND 50 -- a CARRIAGEWAY, which is a narrower thing than "made ground".
//
// findRoadDirection below asks "which way is the road" so a building can turn
// to face it and hang its doorstep on that side. It used isRoadTile, and
// isRoadTile is true of the ground the building is STANDING on: every tile
// inside the capital's wall is paved. So the search hit a "road" one step away
// in all four directions, the tie went to whichever it tried first -- north,
// dirs[0] -- and every civic building in Cadence put its door on its back
// wall, seven tiles up-screen of the front door. That is the user's round-50
// item 4 exactly, and item 5 is the same fault seen at the temples.
//
// A courtyard is not a street. TILE_CITY is deliberately absent here.
export function isCarriagewayTile(t) { return t === TILE_STREET || t === TILE_PLAZA || t === TILE_PATH; }

// Building lots -- one quadrant-offset lot per city block, same shape as the
// original's nested bi/bj/qx/qy loop.
export function computeBuildingSpots(opts) {
  const G = gridOptions(opts);
  const BLOCK_SIZE = G.blockSize, CITY_RADIUS = G.cityRadius,
        TOWN_SQUARE_RADIUS = G.squareRadius, LOT_MARGIN = G.lotMargin,
        GUILD_LOT = G.guildLot;
  const spots = [];
  const maxB = Math.ceil((CITY_RADIUS + BLOCK_SIZE) / BLOCK_SIZE);
  for (let bi = -maxB; bi < maxB; bi++) {
    for (let bj = -maxB; bj < maxB; bj++) {
      const bx = (bi + 0.5) * BLOCK_SIZE, by = (bj + 0.5) * BLOCK_SIZE;
      const bdist = Math.hypot(bx, by);
      if (bdist < TOWN_SQUARE_RADIUS + BLOCK_SIZE * 0.4) continue;
      if (bdist > CITY_RADIUS - BLOCK_SIZE * 0.32) continue;
      for (const qx of [-1, 1]) for (const qy of [-1, 1]) {
        const lx = bx + (qx * BLOCK_SIZE) / 4, ly = by + (qy * BLOCK_SIZE) / 4;
        const ldist = Math.hypot(lx, ly);
        if (ldist < TOWN_SQUARE_RADIUS + LOT_MARGIN || ldist > CITY_RADIUS - LOT_MARGIN) continue;
        if (GUILD_LOT && lx > GUILD_LOT.x0 - LOT_MARGIN && lx < GUILD_LOT.x1 + LOT_MARGIN && ly > GUILD_LOT.y0 - LOT_MARGIN && ly < GUILD_LOT.y1 + LOT_MARGIN) continue;
        spots.push({ x: lx, y: ly });
      }
    }
  }
  return spots;
}

// --- Building atlas layout, verbatim from the original (TOWN_CELL etc,
// lines 3298-3305) -- these numbers are exact, not rescaled (they're a
// sprite-sheet layout, unrelated to the town's world-space size).
export const TOWN_CELL = 150;
// v3 (round 4): bumped from 1.45 -> ~3.14 -- see BUILDING_RADIUS's comment
// above for the full footprint-to-tile-grid derivation this scale exists to
// satisfy ("the houses should be able to fit very neatly onto the grid as a
// 5x5 or 4x5 [tile grid]"). Chosen from the widest measured native building
// footprint (~102px at TOWN_CELL=150) so that building renders at exactly a
// 5-tile screen-diamond width (320px); narrower buildings land around 4.2
// tiles wide. Pending empirical screenshot verification, same as every
// scale constant re-derived this round.
// ===========================================================================
// ROUND 254 (item 5) -- EVERYTHING IN A TOWN, A TENTH SMALLER.
//
//   "Shrink all of the houses, and buildings by 10%. The quality is looking a
//    little rough with how big we've made most of the structures."
//
// WRITTEN AS A FACTOR ON THE MEASURED NUMBER rather than as a new number. 3.14
// is not arbitrary -- the paragraphs above derive it from the art's native
// width and the five-tile footprint the user asked for -- and typing 2.83 here
// would throw that derivation away and leave a number nobody could check. The
// factor is separate so the shrink can be read, argued with, or undone.
//
// IT REACHES EVERYTHING DERIVED FROM IT, which is the point: the forge, the
// quest board, the fences and the lamp posts all scale off this constant, and
// a town whose houses shrank while its fences did not would look worse than
// the town that prompted the request.
export const BUILDING_SHRINK = 0.90;
export const TOWN_DISPLAY_SCALE_FULL = 3.14;
export const TOWN_DISPLAY_SCALE = TOWN_DISPLAY_SCALE_FULL * BUILDING_SHRINK;
export const TOWN_FOOT_X = 75, TOWN_FOOT_Y = 144;
// UPDATE (this round): the building packs were re-uploaded with all 8 real
// rotations (north/northeast/east/southeast/south/southwest/west/
// northwest) instead of the 4 the atlas used to have, so
// extract_town_buildings.py rebuilt town_singletons.png/town_pool.png as
// 8-column atlases -- one real drawn column per direction, no more
// relabeling trick. Column order matches iso.js's own PLAYER_DIR_ORDER
// exactly, so `findBuildingFacing` below can just reuse the shared
// `facingFromMove` snapper every other directional sprite in the game
// already uses, instead of a bespoke building-only snap function.
export const TOWN_CARDINALS = PLAYER_DIR_ORDER;
// ===========================================================================
// ROUND 80 ITEM 1 -- THE WALL FACING RULE IS GONE, ON THE USER'S OWN CALL.
//
//   "The walls in cadence have been messed up. They should not have been
//    touched as now they are all rotated out of being continuous walls.
//    Revert the walls."
//
// Round 79 read item 6.3 as a rule about which way each border's masonry
// faces, and turned every course one step clockwise so no two sides of the
// square were drawn from the same angle. Seen from above that looked right
// to me; walked, it is not. The castle-wall sprite is not a flat face that
// can be rotated freely -- it is a SEGMENT WITH ENDS, and a run of them only
// reads as one continuous wall while every course in the run shares a facing
// AND that facing is the one whose ends line up along the run. Turn the
// courses and each one is a separate slab standing at an angle to its
// neighbours; the wall stops being a wall.
//
// So the whole rule is withdrawn -- not softened, not kept behind a flag.
// `wallFacingFor`, `WALL_END_ON_FACINGS` and `WALL_FACING_BY_BORDER` are
// removed, and the three call sites go back to the literals they had before,
// which is the arrangement the user is describing as correct. The one thing
// worth keeping from the round is the measurement, recorded here so a future
// round does not rediscover it: a broadside course is 276-310px wide and an
// end-on one is 118px. That is why a wall wants a fixed facing per run
// rather than a computed one.
// ===========================================================================

export const TOWN_CARDINAL_COL = Object.fromEntries(PLAYER_DIR_ORDER.map((dir, i) => [dir, i]));
// Columns per row in town_singletons.png/town_pool.png -- one real frame
// per PLAYER_DIR_ORDER entry (see extract_town_buildings.py). WorldScene.js
// uses this instead of a hardcoded 8 so the atlas layout has one source of
// truth.
export const TOWN_ATLAS_COLS = PLAYER_DIR_ORDER.length;
export const TOWN_SINGLETON_ROWS = ['tavern', 'blacksmith', 'auction', 'questboard'];
export const TOWN_POOL_ROWS = [
  'roman_native', 'roman_slate_blue', 'roman_forest_green', 'roman_sandstone', 'roman_wine_red', 'roman_mossy_teal',
  'greek_native', 'greek_slate_blue', 'greek_charcoal', 'greek_sandstone', 'greek_wine_red', 'greek_mossy_teal',
  'sign_native', 'sign_slate_blue', 'sign_forest_green', 'sign_sandstone', 'sign_charcoal',
  // ROUND 187 -- four new house families, APPENDED. The order matters: these
  // are row indices into town_pool.png and the seventeen above them are the
  // rows that atlas already had, copied across pixel for pixel by
  // tools/extract_round187_art.py because their source art is not in the
  // repository. Adding at the end is what keeps every existing index valid.
  'stone_a_native', 'stone_a_slate_blue', 'stone_a_sandstone', 'stone_a_wine_red', 'stone_a_mossy_teal',
  'stone_b_native', 'stone_b_slate_blue', 'stone_b_sandstone', 'stone_b_wine_red', 'stone_b_mossy_teal',
  'stone_c_native', 'stone_c_slate_blue', 'stone_c_sandstone', 'stone_c_wine_red', 'stone_c_mossy_teal',
  'stone_d_native', 'stone_d_slate_blue', 'stone_d_sandstone', 'stone_d_wine_red', 'stone_d_mossy_teal',
];

/**
 * ROUND 187 -- THE BUILDINGS THAT DO NOT FIT A TOWN CELL.
 *
 * The Adventure Society hall, the auction house and the three aristocratic
 * mansions are drawn at 240px of content against a house's 115. TOWN_CELL is
 * 150, so they cannot share the pool's grid -- and growing TOWN_CELL would
 * re-cut both existing atlases and move every frame index in the game for the
 * sake of five buildings.
 *
 * So they get their own atlas at exactly double: cell 300, foot (150, 288),
 * which is 150 and 144 doubled to the pixel. A mansion therefore stands twice
 * a house's height, which is the ratio the art was drawn at, and the foot
 * anchor lands in the same place on the tile.
 *
 * The society and auction rows REPLACE the old assets -- see TOWN_SINGLETON_ROWS,
 * which keeps its auction row so existing frame indices stay valid, and
 * TOWN_LARGE_REPLACES, which is what says the old one is no longer drawn.
 */
export const TOWN_LARGE_CELL = 300;
export const TOWN_LARGE_FOOT_X = 150, TOWN_LARGE_FOOT_Y = 288;
export const TOWN_LARGE_ROWS = [
  'society', 'auction',
  'mansion_a_native', 'mansion_a_slate_blue', 'mansion_a_forest_green', 'mansion_a_sandstone', 'mansion_a_charcoal',
  'mansion_b_native', 'mansion_b_slate_blue', 'mansion_b_forest_green', 'mansion_b_sandstone', 'mansion_b_charcoal',
  'mansion_c_native', 'mansion_c_slate_blue', 'mansion_c_forest_green', 'mansion_c_sandstone', 'mansion_c_charcoal',
];
/** Which singleton each large row supersedes, so nothing draws both. */
export const TOWN_LARGE_REPLACES = { society: 'guild', auction: 'auction' };
/** The three mansion families, each with its recolours, for the estate quarter. */
export const MANSION_FAMILIES = ['mansion_a', 'mansion_b', 'mansion_c'];

/**
 * ROUND 187 -- fencing, hedges and ponds for the aristocratic grounds.
 *
 * Shares TOWN_CELL rather than inventing a third cell size: the widest of them
 * is a 144px pond, which fits 150 with room for the anchor. `fence` and `hedge`
 * carry all eight real drawn rotations, so they turn like the city wall does;
 * the four ponds carry one each and are written across all eight columns.
 */
export const ESTATE_PROP_ROWS = ['fence', 'hedge', 'pond_1', 'pond_2', 'pond_3', 'pond_4'];
export const POND_ROWS = ESTATE_PROP_ROWS.filter(r => r.startsWith('pond_'));

// Walk outward in each of the 4 WORLD-cardinal directions from a building
// position until a road tile is found; face toward whichever is closest.
// Same search shape as the original's facingTowardRoad, but the result then
// goes through facingFromMove (iso.js) instead of being used raw -- that's
// the actual, complete fix.
//
// Note this will still only ever land on a screen DIAGONAL
// (northeast/southeast/southwest/northwest), never a screen cardinal, even
// though facingFromMove can return all 8 -- that's not a restriction coded
// in here, it's a property of the search above always feeding in a pure
// world-axis vector (0,-1)/(0,1)/(1,0)/(-1,0): under this projection a
// world-axis-aligned direction always renders on screen at +-26.57deg or
// +-153.43deg off horizontal, which is always closer to a 45deg diagonal
// than a 0/90deg cardinal (26.57 > 45-26.57). So a building "facing toward
// the road" can never legitimately read as facing screen-north/east/south/
// west here -- the north/east/south/west columns of the atlas exist (real
// art, not filler) but simply never get selected by this particular
// search, the same way they wouldn't for a human artist reasoning about
// which way these buildings should face on this street grid.
// --- Wrought Iron Fence (NEW round 3): the user's own words -- "I also
// added a wrought iron fence with 8 directions to create yards and some
// interesting areas in the town." Same object-format PixelLab export as the
// building packs (rotations only, no Idle/animation wrapper) -- extracted by
// extract_round3.py into fence.png, a 384x48 8-column atlas (one real drawn
// direction per PLAYER_DIR_ORDER column, cell=48), same convention as
// town_singletons.png/town_pool.png.
//
// buildFenceYard lays a rectangular perimeter of fence panels around a
// world-space rect and picks each panel's facing the same principled way
// findBuildingFacing does: run the edge's OUTWARD world-axis normal through
// the shared facingFromMove snapper instead of guessing a screen direction
// by hand. Because a world-axis vector under this iso projection always
// resolves to a screen DIAGONAL (see the giant header comment above), all
// four edges of a world-aligned rectangle each get one consistent diagonal
// facing -- north edge panels all face 'northeast', south edge panels all
// face 'southwest', etc -- which reads correctly on screen and needs no
// per-panel special-casing.
export const FENCE_CELL = 48;
export const FENCE_DISPLAY_SCALE = 1.1;

/**
 * ROUND 268 -- WHERE A WROUGHT-IRON PANEL'S POSTS STAND, per diagonal frame of
 * `estate_props.png` row 0, in SOURCE pixels of its 150px cell.
 *
 * MEASURED, not estimated (the column-height profile of each frame: the two
 * posts are the only 6px-wide runs 47-52px tall, one at each end). Every
 * fence in the game is drawn with one of these four frames -- the compass rule
 * maps each map side to a diagonal -- so these are the only four that matter.
 *
 *   span   -- post centre to post centre, horizontally. Two panels laid this
 *             far apart SHARE a post; any further and there is daylight.
 *   footX, footY -- the midpoint of the line through the two posts' feet. The
 *             panel's run passes through here, so this is the origin a panel
 *             is hung from: its posts then stand ON its line, and two sides of
 *             a property meet in one post at the corner.
 *
 * The old spacing was 76px -- the SOUTH frame's width, which no fence uses --
 * and the old origin was the cell's generic foot (75, 144), eighteen pixels
 * below where these panels' feet actually are.
 */
export const FENCE_PANEL_FIT = {
  northeast: { span: 56, footX: 75.5, footY: 126 },
  southwest: { span: 58, footX: 74.5, footY: 128 },
  southeast: { span: 58, footX: 76.5, footY: 128 },
  northwest: { span: 56, footX: 75.5, footY: 126 },
};
/** Half a post, so a crop keeps the post it stops at. */
export const FENCE_POST_HALF = 3;
// ROUND 28 -- the garden fence replaces the wrought-iron one around the
// farmstead yard ("a garden fence object to replace the fence around the
// garden area"). Its own cell size, because the art is 68px and this
// project stopped downscaling source art to match older constants -- see
// extract_round28_gardenfence.py. The display scale is what reconciles the
// two: the old fence drew 47px of content at 1.1 (about 52 on screen), the
// new one draws 55px, so 0.95 lands it at the same on-screen width and the
// panels still abut into a continuous run at the unchanged 48-unit spacing.
export const GARDEN_FENCE_CELL = 68;
export const GARDEN_FENCE_DISPLAY_SCALE = 0.95;
// Panel spacing, in WORLD units, and it is not the same number as the panel's
// on-screen width -- which is the whole reason the old 48 left gaps.
// buildFenceYard walks each edge along a world axis, and under this iso
// projection a world axis is a screen DIAGONAL: a step of n world units moves
// a panel n px across and n/2 px down, so the centres end up n * sqrt(1.25) =
// 1.118n px apart on screen. The diagonal rotations draw about 45px wide at
// the display scale above, so 48 units put the centres 54px apart and opened a
// ~9px gap in every run. Wrought iron survived that (a railing is meant to have
// gaps); a picket fence just looked broken. 38 units puts them 42.5px apart,
// which overlaps the pickets slightly and reads as one continuous fence.
export const GARDEN_FENCE_SPACING = 38;
// ROUND 27 -- the farmstead yard's rect, promoted out of WorldScene to a
// constant here because three things now need to agree on it: the fence that
// rings it, the garden ground laid inside it, and the tree/rock scatter that
// has to stay out of it. Offsets are relative to the town origin.
export const FENCE_YARD = { ox: 1341, oy: 1917, w: 330, h: 240 };
// ROUND 27 -- garden beds. Tile ids 0-7 are town/water (above), 8-11 are the
// interior floors and void (interiors.js); 12 continues that one flat
// numbering rather than starting a parallel array, for the same reason the
// water tiles did -- this.tileType is read by collision, the ground renderer
// and the minimap, and every one of those stays a single lookup this way.
export const TILE_GARDEN = 12;
export function buildFenceYard(cx, cy, w, h, spacing = 48) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  // At least 3 samples per axis so every edge (including a short one) gets
  // a real interior panel, not just its two shared corners.
  const nx = Math.max(3, Math.round(w / spacing) + 1);
  const ny = Math.max(3, Math.round(h / spacing) + 1);
  const panels = [];
  for (let i = 0; i < nx; i++) {
    const x = x0 + (x1 - x0) * (i / (nx - 1));
    panels.push({ x, y: y0, facing: facingFromMove(0, -1) }); // north edge, outward = -y
    panels.push({ x, y: y1, facing: facingFromMove(0, 1) });  // south edge, outward = +y
  }
  for (let j = 1; j < ny - 1; j++) {
    const y = y0 + (y1 - y0) * (j / (ny - 1));
    panels.push({ x: x0, y, facing: facingFromMove(-1, 0) }); // west edge, outward = -x
    panels.push({ x: x1, y, facing: facingFromMove(1, 0) });  // east edge, outward = +x
  }
  return panels;
}

// ROUND 22 -- split out of findBuildingFacing so the raw world-axis result
// is reusable. Interiors need the DIRECTION itself, not the screen facing it
// snaps to: a building's doorstep has to be placed on the side of the
// building the road is actually on, which is a world-space offset, and the
// 8-way facing string has already thrown away the information needed to
// compute one. findBuildingFacing keeps its exact previous behaviour by
// calling this and snapping the result, so no existing placement moves.
export function findRoadDirection(wx, wy, tileTypeAt, tileSize, maxSteps = 40) {
  const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
  let best = null, bestDist = Infinity;
  for (const d of dirs) {
    for (let step = 1; step <= maxSteps; step++) {
      const tx = Math.floor((wx + d.dx * step * tileSize) / tileSize);
      const ty = Math.floor((wy + d.dy * step * tileSize) / tileSize);
      if (isCarriagewayTile(tileTypeAt(tx, ty))) {
        const dist = step * tileSize;
        if (dist < bestDist) { bestDist = dist; best = d; }
        break;
      }
    }
  }
  return best;
}

export function findBuildingFacing(wx, wy, tileTypeAt, tileSize, maxSteps = 40) {
  const best = findRoadDirection(wx, wy, tileTypeAt, tileSize, maxSteps);
  if (!best) return 'southeast';
  return facingFromMove(best.dx, best.dy);
}

// ===========================================================================
// ROUND 78 (6.2) -- "Cadence needs at least 4 more houses"
// ===========================================================================
//
// NOT in cadence.js, which carries a "GENERATED ... Do not hand-edit" banner
// and is re-exported from tiled/cadence.tmj whenever the map changes. Adding
// rows there would be correct until the next import silently deleted them.
//
// So the extra lots live here, in a hand-written list the scene reads
// alongside the generated one. When the Tiled map is next edited these can be
// drawn into it properly and this list emptied; until then it is the only
// place a house can be added without being thrown away.
//
// The six lots were CHOSEN BY SEARCH rather than by eye: every candidate is at
// least seven tiles from every existing house, civic building and temple, and
// has no road or water tile within two tiles of its footprint. Placing a house
// on a road is the one mistake here that would be obvious in a screenshot and
// invisible in the data.
export const CADENCE_EXTRA_HOUSES = [
  [-36, -40, 'east'],
  [-13, -40, 'southeast'],
  [-6, -39, 'east'],
  [1, -39, 'southeast'],
  [15, -39, 'east'],
  [32, -39, 'southeast'],
];
