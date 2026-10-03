// ===========================================================================
// ROUND 157 -- A SEWER UNDER EVERY WELL.
//
// THE USER:
//   "1.5.1) Every well should have a generated sewer dungeon within."
//   "1.5.2) The sewer dungeons (other than cadence) should be stretched out
//           into a few linear branching paths as oposed to a large square
//           maze."
//   "1.5.3) Sewer dungeons should end with a mini boss of some sort (a higher
//           rank monster) and a chest of coins, potions, and equipment."
//   "1.5.5) Some sewers might connect to caves in the wild nearby and shift
//           from a sewer tile to a rough rocky tile."
//   "Build all of the well sewers."
//
// WHY THIS IS NOT caveShapes.js, WHICH ALREADY GENERATES DUNGEONS.
//
// `caveShapes.js` digs with two primitives -- a squashed disc and a line of
// discs -- and then runs a cellular smoothing pass, because a CAVE is rock and
// rock has a coastline. Every one of its five families is a blob or a ring of
// blobs, and the user's word for what he does not want is "a large square
// maze"; a large ROUND maze is no closer to "stretched out into a few linear
// branching paths".
//
// A sewer is not rock. It is dug, it is straight, and it has a fall -- so it
// is built the other way round: one SPINE that runs the length of the map with
// a water channel down the middle of it, and a handful of branches off that
// spine, each ending somewhere. No smoothing pass, because a smoothing pass is
// what turns a corridor into a cavern.
//
// FOLLOW THE WATER. Cadence's authored map (sewer.js) rests its whole design
// on one promise its header states outright: "follow the water and you are
// going the right way." That promise is free here and is kept by construction
// -- the channel runs the spine from the foot of the ladder to the boss
// chamber and appears nowhere else, so a player who walks the water arrives.
// `wellDungeonFaults` asserts it rather than trusting it.
//
//   node --input-type=module -e "import('./src/data/wellDungeonGen.js').then(m =>
//     console.log(m.wellDungeonFaults()))"
// ===========================================================================

// ===========================================================================
// ROUND 160 (item 7) -- FOUR TO SEVEN TIMES LONGER, WITH TURNS.
//
// THE USER:
//   "7) Sewers should be 4-7 times longer and should have some turns, twists,
//       and longer side corridors that sometimes link back up."
//
// MEASURED ON r159, over 24 seeds: 435 standable tiles, and 58 tiles of
// walking from the foot of the ladder to the boss. Those are the two numbers
// "longer" can mean and both are multiplied here; `wellDungeonFaults` asserts the
// band rather than trusting the arithmetic.
//
// HOW THE LENGTH IS GOT, AND WHY NOT BY MAKING THE MAP FIVE TIMES WIDER.
// A single straight run five times as long is five times as far to walk and no
// more interesting -- and a 300-wide room is a room whose two ends are never
// on screen together on any map the game draws. So the spine SERPENTINES:
// three legs across the map, joined at alternate ends, each wandering within
// its own band. That buys the distance in a room a third the width, it puts
// two hard turns in the walk by construction, and it is what makes the loops
// below possible at all -- the legs run PARALLEL, fifteen tiles apart, so a
// side corridor that goes fifteen tiles has somewhere to arrive.
//
// "SOMETIMES LINK BACK UP" IS A PROBABILITY AND THE FAULT CHECK TREATS IT AS
// ONE. Every branch that ends in a chamber is a dead end and every branch that
// reaches the next leg is a loop; the checker asserts that a spread of seeds
// produces both, because "sometimes" is false if it is always and false if it
// is never.
// ===========================================================================

/** Wide, shallow, and walked three times over. "Stretched out" was round 157's
 *  instruction and still holds: the spine runs the long axis. The height is
 *  what changed -- three legs need three bands and room between them for the
 *  side corridors to run. */
export const WELL_DUNGEON_W = 144;
export const WELL_DUNGEON_H = 44;

/** Cell codes. Deliberately NOT tile ids: this module knows nothing about
 *  `TILE_VOID` and friends (importing interiors.js from here would close the
 *  same cycle caveShapes.js documents), so the caller maps these four. */
export const S_ROCK = 0;    // undug
export const S_WALK = 1;    // brick walkway
export const S_WATER = 2;   // the channel
export const S_CAVE = 3;    // item 1.5.5 -- past the brick, into the rock

/** The spine is five tiles across with a one-tile channel down the middle, so
 *  there are two tiles of walkway either side of the water. Cadence's is the
 *  same shape and for the same reason: a channel you can see across but not
 *  walk in is what makes "follow the water" a direction rather than a path. */
const SPINE_HALF = 2;
/** A branch is three across and dry. Narrower than the spine, so at a junction
 *  it is obvious which one is the main run -- which is the whole of how a
 *  branching layout stays legible without a map. */
const BRANCH_HALF = 1;

/** THE SERPENTINE. Three legs and two turns. Two legs is a hairpin and reads
 *  as one corridor folded; four in forty-four rows leaves nine tiles between
 *  bands, which is not enough for a side corridor to be a corridor. */
const SPINE_LEGS = 3;
/** Where each leg's band sits, and how far it may wander inside it. The bands
 *  are fifteen rows apart and the wander is three either way, so the closest
 *  two legs ever come is nine rows -- five of spine apiece leaves four rows of
 *  rock between them, which is a wall rather than a seam. */
const LEG_GAP = 15;
const LEG_WANDER = 3;
/** How much of the map's width a leg crosses. The turn at each end needs room
 *  for the connector to be a corner rather than a diagonal smear. */
const LEG_X0 = 6, LEG_X1 = WELL_DUNGEON_W - 8;

/** Four to seven side corridors, each much longer than round 157's. The old
 *  seven-to-eleven was a stub off a corridor; "longer side corridors" is the
 *  ask, and at fifteen tiles between legs a branch has to be able to reach
 *  one. */
const BRANCH_MIN = 4, BRANCH_MAX = 7;
const BRANCH_LEN = [14, 26];
/** How often a side corridor runs on and joins the next leg instead of ending
 *  in its chamber. Not 0 and not 1: see the note above on "sometimes". */
const LOOP_CHANCE = 0.58;
/** ...and how far along its own leg a FORWARD loop may start. See the note at
 *  the junction below: a forward loop is a shortcut, and one offered at the
 *  head of a leg skips the leg. */
const LOOP_FORWARD_FROM = 0.55;
const CHAMBER_R = 3.2;
/** The boss chamber at the far end. Bigger than a branch chamber, because a
 *  fight needs room to move and because arriving somewhere larger is what
 *  tells the player they have arrived. */
const BOSS_R = 5.4;

/** ROUND 159's SEWER, MEASURED, so "four to seven times longer" is a number
 *  this file can check itself against rather than a sentence in a note. Over
 *  the 24 probe seeds: 435 standable tiles, 58 tiles of walking from the foot
 *  of the ladder to the boss. */
const R159_FLOOR = 435;
const R159_WALK = 58;

// ---------------------------------------------------------------------------
// A tiny deterministic RNG. Same shape as the one in caveShapes.js and kept
// local for the same stated reason: this module must not depend on anything
// that could pull the scene in.
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngFor(seed) {
  let s = hash(seed) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const idx = (x, y) => y * WELL_DUNGEON_W + x;
const inBounds = (x, y) => x >= 1 && y >= 1 && x < WELL_DUNGEON_W - 1 && y < WELL_DUNGEON_H - 1;

/** A filled, screen-squashed disc -- the only round thing in here, and it is
 *  used for chambers rather than for passages. The 1.25 is the projection's:
 *  a circle in tile space draws as an ellipse twice as wide as it is tall, so
 *  a chamber that is to LOOK round has to be dug squat. */
function disc(g, cx, cy, r, code) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (!inBounds(x, y)) continue;
      const dx = x - cx, dy = (y - cy) * 1.25;
      if (dx * dx + dy * dy <= r2) g[idx(x, y)] = code;
    }
  }
}

/** A straight run of corridor. Rectangular, not a line of discs: a sewer is
 *  masonry and its walls are parallel. */
function corridor(g, x0, y0, x1, y1, half, code) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x0 + (x1 - x0) * t), cy = Math.round(y0 + (y1 - y0) * t);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (inBounds(cx + dx, cy + dy)) g[idx(cx + dx, cy + dy)] = code;
      }
    }
  }
}

/** A run of corridor along a polyline, which is what a wandering passage is. */
function polyCorridor(g, pts, half, code) {
  for (let i = 1; i < pts.length; i++) {
    corridor(g, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, half, code);
  }
}

/** Everything reachable on foot from one tile. Water is NOT walkable -- it is
 *  the thing you follow, not the thing you walk in -- so this is the honest
 *  question "can the player get there", which is the only one worth asking. */
function reachable(g, sx, sy) {
  const seen = new Uint8Array(g.length);
  const walkable = (i) => g[i] === S_WALK || g[i] === S_CAVE;
  if (!walkable(idx(sx, sy))) return seen;
  const stack = [[sx, sy]];
  seen[idx(sx, sy)] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= WELL_DUNGEON_W || ny >= WELL_DUNGEON_H) continue;
      const i = idx(nx, ny);
      if (seen[i] || !walkable(i)) continue;
      seen[i] = 1; stack.push([nx, ny]);
    }
  }
  return seen;
}

/** The shortest walk between two standable tiles, in tiles, or -1. This is the
 *  measure "four to seven times longer" is made against: a generator can grow
 *  its floor count without the player walking a step further, and the walk is
 *  the thing the user is describing. */
export function wellDungeonWalk(layout, from, to) {
  const { g, w, h } = layout;
  const walkable = (i) => g[i] === S_WALK || g[i] === S_CAVE;
  const start = from.ty * w + from.tx;
  if (!walkable(start)) return -1;
  const dist = new Int32Array(g.length).fill(-1);
  dist[start] = 0;
  let head = 0;
  const q = [start];
  while (head < q.length) {
    const i = q[head++];
    if (i === to.ty * w + to.tx) return dist[i];
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (dist[j] >= 0 || !walkable(j)) continue;
      dist[j] = dist[i] + 1; q.push(j);
    }
  }
  return -1;
}

const CACHE = new Map();

/**
 * DIG ONE.
 *
 * `seedKey` makes it deterministic -- a settlement's sewer is the same sewer
 * every load, which matters because a chest that moved between visits is a
 * chest the player cannot come back for.
 *
 * `opts.cave` asks for item 1.5.5's rock tail on the last branch.
 */
export function wellDungeonLayout(seedKey, opts = {}) {
  const key = `${seedKey}|${opts.cave ? 'cave' : 'brick'}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const rng = rngFor(key);
  const g = new Uint8Array(WELL_DUNGEON_W * WELL_DUNGEON_H);   // all S_ROCK

  // ---- the spine: three legs and two turns ------------------------------
  // Each leg wanders inside its own band rather than running ruled, and the
  // wander is CLAMPED to the band: a corridor that drifts wherever it likes
  // eventually meets the leg above it, and two spines that touch are one
  // wide room, which is the square maze again.
  const bandTop = Math.floor((WELL_DUNGEON_H - (SPINE_LEGS - 1) * LEG_GAP) / 2);
  const legs = [];
  for (let L = 0; L < SPINE_LEGS; L++) {
    const base = bandTop + L * LEG_GAP;
    const east = L % 2 === 0;                       // legs alternate direction
    const from = east ? LEG_X0 : LEG_X1, to = east ? LEG_X1 : LEG_X0;
    const step = east ? 1 : -1;
    const pts = [];
    let y = base;
    for (let x = from; east ? x <= to : x >= to; x += step) {
      // Drift at a third of steps, pulled back towards the band's own line so
      // the wander is a wander and not a slow diagonal.
      if (rng() < 0.34) y += (rng() < (y > base ? 0.68 : 0.32)) ? -1 : 1;
      y = Math.max(base - LEG_WANDER, Math.min(base + LEG_WANDER, y));
      y = Math.max(SPINE_HALF + 2, Math.min(WELL_DUNGEON_H - SPINE_HALF - 3, y));
      pts.push({ x, y });
    }
    legs.push({ pts, base, east });
  }
  // One polyline for the whole run, turns included, so everything downstream
  // -- the water, the walk measurement, the branch junctions -- reads the
  // spine as the single thing it is.
  const spine = [];
  for (const leg of legs) for (const p of leg.pts) spine.push(p);

  for (let i = 1; i < spine.length; i++) {
    corridor(g, spine[i - 1].x, spine[i - 1].y, spine[i].x, spine[i].y, SPINE_HALF, S_WALK);
  }

  // ---- the boss chamber, at the far end ---------------------------------
  const end = spine[spine.length - 1];
  const lastEast = legs[legs.length - 1].east;
  const boss = {
    tx: lastEast ? Math.min(WELL_DUNGEON_W - 4, end.x + 4) : Math.max(3, end.x - 4),
    ty: end.y,
  };
  disc(g, boss.tx, boss.ty, BOSS_R, S_WALK);
  corridor(g, end.x, end.y, boss.tx, boss.ty, SPINE_HALF, S_WALK);

  // ---- the side corridors -----------------------------------------------
  // Each starts on a leg and runs towards the NEXT leg's band, wandering as it
  // goes. Some of them arrive -- those are the loops -- and the rest stop
  // short in a chamber.
  const nBranch = BRANCH_MIN + Math.floor(rng() * (BRANCH_MAX - BRANCH_MIN + 1));
  const branches = [];
  let loops = 0;
  for (let b = 0; b < nBranch; b++) {
    // THE LAST CORRIDOR IS A DEAD END WHEN A CAVE IS WANTED, because a cave
    // mouth needs an end to be past. Left to the roll, one seed in twenty-four
    // came out all loops and the sewer that was supposed to open into the rock
    // had nowhere to open from -- and "asked for a cave and got none" is a
    // fault the generator can simply not have.
    const mustEnd = !!opts.cave && b === nBranch - 1;
    // Spread along the whole serpentine rather than rolled, so two branches
    // cannot land on the same junction and read as one wide room. Kept off
    // the turns, where a branch would meet two legs at once.
    const f = (b + 0.7) / (nBranch + 0.4);
    let at = spine[Math.floor(spine.length * f)];
    // Which leg is this junction on, and which neighbouring band can a
    // corridor from here reach?
    const si = Math.floor(spine.length * f);
    let legI = 0, acc = 0;
    for (let L = 0; L < legs.length; L++) {
      if (si < acc + legs[L].pts.length) { legI = L; break; }
      acc += legs[L].pts.length;
    }
    // How far along ITS OWN leg this junction is. Needed below.
    const alongLeg = (si - acc) / Math.max(1, legs[legI].pts.length);
    // Towards a neighbour when there is one, outward at the edges of the map.
    const canDown = legI < legs.length - 1, canUp = legI > 0;
    const dir = canDown && canUp ? (b % 2 === 0 ? 1 : -1) : canDown ? 1 : canUp ? -1 : (at.y > WELL_DUNGEON_H / 2 ? -1 : 1);
    const neighbourBase = legs[legI + dir] ? legs[legI + dir].base : null;
    // A LOOP has to reach; a dead end stops where its own length runs out.
    // A LOOP THAT GOES FORWARD IS A SHORTCUT, AND A SHORTCUT TAKEN EARLY IS A
    // LEG SKIPPED. Measured: with forward loops allowed anywhere, two of them
    // landing near the heads of their legs cut the walk from the ladder to the
    // boss from 250 tiles to 177 -- below the four-times band this round
    // exists to hit, on a layout that is physically five times the size. A
    // backward loop cannot shorten the way on, so it is always allowed; a
    // forward one is only offered from the last part of its own leg, where
    // taking it saves a corner rather than a corridor.
    const forward = dir === 1 ? legI < legs.length - 1 : false;
    const mayLoop = neighbourBase !== null && (!forward || alongLeg > LOOP_FORWARD_FROM);
    const loop = mayLoop && !mustEnd && rng() < LOOP_CHANCE;
    const len = loop
      ? Math.abs(neighbourBase - at.y)
      : BRANCH_LEN[0] + Math.floor(rng() * (BRANCH_LEN[1] - BRANCH_LEN[0] + 1));
    // The corridor itself, wandering in x as it goes so it is not a ruled
    // spur. A loop still has to arrive, so its last two steps run straight in.
    const pts = [{ x: at.x, y: at.y }];
    let cx = at.x;
    for (let s = 1; s <= len; s++) {
      if (s < len - 1 && rng() < 0.3) cx += rng() < 0.5 ? -1 : 1;
      cx = Math.max(3, Math.min(WELL_DUNGEON_W - 4, cx));
      const cy = Math.max(2, Math.min(WELL_DUNGEON_H - 3, at.y + dir * s));
      pts.push({ x: cx, y: cy });
    }
    polyCorridor(g, pts, BRANCH_HALF, S_WALK);
    const tip = pts[pts.length - 1];
    if (loop) loops++;
    else disc(g, tip.x, tip.y, CHAMBER_R, S_WALK);
    branches.push({ tx: tip.x, ty: tip.y, from: { tx: at.x, ty: at.y }, loop, len, pts });
  }

  // ---- item 1.5.5: out through the rock ---------------------------------
  // The last DEAD END, and only when asked -- a loop has both ends in the
  // sewer and nowhere to put a cave mouth. Its chamber and the passage beyond
  // it are recoded as cave floor, which the caller draws with the den's rock
  // tile, so the change from brick to rock happens at a place the player walks
  // through rather than at a door.
  let caveMouth = null;
  if (opts.cave) {
    const ends = branches.filter(x => !x.loop);
    const tail = ends[ends.length - 1];
    if (tail) {
      const dir = tail.ty < tail.from.ty ? -1 : 1;
      const mx = Math.max(3, Math.min(WELL_DUNGEON_W - 4, tail.tx + Math.round((rng() - 0.5) * 6)));
      const my = Math.max(2, Math.min(WELL_DUNGEON_H - 3, tail.ty + dir * 5));
      corridor(g, tail.tx, tail.ty, mx, my, BRANCH_HALF, S_CAVE);
      disc(g, mx, my, CHAMBER_R + 0.6, S_CAVE);
      // The chamber the passage leaves from turns to rock as well, so the seam
      // is a room and not a tile.
      disc(g, tail.tx, tail.ty, CHAMBER_R, S_CAVE);
      caveMouth = { tx: mx, ty: my };
    }
  }

  // ---- the foot of the ladder -------------------------------------------
  // Where the player lands, which is also where they climb out. On the
  // walkway BESIDE the channel, not in it: the spine's middle tile is water.
  const head = spine[0];
  disc(g, head.x, head.y, CHAMBER_R, S_WALK);
  const start = { tx: head.x, ty: head.y - SPINE_HALF + 1 };

  // ---- the channel, laid LAST -------------------------------------------
  // After every corridor, not straight after the spine. Round 157 laid it
  // second and then dug the branches, and a branch begins AT the spine's
  // centre line -- so every junction paved three tiles of channel over, and
  // the one navigational promise the design rests on had a gap in it at each
  // of the places a player has to choose. Nothing noticed, because the check
  // asked whether water reached the landing and the boss rather than whether
  // it was continuous between them. Laid last, it cuts through.
  for (let i = 1; i < spine.length; i++) {
    corridor(g, spine[i - 1].x, spine[i - 1].y, spine[i].x, spine[i].y, 0, S_WATER);
  }
  // ...and on to the boss chamber, stopping one short of its centre so the
  // fight is on dry brick.
  corridor(g, end.x, end.y, boss.tx - (lastEast ? 1 : -1), boss.ty, 0, S_WATER);
  // The landing is beside the channel, so make sure the tile the player
  // arrives on is walkway even after the water was cut.
  if (g[idx(start.tx, start.ty)] !== S_WALK) start.ty = head.y + SPINE_HALF - 1;

  // A LOOP'S LAST TILE CAN BE THE CHANNEL ITSELF -- it arrives at the
  // neighbouring leg, whose middle tile is water, and water is not standable.
  // So the tile recorded as that corridor's end was a tile nothing could stand
  // on, and every reachability check in this file called the corridor
  // unreachable while the player could walk it perfectly well. The corridor
  // was never the problem; the RECORDED POINT was. Resolved HERE rather than
  // where the corridor is dug, because at that moment the channel has not been
  // cut yet and the tile still reads as walkway -- which is exactly how the
  // first cut of this fix changed nothing.
  for (const b of branches) {
    if (g[idx(b.tx, b.ty)] === S_WALK || g[idx(b.tx, b.ty)] === S_CAVE) continue;
    for (let k = b.pts.length - 1; k >= 0; k--) {
      const c = g[idx(b.pts[k].x, b.pts[k].y)];
      if (c === S_WALK || c === S_CAVE) { b.tx = b.pts[k].x; b.ty = b.pts[k].y; break; }
    }
  }
  // The cave mouth has the same problem for the same reason: its chamber can
  // sit over a leg's channel. Nudged to the nearest rock floor it dug itself.
  if (caveMouth && g[idx(caveMouth.tx, caveMouth.ty)] !== S_CAVE) {
    let best = null, bd = 1e9;
    for (let ty = 0; ty < WELL_DUNGEON_H; ty++) {
      for (let tx = 0; tx < WELL_DUNGEON_W; tx++) {
        if (g[idx(tx, ty)] !== S_CAVE) continue;
        const d = Math.hypot(tx - caveMouth.tx, ty - caveMouth.ty);
        if (d < bd) { bd = d; best = { tx, ty }; }
      }
    }
    if (best) caveMouth = best;
  }

  // ---- the chest ---------------------------------------------------------
  // In the boss chamber, off to one side of it. Not at its centre, because the
  // boss stands there.
  const chest = { tx: boss.tx + 2, ty: boss.ty + 2 };
  if (g[idx(chest.tx, chest.ty)] !== S_WALK) { chest.tx = boss.tx - 2; chest.ty = boss.ty - 2; }

  // ---- and anything the digging orphaned goes back to rock ---------------
  // A branch that swung into the edge clamp can leave a pocket the player
  // cannot reach. caveShapes does the same and for the same reason: a room
  // that is drawn and cannot be entered is worse than one that was never dug.
  const seen = reachable(g, start.tx, start.ty);
  let orphaned = 0;
  for (let i = 0; i < g.length; i++) {
    if ((g[i] === S_WALK || g[i] === S_CAVE) && !seen[i]) { g[i] = S_ROCK; orphaned++; }
  }

  const out = {
    w: WELL_DUNGEON_W, h: WELL_DUNGEON_H, g,
    start, boss, chest, branches, caveMouth, orphaned, loops,
    legs: legs.length,
    spine: spine.map(p => ({ tx: p.x, ty: p.y })),
  };
  CACHE.set(key, out);
  return out;
}

/** The tile at a local coordinate, or null for "nothing special to say" --
 *  the same contract `room.tileAt` has everywhere else in this project. The
 *  four tile ids are passed in; see the note on the cell codes above. */
export function wellDungeonTileAt(layout, tx, ty, VOID, FLOOR, WATER, ROCK) {
  if (!layout || tx < 0 || ty < 0 || tx >= layout.w || ty >= layout.h) return null;
  const c = layout.g[ty * layout.w + tx];
  if (c === S_WALK) return FLOOR;
  if (c === S_WATER) return WATER;
  if (c === S_CAVE) return ROCK;
  return VOID;
}

/** Every tile the player can stand on, for the dressing, the spawns and the
 *  chest placer -- which must ask rather than roll a coordinate and hope. */
export function wellDungeonFloorTiles(layout) {
  const out = [];
  if (!layout) return out;
  for (let ty = 0; ty < layout.h; ty++) {
    for (let tx = 0; tx < layout.w; tx++) {
      const c = layout.g[ty * layout.w + tx];
      if (c === S_WALK || c === S_CAVE) out.push({ tx, ty });
    }
  }
  return out;
}

export function wellDungeonWalkable(layout, tx, ty) {
  if (!layout || tx < 0 || ty < 0 || tx >= layout.w || ty >= layout.h) return false;
  const c = layout.g[ty * layout.w + tx];
  return c === S_WALK || c === S_CAVE;
}

/**
 * THE SELF-CHECK, over a spread of seeds.
 *
 * Every claim this file's header makes, asked of the thing it generates. A
 * generator whose output is only ever looked at in a screenshot is a generator
 * that will one day ship a dungeon with its boss behind a wall.
 */
export function wellDungeonFaults(seeds) {
  const out = [];
  const walks = [];
  let loopSeeds = 0, deadSeeds = 0, nSeeds = 0;
  const keys = seeds || Array.from({ length: 24 }, (_, i) => `sewer|probe_${i}`);
  for (const k of keys) {
    for (const cave of [false, true]) {
      const L = wellDungeonLayout(k, { cave });
      const tag = `${k}${cave ? '+cave' : ''}`;
      const seen = reachable(L.g, L.start.tx, L.start.ty);
      const at = (p) => seen[p.ty * L.w + p.tx];
      if (!wellDungeonWalkable(L, L.start.tx, L.start.ty)) out.push(`${tag}: the ladder foot is not standable`);
      if (!at(L.boss)) out.push(`${tag}: the boss chamber cannot be walked to`);
      if (!at(L.chest)) out.push(`${tag}: the chest cannot be walked to`);
      for (const b of L.branches) {
        if (!at(b)) out.push(`${tag}: a branch chamber cannot be walked to`);
      }
      if (cave && L.caveMouth && !at(L.caveMouth)) out.push(`${tag}: the cave mouth cannot be walked to`);
      if (cave && !L.caveMouth) out.push(`${tag}: asked for a cave and got none`);
      if (!cave && L.caveMouth) out.push(`${tag}: a brick sewer grew a cave`);
      if (L.branches.length < BRANCH_MIN) out.push(`${tag}: ${L.branches.length} branches`);
      // FOLLOW THE WATER. The channel must run from the landing to the boss
      // chamber and must not appear anywhere else -- a second stretch of water
      // in a dead end turns the one navigational promise into a coin flip.
      let water = 0, wNearStart = 0, wNearBoss = 0;
      for (let ty = 0; ty < L.h; ty++) {
        for (let tx = 0; tx < L.w; tx++) {
          if (L.g[ty * L.w + tx] !== S_WATER) continue;
          water++;
          if (Math.hypot(tx - L.start.tx, ty - L.start.ty) < 6) wNearStart++;
          if (Math.hypot(tx - L.boss.tx, ty - L.boss.ty) < 8) wNearBoss++;
        }
      }
      if (!water) out.push(`${tag}: no channel at all`);
      if (!wNearStart) out.push(`${tag}: the channel does not reach the landing`);
      if (!wNearBoss) out.push(`${tag}: the channel does not reach the boss`);
      // ...and it is a SEWER, not a cavern: the floor should be mostly
      // corridor. A layout where the chambers outweigh the runs is the blob
      // this generator exists to avoid.
      const floor = wellDungeonFloorTiles(L).length;
      if (floor > L.w * L.h * 0.45) out.push(`${tag}: ${floor} tiles is a cavern, not a sewer`);

      // ROUND 160 (item 7) -- FOUR TO SEVEN TIMES LONGER, ASSERTED.
      //
      // Measured on r159 over these same seeds: 435 standable tiles and a
      // 58-tile walk from the ladder to the boss. Both are recorded below and
      // both are checked, because they are different claims -- a generator can
      // grow its floor without the player walking a step further.
      //
      // THE TWO ARE HELD TO DIFFERENT BANDS ON PURPOSE. The SIZE of the sewer
      // is a property of the layout and every seed must be four to seven times
      // r159's. The shortest WALK is not, because the same ask wants side
      // corridors that "link back up" and a loop is by definition a shorter
      // way round: the seeds with the most loops have the shortest critical
      // path, and forbidding that would be forbidding the loops. So the walk
      // is held at four times across the SPREAD and at three times for any one
      // seed -- and the spread check lives below, outside this loop, because a
      // per-seed check cannot say anything about a median.
      if (floor < R159_FLOOR * 4) out.push(`${tag}: ${floor} tiles is ${(floor / R159_FLOOR).toFixed(1)}x r159, under 4x`);
      if (floor > R159_FLOOR * 7) out.push(`${tag}: ${floor} tiles is ${(floor / R159_FLOOR).toFixed(1)}x r159, over 7x`);
      const walk = wellDungeonWalk(L, L.start, L.boss);
      if (walk < 0) out.push(`${tag}: the boss cannot be walked to at all`);
      else {
        walks.push(walk);
        if (walk < R159_WALK * 3) out.push(`${tag}: a ${walk}-tile walk to the boss is ${(walk / R159_WALK).toFixed(1)}x r159`);
        if (walk > R159_WALK * 7) out.push(`${tag}: a ${walk}-tile walk to the boss is ${(walk / R159_WALK).toFixed(1)}x r159, over 7x`);
      }

      // "SOMETIMES LINK BACK UP" IS A PROBABILITY. Counted across the spread
      // and judged below: always is not sometimes and never is not sometimes.
      loopSeeds += L.loops > 0 ? 1 : 0;
      deadSeeds += L.branches.some(b => !b.loop) ? 1 : 0;
      nSeeds++;
      // ...and a corridor that links back up has to actually be a second way
      // round, not a stub that touches. Its far end must be reachable without
      // passing back through its own junction.
      for (const b of L.branches.filter(x => x.loop)) {
        if (!at(b)) out.push(`${tag}: a loop's far end cannot be walked to`);
      }

      // AND THE CHANNEL MUST BE CONTINUOUS, which round 157 never asked. It
      // laid the water before digging the branches, and a branch begins on the
      // spine's centre line -- so every junction paved three tiles of channel
      // over, and "follow the water" had a gap at each of the places a player
      // has to choose. Walked here rather than counted.
      let gaps = 0, run = 0;
      for (const p of L.spine) {
        if (L.g[p.ty * L.w + p.tx] === S_WATER) { run++; continue; }
        // A turn's inside corner is not a gap: the polyline revisits a tile.
        if (run > 0) gaps++;
        run = 0;
      }
      if (gaps > 1) out.push(`${tag}: the channel is broken in ${gaps} places`);
    }
  }
  if (nSeeds) {
    const med = walks.slice().sort((a, b) => a - b)[walks.length >> 1];
    if (med < R159_WALK * 4) out.push(`the median walk to the boss is ${med}, ${(med / R159_WALK).toFixed(1)}x r159 -- under 4x`);
    if (med > R159_WALK * 7) out.push(`the median walk to the boss is ${med}, ${(med / R159_WALK).toFixed(1)}x r159 -- over 7x`);
    if (loopSeeds === 0) out.push('no layout has a corridor that links back up');
    if (loopSeeds === nSeeds) out.push('every layout links back up -- "sometimes" is not "always"');
    if (deadSeeds !== nSeeds) out.push(`${nSeeds - deadSeeds} layouts are all loops and have no dead end`);
  }
  return out;
}

/** A plain-text picture of one layout, for a probe or a report. */
export function wellDungeonAscii(layout) {
  const rows = [];
  const mark = new Map();
  mark.set(`${layout.start.tx},${layout.start.ty}`, 'S');
  mark.set(`${layout.boss.tx},${layout.boss.ty}`, 'B');
  mark.set(`${layout.chest.tx},${layout.chest.ty}`, 'C');
  if (layout.caveMouth) mark.set(`${layout.caveMouth.tx},${layout.caveMouth.ty}`, 'O');
  for (const b of layout.branches) {
    const k = `${b.tx},${b.ty}`;
    if (!mark.has(k)) mark.set(k, 'x');
  }
  for (let ty = 0; ty < layout.h; ty++) {
    let s = '';
    for (let tx = 0; tx < layout.w; tx++) {
      const m = mark.get(`${tx},${ty}`);
      if (m) { s += m; continue; }
      const c = layout.g[ty * layout.w + tx];
      s += c === S_WALK ? '.' : c === S_WATER ? '~' : c === S_CAVE ? ':' : '#';
    }
    rows.push(s);
  }
  return rows;
}
