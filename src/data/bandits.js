// ===========================================================================
// ROUND 95 -- THE BANDIT CREWS.
//
// The user, on the second star's escort contract: "guarding a shipment from
// bandits instead of monsters" -- and, on where the people come from:
//
//   "reuse both cultist and NPC adventurer art. Palette adjustments should be
//    multicolor patchwork gear instead of cults monochromatic look."
//
// ---------------------------------------------------------------------------
// MONOCHROME MEANS YOU BELONG TO SOMETHING. PATCHWORK MEANS YOU DO NOT.
// ---------------------------------------------------------------------------
// cultists.js's own header makes the case for one colour per cult: "the colour
// IS the build", so a red cultist bleeds you and a grey-green one raises what
// it kills, and the player reads the room before the fight starts. That works
// because a cult issues robes.
//
// A bandit crew issues nothing. What a bandit is wearing is what came off
// somebody else, and the whole visual argument of this file is that the player
// should be able to tell those two kinds of enemy apart across a field without
// reading a name: one silhouette is a single saturated colour, the other is
// five colours that do not go together. So the patchwork is not decoration --
// it is the same information channel the cults use, saying the opposite thing.
//
// WHICH IS WHY THE SCRAPS ARE THE POINT. Painting each body band ONE colour was
// tried first and it does not read as patchwork; it reads as a person in
// different clothes. Each band therefore carries TWO colours, chosen per
// three-pixel block by a hash of the position, so a garment is visibly sewn out
// of pieces. Three pixels because these are 64px figures: at one the checker
// dissolves into noise at play scale, at six a tunic is two flat halves.
//
// ---------------------------------------------------------------------------
// WHAT WAS MEASURED, AND WHAT IT COST TO GET WRONG
// ---------------------------------------------------------------------------
// Four passes, each looking at the rendered figures rather than at the code:
//
//   1. One colour per band            -- reads as "different clothes". Rejected.
//   2. Two-colour scraps, muted bank  -- reads on the pale cultist models and
//                                        disappears on the adventurers, whose
//                                        art is already muted brown and green.
//                                        The bank got louder.
//   3. A head band                    -- dyes HAIR, and on the pale-haired
//                                        models it crept onto the face. Cut:
//                                        a bandit wears looted gear, not dyed
//                                        hair, which also removes the whole
//                                        "did it paint her face" question
//                                        rather than tuning around it.
//   4. A shared chest-band top of 14  -- the cultist woman's FACE is drawn at
//                                        y14-22, exactly where every other
//                                        model's collar is. She came out with a
//                                        green face three tries running. The
//                                        top of the chest band is a property of
//                                        the model now, and it is the one number
//                                        in this file that was arrived at by
//                                        zooming in on a sprite.
//
// Skin is NOT detected by hue. It cannot be: the base models are desaturated
// and the cult variants are monochrome, so on a blood-cult sheet a face is red
// and on a base sheet it is grey. What protects skin is the band table -- the
// head is never painted, and the hands sit inside the glove band on purpose,
// because a bandit with wrapped hands is a bandit.
// ===========================================================================

import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { CULTS } from './cultists.js';

/**
 * The five models a crew can field, and where each one's chest band starts.
 *
 * Two cultist bodies and three adventurer bodies, which is the user's own list
 * ("reuse both cultist and NPC adventurer art"). They are the UNCOLOURED base
 * sheets -- `npc_cultist_man`, not `npc_cultist_man_blood` -- because a crew's
 * colours should come from this file rather than from a cult's palette showing
 * through underneath.
 *
 * `chestTop` is the first row the paint is allowed to touch. See the header:
 * these are measured per model, and the cultist woman's 23 is the one that
 * three passes of a shared constant got wrong.
 */
export const BANDIT_MODELS = [
  { key: 'npc_cultist_man', chestTop: 14 },
  { key: 'npc_cultist_woman', chestTop: 23 },
  { key: 'npc_grizzled_adventurer', chestTop: 14 },
  { key: 'npc_female_adventurer', chestTop: 15 },
  { key: 'npc_muscular_adventurer', chestTop: 14 },
  // ROUND 196 -- FOUR BODIES THAT WERE DRAWN AS BANDITS.
  //
  //   "Additional NPCs for recoloring and distribution to further increase
  //    variety in enemies and townsfolk."
  //
  // Round 95 built a crew out of cultist and adventurer art because that was
  // the art there was, and said so in its own header. These four were drawn as
  // what they are -- three bandits and a pirate -- so a crew now fields people
  // who look like brigands under the patchwork rather than people who look
  // like cult members wearing it.
  //
  // The five above STAY. A crew of nine bodies repeats less than a crew of
  // five, and the check below still requires both of the original kinds, so
  // nothing this round adds can quietly remove what round 95 argued for.
  //
  // Each `chestTop` was read off its own east pose, which is the pose the
  // paint is measured in: the row where the collar starts and the face has
  // ended. The pirate's is the lowest of the nine because the hat brim and the
  // scarf sit where everybody else has a shoulder.
  { key: 'npc_bandit_woman', chestTop: 20 },
  { key: 'npc_bandit_brute', chestTop: 19 },
  { key: 'npc_bandit_skinny', chestTop: 21 },
  { key: 'npc_pirate', chestTop: 21 },
];
export const BANDIT_MODEL_KEYS = BANDIT_MODELS.map(m => m.key);
export const BANDIT_MODEL_BY_KEY = Object.fromEntries(BANDIT_MODELS.map(m => [m.key, m]));

/**
 * The scrap bank. Twelve colours that do not belong to a set -- which is the
 * point: every one of them is something that used to be on somebody else.
 *
 * Louder than the first draft. Against art that is already muted brown and
 * green, a muted bank repaints every pixel and reads as nothing changed.
 */
export const PATCHWORK_BANK = {
  rust: { r: 186, g: 68, b: 34 },
  moss: { r: 96, g: 132, b: 44 },
  ochre: { r: 220, g: 168, b: 48 },
  sky: { r: 72, g: 124, b: 178 },
  oxblood: { r: 132, g: 32, b: 52 },
  bone: { r: 226, g: 214, b: 178 },
  char: { r: 48, g: 44, b: 52 },
  tan: { r: 176, g: 132, b: 76 },
  plum: { r: 122, g: 58, b: 140 },
  teal: { r: 38, g: 140, b: 132 },
  cream: { r: 232, g: 206, b: 148 },
  ink: { r: 38, g: 52, b: 96 },
};
export const PATCHWORK_KEYS = Object.keys(PATCHWORK_BANK);

/** The garment bands, in the order they are tested. The head is absent by
 *  design -- see the header. `gloves` is tested first so a hand at the outer
 *  edge of the chest band's rows is a glove rather than a sleeve. */
export const BANDIT_BAND_ORDER = ['gloves', 'chest', 'belt', 'legs', 'boots'];

/** Three pixels to a scrap. See the header for why not one and not six. */
export const SCRAP_PX = 3;

/** The bands for one model, in 64px cell space with the feet at y63.
 *  `chestTop` lifts the two bands that can reach a face.
 *
 *  ROUND 199 -- `dy` slides them onto a sheet drawn to a different grid, and
 *  it is a SLIDE rather than a scale, which was measured rather than assumed.
 *  The attack sheets come at 88 and 92 against the rotations' 64, so the first
 *  guess was to scale the bands by the cell. Cropping the south pose out of
 *  each and reading its alpha box says otherwise: the brute's body is 61 pixels
 *  tall on both sheets, and so are the skinny bandit's and the pirate's. The
 *  bigger cell is padding, not a bigger man. What moves is where he starts --
 *  row 2 on the rotations, row 15, 13, 13 and 4 on the swings. */
export function banditBands(chestTop, dy = 0) {
  const top = chestTop || 14;
  const k = (v) => (dy ? v + dy : v);
  return [
    { name: 'gloves', y0: k(Math.max(top, 24)), y1: k(42), d0: k(17), d1: k(99) },
    { name: 'chest', y0: k(top), y1: k(34), d0: 0, d1: k(17) },
    { name: 'belt', y0: k(34), y1: k(42), d0: 0, d1: k(17) },
    { name: 'legs', y0: k(42), y1: k(54), d0: 0, d1: k(99) },
    { name: 'boots', y0: k(54), y1: k(64), d0: 0, d1: k(99) },
  ];
}

/**
 * THE CREWS.
 *
 * Six, spanning normal to silver, and every one of them is a three-essence
 * build for the reason cultists.js gives: every character in this game is three
 * essences and a confluence, and a bandit that carried one would be the only
 * exception in the world.
 *
 * `wear` is five band pairs. Each pair is two scrap colours, and the pairs are
 * chosen so that ADJACENT BANDS DISAGREE -- a crew whose chest and legs share a
 * colour reads as a uniform, which is the one thing a bandit must not look
 * like. `banditFaults` asserts it rather than trusting the eye.
 */
export const BANDIT_CREWS = [
  {
    slug: 'roadwolves', name: 'The Roadwolves', rank: 'normal',
    essence: 'essWolf', support: ['essKnife', 'essSwift'],
    stones: ['stoneWolf', 'stoneKnife', 'stoneSwift'],
    blurb: 'Six of them, and they only ever take from people already carrying it somewhere.',
    cry: 'Down off the cart! Nobody has to be brave!',
    wear: {
      chest: ['moss', 'cream'], gloves: ['oxblood', 'tan'], belt: ['char', 'ochre'],
      legs: ['ink', 'plum'], boots: ['rust', 'char'],
    },
  },
  {
    slug: 'toll', name: 'The Toll', rank: 'iron',
    essence: 'essNet', support: ['essTrap', 'essResolute'],
    stones: ['stoneNet', 'stoneTrap', 'stoneResolute'],
    blurb: 'They have built a gate across a road that never had one and they take a fee at it.',
    cry: 'The road is maintained! The road is not free!',
    wear: {
      chest: ['sky', 'ochre'], gloves: ['char', 'bone'], belt: ['tan', 'oxblood'],
      legs: ['rust', 'cream'], boots: ['ink', 'moss'],
    },
  },
  {
    slug: 'ashcart', name: 'The Ashcart Men', rank: 'iron',
    essence: 'essSmoke', support: ['fire', 'essDiscord'],
    stones: ['stoneSmoke', 'stoneFire', 'stoneDiscord'],
    blurb: 'They burn the cart afterwards, which is how anyone knows it was them.',
    cry: 'Leave it! Leave it and go!',
    wear: {
      chest: ['char', 'rust'], gloves: ['ochre', 'ink'], belt: ['bone', 'plum'],
      legs: ['teal', 'tan'], boots: ['oxblood', 'cream'],
    },
  },
  {
    slug: 'magpie', name: 'The Magpie Company', rank: 'bronze',
    essence: 'essHunger', support: ['essRat', 'essDust'],
    stones: ['stoneHunger', 'stoneRat', 'stoneDust'],
    blurb: 'They take everything, including the things nobody would have thought to guard.',
    cry: 'All of it. All of it counts.',
    wear: {
      chest: ['plum', 'bone'], gloves: ['moss', 'rust'], belt: ['ink', 'ochre'],
      legs: ['tan', 'teal'], boots: ['char', 'sky'],
    },
  },
  {
    slug: 'ironshare', name: 'The Iron Share', rank: 'bronze',
    essence: 'essIron', support: ['essHammer', 'might'],
    stones: ['stoneIron', 'stoneHammer', 'stoneMight'],
    blurb: 'Former guards, every one of them, and they still count out an equal share afterwards.',
    cry: 'Even shares! Set it down and you keep your hands!',
    wear: {
      chest: ['tan', 'ink'], gloves: ['cream', 'oxblood'], belt: ['moss', 'bone'],
      legs: ['ochre', 'char'], boots: ['teal', 'rust'],
    },
  },
  {
    slug: 'quiettrade', name: 'The Quiet Trade', rank: 'silver',
    essence: 'shadow', support: ['essVenom', 'essBalance'],
    stones: ['stoneVenom', 'stoneBalance', 'stoneThread'],
    blurb: 'They do not rob carts. They are paid by people who would rather a cart did not arrive.',
    cry: '',
    wear: {
      chest: ['ink', 'teal'], gloves: ['plum', 'char'], belt: ['rust', 'sky'],
      legs: ['bone', 'oxblood'], boots: ['ochre', 'moss'],
    },
  },
];

export const CREW_BY_SLUG = Object.fromEntries(BANDIT_CREWS.map(c => [c.slug, c]));
export const CREW_SLUGS = BANDIT_CREWS.map(c => c.slug);

/** The texture key a painted crew member is baked under. Distinct from
 *  `cultistArtKey`'s shape on purpose: a `~bandit_` infix cannot collide with
 *  a cult palette suffix, whatever either list grows into. */
export function banditArtKey(slug, which = 0) {
  const m = BANDIT_MODELS[which % BANDIT_MODELS.length];
  return `${m.key}~bandit_${slug}`;
}

export function banditModelFor(which = 0) {
  return BANDIT_MODELS[which % BANDIT_MODELS.length];
}

/** The build a crew member runs, in the shape `rebuildKnownAbilities` takes.
 *  Four stone slots, not three -- the fourth is the confluence, and cultBuild
 *  learned that the hard way (it threw inside processStones). */
export function banditBuild(slug) {
  const c = CREW_BY_SLUG[slug];
  if (!c) return null;
  const slot = (i) => [
    c.stones[i % c.stones.length],
    c.stones[(i + 1) % c.stones.length],
    c.stones[(i + 2) % c.stones.length],
    c.stones[i % c.stones.length],
  ];
  return {
    slotEssence: [c.essence, ...c.support],
    slotStones: [slot(0), slot(1), slot(2), slot(0)],
    slotAttr: ['power', 'spirit', 'speed', 'recovery'],
  };
}

// ---------------------------------------------------------------------------
// THE PAINT PASS
// ---------------------------------------------------------------------------

/** FNV-ish 32-bit hash of two small integers. Two multiplies and a shift: this
 *  runs once per painted pixel on a 512x64 sheet, five sheets per crew. */
function h32(a, b) {
  let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177) >>> 0;
  return x;
}

/**
 * Repaint one NPC sheet as a crew's patchwork gear.
 *
 * `source` is an image or canvas of the packed sheet (512x64 for every model
 * here: eight directions of one 64px cell). Returns a canvas.
 *
 * Luminance is preserved rather than replaced, the same rule `paintCutout`
 * follows: the art's own shading is what makes a repainted tunic still look
 * like cloth, and a flat fill looks like a sticker.
 *
 * Near-black pixels are left alone -- they are the outline, and an outline
 * painted plum stops being an outline.
 */
export function paintPatchwork(source, cell, wear, chestTop, doc = (typeof document !== 'undefined' ? document : null), bandDy = 0) {
  if (!doc) return null;
  const canvas = doc.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  if (!wear) return canvas;
  // ROUND 199 -- THE CELL'S OWN CENTRE, AND A VERTICAL SLIDE.
  //
  // This read `cx - 32`, which is 64 written down twice: right for as long as
  // the only thing painted was a 64px rotation sheet, and wrong the moment
  // round 199 painted a 92px swing, where "17 pixels either side of the
  // middle" measured from x=32 puts the chest band over one arm. Derived from
  // `cell` now, which is the same number on the old path.
  //
  // `bandDy` is the other half of the same fix and is measured per sheet --
  // see banditBands. Zero on the rotations, so nothing round 95 painted moves.
  const half = cell / 2;
  const bands = banditBands(chestTop, bandDy);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const W = canvas.width;
  // The pairs resolved to colours once, outside the pixel loop.
  const pairs = {};
  for (const name of BANDIT_BAND_ORDER) {
    const p = wear[name];
    if (!p) continue;
    const a = PATCHWORK_BANK[p[0]], b = PATCHWORK_BANK[p[1]];
    if (a && b) pairs[name] = [a, b];
  }
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    if (lum < 0.10) continue;                 // outline stays outline
    const px = (i / 4) % W, py = Math.floor(i / 4 / W);
    const cx = px % cell, cy = py % cell;
    const adx = Math.abs(cx - half + 0.5);
    let name = null;
    for (const bd of bands) {
      if (cy >= bd.y0 && cy < bd.y1 && adx >= bd.d0 && adx <= bd.d1) { name = bd.name; break; }
    }
    const pair = name && pairs[name];
    if (!pair) continue;
    const c = pair[h32(Math.floor(cx / SCRAP_PX), Math.floor(cy / SCRAP_PX)) & 1];
    const f = 0.30 + 0.95 * lum;
    d[i] = Math.min(255, c.r * f);
    d[i + 1] = Math.min(255, c.g * f);
    d[i + 2] = Math.min(255, c.b * f);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------

export function banditFaults() {
  const out = [];
  const seen = new Set();
  const cultEssences = new Set(CULTS.map(c => c.essence));
  const wearSigs = new Map();

  for (const c of BANDIT_CREWS) {
    if (seen.has(c.slug)) out.push(`duplicate crew slug ${c.slug}`);
    seen.add(c.slug);
    // The build must be REAL. A dangling id here generates an empty kit rather
    // than throwing, which is the quiet half of the fault cultFaults exists for.
    for (const e of [c.essence, ...c.support]) {
      if (!ESSENCE_CATALOG[e]) out.push(`${c.slug} names unknown essence ${e}`);
    }
    for (const s of c.stones) {
      if (!STONE_CATALOG[s]) out.push(`${c.slug} names unknown stone ${s}`);
    }
    if (c.support.includes(c.essence)) out.push(`${c.slug} lists its own essence as support`);
    if (new Set(c.support).size !== c.support.length) out.push(`${c.slug} repeats a support essence`);
    if (c.stones.length !== 3) out.push(`${c.slug} carries ${c.stones.length} stones, not 3`);
    if (!c.name || !c.blurb) out.push(`${c.slug} is missing its prose`);
    if (!['normal', 'iron', 'bronze', 'silver', 'gold'].includes(c.rank)) {
      out.push(`${c.slug} has an odd rank ${c.rank}`);
    }
    // No diamond content, anywhere, ever.
    if (c.rank === 'diamond') out.push(`${c.slug} is a diamond-rank crew`);

    // A crew that runs a cult's own primary essence is a crew the player will
    // read as that cult -- which defeats the whole point of the two looks.
    if (cultEssences.has(c.essence)) out.push(`${c.slug} runs a cult's primary essence ${c.essence}`);

    // --- the patchwork itself ---------------------------------------------
    const w = c.wear || {};
    for (const name of BANDIT_BAND_ORDER) {
      const p = w[name];
      if (!p || p.length !== 2) { out.push(`${c.slug} has no ${name} scraps`); continue; }
      for (const k of p) if (!PATCHWORK_BANK[k]) out.push(`${c.slug}'s ${name} names unknown scrap ${k}`);
      if (p[0] === p[1]) out.push(`${c.slug}'s ${name} is one colour, not two`);
    }
    // ADJACENT BANDS MUST DISAGREE. A crew whose chest and legs share a colour
    // reads as a uniform, which is the one thing a bandit must not look like.
    const adjacent = [['chest', 'belt'], ['belt', 'legs'], ['legs', 'boots'], ['chest', 'gloves']];
    for (const [a, b] of adjacent) {
      const pa = w[a] || [], pb = w[b] || [];
      if (pa.some(k => pb.includes(k))) out.push(`${c.slug}'s ${a} and ${b} share a colour`);
    }
    // ...and two crews must not wear the same thing.
    const sig = BANDIT_BAND_ORDER.map(n => (w[n] || []).join('+')).join('|');
    if (wearSigs.has(sig)) out.push(`${c.slug} wears exactly what ${wearSigs.get(sig)} wears`);
    wearSigs.set(sig, c.slug);
  }

  // Two crews on the same primary essence are two crews the player cannot tell
  // apart by what they do -- the same rule cultFaults holds the cults to.
  const byEss = new Map();
  for (const c of BANDIT_CREWS) {
    if (byEss.has(c.essence)) out.push(`${c.slug} and ${byEss.get(c.essence)} share ${c.essence}`);
    byEss.set(c.essence, c.slug);
  }

  // The models. Every one needs a chest top, and a top low enough to reach a
  // face is the fault this file's header is mostly about.
  for (const m of BANDIT_MODELS) {
    if (!(m.chestTop > 0)) out.push(`${m.key} has no chest top`);
    if (m.chestTop < 12) out.push(`${m.key}'s chest band starts at ${m.chestTop}, which is on the head`);
    if (m.chestTop > 30) out.push(`${m.key}'s chest band starts below the belt`);
  }
  if (BANDIT_MODELS.length < 4) out.push('a crew fields fewer than four bodies');
  if (new Set(BANDIT_MODEL_KEYS).size !== BANDIT_MODEL_KEYS.length) out.push('a model is listed twice');
  // Both halves of the user's instruction: cultist art AND adventurer art.
  if (!BANDIT_MODEL_KEYS.some(k => /cultist/.test(k))) out.push('no crew member wears the cultist art');
  if (!BANDIT_MODEL_KEYS.some(k => /adventurer/.test(k))) out.push('no crew member wears the adventurer art');

  // The head is never painted, at any model's top. Asserted rather than read
  // off the table, because this is the rule three passes broke.
  for (const m of BANDIT_MODELS) {
    for (const bd of banditBands(m.chestTop)) {
      if (bd.y0 < 12) out.push(`${m.key}'s ${bd.name} band reaches the head at y${bd.y0}`);
    }
  }
  // The scrap size, which decides whether patchwork reads at all.
  if (SCRAP_PX < 2) out.push('scraps are one pixel -- the checker is noise at play scale');
  if (SCRAP_PX > 5) out.push('scraps are large enough that a garment is two flat halves');

  // Every art key a crew can produce must be unique across crews and models.
  const keys = new Set();
  for (const c of BANDIT_CREWS) {
    for (let i = 0; i < BANDIT_MODELS.length; i++) {
      const k = banditArtKey(c.slug, i);
      if (keys.has(k)) out.push(`two crew members bake to ${k}`);
      keys.add(k);
    }
  }
  return out;
}

export function banditCensus() {
  return {
    crews: BANDIT_CREWS.length,
    models: BANDIT_MODELS.length,
    sheets: BANDIT_CREWS.length * BANDIT_MODELS.length,
    scraps: PATCHWORK_KEYS.length,
    ranks: [...new Set(BANDIT_CREWS.map(c => c.rank))],
  };
}
