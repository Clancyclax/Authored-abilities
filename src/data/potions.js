// ============================================================================
// ROUND 281 -- THE POTION LINE.
//
// The user, with an icon pack of seven bottle sizes:
//   "the potion icons should be recolored. Green- stamina, Blue - mana,
//    Red - health, Purple - heath and mana, Turquiose - Stamina and Mana,
//    A rich brown - Stamina and Health, Golden - all three, Clear with
//    sparkles for instant % of all three (Small 20% - Epic 100%)"
// and his answers: every colour in every size is a real item; coloured
// potions restore flat amounts that double with each size; the clear ones
// step evenly from 20% to 100% at Epic, and a Legendary clear restores 100%
// and removes every affliction.
//
// And: "regular potions should restore health over time. Average being over
// 4 seconds. This creates further variety as potions have different potencies
// some in 2 seconds others as slow as 10 seconds." So every COLOURED bottle
// pours its amount out over `secs` seconds -- its potency -- and the seven
// kinds average four: the thin green stamina draught in two, the heavy golden
// elixir in ten. The clear ones stay instant, as his first message said.
//
// The NAME carries the flavour and the DESCRIPTION states the mechanic, as
// every item in this game does.
//
// Two ids predate the line and are kept, so every save that holds them still
// does: `minorHealPotion` IS the small red, `manaTonic` IS the small blue.
// ============================================================================

export const POTION_SIZES = [
  { key: 'small', word: 'Small', amount: 20, pct: 0.20, art: 'Potion_White_small' },
  { key: 'standard', word: 'Standard', amount: 40, pct: 0.36, art: 'Potion_White_normal' },
  { key: 'big', word: 'Big', amount: 80, pct: 0.52, art: 'Potion_White_big' },
  { key: 'large', word: 'Large', amount: 160, pct: 0.68, art: 'Potion_White_large' },
  { key: 'huge', word: 'Huge', amount: 320, pct: 0.84, art: 'Potion_White_huge' },
  { key: 'epic', word: 'Epic', amount: 640, pct: 1.00, art: 'Potion_White_epic' },
  { key: 'legendary', word: 'Legendary', amount: 1280, pct: 1.00, cleanse: true, art: 'Potion_White_legendary' },
];

/** The eight kinds: which pools each restores, and the colour its bottle is
 *  recoloured to (tools/build_item_icons.py reads the same hexes). */
export const POTION_KINDS = [
  { key: 'red', noun: 'Healing Draught', pools: ['hp'], colour: '#d32f2f', secs: 3 },
  { key: 'blue', noun: 'Mana Draught', pools: ['mana'], colour: '#1e6fd9', secs: 3 },
  { key: 'green', noun: 'Stamina Draught', pools: ['stamina'], colour: '#43a047', secs: 2 },
  { key: 'purple', noun: 'Restoration Draught', pools: ['hp', 'mana'], colour: '#8e3fc0', secs: 4 },
  { key: 'turquoise', noun: 'Clarity Draught', pools: ['stamina', 'mana'], colour: '#1fb5a8', secs: 3 },
  { key: 'brown', noun: 'Vigour Draught', pools: ['stamina', 'hp'], colour: '#8a4b22', secs: 3 },
  { key: 'gold', noun: 'Golden Elixir', pools: ['hp', 'mana', 'stamina'], colour: '#e0a91c', secs: 10 },
  { key: 'clear', noun: 'Clear Elixir', pools: ['hp', 'mana', 'stamina'], pct: true, colour: null },
];

const POOL_WORD = { hp: 'health', mana: 'mana', stamina: 'stamina' };
const listWords = (ws) => ws.length <= 1 ? ws.join('')
  : ws.length === 2 ? `${ws[0]} and ${ws[1]}` : `${ws.slice(0, -1).join(', ')} and ${ws[ws.length - 1]}`;

/** The id a kind and size are stored under. */
export function potionId(kind, size) {
  if (kind === 'red' && size === 'small') return 'minorHealPotion';
  if (kind === 'blue' && size === 'small') return 'manaTonic';
  return `potion_${kind}_${size}`;
}

function describe(k, s) {
  // In the order his message names them: health, mana, stamina.
  const order = ['hp', 'mana', 'stamina'].filter(p => k.pools.includes(p));
  const words = listWords(order.map(p => POOL_WORD[p]));
  if (k.pct) {
    return `Instantly restores ${Math.round(s.pct * 100)}% of your ${words}.`
      + (s.cleanse ? ' Removes every affliction.' : '');
  }
  const over = `over ${k.secs} second${k.secs === 1 ? '' : 's'}`;
  return order.length === 1
    ? `Restores ${s.amount} ${words} ${over}.`
    : `Restores ${s.amount} ${words} each, ${over}.`;
}

// Sell values double with each size, and a bottle that fills more pools is
// worth more of them.
const KIND_VALUE = { 1: 1, 2: 1.8, 3: 2.6 };

export const POTION_DEFS = {};
for (const k of POTION_KINDS) {
  for (const [i, s] of POTION_SIZES.entries()) {
    const id = potionId(k.key, s.key);
    const def = { id, name: `${s.word} ${k.noun}`, desc: describe(k, s),
      potion: { kind: k.key, size: s.key, tier: i }, value: Math.round(150 * (2 ** i) * (k.pct ? 3 : KIND_VALUE[k.pools.length])) };
    if (k.pct) {
      def.pct = s.pct;
      if (s.cleanse) def.cleanse = true;
    } else {
      for (const p of k.pools) def[p] = s.amount;
      def.overSecs = k.secs;   // poured out over this long, not all at once
    }
    POTION_DEFS[id] = def;
  }
}
export const POTION_IDS = Object.keys(POTION_DEFS);

// ---------------------------------------------------------------------------
// WHAT DROPS WHERE. A potion line that drops a Legendary off a normal-rank
// rat is not a line, so the SIZE is drawn by the rank of what dropped it and
// the KIND by how common that mixture is. Single-pool bottles are the bread;
// the mixtures are a find; the clear ones are the find.
// ---------------------------------------------------------------------------
const SIZE_BY_RANK = {
  normal: { small: 80, standard: 20 },
  iron: { small: 40, standard: 40, big: 20 },
  bronze: { standard: 30, big: 40, large: 30 },
  silver: { big: 30, large: 40, huge: 30 },
  gold: { large: 30, huge: 45, epic: 24, legendary: 1 },
};
const KIND_WEIGHT = { red: 26, blue: 26, green: 22, purple: 7, turquoise: 7, brown: 7, gold: 3, clear: 2 };

function weighted(rng, table) {
  const entries = Object.entries(table);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

/** A potion for a drop at this rank ('normal'..'gold'). */
export function rollPotion(rng, rank = 'normal') {
  const size = weighted(rng, SIZE_BY_RANK[rank] || SIZE_BY_RANK.normal);
  const kind = weighted(rng, KIND_WEIGHT);
  return potionId(kind, size);
}
