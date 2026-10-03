// ===========================================================================
// ROUND 206 -- WHAT AN ESSENCE DEALS IN.
//
// The user, after the round-205 confluence work:
//
//   "every single essence should have opportunities for the verbs as they
//    build towards a kit ... The trick is to give every essence enough
//    different levers that no matter what it's paired with it can synergize
//    and create something that resembles a unique, thematic playstyle."
//
// And the shape they want out of it, in their own example:
//
//   "a player can take sword, fire, and blood ... and end up with sword
//    abilities that trigger bleed and fire, fire abilities that consume stacks
//    of bleed and grant sword strikes burn, and bleed abilities that drain
//    life from burning enemies and grant blade weapons extra bleed chance."
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT A PAIR TABLE.
//
// The first design for this was a table of confluence pairs. 148 essences make
// 10,878 pairs, so that table is either tiny and hand-picked (in which case
// most builds get nothing) or it is 10,878 rows nobody can maintain. It is
// also the wrong shape: the user did not ask for pairs, they asked for every
// essence to carry levers that let it meet ANYTHING.
//
// So each essence declares two small sets instead:
//
//   OFFERS -- what it reliably puts into the world.  dot:bleed, el:fire,
//             strike, heal, control, unseen, summon, shield, spend.
//   WANTS  -- what it can pay off. An essence that siphons wants `dot`; one
//             that bursts wants `stack`.
//
// Synergy is then a JOIN rather than a lookup: A offers `dot`, B wants `dot`,
// so there is an edge A->B, and that edge is what puts a clause on B's
// abilities. Nothing is written per pair, and a 149th essence synergises with
// all 148 others the moment its two sets are filled in.
//
// ---------------------------------------------------------------------------
// THIS FILE IS THE DERIVED PASS, AND SAYS SO.
//
// The user: "Lets start with the derivable pass, but keep me in the loop."
//
// Every token below is DERIVED from tables that already exist -- a family's
// element and dot from `STONE_ELEMENTS`, a family's five levers from
// `FAMILY_LEVERS` -- so this file adds no lore and invents no essence. What it
// adds is the reading of a lever as a supply and a demand, which is the one
// authored thing here and is `LEVER_OFFERS` / `LEVER_WANTS` below.
//
// Measured on the derived pass alone, before any hand-authoring:
//
//   * essence pairs sharing an element or dot outright (the only link the game
//     had before this file):                                          31.0%
//   * essence pairs connected by at least one offer/want token:        94.9%
//   * trios with at least one edge:                                  100.0%
//   * trios that close a loop (a pair feeding each other, or A->B->C->A): 98.7%
//   * trios with a full three-way loop -- the user's own example:      78.0%
//   * trios carrying a passenger (an essence that feeds nothing and is
//     fed by nothing):                                                 2.1%
//
// THE KNOWN LIMIT OF THE DERIVED PASS, stated here rather than discovered
// later: the tokens come from the FAMILY, and 148 essences share 29 families,
// so about five essences average into one profile. Dark and Sin -- two of the
// three essences in the canon Jason build -- come out identical. That is
// exactly the gap the authored pass exists to close, and it is why
// `ESSENCE_TOKENS` below is an override map that starts empty rather than a
// table that starts full.
// ===========================================================================

import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_ELEMENTS } from './essenceLevers.js';
import { FAMILY_LEVERS } from './leverRepertoire.js';

// ===========================================================================
// 1. THE VOCABULARY.
//
// A token is anything that can be OBSERVED -- "did this just happen", or "is
// this true of the target right now". That test is what keeps the list short
// and keeps it implementable: every token below is either a condition the
// game already applies, an element it already deals, or an event the runtime
// already fires.
//
// Kept deliberately small. Two essences connect when they name the SAME
// token, so a vocabulary that splits hairs ("dot:bleed" vs "dot:openWound")
// would produce a catalogue where nothing meets anything.
// ===========================================================================

/** Generic `dot` rides alongside every specific one, so a fire essence that
 *  wants "something bleeding or rotting" does not have to list all seven. */
export const TOKENS = {
  // --- what is true of the target ---------------------------------------
  dot: 'the target is taking damage over time',
  'dot:bleed': 'the target is Bleeding',
  'dot:burn': 'the target is Burning',
  'dot:frostbite': 'the target is freezing',
  'dot:venom': 'the target is Poisoned',
  'dot:decay': 'the target is rotting',
  'dot:shock': 'the target is Shocked',
  'dot:corrosion': 'the target is corroding',
  control: 'the target cannot move or cannot act',
  mark: 'the target carries an amplifier -- Marked, Cursed, Karma',
  // --- what the ability is made of --------------------------------------
  'el:fire': 'it deals fire', 'el:frost': 'it deals frost',
  'el:lightning': 'it deals lightning', 'el:nature': 'it deals nature',
  'el:shadow': 'it deals shadow', 'el:radiant': 'it deals radiant',
  'el:physical': 'it deals physical',
  // --- what you did -----------------------------------------------------
  strike: 'you landed a weapon blow',
  crit: 'you landed a critical hit',
  spend: 'you consumed something that was stacked up',
  stack: 'something of yours is stacking',
  spread: 'it reached more than the first thing it touched',
  range: 'it acted at a distance',
  // --- what is true of you ----------------------------------------------
  heal: 'you restored health', hot: 'health is restoring over time',
  shield: 'you are carrying absorption', leech: 'you take back what you deal',
  move: 'you moved, or moved sooner than you should have',
  unseen: 'you are not where the eye is',
  threat: 'you are what the pack is looking at',
  cleanse: 'something was lifted', reroll: 'the roll was asked for twice',
  summon: 'something of yours is on the field', ally: 'someone is standing with you',
  convert: 'it turned what it touched against what stands nearest',
};
export const TOKEN_KEYS = Object.keys(TOKENS);

// ===========================================================================
// 2. THE ONE AUTHORED THING: A LEVER READ AS A SUPPLY AND A DEMAND.
//
// `LEVERS` (essenceLevers.js) already says what each of the twenty-one levers
// DOES, in prose, and `FAMILY_LEVERS` already says which five each family
// reaches for. What neither says is what a lever PUTS INTO the fight and what
// it can FEED ON, which is the whole of what this file needs.
//
// So these two maps are the judgement call, and they are twenty-one rows
// rather than ten thousand precisely so they can be read and corrected in one
// sitting. Each row is the lever's own blurb, turned into supply and demand:
//
//   linger  "stays in the wound after the blow is over"   -> offers a dot
//   siphon  "takes from what it wounds and keeps it"      -> wants a wound
//   burst   "spends everything at once"                   -> wants a stack
//   stalk   "waits for the opening"                       -> wants an opening
//
// If a row here is wrong, every essence in its families is wrong, so this is
// the first thing to review and the cheapest thing to change.
// ===========================================================================

export const LEVER_OFFERS = {
  // `linger` and `stalk` both STACK what they put down -- a dot that stays in
  // the wound builds up, and a hunter that does not miss twice builds a mark.
  // Without that, `stack` was a token `burst` demanded and nothing supplied.
  linger: ['dot', 'stack'],   raw: ['strike'],        anchor: ['control'],
  muzzle: ['control'],        mend: ['heal'],         renew: ['heal', 'hot'],
  bulwark: ['shield'],        call: ['summon'],       swift: ['move'],
  shift: ['move'],            taunt: ['threat'],      reach: ['range'],
  stealth: ['unseen'],        absolve: ['cleanse'],   chain: ['spread'],
  fate: ['reroll'],           allies: ['ally'],       siphon: ['leech'],
  burst: ['spend'],           stalk: ['crit', 'mark', 'stack'], turn: ['convert'],
};

export const LEVER_WANTS = {
  // `siphon` wanting `cleanse` is THE JASON MECHANIC, and it fell out of
  // closing the vocabulary rather than being written in. The user, on the
  // canon build: "He relies on recovery of health through cleansing
  // afflictions off of enemies to restore health, mana, and stamina." A lever
  // that takes from what it wounds, paired with one that lifts what has taken
  // hold, is exactly that -- and Blood + Dark + Sin carries both.
  siphon: ['dot', 'strike', 'cleanse'],
  burst: ['dot', 'stack', 'spend', 'mark', 'leech'],
  stalk: ['unseen', 'control', 'crit', 'mark'],
  // A converted enemy is someone standing with you, which is what `allies` and
  // `call` are for. Before this, `turn` supplied `convert` to nobody.
  turn: ['control', 'summon'],
  chain: ['strike', 'spread'],        absolve: ['dot', 'control'],
  fate: ['crit', 'reroll', 'mark'],   allies: ['ally', 'heal', 'hot', 'summon', 'cleanse', 'convert'],
  mend: ['ally', 'hot'],              renew: ['ally', 'heal'],
  taunt: ['threat', 'shield'],        bulwark: ['threat', 'shield'],
  raw: ['strike'],                    anchor: ['move', 'control'],
  muzzle: ['control'],                linger: ['dot'],
  call: ['summon', 'ally', 'leech', 'convert'],
  swift: ['move'],                    shift: ['move', 'unseen'],
  reach: ['range'],                   stealth: ['unseen', 'crit'],
};

// ===========================================================================
// 3. THE AUTHORED OVERRIDES -- EMPTY ON PURPOSE.
//
// This is where the authored pass lands, one essence at a time, and it starts
// empty so that the derived pass is what ships first and can be measured
// honestly. An entry here REPLACES the family draft for that essence.
//
// The first rows to write are the ones the census says are collapsed: Sin
// should not play like Dark, Venom should not play like Lizard.
// ===========================================================================
export const ESSENCE_TOKENS = {};

// ===========================================================================
// 4. THE JOIN.
// ===========================================================================

/** What this essence puts in, and what it can pay off. */
export function tokensFor(essenceId) {
  const authored = ESSENCE_TOKENS[essenceId];
  if (authored) {
    return { offers: new Set(authored.offers || []), wants: new Set(authored.wants || []),
      source: 'authored' };
  }
  const e = ESSENCE_CATALOG[essenceId];
  if (!e) return { offers: new Set(), wants: new Set(), source: 'unknown' };
  const el = STONE_ELEMENTS[e.family] || {};
  const offers = new Set(), wants = new Set();
  if (el.element) offers.add(`el:${el.element}`);
  // The family's dot is offered both specifically and generically -- see the
  // note on TOKENS. A family with no dot offers neither, which is correct: a
  // Guard essence does not put damage over time into the fight.
  if (el.dot) { offers.add(`dot:${String(el.dot).toLowerCase()}`); offers.add('dot'); }
  for (const lever of (FAMILY_LEVERS[e.family] || [])) {
    for (const t of (LEVER_OFFERS[lever] || [])) offers.add(t);
    for (const t of (LEVER_WANTS[lever] || [])) wants.add(t);
  }
  return { offers, wants, source: 'derived' };
}

/** The tokens A puts in that B can pay off -- the edge A -> B. Directed: an
 *  essence feeding another is not the same as being fed by it, and the whole
 *  point of a loop is that the direction comes back round. */
export function edgesFrom(aId, bId, cache = null) {
  const A = (cache && cache[aId]) || tokensFor(aId);
  const B = (cache && cache[bId]) || tokensFor(bId);
  return [...A.offers].filter(t => B.wants.has(t));
}

/**
 * The whole kit as a graph.
 *
 * Returns `{ tokens, edges, loop, sustain, passengers }`:
 *
 *   edges       every A->B with the tokens that carry it
 *   loop        true when the graph closes -- a pair feeding each other, or a
 *               full three-way cycle. A build that does not close is three
 *               essences standing next to each other.
 *   sustain     the essences that turn the loop's own currency back into a
 *               resource. The user, on the canon Jason build: "He relies on
 *               recovery of health through cleansing afflictions off of
 *               enemies." A loop with no sustain node cannot pay itself back.
 *   passengers  essences that feed nothing and are fed by nothing. 2.1% of
 *               random trios have one; it is the number the authored pass
 *               exists to drive to zero.
 */
export function kitGraph(essenceIds) {
  const ids = (essenceIds || []).filter(Boolean);
  const cache = {}; for (const id of ids) cache[id] = tokensFor(id);
  const edges = [];
  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    const t = edgesFrom(a, b, cache);
    if (t.length) edges.push({ from: a, to: b, tokens: t });
  }
  const has = (a, b) => edges.some(e => e.from === a && e.to === b);
  let loop = false;
  for (const a of ids) for (const b of ids) if (a !== b && has(a, b) && has(b, a)) loop = true;
  if (!loop && ids.length >= 3) {
    for (const a of ids) for (const b of ids) for (const c of ids) {
      if (a === b || b === c || a === c) continue;
      if (has(a, b) && has(b, c) && has(c, a)) loop = true;
    }
  }
  const SUSTAIN = ['heal', 'hot', 'leech', 'cleanse', 'shield'];
  const sustain = ids.filter(id => SUSTAIN.some(t => cache[id].offers.has(t)));
  const passengers = ids.filter(id => !edges.some(e => e.from === id || e.to === id));
  return { tokens: cache, edges, loop, sustain, passengers };
}

// ===========================================================================
// 5. FAULTS.
//
// Beside the table, in this project's standing shape, so the suite can assert
// the properties rather than a roster count -- which is fault class 1 here and
// has been found four times.
// ===========================================================================

export function essenceTokenFaults() {
  const out = [];

  // --- the vocabulary is closed ------------------------------------------
  // Every token any lever names must be in TOKENS, or a lever is supplying
  // something nothing can ever ask for -- "written by one side, read by none",
  // which is the fault this project has now paid for five times.
  for (const [lever, list] of Object.entries(LEVER_OFFERS)) {
    for (const t of list) if (!TOKENS[t]) out.push(`lever ${lever} offers ${t}, which is not a token`);
  }
  for (const [lever, list] of Object.entries(LEVER_WANTS)) {
    for (const t of list) if (!TOKENS[t]) out.push(`lever ${lever} wants ${t}, which is not a token`);
  }
  // ...and every token is reachable from BOTH sides. A token nothing offers is
  // a demand no build can ever meet; one nothing wants is supply nobody spends.
  const offered = new Set(Object.values(LEVER_OFFERS).flat());
  const wanted = new Set(Object.values(LEVER_WANTS).flat());
  for (const t of TOKEN_KEYS) {
    if (t.startsWith('el:') || t.startsWith('dot:') || t === 'dot') continue;  // supplied by the element table
    if (!offered.has(t)) out.push(`nothing offers ${t}`);
    if (!wanted.has(t)) out.push(`nothing wants ${t}`);
  }

  // --- every lever is read on both sides ---------------------------------
  const levers = new Set([...Object.keys(LEVER_OFFERS), ...Object.keys(LEVER_WANTS)]);
  for (const l of levers) {
    if (!LEVER_OFFERS[l]) out.push(`lever ${l} wants something and offers nothing`);
    if (!LEVER_WANTS[l]) out.push(`lever ${l} offers something and wants nothing`);
  }

  // --- every family carrying an essence has a lever row ------------------
  // The check that would have caught alchemy. Reagent and Elixir were the only
  // essences in the game connected to nothing, for four rounds, because the
  // family was added to STONE_ELEMENTS and not to FAMILY_LEVERS.
  const families = new Set(Object.values(ESSENCE_CATALOG).map(e => e.family));
  for (const f of families) {
    if (!FAMILY_LEVERS[f]) out.push(`family ${f} carries essences and has no lever row`);
    if (!STONE_ELEMENTS[f]) out.push(`family ${f} carries essences and has no element row`);
  }

  // --- the floor: every essence can meet something -----------------------
  // The user's own requirement -- "no matter what it's paired with it can
  // synergize". An essence that offers nothing, or wants nothing, is one half
  // of every conversation it will ever be in.
  for (const id of Object.keys(ESSENCE_CATALOG)) {
    const t = tokensFor(id);
    if (t.offers.size < 2) out.push(`${id} offers ${t.offers.size} token(s); the floor is 2`);
    if (t.wants.size < 2) out.push(`${id} wants ${t.wants.size} token(s); the floor is 2`);
  }

  // --- and an authored override must use the vocabulary ------------------
  for (const [id, row] of Object.entries(ESSENCE_TOKENS)) {
    if (!ESSENCE_CATALOG[id]) out.push(`${id} has authored tokens and is not an essence`);
    for (const t of [...(row.offers || []), ...(row.wants || [])]) {
      if (!TOKENS[t]) out.push(`${id} names ${t}, which is not a token`);
    }
  }

  return out;
}
