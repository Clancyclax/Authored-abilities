// Tree art + procedural forest scatter, round 4. The user's own words:
// "Added a series of tree with multiple angles. Complete a pass to slightly
// recolor the trees in all the different angles. Then generate a randomized
// mix of these trees and angles and these should appear like a mostly
// natural forest." -- 10 species (5 of them named maple3-maple7, i.e. 5
// independent maple variants, not animation frames -- confirmed against the
// uploaded packs), each extracted by extract_round4_trees.py into a base
// atlas + 2 soft recolor variants (tree_<key>.png / _v1 / _v2), all
// single-row 8-column PixelLab "object" atlases (rotations only, same
// bottom_anchor_paste/PLAYER_DIR_ORDER convention as the round-3 fence
// prop) -- see that script's header comment for the full extraction
// rationale.
//
// TREE_ART holds each species' real native cell size (they're NOT padded to
// a shared size -- see the extraction script) plus the anchor point
// (footX/footY, matching the baseline_margin the atlas was built with) so
// WorldScene can bottom-anchor a placed tree exactly the same way buildings/
// NPCs/the fence already do.
// ROUND 20 -- the user's ask: "Trees need the size increased by about 200%."
// Trees were drawn at their native cell size (85-136px) against a ~40px
// player, which read as shrubs rather than as a forest. Applied as a display
// scale rather than by re-exporting the art, so the trunk-collision radius
// below scales with it from one number.
export const TREE_DISPLAY_SCALE = 2.6;

// ROUND 45 -- three new species join the same convention (one 8-column sheet
// per species+variant, native cell): a tall jungle tree and a swampy jungle
// tree for Bratugal, and a grey dead tree for Elehyd's badlands. They are in
// TREE_SPECIES so the atlas preloads them, but WHERE they grow is a region
// property -- see REGION_TREE_SPECIES below. A palm has no business in The
// Nek and a dead grey stick has none in a temperate forest.
export const TREE_SPECIES = ['aspen', 'dogwood', 'maple3', 'maple4', 'maple5', 'maple6', 'maple7', 'redwood', 'willow', 'pine',
  'jungletall', 'jungleswamp', 'deadgrey'];
export const TREE_VARIANTS = ['', '_v1', '_v2']; // '' = base recolor

const CELLS = { aspen: 113, dogwood: 85, maple3: 97, maple4: 124, maple5: 124, maple6: 124, maple7: 136, redwood: 136, willow: 113, pine: 113,
  jungletall: 136, jungleswamp: 136, deadgrey: 136 };

// Which species a region's forest draws from. A region absent here uses the
// temperate set, which is every species the game had before round 45 -- so
// The Nek and Ontaria are untouched by this addition.
const TEMPERATE = ['aspen', 'dogwood', 'maple3', 'maple4', 'maple5', 'maple6', 'maple7', 'redwood', 'willow', 'pine'];
export const REGION_TREE_SPECIES = {
  nek: TEMPERATE,
  ontaria: TEMPERATE,
  // "Desolate badlands and icy peaks" -- almost nothing grows, and what does
  // is dead. Pine survives as the one living species at the treeline.
  elehyd: ['deadgrey', 'deadgrey', 'deadgrey', 'pine'],
  // "Jungle, rainforest and swamp" -- the two jungle species carry it, with
  // redwood and willow as the temperate stand-ins that read closest to
  // rainforest canopy and hanging swamp growth.
  bratugal: ['jungletall', 'jungletall', 'jungleswamp', 'jungleswamp', 'redwood', 'willow'],
  // ROUND 103 -- THE THREE NEW REGIONS, AND THE SAME MISTAKE ROUND 45 FIXED.
  //
  // A region absent from this table falls through to TEMPERATE, silently, and
  // that is exactly what happened: the first screenshots of the Cinderwaste
  // showed a full green deciduous canopy standing in a lava field, and
  // Ixcuatl came back as New England in October -- red maples and conifers in
  // a Mesoamerican ruin. Nothing errored. The default is the bug.
  //
  // Sirukh: a desert island, and there is no palm in the roster. `jungletall`
  // is the closest thing to one -- tall, bare-trunked, tropical -- with dead
  // grey standing in for driftwood and salt-killed scrub. Density there is
  // 0.06, so this is a handful of trees on a whole island.
  sirukh: ['jungletall', 'jungletall', 'deadgrey'],
  // Cinder: nothing lives on it. Density 0.03, and every one of them dead.
  cinder: ['deadgrey'],
  // Ixcuatl: the jungle is what took the city, so it draws Bratugal's canopy.
  ixcuatl: ['jungletall', 'jungletall', 'jungleswamp', 'redwood'],
};
export function treeSpeciesFor(regionId) { return REGION_TREE_SPECIES[regionId] || TEMPERATE; }

// ===========================================================================
// ROUND 143 -- TREE VARIETY BY QUADRANT.
//
//   "Tree variety should be based on map quadrants. 1-3 types of trees in each
//    quadrant and a gradual mix where the quadrants border each other."
//   "Little groves of another tree may be in patches of 20-30 trees."
//   "The intent is to make the map feel like it has distinct subregions to
//    explore."
//
// QUADRANTS OF A REGION, not of the world. The world's nine cells ARE the
// regions and each already has its own roster (round 45), so quadrants of the
// world would only restate the border a player cannot cross anyway. A region
// is 1024 tiles across; quartering it makes each quadrant a 512-tile walk,
// which is the scale at which "distinct subregions to explore" means anything.
//
// AND EACH QUADRANT DRAWS FROM ITS OWN REGION'S ROSTER, always. Round 45's
// rule is not weakened by this: no palm reaches The Nek and no maple reaches
// the Cinderwaste, because a quadrant is a partition of what the region
// already grows rather than a second opinion about it.
// ===========================================================================

export const QUADRANTS = ['nw', 'ne', 'sw', 'se'];
/** The user's number, and it is a range because the rosters are not all the
 *  same length: The Nek's ten temperate species divide 3/3/2/2, and the
 *  Cinderwaste's one dead species is all four quadrants have to offer. */
export const QUADRANT_SPECIES_MAX = 3;

/**
 * Which species each of a region's four quadrants grows.
 *
 * Dealt round-robin out of a SEEDED SHUFFLE of the region's unique species, so
 * the split is arbitrary-looking and identical on every load -- and so that
 * every species the region declares appears in some quadrant. A roster that
 * named a species no quadrant grew would be a species the region claims and
 * never shows, which is the same silent fault round 103 found in the region
 * table itself.
 *
 * A roster shorter than four quadrants SHARES, in order: two species alternate
 * and one species is everywhere. That is the honest answer for the Cinderwaste,
 * where "nothing lives on it" is the design and four different dead things
 * would be four species pretending to be variety.
 *
 * The region's own REPETITION is preserved inside a quadrant -- Elehyd's list
 * is three parts dead grey to one part pine, and that weighting is a statement
 * about the place, so a quadrant that grows both grows them in that ratio.
 */
export function quadrantSpeciesFor(regionId) {
  const roster = treeSpeciesFor(regionId);
  const uniq = [...new Set(roster)];
  const order = uniq.slice();
  // A shuffle seeded on the region id alone: same split every load, different
  // split per region, and no dependence on the order the table happens to list.
  let h = 2166136261;
  for (let i = 0; i < String(regionId).length; i++) {
    h ^= String(regionId).charCodeAt(i); h = Math.imul(h, 16777619);
  }
  for (let i = order.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out = { nw: [], ne: [], sw: [], se: [] };
  if (!order.length) return out;
  if (order.length < QUADRANTS.length) {
    // TOO FEW SPECIES TO DIVIDE, so the quadrants differ by EMPHASIS instead
    // of by partition -- every quadrant grows the whole roster, with its own
    // lead species carrying an extra share.
    //
    // The first cut dealt them out anyway, and the result was wrong about the
    // world: Elehyd's roster is "three parts dead grey wood to one part pine"
    // -- a statement about a desolate region -- and alternating two species
    // across four quadrants turned half of it into a pine wood. The split has
    // to be allowed to say less when the roster has less to say.
    // WHICH quadrant leads with WHICH species is drawn PROPORTIONALLY out of
    // the weighted roster, not round-robin over the unique species. Elehyd's
    // roster is three parts dead grey to one part pine, so three of its four
    // quadrants lead with dead grey and one leads with pine -- the region
    // stays what it is and one corner of it is visibly a pine wood.
    //
    // Round-robin over the unique species was the first cut and it put a pine
    // lead on half of Elehyd, which is the same fault, one layer down, as the
    // partition it replaced.
    //
    // AND THE LEAD IS HEAVY. A single extra copy was the second cut, and the
    // suite measured what it was worth: three per cent difference between two
    // quadrants of Elehyd, because the blend averages four nearly identical
    // lists back into one wood. `roster.length` extra copies makes a led
    // species about two thirds to seven eighths of its own quadrant, which is
    // a place you can see you have walked into.
    const leads = QUADRANTS.map((q, i) => roster[Math.floor(i * roster.length / QUADRANTS.length)]);
    // Shuffled by the same stream the partition uses, so the leads are not
    // always dealt north-west first.
    for (let i = leads.length - 1; i > 0; i--) {
      h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
      const j = h % (i + 1);
      [leads[i], leads[j]] = [leads[j], leads[i]];
    }
    QUADRANTS.forEach((q, i) => {
      out[q] = roster.concat(new Array(Math.max(1, roster.length)).fill(leads[i]));
    });
    return out;
  }
  order.forEach((sp, i) => {
    const q = QUADRANTS[i % QUADRANTS.length];
    if (out[q].length < QUADRANT_SPECIES_MAX) out[q].push(sp);
  });
  // ...and put the roster's own weighting back inside each quadrant.
  //
  // THE TRADE, STATED. A region with four or more species gets DISJOINT
  // quadrants, and that does move its overall mix: Bratugal's roster is two
  // parts jungle to one part redwood and one part willow, and quartering it
  // makes each of those four a quarter of the region. The user's ask is the
  // reason -- "1-3 types of trees in each quadrant... distinct subregions to
  // explore" -- and a quadrant showing all six with a bias is not distinct. The
  // round-45 rule that DOES survive untouched is the one that matters: a
  // quadrant may only grow what its own region grows, so no palm reaches The
  // Nek and no maple reaches the Cinderwaste.
  for (const q of QUADRANTS) {
    const want = new Set(out[q]);
    const weighted = roster.filter(sp => want.has(sp));
    if (weighted.length) out[q] = weighted;
  }
  return out;
}

/**
 * How much of each quadrant is in the air at this point of a region, where
 * `fx`/`fy` are 0..1 across it.
 *
 * Bilinear between the four quadrant CENTRES, which is what makes the mix
 * gradual without anybody tuning a blend width: at a quadrant's own centre its
 * weight is exactly 1 and the other three are exactly 0, on the line between
 * two quadrants it is 50/50, and at the region's edges it is fully one
 * quadrant again. The middle of the region is the one point where all four
 * meet at a quarter each, which is the right place for the most mixed wood in
 * the region to be.
 */
export function quadrantWeights(fx, fy) {
  const u = Math.min(1, Math.max(0, (fx - 0.25) / 0.5));
  const v = Math.min(1, Math.max(0, (fy - 0.25) / 0.5));
  return { nw: (1 - u) * (1 - v), ne: u * (1 - v), sw: (1 - u) * v, se: u * v };
}

/** The species that grows at this point of this region. `r1` picks the
 *  quadrant against the blend, `r2` picks within it; both 0..1. */
export function pickQuadrantSpecies(regionId, fx, fy, r1, r2) {
  const q = quadrantSpeciesFor(regionId);
  const w = quadrantWeights(fx, fy);
  let acc = 0, chosen = QUADRANTS[QUADRANTS.length - 1];
  for (const k of QUADRANTS) {
    acc += w[k];
    if (r1 <= acc) { chosen = k; break; }
  }
  const list = (q[chosen] && q[chosen].length) ? q[chosen] : treeSpeciesFor(regionId);
  return list[Math.floor(r2 * list.length) % list.length];
}

/** A grove is 20-30 trees of a species the ground around it is not growing.
 *  The user's numbers; `GROVE_REACH` is how far out the patch may gather them,
 *  measured off the scatter's own density (a 500-unit cluster grid at 3-9
 *  trees a cell puts trees about 200 units apart, so twenty-five of them fill
 *  a disc of roughly 575). */
export const GROVE_MIN = 20;
export const GROVE_MAX = 30;
export const GROVE_REACH = 900;
/** One grove per this many of a region's trees, within these bounds. A region
 *  too sparse to gather twenty inside GROVE_REACH simply has none, which is
 *  what "may be" asks for. */
export const GROVE_PER_TREES = 1400;
export const GROVE_MIN_PER_REGION = 2;
export const GROVE_MAX_PER_REGION = 6;

/** Split an art key into its species and its recolour variant. The variant is
 *  the round-4 recolour mix and has nothing to do with which species grows
 *  where, so re-speciating a tree KEEPS it. */
export function splitTreeArtKey(artKey) {
  const m = /^(.*?)(_v\d+)?$/.exec(String(artKey || ''));
  return { species: (m && m[1]) || '', variant: (m && m[2]) || '' };
}

/** Every way the quadrant tables can be quietly wrong. Run by the data lane. */
export function quadrantFaults() {
  const out = [];
  for (const regionId of Object.keys(REGION_TREE_SPECIES)) {
    const roster = treeSpeciesFor(regionId);
    const uniq = new Set(roster);
    const q = quadrantSpeciesFor(regionId);
    const seen = new Set();
    for (const k of QUADRANTS) {
      const list = q[k];
      if (!list || !list.length) { out.push(`${regionId}.${k}: grows nothing`); continue; }
      const kinds = new Set(list);
      if (kinds.size > QUADRANT_SPECIES_MAX) {
        out.push(`${regionId}.${k}: ${kinds.size} species, more than ${QUADRANT_SPECIES_MAX}`);
      }
      for (const sp of kinds) {
        seen.add(sp);
        // A quadrant may only grow what its REGION grows -- round 45's rule,
        // which this round must not weaken.
        if (!uniq.has(sp)) out.push(`${regionId}.${k}: grows ${sp}, which the region does not`);
        if (!TREE_ART[sp]) out.push(`${regionId}.${k}: ${sp} has no art`);
      }
    }
    // ...and every species the region declares grows SOMEWHERE in it, or the
    // roster names a tree the player can never find.
    for (const sp of uniq) if (!seen.has(sp)) out.push(`${regionId}: ${sp} grows in no quadrant`);
  }
  // The blend is a real blend: pure at the centres, even in the middle.
  const at = (fx, fy) => quadrantWeights(fx, fy);
  const nwPure = at(0.25, 0.25);
  if (Math.abs(nwPure.nw - 1) > 1e-9) out.push('a quadrant centre is not pure');
  const mid = at(0.5, 0.5);
  if (Math.abs(mid.nw - 0.25) > 1e-9 || Math.abs(mid.se - 0.25) > 1e-9) {
    out.push('the middle of a region is not an even mix');
  }
  const edge = at(0, 0);
  if (Math.abs(edge.nw - 1) > 1e-9) out.push('a region corner is not one quadrant');
  for (const [fx, fy] of [[0, 0], [0.25, 0.25], [0.5, 0.5], [0.75, 0.25], [1, 1]]) {
    const w = at(fx, fy);
    const sum = QUADRANTS.reduce((n, k) => n + w[k], 0);
    if (Math.abs(sum - 1) > 1e-9) out.push(`weights at ${fx},${fy} sum to ${sum}`);
  }
  if (!(GROVE_MIN >= 20 && GROVE_MAX <= 30 && GROVE_MIN < GROVE_MAX)) {
    out.push('a grove is no longer the 20-30 the user asked for');
  }
  return out;
}
const BASELINE_MARGIN = 2;

export const TREE_ART = {};
for (const key of TREE_SPECIES) {
  const cell = CELLS[key];
  const art = { cell, footX: cell / 2, footY: cell - BASELINE_MARGIN };
  for (const v of TREE_VARIANTS) TREE_ART[`${key}${v}`] = art;
}

// Every placed-tree art key -- WorldScene preloads one spritesheet per key
// (8 cols x 1 row, cell x cell each) and _buildForest picks a uniformly
// random one per placed tree, per the "randomized mix of these trees and
// angles" ask.
export const TREE_ART_KEYS = Object.keys(TREE_ART);

// Rough per-species world-space TRUNK collision radius -- deliberately much
// smaller than the canopy's visual size (a player should be able to walk
// under low branches / between canopies, just not through the trunk), and
// varies a little with the species' native art size so a redwood blocks a
// bit more than a dogwood.
// ROUND 62 -- THE USER: "Tree collision should be reduced by about 50%. This
// should reduce the chance of enemies spawning inside the object, as well as
// improve movement through thick forest."
//
// Round 20 set 0.09 of the art cell so the player could not walk through the
// bole. That was the right call for one tree and the wrong one for a forest:
// the collision circle is centred on the trunk but sized off the whole CANOPY
// cell, so a dense stand fused into a wall with no gaps a body could fit
// through, and every spawn check inside that wall failed.
//
// Halved. The bole is still solid -- a trunk is nowhere near half a canopy
// wide -- so nothing becomes walk-through; what opens up is the space BETWEEN
// trunks, which is where movement and spawning actually happen.
const TRUNK_RADIUS_FRAC = 0.045;
export function trunkRadiusFor(key) {
  const base = TREE_ART[key] ? TREE_ART[key].cell : 113;
  return Math.max(4, Math.round(base * TRUNK_RADIUS_FRAC * TREE_DISPLAY_SCALE));
}

// Deterministic hash, same shape as iso.js's tileVariantHash (different
// constants so the two don't correlate) -- used to seed both cluster
// density and per-tree jitter from plain (cx,cy)/(tx,ty) integers, so forest
// layout is stable across reloads with no stored state.
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h >>> 0;
}
function rand01(a, b, salt) {
  return hash2(a * 92821 + salt, b * 68917 + salt * 7) / 4294967295;
}

// Procedural "mostly natural forest" scatter across the wilderness ring.
// Shape: a coarse CLUSTER grid (clusterSize world units per cell) where each
// cluster cell independently rolls a density (0..1, hashed from its own
// coordinates) -- above a threshold it's a forest clump and gets several
// trees jittered around its center; below, it's open wilderness with none.
// This clumpy-with-gaps pattern reads as much more natural than an even
// per-tile scatter (real forests have thickets and clearings, not uniform
// density), while staying entirely deterministic/stateless.
//
// Stays out of the town (skips any cluster inside cityRadius + margin) and
// off the map edges (margin from the map boundary); does NOT independently
// avoid the fence/farmstead yard or individual monster spawn points --
// those are sparse enough, and far enough from the dense part of the
// cluster grid's typical spawn ring, that an occasional close tree reads as
// scenery rather than a placement bug. Returns plain descriptors (x, y,
// artKey, facing) -- WorldScene turns these into sprites/collision/
// occlusion entries.
// ROUND 19 -- `isBlocked(x, y)` lets the caller veto a position. Before this
// round the scatter knew nothing about the rest of the world, so trees grew
// in the middle of the river and straight through the cardinal paths. The
// predicate is supplied by WorldScene (which owns the tile map) rather than
// re-derived here, so there is exactly one source of truth for "what is at
// this spot".
// ROUND 45 -- `species` lets a caller hand in the region's own species list
// (treeSpeciesFor). Defaults to the full roster so every existing caller and
// test behaves exactly as before.
export function generateForest({ cityRadius, mapHalf, clusterSize = 500, margin = 250, isBlocked = null, species = null }) {
  const SPECIES = species && species.length ? species : TREE_SPECIES;
  const trees = [];
  const innerR = cityRadius + margin;
  const outerR = mapHalf - margin;
  const cMin = Math.floor(-outerR / clusterSize), cMax = Math.ceil(outerR / clusterSize);
  const facingOrder = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

  for (let cy = cMin; cy <= cMax; cy++) {
    for (let cx = cMin; cx <= cMax; cx++) {
      const centerX = (cx + 0.5) * clusterSize, centerY = (cy + 0.5) * clusterSize;
      const centerDist = Math.hypot(centerX, centerY);
      if (centerDist < innerR || centerDist > outerR) continue;

      const density = rand01(cx, cy, 1); // 0..1, this cluster's own roll
      if (density < 0.48) continue; // ~52% of cluster cells are open wilderness/clearings

      // Denser clusters (higher density roll) get more trees -- 3 to 9.
      const count = 3 + Math.floor(density * 7);
      for (let i = 0; i < count; i++) {
        const jx = (rand01(cx, cy, 100 + i * 2) - 0.5) * clusterSize;
        const jy = (rand01(cx, cy, 101 + i * 2) - 0.5) * clusterSize;
        const wx = centerX + jx, wy = centerY + jy;
        const dist = Math.hypot(wx, wy);
        if (dist < innerR || dist > outerR) continue; // a jittered point can still land just inside/outside the ring
        if (isBlocked && isBlocked(wx, wy)) continue;   // water, river bed, roads

        const speciesIdx = Math.floor(rand01(cx, cy, 200 + i * 3) * SPECIES.length) % SPECIES.length;
        const variantIdx = Math.floor(rand01(cx, cy, 201 + i * 3) * TREE_VARIANTS.length) % TREE_VARIANTS.length;
        const facingIdx = Math.floor(rand01(cx, cy, 202 + i * 3) * facingOrder.length) % facingOrder.length;
        const artKey = `${SPECIES[speciesIdx]}${TREE_VARIANTS[variantIdx]}`;
        trees.push({ x: wx, y: wy, artKey, facing: facingOrder[facingIdx] });
      }
    }
  }
  return trees;
}

// ROUND 19 -- trees INSIDE the town. The wilderness scatter deliberately
// stops at the city wall, which left the town itself completely treeless and
// reading as a paved grid rather than a place people live. This is a much
// sparser, tidier scatter over the town's own grass -- gardens and street
// trees, not forest -- and it leans on the same isBlocked predicate to stay
// off roads, out of the plaza and clear of the buildings.
//
// Deliberately NOT merged into generateForest: the two want opposite
// densities and opposite clumping, and folding them together would mean one
// set of tuning constants serving neither well.
// ROUND 45 -- `species` here for the same reason generateForest has it: the
// capital's street trees were picking from the full roster, so once the
// roster gained jungle palms and dead grey wood, Cadence started growing
// them. A street tree is still a tree of the region it stands in.
export function generateTownTrees({ cityRadius, isBlocked = null, spacing = 260, species = null }) {
  const trees = [];
  const SPECIES = species && species.length ? species : TREE_SPECIES;
  const facingOrder = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  const n = Math.ceil(cityRadius / spacing);
  for (let gy = -n; gy <= n; gy++) {
    for (let gx = -n; gx <= n; gx++) {
      const roll = rand01(gx, gy, 4242);
      if (roll < 0.55) continue; // most cells stay empty -- this is a town, not a wood
      const jx = (rand01(gx, gy, 4243) - 0.5) * spacing * 0.8;
      const jy = (rand01(gx, gy, 4244) - 0.5) * spacing * 0.8;
      const wx = gx * spacing + jx, wy = gy * spacing + jy;
      if (Math.hypot(wx, wy) > cityRadius - 120) continue;
      if (isBlocked && isBlocked(wx, wy)) continue;
      const s2 = Math.floor(rand01(gx, gy, 4245) * SPECIES.length) % SPECIES.length;
      const v2 = Math.floor(rand01(gx, gy, 4246) * TREE_VARIANTS.length) % TREE_VARIANTS.length;
      const f2 = Math.floor(rand01(gx, gy, 4247) * facingOrder.length) % facingOrder.length;
      trees.push({ x: wx, y: wy, artKey: `${SPECIES[s2]}${TREE_VARIANTS[v2]}`, facing: facingOrder[f2] });
    }
  }
  return trees;
}
