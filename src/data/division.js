// ============================================================================
// ROUND 66 -- ACT 0, AND THE DIVISION OF ESSENCE RESEARCH.
//
// DESIGN_STORY.md has carried this arc since round 43 and the game has never
// contained a line of it. Round 65's review put the honest number on that: the
// build had the STAGE for every act and the SCRIPT for none, and the four
// story characters -- the two researchers, the Essence Wraith and Rory
// Matheson -- were extracted, animated, loaded, and deliberately left standing
// backstage since round 46 on the principle that "a boss standing in a field
// with nothing to say is worse than no boss".
//
// This file is what gives them something to say.
//
// -------------------------------------------------------------------------
// WHY THE SCRIPT IS DATA AND THE MACHINERY IS NOT
// -------------------------------------------------------------------------
// Round 64 built six objective kinds -- hunt, cull, survey, delve, gather,
// relic -- with target selection, progress hooks, a done test and a turn-in
// path, all asserted. Round 65 proved they carry authored content by running
// 224 god-quest steps through them without a second quest system.
//
// A story stage is the same trick again, with two kinds added that a bounty
// board never needed:
//
//   talk    -- stand in front of a named person and hear them out
//   search  -- find the thing in the room that is not furniture
//
// Both complete on an EVENT rather than on a counter, which is the only real
// difference between a plot and an errand.
//
// -------------------------------------------------------------------------
// WHAT MAKES IT A STORY RATHER THAN SEVEN ERRANDS
// -------------------------------------------------------------------------
// Each stage rewrites what the LAB says. The Department is a chartered
// research house on stage 1 and a crime scene on stage 7, and the way the
// player learns that is by walking back in and finding the same two people
// saying something worse. Nothing is gated on a cutscene; the dialogue is the
// state machine's read-out.
// ============================================================================

// knowledge.js is pure data and imports nothing, so this cannot form a cycle.
import { ACT_ORDER, actOf, REGION_ACT } from './acts.js';
import { KNOWLEDGE_BY_ID } from './knowledge.js';
// ROUND 102 -- both of these are pure data too, for the same reason. gods.js
// owns the roster the road-home offers are checked against; houses.js is Act
// 4's council, and its faults are folded into `divisionFaults` so one call
// answers for the whole story rather than two that can drift.
import { GODS } from './gods.js';
import { houseFaults } from './houses.js';

/**
 * ACT 0 -- the waking.
 *
 * DESIGN_STORY.md: "The player wakes in a strange place with no idea how they
 * got there; the last thing they remember is going to bed at home. Knowledge
 * -- the goddess -- speaks into their mind: they have come to Pallimustus as
 * an outworlder, outworlders often have an outsized impact on the world, and
 * Pallimustus is dangerous. She gives a quick grounding in essences and
 * awakening stones and suggests that if they want to survive, they had better
 * get stronger for what is coming."
 *
 * Written as pages rather than a cutscene for two reasons: it reuses the
 * dialogue UI, which is tested, and it is skippable at any page, because the
 * fifteenth time you roll a character you do not want the sermon.
 *
 * `{NAME}` is substituted with the player's name. `{E1} {E2} {E3}` are
 * supported by _act0Text and DELIBERATELY UNUSED -- see the note on the
 * essence page for why naming the player's build back to them was wrong here.
 * The substitution stays because Act 1's dialogue will want it; if it is still
 * unused two rounds from now, delete it rather than leaving a fifth thing in
 * this codebase that is written and read by nothing.
 */
// ===========================================================================
// ROUND 82 -- ACT 0 IS TWO PAGES NOW, AND THEY ARE THE TWO IT ALWAYS WANTED.
//
//   "Instead of knowledge explaining everything to them right away the player
//    is forced to explore."
//
// The eight pages that stood here explained essences, awakening stones,
// confluences and the rank ladder to somebody who could not move yet and would
// not see any of it for an hour. Six of those pages MOVED rather than going:
// they became the sewer's tidbits, fired where the thing they explain was
// about to matter.
//
// ROUND 92 -- and they have moved once more, off the floor tiles and onto the
// events themselves (src/data/knowledge.js). A tile was still a guess about
// what the player had done; picking a thing up is not a guess.
//
// What is left is the two pages that were never exposition: waking up, and the
// hook. The player reads them and then wakes on wet brick in the middle of
// somebody's ritual circle, which does more of Knowledge's old job than
// Knowledge did.
export const ACT0_PAGES = [
  {
    speaker: 'Somewhere behind your eyes',
    text: 'You went to bed.\n\nYou are fairly sure of that much. Your own bed, your own ceiling, '
      + 'the ordinary noise of an ordinary night. You remember deciding to deal with something in the morning.\n\n'
      + 'This is not the morning, and this is not your ceiling.',
  },
  // ROUND 92 -- HER PAGE IS HER FIRST LINE, and there is one copy of it.
  //
  //   "The text of knowledge's introduction needs heavy improvement. It
  //    currently is very overtly AI written and doesn't feel accurate to the
  //    world."
  //
  // What stood here was a narrator describing a voice ("It is the tone of
  // somebody who has read the end of the book") and then quoting two sentences
  // of it. That framing is the problem: it tells the player how to hear her
  // instead of letting her speak, and the simile is exactly the kind of
  // writerly flourish the note is about.
  //
  // She is `waking` in knowledge.js now -- the first entry in the same table
  // that holds every other thing she says -- so her introduction is written in
  // the same voice as her twelfth line rather than in a different one, and
  // there is no second copy of it to drift. `_act0Text` does the `{NAME}`
  // substitution here exactly as it did before.
  {
    speaker: 'Knowledge',
    text: KNOWLEDGE_BY_ID.waking.text,
  },
];

/** The state a run keeps for Act 0. Ordinary player fields, so saves carry
 *  them with no work (see saves.js: the loop copies every player field). */
export const ACT0_FLAG = 'act0Seen';

// ---------------------------------------------------------------------------
// ACT 1 -- THE DIVISION
// ---------------------------------------------------------------------------

/**
 * The lab's staff. `char` is a key in characterManifest.js -- art that has
 * been loaded and unplaced since round 46.
 *
 * `dir` is the director. DESIGN_STORY.md names the breakthrough that flees The
 * Nek as Rory Matheson and has him turn up again in Bratugal as the Act 4
 * boss, so the person the player confronts HERE is his superior, not him:
 * `researcherSenior`, the one who signs the requisitions. Rory is on the
 * premises for exactly one stage, as a junior nobody looks at twice, which is
 * what makes his return four regions later land.
 */
export const DIVISION_STAFF = {
  senior: {
    char: 'researcherSenior', name: 'Director Hallam Vesk',
    role: 'Director, Division of Essence Research',
  },
  junior: {
    char: 'researcherF', name: 'Wren Ashcombe',
    role: 'Research Assistant',
  },
  rory: {
    char: 'rory', name: 'Rory Matheson',
    role: 'Chief Engineer',
  },
  // ROUND 76 (item 8) -- ROB COLLINS, PLACED AT LAST.
  //
  // His art has been loaded and unplaced since round 50 on the same principle
  // the other three were held to: a character with nothing to say does not
  // stand in the world. Act 2 is what he has to say.
  //
  // He is not Division staff. He is filed here because this table is what the
  // chain's `who` resolves against and a second table would be a second thing
  // to keep in step -- and because, from the outside, a man living in a
  // Division building IS one of them, which is the whole question Act 2 asks.
  rob: {
    char: 'robcollins', name: 'Rob Collins',
    role: 'unaccounted for',
  },

  // ROUND 102 -- ACTS 3 AND 4. Three more, and each one is a piece of art
  // that was already loaded, for the same reason the first four were: the
  // roster is what it is, and inventing a character whose face does not exist
  // is how you get a name in a dialogue box and nobody in the room.
  //
  // THE PORTAL SPECIALIST. DESIGN_STORY: "He needs help investigating in town,
  // and offers to send a PORTAL SPECIALIST once the player is strong enough to
  // survive the next region." She is the Pirate Queen, who has stood at
  // Ontaria's dock since round 46 running the Elehyd packet -- which is to say
  // the game already had a woman whose whole job is getting people across to
  // Elehyd, and giving that job to a new face would have been a second person
  // doing one thing.
  //
  // She is the RANK GATE, and it is hers rather than the chain's: "will not
  // open the way below Gold rank" is a person refusing, not a wall.
  porter: {
    char: 'pirateQueen', name: 'The Pirate Queen',
    role: 'runs the Elehyd packet, and the other way across',
  },
  // THE OVERSEER. Act 1's Director signed requisitions in a chartered office.
  // This is the same institution four hundred miles and two acts later, and
  // the difference is the whole of Act 3: Vesk kept a ledger of forty-one
  // names, and the overseer keeps a shift rota.
  overseer: {
    char: 'researcherSenior', name: 'Overseer Calla Dreft',
    role: 'Works Overseer, Elehyd Reduction Site',
  },
  // AND RORY, RETURNED. He is already in the table as the Act 1 junior nobody
  // looks at twice; Act 4 does not add a second entry for him, because the
  // whole load-bearing point of that entry is that it is the SAME PERSON.
};

/**
 * ROUND 102 -- THE RANK GATE.
 *
 * "(Investigation continues here; the portal specialist Rob sends is the way
 *  out, and will not open the way below Gold rank.)"
 *
 * A stage may name a `minRank`, and the only one that does is the crossing to
 * Elehyd. Written as a stage field rather than as a check inside the Pirate
 * Queen's dialogue so that the gate is DATA -- a suite can ask the chain where
 * its gates are, and the answer does not depend on reading a function.
 *
 * The comparison is by index into RANK_ORDER rather than by string, and the
 * import is deliberate: ranks.js is pure data and imports nothing, so this
 * cannot form a cycle (the same reason knowledge.js is imported above).
 */
import { RANK_ORDER } from './ranks.js';

export function stageMinRank(stage) {
  return (stage && stage.minRank) || null;
}

/** Is a player of this rank allowed past this stage's gate? */
export function stageRankOk(stage, rank) {
  const need = stageMinRank(stage);
  if (!need) return true;
  const have = RANK_ORDER.indexOf(rank || 'normal');
  const want = RANK_ORDER.indexOf(need);
  return want < 0 || (have >= 0 && have >= want);
}

/**
 * Seven stages. Each is one of:
 *
 *   talk   { who }            -- speak to that staff key, or 'street' for the
 *                               townsfolk rumour round (3 distinct folk)
 *   search { room }           -- find the hidden thing in a room
 *   field  { kind, families } -- an ordinary generated objective, themed
 *   boss   { who }            -- the confrontation
 *
 * `lab` is what the Department says while this stage is current -- the two
 * researchers' lines, keyed by staff. That is the whole state machine the
 * player can see: walk back in, and the room has changed its story.
 */
export const DIVISION_STAGES = [
  {
    id: 'div_rumour',
    title: 'Ask Around',
    kind: 'talk', who: 'street', count: 3,
    brief: 'Cadence keeps talking about the research house on the hill. Find out what it is actually saying.',
    open: 'People keep half-finishing the same sentence about the Department. Finish it for them.',
    done: 'Three versions of one story, and all three end with somebody who stopped coming to work.',
    lab: {
      senior: '"Visitors. Wonderful." Director Vesk does not look up from the ledger. '
        + '"We are a chartered research house, we are entirely above board, and we are extremely busy. '
        + 'Was there something?"',
      junior: '"Oh — hello." She has the look of someone who has been told to be welcoming and is bad at it. '
        + '"We work on essence formation. Where essences come from. Whether they can be made.\n\n'
        + 'It is very exciting. It is."',
    },
  },
  {
    id: 'div_visit',
    title: 'The Department of Essence Development',
    kind: 'talk', who: 'junior',
    brief: 'The Department stands alone in the southeast corner of the city. Go in and ask.',
    open: 'Ask the assistant what the Division actually does.',
    done: 'She answered three questions and flinched at the fourth.',
    lab: {
      senior: '"Back again." The ledger closes. "We force manifestation. That is the work. '
        + 'A coin farm is forced, and nobody writes pamphlets about coin farms.\n\n'
        + 'Ask Ashcombe your questions. She enjoys them."',
      junior: '"Quintessence is the raw material — the thing an essence is made OF. '
        + 'We are trying to persuade it to take a shape.\n\n'
        + 'It works. Sometimes it works." She stops. "You should ask the Director about the intake numbers. '
        + 'I would like to hear him say them out loud."',
    },
  },
  {
    id: 'div_ledger',
    title: 'The Intake Ledger',
    kind: 'search', room: 'division_lab',
    brief: 'Vesk keeps a ledger and does not like it read. Find it.',
    open: 'Search the lab for whatever the Director keeps closing.',
    done: 'Forty-one names went in this season. Nine came out. The other thirty-two have a column of their own.',
    lab: {
      senior: '"You are in here a great deal." No pretence of the ledger now; it is simply gone from the desk. '
        + '"I would remind you that this is a chartered facility and you are a guest in it."',
      junior: 'She will not meet your eye. "I only write down what he gives me.\n\n'
        + 'I want that on the record somewhere. I only ever wrote down what he gave me."',
    },
  },
  {
    id: 'div_missing',
    title: 'The Thirty-Two',
    kind: 'field', kinds: ['survey', 'gather'], families: ['shade'],
    brief: 'Thirty-two people did not come out. Find where the Division puts what is left.',
    open: 'Work the ground outside the city for what the Division leaves behind.',
    done: 'Not graves. The Division does not bury anything, because not all of it stops moving.',
    lab: {
      senior: '"Whatever you think you have found, you have found it on public land, '
        + 'and public land is not my jurisdiction." A pause. "Nor is it your business."',
      junior: '"They come back." She says it flatly, the way you say a thing you have rehearsed. '
        + '"Not as themselves. As the part that was doing the absorbing when it went wrong."',
    },
  },
  {
    id: 'div_wraith',
    title: 'What The Division Makes',
    kind: 'field', kinds: ['cull', 'hunt'], families: ['shade'],
    brief: 'They are called Essence Wraiths. They kill, they absorb what the dead were carrying, '
      + 'and they keep some of it. Put an end to enough of them to be believed.',
    open: 'Put down the wraiths working the ground outside Cadence.',
    done: 'Each one fought like something that had been several people. That is because it had.',
    lab: {
      senior: '"You have been killing my failures." Vesk sounds, for the first time, genuinely interested. '
        + '"Do you know how few people could? That is data. Thank you."',
      junior: '"He wrote your name down." She is packing, badly, into a bag too small. '
        + '"Not as a problem. As a CANDIDATE. Please leave this city."',
    },
  },
  {
    id: 'div_engineer',
    title: 'The Chief Engineer',
    kind: 'talk', who: 'rory',
    brief: 'There is a third person in that building and nobody has introduced him.',
    open: 'Find the engineer nobody mentions.',
    done: 'Rory Matheson. Pleasant, distracted, and the only one in the building who is proud of the work.',
    lab: {
      senior: '"Matheson is an engineer, not an exhibit."',
      junior: '"Do not let him show you the array. He will want to. He has no idea what it is for."',
    },
  },
  {
    id: 'div_confront',
    title: 'The Breakthrough',
    kind: 'boss', who: 'senior',
    brief: 'Vesk has stopped pretending, which means he has stopped needing to. Go and be there when he finishes.',
    open: 'Confront Director Vesk in the Department.',
    done: 'The Division is gone from The Nek — the building emptied overnight, the array taken apart '
      + 'and carried out in pieces. They went west, and west of here is another country.',
    lab: {
      senior: '"You are late, and I am finished." He is not at the ledger. He is at the array. '
        + '"Forty-one names, and one of them worked.\n\n'
        + 'Not you. Do not flatter yourself. Now stand still — I would like to see what you are made of, '
        + 'and I have four of my failures in the next room who will find out for me."',
      junior: 'Ashcombe is not here. Her desk has been cleared to the wood.',
    },
  },

  // ==========================================================================
  // ACT 2 -- ONTARIA. The aperture, the second cell, and Rob Collins.
  // ==========================================================================
  //
  // "Act 2 -- underground (Ontaria) -- NOT BUILT. Needs: the secret aperture to
  // the astral space, the second Division cell, and Rob Collins."
  //
  // WHY IT IS THE SAME CHAIN AND NOT A NEW ONE. Act 1 ends with the Department
  // emptied overnight and carried west, and west of The Nek is Ontaria. That
  // is not a new story, it is the same one arriving somewhere else -- so it is
  // four more stages on `DIVISION_STAGES`, walked by the same state machine,
  // with the same four kinds. A parallel Act-2 chain would have meant a second
  // copy of _divisionStage, _divisionStageDone and _divisionAdvance, and the
  // second copy is where the drift starts.
  //
  // `region` IS THE ONE NEW FIELD, and it exists because Act 1 has a defect
  // this must not inherit: `_divisionRumourFor` has no region gate, so The
  // Nek's "ask around" stage can be completed from townsfolk in Bratugal
  // (STATUS_QUESTS_AND_STORY.md, defect 16). A stage that names a region can
  // only be advanced in it, and Act 1's stages are tagged 'nek' for the same
  // reason -- which closes defect 16 as a side effect of building Act 2 rather
  // than as a separate patch.
  {
    id: 'div2_trail',
    title: 'West of Here Is Another Country',
    kind: 'talk', who: 'street', count: 3, region: 'ontaria', giver: 'rob',
    brief: 'The Department went west with its array in pieces. Ontaria is west. Ask Harrowmoor what came through.',
    open: 'Ask around Harrowmoor about the carts that came from The Nek.',
    done: 'Three people, three carts, one road -- and it does not go to the port. It goes up the hill.',
    lab: {
      senior: 'The Director is four hundred miles away and does not know you have followed him.',
      junior: 'Wren Ashcombe did not go with them. Whatever is in Ontaria, she is not in it.',
      rob: '"You\'re a long way from the capital." He says it kindly, and he doesn\'t ask why. '
        + '"There is nothing up that hill but a house nobody lives in. I would leave it at that."',
    },
  },
  {
    id: 'div2_house',
    title: 'A Research House on the Hill',
    kind: 'talk', who: 'rob', region: 'ontaria', giver: 'rob',
    brief: 'There is a man living in a building that is not his, and he is the only one who will say so.',
    open: 'Find whoever is in the house on the hill.',
    done: 'Rob Collins. He was on the intake list. He is the one it worked on.',
    lab: {
      senior: 'The Director is four hundred miles away and still writing to somebody here.',
      junior: 'Ashcombe\'s note said "do not look for me". It did not say do not look for THEM.',
      rob: '"Collins. Rob Collins." He puts down what he\'s holding. "You have the list, then. '
        + 'Forty-one names.\n\nMine is the one with the tick beside it. They did not tell me what that meant '
        + 'either, and I have had a year to work it out."',
    },
  },
  {
    id: 'div2_aperture',
    title: 'The Tear Behind the House',
    kind: 'search', room: 'division_cell', region: 'ontaria', giver: 'rob',
    brief: 'Collins will not say what is behind the house. He will not stop you looking, either.',
    open: 'Search the cell for whatever the Division left running.',
    done: 'It is not a door and it is not a spell. It is a hole, and it has been open for a year.',
    lab: {
      senior: 'Vesk built this and then left it open behind him.',
      junior: 'This is what the array was FOR. Not making essences. Making a way through.',
      rob: '"Now you\'ve seen it." He doesn\'t look at it. "It doesn\'t go anywhere you\'d want to be. '
        + 'I know because I have been, and I came back, and I am the only one who did."',
    },
  },
  {
    id: 'div2_close',
    title: 'What Came Back Through',
    // ROUND 102 -- `giver: 'rob'` IS THE FIX FOR THE DEFECT THIS ROUND FOUND.
    //
    // Until this round the giver was hardwired in the scene to 'senior', so
    // the only person who could hand out or receive this objective was
    // Director Vesk -- who is hidden at the end of Act 1 and stands in
    // Cadence, in The Nek, behind this stage's own Ontaria region gate. Act 2
    // has not been finishable since it shipped in round 76, with every table
    // check green the whole time, because no table held the fact.
    //
    // It is Rob's now, which is also what the writing already said: he is the
    // one standing next to the tear, and he is the one who has been meeting
    // what comes out of it alone for a year.
    kind: 'field', kinds: ['cull'], families: ['shade', 'demon', 'skeleton'], region: 'ontaria',
    giver: 'rob',
    brief: 'Things have been coming out of it for a year, a few at a time, and Collins has been meeting them alone.',
    open: 'Clear what the aperture has been letting through.',
    done: 'The hill is quiet. The tear is not closed -- nothing here knows how to close it -- but the '
      + 'ground around it is clear for the first time since the carts came, and Collins is not doing it alone.',
    lab: {
      senior: 'Somewhere west of west, the Director is being told the hill went quiet.',
      junior: 'Wren Ashcombe would want to know this. Wherever she is.',
      rob: '"A year." He\'s sitting down, which you haven\'t seen him do. "A year, and the first time '
        + 'anybody helped was a stranger from The Nek who wanted to look at a hole.\n\n'
        + 'I am coming with you. Do not argue -- you have seen what I am, and you came anyway."',
    },
  },

  // ==========================================================================
  // ACT 3 -- ELEHYD. The quintessence harvest.
  // ==========================================================================
  //
  // DESIGN_STORY.md gave this act one parenthetical line -- "(Investigation
  // continues here; the portal specialist Rob sends is the way out, and will
  // not open the way below Gold rank.)" -- and the user's ruling filled it in:
  // ELEHYD IS WHERE THEY INDUSTRIALISED IT.
  //
  // That is the act's whole argument, and it is why Act 3 is not simply a
  // third cell to break. Act 1's crime is forty-one names in a season, kept in
  // a ledger a Director closes when you walk in, in a building with a front of
  // house for visitors. Act 2's is one man alone beside a hole nobody shut.
  // Act 3's is a SHIFT ROTA. Nobody in Elehyd is hiding anything, because out
  // here there is nobody to hide it from -- the badlands are where you put a
  // works when you have stopped needing the work to look like research.
  //
  // The escalation is the point: it makes Vesk's chartered office read
  // retrospectively as the small version, and it makes the Gold-rank gate feel
  // earned rather than administrative, because what is on the other side of it
  // is not a harder monster but a bigger crime.
  //
  // `giver` (ROUND 102) -- WHO HANDS OUT AND RECEIVES A FIELD STAGE. Before
  // this round that was hardwired to 'senior' in the scene, which meant Act
  // 2's field stage could only be taken from Director Vesk -- who is hidden at
  // the end of Act 1 and stands in Cadence, in another region, behind a region
  // gate. Act 2's last stage has not been completable since it shipped in
  // round 76. A stage names its own giver now; Act 1's stages leave the field
  // blank and default to Vesk, so nothing about Act 1 moves.

  // =========================================================================
  // ACT 2.5 -- SIRUKH SANDS. Where what left Harrowmoor went.
  //
  // ROUND 183. The user folded the island in as a half-act, and the Division
  // story had to have a reason to go there that was not "there is a region
  // here". It already had one, authored in two other rounds and never
  // connected: round 178 gave Mira Tolbrand the line "My family's name is on
  // the quay, the warehouse and the debt. Ask which of the three is largest",
  // and round 182 gave Liberty a chapter that says "Find out who holds the
  // debt, because it is not her."
  //
  // The Division holds it. Act 2 is the Division gone quiet in Ontaria and
  // shipping something out of a port; four days across open water there is an
  // island with one gate, no neighbours and a merchant family who could not
  // afford to ask questions. That is where you put the things you cannot keep
  // on the mainland.
  //
  // NO INTERIOR YET, which is why all three of these are talk and field: a
  // `search` stage names a hand-built room (division_lab, harvest_works,
  // west_base) and the three half-acts have none. Authoring a stage that
  // points at a room nobody builds would be a stage the player cannot finish.
  // The limb works end to end without one; the warehouse interior is named in
  // ROUND183_NOTES.md as the next thing it wants.
  // =========================================================================
  {
    id: 'div2h_manifest',
    title: 'What The Packet Carried',
    kind: 'talk', who: 'rob', region: 'sirukh', giver: 'rob',
    brief: 'The Harrowmoor dock ledgers are written twice and agree once. The half that does not agree goes south.',
    open: 'Ask Rob about the consignment the salt packet took.',
    done: 'Four crates, four sailings, no shipper named. All four made the reef and none of them came back empty.',
    lab: {
      senior: 'Vesk moved his work by cart because a cart can be followed. Whoever this is moved it by sea.',
      junior: '"Nobody writes down what they\'re ashamed of," Ashcombe used to say, "but they do write down what it weighed."',
      rob: '"Four crates." He isn\'t looking at the ledger any more. "I\'ve been on that quay. I\'ve stood next to those crates."',
    },
  },
  {
    id: 'div2h_wrecks',
    title: 'The Hulls On The Reef',
    kind: 'field', kinds: ['cull', 'hunt'], families: ['skeleton', 'shade'],
    region: 'sirukh', giver: 'rob',
    brief: 'Two of the four ships struck the reef with nobody aboard. Something is still working them.',
    open: 'Clear whatever is crewing the wrecks on the Sirukh reef.',
    done: 'They were not a crew. They were cargo that got out, and they had been trying to get off the island.',
    lab: {
      senior: 'A thing that walks a deck it doesn\'t know is a thing that was carried onto it.',
      junior: '"As the part that was doing the absorbing." I keep saying his sentence and I keep finding new places it fits.',
      rob: '"Trying to get OFF." He sits down on the sand. "Then whatever is here, they would rather be at sea than near."',
    },
  },
  {
    id: 'div2h_debt',
    title: 'Who Holds The Quay',
    kind: 'talk', who: 'rob', region: 'sirukh', giver: 'rob',
    brief: 'The Tolbrands own the quay, the warehouse and the debt. Only two of those are theirs.',
    open: 'Find out who Mira Tolbrand actually owes.',
    done: 'A chartered research house on a hill in Ontaria, dissolved eleven months ago, still collecting.',
    lab: {
      senior: 'A dissolved charter can\'t hold a debt. Somebody\'s signing for it, and a signature is a person.',
      junior: 'They didn\'t buy the island. They bought the one family that could refuse them, and made refusing expensive.',
      rob: '"Dissolved." He laughs once, without any of it reaching his face. "They dissolved and they got BUSIER."',
    },
  },

  {
    id: 'div3_crossing',
    title: 'The Way Is Not A Road',
    kind: 'talk', who: 'porter', region: 'ontaria', giver: 'porter',
    minRank: 'gold',
    brief: 'Rob said the next one is Elehyd and that he would send somebody who could get you there. '
      + 'She runs the packet, and the packet is not what he meant.',
    open: 'Find the woman Rob sent, at the Ontaria dock.',
    done: 'She can open the way. She will not do it for anybody who would arrive dead.',
    lab: {
      senior: 'Vesk is a name in Elehyd now, and not the one people are frightened of.',
      junior: 'Wherever Ashcombe went, it was not west. Nobody goes west on purpose.',
      rob: '"She will not like me for asking." Rob does not seem troubled by it. '
        + '"She does not have to like me. She has to owe me, and she does."',
      porter: '"Rob Collins sent you." She looks you over the way you look at cargo.\n\n'
        + '"I run a packet to Elehyd twice a month. That is not what he asked me for and you know it. '
        + 'The other way across is quicker and it puts you down four days inland, '
        + 'and I have opened it for eleven people. Four came back.\n\n'
        + 'I will open it at Gold and not before. That is not me being careful with you. '
        + 'That is me being careful with what walks back through if you die on the other side."',
    },
  },
  {
    id: 'div3_dust',
    title: 'What The Convoys Carry',
    kind: 'talk', who: 'street', count: 3, region: 'elehyd', giver: 'rob',
    brief: 'Karsk Landing is the last place with walls and everything past it belongs to the weather. '
      + 'Something is still running carts out there on a schedule.',
    open: 'Ask Karsk Landing about the convoys going out into the badlands.',
    done: 'Out empty, back heavy, twice a week, on time. Nobody signs on for a second run.',
    lab: {
      senior: 'Somewhere out in the dust, somebody is doing what Vesk did, at a scale he would envy.',
      junior: 'Forty-one names in a season was the SMALL version. Nobody knew that at the time.',
      rob: '"I\'ve been out here before." He won\'t say when. "It wasn\'t a works then."',
      porter: '"I put you down four days inland and you walked to the one town with a wall. '
        + 'Sensible. Now go and look at what the wall is for."',
    },
  },
  {
    id: 'div3_road',
    title: 'The Road Out',
    kind: 'field', kinds: ['hunt', 'cull'], families: ['shade', 'demon'],
    region: 'elehyd', giver: 'rob',
    brief: 'The convoy road is walked by things that were not born out here. '
      + 'Clear enough of it to follow the ruts to the end.',
    open: 'Work the convoy road out of Karsk Landing.',
    done: 'The ruts go forty miles and stop at a cut in the rock with a gate across it.',
    lab: {
      senior: 'Vesk lost four hundred miles and a charter. Whoever is out here lost nothing.',
      junior: '"They come back," Ashcombe said, "as the part that was doing the absorbing." '
        + 'Out here they come back in numbers.',
      rob: '"I will walk it with you." He says it as though it is not a concession. '
        + '"Do not thank me. I want to see the end of this road as much as you do."',
      porter: '"Forty miles of cart ruts in country that does not hold a road. '
        + 'Somebody is maintaining that."',
    },
  },
  {
    id: 'div3_works',
    title: 'The Reduction Site',
    kind: 'search', room: 'harvest_works', region: 'elehyd', giver: 'rob',
    brief: 'There is a gate across a cut in the rock and nobody is guarding it, '
      + 'which is worse than if somebody were.',
    open: 'Go through the gate and find what the works is actually for.',
    done: 'A rota. Not a ledger of names -- a ROTA, in a clerk\'s hand, with shifts and reliefs '
      + 'and a column for wastage. Forty-one people was the experiment. This is the process.',
    lab: {
      senior: 'Vesk kept a ledger because he thought he was doing research. Nobody here is pretending.',
      junior: 'Ashcombe wanted her name on the record as somebody who only wrote down what she was given. '
        + 'There are nine hands in this rota and not one of them signed it.',
      rob: 'He hasn\'t said anything since the gate. He isn\'t looking at the racks. '
        + '"I have eaten people," he says eventually. "I want that understood before I say this is worse."',
      porter: '"You are quiet. Everybody who comes back through is quiet."',
    },
  },
  {
    id: 'div3_overseer',
    title: 'The Overseer',
    kind: 'boss', who: 'overseer', region: 'elehyd', giver: 'overseer',
    brief: 'Somebody signs the wastage column. She is still here, because it did not occur to her to leave.',
    open: 'Find whoever runs the works.',
    done: 'The works is stopped and the racks are empty. Overseer Dreft went out through the back of the cut '
      + 'with a satchel and a schedule, east, toward the king\'s city -- and she was not running. '
      + 'She was reporting in.',
    lab: {
      senior: 'Four hundred miles ago a Director told you that killing his failures was data.',
      junior: 'Somewhere, Wren Ashcombe is still not looking for them.',
      rob: '"She wasn\'t frightened of us." That\'s the part he can\'t put down. '
        + '"She was annoyed. Somebody who is annoyed has somewhere to report to."',
      porter: '"East. Of course east. Everything out here that\'s worth anything ends up in Bratugal."',
      overseer: '"You are the pair from the road." Overseer Dreft does not stop writing.\n\n'
        + '"I run a reduction site. I meet quota, I file wastage, and I have never once been asked '
        + 'a question by anyone whose opinion mattered.\n\n'
        + 'You are going to break something expensive and I am going to be very late. '
        + 'Get on with it." She rings a bell, and the racks start opening.',
    },
  },

  // ==========================================================================
  // ACT 4 -- BRATUGAL. The king, the council, and what was in the back room.
  // ==========================================================================
  //
  // This is the one act DESIGN_STORY.md wrote out in full, and it is built to
  // that outline rather than around it: the disappearances, the Division found
  // in town, the king's protection, the noble houses, the deposition, the
  // backup base in the far west, the wraiths that broke loose, Rory Matheson
  // in two phases, the child, and the gods.
  //
  // THE ONE STRUCTURAL DECISION: the houses and the council are two new stage
  // KINDS rather than a parallel system, for the same reason Act 2 was four
  // more stages instead of a second chain. `houses` completes when every house
  // is satisfied; `council` completes when the motion carries. Both read
  // src/data/houses.js, which holds no runtime state -- the favours live on the
  // player, so a save carries them with no new serialisation, exactly as
  // `divisionStage` does.

  // =========================================================================
  // ACT 3.5 -- THE CINDERWASTE. What is taking the heat.
  //
  // ROUND 183. Act 3 is the convoy road and the reduction site: a works that
  // takes things apart. The Cinderwaste is directly below it and is the one
  // country in the world with more heat than anybody can use -- which is the
  // obvious next thing a works that has outgrown its furnaces would want.
  //
  // The hook was authored in round 178 and belongs to a hauler at Kiln Halt:
  // "Something's been taking heat out of the flows south of here. Rock that
  // ran last year sits cold and nobody's pleased about it." Vart is right, and
  // this is what he is right about.
  // =========================================================================
  {
    id: 'div3h_cold',
    title: 'Rock That Ran Last Year',
    kind: 'field', kinds: ['hunt', 'cull'], families: ['elemental', 'hellhound'],
    region: 'cinder', giver: 'rob',
    brief: 'Three flows south of Kiln Halt have gone cold in a country that does not cool.',
    open: 'Work the cold flows below Kiln Halt and find what is standing in them.',
    done: 'The things in the cold ground are the things that used to live in the hot ground. They did not leave; the heat did.',
    lab: {
      senior: 'Lava doesn\'t stop. It\'s drained or it\'s diverted, and both of those are somebody doing something.',
      junior: 'Everything alive down there is built around heat. Take the heat and you don\'t get an empty country, you get a furious one.',
      rob: '"Cold." He puts his hand flat on the rock and leaves it there a long time. "Forty miles of cart ruts, and now this."',
      porter: '"I\'ve run cargo past those flows for nine years. You couldn\'t have stood where I\'m standing now."',
    },
  },
  {
    id: 'div3h_kilns',
    title: 'What Slagward Is Firing',
    // ROUND 184 -- THE GIVER WAS THE PORTER AND THE PORTER DOES NOT TRAVEL.
    //
    // She has stood at Ontaria's dock since round 46 and round 102 gave her a
    // stage machine without moving her; every other stage she gives is at that
    // dock. Written with her as the giver in the Cinderwaste, this stage was
    // uncompletable -- which is round 76's defect exactly, and `test_round102`
    // caught it: "div3h_kilns wants porter in cinder, found in ontaria".
    //
    // The haulers know what they carried as well as she does, and there are
    // three of them, so it is a street stage the way `div4_missing` is.
    kind: 'talk', who: 'street', count: 3, region: 'cinder', giver: 'rob',
    brief: 'Slagward\'s kilns never go out, and for two seasons they have been burning more than Slagward has to burn.',
    open: 'Ask three of Slagward\'s haulers what has been coming up the road.',
    done: 'Sealed loads, out of Elehyd, addressed to nobody, and the drivers are paid not to lift the covers.',
    lab: {
      senior: 'A kiln is a place you put a thing you want to stop existing. I would like to know what they think needs that.',
      junior: 'Or a place you put a thing you want to CHANGE. It depends entirely on what comes out the other side.',
      rob: '"Sealed loads out of Elehyd." He is already walking. "That is the works. That is the works, shipping its rubbish south."',
      porter: '"I\'ve carried them. They\'re not heavy and they\'re not quiet." He won\'t say more than that.',
    },
  },
  {
    id: 'div3h_draw',
    title: 'The Draw',
    kind: 'field', kinds: ['cull', 'delve'], families: ['elemental', 'demon'],
    region: 'cinder', giver: 'rob',
    brief: 'Something at the bottom of the cold ground is still taking, and it has been taking for two seasons.',
    open: 'Go down into the drained flows and end whatever is drawing off the heat.',
    done: 'It was not a machine and it was not natural, and the part of it that was still working had been fed by hand.',
    lab: {
      senior: 'Fed. By hand. On a schedule, in a country nobody visits, four days from the nearest witness.',
      junior: 'I want to say it was beautiful. I\'m not going to write that down, so I\'m saying it to you instead.',
      rob: '"Two seasons of somebody walking down there with its dinner." He is very calm, which is how I know. "I want the name."',
      porter: '"Whatever it was, it\'s off my road now." He means it as thanks. It\'s the most he\'s said all week.',
    },
  },

  {
    id: 'div4_missing',
    title: 'Odd Disappearances',
    kind: 'talk', who: 'street', count: 3, region: 'bratugal', giver: 'rob',
    brief: 'Vashra bustles. It bustles the way a room talks louder when something is wrong in it.',
    open: 'Ask Vashra who has gone missing.',
    done: 'Dock hands, mostly. Nobody grand enough for anyone to have to answer for.',
    lab: {
      senior: 'Vesk fled west from a chartered office. The Division did not stop being chartered. '
        + 'It changed whose charter it was.',
      junior: 'Eleven off one harbour shift. Ashcombe would have written them down.',
      rob: '"I won\'t come in past the gate." Rob is at the treeline and intends to stay there. '
        + '"Your guards and I have an understanding and it only holds outdoors."',
      porter: '"I have unloaded at this harbour for nine years. It has never been this polite."',
      overseer: 'Somewhere in this city, a woman with a satchel filed her report and was thanked for it.',
    },
  },
  {
    id: 'div4_warrant',
    title: 'Under Royal Warrant',
    kind: 'search', room: 'division_office', region: 'bratugal', giver: 'rob',
    brief: 'The Division is not hiding in Vashra. Find out what it is doing instead.',
    open: 'Find where the Division works in the king\'s city.',
    done: 'A brass plate by the door, polished. They are not outlawed here. They are RETAINED -- '
      + 'a royal warrant, countersigned, with the harbour levy against it. '
      + 'The king is not protecting them. The king is a customer.',
    lab: {
      senior: 'This is what Vesk was trying to be, and he was never going to get there. He kept a ledger.',
      junior: 'Somebody countersigned this. Somebody always countersigns.',
      rob: '"A plate." He laughs, once, and it isn\'t a good sound. '
        + '"A year in a house on a hill and they have a PLATE."',
      porter: '"The harbour levy." She has gone very still. "That is my levy. I pay that levy."',
      overseer: 'Overseer Dreft is in this building somewhere, being very late and entirely unbothered.',
    },
  },
  {
    id: 'div4_houses',
    title: 'The Four Houses',
    kind: 'houses', region: 'bratugal', giver: 'rob',
    brief: 'A king cannot be arrested and a warrant cannot be argued with. '
      + 'A king can be unseated by his own council, and the council is four houses and the crown.',
    open: 'Earn the voice of House Vantell, House Oromir, House Ilmarch and House Serrel.',
    done: 'Four houses. Four different reasons. Every one of them now wants him gone for their own.',
    lab: {
      senior: 'Vesk would have understood this part perfectly, which is not a comfortable thought.',
      junior: 'Ashcombe wrote down what she was given. These four sign what they are given.',
      rob: '"Politics." Rob says the word the way other people say a wound. '
        + '"Fine. You do that and I will keep counting them coming through the west gate."',
      porter: '"Four houses and a crown. I have bribed three of those four and I will tell you '
        + 'which one I could not."',
      overseer: 'Nobody has asked Overseer Dreft a question by anyone whose opinion mattered. Yet.',
    },
  },
  {
    id: 'div4_council',
    title: 'The Motion',
    kind: 'council', region: 'bratugal', giver: 'rob',
    brief: 'The council can be called. It can also be called too early, '
      + 'and a motion that fails is harder the second time.',
    open: 'Call the council and put the motion.',
    done: 'The motion carried. There is a new king by the evening and the Division is outlawed by the morning — '
      + 'and the offices on the harbour road were emptied two days before the vote was called.',
    lab: {
      senior: 'Emptied overnight, the array taken apart and carried out in pieces. It is the same exit. '
        + 'They have done it before and they were always going to do it again.',
      junior: '"Do not look for me. — W.A." Somebody in that building took her advice.',
      rob: '"Two days before." He\'s already looking west. "Somebody told them. '
        + 'Work out who later — they have a backup and they are in it now."',
      porter: '"West. Past the last of the badlands, where the maps stop bothering. '
        + 'I know because I have been paid not to go there."',
      overseer: 'Dreft filed one last report and went with them. She is very good at her job.',
    },
  },
  {
    id: 'div4_west',
    title: 'Where The Maps Stop',
    kind: 'field', kinds: ['delve', 'survey'], region: 'bratugal', giver: 'rob',
    brief: 'They went before the vote. There is one place left that is theirs.',
    open: 'Find the backup base in the far west.',
    done: 'A cut into a hillside where nothing has been built and everything has been dug. '
      + 'The door is open, which is the first thing that is wrong.',
    lab: {
      senior: 'Nobody has heard of Hallam Vesk in two acts. Something further up did the hearing.',
      junior: 'Nine came out of forty-one. This place has been running for a year.',
      rob: '"Open." He stops at the threshold and won\'t go first. '
        + '"They left in a hurry and they didn\'t shut it behind them. Ask yourself why not."',
      porter: '"I\'m not taking you back if you go in there. I want that said out loud."',
      overseer: 'The rota was in a clerk\'s hand. Nine hands. None of them signed it.',
    },
  },
  {
    id: 'div4_loose',
    title: 'What Broke Loose',
    kind: 'search', room: 'west_base', region: 'bratugal', giver: 'rob',
    brief: 'They left in a rush and they did not take everything with them.',
    open: 'Get through the base to whatever is at the centre of it.',
    done: 'The cages are open and most of them were opened from the inside. '
      + 'At the middle of the base is one that was not — the only door here that is still locked, '
      + 'and it locks from the outside.',
    lab: {
      senior: '"I would like to see what you are made of." Four acts and it is still the same sentence.',
      junior: 'Ashcombe flinched at the fourth question. This is the fourth question.',
      rob: '"They fed something in here." He has stopped walking. '
        + '"Not once. On a schedule. I know what that looks like from the inside of it."',
      porter: 'Four came back out of eleven, and she thought that was a bad ratio.',
      overseer: 'A column for wastage, and the wastage went somewhere.',
    },
  },
  {
    id: 'div4_rory',
    title: 'The Breakthrough, Kept',
    kind: 'boss', who: 'rory', region: 'bratugal', giver: 'rob',
    brief: 'Something in the locked room is saying your name, and it knows how to.',
    open: 'Open the last door.',
    done: 'Rory Matheson is dead, twice, and the thing that came out of him the second time '
      + 'was not a shape anything is supposed to hold.',
    lab: {
      senior: '"Forty-one names, and one of them worked." He was talking about this.',
      junior: '"Do not let him show you the array. He has no idea what it is for." She was wrong. '
        + 'He is the only one who ever did.',
      rob: 'Rob doesn\'t say anything at all, and he\'s standing between you and the back room.',
      porter: '"You went in. Nobody goes in."',
      overseer: 'Somewhere east, an overseer is explaining a very large loss to somebody.',
    },
  },
  {
    id: 'div4_child',
    title: 'The Back Room',
    kind: 'search', room: 'west_back', region: 'bratugal', giver: 'rob',
    brief: 'There is a door behind where he was, and it was locked from this side.',
    open: 'Open the back room.',
    done: 'A child. Very sick, very quiet, and the aura around them is wrong in a way you have '
      + 'no word for and your essences will not look at directly. '
      + 'You pick them up, because there is nothing else to do, and you carry them out.',
    lab: {
      senior: 'Vesk asked what you were made of. Nobody has asked what this child is made of.',
      junior: 'Forty-one names, and this one is not on any list you have found.',
      rob: '"Thank you." Rob Collins says it quietly and means it, which is the worst part. '
        + '"Go on. Get them to a healer. I will make sure everything in here is cleaned up."',
      porter: '"You\'re carrying something. I didn\'t ask what. Get in the boat."',
      overseer: 'Nobody filed this one.',
    },
  },

  // =========================================================================
  // ACT 4.5 -- IXCUATL. The mouth it came out of.
  //
  // ROUND 183, and the end of the spine. Act 4 finishes in the back room of a
  // western base; this is what the back room was FOR.
  //
  // Round 179 gave the Cut nine layers of city under one identical street
  // plan, in a scholar's line: "Nobody copies a plan for nine generations
  // unless they were told to." Round 182 gave Knowledge a private chapter
  // asking for "the mouth it came out of". The Division has been reading the
  // same plan, and it did not invent any of it.
  // =========================================================================
  {
    id: 'div4h_cut',
    title: 'Down The Cut',
    kind: 'field', kinds: ['delve', 'cull'], families: ['skeleton', 'spiritSerpent'],
    region: 'ixcuatl', giver: 'rob',
    brief: 'The Cut goes down through nine cities, and the diggers stopped at seven for a reason they will not give.',
    open: 'Clear the lower trench at The Cut, past where the expedition turned back.',
    done: 'Layers eight and nine are not ruins. They are the same streets, swept, with nothing living on them.',
    lab: {
      senior: 'Seven generations of ruin and two of housekeeping. Whatever kept those streets wasn\'t a resident.',
      junior: 'Swept. I\'ve read that word forty times today and it hasn\'t got any better.',
      rob: '"They turned back at seven." He looks at the ladder for a while. "Sensible people. Right, come on."',
      porter: '"I will hold the top. Somebody has to, and I have seen what you two do to a ladder."',
    },
  },
  {
    id: 'div4h_plan',
    title: 'The Same Street Twice',
    kind: 'talk', who: 'rob', region: 'ixcuatl', giver: 'rob',
    brief: 'Nine cities, one plan, and the plan is not Ixcuatl\'s.',
    open: 'Work out with Rob where the Stepped City got its plan.',
    done: 'The ninth layer\'s plan is drawn in the margin of a Division survey, dated four years ago, copied the wrong way round.',
    lab: {
      senior: 'They didn\'t bring the plan here. They took it FROM here and then built to it. We\'ve been reading their homework.',
      junior: 'Four years ago somebody stood where we\'re standing and drew this, and went home, and started a department.',
      rob: '"Copied the wrong way round." He is quiet for a long time. "So everything since -- the house, the works, the crates -- all of it is somebody else\'s idea, badly."',
      porter: '"I have stopped asking what is in the crates. I would like to go back to not knowing."',
    },
  },
  {
    id: 'div4h_mouth',
    title: 'What Did The Telling',
    kind: 'field', kinds: ['hunt', 'delve'], families: ['harbinger', 'spiritSerpent'],
    region: 'ixcuatl', giver: 'rob',
    brief: 'Nine generations built to one plan, and something spent nine generations giving it to them.',
    open: 'Go to the bottom of the Stepped City and find what was doing the telling.',
    done: 'It is still there and it is still talking, and it has been talking to an empty city for a very long time.',
    lab: {
      senior: 'Nine hundred years of instruction and nobody left to instruct. I\'m not sure that\'s a monster. I\'m not sure it isn\'t.',
      junior: 'It didn\'t stop when they died. That\'s the part I\'ll be thinking about, and I\'d rather I weren\'t.',
      rob: '"It is still going." He puts a hand on the wall, the way he did on the cold rock. "All this time, and nobody listening but us."',
      porter: '"I brought the boat round. Whatever you found, we\'re not carrying it."',
    },
  },
];

/**
 * ROUND 76 (item 8) -- WHICH REGION A STAGE BELONGS TO.
 *
 * Act 1 is The Nek and Act 2 is Ontaria. Stages carry `region` from Act 2
 * onward and Act 1's are answered here rather than by editing seven objects,
 * because Act 1's region was never in question -- what was missing is a place
 * to ASK, which is defect 16 ("`_divisionRumourFor` has no region gate: you
 * can complete The Nek's ask-around stage from townsfolk in Bratugal").
 */
export function stageRegion(stage) {
  return (stage && stage.region) || 'nek';
}

/** Is the player standing where this stage can be advanced? */
export function stageInRegion(stage, regionId) {
  return !stage || !regionId || stageRegion(stage) === regionId;
}

/** Where each act begins, so a suite can pin the seams without counting
 *  stages -- and so that adding a stage to Act 3 does not silently move what
 *  a test believes Act 4 is. */
export const ACT2_FIRST = 'div2_trail';
export const ACT3_FIRST = 'div3_crossing';
export const ACT4_FIRST = 'div4_missing';

/**
 * ROUND 102 -- WHO HANDS OUT AND RECEIVES A STAGE.
 *
 * THE DEFECT THIS EXISTS TO CLOSE. `_talkToDivisionStaff` tested
 * `key === 'senior'` to decide who offers field work, and Director Vesk is
 * hidden by `_noteDivisionKill` at the end of Act 1 and stands in Cadence for
 * the whole game. Act 2's `div2_close` is a field stage in Ontaria whose only
 * giver was therefore an invisible man in another region behind a region gate.
 * ACT 2 HAS NOT BEEN COMPLETABLE SINCE IT SHIPPED IN ROUND 76, and every table
 * check passed the entire time, because the tables were right -- the stage
 * exists, the region is correct, the objective builds. What was wrong was who
 * could be asked, which is not a fact any table held.
 *
 * Found by asking the running game, for each stage, WHICH PLACED NPC WOULD
 * OFFER A CHOICE -- the same shape of question as round 101's "ask the world
 * what it draws". A stage names its giver now; Act 1's leave it blank and get
 * Vesk, so nothing about Act 1 moves.
 */
export function stageGiver(stage) {
  return (stage && stage.giver) || 'senior';
}

/** After the confrontation. The Department stands empty and says so. */
export const DIVISION_EMPTY = {
  senior: 'The Director\'s desk is bare. Someone burned the ledger in the grate and did not stay to watch it.',
  junior: 'A note, in a hurried hand: "I am not going with them. Do not look for me. — W.A."',
};

export const DIVISION_FLAG = 'divisionStage';
export const DIVISION_DONE = DIVISION_STAGES.length;

/** How many wraiths the boss stage puts in the room. */
export const CONFRONT_WRAITHS = 4;

/** The rumour lines, one per townsperson, for stage 1. Three DISTINCT people
 *  have to be heard, so there are more lines than are needed in one run. */
/**
 * ROUND 76 (item 8) -- ONTARIA'S rumours, for Act 2's ask-around stage.
 *
 * Kept apart from The Nek's rather than pooled: the two stages ask different
 * questions in different places, and a Harrowmoor fisherman repeating "my
 * cousin took their intake test" would be the region gate working and the
 * WRITING not.
 */
export const DIVISION_RUMOURS_ONTARIA = [
  'Three carts up the coast road in one week, all of them heavy, none of them stopping at the port.',
  'They bought the old house on the hill outright. Paid in Nek bronze and never moved anyone in.',
  'There is a light up there some nights. Not a lamp. Lamps do not do that.',
  'A man walks down for supplies and walks back up. Never says which of them he works for.',
  'My boy went up to see. He came back the same evening and he has not been up since.',
  'Whatever they carried in, they carried it in pieces. Whatever it is now, it is not in pieces.',
];

/**
 * ROUND 102 -- ELEHYD'S. Same rule again, and by now it is a rule rather than
 * a judgement call: each act asks its own question in its own place, so each
 * gets its own bank. Karsk Landing is the last place with walls and everyone
 * in it knows exactly how far out the carts go, because watching the road is
 * what there is to do here.
 */
export const DIVISION_RUMOURS_ELEHYD = [
  'Twice a week, out empty and back heavy. You can set a clock by it and people do.',
  'They pay a season up front for a single run. Nobody has ever signed on for a second.',
  'It is forty miles to where the ruts stop. I know because my brother measured it and then stopped talking about it.',
  'There is a cut in the rock out east with a gate across it. A gate. Out there.',
  'Whatever is in those carts on the way back, it does not need air holes and it did on the way out.',
  'The drivers are not from here and they do not drink here. They sit in the yard until it is time.',
];


/**
 * ROUND 184 -- THE CINDERWASTE'S, and the register is the point again: The Nek
 * gossips, Ontaria watches a hill, Elehyd counts carts, Vashra is polite. A
 * haul road counts WEIGHT, because that is the one thing a driver is paid to
 * know and the one thing nobody can hide from him.
 */
export const DIVISION_RUMOURS_CINDER = [
  'Sealed loads, twice a month, and the manifest says ballast. I have carried ballast. It does not sit like that.',
  'They come up from Elehyd and they go straight to the kiln yard. Not the works. The YARD.',
  'The covers are roped from underneath, which is a thing you do so a driver cannot lift one at a rest.',
  'Kiln four has been running hot since spring and kiln four is not on any of our dockets.',
  'I asked what it was once. The clerk wrote down that I asked.',
  'Nothing comes back down the road. Eleven runs up, nothing down. Where is it all going?',
];

/**
 * ROUND 102 -- BRATUGAL'S. The difference in register is the point: The Nek
 * gossips, Ontaria watches a hill, Elehyd counts carts, and Vashra is a
 * capital being extremely polite about something.
 */
export const DIVISION_RUMOURS_BRATUGAL = [
  'Eleven off one harbour shift. The house paid out and nobody asked the house to.',
  'You will not hear it from the watch. The watch has been told the streets are quiet.',
  'Dock hands, mostly. Nobody grand enough that anyone has had to answer for it.',
  'There is an office on the harbour road with a brass plate and no queue outside it. Ask yourself what it sells.',
  'My sister cleans on that road. She says they are there at all hours and none of them are ever ill.',
  'It is a royal city. If it were wrong, somebody would have said. That is what I keep telling myself.',
];

export const DIVISION_RUMOURS = [
  'The research house pays in bronze and asks no questions about where you slept last week. Draw your own conclusion.',
  'My cousin took their intake test. Passed it, she said. That was in spring.',
  'They advertise for volunteers. Volunteers. For what, exactly? Nobody ever says.',
  'A cart goes up there at night and comes back lighter. I have stopped counting.',
  'Chartered by the city, mind. Whatever they are doing, someone signed for it.',
  'I used to drink with a man who swept their floors. He does not drink anywhere now.',
];

// ===========================================================================
// ROUND 102 -- THE END OF ACT 4, AND WHY IT IS NOT A STAGE.
//
// DESIGN_STORY.md: "Suspicious but more worried about the child, the party
// heads back toward town -- and on the way EVERY GOD EXCEPT LIBERTY messages
// them, each asking that the child be brought to their own temple, each
// offering something incredible for the effort."
//
// This fires when the chain COMPLETES rather than as a twelfth Act 4 stage,
// and the distinction is the whole ending. A stage is a thing the player is
// asked to do. This is a thing that happens to them on the road afterwards,
// with no objective, no marker and nothing to accept -- and it is the last
// beat of the act precisely because there is nothing to do about it yet.
//
// LIBERTY IS SILENT AND THAT IS THE LOUDEST THING IN IT. Seven gods want the
// child. The one whose whole domain is not being owned by anybody does not
// ask, and nobody explains why, and the act ends there.
//
// `GOD_OFFERS` is keyed on gods.js's own roster so a god added or renamed
// there cannot leave a hole here -- `divisionFaults` checks the two lists
// against each other rather than trusting them to stay in step, which is fault
// class two (a table keyed off a list that does not cover the roster) and the
// one this codebase reproduces most.
// ===========================================================================
export const GOD_SILENT = 'liberty';

export const GOD_OFFERS = {
  death: {
    title: 'Death',
    offer: 'a clean end, whenever you ask for it, for anyone you name',
    line: '"Bring the child to me." Death is not unkind and has never needed to be. '
      + '"What is in them is not living and is not dying, and I am the only one of us '
      + 'who will tell you honestly that I do not know which I would be doing."',
  },
  dominion: {
    title: 'Dominion',
    offer: 'a city that answers to you, and the standing to keep it',
    line: '"You have just unmade a king." Dominion sounds, for the first time, interested in you. '
      + '"Bring the child to my temple and I will give you what he had, properly, '
      + 'and no council will ever sit on it."',
  },
  healing: {
    title: 'Healing',
    offer: 'the child made well, and the knowledge of how it was done',
    line: '"They are sick." Healing says it before anything else, which none of the others do. '
      + '"Bring them to me and I will mend what can be mended. I will not promise you '
      + 'that mending it leaves them what they are."',
  },
  heros: {
    title: 'The Hero',
    offer: 'the name and the deeds to go with it, for the rest of your life',
    line: '"Carry them to my steps and the whole of Pallimustus will know who did." '
      + 'The Hero has never once hidden what he trades in. "That is not nothing. '
      + 'You of all people know it is not nothing."',
  },
  knowledge: {
    title: 'Knowledge',
    offer: 'to be told what the child is',
    // ROUND 269 (item 3) -- THE ANTI-SLOP PASS. What stood here opened with a
    // narrator telling the player how to hear her ("You know her voice", "A
    // pause, which she does not do") -- the exact framing round 92 took out
    // of her introduction -- and it was wrong besides: she has been talking to
    // the player all game, not silent "since the brick". Then two sentences
    // built on one frame ("I want you to notice... I want you to notice...")
    // ending on a twist. She speaks now as she does in knowledge.js: plainly,
    // about the thing in front of her, and about what she gets out of it.
    line: '"Bring the child to me and I will tell you what they are — what the Division '
      + 'put into them, how far it has gone, and what it will do as they grow."\n\n'
      + '"That is all I can do. It will not mend them. The others will tell you what '
      + 'they want in return, so I will too: I want to know. I have wanted to know '
      + 'since you walked into the first of their cells."',
  },
  purity: {
    title: 'Purity',
    offer: 'everything the Division did to them undone, root and branch',
    line: '"That aura does not belong in the world." Purity does not raise its voice and never has. '
      + '"Bring the child to me and I will take it out of them entirely. '
      + 'Do not ask me how much of them it is."',
  },
  war: {
    title: 'War',
    offer: 'the strength to finish what you have started, against anyone',
    line: '"You have been at this for four regions and you are not finished." '
      + 'War is the only one who talks to you like a colleague. '
      + '"Give me the child and I will make you enough to end the rest of it in a season."',
  },
};

/** The road home, in the order they arrive. Ends with the silence. */
export const GOD_OFFER_ORDER = ['healing', 'knowledge', 'purity', 'death', 'war', 'heros', 'dominion'];

export const GOD_OFFER_CLOSE = {
  speaker: 'The road back',
  text: 'Seven of them, between the hillside and the first waystone, '
    + 'each one certain and each one offering something you would have taken a year ago.\n\n'
    + 'Liberty says nothing at all.\n\n'
    + 'The child has not woken. You keep walking.',
};

/** Set on the player when the offers have been heard, so they arrive once. */
export const GOD_OFFERS_FLAG = 'godOffersHeard';

/** The stage the player is on, clamped. */
export function divisionStage(player) {
  const n = (player && player[DIVISION_FLAG]) || 0;
  return Math.max(0, Math.min(DIVISION_DONE, n));
}

export function divisionCurrent(player) {
  const n = divisionStage(player);
  return n < DIVISION_DONE ? DIVISION_STAGES[n] : null;
}

/** What a member of staff says right now. Falls back to the empty building. */
export function labLine(player, staffKey) {
  const st = divisionCurrent(player);
  if (!st) return DIVISION_EMPTY[staffKey] || DIVISION_EMPTY.senior;
  return (st.lab && st.lab[staffKey]) || '';
}

/**
 * Faults a suite can assert on, in the shape round 64 and 65 used: every check
 * that can be made without booting the game, made here once.
 */
export function divisionFaults() {
  const out = [];
  const seen = new Set();
  for (const s of DIVISION_STAGES) {
    if (seen.has(s.id)) out.push(`duplicate stage id ${s.id}`);
    seen.add(s.id);
    for (const f of ['title', 'brief', 'open', 'done']) {
      if (!s[f]) out.push(`${s.id} missing ${f}`);
    }
    // ROUND 102 -- two more kinds, both Act 4's, both reading houses.js.
    if (!['talk', 'search', 'field', 'boss', 'houses', 'council'].includes(s.kind)) {
      out.push(`${s.id} unknown kind ${s.kind}`);
    }
    if (s.kind === 'talk' && !s.who) out.push(`${s.id} talk with no who`);
    if (s.kind === 'boss' && !s.who) out.push(`${s.id} boss with no who`);
    if (s.kind === 'search' && !s.room) out.push(`${s.id} search with no room`);
    if (s.kind === 'field' && !(s.kinds || []).length) out.push(`${s.id} field with no kinds`);
    // ROUND 102 -- THE GIVER MUST BE SOMEBODY WHO EXISTS.
    //
    // This is the check that would have caught Act 2's dead field stage in
    // round 76 if the field had existed then: a stage's giver has to be a real
    // staff key. It cannot check that the giver is PLACED, or in the right
    // region, or visible -- those are facts about the world and belong in the
    // browser suite, which asks them. What it can do is refuse a typo.
    const giver = stageGiver(s);
    if (!DIVISION_STAFF[giver]) out.push(`${s.id} names unknown giver ${giver}`);
    // ...and the giver has to have something to say in the stage they are
    // giving out, or the player opens an empty box on the one person the
    // stage requires them to find.
    if (!s.lab || !s.lab[giver]) out.push(`${s.id} has no line for its own giver ${giver}`);
    if (s.minRank && !RANK_ORDER.includes(s.minRank)) out.push(`${s.id} gates on unknown rank ${s.minRank}`);
    // Every stage must give BOTH researchers something to say, or walking back
    // into the lab mid-chain produces an empty dialogue box.
    for (const k of ['senior', 'junior']) {
      if (!s.lab || !s.lab[k]) out.push(`${s.id} lab line missing for ${k}`);
    }
    // ROUND 76 -- and ROB has to have something to say in every Act 2 stage,
    // for exactly the reason the two researchers do: he is the person standing
    // in the room those stages happen in, and a player who walks back into the
    // cell mid-chain would otherwise open an empty dialogue box.
    const act = REGION_ACT[stageRegion(s)] || 0;
    // ROUND 183 -- and Rob from Act 2 onward, for the same reason, which now
    // includes Sirukh Sands at Act 2.5. The porter is NOT required there: he
    // is met at `div3_crossing`, so on the island he has not been introduced.
    if (act >= 2 && act < 3 && (!s.lab || !s.lab.rob)) {
      out.push(`${s.id} is an Act 2 stage with no line for rob`);
    }
    // ROUND 102 -- and the same, generalised. Rob walks the rest of the game
    // with the player from the end of Act 2 ("I am coming with you"), and the
    // three characters Acts 3 and 4 introduce stay on the map once they are
    // met. Anyone standing in the world during a stage must have a line for
    // it, which is one rule instead of one rule per character.
    // ROUND 183 -- BY ACT, not by a written pair. Rob joins at the end of Act 2
    // and the porter at the start of Act 3, and both then stay on the map -- so
    // "who is standing in the world during this stage" is a question about how
    // far along the story is, which is what the act number means. The old pair
    // `['elehyd','bratugal']` was that same answer for a four-region world and
    // would have let the Cinderwaste and Ixcuatl ship stages where the two
    // people travelling with the player have nothing to say.
    if (act >= 3) {
      for (const k of ['rob', 'porter']) {
        if (!s.lab || !s.lab[k]) out.push(`${s.id} is an Act 3/4 stage with no line for ${k}`);
      }
    }
    // ROUND 179 -- was a hardcoded four, one of seven copies of the spine.
    // The story runs through all seven regions now, so a stage naming Sirukh
    // Sands or the Cinderwaste is a stage in an act rather than a typo.
    if (s.region && !ACT_ORDER.includes(s.region)) {
      out.push(`${s.id} names region ${s.region}, which is in no act`);
    }
    if (s.who && s.who !== 'street' && !DIVISION_STAFF[s.who]) {
      out.push(`${s.id} names unknown staff ${s.who}`);
    }
  }
  // ROUND 76 -- the acts must not interleave. A chain that ran nek, ontaria,
  // nek would send the player back and forth across the world between two
  // consecutive stages, and the region gate would read as a bug.
  //
  // ROUND 183 -- WIDENED, and this is exactly the shape a half-act has.
  //
  // The user's ordering makes Sirukh Sands a limb hanging off Ontaria, so the
  // chain now reads ontaria, sirukh, ontaria: you sail out, you do the island,
  // you come back, and THEN the porter takes you to Elehyd. Round 76's rule
  // called that an interleave, and under a straight line of four regions it
  // would have been one.
  //
  // What makes it legal is not "a return" but WHICH return. Coming back to the
  // act a limb hangs off is the limb working; coming back to some third region
  // you left two acts ago is still the bug round 76 named. So the allowance is
  // exactly as wide as `hangsOff` and no wider.
  const regions = DIVISION_STAGES.map(stageRegion);
  const backTo = (id, from) => {
    const a = actOf(from);
    return !!(a && a.kind === 'interlude' && a.hangsOff === id);
  };
  for (let i = 1; i < regions.length; i++) {
    if (regions[i] === regions[i - 1]) continue;
    if (backTo(regions[i], regions[i - 1])) continue;   // off the limb, home
    if (regions.slice(0, i).includes(regions[i])) out.push(`chain returns to ${regions[i]} at stage ${i}`);
  }
  if (DIVISION_RUMOURS_ONTARIA.length < 3) out.push('not enough Ontaria rumours to hear three');
  // ROUND 102 -- every ask-around stage needs a bank deep enough to hear three
  // DISTINCT people, and asked per stage rather than per bank, because the
  // failure mode is a stage whose region has no bank at all: the runtime falls
  // back to The Nek's, and a Vashra dockhand starts talking about a research
  // house on a hill four hundred miles away. That is defect 16 again in a new
  // costume, and a `.length` check on four constants would not see it.
  const BANKS = {
    nek: DIVISION_RUMOURS, ontaria: DIVISION_RUMOURS_ONTARIA,
    elehyd: DIVISION_RUMOURS_ELEHYD, bratugal: DIVISION_RUMOURS_BRATUGAL,
    cinder: DIVISION_RUMOURS_CINDER,
  };
  for (const s of DIVISION_STAGES) {
    if (s.kind !== 'talk' || s.who !== 'street') continue;
    const bank = BANKS[stageRegion(s)];
    if (!bank) out.push(`${s.id} asks around in ${stageRegion(s)}, which has no rumour bank`);
    else if (bank.length < (s.count || 3)) {
      out.push(`${s.id} needs ${s.count || 3} distinct tellings and ${stageRegion(s)} has ${bank.length} lines`);
    }
  }
  // ...and no two banks may share a line, which is the same fault seen from
  // the other end: a pooled line is a line that can be heard in the wrong
  // country even when the gate is working.
  const allLines = [];
  for (const b of Object.values(BANKS)) allLines.push(...b);
  if (new Set(allLines).size !== allLines.length) out.push('two rumour banks share a line');
  // ROUND 102 -- THE GODS' OFFERS AGAINST GODS.JS'S OWN ROSTER.
  //
  // Fault class two: a table keyed off a list that does not cover the roster.
  // Seven of the eight gods speak on the road home and the eighth deliberately
  // does not, so this cannot be a count -- it has to be the actual set
  // difference, in both directions, against the file that owns the roster.
  const spoken = new Set(Object.keys(GOD_OFFERS));
  for (const g of GODS) {
    if (g === GOD_SILENT) {
      if (spoken.has(g)) out.push(`${g} is meant to stay silent and has an offer written for them`);
      continue;
    }
    if (!spoken.has(g)) out.push(`${g} is in the roster and does not speak on the road home`);
  }
  for (const g of spoken) if (!GODS.includes(g)) out.push(`${g} speaks on the road home and is not a god`);
  if (!GODS.includes(GOD_SILENT)) out.push(`the silent god ${GOD_SILENT} is not in the roster`);
  // The order has to be the whole set, once each -- an offer written and never
  // reached is fault class one, and this file is where it would happen.
  if (GOD_OFFER_ORDER.length !== spoken.size) out.push('the road home does not play every offer');
  if (new Set(GOD_OFFER_ORDER).size !== GOD_OFFER_ORDER.length) out.push('a god speaks twice on the road home');
  for (const g of GOD_OFFER_ORDER) if (!spoken.has(g)) out.push(`the road home plays ${g}, who has no offer`);
  for (const [k, o] of Object.entries(GOD_OFFERS)) {
    for (const f of ['title', 'offer', 'line']) if (!o[f]) out.push(`${k}'s offer has no ${f}`);
  }
  // ROUND 102 -- the three acts' seams are named rather than counted, so a
  // stage inserted into Act 3 cannot silently move what a suite thinks Act 4
  // is. Checked here because the names are only useful if they resolve.
  for (const [label, id] of [['ACT2_FIRST', ACT2_FIRST], ['ACT3_FIRST', ACT3_FIRST], ['ACT4_FIRST', ACT4_FIRST]]) {
    if (!DIVISION_STAGES.some(s => s.id === id)) out.push(`${label} names ${id}, which is not a stage`);
  }
  // The houses are Act 4's, and their own file checks itself -- folded in here
  // so one call answers for the whole story.
  out.push(...houseFaults());
  // ROUND 88 -- THIS RULE HAS BEEN REPORTING A FAULT SINCE ROUND 82, AND THE
  // FAULT WAS THIS RULE.
  //
  // Act 0 was eight pages when the rule was written. In round 82 the user
  // asked for it to be trimmed to a cold open -- "Trim to a cold open" -- and
  // it became the two pages above, deliberately: you wake, Knowledge tells you
  // to follow the water, and the prologue starts. Nothing updated the
  // validator, so `divisionFaults()` has returned `['act 0 is too short to be
  // an act']` on every run for six rounds, and three suites have been failing
  // on it (round 66 twice, round 76e, and round 82's own page check).
  //
  // A validator that reports a fault nobody intends to fix is worse than no
  // validator: the estate learns to read `divisionFaults()` as "one known
  // moan", and the next real fault it catches arrives in a list people have
  // stopped believing. The floor is TWO now, which is the shape the cold open
  // actually has, and the check keeps its point -- an Act 0 of one page is a
  // line, not an opening, and an empty one would sail past a `.length` test
  // that only looked for a lower bound of zero.
  if (ACT0_PAGES.length < 2) out.push('act 0 is too short to be a cold open');
  // ...and an upper bound, which is the half the original rule was missing.
  // "Trim to a cold open" is a promise about brevity, and a promise about
  // brevity is exactly the kind that erodes one well-meant page at a time.
  if (ACT0_PAGES.length > 3) out.push('act 0 has grown back out of a cold open');
  for (const p of ACT0_PAGES) {
    if (!p.speaker || !p.text) out.push('act 0 page missing speaker or text');
  }
  if (DIVISION_RUMOURS.length < 3) out.push('not enough rumours to hear three');
  return out;
}
