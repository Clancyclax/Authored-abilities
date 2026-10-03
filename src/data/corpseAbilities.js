// ============================================================================
// ROUND 189 -- ABILITIES THAT USE THE DEAD.
//
//   "2.5) Add abilities (as thematically appropriate) to the game which can
//    utilize monster bodies.
//    2.5.1) Common in ARPG systems these would be things that cause corpses
//    to explode, corpses to radiate a affliction, corpses to explode when
//    enemies are nearby, draining corpses for heath, mana, or stamina, raising
//    skeletons or undead minions from corpses
//    2.5.2) Consuming a corpse with an abilities in any way also loots them."
//
// FIVE TEMPLATES, one per clause, and each is a thing a body is FOR:
//
//   corpseBlast   the body bursts, hurting everything round it
//   corpseMiasma  the body rots in place, laying an affliction on whatever
//                 stands in its cloud until it is gone
//   corpseMine    bodies in reach are primed; each bursts when an enemy
//                 comes near it
//   corpseDrain   bodies in reach are drained into your health, mana or
//                 stamina
//   raiseDead     a body gets up again, as a skeleton that fights for you
//
// WHO GETS THEM. Not the random roll. The category rows below carry
// `corpse: true`, which keeps them out of the pools the kit builder draws a
// socket from (`ACTIVE_CATEGORIES` in awakening.js) -- adding five categories
// there would re-deal every kit in the game, and a Fire mage raising the dead
// is not "thematically appropriate". They reach a kit the one way an authored
// ability does: as a SIGNATURE of the six essences whose sentence they are --
// Death, Blood, Bone, Blight, Hunger and Sin.
//
// EVERY USE LOOTS (2.5.2). The scene's `_consumeCorpse` is the only way a body
// stops being a body, and it grants whatever the body held before it goes.
// ============================================================================

export const CORPSE_TEMPLATES = ['corpseBlast', 'corpseMiasma', 'corpseMine', 'corpseDrain', 'raiseDead'];
export function isCorpseTemplate(t) { return CORPSE_TEMPLATES.includes(t); }

/** How far a corpse ability looks for bodies, in world units. */
export const CORPSE_REACH = 300;
/** Blast radius round a bursting body. */
export const CORPSE_BLAST_RADIUS = 115;
/** The burst's damage on top of the ability's base: a fraction of the dead
 *  thing's own maximum health, so a troll's body is worth more than a rat's.
 *  Capped against the base so a boss corpse is not a one-shot button. */
export const CORPSE_BLAST_HP_FRAC = 0.08;
export const CORPSE_BLAST_HP_CAP = 4;      // x the ability's base
/** A primed body bursts when an enemy is this close. */
export const CORPSE_MINE_TRIGGER = 70;
export const CORPSE_MINE_SECONDS = 30;
export const CORPSE_MINE_MAX = 3;
/** The rotting cloud. */
export const CORPSE_MIASMA_RADIUS = 130;
export const CORPSE_MIASMA_SECONDS = 8;
/** Draining: this share of the pool per body, and at most this many bodies. */
export const CORPSE_DRAIN_FRAC = 0.07;
export const CORPSE_DRAIN_MAX = 5;
/** A raised skeleton. */
export const RAISE_DEAD_SECONDS = 30;

/** The category rows, in ABILITY_CATEGORIES' own shape. */
export const CORPSE_CATEGORIES = [
  { key: 'corpse_blast', kind: 'active', category: 'attack', template: 'corpseBlast', corpse: true,
    isAoe: true, sheetTypes: [], names: ['{A} Corpse Burst', 'Bursting {A}', '{A} Carrion Blast'] },
  { key: 'corpse_miasma', kind: 'active', category: 'affliction', template: 'corpseMiasma', corpse: true,
    isAoe: true, sheetTypes: [], names: ['{A} Miasma', 'Rot of {A}', '{A} Plague Bloom'] },
  { key: 'corpse_mine', kind: 'active', category: 'attack', template: 'corpseMine', corpse: true,
    isAoe: true, sheetTypes: [], names: ['{A} Grave Snare', 'Primed {A}', '{A} Carrion Trap'] },
  { key: 'corpse_drain', kind: 'active', category: 'restore', template: 'corpseDrain', corpse: true,
    sheetTypes: [], names: ['{A} Feast', 'Drain the {A} Dead', '{A} Siphon'] },
  { key: 'raise_dead', kind: 'active', category: 'summon', template: 'raiseDead', corpse: true,
    sheetTypes: [], names: ['Raise {A}', '{A} Servant', '{A} Revenant'] },
];

/** Numbers per template, before the essence's base scales the damage. */
const TUNING = {
  corpseBlast:  { cooldown: 4, cost: 8, baseMult: 1.6 },
  corpseMiasma: { cooldown: 10, cost: 10, baseMult: 0.5 },
  corpseMine:   { cooldown: 12, cost: 12, baseMult: 1.3 },
  // ROUND 190 -- every active costs something (test_round38); a drain costs
  // a little breath, and gives far more back.
  corpseDrain:  { cooldown: 9, cost: 4, costType: 'stamina', baseMult: 0 },
  raiseDead:    { cooldown: 14, cost: 14, baseMult: 0.9 },
};

/** The spec a corpse category produces. Pure: the same inputs give the same
 *  ability, which the kit builder relies on. */
export function corpseAbilitySpec(cat, essDef, { color, element, name, stoneId, resource }) {
  const t = TUNING[cat.template];
  const essBase = essDef.base || 6;
  const base = Math.max(1, Math.round(essBase * t.baseMult));
  const spec = {
    name, kind: 'active', category: cat.category, template: cat.template, color,
    catKey: cat.key, stoneId: stoneId || null, essenceId: essDef.id, element: element || null,
    cooldown: t.cooldown, range: CORPSE_REACH, base,
    cost: t.cost ? { type: t.costType || 'mana', amount: t.cost } : null,
    corpse: true,
  };
  if (cat.template === 'corpseBlast') {
    spec.explodeRadius = CORPSE_BLAST_RADIUS;
    spec.desc = `The nearest body within ${Math.round(CORPSE_REACH / 32)} tiles bursts, dealing ${base} damage plus a share of what it was to everything within ${Math.round(CORPSE_BLAST_RADIUS / 32)} tiles.`;
    spec.stats = `${base}+ dmg burst · ${Math.round(CORPSE_BLAST_RADIUS / 32)} tile radius · needs a body`;
  } else if (cat.template === 'corpseMiasma') {
    spec.dot = { dmgPerTick: Math.max(1, base), ticks: 3, tickMs: 900, critChance: 0.05, label: 'Rot' };
    spec.miasmaSeconds = CORPSE_MIASMA_SECONDS;
    spec.explodeRadius = CORPSE_MIASMA_RADIUS;
    spec.desc = `The nearest body rots where it lies for ${CORPSE_MIASMA_SECONDS} seconds; anything that stands in its cloud takes Rot, ${spec.dot.dmgPerTick} damage a tick.`;
    spec.stats = `Rot ${spec.dot.dmgPerTick}/tick · ${CORPSE_MIASMA_SECONDS}s cloud · needs a body`;
  } else if (cat.template === 'corpseMine') {
    spec.explodeRadius = CORPSE_BLAST_RADIUS;
    spec.mineSeconds = CORPSE_MINE_SECONDS;
    spec.desc = `Primes up to ${CORPSE_MINE_MAX} bodies in reach. Each bursts for ${base} damage the moment an enemy comes near it.`;
    spec.stats = `${base} dmg per body · ${CORPSE_MINE_MAX} bodies · ${CORPSE_MINE_SECONDS}s`;
  } else if (cat.template === 'corpseDrain') {
    spec.resource = resource || 'hp';
    spec.drainFrac = CORPSE_DRAIN_FRAC;
    const word = spec.resource === 'hp' ? 'health' : spec.resource;
    spec.desc = `Drains every body in reach (up to ${CORPSE_DRAIN_MAX}); each gives back ${Math.round(CORPSE_DRAIN_FRAC * 100)}% of your ${word}.`;
    spec.stats = `+${Math.round(CORPSE_DRAIN_FRAC * 100)}% ${word} per body · up to ${CORPSE_DRAIN_MAX}`;
  } else if (cat.template === 'raiseDead') {
    spec.summonFamily = 'skeleton';
    spec.summonDuration = RAISE_DEAD_SECONDS;
    spec.summonDmg = base;
    spec.desc = `The nearest body stands up again as a skeleton that fights for you for ${RAISE_DEAD_SECONDS} seconds.`;
    spec.stats = `skeleton ally · ${RAISE_DEAD_SECONDS}s · needs a body`;
  }
  return spec;
}

/**
 * The signatures, per essence: the authored names and voices these reach a
 * kit through. `mech.resource` pins what a drain gives back.
 */
export const CORPSE_SIGNATURES = {
  essDeath: [
    { name: 'Corpse Explosion', catKey: 'corpse_blast',
      desc: 'Death is not finished with the body. It opens it, all at once, outward.' },
    { name: 'Raise the Fallen', catKey: 'raise_dead',
      desc: 'Calls the body back up on its bones and points it at what killed it.' },
    { name: 'Breath of the Dead', catKey: 'corpse_drain', mech: { resource: 'mana' },
      desc: 'Takes the last breath the dead did not get to use, and keeps it.' },
  ],
  essBlood: [
    { name: 'Blood Burst', catKey: 'corpse_blast',
      desc: 'Every drop left in the body is called out of it at once, and hard.' },
    { name: 'Sanguine Feast', catKey: 'corpse_drain', mech: { resource: 'hp' },
      desc: 'The blood of the fallen runs to you across the ground and into the wounds.' },
  ],
  essBone: [
    { name: 'Bone Servant', catKey: 'raise_dead',
      desc: 'Strips the body to what holds it up, and that stands and fights.' },
    { name: 'Ossuary Snare', catKey: 'corpse_mine',
      desc: 'The bones of the dead lie waiting; the first thing that steps near them is shredded.' },
  ],
  essBlight: [
    { name: 'Plague Bloom', catKey: 'corpse_miasma',
      desc: 'The body flowers into a sick green cloud, and the cloud is hungry.' },
    { name: 'Carrion Trap', catKey: 'corpse_mine',
      desc: 'Swells the dead with rot until the smallest disturbance bursts them.' },
  ],
  essHunger: [
    { name: 'Devour the Fallen', catKey: 'corpse_drain', mech: { resource: 'hp' },
      desc: 'Nothing is wasted. What fell is eaten, and what is eaten mends you.' },
    { name: 'Gorge on the Fallen', catKey: 'corpse_drain', mech: { resource: 'stamina' },
      desc: 'Feeds on the dead until the legs are strong again.' },
  ],
  essSin: [
    { name: 'Profane Pyre', catKey: 'corpse_miasma',
      desc: 'Desecrates the body where it lies; its cloud curses whatever breathes it.' },
    { name: 'Wages of Sin', catKey: 'corpse_blast',
      desc: 'The dead pay for what they did, and everyone standing near them pays too.' },
  ],
};
