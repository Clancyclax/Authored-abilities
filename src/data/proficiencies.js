import { legendaryBaseOf } from './legendaryBases.js';
// ===========================================================================
// ROUND 202 (item 2) -- WEAPON PROFICIENCIES.
//
// The user's rulings, in their own numbering:
//
//   2.1   "Can't wield a staff (or wand later addition) without magical tool
//          proficiency"
//   2.1.1 "Staff and wands use mana instead of stamina to attack."
//   2.2   "Proficiency should halve weapon swing stamina cost for non magical
//          weapons"
//   2.3   "Polearm proficiency (scythes, spears)"
//   2.4   "Power proficiency (hammers, axes)"
//   2.5   "Dexterity proficiency (Bows, whips)"
//   2.6   "Blade proficiency (sword, dagger)"
//   2.7   "Stamina cost for weapons is increased each tier. Without an
//          appropriate weapon proficiency skill the player will burn lots of
//          stamina to use them."
//   2.8   "Obviously this means that weapon essences should have a high chance
//          to roll related weapon proficiencies"
//
// And, separately: "As a note magical tools are staffs (wands have not yet
// been added)." So `magicalTools` grants `staff` today and the wand row is
// written and commented rather than invented -- `PENDING_GRANTS` holds it, so
// the day a wand is added it is one line moved rather than a table to
// rediscover.
//
// ---------------------------------------------------------------------------
// WHY MAGICAL TOOLS ARE THE ONLY HARD GATE.
//
// 2.1 says you CANNOT wield a staff untrained. 2.7 says everything else is
// merely expensive. That asymmetry is the design, not an oversight, and it
// falls out of 2.1.1: a staff's attack does not spend stamina at all, so
// "burns lots of stamina" has nothing to bite on. A staff in untrained hands
// would be a strictly free weapon. Every other proficiency is a discount, and
// the untrained price is the real one rather than a punishment.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A DATA MODULE.
//
// The same reason advancement.js and hotkeys.js are: four surfaces have to
// agree about what a weapon costs and who may hold it -- the equip door, the
// swing, the card that quotes the price, and the generator that grants the
// passive. A rule that lives in the swing path and is restated in the tooltip
// is a rule that drifts, and this project has the scar tissue to prove it.
// ===========================================================================

/** The five, keyed as the passive's `prof` field names them. */
export const PROFICIENCIES = {
  magicalTools: {
    label: 'Magical Tools', short: 'magical tools',
    grants: ['staff'],
    // Wands are not in WEAPONS yet -- the user said so this round. Written
    // down rather than left to memory: the day one is added it joins `grants`
    // and nothing else in this file changes.
    pending: ['wand'],
    // The only proficiency that is a GATE rather than a discount. See above.
    gates: true,
    blurb: 'lets you hold a staff at all, and a staff spends mana rather than stamina',
  },
  blade: {
    label: 'Blade', short: 'swords and daggers', grants: ['sword', 'dagger'], gates: false,
    blurb: 'halves what a sword or a dagger costs to swing',
  },
  power: {
    // ROUND 204 (item 2.8.1) -- the user: "also what does heavy arms mean?"
    // Nothing, to a reader who has not been told. These `short` forms are
    // dropped into the middle of a sentence ("gain the ability to use ..."),
    // so each one now names the weapons it is about.
    label: 'Power', short: 'hammers and axes', grants: ['hammer', 'axe'], gates: false,
    blurb: 'halves what a hammer or an axe costs to swing',
  },
  polearm: {
    label: 'Polearm', short: 'spears and scythes', grants: ['spear', 'scythe', 'javelin'], gates: false,
    blurb: 'halves what a spear, a scythe or a javelin costs to throw or swing',
  },
  dexterity: {
    label: 'Dexterity', short: 'bows and whips', grants: ['bow', 'whip', 'crossbow'], gates: false,
    blurb: 'halves what a bow, a crossbow or a whip costs to use',
  },
};
export const PROFICIENCY_KEYS = Object.keys(PROFICIENCIES);

// ===========================================================================
// ROUND 221 -- THE MASTERY TECHNIQUE, AND WHY THE OLD SILVER RUNG HAD TO GO.
//
// The mastery ladder's silver rung was "you may call the weapon itself to
// your hand" -- round 220 corrected the sentence to what the code actually
// did, which was add the weapon to `ownedWeapons`. The user, on reading the
// honest version:
//
//   "Staff Mastery granting a basic staff at silver rank is wildly
//    uninteresting ... 'You can conjure a regular staff which you probably
//    already have because you have the staff essence' is very clearly not in
//    any way an equivalent [to a gold-rank canon ability]."
//
// He is right, and round 220's fix made it worse in the useful way: an
// honest boring rung is legibly boring, where a dishonest one hides behind
// its own wording. The rung was a shopping convenience on a ladder about how
// you fight.
//
// HIS OWN SPEC FOR THIS LADDER, from round 204, says what belongs there:
//
//   "proficiency at iron, add increased damage, range, or speed at bronze,
//    and then add TRIGGERED EFFECTS as silver."
//
// Iron and bronze were built to that line. Silver never was. So silver is a
// triggered effect now, and there are five of them because there are five
// proficiencies -- a mastery line is the one place in this game where the
// reward can be about the WEAPON rather than about the essence, and a single
// shared sentence would have thrown that away.
//
// WHY NOT AFFLICTIONS, which is where a ladder like this usually ends up:
// the user ruled it out in the same message -- "it better not just be adding
// afflictions because that's only for specific kits". A technique has to be
// worth having to a build that has no affliction package at all, so every
// one below is about POSITIONING, TEMPO or REACH, which every build uses.
//
// Each row is {key, trigger, label, ...fields the runtime reads}. `label` is
// what the card prints, so it states the mechanic and names its figures --
// round 215's rule, and round 220's.
// ===========================================================================
export const MASTERY_TECHNIQUES = {
  // A staff is the caster's weapon and its swing is the caster's worst
  // option, which is the whole awkwardness of holding one. So the technique
  // makes the swing part of the casting: what you cast charges the staff,
  // and the swing spends the charge as that spell's own element.
  magicalTools: {
    key: 'staffDischarge', trigger: 'cast',
    label: 'a spell you cast charges the staff; your next swing with it discharges for 60% of that spell\'s damage, in its element',
    dischargeFrac: 0.60,
  },
  // Blades are the tempo weapon: fast, light, and they live on the third
  // beat. An unblockable follow-up rewards staying in and finishing the
  // sequence rather than trading one hit and stepping out.
  blade: {
    key: 'bladeThird', trigger: 'everyThirdStrike',
    label: 'every third strike with a blade lands a second time for half, and that second strike cannot be blocked or parried',
    echoFrac: 0.50, every: 3,
  },
  // A hammer or an axe is the weapon you bring to a crowd, and its problem is
  // that it is slow. The kill is what buys the tempo back.
  power: {
    key: 'powerShock', trigger: 'kill',
    label: 'a kill with a hammer or an axe throws a shock 2 tiles wide for half of the blow that landed it',
    shockFrac: 0.50, shockRadius: 128,
  },
  // A polearm's whole argument is reach, and reach is worth nothing if the
  // target simply walks up the shaft. Pinning at the far end is the one
  // reward that makes standing at maximum range the right play.
  polearm: {
    key: 'polearmPin', trigger: 'strikeAtReach',
    label: 'a strike landed at the far end of a polearm\'s reach pins what it hits in place for 1.5s',
    pinSeconds: 1.5, reachFrac: 0.75,
  },
  // A bow rewards the one thing every other weapon punishes: standing still.
  // The draw is a real decision -- a second of no movement, in a game whose
  // whole defence is moving -- and the payoff is a shot that goes through
  // everything rather than stopping at the first body.
  dexterity: {
    key: 'dexDraw', trigger: 'stillOneSecond',
    label: 'stand still for 1s and the next shot or lash is fully drawn: it strikes everything in the line behind its target',
    drawSeconds: 1, lineThrough: true,
  },
};

/** The technique a proficiency teaches, or null. */
export function techniqueFor(profKey) {
  return MASTERY_TECHNIQUES[profKey] || null;
}

/** Faults in the technique table. Asserted rather than trusted, because the
 *  ladder builds a rung out of every row and a row with no label would be a
 *  rank-up that prints nothing. */
export function masteryTechniqueFaults() {
  const out = [];
  for (const k of PROFICIENCY_KEYS) {
    const t = MASTERY_TECHNIQUES[k];
    if (!t) { out.push(`${k} teaches no technique`); continue; }
    if (!t.label) out.push(`${k}'s technique has no sentence`);
    if (!t.trigger) out.push(`${k}'s technique fires on nothing`);
    // Every technique must carry at least one field beyond its three
    // bookkeeping ones, or it is a label with nothing behind it -- rule 1 of
    // the rank ladders, applied to the table that feeds them.
    const fields = Object.keys(t).filter(f => !['key', 'trigger', 'label'].includes(f));
    if (!fields.length) out.push(`${k}'s technique is a label with nothing behind it`);
  }
  const keys = Object.values(MASTERY_TECHNIQUES).map(t => t.key);
  if (new Set(keys).size !== keys.length) out.push('two proficiencies teach the same technique key');
  return out;
}

/** Weapon id -> the proficiency that covers it. Built from `grants`, so the
 *  two directions cannot disagree -- the hand-maintained-pair fault. */
export const PROFICIENCY_FOR_WEAPON = (() => {
  const out = {};
  for (const [k, p] of Object.entries(PROFICIENCIES)) {
    for (const w of p.grants) out[w] = k;
  }
  return out;
})();

/** Which proficiency a weapon needs, or null for one that needs none
 *  (unarmed, and anything a later round adds without a home). */
export function profForWeapon(wid) {
  // A legendary answers to the proficiency of the weapon it is built on.
  return PROFICIENCY_FOR_WEAPON[wid] || PROFICIENCY_FOR_WEAPON[legendaryBaseOf(wid)] || null;
}

/** The set a player carries, as a plain object of flags. `passiveMods.prof`
 *  is where the runtime keeps it; this normalises whatever it finds, so a
 *  save from before this round reads as "none" rather than throwing. */
export function profSet(mods) {
  const src = (mods && mods.prof) || {};
  const out = {};
  for (const k of PROFICIENCY_KEYS) out[k] = !!src[k];
  return out;
}
export function hasProf(mods, key) {
  return !!(key && profSet(mods)[key]);
}

// ===========================================================================
// 2.1 -- THE GATE.
// ===========================================================================

/** May this player pick this weapon up at all? Returns null, or the reason
 *  they may not, phrased for the float text that refuses them. */
export function wieldRefusal(wid, mods) {
  const key = profForWeapon(wid);
  if (!key) return null;
  const p = PROFICIENCIES[key];
  if (!p.gates || hasProf(mods, key)) return null;
  return `You have no ${p.short} proficiency`;
}

// ===========================================================================
// 2.1.1, 2.2, 2.7 -- WHAT A SWING COSTS.
//
// The tier curve is the user's "stamina cost for weapons is increased each
// tier". A weapon's tier is not a field it carries, so it is read off the one
// number that has always ordered the roster: `base` damage runs 4 (unarmed)
// to 18 (scythe, crossbow) and is exactly the ordering the phrase describes.
// `TIER_EDGES` turns it into five bands so the curve is a table a designer can
// argue with rather than an exponent nobody can picture.
//
// WHY THE UNTRAINED MULTIPLIER IS ON THE COST AND THE PROFICIENCY IS A HALVING
// rather than the reverse: 2.2 says proficiency HALVES the cost, which is a
// statement about the trained price, and 2.7 says the untrained player "will
// burn lots of stamina", which is a statement about the untrained one. Both
// are true of one curve read from either end, and writing it this way means
// the trained cost at tier 1 is the cost the game has always charged -- so
// nobody's early game gets quietly more expensive.
// ===========================================================================

/** Tier by base damage. Five bands; the edges are the roster's own clusters. */
export const TIER_EDGES = [5, 9, 13, 17];
export function weaponTier(weapon) {
  const b = (weapon && weapon.base) || 4;
  let t = 1;
  for (const e of TIER_EDGES) if (b > e) t++;
  return t;
}

/** What each tier multiplies the base stamina price by, TRAINED. One row per
 *  tier so the curve is legible; a fifth-tier weapon costs three times what a
 *  first-tier one does, before the untrained penalty. */
export const TIER_STAMINA_MULT = [1, 1.5, 2, 2.5, 3];

/** 2.2 -- what the proficiency is worth. */
export const PROFICIENT_STAMINA_MULT = 0.5;
/**
 * 2.7 -- "will burn lots of stamina". Twice the neutral price at every tier,
 * which against a proficient hand is FOUR times.
 *
 * WHY TWO AND NOT THREE, which is what the first version used. The user's word
 * is "burn", not "forbid": 2.7 describes a cost and 2.1 is the only rule in
 * this file that describes a refusal. At three the top tier cost 58 stamina a
 * swing and a starting character's whole tank is 50 (stats.js's base), so an
 * untrained scythe was not expensive, it was unusable -- a second hard gate,
 * smuggled in as a number. At two it costs 39 of 50: one swing, and then you
 * are winded and have learned why the proficiency exists.
 *
 * `proficiencyFaults` asserts that against the base tank, so nobody can
 * quietly turn a cost back into a gate by nudging this.
 */
export const UNTRAINED_STAMINA_MULT = 2;
/** The starting stamina tank (stats.js's BASE.maxStamina). Duplicated here as
 *  a FLOOR TO CHECK AGAINST rather than as a source of truth -- the fault
 *  function reads it, nothing else does, and if stats.js ever moves the real
 *  one this number being stale makes the check stricter rather than wrong. */
export const REFERENCE_STAMINA_TANK = 50;

/** The round-38 coefficient, unchanged: "a swing costs three tenths of the
 *  weapon's base". Kept here so the one arithmetic lives in one place. */
export const SWING_BASE_COEF = 0.3;

/**
 * What one swing of `weapon` costs this player, and out of which pool.
 *
 * Returns {pool, amount, tier, prof, trained}. `pool` is 'mana' for a magical
 * tool (2.1.1) and 'stamina' for everything else; a magical tool is never
 * charged the untrained penalty because it cannot be held untrained at all.
 *
 * `extraMult` is the caller's own modifiers (the strong arm's relief, round
 * 116's global weapon multiplier), applied last so this function stays a pure
 * description of the proficiency rules.
 */
export function swingCost(weapon, mods, extraMult = 1) {
  const key = profForWeapon(weapon && weapon.id);
  const trained = !key || hasProf(mods, key);
  const tier = weaponTier(weapon);
  const base = ((weapon && weapon.base) || 4) * SWING_BASE_COEF;
  const tierMult = TIER_STAMINA_MULT[Math.min(TIER_STAMINA_MULT.length, tier) - 1];
  // 2.1.1 -- a magical tool spends mana, and the tier curve applies to it
  // exactly as it does to a blade. What does not apply is the untrained
  // penalty, because it cannot be wielded untrained.
  const pool = (weapon && weapon.magical) ? 'mana' : 'stamina';
  const profMult = trained ? PROFICIENT_STAMINA_MULT : UNTRAINED_STAMINA_MULT;
  const amount = Math.max(1, Math.round(base * tierMult * profMult * extraMult));
  return { pool, amount, tier, prof: key, trained };
}

/** The sentence the inventory prints under a weapon. */
export function costLine(weapon, mods) {
  const c = swingCost(weapon, mods);
  const untrained = !c.trained && c.prof
    ? ` — ${PROFICIENCIES[c.prof].label} proficiency would halve it` : '';
  return `Tier ${c.tier}: ${c.amount} ${c.pool} a swing${untrained}`;
}

// ===========================================================================
// 2.8 -- WHICH ESSENCE LEANS WHICH WAY.
//
// "Weapon essences should have a high chance to roll related weapon
// proficiencies." The eight weapon essences map onto four of the five
// proficiencies; `magicalTools` has no weapon essence behind it, which is
// correct -- a staff is a caster's tool and the essences that should grant it
// are the ones that already deal in magic. `MAGIC_PROF_ESSENCES` names those
// rather than leaving the proficiency unreachable, which would have been the
// "written by one side, read by none" fault.
// ===========================================================================

export const ESSENCE_PROFICIENCY = {
  essSword: 'blade', essKnife: 'blade',
  essAxe: 'power', essHammer: 'power',
  // ROUND 205 -- the user, mid-round: "Note Sickle = Scythe."
  //
  // It was `blade` here, on the reading that a sickle is a short curved blade.
  // It is the scythe, which `polearm` grants -- so a Sickle essence taught you
  // swords and daggers and named its mastery after one of them, and the one
  // weapon the essence is actually about was in another proficiency entirely.
  // One line, and it fixes the grant, the blurb and the name together.
  essSickle: 'polearm', essSpear: 'polearm',
  essBow: 'dexterity', essWhip: 'dexterity',
};
// ===========================================================================
// ROUND 205 (item 1.1) -- WHICH WEAPON THE ESSENCE IS ACTUALLY ABOUT.
//
// The user, on a kit built from an AXE essence:
//
//   "Ability: [Hammer Mastery] (Axe)"
//
// The mastery line is named in awakening.js's proficiency sweep, and it named
// itself `PROFICIENCIES[key].grants[0]` -- the proficiency's FIRST weapon,
// which for `power` is the hammer whether the essence in the socket was a
// hammer or an axe. A proficiency covers two weapons on purpose; the essence
// covers one, and the essence is the thing whose name is printed next to it.
//
// So the mapping is stated rather than derived from list order, and
// `proficiencyFaults` asserts that every weapon here is one its own essence's
// proficiency actually grants -- the hand-maintained-pair fault, which this
// project has now paid for four times.
//
// essSickle is the one entry whose weapon is not spelled like the essence:
// there is no sickle in `WEAPONS`, and the user's ruling this round is that
// there does not need to be -- "Note Sickle = Scythe." So it is the scythe,
// which is also why `ESSENCE_PROFICIENCY` moved it to `polearm` below.
// ===========================================================================
export const ESSENCE_WEAPON = {
  essSword: 'sword', essKnife: 'dagger', essSickle: 'scythe',
  essAxe: 'axe', essHammer: 'hammer',
  essSpear: 'spear',
  essBow: 'bow', essWhip: 'whip',
};

/**
 * The weapon a mastery line granted by THIS essence should be named after, or
 * null when nothing honest can be said.
 *
 * Null rather than a fallback guess: a proficiency that covers several weapons
 * and was granted by an essence that names none of them has no one weapon to
 * be about, and the caller says `${label} Mastery` instead. A one-weapon
 * proficiency is different -- `magicalTools` grants only the staff, so "Staff
 * Mastery" is not a guess, it is the whole of what the proficiency is.
 */
export function masteryWeaponFor(essenceId, profKey) {
  const own = ESSENCE_WEAPON[essenceId];
  const p = PROFICIENCIES[profKey];
  if (!p) return null;
  if (own && p.grants.includes(own)) return own;
  return p.grants.length === 1 ? p.grants[0] : null;
}

/** Essences that may grant the magical-tool proficiency. No weapon essence
 *  does; these are the ones whose whole character is spellwork. */
export const MAGIC_PROF_ESSENCES = ['essMagic', 'essRune', 'essArcane', 'essMana',
  'essStar', 'essMoon', 'essSpirit', 'essMind', 'essLight', 'essBalance', 'essSin'];

/** "High chance", as a number. A weapon essence grants its proficiency at this
 *  rate; a magic essence grants magical tools at the lower one, because a
 *  Sword essence not making you good with a sword is absurd and a Moon essence
 *  not handing you a staff simply means you found one elsewhere. */
export const WEAPON_ESSENCE_PROF_CHANCE = 0.8;
export const MAGIC_ESSENCE_PROF_CHANCE = 0.45;

/** Which proficiency this essence may grant, and how likely it is to. */
export function profGrantFor(essenceId) {
  if (ESSENCE_PROFICIENCY[essenceId]) {
    return { key: ESSENCE_PROFICIENCY[essenceId], chance: WEAPON_ESSENCE_PROF_CHANCE };
  }
  if (MAGIC_PROF_ESSENCES.includes(essenceId)) {
    return { key: 'magicalTools', chance: MAGIC_ESSENCE_PROF_CHANCE };
  }
  return null;
}

// ===========================================================================
// FAULTS.
// ===========================================================================

export function proficiencyFaults(WEAPONS = null) {
  const out = [];

  // --- the user's five, by name, with the weapons they named --------------
  const want = {
    magicalTools: ['staff'],
    polearm: ['scythe', 'spear'],
    power: ['hammer', 'axe'],
    dexterity: ['bow', 'whip'],
    blade: ['sword', 'dagger'],
  };
  for (const [key, weps] of Object.entries(want)) {
    if (!PROFICIENCIES[key]) { out.push(`there is no ${key} proficiency`); continue; }
    for (const w of weps) {
      if (profForWeapon(w) !== key) out.push(`${w} answers to ${profForWeapon(w)}, the ruling says ${key}`);
    }
  }
  if (PROFICIENCY_KEYS.length !== 5) out.push(`${PROFICIENCY_KEYS.length} proficiencies, the ruling names five`);

  // --- no weapon answers to two, and every one has a home -----------------
  const seen = new Set();
  for (const [key, p] of Object.entries(PROFICIENCIES)) {
    for (const w of p.grants) {
      if (seen.has(w)) out.push(`${w} is granted by two proficiencies`);
      seen.add(w);
    }
    if (!p.grants.length) out.push(`${key} grants nothing`);
    if (!p.blurb) out.push(`${key} has no sentence`);
  }
  if (WEAPONS) {
    for (const [wid, w] of Object.entries(WEAPONS)) {
      if (wid === 'unarmed') continue;
      if (!profForWeapon(wid)) out.push(`${wid} answers to no proficiency`);
      // A magical weapon must be gated, and a gated one must be magical --
      // otherwise the mana swap and the wield refusal disagree about which
      // weapons they are talking about.
      const key = profForWeapon(wid);
      const gated = key && PROFICIENCIES[key].gates;
      if (!!w.magical !== !!gated) {
        out.push(`${wid} is ${w.magical ? '' : 'not '}magical but ${gated ? 'is' : 'is not'} gated`);
      }
    }
    // The wand is not in the roster yet, which is what `pending` records.
    if (WEAPONS.wand) out.push('a wand exists now; move it from PENDING to magicalTools.grants');
  }
  for (const w of PROFICIENCIES.magicalTools.pending) {
    if (PROFICIENCIES.magicalTools.grants.includes(w)) out.push(`${w} is both granted and pending`);
  }

  // --- 2.1: the gate, and only on magical tools ---------------------------
  const none = { prof: {} };
  const mage = { prof: { magicalTools: true } };
  if (!wieldRefusal('staff', none)) out.push('a staff can be held with no magical-tool proficiency');
  if (wieldRefusal('staff', mage)) out.push('a staff is refused to someone trained in magical tools');
  for (const w of ['sword', 'axe', 'spear', 'bow', 'whip', 'dagger', 'hammer', 'scythe']) {
    if (wieldRefusal(w, none)) out.push(`${w} is refused to the untrained; 2.7 says it is expensive, not forbidden`);
  }
  if (wieldRefusal('unarmed', none)) out.push('bare hands need a proficiency');

  // --- 2.1.1: the pool ----------------------------------------------------
  const staffCost = swingCost({ id: 'staff', base: 5, magical: true }, mage);
  if (staffCost.pool !== 'mana') out.push(`a staff spends ${staffCost.pool}, the ruling says mana`);
  const swordCost = swingCost({ id: 'sword', base: 8 }, { prof: { blade: true } });
  if (swordCost.pool !== 'stamina') out.push(`a sword spends ${swordCost.pool}, not stamina`);

  // --- 2.2: proficiency halves it -----------------------------------------
  // Measured on a HEAVY weapon, because `Math.max(1, Math.round(...))` on a
  // dagger's 1-point swing turns any ratio into whatever rounding says: a
  // trained sword costs 2 and an untrained one 7, which is 3.5x and is the
  // arithmetic being correct rather than the rule being wrong.
  const trained = swingCost({ id: 'scythe', base: 18 }, { prof: { polearm: true } }).amount;
  const raw = swingCost({ id: 'scythe', base: 18 }, none).amount;
  const ratio = raw / trained;
  const wantRatio = UNTRAINED_STAMINA_MULT / PROFICIENT_STAMINA_MULT;
  if (Math.abs(ratio - wantRatio) > 0.2) {
    out.push(`untrained costs ${ratio.toFixed(1)}x trained; the two multipliers say ${wantRatio}x`);
  }
  // ...and the halving is exactly a halving against the same untrained-free
  // baseline, which is what 2.2 literally says.
  const neutral = Math.max(1, Math.round(18 * SWING_BASE_COEF * TIER_STAMINA_MULT[weaponTier({ base: 18 }) - 1]));
  if (trained !== Math.max(1, Math.round(neutral * PROFICIENT_STAMINA_MULT))) {
    out.push(`proficiency does not halve the cost: ${trained} against a neutral ${neutral}`);
  }

  // --- 2.7: the cost rises with tier, every step --------------------------
  const bases = [4, 7, 11, 15, 18];
  const tiers = bases.map(b => weaponTier({ base: b }));
  if (tiers.join(',') !== '1,2,3,4,5') out.push(`the tier bands are ${tiers.join(',')} for bases ${bases.join(',')}`);
  let last = 0;
  for (const b of bases) {
    const c = swingCost({ id: 'x', base: b }, none).amount;
    if (!(c > last)) out.push(`a base-${b} weapon costs ${c}, no more than the tier below it`);
    last = c;
  }
  if (TIER_STAMINA_MULT.length !== TIER_EDGES.length + 1) {
    out.push('the tier multipliers and the tier bands are different lengths');
  }
  // 2.7 IS A COST, NOT A SECOND GATE. The heaviest weapon in the game, in
  // untrained hands, must still be swingable once on a starting tank -- 2.1 is
  // the only refusal in this file and it names one weapon family.
  const heaviest = swingCost({ id: 'scythe', base: 18 }, none).amount;
  if (heaviest >= REFERENCE_STAMINA_TANK) {
    out.push(`an untrained tier-5 swing costs ${heaviest} of a ${REFERENCE_STAMINA_TANK} tank, which is a gate rather than a cost`);
  }
  if (heaviest < REFERENCE_STAMINA_TANK * 0.4) {
    out.push(`an untrained tier-5 swing costs only ${heaviest} of a ${REFERENCE_STAMINA_TANK} tank; 2.7 says it should burn`);
  }
  // The trained price at the bottom tier is what the game always charged --
  // round 38's "three tenths of the weapon's base", so nobody's early game got
  // quietly more expensive this round.
  const unarmedTrained = swingCost({ id: 'unarmed', base: 4 }, none).amount;
  if (unarmedTrained !== 1) out.push(`bare hands now cost ${unarmedTrained}; round 38's floor is 1`);

  // --- 2.8: the essences --------------------------------------------------
  const weaponEssences = ['essSword', 'essKnife', 'essSickle', 'essAxe', 'essHammer',
    'essSpear', 'essBow', 'essWhip'];
  for (const e of weaponEssences) {
    const g = profGrantFor(e);
    if (!g) { out.push(`${e} is a weapon essence and grants no proficiency`); continue; }
    if (g.chance < 0.5) out.push(`${e} grants ${g.key} at only ${g.chance}; the ruling says a high chance`);
  }
  if (profGrantFor('essWolf')) out.push('a beast essence grants a weapon proficiency');
  // ROUND 205 (item 1.1) -- the mastery line is named after the ESSENCE'S
  // weapon, and every entry must be one the essence's own proficiency covers.
  // Without this the table is a second opinion about which weapons answer to
  // which proficiency, and the two would drift the first time either moved.
  for (const [eid, wid] of Object.entries(ESSENCE_WEAPON)) {
    const key = ESSENCE_PROFICIENCY[eid];
    if (!key) { out.push(`${eid} names a mastery weapon but grants no proficiency`); continue; }
    if (!PROFICIENCIES[key].grants.includes(wid)) {
      out.push(`${eid}'s mastery weapon is ${wid}, which ${key} does not grant`);
    }
    if (WEAPONS && !WEAPONS[wid]) out.push(`${eid}'s mastery weapon ${wid} is not in the roster`);
  }
  // Every weapon essence must be able to name itself, or the fault this round
  // fixed -- an Axe essence granting "Hammer Mastery" -- comes back as soon as
  // somebody adds a ninth weapon essence.
  for (const e of weaponEssences) {
    if (!masteryWeaponFor(e, ESSENCE_PROFICIENCY[e])) {
      out.push(`${e} has no weapon to name its mastery after`);
    }
  }
  // Every proficiency is reachable from some essence -- otherwise one of the
  // five is a thing the game describes and no player can ever get.
  const reachable = new Set(Object.values(ESSENCE_PROFICIENCY));
  for (const e of MAGIC_PROF_ESSENCES) {
    const g = profGrantFor(e); if (g) reachable.add(g.key);
  }
  for (const k of PROFICIENCY_KEYS) if (!reachable.has(k)) out.push(`no essence can grant ${k}`);

  return out;
}
