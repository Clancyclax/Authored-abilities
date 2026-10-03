// ===========================================================================
// ROUND 249 -- LIGHT.
//
// The user, asked how hard this would be and told it is a mask with holes
// punched in it: "I'm onboard with the masking using occlusion keying off of
// the obstacle rectangles and collision data." And, kicking the round off:
//
//   "a little flickering, or flame like light swaying. Or magical light
//    pulsing softly is ideal."
//   "Obviously lava glowing, and fire or lava attacks glowing as well."
//
// TWO LAYERS, AND THEY ANSWER DIFFERENT HALVES OF THAT SENTENCE.
//
// ROUND 260 -- and a third source, the torch. Its light specs are DERIVED at
// the bottom of this file from the flames torches.js authors, rather than
// written out a second time here. torches.js imports nothing from this file,
// so the direction is one way and there is no cycle.
//
//   THE DARKNESS MASK makes night dark and lets a lamp carve a hole in it. It
//   is what "lighting" means at 23:00 and it does nothing at noon, because at
//   noon there is no darkness to carve.
//
//   THE GLOW LAYER is additive and runs at every hour. Lava glows at midday;
//   so does a fire spell. A mask alone would have given a lava field that
//   looked molten at night and like orange rock at lunchtime, which is the
//   wrong half of what was asked for.
//
// WHY THE MOVEMENT MATHS IS HERE, AND PURE. A flicker is the part of this that
// is easy to get subtly wrong -- too fast and it strobes, too regular and it
// reads as a pulse rather than a flame, too deep and the whole street throbs.
// It is also the part a screenshot cannot check. So it is a pure function of
// (kind, time, seed) with no scene in it, and the suite asserts its
// properties: that a flame never repeats on a short loop, that a pulse does,
// that neither ever goes dark or doubles in size.
//
// THE SEED IS THE LIGHT'S OWN POSITION. Two lamps on the same street must not
// flicker in step -- a row of lamps blinking together is a light show, not a
// street -- and seeding off the position means a given lamp always behaves the
// same way, which is what stops it changing character when the viewport pools
// it out and back in. That is the same rule round 246 used for which lamp
// stands where, and round 84's tint bug is what both are avoiding.
// ===========================================================================

/**
 * The four ways a light moves.
 *
 * Each is a small sum of sines rather than noise, deliberately: sines are
 * cheap, they are exactly reproducible from a time and a seed (so a light does
 * not jump when it is pooled), and by choosing incommensurable periods the sum
 * does not visibly repeat. A random walk would need state per light and would
 * make the look depend on frame rate.
 */
import { TORCH_FLAMES, TORCH_LIGHT_RADIUS } from './torches.js';

export const LIGHT_KINDS = {
  // "a little flickering, or flame like light swaying". Two fast components
  // and a slow one: the fast pair is the flicker, the slow one is the sway.
  // The sway also moves the light SIDEWAYS, which is what separates a flame
  // from a bulb with a loose connection.
  flame: {
    amp: 0.11, sway: 3.2,
    terms: [[7.3, 0.55], [11.7, 0.30], [1.9, 0.15]],
    warm: true,
  },
  // "magical light pulsing softly". One slow component, and a much smaller
  // amplitude than the flame -- soft is the instruction, and a magical light
  // that swung as hard as a torch would read as a failing one.
  magic: {
    amp: 0.07, sway: 0,
    terms: [[1.15, 1.0]],
    warm: false,
  },
  // Lava and embers: slower and deeper than either, because a lava field
  // breathes rather than flickers. No sway at all: the ground does not move.
  ember: {
    amp: 0.16, sway: 0,
    terms: [[0.55, 0.7], [0.23, 0.3]],
    warm: true,
  },
  // A spell in flight. Steady, because it is only on screen for a moment and
  // a flickering fireball reads as a rendering fault rather than as fire.
  spell: {
    amp: 0.0, sway: 0,
    terms: [],
    warm: true,
  },
};

export const LIGHT_KIND_KEYS = Object.keys(LIGHT_KINDS);

/**
 * How bright this light is right now, and how far it has swayed.
 *
 * `t` is seconds. `seed` is any number -- the light's position works well and
 * is what the scene passes. Returns `{ scale, dx, dy }`, where `scale`
 * multiplies the light's radius and its brightness together, because a real
 * flame that dips gets both smaller and dimmer and moving them separately
 * looks like two effects.
 *
 * NEVER RETURNS ZERO OR MORE THAN 1.35. A light that reaches zero blinks out,
 * which no lamp does; one that overshoots pops. The clamp is part of the
 * contract rather than a safety net, and the suite asserts it over a long
 * sample rather than trusting the arithmetic.
 */
export function lightPhase(kind, t, seed = 0) {
  const k = LIGHT_KINDS[kind] || LIGHT_KINDS.magic;
  // A per-light phase offset, so two lamps on one street are never in step.
  // Hashed rather than random: the same lamp gets the same offset for the
  // whole session and across a pool-out and back.
  const ph = ((Math.imul(Math.round(seed) | 0, 0x9e3779b1) >>> 0) % 6283) / 1000;
  let v = 0;
  for (const [freq, weight] of k.terms) v += Math.sin(t * freq + ph * freq) * weight;
  const total = k.terms.reduce((n, [, w]) => n + w, 0) || 1;
  const scale = 1 + (v / total) * k.amp;
  const sway = k.sway ? Math.sin(t * 0.9 + ph) * k.sway : 0;
  return {
    scale: Math.max(0.5, Math.min(1.35, scale)),
    dx: sway,
    dy: k.sway ? Math.cos(t * 0.7 + ph) * k.sway * 0.4 : 0,
  };
}

// ---------------------------------------------------------------------------
// WHAT EACH LAMP GIVES OFF.
//
// Keyed on the lamp keys round 246 declared, so the two tables cannot drift
// apart -- and `lightingFaults` below refuses a lamp with no light, which is
// what makes adding a lamp in a later round a thing that fails loudly rather
// than one that quietly stands in the dark.
//
// The COLOURS are read off the art rather than invented: the furnace lamp is
// orange because its lantern is drawn burning, the blue-flame post is blue
// because its flame is, the orb cradle is pale because it is. A lamp whose
// light does not match its own picture reads as a bug even when nobody can say
// why.
// ---------------------------------------------------------------------------
export const LAMP_LIGHTS = {
  orbCradle:   { kind: 'magic', color: 0xdfe8ff, radius: 130, power: 0.85 },
  frostTree:   { kind: 'magic', color: 0xcfe6ff, radius: 105, power: 0.70 },
  blueFlame:   { kind: 'flame', color: 0x9fd4ff, radius: 115, power: 0.80 },
  townHook:    { kind: 'flame', color: 0xffd08a, radius: 120, power: 0.90 },
  ironCross:   { kind: 'flame', color: 0xffca80, radius: 115, power: 0.85 },
  copperShade: { kind: 'flame', color: 0xffdca0, radius: 110, power: 0.80 },
  clockwork:   { kind: 'flame', color: 0xffd9a6, radius: 125, power: 0.85 },
  coilBronze:  { kind: 'magic', color: 0xbdf0d8, radius: 115, power: 0.75 },
  candelabra:  { kind: 'flame', color: 0xfff0c2, radius: 135, power: 0.95 },
  groveTree:   { kind: 'magic', color: 0xa8e6b8, radius: 110, power: 0.70 },
  lashedBeam:  { kind: 'flame', color: 0xffd79a, radius: 105, power: 0.75 },
  stonePillar: { kind: 'magic', color: 0xc9b8ff, radius: 120, power: 0.75 },
  furnace:     { kind: 'ember', color: 0xff9147, radius: 145, power: 1.00 },
  ironPlated:  { kind: 'flame', color: 0xffb877, radius: 115, power: 0.85 },
  batSkull:    { kind: 'magic', color: 0x9f7fd8, radius: 100, power: 0.65 },
  gothicHook:  { kind: 'flame', color: 0xffc98a, radius: 110, power: 0.80 },
  signpost:    { kind: 'flame', color: 0xff9a6b, radius: 95,  power: 0.70 },
};

/** Lava, and the fire that comes off a spell. Not lamps -- these are lights
 *  the WORLD emits, and they glow at every hour rather than only after dark. */
export const GLOW_SOURCES = {
  lava:      { kind: 'ember', color: 0xff6a1f, radius: 90,  power: 0.85, glow: 0.55 },
  fireSpell: { kind: 'spell', color: 0xffa23a, radius: 120, power: 1.00, glow: 0.75 },
  lavaSpell: { kind: 'spell', color: 0xff5a14, radius: 130, power: 1.00, glow: 0.85 },
};

/** The light a lamp gives off, or null for one nobody has lit. */
export function lightForLamp(lampKey) {
  return LAMP_LIGHTS[lampKey] || null;
}

// ---------------------------------------------------------------------------
// ROUND 260 -- THE TORCHES.
//
//   4.3) "...have torches in the new lighting system to cast light along the
//         main path."
//
// DERIVED FROM THE FLAMES RATHER THAN WRITTEN BESIDE THEM. Nine flames and
// nine light specs, hand-kept in two files, is fault class three -- the list
// beside the generator that drifts. torches.js already says what colour each
// flame throws and how hard; this builds the spec from that, so a flame added
// in a later round arrives here lit, and one whose colour is changed changes
// here too.
//
// The KIND is 'flame' for every one of them, including the cold ones: 'kind'
// picks the FLICKER, not the colour, and a blue torch flickers like a torch.
// ---------------------------------------------------------------------------
export const TORCH_LIGHTS = Object.fromEntries(
  Object.entries(TORCH_FLAMES).map(([k, f]) => [k, {
    kind: 'flame',
    color: f.light,
    radius: TORCH_LIGHT_RADIUS,
    power: f.power,
    // Unlike a street lamp, a torch's own fire is DRAWN, so it throws a halo
    // at every hour rather than only after dark -- the same reason lava does.
    // This is the number that makes a sewer torch visible at noon.
    glow: 0.45,
  }]),
);

/** The light this flame throws, or null for a flame nobody has authored. */
export function lightForTorch(flameKey) {
  return TORCH_LIGHTS[flameKey] || null;
}

/**
 * Which glow a spell of this element throws.
 *
 * "fire or lava attacks glowing as well" -- and the element names come from
 * stats.js, so this maps rather than guesses. Everything that is not a fire
 * family throws no light: a frost bolt that glowed warm would be worse than
 * one that did not glow at all.
 */
export function glowForElement(element) {
  if (element === 'fire') return GLOW_SOURCES.fireSpell;
  if (element === 'lava' || element === 'magma') return GLOW_SOURCES.lavaSpell;
  return null;
}

/** How much of the mask a light of this power and radius erases, at distance
 *  `d` from its centre. Used by the suite to assert the falloff is smooth and
 *  reaches zero, rather than by the renderer, which uses a gradient texture. */
export function lightFalloff(d, radius) {
  if (!(radius > 0)) return 0;
  const x = Math.max(0, Math.min(1, d / radius));
  // Smoothstep, inverted: full at the centre, nothing at the edge, and no
  // hard rim -- a linear falloff leaves a visible circle edge on flat ground.
  const s = x * x * (3 - 2 * x);
  return 1 - s;
}

export function lightingFaults(lampKeys = Object.keys(LAMP_LIGHTS)) {
  const out = [];
  for (const [k, spec] of Object.entries(LAMP_LIGHTS)) {
    if (!LIGHT_KINDS[spec.kind]) out.push(`${k}: unknown light kind ${spec.kind}`);
    if (!(spec.radius > 0)) out.push(`${k}: has no radius`);
    if (!(spec.power > 0)) out.push(`${k}: gives no light`);
    if (typeof spec.color !== 'number') out.push(`${k}: has no colour`);
  }
  // Every lamp in the world must be lit, or a later round adds a lamp model
  // and it stands in the dark with no error anywhere.
  for (const k of lampKeys) {
    if (!LAMP_LIGHTS[k]) out.push(`lamp ${k} has no light`);
  }
  for (const [k, spec] of Object.entries(GLOW_SOURCES)) {
    if (!LIGHT_KINDS[spec.kind]) out.push(`glow ${k}: unknown kind ${spec.kind}`);
    if (!(spec.glow > 0)) out.push(`glow ${k}: does not glow`);
  }
  // ROUND 260 -- and the torches, by the same three questions. Stated as the
  // property rather than the count, so a flame added later is checked here
  // without this list being touched.
  for (const [k, spec] of Object.entries(TORCH_LIGHTS)) {
    if (!LIGHT_KINDS[spec.kind]) out.push(`torch ${k}: unknown light kind ${spec.kind}`);
    if (!(spec.radius > 0)) out.push(`torch ${k}: has no radius`);
    if (!(spec.power > 0)) out.push(`torch ${k}: gives no light`);
    if (!(spec.glow > 0)) out.push(`torch ${k}: its own fire is drawn and throws no halo`);
    if (typeof spec.color !== 'number') out.push(`torch ${k}: has no colour`);
  }
  for (const k of Object.keys(TORCH_FLAMES)) {
    if (!TORCH_LIGHTS[k]) out.push(`flame ${k} throws no light`);
  }
  // The spell kind must be steady: a flickering projectile reads as a fault.
  if ((LIGHT_KINDS.spell.terms || []).length) out.push('the spell light flickers');
  // ...and the soft one must be softer than the flame, which is the whole
  // distinction the user drew between them.
  if (!(LIGHT_KINDS.magic.amp < LIGHT_KINDS.flame.amp)) {
    out.push('the magical pulse is not softer than the flame flicker');
  }
  if (LIGHT_KINDS.magic.sway) out.push('a magical light should not sway like a flame');
  return out;
}
