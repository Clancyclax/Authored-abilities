// ============================================================================
// ROUND 125 -- PRISM'S CHAIN: SEVEN JOBS, SEVEN KITCHENS, AND THE ANSWER.
//
// The user, in the brief that created her:
//
//   "Her quest chain will be about figuring out what she wants her life to be
//    when she goes back to earth. Each region should have some quests around
//    trying a new job and trying to figure out how to cook. Her silver to gold
//    transition is embracing her confluence essence (whatever it is) and
//    realizing that this new world is a better fit for her anyway."
//
// Three requirements, and they are not three features. They are one question
// asked fourteen times and answered once.
//
// ---------------------------------------------------------------------------
// WHY THE JOBS ARE THE QUEST AND NOT A DIALOGUE
// ---------------------------------------------------------------------------
//
// Her arc in prism.js already SAYS her history -- teacher, waitress, bartender,
// "good at and hated / bad at and hated / good at and liked, which felt like
// cheating, so obviously I quit". A chain that had her SAY seven more jobs
// would be the same beat eight times with different nouns.
//
// So a job is a real objective on `player.quests`, built through `_makeOffer`
// exactly the way a god's chapter and a Division field stage are, and the
// player does it WITH her. What is authored is not the work -- it is what she
// makes of it afterwards. Every completed job files one VERDICT, and the
// verdicts are the only thing this chain accumulates.
//
// THE VERDICTS ARE THE POINT. At gold she reads them back, and what she reads
// is not a list of jobs, it is a shape: the things she liked have one thing in
// common and she is the last person to notice it. That is the whole chain --
// "figuring out what she wants her life to be" is not a decision she announces,
// it is a pattern the player has watched accumulate for seven regions.
//
// ---------------------------------------------------------------------------
// WHY THE COOKING IS BAD ON PURPOSE, AND EXACTLY HOW BAD
// ---------------------------------------------------------------------------
//
// Her own arc line, written in round 124, is load-bearing data:
//
//   "I've been cooking. Badly. On purpose, though -- I'm working through it
//    like a curriculum, because that's the one thing teaching actually gave
//    me. Don't eat anything I make before silver. I'm serious."
//
// A ladder that made her food useful at bronze would make that line a lie the
// player can taste. So COOK_RUNGS gates on rank as well as on lessons, and the
// rung where food stops being a joke is `silver` because she said so. The
// joke rungs are not filler either: a Bewildering Stew that does nothing is
// the setup, and the player has to have eaten one for the silver rung to land.
//
// ---------------------------------------------------------------------------
// WHY THE GOLD STEP CANNOT BE WRITTEN HERE
// ---------------------------------------------------------------------------
//
// "embracing her confluence essence (WHATEVER IT IS)". Prism is the one
// companion whose essences the player chooses, so her confluence is not
// knowable when this file is written -- round 124's whole point. The gold beat
// therefore names it with a `{confluence}` token that the scene substitutes
// from `m.confluenceName` at the moment the line is read. See
// `substituteCompanionLine`.
// ============================================================================

import { RANK_ORDER } from './ranks.js';
import { PRISM_ID } from './prism.js';

/** The player field the whole chain lives in. A plain field, so saves.js
 *  carries it for free -- the same reason `divisionStage` and `godChains` are
 *  plain fields and not a registered subsystem. */
export const PRISM_CHAIN_FLAG = 'prismChain';

/** A fresh chain. `step` is a position in PRISM_STEPS, `verdicts` the ids of
 *  the jobs she has an opinion about, `lessons` how many kitchens she has
 *  survived. Nothing else is stored, because everything else is re-derivable
 *  -- the objective is rebuilt from the step's seeded id the way a god step is,
 *  so a save never carries a quest's guts. */
export function newPrismChain() {
  return { step: 0, verdicts: [], lessons: 0, cooked: 0, turned: 0 };
}

// ---------------------------------------------------------------------------
// THE FOURTEEN STEPS
//
// Seven regions, in the order the world is meant to be walked (REGIONS index
// order), and each region gets both halves of the user's sentence: "trying a
// new job AND trying to figure out how to cook".
//
// A JOB step is a real quest. `kinds` is the fallback ladder handed to
// `_makeOffer`, in the order that keeps the most of the trade -- a dockhand
// who cannot be given a supply run should get a gather, not a boss fight.
//
// A KITCHEN step is a real quest too, and deliberately a `gather`: she needs
// ingredients and the player is the one with the bag. It is the only kind
// that makes the errand and the fiction the same errand.
//
// FIELDS
//   id       stable; the quest uid is seeded on it, so renaming one rerolls
//            its objective. Don't rename them.
//   region   which region the offer is built in, and where she'll raise it
//   kind     'job' | 'kitchen'
//   trade    the job's name, for the Quests tab row and the title
//   kinds    quest kinds to try, best first
//   offer    what she says when she brings it up
//   nag      what she says while it is open
//   done     what she says when it is turned in
//   verdict  { liked, line } -- the clause she keeps. `liked` is what the
//            gold step counts; `line` is what it reads out.
// ---------------------------------------------------------------------------
export const PRISM_STEPS = [
  // ------------------------------------------------------------- THE NEK ---
  {
    id: 'nek_job', region: 'nek', kind: 'job', trade: 'Farmhand',
    kinds: ['gather', 'cull', 'supply'],
    offer:
      "Okay so I got a job. A real one, with a man who owns dirt.\n\n"
      + "It's the Clark bottom land — fieldwork, dawn till it's done, and the fields have "
      + "things in them that fields should not have. That's the bit you're for.\n\n"
      + "I want to see if I can hold down a job in a world where the job might bite me.",
    nag: "The farm thing's still open. He's very nice about it, which is worse.",
    done:
      "Done. I have been paid in coins and a bag of onions.\n\n"
      + "And — okay. I liked it? Not the dawn part, I want to be clear that the dawn part is a "
      + "crime. But there's a row, and then there isn't a row, and you can see the not-row. "
      + "I've never had a job where you could see the end of it.",
    verdict: { liked: true, line: "Farmhand — liked it. You can SEE when you're done." },
  },
  {
    id: 'nek_kitchen', region: 'nek', kind: 'kitchen', trade: 'First Attempt',
    dish: 'something with the onions',
    kinds: ['gather'],
    offer:
      "Right. I have onions and a pot and a fire, and I'm going to learn to cook if it "
      + "kills one of us.\n\n"
      + "I need things to put IN it. You kill things. I've thought about this a lot and I "
      + "think that's the whole system.",
    nag: "Still need the ingredients. The onions are getting philosophical.",
    done:
      "It's food. It is definitionally food. It has been heated and it is in a bowl.\n\n"
      + "I'm not going to oversell it. Lesson one is 'fire goes under, not on'. I have "
      + "written that down. In a book. That I now own.",
    verdict: null,
  },

  // ------------------------------------------------------------ ONTARIA ---
  {
    id: 'ontaria_job', region: 'ontaria', kind: 'job', trade: 'Dock Hand',
    kinds: ['supply', 'gather', 'escort'],
    offer:
      "Ontaria has boats, boats have cargo, cargo has to get off the boat. I have "
      + "volunteered to be the reason it gets off the boat.\n\n"
      + "Pay's per crate. Which means I finally have a job where working harder does "
      + "something, which I'd like to report is NOT how it worked on Earth.",
    nag: "The dock run's still on the books. The crates are not walking themselves.",
    done:
      "Twelve hours. My hands have opinions now.\n\n"
      + "Hated it. Properly hated it — and the horrible thing is I was GOOD at it, so "
      + "they want me back. That's the exact trap I fell in with waitressing. Good at it, "
      + "hate it, stay anyway because being good at something feels like being asked.",
    verdict: { liked: false, line: "Dock hand — hated it, and was good at it. Not the same thing." },
  },
  {
    id: 'ontaria_kitchen', region: 'ontaria', kind: 'kitchen', trade: 'Fish, Allegedly',
    dish: 'a chowder',
    kinds: ['gather'],
    offer:
      "Every single person on this coast has told me their chowder is the real chowder. "
      + "I've decided they're all lying and I'm going to find out empirically.\n\n"
      + "Bring me things. I'll ruin them scientifically.",
    nag: "Chowder's pending. I've got the pot on out of optimism.",
    done:
      "Better! Genuinely better. Two people ate it voluntarily and only one of them "
      + "was being polite.\n\n"
      + "Lesson two: salt is not a flavour, it's a tool. I know how that sounds. I "
      + "didn't know it three weeks ago and I'd have argued with you about it.",
    verdict: null,
  },

  // ------------------------------------------------------------- ELEHYD ---
  {
    id: 'elehyd_job', region: 'elehyd', kind: 'job', trade: 'Road Warden',
    kinds: ['escort', 'cull', 'hunt'],
    offer:
      "The roads out here stop being roads and the caravans know it. They hire people "
      + "to walk in front.\n\n"
      + "That's the job. Walk in front. Be a problem for whatever's out there before it "
      + "gets to be a problem for the carts. I am, and I cannot stress this enough, "
      + "extremely qualified for exactly one thing and that thing is standing in the way.",
    nag: "Caravan's still waiting on the warden run. They're feeding me, at least.",
    done:
      "Okay. Okay that's the one.\n\n"
      + "Eleven years of getting up off a mat and walking back to the line, and I "
      + "always thought the mat was the point. It wasn't. The walking back was. Nobody "
      + "ever told me you could get PAID for the walking back.",
    verdict: { liked: true, line: "Road warden — the one that felt like the mat. Standing in the way." },
  },
  {
    id: 'elehyd_kitchen', region: 'elehyd', kind: 'kitchen', trade: 'Keeping It',
    dish: 'salted and dried',
    kinds: ['gather'],
    offer:
      "Nothing grows up here, so everything they eat was killed somewhere else and "
      + "convinced not to rot.\n\n"
      + "I want to learn that. Not because it's nice — it is emphatically not nice — but "
      + "because it's the first cooking I've seen that's actually a problem with a "
      + "solution, and I like those.",
    nag: "Still short on what I need for the curing. It takes ages and I started late.",
    done:
      "Three weeks in a cold shed and it's edible. EDIBLE. Out of nothing, out of time.\n\n"
      + "Lesson three, and this one I'm a bit annoyed about: most of cooking is waiting "
      + "correctly. I'm not good at waiting. I'm getting good at waiting.",
    verdict: null,
  },

  // ----------------------------------------------------------- BRATUGAL ---
  {
    id: 'bratugal_job', region: 'bratugal', kind: 'job', trade: 'Letters Tutor',
    kinds: ['case', 'escort', 'gather'],
    offer:
      "There's a room in the city where they teach freedmen to read, and they are "
      + "desperately short of anyone who's stood in front of a class before.\n\n"
      + "I have. I was good at it. I hated it.\n\n"
      + "I want to know whether I hated TEACHING or whether I hated the school, and this "
      + "is the only place I'm ever going to get to find out.\n\n"
      + "Also — half of what they actually need read to them is paperwork somebody is "
      + "using against them, and that turns out to be the job under the job. That's the "
      + "part I'd like you for.",
    nag: "The reading room's still expecting me. I keep nearly going.",
    done:
      "So it was the school.\n\n"
      + "It was the school, the whole time, and I spent four years deciding I was the "
      + "wrong shape for a job I was actually just doing in the wrong building.\n\n"
      + "I'm not going back to it full-time. But I'm going back on Thursdays, and I'd "
      + "appreciate it if you didn't make it weird.",
    verdict: { liked: true, line: "Tutor — turns out I never hated this. I hated the building." },
  },
  {
    id: 'bratugal_kitchen', region: 'bratugal', kind: 'kitchen', trade: 'Heat',
    dish: 'whatever that pepper is',
    kinds: ['gather'],
    offer:
      "There is a pepper here that made me cry in front of a market. Openly. In public.\n\n"
      + "I need to understand it. Not beat it — understand it. There's a difference and "
      + "I've only recently started noticing it.",
    nag: "Pepper project is stalled. I'm a bit scared of it, if I'm honest.",
    done:
      "It's not about heat. It's about heat AND something sweet underneath, and the "
      + "sweet bit is the whole trick and nobody writes it down.\n\n"
      + "Lesson four: the recipe is never the recipe. I have started asking people what "
      + "they do instead of what they cook and it turns out those are two different "
      + "questions.",
    verdict: null,
  },

  // -------------------------------------------------------------- SIRUKH ---
  {
    id: 'sirukh_job', region: 'sirukh', kind: 'job', trade: 'Salt Cutter',
    kinds: ['gather', 'supply', 'cull'],
    offer:
      "The pan out here is salt all the way down and somebody has to cut it into "
      + "blocks. That somebody is currently me. It pays astonishingly badly.\n\n"
      + "I took it because I've noticed I only ever try jobs I think I'll like, and "
      + "that's how you end up twenty-nine and still guessing.",
    nag: "Salt pan's still open. It will be. Salt's very patient.",
    done:
      "Eight days. My arms are ruined and I have learned a genuinely useful thing:\n\n"
      + "I don't need the work to be interesting. I need to be able to tell whether I did "
      + "it well. Salt can't tell me that — a good block and a bad block look the same and "
      + "nobody looks at either. THAT's what I can't stand. Not the work. The silence.",
    verdict: { liked: false, line: "Salt cutter — hated it. Nobody could tell whether I was any good." },
  },
  {
    id: 'sirukh_kitchen', region: 'sirukh', kind: 'kitchen', trade: 'Stone Bread',
    dish: 'flatbread on a hot rock',
    kinds: ['gather'],
    offer:
      "They cook bread on a rock here. A rock! No oven, no tin, no nothing — a hot flat "
      + "rock and thirty seconds of nerve.\n\n"
      + "I want it. It's the least equipment anyone's ever needed to make something good "
      + "and that feels like it's about more than bread.",
    nag: "Still need the makings for the flatbread. And a better rock.",
    done:
      "I made bread on a rock in a desert and a stranger asked me for the recipe.\n\n"
      + "Lesson five: I'm not learning to cook. I've been learning to cook for a while "
      + "now. At some point it changed from a bit into a thing I do and I didn't notice "
      + "the day it happened.",
    verdict: null,
  },

  // ------------------------------------------------------------- CINDER ---
  {
    id: 'cinder_job', region: 'cinder', kind: 'job', trade: "Smith's Striker",
    kinds: ['gather', 'supply', 'delve'],
    offer:
      "Forge work. Not the smith — the striker. She points, I hit it, very hard, exactly "
      + "there, for nine hours.\n\n"
      + "She says most strikers last a week. She said it like a warning. I've decided to "
      + "receive it as a challenge, which my mother would tell you is my entire problem.",
    nag: "Still owe the forge a shift. She has not forgotten. She's a smith, she doesn't forget.",
    done:
      "Three weeks and she's stopped pointing. She just looks at the spot now and I hit "
      + "it.\n\n"
      + "That's the best thing that's ever happened to me in a workplace and I'd like that "
      + "noted. Not the pay. Somebody stopped explaining.",
    verdict: { liked: true, line: "Striker — she stopped having to point. Best feeling I've had at work." },
  },
  {
    id: 'cinder_kitchen', region: 'cinder', kind: 'kitchen', trade: 'Sear',
    dish: 'something over a lava vent',
    kinds: ['gather'],
    offer:
      "There are vents out here that'll take a steak from raw to gone in four seconds, "
      + "and I am going to find the three-second version.\n\n"
      + "This is the most dangerous thing I've ever wanted to do for a reason this "
      + "stupid, and I'd like you to know I'm aware of that.",
    nag: "Vent cooking's on hold. I need what I need and also slightly better eyebrows.",
    done:
      "Three seconds. I found the three seconds.\n\n"
      + "Lesson six: everything I've learned about cooking is actually about attention. "
      + "That's it, that's the whole craft. Turns out I can pay attention for eleven "
      + "years at a time if somebody tells me the thing I'm looking at matters.",
    verdict: null,
  },

  // ------------------------------------------------------------ IXCUATL ---
  {
    id: 'ixcuatl_job', region: 'ixcuatl', kind: 'job', trade: 'Survey',
    kinds: ['survey', 'delve', 'relic'],
    offer:
      "Right. This one isn't a job. This one's a job that doesn't exist yet.\n\n"
      + "Nobody's walked Ixcuatl and written it down. The Society will pay for the pages "
      + "and they have nobody to send, because the people who can survive it can't write "
      + "and the people who can write can't survive it.\n\n"
      + "I can do both. I have never once been the only person who could do both.",
    nag: "Survey's still half-drawn. I've got about forty pages and a bad map.",
    done:
      "They took the pages. They took the pages and put my NAME on them, and then the "
      + "man at the desk asked when I could do the next region.\n\n"
      + "I said 'the next one'. Out loud. Like it was a thing I'd already decided.",
    verdict: { liked: true, line: "Survey — the only job I've had that nobody had before me." },
  },
  {
    id: 'ixcuatl_kitchen', region: 'ixcuatl', kind: 'kitchen', trade: 'Feeding People',
    dish: 'dinner, for everyone',
    kinds: ['gather'],
    offer:
      "Last one. I'm cooking for the whole team and I'm not telling you what it is.\n\n"
      + "Bring me everything. I mean it — I've got a list and the list is long and the "
      + "list is the point.",
    nag: "Dinner's not happening till you bring me the rest of it. I'm not compromising on this one.",
    done:
      "Everyone ate. Everyone went quiet for a bit and then everyone ate more, which is "
      + "the only review that's ever meant anything.\n\n"
      + "Lesson seven, and it's the last one because it's the only one that was ever the "
      + "lesson: I like making things for people who are going to be in the room.",
    verdict: null,
  },
];

/** Handy lookups. `PRISM_STEP_BY_ID` is what the scene resolves a quest back
 *  through when it turns in -- the quest carries the step id, not an index,
 *  because an index would rot the first time a step is inserted. */
export const PRISM_STEP_BY_ID = Object.fromEntries(PRISM_STEPS.map(s => [s.id, s]));
export const PRISM_STEP_COUNT = PRISM_STEPS.length;
/** Every region the chain visits, in order, so the data lane can check it
 *  against REGIONS rather than against a number typed here. */
export const PRISM_CHAIN_REGIONS = [...new Set(PRISM_STEPS.map(s => s.region))];

// ---------------------------------------------------------------------------
// THE COOKING LADDER
//
// Five rungs. `lessons` is how many kitchen steps she has finished; `rank` is
// the player's own standing, and it is in here because her own line promises
// the player that her food is not worth eating before silver. A gate on
// lessons alone would let a player who rushed seven gather quests eat well at
// iron and catch her in it.
//
// The dish is a real CONSUMABLE (see `PRISM_FOOD`, folded into
// CONSUMABLE_DEFS by inventory.js) so it stacks, sells, sits on the D-pad and
// is used through exactly the same door every other potion is.
// ---------------------------------------------------------------------------
export const COOK_RUNGS = [
  {
    rung: 0, id: 'prismFoodRaw', need: { lessons: 0, rank: 'normal' },
    name: 'Prism\'s Attempt',
    desc: 'Warm. Technically food. No detectable effect on anything.',
    // Deliberately nothing. A joke item with a small heal on it is not a joke,
    // it is a weak potion, and the silver rung has to land against something.
    effect: {},
    say: "It's food. Look me in the eye and tell me it isn't food.",
  },
  {
    rung: 1, id: 'prismFoodPlain', need: { lessons: 2, rank: 'iron' },
    name: 'Bewildering Stew',
    desc: 'Restores a little Stamina. Mostly by surprise.',
    effect: { stamina: 15 },
    say: "That one's actually fine. Don't make it weird.",
  },
  {
    rung: 2, id: 'prismFoodDecent', need: { lessons: 4, rank: 'bronze' },
    name: 'Field Supper',
    desc: 'Restores Stamina and a little Health.',
    effect: { stamina: 30, hp: 15 },
    say: "Eat it hot. I'm not reheating it, I'm not your mother.",
  },
  {
    rung: 3, id: 'prismFoodGood', need: { lessons: 6, rank: 'silver' },
    name: "Stubby's Proper Dinner",
    desc: 'Restores Stamina and Health, and strengthens attacks for a time.',
    effect: { stamina: 45, hp: 40, buff: { power: { mult: 1.15, t: 90 } } },
    // The promise in prism_6 comes good exactly here and nowhere earlier.
    say: "Told you. I said silver and I meant silver.",
  },
  {
    rung: 4, id: 'prismFoodGreat', need: { lessons: 7, rank: 'gold' },
    name: 'Dinner, For Everyone',
    desc: 'Restores Stamina and Health, and strengthens attacks and footwork for a long time.',
    effect: { stamina: 70, hp: 80, buff: { power: { mult: 1.25, t: 180 }, speed: { mult: 1.12, t: 180 } } },
    say: "Sit down. Everyone sits down for this one.",
  },
];

/** The consumable defs the rungs imply, keyed by id -- folded into
 *  CONSUMABLE_DEFS so nothing downstream learns what a Prism dish is. */
export const PRISM_FOOD = Object.fromEntries(COOK_RUNGS.map(r => [r.id, {
  id: r.id, name: r.name, desc: r.desc, prismRung: r.rung, ...r.effect,
}]));
export const PRISM_FOOD_IDS = COOK_RUNGS.map(r => r.id);

/** How many monster parts one dish costs. Any parts: she is not running a
 *  recipe book, she is running a pot, and a per-dish ingredient list would be
 *  a crafting system wearing a companion's face. */
export const COOK_PART_COST = 3;

function rankAtLeast(have, need) {
  return RANK_ORDER.indexOf(have) >= RANK_ORDER.indexOf(need);
}

/** The best rung she can currently cook. Pure, so the panel and the pot agree
 *  by construction rather than by two call sites computing it the same way. */
export function cookRungFor(lessons, rank) {
  let best = COOK_RUNGS[0];
  for (const r of COOK_RUNGS) {
    if ((lessons || 0) >= r.need.lessons && rankAtLeast(rank || 'normal', r.need.rank)) best = r;
  }
  return best;
}

/** The next step she is offering, or null when the chain is spent or its next
 *  step belongs to a region the player is not standing in.
 *
 *  REGION-GATED, NOT REGION-ORDERED. The step list is in world order, but a
 *  player who reaches Bratugal early is not held at Ontaria -- `_prismStep`
 *  walks forward to the first step in THIS region. What it never does is skip
 *  one: the step index only advances on a turn-in, so an early Bratugal job
 *  leaves Ontaria's still sitting there for when they come back. */
export function prismStepFor(chain, regionId) {
  const st = chain || newPrismChain();
  if (st.step >= PRISM_STEPS.length) return null;
  // The one at the cursor if it belongs here...
  if (PRISM_STEPS[st.step].region === regionId) return PRISM_STEPS[st.step];
  // ...otherwise the earliest unfinished one that does, which is what makes
  // the chain a set of things she wants to try rather than a corridor.
  for (let i = st.step; i < PRISM_STEPS.length; i++) {
    if (PRISM_STEPS[i].region === regionId) return PRISM_STEPS[i];
  }
  return null;
}

/** The quest id for a step. Seeded on the step id, so the objective a step
 *  builds is the same objective every time it is looked at -- the rule every
 *  other chain in this project arrived at the hard way. */
export function prismQuestId(step) {
  return `prism|${step.id}`;
}

// ---------------------------------------------------------------------------
// THE ANSWER
//
// What she says at gold, assembled from what actually happened. The verdicts
// she filed are read back in the order she filed them, and then the line that
// is the point of the whole chain -- which is NOT "I've decided to be a
// surveyor". It is that the four she liked have one thing in common and she
// has finally heard herself say it.
//
// `{confluence}` is substituted by the scene from `m.confluenceName`, because
// the user's brief says "whatever it is" and round 124 made that literally
// true: Prism's confluence is whichever three essences the player gave her.
// ---------------------------------------------------------------------------
export const PRISM_ANSWER_HEAD =
  "Right. I've been keeping the notes. You've seen me keeping the notes.\n\n"
  + "Here's every job I've tried since I fell down that hole:";

export const PRISM_ANSWER_TAIL =
  "\n\nAnd I've read that list about nine times now, and it's not a list of jobs. "
  + "Every single one I liked is one where somebody could tell whether I'd done it "
  + "well. That's it. That's the whole thing I've been trying to work out since I was "
  + "twenty-two.\n\n"
  + "The Confluence of {confluence} figured that out about me before I did. It took "
  + "one look at my entire disorganised mess and built something out of it, and I've "
  + "stopped being embarrassed about that.\n\n"
  + "So: what do I want to be when I go back to Earth.\n\n"
  + "I don't. That's the answer. Not because I'm running away from it — I'd like that "
  + "on the record, I've thought about this properly. It's that back there I was a "
  + "person who hadn't decided yet, and here I'm a person who's good at something, in "
  + "front of people who can tell.\n\n"
  + "This one's better. I'm allowed to just say that.";

/** Fill `{confluence}` and `{name}` in an authored line. Kept here rather than
 *  in the scene because the token is a property of the WRITING -- anything that
 *  displays one of these lines needs the same substitution, and a second call
 *  site doing it slightly differently is how one of them ends up showing a
 *  player the word "undefined" in the middle of her best speech. */
export function substituteCompanionLine(line, m) {
  if (!line) return line;
  return String(line)
    .replace(/\{confluence\}/g, (m && m.confluenceName) || 'whatever this is')
    .replace(/\{name\}/g, (m && m.name) || 'Prism');
}

/** The verdict lines she has filed, in order. */
export function prismVerdictLines(chain) {
  const seen = new Set((chain && chain.verdicts) || []);
  return PRISM_STEPS.filter(s => s.verdict && seen.has(s.id)).map(s => s.verdict.line);
}

/**
 * Everything this file promises, checked -- the same contract prismFaults()
 * has for her voice.
 *
 * The checks that earn their place are the ones a rewrite can silently break:
 * a region losing its pair, the cooking ladder drifting off the silver promise
 * her own dialogue makes, and the gold speech losing the confluence token that
 * is the entire reason round 124 let the player choose her essences.
 */
export function prismChainFaults(regionIds) {
  const out = [];
  const seen = new Set();
  for (const s of PRISM_STEPS) {
    if (seen.has(s.id)) out.push(`duplicate step id ${s.id}`);
    seen.add(s.id);
    if (!s.region) out.push(`${s.id}: no region`);
    if (s.kind !== 'job' && s.kind !== 'kitchen') out.push(`${s.id}: kind ${s.kind}`);
    if (!Array.isArray(s.kinds) || !s.kinds.length) out.push(`${s.id}: no quest kinds to build from`);
    for (const f of ['offer', 'nag', 'done']) {
      if (!s[f] || s[f].length < 30) out.push(`${s.id}: ${f} is too short to be a line`);
    }
    if (s.kind === 'job' && !(s.verdict && s.verdict.line)) {
      out.push(`${s.id}: a job with no verdict contributes nothing to the answer`);
    }
    if (s.kind === 'kitchen' && s.verdict) {
      out.push(`${s.id}: a kitchen step files a verdict; the answer counts jobs`);
    }
  }
  // "Each region should have some quests around trying a new job AND trying to
  // figure out how to cook" -- so every region gets BOTH, and the check is
  // against the real region list rather than against seven.
  const want = regionIds || PRISM_CHAIN_REGIONS;
  for (const r of want) {
    if (!PRISM_STEPS.some(s => s.region === r && s.kind === 'job')) out.push(`${r}: no job step`);
    if (!PRISM_STEPS.some(s => s.region === r && s.kind === 'kitchen')) out.push(`${r}: no kitchen step`);
  }
  // The verdicts have to be a MIX. An answer assembled from seven likes is not
  // an answer, it is a montage -- and the tail claims she compared them.
  const jobs = PRISM_STEPS.filter(s => s.kind === 'job');
  if (!jobs.some(s => s.verdict.liked)) out.push('no job she liked');
  if (!jobs.some(s => !s.verdict.liked)) out.push('no job she disliked -- the answer has nothing to compare');
  // The ladder, against her own promise.
  let lessons = -1, rank = -1;
  for (const r of COOK_RUNGS) {
    if (r.need.lessons <= lessons) out.push(`${r.id}: lesson gate does not advance`);
    if (RANK_ORDER.indexOf(r.need.rank) < rank) out.push(`${r.id}: rank gate goes backwards`);
    lessons = r.need.lessons; rank = RANK_ORDER.indexOf(r.need.rank);
    if (!r.name || !r.desc) out.push(`${r.id}: a rung with no name or no description`);
    if (r.rung > 0 && !Object.keys(r.effect || {}).length) out.push(`${r.id}: a rung that does nothing`);
  }
  if (COOK_RUNGS.length !== new Set(COOK_RUNGS.map(r => r.id)).size) out.push('duplicate rung id');
  if (Object.keys(COOK_RUNGS[0].effect || {}).length) {
    out.push('rung 0 does something -- the joke rung has to be a joke, or the silver rung lands on nothing');
  }
  // "Don't eat anything I make before silver. I'm serious." Her words, in
  // prism.js, and this is the line of code that keeps them true: nothing below
  // silver may carry a BUFF, which is what separates food worth eating from
  // food that merely restores.
  for (const r of COOK_RUNGS) {
    if (r.effect && r.effect.buff && !rankAtLeast(r.need.rank, 'silver')) {
      out.push(`${r.id}: buffs at ${r.need.rank}, but she promised the player nothing good before silver`);
    }
  }
  if (!COOK_RUNGS.some(r => r.need.rank === 'silver' && r.effect && r.effect.buff)) {
    out.push('nothing good happens at silver -- her own arc line promises it does');
  }
  // Seven lessons is the whole kitchen ladder, so the top rung is reachable
  // only by a player who did every one of them. Asserted rather than assumed:
  // a rung needing eight would be permanently unreachable and nothing would say so.
  const kitchens = PRISM_STEPS.filter(s => s.kind === 'kitchen').length;
  for (const r of COOK_RUNGS) {
    if (r.need.lessons > kitchens) out.push(`${r.id}: needs ${r.need.lessons} lessons and only ${kitchens} exist`);
  }
  // The gold speech.
  if (!/\{confluence\}/.test(PRISM_ANSWER_TAIL)) {
    out.push('the answer no longer names her confluence -- "whatever it is" was the brief');
  }
  if (substituteCompanionLine(PRISM_ANSWER_TAIL, { confluenceName: 'x' }).includes('{')) {
    out.push('the answer carries a token nothing substitutes');
  }
  if (PRISM_ID !== 'prism') out.push('the chain is keyed to a different id than her voice');
  return out;
}
