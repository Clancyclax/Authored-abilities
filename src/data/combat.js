// Critical hits -- a new secondary stat, not part of any earlier round.
//
// The original prototype DOES have a real crit mechanic (isNeutralRankTrack,
// sparkstone_prototype.html line ~4806), but it's gated behind a per-ability
// "mastery rank" system this port has never implemented (see abilities.js's
// header -- this port only wires up a handful of templates, not the full
// essence-leveling system). In the original: essences with no status/
// knockback/stun/lifesteal/block ("Neutral" track) get an 8%-chance/1.5x-
// damage crit once their OWN mastery rank hits Silver; poison DoTs
// separately get a 20%-chance/2x-tick-damage crit at Gold mastery.
//
// CRIT_BASE_MULT below is a verbatim match to that 1.5x figure (matches the
// user's own stated "1.5x damage at base"). DOT_CRIT_MULT is a verbatim
// match to the poison-tick 2x figure. CRIT_BASE_CHANCE is NEW -- a flat
// baseline chance for every hit, since this port has no mastery-rank gate to
// hang the original's 8%/20% numbers on; instead every player gets a modest
// baseline immediately, and weapons/abilities/gear layer bonuses on top, per
// the user's brief ("abilities and items, weapons, and armor should have a
// chance to increase either critical hit chance or damage").
export const CRIT_BASE_CHANCE = 0.05;
export const CRIT_BASE_MULT = 1.5;
export const CRIT_COLOR = '#ffd54f'; // same gold the original's own floatText('Crit!', ...) uses
export const DOT_CRIT_MULT = 2; // verbatim -- the original's Gold-tier poison-DoT crit tick was a flat double, distinct from the base 1.5x crit

// One shared roll used by every player damage source (melee swing,
// projectile hit, DoT tick, heal) so "crit" always means the same thing
// everywhere. `force` lets a guaranteed-crit condition (e.g. shadow's
// execute threshold) skip the roll entirely.
export function rollCrit(rand, chance, dmg, mult, force = false) {
  const isCrit = force || rand() < chance;
  return { dmg: isCrit ? Math.round(dmg * mult) : Math.round(dmg), isCrit };
}
