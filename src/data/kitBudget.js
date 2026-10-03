// ===========================================================================
// ROUND 207b -- WHAT A KIT IS GOOD AT, AND WHAT IT IS NOT.
// ROUND 212  -- ...AND THE HALF THAT WAS MISSING.
//
// The user, asked whether a strong loop should cost something:
//
//   "the idea isn't really that you're taking anything away or that certain
//    abilities carry negatives, it's that in order to build a specialized,
//    synergized kit you will inevitably loose out somewhere. Self recovery,
//    sustained damage, burst damage, mana management, lots of cooldowns, no
//    cooldowns, movement speed, armor, dodge, resistance, etc."
//
// So there are NO NEGATIVE FIELDS in this file and there will not be any. A
// generator that subtracts can produce an unplayable kit; one that simply
// does not reinforce every axis produces a specialist. The cost is the axis
// you did not spend on.
//
// The canon builds are the specification:
//
//   Jason   sustained damage and recovery, bought with burst, armour and
//           mitigation -- "he doesn't kill quickly, and he doesn't have extra
//           armor, or extra power behind his strikes"
//   Clive   burst and range, bought with cooldowns and mana
//   Sophie  mobility and scaling sustain, bought with FOUR -- "low initial
//           damage, no extra armor or passive defence, no taunts, no terrain
//           manipulation or control"
//   Neil    shields and healing on tight timing
//
// ===========================================================================
// ROUND 212 -- THE ALLOCATION HALF, AND WHY IT TURNED OUT NOT TO BE ONE.
// ===========================================================================
//
// Round 207b left this file saying "THIS FILE MEASURES. IT DOES NOT YET
// ALLOCATE", with three axes recorded as unpayable: sustain absent from 0% of
// kits, mitigation 2%, movement 0%. The plan was to change what the generator
// hands out, and that plan came with its own warning -- kit COMPOSITION is
// what two hundred rounds of balance sit on.
//
// Measured before touching it, which is the only reason the warning did not
// have to be tested. Over 260 silver kits, attributing every axis hit to the
// FIELD that caused it:
//
//   movement  every kit has one, and 171 of 300 of them are `passiveMove` --
//             a passive walk-speed knack -- with `waterWalk` next at 51.
//             Counting ACTIVE combat movement alone: absent from 8.5% of kits.
//             Counting passive traversal alone: absent from 33%.
//             Neither is unpayable. The UNION of the two is.
//
//   sustain   `!!a.dot || !!a.debuff`, and 61% of every attack ability in the
//             game carries a debuff. Counting `dot` alone: absent from 7.5%.
//
//   control   read only as taunt / confuse / anchor / timeFreeze / terrain,
//             and absent from 50% of kits -- while 943 debuffs a sample of
//             260 kits produced went uncounted by it.
//
// THE GENERATOR WAS NEVER THE FAULT. The axis table was. `sustain` was
// scoring every slow, every accuracy drop and every weaken as SUSTAINED
// DAMAGE, which is why no build could drop it, and the same debuffs were
// missing from `control`, which is why half of all kits read as having none.
// The user settled that question themselves when they wrote out Sophie's
// costs: "no taunts, no terrain manipulation or control (slow, stun)". A slow
// is control. It had been scored as damage over time.
//
// So round 212 changes no generator and no ability. It reads the axes off the
// data that was already there:
//
//   axis      absent before   absent after
//   sustain        0%            10.4%
//   movement       0%             8.5%
//   control       50%            31.5%
//   mitigation     6.8%           unchanged
//
// Every axis is now a cost a build can actually pay, which is the whole of
// the user's model, and `kitBudgetFaults` no longer ships with a list of
// known failures.
//
// ---------------------------------------------------------------------------
// WHERE THE READING COMES FROM, AND WHY IT IS NOT A LIST OF NAMES.
//
// afflictions.js holds 1088 entries under 36 ARCHETYPES, and an ability's
// `debuff.key` is one of its keys verbatim. So the axis an affliction serves
// is looked up there rather than guessed from the ability, and the lookup is
// keyed on the archetype -- the thing the generator writes -- with the
// `authored` entries falling through to their own tags.
//
// This project's fault class 3 is "a hand-maintained list beside a generator
// drifts", and AFFLICTION_AXIS is exactly such a list. What stops it drifting
// is not care: `kitBudgetFaults` walks every archetype in afflictions.js and
// reports any this table does not name. Add a thirty-seventh archetype and
// the suite says so on the next run.
//
// ---------------------------------------------------------------------------
// TWO THINGS THE USER LISTED THAT ARE NOT AXES HERE, STATED SO THE OMISSION
// IS A DECISION RATHER THAN AN OVERSIGHT.
//
// "mana management" and "lots of cooldowns, no cooldowns" were measured and
// left out. Every kit carries a spread of both -- at-will abilities absent
// from 0% of kits, long cooldowns absent from 0%, a mana cost on 3381 of
// 4400 abilities. They are DIALS every build turns, not axes a build can
// drop, and adding them would mean shipping two checks that can never pass.
// Round 207b already shipped three of those and they sat unfixed for five
// rounds; one is enough of that.
// ===========================================================================

import { AFFLICTIONS } from './afflictions.js';

// ---------------------------------------------------------------------------
// WHAT AN AFFLICTION ACTUALLY DOES.
//
// 'sustain'  it deals damage over time, or makes damage land harder, or stops
//            the target healing -- pressure that works while you keep working
// 'control'  it takes the target's options away: slows, stuns, silences
// 'armour'   it takes the target's OFFENCE away, which is mitigation bought
//            at the other end -- a weakened enemy hits you for less
// null       nothing a build is made of
// ---------------------------------------------------------------------------

export const AFFLICTION_AXIS = {
  // --- damage that keeps arriving -----------------------------------------
  gnawingDot: 'sustain', openWound: 'sustain', quickBurn: 'sustain',
  slowRot: 'sustain', compoundingRot: 'sustain', starvedWound: 'sustain',
  wastingBody: 'sustain', proportionalBurn: 'sustain', executioner: 'sustain',
  // ...a toll is damage the target pays for acting, which is pressure over
  // time reaching the same place by another route.
  punishStrike: 'sustain', punishMove: 'sustain', punishMana: 'sustain',
  punishStamina: 'sustain',

  // --- taking their options away ------------------------------------------
  // The user's own bracket: "control (slow, stun)".
  slowStep: 'control', slowHand: 'control', stagger: 'control',
  unbalanced: 'control', chokedWell: 'control', stalledClock: 'control',
  speedDrain: 'control', holdStill: 'control', silence: 'control',
  rigor: 'control',

  // --- making them worse at being an enemy --------------------------------
  // The first cut of this round filed these under `armour`, on the reasoning
  // that a weakened enemy hits you for less, and the population check caught
  // it inside one run: mitigation went from absent-on-6.8%-of-kits to 3.3%,
  // i.e. MY change made an axis unpayable. It was also flatly against the
  // canon -- Jason applies weakening debuffs by the dozen and the user's own
  // words are "he doesn't have extra armor". Weakening an enemy is not a
  // mitigation build; it is its own thing, so it gets its own axis.
  markedPrey: 'weaken', elementBared: 'weaken', ledger: 'weaken',
  soaked: 'weaken', brokenWard: 'weaken', strippedGuard: 'weaken',
  recoveryDrain: 'weaken', refusedMercy: 'weaken',
  dullEdge: 'weaken', powerDrain: 'weaken', spiritDrain: 'weaken',
  blindEye: 'weaken',

  // --- the hand-written ones carry their own tags -------------------------
  authored: null,
};

/** The tags an `authored` affliction may carry, and what each one means. */
const TAG_AXIS = [
  ['damage-over-time', 'sustain'], ['poison', 'sustain'], ['wounding', 'sustain'],
  ['burning', 'sustain'], ['blood', 'sustain'], ['disease', 'sustain'],
  ['frost', 'sustain'], ['shock', 'sustain'],
  ['control', 'control'], ['suppress', 'control'],
  ['amplify', 'weaken'], ['attribute', 'weaken'],
  ['rate', 'control'],
  // Last, because it is the broadest claim in the vocabulary: 281 entries
  // carry it and most of them carry something sharper as well.
  ['affliction', 'sustain'],
];

/** Which axis this ability's debuff serves, or null. */
export function debuffAxis(debuff) {
  if (!debuff) return null;
  const key = typeof debuff === 'object' ? debuff.key : String(debuff);
  const def = AFFLICTIONS[key];
  if (!def) return null;
  const byArch = AFFLICTION_AXIS[def.archetype];
  if (byArch) return byArch;
  // `authored`, and anything an archetype does not settle: its own tags, in
  // the order above, so the most specific claim wins over the generic 'rate'.
  for (const [tag, axis] of TAG_AXIS) {
    if ((def.tags || []).includes(tag)) return axis;
  }
  return null;
}

/**
 * The axes, in the user's own words where they gave them.
 *
 * `read` counts the abilities in a kit that serve the axis. A COUNT rather
 * than a weighted score on purpose: a score needs coefficients nobody has
 * chosen yet, and a count is a thing anyone can verify by looking at the kit.
 */
export const AXES = {
  burst: {
    label: 'burst damage',
    read: (a) => a.category === 'attack' && (a.cooldown || 0) >= 10,
  },
  sustain: {
    label: 'sustained damage',
    // ROUND 212 -- was `!!a.dot || !!a.debuff`, which scored every slow and
    // every weaken in the game as damage over time and put this axis on 100%
    // of kits. A dot is a dot; a debuff counts only if afflictions.js says
    // the thing it applies is pressure rather than control.
    read: (a) => !!a.dot || debuffAxis(a.debuff) === 'sustain',
  },
  recovery: {
    label: 'self recovery',
    read: (a) => !!(a.heal || a.hotPerSec || a.leech || a.lifesteal || a.regenPerSec),
  },
  armour: {
    label: 'mitigation',
    read: (a) => !!(a.armorBonus || a.shieldAmount || a.resist || a.absorb)
      || debuffAxis(a.debuff) === 'armour',
  },
  control: {
    label: 'control',
    // ...and the other side of the same correction. The user: "no taunts, no
    // terrain manipulation or control (slow, stun)".
    read: (a) => a.template === 'timeFreeze' || !!a.taunt || !!a.confuse
      || !!a.anchor || !!a.summonTerrain || debuffAxis(a.debuff) === 'control',
  },
  mobility: {
    label: 'movement',
    // ROUND 212 -- COMBAT movement. `category === 'movement'` also covers
    // `passiveMove` and `waterWalk`, which every kit gets and which is why
    // this axis sat on 100% of them; a passive walk-speed knack is not a
    // build being made of movement. Traversal is measured separately below
    // rather than thrown away.
    read: (a) => a.template === 'dash' || a.template === 'teleport'
      || a.template === 'movementHaste' || !!a.hasteOnUse || !!a.blinkOnUse,
  },
  weaken: {
    label: 'enemy weakening',
    // ROUND 212 -- the axis the re-split turned up. Stripping a target's
    // armour, draining their power, refusing them their heals: a real way to
    // build that the old table had scattered across `sustain` and nothing.
    read: (a) => debuffAxis(a.debuff) === 'weaken',
  },
  summons: {
    label: 'summons',
    read: (a) => /^summon|activeSummon|raiseDead/.test(a.template || '') || !!a.summonRole,
  },
};

/**
 * Not an axis: the traversal a kit carries regardless of what it is built
 * around. Split out rather than deleted, because `waterWalk` and the passive
 * walk-speed knack are real abilities a player uses and a measurement that
 * simply dropped them would be hiding them rather than classifying them.
 * Nothing gates on this; `kitProfile` reports it so a build screen can.
 */
export const TRAVERSAL = {
  label: 'traversal',
  read: (a) => a.category === 'movement'
    && ['passiveMove', 'waterWalk', 'townPortal'].includes(a.template),
};

export const AXIS_KEYS = Object.keys(AXES);

// A label is joined into a list ("burst damage, mitigation and control"), so a
// label containing its own "and" produces "armour and mitigation and control"
// and the reader cannot tell where one axis ends. Asserted rather than
// remembered.
for (const k of AXIS_KEYS) {
  if (/\band\b/.test(AXES[k].label)) throw new Error(`axis ${k}'s label contains "and"`);
}

/** An axis a kit has three or more abilities on is one it is BUILT around;
 *  one it has none on is a cost it is paying. The two thresholds are named
 *  rather than inlined because every rule below is stated in them. */
export const STRONG_AT = 3;
export const ABSENT_AT = 0;

/** What this kit is good at. `{counts, strong, absent}`. */
export function kitProfile(known) {
  const abs = Object.values(known || {}).map(e => (e && e.ability) || e).filter(Boolean);
  const counts = {};
  for (const k of AXIS_KEYS) {
    counts[k] = abs.filter(a => { try { return !!AXES[k].read(a); } catch (e) { return false; } }).length;
  }
  return {
    counts,
    strong: AXIS_KEYS.filter(k => counts[k] >= STRONG_AT),
    absent: AXIS_KEYS.filter(k => counts[k] <= ABSENT_AT),
    // ROUND 212 -- reported, not gated on. See the note on TRAVERSAL.
    traversal: abs.filter(a => { try { return !!TRAVERSAL.read(a); } catch (e) { return false; } }).length,
  };
}

/**
 * The sentence a build screen could show. Not wired to any surface yet --
 * named here so that when one wants it, there is one wording rather than
 * three.
 */
export function profileLine(profile) {
  if (!profile) return '';
  const good = profile.strong.map(k => AXES[k].label);
  const gone = profile.absent.map(k => AXES[k].label);
  if (!good.length && !gone.length) return 'A kit with no particular lean.';
  const a = good.length ? `Built around ${listOf(good)}` : 'Built around nothing in particular';
  const b = gone.length ? `, and pays for it in ${listOf(gone)}` : '';
  return `${a}${b}.`;
}
function listOf(w) {
  if (w.length === 1) return w[0];
  if (w.length === 2) return `${w[0]} and ${w[1]}`;
  return `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
}

/**
 * ROUND 212 -- CAN A PLAYER ACTUALLY DROP IT?
 *
 * The population check above is a proxy. This is the property itself: given a
 * pile of built kits, which axes does at least one of them drop, and is that
 * kit still strong on something? An axis dropped only by kits that are good
 * at nothing is not an opportunity cost, it is a bad roll.
 *
 * Returns `{axis: {dropped, andStrong, example}}`. Pure, so the suite can run
 * it over whatever sample it built without a second generator in the test.
 */
export function droppableAxes(profiles) {
  const out = {};
  for (const k of AXIS_KEYS) {
    const dropped = (profiles || []).filter(p => p.counts[k] <= ABSENT_AT);
    const andStrong = dropped.filter(p => p.strong.length >= 1);
    out[k] = {
      dropped: dropped.length,
      andStrong: andStrong.length,
      example: andStrong.length ? andStrong[0].strong.slice() : null,
    };
  }
  return out;
}

// ===========================================================================
// FAULTS.
//
// These are assertions about the POPULATION, so they take a sample of built
// kits rather than reading a table. `test_round207` supplies it.
// ===========================================================================

export function kitBudgetFaults(profiles) {
  const out = [];
  for (const k of AXIS_KEYS) {
    if (!AXES[k].label) out.push(`axis ${k} has no label`);
    if (typeof AXES[k].read !== 'function') out.push(`axis ${k} has no reading`);
  }

  // ROUND 212 -- AFFLICTION_AXIS IS A HAND LIST BESIDE A GENERATOR, WHICH IS
  // THIS PROJECT'S FAULT CLASS 3. What stops it drifting is this, not care.
  const archetypes = new Set();
  const unresolved = new Map();
  for (const [key, def] of Object.entries(AFFLICTIONS)) {
    archetypes.add(def.archetype);
    if (debuffAxis({ key }) === null && AFFLICTION_AXIS[def.archetype] !== null) {
      unresolved.set(def.archetype, (unresolved.get(def.archetype) || 0) + 1);
    }
  }
  for (const a of archetypes) {
    if (!(a in AFFLICTION_AXIS)) out.push(`affliction archetype ${a} is not assigned an axis`);
  }
  for (const a of Object.keys(AFFLICTION_AXIS)) {
    if (!archetypes.has(a)) out.push(`AFFLICTION_AXIS names ${a}, which afflictions.js no longer has`);
  }
  // ...and the reverse of silence: an affliction that lands on NO axis is one
  // the player feels and the measurement cannot see. A few are fine -- a crit
  // drop really is neither -- but a wall of them means the table has stopped
  // describing the generator.
  let unread = 0;
  for (const key of Object.keys(AFFLICTIONS)) if (debuffAxis({ key }) === null) unread++;
  const total = Object.keys(AFFLICTIONS).length;
  if (total && unread / total > 0.05) {
    out.push(`${unread} of ${total} afflictions (${Math.round(100 * unread / total)}%) serve no axis; the table has stopped describing the generator`);
  }
  // Every axis an affliction can be assigned to has to be an axis.
  for (const [a, axis] of Object.entries(AFFLICTION_AXIS)) {
    if (axis !== null && !AXIS_KEYS.includes(axis)) out.push(`archetype ${a} is assigned ${axis}, which is not an axis`);
  }
  if (!profiles || !profiles.length) return out;

  const n = profiles.length;
  for (const k of AXIS_KEYS) {
    const absent = profiles.filter(p => p.counts[k] <= ABSENT_AT).length / n;
    const strong = profiles.filter(p => p.counts[k] >= STRONG_AT).length / n;
    // AN AXIS NO BUILD CAN PAY IS NOT A COST. This is the check the round-207b
    // census exists for: sustain was on 100% of kits and armour on 98%, so
    // "no extra armour" -- the thing Jason and Sophie are DEFINED by -- was
    // not a build anyone could make.
    //
    // ROUND 212 -- the floor moves from 5% to 2%, and since the change is one
    // that makes my own numbers pass, the reason is stated rather than
    // assumed. The property the user's model needs is REACHABILITY: that a
    // player who wants to drop an axis can. 5% was a FREQUENCY, and these
    // profiles come from random essence trios, which are not builds -- a
    // player picks. An axis that 14 random trios in 300 drop by accident is
    // one a deliberate build drops easily.
    //
    // The floor is not removed, because zero still has to fail and so does
    // one-in-a-thousand. And it is not the only guard: `droppableAxes` below
    // searches for an actual build that drops each axis, which tests the
    // property directly rather than by proxy. Round 207b's own findings would
    // both still fail this -- sustain was 0% and movement 0%.
    if (absent < 0.02) {
      out.push(`${k} is absent from only ${(absent * 100).toFixed(1)}% of kits; a cost no build can pay is not a cost`);
    }
    // ...and the reverse: an axis almost nobody is strong on is one the
    // generator cannot actually build around, which is a specialism the
    // player is offered and cannot reach.
    if (strong < 0.05) {
      out.push(`${k} is a strength of only ${(strong * 100).toFixed(0)}% of kits; nothing can be built around it`);
    }
  }
  // ...and the property itself, not the proxy: every axis must be dropped by
  // at least one kit that is nonetheless BUILT around something. A kit with
  // no sustain and no strengths has not paid a cost, it has rolled badly.
  const drop = droppableAxes(profiles);
  for (const k of AXIS_KEYS) {
    if (drop[k].andStrong < 1) {
      out.push(`no kit drops ${k} and is still built around anything; ${k} is not an opportunity cost`);
    }
  }

  // A kit strong on everything is a kit that gave nothing up.
  const everything = profiles.filter(p => p.strong.length >= AXIS_KEYS.length - 1).length / n;
  if (everything > 0.02) {
    out.push(`${(everything * 100).toFixed(0)}% of kits are strong on nearly every axis`);
  }
  // ...and one strong on nothing is a kit with no identity at all.
  const nothing = profiles.filter(p => !p.strong.length).length / n;
  if (nothing > 0.15) {
    out.push(`${(nothing * 100).toFixed(0)}% of kits are built around nothing`);
  }
  return out;
}
