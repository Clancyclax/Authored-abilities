// ===========================================================================
// ROUND 52 PHASE 2 -- CONDITIONAL SCALING.
//
// The user, choosing what to steal from the lore abilities: "Conditional
// scaling" first of four. Their own examples say what it should feel like:
//
//   "Doom awakening stone giving an ability dealing damage to a target equal
//    to their stamina after 15 seconds."
//   "Onslaught... Fire awakening stone generating fireballs."
//   "Apes together strong" -- the round-48 example, ally-count scaling.
//
// And the lore backs it: Farrah's Rising Flames climbs with each hit landed,
// Humphrey's clauses read "additional damage equal to...", Jason Asano's whole
// engine prices a blow by how many afflictions are already on the target.
//
// The shape of the mechanic is not the interesting decision -- a multiplier and
// a cap is a multiplier and a cap. The interesting decision is WHO DECIDES, and
// this file answers it the same way round 48 answered every other version of
// that question:
//
//        ESSENCE (the lever) -> WHETHER this ability grows under a condition
//        STONE   (the family) -> WHAT the condition IS
//
// A `raw` essence escalates because escalation is what Force means; whether it
// escalates with successive uses, with the target's remaining stamina, or with
// how far you have run is the stone's business. That is why the same essence
// feels different on two stones instead of feeling the same with a new colour,
// which is the complaint this whole run of rounds exists to answer.
// ===========================================================================

/**
 * The six conditions.
 *
 * `unit`      -- what one step of the condition IS, for the stats line.
 * `clause`    -- how the row reads. Takes the rolled numbers, returns English.
 * `needsTarget` -- evaluated against a specific enemy rather than the world.
 * `hint`      -- one line for the runtime evaluator, so the contract between
 *                this file and WorldScene._scalingMultiplier is written down in
 *                one place rather than inferred from a switch statement.
 */
const pct = (n) => Math.round(n * 100);

export const SCALE_MODES = {
  // The user's Doom clause: "an ability dealing damage to a target equal to
  // their stamina after 15 seconds." Monsters carry no stamina pool -- only the
  // party does -- so the condition is read as the fight the target has LEFT IN
  // IT, which is its remaining health. The key keeps the name the design plan
  // gave it; the clause says health, because a row must not promise the player
  // a pool the runtime cannot see.
  //
  // ROUND 74 -- EACH MODE HAS THREE PHRASINGS NOW, and `clauses` is the list
  // `scalingClause` picks from on the ability's own seed.
  //
  // Round 62's rule is that no single sentence may be more than 5% of the
  // roster, because the user's complaint was recognising the same line over
  // and over. There are six scaling modes and one sentence each, so each
  // mode's share of the roster IS that sentence's share -- and round 74's
  // attack floor (item 5) pushed `selfDepletion` from just under the bar to
  // 5.89% simply by generating more attacks for riders to ride.
  //
  // Raising the threshold would have been the wrong repair: the guard was
  // doing its job and reporting a real loss of variety. Three wordings per
  // mode divides each share by roughly three instead, which is the thing the
  // rule was asking for. Every variant says the SAME mechanic -- the runtime
  // reads `scaleOn`, `scalePer` and `scaleCap` and has never read this text --
  // so they are interchangeable to the game and only different to read.
  targetStamina: {
    label: 'the fight left in the target',
    unit: '10% of their remaining health',
    needsTarget: true,
    hint: 'the target\'s REMAINING health as a fraction, in tenths',
    clauses: [
      (per, cap, w) => `${w} rises +${pct(per)}% for every 10% of health the target still has (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% per tenth of the target's health still standing (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% per 10% of the target's health remaining (max +${pct(cap)}%)`,
    ],
  },
  targetAfflictions: {
    label: 'what is already eating the target',
    unit: 'affliction',
    needsTarget: true,
    hint: 'count of distinct afflictions currently on the target',
    clauses: [
      (per, cap, w) => `${w} rises +${pct(per)}% per affliction already on the target (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% for each affliction already eating them (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% per affliction the target carries (max +${pct(cap)}%)`,
    ],
  },
  selfDepletion: {
    label: 'your own hurt',
    unit: '10% of your missing health',
    needsTarget: false,
    hint: 'the caster\'s MISSING health as a fraction, in tenths',
    clauses: [
      (per, cap, w) => `${w} rises +${pct(per)}% for every 10% of your health already gone (max +${pct(cap)}%)`,
      // ROUND 119 -- "spent" was a lie, and the user caught it: "Ability says
      // '+8% per tenth of your own blood spent (max +56%)' but has no way to
      // spend life on the ability."
      //
      // The mechanic is right and the sentence was wrong. `selfDepletion` reads
      // MISSING health -- floor((1 - hp/maxHp) * 10) -- so it pays out for
      // damage you have already taken. Nothing anywhere spends life to cast it,
      // and the card's own cost line said `8 mana`. "Spent" names an action the
      // player can take and go looking for; "lost" names the state the ability
      // actually reads.
      //
      // This is the project's own naming rule with the two halves swapped: the
      // NAME carries the flavour, the DESCRIPTION states the mechanic. Blood is
      // fine as flavour. Blood you SPEND is a mechanic that does not exist.
      (per, cap, w) => `${w} rises +${pct(per)}% per tenth of your own blood already lost (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% per 10% of health you are missing (max +${pct(cap)}%)`,
    ],
  },
  distanceTravelled: {
    label: 'the ground you have covered',
    unit: '100 paces',
    needsTarget: false,
    hint: 'distance moved since the last cast of this ability, per 100 world units',
    clauses: [
      (per, cap, w) => `${w} rises +${pct(per)}% per 100 paces run since you last used it (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% for every hundred paces since its last use (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% for every 100 paces travelled between uses (max +${pct(cap)}%)`,
    ],
  },
  alliesNear: {
    label: 'who is standing with you',
    unit: 'ally',
    needsTarget: false,
    hint: 'living friendly bodies within 180 world units, caster excluded',
    clauses: [
      (per, cap, w) => `${w} rises +${pct(per)}% per ally beside you (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% for everyone standing with you (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% per ally within reach (max +${pct(cap)}%)`,
    ],
  },
  successiveUses: {
    label: 'the rhythm you have built',
    unit: 'use',
    needsTarget: false,
    hint: 'consecutive uses without a lapse longer than SCALE_STREAK_WINDOW',
    clauses: [
      // ROUND 285 (item 12) -- canon's words ([Relentless Assault]: "Each
      // use of this attack in quick succession increases the damage"), one
      // phrasing, in place of three home-made ones.
      (per, cap, w) => `${w} rises +${pct(per)}% with each use in quick succession (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% with each use in quick succession (max +${pct(cap)}%)`,
      (per, cap, w) => `${w} rises +${pct(per)}% with each use in quick succession (max +${pct(cap)}%)`,
    ],
  },
};

/** How long a `successiveUses` streak survives without another cast, seconds.
 *  Long enough to hold across a rotation, short enough that a streak is
 *  something you keep going rather than something you have. */
export const SCALE_STREAK_WINDOW = 8;

export const SCALE_MODE_KEYS = Object.keys(SCALE_MODES);

/**
 * Stone family -> the condition that family imposes.
 *
 * Every family gets one, so no stone is the boring stone. The assignments are
 * read off what the family already means elsewhere in the game rather than
 * spread evenly for its own sake -- `blood` scales on your own hurt because
 * every other blood mechanic in the project already does, and `motion` scales
 * on ground covered because a Motion stone that did not care how far you had
 * run would be a Motion stone in name only.
 *
 * The user's own examples are honoured where a family exists for them: the
 * Doom-stone clause ("damage equal to their stamina after 15 seconds") lands on
 * `death`, which is where Apocalypse lives, and it is the one family that also
 * carries a DELAY -- see SCALE_DELAY_FAMILIES.
 */
export const FAMILY_SCALING = {
  // --- the target's own state ---
  death:      'targetStamina',
  dark:       'targetStamina',
  serpent:    'targetAfflictions',
  fire:       'targetAfflictions',
  cold:       'targetAfflictions',
  mind:       'targetAfflictions',
  // --- your own state ---
  blood:      'selfDepletion',
  life:       'selfDepletion',
  light:      'selfDepletion',
  water:      'selfDepletion',
  aquatic:    'selfDepletion',
  // --- the ground you have covered ---
  motion:     'distanceTravelled',
  air:        'distanceTravelled',
  space:      'distanceTravelled',
  flyer:      'distanceTravelled',
  smallbeast: 'distanceTravelled',
  // --- who is with you ---
  beast:      'alliesNear',
  guard:      'alliesNear',
  order:      'alliesNear',
  identity:   'alliesNear',
  // --- the rhythm you build ---
  force:      'successiveUses',
  bludgeon:   'successiveUses',
  blade:      'successiveUses',
  polearm:    'successiveUses',
  ranged:     'successiveUses',
  storm:      'successiveUses',
  earth:      'successiveUses',
  craft:      'successiveUses',
  // ROUND 73 -- the alchemy family, added with the potion slots.
  // test_round52_scaling asserts EVERY stone family imposes a scaling
  // condition, and caught this as "unmapped: [alchemy]" the moment the family
  // existed. `selfDepletion` because an alchemist's power is measured by what
  // is left in the bottle -- the same reading blood and life already take.
  alchemy:    'selfDepletion',
};

/**
 * Families whose scaling RESOLVES LATE rather than at the moment of casting.
 *
 * This is the user's Doom clause, generalised: "an ability dealing damage to a
 * target equal to their stamina after 15 seconds." The condition is not read
 * when you press the button -- it is read when the clock runs out, so the
 * ability is a bet on what the fight will look like in fifteen seconds rather
 * than a reward for what it looks like now. That is a genuinely different thing
 * to hold in a kit and it is worth the extra runtime.
 *
 * Kept to the two death-adjacent families on purpose: a delay is a cost, and
 * spreading it everywhere would make every ability feel like a fuse.
 */
export const SCALE_DELAY_FAMILIES = {
  // ROUND 55 -- widened. The user: "Delayed conditions make sense for Doom,
  // Apocalypse, Time, Trap and probably quite a few more." Doom and Apocalypse
  // are `death`, Time is `space`, and Trap is `craft` -- so the families here
  // are the ones whose whole idea is that something has been SET and will go
  // off, rather than the ones that merely hit hard.
  //
  // The numbers are the wait, and they are not interchangeable: a death clause
  // is a sentence passed and takes the longest, a trap goes off as soon as
  // somebody walks into it, and a mind-stone's is the length of a held thought.
  death: 15,
  dark: 8,
  space: 10,     // Time, Gate, Nebula -- the moment is moved rather than spent
  craft: 6,      // Trap, Forge, Talisman -- a thing set now and sprung later
  cold: 7,       // the crack that opens after the freeze
  mind: 5,       // Omen, Vision -- you saw it coming before it came
};

/** The lever signatures that mean "this ability GROWS under some condition".
 *
 *  Read from the charters (leverCharters.js) rather than restated as a lever
 *  list, so a lever that changes its signature changes this too. `ally_scaling`
 *  and `opener` are deliberately ABSENT: `allies` and `stalk` already grant
 *  their own bespoke conditional riders (allyScaling, openerCrit) and giving
 *  them a second one would be double-dipping on the same idea. */
export const SCALING_SIGNATURES = new Set([
  'escalation',        // raw    -- Force, which is what escalation means
  'charge',            // burst  -- spends everything at once; a condition prices it
  'break_for_bonus',   // stealth-- the payoff for having been unseen
  'punish_on_action',  // bind   -- the target's own state is the whole idea
  'detonation',        // linger -- an affliction that pays off IS conditional
                       //           scaling; Jason Asano's whole engine is this
  'tether',            // chain  -- what it reaches is what it is worth
  'distance_scaling',  // reach  -- the lever that already scaled on a condition
                       //           in bespoke form (rangeStrike's maxMult)
]);

// Measured while choosing this set. With only the first four, 1.7% of generated
// candidates carried a condition -- roughly one ability per two kits, which is
// too rare to read as a system rather than as an oddity. Two of the four are
// also structurally starved: `bind` is on 40% of essences but its templates
// (weakenRing, timeFreeze, confuseTurn) carry no magnitude to scale, and much
// of `raw`'s output is multiplier-shaped rather than a flat number.
//
// The three additions are not padding. `detonation` is the closest thing in the
// vocabulary to the lore the user pointed at -- Asano prices every blow by what
// is already eating the target. `tether` and `distance_scaling` both already
// meant "worth depends on circumstance"; `reach` had even implemented it once
// by hand, as rangeStrike's maxMult.
//
// `ally_scaling` and `opener` stay OUT: `allies` and `stalk` already grant their
// own bespoke conditional riders (allyScaling, openerCrit), and a second one
// would be the same idea charged for twice.

/** Does this stone family impose a condition at all? */
export function scaleModeForFamily(family) {
  return FAMILY_SCALING[family] || null;
}

/** The delay a family's condition resolves after, in seconds. 0 = at cast. */
export function scaleDelayForFamily(family) {
  return SCALE_DELAY_FAMILIES[family] || 0;
}

/**
 * The stats-line clause for a finished spec, or '' when it carries no scaling.
 * One function so the ability row, the tooltip and the tests all read the same
 * sentence -- the round-49 lesson about the runtime contract, applied here
 * before there are two copies of it to drift apart.
 */
/**
 * ROUND 204 (item 2.3.3) -- WHAT IT IS THAT RISES.
 *
 * The user, on `carries your momentum: +6% per 100 paces travelled between
 * uses (max +36%)`: "almost intentionally vague language. I believe its trying
 * to be flavor heavy but a better version would be. Damage is increased by
 * movement prior to attacking ... Ability text needs to be clear."
 *
 * Two things were wrong with it and only one was the flavour. The clause
 * opened with a decorative phrase, which is gone from all seven modes; and it
 * never said WHAT the percentage applied to, so the reader was told a number
 * rises without being told which one. `scalableMagnitude` has always known --
 * it picks the field the multiplier lands on -- so the clause asks it.
 */
export function scaledNoun(spec) {
  switch (scalableMagnitude(spec)) {
    case 'healAmount': return 'its healing';
    case 'hotPerSec': return 'its mending';
    case 'shieldAmount': return 'the shield';
    case 'base': return 'its damage';
    default: return 'its effect';
  }
}

export function scalingClause(spec) {
  if (!spec || !spec.scaleOn) return '';
  const mode = SCALE_MODES[spec.scaleOn];
  if (!mode) return '';
  // ROUND 74 -- one of the mode's three phrasings, and WHICH one is a decision
  // the spec already carries (`scaleVariant`, written where the scaling itself
  // is assigned) rather than something recomputed here.
  //
  // That matters because this function has two callers at different moments:
  // `applyEssenceFlavour` builds the mechanic sentence BEFORE the ability has
  // a name (round 48 moved naming after the mechanic), and `statsLine` builds
  // the roster row afterwards. Anything derived from the spec's own text would
  // therefore produce one wording in the description and a different one in
  // the stats line for the same ability -- precisely the drift the comment at
  // the first caller warns about. A stored index cannot drift.
  const list = mode.clauses;
  const pick = list[(spec.scaleVariant || 0) % list.length];
  let body = pick(spec.scalePer || 0, spec.scaleCap || 0, scaledNoun(spec));
  // ROUND 190 (6.3) -- the streak prices both ways on a spammable ability.
  if (spec.spamCostPer) body += `; each successive attack costs +${pct(spec.spamCostPer)}% more (max +${pct(spec.spamCostPer * Math.round((spec.scaleCap || 0) / Math.max(0.01, spec.scalePer || 1)))}%)`;
  return spec.scaleDelay ? `${body}, resolved ${spec.scaleDelay}s later` : body;
}

/** Whether a spec has a magnitude worth conditioning. A scaling rider on an
 *  ability with no number to multiply is a sentence and nothing else. */
export function scalableMagnitude(spec) {
  if (!spec) return null;
  if (typeof spec.base === 'number' && spec.base > 0) return 'base';
  if (typeof spec.healAmount === 'number' && spec.healAmount > 0) return 'healAmount';
  if (typeof spec.hotPerSec === 'number' && spec.hotPerSec > 0) return 'hotPerSec';
  if (typeof spec.shieldAmount === 'number' && spec.shieldAmount > 0) return 'shieldAmount';
  return null;
}

/** ROUND 74 -- how many phrasings every SCALE_MODES entry carries. Exported so
 *  the generator rolls a variant index in range without hardcoding 3, and so a
 *  test can assert every mode really has that many rather than trusting the
 *  literal above. */
export const SCALE_CLAUSE_VARIANTS = 3;
