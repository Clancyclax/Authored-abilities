// ============================================================================
// ROUND 282 -- MAGICAL ITEMS THAT READ LIKE THE USER'S.
//
// His examples (data/canon/items_batch01.txt, kept word for word) are items
// with a maker's description, type tags, and "Effect:" lines:
//
//   Item: [Robes of the Astral Verdict] (bronze rank, rare) Robes designed
//   for summoning. (armour, cloth). Effect: Increases the damage dealt by
//   dimension spells. Effect: Summoned creatures have increased damage
//   reduction. ...
//
// Asked how that relates to the stat lines gear already rolls: "Effects on
// top of stat lines". So an item keeps its stats and, from Uncommon up, also
// carries effects. Every effect here is a line the game DOES: each has a
// payload, and WorldScene reads each payload at one named door (listed per
// effect). A line with no door is not written -- which is why "Adapts to fit
// the wearer" and "Keeps the wearer cool" are not in this table: the game
// has no fitting and no climate yet.
//
// Also here: the maker's description (materials from the game's own monster
// parts), the type tags, the Epic-and-up SETS ("Epic rarity or higher can be
// part of a set. 2 - 3 pieces with bonuses as a set."), and the Legendary
// growth header ("Legendary items are growth items").
// ============================================================================
// The six elements, as stats.js lists them. Written out rather than imported:
// stats.js imports THIS file to roll effects, and a cycle is one import away.
const ELEMENT_TYPES = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];
import { growthBlock, nextGrowthRank } from './growthMaterials.js';   // ROUND 283

const RANKS = ['iron', 'bronze', 'silver', 'gold'];
const ELEMENT_WORD = { fire: 'fire', frost: 'cold', lightning: 'lightning', nature: 'nature', shadow: 'shadow', radiant: 'light' };
// Condition tags an item may ward against or strengthen, with the word the
// line uses. Keys are the TAG values in debuffs.js.
const TAG_WORD = { poison: 'poison', disease: 'disease', curse: 'curse', blood: 'bleeding', burning: 'burning', frost: 'frost', shock: 'shock', unholy: 'unholy' };
// Afflictions a weapon hit may carry, by condition key (debuffs.js).
const STRIKE_CONDITIONS = ['bleed', 'burn', 'poison', 'disease'];
const COND_LABEL = { bleed: 'Bleeding', burn: 'Burning', poison: 'Poisoned', disease: 'Diseased' };

/** A pct effect's size: its base, a quarter again per rank above iron. */
const sized = (base, rank) => Math.round(base * (1 + 0.25 * Math.max(0, RANKS.indexOf(rank))) * 1000) / 1000;

// ---------------------------------------------------------------------------
// THE EFFECTS. `slots` is where one may roll (null = anywhere); `make` returns
// { text, fx, buffs?, craft?, cond? } for a given rng and item.
//   fx      -> summed into player.itemFx and read by the scene
//   buffs   -> ordinary stat buffs, into the same stack as the item's stats
//   craft   -> an on-hit entry in the round-90 craftEffects shape, read by
//              `_craftedStrike` on every weapon hit
// ---------------------------------------------------------------------------
export const ITEM_EFFECTS = {
  // Door: _damageMonster, when the hit carries an element and is the player's.
  elementSpells: { slots: null, make: (rng, it) => {
    const el = pick(rng, ELEMENT_TYPES);
    const v = sized(0.08, it.rank);
    return { text: `Increases the damage dealt by ${ELEMENT_WORD[el]} spells.`, fx: { elementDmg: { [el]: v } }, num: `+${pct(v)} ${ELEMENT_WORD[el]} damage` };
  } },
  // Door: the resist_* stat, through the buff stack.
  elementWard: { slots: null, make: (rng, it) => {
    const el = pick(rng, ELEMENT_TYPES);
    const v = sized(0.07, it.rank);
    return { text: `Damage reduction against ${ELEMENT_WORD[el]} damage.`, buffs: [{ stat: `resist_${el}`, amount: v, effect: true }], num: `${pct(v)} ${ELEMENT_WORD[el]} resistance` };
  } },
  // Door: armour, through the buff stack.
  toughness: { slots: ['chest', 'legs', 'helmet', 'shield', 'belt', 'gloves', 'boots'], make: (rng, it) => {
    const v = sized(0.03, it.rank);
    return { text: 'Increased resistance to damage.', buffs: [{ stat: 'armor', amount: v, effect: true }], num: `+${pct(v)} armour` };
  } },
  // Door: _applyHot and the potion pour, on the player.
  mending: { slots: null, make: (rng, it) => {
    const v = sized(0.15, it.rank);
    return { text: 'Heal over time effects have increased strength and duration.', fx: { hotBoost: v }, num: `+${pct(v)} heal-over-time strength and duration` };
  } },
  // Door: _applyDebuff, when the player is the one afflicted.
  natureWard: { slots: null, make: (rng, it) => {
    const tag = pick(rng, Object.keys(TAG_WORD));
    const v = sized(0.2, it.rank);
    return { text: `Increases natural ${TAG_WORD[tag]} resistance.`, fx: { tagResist: { [tag]: v } }, num: `${TAG_WORD[tag]} afflictions ${pct(v)} shorter` };
  } },
  // Door: _applyDebuff, when the player is the one inflicting.
  lingering: { slots: ['gloves', 'ring', 'amulet'], make: (rng, it) => {
    const tag = pick(rng, Object.keys(TAG_WORD));
    const v = sized(0.2, it.rank);
    const w = TAG_WORD[tag];
    return { text: `${w[0].toUpperCase()}${w.slice(1)} afflictions you inflict last longer.`, fx: { outTagDur: { [tag]: v } }, num: `+${pct(v)} ${w} duration` };
  } },
  // Door: the summon's own damage-taken line.
  summonWard: { slots: ['chest', 'amulet', 'ring', 'helmet'], make: (rng, it) => {
    const v = sized(0.12, it.rank);
    return { text: 'Summoned creatures have increased damage reduction.', fx: { summonDR: v }, num: `summons take ${pct(v)} less damage` };
  } },
  // Door: _payAbilityCost, mana only.
  thrift: { slots: ['amulet', 'ring', 'helmet', 'chest'], make: (rng, it) => {
    const v = sized(0.05, it.rank);
    return { text: 'Spells cost less mana.', fx: { manaCostCut: v }, num: `-${pct(v)} mana cost` };
  } },
  // Door: _craftedStrike, on every weapon hit.
  venomStrike: { slots: ['gloves', 'ring'], make: (rng, it) => {
    const key = pick(rng, STRIKE_CONDITIONS);
    const chance = sized(0.12, it.rank);
    return { text: `Weapon attacks have a chance to inflict [${COND_LABEL[key]}].`, craft: { debuff: key, chance, duration: 0 }, cond: key, num: `${pct(chance)} chance a hit` };
  } },
  // Door: _craftedStrike, but only while the weapon in hand was conjured.
  conjuredVenom: { slots: ['chest', 'gloves', 'amulet'], make: (rng, it) => {
    const key = pick(rng, STRIKE_CONDITIONS);
    return { text: `Weapons conjured while wearing this inflict [${COND_LABEL[key]}].`, craft: { debuff: key, chance: 1, duration: 0, conjuredOnly: true }, cond: key, num: 'every hit, with a conjured weapon' };
  } },
  // Door: the auraRange stat.
  reach: { slots: ['amulet', 'helmet', 'ring'], make: (rng, it) => {
    const v = sized(0.08, it.rank);
    return { text: 'Extends the reach of your aura.', buffs: [{ stat: 'auraRange', amount: v, effect: true }], num: `+${pct(v)} aura range` };
  } },
  // Door: the moveSpeed stat.
  fleet: { slots: ['boots', 'legs', 'belt'], make: (rng, it) => {
    const v = sized(0.04, it.rank);
    return { text: "Lightens the wearer's step.", buffs: [{ stat: 'moveSpeed', amount: v, effect: true }], num: `+${pct(v)} movement speed` };
  } },
  // Door: the hpRegen stat.
  recovery: { slots: ['belt', 'chest', 'amulet'], make: (rng, it) => {
    const v = sized(0.002, it.rank);
    return { text: 'Hastens natural recovery.', buffs: [{ stat: 'hpRegen', amount: v, effect: true }], num: `+${(v * 100).toFixed(1)}%/s health recovery` };
  } },
};
export const ITEM_EFFECT_KEYS = Object.keys(ITEM_EFFECTS);

/** How many effects a rarity carries. Uncommon: sometimes one (his Trowel
 *  and Oasis Bracelet are Uncommon with effects); Rare one or two; Epic two
 *  to four; Legendary three to five. Common: none, a plain item. */
export function effectCountFor(rarity, rng) {
  switch (rarity) {
    case 'Uncommon': return rng() < 0.4 ? 1 : 0;
    case 'Rare': return 1 + (rng() < 0.5 ? 1 : 0);
    case 'Epic': return 2 + Math.floor(rng() * 3);
    case 'Legendary': return 3 + Math.floor(rng() * 3);
    default: return 0;
  }
}

/** Roll an item's effects: distinct kinds, each allowed in its slot. */
export function rollItemEffects(rng, item) {
  const n = effectCountFor(item.rarity, rng);
  const out = [];
  const pool = ITEM_EFFECT_KEYS.filter(k => !ITEM_EFFECTS[k].slots || ITEM_EFFECTS[k].slots.includes(item.slot));
  for (let i = 0; i < n && pool.length; i++) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    out.push({ key: k, ...ITEM_EFFECTS[k].make(rng, item) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE MAKER'S DESCRIPTION AND THE TYPE TAGS.
// ---------------------------------------------------------------------------
const MATERIALS = {
  hide: ['panterimp leather', 'crocodile hide', 'yeti pelt', 'tidal troll hide', 'dreadloth fur', 'white lion mane'],
  scale: ['hydrix scales', 'wyrmscale', 'medusa scales', 'spirit serpent scales', 'shellborn carapace', 'steel raptor plate'],
  silk: ['webstalker silk', 'halowing feathers', 'phoenix feathers', 'thunderbird quills'],
  bone: ['boneguard shards', 'direjaw teeth', 'gemtusk ivory', 'minotaur horn', 'hornram horn', 'saber canis fangs'],
  metal: ['blackened iron', 'river-silver', 'bronze', 'star-touched steel'],
  gem: ['a harbinger eye', 'an elementum core', 'a demon sigil', 'a cindermaw ember', 'a slime golem core'],
};
// How a thing is made depends on what it is made of.
const MAKING = {
  hide: ['carefully hand-crafted from', 'stitched together from', 'cut and cured from'],
  silk: ['woven from', 'carefully hand-crafted from', 'stitched together from'],
  scale: ['patiently layered from', 'worked from', 'riveted together from'],
  bone: ['carved from', 'worked from', 'shaped from'],
  metal: ['forged from', 'hammered from', 'cast from'],
};
const LINING = ['lined with', 'trimmed with', 'bound with', 'backed with'];
const GARMENT = {
  chest: ['A full body armour', 'A coat', 'A robe', 'A hauberk'], legs: ['A pair of leggings', 'A pair of greaves'],
  helmet: ['A helm', 'A hood', 'A circlet'], gloves: ['A pair of gloves', 'A pair of gauntlets'],
  boots: ['A pair of boots', 'A pair of treads'], belt: ['A belt', 'A girdle'], shield: ['A shield', 'A buckler'],
};

/** The item's own noun, as the description's subject: "A cuirass", "A pair
 *  of grips" -- so the name and the description never name two things. */
const PAIRED = ['gloves', 'boots', 'legs'];
function subjectFor(slot, noun) {
  const n = String(noun || '').toLowerCase();
  if (!n) return (GARMENT[slot] || ['A piece of armour'])[0];
  if (PAIRED.includes(slot)) return `A pair of ${n}`;
  return `${/^[aeiou]/.test(n) ? 'An' : 'A'} ${n}`;
}

export function itemDescription(rng, item) {
  const slot = item.slot;
  if (slot === 'ring' || slot === 'amulet') {
    const what = slot === 'ring' ? 'A ring' : pick(rng, ['An amulet', 'A pendant', 'A torc']);
    const metal = pick(rng, MATERIALS.metal), gem = pick(rng, MATERIALS.gem);
    return { desc: `${what} of ${metal}, set with ${gem}.`, tags: `accessory, ${slot}`, material: metal };
  }
  const kind = slot === 'shield' ? pick(rng, ['metal', 'bone', 'scale'])
    : pick(rng, ['hide', 'scale', 'silk', 'hide', 'scale', 'metal']);
  const a = pick(rng, MATERIALS[kind]);
  const b = pick(rng, MATERIALS[kind === 'metal' ? 'bone' : pick(rng, ['hide', 'scale', 'bone'])]);
  const lining = pick(rng, MATERIALS.silk.filter(x => x !== a && x !== b)) || pick(rng, MATERIALS.silk);
  const body = `${subjectFor(slot, item.noun)}, ${pick(rng, MAKING[kind] || MAKING.hide)} ${a}${b !== a ? ` and ${b}` : ''}`
    + (slot === 'chest' || slot === 'legs' ? `, ${pick(rng, LINING)} ${lining}.` : '.');
  const cloth = kind === 'silk' ? 'cloth' : kind === 'hide' ? 'cloth/leather' : kind === 'scale' ? 'scale' : kind === 'metal' ? 'plate' : 'bone';
  return { desc: body, tags: `armour, ${cloth}`, material: a };
}

// ---------------------------------------------------------------------------
// SETS. An Epic-or-better item may belong to a set, named for the monster its
// material came from. A set has two or three pieces; wearing two gives the
// first bonus, three the second. The set is the same object wherever its
// pieces drop: it is derived from the material, not stored per item.
// ---------------------------------------------------------------------------
export const SET_CHANCE = 0.35;
const SET_WORD = ['Panoply', 'Regalia', 'Vestments', 'Harness'];
function hashStr(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

export function setFor(material) {
  if (!material) return null;
  const h = hashStr(`set|${material}`);
  const root = material.split(' ')[0];
  const name = `The ${root[0].toUpperCase()}${root.slice(1)} ${SET_WORD[h % SET_WORD.length]}`;
  const pieces = 2 + (h >> 4) % 2;
  // Bonuses are rolled from the same table as item effects, seeded on the
  // set, at silver strength so they matter at every rank they are found.
  const r = seeded(h);
  const fake = { rank: 'silver', slot: 'chest', rarity: 'Epic' };
  const keys = ITEM_EFFECT_KEYS.filter(k => !['conjuredVenom', 'venomStrike'].includes(k));
  const k1 = keys[h % keys.length];
  const k2 = keys[(h >> 7) % keys.length] === k1 ? keys[(h + 1) % keys.length] : keys[(h >> 7) % keys.length];
  const bonuses = [{ at: 2, key: k1, ...ITEM_EFFECTS[k1].make(r, fake) }];
  if (pieces === 3) bonuses.push({ at: 3, key: k2, ...ITEM_EFFECTS[k2].make(r, fake) });
  return { id: `set:${material}`, name, pieces, bonuses };
}

// ---------------------------------------------------------------------------
// LEGENDARY: GROWTH ITEMS. "Legendary items are growth items." A generated
// legendary is found at iron and carries what it needs to grow to bronze, in
// the shape of [Dread Salvation]'s conditions. Growing it is the next step;
// the conditions are printed now so the item says what it is.
// ---------------------------------------------------------------------------
export function growthConditionsFor(rng, item) {
  // Gold is the top: a gold legendary is fully grown and has no conditions.
  const next = nextGrowthRank(item.rank || 'iron');
  if (!next) return null;
  const kg = 1 + Math.floor(rng() * 2);
  const silver = 2 + Math.floor(rng() * 4);
  const ess = pick(rng, ['iron', 'magic', 'fire', 'water', 'earth', 'blood']);
  // ROUND 283 -- the text AND the needs, parsed from the text
  // (growthMaterials.js), so the card and the ritual cannot disagree.
  return growthBlock(next, [
    `${kg} kilogram${kg === 1 ? '' : 's'} of blood gold`,
    `${silver} kilograms of low grade (${next} rank) star-fall silver`,
    `100 ${next}-rank ${ess} quintessence gems.`,
    `1000 ${next} rank spirit coins.`,
    `Ritual of ${next} ascension.`,
  ]);
}

// ---------------------------------------------------------------------------
// THE CARD, in his format.
// ---------------------------------------------------------------------------
export function itemCardLines(item, equippedSetCount = 0) {
  const out = [];
  const rarity = String(item.rarity || '').toLowerCase();
  const growth = item.growth ? ' [growth]' : '';
  const head = `Item: [${item.name}] (${item.rank || 'iron'} rank${growth}, ${rarity})`
    + (item.desc ? ` ${item.desc}` : '') + (item.typeTags ? ` (${item.typeTags}).` : '');
  out.push(head);
  for (const e of (item.effects || [])) out.push(`Effect: ${e.text}`);
  if (item.set) {
    const s = setFor(item.set);
    if (s) {
      out.push(`Set: ${s.name} (${Math.min(equippedSetCount, s.pieces)} of ${s.pieces} worn).`);
      for (const b of s.bonuses) out.push(`Set (${b.at}): ${b.text}`);
    }
  }
  // The game's reading of the lines above, as an ability card has: the
  // description says what, this says how much.
  const nums = (item.effects || []).map(e => e.num).filter(Boolean);
  if (nums.length) out.push(`Numbers: ${nums.join('; ')}.`);
  if (item.growth) {
    out.push(`Growth Conditions (${item.growth.to}):`);
    for (const c of item.growth.conditions) out.push(`•${c}`);
  }
  return out;
}

/** Everything a worn set of items adds up to, including set bonuses.
 *  Returns { fx, buffs, craft } -- fx summed, buffs and craft listed. */
export function gearFx(items) {
  const fx = { elementDmg: {}, tagResist: {}, outTagDur: {}, forceDR: {}, hotBoost: 0, summonDR: 0, manaCostCut: 0 };
  const buffs = [], craft = [];
  const add = (e) => {
    if (!e) return;
    const f = e.fx || {};
    for (const [k, v] of Object.entries(f)) {
      if (typeof v === 'number') fx[k] = (fx[k] || 0) + v;
      else for (const [kk, vv] of Object.entries(v)) fx[k][kk] = (fx[k][kk] || 0) + vv;
    }
    if (e.buffs) buffs.push(...e.buffs);
    if (e.craft) craft.push(e.craft);
  };
  const sets = {};
  for (const it of items) {
    if (!it) continue;
    for (const e of (it.effects || [])) add(e);
    if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
  }
  const activeSets = [];
  for (const [mat, n] of Object.entries(sets)) {
    const s = setFor(mat);
    if (!s) continue;
    for (const b of s.bonuses) if (n >= b.at) add(b);
    activeSets.push({ name: s.name, worn: n, pieces: s.pieces });
  }
  // ROUND 284 -- [Dark Hydra Robe]: "Abilities that enhance poison resistance
  // are enhanced." What else on you resists poison resists it harder.
  if (fx.poisonResistBoost && fx.tagResist.poison) fx.tagResist.poison *= 1 + fx.poisonResistBoost;
  // Ceilings, so stacked items cannot make a rule vanish.
  fx.manaCostCut = Math.min(0.5, fx.manaCostCut);
  fx.summonDR = Math.min(0.6, fx.summonDR);
  for (const k of Object.keys(fx.tagResist)) fx.tagResist[k] = Math.min(0.75, fx.tagResist[k]);
  return { fx, buffs, craft, activeSets, sets };
}

/** ROUND 283 -- the ritual grows a piece's effects with it: every number an
 *  effect carries moves from its old rank's size to its new one (the same
 *  quarter-again per rank `sized` rolled it at), and its Numbers text with it.
 *  Mutates the effects in place. */
export function growEffects(effects, fromRank, toRank) {
  const ratio = sized(1, toRank) / sized(1, fromRank);
  if (!(ratio > 0) || ratio === 1) return;
  const r3 = (v) => Math.round(v * ratio * 1000) / 1000;
  for (const e of (effects || [])) {
    if (e.fx) for (const [k, v] of Object.entries(e.fx)) {
      if (typeof v === 'number') e.fx[k] = r3(v);
      else for (const kk of Object.keys(v)) v[kk] = r3(v[kk]);
    }
    if (e.buffs) for (const b of e.buffs) b.amount = r3(b.amount);
    if (e.craft && e.craft.chance < 1) e.craft.chance = Math.min(1, r3(e.craft.chance));
    if (e.num) {
      e.num = e.num.replace(/(\d+(?:\.\d+)?)(%)/, (_, n, sfx) => {
        const dec = (n.split('.')[1] || '').length;
        return `${(Number(n) * ratio).toFixed(dec)}${sfx}`;
      });
    }
  }
}

// --- helpers ---------------------------------------------------------------
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function pct(v) { return `${Math.round(v * 100)}%`; }
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
