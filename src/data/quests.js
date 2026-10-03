// Bounty/quest board, ported from sparkstone_prototype.html lines ~5112-5223
// (ensureBountyBoardPopulated/rollNewBountyOffer/spawnBountyMonster/
// acceptBounty/turnInBounty/payoutBounty). Formulas below are verbatim;
// BOUNTY_BOARD_SIZE is trimmed from 8 to 5 purely for this port's smaller UI
// (documented, not a hidden change), and quest wilderness-spawn points are
// picked within this test map's small bounds instead of the original's
// CITY_RADIUS-relative outskirts band (that concept doesn't exist on this
// small test map).

import { MONSTER_TYPES, FAMILY_DISPLAY_NAME } from './monsters.js';
import { COIN_CONVERSION } from './inventory.js';

// ROUND 73 -- THE FLOOR UNDER EVERY BOUNTY.
//
// The user: "Coins for bounties should never be less than 5 iron rank coins."
//
// The purse is ranked and 1 rank = 100 of the one below (COIN_CONVERSION), so
// five iron is 500 normal coins, and that is the unit everything here already
// counts in -- `grantCoins(purse, 'normal', n)` normalises upward, so paying
// 500 normal PUTS five iron in the purse. Derived from COIN_CONVERSION rather
// than typed as 500, because the ladder is the thing that defines it.
//
// Measured before: the smallest posting a board could actually print was a
// tier-0 survey on a slime -- round(8 xp * 2.4 * 1.6 * 0.85) = 26, times the
// survey's 0.55 kind multiplier = 14 normal coins. Fourteen. An NPC request
// took another 20% off that. The clamps in the two functions below said 8 and
// 10, which is what a floor looks like when it was never revisited.
export const BOUNTY_MIN_IRON = 5;
export const BOUNTY_MIN_COINS = BOUNTY_MIN_IRON * COIN_CONVERSION;

// Applied at EVERY site that can produce or modify a bounty payout, not just
// at the one that computes it. `questPayout` is not the last word: an NPC
// request scales the reward by 0.8 afterwards and a god chapter scales it up,
// and a floor the modifiers run after is not a floor. This is also what the
// board DISPLAYS, so the posted number and the paid number are the same number
// by construction rather than by two functions agreeing.
export function applyBountyFloor(coins) {
  return Math.max(BOUNTY_MIN_COINS, Math.round(coins || 0));
}

export const BOUNTY_BOARD_SIZE = 5; // was 8 in the original -- see header note
export const BOUNTY_MAX_ACTIVE = 12; // verbatim
export const BOUNTY_RANK_WEIGHTS = [0.55, 0.28, 0.13, 0.04]; // verbatim -- tier 0..3 odds

export function rollBountyRankTier(rand) {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < BOUNTY_RANK_WEIGHTS.length; i++) {
    acc += BOUNTY_RANK_WEIGHTS[i];
    if (r < acc) return i;
  }
  return BOUNTY_RANK_WEIGHTS.length - 1;
}

// NEW round 3: this is the single choke point for ALL player-facing monster
// name text (quest board offers, active-quest list, bestiary card names/alt
// text -- confirmed by grep before this change). It used to be a pure
// camelCase-splitter ("wolfGrey" -> "Wolf Grey"), which is exactly the
// literal-animal-name text the user asked to get rid of ("All monsters
// should be renamed to reference the creature they originally were named
// after but not be named that exactly. The wolf in particular should be
// renamed panterimp."). Now it resolves the monster's family through
// MONSTER_TYPES and looks up the family's invented display name in
// FAMILY_DISPLAY_NAME (monsters.js), so "wolfGrey" renders as "Panterimp
// Grey" everywhere in the UI while the internal key stays untouched. The
// color field name varies per family (wolfColor, hydraColor, ...) but is
// always `${family}Color`, so it's read generically rather than needing a
// per-family branch.
export function monsterLabelFor(key) {
  const type = MONSTER_TYPES[key];
  if (!type) {
    // Defensive fallback for any key with no MONSTER_TYPES entry (e.g. a
    // non-monster caller) -- old behavior, kept so this never throws.
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
  }
  // ROUND 76 (item 7) -- a type may name ITSELF. The young rungs added for
  // tier 0 and tier 1 (monsters.js YOUNG_RUNGS) are crocodiles, lions and
  // Paleharts at a fraction of the adult's numbers, and a hatchling that read
  // "Pallidjaw" on the board beside the adult it shares a name with would be
  // the notice lying about what it is sending you at.
  if (type.label) return type.label;
  const family = FAMILY_DISPLAY_NAME[type.family] || type.family;
  const color = type[`${type.family}Color`];
  if (!color) return family; // single-design families (e.g. hellhound) have no color axis
  const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
  return `${family} ${colorLabel}`;
}

// --- ROUND 48: named bounties -------------------------------------------
// The user's ask, verbatim: "Bounties should get randomized names based on
// the type of creature and some scary sounding adjectives."
//
// Before this, a notice on the board read "Panterimp Grey (rank 2)" -- which
// is a species and a number, not a wanted poster. A bounty board in a world
// with bounty boards names the thing: someone came back from the Fens and
// said a word for what was out there, and the word stuck.
//
// THREE CONSTRAINTS shaped the design.
//
// 1. DETERMINISM. The quest board re-renders on every accept, turn-in and
//    open, and _renderQuestBoard rebuilds every row from scratch each time.
//    A name pulled from Math.random() would reshuffle under the player's
//    cursor mid-click. So the name is a pure function of the bounty's own
//    uid plus its family: same bounty, same name, forever, with no state to
//    keep and nothing to invalidate.
//
// 2. THE TYPE STAYS LEGIBLE. A player reading "The Gutspill Ravager" has to
//    still know what they signed up to fight. Two defences: several of the
//    patterns below name the family outright ("Blackmaw the Panterimp"), and
//    the board row keeps the plain monsterLabel visible alongside the name
//    regardless of which pattern came up (see _renderQuestBoard).
//
// 3. NO FORTY HAND-AUTHORED LISTS. One shared bank of scary vocabulary does
//    most of the work; each family only contributes a small FLAVOUR bank of
//    nouns and titles, and families that share a body plan share one bank --
//    six groups cover nineteen families. So undead get grave words and
//    beasts get claw/fang words without nineteen separate word lists to keep
//    in sync when a family is added.

// Shared scary bank. These are the first half of a compound name; the second
// half comes from the family's own flavour, which is what makes "Gutspill"
// (an ooze) and "Gutmaw" (a beast) out of the same prefix.
const SCARY_PREFIX = [
  'Gut', 'Black', 'Gore', 'Grim', 'Dread', 'Rot', 'Bone', 'Ash', 'Blight',
  'Murk', 'Scar', 'Hollow', 'Vile', 'Rust', 'Mire', 'Pale', 'Sallow',
  'Wretch', 'Char', 'Bile', 'Wound', 'Slaughter', 'Night', 'Cull',
];

// Shared epithets -- what it DOES, which is the part every family can share
// because being eaten by a webstalker and being eaten by a direjaw are the
// same experience from the victim's side.
const SCARY_TITLE = [
  'Ravager', 'Devourer', 'Butcher', 'Render', 'Reaver', 'Harrower',
  'Flenser', 'Marauder', 'Despoiler', 'Scourge', 'Tyrant', 'Widowmaker',
  'Bloodletter', 'Terror',
];

// Where it was last seen. Deliberately place-ish and unclaimed -- none of
// these name a real region in regions.js, because a bounty's spawn point is
// rolled in a ring around the player's own city and a name that promised
// "of Ontaria" would be a lie about half the time.
const SCARY_PLACE = [
  'the Fens', 'the Ashlands', 'the Deepmire', 'the Hollow Road',
  'the Barrow Fields', 'Cinder Reach', 'the Weeping Wood', 'the Broken Wall',
  'the Old Quarry', 'the Salt Flats', 'the Gallows Oak', 'the Sunken Steps',
  'the Black Tarn', 'the Rotwood',
];

// Six flavour groups, one per body plan. `nouns` finish the compound;
// `titles` join the shared epithet pool for that family only.
const FLAVOR = {
  ooze:    { nouns: ['spill', 'sludge', 'ichor', 'gorge', 'seep', 'brine'],
             titles: ['Gorger', 'Dissolver', 'Engulfer', 'Drowner'] },
  crawler: { nouns: ['fang', 'spinner', 'thorax', 'wing', 'chitin', 'husk'],
             titles: ['Skitterer', 'Weaver', 'Nestlord', 'Swarmwake'] },
  undead:  { nouns: ['grave', 'shroud', 'knell', 'tomb', 'pall', 'cairn'],
             titles: ['Revenant', 'Mourner', 'Gravewalker', 'Deathless'] },
  saurian: { nouns: ['tooth', 'ridge', 'tail', 'scale', 'gullet', 'spine'],
             titles: ['Trampler', 'Snapper', 'Bonecrusher', 'Sovereign'] },
  beast:   { nouns: ['maw', 'claw', 'hackle', 'pelt', 'jaw', 'throat'],
             titles: ['Stalker', 'Throatripper', 'Packbreaker', 'Houndmaster'] },
  ember:   { nouns: ['cinder', 'ember', 'forge', 'kiln', 'coal', 'smoulder'],
             titles: ['Immolator', 'Scorcher', 'Blazewrought', 'Furnace'] },
};

// family -> flavour group. Anything unlisted (a family added later, or a
// non-monster caller) falls through to 'beast', which is the most neutral
// bank: claw/fang words fit almost anything with a mouth.
const FAMILY_FLAVOR = {
  slime: 'ooze', slimeGolem: 'ooze',
  spider: 'crawler', bat: 'crawler', lizard: 'crawler',
  skeleton: 'undead', shade: 'undead', demon: 'undead',
  raptor: 'saurian', trex: 'saurian', spinosaurus: 'saurian', hydra: 'saurian',
  wolf: 'beast', boar: 'beast', saberCanis: 'beast', chimera: 'beast',
  hellhound: 'ember', elemental: 'ember', dragon: 'ember',
};

// FNV-1a over the seed string, then an xorshift stream off it. Two separate
// steps on purpose: hashing the seed once and then taking `h % list.length`
// for every slot would correlate the slots (banks whose lengths share a
// factor would move together, so the same prefix would keep arriving with
// the same title). Advancing the state between picks decorrelates them.
function _seedHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h || 0x9e3779b9; // never hand the stream a zero state
}
function _picker(seed) {
  let s = _seedHash(seed);
  return (list) => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return list[s % list.length];
  };
}

/** A bounty's proper name. `uid` is the bounty's own id (or any stable
 *  per-bounty token) and `monsterKey` its quarry; the pair is the whole
 *  seed, so the same posting always reads the same way and two postings of
 *  the same species read differently.
 *
 *  Rank leans on the vocabulary rather than replacing it: the two grandest
 *  patterns (a full "Compound, Title of Place" and a bare "The Title of
 *  Place") only unlock at rank 3 and up, so an Iron-rank notice sounds like
 *  local trouble and a high one sounds like a legend. */
export function bountyNameFor(uid, monsterKey, rankTier = 0) {
  const type = MONSTER_TYPES[monsterKey];
  const family = type ? type.family : String(monsterKey || '');
  const display = FAMILY_DISPLAY_NAME[family] || monsterLabelFor(monsterKey);
  const flavor = FLAVOR[FAMILY_FLAVOR[family] || 'beast'];
  const pick = _picker(`${uid}:${family}`);

  const compound = pick(SCARY_PREFIX) + pick(flavor.nouns);
  const title = pick(pick([SCARY_TITLE, flavor.titles]));
  const place = pick(SCARY_PLACE);

  // Patterns 0-3 are always available; 4-5 are the grand ones. Note that 1
  // and 3 carry the family name themselves -- roughly half of all postings
  // therefore say what the creature is inside the name, and the board row
  // says it for the other half.
  const patterns = [
    () => `The ${compound} ${title}`,
    () => `${compound} the ${display}`,
    () => `${compound} the ${title}`,
    () => `${compound}, ${display} of ${place}`,
    () => `${compound}, ${title} of ${place}`,
    () => `The ${title} of ${place}`,
  ];
  const pool = rankTier >= 2 ? patterns : patterns.slice(0, 4);
  return pick(pool)();
}

// Verbatim: hp scales by 1+(rankTier+1)*0.55, dmg by 1+(rankTier+1)*0.35, xp
// by the same multiplier as hp.
export function bountyHpMult(rankTier) { return 1 + (rankTier + 1) * 0.55; }
export function bountyDmgMult(rankTier) { return 1 + (rankTier + 1) * 0.35; }

// NEW this round (critical hits): "at higher ranks things can be more
// dangerous across the board" -- applied as additive bonuses on top of a
// bounty target's already-speed-derived base critChance/critMult (see
// monsters.js's deriveCombatStats), so a rank-4 tagged bounty isn't just
// bigger HP/dmg numbers, it's also a noticeably scarier, crit-happier
// version of the same monster. "Across the board" is read as both crit
// stats together (chance AND damage), not just one.
export function bountyCritChanceBonus(rankTier) { return (rankTier + 1) * 0.03; }
export function bountyCritDamageBonus(rankTier) { return (rankTier + 1) * 0.1; }

// Verbatim payout formula (payoutBounty, line ~5197-5209): coin amount, plus
// two mutually-exclusive chance rolls off a single worldRand() (12% modifier
// stone, 10% essence shard -- simplified in this port to a generic "bonus
// loot" flag since neither inventory system exists yet, see monsters.js's
// loot-drop note for the same simplification pattern).
export function payoutBountyCoins(monsterXp, rankTier, rand) {
  const rankMult = 1 + (rankTier + 1) * 0.6;
  return Math.max(8, Math.round((monsterXp || 20) * 2.4 * rankMult * (0.85 + rand() * 0.3)));
}
export function rollBountyBonus(rand) {
  const roll = rand();
  if (roll < 0.12) return 'stone';
  if (roll < 0.22) return 'essence';
  return null;
}

// ============================================================================
// ROUND 64 -- MORE THAN "KILL THIS THING", AND A BOARD THAT TURNS OVER WEEKLY.
//
// The user: "we need to start generating significantly more quests. The bounty
// board should move from 'kill this monster' to more variations and should
// reset on a weekly basis as opposed to daily. Quests can lead to some of the
// locations that I discuss generating above..." And: "In addition to the main
// bounty board in the main city in each region the little scattered communities
// in each region should have a bounty board with 5 items, as well as a few NPC
// requests for questions, items, or support."
//
// -------------------------------------------------------------------------
// A BOARD IS A SEED, NOT A LIST
// -------------------------------------------------------------------------
// Every board's postings are derived from `${boardKey}|${weekIndex}`. That is
// what makes the weekly reset trivial and, more importantly, what makes it
// HONEST: the same board shows the same six notices to the player all week, in
// the same order, whether they walk away and come back, save and reload, or
// leave the panel open through midnight. Nothing has to be stored for that to
// be true, so nothing can drift.
//
// What IS stored is the small mutable part: which postings have been taken.
// This is the same rule saves.js states for the whole game -- save the inputs,
// rebuild the derived -- and it is why a save file carries a handful of ids
// rather than a copy of every board in the world.
//
// -------------------------------------------------------------------------
// WHY THESE SIX KINDS
// -------------------------------------------------------------------------
// Each one is a thing the world can already answer truthfully, and each has a
// different shape of play:
//
//   hunt   -- the round-3 named bounty, unchanged. One creature, spawned for
//             you, somewhere out past the wall.
//   cull   -- volume. Kill N of a family anywhere; progresses off ordinary
//             play rather than sending you to a marker.
//   survey -- go and look at a named landmark. This is the "quests can lead to
//             some of the locations" ask, in its most direct form.
//   delve  -- clear what lives inside a named cave. The round-64 dens made
//             this answerable.
//   gather -- bring back N of a monster part. A reason to fight a species you
//             would otherwise walk past.
//   relic  -- bring back a specific awakening stone. Slow, and deliberately so:
//             it is the one posting a player may carry for a whole week.
//
// Wording throughout follows the standing rule: the TITLE carries the flavour,
// the DESCRIPTION states the mechanic plainly, including the numbers.
// ============================================================================

/** Seven in-game days. `_dayIndex` ticks at midnight; a week is seven of them. */
export const QUEST_WEEK_DAYS = 7;
export function weekIndexOf(dayIndex) { return Math.floor((dayIndex || 0) / QUEST_WEEK_DAYS); }

/** "the little scattered communities ... should have a bounty board with 5
 *  items" -- stated outright, so it is a constant and not a band. */
export const VILLAGE_BOARD_SIZE = 5;
/** A region's main board carries more, and breathes between these two. */
export const CAPITAL_BOARD_MIN = 6, CAPITAL_BOARD_MAX = 10;

/**
 * How often each kind is posted.
 *
 * `hunt` stays the largest single share because it is the kind with a monster
 * spawned and waiting, and a board of nothing but fetch-and-carry would be a
 * worse board than the one this replaces. But it is now a minority of the
 * postings rather than all of them, which is the whole ask.
 */
export const QUEST_KIND_WEIGHT = {
  hunt: 26, cull: 22, survey: 16, delve: 14, gather: 12, relic: 10,
};
export const QUEST_KINDS = Object.keys(QUEST_KIND_WEIGHT);

export function rollQuestKind(rand, allow = null) {
  const kinds = allow ? QUEST_KINDS.filter(k => allow.includes(k)) : QUEST_KINDS;
  if (!kinds.length) return 'hunt';
  const total = kinds.reduce((a, k) => a + QUEST_KIND_WEIGHT[k], 0);
  let r = rand() * total;
  for (const k of kinds) { r -= QUEST_KIND_WEIGHT[k]; if (r <= 0) return k; }
  return kinds[kinds.length - 1];
}

// --- titles ----------------------------------------------------------------
// Two banks per kind, combined as "<A> <B>", which gives each kind a few
// hundred distinct headlines off two short lists. The banks are per-kind
// rather than shared because a cull and a relic hunt should not be able to
// come out with the same name -- a board of six notices is small enough that
// a collision would be noticed immediately.
const TITLE_BANK = {
  cull: {
    a: ['Thin', 'Break', 'Quiet', 'Scatter', 'Cut Back', 'Drive Off', 'Answer', 'Settle'],
    b: ['the Pack', 'the Nest', 'the Overgrowth', 'the Nuisance', 'the Nightly Trouble',
      'What Comes Down the Road', 'the Far Field', 'the Complaint'],
  },
  survey: {
    // Every A must read against every B -- there are only sixty-four of these
    // and the player sees six at a time, so a combination that comes out
    // ungrammatical ("Nobody Goes the Standing Thing", from the first draft)
    // will be on a board within the first week. So each A ends in a
    // preposition or a verb that takes a noun phrase, and every B is one.
    a: ['Nobody Goes To', 'A Look At', 'Word From', 'Someone Should See',
      'The Long Walk To', 'Report On', 'Eyes On', 'Ask After'],
    b: ['That Place', 'the Old Ground', 'the Far Side', 'What Is Out There',
      'the Marked Spot', 'the Quiet End', 'the Standing Thing', 'the Wrong Field'],
  },
  delve: {
    a: ['Something Lives In', 'Empty', 'The Trouble With', 'Nobody Came Back From',
      'Go Down Into', 'Clear', 'The Noise From', 'What Waits In'],
    b: ['the Dark', 'the Deep', 'the Hole', 'the Old Place', 'the Cut',
      'the Under Room', 'the Hollow Ground', 'the Shut Room'],
  },
  gather: {
    a: ['The Tanner Wants', 'An Order For', 'Paid By Weight:', 'Wanted:',
      'The Fletcher Needs', 'Standing Order:', 'Bring In', 'The Apothecary Asks For'],
    b: ['a Quantity', 'What Can Be Carried', 'the Usual', 'a Full Crate',
      'a Sack Of Them', 'Whatever You Have', 'the Whole Order', 'a Fair Few'],
  },
  relic: {
    a: ['A Stone For', 'Commissioned For', 'One Piece For', 'Held Aside For',
      'An Order For', 'Promised For', 'Wanted For', 'A Find For'],
    b: ['the Cabinet', 'a Private Hand', 'the Vault Shelf', 'the Upper Room',
      'the Locked Case', 'an Old Debt', 'a Quiet Collector', 'the Archive'],
  },
};

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic from the posting's own id, so a title survives every redraw,
 *  accept, save and reload without being stored anywhere. */
export function questTitleFor(kind, uid) {
  const bank = TITLE_BANK[kind];
  if (!bank) return 'Notice';
  const h = hash32(`${kind}|${uid}`);
  // >>> , NOT >>. hash32 returns an unsigned 32-bit value, and `h >> 8` is a
  // SIGNED shift: for the half of all hashes at or above 2^31 it yields a
  // negative number, `negative % 8` is negative in JavaScript, and the lookup
  // returned undefined. It showed as board notices reading "Bring In
  // undefined" -- and as 72 distinct titles from a bank that can only produce
  // 64, which is what made it obvious that the extra eight were the broken ones.
  return `${bank.a[h % bank.a.length]} ${bank.b[(h >>> 8) % bank.b.length]}`;
}

/**
 * How many of a thing a posting asks for.
 *
 * Kept small on purpose. The point of these is that they can be finished in an
 * evening's play alongside whatever else the player is doing -- a board that
 * asks for thirty pelts is a board the player stops reading.
 */
export function questNeedFor(kind, tier, rand) {
  const t = Math.max(0, Math.min(3, tier || 0));
  if (kind === 'cull') return 5 + t * 2 + Math.floor(rand() * 3);
  if (kind === 'gather') return 3 + t + Math.floor(rand() * 3);
  return 1;
}

/**
 * The purse.
 *
 * Scaled off the existing bounty payout so one board's notices are worth
 * roughly what another's are: a cull of eight wolves should pay about what one
 * named wolf pays, or nobody takes the cull. The per-kind multipliers price
 * effort, not danger -- a relic is the slowest posting on the board and pays
 * most, a survey is a walk and pays least.
 */
export const QUEST_KIND_PAY = { hunt: 1, cull: 1.15, survey: 0.55, delve: 1.4, gather: 0.9, relic: 1.8 };

export function questPayout(kind, tier, need, monsterXp, rand) {
  const base = payoutBountyCoins(monsterXp, tier, rand);
  const per = kind === 'cull' || kind === 'gather' ? 0.28 * need : 1;
  return applyBountyFloor(base * (QUEST_KIND_PAY[kind] || 1) * per);
}

// ============================================================================
// ROUND 64 -- THE PEOPLE STANDING BY THE BOARD.
//
// "...as well as a few NPC requests for questions, items, or support."
//
// Three words, three kinds, and they map cleanly onto three of the six the
// boards already post:
//
//   a QUESTION -> survey. Somebody wants to know what is out at a place.
//   an ITEM    -> gather. Somebody needs a quantity of something.
//   SUPPORT    -> cull. Somebody wants a nuisance dealt with.
//
// So an NPC request is a board posting with a face on it, not a second quest
// system. What differs is the framing: a request is asked in the first person,
// is smaller than a board notice, and belongs to that one villager for the week.
// ============================================================================

// ROUND 158 (item 1.5.4) -- "...or be tied to quests from individuals."
//
// `delve` joins the three. It is the one kind on the board that names a PLACE
// the asker could plausibly care about, which is exactly what makes it a
// villager's request rather than a posting: the thing in the drain under this
// town is that town's problem, and somebody standing in it is who would say so.
//
// It also reaches the dens, which is right for the same reason and was simply
// never available -- the list has held the same three since round 64, and a
// villager could not ask anyone to go into anywhere.
export const NPC_REQUEST_KINDS = ['survey', 'gather', 'cull', 'delve'];

/** Roughly a third of villagers are asking for something in any given week --
 *  "a few", and few enough that finding one is worth the conversation. */
export const NPC_REQUEST_CHANCE = 0.34;

const VILLAGER_FIRST = ['Maud', 'Corrin', 'Ilsa', 'Bel', 'Tam', 'Ovry', 'Nesh', 'Hale',
  'Perrin', 'Sable', 'Wick', 'Dunn', 'Fen', 'Ivo', 'Marda', 'Ruell', 'Anse', 'Kell'];
const VILLAGER_LAST = ['Barrow', 'Ashby', 'Fenn', 'Quill', 'Marsh', 'Coombe', 'Thack',
  'Ryde', 'Weld', 'Poll', 'Grange', 'Hax', 'Loam', 'Verrick', 'Stray', 'Dunmore'];

export function villagerNameFor(seed) {
  const h = hash32(`villager|${seed}`);
  return `${VILLAGER_FIRST[h % VILLAGER_FIRST.length]} ${VILLAGER_LAST[(h >>> 9) % VILLAGER_LAST.length]}`;
}

/** Does this villager have something to ask this week? Seeded on the pair, so
 *  the answer is the same all week and different next week. */
export function villagerHasRequest(name, week) {
  return (hash32(`ask|${name}|${week}`) % 1000) / 1000 < NPC_REQUEST_CHANCE;
}

export function npcRequestKind(name, week) {
  return NPC_REQUEST_KINDS[hash32(`kind|${name}|${week}`) % NPC_REQUEST_KINDS.length];
}

/** How a villager puts it. The ASK is in their voice; the posting's own `desc`
 *  still states the mechanic underneath it, so the player is never left
 *  guessing what they agreed to. */
const REQUEST_OPENER = {
  survey: [
    "Nobody's been out that way in a season and I've started imagining things.",
    "My brother swears he saw lights out there. I'd like to be told he's a liar.",
    "There's a place on the old map nobody will walk to. Would you look at it for me?",
  ],
  gather: [
    "I'm short on stock and the season's turning. Could you bring me some?",
    "I'll pay honest coin for the material, if you've the stomach to collect it.",
    "My trade's stopped for want of one thing, and it isn't a thing you buy.",
  ],
  cull: [
    "They come down off the ridge at night and we've nothing to meet them with.",
    "We've lost two head this month. Somebody has to answer for it.",
    "It isn't fear, it's arithmetic -- there are more of them than us now.",
  ],
};

export function npcRequestOpener(name, week, kind) {
  const bank = REQUEST_OPENER[kind] || REQUEST_OPENER.cull;
  return bank[hash32(`open|${name}|${week}`) % bank.length];
}
