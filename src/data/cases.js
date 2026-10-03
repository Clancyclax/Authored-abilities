// ===========================================================================
// ROUND 96 -- THE THIRD STAR. THE CASES.
//
// The user's clause, and it is the whole design:
//
//   "1.4.3) 3 star contracts are political. Decisions need to be made,
//    investigation and discussion with NPCs. Revealing hidden cults, real
//    estate scams, false nobility, forgeries, counterfeiting, hunting down
//    rogue adventurers. (Bonus is about exercising good judgement)"
//
// And their three rulings on how, taken in this round:
//   - the bonus is judged on THE EVIDENCE YOU ACTUALLY COLLECTED;
//   - the statements come from NAMED WITNESSES placed for the case;
//   - a wrong verdict CHANGES THE WORLD, quietly.
//
// ---------------------------------------------------------------------------
// WHY A CASE IS NOT A QUEST WITH A QUIZ AT THE END
// ---------------------------------------------------------------------------
// The tempting build is: walk to three markers, collect three flags, then pick
// the right radio button. That is a quest with a quiz, and it fails the user's
// own word for this tier -- "judgement" -- because nothing about it is a
// judgement. What makes it one is that THE STATEMENTS DISAGREE. Every case
// below has witnesses whose accounts cannot all be true, and the player's job
// is to work out which account the others corroborate.
//
// So each case carries:
//
//   truth     -- what actually happened. Fixed, authored, never rolled: a case
//                whose answer moved would make the whole tier arbitrary.
//   supports  -- the clue ids that point at the truth. THESE ARE WHAT THE BONUS
//                IS PAID ON, together with the verdict.
//   red       -- the clue ids that point somewhere else, and are not lies. A
//                witness who is mistaken, or frightened, or protecting the
//                wrong person, is the whole substance of a political contract.
//
// THE BONUS RULE, stated once: the contract pays for a verdict; the BONUS pays
// only when the verdict is right AND every supporting statement was actually
// collected. A player who guesses correctly is paid for the work and not for
// the judgement, which is exactly the distinction the user asked for. This is
// asserted in `caseFaults` rather than trusted, because it is the one rule the
// whole tier rests on.
//
// ---------------------------------------------------------------------------
// WHAT A WRONG VERDICT COSTS
// ---------------------------------------------------------------------------
// Two things, and they are deliberately small:
//
//   1. SOMEBODY IS STANDING IN THE CAPITAL because of what you decided. A named
//      person with a line about what came of it -- the forger's apprentice with
//      no shop to go back to, the cultist's neighbour who is still waiting. They
//      are permanent and the Society never points at them.
//   2. THE SOCIETY STOPS EXTENDING CREDIT. The member's discount (round 94) is
//      withheld until you get a case right. Mechanical, cheap, and exactly what
//      a Society with standards would do about an adventurer whose judgement it
//      no longer trusts.
//
// What it deliberately does NOT cost is a star. That was considered and
// rejected: the re-grade is the Society's own measure of your RANK, and
// spending it on one judgement call would make a wrong answer cost a whole
// rank's worth of contracts -- which reads as unfair rather than as
// consequential, and would push players toward reloading rather than living
// with it.
//
// AND THE SOCIETY NEVER TELLS YOU. `outcome.line` is what the Society says, and
// for a wrong verdict it is always something that accepts the answer. Finding
// out you were wrong is the player noticing the person in the square, which is
// the only version of this that is worth building.
// ===========================================================================

import { CULT_BY_SLUG } from './cultists.js';

/** The six kinds the user named, in their order. `slug` is the case's id and
 *  the key everything looks one up by. */
export const CASE_KINDS = ['cult', 'estate', 'nobility', 'forgery', 'coin', 'rogue'];

/** Where a witness stands. Three places, and every case uses all three, so an
 *  investigation is a journey rather than three conversations in a square --
 *  the same shape the second star's three kinds have.
 *
 *    board  -- at the Adventure Society board the contract was taken from
 *    site   -- at a named landmark in the region
 *    town   -- at another settlement in the region
 */
export const WITNESS_PLACES = ['board', 'site', 'town'];

/**
 * THE SIX CASES.
 *
 * Each is authored end to end: the premise the board prints, three or four
 * witnesses with a statement each, two or three verdicts, one truth, and what
 * the world looks like afterwards either way.
 *
 * `rank` is the lowest rank the Society will post this case at. It rises across
 * the six, so the tier has a shape -- a neighbour dispute over a deed is Iron
 * work and a chapter house full of cultists is not.
 */
export const CASES = [
  // -------------------------------------------------------------------------
  {
    slug: 'cult', kind: 'A hidden cult', rank: 'bronze',
    title: 'The Question of the Almsgate',
    premise: 'A charitable house on the Almsgate takes in the destitute and asks nothing. '
      + 'Three of the people it took in are not in it any more and are not anywhere else either. '
      + 'The Society wants to know what the house is, before it decides whether the house is a problem.',
    cult: 'bone',
    witnesses: [
      { id: 'almoner', name: 'Sister Ordell', role: 'the almoner', place: 'board',
        line: 'We take in whoever comes and we bury whoever dies, and the poor die, and that is the '
          + 'whole of it. Count the graves if you like. I keep the book.',
        clue: 'book' },
      { id: 'digger', name: 'Hask Verrick', role: 'the gravedigger', place: 'site',
        line: 'I dug fourteen this season and the book says fourteen. What the book does not say is '
          + 'that three of them went in light. I have carried bodies twenty years. I know what a full '
          + 'box weighs.',
        clue: 'weight' },
      { id: 'sister', name: 'Perrin Loam', role: 'a lodger\'s sister', place: 'town',
        line: 'My brother went in there thin and came out fed, and then he stopped coming out. '
          + 'The last thing he said to me was that they had found something under the floor and it was '
          + 'older than the house.',
        clue: 'floor' },
      { id: 'clerk', name: 'Ivo Thack', role: 'a Society clerk', place: 'board',
        line: 'The house pays its dues and files its returns and I have no complaint on paper. '
          + 'I will say that the returns are in a different hand every quarter, and that a charitable '
          + 'house does not usually change clerks four times a year.',
        clue: 'hands' },
    ],
    clues: {
      book: 'Sister Ordell keeps a burial book, and it balances.',
      weight: 'Three of this season\'s coffins went into the ground far too light to have held anybody.',
      floor: 'A lodger told his sister they had found something under the floor, older than the house.',
      hands: 'The house\'s returns are filed in a different hand every quarter.',
    },
    verdicts: [
      { id: 'cult', label: 'The house is a cult and the missing are theirs',
        desc: 'Report the Almsgate as a chapter of the Pale Order and name the ossuary beneath it.' },
      { id: 'charity', label: 'The house is what it says it is',
        desc: 'Report no finding. The dead are the poor, and the poor die.' },
      { id: 'almoner', label: 'The almoner is selling the bodies',
        desc: 'Report Sister Ordell for trafficking in corpses and let the house continue.' },
    ],
    truth: 'cult',
    supports: ['weight', 'floor'],
    red: ['book', 'hands'],
    outcomes: {
      cult: {
        right: true,
        line: 'The Pale Order will deny every word of this and I will file it anyway. Good.',
        fallout: null,
      },
      charity: {
        line: 'No finding. The house continues. That is a clean report and I will take it.',
        fallout: {
          who: 'Perrin Loam', role: 'still waiting at the Almsgate',
          say: 'They told me there was no finding. I go up there most days now. '
            + 'Somebody has to be standing outside when he comes out.',
        },
      },
      almoner: {
        line: 'The almoner, then. She will hang and the house will find another. Filed.',
        fallout: {
          who: 'Sister Ordell\'s successor', role: 'the new almoner at the Almsgate',
          say: 'Ordell is dead and the house is fuller than it was. We are very grateful to the '
            + 'Society for its attention. We hope for more of it.',
        },
      },
    },
  },

  // -------------------------------------------------------------------------
  {
    slug: 'estate', kind: 'A real estate scam', rank: 'iron',
    title: 'The Matter of the Ashfield Deeds',
    premise: 'Eleven families on the Ashfield have been sold the land they were already living on. '
      + 'The seller has a deed, the families have receipts, and the Society has been asked to say '
      + 'which piece of paper is the real one before somebody is burned out over it.',
    witnesses: [
      { id: 'agent', name: 'Corrin Poll', role: 'the land agent', place: 'board',
        line: 'I sold what I was given to sell, at the price I was given, and I have the seal on it. '
          + 'If the seal is bad then I was robbed as well and I would like that on the record too.',
        clue: 'seal' },
      { id: 'farmer', name: 'Maud Grange', role: 'one of the eleven', place: 'town',
        line: 'My family has worked that field for sixty years and never once held a paper for it. '
          + 'That is the whole trick, is it not. You cannot lose a deed you never had.',
        clue: 'never' },
      { id: 'scribe', name: 'Anse Quill', role: 'the registry scribe', place: 'site',
        line: 'The Ashfield entry was written in this year\'s ink on last year\'s page. I noticed '
          + 'because the page was already full and somebody made room. I have not told anyone that '
          + 'and I would rather it was not me who did.',
        clue: 'ink' },
      { id: 'lord', name: 'Steward Ruell', role: 'the estate\'s steward', place: 'board',
        line: 'The house has never sold the Ashfield and would not. Whoever holds that seal did not '
          + 'get it from us. I am told the seal is genuine, which is the part I cannot explain.',
        clue: 'steward' },
    ],
    clues: {
      seal: 'The agent\'s deed carries a seal he believes to be genuine.',
      never: 'The eleven families have worked the Ashfield for generations and never held a deed.',
      ink: 'The registry entry for the Ashfield is this year\'s ink on last year\'s page.',
      steward: 'The estate says it never sold the Ashfield, and cannot explain the seal.',
    },
    verdicts: [
      { id: 'registry', label: 'The registry entry is forged',
        desc: 'Report that the deed was written into the register after the fact; the families hold the land.' },
      { id: 'agent', label: 'The agent forged the deed',
        desc: 'Report Corrin Poll as the forger and let the register stand.' },
      { id: 'valid', label: 'The sale is good',
        desc: 'Report the deed as sound. The families bought what they were already standing on, and that is their affair.' },
    ],
    truth: 'registry',
    supports: ['ink', 'steward'],
    red: ['seal', 'never'],
    outcomes: {
      registry: {
        right: true,
        line: 'Somebody made room on a full page. That is the sentence I will be quoting. Filed.',
        fallout: null,
      },
      agent: {
        line: 'The agent, then. Neat, and it closes. Filed.',
        fallout: {
          who: 'Anse Quill', role: 'formerly of the registry',
          say: 'They hanged the agent and left the page alone. I still work beside that page. '
            + 'Whoever made room on it is still able to make room on it.',
        },
      },
      valid: {
        line: 'The sale stands. Eleven families the poorer and nothing the Society need do. Filed.',
        fallout: {
          who: 'Maud Grange', role: 'off the Ashfield',
          say: 'We paid for our own field and then we paid rent on it, and the Society looked at the '
            + 'paper and said the paper was fine. It was fine. That was never the question.',
        },
      },
    },
  },

  // -------------------------------------------------------------------------
  {
    slug: 'nobility', kind: 'False nobility', rank: 'silver',
    title: 'A Question of the Verrick Line',
    premise: 'A man has arrived with a name three generations dead and the manners to carry it, and '
      + 'the district has begun treating him as what he says he is. The Society has been asked '
      + 'privately whether he is, and rather less privately what it intends to do about the answer.',
    witnesses: [
      { id: 'claimant', name: 'Dunn Verrick', role: 'the claimant', place: 'board',
        line: 'My grandmother was put out of that house for marrying badly and I was raised on the '
          + 'story of it. I am not asking to be believed. I am asking to be looked into, which is not '
          + 'a thing an impostor asks for.',
        clue: 'invites' },
      { id: 'archivist', name: 'Bel Coombe', role: 'the district archivist', place: 'site',
        line: 'There was a daughter put out, and the entry for her is scratched through rather than '
          + 'struck. Scratching through is what you do when you intend to come back and argue about '
          + 'it. Somebody meant to undo that and never did.',
        clue: 'scratch' },
      { id: 'servant', name: 'Old Marda', role: 'the last of the household staff', place: 'town',
        line: 'He has the nose and he has the hands and he holds a cup like they all did, and none of '
          + 'that is worth a copper because I have been wrong about a face before. What I will say is '
          + 'that he knew where the back stair was, and there has been no back stair for forty years.',
        clue: 'stair' },
      { id: 'rival', name: 'Sable Verrick', role: 'the sitting heir', place: 'board',
        line: 'The man is a fraud and I will pay whatever it costs to have that written down. '
          + 'I would rather you did not look at the archive. It is in poor order and it will only '
          + 'confuse the matter.',
        clue: 'rival' },
    ],
    clues: {
      invites: 'The claimant asked to be investigated rather than believed.',
      scratch: 'The disinherited daughter\'s entry was scratched through, not struck out.',
      stair: 'He knew where a back stair was that has not existed for forty years.',
      rival: 'The sitting heir offered to pay for a finding, and asked that the archive not be read.',
    },
    verdicts: [
      { id: 'true', label: 'The claim is genuine',
        desc: 'Report Dunn Verrick as of the line, and the disinheritance as never completed.' },
      { id: 'false', label: 'The claim is false',
        desc: 'Report him as an impostor. The sitting heir keeps the house.' },
      { id: 'quiet', label: 'Report nothing either way',
        desc: 'Tell the Society the question cannot be settled. Both men keep what they are holding.' },
    ],
    truth: 'true',
    supports: ['scratch', 'stair'],
    red: ['invites', 'rival'],
    outcomes: {
      true: {
        right: true,
        line: 'A scratch rather than a stroke. Forty years and it came down to a pen. Filed.',
        fallout: null,
      },
      false: {
        line: 'An impostor. The house is content and so is the district. Filed.',
        fallout: {
          who: 'Old Marda', role: 'lately of the Verrick house',
          say: 'They put him out on the road and the young one paid me off for my trouble. '
            + 'He knew about the back stair. I have thought about that every day since.',
        },
      },
      quiet: {
        line: 'Unsettled, then. That is an honest answer and it will satisfy nobody. Filed.',
        fallout: {
          who: 'Dunn Verrick', role: 'still waiting on a finding',
          say: 'Unsettled. I asked to be looked into and I was, and the finding is that nobody '
            + 'will say. I am told that is not the same as being called a liar.',
        },
      },
    },
  },

  // -------------------------------------------------------------------------
  {
    slug: 'forgery', kind: 'Forgeries', rank: 'bronze',
    title: 'The Provenance of the Kelleth Blades',
    premise: 'Four blades have come to market bearing a dead smith\'s mark and one of them has '
      + 'already failed in somebody\'s hand. The Society is less interested in who made them than in '
      + 'who has been vouching for them, and would like that established before it says so out loud.',
    witnesses: [
      { id: 'smith', name: 'Wick Dunmore', role: 'the smith who sold them', place: 'board',
        line: 'I bought them as Kelleth and I sold them as Kelleth and I would buy them again. '
          + 'The mark is right. I have held real ones. The mark is right.',
        clue: 'mark' },
      { id: 'buyer', name: 'Nesh Ryde', role: 'the man whose blade failed', place: 'town',
        line: 'It came apart at the tang and it took two of my fingers with it. A Kelleth does not '
          + 'come apart at the tang. Whatever that was, it was folded twice and called seven.',
        clue: 'tang' },
      { id: 'appraiser', name: 'Fen Ashby', role: 'the guild appraiser', place: 'site',
        line: 'I certified all four and I would certify them again on what I was shown. What I was '
          + 'shown was the mark and the edge. Nobody asked me to look at the tang and I did not.',
        clue: 'certified' },
      { id: 'widow', name: 'Ilsa Kelleth', role: 'the smith\'s widow', place: 'town',
        line: 'My husband stamped the mark last, after the temper, and he stamped it cold. '
          + 'Anything with that mark struck hot was not struck by him. You can see it if you know '
          + 'to look, and almost nobody knows to look.',
        clue: 'cold' },
    ],
    clues: {
      mark: 'The selling smith is certain the mark is genuine, and has handled real ones.',
      tang: 'The failed blade came apart at the tang, which a real Kelleth does not do.',
      certified: 'The guild appraiser certified all four on the mark and the edge alone.',
      cold: 'Kelleth struck his mark cold, after the temper. These were struck hot.',
    },
    verdicts: [
      { id: 'forged', label: 'The blades are forged and the appraiser is the door',
        desc: 'Report the mark as struck hot and the certification as the thing that let them through.' },
      { id: 'smith', label: 'The selling smith made them',
        desc: 'Report Wick Dunmore as the forger, and the certification as sound.' },
      { id: 'unlucky', label: 'One bad blade, honestly sold',
        desc: 'Report no forgery. Steel fails; a man lost two fingers; nobody is a criminal.' },
    ],
    truth: 'forged',
    supports: ['cold', 'tang'],
    red: ['mark', 'certified'],
    outcomes: {
      forged: {
        right: true,
        line: 'Struck hot. That is a fact a court can hold, which is more than I usually get. Filed.',
        fallout: null,
      },
      smith: {
        line: 'Dunmore, then. The guild will be relieved it was a smith and not a clerk. Filed.',
        fallout: {
          who: 'Fen Ashby', role: 'still certifying at the guild',
          say: 'They took the smith. I am still the man who signs the paper, and I still sign it on '
            + 'the mark and the edge. Nobody has asked me to change anything.',
        },
      },
      unlucky: {
        line: 'Bad steel and bad luck. It is the finding that starts the fewest fires. Filed.',
        fallout: {
          who: 'Nesh Ryde', role: 'who lost two fingers to a Kelleth',
          say: 'Bad luck, the finding says. There are three more of them out there being bad luck '
            + 'at somebody. I would have liked a different word.',
        },
      },
    },
  },

  // -------------------------------------------------------------------------
  {
    slug: 'coin', kind: 'Counterfeiting', rank: 'silver',
    title: 'The Weight of the Cadence Iron',
    premise: 'Iron-rank coin is coming back light across three markets and the traders have started '
      + 'refusing it on sight, which is a currency problem becoming a riot problem. The Society '
      + 'wants a name before the traders find one themselves.',
    witnesses: [
      { id: 'trader', name: 'Kell Marsh', role: 'a market trader', place: 'board',
        line: 'It is the Fenn Cross coin. Every light piece I have taken came off somebody who came '
          + 'up the Fenn Cross road, and I have taken a great many. I will not be told that is a '
          + 'coincidence.',
        clue: 'road' },
      { id: 'assayer', name: 'Tam Hax', role: 'the assayer', place: 'site',
        line: 'They are not underweight. They are the right weight and the wrong metal -- there is '
          + 'lead in the core and good iron on the skin, and the skin is thick enough to bite '
          + 'through. Somebody had a press before they had the alloy.',
        clue: 'lead' },
      { id: 'carter', name: 'Ovry Stray', role: 'a carter on the Fenn Cross road', place: 'town',
        line: 'I carry for everyone and I am carrying the blame for it. If the coin came up my road '
          + 'it came up my road in somebody\'s purse, same as everything else does.',
        clue: 'carter' },
      { id: 'mintclerk', name: 'Sable Weld', role: 'a clerk of the mint', place: 'board',
        line: 'We struck four thousand iron this quarter and the ledger says four thousand. What the '
          + 'ledger does not account for is a die that came back to the rack with wear on it that '
          + 'nobody worked. A die does not tire in a cupboard.',
        clue: 'die' },
    ],
    clues: {
      road: 'Every light coin one trader took came off the Fenn Cross road.',
      lead: 'The coins are the right weight and the wrong metal: lead cored, iron skinned.',
      carter: 'The carter says coin travels his road in purses like everything else.',
      die: 'A mint die came back to the rack worn by work nobody recorded.',
    },
    verdicts: [
      { id: 'mint', label: 'It is coming out of the mint',
        desc: 'Report that a mint die is being worked off the books, and that the press is the Society\'s own city.' },
      { id: 'road', label: 'It is coming up the Fenn Cross road',
        desc: 'Report a counterfeiting operation outside the city and let the traders have the road.' },
      { id: 'carter', label: 'The carter is running them',
        desc: 'Report Ovry Stray. He is on the road, the coin is on the road, and the market wants a name.' },
    ],
    truth: 'mint',
    supports: ['lead', 'die'],
    red: ['road', 'carter'],
    outcomes: {
      mint: {
        right: true,
        line: 'Our own mint. I will need to be very careful about who I hand this to. Filed.',
        fallout: null,
      },
      road: {
        line: 'Outside the walls, then. Everyone will be pleased about that. Filed.',
        fallout: {
          who: 'Tam Hax', role: 'lately the assayer',
          say: 'Lead cored, iron skinned, off a die that tires in a cupboard. They wrote it down as '
            + 'a road problem. I am not the assayer any more.',
        },
      },
      carter: {
        line: 'The carter. The market has its name and the market will settle. Filed.',
        fallout: {
          who: 'Ovry Stray\'s daughter', role: 'who now drives the cart',
          say: 'They took my father for it and the light coin never stopped coming. '
            + 'I drive the same road. Nobody has asked me anything.',
        },
      },
    },
  },

  // -------------------------------------------------------------------------
  {
    slug: 'rogue', kind: 'A rogue adventurer', rank: 'gold',
    title: 'What Became of Hale Verrick',
    premise: 'A Society member of long standing has stopped filing, stopped answering, and been seen '
      + 'twice in places where people afterwards were not. The Society investigates its own before '
      + 'anybody else gets the chance to, and it would prefer to know what it is dealing with.',
    witnesses: [
      { id: 'partner', name: 'Marda Fenn', role: 'his old contract partner', place: 'board',
        line: 'He was the most careful man I ever worked beside. He filed on the day, every time, for '
          + 'nine years. Whatever this is, it is not him deciding to be a criminal. He would have '
          + 'filed the paperwork on that too.',
        clue: 'careful' },
      { id: 'survivor', name: 'Bel Ryde', role: 'the one who walked away', place: 'town',
        line: 'He did not look at us. He walked through the camp and he did not look at any of us, '
          + 'and when he had gone the others were on the ground. His eyes were the wrong colour and '
          + 'he was talking to somebody who was not there.',
        clue: 'eyes' },
      { id: 'priest', name: 'Brother Ovry', role: 'a temple almoner', place: 'site',
        line: 'A man of that description came to us four months ago and asked whether an essence can '
          + 'be taken back out. We told him no. He asked twice more and then he stopped coming.',
        clue: 'essence' },
      { id: 'clerk', name: 'Ilsa Barrow', role: 'the filing clerk', place: 'board',
        line: 'His last three returns are in order and in his hand and they are dated after the first '
          + 'sighting. I have checked them against nine years of his writing. They are his.',
        clue: 'returns' },
    ],
    clues: {
      careful: 'He filed on the day, every time, for nine years.',
      eyes: 'A survivor describes wrong-coloured eyes and a man talking to somebody absent.',
      essence: 'He asked a temple three times whether an essence can be taken back out.',
      returns: 'His last three returns are genuinely his, and dated after the first sighting.',
    },
    verdicts: [
      { id: 'ridden', label: 'He is not in control of himself',
        desc: 'Report that something is wearing him, and ask for a retrieval rather than a hunt.' },
      { id: 'rogue', label: 'He has gone rogue',
        desc: 'Report him as an adventurer turned criminal. The Society will post a contract on one of its own.' },
      { id: 'framed', label: 'Somebody is using his name',
        desc: 'Report the sightings as an impostor trading on a member\'s standing.' },
    ],
    truth: 'ridden',
    supports: ['eyes', 'essence'],
    red: ['careful', 'returns'],
    outcomes: {
      ridden: {
        right: true,
        line: 'A retrieval. I have not been able to write that word about a member in eleven years. Filed.',
        fallout: null,
      },
      rogue: {
        line: 'Rogue, then. I will post it tonight and I will not enjoy it. Filed.',
        fallout: {
          who: 'Marda Fenn', role: 'who worked nine years beside him',
          say: 'They posted a contract on him and somebody collected it. '
            + 'Whatever was doing the talking through him did not die with him. It went somewhere.',
        },
      },
      framed: {
        line: 'An impostor. That is the finding this Society would most like to be true. Filed.',
        fallout: {
          who: 'Bel Ryde', role: 'the one who walked away',
          say: 'An impostor, they told me. I know what I saw and I know whose face it was on. '
            + 'He is still out there being an impostor at somebody.',
        },
      },
    },
  },
];

export const CASE_BY_SLUG = Object.fromEntries(CASES.map(c => [c.slug, c]));
export const CASE_SLUGS = CASES.map(c => c.slug);

/** How many statements a case has to gather to be reportable AT ALL. Two, and
 *  deliberately fewer than the four available: a player may report on partial
 *  evidence, and that is where a wrong verdict comes from. A case that demanded
 *  every statement before letting you decide would be a corridor. */
export const MIN_STATEMENTS = 2;

/**
 * What a case is worth on top of the ordinary third-star pay. Political work is
 * not more dangerous, it is more consequential, and the purse says so.
 *
 * ROUND 97 -- THIS NUMBER NO LONGER MULTIPLIES ANYTHING, AND THAT IS ON PURPOSE.
 *
 * It was applied at one branch of the offer builder, to a payout derived from
 * the quarry's xp. Round 97 moved pricing out of the branches entirely: a
 * contract is priced by (rank, star), and where it falls inside that band comes
 * from `CONTRACT_EFFORT` in contracts.js, where `case` now sits at the top of
 * the table -- above `relic`, which used to hold it.
 *
 * The constant stays because the CLAIM is still this file's to make and its
 * fault check is still the one that catches the claim being broken; it is read
 * by contracts.js's own assertion that nothing is priced at or above a case.
 * Kept as a number rather than deleted so that assertion has a stated intent to
 * check against rather than only checking the table against itself.
 */
export const CASE_PAY_MULT = 1.35;

/** THE JUDGEMENT. The user's ruling, as a function.
 *
 *  Right verdict AND the supporting evidence in hand. A lucky guess pays the
 *  contract and never the bonus, which is the whole distinction the third
 *  star's bonus is for. */
export function judgementMet(caseDef, verdictId, heldClues) {
  if (!caseDef || !verdictId) return false;
  if (verdictId !== caseDef.truth) return false;
  const held = new Set(heldClues || []);
  return (caseDef.supports || []).every(c => held.has(c));
}

/** May a verdict be given at all? */
export function canReportCase(caseDef, heldClues) {
  return (heldClues || []).length >= MIN_STATEMENTS;
}

/** What the Society says back. Always accepting -- see the header: it never
 *  tells you that you were wrong. */
export function outcomeFor(caseDef, verdictId) {
  return (caseDef && caseDef.outcomes && caseDef.outcomes[verdictId]) || null;
}

/** Was this verdict the true one? Separate from `judgementMet` on purpose:
 *  the WORLD reacts to whether you were right, and the BONUS reacts to whether
 *  you were right for a reason. */
export function verdictIsTrue(caseDef, verdictId) {
  return !!caseDef && verdictId === caseDef.truth;
}

/** The player's case record. A plain field, so saves.js carries it with no save
 *  code -- the same reason `godChains` and `societyCredit` needed none. */
export const CASE_FLAG = 'cases';
export function newCaseRecord() {
  return { closed: [], fallout: [], trusted: true };
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------
// Every rule this tier rests on is a promise made in a table, and the two that
// matter most -- that the evidence actually points at the truth, and that the
// distractors do not -- are exactly the kind of thing that reads fine and is
// wrong.

export function caseFaults() {
  const out = [];
  const seen = new Set();
  for (const c of CASES) {
    if (seen.has(c.slug)) out.push(`duplicate case slug ${c.slug}`);
    seen.add(c.slug);
    if (!CASE_KINDS.includes(c.slug)) out.push(`${c.slug} is not one of the six kinds asked for`);
    for (const f of ['kind', 'title', 'premise', 'rank', 'truth']) {
      if (!c[f]) out.push(`${c.slug} has no ${f}`);
    }
    if (!['normal', 'iron', 'bronze', 'silver', 'gold'].includes(c.rank)) {
      out.push(`${c.slug} has an odd rank ${c.rank}`);
    }
    if (c.rank === 'diamond') out.push(`${c.slug} is a diamond-rank case`);
    if (c.cult && !CULT_BY_SLUG[c.cult]) out.push(`${c.slug} names unknown cult ${c.cult}`);

    // --- the witnesses ----------------------------------------------------
    const ws = c.witnesses || [];
    if (ws.length < 3) out.push(`${c.slug} has ${ws.length} witnesses -- too few to disagree`);
    const wid = new Set(), places = new Set();
    for (const w of ws) {
      if (wid.has(w.id)) out.push(`${c.slug} has two witnesses called ${w.id}`);
      wid.add(w.id);
      places.add(w.place);
      if (!WITNESS_PLACES.includes(w.place)) out.push(`${c.slug}'s ${w.id} stands nowhere (${w.place})`);
      for (const f of ['name', 'role', 'line', 'clue']) {
        if (!w[f]) out.push(`${c.slug}'s ${w.id} has no ${f}`);
      }
      if (w.clue && !c.clues[w.clue]) out.push(`${c.slug}'s ${w.id} gives unknown clue ${w.clue}`);
      // A statement is a person talking, not a summary. Anything short enough
      // to be a label is a witness who has not been written.
      if (w.line && w.line.length < 80) out.push(`${c.slug}'s ${w.id} says almost nothing`);
    }
    // AN INVESTIGATION IS A JOURNEY. Every case must send the player to all
    // three places, or a case is three conversations in one square.
    for (const p of WITNESS_PLACES) {
      if (!places.has(p)) out.push(`${c.slug} sends nobody to the ${p}`);
    }

    // --- the evidence -----------------------------------------------------
    const clueIds = Object.keys(c.clues || {});
    if (clueIds.length !== ws.length) {
      out.push(`${c.slug} has ${clueIds.length} clues for ${ws.length} witnesses`);
    }
    const given = new Set(ws.map(w => w.clue));
    for (const id of clueIds) if (!given.has(id)) out.push(`${c.slug}'s clue ${id} is given by nobody`);
    for (const id of clueIds) {
      if (!c.clues[id] || c.clues[id].length < 30) out.push(`${c.slug}'s clue ${id} says almost nothing`);
    }

    // --- the verdicts -----------------------------------------------------
    const vs = c.verdicts || [];
    if (vs.length < 2) out.push(`${c.slug} offers ${vs.length} verdicts -- that is not a decision`);
    const vid = new Set();
    for (const v of vs) {
      if (vid.has(v.id)) out.push(`${c.slug} has two verdicts called ${v.id}`);
      vid.add(v.id);
      if (!v.label || !v.desc) out.push(`${c.slug}'s verdict ${v.id} is not written`);
      // The naming rule: the label carries the finding, the description states
      // plainly what reporting it does.
      if (v.desc && v.desc.length < 40) out.push(`${c.slug}'s verdict ${v.id} does not say what it does`);
    }
    if (!vid.has(c.truth)) out.push(`${c.slug}'s truth ${c.truth} is not one of its verdicts`);
    // EVERY VERDICT HAS AN OUTCOME, or a player can pick an ending that does
    // not exist and the Society says nothing back.
    for (const v of vs) {
      const o = outcomeFor(c, v.id);
      if (!o) { out.push(`${c.slug} has no outcome for ${v.id}`); continue; }
      if (!o.line) out.push(`${c.slug}'s ${v.id} outcome says nothing`);
      // The Society never tells you that you were wrong -- so no outcome line
      // may contain the word. Asserted because it is a rule about tone, and a
      // rule about tone is exactly what drifts when a seventh case is added.
      if (/\bwrong\b|\bmistaken\b|\bincorrect\b/i.test(o.line || '')) {
        out.push(`${c.slug}'s ${v.id} outcome tells the player they were wrong`);
      }
      const isTrue = v.id === c.truth;
      if (isTrue && o.fallout) out.push(`${c.slug}'s true verdict still costs somebody`);
      if (!isTrue && !o.fallout) out.push(`${c.slug}'s ${v.id} verdict changes nothing`);
      if (o.fallout) {
        for (const f of ['who', 'role', 'say']) {
          if (!o.fallout[f]) out.push(`${c.slug}'s ${v.id} fallout has no ${f}`);
        }
        if (o.fallout.say && o.fallout.say.length < 60) {
          out.push(`${c.slug}'s ${v.id} fallout says almost nothing`);
        }
      }
    }

    // --- THE RULE THE WHOLE TIER RESTS ON ---------------------------------
    // The supporting evidence must exist, must be gatherable, and must not be
    // the same set as the distractors. And the distractors must exist too: a
    // case where every statement points at the truth is a case with no
    // judgement in it.
    const sup = c.supports || [], red = c.red || [];
    if (sup.length < 2) out.push(`${c.slug}'s truth rests on ${sup.length} statement(s)`);
    if (!red.length) out.push(`${c.slug} has no statement pointing anywhere but the truth`);
    for (const id of sup) if (!c.clues[id]) out.push(`${c.slug} supports its truth with unknown clue ${id}`);
    for (const id of red) if (!c.clues[id]) out.push(`${c.slug} misdirects with unknown clue ${id}`);
    for (const id of sup) if (red.includes(id)) out.push(`${c.slug}'s ${id} both supports and misdirects`);
    // Every clue is one or the other. A clue that is neither is a statement the
    // player collects and cannot use, which reads as a bug.
    for (const id of clueIds) {
      if (!sup.includes(id) && !red.includes(id)) out.push(`${c.slug}'s clue ${id} points nowhere`);
    }
    // ...and the bonus rule itself, measured rather than trusted.
    if (judgementMet(c, c.truth, [])) out.push(`${c.slug} pays its bonus on no evidence at all`);
    if (judgementMet(c, c.truth, red)) out.push(`${c.slug} pays its bonus on the wrong evidence`);
    if (!judgementMet(c, c.truth, sup)) out.push(`${c.slug} does not pay its bonus on its own evidence`);
    for (const v of vs) {
      if (v.id === c.truth) continue;
      if (judgementMet(c, v.id, clueIds)) out.push(`${c.slug} pays its bonus for the verdict ${v.id}`);
    }
    // A player must be able to report before they have everything, or the case
    // is a corridor with one exit.
    if (!canReportCase(c, sup)) out.push(`${c.slug} cannot be reported on its own supporting evidence`);
    if (canReportCase(c, [])) out.push(`${c.slug} can be reported before anybody has been spoken to`);
  }

  // The user named six kinds. All six, and no seventh smuggled in.
  if (CASES.length !== CASE_KINDS.length) {
    out.push(`${CASES.length} cases for the ${CASE_KINDS.length} kinds asked for`);
  }
  for (const k of CASE_KINDS) if (!CASE_BY_SLUG[k]) out.push(`no case for ${k}`);
  // The tier should have a shape rather than six cases at one rank.
  if (new Set(CASES.map(c => c.rank)).size < 3) out.push('every case is graded at the same rank');
  // Two cases whose truth rests on the same clue ids would be two cases that
  // play the same way.
  const sigs = new Map();
  for (const c of CASES) {
    const sig = (c.supports || []).slice().sort().join('+');
    if (sigs.has(sig)) out.push(`${c.slug} and ${sigs.get(sig)} rest on the same evidence`);
    sigs.set(sig, c.slug);
  }
  if (MIN_STATEMENTS < 1) out.push('a case can be reported without speaking to anybody');
  if (CASE_PAY_MULT <= 1) out.push('political work pays no more than ordinary work');
  return out;
}

export function caseCensus() {
  return {
    cases: CASES.length,
    witnesses: CASES.reduce((n, c) => n + c.witnesses.length, 0),
    clues: CASES.reduce((n, c) => n + Object.keys(c.clues).length, 0),
    verdicts: CASES.reduce((n, c) => n + c.verdicts.length, 0),
    fallouts: CASES.reduce((n, c) => n
      + c.verdicts.filter(v => (outcomeFor(c, v.id) || {}).fallout).length, 0),
    ranks: [...new Set(CASES.map(c => c.rank))],
  };
}
