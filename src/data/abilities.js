import { ESSENCE_CATALOG } from './essenceCatalog.js';
// A small slice of the essence/ability system, ported from ESSENCE_DEFS +
// TEMPLATES (sparkstone_prototype.html lines ~934-1433, 1460-1594). The
// original has ~18 ability templates (melee/projectile/aoe/buff/heal/shield/
// hot/power/zone/summon/decoy/teleport/dash/leap/...) and 100+ essence rows;
// this port wires up 4 templates end-to-end (meleeSwing -- see weapons.js --
// projectileBall, selfPower, selfCritBuff) plus a light selfHeal, enough to
// prove the hotbar/cooldown/template-dispatch pattern works for more than
// just melee. Everything else (shields, HoTs, zones, summons, decoys,
// teleports, dashes) is real in the original and not ported this round.
//
// `fire` below is a verbatim ESSENCE_DEFS row (line ~1467). `might` and
// `heal` are NOT verbatim -- I couldn't pull their exact original rows this
// round, so these are reasonable approximations using the *real* template
// mechanics/fallback defaults (documented in TEMPLATES.selfPower/selfHeal),
// just with invented specific numbers. Flagged rather than presented as
// exact.
//
// `shadow` and `avatar` are NEW this round (critical hits). The original
// prototype's own ESSENCE_DEFS has a real `avatar` row (Epic, no status/
// knockback/stun/lifesteal/block -- exactly the "Neutral" crit-eligible
// shape the source's own isNeutralRankTrack() checks for) but no `shadow`
// row at all -- confirmed via a direct grep of the source, which even has a
// comment floating the idea of "a shadow/void essence" as a future addition
// that was never actually written. So `avatar` below is essence-identity-
// faithful (real id, real "Neutral" flavor, Epic-tier feel); `shadow` is a
// new essence built to match the user's own example ("shadow ability
// increasing critical hit damage for the ability") since no original row
// exists to port. critChanceBonus/critDamageBonus/selfCritDamageBonus etc.
// stack on top of the base crit chance/multiplier defined in
// src/data/combat.js -- see WorldScene.js's _playerCritStats/_castAbility.
const TUNED_ESSENCES = {
  fire: {
    id: 'fire', name: 'Fire', template: 'projectileBall', color: '#ff7043',
    base: 7, cooldown: 0.7, speed: 260, radius: 7, status: 'burn',
    critChanceBonus: 0.05,
    dot: { dmgPerTick: 3, ticks: 4, tickMs: 800, critChance: 0.12, label: 'Burn' },
  },
  // APPROXIMATED (not a verbatim source row -- see header note).
  // ROUND 6 retune per "active ability buffs... should be powerful but
  // relatively short lived increases": +35% damage for 30s on a 5-minute
  // cooldown (was +35% for 6s on an 8s cooldown -- a spammable trickle).
  might: {
    id: 'might', name: 'Might', template: 'selfPower', color: '#ffab40',
    cooldown: 300, powerMult: 1.35, sizeMult: 1.1, buffDuration: 30,
  },
  // APPROXIMATED (not a verbatim source row -- see header note). critChance/
  // critHealMult are new this round: a "critical heal" restores extra HP,
  // using the same 1.5x base crit multiplier as damage so the stat reads
  // consistently everywhere rather than inventing a separate heal-crit figure.
  // ROUND 6 rename: 'Heal' -> 'Renewal', a REAL essence from the user's
  // HWFWM_TTRPG.xlsx Essences sheet (Epic rarity there; the user's own
  // correction referenced "the Renewal Essence" by name). Internal id stays
  // 'heal' so nothing save/loot/cast-related shifts.
  heal: {
    id: 'heal', name: 'Renewal', template: 'selfHeal', color: '#66bb6a',
    cooldown: 10, healAmount: 16, critChance: 0.15,
  },
  // NEW. Self-only crit-damage specialist: a middling base hit that gets
  // devastating on a crit (see combat.js's CRIT_BASE_MULT this stacks onto),
  // plus a guaranteed-crit "execute" condition on low-HP targets -- the
  // user's own example of "guaranteeing crits if certain conditions are
  // met." executeThreshold is read in WorldScene._updateProjectiles.
  // ROUND 6 rename: 'Shadow Strike' -> 'Dark', a REAL essence from the
  // sheet (Uncommon rarity there). Mechanics unchanged; internal id stays
  // 'shadow'.
  shadow: {
    id: 'shadow', name: 'Dark', template: 'projectileBall', color: '#7e57c2',
    base: 6, cooldown: 1.3, speed: 300, radius: 6,
    critChanceBonus: 0, critDamageBonus: 0.9, executeThreshold: 0.25,
  },
  // NEW. A real ESSENCE_DEFS id (see header note) repurposed as this port's
  // "boost crit chance overall" example -- a timed buff affecting every
  // subsequent hit (melee AND other abilities) while it's up, mirroring how
  // `might` buffs power overall rather than one hit.
  // ROUND 6 retune, same powerful/short/long-cooldown pattern as Might.
  avatar: {
    // ROUND 78 -- renamed with its essence. This is one of the five hand-tuned
    // starter abilities and it takes its name from the essence that grants it,
    // so leaving it as "Avatar" would have put an Avatar ability on an Aspect
    // essence -- the two halves of the starter kit disagreeing in the one place
    // a new player looks first. The id is untouched, so STARTER_ESSENCES and
    // ABILITY_HOTBAR_ORDER need no change at all.
    id: 'avatar', name: 'Aspect', template: 'selfCritBuff', color: '#4fc3f7',
    cooldown: 240, critChanceBonus: 0.25, buffDuration: 20,
  },
};


// ROUND 17 -- the five above are hand-tuned and stay exactly as they were.
// Every OTHER essence in the 146-strong catalog (essenceCatalog.js, pulled
// from the HWFWM "Essences" tab) gets its cast mechanics derived from its
// FAMILY, using the same 28-family taxonomy the stones use. This is the
// fallback shape only: since round 16 an essence's actual granted ability
// is drawn from its signature pool, so what matters here is (a) the colour
// and name the UI reads, (b) the `base`/`cooldown` the generator folds into
// every ability it produces on that slot, and (c) the numbers
// confluenceDefFor averages when three essences form a confluence.
const FAMILY_CAST = {
  blade:      { template: 'projectileBall', base: 8, cooldown: 1.0, speed: 300, radius: 6 },
  bludgeon:   { template: 'projectileBall', base: 10, cooldown: 1.6, speed: 240, radius: 9 },
  polearm:    { template: 'projectileBall', base: 9, cooldown: 1.2, speed: 320, radius: 6 },
  ranged:     { template: 'projectileBall', base: 7, cooldown: 0.9, speed: 360, radius: 5 },
  guard:      { template: 'selfPower', cooldown: 300, powerMult: 1.30, buffDuration: 30 },
  beast:      { template: 'selfPower', cooldown: 300, powerMult: 1.32, buffDuration: 30 },
  smallbeast: { template: 'projectileBall', base: 6, cooldown: 0.8, speed: 340, radius: 5 },
  flyer:      { template: 'projectileBall', base: 6, cooldown: 0.9, speed: 380, radius: 5 },
  aquatic:    { template: 'selfHeal', cooldown: 11, healAmount: 15, critChance: 0.12 },
  serpent:    { template: 'projectileBall', base: 6, cooldown: 1.2, speed: 300, radius: 6,
                dot: { dmgPerTick: 3, ticks: 4, tickMs: 800, critChance: 0.1, label: 'Venom' } },
  fire:       { template: 'projectileBall', base: 7, cooldown: 0.9, speed: 280, radius: 7,
                dot: { dmgPerTick: 3, ticks: 4, tickMs: 800, critChance: 0.12, label: 'Burn' } },
  water:      { template: 'selfHeal', cooldown: 10, healAmount: 16, critChance: 0.14 },
  air:        { template: 'movementHaste', cooldown: 10, speedMult: 1.35, buffDuration: 5 },
  earth:      { template: 'absorbShield', cooldown: 12, shieldAmount: 22, shieldDuration: 6 },
  cold:       { template: 'projectileBall', base: 7, cooldown: 1.3, speed: 260, radius: 7,
                dot: { dmgPerTick: 2, ticks: 5, tickMs: 800, critChance: 0.1, label: 'Frostbite' } },
  storm:      { template: 'projectileBall', base: 9, cooldown: 1.1, speed: 400, radius: 6,
                dot: { dmgPerTick: 3, ticks: 3, tickMs: 700, critChance: 0.14, label: 'Shock' } },
  light:      { template: 'selfHeal', cooldown: 10, healAmount: 17, critChance: 0.15 },
  dark:       { template: 'projectileBall', base: 6, cooldown: 1.3, speed: 300, radius: 6,
                critDamageBonus: 0.9, executeThreshold: 0.25 },
  life:       { template: 'selfHot', cooldown: 12, hotPerSec: 4, hotDuration: 6 },
  death:      { template: 'projectileBall', base: 7, cooldown: 1.4, speed: 270, radius: 7,
                dot: { dmgPerTick: 3, ticks: 5, tickMs: 900, critChance: 0.1, label: 'Decay' } },
  blood:      { template: 'projectileBall', base: 8, cooldown: 1.2, speed: 300, radius: 6,
                dot: { dmgPerTick: 4, ticks: 3, tickMs: 700, critChance: 0.15, label: 'Bleed' } },
  mind:       { template: 'selfCritBuff', cooldown: 240, critChanceBonus: 0.25, buffDuration: 20 },
  motion:     { template: 'movementHaste', cooldown: 9, speedMult: 1.40, buffDuration: 5 },
  force:      { template: 'selfPower', cooldown: 300, powerMult: 1.35, buffDuration: 30 },
  order:      { template: 'absorbShield', cooldown: 11, shieldAmount: 20, shieldDuration: 6 },
  craft:      { template: 'absorbShield', cooldown: 12, shieldAmount: 18, shieldDuration: 6 },
  space:      { template: 'teleport', cooldown: 7, teleportRange: 200 },
  identity:   { template: 'selfCritBuff', cooldown: 240, critChanceBonus: 0.26, buffDuration: 20 },
};

// ROUND 48 -- the five TUNED_ESSENCES were the only rows in the whole 146-strong
// catalog with no `family` and no `phrase`, because they predate the catalog and
// were returned verbatim rather than merged with it. Measured cost of that: the
// awakening generator reads `essDef.family` to find the stone/essence material
// and `essDef.phrase` for flavour, so Fire, Might, Renewal, Dark and Avatar --
// the five essences a new player actually starts with -- were the five that fell
// through to the 'raw essence' fallback. The catalog fields go on FIRST so the
// tuned row still wins every key it defines (id, name, colour, cast mechanics).
export const ESSENCES = Object.fromEntries(Object.entries(ESSENCE_CATALOG).map(([id, e]) => {
  if (TUNED_ESSENCES[id]) {
    return [id, {
      rarity: e.rarity, family: e.family, phrase: e.phrase, desc: e.desc,
      ...TUNED_ESSENCES[id],
    }];
  }
  const cast = FAMILY_CAST[e.family] || FAMILY_CAST.blade;
  return [id, {
    id, name: e.name, color: e.color, rarity: e.rarity, family: e.family,
    phrase: e.phrase, desc: e.desc, ...cast,
  }];
}));

// Kept for the round-4 "first five essences drop in order" starter path.
export const STARTER_ESSENCES = ['fire', 'might', 'heal', 'shadow', 'avatar'];

export const ABILITY_HOTBAR_ORDER = ['fire', 'might', 'heal', 'shadow', 'avatar'];
