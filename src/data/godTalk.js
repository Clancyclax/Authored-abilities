// ===========================================================================
// ROUND 211 -- AND THE GODS.
//
// The user: "Lets do companions (and gods) then item 4."
//
// WHAT WAS THERE. `_talkToGod` builds a page out of the quest chains -- take
// the charge, report the charge, swap the follower -- and that page is good.
// But it is a DISPATCH COUNTER. Eight gods, each with a domain the user wrote,
// each permanently bondable, each capable of marking you unfriendly forever if
// you sell what they gave you, and the only thing you could ever say to one
// was "yes" or "later".
//
// The townsfolk got a tree in round 208. Companions got one in this round. A
// god was the last speaker in the game with nothing you could ask.
//
// ---------------------------------------------------------------------------
// THE ONE STRUCTURAL DIFFERENCE, AND WHY IT IS NOT THE ROUND 209 RULE.
//
// Round 209 decided that a scripted page carrying BUTTONS suppresses the topic
// list: "the player is being asked to decide something and a topic list under
// a decision would invite them to wander off mid-sentence." That was right
// about the herald putting a motion, and it is wrong about a god.
//
// A god's buttons are not a decision put to you in a moment. `Take: The
// Muster` sits on that page for as long as the chapter is unclaimed -- weeks
// of play, every visit. Applying the round 209 rule literally would mean the
// eight gods each had a tree that nobody could ever open, which is this
// project's fault class 2 (written by one side, read by none) arriving by way
// of a rule that was correct somewhere else.
//
// So the god page shows BOTH: the charges as buttons, the questions as topics.
// `_talkToWithChoices` is the door for that, and the herald keeps the old
// behaviour, because a motion really is a moment.
//
// ---------------------------------------------------------------------------
// VOICES. Eight, one each, taken from the domain the user already wrote:
//
//   war        the line that holds              -- short. no waste. imperative.
//   knowledge  what is written down             -- asks you questions back.
//   purity     what has been fouled             -- cold, absolute, no comfort.
//   healing    what can still be saved          -- warm, and very tired.
//   death      the war on Undeath               -- formal, patient, not grim.
//   heros      the deed people repeat           -- grand, and aware it is grand.
//   liberty    the hand nobody is holding shut  -- plain, and angry.
//   dominion   ground that is held              -- legal, measured, imperial.
//
// The tell ceiling from round 210 is enforced here too, for the reason it is
// enforced in companionTalk: a guard that only ever runs over the lines it was
// written about has not been tested.
// ===========================================================================

import { TELLS } from './dialogue.js';
import { DIVINE_GODS, godLabel } from './divine.js';
import { GOD_QUESTS } from './godQuests.js';

export const GOD_IDS = DIVINE_GODS.slice();

/** A row that only appears once the story has moved. */
const fromAct = (n) => (ctx) => (ctx && ctx.act ? ctx.act : 1) >= n;

// ===========================================================================
// THE TREE.
//
//   { label, by, byAct, whenDisciple, children, when }
//
//   by            { god: text }
//   byDisciple    { god: text } -- used instead of `by` when you wear their
//                 essence, because a god who has bound you speaks differently
//                 and the user's own rule made that binding permanent
//   byAct         { 1..4: { god: text } }
//
// ctx is { god, disciple, act, rank, region }.
// ===========================================================================

export const GOD_TOPICS = {

  g_domain: {
    label: 'What is it you keep?',
    children: ['g_domain_why', 'g_domain_cost'],
    by: {
      war: "The line that holds. Not the charge, not the banner. The moment where people decide whether to stay standing next to each other.",
      knowledge: "What is written down. And, more than that, what was written down and then was not copied. Ask me which of those is larger.",
      purity: "What has been fouled. I do not keep the clean thing. Anyone can keep a clean thing.",
      healing: "What can still be saved. The word 'still' is doing a great deal of work in that sentence and I would not have you miss it.",
      death: "The war on Undeath. People hear my name and expect an ending. I am the one who insists that endings be permitted to happen.",
      heros: "The deed people repeat. Not the deed — the repeating. A thing nobody tells twice did not happen, whatever you saw.",
      liberty: "Freedom, and who is denied it. I keep the second half as carefully as the first, because nobody has ever needed a god for the first half.",
      dominion: "Subservience, and who is owed it. Somebody kneels to somebody in every arrangement you have ever lived under. I keep the accounts.",
    },
  },
  g_domain_why: {
    label: 'Why that, and not something larger?',
    by: {
      war: "Larger is for gods who want to be prayed to. I want the second rank to hold when the first one breaks.",
      knowledge: "It IS the larger one. Every other domain is a claim about the world, and every claim about the world is a thing somebody wrote down.",
      purity: "There is nothing larger. Rot spreads and clean does not. One of those needs a god watching it.",
      healing: "Because everything larger turns out, when you get close, to be a room with somebody in it who might not have to die.",
      death: "Because the alternative to my domain is not life. It is a very long imitation of it, and I have watched a continent try.",
      heros: "Larger? A single story, told well, moves more people than an army. I have run the comparison and I am not being poetic.",
      liberty: "A person in a collar does not care what else you are god of. I learned that four hundred years too late.",
      dominion: "Larger than that? Every law, every wall, every wage you have ever been paid is an argument about who answers to whom.",
    },
  },
  g_domain_cost: {
    label: 'And what does it cost, to be yours?',
    by: {
      war: "You stand where I put you. I will not ask you to die. I will ask you not to move, which people find is the harder of the two.",
      knowledge: "You write it down. All of it, including the parts that make you look foolish. Especially those, in fact.",
      purity: "Everything you would rather not look at, you look at. I have no followers who sleep well and I have never claimed otherwise.",
      healing: "You will lose people while holding their hand. Not while running to them — while holding their hand. Decide now whether you can.",
      death: "You will carry out sentences you did not pass. My work is mostly unmaking what grief talked somebody into.",
      heros: "You do it where it can be seen, and you accept that being seen is part of the work rather than the reward for it.",
      liberty: "Everything. I will not pretend the ledger balances. In Bratugal it has not balanced since before your grandmother's grandmother.",
      dominion: "You take on people who answer to you and you do not put them down when they become inconvenient. I will hold you to that.",
    },
  },

  g_charge: {
    label: 'What do you want from me?',
    by: {
      war: "Work. There is a charge on the table and you can read. Take it or come back when you would rather.",
      knowledge: "Your account of something. You have been places my people have not, and you have not written any of it down, which pains me.",
      purity: "That you go where I point and do not negotiate with what you find there.",
      healing: "Nothing you would not already do. That is why I keep asking you and not somebody more impressive.",
      death: "That you finish things. You have a habit of leaving a room while it is still moving and I would break you of it.",
      heros: "That you do one thing so plainly right that somebody repeats it badly at a table nine years from now.",
      liberty: "Get to Bratugal. Do not get sentimental about the route.",
      dominion: "Take responsibility for somebody. One person. Be there when it is tested; the number does not interest me.",
    },
    byDisciple: {
      war: "You wear my line. So: be where the break is going to happen, and be there before it happens. I do not give a second instruction.",
      knowledge: "You wear my pages, so I will be blunt with you in a way I am not with the congregation. Find out who kept telling Ixcuatl how to build.",
      purity: "You are mine, so you go first into the fouled thing. Nobody tricked you. You stood there and agreed to it.",
      healing: "You wear my mercy. Then spend it. Mercy kept in reserve is just a man being careful with somebody else's life.",
      death: "You wear my door. Then you carry out the sentences I cannot hand to a stranger. There are doors being held open across this continent and I want them shut.",
      heros: "You wear my name, so the deed is no longer yours. Do it anyway. You made that trade with your eyes open.",
      liberty: "You wear my hand. Then open something with it. A cell, a hold, a ledger, a market. I am not particular and I am not patient.",
      dominion: "You wear the crown's weight, so answer for people I have not asked you to answer for. Tell me afterwards. I judge by who was still standing.",
    },
  },

  g_them: {
    label: 'And the others like you?',
    children: ['g_them_worst'],
    by: {
      war: "Seven of them. I work well with Dominion and I have nothing to say to Liberty that would not start something.",
      knowledge: "Seven, and I have eight accounts of the founding, which tells you rather a lot about the seven.",
      purity: "Healing and I disagree about what is worth saving. We disagree politely and we disagree completely.",
      healing: "I am fond of most of them. Purity and I have the same argument every century and neither of us has moved an inch.",
      death: "Heroes tells people my work is sad. It is not sad. It is late, mostly, and lateness is what makes it sad.",
      heros: "War thinks I am decoration. War has never once been able to explain why anybody turns up for the second battle.",
      liberty: "Dominion thinks people are owed to somebody. We do not speak often and when we do it goes badly.",
      dominion: "Liberty calls me a jailer. She has never once explained who feeds a free city in a bad winter.",
    },
  },
  g_them_worst: {
    label: 'Which of them do you actually distrust?',
    when: fromAct(2),
    by: {
      war: "None of them. It is the people who quote us at each other I distrust, and that is a much longer list.",
      knowledge: "Purity. Not for malice — for the habit of deciding a thing is beyond saving before it has been properly read.",
      purity: "Knowledge. He will preserve anything, including the record of a thing that should have been burned with the thing.",
      healing: "Death, and he knows it, and he is right and I am wrong, and we have agreed to leave it there.",
      death: "Healing. She holds doors open a little longer than she should, out of love, and love is how the other thing gets in.",
      heros: "Dominion. A crown that has been sat in long enough stops noticing it is a chair.",
      liberty: "All of them, some days. Eight gods, four hundred years, and not one collar opened in Bratugal. Count me in that.",
      dominion: "Heroes. He teaches people that one splendid act discharges a duty. Duties are not discharged, they are inherited.",
    },
  },

  g_world: {
    label: 'What is happening to this world?',
    children: ['g_world_division', 'g_world_surge', 'g_world_us'],
    by: {
      war: "Something is thinning the people who would stand in the way. I do not need to know its name to know what it is doing.",
      knowledge: "The records are being edited. Not destroyed — edited. Somebody is going to a great deal of trouble to keep the shape of the page.",
      purity: "Something is fouling this place carefully. Carelessness I can forgive. Care I cannot.",
      healing: "More people are being brought to me already beyond saving, and they are arriving tidy. I would rather they arrived torn.",
      death: "Doors are being held open that I closed. I closed some of them myself and I remember every one.",
      heros: "Nothing is being told. Whole towns empty and no story comes out of them, and that has never happened in all the time I have kept this.",
      liberty: "The same thing that is always happening. Somebody has worked out how to own people again and given it a better name.",
      dominion: "People are being taken out of every ledger they appear in. No siege, no banner, no claim of ownership. I have no word for it yet.",
    },
  },
  g_world_division: {
    label: 'The people nobody will name.',
    by: {
      war: "I have told my temple to stay out of their way and I have never told my temple that before.",
      knowledge: "I know their charter, their seal and their staffing figures. I do not know their purpose and I find that intolerable.",
      purity: "Fouled, and organised about it. I would burn the house and everyone in it and I am aware that is why the others do not consult me.",
      healing: "They ask families to sign things. I get the families afterwards, and none of them can tell me what they signed.",
      death: "They are making the thing I exist to unmake. I will say no more plainly than that, and you may take the plainness as an answer.",
      heros: "Nobody tells a story about them. In four hundred years of this domain that has happened twice and the other time was worse.",
      liberty: "Owners. Give it a seal, a charter and a hill to stand on, and underneath it is still owners.",
      dominion: "They claim nobody and answer to nobody, and people still do as they say. There is no legal theory for what they are.",
    },
  },
  g_world_surge: {
    label: 'The surge.',
    by: {
      war: "It comes, it is met, it goes. What worries me this time is arithmetic and not courage.",
      knowledge: "Every ten to thirteen years since the records begin, and the records begin further back than the Society believes.",
      purity: "The ground turns itself out. There is nothing foul in a surge. It is honest, and I cannot say that of this century.",
      healing: "I lose more people in the eleven weeks of a surge than in the eleven years before it. I have never got used to the eleven weeks.",
      death: "A surge is the only time this continent remembers what I am for. It is a poor way to be remembered and I take it.",
      heros: "The best of it, if I am honest with you. Every deed I keep, somebody did during one of these.",
      liberty: "For one season nobody belongs to anybody. Then it ends and the collars come back out of the cupboard.",
      dominion: "A surge does not care whose name is on the deed. For eleven weeks people obey whoever is actually worth obeying.",
    },
  },
  g_world_us: {
    label: 'What do you make of us? People, I mean.',
    by: {
      war: "You keep standing next to each other when there is no reason to. I have never fully understood it and I have built a domain on it.",
      knowledge: "You forget almost everything and then write down the wrong part, and somehow the wrong part turns out to be the one that mattered.",
      purity: "You tolerate rot in yourselves that you would not tolerate in a well. I have stopped asking why.",
      healing: "You are very hard to kill and very easy to hurt, and you keep turning up for each other anyway. I have seen nothing better on this world.",
      death: "You grieve, which no other living thing on this world does at length, and grief is what makes people open doors they should not.",
      heros: "Magnificent. Repetitive. I mean both of those as compliments and I am aware only one lands.",
      liberty: "You are the only creature that builds a cage for its own kind. You are also the only one that opens them. I weigh the second more heavily.",
      dominion: "You take responsibility for each other badly and you take it anyway. Nine cities in Ixcuatl, every one rebuilt by somebody who should have walked away.",
    },
  },
};

export const GOD_ROOTS = ['g_domain', 'g_charge', 'g_them', 'g_world'];
export const GOD_TOPIC_KEYS = Object.keys(GOD_TOPICS);

/**
 * What this god says when the topic is opened.
 *
 * `byDisciple` outranks `by` when you wear their essence, which is the one
 * piece of state a god page has always had and never used for anything a
 * player could hear. The user's round 36 instruction made a divine essence
 * permanent and made selling one an unforgivable act; a god who spoke to a
 * bound disciple in exactly the same words as a passing stranger was telling
 * the player that permanence meant nothing.
 */
export function godSayFor(topicId, ctx = {}) {
  const t = GOD_TOPICS[topicId];
  if (!t) return '';
  const g = ctx.god;
  if (ctx.disciple && t.byDisciple && t.byDisciple[g]) return t.byDisciple[g];
  const byAct = t.byAct && t.byAct[ctx.act || 1];
  if (byAct && byAct[g]) return byAct[g];
  return (t.by && t.by[g]) || '';
}

/** Every authored line, for the suite and for measuring. */
export function godTalkLines() {
  const out = [];
  for (const [id, t] of Object.entries(GOD_TOPICS)) {
    const pools = [];
    if (t.by) pools.push(['by', t.by]);
    if (t.byDisciple) pools.push(['byDisciple', t.byDisciple]);
    for (const [a, p] of Object.entries(t.byAct || {})) pools.push([`byAct.${a}`, p]);
    for (const [name, pool] of pools) {
      for (const [god, text] of Object.entries(pool)) out.push({ id, where: name, god, text });
    }
  }
  return out;
}

// ===========================================================================
// FAULTS.
// ===========================================================================

export function godTalkFaults() {
  const out = [];

  for (const [id, t] of Object.entries(GOD_TOPICS)) {
    if (!t.label) out.push(`topic ${id} has no label`);
    if (!/[.!?]$/.test(String(t.label).trim())) out.push(`topic ${id}'s label does not end: "${t.label}"`);
    const pools = [];
    if (t.by) pools.push(['by', t.by]);
    if (t.byDisciple) pools.push(['byDisciple', t.byDisciple]);
    for (const [a, p] of Object.entries(t.byAct || {})) pools.push([`byAct.${a}`, p]);
    if (!pools.length) out.push(`topic ${id} has nothing to say`);
    for (const [name, pool] of pools) {
      // EVERY god, or the row is one that some temples answer and others
      // stand mute through -- and a mute god reads as a bug, not a character.
      for (const g of GOD_IDS) if (!pool[g]) out.push(`${id}.${name} says nothing as ${godLabel(g)}`);
      for (const g of Object.keys(pool)) if (!GOD_IDS.includes(g)) out.push(`${id}.${name} answers for ${g}, which is not a god`);
      for (const [g, text] of Object.entries(pool)) {
        if (!text || !/[.!?]$/.test(String(text).trim())) out.push(`${id}.${name}'s ${g} line does not end`);
        if (!text || String(text).length < 40) out.push(`${id}.${name}'s ${g} line is too short for a god`);
      }
      if (new Set(Object.values(pool)).size !== Object.keys(pool).length) {
        out.push(`${id}.${name} gives two gods the same line`);
      }
    }
    for (const c of (t.children || [])) {
      if (!GOD_TOPICS[c]) out.push(`topic ${id} opens onto ${c}, which does not exist`);
    }
  }

  // --- reachable, no loops, and within the option ceiling ----------------
  const seen = new Set();
  const walk = (id, chain) => {
    if (chain.includes(id)) { out.push(`topic ${id} loops: ${chain.join(' -> ')} -> ${id}`); return; }
    if (seen.has(id) || !GOD_TOPICS[id]) { seen.add(id); return; }
    seen.add(id);
    for (const c of (GOD_TOPICS[id].children || [])) walk(c, [...chain, id]);
  };
  for (const r of GOD_ROOTS) walk(r, []);
  for (const id of GOD_TOPIC_KEYS) if (!seen.has(id)) out.push(`topic ${id} cannot be reached from any root`);
  for (const r of GOD_ROOTS) if (!GOD_TOPICS[r]) out.push(`root ${r} is not a topic`);
  // 2.3's three-to-five, counting the goodbye the walker appends.
  if (GOD_ROOTS.length + 1 > 5) out.push(`a god offers ${GOD_ROOTS.length + 1} options; the rule is three to five`);

  // --- the disciple track has to be a different conversation -------------
  // `byDisciple` existing is not the point; it has to say something else. A
  // pool that shadows `by` with the same words is this project's fault class
  // 2 wearing a second key.
  for (const [id, t] of Object.entries(GOD_TOPICS)) {
    if (!t.byDisciple) continue;
    for (const g of GOD_IDS) {
      if (t.byDisciple[g] && t.by && t.byDisciple[g] === t.by[g]) {
        out.push(`${id}: ${godLabel(g)} says the same thing to a disciple as to a stranger`);
      }
      const asDisciple = godSayFor(id, { god: g, disciple: true });
      if (t.byDisciple[g] && asDisciple !== t.byDisciple[g]) out.push(`${id}: ${g}'s disciple line is never reached`);
    }
  }

  // --- the domain each god states has to be the domain they were given ---
  // The user wrote these domains in round 65 and the quest chains are built
  // from them. A god whose spoken domain has drifted from `GOD_QUESTS` is two
  // sources of truth for the same fact, which is fault class 3.
  // The first cut took the first word of the domain phrase after stripping
  // "the"/"what", which for five of the eight gods was a FUNCTION word --
  // Knowledge was being checked for "is", Purity for "has", Healing for
  // "can". Every one of those passes whatever the god says, so the guard was
  // reporting green on five temples it was not inspecting. Round 210's lesson
  // arriving on schedule in a new file: the check has to hold the content
  // words, not whichever word happens to be first.
  const DOMAIN_STOP = new Set(['the', 'what', 'that', 'this', 'been', 'have', 'with', 'from', 'they', 'then', 'than', 'will']);
  for (const g of GOD_IDS) {
    const q = GOD_QUESTS[g];
    if (!q) { out.push(`${g} has no quest chain to agree with`); continue; }
    const said = (GOD_TOPICS.g_domain.by[g] || '').toLowerCase();
    const keys = q.domain.toLowerCase().match(/[a-z]{4,}/g) || [];
    const content = keys.filter(w => !DOMAIN_STOP.has(w));
    if (!content.length) { out.push(`${g}'s domain "${q.domain}" has no word worth checking`); continue; }
    for (const key of content) {
      if (!said.includes(key)) {
        out.push(`${godLabel(g)} states a domain that does not contain "${key}" from GOD_QUESTS`);
      }
    }
  }

  // --- round 210's ceiling, on this file's writing too --------------------
  const lines = godTalkLines();
  const per = {};
  let tripped = 0;
  for (const { where, god, text } of lines) {
    let hit = false;
    for (const [name, fn] of Object.entries(TELLS)) {
      if (!fn(text)) continue;
      hit = true;
      per[name] = (per[name] || 0) + 1;
      if (name === 'a testament to' || name === "the 'but it was enough' coda") {
        out.push(`${where}'s ${god} line uses "${name}"`);
      }
    }
    if (hit) tripped++;
  }
  if (lines.length && tripped / lines.length > 0.10) {
    out.push(`${tripped} of ${lines.length} god lines (${Math.round(100 * tripped / lines.length)}%) trip an AI tell; the ceiling is 10%`);
  }
  for (const [name, n] of Object.entries(per)) {
    if (lines.length && n / lines.length > 0.05) {
      out.push(`"${name}" is used in ${n} of ${lines.length} god lines; no single tell may exceed 5%`);
    }
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
    for (const row of godTalkLines()) {
      const sp = row.god;
      const key = String(row.text).toLowerCase().replace(/[^a-z' ]/g, ' ')
        .split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
      if (key.length < 8) continue;
      const prev = opens.get(key);
      if (prev && prev !== sp) out.push(`${prev} and ${sp} both open a line with "${key}..."`);
      else if (!prev) opens.set(key, sp);
    }
  }
  // --- and no two gods are the same god ----------------------------------
  const byText = new Map();
  for (const { id, where, god, text } of lines) {
    const prev = byText.get(text);
    if (prev) out.push(`${id}.${where}/${god} repeats ${prev}`);
    else byText.set(text, `${id}.${where}/${god}`);
  }

  return out;
}
