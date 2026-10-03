// ============================================================================
// ROUND 296 -- AN ESSENCE'S ABILITIES ARE ABOUT THAT ESSENCE.
//
// The user, on the round-295 kit (Discord / Life / Crocodile):
//   2   "I've noted at length that essence abilities need to match the
//        identity of their essence."
//   2.1 "Life Bond is named for the life essence but doesn't grant extra
//        health, heal, or restore health. It acts like a shield Thats not the
//        life essence."
//   2.2 "Fire stone in a life essence. Also nothing about life, just generic
//        dispel. A huge opportuinity to do something that has to do with Life."
//   2.3 "Something like / Cauterize wounds / Sacrifice 10% of maximum health
//        and inflict 4 stacks of burn then dispel hostile necrotic, poison,
//        burn, and bleed effects then gain a stack of [Healing Balm] for each
//        efffect dispeled. / [Healing Balm] Heal for 3 HP a second for 5
//        seconds."
//   2.4 "Notice how thematic it feels, interesting effects merging life and
//        fire."
//
// Two things here:
//   HEALTH_ESSENCES  every ability these essences grant gives, restores or
//                    drains health. The socket prefers a candidate that
//                    does; if none does, the chosen one is given a health
//                    effect of its own (a drain on an attack, a mend on
//                    anything else). Kept to Life and the Healer for now:
//                    the other mend-led essences (Wood, Plant, Pure...) are
//                    a question for the user, not a rule to assume.
//   AUTHORED_PAIRINGS  an essence and a stone that make one specific ability,
//                    written out. Life with Fire is Cauterize Wounds, as the
//                    user wrote it.
// ============================================================================

export const HEALTH_ESSENCES = ['essLife', 'heal'];

const HEALTH_TEMPLATES = new Set(['selfHeal', 'selfHot', 'aoeHealPulse', 'bloomField', 'corpseDrain', 'cauterize', 'hearthfire', 'rekindle']);

/** Is this ability ABOUT health: does its own effect give, restore or drain
 *  health? A "using it also restores 5 health" rider on a dispel is not --
 *  that is the ability the user called "just generic dispel". */
export function hasHealthEffect(a) {
  if (!a) return false;
  if (HEALTH_TEMPLATES.has(a.template)) return true;
  if (a.healAmount > 0 || a.hot || a.hotPerSec > 0 || a.regenPerSec > 0) return true;
  if (a.leech > 0 || a.leechOverTime || a.lifeOnKill || (a.dot && a.dot.healFrac > 0)) return true;
  if (a._healthRider && a.healOnUse) return true;
  if (a.template === 'passiveBuff' && a.buffKind === 'maxHp') return true;
  if (a.template === 'aura' && a.auraEffect === 'regen') return true;
  if (a.maxHpBonus > 0 || a.maxHpPct > 0) return true;
  return false;
}

/** Give a chosen ability a health effect of its own. Mutates and returns it. */
export function addHealthEffect(a, roll) {
  if (!a || hasHealthEffect(a)) return a;
  const deals = typeof a.base === 'number' && a.base > 0;
  if (a.kind === 'active' && deals) {
    a.leech = Math.round((0.12 + roll('lifeleech', 7) / 100) * 100) / 100;
    a.desc = `${String(a.desc || '').trim()} It heals you for ${Math.round(a.leech * 100)}% of the damage it deals.`;
  } else if (a.kind === 'active') {
    a.healOnUse = 6 + roll('lifeheal', 6);
    a.desc = `${String(a.desc || '').trim()} Using it also restores ${a.healOnUse} health.`;
  } else {
    a.regenPerSec = Math.round((0.8 + roll('liferegen', 6) * 0.2) * 10) / 10;
    a.desc = `${String(a.desc || '').trim()} You also regenerate ${a.regenPerSec} health a second.`;
  }
  a._healthRider = true;
  return a;
}

// ---- authored pairings ---------------------------------------------------------

/** [Healing Balm], as the user wrote it. */
export const HEALING_BALM = { perSec: 3, duration: 5 };

/** Which hostile effects Cauterize Wounds burns away, by condition tag. */
export const CAUTERIZE_TAGS = ['disease', 'poison', 'burning', 'wounding', 'blood'];

// ROUND 297 -- "My example was just to point out that thematically we can do
// a better mix ... if a player exclusively used awakening stones of fire on
// every playthrough with the life essence they wouldn't get the exact same
// abilities every time. They should get similar feeling, or equally thematic
// abilities." So a pairing is a POOL of fusions, each a life-and-fire idea
// with a mechanic of its own, and the character's seed picks one.
export const AUTHORED_PAIRINGS = {
  'essLife|stoneFire': [
    // The user's own.
    () => ({
      name: 'Cauterize Wounds', kind: 'active', template: 'cauterize', category: 'healing', catKey: null,
      element: 'fire', color: '#ff7043', cooldown: 20, authoredPair: true,
      hpCostPct: 0.10, selfBurnStacks: 4, cleanseTags: CAUTERIZE_TAGS.slice(), balm: { ...HEALING_BALM },
      desc: 'Sacrifice 10% of your maximum health and inflict 4 stacks of [Burning] on yourself, then dispel every hostile '
        + 'necrotic, poison, burning and bleeding effect on you. Gain a stack of [Healing Balm] for each effect dispelled. '
        + `[Healing Balm]: heal ${HEALING_BALM.perSec} health a second for ${HEALING_BALM.duration} seconds.`,
    }),
    // Fire that feeds you: the burn you lay is health you take back.
    () => ({
      name: 'Searing Renewal', kind: 'active', template: 'projectileBall', category: 'attack', catKey: null,
      element: 'fire', color: '#ff8a65', cooldown: 6, base: 8, speed: 300, radius: 7, authoredPair: true,
      dot: { dmgPerTick: 3, ticks: 5, tickMs: 1000, critChance: 0.05, label: 'Burning', healFrac: 1 },
      desc: 'Throws a bolt of fire that deals 8 damage and sets the target [Burning] for 3 damage a second for 5 seconds. '
        + 'Every point of damage that Burning deals heals you.',
    }),
    // A hearth: warmth for your side of the fire, burning for theirs.
    () => ({
      name: 'Hearthfire', kind: 'active', template: 'hearthfire', category: 'healing', catKey: null,
      element: 'fire', color: '#ffb74d', cooldown: 24, authoredPair: true,
      fieldRadius: 96, fieldDuration: 8, fieldHeal: 4, fieldBurn: 4,
      desc: 'Lights a fire at your feet for 8 seconds, 3 tiles across. You and your allies inside it regain 4 health a second; '
        + 'enemies inside it take 4 fire damage a second.',
    }),
    // The phoenix: the fire that brings you back.
    () => ({
      name: 'Rekindle', kind: 'passive', template: 'rekindle', category: 'healing', catKey: null,
      element: 'fire', color: '#ff7043', authoredPair: true,
      rekindleBelow: 0.3, rekindleHealPct: 0.3, rekindleSeconds: 5, rekindleBurst: 15, rekindleRadius: 96, rekindleCooldown: 180,
      desc: 'When your health falls below 30%, you burst into flame: you regain 30% of your maximum health over 5 seconds, '
        + 'and every enemy within 3 tiles takes 15 fire damage. Once every 3 minutes.',
    }),
  ],
};

/** The fusion this essence and stone make for this character, or null.
 *  `hash` is awakening's stableHash, salted with the character's seed. */
export function authoredPairingFor(essenceId, stoneId, hash = null) {
  const pool = AUTHORED_PAIRINGS[`${essenceId}|${stoneId}`];
  if (!pool || !pool.length) return null;
  const i = hash ? hash(`${essenceId}|${stoneId}|fusion`) % pool.length : 0;
  return pool[i]();
}

/** Every fusion a pairing can make, for the census and the tests. */
export function authoredPairingPool(essenceId, stoneId) {
  return (AUTHORED_PAIRINGS[`${essenceId}|${stoneId}`] || []).map(f => f());
}

/** The numbers line for an authored pairing's template. */
export function cauterizeStats(a) {
  return `sacrifice ${Math.round(a.hpCostPct * 100)}% max health · ${a.selfBurnStacks} Burning on you · `
    + `dispels necrotic, poison, burning and bleeding · Healing Balm ${a.balm.perSec} HP/s for ${a.balm.duration}s per effect`;
}

export function hearthfireStats(a) {
  return `a fire 3 tiles across for ${a.fieldDuration}s · you and allies inside +${a.fieldHeal} HP/s · enemies inside ${a.fieldBurn} fire damage/s`;
}

export function rekindleStats(a) {
  return `below ${Math.round(a.rekindleBelow * 100)}% health: +${Math.round(a.rekindleHealPct * 100)}% max health over ${a.rekindleSeconds}s, `
    + `${a.rekindleBurst} fire damage within 3 tiles · once every ${Math.round(a.rekindleCooldown / 60)}m`;
}
