// ROUND 49 -- DANGLING-ID INTEGRITY CHECK.
//
// The bug this exists for: an awakening stone id that is not in STONE_CATALOG
// reached the player's backpack, and the items tab rendered it as
// `STONE_DEFS[id].name`. That is a TypeError inside a .map() over the whole
// bag, so one bad id did not produce one bad row -- it blanked the entire
// inventory screen. The same shape lived in the essence bag
// (`ESSENCES[id].color`) and in formatBuff (`MINOR_STAT_BY_KEY[b.stat].kind`).
//
// Those three are guarded now, and guarding them is the right thing to do at a
// render boundary. But a guard turns a crash into a red row, and a red row is
// still a bug that shipped. The actual failure is upstream: a LIST somewhere
// names an id that no catalog defines, and nothing checks.
//
// That is what this does. It walks every table in the game that holds ids and
// asks whether each id resolves, so a dangling one is found the moment the
// module graph loads rather than the moment a player opens their bag. Round 49
// alone produced two of these by hand -- six invented stone names in
// LEVER_STONE_KEYS, and `stoneMonolith` in a screenshot script -- and both were
// found by accident.
//
// Deliberately pure data: no scene, no DOM, so the suite can call it directly
// and so it can be run from a script during a future round's authoring.

import { STONE_CATALOG, STONE_IDS } from './stoneCatalog.js';
import { ESSENCE_CATALOG, ESSENCE_IDS } from './essenceCatalog.js';
import { ESSENCES } from './abilities.js';
import { ESSENCE_MOTIFS } from './essenceMotifs.js';
import { LEVERS } from './essenceLevers.js';
import { PARTY, ZEKE_FARM } from './party.js';
import { GENERATED_SIGNATURES } from './essenceSignatures.js';
import { namedRelicItem } from './awakening.js';
import { MINOR_STAT_BY_KEY } from './stats.js';
import { LEVER_STONE_KEYS, CONFLUENCE_NAMES } from './awakening.js';

/**
 * Every dangling id in the game's own data, as a list of
 * `{ where, id, expected }`. Empty means everything resolves.
 */
export function validateDataIds() {
  const bad = [];
  const check = (where, id, table, expected) => {
    if (id == null) return;
    if (!table[id]) bad.push({ where, id, expected });
  };

  // --- the two catalogs against their own id lists ---
  for (const id of STONE_IDS) check('STONE_IDS', id, STONE_CATALOG, 'STONE_CATALOG');
  for (const id of ESSENCE_IDS) check('ESSENCE_IDS', id, ESSENCE_CATALOG, 'ESSENCE_CATALOG');
  // ESSENCES is the tuned view of the catalog; every catalog entry must survive
  // into it or an essence exists that has no castable form.
  for (const id of Object.keys(ESSENCE_CATALOG)) check('ESSENCE_CATALOG', id, ESSENCES, 'ESSENCES');
  // ...and every motif must belong to a real essence.
  for (const id of Object.keys(ESSENCE_MOTIFS)) check('ESSENCE_MOTIFS', id, ESSENCE_CATALOG, 'ESSENCE_CATALOG');

  // --- every motif's levers must be real levers ---
  for (const [eid, m] of Object.entries(ESSENCE_MOTIFS)) {
    for (const lev of (m.levers || [])) {
      if (!LEVERS[lev]) bad.push({ where: `ESSENCE_MOTIFS.${eid}.levers`, id: lev, expected: 'LEVERS' });
    }
  }

  // --- ROUND 49: the stone-granted lever gate. Six invented stone names got
  //     into this list on the first draft, and a dead id there is a door that
  //     silently never opens -- worse than no door. ---
  for (const [lever, keys] of Object.entries(LEVER_STONE_KEYS)) {
    if (!LEVERS[lever]) bad.push({ where: 'LEVER_STONE_KEYS', id: lever, expected: 'LEVERS' });
    for (const k of keys) check(`LEVER_STONE_KEYS.${lever}`, k, STONE_CATALOG, 'STONE_CATALOG');
  }

  // --- the team: their essences, and the two stones seeded into each slot ---
  for (const m of PARTY) {
    for (const eid of ((m.build || {}).essences || [])) {
      check(`PARTY.${m.id}.essences`, eid, ESSENCES, 'ESSENCES');
    }
    const slots = (m.build || {}).slotStones || [];
    slots.forEach((list, i) => {
      for (const sid of (list || [])) {
        check(`PARTY.${m.id}.slotStones[${i}]`, sid, STONE_CATALOG, 'STONE_CATALOG');
      }
    });
  }

  return bad;
}

/**
 * Buff rows whose `stat` is not a real minor stat. Separate from the id sweep
 * because a buff carries a STAT KEY rather than an entity id, and because this
 * is the one formatBuff used to throw on.
 */
export function validateBuffStats(items) {
  const bad = [];
  for (const it of (items || [])) {
    for (const b of ((it && it.buffs) || [])) {
      if (!MINOR_STAT_BY_KEY[b && b.stat]) {
        bad.push({ where: (it && it.name) || 'item', id: (b && b.stat), expected: 'MINOR_STAT_BY_KEY' });
      }
    }
  }
  return bad;
}

/**
 * ROUND 78 (bug 2) -- NO ESSENCE MAY BE NAMED AFTER A CONFLUENCE.
 *
 * The user: "Avatar should be exclusively a confluence essence. No confluence
 * essence should also be a regular essence, review and compare the lists."
 *
 * Two had drifted into both -- Avatar and Alchemy -- and NOTHING would ever
 * have found them, because both lists were individually correct. It is only
 * the comparison that fails, and nobody was making it. Round 77 walked
 * straight into the consequence: it read the user's ten named ability sources
 * against both catalogues, found Avatar in each, and filed it as an essence
 * route when they meant the confluence.
 *
 * A confluence is identified by its NAME everywhere in the generator, so a
 * duplicate name is a genuine ambiguity rather than an untidiness: a build
 * that formed the Avatar confluence and a player carrying an Avatar essence
 * were two different things that answered to one word.
 *
 * STONES ARE EXEMPT, on the user's correction: "Awakening stones can share
 * names." Seven do (Avatar, Alchemy, Karmic, Sky, Undeath, Vision and Wrath),
 * a stone is a separate keyspace, and a Stone of Wrath is not the Wrath
 * confluence. So this checks essences and only essences.
 */
export function validateEssenceNames() {
  const bad = [];
  const conf = new Set(CONFLUENCE_NAMES || []);
  for (const [id, e] of Object.entries(ESSENCE_CATALOG)) {
    if (e && e.name && conf.has(e.name)) {
      bad.push({ where: `ESSENCE_CATALOG.${id}`, id: e.name, expected: 'a name no confluence uses' });
    }
  }
  return bad;
}

// ROUND 79 (bug 11) -- THE ITEM A SIGNATURE NAME PROMISES.
//
// essenceSignatures.js is GENERATED and 1,278 rows long, and nine of them
// named an item the ability does not conjure: "Summon Gauntlets of Blades" on
// a conjured weapon, "Sigil Dagger" on a trinket, "Summon Gauntlets of the
// Wolf" on a bonded creature. Nothing checked, because the generator's gate
// and the runtime's gate both asked whether the right word was ANYWHERE in the
// name rather than whether it was the head of it.
//
// The nine are renamed. This is what stops the tenth: the file is regenerated
// from a script that lives outside src/, so the only place that can catch a
// bad row on the way in is a check that runs at boot against the shipped file.
const SIGNATURE_RELIC_SLOT = {
  summon_weapon: 'weapon', summon_armor: 'armour',
  summon_gear: 'trinket', summon_bonded: 'creature',
};
export function validateSignatureNames() {
  const bad = [];
  for (const [eid, list] of Object.entries(GENERATED_SIGNATURES || {})) {
    const essName = (ESSENCE_CATALOG[eid] || {}).name;
    for (const row of (list || [])) {
      const want = SIGNATURE_RELIC_SLOT[row.catKey];
      if (!want) continue;
      // An essence's OWN name is identity, not a mechanical claim -- a Claw
      // essence may say "Claw" in any of its names. Same exemption
      // nameContradictsSpec makes, for the same reason.
      let n = String(row.name || '');
      if (essName && essName.length > 2) {
        n = n.replace(new RegExp(essName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
      }
      const item = namedRelicItem(n);
      if (!item) continue;
      const wrong = want === 'creature' ? item.cls !== 'weapon' : item.cls !== want;
      if (wrong) {
        bad.push({ where: `GENERATED_SIGNATURES.${eid}`, id: row.name,
          expected: `a ${want}, not a ${item.cls} ("${item.word}")` });
      }
    }
  }
  return bad;
}

/** One-line summary for a console warning at boot. */
export function integrityReport() {
  // ROUND 78 -- the name clash reports through the same channel as a dangling
  // id, because it is the same class of fault: a table that is individually
  // fine and wrong against another table.
  const bad = validateDataIds().concat(validateEssenceNames())
    .concat(validateSignatureNames());
  if (!bad.length) return null;
  return `[integrity] ${bad.length} dangling id(s): `
    + bad.slice(0, 6).map(b => `${b.where} -> ${b.id} (no ${b.expected})`).join('; ')
    + (bad.length > 6 ? ` ...and ${bad.length - 6} more` : '');
}
