// ============================================================================
// ROUND 60 -- SAVING AND LOADING.
//
// THE RULE THIS FILE IS BUILT ON: save the INPUTS, rebuild the DERIVED.
//
// A kit's twenty abilities are a pure function of its three essences, four
// stones per slot and four bound attributes (rebuildKnownAbilities). Writing
// those twenty generated abilities into the save file would freeze them at the
// version that wrote it -- and this project has changed the generator in
// nineteen of the last twenty rounds. Round 59 alone re-derived every summon's
// damage. A save from round 58 would then load abilities that no longer match
// their own numbers, and nothing would report it.
//
// So a save stores the essences, the stones, the attributes and the progress,
// and the abilities are regenerated on load. A save written today still opens
// on a build a year from now, and opens with that build's abilities.
//
// What IS stored verbatim is everything that cannot be recomputed: where the
// player stands, what they are carrying, what they have killed, which gods
// they have offended, what the bounty board is offering.
// ============================================================================

// ROUND 74 (item 7) -- the save list shows the player's standing, and it comes
// from the same two functions the HUD uses rather than from a fourth copy of a
// level curve. See essenceRank.js's playerStandingFrom.
import { playerStandingFrom, formatStanding } from './essenceRank.js';
// ROUND 76 -- the god keys `player.divineGod` is drawn from. See blocker 2 in
// sanitiseSlots: this used to be checked against the essence catalogue.
import { GODS } from './gods.js';

export const SAVE_VERSION = 1;
export const SAVE_PREFIX = 'sparkstone.save.';
export const SAVE_SLOTS = 6;

// ===========================================================================
// ROUND 116, UPDATE 4 -- THE AUTOSAVE SLOT.
//
//   "Game needs an autosave feature, roughly every 5 minutes and every time
//    you enter town."
//   Asked whether it should take a numbered slot or have its own:
//   "3) Dedicated autosave slot"
//
// A STRING SLOT KEY, not a seventh number, and that is what makes the user's
// answer true rather than nearly true. `writeSave` keys on `SAVE_PREFIX +
// save.slot` and `listSaves` walks 0..SAVE_SLOTS-1, so 'auto' is storage the
// manual slot list cannot see, cannot offer, and cannot be told to overwrite
// -- the six slots the player manages stay exactly six, and no autosave can
// ever eat the save someone made before a boss.
//
// It is still a save file in every other respect: same shape, same version,
// same `readSave`, so loading it is the same code path as loading slot 3 and
// there is no second restore to keep in step with the first.
export const AUTOSAVE_SLOT = 'auto';
/** How often the clock-driven autosave fires, in seconds. "roughly every 5
 *  minutes" -- of real time played, not of wall clock: the timer is stepped by
 *  the scene's own dt, so a paused or backgrounded game does not bank a save
 *  of a character standing still. */
export const AUTOSAVE_INTERVAL_SECONDS = 300;

/** The autosave's own row, or null when nothing has been written yet. Kept
 *  beside `listSaves` rather than folded into it, because the two answer
 *  different questions: that one is "which of your six", this is "is there a
 *  place to pick up from". */
export function readAutosave() {
  const s = readSave(AUTOSAVE_SLOT);
  return s ? { slot: AUTOSAVE_SLOT, empty: false, auto: true, ...s.summary,
               savedAt: s.savedAt, label: s.label } : null;
}

// Fields on `player` that describe a MOMENT rather than a run: mid-swing
// timers, the current cast, invulnerability frames, transient aim. Restoring
// them would load the player into the middle of an animation that has no
// target, so they are dropped and the defaults stand.
const TRANSIENT = new Set([
  'attacking', 'atkAnimT', 'aimAngle', 'casting', 'invuln', 'deathT',
  'meditating', 'sprinting', 'handCooldown', 'weaponCooldownT',
  'abilityCdByKey', 'debuffs', 'debuffDR', 'dead',
  // Derived from the slots on load -- see the header.
  'knownAbilities', 'spineInfo', 'confluence',
]);

// ===========================================================================
// ROUND 75 -- SETS AND MAPS SURVIVE THE FILE.
//
// `plain()` walked a Set the same way it walks any object: no own enumerable
// properties, so a Set came out as `{}` and went into the file as `{}`. Three
// player fields are collections --
//
//     ownedWeapons    Set    every weapon the player has bought or been given
//     seenMonsters    Set    the bestiary
//     conjuredWeapons Map    relic weapons -> the ability that conjured them
//
// -- so loading a save handed the player an empty object in place of each.
// `p.ownedWeapons.has(...)` then throws, and so does the spread in
// `_reconcileConjuredItems`, which is where it finally surfaced: loading a
// save twice in one session crashed with "p.conjuredWeapons is not iterable".
//
// The quiet half is worse than the crash. A player who loads a save has, as
// far as `ownedWeapons` is concerned, bought nothing -- every weapon they own
// is gone, and the bestiary with it.
//
// Encoded with an explicit tag rather than as a bare array, because a bare
// array is ambiguous on the way back in (`inventory.essences` is genuinely an
// array of ids and must stay one) and because the tag makes an old file
// distinguishable from a new one, which the reviver below needs.
const SET_TAG = '__set';
const MAP_TAG = '__map';

/** Anything that is plain data. Sprites and Phaser objects are not. */
function plain(v, depth = 0) {
  if (v === null || v === undefined) return v;
  const t = typeof v;
  if (t === 'number' || t === 'string' || t === 'boolean') return v;
  if (depth > 6) return undefined;
  if (v instanceof Set) {
    return { [SET_TAG]: [...v].map((x) => plain(x, depth + 1)).filter((x) => x !== undefined) };
  }
  if (v instanceof Map) {
    return { [MAP_TAG]: [...v].map(([k, val]) => [plain(k, depth + 1), plain(val, depth + 1)])
      .filter(([, val]) => val !== undefined) };
  }
  if (Array.isArray(v)) {
    const out = v.map((x) => plain(x, depth + 1)).filter((x) => x !== undefined);
    return out;
  }
  if (t === 'object') {
    // A Phaser display object carries a `scene` back-reference; following it
    // would serialise the entire game.
    if (v.scene || v.texture || v.displayList || typeof v.setDepth === 'function') return undefined;
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === 'sprite' || k === 'spr' || k === 'gfx' || k === 'text') continue;
      const p = plain(val, depth + 1);
      if (p !== undefined) out[k] = p;
    }
    return out;
  }
  return undefined;
}

/** The save payload for a live scene. */
export function captureSave(scene, slot, label) {
  const p = scene.player || {};
  const player = {};
  for (const [k, v] of Object.entries(p)) {
    if (TRANSIENT.has(k)) continue;
    const val = plain(v);
    if (val !== undefined) player[k] = val;
  }
  return {
    v: SAVE_VERSION,
    slot,
    label: label || p.name || 'Wanderer',
    savedAt: Date.now(),
    // The summary the load menu reads without having to parse the whole run.
    summary: {
      name: p.name || 'Wanderer',
      rank: p.rank || 'normal',
      // ROUND 74 (item 7) -- THE STANDING, not a level off a dead curve.
      //
      // `Math.floor(p.xp / 100) + 1` was the third of four copies of the
      // round-5 whole-player level, and the save list printed it as "Lv N"
      // beside a rank derived from something else entirely -- so a character
      // could be listed as "Lv 12 · iron", which is two different accounts of
      // the same save. It is the essence standing now, formatted by the one
      // formatter the HUD uses, so the list and the game agree.
      //
      // `level` is kept as a field name and as a number for older saves that
      // carry one; `standing` is what the list actually shows.
      level: Math.floor((p.xp || 0) / 100) + 1,
      standing: formatStanding(playerStandingFrom(p.slotProgress || [], p)),
      coins: plain(p.coins) || {},
      kills: scene.kills || 0,
      region: (scene.currentRegion && scene.currentRegion.name) || '',
      essences: (p.slotEssence || []).slice(),
    },
    world: { x: (scene.world || {}).x || 0, y: (scene.world || {}).y || 0 },
    // ROUND 76 (item 6, defect 4) -- THE CLOCK, which was never saved.
    //
    // `_clockT` is real seconds since the run began, and FOUR systems are
    // derived from it: the time of day, the day index, the quest WEEK, and a
    // monster pack's `clearedUntil`. None of them were persisted, so every
    // load put the world back at 08:00 on day one of week one.
    //
    // The quest week is the one that damaged a save. Board notices are derived
    // from `${boardKey}|${week}` (see _boardTaken above, which saves only what
    // has been taken), so a load re-rolled every board back to week one --
    // every notice the player had already taken became available again, and
    // any in-progress villager request was replaced by whatever week one
    // offers. The player's own progress was intact and the WORLD had gone
    // back in time around it.
    //
    // Saving the input rather than the four derived values, which is this
    // file's own rule: restore the clock and the day, the hour, the week and
    // the pack timers all come back with it.
    clockT: (scene._clockT || 0),
    regionId: (scene.currentRegion && scene.currentRegion.id) || null,
    kills: scene.kills || 0,
    bounties: plain(scene.availableBounties) || [],
    // ROUND 64 -- the boards are derived from `${boardKey}|${week}` (see the
    // header rule: save the inputs, rebuild the derived), so all a save needs
    // is the small mutable part -- which notices have been taken.
    boardTaken: [...(scene._boardTaken || [])],
    // ROUND 65 -- the god chains need NOTHING here. `player.godChains` and
    // `player.godStanding` are ordinary player fields, so the loop above
    // already carries them, and _doLoad copies every player field back. A
    // step's actual target is derived from the chain position (see
    // _godStepOffer, seeded on the step id), so restoring the position
    // restores the quest. Written down because the first draft added two
    // top-level copies of data the file was already saving twice over.
    party: plain(scene.party) || [],
    player,
  };
}

// --- storage ---------------------------------------------------------------
// localStorage, which is per-origin and survives a reload. The game ships as
// files the player serves themselves, so this is their disk.

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, val) {
  try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
}

/**
 * Rebuild the Sets and Maps a save carries, and repair the ones written before
 * this round.
 *
 * `known` names the fields that MUST end up as collections whatever the file
 * says, keyed to what they are. A file written before round 75 has `{}` in all
 * three, and `{}` is exactly what an empty collection looks like -- so an old
 * save cannot be told from a save by a player who really owns nothing. The
 * caller repairs `ownedWeapons` from the hands afterwards, which is the one
 * field where empty is not a survivable answer.
 *
 * Returns the number of fields that had to be rebuilt from a legacy `{}`, so
 * the loader can say the file was an old one rather than silently differing.
 */
export const SAVE_COLLECTIONS = { ownedWeapons: 'set', seenMonsters: 'set', conjuredWeapons: 'map' };

export function reviveCollections(player, known = SAVE_COLLECTIONS) {
  let legacy = 0;
  for (const [field, kind] of Object.entries(known)) {
    const v = player[field];
    if (kind === 'set') {
      if (v instanceof Set) continue;
      if (v && Array.isArray(v.__set)) { player[field] = new Set(v.__set); continue; }
      if (Array.isArray(v)) { player[field] = new Set(v); continue; }
      player[field] = new Set();
      if (v !== undefined) legacy++;
    } else {
      if (v instanceof Map) continue;
      if (v && Array.isArray(v.__map)) { player[field] = new Map(v.__map); continue; }
      if (Array.isArray(v)) { player[field] = new Map(v); continue; }
      player[field] = new Map();
      if (v !== undefined) legacy++;
    }
  }
  return legacy;
}

export function writeSave(save) {
  return safeSet(SAVE_PREFIX + save.slot, JSON.stringify(save));
}

export function readSave(slot) {
  const raw = safeGet(SAVE_PREFIX + slot);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    // A save from a future version is not readable; one from the past is, and
    // gets whatever migration it needs here.
    if (!s || typeof s !== 'object' || (s.v || 0) > SAVE_VERSION) return null;
    return s;
  } catch (e) { return null; }
}

export function deleteSave(slot) {
  try { window.localStorage.removeItem(SAVE_PREFIX + slot); return true; } catch (e) { return false; }
}

/** Every slot, occupied or not, in menu order. */
export function listSaves() {
  const out = [];
  for (let i = 0; i < SAVE_SLOTS; i++) {
    const s = readSave(i);
    out.push(s ? { slot: i, empty: false, ...s.summary, savedAt: s.savedAt, label: s.label }
      : { slot: i, empty: true });
  }
  return out;
}

export function hasAnySave() {
  // ROUND 116, UPDATE 4 -- the autosave counts. This gates the title screen's
  // Continue button, and a player whose only save is the automatic one is
  // exactly the player that button exists for.
  return !!readAutosave() || listSaves().some((s) => !s.empty);
}

/**
 * Drop anything the current build no longer knows about.
 *
 * The header above promises a save written today opens on a build a year from
 * now. That promise was FALSE until this function existed, and the round-60
 * suite is what proved it: a save carrying an essence id the build had since
 * renamed took `rebuildKnownAbilities` straight into "Cannot read properties of
 * undefined (reading 'name')" and the game died on load, with the save file
 * looking fine and the player having no way to tell what went wrong.
 *
 * Content gets renamed and retired between rounds. So the slots are checked
 * against the live catalogues on the way in, an unknown id becomes an empty
 * socket, and the run opens with a gap in it instead of not opening at all.
 * Returns what was dropped so the caller can say so rather than silently
 * shrinking somebody's build.
 */
export function sanitiseSlots(player, essences, stoneCatalog) {
  const dropped = [];
  const knownE = essences || {};
  const knownS = stoneCatalog || {};
  if (Array.isArray(player.slotEssence)) {
    player.slotEssence = player.slotEssence.map((id) => {
      if (!id || knownE[id]) return id || null;
      dropped.push(id); return null;
    });
  }
  if (Array.isArray(player.slotStones)) {
    player.slotStones = player.slotStones.map((row) => (Array.isArray(row)
      ? row.map((id) => {
        if (!id || knownS[id]) return id || null;
        dropped.push(id); return null;
      })
      : row));
  }
  // ===== ROUND 76 -- BLOCKER 2: A BONDED GOD WAS DESTROYED ON EVERY LOAD ====
  //
  // This checked `player.divineGod` against `knownE`, the ESSENCE catalogue.
  // But `divineGod` holds a GOD key -- 'war', 'death', 'liberty' -- and the
  // essence catalogue is keyed by essence ids like 'essSin'. The lookup could
  // never match, so the branch fired every single time and every bonded god
  // was dropped on every save/load, with the player told "1 slot no longer
  // exists and was emptied".
  //
  // The cost was not one slot. The divine bond gates the DISCIPLE track for
  // all eight gods -- 112 of the game's 224 god quest steps -- plus the divine
  // confluence override. Half the god content in the game was unreachable by
  // anyone who had ever loaded a save.
  //
  // Checked against GODS now, which is the list `divineGod` is actually drawn
  // from. A god key that no longer exists still drops, which is what this
  // branch was written to do.
  if (player.divineGod && typeof player.divineGod === 'string'
      && !GODS.includes(player.divineGod)) {
    dropped.push(player.divineGod);
    player.divineGod = null;
  }
  return dropped;
}

/** "3 minutes ago", for the load menu. */
export function agoText(ms) {
  if (!ms) return '';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
