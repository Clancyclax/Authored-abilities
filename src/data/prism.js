// ============================================================================
// ROUND 124 -- PRISM STUBBY, THE OTHER ONE WHO WOKE UP HERE.
//
// The user, in full:
//
//   "We need to add another character to the sewers. A woman, named Prism
//    Stubby, who appears next to you when you arrive. She is also confused and
//    from another world. Prism doesn't undertand whats going on and relys on
//    you to get out of the sewer following you around and running from any
//    monsters. If you respawn she does too.
//
//    Prism is somewhat scared, but determined and shouts out suggestions ...
//    Once you escape she is thankful and after you get to the surface she
//    heads to the adventurers society. After a day you can find her in the
//    adventure society building now in a full new set of armor.
//
//    Prism can be convinced to join the players party but has no essences,
//    allowing the player to effectively build a full 2nd character.
//
//    Prism is sarcastic and funny. Conversations with Prism about her life
//    back on earth reveal she grew up wrestling and learned Taekwondo. She's
//    worked as a teacher, a waitress, a bartender. Prism is funny and
//    sarcastic but also a little disorganized and unmotivated.
//
//    Her quest chain will be about figuring out what she wants her life to be
//    when she goes back to earth. Each region should have some quests around
//    trying a new job and trying to figure out how to cook. Her silver to gold
//    transition is embracing her confluence essence (whatever it is) and
//    realizing that this new world is a better fit for her anyway."
//
// WHY SHE IS HER OWN FILE. Everything about Prism is written text -- barks,
// dialogue, an arc -- and party.js is a roster of four builds. Putting a fifth
// person's entire voice in there would bury the builds; putting her build in
// here would put half of one character in two files. So the BUILD stays in
// party.js with the others and the VOICE lives here, which is the same split
// companionStory.js already makes for the other four.
//
// THE ONE THING THAT IS NOT WRITING: she has no essences. Every other member
// of the roster arrives as a finished person with three essences and a
// confluence; Prism arrives as a person with nothing, and the player fills
// four slots with essences out of their own bag. See `_partySocketEssence`.
// ============================================================================

/** Her id everywhere: party.js, companionStory.js, audio themes, save fields. */
export const PRISM_ID = 'prism';

// ---------------------------------------------------------------------------
// THE SEWER
//
// "somewhat scared, but determined and shouts out suggestions". The barks are
// the whole of her characterisation before the player has spoken to her once,
// so they carry three things at the same time: she is frightened, she is
// trying to be useful, and she is funnier than the situation deserves.
//
// Each has a TRIGGER rather than a timer. The user's own examples are all
// reactions -- to the water, to the traps, to her own interface, to a slime --
// and a line fired on a clock says them into an empty corridor.
// ---------------------------------------------------------------------------
export const PRISM_BARKS = [
  // --- on arrival, in order, one per trigger --------------------------------
  { id: 'wake', on: 'arrive', wait: 1.2,
    line: "Okay. Okay okay okay. You're seeing this too, right? Please be seeing this too." },
  { id: 'menu', on: 'arrive', wait: 8,
    line: "Woah, I have like a menu and screens and stuff. Do you have this too? Is there a settings tab? There is NOT a settings tab." },
  { id: 'name', on: 'arrive', wait: 18,
    line: "I'm Prism, by the way. Prism Stubby. Yes, really. No, I didn't pick it. Take it up with my mother." },

  // --- what she sees --------------------------------------------------------
  { id: 'slime', on: 'sawMonster', family: 'slime',
    line: "Holy fuck is that a literal slime monster. Fuuuck that. Fuck that entirely." },
  { id: 'monster', on: 'sawMonster',
    line: "Nope. No. That's a you problem, I'm going to be over here being a me problem." },
  { id: 'water', on: 'nearWater',
    line: "Maybe we can follow the water to the source? Water goes somewhere. Everything goes somewhere." },
  { id: 'trap', on: 'nearTrap',
    line: "We should lure them into the traps. That's a thing, right? That's a strategy people do." },
  { id: 'dark', on: 'deepDark',
    line: "I have never once in my life wished I had a torch and now it is all I think about." },

  // --- what happens ---------------------------------------------------------
  { id: 'kill', on: 'playerKill',
    line: "OH you just — okay. Okay! That's a skill you have. Great. Love that for us." },
  { id: 'hurt', on: 'playerHurt',
    line: "Hey! HEY. Don't do that, I need you. I have a whole personality and zero abilities." },
  { id: 'loot', on: 'playerLoot',
    line: "Are we looting? Is that what we're doing? God, I'm going to be so good at this." },
  { id: 'respawn', on: 'respawn',
    line: "...and we're back. Cool. Cool cool cool. I'm choosing not to think about what that was." },
  { id: 'cultist', on: 'sawCultist',
    line: "Okay that one's a PERSON. That's worse. Why is that worse? That's so much worse." },
  { id: 'ladder', on: 'nearLadder',
    line: "Is that a ladder? Please be a ladder. I will personally kiss that ladder." },
];
export const PRISM_BARK_IDS = PRISM_BARKS.map(b => b.id);
/** How long a bark holds on screen, and the floor between any two of them --
 *  she is meant to be a companion, not a radio station. */
export const PRISM_BARK_SECONDS = 5.5;
export const PRISM_BARK_GAP = 9;

/** Said once, at the top of the ladder. The user: "Once you escape she is
 *  thankful and after you get to the surface she heads to the adventurers
 *  society." Both halves are here: the thanks, and where she is going. */
export const PRISM_ESCAPE = {
  name: 'Prism Stubby',
  text:
    "Oh my god. Sky. That's a sky.\n\n"
    + "Okay — thank you. Genuinely. I'd still be down there doing breathing exercises at a "
    + "slime.\n\nSomebody up here said there's an Adventure Society, and apparently that's the "
    + "place you go when you've got no idea what's happening to you, which is me. That's my "
    + "whole situation. I'm going to go and stand in their building until somebody explains it.\n\n"
    + "Come and find me? I'm serious. You're the only person I know on this entire planet.",
};

/** ROUND 269 -- over her head as she walks off to the Society, after the
 *  page above. Short, because it is read while she is moving away. */
export const PRISM_GOODBYE_LINE = "Society. Big building. I'll find it. Don't die before you come and get me.";

/** What she says when you find her at the Society, before she joins. One page,
 *  because the recruit line follows it immediately. */
export const PRISM_GUILD_GREET =
  "HEY! You're alive! I told them about you — the guy at the desk wrote it down and "
  + "everything, I have a FILE.\n\n"
  + "Look at this. Look at me. They gave me armour. Actual armour, that fits, for free, "
  + "because I signed a form. I have never once had a job with a uniform this good.";

// ---------------------------------------------------------------------------
// WHO SHE IS, WHEN YOU ASK
//
// "Conversations with Prism about her life back on earth reveal she grew up
// wrestling and learned Taekwondo. She's worked as a teacher, a waitress, a
// bartender. Prism is funny and sarcastic but also a little disorganized and
// unmotivated."
//
// The unmotivated part is the hard one to write without making her tiresome,
// and the answer the arc takes is that she is not lazy -- she is somebody who
// has never been told that any of the things she is good at were worth being
// good at. Wrestling and Taekwondo are the two things she stuck with, and
// nobody ever suggested those counted as anything.
// ---------------------------------------------------------------------------
export const PRISM_ARC = [
  { id: 'prism_1',
    line: "Fine, backstory. I wrestled. Like, actually — school team, then club, then "
        + "eleven years of Taekwondo on top. Second dan. My mum has a shelf.\n\nAnd then I "
        + "graduated and everyone went 'so what are you going to do', and it turns out the answer "
        + "was nothing! For ages!" },
  { id: 'prism_2', need: { told: 1 },
    line: "Jobs I have had: teacher, waitress, bartender. In that order, which is the wrong "
        + "order, apparently.\n\nTeaching I was good at and hated. Waitressing I was bad at and "
        + "hated. Bartending I was good at and liked, which felt like cheating, so obviously I "
        + "quit." },
  { id: 'prism_3', need: { told: 2, rank: 'iron' },
    line: "Here's the thing nobody tells you about a fight. It's the same as a match. Same "
        + "breathing, same footwork, same horrible little second where you decide.\n\nEleven "
        + "years of that and I thought it was a hobby. Turns out it was the only vocational "
        + "training I ever finished." },
  { id: 'prism_4', need: { told: 3, rank: 'iron' },
    line: "I keep doing the maths on going home. Like — if there's a door, I take it, obviously. "
        + "That's not a question.\n\nIt's the bit AFTER the door I can't picture. I go back and "
        + "then what, I pull pints and don't tell anyone about the slimes?" },
  { id: 'prism_5', need: { told: 4, rank: 'bronze' },
    line: "Somebody called me an adventurer today. Out loud. To my face. As a job.\n\nI laughed "
        + "and then I thought about it for four hours. Nobody has ever described me with a noun "
        + "I liked before." },
  { id: 'prism_6', need: { told: 5, rank: 'bronze' },
    line: "I've been cooking. Badly. On purpose, though — I'm working through it like a "
        + "curriculum, because that's the one thing teaching actually gave me.\n\nDon't eat "
        + "anything I make before silver. I'm serious. I'm keeping notes and the notes are "
        + "frightening." },
  { id: 'prism_7', need: { told: 6, rank: 'silver' },
    line: "So I finally looked at what my essences added up to. Properly, with the confluence "
        + "and everything.\n\nAnd it's ME. That's the horrible part. Whatever that thing is, it "
        + "looked at my whole disorganised mess of a life and went 'yes, this, this is a "
        + "person'. Nothing on Earth ever did that." },
  { id: 'prism_8', need: { told: 7, rank: 'gold' },
    line: "I'm not looking for the door any more.\n\nI spent twenty-nine years being told I "
        + "hadn't decided what to be yet. Then I fell down a hole into a world that took one "
        + "look at me and handed me armour and a job. I'm not going back to the shelf.\n\n"
        + "I'd like you to know I'm not being brave about it. This is just better." },
];

/** What she says on the asks between arc steps -- indexed by told-count and
 *  ask-count, so it moves without flickering. */
export const PRISM_IDLE = [
  "I've decided the cave smell is a personality. Not mine. The cave's.",
  "Do you ever think about how there's no coffee here? I think about it professionally.",
  "I'm not saying I have a plan. I'm saying I have a direction, and that's basically a plan's cousin.",
  "If I get a nickname out here I want it on the record that I'd like to be consulted.",
  "Somebody asked what I did before. I said 'bartender' and they were IMPRESSED. This place is great.",
  "I'm keeping a list of things that shouldn't be alive. It's getting long and I'm running out of adjectives.",
  "Honestly? Best year I've had. Low bar. Still counts.",
];

/** Banter pairs -- `companionStoryFaults` requires every arc id to appear in at
 *  least one, and it is right to: a companion nobody talks to is furniture. */
export const PRISM_BANTER = [
  { who: ['prism', 'zeke'], lines: [
    "Zeke, be honest with me. Is any of this normal for here.",
    "Not one bit of it. You're taking it better than I did, and I had thirty years of warning.",
  ] },
  { who: ['prism', 'benjamin'], need: { rank: 'iron' }, lines: [
    "Benjamin, your whole thing is standing in front of people and getting hit. That's it, right?",
    "That is the entirety of it, yes.",
  ] },
  { who: ['prism', 'aedia'], need: { rank: 'bronze' }, lines: [
    "I could take you. In a ring. Rules, mat, no knives.",
    "Add knives and I will consider it a fair contest.",
  ] },
  { who: ['prism', 'encykla'], need: { rank: 'silver' }, lines: [
    "Encykla, if someone from another world turned up and said they wanted a job, what would you tell them?",
    "That the question is not what work will have you. It is what you would still be doing if nobody paid you.",
  ] },
];

/**
 * Everything this file promises, checked. The arc gates have to be
 * non-decreasing or `companionStoryFaults` will say so, and the barks have to
 * be unique and reachable or a trigger silently shadows another.
 */
export function prismFaults() {
  const out = [];
  const seen = new Set();
  for (const b of PRISM_BARKS) {
    if (seen.has(b.id)) out.push(`duplicate bark id ${b.id}`);
    seen.add(b.id);
    if (!b.on) out.push(`${b.id}: no trigger`);
    if (!b.line || b.line.length < 20) out.push(`${b.id}: line too short to read`);
  }
  // The user named four barks explicitly. If a rewrite loses one of those
  // ideas the round stops being what was asked for, so they are asserted by
  // their SUBJECT rather than by their exact words -- the wording is mine to
  // improve, the four beats are not.
  const all = PRISM_BARKS.map(b => b.line).join(' ').toLowerCase();
  for (const [what, re] of [
    ['following the water to its source', /follow the water/],
    ['luring them into traps', /lure them into the traps/],
    ['her own menus and screens', /menu and screens/],
    ['the literal slime monster', /literal slime monster/],
  ]) {
    if (!re.test(all)) out.push(`the user's own bark about ${what} is gone`);
  }
  if (!PRISM_ESCAPE.text.includes('Adventure Society')) {
    out.push('the escape line no longer says where she is going');
  }
  let rank = 0;
  const ORDER = ['normal', 'iron', 'bronze', 'silver', 'gold'];
  for (const s of PRISM_ARC) {
    const r = s.need && s.need.rank ? ORDER.indexOf(s.need.rank) : rank;
    if (r < rank) out.push(`${s.id}: rank gate goes backwards`);
    rank = Math.max(rank, r);
    if (!s.line || s.line.length < 40) out.push(`${s.id}: line too short`);
  }
  if (PRISM_ARC.length < 5) out.push(`arc is only ${PRISM_ARC.length} steps; five is the floor`);
  if (!PRISM_ARC.some(s => s.need && s.need.rank === 'gold')) {
    out.push('nothing in the arc is gated on gold -- the confluence beat has no home');
  }
  return out;
}
