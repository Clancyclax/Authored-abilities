// ===========================================================================
// ROUND 168 (items 3.1 and 3.2) -- THE MUSTER.
//
// THE USER:
//   "3.1) During the surge each city in the first 3 acts will need help. The
//    player can only help defend 3 of the cities from Act 1 or 2 and the surge
//    ends once they have completed the monster surge quest chains for 3/4
//    regions."
//   "3.2) Quests to escort NPCs to cities, deliver supplies to fortified
//    towns, clear overrun towns, with much larger spawn rates plus bronze and
//    silver monsters."
//
// ---------------------------------------------------------------------------
// WHAT THIS CLOSES
// ---------------------------------------------------------------------------
// `_markRegionSaved` has existed since round 166 and NOTHING IN THE GAME HAS
// EVER CALLED IT. The surge could start, escalate, run out its hour and end --
// and the only ending reachable in a real run was the deadline, because there
// was no way for a player to hold a city. Two rounds of a system whose good
// ending was unreachable. This is the caller.
//
// ---------------------------------------------------------------------------
// THE CHAINS ARE NOT THE SAME IN EVERY REGION, AND THAT IS MEASURED
// ---------------------------------------------------------------------------
// The first draft gave all four regions escort -> deliver -> clear. Then
// `tools/probe_round168_routes.cjs` asked `_makeOffer` -- the function that
// will be asked for real -- whether each region can post an escort at all:
//
//   nek        9/24 attempts   Fenn Cross <-> Milrow
//   ontaria   24/24 attempts   four pairs, including Little Gale -> Harrowmoor
//   elehyd    17/24 attempts   Coldharrow <-> Karsk Landing
//   bratugal   0/24 attempts   NONE
//
// BRATUGAL CANNOT POST AN ESCORT. Every pair of its three boards is either
// past ESCORT_MAX_DIST or crosses water, so `_routeIsDry` refuses all of them
// -- a standing defect in the escort kind that predates this round and has
// nothing to do with the surge.
//
// ROUND 175 -- WIDENED, AND HALF OF IT WAS NOT ABOUT BRATUGAL AT ALL.
//
// Re-measured with the same probe against all seven regions (there were four
// when the table above was written), the cap was refusing FOUR of them --
// bratugal, sirukh, cinder and ixcuatl -- because it was a fraction of the
// map and the map had moved again. It is a walk time now, and five of those
// regions post an escort:
//
//   nek 17/24 | ontaria 24/24 | elehyd 17/24 | sirukh 16/24
//   cinder 24/24 | ixcuatl 9/24 | bratugal STILL 0/24
//
// Bratugal's sentence survives on ONE of its two reasons. With distance no
// longer a factor, every road between its towns still crosses water: Vashra
// to Stiltrow 542 tiles, wet; Vashra to Thornwick 660, wet; Stiltrow to
// Thornwick dry and 1,195 tiles, which is nineteen minutes beside a handcart.
// The bog is the reason, and the bog is authored.
//
// An escort step authored for Bratugal would
// have been a step that silently never appears, which is the fault class this
// project keeps finding: a table keyed off a list that does not cover the
// roster.
//
// So Bratugal musters differently: no column goes out, because no column can
// get through. It is the only region that has to be held from inside, and it
// is also the one most players will not reach in time. That is not a
// coincidence the author arranged; it is the map, and it happens to be apt.
//
// `surgeChainFaults` checks this rather than trusting the comment, and the
// suite asks the built world the same question.
// ===========================================================================

import { SURGE_REGIONS } from './surge.js';

/**
 * THE THREE THINGS A CITY UNDER SIEGE ASKS FOR.
 *
 * Each is an existing quest kind or, for `overrun`, one this round adds --
 * deliberately, rather than three new ones. Round 133's note on the Society
 * contracts is the reason: an authored premise wrapped around a generated
 * objective is a quest the rest of the game already knows how to track, pin on
 * the map, show in the log and pay out. A bespoke objective is four systems
 * that have to learn about it.
 *
 *   escort   the existing `escort` kind. A cart of people rather than goods.
 *            ENDPOINTS ARE NOT AUTHORED: the kind picks a pair it can actually
 *            walk, and the step's text names whatever it picked at runtime,
 *            because the alternative is an authored route the game refuses to
 *            post. See the measurement above.
 *   supply   the existing `supply` kind -- a two-line order for a named
 *            client. What makes it a DELIVERY rather than a shopping list is
 *            that the report is gated on standing in the city, which is the
 *            "deliver supplies to fortified towns" half of 3.2.
 *   overrun  NEW this round. A settlement the wilderness got into, which had
 *            to be built because `_townSpawnGap` keeps every ordinary spawn
 *            group OUT of a settlement -- so "clear the overrun town" would
 *            have been a quest with nothing in it to kill.
 */
export const SURGE_STEP_KINDS = ['escort', 'supply', 'overrun'];

/** How many regions' chains the player can finish. Mirrors SURGE_SAVE_LIMIT
 *  and is checked against it, because two numbers meaning one rule is the
 *  fault class this project has named. */
export const CHAIN_STEPS = 3;

export const SURGE_CHAINS = {
  // -------------------------------------------------------------------------
  // THE NEK -- Cadence. Act 1's region, and the one the player knows best.
  // Its escort runs hamlet to hamlet rather than in to the city, because that
  // is the only dry pair it has; the fiction follows the map rather than the
  // other way round.
  // -------------------------------------------------------------------------
  nek: [
    {
      id: 'nek_column', kind: 'escort',
      title: 'The Outlying People',
      brief: 'Walk the outlying people in, ahead of what is behind them.',
      open: '"Wouldn\'t come when we asked. They\'re coming now." The clerk keeps '
        + 'writing. "Carts on the road, children on the carts. Walk in with them."',
      done: 'They\'re inside. Somebody\'s counting them; somebody else is shouting about '
        + 'where to put them.',
    },
    {
      id: 'nek_stores', kind: 'supply',
      title: 'What Cadence Is Short Of',
      client: 'Quartermaster Hale',
      brief: 'Cadence has taken in more people than it has stores for.',
      open: '"Four thousand extra mouths and ration books printed for a quiet year." '
        + 'Hale says it like a stocktake. "What\'s on that paper. Brought here, to me, '
        + 'not to a board."',
      done: '"Right. That\'s four days." Hale is already on the next list. '
        + '"Don\'t ask me about the fifth."',
    },
    {
      id: 'nek_fenn', kind: 'overrun', at: 'nek_hamlet_2',
      title: 'Fenn Cross Is Gone',
      brief: 'Fenn Cross stands empty and something is living in it.',
      open: '"Last cart out of Fenn Cross was Tuesday." The clerk looks up for the '
        + 'first time. "Whatever\'s in it now, I want it out."',
      done: 'Fenn Cross is quiet. The doors stand open and the tables are still laid.',
    },
  ],

  // -------------------------------------------------------------------------
  // ONTARIA -- Harrowmoor. The one region with a real road network: four
  // boards, four postable escort pairs, and the only place the column can
  // genuinely walk in to the city gate.
  // -------------------------------------------------------------------------
  ontaria: [
    {
      id: 'ont_column', kind: 'escort',
      title: 'The Road to Harrowmoor',
      brief: 'Bring them down the road while the road is still a road.',
      open: '"We\'ve done this in weather. Never for this." The harbourmaster\'s clerk '
        + 'is already moving. "They\'ll walk if someone walks with them. Be someone."',
      done: 'The gate takes them. The woman on the wall counts the carts twice and gets '
        + 'the same number both times.',
    },
    {
      id: 'ont_stores', kind: 'supply',
      client: 'Factor Bellamy Crewe',
      title: 'Against the Second Month',
      brief: 'Harrowmoor can feed itself for a month. It is planning for three.',
      open: '"Town\'s not hungry. I\'d like to keep it that way while there\'s still '
        + 'anything to buy." Crewe pushes the list over. "To me. In this room."',
      done: '"That\'s us into the autumn." He doesn\'t look pleased about it. '
        + '"I\'d love to be wrong about needing it."',
    },
    {
      id: 'ont_sailmend', kind: 'overrun', at: 'ont_village_a',
      title: 'Sailmend Went Quiet',
      brief: 'Sailmend stopped sending word four days ago.',
      open: '"Sailmend hasn\'t signalled since Tuesday." She says it flatly, twice. '
        + '"Go and see. Then make it less."',
      done: 'Sailmend\'s clear. Not everyone got out. The ones who hid in it can come '
        + 'out now, and some of them will not.',
    },
  ],

  // -------------------------------------------------------------------------
  // SIRUKH SANDS -- Tolbrand Quay. ROUND 179, and Act 2.5's city.
  //
  // The island is the one region whose emergency is not really the monsters.
  // Sirukh imports everything except salt -- "Salt out, everything else in.
  // The whole island eats because a flat white field does nothing for nine
  // months and then pays for a year" (Salter Gaunt, round 178) -- and a surge
  // on the mainland stops the ships whether or not a single monster ever
  // reaches the reef. So its supply step is the one that bites, and its
  // escort runs INLAND rather than to a coast, because on an island the sea
  // is the thing that has stopped helping.
  //
  // Its escort is also the one that proves the chain is postable: Salt Gate to
  // Tolbrand Quay is dry ground across the pan, which is the pairing Bratugal
  // never had (round 168: "every pair of its three boards is either past
  // ESCORT_MAX_DIST or crosses water"). Measured before this chain was
  // written, not after.
  // -------------------------------------------------------------------------
  sirukh: [
    {
      id: 'sir_column', kind: 'escort',
      title: 'Across The Pan, Before Dark',
      brief: 'Walk the salt workers in off the pan while there is still light.',
      open: '"Pan\'s no place to be caught after dark, and now it\'s no place to be '
        + 'caught at all." The clerk pushes the list over. "They won\'t leave the rake '
        + 'behind. Don\'t argue, just walk."',
      done: 'They came in over the salt with the rakes on their shoulders, and not one '
        + 'of them looked back at the field.',
    },
    {
      id: 'sir_stores', kind: 'supply',
      title: 'Nothing Has Come In',
      client: 'Mira Tolbrand',
      brief: 'No ship has made the reef in eleven days and the quay is empty.',
      open: '"My family\'s name is on this quay and there is nothing under it." Mira '
        + 'Tolbrand does not sit down. "Eleven days. I can buy what\'s on the island. '
        + 'Bring me what isn\'t."',
      done: '"That\'s the warehouse looking like a warehouse again." She signs it '
        + 'herself. "Don\'t tell anyone how little is in it."',
    },
    {
      id: 'sir_dunmouth', kind: 'overrun', at: 'sir_hamlet',
      title: 'Dunmouth Is Under',
      brief: 'Dunmouth is empty, and the sand is not what emptied it.',
      open: '"We\'ve moved Dunmouth twice in my lifetime and never once in a hurry." '
        + 'The clerk stops writing. "They went in a hurry."',
      done: 'The sand is already taking the doorways back. Whatever was using them is '
        + 'not using them now.',
    },
  ],

  // -------------------------------------------------------------------------
  // ELEHYD -- Karsk Landing. Act 3's own ground, and the last city the player
  // reaches before the Cinderwaste, where the surge is announced.
  //
  // ROUND 179 -- this note used to say Elehyd was "where the surge starts: by
  // the time the player can take these they have been standing in it". The
  // surge starts in the Cinderwaste now, one act further on, so Elehyd is
  // where the player has most recently BEEN rather than where they are.
  // -------------------------------------------------------------------------
  elehyd: [
    {
      id: 'ele_column', kind: 'escort',
      title: 'Coldharrow Is Moving',
      brief: 'Coldharrow is coming in, all of it, at once.',
      open: '"Whole village. Today." The aide reads it off the manifest. '
        + '"Sixty-one people, one road. I don\'t need you to fight. I need you SEEN "\n'
        + '"on that road."',
      done: 'Sixty-one. He counts them himself, twice, and writes it down.',
    },
    {
      id: 'ele_stores', kind: 'supply',
      client: 'Storesmaster Ivane Dekk',
      title: 'The Landing\'s Stores',
      brief: 'Karsk Landing is a working town with a war\'s worth of people in it.',
      open: '"We used to send things out of here." Dekk nods at a yard that\'s now a '
        + 'camp. "What\'s on the paper. To this yard."',
      done: '"Stowed." Dekk signs it off. "I haven\'t thanked you. Ask me after."',
    },
    {
      id: 'ele_gravemarch', kind: 'overrun', at: 'ele_hamlet_2',
      title: 'Gravemarch',
      brief: 'Gravemarch is overrun and there are people still in it.',
      open: '"Gravemarch didn\'t evacuate. They voted." The aide stops reading. '
        + '"Some of them are in the temple. Go on."',
      done: 'The temple door opens on the fourth knock.',
    },
  ],

  // -------------------------------------------------------------------------
  // BRATUGAL -- Vashra. NO ESCORT STEP, and the reason is in the header: not
  // one of Bratugal's three boards can reach another by a dry road inside
  // ESCORT_MAX_DIST. Nothing walks out of Bratugal. It is held from inside or
  // it is not held.
  //
  // ROUND 175 re-measured this after moving the cap and it still holds --
  // every road between its towns is under water, which is the bog doing what
  // a bog does. It is now the ONLY region that cannot post one.
  // -------------------------------------------------------------------------
  bratugal: [
    {
      id: 'bra_stores', kind: 'supply',
      client: 'Warden Ossuary Vane',
      title: 'Nothing Comes In',
      brief: 'Vashra cannot be supplied from outside. It has to be supplied from here.',
      open: '"You\'ll have noticed there are no carts." The Warden says it like the '
        + 'weather. "Every road out crosses water. What we have, we find here."',
      done: '"So it can be done." The Warden sounds almost interested. '
        + '"I\'d started to think otherwise."',
    },
    {
      id: 'bra_stiltrow', kind: 'overrun', at: 'bra_hamlet_1',
      title: 'Stiltrow, On The Water',
      brief: 'Stiltrow is built on stilts over the water, and something has climbed them.',
      open: '"Stiltrow can\'t run anywhere." The Warden puts a hand flat on the map. '
        + '"They\'re on their own roofs. Get up there."',
      done: 'The walkways hold. They come down one at a time, testing each board.',
    },
    {
      id: 'bra_thornwick', kind: 'overrun', at: 'bra_hamlet_2',
      title: 'Thornwick Last',
      brief: 'Thornwick is the last thing between the surge and Vashra\'s wall.',
      open: '"Thornwick isn\'t important." The Warden lets that sit. '
        + '"Thornwick is between them and us."',
      done: 'Thornwick holds. From the bell tower you can see Vashra\'s wall, and '
        + 'nothing moving in between.',
    },
  ],
};

/** The step a player is on in a region, or null when that region's chain is done. */
export function chainStepAt(regionId, index) {
  const chain = SURGE_CHAINS[regionId];
  if (!chain) return null;
  return chain[index] || null;
}

/** Has this region's chain been completed? */
export function chainComplete(regionId, index) {
  const chain = SURGE_CHAINS[regionId];
  return !!chain && index >= chain.length;
}

/** `surge|<region>|<stepId>` -- the quest id, and the prefix `_isChainQuest`
 *  has to know about or the board's own Turn In button pays the step, deletes
 *  it and never advances the chain. That exact bug has shipped three times in
 *  this project (rounds 76, 88, 125); it is not shipping a fourth. */
export function chainQuestId(regionId, step) {
  return `surge|${regionId}|${step.id}`;
}

export const SURGE_CHAIN_FLAG = 'surgeChain';

/** A fresh cursor: every region at step 0. */
export function newChainCursor() {
  const out = {};
  for (const id of SURGE_REGIONS) out[id] = 0;
  return out;
}

/**
 * Faults in this file's own tables.
 *
 * `postableEscorts` is passed IN rather than read here, because whether a
 * region can post an escort is a fact about the built world and not about this
 * table -- it depends on where the boards landed and where the rivers are. The
 * data lane passes what it knows; the suite passes what it measured.
 */
export function surgeChainFaults(postableEscorts = null) {
  const out = [];
  for (const id of SURGE_REGIONS) {
    const chain = SURGE_CHAINS[id];
    if (!chain) { out.push(`${id}: no chain at all, so this region can never be held`); continue; }
    // ROUND 179 -- a chain whose region has no CHAIN_CITY row makes
    // `summonsFor` return null, so the region's own letter silently falls back
    // to the generic bulletin. Sirukh Sands shipped that way for as long as it
    // took to notice: chain authored, faults clean, no letter. This check had
    // every other thing a chain needs and not the one that makes it arrive.
    if (!CHAIN_CITY[id]) out.push(`${id}: no city, so its summons is never signed`);
    if (chain.length !== CHAIN_STEPS) {
      out.push(`${id}: ${chain.length} steps, not ${CHAIN_STEPS}`);
    }
    for (const st of chain) {
      if (!SURGE_STEP_KINDS.includes(st.kind)) out.push(`${id}/${st.id}: unknown kind '${st.kind}'`);
      for (const f of ['id', 'title', 'brief', 'open', 'done']) {
        if (!st[f]) out.push(`${id}/${st.id}: no ${f}`);
      }
      // An overrun step without a place is a step with nothing to clear.
      if (st.kind === 'overrun' && !st.at) out.push(`${id}/${st.id}: overrun with no settlement`);
      if (st.kind !== 'overrun' && st.at) out.push(`${id}/${st.id}: ${st.kind} names a settlement it will not use`);
      if (st.kind === 'supply' && !st.client) out.push(`${id}/${st.id}: a delivery with nobody to deliver to`);
      // ...and the same place twice in one chain would be the second clear of
      // an empty village.
      if (st.kind === 'overrun' && chain.filter(x => x.at === st.at).length > 1) {
        out.push(`${id}: clears ${st.at} twice`);
      }
    }
    // Every chain has to END in something that can be finished in the region
    // it is about; a chain of three deliveries would be a shopping trip.
    if (!chain.some(st => st.kind === 'overrun')) {
      out.push(`${id}: nothing in this chain is a fight`);
    }
  }
  // Ids unique across every chain, because they key the quest.
  const ids = Object.values(SURGE_CHAINS).flat().map(st => st.id);
  if (new Set(ids).size !== ids.length) out.push('two steps share an id');
  // Every authored line distinct -- two cities saying the same sentence reads
  // as a bug even when the table is correct.
  const lines = Object.values(SURGE_CHAINS).flat().flatMap(st => [st.open, st.done]);
  if (new Set(lines).size !== lines.length) out.push('two steps share a line');

  // AND THE MEASURED ONE. An escort step in a region that cannot post an
  // escort is a step that never appears.
  if (postableEscorts) {
    for (const id of SURGE_REGIONS) {
      for (const st of (SURGE_CHAINS[id] || [])) {
        if (st.kind === 'escort' && !postableEscorts[id]) {
          out.push(`${id}/${st.id}: an escort step in a region that cannot post one`);
        }
      }
    }
  }
  return out;
}

// ===========================================================================
// ROUND 177 -- THE SUMMONS IS A LETTER, AND IT IS ADDRESSED TO YOU.
//
// Round 170's own "still open" list: *"The summons itself is still the generic
// surge announcement. The cities now show the years; the letter calling you
// back does not yet have its own scene."*
//
// What `_beginSurge` showed was one paragraph, identical for every player in
// every region at every rank: "Word comes up the road faster than the carts
// do..." It is decent prose and it is a BULLETIN -- it names nobody, it comes
// from nowhere, and the four cities it mentions are four cities the player has
// no relationship with yet.
//
// The thing that makes a summons a summons is that somebody sent it. So the
// letter that reaches you is the one from WHERE YOU ARE STANDING, signed by
// the person whose chain you will be running, naming their city and asking for
// the thing they actually want -- all three of which this file already holds,
// because they are the first step of that region's own chain.
//
// FOUR REGIONS HAVE CHAINS AND SEVEN HAVE GROUND. A player standing in the
// Cinderwaste when the world turns gets no letter from Quartermaster Hale,
// because Hale has never heard of them and there is no road; they get the
// bulletin, which is the honest thing for a place with no city in it. That is
// why `summonsFor` can return null and the caller keeps its old text for that
// case rather than inventing a correspondent.
// ===========================================================================

/** The city each chain is run out of, for the letter's dateline. */
export const CHAIN_CITY = {
  nek: 'Cadence',
  ontaria: 'Harrowmoor',
  sirukh: 'Tolbrand Quay',
  elehyd: 'Karsk Landing',
  // ROUND 179 -- Vashra keeps its entry although Bratugal is no longer one of
  // the four. Its chain is unreachable during the surge and its city is not,
  // and the two facts are separate: a region can be named by a letter it never
  // sends. Kept rather than deleted because Act 4 arrives at this city and the
  // name is the same name.
  bratugal: 'Vashra',
};

/**
 * The letter, or null for a region that has no city to send one.
 *
 * Built from the chain rather than written beside it, so a chain whose first
 * step is re-authored cannot leave a summons promising something nobody is
 * going to ask for -- which is the fault class this project keeps finding: two
 * descriptions of one fact, drifting apart.
 */
export function summonsFor(regionId) {
  const chain = SURGE_CHAINS[regionId];
  const city = CHAIN_CITY[regionId];
  if (!chain || !chain.length || !city) return null;
  // THE SIGNATORY IS THE STEP THAT HAS ONE, and it is not always the first.
  // Only the `supply` step names a client -- an escort is posted by a clerk
  // and an overrun town by nobody -- so The Nek's chain opens with a step
  // signed by no one. The first cut of this read `chain[0].client` and
  // produced a letter signed "undefined", which is what asking a list for a
  // field only some of its rows carry gets you.
  const step = chain.find(x => x && x.client);
  if (!step) return null;
  return {
    city,
    from: step.client,
    title: `A letter from ${city}`,
    // What the letter asks for is what THIS PERSON will ask for at the board,
    // not the chain's first step -- a signature over somebody else's errand
    // reads as a form letter, which is the thing this replaces.
    body: `It is addressed to you by name, and the hand is not a clerk's.\n\n`
      + `"${step.brief}"\n\n`
      + `It is signed ${step.client}, and underneath, in the same hand: `
      + `"Come to a board in ${city} and I will tell you the rest."\n\n`
      + `Four cities are writing tonight. This is the one that knows where you are.`,
  };
}
