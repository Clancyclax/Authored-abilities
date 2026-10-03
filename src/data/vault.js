// ============================================================================
// ROUND 132 -- THE RELIQUARY. A CHEST THAT OUTLIVES THE CHARACTER.
//
// The user:
//
//   "We need a chest that persists between saves to store found essences and
//    awakening stones so that on a new game the player can pull from the
//    essences they have found before."
//
// ----------------------------------------------------------------------------
// WHY THIS IS NOT A PLAYER FIELD, AND WHY THAT IS THE WHOLE DESIGN
// ----------------------------------------------------------------------------
// Everything the game persists today hangs off `scene.player`: `captureSave`
// walks its own keys, `_doLoad` copies them back, and six slots each hold one
// of those payloads. That mechanism is exactly wrong for this chest, in three
// separate ways, and each one would have been a bug report:
//
//   1. A SAVE SLOT IS A CHARACTER. "Persists between saves" means the chest
//      must be readable by a character who did not exist when the stones went
//      in. A field on the player is inside the save; the chest has to be
//      beside it.
//
//   2. `_doLoad` MERGES. It copies the payload's keys onto the LIVE player
//      object rather than replacing it, so anything left on `player` that the
//      save does not mention survives the load. A chest stored there would
//      leak between slots in one direction and be silently clobbered in the
//      other -- the worst possible shape for a store whose only job is to be
//      trustworthy.
//
//   3. `_titleNewGame` DOES NOT RESET THE PLAYER. Its whole body is close the
//      screen, drop into the sewer, open the creator. A new character inherits
//      the live object. So a chest on the player would appear to work
//      perfectly for exactly the case the user asked about -- and be the OLD
//      character's chest, not a store.
//
// So the chest is its own localStorage record, under its own key, written
// through its own functions, and no part of the save pipeline touches it. It
// is account-wide by construction rather than by careful bookkeeping.
//
// ----------------------------------------------------------------------------
// COUNTS, NOT A LIST
// ----------------------------------------------------------------------------
// `player.inventory.essences` is an array of ids with duplicates, which is
// right for a backpack (order is arrival order and the UI indexes into it) and
// wrong for a chest that may hold two hundred things across a dozen
// characters. Stored as `{ id: count }` the record stays small, the panel
// groups itself, and a deposit is `+= 1` rather than a splice.
//
// THE CAP IS PER STACK, not per chest. A player who has found forty Fire
// essences has a story; a player whose record has grown to nine thousand
// entries has a localStorage quota error, which `safeSet` swallows silently --
// the chest would simply stop saving and nobody would be told. The cap is what
// makes that unreachable.
// ============================================================================

export const VAULT_KEY = 'sparkstone.vault.v1';
export const VAULT_VERSION = 1;

/** The two kinds the user named, and the only two this holds. Gear, potions
 *  and crafting parts are deliberately out: the ask is about the essence and
 *  awakening-stone architecture, which is the thing a new character actually
 *  has to rebuild from nothing. */
export const VAULT_KINDS = ['essences', 'stones'];

/** Most of any one id the chest will hold. See the header: this is a quota
 *  guard, not a difficulty lever. */
export const VAULT_STACK_CAP = 99;

export function emptyVault() {
  return { v: VAULT_VERSION, essences: {}, stones: {} };
}

/**
 * Repair whatever came out of storage into something every caller can trust.
 *
 * A stored record is the one input to this module that is not written by this
 * module: it is a string in the player's browser, it may have been written by
 * an older build, hand-edited, or truncated by a crashed write. So it is
 * normalised rather than trusted -- unknown keys dropped, counts coerced to
 * whole numbers in range, non-positive entries deleted. A chest that throws
 * while being read would take the panel with it and there is no way for a
 * player to clear it from inside the game.
 */
export function normaliseVault(raw) {
  const out = emptyVault();
  if (!raw || typeof raw !== 'object') return out;
  for (const kind of VAULT_KINDS) {
    const src = raw[kind];
    if (!src || typeof src !== 'object') continue;
    for (const [id, n] of Object.entries(src)) {
      if (typeof id !== 'string' || !id) continue;
      const c = Math.floor(Number(n));
      if (!Number.isFinite(c) || c <= 0) continue;
      out[kind][id] = Math.min(VAULT_STACK_CAP, c);
    }
  }
  return out;
}

// --- storage ---------------------------------------------------------------
// Its own two helpers rather than saves.js's, which are not exported. Both
// swallow: localStorage throws in a private window and is absent entirely
// under node, where the data lane runs.

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, val) {
  try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
}

/** The stored chest, always a usable object -- never null, never a throw. */
export function loadVault() {
  const s = safeGet(VAULT_KEY);
  if (!s) return emptyVault();
  try { return normaliseVault(JSON.parse(s)); } catch (e) { return emptyVault(); }
}

/** Returns true if it actually reached disk, so a caller can tell the player
 *  their deposit did not stick rather than pretending it did. */
export function saveVault(v) {
  return safeSet(VAULT_KEY, JSON.stringify(normaliseVault(v)));
}

// --- the two moves ---------------------------------------------------------

/** How many of `id` the chest holds. */
export function vaultCount(v, kind, id) {
  return (v && v[kind] && v[kind][id]) || 0;
}

/** Every stack of a kind, as `[{ id, n }]`, id-sorted so the panel does not
 *  reshuffle itself between two deposits of the same thing. */
export function vaultList(v, kind) {
  const src = (v && v[kind]) || {};
  return Object.keys(src).sort().map(id => ({ id, n: src[id] }));
}

/** Total items of a kind, for the panel's header. */
export function vaultTotal(v, kind) {
  const src = (v && v[kind]) || {};
  let t = 0;
  for (const id of Object.keys(src)) t += src[id];
  return t;
}

/**
 * Put `n` in. Returns how many were ACTUALLY stored, which is the number the
 * caller must remove from the backpack -- returning a boolean here is how a
 * player loses an essence to a full stack.
 */
export function vaultDeposit(v, kind, id, n = 1) {
  if (!v || !VAULT_KINDS.includes(kind) || !id || n <= 0) return 0;
  if (!v[kind]) v[kind] = {};
  const have = v[kind][id] || 0;
  const room = Math.max(0, VAULT_STACK_CAP - have);
  const took = Math.min(room, Math.floor(n));
  if (took > 0) v[kind][id] = have + took;
  return took;
}

/**
 * Take `n` out. Returns how many were actually taken -- same reason: a caller
 * that assumed it got what it asked for would mint essences out of an empty
 * chest.
 */
export function vaultWithdraw(v, kind, id, n = 1) {
  if (!v || !VAULT_KINDS.includes(kind) || !id || n <= 0) return 0;
  const have = (v[kind] && v[kind][id]) || 0;
  const gave = Math.min(have, Math.floor(n));
  if (gave <= 0) return 0;
  const left = have - gave;
  if (left > 0) v[kind][id] = left; else delete v[kind][id];
  return gave;
}

// --- the check -------------------------------------------------------------

/**
 * Faults, for the data lane.
 *
 * Every assertion here is about a ROUND TRIP or a REFUSAL, not about the shape
 * of an object literal -- "an assertion about a table is not an assertion about
 * the build". What can actually go wrong with a store is that it loses
 * something, mints something, or lets a count go somewhere a count cannot go,
 * and those are what is checked.
 */
export function vaultFaults() {
  const f = [];
  const v = emptyVault();

  // A deposit and a withdrawal of the same thing conserve it.
  if (vaultDeposit(v, 'essences', 'fire', 3) !== 3) f.push('vault: deposit of 3 did not store 3');
  if (vaultCount(v, 'essences', 'fire') !== 3) f.push('vault: count after deposit is not 3');
  if (vaultWithdraw(v, 'essences', 'fire', 2) !== 2) f.push('vault: withdrawal of 2 did not give 2');
  if (vaultCount(v, 'essences', 'fire') !== 1) f.push('vault: count after withdrawal is not 1');

  // An empty stack is DELETED rather than left at zero, so `vaultList` does
  // not grow a row of nothing for every essence ever passed through.
  vaultWithdraw(v, 'essences', 'fire', 1);
  if ('fire' in v.essences) f.push('vault: an emptied stack was left in the record');

  // You cannot take what is not there.
  if (vaultWithdraw(v, 'stones', 'nowhere', 5) !== 0) f.push('vault: withdrew from an empty stack');
  if (vaultWithdraw(v, 'essences', 'fire', 1) !== 0) f.push('vault: withdrew from a deleted stack');

  // The cap refuses the overflow rather than absorbing it -- the return value
  // is what the caller removes from the backpack, so a cap that lied here
  // would destroy items.
  vaultDeposit(v, 'stones', 'cap', VAULT_STACK_CAP);
  const over = vaultDeposit(v, 'stones', 'cap', 5);
  if (over !== 0) f.push(`vault: stored ${over} past the stack cap`);
  if (vaultCount(v, 'stones', 'cap') !== VAULT_STACK_CAP) f.push('vault: stack went past the cap');

  // A partial deposit reports the partial number.
  const part = emptyVault();
  vaultDeposit(part, 'stones', 'p', VAULT_STACK_CAP - 2);
  if (vaultDeposit(part, 'stones', 'p', 5) !== 2) f.push('vault: partial deposit did not report 2');

  // Nonsense in, empty chest out -- never a throw.
  for (const bad of [null, undefined, 0, 'x', [], { essences: 'no' }, { stones: { a: -1, b: 'x', c: 1e9 } }]) {
    let n;
    try { n = normaliseVault(bad); } catch (e) { f.push(`vault: normalise threw on ${JSON.stringify(bad)}`); continue; }
    if (!n || typeof n !== 'object' || !n.essences || !n.stones) f.push('vault: normalise returned a broken chest');
  }
  const clamped = normaliseVault({ stones: { a: -1, b: 'x', c: 1e9 } });
  if ('a' in clamped.stones || 'b' in clamped.stones) f.push('vault: normalise kept a junk count');
  if (clamped.stones.c !== VAULT_STACK_CAP) f.push('vault: normalise did not clamp a huge count');

  // An unknown kind is refused rather than minting a third drawer.
  const k = emptyVault();
  if (vaultDeposit(k, 'gear', 'sword', 1) !== 0) f.push('vault: accepted a kind it does not hold');
  if ('gear' in k) f.push('vault: an unknown kind created a drawer');

  // The totals agree with the list.
  const t = emptyVault();
  vaultDeposit(t, 'essences', 'a', 2);
  vaultDeposit(t, 'essences', 'b', 5);
  if (vaultTotal(t, 'essences') !== 7) f.push('vault: total does not match what went in');
  if (vaultList(t, 'essences').length !== 2) f.push('vault: list length does not match the drawers');
  if (vaultList(t, 'essences').map(e => e.id).join(',') !== 'a,b') f.push('vault: list is not id-sorted');

  return f;
}
