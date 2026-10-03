// ===========================================================================
// ROUND 269 (item 4) -- ARMOURED SHEETS DRAWN ON A BIGGER CANVAS.
//
//   "I've added a replacement for the body type 2 wielding a scythe. The
//    previous versions cut the head of the scythe off, these larger sheets
//    allow for the sprite and scythe to move without cutting the head out of
//    the frame."
//
// Every armoured sheet before this round was cut on one of two grids: 64 for
// the idle, 92 for the run and the swing, with the feet at a shared anchor.
// The scythe's replacement is cut on a 152 grid (tools/extract_round269_
// scythe.py) so the blade has room, and every one of its frames stands its
// feet at one point of that cell. A combo listed here carries its own cell and
// foot for ALL THREE of its sheets; the loader, the painter and the renderer
// read them from here and fall back to the old grids for everything else.
//
// NO IDLE MASK. `armmask_<key>` is round 33's per-pixel weapon mask, cut on
// the 64 grid against the old idle. It does not line up with a new sheet, so a
// wide combo paints by the positional bands only (as body type 1 always has).
// ===========================================================================

export const WIDE_ARMORED = {
  scythe: { cell: 152, footX: 76, footY: 126, atkFrames: 17, runFrames: 8 },
};

/** The cell and foot of one of a combo's sheets, or null for the old grids. */
export function wideSheet(key) {
  return (key && WIDE_ARMORED[key]) || null;
}
