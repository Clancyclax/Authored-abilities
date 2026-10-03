// ROUND 47 -- PER-ESSENCE RANK PROGRESSION.
//
// The user's brief, verbatim:
//
//   "Experience is split between the 4 essences. Each essence moves up through
//    Iron on it's own from 0% when it's first obtained and is iron 0 to 100%
//    when it's iron 1, this continues up through iron 9 to bronze 0. As earlier
//    stated moving past bronze 0 means all essences must have hit bronze. As
//    each essence moves up the abilities tied to that essence should minorly
//    increase. Examples, A skill that does 8 damage at iron 0 should be dealing
//    16 damage by iron 9. A movement speed buff that lasts 10 seconds at iron 0
//    should be lasting 20 seconds at iron 9, or perhaps the speed increase
//    moves from 10% to 20%. Remember additional aspects to each abilities are
//    unlocked at a rank change providing more opportunities for synergy."
//
//   "6.1) An essence can't start to rank up until all it's awakening stone
//    slots are filled."
//
// WHAT CHANGED, structurally. Rank used to be ONE number on the player,
// derived from banked xp (ranks.js rankForLevel). It still exists -- the
// tyranny of rank, the region gates and the monster scaling all read it -- but
// it is DERIVED now: the player's rank is the rank of their WEAKEST essence.
// That is what makes "moving past bronze 0 means all essences must have hit
// bronze" true by construction rather than by a separate check.
//
// Each of the four slots carries its own xp, its own rank and its own level
// 0-9 within that rank.

import { RANK_ORDER } from './ranks.js';

/** Levels within a rank: iron 0 through iron 9, then bronze 0. */
export const LEVELS_PER_RANK = 10;

/** XP for one level of one essence AT IRON -- the first rung of the curve, and
 *  the only one that is a free choice. Everything above it is this times
 *  RANK_XP_STEP per rank (see RANK_LEVEL_XP).
 *
 *  The whole-player curve used to be 100 xp per level with a rank every 4-5
 *  levels; a rank is ten levels now and the xp is split four ways, so this is
 *  set to keep the time-to-Bronze in the same neighbourhood rather than to make
 *  the number look tidy.
 *
 *  ROUND 127 -- 45 BECOMES 225, AND THE GAME IS EXACTLY AS FAST AS IT WAS.
 *
 *  Meditation used to convert only 20% of banked combat experience and destroy
 *  the rest (see MEDITATE_BANK_RATE). That is gone: meditation consolidates
 *  what you earned, it does not tax it. Multiplying the level cost by five is
 *  what keeps the pacing round 126 measured and the user accepted --
 *  9,000 / 18,000 / 54,000 raw combat experience per rank -- rather than making
 *  the whole ladder five times faster as a side effect of removing a tax.
 *
 *  The two numbers are a pair. If MEDITATE_BANK_RATE ever changes again this
 *  one moves with it, and `tools/data_checks.mjs` asserts the product. */
// ROUND 190 -- "Experience requirements need to go way up. I just hit silver
// without leaving the NEK ... needs to triple." Tripled, and measured in the
// same raw-combat-xp terms as before: the bank is now spread across the kit's
// TWENTY abilities rather than four essences (item 8), so the per-record level
// cost is 225 x 3 x 4/20 = 135, and a level of the whole kit costs
// 20 x 135 = 2,700 raw xp -- three times round 126's 900.
export const ABILITIES_PER_KIT = 20;
export const XP_PER_ESSENCE_LEVEL = 135;

/**
 * ROUND 127 -- HOW MUCH OF THE COMBAT POOL A MEDITATION CONSOLIDATES.
 *
 * ALL OF IT. This lived as a bare `* 0.20` inside `_startMeditation` and it
 * deleted four fifths of every kill in the game, which is most of why the
 * user's report reads "The player seems to only gain XP when meditating":
 * there was no visible relationship between fighting and progressing, only a
 * number that appeared when you sat down, and it was a fifth of what you had
 * actually done.
 *
 * IT LIVES HERE, NOT IN THE SCENE, because it is half of the CURVE. The raw
 * combat experience one essence level costs is
 *
 *     ESSENCE_SLOT_COUNT_WITH_CONFLUENCE * XP_PER_ESSENCE_LEVEL / MEDITATE_BANK_RATE
 *
 * -- so the two constants only mean anything as a pair, and a pair split across
 * two files is a pair somebody retunes half of. `tools/data_checks.mjs` asserts
 * the product, which it could not do at all while this was a literal buried in
 * a method body.
 */
export const MEDITATE_BANK_RATE = 1.0;

/** Raw combat experience for one level of one essence, which is the number a
 *  player actually feels. The four is the four progressing slots
 *  `awardEssenceXp` splits a meditation between. */
export function rawXpPerEssenceLevel() {
  return ABILITIES_PER_KIT * XP_PER_ESSENCE_LEVEL / MEDITATE_BANK_RATE;
}

/** The ceiling. No diamond content exists anywhere in the world (the user's
 *  standing note from round 43), so no essence climbs into it.
 *
 *  ROUND 126 -- MOVED UP HERE from below the scaling tables, because the xp
 *  curve now stops at it and a `const` read by an IIFE declared above it is a
 *  temporal-dead-zone crash on module load rather than a wrong number. */
export const MAX_ESSENCE_RANK = 'gold';

// ===========================================================================
// ROUND 126 -- A RANK COSTS MORE THAN THE ONE BELOW IT.
//
// The user's bug report:
//
//   "Player moving straight from Iron to Gold when meditating. Experience
//    should be harder each rank, and iron rank monsters should be worth almost
//    nothing by silver rank."
//
// Both halves were true, and measured before this change. A fully-socketed
// character, one hoarded bank, one press of M:
//
//   start   iron:0 iron:0 iron:0 iron:0    "0% into Iron 0"
//   after   gold:9 gold:9 gold:9 gold:9    "0% into Gold 9"
//
// THREE faults stacked to produce that, and each needed its own fix:
//
//   1. THE CURVE WAS FLAT. `XP_PER_ESSENCE_LEVEL` was one number for every
//      rank, so Iron -> Bronze and Silver -> Gold cost exactly the same 450 xp
//      per essence. Three ranks cost precisely three times one rank, which is
//      not a progression, it is a straight line with rank names written on it.
//
//   2. NOTHING DECAYED. A monster's xp is its type's `xp` field and nothing
//      ever read the player's rank, so a Panterimp Grey was worth thirty at
//      Iron and thirty at Gold. That is the second half of the report and it
//      lives in monsters.js, not here.
//
//   3. NO BOUNDARY. `recomputeSlot`'s loop walked as many ranks as the xp
//      allowed in ONE call, and the top rank then absorbed every surplus level
//      -- which is why the measurement above lands on Gold NINE rather than
//      Gold 0. See `fromRank` below.
//
// THE STEP IS THE ONE TUNING KNOB. Everything else is derived from it, so
// retuning the whole game's pacing is this single number.
// ===========================================================================

/** How much dearer one level of the next rank is than one level of this one.
 *
 *  THREE, and the reason is the bestiary rather than a feel for the number.
 *  Monster xp across the whole roster spans 8 (a slime) to 420 (a dragon) --
 *  about fifty times. A curve that grew faster than the content it is paid out
 *  of would leave a Silver player farming the only three things in the world
 *  worth killing; at three, each rank's step is covered by moving up the
 *  bestiary, which is what the decay rule in monsters.js is there to make the
 *  player actually do.
 *
 *  Measured at this value, in kills of a rank-appropriate monster:
 *    Iron   -> Bronze    300 Panterimp (30 xp)
 *    Bronze -> Silver    540 Boneguard (50 xp)
 *    Silver -> Gold      480 Triskelith (170 xp)
 *  -- so each rank takes noticeably longer in XP while the kill count stays
 *  humane, which is the shape the report is asking for. */
export const RANK_XP_STEP = 3;

/** XP for one level, per rank. Derived from the step rather than typed out, so
 *  the table cannot drift from the constant that is supposed to define it. */
// STOPS AT MAX_ESSENCE_RANK. Not tidiness: "no diamond-rank content anywhere"
// is a standing instruction on this project, and a price for a rank nobody can
// climb into is a diamond-rank number sitting in a table waiting for somebody
// to read it as permission. `standingForXp` never returns diamond either.
export const RANK_LEVEL_XP = (() => {
  const out = {};
  let cost = XP_PER_ESSENCE_LEVEL;
  for (const r of RANK_ORDER) {
    if (r === 'normal') continue;      // you never earn levels in Normal
    out[r] = cost;
    if (r === MAX_ESSENCE_RANK) break;
    cost *= RANK_XP_STEP;
  }
  return out;
})();

/** Total xp, from Iron 0, at which a rank's level 0 begins. */
export const RANK_XP_FLOOR = (() => {
  const out = {};
  let acc = 0;
  for (const r of RANK_ORDER) {
    if (r === 'normal') continue;
    if (RANK_LEVEL_XP[r] == null) break;
    out[r] = acc;
    acc += RANK_LEVEL_XP[r] * LEVELS_PER_RANK;
  }
  return out;
})();

/**
 * Where a given total xp puts an essence: {rank, level, into, need}.
 *
 * THE ONE PLACE THE CURVE IS WALKED. `recomputeSlot`, the progress bar, the
 * HUD's "76% into Iron 4" and every test fixture all resolve through this,
 * because a curve read in five places is five curves the moment one of them is
 * retuned -- which is the exact failure round 74 spent a round unpicking when
 * the game had four independent level formulas and the HUD was printing the
 * wrong one.
 */
export function standingForXp(xp) {
  const maxIdx = RANK_ORDER.indexOf(MAX_ESSENCE_RANK);
  let left = Math.max(0, xp || 0);
  let rankIdx = 1;                                 // iron is the floor
  while (rankIdx < maxIdx) {
    const span = RANK_LEVEL_XP[RANK_ORDER[rankIdx]] * LEVELS_PER_RANK;
    if (left < span) break;
    left -= span;
    rankIdx++;
  }
  const need = RANK_LEVEL_XP[RANK_ORDER[rankIdx]];
  let level = Math.floor(left / need);
  let into = left - level * need;
  // The ceiling: Gold 9 is as far as anyone climbs, and surplus past it stops
  // filling the bar rather than pretending there is somewhere left to go.
  if (rankIdx >= maxIdx && level >= LEVELS_PER_RANK) { level = LEVELS_PER_RANK - 1; into = need; }
  return { rank: RANK_ORDER[rankIdx], rankIdx, level, into, need };
}

/** The inverse: the total xp that reads as exactly this standing. What every
 *  fixture and check should build a progress record from -- writing
 *  `level * XP_PER_ESSENCE_LEVEL` by hand was correct only while the curve was
 *  flat, and four places in this repository were doing it. */
export function xpForStanding(rank, level = 0, into = 0) {
  const r = RANK_XP_FLOOR[rank] != null ? rank : 'iron';
  return RANK_XP_FLOOR[r] + (level || 0) * RANK_LEVEL_XP[r] + (into || 0);
}


/** How much an ability grows across one rank of its essence.
 *
 *  "A skill that does 8 damage at iron 0 should be dealing 16 damage by iron 9"
 *  -- so exactly 2x from level 0 to level 9, and the steps between are linear:
 *  a level is +1/9 of the base. Linear rather than compounding because the
 *  user gave the endpoints and a straight line is the only reading of them
 *  that hits both without inventing a curve. */
export function abilityScale(level) {
  return 1 + Math.max(0, Math.min(LEVELS_PER_RANK - 1, level)) / (LEVELS_PER_RANK - 1);
}

/** The ability fields that grow with the essence's level.
 *
 *  Damage, durations and magnitudes -- the things the user's two examples name
 *  ("8 damage ... 16 damage", "lasts 10 seconds ... 20 seconds", "10% to 20%").
 *  Deliberately NOT scaled: range, radius, cooldown and resource cost. Those
 *  change how an ability is USED rather than how strong it is, and doubling a
 *  radius over a rank would quietly turn every nova into a screen-clear. */
export const SCALED_FIELDS = [
  'base', 'healAmount', 'hotPerSec', 'shieldAmount', 'absorb',
  'duration', 'buffDuration', 'slowDuration',
  'speedPct', 'slowPct', 'dmgPct', 'armorPct', 'critPct', 'thornsPct',
  // ROUND 47 (item 7) -- a weapon affinity is an ability like any other, so
  // its reach and speed bonuses grow with the essence that granted it. A
  // spear essence at iron 9 reaches meaningfully further than the same
  // essence at iron 0, and the telegraph shows it.
  'rangePct', 'attackSpeedPct',
  // ROUND 48 -- the lever twists. Both the generator and the runtime flagged
  // that these were being left behind: an essence's whole POINT is now the
  // lever it pulls, so a lever bonus that stayed flat while the ability's base
  // damage doubled would make the essence matter LESS the further you levelled
  // it -- the exact inversion of what round 47 item 6 promised.
  //
  // chainDamagePct is deliberately absent: the runtime prices a chain hop as a
  // fraction of `base`, and `base` already scales, so scaling the fraction too
  // would compound it into roughly quadruple by iron 9.
  'rangeMult', 'chainCount', 'chainRange', 'chainDamage',
  // ROUND 222 -- `volleyCount` joins them, and it is the user's own ladder:
  // "4/8/16 projectiles". Four at iron doubles to eight and doubles again by
  // the top of gold on the curve every other magnitude here already uses, so
  // his three numbers fall out of the existing growth rather than needing a
  // second one written beside it. Its per-bolt damage is `base`, which is on
  // this list too -- so a Myriad volley gets both more bolts and bigger ones,
  // exactly as a chain gets more hops and harder ones two lines up.
  'volleyCount',
  // ROUND 220 (item 11.1) -- `rerollChance` was on this list and is gone from
  // the game: the runtime gates a reroll on a COOLDOWN and reads no chance at
  // all, so levelling an essence was growing a number with no reader. The
  // cooldown is deliberately NOT here in its place -- see this list's own note
  // about fractions where smaller is stronger. abilityScale multiplies, so a
  // scaled cooldown would get LONGER the further you levelled it.
  'confuseDuration', 'confuseChance',
  // ROUND 49 -- how LONG a taunt holds is its magnitude, and it doubles by
  // iron 9 like every other duration on this list.
  //
  // tauntRadius and tauntMax are deliberately absent, by this list's own rule:
  // a radius is a range, and how many enemies a shout can hold is how it is
  // USED (do I pull the pack or peel one?) rather than how strong it is. A
  // tauntMax that doubled would turn a tank's peel into a screen-clear at
  // exactly the point in the game where the packs get big enough to matter,
  // which is the nova failure the paragraph above already names.
  'tauntDuration',
  // ROUND 49 -- how long the veil HOLDS is its magnitude, and it doubles by
  // iron 9 like every other duration on this list.
  //
  // aggroMult and stealthAlpha are deliberately absent, and for a reason this
  // list has not had to state before: they are fractions where SMALLER is
  // stronger. abilityScale multiplies, so scaling them would make a veil weaker
  // the more you levelled it -- the exact inversion of the promise. If they
  // ever need to grow they need their own inverse curve, not this one.
  'stealthDuration', 'stealthSpeedPct',
];
/** Nested specs whose own numbers scale too (a DoT's per-tick damage). */
// ROUND 47 -- `effect` joins them for the triggered passives: a kill-bolt's
// damage is the ability's damage and has to grow with the essence like any
// other. `amount` covers the multiplier-style effects (a 100% physical bonus,
// a 50% next-spell bonus) and `duration` their windows.
export const SCALED_NESTED = {
  dot: ['dmgPerTick', 'ticks'],
  // ROUND 52 -- the mending rider grows with rank exactly as the affliction
  // rider does. Without this line a healer's linger would be the one twist in
  // the game that got no stronger as the essence ranked up.
  hot: ['perSec', 'duration'],
  sunder: ['amount', 'duration'],
  effect: ['damage', 'amount', 'duration'],
  // ROUND 48 -- the lever twists' nested blocks.
  resist: ['amount'],
  allyGrant: ['power', 'dmgPct'],
  perAllyGain: ['resistPct', 'dotChancePct', 'dmgPct'],
};

/**
 * The extra aspect an ability gains at each rank change: "additional aspects
 * to each abilities are unlocked at a rank change providing more opportunities
 * for synergy."
 *
 * Keyed by the rank the essence has REACHED, so an Iron essence's abilities
 * carry the iron aspect, a Bronze essence's carry iron AND bronze, and so on.
 * These are deliberately synergy hooks rather than raw numbers -- the raw
 * numbers are what abilityScale already does.
 */
export const RANK_ASPECTS = {
  iron: { id: 'iron', label: 'Iron: strikes apply a light bleed',
          dot: { dmgPerTick: 1, ticks: 3, tickMs: 700, label: 'Bleed' } },
  bronze: { id: 'bronze', label: 'Bronze: 15% of the damage splashes to nearby foes',
            splash: { frac: 0.15, radius: 90 } },
  silver: { id: 'silver', label: 'Silver: critical strikes refund 20% of the cost',
            refund: 0.2 },
  gold: { id: 'gold', label: 'Gold: the first hit each cooldown cannot be resisted',
          pierce: true },
};

/** Aspects an essence at `rank` has unlocked, weakest first. */
export function aspectsFor(rank) {
  const out = [];
  for (const r of RANK_ORDER) {
    if (r === 'normal') continue;
    if (RANK_ASPECTS[r]) out.push(RANK_ASPECTS[r]);
    if (r === rank) break;
  }
  return out;
}

/** A fresh progression record for one slot. `banked` holds xp earned while the
 *  slot was ineligible (stones not yet all socketed) -- it is applied the
 *  moment it becomes eligible rather than thrown away, so filling the last
 *  socket pays out the play that earned it. */
export function newSlotProgress() {
  return { xp: 0, banked: 0, rank: 'iron', level: 0 };
}

/** Is this slot allowed to progress? "An essence can't start to rank up until
 *  all it's awakening stone slots are filled." */
export function slotEligible(slots, i, stonesPerSlot) {
  const ess = i === 3 ? (slots.confluence || slots.slotEssence.every(Boolean)) : slots.slotEssence[i];
  if (!ess) return false;
  return (slots.slotStones[i] || []).length >= stonesPerSlot;
}

/**
 * Advance one slot's level/rank from its xp, honouring the all-essences gate.
 *
 * `floorRank` is the lowest rank across ALL the player's essences. An essence
 * may always climb as far as (nextRank, level 0) on its own -- that is what
 * "up through iron 9 to bronze 0" describes -- but it cannot pass level 0 of a
 * rank until every essence has reached that rank. Returns true if the rank or
 * level changed.
 */
export function recomputeSlot(prog, floorRank, fromRank = null) {
  const before = `${prog.rank}:${prog.level}`;
  const maxIdx = RANK_ORDER.indexOf(MAX_ESSENCE_RANK);
  const st = standingForXp(prog.xp);
  let rankIdx = st.rankIdx;
  let level = st.level;
  // ROUND 126 -- ONE RANK PER SITTING.
  //
  // The reported bug in one line. Without this an essence with a big enough
  // bank walks every rank the xp will buy in a single call -- measured before
  // the fix: Iron 0 to GOLD 9 on one press of M, because the loop climbed as
  // far as it could and the top rank then absorbed all the surplus levels.
  //
  // THE XP IS NOT SPENT, only the climb is stopped. The essence sits at the
  // top of its current rank with a full bar, which is the game saying "you are
  // ready" rather than the game taking something away, and the next meditation
  // carries it over. A rank-up in this world is a thing you sit down and do;
  // doing three of them without standing up was never right.
  //
  // `fromRank` IS THE RANK THE SITTING STARTED AT, and it is a PARAMETER
  // rather than `prog.rank` for a reason this fix needed two goes to learn:
  // the caller runs this TWICE (the floor can rise between passes), so on the
  // second pass `prog.rank` is a value the first pass just wrote. Deriving the
  // limit from it let one sitting cross two ranks -- and once that was caught,
  // let a sitting cross into Gold and then keep climbing Gold levels off the
  // same bank ("42% into Gold 3", measured). A limit computed from the thing it
  // is limiting is not a limit.
  //
  // LANDING ON THE NEXT RANK MEANS LANDING ON ITS LEVEL 0. A sitting that
  // crosses a boundary ends at the crossing -- the same shape the all-essences
  // gate below already has, and the shape a rank-up has in the fiction. The xp
  // is not spent: the essence keeps it and the next sitting carries on.
  //
  // Optional, so that anything reconstructing a standing from raw xp -- a save
  // load, a rebuild, a test fixture -- still resolves the whole curve.
  if (fromRank) {
    const fromIdx = Math.max(1, RANK_ORDER.indexOf(fromRank));
    if (rankIdx > fromIdx) { rankIdx = Math.min(rankIdx, fromIdx + 1); level = 0; }
  }
  if (rankIdx >= maxIdx) level = Math.min(level, LEVELS_PER_RANK - 1);
  // THE GATE. Level 0 of a rank is always reachable; past it, every essence
  // must have reached this rank.
  const floorIdx = Math.max(1, RANK_ORDER.indexOf(floorRank || 'iron'));
  if (rankIdx > floorIdx) level = 0;
  prog.rank = RANK_ORDER[rankIdx];
  prog.level = Math.max(0, Math.min(LEVELS_PER_RANK - 1, level));
  return `${prog.rank}:${prog.level}` !== before;
}

/** Progress through the current level, 0..1 -- what a bar should show.
 *
 *  ROUND 126 -- against THIS RANK's level cost, not a flat one. A Silver
 *  essence's level is nine times an Iron essence's, and a bar that divided by
 *  the Iron figure would have read full nine times over inside one level. */
export function slotProgress(prog) {
  const st = standingForXp(prog.xp);
  // The bar belongs to the level the RECORD says it is in. Those agree except
  // while a rank-up is held back by `fromRank` or by the all-essences gate,
  // and there the essence is genuinely full: it has the xp, it is waiting on
  // something else, and a bar that reset to empty would read as lost progress.
  const held = RANK_ORDER.indexOf(st.rank) > RANK_ORDER.indexOf(prog.rank || 'iron')
    || (st.rank === prog.rank && st.level > (prog.level || 0));
  if (held) return 1;
  return Math.max(0, Math.min(1, st.into / st.need));
}

/** How much xp this essence still owes for its next level -- what a tooltip
 *  wants, and what makes the curve visible to the player at all. */
export function xpToNextLevel(prog) {
  const st = standingForXp(prog.xp);
  return Math.max(0, st.need - st.into);
}

/** The player's own rank: the rank of their WEAKEST essence. An essence slot
 *  that is empty does not count -- a character with one essence is ranked by
 *  that one. With none, they are Normal, which is the round-5 rule that a
 *  character is Normal until bonded, unchanged. */
export function playerRankFrom(progs, slots) {
  let worst = null;
  for (let i = 0; i < progs.length; i++) {
    const has = i === 3 ? !!(slots.confluence) : !!slots.slotEssence[i];
    if (!has) continue;
    const idx = RANK_ORDER.indexOf(progs[i].rank || 'iron');
    if (worst === null || idx < worst) worst = idx;
  }
  return worst === null ? 'normal' : RANK_ORDER[worst];
}

/**
 * ROUND 74 (item 7) -- THE PLAYER'S OWN STANDING, as ONE reading.
 *
 * The user:
 *
 *   "Level should match the value next to the abilities. i.e. 76% into iron 4,
 *    not level 5."
 *
 * There were FOUR independent level curves in the game when this was written,
 * and the HUD was reading the wrong one:
 *
 *   1. `player.xp / 100 + 1`, printed in the HUD as "Lv N" -- the round-5
 *      whole-player curve, which round 47 replaced and nobody deleted.
 *   2. the per-essence progression in this file, shown beside each essence.
 *   3. a copy of (1) in saves.js, for the save-slot list.
 *   4. `RANK_LEVEL_FLOOR` in ranks.js, mapping (1) onto rank names.
 *
 * They cannot be reconciled by formula -- one of them has to BE the answer and
 * the rest have to read it. This is the answer, because it is the one the game
 * already acts on: `playerRankFrom` above derives the player's rank from their
 * WEAKEST essence, and that rank is what gates regions, scales monsters and
 * decides what the tyranny of rank will tolerate. A "level" that disagreed
 * with it was never describing the character.
 *
 * So the player's standing is the weakest slot's standing, compared on all
 * three parts in order -- rank, then level within it, then progress through
 * that level. Rank alone is not enough: four Iron essences at levels 0, 4, 4
 * and 9 are an Iron 0 character, and reporting Iron 9 because one essence got
 * there would be the same overstatement `playerRankFrom` already refuses.
 *
 * `standing` is the CONTINUOUS form -- rank index plus the fraction through
 * that rank -- and it is deliberately the same shape `ranks.js rankStanding`
 * returns, because the party's rank offsets ("roughly 10% ahead of or behind
 * the player") are expressed in it and needed no change to start reading a
 * truer number.
 */
export function playerStandingFrom(progs, slots) {
  let best = null;
  for (let i = 0; i < progs.length; i++) {
    const has = i === 3 ? !!(slots.confluence) : !!slots.slotEssence[i];
    if (!has) continue;
    const p = progs[i];
    const rankIdx = Math.max(1, RANK_ORDER.indexOf(p.rank || 'iron'));
    const cand = { rank: RANK_ORDER[rankIdx], rankIdx, level: p.level || 0, progress: slotProgress(p) };
    if (!best
      || cand.rankIdx < best.rankIdx
      || (cand.rankIdx === best.rankIdx && cand.level < best.level)
      || (cand.rankIdx === best.rankIdx && cand.level === best.level && cand.progress < best.progress)) {
      best = cand;
    }
  }
  if (!best) return { rank: 'normal', rankIdx: RANK_ORDER.indexOf('normal'), level: 0, progress: 0, standing: 0 };
  best.standing = best.rankIdx + Math.min(0.999, (best.level + best.progress) / LEVELS_PER_RANK);
  return best;
}

/** The player's standing as the user asked to read it: "76% into Iron 4".
 *  One formatter, so the HUD, the save list and anything else that prints a
 *  level cannot drift into printing different numbers for the same character. */
export function formatStanding(st) {
  if (!st || st.rank === 'normal') return 'Normal';
  const name = st.rank.charAt(0).toUpperCase() + st.rank.slice(1);
  return `${Math.round(st.progress * 100)}% into ${name} ${st.level}`;
}

/**
 * Split banked xp across the four slots.
 *
 * "Experience is split between the 4 essences." An even split -- but a slot
 * that cannot progress yet (empty, or with an unfilled socket) HOLDS its share
 * in `banked` rather than losing it. Filling the last socket then pays out
 * everything that essence earned while you were still assembling it, which is
 * the difference between a rule that teaches and a rule that punishes.
 */
export function awardEssenceXp(progs, slots, amount, stonesPerSlot) {
  const share = amount / progs.length;
  const out = [];
  for (let i = 0; i < progs.length; i++) {
    const p = progs[i];
    if (slotEligible(slots, i, stonesPerSlot)) {
      p.xp += share + (p.banked || 0);
      if (p.banked) { out.push({ slot: i, released: p.banked }); p.banked = 0; }
    } else {
      p.banked = (p.banked || 0) + share;
    }
  }
  return out;
}

// ===========================================================================
// ROUND 174 -- WHAT A KILL PAYS WHILE YOU ARE STILL STANDING THERE.
//
// The user: "Killing monsters isn't granting any experience. A player should
// gain experience at about 10% of what they gain during meditation up to 90%.
// The last 10% has to be gained through meditation."
//
// MEASURED FIRST, because the report and the machinery disagreed: ten kills
// through `_killMonster` paid 792, every one at full sheet value, and
// `player.xp` did not move by a point. Round 127 made meditation the act of
// consolidation and `pendingXp` the bank it opens, so "isn't granting any
// experience" was exactly true of the number the player watches and exactly
// false of the bank behind it. Nothing was broken; the rule changed.
//
// SO A KILL IS SPLIT, and the two halves are named for what they are:
//
//   KILL_LIVE_SHARE      the tenth that commits now, on the spot.
//   KILL_LIVE_RANK_CAP   how far into a rank that tenth may carry an essence
//                        before it stops being accepted.
//
// NOTHING IS BURNED. A share the cap refuses, and a share belonging to a slot
// that cannot progress yet, both go BACK to the caller to be re-banked -- so
// the player who fights to 90% and stops has lost nothing, they have a
// meditation waiting. Quietly dropping the overflow would make the last tenth
// of a rank cost more than the first nine, which is the opposite of the ask.
//
// THE CAP IS PER ESSENCE, because rank is per essence. Four essences at four
// different ranks each have their own 90% line, and a character who is Iron on
// three and Bronze on one is exactly the character this game expects.
// ===========================================================================

/** The share of a kill that lands immediately rather than in the bank. */
export const KILL_LIVE_SHARE = 0.10;

/** How far into a rank kills alone may carry one essence. The last tenth is
 *  meditation's, which is the whole of the user's second sentence. */
export const KILL_LIVE_RANK_CAP = 0.90;

/** The total xp at which an essence hits the live ceiling for the rank it is
 *  currently in. Above this, kills pay nothing live and everything to the
 *  bank.
 *
 *  Expressed through RANK_XP_FLOOR and RANK_LEVEL_XP rather than by counting
 *  levels: those two ARE the curve (see standingForXp's note -- a curve read in
 *  five places is five curves), and a ceiling computed any other way would
 *  drift the first time RANK_XP_STEP is retuned. */
export function liveXpCeiling(xp) {
  const st = standingForXp(xp);
  const floor = RANK_XP_FLOOR[st.rank];
  const span = RANK_LEVEL_XP[st.rank] * LEVELS_PER_RANK;
  if (floor == null || !span) return Infinity;
  return floor + span * KILL_LIVE_RANK_CAP;
}

/**
 * Commit the live share of a kill, honouring the per-essence 90% ceiling.
 *
 * Returns `{ committed, refused, released }` -- `refused` is what the caller
 * must put back in the bank, and it is the number that makes this rule fair
 * rather than punitive.
 */
export function awardKillXp(progs, slots, amount, stonesPerSlot) {
  const share = (amount || 0) / progs.length;
  const out = { committed: 0, refused: 0, released: [] };
  if (!(amount > 0)) return out;
  for (let i = 0; i < progs.length; i++) {
    const p = progs[i];
    // A slot still being assembled does not BANK this the way meditation's
    // award does -- it hands it back. `p.banked` is meditation's mechanism for
    // paying out what an essence earned while you were socketing it, and
    // feeding it from the live path would let a kill release a hoard without
    // the player ever sitting down.
    if (!slotEligible(slots, i, stonesPerSlot)) { out.refused += share; continue; }
    const room = Math.max(0, liveXpCeiling(p.xp) - p.xp);
    const take = Math.min(share, room);
    p.xp += take;
    out.committed += take;
    out.refused += share - take;
  }
  return out;
}
