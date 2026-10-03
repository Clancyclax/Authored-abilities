// ============================================================================
// ROUND 107 -- PUTTING A SPECIFIC THING ON A SPECIFIC TILE.
//
// The user, after the map editor could not offer it:
//
//   "My editor won't allow me to modify the objects in the cities."
//
// Verified before building anything, because it is a large claim: `_buildSites`
// draws all fourteen of a region's sites from `seededRng`; `_buildCityProps`
// takes the landmark's angle from `stableHash(seed)` and the market row from
// the settlement's own hash and radius; trees, rocks and flora are densities
// and radii. The only positional arrays in `regions.js` were `arrival`, `exit`,
// `settlements`, `roads`, `rivers` and `lakes`. There was no override anywhere,
// and several comments record the project deliberately moving AWAY from
// hand-placement over the rounds.
//
// That was the right instinct for scenery -- nobody wants to place seven
// thousand rocks -- and the wrong one for the four fountains in the world. So
// this does not replace the generators. It puts a thin, explicit layer in
// FRONT of them:
//
//   1. Whatever a region lists in `placed` is laid down first, exactly where
//      it says.
//   2. Every generator is then told to keep clear of it.
//
// The user's choice, asked before this was built: keep clear, not replace and
// not overlap. A town still fills itself in around what you put there.
//
// ONE ARRAY, FOUR KINDS. A placed entry names WHAT it is with `kind`, and the
// scene dispatches to the pass that already knows how to draw that kind. The
// alternative -- four arrays -- would have been four things for the editor to
// learn, four validators and four keep-clear registries, to express one idea.
//
// THE SHAPE IS THE SHAPE THE EDITOR ALREADY WRITES. `roads`, `rivers` and
// `lakes` are arrays of objects carrying `R(x, y)` coordinates, and the editor
// rewrites such an array whole. `placed` is deliberately the same, so wiring
// the editor to it is a UI job rather than a new save path.
// ============================================================================

/**
 * The four kinds, and what each one costs the generator around it.
 *
 * `clear` is the radius in TILES that the procedural passes keep off a placed
 * entry. The numbers are not uniform because the things are not: a fountain is
 * a landmark you walk around and a tuft of flora is something you walk over.
 *
 *   cityProp   fountains, statues, stalls, braziers, crates -- cityProps.js
 *   scenery    one tree, one rock, one clump of flora
 *   structure  an actual building, with a door and whatever it holds
 *   site       one of the fourteen per-region sites, pinned instead of rolled
 */
export const PLACED_KINDS = {
  cityProp: {
    label: 'City prop',
    clear: 2,
    // Which table its `key` must appear in. Named rather than imported so this
    // file stays a leaf -- placed.js is imported by regions.js, and regions.js
    // must not pull the city tables in behind it.
    table: 'CITY_PROPS',
  },
  scenery: {
    label: 'Scenery',
    clear: 1,
    // Scenery `key` is one of these three families; the sprite inside the
    // family is rolled, because "a tree" is a request and "that exact oak
    // frame" is not something anyone has ever wanted to type.
    families: ['tree', 'rock', 'flora'],
  },
  structure: {
    label: 'Structure',
    // Wider than the rest: a building has a door, and a door needs a doorstep
    // nothing else is standing on.
    clear: 4,
    table: 'STRUCTURES',
  },
  site: {
    label: 'Site',
    // Widest. A site is a place with a name and a blurb and usually a cave
    // mouth; crowding one is how a landmark becomes scenery.
    clear: 6,
    table: 'SITE_TYPES',
  },
  // =========================================================================
  // ROUND 134 (item 6) -- THE FIFTH KIND, AND IT DRAWS NOTHING.
  //
  // The user asked for city layouts to be editable in the desktop editor:
  // "move, add and remove the individual buildings inside it".
  //
  // Round 107 built this layer to answer the first two -- a `structure` entry
  // is a building you put where you want it -- and could not answer the
  // third, because a procedurally generated building has no identity: it is
  // whatever `_buildSettlement` laid on lot eleven this run, and there is
  // nothing to name in order to delete it.
  //
  // But every generator in this file's world already keeps clear of a placed
  // entry -- that is round 107's whole mechanism, and `_placedBlocks` is the
  // one question all of them ask. So "remove" is expressible as "claim this
  // ground and put nothing on it": the town lays itself out around the hole
  // exactly as it lays itself out around a fountain.
  //
  // MOVE is then remove-and-add, which is also what it is in the editor's
  // hands: drag the building, and what is written is a blank where it was and
  // a structure where it went.
  //
  // `radius` OVERRIDES `clear` on a blank, because a hole is the one kind
  // whose size is the point. A house needs four tiles of berth; a market row
  // you want gone needs twelve, and having to place nine blanks to say so
  // would make the tool useless for the thing it is for. Defaulted to `clear`
  // so an entry that does not say is still a sensible size.
  blank: {
    label: 'Keep clear',
    clear: 4,
    sizable: true,
  },
};
export const PLACED_KIND_KEYS = Object.keys(PLACED_KINDS);

/**
 * ROUND 136 -- TWO OPTIONAL OVERRIDES ANY PLACED THING MAY CARRY.
 *
 *   collide   the collision radius in WORLD UNITS, replacing whatever the
 *             generator would have given it. 0 means "walk through me", which
 *             is already a meaningful value in `_placeStructure` (the sailboat
 *             uses it), so it must be distinguishable from "not set" -- hence
 *             `=== undefined` checks everywhere rather than falsiness.
 *   entrance  where the door is, as a region-local tile. Every door in the
 *             world is sited by `_doorDirectionWithFacing`, so that is the one
 *             place this has to be read.
 *
 * DELIBERATELY NOT NAMED `radius`. `clearRadiusOf` already reads `radius` on a
 * `blank`, where it means how much ground to keep clear -- the opposite of a
 * collision circle. Two meanings on one field is how a later round writes a
 * hole where somebody wanted a wall.
 */
export const COLLIDE_MAX = 400;

/** The most tiles one placed thing may declare solid. A building's footprint
 *  is a handful; a hundred is a wall somebody drew by hand. The cap exists so
 *  a runaway paint cannot make the solid-tile set big enough to matter to
 *  `_collidesObstacle`, which is called about eighty times a frame. */
export const COLLIDE_TILES_MAX = 256;

/** How far the generators keep off this entry, in tiles. Unknown kinds get the
 *  widest berth rather than none: a placed thing the generator does not
 *  recognise should be given room, not run over. */
export function clearRadiusOf(entry) {
  const k = entry && PLACED_KINDS[entry.kind];
  // ROUND 134 (item 6) -- a sizable kind carries its own radius. Clamped
  // rather than trusted: a blank is a hole in a town's layout and a typo of
  // 400 would empty the region.
  if (k && k.sizable && Number.isFinite(entry.radius)) {
    return Math.max(1, Math.min(BLANK_MAX_RADIUS, Math.round(entry.radius)));
  }
  return k ? k.clear : 6;
}
/** The widest hole anybody may punch in a layout, in tiles. A settlement's
 *  radius runs 6-22, so this is "most of a village" and not "a region". */
export const BLANK_MAX_RADIUS = 20;

/**
 * Faults in one region's `placed` array.
 *
 * Takes the tables as arguments rather than importing them, for the reason the
 * `table` fields above give: this file has to stay importable from regions.js
 * without dragging the city, structure and site catalogues in with it. The
 * data lane supplies them.
 */
// ROUND 144 -- the default is 2048 now, and it is still only a default: every
// caller passes REGION_TILES. Bumped rather than removed because a fault
// checker that silently measured a half-size region would pass a world that
// hangs off its own edge.
export function placedFaults(region, tables = {}, regionTiles = 2048) {
  const out = [];
  const list = region.placed || [];
  /**
   * ROUND 137 -- WHAT "TWO THINGS ON ONE TILE" ACTUALLY MEANS.
   *
   * This used to be one map of tile -> whatever got there first, and any second
   * entry on the tile was a fault. That is right for two structures and wrong
   * for the one pairing the editor itself writes: a MOVE is a `blank` plus a
   * real entry, and when somebody deletes the generated stone on a tile and
   * stands their own stone on the same tile, the two land together. The game
   * has always drawn that correctly -- measured in a booted world, ontaria's
   * hand-placed `wall_v2` at 322,312 reports `drawn` with the radius-1 blank
   * sitting on it (tools/probe_round137_overlay.cjs) -- so the validator was
   * refusing a working idiom and the r136 notes carried it as an open item for
   * that reason.
   *
   * So the rule is now per LAYER: at most one blank on a tile, and at most one
   * non-blank. A second of either is still a fault, because two blanks is the
   * duplicate `addBlank` already refuses in the editor and two structures is
   * the afternoon-losing placement this check was written for.
   */
  const seen = new Map();   // tile -> { blank?: label, solid?: label }
  const claimTile = (tk, layer, label, at) => {
    const rec = seen.get(tk) || {};
    if (rec[layer]) out.push(`${at} shares tile ${tk} with ${rec[layer]}`);
    else { rec[layer] = label; seen.set(tk, rec); }
  };
  list.forEach((e, i) => {
    const at = `${region.id}.placed[${i}]`;
    if (!e || typeof e !== 'object') { out.push(`${at} is not an entry`); return; }
    if (!PLACED_KINDS[e.kind]) { out.push(`${at} has kind '${e.kind}', which is not one of ${PLACED_KIND_KEYS.join(', ')}`); return; }
    if (!e.at || typeof e.at.tx !== 'number' || typeof e.at.ty !== 'number') {
      out.push(`${at} has no position`); return;
    }
    if (e.at.tx < 0 || e.at.ty < 0 || e.at.tx >= regionTiles || e.at.ty >= regionTiles) {
      out.push(`${at} (${e.kind} ${e.key}) sits at ${e.at.tx},${e.at.ty}, outside the region`);
    }
    // The key has to name something real, or the placement draws nothing and
    // says nothing -- which is round 56's dead-stone-id fault, and it cost a
    // whole round's measurement to find the last time.
    const kind = PLACED_KINDS[e.kind];
    // ROUND 134 (item 6) -- a blank names nothing and needs no key; what it
    // does need is a radius that is a number in range, because that radius is
    // how much of somebody's town stops existing.
    if (kind.sizable) {
      if (e.radius !== undefined) {
        if (!Number.isFinite(e.radius) || e.radius < 1 || e.radius > BLANK_MAX_RADIUS) {
          out.push(`${at} has radius ${e.radius}; a ${e.kind} must be 1-${BLANK_MAX_RADIUS} tiles`);
        }
      }
      claimTile(`${e.at.tx},${e.at.ty}`, 'blank', `${e.kind}`, at);
      return;
    }
    if (kind.families) {
      if (!kind.families.includes(e.key)) {
        out.push(`${at} is scenery '${e.key}'; the families are ${kind.families.join(', ')}`);
      }
    } else if (kind.table) {
      const t = tables[kind.table];
      if (t && !(e.key in t)) out.push(`${at} names ${kind.table}.${e.key}, which does not exist`);
    }
    // ROUND 136 -- the two optional overrides, checked where they are written
    // rather than where they are read: a collide radius of "12 tiles" typed as
    // 12 instead of 384 is a building nobody can walk near, and an entrance
    // outside the region is a door in the sea.
    if (e.collide !== undefined) {
      if (!Number.isFinite(e.collide) || e.collide < 0 || e.collide > COLLIDE_MAX) {
        out.push(`${at} has collide ${e.collide}; it must be 0-${COLLIDE_MAX} world units`);
      }
    }
    // ROUND 136 -- COLLISION BY TILE, which is the shape the world is in.
    //
    // `collide` is a RADIUS, and a radius is the engine's native primitive:
    // every test in `_collidesObstacle` is `hypot(...) < r1 + r2`. That is the
    // right answer for a boulder and the wrong one for a wall, a barn or
    // anything else whose footprint is rectangular -- a circle round a long
    // building either leaves its ends walk-through or blocks the street.
    //
    // So a placed thing may instead name the exact tiles it fills. Both are
    // legal and they compose: the radius still works for round things, and
    // the tile list is what you reach for when the grid is the point.
    if (e.collideTiles !== undefined) {
      if (!Array.isArray(e.collideTiles)) {
        out.push(`${at} has collideTiles that is not an array`);
      } else if (e.collideTiles.length > COLLIDE_TILES_MAX) {
        out.push(`${at} declares ${e.collideTiles.length} solid tiles; the most is ${COLLIDE_TILES_MAX}`);
      } else {
        const seenT = new Set();
        e.collideTiles.forEach((c, j) => {
          if (!c || typeof c.tx !== 'number' || typeof c.ty !== 'number') {
            out.push(`${at}.collideTiles[${j}] is not a tile`); return;
          }
          if (c.tx < 0 || c.ty < 0 || c.tx >= regionTiles || c.ty >= regionTiles) {
            out.push(`${at}.collideTiles[${j}] is at ${c.tx},${c.ty}, outside the region`);
          }
          // A tile listed twice is not wrong, but it is a list nobody meant to
          // write and it doubles the cost of the only hot loop that reads it.
          const k = `${c.tx},${c.ty}`;
          if (seenT.has(k)) out.push(`${at}.collideTiles lists ${k} twice`);
          seenT.add(k);
        });
      }
    }
    if (e.entrance !== undefined) {
      const en = e.entrance;
      if (!en || typeof en.tx !== 'number' || typeof en.ty !== 'number') {
        out.push(`${at} has an entrance with no position`);
      } else if (en.tx < 0 || en.ty < 0 || en.tx >= regionTiles || en.ty >= regionTiles) {
        out.push(`${at} has its entrance at ${en.tx},${en.ty}, outside the region`);
      } else if (e.kind === 'blank' || e.kind === 'scenery') {
        out.push(`${at} is a ${e.kind}; only something with a door can have an entrance`);
      }
    }
    // Two SOLID things on one tile is a placement somebody will spend an
    // afternoon failing to see. A blank underneath one is a move -- see the
    // `seen` header.
    claimTile(`${e.at.tx},${e.at.ty}`, 'solid', `${e.kind} ${e.key}`, at);
  });
  return out;
}

/** Every placed entry in the world, with its region, for the scene's single
 *  pass and for the suites. */
export function allPlaced(regions) {
  const out = [];
  for (const r of regions) for (const e of (r.placed || [])) out.push({ region: r, entry: e });
  return out;
}

/**
 * ROUND 138 -- SETTLEMENTS WHOSE RAMPART IS AUTHORED BY HAND.
 *
 * The user: "I hand placed the walls outside of cadence perfectly, the game
 * then regenerated the original walls which are wrong. Update cadence to only
 * have the walls I placed myself."
 *
 * Measured before changing anything: the generator's square ran
 * 12544..15744 x 14784..17984 and his sixty-two hand-placed segments run
 * 12640..15808 x 14816..18048 -- the same square, three tiles out. Two
 * ramparts standing in each other, which is what he was looking at.
 *
 * WHY A NAMED SET AND NOT AN INFERENCE. "If a settlement has hand-placed wall
 * segments near it, skip the generated one" is tempting and wrong: a person
 * laying the first stone of a circuit would have the rest of the city's wall
 * vanish out from under them, which is the worst possible moment for it.
 * Standing the generator down is a decision about a FINISHED piece of work, so
 * it is written down as one.
 *
 * It lives in this file, not in the scene, because the data lane has to be able
 * to refuse a name in here that has no hand-placed segments standing near it --
 * otherwise a typo leaves a city with no wall at all and nothing says so.
 *
 * The COLLISION comes with it: round 137 gave every hand-placed segment its own
 * solid tiles, so a hand-laid rampart is a barrier in its own right.
 */
// ROUND 187 -- CADENCE COMES OFF THIS LIST.
//
// The 62 stones the user laid in the editor circled a city 127 tiles across.
// The capital is 443 tiles across now, traced from a new drawing, and was
// moved 130 tiles west to step out of the river -- so the hand-laid circuit no
// longer encloses anything. The data lane said so in as many words the moment
// the city moved: "nek_city has 15", meaning fifteen of the sixty-two were
// still close enough to count as its rampart.
//
// Those stones are hand-placed entries in regionEdits and are NOT deleted;
// they simply stop being read as Cadence's wall, the same way the Tiled city
// and the outline city are still in WorldScene behind their own constants.
// The new circuit is CADENCE_WALL_RLE, laid by `_buildCityRectWall`.
// ROUND 188 -- EMPTY. Harrowmoor's hand-laid rampart was deleted when the
// city was rebuilt at three times the size, on the user's word ("Replace with
// generated wall"); every walled city is generated now. The set stays, and
// the machinery that reads it, for the next wall somebody lays by hand.
export const HAND_WALLED = new Set([]);

/*
 * ROUND 139 -- HARROWMOOR JOINS IT.
 *
 * "Ensure that the other cities match the style ... used in cadence." Cadence
 * has ONE rampart, and Harrowmoor had two: the generator's 84 courses and the
 * user's own 78 standing with them, which measured as a three-tile median gap
 * -- the stacked masonry this whole thread started over.
 *
 * His circuit was measured before the generator was stood down for it, because
 * standing a city's wall down on a half-finished one is how a capital ends up
 * open: four sides spanning 93-107 tiles, courses at six tiles throughout with
 * a single twelve-tile break where a road leaves, `southeast` on north and
 * south, `southwest` on east and west, corners on the east and west runs. The
 * same wall Cadence has, by the same hand.
 */

/** Is this entry a hand-placed castle-wall segment? One predicate, because
 *  three places ask and `key.startsWith('wall')` in all three is three chances
 *  for one of them to drift. */
export function isWallSegment(entry) {
  return !!entry && entry.kind === 'structure' && /^wall(_|$)/.test(entry.key || '');
}
