// ROUND 22 -- INTERIOR SPACES.
//
// The user's ask: "Is it possible to create interior spaces for the houses,
// auction house, and/or blacksmith?" -- scoped (via their answer) to the
// BLACKSMITH, the AUCTION HOUSE and the GUILD HALL, with the user supplying
// the interior art.
//
// -----------------------------------------------------------------------
// WHY THE ROOMS LIVE IN THE SAME WORLD MAP, NOT A SEPARATE PHASER SCENE
// -----------------------------------------------------------------------
// The obvious instinct is one Phaser Scene per interior. That would be the
// wrong call for THIS codebase, and expensively so: WorldScene is a ~4,600
// line single scene that owns literally everything -- the player entity and
// its world position, the whole DOM UI layer (inventory, essences, hotbar,
// shop, dialogue, quest board, minimap), ability cooldowns, projectiles,
// pickups, floating combat text, collision, and the occlusion-fade
// registry. A second scene inherits none of it; every one of those systems
// would need either duplicating or hoisting into a shared registry, which
// is a multi-round refactor with a large regression surface across the
// essence/awakening architecture the user has explicitly told us not to
// disturb.
//
// So instead: an interior is a WALLED ROOM built out of ordinary world
// tiles, standing in a reserved district out in a far corner of the
// existing 390x390 map, and a door is a TELEPORT between the building's
// exterior doorstep and the room's entry pad. The player never leaves
// WorldScene, so every system above keeps working inside a room for free --
// you can open your inventory, swap essences, drink a potion, take a swing,
// and have a shop conversation indoors on day one, with no new code.
//
// This is not a hack; it is how a great many 2D RPGs actually ship
// interiors (the "interior map region" pattern), and it is chosen here for
// the concrete reason above rather than out of convenience.
//
// -----------------------------------------------------------------------
// WHERE THE ROOMS SIT, AND WHY THEY ARE IN THREE DIFFERENT CORNERS
// -----------------------------------------------------------------------
// The map is 390 tiles (12,480 world units) square with the town at its
// centre (6240, 6240). Everything the world generates is placed by RADIUS
// from that centre:
//
//   * classifyTile   -- plaza/streets only inside CITY_RADIUS (1950)
//   * generateForest -- trees out to mapHalf - 250      = 5,990
//   * generateRocks  -- rocks out to mapHalf - 200      = 6,040
//   * buildSpawnSample -- monsters out to CITY_RADIUS + 4100 = 6,050
//
// So any spot more than ~6,050 units from town centre is untouched by every
// outdoor system at once, and the map's corners are ~8,800 units out. Each
// room therefore gets its OWN corner -- north-west, north-east, south-west --
// with the nearest point of each room's reserved area sitting 6,640-7,170
// units from town centre, clear of the furthest of those four radii.
//
// Three corners rather than one shared district, because of a problem the
// first version of this actually had and testing caught: at zoom 1.6 the
// camera sees roughly 984 x 759 screen px, an isometric room 18 tiles across
// is about 1,024 px wide on screen, and three rooms packed into one 1,600
// unit district were therefore all VISIBLE AT ONCE -- standing at the anvil
// you could see the auction house and the guild hall floating in the
// distance. Ten thousand units apart, no two rooms can ever share a frame.
//
// Around each room, VOID_MARGIN_TILES of dead black floor (TILE_VOID) is
// stamped over the ordinary map. That ring is deliberately SMALL, because it
// is not what hides the outdoors: WorldScene simply does not draw a ground
// tile that is not an interior tile while the player is inside a room, and
// paints the camera's own background the same void colour, so the frame
// beyond the walls is uniformly dark however far the camera can see. Sizing
// the ring to cover the whole viewport instead was the first attempt and it
// does not fit -- the auction house's corner of the map is not wide enough to
// hold the ~27 tiles of margin that would need, and pushing the room inward
// to make room drags its exclusion zone back inside the radius where trees
// and rocks generate, which would leave a bald void-coloured patch of
// wilderness visible from outside. The ring's real job is just to keep
// generation clear of the walls.
//
// WorldScene applies an explicit exclusion rule anyway (see
// `insideInteriorDistrict`, used by _buildForest/_buildObstacles), because a
// silent dependency on four unrelated tuning constants staying where they
// are is exactly the kind of thing that breaks three rounds later.
//
// -----------------------------------------------------------------------
// PLACEHOLDER ART
// -----------------------------------------------------------------------
// The user is generating the interior art. Everything here is therefore
// built against a NAMED ART CONTRACT (floor key, wall key, prop key) that
// WorldScene resolves to real textures when they exist and to generated,
// clearly-labelled placeholders when they don't -- so the art landing is a
// drop-in, not a rebuild. See ROUND22_INTERIOR_ART_SPEC.md.

import { TILE, facingFromMove } from './iso.js';
import { DEN_ROOMS } from './dens.js';
import { caveLayout, caveTileAt, caveFloorTiles } from './caveShapes.js';
import { WELL_DUNGEON_ROOMS } from './wellDungeons.js';
import { wellDungeonLayout, wellDungeonTileAt, wellDungeonFloorTiles, wellDungeonWalkable } from './wellDungeonGen.js';
import { REALM_LIST, REALM_TILES, realmGrid } from './astral.js';
// ROUND 130 -- the soul space's own grid. See SOUL_ROOM below.
import { SOUL_TILES, SOUL_VOID, soulGrid } from './soulSpace.js';
import { ASTRAL_BAND_Y0 } from './regions.js';

import { SEWER_MAP, SEWER_PROPS } from './sewer.js';
// ROUND 262 -- a layout may name a piece of FURNITURE as well as a round-23
// prop: the beds, the nightstands, the rug and the counter are on their own
// sheet. furniture.js imports nothing, so this cannot close a cycle.
import { FURN_BY_KEY, barRun, BAR_WALL_GAP_TILES, FURN_WALL_TILES,
  doorFacingForWall, wallOfTile } from './furniture.js';
import { VEHICLE_ROOMS } from './vehicleInteriors.js';
import { buildMansionPool } from './mansions.js';

// --- Tile-type ids for interior floors ------------------------------------
// town.js owns 0-7 (grass/path/plaza/street + the four water looks). These
// continue that single flat Uint8Array numbering rather than introducing a
// parallel array, for the same reason the water tiles did: this.tileType is
// read by collision, the ground renderer and the minimap cache, and every
// one of those stays a single flat lookup this way.
export const TILE_FLOOR_FORGE = 8;   // blacksmith -- soot-dark flagstone
export const TILE_FLOOR_MARBLE = 9;  // auction house -- pale polished stone
export const TILE_FLOOR_HALL = 10;   // guild hall -- broad timber boards
export const TILE_VOID = 11;         // the dark nothing beyond a room's walls
// ROUND 78 (7.5) -- ice, for Elehyd's caves. 15 because 12, 13 and 14 are
// already spoken for (accent, dock, city) and a floor id must not collide with
// an outdoor one -- they share `this.tileType`.
export const TILE_FLOOR_ICE = 15;
// ROUND 82 -- THE SEWER, and the first interior with two tile types in one
// room. 16 and 17 were the next free ids (town.js owns 0-7 and 12-14; 8-11 and
// 15 are above).
//
// `TILE_FLOOR_SEWER` is wet brick the player walks on. `TILE_SEWER_WATER` is
// the channel, and it is deliberately NOT a floor: it is in INTERIOR_IDS so
// the renderer draws it indoors, and it answers `isWaterTile` (town.js) so
// every mover in the game already refuses to walk into it -- which is the
// whole trick. The channel needed no new collision, no new pathing rule and no
// new hazard: forty-odd `_isWaterAt` call sites were already asking the right
// question about it.
//
// The art is a placeholder pending the user's own sewer tiles: the floor
// borrows the forge's soot flagstone and the channel borrows Bratugal's murky
// bog water, which is the darkest, least river-like water pack in the build.
// Both are one line in INTERIOR_FLOOR_ART / the renderer when the real tiles
// arrive.
export const TILE_FLOOR_SEWER = 16;
export const TILE_SEWER_WATER = 17;

// ROUND 78 -- A SET, NOT A RANGE.
//
// These were `t >= TILE_FLOOR_FORGE && t <= TILE_FLOOR_HALL`, which is correct
// exactly while every floor id is contiguous and silently wrong the first time
// one is not. Adding ice at 15 is that first time: as a range test it would
// have made ice "not an interior floor", so the renderer would have fallen
// through to the outdoor branch and an ice cave would have been drawn as
// grass -- and `isInteriorTile` would have said a cave floor was outdoors,
// which is what the void test, the collision map and the minimap all read.
//
// A membership test cannot rot that way, and this project has now found the
// same shape of bug -- a check keyed off a list that stopped covering its
// roster -- in the audio tables, the death sounds, the weapon voices and the
// spawn-group sleeper. It is HANDOFF's fault class two and it is worth twenty
// bytes of Set to be rid of one more instance.
// ROUND 130 -- ONE GROUND TYPE FOR THE SOUL SPACE.
//
//   "Use various grass and earth tiles for the ground." ...then:
//   "Only use 1 single plain grass tile."
//
// It shipped as two floors of sixteen variants apiece -- turf under the plots,
// meadow on the path, hashed per tile. That is what "various" bought, and it
// was too much: the ground competed with the planting, which is the thing the
// room is about. ONE tile, everywhere, and the floor recedes.
//
// Still an interior FLOOR, which is the part that matters structurally -- the
// void test, the collision map and the minimap all read that, and an ordinary
// outdoor tile here would be culled and the room would render black.
export const TILE_FLOOR_SOULGRASS = 18;
const FLOOR_IDS = new Set([TILE_FLOOR_FORGE, TILE_FLOOR_MARBLE, TILE_FLOOR_HALL, TILE_FLOOR_ICE,
  TILE_FLOOR_SEWER, TILE_FLOOR_SOULGRASS]);
// ROUND 82 -- the channel is an INTERIOR tile (so it is drawn indoors and so
// the void test, the collision map and the minimap all know where it is) but
// NOT a floor (so nothing treats it as standable). That distinction is exactly
// what the two sets are for.
const INTERIOR_IDS = new Set([...FLOOR_IDS, TILE_VOID, TILE_SEWER_WATER]);
export function isInteriorFloor(t) { return FLOOR_IDS.has(t); }
export function isInteriorTile(t) { return INTERIOR_IDS.has(t); }

// How much void is stamped around each room, and how far outdoor generation
// is kept away from it -- see the siting note above for why this is a small
// ring and not a viewport-sized one.
export const VOID_MARGIN_TILES = 8;

// --- Art contract ----------------------------------------------------------
// One entry per art key the rooms reference. WorldScene loads
// `public/assets/<file>` if it is present and otherwise generates a labelled
// placeholder with the same frame layout, so the two paths are
// interchangeable. `variants` is how many frames a floor sheet holds (the
// ground renderer picks one per tile from the usual tileVariantHash, exactly
// like grass).
export const INTERIOR_FLOOR_ART = {
  // ROUND 266 -- cut from sbs_stone, sbs_tile and sbs_wood at their native
  // 128x64 (tools/extract_round266_floors.py). The counts are what that
  // script writes; `groundCellFaults` checks the SIZE against the loaded
  // texture and round 23's rule checks the COUNT the same way, so a subset
  // changed there and not here is caught rather than silently mis-sliced.
  forge:  { key: 'floorForge',  file: 'interior_floor_forge.png',  variants: 4 },
  marble: { key: 'floorMarble', file: 'interior_floor_marble.png', variants: 4 },
  hall:   { key: 'floorHall',   file: 'interior_floor_hall.png',   variants: 4 },
  // ROUND 78 (7.5) -- "Tiles 109-124 should be in ice caves, small 'dungeons'
  // available within region 3."
  //
  // The ice+rune pack has been loaded and drawn NOWHERE since round 37: it is
  // one of the eight region packs shipped "in preparation for" regions that
  // then never named it. This is the first thing to ask for it, and it does not
  // need new art or a new sheet -- it needs the pack the game already has to be
  // reachable as an interior floor, which is what this entry is.
  //
  // The file is the region pack itself rather than an `interior_floor_*` sheet,
  // so there is one copy of these sixteen tiles in the build rather than two.
  ice:    { key: 'region_ice_rune', file: 'region_ice_rune.png', variants: 16 },
  // ROUND 130 -- the soul space's own ground. Sixteen variants apiece, which is
  // what makes it "various": the renderer hashes a variant per tile, so a plot
  // of grass is never the same tile twice in a row.
  // ONE VARIANT, and its own file. `variants` picks from index 0 upward, so a
  // single plain tile cannot be selected out of a sixteen-tile pack by counting
  // -- the plain one is index 5 of the meadow. So it is cut out into a file of
  // its own (tools/sheet_round128_garden.py), which is also the honest way to
  // say "this is the soul's ground" rather than "this is the fifth meadow tile".
  soulGrass: { key: 'soul_grass', file: 'soul_grass.png', variants: 1 },
  // ROUND 83 -- THE SEWER HAS ITS OWN STONE NOW.
  //
  //   "Lets palette shift the grey city tile more of a brown/green"
  //
  // Round 82 borrowed the forge's soot flagstone, and it looked borrowed: the
  // forge floor is a workshop floor, laid flat and swept. This is the grey
  // city paving -- the same big cracked slabs Harrowmoor is paved with, which
  // is the right SHAPE for a sewer -- run through a gradient map that puts
  // green in the cracks and wet clay brown on the lit faces. See
  // extract_round83_sewer_tiles.py, which is also where the two recolour
  // approaches that do not work are written down.
  sewer:  { key: 'floorSewer', file: 'sewer_floor.png', variants: 3 },
};
/** ROUND 82 -- the channel's art, kept beside the floors it is not one of.
 *
 *  ROUND 83 -- and it is green now, off `water_deep` rather than off dark
 *  slate, so the channel moves like water instead of sitting there like a
 *  paved gutter. Three frames, not four: the source sheet's fourth is empty
 *  and the extractor drops it, because the sewer picks its variant by hashing
 *  the tile position and would otherwise put a hole in the floor one time in
 *  four. */
export const SEWER_WATER_ART = { key: 'sewerWater', file: 'sewer_water.png', variants: 3 };
// Walls are 8-rotation object packs shaped exactly like the existing fence
// (town.js's FENCE_CELL / buildFenceYard): one real drawn frame per
// PLAYER_DIR_ORDER column, indexed with the shared dirRow() helper.
//
// TWO wall pieces per room, and the split is load-bearing rather than
// decorative. Under this projection the room's SOUTH and EAST runs have a
// higher painter's depth (isoDepth = wx + wy) than anything standing inside
// the room, so a full-height wall there would draw ON TOP of the player and
// hide them completely whenever they walked near the front of the room. The
// standard 2D-iso answer is to leave the camera-facing side open; this uses
// a low trim instead of nothing at all, so the room still reads as enclosed
// without ever swallowing the character.
export const INTERIOR_WALL_ART = {
  back:  { key: 'wallBack',  file: 'interior_wall_back.png',  cell: 160, scale: 1.0 },
  front: { key: 'wallTrim',  file: 'interior_wall_trim.png',  cell: 160, scale: 1.0 },
};
// ROUND 23 -- one drawn panel spans TWO tiles of wall. Not a stylistic
// choice: the delivered art draws a wall section 54-59px wide against a 32px
// tile step, i.e. it IS a two-tile section, and squeezing it to one tile
// would have halved the wall's height along with its length and left a
// waist-high room. Colliders stay one per tile regardless (see WALL_RADIUS
// below) -- the sealing arithmetic depends on that spacing, and sprites and
// colliders have no reason to share a stride.
export const WALL_RUN_TILES = 2;
// The panel's anchor within its cell: horizontally centred, and vertically at
// 80% -- the base line's MIDPOINT, because the base of a diagonal wall run is
// a slant, not a level edge. extract_round23_interiors.py packs to this exact
// point.
export const WALL_ORIGIN_X = 0.5, WALL_ORIGIN_Y = 0.8;
// World-space collision radius per wall panel. 16 is not a guess -- it is
// the value that makes the ring both SEALED and NON-INTRUSIVE, given panels
// one tile (32 units) apart and a 12-unit player radius:
//   sealed      -- the player is stopped within 16+12 = 28 units of a panel
//                  centre, and the furthest a point on the wall line can be
//                  from the nearest panel centre is 16 (the midpoint), so
//                  the blocked bands overlap and there is no gap to squeeze
//                  through anywhere along the run;
//   non-intrusive -- the wall line sits half a tile outside the floor, so a
//                  floor-edge tile's centre is 32 units from the panel
//                  centre, comfortably outside that same 28-unit stop
//                  distance. The player can stand on every floor tile,
//                  including the ones against the wall.
// Both properties break if this grows past ~20, so it is derived here rather
// than tuned by eye.
export const WALL_RADIUS = 16;

// Props are single-view sprites (no rotations), packed one per cell in a
// single atlas -- same shape as the round-21 rock pack.
//
// ROUND 23 -- 80px cells, which is what the delivered art needs: the source
// objects are 56, 64 and 72px and are packed at NATIVE size (cropped to
// content, bottom-anchored) rather than rescaled to their collision
// footprint the way the rocks were. These objects are already drawn in
// proportion with each other and with the player; rescaling each one to its
// `tiles` value -- what round 22's spec asked for -- would have overridden
// the artist's own sense of scale to satisfy a number only movement cares
// about. Display size and collision size are two knobs here, deliberately.
export const INTERIOR_PROP_ART = { key: 'interiorProps', file: 'interior_props.png', cell: 80, cols: 8 };

// Prop catalogue -- ROUND 23, rebuilt around the art that actually arrived.
//
// Round 22 guessed at a 27-prop set and drew a labelled box for each. The
// user then sent 66 real objects across five packs, which is both more than
// the guess and DIFFERENT from it, so the catalogue is now named after what
// the art is rather than what the spec asked for.
//
// `src` is the label on the round-23 contact sheet (/tmp/r23_props_contact.png
// as reviewed, regenerated by extract_round23_interiors.py) -- SMITH6 is the
// seventh blacksmith object, FURN0 the first furniture object, and so on.
// Naming the source that way means the mapping below can be checked against a
// PICTURE rather than against a folder listing, which is the only review that
// actually catches "the anvil is a barrel".
//
// `idx` is the atlas cell. `tiles` is the COLLISION footprint in tiles and is
// deliberately independent of display size: the props are drawn at native
// scale (they are already in proportion with each other and with the player
// as the artist drew them), so rescaling each one to its collision number
// would have thrown away the artist's own sense of scale to satisfy a value
// only movement cares about.
export const INTERIOR_PROPS = {
  // --- smithy ---
  forgeLarge:    { idx: 0,  src: 'SMITH1',  label: 'Stone forge',      tiles: 2.0, solid: true },
  forgeSmall:    { idx: 1,  src: 'SMITH0',  label: 'Iron forge',       tiles: 1.2, solid: true },
  anvil:         { idx: 2,  src: 'SMITH6',  label: 'Anvil',            tiles: 1.4, solid: true },
  anvilStand:    { idx: 3,  src: 'SMITH11', label: 'Anvil stand',      tiles: 1.0, solid: true },
  quenchTrough:  { idx: 4,  src: 'SMITH3',  label: 'Quench trough',    tiles: 1.4, solid: true },
  coalTray:      { idx: 5,  src: 'SMITH4',  label: 'Coal tray',        tiles: 1.4, solid: true },
  bellows:       { idx: 6,  src: 'SMITH5',  label: 'Bellows',          tiles: 1.4, solid: true },
  workbench:     { idx: 7,  src: 'SMITH7',  label: 'Workbench',        tiles: 1.6, solid: true },
  ingotStack:    { idx: 8,  src: 'SMITH8',  label: 'Ingot stack',      tiles: 1.4, solid: true },
  toolBench:     { idx: 9,  src: 'SMITH9',  label: 'Tool bench',       tiles: 1.6, solid: true },
  weaponRack:    { idx: 10, src: 'SMITH10', label: 'Weapon rack',      tiles: 1.4, solid: true },
  smithDesk:     { idx: 11, src: 'SMITH12', label: 'Whetstone desk',   tiles: 1.6, solid: true },
  choppingBlock: { idx: 12, src: 'SMITH2',  label: 'Chopping block',   tiles: 1.0, solid: true },

  // --- auction lots ---
  vaseGlass:     { idx: 13, src: 'AUCT0',   label: 'Glass vase',       tiles: 0.8, solid: true },
  sculpture:     { idx: 14, src: 'AUCT1',   label: 'Sculpture',        tiles: 0.8, solid: true },
  idol:          { idx: 15, src: 'AUCT2',   label: 'Carved idol',      tiles: 0.8, solid: true },
  gemCase:       { idx: 16, src: 'AUCT3',   label: 'Gem under glass',  tiles: 0.8, solid: true },
  vasePorcelain: { idx: 17, src: 'AUCT4',   label: 'Porcelain vase',   tiles: 0.8, solid: true },
  scrollStand:   { idx: 18, src: 'AUCT5',   label: 'Scroll stand',     tiles: 1.0, solid: true },
  jugGlazed:     { idx: 19, src: 'AUCT6',   label: 'Glazed jug',       tiles: 0.8, solid: true },
  amphora:       { idx: 20, src: 'AUCT7',   label: 'Amphora',          tiles: 0.8, solid: true },
  paintLandscape:{ idx: 21, src: 'AUCT8',   label: 'Landscape',        tiles: 1.2, solid: true },
  jewelCase:     { idx: 22, src: 'AUCT9',   label: 'Jewel case',       tiles: 1.2, solid: true },
  paintPortrait: { idx: 23, src: 'AUCT10',  label: 'Portrait',         tiles: 1.2, solid: true },
  coinCase:      { idx: 24, src: 'AUCT11',  label: 'Coin case',        tiles: 1.2, solid: true },

  // --- furniture ---
  rostrum:       { idx: 25, src: 'FURN0',   label: 'Rostrum',          tiles: 1.2, solid: true },
  tableRed:      { idx: 26, src: 'FURN1',   label: 'Red table',        tiles: 1.6, solid: true },
  stoolRound:    { idx: 27, src: 'FURN2',   label: 'Stool',            tiles: 0.7, solid: true },
  chairPadded:   { idx: 28, src: 'FURN3',   label: 'Padded chair',     tiles: 0.8, solid: true },
  tableSmall:    { idx: 29, src: 'FURN4',   label: 'Small table',      tiles: 1.0, solid: true },
  chairWhite:    { idx: 30, src: 'FURN5',   label: 'Pale chair',       tiles: 0.8, solid: true },
  tableRound:    { idx: 31, src: 'FURN6',   label: 'Round table',      tiles: 1.2, solid: true },
  chairPlain:    { idx: 32, src: 'FURN7',   label: 'Chair',            tiles: 0.8, solid: true },
  tableLong:     { idx: 33, src: 'FURN8',   label: 'Long table',       tiles: 2.0, solid: true },
  tableDark:     { idx: 34, src: 'FURN9',   label: 'Dark table',       tiles: 1.4, solid: true },
  benchLow:      { idx: 35, src: 'FURN10',  label: 'Bench',            tiles: 1.6, solid: true },
  tableRoundBig: { idx: 36, src: 'FURN11',  label: 'Round table',      tiles: 1.4, solid: true },
  rockingChair:  { idx: 37, src: 'FURN12',  label: 'Rocking chair',    tiles: 0.9, solid: true },
  stoolWood:     { idx: 38, src: 'FURN13',  label: 'Wood stool',       tiles: 0.7, solid: true },
  stoolSquare:   { idx: 39, src: 'FURN14',  label: 'Square stool',     tiles: 0.7, solid: true },
  sideboard:     { idx: 40, src: 'FURN15',  label: 'Sideboard',        tiles: 1.6, solid: true },

  // --- fire ---
  brazierBowl:   { idx: 41, src: 'FIRE0',   label: 'Coal brazier',     tiles: 1.0, solid: true },
  hearthStone:   { idx: 42, src: 'FIRE1',   label: 'Stone hearth',     tiles: 2.0, solid: true },
  fireplacePale: { idx: 43, src: 'FIRE2',   label: 'Pale fireplace',   tiles: 2.0, solid: true },
  fireplaceLit:  { idx: 44, src: 'FIRE3',   label: 'Marble fireplace', tiles: 2.0, solid: true },
  stoveIron:     { idx: 45, src: 'FIRE4',   label: 'Iron stove',       tiles: 1.0, solid: true },
  washTub:       { idx: 46, src: 'FIRE5',   label: 'Wash tub',         tiles: 1.0, solid: true },
  brazierIron:   { idx: 47, src: 'FIRE6',   label: 'Iron brazier',     tiles: 1.0, solid: true },
  hearthRustic:  { idx: 48, src: 'FIRE7',   label: 'Rustic hearth',    tiles: 2.0, solid: true },
  fireplaceCone: { idx: 49, src: 'FIRE8',   label: 'Cone fireplace',   tiles: 1.0, solid: true },
  stoveTiled:    { idx: 50, src: 'FIRE9',   label: 'Tiled stove',      tiles: 1.4, solid: true },
  firePit:       { idx: 51, src: 'FIRE10',  label: 'Fire pit',         tiles: 1.2, solid: true },
  potbelly:      { idx: 52, src: 'FIRE11',  label: 'Potbelly stove',   tiles: 1.0, solid: true },
  stoveCage:     { idx: 53, src: 'FIRE12',  label: 'Caged stove',      tiles: 1.0, solid: true },

  // --- city / general ---
  benchStone:    { idx: 54, src: 'CITY0',   label: 'Stone bench',      tiles: 1.6, solid: true },
  barrelStack:   { idx: 55, src: 'CITY1',   label: 'Barrels',          tiles: 1.4, solid: true },
  well:          { idx: 56, src: 'CITY2',   label: 'Well',             tiles: 1.4, solid: true },
  fishStall:     { idx: 57, src: 'CITY3',   label: 'Ice counter',      tiles: 1.8, solid: true },
  handcart:      { idx: 58, src: 'CITY4',   label: 'Handcart',         tiles: 1.6, solid: true },
  armourPile:    { idx: 59, src: 'CITY5',   label: 'Armour pile',      tiles: 1.4, solid: true },
  jugCluster:    { idx: 60, src: 'CITY6',   label: 'Pottery',          tiles: 1.4, solid: true },
  crateProduce:  { idx: 61, src: 'CITY7',   label: 'Produce crates',   tiles: 1.6, solid: true },
  fountain:      { idx: 62, src: 'CITY8',   label: 'Fountain',         tiles: 1.6, solid: true },
  planter:       { idx: 63, src: 'CITY9',   label: 'Planter',          tiles: 1.0, solid: true },
  sacks:         { idx: 64, src: 'CITY10',  label: 'Grain sacks',      tiles: 1.4, solid: true },
  marketStall:   { idx: 65, src: 'CITY11',  label: 'Stall',            tiles: 2.0, solid: true },

  // Placed automatically by WorldScene at every room's door gap (not listed
  // in any room's `props`) -- it is what makes the exit READ as an exit. The
  // gap in the trim is sealed by an invisible collider (see buildRoomWalls'
  // 'door' piece) so the player can never walk out into the void beside the
  // room; the mat is the visual cue that this is the tile to press interact
  // on. No source art, and it does not want any: it is a floor marking, not
  // furniture, so the extractor draws it from the floor's own palette.
  doorMat:       { idx: 66, src: 'generated', label: 'Doorway',        tiles: 2.0, solid: false },

  // =========================================================================
  // ROUND 78 (item 8.1) -- FURNITURE AND REMAINS.
  //
  //   8.1.1  "Beds, benches, pews, podiums"
  //   8.1.2  "Assets such as skeletal remains for caves and quests"
  //
  // Appended to the same atlas as everything above (indices 67-97), so all of
  // it works with the placement, palette-recolour and solid-collision code
  // that already places a barrel. `src` is the pack tag from
  // extract_round78_objects.py, so a row here can be checked against the
  // contact sheet the way the round-23 entries can.
  //
  // NAMED FROM THE RENDER, not from the prompt: the pack's prompt is the same
  // sentence for all fifteen pieces ("Beds, benches, pews, podiums"), so the
  // only way to tell a four-poster from a footstool is to look at it.
  //
  // `tiles` is how many floor tiles wide the piece draws. Beds are big, a
  // footstool is not, and a skeleton lies flat -- these are eyeballed against
  // the 80px cell the same way the round-23 set was.

  // --- beds ---
  bedRough:      { idx: 68, src: 'SEAT1',  label: 'Rough bed',        tiles: 1.8, solid: true },
  bedIron:       { idx: 69, src: 'SEAT2',  label: 'Iron-framed bed',  tiles: 1.8, solid: true },
  bedQuilt:      { idx: 71, src: 'SEAT4',  label: 'Quilted bed',      tiles: 1.8, solid: true },
  bedCanopy:     { idx: 73, src: 'SEAT6',  label: 'Canopied bed',     tiles: 2.0, solid: true },
  // --- benches and seating ---
  benchRed:      { idx: 67, src: 'SEAT0',  label: 'Padded bench',     tiles: 1.4, solid: true },
  benchWood:     { idx: 70, src: 'SEAT3',  label: 'Wooden bench',     tiles: 1.4, solid: true },
  // ROUND 90 -- RENAMED, because it was a duplicate key and JS kept the later
  // one. `benchStone` was declared twice: idx 54 (CITY0, the street bench) up
  // in the city block, and this one, added by round 78's object pass. The
  // object literal therefore held 97 entries where the table reads as 98, the
  // CITY0 bench was unreachable by name, and both of its consumers --
  // cityProps.js's street furniture and the temple prop list in dens.js --
  // silently drew FURN5 instead. Renamed here rather than there: the city
  // bench had the name first and two things ask for it by that name.
  benchStonePlain: { idx: 72, src: 'SEAT5',  label: 'Plain stone bench', tiles: 1.4, solid: true },
  footstool:     { idx: 76, src: 'SEAT9',  label: 'Footstool',        tiles: 0.8, solid: false },
  benchSlab:     { idx: 77, src: 'SEAT10', label: 'Stone slab bench', tiles: 1.4, solid: true },
  benchIron:     { idx: 79, src: 'SEAT12', label: 'Iron-backed bench', tiles: 1.4, solid: true },
  benchGarden:   { idx: 81, src: 'SEAT14', label: 'Garden bench',     tiles: 1.4, solid: true },
  // --- podiums, lecterns and the shrine niche ---
  podiumPale:    { idx: 74, src: 'SEAT7',  label: 'Pale podium',      tiles: 1.0, solid: true },
  shrineNiche:   { idx: 75, src: 'SEAT8',  label: 'Shrine niche',     tiles: 1.2, solid: true },
  podiumCarved:  { idx: 78, src: 'SEAT11', label: 'Carved pulpit',    tiles: 1.2, solid: true },
  podiumPlain:   { idx: 80, src: 'SEAT13', label: 'Plain podium',     tiles: 1.0, solid: true },

  // --- 8.1.2, the remains. NONE of them are solid: they are things you find
  // on a floor, and a skeleton you cannot walk over is a wall with a joke on
  // it. `tiles` is small for the same reason -- these lie down.
  boneStanding:  { idx: 82, src: 'BONE0',  label: 'Standing remains', tiles: 1.2, solid: false },
  bonePair:      { idx: 83, src: 'BONE1',  label: 'Two of them',      tiles: 1.4, solid: false },
  boneCurled:    { idx: 84, src: 'BONE2',  label: 'Curled remains',   tiles: 0.9, solid: false },
  boneSplayed:   { idx: 85, src: 'BONE3',  label: 'Splayed remains',  tiles: 1.3, solid: false },
  boneSeated:    { idx: 86, src: 'BONE4',  label: 'Seated remains',   tiles: 1.1, solid: false },
  boneScatter:   { idx: 87, src: 'BONE5',  label: 'Scattered bones',  tiles: 1.2, solid: false },
  boneSerpent:   { idx: 88, src: 'BONE6',  label: 'Something long',   tiles: 1.5, solid: false },
  boneSupine:    { idx: 89, src: 'BONE7',  label: 'Laid-out remains', tiles: 1.3, solid: false },
  bonePartial:   { idx: 90, src: 'BONE8',  label: 'Part of someone',  tiles: 0.9, solid: false },
  boneMossy:     { idx: 91, src: 'BONE9',  label: 'Mossed remains',   tiles: 1.2, solid: false },
  boneWalking:   { idx: 92, src: 'BONE10', label: 'Fallen mid-stride', tiles: 1.2, solid: false },
  boneRubble:    { idx: 93, src: 'BONE11', label: 'Remains in rubble', tiles: 1.4, solid: false },
  boneBare:      { idx: 94, src: 'BONE12', label: 'Bare remains',     tiles: 1.2, solid: false },
  boneOld:       { idx: 95, src: 'BONE13', label: 'Old remains',      tiles: 1.2, solid: false },
  bonePale:      { idx: 96, src: 'BONE14', label: 'Pale remains',     tiles: 1.2, solid: false },
  boneCrawling:  { idx: 97, src: 'BONE15', label: 'Crawling remains', tiles: 1.2, solid: false },

  // --- ROUND 175, the burned rubble. Eleven images that arrived with the
  // round 170 pack and were not extracted; round 173's note carried them as
  // still unused. They are what is LEFT of a building, so unlike the remains
  // above they are SOLID and they are BIG: you walk round a collapsed roof,
  // and a heap of charred beams you can stroll through is scenery rather than
  // a ruin. 1.6 to 2.2 tiles, varied so a street of them does not read as one
  // stamp repeated -- the eleven are eleven different pictures and the sizes
  // say so.
  rubbleBurned0:  { idx:  98, src: 'RUBBLE0',  label: 'Charred beams',      tiles: 1.8, solid: true },
  rubbleBurned1:  { idx:  99, src: 'RUBBLE1',  label: 'Burned wreckage',    tiles: 2.1, solid: true },
  rubbleBurned2:  { idx: 100, src: 'RUBBLE2',  label: 'Collapsed timber',   tiles: 2.0, solid: true },
  rubbleBurned3:  { idx: 101, src: 'RUBBLE3',  label: 'A fallen roof',      tiles: 1.9, solid: true },
  rubbleBurned4:  { idx: 102, src: 'RUBBLE4',  label: 'Blackened rubble',   tiles: 1.7, solid: true },
  rubbleBurned5:  { idx: 103, src: 'RUBBLE5',  label: 'Scorched remains of a wall', tiles: 1.8, solid: true },
  rubbleBurned6:  { idx: 104, src: 'RUBBLE6',  label: 'Burnt-out frame',    tiles: 2.0, solid: true },
  rubbleBurned7:  { idx: 105, src: 'RUBBLE7',  label: 'Ash and beams',      tiles: 1.8, solid: true },
  rubbleBurned8:  { idx: 106, src: 'RUBBLE8',  label: 'What the fire left',  tiles: 2.2, solid: true },
  rubbleBurned9:  { idx: 107, src: 'RUBBLE9',  label: 'Charred planking',   tiles: 1.9, solid: true },
  rubbleBurned10: { idx: 108, src: 'RUBBLE10', label: 'A burned doorway',   tiles: 1.6, solid: true },
};
/** ROUND 175 -- the eleven, in atlas order, for the fallen-city pass. Named
 *  here rather than rebuilt from a prefix match at each call site, because a
 *  list derived from key spelling is fault class four waiting for the twelfth
 *  one to be called something else. */
export const BURNED_RUBBLE_PROPS = [
  'rubbleBurned0', 'rubbleBurned1', 'rubbleBurned2', 'rubbleBurned3',
  'rubbleBurned4', 'rubbleBurned5', 'rubbleBurned6', 'rubbleBurned7',
  'rubbleBurned8', 'rubbleBurned9', 'rubbleBurned10',
];
// ROUND 78 -- 67 -> 98. Read by the atlas-frame declaration and the
// placeholder generator, so it must match what extract_round78_objects.py
// actually wrote; the suite asserts the two agree.
export const INTERIOR_PROP_COUNT = 109;

// --- Rooms -----------------------------------------------------------------
// `x`/`y` are the room's north-west floor corner in ABSOLUTE world units;
// `w`/`h` are its floor size in TILES. The door is a gap of `door.span`
// tiles in the SOUTH wall starting at floor column `door.at` -- south
// because that is the camera-facing side, so the player walks in "toward"
// the screen the way they do through every exterior door in the game.
//
// `building` names which town singleton this room belongs to
// (TOWN_SINGLETON_ROWS in town.js); WorldScene matches on it to place the
// exterior doorstep. 'guild' has no singleton row of its own -- the guild
// hall is placed by hand on GUILD_LOT (see _buildGuildHall).
//
// Prop positions are floor-tile coordinates (0,0 = the room's north-west
// floor tile), so a room can be resized without re-typing every prop.
// ROUND 285 (item 6) -- THE SOCIETY HALL'S TABLES, LAID OUT RATHER THAN
// SCATTERED. Nine a side of the aisle (tiles 8-13, the door is 10-11), three
// columns by three rows, the same spacing on both sides. All face the same
// way so the rows read as rows.
const GUILD_TABLE_COLS = [3, 5, 7, 14, 16, 18];
const GUILD_TABLE_ROWS = [7, 10, 13];
const GUILD_HALL_TABLES = GUILD_TABLE_ROWS.flatMap(ty => GUILD_TABLE_COLS.map(tx =>
  ({ key: 'tableRed', tx, ty, face: 'southwest' })));
// ...and a few chairs, pulled up to the front row and the middle row's ends.
// SCALED TO THE TABLE: the house chair is drawn at 0.4 of a tile (round 263
// halved it), which beside the hall's long tables left a chair whose back did
// not reach the tabletop. 1.45x puts the back just over it.
const GUILD_CHAIR_SCALE = 1.45;
const GUILD_HALL_CHAIRS = [
  [3, 13], [7, 13], [14, 13], [18, 13], [5, 10], [16, 10],
].map(([tx, ty]) => ({ key: 'chairPlain', tx, ty: ty + 0.9, face: 'northeast', scale: GUILD_CHAIR_SCALE }));

export const INTERIOR_ROOMS = [
  {
    id: 'blacksmith',
    building: 'blacksmith',
    name: "Emberhold Smithy",
    enterLabel: 'enter the smithy',
    floor: 'forge',
    x: 400, y: 400, w: 18, h: 14,   // north-west corner
    door: { at: 8, span: 2 },
    props: [
      // Against the north back wall: the fire end of the shop.
      { key: 'forgeLarge',    tx: 2,  ty: 1 },
      { key: 'bellows',       tx: 4,  ty: 1 },
      { key: 'coalTray',      tx: 6,  ty: 1 },
      { key: 'workbench',     tx: 12, ty: 1 },
      { key: 'toolBench',     tx: 14, ty: 1 },
      // West wall: stock.
      { key: 'ingotStack',    tx: 1,  ty: 7 },
      { key: 'barrelStack',   tx: 1,  ty: 11 },
      // Working floor.
      { key: 'anvil',         tx: 1,  ty: 5 },
      { key: 'anvilStand',    tx: 9,  ty: 1 },
      { key: 'quenchTrough',  tx: 1,  ty: 2 },
      // East wall: finished goods.
      { key: 'weaponRack',    tx: 16, ty: 1 },
      { key: 'weaponRack',    tx: 7,  ty: 1 },
      { key: 'smithDesk',     tx: 14, ty: 5 },
      // Front of shop.
      { key: 'crateProduce',  tx: 3,  ty: 11 },
      { key: 'brazierIron',   tx: 6,  ty: 11 },
      { key: 'brazierIron',   tx: 10, ty: 11 },
      { key: 'barrelStack',   tx: 16, ty: 12 },
      { key: 'forgeSmall',    tx: 10, ty: 1 },
    ],
    npcs: [
      {
        // ROUND 78 -- the counter moved to Bram; Hessa keeps the forge. Two
        // vendors of the same goods in one room is a choice the player cannot
        // make, and she is standing at the anvil, which is not where a till
        // goes.
        // ROUND 90 -- and she is the BLACKSMITH'S BENCH. She was the obvious
        // choice: she already keeps the forge and takes no coin, so giving her
        // the commission screen adds a second thing the smithy is for without
        // adding a second till to a room round 78 deliberately cut down to one.
        name: 'Hessa Coalwright', artKey: 'npc_muscular_adventurer_v1', facing: 'south',
        tx: 6, ty: 3, shopId: null, benchKey: 'blacksmith',
        dialogue: "Bram takes the coin. I take the heat. We settled that the year he burned his hand open trying to do both.",
      },
      {
        // ROUND 78 (bug 1) -- in from the square. At the smith's desk on the
        // east wall (prop `smithDesk`, tx 15 ty 9), facing west across it, so
        // he is behind a counter rather than standing in the middle of a room
        // holding a shop.
        name: 'Bram the Smith', artKey: 'shopkeeper', facing: 'west',
        tx: 15, ty: 5, shopId: 'weapon', dialogue: null,
      },
      {
        // ROUND 90 -- THE ARMOURSMITH, and she is a second person at the same
        // doorway rather than a second building. CRAFTING_SPEC.md section 1
        // made that call and gave the reason: "one doorway, two people at it."
        // Every armour slot she works in already exists in stats.js, so she
        // needs no new equip plumbing on the day she opens.
        name: 'Vessa Ordran', artKey: 'npc_female_adventurer', facing: 'east',
        tx: 3, ty: 9, shopId: null, benchKey: 'armoursmith',
        dialogue: null,
      },
      {
        name: 'Soot', artKey: 'npc_peasant_man_v2', facing: 'southwest',
        tx: 13, ty: 5, shopId: null,
        dialogue: "Apprentice work is ninety parts hauling coal and one part hitting something. Hessa says the tenth part is knowing which.",
      },
    ],
  },
  {
    id: 'auction',
    building: 'auction',
    name: 'Greyquill Auction House',
    enterLabel: 'enter the auction house',
    floor: 'marble',
    x: 11000, y: 400, w: 20, h: 16, // north-east corner
    door: { at: 9, span: 2 },
    props: [
      // Back wall: the headline lots, hung where the room can see them.
      { key: 'paintLandscape', tx: 3,  ty: 1 },
      { key: 'paintPortrait',  tx: 5,  ty: 1 },
      { key: 'gemCase',        tx: 14, ty: 1 },
      { key: 'coinCase',       tx: 16, ty: 1 },
      // West and east walls: the rest of the catalogue, on display.
      { key: 'vaseGlass',      tx: 1,  ty: 4 },
      { key: 'sculpture',      tx: 1,  ty: 6 },
      { key: 'idol',           tx: 1,  ty: 8 },
      { key: 'amphora',        tx: 1,  ty: 10 },
      { key: 'vasePorcelain',  tx: 18, ty: 4 },
      { key: 'jugGlazed',      tx: 18, ty: 6 },
      { key: 'scrollStand',    tx: 18, ty: 8 },
      { key: 'jewelCase',      tx: 18, ty: 10 },
      // Seating in two blocks either side of a centre aisle that lines up
      // with the door, so walking in puts you at the back of the room
      // looking down it at the rostrum.
      { key: 'benchLow',       tx: 4,  ty: 7 },
      { key: 'benchLow',       tx: 7,  ty: 7 },
      { key: 'benchLow',       tx: 12, ty: 7 },
      { key: 'benchLow',       tx: 15, ty: 7 },
      { key: 'benchLow',       tx: 4,  ty: 10 },
      { key: 'benchLow',       tx: 7,  ty: 10 },
      { key: 'benchLow',       tx: 12, ty: 10 },
      { key: 'benchLow',       tx: 15, ty: 10 },
      { key: 'sideboard',      tx: 17, ty: 13 },
      { key: 'brazierBowl',    tx: 2,  ty: 13 },
      { key: 'firePit',        tx: 4,  ty: 13 },
      { key: 'benchWood',      tx: 1,  ty: 1 },
    ],
    npcs: [
      {
        // ROUND 31 -- the auction house actually trades now. "This will
        // enable the player to purchase, gear, essence and awakening stones
        // from the auction house."
        // ROUND 50 -- off npc_noblewoman, which is the legless-reading
        // ballgown model the user pulled Lady Ilsevet for. She was the only
        // other character wearing it, so this retires it from the map.
        //
        // ROUND 196 -- and onto a model drawn for the job. She has stood at
        // the block in an adventurer's leathers for a hundred and forty
        // rounds because that was the nearest thing the game had; the round
        // that added an auctioneer in a dress suit gives her one.
        name: 'Auctioneer Valla Deyne', artKey: 'npc_auctioneer_f', facing: 'south',
        tx: 10, ty: 3, shopId: 'auction',
        dialogue: "Lot forty-one, a hydrix scale of confirmed provenance. I have eleven silver-rank coins standing — do I hear twelve? You, hunter, at the back. Twelve?",
      },
      {
        name: 'Clerk Ondrey', artKey: 'npc_noble_standing_v2', facing: 'west',
        tx: 15, ty: 13, shopId: null,
        dialogue: "Consignments go in the ledger before they go on the block. No ledger, no lot number, no sale. I've had that argument with better hunters than you.",
      },
      {
        // ROUND 90 -- THE JEWELCRAFTER, and this is a compromise stated rather
        // than hidden. CRAFTING_SPEC.md wanted him in his own shopfront, on
        // the grounds that "a jeweller sharing a forge reads wrong" -- which
        // is true, and is why he is NOT in the smithy. A new building is a
        // whole exterior, a doorstep and a lot on a street plan; the auction
        // house is where the valuables in this town already are, and a setter
        // working the room the lots come through reads better than a setter at
        // an anvil. His own shopfront is the honest next step.
        name: 'Sennic Vaile', artKey: 'npc_noble_standing_v1', facing: 'north',
        tx: 4, ty: 13, shopId: null, benchKey: 'jewelcrafter',
        dialogue: null,
      },
    ],
  },
  {
    id: 'guild',
    building: 'guild',
    // ROUND 242 -- 6.1: "It should say 'Press E to enter the Adventurer
    // Society Hall' not 'Press E to enter the Guild Hall'". The building has
    // been the Adventure Society's since round 2 and everything inside it says
    // so -- the registrar, the contract board, the reliquary -- while the door
    // label kept a generic fantasy-guild name from before the setting's own
    // institution had one. His spelling, verbatim.
    name: 'Adventurer Society Hall',
    enterLabel: 'enter the Adventurer Society Hall',
    floor: 'hall',
    x: 400, y: 11000, w: 22, h: 18, // south-west corner
    door: { at: 10, span: 2 },
    // ROUND 132 -- THE SOCIETY'S RELIQUARY.
    //
    //   "We need a chest that persists between saves to store found essences
    //    and awakening stones so that on a new game the player can pull from
    //    the essences they have found before."
    //
    // IN THE GUILD HALL, and the reason is diegetic rather than convenient.
    // The Adventure Society is the one institution a character of any rank has
    // standing with, it is the building every character in every run walks
    // into early, and a body that registers you, pays you and buries you is
    // exactly the body that would hold a deposit box for the one class of
    // property this world treats as irreplaceable. A chest in a house would
    // need a house; a chest in the open would need explaining.
    //
    // Declared here as an ANCHOR (a tile and a prop), not as a system: the
    // shape is deliberately the one `secret` already uses a few hundred lines
    // down -- a tile offset the scene turns into a world point, a proximity
    // test, a prompt, an E-key branch -- because that is the vocabulary the
    // player already knows for "walk to a thing in a room and use it".
    //
    // North-east corner, on the back wall past the tool bench, which is the
    // only stretch of that wall with nothing against it. The nine civic
    // Society Halls clone this field along with the props (see CIVIC_ROOMS),
    // so the reliquary is the SAME chest in every city -- one record, reached
    // from wherever the player happens to be, which is the whole point of a
    // deposit box and is also what the meditation fix this round is about.
    vault: { tx: 17, ty: 1, prop: 'jewelCase', label: 'open the Society reliquary' },   // ROUND 285 -- two along, the stairs have the corner
    // ROUND 133 -- THE DOOR TO THE MARKET.
    //
    // The user: "The adventurers guild (or adventure society) building needs
    // to split into 2 rooms. A main hall where zeke, Prism, and other random
    // adventurers hang out (with the adventure society theme) and a side room
    // (With the item shop theme) that's the adventurer society market."
    //
    // `inner` is a door between two INTERIORS, which this game has never had.
    // Round 102 wanted one and gave up: the western base's back room "is
    // reached from inside the western base and has no exterior at all", and
    // the implementation nevertheless hung it a second exterior building
    // outside, because there was no way to walk from one room to another.
    //
    // The shape is deliberately `secret`'s, three hundred lines down -- a tile
    // in the room, a proximity, a prompt, an E -- because that comment already
    // says why: it is "the SAME SHAPE as a doorway", which is the vocabulary
    // the player knows. What it needs that `secret` does not is a destination
    // and a way back, so it carries `toRoom` and the far room carries one
    // pointing home.
    //
    // East wall, opposite the hearth. The hall's own exterior door is on the
    // south wall at tile 10, so the two exits are on different walls and a
    // player leaving the market cannot walk out of the building by accident.
    // ROUND 269 (item 5) -- "Society Market upstairs". The market is the
    // hall's upper floor now: the way through is a flight of stairs against
    // the north wall, climbing into it, and the market's end is a flight down.
    inner: { tx: 20, ty: 1, toRoom: 'guild_market', label: 'go upstairs to the Society market' },
    // ROUND 283 -- AND A SECOND WAY THROUGH: THE RITUAL HALL.
    //
    //   Asked where the Ritual of ascension is performed: "Add a ritual hall
    //   to the adventure society."
    //
    // `inners` is the list the scene already reads (`_updateInnerDoorProximity`
    // takes `room.inners || [room.inner]`); `inner` stays as the first entry so
    // every reader of the single door still finds the market. A door on the
    // WEST wall at (1,14), below the sacks, which is one of the two walls a
    // door may hang on and a stretch of it nothing stands against.
    inners: [
      { tx: 20, ty: 1, toRoom: 'guild_market', label: 'go upstairs to the Society market' },
      { tx: 1, ty: 14, toRoom: 'guild_ritual', label: 'enter the Society ritual hall' },
    ],
    props: [
      { key: 'doorWood', face: 'southeast', tx: 1, ty: 14 },   // ROUND 283 -- to the ritual hall
    // ROUND 174 -- AND YOU CAN SEE IT FROM THE DOOR.
    //
    // The user: "Adventure society hall was supposed to split into 2 rooms,
    // what happened to that work?"
    //
    // Nothing happened to it. Measured in the running game: the hall carries
    // 32 props and its inner door, the market carries 22 and the door back,
    // both prompts fire, and walking hall -> market -> hall works. Zeke and
    // three adventurers stand in the hall; four brokers stand in the market.
    // The feature is there and he could not find it, which is a fault of
    // exactly the same weight.
    //
    // The door was an unmarked tile against a blank east wall with two tables
    // near it. Every OTHER way out of a room in this game has a doormat on
    // the floor in front of it (the hall's own exterior door at 9,13 has
    // one), so the one door with no mat is the one nobody looks for. Both
    // sides get one; `doorMat` is not solid, so it changes nothing but what
    // the player sees.
    // ROUND 263 (items 8, 8.1) -- A DOOR, AND ON A WALL A DOOR IS ALLOWED ON.
    //
    //   8)   "It should exclusively be used on the North or West faces of
    //         indoor environments... the object on the north wall needs to
    //         face southwest, and the object on the west wall needs to be
    //         facing southeast."
    //   8.1) "Stairs and doors should replace all internal room changes...
    //         No more highlighted tile."
    //
    // IT WAS ON THE EAST WALL, which is one of the two CAMERA-SIDE runs --
    // map east projects to the screen's lower right, and round 22's rule is
    // that nothing is drawn on those two runs because it would stand between
    // the camera and the room. So the mat could not simply become a door
    // where it stood; the transition itself moves, to the north wall in the
    // same corner of the hall. The market's end is already on ITS west wall
    // and stays where it is.
    // ROUND 285 (item 7) -- "Move them to the NorthEast corner and rotate
    // right 45°." The corner: the far end of the north wall. The turn is the
    // draw's (see `_placeRoomProps`): the flight now climbs INTO this wall.
    { key: 'stairFull', face: 'north', tx: 20, ty: 1 },   // ROUND 269 -- up to the market
      // Back wall: hearth, trophies, the guild's own kit.
      { key: 'hearthStone',   tx: 1,  ty: 1 },
      { key: 'armourPile',    tx: 7,  ty: 1 },
      { key: 'weaponRack',    tx: 12, ty: 1 },
      // ROUND 132 -- the reliquary itself. Its tile is declared twice on
      // purpose: once here so the room DRAWS something, once in `vault` above
      // so the scene knows where to put the prompt. The alternative -- the
      // scene minting a sprite off the `vault` anchor -- would be a second
      // prop pipeline for one object, and a prop that the occlusion fade, the
      // depth sort and the collision pass had never heard of.
      { key: 'jewelCase',     tx: 17, ty: 1 },   // ROUND 285 -- beside the stairs, not under them
      // West wall: stores.
      { key: 'barrelStack',   tx: 1,  ty: 5 },
      { key: 'crateProduce',  tx: 1,  ty: 8 },
      { key: 'sacks',         tx: 1,  ty: 11 },
      // Front of the hall.
      { key: 'brazierIron',   tx: 3,  ty: 15 },
      // Two long refectory tables down the middle.
      { key: 'tableLong',     tx: 4,  ty: 4 },
      { key: 'rostrum',       tx: 5,  ty: 3 },
      { key: 'rostrum',       tx: 3,  ty: 5 },
      { key: 'toolBench',     tx: 15, ty: 0 },
      // ROUND 285 (item 6) -- "Spread out the tables in the adventure
      // society: keep the same number of tables, spread them evenly with an
      // aisle from the entrance to the rear, add a few chairs scaled to the
      // table." Eighteen tables, nine a side in three rows of three, with the
      // aisle running up tiles 8-13 from the door (10-11) to the shrine on the
      // back wall. The long table and its two lecterns stay where they were.
      ...GUILD_HALL_TABLES,
      ...GUILD_HALL_CHAIRS,
      { key: 'shrineNiche',   tx: 10, ty: 1 },    // ROUND 285 -- the head of the aisle
      { key: 'rockingChair',  tx: 5,  ty: 15, face: 'northeast', scale: GUILD_CHAIR_SCALE },   // by the brazier
    ],
    npcs: [
      {
        name: 'Guild Clerk Petra Wynn', artKey: 'npc_female_adventurer_v1', facing: 'south',
        // ROUND 41 -- the clerk keeps the guild's small daily consignment of
        // common essences and awakening stones (see WorldScene._restockShop).
        //
        // ROUND 133 -- AND NOW SHE DOES NOT. The user: "Instead of 1 vendor
        // have 4 brokers." Her counter WAS the one vendor, so the shop comes
        // off her and the trade moves through the door on the east wall.
        //
        // She keeps everything else she was for: registration, appeals, death
        // benefits, and the line that tells a new player where the board is.
        // Her dialogue now also points at the market, because a room that
        // quietly stopped selling things needs somebody in it to say where
        // they went.
        // ROUND 133 -- `society: true` is what makes her a Society DESK now that
        // it is no longer implied by a shop counter. The nine branch clerks
        // have carried it from CIVIC_ROLE since round 103; Cadence's was the
        // one relying on her shelf.
        tx: 10, ty: 3, shopId: null, society: true,   // ROUND 285 -- at the head of the aisle
        dialogue: "Bounties are posted on the board outside — Yorin insists on it, says a hunter who won't stand in the rain to read a notice won't stand in it to fight either. Registration, appeals and death benefits are in here. Buying and selling is through the east door; the brokers keep their own hours and their own prices.",
      },
      {
        name: 'Ranger Adept Kolm', artKey: 'npc_grizzled_adventurer_v2', facing: 'southwest',
        tx: 6, ty: 9, shopId: null,   // ROUND 285 -- between the tables, not in one
        dialogue: "Iron rank's where most of us find out what we actually are. Confluence forms, the world gets louder, and half the room decides that's enough adventuring for one life.",
      },
      {
        // ROUND 121 -- THE AURA TRAINER, in the hall the user named.
        //
        //   "A simple training in the adventurers guild should suffice."
        //
        // He stands by the shrine niche on the back wall rather than at a
        // table, because what he teaches is a thing you do standing still, and
        // because the room's two counters are taken (round 78's rule about two
        // people selling the same goods applies to two people teaching in the
        // same doorway just as well).
        name: 'Aura-Adept Serevin Kade', artKey: 'npc_grizzled_adventurer_v1', facing: 'south',
        tx: 12, ty: 3, shopId: null, trainKey: 'auraControl',   // ROUND 285 -- by the shrine, which moved
        dialogue: null,
      },
    ],
  },
  // =========================================================================
  // ROUND 133 -- THE SOCIETY MARKET.
  //
  //   "a side room (With the item shop theme) that's the adventurer society
  //    market. Instead of 1 vendor have 4 brokers.
  //    2 with a randomized daily mix of essences and awakening stones, 1 with
  //    randomized armors, and 1 with randomized weapons."
  //
  // FOUR COUNTERS, FOUR WALLS. The brokers stand one to a side with their
  // stock behind them, which is what makes four vendors in one room read as a
  // market rather than as a queue: the player walks to the trade they want
  // instead of walking down a line.
  //
  // `building: null` and no exterior door -- this room is reached only through
  // the hall (see the `inner` entry above), so it must not also appear as a
  // doorstep on the street. `noExterior` is the flag `_buildInteriors` and the
  // astral realms already use to mean exactly that.
  //
  // Its id begins with `guild_market`, which is what audio.js keys the Item
  // Shop theme on, and why that rule is tested before the Society hall's.
  // =========================================================================
  {
    id: 'guild_market',
    building: null,
    noExterior: true,
    name: 'Society Market',
    enterLabel: 'enter the Society market',
    floor: 'hall',
    // Sited beside the guild hall's own corner. `resiteInteriorsIntoBand`
    // repacks every room into the reserved band anyway, so this is a starting
    // position and not a promise.
    x: 400, y: 12600, w: 20, h: 16,
    // A door with no span: nothing hangs a doorstep on it, and `roomEntryPoint`
    // still has an `at` to derive an arrival tile from.
    door: { at: 10, span: 0 },
    // The way back. Same shape, pointing home.
    inner: { tx: 1, ty: 8, toRoom: 'guild', label: 'go downstairs to the Society hall' },
    props: [
      // ROUND 174 -- the other side of the same door; see the hall's.
      // ROUND 263 (item 8) -- and it is a real door now. This end is on the
      // market's WEST wall, which is one of the two the rule allows, so it
      // stays where it is and faces south-east.
      // ROUND 269 (item 5) -- the head of the stairs down to the hall.
      { key: 'stairFull', face: 'west', tx: 1, ty: 8 },
      // North wall -- the relic counters, the two brokers who deal in
      // essences and stones. A case each, because that is what they sell out of.
      { key: 'gemCase',      tx: 4,  ty: 1 },
      { key: 'jewelCase',    tx: 6,  ty: 1 },
      { key: 'scrollStand',  tx: 8,  ty: 1 },
      { key: 'gemCase',      tx: 13, ty: 1 },
      { key: 'jewelCase',    tx: 15, ty: 1 },
      { key: 'coinCase',     tx: 11, ty: 1 },
      // East wall -- the armourer.
      { key: 'armourPile',   tx: 18, ty: 4 },
      { key: 'armourPile',   tx: 18, ty: 7 },
      { key: 'crateProduce', tx: 18, ty: 10 },
      // South wall -- the weapon broker.
      { key: 'weaponRack',   tx: 5,  ty: 14 },
      { key: 'weaponRack',   tx: 8,  ty: 14 },
      { key: 'toolBench',    tx: 11, ty: 14 },
      { key: 'barrelStack',  tx: 14, ty: 14 },
      // The room itself: somewhere to stand and something to lean on.
      { key: 'brazierIron',  tx: 3,  ty: 5 },
      { key: 'brazierIron',  tx: 16, ty: 12 },
      { key: 'tableRound',   tx: 9,  ty: 8 },
      { key: 'stoolWood',    tx: 8,  ty: 9 },
      { key: 'stoolWood',    tx: 10, ty: 9 },
      { key: 'barrelStack',  tx: 1,  ty: 2 },
      { key: 'sacks',        tx: 1,  ty: 5 },
      { key: 'crateProduce', tx: 1,  ty: 12 },
      { key: 'tableLong',    tx: 13, ty: 5 },
    ],
    npcs: [
      // THE TWO RELIC BROKERS. Two rather than one because the ask says two,
      // and the reason it is a good ask is that they roll SEPARATELY: two
      // independent daily draws is a market with something to compare, where
      // one draw is a shelf.
      {
        name: 'Broker Ilsa Ternmoor', artKey: 'npc_female_adventurer_v2', facing: 'south',
        tx: 6, ty: 3, shopId: 'society_relic_a',
        dialogue: "Everything on my side of the room came in this week and will be gone by next. I don't hold stock for sentiment.",
      },
      {
        name: 'Broker Hadwin Coss', artKey: 'npc_grizzled_adventurer_v2', facing: 'south',
        tx: 14, ty: 3, shopId: 'society_relic_b',
        dialogue: "Ilsa and I don't stock the same shelf and we don't split the difference. Walk both counters before you spend.",
      },
      {
        name: 'Armourer Mev Sallowbrand', artKey: 'npc_muscular_adventurer_v1', facing: 'west',
        tx: 16, ty: 7, shopId: 'society_armour',
        dialogue: "Plate, mail, boots, rings. What the Society takes off the dead, cleaned and priced honestly.",
      },
      {
        name: 'Quartermaster Dace Rill', artKey: 'npc_muscular_adventurer_v2', facing: 'north',
        tx: 10, ty: 12, shopId: 'society_weapon',
        dialogue: "Every haft on that rack has been swung by somebody who came back. Most of them, anyway.",
      },
      // ROUND 196 -- THE FIFTH COUNTER: TRANSPORT.
      //
      //   "transports are for sale in every city. Add a new vendor in the
      //    adventurer society market hall"
      //
      // ROUND 267 -- AND HE HAS GONE OUT TO THE YARD. "The vehicle sales
      // haven't been updated yet either" -- the location. He is called
      // Yardmaster, round 200 built a yard outside every walled settlement,
      // and he was selling wagons from a room with no window onto one while
      // every yard stood empty of people. `_staffStableYard` in WorldScene
      // puts one at each yard now, which is a wider net than the market halls
      // were rather than a narrower one, so round 196's "every city" still
      // holds. The entry is removed rather than left commented: a vendor in
      // two places is two shelves of the same stock.
    ],
  },
];

// ROUND 36 -- the eight temple interiors.
//
// "Give each temple an interior with no furniture but utilize the new tiles
// provided in gold, marble, and steel as appropriate to match the theme of
// the temple." So `props` is deliberately EMPTY for all eight -- the room is
// its floor, its walls and its god.
//
// The floors are the one place these rooms differ from every other interior:
// `templeGod` marks the room for the tile-ART layer WorldScene draws over
// the flat floor colour (see _paintTempleFloor). `floor` still names an
// ordinary flat kind underneath so that anything reading the tile map --
// collision, the minimap, the void test -- behaves exactly as it does for
// the smithy, with no new tile ids to teach it about.
//
// Rooms are laid out in a row well clear of the existing three (which sit at
// 400,400 / 11000,400 / 400,11000); districts are derived from these bounds
// automatically just below.
const TEMPLE_ROOM_GODS = ['death', 'dominion', 'healing', 'heros', 'knowledge', 'liberty', 'purity', 'war'];
const TEMPLE_ROOM_NAME = {
  death: 'Sanctum of the Last Door', dominion: 'Hall of the Seated Crown',
  healing: 'Garden of the Green Mercy', heros: 'Hall of Deeds Remembered',
  knowledge: 'Athenaeum of Ten Thousand Pages', liberty: 'Court of the Open Hand',
  purity: 'Chapel of the Unmarked', war: 'Armoury of the Unbroken Line',
};
export const TEMPLE_ROOMS = TEMPLE_ROOM_GODS.map((god, i) => ({
  id: `temple_${god}`,
  building: `temple_${god}`,
  name: TEMPLE_ROOM_NAME[god],
  enterLabel: 'enter the temple',
  floor: 'marble',
  templeGod: god,
  // ROUND 46 -- 18x14, matching the blacksmith exactly. The user's note: "the
  // walls in the blacksmith shop line up perfectly. Lets make the temples the
  // same internal size so that the walls line up nicely." The temples were
  // 16x14, two tiles narrower, which is why their wall runs did not meet the
  // corners the way the smithy's do. The door moves to 8 to stay centred on
  // the wider south wall.
  x: 400 + i * 1200, y: 20000, w: 18, h: 14,
  door: { at: 8, span: 2 },
  // =======================================================================
  // ROUND 78 (8.1.3) -- THE TEMPLES GET FURNITURE.
  //
  // The user, round 36: "Give each temple an interior with NO FURNITURE".
  // The user, round 78: "a 8 direction pew has been added allowing alongside
  // the podiums (and with some palette adjustments) to put some furniture
  // into the temples."
  //
  // So the empty room was correct for two years of rounds and is now
  // superseded, which is why the round-36 note above is left standing rather
  // than deleted -- it explains why `props` was empty, and this explains why
  // it is not any more.
  //
  // A PULPIT AND A SHRINE at the altar end, and the PEWS are placed by
  // WorldScene rather than listed here: a pew is an eight-rotation object
  // (temple_pew.png), and `props` entries are single-frame indices into the
  // prop atlas. Two nave rows of them, facing the altar, in `_seatTemple`.
  //
  // Placed clear of the god's wander box (the middle of the room) and of the
  // door run at ty 13, so neither the god nor the player ends up standing
  // inside the furniture.
  props: [
    { key: 'podiumCarved', tx: 9, ty: 2 },
    { key: 'shrineNiche', tx: 4, ty: 1 },
    { key: 'shrineNiche', tx: 14, ty: 1 },
    { key: 'benchStone', tx: 2, ty: 5 },
    { key: 'benchStone', tx: 16, ty: 5 },
  ],
}));
INTERIOR_ROOMS.push(...TEMPLE_ROOMS);

// ===========================================================================
// ROUND 283 -- THE SOCIETY RITUAL HALL.
//
//   "Add a ritual hall to the adventure society."
//
// Where a growth item is grown: the Ritual of ascension that closes every
// legendary's growth conditions is performed here, by the hall's ritualist,
// once everything else the conditions ask for is carried. A small stone room
// behind the Society hall's west door -- an altar niche on the back wall, the
// two idols either side of it, braziers in the corners and a round rug where
// the item is laid down.
// ===========================================================================
export const RITUAL_ROOM = {
  id: 'guild_ritual',
  building: null,
  noExterior: true,
  name: 'Society Ritual Hall',
  enterLabel: 'enter the Society ritual hall',
  floor: 'hall',
  x: 400, y: 13600, w: 14, h: 12,
  door: { at: 7, span: 0 },
  inner: { tx: 1, ty: 6, toRoom: 'guild', label: 'go back to the Society hall' },
  props: [
    { key: 'doorWood', face: 'southeast', tx: 1, ty: 6 },
    { key: 'shrineNiche', tx: 7, ty: 1 },
    { key: 'idol', tx: 5, ty: 1 },
    { key: 'idol', tx: 9, ty: 1 },
    { key: 'brazierBowl', tx: 2, ty: 2 },
    { key: 'brazierBowl', tx: 11, ty: 2 },
    { key: 'brazierBowl', tx: 2, ty: 9 },
    { key: 'brazierBowl', tx: 11, ty: 9 },
    { key: 'rugRound', tx: 7, ty: 6 },
  ],
  npcs: [
    {
      name: 'Ritualist Aurel Vantris', artKey: 'npc_grizzled_adventurer_v2', facing: 'south',
      tx: 7, ty: 3, shopId: null, ritualKey: 'ascension',
      dialogue: null,
    },
  ],
};
INTERIOR_ROOMS.push(RITUAL_ROOM);

// ROUND 64 -- and the den pool, for the caves, barrows and barns the landmarks
// put in the world. They join here rather than being a system of their own so
// that resiteInteriorsIntoBand, the floor stamping, the wall builder, the void
// test and the minimap all see them without being taught anything new. Which
// site claims which room is decided at world-build time; see dens.js.
INTERIOR_ROOMS.push(...DEN_ROOMS);

// ROUND 197 -- AND THE INSIDE OF EVERY VEHICLE.
//
// Pushed here rather than written above, because they are generated from the
// plans the user gave each vehicle (see vehicleInteriors.js). The import is
// one-way -- that file reads vehicles.js and nothing reads it back -- so there
// is no cycle to be careful about.
INTERIOR_ROOMS.push(...VEHICLE_ROOMS);

// ROUND 269 -- AND THE MANSIONS. A pool of eight-room, two-floor houses,
// re-dressed for whichever estate the player walks into; see mansions.js for
// why a pool rather than 184 rooms.
INTERIOR_ROOMS.push(...buildMansionPool());

// ROUND 88 -- GIVE EVERY DEN ITS SHAPE.
//
// `caveShapes.js` generates the layouts and `dens.js` carries the pool, but
// neither can own this: the layouts need TILE_VOID, and this file is the one
// that has it (importing it into caveShapes closes an interiors -> dens ->
// caveShapes -> interiors cycle). It is also simply the right place -- the
// sewer's `tileAt` is thirty lines further down, and the two now read as one
// idea rather than as one special case.
//
// `caveFamily` is set when a site claims the room (_claimDenRooms), because
// the shape depends on what kind of place it is. Until then the fallback picks
// by slot, so a room the world never claims still answers coherently rather
// than throwing.
for (const room of DEN_ROOMS) {
  // A den only paints itself if a site gave it a cave family. The barn and the
  // shrine are buildings and keep the rectangular floor and the wall ring; for
  // them `tileAt` returns null everywhere, which is exactly what
  // `_stampInteriorBand` reads as "nothing special to say".
  room.tileAt = function (tx, ty) {
    if (!this.caveFamily) return null;
    return caveTileAt(caveLayout(this.caveSeed, this.caveFamily), tx, ty, TILE_VOID);
  };
  // The walkable tiles, for the dressing and spawn passes. A rectangular room
  // let those roll a coordinate and assume it was floor; a shaped one does
  // not, so they ask instead of hoping.
  room.caveFloor = function () {
    if (!this.caveFamily) return null;
    return caveFloorTiles(caveLayout(this.caveSeed, this.caveFamily));
  };
  room.caveWalkable = function (tx, ty) {
    if (!this.caveFamily) return true;
    return this.tileAt(tx, ty) === null;
  };
}

// ---------------------------------------------------------------------------
// ROUND 157 -- AND THE SEWER UNDER EVERY WELL, the same way.
//
// The rooms are declared in wellDungeons.js and the layouts generated in
// wellDungeonGen.js; this is where the two meet the tile ids, for the reason the den
// block above states -- `TILE_VOID` lives here, and importing it the other way
// closes a cycle.
//
// THE METHOD NAMES ARE THE DEN'S ON PURPOSE. `caveFloor` and `caveWalkable`
// are what `_chestSpotInRoom`, the dressing pass and the spawn placer already
// ask a shaped room for. Naming these the same is what lets a well sewer be
// furnished and populated by the code that furnishes a cave, rather than by a
// second copy of it with `sewer` in the identifiers -- which is fault class 2
// with the fault written into the names.
//
// `dungeonSeed` is set when a well claims the room (_claimWellDungeons). Until
// then `tileAt` answers null everywhere, which `_stampInteriorBand` reads as
// "nothing special to say" -- so an unclaimed slot is a rectangle of void
// rather than a throw.
// ---------------------------------------------------------------------------
INTERIOR_ROOMS.push(...WELL_DUNGEON_ROOMS);
for (const room of WELL_DUNGEON_ROOMS) {
  room._layout = function () {
    return this.dungeonSeed ? wellDungeonLayout(this.dungeonSeed, { cave: !!this.dungeonCave }) : null;
  };
  room.tileAt = function (tx, ty) {
    const L = this._layout();
    if (!L) return null;
    // ITEM 1.5.5 -- the rock tail draws with the DEN'S floor, which is the
    // rough dark flagstone a cave already uses. A new tile id would have meant
    // new art, a new entry in every colour table and a new thing for the
    // minimap to not know about; the change the user asked for is from brick
    // to rock, and the rock already exists.
    return wellDungeonTileAt(L, tx, ty, TILE_VOID, TILE_FLOOR_SEWER, TILE_SEWER_WATER, TILE_FLOOR_FORGE);
  };
  room.caveFloor = function () {
    const L = this._layout();
    return L ? wellDungeonFloorTiles(L) : null;
  };
  room.caveWalkable = function (tx, ty) {
    const L = this._layout();
    return L ? wellDungeonWalkable(L, tx, ty) : true;
  };
}


// ---------------------------------------------------------------------------
// ROUND 66 -- THE DIVISION'S LAB.
//
// The Department of Essence Development has stood alone in Cadence's southeast
// corner since round 46, transcribed from the user's own city map, with no
// inside. It is the setting for the whole of Act 1, so it gets an authored
// room rather than one of the generic house interiors below: the ledger the
// player has to find is a real searchable prop at a real position, and the
// three staff stand where the room's shape puts them (the Director at the far
// end behind his desk, the assistant by the door, the engineer off to one side
// with the array, which is exactly the seating plan the dialogue assumes).
// ---------------------------------------------------------------------------
export const DIVISION_LAB_ROOM = {
  id: 'division_lab',
  building: 'research',          // the singleton tag _buildRegionProps sets
  name: 'Department of Essence Development',
  enterLabel: 'enter the Department',
  floor: 'hall',
  x: 10000, y: 20000, w: 20, h: 15,
  door: { at: 9, span: 2 },
  props: [
    // The Director's end: desk, ledger stand, the good chair.
    { key: 'smithDesk',    tx: 9,  ty: 1 },
    { key: 'scrollStand',  tx: 7,  ty: 1 },
    { key: 'chairPadded',  tx: 11, ty: 2 },
    { key: 'sideboard',    tx: 13, ty: 1 },
    // West wall: the intake side. Benches, tubs, and things to put people in.
    { key: 'workbench',    tx: 1,  ty: 3 },
    { key: 'washTub',      tx: 1,  ty: 5 },
    { key: 'benchStone',   tx: 1,  ty: 7 },
    { key: 'barrelStack',  tx: 1,  ty: 10 },
    // The array: Matheson's corner. A ring of braziers around a plinth is the
    // closest the prop set gets to "forced manifestation apparatus", and it
    // reads as ritual rather than furniture, which is the point.
    { key: 'brazierBowl',  tx: 15, ty: 5 },
    { key: 'brazierBowl',  tx: 18, ty: 5 },
    { key: 'brazierBowl',  tx: 15, ty: 8 },
    { key: 'brazierBowl',  tx: 18, ty: 8 },
    { key: 'idol',         tx: 16, ty: 6 },
    { key: 'gemCase',      tx: 18, ty: 3 },
    // The working floor.
    { key: 'tableLong',    tx: 6,  ty: 6 },
    { key: 'chairPlain',   tx: 5,  ty: 8 },
    { key: 'chairPlain',   tx: 8,  ty: 8 },
    { key: 'toolBench',    tx: 10, ty: 6 },
    { key: 'jugCluster',   tx: 12, ty: 8 },
    // Front of house: the part visitors are meant to see.
    { key: 'tableSmall',   tx: 4,  ty: 12 },
    { key: 'chairWhite',   tx: 6,  ty: 12 },
    { key: 'planter',      tx: 2,  ty: 12 },
    { key: 'doorMat',      tx: 9,  ty: 13 },
  ],
  npcs: [],   // the staff are placed by WorldScene -- they use character art
  /** ROUND 66 -- where the intake ledger is. Stage 3 is a `search`, and a
   *  search needs a THING at a PLACE rather than a counter: this is the tile
   *  the player has to actually walk to. Chosen as the sideboard behind the
   *  Director's desk, because the dialogue has him closing it and putting it
   *  away, and the player should find it exactly where he put it. */
  secret: { tx: 13, ty: 1, label: 'search the sideboard' },
};
INTERIOR_ROOMS.push(DIVISION_LAB_ROOM);

// ---------------------------------------------------------------------------
// ROUND 76 (item 8) -- THE SECOND DIVISION CELL, Ontaria.
//
// "Act 2 -- underground (Ontaria) -- NOT BUILT. Needs: the secret aperture to
// the astral space, the second Division cell, and Rob Collins."
//
// Act 1 ends with the Department emptied overnight and its array "taken apart
// and carried out in pieces. They went west, and west of here is another
// country." This is where the pieces went, and it is deliberately NOT a second
// Department: the lab in Cadence is twenty by fifteen with twenty-three props
// and a front of house for visitors. This is fourteen by eleven, has no front
// of house at all, and half of what is in it is somebody living here.
//
// TWO ROOMS IN ONE. The north end is the array, reassembled: the same brazier
// ring and plinth Matheson was proud of, in a house that was bought outright
// and never moved into. The south end is a bed, a table, one chair and a
// cooking pot -- Rob Collins has been here a year, alone, and the room should
// say that before he does.
//
// `secret` is the aperture, and it sits BEHIND the array rather than in it:
// stage `div2_aperture` is a search, and a search needs a thing at a place the
// player has to walk to. Round 66 authored the lab's secret tile and nothing
// read it for ten rounds (blocker 1); round 76 item 1 wired that read, so this
// one works the day it ships.
export const DIVISION_CELL_ROOM = {
  id: 'division_cell',
  building: 'divisionCell',
  name: 'The House on the Hill',
  enterLabel: 'go inside',
  floor: 'hall',
  x: 10000, y: 22000, w: 14, h: 11,
  door: { at: 6, span: 2 },
  props: [
    // The array, reassembled. Same ring-and-plinth vocabulary as the Cadence
    // lab's, so a player who saw Matheson's corner recognises this one.
    { key: 'brazierBowl', tx: 4,  ty: 1 },
    { key: 'brazierBowl', tx: 9,  ty: 1 },
    { key: 'brazierBowl', tx: 4,  ty: 4 },
    { key: 'brazierBowl', tx: 9,  ty: 4 },
    { key: 'idol',        tx: 6,  ty: 2 },
    { key: 'scrollStand', tx: 11, ty: 1 },
    { key: 'gemCase',     tx: 2,  ty: 1 },
    // A year of one man living beside it.
    //
    // There is no bed in the prop set -- checked, not assumed -- and that
    // turned out to be the better room. A low bench with sacks piled on it is
    // a bed made out of whatever was to hand, which is what a year alone in
    // somebody else's house actually looks like; a proper bed would have said
    // he moved in.
    { key: 'benchLow',    tx: 1,  ty: 8 },
    { key: 'sacks',       tx: 1,  ty: 9 },
    { key: 'potbelly',    tx: 3,  ty: 9 },
    { key: 'tableSmall',  tx: 4,  ty: 8 },
    { key: 'chairPlain',  tx: 6,  ty: 8 },
    { key: 'washTub',     tx: 11, ty: 8 },
    { key: 'barrelStack', tx: 12, ty: 5 },
    { key: 'jugCluster',  tx: 5,  ty: 9 },
    { key: 'doorMat',     tx: 6,  ty: 9 },
    // ROUND 76 -- three more, added because test_round23 holds every authored
    // room to nineteen props and this one shipped with sixteen. Padding to a
    // number would have been the wrong answer, so each of these is something
    // the room was missing rather than something the count was:
    //   the bench he works the array from, which nothing else here explains;
    //   the crate his supplies come up from Harrowmoor in, which the rumours
    //     describe ("a man walks down for supplies and walks back up");
    //   and a second stool, because Act 2 ends with him not being alone.
    { key: 'workbench',   tx: 9,  ty: 6 },
    { key: 'crateProduce', tx: 2,  ty: 6 },
    { key: 'stoolWood',   tx: 7,  ty: 8 },
  ],
  npcs: [],   // Collins is placed by WorldScene -- he uses character art
  /** The tear. Behind the array, at the back wall, where you would put a thing
   *  you did not want anyone walking into by accident. */
  secret: { tx: 12, ty: 2, label: 'look behind the array' },
};
INTERIOR_ROOMS.push(DIVISION_CELL_ROOM);

// ===========================================================================
// ROUND 102 -- THE ROOMS OF ACTS 3 AND 4.
//
// Six, and every one of them is furnished to round 23's floor of nineteen
// props -- not padded to it. Round 76 set that precedent with the Ontaria cell
// ("each of these is something the room was missing rather than something the
// count was") and it is the right rule: a story room the player is sent to
// search has to reward looking around it, and nineteen is roughly where a
// space stops reading as a diagram.
//
// The band starts at y = 24000, below the two existing story rooms (20000 and
// 22000) and above the civic band at 30000, with a 1000-unit step. Authored
// rather than generated because these are six specific places and a collision
// between two of them would put a council chamber inside a cage block.
// ===========================================================================
const STORY_BAND_Y0 = 24000;
const STORY_BAND_STEP = 1000;

// ---------------------------------------------------------------------------
// ACT 3 -- THE REDUCTION SITE. Elehyd, forty miles out along the convoy road.
//
// The whole argument of Act 3 is that this is not a laboratory. Vesk's
// Department was twenty by fifteen with a front of house, a good chair and a
// planter, because it had visitors to reassure. This has no front of house, no
// chairs anybody would sit in to talk, and a floor laid for washing down.
//
// What furnishes it is INTAKE AND OUTPUT, in two rows, with a clerk's desk
// between them -- which is the shape of a works rather than the shape of a
// study. The braziers are the same brazier the Cadence array used and there
// are eight of them, because the point of the act is that somebody took a
// research apparatus and asked how many of it they could afford.
//
// `secret` is the ROTA, and it is on the clerk's desk in the middle of the
// floor rather than hidden: nobody out here is hiding anything, which is the
// single worst thing about the place.
// ---------------------------------------------------------------------------
export const HARVEST_WORKS_ROOM = {
  id: 'harvest_works',
  // ROUND 102 -- built when somebody opens the door, not at world build.
  // Six rooms of wall ring and furniture is 334 display-list objects that no
  // camera reaches until the player is inside one. See WorldScene's `lazy`.
  lazy: true,
  building: 'harvestWorks',
  name: 'Elehyd Reduction Site',
  enterLabel: 'go through the gate',
  floor: 'forge',        // a floor laid to be washed down, not to be looked at
  x: 10000, y: STORY_BAND_Y0, w: 22, h: 16,
  door: { at: 10, span: 2 },
  props: [
    // The intake row, west wall. Where the carts unload.
    { key: 'handcart',    tx: 1,  ty: 2 },
    { key: 'crateProduce', tx: 1, ty: 4 },
    { key: 'barrelStack', tx: 1,  ty: 6 },
    { key: 'sacks',       tx: 1,  ty: 8 },
    { key: 'washTub',     tx: 1,  ty: 10 },
    { key: 'benchStone',  tx: 1,  ty: 12 },
    // The array, eight braziers rather than four, in two rings. The same
    // vocabulary as Matheson's corner and the house on the hill, at industrial
    // multiplicity -- a player who has seen both should recognise this as the
    // third one and notice the arithmetic.
    { key: 'brazierBowl', tx: 6,  ty: 3 },
    { key: 'brazierBowl', tx: 10, ty: 3 },
    { key: 'brazierBowl', tx: 6,  ty: 7 },
    { key: 'brazierBowl', tx: 10, ty: 7 },
    { key: 'brazierIron', tx: 14, ty: 3 },
    { key: 'brazierIron', tx: 18, ty: 3 },
    { key: 'brazierIron', tx: 14, ty: 7 },
    { key: 'brazierIron', tx: 18, ty: 7 },
    { key: 'idol',        tx: 8,  ty: 5 },
    { key: 'idol',        tx: 16, ty: 5 },
    // The clerk's floor. One desk, one stand, one stool, and the rota.
    { key: 'smithDesk',   tx: 12, ty: 11 },
    { key: 'scrollStand', tx: 14, ty: 11 },
    { key: 'stoolWood',   tx: 11, ty: 12 },
    // Output. What leaves here does not leave in the carts it came in.
    { key: 'gemCase',     tx: 19, ty: 11 },
    { key: 'coinCase',    tx: 20, ty: 13 },
    { key: 'amphora',     tx: 4,  ty: 13 },
    { key: 'jugCluster',  tx: 6,  ty: 13 },
    { key: 'quenchTrough', tx: 8, ty: 13 },
    { key: 'toolBench',   tx: 17, ty: 13 },
  ],
  npcs: [],
  secret: { tx: 12, ty: 11, label: 'read what is on the clerk\'s desk' },
};
INTERIOR_ROOMS.push(HARVEST_WORKS_ROOM);

// ---------------------------------------------------------------------------
// ACT 4 -- THE OFFICE ON THE HARBOUR ROAD. Vashra.
//
// The joke of this room, and it is a bleak one: IT IS THE NICEST ROOM IN THE
// CHAIN. Cadence's Department had a front of house for visitors and this has
// a waiting area with a landscape on the wall. The Division is not hiding in
// the king's city because it does not have to -- it is retained, it is paid
// out of the harbour levy, and it has a brass plate.
//
// So the furniture is a chartered professional office, dressed correctly and
// without a single thing in it that says what the work is. The array is not
// here. Nothing here is frightening. That is the point.
// ---------------------------------------------------------------------------
export const DIVISION_OFFICE_ROOM = {
  id: 'division_office',
  // ROUND 102 -- built when somebody opens the door, not at world build.
  // Six rooms of wall ring and furniture is 334 display-list objects that no
  // camera reaches until the player is inside one. See WorldScene's `lazy`.
  lazy: true,
  building: 'divisionOffice',
  name: 'Division Liaison Office',
  enterLabel: 'go in',
  floor: 'marble',
  x: 10000, y: STORY_BAND_Y0 + STORY_BAND_STEP, w: 16, h: 12,
  door: { at: 7, span: 2 },
  props: [
    // Front of house. A waiting area nobody waits in.
    { key: 'chairWhite',  tx: 4,  ty: 10 },
    { key: 'chairWhite',  tx: 6,  ty: 10 },
    { key: 'chairPadded', tx: 8,  ty: 10 },
    { key: 'tableSmall',  tx: 5,  ty: 9 },
    { key: 'planter',     tx: 2,  ty: 10 },
    { key: 'planter',     tx: 13, ty: 10 },
    { key: 'doorMat',     tx: 7,  ty: 10 },
    { key: 'paintLandscape', tx: 3, ty: 1 },
    { key: 'paintPortrait',  tx: 12, ty: 1 },
    { key: 'vasePorcelain',  tx: 1, ty: 6 },
    { key: 'vaseGlass',      tx: 14, ty: 6 },
    // The working half: correspondence, and a great deal of it.
    { key: 'smithDesk',   tx: 5,  ty: 2 },
    { key: 'chairPadded', tx: 5,  ty: 4 },
    { key: 'sideboard',   tx: 7,  ty: 2 },
    { key: 'scrollStand', tx: 9,  ty: 2 },
    { key: 'scrollStand', tx: 11, ty: 2 },
    { key: 'tableLong',   tx: 9,  ty: 6 },
    { key: 'stoolSquare', tx: 8,  ty: 7 },
    { key: 'stoolSquare', tx: 11, ty: 7 },
    { key: 'coinCase',    tx: 13, ty: 3 },
    { key: 'fireplacePale', tx: 1, ty: 2 },
  ],
  npcs: [],
  // The warrant, in a sideboard, in a drawer, filed. Not hidden -- FILED.
  secret: { tx: 7, ty: 2, label: 'open the sideboard' },
};
INTERIOR_ROOMS.push(DIVISION_OFFICE_ROOM);

// ---------------------------------------------------------------------------
// HOUSE VANTELL'S VAULT. Vashra.
//
// The one house whose ask is a search rather than an objective, because what
// Lady Vantell wants cannot be fought or found in a field: she wants four
// years of a fund reconciled, and the only place that exists is under her own
// treasury.
// ---------------------------------------------------------------------------
export const TREASURY_VAULT_ROOM = {
  id: 'treasury_vault',
  // ROUND 102 -- built when somebody opens the door, not at world build.
  // Six rooms of wall ring and furniture is 334 display-list objects that no
  // camera reaches until the player is inside one. See WorldScene's `lazy`.
  lazy: true,
  building: 'treasury',
  name: 'The Vantell Treasury',
  enterLabel: 'go down to the vault',
  floor: 'hall',
  x: 10000, y: STORY_BAND_Y0 + STORY_BAND_STEP * 2, w: 14, h: 11,
  door: { at: 6, span: 2 },
  props: [
    { key: 'coinCase',    tx: 2,  ty: 1 },
    { key: 'coinCase',    tx: 4,  ty: 1 },
    { key: 'coinCase',    tx: 6,  ty: 1 },
    { key: 'coinCase',    tx: 8,  ty: 1 },
    { key: 'gemCase',     tx: 10, ty: 1 },
    { key: 'jewelCase',   tx: 12, ty: 1 },
    { key: 'ingotStack',  tx: 1,  ty: 3 },
    { key: 'ingotStack',  tx: 1,  ty: 5 },
    { key: 'barrelStack', tx: 12, ty: 4 },
    { key: 'sideboard',   tx: 12, ty: 6 },
    // The reconciling table: this is where the work of the ask happens.
    { key: 'tableLong',   tx: 6,  ty: 5 },
    { key: 'chairPadded', tx: 5,  ty: 7 },
    { key: 'chairPlain',  tx: 8,  ty: 7 },
    { key: 'scrollStand', tx: 4,  ty: 4 },
    { key: 'scrollStand', tx: 9,  ty: 4 },
    { key: 'smithDesk',   tx: 2,  ty: 8 },
    { key: 'stoolWood',   tx: 3,  ty: 9 },
    { key: 'brazierIron', tx: 10, ty: 8 },
    { key: 'doorMat',     tx: 6,  ty: 9 },
    { key: 'amphora',     tx: 11, ty: 9 },
  ],
  npcs: [],
  secret: { tx: 12, ty: 6, label: 'pull the last four years' },
};
INTERIOR_ROOMS.push(TREASURY_VAULT_ROOM);

// ---------------------------------------------------------------------------
// THE COUNCIL CHAMBER. Vashra.
//
// Where the motion is put. NO `secret` -- the council is its own stage kind
// and a vote is not a thing you find by searching the room, which is exactly
// why it needed a kind of its own rather than being bent into a search.
//
// Five seats, because there are four houses and a crown, and the crown's is
// the one with the good chair.
// ---------------------------------------------------------------------------
export const COUNCIL_HALL_ROOM = {
  id: 'council_hall',
  // ROUND 102 -- built when somebody opens the door, not at world build.
  // Six rooms of wall ring and furniture is 334 display-list objects that no
  // camera reaches until the player is inside one. See WorldScene's `lazy`.
  lazy: true,
  building: 'councilHall',
  name: 'The Chamber of Houses',
  enterLabel: 'enter the chamber',
  floor: 'marble',
  x: 10000, y: STORY_BAND_Y0 + STORY_BAND_STEP * 3, w: 18, h: 14,
  door: { at: 8, span: 2 },
  props: [
    // The crown's end, raised and overdone.
    { key: 'rostrum',     tx: 9,  ty: 1 },
    { key: 'chairPadded', tx: 9,  ty: 3 },
    { key: 'sculpture',   tx: 5,  ty: 1 },
    { key: 'sculpture',   tx: 13, ty: 1 },
    { key: 'paintPortrait', tx: 7, ty: 1 },
    { key: 'paintPortrait', tx: 11, ty: 1 },
    // Four house seats, two either side, each with its own stand.
    { key: 'podiumCarved', tx: 3, ty: 5 },
    { key: 'chairPlain',   tx: 3, ty: 7 },
    { key: 'podiumCarved', tx: 6, ty: 5 },
    { key: 'chairPlain',   tx: 6, ty: 7 },
    { key: 'podiumCarved', tx: 12, ty: 5 },
    { key: 'chairPlain',   tx: 12, ty: 7 },
    { key: 'podiumCarved', tx: 15, ty: 5 },
    { key: 'chairPlain',   tx: 15, ty: 7 },
    // The floor of the house, where whoever is speaking stands.
    { key: 'tableRoundBig', tx: 9, ty: 8 },
    { key: 'brazierBowl',  tx: 7, ty: 10 },
    { key: 'brazierBowl',  tx: 11, ty: 10 },
    { key: 'vaseGlass',    tx: 1, ty: 9 },
    { key: 'vasePorcelain', tx: 16, ty: 9 },
    { key: 'planter',      tx: 2, ty: 12 },
    { key: 'planter',      tx: 15, ty: 12 },
    { key: 'doorMat',      tx: 8, ty: 12 },
  ],
  npcs: [],
};
INTERIOR_ROOMS.push(COUNCIL_HALL_ROOM);

// ---------------------------------------------------------------------------
// THE BACKUP BASE. The far west, past where the maps stop.
//
// "A cut into a hillside where nothing has been built and everything has been
// dug." Cages down both long walls, opened, most of them from the inside --
// and one at the centre that was not, which is the only locked door in the
// place and is the `secret`.
//
// Furnished out of the same institutional vocabulary as the reduction site,
// which is the point: the same organisation built both, using the same
// requisition forms, and the difference between the two rooms is only that
// this one was left in a hurry.
// ---------------------------------------------------------------------------
export const WEST_BASE_ROOM = {
  id: 'west_base',
  // ROUND 102 -- built when somebody opens the door, not at world build.
  // Six rooms of wall ring and furniture is 334 display-list objects that no
  // camera reaches until the player is inside one. See WorldScene's `lazy`.
  lazy: true,
  building: 'westBase',
  name: 'The Western Site',
  enterLabel: 'go in',
  floor: 'sewer',        // dug, not built: the roughest floor in the set
  x: 10000, y: STORY_BAND_Y0 + STORY_BAND_STEP * 4, w: 20, h: 16,
  door: { at: 9, span: 2 },
  props: [
    // The cage rows. `weaponRack` and `armourPile` are the closest the prop
    // set gets to a row of open cells with their contents on the floor, and
    // they were chosen by looking rather than by name: what reads from above
    // is a repeated vertical frame with something spilled at the base of it.
    { key: 'weaponRack',  tx: 1,  ty: 2 },
    { key: 'weaponRack',  tx: 1,  ty: 5 },
    { key: 'weaponRack',  tx: 1,  ty: 8 },
    { key: 'weaponRack',  tx: 1,  ty: 11 },
    { key: 'weaponRack',  tx: 18, ty: 2 },
    { key: 'weaponRack',  tx: 18, ty: 5 },
    { key: 'weaponRack',  tx: 18, ty: 8 },
    { key: 'weaponRack',  tx: 18, ty: 11 },
    { key: 'armourPile',  tx: 3,  ty: 6 },
    { key: 'armourPile',  tx: 16, ty: 9 },
    { key: 'sacks',       tx: 3,  ty: 12 },
    // The middle: the array again, and the one door that is still shut.
    { key: 'brazierIron', tx: 7,  ty: 4 },
    { key: 'brazierIron', tx: 12, ty: 4 },
    { key: 'brazierIron', tx: 7,  ty: 9 },
    { key: 'brazierIron', tx: 12, ty: 9 },
    { key: 'idol',        tx: 9,  ty: 6 },
    { key: 'benchStone',  tx: 9,  ty: 11 },
    // Left in a hurry: what you abandon is as legible as what you take.
    { key: 'handcart',    tx: 15, ty: 13 },
    { key: 'crateProduce', tx: 5, ty: 13 },
    { key: 'barrelStack', tx: 6,  ty: 2 },
    { key: 'washTub',     tx: 14, ty: 2 },
    { key: 'doorMat',     tx: 9,  ty: 14 },
  ],
  npcs: [],
  secret: { tx: 9, ty: 6, label: 'open the last door' },
};
INTERIOR_ROOMS.push(WEST_BASE_ROOM);

// ---------------------------------------------------------------------------
// THE BACK ROOM.
//
// The instinct was to make this bare -- a small empty room with a child in it.
// Round 23 holds every authored room to nineteen props and the constraint
// turned out to be right, which is worth writing down rather than working
// around: A BARE ROOM SAYS NOBODY WAS HERE, and somebody was here for a long
// time.
//
// So it is a STORE ROOM that a child has been kept in the corner of. Stock
// down one wall, filed and rotated and perfectly in order, and a corner with a
// low bench, a blanket's worth of sacks, a washtub and a single small stool.
// The stock is what the room is for. The corner is what happened in it. The
// two things being in the same room, tidily, is the whole horror of it, and it
// does more than an empty floor would.
// ---------------------------------------------------------------------------
export const WEST_BACK_ROOM = {
  id: 'west_back',
  // ROUND 102 -- built when somebody opens the door, not at world build.
  // Six rooms of wall ring and furniture is 334 display-list objects that no
  // camera reaches until the player is inside one. See WorldScene's `lazy`.
  lazy: true,
  building: 'westBack',
  name: 'The Back Room',
  enterLabel: 'open the back room',
  floor: 'sewer',
  x: 10000, y: STORY_BAND_Y0 + STORY_BAND_STEP * 5, w: 14, h: 10,
  door: { at: 6, span: 2 },
  props: [
    // Stock, in order. Somebody counted this every week.
    { key: 'crateProduce', tx: 1, ty: 1 },
    { key: 'crateProduce', tx: 3, ty: 1 },
    { key: 'crateProduce', tx: 5, ty: 1 },
    { key: 'barrelStack',  tx: 7, ty: 1 },
    { key: 'barrelStack',  tx: 9, ty: 1 },
    { key: 'sacks',        tx: 11, ty: 1 },
    { key: 'amphora',      tx: 12, ty: 3 },
    { key: 'jugGlazed',    tx: 12, ty: 5 },
    { key: 'ingotStack',   tx: 1,  ty: 3 },
    { key: 'gemCase',      tx: 1,  ty: 5 },
    { key: 'toolBench',    tx: 6,  ty: 3 },
    { key: 'scrollStand',  tx: 8,  ty: 3 },
    { key: 'sideboard',    tx: 10, ty: 3 },
    // The corner. Everything in it is the wrong size for the room.
    { key: 'benchLow',     tx: 2,  ty: 7 },
    { key: 'sacks',        tx: 3,  ty: 8 },
    { key: 'washTub',      tx: 1,  ty: 8 },
    { key: 'stoolWood',    tx: 4,  ty: 7 },
    { key: 'jugCluster',   tx: 5,  ty: 8 },
    { key: 'shrineNiche',  tx: 2,  ty: 5 },
    { key: 'brazierBowl',  tx: 10, ty: 7 },
    { key: 'doorMat',      tx: 6,  ty: 8 },
  ],
  npcs: [],
  secret: { tx: 2, ty: 7, label: 'go to the corner' },
};
INTERIOR_ROOMS.push(WEST_BACK_ROOM);

/** The six, as one list, so the scene and the suites can reach them without
 *  six imports and without anybody re-typing the ids. */
export const STORY_ROOMS_102 = [
  HARVEST_WORKS_ROOM, DIVISION_OFFICE_ROOM, TREASURY_VAULT_ROOM,
  COUNCIL_HALL_ROOM, WEST_BASE_ROOM, WEST_BACK_ROOM,
];

/** Round 102's own faults, in the shape civicFaults uses. */
// ===========================================================================
// ROUND 263 (items 8, 8.1) -- EVERY INTERNAL ROOM CHANGE IS A DOOR OR A
// STAIR, AND IT IS ON A WALL ONE MAY STAND ON.
//
//   8.1) "Stairs and doors should replace all internal room changes either
//         going to a different level, or entering through a door. No more
//         highlighted tile."
//
// `inner` IS THE ROSTER. A room that leads to another room inside the same
// building declares one, and there is no second list -- so the check is over
// the rooms themselves rather than over a set of ids somebody maintains, and
// a transition added in a later round is checked the day it is added.
//
// Three things have to hold, and each of them is a way this has already gone
// wrong once: the transition tile must carry a door or a stair rather than
// the floor marking it used to; that tile must lie against a north or west
// wall, because the other two are the camera-side runs nothing is drawn on;
// and the piece's face must be the one that wall implies, because a door
// facing into its own wall is the failure round 259 spent a round on.
// ===========================================================================
export function innerDoorFaults(rooms = INTERIOR_ROOMS) {
  const out = [];
  for (const r of rooms) {
    // ROUND 283 -- every door a room lists, not only the first. A vehicle's
    // decks (the dragon house) list their stairs in `inners` too, and those
    // have never been under this rule -- their decks are built by the vehicle
    // code, not dressed from props -- so they stay outside it, as before.
    const doors = r.vehicle ? (r.inner ? [r.inner] : []) : (r.inners || (r.inner ? [r.inner] : []));
    for (const q of doors) {
    const wall = wallOfTile(r, q.tx, q.ty);
    const want = doorFacingForWall(wall);
    if (!want) {
      out.push(`${r.id}: its way through to ${q.toRoom} is on the ${wall || 'open floor'}, `
        + 'where a door may not hang');
      continue;
    }
    const at = (r.props || []).filter(p => p.tx === q.tx && p.ty === q.ty);
    if (at.some(p => p.key === 'doorMat')) {
      out.push(`${r.id}: its way through to ${q.toRoom} is still a floor marking`);
    }
    const piece = at.find(p => p.key === 'doorWood' || /^stair/.test(p.key));
    if (!piece) {
      out.push(`${r.id}: nothing stands on its way through to ${q.toRoom}`);
    } else if (piece.key === 'doorWood' && piece.face !== want) {
      out.push(`${r.id}: its door faces ${piece.face || 'nowhere'}, not ${want}`);
    }
    // ...and the room it leads to has to exist, or the door opens on nothing.
    if (!rooms.some(x => x.id === q.toRoom)) {
      out.push(`${r.id}: leads to ${q.toRoom}, which is not a room`);
    }
    }
  }
  return out;
}

export function storyRoomFaults() {
  const out = [];
  const seen = new Set();
  for (const r of STORY_ROOMS_102) {
    if (seen.has(r.id)) out.push(`duplicate story room ${r.id}`);
    seen.add(r.id);
    // Round 23's floor, asserted here as well as there so it fails in the data
    // lane rather than only in a browser suite.
    if (r.props.length < 19) out.push(`${r.id} has ${r.props.length} props, needs 19`);
    // A prop outside the room is a prop inside a wall.
    for (const p of r.props) {
      if (p.tx < 0 || p.ty < 0 || p.tx >= r.w || p.ty >= r.h) {
        out.push(`${r.id} puts ${p.key} at ${p.tx},${p.ty}, outside ${r.w}x${r.h}`);
      }
    }
    // ...and a secret nobody can reach is a stage nobody can finish.
    if (r.secret) {
      const s = r.secret;
      if (s.tx < 0 || s.ty < 0 || s.tx >= r.w || s.ty >= r.h) {
        out.push(`${r.id}'s secret is at ${s.tx},${s.ty}, outside the room`);
      }
      if (!s.label) out.push(`${r.id}'s secret has no label`);
    }
    if (!r.building) out.push(`${r.id} has no building to hang off`);
    if (!r.door || r.door.at < 0 || r.door.at + r.door.span > r.w) {
      out.push(`${r.id}'s door does not fit its own wall`);
    }
  }
  // The band must not collide with itself or with the two rooms that predate
  // it. Checked as a real overlap test rather than as "the step is big
  // enough", because the step being big enough is the assumption that fails
  // the moment somebody makes a room taller.
  const all = [DIVISION_LAB_ROOM, DIVISION_CELL_ROOM, ...STORY_ROOMS_102];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      const ah = a.h * 32, bh = b.h * 32, aw = a.w * 32, bw = b.w * 32;
      if (a.x < b.x + bw && b.x < a.x + aw && a.y < b.y + bh && b.y < a.y + ah) {
        out.push(`${a.id} and ${b.id} overlap`);
      }
    }
  }
  return out;
}


// ---------------------------------------------------------------------------
// ROUND 66 -- AN INSIDE FOR EVERY BUILDING.
//
// The user: "Lets ensure every building, and cave now has a playable interior.
// Random houses should have simple small interiors tables, chairs, maybe a
// bed."
//
// THE COUNT IS THE DESIGN PROBLEM. There are ~350 non-wall buildings in the
// world plus Cadence's forty houses and the caves, and the obvious reading --
// one reserved room per building -- does not survive contact with either
// constraint this system has:
//
//   * SPACE. A room is 11x9 tiles plus a void margin and a gutter. Four
//     hundred of them do not fit in the reserved band without widening it into
//     ground the region generators use.
//   * THE DISPLAY LIST. Round 43 hit Phaser's 4,000-child cap and round 64 hit
//     it again at 4,096 with thirty-six den rooms, which is why dens build
//     their contents on first door open. Four hundred standing rooms is not a
//     near miss, it is an order of magnitude.
//
// THE OBSERVATION THAT DISSOLVES BOTH: the player can only be inside one
// building at a time. A room does not need to persist while nobody is in it --
// it needs to be the RIGHT room the moment somebody opens a door.
//
// So there is a small POOL of physical rooms, and entering an ordinary
// building dresses one of them for that building and sends you in. Which
// layout you get is a pure function of the building's own position, so the
// cottage on the north road is the same cottage every time you visit it, and
// the world is not storing four hundred rooms to promise you that.
//
// The pool is four rather than one purely for headroom: a door left standing
// open behind the player, a companion still walking out, a test that enters
// two buildings in the same frame. Nothing needs the fourth; it costs nothing.
// ---------------------------------------------------------------------------
export const HOUSE_ROOM_COUNT = 4;
export const HOUSE_ROOM_W = 11;
export const HOUSE_ROOM_H = 9;

/**
 * The layouts. Each is what a small interior contains, in tile offsets.
 *
 * ON BEDS: the prop sheet the user supplied has no bed in it -- sixty-six
 * props, of which the sleeping-adjacent ones are `benchLow` and `rockingChair`
 * -- so a cot is a low bench against the back wall with a chair beside it.
 * That is an honest substitution rather than a silent one, and if a bed sprite
 * ever arrives it is one key change here and nowhere else.
 *
 * `kinds` says which building models a layout suits, so a barn does not come
 * out furnished like a parlour. `null` means it suits anything.
 */
export const HOUSE_LAYOUTS = [
  {
    id: 'cottage', name: 'A small house', kinds: null,
    blurb: 'One room, swept, lived in.',
    props: [
      { key: 'hearthStone', tx: 5, ty: 1 },
      // ROUND 262 (item 7) -- THE COT IS A BED NOW. It was a low bench with
      // the word "cot" in a comment beside it, which is round 22's honest
      // scaffolding for art that had not arrived; the art has arrived.
      // ROUND 267 (item 1) -- OFF THE WALL. "Fix Objects overlapping walls":
      // his screenshot is this bed and this nightstand, and ty 1 / tx 1 are
      // the wall itself (`wallOfTile`), not the first floor tile. The whole
      // corner shifts one tile in so the arrangement survives -- bed against
      // the back wall, nightstand beside its head, stool out of the way.
      { key: 'bedFluffy',   tx: 3, ty: 2 },
      { key: 'nightWood',   tx: 2, ty: 2 },
      { key: 'stoolWood',   tx: 2, ty: 4 },
      { key: 'tableRound',  tx: 6, ty: 4 },
      { key: 'chairPlain',  tx: 5, ty: 5 },
      { key: 'chairPlain',  tx: 8, ty: 4 },
      { key: 'sideboard',   tx: 9, ty: 1 },
      { key: 'barrelStack', tx: 1, ty: 6 },
      // ROUND 262 (item 6) -- and a rug under the table, which is the one
      // place in a one-room house a rug would actually be.
      { key: 'rugRound',    tx: 6, ty: 4 },
      { key: 'doorMat',     tx: 5, ty: 7 },
    ],
  },
  {
    id: 'kitchen', name: 'A kitchen house', kinds: ['farmhouse', 'house'],
    blurb: 'Somebody cooks for more than one person here.',
    props: [
      { key: 'stoveIron',    tx: 2, ty: 1 },
      { key: 'washTub',      tx: 4, ty: 1 },
      { key: 'tableLong',    tx: 6, ty: 3 },
      { key: 'benchLow',     tx: 6, ty: 5 },
      { key: 'chairPlain',   tx: 9, ty: 3 },
      { key: 'sacks',        tx: 1, ty: 4 },
      { key: 'jugCluster',   tx: 9, ty: 6 },
      { key: 'crateProduce', tx: 2, ty: 6 },
    ],
  },
  {
    id: 'parlour', name: 'A well-kept house', kinds: ['cabinwealthy', 'house'],
    blurb: 'Rugs, and a chair nobody is allowed to sit in.',
    props: [
      { key: 'fireplacePale', tx: 5, ty: 1 },
      { key: 'rockingChair',  tx: 3, ty: 2 },
      { key: 'chairPadded',   tx: 7, ty: 2 },
      { key: 'tableRed',      tx: 5, ty: 4 },
      { key: 'vasePorcelain', tx: 9, ty: 1 },
      { key: 'paintLandscape', tx: 2, ty: 1 },
      { key: 'sideboard',     tx: 9, ty: 4 },
      { key: 'benchLow',      tx: 1, ty: 6 },
      // ROUND 262 (items 6, 7) -- the well-kept house gets the rug and the
      // good bed. A rug belongs where somebody chose to put one down.
      { key: 'rugRound',    tx: 5, ty: 4 },
      { key: 'bedFluffy',   tx: 8, ty: 6 },
      { key: 'nightWood',   tx: 6, ty: 6 },
    ],
  },
  {
    id: 'workroom', name: 'A workroom', kinds: ['shack', 'barn', 'dockhouse'],
    blurb: 'Tools, and the smell of whatever was last done in here.',
    props: [
      { key: 'workbench',    tx: 2, ty: 1 },
      { key: 'toolBench',    tx: 5, ty: 1 },
      { key: 'barrelStack',  tx: 8, ty: 1 },
      { key: 'handcart',     tx: 8, ty: 4 },
      { key: 'sacks',        tx: 1, ty: 4 },
      { key: 'stoolSquare',  tx: 4, ty: 4 },
      { key: 'benchLow',     tx: 2, ty: 6 },
      { key: 'crateProduce', tx: 6, ty: 6 },
    ],
  },
  {
    id: 'coldhouse', name: 'A cold house', kinds: ['cabinsnowy'],
    blurb: 'The fire is the only reason to be in this room.',
    props: [
      { key: 'fireplaceLit', tx: 5, ty: 1 },
      { key: 'benchLow',     tx: 2, ty: 2 },
      { key: 'rockingChair', tx: 7, ty: 2 },
      { key: 'tableSmall',   tx: 5, ty: 4 },
      { key: 'stoolRound',   tx: 4, ty: 5 },
      { key: 'barrelStack',  tx: 9, ty: 5 },
      { key: 'sacks',        tx: 1, ty: 6 },
    ],
  },
  {
    id: 'lodging', name: 'A lodging house', kinds: ['house', 'shack'],
    blurb: 'Three cots and no privacy at all.',
    props: [
      // ROUND 262 (item 7) -- "Three cots" is the blurb and three low benches
      // were what stood here. Three beds now, one nightstand between each
      // pair, which is what "no privacy at all" is supposed to look like.
      // ROUND 267 (item 1) -- the whole dormitory comes off the wall by one.
      // The three beds are two tiles wide and stand on 2/5/8, so they fill
      // 1-3, 4-6 and 7-9 with nothing between them: the nightstands drop to
      // the row in front rather than being squeezed into a gap that is not
      // there, and the stools drop again.
      { key: 'bedFluffy',   tx: 2, ty: 2 },
      { key: 'bedFluffy',   tx: 5, ty: 2 },
      { key: 'bedFluffy',   tx: 8, ty: 2 },
      { key: 'nightWood',   tx: 4, ty: 3 },
      { key: 'nightWood',   tx: 7, ty: 3 },
      { key: 'stoolWood',   tx: 3, ty: 4 },
      { key: 'stoolWood',   tx: 6, ty: 4 },
      { key: 'tableSmall',  tx: 5, ty: 5 },
      { key: 'washTub',     tx: 9, ty: 6 },
      { key: 'potbelly',    tx: 1, ty: 6 },
    ],
  },
  {
    // ROUND 262 (item 3) -- "I've also added a counter, this can be lined up
    // together to create a bar area for taverns."
    //
    // A TAVERN IS A BUILDING SERVICE and `_buildingModel` returns it, so this
    // layout is reachable by naming it: a settlement of kind `city` offers
    // ['tavern', 'blacksmith', 'auction'], and the tavern's door opens on
    // this. `barRun` lays the counters rather than three lines being typed,
    // because a hand-typed run gets the FACING wrong -- `facingForTile`
    // hashes per tile and would turn every third counter round.
    id: 'taproom', name: 'A taproom', kinds: ['tavern', 'piratetavern'],
    blurb: 'Four tables, a bar, and somebody asleep under one of them.',
    props: [
      // ROUND 263 (item 2) -- OFF THE WALL BY TWO, "to allow room for a
      // bartender behind them". The wall line is tile 0, so the counter
      // stands on 2 and the row behind it is where somebody pours. Three
      // pieces, not four: the step is the counter's own drawn width now
      // (3.5 tiles) and four would run out through the east wall.
      // ROUND 267 (item 1) -- the run starts on the first FLOOR tile. 1.5 put
      // the first counter's centre in the west wall; the bar's distance from
      // the REAR wall (round 263's ask) is untouched. Three pieces: at the
      // counter's own 2.5-tile step a fourth ends up at tx 9.5, through the
      // east wall.
      ...barRun(FURN_WALL_TILES, BAR_WALL_GAP_TILES, 3, 'east'),
      { key: 'tableWood',   tx: 2, ty: 4 },
      { key: 'chairWood',   tx: 2, ty: 5 },
      { key: 'chairWood',   tx: 3, ty: 5 },
      { key: 'tableWood',   tx: 7, ty: 4 },
      { key: 'chairWood',   tx: 6, ty: 5 },
      { key: 'chairWood',   tx: 8, ty: 5 },
      { key: 'barrelStack', tx: 9, ty: 1 },
      { key: 'rugRound',    tx: 5, ty: 6 },
      { key: 'hearthRustic', tx: 1, ty: 7 },
      { key: 'doorMat',     tx: 5, ty: 7 },
    ],
  },
  {
    id: 'storehouse', name: 'A store room', kinds: ['barn', 'dockhouse', 'shack'],
    blurb: 'Stacked to the roof and smelling of tar.',
    props: [
      { key: 'barrelStack',  tx: 2, ty: 1 },
      { key: 'barrelStack',  tx: 4, ty: 1 },
      { key: 'sacks',        tx: 7, ty: 1 },
      { key: 'crateProduce', tx: 9, ty: 2 },
      { key: 'amphora',      tx: 1, ty: 4 },
      { key: 'handcart',     tx: 6, ty: 4 },
      { key: 'armourPile',   tx: 9, ty: 5 },
      { key: 'benchLow',     tx: 3, ty: 6 },
    ],
  },
  {
    id: 'holdfast', name: 'A back room', kinds: null,
    blurb: 'Whoever lives here does not spend much time in it.',
    props: [
      { key: 'hearthRustic', tx: 5, ty: 1 },
      { key: 'benchLow',     tx: 8, ty: 1 },
      { key: 'tableSmall',   tx: 3, ty: 3 },
      { key: 'chairPlain',   tx: 2, ty: 4 },
      { key: 'stoolSquare',  tx: 7, ty: 4 },
      { key: 'barrelStack',  tx: 1, ty: 6 },
      { key: 'sacks',        tx: 9, ty: 6 },
    ],
  },
];

/** The physical pool. Dressed on entry; see WorldScene's _enterGenericBuilding. */
export const HOUSE_ROOMS = [];
for (let i = 0; i < HOUSE_ROOM_COUNT; i++) {
  HOUSE_ROOMS.push({
    id: `house_${i}`,
    building: null,             // doors are hung per building, not by tag
    houseSlot: i,
    name: 'A small house',
    enterLabel: 'go inside',
    floor: 'hall',
    x: 0, y: 0, w: HOUSE_ROOM_W, h: HOUSE_ROOM_H,
    door: { at: Math.floor(HOUSE_ROOM_W / 2) - 1, span: 2 },
    props: [],
    npcs: [],
  });
}
INTERIOR_ROOMS.push(...HOUSE_ROOMS);

// ===========================================================================
// ROUND 82 -- THE SEWER, as an interior room like any other.
//
// It is 50x36, which is the largest room in the game by a factor of six, and
// it is the first with more than one tile type in it. Both of those are
// handled by ONE new field rather than by a new kind of room:
//
//   tileAt(tx, ty)  -- returns the tile id for one tile of this room, or null
//                      to fall back to `floor`.
//
// `_stampInteriorBand` calls it if it is there. That is the whole extension,
// and it is what lets the maze's walls be TILE_VOID (which the renderer
// already draws as unlit nothing, and which therefore costs no sprites at all)
// and its channel be TILE_SEWER_WATER (which `isWaterTile` already refuses to
// let anything walk into).
//
// NO `building`, so `_buildInteriors` hangs no exterior door on it -- there is
// nothing above ground to hang one from, because the player starts inside and
// leaves by a ladder that only appears once the cultist is down.
//
// NO `props`, because the maze IS the room: 1,312 walkable tiles dressed by
// their own tile art, with bone piles placed from the map rather than from a
// prop list.
// ===========================================================================
export const SEWER_ROOM = {
  id: 'sewer',
  building: null,
  name: 'The Undercity',
  enterLabel: 'climb down',
  blurb: 'Wet brick, and something that was a circle.',
  floor: 'sewer',
  x: 0, y: 0,
  w: SEWER_MAP[0].length, h: SEWER_MAP.length,
  // The door is a formality -- nothing hangs off it -- but `buildRoomWalls`
  // phase-aligns the perimeter to it, and `roomEntryPoint` reads it.
  door: { at: 2, span: 2 },
  /** THIS ROOM HAS NO EXTERIOR, AND THAT IS THE DESIGN.
   *
   *  Every other interior in the game is the inside of a building the player
   *  can see from the street, so round 46 asserts that each one finds its
   *  doorstep. The sewer is the exception: the player does not walk into it,
   *  they wake up in it, and they leave by a ladder rather than by the door
   *  they came in through. Declared here rather than named in the suite so
   *  the exception lives with the thing that is exceptional. */
  noExterior: true,
  /** ROUND 83 -- "Then populate."
   *
   *  COMPUTED, NOT TYPED. Every other room in this file lists its furniture by
   *  hand, which is right for a smithy with nine objects in it and impossible
   *  for thirty-five chambers. `sewerProps()` derives the list from the same
   *  ASCII the walls come from -- ritual gear at both ends, clutter in the
   *  dead ends, almost nothing on the route -- and refuses any piece that
   *  would seal a chamber off. The shape is the ordinary `{ key, tx, ty }`, so
   *  the pass that furnishes the temple furnishes this and nothing new draws
   *  anything. */
  props: SEWER_PROPS,
  npcs: [],
  tileAt(tx, ty) {
    const row = SEWER_MAP[ty];
    if (row === undefined) return null;
    const c = row[tx];
    if (c === undefined) return null;
    if (c === '#') return TILE_VOID;
    if (c === '~') return TILE_SEWER_WATER;
    return TILE_FLOOR_SEWER;
  },
};
INTERIOR_ROOMS.push(SEWER_ROOM);

// ---------------------------------------------------------------------------
// ROUND 88 -- THE FOUR ASTRAL REALMS, as rooms.
//
// A realm is an interior in the only sense that matters to this file: a place
// with its own floor that is not part of the region grid. It is `astral: true`
// so `_stampInteriorBand` can skip it -- realms are stamped on ENTRY, one at a
// time, because painting 200,000 tiles at world build to serve four places
// almost nobody has reached yet is the wrong trade.
//
// They live in their own band below the interiors (ASTRAL_BAND_Y0), laid two
// by two, so `resiteInteriorsIntoBand` never sees them and cannot shuffle them
// into the ordinary band's flow.
// ---------------------------------------------------------------------------
const ASTRAL_MARGIN_TILES = 6;
export const ASTRAL_ROOMS = REALM_LIST.map((spec, i) => {
  // ROUND 92 -- THREE ACROSS, NOT TWO.
  //
  // A fifth realm in a two-wide layout needs a third ROW: 6 + 2*(224+8) + 224
  // = 694 rows, and the astral band is 480. Growing the band grows
  // MAP_TILES_TOTAL, which moves the minimap cache, the world map and every
  // saved coordinate -- a migration, for a layout choice.
  //
  // Three across puts the fifth in row 1 instead: 6 + 1*(224+8) + 224 = 462
  // rows, inside the 480 the band already reserves. Width is free -- the band
  // spans the whole 2656-tile map, and three columns use 694 of it -- so this
  // costs nothing and holds nine realms before the band's height is a question
  // again.
  const col = i % 3, row = Math.floor(i / 3);
  const gap = 8;
  const room = {
    id: spec.id,
    building: null,
    astral: true,
    realm: spec.id,
    name: spec.name,
    blurb: spec.blurb,
    enterLabel: spec.enterLabel,
    floor: spec.floor,
    // A literal inset rather than BAND_MARGIN_TILES: that constant is declared
    // a hundred lines below this block, and this .map() runs at module
    // evaluation, so reading it here is a temporal-dead-zone throw at import
    // time -- the kind of failure that takes the whole game down before
    // anything has a chance to be wrong in an interesting way.
    x: (ASTRAL_MARGIN_TILES + col * (REALM_TILES + gap)) * TILE,
    y: (ASTRAL_BAND_Y0 + ASTRAL_MARGIN_TILES + row * (REALM_TILES + gap)) * TILE,
    w: REALM_TILES, h: REALM_TILES,
    // No door gap: you do not walk into a realm, you step through a portal,
    // and you leave the same way. `_useAstralPortal` moves the player.
    door: { at: 0, span: 0 },
    // ROUND 88 -- the same flag the sewer carries, and for the same reason
    // round 82 introduced it: there is no building above this and therefore no
    // doorstep to find, so a doorstep would be the bug. Declared on the room
    // rather than added to a list in the suite, which is what that flag was
    // designed for -- "a future roofless room is excluded by describing
    // itself", and this is that future roofless room.
    noExterior: true,
    props: [],
    npcs: [],
    tileAt(tx, ty) {
      const r = realmGrid(this.realm);
      if (!r) return null;
      if (tx < 0 || ty < 0 || tx >= r.size || ty >= r.size) return TILE_VOID;
      const v = r.grid[ty * r.size + tx];
      if (v === 0) return TILE_VOID;
      if (v === 2) return TILE_SEWER_WATER;   // standing water: already impassable
      return null;                            // ground: the room's own floor
    },
    realmEntry() {
      const r = realmGrid(this.realm);
      return { x: this.x + (r.entry.x + 0.5) * TILE, y: this.y + (r.entry.y + 0.5) * TILE };
    },
  };
  return room;
});
INTERIOR_ROOMS.push(...ASTRAL_ROOMS);
export const ASTRAL_ROOM_BY_ID = Object.fromEntries(ASTRAL_ROOMS.map(r => [r.id, r]));

// ---------------------------------------------------------------------------
// ROUND 130 -- THE SOUL SPACE, which is a room in the same band.
//
//   "silver 1 being a transition to a soul space where you now have a seperate
//    map to explore ... Then start on Silver and Gold which are full screen."
//
// Built here, beside the realms, because it IS one structurally: a room in the
// astral band with no door, stamped on entry, that the player is teleported
// into and walks with ordinary movement and ordinary collision. Everything
// that makes an astral realm work -- the lazy stamp, the viewport culling, the
// interior camera -- is the machinery this needs, and reimplementing any of it
// would be a second interiors system.
//
// IT TAKES THE FREE SLOT. The realm layout is three across; five realms fill
// (0,0) (1,0) (2,0) (0,1) (1,1) and leave (2,1) empty, so this costs no band
// height and no change to MAP_TILES_TOTAL -- which, as the note above says,
// would move every saved coordinate in the game.
//
// The GRID is its own (soulSpace.js), not a cave: a soul is four planted plots
// around a path, and `buildRealmGrid`'s cave shapes would make it a cave.
const SOUL_COL = 2, SOUL_ROW = 1, SOUL_GAP = 8;
export const SOUL_ROOM = {
  id: 'soul_space',
  building: null,
  astral: true,
  // NOT `realm`. That field is what `realmGrid` is keyed on and what
  // `_useAstralPortal` reads; this room is entered by meditating, not by a
  // portal, and giving it a realm id would put it in the portal's hands.
  soul: true,
  name: 'Your Soul',
  blurb: 'Four plots and a path between them.',
  enterLabel: null,
  floor: 'marble',
  x: (ASTRAL_MARGIN_TILES + SOUL_COL * (REALM_TILES + SOUL_GAP)) * TILE,
  y: (ASTRAL_BAND_Y0 + ASTRAL_MARGIN_TILES + SOUL_ROW * (REALM_TILES + SOUL_GAP)) * TILE,
  w: SOUL_TILES, h: SOUL_TILES,
  door: { at: 0, span: 0 },   // no doorstep: you are not walked in, you arrive
  noExterior: true,
  props: [],
  npcs: [],
  // ROUND 130 -- "Only use 1 single plain grass tile."
  //
  // Plots and path alike. The grid still distinguishes them (SOUL_BED is what
  // `_buildSoulPlanting` sows into) but the GROUND under both is the same one
  // tile, so what varies across the soul is the planting rather than the turf.
  tileAt(tx, ty) {
    const g = soulGrid();
    if (tx < 0 || ty < 0 || tx >= g.size || ty >= g.size) return TILE_VOID;
    if (g.grid[ty * g.size + tx] === SOUL_VOID) return TILE_VOID;
    return TILE_FLOOR_SOULGRASS;
  },
  soulEntry() {
    const g = soulGrid();
    return { x: this.x + (g.entry.x + 0.5) * TILE, y: this.y + (g.entry.y + 0.5) * TILE };
  },
};
INTERIOR_ROOMS.push(SOUL_ROOM);

/** Which layout a building at (wx, wy) has inside. A pure function of the
 *  position, so a house's interior never changes between visits and nothing
 *  has to be stored to promise that. */
export function houseLayoutFor(wx, wy, model) {
  const fits = HOUSE_LAYOUTS.filter(l => !l.kinds || l.kinds.includes(model));
  const pool = fits.length ? fits : HOUSE_LAYOUTS;
  // FNV-1a, with TWO deliberate details.
  //
  // `Math.imul`, not `*`. JavaScript numbers are float64, so `h * 16777619`
  // with h near 2^32 produces a value past 2^53 and the LOW BITS -- the only
  // ones a modulo reads -- are rounded away. Measured with the plain multiply:
  // 195 of 200 positions hashed to the same layout out of two. It looks like a
  // working hash right up until you count the outputs.
  //
  // `>>> 0`, not `>>`. Round 64 shipped a "Bring In undefined" bug caused by a
  // SIGNED shift producing a negative modulo out of exactly this pattern.
  let h = 2166136261;
  const s = `${Math.round(wx)}|${Math.round(wy)}|${model || ''}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return pool[(h >>> 0) % pool.length];
}

/** Faults a suite can assert without booting the game. */
export function houseLayoutFaults() {
  const out = [];
  const keys = new Set(Object.keys(INTERIOR_PROPS));
  const ids = new Set();
  for (const l of HOUSE_LAYOUTS) {
    if (ids.has(l.id)) out.push(`duplicate layout ${l.id}`);
    ids.add(l.id);
    if (!l.props.length) out.push(`${l.id} is an empty room`);
    // Every layout must have somewhere to sit and something to sit at -- the
    // user asked for "tables, chairs, maybe a bed", so a room with neither is
    // not the thing that was asked for.
    const has = (re) => l.props.some(p => re.test(p.key));
    if (!has(/table|bench|desk|workbench|toolBench|counter/i)) out.push(`${l.id} has no surface`);
    if (!has(/chair|stool|bench|rocking/i)) out.push(`${l.id} has nothing to sit on`);
    for (const p of l.props) {
      // ROUND 262 -- a key is valid if it is a round-23 prop OR a piece of
      // furniture. Asked of both catalogues rather than of a widened list,
      // so a typo is still a fault.
      if (!keys.has(p.key) && !FURN_BY_KEY[p.key]) {
        out.push(`${l.id} uses unknown prop ${p.key}`);
      }
      // ...and a face, if it names one, has to be one the piece actually has.
      if (p.face) {
        const m = FURN_BY_KEY[p.key];
        if (!m) out.push(`${l.id}: ${p.key} names a face and is not furniture`);
        else if ((m.faces || ['northeast', 'northwest', 'southeast', 'southwest'])
          .indexOf(p.face) < 0) out.push(`${l.id}: ${p.key} has no ${p.face} face`);
      }
      if (p.tx < 1 || p.tx > HOUSE_ROOM_W - 2) out.push(`${l.id} prop ${p.key} outside the walls (tx ${p.tx})`);
      if (p.ty < 1 || p.ty > HOUSE_ROOM_H - 2) out.push(`${l.id} prop ${p.key} outside the walls (ty ${p.ty})`);
    }
  }
  // And every layout must be reachable: a `kinds` list naming only models that
  // no building ever uses would be a layout nobody can ever see.
  if (!HOUSE_LAYOUTS.some(l => l.kinds === null)) out.push('no catch-all layout');
  return out;
}


// ---------------------------------------------------------------------------
// ROUND 43 -- EVERY INTERIOR MOVES INTO ONE RESERVED BAND.
//
// The user's ask: "Move every interior into one reserved band past the last
// region." Until now the three original rooms squatted in three corners of
// the old 390-tile map and the eight temples sat at y=20,000 -- OUTSIDE the
// tile array altogether, which is why their floors rendered as black holes
// for five rounds until round 41 baked the art by hand.
//
// The band is INTERIOR_BAND_Y0 rows down, below the last region row, and is
// part of the array, so a room in it has real floor tiles like anywhere else.
// Rooms are laid left to right with a fixed gutter; the row wraps when it
// runs out of world width. Authoring elsewhere in this file is untouched --
// only x/y are rewritten, from one place, after every room exists.
const BAND_GUTTER_TILES = VOID_MARGIN_TILES * 2 + 4;   // keeps districts apart
const BAND_MARGIN_TILES = VOID_MARGIN_TILES + 2;       // inset from the band edge

// ROUND 103 -- THE ASTRAL REALMS WERE BEING RE-SITED AFTER ALL.
//
// The ASTRAL_ROOMS block above says, in its own comment, that they are laid
// out three across in their own band "so `resiteInteriorsIntoBand` never sees
// them and cannot shuffle them into the ordinary band's flow". Then, forty
// lines later, `INTERIOR_ROOMS.push(...ASTRAL_ROOMS)` -- and this function
// iterates INTERIOR_ROOMS. It has seen them since round 88 and has been
// throwing their placement away every build.
//
// What it cost, and why nothing caught it: five 224x224 blocks packed into a
// band 128 rows tall cannot fit, so the cursor ran past the band's last row
// and out the far side of it. The rooms it pushed down there still had
// coordinates inside the tile ARRAY, so nothing was out of bounds and nothing
// errored -- the floor stamper simply does not paint below the band, and nine
// civic halls (Ontaria's, Elehyd's and Bratugal's guild, smithy and auction
// house) stood on TILE_VOID. Reported by test_round43 as 60 of 74 rooms on
// real floor, which is a count that was easy to read as "the astral realms
// are not stamped yet, as designed".
//
// Widening the world for round 103's three regions is what surfaced it: the
// packing changed shape, and which nine rooms fell off the end changed with
// it. The bug is older than the change that revealed it.
export function resiteInteriorsIntoBand(bandY0Tiles, worldWidthTiles, bandY1Tiles = Infinity) {
  let cursorX = BAND_MARGIN_TILES;
  let cursorY = bandY0Tiles + BAND_MARGIN_TILES;
  let rowTall = 0;
  let overflow = 0;
  for (const room of INTERIOR_ROOMS) {
    // A room that owns its position keeps it. `astral` is the only such room
    // today; the test is the flag rather than the id list so the sixth realm
    // is excluded by being a realm.
    if (room.astral) continue;
    if (cursorX + room.w + BAND_GUTTER_TILES > worldWidthTiles) {
      cursorX = BAND_MARGIN_TILES;
      cursorY += rowTall + BAND_GUTTER_TILES;
      rowTall = 0;
    }
    room.x = cursorX * TILE;
    room.y = cursorY * TILE;
    rowTall = Math.max(rowTall, room.h);
    cursorX += room.w + BAND_GUTTER_TILES;
    // And say so if it happens again. The band's height is a fixed 128 rows
    // and the room list only grows; the next time it does not fit, this
    // returns a number instead of quietly putting a shop in the void.
    if (cursorY + room.h > bandY1Tiles) overflow++;
  }
  resiteInteriorsIntoBand.overflow = overflow;
  resiteInteriorsIntoBand.lastRow = cursorY + rowTall;
  // The derived exclusion rects are stale the moment a room moves.
  INTERIOR_DISTRICTS.length = 0;
  INTERIOR_DISTRICTS.push(...INTERIOR_ROOMS.map(room => ({
    id: room.id,
    x0: room.x - VOID_MARGIN_TILES * TILE,
    y0: room.y - VOID_MARGIN_TILES * TILE,
    x1: room.x + (room.w + VOID_MARGIN_TILES) * TILE,
    y1: room.y + (room.h + VOID_MARGIN_TILES) * TILE,
  })));
  return INTERIOR_ROOMS.map(r => ({ id: r.id, x: r.x, y: r.y }));
}

export function interiorRoomById(id) { return INTERIOR_ROOMS.find(r => r.id === id) || null; }

// Each room's reserved area: its floor rect grown by the void margin.
// DERIVED from the room list rather than typed as its own constant, so
// moving or resizing a room can never leave a stale exclusion rect behind
// (which would show up as a tree growing through the auction house floor
// several rounds later, with nothing obviously to blame).

// ===========================================================================
// ROUND 99 -- THE SOCIETY, THE CRAFTERS AND THE AUCTION HOUSE IN EVERY CITY.
//
// THE USER: "Get adventure society and crafting buildings in the cities."
// And, on what each city gets: "Society Hall, Crafting Hall, Auction House."
//
// ---------------------------------------------------------------------------
// WHAT WAS WRONG, MEASURED
// ---------------------------------------------------------------------------
// There was exactly ONE Adventure Society guild hall in the world and it was
// in Cadence. Three systems were stranded behind that one door:
//
//   * THE RANK LADDER -- five ranks, fifteen contracts, forty-eight steps --
//     is reported to the Guildmaster and the guild clerk, so a player in
//     Ontaria, Elehyd or Bratugal had to walk back to The Nek to advance a
//     star. Three acts of the game with no Society counter in them.
//   * THE MEMBER'S DISCOUNT, which is the reward a first-star contract offers
//     most often, is honoured at `SOCIETY_SHOP_ID` and nowhere else. Outside
//     The Nek it was a bonus that could be earned and never spent.
//   * ROUND 96'S WITHHELD CREDIT -- the Society declining to extend credit to
//     an adventurer whose judgement it does not trust -- is a consequence you
//     could only observe in Act 1.
//
// The crafters were the same story: all three benches, and the seventy-two
// authored confluence lines round 95.2 wrote for them, were in two Cadence
// interiors.
//
// ---------------------------------------------------------------------------
// WHY THIS IS NINE CLONES AND NOT NINE NEW ROOMS
// ---------------------------------------------------------------------------
// The three interiors this needs ALREADY EXIST and are the right shape:
//
//   the smithy       -- blacksmith bench, armoursmith bench, a weapon counter
//   the auction house -- the auctioneer, a ledger clerk, the jewelcrafter
//   the guild hall    -- the Society clerk and a ranking adventurer
//
// which is exactly the Society Hall / Crafting Hall / Auction House the user
// named. So the geometry, the floors, the twenty-six props and the door
// spans are cloned from Cadence's and only the ADDRESS and the STAFF change.
// Nine hand-laid rooms would be nine chances to get a prop inside a wall, and
// the layouts are already the ones the round-50 doorstep fixes were measured
// against.
//
// The staff are new people with their own names and their own greeting lines,
// because a bench is a person (round 90's rule) and three Hessa Coalwrights
// standing in three cities is one Hessa Coalwright with a teleporter. What is
// NOT duplicated is the confluence insight: `crafterTalk.js` is keyed on the
// TRADE, so a Karsk armoursmith gives the armoursmith's reading of your
// confluence on the day she opens, with no new authoring at all. That is the
// whole reason round 95.2 keyed it that way.
// ===========================================================================

/** The cities that get a full civic set. Not the towns, not the villages: the
 *  Society keeps branches in capitals, and a hamlet of three families with a
 *  guild hall reads as a shopping centre rather than as a frontier. */
// ROUND 196 -- FIVE, NOT THREE. The user: "build a hall in every city."
//
// `regions.js` calls six settlements a city, and three of them had a Society
// hall. Tolbrand Quay and Slagward had the sign on the map and nothing behind
// it -- which was fine while a hall was somewhere to hand in a contract, and
// stopped being fine the moment the Society market became the only place in
// the game that sells transport. A player who lives out of Slagward should not
// have to sail to Harrowmoor to buy a wagon.
//
// Cadence is the sixth and is not in this list: its hall is authored by hand
// in INTERIOR_ROOMS above, because it is the one the story uses.
export const CIVIC_CITIES = ['ont_city', 'ele_city', 'bra_city', 'sir_town', 'cin_slag'];

/** Which Cadence room each hall is cloned from, and what a city calls it. */
export const CIVIC_TEMPLATES = [
  { key: 'guild', from: 'guild', label: 'enter the Society hall' },
  { key: 'smithy', from: 'blacksmith', label: 'enter the crafting hall' },
  { key: 'auction', from: 'auction', label: 'enter the auction house' },
];

/** Where the nine rooms live in the interior band. Rows 30000, 32000 and
 *  34000 are empty -- the occupied rows are 0 (dens and houses), 400 (the two
 *  Cadence shops), 11000 (the guild), 20000 (the temples), 22000 (the cell)
 *  and the astral band far above. One row per city, three halls along it. */
export const CIVIC_BAND_Y0 = 30000;
export const CIVIC_BAND_STEP = 2000;
export const CIVIC_HALL_STEP = 1400;

/**
 * The people. Three cities, three halls, and everybody named.
 *
 * The `region` line each of them carries is the point of doing this by hand:
 * Harrowmoor runs on tides and ledgers, Karsk Landing is the last place with
 * walls, and Vashra is a court. A clerk who says the same sentence in all
 * three is a clerk nobody reads twice.
 */
export const CIVIC_STAFF = {
  ont_city: {
    city: 'Harrowmoor',
    guild: [
      { role: 'clerk', name: 'Guild Clerk Marra Sull', artKey: 'npc_posh_noble_girl_v1',
        dialogue: "Harrowmoor's hall keeps the same ledger as Cadence's. Your standing follows you; so does anything you have done to it." },
      { role: 'adept', name: 'Tidewarden Osk', artKey: 'npc_grizzled_adventurer',
        dialogue: "Half the contracts off this board end at the waterline. Learn what the tide does before you learn what the thing in it does." },
      // ROUND 121 -- the aura trainer, in every Society hall rather than
      // only in Cadence. The skill is the difference between an adventurer
      // and a first-year, and a player who never walks back to the capital
      // should not be a first-year forever.
      { role: 'auraTrainer', name: 'Aura-Adept Neris Thal', artKey: 'npc_female_adventurer_v1',
        dialogue: "Harbour town. Half the trade here works because nobody can read what you are. Learn to shut it, and I will show you how." },
    ],
    smithy: [
      { role: 'blacksmith', name: 'Dell Harrow', artKey: 'npc_muscular_adventurer',
        dialogue: "Salt gets into everything here. I temper twice and I still see blades come back grey." },
      { role: 'weapon', name: 'Coster Fen', artKey: 'shopkeeper', dialogue: null },
      { role: 'armoursmith', name: 'Ysolde Brack', artKey: 'npc_female_adventurer_v1',
        dialogue: "Plate and a harbour town do not agree. I fit more scale here than anywhere I have worked." },
      { role: 'hand', name: 'Pell', artKey: 'npc_peasant_man',
        dialogue: "I pump the bellows and I count the tide. One of those Dell pays me for." },
    ],
    auction: [
      { role: 'auction', name: 'Auctioneer Hale Redding', artKey: 'npc_auctioneer_m',
        dialogue: "Lot nine, a bronze-rank core of confirmed provenance. Confirmed by me, which is the only confirming that happens in this room." },
      { role: 'ledger', name: 'Tally Ossick', artKey: 'npc_noble_standing_v2',
        dialogue: "Everything that leaves this port is written down twice. Everything that leaves this room, three times." },
      { role: 'jewelcrafter', name: 'Ivet Marrow', artKey: 'npc_posh_noble_girl',
        dialogue: "Settings, not stones. Anyone can own a stone. Making one sit right against a person is the trade." },
    ],
  },
  ele_city: {
    city: 'Karsk Landing',
    guild: [
      { role: 'clerk', name: 'Guild Clerk Orrin Vayle', artKey: 'npc_noble_standing_v1',
        dialogue: "West of here the road gives up. The Society still posts contracts out there, and it still expects them reported back here." },
      { role: 'adept', name: 'Ashwalker Genn', artKey: 'npc_muscular_adventurer_v2',
        dialogue: "Nothing rots in this ground and nothing stays buried in it either. Take the silver contracts seriously." },
      // ROUND 121 -- the aura trainer, in every Society hall rather than
      // only in Cadence. The skill is the difference between an adventurer
      // and a first-year, and a player who never walks back to the capital
      // should not be a first-year forever.
      { role: 'auraTrainer', name: 'Aura-Adept Bren Solvig', artKey: 'npc_muscular_adventurer_v2',
        dialogue: "Out past the walls a projected aura is a dinner bell. I have buried people who thought that was somebody else's problem." },
    ],
    smithy: [
      { role: 'blacksmith', name: 'Korrik Ashgrave', artKey: 'npc_grizzled_adventurer_v1',
        dialogue: "This ground will not hold heat. I built the forge twice before I built it deep enough." },
      { role: 'weapon', name: 'Sabel Kray', artKey: 'shopkeeper', dialogue: null },
      { role: 'armoursmith', name: 'Nima Follard', artKey: 'npc_female_adventurer_v2',
        dialogue: "Out past the walls it is grit, not blades. I line everything. People laugh until their first week." },
      { role: 'hand', name: 'Wick', artKey: 'npc_cheerful_peasant_girl_v1',   // ROUND 193 -- was npc_adventurous_girl, which is Aedia's model
        dialogue: "Korrik says an apprentice who asks questions is an apprentice who lives. So I ask a lot." },
    ],
    auction: [
      { role: 'auction', name: 'Auctioneer Bel Ostrand', artKey: 'npc_auctioneer_f',
        dialogue: "We sell what the badlands give back. It is not always in the condition it went out in." },
      { role: 'ledger', name: 'Serl Quenn', artKey: 'npc_peasant_man_v1',
        dialogue: "Consignment, provenance, reserve. Bring me the first two and we can discuss the third." },
      { role: 'jewelcrafter', name: 'Odren Vasch', artKey: 'npc_noble_standing_v2',
        dialogue: "Cold work. My hands have not been warm since I came west and the settings are the better for it." },
    ],
  },
  bra_city: {
    city: 'Vashra',
    guild: [
      { role: 'clerk', name: 'Guild Clerk Ansel Pryor', artKey: 'npc_noble_standing_v2',
        dialogue: "The Society answers to no house on that council, and I am required to say so at least once to everyone who comes in." },
      { role: 'adept', name: 'Goldwarden Iselle', artKey: 'npc_female_adventurer_v2',
        dialogue: "Gold rank in this city is a political position whether you wanted one or not. Decide early how you will hold it." },
      // ROUND 121 -- the aura trainer, in every Society hall rather than
      // only in Cadence. The skill is the difference between an adventurer
      // and a first-year, and a player who never walks back to the capital
      // should not be a first-year forever.
      { role: 'auraTrainer', name: 'Aura-Adept Corvane Ilm', artKey: 'npc_noble_standing_v1',
        dialogue: "In this city an aura left open is a statement, and nine houses will read it whether you meant one or not. Better to choose." },
    ],
    smithy: [
      { role: 'blacksmith', name: 'Ruvin Kell', artKey: 'npc_muscular_adventurer_v1',
        dialogue: "Nine houses, nine liveries, and every one of them wants their colour in the steel. I do the steel. The colour is somebody else's problem." },
      { role: 'weapon', name: 'Marden Ost', artKey: 'shopkeeper', dialogue: null },
      // ROUND 103 -- off `npc_noblewoman` for the reason line 575 already
      // gives about that sheet, and which round 50 made a standing rule.
      { role: 'armoursmith', name: 'Cerise Vantry', artKey: 'npc_posh_noble_girl_v2',
        dialogue: "Court plate and field plate are different trades. I will make you either. I will not pretend one is the other." },
      { role: 'hand', name: 'Tob', artKey: 'npc_peasant_man_v2',
        dialogue: "Ruvin took me off the street. I have not asked why and I am not going to." },
    ],
    auction: [
      { role: 'auction', name: 'Auctioneer Verrin Dast', artKey: 'npc_auctioneer_m',
        dialogue: "Lot one, and every house in this city already knows what it is. That is the trouble with a good lot." },
      { role: 'ledger', name: 'Under-Clerk Sabb', artKey: 'npc_peasant_man',
        dialogue: "I write down who bid. Some weeks that is the most dangerous job in Vashra." },
      { role: 'jewelcrafter', name: 'Halvane Ryce', artKey: 'npc_posh_noble_girl_v2',
        dialogue: "Half this city's jewellery is a message. Tell me who is meant to read it and I will tell you what to wear." },
    ],
  },
  // ROUND 196 -- THE TWO CITIES THAT HAD NO HALL.
  //
  // Same three halls, same roles, written in their own regions' voices for the
  // reason the header above gives: a clerk who says the same sentence in five
  // cities is a clerk nobody reads twice. Tolbrand Quay is a port on an island
  // in a sand sea; Slagward is a town that lives on the edge of a burn.
  sir_town: {
    city: 'Tolbrand Quay',
    guild: [
      { role: 'clerk', name: 'Guild Clerk Nera Solt', artKey: 'npc_female_adventurer_v1',
        dialogue: "Everything here arrives by water and leaves by water. Your standing is the one thing that came overland, and it still counts." },
      { role: 'adept', name: 'Saltwarden Duve', artKey: 'npc_grizzled_adventurer',
        dialogue: "The sand moves and the water moves and neither of them is on your side. Read the contract twice before you take the boat." },
      { role: 'auraTrainer', name: 'Aura-Adept Rish Kandar', artKey: 'npc_muscular_adventurer_v2',
        dialogue: "Out on the flats there is nothing to hide behind, so what you project is what they find. Learn to project nothing." },
    ],
    smithy: [
      { role: 'blacksmith', name: 'Orin Cask', artKey: 'npc_muscular_adventurer',
        dialogue: "Salt and sand between them will eat a blade in a season. I forge thick here and I do not apologise for the weight." },
      { role: 'weapon', name: 'Yell Mardon', artKey: 'shopkeeper', dialogue: null },
      { role: 'armoursmith', name: 'Petra Calloway', artKey: 'npc_female_adventurer_v2',
        dialogue: "Scale, always. Plate on this coast is a coffin you paid for twice." },
      { role: 'hand', name: 'Dob', artKey: 'npc_peasant_man_v1',
        dialogue: "I fetch the water and I watch the tide. Orin says the second one is the job." },
    ],
    auction: [
      { role: 'auction', name: 'Auctioneer Mattock Rell', artKey: 'npc_auctioneer_m',
        dialogue: "Half of what comes under this hammer was pulled out of the sand. The other half was pulled out of the water. Ask which." },
      { role: 'ledger', name: 'Quill Sarn', artKey: 'npc_peasant_man_v2',
        dialogue: "A salvage claim is three signatures and a witness. I am usually all four, which I am told is irregular." },
      { role: 'jewelcrafter', name: 'Ossa Vint', artKey: 'npc_posh_noble_girl_v1',
        dialogue: "Coral, pearl, and whatever the sand polished for me. I do not cut much. I set what the sea already finished." },
    ],
  },
  cin_slag: {
    city: 'Slagward',
    guild: [
      { role: 'clerk', name: 'Guild Clerk Hessa Dorn', artKey: 'npc_posh_noble_girl_v2',
        dialogue: "We post the burn line every morning and it is wrong by noon. Take the contract that names a day, not a place." },
      { role: 'adept', name: 'Cinderwarden Balt', artKey: 'npc_grizzled_adventurer_v1',
        dialogue: "Everything out there is on fire or was recently. If it is neither, it is worse, and that is the one I want reported." },
      { role: 'auraTrainer', name: 'Aura-Adept Sun Verrick', artKey: 'npc_mage',
        dialogue: "Heat pushes at your aura all day here. Holding one closed in the waste is harder work than anything you will do in it." },
    ],
    smithy: [
      { role: 'blacksmith', name: 'Garrow Brant', artKey: 'npc_muscular_adventurer_v2',
        dialogue: "The forge is the easy part. Half my week is keeping the roof off the ash and the ash out of the quench." },
      { role: 'weapon', name: 'Ilde Swane', artKey: 'shopkeeper', dialogue: null },
      { role: 'armoursmith', name: 'Vesk Hollan', artKey: 'npc_muscular_adventurer_v1',
        dialogue: "Anything that touches skin gets lined. You will not notice the lining until the day it is the only reason you have a back." },
      { role: 'hand', name: 'Sootling Mar', artKey: 'npc_cheerful_peasant_girl_v2',
        dialogue: "They call everyone my age that here. I have stopped minding. Garrow says I will mind again when I am twenty." },
    ],
    auction: [
      { role: 'auction', name: 'Auctioneer Dace Ulliver', artKey: 'npc_auctioneer_f',
        dialogue: "Lot four came out of a burn three days cold. It is worth what it is worth because of where it was, not despite it." },
      { role: 'ledger', name: 'Tarn Ock', artKey: 'npc_peasant_man',
        dialogue: "I log the provenance. Out here that means which fire, and how long after." },
      { role: 'jewelcrafter', name: 'Marn Ceduc', artKey: 'npc_noble_standing',
        dialogue: "Obsidian and slag glass. People come a long way to call it ugly and then they buy it." },
    ],
  },
};

/** What each staff role becomes on the room's NPC entry. `shopId` is what the
 *  counter sells; `benchKey` is what the person makes. Nobody has both -- the
 *  round-78 rule, that two vendors of the same goods in one room is a choice
 *  the player cannot make, and its round-90 companion that a bench takes no
 *  coin. */
export const CIVIC_ROLE = {
  // ROUND 133 -- THE CLERK STOPPED KEEPING A COUNTER.
  //
  // The user: "Instead of 1 vendor have 4 brokers." Cadence's Petra Wynn is
  // authored in the template and lost her `shopId` there; the nine civic
  // clerks get theirs from THIS table, so leaving it would have left nine
  // Society halls quietly still selling out of a shelf the round retired --
  // and the brokers' market standing empty beside them.
  //
  // She keeps `society: true`, which is what makes her the person a contract
  // can be handed in to. Selling was never the job; it was a counter that
  // happened to be in the room.
  clerk: { shopId: null, benchKey: null, society: true },
  // THE HALL MASTER, and this role is the difference between a Society branch
  // and a Society desk. `_societyLines` refuses a contract whose `giver` is
  // not the person you are talking to, and everything above the FIRST star is
  // Yorin's -- who stands in Cadence. Without somebody here who can take that
  // work, three cities would have a hall you could register at and nothing
  // else, which is the stranding this round exists to end rather than move.
  adept: { shopId: null, benchKey: null, society: true, master: true },
  // ROUND 121 -- THE AURA TRAINER. No counter and no bench: what he hands
  // over is a piece of knowledge, and `trainKey` is the field the interact
  // ladder reads for it (see WorldScene._trainAuraControl).
  auraTrainer: { shopId: null, benchKey: null, trainKey: 'auraControl' },
  blacksmith: { shopId: null, benchKey: 'blacksmith' },
  armoursmith: { shopId: null, benchKey: 'armoursmith' },
  jewelcrafter: { shopId: null, benchKey: 'jewelcrafter' },
  weapon: { shopId: 'weapon', benchKey: null },
  auction: { shopId: 'auction', benchKey: null },
  ledger: { shopId: null, benchKey: null },
  hand: { shopId: null, benchKey: null },
};

/** The name over each door, per hall. */
export const CIVIC_HALL_NAME = {
  guild: (city) => `${city} Society Hall`,
  smithy: (city) => `${city} Crafting Hall`,
  auction: (city) => `${city} Auction House`,
};

function civicTemplate(id) {
  return INTERIOR_ROOMS.find(r => r.id === id) || null;
}

/**
 * The nine rooms.
 *
 * Positions are taken from the TEMPLATE's own npc list by role rather than
 * re-typed: the tile a person stands on was chosen against that room's props
 * -- Hessa is at the anvil, Bram is behind the desk on the east wall -- and a
 * new set of coordinates would be a new set of chances to stand somebody
 * inside a forge. The role mapping is what makes that possible, and it is why
 * the staff table above is written as roles rather than as positions.
 */
export const CIVIC_ROOMS = [];
for (let ci = 0; ci < CIVIC_CITIES.length; ci++) {
  const settlement = CIVIC_CITIES[ci];
  const staff = CIVIC_STAFF[settlement];
  if (!staff) continue;
  CIVIC_TEMPLATES.forEach((tpl, hi) => {
    const src = civicTemplate(tpl.from);
    if (!src) return;
    // Which template npc holds each role, so a clone inherits its tile.
    const slotOf = (role) => {
      const want = CIVIC_ROLE[role] || {};
      const hit = (src.npcs || []).find(n =>
        (want.benchKey && n.benchKey === want.benchKey)
        || (want.shopId && n.shopId === want.shopId));
      if (hit) return hit;
      // The roles with neither a bench nor a till -- the adept, the ledger
      // clerk, the apprentice -- take whichever template slot is still spare,
      // in order, which is the slot their opposite number occupies.
      return (src.npcs || []).filter(n => !n.shopId && !n.benchKey)[0] || (src.npcs || [])[0];
    };
    const used = new Set();
    const npcs = (staff[tpl.key] || []).map(person => {
      const want = CIVIC_ROLE[person.role] || {};
      let slot = slotOf(person.role);
      // Two roleless people in one room must not stand on one tile.
      if (used.has(slot)) {
        slot = (src.npcs || []).find(n => !used.has(n)) || slot;
      }
      used.add(slot);
      return {
        name: person.name,
        artKey: person.artKey,
        facing: slot.facing || 'south',
        tx: slot.tx, ty: slot.ty,
        shopId: want.shopId || null,
        benchKey: want.benchKey || null,
        // ROUND 121 -- the third kind of thing a person behind a role can be.
        // Left off, the trainers in the three city halls would have been three
        // people with a dialogue line and no lesson.
        trainKey: want.trainKey || null,
        society: !!want.society,
        societyMaster: !!want.master,
        settlement,
        dialogue: person.dialogue || null,
      };
    });
    CIVIC_ROOMS.push({
      id: `${tpl.key}_${settlement}`,
      building: `${tpl.key}_${settlement}`,
      settlement,
      civic: tpl.key,
      name: CIVIC_HALL_NAME[tpl.key](staff.city),
      enterLabel: tpl.label,
      floor: src.floor,
      x: 400 + hi * CIVIC_HALL_STEP,
      y: CIVIC_BAND_Y0 + ci * CIVIC_BAND_STEP,
      w: src.w, h: src.h,
      door: { ...src.door },
      // ROUND 103 -- DRESSED ON ENTRY, NOT AT WORLD BUILD.
      //
      // These nine rooms are the heaviest interiors in the game -- 68 sprites
      // each for a guild hall, 62 for an auction house -- and until this round
      // the last nine of them were being packed past the end of the interior
      // band and never built at all (see `resiteInteriorsIntoBand`). Fixing
      // that put ~160 objects back on the display list and took it to 5,233
      // against budgets.js's cap of 5,200.
      //
      // The cap is not the thing to change. budgets.js says so in its own
      // words and the user's standing instruction says so too: a new authored
      // room is marked `lazy` rather than paid for by raising the ceiling.
      // These are exactly that kind of room -- a player is inside one of the
      // nine perhaps a few times an act, and `_useDoorway` builds a lazy
      // room's contents on the way in, which is a few milliseconds nobody
      // feels against a permanent cost everybody pays.
      lazy: true,
      // ROUND 132 -- and the reliquary comes with the room.
      //
      // Copied rather than shared, so a future per-city chest is a change to
      // this line and not a hunt for aliasing. The record BEHIND it is one
      // record account-wide (see vault.js) -- what is cloned is the piece of
      // furniture, which is the correct half to duplicate: the Society has a
      // hall in every city and one set of books.
      vault: src.vault ? { ...src.vault } : null,
      // ROUND 133 -- and the door through to that city's own market, when the
      // template has one. Rewritten rather than copied: the template points at
      // 'guild_market', which is CADENCE'S market, and nine halls all opening
      // into one room would be nine doors to the same four people.
      inner: src.inner
        ? { ...src.inner, toRoom: `${src.inner.toRoom}_${settlement}` }
        : null,
      // ROUND 283 -- every door, rewritten the same way (the ritual hall's too).
      inners: src.inners
        ? src.inners.map(d => ({ ...d, toRoom: `${d.toRoom}_${settlement}` }))
        : undefined,
      props: (src.props || []).map(p => ({ ...p })),
      npcs,
    });
  });
}
INTERIOR_ROOMS.push(...CIVIC_ROOMS);

// ===========================================================================
// ROUND 133 -- A MARKET BEHIND EVERY SOCIETY HALL.
//
// The nine civic halls are clones of Cadence's, so splitting Cadence's hall in
// two splits all ten. The market clones alongside them rather than being
// shared, for the reason written on the `inner` rewrite above: a door is a
// place, and nine doors into one room is one room with nine doors.
//
// THE BROKERS ARE POSTS, NOT PEOPLE, outside Cadence. Ilsa Ternmoor and Hadwin
// Coss argue with each other across the capital's market floor and are worth
// the names; the branch offices get the same four COUNTERS staffed by the
// Society rather than four more invented biographies per city, which is
// thirty-six names nobody would ever read. The shop ids still carry the
// settlement, so every city's shelves roll their own daily stock.
//
// `lazy` for the same budget reason the halls are: a room the player visits a
// few times an act should not hold sprites the whole session.
// ===========================================================================
const MARKET_TEMPLATE = INTERIOR_ROOMS.find(r => r.id === 'guild_market');
export const CIVIC_MARKETS = [];
if (MARKET_TEMPLATE) {
  const POSTS = [
    'Society Relic Broker', 'Society Relic Broker',
    'Society Armourer', 'Society Quartermaster',
    // ROUND 196 -- and the yardmaster, in every city's market. The shop id is
    // suffixed with the settlement by the loop below, like the brokers', so
    // each city's forecourt is its own shelf.
    'Society Yardmaster',
  ];
  for (let ci = 0; ci < CIVIC_CITIES.length; ci++) {
    const settlement = CIVIC_CITIES[ci];
    const staff = CIVIC_STAFF[settlement];
    if (!staff) continue;
    CIVIC_MARKETS.push({
      ...MARKET_TEMPLATE,
      id: `guild_market_${settlement}`,
      building: null,
      settlement,
      civic: 'guildMarket',
      name: `${staff.city} Society Market`,
      lazy: true,
      // One row below the civic band's halls, so a market never lands on the
      // hall it belongs to. `resiteInteriorsIntoBand` repacks all of it.
      x: 400 + CIVIC_TEMPLATES.length * CIVIC_HALL_STEP,
      y: CIVIC_BAND_Y0 + ci * CIVIC_BAND_STEP,
      door: { ...MARKET_TEMPLATE.door },
      inner: { ...MARKET_TEMPLATE.inner, toRoom: `guild_${settlement}` },
      props: (MARKET_TEMPLATE.props || []).map(p => ({ ...p })),
      npcs: (MARKET_TEMPLATE.npcs || []).map((n, i) => ({
        ...n,
        name: POSTS[i] || n.name,
        shopId: `${n.shopId}_${settlement}`,
        settlement,
      })),
    });
  }
  INTERIOR_ROOMS.push(...CIVIC_MARKETS);
}

// ROUND 283 -- and a ritual hall behind every city's Society hall, for the
// reason the markets are cloned: a door is a place. The ritualist is a POST
// outside Cadence, as the brokers are.
export const CIVIC_RITUAL_ROOMS = [];
for (let ci = 0; ci < CIVIC_CITIES.length; ci++) {
  const settlement = CIVIC_CITIES[ci];
  const staff = CIVIC_STAFF[settlement];
  if (!staff) continue;
  CIVIC_RITUAL_ROOMS.push({
    ...RITUAL_ROOM,
    id: `guild_ritual_${settlement}`,
    settlement,
    civic: 'guildRitual',
    name: `${staff.city} Society Ritual Hall`,
    lazy: true,
    x: 400 + (CIVIC_TEMPLATES.length + 1) * CIVIC_HALL_STEP,
    y: CIVIC_BAND_Y0 + ci * CIVIC_BAND_STEP,
    door: { ...RITUAL_ROOM.door },
    inner: { ...RITUAL_ROOM.inner, toRoom: `guild_${settlement}` },
    props: RITUAL_ROOM.props.map(p => ({ ...p })),
    npcs: RITUAL_ROOM.npcs.map(n => ({ ...n, name: 'Society Ritualist', settlement })),
  });
}
INTERIOR_ROOMS.push(...CIVIC_RITUAL_ROOMS);

export function civicFaults() {
  const out = [];
  if (CIVIC_ROOMS.length !== CIVIC_CITIES.length * CIVIC_TEMPLATES.length) {
    out.push(`${CIVIC_ROOMS.length} civic rooms, not ${CIVIC_CITIES.length * CIVIC_TEMPLATES.length}`);
  }
  const seenId = new Set(), seenAt = new Set();
  for (const r of CIVIC_ROOMS) {
    if (seenId.has(r.id)) out.push(`two rooms called ${r.id}`);
    seenId.add(r.id);
    // Two rooms at one address overlap in the band and stamp over each other.
    const at = `${r.x}|${r.y}`;
    if (seenAt.has(at)) out.push(`${r.id} stands on another room at ${at}`);
    seenAt.add(at);
    if (!r.building) out.push(`${r.id} has no building to hang a door on`);
    if (!(r.w > 4 && r.h > 4)) out.push(`${r.id} is ${r.w}x${r.h}`);
    if (!r.door || r.door.at + r.door.span > r.w) out.push(`${r.id}'s door is off its wall`);
    if (!(r.npcs || []).length) out.push(`${r.id} is empty`);
    for (const n of (r.npcs || [])) {
      if (!n.name) out.push(`somebody in ${r.id} has no name`);
      if (n.tx === undefined || n.ty === undefined) out.push(`${n.name} stands nowhere`);
      if (n.tx < 1 || n.ty < 1 || n.tx >= r.w - 1 || n.ty >= r.h - 1) {
        out.push(`${n.name} stands in ${r.id}'s wall at ${n.tx},${n.ty}`);
      }
      if (n.shopId && n.benchKey) out.push(`${n.name} keeps a till and a bench`);
    }
    // Nobody shares a tile, which is the failure the role mapping can make.
    const tiles = new Set();
    for (const n of (r.npcs || [])) {
      const k = `${n.tx},${n.ty}`;
      if (tiles.has(k)) out.push(`two of ${r.id}'s staff stand on ${k}`);
      tiles.add(k);
    }
  }
  // Every city must be able to do all three things, or this round did not
  // land: register and report, commission all three trades, and sell a lot.
  for (const s of CIVIC_CITIES) {
    const rooms = CIVIC_ROOMS.filter(r => r.settlement === s);
    const staff = rooms.flatMap(r => r.npcs || []);
    // ROUND 133 -- A DESK, NOT A COUNTER. Round 103 wrote this as
    // `shopId === 'guild'` because the clerk happened to be both; the user's
    // "Instead of 1 vendor have 4 brokers" separated them, and the thing a
    // Society hall must have is somebody you can REGISTER with -- which is
    // `society`, the flag `_societyLines` actually reads.
    if (!staff.some(n => n.society)) out.push(`${s} has no Society desk`);
    // ...and the trade moved to that city's market, which must exist and be
    // staffed. Looked up through INTERIOR_ROOMS because a market is its own
    // list, and a check that cannot see the thing it requires would pass by
    // accident the day somebody deletes it.
    const market = INTERIOR_ROOMS.find(r => r.id === `guild_market_${s}`);
    if (!market) out.push(`${s} has no Society market`);
    // ROUND 196 -- FIVE COUNTERS: the four brokers and the yardmaster who sells
    // transport. ROUND 267 -- FOUR AGAIN: the yardmaster stands in the stable
    // yard now (see the room's own note and `_staffStableYard`). Both halves
    // are still asserted rather than one count of four, so a yardmaster who
    // gets copied back into a market hall fails this instead of passing as a
    // fifth broker.
    else if ((market.npcs || []).filter(n => n.shopId && !String(n.shopId).startsWith('transport')).length !== 4
      || (market.npcs || []).filter(n => String(n.shopId || '').startsWith('transport')).length !== 0) {
      out.push(`${s}'s market has ${(market.npcs || []).filter(n => n.shopId).length} counters, `
        + 'not four brokers and no yardmaster');
    }
    if (!staff.some(n => n.society)) out.push(`${s} has nobody to report a contract to`);
    // A branch that can only register you is a desk, not a hall.
    if (!staff.some(n => n.societyMaster)) out.push(`${s} can take first-star work and nothing above it`);
    for (const bench of ['blacksmith', 'armoursmith', 'jewelcrafter']) {
      if (!staff.some(n => n.benchKey === bench)) out.push(`${s} has no ${bench}`);
    }
    if (!staff.some(n => n.shopId === 'auction')) out.push(`${s} has no auctioneer`);
    if (!staff.some(n => n.shopId === 'weapon')) out.push(`${s} has no weapon counter`);
  }
  // Everybody is a different person. Three cities of Hessa Coalwright is one
  // Hessa Coalwright with a teleporter.
  const names = CIVIC_ROOMS.flatMap(r => (r.npcs || []).map(n => n.name));
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) out.push(`${dup[0]} works in two cities`);
  for (const r of CIVIC_ROOMS) {
    for (const n of (r.npcs || [])) {
      const cad = ['Hessa Coalwright', 'Bram the Smith', 'Vessa Ordran', 'Soot',
        'Auctioneer Valla Deyne', 'Clerk Ondrey', 'Sennic Vaile',
        'Guild Clerk Petra Wynn', 'Ranger Adept Kolm'];
      if (cad.includes(n.name)) out.push(`${n.name} is a Cadence name reused in ${r.settlement}`);
    }
  }
  // And the band they were given is genuinely empty.
  for (const r of CIVIC_ROOMS) {
    const clash = INTERIOR_ROOMS.find(o => o !== r && o.y === r.y && o.x === r.x);
    if (clash) out.push(`${r.id} shares an address with ${clash.id}`);
  }
  return out;
}

export function civicCensus() {
  return {
    cities: CIVIC_CITIES.length,
    rooms: CIVIC_ROOMS.length,
    staff: CIVIC_ROOMS.reduce((n, r) => n + (r.npcs || []).length, 0),
    benches: CIVIC_ROOMS.reduce((n, r) => n + (r.npcs || []).filter(x => x.benchKey).length, 0),
    counters: CIVIC_ROOMS.reduce((n, r) => n + (r.npcs || []).filter(x => x.shopId).length, 0),
  };
}

export const INTERIOR_DISTRICTS = INTERIOR_ROOMS.map(room => ({
  id: room.id,
  x0: room.x - VOID_MARGIN_TILES * TILE,
  y0: room.y - VOID_MARGIN_TILES * TILE,
  x1: room.x + (room.w + VOID_MARGIN_TILES) * TILE,
  y1: room.y + (room.h + VOID_MARGIN_TILES) * TILE,
}));

export function insideInteriorDistrict(wx, wy) {
  for (const d of INTERIOR_DISTRICTS) {
    if (wx >= d.x0 && wx <= d.x1 && wy >= d.y0 && wy <= d.y1) return true;
  }
  return false;
}

// Room floor rect in world units (the walkable interior, walls sit ON its
// perimeter tile line, outside this rect).
export function roomFloorRect(room) {
  return { x0: room.x, y0: room.y, x1: room.x + room.w * TILE, y1: room.y + room.h * TILE };
}

// ROUND 23 -- the rect the room's FLOOR is painted over, which is one tile
// larger on every side than the walkable floor.
//
// The wall ring stands half a tile outside the floor rect (see
// buildRoomWalls), so painting only the floor rect leaves a tile-wide band of
// void between the last floor tile and the foot of the wall -- which reads,
// correctly, as the wall floating above a hole. The player can never reach
// this band (the wall colliders stop them a tile short of it), so painting it
// changes nothing about where anyone can stand; it just puts ground under the
// skirting.
// ROUND 41 -- trimmed from a full tile to half. With the wall SPRITES moved
// onto the floor rect's own boundary line (see buildRoomWalls), a full tile
// of painted floor beyond it showed as a lip of floor OUTSIDE the room; half
// a tile still puts ground under the skirting without sticking out past it.
export function roomFloorPaintRect(room) {
  const r = roomFloorRect(room);
  const m = TILE / 2;
  // ===== ROUND 266 -- NOT PAST THE TWO WALLS THAT ARE DRAWN ===============
  //
  //   "Floor should be hidden or trimmed so it's not visible behind the wall"
  //
  // The half-tile skirt is round 41's, and its reason was true when it was
  // written: the wall SPRITES stood on the collider ring, half a tile outside
  // the floor, so painting only the floor rect left the wall floating above a
  // hole. Round 259 moved the wall art INWARD onto the outermost floor tile --
  // that was the fix for the runs standing off the room -- and the skirt was
  // never re-examined. So for two rounds the floor has been painted half a
  // tile PAST the wall that now stands in front of it, which is the strip of
  // planks showing on the far side in his screenshots.
  //
  // ONLY THE TWO BACK SIDES LOSE IT. Map north (y0) and map west (x0) are the
  // runs that carry wall art; south and east are the camera-side runs that
  // draw nothing, so there is no wall there to see past and the skirt still
  // does its original job of putting ground under the seam.
  return { x0: r.x0, y0: r.y0, x1: r.x1 + m, y1: r.y1 + m };
}

export function roomPaintedAt(wx, wy) {
  for (const room of INTERIOR_ROOMS) {
    const r = roomFloorPaintRect(room);
    if (wx >= r.x0 && wx < r.x1 && wy >= r.y0 && wy < r.y1) return room;
  }
  return null;
}

export function roomContains(room, wx, wy) {
  const r = roomFloorRect(room);
  return wx >= r.x0 && wx < r.x1 && wy >= r.y0 && wy < r.y1;
}

export function interiorRoomAt(wx, wy) {
  for (const room of INTERIOR_ROOMS) if (roomContains(room, wx, wy)) return room;
  return null;
}

// Tile centre of a room-local floor tile.
export function roomTileCentre(room, tx, ty) {
  return { x: room.x + (tx + 0.5) * TILE, y: room.y + (ty + 0.5) * TILE };
}

// Where the player stands when they walk in (and the pad they step onto to
// leave): just inside the door gap on the south wall.
export function roomEntryPoint(room) {
  return {
    x: room.x + (room.door.at + room.door.span / 2) * TILE,
    // One full tile in from the floor's south edge, i.e. 1.5 tiles from the
    // wall line -- outside the sealed door panel's 28-unit stop distance, so
    // the player materialises standing, not shoved.
    y: room.y + (room.h - 1) * TILE,
  };
}

// --- Wall run --------------------------------------------------------------
// Generalises town.js's buildFenceYard from "rectangular perimeter of fence
// panels" to "rectangular perimeter of wall panels, one per tile, with a
// door gap and with the two camera-facing runs tagged so WorldScene can draw
// them as low trim instead of full-height wall" (see INTERIOR_WALL_ART for
// why that split has to exist).
//
// Facings are derived exactly the way buildFenceYard/findBuildingFacing do
// it: the edge's OUTWARD world-axis normal, run through the shared
// facingFromMove snapper, rather than a hand-picked screen direction.
export function buildRoomWalls(room) {
  const r = roomFloorRect(room);
  const panels = [];
  // The wall ring sits half a tile OUTSIDE the floor rect on all four sides
  // (see WALL_RADIUS for why that offset is what keeps every floor tile
  // standable).
  const north = r.y0 - TILE / 2, south = r.y1 + TILE / 2;
  const west = r.x0 - TILE / 2, east = r.x1 + TILE / 2;

  // ROUND 23 -- colliders every tile, SPRITES every WALL_RUN_TILES tiles,
  // because the delivered wall art is a two-tile section (see
  // WALL_RUN_TILES). A sprite panel is centred on the join between the two
  // tiles it covers, hence the +TILE/2 offset on its position.
  //
  // The sprite phase is aligned to the door so the gap falls exactly on one
  // omitted panel rather than straddling two half-drawn ones: `drawsAt`
  // is true for the tile index that STARTS a panel, counting from door.at.
  const span = room.door.span;
  const drawsAt = (i) => ((i - room.door.at) % WALL_RUN_TILES + WALL_RUN_TILES) % WALL_RUN_TILES === 0;
  const mid = (v) => v + (TILE * WALL_RUN_TILES) / 2 - TILE / 2;
  // ROUND 41 -- "Interiors need the walls adjusted to sit on the inner face
  // of the squares, that will line the walls up."
  //
  // COLLIDERS stay where they are: the ring of solids half a tile outside the
  // floor rect is what makes every floor tile standable (see WALL_RADIUS),
  // and moving it would either steal a walkable row or let the player touch
  // the void. Only the SPRITES move -- half a tile inward along each side's
  // own normal, which lands each wall's base exactly on the floor rect's
  // boundary line instead of a half-tile out in the dark. The wall then
  // shares an edge with the outermost floor tiles and the two grids line up.
  const INSET = TILE / 2;
  const northSprite = north + INSET, southSprite = south - INSET;
  const westSprite = west + INSET, eastSprite = east - INSET;

  for (let i = -1; i <= room.w; i++) {
    const x = r.x0 + (i + 0.5) * TILE;
    panels.push({ x, y: north, facing: facingFromMove(0, -1), piece: 'back', sprite: drawsAt(i), spriteX: mid(x), spriteY: northSprite });
    // The door gap keeps its COLLIDER and loses only its sprite ('door'
    // piece). A literal hole in the wall would let the player stroll out of
    // the room into the empty reserved district beside it, which looks like
    // a bug and is one; sealing it invisibly means the gap reads as a
    // doorway, the doormat marks it, and interact is the only way through.
    const inDoor = i >= room.door.at && i < room.door.at + span;
    panels.push({
      x, y: south, facing: facingFromMove(0, 1), piece: inDoor ? 'door' : 'front',
      sprite: !inDoor && drawsAt(i), spriteX: mid(x), spriteY: southSprite,
    });
  }
  for (let j = 0; j < room.h; j++) {
    const y = r.y0 + (j + 0.5) * TILE;
    panels.push({ x: west, y, facing: facingFromMove(-1, 0), piece: 'back', sprite: drawsAt(j), spriteX: westSprite, spriteY: mid(y) });
    panels.push({ x: east, y, facing: facingFromMove(1, 0), piece: 'front', sprite: drawsAt(j), spriteX: eastSprite, spriteY: mid(y) });
  }
  return panels;
}
