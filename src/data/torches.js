// ===========================================================================
// ROUND 260 -- THE TORCH.
//
//   4.3)   "The sewer should be darker, and have torches in the new lighting
//           system to cast light along the main path."
//   4.4)   "I've added a torch object for caves and sewers. It also has an
//           animation as unlike the lamps the flame is visible."
//   4.4.1) "Palette adjustments with the torch to create different colored
//           flames for different lighting effects, i.e. blood red lighting in
//           a blood cult cave."
//
// WHY THE FLAME IS A RECOLOUR AND NOT EIGHT SHEETS. The upload's wood sits
// between 0.23 and 0.40 saturation and its fire between 0.90 and 1.00, with
// nothing at all in between -- measured in tools/extract_round260_torch.py,
// which prints the split. So the fire can be told from the handle by a
// threshold, and a variant is the same thirteen frames with the fire's hue
// rotated and the handle untouched. One 403x117 sheet, nine flames, built
// lazily at runtime: a green torch costs a canvas the first time a barrow is
// entered and nothing on any boot that never enters one.
//
// WHY THE COLOUR IS THE CULT'S AND NOT THE ROOM'S. "a blood cult cave" is his
// example and the cults are already authored, ten of them, each with an
// essence and a colour it implies. A torch that burns the colour of whoever
// lit it says who lit it -- which is information the player can use from the
// doorway, before anything in the room has turned round. `CULT_FLAMES` below
// is that mapping and `torchFaults` refuses a cult that has no flame, so a
// cult added in a later round fails loudly rather than burning orange.
//
// THE LIGHT COLOUR IS NOT THE FLAME COLOUR. A flame is drawn near-white in
// its hottest pixels; the light it throws is the colour of its edges. Each
// entry carries both, and lighting.js reads `light` -- the same separation
// LAMP_LIGHTS has made since round 249, for the same reason: a lamp whose
// light does not match its own picture reads as a bug even when nobody can
// say why.
// ===========================================================================

import { CULTS } from './cultists.js';
import { DEN_SITE_KEYS } from './dens.js';

// ---------------------------------------------------------------------------
// THE SHEET. Every number here is printed by the extractor; none is a taste.
// ---------------------------------------------------------------------------

/** public/assets/torch.png -- thirteen frames in a row. */
export const TORCH_TEX = 'torch';
export const TORCH_FRAMES = 13;
export const TORCH_CELL_W = 31;
export const TORCH_CELL_H = 117;

/** The GIF's own timing: 150ms a frame, which is 6.67fps. Kept rather than
 *  rounded to a friendlier number -- the flicker was drawn at that speed and
 *  it reads as a flame at that speed. */
export const TORCH_FRAME_MS = 150;
export const TORCH_FPS = 1000 / TORCH_FRAME_MS;

/** Bottom centre of the union box: the foot of the handle. A torch is
 *  planted, so the tile it stands on is under its butt. */
export const TORCH_FOOT_X = 0.5;
export const TORCH_FOOT_Y = 1.0;

/** On screen. MEASURED AGAINST THE PLAYER, not against the lamppost: the
 *  first cut was 0.60, and the screenshot showed a torch as tall as the man
 *  standing next to it, which reads as a floor brazier rather than as a brand
 *  jammed in the ground. The player's body is about 60 world px; 117 * 0.42 is
 *  49, so the flame burns at roughly his chest. */
export const TORCH_DISPLAY_SCALE = 0.42;

/** Where the flame sits above the foot, in screen pixels at display scale --
 *  the light hangs at the fire, not at the butt of the handle. The flame box
 *  the extractor measured is y 0..39 of 117, so its middle is 97px up the
 *  art, which is 58px at 0.60. */
export const TORCH_LIGHT_RISE = Math.round((TORCH_CELL_H - 20) * TORCH_DISPLAY_SCALE);

/** The saturation line between handle and fire, shared with the extractor so
 *  the runtime recolour and the packer cannot disagree about what a flame
 *  pixel is. */
export const TORCH_FLAME_SAT = 0.70;

// ---------------------------------------------------------------------------
// THE FLAMES.
//
//   hue    degrees to rotate the fire by. 0 is the art as drawn.
//   sat    multiplier on the fire's saturation; below 1 is a paler fire.
//   lum    multiplier on the fire's lightness.
//   light  the colour of the light it throws, which is not the colour of the
//          hottest pixels -- see the header.
//   power  how strongly, on the same 0..1 scale LAMP_LIGHTS uses.
// ---------------------------------------------------------------------------
export const TORCH_FLAMES = {
  // Ordinary fire, the art untouched. The sewer, a mine, a barn.
  ember:  { key: 'ember',  hue: 0,    sat: 1.00, lum: 1.00, light: 0xffa254, power: 0.90,
            label: 'a plain torch' },
  // The Red Hour. His own example, and the one the others were checked
  // against: rotated down into the reds and darkened, because a red flame
  // that is still as bright as an orange one reads as orange.
  blood:  { key: 'blood',  hue: -24,  sat: 1.00, lum: 0.86, light: 0xff3a30, power: 0.85,
            label: 'a torch burning red' },
  // The Pale Order. Not a colour so much as the absence of one.
  bone:   { key: 'bone',   hue: 10,   sat: 0.28, lum: 1.06, light: 0xf2ead2, power: 0.80,
            label: 'a torch burning white' },
  // The Long Vigil, and the barrows. Corpse-light green.
  grave:  { key: 'grave',  hue: 92,   sat: 0.86, lum: 0.94, light: 0x7fe08a, power: 0.75,
            label: 'a torch burning green' },
  // The Unmade. Violet, and the dimmest of them: their whole argument is that
  // there should be less of everything.
  void:   { key: 'void',   hue: 228,  sat: 0.92, lum: 0.88, light: 0xa07ce8, power: 0.65,
            label: 'a torch burning violet' },
  // The Drowned Choir. Cold, and the colour of light coming through water.
  deep:   { key: 'deep',   hue: 176,  sat: 0.90, lum: 0.96, light: 0x5cc8ff, power: 0.78,
            label: 'a torch burning blue' },
  // The Wilting. Bilious -- yellow-green, the colour of something going off.
  blight: { key: 'blight', hue: 48,   sat: 0.98, lum: 0.90, light: 0xc4d84a, power: 0.72,
            label: 'a torch burning sickly' },
  // The Gilded Mouth, and the Glad Confession, who like to be seen.
  gold:   { key: 'gold',   hue: 16,   sat: 0.95, lum: 1.10, light: 0xffd76a, power: 1.00,
            label: 'a torch burning gold' },
  // The Thunderhead. A white-blue flame with a hard edge to it.
  storm:  { key: 'storm',  hue: 196,  sat: 0.62, lum: 1.08, light: 0xbfe4ff, power: 0.88,
            label: 'a torch burning pale blue' },
};

export const TORCH_FLAME_KEYS = Object.keys(TORCH_FLAMES);
export const TORCH_DEFAULT_FLAME = 'ember';

/** Which flame a cult's people light. Every slug in cultists.js appears, and
 *  `torchFaults` is what keeps that true. */
export const CULT_FLAMES = {
  bone: 'bone',
  blood: 'blood',
  undeath: 'grave',
  ash: 'ember',
  void: 'void',
  sin: 'gold',
  blight: 'blight',
  storm: 'storm',
  deep: 'deep',
  gold: 'gold',
};

/** ...and what a den burns when nobody in it belongs to a cult. */
export const DEN_FLAMES = {
  mineCave: 'ember',
  magmaCave: 'ember',
  barrow: 'grave',
  cultChamber: 'blood',
  hiddenLair: 'blight',
  shrine: 'bone',
  farmFields: 'ember',
};

/** ...and what a built room burns, by its floor. */
export const FLOOR_FLAMES = {
  sewer: 'ember',
  cave: 'ember',
  forge: 'ember',
  cinder: 'gold',
  ice: 'storm',
};

/**
 * Which flame this room's torches burn.
 *
 * ASKED OF THE ROOM IN ORDER OF HOW MUCH IT KNOWS: a room that names a cult
 * knows the most, then one that names its site kind, then its floor. Falls
 * back to plain fire rather than to nothing, because a torch that fails to
 * pick a colour should still be a torch.
 */
export function torchFlameFor(room) {
  if (!room) return TORCH_FLAMES[TORCH_DEFAULT_FLAME];
  const named = room.torchFlame && TORCH_FLAMES[room.torchFlame];
  if (named) return named;
  const cult = room.cult || (room.denSite && room.denSite.cult);
  if (cult && CULT_FLAMES[cult] && TORCH_FLAMES[CULT_FLAMES[cult]]) {
    return TORCH_FLAMES[CULT_FLAMES[cult]];
  }
  const site = room.siteKey || (room.denSite && room.denSite.key);
  if (site && DEN_FLAMES[site] && TORCH_FLAMES[DEN_FLAMES[site]]) {
    return TORCH_FLAMES[DEN_FLAMES[site]];
  }
  if (room.floor && FLOOR_FLAMES[room.floor] && TORCH_FLAMES[FLOOR_FLAMES[room.floor]]) {
    return TORCH_FLAMES[FLOOR_FLAMES[room.floor]];
  }
  return TORCH_FLAMES[TORCH_DEFAULT_FLAME];
}

/** The texture key a recoloured sheet is cached under. `ember` is the art as
 *  packed, so it keeps the plain key and costs no canvas at all. */
export function torchTexFor(flameKey) {
  return (!flameKey || flameKey === TORCH_DEFAULT_FLAME) ? TORCH_TEX : `${TORCH_TEX}_${flameKey}`;
}

// ---------------------------------------------------------------------------
// HOW FAR A TORCH REACHES, IN THE SEWER'S OWN UNITS.
//
// The sewer's darkness is not the night mask -- it is a per-tile tint, and has
// been since round 84 (`_applySewerFog`). So a torch has to speak that
// system's language as well as the lighting round's: it brightens the tiles
// around it, and it throws a coloured glow like any other light. Both come off
// the same numbers so the pool of light and the pool of brightness are the
// same pool.
// ---------------------------------------------------------------------------

/** How many tiles of floor a torch lifts out of the gloom. Four is a little
 *  under half a chamber (chambers are eleven), so a lit corridor is a chain of
 *  pools rather than a continuously lit road -- the same look LAMP_ROAD_SPACING
 *  was chosen for. */
export const TORCH_TILE_REACH = 4;

/** The light it throws, for lighting.js. Radius in world units: four tiles is
 *  128, and a light reaches a little past the ground it brightens. */
export const TORCH_LIGHT_RADIUS = TORCH_TILE_REACH * 32 + 24;

/** How much of a lit tile's brightness comes from the torch, at the centre.
 *  Not 1: a torch makes the floor legible, it does not make it daylight. */
export const TORCH_TILE_LIFT = 0.85;

/** Falloff, as a fraction of full lift, at `d` tiles from the torch. Squared
 *  smoothstep, the same shape `lightFalloff` uses, so the bright patch and the
 *  glow fade together instead of one edge showing through the other. */
export function torchTileFalloff(d) {
  const x = Math.max(0, Math.min(1, d / TORCH_TILE_REACH));
  const s = x * x * (3 - 2 * x);
  return 1 - s;
}

// ---------------------------------------------------------------------------
export function torchFaults() {
  const out = [];
  for (const [k, f] of Object.entries(TORCH_FLAMES)) {
    if (f.key !== k) out.push(`${k}: keyed as ${f.key}`);
    if (typeof f.light !== 'number') out.push(`${k}: throws no coloured light`);
    if (!(f.power > 0)) out.push(`${k}: throws no light at all`);
    if (!(f.sat >= 0) || !(f.lum > 0)) out.push(`${k}: has no palette`);
    if (!f.label) out.push(`${k}: has no label`);
  }
  // FAULT CLASS ONE, STATED AS THE PROPERTY RATHER THAN THE COUNT: every cult
  // in the game must have a flame, and the test is the cult list itself, not
  // "there are ten entries in CULT_FLAMES".
  for (const c of CULTS) {
    if (!CULT_FLAMES[c.slug]) out.push(`cult ${c.slug} has no flame`);
    else if (!TORCH_FLAMES[CULT_FLAMES[c.slug]]) {
      out.push(`cult ${c.slug} burns ${CULT_FLAMES[c.slug]}, which is not a flame`);
    }
  }
  for (const k of Object.keys(CULT_FLAMES)) {
    if (!CULTS.some(c => c.slug === k)) out.push(`CULT_FLAMES names ${k}, which is not a cult`);
  }
  // ...and the same, both ways, for the den kinds.
  for (const k of DEN_SITE_KEYS) {
    if (!DEN_FLAMES[k]) out.push(`den ${k} has no flame`);
    else if (!TORCH_FLAMES[DEN_FLAMES[k]]) out.push(`den ${k} burns ${DEN_FLAMES[k]}, which is not a flame`);
  }
  for (const k of Object.keys(DEN_FLAMES)) {
    if (!DEN_SITE_KEYS.includes(k)) out.push(`DEN_FLAMES names ${k}, which is not a den kind`);
  }
  for (const [k, v] of Object.entries(FLOOR_FLAMES)) {
    if (!TORCH_FLAMES[v]) out.push(`floor ${k} burns ${v}, which is not a flame`);
  }
  if (!TORCH_FLAMES[TORCH_DEFAULT_FLAME]) out.push('the default flame is not a flame');
  if (torchTexFor(TORCH_DEFAULT_FLAME) !== TORCH_TEX) {
    out.push('the default flame does not use the packed sheet');
  }
  if (!(TORCH_TILE_REACH > 0) || !(TORCH_LIGHT_RADIUS > TORCH_TILE_REACH * 32)) {
    out.push('the light does not reach as far as the brightness');
  }
  if (Math.abs(torchTileFalloff(0) - 1) > 1e-9) out.push('a torch is not brightest at the torch');
  if (torchTileFalloff(TORCH_TILE_REACH) !== 0) out.push('the falloff does not reach zero');
  return out;
}
