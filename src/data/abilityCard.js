// ===========================================================================
// ROUND 190 (update 10) -- THE ABILITY CARD, IN THE BOOKS' FORMAT.
//
//   Ability: [Burst Shield] (Shield)
//   Special ability (recovery, retribution, magic, curse).
//   Cost: Moderate mana.
//   Cooldown: 20 seconds.
//   Current rank: Silver 2 (61%).
//   Effect (iron): Create a short-lived shield that ...
//   Effect (bronze): Inflicts [Vibrant Echo] on anyone damaged by the blast.
//   Effect (silver): Inflicts [Slow Learner] on anyone damaged by the blast.
//   [Vibrant Echo] (affliction, damage-over-time, magic, stacking): ...
//
//   10.1 "Currently higher rank effects overwrite lower rank effects. Rank ups
//        add effects, not overwrite them."
//   10.2 "companion abilities also need to be formatted the same way"
//
// One builder, returning plain parts, so the essence screen, the companion
// sheet and anything else render the same card. Each rank's line is what that
// rank ADDS -- a perception or an aura, whose tables hold the whole state per
// rank, is diffed against the rank below so a clause appears once, at the
// rank that brought it.
// ===========================================================================
import { liveAspects } from './rankLadders.js';
import { ASPECT_RANKS, rankAspectsFor, statsLineFor, rankScaled, formatRider,
  STONE_THEMES, fmtCd } from './awakening.js';
import { SENSES, senseAt } from './perception.js';
import { senseEffectClauses } from './senseClauses.js';
import { specAtRank as auraAtRank, auraEffectClauses } from './auras.js';
import { conditionDef, conditionByLabel } from './debuffs.js';
import { CANON_TEXT, CANON_CONDITIONS } from './canonText.js';   // ROUND 278 -- the canon, as sent
import { canonView } from './canonApproved.js';   // ROUND 280 -- and the edits the user approved
// ROUND 203 -- the one clause that says when a transcendent ability's damage
// is actually transcendent. See transcendent.js.
import { gateClause } from './transcendent.js';
import {
  cooldownPhrase, canonTags, costBand, drainPhrase, COOLDOWN_VARIES, COST_VARIES, VARIES_RULES,
  transformAtRank, transformEffectClauses,
} from './abilityCanon.js';

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

const TYPE_WORD = {
  absorbShield: 'Shield', armorBuff: 'Defence', immunityBuff: 'Defence', reflectWard: 'Ward', thornsBuff: 'Retribution',
  barrierWall: 'Barrier', tauntPull: 'Taunt', projectileBall: 'Bolt', volley: 'Volley', aoeRing: 'Nova',
  breathCone: 'Breath', chainStrike: 'Strike', sunderStrike: 'Strike', rangeStrike: 'Strike', stackStrike: 'Strike',
  imbueStrike: 'Strike', selfHeal: 'Healing', selfHot: 'Healing', aoeHealPulse: 'Healing', bloomField: 'Healing',
  cleanse: 'Cleansing', aura: 'Aura', perception: 'Perception', stacking: 'Stacking', activeSummon: 'Summon',
  summonBonded: 'Familiar', raiseDead: 'Summon', summonWeapon: 'Conjuration', summonArmor: 'Conjuration',
  summonGear: 'Conjuration', dash: 'Movement', teleport: 'Movement', movementHaste: 'Movement', passiveMove: 'Movement',
  stealthVeil: 'Concealment', timeFreeze: 'Control', confuseTurn: 'Control', abilityLock: 'Control',
  weakenRing: 'Curse', corpseBlast: 'Corpse', corpseMiasma: 'Corpse', corpseMine: 'Corpse', corpseDrain: 'Corpse',
  weaponAffinity: 'Weapon', twoHandWield: 'Weapon', unarmedFocus: 'Weapon', attrBoost: 'Attribute',
};

/** "Special attack", "Spell", "Special ability" or "Passive". */
function kindWord(a) {
  if (a.kind === 'passive') return 'Passive ability';
  // ROUND 285 (item 8) -- "It's either a spell attack, a special attack, or a
  // buff, not all three." A weapon in hand made ANYTHING a "Special attack",
  // including a damage buff; only an attack is an attack now. Which KIND of
  // attack is still the weapon (or stamina) test.
  if (a.category === 'attack') {
    return (a.requiresWeapon || (a.cost && a.cost.type === 'stamina')) ? 'Special attack' : 'Spell';
  }
  return 'Special ability';
}

// ROUND 201 -- the tag vocabulary moved to abilityCanon.js, which added the
// seven canon tags nothing here could derive (dimension, illusion,
// shape-change, boon, holy, counter, counter-execute) and put the whole list
// in the books' own order. This wrapper is all that is left of the old one;
// the rules it used to hold are the first ten entries of CANON_TAG_RULES,
// carried over unchanged.
const tagWords = (a) => canonTags(a);

/**
 * ROUND 229 -- a multi-pool entry price, in the books' own phrasing.
 *
 * "Extreme mana, extreme stamina, extreme health." Each pool keeps its OWN
 * band rather than sharing one word, because a ritual that costs extreme mana
 * and low health is a different ability from one that costs extreme of both and
 * a single band could not tell them apart -- and where the bands agree the line
 * reads exactly as canon writes it anyway.
 *
 * `Extreme` is not one of `COST_BANDS`, whose top word is `Very high`. It is
 * not added as a sixth band, because the bands are a pricing scale the whole
 * game is balanced on and a new top would silently re-band every ability above
 * the old ceiling. A spec that wants the book's word says so per pool.
 */
function costsPhrase(costs, drain) {
  // Sentence case, not title case: canon writes "Extreme mana, extreme stamina,
  // extreme health" -- one capital, at the start of the line, like any other
  // cost line in the book. The first cut capitalised every band and produced
  // "Extreme mana, Extreme stamina and Extreme health", which is the same
  // information and not the same sentence.
  const parts = costs.map((c, i) => {
    const band = c.band || costBand(c.amount);
    return `${i === 0 ? band : band.toLowerCase()} ${c.type}`;
  });
  const joined = parts.length === 1 ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  const entry = `${joined}.`;
  return drain ? `${entry} ${drain}` : entry;
}

function costWord(a) {
  // ROUND 201 -- a per-second drain of one or two pools ([Eternal Moment]).
  // It is printed INSTEAD of the entry price when there is no entry price and
  // AFTER it when there is, because "Cost: Moderate mana. Very high mana and
  // stamina, per second." is two different prices and a player needs both.
  const drain = drainPhrase(a);
  if (a.kind === 'passive' || !a.cost) return drain || 'None.';
  // ROUND 228 -- "Base cost: Varies." ([Path of Shadows]). The cooldown line
  // has answered this since round 201 and the cost line never could; an
  // ability with two prices at once cannot name one of them as the price.
  if (a.cost === COST_VARIES) return drain ? `Varies. ${drain}` : 'Varies.';
  // ROUND 229 -- MORE THAN ONE POOL AT THE DOOR. Canon, [Sanguine Horror]:
  // "Cost: Extreme mana, extreme stamina, extreme health." `drain` has been an
  // array since round 201 because [Eternal Moment] pays two pools per second,
  // and the ENTRY price has been a single {type, amount} since the beginning --
  // so a ritual that charges three pools at once could print only one of them,
  // and the card would have understated the most expensive ability in the books
  // by two thirds.
  if (Array.isArray(a.costs) && a.costs.length) return costsPhrase(a.costs, drain);
  const w = costBand(a.cost.amount);
  const entry = `${w} ${a.cost.type}${a.spammable && a.scaleOn === 'successiveUses' ? ', increasing with each successive attack' : ''}${a.bloodSurrogate ? ' (health can pay)' : ''}.`;
  return drain ? `${entry} ${drain}` : entry;
}

// ROUND 201 -- `cooldownPhrase` (abilityCanon.js) replaces a band table that
// topped out at minutes, so a canon six-hour cooldown printed "360 minutes".
// It also answers the two cases that had no line at all: a real zero prints
// "None." (canon's word on [Castigate] and [Karmic Warrior]) and a cooldown
// computed at use prints "Varies." ([Blessing of Readiness]).
//
// The passive guard stays: a passive has no cooldown line whatever it carries,
// because a triggered passive's internal cooldown is a property of the trigger
// and is stated in the trigger's own clause.
function cooldownWord(a) {
  if (a.kind === 'passive') return null;
  // ROUND 203 -- the flag, not a sentinel in the number. `a.cooldown` holds
  // the FLOOR of a Varies cooldown so that everything doing arithmetic on it
  // keeps working; this is the one surface that has to say the canon word.
  if (a.variesCooldown && VARIES_RULES[a.variesCooldown]) return cooldownPhrase(COOLDOWN_VARIES);
  return cooldownPhrase(a.cooldown);
}

/** A clause with its numbers taken out: two clauses with the same shape are
 *  the same effect at different strengths. */
const shapeOf = (c) => String(c).toLowerCase().replace(/[0-9]+(\.[0-9]+)?/g, '#');

/** Diff a rank's full clause list against the rank below: new effects are
 *  ADDED, same-shaped ones with new numbers are STRONGER. */
function diffClauses(prev, now, rank = null) {
  const prevSet = new Set(prev);
  const prevShapes = new Set(prev.map(shapeOf));
  const added = [], stronger = [];
  for (const c of now) {
    if (prevSet.has(c)) continue;
    (prevShapes.has(shapeOf(c)) ? stronger : added).push(c);
  }
  const out = [];
  if (added.length) out.push(`Adds: ${added.join('; ')}`);
  // ===== ROUND 202 (item 3) -- `Stronger:` IS COUNTED, NOT RESTATED ========
  //
  // This used to print the whole clause list again with the numbers nudged, so
  // a gold aura's card carried the same seven clauses four times over:
  //
  //   Effect (silver): Adds: kills outright anything below 10% health.
  //     Stronger: enemies within 4.4 tiles gain a mark every 1.5s (up to 5);
  //     each mark makes them take 5% more damage; anything that attacks you
  //     from inside takes 15 damage back; you heal for 38% of the field's
  //     damage.
  //   Effect (gold): ... the same four clauses, at 4.9 tiles and 6 and 6%.
  //
  // It measured at 9.1% of all cards and it is the "one ability offered four
  // times" shape -- the same fault round 134 fixed for two abilities inside a
  // kit, here between four ranks of one ability. Every one of those numbers is
  // already on the card: `Numbers now:` prints the figures AT THE PLAYER'S
  // RANK, so a reader who wants the silver figure reads it there.
  //
  // What is worth saying is that the rank moved something and how many things
  // it moved, because that is the one fact the numbers line cannot give
  // (it shows one rank at a time). So the count survives and the restatement
  // does not.
  // ===== ROUND 204 (item 2.8.2 / 2.3.4) -- AND A COUNT IS NOT A SENTENCE ===
  //
  // The user, on round 202's answer: `"4 of its figures grow." makes no
  // sense`. It does not, and the reason it measured as an improvement last
  // round is that it replaced something worse rather than something good.
  //
  // What he asked for instead is explicit: "If it said Effect (bronze) and
  // said reduced enemy armor by an additional 10% on strike, or paces required
  // reduced by 50%, or cap increased to 48% any of those would be acceptable
  // ... abilities don't always have to get more complicated, they can just get
  // better (longer, more powerful, cheaper, faster)."
  //
  // So the clause is restated AT ITS NEW VALUE -- which is the concrete thing
  // he named -- and capped at two, which is what keeps round 202's finding
  // from coming back. That finding was never "do not restate a clause"; it was
  // that restating ALL SEVEN at each of four ranks printed one ability four
  // times. Two is enough to say what a rank did and short enough to read.
  // ===== ROUND 204c -- AND THERE IS NO `Stronger:` AT IRON ===============
  //
  // A census of 1,000 generated abilities found one real instance of the
  // user's sixth report of this fault, and it was not in a ladder: an IRON
  // card reading `Stronger: you pick things up from 80% further away.`
  //
  // Iron is diffed against the `normal` row -- a rank below the one every
  // character starts at, which no player has ever seen. So at iron the split
  // between "added" and "stronger" is a distinction the reader cannot make:
  // everything on that line is new to them. The clauses are real information
  // and are kept; they are simply listed as what the ability DOES rather than
  // as what it does better than a version that never existed.
  if (stronger.length && rank === ASPECT_RANKS[0]) {
    added.push(...stronger);
    stronger.length = 0;
    // Rebuilt, because the `Adds:` line above was written before this ran.
    out.length = 0;
    out.push(`Adds: ${added.join('; ')}`);
  }
  if (stronger.length) {
    const shown = stronger.slice(0, 2).join('; ');
    const rest = stronger.length - 2;
    out.push(`Stronger: ${shown}${rest > 0 ? `, and ${rest} more of its figures` : ''}`);
  }
  return out;
}

/**
 * ROUND 270 -- WHAT EACH RANK BROUGHT, AT TODAY'S NUMBERS.
 *
 * The user: "The iron rank text changes every minor threshold or rankup, (or
 * even with some gear) the effect is the same, but the values should
 * progress." And: "Numbers now is more about a simplified version of the text
 * that combines all active effects together."
 *
 * So a rank's line still names what that rank BROUGHT -- the clause appears
 * once, under the rank that added it -- but it is printed at the reader's
 * CURRENT row. An Iron line on a Silver 4 aura reads 3.6 tiles and 42%, not
 * the 2.9 and 26% it read the day it was earned, and the "Stronger:" lines
 * that used to carry the difference have nothing left to say and are gone.
 *
 * `rowAt(r)` gives a rank's full clause list; `cur` is the reader's. A clause
 * is matched to the rank that introduced it by its SHAPE (numbers taken out).
 */
function progressTable(out, rowAt, curRank) {
  const cur = rowAt(curRank);
  // A shape ignores the numbers AND a trailing parenthetical, so "20% chance to
  // inflict sunder" at bronze and "32% chance ... (stacks to 2)" at silver are
  // one clause that grew, credited to bronze, not two.
  const key = (c) => shapeOf(c).replace(/\s*\([^)]*\)/g, '').trim();
  // Iron starts from nothing: the `normal` row is a rank nobody holds (round
  // 204c), so everything iron has is what iron brought.
  let prevShapes = new Set();
  let prevRow = [];
  const claimed = new Set();
  for (const r of ASPECT_RANKS) {
    const here = rowAt(r);
    const added = new Set(here.map(key).filter(sh => !prevShapes.has(sh)));
    out[r] = cur.filter(c => added.has(key(c)) && !claimed.has(c));
    for (const c of out[r]) claimed.add(c);
    // A RANK THAT ONLY MADE THINGS STRONGER still says so -- the user, round
    // 205: "Ability is silver rank but doesn't have a bronze or silver
    // effect." The clause itself is already on the line of the rank that
    // brought it, at today's figures; what THIS rank did is the growth, so
    // that is what it prints: "the field grew: +0.4 tiles, +8%".
    if (r !== ASPECT_RANKS[0]) {
      const grew = [];
      for (const c of here) {
        const was = prevRow.find(x => key(x) === key(c));
        if (!was || was === c) continue;
        const d = growthOf(was, c);
        if (d) grew.push(d);
      }
      if (grew.length) out[r] = [...out[r], `at this rank it grew: ${grew.slice(0, 3).join('; ')}`];
    }
    prevShapes = new Set(here.map(key));
    prevRow = here;
    if (r === curRank) break;
  }
  // A clause whose shape moved between ranks (a new "(stacks to 2)" tail, say)
  // was never matched above; it belongs to the reader's own rank line rather
  // than to nobody.
  const stray = cur.filter(c => !claimed.has(c));
  if (stray.length) out[curRank] = [...(out[curRank] || []), ...stray];
}

/** The growth between two readings of one clause, as signed amounts with
 *  their units: "enemies within 2.9 tiles lose 26% armour" -> "enemies within
 *  3.3 tiles lose 34% armour" is "+0.4 tiles, +8%". Null when nothing moved. */
function growthOf(was, now) {
  const num = /(\d+(?:\.\d+)?)(\s*(?:%|tiles?|s\b|seconds?|damage|health|marks?|stacks?)?)((?:\s+[a-z]+){0,2})/g;
  const STOP = new Set(['per', 'to', 'of', 'against', 'for', 'on', 'in', 'at', 'and', 'the', 'a', 'back', 'every']);
  const a = [...String(was).matchAll(num)], b = [...String(now).matchAll(num)];
  if (!a.length || a.length !== b.length) return null;
  const parts = [];
  for (let i = 0; i < a.length; i++) {
    const d = Number(b[i][1]) - Number(a[i][1]);
    if (Math.abs(d) < 1e-9) continue;
    const unit = (b[i][2] || '').trim();
    const mag = Math.round(Math.abs(d) * 10) / 10;
    // A percentage names what it is a percentage OF: the one or two words
    // after it, stopping at a preposition ("+8% armour", "+7% critical chance").
    let what = '';
    if (unit === '%') {
      const w = String(b[i][3] || '').trim().split(/\s+/).filter(Boolean);
      const keep = [];
      for (const x of w) { if (STOP.has(x)) break; keep.push(x); }
      what = keep.length ? ` ${keep.join(' ')}` : '';
    }
    parts.push(`${d > 0 ? '+' : '-'}${mag}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}${what}`);
  }
  return parts.length ? parts.join(', ') : null;
}

/** An aura row with the reader's gear laid over it: the signature's reach and
 *  the Spirit-driven `auraRange`, which `_auraRadius` multiplies in at run time. */
function auraRowSpec(spec, a, ctx) {
  if (!spec) return spec;
  const sig = (a.auraSignature && a.auraSignature.spec && a.auraSignature.spec.auraRadiusPct) || 0;
  const gear = (ctx && ctx.auraRange) || 0;
  if (!sig && !gear || !spec.auraRadius) return spec;
  return { ...spec, auraRadius: spec.auraRadius * (1 + sig) * (1 + gear) };
}

/**
 * ROUND 270 -- A GENERATED SENTENCE, AT TODAY'S NUMBERS.
 *
 * The opening sentence was written once, from the level-0 spec, and baked in.
 * `rankScaled` knows what every figure is now; this carries each changed
 * figure across. Only a figure that CHANGED is touched, and only where the
 * reading is unambiguous: a base value that another, unchanged field also
 * prints (a stack cap of 8 beside 8 damage) is left alone rather than guessed.
 */
export function progressFigures(text, base, now) {
  if (!text || !base || !now) return text;
  const pairs = [], still = [];
  const walk = (b, n, depth) => {
    for (const k of Object.keys(b)) {
      const bv = b[k], nv = n ? n[k] : undefined;
      if (typeof bv === 'number' && Number.isFinite(bv)) {
        if (typeof nv === 'number' && Number.isFinite(nv) && Math.abs(nv - bv) > 1e-9) pairs.push([bv, nv, k]);
        else still.push([bv, k]);
      } else if (depth < 1 && bv && typeof bv === 'object' && !Array.isArray(bv)) {
        walk(bv, nv && typeof nv === 'object' ? nv : null, depth + 1);
      }
    }
  };
  walk(base, now, 0);
  // ROUND 270 -- THE COOLDOWN, BY PHRASE, EVEN WHEN NOTHING ELSE MOVED. The
  // burst lever's sentence ("takes 14.9s to come round again") is written
  // while the spec is still being built, and a later stone can lengthen the
  // cooldown under it: measured, an Iron line saying 14.9s beside a Numbers
  // line saying 18s at the same standing. The spec is the truth.
  //
  // ROUND 276 -- written as a PLACEHOLDER and restored last, like the headline
  // figures below: measured, Dust Storm Gallop's "takes 3s" pinned correctly
  // and was then rewritten to "6s" by the base-to-now map, because another
  // field on the same spec moved from 3 to 6.
  let cdPin = null;
  if (typeof now.cooldown === 'number' && now.cooldown > 0 && !now.variesCooldown) {
    const cdNow = fmtCd(now.cooldown, now).replace(/\s*cd$/, '');
    if (!/varies/.test(cdNow)) {
      cdPin = cdNow;
      text = text
        .replace(/(nothing for )(\d+(?:\.\d+)?[smh])(?=\.)/g, (m, pre) => pre + '\u0002')
        .replace(/(takes )(\d+(?:\.\d+)?[smh])( to come round again)/g, (m, pre, n, post) => pre + '\u0002' + post)
        .replace(/(; )(\d+(?:\.\d+)?[smh])( before the next)/g, (m, pre, n, post) => pre + '\u0002' + post);
    }
  }
  const unpinCd = (t) => (cdPin === null ? t : t.replace(/\u0002/g, cdPin));
  if (!pairs.length) return unpinCd(text);
  const fmt = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
  // Every way a figure is printed: as itself, as a percentage, as tiles.
  const renders = (v, k) => {
    const out = [[fmt(v), '']];
    if (v > 0 && v < 2) out.push([String(Math.round(v * 100)), '%']);
    // Tiles as `fmtTiles` prints them: to the half tile, never under one.
    if (/radius|range|reach|dist/i.test(k)) out.push([fmt(Math.max(1, Math.round(v / 32 * 2) / 2)), ' tile']);
    return out;
  };
  const stillR = new Set();
  // An unchanged figure protects EVERY way it could be printed, tiles
  // included: an ally range of 180 that did not move prints "5.5 tiles", and
  // an aura radius that did move from the same 180 must not rewrite it.
  for (const [v, k] of still) for (const [t, suf] of renders(v, k || 'range')) stillR.add(t + suf);
  const map = new Map(), clash = new Set();
  for (const [bv, nv, k] of pairs) {
    const rb = renders(bv, k), rn = renders(nv, k);
    rb.forEach(([t, suf], i) => {
      const key = t + suf;
      const to = rn[i] ? rn[i][0] + rn[i][1] : null;
      if (!to || stillR.has(key)) return;
      if (map.has(key) && map.get(key) !== to) clash.add(key);
      else map.set(key, to);
    });
  }
  let outText = text;
  // THE HEADLINE FIGURES, BY PHRASE. A few sentences were written before a
  // later pass moved the spec under them (measured: a barrier's desc said 21
  // while its spec held 23), so a base-to-now map cannot find them. For the
  // magnitudes a player reads first, the phrase is matched and the CURRENT
  // value written in directly -- the spec is the truth, not the sentence.
  // Written as PLACEHOLDERS, restored at the end: a pinned figure must not be
  // rewritten again by the base-to-now pass below (measured: a heal pinned to
  // 10 a second became 9.4, because the cooldown also moved from 10 to 9.4).
  const held = [];
  // The first phrase always (it is the headline); any later one only when it
  // prints the same base figure -- a lever restating the same heal in other
  // words ("It restores 4 health a second to you or an ally") is the same
  // number and moves with it.
  const set = (re, v, b) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    const shown = fmt(v >= 2 ? Math.round(v) : v);
    let first = null;
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    outText = outText.replace(g, (m, pre, n, post) => {
      if (first === null) first = n;
      else if (!(typeof b === 'number' && Number(n) === Math.round(b)) && n !== first) return m;
      held.push(shown);
      return `${pre}\u0001${held.length - 1}\u0001${post}`;
    });
  };
  set(/(absorbs (?:the next )?)(\d+(?:\.\d+)?)( damage)/i, now.shieldAmount ?? now.absorb, base.shieldAmount ?? base.absorb);
  set(/(\b(?:[Rr]estores|[Hh]eals) (?:you for )?)(\d+(?:\.\d+)?)( health(?! a second))/, now.healAmount, base.healAmount);
  set(/(^|[^0-9.])(\d+(?:\.\d+)?)( health a second)/, now.hotPerSec, base.hotPerSec);
  // ROUND 298 -- not a damage-over-time figure: "[Bleeding] for 3 damage a
  // second" is the burn's number, and it was being overwritten with the hit's.
  set(/(\bdeal(?:s|ing)? )(\d+(?:\.\d+)?)((?: \w+)? damage\b(?! (?:a|per|every|each) second))/, now.base, base.base);
  set(/(\bfor )(\d+(?:\.\d+)?)((?: \w+)? damage\b(?! (?:a|per|every|each) second))/, now.base, base.base);
  const pinned = new Set(['shieldAmount', 'absorb', 'healAmount', 'hotPerSec', 'base']);
  for (const [bv, , k] of pairs) {
    if (!pinned.has(k)) continue;
    // A pinned figure has been written; its base must not be re-mapped below
    // onto some other number that happens to share it.
    for (const [t, suf] of renders(bv, k)) map.delete(t + suf);
  }
  // ONE PASS over every mapped figure, so no replacement can land on the
  // output of another. A bare figure never rewrites one that carries a unit of
  // its own ("5.5" must not reach into "5.5 tiles" or "5%"), nor the integer
  // part of a decimal.
  const keys = [...map.keys()].filter(k => !clash.has(k) && map.get(k) !== k)
    .sort((x, y) => y.length - x.length);
  if (keys.length) {
    const alt = keys.map(k => {
      const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const bare = !/[%a-z]/i.test(k);
      return bare ? `${esc}(?![0-9])(?!\\.[0-9])(?!\\s*tiles?\\b)(?!%)` : `${esc}(?![0-9])(?!\\.[0-9])`;
    }).join('|');
    outText = outText.replace(new RegExp(`(^|[^0-9.\\u0001])(${alt})`, 'g'), (m, pre, hit) => {
      const to = map.get(hit);
      return to === undefined ? m : pre + to;
    });
  }
  outText = outText.replace(/\u0001(\d+)\u0001/g, (m, i) => held[Number(i)]);
  return unpinCd(outText);
}

/** What each rank ADDS, as sentences. */
function rankAdds(a, curRank = 'gold', ctx = null) {
  const out = {};
  // ===== ROUND 228 -- A TRANSCRIPTION'S OWN RUNGS, PRINTED ================
  //
  // Every branch below DERIVES a rank's effect from a table the generator
  // filled in -- a sense, an aura, a transformation, a rider. A canon
  // transcription has no such table: the book wrote the four rungs out, and
  // until this round there was nowhere to put them.
  //
  // What that cost is worth naming, because it is this project's fault class 2
  // exactly. [Blade of Doom] has been in abilityCanon.js since round 221 with
  // `rankConditions` listing all six of its conditions by rank, and
  // [Haemorrhage] since round 224 with five -- and `rankConditions` has never
  // had a reader outside the two suites that assert it. The densest ability in
  // the game printed a generic summon-weapon ladder on its card. Round 228
  // adds seventeen more transcriptions across three rounds, so the field they
  // all need is built before the first four rather than after the last.
  //
  // FIRST, AND RETURNING, because an authored rung is not a hint to a
  // generator -- it is the book, and nothing derived may overwrite it. And it
  // flows through the SAME `effects` loop everything else does, so round 204's
  // rule still holds: a rank you have not reached does not print.
  if (a.rankEffects) {
    for (const r of ASPECT_RANKS) {
      const t = a.rankEffects[r];
      // Trailing period stripped because the caller re-terminates the joined
      // line; without this a canon rung ends in "..effects.." on the card.
      out[r] = t ? [String(t).trim().replace(/\.$/, '')] : [];
    }
    return out;
  }
  const table = (rowAt) => {
    let prev = rowAt('normal');
    for (const r of ASPECT_RANKS) {
      const now = rowAt(r);
      out[r] = diffClauses(prev, now, r);
      prev = now;
    }
  };
  if (a.template === 'perception' && a.sense && SENSES[a.sense]) {
    progressTable(out, (r) => senseEffectClauses(senseAt(a.sense, r)), curRank);
    return out;
  }
  if (a.template === 'aura' && a.aura) {
    progressTable(out, (r) => {
      const row = auraAtRank(a.aura, r);
      return row ? auraEffectClauses(auraRowSpec(row.spec, a, ctx), row.trigger, row.effect) : [];
    }, curRank);
    return out;
  }
  // ROUND 201 -- a transformation's table holds the WHOLE state per rank, the
  // same shape a perception and an aura use, so the same diff produces "gain
  // the ability to use magical tools" once at iron and "Stronger: +5" at
  // bronze rather than repeating five clauses four times.
  if (a.transform) {
    progressTable(out, (r) => transformEffectClauses(transformAtRank(a.transform, r)), curRank);
    return out;
  }
  // ===== ROUND 205 (item 1.1) -- THE AUTHORED RIDERS ARE RANK LINES TOO ====
  //
  // The user, on a Silver-rank mastery: "Ability is silver rank but doesn't
  // have a bronze or silver effect."
  //
  // `rankAspectsFor` dropping the mastery ladder was half of it; this is the
  // other half, and it is wider than the mastery. Round 77 gave the attribute
  // passives and the water walk their OWN hand-written rank tables -- bronze
  // "the small hurts close on their own", silver "you get your breath back
  // between things", gold "and everything you have comes round again sooner"
  // -- and round 190 rebuilt the card out of `rankAspects` alone. From that
  // round to this one the card has never printed a single one of them: every
  // attrBoost and every waterWalk in the game showed one iron line at every
  // rank, under a description that says in so many words "it goes on
  // deepening in other ways as you rank".
  //
  // Fault class 2 on this project's own list -- written by one side, read by
  // none. `rankEffectLine` reads them and nothing calls `rankEffectLine` for
  // the card any more.
  //
  // The rider's `text` is already a rank-effect clause in the card's own
  // voice, so it is pushed as one; `formatRider` supplies the figure, because
  // "the small hurts close on their own" without "+12% health recovery" is the
  // prose-without-mechanic half of this project's standing wording rule.
  for (const rd of (a.riders || [])) {
    if (!out[rd.rank]) out[rd.rank] = [];
    const where = a.template === 'waterWalk' ? ' while on water or swamp' : '';
    out[rd.rank].push(`${rd.text}${where} (${formatRider(rd)})`);
  }
  for (const x of liveAspects(a.rankAspects || rankAspectsFor(a))) {
    (out[x.rank] = out[x.rank] || []).push(x.label);
  }
  return out;
}

function conditionsOf(a, at = 99) {
  const out = [];
  const seen = new Set();
  const add = (def, label) => {
    const name = (def && def.label) || label;
    if (!name || seen.has(name)) return;
    seen.add(name);
    // ROUND 278 -- the user's own words for a condition, where he has sent them.
    const canonC = CANON_CONDITIONS[canonConditionKey(name)] || CANON_CONDITIONS[canonConditionKey(label || '')];
    if (canonC) { out.push(`[${canonC.label}] (${canonC.tags}): ${canonC.text}`); return; }
    const tags = def && def.tags ? def.tags.join(', ') : 'affliction';
    const blurb = def && def.blurb ? cap(def.blurb) : '';
    out.push(`[${name}] (${tags})${blurb ? `: ${blurb}.` : ''}`);
  };
  if (a.debuff) add(conditionDef(a.debuff.key), a.debuff.key);
  // ===== ROUND 204 (item 2.7.1) -- EVERY AFFLICTION THE CARD NAMES ========
  //
  // The user, on a field passive: "Doesn't explain what Unity Mark or
  // Balancing Ledger do."
  //
  // Unity Mark is gone (it was a signature handle, not a thing -- see
  // awakening.js). Balancing Ledger is real and the card simply never
  // explained it, because this function only looked at `a.debuff` and `a.dot`
  // -- the two places an affliction arrives when the TEMPLATE puts it there.
  // An aura signature, a field, a rank rung or a composed rider names one in
  // prose and none of them touch those fields.
  //
  // So the card reads its own text: anything it prints in [brackets] is
  // something the player is being told about and is therefore something the
  // player is owed a definition of. One rule, and it cannot go stale as new
  // sources of afflictions are added, because it keys off the printed page
  // rather than off a list of the places an affliction can come from.
  // ROUND 278 -- and the canon rungs: [Sacrificial Victim] and [Necrotoxin]
  // were printed on Haemorrhage's card and explained nowhere under it.
  const rungTexts = a.rankEffects ? ASPECT_RANKS.filter((r, i) => i <= at).map(r => a.rankEffects[r]).filter(Boolean) : [];
  for (const src of [a.desc, ...rungTexts, ...liveAspects(a.rankAspects).map(x => x && x.label)]) {
    for (const m of String(src || '').matchAll(/\[([^\]]{2,40})\]/g)) {
      const name = m[1];
      const def = conditionDef(name) || conditionByLabel(name);
      if (def) add(def, name);
    }
  }
  const dotDef = (label) => ({ label, tags: ['affliction', 'damage-over-time'],
    blurb: `deals ongoing ${a.element && a.element !== 'physical' ? a.element : 'physical'} damage for a few seconds after the hit` });
  if (a.dot && a.dot.label) add(dotDef(a.dot.label), a.dot.label);
  for (const x of liveAspects(a.rankAspects)) if (x.dot && x.dot.label) add(dotDef(x.dot.label), x.dot.label);
  return out;
}

/** ROUND 270 -- the reader's gear laid over the scaled clone, for the figures
 *  it actually moves: the cooldown (cooldown reduction, capped at 60% as the
 *  runtime caps it) and an aura's reach. */
function withGear(now, ctx) {
  if (!ctx || !now) return now;
  const out = { ...now };
  const cdr = Math.min(0.6, ctx.cooldownReduction || 0);
  if (cdr > 0 && typeof out.cooldown === 'number' && out.cooldown > 0) {
    out.cooldown = Math.round(out.cooldown * (1 - cdr) * 100) / 100;
  }
  if (ctx.auraRange && typeof out.auraRadius === 'number') out.auraRadius = out.auraRadius * (1 + ctx.auraRange);
  return out;
}

/**
 * The card's parts. `standing` is {rank, level, progress}; omit it for a card
 * with no rank line (a preview). Effects are listed for every rank reached;
 * the next rank's is included separately, marked, so the reader can see what
 * is coming without it reading as something they have.
 */
// ===========================================================================
// ROUND 278 -- A CANON ABILITY PRINTS THE CANON AND NOTHING ELSE.
//
//   "Cannon abilities are EXACT they are not to be modified without direct
//    approval to do so."
//
// Where the spec carries `canonKey` and the user's own text for it is in
// canonText.js (parsed, never retyped -- tools/build_canon_text.py), every
// line of the card is that text: the type line, the cost, the cooldown, the
// incantation and stone where the book gives them, and each rung up to the
// reader's rank. No opening sentence of ours, no lever clause, no generated
// rung. The glossary under it is every [condition] those rungs name, in the
// user's words where he has sent them.
//
// The Numbers line stays: it is not a claim about the ability, it is the
// game's reading of it -- the played cooldown (canon hours run at six to one)
// and the figures a canon card never prints.
// ===========================================================================
export function canonConditionLine(label) {
  const c = CANON_CONDITIONS[canonConditionKey(label)];
  if (c) return `[${c.label}] (${c.tags}): ${c.text}`;
  const def = conditionDef(label) || conditionByLabel(label);
  if (!def) return null;
  const tags = def.tags ? def.tags.join(', ') : 'affliction';
  return `[${def.label || label}] (${tags})${def.blurb ? `: ${cap(def.blurb)}.` : ''}`;
}
export function canonConditionKey(label) {
  // Articles dropped: the user's [Blood from Stone] and [Blood From a Stone] are one condition.
  let words = String(label).replace(/[’']/g, '').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  const kept = words.filter(w => !/^(a|an|the)$/i.test(w));
  if (kept.length) words = kept;
  return words.length ? words[0].toLowerCase() + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('') : '';
}
function canonCard(a, t, standing, ctx) {
  const rank = standing && ASPECT_RANKS.includes(standing.rank) ? standing.rank : 'iron';
  const at = ASPECT_RANKS.indexOf(rank);
  const level = Math.max(0, Math.min(9, Math.round((standing && standing.level) || 0)));
  const labels = t.labels || {};
  // The lines between the head and the rank line, in the order the paste
  // gave them: stone, incantations, type, cost, cooldown.
  const top = [];
  let preambleDone = false;
  const lab = (k, d) => labels[k] || d;
  for (const f of (t.fieldOrder || ['typeLine', 'cost', 'cooldown'])) {
    if (f === 'typeLine' && t.type) top.push(t.type);
    else if (f === 'type' && t.type) top.push(`${lab('type', 'Ability Type')}: ${t.type}`);
    else if (f === 'stone' && t.stone) top.push(`${lab('stone', 'Awakening Stone')}: ${t.stone}`);
    else if (f === 'essence' && t.essence) top.push(`${lab('essence', 'Essence')}: ${t.essence}`);
    else if (f === 'incantation' && t.incantation) top.push(`${lab('incantation', 'Incantation')}: ${t.incantation}`);
    else if (f === 'cost' && t.cost) top.push(`${lab('cost', t.costLabel || 'Cost')}: ${t.cost}`);
    else if (f === 'cooldown' && t.cooldown) top.push(`${lab('cooldown', 'Cooldown')}: ${t.cooldown}`);
    else if (f === 'preamble' && !preambleDone) { top.push(...(t.preamble || [])); preambleDone = true; }
  }
  if (!preambleDone) top.push(...(t.preamble || []));
  const effects = [];
  const named = [];
  const inline = new Set();
  const note = (text) => {
    for (const m of String(text).matchAll(/\[([^\]]{2,60})\]/g)) if (!named.includes(m[1])) named.push(m[1]);
  };
  ASPECT_RANKS.forEach((r, i) => {
    if (i > at) return;
    const text = t.rungs && t.rungs[r];
    if (text == null) return;
    const extras = (t.rungExtras && t.rungExtras[r]) || [];
    effects.push({ rank: r, text, reached: true, extras });
    note(text);
    for (const x of extras) {
      const cm = /^\*?\s*\[([^\]]+)\]\s*\(/.exec(x);
      if (cm) inline.add(canonConditionKey(cm[1])); else note(x);
    }
  });
  // "Ability limitations" (Path of Shadows) speak from bronze on.
  const limits = at >= 1 ? (t.limitations || []) : [];
  const now = withGear(rankScaled(a, rank, level), ctx);
  const local = t.conditions || {};
  const glossary = named.filter(l => !inline.has(canonConditionKey(l))).map(l => {
    const c = local[canonConditionKey(l)];
    return c ? `[${c.label}] (${c.tags}): ${c.text}` : canonConditionLine(l);
  }).filter(Boolean);
  return {
    canon: true,
    head: `Ability: [${t.name}] (${t.essence})`,
    sub: '',
    stone: null,
    canonLines: top,
    cost: null,
    cooldown: null,
    rank: standing ? `Current rank: ${cap(rank)} ${standing.level || 0} `
      + `(${String(Math.round((standing.progress || 0) * 100)).padStart(2, '0')}%).` : null,
    effects,
    limitations: limits,
    numbers: `Numbers now: ${statsLineFor(now)}`,
    gate: null,
    conditions: glossary,
  };
}

export function abilityCard(a, standing = null, ctx = null) {
  const canonT = a && a.canonKey ? canonView(a.canonKey) : null;
  if (canonT) return canonCard(a, canonT, standing, ctx);
  const rank = standing && ASPECT_RANKS.includes(standing.rank) ? standing.rank : 'iron';
  const at = ASPECT_RANKS.indexOf(rank);
  const level = Math.max(0, Math.min(9, Math.round((standing && standing.level) || 0)));
  // ROUND 270 -- `ctx` is the reader's gear, where it reaches an ability's
  // numbers: `auraRange` (the field's reach) and `cooldownReduction`. Omitted,
  // the card reads as it always did for a preview.
  const adds = rankAdds(a, rank, ctx);
  const effects = [];
  const nowForText = withGear(rankScaled(a, rank, level), ctx);
  // ===== ROUND 204 (item 1) -- ONLY THE RANKS YOU HAVE ===================
  //
  // The user: "An ability should only report what it does currently.
  // Abilities don't report what they do at a rank until they are that rank."
  //
  // The `(next) Effect (silver): ...` line is gone. It was added on the
  // reasoning that a reader wants to see what is coming; the reader's own
  // ruling is that a card is a statement of what the ability DOES, and a
  // sentence about a rank you have not reached is a different kind of claim
  // sitting in the same list as the true ones. The rank ladder is still
  // visible where it belongs -- on the essence screen, which is about
  // progress -- and nothing about the ranks themselves changed.
  // ROUND 285 (items 10, 11) -- a rider clause is said on the rank that pays
  // it, not on iron (see `appendComposedRiderClause`).
  let desc0 = String(a.desc || '').trim();
  const riderLater = {};
  for (const [clause, rk] of Object.entries(a.riderClauseRanks || {})) {
    if (!desc0.includes(clause)) continue;
    desc0 = desc0.replace(clause, '').replace(/\s{2,}/g, ' ').trim();
    (riderLater[rk] = riderLater[rk] || []).push(clause.replace(/\.$/, ''));
  }
  ASPECT_RANKS.forEach((r, i) => {
    if (i > at) return;
    let text = [...(riderLater[r] || []), ...(adds[r] || []).map(cap)].join('. ');
    // ROUND 270 -- the opening sentence at today's figures (see
    // `progressFigures`): written once from the level-0 spec, it is carried to
    // the rank and level this card is being read at.
    if (i === 0) text = [progressFigures(desc0, a, nowForText), text].filter(Boolean).join(' ');
    if (!text) return;
    effects.push({ rank: r, text: text.replace(/\.?$/, '.'), reached: true });
  });
  const tags = tagWords(a);
  // ===== ROUND 204 (item 7) -- THE CARD IS READ AT THE LEVEL, TOO ========
  //
  // Every number below now comes off the SAME clone the runtime would cast,
  // so "Current rank: Iron 9" and the figures under it are talking about the
  // same ability. They were not: `rankScaled(a, rank)` took no level, so a
  // card at the top of a rank printed the level-0 damage -- about half of
  // what the ability actually dealt -- and the cost and cooldown lines read
  // the unscaled spec underneath it.
  const now = withGear(rankScaled(a, rank, level), ctx);
  return {
    // ROUND 201 -- THE PARENTHETICAL IS THE ESSENCE, not the template's
    // category word. Canon: "Ability: [Specious Sorcerer] (Charlatan)",
    // "Ability: [Castigate] (Sin)" -- Charlatan and Sin are essences. Ours
    // printed "(Bolt)", which is the template, and the template is already
    // said by the type line directly underneath.
    //
    // `_srcName` is stamped on every generated ability by the one door in
    // rebuildKnownAbilities (round 120's note), and it is the confluence's name
    // where there is one, which is also what the books do. The old category
    // word is the fallback for a hand-written spec with no essence behind it --
    // a test fixture, a monster's ability -- rather than an empty pair of
    // brackets.
    head: `Ability: [${a.name}] (${a._srcName || TYPE_WORD[a.template] || cap(a.category || 'Ability')})`,
    sub: `${kindWord(a)}${tags.length ? ` (${tags.join(', ')})` : ''}.`,
    // ===== ROUND 206b -- WHICH STONE MADE IT ==============================
    //
    // The user, on a shipped card: "This doesn't say what awakening stone it
    // came from. Its a good ability but it still needs to roll off of the
    // right awakening stone."
    //
    // The head line stays as canon writes it -- "Ability: [Specious Sorcerer]
    // (Charlatan)", the ESSENCE in the brackets, which is round 201's rule and
    // is not up for revision. The stone gets its own line instead, because the
    // player needs both: the essence says what family the ability belongs to
    // and the stone says which of that essence's hundred-odd faces they
    // actually rolled.
    //
    // Null for an innate and for a confluence's own grant, which come from no
    // stone at all -- `abilityCardLines` drops the empty line rather than
    // printing "Awakening stone: none", which would be a fact about nothing.
    stone: a.stoneId && STONE_THEMES[a.stoneId]
      ? `Awakening stone: ${STONE_THEMES[a.stoneId].word}.` : null,
    cost: `Cost: ${costWord(now)}`,
    cooldown: cooldownWord(now) ? `Cooldown: ${cooldownWord(now)}` : null,   // ROUND 270 -- with gear
    // ROUND 201 -- zero-padded to two digits. Canon writes "(00%)" at the
    // bottom of a rank and "(19%)" nineteen percent in; ours wrote "(0%)",
    // which is the same number in a different shape and is the kind of
    // difference a reader notices without being able to name.
    rank: standing ? `Current rank: ${cap(rank)} ${standing.level || 0} `
      + `(${String(Math.round((standing.progress || 0) * 100)).padStart(2, '0')}%).` : null,
    effects,
    numbers: `Numbers now: ${statsLineFor(now)}`,
    // ROUND 203 -- the transcendent gate, printed where the reader will look
    // for it: with the conditions, under the numbers.
    //
    // This line is why `gateClause` exists, and until now nothing called it --
    // a rule the game enforced on every swing and never told anyone. An
    // ability whose damage is only transcendent "while you are below a quarter
    // of your health" is unusable knowledge if the player has to infer it from
    // the colour of the numbers.
    gate: gateClause(a),
    conditions: conditionsOf(a, at),
  };
}

/** The card as plain lines, for tests and text surfaces. */
export function abilityCardLines(a, standing = null, ctx = null) {
  const c = abilityCard(a, standing, ctx);
  return [c.head, c.sub, c.stone, ...(c.canonLines || []), c.cost, c.cooldown, c.rank,
    ...c.effects.flatMap(e => [`${e.reached ? '' : '(next) '}Effect (${e.rank}): ${e.text}`, ...(e.extras || [])]),
    ...(c.limitations || []),
    c.numbers, c.gate, ...c.conditions].filter(Boolean);
}
