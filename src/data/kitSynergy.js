// ===========================================================================
// ROUND 206 -- THE STONE DECIDES HOW, AND THE KIT SAYS SO ON THE CARD.
//
// The user's model, in their own words:
//
//   "The essences determine the synergy the confluence determines the shape
//    and other effects."
//
// and, for what makes two identical essence sets play differently:
//
//   "If someone else ended up with the same confluence and 3 of the same
//    essences the build would be similar but not identical because of the
//    awakening stones."
//
// So there are three layers and each one has a job:
//
//   ESSENCE  -> the TOKENS. What you deal in.   (essenceTokens.js, round 206)
//   STONE    -> the VERB.   How you deal in it.  (this file)
//   CONFLUENCE -> the SHAPE. dps/tank/healer.    (buildClasses.js, round 190)
//
// The third has existed since round 190 and was always right about shape; it
// was only ever wrong as a hook for SYNERGY, which is what round 205b found
// on Arsenal. This file is the middle layer.
//
// ---------------------------------------------------------------------------
// WHAT A VERB IS.
//
// Six, from the user's own examples in the confluence discussion:
//
//   seed       an ability of one essence applies another's condition
//              -- "sword abilities that trigger bleed and fire"
//   detonate   a condition landing on a target that already carries another
//              -- "bonuses for freezing burning enemies"
//   alias      one condition counts as another for everything else's triggers
//              -- "make bleeding count as burning for the purpose of other
//                 abilities who do more damage to burning enemies"
//   transfer   a bonus to one thing also applies to another
//              -- "fire damage buffs affect cold damage"
//   alternate  rotating between two poles pays
//              -- "make rotating between sun and moon beneficial"
//   share      what one member grants, all members grant
//              -- round 205's Arsenal, already shipped
//
// ONLY `seed` IS WIRED IN THIS ROUND, and `WIRED` below says so rather than
// leaving it to be discovered. The other five are named here because the table
// that picks a verb has to be complete to be reviewable -- but a verb nothing
// reads is this project's fault class 2, so `synergyFaults` reports every
// unwired verb every time it runs. They cannot be quietly forgotten.
//
// Why `seed` first: it rides `spec.debuff`, which the runtime has applied at
// nine call sites since round 57, so it needs no new damage plumbing at all.
// `detonate` needs a per-ability-against-this-target multiplier threaded
// through about twenty damage sites, and `alias` is meaningless until
// `detonate` exists to read the tag -- shipping it first would be a field
// written by one side and read by none, again.
// ===========================================================================

import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { STONE_ELEMENTS } from './essenceLevers.js';
import { DEBUFFS } from './debuffs.js';
import { tokensFor, edgesFrom } from './essenceTokens.js';
// ROUND 207 -- the gate verb. See synergyGates.js.
import { SYNERGY_GATES, GATE_KEYS, GATE_EFFECTS, EFFECT_KEYS, SINS, SIN_KEYS,
  gateClauseText, ELEMENT_ADJ, ELEMENT_KEYS } from './synergyGates.js';

export const VERBS = {
  seed: 'applies another essence\'s condition',
  // ROUND 207 -- `detonate` became `gate`, and the rename is the design.
  // "The target already carries a condition" is ONE predicate; the user's Sin
  // examples (at full health, two weapons held, paces moved) are three more of
  // the same kind. See synergyGates.js.
  gate: 'pays out while something observable is true',
  alias: 'makes one condition count as another',
  transfer: 'lends a bonus from one thing to another',
  alternate: 'pays for rotating between two poles',
  share: 'spreads what one member grants to all of them',
};
/** The verbs the runtime actually reads. See the note above: this is here so
 *  that an unwired verb is a reported fault rather than a silent one. */
// ROUND 213 -- all six. The three that were pending since round 206 are
// wired, and the reason each waited is the reason each is now possible:
//
//   alias      needed something in the game to ask WHAT a target is
//              suffering. Round 207's gates only ever asked how MUCH. The
//              three condition gates added this round are that reader, so
//              alias writes an element onto the target and a gate reads it.
//   transfer   needed one seam where an element-scoped bonus is read. There
//              is exactly one: `_statBuff('dmg_<element>')`, wrapped once,
//              and every call site in the scene inherits it.
//   alternate  needed the player to remember what they cast last, and
//              nothing in the game tracked it. It does now, written at the
//              cooldown commit -- the one line every successful cast reaches
//              and every early return does not.
export const WIRED = new Set(['seed', 'share', 'gate', 'alias', 'transfer', 'alternate']);

// ===========================================================================
// THE VERB EACH STONE FAMILY LEANS ON.
//
// Two apiece rather than one, because 192 stones share 29 families and a
// single verb per family would make every Blade stone in the game do the same
// thing -- the monoculture fault round 63 spent itself on. Which of the two a
// socket takes is seeded off the socket, so it is stable across reloads.
//
// The reading, family by family, is the stone's own character: a serpent puts
// something in you and waits, so it SEEDS; a hammer breaks what is already
// there, so it DETONATES; alchemy is transmutation, which is ALIAS in one
// word; light holds the sun and the moon, which is the user's own ALTERNATE
// example; identity becomes the other thing, which is SHARE.
// ===========================================================================
export const STONE_VERBS = {
  // --- it puts something in and waits ---
  serpent:    { primary: 'seed',      secondary: 'alias' },
  blade:      { primary: 'seed',      secondary: 'gate' },
  polearm:    { primary: 'seed',      secondary: 'transfer' },
  ranged:     { primary: 'seed',      secondary: 'gate' },
  beast:      { primary: 'seed',      secondary: 'share' },
  smallbeast: { primary: 'seed',      secondary: 'alternate' },
  flyer:      { primary: 'seed',      secondary: 'alternate' },
  // --- it breaks what is already there ---
  bludgeon:   { primary: 'gate',  secondary: 'transfer' },
  fire:       { primary: 'gate',  secondary: 'seed' },
  cold:       { primary: 'gate',  secondary: 'alias' },
  storm:      { primary: 'gate',  secondary: 'alternate' },
  // --- it turns one thing into another ---
  alchemy:    { primary: 'alias',     secondary: 'transfer' },
  death:      { primary: 'alias',     secondary: 'seed' },
  dark:       { primary: 'alias',     secondary: 'gate' },
  // --- it lends ---
  blood:      { primary: 'transfer',  secondary: 'seed' },
  order:      { primary: 'transfer',  secondary: 'alternate' },
  guard:      { primary: 'transfer',  secondary: 'share' },
  force:      { primary: 'transfer',  secondary: 'gate' },
  life:       { primary: 'transfer',  secondary: 'share' },
  aquatic:    { primary: 'transfer',  secondary: 'seed' },
  water:      { primary: 'transfer',  secondary: 'gate' },
  // --- it keeps time ---
  light:      { primary: 'alternate', secondary: 'transfer' },
  space:      { primary: 'alternate', secondary: 'share' },
  mind:       { primary: 'alternate', secondary: 'gate' },
  motion:     { primary: 'alternate', secondary: 'seed' },
  air:        { primary: 'alternate', secondary: 'share' },
  // --- it becomes the other thing ---
  identity:   { primary: 'share',     secondary: 'alias' },
  craft:      { primary: 'share',     secondary: 'seed' },
  earth:      { primary: 'share',     secondary: 'transfer' },
};

/** A stable pick between a family's two verbs. Seeded off the socket, like
 *  every other choice in this generator, so a reload does not reshuffle a
 *  player's build. */
export function verbForStone(stoneId, salt = '') {
  const s = STONE_CATALOG[stoneId];
  const row = s && STONE_VERBS[s.family];
  if (!row) return null;
  let h = 2166136261;
  const str = `${stoneId}|${salt}`;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (Math.abs(h) % 2) ? row.secondary : row.primary;
}

// ===========================================================================
// THE CONDITION A FAMILY DEALS IN -- DERIVED, NOT LISTED.
//
// A hand-written family -> condition table would be a thirtieth table to keep
// in step with `STONE_ELEMENTS`, and this project has now found the same drift
// four times (round 205's Sickle, round 206's alchemy). So the family's
// element comes from `STONE_ELEMENTS` and the condition is whichever authored
// affliction names that element, preferring a damage-over-time over a control.
//
// Frost is the one element with no affliction -- it has `freeze` (a control)
// and `wet` (an amplifier) -- so a cold essence seeds Frozen. That is correct
// rather than a gap: freezing something IS what cold does to it.
// ===========================================================================
export function signatureConditionFor(family) {
  const el = (STONE_ELEMENTS[family] || {}).element;
  if (!el) return null;
  // PRIMARY FIRST, and the first cut of this got it wrong in a way worth
  // recording. `elements` on a condition is a list, ordered, and the first
  // entry is what the condition IS -- `burn` is ['fire','radiant'], `holy` is
  // ['radiant']. Taking the first row that merely CONTAINS the element gave a
  // death essence [Poisoned] (because `poison` lists shadow second) and a
  // light essence [Burning] (because `burn` lists radiant second). Both are
  // conditions those elements can carry and neither is the one they are.
  const rows = Object.entries(DEBUFFS).filter(([, d]) => (d.elements || []).includes(el));
  if (!rows.length) return null;
  const primary = rows.filter(([, d]) => (d.elements || [])[0] === el);
  const pool = primary.length ? primary : rows;
  // `tags`, not `kind`: several conditions carry the affliction tag and no
  // `kind` at all (`shocked` is one), and a picker that read `kind` skipped
  // every one of them.
  const tagged = (t) => pool.find(([, d]) => (d.tags || []).includes(t));
  const pick = tagged('affliction') || tagged('control') || pool[0];
  return { key: pick[0], label: pick[1].label, element: el };
}

/** A family that deals this element, for the fallback in `resolveKitSynergy`.
 *  Read off `STONE_ELEMENTS` rather than listed, so it cannot drift from the
 *  table that assigns elements in the first place. */
export function familyForElement(element) {
  const want = element || 'physical';
  for (const [fam, row] of Object.entries(STONE_ELEMENTS)) {
    if (row && row.element === want) return fam;
  }
  return null;
}

/**
 * May an ability made of this element carry this condition?
 *
 * The condition's own `elements` list is the answer -- `burn` is
 * ['fire','radiant'], `bleed` is ['physical'] -- so the test is the same data
 * `signatureConditionFor` reads to pick the condition in the first place, and
 * the two cannot disagree about what a fire condition is.
 *
 * An ability with no element resolved is treated as physical, which is what
 * `DEFAULT_ELEMENT` in essenceLevers.js already calls the unmarked case.
 */
export function conditionFitsElement(cond, element) {
  if (!cond) return false;
  const def = DEBUFFS[cond.key];
  if (!def || !(def.elements || []).length) return true;
  return def.elements.includes(element || 'physical');
}

// ===========================================================================
// THE CLAUSE.
//
// The user, agreeing to spread the synergy across many abilities rather than
// one passive: "Spread around many abilities, I worry about the wording but
// it's the right way to build a truly fascinating ability engine."
//
// The worry is earned. Rounds 202, 204, 204b, 204c and 205 were every one of
// them a wording complaint, and every one was the same failure: a sentence
// that sounded like a mechanic and named none. So the guard here is
// STRUCTURAL, in the shape round 204c settled on -- a clause must name a
// condition the game can define and carry a figure -- and it is checked by
// `clauseFaults` over every clause the generator can produce, not by reading.
//
// THE BRACKETS ARE LOAD-BEARING. `abilityCard.js`'s `conditionsOf` resolves
// every `[Bracketed Label]` it finds in a description against the condition
// registry and prints the definition under the card. So a clause that names
// [Burning] explains itself for free, and one that says "sets them alight"
// does not. That is why the clause names the condition rather than describing
// it -- the blurb arrives anyway, one line further down, without being said
// twice.
// ===========================================================================

/** Words that sound like a mechanic and are not one. The clause guard refuses
 *  any of them outright -- there is no sentence this project wants that needs
 *  "synergises with". */
export const VAGUE_WORDS = [
  /\bsynerg\w*/i, /\benhanc\w*/i, /\bimprov\w*/i, /\bmore effective\b/i,
  /\bworks? (well )?with\b/i, /\bbenefits? from\b/i, /\bempower\w*\b/i,
  /\bboost\w*\b/i, /\bbetter\b/i, /\bstronger\b/i, /\bamplif\w*/i,
];

/**
 * One synergy clause, in the house voice.
 *
 * `spec` is {verb, sourceName, condition:{key,label}, chance, duration}.
 * The shape deliberately matches `debuffClause`'s arguments, because a seeded
 * condition is an ordinary condition and should read like one.
 */
export function clauseText(spec) {
  if (!spec || spec.verb !== 'seed' || !spec.condition) return '';
  const { condition, chance, duration } = spec;
  const forHow = duration ? ` for ${duration}s` : '';
  // ===== ROUND 206b -- THE CLAUSE DOES NOT ANNOUNCE ITSELF =================
  //
  // The user, on the shipped card: "Abilities don't call out the other
  // essences."
  //
  // Correct, and it deletes the whole problem I had been circling. The first
  // cut opened with the source essence's `phrase` ("Venomous patience runs in
  // it") and the second with its name ("From your Fire essence:"), and I had
  // been justifying both on the grounds that the player should be able to see
  // WHY their sword burns. They should -- but not from the ability, because no
  // ability in this game has ever referred to another essence and a card that
  // suddenly does reads as a different kind of object.
  //
  // The synergy is not a thing the ability is ADVERTISING. It is the reason
  // the ability came out the way it did. So the clause is now exactly the
  // sentence any other applied condition gets, indistinguishable from the
  // ability's own -- because it IS the ability's own.
  //
  // That also retires the wording risk this round was built around: there is
  // no synergy voice left to get wrong, only `debuffClause`'s, which has been
  // in service since round 57.
  return chance >= 1
    ? `It also leaves [${condition.label}]${forHow}.`
    : `Each hit has a ${Math.round(chance * 100)}% chance of [${condition.label}]${forHow}.`;
}

/** Every way a clause can be wrong, asserted over the clauses the generator
 *  can actually produce rather than over a sample somebody chose. */
export function clauseFaults(text) {
  const out = [];
  const t = String(text || '');
  if (!t) return ['the clause is empty'];
  // 1. It names a condition the card can define.
  if (!/\[[^\]]+\]/.test(t)) out.push(`names no condition: "${t}"`);
  // 2. It carries a figure, or states an absolute.
  // A figure, or an absolute. "It also leaves [Burning]" states a certainty,
  // which is a mechanic; "it burns them a bit" is the thing this refuses.
  if (!/\d/.test(t) && !/\bIt also leaves\b/.test(t)) out.push(`carries no figure: "${t}"`);
  // 3. It says why.
  // ROUND 206b -- it must NOT name another essence. The reverse of the rule
  // this line used to enforce; see `clauseText`.
  if (/\bessence\b/i.test(t)) out.push(`refers to another essence: "${t}"`);
  // 4. It is not vague.
  for (const re of VAGUE_WORDS) if (re.test(t)) out.push(`is vague (${re.source}): "${t}"`);
  // 5. It is not a comparative with nothing to compare to -- round 204c's rule,
  //    reused rather than restated so the two cannot drift.
  if (/\b(more|less|longer|shorter|faster) (than|again)\b/i.test(t)) {
    out.push(`compares to nothing: "${t}"`);
  }
  return out;
}

// ===========================================================================
// THE RESOLVER.
//
// For an ability belonging to essence E, in a socket holding stone S:
//
//   1. what does E WANT that another essence in the kit OFFERS?
//   2. what does S say to do about it?
//   3. can this particular ability carry that?
//
// Step 1 is the demand side on purpose. E's wants come from its levers -- the
// things it can actually pay off -- so a clause built on them is always
// something the essence could plausibly do. Driving it from the supply side
// instead would put a heal rider on an axe because something in the kit
// offered one.
// ===========================================================================

/** How many clauses one kit may carry. A kit is twenty abilities; every one of
 *  them wearing a synergy line would be a card wall and would make every build
 *  read the same. Six is a quarter of the kit -- enough that the engine is
 *  visible, few enough that a clause still means something when it appears. */
export const SYNERGY_CAP = 6;

/** Can this ability honestly carry a seeded condition? The same `requires`
 *  discipline the rank ladders use: an ability that never touches an enemy
 *  cannot apply one to them. */
export function canSeed(a) {
  if (!a || a.kind !== 'active') return false;
  if (a.synergy) return false;                 // one clause per ability
  // It has to land on something. `damages` is not a field, so this is the same
  // test `specTags` makes: an attack, or something that carries a debuff or a
  // dot already, which means it reaches a target.
  const reaches = a.category === 'attack' || !!a.debuff || !!a.dot
    || !!a.isAoe || (a.projectiles > 0) || !!a.requiresWeapon;
  if (!reaches) return false;
  // AND THE CARD MUST HAVE ROOM. Measured on the first cut: a Sword ability
  // already carrying [Raking Forepaws], a Decay dot and a Bleed rung took a
  // fourth condition from the sweep, and its card printed four affliction
  // definitions under four figures. That is not a synergy engine, it is a
  // wall -- and the user's whole worry about spreading clauses is that there
  // are more places for a bad card to appear.
  //
  // Two is the ceiling, counted off the FINISHED description rather than off
  // the fields, because a rank rung puts a condition on the card without
  // touching `debuff` or `dot` and the reader does not care which door it came
  // through.
  return conditionLoad(a) < 3;
}

/** How many conditions this ability's card already names. Counted off the
 *  FINISHED description rather than off the fields, because a rank rung puts a
 *  condition on the card without touching `debuff` or `dot` and the reader
 *  does not care which door it came through. */
export function conditionLoad(a) {
  const named = String((a && a.desc) || '').match(/\[[^\]]+\]/g) || [];
  const carried = new Set(named.map(x => x.toLowerCase()));
  if (a && a.debuff && a.debuff.key) carried.add(`[${a.debuff.key}]`.toLowerCase());
  if (a && a.dot && a.dot.label) carried.add(`[${a.dot.label}]`.toLowerCase());
  return carried.size;
}

/**
 * The clauses this kit earns.
 *
 * Returns a list of {key, verb, condition, sourceEssence, sourceName, chance,
 * duration, text}. Pure: it reads the kit and returns a plan, and the caller
 * stamps it. That split is deliberate -- it means the plan can be measured by
 * a probe without generating a kit twice.
 */
export function resolveKitSynergy(known, essenceIds, opts = {}) {
  const ids = (essenceIds || []).filter(Boolean);
  if (ids.length < 2) return [];
  const cache = {}; for (const id of ids) cache[id] = tokensFor(id);
  const out = [];
  // THE EMPTIEST CARDS FIRST, then stable by key.
  //
  // Refusing a crowded ability outright was the first cut, and it cost too
  // much: measured, coverage fell from 38% of kits to 23% because most attack
  // abilities already carry one condition from the 40% debuff roll. Sorting
  // instead of refusing keeps the coverage and still puts the clause where
  // there is room for it -- a clean ability gains a second condition before a
  // busy one gains a third, and `canSeed` still refuses at three.
  //
  // Deterministic either way: the tiebreak is the socket key, so the same kit
  // resolves the same way every time it is rebuilt, which is the rule every
  // pick in this generator follows.
  const entries = Object.entries(known || {}).sort((x, y) => {
    const d = conditionLoad(x[1] && x[1].ability) - conditionLoad(y[1] && y[1].ability);
    return d || (x[0] < y[0] ? -1 : 1);
  });
  for (const [key, ent] of entries) {
    if (out.length >= (opts.cap || SYNERGY_CAP)) break;
    const a = ent && ent.ability;
    if (!a || !a.essenceId || !ids.includes(a.essenceId)) continue;
    // The admission test that is common to every verb. `canSeed`'s extra
    // conditions -- it must REACH something, and the card must have room --
    // are seed's own and are checked on that branch.
    if (a.kind !== 'active' || a.synergy) continue;
    const verb = verbForStone(a.stoneId, key);
    if (!verb || !WIRED.has(verb)) continue;
    if (verb === 'gate') {
      const plan = planGate(a, key, ids, cache);
      if (plan) out.push(plan);
      continue;
    }
    // ROUND 213 -- the three that were pending. Each returns null rather than
    // forcing a clause, so an ability whose kit cannot support the verb
    // simply gets none; the `share` verb is handled entirely in the
    // confluence layer and never reaches here.
    if (verb === 'alias') {
      const plan = planAlias(a, key, ids, cache, out);
      if (!plan) continue;
      // AN ALIAS SHIPS WITH ITS READER.
      //
      // Measured before this existed: 5 kits in 300 got an alias and NONE of
      // them held a gate that read the element it lent. The verb was wired,
      // stamped, described on the card and completely inert -- the player
      // told their bleed counts as burning and not one ability of theirs
      // caring. That is exactly the fault the round-206 note said `alias` was
      // being held back to avoid, arriving anyway because I checked that the
      // code ran instead of checking that the loop closed.
      //
      // The cause is structural rather than unlucky: SYNERGY_CAP is small, so
      // two plans landing in one kit AND agreeing on an element is a
      // coincidence the generator has no reason to produce. So the alias
      // plans its own reader -- a condition gate on the element it lends,
      // placed on another ability in the same kit. Two of the cap's slots for
      // one sentence that means something, which is the right trade: an
      // inert clause costs a slot too, and lies.
      const reader = planAliasReader(plan, entries, ids, cache, out, key);
      if (!reader) continue;
      out.push(plan);
      if (out.length < (opts.cap || SYNERGY_CAP)) out.push(reader);
      continue;
    }
    if (verb === 'transfer') {
      const plan = planTransfer(a, key, ids, cache);
      if (plan) out.push(plan);
      continue;
    }
    if (verb === 'alternate') {
      const plan = planAlternate(a, key, ids, cache);
      if (plan) out.push(plan);
      continue;
    }
    if (verb !== 'seed') continue;
    if (!canSeed(a)) continue;
    // Which other essence in the kit supplies something this one can use?
    for (const other of ids) {
      if (other === a.essenceId) continue;
      const tokens = edgesFrom(other, a.essenceId, cache);
      // A token that IS a condition. `dot` and `control` both are -- an
      // essence that offers a hold lends its hold, and Frozen is as much a
      // condition as Bleeding. The other tokens are real edges and they are
      // what the four unwired verbs will read; seeding on `strike` or `move`
      // would be a clause about a condition nobody named.
      if (!tokens.some(t => t === 'dot' || t === 'control' || t.startsWith('dot:'))) continue;
      // THE SOURCE ESSENCE FIRST, THE ABILITY'S OWN ELEMENT AS THE FALLBACK.
      //
      // Strictly vetoing anything the ability's element could not carry was
      // the first answer to the user's Cloth-stone note, and it was correct
      // and nearly useless: coverage fell from 35.7% of kits to 16.3% and the
      // seeded condition came out 72% [Bleeding], because physical dominates
      // both catalogues and [Burning] needs a fire-element ability to land on.
      //
      // The user's own framing is what fixes it: "The intent of my examples
      // isn't to overwrite the awakening stones combination with essences but
      // to help provide guidance." So the source essence GUIDES -- its
      // condition is taken when the ability can carry it -- and the ability's
      // own element, which is the stone's doing, DECIDES when it cannot. The
      // clause always fits the stone; the essence colours it wherever the two
      // agree.
      const fam = (ESSENCE_CATALOG[other] || {}).family;
      let cond = signatureConditionFor(fam);
      if (cond && !conditionFitsElement(cond, a.element)) {
        cond = signatureConditionFor(familyForElement(a.element));
      }
      if (!cond || !conditionFitsElement(cond, a.element)) continue;
      // ===== ROUND 206b -- AND THE STONE HAS TO AGREE =====================
      //
      // The user, on a shipped card reading "Awakening stone: Cloth" and
      // granting [Burning]:
      //
      //   "Its a good ability but it still needs to roll off of the right
      //    awakening stone. The intent of my examples isn't to overwrite the
      //    awakening stones combination with essences but to help provide
      //    guidance."
      //
      // The first cut took the condition from the other essence and never
      // asked what the ability was made of, so a Cloth stone set people on
      // fire. The essence edge is the PERMISSION -- the reason this ability
      // gets an extra condition at all -- and the ability's own element is the
      // veto.
      //
      // `a.element` rather than the stone's family element, because that is
      // the field `materialFor(stone, essence)` already resolved for this
      // socket and it is what every other part of the ability is built from.
      // Asking the stone again here would be a second opinion about a fact
      // that already has one.
      if (!conditionFitsElement(cond, a.element)) continue;
      // Already applying it? Then the clause would be the card telling the
      // player twice -- fault class 4, one ability offered twice.
      if (a.debuff && a.debuff.key === cond.key) continue;
      if (a.dot && String(a.dot.label || '').toLowerCase() === cond.label.toLowerCase()) continue;
      const src = ESSENCE_CATALOG[other];
      // Seeded off the ability and the pair, so the figures are stable and two
      // abilities in one kit do not come out identical.
      let h = 2166136261;
      const s = `${key}|${other}|seed`;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      const r = Math.abs(h);
      const chance = 0.25 + (r % 4) * 0.05;          // 25% .. 40%
      const duration = 4 + ((r >> 3) % 5);           // 4s .. 8s
      const spec = { key, verb: 'seed', condition: cond, sourceEssence: other,
        sourceName: src.name, chance, duration };
      spec.text = clauseText(spec);
      out.push(spec);
      break;   // one clause per ability
    }
  }
  return out;
}

/**
 * ROUND 207 -- a gate plan for one ability.
 *
 * Which gate, which payload and how much are all seeded off the SOCKET, which
 * is what makes the user's "flex" real:
 *
 *   "Reminder that the 7 sins should each be able to flex in a lot of ways
 *    depending on essence build and awakening stones."
 *
 * A Sin essence always speaks in sins -- the RULE is the identity and does not
 * move -- but a Sloth ability off one stone is cheaper while you stand still
 * and off another hits harder, and both are Sloth. Everything else draws its
 * gate from the whole table.
 *
 * THE GATE MUST BE ONE THE ABILITY CAN MEET. A loadout rule on a spell that
 * needs no weapon, or a target rule on something that never reaches one, is a
 * clause that can never pay -- round 204's rule 2, in a new place.
 */
function planGate(a, key, ids, cache) {
  // Does another essence in the kit connect at all? The gate is still a
  // SYNERGY: with no edge this is a conditional bonus, and every ability in
  // the game would grow one.
  const partner = ids.find(o => o !== a.essenceId && edgesFrom(o, a.essenceId, cache).length);
  if (!partner) return null;

  let h = 2166136261;
  const seed = `${key}|${a.stoneId || ''}|gate`;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = Math.abs(h);

  const sinner = [a.essenceId, ...ids].some(e => SIN_ESSENCES.has(e));
  let gate, sin = null;
  if (sinner) { sin = SIN_KEYS[r % SIN_KEYS.length]; gate = SINS[sin].gate; }
  else { gate = GATE_KEYS[r % GATE_KEYS.length]; }
  if (!gateSuitsAbility(gate, a)) return null;

  const effect = EFFECT_KEYS[(r >> 5) % EFFECT_KEYS.length];
  // ROUND 269 -- "it deals N% more" on an ability that deals nothing is a
  // sentence with nothing behind it (see transferHasDamage).
  if (effect === 'damage' && !transferHasDamage(a)) return null;
  // A gate is a CONDITION, so it pays better than an unconditional rider --
  // that is the trade. The band is the user's own examples: 15% for the
  // two-weapon rule, 50% for the full-health one.
  const pct = [0.15, 0.2, 0.25, 0.35, 0.5][(r >> 11) % 5];
  const spec = { key, verb: 'gate', gate, effect, pct, sin, sourceEssence: partner };
  spec.text = gateClauseText(spec);
  return spec.text ? spec : null;
}

// ===========================================================================
// ROUND 213 -- THE THREE THAT WERE PENDING.
//
// Each follows planGate's shape exactly: take the ability and the kit, return
// a spec with its own `text` or return null. The three differ only in what
// they need from the runtime, and that is what kept them waiting.
//
// A note on the clause voice, which round 206b settled and this round does
// not get to re-open: the clause is indistinguishable from anything else the
// card says. It does not name the other essence, it does not announce that a
// synergy happened, and it does not use the word "synergy". The player is
// told what the ability does; the reason it does it is the build.
// ===========================================================================

/** The element an ability actually deals in. */
function elementOf(a) {
  return (a && a.element) || 'physical';
}

/**
 * The element a partner essence deals in -- but only if it is a partner at
 * all.
 *
 * Two different questions, and the first cut of this round conflated them.
 * It read `edgesFrom(other, self)` looking for a `dot:` token and took the
 * suffix as an element, which is wrong twice over: `dot:bleed` names a
 * CONDITION, not an element ("bleed" is not in ELEMENT_KEYS), and `offers` is
 * a Set rather than an object so the lookup found nothing either way. All
 * three new verbs planned exactly zero abilities across 250 kits and reported
 * no fault while doing it -- the quiet kind of wrong, caught only by
 * measuring output rather than asking whether the code ran.
 *
 * So: the EDGE decides whether these two essences are connected (without it
 * this is a flat bonus, not a synergy), and the partner's own `el:` token
 * decides which element it lends.
 */
function partnerElement(other, self, cache) {
  if (!edgesFrom(other, self, cache).length) return null;
  const offers = (cache[other] && cache[other].offers) || new Set();
  for (const t of offers) {
    if (typeof t === 'string' && t.startsWith('el:')) {
      const el = t.slice(3);
      if (ELEMENT_KEYS.includes(el)) return el;
    }
  }
  return null;
}

/**
 * ALIAS -- "makes one condition count as another".
 *
 * The user: "make bleeding count as burning for the purpose of other
 * abilities who do more damage to burning enemies."
 *
 * So the ability's own condition is ALSO written onto the target as a second
 * element, and the three condition gates added this round are what read it.
 * That closes the loop the round-206 note said was missing: until a gate
 * could ask what a target was suffering, an alias was a field written by one
 * side and read by none.
 *
 * It refuses when the two elements are the same -- an alias from fire to fire
 * is a sentence that promises something and changes nothing.
 */
function planAlias(a, key, ids, cache, sofar) {
  if (!a.debuff && !a.dot) return null;          // nothing to alias
  const mine = elementOf(a);
  // PREFER AN ELEMENT THIS KIT ALREADY GATES ON.
  //
  // An alias whose element nothing in the kit reads is technically wired and
  // practically inert -- the player is told their bleed counts as burning and
  // no ability of theirs cares. So the first choice is an element a gate
  // already planned in THIS kit asks about, which closes the loop on purpose
  // rather than by luck. The partner's own element is the fallback, because a
  // kit that gates on nothing should still get the sentence its stone earned.
  const gated = new Set((sofar || [])
    .filter(pl => pl.verb === 'gate' && SYNERGY_GATES[pl.gate] && SYNERGY_GATES[pl.gate].element)
    .map(pl => SYNERGY_GATES[pl.gate].element));
  let to = null;
  for (const el of gated) if (el !== mine) { to = el; break; }
  if (!to) {
    for (const other of ids) {
      if (other === a.essenceId) continue;
      const el = partnerElement(other, a.essenceId, cache);
      if (el && el !== mine && GATE_ELEMENTS.includes(el)) { to = el; break; }
    }
  }
  if (!to) return null;
  const spec = { key, verb: 'alias', from: mine, to, sourceEssence: null };
  spec.text = aliasClauseText(spec);
  return spec.text ? spec : null;
}

/** Only the elements a gate can actually ask about. An alias onto an element
 *  nothing reads is the fault this verb waited five rounds to avoid. */
export const GATE_ELEMENTS = Object.values(SYNERGY_GATES)
  .filter(g => g.kind === 'condition' && g.element)
  .map(g => g.element);

export function aliasClauseText(spec) {
  if (!spec || spec.verb !== 'alias' || !ELEMENT_ADJ[spec.to]) return '';
  return `Whatever it leaves on a target counts as ${ELEMENT_ADJ[spec.to]} as well.`;
}

/**
 * The gate an alias exists to be read by.
 *
 * Picks another ability in the same kit -- not already synergised, and one
 * the gate can actually apply to -- and points a condition gate at the
 * element the alias lends. Returns null when the kit has nobody to read it,
 * and `resolveKitSynergy` then drops the alias too, because half of this
 * pair is worse than neither.
 */
function planAliasReader(alias, entries, ids, cache, sofar, aliasKey) {
  const gateKey = Object.keys(SYNERGY_GATES)
    .find(k => SYNERGY_GATES[k].kind === 'condition' && SYNERGY_GATES[k].element === alias.to);
  if (!gateKey) return null;
  const taken = new Set(sofar.map(pl => pl.key));
  for (const [key, ent] of entries) {
    if (key === aliasKey || taken.has(key)) continue;
    const b = ent && ent.ability;
    if (!b || b.kind !== 'active' || b.synergy) continue;
    if (!ids.includes(b.essenceId)) continue;
    if (!gateSuitsAbility(gateKey, b)) continue;
    let h = 2166136261;
    const seedStr = `${key}|${b.stoneId || ''}|aliasreader`;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    const r = Math.abs(h);
    const effect = EFFECT_KEYS[r % EFFECT_KEYS.length];
    if (effect === 'damage' && !transferHasDamage(b)) continue;   // ROUND 269
    const pct = [0.15, 0.2, 0.25, 0.35, 0.5][(r >> 11) % 5];
    const spec = { key, verb: 'gate', gate: gateKey, effect, pct, sin: null,
      sourceEssence: b.essenceId, fromAlias: true };
    spec.text = gateClauseText(spec);
    if (spec.text) return spec;
  }
  return null;
}

/**
 * TRANSFER -- "lends a bonus from one thing to another".
 *
 * The user: "fire damage buffs affect cold damage."
 *
 * There is exactly one place in the scene where an element-scoped damage
 * bonus is read -- `_statBuff('dmg_<element>')` -- so the whole verb is that
 * one function knowing about this one map. Anything that raises the lent-from
 * element raises the lent-to one with it, at full value: a partial transfer
 * would need a number nobody has chosen and would read as a tax.
 */
// ROUND 269 (item 6) -- "Anything that raises your physical damage raises
// this with it" printed on Glint Barrier, an immunity with no damage in it,
// and on heals, barriers and armour buffs. The transfer is read at exactly one
// place, the element-scoped damage bonus, so on an ability that deals nothing
// it is a sentence with nothing behind it. It goes where there is damage to
// raise: a figure (`base`), a damage-over-time, or a weapon strike.
function transferHasDamage(a) {
  return (typeof a.base === 'number' && a.base > 0) || !!(a.dot && a.dot.dmgPerTick)
    || !!a.requiresWeapon || /Strike$/.test(a.template || '') || a.template === 'breathCone';
}

function planTransfer(a, key, ids, cache) {
  if (!transferHasDamage(a)) return null;
  const mine = elementOf(a);
  let from = null;
  for (const other of ids) {
    if (other === a.essenceId) continue;
    const el = partnerElement(other, a.essenceId, cache);
    if (el && el !== mine) { from = el; break; }
  }
  if (!from) return null;
  const spec = { key, verb: 'transfer', from, to: mine, sourceEssence: null };
  spec.text = transferClauseText(spec);
  return spec.text ? spec : null;
}

export function transferClauseText(spec) {
  if (!spec || spec.verb !== 'transfer' || !spec.from || !spec.to) return '';
  if (spec.from === spec.to) return '';
  return `Anything that raises your ${spec.from} damage raises this with it.`;
}

/**
 * ALTERNATE -- "pays for rotating between two poles".
 *
 * The user: "make rotating between sun and moon beneficial."
 *
 * Two elements, and using one straight after the other pays. The pole pair is
 * the ability's own element and a partner's, so the rotation is something the
 * kit can actually perform -- a pair drawn from elements the player has no
 * abilities in would be a rule they could never satisfy.
 *
 * The bonus band is deliberately below the gate band (15-50%): a gate asks
 * for a condition that may simply be true, while this asks the player to
 * order their casts, which they can always do. Paying it like a gate would
 * make rotation strictly correct rather than a choice.
 */
function planAlternate(a, key, ids, cache) {
  const mine = elementOf(a);
  let other = null;
  for (const id of ids) {
    if (id === a.essenceId) continue;
    const el = partnerElement(id, a.essenceId, cache);
    if (el && el !== mine) { other = el; break; }
  }
  if (!other) return null;
  let h = 2166136261;
  const seedStr = `${key}|${a.stoneId || ''}|alternate`;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  const pct = [0.1, 0.12, 0.15, 0.2][Math.abs(h) % 4];
  const spec = { key, verb: 'alternate', poles: [other, mine], pct, sourceEssence: null };
  spec.text = alternateClauseText(spec);
  return spec.text ? spec : null;
}

export function alternateClauseText(spec) {
  if (!spec || spec.verb !== 'alternate' || !spec.poles || spec.poles.length !== 2) return '';
  if (spec.poles[0] === spec.poles[1]) return '';
  if (!(spec.pct > 0)) return '';
  return `Used straight after a ${spec.poles[0]} strike, it hits ${Math.round(spec.pct * 100)}% harder.`;
}

/** Which essences speak in sins. Named rather than derived: Sin is the only
 *  essence whose identity IS a rule set, and the user said so directly --
 *  "Sin is about transgression. Debuffs that punish for breaking set rules." */
export const SIN_ESSENCES = new Set(['essSin']);

/** Can this ability ever meet this gate? */
export function gateSuitsAbility(gateKey, a) {
  const g = SYNERGY_GATES[gateKey];
  if (!g || !a) return false;
  if (g.kind === 'loadout') {
    if (gateKey === 'twoWeapons') return !!a.requiresWeapon || a.category === 'attack';
    if (gateKey === 'emptyHanded') return !a.requiresWeapon;
  }
  // ROUND 269 -- a CONDITION gate is a target gate too: "against a target that
  // is already bleeding" needs a target. Glint Barrier, an immunity on
  // yourself, carried exactly that sentence (planted by the alias reader).
  if (g.kind === 'target' || g.kind === 'condition') {
    return a.category === 'attack' || !!a.debuff || !!a.dot || !!a.isAoe
      || (a.projectiles > 0) || !!a.requiresWeapon;
  }
  return true;
}

// ===========================================================================
// FAULTS.
// ===========================================================================

/**
 * The verbs that are in the table and that nothing reads yet.
 *
 * SEPARATE FROM `synergyFaults` on purpose. The first cut had this as a fault
 * entry, which meant the fault list was never empty -- and a fault list that
 * always has something in it is a fault list nobody reads, which is how the
 * real one gets lost. This is a standing note the suite prints and asserts the
 * CONTENTS of, so a verb cannot be quietly forgotten between rounds and cannot
 * be quietly added either.
 */
/**
 * ROUND 213 -- THE ASSERTION THIS ROUND EXISTS FOR.
 *
 * `synergyFaults` is static: it reads tables. But the thing that went wrong
 * with `alias` was not in a table -- every table was correct, every field was
 * stamped, and the verb still did nothing, because no kit ever held both the
 * alias and something that read it. A static check cannot see that.
 *
 * So this takes a POPULATION, the way `kitBudgetFaults` does, and asserts the
 * property the verbs exist for: every wired verb must appear, and every
 * alias must ship with a gate that reads the element it lends.
 *
 * `samples` is `[{ plans: [spec] }]` -- one entry per built kit.
 */
export function synergyPopulationFaults(samples) {
  const out = [];
  if (!samples || !samples.length) return out;
  const seen = {};
  let aliasKits = 0, closed = 0;
  for (const { plans } of samples) {
    const byVerb = {};
    for (const pl of (plans || [])) {
      seen[pl.verb] = (seen[pl.verb] || 0) + 1;
      (byVerb[pl.verb] = byVerb[pl.verb] || []).push(pl);
    }
    if (!byVerb.alias) continue;
    aliasKits++;
    const gated = new Set((byVerb.gate || [])
      .map(pl => (SYNERGY_GATES[pl.gate] || {}).element).filter(Boolean));
    if (byVerb.alias.every(pl => gated.has(pl.to))) closed++;
  }
  // A WIRED VERB THAT NEVER PLANS ANYTHING is the fault class this file was
  // written to avoid, and `WIRED` alone cannot catch it: adding a verb to the
  // set is a one-line claim, and the first cut of round 213's three planned
  // exactly zero abilities across 250 kits while reporting no fault at all.
  for (const v of WIRED) {
    if (v === 'share') continue;          // the confluence layer, not this one
    if (!seen[v]) out.push(`${v} is wired and plans nothing across ${samples.length} kits`);
  }
  // ...and an alias without a reader is a sentence that lies to the player.
  if (aliasKits && closed < aliasKits) {
    out.push(`${aliasKits - closed} of ${aliasKits} kits alias onto an element nothing in the kit reads`);
  }
  return out;
}

export function synergyPending() {
  return Object.keys(VERBS).filter(v => !WIRED.has(v));
}

export function synergyFaults() {
  const out = [];

  // --- every stone family has a verb row -------------------------------
  const families = new Set(Object.values(STONE_CATALOG).map(s => s.family));
  for (const f of families) {
    if (!STONE_VERBS[f]) { out.push(`stone family ${f} has no verb row`); continue; }
    const { primary, secondary } = STONE_VERBS[f];
    if (!VERBS[primary]) out.push(`${f} leans on ${primary}, which is not a verb`);
    if (!VERBS[secondary]) out.push(`${f} falls back on ${secondary}, which is not a verb`);
    if (primary === secondary) out.push(`${f} has the same verb twice`);
  }
  for (const f of Object.keys(STONE_VERBS)) {
    if (!families.has(f)) out.push(`${f} has a verb row and no stones`);
  }

  // --- every verb is reachable -----------------------------------------
  const used = new Set(Object.values(STONE_VERBS).flatMap(v => [v.primary, v.secondary]));
  for (const v of Object.keys(VERBS)) if (!used.has(v)) out.push(`nothing leans on ${v}`);

  // --- every family can name a condition --------------------------------
  // A family whose element has no condition cannot be seeded from, which would
  // make it a silent passenger in every kit it joins.
  for (const f of families) {
    if (!STONE_ELEMENTS[f]) continue;
    if (!signatureConditionFor(f)) out.push(`${f} deals ${STONE_ELEMENTS[f].element} and no condition names it`);
  }

  // --- the wording, over every clause the generator can produce ---------
  // Not a sample: every family pair, at both ends of the figure ranges.
  let checked = 0;
  for (const f of families) {
    const cond = signatureConditionFor(f);
    if (!cond) continue;
    for (const chance of [0.25, 0.4, 1]) {
      for (const duration of [0, 4, 8]) {
        const text = clauseText({ verb: 'seed', sourceName: 'Probe', condition: cond, chance, duration });
        for (const bad of clauseFaults(text)) out.push(`clause: ${bad}`);
        checked++;
      }
    }
  }
  if (!checked) out.push('no clause was checked; the wording guard is asserting nothing');

  return out;
}
