// ===========================================================================
// ROUND 169 (item 3.1.1) -- THE PEOPLE WHO WERE STILL THERE.
//
// THE USER:
//   "3.1.1) The player can choose which regions to help defend, and the one
//    they don't make it too is fully destroyed."
//   "it should be swarming with monsters and maybe 2-4 survivors hiding in a
//    still standing house or temple."
//
// ---------------------------------------------------------------------------
// WHAT THIS CLOSES, AND WHAT IT IS NOT
// ---------------------------------------------------------------------------
// `LOST_REGION.survivorsMin` and `survivorsMax` were written in round 166 so
// that the shape would be agreed before anything read them. NOTHING HAS READ
// THEM FOR THREE ROUNDS. The swarm half of that sentence has been live since
// 166 -- density 2.4, packs 1.8, Gold uncapped -- and the half with people in
// it has not existed at all, so a fallen region has been a place with worse
// monsters and no evidence that anybody ever lived there.
//
// THEY ARE NOT A RESCUE QUEST. The user described a state of the world, not an
// errand: people who are still there, hiding, who can tell you what happened.
// Building an escort out of it would be answering a question he did not ask,
// and the honest version of "2-4 survivors hiding" is 2-4 survivors, hiding.
//
// ---------------------------------------------------------------------------
// WHY THE POOL IS BIGGER THAN THE DRAW
// ---------------------------------------------------------------------------
// Two to four are found, out of six authored per region. A player who loses
// Bratugal on one run and Elehyd on another should not meet the same four
// people saying the same four things in a different set of ruins -- and a
// player who loses the same region twice should not either. The draw is
// seeded on the region, so a given run's survivors are stable across a save
// and a reload, and different runs differ.
//
// EVERY ACCOUNT IS PARTIAL AND SOME OF THEM DISAGREE. Nobody in a cellar saw
// the whole of it. Three of Bratugal's six think the walls held longer than
// they did. That is deliberate: a set of six witnesses who all report the same
// tidy sequence is a briefing, not survivors.
// ===========================================================================

import { SURGE_REGIONS, LOST_REGION } from './surge.js';

/**
 * How many to place. The user's own numbers, read from LOST_REGION rather
 * than restated here -- two numbers meaning one rule is the fault class this
 * project has named, and this file would be the second copy.
 */
export function survivorCount(rand) {
  const lo = LOST_REGION.survivorsMin, hi = LOST_REGION.survivorsMax;
  return lo + Math.floor((rand || Math.random)() * (hi - lo + 1));
}

/**
 * Where they are hiding.
 *
 * "a still standing house or temple" -- and ONLY CADENCE HAS A TEMPLE. The
 * eight temples are placed down one avenue of the capital and no other
 * settlement in the game has one, so `temple` is reachable exactly when The
 * Nek is the region that fell. Every other region hides its people in a
 * house, which is the same sentence with the other half used.
 */
export const REFUGE_KIND = { TEMPLE: 'temple', HOUSE: 'house' };

/**
 * One roster per region. `role` is what they were doing when it started;
 * `line` is what they say; `saw` is the one detail they are certain of.
 *
 * The lines are written to be read in ANY order and in any combination of two
 * to four, because that is how they will be met. So none of them refers to
 * "the others", none of them answers a question another one asked, and none of
 * them is the second half of anything.
 */
export const SURVIVORS = {
  // -------------------------------------------------------------------------
  // THE NEK -- Cadence. The one region with a temple to hide in, and the one
  // the player knows best, so the people are ones whose jobs they have seen.
  // -------------------------------------------------------------------------
  nek: [
    { id: 'nek_a', name: 'Berrin Tolliver', role: 'a ledger clerk',
      line: '"I got to four hundred and then I couldn\'t see the gate any more. '
        + 'I don\'t know why I was counting. Nobody asked me to."',
      saw: 'He came down the north road in the afternoon, in daylight, and says so twice.' },
    { id: 'nek_b', name: 'Old Hessa', role: 'a well-keeper',
      line: '"Down the well. Fifty years I\'ve drawn off it and I went down it like a girl. '
        + 'My knees are in a state."',
      saw: 'Nothing has been down any of the wells. She is fairly sure about that.' },
    { id: 'nek_c', name: 'Dov Ashgate', role: 'a gate runner',
      line: '"They shut it on time. Properly, the way they drill it. I want that put somewhere."',
      saw: 'The east gate held a day and a half. The wall beside it did not.' },
    { id: 'nek_d', name: 'Sister Anwen', role: 'a lay sister of Purity',
      line: '"I kept the lamps going. It was a lot of oil."',
      saw: 'Whatever came in through the temple doors went out again. She has no idea why.' },
    { id: 'nek_e', name: 'Tam Furrow', role: 'a carter',
      line: '"I was going back for a fourth load. I\'d got the cart turned and everything."',
      saw: 'The last cart out of Cadence left before dawn on the second day.' },
    { id: 'nek_f', name: 'Ives Marrowby', role: 'an off-duty watchman',
      line: '"Ask me something else."',
      saw: 'He was not on shift. He says this before he says anything else.' },
  ],

  // -------------------------------------------------------------------------
  // ONTARIA -- Harrowmoor. A working harbour: half of these people think in
  // tides and boats, and two of them got out onto the water and came back.
  // -------------------------------------------------------------------------
  ontaria: [
    { id: 'ont_a', name: 'Elin Crake', role: 'a harbour watch',
      line: '"They went out full. Some came back. You can do that arithmetic without me."',
      saw: 'The boats that came back came back for more people, and kept doing it.' },
    { id: 'ont_b', name: 'Padrig Vole', role: 'a net-mender',
      line: '"I\'m sixty-one. I can mend a net in the dark. It has not come up."',
      saw: 'The moor road went the first evening. The sea road lasted three days.' },
    { id: 'ont_c', name: 'Merisa Dunn', role: 'a moor guide',
      line: '"I know eleven ways across that moor. I wouldn\'t take you on one of them."',
      saw: 'They came over the moor, which nothing crosses, in a line a mile wide.' },
    { id: 'ont_d', name: 'Cully Ashe', role: 'a tavern girl',
      line: '"I\'ve been putting the names on the wall. I\'m nearly at the door."',
      saw: 'Forty-one names, in chalk, in a hand that starts neat.' },
    { id: 'ont_e', name: 'Bellamy Crewe', role: 'a factor',
      line: '"Three months of stores. Nine days." He stops there and does not pick it up again.',
      saw: 'The stores did not run out. Nobody got to them.' },
    { id: 'ont_f', name: 'Tom of Little Gale', role: 'a boy from Little Gale',
      line: '"I walked." He will talk about anything else you like.',
      saw: 'Little Gale went first, and fast, and he is the only one here from it.' },
  ],

  // -------------------------------------------------------------------------
  // SIRUKH SANDS -- Tolbrand Quay. ROUND 179.
  //
  // An island, which changes what a survivor IS here. Everywhere else on the
  // spine, the people who got out went somewhere. On Sirukh there is nowhere
  // to have gone: the boats are the only road and the boats stopped. So these
  // six are not people who escaped, they are people who were already in the
  // one place there was, and several of them know it.
  //
  // The heat does the work the walls do elsewhere. Three of them survived by
  // being underground or under salt rather than behind anything.
  // -------------------------------------------------------------------------
  sirukh: [
    { id: 'sir_a', name: 'Reefpilot Oja', role: 'a reef pilot',
      line: '"I could have taken a boat out. I want that understood — I could have, '
        + 'and I know the channel, and I didn\'t."',
      saw: 'Four boats went for the reef without a pilot on the second night. None of '
        + 'them cleared it.' },
    { id: 'sir_b', name: 'Panwalker Hess', role: 'a salt raker',
      line: '"You lie flat on the pan and the salt crusts over your back and you are '
        + 'a white patch on a white field. Two days. I have never been so thirsty."',
      saw: 'Nothing crossed the open pan in daylight. He is certain, because he was '
        + 'lying on it.' },
    { id: 'sir_c', name: 'Well-keeper Otta', role: 'the keeper of the one well',
      line: '"Eleven of us down there and the key in my hand the whole time. Nobody '
        + 'asked me to lock it. I want to be clear that nobody asked."',
      saw: 'The well took eleven and had room for more. She counted the ones who did '
        + 'not come.' },
    { id: 'sir_d', name: 'Toll-taker Ansh', role: 'the toll-taker at Salt Gate',
      line: '"There is a gate in the salt with no wall on either side of it. I stood '
        + 'in it. I don\'t know what I thought that was going to do."',
      saw: 'They came over the dunes rather than up the road, which is the one thing '
        + 'he had never seen anything do.' },
    { id: 'sir_e', name: 'Hafsa Quill', role: 'a sand-sifter',
      line: '"Things surface when the sand shifts. I have been saying it for years and '
        + 'being laughed at, and I would rather have gone on being laughed at."',
      saw: 'The dunes moved a long way in three days, and not with the wind.' },
    { id: 'sir_f', name: 'Mira Tolbrand', role: 'the quay\'s owner',
      line: '"My family\'s name is on the quay, the warehouse and the debt. Ask me '
        + 'which of the three is left."',
      saw: 'She opened the warehouse to anyone who could reach it and it was not a '
        + 'generous act, she says, because it was already empty.' },
  ],

  // -------------------------------------------------------------------------
  // ELEHYD -- Karsk Landing. A reduction works and a company town, so these
  // are working people and two of them are furious about it.
  // -------------------------------------------------------------------------
  elehyd: [
    { id: 'ele_a', name: 'Tobin Rell', role: 'the overseer\'s aide',
      line: '"I\'ve the manifest. Every household, by name." He is holding it now. '
        + 'He has been holding it a while.',
      saw: 'Four hundred and twelve people lived here. He will not be drawn on the second list.' },
    { id: 'ele_b', name: 'Kesh Antimony', role: 'a reduction hand',
      line: '"We had furnaces. Nobody thought of it until the third day. FURNACES."',
      saw: 'The works held longest. Heat turns out to be a wall.' },
    { id: 'ele_c', name: 'Wren Colleby', role: 'a company physician',
      line: '"Four arms and a collarbone, in the dark, by feel. Two of them will set crooked."',
      saw: 'Nobody in this cellar has died since they got into it.' },
    { id: 'ele_d', name: 'Bastion Oake', role: 'a convoy driver',
      line: '"Nine years on that road." He shrugs. "It\'s a road."',
      saw: 'The convoy road was cut at both ends on the same afternoon.' },
    { id: 'ele_e', name: 'Nell Ashford', role: 'a tally clerk',
      line: '"Somebody wanted the count on the fourth day. I gave it them and off they went. '
        + 'You\'re the first since."',
      saw: 'The last order given in Karsk Landing was for a headcount.' },
    { id: 'ele_f', name: 'Warden Ott', role: 'a warden out of Gravemarch',
      line: '"Gravemarch voted to stay in. I put my hand up with the rest."',
      saw: 'Gravemarch fell before the Landing did. He watched it from the road.' },
  ],

  // -------------------------------------------------------------------------
  // BRATUGAL -- Vashra. The region nobody reaches, and the one whose own chain
  // says nothing gets in or out. Three of these six are wrong about the walls,
  // which is what people are when nobody can tell them otherwise.
  // -------------------------------------------------------------------------
  bratugal: [
    { id: 'bra_a', name: 'Warden Ossuary Vane', role: 'a warden of the city',
      line: '"The wall held." He says it the way you say the date.',
      saw: 'The wall was never breached. They went round it.' },
    { id: 'bra_b', name: 'Sedge Marrable', role: 'a stilt-walker out of Stiltrow',
      line: '"You can\'t run on stilts. We used to say that about ourselves."',
      saw: 'Stiltrow went in a night. He heard it rather than saw it.' },
    { id: 'bra_c', name: 'Quill Ravensmere', role: 'a house archivist',
      line: '"Four houses, four plans, and every one of them starts with a road."',
      saw: 'Nothing came to help. Nothing could have got here.' },
    { id: 'bra_d', name: 'Ferryman Guest', role: 'a ferryman',
      line: '"Eleven crossings. On the twelfth there was nobody on the bank, so I waited a bit."',
      saw: 'The crossings stopped being used before they stopped working.' },
    { id: 'bra_e', name: 'Bettany Slack', role: 'a bell-ringer',
      line: '"My hands opened up on the second day." She shows you. "It wanted doing."',
      saw: 'The bell rang for two days. She thinks somebody heard it.' },
    { id: 'bra_f', name: 'Corvin Thornwick', role: 'the last out of Thornwick',
      line: '"Thornwick was between them and the city. That\'s what I was told it was for."',
      saw: 'Thornwick was between them and the city. It was never going to be enough.' },
  ],
};

/**
 * Who is here, for this region, this run.
 *
 * Deterministic on the region so a reload finds the same people in the same
 * cellar -- `_placeFallout`'s lesson, which is that a thing the player has
 * already met must not be re-rolled by the act of loading a save.
 */
export function survivorsFor(regionId, rand) {
  const pool = SURVIVORS[regionId] || [];
  if (!pool.length) return [];
  const n = Math.min(pool.length, survivorCount(rand));
  // Fisher-Yates off the same stream, so the COUNT and the DRAW come from one
  // seeded sequence and neither can be changed without changing the other.
  const order = pool.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor((rand || Math.random)() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, n);
}

/** Look one up by id, for a save that stored ids rather than people. */
export function survivorById(regionId, id) {
  return (SURVIVORS[regionId] || []).find(s => s.id === id) || null;
}

/** What the region says when the player walks into it and it is empty. */
export const FALLEN_REGION_LINE = {
  nek: 'Cadence is open. Every gate, every door, every shutter — open, and nothing is using them.',
  ontaria: 'The harbour is full of boats and there is nobody on any of them.',
  sirukh: 'The pan has not been raked. It has gone grey, and the grey goes all the way to the reef.',
  elehyd: 'The works are cold. That is the first thing: after eleven years of smoke, the works are cold.',
  bratugal: 'Vashra\'s bell is not ringing. You did not know you knew what that sounded like.',
};

export function fallenRegionLine(regionId) {
  return FALLEN_REGION_LINE[regionId]
    || 'Nothing here is moving except what came here to do this.';
}

/** Faults in this file's own tables. */
export function survivorFaults() {
  const out = [];
  for (const id of SURGE_REGIONS) {
    const pool = SURVIVORS[id];
    if (!pool || !pool.length) { out.push(`${id}: no survivors at all, so a fallen ${id} is empty`); continue; }
    // The pool has to be able to satisfy the largest draw, or a run that rolls
    // four finds three and nothing says why.
    if (pool.length < LOST_REGION.survivorsMax) {
      out.push(`${id}: ${pool.length} authored, but up to ${LOST_REGION.survivorsMax} are drawn`);
    }
    // ...and bigger than the draw, or every run meets the same people.
    if (pool.length <= LOST_REGION.survivorsMax) {
      out.push(`${id}: the pool is not bigger than the draw, so every run is identical`);
    }
    for (const s of pool) {
      for (const f of ['id', 'name', 'role', 'line', 'saw']) {
        if (!s[f]) out.push(`${id}/${s.id || '?'}: no ${f}`);
      }
    }
    if (!FALLEN_REGION_LINE[id]) out.push(`${id}: nothing to say when the player walks in`);
  }
  const ids = Object.values(SURVIVORS).flat().map(s => s.id);
  if (new Set(ids).size !== ids.length) out.push('two survivors share an id');
  const names = Object.values(SURVIVORS).flat().map(s => s.name);
  if (new Set(names).size !== names.length) out.push('two survivors share a name');
  const lines = Object.values(SURVIVORS).flat().map(s => s.line);
  if (new Set(lines).size !== lines.length) out.push('two survivors say the same thing');
  // The count has to be a real range, or "2-4" is one number.
  if (!(LOST_REGION.survivorsMax > LOST_REGION.survivorsMin)) {
    out.push('the survivor count is not a range');
  }
  if (LOST_REGION.survivorsMin < 1) out.push('a fallen region can have nobody in it');
  return out;
}
