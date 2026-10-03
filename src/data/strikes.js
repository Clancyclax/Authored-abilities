// ===========================================================================
// ROUND 255 -- A SPECIAL ATTACK IS A STRIKE WITH A WEAPON.
//
// The user, on a Sickle special that hit nothing standing in front of him:
//
//   "It's a special attack, and triggers the animation for an attack but only
//    throws the bolt. Which is a spell pretending to be a special attack."
//
//   1) "They are a strike with a weapon"
//   2) "Unless the attack changes the shape of the hit the strike zone is the
//       same as the equipped weapons strike zone."
//   2.1) "Special attacks might change a weapons strike zone for the attack...
//       This will be explicitly called out by the special attack and the
//       'strike zone' will be updated with the red field to align"
//   3) "Shooting a bolt, or fireball, is not a special attack it's a spell."
//   3.1) "If a special attack wants to roll a bolt or fireball it should occur
//       when the strike connects with an enemy"
//   4) "Weapon attacks need some particle effects of a swoosh across the range
//       of the attack"
//   4.1) "Whips, spears, and daggers are a swoosh directly outward, other
//       weapons are more across in an arc."
//
// THIS IS ROUND 121'S RULE, UNFINISHED. That round took the user's "special
// attacks should generally be strikes using the weapon hitbox" and built
// exactly the right machine for it: `imbueStrike` sets a rider and calls
// `_doPlayerAttack`, so the payload lands on whatever the REAL swing caught,
// by the real weapon's geometry, with its animation, its crit rules and its
// four special cases for the people who are not monsters. Then it applied
// that machine to one template out of forty. Everything else the composer
// calls a special attack still resolved however its template resolved -- and
// `projectileBall` is a template the composer will happily hand to a Sickle.
//
// So this round does not invent a mechanism. It routes the rest of them
// through the one round 121 already proved, and adds the two things that
// machine never had: a zone an ability may override, and a swoosh.
//
// WHY THE ZONES ARE A TABLE. Rule 2.1 says an override must be "explicitly
// called out" and must move the red field with it. Those are the same fact
// said twice -- the words on the card and the shape on the ground have to
// come from one place, or the game will eventually promise an X and sweep a
// cone. The table is that place.
// ===========================================================================

/**
 * The zones a special attack may ask for instead of its weapon's own.
 *
 * DELIBERATELY FEW, and the user said why: "which shouldn't be all the time
 * or even regularly". A special attack that reshapes the swing is a thing
 * worth noticing, and four of them stay noticeable where twenty would not.
 *
 * `shape` is the same vocabulary `_weaponHitTargets` and `_spawnSwingFx`
 * already speak, so an override is drawn and tested by the code that draws
 * and tests every ordinary swing. `rangeMult` and `arc` are relative to the
 * weapon in hand: a zone that fixed its own reach would make a scythe's
 * sweeping version and a dagger's identical, which is the opposite of what
 * "the weapon's strike zone" means.
 */
export const STRIKE_ZONES = {
  // A full turn on the spot. The word on the card is "around you".
  whirl: {
    id: 'whirl', shape: 'cone', arc: 360, rangeMult: 0.85,
    says: 'sweeps all the way around you',
  },
  // Front and back, nothing at the sides -- the scythe's own trick, lent.
  cleave: {
    id: 'cleave', shape: 'cross', arc: 100, rangeMult: 1.0,
    says: 'strikes in front of and behind you',
  },
  // An X: four diagonals out of the shoulders.
  saltire: {
    id: 'saltire', shape: 'saltire', arc: 40, rangeMult: 1.15,
    says: 'cuts an X through everything around you',
  },
  // Straight out, further than the weapon reaches, one line.
  lunge: {
    id: 'lunge', shape: 'lane', rangeMult: 1.6, laneWidth: 40,
    says: 'lunges, reaching well past the weapon',
  },
};

export const STRIKE_ZONE_IDS = Object.keys(STRIKE_ZONES);

/**
 * Is this a special attack -- a thing that swings rather than a thing that
 * casts?
 *
 * ONE DEFINITION, and it is the one the card already prints. `abilityCard.js`
 * calls an ability a "Special attack" when it `requiresWeapon`, so anything
 * else here would let the card and the runtime disagree about what the player
 * is holding -- which is precisely the bug being fixed: a card that says
 * "Special attack (magic)" over an ability that throws a bolt.
 */
export function isSpecialAttack(a) {
  return !!(a && a.requiresWeapon && a.requiresWeapon !== 'unarmed');
}

/**
 * The zone this attack actually hits in.
 *
 * Returns the weapon's own fields unless the ability names an override, so
 * rule 2 needs no code at all: not naming a zone IS the weapon's zone.
 */
export function zoneFor(ability, weapon) {
  const w = weapon || {};
  const base = {
    shape: w.shape || 'cone',
    range: w.range || 44,
    arc: w.arc || 90,
    squareWidth: w.squareWidth || 48,
    laneWidth: w.laneWidth || 32,
    zone: null,
    says: null,
  };
  const z = ability && ability.strikeZone && STRIKE_ZONES[ability.strikeZone];
  if (!z) return base;
  return {
    shape: z.shape,
    range: Math.round(base.range * (z.rangeMult || 1)),
    arc: z.arc !== undefined ? z.arc : base.arc,
    squareWidth: z.squareWidth || base.squareWidth,
    laneWidth: z.laneWidth || base.laneWidth,
    zone: z.id,
    says: z.says,
  };
}

// ---------------------------------------------------------------------------
// ITEM 4 -- THE SWOOSH.
//
// `swingType` already exists in weapons.js and already says exactly what rule
// 4.1 says: a dagger, a spear and a whip are 'stab', a sword, an axe, a hammer
// and a scythe are 'arc'. The user's sentence and this project's own weapon
// table agree without either knowing about the other, which is a good sign
// that the distinction is real -- so the trail is keyed on it rather than on a
// new list of weapon names that could drift from the old one.
// ---------------------------------------------------------------------------

export const SWOOSH = {
  // Across the arc: a curved ribbon swept from one edge of the zone to the
  // other, following the ground at the weapon's reach.
  arc: { kind: 'arc', steps: 14, width: 9, life: 0.22, reach: 0.92, fade: 0.85 },
  // Straight out: a short lance of motion along the aim and back again.
  stab: { kind: 'thrust', steps: 6, width: 7, life: 0.16, reach: 1.0, fade: 0.9 },
};

/** The trail this weapon leaves. Falls back to the arc, which is what an
 *  unknown weapon most likely is. */
export function swooshFor(weapon) {
  return SWOOSH[(weapon && weapon.swingType) || 'arc'] || SWOOSH.arc;
}

/**
 * Faults.
 *
 * The interesting one is the last: a zone that names a shape the swing code
 * does not speak would be drawn as a cone and tested as a cone while its card
 * promised an X -- rule 2.1's failure mode exactly.
 */
export function strikeFaults(knownShapes = ['cone', 'square', 'lane', 'cross', 'saltire']) {
  const out = [];
  for (const [k, z] of Object.entries(STRIKE_ZONES)) {
    if (z.id !== k) out.push(`${k}: id disagrees with its key`);
    if (!z.says) out.push(`${k}: does not say what it does`);
    if (!knownShapes.includes(z.shape)) out.push(`${k}: the swing cannot draw a ${z.shape}`);
    if (!(z.rangeMult > 0)) out.push(`${k}: has no reach`);
  }
  for (const [k, s] of Object.entries(SWOOSH)) {
    if (!(s.life > 0)) out.push(`swoosh ${k}: lasts no time`);
    if (!(s.steps > 1)) out.push(`swoosh ${k}: is a dot`);
  }
  if (SWOOSH.stab.kind === SWOOSH.arc.kind) {
    out.push('a thrust and a sweep draw the same trail');
  }
  // Rule 2: no override means the weapon's own zone, unchanged.
  const w = { shape: 'cone', range: 96, arc: 270 };
  const plain = zoneFor({}, w);
  if (plain.range !== 96 || plain.arc !== 270 || plain.shape !== 'cone') {
    out.push('an attack with no zone of its own does not use the weapon\'s');
  }
  if (plain.zone !== null) out.push('an ordinary attack claims an override');
  // ...and an override moves both the hit and the words.
  const over = zoneFor({ strikeZone: 'saltire' }, w);
  if (over.shape !== 'saltire' || !over.says) out.push('an override does not announce itself');
  if (!isSpecialAttack({ requiresWeapon: 'scythe' })) out.push('a weaponed attack is not special');
  if (isSpecialAttack({ requiresWeapon: 'unarmed' })) out.push('unarmed is being gated on a weapon');
  if (isSpecialAttack({})) out.push('a spell is being treated as a strike');
  return out;
}
