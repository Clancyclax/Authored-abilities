// Character-creator data + the skin-tone recolor pipeline, ported from
// sparkstone_prototype.html (BODY_TYPES/SKIN_TONES/HAIR_COLORS/EYE_COLORS
// lines ~8019-8106, the recolor math -- rgbToHsl/hslToRgb/hexToHSL/
// buildAppearanceCanvas -- lines ~8111-8180).
//
// SCOPE THIS ROUND, and why: the original creator has 5 rows (Body Type,
// Hairstyle, Skin Tone, Hair Color, Eye Color). Only 3 of those are ported
// here -- Body Type, Skin Tone, and (new, not in the original) a player
// Name field. Eye Color is deliberately left out entirely, not just
// hidden: the original's own comment on EYE_COLORS says exactly why --
// "at this sprite's pixel resolution (64x64 per frame), eye pixels aren't
// a cleanly separable region... faking a recolor here would either do
// nothing visible or bleed into the face outline" -- it was stored but
// never actually rendered even in the original. Hairstyle + Hair Color are
// deferred TOGETHER (not just Hairstyle) for the same "don't ship a
// control with no visible effect" reason that justifies cutting Eye
// Color: the original's Hair Color only does anything once a real
// hairstyle is drawn on top of the (bald-by-default) body, and porting the
// 9 real directional hairstyle atlases (8 facings each, plus the
// non-uniform HAIR_ATLAS_SCALE_X/Y squish-to-fit-this-head math) is a
// distinct, sizeable research+port task of its own -- see the task list.
// Shipping a Hair Color picker with nothing to color would repeat the
// exact mistake being fixed by cutting Eye Color, just for a different
// reason (missing art instead of missing pixels).
//
// Body Type: only m_muscular/f_muscular have real extracted atlases (the
// original's own `available:false` flags on every other entry are kept
// here verbatim -- this isn't a new restriction, it's the same one the
// original always had).

export const BODY_TYPES = [
  { id: 'm_average', label: 'Body Type 1 — Average', available: false },
  { id: 'm_skinny', label: 'Body Type 1 — Skinny', available: false },
  { id: 'm_muscular', label: 'Body Type 1 — Muscular', available: true, atlas: 'm_muscular' },
  { id: 'm_heavy', label: 'Body Type 1 — Heavy', available: false },
  { id: 'f_average', label: 'Body Type 2 — Average', available: false },
  { id: 'f_skinny', label: 'Body Type 2 — Skinny', available: false },
  { id: 'f_muscular', label: 'Body Type 2 — Muscular', available: true, atlas: 'f_muscular' },
  { id: 'f_heavy', label: 'Body Type 2 — Heavy', available: false },
];

// Fully functional (real per-pixel recolor, see buildAppearanceCanvas below).
//
// ROUND 115 -- THE NAMES ARE GONE.
//
//   "Skin color selection doesn't need names like (Olive, ebony) just #s to
//    avoid grading how dark skin is."
//
// The eight swatches are unchanged; what came out is the vocabulary on top of
// them. "Porcelain" and "Ebony" are not descriptions of a hex value, they are
// a register borrowed from cosmetics and antiques, and the register is the
// grading -- one end of that list is a fine dinner service and the other is a
// hardwood. A number says the same thing about the colour and nothing at all
// about the person.
//
// THE IDS ARE UNTOUCHED, deliberately. `player.appearance.skinTone` is saved
// as an id and read back on load, so renaming `olive` to `4` would put every
// existing character back to the default tone on their next load -- a
// cosmetic tidy that silently changes people's faces. The id is a storage key
// nobody sees; `label` is the only thing the creator prints, and it is the
// only thing that changed.
//
// `default` is the art's own tone rather than a ninth colour, so it keeps a
// word rather than taking the number 1 off the swatch that should have it.
export const SKIN_TONES = [
  { id: 'default', label: 'Default' },
  { id: 'porcelain', label: '1', hex: '#f2d3b8' },
  { id: 'fair', label: '2', hex: '#e8b48f' },
  { id: 'tan', label: '3', hex: '#c88f5e' },
  { id: 'olive', label: '4', hex: '#a97a4e' },
  { id: 'brown', label: '5', hex: '#8a5a35' },
  { id: 'deep', label: '6', hex: '#5c3a22' },
  { id: 'ebony', label: '7', hex: '#3a2515' },
];

export const DEFAULT_PLAYER_NAME = 'Nate';

// Steps `dir` (+1/-1) through `list` from `currentId`, skipping any entry
// with `available === false` (BODY_TYPES has several -- see above; every
// other list ported here has none, so this is a no-op skip for them).
// Ported from the original's cycleAppearance -- same "skip past unavailable
// neighbors rather than getting stuck refusing to move" behavior.
export function cycleAvailable(list, currentId, dir) {
  const idx = Math.max(0, list.findIndex(o => o.id === currentId));
  for (let step = 1; step <= list.length; step++) {
    const cand = list[(idx + dir * step + list.length) % list.length];
    if (cand.available !== false) return cand.id;
  }
  return currentId;
}

// --- Recolor math, ported 1:1 from the original (rgbToHsl/hslToRgb/
// hexToHSL/buildAppearanceCanvas) ---------------------------------------

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d > 0.0001) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  if (s <= 0.0001) { const v = Math.round(l * 255); return [v, v, v]; }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; } else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; } else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; } else { r1 = c; g1 = 0; b1 = x; }
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

export function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d > 0.0001) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hueDeltaDeg(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

// Reference samples pulled directly from the original's playerSheetImg
// south-idle frame (a mid-tone skin pixel) -- the anchor every recolor's
// hue-delta mask is measured against, ported verbatim. (The original also
// keys off a hair-reference pixel for Hair Color; not needed here since
// Hair Color isn't ported this round -- see this file's header comment.)
export const APPEARANCE_SKIN_KEY = rgbToHsl(200, 120, 75);
export const APPEARANCE_HUE_TOLERANCE = 26; // degrees
export const APPEARANCE_MIN_SAT = 0.12; // ignore near-gray pixels (outlines, metal, etc.)

// Recolors sourceImg's skin-toned pixels toward skinHex, preserving each
// pixel's original shading (lightness scaled relative to the reference
// key's own lightness, not flattened) so existing highlight/shadow work
// still reads correctly at the new color. Untouched pixels (clothing,
// outlines, metal) are copied as-is. Returns a plain untouched copy when
// skinHex is null/'default' (the common case). sourceImg can be an
// HTMLImageElement or an HTMLCanvasElement (Phaser textures expose their
// source images as one or the other depending on how they were loaded).
export function buildAppearanceCanvas(sourceImg, skinHex) {
  const w = sourceImg.width, h = sourceImg.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cctx = c.getContext('2d'); cctx.imageSmoothingEnabled = false;
  cctx.drawImage(sourceImg, 0, 0);
  if (!skinHex) return c;
  const skinTarget = hexToHSL(skinHex);
  const imgData = cctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const px = rgbToHsl(r, g, b);
    if (px.s < APPEARANCE_MIN_SAT) continue; // outlines/metal/etc. -- leave alone
    if (hueDeltaDeg(px.h, APPEARANCE_SKIN_KEY.h) > APPEARANCE_HUE_TOLERANCE) continue;
    const newL = Math.max(0, Math.min(1, px.l * (skinTarget.l / Math.max(0.05, APPEARANCE_SKIN_KEY.l))));
    const [nr, ng, nb] = hslToRgb(skinTarget.h, skinTarget.s, newL);
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  }
  cctx.putImageData(imgData, 0, 0);
  return c;
}
