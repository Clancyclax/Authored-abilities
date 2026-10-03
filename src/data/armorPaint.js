// ROUND 32 -- painting equipped-item colours onto the armored player sheets.
//
// Two rules, straight from the user's correction mid-round:
//   1. colour comes from the ITEM'S OWN SPRITE (the dominant colour of its
//      icon art), never from rarity;
//   2. each piece paints ITS OWN region -- "a mostly red helmet sprite and a
//      green chest sprite should result in ... a red painted helmet and
//      green painted chest."
//
// The art carries no region masks, so regions are POSITIONAL: the generator
// centres the same 64px character in every cell (measured, see
// extract_round32_armored.py), which makes body bands stable in cell space.
// Measured off the chest idle: head y 0-15 within +/-8px of centre, torso
// 15-38 within +/-9, hands 22-44 at 9-19px off-centre, belt 38-44, legs and
// feet 44-63 across the wide stance. Grey pixels are assigned to
// helmet/chest/gloves/belt/boots by those bands; brown wood-and-leather
// pixels still split left/right for the two held weapons.
//
// Honest limits: a blade swung across the torso mid-attack briefly takes
// that band's colour, and outlying grey steel (extended weapons, shields)
// is deliberately left unpainted rather than mis-painted. This is the
// "visual cues without mapping hundreds of sprites" trade the user asked
// for, sharpened to per-piece regions.

// --- dominant colour of an item icon --------------------------------------
// Median hue/sat of the saturated pixels. Returns null when the icon is
// essentially grey (a steel sword stays steel -- painting it grey-on-grey
// would be noise), which makes "no cue" the default for neutral items.
export function dominantColor(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const hs = [], ss = [], vs = [];
  let opaque = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    opaque++;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const s = max > 0 ? (max - min) / max : 0;
    if (s < 0.3 || max < 0.2) continue;
    let h;
    if (max === min) h = 0;
    else if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    hs.push(((h * 60) + 360) % 360); ss.push(s); vs.push(max);
  }
  if (!opaque || hs.length / opaque < 0.12) return null;
  hs.sort((a, b) => a - b); ss.sort((a, b) => a - b);
  const h = hs[hs.length >> 1], s = Math.min(0.85, ss[ss.length >> 1]);
  // A mid-value anchor; per-pixel luminance does the shading.
  return hsvToRgb(h / 360, s, 0.85);
}

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// --- the paint pass -------------------------------------------------------
// source: HTMLImageElement or canvas of a packed sheet. cell: the sheet's
// cell size (92 for anims, 64 for idles). colors: { helmet, chest, gloves,
// belt, boots, right, left } -- each {r,g,b} or null.
//
// Region bands are defined in 64px character space and shifted by the
// cell's centring margin ((cell-64)/2), so the same numbers serve both
// cell sizes.
// ROUND 35 -- `legs` is a real slot, so the lower body is split in two.
// Until this round `boots` owned y44-66, which is everything below the
// belt: thigh, shin and foot. Adding trousers without carving that up
// would have had two pieces claiming the same pixels, with whichever the
// if-chain below tested first silently winning -- so a green trouser and a
// red boot would both have come out green.
//
// The split at y52 is MEASURED off the chest idle's south frame, not chosen.
// Scanning opaque width per row down the legs: the two legs separate at y41,
// run 14-16px wide through the thigh to y52, narrow to their thinnest at y55
// (8px -- the ankle), then widen again to y63 as the feet splay into the
// wide stance. So shin is y50-55 and foot is y56-63. A first cut put the
// split at y57, which gave boots the foot only and handed the shin to the
// trousers -- wrong for this art, where the boots are calf-height with shin
// guards. y52 gives boots the shin and foot together.
const BANDS_64 = {
  helmet: { y0: 0, y1: 15, dx: 8 },
  chest: { y0: 15, y1: 38, dx: 9 },
  gloves: { y0: 22, y1: 44, dx0: 9, dx1: 19 },
  belt: { y0: 38, y1: 44, dx: 8 },
  legs: { y0: 44, y1: 52, dx: 19 },
  boots: { y0: 52, y1: 66, dx: 19 },
};

// ROUND 33 -- maskSource (optional): the combo's idle-diff mask sheet. Where
// present, red-channel pixels ARE the right-hand item and blue-channel the
// left -- painted exactly with that item's colour, no class guessing. The
// bands below then only handle what the mask does not claim.
// ROUND 269 -- `foot` is where a sheet's feet stand in its cell, for a sheet
// not cut on the old grids (see wideArmoredSheets.js). The bands are measured
// in 64-space with the feet at (32, 61); a 152 cell centres nothing, so the
// offset is taken from the foot instead of from the margin.
export function paintSheet(source, cell, colors, maskSource = null, foot = null) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  const any = colors && Object.values(colors).some(Boolean);
  if (!any) return canvas;
  let maskData = null;
  if (maskSource) {
    const mc = document.createElement('canvas');
    mc.width = source.width; mc.height = source.height;
    const mx = mc.getContext('2d');
    mx.imageSmoothingEnabled = false;
    mx.drawImage(maskSource, 0, 0);
    maskData = mx.getImageData(0, 0, mc.width, mc.height).data;
  }

  const off = (cell - 64) / 2;   // centring margin: 0 for idle, 14 for anims
  const offX = foot ? foot.x - 32 : off;
  const offY = foot ? foot.y - 61 : off;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const W = canvas.width;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;
    let h = 0;
    if (max !== min) {
      if (max === r) h = (((g - b) / (max - min)) % 6) * 60;
      else if (max === g) h = ((b - r) / (max - min) + 2) * 60;
      else h = ((r - g) / (max - min) + 4) * 60;
      h = (h + 360) % 360;
    }
    const px = (i / 4) % W, py = Math.floor(i / 4 / W);
    const cx = px % cell, cy = py % cell;          // position inside the cell
    const bx = cx - offX - 32, by = cy - offY;     // 64-space: bx from centre, by from top
    let tint = null;
    if (maskData && maskData[i + 3] > 128) {
      // exact item pixel, straight from the diff mask
      tint = maskData[i] > 128 ? colors.right : (maskData[i + 2] > 128 ? colors.left : null);
      if (!tint) continue;
    } else if (sat < 0.16 && max > 0.24 && max < 0.98) {
      // grey steel -> the armour piece whose band this pixel sits in
      const adx = Math.abs(bx + 0.5);
      const gl = BANDS_64.gloves;
      if (colors.gloves && by >= gl.y0 && by < gl.y1 && adx >= gl.dx0 && adx <= gl.dx1) {
        tint = colors.gloves;
      } else if (colors.helmet && by >= BANDS_64.helmet.y0 && by < BANDS_64.helmet.y1 && adx <= BANDS_64.helmet.dx) {
        tint = colors.helmet;
      } else if (colors.chest && by >= BANDS_64.chest.y0 && by < BANDS_64.chest.y1 && adx <= BANDS_64.chest.dx) {
        tint = colors.chest;
      } else if (colors.belt && by >= BANDS_64.belt.y0 && by < BANDS_64.belt.y1 && adx <= BANDS_64.belt.dx) {
        tint = colors.belt;
      } else if (colors.legs && by >= BANDS_64.legs.y0 && by < BANDS_64.legs.y1 && adx <= BANDS_64.legs.dx) {
        tint = colors.legs;
      } else if (colors.boots && by >= BANDS_64.boots.y0 && by < BANDS_64.boots.y1 && adx <= BANDS_64.boots.dx) {
        tint = colors.boots;
      }
    } else if (sat >= 0.2 && h >= 8 && h <= 52 && max > 0.15) {
      // wood/leather -- weapon hafts and lashes, split by cell side
      tint = cx < offX + 32 ? colors.right : colors.left;
    }
    if (!tint) continue;
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    const f = 0.25 + 0.9 * lum;
    d[i] = Math.min(255, tint.r * f);
    d[i + 1] = Math.min(255, tint.g * f);
    d[i + 2] = Math.min(255, tint.b * f);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ROUND 33 -- repaint an entire cutout sheet (every pixel IS the item) with
// one colour, luminance preserved. Null colour returns the source unchanged
// on a canvas so callers can composite uniformly.
export function paintCutout(source, color) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  if (!color) return canvas;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    const f = 0.25 + 0.9 * lum;
    d[i] = Math.min(255, color.r * f);
    d[i + 1] = Math.min(255, color.g * f);
    d[i + 2] = Math.min(255, color.b * f);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Stable signature for caching painted textures.
export function colorSig(colors) {
  const k = (c) => (c ? `${c.r}.${c.g}.${c.b}` : '-');
  const c = colors || {};
  // legs is part of the signature -- omitting it would let a trouser swap
  // hit a cached texture painted for the previous pair.
  return [c.helmet, c.chest, c.gloves, c.belt, c.legs, c.boots, c.right, c.left].map(k).join('|');
}
