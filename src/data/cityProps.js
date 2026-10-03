// ===========================================================================
// ROUND 78 ITEM 6.1, PLACED IN ROUND 79 -- THE MARKET AND THE STREET.
//
//   "Market stalls and city props for the cities."
//
// Round 78 packed both sheets and placed neither, and said so plainly:
// "scattering them through twenty-five settlements needs placement rules of
// its own, and I would rather do that properly than sprinkle them." This is
// those rules.
//
// WHAT EACH CELL ACTUALLY IS was settled by LOOKING AT THE SHEET, not by
// reading the pack's prompts -- all sixteen stalls are prompted "Market
// Stalls" and ten of the eleven city objects are prompted "medieval city
// objects", so the metadata cannot tell a fountain from an anvil. Round 78
// learned this the expensive way when a pack's metadata called an old bald
// man a female priest.
//
// The ROLE is what the placer reads, and it is the whole of the design:
//
//   landmark  one per settlement, on the square. A town has a fountain or a
//             well the way it has a name -- you should be able to say "meet
//             me at the fountain" -- so exactly one is placed and it is the
//             same one every time the world is built.
//   market    a stall. Laid in a ROW along a street rather than scattered,
//             because a market is a row; three stalls dotted round a plaza
//             read as three abandoned stalls.
//   goods     what a stall SELLS, set down beside one. Never solid: the
//             player has to be able to walk up to the counter.
//   street    furniture that belongs on a pavement -- a bench, a handcart.
//   clutter   what is stacked against a wall and forgotten.
//   smithy    the anvil, which goes beside a forge or nowhere at all.
// ===========================================================================

export const CITY_STALL_ART = {
  key: 'cityStalls', file: './public/assets/city_stalls.png',
  cell: 80, count: 16,
  // The sheets are packed foot-anchored into an 80px cell by
  // extract_round78_objects.py's `paste_cell`, so the contact point is the
  // bottom-centre of the cell less its two-pixel margin -- the same anchor
  // convention INTERIOR_PROP_ART uses, and for the same reason: an object
  // sorted by its middle sinks into the ground behind it.
  // ROUND 79 -- 0.62 -> 0.85 after looking at Cadence's square (a stall stood
  // shorter than the character walking past it), then 0.85 -> 2.55 on the
  // user's own review: "Market Stalls should be about 200% larger."
  //
  // 200% LARGER IS THREE TIMES, not two -- the phrase names the increase, not
  // the result -- so 0.85 x 3. A stall is now roughly two and a half
  // characters tall, which is about right for a timber frame with an awning
  // over it and is what makes a market read as a place rather than as
  // furniture.
  scale: 2.55, footX: 0.5, footY: 0.94,
};
export const CITY_PROP_ART = {
  key: 'cityProps', file: './public/assets/city_cityprops.png',
  cell: 80, count: 11,
  // ROUND 89 -- 0.78 -> 1.95, MEASURED RATHER THAN NUDGED.
  //
  //   "The added objects to the city are scattered haphazardly and way too
  //    small to see."
  //
  // The stalls were tripled to 2.55 in round 79 on the note directly above
  // this one and the props were left at 0.78, so the two have been drawn at a
  // 3.3x disparity ever since. Measured content inside the 80px cells: props
  // carry 42-62px of real ink, so 0.78 put a barrel on screen at about 40px
  // tall. A character is 60-75px and a tile diamond is 64x32 -- the props were
  // half a person high and well under a tile wide, which is precisely "too
  // small to see".
  //
  // 1.95 puts a barrel at roughly 100px: clearly bigger than a person, clearly
  // smaller than a market stall, and legible from across a square. Deliberately
  // NOT matched to the stalls' 2.55 -- a stall is a building you shop at and a
  // barrel is a thing beside a wall, and that difference should still read.
  scale: 1.95, footX: 0.5, footY: 0.94,
};

export const CITY_PROPS = {
  // ROUND 89 -- THE RADII GREW, BUT NOT BY THE FULL 2.5x, AND THE REASON IS
  // WORTH KEEPING.
  //
  // Round 79's note one table up says a collision circle must move with the
  // art, and it must. The first attempt multiplied every radius by the same
  // 2.5 the scale grew by, and that is wrong twice over: a collision radius is
  // a circle on the GROUND, and most of what a 2.5x scale buys an isometric
  // sprite is HEIGHT. A barrel drawn two and a half times taller does not sit
  // on two and a half times as much floor.
  //
  // It also broke placement outright. `put` rejects a spot whose
  // `_collidesObstacle(x, y, radius + 6)` hits anything, so a fountain at
  // radius 47 could not find room anywhere near a square -- measured, nine of
  // the eleven prop kinds stopped reaching the world at all, caught by round
  // 79c's "every one of the eleven city objects reaches the world".
  //
  // 1.6x is the footprint growth rather than the height growth: big enough
  // that the player cannot walk through the middle of a fountain, small enough
  // that the thing can still be put down.
  statue:        { idx: 0,  role: 'landmark', solid: true,  radius: 24 },
  benchStone:    { idx: 1,  role: 'street',   solid: false },
  // ROUND 79 -- radius 17 -> 44 with the art. A collision circle that stayed
  // at the old size while the sprite tripled would let two stalls stand inside
  // each other's canopies and let the player walk through the counter.
  stallAwning:   { idx: 2,  role: 'market',   solid: true,  radius: 44 },
  spicePots:     { idx: 3,  role: 'goods',    solid: false },
  produceCrates: { idx: 4,  role: 'goods',    solid: false },
  handcart:      { idx: 5,  role: 'street',   solid: true,  radius: 21 },
  barrelStack:   { idx: 6,  role: 'clutter',  solid: true,  radius: 22 },
  well:          { idx: 7,  role: 'landmark', solid: true,  radius: 24 },
  amphorae:      { idx: 8,  role: 'clutter',  solid: false },
  anvil:         { idx: 9,  role: 'smithy',   solid: true,  radius: 19 },
  fountain:      { idx: 10, role: 'landmark', solid: true,  radius: 30 },
};
export const CITY_PROP_KEYS = Object.keys(CITY_PROPS);
const byRole = (r) => CITY_PROP_KEYS.filter(k => CITY_PROPS[k].role === r);
export const CITY_LANDMARKS = byRole('landmark');
export const CITY_GOODS = byRole('goods');
export const CITY_STREET = byRole('street');
export const CITY_CLUTTER = byRole('clutter');

/**
 * The landmark a settlement of this size gets.
 *
 * A city gets the fountain, because a fountain is civic engineering and a
 * hamlet has not got the money. A hamlet gets the well, because a hamlet
 * needs water and has no aqueduct. The statue goes to the middle rung, where
 * a place is proud enough to raise one and small enough that it is the only
 * thing to look at.
 *
 * Deliberately a function of the SETTLEMENT KIND rather than a roll: the
 * player should be able to tell how big somewhere is before they have walked
 * it, and "there is a fountain here" is that information.
 */
export function landmarkFor(kind, radiusTiles) {
  if (kind === 'city' || radiusTiles >= 30) return 'fountain';
  if (kind === 'town' || radiusTiles >= 14) return 'statue';
  return 'well';
}

/** How many stalls a settlement of this size supports, and 0 for the ones
 *  too small to hold a market at all. Two stalls is a market; one is a man
 *  with a table. */
export function stallCountFor(radiusTiles) {
  if (radiusTiles < 12) return 0;
  return Math.max(2, Math.min(8, Math.round(radiusTiles / 7)));
}

/** Everything the sheets declare, checked against itself -- an index past the
 *  end of a sheet draws nothing at all, which looks exactly like a prop that
 *  was never placed. */
export function cityPropFaults() {
  const out = [];
  for (const k of CITY_PROP_KEYS) {
    const p = CITY_PROPS[k];
    if (p.idx < 0 || p.idx >= CITY_PROP_ART.count) out.push(`${k}: idx ${p.idx} is off the sheet`);
    if (p.solid && !(p.radius > 0)) out.push(`${k}: solid with no radius`);
  }
  const idx = CITY_PROP_KEYS.map(k => CITY_PROPS[k].idx);
  for (const i of idx) if (idx.filter(x => x === i).length > 1) out.push(`two props share cell ${i}`);
  if (!CITY_LANDMARKS.length) out.push('no landmark prop');
  if (!CITY_GOODS.length) out.push('no goods prop');
  return [...new Set(out)];
}
