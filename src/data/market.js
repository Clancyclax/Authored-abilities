// ROUND 31 -- auction-house pricing for awakening stones and essences.
//
// The user's spec, verbatim:
//
//   "Common awakening stones should be priced at ~20 iron rank coins +/- 80%
//    to represent the randomness of people selling items.
//    Each step increase in rarity should octuple in price up to epic with the
//    same +/- 80% cost variation at the auction house.
//    Legendary stones, in addition to being vanishingly rare should be priced
//    in 80 gold range with a price variation of +/- 90%, and divine stones
//    effectively can only be granted by a diety. If they appear in a shop or
//    auction house the price is equivalent to multiple diamond rank coins.
//    Essences should follow the same rules as awakening stones but at 10x the
//    price."
//
// Everything below is expressed in NORMAL-rank coins, because that is the unit
// the purse maths already works in (inventory.js coinPurseValue/spendCoins),
// and the ladder converts at 100x per rank. So:
//
//   1 iron    =            100 normal
//   1 bronze  =         10,000
//   1 silver  =      1,000,000
//   1 gold    =    100,000,000
//   1 diamond = 10,000,000,000
//
// The octuple ladder therefore runs, for STONES:
//
//   Common     20 iron        =         2,000 normal
//   Uncommon  160 iron        =        16,000
//   Rare    1,280 iron        =       128,000
//   Epic   10,240 iron        =     1,024,000   (about 1 silver)
//   Legendary  80 gold        = 8,000,000,000   (a separate rule, not x8)
//   Divine      3 diamond     = 30,000,000,000
//
// Legendary is deliberately NOT on the octuple ladder -- x8 from Epic would
// be about 8 silver, and the user priced it at 80 gold, which is roughly a
// thousand times more. That gap is the point: it is the difference between an
// expensive purchase and a thing that changes your life.
//
// UNKNOWN rarity: the sheet carries five stones and five essences at a rarity
// the ladder has no rung for. They sit between Rare and Epic in the catalogue's
// own drop weighting, so they are priced there rather than being given a
// silent default of Common -- which is what a missing key would have done, and
// would have put a genuinely scarce stone on the bargain table.
import { COIN_CONVERSION } from './inventory.js';

const IRON = COIN_CONVERSION;                    // 100 normal
const GOLD = Math.pow(COIN_CONVERSION, 4);       // 100,000,000 normal
const DIAMOND = Math.pow(COIN_CONVERSION, 5);    // 10,000,000,000 normal

export const STONE_BASE_PRICE = {
  Common: 20 * IRON,
  Uncommon: 20 * 8 * IRON,
  Rare: 20 * 64 * IRON,
  Unknown: 20 * 180 * IRON,      // between Rare and Epic, see header
  Epic: 20 * 512 * IRON,
  Legendary: 80 * GOLD,
  Divine: 3 * DIAMOND,
};

// "+/- 80% ... to represent the randomness of people selling items", widening
// to +/- 90% at Legendary. Divine keeps the same 90% swing: at that price the
// variation is theatre either way, but a fixed number would read as a posted
// tariff rather than a lot going under the hammer.
export const PRICE_SWING = {
  Common: 0.8, Uncommon: 0.8, Rare: 0.8, Unknown: 0.8, Epic: 0.8,
  Legendary: 0.9, Divine: 0.9,
};

// Essences follow the same ladder at 10x, per the spec.
// ROUND 62 -- THE USER: "Prices for essences can be reduced by about 50%."
// Was 10. An essence cost ten times a stone of the same rarity, which made the
// half of the build system that actually sets an ability's shape the half a
// player could least afford to experiment with.
export const ESSENCE_PRICE_MULT = 5;

export function basePriceFor(kind, rarity) {
  const base = STONE_BASE_PRICE[rarity] ?? STONE_BASE_PRICE.Common;
  return kind === 'essence' ? base * ESSENCE_PRICE_MULT : base;
}

// One lot's asking price. `rand` is passed in (not called globally) so a
// listing can be regenerated deterministically from a seed -- the auction
// house rerolls its board on a timer and a price that changed every render
// would be unusable.
export function rollPrice(kind, rarity, rand = Math.random) {
  const base = basePriceFor(kind, rarity);
  const swing = PRICE_SWING[rarity] ?? 0.8;
  // Uniform across [base*(1-swing), base*(1+swing)].
  const factor = 1 + (rand() * 2 - 1) * swing;
  return Math.max(1, Math.round(base * factor));
}

// Renders a normal-coin price as the largest rank that divides it sensibly,
// so a 1,024,000 price reads "10.24 silver" rather than a seven-digit number.
// Returns { rank, amount } with amount already rounded for display.
export function priceInBestRank(normalValue) {
  const ranks = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
  let rank = 'normal', unit = 1;
  for (let i = ranks.length - 1; i >= 0; i--) {
    const u = Math.pow(COIN_CONVERSION, i);
    if (normalValue >= u) { rank = ranks[i]; unit = u; break; }
  }
  const amount = normalValue / unit;
  return { rank, amount: amount >= 100 ? Math.round(amount) : Math.round(amount * 100) / 100 };
}
