// ============================================================================
// ROUND 117 -- WHAT A CAST LOOKS LIKE, COMPOSED.
//
// The user: "1) Make pickSpellFx resolve the family and then draw from that
// family's pool, keeping the commissioned sheet as one member. 2) Recombination.
// Compose 2-3 library effects per ability with offsets, scale, tint and timing
// offsets. 3) Runtime particles. Phaser 4's emitters, parameterised per ability."
//
// ----------------------------------------------------------------------------
// WHAT WAS MEASURED FIRST
// ----------------------------------------------------------------------------
// 6,000 abilities generated from 300 real kits through `rebuildKnownAbilities`,
// each run through r116.4's `pickSpellFx`:
//
//     single fixed sheet : 4294 (71.6%) across 18 families
//     library pool draw  : 1706 (28.4%) across 1 pool: impact
//     DISTINCT VISUALS   : 79   = 18 sheets + 61 library effects
//
// Seventy-nine looks for six thousand abilities. `bloom` alone answered 1,655
// of them -- one animation for 27.6% of every ability in the game.
//
// The cause was not a shortage of art. r60 built 1,050 measured effects and
// `FX_POOLS` has a pool for EVERY family the r38 vocabulary can name --
// explosion 191, voidburst 156, lightning 95, bloom 88, sigil 86. `pickSpellFx`
// resolved the family, found it in `FX2_FAMILIES`, and returned the single
// commissioned sheet, so `pickLibraryFx` only ever ran for abilities that
// matched NOTHING -- and when it ran, the same two lookups failed again and it
// landed on `impact`. Nineteen of twenty pools were unreachable from a player
// cast, and ~800 effects were decoded and uploaded to the GPU every boot that
// no ability could ever show.
//
// The inversion is the part worth naming: abilities whose words said something
// SPECIFIC -- ward, hex, thunderbolt -- were exactly the ones locked to one
// animation, while the ones that said nothing got the variety.
//
// ----------------------------------------------------------------------------
// THE THREE LAYERS, AND WHY THEY ARE ONE MODULE
// ----------------------------------------------------------------------------
// They all answer from the same seed, so they belong together. An ability's
// identity picks its base shape, its accents, its offsets and its particles in
// one pass; splitting them would let the base and the accent disagree about
// which ability they are decorating.
//
// This module holds NO Phaser. It returns data. `WorldScene._playSpellFx` is
// the only thing that knows how to draw it, which is what lets the whole thing
// be measured in node -- and this project's own rule is that reading the source
// is not measuring the build.
// ============================================================================

import { FX_POOLS, pickFxEffectSized, fxInfo } from './fxLibrary.js';
import { fxAtlasFor } from './fxAtlas.js';

/** FNV-1a. `Math.imul` because a plain `*` loses the low bits past 2^53. */
export function fxHash(...parts) {
  const s = parts.join('|');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const unit = (...p) => fxHash(...p) / 4294967296;
/** A signed jitter in [-mag, +mag]. */
const jit = (mag, ...p) => (unit(...p) * 2 - 1) * mag;
const pick = (arr, ...p) => arr[fxHash(...p) % arr.length];

// ---------------------------------------------------------------------------
// 1. THE POOL DRAW
//
// The commissioned sheet stays a member rather than the only answer. It is not
// an equal member: it was drawn FOR this family and reads as the family's
// signature, so it keeps a fixed share rather than 1/N of a pool that ranges
// from 12 (`pulse`) to 191 (`explosion`) -- at 1/N the hand-made art for
// explosion would surface once in 192 casts, which is not what "keep it" means.
// ---------------------------------------------------------------------------
export const SHEET_SHARE_DENOM = 8;   // the sheet wins 1 cast in 8

/**
 * The families that CANNOT be pooled, and why.
 *
 * Every effect in the r60 library is a centred 64px square. These five are not
 * squares and are not centred -- WorldScene positions each one specially:
 *
 *   leechspiral / leechdrain  64x245 and 64x256 columns, origin (0.5, 0.96),
 *                             standing ON the ground; the spiral hands its
 *                             spot to the drain for two laps, and `opts.beam`
 *                             turns the column into the line between two
 *                             bodies with the Y scale solved per frame.
 *   dashstreak                laid along the path TRAVELLED, midpoint-anchored,
 *                             rotated to the direction of travel and stretched
 *                             to its screen length.
 *   chainext                  grown link by link from the caster's hands along
 *                             the aim, origin on the anchor link.
 *   boltstrike                32x80, origin (0.5, 1), so the strike POINT lands
 *                             on the monster and the channel hangs above it.
 *
 * Substituting a centred square for any of them does not merely look different,
 * it loses the shape's meaning -- and `test_round40` catches exactly that: the
 * leech two-parter stops chaining and the dash lays an atlas page along the
 * path. Round 117 found this by breaking it. They keep their sheet, always, and
 * gain particles instead.
 *
 * And a second reason, found the same way: `thornshield` and `bubble` are not
 * casts at all. `_updateBuffFx` keeps ONE sprite alive for as long as the buff
 * lasts -- the spiked coat you wear while thorns is up, the rainbow ward around
 * a shield -- and asks `pickSpellFx` for it by template. Both sheets are
 * `loop: true` for that reason. Every library effect is one-shot (`repeat: 0`),
 * so pooling these replaces a worn state with a single flash and the buff then
 * has no visual for the rest of its duration.
 */
export const SHEET_ONLY_FAMILIES = new Set([
  // bespoke geometry
  'leechspiral', 'leechdrain', 'dashstreak', 'chainext', 'boltstrike',
  // persistent worn states driven by _updateBuffFx
  'thornshield', 'bubble',
]);
/** @deprecated the old name, kept so nothing outside this file breaks. */
export const GEOMETRIC_FAMILIES = SHEET_ONLY_FAMILIES;

/** True when this ability should cast the family's hand-made sheet. */
export function sheetWins(seed) {
  return fxHash('sheet', seed) % SHEET_SHARE_DENOM === 0;
}

/**
 * How big this ability's shape should read.
 *
 * The user: "Don't be afraid to scale up or down effects as needed to fit the
 * appropriate size." The library is measured, so the pool is filtered by real
 * radius first (`pickFxEffectSized`) and THEN scaled -- picking a small shape
 * and blowing it up 2x is how you get a blurry ultimate.
 */
export const SIZE_SCALE = { small: 0.72, mid: 1, large: 1.55 };

/**
 * ROUND 117 -- SIZED AGAINST WHAT THE GENERATOR ACTUALLY EMITS.
 *
 * r60's heuristic was `ability.radius >= 90 || ability.aoe`, then
 * `(base || mag) >= 24`. Measured over 6,000 generated abilities, that answers
 * `small` for ALL SIX THOUSAND, because it reads three fields that never mean
 * what it wants:
 *
 *   `radius`      is the PROJECTILE's own radius. p50 is 8. It is never 90.
 *   `aoe`         does not exist. The generator writes `isAoe`.
 *   `base`        is a per-hit figure, p50 7 and max 16 across the whole set.
 *                 It never reaches 24, so the `mid` branch is dead too.
 *
 * So `pickFxEffectSized` has been filtering every pool to its `small` subset
 * since round 60, and r60's own comment -- "an ultimate gets a big shape and a
 * jab a small one" -- has never once been true. This is the same class of fault
 * the handoff warns about: an instrument that was wrong before the build was.
 *
 * What the generator DOES emit, measured: `aoeBand` (small/medium/large/huge),
 * `rangeBand` (melee/short/medium/long/distant), `explodeRadius` (55..98),
 * `category`, and per-kind magnitudes whose real p90s are base 11, healAmount
 * 24, shieldAmount 26, tickAmount 21. Each is read against its own scale rather
 * than against one shared threshold that suits none of them.
 */
const AOE_BAND_SIZE = { small: 'mid', medium: 'mid', large: 'large', huge: 'large' };
const CATEGORY_SIZE = {
  summon: 'large', aura: 'large', 'weapon summon': 'large', 'armor summon': 'large',
  'gear summon': 'large', healing: 'mid', defensive: 'mid', buff: 'mid',
  stacking: 'mid', restore: 'mid', movement: 'small', perception: 'small',
  'passive buff': 'small', 'weapon affinity': 'small', unarmed: 'small',
};

export function sizeOf(ability) {
  if (ability.fxSize) return ability.fxSize;
  // An explicit band from the generator beats everything else.
  if (ability.aoeBand && AOE_BAND_SIZE[ability.aoeBand]) return AOE_BAND_SIZE[ability.aoeBand];
  if (ability.explodeRadius >= 70) return 'large';
  if (ability.explodeRadius >= 40 || ability.isAoe) return 'mid';
  // Magnitude, each against its own measured p90 rather than a shared number.
  if ((ability.base || 0) >= 11 || (ability.healAmount || 0) >= 24
      || (ability.shieldAmount || 0) >= 26 || (ability.tickAmount || 0) >= 21) return 'mid';
  const byCat = CATEGORY_SIZE[ability.category];
  if (byCat) return byCat;
  if (ability.rangeBand === 'distant') return 'large';
  if (ability.rangeBand === 'melee') return 'small';
  return 'mid';
}

// ---------------------------------------------------------------------------
// 2. RECOMBINATION
//
// A cast is a BASE plus up to two ACCENTS. The accents are drawn from other
// pools -- chosen for what they do to the read, not at random -- and each
// carries its own offset, scale, delay, alpha and tint.
//
// Delay is what makes this composition rather than clutter. Three shapes on
// the same frame are a smear; a rune that flares, then a burst 90ms later, then
// dust settling 200ms after that is a cast with a beginning and an end.
// ---------------------------------------------------------------------------

/** What reads well UNDER and OVER each base family. Hand-chosen. */
export const ACCENTS = {
  explosion:   { under: ['runecircle', 'cracks'], over: ['puff', 'impact'] },
  impact:      { under: ['cracks'], over: ['puff', 'slash'] },
  slash:       { under: [], over: ['impact', 'puff'] },
  bloom:       { under: ['runecircle', 'goldring'], over: ['bloom', 'puff'] },
  sigil:       { under: ['runecircle'], over: ['voidburst', 'puff'] },
  runecircle:  { under: ['goldring'], over: ['bloom', 'sigil'] },
  voidburst:   { under: ['runecircle'], over: ['voidburst', 'puff'] },
  lightning:   { under: ['cracks'], over: ['impact', 'boltstrike'] },
  boltstrike:  { under: ['runecircle'], over: ['impact', 'lightning'] },
  cracks:      { under: [], over: ['puff', 'impact'] },
  rain:        { under: ['runecircle'], over: ['puff'] },
  chainext:    { under: [], over: ['impact', 'slash'] },
  leechspiral: { under: ['runecircle'], over: ['voidburst'] },
  thornshield: { under: ['runecircle'], over: ['cracks'] },
  bubble:      { under: ['runecircle'], over: ['bloom'] },
  pulse:       { under: ['goldring'], over: ['bloom'] },
  goldring:    { under: [], over: ['bloom', 'runecircle'] },
  summonring:  { under: ['runecircle'], over: ['voidburst', 'bloom'] },
  puff:        { under: [], over: ['impact'] },
  dashstreak:  { under: [], over: ['puff', 'impact'] },
};

/** How many accents an ability of this size earns. Big spells get more. */
function accentCount(size, seed) {
  const r = unit('acc', seed);
  if (size === 'large') return r < 0.25 ? 1 : 2;
  if (size === 'mid') return r < 0.45 ? 1 : 2;
  return r < 0.55 ? 0 : 1;
}

/** One playable layer, resolved from a library id. */
function libLayer(id, opts) {
  const at = id == null ? null : fxAtlasFor(id);
  if (!at) return null;
  const info = fxInfo(id) || {};
  return {
    lib: true, id, key: at.key, start: at.start, end: at.end, frames: at.frames,
    scale: 1, dx: 0, dy: 0, delayMs: 0, alpha: 1, rotate: 0,
    blend: null, tint: null, role: 'base',
    shape: info.shape, motion: info.motion, size: info.size,
    spins: info.spins, persists: info.persists,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// 3. RUNTIME PARTICLES
//
// Parameterised off the ability, not off a table of presets: the element sets
// the palette and the physics, the family sets the SHAPE of the emission, the
// size sets the count and the reach, and the seed jitters everything so two
// fire novas in one kit do not throw identical sparks.
//
// BUDGETED. `maxParticles` is a hard ceiling per emitter and WorldScene keeps a
// concurrent-emitter cap, because a damage aura in a pack of twelve is the
// worst case and it is not rare. A spell that drops the frame rate is a spell
// nobody keeps.
// ---------------------------------------------------------------------------

/** Per-element physics. Fire rises, frost drifts down, lightning snaps out. */
export const ELEMENT_PARTICLES = {
  fire:      { speed: [30, 90],  lifespan: [380, 620], gravityY: -70, blend: 'ADD',    tint: [0xff8347, 0xffd08a, 0xff5a1f] },
  frost:     { speed: [18, 55],  lifespan: [520, 900], gravityY: 32,  blend: 'ADD',    tint: [0x72ffd3, 0xbdfff0, 0x39cfae] },
  lightning: { speed: [70, 190], lifespan: [140, 300], gravityY: 0,   blend: 'ADD',    tint: [0xfefa9d, 0xffffff, 0xffe14d] },
  nature:    { speed: [22, 70],  lifespan: [520, 950], gravityY: 18,  blend: 'NORMAL', tint: [0x97f963, 0x5fbf3a, 0xd6ffa8] },
  shadow:    { speed: [16, 60],  lifespan: [600, 1000], gravityY: -18, blend: 'NORMAL', tint: [0x9e4e8c, 0x5c2d55, 0xc98fbb] },
  radiant:   { speed: [34, 110], lifespan: [400, 720], gravityY: -34, blend: 'ADD',    tint: [0xffe79d, 0xffffff, 0xffd45e] },
  physical:  { speed: [40, 120], lifespan: [260, 460], gravityY: 90,  blend: 'NORMAL', tint: [0xb0bec5, 0xe0e0e0, 0x8d9aa1] },
};

/** Per-family emission shape. `mode` is what WorldScene builds the emitter as. */
export const FAMILY_EMISSION = {
  explosion:   { mode: 'burst', spread: 360, count: 18, radius: 6 },
  impact:      { mode: 'burst', spread: 360, count: 10, radius: 4 },
  slash:       { mode: 'arc',   spread: 110, count: 12, radius: 10 },
  bloom:       { mode: 'rise',  spread: 70,  count: 12, radius: 14 },
  sigil:       { mode: 'ring',  spread: 360, count: 14, radius: 22 },
  runecircle:  { mode: 'ring',  spread: 360, count: 16, radius: 26 },
  voidburst:   { mode: 'inward', spread: 360, count: 16, radius: 30 },
  lightning:   { mode: 'burst', spread: 360, count: 14, radius: 5 },
  boltstrike:  { mode: 'fall',  spread: 25,  count: 12, radius: 8 },
  cracks:      { mode: 'ground', spread: 360, count: 12, radius: 18 },
  rain:        { mode: 'fall',  spread: 40,  count: 20, radius: 26 },
  chainext:    { mode: 'arc',   spread: 60,  count: 8,  radius: 6 },
  leechspiral: { mode: 'inward', spread: 360, count: 12, radius: 24 },
  thornshield: { mode: 'ring',  spread: 360, count: 12, radius: 20 },
  bubble:      { mode: 'ring',  spread: 360, count: 10, radius: 24 },
  pulse:       { mode: 'ring',  spread: 360, count: 10, radius: 22 },
  goldring:    { mode: 'ring',  spread: 360, count: 12, radius: 24 },
  summonring:  { mode: 'rise',  spread: 90,  count: 14, radius: 20 },
  puff:        { mode: 'rise',  spread: 120, count: 8,  radius: 10 },
  dashstreak:  { mode: 'arc',   spread: 40,  count: 10, radius: 6 },
};

export const PARTICLE_HARD_CAP = 34;   // per emitter, before size scaling

/** Weighted mix of two 0xRRGGBB colours. */
function mixTowards(a, b, w) {
  const ch = (sh) => Math.round((((a >> sh) & 255) * (1 - w)) + (((b >> sh) & 255) * w));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** The emitter spec for one ability. Null when the family has no emission. */
export function particlesFor(family, element, size, seed, castTint) {
  const em = FAMILY_EMISSION[family];
  if (!em) return null;
  const el = ELEMENT_PARTICLES[element] || ELEMENT_PARTICLES.physical;
  const s = SIZE_SCALE[size] || 1;
  const n = Math.min(PARTICLE_HARD_CAP, Math.round(em.count * (0.65 + 0.55 * s)));
  const spin = 1 + jit(0.18, 'psp', seed);
  return {
    mode: em.mode,
    count: n,
    radius: Math.round(em.radius * s),
    spread: em.spread,
    angleOffset: Math.round(unit('pang', seed) * 360),
    speedMin: Math.round(el.speed[0] * s * spin),
    speedMax: Math.round(el.speed[1] * s * spin),
    lifespanMin: Math.round(el.lifespan[0] * (0.85 + 0.3 * unit('plf', seed))),
    lifespanMax: Math.round(el.lifespan[1] * (0.85 + 0.3 * unit('plf2', seed))),
    gravityY: el.gravityY,
    blend: el.blend,
    // ROUND 118 -- the sparks are pulled toward the cast's own colour. The
    // element still sets the PHYSICS (fire rises, frost drifts down) because
    // that is what the damage type actually means for how a spark moves; the
    // palette follows the essence, so a Volcano cast does not throw magenta.
    tint: castTint == null ? el.tint : el.tint.map(c => mixTowards(c, castTint, 0.55)),
    scaleStart: Math.round((0.45 + 0.5 * s) * 100) / 100,
    scaleEnd: 0,
    alphaStart: 0.9,
    alphaEnd: 0,
    delayMs: Math.round(unit('pdel', seed) * 60),
  };
}

// ---------------------------------------------------------------------------
// THE COMPOSER
// ---------------------------------------------------------------------------

/**
 * Everything one cast draws, from one seed.
 *
 * `layers[0]` is always the base and is always playable on its own -- a caller
 * that only knows how to draw one sprite can use it and lose the accents
 * rather than lose the cast. That is deliberate: `_playSpellFx` is not the only
 * thing in WorldScene that has ever been handed an fx spec.
 */
export function composeFx(ability, family, opts = {}) {
  const seed = `${ability.name || ''}|${ability.catKey || ability.template || ''}`;
  const size = sizeOf(ability);
  const baseScale = SIZE_SCALE[size] || 1;
  const fam = FX_POOLS[family] ? family : 'impact';

  const baseId = pickFxEffectSized(fam, seed, size);
  const base = libLayer(baseId, {
    scale: baseScale, role: 'base',
    rotate: fxInfo(baseId) && fxInfo(baseId).spins ? 0 : jit(0.35, 'rot', seed),
  });
  if (!base) return null;

  const layers = [base];
  const spec = ACCENTS[fam] || { under: [], over: [] };
  const want = accentCount(size, seed);

  // UNDER first, so it is behind the base when both are on screen. An under
  // layer is wider, dimmer and starts fractionally EARLY -- it is the ground
  // answering before the thing lands.
  if (want >= 1 && spec.under.length) {
    const uf = pick(spec.under, 'uf', seed);
    const uid = pickFxEffectSized(uf, `${seed}|under`, size === 'small' ? 'mid' : 'large');
    const u = libLayer(uid, {
      role: 'under', scale: baseScale * (1.25 + jit(0.12, 'us', seed)),
      dx: jit(3, 'udx', seed), dy: 4 + jit(3, 'udy', seed),
      delayMs: 0, alpha: 0.55 + jit(0.1, 'ua', seed), under: true,
    });
    if (u) layers.push(u);
  }

  // OVER last, smaller, offset, and LATE -- the spark that follows the blow.
  if (want >= (spec.under.length ? 2 : 1) && spec.over.length) {
    const of = pick(spec.over, 'of', seed);
    const oid = pickFxEffectSized(of, `${seed}|over`, size === 'large' ? 'mid' : 'small');
    const o = libLayer(oid, {
      role: 'over', scale: baseScale * (0.62 + jit(0.14, 'os', seed)),
      dx: jit(14, 'odx', seed), dy: -6 + jit(10, 'ody', seed),
      delayMs: 70 + Math.round(unit('od', seed) * 150),
      alpha: 0.9, blend: 'ADD',
    });
    if (o) layers.push(o);
  }

  const element = ability.element || opts.element || null;
  return {
    lib: true, composed: true, family: fam, size, seed,
    // ROUND 64's flag, carried through composition. `generic` means "the
    // library guessed" -- the family came from a fallback, not from the
    // ability's own words. WorldScene's leech-siphon override reads it to
    // decide whether anything else has claimed the projectile, and round 117
    // reintroduced exactly the bug round 64 fixed by not setting it: the
    // composed spec was always truthy and never generic, so the override
    // stopped firing and the siphon art disappeared a second time.
    generic: !!opts.generic,
    // The base's own fields are hoisted so this spec is still a valid
    // single-layer library spec for any caller that does not know about layers.
    id: base.id, key: base.key, start: base.start, end: base.end, frames: base.frames,
    shape: base.shape, motion: base.motion, spins: base.spins, persists: base.persists,
    color: ability.color || null,
    // ROUND 118 -- the resolved cast colour, decided by spellFx.castTintFor from
    // the ESSENCE that produced this ability rather than from its damage channel
    // or its stone. WorldScene prefers it over both.
    tint: opts.tint != null ? opts.tint : null,
    element,
    layers,
    particles: particlesFor(fam, element || 'physical', size, seed, opts.tint),
  };
}

/** Every distinct visual this composer can produce for a set of abilities. */
export function signatureOf(fx) {
  if (!fx) return 'none';
  if (!fx.layers) return `sheet:${fx.family}:${fx.color || ''}`;
  return fx.layers.map(l => `${l.id}@${l.scale.toFixed(2)}`).join('+')
    + (fx.particles ? `|p:${fx.particles.mode}:${fx.particles.count}` : '');
}
