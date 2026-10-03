// ROUND 75 -- STACKING INSTANCES THAT ACCUMULATE AND ARE CONSUMED.
//
// The user, with the buff/debuff symbol drop:
//
//   "rare build-defining buffs/debuffs with stacking instances that
//    accumulate and are consumed"
//
// and three examples from the books: Sophie's Blessing of Anticipation,
// Jason's Sin / Mark of Sin, and Sophie's Agent of Karma.
//
// WHY THIS IS NOT THE DEBUFF ENGINE. debuffs.js already stacks -- poison runs
// five deep, `stackCap` and `debuffMagnitude` have existed since round 57. But
// those stacks are a MAGNITUDE on a timer: they land, they make a number
// bigger for a while, and they expire having done what they were always going
// to do. Nothing spends them, and nothing about them changes what you do next.
//
// These are a RESOURCE. They build from one thing you do and are paid out on
// another, and the whole texture is the gap between: a player carrying eight
// stacks of Sin is holding something, and choosing when to spend it is the
// decision the mechanic exists to create. That is what "accumulate and are
// consumed" means and it is why this is a separate system rather than another
// row in DEBUFFS.
//
// THE THREE SHAPES, which are the user's three examples generalised:
//
//   BOON    builds on YOU from what you do, spent to empower what you do next.
//           Sophie's Blessing of Anticipation: preparation banked, then used.
//   MARK    builds on an ENEMY from your hits, detonated on them for damage
//           proportional to how much you put there. Jason's Mark of Sin.
//   LEDGER  builds on you from what is done TO you, and pays back out.
//           Sophie's Agent of Karma: harm accrues, and is answered.
//
// Every generated stacking effect is one of these three. The three authored
// signatures below are the book versions; the generator rolls the rest from
// the same parts, which is what the user asked for when they chose "a
// generated rare family" with the named ones as signatures inside it.
//
// DECAY IS NOT OPTIONAL AND IS THE BALANCE. A resource that only ever goes up
// is a resource you open every fight at maximum, which is the same as not
// having one. Every effect below bleeds a stack every few seconds once you
// stop feeding it, so the stacks mean "what I have been doing lately" rather
// than "how long this character has existed".

/** What adds a stack. The event names the runtime raises. */
export const STACK_TRIGGERS = {
  hit: { key: 'hit', label: 'land a hit', rate: 'often' },
  crit: { key: 'crit', label: 'land a critical hit', rate: 'sometimes' },
  kill: { key: 'kill', label: 'kill an enemy', rate: 'rarely' },
  cast: { key: 'cast', label: 'use an ability', rate: 'sometimes' },
  taken: { key: 'taken', label: 'take damage', rate: 'often' },
  dodge: { key: 'dodge', label: 'avoid a blow', rate: 'rarely' },
};
export const STACK_TRIGGER_KEYS = Object.keys(STACK_TRIGGERS);

/** What spending them does. `per` is the magnitude of ONE stack. */
export const STACK_PAYOUTS = {
  burst: { key: 'burst', label: 'damage', per: 0.34, target: 'enemy',
    clause: (n) => `${Math.round(n * 100)}% weapon damage` },
  heal: { key: 'heal', label: 'healing', per: 0.05, target: 'self',
    clause: (n) => `${Math.round(n * 100)}% of your maximum health` },
  power: { key: 'power', label: 'damage for a short time', per: 0.06, target: 'self',
    clause: (n) => `+${Math.round(n * 100)}% damage` },
  haste: { key: 'haste', label: 'speed for a short time', per: 0.045, target: 'self',
    clause: (n) => `+${Math.round(n * 100)}% movement and attack speed` },
  ward: { key: 'ward', label: 'a shield', per: 0.07, target: 'self',
    clause: (n) => `a shield worth ${Math.round(n * 100)}% of your maximum health` },
};
export const STACK_PAYOUT_KEYS = Object.keys(STACK_PAYOUTS);

/**
 * The three shapes. `cap` and `decay` differ per shape because the shapes are
 * not interchangeable: a MARK sits on an enemy that is about to die, so it
 * fills fast and holds briefly; a LEDGER builds from being hurt, which is
 * slower and worth remembering longer.
 */
export const STACK_SHAPES = {
  boon: {
    key: 'boon', on: 'self', cap: 10, decaySeconds: 6,
    builds: ['hit', 'crit', 'cast', 'kill'],
    pays: ['power', 'haste', 'ward', 'heal'],
    // Spent deliberately: the next ability you use consumes the whole stack.
    spend: 'nextCast',
  },
  mark: {
    key: 'mark', on: 'enemy', cap: 12, decaySeconds: 4,
    builds: ['hit', 'crit'],
    pays: ['burst'],
    // Spent by a hit that is not the one building it -- see the runtime: the
    // detonating blow is a critical, so a mark pays out on the swing a player
    // was already hoping for.
    spend: 'crit',
  },
  ledger: {
    key: 'ledger', on: 'self', cap: 8, decaySeconds: 10,
    builds: ['taken', 'dodge'],
    pays: ['burst', 'heal', 'ward'],
    // Pays out on its own once full: karma is not something you choose to
    // collect.
    spend: 'full',
  },
};
export const STACK_SHAPE_KEYS = Object.keys(STACK_SHAPES);

/**
 * THE THREE AUTHORED ONES.
 *
 * Named and worded from the books rather than generated, because these are the
 * ones the user asked for by name and a generated approximation of Sophie's
 * Blessing of Anticipation is not Sophie's Blessing of Anticipation. They are
 * signatures: the generator can produce them for the right essence, and
 * produces its own for everything else.
 *
 * `essences` is which essence has to be in the build for the signature to be
 * reachable. Each is the essence the book character's power actually runs on.
 */
export const STACK_SIGNATURES = {
  anticipation: {
    key: 'anticipation',
    name: 'Blessing of Anticipation',
    shape: 'boon', build: 'cast', pay: 'haste',
    icon: 'stackAnticipation',
    essences: ['essOmen', 'essEcho', 'essKnowledge', 'essAdept', 'essMagic'],
    // The description states the mechanic; the name carries the flavour --
    // the project's naming rule, and these three are where it matters most,
    // because a reader who knows the books will bring their own expectations
    // and the card has to say what the game actually does.
    flavour: 'Preparation, banked.',
  },
  sin: {
    key: 'sin',
    name: 'Mark of Sin',
    shape: 'mark', build: 'hit', pay: 'burst',
    icon: 'stackSin',
    essences: ['essSin', 'essDark', 'essMalign', 'essDiscord', 'essBlood'],
    flavour: 'Every blow is written down.',
  },
  karma: {
    key: 'karma',
    name: 'Agent of Karma',
    shape: 'ledger', build: 'taken', pay: 'burst',
    icon: 'stackKarma',
    essences: ['essBalance', 'essHarmonic', 'essSerene', 'essResolute', 'essZeal'],
    flavour: 'The ledger settles itself.',
  },
};
export const STACK_SIGNATURE_KEYS = Object.keys(STACK_SIGNATURES);

/** Every essence that can produce a named signature, id -> signature key. */
export const STACK_SIGNATURE_BY_ESSENCE = (() => {
  const out = {};
  for (const [key, sig] of Object.entries(STACK_SIGNATURES)) {
    for (const e of sig.essences) out[e] = key;
  }
  return out;
})();

/** Total magnitude of `n` stacks of a payout, at `scale`. */
export function stackMagnitude(payoutKey, stacks, scale = 1) {
  const pay = STACK_PAYOUTS[payoutKey];
  if (!pay) return 0;
  return Math.round(pay.per * Math.max(0, stacks) * scale * 1000) / 1000;
}

/**
 * The sentence a card shows. Built from the parts rather than written per
 * effect, so a generated stacking ability reads the same way an authored one
 * does -- which is the point of generating them at all.
 */
export function stackClause(spec) {
  const shape = STACK_SHAPES[spec.stackShape];
  const trig = STACK_TRIGGERS[spec.stackBuild];
  const pay = STACK_PAYOUTS[spec.stackPay];
  if (!shape || !trig || !pay) return '';
  const cap = spec.stackCap || shape.cap;
  const where = shape.on === 'enemy' ? 'on that enemy' : 'on you';
  const spendKind = spec.stackSpend || shape.spend;
  const spend = spendKind === 'nextCast' ? 'The next ability you use spends them all'
    : spendKind === 'crit' ? 'Your next critical hit on it spends them all'
      : `When you reach ${cap}, they all spend at once`;
  const sc = spec.stackScale || 1;
  const one = stackMagnitude(spec.stackPay, 1, sc);
  const full = stackMagnitude(spec.stackPay, cap, sc);
  // ROUND 190 (bug 1) -- SAY WHAT THE SPEND DOES, not just its size.
  //   "It just says stacks build and spend themselves. How, do they heal the
  //    player, deal extra damage to monster ...?"
  // Each payout names who it lands on and what it is, the way the runtime
  // (_stackPayout) actually pays it.
  const r = (n) => Math.round(n * 100);
  const target = shape.on === 'enemy' ? 'that enemy' : 'the nearest enemy (within 8 tiles)';
  const what = {
    burst: `a blow strikes ${target} for ${r(one)}% of your weapon damage per stack (${r(full)}% at full)`,
    heal: `you are healed for ${r(one)}% of your maximum health per stack (${r(full)}% at full)`,
    ward: `you gain a shield that soaks ${r(one)}% of your maximum health per stack (${r(full)}% at full) before your health takes damage`,
    power: `you deal +${r(one)}% damage per stack (+${r(full)}% at full) for 6s`,
    haste: `you move and attack +${r(one)}% faster per stack (+${r(full)}% at full) for 6s`,
  }[spec.stackPay] || `${pay.clause(one)} per stack`;
  return `Every time you ${trig.label}, a stack builds ${where}, up to ${cap}. `
    + `${spend}: ${what}. Unfed, a stack fades every ${shape.decaySeconds}s.`;
}

/**
 * Icons. The 25 symbols from the round-74 drop, keyed by what they DEPICT (see
 * extract_round75_symbols.py, and the mistake recorded in its header) -- so a
 * stacking effect asks for the picture that fits it rather than for a frame
 * number, and re-ordering the sheet cannot silently repoint an ability at a
 * different symbol.
 *
 * By element first, because a frost build's stacks should look like frost and
 * that is the association a player forms without being told. The shape's own
 * symbol is the fallback for an element with no icon of its own, and the three
 * authored signatures ignore both and name their icon directly.
 */
export const STACK_ICON_BY_ELEMENT = {
  fire: 'stackEmber',
  frost: 'stackFrost',
  ice: 'stackFrost',
  cold: 'stackFrost',
  lightning: 'stackStorm',
  storm: 'stackStorm',
  nature: 'stackVerdant',
  poison: 'stackVenom',
  venom: 'stackVenom',
  water: 'stackTide',
  earth: 'stackForge',
  light: 'stackLight',
  holy: 'stackLight',
  dark: 'stackWraith',
  shadow: 'stackWraith',
  void: 'stackDoom',
  blood: 'stackRend',
  arcane: 'stackShatter',
  magic: 'stackShatter',
};

/** The shape's own symbol, when the element has none. */
export const STACK_ICON_BY_SHAPE = {
  boon: 'stackFortune',
  mark: 'stackEye',
  ledger: 'stackWard',
};

export function stackIconFor(element, shapeKey) {
  return STACK_ICON_BY_ELEMENT[String(element || '').toLowerCase()]
    || STACK_ICON_BY_SHAPE[shapeKey]
    || 'stackFortune';
}

/** Every icon this system can ask for -- asserted against the sheet. */
export const STACK_ICON_KEYS = [
  ...new Set([
    ...Object.values(STACK_ICON_BY_ELEMENT),
    ...Object.values(STACK_ICON_BY_SHAPE),
    ...Object.values(STACK_SIGNATURES).map((s) => s.icon),
  ]),
];
