// ============================================================================
// ROUND 296 -- WHAT EACH ATTACK IN A DPS KIT IS FOR.
//
// The user, round 295:
//   3.2 "Attacks shouldn't be 16 flavors of (sucessive strikes do more
//        damage). Attacks should be options and flow together."
//   3.3 groups   3.4 strong enemies   3.5 combo setters   3.6 utility
//   3.7 "No cooldown attacks, low damage, low cost but nearly always available."
//   3.8 "No cooldown attacks, med damage, costs a resource in addition to mana
//        or stamina. Maybe costs health, requires consuming a debuff or
//        generated buff, or ... a limited number of stacking charges that
//        restore when you kill an enemy, or ... an alternative resource
//        'Rage, Souls, shards, energy, etc'"
//   3.9 "Medium cooldown attacks 8-60 seconds, higher damage specific effect.
//        Knockback, charge, restore alternate resources, spreads afflictions."
//   3.10 "Long cooldown attacks, 1 minute to 120 minutes. Percentage based
//        damage to bosses, guarenteed crits, blows that grant buffs to the
//        whole party, ignores armor, or resistance, can't be dodged, or high
//        AOE damage."
//   3.11 "Executes, High damage finisher. Either only usable when an enemy is
//        at low health or requires consuming all of a resource, or requires
//        consuming a debuff and the damage is only very high if a very large
//        amount of debuffs are on the enemy."
//
// Every attack a DPS kit takes is given one ROLE when it is placed, from the
// role the kit is furthest behind on (ROLE_QUOTA, paced over the 15). The
// role sets its cooldown band, its damage, its extra price and one specific
// effect, and says so in one plain sentence. The four cross-cutting needs
// (3.3-3.6) are TAGS: the effect a role rolls leans toward a tag the kit is
// still missing.
//
// "Can't be dodged" is not offered: nothing a player hits in this game rolls
// a dodge, so the clause would describe a mechanic that does nothing.
// ============================================================================

// ROUND 297 -- for ten attacks ("minimum 10"); a kit with more spreads the
// extra across the same proportions.
export const ROLE_QUOTA = { basic: 2, resource: 2, medium: 3, long: 2, execute: 1 };
export const ROLE_ORDER = ['basic', 'resource', 'medium', 'long', 'execute'];
export const ROLE_TOTAL = Object.values(ROLE_QUOTA).reduce((a, b) => a + b, 0);
export const ROLE_LABEL = {
  basic: 'basic attack', resource: 'paid attack', medium: 'cooldown attack', long: 'major attack', execute: 'finisher',
};

/** The cooldown bands, seconds. */
export const BASIC_CD = [0.6, 1.0];
export const RESOURCE_CD = [0.8, 1.2];
export const MEDIUM_CD = [8, 60];
export const LONG_CD_STEPS = [60, 60, 90, 120, 120, 180, 300, 600, 1200, 3600, 7200];
export const EXECUTE_CD = [10, 20];

const QUICK = new Set(['projectileBall', 'volley', 'chainStrike', 'breathCone', 'sunderStrike', 'rangeStrike',
  'aoeRing', 'stackStrike', 'martialStrike']);
const SINGLE = new Set(['projectileBall', 'chainStrike', 'sunderStrike', 'rangeStrike', 'stackStrike',
  'martialStrike', 'imbueStrike', 'dispelStrike']);
const AREA = new Set(['aoeRing', 'breathCone', 'volley', 'weakenRing', 'barrierWall']);
const BOLTS = new Set(['projectileBall', 'volley']);

/** Which roles an attack's shape can take. */
export function suitableRoles(a) {
  const t = a && a.template;
  const out = new Set(['medium', 'long']);
  if (QUICK.has(t)) { out.add('basic'); out.add('resource'); }
  if (SINGLE.has(t)) out.add('execute');
  return out;
}

/** The role this attack takes, given what the kit has so far. */
export function nextRoleFor(a, have, attacksSoFar, isOpener = false) {
  if (isOpener) return 'basic';
  // The kit's one streak stays something you can press again at once.
  if (a.scaleOn === 'successiveUses') return (have.basic || 0) < ROLE_QUOTA.basic ? 'basic' : 'resource';
  const fit = suitableRoles(a);
  // ROUND 297 -- with at most three attacks of one shape (awakening.js,
  // DPS_SHAPE_CAP), single-target attacks are fewer, and the finisher is the
  // one role only they can take: the first one past the opener's few is it.
  if (fit.has('execute') && !(have.execute > 0) && attacksSoFar >= 3) return 'execute';
  let best = null, bestD = -Infinity;
  for (const r of ROLE_ORDER) {
    const cap = Math.ceil(ROLE_QUOTA[r] * Math.max(1, (attacksSoFar + 1) / ROLE_TOTAL));
    if (!fit.has(r) || (have[r] || 0) >= cap) continue;
    const want = ROLE_QUOTA[r] * (attacksSoFar + 1) / ROLE_TOTAL;
    const d = want - (have[r] || 0);
    if (d > bestD) { bestD = d; best = r; }
  }
  return best || (fit.has('medium') ? 'medium' : 'long');
}

// ---- the second resource ----------------------------------------------------

export const ALT_RESOURCES = {
  rage: { key: 'rage', name: 'Rage', max: 100, cost: 25, gain: 20, per: 0.015, color: '#e53935',
    how: 'Landing a blow builds 4 Rage and taking one builds 6. It drains away 5 a second after 5 seconds without either.' },
  souls: { key: 'souls', name: 'Souls', max: 10, cost: 2, gain: 1, per: 0.25, color: '#9575cd',
    how: 'Every kill gathers a soul, up to 10.' },
  shards: { key: 'shards', name: 'Shards', max: 6, cost: 2, gain: 1, per: 0.3, color: '#4fc3f7',
    how: 'Hitting an enemy that carries one of your afflictions grows a shard, at most one a second, up to 6.' },
  energy: { key: 'energy', name: 'Energy', max: 100, cost: 30, gain: 25, per: 0.012, color: '#fdd835',
    how: 'Energy refills at 10 a second.' },
};

/** Stone and essence families -> the second resource they lean to. */
export const FAMILY_ALT = {
  force: 'rage', bludgeon: 'rage', blade: 'rage', polearm: 'rage', beast: 'rage', blood: 'rage',
  guard: 'rage', serpent: 'rage', smallbeast: 'rage',
  death: 'souls', dark: 'souls',
  earth: 'shards', cold: 'shards', craft: 'shards', order: 'shards', light: 'shards', identity: 'shards',
  storm: 'energy', air: 'energy', motion: 'energy', fire: 'energy', mind: 'energy', space: 'energy',
  ranged: 'energy', life: 'energy', water: 'energy', aquatic: 'energy', flyer: 'energy', alchemy: 'energy',
};

/** The kit's second resource, by the families of its three essences. */
export function altResourceFor(families) {
  const votes = {};
  for (const f of (families || [])) { const k = FAMILY_ALT[f]; if (k) votes[k] = (votes[k] || 0) + 1; }
  const top = Object.entries(votes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? top[0] : 'energy';
}

const ALT_SUFFIX = { rage: 'Fury', souls: 'Harvest', shards: 'Lattice', energy: 'Reserve' };

/** The passive that gives a DPS kit its second resource. */
export function altPassiveSpec(kind, essName, color) {
  const r = ALT_RESOURCES[kind] || ALT_RESOURCES.energy;
  return {
    name: `${essName || 'Inner'} ${ALT_SUFFIX[r.key]}`,
    kind: 'passive', template: 'altResource', category: 'resource', catKey: null,
    altRes: r.key, color: color || r.color,
    desc: `Gives you ${r.name}, a second resource that holds up to ${r.max}. ${r.how}`,
    stats: `${r.name} (max ${r.max})`,
    rankAspects: [],
  };
}

// ---- the roles, applied --------------------------------------------------------

const tiles = (u) => {
  const t = Math.max(1, Math.round((u / 32) * 2) / 2);
  return `${t} tile${t === 1 ? '' : 's'}`;
};
const pct = (n) => Math.round(n * 100);

/** The cross-cutting needs, read off an attack. */
export function roleTags(a) {
  const t = a.template;
  const tags = new Set();
  if (AREA.has(t) || a.explodeRadius > 0 || a.chain || a.spreadAfflictions || a.radius > 60 && !BOLTS.has(t)) tags.add('group');
  if (a.bossPct || a.ignoreArmor || a.ignoreResist || a.guaranteedCrit || a.role === 'execute'
    || a.armorIgnore || (a.sunder && a.sunder.amount)) tags.add('strong');
  if (a.debuff || a.dot || a.partyBuffOnHit || a.spreadAfflictions || a.sunder) tags.add('combo');
  if (a.stunOnHit || a.knockback || a.leech || a.leechOverTime || a.healOnUse || a.chargeTo
    || a.bindOnHit || a.altGain) tags.add('utility');
  return tags;
}

/**
 * Give an attack its role. Mutates and returns `a`.
 * ctx: { roll(salt, n), alt: kind|null, streak: bool, need: Set(tags),
 *        spammable(a, opts) -- awakening's makeSpammable }
 */
export function applyRole(a, role, ctx) {
  const roll = ctx.roll;
  const base0 = typeof a.base === 'number' ? a.base : null;
  const alt = ctx.alt ? ALT_RESOURCES[ctx.alt] : null;
  const need = ctx.need || new Set();
  a.role = role;
  const say = [];
  const prefer = (opts) => {
    // An option that fills a tag the kit still needs, if there is one.
    const fill = opts.filter(o => o.tag && need.has(o.tag));
    const pool = fill.length ? fill : opts;
    return pool[roll(`${role}opt`, pool.length)];
  };
  const baseOf = () => (typeof a.base === 'number' ? a.base : 0);
  const setCd = (lo, hi) => {
    const old = typeof a.cooldown === 'number' && a.cooldown > 0 ? a.cooldown : lo;
    const cd = Math.max(lo, Math.min(hi, old));
    return cd;
  };
  if (role === 'basic') {
    ctx.spammable(a, { streak: !!ctx.streak });
  } else if (role === 'resource') {
    ctx.spammable(a, { streak: false });
    if (baseOf() > 0) a.base = Math.max(3, Math.round(a.base * 1.5));
    const opts = [
      { k: 'hp', tag: null },
      { k: 'consume', tag: 'combo' },
      { k: 'charges', tag: null },
    ];
    if (alt) opts.push({ k: 'alt', tag: null }, { k: 'alt', tag: null });
    const o = prefer(opts);
    if (o.k === 'hp') {
      a.hpCostPct = Math.round((0.03 + roll('hpc', 4) / 100) * 100) / 100;
      say.push(`Also costs ${pct(a.hpCostPct)}% of your maximum health.`);
    } else if (o.k === 'consume') {
      a.consumeAffliction = true;
      say.push([
        'Can only be used on an enemy carrying one of your afflictions, and uses one of them up.',
        'It needs an enemy carrying one of your afflictions, and uses one of them up.',
        'Usable only on an enemy with one of your afflictions on it; one of them is used up.',
      ][roll('sayc', 3)]);
    } else if (o.k === 'charges') {
      a.chargesMax = 3 + roll('chg', 3);
      say.push(`Holds ${a.chargesMax} charges. Each use spends one, and each kill restores one.`);
    } else {
      a.altCost = alt.cost; a.altResKind = alt.key;
      say.push(`Also costs ${alt.cost} ${alt.name}.`);
    }
  } else if (role === 'medium') {
    const old = typeof a.cooldown === 'number' && a.cooldown > 0 ? a.cooldown : MEDIUM_CD[0];
    a.cooldown = setCd(MEDIUM_CD[0], MEDIUM_CD[1]);
    if (baseOf() > 0) a.base = Math.max(4, Math.round(a.base * Math.min(2.2, Math.max(1.3, Math.pow(a.cooldown / old, 0.55)))));
    delete a.spammable; delete a.spamCostPer;
    const opts = [
      { k: 'knock', tag: 'utility' },
      { k: 'stun', tag: 'utility' },
      { k: 'spread', tag: 'combo' },
      { k: 'charge', tag: 'utility' },
    ];
    if (alt) opts.push({ k: 'altGain', tag: null });
    // A DPS kit's way to move can be an attack that carries you to the target.
    const o = ctx.needMove ? { k: 'charge' } : prefer(opts);
    if (o.k === 'knock') {
      a.knockback = 64 + roll('kb', 3) * 16;
      say.push(`Knocks what it hits back ${tiles(a.knockback)}.`);
    } else if (o.k === 'stun') {
      a.stunOnHit = Math.round((0.8 + roll('stun', 5) * 0.2) * 10) / 10;
      say.push(`Stuns what it hits for ${a.stunOnHit} seconds.`);
    } else if (o.k === 'spread') {
      a.spreadAfflictions = 96 + roll('spr', 3) * 16;
      say.push(`Your afflictions on the target spread to every enemy within ${tiles(a.spreadAfflictions)} of it.`);
    } else if (o.k === 'charge') {
      a.chargeTo = 160 + roll('chr', 4) * 32;
      say.push([
        `You rush to your target before it lands, from up to ${tiles(a.chargeTo)} away.`,
        `It carries you to your target first, from up to ${tiles(a.chargeTo)} away.`,
        `You close on your target before the blow, from up to ${tiles(a.chargeTo)} away.`,
      ][roll('sayr', 3)]);
    } else {
      a.altGain = alt.gain; a.altResKind = alt.key;
      say.push(`Restores ${alt.gain} ${alt.name}.`);
    }
  } else if (role === 'long') {
    a.cooldown = LONG_CD_STEPS[roll('lcd', LONG_CD_STEPS.length)];
    if (baseOf() > 0) a.base = Math.max(8, Math.round(a.base * (2.2 + Math.min(1.3, a.cooldown / 1800))));
    delete a.spammable; delete a.spamCostPer;
    const physical = !a.element || a.element === 'physical';
    const opts = [
      { k: 'boss', tag: 'strong' },
      { k: 'crit', tag: 'strong' },
      { k: 'party', tag: 'combo' },
      { k: physical ? 'armor' : 'resist', tag: 'strong' },
    ];
    if (BOLTS.has(a.template)) opts.push({ k: 'burst', tag: 'group' });
    const o = prefer(opts);
    if (o.k === 'boss') {
      a.bossPct = Math.round((0.03 + roll('boss', 6) / 100) * 100) / 100;
      say.push(`Against a boss or an elite it also deals ${pct(a.bossPct)}% of their maximum health.`);
    } else if (o.k === 'crit') {
      a.guaranteedCrit = true;
      say.push('It always strikes critically.');
    } else if (o.k === 'party') {
      a.partyBuffOnHit = { pct: Math.round((0.15 + roll('pb', 3) * 0.05) * 100) / 100, dur: 10 + roll('pbd', 3) * 5 };
      say.push(`When it hits, you and your allies deal ${pct(a.partyBuffOnHit.pct)}% more damage for ${a.partyBuffOnHit.dur} seconds.`);
    } else if (o.k === 'armor') {
      a.ignoreArmor = true;
      say.push('It ignores armour.');
    } else if (o.k === 'resist') {
      a.ignoreResist = true;
      say.push('It ignores resistances.');
    } else {
      a.explodeRadius = Math.max(a.explodeRadius || 0, 96 + roll('brst', 3) * 16);
      a.splashFrac = Math.max(a.splashFrac || 0, 0.8);
      say.push(`It bursts where it lands, hitting every enemy within ${tiles(a.explodeRadius)} for 80% of its damage.`);
    }
  } else if (role === 'execute') {
    a.cooldown = Math.round((EXECUTE_CD[0] + roll('xcd', EXECUTE_CD[1] - EXECUTE_CD[0] + 1)) * 10) / 10;
    delete a.spammable; delete a.spamCostPer;
    const opts = [{ k: 'low' }, { k: 'afflictions' }];
    if (alt) opts.push({ k: 'alt' });
    const o = opts[roll('xopt', opts.length)];
    if (o.k === 'low') {
      a.requiresTargetBelow = Math.round((0.2 + roll('xlow', 3) * 0.05) * 100) / 100;
      if (baseOf() > 0) a.base = Math.max(10, Math.round(a.base * 3));
      say.push(`Can only be used on an enemy at or below ${pct(a.requiresTargetBelow)}% health.`);
    } else if (o.k === 'afflictions') {
      a.consumeAfflictionsPer = Math.round((0.5 + roll('xaff', 3) * 0.1) * 100) / 100;
      if (baseOf() > 0) a.base = Math.max(6, Math.round(a.base * 1.4));
      say.push(`Uses up every affliction you have on the target, and deals ${pct(a.consumeAfflictionsPer)}% more damage for each one.`);
    } else {
      a.consumeAllAlt = alt.per; a.altResKind = alt.key;
      if (baseOf() > 0) a.base = Math.max(6, Math.round(a.base * 1.2));
      say.push(`Spends all your ${alt.name}, and deals ${Math.round(alt.per * 1000) / 10}% more damage for each point spent.`);
    }
  }
  // The figure in the ability's own sentence was written before the role
  // moved it: say the new one ("deals 6 damage" on a 14-damage blow is the
  // card disagreeing with itself).
  if (base0 != null && typeof a.base === 'number') {
    const d = String(a.desc || '');
    const cut = d.search(/\.(\s|$)/);
    const head = cut >= 0 ? d.slice(0, cut + 1) : d;
    const fixed = head.replace(/\b\d+\b(?=\s+(?:[a-z]+\s+)?damage)/, String(a.base));
    a.desc = fixed + d.slice(head.length);
  }
  // Round 220's floor still holds whatever band the role picked: a held
  // effect rests at least twice as long as it holds, on top of holding.
  const held = Math.max(a.duration || 0, a.buffDuration || 0, a.shieldDuration || 0, a.stealthDuration || 0, a.auraDuration || 0);
  if (!a.spammable && held > 0 && typeof a.cooldown === 'number' && a.cooldown < held * 3) a.cooldown = Math.round(held * 3 * 10) / 10;
  if (say.length) a.desc = `${String(a.desc || '').trim()} ${say.join(' ')}`.trim();
  a.roleTags = [...roleTags(a)];
  return a;
}

/** The numbers line's share of a role. */
export function roleStatsFragment(a) {
  if (!a || !a.role) return '';
  const alt = (k) => (ALT_RESOURCES[k] || {}).name || '';
  const out = [];
  if (a.hpCostPct) out.push(`${pct(a.hpCostPct)}% max health`);
  if (a.consumeAffliction) out.push('uses 1 of your afflictions');
  if (a.chargesMax) out.push(`${a.chargesMax} charges, a kill restores 1`);
  if (a.altCost) out.push(`${a.altCost} ${alt(a.altResKind || '')}`.trim());
  if (a.knockback) out.push(`knockback ${tiles(a.knockback)}`);
  if (a.stunOnHit) out.push(`stun ${a.stunOnHit}s`);
  if (a.spreadAfflictions) out.push(`spreads afflictions ${tiles(a.spreadAfflictions)}`);
  if (a.chargeTo) out.push(`rush ${tiles(a.chargeTo)}`);
  if (a.altGain) out.push(`+${a.altGain} ${alt(a.altResKind || '')}`.trim());
  if (a.bossPct) out.push(`+${pct(a.bossPct)}% of a boss's max health`);
  if (a.guaranteedCrit) out.push('always crits');
  if (a.partyBuffOnHit) out.push(`party +${pct(a.partyBuffOnHit.pct)}% damage ${a.partyBuffOnHit.dur}s`);
  if (a.ignoreArmor) out.push('ignores armour');
  if (a.ignoreResist) out.push('ignores resistances');
  if (a.consumeAfflictionsPer) out.push(`+${pct(a.consumeAfflictionsPer)}% per affliction consumed`);
  if (a.consumeAllAlt) out.push(`spends all ${alt(a.altResKind || '')}, +${Math.round(a.consumeAllAlt * 1000) / 10}% each`);
  return out.length ? ` · ${out.join(' · ')}` : '';
}

/** What a role adds to the card's Cost line. */
export function roleCostPhrase(a) {
  if (!a || !a.role) return '';
  const alt = ALT_RESOURCES[a.altResKind || ''];
  if (a.hpCostPct) return ` Also ${pct(a.hpCostPct)}% of your maximum health.`;
  if (a.altCost && alt) return ` Also ${a.altCost} ${alt.name}.`;
  if (a.consumeAllAlt && alt) return ` Also all your ${alt.name}.`;
  if (a.chargesMax) return ` One charge (holds ${a.chargesMax}).`;
  if (a.consumeAffliction) return ' Also one of your afflictions on the target.';
  return '';
}
