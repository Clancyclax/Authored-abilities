// ============================================================================
// ROUND 98 -- THE PEOPLE IN THE TOWNS, AND WHAT THEY LOOK LIKE.
//
// THE USER:
//   "More color palette change ups for farmer and town NPCs."
//   "Remember hair and skin color can be important visual differences."
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT bandits.js, AND WHY IT IS NOT ROUND 3's VARIANTS EITHER
// ---------------------------------------------------------------------------
// Round 3 gave ten NPC models two "soft variants" each by shifting the WHOLE
// sprite, which is why `npc_farmer_v1` reads as the same farmer in different
// light rather than as a different farmer. Round 95's bandits went the other
// way -- horizontal bands over the body, one colour per band -- which works for
// scrap armour and would put a green stripe across a face.
//
// The user named the two axes that actually distinguish one person from
// another, and they are the two neither of those systems has: SKIN and HAIR.
// So this file finds them and leaves everything else to the clothes.
//
// ---------------------------------------------------------------------------
// THE THING THAT TOOK THREE ATTEMPTS: WHAT COUNTS AS SKIN
// ---------------------------------------------------------------------------
// Each attempt was measured by rendering a contact sheet and looking at it, and
// each failed differently:
//
//  1. BY HUE. Skin is warm, so select warm pixels. Straw hats, tan tunics and
//     brown leather are also warm, and the mask came back with the farmer's
//     entire hat and the peasant's entire shirt marked as skin.
//  2. BY FLOOD FILL FROM THE FACE. Better, until the flood ran down the neck
//     into the tunic on half the models -- there is no dark outline between a
//     chin and a collar on these sprites -- and swallowed the garment again.
//  3. BY HUE-CLUSTERING THE FACE'S COLOURS. This is the one that produced GREEN
//     FACES on five of six models, and the reason is worth keeping: A SKIN RAMP
//     CROSSES HUE BUCKETS. A lit cheek is more yellow than a shadowed one, so
//     clustering split every ramp in two and hue-rotated the half that fell in
//     the neighbouring bucket as if it were clothing.
//
// What works is boring and exact: an AUTHORED FACE BOX per model, read off the
// sprite on a pixel grid, and the skin ramp is the set of colours that box
// actually contains -- as exact RGB values, never as a range or a cluster. The
// same for the head band above it. And then nothing in either set may be
// recoloured as clothing, even where the same value also appears on a sleeve:
// protecting the face costs a little variety on the garment, and the reverse
// costs a face.
//
// This is bandits.js's own conclusion arrived at again -- author the per-model
// number, do not infer it -- which is why `chestTop` is a hand-written field
// there and `face` is one here.
// ============================================================================

/**
 * Per model: the face box on frame 0 (x0, y0, x1, y1 inclusive), how many rows
 * above the face the head band reaches, and whether that band is HEADWEAR
 * rather than hair.
 *
 * The hat flag is not cosmetic bookkeeping. The band is found the same way
 * either way -- what is above the face -- but a hat may be any colour cloth
 * comes in and hair may not, so they draw from different pools. The farmer's
 * straw brim and the posh girl's lace cap are the two that would otherwise come
 * out of the tin as chestnut or ash blonde.
 */
// ROUND 193 -- TWO MODELS OUT OF THE CROWD.
//
// The user: "Adventurous girl ... that original model became a companion
// character. Remove her from Cadence as that model now belongs to the
// companion." (Measured: her south pose scores 1.000 against char_aedia_idle,
// so the crowd was full of Aedia.) And, for the second time: "noblewoman ...
// her model is not portioned correctly, missing the lower half. Please
// eliminate from the game."
export const FOLK_MODELS = {
  npc_farmer:                { face: [26, 17, 36, 25], hairUp: 13, hat: true },
  npc_peasant_man:           { face: [28, 13, 38, 23], hairUp: 8,  hat: false },
  npc_cheerful_peasant_girl: { face: [28, 13, 37, 23], hairUp: 7,  hat: false },
  npc_townsman:              { face: [30, 11, 42, 23], hairUp: 7,  hat: false },
  npc_female_adventurer:     { face: [30, 11, 39, 21], hairUp: 6,  hat: false },
  npc_grizzled_adventurer:   { face: [28, 11, 38, 21], hairUp: 6,  hat: false },
  npc_muscular_adventurer:   { face: [34, 11, 45, 23], hairUp: 6,  hat: false },
  npc_noble_standing:        { face: [30, 11, 39, 21], hairUp: 6,  hat: false },
  npc_posh_noble_girl:       { face: [32, 13, 41, 23], hairUp: 6,  hat: true },
  npc_mage:                  { face: [34, 13, 43, 23], hairUp: 8,  hat: false },

  // ROUND 196 -- EIGHT MORE FACES IN THE CROWD.
  //
  //   "Additional NPCs for recoloring and distribution to further increase
  //    variety in enemies and townsfolk."
  //
  // RECOLOURED HERE RATHER THAN ON DISK. Round 3's people carry `_v1`/`_v2`
  // sheets as files; these eight get their eight variants apiece from this
  // table for no files at all, which is the whole reason round 134 built it.
  // Every box below was measured off the south pose's drawn pixels by
  // tools/sheet_round196_npcs.py and then narrowed to the 6..16 the fault
  // check allows -- a face box wide enough to reach a collar dyes the collar
  // as skin, which is the failure every draft of this table has had.
  //
  // The rugged hiker is the only `hat: true` of the eight: what is above his
  // face is a hood, and cloth may be any colour hair may not.
  npc_merchant:              { face: [26, 9, 33, 16], hairUp: 5,  hat: false },
  npc_confident_woman:       { face: [30, 7, 37, 14], hairUp: 6,  hat: false },
  npc_sporty_woman:          { face: [30, 9, 37, 16], hairUp: 6,  hat: false },
  npc_sleek_woman:           { face: [31, 8, 38, 15], hairUp: 6,  hat: false },
  npc_patterned_man:         { face: [30, 7, 37, 14], hairUp: 5,  hat: false },
  // THE BOXES ABOVE ARE ON THE **EAST** POSE, and that is the whole story of
  // how they were got. `analyseFolk` reads the first cell of the sheet, which
  // is east (PLAYER_DIR_ORDER), and the first cut measured the SOUTH pose
  // because that is the one a person looks at. Six of the eight survived it by
  // luck -- a head is near the middle either way -- and the two hikers did
  // not: his beard and her hair sit where a south-measured box expects a
  // cheek, so the box caught no repeated skin colour, `BAND_MIN_HITS.face`
  // rejected what it did catch, and the skin fell through to a clothing ramp.
  // Eight variants of a man with a green face and green hands.
  //
  // So they are READ OFF THE SPRITE, one at a time, the way the ten above
  // them were. Two passes of automatic measurement were tried first and both
  // were worse than looking: a box on the middle of the head lands on a beard,
  // and a box placed by hunting for skin-coloured pixels lands on the
  // merchant's CRATE, which is the same brown as a hand.
  //
  // AND TWO OF THE FIFTEEN ARE NOT IN THIS TABLE. The hikers' east pose -- the
  // one `analyseFolk` reads -- shows a face of about eight pixels under a hood
  // and a fall of hair, and a box that size catches one or two skin shades out
  // of the ramp's dozen. The rest of the skin then stays in a colour ramp and
  // turns with the coat: eight variants of a man with a green face and green
  // hands, which is what three passes at this produced. A box big enough to
  // hold the whole ramp also holds the hood, and then the hood is dyed as
  // skin. So they are not painted. They are imported whole -- rotations, run
  // cycle and death -- and they are PLACED rather than recoloured, which is
  // the next round's job: a hiker belongs on a road between two towns, not in
  // a plaza, and that wants a spawner rather than a line in this table. The
  // city guard is held back for the same round for a different reason: he
  // needs a kit and a post (guards.js), not a palette.
  npc_shield_adventurer:     { face: [35, 8, 42, 15], hairUp: 6,  hat: false },
};
export const FOLK_MODEL_KEYS = Object.keys(FOLK_MODELS);

/**
 * WHO IS IN A CROWD, weighted.
 *
 * The models are shared with the rest of the game and half of them are
 * adventurers, so an unweighted pick filled Cadence's plaza with muscular
 * swordsmen at one in the afternoon -- visible in the first screenshot, and
 * nothing in any table was wrong. A town is mostly people who live there. The
 * adventurers stay in the pool at a low weight because a Society capital really
 * does have a few standing about, and the nobles stay low because a plaza full
 * of them is a court rather than a market.
 */
export const CROWD_WEIGHT = {
  // ROUND 196 -- THE FOUR RESIDENTS WENT UP because eight models went in.
  // The rule this table exists for is "a town is mostly people who live
  // there", and `folkFaults` enforces it by weight; eight new faces at one or
  // two apiece would have tipped a plaza to half strangers without any check
  // failing until the last one. So the townsfolk were raised in the same
  // change that added the newcomers, which keeps a crowd about two-thirds
  // residents -- close to where round 134 set it.
  npc_peasant_man: 9,
  npc_cheerful_peasant_girl: 9,
  npc_townsman: 8,
  npc_farmer: 8,
  npc_noble_standing: 2,
  npc_posh_noble_girl: 1,
  npc_mage: 1,
  npc_female_adventurer: 1,
  npc_grizzled_adventurer: 1,
  npc_muscular_adventurer: 1,
  // The newcomers. A merchant is somebody a town has; the rest are passing
  // through, and weighted like it. The two hikers are NOT here -- see the
  // note in FOLK_MODELS about why they are placed rather than painted.
  npc_merchant: 3,
  npc_confident_woman: 2,
  npc_sporty_woman: 1,
  npc_patterned_man: 1,
  npc_sleek_woman: 1,
  npc_shield_adventurer: 1,
};

/** A weighted pick from `CROWD_WEIGHT`, on a caller-supplied 0..1 roll. */
export function crowdModelFor(roll) {
  const keys = FOLK_MODEL_KEYS;
  let total = 0;
  for (const k of keys) total += CROWD_WEIGHT[k] || 1;
  let r = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const k of keys) {
    r -= CROWD_WEIGHT[k] || 1;
    if (r < 0) return k;
  }
  return keys[0];
}

/** How many painted variants exist per model. Eight is what the review sheet
 *  carries, and it is enough that a street of a dozen people repeats once. */
export const FOLK_VARIANTS = 8;

/** The skin the world comes in. The two palest entries of the first draft were
 *  cut after the sheet: on `npc_muscular_adventurer`, whose bare torso is a
 *  fifth of his pixels, they read as sunburn rather than as a person. */
export const SKIN_TONES = [
  [241, 194, 159], [232, 186, 150], [224, 172, 140], [205, 160, 120],
  [198, 134, 102], [172, 108, 80], [150, 96, 66], [141, 85, 62],
  [120, 74, 52], [110, 66, 50], [84, 50, 38], [238, 205, 180],
];

/** Hair. Black through ash and auburn to grey and white, plus two that are
 *  nobody's natural colour and are the better for it in a fantasy capital. */
export const HAIR_TONES = [
  [38, 30, 26], [60, 44, 30], [70, 48, 34], [110, 74, 44], [150, 110, 60],
  [196, 166, 96], [226, 206, 170], [120, 40, 28], [160, 80, 40],
  [84, 84, 92], [190, 190, 196], [52, 40, 60],
];

/** Cloth, for a hat and for a garment whose own colour is too washed out to
 *  rotate (see the grey rule in `folkLut`). */
export const CLOTH_TONES = [
  [150, 40, 40], [40, 80, 150], [60, 120, 60], [160, 140, 60],
  [90, 60, 130], [180, 170, 150], [70, 70, 80],
];

/** How far a garment's own hue is turned. Everything a person is wearing turns
 *  by the SAME angle, because independent per-garment rotations made people
 *  whose shirt, belt and boots had no relationship to each other -- variety
 *  without coherence reads as corruption, not as a different person. The
 *  largest ramp gets a further small kick so two outfits are not one outfit. */
export const CLOTH_HUES = [0, 25, 45, 90, 140, 175, 205, 235, 270, 300, 330];
export const CLOTH_KICK = 20;

/** A ramp this small is a highlight or a buckle, not a garment. */
export const RAMP_MIN_PX = 40;
/** ...and a low-saturation ramp under this is an outline, not a grey coat. */
export const GREY_MIN_PX = 120;
/** The value window a grey may be tinted in. Below it is line work. */
export const GREY_V = [0.25, 0.95];
/** A colour has to appear this often in the box to be part of that band, so a
 *  single bleed pixel on the jaw does not drag an outline into the skin set. */
export const BAND_MIN_HITS = { face: 2, head: 3 };

// ---------------------------------------------------------------------------
// COLOUR
// ---------------------------------------------------------------------------
// Packed as 0xRRGGBB so the sets and maps below key on a number. Alpha is
// carried through untouched -- these sprites are hard-edged, and rewriting a
// half-transparent edge pixel is how a sprite grows a halo.

export function packRgb(r, g, b) { return (r << 16) | (g << 8) | b; }

export function rgbToHsv(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === R) h = ((G - B) / d) % 6;
    else if (mx === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}

export function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  const k = Math.floor(((h % 360) + 360) % 360 / 60);
  if (k === 0) { r = c; g = x; } else if (k === 1) { r = x; g = c; }
  else if (k === 2) { g = c; b = x; } else if (k === 3) { g = x; b = c; }
  else if (k === 4) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Recolour toward a target's hue and saturation, KEEPING THE PIXEL'S OWN VALUE.
 *
 * Value is what carries the drawing -- the shading, the fold in a sleeve, the
 * shadow under a jaw. Every recolour in this file preserves it exactly, which
 * is the one rule that makes a repainted sprite still look drawn rather than
 * filled in. bandits.js reached the same rule from the other end and called it
 * luminance-preserving.
 */
export function tintTo(r, g, b, target) {
  const [, s0, v0] = rgbToHsv(r, g, b);
  const [h1, s1] = rgbToHsv(target[0], target[1], target[2]);
  return hsvToRgb(h1, Math.min(1, s0 * 0.35 + s1 * 0.65), v0);
}

/** Turn a colour's hue by `deg`, keeping saturation and value. */
export function rotateHue(r, g, b, deg) {
  const [h, s, v] = rgbToHsv(r, g, b);
  return hsvToRgb(h + deg, s, v);
}

export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// READING A MODEL
// ---------------------------------------------------------------------------

/**
 * Pull the three bands out of a model's sheet.
 *
 * `pixels` is RGBA for the whole strip; the face and head boxes are read from
 * FRAME 0 only, and the colours they name are then matched across every frame.
 * That is the point of doing it by exact value: a hand at the far end of frame
 * six is the same four browns as the cheek in frame zero, so it is found for
 * free, and nothing has to know where a hand is.
 */
export function analyseFolk(pixels, width, height, def, cell = 64) {
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return pixels[i + 3] < 40 ? null : [pixels[i], pixels[i + 1], pixels[i + 2]];
  };
  const box = (x0, y0, x1, y1) => {
    const hits = new Map();
    for (let y = Math.max(0, y0); y <= Math.min(cell - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(cell - 1, x1); x++) {
        const c = at(x, y);
        if (!c) continue;
        const k = packRgb(c[0], c[1], c[2]);
        hits.set(k, (hits.get(k) || 0) + 1);
      }
    }
    return hits;
  };
  const [fx0, fy0, fx1, fy1] = def.face;
  const skin = new Set();
  for (const [k, n] of box(fx0, fy0, fx1, fy1)) if (n >= BAND_MIN_HITS.face) skin.add(k);
  const head = new Set();
  for (const [k, n] of box(fx0 - 6, fy0 - (def.hairUp || 6), fx1 + 6, fy1)) {
    if (n >= BAND_MIN_HITS.head && !skin.has(k)) head.add(k);
  }

  // Everything else, grouped into ramps by hue so one garment turns as a unit.
  const counts = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 40) continue;
      const k = packRgb(pixels[i], pixels[i + 1], pixels[i + 2]);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const groups = new Map();
  for (const [k, n] of counts) {
    if (skin.has(k) || head.has(k)) continue;
    const [h, s] = rgbToHsv((k >> 16) & 255, (k >> 8) & 255, k & 255);
    const key = s < 0.10 ? 'grey' : `${Math.floor(h / 30)}|${s < 0.34 ? 0 : 1}`;
    let g = groups.get(key);
    if (!g) { g = { key, cols: [], n: 0 }; groups.set(key, g); }
    g.cols.push(k); g.n += n;
  }
  const ramps = [...groups.values()]
    .filter(g => g.n >= RAMP_MIN_PX)
    .sort((a, b) => b.n - a.n);
  return { skin: [...skin], head: [...head], ramps, hat: !!def.hat };
}

/**
 * One person's colours, as a Map of packed-rgb to packed-rgb.
 *
 * Seeded on the model and the variant index, so a townsperson keeps their face
 * across a save, a reload and a walk to another region -- the same reason the
 * board is seeded rather than rolled.
 */
export function folkLut(an, model, variant) {
  const hh = hash32(`${model}|folk|${variant}`);
  const lut = new Map();
  const put = (k, rgb) => lut.set(k, packRgb(rgb[0], rgb[1], rgb[2]));
  const un = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];

  const skinTone = SKIN_TONES[hh % SKIN_TONES.length];
  for (const k of an.skin) put(k, tintTo(...un(k), skinTone));

  const headPool = an.hat ? CLOTH_TONES : HAIR_TONES;
  const headTone = headPool[(hh >>> 8) % headPool.length];
  for (const k of an.head) put(k, tintTo(...un(k), headTone));

  const deg = CLOTH_HUES[(hh >>> 12) % CLOTH_HUES.length];
  const greyTone = CLOTH_TONES[(hh >>> 20) % CLOTH_TONES.length];
  an.ramps.forEach((r, i) => {
    if (r.key === 'grey') {
      // A GREY GARMENT IS STILL A GARMENT. Skipping every low-saturation ramp
      // as line work left `npc_posh_noble_girl` in the same black-and-white
      // dress in all eight variants -- outlines are grey, but so is half her
      // wardrobe. They are told apart by VALUE: an outline is near-black.
      if (r.n < GREY_MIN_PX) return;
      for (const k of r.cols) {
        const v = Math.max((k >> 16) & 255, (k >> 8) & 255, k & 255) / 255;
        if (v >= GREY_V[0] && v <= GREY_V[1]) put(k, tintTo(...un(k), greyTone));
      }
      return;
    }
    const d = deg + (i === 0 ? CLOTH_KICK : 0);
    for (const k of r.cols) put(k, rotateHue(...un(k), d));
  });
  return lut;
}

/** Apply a LUT to an RGBA buffer in place. Alpha is never touched. */
export function applyFolkLut(pixels, lut) {
  let n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 40) continue;
    const to = lut.get(packRgb(pixels[i], pixels[i + 1], pixels[i + 2]));
    if (to === undefined) continue;
    pixels[i] = (to >> 16) & 255;
    pixels[i + 1] = (to >> 8) & 255;
    pixels[i + 2] = to & 255;
    n++;
  }
  return n;
}

/** The texture key a painted variant is baked under. Variant 0 is the sprite as
 *  the artist drew it, so it costs no texture and is always available. */
export function folkArtKey(model, variant) {
  return variant ? `folk_${model}_${variant}` : model;
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------

export function folkFaults() {
  const out = [];
  for (const [k, d] of Object.entries(FOLK_MODELS)) {
    if (!/^npc_/.test(k)) out.push(`${k} is not an npc art key`);
    const [x0, y0, x1, y1] = d.face || [];
    if (![x0, y0, x1, y1].every(n => Number.isInteger(n))) { out.push(`${k} has no face box`); continue; }
    if (x1 <= x0 || y1 <= y0) out.push(`${k}'s face box is inside out`);
    if (x0 < 0 || y0 < 0 || x1 > 63 || y1 > 63) out.push(`${k}'s face box leaves the cell`);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    // A face box big enough to hold a torso is the failure mode of every draft
    // before the authored one: it swallows the garment and dyes it as skin.
    if (w > 16 || h > 16) out.push(`${k}'s face box is ${w}x${h}, big enough to reach a tunic`);
    if (w < 6 || h < 6) out.push(`${k}'s face box is ${w}x${h}, too small to hold a ramp`);
    if (!(d.hairUp >= 3 && d.hairUp <= 20)) out.push(`${k} reaches ${d.hairUp} rows above the face`);
  }
  if (FOLK_MODEL_KEYS.length < 8) out.push(`only ${FOLK_MODEL_KEYS.length} models are painted`);
  // A crowd is mostly people who live there. Every model must be reachable, and
  // the townsfolk must together outweigh the adventurers -- the first build's
  // plaza was half swordsmen and every check passed.
  for (const k of FOLK_MODEL_KEYS) {
    if (!(CROWD_WEIGHT[k] >= 1)) out.push(`${k} is never picked for a crowd`);
  }
  for (const k of Object.keys(CROWD_WEIGHT)) {
    if (!FOLK_MODELS[k]) out.push(`${k} is weighted but is not a painted model`);
  }
  const TOWNIE = ['npc_peasant_man', 'npc_cheerful_peasant_girl', 'npc_townsman', 'npc_farmer'];
  const townie = TOWNIE.reduce((n, k) => n + (CROWD_WEIGHT[k] || 0), 0);
  const rest = FOLK_MODEL_KEYS.reduce((n, k) => n + (TOWNIE.includes(k) ? 0 : CROWD_WEIGHT[k] || 0), 0);
  if (townie <= rest) out.push(`a crowd is ${townie} townsfolk to ${rest} of everybody else`);
  {
    const hits = {};
    for (let i = 0; i < 2000; i++) {
      const k = crowdModelFor(i / 2000);
      hits[k] = (hits[k] || 0) + 1;
    }
    for (const k of FOLK_MODEL_KEYS) if (!hits[k]) out.push(`${k} never comes up in a crowd`);
  }
  if (FOLK_VARIANTS < 2) out.push('a model has no variants');

  // The pools have to be pools. A one-entry pool is a recolour that always
  // lands on the same answer, which is the thing this file exists to stop.
  const pools = { SKIN_TONES, HAIR_TONES, CLOTH_TONES };
  for (const [name, p] of Object.entries(pools)) {
    if (p.length < 4) out.push(`${name} holds only ${p.length} colours`);
    const seen = new Set(p.map(c => c.join(',')));
    if (seen.size !== p.length) out.push(`${name} repeats a colour`);
    for (const c of p) {
      if (c.length !== 3 || c.some(v => !(v >= 0 && v <= 255))) out.push(`${name} holds a bad colour`);
    }
  }
  // Skin has to STAY skin. A hair pool entry in the skin pool is how a face
  // goes grey; asserted rather than trusted because both are lists of browns.
  for (const c of SKIN_TONES) {
    const [h, s, v] = rgbToHsv(c[0], c[1], c[2]);
    if (!(h >= 4 && h <= 46)) out.push(`a skin tone sits at hue ${Math.round(h)}, which is not a skin hue`);
    if (s < 0.12) out.push('a skin tone has no warmth in it');
    if (v < 0.25) out.push('a skin tone is darker than line work');
  }
  if (CLOTH_HUES.length < 6) out.push('the wardrobe turns through too few angles');
  if (CLOTH_HUES.some(d => d < 0 || d >= 360)) out.push('a cloth rotation is not an angle');
  if (!(GREY_V[0] > 0 && GREY_V[1] < 1 && GREY_V[1] > GREY_V[0])) out.push('the grey window is not a window');
  if (GREY_MIN_PX <= RAMP_MIN_PX) out.push('a grey outline is treated as a grey garment');

  // The colour maths has to round-trip, or every recolour is quietly wrong by a
  // shade and the sprite drifts grey over eight variants.
  for (const c of [[241, 194, 159], [38, 30, 26], [12, 200, 90], [255, 255, 255], [0, 0, 0]]) {
    const [h, s, v] = rgbToHsv(c[0], c[1], c[2]);
    const back = hsvToRgb(h, s, v);
    if (back.some((n, i) => Math.abs(n - c[i]) > 1)) {
      out.push(`hsv round-trip loses ${c.join(',')} -> ${back.join(',')}`);
    }
    const spun = rotateHue(c[0], c[1], c[2], 360);
    if (spun.some((n, i) => Math.abs(n - c[i]) > 1)) out.push(`a full turn moves ${c.join(',')}`);
  }
  // And a tint must not move the drawing, only the colour.
  for (const c of [[198, 134, 102], [70, 48, 34], [150, 150, 150]]) {
    const t = tintTo(c[0], c[1], c[2], [40, 80, 150]);
    const [, , v0] = rgbToHsv(c[0], c[1], c[2]);
    const [, , v1] = rgbToHsv(t[0], t[1], t[2]);
    if (Math.abs(v0 - v1) > 0.02) out.push(`tinting ${c.join(',')} changed its value ${v0.toFixed(2)}->${v1.toFixed(2)}`);
  }
  return out;
}

export function folkCensus() {
  return {
    models: FOLK_MODEL_KEYS.length,
    variants: FOLK_VARIANTS,
    faces: FOLK_MODEL_KEYS.length * FOLK_VARIANTS,
    hatted: FOLK_MODEL_KEYS.filter(k => FOLK_MODELS[k].hat).length,
    skinTones: SKIN_TONES.length,
    hairTones: HAIR_TONES.length,
  };
}
