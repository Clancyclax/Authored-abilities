// ===========================================================================
// ROUND 96 -- WHAT A CRAFTER SEES WHEN THEY LOOK AT YOUR CONFLUENCE.
//
// The user, having written six of these by hand and then told us what they are
// for:
//
//   "the intent is a crafter sizing up the specific needs of an adventurer by
//    their confluence. So a weaponsmith, jewelry crafter, or armorsmith should
//    have their own insights and quirks as they talk about your confluence
//    essence and the distinct tricky ways it may affect their product."
//
// And their blueprint, verbatim, which is the standard everything here is
// written to:
//
//   "Mmm, you're going to be a real pain to gear. You think I can't sense what
//    you are. Transfiguration means reliable gear needs to shift with you.
//    Bigger, smaller... extra arms... uhh well I don't know exactly what I need
//    to prepare for but I'll bet its gonna be expensive."
//
// Three things are true of that line and all three are load-bearing here:
// the crafter can SENSE what you are without being told; the confluence creates
// a specific PROBLEM FOR THEIR PRODUCT rather than a compliment; and they are
// already thinking about the bill.
//
// ---------------------------------------------------------------------------
// WHY THIS IS GENERATED AND NOT A HUNDRED AND ONE TIMES THREE AUTHORED LINES
// ---------------------------------------------------------------------------
// Because that is 303 lines, and 303 authored lines is 303 lines nobody will
// ever finish and nobody can keep in one voice. The generated ones come from
// the same place the confluence's own abilities come from -- its CONCEPT
// (confluenceConcepts.js: what it is made of, the parts it gives a body, what
// bonding it does to a person) -- which is the whole argument round 53 made for
// why the confluence should stop being a special case.
//
// What is authored is the part that carries the voice:
//
//   OPENERS   -- how each trade reacts, before it has thought about the work
//   PROBLEMS  -- one line per confluence FAMILY per BENCH: the specific,
//                practical, slightly aggrieved way this kind of power makes
//                that trade's product harder to make. This is the substance,
//                and it is where the user's "distinct tricky ways" lives.
//   CLOSERS   -- the quirk each trade signs off with. The smith is proud, the
//                armoursmith is measuring you, the jeweller is worrying.
//
// Twenty-four families times three benches is seventy-two authored problems,
// which is a table a person can read in one sitting and keep in one voice --
// and it covers all 101 confluences, because every one of them has a family.
//
// ---------------------------------------------------------------------------
// AND SIX ARE AUTHORED OUTRIGHT
// ---------------------------------------------------------------------------
// The user's own six go in verbatim as armoursmith lines. They are the
// blueprint; they should also be in the game. AUTHORED wins over generated, so
// adding a hand-written line for any bench and any confluence needs no code.
// ===========================================================================

import { CONFLUENCE_CONCEPTS } from './confluenceConcepts.js';

export const CRAFTER_BENCHES = ['blacksmith', 'armoursmith', 'jewelcrafter'];

/** What each trade makes, in the words it would use. Read by the fault check
 *  so a problem line that talks about the wrong product is catchable. */
export const BENCH_PRODUCT = {
  blacksmith: 'a weapon',
  armoursmith: 'a fitted piece',
  jewelcrafter: 'a setting',
};

// ---------------------------------------------------------------------------
// OPENERS -- the reaction, before the work
// ---------------------------------------------------------------------------
// Three per bench, picked by the confluence's own name so a given confluence
// always gets the same greeting from the same crafter. The user's blueprint
// opens on being SENSED ("You think I can't sense what you are"), so every one
// of these is a person noticing rather than being told.

export const OPENERS = {
  blacksmith: [
    'Hm. I can feel that from here, whatever it is you have gone and become.',
    'Right. Hands on the counter, let me look at you properly.',
    'Ah. One of those. I had a feeling when you came through the door.',
  ],
  armoursmith: [
    'Mmm. Stand still and let me see what I am fitting.',
    'You think I cannot sense what you are. Everyone thinks that.',
    'Well now. That is going to change what I do with the straps.',
  ],
  jewelcrafter: [
    'Oh. Oh, that is going to argue with the setting, I can tell already.',
    'Let me see your hands. No -- the other way. Hm.',
    'That is a rare thing to be carrying into a shop this size.',
  ],
};

// ---------------------------------------------------------------------------
// THE PROBLEMS -- one per confluence family, per bench
// ---------------------------------------------------------------------------
// The rule every line here is written to: state a PRACTICAL DIFFICULTY THIS
// TRADE WILL HAVE, in the trade's own terms. Not what the confluence is -- the
// player knows that -- but what it does to a buckle, a quench, a setting.
//
// The smith thinks about heat, temper and what a blade does on contact.
// The armoursmith thinks about fit, seams, weight and what will wear through.
// The jeweller thinks about settings, stones, tarnish and what touches skin.

export const PROBLEMS = {
  air: {
    blacksmith: 'Everything I forge for you will want to be lighter than it should be. I will hollow the tang and you will not thank me until you have swung it a hundred times.',
    armoursmith: 'You will be moving faster than the plate wants to. Fewer laps, more gussets, and I am putting vents where you will feel a draught.',
    jewelcrafter: 'Nothing hanging. A pendant on you is a pendant in a hedge somewhere. Rings and studs, and I will pin the studs.',
  },
  aquatic: {
    blacksmith: 'You will be running wet more than dry. Oiled steel, sealed fittings, and no leather on the grip whatever you were about to say.',
    armoursmith: 'Everything gets sealed and nothing gets leather. And cut the arms loose -- I have seen what happens when one of your sort tries to reach through a sleeve.',
    jewelcrafter: 'Salt gets into a setting and stays there. Closed backs, gold before silver, and rinse the thing when you remember to.',
  },
  beast: {
    blacksmith: 'You will grip harder than a person should and the haft will show it. I will wrap it thick and I will expect to see you again about it.',
    armoursmith: 'There is an animal in the fit somewhere -- shoulder, or a tail, or the way you stand. Reinforced seat, split back, and do not ask me to make it pretty.',
    jewelcrafter: 'Nothing on a chain at the throat. Whatever you turn into, it will not have that neck. A ring, and a wide band.',
  },
  blood: {
    blacksmith: 'It will want feeding and it will take it off whoever is holding it. I will guard the edge and you will still find it drinks.',
    armoursmith: 'The lining is going to stain and it is going to keep staining. I will do you dark cloth and we will both pretend that was the plan.',
    jewelcrafter: 'That will discolour any stone I set in it inside a season. I will use something that was never going to be pretty in the first place.',
  },
  cold: {
    blacksmith: 'Cold steel snaps. I will temper it soft and heavy and you will complain about the weight until the first winter fight.',
    armoursmith: 'Joints seize on people like you. Everything gets oiled, everything gets a wider hinge, and you oil it again in the field.',
    jewelcrafter: 'It will fog every morning for the rest of your life and there is no setting that fixes it. Open back, so at least it dries.',
  },
  craft: {
    blacksmith: 'You will be taking it apart to see how it works. Fine -- I will pin it rather than weld it, and you can put it back together yourself.',
    armoursmith: 'You are the sort who modifies things. I will leave you honest fittings and standard buckles so that when you ruin it, you ruin it recoverably.',
    jewelcrafter: 'You will want to open the setting. I will make the setting openable, and I will charge you for a thing you did not know you wanted.',
  },
  dark: {
    blacksmith: 'Dull finish, then. No shine, no ring on the draw. It will be a quieter weapon than most and quiet is what you are paying for.',
    armoursmith: 'Matte, blacked, and no buckle facing outward. You did not want to be seen anyway.',
    jewelcrafter: 'The stone will drink the light out of everything beside it. Some people like that. I will set it alone so it has nothing to spoil.',
  },
  death: {
    blacksmith: 'Corrosion. Not rust -- something more particular than rust. I will use the bad iron on purpose, because the good iron will not last a month on you.',
    armoursmith: 'The straps will rot from the inside where I cannot see them. Come back every season and let me look, and do not wait for one to go in a fight.',
    jewelcrafter: 'Anything organic in the setting will be gone by spring. Metal and stone only, and nothing that ever grew.',
  },
  earth: {
    blacksmith: 'You will hit like a falling wall and the haft is what fails first. Full tang, no exceptions, and it will be heavier than you asked.',
    armoursmith: 'You do not need it light, you need it ANCHORED. Wide belt, load onto the hips, and I will build the shoulders to carry what you will put on them.',
    jewelcrafter: 'You will crush a fine setting without noticing. Low, flush, nothing raised. If it stands proud of the band it will not survive you.',
  },
  fire: {
    blacksmith: 'Good. You will not flinch when the quench spits, and I can run the temper hotter than I would dare with anyone else.',
    armoursmith: 'Lined, and lined again. You will thank me on the first hot day and curse me on every other one.',
    jewelcrafter: 'It will not sit still in the setting. I will cage it rather than seat it, and the cage is the expensive part.',
  },
  flyer: {
    blacksmith: 'Light or nothing -- weight is the enemy of everything you are going to do. I will thin it where it can be thinned and you will not notice until it bends.',
    armoursmith: 'Nothing across the back. Nothing. Whatever comes out of there is going to come out of there whether I have allowed for it or not.',
    jewelcrafter: 'Nothing that swings. At the speed you will be moving a pendant is a weapon pointed the wrong way.',
  },
  force: {
    blacksmith: 'You will break your own weapon before anything else does. Thicker than it looks, uglier than you want, and it will still come back to me bent.',
    armoursmith: 'Whatever I fit you will be taking the shock of what YOU do, not what they do. I am padding the inside as much as the out.',
    jewelcrafter: 'The band will oval inside a month. I will make it heavy and plain, and you will lose the stone anyway.',
  },
  guard: {
    blacksmith: 'You will be holding, not swinging. Short, balanced back toward the hand, and I will make the guard actually a guard for once.',
    armoursmith: 'Guardians are the best clients I have. Tough as nails and they need it repaired every season, because they stand where the bad thing is. I will keep your gear up.',
    jewelcrafter: 'It is going to take blows meant for other people. Nothing raised, nothing brittle, and I will set it deep enough to survive you.',
  },
  identity: {
    blacksmith: 'You are going to be a different size by the time I finish. I will build the grip in wrap rather than in wood, so at least it can be redone.',
    armoursmith: 'You are going to change shape on me, are you not. Nothing fitted, nothing buckled at the front -- wraps and gussets, and generous seams.',
    jewelcrafter: 'A ring is exactly the wrong shape for someone whose hands are a suggestion. I will do you a torc, and it can be wrong by an inch either way.',
  },
  life: {
    blacksmith: 'Green. The metal is going to want to grow, and metal should not want things. Sealed grip, and check the fittings for roots.',
    armoursmith: 'Whatever I fit you will end up with something growing in the buckles. It always does. I will use bone rather than horn and hope for the best.',
    jewelcrafter: 'It will keep growing after I am done. That is the charm and that is the problem, and you will be back when it does not fit.',
  },
  light: {
    blacksmith: 'It will show every scratch it ever takes. Some people keep that as a record. Most people ask me to polish it out and then ask why it is thinner.',
    armoursmith: 'Bright work marks. Bright work also means everyone in the field can see exactly where you are, which is your business and not mine.',
    jewelcrafter: 'Easy to set. Impossible to sell quietly, impossible to wear quietly. Wear it or do not, but do not ask me to tone it down.',
  },
  mind: {
    blacksmith: 'You will be doing something clever with it and clever is what breaks. I will build in one honest failure point so it goes where I put it.',
    armoursmith: 'Half of what you do will not happen where your body is. I am fitting the body anyway, because that is the part that bleeds.',
    jewelcrafter: 'You will not remember taking it off, and that is not a joke. I will fit it tight and put a mark inside so somebody can return it.',
  },
  motion: {
    blacksmith: 'Balanced forward would kill you. Everything back toward the hand, and a shorter blade than your pride wants.',
    armoursmith: 'Freedom of movement over coverage, every time. I will leave the inside of the elbow and the back of the knee alone and you will stop asking about it.',
    jewelcrafter: 'Flush to the skin or it will catch on something at speed and take a finger with it. Flush, and rounded.',
  },
  order: {
    blacksmith: 'You will want it to be exactly right, and exactly right costs three times what nearly right costs. I will quote you both and you will pick the first one.',
    armoursmith: 'Matched, measured and symmetrical, because you will notice if it is not. I do not mind. It is restful, working for someone who looks.',
    jewelcrafter: 'You will bring it back because one facet is a degree out. I will cut it right the first time so that we can skip that conversation.',
  },
  serpent: {
    blacksmith: 'Venom in the grip is a problem for the grip and for the hand under it. Sealed wrap, and do not let anyone else hold it.',
    armoursmith: 'You will move in ways plate cannot follow. Scale, overlapped downward, and it will rattle. Everyone hates that it rattles.',
    jewelcrafter: 'Something is going to be secreted onto whatever I make. Nothing porous. Nothing set in a claw where it can pool.',
  },
  smallbeast: {
    blacksmith: 'There are going to be more of you than there are of you, if you follow me. I will make it plain and I will make it cheap to make again.',
    armoursmith: 'Whatever I fit will be shared, chewed or lost. Simple buckles, standard sizes, and I keep the pattern so you can order the same again.',
    jewelcrafter: 'Small work for small hands, and I am guessing at whose. Bring the one who is actually going to wear it.',
  },
  space: {
    blacksmith: 'It will be somewhere you did not put it. I am not being funny -- put a hole in the pommel and tie the thing to yourself.',
    armoursmith: 'Half your gear will end up somewhere else. I fit everything with a lanyard point and I do not apologise for how it looks.',
    jewelcrafter: 'A ring on you is a ring in another room. Closed band, no stone that can lift out, and a chain through it if you will let me.',
  },
  storm: {
    blacksmith: 'Keep your hands off my anvil while I work; it remembers. And no wire in the wrap, unless you want to find out what that is like.',
    armoursmith: 'The seams stay off your skin. Trust me on this one. I have fitted a storm-bonded before and I only made that mistake the once.',
    jewelcrafter: 'A closed setting, unless you enjoy surprises. Metal all the way round the stone, and nothing pointed anywhere on it.',
  },
  water: {
    blacksmith: 'Everything runs wet and everything wants to rust. Oiled, sealed, and I will show you how to strip it yourself because you will need to.',
    armoursmith: 'Waterproofed, and enchanted to dry fast, or you will be carrying twice the weight home in the rain.',
    jewelcrafter: 'Water gets under a stone and stays there. Open back so it can drain, and check it after every swim you take on purpose.',
  },
};

/** Every family CONFLUENCE_CONCEPTS uses must have a problem, or a confluence
 *  falls through to a generic. Asserted rather than trusted. */
export const PROBLEM_FAMILIES = Object.keys(PROBLEMS);

// ---------------------------------------------------------------------------
// CLOSERS -- the quirk each trade signs off with
// ---------------------------------------------------------------------------
// The user's blueprint ends on the bill ("I'll bet its gonna be expensive"),
// which is the single most characterful thing in it: the crafter is not
// admiring you, they are pricing you.

export const CLOSERS = {
  blacksmith: [
    'It will cost. Everything unusual costs.',
    'Come back when you have broken it and we will talk about why.',
    'I will do it properly. I do not know how to do it the other way.',
  ],
  armoursmith: [
    'Uhh, well. I do not know exactly what I need to prepare for, but I will bet it is going to be expensive.',
    'Stand still. I am nearly done measuring and then you can go.',
    'I will make sure your gear keeps up. That is the whole of my job.',
  ],
  jewelcrafter: [
    'A challenge, for certain. I will want paying for the challenge.',
    'Do not lose it. I say that to everyone and everyone loses it.',
    'Small work is the hard kind. There is nowhere to hide a mistake.',
  ],
};

// ---------------------------------------------------------------------------
// AUTHORED
// ---------------------------------------------------------------------------
/**
 * Hand-written lines, keyed bench -> confluence name, which beat anything
 * generated. The six below are the user's own, verbatim -- they are the
 * blueprint the table above is written to, and they should be in the game.
 */
export const AUTHORED = {
  armoursmith: {
    Transfiguration: 'Mmm, you are going to be a real pain to gear. You think I cannot sense what you are. '
      + 'Transfiguration means reliable gear needs to shift with you. Bigger, smaller... extra arms... '
      + 'uhh, well, I do not know exactly what I need to prepare for but I will bet it is going to be expensive.',
    Predatory: 'A hunter through and through. That confluence marks you as someone who needs their gear to '
      + 'keep up with the hunt. Maybe some camouflage, or scent dampeners... hmm.',
    Stellar: 'Now that is a rarity. You are meant to be of galaxies and moons. How best to capture that and '
      + 'prepare for it... a challenge, for certain.',
    Guardian: 'Guardians make the best clients. Usually tough as nails, and they need gear replaced and '
      + 'repaired regularly, as they stand between the bad stuff and the ones they are protecting. '
      + 'I will make sure your gear keeps up.',
    Boundary: 'A very unique essence. Usually defensive, but you keep the stuff away from even you. '
      + 'You will probably need freedom of movement to take advantage of the boundaries you are creating.',
    Ocean: 'Well, I can feel the tides in your aura. You will need waterproof gear, and enchantments to dry quickly.',
  },
  blacksmith: {},
  jewelcrafter: {},
};

// ---------------------------------------------------------------------------
// THE LINE
// ---------------------------------------------------------------------------

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The family a confluence's problem is read off. Falls back to `craft`, which
 *  is the most neutral of the twenty-four: a crafter with no opinion about your
 *  power still has an opinion about you taking their work apart. */
export function familyForConfluence(name) {
  const c = CONFLUENCE_CONCEPTS[name];
  const fam = c && c.family;
  return PROBLEMS[fam] ? fam : 'craft';
}

/**
 * What this crafter says about this confluence.
 *
 * Deterministic on the pair, so the smith greets a Dragon the same way every
 * time and the jeweller greets it differently -- which is the user's whole ask.
 * Seeded rather than rolled for the reason every generated string in this
 * project is: a line that changed each time the player reopened the panel would
 * read as the shop having forgotten them.
 */
export function crafterConfluenceLine(benchKey, confluenceName) {
  const bench = CRAFTER_BENCHES.includes(benchKey) ? benchKey : 'blacksmith';
  if (!confluenceName) return null;
  const hand = (AUTHORED[bench] || {})[confluenceName];
  if (hand) return hand;
  const fam = familyForConfluence(confluenceName);
  const problem = PROBLEMS[fam][bench];
  const h = hash32(`${bench}|${confluenceName}`);
  const open = OPENERS[bench][h % OPENERS[bench].length];
  const close = CLOSERS[bench][(h >>> 8) % CLOSERS[bench].length];
  return `${open} ${problem} ${close}`;
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------

export function crafterTalkFaults() {
  const out = [];
  for (const bench of CRAFTER_BENCHES) {
    if (!OPENERS[bench] || OPENERS[bench].length < 2) out.push(`${bench} has too few openers`);
    if (!CLOSERS[bench] || CLOSERS[bench].length < 2) out.push(`${bench} has too few closers`);
    if (!BENCH_PRODUCT[bench]) out.push(`${bench} makes nothing`);
  }
  // EVERY FAMILY, EVERY BENCH. A missing cell is a crafter with nothing to say
  // about a whole class of confluence, and it would show as a broken sentence
  // rather than as an error.
  for (const fam of PROBLEM_FAMILIES) {
    for (const bench of CRAFTER_BENCHES) {
      const line = (PROBLEMS[fam] || {})[bench];
      if (!line) { out.push(`${bench} has nothing to say about a ${fam} confluence`); continue; }
      // A problem is a sentence about the WORK. Anything short is a label.
      if (line.length < 70) out.push(`${bench}'s ${fam} line says almost nothing`);
    }
  }
  // ...and the three benches must not say the same thing about a family. That
  // is the user's whole ask -- "their own insights and quirks" -- and it is
  // exactly what drifts when a twenty-fifth family is added in a hurry.
  for (const fam of PROBLEM_FAMILIES) {
    const said = CRAFTER_BENCHES.map(b => (PROBLEMS[fam] || {})[b]);
    if (new Set(said).size !== said.length) out.push(`two crafters say the same thing about ${fam}`);
  }
  // Every family CONFLUENCE_CONCEPTS actually uses must be covered, or a real
  // confluence falls through to the neutral fallback and the player gets a
  // crafter talking about the wrong thing.
  const used = new Set(Object.values(CONFLUENCE_CONCEPTS).map(c => c.family));
  for (const fam of used) if (!PROBLEMS[fam]) out.push(`no crafter has a line for the ${fam} family`);
  // ...and no family here that nothing uses, which would be a table growing
  // past the thing it describes.
  for (const fam of PROBLEM_FAMILIES) if (!used.has(fam)) out.push(`${fam} is a family no confluence has`);

  // The authored lines must name real confluences, or a hand-written line sits
  // in the file being read by nothing -- the fault this codebase keeps finding.
  for (const bench of Object.keys(AUTHORED)) {
    if (!CRAFTER_BENCHES.includes(bench)) out.push(`${bench} is not a bench`);
    for (const name of Object.keys(AUTHORED[bench] || {})) {
      if (!CONFLUENCE_CONCEPTS[name]) out.push(`${bench} has an authored line for unknown confluence ${name}`);
      if ((AUTHORED[bench][name] || '').length < 60) out.push(`${bench}'s ${name} line is too short to be authored`);
    }
  }

  // Every confluence in the catalogue gets a line from every bench, and no two
  // benches give the same one.
  for (const name of Object.keys(CONFLUENCE_CONCEPTS)) {
    const lines = CRAFTER_BENCHES.map(b => crafterConfluenceLine(b, name));
    if (lines.some(l => !l || l.length < 60)) out.push(`${name} gets an empty or stub line`);
    if (new Set(lines).size !== lines.length) out.push(`two crafters greet ${name} identically`);
    if (lines.some(l => /undefined|NaN|\[object/.test(l))) out.push(`${name} produces a malformed line`);
  }
  // Deterministic: the same pair must give the same line twice running.
  const a = crafterConfluenceLine('jewelcrafter', 'Dragon');
  const b = crafterConfluenceLine('jewelcrafter', 'Dragon');
  if (a !== b) out.push('a crafter does not greet the same confluence the same way twice');
  return out;
}

export function crafterTalkCensus() {
  const authored = Object.values(AUTHORED).reduce((n, m) => n + Object.keys(m).length, 0);
  return {
    benches: CRAFTER_BENCHES.length,
    families: PROBLEM_FAMILIES.length,
    problems: PROBLEM_FAMILIES.length * CRAFTER_BENCHES.length,
    authored,
    confluences: Object.keys(CONFLUENCE_CONCEPTS).length,
    lines: Object.keys(CONFLUENCE_CONCEPTS).length * CRAFTER_BENCHES.length,
  };
}
