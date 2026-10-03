// ===========================================================================
// ROUND 203 (item 5) -- TRANSCENDENT DAMAGE, IN FULL.
//
// The user's properties, verbatim:
//
//   "Armor-Ignoring: It bypasses standard physical and magical defenses,
//    making it devastatingly effective regardless of a target's toughness.
//    Specialized Source: It is frequently associated higher-tier cosmic or
//    divine forces.
//    Immunity & Resistance Bypassing: Powers dealing transcendent damage
//    cannot easily be mitigated or redirected by conventional
//    resistance-shifting or retributive skills like Instant Karma.
//    Notably Transcendent damage ignores rank disparity.
//    It always looks like bright blue/white glowing light burning reality
//    itself.
//    At ranks below Silver Transcendent damage is very rare and requires
//    either narrow conditions or significant setup.
//    Even at Silver and Gold transcendent damage is rare but won't have the
//    tight restrictions it carries at iron or bronze rank."
//
// ---------------------------------------------------------------------------
// THIS OVERRULES A CALL ROUND 201 MADE, and it is worth writing down rather
// than quietly flipping.
//
// Round 201 gave transcendent damage the armour and resistance bypass and
// DELIBERATELY kept it subject to the rank gap, on the reasoning that armour,
// resistance and a ward are DEFENCES an ability can be written to beat, while
// the rank gap is round 43's statement that a Normal hunter and a Gold beast
// are different categories of thing. That reasoning is sound and it is not
// what the books say. "Notably Transcendent damage ignores rank disparity" is
// the user's ruling and it is now the rule.
//
// The consequence is real and is the reason the rarity half of this file
// exists: an iron-rank character holding a transcendent ability can hurt
// ANYTHING in the world. Round 43's tyranny of rank is the load-bearing wall
// of the whole world design -- super packs you have outgrown, a solo of the
// rank above you as a genuine threat, gate guards who refuse an under-ranked
// player. One ability that walks around it is a hole in all of that.
//
// So the gating below is NOT flavour and is not a guideline. Under silver a
// transcendent ability carries a GATE, and its damage is transcendent only
// while that gate is satisfied; the rest of the time it lands as its ordinary
// element. That is the mechanical reading of "requires either narrow
// conditions or significant setup", and it is enforced in the damage path
// rather than trusted to the generator.
// ===========================================================================

export const TRANSCENDENT = 'transcendent';

/** "Bright blue/white glowing light burning reality itself." A near-white with
 *  the blue left in it, rather than pure white -- pure white on a bright tile
 *  is invisible, and the books' image is light with a colour to it. */
export const TRANSCENDENT_COLOR = 0xcfe9ff;
/** The hotter core the fx layers over it. */
export const TRANSCENDENT_CORE = 0xf4fbff;
/** The damage float's colour, as the css string `_floatText` takes. */
export const TRANSCENDENT_TEXT = '#cfe9ff';

// ===========================================================================
// 1. WHAT IT BYPASSES.
//
// Named as ONE LIST rather than as a guard repeated at each site, because the
// user's second property -- "cannot easily be mitigated or redirected by
// conventional resistance-shifting or retributive skills" -- is a statement
// about a CLASS of mechanic, and a class enumerated in fourteen places is a
// class that will be missed in the fifteenth. Every site consults
// `bypasses(kind)`, and `transcendentFaults` asserts that the runtime's own
// list of guarded sites matches this one.
// ===========================================================================

export const BYPASSED = {
  // --- "bypasses standard physical and magical defenses" -------------------
  armour: 'flat and fractional armour',
  resistance: 'elemental and typed resistance',
  ward: 'absorb shields, bulwarks and wards',
  block: 'shield blocks',
  damageReduction: 'flat damage reduction',
  minionGuard: 'the minion guard aura',
  // ROUND 220 (item 12.4) -- the mend ladder's silver rung, which cuts what a
  // freshly-mended body takes for 5s. It is a percentage mitigation sitting
  // beside the guard aura, so it is bypassed for the same reason that one is.
  mendGuard: 'the mending that holds after a heal',
  mountSoak: "a mount's share of the blow",
  // ROUND 270 -- two the runtime has guarded since round 238 and this list
  // never named: the resistance a CONDITION grants ([Growth] and its kin) and
  // the flat resistance to everything non-physical. `transcendentFaults`
  // caught the gap; the sites were right and the list was behind them.
  condResist: 'resistance granted by a condition',
  nonPhysicalResist: 'resistance to every non-physical type',
  // --- "Immunity & Resistance Bypassing" -----------------------------------
  immunity: 'immunity buffs and subtype immunities',
  // --- "cannot ... be redirected by ... retributive skills like Instant
  //     Karma" ------------------------------------------------------------
  thorns: 'thorns and retribution',
  reflect: 'spell and debuff reflect',
  retaliate: "an aura's bite",
  karma: 'karma ledgers (Instant Karma)',
  // --- "ignores rank disparity" -------------------------------------------
  rankGap: 'the rank gap',
};
export const BYPASSED_KEYS = Object.keys(BYPASSED);

/** Does a transcendent hit skip this kind of mitigation? Everything in the
 *  list, which is the point -- the function exists so a call site reads the
 *  list rather than restating it. */
export function bypasses(kind) {
  return Object.prototype.hasOwnProperty.call(BYPASSED, kind);
}

/**
 * What it does NOT bypass, written down so the boundary is a decision rather
 * than an omission:
 *
 *   dodge      -- a blow that misses was never mitigated. "Ignores defences"
 *                 is about what happens to a hit that LANDS; a hit that does
 *                 not land has nothing to ignore. Canon has people dodge
 *                 things they could never have survived.
 *   amplifiers -- curses, brands and aura amplification make the wound
 *                 DEEPER. A type that ignored help as well as hindrance would
 *                 be strictly worse than an ordinary one.
 *   the cut    -- TRANSCENDENT_DAMAGE_CUT (stats.js). Canon's own word is
 *                 "slight"; this is the price of everything above.
 */
export const NOT_BYPASSED = ['dodge', 'amplifiers', 'theCut'];

// ===========================================================================
// 2. THE RARITY GATE.
//
// "At ranks below Silver ... very rare and requires either narrow conditions
// or significant setup. Even at Silver and Gold ... rare but won't have the
// tight restrictions."
//
// TWO SEPARATE MECHANISMS, because the sentence names two things:
//
//   RARITY   how often a generated ability is transcendent at all.
//   THE GATE whether, on a given swing, the damage is actually transcendent.
//
// The gate is the interesting half. An ability does not stop being
// transcendent when it ranks up -- it stops being CONDITIONAL. Below silver
// its damage is transcendent only while its condition holds and lands as its
// ordinary element otherwise; at silver the condition lifts. That is the
// mechanical reading of "won't have the tight restrictions it carries at iron
// or bronze", and it means a player meets the ability at iron, learns what it
// wants, and is rewarded at silver by no longer having to arrange it.
//
// It also means the rank gap hole has a lock on it exactly where it needs one:
// an iron character CAN hurt a gold beast with this, but only by satisfying a
// condition they have to set up on purpose.
// ===========================================================================

/** The rank at which the condition lifts. */
export const UNGATED_FROM = 'silver';
export const RANK_ORDER_LOCAL = ['normal', 'iron', 'bronze', 'silver', 'gold'];

/** How often a generated ability may be transcendent, by the rank of the kit
 *  it is generated for. One in N sockets; `rareOnly` in awakening.js is one in
 *  forty, so even the gold figure here is rarer than the game's own rare seat. */
export const TRANSCENDENT_ODDS = {
  normal: 0, iron: 1 / 400, bronze: 1 / 300, silver: 1 / 90, gold: 1 / 60,
};

/**
 * The conditions a sub-silver transcendent ability may carry. "Narrow
 * conditions or significant setup" is two shapes and both are here: three that
 * are a state the world has to be in, and three that are work the player has
 * to do first.
 *
 * `check` is a pure predicate over a context the runtime builds, so a suite
 * can drive every one of them without a fight.
 */
export const TRANSCENDENT_GATES = {
  // --- narrow conditions ---------------------------------------------------
  onTheBrink: {
    label: 'while you are below a quarter of your health',
    kind: 'condition',
    check: (c) => c.selfHpFrac != null && c.selfHpFrac <= 0.25,
  },
  underTheStars: {
    label: 'under open sky, at night',
    kind: 'condition',
    check: (c) => !!c.night && !c.indoors,
  },
  outnumbered: {
    label: 'while three or more enemies are within reach of you',
    kind: 'condition',
    check: (c) => (c.enemiesNear || 0) >= 3,
  },
  // --- significant setup ---------------------------------------------------
  markedFirst: {
    label: 'against a target already carrying three of your afflictions',
    kind: 'setup',
    check: (c) => (c.targetAfflictions || 0) >= 3,
  },
  aftercast: {
    label: 'on the next strike after you spend a full aura projection',
    kind: 'setup',
    check: (c) => !!c.auraSpent,
  },
  bloodPaid: {
    label: 'when you have paid health rather than mana for it',
    kind: 'setup',
    check: (c) => !!c.paidInHealth,
  },
};
export const GATE_KEYS = Object.keys(TRANSCENDENT_GATES);

/** Is this ability's damage transcendent right now? `rank` is the ABILITY's
 *  own rank; `ctx` is the moment. An ability with no gate is always
 *  transcendent, which is what silver and gold roll. */
export function transcendentApplies(spec, rank, ctx = {}) {
  if (!spec || spec.element !== TRANSCENDENT) return false;
  if (!spec.transcendentGate) return true;
  if (RANK_ORDER_LOCAL.indexOf(rank || 'iron') >= RANK_ORDER_LOCAL.indexOf(UNGATED_FROM)) return true;
  const gate = TRANSCENDENT_GATES[spec.transcendentGate];
  return gate ? !!gate.check(ctx) : false;
}

/** The element a transcendent ability lands as when its gate is shut. Its own
 *  `fallbackElement` -- stamped by the generator from the essence's ordinary
 *  material -- so the ability still looks and sounds like the essence it came
 *  from on every swing that does not qualify. */
export function elementNow(spec, rank, ctx = {}) {
  if (!spec) return null;
  if (spec.element !== TRANSCENDENT) return spec.element || null;
  return transcendentApplies(spec, rank, ctx) ? TRANSCENDENT : (spec.fallbackElement || 'physical');
}

/** The clause the card adds under a gated transcendent ability. */
export function gateClause(spec) {
  const g = spec && TRANSCENDENT_GATES[spec.transcendentGate];
  if (!g) return null;
  return `Its damage is transcendent only ${g.label}; from silver rank, always.`;
}

// ===========================================================================
// 3. FAULTS.
// ===========================================================================

export function transcendentFaults(guardedSites = null) {
  const out = [];

  // --- the list of bypasses covers the user's four properties -------------
  for (const k of ['armour', 'resistance', 'immunity', 'thorns', 'reflect', 'karma', 'rankGap']) {
    if (!bypasses(k)) out.push(`transcendent damage does not bypass ${k}`);
  }
  for (const k of NOT_BYPASSED) {
    if (bypasses(k)) out.push(`${k} is in both the bypass list and the exceptions`);
  }
  if (!BYPASSED.rankGap) out.push('the rank gap is not bypassed; the ruling says it is');

  // --- and the runtime guards every one of them ---------------------------
  //
  // Passed in by the suite as the list of sites it found guarded, so this
  // file and the scene cannot drift: a bypass named here with no guard is a
  // property the game describes and does not have.
  if (guardedSites) {
    for (const k of BYPASSED_KEYS) {
      if (!guardedSites.includes(k)) out.push(`${BYPASSED[k]} is not guarded in the runtime`);
    }
    for (const k of guardedSites) {
      if (!bypasses(k)) out.push(`the runtime guards ${k}, which is not in the bypass list`);
    }
  }

  // --- the gate ------------------------------------------------------------
  const gated = { element: TRANSCENDENT, transcendentGate: 'onTheBrink', fallbackElement: 'radiant' };
  const plain = { element: TRANSCENDENT, fallbackElement: 'radiant' };
  if (transcendentApplies(gated, 'iron', { selfHpFrac: 0.9 })) {
    out.push('a gated ability is transcendent at iron with its condition unmet');
  }
  if (!transcendentApplies(gated, 'iron', { selfHpFrac: 0.1 })) {
    out.push('a gated ability is not transcendent at iron with its condition met');
  }
  if (!transcendentApplies(gated, 'silver', { selfHpFrac: 0.9 })) {
    out.push('the gate does not lift at silver');
  }
  if (!transcendentApplies(gated, 'gold', {})) out.push('the gate does not lift at gold');
  if (!transcendentApplies(plain, 'iron', {})) out.push('an ungated ability is not transcendent');
  if (transcendentApplies({ element: 'fire' }, 'gold', {})) out.push('a fire ability reads as transcendent');
  // An unknown gate key must FAIL SHUT. A typo that made an ability
  // permanently transcendent at iron would be the rank-gap hole, wide open.
  if (transcendentApplies({ element: TRANSCENDENT, transcendentGate: 'nonesuch' }, 'iron', {})) {
    out.push('an unknown gate fails open');
  }

  // --- and it lands as something real when the gate is shut ---------------
  if (elementNow(gated, 'iron', { selfHpFrac: 0.9 }) !== 'radiant') {
    out.push(`a shut gate lands as ${elementNow(gated, 'iron', { selfHpFrac: 0.9 })}, not its own element`);
  }
  if (elementNow(gated, 'iron', { selfHpFrac: 0.1 }) !== TRANSCENDENT) out.push('an open gate does not land transcendent');
  if (elementNow({ element: TRANSCENDENT }, 'iron', {}) !== TRANSCENDENT) out.push('an ungated ability falls back');
  // A transcendent ability with no fallback declared must still land as
  // SOMETHING, or a shut gate would be a swing that does nothing.
  if (!elementNow({ element: TRANSCENDENT, transcendentGate: 'onTheBrink' }, 'iron', {})) {
    out.push('a shut gate with no fallback lands as nothing at all');
  }

  // --- every gate is one of the two shapes the ruling names, and works ----
  const kinds = new Set();
  for (const [k, g] of Object.entries(TRANSCENDENT_GATES)) {
    kinds.add(g.kind);
    if (!['condition', 'setup'].includes(g.kind)) out.push(`${k} is a ${g.kind}, not a condition or a setup`);
    if (!g.label || /^[A-Z]/.test(g.label)) out.push(`${k}'s label does not read mid-sentence: "${g.label}"`);
    if (typeof g.check !== 'function') out.push(`${k} has no predicate`);
    // A gate that is true of an empty context is not a gate.
    if (g.check({})) out.push(`${k} is satisfied by nothing at all`);
  }
  if (!kinds.has('condition') || !kinds.has('setup')) {
    out.push('the ruling names narrow conditions AND significant setup; one shape is missing');
  }
  if (GATE_KEYS.length < 4) out.push(`only ${GATE_KEYS.length} gates, so every transcendent ability reads alike`);

  // --- rarity -------------------------------------------------------------
  const ranks = ['iron', 'bronze', 'silver', 'gold'];
  for (let i = 1; i < ranks.length; i++) {
    if (!(TRANSCENDENT_ODDS[ranks[i]] > TRANSCENDENT_ODDS[ranks[i - 1]])) {
      out.push(`transcendent is no more common at ${ranks[i]} than at ${ranks[i - 1]}`);
    }
  }
  if (TRANSCENDENT_ODDS.normal !== 0) out.push('a normal-rank character can roll transcendent damage');
  // "Even at Silver and Gold ... rare". The game's own rare seat is one in
  // forty, so this must be rarer than that at every rank.
  for (const r of ranks) {
    if (TRANSCENDENT_ODDS[r] > 1 / 40) out.push(`transcendent at ${r} is commoner than the game's rare seat`);
  }
  // ...and "very rare" below silver must be meaningfully rarer than "rare" at
  // it, or the two sentences describe one thing.
  if (!(TRANSCENDENT_ODDS.silver >= TRANSCENDENT_ODDS.bronze * 2)) {
    out.push('"very rare below silver" and "rare at silver" are the same number');
  }

  // --- the colour ---------------------------------------------------------
  const blueish = (hex) => {
    const b = hex & 0xff, r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff;
    return b >= g && g >= r && b > 0xc0;
  };
  if (!blueish(TRANSCENDENT_COLOR)) out.push('the transcendent colour is not a bright blue-white');
  if (!blueish(TRANSCENDENT_CORE)) out.push('the transcendent core is not a bright blue-white');
  if (TRANSCENDENT_CORE <= TRANSCENDENT_COLOR) out.push('the core is not brighter than the glow');
  if (TRANSCENDENT_TEXT.toLowerCase() !== `#${TRANSCENDENT_COLOR.toString(16).padStart(6, '0')}`) {
    out.push('the float colour and the fx colour are two different blues');
  }

  return out;
}
