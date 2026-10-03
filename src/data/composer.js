// ============================================================================
// ROUND 108 -- THE COMPOSER.
//
// The user's formula, from the round-105 commission:
//
//   ability = type (special attack | spell)
//           x effect count
//           x effects
//           x modifiers
//           x damage types
//
// and the point of it, in their words: "the provided actions all need to be
// viable, and the ability generation should take a look at all the interesting
// different ways these can be mixed."
//
// WHAT THIS REPLACES AND WHY THE COUNT FALLS SO FAR. There are 94 ability
// categories today and 56 templates. Most of a category is not a mechanic, it
// is an ATOM WELDED TO A DELIVERY AND AN ELEMENT: `ranged_dot`, `aoe_dot_ring`
// and `barrier_burn` are all `dot` with three different deliveries, and the
// only reason they are three rows is that nothing could say "dot, delivered as
// a ring". Eighteen atoms x six deliveries x twenty-eight damage types is a
// larger space than 94 rows, expressed in less.
//
// AND WHY IT IS NOT A FREE-FOR-ALL. Nothing here rolls uniformly. Every choice
// is GATED by the essence's levers -- which atoms it may use, which modifiers
// it may attach, how far it reaches -- so a composed ability is still a
// statement about the build that produced it. The lever system survives; this
// is what it was for. A composer that could give any essence any ability would
// undo round 51 and every round since.
//
// THIS FILE IS DATA AND ARITHMETIC ONLY. It emits a SPEC; it does not know how
// to draw or execute one. The runtime half is `_castComposed` in WorldScene,
// which walks `spec.effects` in order.
// ============================================================================
import { LEVERS } from './essenceLevers.js';
import { DAMAGE_TYPES } from './stats.js';

// ---------------------------------------------------------------------------
// THE EIGHTEEN ATOMS
//
// `needs` is what an atom requires from the ability around it: an `explode`
// needs somewhere to explode, so it cannot be the only effect. `pairs` is what
// it reads well beside, used to bias the second and third pick rather than to
// forbid anything -- a composer that only produced canonical combinations
// would be a longer list of categories.
// ---------------------------------------------------------------------------
export const ATOMS = {
  // --- harm ----------------------------------------------------------------
  impact:    { group: 'harm', hostile: true, cost: 1.0, pairs: ['dot', 'debuff', 'explode', 'drain'] },
  // `contagionable` stood here until the pairs check was written. It was never
  // an atom -- it was trying to say "contagion attaches to this", which
  // MODIFIERS.contagion.appliesTo already says, and which `pairs` (a bias over
  // the SECOND effect) has no way to mean.
  dot:       { group: 'harm', hostile: true, cost: 0.8, pairs: ['impact', 'debuff', 'drain'] },
  explode:   { group: 'harm', hostile: true, cost: 0.9, needs: 'delivery', pairs: ['impact', 'debuff'] },
  debuff:    { group: 'harm', hostile: true, cost: 0.7, pairs: ['impact', 'dot', 'explode'] },
  drain:     { group: 'harm', hostile: true, cost: 0.9, pairs: ['impact', 'dot'] },
  // --- restore -------------------------------------------------------------
  heal:      { group: 'restore', cost: 1.0, pairs: ['hot', 'cleanse', 'buff'] },
  hot:       { group: 'restore', cost: 0.8, pairs: ['heal', 'buff'] },
  innervate: { group: 'restore', cost: 0.8, pairs: ['iot', 'buff'] },
  iot:       { group: 'restore', cost: 0.7, pairs: ['innervate'] },
  recover:   { group: 'restore', cost: 0.8, pairs: ['rot', 'buff'] },
  rot:       { group: 'restore', cost: 0.7, pairs: ['recover'] },
  shield:    { group: 'restore', cost: 1.0, pairs: ['buff', 'cleanse', 'heal'] },
  cleanse:   { group: 'restore', cost: 0.7, pairs: ['heal', 'shield'] },
  dispel:    { group: 'restore', cost: 0.8, pairs: ['heal', 'shield'] },
  buff:      { group: 'restore', cost: 0.7, pairs: ['heal', 'shield', 'hot'] },
  // --- call ----------------------------------------------------------------
  summon_minion:  { group: 'call', cost: 1.4, pairs: ['buff'] },
  summon_terrain: { group: 'call', cost: 1.1, pairs: ['dot', 'debuff'] },
  summon_trap:    { group: 'call', cost: 1.1, pairs: ['debuff', 'dot'] },
  // --- self ----------------------------------------------------------------
  //
  // ROUND 109. These four are not a widening of the model, they are a hole in
  // it that the authored abilities found. The composer has to be able to
  // recreate what the signature banks already promise, and 2,745 authored rows
  // resolve to 43 categories, four of whose shapes no effect atom could say:
  //
  //   move     296 references -- movement_dash, movement_teleport,
  //            movement_haste_active. Also a KIT_CATEGORY_FLOOR, so a composer
  //            without it could not build a legal kit at all.
  //   control   63 -- self_active_timefreeze. Distinct from `debuff`: a debuff
  //            rides a hit, this IS the ability.
  //   taunt      3 -- taunt_pull.
  //   stealth    2 -- stealth_veil.
  //
  // `selfish: true` marks the ones that act on the caster rather than on a
  // target, which is what stops the delivery pool trying to throw them.
  move:    { group: 'self', selfish: true, cost: 0.9, pairs: ['buff', 'impact'] },
  control: { group: 'harm', hostile: true, cost: 1.2, pairs: ['impact', 'debuff'] },
  taunt:   { group: 'self', cost: 0.8, hostile: true, pairs: ['shield', 'buff'] },
  stealth: { group: 'self', selfish: true, cost: 1.0, pairs: ['buff', 'impact'] },
  // Three more the WIDER table found. These carry no authored signatures, so
  // the coverage check above stayed green without them -- and they are real
  // mechanics the game runs, three of them round 105's own gap-closing work.
  // Deleting the category table without these would quietly undo a finished
  // round, which is a worse outcome than the one the check was written to
  // prevent.
  //   imbue    imbueStrike -- and WEAPON-ALIGNED, so weapon builds need it
  //   travel   townPortal
  //   refresh  cooldownReset
  imbue:   { group: 'self', selfish: true, cost: 1.0, weaponed: true, pairs: ['impact', 'buff'] },
  travel:  { group: 'self', selfish: true, cost: 0.6, pairs: [] },
  // ROUND 112 -- `leadRare`. A refresh that LEADS becomes the cooldownReset
  // template, and that template's price is 90-150 seconds, written down in
  // round 105 with its reason: "an ability that hands another ability back has
  // to be rarer than the ability it hands back." The authored row is
  // `rareOnly` and honours that; the composer had no such gate, so refresh led
  // ordinary sockets and produced a 112-second buff in all three of the
  // review kits -- an ability priced as build-defining, handed out as filler,
  // and unusable at that cooldown. As a RIDER it is unchanged: two seconds off
  // everything you are waiting on, which is the small version and fine
  // anywhere.
  refresh: { group: 'self', selfish: true, cost: 1.3, leadRare: true, pairs: ['buff'] },
  // ROUND 111 -- THE ONE THE COVERAGE AUDIT HAS CALLED PARTIAL SINCE ROUND 104.
  //
  // The taxonomy line is "drain (reduce enemy stat while increasing a self
  // stat)", and the audit's note was exact about why `drain` did not answer it:
  // "leech returns HEALTH from damage dealt. Nothing takes a STAT off the
  // target and puts the same stat on the caster -- the two halves exist
  // separately (weakenRing lowers, selfPower raises) and no ability does both
  // as one transfer."
  //
  // `sap` is that transfer, and it is a separate atom from `drain` precisely
  // because they are different mechanics: drain converts damage into health,
  // sap moves an attribute from them to you for a while. One duration, one
  // ability, both ends.
  sap:     { group: 'harm', hostile: true, cost: 1.1, pairs: ['impact', 'debuff', 'dot'] },
};
export const ATOM_KEYS = Object.keys(ATOMS);

// ---------------------------------------------------------------------------
// DOES THE GAME ACTUALLY KNOW HOW TO DO THIS?
//
// The single most expensive lesson of round 105, and it cost three separate
// findings: a mechanic the game can DESCRIBE and never PRODUCE is worse than a
// missing one, because everything downstream certifies it. The composer makes
// that failure cheap to commit -- it emits atoms by name, and a name is not a
// behaviour.
//
// So every atom names the runtime path that performs it, verified against
// WorldScene's cast chain rather than assumed from the name. An atom with a
// `null` runtime is one the game cannot execute, and `atomsFor` refuses to
// offer it. It stays in the table -- deleting it would lose the record that it
// was considered and why it is not available -- but nothing can compose it.
//
// `needsProjectile` is the second half of the same honesty: three atoms only
// have a runtime when the ability is delivered as a projectile, because that
// is the only branch that reads their fields. `explode` already declares
// `needs: 'delivery'`; drain does not, and did not know it needed to.
export const ATOM_RUNTIME = {
  impact:         { call: '_damageMonster' },
  dot:            { call: '_applyDot' },
  explode:        { call: '_damageMonster (splash at projectile impact)', needsProjectile: true },
  debuff:         { call: '_applyAbilityDebuff' },
  drain:          { call: '_healPlayer / _applyHot from projectile leech', needsProjectile: true },
  heal:           { call: '_healFriendly via _healTargets' },
  hot:            { call: '_applyHot' },
  innervate:      { call: 'resourceRestore (mana, instant)' },
  iot:            { call: 'player.buffs.manaRegen' },
  recover:        { call: 'resourceRestore (stamina, instant)' },
  rot:            { call: 'player.buffs.staminaRegen' },
  shield:         { call: 'player.shield' },
  cleanse:        { call: '_cleanseConditions' },
  buff:           { call: '_grantStatBuff' },
  summon_minion:  { call: '_spawnSummon' },
  summon_terrain: { call: '_barriers / _bloomFields' },
  summon_trap:    { call: '_spawnSummon (summonKind trap)' },

  move:           { call: 'dash / teleport / movementHaste templates' },
  control:        { call: 'timeFreeze template' },
  taunt:          { call: '_applyTaunt' },
  stealth:        { call: '_applyStealth' },
  imbue:          { call: 'imbueStrike template' },
  travel:         { call: 'townPortal template' },
  refresh:        { call: 'cooldownReset template' },
  sap:            { call: '_applyStatDrain' },

  // ---- the one that had none, until round 109 -----------------------------
  //
  // DISPEL: strip a buff from an enemy. Round 108 recorded this as unbuildable
  // and said why: monsters carried `debuffs: {}` and no buff container at all,
  // so there was no state a dispel could remove and no code that had ever
  // tried. The word appeared twice in WorldScene, both times in a comment.
  //
  // Round 109 built the other half. Monsters now have `buffs`, two legible
  // sources put things in it (a hurt monster enrages; a warder family wards a
  // NEIGHBOUR, so the buff worth stripping is not on the caster), and each buff
  // changes something the player can see -- because a dispel that strips a
  // hidden number is indistinguishable from a dispel that does nothing, which
  // is the failure this atom was recorded for in the first place.
  dispel:         { call: '_dispelFrom' },
};

/** Atoms the game can actually perform. The gate, applied at the one place
 *  that decides what an essence may compose from. */
export function atomHasRuntime(a) {
  const r = ATOM_RUNTIME[a];
  return !!(r && r.call);
}

/** The recorded gaps, for the suites and for whoever picks this up. */
export function atomsWithoutRuntime() {
  return ATOM_KEYS.filter(a => !atomHasRuntime(a));
}

// ---------------------------------------------------------------------------
// WHICH LEVER SUPPLIES WHICH ATOM
//
// The gate. An essence may only compose from atoms its levers supply, which is
// what keeps a composed ability a statement about the build.
//
// Read against LEVER_PLAN's `gates` where those exist, and widened only where
// leaving a lever with one atom would make it unable to produce an ability at
// all. Twenty-one levers; every one supplies at least three.
// ---------------------------------------------------------------------------
export const LEVER_ATOMS = {
  anchor:  ['debuff', 'summon_terrain', 'explode', 'impact', 'summon_trap', 'control'],
  muzzle:  ['debuff', 'dot', 'drain', 'impact', 'control'],
  // `taunt` sat here too until test_round49_taunt caught it. Thematically a
  // defender drawing fire is reasonable; mechanically it broke round 49's
  // actual design, which is that a taunt is the `taunt` lever's SENTENCE. The
  // suite measured the leak precisely -- three essences producing taunts with
  // no taunt lever anywhere near them. A lever means something only while it
  // is the thing that supplies its own mechanic.
  // `heal` sat here and in `fate`, and it is why 13 pools in 48 offered an
  // instant heal with no over-time version available to pair with it -- the
  // essence could heal and had no mending lever to mend WITH. Round 52's
  // guarantee ("a pool that offers an instant heal offers an over-time heal
  // too") was unreachable for those, and the honest fix is upstream: bulwark
  // TURNS HARM ASIDE BEFORE IT LANDS, which is a shield, not a mending. The
  // four mending levers are mend, allies, absolve and renew, and heals should
  // come from those.
  bulwark: ['shield', 'buff', 'summon_terrain'],
  absolve: ['cleanse', 'dispel', 'buff', 'heal', 'hot'],
  // `hot`, `iot` and `rot` sat here and should never have. Round 48 split
  // `linger` in two precisely because it "was one word for two opposite
  // polarities and a healer could only ever reach the harmful one" -- linger is
  // the AFFLICTION polarity and `renew` is the mending one. Handing linger the
  // over-time restores put both polarities back on one lever, and
  // test_round52_hot caught it as 75 heal-over-times on an essence that is
  // supposed to rot and never mend.
  linger:  ['dot', 'debuff', 'summon_terrain'],
  swift:   ['impact', 'buff', 'recover', 'debuff', 'move', 'refresh'],
  reach:   ['impact', 'explode', 'debuff', 'summon_terrain', 'travel'],
  stalk:   ['impact', 'debuff', 'drain', 'buff', 'stealth', 'sap'],
  shift:   ['impact', 'buff', 'debuff', 'shield', 'move', 'travel'],
  raw:     ['impact', 'explode', 'debuff', 'buff', 'imbue'],
  siphon:  ['drain', 'dot', 'innervate', 'recover', 'impact', 'sap'],
  call:    ['summon_minion', 'summon_terrain', 'summon_trap', 'buff'],
  chain:   ['impact', 'explode', 'debuff', 'dot', 'imbue'],
  burst:   ['impact', 'explode', 'innervate', 'buff', 'move', 'refresh'],
  allies:  ['buff', 'heal', 'hot', 'shield', 'recover', 'rot'],
  mend:    ['heal', 'hot', 'cleanse', 'dispel', 'shield'],
  renew:   ['hot', 'iot', 'rot', 'heal', 'innervate', 'recover', 'buff'],
  turn:    ['debuff', 'drain', 'impact', 'dispel', 'control', 'sap'],
  fate:    ['buff', 'impact', 'debuff', 'refresh'],
  taunt:   ['debuff', 'shield', 'buff', 'impact', 'taunt'],
  stealth: ['impact', 'buff', 'debuff', 'drain', 'stealth', 'move'],
};

// ===========================================================================
// THE PASSIVE VOCABULARY (round 109)
// ===========================================================================
//
// A passive is never cast. It takes effect by being in the kit, and the
// runtime reads it in `_recomputeDerivedStats` -- so the active model (atoms
// combined into an ordered effect list) does not describe passives at all.
// They needed their own vocabulary, and this is it.
//
// WHAT DECIDED THE SHAPE. Not invention: the twenty passive templates the game
// already runs were classified by HOW each one reaches the player, and the
// classes fell out as sixteen. Every atom below names the template it emits
// onto, which is the point -- the passive runtime is not being replaced, only
// the 35-row table that used to choose from it. A passive atom that emitted
// onto no template would be a description of a passive rather than a passive.
//
// `slots` is how many distinct parameterisations the atom can produce, and it
// is what makes this a vocabulary rather than a renamed list: `stat` covers
// four categories, `conjure` three, `sense` six, because in each case the old
// rows differed only by a field value.
export const PASSIVE_ATOMS = {
  // ---- always-on modifiers ------------------------------------------------
  stat:      { template: 'passiveBuff', slots: ['dmg', 'crit', 'maxHp', 'armor'],
               what: 'a number that is always true' },
  pace:      { template: 'passiveMove', what: 'you move faster' },
  recharge:  { template: 'cooldownPassive', what: 'everything comes back sooner' },
  pierce:    { template: 'elementPierce', what: 'one element ignores resistance' },
  reflect:   { template: 'reflectWard', slots: ['damage', 'spell', 'debuff'],
               what: 'what is aimed at you goes back' },
  // ---- conditional --------------------------------------------------------
  conditional: { template: 'passiveConditional',
                 slots: ['night', 'day', 'vsElement', 'vsDebuffed', 'targetLowHp', 'onRoads'],
                 what: 'a number that is true in one situation' },
  // ---- radius -------------------------------------------------------------
  aura:      { template: 'aura', slots: ['damage', 'regen', 'slow', 'weaken', 'ward'],
               what: 'everything near you is affected', capped: 'aura' },
  // ---- event --------------------------------------------------------------
  trigger:   { template: 'triggeredPassive', what: 'something happens when something happens' },
  // ---- state machine ------------------------------------------------------
  stacks:    { template: 'stacking', what: 'it builds, then it spends', rareOnly: true },
  // ---- capabilities -------------------------------------------------------
  //
  // Not modifiers: things you can now DO. They read as permission checks at
  // the point of use rather than as numbers in a formula, which is why they
  // are one atom and not three stat rows.
  // ROUND 164 (item 1.1) -- `virulence` joins them, and belongs here rather
  // than among the modifiers: "your poisons work on things that do not
  // breathe" is a permission check at the point of use, not a number in a
  // formula. It is read in `_applyDebuff` as exactly that -- can this build
  // afflict a creature whose subtype says no.
  capability: { template: null,
                slots: ['waterWalk', 'twoHandWield', 'unarmedFocus', 'virulence'],
                what: 'something you could not do before',
                // Each slot emits onto its own template -- the one place where
                // an atom is not one template, because "a capability" is the
                // honest class and the four runtimes are genuinely unrelated.
                templateBySlot: { waterWalk: 'waterWalk', twoHandWield: 'twoHandWield',
                                  unarmedFocus: 'unarmedFocus', virulence: 'virulence' } },
  sense:     { template: 'perception',
               slots: ['mapsense', 'nightsight', 'healthbars', 'weakspots', 'truesight', 'bondsense'],
               what: 'you perceive what others cannot', capped: 'perception' },
  // ---- conjured gear ------------------------------------------------------
  conjure:   { template: null, slots: ['weapon', 'armor', 'gear'],
               what: 'you carry what you made',
               templateBySlot: { weapon: 'summonWeapon', armor: 'summonArmor', gear: 'summonGear' } },
  // ---- companions ---------------------------------------------------------
  bond:      { template: 'summonBonded', what: 'something fights beside you' },
  // ---- the two that resisted ----------------------------------------------
  //
  // Kept as their own atoms rather than folded into `stat`, because both have
  // merge semantics nothing else has: fate is union-of-kinds and min-of-
  // cooldowns, attune is a nested per-weapon record with six summed fields and
  // two maxed ones. Folding either into a neighbour would be a table claiming
  // a behaviour the runtime does not have.
  fate:      { template: 'fateReroll', what: 'the dice get asked twice' },
  // ROUND 112 -- `might` is a fourth attunement slot, and it emits onto its own
  // template for the same reason `capability` does: reach and speed are the
  // weaponAffinity runtime, and the strong arm the user asked for (+1 power,
  // harder special attacks, cheaper swings) is three fields that runtime has
  // never had. Same atom because it is the same sentence -- one weapon answers
  // you better -- and the same lever gate, so an essence that could not attune
  // to a weapon still cannot.
  attune:    { template: 'weaponAffinity', slots: ['reach', 'speed', 'both', 'might'],
               templateBySlot: { reach: 'weaponAffinity', speed: 'weaponAffinity',
                                 both: 'weaponAffinity', might: 'weaponMight' },
               what: 'one weapon answers you better' },
  attribute: { template: 'attrBoost', slots: ['power', 'spirit', 'speed', 'recovery'],
               what: 'the attribute itself grows' },
};
export const PASSIVE_ATOM_KEYS = Object.keys(PASSIVE_ATOMS);

/**
 * WHICH LEVER SUPPLIES WHICH PASSIVE.
 *
 * The same gate as the actives, for the same reason: a passive an essence has
 * no business owning is how every build ends up the same build. Read against
 * each lever's sentence -- `renew` regenerates, so it gets regen auras and
 * recovery; `stalk` watches, so it gets perception and conditionals.
 */
export const LEVER_PASSIVES = {
  anchor:  ['aura', 'stat', 'conditional', 'trigger'],
  muzzle:  ['aura', 'conditional', 'trigger', 'stat'],
  bulwark: ['stat', 'reflect', 'conjure', 'aura', 'capability'],
  absolve: ['aura', 'trigger', 'stat', 'sense'],
  linger:  ['aura', 'trigger', 'stat', 'conditional'],
  swift:   ['pace', 'stat', 'recharge', 'attune'],
  reach:   ['attune', 'stat', 'pierce', 'sense'],
  stalk:   ['sense', 'conditional', 'stat', 'attune', 'stacks'],
  shift:   ['pace', 'capability', 'stat', 'trigger'],
  raw:     ['stat', 'attune', 'conjure', 'attribute', 'stacks'],
  siphon:  ['trigger', 'stat', 'aura', 'conditional'],
  call:    ['bond', 'aura', 'stat', 'trigger'],
  chain:   ['stat', 'trigger', 'pierce', 'attune', 'stacks'],
  burst:   ['stat', 'recharge', 'trigger', 'pierce', 'stacks'],
  allies:  ['aura', 'bond', 'stat', 'trigger'],
  mend:    ['aura', 'trigger', 'stat', 'sense'],
  renew:   ['aura', 'stat', 'recharge', 'trigger'],
  turn:    ['reflect', 'fate', 'stat', 'trigger'],
  fate:    ['fate', 'stat', 'trigger', 'conditional'],
  taunt:   ['stat', 'aura', 'reflect', 'conjure'],
  stealth: ['sense', 'conditional', 'pace', 'stat'],
};

/** Passive atoms these levers supply. Union, same as the actives. */
export function passivesFor(levers) {
  const out = new Set();
  for (const l of levers) for (const p of (LEVER_PASSIVES[l] || [])) out.add(p);
  return [...out];
}

/** Which template a passive atom (and slot) emits onto -- the runtime it
 *  reuses. `null` would mean a passive the game cannot perform, which
 *  `composerFaults` refuses. */
export function passiveTemplateFor(atom, slot = null) {
  const p = PASSIVE_ATOMS[atom];
  if (!p) return null;
  if (p.templateBySlot) return p.templateBySlot[slot] || p.templateBySlot[p.slots[0]];
  return p.template;
}

// ---------------------------------------------------------------------------
// MODIFIERS, and the levers that supply them. Never rolled freely: a modifier
// on a card is always a statement about the essence (LEVER_SPEC section 4).
// ---------------------------------------------------------------------------
export const MODIFIERS = {
  chain:     { from: ['chain'], appliesTo: ['impact', 'explode'], band: [1, 3] },
  split:     { from: ['swift', 'chain'], appliesTo: ['impact'], band: [2, 3] },
  pierce:    { from: ['reach', 'raw'], appliesTo: ['impact'], band: [1, 3] },
  // The one that attaches to a CONDITION rather than to a hit -- see round
  // 107's note: chain is one hit travelling, contagion is a condition
  // propagating on its own after the hit is over.
  contagion: { from: ['linger', 'turn'], appliesTo: ['dot', 'debuff'], band: [2, 3] },
};
export const MODIFIER_KEYS = Object.keys(MODIFIERS);

/** `stalk` refuses `split` -- the one negative rule in the system, and it is a
 *  design statement: a stalking essence is about the single chosen target.
 *  One is a statement; ten would be a system fighting itself. */
export const MODIFIER_REFUSALS = { stalk: ['split'] };

// ---------------------------------------------------------------------------
// DELIVERY
//
// A lever concern -- how far your arm reaches -- never a stone concern.
// ---------------------------------------------------------------------------
export const DELIVERIES = ['melee', 'short', 'medium', 'long', 'distant',
  'aoe_self', 'aoe_target'];
export const LEVER_DELIVERY = {
  reach:   ['long', 'distant', 'medium'],
  raw:     ['melee', 'short'],
  swift:   ['melee', 'short', 'medium'],
  stalk:   ['medium', 'long', 'distant'],
  burst:   ['aoe_self', 'aoe_target', 'short'],
  chain:   ['medium', 'aoe_target'],
  anchor:  ['aoe_target', 'medium', 'short'],
  muzzle:  ['medium', 'short'],
  allies:  ['aoe_self'],
  mend:    ['aoe_self', 'short'],
  renew:   ['aoe_self', 'short'],
  bulwark: ['aoe_self', 'melee'],
  absolve: ['aoe_self', 'short'],
  linger:  ['aoe_target', 'medium'],
  siphon:  ['medium', 'melee'],
  shift:   ['short', 'medium'],
  call:    ['short', 'medium'],
  turn:    ['medium', 'aoe_target'],
  fate:    ['aoe_self', 'medium'],
  taunt:   ['aoe_self', 'medium'],
  stealth: ['melee', 'short'],
};

// ---------------------------------------------------------------------------
// EFFECT COUNT BY RANK
//
// Round 105's corrected model, and the numbers are the user's own: "not every
// ability will end up with 5 effects at gold rank, but nearly every ability
// will have at least 2 effects by gold rank."
//
// Magnitude is NOT traded against count -- every rank raises what the ability
// already does. What varies is the slope. See LEVER_SPEC section 6.
// ---------------------------------------------------------------------------
export const COUNT_BY_RANK = {
  iron:   { typical: 1, floor: 1, ceiling: 3, rareAbove: 2 },
  bronze: { typical: 2, floor: 1, ceiling: 3 },
  silver: { typical: 3, floor: 2, ceiling: 4 },
  gold:   { typical: 3, floor: 2, ceiling: 9, rareAbove: 5 },
};

/**
 * ROUND 112 -- THE TOP OF A BAND IS RARE, AND THE TOP OF GOLD IS AN AFFLICTION
 * BUILD.
 *
 * The user, reading three generated kits: "As these are iron rank abilities I
 * think I'm seeing too many effects and some are well overtuned." Asked how
 * hard to cut: "iron can still have 3 abilities rarely and cap at gold can be
 * raised to 9 for very rare abilities. Specific to affliction builds, many
 * small effects."
 *
 * So a band now has a CEILING and a point above which it is rare, and the two
 * are different numbers. Iron reaches 3 and mostly sits at 1; gold reaches 9
 * and mostly sits at 3. Without the second number a raised ceiling is just a
 * raised typical -- the round-109 spread makes every value in a band
 * reachable, which was the right fix then and is exactly wrong for a ceiling
 * that is supposed to be unusual.
 *
 * ONE IN SIX for the rare tail, and above the rare line the gold band is only
 * open to a composition that is ABOUT afflictions -- the user's own condition.
 * An ability with nine unrelated effects is noise; nine small stacking bleeds
 * is a build.
 */
export const RARE_COUNT_ODDS = 6;

/** Is this composition an affliction build -- the only thing allowed to reach
 *  the top of the gold band? Judged on the effects it has already taken, so a
 *  bolt cannot claim it by having one debuff bolted on. */
export function isAfflictionShape(effects) {
  const afflicting = effects.filter(a => a === 'dot' || a === 'debuff' || a === 'sap' || a === 'control');
  return afflicting.length >= 2;
}
export const RANK_ORDER = ['iron', 'bronze', 'silver', 'gold'];

/** Atoms an essence with these levers may compose from. Union, not
 *  intersection: a trio's levers are what it CAN do, and requiring every lever
 *  to supply an atom would leave most essences with none. */
export function atomsFor(levers) {
  const out = new Set();
  for (const l of levers) for (const a of (LEVER_ATOMS[l] || [])) {
    // The runtime gate, here rather than at the call sites. One place decides
    // what an essence may compose from, so an atom without a runtime cannot
    // reach an ability by any route -- including a route added later by
    // somebody who did not know the gate existed.
    if (atomHasRuntime(a)) out.add(a);
  }
  return [...out];
}

/** Modifiers these levers supply, minus anything a lever present refuses. */
export function modifiersFor(levers) {
  const out = new Set();
  for (const [k, m] of Object.entries(MODIFIERS)) {
    if (m.from.some(l => levers.includes(l))) out.add(k);
  }
  for (const l of levers) for (const r of (MODIFIER_REFUSALS[l] || [])) out.delete(r);
  return [...out];
}

/** Deliveries these levers reach. Falls back to `medium` rather than to
 *  nothing: an essence whose levers name no delivery still has to be able to
 *  put an ability somewhere. */
export function deliveriesFor(levers) {
  const out = new Set();
  for (const l of levers) for (const d of (LEVER_DELIVERY[l] || [])) out.add(d);
  return out.size ? [...out] : ['medium'];
}

/**
 * COMPOSE ONE ABILITY.
 *
 * `roll(salt, n)` is the caller's seeded integer roll -- the same contract
 * `generateCategoryAbility` uses, so a composed ability is as reproducible as
 * a categorised one and a save regenerates identically.
 *
 * Returns a plain description of the ability: type, delivery, the ordered
 * effects, the modifiers, the damage type. Turning that into a runnable spec
 * (costs, cooldowns, magnitudes, names) is `buildComposedSpec` in awakening.js,
 * which owns those scales already.
 */
export function composeAbility({ levers, rank = 'iron', damageType = 'physical',
  weaponed = false, weaponRanged = false, weaponIsEssence = false,
  rare = false, roll, forceLead = null }) {
  const avail = atomsFor(levers);
  if (!avail.length) return null;
  // ROUND 109 -- `forceLead` is how a RESERVED SEAT asks the composer for a
  // guarantee. The kit builder promises every kit a damage ability, a summon,
  // a support ability and so on; those promises used to be kept by reaching
  // into the category table for a row that did the job, which is the menu the
  // composer replaces.
  //
  // It is a REQUEST, not an override: if the essence's levers do not supply
  // the atom, this returns null and the seat goes unfilled rather than handing
  // a summoning to an essence with no business summoning. A guarantee that
  // could break the lever gate would undo round 51 through the back door.
  if (forceLead && !avail.includes(forceLead)) return null;

  // --- how many effects ----------------------------------------------------
  const band = COUNT_BY_RANK[rank] || COUNT_BY_RANK.iron;
  // Centred on `typical`, held inside the band, and EVERY value in the band
  // reachable.
  //
  // This was `[floor, typical, typical, ceiling]`, four hand-written slots,
  // which is fine for a band of three values and wrong for a band of four:
  // gold is 2-5 and that spread produced 2, 3 and 5 and never once a 4. A hole
  // in the middle of a distribution does not fail any assertion about the
  // band's edges, which is why the probe now asks for every value.
  // ROUND 112 -- the band has two ceilings: the one it usually reaches and the
  // one it rarely does. `rareAbove` is the first, `ceiling` the second, and a
  // roll decides whether this composition is allowed past the first at all.
  // Without the split, raising gold's ceiling to 9 would have made 9 as common
  // as 3 -- the round-109 spread deliberately makes every value in a band
  // reachable, which is right for a band whose top is ordinary and wrong for
  // one whose top is meant to be a story.
  const softCap = band.rareAbove || band.ceiling;
  const rareRoll = roll('countrare', RARE_COUNT_ODDS) === 0;
  const spread = [];
  for (let n = band.floor; n <= softCap; n++) spread.push(n);
  spread.push(band.typical, band.typical);   // the weight that centres it
  let count = spread[roll('count', spread.length)];
  if (rareRoll && band.ceiling > softCap) {
    count = softCap + 1 + roll('countrarehow', band.ceiling - softCap);
  }
  count = Math.max(band.floor, Math.min(band.ceiling, count, avail.length));

  // --- the leading effect --------------------------------------------------
  //
  // Picked first and never `explode`, which `needs: 'delivery'` -- an ability
  // whose ONLY effect is a detonation has nothing to detonate on.
  // `leadRare` atoms are riders on an ordinary socket and leads only on a rare
  // one -- see `refresh`. Filtered here rather than at the call sites so the
  // rule holds for every route into the composer, including forced seats.
  const leadPool = avail.filter(a => !ATOMS[a].needs && (rare || !ATOMS[a].leadRare));
  const lead = forceLead || leadPool[roll('lead', leadPool.length)] || avail[0];
  const effects = [lead];

  // --- the rest, biased toward what the lead reads well beside -------------
  //
  // Biased, not forced. A composer that only produced canonical pairings would
  // be a longer list of categories wearing a new name.
  for (let i = 1; i < count; i++) {
    const taken = new Set(effects);
    const rest = avail.filter(a => !taken.has(a));
    if (!rest.length) break;
    // ROUND 112 -- THE RARE TAIL HAS TO EARN ITSELF AS IT GOES.
    //
    // The user allowed nine effects at gold "specific to affliction builds,
    // many small effects". A count rolled up front cannot know what the
    // composition turned out to be, so the condition is checked HERE, at the
    // moment the count would take the ability past the ordinary ceiling: if
    // what has been assembled so far is not about afflictions, it stops at
    // the soft cap. A bolt with one debuff on it does not become an affliction
    // build by wanting six more effects.
    if (i >= softCap && !isAfflictionShape(effects)) break;
    const liked = rest.filter(a => (ATOMS[effects[i - 1]].pairs || []).includes(a));
    const pool = (liked.length && roll(`bias${i}`, 3) > 0) ? liked : rest;
    effects.push(pool[roll(`eff${i}`, pool.length)]);
  }

  // --- WHICH RANK EACH EFFECT ARRIVES AT -----------------------------------
  //
  // ROUND 112. The composer is asked for GOLD (see COMPOSE_AT_RANK) because an
  // ability is a thing you own and what it will do at gold is part of what it
  // is. That was right and it had a hole underneath it: nothing gated the
  // effects at CAST time, so an iron-rank player pressed a gold-rank ability
  // and every one of its effects fired. The user read the result -- "as these
  // are iron rank abilities I think I'm seeing too many effects".
  //
  // So every effect carries the rank it becomes live at. The LEAD is always
  // iron, because the lead is what the ability IS; the rest arrive one rank at
  // a time, and everything past the third waits for gold. A low roll pulls the
  // first rider forward to iron, which is the "iron can still have 3 abilities
  // rarely" the user asked for -- rarely, and never more than three.
  // 1 effect at iron normally, 2 one time in three, 3 one time in six -- which
  // is the "rarely" in the user's sentence, stated as odds rather than as an
  // adverb so it can be measured (tools/probe_round112_ranks.mjs).
  // Measured at 1-in-6 first, which put three effects on 14.7% of iron
  // abilities -- "sometimes", not the "rarely" the user asked for. 1-in-10.
  const ironLive = roll('ironpull3', 10) === 0 ? 3 : (roll('ironpull2', 3) === 0 ? 2 : 1);
  const effectRanks = effects.map((_, i) => {
    if (i < ironLive) return 'iron';
    const stepUp = i - ironLive;                     // 0 -> bronze, 1 -> silver
    return RANK_ORDER[Math.min(1 + stepUp, RANK_ORDER.length - 1)];
  });

  // --- hostility is decided by the effects, not declared -------------------
  //
  // An ability that damages anything is hostile whatever else it does, which
  // is what decides its delivery pool and its targeting. Asked of the atoms
  // rather than carried as a flag, so it cannot disagree with them.
  const hostile = effects.some(a => ATOMS[a].hostile);

  // --- delivery ------------------------------------------------------------
  //
  // An ability every one of whose effects acts on the CASTER is not thrown
  // anywhere -- a dash that reaches forty tiles is not a dash. So when nothing
  // in the list touches anyone else, the delivery collapses to the self band
  // regardless of how far the levers reach. Asked of the atoms rather than
  // declared, the same way hostility is.
  const allSelfish = effects.every(a => ATOMS[a].selfish);
  const pool = allSelfish ? ['aoe_self'] : deliveriesFor(levers).filter(d =>
    hostile ? true : (d === 'aoe_self' || d === 'short' || d === 'melee' || d === 'medium'));
  // ROUND 112 -- A WEAPON BUILD REACHES FOR THE WEAPON FIRST.
  //
  // The user: "The synergy effect may need strengthened. Essence sets with a
  // weapon essence should become more 'special attack' oriented."
  //
  // A special attack is a MELEE delivery on a weaponed build (see `type`
  // below), and melee was one option among five for a Sword essence -- so a
  // sword build composed a melee ability about one time in five and the rest
  // were spells thrown from a distance. Measured on the user's own kit 1:
  // ZERO special attacks in twenty abilities.
  //
  // Two chances at melee rather than one, when the socket has a weapon and the
  // ability is hostile. Not forced -- a sword essence that could only ever
  // swing would lose the reach and the fire it also has, and the user's
  // complaint is that the kit does not LEAN into the weapon, not that it
  // should be nothing else.
  // Gated on the LEAD being hostile rather than on any effect being hostile:
  // the prerequisite downstream keys on the lead (a restore with an impact
  // riding on it is a restore), so biasing on the wider test just produced
  // melee deliveries that could never become special attacks. Three times in
  // four -- measured at two in three, which left a weapon build at 0.80
  // special attacks per kit against the "lean into it" the user asked for.
  // ROUND 112 -- A BOW'S SPECIAL ATTACK IS A SHOT, NOT A SWING.
  //
  // The first cut read "special attack" as MELEE, full stop, which is what the
  // composer has said since round 109. Measured against the 21 weapon
  // essences, that made the whole idea unreachable for half of them: Bow, Gun,
  // Staff and the rest supply no melee delivery at all, so a bow build could
  // not compose a special attack however hard it was biased, and weapon builds
  // sat at 0.85 special attacks each against the "lean into it" the user
  // asked for. A special attack is an attack made WITH THE WEAPON; which
  // deliveries count depends on what the weapon is.
  const leadHostile = !!ATOMS[effects[0]].hostile;
  const weaponBands = weaponRanged ? ['long', 'distant', 'medium'] : ['melee', 'short'];
  // ===== ROUND 216 (item 2) -- THE WEAPON'S OWN BAND IS ALWAYS AVAILABLE ===
  //
  // The bias below picks the weapon band OUT OF THE POOL, and the pool comes
  // from the levers. Measured: raising the bias from three-in-four to always
  // moved a weapon build from 1.35 special attacks per kit to 1.39, because
  // the bias was never the bottleneck -- a Knife essence's levers (stalk,
  // stealth, swift, linger) frequently offer no melee delivery at all, so
  // there was nothing for the bias to choose.
  //
  // For a WEAPON ESSENCE with a hostile lead the band is added rather than
  // merely filtered for, and the justification is physical: you are holding
  // the knife. An ability that hurts somebody can always be delivered at the
  // range the thing in your hand reaches. It is not added for a stone-derived
  // weapon -- a Fire essence with a Sword stone is still a fire essence, and
  // its abilities should mostly be fire.
  const bandPool = (weaponIsEssence && leadHostile && !allSelfish)
    ? [...new Set([...pool, weaponBands[0]])] : pool;
  const wantBand = bandPool.filter(d => weaponBands.includes(d));
  // ===== ROUND 216 (item 2) -- A WEAPON ESSENCE IS ITS WEAPON =============
  //
  // The user: "Knife essence is a weapon essence. For daggers. Should be a
  // lot more special attacks."
  //
  // The bias was three in four for any weaponed socket, which treats two very
  // different things alike. A Fire essence with a Sword stone in it is a fire
  // spell that happens to be swung, and it should sometimes be a spell. A
  // KNIFE essence's hostile ability is a knife technique; there is nothing
  // else for it to be, and a quarter of them coming out as spells is the
  // essence failing to be about its own weapon.
  //
  // So the roll stands for a stone-derived weapon and is skipped entirely
  // when the weapon is the ESSENCE's own. Nothing is forced that was not
  // already possible: `wantBand.length` still has to be non-empty, and a
  // non-hostile lead is still a spell.
  const meleeFirst = weaponed && leadHostile && wantBand.length
    && (weaponIsEssence || roll('meleebias', 4) > 0);
  const delivery = meleeFirst ? wantBand[roll('wband', wantBand.length)]
    : (pool.length ? pool : ['medium'])[roll('deliv', pool.length || 1)];

  // --- special attack or spell --------------------------------------------
  //
  // The top of the user's formula. An attack made WITH THE WEAPON is a special
  // attack; everything else is a spell. Deliberately mechanical: the
  // difference is which pool it costs and what it scales off, not a flavour
  // choice.
  //
  // ROUND 112 widened "with the weapon" from `delivery === 'melee'` to the
  // weapon's own range band -- see the note above `weaponBands` -- and added
  // `leadHostile`, because round 109's version called a cooldown-clearing
  // self-buff delivered at your own feet a special attack and gave it a
  // prerequisite you could fail.
  const type = (weaponed && leadHostile && weaponBands.includes(delivery)) ? 'special' : 'spell';

  // --- modifiers -----------------------------------------------------------
  const mods = {};
  for (const k of modifiersFor(levers)) {
    const m = MODIFIERS[k];
    if (!effects.some(e => m.appliesTo.includes(e))) continue;
    // One in three, per modifier. Every one that could attach attaching every
    // time would make a chain essence's whole kit read the same.
    if (roll(`mod${k}`, 3) !== 0) continue;
    const [lo, hi] = m.band;
    mods[k] = lo + roll(`modn${k}`, hi - lo + 1);
  }

  return {
    type, delivery, effects, modifiers: mods,
    damageType: hostile ? damageType : null,
    // What the count actually came out as, for the suites and the cards.
    effectCount: effects.length,
    // ROUND 112 -- parallel to `effects`: the rank each one becomes live at.
    // The runtime filters on this so a gold-composed ability does not hand an
    // iron player everything it will one day do.
    effectRanks,
    hostile,
    // ROUND 112 -- `hostile` is true if ANY effect harms; this is true only if
    // the LEAD does. The special-attack prerequisite needs the second
    // question: a composition led by `recover` with an impact riding on it is
    // hostile, and it is a restore -- "Blood Beacon requires a hammer and is a
    // restore" was in the first measured batch. What an ability IS is its
    // lead, which is the same rule CATEGORY_BY_LEAD follows one file over.
    leadHostile: !!ATOMS[effects[0]].hostile,
  };
}

/**
 * COMPOSE ONE PASSIVE.
 *
 * Deliberately much smaller than `composeAbility`, and that asymmetry is the
 * design rather than an omission. An active is a SENTENCE -- effects in an
 * order, each doing something to somebody -- so it composes. A passive is a
 * STANDING FACT, and two standing facts stapled together are not one passive,
 * they are two. So this picks one atom, one slot, and a magnitude band, and
 * the variety comes from which passive an essence can hold at all.
 *
 * Returns the atom, the slot, and the runtime template it lands on. Turning
 * that into a spec with real numbers is `buildComposedPassive` in awakening.js,
 * which owns the scales.
 */
export function composePassive({ levers, rank = 'iron', rare = false, roll, forceAtom = null }) {
  let avail = passivesFor(levers).filter(p => PASSIVE_ATOMS[p]);
  // Same contract as `forceLead`: a seat may ASK for an aura or a perception
  // passive, and an essence whose levers supply neither simply does not get
  // one.
  if (forceAtom) {
    if (!avail.includes(forceAtom)) return null;
    avail = [forceAtom];
  }
  // A rare seat is the only place the stacking state machine is offered --
  // round 105's `rareOnly` lesson, carried forward deliberately rather than
  // inherited: it was a table flag that meant "never" for everything but one
  // template, and here it means what it says.
  const rareOnly = avail.filter(p => PASSIVE_ATOMS[p].rareOnly);
  avail = avail.filter(p => !PASSIVE_ATOMS[p].rareOnly);
  if (rare && rareOnly.length) avail = avail.concat(rareOnly);
  if (!avail.length) return null;

  const atom = avail[roll('patom', avail.length)];
  const def = PASSIVE_ATOMS[atom];
  const slot = def.slots ? def.slots[roll('pslot', def.slots.length)] : null;
  const template = passiveTemplateFor(atom, slot);
  if (!template) return null;

  // Rank raises what a passive is worth, never how many things it is. The
  // active model's `effectCount` has no passive equivalent on purpose.
  const step = RANK_ORDER.indexOf(rank);
  return {
    atom, slot, template,
    magnitude: 1 + step * 0.45 + roll('pmag', 3) * 0.12,
    // A seeded index the CALLER uses to pick from tables this file must not
    // import. `trigger` needs a fire event and an effect kind; those live in
    // awakening.js as TRIGGER_KINDS and TRIGGER_EFFECT_KINDS, and copying them
    // here to make the choice locally would be the hand-copied roster this
    // project has now been bitten by six times. So the composer says WHICH
    // ONE by number and awakening.js resolves it against the real list.
    variant: roll('pvar', 64),
    capped: def.capped || null,
    rare: !!(def.rareOnly),
  };
}

// ===========================================================================
// CAN THE COMPOSER RECREATE WHAT WAS ALREADY WRITTEN? (round 109)
// ===========================================================================
//
// The user's condition on replacing the category table, verbatim:
//
//   "ensure that if the generator can't recreate the authored abilities it's
//    adjusted so that it can."
//
// That is a testable claim, so it is a table and a check rather than a
// promise. 2,745 authored `catKey` references across essenceSignatures.js,
// confluenceSignatures.js and essenceAbilities.js resolve to 43 categories in
// 36 kind:template shapes. Every one of those shapes must be something the
// composer can produce, or a signature bank quietly stops being buildable and
// the named abilities -- which are the game's flavour, and the part nobody
// would want regenerated -- lose their mechanics.
//
// Writing this table is what found the four missing active atoms. `move` alone
// carries 296 authored references and is a KIT_CATEGORY_FLOOR, so a composer
// without it could not have built a legal kit at all. That is not a gap I
// would have reasoned my way to; the authored rows had to be asked.
export const SHAPE_COVERAGE = {
  // ---- active templates -> the atom(s) that express them ------------------
  projectileBall: { atoms: ['impact'], note: 'plus dot/explode/drain as effects' },
  volley:         { atoms: ['impact'], via: 'split modifier' },
  aoeRing:        { atoms: ['impact'], via: 'aoe_target delivery' },
  breathCone:     { atoms: ['impact'], via: 'short delivery' },
  rangeStrike:    { atoms: ['impact'], via: 'long delivery' },
  stackStrike:    { atoms: ['impact'], via: 'stacks passive' },
  sunderStrike:   { atoms: ['impact', 'debuff'] },
  weakenRing:     { atoms: ['debuff'], via: 'aoe_target delivery' },
  barrierWall:    { atoms: ['summon_terrain'] },
  bloomField:     { atoms: ['summon_terrain'] },
  activeSummon:   { atoms: ['summon_minion', 'summon_trap'] },
  selfHeal:       { atoms: ['heal'] },
  selfHot:        { atoms: ['hot'] },
  aoeHealPulse:   { atoms: ['heal'], via: 'aoe_self delivery' },
  absorbShield:   { atoms: ['shield'] },
  armorBuff:      { atoms: ['buff'] },
  selfPower:      { atoms: ['buff'] },
  selfCritBuff:   { atoms: ['buff'] },
  thornsBuff:     { atoms: ['buff'] },
  movementHaste:  { atoms: ['move'] },
  immunityBuff:   { atoms: ['cleanse'] },
  cleanse:        { atoms: ['cleanse'] },
  resourceRestore:{ atoms: ['innervate', 'iot', 'recover', 'rot'] },
  dash:           { atoms: ['move'] },
  teleport:       { atoms: ['move'] },
  timeFreeze:     { atoms: ['control'] },
  tauntPull:      { atoms: ['taunt'] },
  stealthVeil:    { atoms: ['stealth'] },
  partyBuff:      { atoms: ['buff'], via: 'allies lever' },
  reflectWard:    { atoms: ['shield'], passive: 'reflect' },
  imbueStrike:    { atoms: ['imbue'] },
  townPortal:     { atoms: ['travel'] },
  confuseTurn:    { atoms: ['control'] },
  rangeBuff:      { atoms: ['buff'], via: 'reach lever' },
  statBuff:       { atoms: ['buff'] },
  cooldownReset:  { atoms: ['refresh'] },
  abilityLock:    { atoms: ['debuff'], via: 'the suppressed condition' },
  // ---- passive templates -> the passive atom that emits them --------------
  passiveBuff:        { passive: 'stat' },
  passiveMove:        { passive: 'pace' },
  cooldownPassive:    { passive: 'recharge' },
  elementPierce:      { passive: 'pierce' },
  passiveConditional: { passive: 'conditional' },
  aura:               { passive: 'aura' },
  triggeredPassive:   { passive: 'trigger' },
  stacking:           { passive: 'stacks' },
  waterWalk:          { passive: 'capability' },
  twoHandWield:       { passive: 'capability' },
  unarmedFocus:       { passive: 'capability' },
  perception:         { passive: 'sense' },
  summonWeapon:       { passive: 'conjure' },
  summonArmor:        { passive: 'conjure' },
  summonGear:         { passive: 'conjure' },
  summonBonded:       { passive: 'bond' },
  fateReroll:         { passive: 'fate' },
  weaponAffinity:     { passive: 'attune' },
  weaponMight:        { passive: 'attune', via: 'the `might` slot' },
  attrBoost:          { passive: 'attribute' },
  // ROUND 164 (item 1.1) -- through the capability atom's `virulence` slot.
  virulence:          { passive: 'capability', via: 'the `virulence` slot' },
};

/**
 * Which authored shapes the composer CANNOT produce.
 *
 * `authoredTemplates` is the live set of `kind:template` shapes the authored
 * signature banks actually reference -- passed in by the caller so this file
 * stays a leaf and so the check reads the real rows rather than a copy of them
 * that could go stale. That distinction is this project's fault class two and
 * has bitten five separate tables.
 */
export function uncoveredShapes(authoredTemplates = []) {
  const out = [];
  for (const t of authoredTemplates) {
    const c = SHAPE_COVERAGE[t];
    if (!c) { out.push(`${t}: the composer has no way to make this at all`); continue; }
    for (const a of (c.atoms || [])) {
      if (!ATOMS[a]) out.push(`${t}: needs atom '${a}', which does not exist`);
      else if (!atomHasRuntime(a)) out.push(`${t}: needs atom '${a}', which has no runtime`);
    }
    if (c.passive && !PASSIVE_ATOMS[c.passive]) {
      out.push(`${t}: needs passive '${c.passive}', which does not exist`);
    }
  }
  return out;
}

/** Faults in the composer's own tables. Every atom a lever supplies must
 *  exist; every modifier must apply to at least one atom some lever supplies;
 *  every lever must be able to compose something. */
export function composerFaults() {
  const out = [];
  for (const [l, atoms] of Object.entries(LEVER_ATOMS)) {
    if (!LEVERS[l]) out.push(`LEVER_ATOMS names ${l}, which is not a lever`);
    for (const a of atoms) if (!ATOMS[a]) out.push(`${l} supplies unknown atom ${a}`);
    if (atoms.length < 3) out.push(`${l} supplies only ${atoms.length} atom(s)`);
  }
  // A `pairs` entry that names nothing is not inert -- it is a bias that never
  // fires, which reads in the table as "dot prefers contagion" while the
  // composer has never once acted on it. Round 105's fault class exactly: the
  // name is not the behaviour.
  for (const [a, spec] of Object.entries(ATOMS)) {
    for (const p of (spec.pairs || [])) {
      if (!ATOMS[p]) out.push(`atom ${a} pairs with '${p}', which is not an atom`);
    }
    if (spec.needs && spec.needs !== 'delivery') out.push(`atom ${a} needs unknown '${spec.needs}'`);
  }
  for (const l of Object.keys(LEVERS)) {
    if (!LEVER_ATOMS[l]) out.push(`lever ${l} supplies no atoms at all`);
    if (!LEVER_DELIVERY[l]) out.push(`lever ${l} names no delivery`);
  }
  for (const [k, m] of Object.entries(MODIFIERS)) {
    for (const a of m.appliesTo) if (!ATOMS[a]) out.push(`modifier ${k} applies to unknown atom ${a}`);
    for (const l of m.from) if (!LEVERS[l]) out.push(`modifier ${k} comes from unknown lever ${l}`);
  }
  for (const [l, refused] of Object.entries(MODIFIER_REFUSALS)) {
    if (!LEVERS[l]) out.push(`MODIFIER_REFUSALS names ${l}, which is not a lever`);
    for (const r of refused) if (!MODIFIERS[r]) out.push(`${l} refuses unknown modifier ${r}`);
  }
  for (const d of Object.values(LEVER_DELIVERY)) {
    for (const x of d) if (!DELIVERIES.includes(x)) out.push(`unknown delivery ${x}`);
  }
  // ---- the runtime gate, checked in both directions ------------------------
  //
  // An atom with no entry at all is the dangerous case: `atomHasRuntime`
  // returns false for it, so it silently stops being composable and nothing
  // says why. Absence must be a DECISION recorded in the table, never a
  // by-product of somebody adding an atom and not this row.
  for (const a of ATOM_KEYS) {
    if (!ATOM_RUNTIME[a]) out.push(`atom ${a} has no ATOM_RUNTIME entry -- classify it, even as unbuildable`);
    else if (!ATOM_RUNTIME[a].call && !ATOM_RUNTIME[a].why) {
      out.push(`atom ${a} is marked unbuildable with no reason given`);
    }
  }
  for (const a of Object.keys(ATOM_RUNTIME)) {
    if (!ATOMS[a]) out.push(`ATOM_RUNTIME names ${a}, which is not an atom`);
  }
  // And the gate must not starve a lever. A lever whose atoms are ALL
  // unbuildable composes nothing, which would be an essence that cannot act.
  for (const [l, atoms] of Object.entries(LEVER_ATOMS)) {
    if (atoms.length && !atoms.some(atomHasRuntime)) {
      out.push(`lever ${l} supplies only atoms the game cannot perform`);
    }
  }
  // ---- the passive half, held to the same standard -------------------------
  //
  // The rule that matters here: every passive atom must name a TEMPLATE the
  // game already runs. A passive atom emitting onto nothing is a description
  // of a passive, and this project has shipped that mistake often enough to
  // check for it by reflex now.
  for (const [k, p] of Object.entries(PASSIVE_ATOMS)) {
    if (p.templateBySlot) {
      if (!p.slots) out.push(`passive ${k} has templateBySlot but no slots`);
      else for (const s of p.slots) {
        if (!p.templateBySlot[s]) out.push(`passive ${k} slot '${s}' names no template`);
      }
    } else if (!p.template) {
      out.push(`passive ${k} names no template -- it would emit onto nothing`);
    }
    if (p.slots && !p.slots.length) out.push(`passive ${k} has an empty slot list`);
  }
  for (const [l, ps] of Object.entries(LEVER_PASSIVES)) {
    if (!LEVERS[l]) out.push(`LEVER_PASSIVES names ${l}, which is not a lever`);
    for (const p of ps) if (!PASSIVE_ATOMS[p]) out.push(`${l} supplies unknown passive ${p}`);
    if (ps.length < 3) out.push(`${l} supplies only ${ps.length} passive(s)`);
  }
  for (const l of Object.keys(LEVERS)) {
    if (!LEVER_PASSIVES[l]) out.push(`lever ${l} supplies no passives at all`);
  }
  // A passive nothing can hold is the passive-side version of an unreachable
  // atom, and it is the failure round 105 spent a whole round finding.
  const heldBySome = new Set(Object.values(LEVER_PASSIVES).flat());
  for (const k of PASSIVE_ATOM_KEYS) {
    if (!heldBySome.has(k)) out.push(`passive ${k} is supplied by no lever -- nothing can ever hold it`);
  }
  return out;
}

/** Every atom must be reachable by SOME lever, or it is a mechanic the game
 *  can describe and never produce -- round 105's lesson, three times over. */
export function unreachableAtoms() {
  const reachable = new Set();
  for (const atoms of Object.values(LEVER_ATOMS)) for (const a of atoms) reachable.add(a);
  return ATOM_KEYS.filter(a => !reachable.has(a));
}

/** ...and the same question for damage types, which the stone supplies. */
export function damageTypesInPlay() { return Object.keys(DAMAGE_TYPES); }
