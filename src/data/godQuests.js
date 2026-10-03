// ============================================================================
// ROUND 65 -- THE GODS ASK FOR THINGS.
//
// The user: "Each god should have a 'public' quest chain related to their
// domain and a private quest chain that can only be accessed if you are a
// disciple of that god i.e. have a divine essence from that deity in your
// confluence slot. God quests should be a chain related to their domain i.e.
// war wants to ensure that he is training his armies, knowledge wants specific
// information, purity is trying to cleanse a tainted wood, the examples are for
// region 1 with the scale and importance of the god quest chain growing with
// each region/rank."
//
// -------------------------------------------------------------------------
// THE SHAPE
// -------------------------------------------------------------------------
// Eight gods, two tracks each, four chapters per track -- one chapter per
// region, unlocking at the rank that region's own gate demands, so the chain
// grows in scale exactly as the world does. A chapter is an ordered list of
// STEPS, and only the current step is live: a chain is a thing you are in the
// middle of, not six notices on a board.
//
// Chapters get longer as they get more important: 2 steps in The Nek, 3 in
// Ontaria, 4 in Elehyd, 5 in Bratugal. The user asked for the scale to grow
// with the region and this is the cheapest honest way to say so.
//
// -------------------------------------------------------------------------
// WHY A STEP IS AN ORDINARY QUEST
// -------------------------------------------------------------------------
// Round 64 built six objective kinds -- hunt, cull, survey, delve, gather,
// relic -- with target selection, progress hooks, a done test and a turn-in
// path, all of it asserted. A god's step is one of those six with the god's
// own words on the front of it. That is not a shortcut: it means "kill eight
// of a family for War" and "kill eight of a family for a village board" are
// the same code, so a god quest cannot rot in a way an ordinary quest does
// not, and every progress hook already written counts for both.
//
// What each god changes is WHICH kinds it asks for -- Knowledge surveys and
// fetches, War culls and delves, Dominion holds ground -- and every line of
// text the player reads.
//
// -------------------------------------------------------------------------
// THE TWO TRACKS
// -------------------------------------------------------------------------
// PUBLIC is open to anyone who walks into the temple, and pays coins, stones
// and standing. PRIVATE opens the moment you are a disciple -- that god's
// divine essence in your confluence slot -- and is NOT gated behind the public
// chain (the user was explicit). Only the private track pays the four rewards
// the user specified, which is what makes bonding a divine essence, and its
// permanence, worth something:
//
//   region 1 -- a thematic divine awakening stone
//   region 2 -- a divine silver-rank weapon of the player's chosen type
//   region 3 -- a follower whose confluence is that god's divine essence
//   region 4 -- a full set of divine armour, keyed to that same essence
// ============================================================================

// -------------------------------------------------------------------------
// THE LORE EACH GOD WAS WRITTEN AGAINST
// -------------------------------------------------------------------------
// Recorded because the first draft of this file got Death wrong, and the only
// reason it was caught is that the user read it. A god here is not the generic
// fantasy version of its noun; it is the HWFWM version, and they differ in
// ways that change what a quest chain can ask for. Written down so the next
// round does not have to rediscover it.
//
//   DEATH      At WAR with Undeath -- a rival GOD, its cult, and everything
//              they leave walking. Not a judge, not a reaper of souls: the
//              natural end, offended that somebody is undoing his work. Dry
//              and civil about it. On good terms with Healing.
//   UNDEATH    Named as Death's enemy and deliberately has no temple, no
//              essence and no entry here. It is the antagonist of a domain,
//              not a member of the pantheon the player can bond.
//   KNOWLEDGE  Wants things KNOWN, not hoarded -- but knowledge is earned,
//              never handed over. The god who talks to outworlders.
//   WAR        Discipline, drill, logistics and the line holding. Respects
//              preparation; has no interest in slaughter for its own sake.
//   PURITY     Cleansing what has been fouled, and absolutist about it --
//              contain and survey are not answers, only clean is. The rigidity
//              is the character, not an accident of the writing.
//   HEALING    Gentle, and explicitly NOT anti-death: some cannot be saved and
//              Healing knows it. The domain is what can still be saved.
//   HEROES     The DEED, and the fact that a deed makes the next person brave.
//              An unwitnessed deed still counts -- which is why the public
//              track is about giving people an example and the private track
//              is about the deed nobody sees.
//   LIBERTY    Self-determination, and the enemy of anyone held against their
//              will. The one bond Liberty accepts is one freely chosen -- which
//              is exactly what bonding a divine essence is.
//   DOMINION   LEGITIMATE rule and the responsibility of it, not conquest.
//              Liberty's philosophical opposite and not its enemy; both are
//              good gods. What you hold, holds you.
//
// And the constraint they all share: a god cannot act directly in the world.
// Everything in this file is a god asking a mortal, because that is the only
// move a god has.
// -------------------------------------------------------------------------

import { DIVINE, DIVINE_GODS } from './divine.js';
import { ACT_ORDER, rankToReach } from './acts.js';

// ===========================================================================
// ROUND 182 -- SEVEN CHAPTERS, AND NONE OF THESE FOUR LISTS IS WRITTEN OUT.
//
// THE USER, asked how far the gods should follow the new regions: "Seven
// chapters per track" -- one per act, all seven regions, 48 newly authored
// chapters across eight gods and two tracks.
//
// The comment these four lines used to carry said the right thing and the
// code did not do it: "Chapter i is the region-i chapter, and unlocks at the
// rank that region's gate asks for." That was a DESCRIPTION of a derivation,
// sitting above four hand-written arrays that happened to agree with it while
// there were four regions and four ranks. Seven regions and four ranks do not
// line up one-to-one -- Sirukh Sands and Ontaria are both Bronze, the
// Cinderwaste and Elehyd are both Silver -- so the sentence and the arrays
// would have parted company on the first edit.
//
// They are the derivation now. `acts.js` owns the ordering, and the rank each
// region demands comes off the TRAVEL GRAPH: the hardest gate on the easiest
// road to it. A chapter can no longer be gated at a rank that cannot reach
// its own region, because the two are the same number.
// ===========================================================================

/** One chapter per act, in the order the player walks them. */
export const CHAPTER_REGION = ACT_ORDER;
export const CHAPTER_COUNT = CHAPTER_REGION.length;

/** The rank each chapter waits for: exactly what it costs to stand there. */
export const CHAPTER_RANK = CHAPTER_REGION.map(rankToReach);

/**
 * "the scale and importance ... growing with each region/rank."
 *
 * Off the RANK rather than the index, which is what that sentence actually
 * says and what the old [2,3,4,5] only coincidentally did. Two regions that
 * ask the same rank of the player ask the same size of chapter -- so Ontaria
 * and Sirukh Sands are both three steps, and the ramp is 2,3,3,4,4,5,5 rather
 * than a seven-rung slope nobody chose.
 */
const STEPS_BY_RANK = { normal: 2, iron: 2, bronze: 3, silver: 4, gold: 5 };
export const CHAPTER_STEPS = CHAPTER_RANK.map(r => STEPS_BY_RANK[r] || 3);
export const TRACKS = ['public', 'private'];

/**
 * What each god is actually trying to do, region by region.
 *
 * `kinds` is the objective vocabulary that god asks in -- War does not send
 * you to look at a standing stone and Knowledge does not send you to clear a
 * cave, and a god whose every chapter reads the same as every other god's is
 * eight copies of one quest chain wearing different names.
 *
 * `chapters` are the god's own premises, one per region, written to escalate:
 * a drill in The Nek, a war in Bratugal. `secret` is the disciple track, which
 * is the same domain seen from inside -- what the god wants done that it will
 * not say in front of a congregation.
 */
export const GOD_QUESTS = {
  war: {
    god: 'war',
    domain: 'the line that holds',
    kinds: { public: ['cull', 'delve', 'hunt'], private: ['hunt', 'delve', 'cull'] },
    families: ['wolf', 'boar', 'raptor', 'saberCanis'],
    siteKeys: ['battlefield', 'mineCave'],
    stone: { name: 'the Unbroken Line', family: 'blade', color: '#c0392b',
      phrase: 'the rank that does not break', desc: 'Held in the hand it steadies the arm, and will not let it lower.' },
    follower: { name: 'Serel Vance', role: 'melee', roleLabel: 'Melee DPS',
      blurb: 'Drilled the Cadence watch for eleven years and never once raised her voice.' },
    armour: { set: 'the Unbroken Line', stats: ['armor', 'critDamage', 'attackSpeed'] },
    weapon: { adj: 'Warsworn' },
    chapters: [
      { title: 'The Muster', line: 'My temple keeps a drill yard and no soldiers worth drilling. Go and make the ground safe enough to march on.' },
      { title: 'The Long Watch', line: 'A war is won by the season, not the day. Ontaria has stopped watching its own coast. Teach it.' },
      { title: 'The Salt Line', line: 'An island can\'t fall back. Whatever is coming ashore on Sirukh meets the people there or nobody, so go and be the second option.' },
      { title: 'The Broken Ground', line: 'Elehyd is where armies go to die of thirst. I want to know what is still alive out there, and I want it dealt with.' },
      { title: 'Held Ground', line: 'Slagward has a wall and a garrison and has never once been tested. Test the ground outside it before something else does.' },
      { title: 'The Last Field', line: 'There is a war coming that nobody in Vashra has noticed. You will notice it for them.' },
      { title: 'Nine Walls', line: 'They built that city nine times and walled it nine times. I want to know what came over the ninth.' },
    ],
    secret: [
      { title: 'A Blade Kept Sharp', line: 'You wear my essence. That makes you a weapon, and a weapon is honed in private.' },
      { title: 'What The Watch Will Not Do', line: 'There are things a city guard cannot be ordered to do. You are not a city guard.' },
      { title: 'No Ground Behind', line: 'Tell me honestly what the reef pilots would do if the ships stopped for good. I am asking because I already know, and I want to hear you say it.' },
      { title: 'The Attrition', line: 'I do not need you to win. I need you to cost them more than they can pay.' },
      { title: 'What The Heat Is For', line: 'A garrison that has never been tested isn\'t a garrison. Find me the thing down there that would test it.' },
      { title: 'The Line Itself', line: 'When it comes, you will be the line. Let us find out whether it holds.' },
      { title: 'Who They Lost To', line: 'Nine cities, nine walls, and the same street plan under every one. Somebody kept telling them how to build. Find out who, and whether it is still telling.' },
    ],
  },
  knowledge: {
    god: 'knowledge',
    domain: 'what is written down',
    kinds: { public: ['survey', 'relic', 'gather'], private: ['relic', 'survey', 'gather'] },
    siteKeys: ['stoneCircle', 'crystalHollow', 'rainbowGrove'],
    stone: { name: 'the Ten Thousand Pages', family: 'mind', color: '#8e7cc3',
      phrase: 'a fact you did not have', desc: 'Questions you had not thought to ask arrive fully formed.' },
    follower: { name: 'Ovric Tallow', role: 'ranged', roleLabel: 'Ranged DPS',
      blurb: 'Catalogued the Athenaeum twice and disagreed with himself both times.' },
    armour: { set: 'the Ten Thousand Pages', stats: ['castSpeed', 'cooldownReduction', 'maxMana'] },
    weapon: { adj: 'Annotated' },
    chapters: [
      { title: 'The Survey', line: 'The Nek is mapped badly and remembered worse. Go and stand in the places the maps only guess at.' },
      { title: 'The Coast Ledger', line: 'Ontaria writes down what it sells and nothing else. I want the rest of it.' },
      { title: 'The Charts Are Wrong', line: 'Every chart of that reef is wrong by about a boat\'s width, and every pilot knows it and none of them will write it down. Go and write it down.' },
      { title: 'What Elehyd Buried', line: 'A place that dry keeps its records. Bring me what it kept.' },
      { title: 'What Fire Leaves', line: 'Ash keeps a record when nothing else does. Bring me what the Cinderwaste has been writing since the last time anybody read it.' },
      { title: 'The Sealed Shelf', line: 'Vashra has an archive nobody is allowed to read. That is the one I want read.' },
      { title: 'Nine Layers', line: 'The Cut goes down through nine cities. Somebody must know which of them came first, and it won\'t be one of the diggers.' },
    ],
    secret: [
      { title: 'The Marginal Note', line: 'You carry my essence, so you already know the public chain is the abridged edition.' },
      { title: 'A Thing Not Catalogued', line: 'There is an item I have never been able to make anyone fetch. You will manage it.' },
      { title: 'Who Drew Them', line: 'The charts are not merely old. They are wrong in the same direction, all of them, which is a thing a mistake does not do. Find the first one.' },
      { title: 'The Redacted Passage', line: 'Somebody removed a page from the world. I would like it back.' },
      { title: 'The Ash Record', line: 'There is a layer down there that is not ash. I would like to know what year it is, and I would like to know it before the diggers do.' },
      { title: 'The Whole Truth', line: 'What you find at the end of this you may not want to have found. Go anyway.' },
      { title: 'The Same Street Plan', line: 'Nine generations do not copy a plan out of respect. Somebody was told, and told again, and I want the mouth it came out of.' },
    ],
  },
  purity: {
    god: 'purity',
    domain: 'what has been fouled',
    kinds: { public: ['delve', 'survey', 'cull'], private: ['delve', 'cull', 'relic'] },
    families: ['slime', 'spider', 'shade'],
    siteKeys: ['cultChamber', 'hiddenLair', 'rainbowGrove'],
    // "purity is trying to cleanse a tainted wood" -- the user's own example.
    // Round 64 put tainted woods in the world literally: a palette-touched
    // landmark IS a place an element has taken, so Purity's steps prefer them
    // over ordinary ground and the example becomes the mechanic.
    tainted: true,
    stone: { name: 'the Unmarked', family: 'light', color: '#e8e6de',
      phrase: 'nothing clinging to it', desc: 'It comes out of a bog as clean as it went in, and so does your hand.' },
    follower: { name: 'Sister Ilweth', role: 'tank', roleLabel: 'Tank',
      blurb: 'Walked into three tainted woods and came out of all of them the same colour she went in.' },
    armour: { set: 'the Unmarked', stats: ['resist_shadow', 'armor', 'hpRegen'] },
    weapon: { adj: 'Cleansing' },
    chapters: [
      { title: 'The Tainted Wood', line: 'There is a wood in The Nek that has gone the wrong colour. Go and find out what is standing in it.' },
      { title: 'The Sour Coast', line: 'Something is getting into Ontaria\'s water. It is not the sea.' },
      { title: 'The One Well', line: 'There is a single well on that island and eleven hundred people drink from it. Go and look at what lives near it.' },
      { title: 'The Stain That Spread', line: 'Elehyd was clean because nothing could live there. That has stopped being true.' },
      { title: 'Nothing Rots Here', line: 'The Cinderwaste is the cleanest ground in the world and the most hostile, and people confuse the two. Clear whatever is confusing them.' },
      { title: 'The Deep Rot', line: 'The swamp is not the corruption. The swamp is what the corruption is hiding under.' },
      { title: 'The Green Has It', line: 'A city can be fouled by growing things as surely as by rot. Go and see what the jungle has been doing to Ixcuatl since it stopped objecting.' },
    ],
    secret: [
      { title: 'The Colour Of It', line: 'You wear my essence, so you can see it the way I do. Tell me you understand what that means.' },
      { title: 'What The Congregation Is Not Told', line: 'The taint is not an accident and it is not natural. Somebody is making it.' },
      { title: 'What Is In It', line: 'One well, one key, one keeper. If anything ever got into that water, the island would be gone in a week and nobody would know why. Go and be sure.' },
      { title: 'Downstream', line: 'Follow it back. I have followed it as far as a god may go without being seen to.' },
      { title: 'The Clean Fire', line: 'Fire\'s the only honest cleaner there is. I want to know whether anything in the Cinderwaste has learned to survive it.' },
      { title: 'The Source', line: 'Clean it. Not contain it, not survey it. Clean it.' },
      { title: 'What The Green Was Given', line: 'Jungles don\'t eat cities that fast. Something fed it. Find out what, and what it was paid with.' },
    ],
  },
  healing: {
    god: 'healing',
    domain: 'what can still be saved',
    kinds: { public: ['gather', 'survey', 'delve'], private: ['gather', 'delve', 'relic'] },
    families: ['slime', 'spider', 'bat'],
    siteKeys: ['farmFields', 'riverMouth', 'hollowTree'],
    stone: { name: 'the Green Mercy', family: 'life', color: '#5fbf6a',
      phrase: 'the wound already closing', desc: 'Old scars ache pleasantly, the way a thing does when it is finally healing.' },
    follower: { name: 'Anselm Reed', role: 'healer', roleLabel: 'Healer',
      blurb: 'Ran the Harrowmoor infirmary through two bad winters and lost fewer than anyone expected.' },
    armour: { set: 'the Green Mercy', stats: ['hpRegen', 'manaRegen', 'maxHp'] },
    weapon: { adj: 'Mercybound' },
    chapters: [
      { title: 'The Short Supply', line: 'The Nek\'s villages are out of everything a wound needs. Fetch, and keep fetching.' },
      { title: 'The Fever Coast', line: 'Something is going round the Ontaria villages and the physicians are guessing.' },
      { title: 'Four Days Of Water', line: 'Sirukh is four days from a physician in good weather. Whatever is out there hurting people, I would rather it stopped before the crossing matters.' },
      { title: 'Nothing Grows Here', line: 'A place with no medicine in it needs more of it, not less. Bring what Elehyd can\'t grow.' },
      { title: 'Burns', line: 'Slagward\'s infirmary is full and its people call it ordinary. Go and reduce the ordinary.' },
      { title: 'The Ward That Emptied', line: 'People are going into Vashra\'s hospitals and not coming out. Find out where they go.' },
      { title: 'Fever Ground', line: 'Everyone who comes out of that jungle comes out ill, and the camps have stopped calling it a coincidence. Nor have I.' },
    ],
    secret: [
      { title: 'The Ones Beyond Help', line: 'You carry my essence, so you have felt it: some of them cannot be saved. I need you to look anyway.' },
      { title: 'The Thing In The Blood', line: 'It is not a sickness. Bring me proof it is not a sickness.' },
      { title: 'The Ones Who Do Not Sail', line: 'When the ships stop, the sick don\'t leave. I want the names of the ones who would not have made the crossing anyway, and I want them treated first.' },
      { title: 'What Is Being Made', line: 'Somebody is manufacturing the wounded. That is a different job.' },
      { title: 'What Heat Does To The Willing', line: 'They work the kilns knowing what it costs and they do it anyway, and I won\'t call that a choice. Go and make the cost smaller.' },
      { title: 'The Mercy Itself', line: 'End it. Gently, if you can. End it either way.' },
      { title: 'The Ones Who Stayed', line: 'There are people in those camps who won\'t come out and can\'t say why. Find what is keeping them.' },
    ],
  },
  // ROUND 65 -- THE USER, mid-round: "the god of deaths domain is to fight the
  // god of undeath, the cultists of undeath, killing zombies and destroying all
  // undead. It's a somewhat unique aspect of the god of death."
  //
  // The first draft had Death as a vague custodian of a door somebody was
  // jamming, which is the generic fantasy death god and not this one. Death
  // here is at WAR, and has one specific enemy: Undeath, its cult, and every
  // walking thing they leave behind. So this god's chapters are a campaign
  // rather than a set of errands, and its objectives are pointed at the
  // undead families and the barrows the world already contains.
  death: {
    god: 'death',
    domain: 'the war on Undeath',
    kinds: { public: ['cull', 'delve', 'hunt'], private: ['delve', 'hunt', 'cull'] },
    families: ['skeleton', 'shade'],
    siteKeys: ['barrow', 'cultChamber'],
    stone: { name: 'the Last Door', family: 'death', color: '#4a4358',
      phrase: 'a thing that stays dead', desc: 'Everything it touches settles, and stays settled.' },
    follower: { name: 'Hollis Grave', role: 'melee', roleLabel: 'Melee DPS',
      blurb: 'Digs the graves at Fenn Cross and has strong opinions about how few of them stay shut.' },
    armour: { set: 'the Last Door', stats: ['critChance', 'resist_shadow', 'maxHp'] },
    weapon: { adj: 'Doorwarden' },
    chapters: [
      { title: 'The Ones Still Standing', line: 'Things are walking in The Nek that I already called. That is Undeath\'s hand in my work. Put them back down.' },
      { title: 'What The Sea Returns', line: 'Ontaria buries its dead at sea, and something has begun sending them back. Find the cell doing it.' },
      { title: 'The Reef Keeps Them', line: 'Two ships struck that reef empty. Empty ships don\'t steer themselves onto rock. Go and see what is crewing them.' },
      { title: 'The Dry Ground Keeps Them', line: 'Nothing rots in Elehyd, which makes it a larder. Undeath has been shopping there for years.' },
      { title: 'The Burning Ground', line: 'The Cinderwaste is the one country where my work is easy and nobody does it. Find what has been spared the fire.' },
      { title: 'The Cult Entire', line: 'Bratugal is where they think they are safe. Show them the difference between me and my rival.' },
      { title: 'A City Of Them', line: 'Nine generations died in Ixcuatl and none of them were buried by anybody who is still alive. Go and see how many stayed.' },
    ],
    secret: [
      { title: 'My Rival, Named', line: 'You wear my essence, so you may hear it plainly: Undeath is a god, it is my enemy, and it is winning quietly.' },
      { title: 'The Ledger Of The Unreturned', line: 'I keep a count of who has come through. It has stopped matching. Find me the difference.' },
      { title: 'Crews That Came Back', line: 'I am not interested in the wrecks. I am interested in the ones that made the reef, tied up, and unloaded. Find out who signed for that cargo.' },
      { title: 'The Ones Who Do The Lifting', line: 'A god cannot raise a corpse without hands. Take the hands.' },
      { title: 'What Will Not Burn', line: 'Bring me the thing in the Cinderwaste that heat does not touch. Do not open it.' },
      { title: 'The Closing', line: 'Undeath will have left something of itself here. End it, and I will meet you on the other side of the door.' },
      { title: 'Nine Generations', line: 'Under nine identical streets there are nine identical graveyards, and the bottom one is not full. Go down and tell me where they went.' },
    ],
  },
  heros: {
    god: 'heros',
    domain: 'the deed people repeat',
    kinds: { public: ['hunt', 'cull', 'survey'], private: ['hunt', 'delve', 'cull'] },
    families: ['chimera', 'hydra', 'trex', 'dragon'],
    siteKeys: ['battlefield', 'magmaCave'],
    stone: { name: 'the Deed Remembered', family: 'light', color: '#e0a83a',
      phrase: 'a story worth telling twice', desc: 'You catch yourself standing straighter, in case someone is watching.' },
    follower: { name: 'Bright Callo', role: 'melee', roleLabel: 'Melee DPS',
      blurb: 'Has a ballad about him already and is painfully aware he has not earned it yet.' },
    armour: { set: 'the Deed Remembered', stats: ['critChance', 'critDamage', 'maxHp'] },
    weapon: { adj: 'Storied' },
    chapters: [
      { title: 'A Name Worth Having', line: 'The Nek has nobody to point at. Give them somebody, where they can see it -- the point is not you, it is the next one who tries.' },
      { title: 'The Coast Remembers', line: 'Ontaria tells stories about pirates because nobody gave it a better one.' },
      { title: 'The Story On The Quay', line: 'Tolbrand Quay tells one story about a wreck and a pilot, and it\'s got better every year. Go and find out how much of it is true. Leave the rest.' },
      { title: 'Where Nobody Watches', line: 'Elehyd has no audience at all. That is what makes it worth doing.' },
      { title: 'The Wall At Slagward', line: 'Every country has one wall that hasn\'t ever been taken, and every one of them\'s a story waiting for the day it is. Go and put that day off.' },
      { title: 'The Deed Itself', line: 'One thing, in front of the whole of Vashra. You will know it when I name it.' },
      { title: 'The Last Expedition', line: 'Somebody walked into the Stepped City ahead of you and the camps still say the name. Find out whether they earned it.' },
    ],
    secret: [
      { title: 'The Part They Leave Out', line: 'You carry my essence, so you have noticed the songs are edited. Let us do the unedited version.' },
      { title: 'The Unwitnessed', line: 'A deed nobody saw is still a deed. I will see it.' },
      { title: 'Who It Was Really About', line: 'The pilot in that story had a name and the story has stopped using it. Get it back for me.' },
      { title: 'The Cost Nobody Sings', line: 'This one will take something from you and the ballad won\'t mention it.' },
      { title: 'The Ones Not Written Down', line: 'Slagward\'s wall held because of people nobody has ever named. I want four names. Real ones.' },
      { title: 'What You Are For', line: 'Last one. After this the story is yours and I stop writing it.' },
      { title: 'How It Really Ended', line: 'The last expedition came back one short and the camps agreed on a version. Go and find the one they didn\'t.' },
    ],
  },
  liberty: {
    god: 'liberty',
    // ROUND 214 -- the user, correcting me: "Liberty is about freedom,
    // Dominion is about subservience." The old phrasing was a picture of
    // freedom rather than the word, and next to Dominion's "ground that is
    // held" the pair read as two gods arguing about territory. They are not:
    // one is for people belonging to themselves and the other is for people
    // belonging to somebody. Stated plainly so the two cannot be mistaken
    // for each other again.
    domain: 'freedom, and who is denied it',
    kinds: { public: ['delve', 'survey', 'cull'], private: ['delve', 'cull', 'hunt'] },
    families: ['demon', 'skeleton', 'hellhound'],
    siteKeys: ['mineCave', 'hiddenLair', 'barrow'],
    stone: { name: 'the Open Hand', family: 'motion', color: '#3aa7c4',
      phrase: 'the lock already open', desc: 'Doors feel lighter. Some of them were not locked to begin with.' },
    follower: { name: 'Rell Quickmark', role: 'ranged', roleLabel: 'Ranged DPS',
      blurb: 'Broke out of three cells and has never explained how she got into the first one.' },
    armour: { set: 'the Open Hand', stats: ['dodgeChance', 'staminaRegen', 'attackSpeed'] },
    weapon: { adj: 'Unbound' },
    chapters: [
      { title: 'The Ones Held', line: 'There are people in The Nek being kept somewhere. Go and stop that being true.' },
      { title: 'The Company Town', line: 'Little Gale is owned. Not governed -- owned. See what that costs the people in it.' },
      { title: 'Company Salt', line: 'The pan belongs to a family, the quay belongs to a family, and the people raking it belong to the arithmetic. Go and make the arithmetic worse.' },
      { title: 'The Work Gangs', line: 'Elehyd\'s roads were built by somebody. Nobody will say who.' },
      { title: 'Bound To The Kilns', line: 'Nobody chooses the Cinderwaste. They arrive owing something and the kilns are how it\'s paid. Break whatever is holding the ledger.' },
      { title: 'A King Is A Kind Of Lock', line: 'You will not depose him. You will simply make the door less convincing.' },
      { title: 'Nobody Rules Here', line: 'Ixcuatl is the one country in the world with no king, no council and no company, and the camps are frightened of it. Go and see what they are frightened of.' },
    ],
    secret: [
      { title: 'What You Freed Yourself From', line: 'You wear my essence, which is the one bond I approve of, and only because you chose it.' },
      { title: 'The Cage That Looks Like A Home', line: 'The worst of them are the ones nobody is trying to leave.' },
      { title: 'The Debt', line: 'Mira Tolbrand\'s family holds the quay, the warehouse and the debt. Find out who holds the debt, because it is not her.' },
      { title: 'Who Holds The Key', line: 'Find the hand. Not the door, not the guard. The hand.' },
      { title: 'Who Owns The Heat', line: 'The kilns never go out, and somebody decided that. Find the person, not the reason.' },
      { title: 'Open It', line: 'You know what to do and I\'m not going to insult you by saying it.' },
      { title: 'Why That Frightens Them', line: 'A place with nobody in charge should be the easiest place in the world to walk into. Ask yourself why the camps stop at the stairs.' },
    ],
  },
  dominion: {
    god: 'dominion',
    // ROUND 214 -- see the note on liberty. Dominion is not about ground.
    domain: 'subservience, and who is owed it',
    kinds: { public: ['delve', 'cull', 'hunt'], private: ['delve', 'hunt', 'relic'] },
    families: ['lizard', 'raptor', 'elemental'],
    siteKeys: ['stoneCircle', 'mineCave', 'magmaCave'],
    stone: { name: 'the Seated Crown', family: 'guard', color: '#b5892f',
      phrase: 'a thing that will not be moved', desc: 'It sits in the palm as though the palm were built to hold it.' },
    follower: { name: 'Warden Aske', role: 'tank', roleLabel: 'Tank',
      blurb: 'Held a gate for a day and a half and considers the story an exaggeration.' },
    armour: { set: 'the Seated Crown', stats: ['armor', 'blockChance', 'maxHp'] },
    weapon: { adj: 'Sovereign' },
    chapters: [
      { title: 'The First Holding', line: 'A crown is not ground you took. It is ground you are still standing on when everyone else has run. Find some in The Nek and hold it.' },
      { title: 'The Contested Coast', line: 'Ontaria is held by four people who each think it is theirs. Make it clear it is not.' },
      { title: 'An Island Is A Holding', line: 'Sirukh has one harbour, one road and one well. Ground that concentrated is ground that can be held, and nobody is holding it.' },
      { title: 'The Unruled Waste', line: 'Nobody rules Elehyd because nobody has bothered. Bother.' },
      { title: 'Ground Nobody Wants', line: 'The Cinderwaste is worthless, which is why it\'s the only country nobody has ever fought for. Secure it before somebody works out why they should.' },
      { title: 'The Seat Itself', line: 'There is a throne in Vashra with the wrong person on it. We will discuss that later.' },
      { title: 'Held Nine Times', line: 'That city was taken and held nine times over. Go and find out what holding it required.' },
    ],
    secret: [
      { title: 'What A Crown Costs', line: 'You wear my essence. Then you already suspect this is not about being obeyed.' },
      { title: 'The Ground You Cannot Leave', line: 'Anything you hold, holds you. Let us find out what you can carry.' },
      { title: 'One Gate', line: 'Everything on that island comes through one quay. Whoever holds the quay holds the island, and at present it is a merchant family in debt. Consider that.' },
      { title: 'The Rival', line: 'Something out there is also collecting. I want it collected.' },
      { title: 'Hold It Anyway', line: 'Worthless ground is the cheapest ground to own and the hardest to be evicted from. I want the Cinderwaste, and I want nobody to notice.' },
      { title: 'Sit', line: 'The last thing I ask is the only thing I have ever asked of anyone.' },
      { title: 'And Lost Nine Times', line: 'Nine times held, nine times lost, and the ninth is still down there. Find out which it was, and whether it is finished.' },
    ],
  },
};

export const GOD_QUEST_GODS = Object.keys(GOD_QUESTS);

/** The stone a god's region-1 chapter pays. Added to STONE_CATALOG at load
 *  (see stoneCatalog.js) so it sockets, generates abilities and shows its
 *  icon exactly like the other 180 -- and is flagged so no drop, shelf or
 *  landmark can hand one out instead. */
export function godStoneId(god) { return `stoneDivine${god.charAt(0).toUpperCase()}${god.slice(1)}`; }

export function godStoneEntries() {
  const out = {};
  for (const god of GOD_QUEST_GODS) {
    const q = GOD_QUESTS[god];
    out[godStoneId(god)] = {
      name: q.stone.name, rarity: 'Divine', family: q.stone.family,
      color: q.stone.color, phrase: q.stone.phrase, desc: q.stone.desc,
      godOnly: god,
    };
  }
  return out;
}

/**
 * How many steps chapter `c` holds, and whether the player may start it.
 *
 * The rank gate is the region's OWN gate, borrowed rather than invented: a
 * chapter set in Elehyd asks for the Silver that the ship to Elehyd asks for.
 * Inventing a second ladder would let a god send you somewhere the world will
 * not let you go.
 */
export function chapterUnlocked(chapter, playerRank, rankOrder) {
  const need = CHAPTER_RANK[chapter];
  if (!need) return false;
  return rankOrder.indexOf(playerRank || 'normal') >= rankOrder.indexOf(need);
}

export function chapterSteps(chapter) { return CHAPTER_STEPS[chapter] || 3; }

/** The objective kind this step asks for -- walked round-robin through the
 *  god's own vocabulary so a chapter never asks the same thing twice running
 *  when it has more than one kind to draw on. */
export function stepKind(god, track, chapter, step) {
  const q = GOD_QUESTS[god];
  const kinds = (q && q.kinds[track]) || ['cull'];
  return kinds[(chapter + step) % kinds.length];
}

/** A step's title, in the god's voice. The chapter names the arc; the step
 *  says which part of it this is, so a five-step chapter reads as a chain and
 *  not as five unrelated notices. */
export function stepTitle(god, track, chapter, step, total) {
  const q = GOD_QUESTS[god];
  const ch = (track === 'private' ? q.secret : q.chapters)[chapter];
  const name = ch ? ch.title : 'A Task';
  if (total <= 1) return name;
  return `${name} (${step + 1} of ${total})`;
}

export function chapterPremise(god, track, chapter) {
  const q = GOD_QUESTS[god];
  const ch = (track === 'private' ? q.secret : q.chapters)[chapter];
  return ch ? ch.line : '';
}

export function chapterTitle(god, track, chapter) {
  const q = GOD_QUESTS[god];
  const ch = (track === 'private' ? q.secret : q.chapters)[chapter];
  return ch ? ch.title : '';
}

// --- rewards ---------------------------------------------------------------

/**
 * The public track's pay. Every chapter also hands over an ordinary awakening
 * stone in the god's own family -- worth taking, and pointedly not divine. The
 * user: the four divine rewards belong to the disciple track.
 *
 * ROUND 66 -- PAID IN RANK COINS, at the user's direction:
 *
 *   region 1  200 iron      region 3  400 silver
 *   region 2  300 bronze    region 4  500 gold
 *
 * Round 65 paid a flat number of NORMAL-rank coins (220 / 700 / 2200 / 6500),
 * which was the wrong axis entirely. The spirit-coin ladder is x100 a rung
 * (COIN_CONVERSION, inventory.js), so the old top chapter paid 6,500 normal
 * coins -- less than one bronze -- for the Bratugal chapter of a gold-rank
 * chain. The new ladder is worth 2,000,000x the first chapter by the fourth,
 * which is what "the scale and importance growing with each region" means when
 * the currency itself has ranks in it.
 *
 * Kept as {rank, amount} rather than a pre-converted number because
 * `grantCoins` takes a rank and normalises upward from there, and because the
 * player-facing line should read "200 Iron Rank Coins" -- the denomination is
 * the point. (The purse will normalise 200 iron into 2 bronze on the way in;
 * that is the same value, and normalising is what every other payout does.)
 */
export const PUBLIC_CHAPTER_COINS = [
  { rank: 'iron', amount: 200 },
  { rank: 'bronze', amount: 300 },
  { rank: 'silver', amount: 400 },
  { rank: 'gold', amount: 500 },
];

/** "200 Iron Rank Coins" -- the payout as the player should read it. */
export function publicChapterPayLabel(chapter) {
  const p = PUBLIC_CHAPTER_COINS[chapter];
  if (!p) return '';
  const word = p.rank.charAt(0).toUpperCase() + p.rank.slice(1);
  return `${p.amount} ${word} Rank Coins`;
}

/** Which of the four the private track pays at this chapter. */
export const PRIVATE_REWARD = ['stone', 'weapon', 'follower', 'armour'];

/**
 * A divine armour set: one piece per armour slot, all Divine rarity, named
 * for the god.
 *
 * TIED TO THE ESSENCE, as asked. Each piece carries its own always-on buffs
 * AND a set bonus that only applies while that god's divine essence is in the
 * confluence slot -- which is what makes it the god's armour rather than eight
 * good items that happen to share a name. Take the essence off and the set
 * bonus goes with it.
 */
export const DIVINE_SET_PIECE_AMOUNT = { armor: 6, critChance: 0.05, critDamage: 0.18, attackSpeed: 0.06,
  castSpeed: 0.06, cooldownReduction: 0.05, maxHp: 26, maxMana: 22, hpRegen: 1.2, manaRegen: 1.2,
  staminaRegen: 1.2, blockChance: 0.05, dodgeChance: 0.05, resist_shadow: 0.1, resist_fire: 0.1,
  resist_frost: 0.1, resist_lightning: 0.1, resist_nature: 0.1, resist_radiant: 0.1 };
/** The set bonus is the piece bonus again, once, for wearing the whole thing
 *  while bonded -- so a full set is worth about a ninth piece and the essence
 *  is what switches it on. */
export const DIVINE_SET_BONUS_MULT = 1.0;

export function divineSetPieceName(god, slot, slotNoun) {
  const q = GOD_QUESTS[god];
  return `${slotNoun} of ${q.armour.set}`;
}

/** The blessing a region-2 chapter lays on the weapon type the player picks.
 *  Not a new item: weapons in this game are TYPES the player owns, so a
 *  divine weapon is that type, owned, and blessed -- which keeps the whole
 *  weapon system untouched and still gives the player a real choice. */
export const DIVINE_WEAPON_DMG_PCT = 0.35;

export function divineWeaponName(god, weaponName) {
  const q = GOD_QUESTS[god];
  return `${q.weapon.adj} ${weaponName} of ${q.armour.set}`;
}

/** Every stat a god's gear may roll, so the suite can assert a god's kit is
 *  actually themed rather than eight identical bulwarks. */
export function godStats(god) {
  const q = GOD_QUESTS[god];
  return (q && q.armour.stats) || ['armor'];
}

/** Sanity over the authored content -- eight gods, four chapters and four
 *  secret chapters each, every one with a title and a line, and every god
 *  drawing on at least two objective kinds per track. Asserted by the suite,
 *  because a god with a missing chapter is a chain that stops dead. */
export function godQuestFaults() {
  const bad = [];
  for (const god of DIVINE_GODS) {
    const q = GOD_QUESTS[god];
    if (!q) { bad.push(`${god}:missing`); continue; }
    for (const [track, list] of [['public', q.chapters], ['private', q.secret]]) {
      if (!list || list.length !== CHAPTER_COUNT) { bad.push(`${god}.${track}:chapters=${list ? list.length : 0}`); continue; }
      for (let i = 0; i < list.length; i++) {
        if (!list[i].title) bad.push(`${god}.${track}.${i}:no-title`);
        if (!list[i].line || list[i].line.length < 20) bad.push(`${god}.${track}.${i}:no-line`);
      }
      const kinds = q.kinds[track] || [];
      if (kinds.length < 2) bad.push(`${god}.${track}:one-kind`);
    }
    if (!q.stone || !q.stone.name) bad.push(`${god}:no-stone`);
    if (!q.follower || !q.follower.name) bad.push(`${god}:no-follower`);
    if (!q.armour || !q.armour.stats || q.armour.stats.length < 3) bad.push(`${god}:thin-armour`);
    if (!q.weapon || !q.weapon.adj) bad.push(`${god}:no-weapon-adj`);
  }
  // Two gods must not share a chapter title, or the Quests tab reads as a bug.
  const titles = new Set(); let dupes = 0;
  for (const god of GOD_QUEST_GODS) {
    for (const list of [GOD_QUESTS[god].chapters, GOD_QUESTS[god].secret]) {
      for (const c of list) { if (titles.has(c.title)) dupes++; titles.add(c.title); }
    }
  }
  if (dupes) bad.push(`duplicate-chapter-titles:${dupes}`);
  return bad;
}

/** The god's name for the player, once they are bonded. Used in the private
 *  track's dialogue so the two tracks do not read identically. */
export function discipleWord(god) {
  return ({
    war: 'soldier', knowledge: 'reader', purity: 'clean thing', healing: 'hand',
    death: 'doorkeeper', heros: 'name', liberty: 'free one', dominion: 'holder',
  })[god] || 'disciple';
}

export { DIVINE };
