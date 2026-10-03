// ============================================================================
// ROUND 278 -- WHERE A CANON ABILITY COMES FROM, AND THAT IT COMES OUT EXACT.
//
//   "If an ability is called "Haemorrhage" it should be identical to the
//    cannon ability."
//   Asked where canon abilities should appear: "Cannon and very similar."
//   Asked what "very similar" means: near-synonym stones, drafted for review.
//
// A kit gets a canon ability when it holds the canon PAIRING: the canon
// essence with the canon awakening stone, or the essence alone for an innate.
// What it gets is `canonSpec(key)` -- a fresh copy of the exemplar, stamped
// with the kit's identity fields and nothing else. No lever, rider, charter,
// weapon spill, bolt or summon is ever added to it: rebuildKnownAbilities
// re-copies every canon ability at the very end, after all of its passes.
//
// A pairing only switches on when the ability's MECHANICS have been built to
// match its text (`RUNTIME_READY`). Placing an ability whose card says one
// thing while the game does another would be the same fault this round
// exists to remove, one layer down.
//
// Near-synonym stones ("very similar") wait for the user's approval of the
// draft list; `NEAR_SYNONYM_STONES` is empty until then.
// ============================================================================
import { CANON_EXEMPLARS } from './abilityCanon.js';
import { CANON_TEXT } from './canonText.js';
import { canonView, CANON_APPROVED_EDITS } from './canonApproved.js';   // ROUND 280
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { CANON_STONE_PICKS_03, CANON_RUNTIME_PENDING } from './canonPlacement03.js';   // ROUND 287

/** Canon abilities whose mechanics now do what their text says. */
// ROUND 279 -- Midnight Eyes: its four rungs are built (perception case,
// `_nightVeil`, `_lightDim`, `_auraSenseTiles`) and, as a passive, it has a
// switch like every passive.
// ROUND 284 -- "All cannon abilities need to be working in game": every paste
// now has its runtime (canonRuntime*Mixin.js), so every paste is placed.
// ROUND 287 -- ...except the pastes whose runtime is still being built this
// night (canonPlacement03.js): a card that says one thing while the game does
// nothing is the fault this set exists to prevent.
export const RUNTIME_READY = new Set(Object.keys(CANON_TEXT).filter(k => !CANON_RUNTIME_PENDING.has(k)));



/** Approved near-synonyms of a canon stone, by stone id. Empty until the
 *  user approves the draft (CANON_PLACEMENT_DRAFT_r278.csv). */
export const NEAR_SYNONYM_STONES = {};

const essenceIdByName = (() => {
  const m = {};
  for (const [id, e] of Object.entries(ESSENCE_CATALOG)) m[String(e.name).toLowerCase()] = id;
  return m;
})();
const stoneIdByName = (() => {
  const m = {};
  for (const [id, s] of Object.entries(STONE_CATALOG)) m[String(s.name).toLowerCase()] = id;
  return m;
})();

export function essenceIdFor(name) {
  return essenceIdByName[String(name || '').trim().toLowerCase()] || null;
}

// ===========================================================================
// ROUND 284 -- EVERY PASTE GETS A HOME.
//
//   "All cannon abilities need to be working in game"
//
// Three things stood between his pastes and a kit:
//
//   A CONFLUENCE. Doom is not an essence, it is the confluence of Dark, Blood
//   and Sin (the game already resolves that trio to Doom). A confluence slot
//   answers to `conf:<Name>`, so a Doom paste pairs with the confluence slot
//   of a Doom kit and with nothing else.
//   TWO ESSENCES. "(Magic/Shield)", "(Might/Potent)": either essence, with the
//   ability's stone.
//   NO STONE. Thirteen pastes name no awakening stone. Asked, the user chose
//   "I pick, you review": `CANON_STONE_PICKS` below, also written to
//   data/canon/CANON_STONES_DRAFT_r284.csv for him to correct.
// ===========================================================================
// ROUND 287 -- Mystic (Adept + Water + Wind) for his monk pastes.
const CANON_CONFLUENCES = new Set(['doom', 'dragon', 'charlatan', 'mystic']);

/** The essence KEYS a canon essence name answers to: essence ids, or
 *  `conf:<Name>` for a confluence. "Magic/Shield" is both. */
export function canonEssenceKeys(name) {
  const out = [];
  for (const part of String(name || '').split('/')) {
    // ROUND 287 -- "Balance [Uncommon]": the rarity is not the essence.
    const n = part.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
    if (!n) continue;
    const id = essenceIdFor(n);
    if (id) out.push(id);
    else if (CANON_CONFLUENCES.has(n.toLowerCase())) out.push(`conf:${n[0].toUpperCase()}${n.slice(1).toLowerCase()}`);
  }
  return out;
}

/** The key a kit's slot is paired under: its essence id, or `conf:<Name>`
 *  for the confluence slot. */
export function slotEssenceKey(essDef, essenceIdOfFn) {
  if (!essDef) return null;
  if (essDef.id === 'confluence') return essDef.name ? `conf:${essDef.name}` : null;
  return essenceIdOfFn ? essenceIdOfFn(essDef) : (essDef.id || null);
}

/** The stone each stoneless paste is placed with, pending his review. */
export const CANON_STONE_PICKS = {
  lifeBolt: 'stoneLife',            // Renewal: life energy, delivered
  verdantCage: 'stonePlant',        // Growth: vines that bind
  reapersRedoubt: 'stoneReaper',    // Shield: its own name
  crystalliseMana: 'stoneCrystal',  // Magic/Shield: a crystal
  burstShield: 'stoneSurge',        // Shield: it bursts outward
  razorWingSword: 'stoneSword',     // Wing: a sword
  flyingLeap: 'stoneSwift',         // Wing: a swift leap
  dragonWingSword: 'stoneFire',     // Wing: the fire conjuration
  dragonWings: 'stoneSky',          // Wing: wings to take to the sky
  diveBomb: 'stoneBird',            // Wing: a stoop from above
  relentlessAssault: 'stonePersistence',   // Might/Potent: it keeps coming
  unstoppableForce: 'stoneHammer',  // Might: a heavy weapon's momentum
  inexorableDoom: 'stoneInevitability',    // Doom: inexorable
  // ROUND 287 -- his third paste. Same rule: I pick, he reviews
  // (data/canon/CANON_STONES_DRAFT_r287.csv).
  ...CANON_STONE_PICKS_03,
};
/** Innate canon abilities, by essence id: the ones whose paste says
 *  "Awakening Stone: None (awakened with essence)". Derived, not listed.
 *  (Round 278's first cut made Haemorrhage Blood's innate; the user's text
 *  says it is Blood with the Magus stone, and Blood's innate is Blood Harvest.) */
export const CANON_INNATE = (() => {
  const out = {};
  for (const key of Object.keys(CANON_TEXT)) {
    const t = canonView(key);   // ROUND 280 -- an approved move off the innate
    if (!t.innate) continue;
    const id = essenceIdFor(t.essence);
    if (id && !out[id]) out[id] = key;
  }
  return out;
})();

export function stoneIdFor(name) {
  // "The Stars (epic).", "Awakening Stone of the Apocalypse (legendary).",
  // "Judgement (Rare).": the stone is the words, without article or rarity.
  // ROUND 287 -- and "Moment [Epic]", "Stone of the Reaper", "Eyes (Common)",
  // "[Celestials](link)", "Rain (Common) / Unknown": the first stone named,
  // without link, article, rarity or plural.
  const first = String(name || '').replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, '$1').split('/')[0];
  const n = first.trim()
    .replace(/\.$/, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\[[^\]]*\]\s*$/, '')
    .replace(/^(awakening\s+)?stone of\s+/i, '').replace(/^the\s+/i, '').trim().toLowerCase();
  if (!n || /^(none|unknown)\b/.test(n)) return null;
  return stoneIdByName[n] || (n.endsWith('s') ? stoneIdByName[n.slice(0, -1)] : null) || null;
}

/** The canon record's essence and stone: the user's text first, the older
 *  exemplar fields where he has not re-sent that ability yet. */
export function canonSource(key) {
  const t = canonView(key);   // ROUND 280 -- approved edits laid over the paste
  const x = CANON_EXEMPLARS[key];
  const essenceName = (t && t.essence) || (x && x._srcName) || null;
  const stoneName = (t && t.stone) || (x && typeof x.canonStone === 'string' && !/unnamed/i.test(x.canonStone) ? x.canonStone : null);
  const keys = canonEssenceKeys(essenceName);
  // ROUND 284 -- a stoneless paste takes the stone picked for it.
  const pasteStone = stoneIdFor(stoneName);
  const picked = !pasteStone && !(t && t.innate) ? (CANON_STONE_PICKS[key] || null) : null;
  return { essenceName, stoneName, essenceId: keys[0] || null, essenceKeys: keys,
    stoneId: pasteStone || picked, stonePicked: !!picked };
}

/** Pairing table: `${essenceId}|${stoneId}` -> [canon keys, in order]. A
 *  second canon ability on the same pairing (two Feast stones on Blood) takes
 *  the second occurrence of that pairing in the kit. */
export function canonPairings() {
  const out = {};
  for (const key of Object.keys(CANON_EXEMPLARS)) {
    if (!RUNTIME_READY.has(key)) continue;
    const s = canonSource(key);
    if (!s.essenceKeys.length || !s.stoneId) continue;
    const stones = [s.stoneId, ...(NEAR_SYNONYM_STONES[s.stoneId] || []),
      ...(((CANON_APPROVED_EDITS[key] || {}).similarStones) || [])];   // ROUND 280 -- "or similar"
    for (const ek of s.essenceKeys) {   // ROUND 284 -- "Magic/Shield": either
      for (const st of stones) (out[`${ek}|${st}`] = out[`${ek}|${st}`] || []).push(key);
    }
  }
  return out;
}

/** The canon ability for this essence's innate, if there is one. */
export function canonInnateFor(essenceId) {
  const key = CANON_INNATE[essenceId];
  return key && RUNTIME_READY.has(key) ? key : null;
}

/** The canon ability for this socket, if the pairing is canon. */
export function canonForSocket(essenceId, stoneId, occurrence = 0) {
  const list = canonPairings()[`${essenceId}|${stoneId}`];
  return list ? (list[occurrence] || null) : null;
}

/** Every canon name, lower-cased: nothing generated may carry one. */
export const CANON_NAMES = new Set([
  ...Object.values(CANON_EXEMPLARS).map(a => String(a.name).toLowerCase()),
  ...Object.values(CANON_TEXT).map(a => String(a.name).toLowerCase().replace(/’/g, "'")),
]);

/** A fresh, exact copy of the canon spec, with the kit's identity fields. */
export function canonSpec(key, ident = {}) {
  const x = CANON_EXEMPLARS[key];
  if (!x) return null;
  const spec = JSON.parse(JSON.stringify(x));
  return {
    ...spec,
    canonKey: key,
    canon: true,
    essenceId: ident.essenceId != null ? ident.essenceId : spec.essenceId,
    stoneId: ident.stoneId != null ? ident.stoneId : null,
    color: ident.color || spec.color || '#ffffff',
    innate: !!ident.innate,
    _srcName: (CANON_TEXT[key] && CANON_TEXT[key].essence) || spec._srcName,
  };
}
