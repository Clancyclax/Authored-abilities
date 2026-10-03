// ===========================================================================
// ROUND 190 (item 8) -- ABILITIES LEVEL, NOT ESSENCES.
//
//   8.1 "When gaining direct experience players should be gaining it against
//        specific abilities. If a monster is killed any abilities used within
//        1 minute of its death should be gaining experience."
//   8.2 "Abilities go up exactly like the player does now, but with minor
//        damage, range, cooldown, or effect increases at each minor threshold"
//   8.3 "The players 'level' rank is equal to the average of all their
//        abilities" -- Iron 0 until every awakening stone is in (8.3.1), the
//        average from then on (8.3.2).
//   8.4 "Stored experience should be used to catch up passives and abilities
//        that are falling behind, allowing meditation to balance the overall
//        abilities."
//
// Each ability carries its own xp on the same curve the essences used
// (essenceRank.standingForXp), keyed by its socket key, so a stone that stays
// in its socket keeps its progress. The essence slots' records are no longer
// earned directly: each is the MEAN of its abilities (syncSlotsFromAbilities),
// so everything that reads a slot's standing -- the rank-up ceremony, the
// linked attribute, the tyranny of rank -- keeps working and now tells the
// truth about the abilities under it.
// ===========================================================================
import { standingForXp, liveXpCeiling, LEVELS_PER_RANK, MAX_ESSENCE_RANK } from './essenceRank.js';
import { RANK_ORDER } from './ranks.js';

/** Kill xp reaches an ability used this recently (8.1). */
export const ABILITY_XP_WINDOW_MS = 60000;

/** Per level inside a rank (8.2's "minor thresholds"): cooldown shortens and
 *  reach grows by these fractions, on top of the magnitude growth
 *  `abilityScale` already gives every level. */
export const MINOR_COOLDOWN_PER_LEVEL = 0.01;
export const MINOR_REACH_PER_LEVEL = 0.01;
// ===== ROUND 204 (item 7) -- AND THE COST COMES DOWN ======================
//
// The user: "a iron 1 ability might do 8 damage and cost 30 stamina, whereas
// by reaching iron 9 the same ability deals 12 damage and costs 26 stamina
// ... 'minor thresholds' should feel like progress, especially because of how
// much leveling is going to slow down as we dial it in."
//
// Damage already grew (`abilityScale`, +1/9 of base per level) and the
// cooldown already shortened. Cost was the one number that never moved: it is
// excluded from SCALED_FIELDS by name, and nothing else touched it. So nine
// levels of work made an ability hit twice as hard for exactly the same
// price, which is half of the sentence above.
//
// 1% a level, the same step the cooldown takes, and floored so a long climb
// can never make an ability free -- a zero-cost repeatable is a different
// ability from a cheap one.
export const MINOR_COST_PER_LEVEL = 0.01;
export const MINOR_COST_FLOOR = 0.6;
/** The reach fields the minor step touches. Deliberately not auraRadius --
 *  a field that silently widens every level would be a rank effect. */
export const MINOR_REACH_FIELDS = ['range', 'radius', 'explodeRadius'];

export function newAbilityProgress() { return { xp: 0, rank: 'iron', level: 0 }; }

/** Make sure every known ability has a record; returns the key list. */
export function ensureAbilityProgress(map, known) {
  const keys = Object.keys(known || {}).filter(k => known[k] && known[k].ability);
  for (const k of keys) if (!map[k]) map[k] = newAbilityProgress();
  return keys;
}

/** Resolve one record's rank and level from its xp. An ability may climb to
 *  level 0 of the rank above the player's, and no further -- the same
 *  "wait for the others" rule the essences had, now against the average. */
export function recomputeAbility(prog, playerRank = 'iron', fromRank = null) {
  const before = `${prog.rank}:${prog.level}`;
  const st = standingForXp(prog.xp);
  let rankIdx = st.rankIdx, level = st.level;
  // One sitting crosses one rank (round 126's rule, per ability now): a
  // record may enter the rank above the one it started the sitting in, at
  // level 0, and no further. The surplus xp stays on the record.
  if (fromRank) {
    const fromIdx = Math.max(1, RANK_ORDER.indexOf(fromRank));
    if (rankIdx > fromIdx) { rankIdx = Math.min(rankIdx, fromIdx + 1); level = 0; }
  }
  const cap = Math.max(1, RANK_ORDER.indexOf(playerRank || 'iron')) + 1;
  if (rankIdx > cap) { rankIdx = cap; level = 0; }
  else if (rankIdx === cap) level = 0;
  prog.rank = RANK_ORDER[rankIdx];
  prog.level = Math.max(0, Math.min(LEVELS_PER_RANK - 1, level));
  return `${prog.rank}:${prog.level}` !== before;
}

/** The fraction through the record's current level, 0..1. */
export function abilityProgressFrac(prog) {
  const st = standingForXp(prog.xp);
  if (st.rank !== prog.rank || st.level !== prog.level) return 1;   // held at a gate
  return Math.max(0, Math.min(1, st.into / st.need));
}

/**
 * 8.1 -- a kill's live share, split across the abilities that took part.
 * Each is capped at its rank's live ceiling (the last tenth of a rank is
 * meditation's, unchanged); what does not fit is returned as `refused` for the
 * bank. With no ability used in the window the whole share is refused: xp
 * earned with a bare weapon waits for meditation to decide where it goes.
 */
/**
 * ROUND 269 (item 8) -- COOLDOWN-SCALED XP.
 *
 * An even split paid a one-second jab and a ninety-second ultimate the same
 * share of every kill they were both part of -- and the jab is part of nearly
 * every kill, and the ultimate of hardly any, so over a session the kit
 * levelled in inverse proportion to how much each ability MATTERED. Two
 * fixes, both keyed on the ability's own cooldown:
 *
 *   - THE SHARE. Each ability in the split is weighted by its cooldown in
 *     units of COOLDOWN_XP_UNIT seconds, floored at one (everything with a
 *     short cooldown weighs the same, which is the old rule) and capped at
 *     COOLDOWN_XP_CAP so a once-an-hour ability cannot swallow the kill.
 *   - THE WINDOW. "Used within 1 minute of its death" (8.1) quietly excluded
 *     every ability whose cooldown is longer than a minute from every kill but
 *     the first after it was cast. The window is now the longer of a minute
 *     and one and a half cooldowns, so an ability counts as part of the fight
 *     for as long as it is plausibly still the ability you opened with.
 *
 * The total paid is unchanged: this moves xp between the abilities of one
 * kill, it does not mint any.
 */
export const COOLDOWN_XP_UNIT = 5;
export const COOLDOWN_XP_CAP = 8;
export const COOLDOWN_XP_WINDOW_MULT = 1.5;

/** How much of a kill one ability's cooldown entitles it to. */
export function cooldownXpWeight(cooldownSec) {
  const cd = Number(cooldownSec) || 0;
  return Math.max(1, Math.min(COOLDOWN_XP_CAP, cd / COOLDOWN_XP_UNIT));
}

/** How long after a use an ability still counts as part of a kill, in ms. */
export function abilityXpWindowMs(cooldownSec) {
  const cd = Number(cooldownSec) || 0;
  return Math.max(ABILITY_XP_WINDOW_MS, cd * 1000 * COOLDOWN_XP_WINDOW_MULT);
}

export function awardAbilityKillXp(map, keys, amount, weights = null) {
  const out = { committed: 0, refused: 0, gains: {} };
  if (!(amount > 0)) return out;
  if (!keys.length) { out.refused = amount; return out; }
  const wOf = (k) => (weights && weights[k] > 0 ? weights[k] : 1);
  const total = keys.reduce((a, k) => a + wOf(k), 0);
  for (const k of keys) {
    const share = amount * (wOf(k) / total);
    const p = map[k] || (map[k] = newAbilityProgress());
    const room = Math.max(0, liveXpCeiling(p.xp) - p.xp);
    const take = Math.min(share, room);
    p.xp += take;
    out.gains[k] = take;
    out.committed += take;
    out.refused += share - take;
  }
  return out;
}

/**
 * 8.4 -- meditation spends the bank on whoever is furthest behind. Water-
 * filling: the lowest record is raised to the next lowest, then both to the
 * third, and so on until the bank runs out -- so a passive that never sees a
 * kill is carried up with the kit rather than left at Iron 0, and a
 * single over-used ability gets nothing until the rest have caught up.
 */
export function distributeBank(map, keys, amount) {
  const gains = {};
  let left = Math.max(0, amount || 0);
  if (!keys.length || !left) return { gains, spent: 0 };
  const sorted = keys.slice().sort((a, b) => (map[a].xp - map[b].xp) || (a < b ? -1 : 1));
  let n = 1;
  while (left > 1e-9) {
    const level = map[sorted[0]].xp;
    const next = n < sorted.length ? map[sorted[n]].xp : Infinity;
    const need = (next - level) * n;
    if (need <= left && n < sorted.length) {
      for (let i = 0; i < n; i++) { gains[sorted[i]] = (gains[sorted[i]] || 0) + (next - map[sorted[i]].xp); map[sorted[i]].xp = next; }
      left -= need;
      n++;
      continue;
    }
    const each = left / n;
    for (let i = 0; i < n; i++) { gains[sorted[i]] = (gains[sorted[i]] || 0) + each; map[sorted[i]].xp += each; }
    left = 0;
  }
  return { gains, spent: amount };
}

/** The mean xp of a set of records. */
export function meanXp(map, keys) {
  if (!keys.length) return 0;
  return keys.reduce((n, k) => n + ((map[k] && map[k].xp) || 0), 0) / keys.length;
}

/**
 * 8.3 -- the player's standing: the AVERAGE of every ability, read on the
 * same curve; Iron 0 until every awakening stone is socketed.
 */
export function averageStanding(map, keys, allStonesIn) {
  if (!keys.length) return { rank: 'normal', rankIdx: 0, level: 0, progress: 0, standing: 0 };
  if (!allStonesIn) return { rank: 'iron', rankIdx: 1, level: 0, progress: 0, standing: 1, sealed: true };
  // The mean of each record's RESOLVED standing (its gated rank and level plus
  // the fraction through that level), in tenths of a rank. Averaging raw xp
  // instead would let a hoard of banked xp read as ranks the gates have not
  // let anyone reach.
  let sum = 0;
  for (const k of keys) {
    const p = map[k];
    const idx = Math.max(1, RANK_ORDER.indexOf(p.rank || 'iron'));
    // A record held at a gate reads as a full bar, but it has not crossed
    // into the next level: it counts as the top of the level it is on.
    sum += idx * LEVELS_PER_RANK + (p.level || 0) + Math.min(0.999, abilityProgressFrac(p));
  }
  const avg = sum / keys.length;
  const maxIdx = RANK_ORDER.indexOf(MAX_ESSENCE_RANK);
  const rankIdx = Math.min(maxIdx, Math.max(1, Math.floor(avg / LEVELS_PER_RANK)));
  const inRank = avg - rankIdx * LEVELS_PER_RANK;
  const level = Math.max(0, Math.min(LEVELS_PER_RANK - 1, Math.floor(inRank)));
  const progress = Math.max(0, Math.min(0.999, inRank - level));
  return { rank: RANK_ORDER[rankIdx], rankIdx, level, progress,
    standing: rankIdx + Math.min(0.999, (level + progress) / LEVELS_PER_RANK) };
}

// ===========================================================================
// ROUND 201 -- THE LINKED ATTRIBUTE ADVANCES WITH THE LOWEST, NOT THE MEAN.
//
// Canon, quoted on every essence card in the books:
//
//   "Linked attribute [Recovery] will advance in conjunction with LOWEST-RANK
//    adept essence ability."
//
// This function used the mean, and that is not a cosmetic difference. Under
// the canon rule you cannot neglect an ability: the attribute is held back by
// your worst one, so a kit advances only as fast as its weakest member, and
// the line the game has printed since round 85 --
//
//   "Master all Blood essence abilities to increase your [Power] attribute."
//
// -- becomes literally true. Under the mean, one starved ability is diluted by
// four healthy ones and that printed promise is false. Round 201 also starts
// printing the linked-attribute line itself (advancement.js), and printing a
// rule beside an implementation of a different rule is worse than printing
// neither.
//
// WHAT DID NOT CHANGE, and the distinction matters: the PLAYER's own standing
// is still the mean of every ability (8.3, `averageStanding`, read by
// `_playerRankStanding`). The mean is the right answer for "how far along is
// this character" and the lowest is the right answer for "what has this
// essence earned its attribute". They are two different questions and they now
// have two different functions instead of one shared one.
// ===========================================================================

/** The resolved standing of the WEAKEST record in a set -- the same shape
 *  `averageStanding` returns, so every reader is unchanged. Ordered on the
 *  same rank*10 + level + fraction scale the mean uses, so a record held at a
 *  gate ranks above one genuinely a level below it. */
export function lowestStanding(map, keys) {
  if (!keys.length) return { rank: 'normal', rankIdx: 0, level: 0, progress: 0, standing: 0 };
  let best = null;
  for (const k of keys) {
    const p = map[k];
    if (!p) continue;
    const idx = Math.max(1, RANK_ORDER.indexOf(p.rank || 'iron'));
    const frac = Math.min(0.999, abilityProgressFrac(p));
    const scale = idx * LEVELS_PER_RANK + (p.level || 0) + frac;
    if (!best || scale < best.scale) {
      best = { scale, rankIdx: idx, level: p.level || 0, progress: frac };
    }
  }
  if (!best) return { rank: 'normal', rankIdx: 0, level: 0, progress: 0, standing: 0 };
  return {
    rank: RANK_ORDER[best.rankIdx], rankIdx: best.rankIdx,
    level: Math.max(0, Math.min(LEVELS_PER_RANK - 1, best.level)),
    progress: best.progress,
    standing: best.rankIdx + Math.min(0.999, (best.level + best.progress) / LEVELS_PER_RANK),
  };
}

/** The lowest xp in a set -- the slot's own bank reading, kept in step with
 *  the standing above so the record describes one ability rather than two. */
export function lowestXp(map, keys) {
  if (!keys.length) return 0;
  return Math.min(...keys.map(k => (map[k] && map[k].xp) || 0));
}

/** Each essence slot's record, as its LOWEST-ranked ability (round 201). */
export function syncSlotsFromAbilities(slotProgress, map, known) {
  const bySlot = [[], [], [], []];
  for (const [k, v] of Object.entries(known || {})) {
    if (!v || !v.ability) continue;
    const i = v.slotIndex == null ? 3 : v.slotIndex;
    if (bySlot[i]) bySlot[i].push(k);
  }
  for (let i = 0; i < slotProgress.length; i++) {
    if (!bySlot[i] || !bySlot[i].length) continue;
    // Both halves come from the SAME ability. The first draft of this took the
    // lowest standing and left the mean xp, which made the slot a record of
    // two different abilities at once -- and `_migrateAbilityProgress` seeds a
    // new ability's xp off `sp.xp`, so the mismatch would have leaked into
    // every ability awakened after it.
    slotProgress[i].xp = lowestXp(map, bySlot[i]);
    const st = lowestStanding(map, bySlot[i]);
    slotProgress[i].rank = st.rank;
    slotProgress[i].level = st.level;
  }
  return bySlot;
}

/** 8.7 -- the linked attribute's fractional part: "if the might abilities
 *  average Iron 3 then the linked attribute is 1.3 not 1.0". The level of the
 *  slot's average, in tenths. */
export function linkedAttrFraction(level) {
  return Math.max(0, Math.min(LEVELS_PER_RANK - 1, level || 0)) / 10;
}
