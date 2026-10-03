// ===========================================================================
// ROUND 201 -- THE CANON LAYER: WHAT THE BOOKS CAN SAY THAT WE COULD NOT.
//
// Ten abilities transcribed from HWFWM canon (nine in round 200, plus
// [Castigate] this round) were read against our own cards in
// docs/ABILITY_CANON_GAP.md. The finding there was that the FORMAT was already
// right and the MODEL was the thing that could not speak: five cost/cooldown
// rhythms we had no way to express, a self-transformation archetype that is
// three of the ten, a targeting exclusion ("an ally and not yourself") that had
// no word, and a handful of tags with no derivation behind them.
//
// This module is that missing vocabulary, and it is a DATA module with no
// imports from the scene on purpose: every rule here is a pure function over a
// spec, so a suite can ask "what would the card say" without a browser, a
// world, or a fight. It is the same reason advancement.js is a data module.
//
// WHAT IS DELIBERATELY NOT HERE. The essence/awakening architecture is not
// touched -- nothing in this file generates an ability, picks a socket, or
// decides what a stone grants. It describes SHAPES that a generated ability may
// declare, and the generator opts in by setting a field.
// ===========================================================================

// ===========================================================================
// 1. TIME -- CANON HOURS, PLAYED AT SIX TO ONE.
//
// The user's ruling, given with the reason:
//
//   "1 hour cooldown should become 10 minutes IRL, 6 hour cooldown should
//    become 60 minutes IRL. An 24 hour cooldown should become 4 hours. This
//    lets the player still feel like they have to use a resource without
//    slowing down the actual gameplay too much."
//
// Three worked examples, and all three are the same ratio: 60/10, 360/60,
// 1440/240. So this is ONE divisor rather than a lookup table, and the table
// would have been the worse answer -- a fourth canon figure (Deny the Reaper's
// is written in days in one printing) would have had no row and would have
// fallen through to "unchanged", which is the silent-wrong-answer shape this
// project keeps finding.
//
// THE CANON FIGURE IS KEPT, not overwritten. `canonCooldownHours` stays on the
// spec so the card, a tooltip or a lore screen can still say what the book
// said, and `cooldown` -- the only field the runtime reads -- is the played
// number. An ability that stored only the divided figure could never be
// checked against its source again.
// ===========================================================================

/** Canon hours run six times faster in play. One number, three worked
 *  examples, and `abilityCanonFaults` asserts all three. */
export const CANON_HOUR_DIVISOR = 6;

/** A canon cooldown written in hours, as seconds of play. */
export function canonHours(hours) {
  return Math.round((Number(hours) || 0) * 3600 / CANON_HOUR_DIVISOR);
}

/** The reverse, for a card that wants to quote the book. */
export function playedToCanonHours(seconds) {
  return Math.round((Number(seconds) || 0) * CANON_HOUR_DIVISOR / 3600 * 100) / 100;
}

/**
 * Stamp a spec authored in canon hours. Sets the played `cooldown` and keeps
 * the canon figure beside it. Returns the spec so it can be used inline.
 */
export function withCanonCooldown(spec, hours) {
  spec.canonCooldownHours = hours;
  spec.cooldown = canonHours(hours);
  return spec;
}

// ===========================================================================
// 2. COOLDOWN AND COST BANDS -- INCLUDING THE THREE THE CARD COULD NOT PRINT.
//
// `cooldownWord` in abilityCard.js topped out at minutes, so a six-hour canon
// cooldown printed as "360 minutes". It also had no case for a cooldown of
// zero (canon writes "Cooldown: None." on [Castigate] and [Karmic Warrior])
// and none for one computed at use ("Cooldown: Varies." on [Blessing of
// Readiness], whose cooldown is the time it just removed from someone else's).
//
// WHERE THE HOURS BAND STARTS is a real decision and not an obvious one. The
// user phrased their own compression as "6 hour cooldown should become 60
// minutes", so the played figure they have in mind for that ability is sixty
// MINUTES, and a band that started at 3600s would print "1 hour" and quietly
// disagree with the sentence that specified it. So hours begin at ninety
// minutes: 3600s reads "60 minutes", 14400s reads "4 hours", and both match
// the words the rule was written in.
// ===========================================================================

/** A cooldown computed at use. Assign it to `spec.cooldown` in place of a
 *  number; the runtime asks `resolveVariesCooldown` for the real figure. */
export const COOLDOWN_VARIES = 'varies';

/** Below this many seconds a cooldown is phrased in minutes, at or above it in
 *  hours. Ninety minutes -- see the note above. */
export const HOURS_BAND_START = 5400;
/** Below this many seconds a cooldown is phrased in seconds. */
export const MINUTES_BAND_START = 120;

/** The books' phrasing for any cooldown, including None, Varies and hours. */
export function cooldownPhrase(cd) {
  if (cd === COOLDOWN_VARIES) return 'Varies.';
  if (cd == null || typeof cd !== 'number' || !isFinite(cd)) return null;
  if (cd <= 0) return 'None.';
  if (cd >= HOURS_BAND_START) {
    const h = Math.round(cd / 360) / 10;
    return `${h % 1 === 0 ? h : h.toFixed(1)} hour${h === 1 ? '' : 's'}.`;
  }
  if (cd >= MINUTES_BAND_START) {
    const m = Math.round(cd / 60);
    return `${m} minute${m === 1 ? '' : 's'}.`;
  }
  return `${Math.round(cd * 10) / 10} seconds.`;
}

/**
 * [Blessing of Readiness]: "Cooldown: Varies." -- its cooldown is the amount of
 * cooldown it removed from the ally it was cast on. A spec declares
 * `variesCooldown` as a rule name; this resolves it against the context the
 * runtime hands in. A rule with no entry returns the spec's `cooldownFloor`,
 * which is how an unknown rule degrades to something finite rather than to
 * zero.
 */
export const VARIES_RULES = {
  /** Equal to the time removed from the target. */
  reciprocal: (ctx) => Math.max(0, ctx.removed || 0),
  // ROUND 203 -- there was a third rule here, `mirrorRemaining`: "equal to the
  // remaining duration of what it copied". It is deleted rather than kept,
  // because round 201 wrote it against a copy-a-buff template the game does
  // not have, and nothing in the generator could ever stamp it. A rule with no
  // writer and no reader is round 134's fault in its purest form -- the file
  // describes a mechanic, the game does not have it, and the description is
  // what a reader trusts. If a mimic template ever lands, it comes back with
  // a caller.
  /** Equal to how long the effect it granted lasts. */
  durationOfGrant: (ctx) => Math.max(0, ctx.duration || 0),
};

export function resolveVariesCooldown(spec, ctx = {}) {
  const floor = Math.max(0, spec.cooldownFloor || 0);
  const rule = VARIES_RULES[spec.variesCooldown];
  if (!rule) return floor;
  return Math.max(floor, rule(ctx));
}

// ===========================================================================
// 3. PER-SECOND DRAIN OF TWO POOLS.
//
// [Eternal Moment]: "Cost: Very high mana and stamina, per second." Our
// `spec.cost` is one {type, amount} charged once at cast, which cannot say
// either half of that -- not two pools, and not per second.
//
// A spec declares `drain: [{type, perSec}, ...]` and keeps `cost` for the
// entry price. Both are honoured; an ability may have one, the other, or both.
// The drain ENDS THE ABILITY when a pool cannot pay, which is the mechanic
// rather than a safety check: an ability you can hold only as long as you can
// afford it is the thing the canon line describes.
// ===========================================================================

/** The pools a drain may name. Health is included: a drain that eats health is
 *  a real HWFWM shape and the wounding path already answers it. */
export const DRAIN_POOLS = ['mana', 'stamina', 'health'];

/** One second of drain, as {pool: amount}. Pure -- the caller spends it. */
export function drainTick(spec, seconds = 1) {
  const out = {};
  for (const d of (spec.drain || [])) {
    if (!DRAIN_POOLS.includes(d.type)) continue;
    out[d.type] = (out[d.type] || 0) + (d.perSec || 0) * seconds;
  }
  return out;
}

/** Can `pools` (a {mana, stamina, health} snapshot) pay one tick? */
export function canPayDrain(spec, pools, seconds = 1) {
  const tick = drainTick(spec, seconds);
  for (const [k, v] of Object.entries(tick)) {
    if ((pools[k] || 0) < v) return false;
  }
  return true;
}

/** The cost band word, shared with the card. Split out of abilityCard so the
 *  drain line and the entry line use one vocabulary. */
export const COST_BANDS = [
  { max: 4, word: 'Very low' }, { max: 9, word: 'Low' }, { max: 18, word: 'Moderate' },
  { max: 32, word: 'High' }, { max: Infinity, word: 'Very high' },
];
export function costBand(n) {
  for (const b of COST_BANDS) if (n <= b.max) return b.word;
  return 'Very high';
}

/**
 * ROUND 228 -- "BASE COST: VARIES." -- the cost line's missing band.
 *
 * Round 201 built `COOLDOWN_VARIES` for [Blessing of Readiness], whose
 * cooldown is computed at use, and noted that the card had no case for it.
 * The cost line has the same hole and nothing needed it until now:
 *
 *   [Path of Shadows] (Dark) -- Base cost: Varies. Cooldown: Varies.
 *
 * and it varies for a reason the ability could not otherwise state. Its iron
 * effect is a low-cost special ability with no cooldown; its bronze effect is
 * a very-high-cost conjuration on a ten-minute cooldown; and canon is explicit
 * that they are both live at once -- "the iron-rank effect can still be used
 * while this ability is on cooldown." One ability, two prices, and a single
 * `cost.amount` can only print one of them. See `modes` on the exemplar.
 *
 * Assign it to `spec.cost` in place of the {type, amount} object.
 */
export const COST_VARIES = 'varies';

/** "Very high mana and stamina, per second." */
export function drainPhrase(spec) {
  const d = (spec.drain || []).filter(x => DRAIN_POOLS.includes(x.type));
  if (!d.length) return null;
  const band = costBand(Math.max(...d.map(x => x.perSec || 0)));
  const pools = d.map(x => x.type);
  const joined = pools.length === 1 ? pools[0]
    : `${pools.slice(0, -1).join(', ')} and ${pools[pools.length - 1]}`;
  return `${band} ${joined}, per second.`;
}

// ===========================================================================
// 4. THE SELF-TRANSFORMATION TEMPLATE.
//
// Three of the ten canon abilities -- [Specious Sorcerer], [Counterfeit
// Combatant], [Instant Adept] -- are ONE ability with three swaps. Each:
//
//   * grants a significant increase to ONE attribute,
//   * grants the PROFICIENCY to use a class of equipment,
//   * raises the MAXIMUM of one pool,
//   * adds an ongoing RECOVERY of that pool,
//   * for a duration, on an hours-scale cooldown.
//
// That is a strong signal and it is why this is a row with three swaps rather
// than three features. It also brings in PROFICIENCY, which the game had only
// in the negative: `requiresWeapon` gates an ability on a weapon being in hand,
// and nothing anywhere ever GRANTED the ability to use one.
// ===========================================================================

// ROUND 202 -- THE PROFICIENCY TABLE MOVED, AND ITS CONTENTS CHANGED.
//
// Round 201 invented four proficiencies (magicalTools, martialWeapons,
// heavyArmour, ritualTools) because canon named "magical tools" and nothing
// said what the rest of the set was. The user has now set it: five, named
// after what they cover -- magical tools, blade, power, polearm, dexterity --
// and two of round 201's four (heavyArmour, ritualTools) were guesses with no
// weapon behind them. They are deleted rather than kept beside the real ones,
// because a proficiency nothing can grant and no weapon requires is the
// "written by one side, read by none" fault in its purest form.
//
// proficiencies.js owns the table now; this file re-exports it so nothing that
// imported it from here has to move.
import { PROFICIENCIES, PROFICIENCY_KEYS } from './proficiencies.js';
import { CANON_TEXT } from './canonText.js';   // ROUND 278 -- the user's own text, where sent
import { CANON_EXEMPLARS_03, CANON_EXEMPLAR_FIXES_03 } from './abilityCanon03.js';   // ROUND 287
export { PROFICIENCIES, PROFICIENCY_KEYS };

/** The three canon rows, as the swaps. `attr` is the attribute raised, `pool`
 *  the one whose maximum grows and which then recovers, `prof` what it lets
 *  you use. Named after the books so the source of each is readable. */
export const TRANSFORMATIONS = {
  // ROUND 202 -- re-pointed at the user's five. Canon gives Specious Sorcerer
  // "magical tools" by name, so that one is unchanged; Counterfeit Combatant's
  // "martial weapons" is the whole armed half of the taxonomy and `power` is
  // the heavy end of it, which is what a Charlatan pretending to be a warrior
  // is pretending to be; Instant Adept's was `ritualTools`, a round-201
  // invention with no weapon behind it, and `blade` is what a borrowed
  // competence most plausibly borrows.
  // ROUND 204 (item 2.8.1) -- WHAT A COUNTERFEIT COMBATANT COUNTERFEITS.
  //
  // The user, on a spear kit that was handed this: "This kit has a spear
  // essence it doesn't need the ability to use heavy arms."
  //
  // Round 202 narrowed canon's "martial weapons" to `power` alone, on the
  // reading that power is "the heavy end of the taxonomy". That was the wrong
  // trade: it made the clause redundant on exactly the builds most likely to
  // roll it -- a weapon kit already holds one martial proficiency and now
  // gains a second it has no weapon for -- and it made the ability smaller
  // than the book. Canon says martial weapons, plural and unqualified, so it
  // is all four of them: on a caster that is the whole fantasy of the
  // ability, and on a spear kit it is three proficiencies it did not have.
  //
  // `profs` is a list because the answer is a list. One field, so no reader
  // has to know that two of the three rows happen to name only one.
  speciousSorcerer: { label: 'Specious Sorcerer', attr: 'spirit', pool: 'mana', profs: ['magicalTools'] },
  counterfeitCombatant: { label: 'Counterfeit Combatant', attr: 'power', pool: 'stamina', profs: ['blade', 'power', 'polearm', 'dexterity'] },
  instantAdept: { label: 'Instant Adept', attr: 'recovery', pool: 'health', profs: ['blade'] },
};
export const TRANSFORMATION_KEYS = Object.keys(TRANSFORMATIONS);

/** The rank-by-rank strength of a transformation. A "significant increase" is
 *  the band the books use for the largest attribute grant an ability gives, so
 *  it starts where `attrBoost`'s single point ends and climbs from there. */
// ROUND 203 -- THE FIGURES ARE THE ONES THE GAME CAN ACTUALLY DELIVER.
//
// The first cut ran 3 / 5 / 8 / 12, reasoning from "significant increase" and
// nothing else. Attributes in this game run 0..6 (inventory.js: ATTR_SOFT_CAP
// 4, ATTR_HARD_CAP 6, the user's own "as high as 6"), and `computeAttrTotal`
// clamps the total at the ceiling -- so +8 and +12 measured IDENTICALLY to
// +6 on a live character. The card printed twelve and the player received
// six: an ability whose stated effect and real effect disagree, which is the
// thing this project checks for above almost anything else.
//
// So the ladder now ends AT the hard cap. Gold makes a character with no
// spirit at all into a 6 -- the ceiling of what anyone may permanently be,
// held for ninety seconds on an hour's cooldown, which is the books' conceit
// exactly: you are briefly the sorcerer you are pretending to be, and you
// cannot pretend to be better than the best. The runtime raises the CEILING
// by the same amount for the duration (WorldScene's `_applyTransform` seam),
// so a character already at the soft cap of four still gets the two points
// they were promised rather than silently nothing.
export const TRANSFORM_BY_RANK = {
  iron:   { attrAmount: 2, maxPoolPct: 0.20, regenPerSec: 2, duration: 30 },
  bronze: { attrAmount: 3, maxPoolPct: 0.30, regenPerSec: 3, duration: 45 },
  silver: { attrAmount: 4, maxPoolPct: 0.40, regenPerSec: 5, duration: 60 },
  gold:   { attrAmount: 6, maxPoolPct: 0.55, regenPerSec: 8, duration: 90 },
};
// `attrAmount`, not `attr`: the row names the attribute and the rank names how
// much of it, and spreading one over the other with the same key is how the
// first draft of this silently turned [Spirit] into [3].

/** The whole state of a transformation at a rank -- not a delta. The card
 *  diffs consecutive ranks itself, exactly as it does for perceptions and
 *  auras, so a clause appears once at the rank that brought it. */
export function transformAtRank(key, rank = 'iron') {
  const row = TRANSFORMATIONS[key];
  const by = TRANSFORM_BY_RANK[rank];
  if (!row || !by) return null;
  return { ...row, ...by, key };
}

/** The clause list for a transformation at a rank, in the books' voice. */
export function transformEffectClauses(state) {
  if (!state) return [];
  const profs = (state.profs || []).map(k => PROFICIENCIES[k]).filter(Boolean);
  // ROUND 204 -- four proficiencies read as a list of four weapon pairs, which
  // is a sentence nobody finishes. The four martial ones together are "every
  // martial weapon", which is canon's own phrase and is shorter than any of
  // the parts.
  const MARTIAL = ['blade', 'power', 'polearm', 'dexterity'];
  const allMartial = MARTIAL.every(k => (state.profs || []).includes(k));
  const profWords = allMartial ? 'every martial weapon'
    : profs.map(p => p.short).join(', ');
  return [
    `gain a significant increase to the [${cap(state.attr)}] attribute (+${state.attrAmount})`,
    // ROUND 202 -- `short` rather than `label`: the new table's labels are
    // title-case names for a UI row ("Magical Tools") and this is the middle
    // of a sentence. Canon's own line is "gain the ability to use magical
    // tools", which is the short form exactly.
    profWords ? `gain the ability to use ${profWords}` : null,
    `your maximum ${state.pool} increases by ${Math.round(state.maxPoolPct * 100)}%`,
    `you gain an ongoing ${state.pool} recovery effect of ${state.regenPerSec} a second`,
    `lasts ${state.duration} seconds`,
  ].filter(Boolean);
}

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

// ===========================================================================
// 5. TARGETING -- A SCOPE WITH AN EXCLUSION.
//
// `HEAL_SCOPES` gave us self / ally / party, on healing only, and its 'ally'
// deliberately INCLUDES the caster ("the ally who needs it most is a
// comparison, not an exclusion" -- round 50's own note, and it is right for a
// heal). Canon needs two things that cannot be said with it:
//
//   [Blessing of Readiness]  "Can only be used on others, not yourself."
//   [Bait and Switch]        "Target an ally or yourself." -- on a non-heal.
//
// So the scope is lifted out of healing and given a third axis. `self` is
// 'only' / 'allow' / 'exclude' rather than a boolean, because all three occur.
// The three old names keep their old meanings exactly, so every existing heal
// reads the same through the new table.
// ===========================================================================

export const TARGET_SCOPES = {
  self:         { side: 'friendly', self: 'only',    count: 1 },
  ally:         { side: 'friendly', self: 'allow',   count: 1 },
  allyNotSelf:  { side: 'friendly', self: 'exclude', count: 1 },
  allyOrSelf:   { side: 'friendly', self: 'allow',   count: 1 },
  party:        { side: 'friendly', self: 'allow',   count: Infinity },
  partyNotSelf: { side: 'friendly', self: 'exclude', count: Infinity },
  enemy:        { side: 'hostile',  self: 'exclude', count: 1 },
  enemies:      { side: 'hostile',  self: 'exclude', count: Infinity },
};
export const TARGET_SCOPE_KEYS = Object.keys(TARGET_SCOPES);

/** The three heal scopes, unchanged, so nothing that reads HEAL_SCOPES has to
 *  learn the bigger table. */
export const LEGACY_HEAL_SCOPES = ['self', 'ally', 'party'];

/** May this scope land on the caster? */
export function scopeAllowsSelf(scope) {
  const s = TARGET_SCOPES[scope] || TARGET_SCOPES.self;
  return s.self !== 'exclude';
}
/** Must it land on the caster and nobody else? */
export function scopeIsSelfOnly(scope) {
  return (TARGET_SCOPES[scope] || TARGET_SCOPES.self).self === 'only';
}
export function scopeSide(scope) {
  return (TARGET_SCOPES[scope] || TARGET_SCOPES.self).side;
}

/** The clause a stats line uses. The three legacy phrasings are preserved word
 *  for word; the new scopes get the canon sentence. */
export function scopeWho(scope) {
  switch (scope) {
    case 'party': return 'to you and your team';
    case 'partyNotSelf': return 'to your team but not to you';
    case 'ally': return 'to the ally who needs it most';
    case 'allyNotSelf': return 'to an ally, never to yourself';
    case 'allyOrSelf': return 'to an ally or to yourself';
    case 'enemy': return 'to your target';
    case 'enemies': return 'to every enemy in reach';
    default: return 'to yourself';
  }
}

// ===========================================================================
// 6. REACTIVES THAT ARE ALLOWED TO BE FREE.
//
// [Karmic Warrior]: "Cooldown: None." and it fires "whenever you are affected
// by a harmful effect, even if that effect is wholly negated." Two things our
// triggers could not do. `composedTriggerFields` ended with
//
//     cooldown: trigger.cooldown || 6
//
// which turns a deliberate zero into six -- the classic `||` fault on a falsy
// legitimate value -- and every trigger kind fired on damage LANDED, so an
// attack that was absorbed, resisted or dodged reached nothing.
//
// `harmAttempted` is the new trigger kind and it is a different event from
// `hurt`: it is raised at the point harm is DIRECTED at you, before mitigation
// decides whether any of it arrives.
// ===========================================================================

/** Trigger kinds that may legitimately carry a zero internal cooldown. A
 *  trigger not on this list still floors at its authored number, so the fix to
 *  `||` cannot accidentally make every composed trigger free. */
export const FREE_TRIGGERS = ['harmAttempted', 'negatedHarm'];

/** The internal cooldown a trigger actually gets. Zero survives only for a
 *  trigger written to be free. */
export function triggerIcd(trigger, fallback = 6) {
  if (!trigger) return fallback;
  if (typeof trigger.cooldown !== 'number') return fallback;
  if (trigger.cooldown > 0) return trigger.cooldown;
  return FREE_TRIGGERS.includes(trigger.on) ? 0 : fallback;
}

// ===========================================================================
// 7. THE TAG VOCABULARY.
//
// Seven canon tags had no derivation behind them, which meant an ability could
// never carry them however it was built. Each is given a rule over the spec
// here rather than a hand-written list, for the reason this project keeps
// relearning: a hand-maintained list beside a generator is a list that drifts.
//
// `boon` and `holy` are the interesting pair -- both already existed on the
// CONDITION side (debuffs.js's TAG table has them) and simply never reached the
// ability's own tag list, so [Agent of Karma] could be tagged holy while the
// ability that grants it could not.
// ===========================================================================

export const CANON_TAG_RULES = {
  // ROUND 238 -- `restoresPools`. Canon heads [Hero's Moment] "Spell (boon,
  // holy, recovery)" and its recovery clause is "ongoing mana and stamina
  // recovery" -- not healing at all. Every reading this rule had was about
  // HEALTH, so the one canon ability whose recovery is of the other two pools
  // could not be tagged with the word the book puts on it.
  //
  // Declared on the spec rather than derived from the condition it grants: this
  // module is pure data over specs and does not import the condition table --
  // see why `canonRankEffectFaults` takes its lookup as an argument -- so a rule
  // that asked "does the condition this grants restore pools" would give the
  // file a dependency the whole design avoids.
  recovery: (a) => a.category === 'healing' || !!(a.healAmount || a.hot || a.healOnUse)
    || !!a.restoresPools,
  healing: (a) => !!(a.healAmount || a.hot) && a.category === 'healing',
  retribution: (a) => a.template === 'thornsBuff' || !!a.retaliate,
  magic: (a) => !!(a.cost && a.cost.type === 'mana')
    || (a.drain || []).some(d => d.type === 'mana'),
  curse: (a) => !!a.debuff || a.template === 'weakenRing' || a.template === 'targetAffliction',   // ROUND 278 -- a curse laid on a target
  'damage-over-time': (a) => !!a.dot,
  // ROUND 239 -- AN AURA IS AN AREA, AND THE RULE COULD NOT SEE ONE.
  //
  // The regex is `/aoe|Ring|Cone|Field/i` and the game's standing field is
  // called `aura`, which matches none of them. Measured: a ring is tagged
  // `area`, a bloom field is tagged `area`, and an aura -- the one ability in
  // the kit whose entire value is its footprint (round 58 gave Spirit
  // `auraRange` for exactly that reason) -- is tagged nothing at all.
  //
  // Found transcribing [Dragon's Might], whose canon heading is "(Aura)". The
  // fault is the one this project keeps writing down: a word list built from the
  // shapes somebody was looking at, applied to the one written next. `aura` and
  // `auraRadius` are both admitted, so a spec that declares a radius without
  // using the template is covered too.
  area: (a) => !!a.explodeRadius || !!a.auraRadius
    || /aoe|aura|Ring|Cone|Field/i.test(a.template || ''),
  // ROUND 228 -- and `conjures`, which is a spec saying in so many words that
  // it conjures a named thing. [Path of Shadows] is headed "Special
  // Ability/Conjuration" in the book and its bronze rung conjures a gate
  // between two places, but its template is `teleport` -- so the derivation
  // read it as a dimension effect and nothing else, and the card's tag line
  // quietly disagreed with the heading it was transcribed from. `conjures` has
  // been declared on [Blade of Doom] since round 221 and on [Hand of the
  // Reaper] this round; both already earned the tag off their template, which
  // is why the field never had to be consulted until an ability conjured
  // something without being a summon.
  conjuration: (a) => /^summon|Summon|raiseDead/.test(a.template || '') || !!a.conjures,
  // ROUND 238 -- POISON AND SUMMON, two words the books put in parentheses and
  // this vocabulary could not say.
  //
  // Canon heads [Verdant Cage] "Spell/Conjuration (poison)" and [Spartoi]
  // "Summoning (ritual, summon)". Until this round the card printed `curse` for
  // the first (any spec with a `debuff` is cursed) and `conjuration` for the
  // second, so two transcriptions had to be wrong about themselves to pass.
  //
  // `poison` reads the spec's own element list, which every exemplar already
  // declares -- no new flag, and an ability that deals poison damage is tagged
  // for it whether or not it happens to carry a condition.
  poison: (a) => a.element === 'poison' || (a.elements || []).includes('poison'),
  // `summon` is narrower than `conjuration` on purpose, and the line is the one
  // the books themselves draw: a summon puts a CREATURE in the world, a
  // conjuration puts an OBJECT there. summonWeapon, summonArmor and summonGear
  // stay conjurations -- [Dragon Armour] is a conjuration in canon's own
  // heading -- and summonBonded, a familiar or an explicit `summons` are
  // summons. Both tags on one ability is correct and expected: a summoned
  // creature is conjured.
  summon: (a) => /^summon(Bonded|Minion|Creature|Pack)/.test(a.template || '')
    || !!a.familiar || !!a.summons,
  repeatable: (a) => !!a.spammable,
  stacking: (a) => !!a.stackShape,
  // --- the seven that had no source ----------------------------------------
  dimension: (a) => a.template === 'teleport' || !!a.blinkOnUse || !!a.phaseShift,
  illusion: (a) => !!a.decoy || a.template === 'stealthVeil',
  'shape-change': (a) => !!a.transform,
  boon: (a) => !!a.boon || !!(a.grantsCondition && a.grantsCondition.friendly),
  holy: (a) => HOLY_ELEMENTS.includes(a.element) || !!a.holy,
  // ROUND 221 -- [Blade of Doom] is headed "Conjuration (unholy)" in the
  // book, and the vocabulary had no word for it: the ability came out tagged
  // `curse` off its debuff, which is true and is not what the heading says.
  // The mirror of `holy` in every respect, down to the element list -- and
  // the two are not exclusive on purpose, because the ability that provoked
  // this one carries a holy second form.
  unholy: (a) => UNHOLY_ELEMENTS.includes(a.element) || !!a.unholy,
  'counter-execute': (a) => !!(a.trigger && a.reactive && a.execute),
  counter: (a) => !!(a.trigger && a.reactive) && !a.execute,
};

/** The elements the books treat as holy. `life` is here and `nature` is not:
 *  a healing vine is not a holy effect and tagging it so would make the tag
 *  mean nothing. */
export const HOLY_ELEMENTS = ['radiant', 'light', 'life'];

/** ROUND 221 -- and the elements the books treat as unholy. `shadow` is here
 *  and `dark` is not a channel this game has; `necrotic` is the one the
 *  [Ruination] triplet deals and is what [Blade of Doom] is made of. */
export const UNHOLY_ELEMENTS = ['necrotic', 'unholy'];

/** Every tag the vocabulary can produce, in the order the books list them. */
export const CANON_TAG_ORDER = [
  'recovery', 'healing', 'boon', 'holy', 'retribution', 'counter', 'counter-execute',
  'magic', 'curse', 'poison', 'damage-over-time', 'area', 'conjuration', 'summon',
  'dimension', 'illusion', 'shape-change', 'repeatable', 'stacking', 'unholy',
];

/** The tags an ability carries, derived. Element comes last, as it always did. */
export function canonTags(a) {
  const out = [];
  for (const t of CANON_TAG_ORDER) {
    const rule = CANON_TAG_RULES[t];
    if (rule && rule(a)) out.push(t);
  }
  const el = a.element && a.element !== 'physical' ? a.element : null;
  if (el && !out.includes(el)) out.push(el);
  return [...new Set(out)];
}

// ===========================================================================
// 8. FAULTS.
//
// The rule this project has settled on: a check that counts the roster is not
// a test. Every assertion below is a PROPERTY -- the three worked examples the
// user gave, the bands either side of their boundaries, the exclusion that is
// the whole point of the new scope table.
// ===========================================================================

export function abilityCanonFaults() {
  const out = [];

  // --- the user's three worked examples, exactly ---------------------------
  const want = [[1, 600], [6, 3600], [24, 14400]];
  for (const [h, s] of want) {
    if (canonHours(h) !== s) out.push(`canonHours(${h}) is ${canonHours(h)}, the ruling says ${s}`);
  }
  // ...and the words they were written in.
  if (cooldownPhrase(canonHours(1)) !== '10 minutes.') out.push(`1 canon hour prints "${cooldownPhrase(canonHours(1))}", not "10 minutes."`);
  if (cooldownPhrase(canonHours(6)) !== '60 minutes.') out.push(`6 canon hours print "${cooldownPhrase(canonHours(6))}", not "60 minutes."`);
  if (cooldownPhrase(canonHours(24)) !== '4 hours.') out.push(`24 canon hours print "${cooldownPhrase(canonHours(24))}", not "4 hours."`);

  // --- the bands the card could not reach ----------------------------------
  if (cooldownPhrase(0) !== 'None.') out.push('a zero cooldown no longer prints "None."');
  if (cooldownPhrase(COOLDOWN_VARIES) !== 'Varies.') out.push('a computed cooldown no longer prints "Varies."');
  if (cooldownPhrase(0.6) !== '0.6 seconds.') out.push('sub-second cooldowns lost their decimal');
  if (cooldownPhrase(119) !== '119 seconds.') out.push('the seconds band ends in the wrong place');
  if (cooldownPhrase(120) !== '2 minutes.') out.push('the minutes band starts in the wrong place');
  if (/minutes/.test(cooldownPhrase(HOURS_BAND_START)) ) out.push('the hours band starts in the wrong place');
  if (cooldownPhrase(null) !== null) out.push('a spec with no cooldown should print no line at all');

  // --- Varies resolves, and an unknown rule degrades to the floor ----------
  const bor = { cooldown: COOLDOWN_VARIES, variesCooldown: 'reciprocal', cooldownFloor: 5 };
  if (resolveVariesCooldown(bor, { removed: 40 }) !== 40) out.push('a reciprocal cooldown does not equal what it removed');
  if (resolveVariesCooldown(bor, { removed: 1 }) !== 5) out.push('a reciprocal cooldown ignores its floor');
  if (resolveVariesCooldown({ variesCooldown: 'nonesuch', cooldownFloor: 7 }, {}) !== 7) {
    out.push('an unknown varies rule does not fall back to the floor');
  }

  // --- the drain, both halves ----------------------------------------------
  const em = { drain: [{ type: 'mana', perSec: 40 }, { type: 'stamina', perSec: 40 }] };
  const tick = drainTick(em, 1);
  if (tick.mana !== 40 || tick.stamina !== 40) out.push('a two-pool drain does not charge both pools');
  if (canPayDrain(em, { mana: 100, stamina: 10 })) out.push('a drain claims it can be paid from an empty pool');
  if (!canPayDrain(em, { mana: 100, stamina: 100 })) out.push('a drain refuses a payment it can afford');
  if (drainPhrase(em) !== 'Very high mana and stamina, per second.') {
    out.push(`the drain line reads "${drainPhrase(em)}"`);
  }
  if (drainPhrase({}) !== null) out.push('an ability with no drain still prints a drain line');
  if (drainTick({ drain: [{ type: 'nonesuch', perSec: 99 }] }).nonesuch) {
    out.push('a drain accepts a pool that does not exist');
  }

  // --- the transformation is one row with three swaps ---------------------
  const attrs = new Set(), pools = new Set(), profs = new Set();
  for (const k of TRANSFORMATION_KEYS) {
    const t = TRANSFORMATIONS[k];
    attrs.add(t.attr); pools.add(t.pool);
    // ROUND 204 -- `profs`, a list: a Counterfeit Combatant lends all four
    // martial proficiencies, which is what canon's "martial weapons" says.
    if (!Array.isArray(t.profs) || !t.profs.length) out.push(`${k} lends no proficiency at all`);
    for (const pk of (t.profs || [])) {
      profs.add(pk);
      if (!PROFICIENCIES[pk]) out.push(`${k} grants a proficiency that does not exist: ${pk}`);
    }
    if (!DRAIN_POOLS.includes(t.pool)) out.push(`${k} raises a pool that does not exist: ${t.pool}`);
  }
  if (attrs.size !== TRANSFORMATION_KEYS.length) out.push('two transformations raise the same attribute');
  if (pools.size !== TRANSFORMATION_KEYS.length) out.push('two transformations raise the same pool');
  // ROUND 204 -- the three must not be INTERCHANGEABLE, which is what this
  // rule was really guarding: one proficiency each meant one per row. Now that
  // the Counterfeit Combatant lends all four martial proficiencies, `blade`
  // legitimately appears twice -- so the rule is stated as what it meant. No
  // two rows may lend the SAME SET; a Specious Sorcerer and an Instant Adept
  // that both handed over magical tools would be one ability with two names.
  {
    const sets = TRANSFORMATION_KEYS.map(k => (TRANSFORMATIONS[k].profs || []).slice().sort().join(','));
    if (new Set(sets).size !== sets.length) out.push('two transformations lend the same proficiencies');
  }
  // Every rank is stronger than the one below it on every axis -- if it is
  // not, a rank-up prints a clause that takes something away.
  const ranks = ['iron', 'bronze', 'silver', 'gold'];
  for (let i = 1; i < ranks.length; i++) {
    const lo = TRANSFORM_BY_RANK[ranks[i - 1]], hi = TRANSFORM_BY_RANK[ranks[i]];
    for (const f of ['attrAmount', 'maxPoolPct', 'regenPerSec', 'duration']) {
      if (!(hi[f] > lo[f])) out.push(`transformation ${f} does not grow from ${ranks[i - 1]} to ${ranks[i]}`);
    }
  }
  const clauses = transformEffectClauses(transformAtRank('speciousSorcerer', 'iron'));
  for (const need of ['Spirit', 'magical tools', 'maximum mana', 'recovery']) {
    if (!clauses.join(' ').includes(need)) out.push(`the transformation clause list no longer mentions ${need}`);
  }
  if (transformAtRank('nonesuch', 'iron')) out.push('an unknown transformation resolves to something');

  // --- the exclusion that is the whole point ------------------------------
  if (scopeAllowsSelf('allyNotSelf')) out.push('allyNotSelf allows the caster, which is the one thing it exists to forbid');
  if (!scopeAllowsSelf('allyOrSelf')) out.push('allyOrSelf excludes the caster');
  if (!scopeIsSelfOnly('self')) out.push('self is no longer self-only');
  if (scopeIsSelfOnly('ally')) out.push('ally became self-only');
  for (const s of LEGACY_HEAL_SCOPES) {
    if (!TARGET_SCOPES[s]) out.push(`the heal scope ${s} has no row in the new table`);
  }
  if (!scopeAllowsSelf('ally')) out.push("the legacy 'ally' scope changed meaning; round 50's rule was that it includes the caster");
  if (scopeSide('enemy') !== 'hostile') out.push('the enemy scope is not hostile');
  if (scopeWho('allyNotSelf') !== 'to an ally, never to yourself') out.push('the exclusion has no sentence');

  // --- free triggers, and only where they were written to be free ---------
  if (triggerIcd({ on: 'harmAttempted', cooldown: 0 }) !== 0) out.push('a trigger written to be free still floors at six seconds');
  if (triggerIcd({ on: 'strike', cooldown: 0 }) !== 6) out.push('an ordinary trigger got a free ride from the zero fix');
  if (triggerIcd({ on: 'strike', cooldown: 3 }) !== 3) out.push('an authored internal cooldown was discarded');
  if (triggerIcd(null) !== 6) out.push('a missing trigger does not fall back');

  // --- the seven tags that had no source ----------------------------------
  const cases = [
    ['dimension', { template: 'teleport' }],
    ['illusion', { decoy: true }],
    ['shape-change', { transform: 'speciousSorcerer' }],
    ['boon', { boon: true }],
    ['holy', { element: 'radiant' }],
    ['unholy', { element: 'necrotic' }],
    ['counter-execute', { trigger: { on: 'harmAttempted' }, reactive: true, execute: true }],
    ['healing', { category: 'healing', healAmount: 10 }],
    // ROUND 238 -- the three added this round, each shown to have a source.
    ['poison', { elements: ['nature', 'poison'] }],
    ['summon', { template: 'summonBonded' }],
    ['recovery', { restoresPools: true }],
  ];
  for (const [tag, spec] of cases) {
    if (!canonTags(spec).includes(tag)) out.push(`nothing can be tagged ${tag}`);
  }
  // ...and they do not appear on things that have not earned them.
  const plain = canonTags({ template: 'projectileBall', cost: { type: 'mana', amount: 8 } });
  for (const t of ['dimension', 'illusion', 'shape-change', 'boon', 'holy', 'unholy',
    'counter-execute', 'poison', 'summon']) {
    if (plain.includes(t)) out.push(`a plain bolt is tagged ${t}`);
  }
  // ROUND 238 -- and the line between the two conjuring tags holds. A conjured
  // ARMOUR is not a summoned creature, which is the distinction canon's own
  // headings draw ([Dragon Armour] is "Conjuration", [Spartoi] is "Summoning").
  const worn = canonTags({ template: 'summonArmor', cost: { type: 'mana', amount: 30 } });
  if (worn.includes('summon')) out.push('conjured armour is tagged summon');
  if (!worn.includes('conjuration')) out.push('conjured armour is not tagged conjuration');
  // A counter is not a counter-execute, and an execute reactive is not both.
  const ce = canonTags({ trigger: { on: 'harmAttempted' }, reactive: true, execute: true });
  if (ce.includes('counter')) out.push('a counter-execute is tagged counter as well, which reads as two effects');
  // Every tag in the order list has a rule, and every rule is in the order
  // list -- the two-hand-maintained-lists fault, checked rather than trusted.
  for (const t of CANON_TAG_ORDER) if (!CANON_TAG_RULES[t]) out.push(`${t} is listed but nothing can produce it`);
  for (const t of Object.keys(CANON_TAG_RULES)) if (!CANON_TAG_ORDER.includes(t)) out.push(`${t} can be produced but is never printed`);

  return out;
}

// ===========================================================================
// 9. THE TEN TRANSCRIPTIONS, AS SPECS.
//
// The user supplied ten abilities word for word out of the books -- nine in
// round 200 and [Castigate] in round 201. They are written out here as real
// specs, and that is the point of them: the gap document CLAIMED the model
// could not express five particular shapes, and the only way to know that it
// can now is to write the ten down and read the cards back.
//
// These are REFERENCE ROWS, not content. Nothing generates from them, no
// socket can roll one, and the essence/awakening architecture does not know
// they exist. `canonExemplarFaults` renders each one and asserts the lines the
// books print -- so if a later round breaks the hours band, the exclusion or
// the drain, the failure names the canon ability that stopped reading right
// rather than an abstraction.
// ===========================================================================

export const CANON_EXEMPLARS = {
  speciousSorcerer: {
    name: 'Specious Sorcerer', _srcName: 'Charlatan', category: 'utility',
    kind: 'active', template: 'attrBoost', transform: 'speciousSorcerer',
    cost: { type: 'mana', amount: 40 }, ...withCanonCooldown({}, 6),
    desc: 'Become, for a little while, the mage you are pretending to be.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
  },
  counterfeitCombatant: {
    name: 'Counterfeit Combatant', _srcName: 'Charlatan', category: 'utility',
    kind: 'active', template: 'attrBoost', transform: 'counterfeitCombatant',
    cost: { type: 'stamina', amount: 40 }, ...withCanonCooldown({}, 6),
    desc: 'Become, for a little while, the swordsman you are pretending to be.',
    wantCost: 'Very high stamina.', wantCooldown: '60 minutes.',
  },
  instantAdept: {
    name: 'Instant Adept', _srcName: 'Adept', category: 'utility',
    kind: 'active', template: 'attrBoost', transform: 'instantAdept',
    cost: { type: 'mana', amount: 40 }, ...withCanonCooldown({}, 6),
    desc: 'Borrow a competence you have not earned.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
  },
  blessingOfReadiness: {
    name: 'Blessing of Readiness', _srcName: 'Adept', category: 'utility',
    kind: 'active', template: 'cleanse', scope: 'allyNotSelf',
    cost: { type: 'mana', amount: 16 },
    cooldown: COOLDOWN_VARIES, variesCooldown: 'reciprocal', cooldownFloor: 5,
    boon: true, element: 'light',
    desc: "Take time off an ally's cooldowns, and pay for it with your own.",
    wantCost: 'Moderate mana.', wantCooldown: 'Varies.', wantTags: ['boon', 'holy'],
  },
  baitAndSwitch: {
    name: 'Bait and Switch', _srcName: 'Trap', category: 'utility',
    kind: 'active', template: 'teleport', scope: 'allyOrSelf',
    cost: { type: 'mana', amount: 12 }, cooldown: 30,
    decoy: true, blinkOnUse: true,
    desc: 'Leave something that looks like you standing where you were.',
    wantCooldown: '30 seconds.', wantTags: ['dimension', 'illusion'],
  },
  denyTheReaper: {
    name: 'Deny the Reaper', _srcName: 'Balance', category: 'attack',
    kind: 'active', template: 'chainStrike', element: 'transcendent',
    cost: { type: 'health', amount: 20 }, cooldown: 0,
    trigger: { on: 'harmAttempted', cooldown: 0 }, reactive: true, execute: true,
    desc: 'The closer you are to the end, the harder you answer.',
    wantCooldown: 'None.', wantTags: ['counter-execute'],
  },
  karmicWarrior: {
    name: 'Karmic Warrior', _srcName: 'Balance', category: 'utility',
    kind: 'active', template: 'thornsBuff', element: 'radiant',
    cost: { type: 'mana', amount: 6 }, cooldown: 0,
    trigger: { on: 'harmAttempted', cooldown: 0 }, reactive: true, boon: true,
    desc: 'Every slight against you is written down.',
    wantCost: 'Low mana.', wantCooldown: 'None.', wantTags: ['boon', 'holy', 'retribution'],
  },
  childOfTheCelestialWind: {
    name: 'Child of the Celestial Wind', _srcName: 'Wind', category: 'utility',
    kind: 'passive', template: 'passiveMove', element: 'wind',
    racial: true, resist: { element: 'disruptive' },
    desc: 'What your blood already knows, amplified.',
    wantCost: 'None.',
  },
  eternalMoment: {
    name: 'Eternal Moment', _srcName: 'Swift', category: 'utility',
    kind: 'active', template: 'timeFreeze',
    drain: [{ type: 'mana', perSec: 40 }, { type: 'stamina', perSec: 40 }],
    ...withCanonCooldown({}, 24),
    desc: 'For as long as you can pay, the world takes its time.',
    wantCost: 'Very high mana and stamina, per second.', wantCooldown: '4 hours.',
  },
  // ROUND 230 -- [CASTIGATE] GETS ITS LADDER.
  //
  // Round 201 transcribed this one from the user's line and had only the iron
  // rung: the whole of its canon text went into `desc`, which is why this row's
  // description reads like a rank effect rather than like flavour. The user has
  // now supplied all four rungs, so the description becomes a description and
  // the four canon sentences go where they belong -- and three more conditions
  // arrive with them, two of which ([Weight of Sin], [Marshal of Judgement])
  // are the first this table has had that act on the CASTER.
  //
  // WHAT ROUND 201 GOT RIGHT AND KEEPS: `brandUnhealable` and the
  // [Sin]/[Mark of Sin] pair, which it inferred from one sentence and which
  // canon's full text confirms word for word. The inference survives; only the
  // rungs are new.
  castigate: {
    name: 'Castigate', _srcName: 'Sin', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'transcendent',
    canonStone: 'The Magus', canonStoneRarity: 'common',
    cost: { type: 'mana', amount: 14 }, cooldown: 0,
    holy: true, debuff: { key: 'sin' }, brandUnhealable: true,
    incantation: 'Carry the mark of your transgressions.',
    rankConditions: {
      iron: ['sin', 'markOfSin'],
      bronze: ['weightOfSin', 'marshalOfJudgement'],
      silver: ['mortality'],
      gold: [],
    },
    rankEffects: {
      iron: 'Burns a painful brand into the target, inflicting slight '
        + 'transcendent damage and the [Sin] and [Mark of Sin] conditions. The '
        + 'brand cannot be healed so long as the target retains any instances of '
        + '[Sin].',
      bronze: 'Inflicts or refreshes [Weight of Sin], and you gain '
        + '[Marshal of Judgement].',
      silver: 'Inflicts [Mortality].',
      gold: '[Mark of Sin] imparts resistance to cleanse effects.',
    },
    desc: 'A brand that will not close while the sin behind it remains.',
    wantCost: 'Moderate mana.', wantCooldown: 'None.', wantTags: ['curse', 'holy'],
  },
  // ===== ROUND 221 -- [BLADE OF DOOM], AND WHY IT IS HERE ================
  //
  // The user supplied this one whole, with all six of its conditions, and
  // said what he was doing with it: "Keep in mind this is on the complex
  // side, as well as it part of an affliction skirmisher build. After
  // reviewing this ability does 'You can conjure a regular staff which you
  // probably already have' is very clearly not in any way an equivalent."
  //
  // So it is a transcription AND a yardstick. It is the densest thing in this
  // table by a distance -- one conjuration that by gold applies six named
  // conditions across three cleanse channels, two opposed alignments and a
  // mutual affliction that cannot be cleansed while the person who dealt it
  // lives -- and the point of keeping it is that the next time a rank-up
  // rung is written, this is the thing on the other side of the scale.
  //
  // THE SECOND FORM is the shape this game had no word for. Canon's silver
  // rung does not improve the blade, it gives the blade an ALTERNATE: Ruin is
  // unholy and inflicts Vulnerable, Penitent is holy and inflicts Price in
  // Blood, and the wielder chooses. `forms` is that word. It is declared
  // rather than generated -- this file describes shapes a spec may claim, and
  // nothing here generates an ability.
  bladeOfDoom: {
    name: 'Blade of Doom', _srcName: 'Doom', category: 'attack',
    kind: 'active', template: 'summonWeapon', element: 'necrotic',
    cost: { type: 'mana', amount: 12 }, cooldown: 0,
    unholy: true, conjures: 'Ruin, the Blade of Tribulation',
    debuff: { key: 'vulnerable' },
    refreshesWounds: true, refreshedWoundsCostMore: true,
    forms: [
      { name: 'Ruin, the Blade of Tribulation', rank: 'iron',
        alignment: 'unholy', debuff: { key: 'vulnerable' } },
      { name: 'Penitent, the Blade of Sacrifice', rank: 'silver',
        alignment: 'holy', debuff: { key: 'priceInBlood' } },
    ],
    rankConditions: {
      iron: ['vulnerable'],
      bronze: ['ruinationBlood', 'ruinationFlesh', 'ruinationSpirit'],
      silver: ['priceInBlood'],
      gold: ['legacyOfSin'],
    },
    desc: 'Conjures a blade that leaves what it cuts easier to cut again.',
    wantCost: 'Moderate mana.', wantCooldown: 'None.',
    wantTags: ['conjuration', 'unholy'],
  },
  // ===== ROUND 224 -- [HAEMORRHAGE] ======================================
  //
  // Sent in the same message as the rule that a vehicle is immune to blood,
  // poison and curses because it is not alive -- and its silver rung is the
  // answer to that rule: [Blood From a Stone] negates immunity to blood and
  // poison "INCLUDING INTRINSIC IMMUNITIES, SUCH AS FROM NOT HAVING A BIOLOGY
  // OR CORPOREAL FORM." The user handed over a wall and its door in one
  // breath, which is why they are one round.
  //
  // Four rungs, five conditions, and only four of them are new: [Bleeding]
  // has been in debuffs.js since round 57, tagged exactly as canon tags it
  // and already carrying round 105's `woundAbsorb` for the "absorbs and
  // negates an amount of incoming healing" clause. The book and this game
  // already agreed about it.
  haemorrhage: {
    name: 'Hemorrhage', _srcName: 'Blood', category: 'attack',
    // ROUND 278 -- laid on the selected target, not thrown: "It doesn't need
    // a bolt ... now that we have the ability to cycle through targets." Its
    // conditions come from its rungs (canonMixin `_applyCanonRungs`), so the
    // old `debuff: bleed` is gone -- it would have been a second, chance-rolled
    // bleed on top of the book's.
    kind: 'active', template: 'targetAffliction', element: 'necrotic', range: 320,
    // ROUND 278 -- "Cost: Moderate mana." (the user's text); 10 read as low.
    cost: { type: 'mana', amount: 14 }, cooldown: 0,
    unholy: true,
    incantation: 'Bleed for me.',
    rankConditions: {
      iron: ['bleed', 'sacrificialVictim'],
      bronze: ['necrotoxin'],
      silver: ['bloodFromStone'],
      gold: ['exsanguination'],
    },
    // ROUND 277 -- the rungs, printed. Round 228 built `rankEffects` so a
    // canon card prints the book's ladder instead of a generated one, and gave
    // it to the seventeen it transcribed -- but not to this one, which was
    // older. Sampled at bronze its card read "It costs a quarter less to put
    // up", a generator's rung on the book's spell. These are its own
    // conditions, one sentence a rung, in Leech Bite's wording.
    rankEffects: {
      iron: 'Inflicts or refreshes [Bleeding] and inflicts [Sacrificial Victim].',
      bronze: 'Inflicts an instance of [Necrotoxin].',
      silver: 'Inflicts [Blood From a Stone].',
      gold: 'Inflicts [Exsanguination].',
    },
    desc: 'Opens what it touches and keeps it open.',
    wantCost: 'Moderate mana.', wantCooldown: 'None.',
    wantTags: ['curse', 'unholy'],
  },

  // =========================================================================
  // ROUND 228 -- JASON ASANO'S DARK, ALL FOUR OF IT.
  //
  // The user supplied seventeen abilities in one message -- the whole of one
  // character's kit across Dark, Blood, Sin and Doom. It is three rounds
  // rather than one, and the boundary is the CONDITIONS rather than the
  // message: the Blood eight all hang off [Bleeding] and the drain channel,
  // the Sin and Doom thirteen all route through [Penance] and [Sin], and
  // splitting either of those groups would half-build something. These four
  // are the closed set -- three conditions, and the third is the door for the
  // other two.
  //
  // WHAT THESE FOUR NEEDED THAT THE TABLE DID NOT HAVE, and all three are
  // things a transcription wants rather than things these abilities want:
  //
  //   rankEffects   the book's own four rungs, printed. `rankConditions` has
  //                 been on [Blade of Doom] since round 221 and read by
  //                 nothing but a suite, so the densest ability in the game
  //                 printed a generic summon-weapon ladder. See abilityCard.js.
  //   COST_VARIES   "Base cost: Varies." The cooldown line has answered this
  //                 since round 201; the cost line never could.
  //   modes         one ability with two prices, both live at once.
  //
  // AND THREE OF THESE FOUR NAMES ARE ALREADY IN THE GAME, which is worth
  // saying plainly. HAND_AUTHORED_SIGNATURES.shadow has carried [Midnight
  // Eyes], [Cloak of Night] and [Path of Shadows] since round 16, authored
  // from the TTRPG skills sheet as one-line specs: a perception, a crit
  // buff and a teleport. Those rows are NOT touched. They are what a Dark
  // essence rolls, they have a hundred and eighty rounds of balance on them,
  // and the report delivered the round before this one measured that two of
  // the three actually reach a kit. This table is what the BOOK says, which
  // is a different claim from what the generator may produce, and round 201
  // built it as a separate module for exactly that reason. Where the two
  // disagree the disagreement is now legible instead of being a silent
  // paraphrase -- and the four rungs below are the yardstick the authored row
  // gets measured against when the essence pass reaches Dark.
  // =========================================================================

  // No awakening stone: awakened with the essence, so this is what Dark gives
  // you for nothing. A passive with no cost and no cooldown, and four rungs
  // that are four different senses rather than one sense getting sharper.
  //
  // IT IS NOT GIVEN A `sense`, and that is a deliberate refusal. perception.js
  // is GENERATED from data/sparkstone_perception.csv and its generator is no
  // longer in tools/, so a fifth rank row hand-typed into it is the
  // hand-maintained-list-beside-a-generator fault this project keeps finding.
  // Three of these four rungs already have fields there -- `nightVision` is
  // the iron rung, `leySight` is "sense magic", `bondSense` is the aura half
  // -- and the gold rung has no field at all: nothing in the game diminishes
  // light sources, and `_updateDayNight` computes darkness from the clock
  // alone. Written down rather than half-built, which is round 227's rule, and
  // the honest order is the regenerator first.
  midnightEyes: {
    name: 'Midnight Eyes', _srcName: 'Dark', category: 'utility',
    kind: 'passive', template: 'perception', element: 'shadow',
    canonStone: null,
    desc: 'Darkness stopped hiding things from you some time ago.',
    // ROUND 279 -- BUILT, rung by rung, onto fields the game already reads
    // where it has them, and two new ones where it did not:
    //   iron   "See through darkness."      `darkSight` + full `nightVision`:
    //          the night sheet and the light mask thin to a veil.
    //   bronze "Sense magic."               `leySight`, the existing sense.
    //   silver "Enhanced aura senses."      `auraSenseBonus`: the rank's
    //          aura-sense reach (minimap pips, portals) half again as far.
    //   gold   "Diminish light sources within field of view."  `dimLights`:
    //          every light on screen burns at a fraction of its reach.
    // Cumulative: a gold Midnight Eyes does all four. Read by the perception
    // case in _recomputeDerivedStats; a passive, so it has a switch.
    rankSense: {
      iron: { darkSight: true, nightVision: 1 },
      bronze: { leySight: true },
      silver: { auraSenseBonus: 0.5 },
      gold: { dimLights: 0.6 },
    },
    rankEffects: {
      iron: 'See through darkness.',
      bronze: 'Sense magic.',
      silver: 'Enhanced aura senses.',
      gold: 'Diminish light sources within field of view.',
    },
    wantCost: 'None.',
  },

  // The Stars (epic), and the longest rung ladder of the four: a conjuration
  // that is armour, a lantern, a camouflage, a parachute, a glider, a wing and
  // finally a hole in the world. Cooldown: None at every rank, because it is
  // worn rather than cast.
  //
  // "CANNOT BE GIVEN OR TAKEN AWAY" is transcribed and not implemented, and it
  // is the interesting clause: every other conjuration in this game can be
  // dismissed, and an item that refuses to leave its owner is a property the
  // conjuration system has no field for. `bound: true` says so on the row so
  // the day it gets a reader there is something to read.
  cloakOfNight: {
    name: 'Cloak of Night', _srcName: 'Dark', category: 'utility',
    kind: 'active', template: 'summonArmor', element: 'shadow',
    canonStone: 'The Stars', canonStoneRarity: 'epic',
    cost: { type: 'mana', amount: 14 }, cooldown: 0,
    conjures: 'the Cloak of Night', bound: true,
    // Canon's heading is "Conjuration (darkness, light, DIMENSION)", and the
    // dimension is not decoration: at silver the cloak "passively manipulates
    // physical space" and allows "passage through spaces normally too small to
    // physically traverse", and at gold it becomes a void portal. `phaseShift`
    // is what `CANON_TAG_RULES.dimension` reads, so the tag is derived from the
    // property rather than asserted beside it.
    phaseShift: true,
    rankEffects: {
      iron: 'Conjures a magical cloak that can alter the wearer. Offers limited '
        + 'physical protection. Can generate light, or blend into shadows. Reduces '
        + "the wearer's weight for a low mana-per-second cost, slowing a fall and "
        + 'allowing water walking. Cannot be given or taken away, although its '
        + 'effects extend to others in very close proximity.',
      bronze: 'The cloak reflexively intercepts projectiles -- highly effective '
        + 'against rapid, weaker attacks and less so against a single powerful one. '
        + 'It allows gliding for a low mana-per-second cost, and the weight '
        + 'reduction is free unless it is carrying someone else.',
      silver: 'The cloak passively manipulates physical space, shifting the '
        + 'trajectory of incoming attacks, and can be managed actively for a '
        + 'directed effect or to pass through a space too small to physically '
        + 'traverse. It allows flight for a low ongoing mana cost, rising to a '
        + 'moderate one in direct sunlight.',
      gold: 'The cloak can act as a void portal for an extreme ongoing mana cost, '
        + 'harmlessly allowing attacks to pass through it and confusing living '
        + 'things that go into it.',
    },
    wantCost: 'Moderate mana.', wantCooldown: 'None.',
    wantTags: ['conjuration', 'dimension', 'shadow'],
  },

  // The Adventure stone, and the one that needed a new word. Canon's own head
  // lines: "Base cost: Varies. Cooldown: Varies."
  //
  // WHY IT VARIES IS THE MECHANIC, not a hedge. At bronze this is TWO
  // abilities sharing one name: a low-cost special ability with no cooldown,
  // and a very-high-cost conjuration on a ten-minute one -- and canon spells
  // out that the cheap one does not wait for the expensive one, "the iron-rank
  // effect can still be used while this ability is on cooldown." Nothing in
  // this game has ever had two cooldowns, so `modes` is declared here the way
  // `forms` was in round 221: the shape written down, asserted by a suite, and
  // not generated by anything.
  //
  // THE TWO TABLES ARE HIS AND ARE KEPT AS GIVEN. `capacity` is what may go
  // through and `range` is how far, and the range figures are in kilometres
  // AT A RANK AND LEVEL -- Bronze 0 is 40km and Bronze 9 is 400km, which is a
  // tenfold climb inside one rank and the steepest scaling of any figure in
  // this file. They are transcribed rather than converted to the game's tile
  // scale, for the reason `canonCooldownHours` keeps the book's hours beside
  // the played seconds: a figure converted on the way in can never be checked
  // against its source again.
  pathOfShadows: {
    name: 'Path of Shadows', _srcName: 'Dark', category: 'utility',
    kind: 'active', template: 'teleport', element: 'shadow',
    canonStone: 'Adventure',
    cost: COST_VARIES, cooldown: COOLDOWN_VARIES,
    variesCooldown: 'durationOfGrant', cooldownFloor: 0,
    // "Alternatively, CONJURE A SHADOW GATE between two locations on a regional
    // scale." Declared because the book's heading is "Special
    // Ability/Conjuration" and the template is `teleport`, so without this the
    // card's tag line would have said dimension and stopped -- half the heading.
    conjures: 'a shadow gate',
    modes: [
      { name: 'the step', rank: 'iron', kind: 'special ability',
        cost: { type: 'mana', amount: 6 }, cooldown: 0, needsLineOfSight: true },
      { name: 'the near gate', rank: 'bronze', kind: 'conjuration',
        cost: { type: 'mana', amount: 40 }, cooldown: 600, usableWhileOtherCools: true },
      { name: 'the long gate', rank: 'silver', kind: 'conjuration',
        cost: { type: 'mana', amount: 40 }, cooldown: 3600, alsoIncurs: 'the near gate' },
    ],
    capacity: 'One bronze-rank living entity; or ten iron-rank in place of one '
      + 'bronze, and ten normal-rank in place of one iron. Reduced by non-living '
      + 'material carried through, including in dimensional bags -- but not by '
      + 'items held in storage generated by your own powers.',
    canonRangeKm: { bronze0: 40, bronze9: 400, silver0: 800, silver4: 2400 },
    rankEffects: {
      iron: 'Teleport using shadows as a portal. You must be able to see the '
        + 'destination shadow. Low mana, no cooldown.',
      bronze: 'You sense nearby shadows and can step to them without line of '
        + 'sight, and for a moderate cost you can enlarge a small shadow into a '
        + 'viable portal at either end. Alternatively, conjure a shadow gate '
        + 'between two places on a regional scale, the far end somewhere you have '
        + 'already been -- a conjuration at very high mana on a ten-minute '
        + 'cooldown. The step above still works while that gate is cooling.',
      silver: 'The long gate reaches twice as far as the near one, on a one-hour '
        + 'cooldown, and using it also puts the near gate on its own.',
      gold: 'Portals across global distances.',
    },
    desc: 'Steps into one shadow and out of another.',
    wantCost: 'Varies.', wantCooldown: 'Varies.',
    wantTags: ['conjuration', 'dimension'],
  },

  // The Reaper stone, and the one this round's three conditions belong to. A
  // conjuration paid per second rather than per cast -- the same shape as
  // [Eternal Moment], which is why `drain` already exists -- whose whole
  // purpose is to be a delivery system for afflictions: every special attack
  // made with the arm carries one, and by silver it carries the door that lets
  // the other two land on things with no flesh to rot.
  //
  // THE ARM COUNT IS A LADDER OF ITS OWN and is the reason `armsByRank` sits
  // beside `rankConditions` rather than inside the prose: one arm at iron, two
  // at bronze, and from silver any number conjured out of nearby shadows --
  // but only the ones CONNECTED to the conjurer can bestow afflictions or make
  // special attacks, and a disconnected arm is one rank below its owner. Two
  // may be connected at silver, six at gold. That is a cap, a proxy rule and a
  // rank penalty in one rung, and flattening it into a sentence would lose the
  // two numbers a reader needs.
  handOfTheReaper: {
    name: 'Hand of the Reaper', _srcName: 'Dark', category: 'attack',
    // ROUND 284 -- an ARM, not a weapon: "a highly flexible, semi-substantial
    // shadow-arm" that special attacks are made with. `summonWeapon` had the
    // conjure door hand the player a scythe (/reap/ in its name).
    kind: 'active', template: 'canonConjuration', element: 'necrotic',
    canonStone: 'Reaper',
    // "Cost: Low mana-per-second." (6 read as moderate; 3 is low.) Paid by the
    // canon toggle's clock; `cost` is the price of unfolding it.
    cost: { type: 'mana', amount: 3 }, drain: [{ type: 'mana', perSec: 3 }], cooldown: 0,
    unholy: true, conjures: 'the hand of the reaper',
    debuff: { key: 'creepingDeath' },
    armsByRank: { iron: 1, bronze: 2, silver: 2, gold: 6 },
    disconnectedArmRankPenalty: 1,
    rankConditions: {
      iron: ['creepingDeath'],
      bronze: ['rigorMortis'],
      silver: ['weaknessOfTheFlesh'],
      gold: [],
    },
    rankEffects: {
      iron: 'Conjure a highly flexible, semi-substantial shadow arm that can '
        + 'extend or shrink, and conjure your other items into its hand. Special '
        + 'attacks made with it inflict [Creeping Death] on top of their other '
        + 'effects.',
      bronze: 'A second arm. Special attacks made with the arms also inflict '
        + '[Rigor Mortis].',
      silver: 'Special attacks made with the arms also inflict [Weakness of the '
        + 'Flesh]. Further arms can be conjured from nearby shadows, but only arms '
        + 'connected to you can bestow afflictions or make special attacks, and a '
        + 'disconnected arm is one rank below you. Two may be connected at once.',
      gold: 'More arms, further away, and they can hold your conjured weapons. Up '
        + 'to six may be connected at once.',
    },
    desc: 'A hand of shadow, and everything it touches begins to fail.',
    wantCost: 'Low mana, per second.', wantCooldown: 'None.',
    wantTags: ['conjuration', 'unholy'],
  },

  // =========================================================================
  // ROUND 229 -- JASON ASANO'S BLOOD.
  //
  // The second of the three rounds the user's seventeen-ability message became,
  // and the group that had to stay together: all eight of its conditions hang
  // off [Bleeding] and the drain channel, and five of the eight are BOONS
  // granted by one ability's rank ladder. Splitting [Blood Harvest] from its
  // four boons would have left a rank rung naming things that did not exist.
  //
  // TWO THINGS THE TABLE COULD NOT SAY, and both are transcription problems
  // rather than ability problems:
  //
  //   incantations  canon gives [Blood Harvest] THREE, one per rank, each a
  //                 slightly longer sentence than the last. `incantation`
  //                 (round 224, singular) could hold one of the three.
  //   costs         "Extreme mana, extreme stamina, extreme health." `drain`
  //                 has been an array since round 201; the entry price never
  //                 was, so the most expensive ability in the books would have
  //                 printed one third of its cost.
  //
  // AND ONE THING DELIBERATELY NOT BUILT. [Sanguine Horror]'s familiar shares
  // BIOMASS with its summoner -- "while subsumed within the summoner, the
  // summoner has accelerated healing and stamina recovery ... determined by how
  // much biomass was absorbed and increases with the summoner's level of
  // injury" -- and by silver that figure also scales a conjured robe's three
  // separate effects. That is a resource the game does not have, threaded
  // through a familiar, an item and two recovery channels. It is written down
  // here rather than half-built, which is round 227's rule, and the familiar's
  // BITES -- which are the part that touches this round's conditions -- are
  // transcribed in full.
  // =========================================================================

  // No awakening stone: awakened with the essence. A spell whose whole job is
  // to turn a finished fight into the next one's advantage, and the ability
  // this round's four boons belong to.
  //
  // THE THRESHOLD IS THE MECHANIC, at silver and again at gold: stacks of one
  // boon up to a ceiling, and PAST the ceiling a different boon instead. So
  // [Blood Frenzy] and [Strength of My Enemies] are written in debuffs.js as
  // one shape with different attributes in it, and [Blood of the Immortal] and
  // [Endless Power] as one shape with different alarms -- because that is what
  // canon's own symmetry is, and two pairs of unrelated rows would have hidden
  // it.
  bloodHarvest: {
    name: 'Blood Harvest', _srcName: 'Blood', category: 'utility',
    kind: 'active', template: 'drain', element: 'necrotic',
    canonStone: null,
    cost: { type: 'mana', amount: 8 }, cooldown: 0,
    unholy: true, boon: true, requiresCorpse: true,
    // Three, one per rank, and the difference between them is a single word
    // each time -- "your life was mine" to "your lives were mine" to "so your
    // deaths are mine". Kept verbatim because a paraphrase of an incantation is
    // not an incantation, and the progression is the point: the same sentence
    // learning to address a crowd.
    incantations: {
      iron: 'As your life was mine to reap, your death is mine to harvest.',
      bronze: 'As your lives were mine to reap, your deaths are mine to harvest.',
      silver: 'As your lives were mine to reap, so your deaths are mine to harvest.',
    },
    incantation: 'As your life was mine to reap, your death is mine to harvest.',
    rankConditions: {
      iron: [],
      bronze: [],
      silver: ['bloodFrenzy', 'bloodOfTheImmortal'],
      gold: ['strengthOfMyEnemies', 'endlessPower'],
    },
    rankEffects: {
      iron: 'Drain the remnant life force of a recently deceased body, '
        + 'replenishing health, stamina and mana. Only affects targets with blood.',
      bronze: 'Affects any number of bodies in a wide area.',
      silver: 'Gain an instance of [Blood Frenzy] for each corpse drained, up to '
        + 'a threshold set by your rank. Past the threshold, gain instances of '
        + '[Blood of the Immortal] instead.',
      gold: 'Gain [Strength of My Enemies] for each corpse drained instead, and '
        + 'past its threshold, [Endless Power].',
    },
    desc: 'What is left in the dead is still worth having.',
    wantCost: 'Low mana.', wantCooldown: 'None.',
    wantTags: ['boon', 'unholy'],
  },

  // The Feast (common), and the densest rung-per-word ability of the four: a
  // melee special attack that costs low stamina, has no cooldown, and by gold
  // carries four named conditions -- one of which ([Leech Toxin]) exists purely
  // to undo the answer to another ([Bleeding]).
  //
  // [BLEEDING] IS NOT ADDED, for the third time and the same reason round 224
  // gave: it has been `bleed` in debuffs.js since round 57, tagged exactly as
  // canon tags it, and carrying round 105's `woundAbsorb` for the "absorbs and
  // negates an amount of incoming healing, after which this affliction
  // immediately ends" clause. What is new is that round 105's clause turns out
  // to be the ONE site in the game where a bleed is negated rather than
  // expiring -- so [Leech Toxin]'s canon sentence had a home waiting for it.
  leechBite: {
    name: 'Leech Bite', _srcName: 'Blood', category: 'attack',
    kind: 'active', template: 'martialStrike', element: 'necrotic',
    canonStone: 'The Feast', canonStoneRarity: 'common',
    cost: { type: 'stamina', amount: 6 }, cooldown: 0,
    unholy: true, debuff: { key: 'bleed' }, refreshesWounds: true,
    rankConditions: {
      iron: ['bleed'],
      bronze: ['leechToxin'],
      silver: ['taintedMeridians'],
      gold: ['thiefOfLife'],
    },
    rankEffects: {
      iron: 'Inflicts or refreshes [Bleeding], and drains a small amount of '
        + 'health and stamina whenever it refreshes it.',
      bronze: 'Inflicts an instance of [Leech Toxin].',
      silver: 'Inflicts or refreshes [Tainted Meridians].',
      gold: 'Inflicts [Thief of Life].',
    },
    desc: 'A bite that takes something back with it.',
    wantCost: 'Low stamina.', wantCooldown: 'None.',
    wantTags: ['curse', 'unholy'],
  },

  // The Feast again, and the one whose silver rung is a MODE rather than an
  // improvement: "increasing the mana cost to very high and the cooldown to 2
  // minutes allows this spell to target all viable targets in a wide area." One
  // ability, two prices, chosen at cast -- which is the word round 228 built for
  // [Path of Shadows] and the second ability to need it.
  //
  // ITS IRON RUNG IS A TARGETING RESTRICTION, which is worth naming because it
  // is the thing that makes this kit a kit: the spell does nothing at all to
  // anything that is not already bleeding or wounded. [Leech Bite] is how you
  // qualify a target, and that dependency is the whole of an affliction
  // skirmisher's opening.
  feastOfBlood: {
    name: 'Feast of Blood', _srcName: 'Blood', category: 'utility',
    kind: 'active', template: 'drain', element: 'necrotic',
    canonStone: 'The Feast', canonStoneRarity: 'common',
    cost: { type: 'mana', amount: 14 }, cooldown: 30,
    unholy: true, requiresTargetCondition: ['bleed'],
    incantation: 'Your blood is not yours to keep, but mine on which to feast.',
    modes: [
      { name: 'the single feast', rank: 'iron', kind: 'spell',
        cost: { type: 'mana', amount: 14 }, cooldown: 30 },
      { name: 'the wide feast', rank: 'silver', kind: 'spell',
        cost: { type: 'mana', amount: 40 }, cooldown: 120, area: true },
    ],
    rankConditions: { iron: [], bronze: [], silver: [], gold: ['bloodGlutton'] },
    rankEffects: {
      iron: 'Drain health and stamina. Only affects targets with bleeding wounds '
        + 'or suffering from [Bleeding].',
      bronze: 'Drains additional health and stamina for each instance of poison '
        + 'on the target.',
      silver: 'Raising the cost to very high and the cooldown to two minutes lets '
        + 'it take every viable target in a wide area.',
      gold: 'Gain an instance of [Blood Glutton] for each victim.',
    },
    desc: 'An open wound is an invitation.',
    wantCost: 'Moderate mana.', wantCooldown: '30 seconds.',
    wantTags: ['unholy'],
  },

  // The Awakening Stone of the Apocalypse (legendary), and the most expensive
  // thing in this table by a distance: a ritual familiar paid for in three
  // pools at once, which is the reason `costs` exists.
  //
  // THE BITES ARE THE PART THAT IS REAL TODAY, and they are transcribed in
  // full: [Bleeding], [Leech Toxin] and [Necrotoxin], which is this round's new
  // condition, round 224's, and round 57's, arriving together on one familiar's
  // attack. That combination is not decoration -- the toxin reapplies the
  // bleeding a healer just closed while the necrotoxin runs until cleansed, so
  // the swarm's whole threat is that answering it takes two different cleanses
  // and a moment you do not have.
  //
  // THE BIOMASS IS NOT. See the block note above: it is a resource the game
  // does not have, and by silver it scales a conjured robe's three effects as
  // well as the summoner's own recovery. Declared as `pending` so the shape is
  // on the record and nothing reads a number that means nothing.
  sanguineHorror: {
    name: 'Sanguine Horror', _srcName: 'Blood', category: 'utility',
    kind: 'active', template: 'summonFamiliar', element: 'necrotic',
    canonStone: 'The Apocalypse', canonStoneRarity: 'legendary',
    costs: [
      { type: 'mana', amount: 64, band: 'Extreme' },
      { type: 'stamina', amount: 64, band: 'Extreme' },
      { type: 'health', amount: 64, band: 'Extreme' },
    ],
    cost: { type: 'mana', amount: 64 },
    cooldown: 0, ritual: true, unholy: true,
    conjures: 'a Sanguine Horror',
    incantation: 'Let this mortal blood beckon the all-devouring power of the '
      + 'final threshold. Answer the call and claim the offering. Heed my '
      + 'command and bring forth the avatar of life’s annihilation.',
    familiarBites: ['bleed', 'leechToxin', 'necrotoxin'],
    conjuredItems: [{ name: 'Sanguine Raiment', rank: 'silver', kind: 'armour' }],
    // Written down, not built. Every one of these scales off a quantity the
    // game has no representation for.
    pending: ['biomassShared', 'biomassScaledRecovery', 'biomassScaledRaiment',
      'massLimitExceededByDrain'],
    rankConditions: {
      iron: ['bleed', 'leechToxin', 'necrotoxin'],
      bronze: [], silver: [], gold: [],
    },
    rankEffects: {
      iron: 'Summon a [Sanguine Horror] to serve as a familiar. Bites from the '
        + 'leech swarm inflict [Bleeding], [Leech Toxin] and [Necrotoxin], and '
        + 'drain health and stamina to replace destroyed biomass. While subsumed '
        + 'within you, it accelerates your healing and stamina recovery in '
        + 'proportion to the biomass absorbed and to how badly you are hurt.',
      bronze: 'A bronze-rank vessel. Ranged entangling attacks with cloth strips '
        + 'that deal little on their own but periodically inflict [Leech Toxin] '
        + 'and [Necrotoxin] where they grip an open wound.',
      silver: 'A silver-rank vessel, and the [Sanguine Raiment] -- conjured robes '
        + 'with an apocalypse beast’s resilience, turning cuts and thrusts '
        + 'better than blows, deepening every heal-over-time and every drain in '
        + 'proportion to the biomass it shares with you, and able to grapple at '
        + 'range and drain what it holds.',
      gold: 'It can exceed its normal mass limits, for as long as it keeps '
        + 'draining life to pay for them.',
    },
    desc: 'Something that was never one creature, and answers to you.',
    wantCost: 'Extreme mana, extreme stamina and extreme health.',
    wantCooldown: 'None.',
    wantTags: ['conjuration', 'unholy'],
  },

  // =========================================================================
  // ROUND 230 -- JASON ASANO'S SIN, AND A CORRECTION.
  //
  // Round 229's note said the Sin and Doom halves "cannot be split without
  // half-building one of them." That is wrong in one direction and worth
  // correcting out loud rather than quietly doing something else. The thirteen
  // conditions cannot be divided ARBITRARILY -- but the dependency between the
  // halves runs ONE WAY: every Doom ability keys off [Penance] or [Sin], and
  // nothing in Sin needs a single Doom condition. A one-way dependency is
  // exactly what makes a split safe. So Sin ships complete here, [Penance]
  // included and carried, and Doom is built on top of it next round with its own
  // five -- among them [Harbinger of Doom], whose butterflies are a genuinely
  // new runtime in the round-227 sense and deserve the round rather than a
  // corner of this one.
  //
  // WHAT THIS HALF OF THE KIT IS, because it decides what the conditions are:
  // it is the half that CLEANSES. [Feast of Absolution] strips every curse,
  // disease, poison and unholy affliction from a target and circumvents every
  // effect that prevents cleansing; [Sin Eater] banks a boon each time you
  // resist or remove one. Three of this round's rows fire ON a cleanse, which is
  // a mechanic this game has never had -- so `_cleanseConditions` gets the hook
  // it turns out to have been collecting the answer for all along.
  //
  // AND THE INTERLOCK IS THE POINT. [Sin] makes necrotic damage worse; [Price of
  // Absolution] charges you for washing it off; [Weight of Sin] charges you for
  // being healed at all; [Mark of Sin] will not come off while any [Sin]
  // remains. Every answer to one of them is a payment to another, and the only
  // clean exit is doing it in the right order. That is what makes these five one
  // round.
  // =========================================================================

  // No awakening stone: awakened with the essence. The kit's opener, and the
  // only ability in this table whose effect BRANCHES on what the target is
  // already carrying -- which is why [Penance] and [Wages of Sin] are written as
  // one shape in two alignments.
  //
  // THE SILVER RUNG IS THE WHOLE DESIGN, and it is worth reading twice: if the
  // target has [Sin], it gains [Wages of Sin]; if it has no [Sin] but does have
  // [Penance], it takes TRANSCENDENT damage instead of necrotic, gains another
  // [Penance], and its [Penance] stops dropping off for a moment. So the ability
  // rewards you for knowing which of your own afflictions is on them -- and the
  // second branch turns off the very decay `dropsOffAsDealt` exists for, which
  // is the one thing in this round that a generated ability could never have
  // thought of.
  punish: {
    name: 'Punish', _srcName: 'Sin', category: 'attack',
    kind: 'active', template: 'martialStrike', element: 'necrotic',
    canonStone: null,
    cost: { type: 'mana', amount: 6 }, cooldown: 0,
    unholy: true, debuff: { key: 'sin' },
    rankConditions: {
      iron: ['sin'],
      bronze: ['priceOfAbsolution'],
      silver: ['wagesOfSin', 'penance'],
      gold: ['thiefOfSpirit'],
    },
    rankEffects: {
      iron: 'Inflicts necrotic damage and the [Sin] affliction.',
      bronze: 'Inflicts or refreshes [Price of Absolution].',
      silver: 'A target carrying [Sin] also suffers [Wages of Sin]. A target with '
        + 'no [Sin] but some [Penance] suffers neither, and instead takes '
        + 'transcendent damage in place of necrotic, gains another instance of '
        + '[Penance], and holds its [Penance] for a short while without it '
        + 'dropping off.',
      gold: 'Inflicts [Thief of Spirit].',
    },
    desc: 'A blow that keeps a ledger.',
    wantCost: 'Low mana.', wantCooldown: 'None.',
    wantTags: ['curse', 'unholy'],
  },

  // The Feast (common), and the strangest targeting rule in the table: "This
  // ability CANNOT BE USED ON SELF." Round 201 built `scope: 'allyNotSelf'` for
  // [Blessing of Readiness] and noted it was "a targeting exclusion ('an ally
  // and not yourself') that had no word"; this is the second ability to need it,
  // and the first where the exclusion is the character rather than a quirk --
  // the sin eater absolves everyone but himself.
  //
  // IT CIRCUMVENTS EVERY CLEANSE LOCK, which is a thing this game now has four
  // of ([Mark of Sin]'s pair, the shared lock, the tag lock, and this round's
  // absolute one). `ignoresCleanseLocks` is declared rather than built, because
  // the exemplars are transcriptions and nothing generates them -- but it is the
  // one field in this round that names a mechanic the runtime would have to be
  // taught, so it is said plainly rather than implied.
  feastOfAbsolution: {
    name: 'Feast of Absolution', _srcName: 'Sin', category: 'utility',
    kind: 'active', template: 'cleanse', scope: 'allyNotSelf',
    canonStone: 'The Feast', canonStoneRarity: 'common',
    cost: { type: 'mana', amount: 8 }, cooldown: 0,
    holy: true, element: 'radiant',
    cleanseTag: null, cleanseCount: 99, ignoresCleanseLocks: true,
    incantation: 'Feed me your sins.',
    rankConditions: {
      iron: [], bronze: ['penance', 'legacyOfSin'], silver: [],
      gold: ['resistant', 'integrity'],
    },
    rankEffects: {
      iron: 'Cleanse all curses, diseases, poisons and unholy afflictions from a '
        + 'single target, and all holy afflictions too if the target is an ally. '
        + 'Recover stamina and mana for each affliction cleansed. It circumvents '
        + 'every effect that prevents cleansing, and it cannot be used on '
        + 'yourself.',
      bronze: 'An enemy suffers an instance each of [Penance] and [Legacy of Sin] '
        + 'for every condition cleansed from it.',
      silver: 'Raising the cost to moderate takes every afflicted enemy and ally '
        + 'in a wide area.',
      gold: 'Affected allies gain an instance of [Resistant] and an instance of '
        + '[Integrity] for each condition cleansed from them.',
    },
    desc: 'He will take anything off anyone but himself.',
    wantCost: 'Low mana.', wantCooldown: 'None.',
    wantTags: ['holy', 'radiant'],
  },

  // The Feast again, and the one that pays for the rest of the kit: a passive
  // with no cost and no cooldown whose whole job is to turn every affliction you
  // SURVIVE into a resource. Every other ability in this table spends something;
  // this one is where the spending comes from.
  //
  // ITS SILVER RUNG IS A CEILING BREAK and there is nothing else like it here:
  // "health, mana and stamina gained through your own essence abilities of the
  // drain and recovery type can EXCEED the normal maximum." Round 229's
  // `_spendBoon` and every restore in the game clamp to the pool maximum, so
  // this is a real mechanic the game does not have. Declared as pending rather
  // than half-built.
  sinEater: {
    name: 'Sin Eater', _srcName: 'Sin', category: 'utility',
    kind: 'passive', template: 'attrBoost', element: 'radiant',
    canonStone: 'The Feast', canonStoneRarity: 'common',
    holy: true, boon: true,
    resistAfflictions: true,
    pending: ['overhealAboveMaximum', 'auraConsumesAllyAfflictions'],
    rankConditions: {
      iron: ['resistant'], bronze: ['integrity'], silver: [], gold: [],
    },
    rankEffects: {
      iron: 'Increased resistance to afflictions, and an instance of [Resistant] '
        + 'each time you resist or cleanse one with an essence ability.',
      bronze: 'An instance of [Integrity] for each affliction you resist or remove '
        + 'with an essence ability.',
      silver: 'Health, mana and stamina gained through your own drain and recovery '
        + 'abilities can exceed the normal maximum, and the excess drains away '
        + 'until it does not.',
      gold: 'Curses, diseases, poisons and unholy afflictions on allies inside '
        + 'your aura are consumed over time, triggering everything above.',
    },
    desc: 'Everything that is done to him is kept.',
    wantCost: 'None.',
    wantTags: ['boon', 'holy'],
  },

  // The Omens stone (epic), and an AURA -- the first in this table. It is also
  // the only ability in the four that is tagged both holy and unholy, which
  // canon does deliberately: it hardens allies against afflictions and softens
  // enemies to them in one field, and the enemy half scales off [Sin].
  //
  // THE SILVER RUNG IS A DAMAGE DOWNGRADE, which is the only one in any of these
  // three rounds: transcendent damage dealt by enemies inside the aura becomes
  // resonating-force or disruptive-force instead. Transcendent is the type that
  // skips armour, resistance and ward alike (round 201), so an aura that turns it
  // back into something answerable is the exact counter to the thing this kit
  // itself does -- Jason's own aura is the answer to Jason's own damage type,
  // and that is worth having transcribed next to [Castigate].
  hegemony: {
    name: 'Hegemony', _srcName: 'Sin', category: 'utility',
    kind: 'passive', template: 'aura', element: 'radiant',
    canonStone: 'Omens', canonStoneRarity: 'epic',
    holy: true, unholy: true,
    debuff: { key: 'sin' },
    downgradesTranscendent: ['resonating', 'disruptive'],
    rankConditions: { iron: [], bronze: ['sin'], silver: [], gold: [] },
    rankEffects: {
      iron: 'Allies in the aura resist afflictions better and enemies in it resist '
        + 'them worse, and an enemy’s resistance falls further for each '
        + 'instance of [Sin] it carries.',
      bronze: 'An enemy that attacks an ally inside the aura suffers an instance '
        + 'of [Sin], and that instance cannot be resisted.',
      silver: 'The aura reaches further before its strength is compromised, and '
        + 'transcendent damage dealt by enemies inside it is downgraded to '
        + 'resonating-force or disruptive-force, depending on its source.',
      gold: 'Aura strength no longer has to be split to suppress several auras at '
        + 'once.',
    },
    desc: 'Inside it, what you have done to people is held against you.',
    wantCost: 'None.',
    wantTags: ['holy', 'unholy'],
  },

  // =========================================================================
  // ROUND 231 -- DOOM, AND WHAT A PILE OF AFFLICTIONS IS WORTH.
  //
  // Doom is a CONFLUENCE in this game, not an essence -- round 227 learned that
  // the hard way when a [Fracturing] rider was keyed on a "Doom stone" that does
  // not exist -- and the trio that makes it is `essBlood,essSin,shadow`:
  // Blood + Dark + Sin, which is exactly the three essences rounds 228, 229 and
  // 230 transcribed. So these three abilities are the top of a ladder this file
  // has been building for four rounds, and they are attributed to Doom because
  // the books attribute them to Doom.
  //
  // WHAT MAKES THEM DIFFERENT FROM EVERYTHING ABOVE: none of the three cares
  // what the afflictions ARE. [Inexorable Doom] deepens every stacking one on a
  // clock, [Punition] deals damage per affliction, [Verdict] executes harder for
  // each [Penance]. This is the first thing in the game paid BY THE COUNT, which
  // is what an affliction skirmisher's whole kit has been building toward since
  // round 221 measured [Blade of Doom] as the yardstick.
  //
  // [AVATAR OF DOOM] IS NOT HERE, and that is a decision. Its [Harbinger of
  // Doom] drains mana to conjure butterflies that seek enemies, carry one
  // instance of every non-holy affliction on the thing they manifested from, and
  // burst for disruptive-force when destroyed -- a spawning affliction with an
  // affliction-copying payload, which is a genuinely new runtime in exactly the
  // sense round 227 meant when it gave [Fracturing] its own round. It gets the
  // same, alongside the familiar's orbs, beams, dashes, aura-subsumption and
  // shielding, which are a subsystem besides. Written down rather than
  // half-built.
  //
  // AND THERE IS AN AUTHORED [PUNITION] ALREADY. HAND_AUTHORED_SIGNATURES.shadow
  // has carried it as a `ranged_aoe` since round 16, from the TTRPG sheet, and
  // the report delivered before round 228 measured it as one of Dark's
  // best-reaching rows -- 43 distinct variants. It is NOT touched, for the
  // reason round 228 gave about the three Dark names it shares: this table is
  // what the BOOK says and the authored row is what a kit ROLLS, and round 201
  // built these as separate modules precisely so the two claims could differ
  // without one quietly becoming a paraphrase of the other.
  // =========================================================================

  // No stone named in the user's text, and that absence is transcribed rather
  // than guessed -- `canonStone: undefined` would read as "not yet filled in",
  // and `null` is what [Midnight Eyes] and [Blood Harvest] use to mean "awakened
  // with the essence". Neither is honest here, so it says what it is.
  //
  // ITS IRON EFFECT IS AN ONGOING CURSE WITH A CLEANSE RULE OF ITS OWN, which is
  // a condition in this project's vocabulary even though canon does not put it
  // in brackets -- so it is authored as one, named after the ability, exactly as
  // round 201 authored [Legacy of Sin] from a single unbracketed mention. That
  // inference survived the user's later correction, which is the argument for
  // making it.
  inexorableDoom: {
    name: 'Inexorable Doom', _srcName: 'Doom', category: 'attack',
    kind: 'active', template: 'debuff', element: 'necrotic',
    canonStone: 'unnamed in the source',
    cost: { type: 'mana', amount: 14 }, cooldown: 0,
    unholy: true, debuff: { key: 'inexorableDoom' },
    incantation: 'Your fate is to suffer.',
    rankConditions: {
      iron: ['inexorableDoom'],
      bronze: ['inescapable'],
      silver: ['persecution'],
      gold: [],
    },
    rankEffects: {
      iron: 'Periodically applies an additional instance of each stacking curse, '
        + 'disease, poison or unholy affliction the target is already suffering. '
        + 'This is itself a curse -- [Inexorable Doom] -- and it cannot be '
        + 'cleansed while any other curse, disease, poison or unholy affliction '
        + 'is in effect.',
      bronze: 'Inflicts or refreshes [Inescapable].',
      silver: 'Inflicts an instance of [Persecution].',
      gold: 'The rate at which it deepens them is significantly accelerated.',
    },
    desc: 'It does not add anything. It makes what is already there worse.',
    wantCost: 'Moderate mana.', wantCooldown: 'None.',
    wantTags: ['curse', 'unholy'],
  },

  // The Wrath stone (uncommon), and the one whose silver rung is a PRICE LADDER
  // rather than a mode pair: three costs buying three cooldowns, which is the
  // first ability in this table where spending more makes the ability FASTER as
  // well as stronger. `modes` (round 228) holds all four rungs of it.
  //
  // "CONSECUTIVE, EXTREME-COST INCANTATIONS HAVE TRUNCATED INCANTATIONS" is the
  // detail worth transcribing, and it is why `incantations` from round 229 is
  // not enough on its own: the two the user gave are the same spell at two
  // lengths -- "Suffer the cost of your transgressions." and then just
  // "Suffer." -- so the second is not a rank variant but what the first becomes
  // when it is cast again at full price. `truncatedIncantation` is that.
  //
  // AND ITS GOLD RUNG REFUSES THE LADDER IT BUILT: the area variant's cooldown
  // "cannot be reduced through mana expenditure." A rung that takes back the
  // previous rung's lever is a shape nothing in this game generates, and it is
  // exactly the kind of thing a transcription is for.
  punition: {
    name: 'Punition', _srcName: 'Doom', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'necrotic',
    canonStone: 'Wrath', canonStoneRarity: 'uncommon',
    cost: { type: 'mana', amount: 14 }, cooldown: 30,
    unholy: true, perAfflictionDamage: true,
    incantation: 'Suffer the cost of your transgressions.',
    truncatedIncantation: 'Suffer.',
    modes: [
      { name: 'moderate', rank: 'iron', cost: { type: 'mana', amount: 14 }, cooldown: 30 },
      { name: 'high', rank: 'silver', cost: { type: 'mana', amount: 24 }, cooldown: 20 },
      { name: 'very high', rank: 'silver', cost: { type: 'mana', amount: 40 }, cooldown: 10 },
      { name: 'extreme', rank: 'silver', cost: { type: 'mana', amount: 64 }, cooldown: 0,
        truncates: true },
    ],
    rankConditions: { iron: [], bronze: ['penitence'], silver: [], gold: [] },
    rankEffects: {
      iron: 'Inflicts necrotic damage for each curse, disease, poison and unholy '
        + 'affliction the target is suffering.',
      bronze: 'Inflicts or refreshes [Penitence].',
      silver: 'The damage per affliction rises with the price -- high, very high '
        + 'or extreme mana -- and the cooldown falls to twenty seconds, ten, or '
        + 'none. Cast at the extreme price twice in a row and the incantation '
        + 'shortens to a word.',
      gold: 'An area variant, at a higher cost and a longer cooldown -- and that '
        + 'cooldown cannot be bought down with mana.',
    },
    desc: 'It charges by the count, and it does not care what they are.',
    wantCost: 'Moderate mana.', wantCooldown: '30 seconds.',
    // NO `wantTags`, and that is transcription rather than omission: the user's
    // text heads this one "Spell." with no parenthetical at all, where every
    // other ability in these four rounds carries one -- "Spell (curse)",
    // "Special attack (melee, curse)", "Aura (holy, unholy)". So there is
    // nothing to assert. The first cut wrote `['curse', 'unholy']` from the
    // ability's obvious character and the check caught it: `curse` is derived
    // from a spec's `debuff` field and [Punition] has none -- it deals damage BY
    // the count of afflictions rather than applying one -- so the suite was
    // being asked to prove a tag the book never printed and the ability does not
    // earn. Asserting an invented tag is how a transcription becomes a
    // paraphrase.
  },

  // The Judgement stone (rare), and the only EXECUTE in this table besides
  // [Deny the Reaper] -- which round 201 transcribed as a counter-execute, a
  // reaction. This one is a spell you choose, and it is where the whole kit's
  // arithmetic is collected: transcendent damage that ignores armour, resistance
  // and ward alike, scaling exponentially with injury, raised further by every
  // [Penance] on the target, and delivering [Sanction] -- which then scales off
  // the same curve in the other direction, shutting healing down the closer the
  // target is to the end.
  //
  // THAT IS THE PART WORTH SAYING PLAINLY: [Sanction] and the execute read THE
  // SAME CURVE, because canon says so -- "scaling is affected by [Legacy of Sin]
  // in the same way execute damage is." So [Verdict] does not merely finish a
  // hurt target, it makes a hurt target harder to save, on the identical
  // exponent. One sentence in the book, one shared reader in the game.
  verdict: {
    name: 'Verdict', _srcName: 'Doom', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'transcendent',
    canonStone: 'Judgement', canonStoneRarity: 'rare',
    cost: { type: 'mana', amount: 14 }, cooldown: 30,
    holy: true, execute: true, scalesWithPenance: true,
    incantation: 'Mine is the Judgement, and the Judgement is death.',
    modes: [
      { name: 'the sentence', rank: 'iron', cost: { type: 'mana', amount: 14 }, cooldown: 30 },
      { name: 'the standing sentence', rank: 'gold', cost: { type: 'mana', amount: 24 },
        cooldown: 30, area: true, ongoing: true },
    ],
    rankConditions: { iron: [], bronze: [], silver: ['sanction'], gold: [] },
    rankEffects: {
      iron: 'Deals a small amount of transcendent damage. As an execute effect, '
        + 'the damage scales exponentially with how badly the enemy is hurt.',
      bronze: 'The base damage rises for each instance of [Penance] on the target.',
      silver: 'Inflicts or refreshes [Sanction].',
      gold: 'It can be cast as a wide-area ongoing effect instead, with less '
        + 'damage at the moment of casting.',
    },
    desc: 'The last thing said about someone.',
    wantCost: 'Moderate mana.', wantCooldown: '30 seconds.',
    wantTags: ['holy'],
  },

  // =========================================================================
  // ROUND 232 -- [AVATAR OF DOOM], AND THE THING TWO ROUNDS WROTE DOWN.
  //
  // The seventeenth and last of the user's Jason Asano abilities, and the only
  // one that needed a round to itself. Rounds 230 and 231 each looked at its
  // [Harbinger of Doom] and deferred it in the same words, because it is four
  // mechanics in one condition: an affliction that spends the victim's own
  // resource, spawns entities, copies an arbitrary set of afflictions onto
  // whatever those entities touch, and bursts when they die. Round 227 spent a
  // whole round on [Fracturing], which does one of those four.
  //
  // AND IT TURNED OUT TO NEED ALMOST NOTHING NEW, which is the good kind of
  // surprise and the argument for deferring rather than bodging. The game has
  // had homing projectiles with a carried condition, an explosion radius and a
  // typed element since round 44, and `_nearestMonsterWithin` has taken a
  // `from` origin and a `skip` since round 201 -- which is exactly "seeks out
  // nearby enemies" and "not the one it came out of". A butterfly is a
  // projectile with two extra fields. See debuffs.js for the condition and
  // WorldScene's `_manifestButterflies` for the manifestation.
  //
  // WHAT IS DECLARED AND NOT BUILT, and why each one: this is a FAMILIAR with a
  // subsystem of its own -- orbs that fire sustained beams of two different
  // force types, that dash, that can be spent on contact, that can be
  // manifested around the summoner, that can shield them, and a whole-body
  // subsumption into the summoner's aura that makes that aura harder to read.
  // Sustained beams, aura legibility and orb-granted shields are three separate
  // runtimes this game does not have, and the honest order is one at a time.
  // `familiar` holds the shape and `pending` names the gaps, so nothing here
  // reads a number that means nothing -- round 220's census rule.
  //
  // THE MATERIALS ARE THE FIRST IN THIS TABLE. 108 radiant and 108 void
  // quintessence gems and 1,296 iron-rank spirit coins, which is a RITUAL
  // rather than a cast -- and the figures are his, kept as given, because a
  // number converted on the way in can never be checked against its source
  // again. The same reason `canonCooldownHours` keeps the book's hours beside
  // the played seconds.
  // =========================================================================
  avatarOfDoom: {
    name: 'Avatar of Doom', _srcName: 'Doom', category: 'utility',
    kind: 'active', template: 'summonFamiliar', element: 'disruptive',
    canonStone: 'Avatar', canonStoneRarity: 'legendary',
    cost: { type: 'mana', amount: 64 }, cooldown: 0,
    ritual: true, unholy: true, conjures: 'an Avatar of Doom',
    incantation: 'When worlds end, you are the arbiter. When gods fall, you are '
      + 'the instrument. Herald of annihilation, come forth and be my harbinger. '
      + 'I have doom to bring.',
    materials: [
      { name: 'Radiant Quintessence Gem', count: 108, rank: 'iron' },
      { name: 'Void Quintessence Gem', count: 108, rank: 'iron' },
      { name: 'Spirit Coin', count: 1296, rank: 'iron' },
    ],
    familiar: {
      name: 'Gordon', incorporeal: true,
      orbsByRank: { iron: 2, bronze: 4, silver: 6, gold: 6 },
      // One orb per force type at bronze, and the restriction is LIFTED at
      // silver -- "orb restrictions are lifted, they're now able to perform any
      // of the familiar's abilities" -- so the pairing is a rung rather than a
      // property.
      beamElements: ['disruptive', 'resonating'],
      beamAffliction: 'vulnerable',
      dash: { element: 'disruptive', orbsIdle: true },
      subsumable: true,
      spendOrbFor: 'harbingerOfDoom',
    },
    pending: ['sustainedBeam', 'orbEntities', 'auraLegibility', 'orbShieldsSummoner',
      'butterflyAbsorbedToEnhance', 'butterflyAfflictionClouds'],
    rankConditions: {
      // ROUND 284 -- his text puts [Vulnerable] on the familiar from iron.
      iron: ['vulnerable'], bronze: [], silver: ['harbingerOfDoom'], gold: [],
    },
    rankEffects: {
      // ROUND 284 -- his text puts the orbs and [Vulnerable] on the iron familiar.
      iron: 'Summon an [Avatar of Doom] to serve as a familiar; enemies it damages gain [Vulnerable].',
      bronze: 'A bronze-rank vessel: incorporeal, slow on its feet but able to '
        + 'cross ground in rapid energy dashes that deal disruptive-force to '
        + 'anything in the path. Two orbs at iron, four at bronze, six at silver, '
        + 'each firing a sustained beam -- one disruptive-force, one '
        + 'resonating-force -- and anything the avatar damages gains [Vulnerable], '
        + 'accruing more the longer a beam holds. It can be subsumed into your '
        + 'aura, which makes your aura far harder to detect and read.',
      silver: 'An orb can be spent on contact to afflict an enemy with '
        + '[Harbinger of Doom]. Orbs can be manifested around you instead of '
        + 'around the avatar, they lose their restrictions and can perform any of '
        + 'its abilities, and they can shield you.',
      gold: 'Butterflies leave seeking affliction clouds where they are destroyed, '
        + 'and can be absorbed to strengthen the avatar’s other powers.',
    },
    desc: 'Something that ends things, standing next to you.',
    wantCost: 'Very high mana.', wantCooldown: 'None.',
    wantTags: ['conjuration', 'unholy'],
  },

  // =========================================================================
  // ROUND 233 -- HUMPHREY GELLER'S MIGHT, AND A DIFFERENT KIND OF ROUND.
  //
  // A second character's kit, sent in the same breath as Jason's and deliberately
  // held until his was finished. Fifteen abilities across Magic/Shield, Might,
  // Wing and Dragon, and the shape of the work is the OPPOSITE of the five rounds
  // just done.
  //
  // Jason's kit was condition-heavy: twenty-six new rows in five rounds, most
  // needing a field that did not exist. Humphrey's is condition-LIGHT and
  // mechanic-heavy -- his [Stunned] is already `stun`, his [Burning] is already
  // `burn`, and only two of his fifteen abilities name a condition this table
  // lacks. So these rounds are paced by RUNTIME rather than by interlock.
  //
  // AND THE FIRST SURPRISE IS HOW MUCH WAS ALREADY THERE. [Relentless Assault]'s
  // iron rung -- "each use of this attack in quick succession increases the
  // damage" -- and its cost line -- "low stamina, INCREASING WITH EACH SUCCESSIVE
  // ATTACK" -- are `scaleOn: 'successiveUses'` and `spamCostPer`, both built in
  // round 190 and both already read. Two canon sentences, no new machinery. What
  // the ability actually needed was its THRESHOLDS, which are new in a way
  // nothing in this game has been: every scaling ability until now got more of
  // the same as its condition built, and these rungs change what the damage IS.
  //
  // NONE OF THESE FOUR NAMES COLLIDES with the hand-authored Might pool, unlike
  // the three Dark names round 228 had to hold apart from their authored twins.
  // HAND_AUTHORED_SIGNATURES.might has carried sixteen rows since round 16 --
  // Groundbreaker, Shockwave Slam, Unyielding Will, Champion's Rally and the rest
  // -- and Humphrey's four are all new words. Nothing in essenceAbilities.js is
  // touched by this round, and nothing needed to be.
  // =========================================================================

  // No stone named in the user's text. A special attack with BOTH pools in its
  // price -- low mana and moderate stamina -- which `costs` (round 229, built for
  // [Sanguine Horror]'s three) prints correctly and a single `cost` could not.
  //
  // ITS WHOLE POINT IS THE CHANNEL, and the game already agreed with the book
  // about it before the ability arrived: canon says "highly effective against
  // physical defences", and `resonating` in stats.js is `vsArmour: 2,
  // vsResist: 0.5` -- twice through plate, half through a ward. So the iron rung
  // needed no new mechanic at all, only the right element.
  shieldBreaker: {
    name: 'Shield Breaker', _srcName: 'Might', category: 'attack',
    kind: 'active', template: 'martialStrike', element: 'resonating',
    canonStone: null,
    costs: [
      { type: 'mana', amount: 6 },
      { type: 'stamina', amount: 14 },
    ],
    cost: { type: 'stamina', amount: 14 }, cooldown: 10,
    requiresHeavyWeapon: true,
    debuff: { key: 'vibrantEcho' },
    rankConditions: { iron: [], bronze: [], silver: ['vibrantEcho'], gold: [] },
    rankEffects: {
      iron: 'Inflicts additional resonating-force damage, highly effective against '
        + 'physical defences. Requires a heavy weapon.',
      bronze: 'Damage to rigid material is significantly increased.',
      silver: 'Inflicts [Vibrant Echo] on anyone damaged by the attack.',
    },
    desc: 'The blow that is about the shield rather than the man behind it.',
    wantCost: 'Low mana and moderate stamina.', wantCooldown: '10 seconds.',
  },

  // The user gave this one at Silver -- "Current rank: Silver" -- which is the
  // only ability in the whole table whose own rank he stated, so it is recorded
  // rather than dropped. `canonRank` is what says so.
  //
  // ITS BRONZE RUNG IS THE NEW MECHANIC and it is the opposite of round 190's
  // `spamKillRefund`: that one pays out for FINISHING something, this one pays out
  // for REACHING several. "For each enemy struck the cooldown of this ability and
  // the cost of the next use of this ability are reduced" -- so a swing into a
  // crowd shortens its own wait AND discounts the following swing, which is a
  // credit carried forward and the first of those in this game. Both capped, and
  // the cap is the whole of the balance: a single swing into a super pack must
  // not zero a sixty-second cooldown, or the ability stops being a decision.
  unstoppableForce: {
    name: 'Unstoppable Force', _srcName: 'Might', category: 'attack',
    kind: 'active', template: 'martialCleave', element: 'resonating',
    canonStone: null, canonRank: 'silver',
    costs: [
      { type: 'mana', amount: 24 },
      { type: 'stamina', amount: 64, band: 'Extreme' },
    ],
    cost: { type: 'stamina', amount: 64 }, cooldown: 60,
    requiresHeavyWeapon: true,
    // The two refunds, from one count of bodies.
    perHitCooldownCut: 6, perHitCooldownCutCap: 30,
    perHitCostCut: 0.12, perHitCostCutCap: 0.6,
    // "a blast wave ... originating from EACH enemy struck", which is the splash
    // machinery re-centred per victim rather than once on the caster.
    blastFromEachStruck: { radius: 110, elements: ['resonating', 'disruptive'] },
    rankEffects: {
      iron: 'A melee attack with massive momentum, dealing large amounts of '
        + 'additional resonating-force and disruptive-force damage. Requires a '
        + 'heavy weapon.',
      bronze: 'For each enemy struck, this ability’s cooldown and the cost of '
        + 'its next use are reduced.',
      silver: 'The attack generates a blast wave of resonating-force and '
        + 'disruptive-force damage from each enemy struck.',
    },
    desc: 'It does not stop because something was in the way.',
    wantCost: 'High mana and extreme stamina.', wantCooldown: '60 seconds.',
  },

  // (Might/Potent), and the first exemplar attributed to TWO essences -- which is
  // transcribed as written rather than resolved to one, because the book's
  // parenthetical is what the card prints and picking a favourite would be
  // editing it.
  //
  // THE COST LINE IS THE ONE `spammable` WAS BUILT FOR. Round 190 added
  // "rising with each unbroken repeat" to `costWord` and this is the canon
  // sentence it was written against: "Low stamina, increasing with each
  // successive attack."
  //
  // AND THE TIERS ARE THE ROUND'S REAL WORK. Past the first threshold the strike
  // starts dealing resonating force, past the second disruptive -- and those two
  // are exact opposites in stats.js, so a long enough streak answers armour and
  // then wards in turn, whatever the target brought. The dispel escalates on the
  // same streak. `streakTiers` and `streakDispel` are the two fields; see
  // WorldScene's `_streakTiers`.
  relentlessAssault: {
    name: 'Relentless Assault', _srcName: 'Might/Potent', category: 'attack',
    kind: 'active', template: 'martialStrike', element: 'physical',
    canonStone: null,
    cost: { type: 'stamina', amount: 5 }, cooldown: 0,
    // Round 190's fields, and the two canon sentences they already answer.
    spammable: true, spamCostPer: 0.25,
    scaleOn: 'successiveUses', scalePer: 0.18, scaleCap: 1.08,
    // ...and the rungs that were new.
    streakTiers: [
      { at: 4, element: 'resonating', per: 4, cap: 40 },
      { at: 8, element: 'disruptive', per: 5, cap: 50 },
    ],
    streakDispel: { at: 8, per: 1, cap: 4 },
    rankEffects: {
      iron: 'Each use of this attack in quick succession increases its damage. The '
        + 'damage is of the same type a normal attack would deal.',
      bronze: 'Past a threshold of successive attacks, escalating resonating-force '
        + 'damage is dealt with each one.',
      silver: 'Past a further threshold, escalating disruptive-force damage is '
        + 'dealt as well, and an instance of a boon is dispelled from the target '
        + '-- an escalating number of them as the attacks continue.',
    },
    desc: 'Nothing about it is clever. It simply does not stop.',
    wantCooldown: 'None.',
  },

  // The Rebirth stone, a twenty-four-hour canon cooldown -- four played hours by
  // round 201's one divisor, the same figure [Eternal Moment] carries -- and no
  // cost at all, which is the only ability in this table that is free and
  // worth having.
  //
  // ITS GOLD RUNG IS THE ABILITY'S NAME, and it is built: "This ability can
  // automatically activate to bring someone back from the dead." The hook was
  // already there and round 105 wrote down why -- `emptyHealth` fires before
  // `dead` is set, "which is the only ordering in which a passive could do
  // anything about it" -- and in a hundred and twenty-eight rounds nothing has
  // ever taken that offer. This is the first thing in the game that answers the
  // death screen instead of appearing on it.
  //
  // ITS IRON AND BRONZE RUNGS ARE ONE MEASUREMENT SPENT TWICE: "amount restored
  // is based on how depleted health, mana and stamina are", at once and then over
  // time. Each pool against its OWN depletion, which is what canon's list of
  // three says and what a widened `selfDepletion` could not have given without
  // changing every generated ability already using it.
  //
  // THE SILVER RUNG IS DECLARED, NOT BUILT, and the reason is worth naming: "a
  // long cooldown purgation ability that removes all afflictions from the user
  // IGNORING ANY RESTRICTIONS OR IMMUNITIES to purgation." This game now has five
  // kinds of cleanse lock -- two conditional pairs, a shared-affliction lock, a
  // tag lock, a complement lock and round 230's absolute one -- and a purgation
  // that beats all of them is a sixth thing to get right rather than a flag. It
  // is also the granting of an ABILITY BY an ability, which nothing here does.
  immortality: {
    name: 'Immortality', _srcName: 'Might', category: 'healing',
    kind: 'active', template: 'restoreAll', element: 'life',
    canonStone: 'Rebirth',
    ...withCanonCooldown({}, 24),
    restoresByDepletion: { share: 0.6, ongoingSeconds: 8 },
    revive: { restoreFrac: 0.25, charges: 1 },
    pending: ['grantedPurgationAbility', 'purgationBeatsEveryLock',
      'reconstituteDestroyedBody'],
    rankEffects: {
      iron: 'Instantly restores a large share of health, mana and stamina -- more '
        + 'of each the more depleted it was when you used it.',
      bronze: 'And the same figure again as an ongoing recovery of all three.',
      silver: 'Grants a long-cooldown purgation that strips every affliction from '
        + 'you, ignoring any restriction or immunity to purgation.',
      gold: 'It can fire on its own to bring someone back from the dead, '
        + 'reconstituting a body that has been destroyed.',
    },
    desc: 'The reason he is still standing, and it only works once a day.',
    wantCost: 'None.', wantCooldown: '4 hours.',
    wantTags: ['recovery'],
  },

  // =========================================================================
  // ROUND 234 -- HUMPHREY'S MAGIC AND WING, AND A GAP THE BOOKS FOUND FOR US.
  //
  // Four abilities, one new condition, and one honest admission that is worth
  // putting at the top rather than burying: THREE OF THESE RUNGS INTERCEPT
  // INCOMING PROJECTILES, AND THIS GAME HAS NO HOSTILE PROJECTILES AT ALL.
  // Monsters are melee -- there is no `monsterProjectiles` array, no ranged
  // attack, nothing in flight toward the player in a hundred and eighty rounds
  // of building. A transcription found that, which is the kind of thing a
  // transcription is for.
  //
  // SO ONE OF THE THREE IS TRANSLATED AND TWO ARE NOT, and the difference is
  // whether there is something real to point at:
  //
  //   [Crystallise Mana] intercepts "magical projectiles" -- and round 56 built
  //   a SPELL CHANNEL: a blow carrying a `dmgElement`, answered by resistances
  //   rather than armour, which that round established as the thing a spell
  //   reflect returns and a sword blow does not. A crystal negating that is the
  //   same decision the canon rung describes, against the only magical thing
  //   this game throws at the player. Built.
  //
  //   [Razor-Wing Sword]'s feathers are fired AS projectiles and then animated
  //   to intercept PHYSICAL ones. The first half has somewhere to go; the second
  //   has nothing whatsoever -- no physical projectile exists to be intercepted,
  //   and inventing one so the rung could answer it would be building the game
  //   around a transcription rather than the other way round. Declared.
  //
  // That is round 220's census rule doing its job from the other end: a field
  // that reads a number nobody writes is the same fault as a rung that answers a
  // threat that does not exist.
  // =========================================================================

  // (Magic/Shield), the second exemplar attributed to two essences after
  // [Relentless Assault]. No stone named.
  //
  // THE SHAPE IS A BATTERY THAT IS ALSO A SHIELD, and every rung sharpens the
  // same trade: a crystal is worth mana while it sits there and worth one
  // negated blow, and it cannot be both in the same moment. The silver rung
  // makes the stored blow itself DECAY INTO MANA -- "consume the projectile's
  // energy to increase mana production", and then "redirected ... with the
  // effects diminished based on the amount of projectile energy converted into
  // mana" -- so holding a redirect costs you the mana you would have made and
  // firing it late fires a weaker one. One number moving in two directions, on a
  // clock, which is the most interesting decision in Humphrey's kit.
  // ===== ROUND 236 -- AND WHAT THE TWO HEADINGS ACTUALLY MEANT ============
  //
  // Round 234 transcribed this from Humphrey's sheet headed "(Magic/Shield)"
  // and read the slash as a compound essence, the way [Relentless Assault]'s
  // "(Might/Potent)" had been read. Then it arrived again on Neil's sheet headed
  // "(Shield)", and round 235 noted the duplication and kept one row.
  //
  // The user's correction is the interesting part and it is a rule rather than a
  // fix: "Humphry got Crystalize Mana from the Magic Essence, Neil got it from
  // the shield essence. THIS IS A CANNON EXAMPLE OF THE SAME EXACT ABILITY BEING
  // GENERATED BY DIFFERENT KITS AND DIFFERENT ESSENCES WHERE THE LEVERS
  // OVERLAP."
  //
  // So it is not one ability belonging to a compound essence. It is one ability
  // that TWO essences can each produce, and the slash was the user listing both.
  // `_srcNames` records them; `_srcName` stays the one the card prints.
  //
  // AND IT IS CHECKABLE, which is what makes it worth more than a note. The
  // overlap is not in the lever NAMES -- Magic and Shield share none -- it is in
  // what those levers GATE: Shield reaches this through `bulwark` (gates
  // `shield`) and Magic through `renew` (gates `shield` and `innervate`). See
  // `canonSharedAbilityFaults`, which asserts that every multi-essence exemplar's
  // essences can each actually reach it.
  //
  // CHECKING IT FOUND A REAL GAP. Magic's levers were burst, reach and linger,
  // which gate neither `shield` nor `innervate` -- so this ability was
  // unreachable from the essence the user says produced it, and the motif's own
  // `parts` list has read "mana-well" since round 48. See essenceMotifs.js.
  //
  // [RELENTLESS ASSAULT] IS LEFT ALONE. Its "(Might/Potent)" is very likely the
  // same construction, but the user named this ability and not that one, and
  // rewriting a second attribution on the strength of a pattern is the kind of
  // inference this table exists to avoid making silently. It is a question, and
  // it is written down here as one.
  crystalliseMana: {
    name: 'Crystallise Mana', _srcName: 'Magic', category: 'utility',
    _srcNames: ['Magic', 'Shield'],
    // What the ability IS, in the gate vocabulary of LEVER_PLAN -- which is what
    // "where the levers overlap" has to be measured against.
    leverKinds: ['shield', 'innervate'],
    kind: 'active', template: 'summonGear', element: 'radiant',
    canonStone: null,
    cost: { type: 'mana', amount: 6 }, cooldown: 0,
    conjures: 'a mana crystal',
    crystals: {
      byRank: { iron: 1, bronze: 3, silver: 5, gold: 5 },
      regenPerSec: 3, burstMana: 20, inactiveSeconds: 4,
      interceptsFrom: 'bronze', absorbsFrom: 'silver',
      absorbFrac: 1, convertPerSec: 6,
    },
    rankEffects: {
      iron: 'Creates a crystal that floats around you, accelerating mana '
        + 'recovery. It is impervious to damage but vulnerable to dispel, and a '
        + 'dispelled crystal hands you its mana at once. One at a time.',
      bronze: 'Crystals intercept magical projectiles, negating them outright -- '
        + 'and a crystal that has just negated one goes dark for a while, making '
        + 'no mana and stopping nothing. Up to three, each active one adding to '
        + 'the recovery.',
      silver: 'A crystal can absorb the projectile it negates, burning that '
        + 'energy into extra mana -- or throwing it back at an enemy, weaker for '
        + 'every scrap already spent. Up to five.',
    },
    desc: 'Mana you made earlier, orbiting, and willing to take a hit.',
    wantCost: 'Low mana.', wantCooldown: 'None.',
    wantTags: ['conjuration'],
  },

  // The Reaper stone again -- the third ability in this table to use it, after
  // [Hand of the Reaper] (round 228) and nothing else, which makes the stone's
  // character legible: it is the one that reaches what a weapon cannot.
  //
  // ITS WHOLE LADDER IS ABOUT THE INCORPOREAL, which is the first time this
  // table has had an ability that gets BETTER against a subtype rather than
  // being refused by one. `subtypeResists` (round 164) has been a wall since it
  // was built -- ethereal declines this, undead declines that -- and round 228
  // built the door through it. This is the other answer: not a key, but a blow
  // that was made for the lock.
  spiritReaper: {
    name: 'Spirit Reaper', _srcName: 'Magic', category: 'attack',
    kind: 'active', template: 'martialStrike', element: 'disruptive',
    canonStone: 'Reaper',
    costs: [
      { type: 'mana', amount: 6 },
      { type: 'stamina', amount: 6 },
    ],
    cost: { type: 'stamina', amount: 6 }, cooldown: 0,
    drainsMana: true,
    strongVsSubtypes: ['ethereal'],
    rankConditions: { iron: [], bronze: ['stun'], silver: ['radiantEcho'], gold: [] },
    rankEffects: {
      iron: 'Inflicts additional disruptive-force damage and drains mana, with a '
        + 'further effect against incorporeal or semi-corporeal creatures.',
      bronze: 'Inflicts [Stunned] on anything incorporeal or semi-incorporeal.',
      silver: 'Inflicts [Radiant Echo] on anything incorporeal.',
    },
    desc: 'A blow shaped for the things a blow does not reach.',
    wantCost: 'Low mana and low stamina.', wantCooldown: 'None.',
  },

  // (Wing). The ability that gave this game a word it did not have: a
  // COMBINATION. "A swift and powerful leap ... that can be COMBINED WITH normal
  // or special melee attacks."
  //
  // A movement ability opens a window and an attack made inside it is worth
  // more. Nothing here has done that -- a dash was a dash and a swing was a
  // swing, and the two have never known about each other. And canon's two rungs
  // are two different multipliers on purpose: iron raises PHYSICAL damage, bronze
  // raises everything a melee special deals "REGARDLESS OF DAMAGE TYPE", so a
  // build that puts fire on its sword gets nothing from the first and everything
  // from the second. That is a reason to rank the ability up rather than a
  // bigger number, and it is the sort of distinction a generator would never
  // invent.
  flyingLeap: {
    name: 'Flying Leap', _srcName: 'Wing', category: 'utility',
    kind: 'active', template: 'dash', element: 'physical',
    canonStone: null,
    // Six rather than five, and the reason is the band rather than the balance:
    // COST_BANDS puts 4 and under at "Very low" and 5-9 at "Low", so a five-point
    // price printed "Very low stamina" against a book that says "Low stamina".
    // The figure exists to land in the band canon names -- that is what every
    // cost in this table is for.
    cost: { type: 'stamina', amount: 6 }, cooldown: 10,
    combination: { seconds: 1.2, physical: 0.35, any: 0 },
    combinationByRank: {
      iron: { physical: 0.35, any: 0 },
      bronze: { physical: 0.35, any: 0.3 },
    },
    rankEffects: {
      iron: 'A swift, powerful leap with some control in the air, which can be '
        + 'combined with a normal or special melee attack -- and the physical '
        + 'damage of an attack made that way is increased.',
      bronze: 'All damage from a melee special combined with the leap is '
        + 'increased, whatever type it is.',
    },
    desc: 'Getting there is half of it.',
    wantCost: 'Low stamina.', wantCooldown: '10 seconds.',
  },

  // (Wing), and the counterpart to round 233's heavy-weapon requirement: this is
  // the first ability in the table that is WORSE with the wrong special attack
  // rather than refusing to work at all. "Ineffective when used with special
  // attacks best suited for large or heavy weapons" -- so [Shield Breaker] and
  // [Unstoppable Force], which both declare `requiresHeavyWeapon`, are exactly
  // what this sword is bad at, and one character's kit contains both halves of
  // that trade.
  //
  // ITS BRONZE AND SILVER RUNGS ARE THE PROJECTILE GAP. Feathers fired as
  // projectiles have somewhere to go; feathers animated to intercept PHYSICAL
  // projectiles have nothing at all to intercept in this game. Declared, with
  // the reason in the block note above.
  razorWingSword: {
    name: 'Razor-Wing Sword', _srcName: 'Wing', category: 'utility',
    kind: 'active', template: 'summonWeapon', element: 'physical',
    canonStone: null,
    cost: { type: 'mana', amount: 24 }, cooldown: 0,
    conjures: 'a razor-wing sword',
    enhancesMovementPowers: true,
    poorWithHeavySpecials: true,
    pending: ['featherProjectiles', 'feathersInterceptPhysicalProjectiles'],
    rankEffects: {
      iron: 'Conjures a sword in the shape of a wing. Movement powers are '
        + 'enhanced while it is in hand, and it is poor at the special attacks '
        + 'that want a large or heavy weapon.',
      bronze: 'Its feathers can be thrown as projectiles.',
      silver: 'Its feathers can be animated to intercept physical projectiles.',
    },
    desc: 'Light enough to be somewhere else with.',
    wantCost: 'High mana.', wantCooldown: 'None.',
    wantTags: ['conjuration'],
  },

  // =========================================================================
  // ROUND 235 -- NEIL DAVONE'S SHIELD, AND A ROUND THAT MOSTLY ALREADY EXISTED.
  //
  // A third character's kit. Two things to say before the rows, and the first is
  // a correction to this table's own attribution.
  //
  // [CRYSTALLISE MANA] IS IN TWO OF THE THREE KITS. The user supplied it under
  // Humphrey headed "(Magic/Shield)" and again under Neil headed "(Shield)",
  // with identical text down to the rung wording. It is transcribed once, in
  // round 234, and it stays there: a second row would be two things that have to
  // agree about one ability, which is fault class 3 on this project's list. The
  // `_srcName` keeps Humphrey's fuller heading because it is the one that names
  // both essences.
  //
  // AND THE SHIELD THREE NEEDED ALMOST NOTHING BUILT, which is the pleasant kind
  // of round and worth reading as a vindication of round 190 rather than as an
  // easy week. That round built THREE SHIELD SHAPES -- a pooled `amount`, a
  // `strikes` counter, and a `source` that spends a real pool at `costPerPoint`
  // as it absorbs -- and wrote down why each existed. Canon turns out to want
  // exactly those three:
  //
  //   [Mana Shield]   "absorb incoming attacks ... consumes mana PROPORTIONAL TO
  //                    THE DAMAGE ABSORBED", and at bronze "less mana is
  //                    required" -- which is `source: 'mana'` and a lower
  //                    `costPerPoint`. Two canon sentences, no new machinery.
  //   [Burst Shield]  "negates AN INCOMING ATTACK" -- a strike shield, singular,
  //                    which has existed since round 190 and never had a canon
  //                    ability behind it.
  //
  // What was genuinely new is the QUALIFICATION on the second, and it is the
  // only one any shield in this game has ever carried. See the row.
  // =========================================================================

  // (Shield), and the only ability in this table whose canon text limits its own
  // defence: "HIGH-DAMAGE ATTACKS OF SILVER-RANK OR HIGHER MAY NOT BE ENTIRELY
  // NEGATED."
  //
  // The strike shape has been absolute since round 190 -- one charge, any blow,
  // gone -- which makes it the right answer to every heavy hit in the game and
  // therefore not a decision at all. `negateCap` turns it back into one: above
  // the ceiling the charge is still spent and the surplus still lands, so the
  // shield is a good answer to a big blow rather than a complete one. Declared
  // per shield, so every strike shield built before this round keeps negating
  // without limit.
  //
  // ITS OTHER HALF IS AN ATTACK. "explodes out, knocking back nearby enemies and
  // inflicting concussive damage" -- so it is a defensive cooldown that leaves
  // the field worse for everyone standing near you, and by silver the things it
  // caught are helping your next barrier stand. That loop -- shield, blast,
  // [Slow Learner], stronger shield -- is the whole of Neil's Shield kit in one
  // ability.
  burstShield: {
    name: 'Burst Shield', _srcName: 'Shield', category: 'utility',
    kind: 'active', template: 'barrierWall', element: 'resonating',
    canonStone: null,
    cost: { type: 'mana', amount: 14 }, cooldown: 20,
    shieldKind: 'strikes', shieldStrikes: 1, shieldDuration: 6,
    // The qualification, and the only one a shield in this game carries.
    negateCap: 120,
    explodeRadius: 130, knockback: 90,
    debuff: { key: 'vibrantEcho' },
    rankConditions: { iron: [], bronze: ['vibrantEcho'], silver: ['slowLearner'], gold: [] },
    rankEffects: {
      iron: 'Creates a short-lived shield that negates an incoming attack and '
        + 'bursts outward, knocking nearby enemies back and dealing concussive '
        + 'damage. A high-damage attack from something silver rank or above may '
        + 'not be negated entirely.',
      bronze: 'Inflicts [Vibrant Echo] on anyone caught in the blast.',
      silver: 'Inflicts [Slow Learner] on anyone caught in the blast.',
    },
    desc: 'A guard that does not merely hold. It answers.',
    wantCost: 'Moderate mana.', wantCooldown: '20 seconds.',
  },

  // (Shield). Free, always available, and paid for at the moment it works --
  // which is round 190's `source` shape exactly: "a sourced shield spends the
  // caster's own pool AS IT ABSORBS, so it is limited by what they have left
  // rather than by a number rolled at cast time -- and it makes defence compete
  // with casting for the same budget, which a shield with its own pool never
  // does."
  //
  // That note was written five and a half years of rounds before this ability
  // arrived and describes it better than a new comment could. The whole
  // transcription is `source: 'mana'` and a `costPerPoint`, and the bronze rung
  // is that number going down.
  manaShield: {
    name: 'Mana Shield', _srcName: 'Shield', category: 'utility',
    kind: 'active', template: 'barrierWall', element: 'radiant',
    canonStone: null,
    cooldown: 0,
    shieldKind: 'timed', shieldSource: 'mana',
    shieldCostPerPoint: 1, shieldCostPerPointByRank: { iron: 1, bronze: 0.6 },
    shieldDuration: 0,
    rankEffects: {
      iron: 'Creates a mana shield that absorbs incoming attacks, spending mana '
        + 'in proportion to the damage it takes.',
      bronze: 'Less mana is needed to absorb the same blow.',
    },
    desc: 'Every blow it stops is a spell you will not be casting.',
    wantCost: 'None.', wantCooldown: 'None.',
  },

  // (Shield), and the biggest thing in his kit: a six-hour cooldown -- sixty
  // played minutes at round 201's one divisor -- that takes the whole party out
  // of the world for a moment and leaves the room full of death behind them.
  //
  // IT IS THE THIRD ABILITY TO INFLICT [CREEPING DEATH], which arrived with
  // Jason's [Hand of the Reaper] in round 228 and is now carried by two
  // characters' kits. Three transcriptions, one condition, no duplication --
  // which is the point of a shared table and worth saying once out loud.
  //
  // WHAT IS DECLARED: the dimensional space itself. "Take allies INTO a
  // dimensional space briefly" is a place this game does not have -- the party
  // would have to leave the world and come back, which is a scene transition
  // rather than a buff, and the bronze rung's "extreme mana replenishment WHILE
  // IN the dimensional space" is priced against being untouchable while it
  // happens. Round 233's `_payDepletionRestore` would pay that rung the moment
  // there is somewhere to stand.
  reapersRedoubt: {
    name: "Reaper's Redoubt", _srcName: 'Shield', category: 'utility',
    kind: 'active', template: 'aoeRing', element: 'necrotic',
    canonStone: null,
    cost: { type: 'mana', amount: 64 },
    ...withCanonCooldown({}, 6),
    unholy: true, phaseShift: true,
    debuff: { key: 'creepingDeath' },
    elements: ['disruptive', 'necrotic'],
    pending: ['dimensionalSpace', 'alliesPhasedOut', 'replenishWhilePhased'],
    rankConditions: {
      iron: ['creepingDeath'], bronze: [], silver: ['deathsGrip'], gold: [],
    },
    rankEffects: {
      iron: 'Takes your allies briefly into a dimensional space while the ground '
        + 'you left floods with death energy -- disruptive-force and necrotic '
        + 'damage, and [Creeping Death] on whatever is standing in it.',
      bronze: 'Allies are replenished extravagantly while they are in there.',
      silver: "Enemies are afflicted with [Death's Grip].",
    },
    desc: 'Step out of the world, and leave the world worse.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
    wantTags: ['dimension', 'unholy'],
  },

  // ==========================================================================
  // ROUND 238 -- NEIL DAVONE, GROWTH.
  //
  // Five transcriptions, and what they have in common is the thing that makes
  // them hard: four of the five do nothing whatever to the person casting them.
  // [Bolster] says "Cannot be used on self" in as many words; [Giant's Might]
  // and [Hero's Moment] both say "target ally". Every marquee ability the game
  // has transcribed until now has been something the caster does to an enemy or
  // to themselves, and the whole support half of this kit is aimed outward.
  // ==========================================================================

  bolster: {
    name: 'Bolster', _srcName: 'Growth', category: 'support',
    kind: 'active', template: 'partyBuff', element: 'nature',
    canonStone: null,
    // A sub-hour cooldown is written in PLAYED seconds directly:
    // `withCanonCooldown` compresses canon HOURS by six, and a 30-second
    // cooldown put through it comes out as five minutes. The helper is for the
    // book's long rituals, which are the figures the compression exists for.
    cost: { type: 'mana', amount: 16 }, cooldown: 30,
    // The `boon` tag's one source (see CANON_TAG_RULES): canon heads this
    // "Spell (magic, boon)", and `magic` falls out of paying mana.
    boon: true,
    incantation: 'Let your power fulminate.',
    // The clause that has no equivalent anywhere else in the canon layer: an
    // ability whose target may not be the caster.
    notSelf: true,
    buffDebuff: { key: 'bolstered' },
    elements: ['nature', 'radiant'],
    rankConditions: {
      iron: ['bolstered'], bronze: [], silver: [], gold: [],
    },
    rankEffects: {
      iron: "Grants [Bolstered] to an ally: their next essence ability lands with "
        + 'increased effect -- damage, range or number of targets, whichever that '
        + 'ability has. Cannot be used on yourself.',
      bronze: "The bolstered ability's mana and stamina cost is reduced. Only the "
        + 'cost paid to start it -- anything it goes on to spend while it runs is '
        + 'charged in full.',
    },
    desc: "Someone else's next move, made larger.",
    wantCost: 'Moderate mana.', wantCooldown: '30 seconds.',
    wantTags: ['magic', 'boon'],
  },

  giantsMight: {
    name: "Giant's Might", _srcName: 'Growth', category: 'support',
    kind: 'active', template: 'partyBuff', element: 'nature',
    canonStone: null,
    cost: { type: 'mana', amount: 26 }, cooldown: 600,
    boon: true,
    notSelf: false,
    buffDebuff: { key: 'giantsMight' },
    elements: ['nature', 'physical'],
    rankConditions: {
      iron: ['giantsMight'], bronze: [], silver: [], gold: [],
    },
    rankEffects: {
      iron: 'An ally and their equipment grow larger, granting [Giant\'s Might] '
        + 'and a raised Power attribute.',
      bronze: 'The same boon also carries resistance to physical damage and to '
        + 'high-momentum effects -- being knocked back, shoved or dragged.',
    },
    desc: 'Briefly, your friend is a much larger problem.',
    wantCost: 'High mana.', wantCooldown: '10 minutes.',
    wantTags: ['boon'],
  },

  verdantCage: {
    name: 'Verdant Cage', _srcName: 'Growth', category: 'control',
    kind: 'active', template: 'projectileBall', element: 'nature',
    canonStone: null,
    cost: { type: 'mana', amount: 8 }, cooldown: 30,
    conjures: 'vines',
    debuff: { key: 'verdantCage' },
    elements: ['nature', 'poison'],
    rankConditions: {
      iron: ['verdantCage'], bronze: [], silver: ['poison'], gold: [],
    },
    rankEffects: {
      iron: 'Vines grow up around a target and hold it in place with [Caged] -- '
        + 'held, not silenced. The hold is stronger where something is already '
        + 'growing and weakest on bare rock, ash and sand.',
      bronze: 'The binding plants carry thorns, and the thorns draw blood on a '
        + 'clock while the cage holds.',
      silver: 'The thorns are venomous. Which venom depends on the ground: [Poisoned] '
        + 'where things grow, a rot where nothing does any more, and something that '
        + 'gets into the meridians where the ambient magic runs thick.',
    },
    desc: 'The ground it is standing on has opinions.',
    wantCost: 'Low mana.', wantCooldown: '30 seconds.',
    wantTags: ['poison', 'conjuration'],
  },

  herosMoment: {
    name: "Hero's Moment", _srcName: 'Growth', category: 'support',
    kind: 'active', template: 'partyBuff', element: 'radiant',
    // The one ability on Neil's sheet that names its stone.
    canonStone: 'avatar',
    canonRank: 'iron',
    // "Extreme mana." Extreme is not one of COST_BANDS -- see the note on
    // `costsPhrase`: the bands are the scale the whole game is balanced on and
    // adding a sixth top would silently re-band every ability above the old
    // ceiling. A spec that wants the book's word says so per pool, through
    // `costs`, which is how [Sanguine Horror] prints all three of its.
    costs: [{ type: 'mana', amount: 120, band: 'Extreme' }],
    cost: { type: 'mana', amount: 120 },
    // Canon says 24 hours, and `withCanonCooldown` divides by six: four hours
    // played, which is the compression round 201 settled and the same one
    // [Reaper's Redoubt] and [Spartoi] answer to.
    ...withCanonCooldown({}, 24),
    notSelf: true,
    boon: true,
    holy: true,
    // "they gain ongoing mana and stamina recovery" -- the clause that earns
    // canon's `recovery` tag without any healing being involved. See the rule.
    restoresPools: true,
    buffDebuff: { key: 'herosMoment' },
    elements: ['radiant'],
    rankConditions: {
      iron: ['herosMoment', 'herosCost'], bronze: [], silver: [], gold: [],
    },
    rankEffects: {
      iron: "Grants [Hero's Moment] to one ally: every attribute and every "
        + 'resistance raised, flat damage reduction, larger mana and stamina pools '
        + 'with both refilling as they fight, and the effects of rank disparity set '
        + 'aside entirely. When it lapses they are [Spent] -- the inverse of all of '
        + 'it, for a while.',
      bronze: "While it holds, the ally's essence abilities land with increased "
        + 'effect.',
    },
    desc: 'One ally, one day, everything you have.',
    // The PLAYED figure, as every compressed exemplar in this file states it
    // ([Reaper's Redoubt] writes "60 minutes." against canon's six hours). The
    // book's own number is kept beside it on `canonCooldownHours`.
    wantCost: 'Extreme mana.', wantCooldown: '4 hours.',
    wantTags: ['boon', 'holy', 'recovery'],
  },

  chrysalisGolem: {
    name: 'Chrysalis Golem', _srcName: 'Growth', category: 'summon',
    kind: 'active', template: 'summonBonded', element: 'nature',
    canonStone: null,
    cost: { type: 'mana', amount: 110 },
    ...withCanonCooldown({}, 6),
    elements: ['nature'],
    // ===== DECLARED PENDING, AND WHY ========================================
    //
    // Every other ability in this round got its conditions and its readers. This
    // one is transcribed and NOT built, on purpose, and the reason is that three
    // of its four rungs are a state machine rather than an effect:
    //
    //   bronze -- the summon has TWO forms and does something different in the
    //             first one ("shoots spikes WHILE IN THE CHRYSALIS STATE"),
    //   silver -- the transition has a clock that can be shortened, and the
    //             SECOND form is chosen by the surroundings,
    //   gold   -- the first form absorbs hostile magic, and what it absorbed
    //             decides what the second form counters.
    //
    // The game's summons are single-form: one creature, one behaviour, a timer.
    // A two-phase summon whose second phase is selected by an adaptation table
    // is a mechanic, not a row, and building a third of it would leave the
    // familiar spawning, sitting in a chrysalis and never hatching -- which is
    // worse than not building it, because it would look finished.
    //
    // Round 232's [Harbinger of Doom] is the precedent for what this needs: a
    // spawner with its own clock, its own cap and its own table.
    //
    // ===== ROUND 248 -- TWO OF THE FIVE ARE BUILT NOW =======================
    //
    // The art arrived in round 247 -- eleven forms, eight directions each -- and
    // with it the two-phase machine the note above says is a mechanic rather
    // than a row. `chrysalisState` is the ten-second seal in WorldScene's
    // `_tickChrysalis` (the transform plays, its last two frames shimmer, the
    // base form's death plays faded as the crystal goes), and
    // `environmentalAdaptation` is `formFor` in chrysalis.js, which scores
    // fifteen hazards against what each form answers.
    //
    // THE OTHER THREE ARE STILL PENDING, and they are pending for the reason
    // this list exists rather than because they were forgotten:
    //
    //   chrysalisSpikes    bronze. The sealed golem is deliberately inert --
    //                      ten seconds of doing nothing is what the
    //                      transformation is paid for, and a chrysalis that
    //                      shoots is a different balance question.
    //   magicAbsorption    gold. Nothing in the game lets a body eat a hostile
    //                      spell and keep it.
    //   counterEvolution   gold. HALF of this exists: the golem records what
    //                      last hit and wears it as its colour. What it does
    //                      not do is let that decide the FORM -- the form
    //                      answers hazards, which is the silver rung. Marking
    //                      it done because the tint is there would be the kind
    //                      of half-build this note was written to prevent.
    pending: ['chrysalisSpikes', 'magicAbsorption', 'counterEvolution'],
    // ROUND 248 -- what `_spawnSummon` reads to know this one seals itself.
    // A flag rather than a name match: a string in two files that have to
    // agree is this project's third recurring fault.
    chrysalis: true,
    rankConditions: {
      iron: [], bronze: [], silver: [], gold: [],
    },
    rankEffects: {
      iron: 'Summons a chrysalis golem.',
      bronze: 'It shoots spikes while it is still in the chrysalis.',
      silver: 'The chrysalis resolves more quickly, and what comes out is better '
        + 'adapted to where it hatched.',
      gold: 'The chrysalis draws in hostile magic first, and evolves to counter '
        + 'whatever it drank.',
    },
    desc: 'Something is going to come out of that.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
    wantTags: ['summon'],
  },

  // ==========================================================================
  // ROUND 239 -- HUMPHREY GELLER, DRAGON.
  //
  // Four transcriptions, and one of them is the reason this layer exists.
  //
  // [Dragon's Might] has been in the game since ROUND 122, built from the
  // user's paraphrase -- "Humphry's aura converts his fire damage to dragonfire
  // which can't be resisted" -- and the paraphrase names the ability's BRONZE
  // rung. The book has three:
  //
  //   iron   -- "Allies have increased [Power] and [Spirit]."
  //   bronze -- "Fire created by your essence abilities becomes Dragon Fire."
  //   silver -- "Allies have increased resistance to effects that reduce the
  //              [Power] and [Spirit] attributes."
  //
  // So for a hundred and seventeen rounds the aura carried the memorable clause
  // and neither of the two around it, including the PRIMARY effect. Both are
  // built this round. Round 55's unresistable clamp is kept exactly as it is:
  // canon never says Dragon Fire cannot be resisted, the paraphrase does, and
  // the two do not contradict each other.
  // ==========================================================================

  dragonArmour: {
    name: 'Dragon Armour', _srcName: 'Dragon', category: 'defensive',
    kind: 'active', template: 'summonArmor', element: 'fire',
    canonStone: null,
    cost: { type: 'mana', amount: 26 },
    // "Cooldown: None." A conjuration that stays up: the same reading
    // [Castigate] and [Karmic Warrior] get, and the card prints the word.
    cooldown: 0,
    conjures: 'armour',
    armorBonus: 0.18,
    resist: { element: 'fire', amount: 0.30 },
    // Bronze. The complement of a damage type, which cannot be a key in a table
    // keyed by type -- see `_nonPhysicalResist` and, for the idiom this borrows,
    // `cleanseLockedByNonTag` in debuffs.js.
    resistNonPhysical: 0.15,
    elements: ['fire'],
    rankConditions: { iron: [], bronze: [], silver: [], gold: [] },
    rankEffects: {
      iron: 'Conjures a suit of dragon scale armour: strong physical protection '
        + 'and a raised resistance to fire damage and effects.',
      bronze: 'The same scales turn aside non-physical damage as well, and fire '
        + 'harder still.',
    },
    desc: 'Scales, and nothing gets through scales.',
    wantCost: 'High mana.', wantCooldown: 'None.',
    wantTags: ['conjuration'],
  },

  fireBreath: {
    name: 'Fire Breath', _srcName: 'Dragon', category: 'attack',
    kind: 'active', template: 'breathCone', element: 'fire',
    canonStone: null,
    // "Special attack" rather than "Spell", which in this game is
    // `requiresWeapon` -- the marker round 174 settled on, and the reason the
    // cone plays the weapon-strike telegraph.
    requiresWeapon: true,
    cost: { type: 'mana', amount: 46 },
    cooldown: 50,
    base: 26, range: 210,
    // "a stream of fire that LASTS SEVERAL SECONDS". The cone is not an instant
    // in canon, so the spec says how long it holds.
    duration: 3,
    // Bronze: "Anyone damaged by the flames suffers ongoing fire damage." The
    // table has carried [Burning] since the beginning; a Dragon-specific
    // duplicate would be one affliction offered twice, which is fault class 4
    // on this project's list.
    dot: { key: 'burn', dmgPerTick: 5, ticks: 5 },
    elements: ['fire'],
    rankConditions: { iron: [], bronze: ['burn'], silver: [], gold: [] },
    rankEffects: {
      iron: 'Breathes a stream of fire that holds for several seconds, burning '
        + 'everything in the cone ahead of you.',
      bronze: 'Anything the flames touch is left [Burning].',
    },
    desc: 'You breathe fire now. That is the whole sentence.',
    wantCost: 'Very high mana.', wantCooldown: '50 seconds.',
    wantTags: ['damage-over-time', 'area'],
  },

  dragonsMightAura: {
    name: "Dragon's Might", _srcName: 'Dragon', category: 'support',
    // An AURA: passive, no cost, no cooldown. Canon writes "Base Cost: None"
    // and "Cooldown: None" and heads it "(Aura)".
    kind: 'passive', template: 'aura', element: 'fire',
    canonStone: null,
    cost: null, cooldown: 0,
    auraRadius: 190,
    // The three clauses, one field each. `allyAttrBoon` names the condition
    // that carries iron and silver together; `unresistable` is round 55's and
    // round 122's, unchanged.
    allyAttrBoon: 'dragonsMight',
    unresistable: true,
    elements: ['fire'],
    rankConditions: { iron: ['dragonsMight'], bronze: [], silver: [], gold: [] },
    rankEffects: {
      iron: "Allies inside the field carry [Dragon's Might]: raised Power and "
        + 'Spirit for as long as they stand in it.',
      bronze: 'Fire your essence abilities create becomes Dragon Fire, and '
        + 'nothing turns Dragon Fire aside -- though what burns easily still '
        + 'burns easily.',
      silver: 'The same boon makes Power and Spirit far harder to drain back '
        + 'down.',
    },
    desc: 'Stand near him and you are worth more.',
    // No `wantCooldown`. Canon writes "Cooldown: None" and the CARD writes no
    // cooldown line at all for a passive -- see `cooldownPhrase`'s own guard,
    // and [Hegemony] above, which is the other passive aura in this table and
    // states its cost and not its cooldown for the same reason.
    wantCost: 'None.',
    wantTags: ['area'],
  },

  spartoi: {
    name: 'Spartoi', _srcName: 'Dragon', category: 'summon',
    kind: 'active', template: 'summonMinion', element: 'fire',
    canonStone: null,
    cost: { type: 'mana', amount: 96 },
    ...withCanonCooldown({}, 6),
    // Canon is a COUNT per rung -- three, five, eight -- which is the first
    // exemplar in this layer whose rungs differ only in a number. Written as a
    // table so the rungs and the figures cannot come apart: `rankEffects` is
    // prose for the card and this is what the summoner reads.
    summons: 'dragonToothWarrior',
    summonCountByRank: { iron: 3, bronze: 5, silver: 8, gold: 8 },
    ritual: true,
    elements: ['fire'],
    rankConditions: { iron: [], bronze: [], silver: [], gold: [] },
    rankEffects: {
      iron: 'Summons three dragon-tooth warriors.',
      bronze: 'Five instead of three.',
      silver: 'Eight.',
    },
    desc: 'Sow the teeth, and see what stands up.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
    wantTags: ['summon'],
  },

  // ===========================================================================
  // ROUND 284 -- THE FOUR PASTES THAT HAD NO EXEMPLAR.
  //
  // "All cannon abilities need to be working in game". Life Bolt and three
  // Wing abilities arrived as text (batch01.txt) with nothing on the game's
  // side. Each is the smallest spec the kit composer needs to place it: what
  // it does is canonRuntime*Mixin.js, and what the card says is his text.
  // ===========================================================================
  lifeBolt: {
    name: 'Life Bolt', _srcName: 'Renewal', category: 'healing',
    kind: 'active', template: 'projectileBall', element: 'radiant',
    canonStone: null,
    cost: { type: 'mana', amount: 6 }, cooldown: 0,   // "Cost: Low mana. Cooldown: None."
    rankConditions: { iron: [], bronze: [], silver: [], gold: [] },
    desc: 'Life, thrown.',
    wantCost: 'Low mana.', wantCooldown: 'None.', wantTags: ['healing'],
  },
  dragonWingSword: {
    name: 'Dragon Wing Sword', _srcName: 'Wing', category: 'attack',
    kind: 'active', template: 'summonWeapon', element: 'fire',
    canonStone: null,
    cost: { type: 'mana', amount: 24 }, cooldown: 60,   // "High mana. Cooldown: 1 minute."
    conjures: 'the Dragon Wing Sword',
    rankConditions: { iron: [], bronze: ['burn'], silver: [], gold: [] },
    desc: 'A wing, edged.',
    wantCost: 'High mana.', wantCooldown: '1 minute.', wantTags: ['conjuration', 'fire'],
  },
  dragonWings: {
    name: 'Dragon Wings', _srcName: 'Wing', category: 'utility',
    kind: 'active', template: 'canonConjuration', element: 'physical',
    canonStone: null,
    // "Cost: High mana-per-second." Paid by the second while they are out.
    cost: { type: 'mana', amount: 4 }, cooldown: 0,
    conjures: 'dragon wings',
    rankConditions: { iron: [], bronze: [], silver: [], gold: [] },
    desc: 'Powerful, and not nimble.',
    wantCost: 'High mana-per-second.', wantCooldown: 'None.', wantTags: ['conjuration', 'movement'],
  },
  diveBomb: {
    name: 'Dive Bomb', _srcName: 'Wing', category: 'attack',
    kind: 'active', template: 'dash', element: 'physical',
    canonStone: null,
    cost: { type: 'stamina', amount: 24 }, cooldown: 20,   // "High stamina. Cooldown: 20 seconds."
    rankConditions: { iron: [], bronze: [], silver: [], gold: [] },
    desc: 'Down, hard.',
    wantCost: 'High stamina.', wantCooldown: '20 seconds.', wantTags: ['movement', 'combination'],
  },
};
// ROUND 287 -- his third paste: the new abilities, and the older
// transcriptions whose price now follows his text.
Object.assign(CANON_EXEMPLARS, CANON_EXEMPLARS_03);
for (const [k, fix] of Object.entries(CANON_EXEMPLAR_FIXES_03)) if (CANON_EXEMPLARS[k]) Object.assign(CANON_EXEMPLARS[k], fix);
// ROUND 278 -- each exemplar knows its own key, so a card can find the user's
// verbatim text for it in canonText.js.
for (const [k, a] of Object.entries(CANON_EXEMPLARS)) a.canonKey = k;
export const CANON_EXEMPLAR_KEYS = Object.keys(CANON_EXEMPLARS);

/**
 * Render each transcription and assert the lines the books print. Takes the
 * card builder as an argument rather than importing it, because abilityCard.js
 * imports THIS file and a cycle between them would be a load-order bug waiting
 * for the day someone reorders the imports.
 */
/** The four ranks a canon transcription is written in, in order. */
export const CANON_RANKS = ['iron', 'bronze', 'silver', 'gold'];

/**
 * ROUND 228 -- THE TWO DECLARATIONS ABOUT A RANK HAVE TO AGREE.
 *
 * A transcription may say what a rung DOES (`rankEffects`, prose, printed on
 * the card) and which conditions it grants (`rankConditions`, keys, read by
 * the suites). Those are two hand-written statements about the same rung, which
 * is fault class 3 on this project's list -- a hand-maintained list beside
 * another one drifts -- so they are checked against each other rather than
 * trusted:
 *
 *   * every rung named in `rankConditions` names its conditions in the prose
 *     for that same rung, by label, in brackets;
 *   * every condition either declaration names actually exists;
 *   * a `rankEffects` table has no rung with empty text and no rank the game
 *     does not have.
 *
 * `lookup` is passed in rather than imported, for the same reason `cardFn` is
 * in the function below: this module is pure data over specs and importing the
 * condition table to check a comment would give it a dependency it does not
 * need.
 */
export function canonRankEffectFaults(lookup) {
  const out = [];
  for (const [key, a] of Object.entries(CANON_EXEMPLARS)) {
    if (a.rankEffects) {
      for (const r of Object.keys(a.rankEffects)) {
        if (!CANON_RANKS.includes(r)) out.push(`${key}: rankEffects names "${r}", which is not a rank`);
      }
      for (const r of CANON_RANKS) {
        const t = a.rankEffects[r];
        if (t !== undefined && !String(t).trim()) out.push(`${key}: the ${r} rung is empty`);
      }
      if (!a.rankEffects.iron) out.push(`${key}: has rank effects and no iron rung`);
    }
    if (!a.rankConditions) continue;
    for (const [r, keys] of Object.entries(a.rankConditions)) {
      if (!CANON_RANKS.includes(r)) out.push(`${key}: rankConditions names "${r}", which is not a rank`);
      for (const ck of keys) {
        const def = lookup(ck);
        if (!def) { out.push(`${key}: ${r} grants "${ck}", which is not a condition`); continue; }
        // The cross-check. Only asked of a transcription that HAS prose for
        // that rung -- rounds 221 and 224 wrote their conditions before the
        // prose field existed, and demanding it of them would be this round
        // failing two shipped abilities for a field they predate.
        const prose = a.rankEffects && a.rankEffects[r];
        if (prose && !String(prose).includes(`[${def.label}]`)) {
          out.push(`${key}: ${r} grants [${def.label}] and its effect line does not say so`);
        }
      }
    }
  }
  return out;
}

/**
 * ROUND 236 -- "THE SAME EXACT ABILITY ... WHERE THE LEVERS OVERLAP."
 *
 * The user's rule, made checkable. An exemplar may name more than one essence in
 * `_srcNames`, and this asserts the claim that makes that legitimate: each named
 * essence must actually be able to REACH the ability.
 *
 * THE OVERLAP IS IN THE GATES, NOT THE NAMES, which is the whole finding.
 * [Crystallise Mana] is produced by Magic and by Shield, and those two essences
 * share no lever whatsoever -- Shield carries bulwark/taunt/allies/anchor and
 * Magic carries burst/reach/linger/renew. What they share is that `bulwark` and
 * `renew` both gate `shield`, and the ability is a shield. A check written
 * against lever names would have called the user's own canon example a
 * contradiction.
 *
 * So `leverKinds` says what an ability IS in LEVER_PLAN's vocabulary, and this
 * asks, for each named essence, whether any of its levers gates any of those
 * kinds. It returns the gate each one uses, so a passing check still says WHY it
 * passes rather than only that it did.
 *
 * Takes its three tables as arguments for the reason `cardFn` is passed to the
 * function below: this module is pure data over specs, and importing the motif
 * table to check an attribution would give it a dependency it does not need.
 */
export function canonSharedAbilityFaults(leverPlan, motifs, essenceCatalog) {
  const out = [];
  const idByName = {};
  for (const [id, def] of Object.entries(essenceCatalog || {})) idByName[def.name] = id;
  const gatesOf = (essenceName) => {
    const id = idByName[essenceName];
    if (!id) return null;
    const motif = motifs && motifs[id];
    if (!motif) return null;
    const set = new Set();
    for (const lv of motif.levers || []) {
      const plan = leverPlan[lv];
      for (const g of (plan && plan.gates) || []) set.add(g);
    }
    return { id, levers: (motif.levers || []).slice(), gates: set };
  };
  const reached = {};
  for (const [key, a] of Object.entries(CANON_EXEMPLARS)) {
    const names = a._srcNames;
    if (!Array.isArray(names) || names.length < 2) continue;
    if (!Array.isArray(a.leverKinds) || !a.leverKinds.length) {
      out.push(`${key}: names ${names.length} essences and declares no leverKinds, so the claim cannot be checked`);
      continue;
    }
    if (!names.includes(a._srcName)) {
      out.push(`${key}: the card prints "(${a._srcName})", which is not one of ${names.join(', ')}`);
    }
    const how = {};
    for (const n of names) {
      const g = gatesOf(n);
      if (!g) { out.push(`${key}: names the essence "${n}", which is not in the catalog`); continue; }
      const hit = a.leverKinds.filter(k => g.gates.has(k));
      if (!hit.length) {
        out.push(`${key}: ${n} carries [${g.levers.join(', ')}], which gate none of [${a.leverKinds.join(', ')}]`);
      } else {
        how[n] = hit;
      }
    }
    // ...and the essences must overlap with EACH OTHER on at least one kind, or
    // they are two different abilities that happen to share a name.
    const lists = Object.values(how);
    if (lists.length === names.length) {
      const shared = lists.reduce((acc, l) => acc.filter(k => l.includes(k)));
      if (!shared.length) {
        out.push(`${key}: its essences reach it through kinds that do not overlap -- ${JSON.stringify(how)}`);
      } else {
        reached[key] = { how, shared };
      }
    }
  }
  out.reached = reached;
  return out;
}

export function canonExemplarFaults(cardFn) {
  const out = [];
  for (const [key, a] of Object.entries(CANON_EXEMPLARS)) {
    const lines = cardFn(a, { rank: 'iron', level: 0, progress: 0 });
    const text = lines.join('\n');
    // ROUND 278 -- where the user's own text for this ability is stored, IT is
    // the standard: the card must carry his type line, cost and cooldown word
    // for word, and the `want*` fields below -- round 201-235's transcriptions,
    // which reworded him -- are not consulted.
    const verbatim = CANON_TEXT[key];
    if (verbatim) {
      if (/\bundefined\b|\bNaN\b/.test(text)) out.push(`${key}: its card prints undefined/NaN`);
      if (!text.includes(`Ability: [${verbatim.name}] (${verbatim.essence})`)) out.push(`${key}: the head line is "${lines[0]}"`);
      const L = verbatim.labels || {};
      const typeLine = L.type ? `${L.type}: ${verbatim.type}` : verbatim.type;
      if (verbatim.type && !lines.includes(typeLine)) out.push(`${key}: type line is not the user's`);
      if (verbatim.cost && !lines.includes(`${L.cost || verbatim.costLabel || 'Cost'}: ${verbatim.cost}`)) out.push(`${key}: cost line is not the user's`);
      if (verbatim.cooldown && !lines.includes(`${L.cooldown || 'Cooldown'}: ${verbatim.cooldown}`)) out.push(`${key}: cooldown line is not the user's`);
      continue;
    }
    // ROUND 234 -- A CARD THAT PRINTS `undefined` IS A BROKEN CARD.
    //
    // This function has rendered every transcription at iron since round 201 and
    // asserted what the lines SAY; it never asked whether they say anything at
    // all. [Crystallise Mana] found the gap by crashing -- `summonGear`'s stats
    // line assumed every conjured accessory is crit gear -- and a crash is the
    // lucky version. The unlucky one is a line reading "-undefined damage from
    // every hit taken", which would have shipped in silence.
    if (/\bundefined\b|\bNaN\b/.test(text)) {
      out.push(`${key}: its card prints "${lines.find(l => /undefined|NaN/.test(l))}"`);
    }
    // The essence goes in the parenthetical, which is the most visible of the
    // format deltas and the one a regression would silently undo.
    if (!text.includes(`Ability: [${a.name}] (${a._srcName})`)) {
      out.push(`${key}: the head line is "${lines[0]}"`);
    }
    if (a.wantCost && !text.includes(`Cost: ${a.wantCost}`)) {
      out.push(`${key}: cost reads "${lines.find(l => l.startsWith('Cost:'))}", canon says "Cost: ${a.wantCost}"`);
    }
    if (a.wantCooldown && !text.includes(`Cooldown: ${a.wantCooldown}`)) {
      out.push(`${key}: cooldown reads "${lines.find(l => l.startsWith('Cooldown:'))}", canon says "Cooldown: ${a.wantCooldown}"`);
    }
    for (const t of (a.wantTags || [])) {
      if (!lines[1].includes(t)) out.push(`${key}: not tagged ${t} -- "${lines[1]}"`);
    }
    // Zero-padded, every time.
    const rankLine = lines.find(l => l.startsWith('Current rank:'));
    if (a.kind !== 'passive' && rankLine && !/\(\d\d%\)\.$/.test(rankLine)) {
      out.push(`${key}: the percentage is not zero-padded -- "${rankLine}"`);
    }
    // A canon-hour ability keeps the figure the book gave it.
    if (a.canonCooldownHours && canonHours(a.canonCooldownHours) !== a.cooldown) {
      out.push(`${key}: the played cooldown is not its canon hours divided by ${CANON_HOUR_DIVISOR}`);
    }
  }
  // The three transformations are the same template with three swaps, and
  // their cards must therefore differ in exactly the three swapped clauses.
  const ex = CANON_EXEMPLARS;
  // ROUND 287 -- a transformation he has pasted prints HIS lines, which is
  // the standard; the clause checks are for the transcriptions only.
  const bodies = ['speciousSorcerer', 'counterfeitCombatant', 'instantAdept'].filter(k => !CANON_TEXT[k])
    .map(k => cardFn(ex[k], { rank: 'iron', level: 0, progress: 0 })
      .filter(l => l.startsWith('Effect (iron)')).join(' '));
  if (new Set(bodies).size !== bodies.length) out.push('two transformations print the same effect line');
  for (const b of bodies) {
    if (!/significant increase to the \[\w+\] attribute/.test(b)) out.push('a transformation lost its attribute clause');
    if (!/ability to use /.test(b)) out.push('a transformation lost its proficiency grant');
    if (!/maximum \w+ increases/.test(b)) out.push('a transformation lost its raised pool');
    if (!/recovery effect/.test(b)) out.push('a transformation lost its ongoing regen');
  }
  return out;
}
