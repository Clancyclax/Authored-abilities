// ============================================================================
// ROUND 122 -- THE AURA IS A REFLECTION OF THE BEARER.
//
// The user:
//
//   "Aura's are in many ways meant to be a reflection of the player so having
//    the Aura always have some unique aspect tied to the players essence or
//    confluence via a unique feature is a positive."
//
// and, on where the variety comes from:
//
//   "not every aura needs a debuff, but every aura should have a relevant,
//    thematic, ability and the debuff library provides a lot of that as well
//    as the type of variety I'm looking for."
//
// WHAT WAS WRONG. Measured before this round: 0 of 122 generated aura
// abilities carried any mark of the essence that made them, and 122 of 122
// took the aura table's own colour. Two players with nothing in common who
// rolled Emberfield had, in every respect the game could see, the same
// ability. The aura -- the one power the setting treats as a person's
// signature -- was the least personal thing in the kit.
//
// THE SPLIT THIS FILE MAKES. An aura now has two authors:
//
//   the TABLE   gives the FIELD its character. Emberfield burns, Rimefield
//               stiffens, Tarpit drags. 44 of them, five rungs apiece, and
//               unchanged by this file.
//   the BEARER  gives it a SIGNATURE -- one feature that is theirs, drawn
//               from their essence's own levers and its own element, and
//               carried onto whichever field they happened to roll.
//
// So a Venom adept's Emberfield is a fire that festers, and a Swift adept's
// Emberfield is a fire nobody outruns, and neither is the other.
//
// PROCEDURAL FLOOR, AUTHORED CEILING -- the user's own choice when asked.
//
//   the floor    every one of the 148 essences has core levers (measured: all
//                148, no exceptions) and a family element, so LEVER_FEATURE
//                below covers the whole catalogue with 21 entries rather than
//                148. Nothing is ever blank.
//   the ceiling  AUTHORED overrides it for the confluences worth writing by
//                hand -- the ones the books actually name.
//
// The mechanical vocabulary is deliberately the one that already exists: every
// feature's `spec` is aura FIELDS the runtime already reads (round 115's 42,
// plus round 121's brand and round 122's condition), so a signature is a thing
// the game can already do, applied because of who you are. No new runtime.
// ============================================================================
import { thematicDebuffsFor, conditionDef, TAG, hasTag } from './debuffs.js';
import { elementForFamily } from './essenceLevers.js';
// ROUND 123 -- the 1,088 named afflictions, and the 247 pools that say which
// of them belong to whom. This is where a bearer's mark comes from now; see
// `signatureConditionFor` for the measurement that moved it here.
import { AFFLICTION_POOLS, AFFLICTION_BY_LABEL } from './afflictions.js';

/** Stable, seeded, and the same on every machine -- never Math.random. */
function h(s) {
  let n = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { n ^= str.charCodeAt(i); n = Math.imul(n, 16777619); }
  return n >>> 0;
}
const pick = (arr, seed) => (arr && arr.length ? arr[h(seed) % arr.length] : null);

// ---------------------------------------------------------------------------
// THE FLOOR: one feature per lever, twenty-one of them, covering 148 essences.
//
// `spec` is merged onto the aura at build time, so every value here is a field
// `_updatePassiveEffects`, `_auraBite`, `_auraTickOnBodies`, `_tickAllyAura` or
// `_recomputeDerivedStats` already reads. `noun` is the word the signature's
// NAME is built from; `blurb` states the mechanic, which is the standing rule.
//
// Sized to be felt and not to dominate: a signature is one line on a card that
// already has four, and a field that doubled in radius because of a lever would
// be the signature and the aura would be the rider.
// ---------------------------------------------------------------------------
export const LEVER_FEATURE = {
  reach: {
    noun: 'Reach',
    spec: { auraRadiusPct: 0.22 },
    blurb: 'your field carries 22% further than the ground it stands on',
    minor: { auraRadiusPct: 0.08 },
    minorBlurb: 'and carries a little further',
  },
  raw: {
    noun: 'Weight',
    spec: { brandAmplifyBonus: 0.02 },
    blurb: 'every mark you lay bites 2% deeper',
    minor: { brandAmplifyBonus: 0.01 },
    minorBlurb: 'and your marks bite a little deeper',
  },
  linger: {
    noun: 'Patience',
    spec: { lingerSeconds: 4 },
    blurb: 'what your field does to something holds 4s after they leave it',
    minor: { lingerSeconds: 2 },
    minorBlurb: 'and what it does holds on a moment after they leave',
  },
  burst: {
    noun: 'Onset',
    spec: { firstBiteMult: 1.6 },
    blurb: 'the first bite on anything newly inside lands 60% harder',
    minor: { firstBiteMult: 1.25 },
    minorBlurb: 'and opens harder on anything newly inside',
  },
  chain: {
    noun: 'Spread',
    spec: { biteArcs: 1, biteArcRange: 120 },
    blurb: 'a bite arcs to one other body standing in the field',
    minor: { biteArcs: 1, biteArcRange: 80 },
    minorBlurb: 'and a bite arcs once, close in',
  },
  siphon: {
    noun: 'Thirst',
    spec: { drainPct: 0.18 },
    blurb: '18% of what your field bites out comes back to you',
    minor: { drainPct: 0.07 },
    minorBlurb: 'and gives you back a little of what it takes',
  },
  bulwark: {
    noun: 'Bastion',
    spec: { shieldPerTick: 3 },
    blurb: 'standing in your own field lays 3 shield on you a tick',
    minor: { shieldPerTick: 1 },
    minorBlurb: 'and lays a point of shield on you a tick',
  },
  mend: {
    noun: 'Mercy',
    spec: { allyHealPerTick: 3 },
    blurb: 'allies inside it mend 3 a tick',
    minor: { allyHealPerTick: 1 },
    minorBlurb: 'and mends allies inside it a point a tick',
  },
  renew: {
    noun: 'Return',
    spec: { resourcePerTick: { resource: 'mana', amount: 2 } },
    blurb: 'your field returns 2 mana a tick to you',
    minor: { resourcePerTick: { resource: 'stamina', amount: 1 } },
    minorBlurb: 'and returns you a point of stamina a tick',
  },
  absolve: {
    noun: 'Clearing',
    spec: { cleanseEvery: 8 },
    blurb: 'every 8s your field strips one condition from you and from allies inside',
    minor: { cleanseEvery: 14 },
    minorBlurb: 'and clears a condition off you every 14s',
  },
  allies: {
    noun: 'Banner',
    spec: { allyGrant: { power: 1, dmgPct: 0.06 } },
    blurb: 'allies inside it gain 1 power and 6% damage',
    minor: { allyGrant: { power: 0, dmgPct: 0.03 } },
    minorBlurb: 'and allies inside hit 3% harder',
  },
  swift: {
    noun: 'Quickening',
    spec: { hastePct: 0.07 },
    blurb: 'allies inside it move 7% faster',
    minor: { hastePct: 0.03 },
    minorBlurb: 'and allies inside move 3% faster',
  },
  shift: {
    noun: 'Wake',
    spec: { repelForce: 2 },
    blurb: 'your field pushes what stands in it away from you',
    minor: { repelForce: 1 },
    minorBlurb: 'and nudges what stands in it away',
  },
  anchor: {
    noun: 'Hold',
    spec: { rootChance: 0.08 },
    blurb: 'a chance each tick that something inside is pinned where it stands',
    minor: { rootChance: 0.03 },
    minorBlurb: 'and occasionally pins what stands in it',
  },
  taunt: {
    noun: 'Challenge',
    spec: { tauntInField: true },
    blurb: 'what stands in your field comes for you instead of your party',
    minor: { pullForce: 1 },
    minorBlurb: 'and draws what stands in it toward you',
  },
  turn: {
    noun: 'Answer',
    spec: { thornsInField: 5 },
    blurb: 'anything that strikes you inside your own field takes 5 back',
    minor: { thornsInField: 2 },
    minorBlurb: 'and answers anything that strikes you inside it',
  },
  muzzle: {
    noun: 'Silence',
    spec: { silenceChance: 0.12 },
    blurb: 'casters inside it fail to start 12% of their casts',
    minor: { silenceChance: 0.05 },
    minorBlurb: 'and casters inside it stumble',
  },
  stalk: {
    noun: 'Regard',
    spec: { critVsInField: 0.08 },
    blurb: 'you crit 8% more against anything standing in your field',
    minor: { critVsInField: 0.03 },
    minorBlurb: 'and you crit a little more inside it',
  },
  stealth: {
    noun: 'Hush',
    spec: { revealInField: true },
    blurb: 'nothing stays hidden inside your field',
    minor: { blindPct: 0.06 },
    minorBlurb: 'and they swing at you out of it and miss more',
  },
  fate: {
    noun: 'Turning',
    spec: { markInField: true },
    blurb: 'everything inside your field is lit up as a weak point',
    minor: { critVsInField: 0.04 },
    minorBlurb: 'and you crit more against what stands in it',
  },
  call: {
    noun: 'Summons',
    spec: { spreadOnDeath: 0.5 },
    blurb: 'what dies in your field leaves the field behind at the corpse',
    minor: { spreadOnDeath: 0.25 },
    minorBlurb: 'and a corpse in it leaves a little of it behind',
  },
};
export const LEVER_FEATURE_KEYS = Object.keys(LEVER_FEATURE);

// ---------------------------------------------------------------------------
// THE CEILING: the confluences the books name, written by hand.
//
// Keyed by confluence NAME, because every confluence def shares the id
// 'confluence' -- the same reason `ESSENCE_SIGNATURES` is keyed by name (round
// 55). Anything not listed falls to the procedural floor, which for a
// confluence draws on its family's levers, so an unlisted one is never blank.
//
// These are the ones where the lore has an opinion an algorithm cannot have.
// ---------------------------------------------------------------------------
export const AUTHORED = {
  Volcano: {
    noun: 'Vent',
    spec: { brandAmplifyBonus: 0.03, lingerSeconds: 3 },
    blurb: 'the ground under your field stays hot: marks bite 3% deeper and hold 3s after they leave it',
  },
  Doom: {
    noun: 'Verdict',
    spec: { executeBelow: 0.08, markInField: true },
    blurb: 'anything under 8% health your field gets a bite of simply stops, and everything inside is lit up as a weak point',
  },
  Dragon: {
    // ===== ROUND 239 -- THE BOOK'S OWN TEXT, AT LAST =======================
    //
    // This row was written in round 122 from the user's paraphrase: "Humphry's
    // aura converts his fire damage to dragonfire which can't be resisted."
    // That is a good paraphrase and it names ONE of three rungs. Canon:
    //
    //   Effect (Iron):   Allies have increased [Power] and [Spirit].
    //   Effect (Bronze): Fire created by your essence abilities becomes
    //                    Dragon Fire.
    //   Effect (Silver): Allies have increased resistance to effects that
    //                    reduce the [Power] and [Spirit] attributes.
    //
    // So for a hundred and seventeen rounds the aura has carried the flashy
    // middle clause and neither the primary effect nor the one above it. This is
    // exactly what the canon layer is for: the paraphrase kept the memorable
    // sentence and dropped the sentence the ability is actually for.
    //
    // `allyAttrBoon` names the condition that carries both ally rungs (see
    // debuffs.js and `_auraTickOnBearer`); `unresistable` is unchanged, because
    // round 55's clamp is a careful reading of the paraphrase's "can't be
    // resisted" and canon does not contradict it.
    noun: 'Dragonfire',
    spec: { unresistable: true, brandAmplifyBonus: 0.02, allyAttrBoon: 'dragonsMight' },
    blurb: "your allies' Power and Spirit rise and are hard to drain, and what your field bites with cannot be resisted",
  },
  Gore: {
    noun: 'Opening',
    spec: { drainPct: 0.22, thornsInField: 6 },
    blurb: 'your field drinks 22% of what it takes, and answers anything that strikes you inside it',
  },
  Balance: {
    noun: 'Evenness',
    spec: { cleanseEvery: 6, allyGrant: { power: 1, dmgPct: 0.04 } },
    blurb: 'every 6s your field strips a condition from you and from allies inside, who also gain 1 power',
  },
  Omen: {
    noun: 'Foretelling',
    spec: { critVsInField: 0.1, markInField: true },
    blurb: 'you crit 10% more inside your own field, and everything in it is marked',
  },
  Swarm: {
    noun: 'Multitude',
    spec: { biteArcs: 2, biteArcRange: 140 },
    blurb: 'a bite arcs to two other bodies standing in the field',
  },
  Leviathan: {
    noun: 'Undertow',
    spec: { pullForce: 1, rootChance: 0.06 },
    blurb: 'your field drags what stands in it toward you, and sometimes holds it there',
  },
  Wrath: {
    noun: 'Grievance',
    spec: { firstBiteMult: 1.8, thornsInField: 6 },
    blurb: 'the first bite on anything newly inside lands 80% harder, and striking you inside it costs them',
  },
  Kraken: {
    noun: 'Grasp',
    spec: { pullForce: 2, silenceChance: 0.1 },
    blurb: 'your field drags what stands in it toward you, and casters in it stumble',
  },
};
export const AUTHORED_NAMES = Object.keys(AUTHORED);

// ---------------------------------------------------------------------------
// The signature's NAME, built from the essence's own motif so it reads as
// theirs. Flavour in the name, mechanic in the blurb -- the standing rule.
// ---------------------------------------------------------------------------
function nameFor(sourceName, noun, motif, seed) {
  const adj = motif && pick(motif.adjs, `${seed}|adj`);
  if (adj) {
    // "Septic Patience", "Crackling Reach" -- the essence's own adjective and
    // the lever's noun, which is the shortest true statement of what this is.
    return `${adj.charAt(0).toUpperCase()}${adj.slice(1)} ${noun}`;
  }
  return `${sourceName} ${noun}`;
}

/**
 * THE BEARER'S OWN MARK.
 *
 * ROUND 123 -- MEASURED, AND MOVED. The first cut of this drew from
 * `thematicDebuffsFor(the essence's channel)`, and across 300 generated auras
 * that produced **[Bleeding] on 52% of them**. The cause is structural rather
 * than unlucky: most essence families resolve to the `physical` channel, and
 * `physical` has exactly one affliction in the 33-entry table. So the one
 * feature whose whole job was to be personal was the same on half the
 * catalogue -- which is the opposite of the ask.
 *
 * The fix is to stop asking the six-channel table and start asking the
 * AFFLICTION POOLS, which exist for precisely this and which the user pointed
 * at by name: 1,088 named afflictions in 247 pools, one pool per essence (146
 * of the 148) and one per confluence (all 101), 27-35 entries each. A Venom
 * adept leaves [Blackened Veins]; an Echo adept leaves [The Returning Note].
 * Both resolve through `conditionDef` and apply through the same door as any
 * other condition, because round 113 registered them.
 *
 * Same-family essences share most of a pool (measured: Cat and Fox overlap 28
 * of 28), which is correct -- they ARE the same family -- and the seed still
 * usually separates them, because it picks a different member of the 28.
 *
 * Falls back to the channel table for the two essences with no pool (Gun,
 * Technology) rather than returning nothing: a signature with no mark is still
 * a signature, but a blank one would be the thing this round is fixing.
 */
export function signatureConditionFor(family, seed, sourceName = null, kind = 'essence') {
  // The pool is looked up by the source's own NAME, which is how the table is
  // keyed -- the same reason `ESSENCE_SIGNATURES` and `AUTHORED` are.
  if (sourceName) {
    const pool = AFFLICTION_POOLS.find(p => p.kind === kind && p.source === sourceName);
    if (pool && pool.afflictions && pool.afflictions.length) {
      // Prefer one that FESTERS. A pool carries afflictions of every shape and
      // the mark a person leaves should be one somebody notices; the rest of
      // the pool is the fallback rather than the target.
      const resolved = pool.afflictions
        .map(label => AFFLICTION_BY_LABEL.get(label))
        .filter(Boolean)
        .map(e => ({ key: e.key || e, def: conditionDef(e.key || e) }))
        .filter(x => x.def);
      if (resolved.length) {
        const festering = resolved.filter(x => hasTag(x.def, TAG.affliction) || hasTag(x.def, TAG.dot));
        const from = festering.length ? festering : resolved;
        const chosen = from[h(`${seed}|pool-mark`) % from.length];
        return { key: chosen.key, chance: 0.18, stacks: 2 };
      }
    }
  }
  // No pool: the channel table, which is where this started.
  const el = elementForFamily(family);
  const pool = thematicDebuffsFor((el && el.element) || 'physical');
  if (!pool.length) return null;
  const afflictions = pool.filter(d => hasTag(d, TAG.affliction) || hasTag(d, TAG.dot));
  const from = afflictions.length ? afflictions : pool;
  const def = from[h(`${seed}|signature-condition`) % from.length];
  if (!def) return null;
  return { key: def.key, chance: 0.18, stacks: 2 };
}

/**
 * The signature for a bearer, given the essence that socketed the aura and the
 * confluence their build formed (or null).
 *
 * THE CONFLUENCE WINS when there is one, because that is what the user asked
 * for -- "tied to the players essence or confluence" -- and because a build
 * that formed a confluence has an identity its three parts do not separately
 * have. An essence-only build (the common case below three essences, and every
 * slot whose essence is not in the trio's confluence) uses the essence.
 *
 * `motifOf` is passed in rather than imported, because `motifForEssence` lives
 * in awakening.js and awakening.js imports this file -- taking it as an
 * argument is what keeps that from being a cycle.
 */
export function auraSignatureFor(essDef, confDef, motifOf) {
  const src = confDef || essDef;
  if (!src) return null;
  const sourceName = src.name || 'Unknown';
  const seed = `${sourceName}|aura-signature`;
  const motif = motifOf ? motifOf(src) : null;
  const kind = confDef ? 'confluence' : 'essence';
  const mark = () => signatureConditionFor(src.family, seed, sourceName, kind);

  // The ceiling first.
  const authored = confDef ? AUTHORED[confDef.name] : null;
  if (authored) {
    return {
      source: 'confluence', sourceName, lever: null, second: null, authored: true,
      label: nameFor(sourceName, authored.noun, motif, seed),
      blurb: authored.blurb,
      spec: { ...authored.spec },
      condition: mark(),
    };
  }

  // ...then the floor. The essence's core levers are its identity; a
  // confluence has no core of its own and falls to its family's, which is
  // correct -- a Volcano confluence IS a fire-family thing.
  const levers = (motif && motif.levers) || [];
  const usable = levers.filter(l => LEVER_FEATURE[l]);
  const lever = usable.length ? usable[h(`${seed}|lever`) % usable.length] : null;
  const feature = lever ? LEVER_FEATURE[lever] : null;
  if (!feature) {
    // No lever this file has a feature for. Still not blank: the mark is the
    // signature, and every source resolves to a pool or to a channel.
    const condition = mark();
    if (!condition) return null;
    const def = conditionDef(condition.key);
    return {
      source: kind, sourceName, lever: null, second: null, authored: false,
      label: nameFor(sourceName, 'Mark', motif, seed),
      blurb: `what stands in your field is left [${def.label}]`,
      spec: {}, condition,
    };
  }

  // ROUND 123 -- A SECOND LEVER, IN ITS MINOR KEY.
  //
  // Twenty-one features across 148 essences meant twenty-one mechanical
  // shapes, and measured across 300 auras the commonest was on 13% of them.
  // Every essence carries three to five usable levers (measured: 109 have
  // three, 37 have four, 2 have five, none have fewer), so taking a SECOND one
  // at reduced strength turns 21 shapes into 284 reachable ordered pairs --
  // without inventing a single new mechanic, because a minor is the same field
  // the major already writes.
  //
  // The secondary never overwrites the primary. Where both name the same
  // field the primary is the stronger statement and keeping the smaller number
  // would be a signature that got weaker for having more in it.
  const others = usable.filter(l => l !== lever);
  const second = others.length ? others[h(`${seed}|second`) % others.length] : null;
  const minor = second ? LEVER_FEATURE[second].minor : null;
  const spec = { ...feature.spec };
  if (minor) for (const [k, v] of Object.entries(minor)) if (!(k in spec)) spec[k] = v;

  return {
    source: kind, sourceName, lever, second, authored: false,
    label: nameFor(sourceName, feature.noun, motif, seed),
    blurb: second
      ? `${feature.blurb}, ${LEVER_FEATURE[second].minorBlurb}`
      : feature.blurb,
    spec,
    condition: mark(),
  };
}

/**
 * Everything this file promises, checked -- the same shape `auraFaults` has,
 * and here for the same reason: the generator guards its inputs, this guards
 * the FILE, and the file is what ships.
 */
export function signatureFaults(ESSENCE_CATALOG, motifOf) {
  const out = [];
  for (const [lever, f] of Object.entries(LEVER_FEATURE)) {
    if (!f.noun) out.push(`${lever}: no noun for the name`);
    if (!f.blurb) out.push(`${lever}: nothing said about what it does`);
    if (!f.spec || !Object.keys(f.spec).length) out.push(`${lever}: grants nothing`);
  }
  for (const [name, a] of Object.entries(AUTHORED)) {
    if (!a.noun) out.push(`${name}: no noun`);
    if (!a.blurb) out.push(`${name}: nothing said about what it does`);
    if (!a.spec || !Object.keys(a.spec).length) out.push(`${name}: grants nothing`);
  }
  // EVERY ESSENCE GETS ONE. This is the guarantee the user asked for -- "every
  // aura should have a relevant, thematic, ability" -- and it is asserted per
  // essence rather than in total, because a total is satisfied by 147 of them
  // working and the 148th being the one somebody rolls.
  for (const [id, e] of Object.entries(ESSENCE_CATALOG || {})) {
    const sig = auraSignatureFor({ id, ...e }, null, motifOf);
    if (!sig) { out.push(`${e.name}: no aura signature at all`); continue; }
    if (!sig.label) out.push(`${e.name}: signature has no name`);
    if (!sig.blurb) out.push(`${e.name}: signature says nothing`);
    if (!Object.keys(sig.spec).length && !sig.condition) {
      out.push(`${e.name}: signature grants nothing`);
    }
    if (sig.condition && !conditionDef(sig.condition.key)) {
      out.push(`${e.name}: signature names condition "${sig.condition.key}", which does not exist`);
    }
  }
  return out;
}
