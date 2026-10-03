// Weapon essences, originally ported verbatim from ESSENCE_DEFS
// (sparkstone_prototype.html line ~1461-1465) -- the 5 melee weapon rows.
//
// ROUND 28 rewrote the numbers and added two weapons. The user's spec:
//
//   "Weapons should have variable ranges, in order from closest to farthest
//    away daggers, swords, warhammers, axes, scythes, whips. This should
//    ~reverse correlate to the weapon speed except for whips which should be
//    at roughly the same speed at the sword."
//
// Two consequences worth stating, because both invert something that was
// true before this round.
//
// 1. THE HAMMER IS NOW FASTER THAN THE AXE. It has to be: the user put
//    warhammers nearer than axes on the range ladder, and asked speed to
//    reverse-correlate with range. It is also right on its own terms -- a
//    warhammer IS a shorter weapon than a battleaxe. The hammer keeps its
//    identity through effects rather than raw numbers: it is still the only
//    weapon that stuns, and still strips the most Armor.
//
// 2. DAMAGE NOW SCALES WITH COOLDOWN, not with "heaviness". With range and
//    speed trading against each other, letting damage float freely would
//    make one weapon strictly dominant. Instead base damage is set so DPS
//    lands in a narrow band that declines gently as reach grows (reach is
//    worth paying for): ~21 dps at dagger range down to ~17 at scythe
//    range. What actually distinguishes weapons is SHAPE and EFFECTS.
//
// The whip is the deliberate exception the user carved out: the longest
// reach in the game at sword speed. It pays for that by being the only
// weapon that hits ONE target -- see `shape: 'lane'` below.
//
// --- attack shapes (round 28) --------------------------------------------
// The old hit test was distance + angular arc for every weapon. The user
// asked for genuinely different shapes, so `shape` now selects the test:
//
//   'cone'   dist <= range AND |angle to target| <= arc/2.
//            dagger (narrow forward stab), sword and axe (arc 180 = the
//            "half circle in front"), spear (narrow), scythe (arc 270 =
//            the "large sweep roughly 270 degrees around the player").
//   'square' a box directly in front: 0 <= forward <= range and
//            |lateral| <= width/2. The hammer's "square directly in front".
//   'lane'   a tile-wide lane straight ahead, and only the NEAREST monster
//            in it is hit. The whip's "targeted attack on the tile directly
//            in front of the player".
//
// On the whip's shape specifically: "the tile directly in front" and "the
// farthest range" pull against each other -- a literal adjacent tile would
// make the longest-reach weapon the shortest. Read together, the sense is a
// lash that snaps out along the facing and strikes one target, with a tile
// governing how WIDE the strike is rather than how far. That is what 'lane'
// implements: full reach, one tile of lateral tolerance, single target. If
// the intent was literally the adjacent tile, only WHIP.range changes.
//
// critChanceBonus/critDamageBonus (see src/data/combat.js for the base
// 1.5x/5% figures these stack on): a fast, precise weapon lands more crits
// than a slow heavy one; a heavy weapon hits harder when it does crit.
export const WEAPONS = {
  // =======================================================================
  // ROUND 104 -- UNARMED IS A WEAPON, and that is the whole design of it.
  //
  //   "We need to add unarmed into the game, much like the weapons the hand
  //    and feet stones and essences should provide significant boosts to
  //    striking with the paired weapon (in this case no weapon)"
  //
  // The alternative was a parallel unarmed system beside the weapon system,
  // and it would have had to reimplement the hit test, the swing animation,
  // the stamina cost, the crit bonuses, the affinity lookup, the aligned
  // templates and the weapon-service floor -- every one of which already
  // works and is already tested. A row in this table gets all of it for the
  // cost of a row, and the Hand and Foot essences and stones become weapon
  // identities exactly like Sword and Bow (WEAPON_BY_IDENTITY, awakening.js).
  //
  // WHAT KEEPS IT OUT OF THE SHOP. It is not in MELEE_ORDER or RANGED_ORDER,
  // so it is not in WEAPON_ORDER, and WEAPON_ORDER is what the shop, the
  // hotbar, the number keys and `_ownedWeaponIds` all read. Nothing has to
  // remember to exclude it; it was never in the list they walk. What DOES
  // need it is anything asking "what can be swung", which is a different
  // question -- see SWINGABLE_WEAPON_IDS below.
  //
  // THE NUMBERS. Shortest reach in the game by a clear margin (26 against the
  // dagger's 30) and the fastest swing (0.22), at 4 base -- 18.2 dps, just
  // under the dagger's 20 and the bottom of the melee band. That is on
  // purpose: a player with empty hands and no unarmed identity should be
  // WORSE off than one holding a sword, or the sword shelf stops meaning
  // anything. What makes unarmed a real build is the empty-hand passive the
  // Hand and Foot essences carry (UNARMED_EMPTY_HAND_BONUS in awakening.js),
  // which is worth more than the gap and is not available to anyone else.
  //
  // `hands: 0` -- it occupies no hand slot, which is the condition for using
  // it at all. WEAPON_HANDS reads `w.hands || 1` and so records 1 here; that
  // is harmless because nothing ever equips this into a slot, and `isTwoHanded`
  // (which tests `=== 2`) answers false, which is the answer that matters.
  //
  // The arc is 120 degrees: wider than a dagger's 45 stab because a fist and
  // a boot are thrown in front of the body rather than threaded forward, and
  // far short of a sword's 180. No status rider. A punch is a punch.
  unarmed: { id: 'unarmed', name: 'Unarmed', base: 4, cooldown: 0.22, range: 26, arc: 120,
    hands: 0, shape: 'cone', swingType: 'stab', swingDuration: 0.1, color: '#d7a98c',
    critChanceBonus: 0.06, critDamageBonus: 0.05 },

  // range 30 -- closest. cd 0.20 -- fastest. Bleed + the roster's biggest
  // crit-chance bonus ("daggers" was the user's own example of a weapon
  // that should carry crit chance).
  dagger: { id: 'dagger', name: 'Dagger', base: 4, cooldown: 0.2, range: 30, arc: 45,
    shape: 'cone', swingType: 'stab', swingDuration: 0.12, color: '#b0bec5',
    status: 'bleed', critChanceBonus: 0.15, critDamageBonus: 0,
    dot: { dmgPerTick: 2, ticks: 3, tickMs: 700, critChance: 0.15, label: 'Bleed' } },

  // range 44, cd 0.42 -- unchanged from every round before this one. The
  // sword is the balance point the rest of the ladder is measured against,
  // so it deliberately did not move.
  sword: { id: 'sword', name: 'Sword', base: 8, cooldown: 0.42, range: 44, arc: 180,
    shape: 'cone', swingType: 'arc', swingDuration: 0.18, color: '#d7dee3',
    critChanceBonus: 0, critDamageBonus: 0 },

  // range 54, cd 0.62. The square in front is narrow (1.5 tiles) -- a maul
  // crushes what is right there, it does not sweep.
  hammer: { id: 'hammer', name: 'Hammer', base: 12, cooldown: 0.62, range: 54, hands: 2,
    shape: 'square', squareWidth: 48, swingType: 'arc', swingDuration: 0.3, color: '#6d4c41',
    knockback: 24, stun: 0.5, critChanceBonus: 0.02, critDamageBonus: 0.35,
    sunder: { amount: 0.18, duration: 5 } },

  // range 64, cd 0.78 -- the heaviest single swing that still sweeps.
  axe: { id: 'axe', name: 'Axe', base: 15, cooldown: 0.78, range: 64, arc: 180,
    shape: 'cone', swingType: 'arc', swingDuration: 0.32, color: '#8d6e63',
    knockback: 18, critChanceBonus: 0, critDamageBonus: 0.15,
    sunder: { amount: 0.10, duration: 4 } },

  // range 82, cd 0.90. Kept at its long-standing reach and its narrow stab;
  // the user's list omitted the spear, and the answer was to keep it and
  // slot it between axe and scythe rather than retire a weapon players own.
  spear: { id: 'spear', name: 'Spear', base: 16, cooldown: 0.9, range: 82, arc: 30,
    shape: 'cone', swingType: 'stab', swingDuration: 0.26, color: '#c9b896',
    critChanceBonus: 0.05, critDamageBonus: 0 },

  // range 96, cd 1.05 -- slowest in the game, and the only weapon that
  // reaches BEHIND the player. 270 degrees is the whole point of it.
  scythe: { id: 'scythe', name: 'Scythe', base: 18, cooldown: 1.05, range: 96, arc: 270, hands: 2,
    shape: 'cone', swingType: 'arc', swingDuration: 0.42, color: '#90a4ae',
    knockback: 10, critChanceBonus: 0, critDamageBonus: 0.2,
    dot: { dmgPerTick: 3, ticks: 3, tickMs: 700, critChance: 0.1, label: 'Bleed' } },

  // range 120 -- farthest. cd 0.45 -- "roughly the same speed at the
  // sword", per the spec. Single target, which is what pays for the other
  // two numbers.
  whip: { id: 'whip', name: 'Whip', base: 7, cooldown: 0.45, range: 120,
    shape: 'lane', laneWidth: 32, swingType: 'stab', swingDuration: 0.2, color: '#795548',
    critChanceBonus: 0.08, critDamageBonus: 0.1 },

  // --- ROUND 74: THE RANGED FOUR ----------------------------------------
  //
  //   "Add bows, javelins, crossbows and staves"
  //
  // These are the first weapons in the game that do not resolve instantly.
  // Every weapon up to here is a geometric test run on the frame the button
  // is pressed -- `_weaponHitTargets` asks which monsters are standing in a
  // cone, a square or a lane RIGHT NOW and the answer is the hit list. A bow
  // cannot work that way: the arrow has to be in the air, it has to be
  // possible to miss because the target walked, and it has to stop at the
  // rock it flies into. So these carry `shape: 'shot'`, which routes the
  // swing through the projectile system the abilities already use rather
  // than through the hit test. `_weaponHitTargets` returns nothing for them,
  // which is correct and not a stub: a shot connects later or not at all.
  //
  // WHY THE DPS BAND IS LOWER THAN MELEE'S. The melee ladder lands 17-21 dps
  // and declines gently as reach grows, because reach is worth paying for.
  // These reach between 1.7x and 2.5x the longest melee weapon, and they do
  // it from outside a monster's own attack range, which is a bigger
  // advantage than any number on this page. They sit at 13-15 dps, and they
  // pay a second time in a way the melee ladder never does: a swing that is
  // aimed badly still sweeps SOMETHING, and a shot that is aimed badly hits
  // the ground.
  //
  // `shotSpeed` is world units per second and `shotRadius` is the collision
  // size of the missile -- deliberately separate numbers, because a fat
  // arrow is not a fast one (the same distinction the ability bolts make).
  // `range` is what it always was: how far the strike reaches. The scene
  // converts it to flight time, so a reach buff buys a longer shot for the
  // same reason it buys a longer sweep.

  // --- the ladder the user set for these four, verbatim -----------------
  //
  //   "1.1.1) Crossbows fire furthest, but fire slowest
  //    1.1.2) Bows occupy a middle range of speed and distance
  //    1.1.3) Staves fire the fastest but the range is only about twice that
  //           of the whip"
  //
  // Twice the whip's 120 is 240, and that is where the staff sits. The
  // javelin is nearer still, which the spec does not name but follows from
  // what it is: an arm, not a machine.
  //
  //   reach   javelin 200 < staff 240 < bow 260 < crossbow 300
  //   speed   staff 0.40 < bow 0.50 < javelin 0.70 < crossbow 1.20
  //
  // -- so within the ranged group speed and reach do NOT reverse-correlate
  // the way round 28's melee ladder does, and that is the user's own design:
  // a staff is both the fastest and the shortest, a crossbow both the slowest
  // and the longest. The two extremes are the ends of one axis (a machine
  // that must be spanned versus a wand that need only be pointed) rather than
  // a trade against reach.

  // The thrown spear, and a SUBTYPE OF SPEAR -- the user's 1.1.4: "Javelin
  // can use the spear assets and should be considered a subtype of spear."
  // `subtypeOf` is what says so to the rest of the game: it is what makes the
  // javelin draw from the spear bank, answer to a spear affinity, and count
  // as a spear wherever a spear is asked for.
  //
  // Nearest of the four, and the only one that keeps a melee weapon's full
  // effect load: it bleeds like a dagger and shoves like an axe, because a
  // javelin that lands is a spear that landed.
  javelin: { id: 'javelin', name: 'Javelin', subtypeOf: 'spear',
    base: 9, cooldown: 0.7, range: 200,
    shape: 'shot', shotSpeed: 300, shotRadius: 7, missile: 'spear',
    swingType: 'stab', swingDuration: 0.24, color: '#c9b896',
    knockback: 14, critChanceBonus: 0.04, critDamageBonus: 0.1,
    dot: { dmgPerTick: 2, ticks: 3, tickMs: 700, critChance: 0.1, label: 'Bleed' } },

  // The caster's answer to "my basic attack is a sword". FASTEST in the game
  // and shortest of the four, per 1.1.3. Its bolt is the only weapon damage
  // that ARMOUR DOES NOT REDUCE (`magical`), and the only one that takes the
  // player's spell element, so a fire-built character's staff throws fire
  // without a single line of per-element art. It pays for all of that by
  // hitting softest: 5 damage at 0.40s is 12.5 dps, the bottom of the band.
  staff: { id: 'staff', name: 'Staff', base: 5, cooldown: 0.4, range: 240, hands: 2,
    shape: 'shot', shotSpeed: 380, shotRadius: 8, magical: true, missile: 'bolt',
    swingType: 'stab', swingDuration: 0.18, color: '#8d6e63',
    critChanceBonus: 0.06, critDamageBonus: 0.15 },

  // The bow -- "a middle range of speed and distance", and it is the middle
  // of the group on both. The sharpest crit chance outside the dagger
  // ("daggers" was the user's own example of a weapon that should carry crit
  // chance, and a drawn bow is the ranged version of that argument). Carries
  // no rider at all: it is the clean one.
  bow: { id: 'bow', name: 'Bow', base: 7, cooldown: 0.5, range: 260, hands: 2,
    shape: 'shot', shotSpeed: 460, shotRadius: 6, missile: 'arrow',
    swingType: 'stab', swingDuration: 0.2, color: '#a1887f',
    critChanceBonus: 0.14, critDamageBonus: 0 },

  // The crossbow. Furthest and slowest, per 1.1.1, and the only weapon that
  // PIERCES -- one bolt passes through three bodies rather than stopping in
  // the first. That is what makes it a lane weapon rather than a slower bow,
  // and it is why it is priced at the top.
  crossbow: { id: 'crossbow', name: 'Crossbow', base: 18, cooldown: 1.2, range: 300, hands: 2,
    shape: 'shot', shotSpeed: 520, shotRadius: 7, pierce: 3, missile: 'arrow',
    swingType: 'stab', swingDuration: 0.34, color: '#795548',
    knockback: 10, critChanceBonus: 0, critDamageBonus: 0.45 },
};

/** ROUND 74 -- what a weapon COUNTS AS, for anything that asks by type.
 *  A javelin is a spear (the user's 1.1.4), so a spear affinity shortens a
 *  javelin throw and the spear bank draws it. Everything else is itself. */
export function weaponBaseType(wid) {
  const w = WEAPONS[wid];
  return (w && w.subtypeOf) || wid;
}

// ===========================================================================
// ROUND 75 (item 5) -- TWO-HANDED WEAPONS.
//
// The user, in the same breath as sending the poses:
//
//   "(note all 3 of these items are 2 handed and only 1 can be equipped at a
//    time.)"
//
// THE GAME HAD NO SUCH CONCEPT. Every weapon could go in either hand and both
// hands could hold one, which is how a character ended up able to fire two
// crossbows. `hands` is that concept, and it is on the weapon rather than in a
// list beside it for the reason `shape` is: a table of ids next to a table of
// weapons is two places to add the next weapon and one place to forget.
//
// The javelin is deliberately ONE-handed. It is a thrown spear
// (`subtypeOf: 'spear'`), a spear is one-handed here, and nothing about
// throwing one needs the other arm -- so a javelin-and-shield build is a real
// build, and the ranged shelf is not uniformly a commitment.
//
// The HAMMER and the SCYTHE are two-handed as well, by the user's answer when
// asked (see canBeWieldedOneHanded below). They are the melee half of the
// rule: a maul and a 270-degree scythe are swung with both arms, and being
// two-handed is what a Might-style ability would later be relaxing. The spear
// was offered and declined -- spear-and-shield is a build people already have.
export const WEAPON_HANDS = {};
for (const [id, w] of Object.entries(WEAPONS)) WEAPON_HANDS[id] = w.hands || 1;

/** Does this weapon need both hands? Reads the weapon, so a conjured relic
 *  built on a bow answers the same way the bow does. */
export function isTwoHanded(wid) {
  const w = WEAPONS[wid];
  return !!(w && w.hands === 2);
}

/**
 * ROUND 75 (item 5.1) -- WHAT A "WIELD IT ONE-HANDED" EFFECT MAY RELAX.
 *
 * The user:
 *
 *   "5.1) The rare might ability allowing the use of a 2 handed weapon in 1
 *    hand should be clarified to state that it allows the use of a 2 handed
 *    melee weapons. This would ensure to exclude the 3 new ranged weapons."
 *
 * WORTH SAYING PLAINLY: that ability does not exist in this build. Searched
 * for it across the generator, the runtime and every design document before
 * writing this -- there is no dual-wield relaxation, no `oneHand` lever, and
 * before this round no two-handed rule for one to relax. So there was nothing
 * to reword.
 *
 * What CAN be built now is the rule such an ability would have to read, so it
 * cannot be got wrong when it arrives. A one-handed exemption applies to a
 * weapon only if that weapon is two-handed AND NOT RANGED -- derived from
 * `shape`, so a ranged weapon can never qualify however the ability is
 * phrased. The user's "this would ensure to exclude the 3 new ranged weapons"
 * is enforced by construction rather than by remembering.
 *
 * WHAT IT APPLIES TO. Asked, because it was a balance change and not a
 * guess to be made here -- marking a melee weapon two-handed stops it being
 * dual-wielded and stops it pairing with a shield, which is a real nerf to
 * anyone already building on it. The user chose the SCYTHE and the HAMMER:
 *
 *     two-handed .................... hammer, scythe, staff, bow, crossbow
 *     a Might-style effect frees .... hammer, scythe
 *
 * The spear stays one-handed on purpose. It is a common early pick and
 * spear-and-shield is a build that exists; the javelin is a thrown spear and
 * inherits that. So the exemption now means something the day the ability is
 * written, and it can never reach the three ranged weapons, which was the
 * whole of the user's 5.1.
 */
export function canBeWieldedOneHanded(wid) {
  return isTwoHanded(wid) && !isRangedWeapon(wid);
}

// Ordered by REACH, closest to farthest -- the same order the user gave, so
// the shop, the hotbar and the number keys all read as a ladder.
//
// ROUND 74 -- the ranged four are APPENDED rather than interleaved, and the
// melee seven are untouched. Reach alone would have sorted them into one
// list, but the two groups answer different questions: within melee, reach
// trades against speed (round 28's ladder), and a bow does not beat a scythe
// by being further away, it beats it by not being in the room. Keeping them
// as two runs means the shop reads as two shelves, and it means round 28's
// ladder assertions still describe exactly the weapons they were written
// about.
export const MELEE_ORDER = ['dagger', 'sword', 'hammer', 'axe', 'spear', 'scythe', 'whip'];
export const RANGED_ORDER = ['javelin', 'staff', 'bow', 'crossbow'];
export const WEAPON_ORDER = [...MELEE_ORDER, ...RANGED_ORDER];

/** ROUND 104 -- the id of the weapon you are using when you are using none.
 *  A constant rather than the string, because the runtime tests for it in
 *  several places and a typo in one of them is a silent no-op. */
export const UNARMED_ID = 'unarmed';

/**
 * Every weapon that can be SWUNG, which is not the same list as every weapon
 * you can carry.
 *
 * WEAPON_ORDER answers "what is on the shelves" -- the shop, the hotbar, the
 * number keys, `_ownedWeaponIds`. Unarmed is on no shelf and in no hand, and
 * putting it in that list to make one downstream check pass would have put a
 * pair of fists in the weapon shop.
 *
 * But it makes a noise, it has a swing animation, and `audioFaults` asserts
 * that everything swingable has a sound -- an assertion worth keeping, and one
 * that was reading the shop list because until now the two lists were the same
 * list. They are not any more, so the question each caller is actually asking
 * gets its own answer. That is the round-103 lesson restated: a number (or a
 * list) that means two things stops meaning both.
 */
export const SWINGABLE_WEAPON_IDS = [...WEAPON_ORDER, UNARMED_ID];

// ===========================================================================
// ROUND 105 -- A SWORD SLASHES, A HAMMER IS BLUNT, A SPEAR PIERCES.
//
// The user's taxonomy names slashing, blunt and piercing as damage types, and
// the audit's verdict on them was blunt in a different sense: "Weapons differ
// by shape and rider, never by damage type. Nothing resists one and not
// another." This is the table that changes that, and it makes weapon choice a
// damage-type decision for the first time.
//
// Derived from what the weapon IS rather than declared per row, so a conjured
// relic built on a sword slashes like a sword without anyone remembering to
// say so. The staff is the exception and keeps its `magical` flag: a caster's
// basic attack is not a blunt instrument, whatever the stick is made of.
//
// Unarmed is BLUNT. A fist is not an edge.
// ===========================================================================
export const WEAPON_DAMAGE_TYPE = {
  dagger: 'piercing', sword: 'slashing', hammer: 'blunt', axe: 'slashing',
  spear: 'piercing', scythe: 'slashing', whip: 'slashing',
  javelin: 'piercing', bow: 'piercing', crossbow: 'piercing',
  staff: 'arcane',
  [UNARMED_ID]: 'blunt',
};
/** The damage type a weapon id deals, following subtypes and conjured relics
 *  back to the weapon they are built on. `physical` when nothing is known --
 *  the same untyped fallback the game has always used. */
export function weaponDamageType(wid, def = null) {
  const d = def || WEAPONS[wid];
  const base = (d && (d.baseId || d.subtypeOf || d.id)) || wid;
  return WEAPON_DAMAGE_TYPE[base] || WEAPON_DAMAGE_TYPE[wid] || 'physical';
}

/** True for the round-74 weapons that put a missile in the air. Read from
 *  the weapon's own shape rather than from a second list of ids, so a
 *  weapon cannot be ranged in one table and melee in another. */
export function isRangedWeapon(wid) {
  const w = WEAPONS[wid];
  return !!(w && w.shape === 'shot');
}

// Shop prices. The sword is still the free starting weapon; the two round-28
// additions are priced at the top of the melee ladder, the scythe highest
// because a 270-degree sweep is the strongest crowd tool in the game. The
// round-74 four are priced above ALL of them -- attacking from outside the
// monster's reach is the most valuable thing a weapon can offer -- and the
// crossbow highest of those, because it is the only one that pierces.
export const WEAPON_PRICE = {
  sword: 0, dagger: 15, axe: 25, spear: 35, hammer: 45, whip: 55, scythe: 70,
  javelin: 85, staff: 100, bow: 120, crossbow: 150,
};
