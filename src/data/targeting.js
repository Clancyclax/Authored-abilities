// ===========================================================================
// ROUND 201 (items 4.1-4.4) -- TAB TARGETING.
//
// The user:
//
//   "Players need a way to see which enemy is targeted, and to jump between
//    targets."
//   4.1 "I'd like to implement tab targeting. Like World of Warcraft does."
//   4.2 "Targets have a small circle around the base of their feet to indicate
//        they are targeted."
//   4.3 "Targeted enemies have a small frame popup, providing additional
//        details."
//   4.4 "This also allows for more perception powers such as identified
//        weaknesses, healthbar, resistances on the target frame."
//
// Before this round the game had NO notion of a current target -- I checked
// for one and there is not a single reference to `currentTarget`,
// `selectedTarget`, `lockOn` or a target ring anywhere in the source. Every
// ability re-ran its own proximity query at the moment it fired
// (`_nearestMonsterInCone`, `_nearestMonsterWithin`), which has a consequence
// worth stating because it is a real bug the player can see: a single cast
// resolves its fx, its condition and its damage in three separate queries, so
// a bolt could burn one creature and curse another.
//
// So this is not only a convenience. A current target gives every one of those
// call sites ONE answer to "who do you mean", and the cone query becomes the
// fallback for when nothing is selected rather than the authority.
//
// ---------------------------------------------------------------------------
// WHY THE CYCLE ORDER IS SCREEN-SPACE AND NOT DISTANCE.
//
// WoW's tab cycles through what is in front of you, and "in front of you" on a
// screen is a two-dimensional idea. Ordering by world distance instead reads
// as random the moment two creatures are a similar distance away at different
// bearings, because the order changes under your feet as you walk.
//
// The order here is LEFT TO RIGHT in projected screen space, which on an
// isometric map is stable while you move, matches what the player is looking
// at, and makes a second press of Tab always move the ring the same direction.
// Distance breaks a tie, so two bodies on the same screen column resolve
// nearest-first.
// ===========================================================================

/** How far a body may be and still be tabbable, in world units. Tuned to a
 *  little beyond the widest ability range so that anything you could hit is
 *  selectable and nothing off-screen is. */
export const TARGET_RANGE = 520;

/**
 * ROUND 242 -- THE OUTER CAP, BESIDE THE ON-SCREEN TEST THAT REPLACED IT.
 *
 * The user: "Targeting should allow targeting any enemy or ally onscreen.
 * Abilities may or may not cast due to range."
 *
 * `TARGET_RANGE`'s comment above is the tell: it is trying to say "on screen"
 * in world units, and a distance cannot say that, because how much world is on
 * screen is a property of the CAMERA. At the overworld's 2.5x zoom the visible
 * half-diagonal measures 453 against this 520, so the radius happens to cover
 * the view. At `INTERIOR_ZOOM` it does not, and `RENDER_SCALE` moves it again
 * -- renderScale.js exists precisely because that zoom is a knob.
 *
 * So `_targetCandidates` tests the camera's own `worldView` now, and this is
 * what remains of the radius: a generous ceiling, so that a pathological
 * zoom-out cannot offer the entire map as tab targets. It is deliberately much
 * larger than `TARGET_RANGE` was -- it is no longer doing the work, it is only
 * catching the absurd case.
 *
 * Kept ABOVE `TARGET_DROP_RANGE` for the reason `targetingFaults` already
 * checks between those two: a body that can be acquired and is then instantly
 * dropped makes the tab key flicker.
 */
export const TARGET_SELECT_CAP = 1600;

/** The ring at the target's feet (item 4.2). Drawn in projected space, so it
 *  is an ellipse with the map's own 2:1 ratio rather than a circle -- a true
 *  circle on an isometric floor reads as a hoop standing on edge. */
export const RING_BASE_W = 30;
export const RING_RATIO = 0.5;
/** Grows with the body so a ring on a boar and a ring on a drake both sit at
 *  the feet rather than inside them. */
export const RING_RADIUS_MULT = 1.9;
export const RING_ENEMY_COLOR = 0xff5252;
export const RING_ALLY_COLOR = 0x66bb6a;
/** The ring breathes rather than blinking: a hard flash at 2Hz beside a
 *  health bar that also changes is two moving things competing. */
export const RING_PULSE_HZ = 0.9;
export const RING_ALPHA = [0.45, 0.85];

/** A target is dropped when it dies, when it leaves this range, or when the
 *  player has not acted on it for this long. The idle drop is what stops a
 *  stale ring sitting on something across the map after a fight. */
export const TARGET_DROP_RANGE = 760;
export const TARGET_IDLE_DROP_S = 12;

/** Which sides can be cycled, and on which control (items 4.6 and 4.7). */
export const TARGET_SIDES = ['enemy', 'ally'];

// ===========================================================================
// THE CYCLE.
// ===========================================================================

/**
 * Order a candidate list the way Tab will walk it.
 *
 * `project(body)` returns {x, y} in screen space; `from` is the player's world
 * position. Both are injected rather than imported so this file has no
 * dependency on the scene, the camera or Phaser -- which is what lets a suite
 * check the cycle with plain objects.
 */
export function targetOrder(bodies, project, from) {
  return bodies
    .map((b) => {
      const p = project(b);
      const d = Math.hypot((b.wx ?? b.x) - from.x, (b.wy ?? b.y) - from.y);
      return { b, sx: p.x, sy: p.y, d };
    })
    .sort((a, z) => (a.sx - z.sx) || (a.d - z.d))
    .map(e => e.b);
}

/**
 * The next target in the cycle. `dir` is +1 or -1.
 *
 * Pressing Tab with nothing selected takes the NEAREST rather than the
 * leftmost, because the first press is "give me something to hit" and every
 * press after it is "give me the next one". Getting this wrong is the
 * difference between Tab feeling like a selector and feeling like a lottery.
 */
export function cycleTarget(ordered, current, dir = 1, nearest = null) {
  if (!ordered.length) return null;
  const i = ordered.indexOf(current);
  if (i < 0) return nearest && ordered.includes(nearest) ? nearest : ordered[dir > 0 ? 0 : ordered.length - 1];
  const n = ordered.length;
  return ordered[((i + dir) % n + n) % n];
}

/** Is this target still valid? Returns the reason it is not, for the caller
 *  to log -- a target that vanishes with no reason is a bug report. */
export function targetInvalidReason(t, from, sinceActedS) {
  if (!t) return 'none';
  if (t.alive === false || (t.hp != null && t.hp <= 0)) return 'dead';
  const d = Math.hypot((t.wx ?? t.x) - from.x, (t.wy ?? t.y) - from.y);
  if (d > TARGET_DROP_RANGE) return 'range';
  if (sinceActedS > TARGET_IDLE_DROP_S) return 'idle';
  return null;
}

// ===========================================================================
// THE TARGET FRAME (items 4.3 and 4.4).
//
// 4.4 is the interesting half: "This also allows for more perception powers
// such as identified weaknesses, healthbar, resistances on the target frame."
//
// The frame is where a perception FINALLY HAS SOMEWHERE TO PUT A SENTENCE.
// Until now every sense had to express itself as a mark drawn over a creature
// in the world -- a ring, an outline, a triangle, at most a floating word --
// because there was no panel that belonged to one creature. That constraint is
// why `SENSE_FIELDS_PENDING` has sixteen entries: sixteen fields the sense
// tables set and NOTHING READS. That is this project's oldest fault class,
// "written by one side, read by none", and five of them are closed here by
// giving them a row.
//
// EACH ROW NAMES THE SENSE THAT GRANTS IT, and a player with no perception at
// all still gets the top two rows -- name and health bar. A frame that showed
// nothing without a sense would be a frame most builds never see.
// ===========================================================================

/**
 * The frame's rows, in display order. `mods` is `player.passiveMods`.
 *
 * Every row is {key, label, value, sense}. `sense` is the field that unlocked
 * it, or null for the two that are always there -- which is what lets the UI
 * mark a row as "this is your perception talking" and lets `targetingFaults`
 * assert that every gated row actually names a real sense field.
 */
export function targetFrameRows(t, mods = {}, ctx = {}) {
  if (!t) return [];
  const rows = [];
  const push = (key, label, value, sense = null) => {
    if (value == null || value === '') return;
    rows.push({ key, label, value, sense });
  };

  // --- always on -----------------------------------------------------------
  push('name', 'Name', t.name || (t.type && t.type.name) || 'Unknown');
  push('rank', 'Rank', t.rankLabel || (t.type && t.type.rank) || null);
  const frac = (t.hp != null && t.maxHp) ? Math.max(0, Math.min(1, t.hp / t.maxHp)) : null;
  push('health', 'Health', frac == null ? null : `${Math.round(frac * 100)}%`);

  // --- perception ----------------------------------------------------------
  // `deathWatch` -- "you can see how much is left, exactly".
  if (mods.deathWatch && t.hp != null) {
    push('exact', 'Remaining', `${Math.max(0, Math.round(t.hp))} / ${Math.round(t.maxHp || 0)}`, 'deathWatch');
  }
  // `weakspotCrit` -- the element it takes worst.
  if (mods.weakspotCrit && ctx.weakness) {
    push('weakness', 'Weak to', ctx.weakness, 'weakspotCrit');
  }
  // `flawSight` -- "the flaws in a thing stand out". The NAMED flaw, which is
  // more than the element: a creature can be weak to fire and separately have
  // a cracked shell.
  if (mods.flawSight && ctx.flaw) {
    push('flaw', 'Flaw', ctx.flaw, 'flawSight');
  }
  // `leySight` -- "magic is visible, and so is whoever is holding it". The
  // user asked for resistances on the frame and this is the sense that means
  // it. Before this round leySight was set by two sense tables and read by
  // nothing at all.
  if (mods.leySight && ctx.resists && ctx.resists.length) {
    push('resists', 'Resists', ctx.resists.join(', '), 'leySight');
  }
  // `unmask` -- "what a thing is showing you and what it is are two different
  // things".
  if (mods.unmask && ctx.trueKind) {
    push('kind', 'Truly', ctx.trueKind, 'unmask');
  }
  // `counterSense` -- "you see who is looking at you".
  if (mods.counterSense) {
    push('aware', 'Aware of you', ctx.watching ? 'yes' : 'no', 'counterSense');
  }
  // `bondSense` -- a summon or a bonded creature, and whose.
  if (mods.bondSense && ctx.boundTo) {
    push('bond', 'Bound to', ctx.boundTo, 'bondSense');
  }
  return rows;
}

/** The sense field each optional row is gated on -- named once, so the UI, the
 *  suite and the function above cannot drift apart. */
export const FRAME_SENSE_ROWS = {
  exact: 'deathWatch', weakness: 'weakspotCrit', flaw: 'flawSight',
  resists: 'leySight', kind: 'unmask', aware: 'counterSense', bond: 'bondSense',
};
/** The rows every player sees, perception or not. */
export const FRAME_BASE_ROWS = ['name', 'rank', 'health'];

// ===========================================================================
// FAULTS.
// ===========================================================================

export function targetingFaults() {
  const out = [];
  const project = (b) => ({ x: b.sx, y: 0 });
  const from = { x: 0, y: 0 };
  const mk = (id, sx, d) => ({ id, sx, wx: d, wy: 0, alive: true, hp: 10, maxHp: 10 });
  const a = mk('a', 10, 100), b = mk('b', 20, 40), c = mk('c', 30, 300);

  // --- the order is left to right, and distance only breaks ties ----------
  const ord = targetOrder([c, a, b], project, from);
  if (ord.map(x => x.id).join('') !== 'abc') out.push(`the cycle order is ${ord.map(x => x.id).join('')}, not left to right`);
  const tied = targetOrder([mk('far', 5, 400), mk('near', 5, 20)], project, from);
  if (tied[0].id !== 'near') out.push('two bodies on the same screen column do not resolve nearest-first');

  // --- the cycle wraps, both ways, and never stalls -----------------------
  if (cycleTarget(ord, a, 1) !== b) out.push('tab does not advance');
  if (cycleTarget(ord, c, 1) !== a) out.push('tab does not wrap forwards');
  if (cycleTarget(ord, a, -1) !== c) out.push('tab does not wrap backwards');
  if (cycleTarget([], null, 1) !== null) out.push('cycling an empty list invents a target');
  if (cycleTarget([a], a, 1) !== a) out.push('cycling a list of one loses the target');

  // --- the FIRST press takes the nearest, every press after it walks ------
  if (cycleTarget(ord, null, 1, b) !== b) out.push('the first press does not take the nearest');
  if (cycleTarget(ord, null, 1, null) !== a) out.push('the first press with no nearest does not take the leftmost');
  // A `nearest` that is not in the list must not be selected -- it is a stale
  // answer from a query run a frame earlier.
  if (cycleTarget(ord, null, 1, mk('ghost', 0, 0)) !== a) out.push('a nearest that is not in the list is selected anyway');

  // --- a target is dropped for a reason, and the reason is named ----------
  if (targetInvalidReason({ ...a, hp: 0 }, from, 0) !== 'dead') out.push('a dead target stays selected');
  if (targetInvalidReason({ ...a, alive: false }, from, 0) !== 'dead') out.push('a despawned target stays selected');
  if (targetInvalidReason({ ...a, wx: 9999 }, from, 0) !== 'range') out.push('a target across the map stays selected');
  if (targetInvalidReason(a, from, TARGET_IDLE_DROP_S + 1) !== 'idle') out.push('a forgotten target is never dropped');
  if (targetInvalidReason(a, from, 0) !== null) out.push('a live target in reach is dropped');
  if (TARGET_DROP_RANGE <= TARGET_RANGE) out.push('a target is dropped at a shorter range than it can be acquired, so tab would flicker');
  // ROUND 242 -- and the same rule for the cap that replaced the radius as the
  // acquisition limit. A cap below the drop range would acquire a body the
  // dropper immediately lets go of, which is the same flicker one screen along.
  if (TARGET_SELECT_CAP < TARGET_DROP_RANGE) out.push('the selection cap is inside the drop range, so tab would flicker');

  // --- the frame -----------------------------------------------------------
  const t = { name: 'Slagward Drake', rankLabel: 'Bronze', hp: 42, maxHp: 120 };
  const bare = targetFrameRows(t, {});
  if (bare.map(r => r.key).join(',') !== FRAME_BASE_ROWS.join(',')) {
    out.push(`a player with no perception sees ${bare.map(r => r.key).join(',')}`);
  }
  if (!bare.some(r => r.value === '35%')) out.push('the frame does not show a health fraction');
  const full = targetFrameRows(t, {
    deathWatch: true, weakspotCrit: true, flawSight: true, leySight: true,
    unmask: true, counterSense: true, bondSense: true,
  }, { weakness: 'frost', flaw: 'cracked shell', resists: ['fire', 'shadow'], trueKind: 'revenant', watching: true, boundTo: 'Cadence' });
  for (const [key, sense] of Object.entries(FRAME_SENSE_ROWS)) {
    const row = full.find(r => r.key === key);
    if (!row) { out.push(`the ${sense} sense has no row on the frame`); continue; }
    if (row.sense !== sense) out.push(`the ${key} row says it comes from ${row.sense}, not ${sense}`);
  }
  // Every gated row names a field the sense tables actually set -- checked by
  // the suite against perception.js, which this file deliberately does not
  // import (see the header).
  if (full.find(r => r.key === 'exact').value !== '42 / 120') out.push('deathWatch does not print exact numbers');
  // A sense that is ON but has nothing to say prints nothing rather than a
  // blank row -- "Resists:" with an empty value is worse than no line.
  const noCtx = targetFrameRows(t, { leySight: true, flawSight: true, weakspotCrit: true }, {});
  if (noCtx.some(r => ['resists', 'flaw', 'weakness'].includes(r.key))) {
    out.push('a sense with nothing to report still prints an empty row');
  }
  // counterSense is the exception and deliberately so: "no" is information.
  const aware = targetFrameRows(t, { counterSense: true }, { watching: false });
  if (!aware.some(r => r.key === 'aware' && r.value === 'no')) {
    out.push('counterSense drops the row when the answer is no, which is the half that matters');
  }
  if (targetFrameRows(null, {}).length) out.push('a frame with no target still has rows');

  // --- the ring ------------------------------------------------------------
  if (!(RING_RATIO > 0 && RING_RATIO < 1)) out.push('the target ring is not an isometric ellipse');
  if (RING_ALPHA[0] >= RING_ALPHA[1]) out.push('the ring pulse has no range');
  return out;
}
