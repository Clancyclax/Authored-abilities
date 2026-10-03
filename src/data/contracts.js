// ============================================================================
// ROUND 94 -- THE ADVENTURE SOCIETY BOARD.
//
// THE USER'S DESIGN, verbatim, because every rule below is one of its clauses:
//
//   "1.1) It needs updated to 'adventure society board' and bounties need
//    renamed to contracts.
//    1.2) It should list 25 contracts requiring 1 star, 2 stars or 3 stars and
//    specifying the rank of the contract (I.e. iron rank, bronze etc)
//    1.3) You can see but can't accept 'contracts' that are above your star,
//    but you can accept contracts 1 step above your rank with a team.
//    1.4) Contracts need broken into 3 tiers.
//    1.4.1) 1 star contracts are simple kill this monster plaguing our town,
//    or defend an individual while they harvest some nodes on the map. (Bonus
//    for if the NPC doesn't take any damage, or if the party has to face
//    another threat while fighting the contracted monster.
//    1.4.2) 2 star contracts require a little investigation... (Bonuses for
//    speed and clearing the quest quickly)
//    1.4.3) 3 star contracts are political... (Bonus is about exercising good
//    judgement)
//    1.5) Bonus rewards can be epic gear, an awakening stone, an essence, or
//    discounts at the adventurer society on the next few purchases."
//
// -------------------------------------------------------------------------
// WHY THIS FILE EXISTS AND quests.js DOES NOT ABSORB IT
// -------------------------------------------------------------------------
// quests.js knows how to POST a notice: six objective kinds, a weekly seed, a
// payout ladder. It has no opinion about who is allowed to take one, because
// until now nobody was refused. What this round adds is a gate -- two of them,
// crossing -- and a gate is a different kind of thing from a generator. Keeping
// it here means `canAcceptContract` is one function with one table behind it
// rather than four `if` branches grown into the board's render loop, which is
// how the old `taken` flag ended up checked in three places.
//
// -------------------------------------------------------------------------
// THE TWO GATES, AND WHY THEY ARE DIFFERENT SHAPES
// -------------------------------------------------------------------------
// The STAR gate is absolute. Stars are the Society's own grading of you and
// nobody lends you theirs; a two-star contract in a one-star adventurer's hands
// is the Society failing at the only thing it does. So: seen, never taken.
//
// The RANK gate is one step soft, and the softener is a team. That is the
// user's rule and it is the right one for this setting -- ranking up is slow
// and being carried by better company is how everybody's first bronze fight
// actually happens. Two steps up is still refused, because at that distance the
// team is not helping you, it is doing it.
//
// Both gates SHOW the row. A contract you cannot take yet is the clearest
// statement the board can make about what you are working toward, and hiding it
// would make the board shrink as the player got worse at meeting it.
//
// -------------------------------------------------------------------------
// A CONTRACT'S RANK IS ITS TIER'S RANK, AND THE STAR RAISES BOTH TOGETHER
// -------------------------------------------------------------------------
// The tempting version -- roll a rank label for flavour and leave the quarry
// where the region put it -- is a lie about difficulty, and the board would be
// caught in it the first time somebody took a "silver rank" contract and killed
// it in four swings. So the star raises the CONTRACT'S TIER, and the rank label
// is read off the tier it actually got. A three-star posting in a tier-1 region
// is a tier-3 posting: the quarry is scaled by the same bountyHpMult the rest
// of the game already applies to a tagged target, and the word "silver" over it
// is true.
// ============================================================================

import { RANK_ORDER } from './ranks.js';
// The purse's own ladder, for the pay band below. inventory.js imports nothing
// but ranks.js, so this cannot close a cycle -- quests.js takes COIN_CONVERSION
// from here for the same reason.
import { COIN_CONVERSION, COIN_RANKS } from './inventory.js';

/** "It should list 25 contracts". Stated, so it is a constant and not a band.
 *  Every Society board carries the same 25 -- see the note in _rollBoard about
 *  why a hamlet's board is the same size as the capital's now. */
export const CONTRACT_BOARD_SIZE = 25;

/**
 * Threat tier -> the rank the Society grades that work at.
 *
 * Five rungs and no sixth. Diamond is absent here for the same reason it is
 * absent from SOCIETY_RANKS: there is no diamond-rank content in this build and
 * there is not going to be. `contractFaults` asserts it.
 */
export const CONTRACT_RANK_BY_TIER = ['normal', 'iron', 'bronze', 'silver', 'gold'];
export const CONTRACT_MAX_TIER = CONTRACT_RANK_BY_TIER.length - 1;

export function contractRankForTier(tier) {
  return CONTRACT_RANK_BY_TIER[Math.max(0, Math.min(CONTRACT_MAX_TIER, tier | 0))];
}

/** The tier a posting ends up at: the region's own band, raised one rung per
 *  star above the first. This is the single place the star turns into
 *  difficulty, so the label and the quarry cannot disagree. */
export function contractTierFor(regionTier, star) {
  return Math.max(0, Math.min(CONTRACT_MAX_TIER, (regionTier | 0) + Math.max(0, (star || 1) - 1)));
}

/** "iron rank", for a board row. The rank is stated plainly rather than drawn
 *  as pips, because a player deciding whether to walk out of town needs the
 *  word, and the star is what the pips are for. */
export function contractRankLabel(rank) {
  const r = String(rank || 'normal');
  return `${r.charAt(0).toUpperCase()}${r.slice(1)} rank`;
}

export function starPips(star) {
  const n = Math.max(1, Math.min(3, star || 1));
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

/**
 * How the 25 break down.
 *
 * Weighted hard toward one star, because one star is the tier the player is on
 * for most of a rank and a board that is mostly work they cannot take is a
 * board that reads as a wall. Twelve / eight / five, and the numbers are here
 * rather than as weights so `contractFaults` can assert they sum to the board.
 */
export const CONTRACT_STAR_MIX = { 1: 12, 2: 8, 3: 5 };

/** The stars a board posts, in a fixed multiset. The ORDER is shuffled by the
 *  board's own seed in _rollBoard; the composition is not, so every board in
 *  the world carries the same spread of work. */
export function contractStarPlan() {
  const out = [];
  for (const star of [1, 2, 3]) for (let i = 0; i < CONTRACT_STAR_MIX[star]; i++) out.push(star);
  return out;
}

/**
 * THE THREE TIERS, as the kinds each one is allowed to post.
 *
 * ROUND 94 SHIPS THE FIRST TIER COMPLETE and lists the other two off the kinds
 * the quest system already builds. That is the user's own scope ruling ("The
 * board and the 1 star tier, complete"), and it is written down here rather
 * than in a note because the table is what a later round edits: round 95
 * replaces `2`, round 96 replaces `3`, and nothing else has to move.
 *
 *   1 star -- "simple kill this monster plaguing our town, or defend an
 *             individual while they harvest some nodes on the map". Two kinds,
 *             both new this round, and both with a bonus condition the player
 *             can actually play toward.
 *   2 stars -- investigation, dens, escorted shipments. Posted for now as the
 *             existing delve/hunt/gather work at a raised tier.
 *   3 stars -- political. Posted for now as delve/relic; the statements-and-
 *             verdict machinery is round 96's.
 */
export const CONTRACT_KINDS_BY_STAR = {
  1: ['plague', 'defend'],
  // ROUND 95 -- the second tier's three authored shapes, plus the legacy kinds
  // that keep round 64's six reachable. See CONTRACT_KINDS_2 for what the three
  // are and why they are these three.
  // ROUND 142 -- `siege` and `raid` join the second star. They belong here and
  // not at the first for the reason this file already gives for what the tiers
  // mean: a first-star contract "happens at a point on the map" and is over in
  // one fight, and neither of these is. They are also not journeys in the way
  // den/supply/escort are -- they are a STAND, which is the third shape this
  // tier has room for. See CONTRACT_HOLD_KINDS.
  2: ['den', 'supply', 'escort', 'siege', 'raid', 'delve', 'gather', 'cull', 'survey', 'hunt'],
  // ROUND 96 -- the third star is `case` work, plus the legacy kinds that keep
  // round 64's six reachable. See CONTRACT_KINDS_3.
  3: ['case', 'delve', 'relic', 'hunt'],
};

/**
 * ROUND 95 -- THE SECOND TIER, AUTHORED.
 *
 * The user: "2 star contracts require a little investigation, maybe finding
 * where a monsters den is, perhaps gathering certain resources for an
 * individual, guarding a shipment from bandits instead of monsters. (Bonuses
 * for speed and clearing the quest quickly)"
 *
 * Three clauses, three kinds, and each is a different verb:
 *
 *   den    -- "finding where a monster's den is". The contract does NOT tell
 *             you where. It tells you where something was KILLED, and there is
 *             a trail from there. You follow it on the ground; the den goes on
 *             the map when you reach the end of it, and not before.
 *   supply -- "gathering certain resources for an individual". Not the board's
 *             `gather`: a named person wants TWO different things, which is an
 *             order rather than an errand, and they are the one you bring it to.
 *   escort -- "guarding a shipment from bandits instead of monsters". A cart
 *             that actually travels, and people rather than wildlife coming for
 *             it. bandits.js is the roster; this is what it is for.
 *
 * WHAT MAKES THIS TIER DIFFERENT FROM THE FIRST is that none of the three is
 * finished by standing in one place. The first star's two contracts both happen
 * at a point on the map; all three of these are journeys, which is what "the
 * Society stops telling you how" is supposed to feel like.
 */
export const CONTRACT_KINDS_2 = ['den', 'supply', 'escort'];

/**
 * ROUND 96 -- THE THIRD STAR, AUTHORED.
 *
 * The user: "3 star contracts are political. Decisions need to be made,
 * investigation and discussion with NPCs. Revealing hidden cults, real estate
 * scams, false nobility, forgeries, counterfeiting, hunting down rogue
 * adventurers. (Bonus is about exercising good judgement)"
 *
 * ONE KIND, not six. All six of the things they list are the same VERB -- go
 * and talk to people who disagree, then say what you think happened -- and the
 * six differences between them are content, not mechanism. So `case` is the
 * kind and cases.js holds the six, which is also what lets a seventh be added
 * without a line changing here.
 *
 * The tier's whole distinction, in one sentence: the first star is a place, the
 * second star is a journey, and the third star is a DECISION. Nothing else on
 * the board can be got wrong while being finished.
 */
export const CONTRACT_KINDS_3 = ['case'];

/**
 * NOTHING THAT COULD BE POSTED BEFORE STOPS BEING POSTED.
 *
 * The six round-64 kinds are all still reachable -- five at the second star and
 * `hunt` at the second and third -- and `plague` and `defend` are added beneath
 * them. That is deliberate and it is asserted below: the alternative, a first
 * tier that replaced the board rather than being added to the front of it,
 * would have quietly deleted four kinds of play that four rounds of suites and
 * a year of the world's content are built on. What round 95 does is REPLACE the
 * second tier's list with authored investigation work; until it does, the tier
 * is filled by the closest existing kinds rather than left empty.
 */
export const LEGACY_KINDS = ['hunt', 'cull', 'survey', 'delve', 'gather', 'relic'];

/** Every kind this file's own rounds authored, in the order they were added.
 *  `contractFaults` counts the board's kinds against LEGACY + these, so a kind
 *  added to a tier without being declared here is a fault rather than a
 *  silently wider board. */
export const AUTHORED_KINDS = ['plague', 'defend', 'den', 'supply', 'escort', 'case',
  'siege', 'raid'];

/**
 * ROUND 142 -- THE TWO CONTRACTS YOU STAND AND HOLD.
 *
 * The user, in one list with the containers:
 *
 *   "A new type of quest involving protecting a small town against waves of a
 *    strong rank appropriate monster should be added."
 *   "A new quest type involving bandits attacking a homestead or town should
 *    be added."
 *
 * Two sentences, and read carefully they are the same SHAPE and two different
 * fights: something arrives in waves at a place that cannot move, and you are
 * what stands between them. So there is ONE engine -- `_updateHoldContract` --
 * and this table is the difference between the two runs of it. Two copies of a
 * wave loop is the fault this project has a number for.
 *
 * What actually differs, and it is not cosmetic:
 *
 *   siege -- ONE SPECIES, drawn a tier ABOVE the region's own band, which is
 *            the user's "strong rank appropriate monster". What is at stake is
 *            a PERSON: the town's watch, who is hit when something gets past
 *            you, and whose death voids the contract. Four waves, the last led
 *            by a specimen of the same species at more than twice the health.
 *   raid  -- A NAMED CREW out of bandits.js, graded to the contract's rank the
 *            same way an escort's is. What is at stake is PROPERTY: the
 *            homestead's stores, carried off a sack at a time by whoever
 *            reaches the yard. Three waves, the last led by the crew's captain.
 *
 * The two stakes are the point of having two contracts. A life cannot be got
 * back and property can be defended down to the last sack, so the siege is a
 * contract you can fail in one bad moment and the raid is one you bleed.
 */
export const CONTRACT_HOLD_KINDS = ['siege', 'raid'];

/** The two kinds this round adds, named so other files can test for them
 *  without repeating the strings. */
export const CONTRACT_NEW_KINDS = ['plague', 'defend'];

/**
 * What each tier is FOR, in the Society's own words. Shown at the head of the
 * board so a player who cannot take a three-star contract still learns what a
 * three-star contract is.
 */
export const TIER_BRIEF = {
  1: 'Posted openly. A thing that needs killing, or a person who needs somebody standing over them while they work.',
  2: 'Posted to members in good standing. You are expected to find out where the problem is before you solve it.',
  3: 'Posted quietly. The problem is people. Decide, and be ready to say why.',
};

/**
 * THE BONUS CONDITION, per kind, in two halves: what has to happen, and the one
 * line the board prints so the player knows to try.
 *
 * The naming rule applies here as everywhere: `label` carries the flavour and
 * `desc` states the mechanic, including what is measured.
 */
export const CONTRACT_BONUS = {
  plague: {
    id: 'threat',
    label: 'Hazard pay',
    desc: 'Paid double bonus if something else attacks you while the quarry is still standing.',
  },
  defend: {
    id: 'unharmed',
    label: 'Not a scratch',
    desc: 'Paid if your client finishes the work without taking a single point of damage.',
  },
  // The other two tiers' conditions, stated now because the board prints them
  // now. Round 95 and 96 hook them; until then they are declared and unmet,
  // which is honest -- an unmet bonus pays nothing and says nothing.
  // ROUND 95 -- the second tier's own conditions. All three are `speed`,
  // because "bonuses for speed and clearing the quest quickly" is one condition
  // stated once; what differs is the work, not the test.
  den: { id: 'speed', label: 'Cold trail', desc: 'Paid if the den is cleared within two days of taking the contract.' },
  supply: { id: 'speed', label: 'Ahead of the season', desc: 'Paid if the whole order is delivered within two days of taking it.' },
  escort: { id: 'speed', label: 'Ahead of the season', desc: 'Paid if the cart reaches its destination within two days of setting out.' },
  delve: { id: 'speed', label: 'Inside the week', desc: 'Paid if the contract is finished within two days of taking it.' },
  hunt: { id: 'speed', label: 'Inside the week', desc: 'Paid if the contract is finished within two days of taking it.' },
  gather: { id: 'speed', label: 'Inside the week', desc: 'Paid if the contract is finished within two days of taking it.' },
  cull: { id: 'speed', label: 'Inside the week', desc: 'Paid if the contract is finished within two days of taking it.' },
  survey: { id: 'speed', label: 'Inside the week', desc: 'Paid if the contract is finished within two days of taking it.' },
  // ROUND 96 -- and the third star's own condition, which is the only one on
  // the board that is not about what you DID.
  // ROUND 142 -- and the two stands.
  //
  // NEITHER IS `speed`, and that is a deliberate reading of the rule rather
  // than an exception to it. `contractFaults` binds the speed condition to
  // CONTRACT_KINDS_2 -- the three journeys round 95 authored -- because speed
  // is what a journey has to give. A stand does not: the waves take exactly as
  // long as the waves take, and a bonus for arriving promptly would pay for
  // the walk rather than for the fight. What each of these has instead is the
  // thing the player is actually protecting, measured.
  siege: { id: 'unharmed', label: 'Not one got through',
    desc: 'Paid if the watch is still standing untouched when the last wave breaks.' },
  raid: { id: 'intact', label: 'Nothing carried off',
    desc: 'Paid if the crew is beaten without a single sack leaving the yard.' },
  case: { id: 'judgement', label: 'Well judged',
    desc: 'Paid if the verdict is right AND the statements that prove it were gathered. A lucky guess is paid for the work, never for the judgement.' },
  relic: { id: 'judgement', label: 'Well judged', desc: 'Paid on the Society\'s reading of the call you made.' },
};

export function bonusFor(kind) { return CONTRACT_BONUS[kind] || null; }

/**
 * WHAT THE BONUS PAYS, and the user's ruling on how it is chosen: "Tier decides
 * the reward."
 *
 * So the pool is a property of the star, not of the kind and not of a roll
 * against the whole catalogue. Reading up the ladder: a first-star bonus is a
 * favour from the Society or a stone, a second-star bonus is a stone or an
 * essence, a third-star bonus is the epic gear. An essence appears at two tiers
 * because it is the one reward in this game whose value is entirely about
 * WHICH essence, and that is decided elsewhere.
 */
export const BONUS_BY_STAR = {
  1: ['discount', 'stone'],
  2: ['stone', 'essence'],
  3: ['gear', 'essence'],
};

/** Every payout kind the pools above may name. `contractFaults` holds the two
 *  tables to each other, because a pool naming a kind the granter does not
 *  handle is a bonus that pays nothing and says it paid. */
export const BONUS_KINDS = ['discount', 'stone', 'essence', 'gear'];

/** The rarity an epic-gear bonus is rolled at. Named rather than typed at the
 *  call site: "epic gear" is the user's word and this is where it means
 *  something. */
export const BONUS_GEAR_RARITY = 'Epic';

/**
 * THE SOCIETY DISCOUNT -- "discounts at the adventurer society on the next few
 * purchases".
 *
 * A count of purchases rather than a span of days, because "the next few
 * purchases" is a count and because a timed discount in a game whose clock runs
 * at 24 hours per ten real minutes would expire before the player walked to the
 * counter.
 *
 * It rides on the PLAYER, as a plain field, so saves.js carries it with no save
 * code at all -- the same reason `godChains` needed none.
 */
export const SOCIETY_CREDIT_FLAG = 'societyCredit';
export const SOCIETY_DISCOUNT_USES = 3;
export const SOCIETY_DISCOUNT_FRAC = 0.25;
/** Which counter the discount is honoured at. The guild hall is the Society's
 *  own shop; the smith and the auction house are not the Society. */
export const SOCIETY_SHOP_ID = 'guild';
// ROUND 133 -- THE CREDIT FOLLOWS THE SOCIETY, NOT ONE COUNTER.
//
// Round 133 retired the guild clerk's shelf ("Instead of 1 vendor have 4
// brokers") and put the Society's trade in a market room behind the hall. A
// member's discount that still keyed on the one retired counter would have
// been a benefit the player earned and could no longer spend anywhere.
//
// So membership is tested against a set of ids rather than one: the old
// clerk's `guild` (kept, so an existing save whose shop panel is open on it
// still honours the credit) and every Society broker in every city, which
// share the `society_` prefix by construction.
export function isSocietyShop(shopId) {
  return shopId === SOCIETY_SHOP_ID || (typeof shopId === 'string' && shopId.startsWith('society_'));
}

export function newSocietyCredit() { return { uses: 0 }; }

/** The price after the member's discount, and the number of uses it costs.
 *  Returns the full price untouched when there is no credit, so the caller can
 *  print one number either way. */
export function discountedPrice(price, credit) {
  const uses = (credit && credit.uses) || 0;
  if (uses <= 0) return { price: Math.max(1, Math.round(price)), discounted: false };
  return { price: Math.max(1, Math.round(price * (1 - SOCIETY_DISCOUNT_FRAC))), discounted: true };
}

// ---------------------------------------------------------------------------
// THE GATE
// ---------------------------------------------------------------------------

export function rankIndex(rank) {
  const i = RANK_ORDER.indexOf(String(rank || 'normal'));
  return i < 0 ? 0 : i;
}

/** How far above the player a contract stands, in rungs. Negative is below. */
export function rankStepsAbove(contractRank, playerRank) {
  return rankIndex(contractRank) - rankIndex(playerRank);
}

/**
 * MAY THIS PLAYER TAKE THIS CONTRACT?
 *
 * One function, four answers, and the `why` is the string the board prints on
 * the disabled button -- so the reason the player is refused is written once
 * and cannot drift from the rule that refused them.
 *
 * `stars` is the player's Society grading at their CURRENT rank. An
 * unregistered player is treated as one star rather than as zero: the board is
 * public, the first star is what registration hands you, and a wall of refusals
 * for somebody who has not met the Society yet would read as a broken board
 * rather than as a locked one.
 */
export function canAcceptContract(contract, { rank = 'normal', stars = 1, hasTeam = false } = {}) {
  const star = Math.max(1, Math.min(3, (contract && contract.star) || 1));
  const cRank = (contract && contract.rank) || 'normal';
  const steps = rankStepsAbove(cRank, rank);
  // The reasons do NOT repeat the rank: the row's own headline already states
  // it, and a sub-line that says "Bronze rank — Bronze rank — 2 ranks above
  // you" is what happens when two strings are written without looking at the
  // rendered row. Found by reading a screenshot of the board.
  if (steps >= 2) {
    return { ok: false, code: 'rank', why: `${steps} ranks above you` };
  }
  if (star > (stars || 1)) {
    return { ok: false, code: 'star', why: `needs ${star} ${star === 1 ? 'star' : 'stars'}, you hold ${stars}` };
  }
  if (steps === 1 && !hasTeam) {
    return { ok: false, code: 'team', why: 'a rank above you — take a team' };
  }
  if (steps === 1) return { ok: true, code: 'team', why: 'a rank above you — your team covers it' };
  return { ok: true, code: 'ok', why: '' };
}

// ---------------------------------------------------------------------------
// TITLES
// ---------------------------------------------------------------------------
// Two banks per kind, joined "<A> <B>", the same shape quests.js uses and for
// the same reason its note gives: a board of twenty-five notices is large
// enough that two postings sharing a headline would be seen immediately, and
// two short lists give a few hundred headlines with nothing to keep in sync.
//
// Every A must read against every B. That rule cost round 64 a rewrite of the
// survey bank ("Nobody Goes the Standing Thing") and it is cheaper to obey than
// to test.

export const CONTRACT_TITLE_BANK = {
  plague: {
    a: ['The Thing At', 'Something Is Taking', 'Trouble At', 'It Comes To',
      'The Matter Of', 'Nobody Walks', 'What Waits At', 'Twice Now At'],
    b: ['the Low Field', 'the Mill Road', 'the Water Meadow', 'the Back Pasture',
      'the Orchard Wall', 'the Herd', 'the Cart Track', 'the Near Wood'],
  },
  defend: {
    a: ['Stand Over', 'See Them Home:', 'Nobody Bothers', 'Work Uninterrupted:',
      'A Day\'s Guard For', 'Let Them Finish:', 'Paid To Watch', 'Keep The Peace For'],
    b: ['the Cutter', 'the Digger', 'the Gatherer', 'the Quarryman',
      'the Collector', 'the Woodsman', 'the Prospector', 'the Picker'],
  },
  // ROUND 95 -- the second tier's three banks. Same rule as above: every A has
  // to read against every B, because a board of twenty-five is checked by
  // looking at it and an ungrammatical pair will be on one inside a week.
  den: {
    a: ['Find Out Where', 'Nobody Knows Where', 'Follow It Back:', 'The Question Of Where',
      'Somewhere Out There:', 'Trace It:', 'It Went Home:', 'Back Along'],
    b: ['It Sleeps', 'They Come From', 'the Killing Ground', 'It Goes At Dawn',
      'the Blood Leads', 'the Ones Before Went', 'They Have Been Breeding', 'the Marks Run'],
  },
  supply: {
    a: ['An Order For', 'Standing Order:', 'Wanted By Name:', 'Two Things For',
      'A List From', 'Paid On Delivery:', 'Set Aside For', 'The Whole Order For'],
    b: ['a Particular Buyer', 'the Workshop', 'a Long Winter', 'the Back Room',
      'a Careful Customer', 'the Season\'s Work', 'an Impatient Trade', 'the Ledger'],
  },
  escort: {
    a: ['Walk With', 'See It Through:', 'Nobody Touches', 'Paid To Ride Beside',
      'Bring It In:', 'The Fourth Attempt On', 'Ahead Of', 'Not This One:'],
    b: ['the Cart', 'the Load', 'the Wagon', 'the Consignment',
      'the Shipment', 'the Freight', 'the Delivery', 'What Is On the Cart'],
  },
  // ROUND 142 -- AND ONE FOR `case`, WHICH HAD NONE AND NEEDED ONE.
  //
  // A case posting is headlined with the authored case's own title out of
  // cases.js, which is right and is what the player should read. But there are
  // six cases and twenty-five rows on a board, so two boards posting the same
  // case collide -- and `_retitleOffer` then had nowhere to send it and fell
  // through to `questTitleFor`'s fallback. Measured on a live board: three of
  // 550 postings were headlined "Notice", and had been since round 96.
  //
  // These are only ever read by that de-duplication, so they are deliberately
  // ABOUT the shape of case work rather than about any one case: the second
  // town to want the same thing looked into has its own reason to want it.
  case: {
    a: ['A Question About', 'The Society Wants A Word On', 'Look Into',
      'Something Is Wrong With', 'Quietly, About', 'A Complaint Concerning',
      'Two Stories About', 'Nobody Agrees About'],
    b: ['the Paperwork', 'the Names On the Deed', 'the Second Ledger',
      'the Man From the City', 'the Signatures', 'the Missing Witness',
      'the Family Seal', 'Where the Money Went'],
  },
  // ROUND 142 -- two more banks, under the same rule the note at the top of
  // this table states and round 64 paid for: every A has to read against every
  // B. Read the sixty-four of each aloud before adding one.
  siege: {
    a: ['They Come At Dusk To', 'Hold', 'Stand The Night At', 'Three Nights Now At',
      'The Watch Cannot Hold', 'Muster At', 'Nobody Sleeps In', 'Keep Them Out Of'],
    b: ['the Low Gate', 'the Palisade', 'the Muster Ground', 'the Watch Fire',
      'the Near Wall', 'the Green', 'the Bell', 'the Last House'],
  },
  raid: {
    a: ['Riders On', 'They Are Coming For', 'Stand Between Them And', 'Twice Robbed:',
      'Paid To Meet Them At', 'Not Again At', 'The Crew That Works', 'Set A Watch On'],
    b: ['the Homestead', 'the Steading', 'the Stores', 'the Winter Grain',
      'the Byre', 'the Yard', 'the Season\'s Take', 'the Barn Doors'],
  },
};

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic from the posting's own id, like every other generated string
 *  on a board: the title has to survive a redraw, an accept, a save and a
 *  reload without being stored anywhere. */
export function contractTitleFor(kind, uid) {
  const bank = CONTRACT_TITLE_BANK[kind];
  if (!bank) return null;
  const h = hash32(`contract|${kind}|${uid}`);
  // `>>>`, not `>>`. Round 64 shipped the signed shift here and half of all
  // titles read "Bring In undefined" until it was found by a title count that
  // came out at 72 from a bank that can only make 64.
  return `${bank.a[h % bank.a.length]} ${bank.b[(h >>> 8) % bank.b.length]}`;
}

// ROUND 190 (update 6) -- A PLAGUE NOTICE SAYS WHAT AND WHERE.
//
//   "Quests names are coming up as AI slop ... being able to complete twice
//    now at the water meadow before nobody walks the water meadow doesn't make
//    sense ... That name is nonsense anyway as it's in the middle of the
//    city, no water, no meadow."
//
// The plague bank named places that are not places (a water meadow nobody can
// find) and moods that are not the job. A plague contract is one creature
// troubling one settlement, so the headline is built from those two facts:
// the creature's name and the board's town. Several shapes, so a board of
// them does not read as one line repeated.
const PLAGUE_SHAPES = [
  (m, w) => `The ${m} Troubling ${w}`,
  (m, w) => `Kill the ${m} Outside ${w}`,
  (m, w) => `${w}'s ${m} Problem`,
  (m, w) => `A ${m} Near ${w}`,
  (m, w) => `The ${m} on ${w}'s Doorstep`,
  (m, w) => `Put Down the ${m} by ${w}`,
];
const titleCase = (t) => String(t || '').replace(/\b([a-z])/g, (c) => c.toUpperCase());
export function plagueTitleFor(uid, monsterLabel, where) {
  const h = hash32(`plague|${uid}`);
  const m = titleCase(monsterLabel || 'Beast');
  return PLAGUE_SHAPES[h % PLAGUE_SHAPES.length](m, where || 'the Town');
}

// ---------------------------------------------------------------------------
// THE DEFENCE CONTRACT'S NUMBERS
// ---------------------------------------------------------------------------
// A client stands at a vein and works; things come out of the dark at her while
// she does. These are the knobs, in one place, because "how long does she take"
// and "how often does something arrive" are the two numbers that decide whether
// the contract is a fight or a wait.

/** How many veins she works through. Three, so the contract has a shape --
 *  arrive, hold, hold again, done -- rather than one long timer. */
export const DEFEND_NODES = 3;
/** Seconds per vein, on the world clock. */
export const DEFEND_NODE_SECONDS = 22;
/** Seconds between arrivals while she is working. */
export const DEFEND_WAVE_SECONDS = 9;
/** How many come each time, by contract tier. */
export const DEFEND_WAVE_SIZE = [1, 1, 2, 2, 3];
/** Her health, by contract tier. Deliberately small: the bonus is that she is
 *  never touched, and a client with a thousand health would make the ordinary
 *  outcome and the bonus outcome the same event. */
export const DEFEND_CLIENT_HP = [30, 46, 70, 105, 150];
/** How close something has to get before it is hitting her rather than you. */
export const DEFEND_GUARD_RADIUS = 58;
/** Seconds between an attacker's bites at her. */
export const DEFEND_BITE_SECONDS = 1.4;
/** How far the player may stray before she stops working. She is not brave. */
export const DEFEND_ABANDON_RADIUS = 460;

// ---------------------------------------------------------------------------
// ROUND 142 -- THE STAND, and the knobs both of its contracts turn.
//
// One table rather than two sets of constants, because the two contracts are
// one engine (see CONTRACT_HOLD_KINDS) and a second set of numbers is a second
// place for "how many waves" to mean something different.
//
// WAVES ARE PACED OFF THE LAST ONE DYING, not off a timer, and that is the
// design decision worth writing down. `defend` uses a timer, correctly: its
// contract is a CLOCK -- she works for twenty-two seconds a vein and things
// arrive while she does, so arrivals have to keep coming whether or not you
// have cleared the last lot. A stand is the opposite: the contract IS the
// waves, so a timer would mean a fast player fights two waves at once and a
// slow one fights five. Pacing off the kill makes "four waves" mean four
// waves to everybody, and makes the last wave land when the player is ready
// to see that it is the last one.
// ---------------------------------------------------------------------------

/** How many waves each stand is. The siege is longer because its waves are
 *  one species and a player learns that species by the second one; the raid is
 *  shorter because a crew that keeps coming back stops being a crew. */
export const HOLD_WAVES = { siege: 4, raid: 3 };

/** How many arrive in wave `n` (1-based), by contract tier. Escalating, so the
 *  contract has a shape rather than a rhythm -- the last wave of a siege at
 *  tier 4 is seven of them and a champion. */
export const HOLD_WAVE_BASE = { siege: [1, 2, 2, 3, 3], raid: [2, 2, 3, 3, 4] };
export const HOLD_WAVE_GROWTH = 1;

/** Seconds of quiet between one wave dying and the next arriving. Long enough
 *  to drink and reposition, short enough that it is a lull and not a break. */
export const HOLD_WAVE_GAP = 4.5;

/** How far out they arrive, and how close the player has to be for the stand
 *  to begin at all. */
export const HOLD_SPAWN_MIN = 190;
export const HOLD_SPAWN_MAX = 300;
export const HOLD_START_RADIUS = 150;
/** How far the player may stray before the stand pauses. Bigger than the
 *  defend contract's, because a town is a bigger place than a vein and chasing
 *  something round the houses should not read as abandoning the post. */
export const HOLD_ABANDON_RADIUS = 620;

/** The last wave is LED. Same species or the same crew -- what changes is the
 *  size of it, so the player meets something they already know how to fight
 *  and finds out it is not enough. */
export const HOLD_CHAMPION_HP = 2.6;
export const HOLD_CHAMPION_DMG = 1.5;

/** The siege's stake: the town watch's health, by tier. Deliberately on the
 *  same small scale as DEFEND_CLIENT_HP and for the same reason -- the bonus
 *  is that she is never touched, and a watch with a thousand health would make
 *  the ordinary outcome and the bonus outcome the same event. */
export const SIEGE_WATCH_HP = [40, 62, 95, 140, 200];

/** The raid's stake: how many sacks are in the yard, by tier, and how long a
 *  bandit standing in it takes over each one. Five at the bottom so that
 *  losing one is a quarter of the bonus and not the contract. */
export const RAID_GOODS = [5, 5, 6, 6, 7];
export const RAID_TAKE_SECONDS = 2.6;

const clampTier = (t) => Math.max(0, Math.min(4, t | 0));

export function holdWaves(kind) { return HOLD_WAVES[kind] || 3; }
export function holdWaveSize(kind, tier, waveIndex) {
  const base = (HOLD_WAVE_BASE[kind] || HOLD_WAVE_BASE.raid)[clampTier(tier)];
  return base + Math.max(0, (waveIndex | 0) - 1) * HOLD_WAVE_GROWTH;
}
export function siegeWatchHp(tier) { return SIEGE_WATCH_HP[clampTier(tier)]; }
export function raidGoods(tier) { return RAID_GOODS[clampTier(tier)]; }

export function defendWaveSize(tier) {
  return DEFEND_WAVE_SIZE[Math.max(0, Math.min(DEFEND_WAVE_SIZE.length - 1, tier | 0))];
}
export function defendClientHp(tier) {
  return DEFEND_CLIENT_HP[Math.max(0, Math.min(DEFEND_CLIENT_HP.length - 1, tier | 0))];
}

// ---------------------------------------------------------------------------
// THE PLAGUE CONTRACT'S BONUS
// ---------------------------------------------------------------------------
/**
 * ROUND 95 -- THE SPEED BONUS, ON THE WORLD'S OWN CLOCK.
 *
 * The user's ruling: two in-game days. The clock runs 24 hours per ten real
 * minutes, so two days is about twenty minutes of play -- long enough to travel
 * and fight, short enough that dawdling loses it.
 *
 * Days rather than real minutes on purpose. `_clockT` is saved (round 76 fixed
 * that) and wall time is not, so a real-time deadline would punish a player for
 * closing the tab and would be un-restorable on load. Measured on the same day
 * index the board's own weekly turnover uses, so "two days" means the same
 * thing to the bonus and to the board.
 */
export const SPEED_BONUS_DAYS = 2;

/** A week, as quests.js defines it. Duplicated as a NUMBER rather than imported
 *  so contracts.js stays free of a cycle through quests.js; the fault check
 *  below is what stops the two drifting. */
export const QUEST_WEEK_DAYS_ASSUMED = 7;

/** Was this contract turned in inside the window? `takenDay` is stamped at
 *  accept and is a plain number, so it saves with the quest for free. */
export function speedBonusMet(takenDay, nowDay) {
  if (takenDay === undefined || takenDay === null) return false;
  return (nowDay - takenDay) <= SPEED_BONUS_DAYS;
}

/** How close another live monster has to be, while the quarry is also close, to
 *  count as "the party has to face another threat". Measured on the PLAYER, not
 *  on the quarry: the condition is about what you were dealing with, and a
 *  second monster two screens behind the target is not something you faced. */
export const THREAT_RADIUS = 230;

// ===========================================================================
// ROUND 97 -- WHAT A CONTRACT PAYS.
//
// THE USER, verbatim:
//
//   "1) Payouts should be gated by rank and stars.
//    I.e. 1 star iron rank contracts are going to pay 500 normal rank coins to
//    50 iron rank coins. 2 star iron rank is 50 iron rank coins to 100 iron
//    rank coins. 3 star iron rank is 1 bronze rank coin to 10 bronze rank
//    coins.
//    2) bonuses can be extra money alongside previously stated bonuses."
//
// ---------------------------------------------------------------------------
// WHAT WAS WRONG, MEASURED
// ---------------------------------------------------------------------------
// `questPayout` prices a notice off the QUARRY'S XP -- monsterXp * 2.4 * a tier
// multiplier -- and then `applyBountyFloor` clamps the result to 5 iron. Both
// halves of that are broken in the same direction:
//
//   * The floor swallowed the bottom. The smallest thing the formula could
//     produce was 14 normal coins and the largest a Normal- or Iron-rank
//     posting could produce was a few hundred, so the clamp fired on nearly all
//     of them and HALF A 25-ROW BOARD ADVERTISED THE IDENTICAL NUMBER. Flagged
//     in the round 94, 95 and 96 notes and carried each time.
//   * The ceiling never arrived. Run the formula at the top of the ladder --
//     a gold-tier quarry at ~400xp, tier 4, the relic multiplier -- and it pays
//     about 69 iron. A GOLD-RANK CONTRACT PAID TWO-THIRDS OF A BRONZE COIN.
//     Five ranks of progression that the purse could not see.
//
// Both are the same mistake: the payout was derived from the monster instead of
// from the GRADE. The Society is not buying a corpse, it is buying work it has
// graded, and the grade is (rank, star). So that pair is now the payout, and
// the old effort formula is demoted to deciding WHERE INSIDE THE BAND a given
// posting falls -- which is what keeps a survey cheaper than a relic without
// letting either escape its rank.
//
// ---------------------------------------------------------------------------
// THE BAND, IN THE CONTRACT'S OWN COIN
// ---------------------------------------------------------------------------
// The user's three numbers are all iron-rank, so the table is written in the
// units they were stated in -- coins OF THE CONTRACT'S OWN RANK -- and the rank
// chooses the denomination. Their iron row reads back exactly:
//
//   1 star iron -> 5..50 iron       (5 iron IS "500 normal rank coins")
//   2 star iron -> 50..100 iron
//   3 star iron -> 100..1000 iron   (100 iron IS "1 bronze", 1000 IS "10")
//
// The bands are CONTIGUOUS by construction: a one-star tops out exactly where a
// two-star starts. That is what makes the board legible as a ladder -- the best
// one-star row on it is worth the worst two-star row, so a player reading down
// the board can see what a star is actually worth rather than being told.
//
// Note the star pays TWICE, and deliberately. `contractTierFor` already lifts a
// three-star posting's tier (and therefore its rank, and therefore its
// denomination), and the band lifts it again inside that rank. A three-star
// political case is five rows of a twenty-five row board and is the only work
// on it that can be got WRONG while being finished; it should be the difference
// between a job and a career.
// ===========================================================================

/** The band, in coins of the contract's own rank. The user's table, verbatim. */
export const CONTRACT_PAY_BAND = {
  1: [5, 50],
  2: [50, 100],
  3: [100, 1000],
};

/** The rank ladder the purse is denominated in. Held here as a NUMBER rather
 *  than imported from inventory.js's COIN_RANKS so contracts.js keeps its one
 *  import; `contractFaults` holds it to COIN_CONVERSION so the two cannot
 *  drift, which is the same trick QUEST_WEEK_DAYS_ASSUMED plays on quests.js. */
export const CONTRACT_COIN_STEP = 100;

/**
 * The band for a grade, expressed in NORMAL coins -- the unit every purse call
 * in the game already counts in (`grantCoins(purse, 'normal', n)` normalises
 * upward, so paying 2300 normal PUTS 23 iron in the purse).
 *
 * Diamond is reachable by `rankIndex` and is not reachable by any contract; it
 * is left to fall out of the arithmetic rather than special-cased, because
 * `contractFaults` already asserts no contract is ever graded there and two
 * guards on one rule is how the two disagree later.
 */
export function contractPayBand(rank, star) {
  const s = Math.max(1, Math.min(3, star | 0 || 1));
  const [lo, hi] = CONTRACT_PAY_BAND[s];
  const unit = Math.pow(CONTRACT_COIN_STEP, Math.max(0, rankIndex(rank)));
  return { lo: lo * unit, hi: hi * unit, unit, loCoins: lo, hiCoins: hi };
}

/**
 * HOW HARD A POSTING IS, as a 0..1 position inside its band.
 *
 * This is the old effort formula's job and all it has left. The numbers are
 * ordered by the work the contract asks for, not by the danger -- danger is
 * what the RANK is for, and pricing it twice is what produced a board where a
 * tier-4 relic and a tier-0 survey paid within a factor of two of each other.
 *
 * Read up the list: a survey is a walk to a place and back. A case is four
 * conversations and a decision. A relic is the slowest posting the board can
 * make. Every kind the board can post appears, because a kind that falls
 * through to a default is a kind that is priced by accident -- `contractFaults`
 * asserts the coverage against the kind tables rather than trusting this list
 * to have been kept up.
 */
export const CONTRACT_EFFORT = {
  survey: 0.10,
  gather: 0.34,
  supply: 0.38,
  hunt: 0.40,
  defend: 0.46,
  plague: 0.50,
  cull: 0.55,
  escort: 0.60,
  den: 0.66,
  // ROUND 142 -- the two stands, priced between the den and the delve. Above
  // the escort they borrow their crew from, because an escort can be walked
  // fast and a stand cannot be walked at all; below the delve, because a den
  // is a whole room to clear and this is a fight at a spot. The siege is the
  // dearer of the two: its quarry is drawn a tier above the region's band.
  raid: 0.68,
  siege: 0.74,
  delve: 0.70,
  relic: 0.86,
  // A political case sits at the top, above the relic that used to hold it.
  // This is where cases.js's CASE_PAY_MULT went: round 96 expressed "political
  // work pays more than ordinary work" as a 1.35 multiplier on one branch of
  // the builder, and with the price moved out of the branches it has to be
  // said here instead or it is not said at all. A case is the only work on the
  // board that can be got WRONG while being finished, and it is the dearest.
  case: 0.92,
};

/**
 * FOUR AXES, EACH WITH A STATED SHARE OF THE BAND.
 *
 * The first draft of this was additive -- an effort number per kind, nudged by
 * count, quarry and jitter -- and a simulated twenty-five row board caught it
 * twice in a row, both times as the SAME fault this round exists to fix:
 *
 *   * Absolute kind weights. The first star can only post `plague` (0.50) and
 *     `defend` (0.46), so every one-star row landed between 12 and 27 iron
 *     inside a band running 5 to 50. Four fifths of the band unused.
 *   * Kind weights normalised within the star, at full range. That fixed the
 *     span and broke the middle: `defend` pinned to 5-8 iron and `plague` to
 *     32-50, a board with a hole in it and one kind that reads as worthless.
 *
 * So the axes get SHARES that add to exactly one, and the kind is the largest
 * of four rather than the whole of it. Every axis is a 0..1 position and the
 * sum is a 0..1 position, so the extremes of the user's band stay reachable --
 * the cheapest thing a one-star iron board can post really is 500 normal rank
 * coins, and the dearest really is 50 iron -- while nothing clumps at either.
 *
 * The kind axis is read against ITS OWN STAR, not the whole catalogue, because
 * the band belongs to the star: a one-star board should span its whole range on
 * the difference between standing over a farmer and hunting the thing that has
 * been taking her animals, which is the only difference that tier has to offer.
 */
export const CONTRACT_PAY_SHARES = {
  kind: 0.45,     // what the Society asked for
  quarry: 0.28,   // how bad the thing at the end of it is
  count: 0.12,    // how much of it there is
  roll: 0.15,     // and the haggling
};

/** The kinds whose posting names a COUNT, so that count is part of the work.
 *  Saturating at eight: an order for twelve crates is more work than an order
 *  for three, but it is not four times the contract. */
export const CONTRACT_COUNT_KINDS = ['cull', 'gather', 'supply'];
export const CONTRACT_COUNT_FULL = 8;

/** Where a kind sits among the kinds ITS OWN STAR can post, 0..1. Null when the
 *  star posts one kind or none, in which case the axis has nothing to say. */
export function starKindSpan(star) {
  const kinds = CONTRACT_KINDS_BY_STAR[Math.max(1, Math.min(3, star | 0 || 1))] || [];
  const vals = kinds.map(k => CONTRACT_EFFORT[k]).filter(v => v !== undefined);
  if (vals.length < 2) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return hi > lo ? { lo, hi } : null;
}

const unit01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Where inside its band a posting falls, 0..1.
 *
 * AN AXIS WITH NOTHING TO SAY HANDS ITS SHARE TO THE ROLL rather than
 * contributing its midpoint, and this is the rule that took three passes to
 * find. Read a real board without it:
 *
 *     *  iron rank   9i  defend  Paid To Watch the Cutter
 *     *  iron rank  11i  defend  Let Them Finish: the Quarryman
 *     *  iron rank   9i  defend  Work Uninterrupted: the Digger
 *
 * A `defend` names no quarry (it is waves, not a species) and its count is
 * fixed at DEFEND_NODES, so two of its four axes were pinned at 0.5 and the
 * third at 0 -- leaving one fifteenth of the band to tell six rows apart. Six
 * postings, three prices. THE SAME FAULT THIS ROUND EXISTS TO FIX, surviving
 * inside the fix for it, and found by reading the board rather than by any
 * assertion -- which is the third time in four rounds that has been true.
 *
 * Handing the share over rather than shrinking the band keeps the shares
 * summing to one, so the extremes of the user's band stay reachable: the
 * cheapest thing a one-star iron board can post really is 500 normal rank
 * coins and the dearest really is 50 iron.
 *
 * `xpRel` is the quarry's position within its own tier's pool -- the last trace
 * of the xp-driven payout this round replaced, kept because the big one really
 * is a better job than the runt, and given a stated share rather than being the
 * whole price.
 */
export function contractPayWeight(kind, need, xpRel, rand, star) {
  const S = CONTRACT_PAY_SHARES;
  const eff = CONTRACT_EFFORT[kind];
  const span = star === undefined ? null : starKindSpan(star);
  const axes = [
    {
      share: S.kind,
      value: (eff === undefined || !span) ? null : unit01((eff - span.lo) / (span.hi - span.lo)),
    },
    {
      share: S.quarry,
      value: (xpRel === undefined || xpRel === null || !isFinite(xpRel)) ? null : unit01(xpRel),
    },
    {
      share: S.count,
      value: CONTRACT_COUNT_KINDS.includes(kind) ? unit01(((need | 0) - 1) / CONTRACT_COUNT_FULL) : null,
    },
  ];
  let total = 0, roll = S.roll;
  for (const a of axes) {
    if (a.value === null) roll += a.share;
    else total += a.share * a.value;
  }
  const r = typeof rand === 'function' ? unit01(rand()) : 0.5;
  return unit01(total + roll * r);
}

/**
 * The purse, in normal coins.
 *
 * GEOMETRIC interpolation across the band, not linear, because two of the three
 * bands span a factor of ten. Linear would put three quarters of a one-star
 * board above 27 iron and leave the cheap half of the range unused -- the same
 * clustering the floor caused, arrived at from the other direction.
 *
 * Rounded to a WHOLE COIN OF THE CONTRACT'S OWN RANK. A silver contract that
 * paid 47 silver, 32 bronze, 6 iron and 41 normal is arithmetically fine and
 * unreadable on a board; the Society posts round numbers. This is also what
 * makes the user's floor land on their own figure exactly: the smallest
 * one-star iron contract is 5 iron, which is 500 normal rank coins.
 */
export function contractPayFor(rank, star, weight) {
  const { lo, hi, unit } = contractPayBand(rank, star);
  const t = Math.max(0, Math.min(1, weight === undefined ? 0.5 : weight));
  const raw = lo * Math.pow(hi / lo, t);
  const coins = Math.round(raw / unit);
  return Math.max(lo, Math.min(hi, coins * unit));
}

/** The whole thing, for a caller that has a posting rather than a weight. */
export function contractReward(rank, star, kind, need, xpRel, rand) {
  return contractPayFor(rank, star, contractPayWeight(kind, need, xpRel, rand, star));
}

// ---------------------------------------------------------------------------
// ROUND 97 -- AND HOW MUCH NORMAL-RANK WORK A BOARD CARRIES.
// ---------------------------------------------------------------------------
// THE USER, on the bottom of the ladder:
//
//   "There should be very few normal rank contracts. Normal rank is basically
//    the slimes in the initial sewers and a few just outside town. In the book
//    you only see normal rank monsters in the first 30 pages and then never
//    again through the next 13 books."
//
// That is a statement about the WORLD, not about the payout, and it caught a
// thing the payout work only made visible. Measured on three real boards before
// this existed: Milrow posted 7 normal-rank contracts of 25 and Fenn Cross
// posted 11. A board is graded off its region's own threat bands, The Nek holds
// bands 0 and 1, and a fair roll between them makes half of every starting
// board normal rank -- which reads as a world where normal-rank monsters are a
// standing profession rather than the first thirty pages.
//
// So a posting that rolls tier 0 is LIFTED to tier 1 unless a small seeded roll
// says otherwise. Not zero: the Society does post the odd normal-rank notice,
// and a board with none of them would have nothing for a player who has just
// come up out of the sewer. Two rows of twenty-five is "a few just outside
// town"; twelve is a career.
//
// Applied to the TIER, before the quarry is drawn, for the same reason
// `contractTierFor` is: the grade and the thing you are sent at have to agree,
// and a rank raised after the pool was picked is the exact lie the round-94
// header exists to prevent.
// A PLAN, NOT A PROBABILITY -- and the first draft of this was the probability.
//
// Written as "a tier-0 roll survives 8% of the time", measured across every
// board in the world, and the answer came back: 325 rows, ZERO of them normal
// rank. Tier 0 has to be rolled first and then survive, so two small odds
// multiplied into none at all -- while the fault check, which asked the helper
// whether it kept 8% of the rolls it was handed, passed. An assertion about a
// table is not an assertion about the build, again.
//
// Worse, the board it produced could not be used: a fresh Normal-rank
// adventurer standing alone at Cadence's board could accept NOTHING on it. The
// star gate is absolute and the rank gate needs a team, so a board with no
// normal-rank work is a wall for exactly the player the first star is for.
//
// So the count is fixed the way CONTRACT_STAR_MIX fixes the star mix: every
// board that stands in a region holding tier-0 threats carries this many
// normal-rank notices, always, and the rest are lifted to iron. Two of
// twenty-five is "a few just outside town" and is also the smallest number that
// leaves the opening playable solo.
export const CONTRACT_NORMAL_ROWS = 2;

/** Which rows of a board may stay at tier 0. The first N one-star rows of the
 *  board's own shuffled plan, so which rows they are moves with the seed while
 *  how many there are does not. */
export function normalRowPlan(stars) {
  const out = new Set();
  for (let i = 0; i < (stars || []).length && out.size < CONTRACT_NORMAL_ROWS; i++) {
    if (stars[i] === 1) out.add(i);
  }
  return out;
}

/**
 * The planned row is GRADED normal, not merely permitted to be.
 *
 * Permitting was the second thing measured and the second thing wrong: a row
 * allowed to keep tier 0 still had to roll tier 0 out of its region's bands
 * first, which in The Nek is a coin toss, so thirteen boards carried four
 * normal-rank notices between them and Cadence's own offered a fresh soloist
 * exactly one line. Two small odds multiplied again -- the same shape as the
 * 8% version, one layer further in.
 *
 * So a planned row in a region that actually HOLDS tier-0 threats is set to
 * tier 0. `regionHasNormal` is the guard that keeps this honest: Harrowmoor's
 * bands start at 2, so its board plans nothing at normal rank and posts none,
 * which is right -- the slimes are outside Cadence, not outside Harrowmoor.
 */
export function contractTierFloor(tier, allowNormal, regionHasNormal) {
  if (allowNormal && regionHasNormal) return 0;
  const t = tier | 0;
  return t === 0 ? 1 : t;
}

/** One coin of a rank, in normal coins. This is what replaces
 *  `applyBountyFloor` everywhere a CONTRACT'S purse is touched.
 *
 *  The old floor was a single number -- 5 iron -- applied to every posting at
 *  every rank, which is what flattened the bottom of the board. A floor still
 *  has to exist (a modifier that scales a reward down can walk it to nothing,
 *  and "0 coins" on a board is a bug report), but it has to be a floor IN THE
 *  CONTRACT'S OWN DENOMINATION: one iron on an iron contract, one gold on a
 *  gold one. A rank-blind floor is a floor for exactly one rank. */
export function contractCoinUnit(rank) {
  return Math.pow(CONTRACT_COIN_STEP, Math.max(0, rankIndex(rank)));
}

/** A modified contract payout, kept in its own denomination and never zero.
 *  Every site that scales a posted reward -- a god's chapter scaling it up, a
 *  villager's request scaling it down, the Society's ladder adding to it --
 *  passes through here, for the reason quests.js's own floor note gives: a
 *  floor the modifiers run after is not a floor. */
export function clampContractPay(coins, rank) {
  const unit = contractCoinUnit(rank);
  return Math.max(unit, Math.round((coins || 0) / unit) * unit);
}

// ---------------------------------------------------------------------------
// AND THE BONUS, WHICH IS MONEY TOO
// ---------------------------------------------------------------------------
// The user: "bonuses can be extra money alongside previously stated bonuses."
//
// ALONGSIDE is the operative word and it is a correction to a thing this file
// already half-did. Round 94 paid a coin half on top of the substance and never
// printed it, so a reward the player could not know about could not be worked
// toward -- the exact fault the bonus DESCRIPTION exists to avoid, committed
// one line below the description. It is stated on the row now.
//
// Scaled BY STAR rather than by one flat multiplier, because the bonus rides on
// a reward that is itself banded by star: a flat half would have made the
// three-star judgement bonus worth twenty times the one-star hazard bonus by
// accident, which is a ratio nobody chose. These are chosen.

/** What the met bonus adds, as a fraction of the contract's own reward. */
export const CONTRACT_BONUS_PAY_BY_STAR = { 1: 0.5, 2: 0.6, 3: 0.75 };

/** Round 94's flat multiplier, kept as the fallback for a posting with no star
 *  (a god's chapter, a villager's request) and as the name four suites use. */
export const CONTRACT_BONUS_PAY_MULT = 0.5;

/** The coin half of a met bonus, in normal coins. Rounded to a whole coin of
 *  the contract's rank for the same reason the reward is. */
export function contractBonusCoins(reward, rank, star) {
  const mult = CONTRACT_BONUS_PAY_BY_STAR[Math.max(1, Math.min(3, star | 0 || 1))]
    || CONTRACT_BONUS_PAY_MULT;
  const unit = Math.pow(CONTRACT_COIN_STEP, Math.max(0, rankIndex(rank)));
  const raw = Math.max(0, reward || 0) * mult;
  return Math.max(unit, Math.round(raw / unit) * unit);
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------
// Everything below is a promise made in a data table, which is this project's
// most reliable source of silent breakage. Each check is a sentence from the
// user's own specification turned into an assertion.

export function contractFaults() {
  const out = [];

  // 1.2 -- twenty-five, and the mix has to actually add up to it.
  const plan = contractStarPlan();
  if (plan.length !== CONTRACT_BOARD_SIZE) {
    out.push(`the star mix posts ${plan.length} contracts, not ${CONTRACT_BOARD_SIZE}`);
  }
  for (const star of [1, 2, 3]) {
    if (!CONTRACT_STAR_MIX[star]) out.push(`no ${star}-star contracts are ever posted`);
    if (!plan.includes(star)) out.push(`the plan holds no ${star}-star contract`);
  }

  // 1.4 -- three tiers, each with somewhere to post from and something to say.
  for (const star of [1, 2, 3]) {
    const kinds = CONTRACT_KINDS_BY_STAR[star];
    if (!kinds || !kinds.length) out.push(`star ${star} has no contract kinds`);
    if (!TIER_BRIEF[star]) out.push(`star ${star} has no brief`);
    for (const k of (kinds || [])) {
      if (!CONTRACT_BONUS[k]) out.push(`star ${star} posts ${k}, which has no bonus condition`);
    }
  }

  // Nothing that could be posted before stops being posted. See LEGACY_KINDS.
  {
    const posted = new Set([].concat(...[1, 2, 3].map(s2 => CONTRACT_KINDS_BY_STAR[s2] || [])));
    for (const k of LEGACY_KINDS) if (!posted.has(k)) out.push(`${k} is no longer posted anywhere`);
    for (const k of AUTHORED_KINDS) if (!posted.has(k)) out.push(`${k} is never posted`);
    const want = LEGACY_KINDS.length + AUTHORED_KINDS.length;
    if (posted.size !== want) out.push(`the board posts ${posted.size} kinds, not the ${want} it should`);
  }

  // 1.4.3 -- the third tier is the political one, and it posts case work.
  {
    const three = CONTRACT_KINDS_BY_STAR[3] || [];
    for (const k of CONTRACT_KINDS_3) if (!three.includes(k)) out.push(`the third tier does not post ${k}`);
    for (const k of CONTRACT_KINDS_3) {
      const b = CONTRACT_BONUS[k];
      if (!b) { out.push(`${k} has no bonus condition`); continue; }
      if (b.id !== 'judgement') out.push(`${k} is a third-tier contract but its bonus is ${b.id}`);
      if (!/\bpaid\b/i.test(b.desc || '')) out.push(`${k}'s bonus does not say when it pays`);
      // The rule the whole tier rests on has to be STATED on the row, not just
      // enforced: a player who is not told that a guess pays less will read the
      // missing bonus as the game losing their reward.
      if (!/guess/i.test(b.desc || '')) out.push(`${k}'s bonus does not say that a guess is not a judgement`);
    }
  }

  // 1.4.2 -- the second tier posts all three of the shapes the user named.
  {
    const two = CONTRACT_KINDS_BY_STAR[2] || [];
    for (const k of CONTRACT_KINDS_2) if (!two.includes(k)) out.push(`the second tier does not post ${k}`);
    // ...and every one of them declares a bonus, which for this tier is speed.
    for (const k of CONTRACT_KINDS_2) {
      const b = CONTRACT_BONUS[k];
      if (!b) { out.push(`${k} has no bonus condition`); continue; }
      if (b.id !== 'speed') out.push(`${k} is a second-tier contract but its bonus is ${b.id}`);
      if (!b.label || !b.desc) out.push(`${k} has no stated bonus`);
      if (!/\bpaid\b/i.test(b.desc || '')) out.push(`${k}'s bonus does not say when it pays`);
      // "within two days" is the ruling; a description that names a different
      // window than SPEED_BONUS_DAYS is the board lying about the deal.
      if (!new RegExp(`\\b${SPEED_BONUS_DAYS === 2 ? 'two' : SPEED_BONUS_DAYS} days?\\b`).test(b.desc || '')) {
        out.push(`${k}'s bonus does not name the ${SPEED_BONUS_DAYS}-day window`);
      }
    }
    if (SPEED_BONUS_DAYS < 1) out.push('the speed bonus can never be earned');
    if (SPEED_BONUS_DAYS >= QUEST_WEEK_DAYS_ASSUMED) {
      out.push('the speed bonus lasts as long as the board does, so it is not a speed bonus');
    }
  }

  // 1.4.1 -- the first tier is the two shapes the user named, and only those.
  const one = CONTRACT_KINDS_BY_STAR[1] || [];
  for (const k of CONTRACT_NEW_KINDS) if (!one.includes(k)) out.push(`the first tier does not post ${k}`);
  if (one.length !== CONTRACT_NEW_KINDS.length) out.push('the first tier posts something other than the two authored kinds');

  // Both first-tier bonuses must be DIFFERENT conditions -- "the NPC doesn't
  // take any damage" and "the party has to face another threat" are two
  // different things to play toward, and a table that gave them the same id
  // would quietly pay one rule twice.
  if (CONTRACT_BONUS.plague.id === CONTRACT_BONUS.defend.id) {
    out.push('the two first-tier contracts share a bonus condition');
  }
  for (const k of CONTRACT_NEW_KINDS) {
    const b = CONTRACT_BONUS[k];
    if (!b || !b.label || !b.desc) out.push(`${k} has no stated bonus`);
    // The naming rule: the label carries flavour, the description states the
    // mechanic. A description that does not say when it pays is not one.
    if (b && !/\bpaid\b/i.test(b.desc)) out.push(`${k}'s bonus does not say when it pays`);
  }

  // 1.5 -- every tier pays a bonus, out of the named kinds, and every named
  // kind is one something can actually grant.
  for (const star of [1, 2, 3]) {
    const pool = BONUS_BY_STAR[star];
    if (!pool || !pool.length) { out.push(`star ${star} pays no bonus`); continue; }
    for (const k of pool) if (!BONUS_KINDS.includes(k)) out.push(`star ${star} pays unknown bonus ${k}`);
  }
  const paid = new Set([].concat(...[1, 2, 3].map(s => BONUS_BY_STAR[s] || [])));
  for (const k of BONUS_KINDS) if (!paid.has(k)) out.push(`${k} is a bonus kind nothing ever pays`);
  // The user listed four rewards; all four must be reachable.
  if (paid.size !== BONUS_KINDS.length) out.push(`only ${paid.size} of ${BONUS_KINDS.length} bonus rewards are reachable`);

  // 1.3 -- the gate, asserted rather than trusted, at every rung.
  for (let i = 0; i < CONTRACT_RANK_BY_TIER.length; i++) {
    const pRank = CONTRACT_RANK_BY_TIER[i];
    const same = { star: 1, rank: pRank };
    if (!canAcceptContract(same, { rank: pRank, stars: 1, hasTeam: false }).ok) {
      out.push(`a ${pRank} member cannot take ${pRank} work at their own star`);
    }
    const above1 = { star: 1, rank: CONTRACT_RANK_BY_TIER[Math.min(i + 1, CONTRACT_MAX_TIER)] };
    if (i < CONTRACT_MAX_TIER) {
      if (canAcceptContract(above1, { rank: pRank, stars: 1, hasTeam: false }).ok) {
        out.push(`a ${pRank} member alone can take work one rank above them`);
      }
      if (!canAcceptContract(above1, { rank: pRank, stars: 1, hasTeam: true }).ok) {
        out.push(`a ${pRank} member with a team cannot take work one rank above them`);
      }
    }
    if (i + 2 <= CONTRACT_MAX_TIER) {
      const above2 = { star: 1, rank: CONTRACT_RANK_BY_TIER[i + 2] };
      if (canAcceptContract(above2, { rank: pRank, stars: 1, hasTeam: true }).ok) {
        out.push(`a ${pRank} member with a team can take work two ranks above them`);
      }
    }
    // The star gate is absolute: a team never lends you a star.
    for (const s of [2, 3]) {
      if (canAcceptContract({ star: s, rank: pRank }, { rank: pRank, stars: 1, hasTeam: true }).ok) {
        out.push(`a one-star ${pRank} member with a team can take ${s}-star work`);
      }
    }
    // ...and a member at the star can, or the tier is unreachable.
    for (const s of [1, 2, 3]) {
      if (!canAcceptContract({ star: s, rank: pRank }, { rank: pRank, stars: s }).ok) {
        out.push(`a ${s}-star ${pRank} member cannot take ${s}-star work at their own rank`);
      }
    }
  }
  // Every refusal has to say why, or the board disables a button in silence.
  for (const probe of [{ star: 3, rank: 'normal' }, { star: 1, rank: 'gold' }]) {
    const v = canAcceptContract(probe, { rank: 'normal', stars: 1 });
    if (!v.ok && !v.why) out.push(`a refusal of ${probe.rank} ${probe.star}-star work gives no reason`);
  }

  // The rank ladder the board grades on. No diamond, anywhere, ever.
  if (CONTRACT_RANK_BY_TIER.includes('diamond')) out.push('the board posts diamond-rank contracts');
  for (const r of CONTRACT_RANK_BY_TIER) if (!RANK_ORDER.includes(r)) out.push(`${r} is not a rank`);
  for (let i = 1; i < CONTRACT_RANK_BY_TIER.length; i++) {
    if (rankIndex(CONTRACT_RANK_BY_TIER[i]) <= rankIndex(CONTRACT_RANK_BY_TIER[i - 1])) {
      out.push('the tier-to-rank ladder does not rise');
    }
  }
  // The star raises the tier, and the label follows it. A three-star posting in
  // the weakest region must still be graded above a one-star posting there, or
  // the whole "the label is true" argument in this file's header is false.
  if (contractTierFor(0, 3) <= contractTierFor(0, 1)) out.push('a third star does not raise a contract');
  if (contractTierFor(CONTRACT_MAX_TIER, 3) !== CONTRACT_MAX_TIER) out.push('the tier ladder is not capped at gold');
  if (contractRankForTier(contractTierFor(0, 3)) === contractRankForTier(contractTierFor(0, 1))) {
    out.push('a third-star posting is graded at the same rank as a first-star one');
  }

  // The titles. Every authored kind needs a bank, and every combination has to
  // read -- a bank that makes "undefined" is the round-64 signed-shift bug, and
  // one that makes forty titles for a twenty-five-row board collides.
  // `case` is exempt: a political case carries its OWN authored title out of
  // cases.js ("The Question of the Almsgate"), so a generated bank for it would
  // be a bank nothing reads. caseFaults asserts every case has a title.
  for (const k of AUTHORED_KINDS.filter(k2 => k2 !== 'case')) {
    const bank = CONTRACT_TITLE_BANK[k];
    if (!bank || !bank.a.length || !bank.b.length) { out.push(`${k} has no title bank`); continue; }
    const seen = new Set();
    for (let i = 0; i < 400; i++) seen.add(contractTitleFor(k, `probe${i}`));
    if (seen.size < 40) out.push(`${k} only makes ${seen.size} distinct titles`);
    for (const t of seen) if (/undefined/.test(t)) out.push(`${k} makes a title reading "${t}"`);
  }

  // The defence numbers. Each of these being wrong produces a contract that
  // cannot be finished or cannot be failed, and neither shows as an error.
  if (DEFEND_NODES < 1) out.push('a defence contract guards nobody');
  if (DEFEND_NODE_SECONDS <= 0) out.push('a defence contract finishes instantly');
  if (DEFEND_WAVE_SECONDS <= 0) out.push('a defence contract spawns without pause');
  if (DEFEND_WAVE_SECONDS >= DEFEND_NODE_SECONDS * DEFEND_NODES) {
    out.push('nothing ever arrives during a defence contract');
  }
  if (DEFEND_GUARD_RADIUS >= DEFEND_ABANDON_RADIUS) {
    out.push('the client is abandoned before anything can reach her');
  }
  for (let t = 0; t <= CONTRACT_MAX_TIER; t++) {
    if (defendClientHp(t) <= 0) out.push(`the client has no health at tier ${t}`);
    if (defendWaveSize(t) < 1) out.push(`no attackers arrive at tier ${t}`);
    if (t > 0 && defendClientHp(t) <= defendClientHp(t - 1)) out.push(`the client is no tougher at tier ${t}`);
  }
  // The bonus must be LOSABLE. If one wave of the smallest size cannot take her
  // below full health in the time she stands there, "not a scratch" is not a
  // condition, it is the default.
  if (DEFEND_BITE_SECONDS > DEFEND_NODE_SECONDS) out.push('nothing can bite the client before she finishes');

  // The discount. Both halves matter: a zero-use credit is never granted and a
  // zero-fraction credit is granted and does nothing.
  if (SOCIETY_DISCOUNT_USES < 1) out.push('the Society discount is never usable');
  if (!(SOCIETY_DISCOUNT_FRAC > 0 && SOCIETY_DISCOUNT_FRAC < 1)) out.push('the Society discount is not a discount');
  const full = discountedPrice(400, { uses: 0 });
  const cut = discountedPrice(400, { uses: 1 });
  if (full.discounted) out.push('a member with no credit is charged a discounted price');
  if (!cut.discounted || cut.price >= full.price) out.push('the Society discount does not lower a price');

  // -------------------------------------------------------------------------
  // ROUND 97 -- THE PAYOUT LADDER.
  // -------------------------------------------------------------------------
  // The user's own three numbers, read back out of the table. If any of these
  // fires the band has been edited into disagreeing with the sentence it was
  // written from, which is the only way this table can be wrong.
  const IRON = CONTRACT_COIN_STEP;
  const stated = [
    { star: 1, lo: 5 * IRON, hi: 50 * IRON, say: '1 star iron is 500 normal to 50 iron' },
    { star: 2, lo: 50 * IRON, hi: 100 * IRON, say: '2 star iron is 50 iron to 100 iron' },
    { star: 3, lo: 100 * IRON, hi: 1000 * IRON, say: '3 star iron is 1 bronze to 10 bronze' },
  ];
  for (const s of stated) {
    const b = contractPayBand('iron', s.star);
    if (b.lo !== s.lo || b.hi !== s.hi) {
      out.push(`${s.say}, but the band pays ${b.lo}..${b.hi} normal`);
    }
  }
  // The ladder has to be a ladder in both directions, or "gated by rank and
  // stars" is only one of the two.
  for (const rank of CONTRACT_RANK_BY_TIER) {
    for (const star of [1, 2, 3]) {
      const b = contractPayBand(rank, star);
      if (!(b.hi > b.lo)) out.push(`${rank} ${star}-star pays one price`);
      if (star > 1) {
        const prev = contractPayBand(rank, star - 1);
        if (b.lo < prev.hi) out.push(`a ${star}-star ${rank} can pay less than a ${star - 1}-star one`);
      }
    }
    const i = CONTRACT_RANK_BY_TIER.indexOf(rank);
    if (i > 0) {
      const below = contractPayBand(CONTRACT_RANK_BY_TIER[i - 1], 3);
      const here = contractPayBand(rank, 1);
      if (here.lo < below.lo) out.push(`a 1-star ${rank} can pay less than a 1-star ${CONTRACT_RANK_BY_TIER[i - 1]}`);
    }
  }
  // The band is written in the purse's own units, and the purse is the
  // authority on them. QUEST_WEEK_DAYS_ASSUMED's trick, applied to the coin
  // ladder: duplicated to avoid a cycle, asserted so it cannot drift.
  if (CONTRACT_COIN_STEP !== COIN_CONVERSION) {
    out.push(`the pay band steps by ${CONTRACT_COIN_STEP} and the purse by ${COIN_CONVERSION}`);
  }
  if (RANK_ORDER.slice(0, COIN_RANKS.length).join() !== COIN_RANKS.join()) {
    out.push('the rank ladder and the coin ladder are not the same ladder');
  }

  // Every kind the board can post has to be PRICED, not defaulted. A kind
  // missing from CONTRACT_EFFORT still pays -- it pays the middle of the band,
  // silently, which is exactly the shape of bug this file keeps finding.
  const posted = new Set();
  for (const star of [1, 2, 3]) for (const k of (CONTRACT_KINDS_BY_STAR[star] || [])) posted.add(k);
  for (const k of posted) {
    if (CONTRACT_EFFORT[k] === undefined) out.push(`${k} is posted but has no effort weight`);
  }
  for (const k of Object.keys(CONTRACT_EFFORT)) {
    const e = CONTRACT_EFFORT[k];
    if (!(e >= 0 && e <= 1)) out.push(`${k}'s effort weight ${e} is not a position in the band`);
    if (!posted.has(k)) out.push(`${k} is priced but never posted`);
  }
  // A survey must not out-earn a relic on the same row of the board.
  if (CONTRACT_EFFORT.survey >= CONTRACT_EFFORT.relic) out.push('a survey is priced above a relic');
  // cases.js: "political work pays no more than ordinary work" was asserted
  // there against a multiplier that no longer exists. The claim now lives in
  // this table, so it is asserted against this table.
  for (const k of Object.keys(CONTRACT_EFFORT)) {
    if (k !== 'case' && CONTRACT_EFFORT[k] >= CONTRACT_EFFORT.case) {
      out.push(`${k} is priced at or above a political case`);
    }
  }

  // The weight must actually USE its range, or the geometric map is decoration
  // and the board reads as one price again -- which is the fault this round
  // exists to fix, so it is asserted rather than assumed.
  {
    // KINDS OVERLAP ON PURPOSE -- that is what makes the board read as a
    // continuum rather than as two or three price shelves, and the first draft
    // of this table was rejected for banding. So the invariant is not "a survey
    // never out-earns a relic", it is: HELD EVERYTHING ELSE EQUAL, the dearer
    // kind pays more. That is the claim the effort table actually makes.
    for (const star of [1, 2, 3]) {
      const kinds = (CONTRACT_KINDS_BY_STAR[star] || [])
        .slice().sort((a, b) => CONTRACT_EFFORT[a] - CONTRACT_EFFORT[b]);
      for (let i = 1; i < kinds.length; i++) {
        const at = (k) => contractPayWeight(k, 4, 0.5, () => 0.5, star);
        if (at(kinds[i]) <= at(kinds[i - 1])) {
          out.push(`at ${star} star, ${kinds[i]} does not out-earn ${kinds[i - 1]}`);
        }
      }
    }
    // And every star must actually USE its band, or the board reads as one
    // price again -- which is the fault this round exists to fix, so it is
    // measured rather than assumed. Walked over the roll AND the kinds each
    // star can post, because a star whose kinds are all alike (the first star
    // posts two) is exactly where the range quietly collapses.
    for (const star of [1, 2, 3]) {
      const kinds = CONTRACT_KINDS_BY_STAR[star] || [];
      let lo = 1, hi = 0;
      for (const k of kinds) {
        for (let i = 0; i <= 20; i++) {
          const w = contractPayWeight(k, 1, null, () => i / 20, star);
          lo = Math.min(lo, w); hi = Math.max(hi, w);
        }
      }
      // Measured as a FRACTION OF THE BAND, not as a multiple. The user's
      // second-star band is 50..100 iron -- two times end to end -- so an
      // absolute "must span 2x" is unsatisfiable there by construction, and a
      // check that cannot pass is not a check. The band is the user's; what is
      // asserted is that the board uses it.
      if (hi - lo < 0.8) out.push(`a ${star}-star board reaches only ${Math.round((hi - lo) * 100)}% of its band`);
      // And the single kind that varies least, on its own. A board posting six
      // `defend` rows must not print three prices, which is what it did before
      // a degenerate axis started handing its share to the roll.
      for (const k of kinds) {
        let klo = 1, khi = 0;
        for (let i = 0; i <= 20; i++) {
          const w = contractPayWeight(k, 1, null, () => i / 20, star);
          klo = Math.min(klo, w); khi = Math.max(khi, w);
        }
        if (khi - klo < 0.35) {
          out.push(`${k} at ${star} star moves over only ${Math.round((khi - klo) * 100)}% of the band`);
        }
      }
    }
  }
  // "There should be very few normal rank contracts." Few, and not none: a
  // board with none of them is one a fresh Normal-rank adventurer standing
  // alone cannot take a single line of, which is the wall the round-94 header
  // says both gates exist to avoid.
  if (CONTRACT_NORMAL_ROWS < 1) out.push('a board can never post normal-rank work at all');
  if (CONTRACT_NORMAL_ROWS > CONTRACT_STAR_MIX[1] / 3) {
    out.push(`${CONTRACT_NORMAL_ROWS} of ${CONTRACT_BOARD_SIZE} rows are normal rank, which is not "very few"`);
  }
  {
    const plan = normalRowPlan(contractStarPlan());
    if (plan.size !== CONTRACT_NORMAL_ROWS) {
      out.push(`a board plans ${plan.size} normal-rank rows, not ${CONTRACT_NORMAL_ROWS}`);
    }
    for (const i of plan) {
      if (contractStarPlan()[i] !== 1) out.push('a normal-rank row was planned above the first star');
    }
    if (contractTierFloor(0, true, true) !== 0) out.push('a planned row is lifted anyway');
    if (contractTierFloor(1, true, true) !== 0) out.push('a planned row is not graded normal');
    if (contractTierFloor(0, true, false) !== 1) out.push('a region with no tier-0 threats still posts normal-rank work');
    if (contractTierFloor(0, false, true) !== 1) out.push('an unplanned tier-0 row is not lifted');
    if (contractTierFloor(2, false, true) !== 2) out.push('the tier floor moves a tier it was not asked to move');
  }

  // The user's floor, landing on the user's own figure.
  if (contractPayFor('iron', 1, 0) !== 500) {
    out.push(`the smallest 1-star iron contract pays ${contractPayFor('iron', 1, 0)}, not 500`);
  }
  // And the bonus is money on top -- never zero, never larger than the job.
  for (const star of [1, 2, 3]) {
    const reward = contractPayFor('iron', star, 0.5);
    const extra = contractBonusCoins(reward, 'iron', star);
    if (extra <= 0) out.push(`a met ${star}-star bonus pays no coin`);
    if (extra >= reward) out.push(`a ${star}-star bonus pays more than the contract`);
    if (extra % IRON !== 0) out.push(`a ${star}-star iron bonus pays a fraction of an iron coin`);
  }
  if (!(CONTRACT_BONUS_PAY_BY_STAR[3] > CONTRACT_BONUS_PAY_BY_STAR[1])) {
    out.push('a third-star bonus is worth no more of its contract than a first-star one');
  }

  return out;
}

/** A census, for the notes and for a suite to print. */
export function contractCensus() {
  return {
    boardSize: CONTRACT_BOARD_SIZE,
    mix: { ...CONTRACT_STAR_MIX },
    kinds: { 1: CONTRACT_KINDS_BY_STAR[1].length, 2: CONTRACT_KINDS_BY_STAR[2].length, 3: CONTRACT_KINDS_BY_STAR[3].length },
    newKinds: CONTRACT_NEW_KINDS.slice(),
    legacyKinds: LEGACY_KINDS.slice(),
    bonusKinds: BONUS_KINDS.slice(),
    ranks: CONTRACT_RANK_BY_TIER.slice(),
  };
}
