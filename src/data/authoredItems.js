// ============================================================================
// ROUND 284 -- HIS FIVE ITEM EXAMPLES, AS ITEMS.
//
//   "Item examples as authored items"
//   Where they come from: "Themed rare drops".
//   Lines with no system behind them: "In-game analogues".
//
// The words are his (authoredItemText.js, cut from items_batch01.txt). This
// file is the game's side: which slot each goes in, the effect shape behind
// each of his lines, and which monsters carry it.
//
// The analogues, said once:
//   "Rapidly repairs damage. Can reconstitute itself from near-total
//    destruction." -- gear has no durability; the damage armour takes is a
//    SUNDER. While worn, anything that breaks your armour wears off in a
//    fraction of the time.
//   "Adapts to fit the wearer, within a certain range." -- the one place a
//    fit is tested is the equip gate: it can be worn one rank above your own.
//   "Improves health of carnivorous plants." -- the carnivorous plants are the
//    flower hydra and round 285's three (Bloomkin, Twinmaw, Thornlash:
//    CARNIVOROUS_PLANT_FAMILIES in monsters.js); one on your side (a summon)
//    has more health.
//   "Keeps the wearer cool and refreshed. Bracelet energy is consumed at a
//    varying rate according to climate." -- no heat system; the bracelet
//    keeps your stamina coming back faster, and its energy runs down faster
//    in the desert and the Cinderwaste than in the cold.
//   "Consume a water quintessence gem to completely refill bracelet energy."
//    -- when it runs dry and there is a Water Quintessence in the bag.
// ============================================================================
import { AUTHORED_ITEM_TEXT } from './authoredItemText.js';

export const AUTHORED_PREFIX = 'authored_';
export const authoredWid = (key) => `${AUTHORED_PREFIX}${key}`;
export const authoredKeyOf = (wid) => (String(wid || '').startsWith(AUTHORED_PREFIX) ? String(wid).slice(AUTHORED_PREFIX.length) : null);

/** The rarity word his header uses, as the game's rarity key. */
const RARITY = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

/** Per item: the slot, and one effect shape per line of his, in his order. */
export const AUTHORED_ITEMS = {
  darkHydraRobe: {
    slot: 'chest',
    // "(armour, cloth/leather)" -- a robe's armour, more than cloth.
    inherentArmor: 0.1,
    lines: [
      { buffs: [{ stat: 'armor', amount: 0.05, effect: true }], num: '+5% armour; blows from fangs, claws and blades 15% lighter', fx: { cutDR: 0.15 } },
      { fx: { armourMends: 0.3 }, num: 'armour-breaking afflictions end in a third of the time' },
      { fx: { hotBoost: 0.2 }, num: '+20% heal-over-time strength and duration' },
      { fx: { tagResist: { poison: 0.25 }, poisonResistBoost: 0.5 }, num: 'poison 25% shorter; other poison resistance 50% stronger' },
      { craft: { debuff: 'umbralSnakeVenom', chance: 1, duration: 0, conjuredOnly: true }, num: 'every hit, with a conjured weapon' },
      { fx: { fitsAbove: 1 }, num: 'wearable one rank above your own' },
    ],
    drops: { families: ['hydra', 'cobra'], chance: 1 / 300, minRank: 1 },
  },
  bloodCultTrowel: {
    slot: 'belt',
    lines: [
      { fx: { plantSummonHp: 0.5 }, num: '+50% health for carnivorous plants on your side' },   // ROUND 285 -- "Change back to carnivorous Plants"
    ],
    drops: { cultists: true, chance: 1 / 40, minRank: 0 },
  },
  astralVerdictRobes: {
    slot: 'chest',
    inherentArmor: 0.06,
    lines: [
      // The dimension element here is disruptive force.
      { fx: { elementDmg: { disruptive: 0.12 } }, num: '+12% disruptive-force damage' },
      { fx: { summonDR: 0.15 }, num: 'summons take 15% less damage' },
      // Disruptive force is not one of the elemental resist stats, so it is
      // read where a blow lands (`_authoredCutDR`).
      { fx: { forceDR: { disruptive: 0.12 } }, num: '12% less disruptive-force damage' },
    ],
    drops: { families: ['harbinger', 'demon', 'shade'], chance: 1 / 250, minRank: 1 },
  },
  oasisBracelet: {
    slot: 'ring',
    lines: [
      { fx: { oasis: 1, staminaRegen: 0.2 }, num: '+20% stamina recovery while it has energy' },
      { fx: { oasisFireDR: 0.4 }, num: 'fire damage 40% lighter, at 1 energy a point' },
      { fx: { oasisRefill: 1 }, num: 'drinks a Water Quintessence when dry' },
    ],
    drops: { families: ['scorpion', 'giantToad', 'crocodile'], chance: 1 / 250, minRank: 0 },
  },
  // A weapon, so a weapon id beside the bag rather than a gear item.
  nightFang: {
    weapon: true, base: 'dagger', color: '#4a148c',
    lines: [
      { inflict: 'umbralSnakeVenom', num: 'every hit' },
      { ignoresUpTo: 2, num: 'armour and poison immunity of bronze-rank foes and below are ignored' },
    ],
    drops: { families: ['cobra', 'spiritSerpent'], chance: 1 / 200, minRank: 0 },
  },
};
export const AUTHORED_KEYS = Object.keys(AUTHORED_ITEMS);

/** The rarity key for an authored item. */
export function authoredRarity(key) {
  const t = AUTHORED_ITEM_TEXT[key];
  return RARITY[String(t && t.rarity).toLowerCase()] || 'Rare';
}

/** A gear item built from his text. `uid` is whatever the bag uses. */
export function authoredGearItem(key, uid) {
  const A = AUTHORED_ITEMS[key];
  const T = AUTHORED_ITEM_TEXT[key];
  if (!A || !T || A.weapon) return null;
  const effects = T.effects.map((text, i) => {
    const L = A.lines[i] || {};
    const e = { key: `${key}_${i}`, text, num: L.num || '' };
    if (L.fx) e.fx = JSON.parse(JSON.stringify(L.fx));
    if (L.buffs) e.buffs = L.buffs.map(b => ({ ...b }));
    if (L.craft) e.craft = { ...L.craft };
    return e;
  });
  const buffs = A.inherentArmor ? [{ stat: 'armor', amount: A.inherentArmor, inherent: true }] : [];
  const fit = effects.reduce((n, e) => n + ((e.fx && e.fx.fitsAbove) || 0), 0);
  return {
    uid, slot: A.slot, rarity: authoredRarity(key), rank: T.rank, level: 0,
    name: T.name, desc: T.desc, typeTags: T.typeTags, buffs, effects,
    authored: key, ...(fit ? { fitsAbove: fit } : {}),
  };
}

/** The weapon def for an authored weapon, built on its base. */
export function authoredWeaponDef(key, WEAPONS) {
  const A = AUTHORED_ITEMS[key];
  const T = AUTHORED_ITEM_TEXT[key];
  if (!A || !A.weapon || !T || !WEAPONS[A.base]) return null;
  const b = WEAPONS[A.base];
  return { ...b, id: authoredWid(key), baseId: A.base, name: T.name, color: A.color, authored: key,
    rank: T.rank, rarity: authoredRarity(key) };
}

/** Does this kill carry one of his items? Returns the key, or null.
 *  `m` is the monster: `family`, `rankIdx`, and `cultist` for a cultist. */
export function rollAuthoredDrop(rng, m) {
  for (const key of AUTHORED_KEYS) {
    const d = AUTHORED_ITEMS[key].drops;
    if (!d) continue;
    const fits = (d.cultists && m.cultist) || (d.families && d.families.includes(m.family));
    if (!fits || (m.rankIdx || 0) < (d.minRank || 0)) continue;
    if (rng() < d.chance) return key;
  }
  return null;
}

/** The card for an authored weapon: his header and lines. */
export function authoredCardLines(key) {
  const T = AUTHORED_ITEM_TEXT[key];
  if (!T) return [];
  const out = [`Item: [${T.name}] (${T.rank} rank, ${T.rarity}) ${T.desc} (${T.typeTags}).`];
  for (const e of T.effects) out.push(`Effect: ${e}`);
  for (const c of Object.values(T.conditions || {})) out.push(`[${c.label}] (${c.tags}): ${c.text}`);
  return out;
}

/** Oasis Bracelet: how fast the energy goes, by where you are. */
export function oasisDrainPerSec(regionId, arid) {
  const base = ({ sirukh: 1.2, cinder: 2, elehyd: 0.1, ixcuatl: 0.6, bratugal: 0.5 })[regionId] ?? 0.3;
  return base + (arid || 0) * 0.8;
}
export const OASIS_MAX = 100;
