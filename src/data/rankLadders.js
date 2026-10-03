// ===========================================================================
// ROUND 202 (item 3) -- A RANK-UP EITHER SAYS SOMETHING TRUE AND NEW, OR
// SAYS NOTHING AT ALL.
//
// The user, with a screenshot of three cards in a row:
//
//   "Still seeing lots of abilities with generated filler text that has no
//    meaning or context. Review all ability generation, remove anything like
//    the screenshot. Abilities that compare themselves as better than themself
//    are nonsensical and read as AI slop. My theory is the generator is keeping
//    track of a baseline ability and then if it rolls better in some way it's
//    trying to state that. It should not tell the player that. Variation in
//    abilities is fine, but they dont need to tell players if a move is better
//    than it could have been. It has no bearing on the ability at that point."
//
// THE THEORY IS RIGHT ABOUT THE MECHANISM AND WRONG ABOUT THE TRIGGER, which
// is worth writing down because it changes what had to be fixed. Nothing
// compares a roll to a statistical baseline. What the generator compares an
// ability to is AN EARLIER RANK OF ITSELF, and the result reads identically:
//
//   Effect (iron):   The working holds a tenth further than it did.
//   Effect (bronze): The working holds a fifth further again.
//   Effect (gold):   The working holds a quarter further still.
//
// Measured over 189 kits / 3,780 abilities before this round:
//
//   * `it comes back 10% sooner` was the single most-printed sentence in the
//     game, on 14.1% of all abilities -- and 53.5% of those were PASSIVES WITH
//     NO COOLDOWN. The comment that justified keeping it said it was fine
//     because "a cooldown that comes back sooner has a referent the reader can
//     see". On more than half of them there was no referent at all.
//   * 27.6% of abilities carrying a potency label printed IDENTICAL NUMBERS at
//     iron and gold, because the field the label claimed to scale
//     (`familiarDmg`, `armorBonus`, `escort.dmg`, `regenPerSec`,
//     `cooldownReduction`) is not in essenceRank's SCALED_FIELDS. The label was
//     attached to nothing whatsoever.
//
// AND THE PROJECT HAD ALREADY DECIDED THIS ONCE. Round 103, quoting the user:
// "Abilities are still listing pointless text ... 10% stronger has no context,
// 10% stronger than what?" That round removed the potency bit from the merged
// card line and left the per-rank labels, on the stated grounds that they were
// only ever shown "at the moment a rank is announced ... This is the card,
// which is a reference." Round 190 then rebuilt the card out of the per-rank
// labels and put every one of them back on it. The rule was right; the
// regression was putting the announcement's voice on the reference.
//
// ---------------------------------------------------------------------------
// THE RULE THIS FILE ENFORCES, in three parts:
//
//   1. A RUNG NAMES A MECHANIC, not a magnitude. "It also cleanses one
//      condition" is a rank-up. "It mends a fifth further" is a percentage of
//      a number printed four lines above.
//   2. A RUNG MAY ONLY CLAIM A FIELD THE SPEC ACTUALLY HAS. `requires` is
//      checked against the finished spec, so a passive with no cooldown cannot
//      be told its cooldown improved.
//   3. A RANK WITH NOTHING TO ADD ADDS NOTHING. The card already skips an
//      empty rank line, and `Numbers now:` carries the magnitude -- which is
//      where the reader was already looking.
//
// Growth in magnitude did not go away and was never the problem: essenceRank's
// SCALED_FIELDS still scale every rank, and the card prints the scaled figures.
// What went away is the sentence announcing that they did.
// ===========================================================================

// ROUND 221 -- the mastery ladder's silver rung is a technique, and the
// technique belongs to the PROFICIENCY rather than to this table: the five
// sentences are about swords, hammers, polearms, bows and staves, and this
// file knows nothing about any of them. proficiencies.js imports nothing, so
// this dependency runs one way and cannot become a cycle.
import { MASTERY_TECHNIQUES } from './proficiencies.js';

// ===========================================================================
// 1. THE FILLER GUARD.
//
// The specific sentences are deleted below. This is the part that keeps them
// deleted: a pattern list and a predicate the suite runs over EVERY generated
// description and EVERY rank clause in a live kit. The class of fault is
// "a comparative with no referent", and naming the class rather than the
// strings is what stops the next round reinventing one.
// ===========================================================================

/** Phrases that compare an ability to itself, to a rank of itself, or to a
 *  baseline the player cannot see. Each is a regex over a lower-cased clause. */
export const FILLER_PATTERNS = [
  // The generic potency ladder, all three rungs.
  { re: /\b(further|harder|deeper|longer|wider|more)\s+(than it did|again|still)\b/, why: 'compares the ability to an earlier rank of itself' },
  { re: /\bthan it (did|otherwise would|would (normally|have))\b/, why: 'compares the ability to a version of itself the player never saw' },
  { re: /\bthan (it|they) should\b/, why: 'compares the ability to an unstated expectation' },
  { re: /\b(stronger|better|harder|further) than the \w+ would normally allow\b/, why: 'compares the ability to an unstated norm' },
  // Bare intensifiers with nothing being intensified.
  { re: /\ba little (further|deeper|more|longer|harder|faster)\b/, why: 'an intensifier with no quantity and no subject' },
  { re: /\b(somewhat|noticeably|markedly|considerably|appreciably) (more|less|better|worse|stronger|weaker)\b/, why: 'an intensifier with no quantity' },
  // A fraction word used as an adverb of degree: "it strikes a quarter
  // harder", "the guard holds a tenth further". The fraction is of the
  // ability's own printed figure, which is the thing the reader is already
  // looking at.
  { re: /\ba (tenth|fifth|quarter|third|half) (harder|further|longer|deeper|wider|more|better|stronger|faster|sooner)\b/, why: "a fraction of the ability's own printed figure" },
  // "10% stronger" with nothing named -- round 103's original complaint.
  //
  // ANCHORED AT THE START OF THE CLAUSE, which took two tries. Matching the
  // phrase anywhere deleted real information: "every ally inside 5.5 tiles
  // makes it 5% stronger, to a limit of 4" names exactly what makes it
  // stronger and by how much per ally, and is one of the better clauses in
  // the game. The fault is a clause whose WHOLE SUBJECT is the ability
  // itself -- "it works 24% harder" -- so the pattern requires that subject.
  // `more` is deliberately NOT in this list. "It sets 10% more armour between
  // you and the next hit" names exactly what there is more of, and a census
  // over 2,400 generated abilities found 83 such clauses caught as filler --
  // every one of them real information. "Harder", "better" and "stronger" have
  // no noun after them by construction; "more" almost always does.
  { re: /^(it|everything it does)\b[\w ]{0,24}\b\d+% (stronger|better|harder)\b/, why: 'a percentage with nothing to be a percentage of' },
  { re: /\beverything it does is \d+% /, why: "round 103's sentence, by name" },
  // ROUND 294 -- "the widest field in the game ... comparing to some random
  // variable which the player cant see." A superlative is a comparison with
  // every other ability, none of which is on the card.
  { re: /\bin the (game|world)\b/, why: 'compares the ability with the rest of the game' },
  { re: /\bthe (widest|fastest|slowest|longest|shortest|largest|biggest|smallest|strongest|weakest|deadliest|quickest)\b/, why: 'a superlative over abilities the player cannot see' },
  // "Moves stating what they don't do is pointless" -- a clause whose subject
  // is the ability and whose verb is negated tells the player nothing it does.
  { re: /\bit\s+(does not|doesn't|did not|has not|never|will not|won't|is not|isn't)\b/, why: 'says what the ability does not do' },
  { re: /\bnot the point\b/, why: 'says what the ability does not do' },
  // ...and a duration with no number in it.
  { re: /\bfor a (short|little|brief) (while|time)\b|\bfor a few seconds\b/, why: 'a duration with no number' },
];

// ===========================================================================
// ROUND 204c -- THE RULE THE SIX PATTERNS ABOVE ARE ALL INSTANCES OF.
//
// The user, on `Effect (iron): ... It costs a quarter less to put up.`:
//
//   "a quarter less than what!? ... At bronze that might make sense, it can be
//    cheaper than it was at iron, but at iron the ability didn't exist before
//    so that statement, just like the last 5 times I've noted similar
//    statements, is just fluff that doesn't mean anything to the player."
//
// Five times, and every previous fix added one more PHRASING to the list
// above. That list is lexical -- it knows "harder", "further", "a quarter
// harder" -- so each round it catches the sentence that was reported and
// misses the one written next. "A quarter less" was not on it. Neither was
// "half again as long", which was in the same ladder.
//
// The structural rule underneath all six:
//
//   A DELTA NEEDS A PRIOR VALUE. Iron is where an ability begins, so at iron
//   there is no prior value and every delta is a comparison to nothing.
//
// That is checkable without knowing which words the next author picks, and it
// is what `rankLadderFaults` asserts now. At BRONZE and above a delta is fine
// and is often the clearest thing a rank can say -- the user says so in the
// same message -- so the rule is scoped to the rank where it is a statement
// about nothing, rather than being a ban on deltas.
//
// Deliberately NOT applied to the prose descriptions. "Its damage rises +6%
// for every 100 paces travelled" is a relative magnitude that names exactly
// what varies it, and a rule this blunt would delete it. Rungs are short,
// subject-less sentences about the ability itself, which is what makes the
// test unambiguous there and ambiguous everywhere else.
export const RELATIVE_MAGNITUDE = [
  // "half again as long", "twice as long", "a quarter less", "25% more"
  /\b(half|twice|three times|a (tenth|fifth|quarter|third|half)) (again|as \w+|less|more|longer|shorter)\b/,
  /\b\d+% (more|less|longer|shorter|faster|slower|sooner|later|cheaper|stronger|weaker|further)\b/,
  /\b(more|less|longer|shorter|faster|slower|sooner|cheaper) (to|than|again)\b/,
  // "4 seconds are added to", "2 more of them", "it gains 3s"
  /\b(added to|are added|is added|it gains|adds \d)\b/,
  /\bworth \d+% (more|less)\b/,
  /\b(lasts|holds|runs|costs|reaches) \d+% \w+\b/,
];

/**
 * Is this rung a DELTA -- a change to a quantity, rather than a statement of
 * what the ability does? Returns the matching rule, or null.
 */
export function isRelativeMagnitude(text) {
  const t = String(text || '').toLowerCase();
  return RELATIVE_MAGNITUDE.some(re => re.test(t));
}

/** Is this clause filler? Returns the reason, or null. Case-insensitive, and
 *  it looks at ONE clause rather than a whole card, so a card that legitimately
 *  says "stronger against the unhurt: +8% per 10% of their health remaining"
 *  is not caught by the bare-percentage rule above. */
export function fillerReason(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  for (const p of FILLER_PATTERNS) if (p.re.test(t)) return p.why;
  return null;
}

// ===========================================================================
// 2. THE LADDERS.
//
// One per archetype. Each rung is {label, requires, ...fields}: the sentence,
// the spec field the rung needs before it may be offered, and whatever the
// runtime reads. A rung whose `requires` is absent from the spec is DROPPED,
// not reworded -- which is the whole of rule 2 and the reason a passive can no
// longer be told its cooldown improved.
//
// `requires` may be a field name, a list (any one of them), or null for a rung
// that stands on its own. `grants` is the field the runtime applies; it exists
// so `rankLadderFaults` can assert that no rung is a label with nothing behind
// it -- the exact fault that put "a quarter further still" on 27.6% of cards
// where the numbers never moved.
// ===========================================================================

const rung = (label, grants, requires = null) => ({ label, grants, requires });

/** ROUND 294 -- rung fields that no longer exist. An ability saved before the
 *  round still carries the aspect; it is dropped wherever aspects are read. */
export const RETIRED_RUNG_FIELDS = ['worksInSoulSpace'];
export function liveAspects(list) {
  return (list || []).filter(x => x && !RETIRED_RUNG_FIELDS.some(f => x[f]));
}

/** ROUND 220 (item 12.4) -- how much less damage a freshly-mended body takes.
 *  Exported because the rung's sentence and WorldScene's player damage path
 *  must not hold two different numbers; the rung interpolates it and the
 *  runtime imports it. */
export const MEND_GUARD_PCT = 0.20;

/** ROUND 220 -- rungs that describe a BLOW. Offered only to a spec that
 *  actually lands one.
 *
 *  The user, on [Refraction Beam] -- a buff: "the bronze (15% chain) and
 *  silver (cannot be dodged) effects don't do anything." They could not: an
 *  ability with no damage has nothing to chain and nothing to be dodged. It
 *  reached the strike ladder because `ladderKeyFor` asks `tags.damages`,
 *  which is true of a buff carrying an incidental damage rider, and then
 *  every rung in that pool was offered unconditionally.
 *
 *  Rule 2 already had the machinery. It had simply never been pointed at the
 *  striking ladders, whose rungs all read as though damage were a given. */
export const DEALS_DAMAGE = (s) => (s.base || 0) > 0
  || !!(s.dot && (s.dot.dmgPerTick || s.dot.damage))
  || (s.tickAmount || 0) > 0
  // ...OR IT ARMS THE BLOWS YOU LAND, which is the distinction `ladderKeyFor`
  // has drawn since round 47 and which this predicate has to keep: a weapon
  // affinity and an imbue carry no `base` of their own and "every hit leaves
  // Bleed behind" is exactly true of both. Dropping them would empty the
  // striking pools for every weapon essence in the game.
  || s.template === 'imbueStrike' || s.template === 'weaponAffinity'
  || s.template === 'summonWeapon';

/** ROUND 220 (items 16.2, 18.1) -- rungs that widen an effect onto OTHER
 *  BODIES. Offered only to a spec that has something to widen.
 *
 *  The user, on [Taut Crook] -- an attack: "its bronze/silver ally-and-summon
 *  rungs make no sense on an attack." And on [Twice-Asked Stand-in]: "bronze
 *  and silver make no sense for the ability." Both are the same fault as the
 *  one above from the other end -- a rung about who ELSE benefits, on an
 *  ability whose whole effect lands on one target or on you alone.
 *
 *  The list is WIDE on purpose. A first cut asked for a pool or a stat and
 *  gated out every `armorBuff`, `thornsBuff` and `immunityBuff` in the game --
 *  44 of 2,400 -- which is the opposite error: a ward that blunts what lands
 *  on you is exactly the thing "it stops for your summons too" is about, and
 *  those templates keep their figure under their own name (`armorBonus`,
 *  `thornsFrac`, `immunityDuration`) rather than in a common one. What these
 *  rungs actually need is an effect that SITS ON A BODY for a while, so that
 *  is what the predicate asks for. */
export const HAS_SHAREABLE_EFFECT = (s) => !!(s.auraEffect || s.buffStat || s.statBuff
  || s.healAmount || s.hotPerSec || s.shieldAmount || s.absorb
  || s.regenPerSec || s.armorPct || s.dmgPct || s.speedPct || s.critPct
  || s.armorBonus || s.thornsFrac || s.immunityDuration
  || (s.buffDuration || 0) > 0);

/** ROUND 204b -- the fields that mean "this ability puts a POOL between you
 *  and the next hit". A guard rung about breaking, absorbing or a remainder is
 *  offered only to a spec that has one; an armour percentage and an immunity
 *  window are defensive and are not a pool. */
const SHIELDED = ['shieldAmount', 'absorb', 'shieldHp', 'barrierHp'];

// ===========================================================================
// EACH RANK IS A POOL, NOT A ROW, and this was the second thing a census
// found. The first draft gave every ladder exactly four rungs, so every
// passive in the game was told the same four sentences: "it keeps working
// while you are downed" landed on 21.1% of all abilities. That is the old
// fault wearing new words -- round 134's "one ability offered twice", between
// abilities rather than between ranks.
//
// So a rank offers two or three rungs and the ability picks one, seeded by its
// own name. Three choices at four ranks is eighty-one ladders per archetype
// instead of one, the pick is stable (the same ability always climbs the same
// ladder, across saves and across sessions), and no rung is ever offered to an
// ability that cannot carry it.
// ===========================================================================

export const RANK_LADDERS = {
  // ---- things that stop harm ---------------------------------------------
  // A `guard` rung talks about a POOL -- something that absorbs, that can be
  // broken, that has a remainder. `SHIELDED` is the field list that says the
  // ability has one, and round 202's rule 2 ("a rung may only claim a field
  // the spec actually has") is applied to this ladder with it.
  //
  // ROUND 204b -- it was not, and the user found the result: a +27% damage
  // buff called [Well-stocked Quiver] was told "breaking it staggers whoever
  // broke it" and "it absorbs conditions as well as damage". There is nothing
  // to break and nothing to absorb with; both rungs were inert AND nonsense,
  // which is the worst pair available. An ARMOUR percentage has the same
  // problem: it is defensive, it belongs on this ladder, and it has no pool.
  guard: {
    iron: [
      rung('it holds against typed and untyped damage alike', { wardTyped: true }),
      // ROUND 204 (item 2.9.1) -- the user, on an ACTIVE carrying this: "reads
      // as a triggered passive rather than an active ability". It does,
      // because on an active it is a contradiction -- the ability you pressed
      // is telling you it goes up when you did not press it. On a passive it
      // is exactly right, and that is the only place it is offered now.
      rung('it goes up the instant you are struck',
        { wardOnHit: true }, (s) => s.kind === 'passive'),
      rung('what it stops, it stops for your summons too', { wardSummons: true }, HAS_SHAREABLE_EFFECT),
    ],
    bronze: [
      rung('breaking it staggers whoever broke it for 1.2s', { breakStagger: 1.2 }, SHIELDED),
      rung('it returns a quarter of what it absorbs to whoever spent it', { wardThorns: 0.25 }, SHIELDED),
      rung('while it holds, nothing can root, freeze or slow you', { wardAnchors: true }),   // ROUND 285 -- nothing in this game shoves the player
      // ROUND 204b -- POOL-FREE RUNGS, one per rank at least, and this is the
      // other half of gating the pool ones. `rankLadderFaults` went red the
      // moment SHIELDED went in -- "200 differently-named guards produced only
      // 6 distinct ladders", "one rung lands on 100% of guards" -- because an
      // ARMOUR buff has no pool and was left with a single legal rung per
      // rank. Gating without replacing would have traded a nonsense rung for
      // the one-sentence-on-every-ability fault the pools exist to prevent.
      rung('it also turns a tenth of what it stops back into stamina', { wardRefunds: 0.10 }),
      rung('it comes up 30% faster and cannot be interrupted', { wardQuickCast: 0.30 }),
    ],
    silver: [
      rung('it also covers the nearest ally in reach', { wardScope: 'ally' }),
      rung('it holds for 50% longer', { wardDurationMult: 1.5 }),
      rung('whoever strikes you through it is slowed by 25% for 3s', { wardSlowsAttacker: 0.25 }),
      rung('it absorbs conditions as well as damage, one at a time', { wardEatsConditions: 1 }, SHIELDED),
      rung('whatever is left of it when it ends is healed back to you', { wardRemainderHeals: true }, SHIELDED),
    ],
    gold: [
      rung('it re-forms once at half strength when it breaks', { wardRefit: 0.5 }, SHIELDED),
      rung('the blow that breaks it does no damage at all', { wardNullifiesBreaker: true }, SHIELDED),
      // `wardScopeParty` rather than a second `wardScope`: the fault check
      // below refuses a ladder that grants one field twice, and it is right to
      // -- two rungs writing the same key is one rank-up sold as two, since
      // the later write silently erases the earlier one. These two are a real
      // escalation (one ally, then the whole team) and so they are two fields,
      // and the runtime takes the widest one that is set.
      rung('it covers everyone on your team, at half strength each', { wardScopeParty: 0.5 }),
      rung('it keeps working while you are suppressed', { wardUndispellable: true }),   // ROUND 285 -- nothing dispels your wards; suppression now shuts them
      rung('a kill while it holds puts it back up at full', { wardKillRestores: true }),
    ],
  },
  // ---- things that put health back ---------------------------------------
  mend: {
    iron: [
      rung('it lifts one condition as it heals', { cleanseOnHeal: 1 }),
      rung('it finds whoever is worst off', { healPicksWorst: true }),
      // ROUND 220 (item 12.2) -- REMOVED: 'it works through a wound that is
      // refusing healing'. The user: "Remove this." He is right twice over.
      // It is a sentence about a rule the player has never been taught (the
      // wounding pool in `_healPlayer`), phrased so that it reads as flavour,
      // and `healIgnoresWounding` was read by nothing -- so even a player who
      // knew the rule was being told about an exemption that did not exist.
    ],
    bronze: [
      rung('healing past full becomes a shield that lasts 6s', { overhealShield: 6 }),
      rung('it keeps mending for 4s after it lands', { healTrail: 4 }),
      rung('it mends your summons as well as your people', { healSummons: true }, HAS_SHAREABLE_EFFECT),
    ],
    silver: [
      rung('it reaches one further ally', { healExtraTarget: 1 }, HAS_SHAREABLE_EFFECT),
      // ROUND 220 (item 12.4) -- was 'whoever it mends is harder to kill for
      // 5s afterwards', which named no stat and no figure and was read by
      // nothing besides. The number is stated and it is now paid: see
      // `mendGuard` in WorldScene's player damage path.
      rung(`whoever it mends takes ${Math.round(MEND_GUARD_PCT * 100)}% less damage for 5s`, { healGrantsDr: 5 }),
      rung('a critical strike anywhere on your team triggers it again for a quarter', { healEchoOnCrit: 0.25 }),
    ],
    gold: [
      rung('it works on the downed, and brings them up at a quarter health', { revives: 0.25 }),
      rung('it cannot be reduced by anything that cuts healing', { healUncuttable: true }),
      rung('if you fall, it mends the companions near you for 10s', { healPersists: true }),
    ],
  },
  // ---- things that move you ----------------------------------------------
  stride: {
    iron: [
      rung('it breaks one movement-stopping effect as it goes', { breaksRoot: true }),
      rung('it frees you from every root, freeze and slow on you as it goes', { usableRooted: true }),   // ROUND 285 -- item 9: say what it does
      rung('it leaves nothing behind for anything tracking you', { breaksTracking: true }),
    ],
    bronze: [
      rung('you are untouchable for the 0.4s it takes', { iframes: 0.4 }),
      rung('anything in the line you take is knocked aside', { pathKnockaside: true }),
      rung('the ground you leave holds whoever is standing on it for 1.5s', { departRoot: 1.5 }),
    ],
    silver: [
      rung('it may be used a second time within 4s before it cools', { charges: 2 }),
      rung('a kill within 3s of arriving clears its cooldown', { killResets: 3 }),
      rung('it travels half again as far through anything solid', { phasesTerrain: true }),
    ],
    gold: [
      rung('arriving knocks anything within 1 tile away from you', { arriveKnockback: 64 }),
      rung('it can be used a second time to return exactly where you left', { recall: true }),
      rung('your next blow after it lands always crits', { arriveGuaranteedCrit: true }),
    ],
  },
  // ---- things that stand beside you --------------------------------------
  called: {
    iron: [
      rung('what it calls arrives with a shield already up', { summonWard: true }),
      rung('what it calls arrives already in the fight, mid-swing', { summonArrivesAttacking: true }),
      rung('what it calls takes the attention of whatever you last struck', { summonTaunts: true }),
    ],
    bronze: [
      rung('what it calls carries your afflictions into its own blows', { summonInherits: true }),
      rung('what it calls is mended whenever you are', { summonSharesHeals: true }),
      rung('what it calls grows stronger for each of your afflictions on its target', { summonScalesOnAfflictions: true }),
    ],
    silver: [
      rung('a second may stand at once', { summonCap: 2 }),
      rung('it may be recalled and sent back out without paying again', { summonRecall: true }),
      // ROUND 204 (item 2.10.3) -- the user: "This is a pointless move. If
      // the player is downed they died. Who cares what happens after that."
      // He is right on both counts, and the same objection retires the
      // `worksDowned` rung in the standing ladder below. Replaced with the
      // thing a summoner actually wants at silver -- the one that is now
      // measurable, because round 204 gave summons hit points.
      rung('what it calls stands with half again as much life in it', { summonHpMult: 1.5 }),
    ],
    gold: [
      rung('when one falls it takes a parting swing at whatever felled it', { summonDeathblow: true }),
      rung('when one falls another stands in its place, once', { summonRespawns: 1 }),
      rung('what it calls shares half of every blow meant for you', { summonSharesDamage: 0.5 }),
    ],
  },
  // ---- things that take a turn away --------------------------------------
  hold: {
    iron: [
      rung('they are slowed for 3s after it lets go', { slowOnEnd: 3 }),
      rung('they cannot be healed while it holds', { holdBlocksHealing: true }),
      rung('it lands before they can act', { holdActsFirst: true }),
    ],
    bronze: [
      rung('it reaches one more target', { extraTargets: 1 }),
      rung('anything it holds takes 20% more from every source', { holdAmplifies: 0.20 }),
      rung('it spreads to the nearest other foe within 3 tiles', { holdSpreads: true }),
    ],
    silver: [
      rung('nothing below your own rank may resist it', { ignoreDrBelowRank: true }),
      rung('it holds half as long again on anything already afflicted', { holdLongerOnAfflicted: 0.5 }),
      rung('a second cast while it holds stops them acting for the rest of it', { holdSilences: true }),
    ],
    gold: [
      rung('when it lets go, they lose their next action', { breakCostsTurn: true }),
      rung('whatever it holds cannot be healed or shielded by anything else', { holdSeals: true }),
      rung('it holds a second target for half as long, chosen by you', { holdChains: 0.5 }),
    ],
  },
  // ---- things you make out of nothing ------------------------------------
  conjured: {
    iron: [
      rung('what it conjures stays with you when you die', { noDecay: true }),   // ROUND 294 -- said as what it does   // ROUND 285 -- nothing conjured ever decayed
      rung('it conjures straight into your hand', { conjureToHand: true }),
      rung('what it conjures takes the element of whatever you last struck', { conjureMatchesElement: true }),
    ],
    bronze: [
      rung('it conjures a second piece', { conjureSecond: true }),
      rung('a swing that reaches nothing throws what it conjures at a foe within 5 tiles, and it comes back', { conjureThrown: true },
        (s) => s.template === 'summonWeapon'),
      rung('what it conjures may be handed to an ally', { conjureShareable: true }),
    ],
    silver: [
      rung('what it conjures counts as one rarity higher', { conjureRarityStep: 1 }),
      rung('what it conjures carries the affix of the piece it replaced', { conjureKeepsAffix: true }),
      rung('each dawn it is reforged, and keeps whichever is better', { conjureReforges: true }),   // ROUND 285 -- a passive is never cast twice
    ],
    gold: [
      rung('it stays through your death and is in your hands when you rise', { conjurePersists: true }),
      rung('what it conjures cannot be sundered: armour-breaking afflictions do not take hold on you', { conjureUnbreakable: true }),
      rung('it conjures a matched set rather than a single piece', { conjureSet: true }),
    ],
  },
  // ---- things that land blows ---------------------------------------------
  //
  // ROUND 202 -- the striking ladder lived in awakening.js as a fixed row, so
  // a third of every kit in the game was told "+10% critical chance with this
  // ability" at silver. It is a pool here for the same reason the others are.
  //
  // Its iron rung is the one place in these tables where a rung carries a
  // WORD from the ability rather than a fixed sentence: `${dot}` is the
  // element's own affliction name (Bleed, Sear, Blight), filled by
  // `ladderFor` from the `words` argument. Everything else about it is fixed,
  // so the rung is still one sentence rather than a template farm.
  strike: {
    iron: [
      rung('every hit leaves ${dot} behind', { dotRung: true }, DEALS_DAMAGE),
      rung('a hit that lands on something already afflicted crits', { critOnAfflicted: true }, DEALS_DAMAGE),
      rung('it costs nothing at all when it finishes something', { freeOnKill: true }),
    ],
    bronze: [
      rung('15% of the damage ${spreads} two more foes nearby', { chainRung: 0.15 }, DEALS_DAMAGE),
      rung('it strikes a second time for a third, a moment later', { echoStrike: 0.33 }, DEALS_DAMAGE),
      rung('it deals double to a foe that has not been hurt yet', { openerDouble: true }, DEALS_DAMAGE),
    ],
    silver: [
      rung('+10% critical chance with this ability', { critChanceBonus: 0.10 }, DEALS_DAMAGE),
      rung('it cannot be blocked: a warded foe takes it in full', { unavoidable: true }, DEALS_DAMAGE),   // ROUND 285 -- no foe dodges; a ward is their block
      rung('every third use costs nothing', { everyThirdFree: 3 }),
    ],
    gold: [
      rung('it finishes anything it leaves below a tenth of its health', { executeBelow: 0.10 }, DEALS_DAMAGE),
      rung('a kill with it refreshes every other cooldown you have', { killRefreshesAll: true }),
      rung('it hits everything in a line behind its target as well', { lineThrough: true }, DEALS_DAMAGE),
    ],
  },
  // ---- things that land blows, over and over ------------------------------
  // ROUND 285 (item 12) -- "Remove the wording 'The run holds through a
  // miss' (I don't care if you have to eliminate the actual effect)", and use
  // canon's words for these. Both iron "run" rungs are gone -- nothing in the
  // game ever read either of them -- and the rest say "successive attacks",
  // which is [Relentless Assault]'s own vocabulary, instead of "the run".
  repeat: {
    iron: [
      rung('every hit leaves ${dot} behind', { dotRung: true }),
      rung('the first attack of a succession costs nothing', { runFreeOpener: true }),
    ],
    // ...and every rung left is one the game PAYS (WorldScene: the fold in
    // `_scaledAbility`, `_scalingMultiplier`, `_streakWindowMs`). Three that
    // were words only -- "strikes everything in reach", "a crit counts twice",
    // "cannot miss" -- are gone rather than left as promises.
    bronze: [
      rung('each successive attack raises the cost half as much', { spamCostPerMult: 0.5 }),
      rung('the damage from successive attacks builds twice as fast, to the same limit', { runClimbsFaster: 2 }),
    ],
    silver: [
      rung('when the pool runs dry, health pays instead (1.5 health a point)', { spamPayLife: true }),
      rung('successive attacks keep counting through a pause of up to 4s more', { runLingers: 4 }),
    ],
    gold: [
      rung('a kill with it refunds half of what it cost', { spamKillRefund: 0.5 }),
      rung('the damage from successive attacks keeps building past its limit, to three times it', { runUncapped: 3 }),
    ],
  },
  // ---- ROUND 204 (items 3, 4) -- KNOWING A WEAPON ------------------------
  //
  // The user asked for two things and they are the same ability:
  //
  //   3  "A whip essence may not instantly provide a Dexterity Weapon
  //      proficiency, but by bronze or silver it should be nearly impossible
  //      that one of the abilities hasn't filled in that gap."
  //   4  "I'm not seeing any weapon essences providing weapon summons anymore,
  //      along with proficiency, and buffs to wielding a specific weapon ...
  //      these don't all need to be at iron rank, they could even be on 1
  //      ability coming as you progress from iron, to bronze to silver on an
  //      ability like Whip Mastery or Spear Mastery."
  //
  // So this is the ladder that ability climbs, and it is the ONE place a
  // weapon essence's three promises live. Its iron rung is the proficiency
  // itself, which is the part round 202 already granted; bronze and silver are
  // the two things that were missing.
  //
  // Not a pool of three per rank, unlike every other ladder here: a mastery
  // line is a PROGRESSION rather than a choice, and the user named the order
  // ("proficiency at iron, add increased damage, range, or speed at bronze,
  // and then add triggered effects as silver"). A rung picked at random from
  // three would make two Spear Masteries teach different halves of the spear.
  mastery: {
    // IRON IS DELIBERATELY EMPTY. The proficiency IS the iron rung, and it is
    // granted by the kit sweep in awakening.js and stated in the ability's own
    // description, which names the weapons it covers ("it also teaches you
    // swords and daggers: halves what a sword or a dagger costs to swing").
    // A rung here said the same thing a second time in vaguer words -- the
    // first cut printed both, one sentence apart -- and a static label cannot
    // name the weapons, which is the only part worth reading.
    iron: [],
    bronze: [
      rung('you strike 15% harder with the weapons it covers', { masteryDmgPct: 0.15 }),
    ],
    silver: [
      // ROUND 220 (item 17.1) -- the user, on [Staff Mastery]: "'You may call
      // the weapon itself to your hand' -- but the ability doesn't summon a
      // staff." It never did. `masteryConjures` adds the weapons it covers to
      // `p.ownedWeapons`, which is the EQUIP door: you can equip a staff
      // without ever having found one. That is a real and useful thing and it
      // is not conjuring, so the sentence says the thing that happens. The
      // word "call" was doing all the lying.
      // ===== ROUND 221 -- THE SILVER RUNG IS A TECHNIQUE ==================
      //
      // Round 220 made this rung honest ("you count as owning every weapon it
      // covers") and the user read the honest version and said what it was:
      // "wildly uninteresting ... very clearly not in any way an equivalent"
      // to the gold-rank canon ability he set beside it.
      //
      // His own spec for this ladder, from round 204, had always said what
      // belongs here -- "and then add TRIGGERED EFFECTS as silver" -- and
      // iron and bronze were built to it while silver never was. So silver is
      // a triggered effect, and it is a DIFFERENT one per proficiency: see
      // MASTERY_TECHNIQUES, where each of the five is about positioning,
      // tempo or reach rather than afflictions, which the user ruled out in
      // the same message ("that's only for specific kits").
      //
      // The sentence is filled from the ability's own `prof` at build time,
      // which is why this label is a token. A static one could not name the
      // technique, and naming it is the entire value of the rung.
      //
      // The ownership grant is not lost -- it moved DOWN to iron, where it
      // costs no rank at all: see `masteryOwns` in the iron sweep. A weapon
      // essence that teaches you a weapon should let you hold one, and that
      // was never worth a rank of a ladder.
      rung('${technique}', { masteryTechnique: true }),
    ],
    gold: [
      rung('swings with it cost 25% less stamina and reach 25% further',
        { masteryCheaper: 0.25, masteryReachPct: 0.25 }),
    ],
  },
  // ---- ROUND 205 (item 4) -- THE ARSENAL --------------------------------
  //
  // The user, having chosen what a two-weapon build resolves to:
  //
  //   4    "Lets says 2+ weapon essences always result in the arsenal
  //         confluence."
  //   4.1  "The arsenal confluence should at Iron, or bronze always have an
  //         ability that applies bonuses for any weapon essence to every
  //         weapon essence they have."
  //   4.1.1 "This should be a passive that allows synergy between multiple
  //         weapon types so a player with a whip and spear essence are
  //         rewarded with buffs from both. I.e. Hammer Mastery and Spears
  //         fury apply their effects to both Axes and Spears."
  //   4.1.2 "Special attack weilding requirements should also be eliminated
  //         as a rank up affect."
  //   4.1.3 "This gives the Arsenal Confluence a specific identity (The player
  //         is an arsenal, any weapon in their hands tied to their essences is
  //         as deadly as every weapon.)"
  //
  // A PROGRESSION, like `mastery` and for the same reason: the user named the
  // order, iron first and the wielding requirements after. Three Arsenals that
  // each learned a different third of being an arsenal would be the thing
  // nobody asked for.
  //
  // The gold rung is the identity in 4.1.3 taken one step past its own
  // wording, which is where a gold rung belongs: at iron through silver the
  // sharing is bounded by "tied to their essences", and at gold the player IS
  // the arsenal and the binding is anything they can pick up. 4.1.4 -- "Some
  // limitations may need to be placed onto Staffs and Bows. Will playtest and
  // find out" -- is deliberately NOT anticipated here: a limit invented before
  // the playtest is a limit nobody measured.
  arsenal: {
    // IRON IS DELIBERATELY EMPTY, for the reason `mastery` iron is: the
    // sharing IS the passive, and the confluence sweep states it in the
    // ability's own description -- where it can NAME the weapons ("bow,
    // crossbow, dagger, sword and whip counts as every other"), which a static
    // label cannot. The first cut had a rung here as well and the card printed
    // both, one sentence apart: this project's fault class 4, one ability
    // offered twice. The runtime reads `arsenal` and `arsenalWeapons` off the
    // spec rather than a rung, so nothing is lost by saying it once.
    iron: [],
    bronze: [
      rung('your special attacks stop asking which of them is in your hands',
        { arsenalFreeWield: true }),
    ],
    silver: [
      rung('any of them answers when you call, wherever you left it',
        { arsenalCallsAll: true }),
    ],
    gold: [
      rung('the sharing stops being about your essences: anything you can hold is one of yours',
        { arsenalAnyWeapon: true }),
    ],
  },
  // ---- ROUND 204b -- A BOON: SOMETHING YOU PUT ON YOURSELF ----------------
  //
  // The user, on [Well-stocked Quiver] -- a +27% physical damage buff whose
  // bronze and silver rungs were about a shield breaking and absorbing:
  //
  //   "Its a damage increase, but half of the ability is framed around being
  //    some sort of shield. Based on the description I don't know if the
  //    bronze or silver effects can even trigger."
  //
  // They could not, and the cause was one line at the bottom of
  // `ladderKeyFor`: `return 'guard'`. Anything that matched none of the nine
  // tests -- every `selfPower`, `selfCritBuff`, `statBuff` and `bloomField` in
  // the game -- was handed the shield ladder by default. Measured before the
  // fix: 8 abilities in 1,400 reached `guard` while carrying nothing defensive
  // at all, and many more legitimately-defensive ones had no pool to break.
  //
  // A fallback that is a REAL ARCHETYPE is the fault here. "I don't know what
  // this is" and "this is a shield" have to be different answers, or the next
  // template nobody classified becomes a shield too, silently, for a round or
  // ten. So the unmatched case lands here instead: a timed effect you put on
  // yourself, which is the most that can honestly be said about a spec that
  // matched none of the other tests, and every rung below is true of any of
  // them.
  boon: {
    // EVERY RUNG HERE IS READ, and -- round 204c -- IRON IS NOT A DELTA.
    //
    // The first cut of this ladder opened with "it lasts half again as long"
    // and "it costs a quarter less to put up", which is the fault the user has
    // now reported six times in different words: at iron the ability did not
    // exist a moment ago, so there is nothing for it to be cheaper or longer
    // than. Iron states what the ability DOES; bronze and up may state what
    // changed, because by then there is something to have changed from.
    iron: [
      rung('it lifts one condition from you as it goes up', { boonSelfCleanse: 1 }),
      rung('it goes up instantly, and nothing can interrupt it', { boonInstant: true }),
    ],
    bronze: [
      rung('it lasts half again as long', { boonDurationMult: 1.5 }),
      rung('it costs a quarter less to put up', { boonCheaper: 0.25 }),
    ],
    silver: [
      rung('everything it grants is worth 25% more', { boonMagnitudeMult: 1.25 }),
      rung('a kill while it holds adds 3s to it', { boonKillExtends: 3 }),
    ],
    gold: [
      rung('it holds twice as long while you are below half health', { boonDoublesWhenHurt: true }),
      rung('it no longer runs out on its own; only a dispel stops it', { boonPermanent: true }),
    ],
  },
  // ---- things that sit on you and do not go away --------------------------
  standing: {
    iron: [
      // ROUND 204 (item 2.10.3) -- see the note in the summon ladder. A
      // passive that keeps working after you are dead is a passive with no
      // reader.
      rung('it keeps working while you are stunned or suppressed', { worksSuppressed: true }),
      // ROUND 294 -- "Abilities don't need to mention the soul space unless
      // they grant some very specific benefit within the soul space.
      // Functioning in the soul space doesn't count." The soul-space rung is
      // retired: every passive works there now, and nothing says so.
      rung('it is already working when a fight starts', { worksOutOfCombat: true }),
    ],
    bronze: [
      rung('it works on your summons as well as on you', { extendsToSummons: true }, HAS_SHAREABLE_EFFECT),
      rung('it works twice as hard while you are below half health', { doublesWhenHurt: true }),
      rung('it works on whatever you are riding as well as on you', { extendsToMount: true }, HAS_SHAREABLE_EFFECT),
    ],
    silver: [
      rung('it works on every ally within 6 tiles', { extendsToParty: 384 }, HAS_SHAREABLE_EFFECT),
      rung('with a second passive of its kind in your kit, it counts half again', { stacksWithItself: 0.5 }),
      // ===== ROUND 220 (items 6.1-6.3) -- REMOVED, NOT REWORDED ===========
      //
      // The user, on 'it no longer counts against how many passives you can
      // carry': "New contender for dumbest effect." "It has literally no
      // benefit." "Don't do this or abilities like this. It's not a good fit
      // for this setting."
      //
      // All three are true and they are three different objections. There is
      // no passive cap in this game, so the rung exempted the ability from a
      // rule that does not exist -- `free: true` was read by nothing. Even
      // with a cap it would be an inventory-management reward on a ladder
      // about what an ability DOES. And a book where power is essences and
      // awakening stones has no slot economy to buy your way out of; it is a
      // mechanic borrowed from a different kind of game.
      //
      // Replaced with something a standing effect can honestly gain at silver
      // AND something the runtime reads. `potency` is the one field on these
      // ladders that has never been inert: `_scaledAbility` sums it across
      // every rung reached and multiplies the ability's figures by it, which
      // is why RANK_POTENCY rides along silently on every rank. Stated here
      // rather than silent, because at silver there IS a tier below to be
      // worth more than -- the boon ladder's silver says the same sentence
      // for the same reason.
      rung('what it gives you counts for 25% more', { potency: 0.25 }),
    ],
    gold: [
      rung('it cannot be suppressed or dispelled', { unsuppressable: true }),
      rung('for 30s after you fall, your companions fight on with its strength', { outlastsDeath: 30 }),
      rung('it works on everything bound to you, anywhere on the map', { unlimitedRange: true }, HAS_SHAREABLE_EFFECT),
    ],
  },
};
export const LADDER_KEYS = Object.keys(RANK_LADDERS);
export const RANKS = ['iron', 'bronze', 'silver', 'gold'];

/**
 * Which ladder this spec climbs. Keyed on what the FINISHED spec is rather
 * than on its template name, the same reason `aspectSubject` was -- a lever
 * that turned a buff into a ward should climb the ward's ladder.
 *
 * `tags` is `specTags(spec)`, passed in rather than imported so this file has
 * no dependency on awakening.js and a suite can drive it with a plain object.
 */
export function ladderKeyFor(spec, tags) {
  // A STRIKING ability is checked before the rest, because it is the thing the
  // ability is FOR.
  //
  // The test is DERIVED HERE rather than taken from the caller. It arrived as
  // `tags.strikes`, computed in awakening.js and handed over -- and a probe
  // that built tags with `specTags` alone then selected the wrong ladder,
  // because `specTags` does not produce that flag. A field one caller
  // remembers to set and another does not is the hand-off this project keeps
  // being bitten by, so the rule lives with the table that uses it and the
  // caller's flag is only an override.
  //
  // It is deliberately narrower than `tags.offensive`, which counts a scrying
  // passive with an opener-crit rider, for the reason that flag's own comment
  // in awakening.js gives.
  // CONJURING IS CHECKED FIRST, and only a probe found why. `summonWeapon` is
  // in the striking test (awakening.js has counted it as one since round 51,
  // correctly -- a conjured sword is a sword), so a conjured weapon climbed
  // the strike ladder and `conjured` became a ladder nothing could ever
  // select. What the ability DOES is make a weapon; what the weapon does with
  // it afterwards is the weapon's business.
  // ROUND 204 -- the mastery line is checked FIRST, above even the conjuring
  // test, because `prof` is what makes an ability the mastery and a mastery
  // that conjures its own weapon at silver would otherwise be re-routed onto
  // the conjuring ladder by the rung it had just earned.
  // ROUND 205 (item 4) -- the arsenal line is checked above even the mastery,
  // because the confluence sweep stamps it onto a passive that may already be
  // a mastery carrier, and the arsenal is the more specific of the two.
  if (spec.arsenal) return 'arsenal';
  if (spec.prof) return 'mastery';
  if (/^summon(Weapon|Armor|Gear)$/.test(spec.template || '')) return 'conjured';
  const strikes = tags.strikes != null ? tags.strikes
    : (tags.damages || spec.category === 'attack'
      || spec.template === 'imbueStrike' || spec.template === 'weaponAffinity'
      || spec.template === 'summonWeapon');
  // ===== ROUND 220 (item 11.2) -- AND IT HAS TO ACTUALLY LAND ONE =========
  //
  // The user, on [Refraction Beam] -- a buff: "the bronze (15% chain) and
  // silver (cannot be dodged) effects don't do anything."
  //
  // `tags.damages` is true of a buff that happens to carry a damage RIDER,
  // and `category === 'attack'` is true of a few templates whose own effect
  // is not a blow. Either was enough to route the ability onto the striking
  // ladder, where every rung assumes there is a hit to chain, to crit, or to
  // make undodgeable. `DEALS_DAMAGE` is the same predicate the striking rungs
  // now carry, applied one level up so the ability lands on the `boon`
  // ladder -- whose rungs are all true of a timed effect you put on yourself
  // -- instead of on a pool it will be gated out of rung by rung.
  // ROUND 296 -- the streak ladder is for the one attack that has a streak.
  if (strikes && DEALS_DAMAGE(spec)) return spec.spammable && spec.scaleOn === 'successiveUses' ? 'repeat' : 'strike';
  // A PASSIVE that is NOT a striking one climbs the standing ladder, and the
  // order of these two lines is load-bearing in both directions.
  //
  // Passive-first was the first version, and `test_round47` caught it: a
  // weapon-affinity passive stopped climbing the striking ladder, which moved
  // its iron potency from 0 to 0.10 and quietly made every weapon affinity in
  // the game ten percent stronger at iron. awakening.js's own `strikes` test
  // includes `weaponAffinity`, `imbueStrike` and `triggeredPassive` on purpose
  // -- "an ability that actually lands blows, OR ONE THAT ARMS THE BLOWS YOU
  // LAND" -- and those are passives.
  //
  // Strikes-first alone was the version before that, and a probe caught it the
  // other way: a passive ARMOUR buff is `tags.defensive` and is not a striking
  // ability, so it fell through to the guard ladder and was told "breaking it
  // staggers whoever broke it" and "it may be used a second time" -- two
  // sentences about a thing you cast, on a thing that is simply true of you.
  //
  // Both are right, about different passives: one arms your blows, the other
  // is a standing fact. Striking wins, then standing.
  if (spec.kind === 'passive') return 'standing';
  if (tags.heals) return 'mend';
  if (tags.summon || spec.template === 'activeSummon' || spec.template === 'raiseDead') return 'called';
  if (tags.movement) return 'stride';
  if (tags.defensive) return 'guard';
  if (spec.template === 'timeFreeze' || spec.template === 'confuseTurn'
    || spec.template === 'abilityLock' || spec.template === 'tauntPull'
    || spec.confuse || spec.bindOnHit) return 'hold';
  // ROUND 204b -- a BOON, and then the fallback is a boon too. See the note
  // above the ladder: the old fallback was `guard`, so every unclassified
  // template in the game was silently told it was a shield.
  return 'boon';
}

/** May this rung be offered to this spec? Rule 2. */
export function rungApplies(r, spec) {
  if (!r.requires) return true;
  // ROUND 204 (item 2.9.1) -- a predicate, not only a field name. Some rungs
  // are wrong for a KIND of ability rather than for a spec missing a field,
  // and "does this spec have `wardOnHit`" could never have expressed that.
  if (typeof r.requires === 'function') return !!r.requires(spec);
  const need = Array.isArray(r.requires) ? r.requires : [r.requires];
  return need.some(f => spec[f] != null && spec[f] !== false && spec[f] !== 0);
}

/** A stable index into a rank's pool. Seeded off the ability's NAME rather
 *  than a counter, so the same ability climbs the same ladder in every save,
 *  on every machine, forever -- a rank-up that reshuffles on load would be a
 *  different ability wearing the same name. */
export function pickIndex(seed, n) {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % Math.max(1, n);
}

/**
 * The four rungs this spec climbs, minus any it cannot honestly claim.
 *
 * Returns the same `{rank, label, ...fields}` shape `rankAspectsFor` always
 * returned, so the card, the rank-up announcement and the runtime are
 * unchanged. A rank whose whole pool is gated out leaves that rank with
 * nothing, and nothing is what the card prints for it -- which is rule 3, and
 * is better than a sentence that is not true.
 */
// ===========================================================================
// THE POTENCY THAT STAYED.
//
// The old ladder did two things at once: it grew the ability's numbers
// (`potency: 0.10` at iron, 0.20 at bronze, 0.25 at gold, summed by
// `rankScaled`) and it announced that it had ("the guard holds a tenth further
// than it did"). Round 202 removed the sentence -- and the first draft removed
// the FIELD with it, which `test_round89` caught immediately: an ability's card
// printed base 13 at iron and base 13 at gold, with the rank doing nothing to
// the figures at all.
//
// The announcement was the fault. The growth was never the fault. So every
// rung carries the potency its rank always carried and carries NO WORDS about
// it: the figures grow, `Numbers now:` prints them grown, and nothing says
// "a tenth further" beside them. That is exactly what round 103 asked for --
// "the growth appears where the player was already reading, as a bigger
// number" -- and what round 190 undid by rebuilding the card out of the labels.
//
// The striking ladders keep their own scheme: their old rows carried no
// potency (their ranks bought mechanics instead) and they still do not.
// Kept PER LADDER, at the figures each ladder's old rows carried, so this
// round changes what the ranks SAY and not what they are worth. The generic
// ladder bought 0.10 / 0.20 / - / 0.25 and the striking ones bought a single
// 0.25 at gold; both are reproduced exactly. Equalising them would have been a
// balance change smuggled into a text change, and test_round89 asserts the
// striking figure by name -- which is how the first draft of this was caught
// zeroing it.
export const RANK_POTENCY = {
  generic: { iron: 0.10, bronze: 0.20, silver: 0, gold: 0.25 },
  striking: { iron: 0, bronze: 0, silver: 0, gold: 0.25 },
};
/** The ladders that use the striking figures. */
export const STRIKING_LADDERS = ['strike', 'repeat'];
/** ROUND 204 -- ladders that are an ordered line rather than a pool of
 *  choices. See the note in `rankLadderFaults`. */
export const PROGRESSION_LADDERS = ['mastery', 'arsenal'];

export function ladderFor(spec, tags, words = {}) {
  const key = ladderKeyFor(spec, tags);
  const ladder = RANK_LADDERS[key];
  // ROUND 221 -- `${technique}` is filled from the ability's own proficiency.
  // A mastery carrier always has one (`prof` is what put it on this ladder in
  // the first place), and the fallback names no weapon rather than naming the
  // wrong one.
  const tech = MASTERY_TECHNIQUES[spec.prof] || null;
  const fill = (t) => String(t)
    .replace('${dot}', words.dot || 'Bleed')
    .replace('${spreads}', words.spreads || 'carries to')
    .replace('${technique}', tech ? tech.label : 'your strikes with it come in a practised sequence');
  const out = [];
  RANKS.forEach((rank, i) => {
    const pool = (ladder[rank] || []).filter(r => rungApplies(r, spec));
    if (!pool.length) return;
    // A different offset per rank, so two abilities that agree at iron do not
    // then agree at every other rank as well.
    const r = pool[pickIndex(`${spec.name || spec.template || '?'}|${key}|${rank}|${i}`, pool.length)];
    const grants = { ...r.grants };
    // The two rungs that need a field built from the element rather than a
    // constant. Done here rather than in the table so the table stays a table.
    if (grants.dotRung) {
      delete grants.dotRung;
      grants.dot = { dmgPerTick: 1, ticks: 3, tickMs: 700, critChance: 0.05, label: words.dot || 'Bleed' };
    }
    if (grants.chainRung != null) {
      const frac = grants.chainRung; delete grants.chainRung;
      grants.chain = { count: 2, radius: 90, frac };
    }
    // The silent half: the magnitude the rank always bought, with no sentence
    // attached. See RANK_POTENCY above.
    const potency = (STRIKING_LADDERS.includes(key)
      ? RANK_POTENCY.striking : RANK_POTENCY.generic)[rank] || 0;
    out.push({ rank, kind: key, label: fill(r.label), ladder: key,
      ...(potency ? { potency } : {}), ...grants });
  });
  return out;
}

// ===========================================================================
// 3. FAULTS.
// ===========================================================================


// ===========================================================================
// ROUND 215 -- AN IRON RUNG MAY NOT DESCRIBE AN IMPROVEMENT.
//
// The user, for at least the third time, looking at an iron-rank card:
//
//   "The run no longer breaks when you move. Its fucking iron rank this is
//    the same thing again. It can't no longer do something this is the first
//    tier of this ability. Every single time you go to fix this it comes back
//    with new wording. Stop stating iron rank abilities are better than they
//    were or could have been."
//
// They are right about the fix as well as the fault. Every previous pass
// rewrote the SENTENCE that was reported, and the next census found the same
// thing wearing different words -- "a miss does not break the run" is the
// identical claim and sat two lines below the one screenshotted. This is the
// project's fault class 5 in its purest form.
//
// So this round does not rewrite a sentence. It states the PROPERTY and
// checks it:
//
//   Iron is the first tier an ability has. There is no earlier state, so
//   nothing at iron can be a change from one. An iron rung says what the
//   ability IS. Bronze, silver and gold may compare, because by then there
//   is something to compare to.
//
// Nine rungs violated it, not one. The checks below are on CONSTRUCTIONS
// rather than on strings, and they run over the ladder table AND over the
// rendered rung of a large sample of real abilities, because the table is not
// the only place a sentence can be born.
// ===========================================================================

// TWO SCOPES, TWO STRICTNESSES, and the difference is the whole of getting
// this right rather than merely getting it to fail.
//
// A LADDER RUNG is a sentence about what this TIER adds, so "it also lifts a
// condition" at iron really is additive-to-nothing and really is wrong.
//
// The ABILITY'S OWN BODY is a paragraph about what the whole ability does,
// and "Using it also restores 5 health" is additive to the ability's OTHER
// effect in the same sentence. "+5% harder to hit" is measured against the
// character's baseline. Neither is a claim that the ability used to be worse.
//
// The first cut of this guard ran the strict set over generated body text and
// convicted 1,970 of 4,000 iron lines, nearly all of them correct English
// describing real effects. That is round 210's lesson arriving in a new file:
// a guard that convicts good writing is a guard that gets switched off, and
// the reported fault would have gone straight back to hiding inside the
// noise. So the body-text check holds only the constructions that are ALWAYS
// about the ability's own former self.

/** Always wrong at the first tier, wherever the sentence appears: the
 *  ability is being described as changed from how it otherwise behaves. */
export const IMPROVEMENT_TELLS = {
  // "the run no longer breaks", "it doesn't wear out any more"
  'a negated default': (s) =>
    /\bno longer\b|\bnot any ?more\b|\bany longer\b/i.test(s)
    // ...and the same claim without the adverb, which is how it came back the
    // first time it was fixed: "a miss does not break the run".
    // NOT followed by "at": "it does not stop AT the plates" is an idiom
    // meaning there is more to come, and it was the only thing left firing
    // across 4,000 generated iron lines once the over-reaching checks came
    // out. Convicting it would have been the guard inventing work for itself.
    || /\b(does|do|will|can|could|would)\s*n[o']?t\s+(break|wear|fade|end|expire|drop|reset|lapse|interrupt)\b(?!\s+at\b)/i.test(s)
    || /\b(does|do|will|can|could|would)\s*n[o']?t\s+stop\b(?!\s+at\b)/i.test(s)
    || /\b(doesn'?t|don'?t|won'?t|can'?t|cannot|never)\s+(break|wear|fade|end|expire|reset|lapse)/i.test(s),
  // "may be used while held", "even while stunned" -- concessive, implying a
  // limit the ability never had
  'a concession that implies a limit it never had': (s) =>
    /\bmay (now |still )?be used\b/i.test(s)
    || /\beven (while|when|though)\b/i.test(s)
    || /\bstill\s+(works|holds|applies|counts)\b/i.test(s),
};

/** ...plus, for a LADDER RUNG only, the additive and comparative forms. At
 *  iron a rung has no tier beneath it to be additional to. */
export const RUNG_TELLS = {
  ...IMPROVEMENT_TELLS,
  // "X, not Y" -- in a RUNG this contrasts the tier with the one below it,
  // and at iron there is no tier below. In BODY prose the same words contrast
  // two concrete alternatives that are both stated in the sentence -- "small
  // and constant rather than large and occasional" names both halves, so
  // nothing is unstated and nothing is being claimed about a former self.
  // That is why this lives here and not in the set above; it convicted 72 of
  // 4,000 generated iron lines, every one of them correct.
  'a contrast with an unstated default': (s) =>
    /,\s*not\s+(when|once|after|whoever|where|at|to|the|a|an|it|they)\b/i.test(s)
    || /\brather than\b/i.test(s) || /\binstead of\b/i.test(s),
  'an addition to an unstated base': (s) =>
    /\b(it|they|this)\s+also\b/i.test(s) || /\bas well as\b/i.test(s)
    || /\bon top of\b/i.test(s) || /\bin addition\b/i.test(s),
  'a bare comparative': (s) =>
    /\b(twice|thrice|half) as\b/i.test(s)
    || /\b(longer|further|faster|stronger|harder|wider|deeper)\s+than (it|they|before)\b/i.test(s),
};

/** Everything wrong with a sentence offered at the FIRST rank. */
export function improvementFaults(text, table = IMPROVEMENT_TELLS) {
  const out = [];
  for (const [name, fn] of Object.entries(table)) {
    try { if (fn(String(text || ''))) out.push(name); } catch (e) { /* ignore */ }
  }
  return out;
}

export function rankLadderFaults() {
  const out = [];

  // --- ROUND 215 -- nothing at the first rank may claim an improvement ----
  // Asserted over the TABLE here; test_round215 runs the same predicate over
  // the rendered rung of a few hundred generated abilities, because a table
  // is not the only place one of these sentences can be born.
  const first = RANKS[0];
  for (const [fam, tiers] of Object.entries(RANK_LADDERS)) {
    for (const r of (tiers[first] || [])) {
      for (const why of improvementFaults(r.label, RUNG_TELLS)) {
        out.push(`${fam}'s ${first} rung claims ${why}: "${r.label}"`);
      }
    }
  }
  // ...and the predicate has to be able to fire, or a clean sheet means
  // nothing. The reported sentence, kept here as a fixture precisely because
  // it is the one that kept coming back.
  if (!improvementFaults('the run no longer breaks when you move').length) {
    out.push('the improvement guard does not catch the sentence it was written for');
  }
  if (!improvementFaults('a miss does not break the run').length) {
    out.push('the improvement guard does not catch the reworded version');
  }
  // ...and must not fire on a plain statement of what an ability does.
  for (const fine of [
    'the run holds while you move',
    'every hit leaves Bleed behind',
    'they are slowed for 3s after it lets go',
    'what it calls arrives with a shield already up',
    'it holds against typed and untyped damage alike',
  ]) {
    const why = improvementFaults(fine);
    if (why.length) out.push(`the improvement guard refuses a plain statement (${why.join(', ')}): "${fine}"`);
  }

  const allLabels = new Map();   // label -> "ladder rank"
  for (const [key, ladder] of Object.entries(RANK_LADDERS)) {
    const seenRanks = Object.keys(ladder);
    if (seenRanks.join(',') !== RANKS.join(',')) {
      out.push(`${key} has ranks ${seenRanks.join(',')}, expected ${RANKS.join(',')}`);
    }
    const fields = [];
    for (const rank of RANKS) {
      const pool = ladder[rank] || [];
      // A pool of one is a rank every ability of this kind shares, which is
      // the fault the census found (21.1% of abilities carrying the same
      // sentence). Two is the floor; three is what the ladders ship with.
      // ROUND 204 -- `mastery` is exempt, and the exemption is named rather
      // than a length tweak. Every other ladder offers a CHOICE, and a pool of
      // one there is the census fault this rule was written for: one sentence
      // on every ability of that kind. A mastery line is a PROGRESSION -- the
      // user's own ordering, proficiency then damage then the conjuration --
      // and three Spear Masteries that each taught a different third of the
      // spear would be the thing nobody asked for.
      const progression = PROGRESSION_LADDERS.includes(key);
      if (!progression && pool.length < 2) out.push(`${key} ${rank} offers only ${pool.length} rung(s)`);
      // A progression may leave a rank empty when that rank's step is granted
      // elsewhere -- `mastery` iron is the proficiency itself. More than one
      // is still wrong: it would be a choice inside a line.
      if (progression && pool.length > 1) out.push(`${key} ${rank} is a progression and must offer at most one rung`);
      for (const r of pool) {
        // Rule 1: a rung names a mechanic, and something behind it.
        if (!r.grants || !Object.keys(r.grants).length) {
          out.push(`${key} ${rank} is a label with nothing behind it: "${r.label}"`);
        }
        const why = fillerReason(r.label);
        if (why) out.push(`${key} ${rank} is filler (${why}): "${r.label}"`);
        // A rung must not be a bare magnitude.
        if (/^(it|the \w+) [\w ]+ (a tenth|a fifth|a quarter|\d+%)\s*$/.test(r.label)) {
          out.push(`${key} ${rank} is a magnitude, not a mechanic: "${r.label}"`);
        }
        // The card capitalises the first letter of a rank line, so a rung must
        // not start with one of its own -- but a rung may start with a figure
        // ("15% of the damage...", "+10% critical chance..."), which is not a
        // capital and was the first version of this check's only finding.
        if (/^[A-Z]/.test(r.label)) out.push(`${key} ${rank} starts with a capital (the card capitalises for it)`);
        // No sentence appears in two places anywhere in the game -- EXCEPT
        // between `strike` and `repeat`, which are the same archetype split by
        // whether the ability is spammable. A repeating bolt is a bolt, and
        // "every hit leaves Bleed behind" is the right iron rung for both. The
        // exemption is the pair, named, rather than a blanket skip.
        const twin = allLabels.get(r.label);
        const sharedPair = twin && /^(strike|repeat) /.test(twin) && (key === 'strike' || key === 'repeat');
        if (twin && !sharedPair) out.push(`"${r.label}" is offered by both ${twin} and ${key} ${rank}`);
        else if (!twin) allLabels.set(r.label, `${key} ${rank}`);
        fields.push(...Object.keys(r.grants || {}));
      }
    }
    // No two rungs in one ladder grant the same field -- a ladder that grants
    // `extraTargets` twice is one rank-up sold as two.
    const dupes = fields.filter((f, i) => fields.indexOf(f) !== i);
    if (dupes.length) out.push(`${key} grants ${[...new Set(dupes)].join(', ')} more than once`);
  }

  // --- the magnitude survived the removal of the sentence -----------------
  //
  // test_round89's check, in this file's own terms: an ability's figures must
  // still grow with its rank. The first draft of round 202 deleted the potency
  // field along with the label it printed, and a gold ability's card showed
  // iron's numbers.
  // ROUND 220 -- and the guard fixtures carry the pool they are a fixture
  // for. `SHIELDED` has gated the ward rungs on `absorb` since round 204b and
  // the sharing gate now joins it, so a probe with neither was measuring a
  // ladder no real shield climbs.
  const grew = ladderFor({ name: 'Wrought Phial', template: 'absorbShield', absorb: 30 }, { defensive: true });
  const total = grew.reduce((n, r) => n + (r.potency || 0), 0);
  if (!(total > 0.4)) out.push(`a full ladder buys ${total} potency; the ranks are supposed to grow the figures`);
  // ...and no rung BOTH grows the figures and talks about growing them, which
  // is the whole fault this round removed. Tested with the filler guard rather
  // than a word list: "it returns a quarter of what it absorbs to whoever spent
  // it" says "a quarter" and names exactly a quarter of what, and a word list
  // flagged it on the first try.
  for (const r of grew) {
    if (r.potency && fillerReason(r.label)) {
      out.push(`a rung both grows the numbers and says so: "${r.label}"`);
    }
  }
  // The striking ladders keep the one figure they always had, at gold, and it
  // is the figure test_round89 asserts by name.
  // ROUND 220 (item 11.2) -- `base` is not decoration on this fixture any
  // more. `ladderKeyFor` now asks whether the ability LANDS A BLOW before it
  // hands out the striking ladder, and a probe with no damage was reaching
  // `boon` and being asked about the striking ladder's potency.
  const striking = ladderFor({ name: 'Leech Bite', template: 'projectileBall', category: 'attack', base: 10 }, {});
  const goldRung = striking.find(r => r.rank === 'gold');
  if (!goldRung || goldRung.potency !== 0.25) {
    out.push(`a striking gold rung buys ${goldRung && goldRung.potency} potency, not the 0.25 it always did`);
  }
  if (striking.filter(r => r.potency).length !== 1) {
    out.push('a striking ladder buys magnitude at more than its gold rank');
  }

  // --- the pick is stable, and it spreads --------------------------------
  const spec = { name: 'Blade Ward', template: 'absorbShield', absorb: 30 };
  const a1 = ladderFor(spec, { defensive: true }).map(r => r.label).join('|');
  const a2 = ladderFor({ ...spec }, { defensive: true }).map(r => r.label).join('|');
  if (a1 !== a2) out.push('the same ability climbs a different ladder on a second call');
  if (ladderFor(spec, { defensive: true }).length !== 4) out.push('a fully-eligible spec does not get four rungs');
  // Two hundred differently-named guards must not all get one ladder. The bar
  // is deliberately loose (a quarter of the 81 combinations): the point is
  // that the pick VARIES, not that it is uniform.
  const distinct = new Set();
  for (let i = 0; i < 200; i++) {
    distinct.add(ladderFor({ name: `Guard ${i}`, template: 'absorbShield', absorb: 30 }, { defensive: true })
      .map(r => r.label).join('|'));
  }
  if (distinct.size < 20) out.push(`200 differently-named guards produced only ${distinct.size} distinct ladders`);
  // ...and no single sentence dominates.
  const counts = {};
  for (let i = 0; i < 400; i++) {
    for (const r of ladderFor({ name: `Ward ${i}`, template: 'absorbShield', absorb: 30 }, { defensive: true })) {
      counts[r.label] = (counts[r.label] || 0) + 1;
    }
  }
  const worst = Math.max(...Object.values(counts));
  if (worst > 400 * 0.55) out.push(`one rung lands on ${(worst / 4).toFixed(0)}% of guards`);

  // ===== ROUND 204c -- NO IRON RUNG IS A DELTA ==========================
  //
  // The rule `isRelativeMagnitude` exists for. Six rounds of this fault were
  // six different phrasings caught one at a time; this is the shape they all
  // share, and it does not care which words the next author reaches for.
  //
  // Scoped to iron because that is where a delta is a comparison to nothing.
  // At bronze and above the ability HAS a previous version and "it lasts half
  // again as long" is one of the clearest things a rank-up can say.
  for (const [key, ladder] of Object.entries(RANK_LADDERS)) {
    for (const r of (ladder.iron || [])) {
      if (isRelativeMagnitude(r.label)) {
        out.push(`${key} iron is a delta with nothing to be a delta from: "${r.label}"`);
      }
    }
  }

  // Every archetype is reachable: a ladder nothing can select is a ladder
  // nobody will ever read, which is the "written by one side, read by none"
  // fault this project keeps finding.
  const probes = [
    ['mend', { template: 'selfHeal' }, { heals: true }],
    // The probe that found the reordering above: a defensive PASSIVE must
    // climb the standing ladder, not the guard's.
    ['standing', { kind: 'passive', template: 'passiveBuff', buffKind: 'armor' }, { defensive: true }],
    // ...and the probe test_round47 became: a passive that ARMS YOUR BLOWS is
    // a striking ability, whatever its kind. Both are here because the two
    // orderings are each right about one of them and wrong about the other.
    ['strike', { kind: 'passive', template: 'weaponAffinity' }, {}],
    ['guard', { template: 'absorbShield', absorb: 30 }, { defensive: true }],
    ['stride', { template: 'dash' }, { movement: true }],
    ['called', { template: 'activeSummon' }, { summon: true }],
    ['conjured', { template: 'summonWeapon' }, { summon: true }],
    ['hold', { template: 'timeFreeze' }, {}],
    ['strike', { template: 'projectileBall', base: 10 }, { strikes: true }],
    ['repeat', { template: 'projectileBall', base: 10, spammable: true, scaleOn: 'successiveUses' }, { strikes: true }],
    // ...and derived, with no flag handed in at all.
    ['strike', { template: 'projectileBall', category: 'attack', base: 10 }, {}],
    ['repeat', { template: 'chainStrike', category: 'attack', base: 10, spammable: true, scaleOn: 'successiveUses' }, {}],
    ['standing', { kind: 'passive', template: 'passiveBuff' }, {}],
    // ROUND 204 -- the mastery line, and the two probes that matter about it:
    // `prof` wins over the affinity's striking test, and it wins over the
    // conjuring test too, which is the one the silver rung would otherwise
    // create for itself.
    ['mastery', { kind: 'passive', template: 'weaponAffinity', prof: 'polearm' }, {}],
    ['mastery', { kind: 'passive', template: 'summonWeapon', prof: 'blade' }, { summon: true }],
    // ROUND 204b -- the boon, which is both a real archetype and the fallback.
    // Both probes matter: a self-buff must reach it by its own shape, and an
    // unclassifiable spec must reach it rather than being told it is a shield.
    ['boon', { template: 'selfPower', category: 'buff', buffDuration: 10 }, {}],
    ['boon', { template: 'somethingNobodyHasClassifiedYet' }, {}],
    // ROUND 205 -- the arsenal, and the probe that matters about it: the
    // confluence sweep stamps `arsenal` onto whichever passive the confluence
    // slot already holds, which may well be a mastery carrier, and the arsenal
    // has to win. A passive that is only a mastery still climbs the mastery
    // line, which the two probes above assert.
    ['arsenal', { kind: 'passive', template: 'weaponAffinity', prof: 'power', arsenal: true }, {}],
  ];
  const seen = new Set();
  for (const [want, spec, tags] of probes) {
    const got = ladderKeyFor(spec, tags);
    if (got !== want) out.push(`a ${spec.template} climbs the ${got} ladder, expected ${want}`);
    seen.add(got);
  }
  for (const k of LADDER_KEYS) if (!seen.has(k)) out.push(`nothing selects the ${k} ladder`);

  // Rule 2, both directions.
  const gated = { label: 'x', grants: { y: 1 }, requires: 'cooldown' };
  if (rungApplies(gated, { kind: 'passive' })) out.push('a rung gated on a cooldown is offered to something with no cooldown');
  if (!rungApplies(gated, { cooldown: 12 })) out.push('a rung gated on a cooldown is refused to something that has one');
  if (rungApplies(gated, { cooldown: 0 })) out.push('a zero cooldown counts as having one');
  if (!rungApplies({ grants: {}, requires: null }, {})) out.push('an ungated rung was refused');

  // --- the guard itself, against the strings this round deleted -----------
  const mustCatch = [
    'the guard holds a tenth further than it did',
    'the working holds a fifth further again',
    'the mending closes wounds a quarter further still',
    'it strikes a quarter harder',
    'What it summons arrives stronger than the summoning would normally allow.',
    'It restores 18% more than it otherwise would, and reaches 240.',
    'A shoulder that reaches further and hits heavier than it should.',
    'and carries a little further',
    'and your marks bite a little deeper',
    'It hits 24% harder',
    'It works 24% harder',
    'everything it does is 10% stronger',
  ];
  for (const s of mustCatch) {
    if (!fillerReason(s)) out.push(`the filler guard does not catch: "${s}"`);
  }
  // ...and against the clauses that LOOK comparative and are not, because they
  // print the referent beside them. A guard that catches these is a guard that
  // would delete real information.
  const mustPass = [
    'it comes back in 12.4s, and using it increases your movement speed by 20% for 4s',
    'you pick things up from 40% further away',
    'stronger against the unhurt: +8% per 10% of their health remaining (max +40%)',
    'the grip runs longer than the haft does: 18% more reach',
    'every ally inside 5.5 tiles makes it 5% stronger, to a limit of 4',
    'deepens 3% a tick the longer they stay (to 15%)',
    '+10% critical chance with this ability',
    'each repeat raises the cost half as much',
    'it lifts one condition as it heals',
    'a second may stand at once',
  ];
  for (const s of mustPass) {
    const why = fillerReason(s);
    if (why) out.push(`the filler guard would delete real information (${why}): "${s}"`);
  }
  if (fillerReason('') !== null) out.push('empty text reads as filler');

  return out;
}
