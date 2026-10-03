// A river/lake water feature, round 4 -- genuinely NEW terrain (this game
// had zero water/elevation tiles before this round). The user's own words
// named 4 distinct water looks: "light water tiles, waterfall tiles, rapids
// and rocky water, and dark slow moving water" -- rather than scattering 4
// unrelated water patches around the map, this shapes them into ONE
// coherent river that tells a small story as you follow it: it opens as a
// calm light-water stream, narrows into a rocky rapids/waterfall choke
// point, then widens into a dark, slow-moving lake, then narrows back into
// a light-water stream again on the far side. That's the same "distance
// along the river" idea a real river has (fast shallow water upstream of a
// narrows, a slow deep pool below it), just simplified to 4 named zones
// instead of a physically simulated flow.
//
// SCOPE DECISION: no real elevation/z-level system exists in this port (see
// MIGRATION_PLAN.md's history of this being explicitly descoped in an
// earlier round), so "waterfall" here is a visual tile-variant transition
// (the water_falls.png tiles, themselves a blended deep->rapids gradient --
// see extract_round4_tilesets.py) placed at the narrows, NOT a literal
// physical drop the player falls off of. Water tiles are simply impassable
// (same as a building) rather than being a hazard/current -- also a
// deliberate simplification, consistent with this project's practice of
// documenting a descoped feature rather than silently skipping or faking it.
//
// The river is defined purely as a function of world position (relative to
// town origin) -- no stored state, same "just re-derive it" approach
// tileVariantHash/classifyTile already use for everything else ground-
// related, so it works uniformly whether _buildGround is classifying the
// whole map up front or a single tile is being re-queried later (e.g. for
// collision).

import { TILE_WATER_LIGHT, TILE_WATER_DEEP, TILE_WATER_RAPIDS, TILE_WATER_FALLS } from './town.js';

// River run: centered south-east of town, well outside the CITY_RADIUS +
// monster-spawn/obstacle ring (that ring only reaches CITY_RADIUS+420 --
// see WorldScene's SPAWN_SAMPLE/OBSTACLE_OFFSETS -- so keeping the river's
// closest approach to town beyond that avoids any overlap with existing
// placed content) and well inside the 5x-expanded map's wilderness (see
// town.js/WorldScene's MAP_TILES rescale), running at a diagonal across a
// wide span of it for visual impact.
const BASE_X0 = -4200, BASE_X1 = 4200; // world-x span, relative to town origin
const BASE_Y = 3400;                    // base world-y offset, relative to town origin (south of town)
const AMPLITUDE = 700, WAVELENGTH = 2600; // gentle bends
const BASE_HALF_WIDTH = 95;

// Zones, as a fraction (0..1) of progress along BASE_X0..BASE_X1:
//   0.00-0.16  light water (upper stream)
//   0.16-0.24  rapids narrows (width shrinks)
//   0.24-0.30  waterfall band (right at the narrowest point)
//   0.30-0.72  dark slow lake (width grows)
//   0.72-0.84  rapids narrows again (width shrinks)
//   0.84-1.00  light water (lower stream)
function zoneAndWidthMult(frac) {
  if (frac < 0.16) return { zone: TILE_WATER_LIGHT, mult: 1.0 };
  if (frac < 0.24) return { zone: TILE_WATER_RAPIDS, mult: 0.55 };
  if (frac < 0.30) return { zone: TILE_WATER_FALLS, mult: 0.45 };
  if (frac < 0.72) return { zone: TILE_WATER_DEEP, mult: 1.0 + Math.sin((frac - 0.30) / 0.42 * Math.PI) * 2.1 };
  if (frac < 0.84) return { zone: TILE_WATER_RAPIDS, mult: 0.55 };
  return { zone: TILE_WATER_LIGHT, mult: 1.0 };
}

// ROUND 19 -- BRIDGES. The river spans world-x -4200..4200 at a latitude
// well inside the map, and water is impassable (see WorldScene._isWaterAt),
// so before this round the river was a wall that sealed off everything south
// of it. Three crossings are cut through it: one due south of town (the
// obvious one, straight out of the south gate) and one either side.
//
// A bridge is modelled as a gap in the WATER rather than as a structure
// sitting on top of it -- riverTileTypeAt returns null inside a bridge span,
// so the tile falls through to ordinary ground classification, is passable
// for free, and _buildGround paints it as road (see BRIDGE_TILE handling
// there). That keeps the river's own "just re-derive it from position" model
// intact: still no stored state, still one pure function.
export const BRIDGE_CENTERS = [0, -2900, 2900]; // relative world-x
export const BRIDGE_HALF_WIDTH = 96;            // 6 tiles across

export function bridgeAt(relX, relY) {
  if (riverBedAt(relX, relY) === null) return false;
  for (const c of BRIDGE_CENTERS) {
    if (Math.abs(relX - c) <= BRIDGE_HALF_WIDTH) return true;
  }
  return false;
}

// The river's raw extent, bridges included -- used by bridgeAt (so a bridge
// only exists where there is actually water to cross) and by the forest
// scatter, which must keep trees out of the whole river bed, not just the
// wet parts.
export function riverBedAt(relX, relY) {
  if (relX < BASE_X0 || relX > BASE_X1) return null;
  const frac = (relX - BASE_X0) / (BASE_X1 - BASE_X0);
  const centerY = BASE_Y + Math.sin((relX - BASE_X0) / WAVELENGTH * Math.PI * 2) * AMPLITUDE;
  const { zone, mult } = zoneAndWidthMult(frac);
  if (Math.abs(relY - centerY) > BASE_HALF_WIDTH * mult) return null;
  return zone;
}

// Returns the water tile type (TILE_WATER_*) for a world point relative to
// town origin, or null if the point is on dry land. `originX/originY` let
// the caller pass already-origin-relative coordinates (WorldScene does the
// subtraction once per tile, same pattern classifyTile itself uses).
export function riverTileTypeAt(relX, relY) {
  const bed = riverBedAt(relX, relY);
  if (bed === null) return null;
  // A bridge span reads as dry land so it is passable and paints as road.
  for (const c of BRIDGE_CENTERS) {
    if (Math.abs(relX - c) <= BRIDGE_HALF_WIDTH) return null;
  }
  return bed;
}
