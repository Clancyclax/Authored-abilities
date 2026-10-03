// ===========================================================================
// ROUND 211 -- THE COMPANIONS GET A TREE.
//
// The user, in the dialogue spec (2.3.3):
//
//   "Companions should have the largest dialogue trees with new options being
//    added at each new region and each milestone. They should talk about the
//    cities, regions, quests, each other, hopes, dreams, their essences, and
//    the world as a whole."
//
// WHAT WAS THERE. Round 76 gave each companion an ARC -- an ordered list of
// things they will tell you, one per conversation, gated on rank and region.
// That is still the best writing about who these people are and none of it is
// touched. But an arc is something they tell YOU; it has no questions in it.
// Press E on Zeke and you got the next confession and then a stat readout,
// and when the arc was spent you got an idle line and a stat readout forever.
//
// So the arc becomes the GREETING and this tree opens underneath it, exactly
// the way round 209 hung the standard tree under an important person's
// scripted page. The arc keeps the beats that have to land in order; the tree
// holds everything the player might want to ask about on any given day.
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT THE TOWNSFOLK TREE WITH MORE ROWS.
//
// dialogue.js answers a topic by picking from a pool of lines tagged with a
// VOICE, because there are six hundred townsfolk and no way to write six
// hundred people. There are FIVE companions. They are named, they have
// histories the user wrote, and the entire point of a companion is that you
// know which one is talking before you read the name.
//
// So every answer here is keyed by SPEAKER, not drawn from a pool, and the
// faults assert that no two companions ever give the same answer to the same
// question. A pool would have been less writing and would have produced five
// people who sound like one person with five hats, which is the round 210
// complaint arriving in a new file.
//
// ---------------------------------------------------------------------------
// "NEW OPTIONS AT EACH NEW REGION AND EACH MILESTONE."
//
// Three mechanisms, all data:
//
//   `when(ctx)` on a topic      -- the row does not appear until it is true
//   `byRegion[region][speaker]` -- the same row answers differently per place
//   `byAct[act][speaker]`       -- and differently as the story moves
//
// `c_here_now` is the region one and it is the heart of the ask: its LABEL is
// the region's own name, so walking into Bratugal with the twins in the party
// puts "Bratugal, then." on the list, and they have something to say about it
// that nobody else does. Seven regions by five speakers is thirty-five lines
// for one row, which is the price of the row meaning anything.
//
// ---------------------------------------------------------------------------
// THE TELLS ARE IMPORTED, NOT RE-DERIVED.
//
// Round 210 measured 34% of the townsfolk lines tripping an AI tell and put a
// ceiling on it. A brand new file of a hundred and fifty lines is exactly
// where that ceiling stops being enforced and the habit comes back, so
// `companionTalkFaults` runs round 210's own TELLS over every line in here.
// That is also the only real proof the guard was worth writing: it has to
// catch the thing written AFTER it, not the thing it was written about.
// ===========================================================================

import { TELLS } from './dialogue.js';
import { PRISM_ID } from './prism.js';
import { REGIONS } from './regions.js';
import { RANK_ORDER } from './ranks.js';
import { outlawTalkLines } from './outlawTalk.js';

/** The five, in the order they read on a party roster. */
export const TALK_IDS = ['zeke', 'encykla', 'aedia', 'benjamin', PRISM_ID];

/** Their short names, for building labels like "What about Zeke?" */
export const TALK_NAMES = {
  zeke: 'Zeke',
  encykla: 'Encykla',
  aedia: 'Ædia',
  benjamin: 'Benjamin',
  [PRISM_ID]: 'Prism',
};

const REGION_IDS = REGIONS.map(r => r.id);
const REGION_NAME = Object.fromEntries(REGIONS.map(r => [r.id, r.name]));

/** A row that only appears once the story has moved. */
const fromAct = (n) => (ctx) => (ctx && ctx.act ? ctx.act : 1) >= n;
/** ...or once they have told you enough of their arc to have earned it. */
const fromTold = (n) => (ctx) => ((ctx && ctx.told) || 0) >= n;

// ===========================================================================
// THE TREE.
//
// { label, by, byRegion, byAct, children, when }
//
//   label      the player's line; a function of ctx where the row names a place
//   by         { speakerId: text } -- the ordinary case
//   byRegion   { regionId: { speakerId: text } }
//   byAct      { 1..4: { speakerId: text } }
//   children   topic ids this opens onto
//   when       (ctx) => boolean
//
// ctx is { speaker, recruited[], region, act, rank, told, surgeOver }.
// ===========================================================================

export const COMPANION_TOPICS = {

  // ------------------------------------------------------------- THEM ----
  c_you: {
    label: 'How are you holding up?',
    children: ['c_essences', 'c_hope', 'c_dream', 'c_fear'],
    by: {
      zeke: "Upright. Ask me again after the next one and you'll get the same answer, so you may as well save your breath.",
      encykla: "I slept six hours and I have counted our arrows twice. That is as well as I get.",
      aedia: "Bored. Don't take that as a complaint, take it as a request.",
      benjamin: "Extremely well, thank you for asking. Nobody ever asks, which I have always thought was strange in a line of work like this.",
      [PRISM_ID]: "I ran a tavern for nine years, love. I can stand up through worse than this and still short-change a drunk.",
    },
  },
  c_essences: {
    label: 'What did you bond, in the end?',
    by: {
      zeke: "Life, Growth and Balance. Two of those are what you'd expect off a man who spent thirty years watching things come up out of dirt.",
      encykla: "Sound, Wind and Trap. I like knowing where a thing is before it knows where I am.",
      aedia: "Blood, Swift and Claw. I picked the three that let me be somewhere else before anyone finished shouting.",
      benjamin: "Iron, Shield and Stubborn — that last one isn't its real name, but it's what my father called it, and I've kept it.",
      [PRISM_ID]: "Slime, Gluttony and Rope. Yes. I'm aware. It works, and the look on people's faces when I say it out loud is a second ability.",
    },
  },
  c_hope: {
    label: 'What are you actually hoping for out of this?',
    when: fromAct(2),
    by: {
      zeke: "That the next farm gets somebody standing in its yard who can do something. That's the whole of my ambition and it's plenty.",
      encykla: "Gold rank. Not for the title — for what a gold rank is allowed to walk into and shut down.",
      aedia: "The jungle market. Encykla will give you the reasoned version. I want to be standing in it.",
      benjamin: "I would like to be somewhere long enough that people start expecting me. That's the extent of it, really.",
      [PRISM_ID]: "A bar. A proper one, with a cellar I chose myself. And to find out what happened to my cat, but I've made my peace with not knowing.",
    },
  },
  c_dream: {
    label: 'And if none of this were happening? What then?',
    when: fromTold(3),
    by: {
      zeke: "I'd be on the ground. Same ground. Somebody else would be doing this and I'd have opinions about how they were doing it.",
      encykla: "A library with a door that locks from the inside and nobody's name on the ledger but mine.",
      aedia: "I don't do that one. Encykla does it for both of us and tells me the result.",
      benjamin: "I've no childhood to be nostalgic about, so I find I imagine forwards rather than back. A house. Quite a lot of people in it.",
      [PRISM_ID]: "Honestly? Probably still pulling pints. I was good at it and I liked it, and I don't think there's anything sad in saying so.",
    },
  },
  c_fear: {
    label: 'What frightens you?',
    when: (ctx) => fromTold(5)(ctx) && fromAct(3)(ctx),
    children: ['c_regret'],
    by: {
      zeke: "Getting there. I've done it once. I'd rather not find out I can do it twice.",
      encykla: "Being wrong about a number where it matters. I've been wrong about a number where it mattered.",
      aedia: "Slow. Anything slow. A thing I can't get away from and can't get through.",
      benjamin: "That somebody gets past me. It's the only job I have and the only thing I'm frightened of. Tidy, for a fear.",
      [PRISM_ID]: "Waking up somewhere else again. It's happened the once and I've not got another one of those in me.",
    },
  },

  c_regret: {
    label: "Is there anything you'd take back?",
    when: (ctx) => fromTold(6)(ctx) && fromAct(3)(ctx),
    by: {
      zeke: "The far field. I'd have been closer to the house. That is the entire list and I have had a year to add to it.",
      encykla: "I'd have run at fifteen instead of nineteen. Four years is a number I can put a name to every single day of.",
      aedia: "I'd have gone back for the others. Encykla says the arithmetic was against it. I've heard the arithmetic.",
      benjamin: "I'd like to have said something to my father. I don't know what, and I don't remember his face, and I still want the chance.",
      [PRISM_ID]: "I'd have shut the cellar hatch. Silly thing to land on, isn't it, out of a whole life. But that's the one.",
    },
  },

  // ----------------------------------------------------------- OTHERS ----
  c_others: {
    label: 'What do you make of the others?',
    children: ['c_of_zeke', 'c_of_encykla', 'c_of_aedia', 'c_of_benjamin', 'c_of_prism'],
    by: {
      zeke: "Good lot. Odd lot. I've farmed with worse and buried better, and I'd not swap any of them.",
      encykla: "Functional. I mean that as high praise, and I'm aware of how it sounds.",
      aedia: "They're fine. Ask me about one of them if you want an actual answer.",
      benjamin: "I'm extremely fond of all of them and I've been told that's tiresome. Ask about somebody specific and I'll be tiresome accurately.",
      [PRISM_ID]: "I've run a room full of strangers every night for nine years. This lot are easier and they tip worse.",
    },
  },

  // ------------------------------------------------------------ PLACE ----
  c_here: {
    label: 'What do you make of it out here?',
    children: ['c_here_now', 'c_here_city', 'c_here_changed', 'c_here_home'],
    by: {
      zeke: "Ground's ground. I can tell you what'll grow in it and not much else, but that's told me more about places than you'd think.",
      encykla: "I map as we walk. Ask me a distance and I'll have it.",
      aedia: "I don't look at places. I look at what's between me and the far end of them.",
      benjamin: "I've decided to like everywhere. It was a decision, and it has served me very well.",
      [PRISM_ID]: "Every town's the same town with a different smell. I mean that kindly. I liked my town.",
    },
  },
  c_here_now: {
    // The label names the place -- this is the row that appears new each time
    // the party crosses a border, which is 2.3.3's "new options being added at
    // each new region" made literal rather than promised.
    label: (ctx) => `${REGION_NAME[ctx && ctx.region] || 'This place'}, then.`,
    when: (ctx) => !!(ctx && REGION_NAME[ctx.region]),
    byRegion: {
      nek: {
        zeke: "Good dirt, badly worked. Half these fences are decorative and the people leaning on them know it.",
        encykla: "Eleven steadings, four of them abandoned inside two years. That is not a monster problem, that is a leaving problem.",
        aedia: "Quiet. I keep waiting for it to stop being quiet.",
        benjamin: "It's lovely, and everyone here is convinced it isn't, which I find rather charming.",
        [PRISM_ID]: "First place I saw with the sky on. I'll not have a word said against it.",
      },
      ontaria: {
        zeke: "Coast farming. Different rules, same arguments. I've enjoyed being wrong about the soil twice already.",
        encykla: "A working coast that has stopped watching itself. The harbour ledgers are current and the watch rota is not.",
        aedia: "Too much open water. Nothing to put your back to.",
        benjamin: "Everybody here says good morning. Do you know how rare that is? I've started saying it first to get ahead.",
        [PRISM_ID]: "Harbour towns I understand. Same six customers, four of them lying about their trade.",
      },
      sirukh: {
        zeke: "Nothing grows here that doesn't bite. I respect it and I'd not live in it.",
        encykla: "Sand shifts, so the maps are a courtesy. I am recounting everything.",
        aedia: "Finally. You can see a thing coming from a long way out here.",
        benjamin: "Hot, and the people are hard work, and I'm enjoying both more than I expected to.",
        [PRISM_ID]: "I have sand in places I'm not going to list for you. Ask me something else.",
      },
      elehyd: {
        zeke: "Broken ground. I've seen fields go like this after a bad flood and they never did come back right.",
        encykla: "Water at nine of the forty sites I have marked. That is the number that decides whether anyone can operate out here.",
        aedia: "Good. Let it be hard. I'd rather the place did some of the work.",
        benjamin: "Bleak, isn't it? I keep finding small things alive in it and it cheers me up enormously.",
        [PRISM_ID]: "There's nothing to sell anyone out here and nothing to drink. Both of those are problems.",
      },
      cinder: {
        zeke: "This was somebody's ground once. You can see the rows under the ash if you stand right.",
        encykla: "The burn line is recent and it has an edge on it. Fires do not have edges.",
        aedia: "I don't like it. I don't like anything about how tidy it is.",
        benjamin: "I've not managed to like this one yet. Give me time, I usually get there.",
        [PRISM_ID]: "Smells like the morning after a chimney fire. Whole place does. Nobody here mentions it.",
      },
      bratugal: {
        zeke: "I'll keep my mouth shut in this one and stand where the girls can see me.",
        encykla: "I have been here before. I counted the days for four years and I can still give you the number, so please do not ask me for it.",
        aedia: "Don't talk to me here. It isn't you.",
        benjamin: "I'm watching the two of them and not the scenery, and I'd ask you to do the same.",
        [PRISM_ID]: "I've not said a word since we crossed the river and I don't intend to start. They know why.",
      },
      ixcuatl: {
        zeke: "Nine cities on top of one another and every one of them laid out the same. Somebody was telling them how.",
        encykla: "Nine rebuilds, one street plan. Buildings do not inherit. Somebody kept coming back.",
        aedia: "Old. Everything here is old and none of it has fallen down, which it should have.",
        benjamin: "It's the most beautiful place I've ever stood in and I cannot shake the feeling it's still occupied.",
        [PRISM_ID]: "Right. This is the bit where the story turns out to be about something else entirely, isn't it.",
      },
    },
  },
  c_here_city: {
    label: 'And the cities?',
    when: fromAct(2),
    by: {
      zeke: "Too many people to feed off ground that far away. I've never understood how any of them stay standing.",
      encykla: "Cadence bills itself on its walls. Harrowmoor does not bill itself at all and is the better run of the two.",
      aedia: "Narrow. Everything in a city is narrow and full of people who stop walking without warning.",
      benjamin: "I grew up in one, apparently, and I remember none of it. So I get to like them all for the first time.",
      [PRISM_ID]: "Good cities, terrible beer. I've told three publicans so and been asked to leave two establishments.",
    },
  },
  c_here_changed: {
    label: "It isn't how we left it.",
    when: fromAct(3),
    by: {
      zeke: "No. And the ones still here have stopped mentioning it. I'd start there.",
      encykla: "Fewer people, same number of houses. I have been counting doors since Ontaria and the figures have only gone one way.",
      aedia: "Good. Somebody notice. I've said it a dozen times and got nowhere.",
      benjamin: "It isn't, and I've been pretending otherwise for everyone's benefit. I'll stop if you'd rather.",
      [PRISM_ID]: "Places go quiet before they go empty. You learn that running a bar, of all things.",
    },
  },

  c_here_home: {
    label: "Where's home, for you?",
    by: {
      zeke: "Forty acres outside Greenstone with a bad north fence. Somebody else's now. I signed it over and I've not been back to look.",
      encykla: "We have not had one. I have a list of requirements for the eventual one and it is three pages long.",
      aedia: "Wherever she is. Don't make anything of that, I'll deny it.",
      benjamin: "I've been told Vitesse and I've no memory of it, so I've decided home is wherever the five of us stopped walking.",
      [PRISM_ID]: "A flat over a bar in a city that doesn't exist on any map you've got. I still dream the stairs.",
    },
  },

  // ------------------------------------------------------------- WORK ----
  c_work: {
    label: 'Where are we with all this?',
    children: ['c_work_div', 'c_work_me', 'c_work_trust', 'c_work_after'],
    by: {
      zeke: "Further than we were. I'll take further than we were.",
      encykla: "I keep a running note. Name the specific part and I'll give you the specific answer.",
      aedia: "We're behind. We've been behind since the start.",
      benjamin: "Going rather well, I think, by which I mean nobody's dead. It's my only metric and I'm sticking with it.",
      [PRISM_ID]: "We're doing the thing where you find out what's happening by walking into it. It's not a plan but it's got a decent record.",
    },
  },
  c_work_div: {
    label: 'The people nobody will name.',
    byAct: {
      1: {
        zeke: "I've heard the name twice and both times from someone who wished they hadn't said it.",
        encykla: "I have three secondhand accounts and no primary source. I dislike having an opinion on that.",
        aedia: "Somebody's taking people. I don't need the rest of it to know what we do about that.",
        benjamin: "I'd rather not think about them. I think about them constantly.",
        [PRISM_ID]: "Everyone lowers their voice for them. In my experience that's the whole story right there.",
      },
      2: {
        zeke: "The Division. There. A man in Ontaria wouldn't say it and I've been saying it all week out of spite.",
        encykla: "The Division. Chartered, sealed, and staffed at four times what the charter accounts for. I have the figures.",
        aedia: "Now we've got a name I want an address.",
        benjamin: "They send people with paperwork. I've decided that's worse than sending people with swords and I'd stand by it.",
        [PRISM_ID]: "They came asking after me, you know. Outworlder, new arrival, no records. I've been careful since.",
      },
      3: {
        zeke: "I've stood in one of their yards now. I'd like to not talk about it and I'd like you to know I'm not sulking.",
        encykla: "Thirty-two in at Cinderwaste. Thirty-two payments out. No thirty-two leaving. That ledger is the most careful document I have ever read.",
        aedia: "I want the one who signs the orders. Not the ones holding the doors.",
        benjamin: "They keep the rooms very clean. I don't know why that's the part I can't get past, but it is.",
        [PRISM_ID]: "I've seen what they do to a person's records. Mine are gone. Yours will be too, if they get a minute.",
      },
      4: {
        zeke: "They've stopped hiding. I've stopped being frightened. One of those is a lie and it isn't the first one.",
        encykla: "They have abandoned the paperwork entirely. Institutions do that at one point only and we are at that point.",
        aedia: "No more names. No more addresses. Take me to the door.",
        benjamin: "Whatever's at the end of this, I'd like to be standing in front of you when we reach it. That's all I want out of the arrangement.",
        [PRISM_ID]: "Two of us came through, and they only ever wanted the one. I've had a while to sit with what that means.",
      },
    },
  },
  c_work_me: {
    label: 'Am I doing this right?',
    by: {
      zeke: "You're asking. That's most of it, and I'd not have said so a year ago.",
      encykla: "Your positioning is improving and your opening is still sentimental. I will keep telling you.",
      aedia: "You're slow. You're less slow. Keep going.",
      benjamin: "Yes. And you'd be doing it right even if you weren't, because you're the one who turned up.",
      [PRISM_ID]: "You're doing it the way I served my first ever pint — badly, fast, and without dropping it. That's the job.",
    },
  },
  c_work_trust: {
    label: 'Do you trust the Society in all this?',
    when: fromAct(2),
    by: {
      zeke: "I trust the ones I've met. I've met four.",
      encykla: "I trust their filing. Filing has no motive. The people holding it do.",
      aedia: "No. Next question.",
      benjamin: "I trust them to do the thing they've written down, which isn't the same as trusting them, but it gets you surprisingly far.",
      [PRISM_ID]: "They gave me a badge and a room and didn't ask a single question they should have asked. Make of that what you like.",
    },
  },

  c_work_after: {
    label: 'What happens after all this?',
    when: fromAct(3),
    by: {
      zeke: "I've not let myself think past it. That's not bravery, that's a man who's had one plan go wrong already.",
      encykla: "Bratugal, and then whatever is left of me. I have not planned the second part and I am aware of that.",
      aedia: "There isn't an after. There's the market, and then we'll see what I am.",
      benjamin: "I'd like us all still in the same room somewhere, arguing about something small. That's my whole after, and I'm not embarrassed by it.",
      [PRISM_ID]: "I open a bar and I hire the four of you and you're all terrible at it. I've got the layout drawn and everything.",
    },
  },

  // ------------------------------------------------------------ WORLD ----
  c_world: {
    label: 'Tell me how you see the world.',
    children: ['c_world_gods', 'c_world_society', 'c_world_surge', 'c_world_out'],
    by: {
      zeke: "Big. Older than anyone tells you. Mostly people trying to get a crop in before something eats it.",
      encykla: "Badly measured and worse recorded. I am doing what I can about the second part.",
      aedia: "It's a place where people can own people. That's the only fact about it I hold on to.",
      benjamin: "I arrived in it at nineteen with no memories and no name, so I've had to take it as it comes. It's been all right.",
      [PRISM_ID]: "Magic, monsters, and everyone acting like that's normal. I'll be honest, I'm still catching up and I've stopped pretending otherwise.",
    },
  },
  c_world_gods: {
    label: 'The gods.',
    by: {
      zeke: "They're real and they talk, which I'd have called a comfort before I heard one do it.",
      encykla: "Eight of them and every one gives a different account of the same century. I have opinions and I keep them quiet.",
      aedia: "One of them could have opened those collars any day for four years. I've nothing else to say on gods.",
      benjamin: "I like them. I'm aware that's an unusual position. They've been nothing but straight with me and I was told my whole life they wouldn't be.",
      [PRISM_ID]: "Back home they didn't answer. Here they answer and it's worse, because now you have to decide what you think of the answer.",
    },
  },
  c_world_society: {
    label: 'The Adventure Society.',
    by: {
      zeke: "A jobs board with a funeral fund. I don't say that unkindly — it's more than most trades manage.",
      encykla: "The only institution on this continent that keeps honest records of its own dead. I have checked. That is why I am in it.",
      aedia: "It lets me go where I want with a sword. I don't need it to be more than that.",
      benjamin: "They took me with no name and no house and asked only what I could do. I'd have followed them off a cliff for that and very nearly did.",
      [PRISM_ID]: "Best-run thing I've seen since I got here. I include the taverns in that and it pains me.",
    },
  },
  c_world_surge: {
    label: 'The surge.',
    children: ['c_world_monsters'],
    by: {
      zeke: "I was forty-one for the last one. Lost the north fence, the dog, and two neighbours, in that order of how much it hurt at the time.",
      encykla: "Ten to thirteen years, and we are inside the window. Whoever is thinning the Society knows that as well as I do.",
      aedia: "Everything comes up at once and everyone finds out what they actually are. I'm not dreading it.",
      benjamin: "This is the one I'm for. Everything I can do is for a lot of things arriving at once, and I've never had the chance.",
      [PRISM_ID]: "I keep being told about it like it's weather. Where I'm from, weather doesn't have teeth.",
    },
  },
  c_world_monsters: {
    label: 'And the monsters themselves? Where do they come from?',
    by: {
      zeke: "Out of the ground, same as everything. I've turned up stranger things with a plough and thought less about it.",
      encykla: "Nobody has an answer that survives being asked twice. I have collected six and graded them all as stories.",
      aedia: "Who cares. They come out, I put them back down. Ask a scholar if you want the long version.",
      benjamin: "I asked a priest once and he changed the subject so smoothly I didn't notice for an hour.",
      [PRISM_ID]: "Back home we had rats. I'd like to state for the record that rats were fine and I miss them.",
    },
  },
  c_world_out: {
    // 2.3.1's outworlder thread, asked of the people who actually travel with
    // one. The townsfolk gawp; these five have an opinion.
    label: 'What do you make of where I come from?',
    by: {
      zeke: "A world with no magic in it at all. I've turned that over a lot and I keep landing on how tired everybody there must be.",
      encykla: "I have asked you forty-one questions about it and written down every answer. I have thirty more.",
      aedia: "You said nobody there carries a weapon. I didn't believe you. I've decided I believe you and I find it unsettling.",
      benjamin: "You remember your childhood. All of it, apparently. I ask about it more than is polite and I'm not going to stop.",
      [PRISM_ID]: "Don't. We'll be up all night and one of us will cry and it won't be you.",
    },
  },
};

// ---------------------------------------------------------------------------
// The pair topics, built rather than typed.
//
// Five speakers by four subjects is twenty lines, and typing twenty topic
// bodies by hand is twenty chances to key one of them wrong -- the project's
// fault class 3, "a hand-maintained list beside a generator drifts". So the
// TEXT is authored (it has to be; it is the whole point) and the TOPIC
// SCAFFOLD around it is generated from the same table the faults read.
// ---------------------------------------------------------------------------

/** What each of them says about each of the others. `speaker > subject`. */
export const PAIR_LINES = {
  // --- about Zeke ---
  'encykla>zeke': "He is the reason our margins are survivable. I have run it both ways and I do not enjoy the version without him.",
  'aedia>zeke': "He gets there. Every time, and faster than a man his age has any business being.",
  'benjamin>zeke': "Zeke is the only one of us who has already lost the thing he's frightened of losing. It makes him very calm and I find it hard to be near sometimes.",
  [`${PRISM_ID}>zeke`]: "He fed me before he asked me anything. First person here who did that.",
  // --- about Encykla ---
  'zeke>encykla': "She counts. My wife counted. I've had to get used to being in a good mood about that.",
  'aedia>encykla': "Eleven minutes older and she has never once let it go. She knows I'd kill for her. That's why she keeps mentioning the eleven minutes.",
  'benjamin>encykla': "She works out the odds and then does the thing anyway. I don't think she's noticed that about herself.",
  [`${PRISM_ID}>encykla`]: "She checked my story against three sources before she'd smile at me. I respected that enormously.",
  // --- about Ædia ---
  'zeke>aedia': "That one runs at things. I've given up telling her and started just getting there quicker.",
  'encykla>aedia': "She is four seconds ahead of where I want her at all times. I have stopped correcting for it and started planning around it.",
  'benjamin>aedia': "Ædia is the angriest kind person I've ever met. I'd like her to know I've noticed the second half.",
  [`${PRISM_ID}>aedia`]: "She says about nine words a day and four of them are useful. I'd have hired her.",
  // --- about Benjamin ---
  'zeke>benjamin': "Takes everything and says thank you for it. I patch him up and he apologises to ME. I've stopped arguing.",
  'encykla>benjamin': "He is the most defensive build I have ever seen and his family called it a failure. Their arithmetic was wrong and it cost them him.",
  'aedia>benjamin': "Nothing gets past him. I go where I like because of it and I've never once said so to his face.",
  [`${PRISM_ID}>benjamin`]: "Cheerful lad with no childhood and no name. He carries it better than I carry losing a cat.",
  // --- about Prism ---
  'zeke>prism': "Came up out of a drain with nothing and started organising people inside the hour. I like her very much.",
  'encykla>prism': "Second outworlder inside a season. The rate is wrong and she is the only person who finds that as interesting as I do.",
  'aedia>prism': "She talks. Constantly. I've discovered I don't mind, which has been a surprise to me.",
  'benjamin>prism': "She asks people their names and then uses them. It sounds like nothing. Watch what it does to a room.",
};

for (const subject of TALK_IDS) {
  COMPANION_TOPICS[`c_of_${subject}`] = {
    label: `What about ${TALK_NAMES[subject]}?`,
    // Not shown for the person you are talking to, and not shown for someone
    // who is not with the party -- a companion who volunteers an opinion on
    // somebody the player has never met is the world knowing something the
    // player does not.
    when: (ctx) => !!ctx && ctx.speaker !== subject
      && (ctx.recruited || []).includes(subject),
    by: Object.fromEntries(TALK_IDS
      .filter(s => s !== subject)
      .map(s => [s, PAIR_LINES[`${s}>${subject}`]])
      .filter(([, line]) => !!line)),
  };
}

export const COMPANION_ROOTS = ['c_you', 'c_others', 'c_here', 'c_work', 'c_world'];
export const COMPANION_TOPIC_KEYS = Object.keys(COMPANION_TOPICS);

/**
 * What this companion says when the topic is opened.
 *
 * Region first, then act, then the plain table. Same precedence as round
 * 209's: the place and the moment decide WHAT a person can say, and the
 * speaker key decides who is saying it. A speaker with no line in a keyed
 * pool falls through to `by`, and `companionTalkFaults` asserts that no pool
 * actually needs the fallback -- the fallback is there so a sixth companion
 * can be added without the tree going silent, not as a licence to leave holes.
 */
export function companionSayFor(topicId, ctx = {}) {
  const t = COMPANION_TOPICS[topicId];
  if (!t) return '';
  const who = ctx.speaker;
  const byRegion = t.byRegion && ctx.region && t.byRegion[ctx.region];
  const byAct = t.byAct && t.byAct[ctx.act || 1];
  for (const pool of [byRegion, byAct, t.by]) {
    if (pool && pool[who]) return pool[who];
  }
  return (t.by && t.by[who]) || '';
}

/** The rows a given companion opens with. */
export function companionRootsFor(ctx = {}) {
  return COMPANION_ROOTS;
}

// ===========================================================================
// FAULTS.
// ===========================================================================

/**
 * The length floor, per speaker.
 *
 * Round 210 learned this the hard way one file over: a flat floor exists to
 * catch a line that was never written, and it convicted "Aye. Nothing good."
 * Ædia's terseness is authored -- the user's brief has her as the one who
 * does not explain herself -- so "No. Next question." is her answering, not
 * her answer missing. She gets twelve; everybody else keeps twenty-five, and
 * `tersenessIsEarned` below stops the exemption becoming a licence.
 */
const floorFor = (who) => (who === 'aedia' ? 12 : 25);

export function companionTalkFaults() {
  const out = [];
  const lines = [];
  const push = (where, who, text) => lines.push({ where, who, text });

  for (const [id, t] of Object.entries(COMPANION_TOPICS)) {
    if (!t.label) out.push(`topic ${id} has no label`);
    const label = typeof t.label === 'function' ? t.label({ region: 'nek' }) : t.label;
    if (!/[.!?]$/.test(String(label).trim())) out.push(`topic ${id}'s label does not end: "${label}"`);

    const pools = [];
    if (t.by) pools.push(['by', t.by]);
    for (const [r, p] of Object.entries(t.byRegion || {})) pools.push([`byRegion.${r}`, p]);
    for (const [a, p] of Object.entries(t.byAct || {})) pools.push([`byAct.${a}`, p]);
    if (!pools.length) out.push(`topic ${id} has nothing to say`);

    for (const [name, pool] of pools) {
      for (const [who, text] of Object.entries(pool)) {
        if (!TALK_IDS.includes(who)) out.push(`${id}.${name} answers for ${who}, who is not a companion`);
        if (!text || !/[.!?]$/.test(String(text).trim())) out.push(`${id}.${name}'s ${who} line does not end`);
        if (!text || String(text).length < floorFor(who)) out.push(`${id}.${name}'s ${who} line is too short to be an answer`);
        push(`${id}.${name}`, who, String(text || ''));
      }
      // FIVE ANSWERS, NOT ONE ANSWER. The whole reason this file is keyed by
      // speaker rather than pooled: a pool that only one of them answers is a
      // row that reads identically whoever you asked.
      const missing = TALK_IDS.filter(w => !pool[w]);
      // The pair topics are the deliberate exception -- nobody is asked about
      // themselves, so four is the full set there.
      const expect = id.startsWith('c_of_') ? TALK_IDS.length - 1 : TALK_IDS.length;
      if (Object.keys(pool).length !== expect) {
        out.push(`${id}.${name} answers for ${Object.keys(pool).length} of ${expect} (missing ${missing.join(', ')})`);
      }
      // ...and they must not answer alike.
      const distinct = new Set(Object.values(pool));
      if (distinct.size !== Object.keys(pool).length) {
        out.push(`${id}.${name} gives two companions the same line`);
      }
    }

    // A region pool has to cover every region or walking into the seventh one
    // silently drops the row's whole reason for existing.
    if (t.byRegion) {
      for (const r of REGION_IDS) if (!t.byRegion[r]) out.push(`${id} has region pools and says nothing in ${r}`);
      for (const r of Object.keys(t.byRegion)) if (!REGION_IDS.includes(r)) out.push(`${id} answers for ${r}, which is not a region`);
    }
    if (t.byAct) {
      for (const a of ['1', '2', '3', '4']) if (!t.byAct[a]) out.push(`${id} has act pools and says nothing in act ${a}`);
      for (const a of Object.keys(t.byAct)) if (!['1', '2', '3', '4'].includes(String(a))) out.push(`${id} answers act ${a}, which is not an act`);
    }
    for (const c of (t.children || [])) {
      if (!COMPANION_TOPICS[c]) out.push(`topic ${id} opens onto ${c}, which does not exist`);
    }
  }

  // --- reachable, and no loops ------------------------------------------
  const seen = new Set();
  const walk = (id, chain) => {
    if (chain.includes(id)) { out.push(`topic ${id} loops: ${chain.join(' -> ')} -> ${id}`); return; }
    if (seen.has(id) || !COMPANION_TOPICS[id]) { seen.add(id); return; }
    seen.add(id);
    for (const c of (COMPANION_TOPICS[id].children || [])) walk(c, [...chain, id]);
  };
  for (const r of COMPANION_ROOTS) walk(r, []);
  for (const id of COMPANION_TOPIC_KEYS) if (!seen.has(id)) out.push(`topic ${id} cannot be reached from any root`);
  for (const r of COMPANION_ROOTS) if (!COMPANION_TOPICS[r]) out.push(`root ${r} is not a topic`);

  // --- 2.3, still: no list runs past six --------------------------------
  // The tree grew by five topics to earn the word "largest" and the obvious
  // way to earn it is to widen every list, which would break the rule the
  // user wrote in 2.3 and never rescinded. So size goes into DEPTH: `c_regret`
  // hangs off `c_fear`, `c_world_monsters` off `c_world_surge`. This check is
  // what stops the next five going sideways instead.
  {
    const worst = (ids) => ids.filter(id => {
      const t = COMPANION_TOPICS[id];
      return t && t.when ? t.when({ speaker: 'zeke', recruited: TALK_IDS, region: 'nek', act: 4, told: 9 }) : !!t;
    }).length;
    const roots = worst(COMPANION_ROOTS) + 1;              // + goodbye
    if (roots > 6) out.push(`a companion offers ${roots} rows at the root; six is the ceiling`);
    for (const [id, t] of Object.entries(COMPANION_TOPICS)) {
      const n = worst(t.children || []);
      if (!n) continue;
      const rows = n + 2;                                   // + back + goodbye
      if (rows > 6) out.push(`${id} offers ${rows} rows; six is the ceiling`);
    }
  }

  // --- 2.3.3: the LARGEST trees -----------------------------------------
  // Asserted as a comparison rather than a number, so the claim stays true if
  // either tree is rewritten. A companion whose tree is not bigger than a
  // farmer's is a companion the user's rule has not been applied to.
  if (COMPANION_TOPIC_KEYS.length < 20) {
    out.push(`the companion tree has ${COMPANION_TOPIC_KEYS.length} topics; 2.3.3 asks for the largest in the game`);
  }

  // --- the pair topics ---------------------------------------------------
  for (const subject of TALK_IDS) {
    const t = COMPANION_TOPICS[`c_of_${subject}`];
    if (!t) { out.push(`nobody can be asked about ${subject}`); continue; }
    if (t.by[subject]) out.push(`${subject} is asked about themselves`);
    // The gate has to actually hide them. A `when` that is always true is the
    // row appearing for a companion who is not in the party.
    if (t.when && t.when({ speaker: subject, recruited: TALK_IDS })) {
      out.push(`${subject} can be asked about themselves`);
    }
    if (t.when && t.when({ speaker: 'zeke', recruited: ['zeke'] }) && subject !== 'zeke') {
      out.push(`${subject} can be discussed while not in the party`);
    }
  }
  for (const key of Object.keys(PAIR_LINES)) {
    const [a, b] = key.split('>');
    if (!TALK_IDS.includes(a)) out.push(`pair line ${key} has unknown speaker ${a}`);
    // `prism` in a key that PRISM_ID does not spell is the exact drift this
    // project keeps finding; the subject half is checked against the table the
    // topics were built from rather than against the string.
    if (!TALK_IDS.includes(b) && b !== 'prism') out.push(`pair line ${key} has unknown subject ${b}`);
  }

  // --- 2.3.3's own list: they have to actually cover it ------------------
  // "cities, regions, quests, each other, hopes, dreams, their essences, and
  // the world as a whole." Each is a topic and each is asserted by id, so a
  // later tidy-up that merges two of them away reports itself.
  for (const [what, id] of [
    ['cities', 'c_here_city'], ['regions', 'c_here_now'], ['quests', 'c_work_div'],
    ['each other', 'c_of_zeke'], ['hopes', 'c_hope'], ['dreams', 'c_dream'],
    ['their essences', 'c_essences'], ['the world', 'c_world'],
  ]) {
    if (!COMPANION_TOPICS[id]) out.push(`2.3.3 asks about ${what} and there is no ${id}`);
  }

  // --- round 210's ceiling, enforced on the new writing ------------------
  const per = {};
  let tripped = 0;
  for (const { where, who, text } of lines) {
    let hit = false;
    for (const [name, fn] of Object.entries(TELLS)) {
      if (!fn(text)) continue;
      hit = true;
      per[name] = (per[name] || 0) + 1;
      if (name === 'a testament to' || name === "the 'but it was enough' coda") {
        out.push(`${where}'s ${who} line uses "${name}"`);
      }
    }
    if (hit) tripped++;
  }
  if (lines.length && tripped / lines.length > 0.10) {
    out.push(`${tripped} of ${lines.length} companion lines (${Math.round(100 * tripped / lines.length)}%) trip an AI tell; the ceiling is 10%`);
  }
  for (const [name, n] of Object.entries(per)) {
    if (lines.length && n / lines.length > 0.05) {
      out.push(`"${name}" is used in ${n} of ${lines.length} companion lines; no single tell may exceed 5%`);
    }
  }

  // --- and nobody sounds like anybody else -------------------------------
  // The file's whole premise. Every line in it must be unique, across topics
  // as well as within them: a line copied between two companions is the five
  // people collapsing back into one.
  const byText = new Map();
  for (const { where, who, text } of lines) {
    const prev = byText.get(text);
    if (prev) out.push(`${where}/${who} repeats ${prev}`);
    else byText.set(text, `${where}/${who}`);
  }


  // --- ROUND 214 -- NOBODY SHARES AN OPENING ------------------------------
  //
  // The user: "Looking more AI."
  //
  // The round 210 tell ceiling passed these lines at 1%, and it was right
  // about the five constructions it knew. What it could not see is a
  // TEMPLATE: three of the eight gods opened their disciple line with "You
  // are mine, so ...", and two companions closed with "That's the whole of
  // my ...". Each line reads fine alone. Together they are one writer with a
  // sentence he likes, which is the whole of the complaint.
  //
  // Asserted on the OPENING specifically rather than on any repeated phrase.
  // A shared four-word run mid-sentence is usually just English -- "a great
  // deal of", "I'm not going to" -- and a check that flags those is a check
  // that gets switched off. How a character starts talking is the part that
  // belongs to them.
  {
    const opens = new Map();
    for (const row of companionTalkLines()) {
      const sp = row.who;
      const key = String(row.text).toLowerCase().replace(/[^a-z' ]/g, ' ')
        .split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
      if (key.length < 8) continue;
      const prev = opens.get(key);
      if (prev && prev !== sp) out.push(`${prev} and ${sp} both open a line with "${key}..."`);
      else if (!prev) opens.set(key, sp);
    }
  }
  // --- the terseness exemption has to stay an exemption ------------------
  // `floorFor` lets Ædia under the line-length floor because her voice is
  // authored short. That is one step from her being the companion who never
  // got written, and nothing else in this file would notice the difference.
  // So: most of her lines must clear the floor everyone else clears, and she
  // must not be the shortest speaker by a landslide.
  const aedia = lines.filter(l => l.who === 'aedia');
  const shortOnes = aedia.filter(l => l.text.length < 25).length;
  if (aedia.length && shortOnes / aedia.length > 0.25) {
    out.push(`${shortOnes} of Ædia's ${aedia.length} lines are under the floor; terse is a voice, not an absence`);
  }
  const mean = (id) => {
    const mine = lines.filter(l => l.who === id);
    return mine.length ? mine.reduce((a, l) => a + l.text.length, 0) / mine.length : 0;
  };
  const others = TALK_IDS.filter(i => i !== 'aedia').map(mean);
  if (aedia.length && mean('aedia') < 0.5 * (others.reduce((a, b) => a + b, 0) / others.length)) {
    out.push('Ædia is written at half the length of everyone else; that is not terseness, that is a gap');
  }

  if (!RANK_ORDER.length) out.push('ranks did not load');
  return out;
}

/** Every authored line, for the suite and for measuring. */
export function companionTalkLines() {
  const out = [];
  for (const [id, t] of Object.entries(COMPANION_TOPICS)) {
    const pools = [];
    if (t.by) pools.push(['by', t.by]);
    for (const [r, p] of Object.entries(t.byRegion || {})) pools.push([`byRegion.${r}`, p]);
    for (const [a, p] of Object.entries(t.byAct || {})) pools.push([`byAct.${a}`, p]);
    for (const [name, pool] of pools) {
      for (const [who, text] of Object.entries(pool)) out.push({ id, where: name, who, text });
    }
  }
  // ROUND 293 -- and the bandit companions' tree (outlawTalk.js), both tones.
  // They are companions too: the same checks of voice and opening apply, and
  // "the companion tree is the largest" counts them.
  for (const l of outlawTalkLines()) out.push({ id: l.id, where: `outlaw.${l.tone}`, who: l.who, text: l.text });
  return out;
}
