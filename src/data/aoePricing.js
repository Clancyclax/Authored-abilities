// ===========================================================================
// ROUND 222 -- WHAT AN AREA COSTS, in one place.
//
// These two numbers have lived in awakening.js since round 76, beside
// `priceAsAoe`, and the policy they encode is written there:
//
//   "an AOE's PER-TARGET damage is half what the same socket's single-target
//    ability would have rolled, and its cooldown is at least 1.5x that
//    ability's."
//
// essenceCharter.js needs them, because Vast's whole charter is turning
// single-target abilities into area ones and an area that was not repriced
// is a free doubling. It cannot IMPORT them from awakening.js: awakening.js
// imports the charter, and a cycle between a 15,000-line generator and a leaf
// data module is a load-order bug waiting for the day someone reorders the
// imports -- the same argument abilityCanon.js makes about abilityCard.js.
//
// So they move here and awakening.js imports them, which leaves exactly one
// definition. Copying them into the charter was the other option and it is
// the fault this project keeps finding: two numbers that must agree are one
// number. awakening.js re-exports both under their old names, so nothing
// downstream changes.
// ===========================================================================

/** An AOE's per-target damage, as a fraction of the single-target roll. */
export const AOE_TARGET_FRAC = 0.5;

/** The floor an AOE's cooldown is held to, as a multiple of the
 *  single-target ability's. A floor rather than an assignment: a ring that
 *  already recharges four times slower than a bolt is left where it is. */
export const AOE_COOLDOWN_MULT = 1.5;
