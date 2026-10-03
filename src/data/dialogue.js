// ===========================================================================
// ROUND 208 -- A CONVERSATION, NOT A LINE.
//
// The user, with a screenshot of the Elder Scrolls dialogue panel:
//
//   2.1 "NPCs should have a simple version of an elder scrolls dialogue
//        system"
//   2.2 "You interact and they have a semi unique greeting"
//   2.3 "Then you have 3-5 dialogue options"
//   2.4 "The wording needs to sound like human dialogue."
//   2.5 "A goodbye option should always be at the bottom of the list"
//
// WHAT WAS THERE BEFORE. An NPC carried one string, `dialogue`, and
// `_openDialogue(name, text, npc, choices)` printed it with a row of buttons
// whose `act` strings were resolved by a forty-branch if-else in WorldScene.
// Every conversation in the game that had a choice at all -- the god's offer,
// the farm job, the recruitment -- was a hand-wired special case, and there
// was no way to ask anyone a question.
//
// So this file is a TREE, and the scene walks it. The forty-branch chain is
// untouched: those conversations are scripted set-pieces and they still work
// exactly as they did. What is new sits beside it.
//
// ---------------------------------------------------------------------------
// THE SHAPE OF A TOPIC.
//
//   { label, say, children, when }
//
//   label     what the PLAYER says, as it appears in the list
//   say       what the NPC says back -- an array, see below
//   children  topic ids this one opens onto
//   when      optional (ctx) => boolean; a topic nobody can reach yet
//
// `say` IS AN ARRAY AND THE PICK IS SEEDED OFF THE SPEAKER. This is the whole
// of rule 2.4 in one decision. A single string per topic means every farmer in
// Pallimustus answers "ask about monsters" with the same twelve words, which
// is not human dialogue however well those words are chosen -- it is a sign
// nailed to a person. Keyed on the NPC's name, so one villager always answers
// the same way (they have a view, and it does not change between visits) and
// the next villager answers differently.
//
// The variants are also deliberately not paraphrases of each other. Three
// people asked about the missing give three different pieces of a thing none
// of them can see whole, which is how rumour actually works and is what makes
// 2.3.1.1 land without anyone delivering a briefing.
// ===========================================================================

/** Stable, seeded off the speaker AND the topic, so one person's answers are
 *  consistent with each other and two people's differ. */
export function pickFor(name, topicId, n) {
  if (!n) return 0;
  let h = 2166136261;
  const s = `${name || '?'}|${topicId}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % n;
}

// ===========================================================================
// THE STANDARD TREE.
//
// The user's own outline, followed branch for branch. Their indentation is
// the nesting; their wording is the topic.
// ===========================================================================

// ===========================================================================
// ROUND 210 -- A VOICE, NOT A STYLE.
//
// The user, reading round 209's shipped lines:
//
//   "Lets run a pass on dialogue to review it it all sounds AI generated
//    instead of like dialogue. This cadence 'Research writes things down so
//    someone else can repeat them. They write things down so nobody can' is
//    very overtly AI sounding. A NPC should have their own voice in a sense."
//
// Correct, and measuring it was worse than reading it. A detector over the
// 134 shipped lines: 34% tripped at least one tell, and 39 of them ended on a
// short reversing sentence -- "Not dying loud -- quiet.", "That's rather my
// point.", "That's not glory, that's arithmetic." Every one of those is the
// SAME rhetorical move, which means every one of 148 townsfolk was me being
// clever in a hat.
//
// THE DEEPER FAULT, which the user's own examples show and the detector
// cannot: everybody I wrote was articulate, and everybody knew something.
// Their remote farmer has not heard of the Division at all --
//
//   "Uhh, can't say I've heard of them. But If they are really helping to
//    draw out essence powers thats good news for all of us aint it."
//
// -- and that is a better line than anything in round 209, because ignorance
// is a character trait and I had not given a single person one.
//
// ---------------------------------------------------------------------------
// SO: VOICES.
//
// Every line is tagged with the kind of person who says it, and an NPC draws
// only from their own. Six, from the user's four examples plus the two the
// catalogue obviously needs:
//
//   rustic  out past the last fence. Dialect, hasn't heard, hopes it's fine.
//   market  town trades and gossip. Hedges, half-believes, trails off.
//   blunt   guard, soldier, labourer. Short. Says how he feels, plainly.
//   devout  temple. Formal, evasive, corrects itself mid-sentence.
//   posh    clerks, nobles, ledgers. Precise, distancing, bureaucratic.
//   weary   old, bereaved, done. Flat and short -- and RATIONED, because it
//           is the voice I default to and the one the complaint was about.
//
// `voiceFor` assigns one per NPC off their role and a hash of their name, so
// two farmers in one village are not the same farmer.
// ===========================================================================

/** A line, and who talks like that. */
const L = (v, t) => ({ v, t });

// ===========================================================================
// ROUND 257 (items 2, 2.1) -- THE SEVENTH VOICE: RESEARCH.
//
// The user, with a screenshot of Wren Ashcombe -- Research Assistant, Division
// of Essence Development -- answering "where are the missing people going?"
// like a woman on a market stall:
//
//   "Department Personnel are answering questions like they are regular
//    townsfolk. This doesn't make sense for a lot of reasons, #1 being they
//    are the ones disappearing people. #2 they should have the voice of
//    researchers."
//
// BOTH HALVES ARE ONE BUG AND IT IS MINE. `greetingRoleFor` reads the fields
// an NPC already carries, and "Wren Ashcombe" carries no word the role tests
// look for -- so she came out `folk`, drew from the folk voice pool, and got
// `market`. Every person in that building was a villager with a different
// sprite.
//
// The voice is the smaller half. The larger half is that the townsfolk lines
// are written by people GUESSING, and the Division is not guessing: they have
// the ledger. A researcher who says "nobody can say" is not in character, she
// is lying, and the difference has to be audible -- which is why their lines
// are deflections with a shape rather than speculation with a hedge.
//
//   research  the Division. Precise, incurious about people, interested in
//             the player as data. Answers the question next to the one asked.
// ===========================================================================
export const VOICES = ['rustic', 'market', 'blunt', 'devout', 'posh', 'weary', 'research'];

export const TOPICS = {
  // --- ASK ABOUT RUMOURS -------------------------------------------------
  rumors: {
    label: 'Heard anything worth hearing?',
    children: ['rumors_missing', 'rumors_outworlder'],
    say: [
      L('rustic', "Out here? Only what the carter tells us and he lies for fun. Ask me about the weather, I'm better on that."),
      L('research', "I hear a great deal and record almost none of it. Rumour has no controls. Ask me something with a number in it."),
      L('rustic', "Ohh, all sorts. None of it worth the breath. Though my wife's cousin swears somethin' went past the barn last month."),
      L('market', "Oh, plenty. Mostly hogwash I bet. Folk do love a story when the stall's quiet."),
      L('market', "Depends who you've been drinking with. I'd not repeat half of it sober."),
      L('blunt', "Some. I don't trade in it much. Ask me something and I'll tell you if I know."),
      L('devout', "Ahh. People bring me a great deal, and I'm meant to keep most of it. Ask, and I'll see what I'm free to say."),
      L('posh', "I hear a good deal. Very little of it survives contact with a ledger. What in particular?"),
      L('weary', "Aye. Nothing good."),
    ],
  },
  rumors_missing: {
    label: 'Who has gone missing?',
    say: [
      L('rustic', "The Ashmere lad, first off. Then his mam when she went lookin'. Folk say monsters but I've farmed that ground thirty year and there's nowt out there."),
      L('research', "I'd have to check the intake log, and I can't show you the intake log. I can tell you the figure the constable gives is low."),
      L('rustic', "Couple from over the ridge. We had a search and everythin'. Never found so much as a hat."),
      L('market', "Four since the spring, if you count the tinker, and I do count the tinker whatever the constable says."),
      L('market', "Oh, I heard some things. Disappearances that don't make much sense to have been monsters, if you take my meaning."),
      L('blunt', "Three on my watch. Wrote them all down as animal attacks because that's what I was told to write."),
      L('blunt', "Too many. And I'll tell you what bothers me, if you want it — whatever's taking them is tidy about it. I've never once been called out to a mess."),
      L('devout', "I have said words over empty ground four times this year. There was nothing under it. I do not know what I was saying them for."),
      L('posh', "Six, by my count, though the official figure is two. The discrepancy is not accidental."),
      L('weary', "My neighbour. Went out to the east field. That's all there is to it."),
    ],
  },
  rumors_outworlder: {
    label: 'People keep staring at me.',
    children: ['rumors_two'],
    say: [
      L('rustic', "Well you would get stared at, wouldn't you. We don't get many. Is it true where you're from there's no magic at all? None? How's anyone manage?"),
      L('research', "Of course they stare. You arrived without a childhood in this world and your essences don't care. That second part is the interesting one and nobody here asks about it."),
      L('rustic', "Sorry. Sorry. It's just we've none of your sort out here and the wife'll want telling."),
      L('market', "Course they do, you're an outworlder. Go on then — say something from over there. I've a bet with my brother."),
      L('market', "Oh, everyone's looking. Half the market reckons you came up out of the ground. I said that's daft. You came in by the road."),
      L('blunt', "You've the walk. Outworlders always look like they're expecting the ground to be a different height."),
      L('devout', "Forgive them. You are a question none of us were taught the answer to, and people stare at questions."),
      L('posh', "You are a novelty, and novelties are stared at. It passes, usually about the time you start owing someone money."),
    ],
  },
  rumors_two: {
    label: 'I hear I am not the only one.',
    say: [
      L('rustic', "So they say! Some woman out the drains in the city. Wife reckons that means a third's comin'. Wife reckons a lot of things."),
      L('research', "Two inside a season, against a historical rate of one in nine years. I've written it up twice. It comes back marked 'no action'."),
      L('market', "The woman out of the sewers, aye. Prism, they call her. Story going round is she talked a slime to death, and honestly I'd believe it of her."),
      L('market', "Prism Stubby. Came up swearing at a ladder, is what I heard. Kept a tavern back home and it shows."),
      L('blunt', "Prism. Came up out of the drains with nothing and out-argued a Society clerk inside the hour. I liked her."),
      L('devout', "Two of you in one season. I have been asked whether that is a sign. I have not decided what to answer."),
      L('posh', "Two arrivals inside a season is outside the historical rate by some margin. Nobody at the Society appears interested in that."),
    ],
  },

  // --- ASK ABOUT MONSTERS ------------------------------------------------
  monsters: {
    label: 'What should I know about the monsters here?',
    children: ['monsters_rank', 'monsters_lost'],
    say: [
      L('rustic', "Keep off the fields at dusk and you'll likely be fine. Likely. I've a fence and a dog and I sleep well enough."),
      L('research', "Keyed to rank, mostly. The thing that will kill you out here is a normal-rank pack ten minutes after you stopped counting them."),
      L('market', "Not much comes near the walls, thank goodness. It's the road you want to watch, especially the stretch past the treeline."),
      L('blunt', "Stay on the road. Don't go out at dusk. If it's got more legs than it ought to, it's already seen you."),
      L('devout', "They come up out of the ground as they always have. Whether that is a punishment or simply weather, I have stopped guessing."),
      L('posh', "Within the patrol ring, statistically, very little. Outside it you are your own responsibility and the Society will say so in writing."),
      L('weary', "Enough of them. Never used to be this many."),
    ],
  },
  monsters_rank: {
    label: 'How dangerous are they, near here?',
    say: [
      L('rustic', "Little ones mostly. Rasker or two. Nothing a fence won't stop, and I've a good fence."),
      L('research', "Normal through diamond, and the gaps between are not even. Normal to iron is a season's work. Iron to bronze has killed more essence-bearers than any monster has."),
      L('market', "Iron rank, they call it. Small stuff. A bronze if you go past the treeline, and I'd not go past the treeline."),
      L('blunt', "Iron close in, bronze past the trees. You meet a silver out there you don't meet anything after it."),
      L('devout', "Nothing that would trouble an adventurer. And yet we keep losing people. You see my difficulty."),
      L('posh', "Iron, predominantly, with a bronze incidence of roughly one in nine sightings. I keep the figures because nobody else will."),
    ],
  },
  monsters_lost: {
    label: 'Have you lost anyone to them?',
    say: [
      L('rustic', "My uncle, years back. Proper one, that was. We found him and we buried him and that was that."),
      L('research', "We log every attributable death in the district. Two this quarter. Both bodies recovered, both consistent with an animal, and I say that because it happens to be true."),
      L('market', "Not me, thank goodness. My neighbour's boy, though, and there was nothing to bury, which she still can't get past."),
      L('blunt', "Two men from my watch, eleven years ago. I carried one of them back myself. These new ones, there's nothing to carry."),
      L('devout', "More than I can hold in one prayer. I have started keeping a list, which I did not use to need."),
      L('posh', "Personally, no. Professionally I have processed a great many claims, and the wording of the recent ones is peculiar."),
      L('weary', "My brother. Long time ago."),
    ],
  },

  // --- ASK ABOUT THE ADVENTURE SOCIETY -----------------------------------
  society: {
    label: 'Tell me about the Adventure Society.',
    children: ['society_boards', 'society_teams'],
    say: [
      L('rustic', "They come out when somethin' needs killin' and they take a fee. Fair enough, I say. I'd not do it."),
      L('research', "A guild with a charter and a fee schedule. We work with them when a site needs clearing. They do not ask what the site was for, which suits everybody."),
      L('market', "Good for trade, that lot. They come in filthy, they spend everything, they go out again. Can't complain."),
      L('blunt', "They do the work the watch can't. I've no quarrel with them. Some of them are insufferable."),
      L('devout', "They keep people alive. I've stopped asking anything more of an institution than that."),
      L('posh', "Contracts, ranks, and a great deal of paperwork with a sword through it. The paperwork is why anybody gets paid."),
      L('weary', "They rank you and they pay you. That's the whole of it."),
    ],
  },
  society_boards: {
    label: 'What are the adventure boards?',
    say: [
      L('rustic', "The notice board in the hall. You put up what you need doin' and somebody with a sword comes and does it. We did it for the well."),
      L('research', "The board in their hall. We post through them occasionally — survey work, sample collection. Nothing you would find objectionable."),
      L('market', "Every hall's got one. Jobs pinned up by rank, take one, bring back proof. Mind you a notice only says what the poster wanted said."),
      L('blunt', "Job list. Iron work at the bottom, the things that get people killed at the top. Don't take one above your rank."),
      L('devout', "It is where people ask for help who have no other way of asking. I find it a kinder thing than it looks."),
      L('posh', "A requisition board with a fee schedule. Take a notice, discharge it, present evidence, get paid. Do read them properly."),
    ],
  },
  society_teams: {
    label: 'How do teams work?',
    children: ['society_notices'],
    say: [
      L('rustic', "Four of 'em usually, in't it? They come through in fours. One big one always carryin' everythin'."),
      L('research', "Four is the standard contract. It is also the number at which a party stops reporting accurately. That has been measured. I am not being rude."),
      L('market', "Four's what you see. Someone to hold, someone to hurt, someone to patch them up. The fourth's whatever they could get."),
      L('blunt', "Four. You want someone who can take a hit and someone who can end it quick. The rest is luck."),
      L('devout', "People who have agreed to die for one another without ever saying so out loud. It is nearly a vow."),
      L('posh', "Registered groups of three to five, jointly liable. The composition matters enormously and most of them give it no thought at all."),
    ],
  },
  society_notices: {
    label: 'Where do the notices come from?',
    say: [
      L('rustic', "Anyone. We put one up ourselves when the rasker took the goats. Cost us a bit but they came."),
      L('research', "Anyone with the fee. We use an intermediary for ours, so what you see on the board has somebody else's name on it."),
      L('market', "Farmers, mostly. Merchants when a road goes bad. Lately a few with no name at the bottom, which I don't care for."),
      L('blunt', "Anyone with the fee. The watch posts them too, when something's past us. Happens more than I'd like."),
      L('posh', "Any party may lodge one on payment. The clerk sets the rank. Anonymous lodgements are permitted and I have always thought they should not be."),
    ],
  },

  // --- ASK ABOUT PALLIMUSTUS ---------------------------------------------
  pallimustus: {
    label: 'I am new here. Tell me about Pallimustus.',
    children: ['pal_essences', 'pal_surge', 'pal_magic', 'pal_gear'],
    say: [
      L('rustic', "You're askin' me? I've been four miles from this gate my whole life. Ask me about soil, I'm grand on soil."),
      L('research', "Older than the record and larger than the survey. I have read every regional report filed since the charter and they disagree about the coastline."),
      L('market', "Ha! Big question for a market stall. Narrow it down and I'll do my best."),
      L('blunt', "Big place. Magic in the ground, monsters under it, people on top regardless. What do you want to know?"),
      L('devout', "It is the gods' country and we are permitted to live in it. That is the short answer and the long one takes a lifetime."),
      L('posh', "That is an enormous question and you will have to be more specific. Which part?"),
    ],
  },
  pal_essences: {
    label: 'What are essences?',
    children: ['pal_stones'],
    say: [
      L('rustic', "Power you swallow, near as I understand it. Three of 'em and you're somethin'. I've none, mind. Never had the coin nor the nerve."),
      L('research', "Three bond to a soul and the fourth forms from them. Nobody outside the building gets anything else right. What it actually is remains an open question and I am paid to close it."),
      L('market', "Three to a person, and a fourth that comes out of the three. Choose badly and you've chosen badly for good, so they say."),
      L('blunt', "You absorb one and it's yours for life. Gives you abilities. Three's the cap. Pick carefully, you don't get them back."),
      L('devout', "A piece of the world, taken into a person. The temple has opinions about that and I have not entirely settled mine."),
      L('posh', "Absorbable sources of ability, limited to three per individual, with a confluence emerging from the combination. Irreversible, which people forget."),
    ],
  },
  pal_stones: {
    label: 'And awakening stones?',
    children: ['pal_stones_get'],
    say: [
      L('rustic', "Them's the ones you use on the essence to get the actual trick out of it. I've seen one once. Pretty thing."),
      L('research', "An awakening stone resolves one ability out of an essence. Which ability is not random and is not yours to choose. We know the second part; the first is my work."),
      L('market', "The essence gives you the shape, the stone gives you what you can actually do. Same three essences, different stones, different person entirely."),
      L('blunt', "One stone, one ability, and what you get out depends entirely which essence you spend it on. Don't let anyone sell you a second opinion."),
      L('devout', "They come up out of the same ground the monsters do, which the temple finds interesting and I find uncomfortable."),
      L('posh', "Single-use, ability-conferring, and priced accordingly. The result depends entirely on the essence it meets. Try valuing that."),
    ],
  },
  pal_stones_get: {
    label: 'How does anyone get one?',
    say: [
      L('rustic', "Off monsters, I'm told. Or dig for 'em. Not round here though — we've never turned one up and Lord knows we've dug."),
      L('research', "They occur where the world is thin — old sites, deep water, places that have been fought over. Killing something occasionally shakes one loose from ground that already held it."),
      L('market', "Monsters drop them, or you buy one if you've the sort of money that gets you called sir. There's a third way but it involves a shovel and a lot of optimism."),
      L('blunt', "Kill something big enough and hope. Or pay. Paying's faster and I've never had the money."),
      L('posh', "Monster recovery, excavation, or purchase. The first two are how most people die trying and the third is how most people are cheated."),
    ],
  },
  pal_surge: {
    label: 'What is a monster surge?',
    sayBy: {
      adventurer: [
        L('blunt', "It's the actual job. Everything else we do is practice for it. Keeping people alive through one is what the Society's for."),
      L('research', "We have three surges of usable field data and a fourth under way. I would rather have the fourth than not. I try not to say that aloud."),
        L('blunt', "Hardest year of your life and the fastest you'll ever rank up. There's more work in six months of surge than a decade of quiet."),
        L('posh', "The Society's founding purpose, discharged once a generation. It is also when the majority of rank advancement occurs, for the obvious reason that there is simply more work."),
        L('weary', "Half the silver-rankers I know got there in one. Nobody talks about what it cost them."),
      ],
    },
    say: [
      L('rustic', "Every ten, twelve year the ground goes wrong and everythin' comes up at once. My mam used to start saltin' meat a year early. She was never far off."),
      L('research', "A population event on a twelve-year mean with a four-year variance. The variance is what kills people, because the almanacs publish the mean."),
      L('rustic', "Had one when I was a lad. We got behind the wall and we stopped countin' and I'd rather not go further into it than that, if you'll forgive me."),
      L('market', "Ten or twelve years apart, near enough you can feel it coming. The stalls empty out, everyone goes home, and you just wait."),
      L('blunt', "It's when the walls stop being decoration. Last one we lost two gates and the east quarter. I was twenty-three."),
      L('devout', "The ground empties itself and we are asked to survive it. I have buried a great many people after the last one and I dread the next."),
      L('posh', "A generational spike in monster emergence, ten to thirteen years apart. The almanacs put us inside the window now, and the almanacs are rarely wrong by more than a season."),
    ],
  },
  pal_magic: {
    label: 'What is the Magic Society?',
    say: [
      L('rustic', "Scholars, in't they. Never met one. They don't come out this far."),
      L('research', "Magic in this world is what an essence does. There is no second discipline, whatever the temples imply, and I would put that in writing if I were allowed to."),
      L('market', "They'll identify anything you bring them and charge you nicely for it. Worth it, usually."),
      L('blunt', "They study what we kill. Useful enough. Very pleased with themselves."),
      L('devout', "They ask the world questions directly rather than asking the gods. We manage to be civil about it."),
      L('posh', "Scholars and ritualists. They and the Adventure Society need one another and cannot say so. I attend the joint sessions for pleasure."),
    ],
  },
  pal_gear: {
    label: 'What should I be fighting in, and with?',
    children: ['pal_armour', 'pal_weapons'],
    say: [
      L('rustic', "Somethin' you can run in, that'd be my advice, and I'm a man with a hoe so take it how you like."),
      L('research', "Whatever does not interfere with a reading. I'd advise against anything conjured if you intend to be measured, though I suspect that is not your priority."),
      L('market', "Ah, now that I can help with. Armour or weapons?"),
      L('blunt', "Depends what your essences already do for you. Which half do you want?"),
      L('posh', "Both questions have the same answer underneath: buy for the power you have, not the one you would like. Which shall we start with?"),
    ],
  },
  pal_armour: {
    label: 'What about armour?',
    say: [
      L('rustic', "Leather, I'd say. Plate's for them as has a horse to carry it."),
      L('research', "Whatever leaves the forearms clear. I have lost two afternoons to a subject who could not roll a sleeve up."),
      L('market', "Smith'll sell you honest steel and the outfitter's got leather that won't cook you. Or take your materials to a bench and make it yourself — works out cheaper and it fits."),
      L('blunt', "Buy what you can move in. Better still, get an essence that conjures its own — it's there when you're ambushed with your boots off, which happens."),
      L('devout', "Whatever keeps you whole. I've no counsel on steel, though the smith is an honest man and does not pad a bill."),
      L('posh', "Three routes: purchase from a smith, fabricate at a bench from recovered materials, or summon it from an essence. The third is dearest to acquire and cannot be stolen."),
    ],
  },
  pal_weapons: {
    label: 'And weapons?',
    say: [
      L('rustic', "Whatever you can swing without hurtin' yourself. I've seen a lad take his own ear off with a billhook."),
      L('research', "Match it to the essences you actually hold. A proficiency you do not have is a stamina penalty you pay on every swing, and it is measurable."),
      L('market', "Smith's got a rack of them. Or a bench and your own materials if you're handy. Mind you carry what your essences actually know."),
      L('blunt', "Carry what your essences know. A sword in the hands of a spear man is an expensive stick. Learn the one you pick properly."),
      L('posh', "Purchase, fabricate, or conjure. And do match it to your proficiencies — the difference in stamina cost across a long engagement is not small."),
      L('weary', "Whatever you'll actually pick up when you're frightened."),
    ],
  },

  // --- WHAT IS ACTUALLY HAPPENING (important people) ---------------------
  story: {
    label: 'What is really going on around here?',
    children: ['story_division', 'story_missing', 'story_threat'],
    say: [
      L('market', "Ohh. That's a bigger question than you meant it. Which bit — the people, the house on the hill, or what's coming?"),
      L('research', "That is three questions and you should ask them separately. I will answer two of them."),
      L('blunt', "You've been listening, then. Most don't. Ask me straight and I'll answer straight."),
      L('devout', "Ahh. I have been waiting for somebody to ask me in those words. Which piece would you like?"),
      L('posh', "Careful who else you ask in that tone. Go on, though."),
    ],
  },
  story_division: {
    label: 'Who are the people nobody will name?',
    sayByAct: {
      1: [
        // ROUND 257 (item 2.1) -- "they are the ones disappearing people."
        // So they do not wonder who the Division is. They correct your
        // grammar about it.
        L('research', "You mean us, I assume. We are named on the plate by the door and on every requisition in the building. It's the town that prefers not to."),
        L('research', "The Division of Essence Development. Chartered, funded and audited. If somebody has told you otherwise I'd be glad of the name."),
        L('rustic', "Uhh, can't say I've heard of them. If they're really helpin' draw out essence powers though, that's good news for all of us, aint it?"),
        L('market', "Oh, I've heard some things. Mostly hogwash I bet... but there's been a lot of disappearances that don't make sense to have been monsters."),
        L('blunt', "I'm a less research, more action sort anyway. But that lot make my skin crawl and I couldn't tell you why."),
        L('devout', "Ahh. My god has suggested we keep our distance — whether that's because essence work is the domain of the gods, or other reasons I can't.. or perhaps won't say."),
        L('posh', "There is a chartered house on the hill. Essence research, per the plate. I have read the charter and it does not account for the staffing figures."),
      ],
      2: [
        L('research', "We're the same department we were last spring. What's changed is how many of you have started saying it out loud, and that is being noted."),
        L('research', "You've been in the building. You know exactly who we are. Asking me is a test and I'd rather you didn't."),
        L('rustic', "The Division, is it? Heard the name now. Nobody out here'll say it above a whisper and I've started doing the same without meanin' to."),
        L('market', "The Division. There, I've said it and the sky didn't fall. Essence research with a seal on it, and whatever they're at, it isn't research."),
        L('blunt', "They came to the barracks with papers. I've never seen the sergeant go quiet like that. Still not right in himself."),
        L('devout', "They ask families to sign things. The families come to me afterwards and cannot tell me what they signed."),
      ],
      3: [
        L('research', "I transferred out before Cinderwaste. That is on my file and I have it in writing, and I notice how badly I want you to know it."),
        L('research', "We are the department that was told to produce results and produced them. Ask the people who set the figure who they are."),
        L('rustic', "You've been up to them works, they say. I don't want to know. I truly don't. I've a family."),
        L('market', "Everyone knows now, more or less. Knowing hasn't done us much good."),
        L('blunt', "I've seen inside one. I'd rather not talk about it, if it's all the same, and I'd rather you didn't tell anyone I did."),
        L('posh', "Thirty-two entered the works at Cinderwaste. The ledger records thirty-two payments. It does not record thirty-two departures, and it is a very careful ledger."),
      ],
      4: [
        L('research', "There's no 'they'. There are eleven of us left with keys and none of us can stop it either."),
        L('research', "I answer to a signature now. I have not met it. I do not expect to."),
        L('market', "They're not even hiding it now. That's the part that's got everyone rattled."),
        L('blunt', "You know more than I do at this point. All I'll say is when they leave a place, the place doesn't come back right."),
        L('devout', "I have stopped asking my god about them. The silence was becoming an answer and I did not want it."),
        L('posh', "They have ceased to bother with the paperwork. Institutionally, that is the most alarming thing I can tell you."),
      ],
    },
    say: [
      L('rustic', "There's a house up the hill with a fence round it. That's all I know and I'm happy with that."),
      L('research', "We are a chartered department and our returns are filed quarterly. You are welcome to read them at the registry."),
      L('market', "Some questions you ask the once, then you stop."),
      L('blunt', "Couldn't tell you. Wouldn't, either, and I'd think less of whoever did."),
      L('posh', "I am not in a position to discuss the tenants of that property."),
    ],
  },
  story_missing: {
    label: 'Where are the missing people going?',
    sayByAct: {
      1: [
        L('rustic', "Nobody knows! That's what's so queer about it. If it were beasts we'd have found somethin'. A boot. Anythin'."),
        L('research', "The district has an intake process and it produces records. I sign some of them. That is as far as I am going to go with you today."),
        // ROUND 257 (item 2.2) -- "Very AI slop. 'Monsters make a mess and
      // there's never been a mess' -- this is that AI cadence we have
      // discussed previously. Real human beings don't repeat themselves that
      // way." He is right, and the tell is exact: the sentence says a thing
      // and then says its negation, with the same noun both times, for the
      // pleasure of the shape. It is the same move round 210 found 39 times
      // and it got back in. Rewritten so the observation arrives once and is
      // the speaker's, not the sentence's.
      L('market', "Nobody can say. Which is the bit that keeps me up — my cousin's on the search parties and they've not found so much as a torn sleeve."),
        L('blunt', "I don't know. I'm supposed to know, it's my job to know, and I don't."),
        L('devout', "I do not know, and I have asked in the only way I have. Nothing has come back."),
      ],
      2: [
        L('rustic', "Carts go past at night with the covers down. I don't look no more. That's a cowardly thing to admit but there it is."),
        L('research', "Somewhere with a receiving officer and a form. I have stopped asking which building, because the answer changed twice and nobody explained why."),
        L('market', "Into that house, most like, and out the other side as something their own mother wouldn't know. I've said too much. I'd say it again."),
        L('blunt', "Wherever those carts go. I've stopped them twice and both times the papers were in order and both times I was wrong to let them through."),
      ],
      3: [
        L('market', "You've been out to the works. You tell me. We stopped guessing the week the diggers came back quiet."),
        L('research', "You have seen the works. I have seen the manifests. Between us we could probably reconstruct the whole of it and I would very much like not to."),
        L('blunt', "Not into graves. I'll say that and nothing after it."),
        L('devout', "I have begun saying the words over ground I know is empty. It is not for them any more. It is for the ones still here."),
      ],
      4: [
        L('market', "Some of them came back. Nobody was ready for that. Nobody knows what we owe them or who owes it."),
        L('research', "Some are back. None of the returns match the intake figures and I am the person who has to reconcile them."),
        L('blunt', "We know now. It's helped less than you'd think."),
        L('posh', "The disposition of the missing is now largely established. There is no administrative process for what was established."),
      ],
    },
    say: [
      L('rustic', "Away somewhere. That's all anybody can tell you."),
      L('research', "People leave places. It is the commonest thing people do and it is very rarely investigated."),
      L('market', "Nobody knows, and the ones whose job it is have stopped looking."),
      L('blunt', "If I knew that I'd not be standing here talking to you about it."),
      L('devout', "I have asked. I was not answered, and I have to live alongside that."),
    ],
  },
  story_threat: {
    label: 'How bad is this going to get?',
    sayByAct: {
      1: [
        L('rustic', "Bad, I should think. The almanacs say we're due a surge and now folk are goin' missin' on top. Feels like a lot at once."),
        L('research', "Worse than the almanacs, and I can show the arithmetic. What I cannot show you is why the department is buying land ahead of it."),
        L('market', "A surge you can survive. A surge with the adventurers being thinned out first — I've no comfort for you there."),
        L('blunt', "We're inside the surge window and somebody's taking the people who'd stand in it. Do the arithmetic yourself, I don't like saying it out loud."),
        L('devout', "I pray about it daily and I have stopped expecting the feeling to lift."),
      ],
      2: [
        L('market', "Work it out. Surge every ten or twelve years, Society needs every hand, and somebody's been thinning them two years running."),
        L('research', "We are past the point where the models hold. I revised mine three times this year and each revision was worse than the one before it."),
        L('blunt', "Whoever's doing this either doesn't know a surge is coming or knows exactly. I can't decide which frightens me more."),
        L('posh', "The timing is not coincidental. I would stake my position on it, and my position is the only thing I have."),
      ],
      3: [
        L('rustic', "My gran's village went in the last one and there was nobody makin' it worse on purpose. Think on that a while."),
        L('research', "Regionally survivable, locally catastrophic, and which one you get is decided by where you happen to live. I am sorry. That is all the forecast I have."),
        L('blunt', "Somebody wants the walls thin when the ground opens. That's what it looks like from where I stand and I stand on the wall."),
        L('devout', "I have begun preparing the crypt for living people rather than dead ones. Make of that what you will."),
      ],
      4: [
        L('market', "It's already here for some of us. Whether it comes for the rest is down to people like you. Thin thing to be resting on."),
        L('research', "It is not coming. It is being distributed, and I am not able to tell you by whom."),
        L('blunt', "As bad as it gets. I can stand in front of a monster. What I can't stand is knowing somebody sat down and arranged for us to be short-handed when it came."),
        L('devout', "I no longer ask how bad. I ask who is left, and I count, and then I go and do the next thing."),
      ],
    },
    say: [
      L('rustic', "Bad enough I've not planted the far field. Make of that what you will."),
      L('research', "Bad enough that I have started keeping a bag by the door. A bag is not a scientific instrument. I know."),
      L('market', "Worse than anyone in an office will write down."),
      L('blunt', "Bad. I've been on the wall eleven years and I've started sleeping in my boots."),
      L('posh', "Materially worse than the published assessment, which I helped to publish."),
    ],
  },
};
export const TOPIC_KEYS = Object.keys(TOPICS);

/** The topics a standard NPC opens with. 2.3.1: "Standard NPCs basically will
 *  have 2-3 options like the below" -- four roots, which with the goodbye is
 *  the five the user's rule 2.3 allows. */
export const STANDARD_ROOTS = ['rumors', 'monsters', 'society', 'pallimustus'];

/**
 * ROUND 209 -- what an important person offers: the same four, plus the one
 * that explains the game.
 *
 * 2.3.2: "Important NPCs should have the same options plus quest specific
 * options." The standard four come FIRST and the story branch is appended, so
 * an important person is a person first -- they still have an opinion about
 * the weather -- and the new thing is at the bottom where a returning player
 * will look for it.
 *
 * Five roots and a goodbye is six, one past the user's 2.3 ceiling of five
 * options. Taken deliberately: their own 2.3.2 asks for "the same options
 * PLUS", which cannot be done inside five, and the ceiling was written about
 * ordinary townsfolk in 2.3.1. `dialogueFaults` asserts the standard root
 * stays at five so the exception cannot spread.
 */
export const IMPORTANT_ROOTS = [...STANDARD_ROOTS, 'story'];

// ===========================================================================
// GREETINGS.
//
// 2.2: "they have a semi unique greeting (general NPCs can have standard
// greetings, quest NPCs and story characters should have more thought out
// lines)".
//
// So a generic townsperson draws from a pool by ROLE -- a guard does not greet
// you like a farmer -- and anyone carrying their own authored line keeps it.
// That is the existing `dialogue` / `line` field, which every named NPC in
// npcs.js already has and which is better than anything a pool would produce.
// ===========================================================================

export const GREETINGS = {
  guard: [
    "Move along, or don't. Just don't do it loudly.",
    "Keep your weapon where I can see it and we'll get on.",
    "Something you need, or are you just standing there?",
  ],
  merchant: [
    "Buying? Looking? Looking's free, briefly.",
    "You've got the look of someone with coin and no plan. My favourite kind.",
    "Step in, step in. Mind the crates.",
  ],
  farmer: [
    "Aye. What is it, then?",
    "If you're after work, I've none. If you're after talk, I've plenty.",
    "Long day already and it's not half done. Say your piece.",
  ],
  noble: [
    "Yes? Be brief, I've an appointment.",
    "One does not usually expect to be stopped in the street.",
    "You may speak. Briefly.",
  ],
  adventurer: [
    "Another one off the boards, are you? Mind yourself out there.",
    "You've the look. Iron rank, I'd guess, and no offence in it.",
    "Watch the treeline on the east road. That's free advice and it's the good kind.",
  ],
  child: [
    "Are you an adventurer? You don't look like one. A bit.",
    "Mum says not to talk to people with swords. You've got a sword.",
    "Have you killed anything? A real one?",
  ],
  priest: [
    "Peace on you, traveller. You look like you've been walking.",
    "The door's open. It usually is.",
    "Come for the gods or for the shade? Either's welcome.",
  ],
  // ROUND 257 (item 2.1) -- the Division. Nobody here says hello.
  research: [
    "You're not on today's list. Who sent you up?",
    "If it's about a relative, the intake window is Thursdays and I can't help you.",
    "Essence-bearer? Recent one, at a guess. Stand still a moment.",
    "I'm mid-run. Say it quickly and say the useful part first.",
  ],
  folk: [
    "Aye? What can I do for you?",
    "Evening. Or morning. I've rather lost track.",
    "You're not from here. That's not a complaint.",
    "Something I can help with?",
  ],
};
export const GREETING_ROLES = Object.keys(GREETINGS);

/** Which pool this person greets from. Read off the fields an NPC already
 *  carries rather than a new one, so nobody has to go back and label 600
 *  townsfolk. */
export function greetingRoleFor(npc) {
  if (!npc) return 'folk';
  if (npc.guard || /\b(guard|constable|watch|sergeant|captain)\b/i.test(npc.name || '')) return 'guard';
  if (npc.shopId || npc.benchKey || /\b(merchant|trader|smith|harbourmaster|ledgerman)\b/i.test(npc.name || '')) return 'merchant';
  if (npc.isPriest || npc.isGod) return 'priest';
  // ROUND 257 (item 2.1) -- the Division, BEFORE the noble test, because
  // "Director Hallam Vesk" matches `director` and a director of essence
  // research is not a baron. `npc.division` is set on every one of them by
  // `_buildDivisionStaff` and has been since round 66; nothing had ever read
  // it, which is how the assistant ended up talking like a fishmonger.
  if (npc.division || npc.research
    || /\b(researcher|research|assistant|archivist|technician|registrar of essence)\b/i.test(npc.name || '')
    || /\b(research|division)\b/i.test(npc.role || '')) return 'research';
  if (/\b(lord|lady|overseer|director|baron|countess)\b/i.test(npc.name || '')) return 'noble';
  if (/\b(farmer|hand|labourer|digger)\b/i.test(npc.name || '')) return 'farmer';
  if (npc.party || npc.soulFollower || /\badventurer\b/i.test(npc.art || '')) return 'adventurer';
  if (/\b(girl|boy|lad|lass)\b/i.test(npc.art || '')) return 'child';
  return 'folk';
}

/** What this person says when you walk up. An authored line always wins --
 *  2.2's "quest NPCs and story characters should have more thought out
 *  lines", and every one of them already has one. */
export function greetingFor(npc, authored = null) {
  if (authored) return authored;
  const pool = GREETINGS[greetingRoleFor(npc)] || GREETINGS.folk;
  return pool[pickFor(npc && npc.name, 'greeting', pool.length)];
}

// ===========================================================================
// THE TREE, WALKED.
// ===========================================================================

/** 2.5 -- "A goodbye option should always be at the bottom of the list". Not
 *  a topic, because it is not a thing anybody says back; it is the exit, and
 *  making it a topic would mean every list in the file had to remember it. */
export const GOODBYE = { id: '__bye', label: 'Goodbye.', bye: true };
/** ...and its sibling, one level down: the way back up without leaving. */
export const BACK = { id: '__back', label: 'Let me ask something else.', back: true };

/**
 * The options shown at a node.
 *
 * `path` is the stack of topic ids the player has opened; empty is the root.
 * Returns `[{id, label, ...}]` with the navigation entries already in place,
 * so no caller has to remember rule 2.5.
 */
export function optionsAt(path, roots = STANDARD_ROOTS, ctx = {}, table = TOPICS) {
  const here = path && path.length ? table[path[path.length - 1]] : null;
  const ids = here ? (here.children || []) : roots;
  const out = [];
  for (const id of ids) {
    const t = table[id];
    if (!t) continue;
    if (t.when && !t.when(ctx)) continue;
    out.push({ id, label: typeof t.label === 'function' ? t.label(ctx) : t.label });
  }
  if (path && path.length) out.push({ ...BACK });
  out.push({ ...GOODBYE });
  return out;
}

// ===========================================================================
// ROUND 210 -- WHO TALKS LIKE WHAT.
//
// The role an NPC greets from is the strongest signal we have and it is
// already derived from fields the catalogue carries, so the voice rides on it
// rather than asking anyone to label 600 townsfolk a second time.
//
// The roles that map cleanly map cleanly: a priest is `devout`, a guard is
// `blunt`, a noble is `posh`. The two that do not are FARMER and FOLK, and
// that is the user's own point -- their two farmers, one out past the last
// fence and one at a market stall, are different people and the difference is
// the whole illustration. There is no `region` on an NPC here, so the split
// falls to the name hash: roughly half of the farmers and folk in any given
// place speak `rustic` and the rest `market`, which gets the two-farmers
// effect the user asked for without inventing a field nobody will maintain.
//
// `weary` is not assigned by role at all. It is the voice the complaint was
// about, so it is reached only by the tail of the hash -- about one person in
// eight among ordinary folk, and nobody else. A world where every third
// person is quietly devastated is the same failure as a world where every
// third person has a punchline.
// ===========================================================================

/** The pool of voices a given greeting role may speak in, best first. */
const ROLE_VOICES = {
  guard: ['blunt'],
  // Weighted, not listed: a shopkeeper is a market voice three times in four.
  // The `posh` tail is the ledgerman and the harbourmaster, who fall into
  // this role off `shopId` and would sound absurd saying "hogwash".
  merchant: ['market', 'market', 'market', 'posh'],
  priest: ['devout'],
  noble: ['posh'],
  farmer: ['rustic', 'rustic', 'market'],
  adventurer: ['blunt', 'market'],
  child: ['rustic', 'market'],
  research: ['research'],
  folk: ['market', 'rustic', 'blunt', 'weary'],
};

/** Which of the six this person talks in. Stable for a given name. */
export function voiceFor(npc) {
  const role = greetingRoleFor(npc);
  const pool = ROLE_VOICES[role] || ROLE_VOICES.folk;
  const name = npc && npc.name;
  // A clerk is a clerk whatever door they came in by. `greetingRoleFor` files
  // the ledgerman and the harbourmaster under `merchant` because they have a
  // `shopId`, which is right for a greeting and wrong for a voice: a man who
  // keeps a ledger for a living does not say "hogwash".
  if (/\b(ledger\w*|clerk|harbourmaster|factor|scrivener|registrar|assessor)\b/i.test(name || '')) return 'posh';
  // The weary tail: one ordinary person in eight, and only among folk and
  // farmers, who are the ones who lose neighbours.
  if ((role === 'folk' || role === 'farmer') && pickFor(name, 'weary', 8) === 0) return 'weary';
  return pool[pickFor(name, 'voice', pool.length)];
}

/**
 * What the NPC says when this topic is opened.
 *
 * `role` selects a `sayBy` pool where the topic has one -- see `pal_surge`,
 * where a farmer and a Society adventurer have genuinely different
 * relationships to the same event and a single pool would have averaged them
 * into a person who is neither. Falls back to `say`, which every topic has.
 *
 * ROUND 210 -- the pool is then narrowed to the speaker's VOICE, and only
 * then is one line picked out of it. The order matters and it is the reverse
 * of what it looks like it should be: the act decides WHAT is known, the
 * voice decides HOW it is said. Narrowing by voice first would let a rustic
 * farmer answer an act-4 question with act-1 ignorance, which is the world
 * forgetting what the player has already seen -- the exact fault round 209
 * was written to prevent.
 *
 * A voice with no line in the chosen pool falls back to the whole pool rather
 * than to silence. That is deliberate: the alternative is a `dialogueFaults`
 * entry per missing voice per pool, 37 pools by 6 voices, and a wall of 200
 * faults is a wall nobody reads. The floor is asserted instead -- three
 * distinct voices per pool -- which is the property that actually matters.
 */
export function sayFor(topicId, npcName, role = null, act = null, voice = null) {
  const t = TOPICS[topicId];
  if (!t) return '';
  // ROUND 209 -- the ACT first, then the role, then the general pool. The act
  // wins because a fact the player has already seen with their own eyes must
  // not be described to them as a mystery, whoever is doing the describing.
  const byAct = (act != null && t.sayByAct && t.sayByAct[act] && t.sayByAct[act].length)
    ? t.sayByAct[act] : null;
  const byRole = (role && t.sayBy && t.sayBy[role] && t.sayBy[role].length)
    ? t.sayBy[role] : null;
  let pool = byAct || byRole || t.say;
  if (!pool || !pool.length) return '';
  if (voice) {
    const mine = pool.filter(l => l && l.v === voice);
    if (mine.length) pool = mine;
  }
  const line = pool[pickFor(npcName, topicId, pool.length)];
  return line && line.t != null ? line.t : String(line);
}

// ===========================================================================
// FAULTS.
// ===========================================================================

// ===========================================================================
// ROUND 210 -- THE TELL DETECTOR.
//
// The user named four. Two of them are literal strings and are trivial to
// catch; the other two are RHYTHMS, and a rhythm is what actually gives the
// writing away, because I will never reuse the exact sentence but I will
// reuse the move forever. Round 209's 134 lines: 45 of them, 34%, tripped one
// of these, and 39 of the 45 were the same one.
//
// This is the project's fault class 5 -- "a lexical guard catches the
// phrasing reported and misses the one written next" -- taken seriously for
// once. A check for the literal string "a testament to" would have passed
// round 209 with a clean sheet, because round 209 does not contain it. The
// checks that found something are the shape checks.
//
// The floor is a RATE, not zero. A guard that forbids a short final sentence
// outright forbids "Aye. Nothing good.", which is the best line in the file.
// The complaint was never that the move exists; it was that it is everybody's
// move. So: under a tenth of the lines, and no single tell over a twentieth.
// ===========================================================================

export const TELLS = {
  // 2.2 -- named outright.
  'a testament to': (s) => /\ba testament to\b/i.test(s),
  // 2.1 -- the summing-up coda. Named with one example; caught as the shape,
  // because "it wasn't perfect, but it was enough" and "it wasn't much, but
  // it was something" are the same sentence wearing different nouns.
  "the 'but it was enough' coda": (s) =>
    /\b(it|that|they)\s+(was|wasn'?t|weren'?t|is|isn'?t)\b[^.!?]{0,40},?\s*(but|and)\s+(for now|for the moment)?,?\s*(it|that|they)\s+(was|is|would be)\s+(enough|something|a start|what (we|they|I) had)\b/i.test(s),
  // 2.3 -- "it's not just X, it's Y", and its close cousin without the just.
  "'not just X, it's Y'": (s) => /\bnot (just|only|merely)\b[^.!?]{0,50}\b(it'?s|that'?s|they'?re|but)\b/i.test(s),
  "'not X, that's Y'": (s) =>
    /\b(that'?s|it'?s|they'?re)\s+not\b[^.!?]{0,40},\s*(that'?s|it'?s|they'?re|just)\b/i.test(s)
    || /\bnot\s+\w+[^.!?]{0,30},\s*(that'?s|it'?s)\b/i.test(s),
  // ...and the same reversal done with a dash instead of a comma, which is
  // how it came back the first time I banned the comma form.
  'dash reversal': (s) => /\bnot\b[^.!?,]{0,30}\s[—–]\s*\w+[.!?]\s*$/i.test(s),
  // 2.4 -- "Normal noun does X for A, but this noun does X for B." The user's
  // own example of it was the line they quoted at me: "Research writes things
  // down so someone else can repeat them. They write things down so nobody
  // can." Caught structurally: two adjacent sentences, the second opening on
  // a pronoun, sharing a content word, of similar length.
  'antithesis (X does A / Y does B)': (s) => {
    const parts = String(s).split(/(?<=[.!?])\s+/).filter(p => p.trim());
    for (let i = 1; i < parts.length; i++) {
      const a = parts[i - 1], b = parts[i];
      if (!/^(they|this|that|these|those|we|ours|mine|his|hers|its)\b/i.test(b.trim())) continue;
      if (Math.abs(a.length - b.length) > Math.max(a.length, b.length) * 0.6) continue;
      // The shared word has to carry MEANING. The first cut counted any word
      // of four letters or more, which meant "that" -- and "we found him and
      // we buried him and that was that" was reported as a rhetorical
      // antithesis. It is a farmer saying his uncle died. Fault class 1, the
      // check measuring something adjacent to the property.
      const wa = new Set((a.toLowerCase().match(/[a-z']{4,}/g) || []).filter(w => !STOP.has(w)));
      const shared = (b.toLowerCase().match(/[a-z']{4,}/g) || []).filter(w => !STOP.has(w) && wa.has(w));
      if (shared.length) return true;
    }
    return false;
  },
  // ===== ROUND 214 ======================================================
  //
  // The user again, on the companions and the gods: "Looking more AI."
  //
  // The round 210 guard ran over those 268 lines and reported 1%, which was
  // true and useless: it was measuring the five moves round 210 was about,
  // and this was a sixth it had never been shown. Widening the net found it
  // at 4%, the largest single construction in either file, and it is worse
  // than a cadence -- it is a HABIT OF MIND.
  //
  //   "...and it is the only thing I'm frightened of, which is tidier than
  //    most people's."
  //   "...I keep the accounts, which is a different and much larger list."
  //   "...they have stopped mentioning it, which is the part I'd look at."
  //
  // Every one of those says a thing and then explains what the thing MEANT.
  // People do not do that about themselves; a writer does it on a character's
  // behalf, for a reader they do not trust. Cutting the clause almost always
  // improves the line, because what is left is the part the character would
  // actually have said.
  "the self-explaining clause (', which is ...')": (s) =>
    /,\s*which\s+(is|was|are|makes|means|explains)\b/i.test(s),
  // ...and its cousin, where the summing-up gets its own sentence instead of
  // a comma. Round 210 caught this only when the closer was short.
  "the summing-up sentence ('That is the trade.')": (s) =>
    /(?<=[.!?])\s+(That|This|It)\s+(is|was)\s+(the|a|my|our|his|her|their)\s+\w+[^.!?]{0,24}[.!?]\s*$/i.test(s),
  // Not on the user's list, and the one the measurement actually convicted:
  // 39 of round 209's 134 lines landed on a short reversing sentence after a
  // long one. It is the cleverness reflex, and it is mine, not theirs.
  //
  // But "short final sentence" is not the property. Measured against the new
  // text it convicted "Is it true where you're from there's no magic at all?
  // None? How's anyone manage?" -- a farmer talking over the top of himself,
  // which is the OPPOSITE of a clincher -- and "I've a bet with my brother",
  // which introduces a brother. What makes it a punchline is that the last
  // sentence REFERS BACK and adds nothing: "That's the whole of it.", "Still
  // not right in himself.", "The rest is luck." So:
  //
  //   - a question is never a punchline. It hands the turn to the player,
  //     which is the thing a clincher refuses to do.
  //   - a closer that opens on new material is a third clause, not a coda.
  //
  // Narrowing a guard is usually how a guard dies, so the rate ceiling below
  // is what keeps this honest: if the move comes back wearing a subject it
  // will come back in bulk, and the bulk is what is capped.
  'short punchline ending': (s) => {
    const parts = String(s).split(/(?<=[.!?])\s+/).filter(p => p.trim());
    if (parts.length < 3) return false;
    const last = parts[parts.length - 1].trim();
    if (last.length > 28) return false;
    if (/\?$/.test(last)) return false;
    return /^(that|this|it|they|these|those|not|and that|still|so|which|ours|mine|the rest|all of it|none of it)\b/i.test(last);
  },
};

/** Words too common to count as a shared theme. */
const STOP = new Set([
  'that', 'this', 'they', 'them', 'their', 'there', 'then', 'than', 'these', 'those',
  'what', 'when', 'where', 'which', 'with', 'from', 'have', 'been', 'were', 'will',
  'would', 'could', 'should', 'about', 'your', 'yours', 'just', 'like', 'much',
  'very', 'into', 'over', 'only', 'some', 'said', 'says', 'does', 'done', 'here',
  'been', 'more', 'most', 'them', 'well', 'know', 'think', 'thing', 'things',
]);

/** Every authored line in the file, with where it came from. */
export function allLines() {
  const out = [];
  for (const [id, t] of Object.entries(TOPICS)) {
    for (const l of (t.say || [])) out.push({ id, where: 'say', line: l });
    for (const [r, p] of Object.entries(t.sayBy || {})) for (const l of p) out.push({ id, where: `sayBy.${r}`, line: l });
    for (const [a, p] of Object.entries(t.sayByAct || {})) for (const l of p) out.push({ id, where: `act${a}`, line: l });
  }
  return out;
}

export function dialogueFaults() {
  const out = [];
  const txt = (l) => (l && l.t != null ? l.t : String(l));
  // ROUND 210 -- the length floor is voice-dependent. It exists to catch a
  // topic written as a label by mistake, and twenty characters caught that
  // fine until `weary` arrived, whose entire characterisation is that she
  // does not elaborate. The floor convicted "Aye. Nothing good.", which is
  // the best line in the file. A floor that forbids the thing it was never
  // aimed at is a floor set against the wrong property.
  const floor = (l) => (l && l.v === 'weary' ? 12 : 20);

  for (const [id, t] of Object.entries(TOPICS)) {
    if (!t.label) out.push(`topic ${id} has no label`);
    if (!t.say || !t.say.length) out.push(`topic ${id} has nothing to say`);
    // 2.4 -- a topic with ONE line is a sign nailed to a person: every NPC in
    // the world answers it identically. Two is the floor, three is what the
    // tree ships with.
    if (t.say && t.say.length < 2) out.push(`topic ${id} has only ${t.say.length} answer; every NPC would give it`);
    for (const line of (t.say || [])) {
      if (!/[.!?]$/.test(txt(line).trim())) out.push(`topic ${id} has a line that does not end: "${txt(line).slice(0, 40)}"`);
      // The player's line is a question or a request; the NPC's is an answer.
      // A "say" that is itself a question back is usually a topic that was
      // written as a label by mistake.
      if (txt(line).length < floor(line)) out.push(`topic ${id} has a line too short to be an answer: "${txt(line)}"`);
    }
    // The player's own line has to read as something a person would say.
    if (!/[.!?]$/.test(String(t.label).trim())) out.push(`topic ${id}'s label does not end: "${t.label}"`);
    // ROUND 208b -- a `sayBy` pool is held to every rule `say` is. It was
    // exempt in the first cut simply because the check predated it, which is
    // how a second door goes unwatched (round 206's lesson, one file over).
    // ROUND 209 -- an act pool is held to every rule a role pool is, and the
    // acts it names have to exist. Four acts; a pool keyed on 5 would be a
    // paragraph nobody ever reads.
    for (const [act, pool] of Object.entries(t.sayByAct || {})) {
      if (!['1', '2', '3', '4'].includes(String(act))) out.push(`topic ${id} answers act ${act}, which is not an act`);
      if (pool.length < 2) out.push(`topic ${id}'s act ${act} pool has one line`);
      for (const line of pool) {
        if (!/[.!?]$/.test(txt(line).trim())) out.push(`topic ${id} (act ${act}) has a line that does not end`);
        if (txt(line).length < floor(line)) out.push(`topic ${id} (act ${act}) has a line too short to be an answer`);
      }
    }
    // A topic with act pools must cover every act, or the player walks from
    // act 2 into act 3 and the world forgets what it just told them.
    if (t.sayByAct) {
      for (const a of ['1', '2', '3', '4']) {
        if (!t.sayByAct[a]) out.push(`topic ${id} has act pools and says nothing in act ${a}`);
      }
    }
    for (const [role, pool] of Object.entries(t.sayBy || {})) {
      if (!GREETINGS[role]) out.push(`topic ${id} answers role ${role}, which is not a role`);
      if (!pool.length) out.push(`topic ${id}'s ${role} pool is empty`);
      if (pool.length < 2) out.push(`topic ${id}'s ${role} pool has one line; every ${role} would give it`);
      for (const line of pool) {
        if (!/[.!?]$/.test(txt(line).trim())) out.push(`topic ${id} (${role}) has a line that does not end`);
        if (txt(line).length < floor(line)) out.push(`topic ${id} (${role}) has a line too short to be an answer`);
      }
    }
    for (const c of (t.children || [])) {
      if (!TOPICS[c]) out.push(`topic ${id} opens onto ${c}, which does not exist`);
    }
  }

  // --- every topic is reachable from a root ------------------------------
  const seen = new Set();
  const walk = (id) => {
    if (seen.has(id) || !TOPICS[id]) return;
    seen.add(id);
    for (const c of (TOPICS[id].children || [])) walk(c);
  };
  // ROUND 209 -- BOTH root sets. The first cut walked only the standard four
  // and reported the whole story branch as unreachable, which was the check
  // being right about its own list and wrong about the world.
  for (const r of [...STANDARD_ROOTS, ...IMPORTANT_ROOTS]) walk(r);
  for (const id of TOPIC_KEYS) if (!seen.has(id)) out.push(`topic ${id} cannot be reached from any root`);
  for (const r of [...STANDARD_ROOTS, ...IMPORTANT_ROOTS]) if (!TOPICS[r]) out.push(`root ${r} is not a topic`);
  // An important person keeps every ordinary topic -- 2.3.2's "the same
  // options plus". A root that appeared only on the important list would be
  // content most of the game could never reach.
  for (const r of STANDARD_ROOTS) if (!IMPORTANT_ROOTS.includes(r)) out.push(`important people cannot be asked about ${r}`);

  // --- no loops ----------------------------------------------------------
  // A child that reopens an ancestor makes the back stack meaningless.
  const loop = (id, chain) => {
    if (chain.includes(id)) { out.push(`topic ${id} loops: ${chain.join(' -> ')} -> ${id}`); return; }
    for (const c of (TOPICS[id].children || [])) loop(c, [...chain, id]);
  };
  for (const r of [...STANDARD_ROOTS, ...IMPORTANT_ROOTS]) loop(r, []);

  // --- 2.3: three to five options, and 2.5: goodbye is last --------------
  const rootOpts = optionsAt([]);
  if (rootOpts.length < 3 || rootOpts.length > 5) {
    out.push(`the root offers ${rootOpts.length} options; the rule is three to five`);
  }
  // ROUND 209 -- and the important root is allowed exactly one more, for the
  // story branch. Asserted as an exact number rather than a ceiling so the
  // exception cannot quietly grow into a seventh and an eighth.
  const impOpts = optionsAt([], IMPORTANT_ROOTS);
  if (impOpts.length !== rootOpts.length + 1) {
    out.push(`an important person offers ${impOpts.length} options; it should be one more than the ${rootOpts.length} an ordinary one does`);
  }
  // ...and the act pools are actually reached.
  for (const [id, t] of Object.entries(TOPICS)) {
    if (!t.sayByAct) continue;
    for (const a of [1, 2, 3, 4]) {
      const got = sayFor(id, 'Probe', null, a);
      if (!t.sayByAct[a].some(l => txt(l) === got)) out.push(`${id}'s act ${a} pool is never reached`);
    }
    // An act answer must differ from the general one, or the pool is doing
    // nothing and the branch is not moving with the story.
    const acts = [1, 2, 3, 4].map(a => sayFor(id, 'Probe', null, a));
    if (new Set(acts).size < 2) out.push(`${id} says the same thing in every act`);
  }
  for (const path of [[], ['rumors'], ['pallimustus'], ['pallimustus', 'pal_essences']]) {
    const opts = optionsAt(path);
    const last = opts[opts.length - 1];
    if (!last || !last.bye) out.push(`goodbye is not last at ${path.join('/') || 'the root'}`);
    if (opts.length > 6) out.push(`${path.join('/') || 'the root'} offers ${opts.length} options`);
    if (path.length && !opts.some(o => o.back)) out.push(`no way back from ${path.join('/')}`);
  }

  // --- greetings ---------------------------------------------------------
  for (const [role, pool] of Object.entries(GREETINGS)) {
    if (pool.length < 2) out.push(`greeting role ${role} has ${pool.length} line(s)`);
    for (const g of pool) if (!/[.!?]$/.test(String(g).trim())) out.push(`${role} greeting does not end: "${g}"`);
  }
  if (greetingRoleFor({ name: 'Sergeant Alda' }) !== 'guard') out.push('a sergeant does not greet as a guard');
  if (greetingRoleFor({ name: 'Nobody', shopId: 'x' }) !== 'merchant') out.push('a shopkeeper does not greet as a merchant');
  if (greetingRoleFor({ name: 'Nobody' }) !== 'folk') out.push('an ordinary person does not greet as folk');
  // An authored line always wins -- 2.2.
  if (greetingFor({ name: 'X' }, 'Authored.') !== 'Authored.') out.push('an authored greeting is being overridden');

  // --- 2.4: the same NPC answers consistently, two NPCs differ ----------
  const a1 = sayFor('rumors_missing', 'Bette Coldwater');
  const a2 = sayFor('rumors_missing', 'Bette Coldwater');
  if (a1 !== a2) out.push('one NPC gives two different answers to the same question');
  const others = ['Cutter Bly', 'Wren Tallowe', 'Nim', 'Overseer Halm', 'Sella Marsh']
    .map(n => sayFor('rumors_missing', n));
  if (new Set([a1, ...others]).size < 2) out.push('every NPC gives the same answer to the missing-persons question');
  // ROUND 208b -- and a role that HAS its own pool must actually get it. A
  // `sayBy` nothing reads would be this project's fault class 2 in a new file.
  for (const [id, t] of Object.entries(TOPICS)) {
    for (const role of Object.keys(t.sayBy || {})) {
      const got = sayFor(id, 'Probe', role);
      if (!t.sayBy[role].some(l => txt(l) === got)) out.push(`${id}'s ${role} pool is never reached`);
      if ((t.say || []).some(l => txt(l) === got)) out.push(`${id} gives a ${role} the general answer`);
    }
  }

  // =======================================================================
  // ROUND 210 -- VOICES.
  // =======================================================================

  // --- every line is tagged, with a voice that exists --------------------
  for (const { id, where, line } of allLines()) {
    if (!line || typeof line !== 'object' || !line.v) {
      out.push(`${id}.${where} has an untagged line: "${txt(line).slice(0, 40)}"`);
      continue;
    }
    if (!VOICES.includes(line.v)) out.push(`${id}.${where} is tagged "${line.v}", which is not a voice`);
  }

  // --- three voices to a pool --------------------------------------------
  // The floor, and the thing the user actually asked for. A pool with one
  // voice is round 209 again under a new field name: whoever you stop, you
  // get the same person. Three is chosen because six is unreachable for a
  // question only some kinds of people have an answer to -- a market trader
  // has no view on a temple's silence -- and two lets a pool drift back to
  // one when a line is cut.
  for (const [id, t] of Object.entries(TOPICS)) {
    const pools = [['say', t.say]];
    for (const [r, p] of Object.entries(t.sayBy || {})) pools.push([`sayBy.${r}`, p]);
    for (const [a, p] of Object.entries(t.sayByAct || {})) pools.push([`act${a}`, p]);
    for (const [name, pool] of pools) {
      const vs = new Set((pool || []).map(l => l && l.v).filter(Boolean));
      if (vs.size < 3) out.push(`${id}.${name} is spoken by ${vs.size} voice(s) (${[...vs].join(', ') || 'none'}); three is the floor`);
    }
  }

  // --- a voice that is never spoken is a voice that does not exist -------
  // Fault class 2, "written by one side, read by none": VOICES could grow a
  // seventh entry, every pool could keep ignoring it, and nothing would say
  // so. So each one has to be reachable from an actual NPC, and each one has
  // to have lines to reach.
  const spoken = new Set(allLines().map(({ line }) => line && line.v));
  for (const v of VOICES) if (!spoken.has(v)) out.push(`voice ${v} is defined and never spoken`);
  const assigned = new Set();
  const cast = [
    { name: 'Sergeant Alda' }, { name: 'Nobody', shopId: 'x' }, { name: 'Brother Ilm', isPriest: true },
    { name: 'Lady Veyle' }, { name: 'Farmer Coldwater' }, { name: 'Hob' }, { name: 'Wren Tallowe' },
    { name: 'Nim' }, { name: 'Sella Marsh' }, { name: 'Cutter Bly' }, { name: 'Bette Coldwater' },
    { name: 'Dunmore' }, { name: 'Pell' }, { name: 'Ashen Rook' }, { name: 'Marda Quill' },
    { name: 'Tam Ashmere' }, { name: 'Old Greave' }, { name: 'Ivo Sedge' },
    // ROUND 257 -- and the Division, who are people too, whatever else they
    // are. Added to the cast because a voice nobody in the sample speaks is
    // reported as unspoken, and that report was right: before this round no
    // NPC in the world could reach the `research` pool.
    { name: 'Wren Ashcombe', division: 'junior' },
    { name: 'Director Hallam Vesk', division: 'senior' },
  ];
  for (const npc of cast) assigned.add(voiceFor(npc));
  for (const v of VOICES) if (!assigned.has(v)) out.push(`voice ${v} has lines and no NPC in an eighteen-person sample speaks it`);
  // ...and the same person is the same person twice.
  if (voiceFor({ name: 'Bette Coldwater' }) !== voiceFor({ name: 'Bette Coldwater' })) {
    out.push('one NPC has two voices');
  }
  // A guard is blunt and a priest is devout, or the mapping has come loose
  // from the four examples the user wrote.
  if (voiceFor({ name: 'Sergeant Alda' }) !== 'blunt') out.push('a guard does not speak bluntly');
  if (voiceFor({ name: 'Brother Ilm', isPriest: true }) !== 'devout') out.push('a priest does not speak devoutly');
  if (voiceFor({ name: 'Lady Veyle' }) !== 'posh') out.push('a noble does not speak posh');
  // The voice narrows the answer. If it does not, the whole field is inert.
  {
    const topic = 'rumors_missing';
    const byVoice = new Set(VOICES.map(v => sayFor(topic, 'Probe', null, null, v)));
    if (byVoice.size < 4) out.push(`the voice does not change the answer to ${topic} (${byVoice.size} distinct)`);
    const b = sayFor(topic, 'Probe', null, null, 'blunt');
    if (!TOPICS[topic].say.some(l => l.t === b && l.v === 'blunt')) out.push('a blunt speaker is not given a blunt line');
  }

  // --- the tells ----------------------------------------------------------
  // A rate, not a ban -- see the note on TELLS. Round 209 shipped 34% and one
  // tell at 29%; the ceilings here are a tenth and a twentieth.
  {
    const lines = allLines();
    const per = {};
    let tripped = 0;
    for (const { id, where, line } of lines) {
      const s = txt(line);
      let hit = false;
      for (const [name, fn] of Object.entries(TELLS)) {
        if (!fn(s)) continue;
        hit = true;
        per[name] = (per[name] || 0) + 1;
        // The two the user named as strings are never allowed at any rate.
        if (name === 'a testament to' || name === "the 'but it was enough' coda") {
          out.push(`${id}.${where} uses "${name}": "${s.slice(0, 50)}"`);
        }
      }
      if (hit) tripped++;
    }
    if (lines.length && tripped / lines.length > 0.10) {
      out.push(`${tripped} of ${lines.length} lines (${Math.round(100 * tripped / lines.length)}%) trip an AI tell; the ceiling is 10%`);
    }
    for (const [name, n] of Object.entries(per)) {
      if (lines.length && n / lines.length > 0.05) {
        out.push(`"${name}" is used in ${n} of ${lines.length} lines (${Math.round(100 * n / lines.length)}%); no single tell may exceed 5%`);
      }
    }
  }

  return out;
}
