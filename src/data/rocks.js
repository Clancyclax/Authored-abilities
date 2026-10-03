// Round 21 -- rock/boulder scatter. The user's ask: "Attached are some art
// assets for rocks, scatter lightly around the map, each rock should be
// sized to roughly 1 tile with collision."
//
// This finally retires the placeholder obstacles. WorldScene has carried ten
// brown rounded rectangles since round 2, with a comment openly admitting
// they were "plain generated rectangles standing in for 'something blocks
// movement here', not a visual port of the original's obstacle art". These
// are that art.
//
// Layout follows the same stateless, deterministic approach as trees.js:
// a coarse grid where each cell rolls its own occupancy from a hash of its
// own coordinates, so the scatter is identical across reloads with nothing
// stored. The differences from the forest are deliberate:
//
//   * LIGHT, not clumpy. The forest wants thickets and clearings, so it
//     rolls a density per cluster and drops 3-9 trees in the ones that pass.
//     Rocks want to read as incidental scenery, so a cell yields at most ONE
//     rock -- the lightness comes from the cell being large, not from most
//     cells being empty.
//   * Every rock is jittered inside its cell, so the grid never shows.
//   * Which of the 12 sprites, and whether it is mirrored, are both hashed --
//     mirroring doubles the apparent variety for free, and works because
//     these are single-view sprites with no directional lighting to break.
// Tuned against the map's actual size rather than by feel: the wilderness
// annulus runs from ~2,100 to ~6,040 units out, and the first pass (520
// spacing at a 0.34 hit rate) produced 120 rocks over roughly 100 million
// square units -- about one per two screens, which is less "lightly
// scattered" than "vanishingly rare". These values land nearer 250, so a
// rock is something you pass every so often rather than never.
const ROCK_SPACING = 440;   // world units between grid cells
const ROCK_CHANCE = 0.55;   // fraction of cells that hold a rock

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

// `isBlocked(x, y)` is supplied by WorldScene, which owns the tile map --
// same contract generateForest uses, so rocks stay out of water, off the
// river bed, off every road and clear of buildings without this module
// needing to know what any of those are.
export function generateRocks({ cityRadius, mapHalf, rockCount, margin = 200, isBlocked = null }) {
  const rocks = [];
  const innerR = cityRadius + 160; // just outside the wall, so the town edge isn't bare
  const outerR = mapHalf - margin;
  const cMin = Math.floor(-outerR / ROCK_SPACING), cMax = Math.ceil(outerR / ROCK_SPACING);

  for (let cy = cMin; cy <= cMax; cy++) {
    for (let cx = cMin; cx <= cMax; cx++) {
      if (rand01(cx, cy, 11) > ROCK_CHANCE) continue;
      const jx = (rand01(cx, cy, 21) - 0.5) * ROCK_SPACING * 0.85;
      const jy = (rand01(cx, cy, 22) - 0.5) * ROCK_SPACING * 0.85;
      const x = (cx + 0.5) * ROCK_SPACING + jx;
      const y = (cy + 0.5) * ROCK_SPACING + jy;
      const dist = Math.hypot(x, y);
      if (dist < innerR || dist > outerR) continue;
      if (isBlocked && isBlocked(x, y)) continue;
      rocks.push({
        x, y,
        frame: Math.floor(rand01(cx, cy, 31) * rockCount) % rockCount,
        flip: rand01(cx, cy, 41) < 0.5,
      });
    }
  }
  return rocks;
}
