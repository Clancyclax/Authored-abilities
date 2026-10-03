// ============================================================================
// ROUND 57 -- DEBUFFS, AND THE FACT THAT THEY REACH THE PLAYER
//
// The user's ask, verbatim:
//
//   "Debuffs need to affect the player.
//    We should have debuffs for all of the following with a chance to roll on
//    abilities (as thematically appropriate) and Monsters should have these as
//    well. (Also as thematically appropriate. I.E. Spiders slowing through webs
//    and poisoning, ice monsters freezing players, fire monsters burning
//    players)"
//
// Nineteen of them, listed by name. This file is the whole catalogue, and it is
// deliberately ONE table read by four different consumers:
//
//   - the runtime, applying them to the player     (WorldScene._applyDebuff)
//   - the runtime, applying them to monsters       (same function, same table)
//   - the generator, rolling them onto abilities   (awakening.js)
//   - the monster roster, carrying them thematically (monsterDebuffs.js)
//
// The single table is the point. Round 56 shipped `spellReflect` as a number on
// the player and a different number on the ability, and the two only agreed
// because one person wrote both in one afternoon. A debuff has to mean the same
// thing whichever side of the fight is carrying it, or the reflect that bounces
// one back becomes a lie.
//
// WHY THE PLAYER SIDE IS THE HARD HALF
//
// Monsters have carried afflictions since round 44. What did not exist was any
// route by which a monster's blow left something ON the player -- which is why
// round 56 refused to build debuff reflect and said so:
//
//   "Debuff reflect was deliberately NOT built -- verified the player carries
//    no debuffs at all, so there is nothing to reflect."
//
// That is now false, which is what makes the third item of this round possible.
// ============================================================================

import { ELEMENT_TYPES, DAMAGE_TYPE_KEYS } from './stats.js';

// ===========================================================================
// ROUND 105 -- TAGS REPLACE `kind`.
//
// The user's model, from the books, and their instruction when asked whether
// tags should sit alongside `kind` or replace it: replace it.
//
//     [Bleeding]        (affliction, wounding, blood)
//     [Leech Toxin]     (affliction, poison, blood, stacking)
//     [Ruination of the Spirit]  (damage-over-time, curse, stacking)
//
// A single `kind` could not express any of those. It said what the runtime
// should DO and nothing about what the condition IS, so there was no way to
// ask "is this poison" -- and without that question there is no cleansing,
// which is why the game has never had any. Three identical necrotic
// damage-over-time effects that need three DIFFERENT cleanses is the whole
// point of the Ruination example, and it is the thing one enum cannot say.
//
// TWO KINDS OF TAG, and keeping them apart is what stops this becoming a bag
// of strings:
//
//   BEHAVIOURAL  the runtime dispatches on these. A condition with several
//                does several things -- which is the expressiveness `kind`
//                was costing us.
//   CLEANSING    these carry NO behaviour. They exist so something can be
//                named as the thing that removes it.
//
// A condition may carry any number of each.
// ===========================================================================
// ROUND 113 -- the user's affliction library. debuffs.js may depend on it and
// not the other way round: afflictions.js is generated data with no imports of
// its own, which is what keeps this file free of the awakening.js dependency
// its own note above insists on.
import { AFFLICTIONS } from './afflictions.js';

export const TAG = {
  // --- behavioural ---------------------------------------------------------
  affliction: 'affliction',   // ongoing damage on a tick
  dot: 'damage-over-time',    // ongoing damage that runs until cleansed
  wounding: 'wounding',       // absorbs incoming healing, then ends
  stacking: 'stacking',       // instances accumulate cumulatively
  control: 'control',         // takes movement or action; DR applies
  rate: 'rate',               // scales one existing rate down
  attribute: 'attribute',     // lowers one of the four major attributes
  amplify: 'amplify',         // changes how much of something else lands
  drain: 'drain',             // ongoing transfer to whoever applied it
  // ROUND 105 -- takes ABILITIES away rather than stats. The first tag whose
  // effect is on what the carrier can do at all, and the reason it is its own
  // tag rather than a flag on `control`: a stun stops you for a second and a
  // suppression stops your KIT, and a cleanse that answers one should not
  // silently answer the other.
  suppress: 'suppress',
  // --- cleansing -----------------------------------------------------------
  poison: 'poison',
  disease: 'disease',
  curse: 'curse',
  blood: 'blood',
  unholy: 'unholy',
  holy: 'holy',
  frost: 'frost',
  burning: 'burning',
  shock: 'shock',
  // ROUND 283 -- the user's legendaries name it: "(affliction, magic,
  // stacking)". A handle like the other cleansing tags; not in CLEANSE_TAGS,
  // so no generated cleanse picks it until one is written to.
  magic: 'magic',
};
/** The behavioural half, as a set -- the runtime dispatches on exactly these. */
export const BEHAVIOUR_TAGS = [TAG.affliction, TAG.dot, TAG.wounding, TAG.stacking,
  TAG.control, TAG.rate, TAG.attribute, TAG.amplify, TAG.drain, TAG.suppress];
/** The cleansing half. A cleanse names one of these; nothing here does anything
 *  on its own, which is the point -- they are handles, not behaviour. */
export const CLEANSE_TAGS = [TAG.poison, TAG.disease, TAG.curse, TAG.blood,
  TAG.unholy, TAG.holy, TAG.frost, TAG.burning, TAG.shock];
/** Does this condition carry that tag? One predicate, so the runtime, the
 *  generator and the suite can never disagree about what counts. */
export function hasTag(def, tag) {
  return !!(def && def.tags && def.tags.includes(tag));
}

/**
 * ROUND 221 -- CONDITIONS NOTHING INFLICTS, derived rather than listed.
 *
 * Two of this table's rows are not things one creature does to another, and
 * test_round57 has two checks that would otherwise demand they be: "every
 * debuff is carried by some monster" and "every authored mechanic is still
 * reachable by some ability". Both are good checks -- they are how this
 * project finds a condition the player can read about and never meet -- and
 * both need to know about the exception.
 *
 *   [Resistant] HELPS its carrier. It lives in this table because
 *   [Vulnerable] trades against it by key, and a condition split across two
 *   tables is the hand-maintained pair this project keeps finding broken.
 *
 *   [Pinned] is a TECHNIQUE'S condition, earned at silver on a mastery line
 *   (see MASTERY_TECHNIQUES). A generator or a monster that could also
 *   produce it would make the rung worth nothing.
 *
 * DERIVED, exactly as round 201 derived the companions rather than listing
 * them: a list of exceptions beside a table of conditions is two things that
 * have to agree, and this file has the scar tissue.
 */
export function uninflictedConditions() {
  // ROUND 232 -- and `familiarOnly`, which is the third reason a row in this
  // table is not something a monster does to you.
  //
  // [Harbinger of Doom] belongs to a summoned familiar's orbs, and the
  // direction matters: it turns an ENEMY into a butterfly factory whose
  // butterflies then go after that enemy's neighbours. On the player it would
  // be a gift -- leak some mana, gain a flock of attackers -- which is the
  // opposite of an affliction, so there is no sensible monster carrier for it.
  // Derived from the row exactly as `techniqueOnly` is for [Pinned], and for the
  // identical reason round 221 gave: a generator or a monster that could also
  // produce it would make the thing that grants it worth nothing.
  // ROUND 238 -- and `tailOnly`, which is the fourth reason, and the first one
  // that is about HOW a condition arrives rather than about who benefits.
  //
  // [Spent] is [Hero's Moment]'s bill. It is not helpful -- it is the inverse of
  // the largest boon in the game and it hurts exactly as much as the boon helped
  // -- so the `helpful` exemption cannot cover it, and it is not a technique's or
  // a familiar's either. Nothing inflicts it: the ONLY way it can ever be
  // applied is `inverseOnExpiry` firing when the boon that owes it lapses.
  //
  // Giving it a monster carrier to satisfy the reachability check would have
  // been the wrong repair and an instructive one: the check exists to find
  // conditions the player can read about and never meet, and [Spent] is one
  // every player WILL meet, from the one source that can produce it. A carrier
  // would have made the checker green by making the game wrong.
  // ROUND 283 -- and `itemOnly`: [Spell Impetus] and [Mana Siphon] are what
  // two legendary weapons do. A monster or a generated ability that could
  // also put them on a target would make the weapons worth nothing.
  return Object.keys(DEBUFFS).filter(k => DEBUFFS[k].helpful
    || DEBUFFS[k].techniqueOnly || DEBUFFS[k].familiarOnly || DEBUFFS[k].tailOnly || DEBUFFS[k].itemOnly);
}

/**
 * ROUND 221 -- CONDITIONS THAT BELONG TO A CANON ABILITY.
 *
 * The four transcribed from [Blade of Doom] that carry a mechanic no
 * authored affliction shares. test_round57's reachability check asks whether
 * the ability generator can surface every mechanic in this table, and the
 * answer for these is no -- and the reason is structural rather than a gap:
 * `assignAbilityDebuff` prefers the essence's NAMED affliction pool and only
 * falls back to this table when there isn't one, and since round 113 there
 * almost always is. The same is already true of `slowAttack`, `curse` and
 * `unholy`, which that suite lists by hand as AUTHORED_ONLY.
 *
 * They are not write-only, which is the thing that would actually be wrong:
 * monsters carry all four (the shadow channel and the shade), so the player
 * MEETS them, cleanses them, and learns what the three Ruinations cost. What
 * is still missing is a route by which the player INFLICTS them, and the
 * honest place for that is an ability -- [Blade of Doom] is transcribed in
 * abilityCanon.js and is not yet something a kit can roll.
 *
 * Written down as a field on the rows rather than as four names in a suite,
 * for the reason round 201 derived the companions the same way: a list of
 * exceptions beside a table of conditions is two things that have to agree.
 */
export function canonConditions() {
  return Object.keys(DEBUFFS).filter(k => DEBUFFS[k].canonOf);
}

// ===========================================================================
// ROUND 201 -- CONDITIONS THAT LOCK OTHER THINGS. The user's two canon
// afflictions, transcribed:
//
//   [Sin] (affliction, curse, stacking): All necrotic damage taken is
//   increased. Additional instances have a cumulative effect.
//
//   [Mark of Sin] (affliction, holy): Prevents aura retraction. Cannot be
//   cleansed while target retains any instances of [Sin] or [Legacy of Sin].
//
// [Sin] needed nothing new -- `ampTypes` has amplified a named damage type
// since round 105 and `stacking` has been cumulative since round 57. Writing
// it out was a matter of authoring a row.
//
// [Mark of Sin] needed three things that did not exist, and all three are the
// same SHAPE: a condition whose removal or whose effect is conditional on
// another condition still being present. That is why they are one mechanism
// with three fields rather than three mechanisms:
//
//   lockAura          while this is on you, you cannot pull your aura in
//   cleanseLockedBy   a list of condition keys; while the carrier holds ANY of
//                     them, no cleanse or dispel may take this off
//   healLockedBy      the same list, for healing: the brand cannot be healed
//                     ("The brand cannot be healed so long as the target
//                      retains any instances of [Sin]")
//
// THE LOCK IS CHECKED AGAINST THE CARRIER'S OWN CONDITION MAP, not against a
// global. Two different targets branded by the same caster lock and unlock
// independently, which is what "so long as THE TARGET retains" says.
//
// AND THE LOCK IS ESCAPABLE, which is the design point rather than a
// concession: strip the [Sin] stacks and the mark comes off. A lock with no
// door is a condition the player can only wait out, and waiting is not play.
// ===========================================================================

/** The condition-lock fields, named once so the composer's passthrough list,
 *  the runtime and the suite cannot drift apart. */
export const CONDITION_LOCKS = ['lockAura', 'cleanseLockedBy', 'healLockedBy'];

/** Is `def`'s lock currently held shut by something `carrier` has? `field` is
 *  'cleanseLockedBy' or 'healLockedBy'. A condition with no such list is never
 *  locked, so this is a no-op for every condition written before round 201. */
export function lockHeldBy(def, carrier, field) {
  const need = def && def[field];
  if (!Array.isArray(need) || !need.length) return null;
  const map = (carrier && carrier.debuffs) || null;
  if (!map) return null;
  for (const k of need) {
    const inst = map[k];
    // An instance with a stack count of zero is a record on its way out, not a
    // stack: "retains any INSTANCES of [Sin]" is a count, not a key check.
    if (inst && (inst.stacks == null || inst.stacks > 0)) return k;
  }
  return null;
}

/** Can this condition be cleansed off this carrier right now?
 *  ROUND 230 -- and `cannotBeCleansed` is the one answer with no escape.
 *  [Marshal of Judgement]: "cannot be negated." Every other lock in this file
 *  is conditional on something the carrier could get rid of; this one is
 *  absolute, which is why `conditionTableFaults` refuses it on anything that
 *  is not `helpful`. */
export function canCleanse(def, carrier) {
  if (def && def.cannotBeCleansed) return false;
  return !lockHeldBy(def, carrier, 'cleanseLockedBy');
}

/**
 * ROUND 230 -- THE RULES THIS TABLE HAS TO KEEP ABOUT ITSELF.
 *
 * Every check here is a PROPERTY of a row rather than a count of rows, which is
 * the rule this project settled on after round 220: a check that counts the
 * roster is not a test.
 *
 * The first one is the reason the function exists. `cannotBeCleansed` arrived
 * this round for a BOON -- an effect the carrier wants and that expires on its
 * own -- and it is one typo away from an affliction nothing in the game can
 * ever remove. A rule that is only written in a comment is a rule until someone
 * adds a row in a hurry.
 */
export function conditionTableFaults() {
  const out = [];
  for (const k of DEBUFF_KEYS) {
    const d = DEBUFFS[k];
    if (d.cannotBeCleansed && !d.helpful) {
      out.push(`${k}: cannot be cleansed and is not helpful -- that is an affliction with no answer`);
    }
    // A condition that fires on a cleanse has to name a condition that exists,
    // or it is a bill nobody is ever sent.
    if (d.damageOnCleansed && !DEBUFFS[d.damageOnCleansed.key]) {
      out.push(`${k}: charges for cleansing "${d.damageOnCleansed.key}", which is not a condition`);
    }
    // `reappliesOnNegated` (round 229) and `tracksMark` (round 230) name keys
    // too, and the same argument applies to both.
    if (d.reappliesOnNegated && !DEBUFFS[d.reappliesOnNegated]) {
      out.push(`${k}: reapplies "${d.reappliesOnNegated}", which is not a condition`);
    }
    if (d.tracksMark && !DEBUFFS[d.tracksMark]) {
      out.push(`${k}: tracks "${d.tracksMark}", which is not a condition`);
    }
    // `consumes` and `companionOf` predate this function and are checked here
    // for the same reason -- one place that asks whether a row's cross
    // references resolve.
    if (d.consumes && !DEBUFFS[d.consumes]) {
      out.push(`${k}: consumes "${d.consumes}", which is not a condition`);
    }
    if (d.companionOf && !DEBUFFS[d.companionOf]) {
      out.push(`${k}: companions "${d.companionOf}", which is not a condition`);
    }
    // A condition that restores pools needs a clock to do it on, and the damage
    // tick's clock is not available to it -- see the note in `_tickDebuffs`.
    if (d.restores && !(d.tickEvery > 0)) {
      out.push(`${k}: restores pools and has no tickEvery, so it would never pay out`);
    }
    // And a drain has to say where what it takes goes.
    if (d.drainFrac && d.drainPool && !['mana', 'stamina', 'health'].includes(d.drainPool)) {
      out.push(`${k}: drains into "${d.drainPool}", which is not a pool`);
    }
    // ROUND 231 -- the three new fields that name something else, and the one
    // that could eat itself.
    if (d.grantsOnCleansed && !DEBUFFS[d.grantsOnCleansed.key]) {
      out.push(`${k}: grants "${d.grantsOnCleansed && d.grantsOnCleansed.key}" on a cleanse, which is not a condition`);
    }
    for (const t of (d.grantsOnCleansed && d.grantsOnCleansed.tags) || []) {
      if (!CLEANSE_TAGS.includes(t) && !BEHAVIOUR_TAGS.includes(t)) {
        out.push(`${k}: grants on "${t}", which is not a tag`);
      }
    }
    for (const t of d.deepensTagged || []) {
      if (!CLEANSE_TAGS.includes(t) && !BEHAVIOUR_TAGS.includes(t)) {
        out.push(`${k}: deepens "${t}", which is not a tag`);
      }
    }
    // THE ONE THAT MATTERS. A row that deepens a tag it carries itself would add
    // a stack to itself every tick, which is round 227's unbounded-loop lesson
    // in a table rather than on a screen. Asserted rather than trusted, because
    // it is one tag away at any time: `inexorableDoom` deepens `curse` and is
    // tagged `curse`, and the runtime refuses itself by key -- this check is
    // what says the DATA should not ask.
    for (const t of d.deepensTagged || []) {
      if ((d.tags || []).includes(t) && (d.tags || []).includes(TAG.stacking)) {
        out.push(`${k}: deepens "${t}", is tagged "${t}", and stacks -- that feeds itself`);
      }
    }
    for (const key2 of d.cleanseLockedBy || []) {
      if (!DEBUFFS[key2]) out.push(`${k}: cleanse-locked by "${key2}", which is not a condition`);
    }
    for (const key2 of d.healLockedBy || []) {
      if (!DEBUFFS[key2]) out.push(`${k}: heal-locked by "${key2}", which is not a condition`);
    }
    // ROUND 232 -- the complement lock names real tags too, and a spawner has to
    // declare its ceiling.
    for (const t of d.cleanseLockedByNonTag || []) {
      if (!CLEANSE_TAGS.includes(t) && !BEHAVIOUR_TAGS.includes(t)) {
        out.push(`${k}: locked by everything except "${t}", which is not a tag`);
      }
    }
    if (d.butterfly) {
      if (!(d.butterfly.cap > 0)) {
        out.push(`${k}: conjures on a clock with no cap -- that is a denial of service, not a mechanic`);
      }
      if (!(d.tickEvery > 0)) out.push(`${k}: conjures and has no tickEvery, so it never would`);
    }
    // ===== ROUND 238 -- the three new fields that point at something =========
    //
    // [Hero's Moment]'s tail is a row rather than a computed inverse precisely
    // so it can be read and balanced on its own, and the cost of that choice is
    // that the name can go stale. Checked the same way every other key
    // reference in this table is.
    if (d.inverseOnExpiry && !DEBUFFS[d.inverseOnExpiry]) {
      out.push(`${k}: expires into "${d.inverseOnExpiry}", which is not a condition`);
    }
    // AND IT MUST NOT BE ITSELF, or the boon renews its own bill forever. This
    // is round 227's unbounded-loop lesson and round 231's self-deepening check
    // wearing a third set of clothes, and it is one typo away at all times.
    if (d.inverseOnExpiry === k) {
      out.push(`${k}: expires into itself -- that boon never ends`);
    }
    // A tail is the INVERSE of a boon, so it must not itself be helpful: a
    // debilitation the carrier wants is not a bill.
    if (d.inverseOnExpiry && DEBUFFS[d.inverseOnExpiry] && DEBUFFS[d.inverseOnExpiry].helpful) {
      out.push(`${k}: expires into "${d.inverseOnExpiry}", which is helpful -- that is not a price`);
    }
    // [Verdant Cage]'s silver rung lets the ENVIRONMENT choose which poison the
    // thorns carry, and the row names the set it may choose from. Every member
    // has to exist and has to actually be a poison, or "inflicts poison" is a
    // sentence the mechanic does not keep.
    for (const key2 of d.poisonByEnvironment || []) {
      if (!DEBUFFS[key2]) {
        out.push(`${k}: the environment may inflict "${key2}", which is not a condition`);
      } else if (!hasTag(DEBUFFS[key2], TAG.poison)) {
        out.push(`${k}: the environment may inflict "${key2}", which is not a poison`);
      } else if (key2 === k) {
        // The row is itself poison-tagged, so the tag check above cannot catch
        // this one -- and a cage whose thorns inflict the cage would refresh a
        // control off its own tick.
        out.push(`${k}: the environment may inflict "${key2}", which is itself`);
      }
    }
    // [Bolster] is spent by the ability it modifies; [Hero's Moment] carries the
    // same vocabulary and is NOT spent, because it stands for four hours. Both
    // are legal, and a row carrying neither reading is the one that is not: a
    // `nextAbility` with nothing to spend it and no duration to stand for would
    // be read by nobody.
    if (d.nextAbility && !d.consumeOn && !(d.dur && d.dur[0] > 0)) {
      out.push(`${k}: modifies the next ability with no consumeOn and no duration -- nothing would ever read it`);
    }
    // ROUND 239 -- `attrResist` names ATTRIBUTES, not damage types.
    //
    // Round 238 added `resistTypes` and `resistAll` for damage, and this field
    // sits one line away from them and means something else entirely: it
    // resists a class of CONDITION. A row that wrote an element here -- which
    // is the mistake a reader of the neighbouring fields would make -- would
    // resist nothing at all, silently, because no condition reduces "fire".
    for (const a of d.attrResistOn || []) {
      if (!['power', 'spirit', 'speed', 'recovery'].includes(a)) {
        out.push(`${k}: resists reductions of "${a}", which is not a major attribute`);
      }
    }
    if (typeof d.attrResist === 'number' && !(d.attrResistOn || []).length) {
      out.push(`${k}: resists attribute reduction without saying which attributes`);
    }
    if ((d.attrResistOn || []).length && typeof d.attrResist !== 'number') {
      out.push(`${k}: names attributes to protect and no amount to protect them by`);
    }
    // A boon that waives the rank gap is the broadest exception round 43 has,
    // so the table states the price out loud: it is helpful, and it ends.
    if (d.ignoresRankGap) {
      if (!d.helpful) out.push(`${k}: waives the rank gap and is not helpful`);
      if (d.cannotBeCleansed && !d.inverseOnExpiry) {
        out.push(`${k}: waives the rank gap, cannot be cleansed and costs nothing when it ends`);
      }
    }
  }
  return out;
}

/** Does anything on this carrier forbid pulling the aura in? Returns the
 *  condition that does, so the refusal can name it. */
export function auraLockedBy(carrier) {
  const map = (carrier && carrier.debuffs) || null;
  if (!map) return null;
  for (const k of Object.keys(map)) {
    const def = conditionDef(k);
    if (def && def.lockAura) return def;
  }
  return null;
}

/** ROUND 201 -- the conditions that arrive WITH `key` rather than on their
 *  own. Derived from the table, so adding a second companion is one field. */
export function companionsOf(key) {
  return DEBUFF_KEYS.filter(k => DEBUFFS[k].companionOf === key);
}
/** Conditions that are never rolled directly -- a reachability check should
 *  skip these rather than carry a hand-written exception list. */
export function companionConditions() {
  return DEBUFF_KEYS.filter(k => DEBUFFS[k].companionOf);
}

/** The keys of every condition on the carrier whose healing is locked shut.
 *  A heal reads this to know which wounds it may not close. */
export function healLockedConditions(carrier) {
  const map = (carrier && carrier.debuffs) || null;
  if (!map) return [];
  return Object.keys(map).filter((k) => {
    const def = conditionDef(k);
    return def && lockHeldBy(def, carrier, 'healLockedBy');
  });
}

/** DEPRECATED as of round 105 -- kept only so an old save's stored `kind`
 *  string does not crash a lookup. Nothing reads it to decide behaviour. */
export const DEBUFF_KINDS = {
  // Scales one already-existing rate down. Read at the point of use.
  rate: 'rate',
  // Lowers one of the four MAJOR attributes. The only kind that forces a stat
  // recompute, because the whole minor-stat stack hangs off the attributes.
  attribute: 'attribute',
  // Damage over time. Several may run at once -- see the note on STACKING.
  affliction: 'affliction',
  // Takes away the ability to act. Diminishing returns apply (see DR_STEPS).
  control: 'control',
  // Changes how much of something else lands: damage taken, healing received.
  amplify: 'amplify',
};

// ---------------------------------------------------------------------------
// DIMINISHING RETURNS -- the user's answer to "how hard should Stun and Freeze
// hit the player": "Short, with diminishing returns."
//
// Each application of a control debuff within the window lands at a smaller
// fraction of its listed length, and the fourth inside the window does not land
// at all. The window resets from the moment the last one EXPIRES, not the
// moment it was applied, or a long freeze would refresh its own immunity while
// still holding you.
// ---------------------------------------------------------------------------
export const DR_STEPS = [1, 0.5, 0.25, 0];
export const DR_WINDOW = 10;

/** How many stacks of one affliction may run at once. Matches round 44's
 *  STATUS_STACK_CAP so the icon digit never shows a number the maths ignores. */
export const DEBUFF_STACK_CAP = 5;

// ---------------------------------------------------------------------------
// THE TWENTY (nineteen in round 57; `expose` joined them in round 90)
//
// Fields every entry carries:
//   key        stable id, used by saves, abilities and monsters alike
//   label      what the player is told they have
//   icon       frame key in status_icons.png
//   color      float text and icon tint
//   kind       one of DEBUFF_KINDS
//   per        magnitude added per stack (see the kind for what it means)
//   cap        total magnitude ceiling however many stacks land
//   stackCap   how many stacks may run
//   dur        [min, max] seconds, before any scaling
//   elements   ability elements that may thematically roll it
//   levers     essence levers that may thematically roll it
//   blurb      one plain sentence stating the mechanic, for ability text
//
// The `elements`/`levers` lists are what "as thematically appropriate" means in
// code: a frost ability can freeze and slow, and can never inflict disease.
// ---------------------------------------------------------------------------
export const DEBUFFS = {

  // ---- the three the user listed first: rates ----------------------------
  slowMove: {
    key: 'slowMove', label: 'Slowed', icon: 'slowmove', color: '#4dd0e1',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'moveSpeed',
    per: 0.14, cap: 0.55, stackCap: 3, dur: [3, 7],
    elements: ['frost', 'nature', 'shadow'], levers: ['anchor', 'chain', 'stalk'],
    blurb: "slowing the target's movement",
  },
  slowAttack: {
    key: 'slowAttack', label: 'Hindered', icon: 'slowattack', color: '#ffb74d',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'attackSpeed',
    per: 0.13, cap: 0.45, stackCap: 3, dur: [4, 8],
    elements: ['frost', 'shadow', 'physical'], levers: ['muzzle', 'bulwark', 'turn'],
    blurb: "slowing the target's attacks",
  },
  slowCast: {
    key: 'slowCast', label: 'Muddled', icon: 'slowcast', color: '#b39ddb',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'castSpeed',
    per: 0.13, cap: 0.45, stackCap: 3, dur: [4, 8],
    elements: ['shadow', 'lightning', 'frost'], levers: ['turn', 'fate', 'shift'],
    blurb: "slowing the target's casting",
  },

  // ---- the two crit debuffs ----------------------------------------------
  critChanceDown: {
    key: 'critChanceDown', label: 'Blunted', icon: 'critdown', color: '#90a4ae',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'critChance', flat: true,
    per: 0.07, cap: 0.25, stackCap: 3, dur: [5, 10],
    elements: ['shadow', 'frost', 'physical'], levers: ['bulwark', 'turn', 'fate'],
    blurb: "lowering the target's critical hit chance",
  },
  critDamageDown: {
    key: 'critDamageDown', label: 'Dulled', icon: 'critdmgdown', color: '#78909c',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'critDamage', flat: true,
    per: 0.14, cap: 0.45, stackCap: 3, dur: [5, 10],
    elements: ['shadow', 'physical', 'frost'], levers: ['bulwark', 'raw', 'turn'],
    blurb: "lowering the target's critical damage",
  },

  // ---- the four attributes ------------------------------------------------
  // These are the only debuffs that force a stat recompute, and they are worth
  // it: taking Power off a player takes their health, block and armour with it,
  // because that is what Power buys. A debuff that only touched one number
  // would not be the attribute -- it would be a rate, and there are five of
  // those above already.
  //
  // MAGNITUDE, retuned after measurement. The first draft drained 2 per stack
  // to a cap of 8, which read as reasonable until the actual scale was checked:
  // inventory.js says it outright -- "a full Iron kit sits at 1 per attribute,
  // Diamond at 5 + ability boosts". One stack would have zeroed a mid-game
  // character's whole attribute and four would have zeroed anyone's. One per
  // stack to a cap of two is a real bite out of a small number without being
  // the entire number.
  powerDown: {
    key: 'powerDown', label: 'Weakened', icon: 'powerdown', color: '#e57373',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'power',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'nature', 'frost'], levers: ['siphon', 'muzzle', 'turn'],
    blurb: "draining the target's Power",
  },
  spiritDown: {
    key: 'spiritDown', label: 'Dimmed', icon: 'spiritdown', color: '#7986cb',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'spirit',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'radiant', 'lightning'], levers: ['siphon', 'turn', 'fate'],
    blurb: "draining the target's Spirit",
  },
  speedDown: {
    key: 'speedDown', label: 'Leaden', icon: 'speeddown', color: '#a1887f',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'speed',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['frost', 'nature', 'physical'], levers: ['anchor', 'bulwark', 'stalk'],
    blurb: "draining the target's Speed",
  },
  recoveryDown: {
    key: 'recoveryDown', label: 'Fatigued', icon: 'recoverydown', color: '#9575cd',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'recovery',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'nature'], levers: ['siphon', 'linger', 'muzzle'],
    blurb: "draining the target's Recovery",
  },

  // ---- the six afflictions ------------------------------------------------
  // Every one of these deals damage over time, and every one does something
  // ELSE that the others do not. Six identical DoTs in six colours would be the
  // round-53 mistake again: variety that is not distinctiveness.
  poison: {
    key: 'poison', label: 'Poisoned', icon: 'poisoned', color: '#9ccc65',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.poison], element: 'nature',
    tickEvery: 1.0, per: 0.35, cap: 3, stackCap: 5, dur: [6, 12],
    elements: ['nature', 'shadow'], levers: ['linger', 'siphon', 'stalk'],
    blurb: "poisoning the target",
    // Poison is the one that STACKS high and ticks low: five stacks of a slow
    // drip is what makes a nest of spiders different from one snake.
  },
  burn: {
    key: 'burn', label: 'Burning', icon: 'burning', color: '#ff7043',
    kind: DEBUFF_KINDS.affliction,
    // ROUND 278 -- canon: "[Burning] (affliction, damage-over-time, elemental):
    // Inflicts ongoing fire damage." Not stacking: one fire, refreshed.
    tags: [TAG.affliction, TAG.burning], element: 'fire',
    tickEvery: 0.7, per: 0.75, cap: 0.75, stackCap: 1, dur: [4, 8],
    elements: ['fire', 'radiant'], levers: ['linger', 'burst', 'raw'],
    blurb: "setting the target alight",
  },
  bleed: {
    key: 'bleed', label: 'Bleeding', icon: 'bleeding', color: '#ef5350',
    kind: DEBUFF_KINDS.affliction,
    // ROUND 278 -- canon: "[Bleeding] (affliction, wounding, blood): Deals
    // ongoing damage by causing or increasing blood loss. As a wounding effect,
    // this condition absorbs and negates an amount of incoming healing, after
    // which this affliction immediately ends." Not stacking -- [Exsanguination]
    // is the canon condition that says "[Bleeding] can stack" -- and no longer
    // harder while the victim moves, which the book never said.
    tags: [TAG.affliction, TAG.wounding, TAG.blood],
    // ROUND 105 -- how much healing one stack absorbs before the bleed closes.
    // Eight is four ticks' worth of its own damage, so healing through a bleed
    // costs about what the bleed was going to cost you -- a trade, not a tax.
    woundAbsorb: 8, element: 'physical',
    tickEvery: 1.0, per: 0.55, cap: 3, stackCap: 1, dur: [5, 10],
    elements: ['physical'], levers: ['raw', 'burst', 'stalk'],
    blurb: "opening a wound that bleeds harder while the target moves",
  },
  disease: {
    key: 'disease', label: 'Diseased', icon: 'diseased', color: '#a1a05e',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.disease], element: 'nature',
    tickEvery: 1.2, per: 0.3, cap: 2, stackCap: 3, dur: [8, 16],
    // Cuts healing RECEIVED. The long one: a disease is a problem you carry
    // through the next fight, not one you wait out behind a rock.
    healingCut: 0.25, healingCutCap: 0.6,
    elements: ['nature', 'shadow'], levers: ['linger', 'siphon'],
    blurb: "sickening the target so healing does less for them",
  },
  unholy: {
    key: 'unholy', label: 'Blighted', icon: 'unholy', color: '#7e57c2',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.unholy], element: 'shadow',
    tickEvery: 1.0, per: 0.4, cap: 2.5, stackCap: 3, dur: [6, 12],
    // Eats maximum health while it holds. Distinct from raw damage: a healer
    // cannot heal past it, and it is the only affliction that makes the bar
    // itself shorter.
    maxHpCut: 0.05, maxHpCutCap: 0.20,
    // ROUND 105 -- "lengthens and strengthens other DOTs", the half of the
    // user's necrotic line that was never built. It multiplies the TICK of
    // every other affliction on the same target and extends what lands while
    // it holds, which makes blight the opener of a DOT kit rather than a
    // fourth damage number in one -- and pointedly does not amplify itself,
    // or two stacks of blight would compound into each other.
    dotAmp: { mag: 0.20, dur: 0.15, cap: 0.60 },
    elements: ['shadow'], levers: ['siphon', 'linger', 'muzzle'],
    blurb: "blighting the target so their very health withers and every other affliction bites harder",
  },
  holy: {
    key: 'holy', label: 'Judged', icon: 'holy', color: '#ffd54f',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.holy], element: 'radiant',
    // Ticks a share of MAXIMUM health rather than a flat number, so judgment
    // falls hardest on the mighty. On a slime it is a rounding error; on a
    // dragon it is the reason you brought a radiant essence.
    tickEvery: 1.2, per: 0.012, cap: 0.05, stackCap: 3, dur: [6, 10],
    ofMaxHp: true,
    elements: ['radiant'], levers: ['raw', 'burst', 'call'],
    blurb: "marking the target for judgement, burning a share of their full health",
  },

  // ---- the amplifier ------------------------------------------------------
  curse: {
    key: 'curse', label: 'Cursed', icon: 'cursed', color: '#ce93d8',
    kind: DEBUFF_KINDS.amplify,
    tags: [TAG.amplify, TAG.curse], amplify: 'damageTaken',
    per: 0.12, cap: 0.40, stackCap: 3, dur: [6, 12],
    elements: ['shadow', 'radiant'], levers: ['turn', 'fate', 'siphon'],
    blurb: "cursing the target so everything wounds them more deeply",
  },

  // ---- the two controls ---------------------------------------------------
  freeze: {
    key: 'freeze', label: 'Frozen', icon: 'frozen', color: '#81d4fa',
    kind: DEBUFF_KINDS.control,
    tags: [TAG.control, TAG.frost], stopsMove: true, stopsAct: false,
    per: 1, cap: 1, stackCap: 1, dur: [1.0, 2.0], dr: true,
    elements: ['frost'], levers: ['anchor', 'turn'],
    // MEASURED. Freeze compounds two rarities: it is frost-only, and frost is
    // the rarest channel a debuff-carrying ability rolls (193 of 3,457 carriers
    // -- 5.6%). At the default control weight it came up 2 times in 24,000
    // generated abilities, and a deliberately frost-built kit produced NONE at
    // all, which is a debuff the player can read about and never cast. The
    // weight is set against frost's own scarcity rather than against the other
    // controls: stun sits on `physical`, which is a quarter of everything.
    pickWeight: 5,
    blurb: "freezing the target in place",
  },
  stun: {
    key: 'stun', label: 'Stunned', icon: 'stunned', color: '#fff176',
    kind: DEBUFF_KINDS.control,
    tags: [TAG.control], stopsMove: true, stopsAct: true,
    // ===== ROUND 234 -- THE CANON LINE, AND THE HALF OF IT WE DID NOT HAVE ==
    //
    // The user supplied [Stunned]'s full text with [Spirit Reaper]:
    //
    //   "Briefly be unable to move, use abilities or control already active
    //    abilities. Fully reactive abilities and effects can still be
    //    triggered. THE DURATION CANNOT BE REFRESHED by applying [Stunned]
    //    again and being affected multiple times in succession has DIMINISHING
    //    RETURNS."
    //
    // The diminishing returns half has been here since round 57 -- `dr: true`,
    // and `_controlDR` is the user's own "short, with diminishing returns". The
    // NO-REFRESH half was not, and the door quietly did the opposite: round 44's
    // rule is `t: Math.max(prev.t, dur)`, which refreshes to whichever is longer.
    // So a pack of five landing stuns in sequence kept topping one up, which is
    // precisely the case canon writes this clause to forbid, and the DR was
    // answering a different question (how STRONG the next one is) than the one
    // being asked (whether it EXTENDS this one).
    //
    // `noRefresh` is that clause, read at the one door every condition walks
    // through. It is set here and nowhere else: refreshing is right for almost
    // everything in this table -- an affliction you keep applying should keep
    // running -- and it is wrong for a control, which is the one kind of
    // condition where extending it means taking the fight away.
    noRefresh: true,
    per: 1, cap: 1, stackCap: 1, dur: [0.6, 1.2], dr: true,
    elements: ['physical', 'lightning'], levers: ['raw', 'burst', 'muzzle'],
    blurb: "stunning the target outright",
  },
  // ROUND 221 -- the third control, and the polearm's whole argument. A pin
  // stops the feet and leaves the hands, which is the difference between a
  // spear and a stun: the thing on the end of it is still fighting, it just
  // cannot close. [Frozen] was the only stops-move-but-not-act condition in
  // the table and it is frost by tag, so a spear that froze its target would
  // have been answering to every frost cleanse in the game.
  //
  // `levers: []` on purpose: this is a TECHNIQUE'S condition, earned at
  // silver on a mastery line, and a generator that could also roll it onto
  // any physical ability would make the rung worth nothing. It is reachable
  // exactly one way, which is why it is marked `techniqueOnly` and why
  // `thematicDebuffsFor` filters on that flag rather than trusting the empty
  // lever list -- see the note there.
  pinned: {
    key: 'pinned', label: 'Pinned', icon: 'stunned', color: '#a1887f',
    kind: DEBUFF_KINDS.control,
    tags: [TAG.control], stopsMove: true, stopsAct: false, techniqueOnly: true,
    per: 1, cap: 1, stackCap: 1, dur: [1.5, 1.5], dr: true,
    elements: ['physical'], levers: [],
    blurb: "pinning the target where it stands",
  },

  // ---- armour -------------------------------------------------------------
  // ===== ROUND 105 -- THE FOUR CURSED CONDITIONS ===========================
  //
  // From the taxonomy: "cursed movement (take damage when you move, stacking)"
  // and its three siblings for mana, stamina and striking.
  //
  // These are the reason the trigger work and the condition work are one
  // round. "Take damage when you move" is the same MOMENT as "something
  // happens when you move" -- so they key off the identical event, and there
  // is one event system with two consumers rather than two that drift.
  // `punishOn` names the event; `_onTriggerEvent` charges them.
  //
  // Stacking, per the taxonomy, and small per stack: the point of a cursed
  // condition is that it makes you choose differently, not that it kills you
  // while you stand still.
  cursedMove: {
    key: 'cursedMove', label: 'Cursed Step', icon: 'cursed', color: '#ce93d8',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'moveDistance',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'dark'], levers: ['anchor', 'turn', 'stalk'],
    blurb: 'making every step cost blood',
  },
  cursedMana: {
    key: 'cursedMana', label: 'Cursed Channel', icon: 'cursed', color: '#b39ddb',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'spendMana',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'arcane'], levers: ['muzzle', 'siphon', 'turn'],
    blurb: 'making spent power draw on the body instead',
  },
  cursedStamina: {
    key: 'cursedStamina', label: 'Cursed Wind', icon: 'cursed', color: '#ffab91',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'spendStamina',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'blood'], levers: ['muzzle', 'siphon', 'raw'],
    blurb: 'making every effort tear at what is left',
  },
  cursedStrike: {
    key: 'cursedStrike', label: 'Cursed Hand', icon: 'cursed', color: '#ef9a9a',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'strike',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'blood'], levers: ['muzzle', 'turn', 'bulwark'],
    blurb: 'making every swing open the swinger',
  },

  sunder: {
    key: 'sunder', label: 'Sundered', icon: 'armordown', color: '#bcaaa4',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'armor', flat: true,
    per: 0.09, cap: 0.35, stackCap: 4, dur: [5, 10],
    // Fire is here because armour MELTS, and because without it fire had
    // exactly one debuff to its name -- a whole element with one option is a
    // whole element whose abilities cannot be told apart this way.
    elements: ['physical', 'lightning', 'fire'], levers: ['raw', 'burst', 'chain'],
    blurb: "shattering the target's armour",
  },

  // ---- resistance -- ROUND 90, THE TWENTIETH -------------------------------
  //
  // `sunder`'s missing twin, and the gap it fills was structural rather than
  // cosmetic. Armour explicitly does nothing against elemental damage -- that
  // split is the whole point of the stat -- so `sunder` is a physical build's
  // answer to a tough target and a FULL ELEMENTAL BUILD HAD NO ANSWER AT ALL.
  // A fire character facing a fire-resistant monster could only hit it more.
  //
  // Written here rather than in a crafting file, because the sentence that
  // produced it runs in both directions: "if the essence is likely to roll a
  // specific effect on abilities the quintessence should as well". If crafted
  // gear can strip resistances, so should the abilities of an essence that
  // ought to be able to -- and so should monsters, which now can.
  //
  // ELEMENTS IS EVERY ELEMENT, and that is deliberate: this is the one debuff
  // that belongs to no channel, because *every* channel wants a way through.
  // The levers are the four that read as getting past something rather than
  // adding to it.
  expose: {
    key: 'expose', label: 'Exposed', icon: 'resistdown', color: '#f06292',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'resist', flat: true,
    per: 0.08, cap: 0.30, stackCap: 4, dur: [5, 10],
    elements: ['physical', 'fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'],
    levers: ['raw', 'burst', 'turn', 'siphon'],
    blurb: "stripping the target's resistance to the elements",
  },

  // =========================================================================
  // ROUND 105 -- THE NINE THE AUDIT COULD NOT FIND
  //
  // Eight taxonomy lines and one whole special-debuff row had nothing behind
  // them. Several were blocked before this round rather than merely unbuilt,
  // and the two things that unblocked them are worth naming, because they are
  // the reason these are nine table rows rather than nine features:
  //
  //   TAGS. A single `kind` could say "affliction" OR "rate" and not both, so
  //   [Shocked] -- which ticks AND slows recovery -- was not a tuning problem,
  //   it was inexpressible. It is now two tags on one row.
  //
  //   TWENTY-EIGHT DAMAGE TYPES. [Wet] wants to raise cold and lightning taken
  //   while lowering fire and earth. Earth was not a damage type before this
  //   round, so half the condition had nothing to point at.
  //
  // The three that carry a NEW behavioural tag or field say so on their row.
  // Every icon here is a frame that already exists in status_icons.png --
  // `shocked` has sat unused at frame 3 since round 44, waiting for this.
  // =========================================================================

  // Ticking electrical damage that also slows every pool's refill, and does
  // NOT stack -- the user's line says so, and it is the right call: a
  // no-stack condition that hits three rates at once is a different pressure
  // from poison, which stacks five times and does one thing.
  shocked: {
    key: 'shocked', label: 'Shocked', icon: 'shocked', color: '#4fc3f7',
    tags: [TAG.affliction, TAG.rate, TAG.shock], element: 'lightning',
    rates: ['regenHealth', 'regenMana', 'regenStamina'],
    tickEvery: 0.8, per: 0.30, cap: 0.30, stackCap: 1, dur: [4, 8],
    elements: ['lightning'], levers: ['burst', 'chain', 'raw'],
    blurb: "shocking the target so nothing they have refills",
  },

  // ===== ROUND 201 -- THE SIN CONDITIONS, TRANSCRIBED FROM CANON ==========
  //
  // The user supplied all three lines verbatim; these rows are those lines and
  // nothing else. [Sin] is an ordinary stacking amplifier and needed no new
  // mechanic; [Mark of Sin] is the first condition in the game that another
  // condition holds shut. See CONDITION_LOCKS above.
  //
  // [Legacy of Sin] is named in the [Mark of Sin] line and is not otherwise
  // described, so it is authored as the one thing the line requires it to be:
  // something that also holds the mark shut. It carries no amplification of
  // its own -- inventing one would be putting words in the book's mouth -- and
  // exists as the residue [Sin] leaves when its stacks expire, which is the
  // only reading under which "any instances of [Sin] OR [Legacy of Sin]" is
  // not simply redundant.
  sin: {
    key: 'sin', label: 'Sin', icon: 'stackSin', color: '#7e57c2',
    tags: [TAG.affliction, TAG.curse, TAG.stacking], amplify: 'damageTaken',
    ampTypes: { necrotic: 0.08 },
    per: 0.08, cap: 0.40, stackCap: 5, dur: [12, 20],
    // `absolve` and `fate` are the two levers that deal in judgement, and
    // `raw` is the one every punishing element can pull. Named from LEVERS
    // rather than invented: a lever this table names that essenceLevers.js
    // does not have is a condition nothing can ever roll, which is exactly the
    // fault the first draft of this row shipped.
    elements: ['shadow', 'radiant'], levers: ['absolve', 'fate', 'raw'],
    blurb: 'increasing all necrotic damage the target takes, cumulatively',
  },
  // ===== ROUND 221 -- THE BOOK ANSWERED, AND WE HAD GUESSED ==============
  //
  // Round 201 authored this row from an inference and said so out loud: "[it]
  // is named in the [Mark of Sin] line and is not otherwise described, so it
  // is authored as the one thing the line requires it to be ... It carries no
  // amplification of its own -- inventing one would be putting words in the
  // book's mouth."
  //
  // The user has now supplied the canon line, from [Blade of Doom] at gold:
  //
  //   [Legacy of Sin] (affliction, holy): Execute abilities have a greater
  //   effect on the target. Stacking.
  //
  // Three corrections, and every one of them was a guess this round gets to
  // retire. It is HOLY, not a curse -- which matters, because a cleanse that
  // names curses was answering it and now does not. It STACKS. And it does a
  // thing: `executeAmp` raises the health ceiling below which an execute may
  // fire, which is the one reading of "greater effect" the game already has a
  // mechanic for (see `executeBelow` and `requiresTargetBelow`).
  //
  // What it does NOT lose is its round-201 job. It still holds [Mark of Sin]
  // shut -- `markOfSin.cleanseLockedBy` names it and that line is canon --
  // so the inference round 201 made about its ROLE survives the correction to
  // its EFFECT. That is the good case for writing your guesses down.
  legacyOfSin: {
    canonOf: 'bladeOfDoom',
    key: 'legacyOfSin', label: 'Legacy of Sin', icon: 'unholy', color: '#ffd54f',
    tags: [TAG.affliction, TAG.holy, TAG.stacking],
    executeAmp: 0.06,
    per: 0.06, cap: 0.30, stackCap: 5, dur: [20, 30],
    pickWeight: 4,
    elements: ['radiant', 'shadow'], levers: ['absolve', 'fate'],
    blurb: 'leaving the target easier to finish, cumulatively',
  },
  markOfSin: {
    key: 'markOfSin', label: 'Mark of Sin', icon: 'holy', color: '#ffb300',
    tags: [TAG.affliction, TAG.holy],
    // The two canon clauses, one field each.
    lockAura: true,
    cleanseLockedBy: ['sin', 'legacyOfSin'],
    healLockedBy: ['sin', 'legacyOfSin'],
    per: 0, cap: 0, stackCap: 1, dur: [20, 40],
    elements: ['radiant'], levers: ['absolve', 'fate'],
    // ROUND 201 -- THE MARK IS NOT ROLLED, IT ARRIVES WITH THE SIN.
    //
    // Canon, [Castigate]: "inflicting ... the [Sin] AND [Mark of Sin]
    // conditions" -- one hit, both conditions, and the mark's whole mechanic
    // is written in terms of the sin ("cannot be cleansed while target retains
    // any instances of [Sin]"). A mark rolled on its own would be a condition
    // that locks a cleanse against nothing and comes off to the first dispel,
    // which is not the thing the book describes.
    //
    // So `companionOf` is the field, and it is read in two places: the runtime
    // applies the companion whenever the named condition lands, and the
    // reachability check skips it rather than demanding a generator roll it
    // directly. Declaring the relationship once beats two lists agreeing.
    companionOf: 'sin',
    blurb: 'preventing aura retraction, and it will not come off while the sin remains',
  },

  // =========================================================================
  // ROUND 221 -- [BLADE OF DOOM], TRANSCRIBED.
  //
  // The user supplied a gold-rank canon ability whole, with all six of its
  // conditions written out, and the six rows below are those lines and
  // nothing else. It is worth saying what this ability IS before the rows,
  // because it is the density the user was measuring our own gold rungs
  // against: one conjuration that, by gold, applies six named conditions
  // across three cleanse channels, two opposed alignments and a mutual
  // affliction that cannot be cleansed while the person who dealt it lives.
  //
  // THREE OF THE SIX WERE ALREADY IN THIS FILE'S COMMENTS. Round 105 cited
  // the Ruinations by name as the example one `kind` enum could not express:
  // "Three identical necrotic damage-over-time effects that need three
  // DIFFERENT cleanses is the whole point of the Ruination example." Round
  // 105 built the vocabulary and stopped there. These are the rows it was
  // built for, sixteen rounds later.
  //
  // AND `TAG.dot` HAS NEVER MEANT WHAT THIS TABLE SAYS IT MEANS. Its own
  // definition at the top of this file reads "ongoing damage that runs until
  // cleansed", and the runtime ticks `d.t` down on every condition alike, so
  // a dot expired on a clock like anything else. The three Ruinations are the
  // first rows that need the documented behaviour, and round 221 builds it:
  // see `runsUntilCleansed` in WorldScene's condition tick. Every existing
  // dot-tagged row keeps its timer, because none of them declares the field.
  // =========================================================================

  // "All resistances are reduced. Additional instances have a cumulative
  // effect. Consumed to cleanse instances of [Resistant] on a 1:1 basis."
  //
  // The first half is `rate: 'resist'`, which `expose` has used since round
  // 90 and the runtime already reads in three places. The second half is new
  // and is the interesting one: an affliction that SPENDS ITSELF to strip a
  // buff. `consumes` names the condition it trades against, and the trade is
  // made at the door in `_applyDebuff` -- one stack for one stack, so landing
  // it on a target that is already resistant buys nothing until the
  // resistance is gone, which is exactly the decision the canon line sets up.
  vulnerable: {
    key: 'vulnerable', label: 'Vulnerable', icon: 'resistdown', color: '#8e24aa',
    tags: [TAG.affliction, TAG.rate, TAG.unholy, TAG.stacking],
    rate: 'resist', flat: true, consumes: 'resistant',
    per: 0.06, cap: 0.30, stackCap: 5, dur: [10, 18],
    pickWeight: 4,
    elements: ['shadow'], levers: ['raw', 'absolve', 'siphon'],
    blurb: "reducing all of the target's resistances, cumulatively",
  },

  // "[Resistant]": named only as the thing [Vulnerable] is spent on, so it is
  // authored as the least that line requires and no more -- the mirror of
  // [Vulnerable], on the same rate, in the same steps. It is the first row in
  // this table that HELPS whoever carries it; it lives here rather than in a
  // buff table because [Vulnerable] has to be able to find it by key, and a
  // condition split across two tables is the hand-maintained pair this
  // project keeps finding broken.
  resistant: {
    key: 'resistant', label: 'Resistant', icon: 'stackWard', color: '#4db6ac',
    tags: [TAG.rate, TAG.stacking], helpful: true,
    rate: 'resist', flat: true, rateSign: -1,
    per: 0.06, cap: 0.30, stackCap: 5, dur: [12, 20],
    elements: ['radiant'], levers: [],
    blurb: "raising all of the carrier's resistances, cumulatively",
  },

  // The three that are one sentence apart in the book and three different
  // problems at the table. Same element, same shape, same cumulative rule --
  // and a cleanse that answers one does nothing about the other two.
  //
  // `runsUntilCleansed` is what makes the sentence true: "inflicts ongoing
  // necrotic damage UNTIL POISON IS CLEANSED" is not a duration, and a row
  // that quietly expired after eighteen seconds would have been a paraphrase
  // rather than a transcription. The clock does not run on these; a cleanse
  // or a death is the only way off. `dur` is still rolled and still shown,
  // because the status strip and every card read it, and it is what a DISPEL
  // shortens -- but nothing counts it down. See the tick in WorldScene.
  //
  // That is severe on the player and it is meant to be: an untimed affliction
  // is answerable (any cleanse reaches it, and a tagged one reaches exactly
  // one of the three) and ignoring it is not. Which is the decision the three
  // rows exist to create.
  ruinationBlood: {
    canonOf: 'bladeOfDoom',
    key: 'ruinationBlood', label: 'Ruination of the Blood', icon: 'poisoned', color: '#7cb342',
    tags: [TAG.dot, TAG.poison, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.8, cap: 4.0, stackCap: 5, dur: [14, 22], tickEvery: 1,
    // ROUND 221 -- weighted for the same reason `freeze` is, and it is the
    // same arithmetic: three rows sharing one narrow element pair against a
    // table of fifty came up in none of test_round57's generation sample.
    // An affliction the player can read about and never inflict is the
    // reachability fault this table's own checks exist to catch.
    pickWeight: 4,
    elements: ['shadow', 'nature'], levers: ['linger', 'raw', 'absolve'],
    blurb: 'inflicting ongoing necrotic damage until the poison is cleansed',
  },
  ruinationFlesh: {
    canonOf: 'bladeOfDoom',
    key: 'ruinationFlesh', label: 'Ruination of the Flesh', icon: 'poisoned', color: '#8d6e63',
    tags: [TAG.dot, TAG.disease, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.8, cap: 4.0, stackCap: 5, dur: [14, 22], tickEvery: 1,
    // ROUND 221 -- weighted for the same reason `freeze` is, and it is the
    // same arithmetic: three rows sharing one narrow element pair against a
    // table of fifty came up in none of test_round57's generation sample.
    // An affliction the player can read about and never inflict is the
    // reachability fault this table's own checks exist to catch.
    pickWeight: 4,
    elements: ['shadow', 'nature'], levers: ['linger', 'raw', 'absolve'],
    blurb: 'inflicting ongoing necrotic damage until the disease is cleansed',
  },
  ruinationSpirit: {
    canonOf: 'bladeOfDoom',
    key: 'ruinationSpirit', label: 'Ruination of the Spirit', icon: 'poisoned', color: '#5e35b1',
    tags: [TAG.dot, TAG.curse, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.8, cap: 4.0, stackCap: 5, dur: [14, 22], tickEvery: 1,
    pickWeight: 4,
    elements: ['shadow'], levers: ['linger', 'raw', 'absolve'],
    blurb: 'inflicting ongoing necrotic damage until the curse is cleansed',
  },

  // The hardest of the six, and the one worth the machinery:
  //
  //   "This affliction is applied equally to the person it is inflicted upon
  //    and the person who inflicts it. This affliction cannot be cleansed
  //    while a person who shares it is alive and is immediately negated if
  //    the person who shares it dies. Damage between people who share the
  //    affliction is increased, including damage sources in place prior to
  //    this effect. Damage from holy sources is further increased. Only
  //    damage actually inflicted is increased; damage negated by damage
  //    reduction and protection abilities is not."
  //
  // Five clauses, five fields, and `shared: true` is the one that makes it a
  // different KIND of condition from everything above: it lands on the caster
  // too, by the same door, at the same strength. That is a real cost and it
  // is the whole character of the thing -- an affliction skirmisher's answer
  // to a target they intend to outlive.
  //
  // "Including damage sources in place prior to this effect" is why the
  // amplification is read at the moment damage lands rather than baked into
  // the conditions already ticking: a dot applied before the price was paid
  // still bites harder once it is.
  priceInBlood: {
    key: 'priceInBlood', label: 'Price in Blood', icon: 'stackSin', color: '#e53935',
    tags: [TAG.affliction, TAG.amplify, TAG.holy, TAG.blood, TAG.stacking],
    amplify: 'damageTaken', shared: true,
    // The two magnitudes the canon line distinguishes: everything between the
    // pair, and holy between the pair "further increased".
    per: 0.08, cap: 0.40, stackCap: 5, dur: [12, 20],
    ampTypes: { radiant: 0.14 },
    sharedOnly: true, negatedOnSharerDeath: true,
    cleanseLockedWhileShared: true,
    // Only damage ACTUALLY INFLICTED, which is a placement rather than a
    // number: the amplifier is applied after mitigation and after every
    // shield, at the point the health actually moves.
    afterMitigation: true,
    pickWeight: 4,
    elements: ['radiant'], levers: ['absolve', 'siphon', 'fate'],
    blurb: 'binding you to the target so every blow between you lands harder, cumulatively',
  },

  // =========================================================================
  // ROUND 224 -- [HAEMORRHAGE], TRANSCRIBED.
  //
  // The user supplied this one whole, in the same message as the rule that a
  // vehicle is immune to blood, poison and curses because it is not alive --
  // and the two halves interlock, which is why they are one round. Canon's
  // silver rung is the answer to his own vehicle rule:
  //
  //   [Blood From a Stone] (affliction, magic): Negates immunity to blood and
  //   poison effects. This includes INTRINSIC IMMUNITIES, SUCH AS FROM NOT
  //   HAVING A BIOLOGY OR CORPOREAL FORM. Entities without blood can bleed
  //   while under this effect.
  //
  // So the round adds a construct immunity and the thing that beats it in the
  // same breath, which is the shape a rule wants: a blanket immunity with no
  // counter is not a rule, it is a wall.
  //
  // [Bleeding] IS NOT ADDED. It has been in this table since round 57 as
  // `bleed`, already tagged (affliction, wounding, blood, stacking) and
  // already carrying `woundAbsorb` -- the "absorbs and negates an amount of
  // incoming healing, after which this affliction immediately ends" clause,
  // built by round 105. Canon and this game agree about it entirely.
  //
  // WHICH LEAVES [EXSANGUINATION] WITH A PROBLEM WORTH NAMING. Canon's gold
  // rung is "[Bleeding] can stack", and ours already does -- `stackCap: 4`,
  // and a hundred and seventy rounds of balance sit on it. Rewriting bleed to
  // not stack so that a gold rung could grant it would be changing the game
  // to fit a transcription. So Exsanguination raises the ceiling instead:
  // bleeding stacks FURTHER than it otherwise could. That is the same
  // sentence one game-state along, and saying so here is better than shipping
  // a gold rung that grants a thing the player already had.
  // =========================================================================

  // "Any drain attacks or blood afflictions suffered have increased effect."
  sacrificialVictim: {
    key: 'sacrificialVictim', label: 'Sacrificial Victim', icon: 'stackSin', color: '#c62828',
    // ROUND 278 -- canon: "(affliction, unholy)". Round 224 added stacking,
    // which the book does not give it; one instance, refreshed.
    tags: [TAG.affliction, TAG.unholy],
    // Not `amplify: 'damageTaken'`: this is narrower than a curse and has to
    // be, or it would be one. It raises what DRAIN and BLOOD do and nothing
    // else, which is read at the two places those are paid.
    amplifyTagged: { drain: 0.25, blood: 0.25 },
    per: 0.25, cap: 0.25, stackCap: 1, dur: [12, 20],
    canonOf: 'haemorrhage',
    elements: ['shadow', 'radiant'], levers: ['siphon', 'absolve'],
    pickWeight: 4,
    blurb: "deepening every drain and every blood affliction the target suffers",
  },

  // ROUND 283 -- [SPELL IMPETUS], the Spell Lance's. Canon: "(affliction,
  // magic, stacking): All resistances are reduced. When the recipient suffers
  // an offensive spell from someone wielding [Spell Lance of the Magister],
  // all instances of [Spell impetus] are consumed to increase the effect of
  // the spell." The first sentence is `rate: 'resist'`, [Exposed]'s shape;
  // the second is read where spell damage lands (`_legendarySpellHit`).
  // ROUND 284 -- [UMBRAL SNAKE VENOM], from his item examples ([Dark Hydra
  // Robe], [Night Fang]): "(damage-over-time, poison, stacking): Inflicts
  // ongoing necrotic damage until poison is cleansed. Additional instances
  // have a cumulative effect." Necrotoxin's shape; only his items carry it.
  umbralSnakeVenom: {
    key: 'umbralSnakeVenom', label: 'Umbral Snake Venom', icon: 'poisoned', color: '#4a148c',
    tags: [TAG.dot, TAG.poison, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.8, cap: 4, stackCap: 5, dur: [14, 22], tickEvery: 1,
    itemOnly: true,
    elements: [], levers: [], pickWeight: 0,
    blurb: 'necrotic venom that runs until the poison is cleansed',
  },
  spellImpetus: {
    key: 'spellImpetus', label: 'Spell Impetus', icon: 'resistdown', color: '#9575cd',
    tags: [TAG.affliction, TAG.magic, TAG.stacking], rate: 'resist', flat: true,
    per: 0.05, cap: 0.40, stackCap: 8, dur: [10, 14],
    itemOnly: true, canonOf: 'spellLance',
    // No element and no lever: nothing but the Lance puts it on a target.
    elements: [], levers: [], pickWeight: 0,
    blurb: 'lowering every resistance, and spent to strengthen the next spell from the Lance',
  },
  // ROUND 283 -- [MANA SIPHON], the Tithe's. Canon: "(affliction, magic): The
  // strength of mana drain effects against the recipient are increased."
  // `amplifyTagged.drain`, [Sacrificial Victim]'s shape, read where the
  // Tithe's draining beam pays out.
  manaSiphon: {
    key: 'manaSiphon', label: 'Mana Siphon', icon: 'stackSin', color: '#4fc3f7',
    tags: [TAG.affliction, TAG.magic], amplifyTagged: { drain: 0.5 },
    per: 0, cap: 0, stackCap: 1, dur: [10, 14],
    itemOnly: true, canonOf: 'magistersTithe',
    elements: [], levers: [], pickWeight: 0,
    blurb: 'making every mana drain against it stronger',
  },

  // "Inflicts ongoing necrotic damage until the poison is cleansed. Additional
  //  instances have a cumulative effect." -- word for word the shape round 221
  //  built `runsUntilCleansed` for, so it costs one field rather than a
  //  mechanic. The [Ruination] triplet's sibling, from a different ability.
  necrotoxin: {
    key: 'necrotoxin', label: 'Necrotoxin', icon: 'poisoned', color: '#689f38',
    // ROUND 278 -- canon: "(affliction, poison, stacking)". `dot` stays: it is
    // what makes it tick, and the book says it "inflicts ongoing necrotic
    // damage".
    tags: [TAG.affliction, TAG.dot, TAG.poison, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.9, cap: 4.5, stackCap: 5, dur: [14, 22], tickEvery: 1,
    canonOf: 'haemorrhage',
    elements: ['shadow', 'nature'], levers: ['linger', 'siphon', 'raw'],
    pickWeight: 4,
    blurb: 'inflicting ongoing necrotic damage until the poison is cleansed',
  },

  // The silver rung, and the one that makes the vehicle rule a rule rather
  // than a wall. `negatesImmunity` is read at the ONE door every condition
  // walks through, beside the subtype check it is written to beat.
  bloodFromStone: {
    key: 'bloodFromStone', label: 'Blood From a Stone', icon: 'stackSin', color: '#ad1457',
    tags: [TAG.affliction],
    negatesImmunity: ['blood', 'poison'],
    // "Cannot be cleansed while any blood or poison affliction is in effect."
    // By TAG rather than by key, which is what the canon line says and what
    // `cleanseLockedBy` -- which names keys -- could not express.
    cleanseLockedByTag: ['blood', 'poison'],
    per: 0, cap: 0, stackCap: 1, dur: [16, 26],
    canonOf: 'haemorrhage',
    elements: ['shadow'], levers: ['siphon', 'absolve'],
    pickWeight: 4,
    blurb: 'opening the target to blood and poison whatever it is made of',
  },

  // "[Bleeding] can stack." See the note above for why this raises the
  // ceiling rather than granting a thing bleed already does.
  exsanguination: {
    key: 'exsanguination', label: 'Exsanguination', icon: 'bleeding', color: '#b71c1c',
    tags: [TAG.affliction, TAG.wounding, TAG.blood],
    bleedCapBonus: 4,
    per: 0, cap: 0, stackCap: 1, dur: [14, 22],
    canonOf: 'haemorrhage',
    elements: ['shadow', 'physical'], levers: ['siphon', 'linger'],
    pickWeight: 4,
    blurb: "letting the target's bleeding run deeper than a body should allow",
  },

  // =========================================================================
  // ROUND 227 -- THE LAST OF THE SIMULACRUM ITEMS.
  //
  // The user, item 14.2, given as one of three worked examples of what a
  // duplication confluence should produce:
  //
  //   "a doom stone granting a debuff that makes enemies copy themselves
  //    every 20 damage, copies explode"
  //
  // Round 222 built the other two -- a copy of you that answers back when
  // struck, and a blood clone that leeches -- and wrote this one down instead
  // of half-building it: "That is a monster-spawning affliction rather than a
  // summon, it is a genuinely new runtime." It is, and this is it.
  //
  // THE NUMBER IS HIS, and it is the whole mechanic: twenty damage, one copy.
  // Everything else here is the arithmetic that stops twenty damage from
  // filling the screen -- a copy is a fraction of the original, a copy cannot
  // fracture in its turn, and there is a ceiling per victim. Without those
  // three an affliction on a boss is a crash, and the user asked for a
  // mechanic rather than a denial of service.
  fracturing: {
    key: 'fracturing', label: 'Fracturing', icon: 'stackEye', color: '#7e57c2',
    tags: [TAG.affliction, TAG.curse, TAG.stacking],
    // Every twenty damage the carrier TAKES, it sheds a copy of itself.
    splitEvery: 20,
    // What a copy is worth, and what it does when it goes. A copy is weak and
    // brief; what makes it worth inflicting is that it dies loudly.
    copyHpFrac: 0.25, copyDmgFrac: 0.5, copyBlast: 110, copyBlastFrac: 0.35,
    // The ceiling, per victim. Stacks lower the threshold rather than raising
    // the ceiling -- two stacks split twice as often, not twice as far -- so a
    // stacked affliction is faster and not unbounded.
    copyCap: 4,
    per: 1, cap: 3, stackCap: 3, dur: [12, 20],
    canonOf: 'simulacrum',
    elements: ['shadow'], levers: ['turn', 'chain', 'absolve'],
    pickWeight: 4,
    blurb: 'splitting the target into copies of itself, which come apart loudly',
  },

  // =========================================================================
  // ROUND 228 -- [HAND OF THE REAPER], TRANSCRIBED.
  //
  // The user supplied Jason Asano's own kit, seventeen abilities across Dark,
  // Blood, Sin and Doom. These three rows are the Dark half's conditions and
  // they are one round because they are one ladder: the arm inflicts
  // [Creeping Death] at iron, [Rigor Mortis] at bronze, and at silver
  // [Weakness of the Flesh] -- which is the DOOR for the first two.
  //
  //   [Weakness of the Flesh] (affliction, magic): Negates immunities to
  //   disease and necrotic damage. This includes intrinsic immunities, such
  //   as from not having a biology or corporeal form. Cannot be cleansed
  //   while any disease affliction is in effect.
  //
  // Round 224 met that sentence once already, on [Blood From a Stone], and
  // said the right thing about it: "a blanket immunity with no answer is a
  // wall rather than a rule." What round 224 did NOT notice is that it only
  // built half the door. `negatesImmunity` was read at one place -- the
  // player's vehicle hull -- and the canon line it was written for is about
  // creatures: "entities without blood can bleed while under this effect."
  // Since round 164 a skeleton has refused a bleed by `subtypeResists`, and
  // for four rounds [Blood From a Stone] has had nothing to say about it.
  // So this round reads `negatesImmunity` at BOTH doors, which fixes an
  // ability shipped in 224 as a side effect of transcribing one from 228.
  // That is fault class 2 in its quietest form: written by one side, read by
  // one of the two sides that needed it.
  //
  // AND THE TAG THAT IS NOT ADDED. Canon tags both of these (affliction,
  // magic) and this table has no `magic` tag. Round 224 dropped it on [Blood
  // From a Stone] without comment; this round keeps that choice and says why.
  // A cleanse tag exists so something can NAME it as the thing it removes,
  // and nothing in the game cleanses "magic" -- adding the word would be a
  // handle with no hand on it, and the immunity-negation these two rows
  // actually do is carried by `negatesImmunity`, not by a tag.
  // =========================================================================

  // "Inflicts ongoing necrotic damage until the disease is cleansed.
  //  Additional instances have a cumulative effect."
  //
  // Word for word [Necrotoxin]'s line with `disease` where it says `poison`,
  // which is [Ruination of the Flesh]'s relationship to [Ruination of the
  // Blood] one ability along. It costs no mechanic at all: `runsUntilCleansed`
  // was built in round 221 for exactly this sentence. Three rows in this
  // table now share the shape and need three different cleanses, which is the
  // thing one `kind` enum could never say and the reason round 105 replaced
  // it.
  creepingDeath: {
    key: 'creepingDeath', label: 'Creeping Death', icon: 'poisoned', color: '#546e7a',
    tags: [TAG.dot, TAG.disease, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.9, cap: 4.5, stackCap: 5, dur: [14, 22], tickEvery: 1,
    canonOf: 'handOfTheReaper',
    elements: ['shadow', 'nature'], levers: ['linger', 'siphon', 'raw'],
    pickWeight: 4,
    blurb: 'inflicting ongoing necrotic damage until the disease is cleansed',
  },

  // "Penalty to the [Speed] and [Recovery] attributes. Additional instances
  //  have a cumulative effect. Each time a new instance is inflicted, deals
  //  necrotic damage for each existing instance."
  //
  // TWO ATTRIBUTES, ONE CONDITION, and that is the first new field. Every
  // attribute row in this table since round 57 has named exactly one --
  // `attr: 'speed'` -- and `_debuffAttr` asks `def.attr === attr`. Splitting
  // this into a [Rigor Mortis] that takes Speed and a second one that takes
  // Recovery would be two conditions where canon has one, two cleanses where
  // canon has one, and two rows to keep in step; `attrs` is the plural of a
  // field that was always going to need one, and the singular still works
  // because the reader asks about both.
  //
  // AND THE SECOND CLAUSE IS THE INTERESTING ONE: a condition that deals
  // damage at the MOMENT OF APPLICATION, scaled by what is already there.
  // Everything in this table until now has dealt its damage on a tick, so
  // stacking has meant "worse from now on". This one charges at the door, and
  // it charges more the deeper it already is -- which makes the fourth
  // application of it cost the victim more than the first three did, and
  // makes a stacked [Rigor Mortis] a reason to keep hitting rather than a
  // thing you top up. `damageOnApplyPerStack` is read in `_applyDebuff`, at
  // the same door the companion grant and the shared-affliction trade use,
  // because that is the one place every application of anything arrives.
  rigorMortis: {
    key: 'rigorMortis', label: 'Rigor Mortis', icon: 'speeddown', color: '#78909c',
    tags: [TAG.affliction, TAG.attribute, TAG.unholy, TAG.stacking],
    attrs: ['speed', 'recovery'],
    element: 'necrotic', damageOnApplyPerStack: 6,
    per: 1, cap: 3, stackCap: 3, dur: [12, 20],
    canonOf: 'handOfTheReaper',
    elements: ['shadow'], levers: ['siphon', 'anchor', 'muzzle'],
    pickWeight: 4,
    blurb: "stiffening the target's Speed and Recovery, and charging it again for every instance already there",
  },

  // The door, and the reason the other two are worth inflicting on anything
  // that is not made of meat. Two fields, both of which already had readers
  // in this file's vocabulary and one of which had only half its readers in
  // the game -- see the block note above.
  //
  // `negatesElementImmunity` is the genuinely new half. `negatesImmunity`
  // answers a TAG at the condition door ("this counts as blood, let it
  // through"); the necrotic clause is about DAMAGE, which walks a different
  // door entirely -- the typed-resistance branch of the damage path. A thing
  // with no flesh resists rot; while this is on it, it does not.
  weaknessOfTheFlesh: {
    key: 'weaknessOfTheFlesh', label: 'Weakness of the Flesh', icon: 'stackSin', color: '#8d6e63',
    tags: [TAG.affliction],
    negatesImmunity: ['disease'],
    negatesElementImmunity: ['necrotic'],
    // "Cannot be cleansed while any disease affliction is in effect." By TAG,
    // which is what the line says and what `cleanseLockedBy` -- which names
    // keys -- cannot express. Round 224 built this field for the same sentence.
    cleanseLockedByTag: ['disease'],
    per: 0, cap: 0, stackCap: 1, dur: [16, 26],
    canonOf: 'handOfTheReaper',
    elements: ['shadow'], levers: ['absolve', 'siphon'],
    pickWeight: 4,
    blurb: 'opening the target to disease and rot whatever it is made of',
  },

  // =========================================================================
  // ROUND 229 -- JASON ASANO'S BLOOD, AND THE FIVE ROWS THAT HELP.
  //
  // The second of the three rounds the user's seventeen-ability message became.
  // Four abilities -- [Blood Harvest], [Leech Bite], [Feast of Blood],
  // [Sanguine Horror] -- and eight conditions, and the eight do not divide the
  // way this table's previous hundred did.
  //
  // FIVE OF THE EIGHT ARE BOONS. Before this round the table held exactly one
  // helpful row: [Resistant], and round 221 apologised for it -- it lives here
  // "because [Vulnerable] has to be able to find it by key, and a condition
  // split across two tables is the hand-maintained pair this project keeps
  // finding broken." That was the right call for one row and it is the only
  // possible call for five, because [Blood Harvest] at silver and gold grants
  // four of them by rank and the rank ladder has to name them somewhere.
  // `uninflictedConditions()` already derives the exception from `helpful`, so
  // test_round57 asks nothing of them that it should not -- no monster carries
  // a boon, and a monster that could would be a bug rather than a gap.
  //
  // AND THE SHAPE THEY SHARE IS NEW. Two of them -- [Blood of the Immortal]
  // and [Endless Power] -- are not standing bonuses at all. They sit on you
  // doing nothing until something happens, and then ONE INSTANCE IS SPENT and
  // the rest wait their turn. Canon is explicit that this is not stacking:
  // "additional instances can be accumulated but do not have a cumulative
  // effect." That is a charge, not a buff, and nothing in this table had a
  // word for it. `consumeOn` is the word, and it is ONE mechanism with two
  // triggers rather than two mechanisms, because the only thing that differs
  // between the two rows is what wakes them.
  //
  // `TAG.drain` GETS ITS FIRST READER, four rounds after its hundredth use as
  // a word. This file has defined it since round 105 as "ongoing transfer to
  // whoever applied it" and nothing has ever read it: no row in this table
  // carried it, so the tag was a definition with no instance -- the same shape
  // as `TAG.dot`'s "runs until cleansed", which round 221 found in exactly the
  // same way, by transcribing the first row that needed it. [Thief of Life] is
  // that row here.
  // =========================================================================

  // "Bonus to [Speed] and [Recovery]. Additional instances have a cumulative
  //  effect, up to a maximum threshold."
  //
  // Two attributes, which round 228's `attrs` answered, and a SIGN, which is
  // new and is one line. `_debuffRate` has honoured `rateSign` since round 221
  // -- it is how [Resistant] rides the same reader [Vulnerable] does -- and
  // `_debuffAttr` never did, because until now nothing gave an attribute back.
  // The two readers are now symmetric, which matters more than either change:
  // a character who is both frenzied and leaden nets out in one place rather
  // than being asked twice in two.
  bloodFrenzy: {
    key: 'bloodFrenzy', label: 'Blood Frenzy', icon: 'stackFang', color: '#e53935',
    tags: [TAG.attribute, TAG.unholy, TAG.stacking], helpful: true,
    attrs: ['speed', 'recovery'], rateSign: -1,
    per: 1, cap: 3, stackCap: 3, dur: [14, 22],
    canonOf: 'bloodHarvest',
    elements: ['shadow'], levers: ['siphon', 'turn'],
    blurb: "raising the carrier's Speed and Recovery, cumulatively to a ceiling",
  },

  // "Bonus to Power and Spirit base attributes. Stacking up to a maximum
  //  threshold." -- [Blood Frenzy]'s gold-rank replacement, and deliberately
  //  the same row with the other two attributes in it. Canon gives the harvest
  //  a threshold at every rank and a DIFFERENT boon past it, so these two are
  //  a ladder rather than a pair, and writing them as one shape twice is what
  //  makes that legible.
  strengthOfMyEnemies: {
    key: 'strengthOfMyEnemies', label: 'Strength of My Enemies', icon: 'stackForge', color: '#ad1457',
    tags: [TAG.attribute, TAG.unholy, TAG.stacking], helpful: true,
    attrs: ['power', 'spirit'], rateSign: -1,
    per: 1, cap: 3, stackCap: 3, dur: [16, 26],
    canonOf: 'bloodHarvest',
    elements: ['shadow'], levers: ['siphon', 'raw'],
    blurb: "raising the carrier's Power and Spirit, cumulatively to a ceiling",
  },

  // "On suffering damage, an instance is consumed to grant a powerful but
  //  short-lived heal-over-time effect. Additional instances can be
  //  accumulated but DO NOT have a cumulative effect."
  //
  // The first row in this table that is a CHARGE rather than a condition. It
  // does nothing while it sits there; the blow that lands is what spends it.
  // `per: 0` is how the second sentence is kept honest -- a row with no
  // per-stack magnitude has nothing to accumulate, so "accumulated but not
  // cumulative" falls out of the arithmetic instead of needing a flag that
  // some future reader might forget. What each instance is worth lives on
  // `grants`, which is a fixed figure by construction.
  bloodOfTheImmortal: {
    key: 'bloodOfTheImmortal', label: 'Blood of the Immortal', icon: 'stackFortune', color: '#ef5350',
    tags: [TAG.unholy, TAG.stacking], helpful: true,
    consumeOn: 'damageTaken',
    grants: { kind: 'hot', amount: 0.10, seconds: 4 },
    per: 0, cap: 0, stackCap: 5, dur: [24, 36],
    canonOf: 'bloodHarvest',
    elements: ['shadow', 'radiant'], levers: ['siphon', 'linger'],
    blurb: 'waiting to be spent -- the next wound you take closes itself',
  },

  // "On reaching low thresholds of stamina or mana, an instance is consumed to
  //  grant a brief but powerful recovery effect."
  //
  // The same mechanism, woken by a different thing, which is the whole reason
  // `consumeOn` is a field naming a trigger rather than two bespoke hooks. The
  // threshold is the one number this row needs that the other does not.
  endlessPower: {
    key: 'endlessPower', label: 'Endless Power', icon: 'stackStorm', color: '#ff7043',
    tags: [TAG.unholy, TAG.stacking], helpful: true,
    consumeOn: 'lowPool', poolThreshold: 0.2,
    grants: { kind: 'recover', amount: 0.25 },
    per: 0, cap: 0, stackCap: 5, dur: [24, 36],
    canonOf: 'bloodHarvest',
    elements: ['shadow', 'lightning'], levers: ['siphon', 'turn'],
    blurb: 'waiting to be spent -- the moment you run dry, you do not',
  },

  // "Your drain effects are more powerful. Additional instances have a
  //  cumulative effect."
  //
  // THE OTHER DIRECTION, and that is the only interesting thing about it.
  // `amplifyTagged` has meant "what the CARRIER SUFFERS is worse" since round
  // 224 -- [Sacrificial Victim] is read on the victim, at the two places a
  // drain is paid. This row is on the person DOING the draining, and it is
  // read at the same two places by the same arithmetic from the other side.
  // One field name would have been two meanings, so it has its own:
  // `amplifiesOwn`.
  bloodGlutton: {
    key: 'bloodGlutton', label: 'Blood Glutton', icon: 'stackSwarm', color: '#b71c1c',
    tags: [TAG.amplify, TAG.unholy, TAG.stacking], helpful: true,
    amplifiesOwn: { drain: 0.25 },
    per: 0.25, cap: 0.75, stackCap: 3, dur: [14, 22],
    canonOf: 'feastOfBlood',
    elements: ['shadow'], levers: ['siphon', 'raw'],
    blurb: "deepening every drain the carrier deals, cumulatively",
  },

  // ---- and the three that are done TO somebody ----------------------------

  // "When [Bleeding] is negated, an instance of [Leech Toxin] on the target is
  //  consumed to reapply [Bleeding]. Additional instances can be accumulated."
  //
  // Round 105 built the machinery this needs and could not have known it: the
  // whole point of `woundAbsorb` is that a wounding condition "absorbs and
  // negates an amount of incoming healing, AFTER WHICH THIS AFFLICTION
  // IMMEDIATELY ENDS", and `_absorbWounding` is the one place in the game where
  // a bleed is negated rather than expiring. So the canon sentence has exactly
  // one site, and `reappliesOnNegated` names the condition to put back.
  //
  // WHICH MAKES A HEALER'S DECISION WORSE IN THE GOOD WAY. Healing through a
  // bleed has been a real cost since round 105 -- you spend the healing to
  // close it -- and this says the spend buys nothing while the toxin holds.
  // The answer is a cleanse rather than a bigger heal, which is the choice the
  // line exists to create.
  leechToxin: {
    key: 'leechToxin', label: 'Leech Toxin', icon: 'stackVenom', color: '#7cb342',
    tags: [TAG.affliction, TAG.poison, TAG.blood, TAG.stacking],
    reappliesOnNegated: 'bleed',
    per: 0, cap: 0, stackCap: 5, dur: [18, 28],
    canonOf: 'leechBite',
    elements: ['shadow', 'nature'], levers: ['siphon', 'linger'],
    pickWeight: 4,
    blurb: 'holding the wound open -- close the bleeding and it starts again',
  },

  // "Subject's stamina and mana costs for magical abilities are increased. The
  //  effect of drain abilities used on them is increased. Bleed effects on them
  //  cause mana loss commensurate with blood loss."
  //
  // Three clauses, three fields, and only the middle one already had a reader
  // (`amplifyTagged`, round 224). The other two are both small and both go at
  // a door that already exists: `costMult` in `_payAbilityCost`, which is the
  // one place an ability's price is paid, and `bleedDrainsMana` at the
  // condition tick, which is the one place blood is actually lost.
  //
  // `costMult` IS ASKED OF ABILITIES AND NOT OF SWINGS, which is what canon
  // says -- "for magical abilities" -- and the two prices are charged in two
  // different functions, so the narrower reading costs nothing to honour.
  taintedMeridians: {
    key: 'taintedMeridians', label: 'Tainted Meridians', icon: 'stackSpore', color: '#827717',
    tags: [TAG.affliction, TAG.poison],
    costMult: 0.35,
    amplifyTagged: { drain: 0.25 },
    bleedDrainsMana: 1,
    per: 0, cap: 0, stackCap: 1, dur: [16, 26],
    canonOf: 'leechBite',
    elements: ['shadow', 'nature'], levers: ['muzzle', 'siphon'],
    pickWeight: 4,
    blurb: 'fouling the channels -- everything costs more, and bleeding costs mana too',
  },

  // "Ongoing health drain effect."
  //
  // Six words, and they are the first instance of a tag this file has defined
  // since round 105. `TAG.drain` reads "ongoing transfer to whoever applied
  // it" and no row has ever carried it, so nothing ever read it -- a
  // definition with no instance, which is how round 221 found `TAG.dot`'s
  // "runs until cleansed" sitting unbuilt for a hundred and sixteen rounds.
  //
  // A TRANSFER IS NOT A DOT, and that distinction is the reason this is worth
  // the field rather than another necrotic tick. The damage is the same damage;
  // what is new is that it goes SOMEWHERE -- the instance already records its
  // `source` (debuff reflect has needed it since round 57), so the receiver is
  // known and does not have to be inferred. `drainFrac` is how much of the tick
  // arrives, which is less than all of it: a transfer that healed the caster
  // for the full tick would make an affliction skirmisher unkillable by
  // attrition, and the whole character of this kit is that it pays for what it
  // takes.
  thiefOfLife: {
    key: 'thiefOfLife', label: 'Thief of Life', icon: 'stackRend', color: '#d81b60',
    tags: [TAG.dot, TAG.curse, TAG.drain],
    element: 'necrotic', drainFrac: 0.5,
    per: 0.7, cap: 2.1, stackCap: 3, dur: [14, 22], tickEvery: 1,
    canonOf: 'leechBite',
    elements: ['shadow'], levers: ['siphon', 'linger', 'absolve'],
    pickWeight: 4,
    blurb: 'bleeding the target away into whoever put it there',
  },

  // =========================================================================
  // ROUND 230 -- JASON ASANO'S SIN, AND THE DOOR MARKED "CLEANSE".
  //
  // The third of the rounds the user's seventeen-ability message became, and it
  // is SIN alone rather than Sin and Doom together. Round 229's note said the
  // two could not be split; that was wrong in one direction and worth
  // correcting rather than quietly changing. The thirteen conditions cannot be
  // divided ARBITRARILY, but the dependency between the two halves runs ONE
  // WAY: every Doom ability keys off [Penance] or [Sin] and nothing in Sin
  // needs a Doom condition. So Sin ships complete -- [Penance] exists, is
  // granted by [Feast of Absolution]'s bronze rung, and has a carrier -- and
  // Doom is built on top of it next round with its own five, including the
  // butterflies, which are a genuinely new runtime in the round-227 sense.
  //
  // WHAT THIS ROUND'S ABILITIES ARE FOR, because it changes what the
  // conditions are: this is the half of the kit that CLEANSES. [Feast of
  // Absolution] removes every curse, disease, poison and unholy affliction
  // from a target and circumvents every effect that prevents cleansing;
  // [Sin Eater] banks a boon each time you resist or remove one. And three of
  // the eight rows below fire ON A CLEANSE -- which is the mechanic this table
  // has never had and the reason `_cleanseConditions` gets a hook.
  //
  // THE SHAPE THAT MAKES IT A KIT RATHER THAN A LIST. [Sin] amplifies necrotic
  // damage; [Price of Absolution] charges you for getting rid of it; [Weight of
  // Sin] charges you for being healed at all; [Mark of Sin] cannot be cleansed
  // while any [Sin] remains. So every answer to one of them is a cost paid to
  // another, and the only clean exit is removing the sin stacks first. That is
  // one ability's worth of interlock and it is why these are one round.
  // =========================================================================

  // "Deals ongoing transcendent damage. Additional instances have a cumulative
  //  effect, dropping off as damage is dealt."
  //
  // THE LAST CLAUSE IS THE NEW MECHANIC and it is the opposite of everything in
  // this table. Every condition here so far has decayed on a CLOCK -- `dur` is
  // rolled, `d.t` counts down -- or, since round 221, on a cleanse. This one
  // spends itself: each tick it deals damage takes a stack with it, so a
  // five-stack [Penance] is five ticks rather than a longer five-times-worse
  // one. `dropsOffAsDealt` is that, and it is why [Penance] is worth stacking
  // high and cannot be kept there.
  //
  // Transcendent, which in this game skips armour, resistance and ward alike
  // (round 201) and pays for it in TRANSCENDENT_DAMAGE_CUT. So a [Penance]
  // stack is small and reaches everything, which is exactly what judgement in
  // these books is.
  penance: {
    key: 'penance', label: 'Penance', icon: 'stackLight', color: '#ffe082',
    tags: [TAG.dot, TAG.holy, TAG.stacking],
    element: 'transcendent', dropsOffAsDealt: true,
    per: 0.9, cap: 5.4, stackCap: 6, dur: [16, 26], tickEvery: 1,
    canonOf: 'feastOfAbsolution',
    elements: ['radiant'], levers: ['absolve', 'fate', 'linger'],
    pickWeight: 4,
    blurb: 'dealing ongoing transcendent damage, and spending an instance each time it does',
  },

  // "Suffer necrotic damage over time. Additional instances have a cumulative
  //  effect."
  //
  // [Penance]'s unholy twin, from the same ability's silver rung, and the pair
  // is the point: [Punish] inflicts one or the other depending on what the
  // target is already carrying, so the two rows have to be the same shape in
  // opposite alignments or the branch would be a change of subject rather than
  // a choice. It does NOT drop off as dealt -- canon gives that clause to
  // [Penance] only -- which is the difference between a judgement that is
  // spent and a rot that simply runs.
  wagesOfSin: {
    key: 'wagesOfSin', label: 'Wages of Sin', icon: 'stackSin', color: '#6a1b9a',
    tags: [TAG.dot, TAG.unholy, TAG.stacking],
    element: 'necrotic', runsUntilCleansed: true,
    per: 0.85, cap: 4.25, stackCap: 5, dur: [14, 22], tickEvery: 1,
    canonOf: 'punish',
    elements: ['shadow'], levers: ['linger', 'raw', 'absolve'],
    pickWeight: 4,
    blurb: 'inflicting ongoing necrotic damage until the unholy is cleansed',
  },

  // "Suffer transcendent damage for each instance of [Sin] cleansed from you."
  //
  // The first condition in this table that fires WHEN SOMETHING IS REMOVED. A
  // hundred and seventy rounds of conditions have keyed off landing, ticking,
  // expiring and being cleansed-or-not; none has ever had anything to say about
  // the cleanse itself. `_cleanseConditions` is the single door every removal
  // walks through -- it already returns exactly the list of definitions it
  // took -- so the hook is one call at the end of a function that was already
  // collecting the answer.
  //
  // AND IT IS THE TRAP IN THE KIT. [Sin] makes necrotic damage worse, so the
  // obvious answer is to cleanse it; this charges for that answer, per stack,
  // in a damage type nothing resists. Neither carrying it nor removing it is
  // free, which is the decision the pair exists to create -- and the way out is
  // to remove them in the right ORDER, since it is the [Sin] stacks being
  // cleansed that bills you and not the absolution itself.
  priceOfAbsolution: {
    key: 'priceOfAbsolution', label: 'Price of Absolution', icon: 'stackDoom', color: '#ffb300',
    tags: [TAG.affliction, TAG.holy],
    damageOnCleansed: { key: 'sin', amount: 7, element: 'transcendent' },
    per: 0, cap: 0, stackCap: 1, dur: [18, 28],
    canonOf: 'punish',
    elements: ['radiant'], levers: ['absolve', 'fate'],
    pickWeight: 4,
    blurb: 'charging the target for every sin it manages to wash off',
  },

  // "Ongoing mana drain effect."
  //
  // [Thief of Life]'s twin, one ability along, and it is deliberately the same
  // row with one field changed. Round 229 built `TAG.drain` for the first time
  // in a hundred and twenty-four rounds; `drainPool` is what makes the tag
  // general rather than a health-only special case -- the damage is still
  // damage, and what arrives at the source is mana instead.
  //
  // WHICH IS ALSO WHY IT IS NOT "MANA DAMAGE". Monsters in this game have no
  // mana pool, so a literal reading would make the affliction do nothing at all
  // to anything the player casts it on. The reading that works on both sides of
  // the fight is the one round 57's founding rule demands: the victim pays in
  // health, the caster is paid in mana, and it means the same thing whichever
  // side is carrying it.
  thiefOfSpirit: {
    key: 'thiefOfSpirit', label: 'Thief of Spirit', icon: 'stackShard', color: '#5c6bc0',
    tags: [TAG.dot, TAG.curse, TAG.drain],
    element: 'necrotic', drainFrac: 0.5, drainPool: 'mana',
    per: 0.7, cap: 2.1, stackCap: 3, dur: [14, 22], tickEvery: 1,
    canonOf: 'punish',
    elements: ['shadow', 'radiant'], levers: ['siphon', 'muzzle', 'absolve'],
    pickWeight: 4,
    blurb: 'bleeding the target away, and paying whoever did it in mana',
  },

  // "[Integrity] (heal-over-time, mana-over-time, stamina-over-time, holy,
  //  stacking): Periodically recover a small amount of health, stamina, and
  //  mana. Additional instances have a cumulative effect."
  //
  // Three pools at once, which is the only genuinely unusual thing about it --
  // and all three already have somewhere to go. `buffs.hot`, `buffs.manaRegen`
  // and `buffs.staminaRegen` have existed since rounds 52 and 104 and tick in
  // ONE place, three lines apart. So this needs no machinery, only a field that
  // says which pools a condition gives back: `restores`.
  //
  // It is a BOON and therefore exempt from the monster-carrier rule by
  // `helpful`, derived rather than listed, the same as round 229's five.
  integrity: {
    key: 'integrity', label: 'Integrity', icon: 'stackVerdant', color: '#81c784',
    tags: [TAG.holy, TAG.stacking], helpful: true,
    restores: { health: 0.004, mana: 0.004, stamina: 0.004 },
    per: 1, cap: 5, stackCap: 5, dur: [20, 30], tickEvery: 1,
    canonOf: 'sinEater',
    elements: ['radiant'], levers: ['absolve', 'linger'],
    blurb: 'returning a little health, mana and stamina on every beat, cumulatively',
  },

  // "Target suffers transcendent damage when subjected to a holy boon,
  //  recovery, healing or cleansing effect."
  //
  // FOUR CHANNELS IN CANON AND TWO DOORS IN THIS GAME, and saying so is better
  // than pretending otherwise. Healing goes through `_healPlayer` and cleansing
  // through `_cleanseConditions`; a "holy boon" and a "recovery" are not
  // separate systems here -- a boon IS a condition with `helpful`, and recovery
  // is the regen tick. So `hurtOnBenefit` is read at the two doors that exist,
  // and the two that do not are noted rather than faked.
  //
  // It pairs with [Price of Absolution] to close the last exit: one charges for
  // cleansing, the other for being healed, so a branded target cannot simply be
  // out-sustained.
  weightOfSin: {
    key: 'weightOfSin', label: 'Weight of Sin', icon: 'holy', color: '#ffca28',
    tags: [TAG.affliction, TAG.holy],
    hurtOnBenefit: 5, element: 'transcendent',
    per: 0, cap: 0, stackCap: 1, dur: [16, 26],
    canonOf: 'castigate',
    elements: ['radiant'], levers: ['absolve', 'fate'],
    pickWeight: 4,
    blurb: 'making every kindness cost the target something',
  },

  // "Know the distance and direction of anyone bearing a [Mark of Sin] placed
  //  by you. This effect lasts as long as any mark is still in place and cannot
  //  be negated."
  //
  // The first row in this table the CASTER wears, and the first that declines to
  // be removed. `cannotBeCleansed` is read at the cleanse door beside the four
  // conditional locks already there -- and unlike those it is not escapable,
  // which is what "cannot be negated" says. That is safe only because it helps
  // its carrier and expires on its own; an unremovable affliction would be a
  // different and much worse thing, and `helpful` is what holds the two apart.
  //
  // `tracksMark` names what it shows rather than declaring a new sense:
  // `_drawMinimap` already pins monsters for `mapSense` and for a sensing
  // mount, each in its own colour, so this is a third block in an established
  // pattern rather than a fourth overlay. At any range and on any layer, which
  // is the part that makes it worth having -- every other minimap sense is
  // bounded and this one is the mark's own leash.
  marshalOfJudgement: {
    key: 'marshalOfJudgement', label: 'Marshal of Judgement', icon: 'stackMoon', color: '#ffd54f',
    tags: [TAG.holy], helpful: true,
    tracksMark: 'markOfSin', cannotBeCleansed: true,
    per: 0, cap: 0, stackCap: 1, dur: [30, 45],
    canonOf: 'castigate',
    elements: ['radiant'], levers: ['fate'],
    blurb: 'showing you everyone you have marked, wherever they have gone',
  },

  // "Negates immunity to curses. This includes intrinsic immunities such as
  //  from not having a soul or not being alive. Cannot be cleansed while any
  //  curse affliction is in effect."
  //
  // The third ability in three rounds to carry this sentence -- [Blood From a
  // Stone] for blood and poison, [Weakness of the Flesh] for disease and rot,
  // and now curses -- and the third costs NO new machinery at all, which is the
  // return on round 228 having built the door properly. `negatesImmunity` is
  // read at both the creature and the vehicle door by one predicate, and
  // `cleanseLockedByTag` has held the matching lock since round 224.
  //
  // AND IT IS THE ONE THE GAME MOST NEEDED. `SUBTYPE_IMMUNE_TAGS` gives `curse`
  // to elemental, flora and undead -- round 164's "an elemental has no soul to
  // curse" -- so until now a curse build simply had nothing to say to three of
  // the eight subtypes. Canon's own wording is almost the comment round 164
  // wrote: "such as from not having a soul or not being alive."
  mortality: {
    key: 'mortality', label: 'Mortality', icon: 'cursed', color: '#8e24aa',
    tags: [TAG.affliction],
    negatesImmunity: ['curse'],
    cleanseLockedByTag: ['curse'],
    per: 0, cap: 0, stackCap: 1, dur: [16, 26],
    canonOf: 'castigate',
    elements: ['shadow', 'radiant'], levers: ['absolve', 'fate'],
    pickWeight: 4,
    blurb: 'making the target mortal enough to curse, whatever it is',
  },

  // =========================================================================
  // ROUND 231 -- DOOM, AND THE THING THAT MAKES EVERY OTHER AFFLICTION WORSE.
  //
  // The fourth round out of the user's seventeen-ability message, and the last
  // of the three Doom SPELLS -- [Inexorable Doom], [Punition], [Verdict].
  // [Avatar of Doom] and its [Harbinger of Doom] are NOT here, and that is a
  // decision rather than an oversight: the harbinger drains mana to conjure
  // butterflies that seek enemies, carry one instance of every non-holy
  // affliction on the thing they manifested from, and burst for
  // disruptive-force when destroyed -- a spawning affliction with an
  // affliction-copying payload, which is a genuinely new runtime in exactly the
  // sense round 227 meant when it gave [Fracturing] a round of its own. It gets
  // the same, alongside the familiar's orbs, beams, dashes and
  // aura-subsumption, which are a subsystem besides.
  //
  // WHAT THIS HALF OF DOOM IS FOR, and it is the answer to what round 230
  // built: the Sin half hands out afflictions and charges for removing them.
  // This half makes the pile itself the weapon. [Inexorable Doom] DEEPENS every
  // stacking affliction already on the target, on a clock; [Punition] deals
  // damage per affliction; [Verdict] executes, harder for each [Penance]. So
  // none of the three cares what the afflictions ARE -- they care how many
  // there are, which is the first time anything in this game has been paid by
  // the count.
  //
  // AND [PENITENCE] IS ROUND 230'S HOOK PAYING OFF. `_afterCleanse` was built
  // last round for a condition that charges DAMAGE when something is cleansed;
  // this one grants an affliction instead, through the same door, by adding one
  // field. That is the return on having built the hook rather than the special
  // case -- the second of the three canon conditions round 230's note predicted
  // would arrive there.
  // =========================================================================

  // "Periodically applies an additional instance of each stacking curse,
  //  disease, poison or unholy affliction the target is suffering from. This is
  //  a curse effect. This effect cannot be cleansed while any other curse or
  //  any disease, poison, or unholy affliction is in effect."
  //
  // CANON DOES NOT NAME THIS ONE IN BRACKETS, so it is authored as the least
  // the line requires and no more -- the same treatment round 201 gave [Legacy
  // of Sin] before the user supplied its real text, and that inference survived
  // the correction. Named after its own ability, because the line is written as
  // an ongoing effect with a cleanse rule of its own and an ongoing effect with
  // a cleanse rule IS a condition in this table's vocabulary.
  //
  // `deepensTagged` IS THE NEW MECHANIC and it is the first in this table that
  // operates on OTHER conditions. A hundred and seventy rounds of rows have
  // amplified damage, cut rates, drained pools and locked cleanses; none has
  // ever reached over and added a stack to its neighbour. Which makes it the
  // most dangerous field in the file, so it carries three limits the canon line
  // does not: it only deepens rows that are ALREADY on the target (it starts
  // nothing), only ones tagged `stacking` (canon's own word), and never itself.
  // Without the third an affliction that deepens curses would deepen the curse
  // that deepens curses, and round 227 already paid for learning what an
  // unbounded self-feeding affliction looks like.
  inexorableDoom: {
    key: 'inexorableDoom', label: 'Inexorable Doom', icon: 'stackDoom', color: '#4a148c',
    tags: [TAG.affliction, TAG.curse],
    deepensTagged: [TAG.curse, TAG.disease, TAG.poison, TAG.unholy],
    // Every four seconds at iron. The gold rung's "significantly accelerated"
    // is a rank effect rather than a second row, so the interval lives here and
    // the ladder is in abilityCanon.js.
    per: 0, cap: 0, stackCap: 1, dur: [18, 28], tickEvery: 4,
    cleanseLockedByTag: [TAG.curse, TAG.disease, TAG.poison, TAG.unholy],
    canonOf: 'inexorableDoom',
    elements: ['shadow'], levers: ['linger', 'absolve', 'fate'],
    pickWeight: 4,
    blurb: 'deepening every affliction the target already carries, over and over',
  },

  // "Subject cannot be affected by teleport or non-damaging dimension effects."
  //
  // One field and one door. `_castAbility`'s dash/teleport branch is the only
  // place in the game a body is moved by a dimension effect, and it already has
  // the refusal shape this needs -- a blocked step does not burn the cooldown,
  // which round 40 built for a dash into a wall. So the affliction reuses a
  // mercy that was already there for a different reason.
  //
  // IT IS AN ANSWER TO A KIT RATHER THAN A STAT, which is why it is worth
  // having: [Path of Shadows] (round 228) is Dark's whole escape, and this is
  // Doom telling it no. The two are three rounds apart in this file and one
  // character's kit in the books.
  inescapable: {
    key: 'inescapable', label: 'Inescapable', icon: 'stackShatter', color: '#6a1b9a',
    tags: [TAG.affliction],
    blocksTeleport: true,
    per: 0, cap: 0, stackCap: 1, dur: [10, 16],
    canonOf: 'inexorableDoom',
    elements: ['shadow'], levers: ['anchor', 'muzzle'],
    pickWeight: 4,
    blurb: 'closing every door out -- no teleport, no stepping sideways',
  },

  // "Subject gains resistance to incoming boon, recovery, cleanse and
  //  heal-over-time effects. These resistances cannot be voluntarily lowered.
  //  Additional instances have a cumulative effect."
  //
  // FOUR CHANNELS, AND TWO OF THEM ALREADY HAD A READER. `healingCut` has been
  // the percentage answer to incoming healing since round 105 and covers
  // recovery and heal-over-time with it, because in this game they are the same
  // arithmetic on a different clock. `cleanseResist` is the new half and it is
  // the interesting one: a cleanse that FAILS rather than a cleanse that heals
  // less, which is a different kind of bad news and the first time anything has
  // been able to make one miss.
  //
  // "CANNOT BE VOLUNTARILY LOWERED" IS NOT BUILT AND NOT FAKED. In the books a
  // character can drop their own resistances to be healed faster; this game has
  // no such control -- resistance is a stat, not a posture -- so the clause has
  // nothing to switch off. Noted rather than given a field nothing reads, which
  // is round 220's census rule.
  persecution: {
    key: 'persecution', label: 'Persecution', icon: 'stackDeluge', color: '#ad1457',
    tags: [TAG.affliction, TAG.curse, TAG.stacking],
    healingCut: 0.12, healingCutCap: 0.6,
    cleanseResist: 0.15,
    per: 0.12, cap: 0.60, stackCap: 5, dur: [14, 22],
    canonOf: 'inexorableDoom',
    elements: ['shadow'], levers: ['muzzle', 'absolve', 'linger'],
    pickWeight: 4,
    blurb: 'turning aside help of every kind, and sometimes the cleanse with it',
  },

  // "Gain an instance of [Penance] for each curse, disease, poison or unholy
  //  effect that is cleansed from you. This is a holy effect."
  //
  // ROUND 230'S HOOK, PAYING OFF. `_afterCleanse` exists because [Price of
  // Absolution] needed to charge damage when something was removed, and round
  // 230's note said plainly that this row was the second of three canon
  // conditions that would arrive at that door. It costs one field.
  //
  // AND IT IS THE TRAP CLOSING. [Inexorable Doom] piles afflictions on;
  // [Punition] charges by the count, so you want them gone; and this bills you
  // in [Penance] for every one you remove -- which [Verdict] then executes off.
  // Every exit from the pile is an entrance to the next thing, which is what
  // this whole confluence is.
  penitence: {
    key: 'penitence', label: 'Penitence', icon: 'stackLight', color: '#ffb74d',
    tags: [TAG.affliction, TAG.holy],
    grantsOnCleansed: { tags: [TAG.curse, TAG.disease, TAG.poison, TAG.unholy], key: 'penance' },
    per: 0, cap: 0, stackCap: 1, dur: [18, 28],
    canonOf: 'punition',
    elements: ['radiant'], levers: ['absolve', 'fate'],
    pickWeight: 4,
    blurb: 'answering every affliction you shake off with a judgement instead',
  },

  // "Healing, recovery and regeneration effects have diminished potency. Base
  //  strength of this effect is very minor but scales exponentially with the
  //  enemy's level of injury. Scaling is affected by [Legacy of Sin] in the same
  //  way execute damage is. Cannot be cleansed while any instances of [Penance]
  //  are present."
  //
  // THE FIRST CONDITION IN THIS TABLE WHOSE STRENGTH DEPENDS ON THE CARRIER'S
  // HEALTH, and the shape is borrowed rather than invented: canon says the
  // scaling works "in the same way execute damage is", and this game has had an
  // execute curve since round 105 and `executeAmp` since round 221. So
  // `scalesWithInjury` reads the same two things an execute reads -- how hurt
  // the target is, and how much [Legacy of Sin] is raising that -- and applies
  // them to a healing cut instead of to damage. One curve, two uses, and the
  // canon sentence is what says they should be the same curve.
  //
  // WHICH MAKES IT THE CRUELLEST ROW IN THE FILE, deliberately: it does almost
  // nothing to a healthy target and nearly shuts off healing on a dying one, so
  // it is not a debuff you race -- it is the reason you lose the race. `base` is
  // therefore very small, and the cap is what stops it being a death sentence
  // rather than a hard fight.
  sanction: {
    key: 'sanction', label: 'Sanction', icon: 'stackWraith', color: '#f9a825',
    tags: [TAG.affliction, TAG.holy],
    healingCut: 0.05, healingCutCap: 0.7, scalesWithInjury: true,
    cleanseLockedBy: ['penance'],
    per: 0, cap: 0, stackCap: 1, dur: [16, 26],
    canonOf: 'verdict',
    elements: ['radiant'], levers: ['absolve', 'fate', 'muzzle'],
    pickWeight: 4,
    blurb: 'closing the door on healing, and closing it further the worse things get',
  },

  // =========================================================================
  // ROUND 232 -- [HARBINGER OF DOOM], AND THE THING ROUNDS 230 AND 231 BOTH
  // WROTE DOWN INSTEAD OF HALF-BUILDING.
  //
  // The last of the user's seventeen Jason Asano abilities, and the only one of
  // them that needed a round to itself. Canon, whole:
  //
  //   [Harbinger of Doom] (affliction, unholy, stacking): Continually drain mana
  //   from the victim to conjure a butterfly that seeks out nearby enemies. The
  //   butterflies are incorporeal and deal disruptive force damage in a small
  //   area when destroyed. Butterflies that contact enemies inflict one instance
  //   of each non-holy affliction present on the enemy it manifested from,
  //   INCLUDING [Harbinger of Doom]. This effect cannot be cleansed while any
  //   other non-holy affliction is in effect. Additional instances can be
  //   accumulated. At the time of manifestation, one butterfly is generated for
  //   each instance of this affliction.
  //
  // FOUR MECHANICS IN ONE ROW, which is why rounds 230 and 231 each looked at it
  // and wrote it down rather than starting it: an affliction that spends the
  // victim's own resource, spawns entities, copies an arbitrary set of
  // afflictions onto whatever those entities touch, and bursts when they die.
  // Round 227 spent a whole round on [Fracturing], which does one of those four.
  //
  // AND IT TURNED OUT TO NEED ALMOST NO NEW MACHINERY, because the game already
  // has a projectile system with homing, a carried condition, an explosion
  // radius, a typed element and a flight life -- and `_nearestMonsterWithin`
  // already takes a `from` origin and a `skip`, which is exactly "seeks out
  // nearby enemies, not the one it came out of". The four rounds of deferring
  // this bought a butterfly that is a projectile with one extra field.
  //
  // WHICH DIRECTION IT RUNS IS THE WHOLE DESIGN, and it is the opposite of every
  // other row in this file: it does not hurt its carrier much at all. It turns
  // the carrier into a factory pointed at the carrier's own neighbours. Landing
  // it on one enemy in a pack is how you fight the pack -- and the copied
  // afflictions mean the pack ends up wearing whatever you spent the fight
  // putting on that one target. That is what an affliction skirmisher's payoff
  // looks like, and it is the top of the ladder rounds 228 to 231 built.
  //
  // SO THERE IS NO MONSTER CARRIER, and that is declared rather than forgotten.
  // On the player this affliction would be a GIFT -- leak some mana, gain a
  // flock of attackers -- so `familiarOnly` derives the exception from the row,
  // exactly as `techniqueOnly` does for [Pinned]. See `uninflictedConditions`.
  // =========================================================================
  harbingerOfDoom: {
    key: 'harbingerOfDoom', label: 'Harbinger of Doom', icon: 'stackEmber', color: '#9575cd',
    tags: [TAG.affliction, TAG.unholy, TAG.stacking],
    familiarOnly: true,
    // "Continually drain mana from the victim to conjure a butterfly." One
    // manifestation every two seconds, and ONE BUTTERFLY PER INSTANCE -- canon's
    // last sentence, and the reason to stack it.
    tickEvery: 2,
    butterfly: {
      // What the manifestation costs the victim. Mana where there is mana and
      // health where there is not -- round 230's rule about [Thief of Spirit],
      // for the same reason: a condition that means one thing on the player and
      // nothing on a monster is the asymmetry round 57 forbade.
      drain: 8,
      speed: 165, life: 3.4, radius: 7, dmg: 7,
      // "deal disruptive force damage in a small area when destroyed"
      blastRadius: 95, blastFrac: 0.6, element: 'disruptive',
      color: '#b39ddb',
      // The ceiling, per carrier, and it is the [Fracturing] lesson rather than
      // a balance tweak: an affliction that spawns on a clock with no cap is a
      // denial of service wearing a card. Stacks make the flock ARRIVE FASTER
      // and no larger.
      cap: 6,
    },
    // "inflict one instance of each non-holy affliction present on the enemy it
    //  manifested from, INCLUDING [Harbinger of Doom]"
    copiesNonHoly: true,
    // "cannot be cleansed while any other non-holy affliction is in effect."
    // A COMPLEMENT rather than a list, which is new: `cleanseLockedByTag` names
    // the tags that hold a condition shut, and this line names the one tag that
    // does NOT. Written as the complement because that is what canon wrote --
    // an explicit list of the other eight would be a list to forget to update
    // the next time a cleanse tag is added, which is fault class 3.
    cleanseLockedByNonTag: [TAG.holy],
    per: 1, cap: 4, stackCap: 4, dur: [16, 26],
    canonOf: 'avatarOfDoom',
    elements: ['shadow'], levers: ['chain', 'siphon', 'turn'],
    pickWeight: 4,
    blurb: 'turning the target into a source of butterflies that carry its own afflictions to its neighbours',
  },

  // =========================================================================
  // ROUND 233 -- HUMPHREY GELLER'S MIGHT, AND THE ONE CONDITION IT NEEDS.
  //
  // A second character's kit, sent in the same breath as Jason's and deliberately
  // held until his was finished. Fifteen abilities across Magic/Shield, Might,
  // Wing and Dragon -- and the shape of the work is the OPPOSITE of the four
  // rounds just done. Jason's kit was condition-heavy: twenty-six new rows in
  // five rounds, most of them needing a new field. Humphrey's is condition-LIGHT
  // and mechanic-heavy: his [Stunned] is already `stun`, his [Burning] is already
  // `burn`, and only two of the fifteen abilities name a condition this table
  // does not have.
  //
  // So these rounds are paced by RUNTIME rather than by interlock, and this one
  // is a fair example: one trivial condition below, and three genuinely new
  // mechanics beside it -- a streak that unlocks a KIND of damage rather than
  // more of the same, a cooldown that pays itself back per enemy struck, and a
  // charge that answers the death screen.
  // =========================================================================

  // "[Vibrant Echo] (affliction, damage-over-time, magic, stacking): Inflicts
  //  ongoing resonating-force damage. Additional instances have a cumulative
  //  effect."
  //
  // The cheapest row in five rounds, and worth saying why: it is the [Necrotoxin]
  // shape with `resonating` where that says `necrotic`, and round 221's
  // `runsUntilCleansed` is deliberately NOT set -- canon does not say "until
  // cleansed" here, and the four rows that do say it earned that field by saying
  // it. A transcription that added severity the book did not write would be a
  // paraphrase in the direction this project is least able to notice.
  //
  // IT SHARES SUNDER'S ICON ON PURPOSE. Resonating force is the anti-armour
  // channel in this game -- `vsArmour: 2, vsResist: 0.5` in stats.js, twice as
  // effective against plate and half as effective against a ward, which is
  // exactly the reverse of disruptive -- and canon's own line for [Shield
  // Breaker] is "highly effective against physical defences". The game and the
  // book already agreed about this channel before the ability arrived. A
  // condition that rings through armour wearing the armour-down icon is the icon
  // doing its job rather than a collision.
  //
  // `TAG.magic` IS STILL NOT ADDED, for the fourth time across four rounds. A
  // cleanse tag exists so something can NAME it as the thing it removes, and
  // nothing in this game cleanses "magic". Round 224 dropped it without comment
  // on [Blood From a Stone]; rounds 228 and 230 said why; this says it again
  // because the alternative is a reader one day believing the omission was an
  // oversight.
  vibrantEcho: {
    key: 'vibrantEcho', label: 'Vibrant Echo', icon: 'armordown', color: '#4dd0e1',
    tags: [TAG.dot, TAG.stacking],
    element: 'resonating',
    per: 0.85, cap: 4.25, stackCap: 5, dur: [12, 20], tickEvery: 1,
    canonOf: 'shieldBreaker',
    elements: ['physical', 'lightning'], levers: ['raw', 'linger', 'anchor'],
    pickWeight: 4,
    blurb: 'ringing through the target with resonating force, cumulatively',
  },

  // =========================================================================
  // ROUND 234 -- HUMPHREY'S MAGIC AND WING, AND A PAIR THAT WAS ALWAYS A PAIR.
  //
  // [Radiant Echo] is [Vibrant Echo] in the other channel, and the two arriving
  // one round apart from two different abilities is canon's own symmetry rather
  // than ours. [Shield Breaker] rings through plate with resonating force;
  // [Spirit Reaper] tears at what has no plate to ring with disruptive force --
  // and stats.js has held those two as exact opposites (`vsArmour: 2` against
  // `vsResist: 2`) since round 105, long before either ability existed.
  //
  // So this row costs nothing and is worth having for what it completes: the
  // table now carries a stacking dot in each of the two force channels, and
  // which one a build wants is decided by what the target is wearing.
  // =========================================================================

  // "[Radiant Echo] (affliction, damage over time, magic, stacking): Deal
  //  ongoing disruptive-force damage."
  //
  // Canon gives it one sentence, so it gets one row and nothing invented around
  // it. Not `runsUntilCleansed`, for the reason round 233 gave about its twin: the
  // four rows that run until cleansed earned that field by canon saying so.
  //
  // Its icon is `shocked` rather than `armordown`, and the split is the channels
  // themselves: disruptive force is answered by WARDS, and a ward is the magical
  // defence -- so the anti-armour dot wears the armour-down icon and the
  // anti-ward one wears the one that reads as raw energy.
  radiantEcho: {
    key: 'radiantEcho', label: 'Radiant Echo', icon: 'shocked', color: '#b39ddb',
    tags: [TAG.dot, TAG.stacking],
    element: 'disruptive',
    per: 0.85, cap: 4.25, stackCap: 5, dur: [12, 20], tickEvery: 1,
    canonOf: 'spiritReaper',
    elements: ['radiant', 'shadow'], levers: ['raw', 'linger', 'muzzle'],
    pickWeight: 4,
    blurb: 'ringing through the target with disruptive force, cumulatively',
  },

  // =========================================================================
  // ROUND 235 -- NEIL DAVONE'S SHIELD, AND A ROUND THAT MOSTLY ALREADY EXISTED.
  //
  // A third character's kit, fourteen abilities across Shield, Growth, Renewal
  // and Prosperity -- and condition-light for the third time running. Two of the
  // conditions in his Shield three were ALREADY BUILT: [Vibrant Echo] arrived
  // with Humphrey's [Shield Breaker] in round 233 and [Creeping Death] with
  // Jason's [Hand of the Reaper] in round 228. Three characters, one table, and
  // the overlap is the books agreeing with themselves rather than us
  // duplicating.
  //
  // WHICH LEAVES TWO, and they are opposites in an interesting way. [Death's
  // Grip] is the fourth healing cut in this file and the first that grows with
  // a HISTORY rather than a state -- round 231's [Sanction] deepens with how
  // hurt you are NOW, and this one with how much rot you have taken since it
  // landed. [Slow Learner] does not hurt its carrier at all in the ordinary
  // sense; it makes the carrier's own attacks feed the thing it is attacking.
  // =========================================================================

  // "[Slow Learner] (affliction, magic, stacking): Retribution damage you suffer
  //  is increased. ATTACKING A BARRIER while subject to this affliction EXTENDS
  //  THE DURATION of the barrier and allows it to BLOCK AN ADDITIONAL ATTACK.
  //  Additional instances have a cumulative effect."
  //
  // THE SECOND CLAUSE IS THE ONE WORTH THE ROUND, and it is the first inversion
  // in this table: every other affliction makes the carrier worse at something,
  // and this one makes their target better. A slow learner hitting your shield
  // repairs it. Landing it on the thing that is beating on your barrier is the
  // whole point -- and it is the only condition here whose value depends
  // entirely on what the victim chooses to do next.
  //
  // Both clauses land on machinery that already existed. `amplifyTagged` has
  // read a named channel since round 224, so "retribution damage you suffer is
  // increased" is one key in that table read at the thorns payout; and
  // `kind: 'strikes'` shields have counted blocks since round 190, so "block an
  // additional attack" is one more strike on a counter that is already there.
  slowLearner: {
    key: 'slowLearner', label: 'Slow Learner', icon: 'stackFrost', color: '#4fc3f7',
    tags: [TAG.affliction, TAG.amplify, TAG.stacking],
    amplifyTagged: { retribution: 0.3 },
    // "extends the duration of the barrier and allows it to block an additional
    // attack" -- per instance, which is what `stacking` means here.
    feedsBarrier: { seconds: 1.5, strikes: 1 },
    per: 0.3, cap: 0.9, stackCap: 3, dur: [12, 20],
    canonOf: 'burstShield',
    elements: ['radiant', 'lightning'], levers: ['turn', 'bulwark', 'raw'],
    pickWeight: 4,
    blurb: "turning the target's own blows against it -- thorns bite deeper, and barriers it hits get stronger",
  },

  // "[Death's Grip] (unholy): The effects of healing are reduced. This effect is
  //  initially weak but is ENHANCED BY ANY NECROTIC DAMAGE SUFFERED by the
  //  victim."
  //
  // THE FOURTH HEALING CUT IN THIS FILE AND THE FIRST THAT REMEMBERS. [Bleeding]
  // absorbs a pool of it (round 105), [Persecution] takes a flat share and
  // [Sanction] deepens with how hurt you are right now (round 231) -- all three
  // read the present. This one reads a LEDGER: how much rot the victim has taken
  // since the grip landed, which nothing in this game has ever counted.
  //
  // AND THE PAIRING IS THE POINT, because [Reaper's Redoubt] inflicts it in the
  // same breath as [Creeping Death] -- a necrotic dot that runs until cleansed.
  // So the grip is weak on arrival and the thing beside it spends the next
  // twenty seconds making it strong, and cleansing the disease is how you stop
  // the grip getting worse rather than how you get rid of it. Two conditions
  // that are nearly nothing apart and a real problem together, which is what an
  // ability granting both at once should feel like.
  deathsGrip: {
    key: 'deathsGrip', label: "Death's Grip", icon: 'stackWraith', color: '#455a64',
    tags: [TAG.affliction, TAG.unholy],
    healingCut: 0.05, healingCutCap: 0.7,
    // The ledger, and what each point of rot on it is worth.
    growsWithNecrotic: 0.004,
    per: 0, cap: 0, stackCap: 1, dur: [18, 28],
    canonOf: 'reapersRedoubt',
    elements: ['shadow'], levers: ['muzzle', 'siphon', 'linger'],
    pickWeight: 4,
    blurb: 'closing healing down, and closing it further with every scrap of rot the target takes',
  },

  // The first condition whose amplification is PER DAMAGE TYPE. `ampTypes` is
  // read by the same amplifier reader `curse` uses; a condition with no
  // `ampTypes` amplifies everything, exactly as before.
  //
  // Why the numbers are lopsided (+5 / -2): being soaked is a liability, not
  // a defensive cooldown. Whoever applied it should be glad they did.
  wet: {
    key: 'wet', label: 'Soaked', icon: 'stackTide', color: '#4dd0e1',
    tags: [TAG.amplify, TAG.stacking, TAG.frost], amplify: 'damageTaken',
    ampTypes: { frost: 0.05, lightning: 0.05, water: 0.02, fire: -0.02, earth: -0.02 },
    per: 1, cap: 3, stackCap: 3, dur: [8, 14],
    elements: ['frost', 'nature'], levers: ['linger', 'chain', 'turn'],
    blurb: "soaking the target so cold and lightning bite deeper and fire less",
  },

  // NEW BEHAVIOURAL TAG. `suppress` is the first condition that takes away
  // abilities rather than stats: the aura goes out and nothing can be cast.
  // Diminishing returns apply, and the duration is the shortest in the table,
  // because a long one is not a debuff -- it is being spectator to a fight.
  suppressed: {
    key: 'suppressed', label: 'Suppressed', icon: 'stackWard', color: '#9575cd',
    tags: [TAG.control, TAG.suppress, TAG.curse],
    suppress: true, stopsMove: false, stopsAct: false,
    per: 1, cap: 1, stackCap: 1, dur: [2.0, 3.5], dr: true,
    elements: ['shadow', 'lightning'], levers: ['muzzle', 'turn', 'fate'],
    blurb: "smothering the target's auras and putting their abilities out of reach",
  },

  // Karma cuts BOTH ways off one stack, which is why it needed two fields
  // rather than a second condition: `karmaTo` is what whoever applied it deals
  // extra, `karmaFrom` is what the carrier deals less of to everyone else. A
  // ledger, and the person holding it is the one who gets paid.
  karma: {
    key: 'karma', label: 'Karma', icon: 'stackKarma', color: '#ffb74d',
    tags: [TAG.amplify, TAG.stacking, TAG.curse], amplify: 'karma',
    karmaTo: 0.015, karmaFrom: 0.015,
    per: 1, cap: 8, stackCap: 8, dur: [10, 20],
    elements: ['radiant', 'shadow'], levers: ['fate', 'turn', 'siphon'],
    blurb: "opening a ledger against the target -- your blows land harder, theirs land softer",
  },

  // ABILITY damage specifically, which is the half `expose` never covered:
  // a mark that raises everything is just a curse with a different icon.
  // `minimap: true` is the other half of the user's line, and it is read by
  // the minimap rather than by the damage path -- being able to SEE what you
  // marked through a wall is most of what marking is for.
  marked: {
    key: 'marked', label: 'Marked', icon: 'stackEye', color: '#f06292',
    tags: [TAG.amplify, TAG.stacking], amplify: 'damageTaken',
    ampAbility: 0.05, minimap: true,
    per: 1, cap: 5, stackCap: 5, dur: [12, 20],
    elements: ['radiant', 'shadow', 'physical'], levers: ['stalk', 'fate', 'reach'],
    blurb: "marking the target so your abilities bite deeper, and showing them on the map",
  },

  // The three plain rate cuts the taxonomy names and nothing supplied. Each is
  // the mirror of a buff that now exists, and they are rates rather than
  // attributes on purpose: `recoveryDown` already lowers the RECOVERY
  // attribute, which is not the same thing as lowering the three refill rates
  // it feeds -- the audit was right to call that a partial rather than a hit.
  dodgeDown: {
    key: 'dodgeDown', label: 'Leaden', icon: 'stackGale', color: '#90a4ae',
    tags: [TAG.rate], rate: 'dodgeChance', flat: true,
    per: 0.06, cap: 0.20, stackCap: 3, dur: [5, 10],
    elements: ['frost', 'shadow', 'earth'], levers: ['anchor', 'stalk', 'bulwark'],
    blurb: "weighting the target down so blows are harder to slip",
  },
  cooldownSlow: {
    key: 'cooldownSlow', label: 'Stalled', icon: 'stackAnticipation', color: '#b0bec5',
    tags: [TAG.rate], rate: 'cooldownRate',
    per: 0.15, cap: 0.45, stackCap: 3, dur: [6, 12],
    elements: ['shadow', 'frost', 'arcane'], levers: ['muzzle', 'turn', 'fate'],
    blurb: "stalling the target so their abilities come back slower",
  },
  enervate: {
    key: 'enervate', label: 'Enervated', icon: 'stackWraith', color: '#7e8a97',
    tags: [TAG.rate], rates: ['regenHealth', 'regenMana', 'regenStamina'],
    per: 0.20, cap: 0.60, stackCap: 3, dur: [8, 16],
    elements: ['shadow', 'nature', 'necrotic'], levers: ['siphon', 'linger', 'muzzle'],
    blurb: "enervating the target so health, mana and stamina all crawl back",
  },

  // "decrease specific damage type." Authored with NO element, which means
  // every type -- and that is the general case a specific one is composed
  // from: `composeCondition` mints [Damped Fire] off this shape with an
  // `element` set, which is what the user meant by the listed debuffs being a
  // sample. The reader matches on `element` being absent OR equal.
  dampen: {
    key: 'dampen', label: 'Damped', icon: 'stackShatter', color: '#78909c',
    tags: [TAG.rate], rate: 'dmgElement',
    per: 0.10, cap: 0.35, stackCap: 3, dur: [6, 12],
    elements: ['frost', 'shadow', 'arcane', 'physical'], levers: ['bulwark', 'turn', 'muzzle'],
    blurb: "damping the target's damage",
  },

  // ==========================================================================
  // ROUND 238 -- NEIL DAVONE'S GROWTH ESSENCE.
  //
  // Five canon abilities, four of which need a condition the table does not
  // have. What they have in common is that every one of them is aimed at
  // SOMEBODY ELSE: [Bolster] says "Cannot be used on self", [Giant's Might]
  // and [Hero's Moment] say "target ally". Growth is the first essence in the
  // game whose marquee abilities do nothing at all to the person casting them.
  // ==========================================================================

  // ===== [BOLSTER] -- THE FIRST CONDITION THAT MODIFIES ANOTHER ABILITY =====
  //
  // Canon, iron: "The next essence ability used by the target ally has
  // increased effect. This can affect parameters including damage, range and
  // number of targets, DEPENDING ON THE AFFECTED ABILITY."
  //
  // That last clause is the whole design of the row. `nextSpell` has existed
  // since round 45 and is a DAMAGE multiplier and nothing else, so a Bolster
  // built on it would silently do nothing to an ability that deals none --
  // which is most of a support kit, and Neil is a support. `effect` is read by
  // whichever of the three parameters the ability actually has; an ability with
  // all three gets all three, and one with only a radius gets the radius. The
  // per-parameter split is deliberately NOT equal: a 35% damage rise and a 35%
  // radius rise are very different amounts of ability, and area is the one that
  // compounds against a crowd.
  //
  // Canon, bronze: "Mana and stamina costs of the affected ability are reduced.
  // In the case of ongoing mana and stamina costs, ONLY costs initiated with
  // the ability are affected. Costs invoked subsequent to the ability being
  // activated are unaffected."
  //
  // `costCut` is the activation price only. That sentence is the reason it is
  // spent at `_payAbilityCost` -- the one door an activation price is paid --
  // rather than anywhere a pool is touched: a channel's per-second drain and a
  // sustained aura's upkeep both leave the pool somewhere else entirely, and a
  // discount applied there would be the clause canon explicitly excludes.
  //
  // `helpful` because it is a boon, which is also what keeps it out of
  // `uninflictedConditions` -- no monster applies this.
  bolstered: {
    key: 'bolstered', label: 'Bolstered', icon: 'stackFortune', color: '#9ccc65',
    tags: [TAG.amplify], helpful: true,
    // Spent by the next ability, not by a clock -- see `consumeOn` on
    // [Blood of the Immortal], which is the same shape aimed the other way.
    consumeOn: 'abilityCast',
    nextAbility: { damage: 0.35, radius: 0.20, targets: 1, costCut: 0.30 },
    // Nothing accumulates: canon says "the next essence ability", singular.
    per: 0, cap: 0, stackCap: 1, dur: [20, 30],
    canonOf: 'bolster',
    elements: ['nature', 'radiant'], levers: ['allies', 'raw'],
    blurb: "waiting on the ally's next ability, which will land harder, reach further and cost less",
  },

  // ===== [GIANT'S MIGHT] ====================================================
  //
  // Canon, iron: "Target ally and their equipment grow larger, gaining an
  // enhanced [Power] attribute." Bronze: "Ally also gains resistance to
  // physical damage and HIGH-MOMENTUM EFFECTS."
  //
  // The attribute half rides round 229's `attrs` + `rateSign: -1`, which is the
  // only channel in the game that moves a major attribute on a timer -- and it
  // is read for the player at `computeMinorStats` through `_debuffAttr`, so a
  // boon here reaches every derived stat rather than a hand-picked few.
  //
  // `resistTypes` and `momentumResist` are new, and the second one is the
  // interesting half. "High-momentum effects" are not damage: they are the
  // knockbacks and pulls that move you, and the game has had those on weapons
  // and projectiles since round 39 with nothing on either side able to resist
  // them. A row that wrote `resistTypes: { physical: ... }` alone would have
  // covered the first noun of the canon sentence and quietly dropped the
  // second, which is this project's fault class (2) in a data table.
  giantsMight: {
    key: 'giantsMight', label: "Giant's Might", icon: 'stackForge', color: '#8d6e63',
    tags: [TAG.attribute], helpful: true,
    attrs: ['power'], rateSign: -1,
    // Resistance to a DAMAGE TYPE, fractional, read at the player's damage
    // door. Physical only -- canon names one type and the bronze rung of
    // [Dragon Armour] is what a general non-physical clause looks like.
    resistTypes: { physical: 0.20 },
    // ...and to being MOVED. A fraction of the push, not a flat cap: a giant
    // is harder to shove, not immovable.
    momentumResist: 0.55,
    per: 6, cap: 6, stackCap: 1, dur: [90, 150],
    canonOf: 'giantsMight',
    elements: ['nature', 'physical'], levers: ['allies', 'bulwark', 'raw'],
    blurb: "grown larger, with Power to match, harder to hurt and far harder to move",
  },

  // ===== [VERDANT CAGE] -- THE FIRST CONDITION THE GROUND DECIDES ===========
  //
  // Canon, iron: "Grow vines to restrain a target. MORE EFFECTIVE IN AREAS
  // ALREADY CONTAINING PLANT LIFE." Bronze: "Binding plants have damaging
  // thorns." Silver: "Thorns inflict poison. THE TYPE OF POISON IS DETERMINED
  // BY THE SURROUNDING ENVIRONMENT."
  //
  // RESTRAINT IS NOT A STUN. `stopsMove` without `stopsAct`: canon says
  // restrain, and a caged mage still casts. [Stunned] sets both and says so.
  // `dr: true` because it is a control and round 57's diminishing returns are
  // what stop a 30-second cooldown being a permanent hold.
  //
  // `scalesWithPlantLife` and `poisonByEnvironment` are the two clauses that
  // make this row worth writing, and both are read from the WORLD rather than
  // from the caster. The trap there is specific and already documented in this
  // codebase: `_chestInATree`'s note records that `this.trees` is the viewport
  // pool and was EMPTY during the world build (0 live against 33,921 in
  // `forestTrees`), so a plant-life test written against it would measure where
  // the camera is pointing. The reader uses `forestTrees` and the tile type.
  verdantCage: {
    key: 'verdantCage', label: 'Caged', icon: 'stackVerdant', color: '#558b2f',
    kind: DEBUFF_KINDS.control,
    tags: [TAG.control, TAG.poison],
    // Held, not silenced.
    stopsMove: true, dr: true,
    // Iron scales with the ground: at full plant life the hold runs this much
    // longer and the thorns bite this much harder. Bare rock gets the floor.
    scalesWithPlantLife: { potency: 0.6, floor: 0.5 },
    // Bronze. The thorns are the damage half and exist only above iron, which
    // `rankEffects` on the exemplar states; the figure is per tick.
    thorns: 4, tickEvery: 2,
    // Silver. The KEY is not written here because the environment picks it --
    // see `_environmentPoison`. What is written here is the set it may pick
    // from, so a region can never select something that is not a poison.
    // Three, each the poison a kind of ground would actually brew: the plain
    // one where things simply grow, a rot where nothing does any more, and a
    // taint where the ambient magic is thick enough to get into the sap.
    poisonByEnvironment: ['poison', 'necrotoxin', 'taintedMeridians'],
    per: 0, cap: 0, stackCap: 1, dur: [4, 7],
    canonOf: 'verdantCage',
    elements: ['nature', 'poison'], levers: ['anchor', 'reach', 'linger'],
    pickWeight: 5,
    blurb: 'held fast in thorned vines that grow out of whatever is already growing there',
  },

  // ===== [HERO'S MOMENT] -- THE LARGEST BOON IN THE GAME, AND ITS BILL ======
  //
  // Canon, iron, in one sentence with six clauses: "Bestow a powerful boon on
  // an ally, increasing ALL ATTRIBUTES AND RESISTANCES by a significant
  // amount. They receive DAMAGE REDUCTION, their MAXIMUM MANA AND STAMINA are
  // increased and they gain ONGOING MANA AND STAMINA RECOVERY. They IGNORE THE
  // EFFECTS OF RANK-DISPARITY. When this effect ends, they are temporarily
  // debilitated, suffering THE INVERSE of all previous effects."
  //
  // Six clauses and a tail, on a 24-hour cooldown. Every clause is a separate
  // field here on purpose: this is exactly the row where a summary field
  // ("bigBoon: true") would mean the runtime reads whichever clauses somebody
  // remembered, and the four-hour played cooldown means a missing one might
  // never be noticed.
  //
  // THE RANK-DISPARITY WAIVER IS THE EXPENSIVE ONE. Round 43's gap is "a
  // statement that a Normal and a Gold are different categories of thing", and
  // round 201 deliberately refused to let an ability beat it before the books
  // forced the transcendent exception in round 237's neighbourhood. This is the
  // second exception and it is far broader -- it waives the gap in BOTH
  // directions for everything the ally does. What keeps it honest is the price:
  // extreme mana, one use a day, and a debilitation tail that is the inverse of
  // every clause above.
  //
  // `inverseOnExpiry` names the tail rather than computing it, so the bill is a
  // row someone can read, cleanse-check and balance independently. A computed
  // inverse would have been shorter and would have had no label, no icon and no
  // duration of its own.
  herosMoment: {
    key: 'herosMoment', label: "Hero's Moment", icon: 'stackLight', color: '#ffd54f',
    tags: [TAG.attribute, TAG.holy], helpful: true,
    attrs: ['power', 'spirit', 'speed', 'recovery'], rateSign: -1,
    // "all ... resistances", so no element is named: the reader treats an
    // absent element as every element, the way [Damped] does.
    resistAll: 0.25,
    damageReduction: 6,
    maxPoolPct: { mana: 0.3, stamina: 0.3 },
    // "ongoing mana and stamina recovery" -- on its own clock, because the
    // damage tick's is not available to a restoring row (see the note in
    // `_tickDebuffs`, and the rule in `conditionTableFaults` that refuses a
    // `restores` row with no `tickEvery`).
    restores: { mana: 4, stamina: 4 }, tickEvery: 3,
    ignoresRankGap: true,
    // Bronze: "Affected ally's essence abilities have increased effect." The
    // same `nextAbility` vocabulary [Bolster] introduced, standing rather than
    // spent -- which is why there is no `consumeOn` here.
    nextAbility: { damage: 0.2, radius: 0.15, targets: 1 },
    inverseOnExpiry: 'herosCost',
    per: 10, cap: 10, stackCap: 1, dur: [240, 240],
    canonOf: 'herosMoment',
    elements: ['radiant'], levers: ['allies', 'renew', 'raw'],
    blurb: 'every attribute, every resistance and the rank gap itself set aside, for as long as it lasts',
  },

  // The bill. Not `helpful`, and deliberately cleansable -- canon says
  // "temporarily debilitated", and a party with a cleanser spending it on this
  // is a real decision rather than a rule to be written around.
  //
  // The magnitudes are the inverse of the row above with the SIGN flipped and
  // nothing else changed, so the two cannot drift: `rateSign` defaults to 1
  // here, `resistAll` and `damageReduction` are negative, and the pool clauses
  // shrink what they grew. `ignoresRankGap` is simply absent -- the waiver
  // stops, it does not reverse, because a doubled rank gap is not something
  // canon's word "inverse" can reasonably be read to mean and it would be
  // instant death against anything above the ally's rank.
  // ==========================================================================
  // ROUND 239 -- HUMPHREY GELLER'S DRAGON ESSENCE.
  //
  // One condition for four abilities, because three of the four need none:
  // [Dragon Armour] is a conjuration and grants a relic, [Fire Breath] leaves
  // [Burning] which this table has carried since the beginning, and [Spartoi]
  // puts warriors in the world.
  //
  // [DRAGON'S MIGHT] IS THE ONE THAT NEEDED THE WORK, and the reason is worth
  // recording because it is the canon layer's whole purpose. Its Dragon Fire
  // clause was built in rounds 55 and 122 from the user's paraphrase --
  // "Dragon fire passive that buffs all fire into dragonfire which can't be
  // resisted" -- and that paraphrase names the BRONZE rung. Now that the book's
  // own text is in hand, the ability turns out to have three rungs:
  //
  //   iron   -- "Allies have increased [Power] and [Spirit]."
  //   bronze -- "Fire created by your essence abilities becomes Dragon Fire."
  //   silver -- "Allies have increased resistance to effects that reduce the
  //              [Power] and [Spirit] attributes."
  //
  // The game had the flashy middle one and neither of the two that bracket it,
  // including the PRIMARY effect. That is what a paraphrase does: it keeps the
  // memorable clause and drops the one the ability is actually for.
  dragonsMight: {
    key: 'dragonsMight', label: "Dragon's Might", icon: 'stackForge', color: '#ff7043',
    tags: [TAG.attribute], helpful: true,
    // Iron. The same channel [Giant's Might] and [Hero's Moment] use, and the
    // only one in the game that moves a major attribute on a timer.
    attrs: ['power', 'spirit'], rateSign: -1,
    // Silver: "increased resistance to effects that reduce the [Power] and
    // [Spirit] attributes."
    //
    // NOT a damage resistance. Round 238 built `resistTypes` and `resistAll`
    // for damage types, and this sentence is about neither: it resists a class
    // of CONDITION. Every `*Down` row in this table is tagged `attribute`, so
    // the tag is the class, and the two attributes named are the scope --
    // a Speed drain is not something Dragon's Might has an opinion about.
    attrResist: 0.5, attrResistOn: ['power', 'spirit'],
    // Standing while the aura holds, refreshed by it, so the duration only has
    // to outlive the gap between two aura ticks.
    per: 4, cap: 4, stackCap: 1, dur: [6, 6],
    canonOf: 'dragonsMightAura',
    elements: ['fire'], levers: ['allies', 'raw'],
    blurb: "an ally's Power and Spirit raised, and far harder to drain back down",
  },
  // ===== ROUND 288 -- HIS THIRD PASTE'S CONDITIONS ============================
  // Each one's text is his (canonText.js CANON_CONDITIONS); these rows are only
  // what the game reads. Where a clause needs a reader that is not a field,
  // canonRuntime5Mixin.js reads it and says so beside the reader.
  momentum: {
    key: 'momentum', label: 'Momentum', icon: 'stackForge', color: '#ffb74d',
    tags: [TAG.magic, TAG.stacking], helpful: true,
    // "When making an attack, all instances are consumed to inflict
    //  resonating-force damage ... instances are lost quickly while not moving"
    per: 3, cap: 30, stackCap: 10, dur: [6, 6],
    canonOf: 'avatarOfSpeed',
    elements: ['resonating'], levers: [],
    blurb: 'spent all at once on the next blow, as resonating force',
  },
  blessingOfAnticipation: {
    key: 'blessingOfAnticipation', label: 'Blessing of Anticipation', icon: 'stackLight', color: '#fff59d',
    tags: [TAG.holy, TAG.stacking], helpful: true,
    // "Consume instances to negate an amount of incoming damage per instance."
    per: 5, cap: 50, stackCap: 10, dur: [600, 600],
    canonOf: 'alacritysReward',
    elements: ['radiant'], levers: [],
    blurb: 'each instance turning aside a share of a blow before it lands',
  },
  agentOfKarma: {
    key: 'agentOfKarma', label: 'Agent of Karma', icon: 'holy', color: '#ffe082',
    tags: [TAG.holy, TAG.attribute, TAG.stacking], helpful: true,
    attrs: ['power', 'spirit'], rateSign: -1,
    per: 2, cap: 10, stackCap: 5, dur: [20, 20],
    canonOf: 'karmicWarrior',
    elements: ['radiant'], levers: [],
    blurb: 'raising Power and Spirit, cumulatively, to a threshold',
  },
  goodKarma: {
    key: 'goodKarma', label: 'Good Karma', icon: 'holy', color: '#aed581',
    tags: [TAG.holy, TAG.attribute, TAG.stacking], helpful: true,
    attrs: ['recovery'], rateSign: -1,
    // "Damage from enemies with [Bad Karma] is reduced": read at the blow.
    per: 2, cap: 10, stackCap: 5, dur: [30, 30],
    canonOf: 'karmicWarrior',
    elements: ['radiant'], levers: [],
    blurb: 'raising Recovery, and blunting blows from anyone carrying Bad Karma',
  },
  badKarma: {
    key: 'badKarma', label: 'Bad Karma', icon: 'unholy', color: '#8d6e63',
    tags: [TAG.affliction, TAG.holy, TAG.stacking],
    // "Suffer a small amount of retributive, transcendent damage when making
    //  an attack ... against anyone without the [Karmic Sacrifice] boon."
    per: 2, cap: 10, stackCap: 5, dur: [20, 20],
    canonOf: 'karmicWarrior',
    // ROUND 290 -- a canon technique's own condition (CI r289: 57, 238).
    techniqueOnly: true,
    elements: ['radiant'], levers: [],
    blurb: 'every attack it makes on the unprotected costing it transcendent pain',
  },
  karmicSacrifice: {
    key: 'karmicSacrifice', label: 'Karmic Sacrifice', icon: 'holy', color: '#dce775',
    tags: [TAG.holy], helpful: true,
    // "an ongoing healing effect, with strength determined by the amount of
    //  [Good Karma]" -- healed by the reader, ended when no enemy has Bad Karma.
    per: 0, cap: 0, stackCap: 1, dur: [3, 3],
    canonOf: 'karmicWarrior',
    elements: ['radiant'], levers: [],
    blurb: 'healing over time, as long as someone is carrying Bad Karma',
  },
  impervious: {
    key: 'impervious', label: 'Impervious', icon: 'stackWard', color: '#b39ddb',
    tags: [TAG.magic, TAG.stacking, TAG.rate], helpful: true,
    rate: 'resist', flat: true, rateSign: -1,
    // "damage reduction is gained against non-physical damage": the blow reader.
    per: 0.04, cap: 0.2, stackCap: 5, dur: [12, 12],
    canonOf: 'radiantFist',
    elements: ['disruptive'], levers: [],
    blurb: 'raising resistances and turning aside non-physical harm, cumulatively',
  },
  manaImbalance: {
    key: 'manaImbalance', label: 'Mana Imbalance', icon: 'resistdown', color: '#7986cb',
    tags: [TAG.affliction, TAG.magic, TAG.stacking],
    // "Mana drain abilities have an increased effect on the target."
    per: 0.2, cap: 1, stackCap: 5, dur: [12, 12],
    canonOf: 'eldritchImbalance',
    // ROUND 290 -- a canon technique's own condition (CI r289: 57, 238).
    techniqueOnly: true,
    elements: ['disruptive'], levers: [],
    blurb: 'every drain on its mana biting harder, cumulatively',
  },

  herosCost: {
    key: 'herosCost', label: 'Spent', icon: 'stackWraith', color: '#8d6e63',
    tags: [TAG.attribute],
    // The only way this row can ever arrive is the boon above lapsing. See
    // `uninflictedConditions` for why that earns an exemption from the
    // every-condition-has-a-carrier check rather than a monster to carry it.
    tailOnly: true,
    attrs: ['power', 'spirit', 'speed', 'recovery'],
    resistAll: -0.25,
    damageReduction: -6,
    maxPoolPct: { mana: -0.3, stamina: -0.3 },
    per: 10, cap: 10, stackCap: 1, dur: [60, 60],
    canonOf: 'herosMoment',
    elements: ['shadow'], levers: ['raw'],
    blurb: 'paying back everything the moment lent, and paying it all at once',
  },
};

export const DEBUFF_KEYS = Object.keys(DEBUFFS);
export const DEBUFF_LIST = DEBUFF_KEYS.map(k => DEBUFFS[k]);

/** The icon frames this file needs. status_icons.png is regenerated from this
 *  list, so a debuff added here without art fails the round's own suite rather
 *  than silently drawing frame 0 (a flame) over a frozen player. */
export const DEBUFF_ICON_KEYS = [...new Set(DEBUFF_LIST.map(d => d.icon))];

// ---------------------------------------------------------------------------
// STACKING, AND WHY EVERY DEBUFF GETS ITS OWN SLOT
//
// Before this round a monster had exactly ONE `m.dot`, so setting a wolf on
// fire cured its bleeding. That was tolerable while there were three
// afflictions and no player-side ones at all; with nineteen debuffs, four of
// which are afflictions that can plausibly land together from one kit, it is
// not. Debuffs now live in a map keyed by debuff key, so burning, bleeding and
// poisoned are three separate clocks on the same monster -- and the icon row
// over its head shows all three.
// ---------------------------------------------------------------------------

/** Total magnitude of `n` stacks, held to the debuff's own ceiling. */
export function debuffMagnitude(def, stacks = 1, scale = 1) {
  if (!def) return 0;
  const raw = def.per * Math.min(stacks, def.stackCap || 1) * scale;
  return Math.min(def.cap != null ? def.cap * scale : raw, raw);
}

/** Rolls a duration inside the debuff's band, seeded so the same ability
 *  always inflicts the same length. */
export function debuffDuration(def, roll01 = 0.5) {
  if (!def) return 0;
  const [lo, hi] = def.dur;
  return Math.round((lo + (hi - lo) * roll01) * 10) / 10;
}

/** Which debuffs an ability of this element and these levers may thematically
 *  inflict. Both halves must agree unless the ability has no levers at all, in
 *  which case the element decides on its own -- a plain fireball still burns.
 *
 *  This is the whole of "as thematically appropriate" as a function: it is why
 *  a frost bolt can freeze and a nature one cannot, and why nothing at all can
 *  inflict disease unless it is nature or shadow. */
export function thematicDebuffsFor(element, levers = []) {
  const el = element || 'physical';
  // ROUND 221 -- TWO ROWS THE GENERATOR MAY NOT HAVE, and the filter is here
  // rather than a shorter DEBUFF_LIST because both rows must stay in the
  // table: the runtime looks them up by key and a card has to be able to
  // print their labels.
  //
  //   [Resistant] HELPS its carrier. It is in this table because [Vulnerable]
  //   trades against it by key and a condition split across two tables is the
  //   hand-maintained pair this project keeps finding broken -- but an
  //   ability that "inflicted" it would be handing monsters armour.
  //
  //   [Pinned] is a TECHNIQUE'S condition, earned at silver on a mastery
  //   line. A generator that could also roll it onto any physical ability
  //   would make the rung worth nothing, which is the "one ability offered
  //   twice" fault in its other direction.
  //
  // The empty `levers: []` on both was NOT enough on its own: the fallback
  // below hands back `byElement` whenever no lever agrees, so a leverless row
  // was reachable by exactly the abilities that matched nothing.
  const byElement = DEBUFF_LIST.filter(d => d.elements.includes(el)
    && !d.helpful && !d.techniqueOnly);
  if (!levers.length) return byElement;
  const both = byElement.filter(d => d.levers.some(l => levers.includes(l)));
  // An element with no lever agreement still gets its element's shortlist,
  // because "a fire ability may burn" should not depend on which levers the
  // essence happened to pull.
  return both.length ? both : byElement;
}

/** The clause an ability's description uses. Always states the mechanic --
 *  the user's standing rule is that the NAME carries flavour and the
 *  DESCRIPTION states what happens. */
export function debuffClause(def, { stacks = 1, duration = 0, chance = 1 } = {}) {
  if (!def) return '';
  const lead = chance >= 1
    ? 'It also'
    : `Each hit has a ${Math.round(chance * 100)}% chance of`;
  const verb = chance >= 1 ? ` ${def.blurb}` : ` ${gerund(def.blurb)}`;
  const forHow = duration ? ` for ${duration}s` : '';
  const st = stacks > 1 ? `, stacking up to ${stacks} times` : '';
  // ROUND 113 -- A NAMED AFFLICTION SAYS ITS NAME.
  //
  // The thirty-two authored conditions have labels that read as adjectives --
  // "25% sundered 9.1s" is a sentence -- and the blurb alone is enough for
  // them. The user's 1,088 are proper nouns: [The Coil], [Blackened Veins],
  // [Under the Mirror]. A card that describes the mechanic and never names the
  // thing leaves the player unable to connect the pip on the target to the
  // ability that put it there, which is the whole point of naming them.
  //
  // Bracketed, which is the convention this project already uses for
  // conditions (see `conditionLine`) and the one the books use.
  const named = def.composed ? ` [${def.label}]` : '';
  return `${lead}${named}${named ? ' --' : ''}${verb}${forHow}${st}.`;
}

/** "slowing its movement" is already a gerund; "setting it alight" too. The
 *  blurbs are authored in that form precisely so both framings read, which is
 *  why this is identity rather than a stemmer that would mangle them. */
function gerund(blurb) { return blurb; }

/** Sanity: every element named by a debuff has to be a real element, or the
 *  thematic filter silently matches nothing and the debuff never rolls. Four
 *  dead ids in round 56's stone list cost a whole round's measurement to find;
 *  this is the same class of fault, caught at import. */
export const DEBUFF_UNKNOWN_ELEMENTS = (() => {
  // ROUND 105 -- every DAMAGE type now, not just the geared six. A condition
  // typed `blood` or `necrotic` is legal from this round.
  const known = new Set([...DAMAGE_TYPE_KEYS, 'physical']);
  const bad = [];
  for (const d of DEBUFF_LIST) {
    for (const e of d.elements) if (!known.has(e)) bad.push(`${d.key}:${e}`);
    if (d.element && !known.has(d.element)) bad.push(`${d.key}:element=${d.element}`);
  }
  return bad;
})();


// ===========================================================================
// ROUND 105 -- CONDITIONS AN ABILITY MINTS FOR ITSELF.
//
//   "the debuffs listed should all be added but these are also meant to be a
//    sample that can be used to generate custom debuffs for special attacks
//    and abilities. Debuffs can be multiple types and have varied effects."
//
// The twenty above are the reference set -- what a condition looks like when a
// person writes one. This is how an ability writes its own, from the same
// parts, so [Ruination of the Blood], [Leech Toxin] and [Tainted Meridians]
// are generated rather than being three more hand-written rows and then three
// more next round.
//
// THE ID HAS TO SURVIVE A SAVE. A character's debuff map stores keys, and a
// key naming a condition that no longer exists is dropped on load -- which for
// a composed condition would mean it silently vanished when the game restarted.
// So the id is a hash of the condition's own CONTENT: the same recipe always
// produces the same id, and abilities are regenerated deterministically from
// the player's slots at load time, so re-composing them re-registers exactly
// the ids the save is holding. No separate persistence, and nothing to keep in
// step with the save format.
//
// The registry is deliberately not cleared between kit rebuilds. A condition
// already on a monster must keep resolving even if the player has since
// unsocketed the stone that made it, and the entries are a few dozen bytes.
// ===========================================================================
const CONDITION_REGISTRY = new Map();

/** Stable 32-bit hash of a string. Same shape as the generator's own
 *  `stableHash`, duplicated rather than imported because debuffs.js must not
 *  depend on awakening.js -- the dependency runs the other way. */
function hashOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Build (and register) a condition from a recipe, returning its definition.
 *
 * Required: `label` and `tags`. Everything else takes the shape the twenty
 * authored conditions use, so a composed condition and a written one are the
 * same kind of object to every reader -- which is what lets the runtime, the
 * status bar, the ability card and the cleanse all treat them alike.
 */
export function composeCondition(recipe) {
  const tags = [...new Set(recipe.tags || [])];
  if (!recipe.label || !tags.length) return null;
  // ROUND 113 -- A RECIPE MAY BRING ITS OWN KEY.
  //
  // The hash below is right for a condition MINTED by an ability: two abilities
  // that compose the same thing should share it. The 1,088 named afflictions
  // are not minted, they are authored -- they arrive from the CSVs with keys
  // the user chose (`sig_venom_2`), and those keys are what a save carries and
  // what a bug report can be written about. A hashed id would make every one of
  // them unreadable and would change the moment a number was retuned, which is
  // a save-compatibility break disguised as a tweak.
  const body = {
    label: recipe.label,
    tags,
    icon: recipe.icon || 'poison',
    color: recipe.color || '#b39ddb',
    element: recipe.element || null,
    per: recipe.per ?? 2,
    cap: recipe.cap ?? (recipe.per ?? 2) * 5,
    stackCap: tags.includes(TAG.stacking) ? (recipe.stackCap ?? DEBUFF_STACK_CAP) : 1,
    dur: recipe.dur || [6, 12],
    tickEvery: recipe.tickEvery ?? 1,
    blurb: recipe.blurb || 'afflicting the target',
    composed: true,
  };
  // ROUND 105 -- the passthrough list is the composer's whole vocabulary, and
  // a field missing from it is a field a composed condition silently loses.
  // Second half added with the nine new rows: everything they introduced,
  // plus `punishOn`, `woundAbsorb` and the healing cut, which the authored
  // conditions have carried since earlier this round and which a composed
  // [Leech Toxin] or [Ruination] plainly wants.
  for (const f of ['rate', 'rates', 'attr', 'amplify', 'stopsMove', 'stopsAct', 'dr',
    'ofMaxHp', 'movingMult', 'maxHpCut', 'maxHpCutCap', 'drainPerTick',
    'punishOn', 'woundAbsorb', 'healingCut', 'healingCutCap', 'flat',
    'ampTypes', 'ampAbility', 'minimap', 'karmaTo', 'karmaFrom',
    'dotAmp', 'suppress',
    // ROUND 201 -- the three [Castigate] introduced. See CONDITION_LOCKS.
    'lockAura', 'cleanseLockedBy', 'healLockedBy', 'companionOf']) {
    if (recipe[f] !== undefined) body[f] = recipe[f];
  }
  // The id is content, not a counter: two abilities that mint the same
  // condition share it, and the same ability minted twice does not accumulate
  // registry entries.
  //
  // ROUND 105 -- hashed over the WHOLE body rather than a hand-listed subset.
  // The first version listed nine fields, which was correct for the nine
  // fields the composer could then set; the passthrough list above has since
  // grown to twenty-three, and every field left out of the hash is a pair of
  // genuinely different conditions that collide on one id and silently become
  // each other. A hand-maintained list that must stay in step with another
  // hand-maintained list is the fault this project keeps finding, so this one
  // reads the object it is actually identifying. `body` is built field-by-field
  // in a fixed order above, so the stringify is stable.
  // Tags are SORTED for the hash only: the display order is the author's
  // (`[Bleeding] (affliction, wounding, blood)` reads in the books' order),
  // but two recipes that list the same tags differently are one condition.
  const key = recipe.key
    || `c_${hashOf(JSON.stringify({ ...body, tags: tags.slice().sort() }))}`;
  const existing = CONDITION_REGISTRY.get(key);
  if (existing) return existing;
  const def = { ...body, key };
  CONDITION_REGISTRY.set(key, def);
  return def;
}

// ===========================================================================
// ROUND 113 -- THE NAMED AFFLICTIONS JOIN THE REGISTRY.
//
// The user authored 1,088 of them across 247 essence and confluence pools, and
// their answer on how they should surface was "the named affliction replaces
// the generic": a Venom essence's bolt applies [Blackened Veins], not [Poison].
//
// THEY GO THROUGH `composeCondition` RATHER THAN INTO `DEBUFFS`, and that is
// the whole design. Everything downstream -- the tick loop, the status bar, the
// ability card, the cleanse, the contagion spread -- already reads conditions
// through `conditionDef`, so a named affliction registered here needs not one
// line of new plumbing anywhere. The thirty-two authored conditions in DEBUFFS
// stay exactly as they are and remain the fallback for any source with no pool.
//
// REGISTERED LAZILY, on first ask. Eleven hundred `composeCondition` calls at
// module load would run before anything needs one, and the registry is
// deliberately never cleared, so building it on demand costs nothing and keeps
// a save that carries an affliction resolvable whether or not its pool has
// been touched this session.
let _afflictionsRegistered = false;
export function registerNamedAfflictions() {
  if (_afflictionsRegistered) return CONDITION_REGISTRY;
  _afflictionsRegistered = true;
  for (const [key, a] of Object.entries(AFFLICTIONS)) {
    // `key` is the user's own (`sig_venom_2`), not a hash -- see the note in
    // composeCondition. The pooling metadata (origin, scope, family, licence,
    // archetype, stones) is deliberately NOT passed: it decides which builds
    // can surface the affliction and is nothing to do with what it does once
    // applied, and composeCondition's passthrough list would drop it anyway.
    composeCondition({ ...a, key });
  }
  return CONDITION_REGISTRY;
}

/** Every condition the game knows right now -- the twenty authored plus
 *  whatever has been composed. The one lookup the runtime should use. */
export function conditionDef(key) {
  if (DEBUFFS[key]) return DEBUFFS[key];
  // ROUND 113 -- an unknown key may be a named affliction nothing has asked
  // for yet. One registration pass, then the ordinary lookup. Without this a
  // save carrying [Blackened Veins] would resolve to null on load and the tick
  // loop would delete it as a dangling condition.
  if (!_afflictionsRegistered && AFFLICTIONS[key]) registerNamedAfflictions();
  return CONDITION_REGISTRY.get(key) || null;
}
/**
 * ROUND 204 (item 2.7.1) -- the same lookup, by the name the player SEES.
 *
 * `conditionDef` takes a key (`punishMana_conNetwork_7`); a card printing
 * `[Balancing Ledger]` has only the label. Built once, lazily, off the same
 * registry, so there is one table and not two.
 */
let _byLabel = null;
export function conditionByLabel(label) {
  if (!label) return null;
  if (!_afflictionsRegistered) registerNamedAfflictions();
  if (!_byLabel) {
    _byLabel = new Map();
    for (const d of CONDITION_REGISTRY.values()) if (d && d.label) _byLabel.set(d.label, d);
    for (const k of Object.keys(DEBUFFS)) if (DEBUFFS[k] && DEBUFFS[k].label) _byLabel.set(DEBUFFS[k].label, DEBUFFS[k]);
  }
  return _byLabel.get(label) || null;
}

/** For suites and tools; not used in play. */
export function composedConditions() { return [...CONDITION_REGISTRY.values()]; }

/** Render a condition the way the books do, which is the convention the user
 *  chose for the cards: the bracketed name, its tags, then the mechanic. */
export function conditionLine(def) {
  if (!def) return '';
  return `[${def.label}] (${def.tags.join(', ')})`;
}
