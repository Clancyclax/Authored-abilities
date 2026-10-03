// ===========================================================================
// ROUND 253 -- THE PEOPLE YOU CAN FIGHT, AND THE ONES YOU COULD NOT POINT AT.
//
//   7)  "Previous targeting bug appears to be Vane specific. Unable to lock
//        onto vane."
//   3)  "When getting hit by enemies, or striking enemies they should be auto
//        targeted if no target is selected."
//
// VANE IS NOT SPECIFIC. Sereth Vane lives on `sewer.cultist`, and
// `_targetCandidates` reads `this.monsters` -- so he was never a candidate.
// Neither is a realm cult camp's congregation (`_realmCamps[].people`) and
// neither is a bandit crew (`_banditFolk`). All three are hostile, all three
// are hit by the melee sweep through their own special case, and none of the
// three could be selected. Fixing the one the user happened to meet first
// would be this project's fifth fault class exactly: a guard that catches the
// phrasing reported and misses the one written next.
//
// WHAT A PERSON ALREADY HAD. Each of the three builds an `asMonster` object
// the moment it attacks, because `_monsterHitPlayer` reads eight fields off
// its attacker and somebody sensibly refused to write a second damage path for
// one fight. But it was built lazily and its `wx`, `wy` and `hp` were copied
// across by hand on every swing -- three lines, in three places, keeping a
// second copy of a person in step with the person. That is fault class three,
// a hand-maintained list beside the thing it mirrors, and it is why this round
// replaces the copy with a FACE whose fields are accessors onto the person.
// Nothing to sync, so nothing to drift.
//
// AUTO-TARGETING IS A POLICY, and it is here rather than in the scene because
// the interesting part is the RESTRAINT: acquiring on every blow would fight
// the player for the selection they made deliberately. The rule is one line
// and the suite can state it in plain objects.
// ===========================================================================

/**
 * The eight fields `_monsterHitPlayer` reads off whatever is hitting the
 * player. Named here because three call sites used to hand-build this list
 * from a comment, and a ninth field added to that function would have failed
 * silently in all three.
 */
export const PERSON_FACE_FIELDS = [
  'alive', 'wx', 'wy', 'hp', 'type', 'dot', 'dmgElement', 'ambushReady',
];

/** The three lists of people the world can turn hostile. */
export const PERSON_KINDS = {
  sewerCultist: { label: 'the man in the circle' },
  realmCultist: { label: 'a realm congregation' },
  bandit: { label: 'a road crew' },
};

// ---------------------------------------------------------------------------
// ITEM 3 -- WHEN THE GAME PICKS A TARGET FOR YOU.
//
// Both halves of the user's sentence are the same rule from two directions:
// something entered a fight with you and you were pointing at nothing. The
// word doing the work is "IF NO TARGET IS SELECTED" -- an auto-acquire that
// overrode a live selection would take the tab key away from the player, and
// the case that makes it obvious is the one round 201 was built for: you have
// deliberately tabbed onto the caster at the back, and the melee in front of
// you hits you once and steals it.
//
// So: only into an empty slot. A target that has just died frees the slot
// (`_currentTarget` validates on read), so the next blow acquires, which is
// the behaviour that makes this feel automatic rather than sticky.
// ---------------------------------------------------------------------------

/** Acquire when the player lands a blow on something they were not pointing at. */
export const AUTO_TARGET_ON_STRIKE = true;
/** ...and when something lands one on them. */
export const AUTO_TARGET_ON_HURT = true;

/**
 * Should `candidate` become the target?
 *
 * `current` is the live selection or null. Pure, and deliberately dull: the
 * value is in what it REFUSES.
 */
export function shouldAutoTarget(current, candidate) {
  if (!candidate) return false;
  if (candidate.alive === false) return false;
  if (candidate.hp != null && candidate.hp <= 0) return false;
  // The player's own choice outranks anything the game would pick, including
  // the thing currently biting them.
  if (current) return false;
  return true;
}

/**
 * Faults in a person's face.
 *
 * THE INTERESTING CHECK IS THE LAST ONE: a face whose `hp` is a plain number
 * is a copy, and a copy is the bug this round removed. It has to be a live
 * read of the person, which is testable by changing the person and looking at
 * the face.
 */
export function hostileFaults(person, face) {
  const out = [];
  if (!face) return ['no face'];
  for (const f of PERSON_FACE_FIELDS) {
    if (!(f in face)) out.push(`face is missing ${f}`);
  }
  if (!face.type || !face.type.name) out.push('face has no type name');
  if (!(face.type && face.type.radius > 0)) out.push('face has no radius to be hit at');
  if (face.person !== person) out.push('face does not point back at its person');
  if (person) {
    const hp0 = person.hp, x0 = person.x;
    person.hp = hp0 - 7; person.x = x0 + 13;
    if (face.hp !== person.hp) out.push('face.hp is a copy, not a reading');
    if (face.wx !== person.x) out.push('face.wx is a copy, not a reading');
    person.hp = hp0; person.x = x0;
  }
  if (!AUTO_TARGET_ON_STRIKE || !AUTO_TARGET_ON_HURT) {
    out.push('half of item 3 is switched off');
  }
  if (shouldAutoTarget({ alive: true, hp: 5 }, { alive: true, hp: 5 })) {
    out.push('auto-target overrides a live selection');
  }
  if (!shouldAutoTarget(null, { alive: true, hp: 5 })) {
    out.push('auto-target does not fire into an empty slot');
  }
  return out;
}
