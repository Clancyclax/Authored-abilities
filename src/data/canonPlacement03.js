// ============================================================================
// ROUND 287 -- WHERE HIS THIRD PASTE'S ABILITIES COME FROM.
//
// Asked in round 284 about pastes that name no awakening stone, the user
// chose "I pick, you review". These are the picks for batch03, also written
// to data/canon/CANON_STONES_DRAFT_r287.csv (tools/write_stone_picks_r287.py)
// for him to correct. Two rows are not picks but readings: "Karma" (no stone
// of that name; Karmic is the catalogue's) and "Awakening Stone(s)
// Preparation" (named, in a label the parser does not read).
// ============================================================================

export const CANON_STONE_PICKS_03 = {
  // Adept
  instantAdept: 'stoneMoment',            // "Instant": a moment
  blessingOfRelentlessness: 'stonePersistence',   // relentless
  masterful: 'stoneFocus',                // mastery is focus
  blessingOfReadiness: 'stonePreparation',        // readiness
  // Magic
  astralLantern: 'stoneStar',             // an astral light
  powerThief: 'stoneHunger',              // it takes
  powerLock: 'stoneCage',                 // it locks
  wrathOfTheMagister: 'stoneWrath',       // its own name
  lordOfMagic: 'stoneMagus',              // a lord of magic
  toolsOfTheMagister: 'stoneSceptre',     // the magister's tool
  // Mirror, Dimension
  mirrorMagic: 'stoneMirror',             // its own name
  bagOfTricks: 'stoneMyriad',             // many tricks
  juxtapose: 'stoneDimension',            // a dimensional swap
  // Trap
  lightningTether: 'stoneLightning',      // its own element
  forceTether: 'stoneChain',              // a tether
  baitAndSwitch: 'stoneSmoke',            // now you see me
  // Rune
  runeTrap: 'stoneTrap',                  // its own name
  enactRitual: 'stonePaper',              // diagrams drawn out
  runeMantle: 'stoneArmour',              // a mantle worn
  runeGate: 'stoneDimension',             // a gate
  // Shield
  absorbingShield: 'stoneVoid',           // it swallows the blow
  manaShield: 'stoneMagic',               // mana, as armour
  // Growth
  bolster: 'stoneGrowth',                 // made larger
  chrysalisGolem: 'stoneEarth',           // a golem
  giantsMight: 'stoneMight',              // its own name
  // Renewal
  fountainOfLife: 'stoneWater',           // a fountain
  grandRenewal: 'stoneRenewal',           // its own name
  // Blood
  bloodMagic: 'stoneMagic',               // its own name
  // Might
  shieldBreaker: 'stoneAxe',              // a heavy weapon (Hammer is Unstoppable Force's)
  // Dragon
  dragonsMightAura: 'stoneMight',         // "Dragon's Might"; the paste says Unknown
  spartoi: 'stoneBone',                   // dragon's teeth, sown
  // Swift
  alacritysReward: 'stonePreparation',    // READING: "Awakening Stone(s) Preparation"
  // Balance
  karmicWarrior: 'stoneKarmic',           // READING: "Karma [Legendary]"
  manaTide: 'stoneMoon',                  // tides answer the moon
  eldritchImbalance: 'stoneDiscord',      // imbalance
  // Mystic
  strongSoul: 'stoneResolute',            // a strong soul
};

/** Pastes whose runtime is not built yet. Round 287 built the first half of
 *  batch03; round 288 the movement half (Swift, Wind, Balance, Mystic). A
 *  pending paste is kept, shown on no kit, and listed in OPEN_TASKS.md. */
export const CANON_RUNTIME_PENDING = new Set([
  // ROUND 288 -- empty: the movement half is built (canonRuntime5Mixin.js).
]);
