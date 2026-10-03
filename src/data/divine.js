// ROUND 36 -- the eight gods, their divine essences, and what bonding one
// costs you.
//
// >>> READ THE STANDING DIRECTIVE FIRST (MIGRATION_PLAN.md, round 5). <<<
// This file MODIFIES the essence architecture; it does not descope any of
// it. Specifically, all of the following are untouched and must stay that
// way: the 3 manual essence slots, the auto-formed confluence as the 4th,
// 4 awakening-stone sockets per slot, 12+ candidate ability generation, the
// 20-ability / 12-active / 8-passive kit shape, the rare limit-breakers, and
// the confluence-gated Normal -> Iron rank-up.
//
// What round 36 changes, on the user's explicit instruction:
//
//   "Divine essences take the place of a confluence essence and permanently
//    tie that player to the god in question."
//   "bonding an essence/awakening stone is now permanent. The only way to
//    remove an essence is to equip a divine essence which will remove a
//    previously equipped confluence essence."
//   "Selling a divine essence granted to you will permanently mark the god
//    as unfriendly ... no additional conversations or quests with that god."
//
// So a divine essence occupies SLOT 3 -- the confluence slot -- overriding
// the computed confluence rather than replacing the machinery that computes
// it. The trio in slots 0-2 still forms a confluence internally; the divine
// simply outranks it for display, abilities and stone sockets. That is what
// keeps the protected system intact: pull the divine out of the equation and
// the original behaviour is exactly what remains.
//
// A divine def is deliberately the SAME SHAPE confluenceDefFor returns
// ({ id, name, color, theme, base, cooldown }) so confluenceInnateAbility
// and every downstream consumer take it with no special-casing.

// Themes come from awakening.js's vocabulary: 'heal' | 'guard' | 'aoe' |
// 'strike'. Each god gets the one its own domain implies.
export const DIVINE = {
  war: {
    god: 'war', name: 'Divine War', theme: 'strike', color: 0xc0392b,
    title: 'the Unbroken Line', floor: 'polished steel',
  },
  knowledge: {
    god: 'knowledge', name: 'Divine Knowledge', theme: 'aoe', color: 0x8e7cc3,
    title: 'the Ten Thousand Pages', floor: 'scholar stone',
  },
  death: {
    god: 'death', name: 'Divine Death', theme: 'strike', color: 0x4a4358,
    title: 'the Last Door', floor: 'black marble',
  },
  liberty: {
    god: 'liberty', name: 'Divine Liberty', theme: 'guard', color: 0x3aa7c4,
    title: 'the Open Hand', floor: 'pale marble',
  },
  heros: {
    god: 'heros', name: 'Divine Hero', theme: 'strike', color: 0xe0a83a,
    title: 'the Deed Remembered', floor: 'gilded brick',
  },
  purity: {
    god: 'purity', name: 'Divine Pure', theme: 'guard', color: 0xe8e6de,
    title: 'the Unmarked', floor: 'white stone',
  },
  healing: {
    god: 'healing', name: 'Divine Healing', theme: 'heal', color: 0x5fbf6a,
    title: 'the Green Mercy', floor: 'white marble',
  },
  dominion: {
    god: 'dominion', name: 'Divine Dominion', theme: 'guard', color: 0xb5892f,
    title: 'the Seated Crown', floor: 'gold brick',
  },
};

export const DIVINE_GODS = Object.keys(DIVINE);

// A divine essence is meant to be worth the permanence. A computed
// confluence's base is avg(3 essence bases) * 1.6, which lands near 10 with
// ordinary essences; 18 puts a divine clearly above any trio without making
// the three manual slots pointless (they still supply the whole 20-ability
// kit -- the divine only replaces the 4th slot's contribution).
export const DIVINE_BASE = 18;
export const DIVINE_COOLDOWN = 6;

// The odds a god approves on any single interaction. The user's number.
export const DIVINE_GRANT_CHANCE = 0.05;

/** A confluence-shaped def for a god's divine essence, or null. */
export function divineDefFor(god) {
  const d = DIVINE[god];
  if (!d) return null;
  return {
    id: `divine_${god}`,
    name: d.name,
    color: d.color,
    theme: d.theme,
    base: DIVINE_BASE,
    cooldown: DIVINE_COOLDOWN,
    divine: true,
    god,
  };
}

/** True for an inventory essence id that is a divine essence. */
export function isDivineId(id) {
  return typeof id === 'string' && id.startsWith('divine_');
}

/** The god a divine essence id belongs to, or null. */
export function godOfDivineId(id) {
  return isDivineId(id) ? id.slice('divine_'.length) : null;
}

export function godLabel(god) {
  const d = DIVINE[god];
  if (!d) return god;
  const proper = god === 'heros' ? 'Heroes' : god.charAt(0).toUpperCase() + god.slice(1);
  return `the God of ${proper}`;
}

export function godTitle(god) {
  return DIVINE[god] ? DIVINE[god].title : '';
}
