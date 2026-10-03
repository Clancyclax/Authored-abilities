// ============================================================================
// ROUND 57 -- WHAT EACH MONSTER LEAVES ON YOU
//
// The user's own examples are the specification:
//
//   "Monsters should have these as well. (Also as thematically appropriate.
//    I.E. Spiders slowing through webs and poisoning, ice monsters freezing
//    players, fire monsters burning players)"
//
// Two of those three could not have worked before this file existed, and not
// because the debuffs were missing.
//
// THE ICE MONSTERS WERE NOT ICE
//
// A spawned monster takes its damage element from FAMILY_ELEMENT, which is
// keyed by FAMILY only. So all five elementals were `lightning` -- including
// elementalWater -- and every chimera was `fire`, including chimeraGlacial. The
// game had ninety monsters and not one of them dealt frost damage. "Ice
// monsters freezing players" had no ice monsters to start from.
//
// The variant suffix has always carried the theme (Water, Glacial, Ember,
// Void); nothing had ever read it. VARIANT_ELEMENT below is that reading, and
// it is a fix to the existing element system as much as a foundation for
// debuffs: frost resistance and the round-38 weakspot passive both key off
// dmgElement, and both were blind to half the roster's actual character.
// ============================================================================

import { DEBUFFS } from './debuffs.js';
// ROUND 105 -- `monsterDebuffFaults` needs each family's base element to
// resolve a monster's real one; without it half the table looks uncarried.
import { FAMILY_ELEMENT } from './stats.js';

// ---------------------------------------------------------------------------
// VARIANT -> ELEMENT. Applied over FAMILY_ELEMENT, never under it: a family
// with a strong identity (every hellhound is a fire creature) keeps it unless
// the variant says otherwise, and a variant that names an element outright
// wins. Only suffixes that genuinely name an element appear here -- Gilded,
// Ashen and Crimson are colours, not claims, and are left to the family.
// ---------------------------------------------------------------------------
export const VARIANT_ELEMENT = {
  // water and cold
  Water: 'frost', Azure: 'frost', Glacial: 'frost', Blue: 'frost',
  Quartz: 'frost',
  // fire
  Fire: 'fire', Ember: 'fire', Infernal: 'fire', Red: 'fire', Ruby: 'fire',
  // storm
  Lightning: 'lightning', Storm: 'lightning',
  // living growth
  Verdant: 'nature', Verdigris: 'nature', Emerald: 'nature', Jade: 'nature',
  Green: 'nature', Swamp: 'nature', Venom: 'nature',
  // dark
  Darkness: 'shadow', Void: 'shadow', Umbral: 'shadow', Gloom: 'shadow',
  Onyx: 'shadow', Obsidian: 'shadow', Dusk: 'shadow', Black: 'shadow',
  Violet: 'shadow', Amethyst: 'shadow', Purple: 'shadow',
  // light
  Gilded: 'radiant', Gold: 'radiant', White: 'radiant',
  // earth and bone read as untyped force
  Earth: null, Bone: null, Rusted: null, Grey: null,
};

/** The element a spawned monster of this type actually deals. Variant first,
 *  family second. Exported because the spawn path and the bestiary both need
 *  the same answer, and round 27 already shipped one bug from two places
 *  disagreeing about a monster's element. */
export function monsterElement(typeKey, family, familyElement) {
  const suffix = String(typeKey || '').slice(String(family || '').length);
  if (Object.prototype.hasOwnProperty.call(VARIANT_ELEMENT, suffix)) {
    return VARIANT_ELEMENT[suffix];
  }
  return familyElement || null;
}

// ---------------------------------------------------------------------------
// WHAT THE FAMILY DOES
//
// Each entry is a list of { key, chance, potency }. `chance` is per landed
// blow; `potency` scales the debuff's own magnitude and duration bands, so a
// dragon's burn is the same debuff as a bat's but a worse one to be carrying.
//
// Chances are deliberately low. Nineteen debuffs applied liberally is a player
// who is permanently five things at once and cannot tell which of them is
// hurting -- the round-53 lesson in a new costume. One thing at a time, landing
// often enough to notice, is the goal.
// ---------------------------------------------------------------------------
const D = (key, chance, potency = 1) => ({ key, chance, potency });

export const FAMILY_DEBUFFS = {
  // The user's own first example, in full: the web AND the venom.
  spider: [D('slowMove', 0.30, 1.1), D('poison', 0.35, 1.0)],

  // Ambush predators open wounds.
  wolf: [D('bleed', 0.28, 1.0)],
  raptor: [D('bleed', 0.30, 1.1), D('slowMove', 0.12)],
  trex: [D('bleed', 0.35, 1.4), D('stun', 0.10, 1.0)],
  spinosaurus: [D('bleed', 0.30, 1.3), D('slowMove', 0.15, 1.2)],

  // Weight and impact.
  // The tusk that turns a killing blow into a glancing one.
  boar: [D('stun', 0.16, 1.0), D('slowMove', 0.15), D('critDamageDown', 0.22, 1.0)],
  slimeGolem: [D('sunder', 0.30, 1.2), D('slowMove', 0.20, 1.1), D('speedDown', 0.18, 1.1)],

  // Things that corrode.
  slime: [D('sunder', 0.25, 1.0), D('slowMove', 0.18)],
  lizard: [D('poison', 0.25, 0.9)],
  hydra: [D('poison', 0.35, 1.2), D('disease', 0.15, 1.0), D('exsanguination', 0.12, 1.0)],

  // Fire, the user's third example.
  hellhound: [D('burn', 0.40, 1.1)],
  dragon: [D('burn', 0.45, 1.5), D('sunder', 0.20, 1.3)],
  chimera: [D('burn', 0.30, 1.2), D('bleed', 0.20, 1.0)],

  // The dead and the damned.
  skeleton: [D('unholy', 0.25, 1.0), D('slowAttack', 0.20)],
  // ROUND 201 -- [Legacy of Sin] is what the sin leaves once it has burned out,
  // and a shade is what a person leaves once they have. The two readings are
  // the same reading, which is why this row and not another.
  // ROUND 227 -- and [Fracturing], which is the same reading again: a shade
  // is already a copy of somebody, and an affliction that makes you shed
  // copies of yourself is what one would leave on you. Low, because it turns
  // the PLAYER's attacker into more attackers and a common roll would make
  // every shade fight a crowd.
  shade: [D('curse', 0.25, 1.0), D('spiritDown', 0.22, 1.0), D('recoveryDown', 0.18, 1.0),
    D('legacyOfSin', 0.16, 1.0), D('fracturing', 0.08, 1.0)],
  // ROUND 221 -- the [Blade of Doom] conditions, given to the things that
  // would plausibly know them. A demon is the one creature on this roster
  // that bargains, so [Price in Blood] -- an affliction that binds the
  // inflictor to the target and cannot be lifted while either lives -- is a
  // demon's affliction by construction; and [Vulnerable] is what something
  // unholy does to your defences before it does anything else.
  // ROUND 224 -- and the [Haemorrhage] conditions, given to the two things on
  // this roster that would know them. A demon offers you up
  // ([Sacrificial Victim]) and opens what has no blood to open
  // ([Blood From a Stone]); a hydra is the thing that makes you bleed more
  // than a body should ([Exsanguination]).
  // ROUND 228 -- and [Weakness of the Flesh] joins [Blood From a Stone] here,
  // because they are the same sentence about two different channels and a
  // demon is where round 224 put the first one: "opens what has no blood to
  // open." This is the door that lets a disease into a thing with no biology,
  // and the demon is the roster's one creature whose business is getting
  // inside what should be closed. It carries no `element` of its own, so
  // unlike its three necrotic cousins it survives `suitsElement` on a family
  // row and does not have to be exiled to ELEMENT_DEBUFFS.
  demon: [D('curse', 0.28, 1.3), D('unholy', 0.22, 1.2), D('powerDown', 0.20, 1.2),
    D('priceInBlood', 0.14, 1.0), D('vulnerable', 0.20, 1.0),
    D('sacrificialVictim', 0.16, 1.0), D('bloodFromStone', 0.10, 1.0),
    D('weaknessOfTheFlesh', 0.10, 1.0)],
  bat: [D('disease', 0.25, 0.9), D('slowCast', 0.18)],

  // Elementals carry whatever they are made of -- resolved per variant below,
  // because "elemental" as a family says nothing about what it does to you.
  elemental: [],
};

// ---------------------------------------------------------------------------
// WHAT THE ELEMENT DOES, on top of the family
//
// This is what makes elementalWater a different fight from elementalFire
// without needing five hand-written entries per family. A monster whose element
// resolves to frost can freeze you whatever it is; one that resolves to shadow
// can curse you.
// ---------------------------------------------------------------------------
export const ELEMENT_DEBUFFS = {
  // Cold takes the strength out of a blow as much as the speed out of a step.
  frost: [D('freeze', 0.14, 1.0), D('slowMove', 0.30, 1.2), D('slowAttack', 0.18),
    D('critDamageDown', 0.20, 1.0)],
  fire: [D('burn', 0.35, 1.1)],
  lightning: [D('stun', 0.14, 1.0), D('slowCast', 0.25, 1.1), D('sunder', 0.15)],
  nature: [D('poison', 0.30, 1.0), D('disease', 0.12)],
  // ROUND 221 -- the three Ruinations belong to the shadow channel rather
  // than to any one family, and they are here rather than in FAMILY_DEBUFFS
  // for a reason worth writing down: `suitsElement` filters a family's list
  // against the monster's resolved element, and these rows declare
  // `element: 'necrotic'` -- the damage they DEAL, not the channel the
  // creature is. Put on a family they were silently dropped by a guard that
  // exists to stop a Glacial chimera setting people on fire, which is a good
  // guard catching the wrong thing. ELEMENT_DEBUFFS is not filtered, because
  // an entry here has already said which element it belongs to.
  //
  // All three on one line and all three at a low chance, deliberately: the
  // point of the triplet is that three identical necrotic dots need three
  // different cleanses, so meeting one at a time is the fight. Meeting all
  // three at once is [Blade of Doom]'s bronze rung, and that is an ability.
  // ROUND 224 -- `necrotoxin` joins the Ruinations here and for the identical
  // reason: it declares `element: 'necrotic'` -- the damage it DEALS -- and
  // `suitsElement` filters a family's list against the creature's own
  // element, so on a family row it was silently dropped by a guard written to
  // stop a Glacial chimera setting people on fire.
  // ROUND 228 -- and `creepingDeath`, for the third time for the third reason
  // that is the same reason: it declares `element: 'necrotic'` -- the damage it
  // DEALS -- and `suitsElement` filters a family's list against the creature's
  // own element, so on a family row it would be silently dropped by the guard
  // that stops a Glacial chimera setting people on fire.
  shadow: [D('curse', 0.20, 1.0), D('unholy', 0.20, 1.0), D('spiritDown', 0.15),
    D('ruinationBlood', 0.10, 1.0), D('ruinationFlesh', 0.10, 1.0),
    D('ruinationSpirit', 0.10, 1.0), D('necrotoxin', 0.10, 1.0),
    D('creepingDeath', 0.10, 1.0)],
  radiant: [D('holy', 0.22, 1.0), D('critChanceDown', 0.18)],
};

// ---------------------------------------------------------------------------
// A HANDFUL OF NAMED VARIANTS
//
// Only where the name promises something neither its family nor its element
// would give it. Everything else is covered by the two tables above, which is
// the point -- ninety hand-written entries would rot the first time a monster
// was added.
// ---------------------------------------------------------------------------
export const VARIANT_DEBUFFS = {
  spiderWidow: [D('poison', 0.45, 1.4)],          // the widow is the venom one
  spiderVoid: [D('curse', 0.20, 1.1)],
  wolfCrimson: [D('bleed', 0.40, 1.3)],
  skeletonBloodforged: [D('bleed', 0.30, 1.2)],
  // ROUND 229 -- THE THREE BLOOD AFFLICTIONS, AND WHY ALL THREE ARE VARIANTS.
  //
  // [Leech Toxin] does nothing on a target that is not bleeding -- its whole
  // mechanic is "when [Bleeding] is negated, an instance is consumed to reapply
  // it". So it cannot go anywhere that does not already bleed, or the player
  // would meet the condition, read what it does, and never once see it do it.
  // The sanguine shade is the only thing on this roster that carries both a
  // bleed and a recovery penalty, which is the pairing the toxin is written to
  // make worse: the bleed is what it holds open and the penalty is why you
  // wanted to close it.
  //
  // The other five [Blood Harvest] conditions carry no monster at all and are
  // not supposed to: they are BOONS, `helpful: true`, and
  // `uninflictedConditions()` derives that exception from the row. A monster
  // that could grant the player [Blood Frenzy] would be a bug, not a gap.
  shadeSanguine: [D('bleed', 0.28, 1.1), D('recoveryDown', 0.22, 1.0),
    D('leechToxin', 0.16, 1.0)],
  // [Tainted Meridians] fouls what a caster spends. A venom cobra is the
  // roster's purest poison delivery, and this is a poison that attacks the
  // channels rather than the flesh -- which is also why it is not on the
  // `cobra` family: four of the five cobras would then carry a caster-punishing
  // affliction, and the point of a variant tier is that a specialist is rare
  // enough to remember.
  cobraVenom: [D('taintedMeridians', 0.14, 1.0)],
  // [Thief of Life] declares `element: 'necrotic'` -- the damage it deals -- so
  // a family row would drop it to `suitsElement`, the guard that stops a Glacial
  // chimera setting people on fire. Rounds 221 and 224 answered that by exiling
  // their rows to ELEMENT_DEBUFFS; round 228 found that VARIANT_DEBUFFS is not
  // filtered at all, so the flavour and the element can both survive. An
  // umbral scorpion is a thing whose sting takes something with it.
  //
  // It is the first condition a monster carries that TRANSFERS to its source,
  // so this row is also what proves `TAG.drain`'s new reader works from the
  // monster's side of the fight -- round 57's founding rule, that a debuff means
  // the same thing whichever side is carrying it.
  scorpionUmbral: [D('thiefOfLife', 0.14, 1.0)],
  // ===== ROUND 230 -- THE SIX SIN AFFLICTIONS, AND WHERE JUDGEMENT LIVES ===
  //
  // All six on the VARIANT tier, which by round 228 is the established answer
  // for a canon condition: `VARIANT_DEBUFFS` is not filtered by `suitsElement`,
  // so a row can keep both the element it deals and the creature it suits.
  // Three of these declare one ([Penance] transcendent, [Wages of Sin] and
  // [Thief of Spirit] necrotic) and would have been silently dropped off a
  // family list by the guard that stops a Glacial chimera setting people on
  // fire.
  //
  // AND THE ROSTER ALREADY HAD SOMEWHERE FOR THEM. Round 201 put the canon Sin
  // conditions on the gilded demon with a reason worth reusing: "a gilded demon
  // is the one creature on the roster whose whole character is passing
  // sentence." [Penance] is transcendent judgement that spends itself, so it
  // belongs beside the [Sin] that demon has carried for twenty-nine rounds, and
  // [Price of Absolution] -- which bills you for absolving yourself of that very
  // [Sin] -- belongs on the same creature or the pair never meets.
  //
  // The angels take the other holy pair. A radiant birdangel inflicting
  // [Weight of Sin] is the cleanest statement of that condition there is: being
  // healed in front of it hurts.
  demonGilded: [D('holy', 0.20, 1.2), D('sin', 0.26, 1.2),
    D('penance', 0.16, 1.0), D('priceOfAbsolution', 0.12, 1.0)],
  birdangelRadiant: [D('weightOfSin', 0.14, 1.0)],
  // ===== ROUND 231 -- THE FIVE DOOM AFFLICTIONS ===========================
  //
  // A harbinger is a thing that announces what is coming, so the three that
  // belong to [Inexorable Doom] go to three harbingers -- and [Inexorable Doom]
  // itself to the void one, which is the only creature on this roster it would
  // not be an overstatement on. That row is the most dangerous one this file has
  // ever handed a monster: it DEEPENS every stacking affliction the player is
  // already carrying, every four seconds. Hence the lowest chance in the table
  // and a potency of 1.0 -- a pack that could all roll it would compound a
  // poison into a death sentence, and the three limits in `_tickDebuffs` are
  // what make one of them a fight instead.
  harbingerVoid: [D('inexorableDoom', 0.08, 1.0)],
  harbingerAzure: [D('inescapable', 0.12, 1.0)],
  harbingerVenom: [D('persecution', 0.12, 1.0)],
  // The two holy ones to two angels, which is where round 230 put [Weight of
  // Sin] for the same reason: judgement delivered by something that thinks it is
  // entitled to. [Penitence] answers your own cleanses with [Penance], and
  // [Sanction] shuts healing down the worse things get -- so a gilded birdangel
  // punishes recovery twice over, which is a fair statement of what it is.
  birdangelGilded: [D('penitence', 0.12, 1.0), D('sanction', 0.10, 1.0)],
  // ROUND 233 -- [VIBRANT ECHO], TO THE THING MADE OF GLASS.
  //
  // Resonating force is what rings through a rigid body, and a crystal glasscat
  // is the most rigid thing on this roster -- so an affliction that leaves a body
  // ringing belongs on the creature whose whole substance would. It is also the
  // right way round for the player to LEARN the channel: meeting [Vibrant Echo]
  // on a thing made of glass is the lesson that resonating force and plate are a
  // pairing, which is the entire point of [Shield Breaker].
  //
  // A variant rather than a family row because it declares `element:
  // 'resonating'` -- the damage it deals -- and `suitsElement` filters a family's
  // list against the CREATURE's element, the guard that stops a Glacial chimera
  // setting people on fire. VARIANT_DEBUFFS is not filtered; rounds 228 to 231
  // all landed here for the same reason.
  glasscatCrystal: [D('vibrantEcho', 0.16, 1.0)],
  // ===== ROUND 238 -- [CAGED], FROM SOMETHING THAT ACTUALLY GROWS ===========
  //
  // [Verdant Cage] is Neil's, and its condition is the one new row this round
  // that a monster can sensibly put on the PLAYER: being held in place by vines
  // is an affliction from either end, unlike the round's three boons.
  //
  // A verdant mantis, for two reasons. `shade: 'verdant'` is the roster's plant
  // marker, so the creature is the growth it binds you with rather than a
  // creature that happens to know a plant spell -- and a mantis is the roster's
  // ambush predator, which is the one creature for whom "you cannot walk away,
  // but you can still cast" is a genuine threat rather than an inconvenience.
  // [Caged] deliberately sets `stopsMove` without `stopsAct`.
  //
  // A variant rather than a family row for the fifth round running, and the same
  // reason each time: `suitsElement` filters a family's list against the
  // creature's element and VARIANT_DEBUFFS is not filtered, so a Glacial mantis
  // cannot grow anything.
  //
  // Low chance and short: the condition's own duration is 4-7 seconds with
  // control diminishing returns on top, and a root a player meets often is a
  // player who stops walking into that region.
  mantisVerdant: [D('verdantCage', 0.14, 1.0)],
  // ROUND 234 -- [RADIANT ECHO], TO THE THING THAT HAS NO BODY.
  //
  // Its twin went to the most rigid creature on the roster last round, because
  // resonating force is what rings through plate. This is the other half of that
  // pairing: disruptive force is answered by WARDS rather than armour, so the
  // affliction belongs on the creature that has no armour to speak of and is all
  // ward -- and an amethyst spirit serpent is the roster's purest statement of
  // that. Meeting the two on two opposite creatures is how a player learns which
  // channel to bring, which is the whole point of [Shield Breaker] and
  // [Spirit Reaper] existing in one character's kit.
  //
  // A variant rather than a family row for the fourth round running: it declares
  // `element: 'disruptive'` -- the damage it deals -- and `suitsElement` filters a
  // family's list against the CREATURE's element.
  spiritSerpentAmethyst: [D('radiantEcho', 0.16, 1.0)],
  // ===== ROUND 235 -- THE TWO SHIELD AFFLICTIONS ==========================
  //
  // [Slow Learner] to the steel raptor, and the joke is the point: it is the
  // roster's most relentless thing, and an affliction that punishes a creature
  // for hitting the same barrier over and over belongs on whatever will keep
  // doing it. It carries no element, so unlike most canon rows it would have
  // survived a family list -- it is a variant because ONE of the five raptors
  // being the one that teaches you this lesson is better than all of them.
  steelRaptorStorm: [D('slowLearner', 0.14, 1.0)],
  // [Death's Grip] to the umbral yeti, which is the roster's cold, patient
  // thing. The condition is nearly nothing on arrival and gets worse with every
  // scrap of rot the victim takes, so it belongs on something that expects the
  // fight to be long -- and low, because on a player already carrying a necrotic
  // dot it compounds quietly.
  yetiUmbral: [D('deathsGrip', 0.12, 1.0)],
  // A thing whose whole business is ending yours. `mortality` carries no element
  // and would have survived a family row -- it is here for consistency with the
  // other five and because the harbinger is a better statement of it than the
  // whole family would be.
  harbingerGilded: [D('mortality', 0.12, 1.0)],
  // The two unholy ones go to the two shades that suit them -- a void shade
  // takes spirit, an umbral one is what the rot leaves -- and they are MERGED
  // INTO THOSE ROWS further down rather than declared here. See the note on
  // `shadeVoid` in round 90's block: the first cut of this round wrote
  // `shadeVoid` and `shadeUmbral` a second time at this spot, which a JavaScript
  // object literal accepts in silence and resolves in favour of the LAST
  // occurrence -- so both new conditions were declared, overwritten by rows a
  // hundred lines below, and measured as uncarried. Twice in one round, on two
  // different keys. `test_round230` now greps this file for a repeated key in
  // any of the three tables, because a runtime check cannot see a duplicate
  // that the parser has already thrown away.
  hellhoundVoid: [D('unholy', 0.25, 1.1)],
  batGloom: [D('critChanceDown', 0.25, 1.1)],
  slimeViolet: [D('spiritDown', 0.20, 1.0)],
  trexBone: [D('powerDown', 0.20, 1.1)],
  lizardBone: [D('powerDown', 0.18, 1.0)],
  boarOnyx: [D('speedDown', 0.22, 1.0)],
  // ROUND 201 -- the thing that judges you. A gilded demon is the one creature
  // on the roster whose whole character is passing sentence, so it is where the
  // canon Sin conditions belong. The mark is NOT listed: it is `markOfSin`'s
  // companion of `sin` (see debuffs.js) and arrives with it through the one
  // door every debuff walks through -- listing it here would apply it twice.
  //
  // ROUND 230 -- and [Penance] and [Price of Absolution] join them, on the
  // strength of this note's own reasoning. The row itself has MOVED to the
  // round-230 block below rather than growing here: the first cut of that block
  // wrote a second `demonGilded` key further up the same object literal, which
  // JavaScript accepts silently and resolves in favour of the LAST one -- so the
  // two new conditions were declared and then thrown away by a duplicate the
  // reader could not see. One key, one place.
  // ROUND 228 -- [RIGOR MORTIS], AND WHY IT IS A VARIANT RATHER THAN THE
  // SKELETON FAMILY.
  //
  // It belongs on a skeleton by name -- rigor mortis is what a corpse does --
  // and a family row is exactly where it cannot go: it declares
  // `element: 'necrotic'` (the necrotic damage its second clause charges on
  // application) and `suitsElement` filters a family's list against the
  // CREATURE's element, so on `skeleton` the guard that stops a Glacial
  // chimera setting people on fire would silently drop it. Rounds 221 and 224
  // answered that by moving their rows to ELEMENT_DEBUFFS, which works and
  // costs the flavour.
  //
  // VARIANT_DEBUFFS is not filtered -- it is the most specific statement about
  // a creature, so nothing overrides it -- so the flavour and the element can
  // both survive. An ashen skeleton is the one on this roster that has been
  // dead longest.
  //
  // The chance is low and the potency is 1.0 for the reason the Ruinations are:
  // each new instance bills the player for every instance already on them, so a
  // common roll on a pack would be charging compound interest.
  skeletonAshen: [D('rigorMortis', 0.14, 1.0)],
  dragonDarkness: [D('curse', 0.28, 1.5)],
  dragonWater: [D('freeze', 0.18, 1.2), D('slowMove', 0.30, 1.3)],
  chimeraGlacial: [D('freeze', 0.16, 1.1)],

  // ---- ROUND 90: EXPOSED, and it goes on FOUR VARIANTS, not on a family ----
  //
  // CRAFTING_SPEC.md left this open deliberately rather than by default: "a
  // monster that strips your resistances is a genuinely new kind of threat.
  // But it is also the debuff that makes everything else hurt more, which on
  // the receiving end may simply read as unfair."
  //
  // Both halves are true, so the answer is neither "no monster" nor "the
  // whole roster". It goes to four VARIANTS -- the most specific tier in this
  // table, and the one already used for the roster's genuine specialists (the
  // widow's venom, the crimson wolf's bleed) -- chosen because getting THROUGH
  // something is what each of them is for. Four monsters in a roster of 161 is
  // a threat you meet rarely enough to remember and specifically enough to
  // prepare for, and it makes the twentieth debuff symmetric, which is round
  // 57's founding rule: "a debuff has to mean the same thing whichever side of
  // the fight is carrying it."
  //
  // The chances are the lowest in this table and the potencies are 1.0. It
  // strips a fraction of one channel for a few seconds; it does not undress
  // you.
  //
  // Every key here is a REAL variant, checked against MONSTER_TYPES by
  // `MONSTER_DEBUFF_UNKNOWN` at import -- the first draft named four that do
  // not exist (dragonVoid, demonAbyssal, hydraVenom, elementalVoid) and the
  // checker said nothing, because it only validates the DEBUFF ids. That is
  // round 56's dead-stone-id fault wearing a different hat, and it is why the
  // suite counts the monsters that actually carry this rather than reading
  // the table.
  demonVoid: [D('expose', 0.14, 1.0)],        // it finds the seam in whatever you wear
  hydraPurple: [D('expose', 0.15, 1.0)],      // the venom eats the ward first
  elementalDarkness: [D('expose', 0.14, 1.0)],// made of the absence of a channel
  // ROUND 230 -- and [Thief of Spirit], merged into this row rather than given
  // its own `shadeVoid:` key higher up the literal (see the round-230 block for
  // what that cost). A void shade takes spirit; an affliction that bleeds a
  // victim into its caster's mana is the same idea with a ledger.
  shadeVoid: [D('expose', 0.16, 1.0),          // a hole where a resistance was
    D('thiefOfSpirit', 0.14, 1.0)],

  // ==== ROUND 105 -- THE THIRTEEN NOTHING CARRIED =========================
  //
  // Round 57's founding rule, and the one test_round57 exists to hold: "a
  // debuff has to mean the same thing whichever side of the fight is carrying
  // it." Thirteen conditions failed it -- the four cursed ones added earlier
  // this round and the nine added with the coverage work -- and the suite said
  // so the first time it was run against them.
  //
  // Placed at the VARIANT tier for the same reason `expose` was: these are
  // the strongest things in the table, several of them take a power away
  // rather than shaving a number, and a threat you meet rarely enough to
  // remember and specifically enough to prepare for is the shape that works.
  // Chances are the lowest here and the potencies are 1.0.
  //
  // Every key is checked against MONSTER_TYPES at import by
  // MONSTER_DEBUFF_UNKNOWN -- round 90's first draft named four variants that
  // did not exist and nothing complained.

  // THE FOUR CURSES, on things that curse. Each punishes a different habit, so
  // each goes on a creature whose fight is about that habit: a shade that
  // makes casting cost blood, a demon that makes swinging cost blood.
  // ROUND 230 -- and [Wages of Sin], merged here for the same reason. A shade
  // that makes casting cost blood is a fair place for the rot that the sin
  // leaves behind.
  shadeUmbral: [D('cursedMana', 0.16, 1.0), D('wagesOfSin', 0.14, 1.0)],
  demonCrimson: [D('cursedStrike', 0.16, 1.0)],
  spiderGilded: [D('cursedMove', 0.15, 1.0)],
  batViolet: [D('cursedStamina', 0.15, 1.0)],

  // SHOCKED, on the things made of lightning. It is the storm's own condition
  // and it belongs to nothing else.
  elementalLightning: [D('shocked', 0.28, 1.0)],
  thunderbirdStorm: [D('shocked', 0.30, 1.1)],
  dragonLightning: [D('shocked', 0.26, 1.2)],

  // SOAKED, on the things made of water -- and it is the one condition in the
  // table that HELPS against part of what applies it, which is the point of
  // it: a water elemental soaking you makes the lightning that follows worse.
  elementalWater: [D('wet', 0.35, 1.0)],
  crocodileSanguine: [D('wet', 0.25, 1.0)],

  // SUPPRESSED, on four and no more. It takes a player's whole kit away for
  // two or three seconds, which is the strongest thing anything in this table
  // does, so it goes where the fantasy already says "your magic does not work
  // here" -- and at the lowest chances in the file.
  medusaGlacial: [D('suppressed', 0.10, 1.0)],
  minotaurBone: [D('suppressed', 0.09, 1.0)],

  // KARMA and MARKED, on the hunters. Both are about being SINGLED OUT, and a
  // creature that marks you and then hits the mark is a fight with a shape.
  whitelionGlacial: [D('marked', 0.22, 1.0)],
  mantisSanguine: [D('marked', 0.20, 1.0)],
  medusaSanguine: [D('karma', 0.18, 1.0)],

  // THE FOUR PLAIN RATE CUTS, spread across things that grind you down.
  yetiSanguine: [D('dodgeDown', 0.22, 1.0)],
  scorpionGlacial: [D('cooldownSlow', 0.20, 1.0)],
  cobraBone: [D('enervate', 0.22, 1.0)],
  giantToadBone: [D('dampen', 0.20, 1.0)],
};

/** Everything a monster of this type may leave on whoever it hits, merged from
 *  family, element and variant. A key named by more than one source keeps the
 *  HIGHEST chance and potency: the most specific statement about a monster is
 *  the one that was written with it in mind. */
export function monsterDebuffRoll(typeKey, family, element) {
  const out = new Map();
  const take = (list) => {
    for (const e of (list || [])) {
      const prev = out.get(e.key);
      if (!prev || e.chance > prev.chance) {
        out.set(e.key, { key: e.key, chance: e.chance, potency: Math.max(e.potency, prev ? prev.potency : 0) });
      } else if (e.potency > prev.potency) {
        prev.potency = e.potency;
      }
    }
  };
  // The family goes in FIRST, and loses any entry whose debuff belongs to an
  // element this monster is not. A Glacial chimera inherited `burn` from the
  // chimera family and `freeze` from its own frost element, and arrived
  // setting people on fire while freezing them. The variant suffix is the more
  // specific statement about the creature, so where they disagree it wins.
  //
  // Physical afflictions (bleed, stun, sunder) survive the filter on purpose:
  // teeth are teeth whatever the beast is made of.
  const suitsElement = (e) => {
    const def = DEBUFFS[e.key];
    if (!def || !def.element) return true;
    return def.element === element || def.element === 'physical';
  };
  take((FAMILY_DEBUFFS[family] || []).filter(suitsElement));
  take(ELEMENT_DEBUFFS[element]);
  take(VARIANT_DEBUFFS[typeKey]);
  const list = [...out.values()].filter(e => DEBUFFS[e.key]);
  // Nothing should be able to hit you and leave nothing behind at all -- a
  // monster with no debuff of its own is a monster the whole system is
  // invisible on. Physical creatures with no element and no family entry get
  // the plain one: it hurts, and the wound stays open.
  if (!list.length) list.push(D('bleed', 0.20, 0.9));
  return list;
}

/** Cached per type key -- monsterDebuffRoll runs on every landed blow
 *  otherwise, and a pack of thirty spiders swings a lot. */
const _rollCache = new Map();
export function monsterDebuffsCached(typeKey, family, element) {
  const ck = `${typeKey}|${family}|${element}`;
  let v = _rollCache.get(ck);
  if (!v) { v = monsterDebuffRoll(typeKey, family, element); _rollCache.set(ck, v); }
  return v;
}

/** Every debuff key these tables name has to be a real debuff, for the same
 *  reason round 56's stone ids did: a typo here is a monster that silently
 *  never inflicts the thing its own name promises. */
export const MONSTER_DEBUFF_UNKNOWN = (() => {
  const bad = [];
  const check = (label, list) => {
    for (const e of (list || [])) if (!DEBUFFS[e.key]) bad.push(`${label}:${e.key}`);
  };
  for (const [f, l] of Object.entries(FAMILY_DEBUFFS)) check(f, l);
  for (const [e, l] of Object.entries(ELEMENT_DEBUFFS)) check(e, l);
  for (const [v, l] of Object.entries(VARIANT_DEBUFFS)) check(v, l);
  return bad;
})();

/**
 * ROUND 90 -- THE VARIANT KEYS MUST NAME MONSTERS THAT EXIST.
 *
 * `MONSTER_DEBUFF_UNKNOWN` above validates every DEBUFF id and has done since
 * round 57. It has never validated the other half: the KEY a variant entry is
 * filed under. Round 90's first draft of the expose carriers named four --
 * dragonVoid, demonAbyssal, hydraVenom, elementalVoid -- and not one of them
 * is a monster in this game. The table looked right, imported cleanly, and
 * gave `expose` to nobody at all, which is round 56's dead-stone-id fault
 * wearing a different hat.
 *
 * Takes `MONSTER_TYPES` as an argument rather than importing it, because
 * monsters.js is the larger module and this one is imported by the roster.
 */
export function monsterDebuffFaults(MONSTER_TYPES) {
  const out = [...MONSTER_DEBUFF_UNKNOWN];
  const keys = new Set(Object.keys(MONSTER_TYPES || {}));
  for (const k of Object.keys(VARIANT_DEBUFFS)) {
    if (!keys.has(k)) out.push(`VARIANT_DEBUFFS.${k} names no monster`);
  }
  const fams = new Set(Object.values(MONSTER_TYPES || {}).map(t => t.family));
  for (const k of Object.keys(FAMILY_DEBUFFS)) {
    if (!fams.has(k)) out.push(`FAMILY_DEBUFFS.${k} names no family`);
  }
  // And every debuff in the table must be REACHABLE by some monster, which is
  // the promise round 57's suite makes and the one this round nearly broke.
  //
  // THE ELEMENT HAS TO BE RESOLVED, and the first version of this passed
  // `null`. That silently dropped every ELEMENT_DEBUFFS entry AND every family
  // entry that `suitsElement` filters -- so this reported `burn` and `disease`
  // as carried by nothing while the browser suite, which resolves the element
  // properly, said they were fine. A checker that is wrong in the direction of
  // FALSE ALARMS is only slightly better than one that is wrong the other way:
  // both teach you to stop reading it.
  const carried = new Set();
  for (const [key, t] of Object.entries(MONSTER_TYPES || {})) {
    const el = monsterElement(key, t.family, FAMILY_ELEMENT[t.family]);
    for (const e of monsterDebuffsCached(key, t.family, el)) carried.add(e.key);
  }
  return { faults: out, carried: [...carried] };
}

export const MONSTER_DEBUFFS = { FAMILY_DEBUFFS, ELEMENT_DEBUFFS, VARIANT_DEBUFFS };
