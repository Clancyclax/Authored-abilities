// ============================================================================
// ROUND 283 -- THE USER'S THREE LEGENDARIES, AND WHAT MAKES THEM RUN.
//
// Their text is his, word for word (legendaryText.js, generated from
// data/canon/items_batch01.txt). This file is the GAME's side: which weapon
// each is built on, and the numbers behind each line. The card prints his
// lines; nothing here is printed except the Numbers line and the blade state.
//
// His rulings on the questions this raised:
//   "A feature of the legendary staff is that it can be wielded in 1 hand."
//     -> the Spell Lance is a one-handed staff, so it and the Tithe (a wand)
//        can be held together, which is what "wielding both" needs.
//   Two "Basic attack" lines: "Tap and hold"
//     -> tapping fires the first, holding channels the second.
//   Growth: "Add ranks to quintessence", "Add them as real materials", and
//     the Ritual is performed in the Society's ritual hall.
//
// A weapon is not an armour piece, so a legendary WEAPON lives beside the
// gear rather than in it: the player owns it as a weapon id
// (`legendary_<key>`), and `player.legendaries[wid]` records its rank, the
// stacks on its blade, and how it grows.
// ============================================================================
import { LEGENDARY_TEXT } from './legendaryText.js';
import { WEAPONS } from './weapons.js';
import { LEGENDARY_BASES } from './legendaryBases.js';
import { growthBlock, nextGrowthRank, GROWTH_RANKS } from './growthMaterials.js';

export const LEGENDARY_PREFIX = 'legendary_';
export const legendaryWid = (key) => `${LEGENDARY_PREFIX}${key}`;
export const legendaryKeyOf = (wid) => (String(wid || '').startsWith(LEGENDARY_PREFIX) ? String(wid).slice(LEGENDARY_PREFIX.length) : null);

/** How long an attack button must be held before the second basic attack
 *  takes over from the first. A tap is anything shorter. */
export const HOLD_SECONDS = 0.3;

export const AUTHORED_LEGENDARIES = {
  // "Basic attack: Explosive disruptive-force bolt. Inflicts [Spell Impetus].
  //  Basic attack: Disruptive-force beam. Consumes mana. Sustaining the beam
  //  on a target periodically inflicts [Spell Impetus]. Effect: Increase the
  //  mana consumption when casting a spell to increase the effect. Effect is
  //  further increased if wielding both [...] and [Magister's Tithe]."
  spellLance: {
    key: 'spellLance', base: LEGENDARY_BASES.spellLance, hands: 1, color: '#9575cd', magicalTools: true,
    tap: { explodeRadius: 56, inflict: 'spellImpetus' },
    hold: { kind: 'beam', range: 260, tick: 0.25, manaPerSec: 8, dmgFrac: 0.45, inflictEvery: 1.5, inflict: 'spellImpetus' },
    // Spells cost this much more mana and do this much more; with the Tithe
    // in the other hand, the larger pair.
    spellFocus: { cost: 0.25, dmg: 0.2, bothCost: 0.4, bothDmg: 0.4 },
    // [Spell Impetus]: consumed by an offensive spell, each instance adding this.
    impetusPerStack: 0.15,
  },
  // "Basic attack: Disruptive-force beam. Inflicts [Mana Siphon]. Basic
  //  attack: Mana draining beam. This effect is increased if wielding both."
  magistersTithe: {
    key: 'magistersTithe', base: LEGENDARY_BASES.magistersTithe, wand: true, hands: 1, color: '#4fc3f7', magicalTools: true,
    tap: { kind: 'pulse', range: 220, dmgFrac: 0.9, inflict: 'manaSiphon' },
    hold: { kind: 'drain', range: 220, tick: 0.25, manaPerSec: 5, dmgFrac: 0.25, bothMult: 1.5 },
  },
  // "If a special attack that applies an affliction is made with this sword,
  //  but the subject of the attack has a physical immunity to it, an instance
  //  of [Stone Cutter] is applied to the blade. [...] a magical immunity [...]
  //  [Spell Breaker]." Both are "(magic, stacking)" and "All attacks deal
  //  additional ... damage".
  dreadSalvation: {
    key: 'dreadSalvation', base: LEGENDARY_BASES.dreadSalvation, hands: 1, color: '#ffb74d',
    // Each instance adds this share of the sword's base damage to every hit,
    // as its own force; highly effective (double) against the defences named.
    perStack: 0.05, stackCap: 100,
  },
};
export const AUTHORED_KEYS = Object.keys(AUTHORED_LEGENDARIES);

/** Immunity tags that are a BODY's (physical) rather than a nature's
 *  (magical). A thing with no blood cannot bleed; a thing made of fire does
 *  not burn -- both are physical. Curses and holy/unholy afflictions are
 *  refused by what a thing IS, which is the magical kind. */
export const PHYSICAL_IMMUNITY_TAGS = ['blood', 'wounding', 'poison', 'disease', 'burning', 'frost', 'shock'];

/** The rank's weapon power: half again per rank, so a grown legendary keeps
 *  pace with the rank its wielder has reached. */
export function legendaryPower(rank) {
  return 1 + 0.5 * Math.max(0, GROWTH_RANKS.indexOf(rank));
}

/** The weapon def a legendary is swung as. Built on its base weapon, so it
 *  draws, aims and costs like one -- with the legendary's name, colour,
 *  hands, and damage at its rank. */
export function legendaryWeaponDef(key, rec = {}) {
  const L = AUTHORED_LEGENDARIES[key];
  const T = LEGENDARY_TEXT[key];
  const b = L && WEAPONS[L.base];
  if (!L || !b) return null;
  const rank = rec.rank || 'iron';
  return {
    ...b,
    id: legendaryWid(key), baseId: L.base, name: T ? T.name : key,
    color: L.color, hands: L.hands, legendary: key, wand: !!L.wand,
    base: Math.round(b.base * legendaryPower(rank)),
    magical: L.base === 'staff' ? true : b.magical,
  };
}

/** The growth block to the next rank. [Dread Salvation]'s own conditions
 *  for iron -> bronze, word for word; past that, and for the two whose text
 *  gives none, the same conditions with the rank moved up -- the only shape
 *  of growth condition the user has written. */
export function legendaryGrowth(key, rank = 'iron') {
  const to = nextGrowthRank(rank);
  if (!to) return null;
  const own = LEGENDARY_TEXT[key] && LEGENDARY_TEXT[key].growth;
  if (own && own.to === to) return { ...growthBlock(to, own.conditions), verbatim: true };
  const template = LEGENDARY_TEXT.dreadSalvation.growth.conditions;
  return { ...growthBlock(to, template.map(l => l.replace(/\bbronze\b/g, to))), verbatim: false };
}

/** The card: his lines, with the current rank in the header, his growth
 *  block replaced by the one that applies now, and the game's reading. */
export function legendaryCardLines(key, rec = {}) {
  const T = LEGENDARY_TEXT[key];
  if (!T) return [];
  const rank = rec.rank || 'iron';
  const out = [`Item: [${T.name}] (${rank} rank [growth], legendary) ${T.desc} (${T.typeTags}).`];
  let inGrowth = false;
  for (const l of T.lines) {
    if (/^Growth Conditions/.test(l)) { inGrowth = true; continue; }
    if (inGrowth) continue;
    out.push(l);
  }
  if (key === 'dreadSalvation') {
    const s = rec.stacks || {};
    out.push(`On the blade: ${s.stoneCutter || 0} [Stone Cutter], ${s.spellBreaker || 0} [Spell Breaker].`);
  }
  const g = legendaryGrowth(key, rank);
  if (g) {
    out.push(`Growth Conditions (${g.to}):`);
    for (const c of g.conditions) out.push(`•${c}`);
  } else {
    out.push('Fully grown: gold is the highest rank.');
  }
  return out;
}
