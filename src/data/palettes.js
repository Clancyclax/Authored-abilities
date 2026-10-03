// ============================================================================
// ROUND 64 -- HARD PALETTE SWAPS.
//
// The user: "Do a HARD set of palette swaps for the trees and rocks to be used
// in a subset of the landmarks, these can end up in preposterous colors that
// can be used for caves, groves, or pocket dimensions very inclined to a single
// element (i.e deep blood red trees and stones in a blood cult hideout that is
// hidden inside what from the outside looks like a normal barn)".
//
// HARD is the operative word, and it is why this is not `setTint`.
//
// Phaser's tint is a MULTIPLY. Multiplying a green canopy by red gives you
// (r*1, g*0, b*0) -- the canopy's green channel, which is where all of a
// tree's detail lives, is thrown away, and what is left is a dark red
// silhouette with the leaf shapes gone. Round 63's rainbow grove got away with
// it because those tints are pale and near-white, so the multiply barely moves
// anything. A deep blood red cannot be reached that way at all: multiply can
// only ever darken, so there is no tint whatsoever that turns a dark trunk into
// a bright crimson one.
//
// So this remaps PIXELS. Every pixel's luminance is measured and used to look
// up a colour on an authored ramp, which means the art's own light and shade
// survive the swap intact -- the tree is still lit from the same side, the
// rock still has its crevices -- while the hue is replaced outright. That is a
// palette swap in the sense the phrase originally meant.
//
// THE RAMPS ARE MONOTONIC IN LUMINANCE, and `rampFaults` below asserts it.
// A ramp that dips -- a mid stop darker than the one before it -- inverts part
// of the art's shading and reads as damage rather than as colour. It is the one
// authoring mistake that looks like a rendering bug, so it is checked in data
// rather than left to be noticed in a screenshot.
//
// TWO RAMPS PER PALETTE -- ONE PER SHEET, NOT PER PIXEL.
//
// The first design split each tree's own pixels into canopy and bark and gave
// them different ramps. It does not survive contact with the art. Testing for
// green measured 0% foliage on every maple in the game, because the pack's
// maples are AUTUMN maples (mean canopy 170,57,9) -- hue is the wrong axis,
// since a red maple leaf and a brown trunk sit in the same band. Saturation
// looked better and is not much better: measured across the species, maple7's
// trunk is as saturated as its crown (0.93 vs 0.95) and redwood's is MORE
// saturated than its canopy (0.58 vs 0.37), so the rule would paint those
// trunks as foliage. There is no per-pixel signal in this art that reliably
// tells wood from leaf, and a split that is wrong for two species in ten is
// worse than no split: it speckles the crown or colours the trunk wrongly.
//
// So the split is by MATERIAL, which is known for free at the call site: the
// caller knows whether it is remapping a tree sheet or the rock sheet. `main`
// takes trees, `stone` takes rocks -- a little darker and less chromatic, so a
// bloodstruck grove's boulders are a deeper red than its trees rather than the
// identical red. Within a sheet the ramp is single, and that is correct for
// what was asked: "very inclined to a single element" is one hue family with
// the art's own light and shade still in it.
// ============================================================================

/**
 * adj -- the word a place wears when this palette has taken it, so a recoloured
 *        landmark can announce itself ("The Bloodstruck Hollow") instead of
 *        being a red grove still calling itself The Hollow.
 * blurb -- what a player actually sees, stated plainly.
 * element -- which of the game's elements this leans to. Used to choose what a
 *        touched site holds and what dens in it may spawn.
 */
export const PALETTES = {
  blood: {
    key: 'blood', adj: 'Bloodstruck', name: 'Bloodstruck', element: 'shadow',
    blurb: 'Bark and stone alike have gone the colour of old arterial blood.',
    main: [0x14040a, 0x3d0510, 0x6e0c18, 0xa31220, 0xd4302f, 0xf07a5c],
    stone: [0x0b0206, 0x28040c, 0x4c0a14, 0x71161c, 0x9a3028, 0xc86a4e],
  },
  ember: {
    key: 'ember', adj: 'Emberburnt', name: 'Emberburnt', element: 'fire',
    blurb: 'Everything is charcoal at the root and glowing orange at the tip.',
    main: [0x0a0503, 0x35150a, 0x7a2d08, 0xc55a09, 0xf29b1e, 0xffe58a],
    stone: [0x050302, 0x1c0d07, 0x3d1b09, 0x5f2c0c, 0x854512, 0xb0712c],
  },
  rime: {
    key: 'rime', adj: 'Rimebound', name: 'Rimebound', element: 'frost',
    blurb: 'Glazed pale blue from the ground up, and it does not melt.',
    main: [0x061019, 0x123448, 0x256b8c, 0x4aa3c4, 0x91d4e8, 0xe8fbff],
    stone: [0x04080f, 0x0d1e2c, 0x1a3c4e, 0x2e5c6e, 0x4d8092, 0x7fadb8],
  },
  stormglass: {
    key: 'stormglass', adj: 'Stormglass', name: 'Stormglass', element: 'lightning',
    blurb: 'Struck so often the wood has gone violet and glassy.',
    main: [0x0a0616, 0x231344, 0x452a86, 0x6f52c8, 0xa895f0, 0xeae4ff],
    stone: [0x060410, 0x150c2a, 0x2a1c50, 0x413172, 0x5f4d95, 0x8578b4],
  },
  verdigris: {
    key: 'verdigris', adj: 'Verdigris', name: 'Verdigris', element: 'nature',
    // A GREEN PALETTE IS THE ONE THAT CANNOT WORK, and it took a screenshot to
    // see it. The first draft was an acid chartreuse -- brighter and yellower
    // than any real canopy, and measurably 53 away from the ordinary tree mean,
    // which is further than `bonefield` manages at 9. In the game it vanished:
    // a verdigris hollow in The Nek read as "some slightly lighter willows",
    // because the world is already made of green and the eye has nothing to
    // catch on. Bonefield's grey trees, on almost no measured distance at all,
    // leap out of the same frame.
    //
    // So verdigris went to what the word actually means: copper patina. Teal
    // leaf over bronze stone -- green in family, and not a green anything grows.
    blurb: 'Copper-patina teal on every leaf, over stone gone bare bronze.',
    main: [0x02120c, 0x074038, 0x0b7a66, 0x11b894, 0x35e8bc, 0x9cffe4],
    stone: [0x120c04, 0x33240e, 0x57401c, 0x7c5f2c, 0x9d8547, 0xc2b078],
  },
  voidfall: {
    key: 'voidfall', adj: 'Voidfallen', name: 'Voidfall', element: 'shadow',
    blurb: 'Near-black with a violet edge, as though lit from somewhere else.',
    main: [0x030208, 0x0b0718, 0x1a1030, 0x2e2050, 0x5c4a90, 0x9c8ad0],
    stone: [0x020106, 0x090614, 0x160f28, 0x281e42, 0x453868, 0x8272b4],
  },
  gilt: {
    key: 'gilt', adj: 'Gilded', name: 'Gilt', element: 'radiant',
    blurb: 'Leaf and stone both carrying a hard gold nobody put there.',
    main: [0x120d02, 0x3a2f06, 0x70600f, 0xaf9a1c, 0xe0cf58, 0xfffbcc],
    stone: [0x0c0902, 0x261f05, 0x453a0b, 0x655815, 0x877a2c, 0xaba05c],
  },
  bonefield: {
    key: 'bonefield', adj: 'Bleached', name: 'Bonefield', element: 'shadow',
    blurb: 'Bled of colour entirely -- ivory, ash, and nothing living.',
    main: [0x14140f, 0x35352a, 0x62614f, 0x928f78, 0xc2bfa5, 0xf2f0dc],
    stone: [0x0d0d09, 0x24241c, 0x424036, 0x615e4d, 0x827e69, 0xa8a48c],
  },
  rustwork: {
    key: 'rustwork', adj: 'Rustbitten', name: 'Rustwork', element: 'physical',
    blurb: 'Iron in the ground has come up through everything that grows.',
    main: [0x0f0704, 0x2e1a10, 0x54301c, 0x784629, 0x9a6440, 0xc09070],
    stone: [0x0a0503, 0x22140c, 0x3c2718, 0x573a25, 0x745538, 0x94795c],
  },
  prismfold: {
    key: 'prismfold', adj: 'Folded', name: 'Prismfold', element: 'lightning',
    blurb: 'Magenta growth over cyan stone. None of it is a colour that grows.',
    main: [0x140420, 0x3d0a52, 0x76178f, 0xb32ec0, 0xe063e0, 0xffcbff],
    stone: [0x04101a, 0x0a2c48, 0x134f78, 0x2178a4, 0x46a8c8, 0x8fd8e8],
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES);

/** Rec.709 luminance, the same weighting the remap uses. */
export function lumaOf(rgb) {
  return 0.2126 * ((rgb >> 16) & 255) + 0.7152 * ((rgb >> 8) & 255) + 0.0722 * (rgb & 255);
}

/**
 * Every authoring rule a ramp has to obey, returned as a list of faults so the
 * suite can print which palette broke which rule rather than just failing.
 *
 * - MONOTONIC: see the header. A dip inverts the art's shading.
 * - RANGE: a ramp whose stops all sit in a narrow luminance band flattens the
 *   sprite into a silhouette. The art's own contrast has to survive.
 * - LENGTH: the LUT interpolates between stops; two stops is a gradient, not a
 *   palette, and gives no control over the midtones where most pixels live.
 */
export function rampFaults() {
  const bad = [];
  for (const key of PALETTE_KEYS) {
    const p = PALETTES[key];
    for (const which of ['main', 'stone']) {
      const stops = p[which];
      if (!stops || stops.length < 4) { bad.push(`${key}.${which}:too-few-stops`); continue; }
      let prev = -1;
      for (const s of stops) {
        const L = lumaOf(s);
        if (L <= prev) { bad.push(`${key}.${which}:not-monotonic`); break; }
        prev = L;
      }
      // The source art uses close to the full 0-255 range, so a ramp spanning
      // S levels compresses its contrast to S/255. Under about 40% the sprite
      // stops reading as a lit object and starts reading as a silhouette --
      // which is exactly the failure mode `setTint` has and this exists to
      // avoid. 100 is that line.
      const span = lumaOf(stops[stops.length - 1]) - lumaOf(stops[0]);
      if (span < 100) bad.push(`${key}.${which}:flat(${Math.round(span)})`);
    }
  }
  return bad;
}

const LUT_CACHE = new Map();

/** 256 -> rgb, interpolated across the ramp's stops. Flat Uint8Array of 768. */
export function rampLut(stops) {
  const lut = new Uint8Array(768);
  const n = stops.length - 1;
  for (let L = 0; L < 256; L++) {
    const t = (L / 255) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    const a = stops[i], b = stops[i + 1];
    lut[L * 3] = Math.round(((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * f));
    lut[L * 3 + 1] = Math.round(((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * f));
    lut[L * 3 + 2] = Math.round((a & 255) + (((b & 255) - (a & 255)) * f));
  }
  return lut;
}

/** material: 'main' (trees, and anything else growing) or 'stone' (rock). */
export function paletteLut(key, material) {
  const ck = `${key}|${material}`;
  if (LUT_CACHE.has(ck)) return LUT_CACHE.get(ck);
  const p = PALETTES[key];
  if (!p) return null;
  const lut = rampLut(material === 'stone' ? (p.stone || p.main) : p.main);
  LUT_CACHE.set(ck, lut);
  return lut;
}

/**
 * The remap itself, kept here rather than in the scene so it can be run and
 * measured without a canvas: give it flat RGBA bytes and it rewrites them in
 * place.
 *
 * ALPHA IS NEVER TOUCHED, and fully-clear pixels are skipped entirely. A
 * canopy's soft edge has to stay soft; a remap that wrote colour into
 * transparent pixels would turn every sprite into its own bounding box, and
 * the whole forest into a field of squares.
 *
 * Returns the number of pixels rewritten, so a caller can tell a real remap
 * from a silent no-op on a sheet that failed to load.
 */
export function remapPixels(data, paletteKey, material) {
  const lut = paletteLut(paletteKey, material);
  if (!lut) return 0;
  return remapPixelsWithLut(data, lut);
}

/**
 * The same remap, given a LUT directly instead of a palette key.
 *
 * ROUND 76 (item 2.2) -- split out for the ODD SUMMONS, whose materials are
 * not world palettes: an iron cow and a bloodstruck grove want the identical
 * luminance-to-ramp operation, and the only thing that differs is which ramp.
 * Extracted rather than copied so there is one pixel loop in the project and
 * the "never touch alpha" rule above cannot be true in one copy and not the
 * other. `remapPixels` is now a thin wrapper and behaves exactly as before.
 */
export function remapPixelsWithLut(data, lut, range = null) {
  if (!lut) return 0;
  // ROUND 76 (item 2.2) -- OPTIONAL RANGE NORMALISATION, and it is what makes
  // a material behave the same on every animal.
  //
  // Without it the remap reads RAW luminance, so a sprite that lives in the
  // bottom third of the scale only ever touches the bottom third of the ramp.
  // Measured over the monster atlases, mean luminance runs from 31 (the
  // Sicklekin) to 134 (the Gulletmaw) -- a 4x spread -- and an iron Cindermaw
  // at mean 40 came out a near-solid silhouette while an iron Bullwarden at 88
  // came out looking like iron. Same material, same code, unrecognisably
  // different results, because the ANIMAL's exposure was deciding how much of
  // the material got used.
  //
  // Stretching each sheet's own [min,max] across the full ramp fixes that at
  // the source. Deliberately NOT the default: the world palettes have been
  // tuned for two rounds against the raw mapping, and a tree that suddenly
  // used more of its ramp is a change nobody asked for.
  const lo = range ? range.lo : 0;
  const hi = range ? range.hi : 255;
  const span = hi - lo;
  const stretch = !!range && span > 8;
  let touched = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    // Rec.709 in integers: 54/183/19 over 256.
    let L = ((data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8);
    if (stretch) L = Math.max(0, Math.min(255, Math.round(((L - lo) / span) * 255)));
    const o = L * 3;
    data[i] = lut[o]; data[i + 1] = lut[o + 1]; data[i + 2] = lut[o + 2];
    touched++;
  }
  return touched;
}

/**
 * The luminance range a sheet's OPAQUE pixels actually occupy.
 *
 * Fed to `remapPixelsWithLut` as `range`. Percentile-clipped rather than a
 * bare min/max: a single stray near-black outline pixel would otherwise anchor
 * the low end at zero and undo the whole stretch, and sprite art is full of
 * exactly that.
 */
export function lumaRange(data, clip = 0.02) {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    hist[((data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8)]++;
    n++;
  }
  if (!n) return null;
  const cut = Math.floor(n * clip);
  let lo = 0, hi = 255, seen = 0;
  for (let L = 0; L < 256; L++) { seen += hist[L]; if (seen > cut) { lo = L; break; } }
  seen = 0;
  for (let L = 255; L >= 0; L--) { seen += hist[L]; if (seen > cut) { hi = L; break; } }
  return hi > lo ? { lo, hi } : null;
}

/**
 * The average colour this palette actually paints, sampled over the midtones
 * where most of a sprite's pixels live rather than over the whole ramp -- the
 * near-black and near-white ends are shared by every palette and washing them
 * into the average makes ten different looks measure as nearly the same.
 */
export function paletteMeanColor(key, material = 'main') {
  const lut = paletteLut(key, material);
  if (!lut) return null;
  let r = 0, g = 0, b = 0;
  for (let i = 60; i < 230; i++) { r += lut[i * 3]; g += lut[i * 3 + 1]; b += lut[i * 3 + 2]; }
  const n = 170;
  return [r / n, g / n, b / n];
}

/**
 * Palettes that are too close to each other to be worth having twice.
 *
 * This is the failure that authoring ten of anything invites: the first draft
 * had `ember` and `rustwork` 35 apart and `stormglass` and `prismfold` 31, so
 * three of the ten were really variations on two. A landmark's whole job is to
 * look like nowhere else, and two landmarks that recolour to the same brown do
 * not do that job.
 *
 * 45 is the floor because it is roughly where two hues stop being tellable
 * apart across a canopy at the game's zoom. Measured minimum is 59.
 */
export function paletteCollisions(minDistance = 45) {
  const bad = [];
  for (let i = 0; i < PALETTE_KEYS.length; i++) {
    for (let j = i + 1; j < PALETTE_KEYS.length; j++) {
      const a = paletteMeanColor(PALETTE_KEYS[i]);
      const b = paletteMeanColor(PALETTE_KEYS[j]);
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < minDistance) bad.push(`${PALETTE_KEYS[i]}~${PALETTE_KEYS[j]}:${Math.round(d)}`);
    }
  }
  return bad;
}

/**
 * The place-name a palette gives a landmark it has taken over.
 * "The Hollow" + blood -> "The Bloodstruck Hollow".
 */
export function paletteLabel(label, paletteKey) {
  const p = PALETTES[paletteKey];
  if (!p) return label;
  const bare = String(label).replace(/^The\s+/i, '');
  return `The ${p.adj} ${bare}`;
}

export function paletteBlurb(blurb, paletteKey) {
  const p = PALETTES[paletteKey];
  if (!p) return blurb;
  return `${blurb} ${p.blurb}`;
}
