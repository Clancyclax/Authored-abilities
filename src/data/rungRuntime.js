// ============================================================================
// ROUND 285 (items 9-12) -- EVERY RANK-UP LINE DOES WHAT IT SAYS.
//
//   "Implement all 95 now."
//
// The rank ladders (rankLadders.js) grant each ability a rung per rank, and a
// rung is a sentence plus the fields it grants. An audit this round found 90
// of those fields read by nothing at all: the card printed "it lifts one
// condition as it heals", "it works while you are held", "a hit that lands on
// something already afflicted crits" -- and nothing happened.
//
// This file is the data half of the fix:
//
//   * `foldRungGrants` copies every rung field onto the ability the runtime
//     actually casts (and the card actually reads), and applies the rungs that
//     are plain numbers -- a longer ward, a farther dash, a quicker cast -- to
//     the ability's own figures, so the card's numbers already include them;
//   * `rungNumbersFragment` says each reached rung in the numbers line's own
//     register, so "Numbers now" states everything the effect text states;
//   * `riderStatsFragment` does the same for the composed riders (a trap, a
//     burst, a speed boost), which the numbers line had never listed.
//
// The runtime half is src/scenes/rungRuntimeMixin.js.
// ============================================================================
import { TILE } from './iso.js';

/** awakening.js's `fmtTiles`, restated: this file is imported BY awakening.js. */
function fmtTiles(units) {
  const t = Math.max(1, Math.round(((units || 0) / TILE) * 2) / 2);
  return `${t} tile${t === 1 ? '' : 's'}`;
}

/** Rung fields the scaled-ability fold in WorldScene already handles itself
 *  (or that are bookkeeping, not grants). Everything else is copied. */
export const RUNG_FOLD_SKIP = new Set(['rank', 'label', 'ladder', 'potency', 'cooldownFrac',
  'dot', 'chain', 'critChanceBonus', 'spamCostPerMult', 'spamPayLife', 'spamKillRefund',
  'runClimbsFaster', 'runLingers', 'runUncapped', 'dotRung', 'chainRung', 'healGrantsDr',
  'boonSelfCleanse', 'boonDoublesWhenHurt', 'boonDurationMult', 'boonMagnitudeMult',
  'boonCheaper', 'boonPermanent', 'boonInstant', 'executeBelow',
  'summonHpMult', 'masteryDmgPct', 'masteryTechnique', 'masteryCheaper', 'masteryReachPct',
  'arsenalFreeWield', 'arsenalCallsAll', 'arsenalAnyWeapon']);

/** Duration fields a ward's "holds for 50% longer" lengthens. */
export const WARD_DURATION_FIELDS = ['shieldDuration', 'buffDuration', 'immunityDuration', 'duration',
  'wallDuration', 'reflectDuration'];

/**
 * Copy the reached rungs' grants onto `out` (a scaled copy of the ability),
 * and fold in the ones that are figures. `aspects` is `rankAspectsAt(a, rank)`.
 * Idempotent per call: `out` is always a fresh copy made by the caller.
 */
export function foldRungGrants(out, aspects) {
  if (!out || !aspects || !aspects.length) return out;
  for (const x of aspects) {
    for (const [k, v] of Object.entries(x)) {
      if (RUNG_FOLD_SKIP.has(k)) continue;
      if (out[k] === undefined || out[k] === null) out[k] = v;
    }
  }
  // "it holds for 50% longer"
  if (out.wardDurationMult > 1 && !out._wardLengthened) {
    for (const f of WARD_DURATION_FIELDS) {
      if (typeof out[f] === 'number' && out[f] > 0) out[f] = Math.round(out[f] * out.wardDurationMult * 10) / 10;
    }
    out._wardLengthened = true;
  }
  // "it comes up 30% faster and cannot be interrupted"
  if (out.wardQuickCast > 0 && typeof out.castTime === 'number' && out.castTime > 0 && !out._wardQuick) {
    out.castTime = Math.round(out.castTime * (1 - out.wardQuickCast) * 100) / 100;
    out._wardQuick = true;
  }
  // "it reaches one more target" -- for a hold that counts its targets
  if (out.extraTargets > 0 && typeof out.maxTargets === 'number' && !out._extraTargeted) {
    out.maxTargets += out.extraTargets;
    out._extraTargeted = true;
  }
  // "it travels half again as far through anything solid"
  if (out.phasesTerrain && !out._phased) {
    for (const f of ['dashDist', 'teleportRange']) {
      if (typeof out[f] === 'number' && out[f] > 0) out[f] = Math.round(out[f] * 1.5);
    }
    out._phased = true;
  }
  return out;
}

const pct = (n) => Math.round(n * 100);

/**
 * The numbers line's clause for each reached rung, in the line's own terse
 * register. A rung whose effect is already a figure on the line (a longer
 * duration, a farther dash) says nothing here -- the figure is the statement.
 */
export function rungNumbersFragment(a) {
  if (!a) return '';
  const b = [];
  // guard
  if (a.wardTyped) b.push('stops transcendent damage too');
  if (a.wardSummons) b.push('covers your summons');
  if (a.breakStagger) b.push(`breaker stunned ${a.breakStagger}s`);
  if (a.wardThorns) b.push(`returns ${pct(a.wardThorns)}% of what it stops`);
  if (a.wardAnchors) b.push('no roots, freezes or slows while up');
  if (a.wardRefunds) b.push(`${pct(a.wardRefunds)}% of what it stops as stamina`);
  if (a.wardQuickCast) b.push('cannot be interrupted');
  if (a.wardScope === 'ally') b.push('also on the nearest ally');
  if (a.wardSlowsAttacker) b.push(`attackers -${pct(a.wardSlowsAttacker)}% speed 3s`);
  if (a.wardEatsConditions) b.push('stops a condition for 10% of it');
  if (a.wardRemainderHeals) b.push('leftover heals you');
  if (a.wardRefit) b.push(`re-forms once at ${pct(a.wardRefit)}%`);
  if (a.wardNullifiesBreaker) b.push('breaking blow does 0');
  if (a.wardScopeParty) b.push(`team at ${pct(a.wardScopeParty)}%`);
  if (a.wardUndispellable) b.push('works while suppressed');
  if (a.wardKillRestores) b.push('a kill refills it');
  // mend
  if (a.cleanseOnHeal) b.push(`lifts ${a.cleanseOnHeal} condition`);
  if (a.healPicksWorst) b.push('lands on whoever is worst off');
  if (a.overhealShield) b.push(`overheal -> shield ${a.overhealShield}s`);
  if (a.healTrail) b.push(`+25% more over ${a.healTrail}s`);
  if (a.healExtraTarget) b.push(`+${a.healExtraTarget} ally`);
  if (a.healEchoOnCrit) b.push(`team crit repeats it at ${pct(a.healEchoOnCrit)}%`);
  if (a.revives) b.push(`raises the downed at ${pct(a.revives)}%`);
  if (a.healUncuttable) b.push('ignores healing cuts');
  if (a.healPersists) b.push('its mending survives your death');
  // stride
  if (a.breaksRoot) b.push('breaks 1 root, freeze or slow');
  if (a.usableRooted) b.push('frees you of every root, freeze and slow');
  if (a.breaksTracking) b.push('foes beyond 3 tiles lose you');
  if (a.iframes) b.push(`untouchable ${a.iframes}s`);
  if (a.pathKnockaside) b.push('knocks aside what is in the way');
  if (a.departRoot) b.push(`roots what you leave ${a.departRoot}s`);
  if (a.charges) b.push(`${a.charges} uses within 4s`);
  if (a.killResets) b.push(`kill within ${a.killResets}s resets it`);
  if (a.phasesTerrain) b.push('passes through walls');
  if (a.arriveKnockback) b.push(`arrival knocks back within ${fmtTiles(a.arriveKnockback)}`);
  if (a.recall) b.push('use again to return');
  if (a.arriveGuaranteedCrit) b.push('next blow crits');
  // called
  if (a.summonWard) b.push('arrives shielded (30% of its health)');
  if (a.summonArrivesAttacking) b.push('attacks on arrival');
  if (a.summonTaunts) b.push('taunts your last target');
  if (a.summonInherits) b.push('its blows carry your last affliction');
  if (a.summonSharesHeals) b.push('healed when you are');
  if (a.summonScalesOnAfflictions) b.push('+15% per affliction of yours on its target');
  if (a.summonCap) b.push(`${a.summonCap} at once`);
  if (a.summonRecall) b.push('recast recalls it; the next is free');
  if (a.summonDeathblow) b.push('parting blow when it falls');
  if (a.summonRespawns) b.push(`stands again ${a.summonRespawns}x`);
  if (a.summonSharesDamage) b.push(`takes ${pct(a.summonSharesDamage)}% of blows meant for you`);
  // hold
  if (a.slowOnEnd) b.push(`-30% speed ${a.slowOnEnd}s after`);
  if (a.holdBlocksHealing) b.push('no healing while held');
  if (a.holdActsFirst) b.push('interrupts');
  if (a.holdAmplifies) b.push(`held take +${pct(a.holdAmplifies)}%`);
  if (a.holdSpreads) b.push('spreads to 1 more within 3 tiles');
  if (a.extraTargets) b.push(`+${a.extraTargets} target`);
  if (a.ignoreDrBelowRank) b.push('no resistance below your rank');
  if (a.holdLongerOnAfflicted) b.push(`+${pct(a.holdLongerOnAfflicted)}% on the afflicted`);
  if (a.holdSilences) b.push('recast while held: stunned');
  if (a.breakCostsTurn) b.push('they lose their next action after');
  if (a.holdSeals) b.push('held cannot be healed or warded');
  if (a.holdChains) b.push(`a 2nd target at ${pct(a.holdChains)}%`);
  // conjured
  if (a.noDecay) b.push('stays with you when you die');
  if (a.conjureToHand) b.push('straight to hand');
  if (a.conjureMatchesElement) b.push("takes your last target's element");
  if (a.conjureSecond) b.push('a second piece');
  if (a.conjureThrown) b.push('thrown at a foe out of reach, returns');
  if (a.conjureShareable) b.push('a companion may wear it');
  if (a.conjureRarityStep) b.push(`+${a.conjureRarityStep} rarity`);
  if (a.conjureKeepsAffix) b.push("keeps the replaced piece's effects");
  if (a.conjureReforges) b.push('reforged each dawn, keeping the better');
  if (a.conjurePersists) b.push('in your hands when you rise');
  if (a.conjureUnbreakable) b.push('armour-breaking afflictions do not take');
  if (a.conjureSet) b.push('a matched set');
  // strike
  if (a.critOnAfflicted) b.push('crits the afflicted');
  if (a.freeOnKill) b.push('free on a kill');
  if (a.echoStrike) b.push(`echo ${pct(a.echoStrike)}%`);
  if (a.openerDouble) b.push('x2 on an unhurt foe');
  if (a.unavoidable) b.push('ignores wards');
  if (a.runFreeOpener) b.push('first of a succession free');
  if (a.everyThirdFree) b.push(`every ${a.everyThirdFree === 3 ? 'third' : a.everyThirdFree + 'th'} use free`);
  if (a.killRefreshesAll) b.push('a kill resets your cooldowns');
  if (a.lineThrough) b.push('hits the line behind');
  // standing
  if (a.worksOutOfCombat) b.push('primed at the first blow of a fight');
  if (a.extendsToSummons) b.push('your summons too');
  if (a.doublesWhenHurt) b.push('x2 below half health');
  if (a.extendsToMount) b.push('your mount too');
  if (a.extendsToParty) b.push(`allies within ${fmtTiles(a.extendsToParty)}`);
  if (a.stacksWithItself) b.push(`a second copy +${pct(a.stacksWithItself)}%`);
  if (a.unsuppressable) b.push('cannot be suppressed');
  if (a.outlastsDeath) b.push(`${a.outlastsDeath}s past your death`);
  if (a.unlimitedRange) b.push('any distance');
  return b.length ? ' · ' + b.join(' · ') : '';
}

/** The runtime's rider scale (WorldScene RIDER_SCALE) -- one number, both sides. */
export const RIDER_SCALE_SHARED = 0.45;

/**
 * The composed riders, in the numbers line. The magnitudes are the RUNTIME's
 * (`_applyComposedRiders`), so the line says what happens. `a._cardRank`, when
 * set, filters out riders the ability has not reached yet.
 */
export function riderStatsFragment(a) {
  const riders = a && a.composedRiders;
  if (!riders || !riders.length) return '';
  let list = riders;
  const ranks = a.composedRiderRanks;
  const ORDER = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
  if (a._cardRank && ranks && ranks.length === riders.length) {
    const at = ORDER.indexOf(a._cardRank);
    list = riders.filter((_, i) => at >= ORDER.indexOf(ranks[i] || 'iron'));
  }
  const n = Math.max(1, Math.round((a.base || 6) * RIDER_SCALE_SHARED));
  const out = [];
  for (const r of list) {
    switch (r) {
      case 'impact': out.push(`+${n} to all in reach`); break;
      case 'explode': out.push(`bursts ${Math.max(1, Math.round(n * 0.6))} around each`); break;
      case 'dot': if (!a.dot) out.push(`${Math.max(1, Math.round(n * 0.35))}/tick x4`); break;
      case 'drain': out.push(`drains ${Math.max(1, Math.round(n * 0.6))}, 35% back`); break;
      case 'control': out.push('freezes 1.6s'); break;
      case 'taunt': out.push('taunts'); break;
      case 'dispel': out.push('strips 1 ward each'); break;
      case 'heal': out.push(`+${Math.max(1, Math.round((a.healAmount || n) * RIDER_SCALE_SHARED))} HP`); break;
      case 'hot': out.push(`+${Math.max(1, Math.round(n * 0.3))} HP/s 5s`); break;
      case 'shield': out.push(`${Math.max(1, Math.round((a.shieldAmount || n * 2) * RIDER_SCALE_SHARED))} shield ${a.shieldDuration || 8}s`); break;
      case 'cleanse': out.push('lifts 1 condition'); break;
      case 'buff': {
        const rb = a.riderBuff;
        out.push(rb ? `+${pct(rb.amount)}% ${rb.stat} ${rb.duration}s` : `+12% ${a.buffStat || 'power'} ${a.buffDuration || 10}s`);
        break;
      }
      case 'innervate': out.push(`+${n} mana`); break;
      case 'recover': out.push(`+${n} stamina`); break;
      case 'iot': out.push(`+${Math.max(1, Math.round(n * 0.2))} mana/s 6s`); break;
      case 'rot': out.push(`+${Math.max(1, Math.round(n * 0.2))} stamina/s 6s`); break;
      case 'move': out.push('+25% move speed 4s'); break;
      case 'stealth': out.push('stealth'); break;
      case 'imbue': out.push('+15% power 8s'); break;
      case 'refresh': out.push('-2s other cooldowns'); break;
      case 'summon_minion': out.push(`minion ${Math.max(1, Math.round(n * 0.5))} dmg 20s`); break;
      case 'summon_trap': out.push(`trap ${Math.max(1, Math.round(n * 0.7))} dmg`); break;
      case 'summon_terrain': out.push(`ground ${Math.max(1, Math.round(n * 0.4))}/tick 5s`); break;
      default: break;
    }
  }
  return out.length ? ' · ' + out.join(' · ') : '';
}
