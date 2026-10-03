// ===========================================================================
// ROUND 243 (items 3.1, 4.2) -- WHAT THEY TALK ABOUT BEFORE THEY JOIN YOU.
//
// The user:
//
//   "3.1) Give Prism a dialogue tree for getting used to the new world, things
//    she's discovered, plants that taste like sausage, healing magic that can
//    cure cancer, 2 moons in the sky, and something called a monster surge that
//    she is way less excited about."
//   "3.2) Give a few hints of where the player needs to be to recruit her."
//   "4.2) Prior to that Zeke should be lonely drinking, and have a conversation
//    tree just talking about his wife (without giving away that he lost her
//    beyond a note that a tear streamed down his face), his farm, his chicken
//    and how he wishes he could go back 30 years."
//
// TWO PEOPLE, ONE SHAPE, AND NOT THE TOWNSFOLK'S SHAPE. `TOPICS` in
// dialogue.js is a shared tree about the world -- rumours, monsters, the
// Society, Pallimustus -- answered differently by whoever is asked. These are
// trees about ONE PERSON, so they are their own tables, walked by the same
// `_talkToTree` the gods use. Round 211 built that walker precisely so a third
// tree would not mean a third navigation.
//
// WHAT THE WRITING HAS TO DO, which is the part worth being careful about:
//
//   PRISM is funny and she is not a joke. Every one of her topics is a person
//   doing fieldwork on a world that arrived without a manual, and the comedy
//   is that her methodology is sound. The sausage plant is a real observation.
//   The two moons are a real problem she has thought about. And the surge is
//   where the register drops, because she has worked out what it means and
//   nobody has told her she is wrong.
//
//   ZEKE is the opposite job: the user's instruction is a constraint on what
//   must NOT be said. He talks about his wife in the present tense. He does
//   not say she is gone, he does not hint, he is not brave about it -- he is
//   simply a man talking about his wife, and the only thing the scene gives
//   away is one line of stage direction the player reads and he does not
//   comment on. The reveal belongs to the farm job, later. A tree that winked
//   at it would spend the reveal here for nothing.
//
// The `when` predicates and the ctx are the same shape `optionsAt` already
// takes, so nothing in the walker needs to know these exist.
// ===========================================================================

/** How many abilities the player must have unlocked before Zeke will ask.
 *  Item 4.1, the user's own number. */
export const ZEKE_ABILITY_GATE = 10;

// ---------------------------------------------------------------------------
// PRISM, in the Society hall, a day after the sewer.
// ---------------------------------------------------------------------------
export const PRISM_TREE = {
  prism_world: {
    label: 'How are you settling in?',
    children: ['prism_found', 'prism_sausage', 'prism_cancer', 'prism_moons', 'prism_surge'],
    say: "Settling. That's the word for it, isn't it — like silt.\n\n"
      + "I've stopped flinching at the architecture. That took four days. I've started writing "
      + "things down, which helped more than the not-flinching did.",
  },
  prism_found: {
    label: "What have you worked out so far?",
    say: "Right — so I keep a list. Everyone here keeps a list, I've noticed, it's just that "
      + "theirs are about debts.\n\n"
      + "Bread is better. Water is worse. Nobody has heard of a potato and I am not emotionally "
      + "ready to discuss that. The coins have a woman on them that three separate people have "
      + "told me is not a real woman, which is not the reassurance they think it is.\n\n"
      + "And nobody asks how old you are. They ask what rank you are. Same question, I think, "
      + "just honest about it.",
  },
  prism_sausage: {
    label: 'Anything worth eating out there?',
    say: "There is a plant. Low, grey-green, grows on the south side of walls, and it tastes "
      + "exactly like sausage. Not sausage-ish. Sausage.\n\n"
      + "I made a woman at the market try it and she said 'yes, that's sedge,' and walked away. "
      + "SEDGE. I have been eating a hedge for a week and nobody thought it was worth mentioning "
      + "because it has always been there.\n\n"
      + "That's the thing about this place. The miracles are all somebody's Tuesday.",
  },
  prism_cancer: {
    label: 'You mentioned the healers.',
    say: "I watched a man in a temple put his hand on a woman's shoulder and take a tumour out "
      + "of her. Out. She paid him and went to work.\n\n"
      + "Where I'm from that's eighteen months and a fifty-fifty and a lot of people you love "
      + "being very careful about how they say your name.\n\n"
      + "I sat down afterwards. Not dramatically. I just needed to sit down.",
  },
  prism_moons: {
    label: 'Have you got used to the sky?',
    say: "There are two moons. TWO. And they don't keep time with each other, so some nights "
      + "you get one and some nights you get both and one week a month the small one is just... "
      + "not invited.\n\n"
      + "I asked a farmer which one the tides follow and he said 'yes.' I've thought about that "
      + "answer more than I've thought about most things.",
  },
  prism_surge: {
    label: "And the thing nobody will explain properly?",
    say: "A monster surge. That's the phrase. They say it the way you'd say a cold snap.\n\n"
      + "As far as I can work out: the monsters stop arriving one at a time. That's it. That's "
      + "the whole mechanism. Everything that has been trickling in arrives at once and keeps "
      + "arriving, and the only thing between it and the people at the market is whoever "
      + "happens to be wearing a Society badge that week.\n\n"
      + "Nobody's frightened. That's the part I can't get past. They've all seen one before.",
  },
  // ---- 3.2: where the player needs to be ---------------------------------
  prism_where: {
    label: "What are you waiting for, exactly?",
    say: "Somewhere essences turn up. That's the whole of it.\n\n"
      + "They don't turn up in here. I've checked — I've been standing in this hall for a day "
      + "and a half being extremely available. They turn up where the monsters are, and the "
      + "monsters are outside the walls, and I am not walking out of that gate on my own with "
      + "eleven years of Taekwondo and a strong opinion about sedge.\n\n"
      + "So: come back through that door when you're heading out, and ask me then. I'll say yes. "
      + "I've been practising saying yes.",
  },
};

export const PRISM_ROOTS = ['prism_world', 'prism_where'];

// ---------------------------------------------------------------------------
// ZEKE, at the east tables, before the player has ten abilities.
//
// EVERY LINE IS PRESENT TENSE. See the header. The one exception is the stage
// direction on the last line of the wife topic, which is the only thing the
// user asked to show and the only thing shown.
// ---------------------------------------------------------------------------
export const ZEKE_TREE = {
  zeke_wife: {
    label: 'Who are you drinking to?',
    say: "Mary. My wife.\n\n"
      + "She's the one who reads. Forty years in the bottoms and she's got opinions about "
      + "novels — proper ones, she'll argue you down about a book you haven't read and be right.\n\n"
      + "She cuts my hair. Badly. She knows it's badly, that's the joke of it, she's been doing "
      + "it badly on purpose since we were twenty-six and I've never once asked her to stop.\n\n"
      + "[ He turns the cup a quarter turn on the table, and back. A tear runs down his face. He "
      + "does not appear to notice it, and does not wipe it away. ]",
  },
  zeke_farm: {
    label: 'Tell me about the farm.',
    children: ['zeke_chicken', 'zeke_thirty'],
    say: "West of the road, before Milrow. Bottoms land — floods every third spring and gives it "
      + "all back the summer after, which is the deal you make.\n\n"
      + "Thirty years. I know every stone in that yard by the sound it makes under a boot.",
  },
  zeke_chicken: {
    label: 'You keep chickens?',
    say: "One. Well — there's a flock, but there's one.\n\n"
      + "Henrietta. Bonded to her, if you want the technical version of it, which is not a thing "
      + "a sensible man does with a bird. She's got a Life essence in her somewhere and she is "
      + "MEAN about it. Chased a dog off the yard last winter. Actual dog.\n\n"
      + "Mary says she's the only one of us three who's never once been wrong about anything.",
  },
  zeke_thirty: {
    label: 'If you could have it over?',
    say: "Thirty years back. That's the number I keep landing on.\n\n"
      + "Not to do it different. That's what people assume when you say it, and it's not that — "
      + "I'd do it the same, all of it, the flooding springs and the bad haircuts.\n\n"
      + "I'd just do it slower. I'd stand in the yard a bit longer before going in. That's the "
      + "whole of my great ambition, son: to have stood in the yard a bit longer.",
  },
  zeke_ready: {
    label: "You're looking for someone.",
    // Shown only once the gate is close, so the player learns there is a door
    // before they are standing in front of it.
    when: (c) => (c.abilities || 0) >= Math.max(1, Math.floor(ZEKE_ABILITY_GATE * 0.6)),
    say: "I am. Not today, though, and don't take that wrong.\n\n"
      + "I had a look at you when you came in. You've got the makings — but you've got about "
      + "half a kit, and where I'm going the packs come four at a time and I heal, I don't "
      + "fight.\n\n"
      + "Get yourself a proper set of hands. Ten things you can do without thinking about them. "
      + "Then come and sit down and I'll tell you what I need.",
  },
};

export const ZEKE_ROOTS = ['zeke_wife', 'zeke_farm', 'zeke_ready'];

/**
 * What a companion's pre-recruit tree answers with.
 *
 * A leaf's `say` is a plain string here rather than the townsfolk pools:
 * these are one person's words about their own life, and a pool of four ways
 * to say them would be four versions of a man describing his wife.
 */
export function companionSay(table, topicId) {
  const t = table[topicId];
  if (!t) return '';
  return typeof t.say === 'function' ? t.say() : (t.say || '');
}

/** Faults: the things that would make one of these trees wrong. */
export function companionTreeFaults() {
  const out = [];
  const check = (name, table, roots) => {
    for (const r of roots) if (!table[r]) out.push(`${name}: root ${r} is not in the table`);
    for (const [id, t] of Object.entries(table)) {
      if (!t.label) out.push(`${name}: ${id} has no label`);
      if (!companionSay(table, id)) out.push(`${name}: ${id} answers with nothing`);
      for (const c of (t.children || [])) {
        if (!table[c]) out.push(`${name}: ${id} names a child ${c} that does not exist`);
      }
    }
    // Every topic must be REACHABLE from a root, or it is writing nobody sees
    // -- the census fault this project has hit four times.
    const seen = new Set();
    const walk = (id) => {
      if (seen.has(id)) return;
      seen.add(id);
      for (const c of ((table[id] || {}).children || [])) walk(c);
    };
    for (const r of roots) walk(r);
    for (const id of Object.keys(table)) {
      if (!seen.has(id)) out.push(`${name}: ${id} cannot be reached from any root`);
    }
  };
  check('prism', PRISM_TREE, PRISM_ROOTS);
  check('zeke', ZEKE_TREE, ZEKE_ROOTS);
  // ZEKE'S CONSTRAINT, ASSERTED. The user's instruction is about what must not
  // be said, so it is checked rather than trusted: no past-tense bereavement
  // words anywhere in his tree. The stage direction is the only tell, and it
  // describes a tear, not a loss.
  const forbidden = /\b(died|dead|death|passed away|buried|grave|widow\w*|funeral|lost her|she's gone|gone now|miss her)\b/i;
  for (const [id, t] of Object.entries(ZEKE_TREE)) {
    const said = companionSay(ZEKE_TREE, id);
    if (forbidden.test(said)) out.push(`zeke: ${id} gives away what the farm job is for`);
  }
  if (!/tear/i.test(companionSay(ZEKE_TREE, 'zeke_wife'))) {
    out.push('zeke: the wife topic has lost its one stage direction');
  }
  return out;
}
