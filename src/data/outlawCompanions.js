// ============================================================================
// ROUND 275 -- THE OUTLAW COMPANIONS.
//
//   "4) Progressing the outlaw path should still allow story progression if
//       the player wants to stop the department. However the players
//       companions wont want anything to do with them. Instead each bandit
//       city has a different companion character. These are outlaws and not
//       good people, but could perhaps be redeemed to only kinda bad if the
//       player wants. I'll generate models for their use later, for now use
//       various recolored bandit models. Create names, backstories, dialogue
//       trees, and progression. Much like Zeke the first bandit camp companion
//       should only have half of their awakening stones to allow the player to
//       populate the rest."
//
// SHAPE. Each entry is a PARTY member (party.js) with the fields that file
// documents -- id, name, role, build with TWO stones in each of four slots
// (the other two per slot are the player's, exactly as Zeke's are), story
// pages and a storyAsk -- plus what an outlaw needs:
//
//   city       the bandit city they are found in (banditCities.js)
//   crew       whose colours they wear until their own model arrives
//   model      which bandit body the colours go on
//   refuse     what they say to a player who is NOT an outlaw
//   arc        their story, told a beat at a time as you rank up together;
//              two beats carry a CHOICE, and the choices are the redemption
//   endings    the last word, one for each way the choices went
//
// REDEMPTION is "only kinda bad", as asked, and never a conversion: a
// redeemed outlaw is still an outlaw who does the work, and a hardened one is
// still loyal to the player. Two choices, so 0, 1 or 2 steps toward decency;
// two is "redeemed", none is "hardened", one is "unsure".
// ============================================================================

// ROUND 291 -- THE ROSTER, REPLACED.
//
//   "The bandit companion options should be changed. Acts 1, 2 should each
//    have 2 recruitable Bandit companions. Act 1 bandit companions are Lucy
//    and Jole. Act 2 bandit companions are Ariani and Slice."
//
// His answer on the seven round 275 made (Vess, Prye, Jen, Tick, Oda, Lisle,
// Crow): "Replace all 7". Their crews stay in the cities as bandits.
//
// Two a city now, so each carries `act` and a `spot` -- where they stand off
// the city's centre -- and the one-per-city rule became two-per-act-city.
//
// TONE (5.8). Every line a companion speaks on their own has a neutral form,
// and the ones that would change carry an `evil` form: what they say to a
// player who has embraced the underworld and the dark gods (depravity.js).
// The two asks and the three endings stay as they were -- the player's
// answers are the redemption, and the tone is how far the PLAYER has gone.
export const OUTLAW_COMPANIONS = [
  // ==========================================================================
  // ACT 1 -- GALLOWSREACH (The Nek)
  // ==========================================================================
  {
    id: 'lucy', name: 'Lucy', role: 'tank', roleLabel: 'Tank',
    act: 1, city: 'bc_nek', region: 'nek', crew: 'roadwolves', model: 5, spot: { dx: 4, dy: 6 },
    build: {
      // "a powerhouse tank (8 stones socketed thematic to violence)
      //  Essences are Hammer, Iron, and Might essences."
      essences: ['essHammer', 'essIron', 'might'],
      slotStones: [
        ['stoneRuin', 'stoneWrath'],      // Hammer -- what it leaves, and why
        ['stoneArmour', 'stoneSpike'],    // Iron -- the plate, and the point on it
        ['stoneWar', 'stoneBear'],        // Might -- the brawl, and the animal in it
        ['stoneBlood', 'stoneDefiance'],  // Confluence -- still standing, covered in it
      ],
    },
    blurb: 'Raised by a band in the deep wilderness. Robs people the way a farmer brings in a harvest.',
    greet: "Point me at it. I'll do the rest and you can do the talking after.",
    greetEvil: "Point me at somebody. Anybody. I'm not fussy and you're not either, and I like that about us.",
    meditate: "Stones need tending same as a hammer. Sit down, you're making me itch.",
    meditateEvil: "Stones first. Then we go and take something, and that's a good day by any count I know.",
    refuse: "You've got a clean look about you. Society, is it? No offence. I just don't work with people who'd hang me after.",
    story: [
      "You're the one the crews keep talking about. I thought you'd be bigger.\n\nThat's not an insult. I thought everyone would be bigger, when I came down out of the trees. Mostly they're not.",
      "I'm Lucy. I was born out past the last road, in the deep green, in a band that took what came through. Nobody ever told me that was a bad thing, so I never thought it was one.\n\nYou take a deer. You take a cart. The cart's people cry more, is the difference.",
      "Brannoc pays me to stand at the gate and look large. I'm bored stupid.\n\nYou go places. Things try to kill you there. That sounds like work I'd be good at.",
    ],
    storyAsk: "Take me with you. I hit hard, I don't fall over, and I don't ask what it's for.",
    arc: [
      { id: 'lucy_1',
        line: "Ma put a hammer in my hands before I could say my own name right. Said a girl out in the green needs two things, a hammer and nobody's permission.",
        evil: "Ma put a hammer in my hands before I could say my own name. First thing I ever broke was a man's knee. He was taking our goats. Fair's fair." },
      { id: 'lucy_2', need: { told: 1, rank: 'iron' },
        line: "Folk down here make a lot of noise about right and wrong. Out in the green there was just fed and not fed. I'm still working out which one the noise is for.",
        evil: "Folk down here talk about right and wrong like it's weather. You don't. You just take. I like travelling with somebody honest." },
      { id: 'lucy_3', need: { told: 2, rank: 'iron' },
        line: "Caught a caravan guard on the east road this morning, while you were asleep. He's tied up behind the rocks and he's begging. I usually just finish it. You're the boss.",
        ask: { prompt: 'A caravan guard is tied up and begging.',
          redeem: { label: '"Let him walk."', reply: "Huh. All right. He cried more letting him go than he would've the other way. People are strange." },
          harden: { label: '"Finish it."', reply: "Done. Didn't take long. You want his boots? Good leather on them, and he won't be needing the walk home." } } },
      { id: 'lucy_4', need: { told: 3, rank: 'bronze' },
        line: "I've been watching you weigh things. Before you do something, you stop, and you think about it. I never learned that bit. I'm not sure I want to. I keep watching anyway.",
        evil: "You don't stop and think any more. You used to. I watched it go out of you like a fire in the rain. You're easier to be around now." },
      { id: 'lucy_5', need: { told: 4, rank: 'bronze' },
        line: "My old band's come down out of the green. The Thornbacks. They're going to take Ashwell tomorrow, the whole village, the way we used to. Ma's leading it. She wants me there.",
        ask: { prompt: "Lucy's old band is going to take a village, and her mother wants her there.",
          redeem: { label: '"Turn them back. Not this one."', reply: "Ma won't like it. Ma's never liked anything. …All right. I'll go stand in the road and be large at her. We'll see who blinks." },
          harden: { label: '"Go. Take your cut."', reply: "Good. I'll bring you something back. Ma'll be pleased I brought a friend's share, that's manners." } } },
      { id: 'lucy_6', need: { told: 5, rank: 'silver' },
        line: "Silver. I never thought about what came after big, out in the green. You just got big and then something bigger ate you. I'd like to see what's after this, I think. With you.",
        evil: "Silver. Nothing in the green could stop me now, and nothing down here either. We should go and take something that's never been taken. Just to see." },
    ],
    endings: {
      redeemed: "I still hit people for money. I just pick them now. The ones who'd hit back. Ma says I've gone soft. Ma's never been this far from the trees.",
      unsure: "Some days I let them walk and some days I don't, and I don't know why it's one or the other. At least now I notice which.",
      hardened: "It's all still just fed and not fed. I'm fed. You're fed. Everyone else can learn to run faster. Come on.",
    },
  },
  {
    id: 'jole', name: 'Brother Jole', role: 'healer', roleLabel: 'Healer / Drain',
    act: 1, city: 'bc_nek', region: 'nek', crew: 'roadwolves', model: 0, spot: { dx: -5, dy: 5 },
    build: {
      // "a disgraced priest of the healer who has transferred to become a
      //  priest of Avarice ... healing abilities but also a lot of drain
      //  effects." His answer: Renewal, Blood, Hunger. Blood leads, so his
      //  first ability is a cheap attack (round 280's rule).
      essences: ['essBlood', 'heal', 'essHunger'],
      slotStones: [
        ['stoneFeast', 'stoneSin'],           // Blood -- drink, and owe for it
        ['stoneHealer', 'stoneAbsolution'],   // Renewal -- what the Mercy taught him, and what it would not give
        ['stoneLocust', 'stoneFlea'],         // Hunger -- the swarm, and the bite that takes a little
        ['stoneGathering', 'stoneMalign'],    // Confluence -- Avarice: everything gathered, nothing given
      ],
    },
    blurb: "Nineteen years a priest of the Green Mercy. Cast out. Now he heals for Avarice, and Avarice always collects.",
    greet: "I'll keep you standing. We can discuss the price later, when you're in a better position to pay it.",
    greetEvil: "Avarice smiles on you. She's been reading your entries. So have I. Such handwriting.",
    meditate: "Give me the quiet. I have prayers to say, and a ledger to balance.",
    meditateEvil: "Sit with me. We'll count what we took today. It's the closest thing she has to a hymn.",
    refuse: "A Society badge. I had one of those once, of a kind. It was green and it promised things. Go away before I start charging you for the conversation.",
    story: [
      "You're bleeding. Sit. No, sit, I'm not going to rob you, I'm going to heal you, and then I'm going to rob you, politely, in that order.",
      "Brother Jole. Formerly of the Green Mercy, nineteen years a healer in the Nek, never took a copper for it. Then one winter I took several thousand, for the clinic, and nobody asked what for. They asked how much.\n\nThe Mercy cast me out. Avarice picked me up. She was the only one who understood the arithmetic.",
      "She teaches that nothing is free. Health isn't made, it's moved, from someone who has it to someone who needs it. I used to pretend otherwise. Now I just move it, and keep the receipts.\n\nYou're going somewhere with a great deal of health in it, I think.",
    ],
    storyAsk: "Take me along. I'll keep you alive, and I'll keep a very fair account.",
    arc: [
      { id: 'jole_1',
        line: "I still pray to her, you know. The Green Mercy. Habit. She doesn't answer, but then she never did. I used to think the silence was humility.",
        evil: "I burned the Mercy's prayer book last night. It was very old and it caught beautifully. Avarice approved. She likes a bargain, and that was warmth for free." },
      { id: 'jole_2', need: { told: 1, rank: 'iron' },
        line: "The money was for the clinic. Every copper. Nobody believes that, and I've stopped caring whether they do. I only mind that I was right and it didn't matter.",
        evil: "Was the money for the clinic? Some of it. Most of it. Enough of it. It stopped mattering the moment they asked how much instead of what for." },
      { id: 'jole_3', need: { told: 2, rank: 'iron' },
        line: "There's a girl in Gallowsreach with lung-rot. Her father can't pay. I told him I'd think about it, and I'm doing my thinking in front of you because I'm a coward.",
        ask: { prompt: "A sick girl in Gallowsreach, and her father can't pay.",
          redeem: { label: '"Heal her. Put it on my account."', reply: "…On your account. Very well. Avarice will note it, and so will I. She'll breathe by morning. Don't make a habit of this, you'll ruin me." },
          harden: { label: '"No coin, no cure."', reply: "That's the doctrine. I said it to him myself. I'm told I said it very kindly." } } },
      { id: 'jole_4', need: { told: 3, rank: 'bronze' },
        line: "When I drain something, I feel what I'm taking. When I heal, I feel it leave. The Mercy never told me they were the same feeling. Avarice did, on the first night.",
        evil: "When I drain something now I don't feel it leave them. I only feel it arrive. That's growth, I think. She says it is." },
      { id: 'jole_5', need: { told: 4, rank: 'bronze' },
        line: "A letter. From Mother Hesk, who threw me out. The Mercy will take me back if I renounce Avarice at their altar. She writes that she was wrong about the clinic.",
        ask: { prompt: "The Green Mercy will take Jole back if he renounces Avarice.",
          redeem: { label: '"Keep the letter. You might want it."', reply: "I might. I won't go, not yet. But I'll keep it. That's more than I've kept of anything of theirs." },
          harden: { label: '"Burn it."', reply: "There. Paid in full. Avarice doesn't do refunds and neither, it turns out, do I." } } },
      { id: 'jole_6', need: { told: 5, rank: 'silver' },
        line: "Silver. I have healed more people with you than in nineteen years in green robes. I've also killed rather more. The ledger's very long now. I've stopped being sure what it adds up to.",
        evil: "Silver. The ledger is magnificent. Every name we took, every breath I moved. When they write the book of Avarice I think we'll be a chapter." },
    ],
    endings: {
      redeemed: "I heal for free again, sometimes. Not often. Avarice lets it go on the understanding that I'm keeping count, and I am. It's a very short column. I'm proud of it.",
      unsure: "Some days I heal the ones who can't pay. Some days I don't. The ledger doesn't care which. I'm beginning to think I do.",
      hardened: "Everything is owed. We collected. I've never felt so close to a god, and she has never once pretended to be kind.",
    },
  },
  // ==========================================================================
  // ACT 2 -- TOLLMARKET (Ontaria)
  // ==========================================================================
  {
    id: 'ariani', name: 'Ariani', role: 'melee', roleLabel: 'Melee DPS',
    act: 2, city: 'bc_ont', region: 'ontaria', crew: 'toll', model: 3, spot: { dx: 4, dy: 6 },
    build: {
      // "Ariani's kit is the sword, might and potent essences."
      essences: ['essSword', 'might', 'essPotent'],
      slotStones: [
        ['stoneDance', 'stoneNeedle'],     // Sword -- the dance, and the point it makes
        ['stoneWrath', 'stoneWhip'],       // Might -- pain, given with interest
        ['stoneVenom', 'stoneVisage'],     // Potent -- the poison, and the lovely face on it
        ['stoneDiscord', 'stoneSin'],      // Confluence -- every bridge she ever burned
      ],
    },
    blurb: "Doesn't feel the way other people do: only pleasure, or pain. Has betrayed everyone who ever trusted her, and remembers each one fondly.",
    greet: "Mm. You again. Try to be interesting today, darling.",
    greetEvil: "There you are. You've been wicked, haven't you? I can always tell, and it makes you prettier every time.",
    meditate: "Stones. Tedious. Stay where I can see you while I do them, I get bored.",
    meditateEvil: "Sit close while I do my stones. You smell like something burning. I like it.",
    refuse: "You're very clean, aren't you. Very upright. I'd ruin you in a week and you'd thank me. Come back when you're a little more… worn.",
    story: [
      "Don't stare. Or do, I don't mind. You're the one who's been making the Toll nervous, aren't you? I like anyone who makes Oskar sweat.",
      "Ariani. No other name. I had one but I sold it, along with the woman it belonged to. That was a joke. Mostly.\n\nPeople ask what I feel. Pleasure, or pain. That's the whole menu, darling. Everyone else seems to have a much longer one and they never stop reading it to me.",
      "Oskar's boring me. Tollmarket's boring me. You aren't, yet.\n\nI'm very good with a sword. I'm very bad with loyalty. I'll tell you that now, so you can't say I didn't.",
    ],
    storyAsk: "Take me with you. I'll be the most fun you've ever regretted.",
    arc: [
      { id: 'ariani_1',
        line: "The first crew I ever sold was for a pair of boots. Red ones, with a buckle. I wore them to the hanging. I didn't feel bad. I'm told I should have. I tried, afterwards, to see.",
        evil: "The first crew I sold was for a pair of red boots. I wore them to the hanging and watched every one of them drop. Best day of that year. You'd have enjoyed it." },
      { id: 'ariani_2', need: { told: 1, rank: 'bronze' },
        line: "Then I sold the watch captain to the crew's survivors. Then the survivors to their rivals. It's not a plan. It's more like following a smell. There's always one more door.",
        evil: "After that I sold the captain, then the survivors, then their rivals. You understand, don't you? It's not about the money. It's the moment their face changes." },
      { id: 'ariani_3', need: { told: 2, rank: 'bronze' },
        line: "Slice's family has a price on him. The Venners of Harrowmoor. A great deal of money for a very small letter saying where he sleeps. I could write it tonight. Should I?",
        ask: { prompt: "Ariani could sell Slice's whereabouts to his family.",
          redeem: { label: '"Leave him be. He\'s ours."', reply: "Ours. What a funny word. …Fine. I'll leave it. You'll owe me something more interesting instead." },
          harden: { label: '"Get a good price. Then kill the buyer."', reply: "Oh, I like you. I'll take their money and their messenger, and Slice never needs to know. Everybody wins except the Venners." } } },
      { id: 'ariani_4', need: { told: 3, rank: 'bronze' },
        line: "You flinch when I hurt things. Just a little, around the eyes. I watch for it, because I think I'm trying to learn what it feels like from the outside, and so far it isn't working.",
        evil: "You don't flinch any more when I hurt things. I used to watch for it. Now I watch you smile instead. Much nicer." },
      { id: 'ariani_5', need: { told: 4, rank: 'silver' },
        line: "Dovan's dying. The fence, in Tollmarket, the one I left to the Toll with a knife in him. He wants to see me. He sent a boy to ask. He said please. Nobody says please to me.",
        ask: { prompt: "A man Ariani betrayed is dying and asking for her.",
          redeem: { label: '"Go to him."', reply: "…I went. He held my hand and told me he forgave me. I didn't feel anything. I stayed anyway, until the end. I don't know why. Don't ask me why." },
          harden: { label: '"Let him wait."', reply: "He'll wait forever now, won't he. That's rather romantic, when you think about it." } } },
      { id: 'ariani_6', need: { told: 5, rank: 'silver' },
        line: "Silver, and I haven't betrayed you. That's a record. I keep checking myself for the urge, like a loose tooth. It's still there. I just keep not doing it. Odd.",
        evil: "Silver, and I haven't betrayed you. Why would I? You're the only one who's ever been worse than me. It's like finally meeting family." },
    ],
    endings: {
      redeemed: "I still don't feel what you feel. But I've started doing what you'd do, and watching what happens. People look at me differently now, and I find I don't mind it nearly as much as I expected.",
      unsure: "Some nights I think about selling you, just to feel something. Then I don't. I can't tell yet if that's loyalty or just a longer game.",
      hardened: "Pleasure and pain, darling. We've had so much of both. When this is over, let's find somebody new to break together.",
    },
  },
  {
    id: 'slice', name: 'Slice', role: 'ranged', roleLabel: 'Ranged Caster',
    act: 2, city: 'bc_ont', region: 'ontaria', crew: 'toll', model: 7, spot: { dx: -5, dy: 5 },
    build: {
      // "a ranged spell specialist, with the lightning, fire, wind essences."
      essences: ['essLightning', 'fire', 'essWind'],
      slotStones: [
        ['stoneSurge', 'stoneSpear'],      // Lightning -- the jolt, and the line it flies
        ['stoneSmoke', 'stoneStar'],       // Fire -- the smoke to hide in, the burn to leave
        ['stoneLurker', 'stoneSky'],       // Wind -- the wait, and the high place to wait in
        ['stoneKnife', 'stoneSceptre'],    // Confluence -- the job, and the family he left for it
      ],
    },
    blurb: "Aldous Venner, second son of a minor house, Bronze-rank adventurer. Moonlighted as hired muscle until the muscle paid better than the adventuring.",
    greet: "Name the target and the fee. I'll handle the unpleasant middle part.",
    greetEvil: "Another day, another name to cross off. You have excellent taste in names.",
    meditate: "A moment with the stones. Keep watch on the rooftops; that's where I'd be.",
    meditateEvil: "Stones. Then we collect. Try not to get blood on anything expensive before I've priced it.",
    refuse: "A Society man. I used to be one. The badge paid forty silver for a job; the man the job was about paid four hundred to have it done differently. Come back when you've done that arithmetic.",
    story: [
      "Don't reach for anything. I'm not here for you. If I were, you'd have found out from the ceiling.",
      "They call me Slice. My mother calls me Aldous, in letters I don't answer. The Venners of Harrowmoor; minor, respectable, broke. I took the Society badge because a second son needs something to be, and I was rather good at it. Bronze in four years.",
      "Then a guild contract paid forty silver to bring a man in, and the man paid four hundred to have the guild's adventurer look the other way. I looked. Then I took his next job, and the next. The work's the same. The pay isn't.\n\nYou look like someone with a very long list.",
    ],
    storyAsk: "Hire me. The first month's on account. After that, we'll talk rates like civilised people.",
    arc: [
      { id: 'slice_1',
        line: "People ask about the name. The Toll gave it to me after a job on the river road. I'd prefer Aldous. Nobody's afraid of an Aldous, and fear saves a great deal of time.",
        evil: "The Toll named me Slice after the river road job. Seven men, one bridge. I'm told it's still talked about. I like to think I earned it." },
      { id: 'slice_2', need: { told: 1, rank: 'bronze' },
        line: "My Bronze assessment was a wyvern nest. I killed the mother and then stood there with the eggs for a long time, and brought them back, and the Society sold them. I think about that more than the killings.",
        evil: "My Bronze assessment was a wyvern nest. I kept one of the eggs back and sold it myself. That was the first time I noticed the Society's money and mine were different colours." },
      { id: 'slice_3', need: { told: 2, rank: 'bronze' },
        line: "There's a contract on a Society adventurer. Bronze. Asking questions around Tollmarket. He's twenty-three and earnest and he reminds me of a man I used to be. Four hundred silver.",
        ask: { prompt: "A contract on a young Society adventurer who reminds Slice of himself.",
          redeem: { label: '"Scare him off instead."', reply: "A warning shot, through his hat. He left town in his socks. The Toll will want the fee back. I'll tell them the wind took it." },
          harden: { label: '"Take the contract."', reply: "Done, and quietly. I kept his badge. I'm not sure why. Don't look at me like that." } } },
      { id: 'slice_4', need: { told: 3, rank: 'bronze' },
        line: "Mother writes every month. The house is failing. My brother's married badly. She never asks what I do. I think that's the kindest thing anyone's ever done for me.",
        evil: "Mother writes every month. I've started reading them aloud in taverns. People find the Venners terribly funny, and lately I've started laughing along with them." },
      { id: 'slice_5', need: { told: 4, rank: 'silver' },
        line: "The Venners want me home. They'll clear my debts and my name, if I marry who they choose and never pick up a wand again. Or I could empty their vault on the way past. I know where the key is.",
        ask: { prompt: "Slice's family will take him back, or he could rob them.",
          redeem: { label: '"Write back. You don\'t have to go, but write."', reply: "I wrote. Four pages. I didn't say yes. I didn't say what I do, either. Mother wrote back the same day. I haven't opened it yet." },
          harden: { label: '"Empty the vault."', reply: "It was a very small vault. That's the saddest thing I've ever stolen. I took it anyway. Principle." } } },
      { id: 'slice_6', need: { told: 5, rank: 'silver' },
        line: "Silver. My old Society rank-mates would have killed for this. Some of them tried, actually. I'm oddly glad it was with you and not with them.",
        evil: "Silver. I used to take contracts on people like us. Now there's nobody left who'd dare write one. That's the real rank, isn't it?" },
    ],
    endings: {
      redeemed: "I still take contracts. I read them first now. Some of them I tear up. Mother would call that character. I call it being expensive.",
      unsure: "Some jobs I take, some I don't. I've started keeping the ones I turn down in a drawer. It's a thicker drawer than I expected.",
      hardened: "Every name on the list, crossed off. The Venners will read about me one day and be very, very quiet at dinner.",
    },
  },
];

/** ROUND 291 -- the four talk among themselves (companionStory's rule: every
 *  companion speaks in banter). Only ever two outlaws together. */
export const OUTLAW_BANTER = [
  { who: ['lucy', 'jole'], need: {},
    lines: ["You're sure that's healing? It looks like you're sucking the life out of that one.", "I'm moving it, Lucy. From him to you. You're welcome."] },
  { who: ['jole', 'lucy'], need: { told: 2 },
    lines: ["You never ask what anything costs.", "Things don't cost. You just take them. You make everything so complicated, Jole."] },
  { who: ['ariani', 'slice'], need: {},
    lines: ["You'd look lovely with a price on your head, Aldous.", "I already have one. Please stop trying to raise it."] },
  { who: ['slice', 'ariani'], need: { told: 2 },
    lines: ["You were in my room last night.", "I was pricing your things. You have nothing worth selling. It's almost sweet."] },
  { who: ['lucy', 'ariani'], need: {},
    lines: ["You smile when you hurt people.", "And you don't? Oh, Lucy. You do. You just don't notice."] },
  { who: ['jole', 'slice'], need: {},
    lines: ["A man with your manners, killing for money. Your mother must be proud.", "She doesn't ask. You should try it, Brother. It's restful."] },
];

export const OUTLAW_BY_ID = Object.fromEntries(OUTLAW_COMPANIONS.map(c => [c.id, c]));
/** ROUND 291 -- two a city now: the city's companions, in roster order. */
export const OUTLAW_BY_CITY = OUTLAW_COMPANIONS.reduce((m, c) => { (m[c.city] = m[c.city] || []).push(c); return m; }, {});
/** ROUND 291 -- "Acts 1, 2 should each have 2 recruitable Bandit companions." */
export const OUTLAW_ACTS = { 1: 'bc_nek', 2: 'bc_ont' };
export const OUTLAWS_PER_ACT = 2;

/** A line in the tone the player has earned: the `evil` form when there is
 *  one and the player has embraced the dark (depravity.js), else the line. */
export function toned(step, tone) {
  if (!step) return '';
  return tone === 'evil' && step.evil ? step.evil : step.line;
}

/** 0, 1 or 2 steps toward decency, read as the three endings. */
export function redemptionState(steps) {
  const n = Math.max(0, steps || 0);
  return n >= 2 ? 'redeemed' : n === 1 ? 'unsure' : 'hardened';
}

/** Nothing here disagrees with itself. `essences`/`stones` are the catalogues'
 *  ids; `cities` the bandit city ids. */
export function outlawFaults(essences = null, stones = null, cities = null, restricted = null) {
  const out = [];
  for (const c of OUTLAW_COMPANIONS) {
    const b = c.build;
    if (!b || b.essences.length !== 3 || b.slotStones.length !== 4) out.push(`${c.id}: build shape`);
    if (b && b.slotStones.some(s => s.length !== 2)) out.push(`${c.id}: two stones a slot, the rest are the player's`);
    if (essences) for (const e of b.essences) if (!essences.includes(e)) out.push(`${c.id}: no essence ${e}`);
    if (restricted) for (const e of b.essences) if (restricted.includes(e)) out.push(`${c.id}: carries a restricted essence`);
    if (stones) for (const s of b.slotStones.flat()) if (!stones.includes(s)) out.push(`${c.id}: no stone ${s}`);
    if (cities && !cities.includes(c.city)) out.push(`${c.id}: no city ${c.city}`);
    if (!c.story || c.story.length < 3 || !c.storyAsk || !c.refuse) out.push(`${c.id}: missing recruitment lines`);
    const asks = (c.arc || []).filter(s => s.ask);
    if (asks.length !== 2) out.push(`${c.id}: two choices, for the redemption`);
    for (const s of asks) if (!s.ask.redeem || !s.ask.harden) out.push(`${s.id}: both answers`);
    for (const k of ['redeemed', 'unsure', 'hardened']) if (!c.endings || !c.endings[k]) out.push(`${c.id}: no ${k} ending`);
  }
  // ROUND 291 -- two per act city, Acts 1 and 2, and every line that has an
  // evil form has its neutral one.
  for (const [act, city] of Object.entries(OUTLAW_ACTS)) {
    const here = OUTLAW_COMPANIONS.filter(c => c.city === city);
    if (here.length !== OUTLAWS_PER_ACT) out.push(`act ${act}: ${here.length} companions in ${city}, want ${OUTLAWS_PER_ACT}`);
    for (const c of here) if (c.act !== Number(act)) out.push(`${c.id}: in ${city} but marked act ${c.act}`);
    const spots = new Set(here.map(c => `${(c.spot || {}).dx},${(c.spot || {}).dy}`));
    if (spots.size !== here.length) out.push(`${city}: two companions on one spot`);
  }
  if (OUTLAW_COMPANIONS.length !== OUTLAWS_PER_ACT * Object.keys(OUTLAW_ACTS).length) out.push('the roster is exactly the acts\' companions');
  for (const c of OUTLAW_COMPANIONS) {
    if (!c.greetEvil || !c.meditateEvil) out.push(`${c.id}: idle lines need their evil forms`);
    if ((c.arc || []).length !== 6) out.push(`${c.id}: six beats before the ending`);
    for (const s of (c.arc || [])) if (!s.line || s.line.length < 40 || (s.evil !== undefined && s.evil.length < 40)) out.push(`${s.id}: a real line in each tone`);
  }
  return out;
}
