// ============================================================================
// ROUND 291 -- HOW FAR THE PLAYER HAS GONE.
//
//   5.8 "Depending on if the player is an outlaw only due to their essence
//        or if they have embraced the depraved underworld and dark gods the
//        companions should adapt becoming either more evil in tune with the
//        player or more neutral."
//   5.9 "If the player keeps civilian casualties to a minimum the outlaw
//        story should have an opportuinity at silver rank before the monster
//        surge starts to meet with an adventure society official and
//        petition for their reinstatement as well as the companions."
//
// His answers (round 291):
//   * "embraced" is a PLEDGE plus DEEDS: a depravity score from bandit jobs,
//     civilian kills and dark-church offerings, and an explicit pledge to a
//     dark god at a dark church. The pledge, or a high enough score, tips the
//     companions evil.
//   * a CIVILIAN is a non-combatant -- townsfolk, villagers, merchants, named
//     townspeople, priests. Guards, Society hunters and adventurers are not.
//
// Everything lives on `player.depravity`, made on first touch, so an old save
// reads as a player who has done nothing yet.
// ============================================================================

/** What each deed adds to the score. */
export const DEPRAVITY_WEIGHTS = {
  civilian: 6,      // a townsperson or merchant killed
  banditKill: 4,    // a crew's murder job, on top of the civilian it kills
  banditTheft: 2,   // a crew's robbery job
  offering: 3,      // a dark-church offering
};

/** At or past this score the companions read the player as one of their own. */
export const DEPRAVITY_EVIL = 20;

/** 5.9's "to a minimum": at most this many civilians dead keeps the petition
 *  open. Zero is a saint; the crews' first murder job is allowed for, not the
 *  second. */
export const CIVILIAN_PETITION_LIMIT = 1;

/** What a dark-church offering costs, in the purse's base value. */
export const OFFERING_FEE = 25;

/** The player's record, made on first touch. */
export function depravityState(p) {
  if (!p) return null;
  if (!p.depravity || typeof p.depravity !== 'object') {
    p.depravity = { score: 0, civilians: 0, jobs: 0, offerings: 0, pledged: null, pledgedDay: null, log: [] };
  }
  return p.depravity;
}

/** One deed. `kind` is a DEPRAVITY_WEIGHTS key; `n` repeats it. */
export function addDepravity(p, kind, n = 1, note = '') {
  const d = depravityState(p);
  if (!d || !DEPRAVITY_WEIGHTS[kind] || !(n > 0)) return d;
  d.score += DEPRAVITY_WEIGHTS[kind] * n;
  if (kind === 'civilian') d.civilians += n;
  if (kind === 'banditKill' || kind === 'banditTheft') d.jobs += n;
  if (kind === 'offering') d.offerings += n;
  d.log.push({ kind, n, note: String(note || '').slice(0, 80) });
  if (d.log.length > 60) d.log.splice(0, d.log.length - 60);
  return d;
}

/** A pledge to a dark god. Once made it stands: a second pledge moves it. */
export function pledgeDarkGod(p, godId, day = null) {
  const d = depravityState(p);
  if (!d || !godId) return d;
  d.pledged = godId;
  d.pledgedDay = day;
  return d;
}

/** Has the player "embraced the depraved underworld and dark gods"? */
export function hasEmbraced(p) {
  const d = p && p.depravity;
  if (!d) return false;
  return !!d.pledged || d.score >= DEPRAVITY_EVIL;
}

/** How the bandit companions speak to this player: 'evil' or 'neutral'. */
export function companionTone(p) {
  return hasEmbraced(p) ? 'evil' : 'neutral';
}

/** 5.9: have civilian casualties been kept to a minimum? */
export function cleanHands(p) {
  const d = p && p.depravity;
  return !d || d.civilians <= CIVILIAN_PETITION_LIMIT;
}

/** Nothing here disagrees with itself. */
export function depravityFaults() {
  const out = [];
  for (const [k, v] of Object.entries(DEPRAVITY_WEIGHTS)) if (!(v > 0)) out.push(`${k}: weight must be positive`);
  if (!(DEPRAVITY_EVIL > DEPRAVITY_WEIGHTS.civilian + DEPRAVITY_WEIGHTS.banditKill)) {
    out.push('one murder job alone must not tip the companions evil');
  }
  return out;
}
