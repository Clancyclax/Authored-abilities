// ============================================================================
// ROUND 127 -- THE SOUL GARDEN.
//
// The user, asking for it:
//
//   "Within the lore Jason meditates to see the essences inside his soul as 3
//    flower beds representing his essences. Blood red for blood, black for
//    dark, orange and blue for doom, and severe white for sin. I'm thinking
//    that we add a small window above the players head during meditation that
//    shows this flower garden for their own essences and has a little particle
//    effect that trickles slowly into them as their banked experience is used
//    to water the three essences.
//
//    Each rank up the flower beds should grow and become a little larger, with
//    Iron 1 being a single planter and stalk for each essence, to iron 9 being
//    a full row of 9 plants. Bronze 1 being a planted row in tilled soil,
//    bronze 9 being a field of 9 rows, silver 1 being a transition to a soul
//    space where you now have a seperate map to explore that is your 3 esseece
//    fields growing from 1 set of 9 rows to 9 sets of 9 rows, with any summons
//    from your abilities wandering around and with dialogue talking about
//    their place in the astral and finally gold where instead of flowers you
//    now have forests and flowers, with meandering paths. Summons still
//    wandering around."
//
// ---------------------------------------------------------------------------
// FOUR BEDS, NOT THREE, AND THE USER'S OWN COLOURS SAY WHY
// ---------------------------------------------------------------------------
//
// The ask says "3 flower beds" and then names FOUR colours: blood red, black,
// orange-and-blue, severe white. Those are Jason's three essences -- Blood,
// Dark, Sin -- plus Doom, which is the confluence they form. So the lore
// example is already a garden of three essences and the thing they add up to,
// and this game's player has exactly that: three essence slots and a
// confluence, four progressing records in `slotProgress`.
//
// Drawing three would mean the confluence -- the slot the whole awakening-stone
// architecture builds toward -- was the one part of the soul with nothing
// growing in it. So: four beds, and the fourth is the confluence, in the
// confluence's own colour.
//
// ---------------------------------------------------------------------------
// WHY THE STAGES ARE A TABLE
// ---------------------------------------------------------------------------
//
// The growth is a promise about the player's whole progression -- a single
// stalk at Iron 1 and a field of nine rows at Bronze 9 is a statement about how
// far they have come, and it is only true if every rung between them is drawn.
// A table can be checked; a switch statement buried in a draw call cannot.
// `gardenStageFor` is pure, and the data lane walks every rank and level
// through it.
//
// ROUND 128 WILL TAKE OVER AT SILVER. "silver 1 being a transition to a soul
// space where you now have a seperate map to explore" is a map, not a panel,
// and the summons wandering it with dialogue about the astral are a system of
// their own. The stages below carry Silver and Gold so the panel never goes
// blank for a player who reaches them first, but what they describe is the
// overhead window continuing to grow -- the explorable soul space is its own
// round.
// ============================================================================

import { RANK_ORDER } from './ranks.js';
import { LEVELS_PER_RANK } from './essenceRank.js';

/** The four beds, in slot order. Slot 3 is the confluence. */
export const GARDEN_BEDS = 4;

/**
 * What one essence's bed looks like at a given standing.
 *
 *   form     'planter' | 'tilled' | 'field' | 'forest'  -- what the soil is
 *   rows     how many rows of planting
 *   perRow   how many plants in each row
 *   plants   rows * perRow, precomputed because everything reads it
 *   soil     how tall the bed's earth is drawn, in panel units
 *   label    a short name for the stage, for the panel's caption
 *
 * THE LEVEL IS THE COUNT. "Iron 1 being a single planter and stalk for each
 * essence, to iron 9 being a full row of 9 plants" -- so at Iron the level IS
 * the number of plants, and at Bronze the level IS the number of rows. That is
 * a rule rather than a coincidence, and it is what makes the garden readable:
 * a player who counts the stalks knows their level without a number.
 *
 * LEVEL 0 IS AN EMPTY BED. Iron 0 is where a character starts, and the ask
 * begins its description at Iron 1 -- so zero is bare soil, which is also the
 * honest picture of a character who has not consolidated anything yet.
 */
export function gardenStageFor(rank, level) {
  const lv = Math.max(0, Math.min(LEVELS_PER_RANK - 1, level || 0));
  const r = RANK_ORDER.indexOf(rank) > 0 ? rank : 'iron';
  if (r === 'iron') {
    // A planter with one stalk per level. Iron 9 is "a full row of 9 plants".
    return { form: 'planter', rows: lv ? 1 : 0, perRow: lv, plants: lv, soil: 4,
      label: lv ? `planter of ${lv}` : 'bare planter' };
  }
  if (r === 'bronze') {
    // "Bronze 1 being a planted row in tilled soil, bronze 9 being a field of
    // 9 rows." The row is full from the first one -- what grows is how MANY.
    const rows = Math.max(1, lv || 1);
    return { form: lv >= 5 ? 'field' : 'tilled', rows, perRow: 9, plants: rows * 9, soil: 6,
      label: rows === 1 ? 'a tilled row' : `${rows} rows` };
  }
  if (r === 'silver') {
    // "your 3 essence fields growing from 1 set of 9 rows to 9 sets of 9 rows".
    // A set is nine rows, so the count here is SETS.
    const sets = Math.max(1, lv || 1);
    return { form: 'field', rows: 9, perRow: 9, sets, plants: sets * 81, soil: 8,
      label: sets === 1 ? 'a field of 9 rows' : `${sets} fields` };
  }
  // "finally gold where instead of flowers you now have forests and flowers,
  // with meandering paths."
  const groves = Math.max(1, lv || 1);
  return { form: 'forest', rows: 9, perRow: 9, sets: 9, groves, plants: 9 * 81, soil: 9,
    label: groves === 1 ? 'a forest and its paths' : `${groves} forests` };
}

/** How big the window is at a given rank, in panel units. It grows, but it is
 *  a window over someone's head: a panel that kept scaling with the garden
 *  would be covering the screen by Bronze. */
// ROUND 128 -- FORTY PER CENT LARGER. The user: "The iron and bronze preview
// box should be 40% larger." Applied to all four rather than only the two they
// named, because the sizes have to keep climbing -- a Bronze window grown past
// a Silver one would make the window shrink at a rank-up, which `soulGardenFaults`
// refuses and which would read as a demotion. It is also the change that makes
// the real flower art legible: at the old width a bed was thirty pixels across
// and a nine-plant row had three pixels per planter.
// ROUND 129 -- ANOTHER TWENTY PER CENT ON TOP. "Window should grow another
// 20%, and the flowers should not be overlapping." 1.4 * 1.2. The two asks are
// one ask: nine planters that may not overlap need somewhere to not overlap,
// and the extra width is where they go. See `_drawGardenBed` for the other
// half -- the row became a grid, because even at this size nine pots in a
// single row across a fifty-pixel bed would be five pixels each.
// ROUND 130 -- AND HALF AS MUCH AGAIN. 1.4 * 1.2 * 1.5. Three rises now, and
// they are cumulative rather than replacements: each one was asked for against
// the size the one before it shipped at.
//
// This is the last rise the WINDOW will take, because past Silver there is no
// window -- the soul space is full screen (see `_updateSoulSpace`). What the
// growth buys at Iron and Bronze is legibility: at 2.52x a bed is eighty
// pixels across and a nine-planter grid gives each pot twenty-five, which is
// enough for the pot to be a shape rather than a smudge.
export const GARDEN_GROWTH = 1.4 * 1.2 * 1.5;
const PANEL_BASE = {
  iron:   { w: 122, h: 50 },
  bronze: { w: 146, h: 60 },
  silver: { w: 166, h: 68 },
  gold:   { w: 182, h: 74 },
};
export const GARDEN_PANEL = Object.fromEntries(Object.entries(PANEL_BASE).map(
  ([k, v]) => [k, { w: Math.round(v.w * GARDEN_GROWTH), h: Math.round(v.h * GARDEN_GROWTH) }]));
export function gardenPanelFor(rank) {
  return GARDEN_PANEL[rank] || GARDEN_PANEL.iron;
}

// ---------------------------------------------------------------------------
// ROUND 128 -- THE REAL ART.
//
//   "Flowers attached single and fields. Recolor as needed to be interesting
//    and thematic for each essence."
//
// Two sheets, both packed by tools/sheet_round128_garden.py with the BLOOM on
// a separate row from the pot -- see that script for why. The scene draws the
// base untinted and the bloom tinted with the bed's essence colour, so each
// essence gets its own flowers without its pot turning that colour too.
// ---------------------------------------------------------------------------

/** Four planters, one per bed, so the four beds do not look like one bed drawn
 *  four times. Indexed by slot, so a player's Fire slot always has the same
 *  container and the garden is recognisably theirs. */
export const GARDEN_SINGLES = 4;
/** ROUND 130 -- and four blossom trees, for the Gold soul space. Same two-row
 *  packing: trunk and grass plinth on top, blossom below, so a Gold soul's
 *  trees bloom in its own essences' colours. */
export const GARDEN_TREES = 4;
export const GARDEN_TREE_PX = 152;
/** Rows in the packed field tile, and how wide one of them is in it. */
export const GARDEN_FIELD_ROWS = 8;
export const GARDEN_FIELD_PX = 256;

/** How many planters, or how many field rows, a bed actually DRAWS.
 *
 *  Not the same as `stage.plants`: a Silver bed is 729 plants and nobody is
 *  drawing 729 sprites in a window. The field tile is a picture of a dense
 *  planting, so past Bronze what grows is how much of the tile is shown and how
 *  many times it is layered -- which is what "9 sets of 9 rows" looks like at
 *  this size. */
export function gardenDrawFor(stage) {
  if (stage.form === 'planter') return { kind: 'pots', count: stage.plants };
  const rows = Math.min(GARDEN_FIELD_ROWS, Math.max(1, stage.rows));
  return { kind: 'field', rows, layers: Math.max(1, stage.sets || stage.groves || 1) };
}

/** ROUND 129 -- what the window says while the banked experience is going in.
 *  ROUND 134 (item 11) -- and now what it says FULL STOP. */
export const GARDEN_WATERING_CAPTION = 'Consolidate your gains.';

/**
 * The caption under the window.
 *
 * ROUND 134 (item 11) -- ONE CAPTION, AND THE RANK FLAVOURS ARE GONE.
 *
 * The user: "'Your soul in flower' should be removed during meditation. It's
 * supposed to now say 'Consolidate your gains'."
 *
 * Round 129 took the user's wording and applied it to HALF the window's life:
 * while the pour ran it said "Meditate to consolidate your gains", and the
 * moment the pour finished it fell back to a rank-flavoured line -- "your
 * soul, in flower" at iron and bronze, "in field" at silver, "in leaf" at
 * gold. Those three were round 127's, written before the window had a job to
 * describe, and they are what the player actually reads most of the time,
 * because the pour is seconds and the sitting is not.
 *
 * They are deleted rather than reworded. The window opens during a sitting and
 * nowhere else -- `gardenCaptionFor` has exactly one call site, inside the
 * meditation draw -- so every reading of it is during meditation, which is the
 * case the user named. "Meditate to" also goes with them: the player is
 * already meditating by the time they can see this.
 *
 * `rank` and `watered` are kept in the signature deliberately. The caller
 * passes both, the rank-flavoured line is the kind of thing that comes back,
 * and a parameter that is currently unused costs nothing next to a call site
 * that has to be rewritten when it does.
 */
export function gardenCaptionFor(rank, watered) {   // eslint-disable-line no-unused-vars
  return GARDEN_WATERING_CAPTION;
}

/** How long the watering trickle runs, in seconds, and how many motes it
 *  spends. A trickle -- the user's word -- so it is slow and it is finite: it
 *  is the banked experience going somewhere, and when the pool is spent it
 *  stops rather than looping forever over an empty bed. */
export const GARDEN_WATER_SECONDS = 4.5;
export const GARDEN_MOTE_SECONDS = 1.15;
export const GARDEN_MOTE_INTERVAL = 0.16;

/** Everything this file promises, checked. */
export function soulGardenFaults() {
  const out = [];
  const ranks = ['iron', 'bronze', 'silver', 'gold'];
  for (const r of ranks) {
    let last = null;
    for (let l = 0; l < LEVELS_PER_RANK; l++) {
      const st = gardenStageFor(r, l);
      if (!st.form) out.push(`${r} ${l}: no form`);
      if (!st.label) out.push(`${r} ${l}: no label`);
      if (st.plants < 0) out.push(`${r} ${l}: negative planting`);
      // THE GARDEN NEVER SHRINKS AS YOU LEVEL. The whole point of it is that
      // it is a picture of how far you have come, and a rung that drew fewer
      // plants than the one below would say the opposite.
      if (last !== null && st.plants < last) out.push(`${r} ${l}: ${st.plants} plants, down from ${last}`);
      last = st.plants;
    }
  }
  // ...and it never shrinks ACROSS a rank boundary either, which is the join
  // the per-rank loop above cannot see.
  for (let i = 1; i < ranks.length; i++) {
    const top = gardenStageFor(ranks[i - 1], LEVELS_PER_RANK - 1);
    const bottom = gardenStageFor(ranks[i], 1);
    if (bottom.plants < top.plants) {
      out.push(`${ranks[i]} 1 (${bottom.plants}) is smaller than ${ranks[i - 1]} 9 (${top.plants})`);
    }
  }
  // The user's own four landmarks, by their own description.
  const i1 = gardenStageFor('iron', 1), i9 = gardenStageFor('iron', 9);
  if (i1.plants !== 1 || i1.form !== 'planter') out.push('Iron 1 is not a single planter and stalk');
  if (i9.plants !== 9 || i9.rows !== 1) out.push('Iron 9 is not a full row of 9 plants');
  const b1 = gardenStageFor('bronze', 1), b9 = gardenStageFor('bronze', 9);
  if (b1.rows !== 1 || b1.form !== 'tilled') out.push('Bronze 1 is not a planted row in tilled soil');
  if (b9.rows !== 9) out.push('Bronze 9 is not a field of 9 rows');
  const s1 = gardenStageFor('silver', 1), s9 = gardenStageFor('silver', 9);
  if (s1.sets !== 1 || s1.rows !== 9) out.push('Silver 1 is not one set of 9 rows');
  if (s9.sets !== 9) out.push('Silver 9 is not 9 sets of 9 rows');
  if (gardenStageFor('gold', 1).form !== 'forest') out.push('Gold is not forest');
  // A bed for every slot the player actually has.
  if (GARDEN_BEDS !== 4) out.push(`${GARDEN_BEDS} beds; the player has three essences and a confluence`);
  for (const r of ranks) {
    const p = gardenPanelFor(r);
    if (!p || !p.w || !p.h) out.push(`${r}: no panel size`);
  }
  // The window grows with the rank, which is the ask ("the flower beds should
  // grow and become a little larger"), but stays a window.
  for (let i = 1; i < ranks.length; i++) {
    if (gardenPanelFor(ranks[i]).w <= gardenPanelFor(ranks[i - 1]).w) {
      out.push(`${ranks[i]}: the window did not grow`);
    }
  }
  // ROUND 129 -- the ceiling moves with the growth. Two twenty-per-cent rises
  // put Gold at 306, which is a fifth of a 1400px viewport -- still a window
  // over someone's head rather than a screen. The check is kept because the
  // thing it guards against (a window that keeps growing until it is the game)
  // is still real; only the number it guards at has moved.
  // The ceiling moves with the growth. Only Iron and Bronze are drawn as a
  // window at all now, so that is what this guards -- Silver and Gold have
  // panel sizes for the data's sake and never render one.
  if (gardenPanelFor('bronze').w > 420) out.push('the window has stopped being a window');
  return out;
}
