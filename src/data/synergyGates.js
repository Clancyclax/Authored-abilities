// ===========================================================================
// ROUND 207 -- A GATE: A PREDICATE ON THE MOMENT, AND PROSE FOR IT.
//
// The user gave three Sin abilities as examples of what synergy should feel
// like:
//
//   Sloth's Inferno  -- Cursed lowers fire resistance by 5% for every 100
//                       paces moved while active.
//   Pride Reaper     -- enemies at full health take 50% more damage from
//                       critical hits with a scythe.
//   Greed's Arsenal  -- special attacks with 2 weapons equipped cost 15% less
//                       and deal 15% more damage.
//
// All three are one shape: SOMETHING OBSERVABLE IS TRUE, so SOMETHING CHANGES.
// Which is why round 206's `detonate` was the wrong idea at the wrong size --
// "the target already carries a condition" is ONE predicate, not a category.
//
// And the shape already exists. `TRANSCENDENT_GATES` (transcendent.js, round
// 203) is `{label, kind, check(ctx)}`, evaluated once per cast against a ctx
// built by `_transcendentCtx`. This file is the same idea with a wider
// vocabulary and a different payload.
//
// ---------------------------------------------------------------------------
// WHY THIS SOLVES THE WORDING PROBLEM RATHER THAN ADDING TO IT.
//
// Rounds 202, 204, 204b, 204c and 205 were every one of them a complaint about
// generated prose, and I told the user that `detonate` and `alternate` were
// where a lexical rule would not save me. A gate carries its OWN label,
// authored once, beside the predicate it describes. So the clause is
// assembled from two authored halves -- a gate's label and an effect's phrase
// -- and there is no sentence for a generator to get wrong. Twenty-odd labels,
// readable in one sitting, is the whole of the prose surface.
//
// ---------------------------------------------------------------------------
// ONE SEAM, NOT FIFTEEN.
//
// A per-target damage multiplier would have to be threaded through the fifteen
// `_damageMonster` calls inside `_castKnownAbility`, which is fifteen chances
// to miss one. Instead the gate is resolved ONCE per cast and stamped on the
// cast's own clone, exactly where round 203 stamps the transcendent gate --
// and everything downstream inherits it because it is reading the clone.
//
// The cost of that is real and worth stating: in an area attack the gate is
// judged against the PRIMARY target, not each one. That is already how the
// transcendent gate behaves, so the two agree, and a gate that meant something
// different per victim of the same cast would be a rule no player could read.
// ===========================================================================

/**
 * The moment, as a gate reads it. One object per cast.
 *
 * Every field here must be something the scene can answer cheaply and the
 * player can SEE -- a gate keyed on a number nobody can observe is a rule that
 * reads as randomness. `_synergyCtx` in WorldScene builds it.
 */
export const CTX_FIELDS = [
  'selfHpFrac', 'targetHpFrac', 'targetAfflictions', 'targetHeld',
  'enemiesNear', 'weaponsHeld', 'stillFor', 'moving', 'pacesSinceStill',
  // ROUND 213 -- WHAT the target is suffering, not just how much of it.
  //
  // Until now a gate could ask `targetAfflictions`, a COUNT, and nothing
  // else. That was enough for round 207's thirteen and it is the reason
  // `alias` could not be wired: "make bleeding count as burning for the
  // purpose of other abilities who do more damage to burning enemies" needs
  // something in the game to ask what kind of burning a target is carrying,
  // and nothing did. So the ctx now carries the ELEMENTS on the target --
  // the ones its conditions came from, plus any an alias has lent it -- and
  // the three gates below read them.
  'targetElements',
];

/** The element families a condition can belong to, and how a gate says it. */
export const ELEMENT_ADJ = {
  fire: 'burning', frost: 'frozen', lightning: 'shocked',
  nature: 'poisoned', physical: 'bleeding', shadow: 'rotting', radiant: 'seared',
};
export const ELEMENT_KEYS = Object.keys(ELEMENT_ADJ);

/** Is this element on the target? Tolerates a missing field. */
const onTarget = (c, el) => {
  const t = c && c.targetElements;
  if (!t) return false;
  return Array.isArray(t) ? t.includes(el) : (t.has ? t.has(el) : false);
};

export const SYNERGY_GATES = {
  // --- what is true of the target ---------------------------------------
  onAfflicted: {
    label: 'against a target already suffering one of your afflictions',
    kind: 'target', check: (c) => (c.targetAfflictions || 0) >= 1,
  },
  onUntouched: {
    label: 'against a target at full health',
    kind: 'target', check: (c) => (c.targetHpFrac != null) && c.targetHpFrac >= 0.999,
  },
  onWounded: {
    label: 'against a target below half health',
    kind: 'target', check: (c) => (c.targetHpFrac != null) && c.targetHpFrac <= 0.5,
  },
  onHeld: {
    label: 'against a target that cannot move',
    kind: 'target', check: (c) => !!c.targetHeld,
  },
  // --- ROUND 213 -- what KIND of harm the target is already carrying ------
  //
  // Three rather than seven, and the three are the ones the user's own
  // examples name: "bonuses for freezing burning enemies", "sword strikes
  // bleed damage, and bleed damage triggers burning". Seven would have grown
  // GATE_KEYS from thirteen to twenty and thinned every existing gate's share
  // of the roll by a third, which is a balance change made by accident.
  // `element` is declared rather than read back out of the label. The first
  // cut had kitSynergy.js recover it with a regex over the label text, which
  // is a derivation that guesses -- reword one label and the alias verb
  // quietly starts writing onto an element nothing reads.
  onBurning: {
    label: 'against a target that is already burning',
    kind: 'condition', element: 'fire', check: (c) => onTarget(c, 'fire'),
  },
  onBleeding: {
    label: 'against a target that is already bleeding',
    kind: 'condition', element: 'physical', check: (c) => onTarget(c, 'physical'),
  },
  onFrozen: {
    label: 'against a target the frost already has hold of',
    kind: 'condition', element: 'frost', check: (c) => onTarget(c, 'frost'),
  },
  theyHaveMore: {
    label: 'against a target with more health left than you',
    kind: 'target', check: (c) => (c.targetHpFrac != null) && (c.selfHpFrac != null)
      && c.targetHpFrac > c.selfHpFrac,
  },
  // --- what is true of you ----------------------------------------------
  whileStill: {
    label: 'while you have stood still for two seconds',
    kind: 'self', check: (c) => (c.stillFor || 0) >= 2,
  },
  whileMoving: {
    label: 'while you are moving',
    kind: 'self', check: (c) => !!c.moving,
  },
  whileHurt: {
    label: 'while you are below half health',
    kind: 'self', check: (c) => (c.selfHpFrac != null) && c.selfHpFrac <= 0.5,
  },
  whileWhole: {
    label: 'while you are unhurt',
    kind: 'self', check: (c) => (c.selfHpFrac != null) && c.selfHpFrac >= 0.999,
  },
  // --- what is true of the fight ----------------------------------------
  outnumbered: {
    label: 'while three or more enemies are within reach of you',
    kind: 'world', check: (c) => (c.enemiesNear || 0) >= 3,
  },
  alone: {
    label: 'while nothing else is within reach of them',
    kind: 'world', check: (c) => (c.enemiesNear || 0) <= 1,
  },
  // --- what you are carrying --------------------------------------------
  twoWeapons: {
    label: 'while you hold a weapon in each hand',
    kind: 'loadout', check: (c) => (c.weaponsHeld || 0) >= 2,
  },
  emptyHanded: {
    label: 'while both your hands are empty',
    kind: 'loadout', check: (c) => (c.weaponsHeld || 0) === 0,
  },
};
export const GATE_KEYS = Object.keys(SYNERGY_GATES);

// ===========================================================================
// WHAT A GATE PAYS.
//
// Three payloads, because the user's own three examples used two of them
// ("cost 15% less and deal 15% more") and because an engine whose every clause
// is "+X% damage" is a spreadsheet. Each carries its own phrase, so the clause
// is two authored halves and nothing in between.
// ===========================================================================
export const GATE_EFFECTS = {
  damage:   { field: 'gateDmgPct',  phrase: (p) => `it deals ${Math.round(p * 100)}% more` },
  cheaper:  { field: 'gateCostPct', phrase: (p) => `it costs ${Math.round(p * 100)}% less` },
  cooldown: { field: 'gateCdPct',   phrase: (p) => `it comes back ${Math.round(p * 100)}% sooner` },
};
export const EFFECT_KEYS = Object.keys(GATE_EFFECTS);

// ===========================================================================
// THE SEVEN DEADLY SINS.
//
// The user: "Sin is about transgression. Debuffs that punish for breaking set
// rules. I would try to make abilities look at the 7 deadly sins."
//
// So each sin is a RULE, expressed as a gate, and the ability pays out while
// the rule holds. The sin names the rule; the gate is the rule in predicate
// form; the EFFECT is deliberately not fixed here --
//
//   "Reminder that the 7 sins should each be able to flex in a lot of ways
//    depending on essence build and awakening stones."
//
// -- so which of the three payloads a sin uses, and how much, is decided by
// the socket at generation time, the same way the stone decides the verb. A
// Sloth ability off one stone is cheaper while you stand still and off another
// hits harder, and both are Sloth.
// ===========================================================================
export const SINS = {
  sloth:    { gate: 'whileStill',   blurb: 'the sin of standing still' },
  wrath:    { gate: 'whileHurt',    blurb: 'the sin of fighting hurt' },
  pride:    { gate: 'onUntouched',  blurb: 'the sin of striking the unmarked' },
  envy:     { gate: 'theyHaveMore', blurb: 'the sin of wanting what they have' },
  greed:    { gate: 'twoWeapons',   blurb: 'the sin of carrying more than you need' },
  gluttony: { gate: 'onAfflicted',  blurb: 'the sin of feeding on the suffering' },
  lust:     { gate: 'alone',        blurb: 'the sin of having them to yourself' },
};
export const SIN_KEYS = Object.keys(SINS);

/** Is this gate true right now? A gate whose ctx field is missing answers
 *  false rather than throwing -- a moment the scene could not describe is not
 *  a moment the rule holds in. */
export function gateHolds(key, ctx) {
  const g = SYNERGY_GATES[key];
  if (!g) return false;
  try { return !!g.check(ctx || {}); } catch (e) { return false; }
}

/** The clause, from two authored halves and nothing in between. */
export function gateClauseText(spec) {
  if (!spec) return '';
  const g = SYNERGY_GATES[spec.gate];
  const e = GATE_EFFECTS[spec.effect];
  if (!g || !e || !(spec.pct > 0)) return '';
  // The gate labels are authored lower-case because they are dropped
  // mid-sentence after an optional sin lead -- so the sentence is capitalised
  // HERE, once, rather than each label carrying a capital it must not have
  // when a lead precedes it. `gateFaults` asserts both halves of that: no
  // label starts with a capital, and no finished clause fails to.
  const lead = spec.sin ? `${cap(spec.sin)} -- ` : '';
  const body = `${g.label}, ${e.phrase(spec.pct)}.`;
  return lead ? `${lead}${body}` : cap(body);
}
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

// ===========================================================================
// FAULTS.
// ===========================================================================

export function gateFaults() {
  const out = [];

  for (const [k, g] of Object.entries(SYNERGY_GATES)) {
    if (!g.label) out.push(`gate ${k} has no label`);
    if (typeof g.check !== 'function') out.push(`gate ${k} has no predicate`);
    // ROUND 213 -- a condition gate is the reader an alias writes for, so it
    // has to say which element it reads, and that element has to be one the
    // table knows how to describe.
    if (g.kind === 'condition') {
      if (!g.element) out.push(`condition gate ${k} does not say which element it reads`);
      else if (!ELEMENT_ADJ[g.element]) out.push(`condition gate ${k} reads ${g.element}, which has no adjective`);
      else if (!String(g.check).includes(`'${g.element}'`)) {
        out.push(`condition gate ${k} declares ${g.element} and its predicate does not read it`);
      }
    }
    if (!['target', 'self', 'world', 'loadout', 'condition'].includes(g.kind)) {
      out.push(`gate ${k} is of kind ${g.kind}`);
    }
    // A label is dropped mid-sentence after an optional lead, so it must not
    // start with a capital and must not end with its own full stop.
    if (/^[A-Z]/.test(g.label)) out.push(`gate ${k} starts with a capital`);
    if (/\.$/.test(g.label)) out.push(`gate ${k} ends with a full stop`);
    // Every gate must be answerable from the declared ctx -- a predicate that
    // reads a field `_synergyCtx` does not build is a rule that never fires,
    // which is this project's fault class 2 wearing a new hat.
    const src = String(g.check);
    const reads = (src.match(/c\.(\w+)/g) || []).map(s => s.slice(2));
    for (const f of reads) if (!CTX_FIELDS.includes(f)) out.push(`gate ${k} reads ${f}, which is not a ctx field`);
  }

  // --- both answers must be reachable ------------------------------------
  // A gate that is always true is a flat bonus wearing a condition; one that is
  // always false is a sentence on a card that never happens. Probed against
  // the extremes of every ctx field rather than a sample somebody chose.
  const worlds = [
    // ROUND 213 -- the worlds gained `targetElements`, and the reason is
    // worth stating: without it the three new gates were reported as "never
    // true", which is the reachability check working exactly as intended.
    // A gate whose ctx field no world sets cannot be told apart from a gate
    // whose predicate is broken, and both should fail.
    { selfHpFrac: 1, targetHpFrac: 1, targetAfflictions: 0, targetHeld: false, enemiesNear: 0, weaponsHeld: 0, stillFor: 0, moving: false, targetElements: [] },
    { selfHpFrac: 0.2, targetHpFrac: 0.3, targetAfflictions: 3, targetHeld: true, enemiesNear: 5, weaponsHeld: 2, stillFor: 5, moving: true, targetElements: ['fire', 'physical', 'frost'] },
    { selfHpFrac: 0.5, targetHpFrac: 1, targetAfflictions: 1, targetHeld: false, enemiesNear: 1, weaponsHeld: 1, stillFor: 3, moving: false, targetElements: ['nature'] },
  ];
  for (const k of GATE_KEYS) {
    const seen = new Set(worlds.map(w => gateHolds(k, w)));
    if (!seen.has(true)) out.push(`gate ${k} is never true`);
    if (!seen.has(false)) out.push(`gate ${k} is never false`);
  }

  // --- the effects -------------------------------------------------------
  for (const [k, e] of Object.entries(GATE_EFFECTS)) {
    if (!e.field) out.push(`effect ${k} names no field`);
    const said = e.phrase(0.25);
    if (!/\d/.test(said)) out.push(`effect ${k} says "${said}" with no figure`);
    if (/^[A-Z]/.test(said)) out.push(`effect ${k} starts with a capital`);
  }

  // --- the sins ----------------------------------------------------------
  if (SIN_KEYS.length !== 7) out.push(`${SIN_KEYS.length} sins, there are seven`);
  const used = new Set();
  for (const [k, s] of Object.entries(SINS)) {
    if (!SYNERGY_GATES[s.gate]) out.push(`sin ${k} names gate ${s.gate}, which does not exist`);
    if (used.has(s.gate)) out.push(`gate ${s.gate} is used by two sins`);
    used.add(s.gate);
    if (!s.blurb) out.push(`sin ${k} has no blurb`);
  }

  // --- the clause, over every gate x effect it can produce ---------------
  let checked = 0;
  for (const gk of GATE_KEYS) {
    for (const ek of EFFECT_KEYS) {
      for (const pct of [0.15, 0.25, 0.5]) {
        const t = gateClauseText({ gate: gk, effect: ek, pct });
        if (!t) { out.push(`no clause for ${gk} x ${ek}`); continue; }
        if (!/\d/.test(t)) out.push(`clause carries no figure: "${t}"`);
        if (!/^[A-Z]/.test(t)) out.push(`clause does not start with a capital: "${t}"`);
        if (!/\.$/.test(t)) out.push(`clause does not end: "${t}"`);
        if (/\bessence\b/i.test(t)) out.push(`clause names an essence: "${t}"`);
        if (/\b(more|less|sooner) (than|again)\b/i.test(t)) out.push(`clause compares to nothing: "${t}"`);
        checked++;
      }
    }
  }
  if (!checked) out.push('no clause was checked');

  return out;
}
