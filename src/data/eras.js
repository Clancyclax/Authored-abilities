// ===========================================================================
// ROUND 165 (item 2) -- THE WORLD HAS AN AGE NOW.
//
// THE USER:
//   "Establish a cannonical timeframe.
//    Act 1   - It takes the player a month to move from Normal rank to Iron.
//    Act 1.5 - 8 months to move from Iron to Bronze
//    Act 2   - 2 years to get through Bronze Rank to Silver.
//    Act 3   - 8 years to go from Silver to Gold
//    Over this time the world should move forward with NPCs changing their
//    lines and moving around the world to new locations."
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT THE CLOCK, AND THE USER CHOSE THAT
// ---------------------------------------------------------------------------
// An in-world day is 600 real seconds (`GAME_DAY_SECONDS`). The timeframe
// above is ten years and nine months -- 3,920 in-world days, SIX HUNDRED AND
// FIFTY-THREE HOURS of uninterrupted play -- and there is no way to advance
// `_clockT` other than playing it. Asked how the years should pass, the user
// answered: narrative, tied to rank.
//
// ---------------------------------------------------------------------------
// ROUND 167 -- AND THE 600 IS NOW EXPORTED FROM HERE.
//
// It was a module-level const in WorldScene.js that nothing could import, so
// this file and surge.js could only quote it in prose -- and round 167's
// deadline is "one real hour", which is a fact about a day length that neither
// file could read. Two comments agreeing about a number is not the same as one
// number, and the day length is now owned by the file about time.
// ---------------------------------------------------------------------------
export const GAME_DAY_SECONDS = 600;

// So an era is A FACT ABOUT THE WORLD KEYED ON THE PLAYER'S RANK, not a
// reading off a timer. Reaching Iron does not mean a month has elapsed; it
// means the world now says a month has passed, and everyone in it talks and
// stands accordingly. `_clockT` is untouched and still does what it does --
// day and night, market day, quest weeks. The two are different clocks for
// different jobs and conflating them is what would break both.
//
// ---------------------------------------------------------------------------
// IT ONLY EVER GOES FORWARD
// ---------------------------------------------------------------------------
// `worldEra` is the HIGHEST era reached and is stored in its own right rather
// than derived from `player.rank` at the point of use. Two reasons, and the
// second is the one that matters:
//
//   * derived-at-use means every reader recomputes it, and `_divisionStage`
//     next door is a standing example of a progress value that is stored;
//   * a world that has moved on cannot move back. If it were derived, any
//     future path that lowered a rank -- a debuff, a curse, a respec, a bug --
//     would un-kill the dead and un-burn the villages. Round 126's rank-up
//     already guards against lowering for its own reasons; this does not rely
//     on that guard holding forever.
// ===========================================================================

/**
 * The five ages of the world, and what the world says has passed when you
 * reach each one.
 *
 * `days` is the canonical elapsed time SINCE THE PROLOGUE, in days, taken
 * straight from the user's four intervals: a month, then eight more, then two
 * years, then eight. It is what a line of dialogue means when it says "three
 * years ago" -- the number exists so the writing can be consistent with itself
 * rather than because anything counts it.
 *
 * A MONTH IS 30 DAYS AND A YEAR IS 365, stated because the first cut of this
 * table did not state it and quietly rounded: it read 1005 and 3925 where the
 * arithmetic gives 1000 and 3920, and a canonical timeframe that is five days
 * off its own definition is not canonical. The suite checks the intervals
 * against the user's words rather than against this table, which is how the
 * drift was caught.
 */
export const WORLD_ERAS = [
  {
    id: 'arrival', rank: 'normal', act: 'Act 1', days: 0,
    label: 'The First Days',
    elapsed: 'no time at all',
    since: 'You came up out of the Undercity a few days ago.',
  },
  {
    id: 'iron', rank: 'iron', act: 'Act 1.5', days: 30,
    label: 'The First Month',
    elapsed: 'a month',
    since: 'A month since the Undercity. Long enough for the guild to learn your name.',
  },
  {
    id: 'bronze', rank: 'bronze', act: 'Act 2', days: 270,
    label: 'The Ninth Month',
    elapsed: 'nine months',
    since: 'Nine months. The people who were new when you were new are not new any more.',
  },
  {
    id: 'silver', rank: 'silver', act: 'Act 3', days: 1000,
    label: 'The Third Year',
    elapsed: 'nearly three years',
    since: 'Nearly three years. Children you walked past are old enough to carry things.',
  },
  {
    id: 'gold', rank: 'gold', act: 'Act 3, later', days: 3920,
    label: 'The Eleventh Year',
    elapsed: 'nearly eleven years',
    since: 'Ten years and nine months. There are adults here who were not born when you arrived.',
  },
];

export const ERA_BY_ID = Object.fromEntries(WORLD_ERAS.map(e => [e.id, e]));
export const ERA_COUNT = WORLD_ERAS.length;

/**
 * The era a rank puts the world in.
 *
 * `diamond` is in `RANK_ORDER` and has no era, deliberately: this project does
 * not ship diamond-rank content, and inventing an age of the world for a rank
 * nothing reaches would be writing for nobody. It clamps to gold.
 */
export function eraIndexForRank(rank) {
  const i = WORLD_ERAS.findIndex(e => e.rank === rank);
  if (i >= 0) return i;
  // Anything above the table (diamond) is the last age; anything below is the
  // first. Never -1, because every caller would then have to check.
  return rank === 'diamond' ? WORLD_ERAS.length - 1 : 0;
}

export function eraAt(index) {
  return WORLD_ERAS[Math.max(0, Math.min(WORLD_ERAS.length - 1, index | 0))];
}

/** How long the world says it has been, between two eras. For dialogue. */
export function yearsBetween(fromIndex, toIndex) {
  const a = eraAt(fromIndex).days, b = eraAt(toIndex).days;
  return Math.max(0, b - a) / 365;
}

// ===========================================================================
// WHAT THE STREET IS SAYING, BY AGE
//
// THE USER'S ITEM 2.1, which is what makes an era something the player can
// HEAR rather than a number in a save file:
//
//   "In Act 1 the player will occasionally hear of the concept of a monster
//    surge. As they move into Act 2 citizens will be mentioning that a surge
//    is due and they are preparing... In Act 3 NPCs will talk about them all
//    moving into the fortified cities."
//
// ON THE SAME PATTERN AS `DIVISION_RUMOURS`, and for the same reason it works
// there: a bank per state, picked by a hash of the speaker's name, appended
// after their own line. The person keeps their voice -- the harbourmaster is
// still the harbourmaster -- and what they are WORRIED about moves with the
// world. Replacing their line outright would need forty-five new lines per
// era and would throw away the characterisation the roster already has.
//
// The arc is one story told five times: a thing old men mention, a thing the
// almanac says is due, a thing being prepared for, a thing being fled from.
// ===========================================================================
export const ERA_STREET_LINES = {
  // --- Act 1: a word you half-hear, from people who were not there ---------
  arrival: [
    "My grandfather lived through a surge. Wouldn't talk about it, except to say the sky was fine the whole time, which he seemed to think was the worst part.",
    "You get a surge every so often. Monsters everywhere at once, all over the world, same week. Before my time, thankfully.",
    "There's a stone by the north road with names on it. Surge, my mother said, and changed the subject.",
    "Adventurers were worth something in the last surge. Rest of the time we mostly complain about the noise.",
    "They say the monsters all come at once, every so often. I say the monsters come plenty often enough as it is.",
    "Ask the Society about surges and they get a careful look on them.",
  ],
  // --- Act 1.5: the almanac starts being quoted ----------------------------
  iron: [
    "Someone did the arithmetic in the tavern last night. Said we're inside the window. Nobody laughed, which was new.",
    "The Society's been buying up healing stock. Not saying why. They don't have to say why.",
    "My aunt's started keeping a month of flour in the loft. She's not daft, my aunt.",
    "Every decade or so. Or so.",
    "Wall crews are back on the payroll. Nine years of nothing and now they're hiring.",
    "There's a word going round and people keep not-saying it. Surge. There. It's said.",
  ],
  // --- Act 2: due, and being prepared for ---------------------------------
  bronze: [
    "It's due. Everyone says it's due. My grandmother says 'due' isn't a promise and to fill the water butts anyway.",
    "We've got a place in the city if it comes to it. My cousin's floor, but it's inside walls.",
    "Contracts are strange this season. More of them, and all of them about clearing the same ground twice.",
    "Board's paying over the odds for culls. I've not known it pay over the odds for anything.",
    "I've packed a bag. I unpack it, then I pack it again. That's most evenings now.",
    "Whatever's coming, I'd rather it came while there were still adventurers of your sort about.",
  ],
  // --- Act 3: moving in behind the walls -----------------------------------
  silver: [
    "The outlying farms are empty. They took the carts and the doors with them.",
    "We're going in behind the walls at the end of the month. All of us. The village will still be here after.",
    "Three hamlets have moved already. The Society's being very calm about it.",
    "They're billeting people in the temples. There's a man asleep under the altar of Purity and nobody has said a word about it.",
    "Forty years I've been here. I'll be in the city a while.",
    "You'll be wanted, when it starts. They'll want everyone who can hold a line.",
  ],
  // --- Act 3 later: eleven years on ---------------------------------------
  gold: [
    "You've been at this eleven years. There are people in this street who grew up on stories with you in them.",
    "My daughter was born the year you came up out of the Undercity. She asks about you. I tell her you're taller in the stories.",
    "Everyone who could get behind a wall is behind a wall. What's left outside is what wouldn't come.",
    "Eleven years. The last surge was eleven years before that, if you believe the stone by the north road.",
    "We've stopped asking when. It's who's going out now.",
    "Your lot. The ones that stayed, stayed.",
  ],
};

/**
 * One street line for one speaker, in one era, or null.
 *
 * `heardSet` is what this player has already been told, so the world does not
 * repeat itself at them across six people in one square. Not a global
 * exclusion -- it is per era, because the same sentiment SHOULD come round
 * again once the age has turned and it means something different.
 */
export function eraStreetLine(eraId, speakerName, heard = []) {
  const bank = ERA_STREET_LINES[eraId];
  if (!bank || !bank.length) return null;
  let h = 2166136261;
  const tag = `${eraId}|${speakerName || ''}`;
  for (let i = 0; i < tag.length; i++) { h ^= tag.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  // Walk from the speaker's own index so a person always says THEIR line, and
  // only slide off it when this player has already heard that one.
  const start = (h >>> 0) % bank.length;
  for (let k = 0; k < bank.length; k++) {
    const line = bank[(start + k) % bank.length];
    if (!heard.includes(line)) return line;
  }
  return null;                       // they have heard the whole age out
}

// ===========================================================================
// WHO MOVES, AND WHO IS NOT THERE ANY MORE
//
// "...and moving around the world to new locations."
//
// KEYED ON THE PERSON'S NAME, because that is the only stable handle an NPC
// has: the roster is rebuilt from `buildNpcList` and `SETTLEMENT_FOLK` on
// every load and carries no ids and no save state. A name is what the player
// knows them by and what the data already agrees on.
//
// Three things can happen to somebody, and the third is the one that needs
// building carefully:
//
//   moveTo   they are still themselves, standing somewhere else. An offset
//            from their settlement's centre, in world units.
//   line     they say something different now, in their own voice, instead of
//            the authored line. For the handful whose situation changed.
//   gone     they are not there. NOT a corpse and not a gravestone: the
//            person is absent and somebody else can say why. A dead NPC that
//            is still standing there with a grey tint is worse than an empty
//            doorway.
//
// SPARSE ON PURPOSE. Forty-five people times five ages is two hundred and
// twenty-five lines of writing that nobody asked for, and a world where
// EVERYONE has moved reads as a world with no fixed points. These are the
// people whose situation the story actually changes.
// ===========================================================================
export const NPC_ERA_FATE = {
  // Cadence's own, who have the most contact with the player.
  'Old Bracken': {
    bronze: { line: "I've seen a surge. I was younger than you and I was no use at all. This time I'd like to be some use." },
    silver: { line: "They want me behind the walls with the rest. I've told them I'll come in when the roof goes, and not before." },
    gold: { line: "Still here. Told them I would be." },
  },
  'Harbourmaster Quenn': {
    bronze: { line: "Every hull that can float is spoken for. Half of them are carrying people inland instead of cargo out." },
    silver: { moveTo: { ox: -40, oy: 90 },
      line: "I'm on the inner quay now. The outer one is for the boats we've stopped expecting back." },
    gold: { line: "Harrowmoor runs on tides and ledgers, same as ever. The ledgers are just mostly names now." },
  },
  'Sella Marsh': {
    silver: { moveTo: { ox: 60, oy: -140 },
      line: "Father moved us inside the third wall. I said it was cowardly. He said it was Tuesday, and kept packing." },
    gold: { line: "I was a girl asking about a research house on a hill. I run three wards of a fortified city now. I still want to know about the house." },
  },
  // The two who leave. `gone` from an era means gone from that era ONWARD.
  'Nim': {
    silver: { gone: true, because: "Nim went inside the walls with the rest of Little Gale. Somebody will tell you which gate." },
  },
  'Cutter Bly': {
    gold: { gone: true, because: "Bly went out to the water at an odd hour and did not come back with anything wet on him, because he did not come back." },
  },
};

/** What has happened to this person by this era, or null. Cumulative: the most
 *  recent era at or before `eraIndex` that says anything wins. */
export function npcFateAt(name, eraIndex) {
  const row = NPC_ERA_FATE[name];
  if (!row) return null;
  let out = null;
  for (let i = 0; i <= eraIndex && i < WORLD_ERAS.length; i++) {
    const at = row[WORLD_ERAS[i].id];
    if (at) out = { ...(out || {}), ...at, fromEra: WORLD_ERAS[i].id };
  }
  return out;
}

/** Faults in this file's own tables, for the data lane. */
export function eraFaults() {
  const out = [];
  const ranks = new Set();
  let lastDays = -1;
  for (const e of WORLD_ERAS) {
    if (ranks.has(e.rank)) out.push(`${e.id}: two eras claim rank ${e.rank}`);
    ranks.add(e.rank);
    if (e.days <= lastDays && e.days !== 0) out.push(`${e.id}: days go backwards (${e.days} after ${lastDays})`);
    lastDays = e.days;
    if (!ERA_STREET_LINES[e.id] || ERA_STREET_LINES[e.id].length < 4) {
      out.push(`${e.id}: fewer than four street lines, so the age repeats itself`);
    }
    for (const k of ['label', 'elapsed', 'since', 'act']) {
      if (!e[k]) out.push(`${e.id}: no ${k}`);
    }
  }
  // Every line in every bank distinct, or the hash picker hands two people the
  // same sentence and it reads as a bug.
  const all = Object.values(ERA_STREET_LINES).flat();
  if (new Set(all).size !== all.length) out.push('two street lines are identical');
  // A fate must name an era that exists, and say SOMETHING.
  for (const [name, row] of Object.entries(NPC_ERA_FATE)) {
    for (const [eraId, what] of Object.entries(row)) {
      if (!ERA_BY_ID[eraId]) out.push(`${name}: fate in era '${eraId}', which does not exist`);
      if (!what || (!what.line && !what.moveTo && !what.gone)) {
        out.push(`${name} (${eraId}): a fate that does nothing`);
      }
      if (what && what.gone && !what.because) {
        out.push(`${name} (${eraId}): gone with nothing to tell the player`);
      }
    }
  }
  return out;
}
