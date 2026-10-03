// ===========================================================================
// ROUND 201 (items 4.5-4.7, 5, 6) -- THE BINDING TABLE.
//
// The user's rulings:
//
//   4.5 "interact becomes L2+up on D pad"
//   4.6 "Up on D pad becomes cycle through targeting allies"
//   4.7 "down on the d pad becomes cycle through enemies"
//   5   "Add the ability to keybind L2+R1, R2+R1, L2+L1, R2+R1, L2 + R2 + R1,
//        and L2 + R2 + L1."
//   6   "increase the cap on active abilities to 16, with a minimum of 10"
//   6.1 "the ability bar across the bottom should size dynamically based on the
//        number of keybound abilities"
//
// WHY THIS IS A DATA MODULE. Before this round the bindings lived in three
// places that had to agree and had no way of checking: `WorldScene.PAD` (the
// button indices), the `addKeys` table (the keyboard), and a hand-written HTML
// table in the Controls tab that RESTATED both in prose. Two of the three were
// already wrong -- the Controls tab still described D-pad up as interact on a
// pad where it is not, and the potion binding was read from a hard-coded pair
// rather than from the POTION_SLOTS table that exists to hold it.
//
// So the table is the source and the three surfaces read it. `hotkeyFaults`
// then asserts the properties that the old arrangement could not: that no two
// actions claim the same chord, that every slot has both a key and a pad
// address, and that the Controls tab is generated rather than transcribed.
//
// ---------------------------------------------------------------------------
// ONE NOTE ON ITEM 5, because it changes what got built.
//
// The user listed six chords and `R2+R1` appears twice, so the list as written
// names FIVE distinct ones. Read as a typo for `R2+L1` it names six, which is
// the reading taken here because it completes the obvious pattern -- each of
// L2 and R2 crossed with each of L1 and R1, plus the two triple-modifier
// chords. If it was not a typo, `PAD_CHORDS` is one row to delete.
//
// Six new chords on top of the twelve existing addresses is EIGHTEEN, and item
// 6 caps the bar at sixteen. Rather than leave two chords dead, the two
// triple-modifier ones drive the two HAND BINDS -- the left- and right-hand
// ability overrides that have existed since round 41 and have never had a pad
// address at all. So all six chords bind something, the bar is sixteen, and
// nothing in the scheme is decoration.
// ===========================================================================

/** W3C standard-gamepad button indices. The names are the ones on the pad. */
export const PAD = {
  A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  DUP: 12, DDOWN: 13, DLEFT: 14, DRIGHT: 15, TOUCHPAD: 17,
};

/** The two modifier triggers, in the order a chord names them. */
export const MODIFIERS = ['L2', 'R2'];

// ===========================================================================
// THE ABILITY ADDRESSES.
//
// Slots 1-12 are UNCHANGED -- same face buttons, same modifiers, same number
// keys -- because a player who has spent two hundred rounds learning that R2+X
// is slot 11 should not have to relearn it to gain four more slots.
// ===========================================================================

/** One address: which buttons must be held, and which pressed. */
const chord = (mods, button, key, label) => ({ mods, button, key, label });

export const PAD_CHORDS = [
  // 1-4: the bare face buttons.
  chord([], 'A', 'ONE', 'A'), chord([], 'B', 'TWO', 'B'),
  chord([], 'X', 'THREE', 'X'), chord([], 'Y', 'FOUR', 'Y'),
  // 5-8: L2 and a face button.
  chord(['L2'], 'A', 'FIVE', 'L2+A'), chord(['L2'], 'B', 'SIX', 'L2+B'),
  chord(['L2'], 'X', 'SEVEN', 'L2+X'), chord(['L2'], 'Y', 'EIGHT', 'L2+Y'),
  // 9-12: R2 and a face button.
  chord(['R2'], 'A', 'NINE', 'R2+A'), chord(['R2'], 'B', 'ZERO', 'R2+B'),
  chord(['R2'], 'X', 'MINUS', 'R2+X'), chord(['R2'], 'Y', 'PLUS', 'R2+Y'),
  // ---- ROUND 201, 13-16: a modifier and a SHOULDER ------------------------
  // The shoulders are the action button here, with the triggers as modifiers,
  // so bare L1 and R1 keep their weapon swings: the modifier is tested first
  // and a held trigger means the press was never a swing.
  //
  // The keys are F1-F4. The number row is full at twelve and Shift is already
  // sprint, so a chorded number key would fire a slot and a sprint together.
  chord(['L2'], 'R1', 'F1', 'L2+R1'), chord(['R2'], 'R1', 'F2', 'R2+R1'),
  chord(['L2'], 'L1', 'F3', 'L2+L1'), chord(['R2'], 'L1', 'F4', 'R2+L1'),
];

/** The two triple-modifier chords, which drive the hand binds rather than a
 *  bar slot. See the header. */
export const HAND_CHORDS = [
  { hand: 'right', mods: ['L2', 'R2'], button: 'R1', key: 'F6', label: 'L2+R2+R1' },
  { hand: 'left', mods: ['L2', 'R2'], button: 'L1', key: 'F7', label: 'L2+R2+L1' },
];

/** Item 6: the bar holds at most this many.
 *  ROUND 285 (item 13) -- and the floor is gone. "It's not dynamic; it shows
 *  every potential slot. With 8 abilities it should only show 8 slots." */
export const HOTBAR_MAX = 16;
export const HOTBAR_MIN = 0;

/**
 * 6.1 -- how many cells the bar draws, given the bound slots.
 *
 * Sized off the HIGHEST BOUND INDEX rather than off the COUNT of bound
 * abilities, and the difference is the whole of the requirement: a player who
 * has deliberately left slots 2 and 3 empty and bound slot 11 still needs
 * eleven cells, because slot 11 is where their ability is. Counting instead
 * would renumber their bar under them every time they unbound something.
 */
/**
 * ROUND 285 (item 13) -- THE BAR IS AS LONG AS WHAT IS ON IT.
 *
 * Round 201 sized the bar off the highest bound index, so a gap left by an
 * unbound or hand-bound ability stayed on screen as an empty cell, and ten
 * cells was the floor however few abilities there were. The user's rule is
 * the count: eight abilities, eight cells. So the bar is PACKED -- every
 * binding slides left over any hole -- and a key that is also a hand bind
 * leaves the bar (it lives on L1/R1 now). `drop` is those hand keys, plus any
 * key the caller no longer knows.
 */
export function compactHotbar(hotbar = [], drop = () => false) {
  const seen = new Set();
  const out = [];
  for (const k of hotbar.slice(0, HOTBAR_MAX)) {
    if (!k || seen.has(k) || drop(k)) continue;
    seen.add(k);
    out.push(k);
  }
  while (out.length < HOTBAR_MAX) out.push(null);
  return out;
}

export function hotbarSlotCount(hotbar = []) {
  let last = -1;
  for (let i = 0; i < Math.min(hotbar.length, HOTBAR_MAX); i++) if (hotbar[i]) last = i;
  return Math.max(HOTBAR_MIN, Math.min(HOTBAR_MAX, last + 1));
}

/** The key label for a slot ("1", "-", "F1"), as the bar prints it. */
export const KEY_LABEL = {
  ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7',
  EIGHT: '8', NINE: '9', ZERO: '0', MINUS: '-', PLUS: '=',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F6: 'F6', F7: 'F7',
  OPEN_BRACKET: '[', CLOSED_BRACKET: ']', TAB: 'Tab', Q: 'Q', E: 'E', R: 'R',
};
export const hotbarKeyLabels = () => PAD_CHORDS.map(c => KEY_LABEL[c.key] || c.key);
export const hotbarPadLabels = () => PAD_CHORDS.map(c => c.label);

// ===========================================================================
// THE D-PAD, REDEALT (items 4.5-4.7).
//
// Before: up was interact (on a pad with no touchpad) and down toggled the
// aura. The user has taken both for targeting, so interact moves onto a
// modifier and the aura toggle follows it there. L2 is the modifier for both,
// which keeps the pair on the same finger and leaves R2 free.
//
// The touchpad keeps interact where a pad has one -- it has been the primary
// interact since round 27 and the user's ruling is about the D-PAD, not about
// taking the touchpad away.
// ===========================================================================

export const DPAD_ACTIONS = [
  { mods: ['L2'], button: 'DUP', action: 'interact', label: 'L2 + D-pad ↑', key: 'E' },
  { mods: ['L2'], button: 'DDOWN', action: 'auraToggle', label: 'L2 + D-pad ↓', key: 'R' },
  { mods: [], button: 'DUP', action: 'cycleAlly', label: 'D-pad ↑', key: 'Q' },
  { mods: [], button: 'DDOWN', action: 'cycleEnemy', label: 'D-pad ↓', key: 'TAB' },
  { mods: [], button: 'DLEFT', action: 'potionLeft', label: 'D-pad ←', key: 'OPEN_BRACKET' },
  { mods: [], button: 'DRIGHT', action: 'potionRight', label: 'D-pad →', key: 'CLOSED_BRACKET' },
];

/** Every chord in the scheme, as one list, for collision checking. */
export function allChords() {
  return [
    ...PAD_CHORDS.map((c, i) => ({ ...c, what: `slot ${i + 1}` })),
    ...HAND_CHORDS.map(c => ({ ...c, what: `${c.hand}-hand bind` })),
    ...DPAD_ACTIONS.map(c => ({ ...c, what: c.action })),
  ];
}

/** A chord's identity: the modifiers it needs, sorted, plus its button. */
export const chordId = (c) => `${[...(c.mods || [])].sort().join('+')}|${c.button}`;

/**
 * Does the held-modifier state match this chord EXACTLY? Exactly is the
 * operative word and it is what makes the scheme unambiguous: with L2 and R2
 * both down, `L2+R1` must NOT fire -- only `L2+R2+R1` may. A subset test
 * would fire three chords on one press.
 */
export function chordMatches(c, held) {
  for (const m of MODIFIERS) {
    const want = (c.mods || []).includes(m);
    if (!!held[m] !== want) return false;
  }
  return true;
}

/** The one chord a press of `button` means, given what is held. Null if
 *  nothing claims it. */
export function chordFor(button, held, chords = allChords()) {
  for (const c of chords) if (c.button === button && chordMatches(c, held)) return c;
  return null;
}

// ===========================================================================
// THE CONTROLS TAB, GENERATED.
//
// The tab used to be hand-written HTML restating this scheme in prose, and it
// had drifted -- it described D-pad up as interact on a pad where it is the
// touchpad. A generated list cannot drift, which is the whole reason for it.
// ===========================================================================

export function controlsRows() {
  const rows = [];
  const span = (a, b) => `${a}–${b}`;
  rows.push(['Move', 'W A S D / arrows', 'Left stick']);
  rows.push(['Attack (left / right hand)', 'Left click / right click or Space', 'L1 / R1']);
  rows.push([`Cast abilities ${span(1, 4)}`, span('1', '4'), 'A B X Y']);
  rows.push([`Cast abilities ${span(5, 8)}`, span('5', '8'), 'L2 + face']);
  rows.push([`Cast abilities ${span(9, 12)}`, '9 0 - =', 'R2 + face']);
  rows.push([`Cast abilities ${span(13, 16)}`, span('F1', 'F4'), 'L2/R2 + L1/R1']);
  for (const h of HAND_CHORDS) {
    rows.push([`Cast ${h.hand}-hand bind`, KEY_LABEL[h.key] || h.key, h.label]);
  }
  for (const d of DPAD_ACTIONS) {
    rows.push([CONTROL_LABELS[d.action] || d.action, KEY_LABEL[d.key] || d.key, d.label]);
  }
  rows.push(['Target: previous enemy', 'Shift + Tab', '—']);
  // ROUND 269 -- two new ways in: pointing at a body, and folding a familiar
  // into your aura. The pad half of subsume shares D-pad left with the first
  // potion; L2 decides which it meant, as it does for the aura toggle.
  rows.push(['Target what you click', 'Left or right click on a body', '—']);
  rows.push(['Subsume familiars into your aura (toggle)', 'H', 'L2 + D-pad ←']);
  // No pad address for clearing: every face button is a slot, and a target
  // drops itself when it dies, leaves range or is forgotten (targeting.js), so
  // a pad player never needs one.
  rows.push(['Clear target', 'Esc', '—']);
  return rows;
}

// ===========================================================================
// ROUND 242 -- A CONTROL HINT IS A FACT ABOUT THE TABLE, NOT A SENTENCE.
//
// Bug, in the user's words: "the aura toggle has changed, it's no longer D pad
// down but Aura-Adept Serevin doesn't know yet and is providing bad advice."
// He was right, and the mechanism is the third of this project's recurring
// fault classes: a hand-maintained restatement sitting beside the generator.
// `DPAD_ACTIONS` moved the toggle to L2 + D-pad down in round 224 -- the
// controls tab followed, because `controlsRows()` reads the table -- and two
// strings of dialogue in WorldScene kept saying "D-pad down, or R." Nothing
// could have caught it: both were true when written, and a lexical guard for
// "D-pad down" would have to know which of the two D-pad-down chords the
// sentence meant.
//
// So the hint stops being prose. `controlHint('auraToggle')` derives it from
// the same row `controlsRows()` prints, which means a future rebinding changes
// Serevin's line in the same edit -- and if the action loses its binding
// entirely the hint says so instead of naming a button that does nothing.
// ===========================================================================

/**
 * How to perform `action`, as a player-facing phrase: "L2 + D-pad ↓, or R".
 * Read off `DPAD_ACTIONS`, so it cannot drift from the binding. Returns null
 * when the action has no binding at all, so a caller can drop the sentence
 * rather than print an empty one.
 */
export function controlHint(action) {
  const d = DPAD_ACTIONS.find(c => c.action === action);
  if (!d) return null;
  const key = KEY_LABEL[d.key] || d.key;
  if (d.label && key) return `${d.label}, or ${key}`;
  return d.label || key || null;
}

export const CONTROL_LABELS = {
  interact: 'Interact / talk / doors',
  auraToggle: 'Project / retract aura',
  cycleAlly: 'Target: next ally',
  cycleEnemy: 'Target: next enemy',
  potionLeft: 'Potion (left slot)',
  potionRight: 'Potion (right slot)',
};

// ===========================================================================
// FAULTS.
// ===========================================================================

export function hotkeyFaults() {
  const out = [];

  // --- the cap and the floor, as the user set them ------------------------
  if (HOTBAR_MAX !== 16) out.push(`the ability cap is ${HOTBAR_MAX}, the ruling says 16`);
  // ROUND 285 -- the ruling changed: "8 abilities means 8 slots", so no floor.
  if (HOTBAR_MIN !== 0) out.push(`the bar's floor is ${HOTBAR_MIN}, the ruling says 0`);
  if (PAD_CHORDS.length !== HOTBAR_MAX) out.push(`${PAD_CHORDS.length} pad addresses for ${HOTBAR_MAX} slots`);

  // --- no two things claim the same chord ---------------------------------
  const seen = new Map();
  for (const c of allChords()) {
    const id = chordId(c);
    if (seen.has(id)) out.push(`${c.what} and ${seen.get(id)} both answer ${id}`);
    else seen.set(id, c.what);
  }

  // --- every slot has BOTH addresses, and no duplicates in either ---------
  const keys = new Set(), labels = new Set();
  PAD_CHORDS.forEach((c, i) => {
    if (!c.key) out.push(`slot ${i + 1} has no keyboard key`);
    if (!c.label) out.push(`slot ${i + 1} has no pad label`);
    if (!KEY_LABEL[c.key]) out.push(`slot ${i + 1}'s key ${c.key} has no printable label`);
    if (keys.has(c.key)) out.push(`two slots share the key ${c.key}`);
    if (labels.has(c.label)) out.push(`two slots share the pad label ${c.label}`);
    keys.add(c.key); labels.add(c.label);
  });
  for (const h of HAND_CHORDS) {
    if (keys.has(h.key)) out.push(`the ${h.hand}-hand bind shares a key with a slot`);
    keys.add(h.key);
  }

  // --- slots 1-12 did not move --------------------------------------------
  const wasPad = ['A', 'B', 'X', 'Y', 'L2+A', 'L2+B', 'L2+X', 'L2+Y', 'R2+A', 'R2+B', 'R2+X', 'R2+Y'];
  const wasKey = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  for (let i = 0; i < 12; i++) {
    if (PAD_CHORDS[i].label !== wasPad[i]) out.push(`slot ${i + 1} moved from ${wasPad[i]} to ${PAD_CHORDS[i].label}`);
    if (KEY_LABEL[PAD_CHORDS[i].key] !== wasKey[i]) out.push(`slot ${i + 1}'s key moved from ${wasKey[i]}`);
  }

  // --- the six chords the user asked for all exist ------------------------
  const want = ['L2+R1', 'R2+R1', 'L2+L1', 'R2+L1', 'L2+R2+R1', 'L2+R2+L1'];
  const have = new Set([...PAD_CHORDS, ...HAND_CHORDS].map(c => c.label));
  for (const w of want) if (!have.has(w)) out.push(`the chord ${w} is not bindable`);

  // --- resolution is EXACT, which is what keeps the triples usable --------
  const both = { L2: true, R2: true };
  const lonely = { L2: true, R2: false };
  const r1both = chordFor('R1', both);
  if (!r1both || r1both.label !== 'L2+R2+R1') out.push(`R1 with both triggers held resolves to ${r1both && r1both.label}`);
  const r1l2 = chordFor('R1', lonely);
  if (!r1l2 || r1l2.label !== 'L2+R1') out.push(`R1 with L2 held resolves to ${r1l2 && r1l2.label}`);
  // A bare shoulder press claims no chord at all, which is what leaves the
  // weapon swing alone.
  if (chordFor('R1', { L2: false, R2: false })) out.push('a bare R1 is claimed by a chord, so it can no longer swing');
  if (chordFor('L1', { L2: false, R2: false })) out.push('a bare L1 is claimed by a chord, so it can no longer swing');
  // And a bare face button still casts slot 1-4.
  const aBare = chordFor('A', { L2: false, R2: false });
  if (!aBare || aBare.what !== 'slot 1') out.push('a bare A no longer casts slot 1');

  // --- the D-pad went where the user put it -------------------------------
  const dpad = (button, held) => chordFor(button, held, DPAD_ACTIONS);
  const up = dpad('DUP', { L2: false, R2: false });
  if (!up || up.action !== 'cycleAlly') out.push('D-pad up does not cycle allies');
  const down = dpad('DDOWN', { L2: false, R2: false });
  if (!down || down.action !== 'cycleEnemy') out.push('D-pad down does not cycle enemies');
  const inter = dpad('DUP', { L2: true, R2: false });
  if (!inter || inter.action !== 'interact') out.push('interact is not on L2 + D-pad up');
  // The aura toggle had to go somewhere when down was taken; it must not have
  // been silently dropped.
  if (!DPAD_ACTIONS.some(d => d.action === 'auraToggle')) out.push('the aura toggle lost its pad binding entirely');

  // --- 6.1: the bar sizes off the highest bound index ----------------------
  if (hotbarSlotCount([]) !== HOTBAR_MIN) out.push('an empty bar is not at its floor');
  // ROUND 285 -- four bound abilities, four cells.
  if (hotbarSlotCount(new Array(4).fill('x')) !== 4) out.push('four bound abilities do not draw four cells');
  const sparse = new Array(16).fill(null); sparse[10] = 'x';
  if (hotbarSlotCount(sparse) !== 11) out.push('a gap in the bar renumbers the slots after it');
  if (hotbarSlotCount(new Array(16).fill('x')) !== HOTBAR_MAX) out.push('a full bar is not at the cap');
  const over = new Array(24).fill('x');
  if (hotbarSlotCount(over) !== HOTBAR_MAX) out.push('a save with more than sixteen bound draws more than sixteen cells');

  // --- the Controls tab is generated, and covers the scheme ---------------
  const text = controlsRows().map(r => r.join(' ')).join(' | ');
  for (const w of want) if (!text.includes(w) && !text.includes('L2/R2 + L1/R1')) out.push(`the controls list never mentions ${w}`);
  for (const a of Object.keys(CONTROL_LABELS)) {
    if (!text.includes(CONTROL_LABELS[a])) out.push(`the controls list never mentions ${a}`);
  }
  if (text.includes('Touchpad (or D-pad up)')) out.push('the controls list still describes the old D-pad interact');

  return out;
}
