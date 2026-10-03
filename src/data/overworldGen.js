// ===========================================================================
// ROUND 194 (item 4) -- THE SQUARE GENERATOR.
//
//   4    "Create a region generator that is seeded by the location on the grid
//         and the pixels present"
//   4.1  "Each square can have caves, 1-2 small towns, a few scattered farms,
//         and lots of rank appropriate monsters."
//   4.2  "The seed shouldn't change between players or resets."
//   4.3  "The only change is that for generated locations the houses and small
//         towns are replaced with ruins, bodies, and rubbles after the monster
//         surge starts."
//
// WHAT THIS FILE IS. A pure planner: cells in, a REGION-SHAPED OBJECT out. It
// touches no scene and no textures, which is what lets the same call be made
// by the game, by a test and by a probe and give the same answer every time.
// The scene takes the plan and paints it (see `_buildOverworldSquare`).
//
// WHY A REGION OBJECT. Everything this game knows how to build -- settlements,
// roads, steadings, spawn groups, walls -- is written against the region shape
// in regions.js. A generated square that IS a region can be handed to those
// same functions instead of growing a second set of them, which is the whole
// reason this file is a planner and not a builder.
//
// THE SLOT. The world is a 3x3 grid of region slots and only seven are
// authored, so (2,1) is free and every generated square is built there, one at
// a time. A square is 1024 tiles in a 2048-tile slot: the far half is open
// water, which is both the cheapest edge and an honest one.
// ===========================================================================
import {
  OW_SQUARE, OW_SQUARE_TILES, OW_TILES_PER_CELL, BIOME_BY_ID, BIOMES,
  squareSeed, squareRank, squareName, squareStats, squareBox,
} from './overworld.js';

/** The free world slot every generated square is built in. */
export const GEN_SLOT = { col: 2, row: 1 };
export const GEN_REGION_PREFIX = 'ow_';
/** The playable quadrant, in region tiles. */
export const GEN_TILES = OW_SQUARE_TILES;

/** A tiny deterministic generator, seeded by the square and a salt. */
export function genRng(seed, salt = 0) {
  let s = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Ground art for a biome: the region art packs the game already ships. */
const PACKS = {
  ocean:     { ground: 'meadow',      accent: 'grass_plank', rock: null },
  lake:      { ground: 'meadow',      accent: 'grass_plank', rock: null },
  ice:       { ground: 'mountain',    accent: 'mountain',    rock: 'bonefield' },
  tundra:    { ground: 'mountain',    accent: 'grass_plank', rock: 'bonefield' },
  mountain:  { ground: 'mountain',    accent: 'mountain',    rock: null },
  forest:    { ground: 'meadow',      accent: 'grass_plank', rock: null },
  grassland: { ground: 'meadow',      accent: 'grass_plank', rock: null },
  plains:    { ground: 'sbs_dry',     accent: 'sbs_dry',     rock: 'bonefield' },
  desert:    { ground: 'sbs_dry',     accent: 'sbs_dry',     rock: 'bonefield' },
  tropical:  { ground: 'jungle_soil', accent: 'swamp',       rock: null },
  volcanic:  { ground: 'sbs_stones',  accent: 'sbs_stones',  rock: null },
  lava:      { ground: 'sbs_stones',  accent: 'sbs_stones',  rock: null },
  river:     { ground: 'meadow',      accent: 'grass_plank', rock: null },
};

/** Monster tiers a square of each rank posts. The numbers are the authored
 *  regions' own: the Nek posts tier 0-1, Ontaria 1-2, Elehyd 1-3, Bratugal
 *  2-4. A generated square of the same rank posts the same range. */
const RANK_TIERS = {
  iron:    { base: 0, top: 1, index: 0 },
  bronze:  { base: 1, top: 2, index: 1 },
  silver:  { base: 1, top: 3, index: 2 },
  gold:    { base: 2, top: 4, index: 3 },
  diamond: { base: 3, top: 4, index: 5 },
};

/** Settlement names for a generated square: seeded, and built from the land
 *  rather than from a bag of nouns. */
const TOWN_HEAD = ['Ash', 'Bram', 'Cold', 'Dun', 'Fen', 'Gors', 'Hale', 'Kest', 'Mar', 'Nor',
  'Orm', 'Pell', 'Quar', 'Red', 'Stan', 'Thorn', 'Vale', 'Wick', 'Yar', 'Brack'];
const TOWN_TAIL = ['ford', 'stead', 'bury', 'combe', 'hollow', 'gate', 'reach', 'mill', 'well', 'row'];
function townName(rng) {
  return TOWN_HEAD[Math.floor(rng() * TOWN_HEAD.length)] + TOWN_TAIL[Math.floor(rng() * TOWN_TAIL.length)];
}

/** Is this square tile on land, by the cells? Sampled, not interpolated: the
 *  cell grid IS the terrain and a smoothed reading would put a town's well in
 *  the river that the map says runs through it. */
export function cellAtTile(cells, tx, ty) {
  const c = Math.min(OW_SQUARE - 1, Math.max(0, Math.floor(tx / OW_TILES_PER_CELL)));
  const r = Math.min(OW_SQUARE - 1, Math.max(0, Math.floor(ty / OW_TILES_PER_CELL)));
  return cells[r * OW_SQUARE + c];
}

/** Land means "a party can stand here": not ocean, lake, river or lava. */
export function isLandCell(id) {
  const b = BIOME_BY_ID[id];
  return !!b && !b.water;
}

/**
 * Somewhere to put a thing: the best land tile near a wanted spot, searched
 * outward in rings so a town asked for the middle of a lake ends up on its
 * shore rather than nowhere.
 */
function landNear(cells, tx, ty, margin = 40) {
  const clamp = (v) => Math.min(GEN_TILES - margin, Math.max(margin, v));
  let x = clamp(tx), y = clamp(ty);
  if (isLandCell(cellAtTile(cells, x, y))) return { tx: x, ty: y };
  for (let r = OW_TILES_PER_CELL; r < GEN_TILES / 2; r += OW_TILES_PER_CELL) {
    for (let a = 0; a < 12; a++) {
      const th = (a / 12) * Math.PI * 2;
      const px = clamp(Math.round(x + Math.cos(th) * r));
      const py = clamp(Math.round(y + Math.sin(th) * r));
      if (isLandCell(cellAtTile(cells, px, py))) return { tx: px, ty: py };
    }
  }
  return null;
}

/**
 * PLAN ONE SQUARE.
 *
 * `cells` is the square's own 50x50 block of the biome index. Returns
 * `{ region, caves, farms, chests, stats, rank, surge }` where `region` is a
 * regions.js-shaped object the scene can hand to its own builders.
 */
export function planSquare(cells, sx, sy, opts = {}) {
  const seed = squareSeed(sx, sy);
  const rank = opts.rank || squareRank(sx, sy);
  const tiers = RANK_TIERS[rank] || RANK_TIERS.iron;
  const surge = !!opts.surge;
  const box = squareBox(sx, sy);

  // The square's own histogram, off its own cells rather than the whole-map
  // reading, so a coastal square is planned as the coast it is.
  const hist = new Array(BIOMES.length).fill(0);
  for (let i = 0; i < cells.length; i++) hist[cells[i]]++;
  const total = cells.length;
  let domId = 5, domN = -1;
  for (const b of BIOMES) {
    if (b.water) continue;
    if (hist[b.id] > domN) { domN = hist[b.id]; domId = b.id; }
  }
  const dom = BIOME_BY_ID[domId] || BIOME_BY_ID[5];
  const packs = PACKS[dom.key] || PACKS.forest;
  const waterShare = (hist[0] + hist[1] + hist[10]) / total;
  const landShare = 1 - waterShare;

  // Cover comes from the mix, not from the dominant biome alone: a square that
  // is half forest and half rock should read as both.
  let tree = 0, rock = 0;
  for (const b of BIOMES) tree += (hist[b.id] / total) * b.tree, rock += (hist[b.id] / total) * b.rock;

  const rng = genRng(seed, 1);
  const name = squareName(cells, sx, sy, domId);

  // --- 4.1 one or two small towns -----------------------------------------
  // Placed on the two best pieces of open ground, a third of the map apart, so
  // they are not neighbours and neither is in a corner.
  const wantTowns = landShare > 0.55 ? (rng() < 0.45 ? 2 : 1) : (landShare > 0.25 ? 1 : 0);
  const settlements = [];
  const spots = [
    { tx: GEN_TILES * (0.28 + rng() * 0.12), ty: GEN_TILES * (0.30 + rng() * 0.12) },
    { tx: GEN_TILES * (0.62 + rng() * 0.12), ty: GEN_TILES * (0.60 + rng() * 0.14) },
  ];
  for (let i = 0; i < wantTowns; i++) {
    const at = landNear(cells, Math.round(spots[i].tx), Math.round(spots[i].ty), 90);
    if (!at) continue;
    const houses = 4 + Math.floor(rng() * 5);
    settlements.push({
      id: `${GEN_REGION_PREFIX}${sx}_${sy}_st${i}`,
      name: townName(rng),
      kind: houses >= 7 ? 'village' : 'hamlet',
      at, radius: 8 + Math.floor(rng() * 5), houses,
      bountyBoard: i === 0,
      // 4.3 -- after the surge these are what is left of them.
      ruined: surge,
    });
  }

  // --- 4.1 a few scattered farms ------------------------------------------
  const farms = [];
  const wantFarms = landShare > 0.4 ? 2 + Math.floor(rng() * 4) : Math.floor(rng() * 2);
  for (let i = 0; i < wantFarms; i++) {
    const at = landNear(cells, Math.round(GEN_TILES * (0.12 + rng() * 0.76)),
      Math.round(GEN_TILES * (0.12 + rng() * 0.76)), 70);
    if (!at) continue;
    if (settlements.some(s => Math.hypot(s.at.tx - at.tx, s.at.ty - at.ty) < 120)) continue;
    if (farms.some(f => Math.hypot(f.tx - at.tx, f.ty - at.ty) < 110)) continue;
    farms.push({ ...at, ruined: surge, seed: (seed ^ (i * 2654435761)) >>> 0 });
  }

  // --- 4.1 caves -----------------------------------------------------------
  // Rock first: a cave in a mountain square is a cave mouth in a cliff, and
  // one on the prairie is a hole in the ground nobody would dig twice.
  const caves = [];
  const wantCaves = 1 + Math.floor(rng() * (rock > 0.9 ? 3 : 2));
  for (let i = 0; i < wantCaves; i++) {
    let best = null, bestRock = -1;
    for (let a = 0; a < 14; a++) {
      const cand = landNear(cells, Math.round(GEN_TILES * (0.1 + rng() * 0.8)),
        Math.round(GEN_TILES * (0.1 + rng() * 0.8)), 60);
      if (!cand) continue;
      if (caves.some(c => Math.hypot(c.tx - cand.tx, c.ty - cand.ty) < 160)) continue;
      const b = BIOME_BY_ID[cellAtTile(cells, cand.tx, cand.ty)];
      const score = (b ? b.rock : 0) + rng() * 0.2;
      if (score > bestRock) { bestRock = score; best = cand; }
    }
    if (best) caves.push({ ...best, seed: (seed ^ (i * 40503)) >>> 0 });
  }

  // --- roads: the towns, the farms and the arrival point joined up ---------
  const roads = [];
  const arrival = landNear(cells, Math.round(GEN_TILES * 0.5), Math.round(GEN_TILES * 0.5), 60)
    || { tx: Math.round(GEN_TILES * 0.5), ty: Math.round(GEN_TILES * 0.5) };
  for (const st of settlements) {
    roads.push({ width: 3, points: [{ tx: arrival.tx, ty: arrival.ty }, { tx: st.at.tx, ty: st.at.ty }] });
  }
  if (settlements.length === 2) {
    roads.push({ width: 3, farms: true, points: [{ ...settlements[0].at }, { ...settlements[1].at }] });
  }

  // --- 4.1 "lots of rank appropriate monsters" -----------------------------
  // Denser than an authored region on purpose: a generated square is what the
  // player crosses to get somewhere, and an empty one is a loading screen with
  // grass on it.
  const spawnGroups = [
    { tier: tiers.base, size: [3, 9], from: 0.00, weight: 6, label: 'pack', roamChance: 0.45 },
    { tier: tiers.base, size: [10, 26], from: 0.20, weight: 3, label: 'super pack' },
    { tier: Math.min(tiers.top, tiers.base + 1), size: [1, 1], from: 0.25, weight: 4, label: 'solo', roams: true },
  ];
  if (tiers.top > tiers.base + 1) {
    spawnGroups.push({ tier: tiers.top, size: [1, 1], from: 0.55, weight: 2, label: 'solo', roams: true });
  }

  const region = {
    id: `${GEN_REGION_PREFIX}${sx}_${sy}`,
    name,
    generated: true,
    square: { sx, sy },
    cellBox: box,
    index: tiers.index,
    col: GEN_SLOT.col, row: GEN_SLOT.row,
    rank,
    forestDensity: Math.max(0.03, Math.min(1.6, tree)),
    rockDensity: Math.max(0.05, Math.min(2.0, rock)),
    blurb: `${dom.name} country, ${Math.round(landShare * 100)}% dry ground.`,
    ground: packs.ground, accentPack: packs.accent,
    rockPalette: packs.rock || undefined,
    lava: hist[12] > 0,
    arrival: { tx: arrival.tx, ty: arrival.ty },
    settlements,
    // Terrain is painted from the cells rather than authored, so these three
    // are deliberately empty -- see `_paintOverworldSquare`.
    ocean: null, rivers: [], lakes: [],
    roads,
    spawnGroups,
    exits: [],
  };

  // --- what the square remembers being emptied (item: persistence) ---------
  // Every takeable thing gets an index at plan time so the save can name it
  // without storing its position: "square 14,6 chest 2".
  const chests = [];
  for (let i = 0; i < caves.length; i++) chests.push({ i: chests.length, kind: 'cave', at: caves[i] });
  for (const st of settlements) chests.push({ i: chests.length, kind: 'town', at: st.at });

  return { region, caves, farms, chests, stats: { hist, total, dominant: domId, landShare, waterShare, tree, rock }, rank, surge, seed };
}

/** The plan for a square, as a stable signature -- two runs of the generator
 *  on the same square must produce the same string. Used by the tests and by
 *  the probe, and cheap enough to assert on. */
export function planSignature(plan) {
  const r = plan.region;
  return [
    r.id, r.name, r.rank, r.ground, r.accentPack,
    r.forestDensity.toFixed(3), r.rockDensity.toFixed(3),
    r.arrival.tx, r.arrival.ty,
    r.settlements.map(s => `${s.name}@${s.at.tx},${s.at.ty}x${s.houses}`).join('+'),
    plan.farms.map(f => `${f.tx},${f.ty}`).join('+'),
    plan.caves.map(c => `${c.tx},${c.ty}`).join('+'),
    r.spawnGroups.map(g => `${g.tier}:${g.size.join('-')}`).join('+'),
  ].join('|');
}
