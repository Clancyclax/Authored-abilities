// ===========================================================================
// ROUND 74 -- THE THINGS A RANGED WEAPON PUTS IN THE AIR.
//
// The user, sending the art mid-round:
//
//   "1.2) Also added projectiles for bows/crossbows
//    1.3) Also added projectiles for staves
//    1.1.4.1) When abilities are generated allowing a character to 'throw' a
//             javelin (or spear) the spear's actual asset should be recolored
//             as elementally or magically appropriate and can move across the
//             screen."
//
// Round 74's first pass drew weapon shots as a plain oriented rectangle,
// because there was no arrow, bolt or thrown-spear sprite in the project. All
// three now exist, and they arrive in three different shapes, so this file is
// where "which picture is this shot" is answered ONCE for every caller.
//
//   ARROWS   fx_arrows -- eighteen 24px designs, already elemental (a
//            Fire_Arrow, an Ice_Arrow, an Electric_Arrow). Bows and crossbows.
//   BOLTS    fx_bolts -- eleven 24px designs, likewise. Staves, and any
//            ability that throws a bolt.
//   SPEARS   no new art and none needed: a thrown javelin is the SPEAR BANK's
//            own sprite, recoloured by the round-35 palette pipeline, which
//            is exactly what 1.1.4.1 asks for. The bank already ships every
//            design in six elemental variants, so a fire javelin is a cell
//            lookup rather than a new drawing.
//
// WHY THE ELEMENT PICKS THE CELL RATHER THAN A TINT. Every other projectile
// in this game is a greyscale master tinted on the GPU (fxAtlas). These are
// not: the artist drew a burning arrow with flame licking off the shaft and
// an ice arrow with a crystal head, and tinting one grey arrow six ways would
// throw all of that away. So the mapping below is by NAME, read off the
// generated sheet order, and the runtime asks for an element rather than a
// colour.
// ===========================================================================
import { MISSILE_SHEETS, MISSILE_COLS } from './missileSheets.js';
import { BANK_VARIANTS, BANK_NEUTRAL, BANK_ELEMENTS, BANKS } from './itemBanks.js';

export { MISSILE_SHEETS, MISSILE_COLS };

/** Every sheet the loader has to fetch, with its cell geometry. */
export function allMissileSheets() {
  return Object.entries(MISSILE_SHEETS).map(([key, s]) => ({
    key, url: `./public/assets/${key}.png`, cell: s.cell,
  }));
}

/**
 * element -> design name, per sheet.
 *
 * `null` is the untyped shot -- a plain arrow from a plain bow -- and is what
 * an element the sheet cannot express falls back to. There is exactly one of
 * those and it is named in MISSILE_ART_GAPS below rather than quietly
 * papered over: an unlisted gap is a gap nobody ever fixes.
 */
const ARROW_BY_ELEMENT = {
  null: 'Brown_Arrow',            // plain wood and steel
  fire: 'Fire_Arrow',
  frost: 'Ice_Arrow',
  lightning: 'Electric_Arrow',
  nature: 'Life_Arrow',
  shadow: 'Cursed_Arrow',
  radiant: 'White_Arrow',
};
const BOLT_BY_ELEMENT = {
  null: 'golden_magic_bolt',
  fire: 'red_magic_bolt',
  frost: 'Magic_arrows_magic_bolts_fir_4',   // the pale blue shard
  lightning: 'yellow_magic_bolt',
  nature: 'golden_magic_bolt',               // see MISSILE_ART_GAPS
  shadow: 'black_magic_bolt',
  radiant: 'Magic_arrows_magic_bolts_fir_2', // the white-gold comet
};

/** Elements a sheet cannot express, and what they borrow instead. Exported so
 *  a test can assert the list is what we think it is rather than letting it
 *  grow quietly, which is the same discipline ARMORED_ART_GAPS keeps for the
 *  player's poses. */
export const MISSILE_ART_GAPS = [
  { sheet: 'fx_bolts', element: 'nature', borrows: 'golden_magic_bolt',
    why: 'the bolt set has no green design; the arrow set does (Life_Arrow)' },
];

const BY_SHEET = { fx_arrows: ARROW_BY_ELEMENT, fx_bolts: BOLT_BY_ELEMENT };

/** Which sheet a weapon's missile comes from, or null for the spear bank.
 *  Read off the weapon's own `missile` field so a weapon cannot be an arrow
 *  in one table and a bolt in another. */
export function missileSheetFor(weapon) {
  const kind = weapon && weapon.missile;
  if (kind === 'arrow') return 'fx_arrows';
  if (kind === 'bolt') return 'fx_bolts';
  return null;   // 'spear' and anything unrecognised -- see spearMissileCell
}

/** The frame index for one element on one sheet, or 0 if the sheet is
 *  unknown. Frames are laid out row-major at MISSILE_COLS per row, which is
 *  exactly what Phaser's spritesheet loader produces from the packed png. */
export function missileCell(sheetKey, element) {
  const sheet = MISSILE_SHEETS[sheetKey];
  const table = BY_SHEET[sheetKey];
  if (!sheet || !table) return 0;
  const name = table[element || 'null'] || table.null;
  const i = sheet.names.indexOf(name);
  return i < 0 ? 0 : i;
}

/**
 * A thrown spear's cell in the SPEAR BANK, recoloured for its element.
 *
 * This is 1.1.4.1 in one function. The spear bank is designs x 10 variants,
 * where variants 0-3 are neutral jitters and 4-9 are the six elements in
 * BANK_ELEMENTS order -- so "the spear's actual asset, recolored as
 * elementally or magically appropriate" is a row-and-column lookup in art
 * that has shipped since round 35. An untyped throw takes neutral variant 0,
 * which is the untouched original.
 */
export function spearMissileCell(element, design = 10) {
  const bank = BANKS.spear;
  const d = bank ? Math.max(0, Math.min(bank.designs - 1, design)) : 0;
  const ei = BANK_ELEMENTS.indexOf(element);
  const variant = ei < 0 ? 0 : BANK_NEUTRAL + ei;
  return d * BANK_VARIANTS + variant;
}
