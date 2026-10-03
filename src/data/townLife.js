// ============================================================================
// ROUND 98 -- A TOWN WITH PEOPLE IN IT.
//
// THE USER:
//   "Lets make the cities feel a little more alive. NPCs walking through town,
//    talking to each other. Entering homes. Doesn't need emergent behavior just
//    a few loops."
//
// "Just a few loops" is the whole specification and it is a good one, so this
// file is a small state machine and a table of durations rather than anything
// that schedules, plans or wants. Four states, and a person in a town is always
// in exactly one of them:
//
//   STAND  -- stopped somewhere, looking around. Where a conversation starts.
//   WALK   -- crossing to a waypoint inside their own leash.
//   TALK   -- paired with somebody, facing them, taking turns.
//   INSIDE -- gone through a door; off the map until they come back out.
//
// -------------------------------------------------------------------------
// THE LEASH, AND WHY IT IS THREE DIFFERENT LENGTHS
// -------------------------------------------------------------------------
// The user's ruling on who walks: "Everyone, but named folk stay near their
// post." That is one rule with three consequences, because this game has three
// kinds of person standing in a town and they are found in different ways:
//
//   * NAMED FOLK carry authored lines and, at a board, a weekly request. A
//     quest marker points at them. They get the shortest leash in the game --
//     a few paces -- so the marker never points at somewhere they have left.
//   * VILLAGERS stand near a board and are found BY the board. They may drift
//     around it.
//   * THE CROWD is nobody in particular and exists to be seen from across a
//     square. They get the run of the settlement.
//
// A leash rather than a route because a route is a schedule, and the user asked
// for loops. The leash is also what makes this cullable: a walker never leaves
// the circle it started in, so a settlement the player is nowhere near can stop
// being simulated and be exactly where it should be when they arrive.
// ============================================================================

/** How fast a person crosses a square. Two thirds of the player's MOVE_SPEED:
 *  a townsperson who moves at walking pace beside a running adventurer is the
 *  difference between a town and a parade. */
export const FOLK_SPEED = 96;

/** How close a walker has to get to call a waypoint reached. Below the sprite's
 *  own width, or they orbit it. */
export const ARRIVE = 10;

/**
 * ROUND 153 -- GOING HOME IS A STATE, because for fifty rounds it was not one
 * and that is why the leash meant nothing.
 *
 * Round 148 caught `test_round98`'s leash check failing about half the time
 * once the renderer got fast enough to reach the state, and left it as the
 * candidate for a round of its own. Measured here over a 120-second soak on
 * the crowd nearest the player:
 *
 *     14 of 16 people were outside their leash at some point
 *     6 of 16 were still outside it when the soak ended
 *     the longest unbroken stretch outside was 41.5 seconds
 *     every door was 503-885 units from its owner's home, median 729
 *
 * Against a crowd leash of 300. So the leash was not describing behaviour at
 * all -- the exception had swallowed the rule.
 *
 * The cause is an ASYMMETRY, not the door trip. `_folkWalkToDoor` grants the
 * outbound leg `far / FOLK_SPEED * 1.9` seconds because its author knew a long
 * journey needs time to finish. The way back got no such allowance: a walker
 * who stepped out of a door 700 units from home dropped straight into the
 * ordinary stand/walk/talk loop, whose legs are capped at DWELL.walk (6s, or
 * 576 units) and are abandoned outright by any wall. So they did not walk home
 * -- they milled about outside the town. The measured states while off leash
 * say it plainly: mostly `stand`, a good deal of `talk`, and only a little
 * `walk`.
 *
 * RETURN is that journey, with the same allowance the outbound trip always
 * had. A returning walker does not stop to chat and does not give up on the
 * first wall; arriving inside the leash is what ends it.
 */
export const FOLK_STATE = { STAND: 'stand', WALK: 'walk', TALK: 'talk', INSIDE: 'inside', RETURN: 'return' };

/**
 * The leash, in world units, by what kind of person this is.
 *
 * `named` is deliberately tiny. A quest marker hangs over a named person's head
 * and the round-78 marker follows the sprite, so a longer leash would not break
 * the marker -- it would break the PLAYER, who was told where somebody is and
 * then has to chase them. Three paces reads as shifting your weight.
 */
export const LEASH = { named: 58, villager: 104, crowd: 300 };

/** How long each state lasts, [min, max] seconds. STAND is short because a
 *  town where everybody pauses for eight seconds reads as a town of people
 *  waiting for something. */
export const DWELL = {
  stand: [1.4, 4.5],
  walk: [2.0, 6.0],
  // Long enough for both halves of an exchange plus a beat -- the fault check
  // below caught this at [5.0, 9.0], where a five-second conversation could not
  // fit two 3.2-second lines and the answer was never given.
  talk: [7.4, 11.0],
  inside: [14.0, 40.0],
};

/** How near two people have to be to fall into conversation, and how long
 *  either of them then wants to be left alone about it. Without the cooldown a
 *  pair finishes talking, is still standing together, and immediately starts
 *  again -- two people locked in a loop for ever, which reads as broken rather
 *  than as sociable. */
export const TALK_RADIUS = 78;
export const TALK_COOLDOWN = [22, 55];
/** How often a standing walker even considers it. Not every frame: the point of
 *  a conversation is that it is occasional. */
export const TALK_CHANCE = 0.35;

/**
 * HOW FAR SOMEBODY WILL WALK TO GET INDOORS, and it is much further than they
 * will walk for a stroll.
 *
 * Found by screenshot: once the crowd was clustered on the plaza -- which is
 * where a crowd belongs -- nobody went indoors at all, because a plaza is a
 * board and market stalls and the houses with real doors are further out than a
 * strolling leash. The whole night half of the rhythm quietly stopped, and the
 * only thing that said so was a picture of a full square at one in the morning.
 *
 * So a door trip is an EXCEPTION TO THE LEASH rather than a walk within it.
 * Going home is a longer journey than wandering about, which is also true of
 * people. They drift back on their own afterwards: every ordinary waypoint is
 * measured from home, so somebody standing outside their leash walks toward it
 * without anything having to send them.
 */
export const DOOR_SEARCH = 900;

/** How close a walker gets to a doorstep before it counts as going in, and how
 *  far outside the door they reappear. */
export const DOOR_REACH = 26;
export const DOOR_STEP_OUT = 34;
/** How likely a walk ends at a door rather than at open ground, by daylight.
 *  Night raises it -- see `indoorUrge`. */
export const DOOR_CHANCE = 0.18;

/**
 * ROUND 153 -- THE WAY BACK.
 *
 * `RETURN_TIME_MULT` is the same 1.9 the outbound door trip has always used,
 * named once and read by both, so the journey out and the journey back cannot
 * drift apart again. It is generous on purpose: a walker who runs out of time
 * halfway home drops back into the loop that caused this.
 *
 * `RETURN_AIM` keeps the destination WELL inside the leash rather than on its
 * rim. Aiming at the rim means arriving exactly at the bound, where a single
 * step of the next stroll puts them back outside it -- the leash would be
 * satisfied for one frame at a time.
 *
 * `RETURN_MAX_BLOCKS` is the give-up count. A returning walker re-aims when a
 * wall stops it instead of abandoning the journey, but re-aiming for ever in
 * one spot is a different bug, so after this many it stands and tries again
 * from the top. Worst case is the behaviour this round replaced, never worse.
 */
export const RETURN_TIME_MULT = 1.9;
export const RETURN_AIM = 0.55;
export const RETURN_MAX_BLOCKS = 4;

/**
 * How long anybody may be outside their leash before it is a fault rather than
 * a journey -- the walk home at FOLK_SPEED from the furthest door there can be,
 * times the same allowance, plus one dwell to be picked up by the loop.
 *
 * Derived rather than picked, so that moving DOOR_SEARCH or FOLK_SPEED moves
 * the bound with it instead of leaving a stale number behind that the suite
 * then has to be "corrected" against.
 */
export const RETURN_DEADLINE = (DOOR_SEARCH / FOLK_SPEED) * RETURN_TIME_MULT + DWELL.walk[1];

// ---------------------------------------------------------------------------
// THE DAY
// ---------------------------------------------------------------------------
// The user asked for "a day/night rhythm" on top of the loops. The world clock
// already runs 24 hours per 600 real seconds and already starts at 08:00, so
// this is a curve over that hour and nothing new has to be stored.
//
// Written as HOW MANY OF THEM ARE OUT rather than as a schedule of who does
// what. A schedule would need every settlement to say who lives where, and the
// user asked for loops; a fraction needs one number per person -- how much of a
// morning person they are -- and that number can be derived from their name.

/** The fraction of a settlement's folk who should be outdoors at this hour.
 *  Dawn and dusk are ramps rather than steps: a town that empties between one
 *  frame and the next reads as a bug, and a town that empties over a couple of
 *  in-game hours reads as evening. */
export function outdoorFraction(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 9 && h < 18) return 1.0;         // the working day: everybody out
  if (h >= 7 && h < 9) return 0.45 + (h - 7) * 0.275;   // morning ramp
  if (h >= 18 && h < 21) return 1.0 - (h - 18) * 0.25;  // evening ramp
  if (h >= 21 && h < 23) return 0.25 - (h - 21) * 0.05; // last of the evening
  if (h >= 5 && h < 7) return 0.10 + (h - 5) * 0.175;   // first of the morning
  return 0.10;                               // the small hours
}

/** How strongly the hour is pushing this person indoors, 0..1. Read by the
 *  walk loop to bias a destination toward a door and to decide how long
 *  somebody stays in once they are. */
export function indoorUrge(hour) {
  return 1 - outdoorFraction(hour);
}

/** Is this person out at this hour? `sociability` is their own fixed number in
 *  0..1 -- a stable property of the person, seeded off their name -- compared
 *  against the hour's fraction. The comparison is a threshold rather than a
 *  roll, so the SAME people are the late ones every night: a town whose night
 *  owls are re-rolled every evening has no regulars in it. */
export function isOutAt(sociability, hour) {
  return sociability <= outdoorFraction(hour);
}

/** Longer nights indoors than afternoons indoors. Somebody who steps inside at
 *  midnight is going to bed; somebody who steps inside at noon is fetching
 *  something. */
export function insideSeconds(hour, rand) {
  const [lo, hi] = DWELL.inside;
  const urge = indoorUrge(hour);
  const base = lo + (hi - lo) * (typeof rand === 'function' ? rand() : 0.5);
  return base * (1 + urge * 2.2);
}

// ---------------------------------------------------------------------------
// HOW MANY PEOPLE
// ---------------------------------------------------------------------------

/** The crowd a settlement carries, over and above its named folk and its
 *  villagers. A capital should feel like a capital; a hamlet is three families
 *  and a jetty and should not have a milling square. */
export const CROWD = { city: 16, town: 8, hamlet: 4 };

export function crowdSizeFor(kind) {
  return CROWD[kind] !== undefined ? CROWD[kind] : CROWD.hamlet;
}

/** How far from the player a settlement stops being simulated. Generous enough
 *  that nobody pops into motion in view, small enough that twelve settlements
 *  are never all ticking on a two-core machine. */
export const SIM_RADIUS = 1400;

// ---------------------------------------------------------------------------
// WHAT THEY SAY
// ---------------------------------------------------------------------------
// Small talk, in pairs: an opener and something that answers it. Kept as PAIRS
// rather than as one bag of lines because two strangers trading non-sequiturs
// is worse than silence -- the whole point of the state is that they are
// talking TO each other.
//
// Nothing here carries information. A player who reads every line learns
// nothing they need, which is deliberate: a line that mattered would make
// eavesdropping on the square compulsory, and these are meant to be overheard
// once and then be scenery.

export const CHATTER = [
  ['Rain again by evening, I\'d say.', 'You said that yesterday.'],
  ['Price of grain is up.', 'Price of grain is always up.'],
  ['They cleared the road, then.', 'Cleared it. Whether it stays cleared is another question.'],
  ['My sister\'s girl awakened. Iron rank, if you please.', 'Then she\'ll not be back, will she.'],
  ['You hear the Society posted something big?', 'I hear that every week. It\'s never big.'],
  ['Boy\'s been out past the wall again.', 'At that age I was worse.'],
  ['Saw an adventurer come through this morning.', 'Aye. Walked past like we were furniture.'],
  ['Well got to be getting on.', 'You always have to be getting on.'],
  ['That new roof holding?', 'Ask me in the spring.'],
  ['Nobody\'s seen old Marren in a week.', 'Nobody saw him much when he was about, either.'],
  ['Cold coming off the water today.', 'It\'s coming off something.'],
  ['They want another levy for the walls.', 'The walls were fine when I was a girl.'],
];

/** How long each half of an exchange sits on screen. */
export const CHAT_LINE_SECONDS = 3.2;

export function chatterFor(seed) {
  return CHATTER[Math.abs(seed | 0) % CHATTER.length];
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------

export function townLifeFaults() {
  const out = [];
  for (const [k, v] of Object.entries(DWELL)) {
    if (!(Array.isArray(v) && v.length === 2)) { out.push(`${k} has no dwell band`); continue; }
    if (!(v[1] > v[0] && v[0] > 0)) out.push(`${k} dwells for ${v[0]}..${v[1]}s, which is not a band`);
  }
  if (!(LEASH.named < LEASH.villager && LEASH.villager < LEASH.crowd)) {
    out.push('the three leashes are not in order');
  }
  // The user's ruling, as a number: a named person must stay findable. A leash
  // longer than the interact radius means the prompt that was on screen when
  // the player pressed E can be gone by the time they arrive.
  if (LEASH.named > 60) out.push(`a named person may wander ${LEASH.named} from their post`);
  if (FOLK_SPEED <= 0) out.push('nobody moves');
  if (ARRIVE >= LEASH.named) out.push('a named person arrives before they set out');
  if (TALK_RADIUS <= ARRIVE) out.push('two people must be on the same tile to speak');
  if (!(TALK_COOLDOWN[1] > TALK_COOLDOWN[0] && TALK_COOLDOWN[0] > DWELL.talk[1])) {
    out.push('a pair can start talking again before they have finished');
  }
  if (!(TALK_CHANCE > 0 && TALK_CHANCE < 1)) out.push('conversation is certain or impossible');
  if (DOOR_STEP_OUT <= DOOR_REACH) out.push('somebody stepping out of a door is still in it');
  if (DOOR_SEARCH <= LEASH.crowd) out.push('nobody will walk further to get home than they will to stroll');
  if (!(DOOR_CHANCE > 0 && DOOR_CHANCE < 0.5)) out.push('doors are ignored or are all anyone does');

  // ROUND 153 -- the way back has to be able to finish.
  //
  // The outbound door trip is granted `far / FOLK_SPEED * RETURN_TIME_MULT`
  // seconds, and until this round the return leg was granted DWELL.walk -- at
  // most 576 units, against doors measured at 503-885 from home. The journey
  // could not complete, so people milled about outside the town instead. These
  // are the two arithmetic facts that had to hold for that to be impossible,
  // written where a later change to DOOR_SEARCH or FOLK_SPEED will trip over
  // them.
  if (RETURN_TIME_MULT <= 1) out.push('a walker is given less time to get home than the distance takes');
  if ((DOOR_SEARCH / FOLK_SPEED) * RETURN_TIME_MULT <= DWELL.walk[1]) {
    out.push('an ordinary walk leg already covers the longest way home, so RETURN buys nothing');
  }
  if (!(RETURN_AIM > 0 && RETURN_AIM < 1)) out.push('a returning walker aims outside their own leash');
  if (RETURN_AIM * LEASH.named <= ARRIVE) {
    out.push('a returning named person is already inside their aim and never sets out');
  }
  if (RETURN_MAX_BLOCKS < 1) out.push('a returning walker gives up at the first wall');
  if (RETURN_DEADLINE <= (DOOR_SEARCH / FOLK_SPEED)) {
    out.push('the deadline is shorter than the walk it is meant to allow');
  }

  // The day. Both ends have to be reachable or the rhythm is a constant, and
  // the curve has to be continuous or a town empties between two frames.
  const hours = [];
  for (let h = 0; h < 24; h += 0.25) hours.push(outdoorFraction(h));
  if (Math.max(...hours) < 0.95) out.push('the town is never full');
  if (Math.min(...hours) > 0.2) out.push('the town never empties');
  if (Math.min(...hours) <= 0) out.push('the town empties completely, and a dead street is not a quiet one');
  for (let i = 1; i < hours.length; i++) {
    if (Math.abs(hours[i] - hours[i - 1]) > 0.12) {
      out.push(`the street empties by ${Math.round(Math.abs(hours[i] - hours[i - 1]) * 100)}% inside a quarter hour`);
      break;
    }
  }
  if (Math.abs(outdoorFraction(0) - outdoorFraction(24)) > 0.001) out.push('midnight does not meet itself');
  // Noon must be busier than midnight, which is the entire claim.
  if (!(outdoorFraction(13) > outdoorFraction(2))) out.push('midnight is busier than midday');
  if (!(indoorUrge(2) > indoorUrge(13))) out.push('nobody wants to be indoors at night');
  // ...and the same people are out late, every night.
  for (const s of [0.05, 0.3, 0.6, 0.95]) {
    if (isOutAt(s, 13) !== isOutAt(s, 13)) out.push('who is out is not stable within one hour');
  }
  if (!isOutAt(0.05, 2)) out.push('not even the night owls are out at 2am');
  if (isOutAt(0.95, 2)) out.push('everybody is out at 2am');
  if (!isOutAt(0.95, 13)) out.push('somebody is missing from a full square at midday');

  // The chatter has to be exchanges, not a bag of lines.
  if (CHATTER.length < 8) out.push(`only ${CHATTER.length} things are ever said`);
  const seen = new Set();
  for (const pair of CHATTER) {
    if (!Array.isArray(pair) || pair.length !== 2) { out.push('a chatter entry is not an exchange'); continue; }
    for (const line of pair) {
      if (!line || line.length < 8) out.push(`"${line}" is too short to be a line`);
      if (seen.has(line)) out.push(`"${line}" is said twice`);
      seen.add(line);
    }
  }
  if (CHAT_LINE_SECONDS * 2 > DWELL.talk[0]) out.push('a conversation ends before the answer is given');

  if (!(crowdSizeFor('city') > crowdSizeFor('hamlet'))) out.push('a hamlet is as busy as a capital');
  if (crowdSizeFor('nonsense') !== CROWD.hamlet) out.push('an unknown settlement gets no crowd');
  if (SIM_RADIUS < 900) out.push('people start moving in view');
  return out;
}

export function townLifeCensus() {
  return {
    states: Object.keys(FOLK_STATE).length,
    // ROUND 153 -- the NAMES, not only how many. A count answers "did somebody
    // add a state" and nothing else; the set answers "which states does a
    // person in a town have", which is the claim worth making and the one that
    // still fails if a fifth arrives without anybody deciding to add it.
    stateNames: Object.values(FOLK_STATE).slice().sort(),
    exchanges: CHATTER.length,
    crowd: CROWD,
    fullAt: [9, 18],
    quietestFraction: outdoorFraction(3),
  };
}
