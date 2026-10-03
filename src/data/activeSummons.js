// ============================================================================
// ROUND 59 -- ACTIVE SUMMONS
//
// The user's ask, verbatim:
//
//   "the development of a set of 'active' summons. Creatures, turrets, traps,
//    and generally short lived summons that have high damage. These should last
//    30 seconds to 3 minutes and have cooldowns of 2 minutes to 10 minutes. the
//    shorter the duration and longer the cooldown the stronger the summon
//    should be."
//
// WHY THIS GAP EXISTED, measured: the round-58 Pareto put Summon at 10.6% of
// every generated kit -- the second largest function in the game -- and all
// 4,251 of them across 2,000 kits were PASSIVE. A bonded familiar, a conjured
// weapon, conjured armour, conjured gear. There was no such thing as a summon
// you cast. An entire tenth of the ability roster had one mood.
//
// THE TRADE, which is the whole design
//
// The user gave a rule rather than numbers: shorter life and longer cooldown
// means stronger. That is a statement about CONCENTRATION -- the same value
// packed into less time and paid for with more waiting. So power is derived
// from both axes rather than rolled independently of them, and the two bands
// are the user's own: 30s-3min of life, 2-10min of cooldown.
//
// A summon that lives three minutes on a two-minute cooldown is nearly always
// out and correspondingly mild. One that lives thirty seconds on a ten-minute
// cooldown is a decision you make once a fight and feel.
// ============================================================================

export const SUMMON_DURATION_MIN = 30;
export const SUMMON_DURATION_MAX = 180;
export const SUMMON_COOLDOWN_MIN = 120;
export const SUMMON_COOLDOWN_MAX = 600;

// The midpoint both exponents are normalised against, so `summonStrength`
// returns exactly 1 for a middling summon and every other number reads as a
// multiple of "ordinary".
const D_MID = 90, C_MID = 240;

// Both sub-linear, deliberately. At exponent 1 a ten-minute cooldown would be
// five times a two-minute one and a thirty-second life six times a three-minute
// one -- a 30x spread between the corners of the design space, which is not a
// spectrum, it is two different games. At these exponents the corners are 0.41
// and 3.83: a 9.4x spread, wide enough that the trade is the point and narrow
// enough that the weak end is still worth casting.
const COOLDOWN_EXP = 0.55;
const DURATION_EXP = 0.75;

/**
 * How hard this summon hits, as a multiple of an ordinary one.
 * Rises with cooldown, falls with duration -- the user's rule, as a function.
 */
export function summonStrength(durationS, cooldownS) {
  const d = Math.max(1, durationS || D_MID);
  const c = Math.max(1, cooldownS || C_MID);
  return Math.pow(c / C_MID, COOLDOWN_EXP) * Math.pow(D_MID / d, DURATION_EXP);
}

// ---------------------------------------------------------------------------
// THE THREE SHAPES
//
// Three behaviours, not one summon under three names. Each pays for its damage
// with a different weakness, which is what makes choosing between them a
// choice: the creature has to reach you, the turret cannot follow, the trap
// only pays if something walks into it.
// ---------------------------------------------------------------------------
export const SUMMON_KINDS = {
  creature: {
    key: 'creature',
    label: 'creature',
    // Hunts on its own. The only one that closes distance, so it is the only
    // one that reliably lands its whole lifetime of damage -- and therefore the
    // one with the lowest damage per hit.
    dmgMult: 1.0, interval: 1.1, range: 46, moves: true,
    leash: 420, speed: 78,
    blurb: (n) => `Calls ${n} that hunts on its own`,
  },
  turret: {
    key: 'turret',
    label: 'turret',
    // Holds the spot it was placed on and shoots. Hits harder than the creature
    // per shot and from much further, and cannot follow the fight when it moves.
    dmgMult: 1.35, interval: 1.4, range: 240, moves: false,
    blurb: (n) => `Sets down ${n} that holds its ground and fires`,
  },
  trap: {
    key: 'trap',
    label: 'trap',
    // Waits, then detonates on whatever stepped into it. The biggest single
    // number in the system and the only one that can expire having done
    // nothing at all.
    dmgMult: 4.2, interval: 0, range: 96, moves: false,
    charges: 2, armDelay: 0.6, blast: 110,
    blurb: (n) => `Lays ${n} that waits, then goes off on whatever finds it`,
  },
};
export const SUMMON_KIND_KEYS = Object.keys(SUMMON_KINDS);

/**
 * Rolls a duration and cooldown INSIDE the user's bands, correlated so the
 * trade holds: a short life is paired with a long cooldown far more often than
 * with a short one.
 *
 * `roll01` is the seeded 0..1 that decides where on the spectrum this summon
 * sits. 0 is the long-lived, short-cooldown, mild end; 1 is the brief,
 * expensive, devastating end. Rolling the two numbers independently would have
 * produced three-minute summons on ten-minute cooldowns (strictly worse than
 * everything) and thirty-second ones on two-minute cooldowns (strictly better),
 * which is not a spectrum with a trade in it -- it is a spectrum with a right
 * answer.
 */
export function rollSummonTiming(roll01, jitter01 = 0.5) {
  const t = Math.max(0, Math.min(1, roll01));
  // A little independent play on top, so two summons at the same point on the
  // spectrum are not identical -- but never enough to invert the trade.
  const j = (jitter01 - 0.5) * 0.18;
  const dT = Math.max(0, Math.min(1, t + j));
  const cT = Math.max(0, Math.min(1, t - j));
  const duration = Math.round(SUMMON_DURATION_MAX
    - (SUMMON_DURATION_MAX - SUMMON_DURATION_MIN) * dT);
  const cooldown = Math.round(SUMMON_COOLDOWN_MIN
    + (SUMMON_COOLDOWN_MAX - SUMMON_COOLDOWN_MIN) * cT);
  return { duration, cooldown };
}

/**
 * The user's cooldown band as a hard edge rather than a starting suggestion.
 *
 * ROUND 59, found by measurement: `rollSummonTiming` never leaves the band, but
 * the `swift` lever multiplies a finished cooldown by 0.75, and 0.75 of the
 * 120s floor is 90s. Across 2,500 kits the observed range was 90-600s -- the
 * bottom of it outside the "2 minutes to 10 minutes" the user specified. A band
 * only the first writer respects is not a band.
 */
export function clampSummonCooldown(seconds) {
  const c = Number(seconds) || SUMMON_COOLDOWN_MIN;
  return Math.round(Math.max(SUMMON_COOLDOWN_MIN, Math.min(SUMMON_COOLDOWN_MAX, c)));
}

/** Human phrasing for a duration, since these run in minutes as often as
 *  seconds and "180s" reads worse than "3 minutes". */
export function summonTimeWord(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const m = seconds / 60;
  const rounded = Math.round(m * 10) / 10;
  return rounded === 1 ? '1 minute' : `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} minutes`;
}

/** The compact form for a stats line. */
export function summonTimeShort(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = seconds / 60;
  return `${m % 1 === 0 ? m : m.toFixed(1)}m`;
}

// ---------------------------------------------------------------------------
// WHAT GETS SUMMONED, by element.
//
// The name is generated from the essence and stone like every other ability, so
// this is only the NOUN the description needs -- what the thing physically is.
// Keyed by element so a frost turret is a rime-crusted spire and a shadow one
// is something else entirely, without a hand-authored entry per combination.
// ---------------------------------------------------------------------------
export const SUMMON_NOUNS = {
  creature: {
    fire: 'a thing of living flame', frost: 'a beast of rime and ice',
    lightning: 'a coil of walking storm', nature: 'a briar-grown hunter',
    // ROUND 204 (item 2.10.1) -- "Calls a shape that should not hold together
    // for 51 seconds" was the user's example of prose that says nothing: it
    // describes a failure to exist rather than a creature. The other six
    // nouns here name a thing; this one now does too.
    shadow: 'a hunter cut out of the dark', radiant: 'a figure of hard light',
    physical: 'a construct of stone and iron',
  },
  turret: {
    fire: 'a burning brazier', frost: 'a spire of black ice',
    lightning: 'a crackling pylon', nature: 'a seeding bramble',
    shadow: 'a watching obelisk', radiant: 'a standing lamp of judgement',
    physical: 'a bolt-throwing engine',
  },
  trap: {
    fire: 'a bed of banked embers', frost: 'a sheet of thin ice',
    lightning: 'a hair-trigger charge', nature: 'a snare of living root',
    shadow: 'a patch of waiting dark', radiant: 'a sigil that flares when trodden',
    physical: 'a set of iron jaws',
  },
};

export function summonNoun(kind, element) {
  const byKind = SUMMON_NOUNS[kind] || SUMMON_NOUNS.creature;
  return byKind[element] || byKind.physical;
}

// ---------------------------------------------------------------------------
// ROUND 134 (item 10.1) -- AND WHEN THE STONE IS AN ANIMAL, IT IS THAT ANIMAL.
//
// The user, on a Lizard stone in a Volcano confluence: "acceptable options are
// a magma, fire, or lava lizard summon".
//
// The mechanics were already right -- `summonCreatureForSocket('stoneLizard')`
// has returned the lizard profile since round 121, so the thing that walks out
// and fights genuinely is a lizard. The DESCRIPTION was not: `summonNoun` is
// keyed on the element alone, so the card said "a thing of living flame" and
// the player had no way to know a lizard was involved.
//
// The element still leads, which is the user's own ordering in 10.1 ("the
// essence is the #1 influence in an ability... An awakening stone should
// influence the shape or tone of the move"): the ADJECTIVE is the essence's
// element and the NOUN is the stone's animal. A fire essence with a lizard
// stone reads "a burning lizard"; a frost essence with the same stone reads
// "a rime-crusted lizard". The stone shapes it; the essence is what it is
// made of.
//
// One adjective per element rather than a per-animal table: 34 animal stones
// against 7 elements is 238 hand-written phrases, and the two-part form says
// the same thing without any of them going stale when a stone is added.
export const SUMMON_ELEMENT_ADJ = {
  fire: 'burning', frost: 'rime-crusted', lightning: 'storm-charged',
  nature: 'briar-grown', shadow: 'half-seen', radiant: 'light-wrought',
  physical: 'stone-hided',
};

/** `summonNoun` when the socket's stone is not an animal, and "a <element>
 *  <animal>" when it is. `animal` is `animalWordForStone`'s answer, so a caller
 *  that does not know its stone passes null and gets the old behaviour. */
export function summonNounFor(kind, element, animal) {
  if (!animal) return summonNoun(kind, element);
  // Only a CREATURE is an animal. A turret is a thing you set down and a trap
  // is a thing you hide; calling either of them a lizard would be worse than
  // the generic noun, not better.
  if (kind !== 'creature') return summonNoun(kind, element);
  const adj = SUMMON_ELEMENT_ADJ[element] || SUMMON_ELEMENT_ADJ.physical;
  return `${/^[aeiou]/i.test(adj) ? 'an' : 'a'} ${adj} ${animal}`;
}

/** Every element the generator can hand `summonNounFor` must have an adjective,
 *  or an animal summon silently falls back to the stone-hided one. Same shape
 *  and same job as SUMMON_NOUN_GAPS below. */
export const SUMMON_ADJ_GAPS = (() => {
  const els = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant', 'physical'];
  return els.filter(e => !SUMMON_ELEMENT_ADJ[e]);
})();

/** Every noun table must cover every element the generator can hand it, or a
 *  summon falls back to the physical noun and quietly loses its identity. */
export const SUMMON_NOUN_GAPS = (() => {
  const els = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant', 'physical'];
  const bad = [];
  for (const k of SUMMON_KIND_KEYS) {
    for (const e of els) if (!SUMMON_NOUNS[k] || !SUMMON_NOUNS[k][e]) bad.push(`${k}:${e}`);
  }
  return bad;
})();
