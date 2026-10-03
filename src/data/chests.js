// ============================================================================
// ROUND 141 (item 5) -- CONTAINERS.
//
//   "Containers need to be fully integrated into the game. found in cult
//    hideouts or occasionally in lone dwellings. Region appropriate loot
//    should be within (i.e. gear, coins, awakening stones and rarely
//    essences). Attached are a series of chests for use, the majority in the
//    NEK should be the wooden chests but within astral spaces and cult HQs
//    utilize appropriately thematic chests and draft their loot tables to
//    learn towards the element of the chest."
//
// Two questions, and the whole file is the answer to them:
//
//   WHICH CHEST STANDS HERE?  The place decides, not a die. A landmark an
//   element has taken wears that element's chest; a cult's camp wears its
//   cult's; somewhere with no element of its own wears the plain wooden one
//   its region can afford. That is why "the majority in the NEK" comes out
//   wooden without anybody weighting a table towards wood: the Nek is the
//   region where almost nothing has an element yet.
//
//   WHAT IS INSIDE IT?  The chest's own element, resolved against the live
//   catalogues by the SAME keyword machinery round 63 built for the landmarks
//   (`sitePools`). Not a second copy of it -- a fire chest and a fire landmark
//   agree about what fire is because they ask the same function, and a stone
//   added in a later round joins both without anyone editing either.
//
// THE ART IS A CONTRACT WITH A SHEET. `idx` is the frame number in
// public/assets/chests.png, and that sheet's order is typed out in
// tools/extract_round141_chests.py rather than sorted, for the reason recorded
// there. `chestFaults` below asserts the two lists still agree, so renaming a
// source file cannot silently renumber every chest in the world.
// ============================================================================

import { PALETTE_THEME, SITE_TYPES, sitePools } from './sites.js';

/** One 56px sheet, eight across. Native size: the chest draws at 44-56px in
 *  the world, so there is nothing to gain by downscaling first. */
export const CHEST_ART = { key: 'chests', file: 'chests.png', cell: 56, cols: 8 };

/**
 * The sixteen, in sheet order.
 *
 * `palette` names the round-64 palette whose vocabulary this chest shares, and
 * the theme is then IMPORTED rather than retyped -- one definition of what
 * "fire" means, read by the landmark that is on fire and by the chest standing
 * in it. `theme` is only written out for the models no palette covers.
 * `theme: null` is a deliberate third state and means "this chest is not
 * elemental": a wooden box holds what anything holds, off the general drop
 * table, and leaning it towards anything would be inventing an element the art
 * does not have.
 *
 * `foot` is the ink-box bottom measured by the extractor, as a fraction of the
 * cell. The chest is drawn with its feet on its world point; without this the
 * models whose art sits high in the cell (royal at 54/56, Wooden at 49/56)
 * float by up to five pixels, which reads as a rendering fault rather than as
 * a chest.
 */
export const CHEST_MODELS = [
  { idx: 0,  key: 'cheap_wooden_chest', label: 'a battered wooden chest', foot: 53 / 56, palette: null, theme: null },
  { idx: 1,  key: 'Wooden_chest',       label: 'a wooden chest',          foot: 49 / 56, palette: null, theme: null },
  { idx: 2,  key: 'metal_chest_iron',   label: 'an iron-bound chest',     foot: 50 / 56, palette: 'rustwork' },
  { idx: 3,  key: 'metal_chest_gold',   label: 'a gilded chest',          foot: 50 / 56, palette: 'gilt' },
  { idx: 4,  key: 'stone_chest',        label: 'a stone casket',          foot: 50 / 56, palette: 'bonefield' },
  // The richest plain chest rather than an elemental one: it is a strongbox,
  // and what makes it royal is what is in it. See CHEST_PLAIN_LADDER.
  { idx: 5,  key: 'royal_chest',        label: 'a royal strongbox',       foot: 54 / 56, palette: null, theme: null, rich: true },
  // The pack's own spelling of "treasure", kept verbatim. The key is the
  // filename on disk and the sheet order is keyed off it; correcting the typo
  // here would mean the extractor and this file disagree about which cell this
  // is, which is precisely the failure the ORDER list exists to prevent.
  { idx: 6,  key: 'pirate_teeasure_chest', label: 'a salt-stained sea chest', foot: 54 / 56, palette: null,
    theme: /water|tide|\bsea\b|deep|drown|salt|wave|current|pearl|fish|ship|anchor|kraken|tentacle/i },
  { idx: 7,  key: 'chest_of_stars',     label: 'a chest full of sky',     foot: 52 / 56, palette: 'prismfold' },
  { idx: 8,  key: 'elemental_chest_blood',    label: 'a blood-marked chest', foot: 51 / 56, palette: 'blood' },
  { idx: 9,  key: 'elemental_chest_fire',     label: 'a smouldering chest',  foot: 50 / 56, palette: 'ember' },
  { idx: 10, key: 'elemental_chest_ice',      label: 'a chest cased in ice', foot: 51 / 56, palette: 'rime' },
  { idx: 11, key: 'elemental_chest_electric', label: 'a humming chest',      foot: 52 / 56, palette: 'stormglass' },
  { idx: 12, key: 'elemental_chest_dark',     label: 'a chest that eats the light', foot: 51 / 56, palette: 'voidfall' },
  // `gilt` is the nearest palette and is NOT reused: it means light AND gold,
  // which is what the gilded chest already is. This one is light alone.
  { idx: 13, key: 'elemental_chest_light',    label: 'a chest of pale fire',  foot: 51 / 56, palette: null,
    theme: /\blight|radiant|\bholy|divine|dawn|halo|grace|blessing|mirror|\bsun\b|glory|purity/i },
  { idx: 14, key: 'elemental_chest_plant',    label: 'a chest under vines',   foot: 53 / 56, palette: 'verdigris' },
  { idx: 15, key: 'elemental_chest_earth',    label: 'a chest cut from rock', foot: 53 / 56, palette: null,
    theme: /\bearth|\brock|granite|slate|boulder|\bsand|clay|mountain|quake|gravel|\bmud|crystal/i },
];

export const CHEST_KEYS = CHEST_MODELS.map(m => m.key);
export const CHEST_BY_KEY = Object.fromEntries(CHEST_MODELS.map(m => [m.key, m]));

/**
 * The plain ladder, by region index.
 *
 * A place with no element of its own still has a rank, and this is the only
 * axis a plain chest has. It is also the mechanism behind the user's "the
 * majority in the NEK should be the wooden chests": the Nek is index 0, almost
 * nothing in it has an element (round 64 gates blood and prismfold to index 2
 * and above), so almost every chest in it falls through to this list -- and
 * the first two entries are the two wooden ones. Nothing weights a die towards
 * wood; wood is simply what the starting region is.
 */
export const CHEST_PLAIN_LADDER = [
  'cheap_wooden_chest',   // 0  the Nek
  'Wooden_chest',         // 1  Ontaria
  'Wooden_chest',         // 2  Elehyd
  'metal_chest_iron',     // 3  Bratugal
  'metal_chest_iron',     // 4  Sirukh Sands
  'metal_chest_gold',     // 5  the Cinderwaste
  'royal_chest',          // 6  Ixcuatl
];
// The ladder's top two entries were BOTH `royal_chest` on the first pass, and
// the probe said what that meant: ten royal strongboxes in the world and one
// gilded chest, because most chests stand at lone dwellings and the last two
// regions hold a lot of them. A strongbox that is the commonest container in
// the back half of the game is not a strongbox. Gold at five, royal at six.

/** A round-64 palette -> the chest that wears it. Ten palettes, ten chests,
 *  and `chestFaults` asserts the mapping is total in both directions. */
export const CHEST_BY_PALETTE = {
  blood: 'elemental_chest_blood',
  ember: 'elemental_chest_fire',
  rime: 'elemental_chest_ice',
  stormglass: 'elemental_chest_electric',
  verdigris: 'elemental_chest_plant',
  voidfall: 'elemental_chest_dark',
  gilt: 'metal_chest_gold',
  bonefield: 'stone_chest',
  rustwork: 'metal_chest_iron',
  prismfold: 'chest_of_stars',
};

/**
 * A cult -> the chest its camp keeps. This is the user's "within astral spaces
 * and cult HQs utilize appropriately thematic chests", and the theming is read
 * off the cult's OWN essence rather than invented here: the Drowned Choir keep
 * essDeep/essWater/essTentacle, so they keep the sea chest; the Glad
 * Confession keep essSin/essMirror/essHunger, so they keep the mirror-bright
 * one. `chestFaults` asserts every cult in cultists.js has an entry.
 */
export const CHEST_BY_CULT = {
  bone: 'stone_chest',
  blood: 'elemental_chest_blood',
  undeath: 'elemental_chest_dark',
  ash: 'elemental_chest_fire',
  void: 'chest_of_stars',
  sin: 'elemental_chest_light',
  blight: 'elemental_chest_plant',
  storm: 'elemental_chest_electric',
  deep: 'pirate_teeasure_chest',
  gold: 'metal_chest_gold',
};

/**
 * A landmark's own fiction -> a chest, for the places no palette has taken.
 *
 * Gated by CHEST_SITE_FICTION_TIER, and that gate is the point rather than a
 * safety margin. Round 64's argument for gating blood and prismfold to region
 * 2 was that the early regions should read as ordinary and a strangeness
 * should be a discovery; a chest of pale fire in a starting-region shrine says
 * the same wrong thing a bloodstruck grove would. Below the gate only an
 * actual palette -- a place that visibly IS an element -- overrides the plain
 * ladder, which is what leaves the Nek wooden.
 */
export const CHEST_BY_SITE = {
  stoneCircle: 'elemental_chest_earth',
  riverMouth: 'pirate_teeasure_chest',
  hollowTree: 'elemental_chest_plant',
  battlefield: 'metal_chest_iron',
  shrine: 'elemental_chest_light',
  rainbowGrove: 'chest_of_stars',
  // farmFields is deliberately absent: a field is not an element, and a chest
  // in a barn should be the wooden one the region can afford.
  //
  // AND THE OTHER SIX SITE TYPES ARE DELIBERATELY ABSENT TOO. The first draft
  // listed all twelve -- crystalHollow, mineCave, magmaCave, barrow,
  // cultChamber, hiddenLair -- and every one of those six lines was
  // unreachable code wearing the shape of a decision: each of those types
  // DECLARES a palette (round 64: "a site type whose fiction IS an element
  // declares its palette outright"), and a palette beats a fiction two
  // branches up in `chestModelFor`. `chestFaults` now refuses to let one back
  // in, so this cannot quietly regrow.
};
export const CHEST_SITE_FICTION_TIER = 2;

/**
 * WHERE A CHEST STANDS, as odds per candidate. Four rules, ordered by how
 * plainly the user asked for each:
 *
 *  - a cult's hideout ALWAYS holds one ("found in cult hideouts"), and so does
 *    a cult's camp in an astral realm ("within astral spaces");
 *  - any other den, a third of the time -- a den is a hideout with a door, and
 *    a mine with nothing in it is a room the player cleared for nothing;
 *  - a landmark with no den, a fifth of the time, so a chest stays a thing you
 *    find rather than the furniture of every signpost;
 *  - a lone dwelling, an eighth of the time ("occasionally in lone
 *    dwellings") -- the word is the user's and the number is chosen to match
 *    it rather than to be generous.
 */
export const CHEST_CULT_CHANCE = 1.0;
export const CHEST_DEN_CHANCE = 0.34;
export const CHEST_SITE_CHANCE = 0.20;
export const CHEST_DWELLING_CHANCE = 0.125;

/** The two site types that are cult hideouts, named once so the scene and the
 *  suite cannot disagree about which they are. */
export const CULT_SITE_KEYS = ['cultChamber', 'hiddenLair'];

/**
 * Which chest stands here. Precedence, most specific first:
 *
 *   1. the cult that keeps it        (an astral camp)
 *   2. the element that took it      (a palette, declared or touched)
 *   3. the place's own fiction       (from region CHEST_SITE_FICTION_TIER up)
 *   4. what the region can afford    (the plain ladder)
 *
 * Never null: a chest with no model is a chest that does not draw, which is
 * the silent kind of failure this project keeps turning into a loud one.
 */
export function chestModelFor({ cult = null, palette = null, siteKey = null, regionIndex = 0 } = {}) {
  const idx = Math.max(0, Math.min(CHEST_PLAIN_LADDER.length - 1, regionIndex | 0));
  let key = null;
  if (cult && CHEST_BY_CULT[cult]) key = CHEST_BY_CULT[cult];
  else if (palette && CHEST_BY_PALETTE[palette]) key = CHEST_BY_PALETTE[palette];
  else if (siteKey && idx >= CHEST_SITE_FICTION_TIER && CHEST_BY_SITE[siteKey]) key = CHEST_BY_SITE[siteKey];
  else key = CHEST_PLAIN_LADDER[idx];
  return CHEST_BY_KEY[key] || CHEST_BY_KEY[CHEST_PLAIN_LADDER[0]];
}

/**
 * What this chest can hold, resolved against the live catalogues.
 *
 * Delegated to `sitePools` rather than reimplemented: that function already
 * strips the `stone`/`ess` namespace before matching (round 63 learned what
 * happens when it does not -- "a site whose theme mentioned rock matched all
 * 180 stones and became a universal dispenser wearing a themed label") and
 * already excludes `godOnly`. A plain chest has no theme and returns empty
 * pools on purpose; the scene reads that as "use the general drop table",
 * which is what a wooden box should do.
 */
export function chestPools(model, stoneCatalog, essenceCatalog, essences) {
  const theme = model && (model.theme || (model.palette ? PALETTE_THEME[model.palette] : null));
  if (!theme) return { stones: [], essences: [], themed: false };
  const p = sitePools({ theme }, stoneCatalog, essenceCatalog, essences);
  return { stones: p.stones, essences: p.essences, themed: true };
}

/**
 * ONE OPENING, ONE TABLE.
 *
 *   "Region appropriate loot should be within (i.e. gear, coins, awakening
 *    stones and rarely essences)."
 *
 * Four lines, in the user's own order, and the numbers are set AGAINST the
 * landmark's: a site offers a stone 22% of the time and an essence 7%, and
 * refreshes every fifteen minutes. A chest is opened once and never again, and
 * you had to get into a cult's hideout to do it, so it pays better per opening
 * and cannot be farmed at all. The essence line stays the rare one -- 12%
 * against the stone's 55% -- because "rarely" is the word the user used for it
 * and the ratio between the two is what carries that, not the absolute.
 *
 * `tier` is the region's rank band (0 normal .. 4 gold), the same number
 * COIN_RANK_BY_TIER indexes for a monster's coin.
 */
export const CHEST_GEAR_MIN = 1;
export const CHEST_GEAR_MAX = 2;
export const CHEST_STONE_CHANCE = 0.55;
export const CHEST_ESSENCE_CHANCE = 0.12;
export const CHEST_COIN_MIN = 14;
export const CHEST_COIN_MAX = 46;
/** A royal strongbox is the plain chest at the top of the ladder, so what
 *  makes it royal has to be the contents. One extra piece of gear and coin and
 *  a half, applied through the same table rather than a second one -- the
 *  argument `_dropHumanLoot` makes for a cult leader, and for the same reason:
 *  two tables for one event is two things to keep in step. */
export const CHEST_RICH_GEAR_BONUS = 1;
export const CHEST_RICH_COIN_MULT = 1.5;

export function chestPlan(model, tier = 0, rng = Math.random) {
  const rich = !!(model && model.rich);
  const t = Math.max(0, Math.min(4, tier | 0));
  const gear = CHEST_GEAR_MIN + Math.floor(rng() * (CHEST_GEAR_MAX - CHEST_GEAR_MIN + 1))
    + (rich ? CHEST_RICH_GEAR_BONUS : 0);
  const coin = Math.max(1, Math.round(
    (CHEST_COIN_MIN + rng() * (CHEST_COIN_MAX - CHEST_COIN_MIN))
    * (1 + t * 0.5) * (rich ? CHEST_RICH_COIN_MULT : 1)));
  return {
    gear,
    coin,
    stone: rng() < CHEST_STONE_CHANCE,
    essence: rng() < CHEST_ESSENCE_CHANCE,
  };
}

/**
 * A chest's identity in a save.
 *
 * The world is rebuilt from its seeds on every load, so an INDEX into a list
 * is not an identity -- add one site to a region and every chest after it
 * inherits somebody else's opened flag. A tile is. The failure mode of a key
 * that no longer matches (because a later round moved the thing) is that a
 * chest the player emptied is full again, which is a gift rather than a loss;
 * the failure mode of a stale index is the opposite, and silent.
 */
export function chestKeyAt(regionId, tx, ty) {
  return `${regionId || 'world'}:${tx | 0},${ty | 0}`;
}

/**
 * Every way this file can be quietly wrong, made loud. Run by the data lane.
 *
 * `sheetOrder` is the ORDER list from tools/extract_round141_chests.py, passed
 * in by the checker that reads the python rather than duplicated here -- the
 * whole point is to catch the two drifting apart.
 */
export function chestFaults(stoneCatalog, essenceCatalog, essences, cultSlugs = [], sheetOrder = null) {
  const out = [];
  CHEST_MODELS.forEach((m, i) => {
    if (m.idx !== i) out.push(`${m.key}: idx ${m.idx} at position ${i}`);
    if (!m.label) out.push(`${m.key}: no label`);
    if (!(m.foot > 0.5 && m.foot <= 1)) out.push(`${m.key}: foot ${m.foot} is not a plausible fraction`);
    if (m.palette && !PALETTE_THEME[m.palette]) out.push(`${m.key}: palette ${m.palette} has no theme`);
    if (m.palette && m.theme) out.push(`${m.key}: declares both a palette and a theme`);
  });
  const keys = new Set();
  for (const m of CHEST_MODELS) {
    if (keys.has(m.key)) out.push(`${m.key}: listed twice`);
    keys.add(m.key);
  }
  if (sheetOrder) {
    if (sheetOrder.length !== CHEST_MODELS.length) {
      out.push(`sheet has ${sheetOrder.length} cells, table has ${CHEST_MODELS.length}`);
    }
    sheetOrder.forEach((k, i) => {
      if (CHEST_MODELS[i] && CHEST_MODELS[i].key !== k) {
        out.push(`sheet cell ${i} is ${k}, table says ${CHEST_MODELS[i].key}`);
      }
    });
  }
  // Every table points at a chest that exists...
  for (const [p, k] of Object.entries(CHEST_BY_PALETTE)) {
    if (!PALETTE_THEME[p]) out.push(`CHEST_BY_PALETTE: ${p} is not a palette`);
    if (!CHEST_BY_KEY[k]) out.push(`CHEST_BY_PALETTE.${p}: no chest ${k}`);
  }
  for (const [c, k] of Object.entries(CHEST_BY_CULT)) {
    if (!CHEST_BY_KEY[k]) out.push(`CHEST_BY_CULT.${c}: no chest ${k}`);
  }
  for (const [s, k] of Object.entries(CHEST_BY_SITE)) {
    if (!CHEST_BY_KEY[k]) out.push(`CHEST_BY_SITE.${s}: no chest ${k}`);
    if (!SITE_TYPES[s]) out.push(`CHEST_BY_SITE.${s}: no such site type`);
    // A site that declares a palette never reaches the fiction branch of
    // `chestModelFor`, so a line for one here is a decision that can never be
    // taken -- fault class 1, and invisible without this.
    else if (SITE_TYPES[s].palette) {
      out.push(`CHEST_BY_SITE.${s}: unreachable, the site declares palette ${SITE_TYPES[s].palette}`);
    }
  }
  for (const k of CHEST_PLAIN_LADDER) {
    if (!CHEST_BY_KEY[k]) out.push(`CHEST_PLAIN_LADDER: no chest ${k}`);
  }
  // ...and every palette and every cult has one, or a place in the world wears
  // whatever the fallback is and the theming silently stops happening there.
  for (const p of Object.keys(PALETTE_THEME)) {
    if (!CHEST_BY_PALETTE[p]) out.push(`palette ${p} has no chest`);
  }
  for (const c of cultSlugs) {
    if (!CHEST_BY_CULT[c]) out.push(`cult ${c} has no chest`);
  }
  // A themed chest that resolves to nothing is a label over an empty pool --
  // the exact fault `siteThemeGaps` exists to catch for landmarks.
  for (const m of CHEST_MODELS) {
    const p = chestPools(m, stoneCatalog, essenceCatalog, essences);
    if (!p.themed) continue;
    if (!p.stones.length) out.push(`${m.key}: themed, but no stone matches it`);
    if (!p.essences.length) out.push(`${m.key}: themed, but no essence matches it`);
  }
  // And every model is reachable from at least one of the four tables, or it
  // is art nobody can ever see -- fault class 1, in a spritesheet.
  const reachable = new Set([
    ...Object.values(CHEST_BY_PALETTE),
    ...Object.values(CHEST_BY_CULT),
    ...Object.values(CHEST_BY_SITE),
    ...CHEST_PLAIN_LADDER,
  ]);
  for (const m of CHEST_MODELS) {
    if (!reachable.has(m.key)) out.push(`${m.key}: no table can ever choose it`);
  }
  return out;
}
