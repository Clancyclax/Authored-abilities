// ============================================================================
// ROUND 287 -- THE MACHINE SIDE OF HIS THIRD PASTE (batch03.txt).
//
//   "Missing cannon abilities (save this time)"
//   "Cannon abilities are EXACT they are not to be modified without direct
//    approval to do so."
//
// The CARD for every one of these is his text, word for word (canonText.js).
// What lives here is only what the game needs to run it: the price it takes,
// the clock it starts, whether it is cast or held, and what shape the hotbar
// draws. Cost words map to the game's bands (abilityCanon.js COST_BANDS):
// Low 6, Moderate 12-14, High 24, Very high 40, Extreme 64. Hours are played
// at six to one (withCanonCooldown); minutes and seconds as written.
//
// Four pastes print no cost or cooldown at all (Astral Lantern, Lightning
// Tether, Absorbing Shield, Fountain of Life). They run on the prices marked
// ASKED below until he says otherwise; ROUND287_NOTES.md asks.
//
// Merged into CANON_EXEMPLARS by abilityCanon.js before keys are stamped.
// This file imports nothing from abilityCanon.js (it is imported BY it).
// ============================================================================

const hours = (h) => ({ canonCooldownHours: h, cooldown: Math.round(h * 3600 / 6) });

/** New exemplars, in the order of his paste. */
export const CANON_EXEMPLARS_03 = {
  // --- Adept -----------------------------------------------------------------
  blessingOfRelentlessness: {
    name: 'Blessing of Relentlessness', _srcName: 'Adept', category: 'support',
    kind: 'active', template: 'partyBuff', scope: 'allyNotSelf', element: 'radiant',
    cost: { type: 'mana', amount: 64 }, ...hours(24),
    boon: true, restoresPools: true,
    desc: 'Everything they have, ready again.',
  },
  masterful: {
    name: 'Masterful', _srcName: 'Adept', category: 'utility',
    kind: 'passive', template: 'aura', element: 'radiant',
    cost: null, cooldown: 0, auraRadius: 180, restoresPools: true,
    desc: 'Around you, everyone is ready sooner.',
  },

  // --- Magic -----------------------------------------------------------------
  astralLantern: {
    name: 'Astral Lantern', _srcName: 'Magic', category: 'summon',
    kind: 'active', template: 'summonBonded', element: 'disruptive',
    cost: { type: 'mana', amount: 14 }, cooldown: 0,   // ASKED: the paste prints no cost
    desc: 'A small light that sees what hides and burns what flies.',
  },
  powerThief: {
    name: 'Power Thief', _srcName: 'Magic', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'disruptive',
    cost: { type: 'mana', amount: 40 }, cooldown: 300,
    boon: true,
    desc: 'Take what they can do, and do it once.',
  },
  powerLock: {
    name: 'Power Lock', _srcName: 'Magic', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'disruptive',
    cost: { type: 'mana', amount: 24 }, cooldown: 60,
    desc: 'Every trick they use costs them another.',
  },
  wrathOfTheMagister: {
    name: 'Wrath of the Magister', _srcName: 'Magic', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'disruptive',
    cost: null, cooldown: 0,   // "Varies": each colour carries its own price (CANON_MODES)
    desc: 'A prismatic beam, and reality rewritten along it.',
  },
  lordOfMagic: {
    name: 'Lord of Magic', _srcName: 'Magic', category: 'utility',
    kind: 'passive', template: 'aura', element: 'disruptive',
    cost: null, cooldown: 0, auraRadius: 180, restoresPools: true,
    desc: 'Mana gathers where you stand.',
  },
  toolsOfTheMagister: {
    name: 'Tools of the Magister', _srcName: 'Magic', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'disruptive',
    cost: null, cooldown: 0, ritual: true,
    desc: 'Every tool of the trade, and a circle to make them sing.',
  },
  eldritchEyes: {
    name: 'Eldritch Eyes', _srcName: 'Magic', category: 'utility',
    kind: 'passive', template: 'perception', element: 'disruptive',
    cost: null, cooldown: 0,
    desc: 'Mana has currents, and you can see them.',
  },

  // --- Mirror / Dimension ------------------------------------------------------
  mirrorMagic: {
    name: 'Mirror Magic', _srcName: 'Mirror', category: 'utility',
    kind: 'active', template: 'projectileBall', element: 'radiant',
    cost: null, cooldown: 0,   // "Varies": the mirrored spell's own price and clock
    desc: 'What they just cast, you cast back -- at your own strength.',
  },
  bagOfTricks: {
    name: 'Bag of Tricks', _srcName: 'Dimension', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'disruptive',
    cost: null, cooldown: 0,
    desc: 'Everything you own, a reach away.',
  },
  juxtapose: {
    name: 'Juxtapose', _srcName: 'Dimension', category: 'utility',
    kind: 'active', template: 'teleport', element: 'disruptive',
    cost: { type: 'mana', amount: 24 }, cooldown: 60,
    desc: 'Here is there, and there is here.',
  },

  // --- Trap --------------------------------------------------------------------
  lightningTether: {
    name: 'Lightning Tether', _srcName: 'Trap', category: 'attack',
    kind: 'active', template: 'canonConjuration', element: 'lightning',
    cost: { type: 'mana', amount: 12 }, cooldown: 0,   // ASKED: the paste prints no cost
    desc: 'A rod, a line of lightning, and a storm when the rod comes up.',
  },
  forceTether: {
    name: 'Force Tether', _srcName: 'Trap', category: 'attack',
    kind: 'active', template: 'canonConjuration', element: 'resonating',
    cost: { type: 'mana', amount: 4 }, cooldown: 0,   // "Low mana-per-second": paid by the second while the rod stands
    drainPerSec: { mana: 2 },
    desc: 'Everything nearby, dragged to the rod.',
  },
  pitOfTheReaper: {
    name: 'Pit of the Reaper', _srcName: 'Trap', category: 'attack',
    kind: 'active', template: 'canonConjuration', element: 'necrotic',
    cost: { type: 'mana', amount: 24 }, cooldown: 120,
    desc: 'A hole in the world, and death at the bottom of it.',
  },

  // --- Rune --------------------------------------------------------------------
  runeTrap: {
    name: 'Rune Trap', _srcName: 'Rune', category: 'attack',
    kind: 'active', template: 'canonConjuration', element: 'disruptive',
    cost: { type: 'mana', amount: 24 }, cooldown: 60,
    incantation: 'Emplace the mark of power.',
    desc: 'A mark on the ground, and a bang.',
  },
  enactRitual: {
    name: 'Enact Ritual', _srcName: 'Rune', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'disruptive',
    cost: null, cooldown: 0, ritual: true,
    desc: 'Lines of magic, drawn in the air.',
  },
  runeMantle: {
    name: 'Rune Mantle', _srcName: 'Rune', category: 'support',
    kind: 'active', template: 'partyBuff', scope: 'allyOrSelf', element: 'disruptive',
    cost: { type: 'mana', amount: 6 }, cooldown: 10,
    boon: true,
    desc: 'A ring of runes, each one a surprise for whoever strikes.',
  },
  runeGate: {
    name: 'Rune Gate', _srcName: 'Rune', category: 'utility',
    kind: 'active', template: 'teleport', element: 'disruptive',
    cost: null, cooldown: 0,
    desc: 'A gate of runes: a store room, and later a road.',
  },

  // --- Shield ------------------------------------------------------------------
  absorbingShield: {
    name: 'Absorbing Shield', _srcName: 'Shield', category: 'utility',
    kind: 'active', template: 'barrierWall', scope: 'allyOrSelf', element: 'radiant',
    cost: { type: 'mana', amount: 12 }, cooldown: 20,   // ASKED: the paste prints no cost
    restoresPools: true,
    desc: 'It stops the blow, and pays you for it.',
  },

  // --- Renewal -----------------------------------------------------------------
  fountainOfLife: {
    name: 'Fountain of Life', _srcName: 'Renewal', category: 'healing',
    kind: 'active', template: 'canonConjuration', element: 'radiant',
    cost: { type: 'mana', amount: 14 }, cooldown: 30,   // ASKED: the paste prints no cost
    healAmount: 4,
    desc: 'A fountain in the air, and the wounds under it close.',
  },
  grandRenewal: {
    name: 'Grand Renewal', _srcName: 'Renewal', category: 'healing',
    kind: 'active', template: 'cleanse', scope: 'allyOrSelf', element: 'radiant',
    cost: { type: 'mana', amount: 64 }, ...hours(1),
    healAmount: 40, ritual: true,
    desc: 'A healing ritual, and every affliction goes with it.',
  },

  // --- Blood -------------------------------------------------------------------
  bloodMagic: {
    name: 'Blood Magic', _srcName: 'Blood', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'necrotic',
    cost: null, cooldown: 0,
    desc: 'Life, spent as power.',
  },

  // ===== ROUND 288 -- the movement half: Swift, Wind, Balance, Mystic =========
  // --- Swift -------------------------------------------------------------------
  freeRunner: {
    name: 'Free Runner', _srcName: 'Swift', category: 'utility',
    kind: 'passive', template: 'passiveMove', element: 'physical',
    cost: null, cooldown: 0,
    desc: 'Walls and water are just more ground, if you keep moving.',
  },
  avatarOfSpeed: {
    name: 'Avatar of Speed', _srcName: 'Swift', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'resonating',
    cost: null, cooldown: 0,   // held; its silver rung is the cell's press
    desc: 'Every way you move, more so.',
  },
  betweenTheRaindrops: {
    name: 'Between the Raindrops', _srcName: 'Swift', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'disruptive',
    cost: { type: 'mana', amount: 6 }, cooldown: 0,   // "High mana per second and high stamina per second": by the second
    drainPerSec: { mana: 3, stamina: 3 },
    desc: 'Space bends a little, and the blow is somewhere you are not.',
  },
  alacritysReward: {
    name: 'Alacrity’s Reward', _srcName: 'Swift', category: 'utility',
    kind: 'passive', template: 'passiveMove', element: 'radiant',
    cost: null, cooldown: 0,
    desc: 'Every step ahead is a blow you will not take.',
  },
  // --- Wind --------------------------------------------------------------------
  windBlade: {
    name: 'Wind Blade', _srcName: 'Wind', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'physical',
    cost: { type: 'mana', amount: 6 }, cooldown: 0,
    desc: 'A blade of air.',
  },
  cleansingBreeze: {
    name: 'Cleansing Breeze', _srcName: 'Wind', category: 'support',
    kind: 'passive', template: 'aura', element: 'radiant',
    cost: null, cooldown: 0, auraRadius: 180,
    desc: 'A clean wind around you, and nothing foul stays in it.',
  },
  leafOnTheWind: {
    name: 'Leaf on the Wind', _srcName: 'Wind', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'disruptive',
    cost: { type: 'mana', amount: 4 }, cooldown: 0,   // "Moderate mana-per-second": by the second
    drainPerSec: { mana: 3 },
    desc: 'Glide, and ride the wind.',
  },
  windWave: {
    name: 'Wind Wave', _srcName: 'Wind', category: 'utility',
    kind: 'active', template: 'dash', element: 'physical',
    cost: { type: 'mana', amount: 12 }, cooldown: 6,
    desc: 'A wall of air, pushing.',
  },
  // --- Balance -----------------------------------------------------------------
  equilibrium: {
    name: 'Equilibrium', _srcName: 'Balance', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'radiant',
    cost: null, cooldown: 0,   // meditation: held while you sit still
    restoresPools: true,
    desc: 'Be still, and be whole.',
  },
  cloudStep: {
    name: 'Cloud Step', _srcName: 'Balance', category: 'utility',
    kind: 'active', template: 'dash', element: 'physical',
    cost: { type: 'stamina', amount: 6 }, costs: [{ type: 'stamina', amount: 6 }, { type: 'mana', amount: 6 }], cooldown: 15,
    desc: 'A step on air.',
  },
  momentOfOneness: {
    name: 'Moment of Oneness', _srcName: 'Balance', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'radiant',
    cost: { type: 'mana', amount: 64 }, cooldown: 120,   // "Extreme mana-per-second" for its one second
    desc: 'For one second, nothing touches you. Then someone pays for it.',
  },
  manaTide: {
    name: 'Mana Tide', _srcName: 'Balance', category: 'support',
    kind: 'active', template: 'partyBuff', element: 'disruptive',
    cost: { type: 'mana', amount: 6 }, ...hours(4),
    restoresPools: true,
    desc: 'The astral, flowing in.',
  },
  eldritchImbalance: {
    name: 'Eldritch Imbalance', _srcName: 'Balance', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'necrotic',
    cost: { type: 'mana', amount: 6 }, cooldown: 0,
    desc: 'Their mana, drawn off, while you hold it.',
  },
  // --- Mystic ------------------------------------------------------------------
  strongSoul: {
    name: 'Strong Soul', _srcName: 'Mystic', category: 'utility',
    kind: 'passive', template: 'passiveMove', element: 'disruptive',
    cost: null, cooldown: 0,
    desc: 'The soul holds; what strikes at it breaks.',
  },
  sightBeyondSight: {
    name: 'Sight Beyond Sight', _srcName: 'Mystic', category: 'utility',
    kind: 'passive', template: 'perception', element: 'radiant',
    cost: null, cooldown: 0,
    desc: 'Auras, and everything around you, seen.',
  },
  immortalFist: {
    name: 'Immortal Fist', _srcName: 'Mystic', category: 'attack',
    kind: 'passive', template: 'passiveMove', element: 'resonating',
    cost: null, cooldown: 0,
    desc: 'A fist that breaks armour and turns aside blows.',
  },
  radiantFist: {
    name: 'Radiant Fist', _srcName: 'Mystic', category: 'attack',
    kind: 'passive', template: 'passiveMove', element: 'disruptive',
    cost: null, cooldown: 0,
    desc: 'A fist that breaks magic and catches spells.',
  },
  mirageStep: {
    name: 'Mirage Step', _srcName: 'Mystic', category: 'utility',
    kind: 'active', template: 'teleport', element: 'disruptive',
    cost: { type: 'stamina', amount: 6 }, costs: [{ type: 'stamina', amount: 6 }, { type: 'mana', amount: 6 }], cooldown: 40,
    decoy: true,
    desc: 'There, and an image of you here.',
  },
};

/** Exemplars from earlier rounds whose price now follows his paste. The card
 *  already printed his words; the game charged the round-2xx figure. */
export const CANON_EXEMPLAR_FIXES_03 = {
  // "Cost: Very high mana." Very high is 40 on every other canon card.
  // Round 238 declared three rungs pending; round 287 built all three.
  chrysalisGolem: { cost: { type: 'mana', amount: 40 }, pending: [] },
  spartoi: { cost: { type: 'mana', amount: 40 } },
  // "Cost: Moderate mana." (Blessing of Readiness, Bolster) -- 12, the band.
  blessingOfReadiness: { cost: { type: 'mana', amount: 12 } },
  bolster: { cost: { type: 'mana', amount: 12 } },
  // "Cost: High mana." (Giant's Might) -- 24.
  giantsMight: { cost: { type: 'mana', amount: 24 } },
  // "Cost: Very high mana. Cooldown: 6 hours." (Instant Adept)
  instantAdept: { cost: { type: 'mana', amount: 40 } },
  // "Mana Shield ... Base Cost: None. Cooldown: None." -- a toggle, held.
  manaShield: { cost: null, cooldown: 0 },
  // "Bait and Switch ... Cost: High mana. Cooldown: 1 minute."
  baitAndSwitch: { cost: { type: 'mana', amount: 24 }, cooldown: 60 },
  // ROUND 288 -- "Eternal Moment ... Cost: Extreme mana-per-second and
  // stamina-per-second. Cooldown: None." One, two or three seconds of it.
  eternalMoment: { drain: [{ type: 'mana', perSec: 64 }, { type: 'stamina', perSec: 64 }], cooldown: 0, canonCooldownHours: undefined, template: 'canonConjuration', cost: null },
  // "Karmic Warrior ... Cost: None. Cooldown: None." Held: every rung is
  // something that happens to you or around you.
  karmicWarrior: { kind: 'passive', template: 'passiveMove', cost: null, cooldown: 0, trigger: null, reactive: false },
  // "Deny the Reaper ... Cost: Moderate mana. Cooldown: 30 seconds." An
  // attack on a target, not a counter: the round-235 transcription had it
  // paid in health and fired on being hit.
  denyTheReaper: {
    cost: { type: 'mana', amount: 12 }, cooldown: 30,
    trigger: null, reactive: false, template: 'chainStrike', scope: 'enemy',
  },
};
