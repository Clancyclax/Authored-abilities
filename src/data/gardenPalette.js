// ============================================================================
// ROUND 129 -- SOME ESSENCES BLOOM IN TWO COLOURS.
//
// The user:
//
//   "Flowers should sometimes be multicolored (example doom is orange and
//    blue, lava might be red and black)"
//
// SOMETIMES is the word the table is built around. An accent on all 148
// essences and 101 confluences would not read as "this one is special", it
// would read as a second colour channel that every bed happens to have -- and
// the two examples given are both cases where the two-tone IS the concept.
// Doom in the source material is orange and blue; a volcano is red and black.
// So this is an authored list of the concepts that are genuinely two things,
// and everything absent from it blooms in one colour, as before.
//
// KEYED TWO WAYS, because the four beds are not all the same kind of thing.
// Slots 0-2 hold ESSENCES, which have stable ids. Slot 3 holds a CONFLUENCE,
// which has no id at all -- `confluenceDefFor` mints a synthetic def whose id
// is literally the string 'confluence' for every one of the hundred and one.
// Its NAME is the only thing that identifies it, so that is what this keys on.
//
// AN ENTRY MAY OVERRIDE BOTH COLOURS, not just add a second. Doom is the
// reason: its primary is derived from whichever trio formed it, so leaving `a`
// to the derivation would give "orange and blue" in name only about a tenth of
// the time. Where the user named the colours, the entry names them.
// ============================================================================

/**
 * Essence id -> { a?, b }.
 *   a   the bloom's main colour, when the concept demands a specific one.
 *       Omitted means "keep the essence's own colour", which is the usual case.
 *   b   the accent. Always present -- an entry with no accent is not an entry.
 */
// A NOTE ON THE DARK ACCENTS. "lava might be red and black" is the ask, and
// the first cut took "black" literally -- #2b1410 for fire, #1a1110 for
// Volcano. Screenshotted at Bronze, where a bloom is three pixels across, a
// near-black petal is not a dark flower, it is a hole in the field: the eye
// reads it as missing rather than as charred. Every dark accent here is
// therefore the darkest tone that still reads AS a colour at that size -- a
// deep ember rather than soot. The intent survives; the pixel does too.
export const ESSENCE_TWO_TONE = {
  // --- the user's own example, generalised: heat over char ----------------
  fire:          { b: '#6d2c12' },   // flame over blackened ground
  essBlood:      { b: '#6e1616' },   // fresh over clotted
  // --- the dark family, which is two things by definition -----------------
  shadow:        { b: '#2e2438' },   // "black for dark"
  // "severe white for sin" -- the user's own words, from the lore they gave
  // when the garden was first asked for.
  essSin:        { a: '#880e4f', b: '#f5eef2' },
  essVoid:       { b: '#e8eaf6' },   // the dark, and the stars behind it
  essSmoke:      { b: '#37474f' },
  essCorrupt:    { b: '#7cb342' },   // rot blooms green
  essBlight:     { b: '#4a3a1c' },
  // --- cold, which is never one colour ------------------------------------
  essIce:        { b: '#ffffff' },
  essCold:       { b: '#1a3a6b' },
  // --- storm ---------------------------------------------------------------
  essLightning:  { b: '#3949ab' },   // the flash and the cloud
  // --- light and its opposite number --------------------------------------
  essSun:        { b: '#fff8e1' },
  essMoon:       { b: '#283593' },
  essStar:       { b: '#5c6bc0' },
  essLight:      { b: '#ffffff' },
  // --- the two that were already about duality ----------------------------
  essOmen:       { b: '#5c6bc0' },   // the warning, and what it warns of
  essVenom:      { b: '#6a1b9a' },
  essIron:       { b: '#8d5524' },   // steel and rust
  essRune:       { b: '#4e342e' },   // the mark and the ink
};

/**
 * Confluence NAME -> { a?, b }. See the header for why this is keyed on the
 * name rather than an id.
 */
export const CONFLUENCE_TWO_TONE = {
  // The user's example, with the user's colours.
  Doom:       { a: '#ff8f3f', b: '#2979ff' },
  // "lava might be red and black" -- there is no Lava confluence, but there
  // is a Volcano, and that is the one they were describing.
  Volcano:    { a: '#e53935', b: '#33211c' },
  Phoenix:    { a: '#ff7043', b: '#ffe082' },
  Eclipse:    { a: '#ffd54f', b: '#2f2f4a' },
  Twilight:   { a: '#7e57c2', b: '#ff8a65' },
  Dawn:       { a: '#ffb74d', b: '#b3e5fc' },
  Nebula:     { a: '#7e57c2', b: '#4dd0e1' },
  Stellar:    { a: '#fff59d', b: '#2c3a9e' },
  Firebird:   { a: '#ff8f00', b: '#4fc3f7' },
  Storm:      { a: '#90a4ae', b: '#fff176' },
  Undeath:    { a: '#9ccc65', b: '#5d3a33' },
  Cataclysm:  { a: '#e53935', b: '#37474f' },
  Dragon:     { a: '#d84315', b: '#ffd54f' },
  Karmic:     { a: '#ffd54f', b: '#6a1b9a' },
  Cycle:      { a: '#8bc34a', b: '#6d4c41' },
  Mirage:     { a: '#ffe082', b: '#4dd0e1' },
  Vortex:     { a: '#4dd0e1', b: '#1a237e' },
  Prosperity: { a: '#ffd54f', b: '#2e7d32' },
  Wrath:      { a: '#e53935', b: '#ff8f00' },
  Tranquil:   { a: '#b3e5fc', b: '#a5d6a7' },
};

/** Anything a Graphics or a tint can use. Returns a number, never NaN. */
export function toTint(css, fallback = 0x8a7a52) {
  if (typeof css !== 'string' || css[0] !== '#') return fallback;
  const n = parseInt(css.slice(1), 16);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * The one or two colours a bed blooms in.
 *
 * `essenceId` for slots 0-2, `confluenceName` for slot 3 -- pass whichever the
 * slot has. Returns `{ a, b }` as tint NUMBERS, with `b === null` for the
 * single-colour majority, which is what the caller tests to decide whether to
 * alternate at all.
 */
export function bloomColours(baseCss, { essenceId = null, confluenceName = null } = {}) {
  const entry = (essenceId && ESSENCE_TWO_TONE[essenceId])
    || (confluenceName && CONFLUENCE_TWO_TONE[confluenceName])
    || null;
  const a = toTint(entry && entry.a ? entry.a : baseCss);
  return { a, b: entry ? toTint(entry.b, a) : null };
}

/** Everything this file promises, checked. */
export function gardenPaletteFaults(essenceIds, confluenceNames) {
  const out = [];
  const hex = /^#[0-9a-fA-F]{6}$/;
  for (const [table, name] of [[ESSENCE_TWO_TONE, 'essence'], [CONFLUENCE_TWO_TONE, 'confluence']]) {
    for (const [k, v] of Object.entries(table)) {
      // An entry with no accent is not an entry -- it is a single-colour
      // essence that has been given a table row for no reason.
      if (!v.b) out.push(`${name} ${k}: no accent`);
      if (v.b && !hex.test(v.b)) out.push(`${name} ${k}: accent ${v.b} is not a hex colour`);
      if (v.a && !hex.test(v.a)) out.push(`${name} ${k}: primary ${v.a} is not a hex colour`);
      // The two colours have to be TELLABLE APART at eight pixels across.
      //
      // PER CHANNEL, not by packed integer. The first cut subtracted the two
      // 24-bit values, which is not a colour distance in any sense: it flagged
      // Phoenix (bright orange against pale gold) as "nearly the same" because
      // the two share a red channel and so land close together on the number
      // line, while a pair differing only in red would have passed with a
      // million between them.
      if (v.a && v.b) {
        const ch = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        const [ar, ag, ab] = ch(toTint(v.a));
        const [br, bg, bb] = ch(toTint(v.b));
        const d = Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb);
        if (d < 90) out.push(`${name} ${k}: the two colours are nearly the same (${d})`);
      }
    }
  }
  // Every key names something that exists. A typo here is a two-tone essence
  // that silently never blooms in two colours, which nothing else would catch.
  if (essenceIds) {
    for (const k of Object.keys(ESSENCE_TWO_TONE)) {
      if (!essenceIds.includes(k)) out.push(`${k} is not an essence`);
    }
  }
  if (confluenceNames) {
    for (const k of Object.keys(CONFLUENCE_TWO_TONE)) {
      if (!confluenceNames.includes(k)) out.push(`${k} is not a confluence`);
    }
  }
  // "SOMETIMES multicolored" -- a table that covered everything would not be
  // saying anything. This is the line that keeps the feature a distinction.
  if (essenceIds && Object.keys(ESSENCE_TWO_TONE).length > essenceIds.length * 0.35) {
    out.push('most essences are two-tone; "sometimes" has stopped meaning anything');
  }
  // ...and the two the user named by colour are exactly what they named.
  if (CONFLUENCE_TWO_TONE.Doom.a !== '#ff8f3f' || CONFLUENCE_TWO_TONE.Doom.b !== '#2979ff') {
    out.push('Doom is no longer orange and blue');
  }
  if (!CONFLUENCE_TWO_TONE.Volcano) out.push('nothing is red and black');
  return out;
}
