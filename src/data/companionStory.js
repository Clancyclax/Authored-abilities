// ROUND 76 (item 9) -- THE COMPANIONS HAVE INSIDES NOW.
//
// STATUS_QUESTS_AND_STORY.md, on what four named characters amounted to:
//
//   "HANDOFF's 'faces, kits, and no interiority' is accurate.
//      Zeke Clark            8 lines (incl. the whole farm job)
//      Encykla Britanika     3
//      Ædia Britanika        3
//      Benjamin Iskarys      3
//    The three sisters and Benjamin join by walking within 150 units. After
//    that, talking to any of them returns a STAT READOUT -- role, rank, hit
//    points, four ability names -- not a line of character.
//    There is no banter system of any kind: no inter-companion dialogue, no
//    reactions to locations, no reaction to Act 1 events."
//
// The user wrote the four backstories themselves and they are followed
// closely, quoted where the wording is theirs:
//
//   9.2  Zeke "lost his wife to monsters about a year prior, he is haunted
//        that he couldn't save her, and became an adventurer as she always
//        wanted him to."
//   9.3  The Britanica sisters "were slaves in Bratugal, they ran when they
//        reached iron rank and their control devices were purged. They want
//        to reach gold rank in order to shut down the jungle slave market."
//   9.4  Benjamin is "secretly a noble of Vitesse, his family are solo
//        hunters, his kit is so defensive he is seen as a failure, he was
//        exiled and his name magically taken, and he has no childhood
//        memories." The user: he is "the emotional core, positive despite
//        it".
//
// ============================================================================
// HOW IT WORKS, AND WHY IT IS SHAPED THIS WAY
// ============================================================================
//
// AN ARC, NOT A DIALOGUE TREE. Each companion has an ordered list of things
// they will tell you, and talking to them gives you the next one. No choices,
// no branches: the player's only input is that they keep coming back, which is
// the whole of what earns somebody's history in practice. A tree would have
// meant writing four times the lines to have three quarters of them never
// read, and a tree with no real choices is a list wearing a costume.
//
// GATES ARE STATED IN THE DATA. A step can require a `rank` or a `region` or a
// `flag`, so Zeke does not tell you about his wife in the first five minutes
// and the sisters do not talk about Bratugal until you have been there. The
// gate is a property of the STEP rather than a rule in the scene, so adding a
// beat later is a data edit.
//
// AND WHEN THE ARC RUNS OUT they say something ordinary. A companion who
// repeats their last confession every time you press E has not been given
// interiority, they have been given a stuck record. `idle` is a small bank of
// in-character nothings, which is what people mostly say.
//
// BANTER IS A PAIR, NOT A MONOLOGUE. Two companions, two lines, fired while
// walking. It needs BOTH of them recruited and it names them explicitly, which
// is what makes the twins' rivalry -- authored in party.js since round 44 as
// `elder: true` and read only by the rank-offset maths -- something the player
// can actually hear.
import { RANK_ORDER } from './ranks.js';
import { REGION_ACT, rankToReach } from './acts.js';
// ROUND 124 -- Prism's arc, idle lines and banter live in prism.js beside the
// rest of her voice (her sewer barks, her escape page). They are joined into
// the three tables below rather than written here, so there is exactly one
// file to open when somebody asks 'what does Prism say'.
import { PRISM_ID, PRISM_ARC, PRISM_IDLE, PRISM_BANTER } from './prism.js';

/** How many seconds between banter attempts, and how likely one lands. */
export const BANTER_INTERVAL = 42;
export const BANTER_CHANCE = 0.55;
/** No two banters in a row from the same pair, and none repeated until the
 *  bank is spent -- see `pickBanter`. */
export const BANTER_MEMORY = 6;

/**
 * The four arcs.
 *
 * `need` on a step is ALL of what it asks, and every field is optional:
 *   rank    the player must be at least this rank
 *   region  the party must be standing in this region
 *   told    this many earlier steps of the SAME arc must already be told
 *   flag    a player flag that must be truthy (`divisionStage >= n` is
 *           expressed as `divisionAtLeast`)
 */
export const COMPANION_ARCS = {
  // --------------------------------------------------------------- 9.2 ----
  // "Zeke lost his wife to monsters about a year prior, he is haunted that he
  // couldn't save her, and became an adventurer as she always wanted him to."
  //
  // His farm job is round 48's and already in the game; this is what he never
  // said while you were doing it. The order matters more here than anywhere
  // else in the file: he mentions her three times before he says what
  // happened, because that is how somebody tells you this.
  zeke: [
    { id: 'zeke_1',
      line: "Thirty years on that ground and I never once bonded an essence. Never saw the need.\n\n"
        + "Martha did. She used to say it at me over supper like a man might mention the roof." },
    { id: 'zeke_2', need: { told: 1 },
      line: '"You have hands like a healer, Zeke Clark, and you are wasting them on turnips."\n\n'
        + 'Every harvest. Twenty-odd years of it. I would laugh and she would let me.' },
    { id: 'zeke_3', need: { told: 2, rank: 'iron' },
      line: "She is not with me, before you ask it politely for the third time.\n\n"
        + "It was a year ago in the spring. A pack came up out of the bottoms in the middle of the "
        + "day, which they do not do, and I was in the far field, which I should not have been." },
    { id: 'zeke_4', need: { told: 3, rank: 'iron' },
      line: "I got there. That is the part I would change if I could change one part.\n\n"
        + "I got there and I stood in my own yard with two good hands and thirty years of knowing "
        + "exactly where everything was, and I did not have one single thing in me that could help "
        + "her. Not one. A man with hands like a healer." },
    { id: 'zeke_5', need: { told: 4, rank: 'bronze' },
      line: "I bonded Life eleven days after we buried her. Late, and badly, and it nearly took me "
        + "with it.\n\nI am not going to tell you it was for her. She would have had something to "
        + "say about that. It was because I could not stand in another yard like that." },
    { id: 'zeke_6', need: { told: 5, rank: 'bronze' },
      line: "You want to know the thing I cannot get round?\n\n"
        + "She was right. She was right for twenty years and I let her be right at me over supper "
        + "and I never once did anything about it. I am out here doing the thing she asked me to "
        + "do, and the only reason I am doing it is that she is not here to see it." },
    { id: 'zeke_7', need: { told: 6, rank: 'silver' },
      line: "It is easier lately. I want that said out loud, because there was a stretch where I "
        + "would not have believed it.\n\nI keep the lot of you standing. Somebody has to, and it "
        + "turns out I am good at it. She would be unbearable about that." },
  ],

  // --------------------------------------------------------------- 9.3 ----
  // "The Britanica sisters were slaves in Bratugal, they ran when they reached
  // iron rank and their control devices were purged. They want to reach gold
  // rank in order to shut down the jungle slave market."
  //
  // Split so the two of them tell the SAME history differently, which is the
  // only reason to have twins in a party: Encykla remembers the mechanism and
  // the plan, Ædia remembers the room and the running. Neither of them will
  // start it until you have taken them to Bratugal.
  encykla: [
    { id: 'enc_1',
      line: "Do not ask where we are from. Ask me in a month." },
    { id: 'enc_2', need: { told: 1, rank: 'iron' },
      line: "A month, then, near enough.\n\nBratugal. Not as visitors." },
    { id: 'enc_3', need: { told: 2, rank: 'iron' },
      line: "There is a device. A collar is the wrong word for it — it is finer than that and it "
        + "sits under the skin, and it does not stop you doing anything.\n\n"
        + "It stops you WANTING to. That is the elegance of the thing, and I have thought about "
        + "the person who designed it every day since." },
    { id: 'enc_4', need: { told: 3, rank: 'bronze' },
      line: "It is calibrated to a normal-rank body. Nobody bothered writing the case where the "
        + "stock reaches iron, because the stock is not fed well enough to.\n\n"
        + "We were. Badly, and on purpose, and for eleven years. The night mine purged I lay "
        + "absolutely still for four hours working out whether it had actually happened." },
    // ROUND 183 -- the `rank: 'bronze'` came off this. Bratugal has been behind
    // a Gold portal since it had an exit, so the Bronze could never be the
    // binding condition: it read as a Bronze-era beat and was always a Gold one.
    // The region carries the gate, and says so once.
    { id: 'enc_5', need: { told: 4, region: 'bratugal' },
      line: "Yes. This is it. Do not look at me like that, I have been fine since the docks.\n\n"
        + "The market is inland, in the jungle, and it is not hidden. It has a NAME. People go "
        + "there the way you would go to a horse fair." },
    { id: 'enc_6', need: { told: 5, rank: 'silver' },
      line: "Gold. That is the number, and it is not ambition.\n\n"
        + "Below gold you are a complaint. At gold you are a party to be negotiated with, and the "
        + "people who run that market negotiate. I intend to be something they have to sit down "
        + "opposite." },
    { id: 'enc_7', need: { told: 6, rank: 'gold' },
      line: "Eleven minutes older, and I have spent every one of them since the docks doing "
        + "arithmetic about a jungle.\n\nWe are gold. Ædia will want to go tomorrow. I would like "
        + "one week to write to four people first, and then I would like to go tomorrow." },
  ],
  aedia: [
    { id: 'aed_1',
      line: "Encykla will tell you when she tells you. She always does. I would tell you now, but "
        + "she is eleven minutes older and it is apparently her history." },
    { id: 'aed_2', need: { told: 1, rank: 'iron' },
      line: "She has told you, then. She will have told it beautifully.\n\n"
        + "Ask her what the room smelled like. She will not know. She was doing arithmetic the "
        + "whole eleven years." },
    { id: 'aed_3', need: { told: 2, rank: 'iron' },
      line: "I ran first. That is the one thing in our lives I did first.\n\n"
        + "Mine purged four days before hers and I sat in that room for four days with nothing "
        + "under my skin telling me not to, and I did not go, because she was still in it." },
    { id: 'aed_4', need: { told: 3, rank: 'bronze' },
      line: "This is why I am fast, since you have been too polite to ask.\n\n"
        + "It is not a gift and it is not training. It is four days of standing in a doorway "
        + "learning exactly how long it takes to cross a room." },
    // ROUND 183 -- see enc_5. Aedia's twin beat carried the same dominated gate.
    { id: 'aed_5', need: { told: 4, region: 'bratugal' },
      line: "Do not stand behind me here.\n\nI know. I know. Stand where I can see you, that is "
        + "all I am asking." },
    { id: 'aed_6', need: { told: 5, rank: 'silver' },
      line: "She wants gold so she can sit opposite them at a table.\n\n"
        + "I want gold because at gold nobody in that jungle is fast enough to get out of the "
        + "room. We are going to the same place. She can bring her table." },
    { id: 'aed_7', need: { told: 6, rank: 'gold' },
      line: "Gold.\n\nEleven years, and then eleven minutes of listening to my sister ask for a "
        + "week to write letters.\n\nShe will get her week. She got me out of that room." },
  ],

  // --------------------------------------------------------------- 9.4 ----
  // Benjamin: "secretly a noble of Vitesse, his family are solo hunters, his
  // kit is so defensive he is seen as a failure, he was exiled and his name
  // magically taken, and he has no childhood memories."
  //
  // The user called him "the emotional core, positive despite it", and that is
  // the hardest constraint in this file. A character who has lost his name and
  // his childhood and is CHEERFUL about it is one bad line away from reading as
  // brave-faced or as brain-damaged. The rule held to throughout: he is not
  // pretending it is fine, he has simply decided what to do about it, and he
  // decided a while ago. He is the only one of the four who ends his arc
  // talking about somebody else.
  benjamin: [
    { id: 'ben_1',
      line: "I know what the shape of my kit says about me. You do not have to be delicate.\n\n"
        + "Everything I have is for standing in front of something. There is not one ability in "
        + "the whole of me that would kill a thing that let me alone." },
    { id: 'ben_2', need: { told: 1 },
      line: "Where I am from, that is the failure. Not a weakness — a FAILURE, with a word for it.\n\n"
        + "You go out alone, you bring it back alone, and if you cannot do that then what exactly "
        + "are you." },
    { id: 'ben_3', need: { told: 2, rank: 'iron' },
      line: "Vitesse. That is the house, and I should not say it, and I am going to keep saying it "
        + "until it stops feeling like something I stole.\n\n"
        + "Nine generations of solo hunters. Every one of them went out alone. Every one of them "
        + "came back alone, which sounds better than it is." },
    { id: 'ben_4', need: { told: 3, rank: 'iron' },
      line: "They took the name properly. Not disowned — TAKEN. There is a working for it and it "
        + "cost them something to have it done.\n\n"
        + "I know it was Vitesse the way you know a word in a language you do not speak. I could "
        + "not write it down for you. Benjamin Iskarys is a name I chose in a corridor." },
    { id: 'ben_5', need: { told: 4, rank: 'bronze' },
      line: "And it took the rest with it. That is the part nobody warns you about.\n\n"
        + "I have nothing before seventeen. No house, no face, no first day of anything. I am told "
        + "I had a brother. I have no opinion about him at all, which is the strangest sentence I "
        + "know how to say." },
    { id: 'ben_6', need: { told: 5, rank: 'bronze' },
      line: "You are waiting for me to be sad about it, and I do not want to disappoint you, but "
        + "I have had six years and I have thought it through.\n\n"
        + "A man with no childhood is a man with no debts to it. Nine generations went out alone "
        + "and came back alone and every single one of them was very good and very finished, and "
        + "I do not have to be that, because I cannot remember being taught to want it." },
    { id: 'ben_7', need: { told: 6, rank: 'silver' },
      line: "Here is what I have instead, and I would not trade back.\n\n"
        + "Zeke keeps us standing. Ædia gets there first. Encykla sees the whole field. And I am "
        + "the one who stands in front, which where I am from is what a failure does.\n\n"
        + "Four people came back. Nine generations never once managed that." },
  ],
};
// ROUND 124 -- and Prism's, joined in from her own file.
COMPANION_ARCS[PRISM_ID] = PRISM_ARC;

/**
 * The banter bank. Each entry is a PAIR and two lines, in order.
 *
 * `need` works exactly as it does on an arc step, plus `told` here means "both
 * speakers have told at least this many of their own steps" -- so the twins do
 * not joke about Bratugal in front of a player who has not been told about
 * Bratugal.
 */
export const BANTER = [
  { who: ['encykla', 'aedia'], need: {},
    lines: ["Eleven minutes.", "Nobody asked, Encykla."] },
  { who: ['aedia', 'encykla'], need: {},
    lines: ["I could have had that one before you finished aiming.",
      "You could have been standing in front of it when I finished aiming. Different thing."] },
  { who: ['zeke', 'benjamin'], need: {},
    lines: ["You take a lot of hits, son.",
      "That is the arrangement, yes."] },
  { who: ['benjamin', 'zeke'], need: {},
    lines: ["You do not have to patch me quite that fast, Zeke.",
      "I do, though."] },
  { who: ['zeke', 'aedia'], need: {},
    lines: ["You have not eaten since the gate.", "I will eat when it is dead."] },
  { who: ['encykla', 'benjamin'], need: {},
    lines: ["Left. LEFT, Benjamin.", "I heard you the first time. I was busy."] },
  // --- once their histories are out ---
  { who: ['benjamin', 'zeke'], need: { told: 3 },
    lines: ["Does it get easier?", "Some days. I will tell you which ones when I work it out."] },
  { who: ['aedia', 'encykla'], need: { told: 3 },
    lines: ["Four days.", "I have said I am sorry.", ] },
  { who: ['encykla', 'aedia'], need: { told: 5 },
    lines: ["When we are gold —", "When we are gold. Yes. Walk."] },
  { who: ['zeke', 'benjamin'], need: { told: 5 },
    lines: ["Nine generations of them and not one worth talking to at supper.",
      "That is exactly what I have been trying to say for five years."] },
  { who: ['benjamin', 'encykla'], need: { told: 4 },
    lines: ["You do arithmetic when you are frightened. I have noticed.",
      "I do arithmetic ALWAYS. Being frightened is not the variable."] },
  { who: ['zeke', 'encykla'], need: { told: 4 },
    lines: ["You would have liked my wife. She counted things too.",
      "Then she was the sensible one and I am sorry I did not meet her."] },
];
// ROUND 124 -- Prism talks to all four of them, which is what stops a fifth
// companion reading as a guest star.
BANTER.push(...PRISM_BANTER);

/** Rank helper -- is `have` at least `need`? */
export function rankAtLeast(have, need) {
  if (!need) return true;
  return RANK_ORDER.indexOf(have || 'normal') >= RANK_ORDER.indexOf(need);
}

/**
 * The next thing this companion has to say, or null when their arc is spent.
 *
 * `state` is `{ told: {id: n}, rank, regionId, player }` -- everything the
 * gates can ask about, passed in rather than reached for, so this function is
 * pure and the suite can walk a whole arc without a running game.
 */
export function nextArcStep(companionId, state) {
  const arc = COMPANION_ARCS[companionId];
  if (!arc) return null;
  const told = (state && state.told && state.told[companionId]) || 0;
  if (told >= arc.length) return null;
  const step = arc[told];
  const need = step.need || {};
  if (need.told !== undefined && told < need.told) return null;
  if (need.rank && !rankAtLeast(state && state.rank, need.rank)) return null;
  if (need.region && (!state || state.regionId !== need.region)) return null;
  if (need.divisionAtLeast !== undefined
    && ((state && state.divisionStage) || 0) < need.divisionAtLeast) return null;
  return step;
}

/**
 * What they say when the arc has nothing for them right now -- either because
 * it is spent or because the next step is gated behind a rank or a place.
 *
 * Deliberately NOT the last arc step repeated: a companion who tells you about
 * his dead wife every time you press E has not been given interiority, he has
 * been given a stuck record.
 */
export const COMPANION_IDLE = {
  zeke: [
    'Still upright. That is most of it.',
    'Eat something when we stop. All of you.',
    'I have got you. Go on.',
    'That one was closer than you think it was.',
  ],
  encykla: [
    'Stand where I can see past you.',
    'Three of them, and the far one is the problem.',
    'I have counted. You have not. Trust me.',
    'When you are ready. I have been ready.',
  ],
  aedia: [
    'Point.',
    'I am already moving.',
    'You are slow today. Everyone is slow today.',
    'Do not wait for me to be finished. I will catch up.',
  ],
  benjamin: [
    'Behind me.',
    'I will tell you when it is over.',
    'This is the good part.',
    'Nothing has got past yet. I am keeping count.',
  ],
};
COMPANION_IDLE[PRISM_ID] = PRISM_IDLE;

/**
 * Pick a banter for the party standing here, or null.
 *
 * `recruited` is the set of ids actually with the player, `recent` the last
 * few banter indices. Both are passed in for the same reason the arc gate is:
 * so this can be walked without a game.
 */
export function pickBanter(recruited, state, recent = [], roll = Math.random) {
  const told = (state && state.told) || {};
  const ok = BANTER.map((b, i) => ({ b, i })).filter(({ b, i }) => {
    if (recent.includes(i)) return false;
    if (!b.who.every(w => recruited.includes(w))) return false;
    const need = b.need || {};
    if (need.told !== undefined && !b.who.every(w => (told[w] || 0) >= need.told)) return false;
    if (need.rank && !rankAtLeast(state && state.rank, need.rank)) return false;
    if (need.region && (!state || state.regionId !== need.region)) return false;
    return true;
  });
  if (!ok.length) return null;
  const pick = ok[Math.floor(roll() * ok.length) % ok.length];
  return { index: pick.i, ...pick.b };
}

/**
 * Everything wrong with this file, as a list. Same shape as divisionFaults.
 */
export function companionStoryFaults() {
  const out = [];
  const ids = Object.keys(COMPANION_ARCS);
  for (const [id, arc] of Object.entries(COMPANION_ARCS)) {
    if (arc.length < 5) out.push(`${id}: arc is only ${arc.length} steps`);
    const seen = new Set();
    arc.forEach((s, i) => {
      if (!s.id) out.push(`${id}[${i}]: no id`);
      if (seen.has(s.id)) out.push(`${id}: duplicate step id ${s.id}`);
      seen.add(s.id);
      if (!s.line || s.line.length < 40) out.push(`${id}: ${s.id} has no real line`);
      const need = s.need || {};
      // A step that requires more steps than come before it is unreachable --
      // the exact defect class this project keeps finding, in a new place.
      if (need.told !== undefined && need.told > i) {
        out.push(`${id}: ${s.id} needs ${need.told} told but is step ${i}`);
      }
      if (need.rank && !RANK_ORDER.includes(need.rank)) out.push(`${id}: ${s.id} unknown rank ${need.rank}`);
      // ROUND 183 -- A RANK GATE THAT THE REGION GATE ALREADY DOMINATES.
      //
      // `need.region` and `need.rank` are ANDed, so a step that asks for
      // Bronze in a region costing Gold is not wrong, it is MEANINGLESS: the
      // rank can never be the binding condition and the data says something
      // about the pacing that is not true. Both of the two region-gated steps
      // in this file were like that -- authored as Bronze beats in Bratugal,
      // which has been behind a Gold portal since it had an exit at all.
      //
      // The region is checked too, because a beat keyed to somewhere off the
      // act spine is a beat that never fires and nothing else would say so.
      if (need.region) {
        if (!REGION_ACT[need.region]) {
          out.push(`${id}: ${s.id} waits for ${need.region}, which is in no act`);
        } else if (need.rank
            && RANK_ORDER.indexOf(need.rank) < RANK_ORDER.indexOf(rankToReach(need.region))) {
          out.push(`${id}: ${s.id} gates on ${need.rank} in ${need.region}, which costs ${rankToReach(need.region)}`);
        }
      }
    });
    // The ranks must not go BACKWARDS down an arc, or a step gated at bronze
    // sits behind one gated at silver and is reached after it.
    let prev = -1;
    for (const s of arc) {
      const r = s.need && s.need.rank ? RANK_ORDER.indexOf(s.need.rank) : prev;
      if (r < prev) out.push(`${id}: ${s.id} steps back to ${s.need.rank}`);
      prev = Math.max(prev, r);
    }
    if (!(COMPANION_IDLE[id] || []).length) out.push(`${id}: no idle lines`);
  }
  for (const [i, b] of BANTER.entries()) {
    if (!Array.isArray(b.who) || b.who.length !== 2) out.push(`banter ${i}: needs exactly two speakers`);
    for (const w of (b.who || [])) if (!ids.includes(w)) out.push(`banter ${i}: unknown speaker ${w}`);
    if (b.who && b.who[0] === b.who[1]) out.push(`banter ${i}: talking to themselves`);
    if (!Array.isArray(b.lines) || b.lines.length !== 2) out.push(`banter ${i}: needs exactly two lines`);
    for (const l of (b.lines || [])) if (!l || !l.trim()) out.push(`banter ${i}: empty line`);
  }
  // Every companion has to appear in banter, or the system exists for two of
  // them and the other two stand there silently while it runs.
  for (const id of ids) {
    if (!BANTER.some(b => b.who.includes(id))) out.push(`${id}: never speaks in banter`);
  }
  return out;
}
