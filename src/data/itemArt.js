import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { BANKS, BANK_COLS, BANK_VARIANTS, BANK_NEUTRAL, BANK_ELEMENTS } from './itemBanks.js';
// ROUND 7 -- restored item sprites (weapons/shields/armor) + the runtime
// palette-swap pipeline. Per the user's ask: "restore the item sprites for
// shields, weapons, and armor. Then do a palette swap for all of them to
// further create diversity... align weapons, armor and shields
// appropriately where it makes sense. i.e. a sword that does fire damage
// should use a red/orange sword. whereas a summoned scythe that does bleed
// damage might be a blood red scythe."
//
// Art provenance (all real prototype assets, restored by
// extract_round7_items.py):
//   public/assets/item_sword_bank.png -- 37 sword/dagger/scythe designs,
//     32px cells, 8 cols (prototype's swordBankAtlas, line ~7354)
//   public/assets/item_axe_bank.png -- 46 axe/hammer designs, same grid
//   public/assets/item_spear.png -- the neutral spear art
//   public/assets/gear_icons.png -- the 263-icon gear atlas, 64px cells,
//     12 cols, pools per gearIconManifest.js (chest/legs/gauntlets/
//     shield/helmet -- the prototype's GEAR_ICON_MANIFEST verbatim)
//
// Palette swaps happen HERE, at runtime, per cell, cached -- a luminance-
// colorize (keep the sprite's shading, replace its hue with the stone
// theme's color) rather than 12 pre-baked atlas copies on disk. Any icon
// can appear in any of the 12 awakening-stone theme colors plus neutral,
// which is where the diversity comes from: a conjured relic picks its
// DESIGN from the bank by its ability name's keywords (a "...Scythe" or
// reaper-named blade lands on the curved-scythe cell, a "...Dagger" on the
// knife, "...Hammer"/maul on the warhammer head) and its COLOR from the
// stone that generated it -- stoneBlood conjures blood-red steel,
// stoneFire red-orange, stoneIce pale blue, exactly the user's examples.
//
// This module is DOM-side (plain Image/canvas, no Phaser) since every
// surface that shows item art -- hotbar, shop, paperdoll, item table,
// ability roster -- is DOM UI.
import { GEAR_ICON_CELL, GEAR_ICON_ATLAS_COLS, GEAR_ICON_MANIFEST } from './gearIconManifest.js';
import { stableHash, CONFLUENCE_NAMES } from './awakening.js';
import { COIN_COLORS } from './inventory.js';
import { STONE_SPRITE_MAP } from './stoneSprites.js';

// ROUND 11 -- per-rank spirit-coin icons, drawn exactly the way the
// original prototype's drawCoinIcon did (line ~9217: rank-colored disc,
// dark rim, inner highlight ring), rendered once per rank+size into a
// cached canvas. No image dependency, so coin icons exist from the very
// first frame.
const coinCache = new Map();
export function coinIconUrl(rank, size = 16) {
  const key = `${rank}|${size}`;
  if (coinCache.has(key)) return coinCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2, r = size / 2 - 1.5;
  ctx.fillStyle = COIN_COLORS[rank] || '#fff';
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(c, c, Math.max(1, r - 3), 0, Math.PI * 2); ctx.stroke();
  const url = canvas.toDataURL();
  coinCache.set(key, url);
  return url;
}

export const WEAPON_BANK_CELL = 32;
export const WEAPON_BANK_COLS = 8;
export const SWORD_BANK_COUNT = 37;
export const AXE_BANK_COUNT = 46;

// --- image loading -------------------------------------------------------
const SOURCES = {
  sword: './public/assets/item_sword_bank.png',
  axe: './public/assets/item_axe_bank.png',
  spear: './public/assets/item_spear.png',
  gear: './public/assets/gear_icons.png',
  // ROUND 8 -- the original gem/stone sprite uploads, restored. All three
  // sheets serve as AWAKENING STONE art exclusively (per the round-8
  // directive; essences keep their colored-text identity). 32px cells:
  // stoneGems/essenceGems are 5 cols, extraGems is 10 cols x 61 sprites.
  stoneGems: './public/assets/stone_gems.png',
  essenceGems: './public/assets/essence_gems.png',
  extraGems: './public/assets/stone_extra.png',
  // ROUND 12 -- the user's new PixelLab batches. awakNew/stoneWeapon are
  // AWAKENING stone art; essenceCubes are ESSENCE stone art (per the
  // user's mid-round correction: "the larger cube models are to be used
  // as essence stones").
  awakNew: './public/assets/stone_awakening_new.png',      // 24px cells, 10 cols, 50
  stoneWeapon: './public/assets/stone_weapon_round.png',   // 40px cells, 8 cols, 25
  // ROUND 81 -- the user's new batch: "More awakening stone models (Not for
  // essences or confluence essences)". Thirteen mystical/portal and twelve
  // elemental, packed by tools/extract_round81_stones.py in that order, so
  // 0-12 are the mystical set and 13-24 the elemental one.
  //
  // 48px cells, deliberately not downscaled to match a neighbouring sheet:
  // the Reliquary draws a socket roundel at 34px and an essence halo at 52px,
  // and there is no reason to throw away detail the art arrived with.
  stonePixel25: './public/assets/stone_pixel25.png',       // 48px cells, 8 cols, 25
  essenceCubes: './public/assets/essence_cubes.png',       // 40px cells, 10 cols, 287 (250+ are round 190's glass and weapon cubes)
  // ROUND 28 -- the whip weapon bank. 56px cells, native size (see
  // extract_round28_whips.py for why it is not downscaled to the 32px
  // weapon-bank cell the sword/axe banks use).
  whip: './public/assets/item_whip_bank.png',              // 56px cells, 8 cols, 16
  // ROUND 29 replaced four slots' art; ROUND 35 replaced all four again and
  // added eight more banks. Both the paths and the cell geometry are now
  // generated from itemBanks.js rather than written out here -- see below.
};
// ROUND 35 -- twelve banks, registered from the GENERATED manifest.
//
// These were hand-written constants until this round, and the helmet bank is
// exactly why they cannot stay that way: the new source art is 56px where
// round 29's was 48px, and a hardcoded 48 would have sliced every helmet
// icon off-centre with nothing failing loudly. Geometry now comes from the
// extractor's own output, so a future drop that changes a cell size or a
// design count needs no edit here at all.
for (const [key, b] of Object.entries(BANKS)) {
  SOURCES[`${key}Bank`] = `./public/assets/item_${key}_bank.png`;
  void b;
}
// Cell geometry for the round-12 sheets (source -> {cell, cols}).
const SHEET_GRID = {
  awakNew: { cell: 24, cols: 10 },
  stoneWeapon: { cell: 40, cols: 8 },
  stonePixel25: { cell: 48, cols: 8 },
  essenceCubes: { cell: 40, cols: 10 },
  whip: { cell: 56, cols: 8 },
};
for (const [key, b] of Object.entries(BANKS)) {
  SHEET_GRID[`${key}Bank`] = { cell: b.cell, cols: BANK_COLS };
}
export const WHIP_BANK_COUNT = 16;
// Cells in one slot's bank: designs x variants. Per-bank now, because the
// design counts differ (helmets 12, daggers 15, everything else 16) -- the
// single SLOT_BANK_COUNT of round 29 would over-index two of the twelve and
// land on empty sheet.
export function bankCells(key) {
  const b = BANKS[key];
  return b ? b.designs * BANK_VARIANTS : 0;
}
const imgs = {};
let readyFlag = false;
const readyCbs = [];
export function loadItemArt() {
  let pending = Object.keys(SOURCES).length;
  for (const [key, src] of Object.entries(SOURCES)) {
    const im = new Image();
    im.onload = () => {
      imgs[key] = im;
      if (--pending === 0) {
        readyFlag = true;
        for (const cb of readyCbs) cb();
      }
    };
    im.onerror = () => { if (--pending === 0) { readyFlag = true; for (const cb of readyCbs) cb(); } };
    im.src = src;
  }
}
export function itemArtReady() { return readyFlag; }
export function onItemArtReady(cb) { if (readyFlag) cb(); else readyCbs.push(cb); }

// --- gear icon pools (indices into GEAR_ICON_MANIFEST, per slot) ---------
const GEAR_POOLS = {};
GEAR_ICON_MANIFEST.forEach((entry, i) => {
  (GEAR_POOLS[entry.slot] = GEAR_POOLS[entry.slot] || []).push(i);
});

// --- luminance colorize --------------------------------------------------
// Replaces a sprite's palette with the tint color scaled by each pixel's
// own luminance -- shading and silhouette survive, hue becomes the theme's.
// This is what lets one grey steel scythe serve as a blood-red, ice-blue,
// or fire-orange scythe without 12 atlas copies on disk.
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function colorizeInPlace(imageData, tintHex) {
  const [tr, tg, tb] = hexToRgb(tintHex);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    // 0.35 floor keeps dark outlines visible; 1.35 ceiling lets highlights
    // read brighter than the flat tint without clipping to white.
    const f = 0.35 + 1.0 * lum;
    d[i] = Math.min(255, tr * f);
    d[i + 1] = Math.min(255, tg * f);
    d[i + 2] = Math.min(255, tb * f);
  }
}

// --- cached per-cell canvases --------------------------------------------
const cellCache = new Map(); // key -> canvas

// ROUND 74 -- the drawn placeholder glyphs that stood here are GONE.
//
// They existed for exactly as long as the four new weapons had no art: round
// 74 added bows, crossbows, javelins and staves and there was no design for
// any of them in any of the sixteen banks, so rather than ship a bow with no
// icon (every UI that draws an owned weapon falls back to a blank square) the
// silhouettes were drawn from canvas paths, on the coin icon's precedent.
//
// The user then sent the art, it was packed into three new banks, and
// WEAPON_ICONS points at real cells. Keeping the drawing code "in case a
// future weapon needs it" is how a file grows a second, worse renderer that
// nothing calls and nobody maintains; when the next weapon arrives without
// art, this paragraph says what to do.

// source: 'sword' | 'axe' | 'spear' | 'gear'. idx: bank index (spear
// ignores it). tintHex: theme color or null for the original palette.
export function itemIconCanvas(source, idx, tintHex = null) {
  const key = `${source}|${idx}|${tintHex || 'base'}`;
  if (cellCache.has(key)) return cellCache.get(key);
  const im = imgs[source];
  if (!im) return null;
  let sx = 0, sy = 0, cell;
  if (source === 'gear') {
    const entry = GEAR_ICON_MANIFEST[idx];
    if (!entry) return null;
    cell = GEAR_ICON_CELL;
    sx = entry.col * cell; sy = entry.row * cell;
  } else if (source === 'spear') {
    // The spear art is a 4x4, 32px-cell directional atlas (throwing-spear
    // frames) -- idx picks a cell; WEAPON_ICONS uses the most solid frame.
    cell = 32;
    sx = (idx % 4) * cell;
    sy = Math.floor(idx / 4) * cell;
  } else if (source === 'stoneGems' || source === 'essenceGems') {
    cell = 32;
    sx = (idx % 5) * cell;
    sy = Math.floor(idx / 5) * cell;
  } else if (source === 'extraGems') {
    cell = 32;
    sx = (idx % 10) * cell;
    sy = Math.floor(idx / 10) * cell;
  } else if (SHEET_GRID[source]) {
    // ROUND 12 sheets -- their own cell size/column count.
    const g = SHEET_GRID[source];
    cell = g.cell;
    sx = (idx % g.cols) * cell;
    sy = Math.floor(idx / g.cols) * cell;
  } else {
    cell = WEAPON_BANK_CELL;
    sx = (idx % WEAPON_BANK_COLS) * cell;
    sy = Math.floor(idx / WEAPON_BANK_COLS) * cell;
  }
  const canvas = document.createElement('canvas');
  canvas.width = cell; canvas.height = Math.min(cell, im.height - sy);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  if (tintHex) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    colorizeInPlace(data, tintHex);
    ctx.putImageData(data, 0, 0);
  }
  cellCache.set(key, canvas);
  return canvas;
}
const urlCache = new Map();
export function itemIconUrl(source, idx, tintHex = null) {
  const key = `${source}|${idx}|${tintHex || 'base'}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const canvas = itemIconCanvas(source, idx, tintHex);
  if (!canvas) return null;
  const url = canvas.toDataURL();
  urlCache.set(key, url);
  return url;
}

// --- curated cells for the 5 shop weapons --------------------------------
// Indices eyeballed against the indexed contact sheets (see round-7 notes
// in MIGRATION_PLAN.md). The dagger ships blood-tinted by default -- its
// bleed DoT is its whole identity ("a summoned scythe that does bleed
// damage might be a blood red scythe" applies to the dagger the player can
// actually buy, too).
export const WEAPON_ICONS = {
  sword: { source: 'sword', idx: 2, tint: null },
  axe: { source: 'axe', idx: 0, tint: null },
  hammer: { source: 'axe', idx: 35, tint: null }, // the warhammer/maul head design
  spear: { source: 'spear', idx: 10, tint: null },
  dagger: { source: 'sword', idx: 35, tint: '#c62828' }, // bleed identity
  // ROUND 28. The scythe design was already in the sword bank at 26 -- it
  // is the cell pickWeaponDesign has always handed to reaper-named summoned
  // relics -- so the new player weapon reuses it rather than adding art
  // that would sit beside an identical sprite.
  scythe: { source: 'sword', idx: 26, tint: null },
  whip: { source: 'whip', idx: 0, tint: null },
  // ROUND 74 -- REAL ART. These four shipped earlier in the round on drawn
  // placeholder glyphs, because no bow, crossbow or staff design existed in
  // any bank; the user then sent the art and it was packed into three new
  // banks (extract_round74_ranged.py). The glyph path stays in this file as
  // the fallback for a weapon that has no bank yet, which is what it is for.
  //
  // The javelin is the exception and stays on the SPEAR bank, per the user's
  // 1.1.4: "Javelin can use the spear assets and should be considered a
  // subtype of spear." Index 10 is the same throwing-spear cell WEAPON_ICONS
  // has always given the spear -- a javelin IS that, thrown.
  javelin: { source: 'spearBank', idx: 10 * BANK_VARIANTS, tint: null },
  staff: { source: 'staffBank', idx: 0, tint: null },
  bow: { source: 'bowBank', idx: 0, tint: null },
  crossbow: { source: 'crossbowBank', idx: 0, tint: null },
};

// --- ROUND 8: awakening stone sprites -- thematic hand-picks -------------
// Each of the 12 stones maps to the sprite whose OWN colors and motif fit
// its name -- no recolor, per the directive. All picks are from the
// 61-sprite extra pool (the richest of the three restored sheets); the
// smaller stone/essence gem sheets remain available under sources
// 'stoneGems'/'essenceGems' for future stone types.
//   Fire      -> a black stone with live flame rising from it
//   Water     -> the water-droplet stone
//   Wind      -> the white-blue swirling-clouds orb
//   Earth     -> the cracked grey stone slab
//   Iron      -> the silver-framed forged square gem
//   Swift     -> the split winged crystal (speed-lines silhouette)
//   Ice       -> the pale ice-crystal spike cluster
//   Lightning -> the black stone crawling with electric arcs
//   Dark      -> the void-purple egg on black
//   Light     -> the radiant glowing white prism
//   Blood     -> the red blood-drop gem set in grey stone
//   Growth    -> the mossy cluster with living sprouts
export const STONE_SPRITES = {
  stoneFire: { source: 'extraGems', idx: 8 },
  stoneWater: { source: 'extraGems', idx: 52 },
  stoneWind: { source: 'extraGems', idx: 47 },
  stoneEarth: { source: 'extraGems', idx: 36 },
  stoneIron: { source: 'extraGems', idx: 40 },
  stoneSwift: { source: 'extraGems', idx: 59 },
  stoneIce: { source: 'extraGems', idx: 25 },
  stoneLightning: { source: 'extraGems', idx: 58 },
  stoneDark: { source: 'extraGems', idx: 22 },
  stoneLight: { source: 'extraGems', idx: 30 },
  stoneBlood: { source: 'extraGems', idx: 41 },
  stoneGrowth: { source: 'extraGems', idx: 44 },
};
// ROUND 12: every one of the 180 awakening stones now has its OWN sprite
// -- see src/data/stoneSprites.js (generated by
// extract_round12_stonemap.py): 163 stones on unique native-palette art
// drawn from the 5 available sheets, the 17 most-common tail reusing a
// family-appropriate sprite recolored to their catalog color so all 180
// still read distinctly. The round-8 hand-picks survive inside that map.
export function stoneIconUrl(stoneId) {
  const m = STONE_SPRITE_MAP[stoneId];
  if (m) return itemIconUrl(m.source, m.idx, m.tint || null);
  // Defensive fallback for an unknown id (shouldn't happen -- the map
  // covers the whole catalog).
  const s = STONE_SPRITES[stoneId];
  if (s) return itemIconUrl(s.source, s.idx, null);
  return itemIconUrl('extraGems', stableHash(stoneId + '|extragem') % 61, null);
}

// --- ROUND 12: essence stone art (the large cubes) -----------------------
// The 5 real essences get hand-picked cubes matching their element; the
// confluence essence -- whose name is one of 101 possibilities -- draws
// deterministically from the whole 111-cube pool, so a given confluence
// always shows the same cube. Cube atlas order is glowing batch (0-61)
// then clear elemental batch (62-110).
// Indices read off the PACKED atlas (see the round-12 note in
// extract_round12_stonemap.py about raw-order vs atlas-order).
// ROUND 14: Might upgraded to the heraldic gold lion from the new
// creature batch -- far more characteristic of the essence than the
// abstract red cube it replaces. The other four stay: their cubes are
// elementally exact and the new batch is creature-focused.
// ROUND 18 -- ESSENCE_CATALOG is now the single source of truth for which
// cube an essence draws. The five-entry pinned map that used to short-
// circuit this is gone: once round 18 let hand-picked concept overrides
// reassign essences (Dark moved off its old cube), a pin that outranked
// the catalog meant Dark rendered its OLD cube while the essence that
// inherited that index rendered the same picture. The catalog carries the
// legacy cubes itself, so nothing about the approved art changed.
// ROUND 82 (item 3) -- THE DESIGN TRIPLE, NOT JUST THE URL.
//
// `stoneIconUrl` and `essenceIconUrl` collapse to a data URL, which is right
// for the DOM and wrong for the world: drawing a dropped stone as a real
// Phaser texture needs `{source, idx, tint}` so it can go through
// `_iconTexture` -> `textures.addCanvas`, which is synchronous, cached, and
// what every other dynamic texture in the game uses. Exported here beside the
// URL helpers rather than having WorldScene reach into STONE_SPRITE_MAP and
// ESSENCE_CATALOG itself, so the two ways of asking for a stone's art stay in
// one file and cannot drift.
export function stoneIconDesign(stoneId) {
  const m = STONE_SPRITE_MAP[stoneId];
  if (m) return { source: m.source, idx: m.idx, tint: m.tint || null };
  const s = STONE_SPRITES[stoneId];
  if (s) return { source: s.source, idx: s.idx, tint: null };
  return { source: 'extraGems', idx: stableHash(stoneId + '|extragem') % 61, tint: null };
}
export function essenceIconDesign(essenceId) {
  const e = ESSENCE_CATALOG[essenceId];
  return e ? { source: 'essenceCubes', idx: e.cube, tint: e.tint || null } : null;
}

export function essenceIconUrl(essenceId) {
  const e = ESSENCE_CATALOG[essenceId];
  if (!e) return null;
  // A tinted essence shares a cube with another but is recoloured to its
  // own theme colour, so the two never read as the same sprite.
  return itemIconUrl('essenceCubes', e.cube, e.tint || null);
}

// ROUND 14 -- confluence essences are named after creatures in the lore,
// and the new batch is creature art, so each of these confluences now
// shows its ACTUAL creature rather than an abstract runic cube. Named
// cubes occupy 111-125, the further creature cubes 126-159.
export const CONFLUENCE_CUBES = {
  // exact matches from the explicitly-named batch
  Chimera: 112, Dragon: 113, Garuda: 115, Minotaur: 117, Phoenix: 118,
  Thunderbird: 120, Serpent: 119,
  // named batch, matched by creature kind
  Behemoth: 111,     // bear
  Juggernaut: 262,   // ROUND 190 (9.1) -- "juggernaut is not a gorilla": the charging bull cube
  Troll: 124,        // ape
  Wendigo: 122,      // yeti
  Predatory: 121,    // frost wolf
  Charlatan: 114,    // fire fox -- the trickster
  Manticore: 125,    // scorpion (the manticore's sting)
  Fertile: 123,      // amphibian -- spawning life
  // the further creature cubes (126-159)
  Succubus: 126,     // horned red demon
  Leviathan: 127,    // vast coiled sea-serpent
  Griffin: 128,      // eagle-winged griffin
  Gorgon: 142,       // medusa's snakes
  Kraken: 130,       // deep-sea kraken
  Ocean: 131,        // white water spirit
  Verdant: 132,      // antlered green wildwood
  Storm: 133,        // white lightning
  Karmic: 134,       // gold rune-circle
  Fey: 150,          // winged pixies
  Vision: 136,       // the great watching eye
  Omen: 137,         // black raven
  Twilight: 138,     // wolf under a full moon
  Doom: 139,         // three-headed hellhound
  Sovereign: 147,    // gold rune-and-shield
  Volcano: 145,      // molten lava beast
  Unity: 146,        // white unicorn under a rainbow
  Soaring: 152,      // pegasus
  Roc: 153,          // the great eagle
  Prosperity: 154,   // green clover
  Vortex: 156,       // ringed tentacles
  Mystic: 157,       // gem-crowned sphinx-cat
  Nemesis: 149,      // red lion-manticore
  Guardian: 140,     // stone sphinx-lion
  Anzu: 129,         // storm-bird
  Ziz: 143,          // titan bird
  Lotus: 148,        // verdant bloom
  Oasis: 155,        // still blue water
  Effigy: 135,       // the horned idol
  Onslaught: 144,    // charging ram
  Simulacrum: 141,   // twin lizards
  Transfiguration: 151, // shifting form
  Hydra: 158,        // the many-headed hydra itself
};
// Confluence icon: an exact creature match where one exists, otherwise a
// COLLISION-FREE deterministic pick from the remaining cubes -- built
// once over the whole 101-name list so no two confluences ever share a
// cube (a plain per-name hash collided about ten times across 101 names).
let _confluenceFallback = null;
function confluenceFallbackMap() {
  if (_confluenceFallback) return _confluenceFallback;
  // ROUND 18 -- these five indices are the cubes the original five
  // essences held when this allocator first ran. They are FROZEN here on
  // purpose: the allocation below is order-dependent, so changing the
  // reserved set reshuffles every confluence that isn't an exact match --
  // and the user has already reviewed and approved that mapping. This is a
  // historical reservation, not a live lookup of where those essences
  // point today (round 18's overrides moved Dark off 89).
  const LEGACY_ESSENCE_RESERVED = [68, 159, 87, 89, 101];
  // ROUND 190 -- Juggernaut left 116 (the gorilla) for the new bull cube.
  // 116 stays reserved so no other confluence's approved cube reshuffles.
  const reserved = new Set([...LEGACY_ESSENCE_RESERVED, 116, ...Object.values(CONFLUENCE_CUBES)]);
  const pool = Array.from({ length: 160 }, (_, i) => i).filter(i => !reserved.has(i));
  const taken = new Set();
  const map = {};
  // Stable order so the assignment never shifts between runs.
  for (const name of CONFLUENCE_NAMES.slice().sort()) {
    if (CONFLUENCE_CUBES[name] !== undefined) continue;
    const start = stableHash(name + '|confluencecube') % pool.length;
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(start + k) % pool.length];
      if (!taken.has(cand)) { taken.add(cand); map[name] = cand; break; }
    }
  }
  _confluenceFallback = map;
  return map;
}
export function confluenceIconUrl(confluenceName) {
  if (!confluenceName) return null;
  const exact = CONFLUENCE_CUBES[confluenceName];
  if (exact !== undefined) return itemIconUrl('essenceCubes', exact, null);
  const idx = confluenceFallbackMap()[confluenceName];
  if (idx === undefined) return itemIconUrl('essenceCubes', stableHash(confluenceName) % 160, null);
  return itemIconUrl('essenceCubes', idx, null);
}

// --- keyword-driven design picks for conjured relics ---------------------
// The ability NAME chooses the design ("...Scythe" gets the curved blade,
// "...Hammer" the maul); the STONE that generated it chooses the color
// (via awakening.js's STONE_THEMES -- passed in as tintHex by the caller).
const SWORD_POOL = [0, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 15, 17, 18, 22, 24, 25, 28, 30, 31, 36];
const AXE_POOL = [0, 1, 2, 3, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 20, 23, 24, 25, 28, 30, 31, 33, 34, 37, 40, 41, 43, 45];
export function pickWeaponDesign(name, seedStr = '') {
  const n = name.toLowerCase();
  const h = stableHash(name + '|' + seedStr);
  if (/scythe|sickle|reap/.test(n)) return { source: 'sword', idx: 26 };
  // ROUND 41 -- the whip bank exists (round 28); relics named for chains,
  // lashes and coils were falling through to the sword pool.
  if (/whip|lash|chain|coil|flail|tendril/.test(n)) return { source: 'whip', idx: 0 };
  if (/dagger|knife|shiv|fang/.test(n)) return { source: 'sword', idx: [34, 35][h % 2] };
  if (/rapier|needle|thorn/.test(n)) return { source: 'sword', idx: [4, 23][h % 2] };
  if (/sabre|saber|katana|crescent/.test(n)) return { source: 'sword', idx: [21, 22, 29][h % 3] };
  if (/hammer|maul|mace|club|fist/.test(n)) return { source: 'axe', idx: [35, 39][h % 2] };
  if (/axe|cleave|hatchet/.test(n)) return { source: 'axe', idx: AXE_POOL[h % AXE_POOL.length] };
  if (/spear|lance|pike|staff|sceptre|scepter|rod|polearm|trident/.test(n)) return { source: 'spear', idx: 10 };
  return { source: 'sword', idx: SWORD_POOL[h % SWORD_POOL.length] };
}
// Shield-flavored names get real shield art; everything else armor-shaped
// gets a chestpiece.
export function pickArmorDesign(name, seedStr = '') {
  const n = name.toLowerCase();
  const h = stableHash(name + '|' + seedStr);
  const pool = /shield|barrier|bulwark|aegis|ward|guard|bastion|rampart/.test(n) ? GEAR_POOLS.shield : GEAR_POOLS.chest;
  return { source: 'gear', idx: pool[h % pool.length] };
}
// ROUND 10: direct slot -> icon pool pick for dropped gear items (the
// paperdoll/table know the item's slot outright -- no keyword guessing).
// Rings use the restored round essence-gem sheet (13 gems); helmet/gloves
// use their gear-atlas pools; belt/boots draw from the legs pool.
// ROUND 29 -- three of these slots now have dedicated art. Rings were
// drawing ESSENCE GEM CUBES, belts were drawing greaves out of the legs
// pool, and helmets shared the atlas's smallest pool (15 cells against 79
// for legs), so every third helmet repeated. Each now indexes its own
// 80-cell bank -- 16 designs x 5 palette variants.
//
// Boots still come from the legs pool, which is correct: that pool is
// greaves and footwear, and boots are the slot it was always right for.
// ROUND 31 -- `amulet` is a real gear slot now, so it indexes the necklace
// bank directly instead of being reached only through a relic's name.
// ROUND 35 -- one cell out of a generated bank.
//
// Layout, from extract_round35_gear.py: cells are written design-major, and
// because there are exactly BANK_VARIANTS (10) of them and the sheet is
// BANK_COLS (10) wide, one design is exactly one ROW. So the index is
// design * VARIANTS + variant, and a bank can be read by eye: row = design,
// column = variant.
//
// The variant is the elemental cue. An item carrying a resist_* buff shows
// its element's colour; one without picks among the neutral jitters by a
// SEPARATE hash, so an item's design and its tint are independent -- seeding
// both off one hash would tie design 3 to jitter 3 forever and throw away
// three quarters of the combinations.
// Integer finalizer (the murmur3-style avalanche). Needed because stableHash
// is a POLYNOMIAL hash, h = h*31 + c, and that makes "hash a different
// prefix" useless as a way to get a second independent value:
//
//   hash(P + s) = hash(P) * 31^len(s) + hash(s)
//
// so for any fixed-length seed, hash('variant|' + k + s) and hash(k + s) are
// the same linear function of hash(s) differing by a constant. Their low bits
// therefore move together, and since BANK_NEUTRAL (4) divides the design
// counts, the variant came out almost entirely determined by the design --
// measured, 4 neutral variants collapsed to 2 and the banks delivered 32
// distinct icons where they should give 64. Mixing decorrelates them.
function mix32(x) {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export function bankIndex(key, seedStr = '', element = null) {
  const b = BANKS[key];
  if (!b) return null;
  const h = stableHash(key + '|' + seedStr);
  const design = h % b.designs;
  const ei = element ? BANK_ELEMENTS.indexOf(element) : -1;
  const variant = ei >= 0 ? BANK_NEUTRAL + ei : mix32(h) % BANK_NEUTRAL;
  return { source: `${key}Bank`, idx: design * BANK_VARIANTS + variant };
}
export function pickSlotDesign(slot, seedStr = '', element = null) {
  const hit = bankIndex(slot, seedStr, element);
  if (hit) return hit;
  // Shield is the only gear slot with no bank of its own -- the drop had no
  // shield art -- so it still draws from the round-27 gear-atlas pool.
  const h = stableHash(slot + '|' + seedStr);
  const pool = GEAR_POOLS.shield;
  return { source: 'gear', idx: pool[h % pool.length] };
}

// Art for a summoned GEAR relic. Both of its callers render into the
// paperdoll's AMULET cell (the ability roster icon and the cell itself), so
// ROUND 29 makes an amulet the default rather than the gauntlets pool it
// used to fall through to -- which is why necklaces were showing up as
// gloves. Name keywords still win where the generated name is explicit
// about what it conjures, the same way pickWeaponDesign has always read
// "...Scythe" off an ability name.
export function pickGearDesign(name, seedStr = '', element = null) {
  const n = name.toLowerCase();
  const seed = name + '|' + seedStr;
  // ROUND 35 -- every branch below now reaches a real bank. Gauntlets and
  // footwear used to fall through to the shared gear atlas because they had
  // no art of their own; both have 16 designs now. The leg words are split
  // OFF the boot words too -- "trouser"/"legging" go to the new legs bank,
  // while "boot"/"greave" stay with footwear, which the single round-29
  // branch could not distinguish.
  if (/amulet|necklace|pendant|torc|charm|talisman|medallion/.test(n)) return bankIndex('amulet', seed, element);
  if (/ring|signet|band/.test(n)) return bankIndex('ring', seed, element);
  if (/helm|hood|crown|hat|circlet/.test(n)) return bankIndex('helmet', seed, element);
  if (/belt|girdle|sash|cincture/.test(n)) return bankIndex('belt', seed, element);
  if (/cuirass|hauberk|breastplate|chest|jerkin|vest/.test(n)) return bankIndex('chest', seed, element);
  if (/gauntlet|glove|grip/.test(n)) return bankIndex('gloves', seed, element);
  if (/legging|trouser|breeches|chausses|pants/.test(n)) return bankIndex('legs', seed, element);
  if (/boot|greave|tread|stride|step/.test(n)) return bankIndex('boots', seed, element);
  return bankIndex('amulet', seed, element);
}
