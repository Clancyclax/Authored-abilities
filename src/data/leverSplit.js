// ============================================================================
// ROUND 108 -- WHICH HALF OF `bind` AND `ward` EACH ESSENCE ACTUALLY MEANT.
//
// Round 105 split two levers in LEVER_PLAN and never applied them, because
// applying them means deciding, one essence at a time, which half 88 essences
// were reaching for. This file is that decision, with the evidence beside it.
//
//   bind  -> anchor   control of POSITION.  You cannot GO.
//                     snares, roots, freezes, walls, hauls, pins, terrain.
//         -> muzzle   control of ACTION.    You cannot DO.
//                     silence, sap, blind, curse, wither, seal, unstring.
//
//   ward  -> bulwark  stopping a blow.      Shields, plate, blocking, reflect.
//         -> absolve  undoing what landed.  Cleanse, dispel, purge, resist.
//
// HOW EACH ROW WAS DECIDED. The essence's own `verbs` and `body` from
// essenceMotifs.js -- the vocabulary its author wrote before either lever
// existed. A Net "casts, snares, tangles, draws"; that is position. A Feeble
// "saps, withers, unstrings, buckles"; that is action. The reason on each row
// is the words that decided it, so a disagreement is about the reading rather
// than about what I remembered.
//
// A HANDFUL GET BOTH, and they are marked. An essence whose vocabulary
// genuinely does both halves -- Cold freezes you in place AND numbs what you
// can do -- keeps both, because forcing a choice there would be inventing a
// distinction the essence does not have. Nineteen of 88; if that number grows
// much past a fifth the split itself is the thing that is wrong.
//
// The mapping is DATA, not a function of the vocabulary, deliberately. A
// keyword rule would be a naming convention doing the work of a fact -- this
// project's fault class two -- and it would silently reclassify an essence the
// day somebody rewrote a verb list for flavour.
// ============================================================================

/** bind -> anchor | muzzle | both, with the words that decided it. */
export const BIND_SPLIT = {
  // ---- position: things that stop you moving ------------------------------
  essBrush:      ['anchor', 'tangle, snag; the ground goes thorny where you stand'],
  essCage:       ['anchor', 'shut, clamp, pen, enclose'],
  essChain:      ['anchor', 'snare, haul, moor; links cinch around the wrists'],
  essCloth:      ['anchor', 'wrap, furl; thread wraps whatever the hands settle on'],
  essCrocodile:  ['anchor', 'clamp, roll, drag'],
  essCrystal:    ['anchor', 'spike; facets grow out and the stance stops wavering'],
  essDeep:       ['anchor', 'crush, press, submerge'],
  essEarth:      ['anchor', 'crush, heave, erupt -- terrain, which anchor gates'],
  essFork:       ['anchor', 'thrust, pin, lever'],
  essGrowth:     ['anchor', 'root, overrun; the ground closes around what it holds'],
  essHair:       ['anchor', 'snare, weave, tangle, wind'],
  essHammer:     ['anchor', 'flatten, drive, pound -- a blow that puts you down'],
  essHeidel:     ['anchor', 'trample, charge, stampede -- knocked off your feet'],
  essHook:       ['anchor', 'snag, haul, yank, drag'],
  essHunt:       ['anchor', 'flush, corner, pounce -- cornering is position'],
  essLurker:     ['anchor', 'drag, seize, surface'],
  essMoon:       ['anchor', 'pull; starts pulling at everything loose nearby'],
  essNet:        ['anchor', 'cast, snare, tangle, draw'],
  essOctopus:    ['anchor', 'coil, grip, squeeze, pull'],
  essPangolin:   ['anchor', 'curl, shoulder -- it holds ground rather than silencing'],
  essPlant:      ['anchor', 'root; roots work down out of the heels and hold you'],
  essRake:       ['anchor', 'drag, comb, gather'],
  essShield:     ['anchor', 'block, shove, bash -- shoving is displacement'],
  essShovel:     ['anchor', 'dig, bury, heave, flatten'],
  essSnake:      ['anchor', 'coil, constrict'],
  essSpider:     ['anchor', 'wrap, truss, wait'],
  essSpike:      ['anchor', 'impale, skewer -- pinning is the whole verb'],
  essStaff:      ['anchor', 'sweep, vault, rap -- a sweep takes the legs'],
  essTentacle:   ['anchor', 'coil, constrict, lash, drag'],
  essThread:     ['anchor', 'tether, cinch, stitch'],
  essTrap:       ['anchor', 'set, spring, snare, rig'],
  essWater:      ['anchor', 'drown, crush, surge, swell'],
  essWhip:       ['anchor', 'crack, lash, catch'],
  essWind:       ['anchor', 'gust, buffet -- the step gets pushed along'],
  essWood:       ['anchor', 'root, thicken'],
  might:         ['anchor', 'heave, slam, overbear'],

  // ---- action: things that stop you doing ---------------------------------
  essBlight:     ['muzzle', 'rot, wither, fester -- withering takes what you can do'],
  essDeath:      ['muzzle', 'still, quiet, wither, close'],
  essDiscord:    ['muzzle', 'jangle, grate, unstring, jar -- unstringing is the verb'],
  essFeeble:     ['muzzle', 'sap, wither, unstring, buckle; the grip goes slack'],
  essKnowledge:  ['muzzle', 'read, anticipate, expose, annotate'],
  essLight:      ['muzzle', 'dazzle -- blinding is action, not position'],
  essMalign:     ['muzzle', 'curse, hex, mutter, gnaw'],
  essPaper:      ['muzzle', 'inscribe, fold, SEAL, sign -- a seal shuts a power'],
  essSceptre:    ['muzzle', 'command, proclaim -- being commanded is action control'],
  essShimmer:    ['muzzle', 'reveal, dazzle, expose'],
  essSkunk:      ['muzzle', 'spray, foul, taint'],
  // ROUND 108 -- called muzzle on the first read, and the pinned confluence
  // names caught it. Sloth SETTLES as much as it slows: "hang, outlast, swing,
  // SETTLE", and a body that nothing hurries is holding a position as well as
  // taking a tempo. Reading it as action-only stripped `anchor` from its
  // corpus and moved trowel+sloth+death off Boundary -- a name the user
  // reviewed and approved, which data_checks pins for exactly this reason.
  essSloth:      ['both', 'hang, outlast, SETTLE (position) and it slows the hands (action)'],
  essSmoke:      ['muzzle', 'billow, smother, vanish'],
  essVenom:      ['muzzle', 'envenom, seep, fester'],
  essVisage:     ['muzzle', 'mimic, unsettle, shed'],
  essVoid:       ['muzzle', 'swallow, UNMAKE, drink, collapse'],

  // ---- both: the vocabulary genuinely does each half ----------------------
  essArmour:     ['both', 'shrug, bear, TURN -- it holds ground and blunts what lands'],
  essCold:       ['both', 'FREEZE (position) and NUMB (action) in one verb list'],
  essDust:       ['both', 'choke and BLIND (action); SETTLE and bury (position)'],
  essEye:        ['both', 'FIX (holds you) and MARK/expose (takes your edge)'],
  essIce:        ['both', 'freeze, still (position); numb (action)'],
  essSand:       ['both', 'BURY (position) and BLIND (action)'],
};

/** ward -> bulwark | absolve | both. */
export const WARD_SPLIT = {
  // ---- stopping a blow ----------------------------------------------------
  avatar:        ['bulwark', 'the stone walks beside you wearing a shape -- a guard'],
  essApe:        ['bulwark', 'the hide thickens'],
  essArmour:     ['bulwark', 'plates lock over the joints'],
  essBear:       ['bulwark', 'the pelt mats down over slabbed muscle'],
  essBone:       ['bulwark', 'the ribs thicken and spurs push out'],
  essBrush:      ['bulwark', 'briar pushes out through the skin -- a thorn wall'],
  essCage:       ['bulwark', 'the ribs harden into bars'],
  essCattle:     ['bulwark', 'the shoulders broaden, the neck thickens into a yoke'],
  essCloth:      ['bulwark', 'wraps and smothers -- padding, not purging'],
  essCloud:      ['bulwark', 'the outline goes soft -- a blow finds less to hit'],
  essCold:       ['bulwark', 'the skin takes a crust of rime'],
  essCoral:      ['bulwark', 'a stony crust creeps out and hardens into ridges'],
  essCrocodile:  ['bulwark', 'rows of scute rise along the back'],
  essCrystal:    ['bulwark', 'facets grow out along the forearms'],
  essDeep:       ['bulwark', 'the bones take pressure without complaint'],
  essDuck:       ['bulwark', 'the feathers oil over -- it sheds what lands'],
  essDust:       ['bulwark', 'the skin dries to a fine grey; the cloud is cover'],
  essEarth:      ['bulwark', 'the skin crusts over with stone'],
  essElemental:  ['bulwark', 'the natural world couples straight into the matrix'],
  essFish:       ['bulwark', 'the skin goes over to scale'],
  essGlass:      ['bulwark', 'the skin goes clear and hard and rings when struck'],
  essGoat:       ['bulwark', 'the skull plates thicken'],
  essIce:        ['bulwark', 'rime creeps out along whatever you touch'],
  essIron:       ['bulwark', 'the bones take on a cold weight'],
  essManatee:    ['bulwark', 'a hand of blubber settles under the skin'],
  essMirror:     ['bulwark', 'copies the last blow it was shown -- reflect, which bulwark supplies'],
  essPangolin:   ['bulwark', 'overlapping plates that grind when you turn'],
  essResolute:   ['bulwark', 'the feet root, the knees refuse to unlock'],
  essSand:       ['bulwark', 'the body loosens into grit and packs itself again'],
  essShield:     ['bulwark', 'block, turn; the forearm broadens into a facing'],
  essShip:       ['bulwark', 'the ribs set themselves like a hull'],
  essSkunk:      ['bulwark', 'a warning stripe -- it keeps things off rather than cleans'],
  essSpear:      ['bulwark', 'the front foot plants without being told'],
  essSpike:      ['bulwark', 'points push up through the skin and do not go back down'],
  essStaff:      ['bulwark', 'a length of seasoned wood held between you and it'],
  essTechnology: ['bulwark', 'assemble, rivet, deploy -- it builds a thing to hide behind'],
  essTree:       ['bulwark', 'the skin hardens into bark'],
  essTrowel:     ['bulwark', 'lay, seal, raise -- it builds walls'],
  essTurtle:     ['bulwark', 'plates grow in across the back'],
  essWasp:       ['bulwark', 'a barb under the last rib -- it answers rather than absorbs'],
  essWood:       ['bulwark', 'the skin roughens into bark'],
  essChicken:    ['bulwark', 'you are between the flock and the threat'],

  // ---- undoing what landed ------------------------------------------------
  essPure:       ['absolve', 'PURGE, CLEANSE, scour, clarify; "not poison, not burn, not even a holy affliction"'],
  essSerene:     ['absolve', 'settle, soothe, CLEANSE, still; nothing that lands is allowed to ripple'],
  essBalance:    ['absolve', 'level, offset, redress -- it undoes a state rather than blocking one'],
  essLife:       ['absolve', 'knit, sprout, bloom; torn skin knits over'],
  heal:          ['absolve', 'close, knit, quicken, RETURN -- cuts close on the pace of a season'],
  essRune:       ['absolve', 'carve, inscribe, SET -- a ward that refuses an affliction outright'],

  // ---- both ---------------------------------------------------------------
  essPaper:      ['both', 'folded charms in every pocket: a seal both shields and dispels'],
  essShimmer:    ['both', 'the dark is held OFF you (shield) and what hides is shown (dispel)'],
  essSloth:      ['both', 'outlast -- it endures a blow and it waits a condition out'],
};

/** The finished lever list for one essence: its old levers with `bind` and
 *  `ward` replaced by whichever halves this file assigns.
 *
 *  Anything NOT in the tables keeps the old lever, which is how a new essence
 *  behaves sanely before somebody classifies it -- and `leverSplitFaults`
 *  reports it, so "sanely" never quietly becomes "forgotten". */
export function splitLeversFor(id, levers) {
  const out = [];
  for (const l of levers) {
    if (l === 'bind' && BIND_SPLIT[id]) {
      const half = BIND_SPLIT[id][0];
      if (half === 'both') out.push('anchor', 'muzzle'); else out.push(half);
    } else if (l === 'ward' && WARD_SPLIT[id]) {
      const half = WARD_SPLIT[id][0];
      if (half === 'both') out.push('bulwark', 'absolve'); else out.push(half);
    } else {
      out.push(l);
    }
  }
  return [...new Set(out)];
}

/** Every essence carrying `bind` or `ward` must be classified, and every
 *  classification must name an essence that carries the lever it splits.
 *  Both directions, because a table that drifts either way is a table that
 *  has stopped describing the roster -- this project's fault class one. */
export function leverSplitFaults(motifs) {
  const out = [];
  for (const [id, m] of Object.entries(motifs)) {
    const l = m.levers || [];
    if (l.includes('bind') && !BIND_SPLIT[id]) out.push(`${id} carries bind and is not in BIND_SPLIT`);
    if (l.includes('ward') && !WARD_SPLIT[id]) out.push(`${id} carries ward and is not in WARD_SPLIT`);
  }
  for (const id of Object.keys(BIND_SPLIT)) {
    if (!(motifs[id] || {}).levers?.includes('bind')) out.push(`BIND_SPLIT names ${id}, which does not carry bind`);
  }
  for (const id of Object.keys(WARD_SPLIT)) {
    if (!(motifs[id] || {}).levers?.includes('ward')) out.push(`WARD_SPLIT names ${id}, which does not carry ward`);
  }
  const valid = { anchor: 1, muzzle: 1, both: 1 };
  for (const [id, [half]] of Object.entries(BIND_SPLIT)) {
    if (!valid[half]) out.push(`${id} splits bind into '${half}'`);
  }
  const validW = { bulwark: 1, absolve: 1, both: 1 };
  for (const [id, [half]] of Object.entries(WARD_SPLIT)) {
    if (!validW[half]) out.push(`${id} splits ward into '${half}'`);
  }
  return out;
}

/** For the report: how the 88 fell out. */
export function splitTally() {
  const t = (tab) => Object.values(tab).reduce((a, [h]) => (a[h] = (a[h] || 0) + 1, a), {});
  return { bind: t(BIND_SPLIT), ward: t(WARD_SPLIT) };
}
