// ROUND 32 -- resolving what the armored player should LOOK like from what
// is actually equipped.
//
// The art (armoredManifest.js, see extract_round32_armored.py for
// provenance) ships each weapon/shield combination ONCE, with a recorded
// (artRight, artLeft) hand order. The player can equip the same pair in
// either hand order, so the resolver returns a `flip` flag alongside the
// state key: rendering flipped means setFlipX(true) AND remapping the facing
// (east<->west, northeast<->northwest, southeast<->southwest), because
// mirroring an isometric sprite horizontally turns an east-facing pose into
// a west-facing one -- flipX alone would show a knight walking east while
// facing west.
//
// Fallback chain, most-specific first, per the user's "ideally cover all
// equipment mix and matching" with art that covers 33 of the possible
// combos:
//   1. exact (right, left) match          -> no flip
//   2. swapped (left, right) match        -> flip
//   3. right-hand item alone              -> its single state (flip as needed)
//   4. left-hand item alone               -> its single state (flip as needed)
//   5. nothing matched                    -> the chest base set (bare hands)
import { ARMORED_COMBOS } from './armoredManifest.js';

export const MIRROR_FACING = {
  east: 'west', west: 'east',
  northeast: 'northwest', northwest: 'northeast',
  southeast: 'southwest', southwest: 'southeast',
  north: 'north', south: 'south',
};

// index the combos by their hand pair for O(1) lookup
const BY_PAIR = new Map();
for (const [key, c] of Object.entries(ARMORED_COMBOS)) {
  BY_PAIR.set(`${c.right}|${c.left}`, { key, flip: false });
  const swapped = `${c.left}|${c.right}`;
  if (!BY_PAIR.has(swapped)) BY_PAIR.set(swapped, { key, flip: true });
}

function lookup(right, left) {
  return BY_PAIR.get(`${right}|${left}`) || null;
}

// --- ROUND 74: ART GAPS -- and ROUND 75 closing three of the four ----------
//
// The round-32 atlas covered the seven melee weapons and nothing else, so the
// four weapons added in round 74 fell through every rung of the chain above
// and landed on `null` -- the chest base set, which is an armoured figure with
// EMPTY HANDS. A player who had just paid 120 coins for a bow would watch
// their character shoot arrows out of nowhere, and nothing anywhere would
// report a problem, because bare-handed is a legitimate state the resolver
// returns on purpose for an unarmed player.
//
// So all four were proxied onto the nearest recorded pose and the stand-ins
// were LISTED, on the round-73 rule the user set for summons: "use the
// stand-in, this will allow me to identify where models are needed vs not
// working in the future."
//
// ROUND 75 -- the list worked. The user sent armoured poses for bow, crossbow
// and staff in the next drop, they are real ARMORED_COMBOS entries now, and
// all three are gone from both tables below. What is left is the javelin, and
// it was never a stand-in: a javelin IS a thrown spear, `weapons.js` says so
// with `subtypeOf: 'spear'`, and the spear pose is the correct drawing of a
// character about to throw one. So the proxy table has one row and the gap
// list is EMPTY -- which is the honest state, not an omission.
export const ARMORED_PROXY = { javelin: 'spear' };
/** Poses that are stand-ins rather than genuine matches -- i.e. the list of
 *  drawings the next art drop has to cover. Empty since round 75. Kept, and
 *  kept exported, because a test asserts it: an empty list that nothing checks
 *  would silently refill the moment another weapon arrives without art. */
export const ARMORED_ART_GAPS = [];
function proxied(wid) {
  return wid && ARMORED_PROXY[wid] ? ARMORED_PROXY[wid] : wid;
}

// rightWid/leftWid: weapon ids or null. hasShield: shield GEAR equipped.
// Returns { key, flip } or null (null = use the chest base set).
export function resolveArmoredState(rightWid, leftWid, hasShield) {
  // ROUND 74 -- proxied at the DOOR, before the shield is slotted and before
  // any lookup runs, so every rung of the fallback chain below sees an id the
  // atlas actually knows. Proxying inside `lookup` instead would have to be
  // remembered at each of its six call sites.
  let right = proxied(rightWid) || null;
  let left = proxied(leftWid) || null;
  // The shield is worn on an arm, not held in a recorded hand slot. It
  // occupies whichever hand is empty; with both hands full it simply is not
  // drawn (no art for weapon+weapon+shield, and a buckler on the back is
  // not something this sprite set depicts).
  if (hasShield) {
    if (!left) left = 'shield';
    else if (!right) right = 'shield';
  }
  if (!right && !left) return null;
  // The dual-state fallback at the end covers the two items with no single
  // state in the art: a lone dagger borrows the dual-dagger art and a lone
  // shield the dual-shield art -- showing the item twice beats showing the
  // player bare-handed while holding it.
  return lookup(right, left)
    || (right && left ? lookup(right, null) || lookup(null, right) || lookup(left, null) || lookup(null, left) : null)
    || (right && !left ? lookup(right, null) || lookup(null, right) || lookup(right, right) : null)
    || (!right && left ? lookup(left, null) || lookup(null, left) || lookup(left, left) : null)
    || null;
}
