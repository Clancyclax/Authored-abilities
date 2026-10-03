// ============================================================================
// ROUND 284 -- WHAT HIS CANON ABILITIES DO, IN NUMBERS.
//
//   "All cannon abilities need to be working in game, add effects as needed"
//   Asked about rungs the game has no system for (flight, falling, global
//   portals, dimensional spaces): "In-game analogues". The TEXT stays exactly
//   his; this file is only the game's side of it -- ranges, amounts, timings,
//   and which analogue stands in for what.
//
// Pure data and pure functions, so a suite can check a number without a
// browser. The scene half is canonRuntimeMixin.js and its two siblings.
// ============================================================================

export const CANON_RANKS = ['iron', 'bronze', 'silver', 'gold'];
export const rankAt = (rank) => Math.max(0, CANON_RANKS.indexOf(rank || 'iron'));
export const reached = (rank, rung) => rankAt(rank) >= rankAt(rung);

/** A canon figure written in hours, played at six to one (round 201's rule:
 *  "1 hour cooldown should become 10 minutes IRL"). Minutes follow the same
 *  ratio, so a ten-minute gate is a hundred seconds. */
export const canonMinutes = (min) => Math.round(min * 60 / 6);

// ---------------------------------------------------------------------------
// MODES. Several of his rungs offer a second way to use one ability -- "by
// increasing the cost to...", "gain an area of effect variant", "a shadow
// gate". Each is a MODE, picked by clicking the small badge on the ability's
// hotbar cell (click only, as the passive bar is). A mode unlocks at the rung
// that names it and carries its own price where the text gives one.
// ---------------------------------------------------------------------------
export const CANON_MODES = {
  feastOfBlood: [
    { id: 'single', label: 'One', from: 'iron' },
    // "Increasing the mana cost to very high and the cooldown to 2 minutes
    //  allows this spell to target all viable targets in a wide area."
    { id: 'wide', label: 'Wide', from: 'silver', cost: { type: 'mana', amount: 40 }, cooldown: 120 },
  ],
  feastOfAbsolution: [
    { id: 'single', label: 'One', from: 'iron' },
    // "Increase cost to moderate to affect all afflicted enemies and allies in a wide area."
    { id: 'wide', label: 'Wide', from: 'silver', cost: { type: 'mana', amount: 14 } },
  ],
  punition: [
    { id: 'moderate', label: 'Mod', from: 'iron', mult: 1 },
    // "Damage per affliction can be increased by increasing the mana cost to
    //  high, very high, or extreme. This reduces the cooldown to 20 seconds,
    //  10 seconds or none."
    { id: 'high', label: 'High', from: 'silver', mult: 1.6, cost: { type: 'mana', amount: 24 }, cooldown: 20 },
    { id: 'veryHigh', label: 'V.High', from: 'silver', mult: 2.3, cost: { type: 'mana', amount: 40 }, cooldown: 10 },
    { id: 'extreme', label: 'Extr', from: 'silver', mult: 3.2, cost: { type: 'mana', amount: 64 }, cooldown: 0, truncates: true },
    // "Gain area of effect variant with increased mana cost and cooldown.
    //  Cooldown cannot be reduced."
    { id: 'area', label: 'Area', from: 'gold', mult: 1, area: 200, cost: { type: 'mana', amount: 40 }, cooldown: 45, fixedCooldown: true },
  ],
  verdict: [
    { id: 'sentence', label: 'One', from: 'iron' },
    // "Can be used as a wide area ongoing effect with less immediate damage."
    { id: 'standing', label: 'Area', from: 'gold', cost: { type: 'mana', amount: 24 }, cooldown: 30 },
  ],
  pathOfShadows: [
    // "a special ability with a low mana cost and no cooldown"
    { id: 'step', label: 'Step', from: 'iron', cost: { type: 'mana', amount: 6 }, cooldown: 0 },
    // "a conjuration with a very high mana cost and a 10-minute cooldown"
    { id: 'gate', label: 'Gate', from: 'bronze', cost: { type: 'mana', amount: 40 }, cooldown: canonMinutes(10), cdKey: 'gate' },
    // "double the range ... a one-hour cooldown and also incurs the
    //  10-minute cooldown of the bronze-rank shadow gate ability"
    { id: 'longGate', label: 'Long', from: 'silver', cost: { type: 'mana', amount: 40 }, cooldown: canonMinutes(60), cdKey: 'longGate', alsoIncurs: 'gate' },
    // "Create portals across global distances."
    { id: 'globalGate', label: 'World', from: 'gold', cost: { type: 'mana', amount: 64 }, cooldown: canonMinutes(60), cdKey: 'longGate', alsoIncurs: 'gate' },
  ],
  cloakOfNight: [
    { id: 'light', label: 'Light', from: 'iron' },
    { id: 'shadow', label: 'Shade', from: 'iron' },
    { id: 'lighten', label: 'Float', from: 'iron' },
    { id: 'glide', label: 'Glide', from: 'bronze' },
    { id: 'flight', label: 'Fly', from: 'silver' },
    { id: 'void', label: 'Void', from: 'gold' },
  ],
  immortality: [
    { id: 'restore', label: 'Life', from: 'iron' },
    // "Gain a long cooldown purgation ability" -- its own cooldown, beside
    // Immortality's rather than sharing it.
    { id: 'purge', label: 'Purge', from: 'silver', cooldown: canonMinutes(60) * 1, cdKey: 'purge', cost: null },
  ],
  bladeOfDoom: [
    { id: 'ruin', label: 'Ruin', from: 'iron' },
    // "Blade gains a second form: [Penitent, the Blade of Sacrifice]."
    { id: 'penitent', label: 'Penit', from: 'silver' },
  ],
};

/** The modes this ability has unlocked at this rank. */
export function modesAt(canonKey, rank) {
  return (CANON_MODES[canonKey] || []).filter(m => reached(rank, m.from));
}
/** The mode in use: the one chosen if it is unlocked, else the first. */
export function modeFor(canonKey, rank, chosen) {
  const list = modesAt(canonKey, rank);
  if (!list.length) return null;
  return list.find(m => m.id === chosen) || list[0];
}
/** The next unlocked mode after this one, for the badge click. */
export function nextMode(canonKey, rank, chosen) {
  const list = modesAt(canonKey, rank);
  if (!list.length) return null;
  const i = list.findIndex(m => m.id === chosen);
  return list[(i + 1) % list.length];
}

// ---------------------------------------------------------------------------
// THE NUMBERS. One block per ability, in the order of his pastes.
// ---------------------------------------------------------------------------
export const CANON_RT = {
  // Renewal -------------------------------------------------------------------
  lifeBolt: { range: 320, heal: 12, undeadDmg: 14, hotPerSec: 2, hotSecs: 5, speed: 300 },

  // Growth --------------------------------------------------------------------
  herosMoment: { range: 320, buffSecs: 30 },
  verdantCage: { range: 300, rootSecs: 3.5, plantBonus: 1.5, thornDmg: 3 },

  // Shield / Magic ------------------------------------------------------------
  reapersRedoubt: { radius: 220, phaseSecs: 3, disruptive: 18, necrotic: 18, creeping: 2, manaFrac: 0.45 },
  crystalliseMana: { regenPerSec: 3, burstMana: 20, inactiveSeconds: 4, convertPerSec: 6 },
  burstShield: { shieldSecs: 6, radius: 130, knockback: 90, dmg: 14, silverPassFrac: 0.5 },

  // Wing -----------------------------------------------------------------------
  razorWingSword: { moveBonus: 0.3, heavySpecialCut: 0.5, feathers: 3, featherDmg: 5, featherCost: 4, interceptChance: 0.4 },
  flyingLeap: { dist: 170, window: 1.2 },
  dragonWingSword: { baseMult: 1.6, movementSpecialBonus: 0.5 },
  dragonWings: { speed: 0.2, drainIron: 6, drainBronze: 4, rearDR: 0.3, fireDR: 0.6, buffetEvery: 2, buffetDmg: 6, buffetReach: 80 },
  diveBomb: { range: 280, window: 1.2, physical: 0.5, any: 0.4, shockRadius: 110, shockDmg: 10, pathDmg: 6 },

  // Might ----------------------------------------------------------------------
  immortality: { restoreShare: 0.6, ongoingSecs: 8, ongoingShare: 0.3, reviveFrac: 1 },
  relentlessAssault: {},
  unstoppableForce: { bonusDmg: 18, knockback: 120, blastRadius: 110, blastDmg: 10 },

  // Dark -----------------------------------------------------------------------
  cloakOfNight: {
    armor: 0.04,
    drain: { light: 0, shadow: 0, lighten: 1, glide: 1.5, flight: 2, flightSun: 4, void: 12 },
    interceptWeak: 0.6, interceptStrong: 0.15, weakFrac: 0.1,
    deflect: 0.12, confuseSecs: 2, shadowSense: 0.4, glideSpeed: 0.15,
  },
  pathOfShadows: { stepIron: 240, stepBronze: 320, capacity: { iron: 0, bronze: 1, silver: 2, gold: 6 } },
  handOfTheReaper: { drain: 3, reach: 0.5, extraTargets: { iron: 0, bronze: 1, silver: 1, gold: 5 }, freeArms: { iron: 0, bronze: 0, silver: 2, gold: 4 }, armDmg: 5, armReach: 120 },

  // Blood ----------------------------------------------------------------------
  bloodHarvest: { reach: 200, wide: 280, restore: 0.06, rankBonus: 0.25 },
  leechBite: { drainHp: 0.04, drainStamina: 0.05 },
  feastOfBlood: { range: 300, base: 12, staminaShare: 0.5, perPoison: 0.3, wide: 240 },
  sanguineHorror: {
    healthCostFrac: 0.3, hpFrac: 0.6, dmg: 6, interval: 1.1, drainShare: 0.5,
    subsumedRegen: 0.006, rankMult: { iron: 1, bronze: 1.5, silver: 2, gold: 2.5 },
    gripEvery: 4, gripRange: 200, gripRoot: 1.2, gripDrainPerSec: 1.5,
    massCap: 1.5, massDecay: 0.02,
  },

  // Sin ------------------------------------------------------------------------
  punish: { bonus: 10, penanceHoldSecs: 4 },
  feastOfAbsolution: { range: 300, perCleansed: 0.06, wide: 260 },
  sinEater: { resist: 0.1, perResistant: 0.04, overCap: 1.3, overDecay: 0.02, consumeEvery: 2.5 },
  hegemony: { allyResist: 0.15, enemyDur: 0.2, perSin: 0.05, silverRadius: 1.5 },
  castigate: { range: 320, dmg: 6, markCleanseResist: 0.5 },

  // Doom -----------------------------------------------------------------------
  inexorableDoom: { range: 320, goldDeepenEvery: 2 },
  punition: { range: 320, perAffliction: 6 },
  bladeOfDoom: { woundMult: 1.5, perLegacy: 3 },
  verdict: { range: 340, base: 6, curve: 3, perPenance: 2, standingRadius: 200, standingSecs: 8, standingFrac: 0.35 },
  avatarOfDoom: {
    hpFrac: 0.8, orbs: { iron: 2, bronze: 4, silver: 6, gold: 6 },
    beamEvery: 1, beamRange: 220, beamDmg: 3, vulnEveryTicks: 3,
    dashEvery: 6, dashDmg: 8, orbIdleSecs: 0.8,
    subsumedSense: 0.3, orbDiveEvery: 10, orbRespawn: 8, shieldFrac: 0.15, shieldEvery: 20,
    butterflyAbsorbBonus: 0.05, butterflyAbsorbCap: 0.5,
    materials: [
      { quint: 'quintLight', count: 108, label: 'Radiant Quintessence Gems (Iron)' },
      { quint: 'quintVoid', count: 108, label: 'Void Quintessence Gems (Iron)' },
    ],
    coins: { rank: 'iron', count: 1296 },
  },
};

// ---------------------------------------------------------------------------
// PURE HELPERS
// ---------------------------------------------------------------------------

/** "As an execute effect, damage scales exponentially with the enemy's level
 *  of injury." e^(curve x injury), with [Legacy of Sin] adding to the curve:
 *  "Scaling is affected by [Legacy of Sin] in the same way execute damage is." */
export function executeScale(hp, maxHp, curve, legacyAmp = 0) {
  const injury = Math.max(0, Math.min(1, 1 - (hp / Math.max(1, maxHp))));
  return Math.exp(curve * (1 + legacyAmp) * injury);
}

/** What Immortality restores: a share of what is MISSING, so "based on how
 *  depleted health, mana, and stamina are". */
export function depletionRestore(cur, max, share) {
  return Math.max(0, (max - cur) * share);
}

/** The environment's poison for Verdant Cage's silver thorns: "The type of
 *  poison is determined by the surrounding environment." */
export function environmentPoison(biome) {
  const b = String(biome || '').toLowerCase();
  if (/swamp|marsh|bog|jungle/.test(b)) return 'necrotoxin';
  if (/desert|sand|dune|ash|volcan/.test(b)) return 'taintedMeridians';
  return 'poison';
}

/** Does this biome count as "areas already containing plant life"? */
export function isPlantLife(biome) {
  return /forest|wood|jungle|grass|meadow|swamp|marsh|plain|field|garden|farm/i.test(String(biome || ''));
}

// ===========================================================================
// ROUND 287 -- HIS THIRD PASTE, IN NUMBERS (the first half: everything but the
// movement essences, which are round 288's). Same rule as above: the text is
// his, these are only the game's side of it.
// ===========================================================================
Object.assign(CANON_MODES, {
  // "Familiar can be subsumed into the caster's eyes ... consume mana to make
  //  disruptive-force beam attacks from her eyes." "Summoner can use mana to
  //  restore core energy."
  astralLantern: [
    { id: 'lantern', label: 'Lamp', from: 'iron' },
    { id: 'beam', label: 'Beam', from: 'iron', cost: { type: 'mana', amount: 8 }, cooldown: 0 },
    { id: 'refill', label: 'Core', from: 'iron', cost: { type: 'mana', amount: 12 }, cooldown: 0 },
  ],
  // "Expend additional mana to alter the target's reality, using any
  //  combination of the available colour effects" -- one colour per cast, and
  //  they add up on the target. The second variant "requires an alternate
  //  incantation": the Void mode. Bronze: the ritual circle, "very high mana
  //  cost and a one hour cooldown".
  wrathOfTheMagister: [
    { id: 'red', label: 'Red', from: 'iron', cost: { type: 'mana', amount: 24 }, cooldown: 2 },
    { id: 'yellow', label: 'Yel', from: 'iron', cost: { type: 'mana', amount: 24 }, cooldown: 2 },
    { id: 'pink', label: 'Pink', from: 'iron', cost: { type: 'mana', amount: 12 }, cooldown: 2 },
    { id: 'green', label: 'Grn', from: 'iron', cost: { type: 'mana', amount: 12 }, cooldown: 2 },
    { id: 'purple', label: 'Purp', from: 'iron', cost: { type: 'mana', amount: 40 }, cooldown: 2 },
    { id: 'orange', label: 'Orng', from: 'iron', cost: { type: 'mana', amount: 40 }, cooldown: 2 },
    { id: 'blue', label: 'Blue', from: 'iron', cost: { type: 'mana', amount: 24 }, cooldown: 2 },
    { id: 'void', label: 'Void', from: 'iron', cost: { type: 'mana', amount: 12 }, cooldown: 20 },
    { id: 'circle', label: 'Circ', from: 'bronze', cost: { type: 'mana', amount: 40 }, cooldown: canonMinutes(60), cdKey: 'magisterCircle' },
  ],
  // Iron uses the tools (held); bronze "Use a ritual circle to enhance the
  // magical attack of a staff or wand. This variant requires high mana."
  toolsOfTheMagister: [
    { id: 'tools', label: 'Tools', from: 'iron' },
    { id: 'circle', label: 'Circ', from: 'bronze', cost: { type: 'mana', amount: 24 }, cooldown: 0 },
  ],
  // Power Thief: steal, then use what was stolen. The second is picked for
  // you when there is something to use; it answers to no clock of its own.
  powerThief: [
    { id: 'steal', label: 'Steal', from: 'iron', cooldown: 300, cdKey: 'powerThief' },
    { id: 'use', label: 'Use', from: 'iron', cost: null, cooldown: 0, cdKey: 'powerThiefUse', auto: true },
  ],
  // Blood Magic: "Consume your own life force to gain mana" (iron); rituals
  // (bronze); spells (silver).
  bloodMagic: [
    { id: 'mana', label: 'Mana', from: 'iron' },
    { id: 'ritual', label: 'Rite', from: 'bronze' },
    { id: 'spell', label: 'Spell', from: 'silver' },
  ],
  // Bag of Tricks: the storage space (iron); the weapon's special attack
  // (silver, "Weapons you equip grant you a special attack").
  bagOfTricks: [
    { id: 'bag', label: 'Bag', from: 'iron' },
    { id: 'trick', label: 'Strike', from: 'silver', cost: { type: 'stamina', amount: 12 }, cooldown: 8, cdKey: 'bagTrick' },
  ],
  // Rune Trap: "can be set to trigger by proximity, caster trigger, or both."
  runeTrap: [
    { id: 'both', label: 'Both', from: 'iron' },
    { id: 'prox', label: 'Prox', from: 'iron' },
    { id: 'cast', label: 'Cast', from: 'iron' },
  ],
  // Rune Mantle bronze: "Increasing the cost to moderate mana allows the rune
  // mantle to be bestowed on all nearby allies."
  runeMantle: [
    { id: 'one', label: 'One', from: 'iron' },
    { id: 'all', label: 'All', from: 'bronze', cost: { type: 'mana', amount: 12 } },
  ],
  // Rune Gate: storage (iron), group teleportation (bronze).
  runeGate: [
    { id: 'store', label: 'Store', from: 'iron' },
    { id: 'gate', label: 'Gate', from: 'bronze' },
  ],
  // Enact Ritual: diagrams (iron), altering an item (bronze), mana lamps (silver).
  enactRitual: [
    { id: 'draw', label: 'Draw', from: 'iron' },
    { id: 'alter', label: 'Alter', from: 'bronze', cost: { type: 'mana', amount: 24 }, cooldown: 60, cdKey: 'enactAlter' },
    { id: 'lamp', label: 'Lamp', from: 'silver', cost: { type: 'mana', amount: 12 }, cooldown: 0 },
  ],
});

Object.assign(CANON_RT, {
  // Adept -----------------------------------------------------------------------
  blessingOfRelentlessness: { range: 320, maxAllyRank: 1, regenSecs: 60, manaPerSec: 3, staminaPerSec: 3 },
  masterful: { radius: 180, rate: 0.25 },
  blessingOfReadiness: { range: 320, capIron: 60, capBronze: 600, floor: 5, window: 120 },
  instantAdept: { strikeEvery: 4, strikeMult: 0.5 },

  // Magic -----------------------------------------------------------------------
  astralLantern: {
    coreMax: 100, coreRegen: 3, zapCost: 6, zapDmg: 5, zapRange: 200, zapEvery: 1.4,
    revealRadius: 220, interceptRadius: 90, interceptPer: 1.5, refill: 40, beamDmg: 9, beamRange: 280,
  },
  powerThief: { range: 340, dmg: 8, keepSecs: 14400, useDmg: 14 },
  powerLock: { range: 320, secs: 30, disruptFrac: 0.5 },
  wrathOfTheMagister: {
    range: 340, secs: 12, burnStacks: 2, poisonStacks: 2, frostBurn: 16, purpleFrac: 0.35,
    orangeTaken: 0.25, voidPerSec: 16, voidNeed: 64, voidDmg: 70, circleSecs: 30, circleRadius: 110, circleBonus: 0.3,
  },
  lordOfMagic: { radius: 180, manaPerSec: 1.2, drainResist: 0.5 },
  toolsOfTheMagister: { circleSecs: 30, circleRadius: 110, circleBonus: 0.3 },
  eldritchEyes: { revealRadius: 200 },
  spiritReaper: { bonus: 7, manaDrain: 4, etherealMult: 2, stunSecs: 1 },

  // Mirror / Dimension -------------------------------------------------------------
  mirrorMagic: { window: 8, allyRange: 320, range: 340 },
  bagOfTricks: { strikeMult: 1.3 },
  juxtapose: { range: 400, secondRange: 400, vulnSecs: 5, vulnTaken: 0.2, resistedCd: 30 },

  // Trap -------------------------------------------------------------------------
  lightningTether: {
    reach: 160, chainHop: 130, perSec: 1, perLen: 1 / 40, burst: 18, burstReach: 260,
    links: { iron: 1, bronze: 3, silver: 7, gold: 7 }, shortTether: 70, boltEvery: 1.5, boltDmg: 6, boltReach: 220,
  },
  forceTether: {
    reach: 200, pull: 30, pullBronze: 55, fieldRadius: 30, fieldDmg: 6, fieldHp: 90, rupture: 16, ruptureRadius: 130,
    removed: 14, removedRadius: 140, drainPerSec: 2, againstPerUnit: 0.05,
  },
  pitOfTheReaper: { range: 260, radius: 60, dps: 5, selfDps: 3, slow: 0.7, dragReach: 170, drag: 40, maxSecs: 90 },

  // Rune -------------------------------------------------------------------------
  runeTrap: { secs: 20, trigger: 40, radius: 90, dmg: 20, secondaryAfter: 1.5, secondaryFrac: 0.6, secondaryRadius: 70 },
  runeMantle: { range: 320, secs: 30, runes: 5, mend: 0.08, spark: 10, bindSecs: 1, hasteSecs: 3, allRange: 220 },
  enactRitual: { alterSecs: 600, alterBonus: 0.1, lampMax: 50, lampRate: 1, lampToRitual: 0.01 },

  // Shield ------------------------------------------------------------------------
  absorbingShield: { range: 320, secs: 6, motSecs: 5, motShare: 0.4, goldPass: 0.3, drainShare: 0.3 },
  manaShield: { perPoint: 1, perPointBronze: 0.6 },

  // Growth -----------------------------------------------------------------------
  bolster: { range: 320, mult: 1.5 },
  chrysalisGolem: { chrysalisSecs: 8, chrysalisSilver: 4, hp: 1.2, dmg: 7, spikeEvery: 1.6, spikeDmg: 4, spikeRange: 200, absorbRadius: 160, secs: 600 },
  giantsMight: { range: 320, secs: 120, scale: 1.3, allyDmg: 1.4 },

  // Renewal ------------------------------------------------------------------------
  fountainOfLife: { secs: 12, radius: 110, perSec: 2 },
  grandRenewal: { range: 320, channel: 4, channelBronze: 2, healFrac: 0.6, splitRadius: 150 },

  // Blood --------------------------------------------------------------------------
  bloodMagic: { hpFrac: 0.1, manaPerHp: 1.2, ritualHpFrac: 0.15, ritualMult: 1.5, spellHpFrac: 0.1, spellMult: 1.35, spellSecs: 6 },

  // Might / Dragon -----------------------------------------------------------------
  shieldBreaker: { bonus: 10, rigidMult: 1.8 },
  dragonsMightAura: { radius: 190, dragonFire: 1.2 },
  spartoi: { count: { iron: 3, bronze: 5, silver: 8, gold: 8 }, hp: 0.5, dmg: 5, secs: 600 },
});

// ===========================================================================
// ROUND 288 -- THE MOVEMENT HALF OF HIS THIRD PASTE: Swift, Wind, Balance,
// Mystic. Verticality was built in round 286 so gliding and flying would
// finally matter; these are the abilities that use it.
// ===========================================================================
Object.assign(CANON_MODES, {
  // Leaf on the Wind: glide (iron); silver "Fly for moderate mana-per-second".
  leafOnTheWind: [
    { id: 'glide', label: 'Glide', from: 'iron' },
    { id: 'fly', label: 'Fly', from: 'silver' },
  ],
  // Wind Wave silver: "For a high mana cost, create a wave of wind ... in a
  // circle from the ability user."
  windWave: [
    { id: 'blast', label: 'Blast', from: 'iron' },
    { id: 'wave', label: 'Wave', from: 'silver', cost: { type: 'mana', amount: 24 } },
  ],
  // Cloud Step bronze: "a short-lived mist can be produced at a low mana cost".
  cloudStep: [
    { id: 'step', label: 'Step', from: 'iron', cdKey: 'cloudStep', cooldown: 0 },
    { id: 'mist', label: 'Mist', from: 'bronze', cost: { type: 'mana', amount: 6 }, cooldown: 0, cdKey: 'cloudMist' },
  ],
  // Mirage Step: its uses are its own clock.
  mirageStep: [
    { id: 'step', label: 'Step', from: 'iron', cdKey: 'mirageStep', cooldown: 0 },
  ],
  // Eldritch Imbalance silver: "an alternate version of the spell that is
  // instantaneous instead of channeled".
  eldritchImbalance: [
    { id: 'channel', label: 'Chan', from: 'iron' },
    { id: 'instant', label: 'Inst', from: 'silver' },
  ],
});

Object.assign(CANON_RT, {
  // Swift ----------------------------------------------------------------------
  freeRunner: { speed: 0.1, drainMana: 1.5, drainStamina: 1.5, fallAfter: 0.6, runUp: 2, runGrace: 0.25, streaksPerSec: 40, knockResist: 0.4, senseRadius: 140, glideSpeed: 0.15 },
  avatarOfSpeed: { effect: 0.25, costCut: 0.25, momentumEvery: 1.2, fastSpeed: 60, momentumDmg: 3, momentumLoseEvery: 0.4 },
  betweenTheRaindrops: { dodge: 0.1, dodgeSilver: 0.15, erraticSpeed: 0.15, straightSpeed: 0.05, erraticWindow: 0.5, drainMana: 3, drainStamina: 3 },
  alacritysReward: { every: 4, spiritPer: 10, base: 3, cap: 10, negatePer: 5 },
  eternalMoment: { secs: { iron: 1, bronze: 2, silver: 3, gold: 3 }, scale: 0.15, drain: 64 },
  // Wind -----------------------------------------------------------------------
  windBlade: { range: 360, dmg: 7, speed: 360, ringRadius: 70, ringFrac: 0.6, disruptive: 3 },
  cleansingBreeze: { radius: 180, resist: 0.25, cleanseEvery: 3, regenBoost: 0.25 },
  leafOnTheWind: { drainIron: 3, drainBronze: 1.5, drainFly: 3, speed: 0.1, flySpeed: 0.2, carryRadius: 220, carryMana: 0.5, carrySlow: 0.08, deflect: 0.2, highRegen: 0.5 },
  windWave: { cone: 150, arc: 0.9, push: 90, hop: 110, airDash: 120, waveRadius: 190, wavePush: 180, dropMult: 0.5 },
  childOfTheCelestialWind: { disruptiveDR: 0.25, windBonus: 0.25, windDisruptive: 3, capBonus: 2, resist: 0.2 },
  // Balance --------------------------------------------------------------------
  equilibrium: { every: 3, base: 2, recoveryPer: 8, cap: 8, dropEvery: 1 },
  cloudStep: { dist: 80, intangible: 0.4, intangibleMist: 0.8, charges: { iron: 1, bronze: 2, silver: 3, gold: 3 }, recharge: 15, onCdExtreme: 64, onCdSilver: 40, reduceAfter: 1.5, reduce: 0.5, mistSecs: 8, mistSilver: 16, mistRadius: 70, mistSilverRadius: 110 },
  momentOfOneness: { immune: 1, window: 4 },
  karmicWarrior: { goodDR: 0.03, badDmg: 3, sacrificeHeal: 0.004, silverCdPerGood: 1 },
  denyTheReaper: { range: 300, dmg: 5, heal: 5, curve: 3 },
  manaTide: { secs: 60, base: 0.5, perSec: 0.1, cap: 6, spendShare: 0.02, silverMult: 0.15, radius: 220 },
  eldritchImbalance: { range: 300, drain: 4, imbalanceEvery: 2, perImbalance: 0.2, instantDmg: 6, instantCurve: 2.5 },
  // Mystic ---------------------------------------------------------------------
  strongSoul: { disruptiveDR: 0.4, otherDR: 0.08, resist: 0.25, perHoly: 0.02, holyCap: 0.2 },
  sightBeyondSight: { auraSense: 0.3, revealRadius: 160 },
  immortalFist: { bonus: 4, intercept: 0.35, window: 0.6, comboEvery: 1.2, comboPer: 0.1, comboCap: 0.5 },
  radiantFist: { bonus: 4, intercept: 0.3, window: 0.6, manaOnCatch: 6, boltDmg: 6 },
  mirageStep: { dist: 130, charges: { iron: 1, bronze: 2, silver: 3, gold: 3 }, recharge: { iron: 40, bronze: 35, silver: 30, gold: 30 }, imageSecs: 4, trapSecs: 2, bladeEvery: 1, bladeDmg: 4, bladeReach: 200 },
});
