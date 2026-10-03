// Restored equipment/inventory/currency system, round 4. The user's own
// words: "the original inventory screen allowing the player to attach
// essences and awakening stones, showed the attributes 'Power, Spirit,
// Speed, and Recovery' had an actual inventory and equipment slots, this
// also tracked your the players currency in the various coins need to be
// restored... essence stones added back in, awakening stones, monster
// drops, coins, and the inventory screen from before."
//
// Ported CONCEPTS from sparkstone_prototype.html (the canonical 22MB
// original, NOT the differently-named/older sparkstone_prototype_5.html
// upload): COIN_RANKS/COIN_CONVERSION (line ~1686), ATTR_NAMES (line
// ~2838), the RESOURCE_BASE idea that Power/Spirit/Speed feed max HP/Mana/
// Stamina (line ~2849), bindEssenceAttribute/unbindEssenceAttribute (an
// essence equipped into a slot randomly binds that slot to one of the 4
// attributes, granting a flat bonus for as long as it's equipped).
//
// DELIBERATE SCOPE CUTS from the original (documented per this project's
// own practice of flagging rather than silently faking a descoped feature):
//   - Only 3 essence slots (ESSENCE_SLOT_COUNT), not the original's 4
//     (3 real + a "confluence" 4th slot that auto-combines all 3 into a
//     procedurally generated ability). The confluence mechanic needs the
//     original's full computeAbility/generateVastAbility machinery, which
//     this port never built (see abilities.js's own header note: only 4 of
//     ~18 templates exist here). With 3 slots and 4 attributes, one
//     attribute is always left unbound at any given time -- an accepted
//     simplification, not a bug.
//   - Awakening stones do NOT share the essence id-space or generate new
//     procedural abilities the way they do in the original (there, a stone
//     is just another essence/elemental id socketed alongside the main one,
//     and the PAIR determines the generated ability). This port's 5-essence
//     roster doesn't map onto that system at all, so STONE_DEFS below is a
//     separate, independent catalog: flat, fixed bonuses to whichever
//     slot's bound attribute the stone is socketed into, nothing procedural.
//   - No gear/armor paperdoll (helmet/chest/legs/boots/gauntlets/
//     accessories) -- the user's own ask named "essences and awakening
//     stones" specifically as what needed restoring, not armor slots.
//     player.gearCritChance/gearCritDamage (the existing GEAR_ROLL_CHANCE
//     stand-in from an earlier round) are left as they were.

export const ATTR_NAMES = ['power', 'spirit', 'speed', 'recovery'];
export const ATTR_LABEL = { power: 'Power', spirit: 'Spirit', speed: 'Speed', recovery: 'Recovery' };

export const ESSENCE_SLOT_COUNT = 3;
// RESTORED round 5: 4 awakening-stone sockets per essence slot -- the
// original prototype's own capacity ("Up to 4 awakening stones per essence
// slot"), which round 4 had temporarily descoped to 2. The confluence slot
// (index 3) carries 4 sockets of its own, same as the manual slots. See
// src/data/awakening.js for the ability generation each socket feeds.
export const STONE_SLOT_CAP = 4; // per essence slot (and per the confluence slot)

// ROUND 6 attribute economy -- corrected per the user's spec: "at the
// start all attributes are 0. Once each essence is bonded all attributes
// should be 1. When the character ranks up from Iron to Bronze, or Bronze
// to Silver and so on the attributes should each go up by 1." So an
// attribute's value is now:
//     (1 if an essence slot is bonded to it, else 0)
//   + 1 per rank-up past Iron (Bronze +1, Silver +2, Gold +3, Diamond +4)
//   + any ability-granted points ("Strength of Atlas"-style attr-boost
//     passives -- see awakening.js's attr_boost category)
// The round-4/5 flat bonuses (6 per essence, 3 per stone) are GONE --
// stones no longer feed attributes at all; their whole contribution is the
// ability each socket generates.
import { RANK_ORDER } from './ranks.js';
// ROUND 125 -- Prism's five cooked dishes. See CONSUMABLE_DEFS below for why
// they join the ordinary consumable table rather than getting one of their own.
import { PRISM_FOOD } from './prismChain.js';
import { POTION_DEFS, rollPotion } from './potions.js';   // ROUND 281
export function rankStepsPastIron(rank) {
  return Math.max(0, RANK_ORDER.indexOf(rank) - RANK_ORDER.indexOf('iron'));
}

// ROUND 58 -- FOUR RESOURCE FORMULAS LIVED HERE AND NONE OF THEM RAN.
//
// `computeMaxHp`, `computeMaxMana`, `computeMaxStamina` and `computeRegenMult`
// were exported from this file and imported by nothing. Round 10's minor-stat
// system took the whole job -- stats.js `computeMinorStats` is the only path
// that has produced a player's maxima since -- and these were left behind.
//
// Three of them were merely redundant. `computeRegenMult` was worse than that:
// it returned `1 + recovery * 0.25`, a MULTIPLIER on some base rate, where the
// live code adds a flat rate to a base of zero for health and 1.5%/s for the
// other two pools. Anyone reading this file to understand Recovery -- which is
// reasonable, since this is where attributes are defined -- would come away
// with the wrong model of the attribute entirely.
//
// Deleted rather than corrected: a second implementation that agrees today is
// the one that disagrees after the next retune. This round's 4x rescale is
// exactly the sort of change that would have broken them again silently.
//
// The attribute -> stat map lives in stats.js `ATTR_SCALE`, and the totals that
// feed it come from `computeAttrTotal` below.

// Total attribute value for `attr` under the ROUND 6 economy (see the
// header note above): bond point + rank steps + ability-granted points.
// The rank bonus applies to every attribute unconditionally ("the
// attributes should EACH go up by 1"), the bond point only while an
// essence slot (or the formed confluence, slot 3) is actually bonded to
// this attribute, and ability points come from passiveMods.attrBonus --
// aggregated by WorldScene._recomputeDerivedStats BEFORE this is called.
// ===========================================================================
// ROUND 77 (item 6.2.1) -- THE ATTRIBUTE CAP.
//
// The user: "Previously noted was an attribute cap, which if the build doesn't
// role any of the above should cap at gold ranks 4, but with the right
// abilities (or divine items) could go as high as 6."
//
// THE FLOOR WAS ALREADY RIGHT AND NOTHING ENFORCED IT. `computeAttrTotal` is
// `(bound ? 1 : 0) + rankStepsPastIron(rank) + abilityBonus`, so a bound
// attribute at Gold is 1 + 3 = 4 before any ability touches it -- exactly the
// number the user names. What was missing is that `abilityBonus` had no
// ceiling at all: `attr_boost` granted `1 + rankStepsPastIron(rank)`, four more
// at Gold, so one such ability took a bound attribute to 8 and two took it to
// 12. Against a system where round 58 moved saturation to ~4.1 points and the
// user's own note says "a character will get so few attribute points they
// should be more impactful", 12 is not a big number, it is a broken one.
//
// So there are two caps and they are different things:
//
//   ATTR_SOFT_CAP (4)   where a build with no attribute abilities stops. It
//                       is not enforced as a clamp -- it is simply what the
//                       rank ladder adds up to, and it is written down here so
//                       the number has a name and a suite can assert it.
//   ATTR_HARD_CAP (6)   the ceiling nothing passes. Two more than the floor,
//                       which is the user's "as high as 6".
//
// Each attribute ability bound to an attribute raises THAT attribute's ceiling
// by one, and each divine item that names it raises it by one, to the hard
// cap. So the ability is not "+1 attribute" bolted onto a fixed ladder -- it
// is permission to go one point further than a build without it can, which is
// what makes taking two of them, or one plus a divine relic, a real choice.
// ===========================================================================
export const ATTR_SOFT_CAP = 4;
export const ATTR_HARD_CAP = 6;

/**
 * The ceiling on one attribute for this player: 4, plus what they have earned
 * the right to, never more than 6.
 *
 * `attrCapBonus` is written by WorldScene's passive pass (one per attribute
 * ability bound to that attribute) and by the divine-item pass. Read through
 * `passiveMods` like every other ability contribution, so a suite can set it
 * directly and a save carries nothing extra.
 */
export function attrCapFor(player, attr) {
  const mods = player && player.passiveMods;
  const raised = (mods && mods.attrCapBonus && mods.attrCapBonus[attr]) || 0;
  return Math.min(ATTR_HARD_CAP, ATTR_SOFT_CAP + raised);
}

export function computeAttrTotal(player, attr) {
  let bound = false;
  // ROUND 190 (8.7) -- "The linked attribute also progresses with abilities.
  // I.e. if the might abilities average Iron 3 then the linked attribute is
  // 1.3 not 1.0." The linked slot's level (the mean of its abilities, see
  // abilityLevels.syncSlotsFromAbilities) adds its tenths; the best linked
  // slot counts when two share an attribute.
  let tenths = 0;
  const lvl = (i) => {
    const pr = player.slotProgress && player.slotProgress[i];
    return pr ? Math.max(0, Math.min(9, pr.level || 0)) / 10 : 0;
  };
  for (let i = 0; i < ESSENCE_SLOT_COUNT; i++) {
    if (player.slotEssence[i] && player.slotAttr[i] === attr) { bound = true; tenths = Math.max(tenths, lvl(i)); }
  }
  if (player.confluence && player.slotAttr[3] === attr) { bound = true; tenths = Math.max(tenths, lvl(3)); }
  const abilityBonus = (player.passiveMods && player.passiveMods.attrBonus && player.passiveMods.attrBonus[attr]) || 0;
  const raw = (bound ? 1 + tenths : 0) + rankStepsPastIron(player.rank) + abilityBonus;
  // ROUND 77 -- and the ceiling. Clamped HERE rather than at each contributor
  // because the cap is a claim about the total, and three separate places
  // each clamping their own share would let the sum exceed all of them.
  return Math.min(raw, attrCapFor(player, attr));
}

// Picks a random attribute for a newly-equipped essence to bind its slot
// to -- weighted toward attributes NOT already bound by another occupied
// slot, so equipping essences into all 3 slots tends to cover 3 distinct
// attributes rather than stacking the same one 3 times (falls back to a
// fully random pick once every attribute is already covered, or if that's
// simply how the dice land).
// RESTORED round 5: with the confluence as a 4th binding slot, a full kit
// covers all 4 attributes -- the confluence's own binding (see WorldScene's
// _maybeFormConfluence) uses this same roll, which by the
// prefer-unused weighting lands on whichever attribute the 3 manual slots
// left unbound.
export function rollSlotAttribute(player, rng = Math.random) {
  const used = player.slotAttr.filter(a => a !== null);
  let choices = ATTR_NAMES.filter(a => !used.includes(a));
  if (!choices.length) choices = ATTR_NAMES;
  return choices[Math.floor(rng() * choices.length)];
}

// --- Ranked coin purse -- ported near-verbatim from the original's
// COIN_RANKS/COIN_CONVERSION/normalizeCoins/grantCoins. ---
// ROUND 11 -- lore-accurate spirit-coin ladder, confirmed and labeled:
// normal rank coins -> iron -> bronze -> silver -> gold -> diamond, each
// worth 100x the previous tier (COIN_CONVERSION below drives every
// normalize/grant/spend cascade). COIN_COLORS is the original prototype's
// own palette (line ~1688), verbatim -- these drive the per-rank coin
// ICONS the inventory now tracks currency under (itemArt.js coinIconUrl).
export const COIN_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
export const COIN_CONVERSION = 100;
export const COIN_LABELS = {
  normal: 'Normal Rank Coin', iron: 'Iron Rank Coin', bronze: 'Bronze Rank Coin',
  silver: 'Silver Rank Coin', gold: 'Gold Rank Coin', diamond: 'Diamond Rank Coin',
};
export const COIN_COLORS = { normal: '#e53935', iron: '#9e9e9e', bronze: '#cd7f32', silver: '#cfd8dc', gold: '#ffd54f', diamond: '#4fd8f0' };
const COIN_ABBR = { normal: 'c', iron: 'i', bronze: 'b', silver: 's', gold: 'g', diamond: 'd' };

export function emptyCoinPurse() {
  return Object.fromEntries(COIN_RANKS.map(r => [r, 0]));
}
export function normalizeCoins(purse) {
  for (let i = 0; i < COIN_RANKS.length - 1; i++) {
    const r = COIN_RANKS[i], next = COIN_RANKS[i + 1];
    if (purse[r] >= COIN_CONVERSION) {
      const carry = Math.floor(purse[r] / COIN_CONVERSION);
      purse[r] -= carry * COIN_CONVERSION;
      purse[next] += carry;
    }
  }
  return purse;
}
export function grantCoins(purse, rank, amount) {
  purse[rank] = (purse[rank] || 0) + amount;
  normalizeCoins(purse);
  return purse;
}
// Total purse value, expressed in 'normal' coin units (100 of one rank =
// 1 of the next, cascaded all the way up) -- used for shop price checks/
// comparisons so every other system can keep treating "coins" as one number.
export function coinPurseValue(purse) {
  let total = 0, mult = 1;
  for (const r of COIN_RANKS) { total += purse[r] * mult; mult *= COIN_CONVERSION; }
  return total;
}
// Deducts `amount` (in normal-coin-equivalent units) from a purse, breaking
// higher denominations down as needed ("making change") -- returns false
// (purse untouched) if the purse doesn't hold enough total value.
export function spendCoins(purse, amount) {
  const total = coinPurseValue(purse);
  if (total < amount) return false;
  let remaining = total - amount;
  for (const r of COIN_RANKS) purse[r] = 0;
  let mult = Math.pow(COIN_CONVERSION, COIN_RANKS.length - 1);
  for (let i = COIN_RANKS.length - 1; i >= 0; i--) {
    const r = COIN_RANKS[i];
    purse[r] = Math.floor(remaining / mult);
    remaining -= purse[r] * mult;
    mult /= COIN_CONVERSION;
  }
  return true;
}
// Compact HUD/shop display -- highest-denomination-first, omitting zero
// ranks (e.g. "3g 42s 6c"), falling back to "0c" for an empty purse.
export function formatCoinPurse(purse) {
  const parts = [];
  for (let i = COIN_RANKS.length - 1; i >= 0; i--) {
    const r = COIN_RANKS[i];
    if (purse[r] > 0) parts.push(`${purse[r]}${COIN_ABBR[r]}`);
  }
  return parts.length ? parts.join(' ') : '0c';
}

// --- Awakening stones -- ROUND 9: the round-6 12-stone starter set grew
// into the FULL 180-stone catalog from the user's HWFWM_TTRPG.xlsx
// "Awakening Stones" sheet, now living in src/data/stoneCatalog.js (names
// + rarities verbatim, an authored description each, plus the family/
// color/phrase data that drives per-stone ability-generation bias in
// awakening.js). Re-exported here so every existing STONE_DEFS/STONE_IDS
// consumer keeps working unchanged. rollStoneDrop is the rarity-weighted
// loot roll (_killMonster uses it instead of a uniform pick).
export { STONE_DEFS, STONE_IDS, STONE_CATALOG, STONE_RARITY_WEIGHTS, rollStoneDrop } from './stoneCatalog.js';

// --- Consumables -- simple instant-use items, dropped by CONSUMABLE_ROLL_CHANCE. ---
//
// ROUND 125 -- AND PRISM'S COOKING, folded in here rather than kept beside it.
//
// Her five rungs are consumables in every sense that matters -- they stack in
// the same bag, sell through the same valuer, bind to the same D-pad slots and
// are eaten through the same `_useConsumable` -- so the only thing that would
// come of a separate FOOD_DEFS is five call sites that have to remember it
// exists. The rungs themselves live in prismChain.js with the rest of her
// chain, because what a dish DOES is a property of how far through her
// curriculum she is; this is only where they join the pile.
//
// The two that are NOT loot are marked: `prismRung` is on every dish, and
// `loot.js` refuses to drop anything carrying it. A Bewildering Stew found in
// a wolf is a joke at the expense of the only joke this ladder has.
// ROUND 281 -- the potion line (potions.js): eight kinds in seven sizes. The
// two draughts that stood here are its small red and small blue, under the
// ids they always had.
export const CONSUMABLE_DEFS = {
  ...POTION_DEFS,
  staminaRation: { id: 'staminaRation', name: 'Trail Ration', desc: 'Restores 25 stamina.', stamina: 25, food: true },
  ...PRISM_FOOD,
};
export const CONSUMABLE_IDS = Object.keys(CONSUMABLE_DEFS);
/** What may be found in the world. Everything except a dish somebody cooked:
 *  a consumable and a piece of loot are two different lists and always were --
 *  this is the first time the difference has had a member.
 *
 *  `!= null` AND NOT A TRUTHINESS TEST. Rung 0 -- the joke rung, the one whose
 *  whole job is to do nothing -- carries `prismRung: 0`, so `!def.prismRung`
 *  would have let exactly the dish this list exists to keep out of the world
 *  fall out of a wolf. */
export const CONSUMABLE_LOOT_IDS = CONSUMABLE_IDS.filter(id => CONSUMABLE_DEFS[id].prismRung == null);

/** ROUND 281 -- one consumable for a drop, at the rank of what dropped it.
 *  Mostly a potion sized to that rank (potions.js); now and then a ration.
 *  Drawing uniformly from CONSUMABLE_LOOT_IDS, as the three drop sites did,
 *  would hand a normal-rank rat a Legendary one time in fifty-seven. */
export function rollConsumableDrop(rng = Math.random, rank = 'normal') {
  if (rng() < 0.15) return 'staminaRation';
  return rollPotion(rng, rank);
}

// --- Monster-part crafting materials -- one per monster FAMILY, updated
// to reference round-3's renamed families (Panterimp, Duskfang, etc. --
// the nice continuity opportunity flagged earlier this round: a part now
// actually matches the creature it's named after in the bestiary). No
// crafting system consumes these yet (out of scope this round) -- they're
// real bag items with real names/descriptions, same "real item, no consumer
// system built for it yet" spirit as the original's own part drops before
// crafting existed.
export const PART_DEFS = {
  slime: { id: 'ichorlingGel', name: 'Ichorling Gel', desc: 'A jar of cloudy, faintly luminous ooze.' },
  bat: { id: 'duskfangWing', name: 'Duskfang Wing', desc: 'A leathery wing membrane, still warm.' },
  wolf: { id: 'panterimpPelt', name: 'Panterimp Pelt', desc: 'Coarse, mottled fur -- good insulation, poor smell.' },
  hydra: { id: 'hydrixScale', name: 'Hydrix Scale', desc: 'An iridescent scale, faintly damp no matter how dry the air.' },
  raptor: { id: 'clawstriderTalon', name: 'Clawstrider Talon', desc: 'A curved talon, wickedly sharp.' },
  chimera: { id: 'triskelithFang', name: 'Triskelith Fang', desc: 'One of three mismatched fangs from the same jaw.' },
  hellhound: { id: 'cindermawEmber', name: 'Cindermaw Ember', desc: 'A coal that never quite cools.' },
  elemental: { id: 'elementumCore', name: 'Elementum Core', desc: 'A crystallized fragment of raw elemental essence.' },
  dragon: { id: 'wyrmscale', name: 'Wyrmscale', desc: 'A single scale, heavier than it looks.' },
  trex: { id: 'direjawTooth', name: 'Direjaw Tooth', desc: 'A serrated tooth the length of a hand.' },
  boar: { id: 'gemtuskIvory', name: 'Gemtusk Ivory', desc: 'A gleaming tusk fragment, faintly gem-flecked.' },
  skeleton: { id: 'boneguardShard', name: 'Boneguard Shard', desc: 'A fragment of ancient, unnaturally hard bone.' },
  spinosaurus: { id: 'hexfinSpine', name: 'Hexfin Spine', desc: 'A ridged dorsal spine, still faintly slick.' },
  spider: { id: 'webstalkerSilk', name: 'Webstalker Silk', desc: 'A skein of silk, stronger than steel wire.' },
  lizard: { id: 'quillrunnerQuill', name: 'Quillrunner Quill', desc: 'A barbed quill, surprisingly light.' },
  slimeGolem: { id: 'slimeGolemCore', name: 'Slime Golem Core', desc: 'A dense mineral core, once the golem\'s animating heart.' },
  saberCanis: { id: 'saberCanisFang', name: 'Saber Canis Fang', desc: 'A single curved fang, longer than a hand.' },
  // ROUND 64 -- shade and demon were the two families of eighteen with nothing
  // to drop, which was invisible while parts were only loot: they simply never
  // appeared. It stopped being invisible the moment quest boards started
  // posting "bring me N of a thing", because a gather notice naming either
  // family could not be generated at all -- and a board that silently declines
  // to post is exactly the kind of nothing this project keeps finding.
  shade: { id: 'shadeRemnant', name: 'Shade Remnant', desc: 'A cold smear of something that will not settle in the jar.' },
  demon: { id: 'demonSigil', name: 'Demon Sigil', desc: 'A brand cut into hide, still legible and still warm.' },
  // ROUND 191 -- THE SAME FAULT, TWENTY-ONE FAMILIES LATER. Every family added
  // since round 64 arrived without a part, so a gather notice that drew one of
  // them could not be written -- and Prism's Nek kitchen, which asks only for
  // ingredients, could not be offered at all ("Nothing to work with here").
  scorpion: { id: 'scorpionStinger', name: 'Scorpion Stinger', desc: 'The last joint of the tail, venom sac and all.' },
  direbuck: { id: 'direbuckAntler', name: 'Direbuck Antler', desc: 'A heavy tine, the velvet worn off in fights.' },
  hornram: { id: 'hornramHorn', name: 'Hornram Horn', desc: 'A curled horn, ridged like a cut shell.' },
  giantToad: { id: 'giantToadGland', name: 'Giant Toad Gland', desc: 'A milky gland that numbs the fingers that hold it.' },
  cobra: { id: 'cobraFang', name: 'Cobra Fang', desc: 'A hollow fang, still beaded with venom.' },
  mantis: { id: 'mantisBlade', name: 'Mantis Blade', desc: 'A serrated foreleg, sharper than it looks.' },
  crocodile: { id: 'crocodileHide', name: 'Crocodile Hide', desc: 'A plate of armoured back-hide.' },
  whitelion: { id: 'whitelionMane', name: 'White Lion Mane', desc: 'A hank of pale mane, coarse as rope.' },
  medusa: { id: 'medusaScale', name: 'Medusa Scale', desc: 'A grey-green scale with a faint stony sheen.' },
  yeti: { id: 'yetiPelt', name: 'Yeti Pelt', desc: 'A thick white pelt that never quite warms up.' },
  minotaur: { id: 'minotaurHorn', name: 'Minotaur Horn', desc: 'A blunt horn, scarred from a hundred charges.' },
  phoenix: { id: 'phoenixFeather', name: 'Phoenix Feather', desc: 'A feather that stays warm long after it falls.' },
  thunderbird: { id: 'thunderbirdQuill', name: 'Thunderbird Quill', desc: 'A long quill that crackles when stroked.' },
  quillFiend: { id: 'quillFiendSpine', name: 'Quill Fiend Spine', desc: 'A barbed spine, easier to pull in than out.' },
  gnoll: { id: 'gnollTooth', name: 'Gnoll Tooth', desc: 'A yellowed canine on a knotted cord.' },
  spiritSerpent: { id: 'spiritSerpentScale', name: 'Spirit Serpent Scale', desc: 'A translucent scale that glows faintly in the dark.' },
  steelRaptor: { id: 'steelRaptorPlate', name: 'Steel Raptor Plate', desc: 'A metal-hard scute from a raptor that should not exist.' },
  shellborn: { id: 'shellbornCarapace', name: 'Shellborn Carapace', desc: 'A curved piece of shell, heavier than stone.' },
  harbinger: { id: 'harbingerEye', name: 'Harbinger Eye', desc: 'A clouded eye that seems to follow you.' },
  sixArmApe: { id: 'sixArmApeKnuckle', name: 'Six-Arm Ape Knuckle', desc: 'A knuckle-bone the size of a fist.' },
  tidalTroll: { id: 'tidalTrollHide', name: 'Tidal Troll Hide', desc: 'Grey hide that stays wet however long it dries.' },
  // ROUND 200 -- one per new family, because `partForFamily` is total by
  // design: a family with no part is a family whose corpse has nothing on it
  // and whose gather contracts cannot be written (see test_round191, which
  // asserts both). Named for what the creature is made of rather than for the
  // creature, which is the rule the forty above already follow.
  glasscat: { id: 'shardfangSliver', name: 'Shardfang Sliver', desc: 'A blade of body-glass. Still faintly warm, and it will not stop cutting.' },
  sharkcrab: { id: 'reefjawClaw', name: 'Reefjaw Claw', desc: 'A claw with a shark\'s tooth set in the tip, which is not how either animal is built.' },
  flowerhydra: { id: 'blossomirePollen', name: 'Blossomire Pollen', desc: 'A twist of paper holding pollen from five separate heads. Do not open it indoors.' },
  // ROUND 285 -- the carnivorous plants.
  bloomimp: { id: 'bloomkinPetal', name: 'Bloomkin Petal', desc: 'A petal the size of a hand, still warm. Monster part; traders and crafters buy it.' },
  snapmaw: { id: 'twinmawTooth', name: 'Twinmaw Tooth', desc: 'A green thorn shaped like a tooth, from one of two mouths. Monster part; traders and crafters buy it.' },
  vinegrasp: { id: 'thornlashHook', name: 'Thornlash Hook', desc: 'A hooked barb cut from a grasping vine. Monster part; traders and crafters buy it.' },
  birdangel: { id: 'halowingFeather', name: 'Halowing Feather', desc: 'A pinion that keeps its own light for some hours after the bird has stopped.' },
  demonsloth: { id: 'dreadlothFur', name: 'Dreadloth Fur', desc: 'White fur in a hand-thick mat. Nothing has ever got through it quickly.' },
};
export function partForFamily(family) {
  return PART_DEFS[family] || null;
}
