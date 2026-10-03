// ============================================================================
// ROUND 280 -- CHANGES TO THE CANON THE USER HAS APPROVED, AND ONLY THOSE.
//
//   "Cannon abilities are EXACT they are not to be modified without direct
//    approval to do so."
//
// canonText.js is generated from the pastes and stays byte-for-byte what was
// sent. An approved change is recorded HERE, one row per ability, with the
// approval quoted beside it, and read through `canonView` -- so the paste is
// never edited, the change is visible in one place, and removing a row puts
// the ability back exactly as sent.
//
// Fields a row may carry:
//   stone         the card's stone line, replacing the paste's
//   innate        false: no longer awakened with the essence alone
//   similarStones stone ids that also grant it ("or similar"), approved with it
// ============================================================================
import { CANON_TEXT } from './canonText.js';

export const CANON_APPROVED_EDITS = {
  // "All first abilities need to be a low cost attack. Midnight eyes can
  //  become Dark+ awakening stone of the eye or similar."
  // Asked what the card should print for its stone: "Print the Eye stone".
  midnightEyes: {
    stone: 'Eye (common)',
    innate: false,
    similarStones: ['stoneVision'],
  },
};

/** The canon record as the game should read it: the paste, with any
 *  approved edit laid over it. Null where there is no paste. */
export function canonView(key) {
  const t = CANON_TEXT[key];
  if (!t) return null;
  const e = CANON_APPROVED_EDITS[key];
  if (!e) return t;
  const out = { ...t };
  if (e.stone != null) out.stone = e.stone;
  if (e.innate === false) delete out.innate;
  return out;
}
