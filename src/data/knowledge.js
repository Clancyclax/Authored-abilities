// ===========================================================================
// ROUND 92 -- KNOWLEDGE, IN HER OWN VOICE, ON HER OWN TRIGGERS.
//
//   "The text of knowledge's introduction needs heavy improvement. It
//    currently is very overtly AI written and doesn't feel accurate to the
//    world."
//
//   "The pacing of knowledges advice doesn't make sense. After improving the
//    text itself the triggers need to be relevant to the information."
//
//   "Review how knowledge is written within the books. Generally as a 'she',
//    slightly humorous, but patient and helpful."
//
// ---------------------------------------------------------------------------
// SHE, FIRST OF ALL
// ---------------------------------------------------------------------------
//
// DESIGN_STORY.md has had it right since the beginning -- "Knowledge -- the
// goddess -- speaks into their mind" -- and round 82's sewer file wrote the
// character note as "He is a god explaining something obvious to someone who
// has just died", which is wrong twice over. She is not explaining something
// obvious and she is not contemptuous about it. Every reference in the code is
// hers now.
//
// ---------------------------------------------------------------------------
// WHAT WAS ACTUALLY WRONG WITH THE OLD TEXT
// ---------------------------------------------------------------------------
//
// Naming it precisely, because "sounds AI-written" is a symptom and the cause
// is a set of habits that can be avoided deliberately:
//
//   * IT ENDED EVERY BEAT ON AN APHORISM. "That is the whole system.
//     Everything else is arithmetic." / "People die holding full flasks. Do
//     not be one." Six lines, six punchlines. Nobody talks like that; it is
//     the rhythm of a pull quote, and six in a row reads as a machine that has
//     learned the shape of an ending.
//   * IT WAS CLIPPED TO THE POINT OF COLDNESS. "Armour is armour. Put it on."
//     was written to sound laconic and lands as bored. The brief is patient.
//   * IT WAS FUNNY AT THE PLAYER'S EXPENSE. "it is holding a weapon because
//     you had the sense to pick one up, or it is not because you did not" is a
//     joke about the player being stupid, delivered before they have done
//     anything.
//   * IT EXPLAINED SYSTEMS RATHER THAN THINGS. "Sixteen sockets. Twenty
//     abilities, once the innate ones are counted." A goddess does not have a
//     feature list.
//
// So: she is warm, she is unhurried, her humour is dry and aimed at the
// situation rather than at the player, and she describes what is true about
// the world rather than what is true about the interface. She likes this
// person. She is not worried, which is itself reassuring.
//
// ---------------------------------------------------------------------------
// AND THE TRIGGERS ARE EVENTS, NOT FLOOR TILES
// ---------------------------------------------------------------------------
//
// Round 82 fired six tidbits by walking onto six marked tiles, and it was a
// real improvement on Act 0's eight pages of exposition -- the potion line was
// beside a potion. But a tile is a guess about what the player has done, and
// the guesses were wrong in both directions: the essence lecture fired on a
// tile whether or not the player had ever seen an essence (they had not -- the
// sewer's 'e' marks are STONES, and the first essence in the game is the
// cultist's drop, two chambers later), and a player who picked up a sword in
// a dead end got the attack lecture whenever they wandered back onto the path.
//
// The ask replaces the guess with the thing itself:
//
//     "2.1.1) Picking up a weapon      2.1.4) Picking up an awakening stone
//      2.1.2) Picking up quintessence  2.1.5) Killing a monster
//      2.1.3) Picking up an essence    2.1.6) firsts in general, waking up,
//                                             escaping the sewer, encountering
//                                             the cultist."
//
// Every line below hangs off something the player DID, and fires the first
// time they ever do it. That makes the pacing correct by construction rather
// than by placement: the essence line cannot fire before there is an essence,
// because an essence being picked up is what fires it.
//
// FOR THE WHOLE GAME, not just the prologue -- which the ask settles by
// including quintessence. Quintessence comes off a kill (`_dropLootFromKill`
// rolls it on every monster in the game, sewer slimes included) and cores come
// off every monster guaranteed, so both CAN land down there; but a player who
// misses them in the sewer should still be told what they are the first time
// they see one, whether that is on hour one or hour six.
//
// ONE LINE EACH, ONCE EVER. `player.knowledgeSaid` is an array of ids and an
// ordinary player field, so saves.js carries it with no work at all (its loop
// copies every player field, and an array survives `plain()`). A god who
// repeats herself is a tutorial pop-up.
// ===========================================================================

/** The player field. An array rather than a Set so a save round-trips it. */
export const KNOWLEDGE_FLAG = 'knowledgeSaid';

/**
 * Every first she speaks on.
 *
 * `id`      the flag stored in `player.knowledgeSaid`
 * `when`    a human sentence naming the moment -- printed by the suite, so a
 *           line whose trigger nobody can describe is visible as one
 * `text`    what she says
 * `sewer`   true if this one can only happen underground (used only to order
 *           the table readably; nothing gates on it)
 *
 * ORDER IS THE ORDER SHE EXPECTS THEM IN, not the order they must happen in.
 * A player can pick up a stone before a weapon and the table does not care.
 */
export const KNOWLEDGE_FIRSTS = [
  {
    id: 'waking', sewer: true,
    when: 'the player wakes in the ritual circle',
    text: 'Oh — good. Good, you\'re awake.\n\n'
      + 'I would like to tell you I knew that would work. I have been talking '
      + 'at you for about six hours on the assumption that some of it was '
      + 'getting through, so if none of it was, do me the kindness of not '
      + 'saying so.\n\n'
      + 'Don\'t get up yet. Nothing is coming. The only thing down here in any '
      + 'hurry is the water, and it has been in a hurry for two hundred '
      + 'years.\n\n'
      + 'I\'m going to stay with you, {NAME}. Not entirely out of the goodness '
      + 'of my heart. Mostly because you have no idea where you are and I would '
      + 'like you to survive the next hour.',
  },
  {
    id: 'weapon', sewer: false,
    when: 'the first weapon is picked up',
    text: 'Yes. Take it.\n\n'
      + 'Each hand swings on its own, so if you turn up a second one you can '
      + 'hold both. There is no craft in it yet — you put the sharp end into '
      + 'the thing and you keep doing that until it stops.',
  },
  {
    id: 'kill', sewer: false,
    when: 'the first monster the player kills',
    text: 'There. That is the worst one you will ever have to do.\n\n'
      + 'Everything alive down here is held together by magic, and that one is '
      + 'not held together any more, so what it was made of has to go '
      + 'somewhere. A little settles into whatever is solid enough to hold it. '
      + 'Most of it does not. I have never found out where the rest goes, and I '
      + 'have had an extremely long time to ask.\n\n'
      + 'Look at what it left, though. Down here that is most of the reason to '
      + 'have fought it.',
  },
  {
    id: 'gear', sewer: false,
    when: 'the first piece of armour is picked up',
    text: 'Put it on. It will turn a blade, it will not turn fire, and a great '
      + 'many confident people have learned the second half of that sentence in '
      + 'the wrong order.\n\n'
      + 'It also changes what you look like, which matters more than it ought '
      + 'to. You are about to walk into a city that reads a person off their '
      + 'coat.',
  },
  {
    id: 'consumable', sewer: false,
    when: 'the first potion or other consumable is picked up',
    text: 'Take that. And then don\'t drink it.\n\n'
      + 'No. That came out wrong. Drink it whenever you like. What I mean is '
      + 'that the moment you want it most is never the moment you are standing '
      + 'in.\n\n'
      + 'It sits in a slot and comes out on a key, and afterwards there is a '
      + 'wait before you may have another. Learn how long that wait is before '
      + 'you learn how much it heals.\n\n'
      + 'People die with full flasks on their belts. I would rather you did '
      + 'not.',
  },
  {
    id: 'stone', sewer: false,
    when: 'the first awakening stone is picked up',
    text: 'An awakening stone. You have found one before you have anywhere to '
      + 'put it, which is very much the order things happen in.\n\n'
      + 'Keep it anyway. Once an essence is bonded to you a stone goes into it '
      + 'and something wakes up — one ability, decided by the two of them '
      + 'together. The same stone in somebody else wakes something else '
      + 'entirely, because half of the answer is always the person holding it. '
      + 'I could talk about this for a week. I have, in fact, and to less '
      + 'promising company.\n\n'
      + 'Four will fit in each essence. You will run out of stones long before '
      + 'you run out of places to put them.',
  },
  {
    id: 'essence', sewer: false,
    when: 'the first essence is picked up',
    text: 'Stop. Look at it properly first.\n\n'
      + 'That is an essence, and very nearly everything anyone in this world '
      + 'can do is built out of one. You absorb it. It does not come back out. '
      + 'There is no undoing it, no trading it and no growing out of it.\n\n'
      + 'Three will bond to you. When the third settles, a fourth forms on its '
      + 'own out of whatever the three of them make between them, and nobody '
      + 'chooses that one. Not you, and not me.\n\n'
      + 'I am telling you all of it now, before you have had to choose '
      + 'anything, because every person I have watched choose badly knew '
      + 'exactly this much and was in a hurry anyway.\n\n'
      + 'Take your time. Nothing down here is going anywhere.',
  },
  {
    id: 'quintessence', sewer: false,
    when: 'the first quintessence is picked up',
    text: 'Quintessence. That is what the creature was made of, before anything '
      + 'made it into a creature.\n\n'
      + 'It will do nothing whatsoever in your pocket. It is stock: someone who '
      + 'knows the work puts it into a piece of gear and it decides what that '
      + 'gear does. Fire quintessence argues for fire. There are people in the '
      + 'city who will be very pleased to see you carrying it.',
  },
  {
    id: 'core', sewer: false,
    when: 'the first monster core is picked up',
    text: 'A core. The knot the creature was tied in, still knotted after the '
      + 'rest of it came undone.\n\n'
      + 'Every monster leaves one at its own rank, and when a thing is made the '
      + 'core sets how fine a thing it is allowed to be. Which is why a crafter '
      + 'asks what you have been killing before they ask what you want.',
  },
  {
    id: 'cultist', sewer: true,
    when: 'the player first sees the cultist in the last chamber',
    text: 'Careful.\n\n'
      + 'That one is breathing. He was down here a long while before you were, '
      + 'and whatever was done in the circle you woke up in, he had hold of the '
      + 'other end of it.\n\n'
      + 'He is in a bad way. Don\'t lean on it.',
  },
  {
    id: 'surface', sewer: false,
    when: 'the player climbs out of the sewer for the first time',
    text: 'Out. Well done. I did wonder, twice.\n\n'
      + 'Right. This is Cadence, which is a city in the Nek, which is a country '
      + 'on a world called Pallimustus, and you have not been to any of those '
      + 'before. Everyone you meet will work that out inside four words. There '
      + 'is no hiding it and it will cost you nothing, so don\'t tire yourself '
      + 'trying.\n\n'
      + 'There is a guild here that pays people to go out and kill monsters.\n\n'
      + 'I know. I did think of you when I found out.',
  },
  {
    id: 'confluence', sewer: false,
    when: 'the confluence forms for the first time',
    text: 'There it is. Your fourth.\n\n'
      + 'I said nobody chooses it. What I did not say is that it is usually the '
      + 'one a person ends up known for. It is the only part of you that came '
      + 'out of all three of the others agreeing about something, and they do '
      + 'not agree often.\n\n'
      + 'Go and look. I have been waiting on this since the circle.',
  },
];

/** By id, for the one lookup the scene does. */
export const KNOWLEDGE_BY_ID = Object.fromEntries(KNOWLEDGE_FIRSTS.map(k => [k.id, k]));

/** Has she said this one to this character yet? */
export function knowledgeSaid(player, id) {
  return !!(player && Array.isArray(player[KNOWLEDGE_FLAG]) && player[KNOWLEDGE_FLAG].includes(id));
}

/** Mark it said. Returns false if it already was, so the caller can use this
 *  as the "should I open a dialogue" test and the record in one step. */
export function markKnowledgeSaid(player, id) {
  if (!player) return false;
  if (!Array.isArray(player[KNOWLEDGE_FLAG])) player[KNOWLEDGE_FLAG] = [];
  if (player[KNOWLEDGE_FLAG].includes(id)) return false;
  player[KNOWLEDGE_FLAG].push(id);
  return true;
}

/**
 * The table checked against itself.
 *
 * WHAT THIS IS FOR. The failure mode of a table of prose is not that it throws
 * -- it is that a line is unreachable, or duplicated, or quietly still carries
 * the habits the round was written to remove. The first two are mechanical and
 * are checked here. The third is checked as far as it can be: the aphorism
 * habit had a measurable signature (six beats, six one-sentence closing
 * paragraphs), so that shape is refused outright. It would have failed every
 * one of round 82's six lines.
 */
export function knowledgeFaults() {
  const out = [];
  const seen = new Set();
  for (const k of KNOWLEDGE_FIRSTS) {
    if (!k.id) { out.push('a first with no id'); continue; }
    if (seen.has(k.id)) out.push(`two firsts share the id '${k.id}'`);
    seen.add(k.id);
    if (!k.when || k.when.length < 12) out.push(`'${k.id}' does not say when it fires`);
    if (!k.text || k.text.length < 90) out.push(`'${k.id}' is too short to be a scene`);
    if (k.text && k.text.length > 900) out.push(`'${k.id}' is longer than anyone will read`);
  }

  // =========================================================================
  // ROUND 115 -- THE SHAPE OF THE WHOLE TABLE, NOT THE SHAPE OF ONE LINE.
  //
  //   "Knowledge's script is heavily reading as AI slop. All dialogue needs to
  //    have personality and not sound like a linkedin post."
  //   "Refer to natural sounding dialogue from movies, scripts, and books.
  //    Social media posts are not a good source."
  //
  // Round 92 already rewrote every word of this file for the same complaint
  // and the complaint came back, so the interesting question is what survived
  // the rewrite. Measured, and it is not a matter of taste:
  //
  //     twelve beats, TWELVE OF THEM THREE PARAGRAPHS
  //     lengths from 267 to 506 -- a 240-character band across twelve speeches
  //     eight of the twelve carrying the same em-dash aside
  //
  // That is the tell. Not the vocabulary and not the jokes: the UNIFORMITY. A
  // person answering twelve different moments does not answer all of them at
  // the same length in the same number of breaths, and a reader clocks that
  // long before they could say why. Round 92's own check was aimed at the
  // wrong thing -- it measured the closing paragraph of each beat and let the
  // twelve identical skeletons through without a word.
  //
  // So this checks the distribution. It is not a claim that varied paragraph
  // counts make good dialogue; it is a claim that IDENTICAL ones are evidence
  // of a template, and evidence of a template is what the user is reading.
  // Every threshold below is set from the numbers above -- each one fails the
  // round 92 table and passes this one.
  // =========================================================================
  const beats = KNOWLEDGE_FIRSTS.filter(k => k.text);
  if (beats.length >= 6) {
    const paras = beats.map(k => k.text.split('\n\n').filter(Boolean).length);
    const byCount = {};
    for (const n of paras) byCount[n] = (byCount[n] || 0) + 1;
    const mode = Math.max(...Object.values(byCount));
    // A mode is natural; a monopoly is a template. Two thirds is the line, and
    // round 92 sat at twelve twelfths.
    if (mode > Math.ceil(beats.length * 0.66)) {
      const which = Object.entries(byCount).find(([, n]) => n === mode);
      out.push(`${mode} of ${beats.length} beats are ${which[0]} paragraphs long -- `
        + 'that is a template, not twelve answers');
    }
    if (Object.keys(byCount).length < 3) {
      out.push(`the beats come in only ${Object.keys(byCount).length} shape(s)`);
    }
    // She has to be able to say one line, and she has to be able to say a
    // page. Round 92 could do neither: nothing under 267 characters and
    // nothing over 506.
    const lens = beats.map(k => k.text.length);
    const lo = Math.min(...lens), hi = Math.max(...lens);
    if (lo > 240) out.push(`her shortest answer is ${lo} characters -- she never simply says a thing`);
    if (hi < 560) out.push(`her longest answer is ${hi} characters -- she never takes her time`);
    // The em-dash aside. A tic is a tic when it is in most of them.
    const tic = beats.filter(k => / — /.test(k.text)).length;
    if (tic > Math.floor(beats.length / 2)) {
      out.push(`${tic} of ${beats.length} beats carry the same em-dash aside`);
    }
    // AND SHE MUST SOMETIMES STOP MID-THOUGHT. This is the one property of
    // spoken dialogue that no amount of rewriting the vocabulary produces on
    // its own: people interrupt themselves, correct themselves, and answer a
    // question that was not asked out loud. If none of the twelve does any of
    // that, the file has been written rather than spoken.
    const spoken = beats.filter(k =>
      /\b(No\.|Well\.|Right\.|Oh[ ,—])/.test(k.text) || /\.\.\./.test(k.text));
    if (spoken.length < 2) {
      out.push('no beat interrupts or corrects itself -- every one is a finished paragraph');
    }
  }

  // Every trigger the scene knows how to fire must have a line, and every line
  // must have a trigger something actually raises. The list is duplicated here
  // deliberately: if WorldScene stops raising one, this says so.
  const RAISED = ['waking', 'weapon', 'kill', 'gear', 'consumable', 'stone', 'essence',
                  'quintessence', 'core', 'cultist', 'surface', 'confluence'];
  for (const id of RAISED) if (!seen.has(id)) out.push(`nothing to say on '${id}'`);
  for (const id of seen) if (!RAISED.includes(id)) out.push(`'${id}' is never fired`);
  return out;
}
