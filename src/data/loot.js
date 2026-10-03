import { AUTHORED_ITEM_TEXT } from './authoredItemText.js';   // ROUND 284
import { legendaryKeyOf } from './legendaryItems.js';   // ROUND 283
import { LEGENDARY_TEXT } from './legendaryText.js';   // ROUND 283
// ===========================================================================
// ROUND 82 ITEM 3 -- LOOT ON THE FLOOR.
//
//   "Loot needs an overhaul, coins should be picked up automatically but
//    everything else should drop in a standard ARPG format where the player
//    can choose to pick the items up."
//
// WHAT THIS REPLACES. Until this round exactly one thing in the game ever
// touched the ground: a coin pip. Every other drop -- essences, awakening
// stones, monster parts, potions, gear -- was pushed straight into the
// backpack at the moment of the kill, and the player found out about it from
// a line of float text ending in "(bag)". Six separate call sites did their
// own `inventory.<kind>.push(...)`, which is why `_rollSiteFind` carries a
// comment explaining that it grants directly because "there is no
// world-pickup path for essences and stones". There is one now.
//
// THE SHAPE OF A DROP is deliberately one type with a `kind` discriminator
// rather than five parallel arrays. Everything a drop has to do -- draw an
// icon, colour a label by rarity, sit on the floor, be picked up, be counted
// by a suite -- is the same job for a potion and for a legendary sword. The
// only thing that differs is which container it lands in, and that is one
// switch in `grantLootToPlayer` below.
//
// COINS ARE NOT IN HERE. They already behaved the way the user asked for --
// spawned on the ground, vacuumed up on approach -- so that path is untouched.
// The one change coins get is that the vacuum radius is now theirs alone
// (LOOT_MAGNET_RADIUS), separate from the reach at which an item offers
// itself, because those two numbers answer different questions and had been
// the same constant by accident.
// ===========================================================================

/** Every kind of thing that can lie on the floor. The order is the order a
 *  tie is broken in when two drops land on the same tile, which is why the
 *  rarest and most deliberate kinds come first. */
export const LOOT_KINDS = ['essence', 'stone', 'gear', 'weapon', 'consumable', 'part', 'quintessence',
  // ROUND 90 -- crafting's two new floor items. `core` drops from every kill
  // (one per monster, at the monster's rank) and `stock` comes off a harvest
  // node rather than a corpse, but both lie on the floor and are taken with E
  // like everything else, so both are loot kinds rather than a second system.
  'core', 'stock'];

/**
 * How far the player has to be for an item to offer itself, in world units.
 *
 * MATCHED TO `NPC_INTERACT_RADIUS` (46) ON PURPOSE. Picking a sword up and
 * talking to somebody are the same gesture -- walk up, press E -- so they
 * should have the same feel, and a player who has learned one has learned the
 * other. It is not the coin radius: a coin is taken FROM you walking past, an
 * item is taken BY you deciding to.
 */
export const LOOT_REACH = 46;

/**
 * How far coins vacuum in from. Round 31's `PICKUP_RADIUS` was 24 and this is
 * the same number under a name that says what it is for. Scaled at the call
 * site by `passiveMods.pickupRadiusMult`, which the perception passive lifts
 * to 1.5 -- a stat that now means "you sweep up coins from further away" and
 * nothing else, which is a cleaner promise than it had when it also silently
 * governed loot.
 */
export const LOOT_MAGNET_RADIUS = 24;

/** How long a dropped item lies there before it is swept, in seconds.
 *
 *  ZERO MEANS FOREVER, and forever is what this is set to. An ARPG that
 *  deletes the sword you were walking back for is a worse game than one whose
 *  floor gets untidy, and the display-list cost is bounded by the viewport
 *  pooling rather than by the count. Named and set here so a future round that
 *  disagrees has one number to change instead of an argument to have. */
export const LOOT_TTL_SECONDS = 0;

/** The most drops that may lie within one screen before the oldest is swept.
 *  This is the real bound, and it is a display-list bound rather than a design
 *  one -- see budgets.js. */
export const LOOT_MAX_ON_FLOOR = 220;

/**
 * Which backpack container a kind lands in, and how it gets there.
 *
 * ONE SWITCH, so a new drop kind is one line here rather than a sixth
 * inline push in `_killMonster`. `ownedWeapons` is a Set and every other
 * container is an array, which is exactly the sort of asymmetry that gets
 * copied wrong when it is written out six times.
 */
export function grantLootToPlayer(player, drop) {
  const inv = player.inventory;
  switch (drop.kind) {
    case 'essence':    inv.essences.push(drop.id); return true;
    case 'stone':      inv.stones.push(drop.id); return true;
    case 'part':       inv.parts.push(drop.id); return true;
    // ROUND 85 -- its own container rather than sharing `parts`. They sell the
    // same way, but a bag that mixes a wyrmscale with the fire the wyrm was
    // made of cannot show either of them as a category, and the shop lists by
    // container.
    case 'quintessence': inv.quintessence.push(drop.id); return true;
    // ROUND 90 -- their own containers, for the reason quintessence got one in
    // round 85: the shop and the bag list BY container, so a core mixed in
    // with the fire the monster was made of cannot be shown as a category and
    // cannot be counted by a recipe. STACKABLE, per the ruling -- and stacking
    // is what these arrays already do, because every row that shows them runs
    // through `countBy`.
    case 'core':       (inv.cores || (inv.cores = [])).push(drop.id); return true;
    case 'stock':      (inv.stock || (inv.stock = [])).push(drop.id); return true;
    case 'consumable': inv.consumables.push(drop.id); return true;
    case 'gear':       inv.gearItems.push(drop.item); return true;
    // ROUND 115, BUG 3 -- A WEAPON IS COUNTED NOW.
    //
    //   "Picking up a second sword doesn't provide a second sword to equip"
    //
    // The note that stood here said the player owns a TYPE and not an
    // instance, so "a second sword on the floor is not a second sword in the
    // bag" -- which described the behaviour accurately and was the bug. The
    // set still records WHETHER the player owns one (fourteen call sites ask
    // it that); `weaponCounts` records how many, which is the question
    // `_equipWeaponHand` has to ask before it decides whether the sword in the
    // other hand should move across or stay put.
    case 'weapon':
      player.ownedWeapons.add(drop.id);
      if (!player.weaponCounts || typeof player.weaponCounts !== 'object') player.weaponCounts = {};
      player.weaponCounts[drop.id] = (player.weaponCounts[drop.id] || 0) + 1;
      return true;
    default: return false;
  }
}

// ===========================================================================
// ROUND 91 -- WHAT A PERSON LEAVES, WHICH IS NOT WHAT A CREATURE LEAVES.
//
//   "Cultists and all other humans don't drop monster cores or quintessence.
//    They drop gear, consumables, and coins at higher rates than monsters."
//
// Both halves of that are the same observation. A monster core is "the knot of
// power left where a creature stopped being one" and quintessence is the raw
// stuff of what a thing was MADE of -- neither sentence is true of a person,
// who was made of the same thing you are. What a person has is what they were
// carrying, and a cultist camp is thirteen people with pockets.
//
// ONE TABLE, one door. There are two human fights in the game today (the
// realm camps and the sewer's Sereth Vane) and there will be more; a second
// copy of this reasoning written at the next one is how the two stop agreeing.
// ===========================================================================

/** How much likelier a person is to be carrying something than a creature is
 *  to leave it. The ruling was "about double", and it is expressed as a
 *  MULTIPLIER on the roster's own rates rather than as a second set of
 *  numbers, so five rounds of tuning on the monster table still governs the
 *  shape and this only moves the size. */
export const HUMAN_DROP_MULT = 2.0;
export const HUMAN_COIN_MULT = 2.0;

/** What a person may leave. Deliberately the complement of a creature's: no
 *  cores, no quintessence, no monster parts -- a cultist has no scales. */
export const HUMAN_LOOT_KINDS = ['gear', 'consumable', 'coin', 'essence', 'stone'];

/**
 * The rolls one human death produces, as `[{kind, ...}]`.
 *
 * `rates` is the monster table's own chances passed in (loot.js must not
 * import monsters.js -- monsters.js imports loot's constants), so this is
 * literally "the same table, twice as often".
 */
export function humanDrops(rates, rand = Math.random) {
  const out = [];
  const p = (x) => Math.min(0.95, (x || 0) * HUMAN_DROP_MULT);
  if (rand() < p(rates.gear)) out.push({ kind: 'gear' });
  if (rand() < p(rates.consumable)) out.push({ kind: 'consumable' });
  // The essence-or-stone roll a monster makes, at the same doubled rate. A
  // cultist carries a stone from their own cult's list (the runtime picks it);
  // anyone else carries whatever they had.
  if (rand() < p(rates.loot)) out.push({ kind: rand() < 0.5 ? 'essence' : 'stone' });
  return out;
}

/**
 * The label a drop wears on the floor, and the colour it wears it in.
 *
 * Returns `{ text, color }`. The catalogues are passed in rather than
 * imported so this module stays free of the circular dependency that
 * essenceCatalog -> awakening -> inventory already forms.
 */
export function lootLabel(drop, cat) {
  const { ESSENCES, STONE_DEFS, PART_DEFS, CONSUMABLE_DEFS, WEAPONS, RARITY_BY_KEY,
          QUINTESSENCE_DEFS } = cat;
  switch (drop.kind) {
    case 'essence': {
      const e = ESSENCES[drop.id];
      return { text: e ? `${e.name} Essence` : drop.id, color: (e && e.color) || '#ce93d8' };
    }
    case 'stone': {
      const s = STONE_DEFS[drop.id];
      const r = s && RARITY_BY_KEY[s.rarity];
      return { text: s ? s.name : drop.id, color: (r && r.color) || '#ce93d8' };
    }
    case 'part': {
      const p = PART_DEFS[drop.id];
      return { text: p ? p.name : drop.id, color: '#a1887f' };
    }
    case 'quintessence': {
      const q = QUINTESSENCE_DEFS && QUINTESSENCE_DEFS[drop.id];
      return { text: q ? q.name : drop.id, color: (q && q.color) || '#b0bec5' };
    }
    case 'core': {
      const c = cat.CORE_DEFS && cat.CORE_DEFS[drop.id];
      return { text: c ? c.name : drop.id, color: (c && c.color) || '#ce93d8' };
    }
    case 'stock': {
      const s = cat.STOCK_DEFS && cat.STOCK_DEFS[drop.id];
      return { text: s ? s.name : drop.id, color: '#c8b89a' };
    }
    case 'consumable': {
      const c = CONSUMABLE_DEFS[drop.id];
      return { text: c ? c.name : drop.id, color: '#80cbc4' };
    }
    case 'gear': {
      const r = drop.item && RARITY_BY_KEY[drop.item.rarity];
      return { text: (drop.item && drop.item.name) || 'item', color: (r && r.color) || '#ffffff' };
    }
    case 'weapon': {
      const w = WEAPONS[drop.id];
      // ROUND 283 -- one of the user's legendaries, by its own name.
      const lk = legendaryKeyOf(drop.id);
      if (!w && lk && LEGENDARY_TEXT[lk]) return { text: LEGENDARY_TEXT[lk].name, color: '#ff9800' };
      // ROUND 284 -- one of his authored weapons.
      const ak = String(drop.id || '').startsWith('authored_') ? String(drop.id).slice(9) : null;
      if (!w && ak && AUTHORED_ITEM_TEXT[ak]) return { text: AUTHORED_ITEM_TEXT[ak].name, color: '#ab47bc' };
      return { text: w ? w.name : drop.id, color: '#e0e0e0' };
    }
    default: return { text: 'something', color: '#ffffff' };
  }
}

/** Faults a suite can assert against, so the table is checked rather than
 *  trusted. */
export function lootFaults() {
  const out = [];
  if (LOOT_REACH <= LOOT_MAGNET_RADIUS) {
    out.push('an item must offer itself from further than a coin is swept from');
  }
  if (!LOOT_KINDS.length) out.push('no loot kinds declared');
  // Every declared kind must be granted by the switch above. Checked by
  // calling it with a stub player, because a `case` that was never written is
  // invisible to any amount of reading.
  const stub = {
    inventory: { essences: [], stones: [], parts: [], consumables: [], gearItems: [],
                 quintessence: [], cores: [], stock: [] },
    ownedWeapons: new Set(),
  };
  for (const kind of LOOT_KINDS) {
    const ok = grantLootToPlayer(stub, { kind, id: 'x', item: { name: 'x' } });
    if (!ok) out.push(`${kind}: declared but grantLootToPlayer does not handle it`);
  }
  return out;
}
