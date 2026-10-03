// ============================================================================
// ROUND 295 -- THE UNDERWORLD'S RECORD OF THE DIVISION (outlaw arc, O3).
//
// "The underworld knew about the Division first. It was carrying their
// crates." (pitch O3, chosen with O2 in round 292.)
//
// The user, round 295, on how the record is built: "Bandit-city jobs. New
// jobs in the bandit cities each yield a page: a manifest, a witness, a quay
// ledger. Lucy's hijack and Slice's witness contract are two of them. You
// need enough pages by Silver."
//
// Each bandit city in a surge region posts its pages in order, one live at a
// time, through its captain. A page is an ordinary contract underneath (the
// `kinds` are `_makeOffer`'s, tried in order) with the crew's framing on top,
// and it is reported to the captain in person. Two pages end on a choice: the
// clean way keeps the witness alive, the dirty way finishes the crew's job
// and counts as a civilian death (depravity.js), which is what closes the
// petition (5.9).
//
// The record is what the player trades for reinstatement at Silver (5.9). On
// the red path (5.10, next round) it is sold to the dark gods instead.
// ============================================================================

/** Pages the petition needs. Four come from Acts 1-2; the fifth from Sirukh
 *  or Elehyd. */
export const RECORD_NEED = 5;

export const RECORD_PAGES = [
  // ---- Gallowsreach (The Nek), Act 1: Lucy and Jole ----------------------
  {
    id: 'rec_nek_carts', city: 'bc_nek', who: 'lucy', kinds: ['hunt'],
    title: 'The Department\'s Carts',
    brief: 'The Roadwolves stopped a Department cart on its way out of the Nek. Something came off the back of it and ran. Kill it before somebody else finds it.',
    open: '"Lucy\'s lot took a cart off the Department last spring. Thought it was silver. It wasn\'t. Whatever was riding in the back is still out there. Kill it and you can have the paperwork."',
    done: '"Dead? Good. Here. The driver was carrying this. None of us can read the hand it\'s written in, but I know a signature when I see one."',
    page: {
      title: 'A waybill',
      text: 'Department of Essence Development to "the house at Harrowmoor". Twelve crates, sealed. Signed by Director Hallam Vesk.',
    },
  },
  {
    id: 'rec_nek_crate', city: 'bc_nek', who: 'jole', kinds: ['gather'],
    title: 'What Was in the Crate',
    brief: 'One crate from the cart is still sealed. Jole says he can read what is inside without opening it, given the right reagents.',
    open: '"The priest wants to look at the last crate. Says he needs a few things first. Get him what he asks for and keep him away from my strongbox."',
    done: '"Jole\'s been sitting with that crate all night. Ask him yourself. He wrote it all down for you."',
    page: {
      title: 'Jole\'s reading',
      text: 'The crate holds an aura and no body. It belonged to one person, and it was taken all at once. Jole wrote down a name from the ledger he was shown in the Department: one of the Thirty-Two.',
    },
  },
  // ---- Tollmarket (Ontaria), Act 2: Slice and Ariani ----------------------
  {
    id: 'rec_ont_clerk', city: 'bc_ont', who: 'slice', kinds: ['case', 'hunt'],
    title: 'Slice\'s Contract',
    brief: 'A dock clerk at Harrowmoor copied the shipping ledgers twice. Somebody paid Slice to make him disappear. Find him first.',
    open: '"Slice took a contract on a clerk. He\'s gone to ground. Find him, and then you and Slice can argue about what happens to him."',
    done: '"You found him. Slice wants to know what you\'re doing with him, and I\'d like to hear it as well."',
    page: {
      title: 'The second dock ledger',
      text: 'Every cargo through Harrowmoor written down twice. The second book lists the crates that went south to the Tolbrand quay, and who paid for the passage.',
    },
    choice: {
      prompt: 'The clerk hands over his copy of the ledger. Slice is still holding the contract.',
      clean: { label: 'Put him on a boat south', reply: 'The clerk goes south with a forged name and your money. Slice tears the contract in half and says he will be billing you for it.' },
      dirty: { label: 'Let Slice finish the contract', reply: 'Slice finishes it quietly. The ledger is yours, and the clerk is one more name nobody will look for.' },
    },
  },
  {
    id: 'rec_ont_carter', city: 'bc_ont', who: 'ariani', kinds: ['hunt'],
    title: 'Sold Twice',
    brief: 'Ariani sold a Department carter to two buyers. The second buyer did not send a person to collect her. Kill what it sent.',
    open: '"Ariani sold a carter twice and is very pleased with herself. The second buyer has sent something to collect. Deal with it, and the carter is yours to sort out."',
    done: '"The thing\'s dead and the carter\'s still breathing. Ariani says she\'ll take whatever you decide. She\'s smiling, so be careful."',
    page: {
      title: 'The carter\'s account',
      text: 'She drove the Department\'s carts from Harrowmoor to the quay. She was paid in Division scrip, and she kept one of the notes.',
    },
    choice: {
      prompt: 'The carter has told you everything she knows. The second buyer is still owed a delivery.',
      clean: { label: 'Let her go', reply: 'She leaves before anybody can change their mind. Ariani watches her go and says it was almost interesting.' },
      dirty: { label: 'Deliver her to the buyer', reply: 'The buyer takes her and pays well. Nobody sees her again.' },
    },
  },
  // ---- Shareholt (Sirukh), Act 2.5 -------------------------------------------
  {
    id: 'rec_sir_quay', city: 'bc_sir', who: null, kinds: ['supply', 'gather'],
    title: 'The Quay\'s Other Book',
    brief: 'Hask the Divider holds the Tolbrands\' debt book. He will part with it for goods, not coin.',
    open: '"The Tolbrands owe everybody. I keep the book that says who. You want it? Bring me what I ask for. Coin is for people who can\'t count."',
    done: '"A fair trade. Read the last page first. Everyone does."',
    page: {
      title: 'The Tolbrand debt book',
      text: 'The quay, the warehouse and the ships are all mortgaged to one lender. The lender\'s mark is the one on the carter\'s scrip.',
    },
  },
  // ---- Cinderwatch (Elehyd), Act 3 -------------------------------------------
  {
    id: 'rec_ele_drivers', city: 'bc_ele', who: null, kinds: ['den', 'hunt'],
    title: 'The Ashcart Drivers',
    brief: 'The Ashcart crew drove convoys to the reduction site until the drivers stopped coming back. Clear the den on the convoy road where they were last seen.',
    open: '"My drivers ran carts for somebody who paid too well. Then they stopped coming back. Clear the den on the convoy road and you can have their schedules."',
    done: '"So that\'s where they went. Take the schedules. I don\'t want them in my house."',
    page: {
      title: 'The convoy schedule',
      text: 'A run every ninth day from the reduction site, loaded at night. The column marked "wastage" is signed by the overseer.',
    },
  },
  {
    id: 'rec_ele_lastrun', city: 'bc_ele', who: null, kinds: ['hunt'],
    title: 'The Last Run',
    brief: 'One convoy went somewhere other than the reduction site. The thing guarding its tracks is still out there.',
    open: '"One run went west instead of in. The thing that drove it back is still on the road. Kill it and read the last waybill yourself."',
    done: '"West. Past where the maps stop. I don\'t want to know what for."',
    page: {
      title: 'The last waybill',
      text: 'One convoy, marked for "the West Base", past the edge of the Bratugal maps. The cargo line is blank.',
    },
  },
];

export const RECORD_BY_ID = Object.fromEntries(RECORD_PAGES.map(p => [p.id, p]));

/** Each city's pages, in the order its captain posts them. */
export const RECORD_BY_CITY = RECORD_PAGES.reduce((o, p) => {
  (o[p.city] = o[p.city] || []).push(p);
  return o;
}, {});

/** The player's record, created on first read. */
export function recordState(p) {
  p.divisionRecord = p.divisionRecord || { pages: [], cursor: {}, choices: {} };
  const r = p.divisionRecord;
  r.pages = r.pages || []; r.cursor = r.cursor || {}; r.choices = r.choices || {};
  return r;
}

/** The next page a city's captain has to offer, or null. */
export function nextRecordPage(p, cityId) {
  const list = RECORD_BY_CITY[cityId] || [];
  const r = recordState(p);
  return list[r.cursor[cityId] || 0] || null;
}

export function recordPagesHeld(p) { return recordState(p).pages.length; }
export function recordComplete(p) { return recordPagesHeld(p) >= RECORD_NEED; }

/** The quest id of a page's contract. */
export function recordQuestId(page) { return `record|${page.city}|${page.id}`; }

/** Nothing here disagrees with itself. */
export function recordFaults(cities = null) {
  const out = [];
  const seen = new Set();
  for (const p of RECORD_PAGES) {
    if (seen.has(p.id)) out.push(`${p.id}: duplicate`);
    seen.add(p.id);
    if (cities && !cities.includes(p.city)) out.push(`${p.id}: no city ${p.city}`);
    if (!p.kinds || !p.kinds.length) out.push(`${p.id}: no contract kind`);
    for (const f of ['title', 'brief', 'open', 'done']) if (!p[f]) out.push(`${p.id}: no ${f}`);
    if (!p.page || !p.page.title || !p.page.text) out.push(`${p.id}: no page`);
    if (p.choice && (!p.choice.clean || !p.choice.dirty)) out.push(`${p.id}: a choice needs both ways`);
  }
  if (RECORD_PAGES.length < RECORD_NEED) out.push('fewer pages than the petition needs');
  // Acts 1-2 alone must not be enough: the fifth page is the reason to go on.
  const early = RECORD_PAGES.filter(p => p.city === 'bc_nek' || p.city === 'bc_ont').length;
  if (early >= RECORD_NEED) out.push('Acts 1-2 alone complete the record');
  return out;
}
