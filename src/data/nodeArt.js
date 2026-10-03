// ============================================================================
// ROUND 91 -- WHICH CELL A HARVEST NODE DRAWS.
//
//   "I've attached a zip for plant and mineral nodes to replace the self
//    generated placeholder images."
//
// Twenty-five delivered objects in one strip (see extract_round91_nodes.py),
// plus a drawn stump at the end for the one state no art covers. This file is
// the mapping from what a node IS -- a family and a tier, which is all
// crafting.js knows about one -- to which cells it may draw.
//
// WHY A TIER GETS A LIST RATHER THAN A CELL. Thirty-four nodes go into a
// region and its band is two tiers, so a single cell per tier would put
// seventeen identical rocks in one province. Each tier names two or three, and
// the choice is made from the node's own POSITION hash, so a given vein looks
// the same on every visit and its neighbour does not look like it -- the same
// rule `tileVariantHash` keeps for ground and round 90's water phases keep for
// the river.
//
// WOOD IS NOT IN HERE, and that is deliberate rather than missing. The drop has
// no timber, and the ruling was to use the game's own tree art -- eleven
// species in three variants and eight rotations, already loaded, and a stand of
// timber genuinely should look like trees. `WOOD_SPENT_FRAME` is the only cell
// wood takes from this strip: the felled stump it leaves behind.
// ============================================================================

export const NODE_SHEET_KEY = 'harvestNodes';
export const NODE_SHEET_FILE = 'harvest_nodes.png';
export const NODE_CELL = 64;

/** How many cells the strip holds, checked against the loaded texture by the
 *  fault checker -- a manifest that names frame 25 of a 20-frame sheet draws
 *  nothing at all and reports nothing at all. */
export const NODE_FRAME_COUNT = 26;

/** The felled stump. The last cell, appended after the delivered art so the
 *  pack keeps its own indices. */
export const WOOD_SPENT_FRAME = 25;

/**
 * METAL, by tier. The ladder is read off the art itself rather than assigned
 * arbitrarily: copper is the oxidised and coppery ones, iron is plain rock,
 * steel is rock with bright ore in it, silversteel is white and pale, and
 * skyiron is the gold and the crystal. A player who has seen a Skyiron vein
 * once can tell one from a Copper vein across a field, which is the whole
 * point of giving five tiers five looks.
 */
const METAL_FRAMES = [
  [8, 2, 3],      // Copper      -- orange ore, green oxide, green-gemmed
  [1, 6, 9],      // Iron        -- grey cobble, brown-and-grey, layered slate
  [7, 0, 10],     // Steel       -- white ore in grey, dark slate, red-gemmed
  [11, 13, 5],    // Silversteel -- white nodules, clear crystal, obsidian
  [4, 14, 12],    // Skyiron     -- gold-veined, gold-veined dark, blue crystal
];

/**
 * FIBRE, by tier. Ordered by how RICH the plant looks, so the ladder reads the
 * same way the metal one does: plain grasses at the bottom, the fullest bushes
 * at the top.
 */
const FIBRE_FRAMES = [
  [18, 22],       // Flax       -- lavender, yellow-green bush
  [15, 17],       // Wool       -- pale berry bush, cream flowers
  [19, 21],       // Silk       -- poppies, strawberries
  [20, 16],       // Spidersilk -- blackberries, red-berry holly
  [23, 24],       // Cloudweave -- rosehips, the small tree
];

export const NODE_FRAMES = { metal: METAL_FRAMES, fibre: FIBRE_FRAMES };

/**
 * The cell one node draws, chosen from its own position so it never changes
 * between visits and its neighbour is not its twin. Returns null for wood,
 * which draws a tree instead -- the caller has to know that, and the null is
 * how it is told.
 */
export function nodeFrameFor(family, tier, hash) {
  const rows = NODE_FRAMES[family];
  if (!rows) return null;
  const row = rows[Math.max(0, Math.min(rows.length - 1, tier | 0))];
  return row[Math.abs(hash | 0) % row.length];
}

/**
 * WHAT A SPENT NODE LOOKS LIKE, and it is not a second set of art.
 *
 * A harvested vein or patch is the same cell drawn dark and flat -- the thing
 * is still there, you have simply taken what was in it, which is also what the
 * respawn timer means. Wood is the exception: a felled stand is a stump, which
 * is a different object and has its own cell.
 */
export const SPENT_TINT = 0x5c5850;
export const SPENT_ALPHA = 0.85;

/** Which species a timber stand of this tier draws, keyed to what the wood is
 *  called. Names that exist in TREE_SPECIES are used as-is; anything else falls
 *  back to whatever the region's own list offers, which is what `treeSpeciesFor`
 *  already answers. */
export const WOOD_SPECIES_HINT = [
  'pine',        // Pine
  'aspen',       // Ash      -- the closest pale-trunked species in the atlas
  'redwood',     // Ironbark -- the heaviest thing in the pack
  'maple7',      // Duskwood -- the darkest of the maples
  'willow',      // Heartwood
];

/** Faults a suite can assert against. Needs nothing but this file, which is
 *  the point: an index that names no cell is invisible to reading and draws
 *  nothing at all at runtime. */
export function nodeArtFaults(TREE_SPECIES = null) {
  const out = [];
  const seen = new Map();
  for (const [family, rows] of Object.entries(NODE_FRAMES)) {
    if (rows.length !== 5) out.push(`${family} has ${rows.length} tiers, expected 5`);
    rows.forEach((row, tier) => {
      if (!row.length) out.push(`${family} tier ${tier} names no cell`);
      for (const f of row) {
        if (!(f >= 0 && f < NODE_FRAME_COUNT)) {
          out.push(`${family} tier ${tier} names cell ${f}, outside the strip`);
        }
        if (f === WOOD_SPENT_FRAME) out.push(`${family} tier ${tier} draws the stump`);
        const key = `${f}`;
        const at = `${family}:${tier}`;
        if (seen.has(key)) out.push(`cell ${f} is used by both ${seen.get(key)} and ${at}`);
        else seen.set(key, at);
      }
    });
  }
  // Every DELIVERED cell must be reachable. Twenty-five objects were drawn for
  // this and a cell no tier names is one nobody will ever see -- the same
  // reachability fault quintessence.js checks its own catalogue for.
  for (let f = 0; f < WOOD_SPENT_FRAME; f++) {
    if (!seen.has(`${f}`)) out.push(`cell ${f} is in the sheet and no tier draws it`);
  }
  // The picker must be able to reach every cell in a row, or a tier's second
  // look is decoration in a table.
  for (const [family, rows] of Object.entries(NODE_FRAMES)) {
    rows.forEach((row, tier) => {
      const got = new Set();
      for (let h = 0; h < 200; h++) got.add(nodeFrameFor(family, tier, h));
      if (got.size !== row.length) {
        out.push(`${family} tier ${tier} only ever draws ${[...got].join(',')} of ${row.join(',')}`);
      }
    });
  }
  if (nodeFrameFor('wood', 0, 0) !== null) out.push('wood draws from the mineral strip');
  if (WOOD_SPECIES_HINT.length !== 5) out.push('the wood species hint is not five long');
  if (TREE_SPECIES) {
    for (const s of WOOD_SPECIES_HINT) {
      if (!TREE_SPECIES.includes(s)) out.push(`${s} is not a tree species`);
    }
  }
  return out;
}
