// ===========================================================================
// ROUND 222 -- AN ESSENCE'S IDENTITY IS A RULE, NOT A VOCABULARY.
//
// The user, on three essences in one review:
//
//   5.2    "Vast essence should be exclusively AOE, or AOE buffing. Strike a
//           large area, improve AOE effects, increase aura range, turn single
//           target spells into AOEs."
//   7      "Myriad is multiples. Many enemies, spreading strikes, 4/8/16
//           projectiles, a projectile that duplicates every 5 paces."
//   14/15  "Simulacrum essence must generate DUPLICATES." With three worked
//           examples, all of them a copy of something.
//
// WHY THE MOTIF TABLE WAS NOT ENOUGH, which is the finding worth writing
// down. essenceMotifs.js has said the right thing about all three for
// seventy rounds. Vast's authored body clause reads "distance stops being a
// cost and every reach and radius grows with it"; Myriad's reads "every blow
// finds a second target and a third, and the outline blurs into several".
// Those are correct descriptions of essences that do not behave that way,
// because a motif supplies NOUNS, VERBS AND LEVERS -- vocabulary the
// generator writes with -- and none of the three is a constraint on what
// comes out. A Vast socket could roll a single-target bolt, name it from the
// horizon, describe it in the language of span, and fire one projectile at
// one enemy. Nothing in the pipeline could tell that this was wrong, because
// nothing in the pipeline held the sentence "a Vast ability reaches an area".
//
// So this file holds those sentences, as predicates and transforms rather
// than as words:
//
//   `holds(spec)`   is this ability already what the essence promises?
//   `keep(spec)`    make it so. Runs only when `holds` is false.
//
// A CHARTER IS A POST-PASS, not a category list, and that choice is round
// 218's scar tissue. Adding rows to ABILITY_CATEGORIES changes its `.length`,
// and half a dozen places walk that table as `(hash + i) % length` -- so a
// new category reshuffles the probe order for every socket in the game and
// moves censuses that have nothing to do with it. Round 218 measured exactly
// that and reverted a finished feature over it. This file adds no categories
// and no fields the runtime does not already read: `volleyCount`,
// `explodeRadius`, `isAoe`, `auraRadiusPct`, `chainCount` and `maxTargets`
// are all fields with existing readers, which is round 220's census rule
// applied before the fact rather than after it.
//
// AND THE PRICE IS PAID. Widening a single-target attack into an area attack
// without repricing it would hand every Vast kit a free doubling. The two
// figures used are `AOE_TARGET_FRAC` and `AOE_COOLDOWN_MULT`, imported from
// the same constants `priceAsAoe` has used since round 76 -- not copies of
// them, because two numbers that must agree are one number.
// ===========================================================================

import { AOE_TARGET_FRAC, AOE_COOLDOWN_MULT } from './aoePricing.js';
// ROUND 223 -- which vehicle a stone calls, and what a vehicle is worth. The
// data module imports nothing but vehicles.js and ranks.js, so this stays a
// one-way dependency.
import { vehicleFor, VEHICLE_BY_ID, makesOrganic } from './vehicleMounts.js';

/** Templates whose whole shape is already an area. */
export const AREA_TEMPLATES = ['aoeRing', 'aoeHealPulse', 'aoeWeaken', 'dotRing',
  'bloomField', 'aura', 'novaBurst', 'weakenRing'];

/** Templates that put a missile in the air, and can therefore put several. */
export const VOLLEY_TEMPLATES = ['projectileBall', 'volley'];

/** Does this spec deal damage at all? Borrowed shape from rankLadders'
 *  DEALS_DAMAGE; kept here rather than imported so this module stays a leaf. */
const strikes = (s) => (s.base || 0) > 0 || !!(s.dot && s.dot.dmgPerTick);

// ---------------------------------------------------------------------------
// THE CHARTERS.
// ---------------------------------------------------------------------------
export const ESSENCE_CHARTER = {
  // ===== VEHICLE AND SHIP ==================================================
  //
  // The user, on a vehicle-essence kit: "The first ability should always be a
  // vehicle. Other abilities should apply to the vehicle ... Most abilities
  // should trigger while in the vehicle."
  //
  // Round 200 gave these two essences a table of twelve BOONS -- cheaper
  // vehicles, fewer ambushes, better loot at rest. Every one of them is a
  // discount on somebody else's vehicle, so the essence about vehicles was
  // the one essence in the game whose abilities did not give you the thing it
  // was about. Item 4 is the same hole seen from the other side: "Summon
  // heavy truck should have been the vehicle summon" -- the generator had a
  // summon category and a vehicle vocabulary and no idea the two were one
  // sentence.
  //
  // THE CHARTER HAS TWO CLAUSES, and they are the user's 1 and 1.4.
  //
  //   A SUMMON FROM THESE ESSENCES IS A VEHICLE. Not a creature with a
  //   vehicle's name -- `vehicleId` is set, `mount` is set, and round 200's
  //   whole riding runtime picks it up through `mods.mount` unchanged. Which
  //   vehicle is decided by the STONE, through `vehicleForAnimal`: a Cattle
  //   stone draws a wagon, a Bat stone calls an airboat. That is 4.2, and it
  //   is the same essence-supplies-the-mechanic, stone-supplies-the-material
  //   split every other charter here follows.
  //
  //   EVERYTHING ELSE WORKS WHILE YOU RIDE. `worksMounted` is the field, and
  //   it is the whole of 1.4 -- the alternative reading, that every ability
  //   should be ABOUT the vehicle, is the mad-libs failure this file's own
  //   note warns about.
  //
  // `applies` leaves the boons alone. They are still good and the user never
  // asked for them back; what he asked for is that they stop being the only
  // thing the essence does.
  essVehicle: {
    says: 'it gives you a vehicle, and works while you are in it',
    applies: (s) => true,
    holds: (s) => !!s.vehicleId || !!s.worksMounted,
    keep: (s) => {
      if (s.template === 'summonBonded' || s.template === 'activeSummon') {
        s.mount = true;
        // A PROVISIONAL VEHICLE, refined at the door where the stone is known.
        // The first cut set only a `vehicleFromStone` flag and left `holds`
        // false until the door ran -- so the charter could not satisfy its own
        // predicate, which is precisely what round 222's `charterFaults`
        // exists to catch, and it caught it. A charter whose `keep` does not
        // satisfy its `holds` is a rule that depends on somebody else
        // remembering to finish it.
        s.vehicleId = s.vehicleId || vehicleFor(s.name, null);
        s.vehicleFromStone = true;
        return null;                 // the sentence is written once the vehicle is known
      }
      // ===== ROUND 224 -- THE ESSENCE THAT MAKES THE VEHICLE MUST BE ABLE
      // TO MEND IT ========================================================
      //
      // The user: "The vehicle essence should generate abilities to 'repair'
      // the vehicle but normally cant be healed."
      //
      // A HEAL BECOMES A REPAIR rather than a repair ability being added
      // beside it, which is the `linger` rule this file already follows --
      // deepen what the socket rolled instead of stapling something next to
      // it. A vehicle essence that rolled a heal was rolling the shape this
      // needs; what was wrong was only who it was pointed at.
      //
      // It still heals YOU. A repair that cost you your only mending would
      // make the essence worse at staying alive for the privilege of having
      // a wagon, which is not the trade he described.
      // A MENDING BY ANY OF ITS FOUR ROUTES. The first cut asked only about
      // `healAmount`/`hotPerSec` and measured 0 repairs in 40 kits -- because
      // a vehicle essence's abilities are overwhelmingly COMPOSED
      // (`cmp_summon_minion-recover-buff-shield-debuff_...`), and a composed
      // ability's mending rides `composedRiders` rather than a field on the
      // spec. Fronting `self_active_heal` in the bias was necessary and not
      // sufficient: the composer does not consult the category list at all.
      // ...AND A REPAIR IS NOT ONLY A HEAL. Widening to the composed riders
      // still measured 0 in 40, because a vehicle essence's composed
      // abilities carry `recover`, `shield`, `buff` and `innervate` and
      // almost never `heal` -- the composer picks from its own pool and does
      // not consult the category bias at all.
      //
      // Which is the right correction rather than a workaround: a REPAIR is
      // not a heal wearing a different word. It is what you do to a machine
      // with the same ability that tops up your stamina or throws a plate
      // over you, and every one of those is already an ability about putting
      // something back. So any RESTORATIVE from this essence mends the hull,
      // and an attack does not.
      const riders = s.composedRiders || [];
      const restorative = ['heal', 'hot', 'shield', 'recover', 'innervate', 'iot', 'rot'];
      const mends = (s.healAmount || 0) > 0 || (s.hotPerSec || 0) > 0
        || (s.healOnUse || 0) > 0 || (s.shieldAmount || 0) > 0 || (s.armorBonus || 0) > 0
        || riders.some(r => restorative.includes(r));
      if (mends) {
        s.repairs = Math.max(1, Math.round(
          (s.healAmount || s.hotPerSec || s.healOnUse || s.shieldAmount
            || (s.base || 6) * 0.45 || 5) * 0.8));
        s.worksMounted = true;
        return `It mends the hull of the vehicle you are in for ${s.repairs}.`;
      }
      s.worksMounted = true;
      return 'It works from the driver\'s seat as readily as on foot.';
    },
  },
};
ESSENCE_CHARTER.essShip = ESSENCE_CHARTER.essVehicle;

/** The rest of the charters. */
Object.assign(ESSENCE_CHARTER, {
  // ===== VAST =============================================================
  //
  // "Exclusively AOE, or AOE buffing." Four things the user listed, and all
  // four are here: strike a large area (an attack gains a radius), improve
  // AOE effects (one that already has a radius gets a bigger one), increase
  // aura range (`auraRadiusPct`, the field the Reach lever's signature
  // already uses), and turn single-target spells into AOEs (the same first
  // clause, which is what that sentence means to a generator).
  //
  // Nothing is REFUSED. An allow-list would have been the obvious build and
  // it is the wrong one: it would have left a Vast socket that rolled a heal
  // with nothing to produce, and rule 3 of the rank ladders applies here too
  // -- an essence that silently drops a seat is an essence that generates
  // fewer abilities than the kit shape promises. Every category still rolls;
  // what it rolls comes out reaching an area.
  essVast: {
    says: 'everything it does covers ground',
    // ===== WHAT `applies` IS FOR, and it is the correction the first cut of
    // this file needed. ===================================================
    //
    // That cut had only `holds` and `keep`, so every ability a Vast socket
    // produced had to be made into an area one -- including a self-buff, which
    // has no area to reach. Measured: the fallback branch appended "It reaches
    // everyone standing with you rather than one of you" to a BLINK with a
    // dodge bonus, which is the exact class of sentence the user has reported
    // five times ("bronze and silver effects make no sense for the ability").
    // A charter that produces that is a charter that traded one identity
    // failure for another.
    //
    // So a charter now says what it has an opinion ABOUT. Vast has one about
    // anything that reaches -- a blow, a field, a mending, a step -- and none
    // about a number that is simply true of you. That is not a loophole: "an
    // essence exclusively about area" and "an essence that turns a +7% crit
    // passive into an area effect" are different claims, and only the first
    // one is the user's.
    applies: (s) => strikes(s) || s.template === 'aura'
      || (s.healAmount || 0) > 0 || (s.hotPerSec || 0) > 0
      || (s.dashDist || 0) > 0 || (s.teleportRange || 0) > 0,
    // Genuinely area, and nothing looser. The first cut accepted
    // `maxTargets > 1`, which is true of a great many single-target abilities
    // for unrelated reasons, and 63% of a Vast kit passed the charter without
    // reaching anything at all.
    holds: (s) => AREA_TEMPLATES.includes(s.template) || !!s.isAoe
      || (s.explodeRadius || 0) > 0 || (s.auraRadiusPct || 0) > 0
      || (s.healScope === 'party' && (s.maxTargets || 0) >= 3)
      || !!s.vastReach,
    keep: (s) => {
      if (s.template === 'aura') {
        // An aura is already an area; Vast makes it a bigger one. The field is
        // the one the Reach lever's signature has used since round 122, and
        // `_auraRadius` is the single function every radius question in the
        // game goes through.
        s.auraRadiusPct = Math.max(s.auraRadiusPct || 0, 0.5);
        return 'Its field reaches half again as far as it otherwise would.';
      }
      if (strikes(s)) {
        // The price, at the two figures `priceAsAoe` has charged since round
        // 76. A blow that now lands on everything nearby lands for half, and
        // comes round half again as slowly.
        const before = s.base || 0;
        s.base = Math.max(2, Math.round(before * AOE_TARGET_FRAC));
        if (typeof s.cooldown === 'number') {
          s.cooldown = Math.round(s.cooldown * AOE_COOLDOWN_MULT * 10) / 10;
        }
        s.explodeRadius = Math.max(s.explodeRadius || 0, 90);
        s.isAoe = true;
        // ROUND 270 -- in TILES, like every other radius on a card (round 174's
        // rule: a player can see tiles and cannot see "90" of anything). The
        // half-tile rounding is awakening.js's `fmtTiles`, restated here rather
        // than imported because this file is imported BY awakening.js.
        { const t = Math.max(1, Math.round((s.explodeRadius / 32) * 2) / 2);
          return `Everything within ${t} tile${t === 1 ? '' : 's'} of where it lands is caught in it.`; }
      }
      if ((s.healAmount || 0) > 0 || (s.hotPerSec || 0) > 0) {
        s.healScope = 'party';
        s.maxTargets = Math.max(s.maxTargets || 1, 3);
        return 'It closes on everyone standing with you rather than on one of you.';
      }
      // A step. Vast's own authored body clause is "distance stops being a
      // cost", and the honest area for something that moves YOU is the ground
      // it covers -- not a radius of allies, which is what the first cut
      // stapled onto a blink.
      s.vastReach = true;
      if (s.dashDist > 0) s.dashDist = Math.round(s.dashDist * 1.5);
      if (s.teleportRange > 0) s.teleportRange = Math.round(s.teleportRange * 1.5);
      const d = Math.round(s.dashDist || s.teleportRange || 0);
      return `It carries you ${d}, half again as far as the step itself is worth.`;
    },
  },

  // ===== MYRIAD ===========================================================
  //
  // "Multiples. Many enemies, spreading strikes, 4/8/16 projectiles, a
  // projectile that duplicates every 5 paces."
  //
  // The four shapes below are the four ways an ability can come in numbers,
  // and which one an ability gets is decided by WHAT IT IS rather than by a
  // roll: a bolt becomes a volley, a strike becomes a chain, a call brings
  // two, and a field catches more. That is the same principle the `linger`
  // lever follows -- deepen what is there rather than staple something
  // beside it -- and it is why a Myriad heal does not fire four projectiles.
  //
  // FOUR, NOT 4/8/16, at the spec. The user's ladder is a RANK ladder and
  // `volleyCount` is in essenceRank's SCALED_FIELDS as of this round, so four
  // bolts at iron is eight by the time the figures have doubled and sixteen
  // at the top of gold -- his three numbers, produced by the growth curve
  // every other magnitude in the game already uses, rather than by a second
  // one written beside it.
  essMyriad: {
    says: 'everything it does comes in numbers',
    applies: (s) => strikes(s) || s.template === 'activeSummon'
      || s.template === 'summonBonded' || (s.maxTargets || 0) > 0,
    holds: (s) => (s.volleyCount || 0) > 1 || (s.chainCount || 0) > 1
      || (s.summonCount || 0) > 1 || (s.maxTargets || 0) >= 3,
    keep: (s) => {
      if (VOLLEY_TEMPLATES.includes(s.template) && strikes(s)) {
        s.volleyCount = Math.max(s.volleyCount || 1, 4);
        s.volleySpread = s.volleySpread || 0.42;
        // Each bolt is worth a share rather than the whole, on the same
        // argument the AOE price is made on: four copies of an undivided
        // bolt is four times the ability.
        s.base = Math.max(2, Math.round((s.base || 6) * 0.45));
        return `It comes apart into ${s.volleyCount}, spread wide, each carrying ${s.base}.`;
      }
      if (strikes(s)) {
        s.chainCount = Math.max(s.chainCount || 0, 3);
        s.chainRange = s.chainRange || 110;
        s.chainDamage = s.chainDamage || Math.max(1, Math.round((s.base || 6) * 0.5));
        return `It carries from what it hits to ${s.chainCount} more, for ${s.chainDamage} each.`;
      }
      if (s.template === 'activeSummon' || s.template === 'summonBonded') {
        s.summonCount = Math.max(s.summonCount || 1, 2);
        return 'What it calls arrives twice over.';
      }
      s.maxTargets = Math.max(s.maxTargets || 1, 3);
      return `It finds ${s.maxTargets} of them rather than one.`;
    },
  },
});

// ---------------------------------------------------------------------------
// THE CONFLUENCE CHARTER.
//
// A confluence is three essences answering to one name, and the user's
// Simulacrum note is about what that name has to produce rather than about
// any of its three parts:
//
//   14   "Simulacrum essence must generate DUPLICATES."
//   14.1 a stone granting a copy of you that deals retributive fire damage
//        when struck
//   14.3 a blood stone making a blood clone that leeches life and heals you
//
// Both examples are the SAME ability with a different stone in the socket,
// which is the architecture this project already has: the essence supplies
// the mechanic and the stone supplies the material. So the charter makes the
// duplicate, and the stone's own element decides what the duplicate does --
// exactly the split essenceMotifs.js was built on.
// ---------------------------------------------------------------------------
export const CONFLUENCE_CHARTER = {
  // Three names and one charter. Doppelganger and Effigy are the same claim
  // in different words -- a thing wearing your shape -- and giving the copy
  // to one of them and not the others would be the "found one screenshot at
  // a time" pattern this project keeps paying for.
  Doppelganger: null,   // filled below; see SHARED_COPY_CHARTER
  Effigy: null,
  Simulacrum: {
    says: 'what it calls is a copy of you',
    // ===== WHAT A COPY CAN BE MADE OUT OF ===============================
    //
    // The first cut of this charter applied to every ability the confluence
    // produced, and measured itself into the fault it was written to avoid:
    // "Turns up to 2 enemies within 4.5 tiles against each other for 4
    // seconds ... It stands up a copy of you." A confuse and a clone stapled
    // together, which is the "bronze and silver make no sense for the
    // ability" complaint in a new place.
    //
    // All three of the user's examples are a THING THAT APPEARS -- "a copy of
    // you that deals retributive fire damage when struck", "a blood clone
    // that leeches life and heals you", and enemies that "copy themselves".
    // A thing that appears and fights is a summon, and this game already has
    // one. So the charter turns the confluence's SUMMONS into copies and
    // leaves its other abilities alone rather than bolting a clone onto a
    // crowd-control spell.
    //
    // What it does NOT yet cover is the user's 14.2 -- the doom stone's
    // debuff that makes ENEMIES copy themselves every 20 damage, with the
    // copies exploding. That is a monster-spawning affliction rather than a
    // summon, it is a genuinely new runtime, and it is written down here
    // rather than half-built: see the round note.
    //
    // `applies` asks whether this ability PUTS A BODY IN THE WORLD, by any of
    // the three routes that do -- the two summon templates, a composed
    // `summon_minion` rider, or a spec carrying the summon fields directly.
    // The first cut tested the template alone and reached 11% of a Simulacrum
    // kit, because the confluence's composed abilities call their escorts
    // through the rider path: "While it lasts, an escort of self fights
    // beside you, striking for 5 every 1.4s" is a body in the world that the
    // template name does not mention.
    applies: (s) => s.template === 'activeSummon' || s.template === 'summonBonded'
      || (s.summonKind || '') === 'creature'
      || (s.summonDmg || 0) > 0 || (s.summonDuration || 0) > 0
      || (s.composedRiders || []).some(r => r === 'summon_minion'),
    holds: (s) => !!s.simulacrum,
    keep: (s) => {
      s.simulacrum = true;
      s.summonRole = s.summonRole || 'attack';
      // NO `summonLikeness` FIELD. The first cut set one, meaning "draw this
      // as the player", and nothing in WorldScene reads it -- which is round
      // 220's census fault committed in the same month it was measured. What
      // makes this a copy of you is what it DOES (the riders below, all four
      // of them read in _tickSummons and _monsterSwingAtSummon); what it
      // looks like is a separate round's work and is not claimed here.
      return null;   // the sentence is written by the stone, below
    },
  },
};

/** What a Simulacrum copy DOES, by the element of the stone that made it.
 *  The user gave two of these outright; the rest follow the same reading --
 *  a copy made of X does what X does to whoever comes close to it. */
export const SIMULACRUM_RIDERS = {
  fire: { cloneThorns: 0.35, line: 'Whatever strikes the copy is burned for a third of what it dealt.' },
  frost: { cloneThorns: 0.25, cloneSlow: 0.3, line: 'Whatever strikes the copy is cut for a quarter of what it dealt, and slowed.' },
  lightning: { cloneThorns: 0.35, line: 'Whatever strikes the copy is shocked for a third of what it dealt.' },
  necrotic: { cloneLeech: 0.3, line: 'What the copy deals comes back to you as health, a third of it.' },
  shadow: { cloneLeech: 0.3, line: 'What the copy takes from them comes back to you as health.' },
  radiant: { cloneHeals: 2, line: 'The copy mends you for 2 a second while it stands.' },
  nature: { cloneThorns: 0.25, line: 'Whatever strikes the copy is poisoned for a quarter of what it dealt.' },
  physical: { cloneThorns: 0.3, line: 'Whatever strikes the copy takes a third of the blow back.' },
};
/** The one the user wrote by name: "a blood stone making a blood clone that
 *  leeches life and heals you". Blood is not an element in this game's
 *  channel list -- it is a CLEANSE tag -- so the rider is keyed off the
 *  stone's own word as well as its element. */
export const SIMULACRUM_BY_WORD = {
  Blood: { cloneLeech: 0.4, line: 'What the copy takes, you are healed by: two fifths of it.' },
  // ===== ROUND 227 (item 14.2) -- THE THIRD EXAMPLE, AND THE ODD ONE =====
  //
  // "a doom stone granting a debuff that makes enemies copy themselves every
  // 20 damage, copies explode."
  //
  // The only one of his three Simulacrum examples where the copy is made of
  // the ENEMY rather than of you, which is why it is a `debuff` field here
  // and not a clone rider: everything else in this table describes a thing
  // standing beside you, and this describes something happening to them.
  //
  // Round 222 wrote this one down rather than half-building it -- "a
  // monster-spawning affliction rather than a summon, a genuinely new
  // runtime" -- and [Fracturing] in debuffs.js is that runtime.
  // THERE IS NO DOOM STONE. "Doom" is a CONFLUENCE name in this game, not an
  // awakening stone -- checked rather than assumed, and the first cut of this
  // table keyed the rider on it and could never have fired. What the user is
  // describing is the death-family stone he would have called a doom stone,
  // and the catalogue has sixteen of them; the four below are the ones whose
  // own word is about a thing coming apart.
  Death: { debuff: { key: 'fracturing' },
    line: 'And what you strike comes apart: every 20 damage it takes sheds a copy of itself, and the copies burst.' },
  Undeath: { debuff: { key: 'fracturing' },
    line: 'And what you strike comes apart: every 20 damage it takes sheds a copy of itself, and the copies burst.' },
  Ruin: { debuff: { key: 'fracturing' },
    line: 'And what you strike comes apart: every 20 damage it takes sheds a copy of itself, and the copies burst.' },
  Apocalypse: { debuff: { key: 'fracturing' },
    line: 'And what you strike comes apart: every 20 damage it takes sheds a copy of itself, and the copies burst.' },
};

// The other two duplication confluences answer to the same charter object,
// assigned after the literal so there is exactly one of it.
CONFLUENCE_CHARTER.Doppelganger = CONFLUENCE_CHARTER.Simulacrum;
CONFLUENCE_CHARTER.Effigy = CONFLUENCE_CHARTER.Simulacrum;

/**
 * ROUND 222 -- THE CATEGORIES A CHARTERED ESSENCE REACHES FOR FIRST.
 *
 * A charter reshapes what a socket produced; `prefers` changes what it is
 * offered in the first place, and the two are needed for different halves of
 * the same sentence. Reshaping alone got Vast and Myriad to 100% of the
 * abilities their charters have an opinion about -- but Simulacrum's opinion
 * is about summons, and 22% of a Simulacrum kit was a summon, so 78% of it
 * had no copies in it however well the charter worked.
 *
 * FRONTED, NOT SUBSTITUTED. This list goes to the head of the essence's own
 * bias and the rest of it follows unchanged, which is the same shape round
 * 103 used for a weapon essence's family bias. A charter that REPLACED the
 * bias would make every Simulacrum kit four summons and nothing else, which
 * is the "mad libs" failure in a new costume.
 *
 * And it adds no categories. Round 218 measured what adding three rows to
 * ABILITY_CATEGORIES does -- its `.length` is the modulus for every
 * `(hash + i) % length` probe in the file, so the axis census moved for
 * reasons that had nothing to do with alchemy. Every key below already
 * exists.
 */
export const CHARTER_PREFERS = {
  essVast: ['self_active_aoe', 'ranged_aoe', 'aoe_dot_ring', 'self_passive_aoe',
    'aoe_weaken', 'aoe_heal_pulse'],
  essMyriad: ['ranged_volley', 'ranged_aoe', 'summon_creature', 'ranged_damage'],
  // ROUND 224 -- a vehicle essence reaches for a MENDING, because the charter
  // turns one into the repair the user asked for and an essence with no heal
  // in it had nothing to turn. Measured: 0 of 40 kits generated a repair
  // before this line, because `motion` rolls shift/swift/call and never a
  // mend. The vehicle categories stay ahead of it -- the vehicle is still the
  // first thing the essence is for.
  essVehicle: ['summon_bonded', 'summon_creature', 'self_active_heal', 'self_active_hot'],
  essShip: ['summon_bonded', 'summon_creature', 'self_active_heal', 'self_active_hot'],
  Simulacrum: ['summon_bonded', 'summon_creature'],
  Doppelganger: ['summon_bonded', 'summon_creature'],
  Effigy: ['summon_bonded', 'summon_creature'],
};

/** The categories this essence or confluence reaches for first, or []. */
export function charterPrefers(key) {
  return CHARTER_PREFERS[key] || [];
}

/** The rider a Simulacrum copy carries, given the stone in its socket. */
export function simulacrumRider(stone, element) {
  const byWord = SIMULACRUM_BY_WORD[(stone && (stone.name || stone.word)) || ''];
  if (byWord) return byWord;
  return SIMULACRUM_RIDERS[element] || SIMULACRUM_RIDERS.physical;
}

// ---------------------------------------------------------------------------
// THE ONE DOOR.
// ---------------------------------------------------------------------------

/**
 * Hold an ability to the charter of the essence -- or the confluence -- that
 * made it. Returns the spec so it can be used inline.
 *
 * Called from the line in `rebuildKnownAbilities` where every ability in a
 * kit is recorded, whatever built it, for the reason round 217 wrote out
 * there: the composed path, the category path, the innate and the signature
 * are four doors, and a rule applied at any three of them is a rule the
 * fourth quietly breaks.
 *
 * APPENDS to the description rather than rewriting it. The sentence the
 * template wrote about itself is still true; this is the clause that says
 * what the essence did to it, which is the standing rule -- the name carries
 * the flavour, the description states the mechanic.
 */
export function applyEssenceCharter(spec, essenceId, confName = null, stone = null, element = null) {
  if (!spec) return spec;
  // THE ESSENCE IS NAMED BY ITS ID, passed in rather than read off the def.
  // Round 219 is the reason: `confluenceDefFor` read `d.id` on catalogue rows
  // that carry no `id` at all, keyed every trio as "undefined,undefined" and
  // made every confluence in the game Eclipse for a hundred rounds. A def
  // does not know its own key here; the caller does.
  const conf = confName && CONFLUENCE_CHARTER[confName];
  const essId = essenceId || null;
  const ess = essId && ESSENCE_CHARTER[essId];
  const charter = conf || ess;
  if (!charter) return spec;
  // `applies` is what the charter has an OPINION about; see the note on
  // essVast. A charter with no `applies` has one about everything.
  if (charter.applies && !charter.applies(spec)) return spec;
  if (charter.holds(spec)) return spec;
  let line = charter.keep(spec);
  // The confluence charter leaves the sentence to the stone; see the note on
  // SIMULACRUM_RIDERS.
  if (conf && !line) {
    const rider = simulacrumRider(stone, element);
    Object.assign(spec, { cloneThorns: rider.cloneThorns, cloneLeech: rider.cloneLeech,
      cloneHeals: rider.cloneHeals, cloneSlow: rider.cloneSlow });
    // ROUND 227 -- the doom rider carries a DEBUFF rather than a clone field:
    // its copies are made of the enemy. Set only where the socket has not
    // already rolled one, because an ability with its own affliction is an
    // ability whose affliction the player chose to build around.
    if (rider.debuff && !spec.debuff) spec.debuff = { ...rider.debuff };
    line = `It stands up a copy of you. ${rider.line}`;
  }
  // ===== ROUND 223 -- WHICH VEHICLE, decided by the stone =================
  //
  // The charter says "a summon from this essence is a vehicle" and cannot say
  // WHICH, because the essence does not know what is in the socket. This is
  // where the stone gets its say -- `vehicleForAnimal` first (a Cattle stone
  // draws a wagon, a Bat stone calls an airboat, item 4.2), and the essence's
  // own default when the stone is not an animal at all.
  //
  // The FALLBACK is deliberately the plainest vehicle in round 196's list
  // rather than a random one: a vehicle essence with a Fire stone in the
  // socket should produce a wagon made of fire, and the material is already
  // the ability's element. A roll here would make two identical kits offer
  // different vehicles for no reason a player could read.
  if (spec.vehicleFromStone) {
    delete spec.vehicleFromStone;
    // The stone's say, over the provisional one `keep` set.
    const id = vehicleFor(spec.name, stone, `${essId}|${spec.name || ''}`);
    const v = VEHICLE_BY_ID[id];
    spec.vehicleId = id;
    spec.mount = true;
    // ROUND 224 -- "some essence abilities or awakening stones (such as flesh
    // or blood) might grant abilities to make the vehicle semi organic
    // allowing healing". The stone decides, here, where it already decides
    // which vehicle -- and it is a TRADE: a semi-organic vehicle can be
    // healed and can also be bled, cursed and poisoned like anything alive.
    spec.vehicleOrganic = makesOrganic(stone);
    // The mount runtime keys art off `mountFamily`; a vehicle answers with
    // its own id so `mountStateFor` declines it and `vehicleStateFor` takes
    // it instead. One field, two readers, no ambiguity about which.
    spec.mountFamily = null;
    line = spec.vehicleOrganic
      ? `It is ${/^[aeiou]/i.test(v.name) ? 'an' : 'a'} ${v.name.toLowerCase()}, half-alive, and you can ride it. Being alive, it can be healed -- and bled.`
      : `It is ${/^[aeiou]/i.test(v.name) ? 'an' : 'a'} ${v.name.toLowerCase()}, and you can ride it. Nothing alive can be done to it: no bleed, no poison, no curse.`;
  }
  if (line) {
    // Appended only if the description does not ALREADY say it. The first cut
    // compared the opening 28 characters, which for the Simulacrum rider is
    // the fixed lead-in "It stands up a copy of you." -- so a template that
    // had already written the rider's own sentence got it a second time. The
    // comparison is on the part that VARIES.
    const had = String(spec.desc || '').replace(/\s*$/, '');
    const tail = line.slice(-40);
    if (!had.includes(line) && !had.includes(tail)) spec.desc = `${had} ${line}`.trim();
  }
  spec.charteredBy = conf ? confName : essId;
  return spec;
}

/** Faults in the charters themselves. A charter whose `keep` does not satisfy
 *  its own `holds` is a rule that cannot be kept, which is the one way this
 *  whole file could be quietly useless. */
export function charterFaults() {
  const out = [];
  const probes = [
    { name: 'a bolt', template: 'projectileBall', base: 20, cooldown: 6, kind: 'active' },
    { name: 'a strike', template: 'meleeStrike', base: 20, cooldown: 6, kind: 'active' },
    { name: 'an aura', template: 'aura', auraRadius: 120, kind: 'passive' },
    { name: 'a heal', template: 'selfHeal', healAmount: 20, healScope: 'self', cooldown: 8, kind: 'active' },
    { name: 'a call', template: 'activeSummon', summonDuration: 30, cooldown: 20, kind: 'active' },
  ];
  for (const [id, ch] of Object.entries(ESSENCE_CHARTER)) {
    for (const p of probes) {
      const s = { ...p };
      if (ch.applies && !ch.applies(s)) continue;
      if (ch.holds(s)) continue;
      ch.keep(s);
      if (!ch.holds(s)) out.push(`${id} cannot keep its own charter on ${p.name}`);
      // ...and the price is paid, every time an attack is widened.
      if (id === 'essVast' && (p.base || 0) > 0 && s.base >= p.base) {
        out.push(`${id} widened ${p.name} to an area and did not reprice it`);
      }
    }
    if (!ch.says) out.push(`${id} has no sentence`);
  }
  for (const [name, ch] of Object.entries(CONFLUENCE_CHARTER)) {
    const s = { name: 'a probe', template: 'activeSummon', base: 10 };
    ch.keep(s);
    if (!ch.holds(s)) out.push(`${name} cannot keep its own charter`);
  }
  // Every rider names a line and at least one field, or it is a sentence with
  // nothing behind it -- rule 1, borrowed from the rank ladders.
  for (const [k, r] of Object.entries({ ...SIMULACRUM_RIDERS, ...SIMULACRUM_BY_WORD })) {
    if (!r.line) out.push(`the ${k} copy says nothing`);
    if (!(r.cloneThorns || r.cloneLeech || r.cloneHeals || r.debuff)) {
      out.push(`the ${k} copy is a sentence with nothing behind it`);
    }
  }
  return out;
}
