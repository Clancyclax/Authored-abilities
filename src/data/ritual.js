// ============================================================================
// ROUND 283 -- THE RITUAL OF ASCENSION: WHAT IT CHECKS AND WHAT IT TAKES.
//
//   "Add a ritual hall to the adventure society."
//
// The hall's ritualist reads a growth item's conditions (growthMaterials.js
// parses each line into a need) and performs the ritual only when every need
// is met. Pure: it reads and writes the inventory and purse it is handed, so
// the same code answers the dialogue, the test, and the ritual itself.
//
// What counts:
//   material      nuggets in the stock bag, by id (250 g each)
//   quintessence  gems of that essence AT THAT RANK OR HIGHER -- a silver gem
//                 is more than a bronze one, never less
//   coins         the purse's value, in that rank's coins (100 of each rank
//                 make one of the next, the game's standing conversion)
//   ritual        performed here, by being here: always met at the hall
// ============================================================================
import { quintRankOf, quintId, QUINT_RANKS } from './quintessence.js';
import { COIN_RANKS, COIN_CONVERSION, coinPurseValue, spendCoins } from './inventory.js';

const count = (arr, pred) => (arr || []).reduce((n, x) => n + (pred(x) ? 1 : 0), 0);

/** A rank's coin in normal-coin units. */
export function coinUnit(rank) {
  const i = COIN_RANKS.indexOf(rank);
  return Math.pow(COIN_CONVERSION, Math.max(0, i));
}

/** Does this gem id answer a quintessence need? */
function gemFits(id, need) {
  const q = quintRankOf(id);
  return q.baseId === quintId(need.essence)
    && QUINT_RANKS.indexOf(q.rank) >= QUINT_RANKS.indexOf(need.rank);
}

/** One need's standing: { have, want, met, label }. */
export function needStatus(need, inv, purse) {
  if (!need) return { have: 0, want: 0, met: false, unknown: true };
  switch (need.kind) {
    case 'material': {
      const have = count(inv && inv.stock, x => x === need.id);
      return { have, want: need.qty, met: have >= need.qty };
    }
    case 'quintessence': {
      const have = count(inv && inv.quintessence, x => gemFits(x, need));
      return { have, want: need.qty, met: have >= need.qty };
    }
    case 'coins': {
      const unit = coinUnit(need.rank);
      const have = Math.floor(coinPurseValue(purse || {}) / unit);
      return { have, want: need.qty, met: have >= need.qty };
    }
    case 'ritual': return { have: 1, want: 1, met: true };
    default: return { have: 0, want: 0, met: false, unknown: true };
  }
}

/** Every need met? */
export function ritualReady(block, inv, purse) {
  if (!block || !block.needs || !block.needs.length) return false;
  return block.needs.every(n => needStatus(n, inv, purse).met);
}

/** Take what the ritual takes. Returns false (and takes nothing) if any need
 *  is short. Gems are spent lowest rank first, so a player's better stones
 *  are the last to go. */
export function consumeNeeds(block, inv, purse) {
  if (!ritualReady(block, inv, purse)) return false;
  for (const need of block.needs) {
    if (need.kind === 'material') {
      let left = need.qty;
      inv.stock = inv.stock.filter(x => (x === need.id && left > 0) ? (left--, false) : true);
    } else if (need.kind === 'quintessence') {
      const fits = inv.quintessence.map((id, i) => ({ id, i })).filter(x => gemFits(x.id, need))
        .sort((a, b) => QUINT_RANKS.indexOf(quintRankOf(a.id).rank) - QUINT_RANKS.indexOf(quintRankOf(b.id).rank))
        .slice(0, need.qty).map(x => x.i);
      const drop = new Set(fits);
      inv.quintessence = inv.quintessence.filter((_, i) => !drop.has(i));
    } else if (need.kind === 'coins') {
      spendCoins(purse, need.qty * coinUnit(need.rank));
    }
  }
  return true;
}
