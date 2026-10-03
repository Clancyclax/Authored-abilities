// ============================================================================
// ROUND 102 -- THE NOBLE HOUSES OF BRATUGAL, AND THE VOTE THAT UNSEATS A KING.
//
// DESIGN_STORY.md, Act 4:
//
//   "Earning reputation with the noble houses, the player discovers the king
//    can be deposed by a council of noblemen and women. Winning their favour
//    gets the king replaced by a more amenable one, who outlaws the Division."
//
// THE USER, on how to build it: "A real house-favour track with a council vote
// -- the deposition is the only thing in the game the player can fail at
// without dying."
//
// ---------------------------------------------------------------------------
// WHY FOUR HOUSES AND NOT ONE BAR
// ---------------------------------------------------------------------------
// A single reputation number with a threshold is an errand count wearing a
// crown. What makes this a political problem rather than a shopping list is
// that THE FOUR HOUSES WANT DIFFERENT THINGS, and each one's ask runs through
// a different piece of machinery the game already has:
//
//   Vantell   the treasury   a SEARCH  -- what the crown actually paid
//   Oromir    the sword      a CULL    -- proof the wraiths are inside the wall
//   Ilmarch   the harbour    a SURVEY  -- where their own people went
//   Serrel    the temples    a RELIC   -- a thing taken from a temple, returned
//
// Four asks, four objective kinds, no fifth quest system -- the same discipline
// round 65 held the god quests to and round 66 held the Division chain to.
//
// ---------------------------------------------------------------------------
// WHY THE VOTE CAN BE LOST, AND WHAT LOSING COSTS
// ---------------------------------------------------------------------------
// The council can be CALLED at any time, including immediately. That is the
// whole point: a failure state you cannot walk into is not a failure state.
//
// The crown holds a seat and always votes for itself, so the player needs
// three of the four houses. Call it short and the motion fails, and what it
// costs is not a reload -- it is that A FAILED MOTION MAKES THE NEXT ONE
// HARDER. The threshold rises by one house, to all four. The council will not
// sit again until it does.
//
// It rises ONCE and then stops, which is the difference between a hard round
// and an unwinnable save. A second failure costs the cooling-off period and
// nothing more; there is no state this system can reach that a patient player
// cannot get out of. Round 97's normal-rank ladder made exactly the opposite
// mistake in the opposite direction -- a first draft that left a fresh player
// unable to accept a single row -- and the lesson is the same one: check what
// the WORST-PLACED player can do, not what the expected one can.
// ============================================================================

/** How much favour one house can hold, and what its bands mean. */
export const HOUSE_FAVOUR_MAX = 3;

/**
 * The four houses.
 *
 * `ask` is the objective this house's favour is earned through, in the
 * vocabulary the Division chain and the god quests already speak. `kinds` is
 * handed straight to `_makeOffer`, so a house's work is targeted, tracked and
 * turned in by the same code every other objective in the game uses.
 *
 * `seat` is where the head of the house stands in Vashra, as an offset in
 * tiles from the city centre. Authored rather than generated for the reason
 * round 99 read staff tiles off the template instead of retyping them: a
 * generated position is a new chance to stand somebody inside a wall, and
 * these four have to be findable by a player who was told where to look.
 *
 * `lines` is what the head says at each favour band -- 0 through
 * HOUSE_FAVOUR_MAX. The array is indexed by favour, so it must be
 * HOUSE_FAVOUR_MAX + 1 long; `houseFaults` checks that rather than trusting
 * it, because a missing last line is a house that goes silent exactly when the
 * player has finished earning it.
 */
export const NOBLE_HOUSES = [
  {
    id: 'vantell',
    name: 'House Vantell',
    head: 'Lady Sereth Vantell',
    seat: 'the treasury',
    at: { dx: -9, dy: -6 },
    // ROUND 103 -- `npc_posh_noble_girl` rather than `npc_noblewoman`. The
    // noblewoman sheet is the one round 50 took out of circulation: at this
    // scale its skirt reads as no legs at all, which is why test_round50 has
    // asserted "the legless noblewoman model is unused" ever since. Round 102
    // put it back on two of the four house heads without noticing, and the
    // suite has been reporting it since.
    model: 'npc_posh_noble_girl',
    // What she wants and why she wants it: the crown has been paying somebody,
    // and she is the one who signs for the crown's money.
    ask: 'The crown has been paying out of a fund with no name on it. Find me what it bought.',
    kind: 'search', room: 'treasury_vault',
    lines: [
      '"I do not know you, and I am told you have opinions about the Division." '
        + 'She does not put down the ledger. "So does everyone. Bring me a number."',
      '"A number." She reads it twice. "That is the harbour levy, and it has not been going to the harbour."',
      '"I have had the last four years pulled." Her voice has not changed. It has stopped being polite. '
        + '"Four years, and the fund predates the charter it supposedly pays for."',
      '"The crown has been buying people with my seal on the warrant." '
        + 'She closes the ledger, finally. "You will have my voice. I want it on the record that I asked for it."',
    ],
  },
  {
    id: 'oromir',
    name: 'House Oromir',
    head: 'Ser Kadran Oromir',
    seat: 'the muster yard',
    at: { dx: 8, dy: -7 },
    model: 'npc_noble_standing',
    ask: 'You say there are wraiths inside my wall. Bring me the ones you say are in it.',
    kind: 'field', kinds: ['cull'], families: ['shade'],
    lines: [
      '"The city watch is mine and the city watch says the streets are quiet." '
        + 'He is not being obstinate; he is being accurate. "Show me otherwise and I will hear you out."',
      '"One." He turns it over with his boot, which is the most respect he gives anything. '
        + '"One is a stray. Two is a nest. Which is this?"',
      '"Not strays." He has stopped sounding accurate and started sounding angry. '
        + '"They are working a rota. Something in my city is running a rota."',
      '"I have walked the wall myself for the first time in nine years." '
        + 'He says it as an admission. "My vote is yours. And when the council rises I want the name '
        + 'of whoever signed them through the gate."',
    ],
  },
  {
    id: 'ilmarch',
    name: 'House Ilmarch',
    head: 'Dame Ossa Ilmarch',
    seat: 'the harbour house',
    at: { dx: -7, dy: 9 },
    model: 'npc_posh_noble_girl_v1',   // ROUND 103, see House Vantell above
    ask: 'Eleven of my people walked off a shift and none of them walked home. Find where they went.',
    kind: 'field', kinds: ['survey', 'gather'],
    lines: [
      '"Everyone in this city has a story about the disappearances and nobody has a place." '
        + 'She is the only one of the four who looks tired. "I have eleven names. Bring me a place."',
      '"The west road." She writes it down. "They told me the west road was empty."',
      '"Nine of the eleven, in the same ground." She has stopped writing. '
        + '"I am going to have to tell their families where, and I am going to have to say why."',
      '"You found my people." Dame Ilmarch stands, which for her is a formality she has skipped all week. '
        + '"House Ilmarch votes with you, and House Ilmarch will say in open council what was done to them."',
    ],
  },
  {
    id: 'serrel',
    name: 'House Serrel',
    head: 'Hierarch Bel Serrel',
    seat: 'the temple stair',
    at: { dx: 10, dy: 8 },
    model: 'npc_posh_noble_girl',
    ask: 'Something was taken out of a temple in this city. Bring it back and I will listen to you.',
    kind: 'field', kinds: ['relic'],
    lines: [
      '"The houses do not usually ask the temples what they think." '
        + 'She is younger than the other three and speaks more carefully than any of them. '
        + '"Ask me for something and I will tell you what it costs."',
      '"You brought it back." She holds it without looking at it. "Do you know what it is for?"',
      '"The second one came out of a sealed room." '
        + 'She sets it down beside the first. "There is no version of that which is a theft."',
      '"They were not stealing relics. They were taking readings." '
        + 'Hierarch Serrel finally looks at what is in front of her. '
        + '"Somebody wanted to know what a god is made of. House Serrel votes to unseat him."',
    ],
  },
];

export const HOUSE_BY_ID = Object.fromEntries(NOBLE_HOUSES.map(h => [h.id, h]));

/** Favour at or above this and the house votes with you. */
export const HOUSE_VOTE_AT = HOUSE_FAVOUR_MAX;

/**
 * How many houses the motion needs. The crown holds a seat of its own and
 * votes for itself, so three of four carries; four of four is what a failed
 * motion costs.
 */
export const COUNCIL_THRESHOLD = 3;
export const COUNCIL_THRESHOLD_AFTER_LOSS = 4;

/** How long the council will not sit for after a failed motion, in game hours. */
export const COUNCIL_COOLDOWN_HOURS = 24;

/** The crown's own seat, which is why the threshold is not simply a majority. */
export const CROWN_SEAT = {
  name: 'The Crown',
  votes: 'against',
  line: 'The king votes for the king. It is one seat and it has never mattered before.',
};

/** What the council needs from the player right now, given what has happened. */
export function councilThreshold(record) {
  return (record && record.failed) ? COUNCIL_THRESHOLD_AFTER_LOSS : COUNCIL_THRESHOLD;
}

/** Does this house vote with the player at this favour? */
export function houseVotes(favour) {
  return (favour | 0) >= HOUSE_VOTE_AT;
}

/**
 * The tally. Pure, so a suite can walk every combination of four houses
 * without a running game -- which is what section 3 of the round-102 data
 * checks does (81 combinations, every one of them).
 */
export function councilResult(favours, record) {
  const need = councilThreshold(record);
  const forMotion = NOBLE_HOUSES.filter(h => houseVotes((favours || {})[h.id] || 0));
  const against = NOBLE_HOUSES.filter(h => !houseVotes((favours || {})[h.id] || 0));
  return {
    need,
    for: forMotion.map(h => h.id),
    against: against.map(h => h.id),
    // The crown is counted in the reading rather than in the arithmetic: it
    // never changes and a seat that never changes should not look like one
    // the player might win.
    crown: CROWN_SEAT.votes,
    carried: forMotion.length >= need,
  };
}

/** What the herald reads out, win or lose. */
export function councilReading(result) {
  const names = ids => ids.map(id => HOUSE_BY_ID[id].name).join(', ') || 'no house';
  if (result.carried) {
    return [
      `${names(result.for)} vote to unseat.`,
      result.against.length ? `${names(result.against)} abstain.` : 'No house abstains.',
      CROWN_SEAT.line,
      '',
      'The motion carries. It is the shortest thing that has ever happened in this chamber.',
    ].join('\n');
  }
  return [
    `${names(result.for)} vote to unseat. ${result.need} were needed.`,
    `${names(result.against)} will not.`,
    CROWN_SEAT.line,
    '',
    'The motion fails. The chamber empties without anybody saying anything to you, '
      + 'which is worse than if they had.',
  ].join('\n');
}

/** Everything wrong with this file, checkable without a running game. */
export function houseFaults() {
  const out = [];
  const seen = new Set();
  const seats = new Set();
  for (const h of NOBLE_HOUSES) {
    if (seen.has(h.id)) out.push(`duplicate house id ${h.id}`);
    seen.add(h.id);
    for (const f of ['name', 'head', 'seat', 'ask', 'kind']) {
      if (!h[f]) out.push(`${h.id} has no ${f}`);
    }
    // A missing last line is a house that goes silent exactly when the player
    // has finished earning it, which is the one moment it must not.
    if (!Array.isArray(h.lines) || h.lines.length !== HOUSE_FAVOUR_MAX + 1) {
      out.push(`${h.id} has ${h.lines ? h.lines.length : 0} lines, needs ${HOUSE_FAVOUR_MAX + 1}`);
    }
    for (let i = 0; i < (h.lines || []).length; i++) {
      if (!h.lines[i] || h.lines[i].length < 40) out.push(`${h.id} line ${i} is too short to be a line`);
    }
    if (h.kind === 'field' && !(h.kinds || []).length) out.push(`${h.id} is a field ask with no kinds`);
    if (h.kind === 'search' && !h.room) out.push(`${h.id} is a search ask with no room`);
    // Two heads in one place is two heads nobody can tell apart.
    const seat = `${h.at.dx},${h.at.dy}`;
    if (seats.has(seat)) out.push(`${h.id} sits where another house already sits (${seat})`);
    seats.add(seat);
  }
  // THE ONE THAT MATTERS: the motion must be winnable, and it must still be
  // winnable after it has been lost. A threshold above the number of houses is
  // a quest the player can permanently fail, which is not what "can be lost"
  // was asked for.
  if (COUNCIL_THRESHOLD > NOBLE_HOUSES.length) out.push('the motion cannot be carried by every house voting for it');
  if (COUNCIL_THRESHOLD_AFTER_LOSS > NOBLE_HOUSES.length) {
    out.push('a failed motion raises the threshold past what every house together can meet');
  }
  if (COUNCIL_THRESHOLD_AFTER_LOSS < COUNCIL_THRESHOLD) out.push('failing the motion makes it easier');
  return out;
}
