// ============================================================================
// ROUND 293 -- THE BANDIT COMPANIONS GET THEIR TREE.
//
//   5.7 "These bandit companions should have branching dialogue trees as
//        complex as the regular companions."
//   5.8 "Depending on if the player is an outlaw only due to their essence
//        or if they have embraced the depraved underworld and dark gods the
//        companions should adapt becoming either more evil in tune with the
//        player or more neutral."
//
// Same shape as companionTalk.js -- { label, children, when, by } -- and the
// same size: five roots, twenty-eight topics. The difference is that every
// answer is written TWICE. `by[who]` is { n, e }: what they say to a player
// who is an outlaw because of an essence and nothing more (n, neutral), and
// what they say to one who has embraced the underworld and the dark gods
// (e, evil). Which one is read is `companionTone` (depravity.js), passed in
// on ctx.tone.
//
// Before this round an outlaw opened the regulars' tree and every answer came
// back blank: they are not in its speaker list. Round 291's survey found it.
// ============================================================================

/** The four, in roster order. */
export const OUTLAW_TALK_IDS = ['lucy', 'jole', 'ariani', 'slice'];
/** The act regions, for the place-keyed topic (acts.js's spine). */
export const OUTLAW_REGIONS = ['nek', 'ontaria', 'sirukh', 'elehyd', 'cinder', 'bratugal', 'ixcuatl'];
export const OUTLAW_TALK_NAMES = { lucy: 'Lucy', jole: 'Jole', ariani: 'Ariani', slice: 'Slice' };

const fromAct = (n) => (ctx) => ((ctx && ctx.act) || 1) >= n;
const fromTold = (n) => (ctx) => ((ctx && ctx.told) || 0) >= n;

export const OUTLAW_TOPICS = {
  // ================================================================= ROOTS ==
  o_you: {
    label: 'How are you holding up?',
    children: ['o_past', 'o_want', 'o_fear', 'o_regret', 'o_essences'],
    by: {
      lucy: { n: "Fine. Fed, mostly. Feet hurt. That's a good day by anybody's count.",
        e: "Never better. We hit hard today and nobody hit back properly. I could do this forever." },
      jole: { n: "Solvent, spiritually speaking. Ask me again after the next fight; my accounts tend to fluctuate.",
        e: "Blessed. She has been very generous with us lately, and I am keeping careful note of every gift." },
      ariani: { n: "Bored, darling. Bored is my resting state. You're welcome to try and fix it.",
        e: "Wonderful. Something screamed today. I've been humming ever since." },
      slice: { n: "Operational. The pay is irregular and the company is tolerable. The Society never once managed both.",
        e: "Excellent. Every job this month has paid, and nobody who could object is left to object." },
    },
  },
  o_others: {
    label: 'What do you make of the others?',
    children: ['o_of_lucy', 'o_of_jole', 'o_of_ariani', 'o_of_slice', 'o_regulars', 'o_prism'],
    by: {
      lucy: { n: "They're all right. Strange, every one of them, but I'm the one who was raised by a bandit band in a tree, so who am I to talk.",
        e: "Good crew. Hard people. Nobody flinches. I like a crew where nobody flinches." },
      jole: { n: "A congregation of the unlikely. I find I'm fond of them, which Avarice warns against. Affection is a debt with no terms.",
        e: "Useful, all of them. She approves of usefulness. The fondness I keep in a separate column, small and well hidden." },
      ariani: { n: "A tank, a priest and a gentleman killer. It sounds like the start of a joke, and I keep waiting for the end.",
        e: "We're the worst people in any room we walk into. Isn't it lovely to finally belong somewhere?" },
      slice: { n: "Competent, mostly. Which, in this trade, is the same thing as trustworthy.",
        e: "A good set of tools. I'd sharpen one or two of them, but nobody asked me." },
    },
  },
  o_here: {
    label: 'What do you make of this place?',
    children: ['o_here_now', 'o_here_cities', 'o_here_crews', 'o_here_church'],
    by: {
      lucy: { n: "Too many walls. Walls make people think they're safe, and then they stop watching the gaps.",
        e: "Walls are just a list of everybody who thinks they're safe. I like reading lists." },
      jole: { n: "Every city is a ledger written in stone. I read who owes whom from the size of the houses.",
        e: "Rich. Look at the doorframes. Every one of them is a promise of what's behind it." },
      ariani: { n: "Dull, until somebody does something they shouldn't. Then it's the most interesting place in the world for an evening.",
        e: "Full of people who don't know yet what tonight is going to be like. I envy them a little." },
      slice: { n: "I grew up two regions from here in a house exactly like that one. It's smaller than I remember, and so am I.",
        e: "Soft. Every street is a back door if you're patient. I am very patient." },
    },
  },
  o_work: {
    label: 'About the work we do.',
    children: ['o_work_kill', 'o_work_take', 'o_work_me', 'o_work_after', 'o_work_div'],
    by: {
      lucy: { n: "It's work. Somebody's got it, we take it. Nobody out in the green ever told me there was a second way to look at that.",
        e: "Best work there is. You get paid to be strong. What else would anyone want to be paid for?" },
      jole: { n: "Everything has a price. We simply collect early, and in person. I've stopped pretending that's a philosophy.",
        e: "Sacred work. Every coin we lift is an offering, and every life a larger one. She keeps the book; we fill it." },
      ariani: { n: "The work's the boring part, darling. It's the bit right before and the bit right after that I'm here for.",
        e: "The work is the point. It always was. Everything else is waiting for the next one." },
      slice: { n: "Contract work. I prefer to know who's paying and what for. You'd be amazed how rarely anybody asks.",
        e: "Clean, profitable and nobody left to complain. I've worked for kings who did it worse." },
    },
  },
  o_world: {
    label: 'And the world out there?',
    children: ['o_world_society', 'o_world_gods', 'o_world_avarice', 'o_world_surge', 'o_world_division'],
    by: {
      lucy: { n: "Big. Bigger than the green, and louder, and everybody in it wants something, so I always know where I stand with them.",
        e: "It's ours if we want it. It's always been anybody's who wanted it hard enough." },
      jole: { n: "A marketplace that pretends it's a temple. I spent nineteen years on the temple side of the counter.",
        e: "A treasury with no guards worth the name. She showed me that, the first night, and I've never unseen it." },
      ariani: { n: "Full of people being careful. I've never understood careful. It looks like a slow way to die bored.",
        e: "A playground with the lights off. Come on. Let's find out who's still awake." },
      slice: { n: "Run by people who'd have me hanged and hire me the same week. I've learned not to take either personally.",
        e: "Run by fools who pay well. I plan to keep it that way for as long as I can." },
    },
  },

  // ========================================================== ABOUT THEM ==
  o_past: {
    label: 'Where did you come from?',
    by: {
      lucy: { n: "Out past the last road. The Thornbacks. Ma, two uncles, a dozen cousins, and a lot of goats that weren't ours to start with.",
        e: "The Thornbacks, out in the deep green. We took everything that came through. I was swinging a hammer at caravans by eight." },
      jole: { n: "A farm, then a seminary, then nineteen years in green robes in the Nek. Then a gutter, briefly. Then her.",
        e: "From a gutter, by way of a temple that put me there. Avarice found me. I'd say rescued, but she'd want it itemised." },
      ariani: { n: "Tollmarket, before it was Tollmarket. A mother who sold things and a father who was one of them. I learned the trade young.",
        e: "From a long line of people who should have known better. I'm the first one who never pretended to." },
      slice: { n: "The Venners of Harrowmoor. A house with a crest older than its money and a second son nobody had planned for.",
        e: "Minor nobility. Old name, empty vault. I emptied it a little further on my way out, as a parting gift." },
    },
  },
  o_want: {
    label: 'What do you actually want?',
    by: {
      lucy: { n: "To see what's past the next thing. Out in the green there's always another tree. Down here there's always another road.",
        e: "To be the biggest thing anywhere I go. I'm getting close. You're helping." },
      jole: { n: "To be sure the arithmetic is right. That my ledger balances before the end. I am, increasingly, not sure it will.",
        e: "To be the one who keeps the book when she's finished counting. High priest of the final tally." },
      ariani: { n: "To feel something properly, just once, the way other people seem to. I keep trying things. Most of them hurt someone.",
        e: "More. Of everything. Faster. I don't see why I should ever have to stop." },
      slice: { n: "Enough money that nobody can buy me. It turns out to be a larger sum than I estimated.",
        e: "A list with no names left on it, and a house bigger than my father's, bought with his creditors' money." },
    },
  },
  o_fear: {
    label: 'What scares you?',
    by: {
      lucy: { n: "Cages. They caught me once, when I was twelve. Two nights in a box at a fort. I don't go near forts.",
        e: "Nothing now. Used to be cages. Then I learned to break them, and the people who build them." },
      jole: { n: "That the Mercy was right about me. That I didn't fall; I was always this, and the robes just hid it.",
        e: "That she'll find me wanting. That at the end the book will show I kept back a copper for myself." },
      ariani: { n: "Quiet. Nothing happening, nobody near, nothing to feel. I've done terrible things to avoid an empty afternoon.",
        e: "Being ordinary. I'd sooner burn the world down than be another face in it." },
      slice: { n: "Being recognised. Somebody from the old life looking at me and seeing exactly what I've become.",
        e: "Losing my edge. A slow hand in this trade is a short career, and I've seen how those end." },
    },
  },
  o_regret: {
    label: 'Anything you would undo?',
    when: fromTold(2),
    by: {
      lucy: { n: "A boy at a mill. He was my age. He ran the wrong way. I think about which way was the right one, sometimes.",
        e: "Leaving the green so late. I wasted years being small somewhere quiet." },
      jole: { n: "The winter I took the money. Not taking it. Telling them what it was for, too late, as if that mattered.",
        e: "Every copper I ever gave away for free. Imagine what she could have done with it." },
      ariani: { n: "I don't think I'm built for regret. I've looked. There's a space where it ought to be, and it's very tidy.",
        e: "Not one thing. Everyone I betrayed had it coming, eventually, one way or another." },
      slice: { n: "A boy I trained, at the Society hall. He looked up to me. I'd like him not to find out what I am.",
        e: "Undercharging, early on. I did some very fine work for very little money." },
    },
  },
  o_essences: {
    label: 'Tell me about your essences.',
    by: {
      lucy: { n: "Hammer, Iron and Might. Ma said the stones'd know what I was. They did. Didn't even have to think about it.",
        e: "Hammer, Iron, Might. Everything I am, in three words. The Juggernaut, when it all comes together. Fitting." },
      jole: { n: "Blood, Renewal and Hunger. The Mercy gave me Renewal. Avarice gave me the other two. They argue, inside, constantly.",
        e: "Blood and Hunger to take, Renewal to give back exactly what's paid for. The Wendigo, she calls it. She's very proud." },
      ariani: { n: "Sword, Might and Potent. A blade, the strength behind it, and something to make the wound sing for a while afterwards.",
        e: "Sword to open them up, Potent to make it last. It feels like being kissed, I'm told. Never by anyone who lived to say so." },
      slice: { n: "Lightning, Fire and Wind. A storm, essentially. I can kill a man from a rooftop without ever touching the ladder.",
        e: "The Storm. Three essences that don't care what's in the way. I find that relaxing, professionally." },
    },
  },

  // ===================================================== ABOUT THE OTHERS ==
  o_regulars: {
    label: 'The Society types who will not walk with us?',
    by: {
      lucy: { n: "Zeke and that lot? They looked at me like I was weather. Can't blame them. I'd cross the road from me too.",
        e: "Let them keep their clean hands. Clean hands break easy." },
      jole: { n: "Good people. I was one of them, in green, and I'd like them to know I don't hold it against them, though they'd hold it against me.",
        e: "They tithe to the wrong gods and expect a refund. She'll see them at the end, like everyone." },
      ariani: { n: "The healer has kind eyes. I'd like to see what they look like after I've told him what I've done.",
        e: "The farmer. The twins. The big sweet one. I'd love an evening with each. One evening, each." },
      slice: { n: "Society people. I used to share their mess hall. They'll be fine without us, and I mean that more kindly than it sounds.",
        e: "A contract on any of them would pay handsomely. I'm only saying. Someone's going to write one." },
    },
  },
  o_prism: {
    label: 'Prism keeps finding us.',
    when: (ctx) => !!(ctx && ctx.prismMet),
    by: {
      lucy: { n: "She's good. Fights clean. She'd have done well in the green. I don't want to hurt her and I'm not sure I could.",
        e: "Next time she comes I'll stand in front. Let's see how clean she fights with a hammer in her teeth." },
      jole: { n: "She hunts us because she thinks we can still be stopped. That's a kind of faith. I envy it, a little.",
        e: "She's a debt that keeps coming due. One day we'll settle it in full, and I'll pray for her afterwards. Briefly." },
      ariani: { n: "I like her. She's so certain. I'd love to know what it would take to make her doubt, just once.",
        e: "She's mine, darling. When she finally doesn't smoke away, leave her to me. Promise." },
      slice: { n: "The Society sent the one person who can read the way you fight. I'd have made the same call in their chair.",
        e: "Somebody is paying for her persistence. Find the purse and you've found the leash." },
    },
  },

  // ======================================================= KEYED BY PLACE ==
  o_here_now: {
    label: 'Where are we, to you?',
    byRegion: {
      nek: {
        lucy: { n: "Home, near enough. The green's three days north. I can smell it when the wind turns, pine and woodsmoke.", e: "My hunting ground. Every farm in the Nek has paid me something once. I'd like them to pay twice." },
        jole: { n: "Nineteen years of my life. Every chapel here has a door I used to open with a key. I walk past them now.", e: "The Mercy's oldest parish, and the poorest. She has her eye on it. I'm told I'm to be her steward here." },
        ariani: { n: "Lucy's country. All mud and honesty. I've never been anywhere so badly in need of a scandal.", e: "Sleepy little country. I'd like to wake it up. Just one night, just to hear it." },
        slice: { n: "The Nek. The Society sent me here once as a probationer, to clear a well. I was very proud of that well.", e: "Cheap land, cheap lives, a Society hall with three people in it. Ripe, if you're patient." },
      },
      ontaria: {
        lucy: { n: "Rivers everywhere. You can't run straight anywhere in Ontaria. I don't trust a country you can't run in.", e: "Rich river towns and soft river people. Every barge is a gift if you know how to stop one." },
        jole: { n: "Collins's hill is here. Whatever came through that tear had an aura I'd have prayed over, once.", e: "The Toll's country. They pay their tithe in chains and ledgers. She approves of the ledgers." },
        ariani: { n: "Where I was born, more or less. Tollmarket was Sedge Crossing then. I was nobody's daughter in particular.", e: "My river. Every bridge in Ontaria has a story about me under it, and every one of them is true." },
        slice: { n: "Harrowmoor's down the coast. My mother's in a house there with too many rooms. I don't go near it.", e: "Harrowmoor. The Venners still owe half the town. I've been buying up their debts. Quietly." },
      },
      sirukh: {
        lucy: { n: "Islands. Nowhere to go. You hit a man and he has to stay hit, because there's nowhere for him to run.", e: "Islands are pens with water round them. I like pens. Everybody's still there when you come back." },
        jole: { n: "The Tolbrands hold every debt on the quay. I've never seen a family she'd be prouder of, and that frightens me.", e: "The Tolbrands. Avarice's own people and they don't even know it. I'd like to tell them." },
        ariani: { n: "Ships with nobody aboard. I'd love to know what that feels like, being the last one on a ship. Lonely, I imagine.", e: "Wrecks on the reef and nobody to claim them. Darling, it's practically an invitation." },
        slice: { n: "Smuggler's country. I ran a contract out of the Sirukh quay once. The client paid in a currency I'd never seen.", e: "Every warehouse on that quay keeps a second ledger, and I can read three of them without a lamp, a key or a Society warrant." },
      },
      elehyd: {
        lucy: { n: "Too dry. Out in the green you can always find water. Here the water finds you, and it's usually got something in it.", e: "Convoys and nobody watching them. I'd like a season out here. Just me and the road." },
        jole: { n: "The dust gets into everything, even prayer. I keep finding sand in the pages of her book.", e: "The convoys carried something she'd have paid a fortune for. The ruts still remember the weight." },
        ariani: { n: "So much empty. You could scream out here and nobody would come. I've never found that thought frightening.", e: "Out here nobody hears anything. I've been thinking about everything that makes possible." },
        slice: { n: "Karsk Landing is the last place with walls. Past that, contracts are settled by whoever's still standing.", e: "No law past Karsk. I find it clarifying. Every negotiation out here ends exactly once." },
      },
      cinder: {
        lucy: { n: "Hot rock and everything's on fire. Even the bandits here are scared, and that's saying something.", e: "Everything burns here. I like it. It's honest. Nothing pretends it's going to last." },
        jole: { n: "Slagward's kilns never go out. Somebody's feeding them more than coal. I'd stake my last prayer on it.", e: "The kilns burn day and night and somebody profits from every hour. I'd like to meet whoever keeps that account." },
        ariani: { n: "The heat makes everyone short-tempered and honest. I've never seen so many people say what they mean.", e: "Lava and sweat and short tempers. It's like a party that never ends. I adore it." },
        slice: { n: "The surge begins near here, they say. I've been checking where the exits are since we crossed the border.", e: "Slagward will be the first to fall when it comes. I've already chosen which warehouse I'm standing in." },
      },
      bratugal: {
        lucy: { n: "Big city with a king in it. I've never seen a king. He looked smaller than I'd pictured. Most things down here do.", e: "Four houses and a crown. I could knock the crown off. I'd like to see what's under it." },
        jole: { n: "Vashra bustles too loudly. A city that's frightened talks over itself. I spent years listening to that in confession.", e: "The richest city we've seen. Four houses, four treasuries. She's told me which to visit first." },
        ariani: { n: "A court full of people betraying each other and calling it politics. I've never felt so at home and so outclassed.", e: "A whole council of betrayers. I'd like to sit in on a vote. Or rig one. Either." },
        slice: { n: "The four houses all hire my kind, and they all pretend they don't. I've taken coin from two of them already.", e: "Every noble house here would pay me to kill the other three. I'm considering an auction." },
      },
      ixcuatl: {
        lucy: { n: "Nine cities stacked like plates. Who builds the same thing nine times? Nobody out in the green, I'll tell you that.", e: "Empty streets, swept clean. Somebody kept this place tidy for nobody. I'd like to meet whatever did it." },
        jole: { n: "Nine generations built to a plan someone else gave them. I know a little about following another's book, and I know how the last chapter reads.", e: "A whole city that paid a debt it never agreed to. She'd call it beautiful. I'm trying to." },
        ariani: { n: "It's so quiet down the Cut. Something's still talking at the bottom. I'd like to hear what it says. I think it'd like me.", e: "Something at the bottom of all this has been whispering for nine hundred years. I want to whisper back." },
        slice: { n: "Old money, old stone, and old silence. I've worked in houses like this. Something always lives in the cellar.", e: "Nine layers of other people's plans. I'd like to find the one who wrote them and ask about rates." },
      },
    },
  },
  o_work_div: {
    label: 'This Division business we are tangled in?',
    byAct: {
      1: {
        lucy: { n: "Vesk's people bought crates off the Roadwolves and never haggled. Anyone who doesn't haggle has something to hide.", e: "Vesk paid well and asked nothing. If he's the one making those wraith things I'd like to see how he does it." },
        jole: { n: "Thirty-two went into that department and didn't come out. I've buried fewer than that in a bad winter.", e: "The Department turns people into something else and sells the remainder. She'd call that efficient. I'm inclined to agree." },
        ariani: { n: "A man in a tower doing terrible things politely. I've met him before, in other towers. They're never as clever as they think.", e: "Vesk's trying to make something new out of people. Darling, so am I. I wonder whose will turn out better." },
        slice: { n: "A government department with an intake ledger nobody may read. I've seen that shape before, and every time it ended with a cellar full of bodies.", e: "A director with a breakthrough and no scruples. I'd like a word about whether he's hiring." },
      },
      2: {
        lucy: { n: "Collins's hill, and a hole in the world behind it. I didn't like that hole, and the way it looked at us made the back of my neck itch.", e: "Things keep coming out of that tear. I'd like to see what's on the other side. I bet nobody's taken anything from it yet." },
        jole: { n: "Rob Collins is the only man I've met with an aura sicker than mine. I like him. I'm worried that says something.", e: "Collins went through a door no one else came back from. She wants to know what he brought back with him, and I've started wanting it too." },
        ariani: { n: "Rob's sweet. Sad, but sweet. He looks at that tear like I look at people. I'd keep an eye on him.", e: "Rob's hiding something lovely and terrible. I can always tell. I'd like to be there when it comes out." },
        slice: { n: "A dissolved charter that keeps collecting debts. Someone's still signing. In my trade we call that a client.", e: "Someone's paying for that hill, and paying well. I'd like their name. I'd like their purse more." },
      },
      3: {
        lucy: { n: "They fed something under the ground out in the waste. By hand. On a schedule. I'd like five minutes with whoever carried the bucket.", e: "Something down there ate what they gave it. I respect anything that eats that well." },
        jole: { n: "A reduction site. Wastage columns. Somebody signed for every person they used up. I've kept books. Never books like that.", e: "Every life they spent at that works has an entry, and she showed me the page in a dream. I'm still reading it when I wake." },
        ariani: { n: "The overseer just stayed. It never occurred to her to leave. I understand her better than I'd like.", e: "That overseer signed away hundreds and slept at night. I'd love to have dinner with her." },
        slice: { n: "The convoys had escorts I'd have hired myself. Good people. Whoever paid them knew exactly what they were guarding.", e: "The Division's books for that site would be worth more than all the bounties on our heads. I'd like them." },
      },
      4: {
        lucy: { n: "A child in a locked room. I don't care about much. I care about that. Whoever locked it, I'd like a word.", e: "They kept a child in a box. I was in a box once. Whoever built that one is going to learn what I learned to do with boxes." },
        jole: { n: "I held the child for a moment, on the road. The aura is wrong and I could not pray over it. I tried. Every god I know looked away.", e: "Every god wants that child. Seven of them made offers on the road. Avarice made an eighth, quietly, to me." },
        ariani: { n: "Kings unmade, councils called, and at the end a sick child. Even I can see that's the part that matters. Strange.", e: "The child's aura is the most beautiful thing I've ever felt. I'd like to know what it would do to a city." },
        slice: { n: "A warrant from a king who's been unseated. Whatever the Division's become, it's outgrown its patrons. That's when they're dangerous.", e: "The Division's leaving a child behind like baggage. Whoever ends up holding that child holds the whole board." },
      },
    },
  },
  // ============================================================= HERE ======
  o_here_cities: {
    label: 'The free cities?',
    by: {
      lucy: { n: "Lot of people in one place. Good for trade, bad for running. I keep to the edges.",
        e: "Pens. Big, fat pens full of people who don't know they're kept." },
      jole: { n: "Every one has a temple to the Mercy. I walk past them the long way round. I'm told that's progress.",
        e: "Each one a vault with a festival on top. She wants every one, in time. I've drawn up a list." },
      ariani: { n: "So many windows. Every one is a little life I could walk into and ruin, if I were in the mood.",
        e: "Every city's a party nobody invited me to. I always come anyway. I always stay late." },
      slice: { n: "The Society has a hall in each. I can tell you which back door each one's clerk forgets to lock.",
        e: "I know which council seats are for sale and roughly what the bidding is. The answer is always 'less than you'd hope'." },
    },
  },
  o_here_crews: {
    label: 'The crews?',
    by: {
      lucy: { n: "Brannoc's all right. Pays on time. The Roadwolves think they're wild. They've never seen the green.",
        e: "Soft. All of them. Give me a season and I'd run the Roadwolves myself, and they'd thank me." },
      jole: { n: "They come to me with knife wounds and confessions. I charge for the first and listen to the second for free.",
        e: "Good congregants. They pay without being asked twice, and the Mercy never once managed that with hers." },
      ariani: { n: "Oskar's Toll is all chains and paperwork. I sold them a man once and they lost the receipt before they lost the man.",
        e: "I've slept with half of the Toll and sold out the other half. It keeps the place lively." },
      slice: { n: "Amateurs with good intentions toward money. I've worked for worse. I've worked for the Society.",
        e: "Useful, until they aren't. I keep a note of who'd fold first. It's a short note, and it's getting shorter." },
    },
  },
  o_here_church: {
    label: 'The dark churches?',
    by: {
      lucy: { n: "Don't much like them. Too quiet. Too many bones. Out in the green we just left the dead for the crows.",
        e: "Good places. Quiet. The Deacon gave me a blessing once. I didn't feel anything, but it was nice of him." },
      jole: { n: "Hers is the fourth niche. Newest. The others don't trust her yet. Neither, some nights, do I.",
        e: "Hers is the finest niche. I keep it polished. The Unburied's priests keep asking who pays for the oil." },
      ariani: { n: "Four gods, and every one of them wants something. I've never met a god I couldn't understand.",
        e: "I've prayed in every one. Not for anything. I just like being looked at by something that big." },
      slice: { n: "Patrons, essentially. Divine ones. I've had patrons. They all want something back eventually.",
        e: "Better employers than the light ones. The terms are honest, even when they're terrible." },
    },
  },

  // ============================================================= WORK ======
  o_work_kill: {
    label: 'Does killing bother you?',
    by: {
      lucy: { n: "No. Should it? I've seen it bother you, a little. I watch that. I don't feel it, but I watch it.",
        e: "Never has. It used to bother you. I think I'm glad it doesn't any more." },
      jole: { n: "Every time. I count each one. That's the only penance I'm still allowed, and I keep it very carefully.",
        e: "I count each one. She does too. The difference is that now I count them as income." },
      ariani: { n: "Bother isn't the word. It's the only time the world gets quiet enough for me to hear myself.",
        e: "Bother? Darling, it's the best part. You've started to understand that. I can see it on you." },
      slice: { n: "It's the part of the job I'm best at, which isn't the same as liking it. I try not to linger.",
        e: "It's a service. I provide it efficiently. Bother is for amateurs and the families of the deceased." },
    },
  },
  o_work_take: {
    label: 'Taking from people, is that just work to you?',
    by: {
      lucy: { n: "It's what I know. You take, they cry, you go. I've started noticing the crying since I met you, and I'm not sure I like what it does to me.",
        e: "It's the only honest work. Everyone's taking. We just do it to their faces." },
      jole: { n: "She says it's restitution. That nothing was ever theirs to begin with. Some days I believe her. Some days I just pray.",
        e: "Taking is worship. Every purse we lift is a line in her book. I've never felt holier." },
      ariani: { n: "I like the look on their faces when they realise. Is that bad? Somebody told me once that it's very bad.",
        e: "It's the best feeling in the world, watching somebody understand they've lost. Second best, maybe." },
      slice: { n: "It's a transfer of funds. I find the vocabulary helps. Ask me again after a few drinks.",
        e: "It's economics. They had it, we wanted it, the market corrected. Sentiment is a luxury tax." },
    },
  },
  o_work_me: {
    label: 'Why follow me?',
    by: {
      lucy: { n: "You're going somewhere big, and you don't look down on me. That's two things nobody else ever managed at once.",
        e: "You're the strongest thing I've ever met. Out in the green, you follow the strongest thing. Simple." },
      jole: { n: "You're the only person I've met who might balance the ledger in either direction. I want to see which.",
        e: "She told me to. In a dream, with the scales tipped all the way. I've never been more certain of anything." },
      ariani: { n: "You're the only thing I haven't got bored of. I keep waiting for it to happen and it keeps not happening, and I don't know what to do with that.",
        e: "You're worse than me, and you don't even make a show of it. I could watch you work all day." },
      slice: { n: "You pay, you plan, and you don't ask me to pretend I'm something I'm not. That's rarer than gold rank.",
        e: "You win. I bet on winners. It's not complicated, and it's never yet been wrong." },
    },
  },
  o_work_after: {
    label: 'When this is over, what then?',
    when: fromTold(3),
    by: {
      lucy: { n: "Back to the green, maybe. Or not. Maybe I'll see the sea. Can you rob the sea? I'd like to try.",
        e: "There's no over. There's just the next thing to take. I'm looking forward to all of them." },
      jole: { n: "A small clinic, somewhere nobody knows my name. Free, on Sundays. Don't tell her that.",
        e: "A temple. Hers. The biggest in the free cities, built from what we've taken. I've already chosen the site." },
      ariani: { n: "I'll find someone new to be interesting. I've never stayed anywhere long. I've never wanted to until now.",
        e: "Over? Darling, this is the beginning. When the cities fall I want a balcony with a view." },
      slice: { n: "A house in the hills, a vineyard I'll neglect, and a long letter to my mother I'll finally send.",
        e: "Retirement, on the proceeds of everyone who underestimated us. It will be a very comfortable retirement." },
    },
  },

  // ============================================================ WORLD ======
  o_world_society: {
    label: 'The Adventure Society?',
    by: {
      lucy: { n: "They hunt us. Fair enough. We'd hunt them if they had anything worth taking.",
        e: "Badges and rules. I've broken three of their people's arms this season. The rules didn't help any of them." },
      jole: { n: "They struck you off for an essence you didn't choose. The Mercy cast me out for arithmetic. We're a club now.",
        e: "A temple to the idea that someone else decides what you're worth. She'll audit them, in the end." },
      ariani: { n: "A building full of people who think rules make them good. I used to sleep with a Society clerk, and the rules did nothing for him at all.",
        e: "I want to walk into their hall at noon and watch every one of them recognise me. Just once." },
      slice: { n: "I was one of them. Bronze, four years, clean record. The badge paid forty silver. The other side paid four hundred.",
        e: "A guild for the insufficiently ambitious. I keep my old badge as a reminder of what I used to be cheap enough to do for them." },
    },
  },
  o_world_gods: {
    label: 'The gods?',
    by: {
      lucy: { n: "Never had any out in the green. Seems like a lot of fuss to be watched by something.",
        e: "The ones that matter are the ones that let you take. The rest are just rules with a face on." },
      jole: { n: "The Green Mercy healed through me for nineteen years and said nothing when they threw me out. I've had words with her since.",
        e: "The light gods are bankers who've forgotten they lend at interest. She never forgets. I find that very restful." },
      ariani: { n: "They're like anybody. They want things. I've never met a god I couldn't understand. Or one I'd trust.",
        e: "Big, beautiful, hungry things. I'd love one to look at me the way I look at people." },
      slice: { n: "The light ones employ the Society. The dark ones employ the crews. I've worked for both sides of that ledger.",
        e: "Clients. Very large clients with very long memories. I invoice accordingly." },
    },
  },
  o_world_avarice: {
    label: 'Avarice?',
    by: {
      lucy: { n: "Jole's goddess. She seems all right to me. She's honest about wanting things, and most folk aren't.",
        e: "Jole says she likes me. I like being liked by something that big. I gave her a dead man's ring." },
      jole: { n: "She is the only god who ever told me the price first. I'm not sure that makes her good, but I've never once caught her lying to me.",
        e: "She is the truth that the others hide behind their kindness. Everything is owed. I've seen her book. We're in it." },
      ariani: { n: "Jole's lady. I asked her for something once, in the church. She asked me what I'd pay. I'm still thinking about it.",
        e: "The only goddess who ever looked at me and didn't flinch. I left her a pair of red boots. She took them." },
      slice: { n: "A goddess of contracts. I approve of the principle, and I read her small print very carefully.",
        e: "The patron saint of my profession, it turns out. I tithe. It's tax-deductible, in the sense that nobody dares audit me." },
    },
  },
  o_world_surge: {
    label: 'The surge, when it comes?',
    when: fromAct(2),
    by: {
      lucy: { n: "Monsters and cities. Somebody's going to have to stand in a gate. I'm good at standing in gates. Either side of them.",
        e: "Every wall'll be watching the monsters. Nobody watching behind. I've been thinking about it a lot." },
      jole: { n: "If you keep your hands clean, there might be a door back for you before it comes. A Society door. I'd come and plead for you.",
        e: "The cities will open their gates to anyone with a sword. She sees the opportunity, and so do I, and I think you saw it before either of us." },
      ariani: { n: "Everyone will be frightened at once. I've never seen that. I think I'd like to be useful, for once, just to see how it feels.",
        e: "Every city at once, all screaming, and nobody to answer but us. Darling, it's going to be the best week of my life." },
      slice: { n: "The Society will need everyone with an essence. Even us. Especially if we've been careful. Think about that.",
        e: "Every guard on every wall will be watching the monsters, and every gate will have somebody behind it who forgot to lock it. I intend to be there first." },
    },
  },
  o_world_division: {
    label: 'The Division?',
    when: fromTold(2),
    by: {
      lucy: { n: "The crews moved their crates for years. Nobody looked inside. I'd like to look inside, now.",
        e: "They paid well and asked nothing. Best customers the road ever had. I'd like to know what was in the crates." },
      jole: { n: "Their crates came through Gallowsreach with an aura I'd have treated in green robes. I didn't. I still think about it.",
        e: "They traded in something she'd pay dearly for. Find out what, and we'll be her favourites for a century." },
      ariani: { n: "I sold one of their witnesses twice. They paid better than the Society did. Make of that what you will.",
        e: "They're doing something wonderful and terrible in the dark. I'd love to watch. Or help. I'm not fussy." },
      slice: { n: "I was paid to make one of their witnesses quiet. I didn't ask why. I'd like to, now. Make of that what you will.",
        e: "Their records are worth more than every bounty on our heads combined. Somebody should collect. Us, ideally." },
    },
  },
};

/** ...about each other. `speaker>subject`: { n, e }. Generated into
 *  `o_of_<id>` topics below, same as companionTalk's PAIR_LINES. */
export const OUTLAW_PAIR_LINES = {
  'jole>lucy': { n: "She doesn't judge. I've spent my life among people who did nothing else. She's a holiday.", e: "The finest instrument Avarice ever gave me. She hits what I point at, and asks nothing." },
  'ariani>lucy': { n: "Lucy's honest. It's adorable. I keep trying to corrupt her and she keeps not noticing.", e: "She smiles when she breaks bones and doesn't know why it's funny. I'm teaching her." },
  'slice>lucy': { n: "Raw talent and no training. Give her a year with a proper drillmaster and she'd frighten gold ranks.", e: "The most effective blunt instrument I've ever worked beside. I've stopped needing a plan B." },
  'lucy>jole': { n: "Jole fixes me up and then tells me what I owe. I never pay. He never asks twice. We get on.", e: "He prays a lot more since we started. Says she's pleased. I can't tell, but he can." },
  'ariani>jole': { n: "A priest who can't decide which god to disappoint. I adore him. I'm going to break his heart eventually.", e: "Jole's finally stopped apologising for himself. It suits him. He looks younger." },
  'slice>jole': { n: "He bills fairly and keeps confidences. That's two more virtues than most clergy I've met.", e: "He keeps immaculate books. In my line of work that's practically sainthood." },
  'lucy>ariani': { n: "She's strange. Says things to see what my face does. I don't mind. My face doesn't do much.", e: "She's fun. Mean, but fun. Out in the green she'd have been chief inside a year." },
  'jole>ariani': { n: "I pray for her. She knows. She thinks it's the funniest thing in the world.", e: "Avarice calls her a bottomless purse. She means it as a compliment. Ariani took it as one." },
  'slice>ariani': { n: "She priced me to my family once, just to hear the number. Then she didn't sell. I'm told that's affection.", e: "The most dangerous person in this company, and the most honest about it. I sleep with a knife." },
  'lucy>slice': { n: "He talks like a lord and fights like a storm. I didn't know you could be both.", e: "He picks the target and I pick it up off the ground after. Good team." },
  'jole>slice': { n: "A man with excellent manners and no conscience he'll admit to. I've seen it at night, though, when he thinks the fire's too low for anyone to read his face.", e: "He's finally stopped pretending he's better than this. Avarice was very pleased. She sent him a dream." },
  'ariani>slice': { n: "Aldous. He hates when I call him that. Which is why I do. He's lovely when he's cross.", e: "He's so precise. Every cut exactly where he means it. I find it very attractive." },
};

for (const subject of OUTLAW_TALK_IDS) {
  OUTLAW_TOPICS[`o_of_${subject}`] = {
    label: `What about ${OUTLAW_TALK_NAMES[subject]}?`,
    when: (ctx) => !!ctx && ctx.speaker !== subject && (ctx.recruited || []).includes(subject),
    by: Object.fromEntries(OUTLAW_TALK_IDS.filter(s => s !== subject)
      .map(s => [s, OUTLAW_PAIR_LINES[`${s}>${subject}`]]).filter(([, l]) => !!l)),
  };
}

export const OUTLAW_ROOTS = ['o_you', 'o_others', 'o_here', 'o_work', 'o_world'];
export const OUTLAW_TOPIC_KEYS = Object.keys(OUTLAW_TOPICS);

/** What this outlaw says when the topic is opened, in the player's tone. */
export function outlawSayFor(topicId, ctx = {}) {
  const t = OUTLAW_TOPICS[topicId];
  if (!t) return '';
  // Place first, then act, then the plain table -- companionTalk's order.
  const pools = [t.byRegion && ctx.region && t.byRegion[ctx.region], t.byAct && t.byAct[ctx.act || 1], t.by];
  let line = null;
  for (const pool of pools) if (pool && pool[ctx.speaker]) { line = pool[ctx.speaker]; break; }
  if (!line) return '';
  if (typeof line === 'string') return line;
  return (ctx.tone === 'evil' ? line.e : line.n) || line.n || '';
}

/** Every authored line, both tones, for the suite and for measuring. */
export function outlawTalkLines() {
  const out = [];
  for (const [id, t] of Object.entries(OUTLAW_TOPICS)) {
    const pools = [t.by || {}, ...Object.values(t.byRegion || {}), ...Object.values(t.byAct || {})];
    for (const pool of pools) for (const [who, line] of Object.entries(pool)) {
      if (typeof line === 'string') out.push({ id, who, tone: 'n', text: line });
      else for (const k of ['n', 'e']) if (line[k]) out.push({ id, who, tone: k, text: line[k] });
    }
  }
  return out;
}

/** Nothing here disagrees with itself. */
export function outlawTalkFaults() {
  const out = [];
  for (const r of OUTLAW_ROOTS) if (!OUTLAW_TOPICS[r]) out.push(`root ${r} missing`);
  const reach = new Set(OUTLAW_ROOTS);
  for (const [id, t] of Object.entries(OUTLAW_TOPICS)) {
    for (const c of (t.children || [])) {
      if (!OUTLAW_TOPICS[c]) out.push(`${id}: child ${c} missing`);
      reach.add(c);
    }
    const pair = id.startsWith('o_of_');
    const pools = t.byRegion ? Object.entries(t.byRegion).map(([k, v]) => [`region ${k}`, v])
      : t.byAct ? Object.entries(t.byAct).map(([k, v]) => [`act ${k}`, v]) : [['', t.by || {}]];
    if (t.byRegion) for (const r of OUTLAW_REGIONS) if (!t.byRegion[r]) out.push(`${id}: says nothing in ${r}`);
    if (t.byAct) for (const a of ['1', '2', '3', '4']) if (!t.byAct[a]) out.push(`${id}: says nothing in act ${a}`);
    for (const [where, pool] of pools) for (const who of OUTLAW_TALK_IDS) {
      if (pair && id === `o_of_${who}`) continue;
      const l = pool[who];
      if (!l || typeof l !== 'object') { out.push(`${id} ${where}: no line for ${who}`); continue; }
      for (const k of ['n', 'e']) {
        if (!l[k] || l[k].length < 30) out.push(`${id} ${where}: ${who} ${k === 'n' ? 'neutral' : 'evil'} line missing or too short`);
      }
      if (l.n && l.e && l.n === l.e) out.push(`${id} ${where}: ${who} says the same thing in both tones`);
    }
  }
  for (const id of Object.keys(OUTLAW_TOPICS)) if (!reach.has(id)) out.push(`${id}: unreachable from the roots`);
  return out;
}
