// ============================================================================
// ROUND 292 -- PATHING.
//
//   "1) It's time to start working on pathing for all NPCs."
//
// Until now nothing in the game found a path at runtime: every mover stepped
// straight at its goal and, when something was in the way, sidestepped, gave
// up or teleported (the round-98 ruling "the user asked for loops, not for
// pathing", which this request supersedes). This file is the search itself,
// kept free of the scene so it can be tested on its own:
//
//   findPath(opts)   A* over the tile grid, 8-connected, no corner cutting,
//                    bounded to a window around the start and goal and to a
//                    number of expansions, so one search can never cost a
//                    frame. A goal outside the window, or a search that runs
//                    out of budget, returns the best PARTIAL path -- the node
//                    nearest the goal -- so the mover still makes progress.
//   smoothPath(...)  string-pulling: drop every waypoint the one before can
//                    see past, so the walk is a few straight legs rather than
//                    a staircase of tile centres.
//
// What is walkable, and which steps between tiles are allowed (ledges, ramps,
// climbs), is asked of two callbacks the scene supplies -- see navMixin.js.
// ============================================================================

/** Tiles each side of the start/goal box the search may use. */
export const NAV_WINDOW_PAD = 24;
/** Largest window side, in tiles. Past this the search is partial. */
export const NAV_WINDOW_MAX = 160;
/** Default expansion budget for one search. */
export const NAV_MAX_EXPAND = 6000;

// The eight moves: four straight (cost 1) then four diagonal (cost √2).
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];
const DC = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

/** Octile distance, the admissible heuristic for 8-way unit/√2 moves. */
export function octile(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
  return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

/**
 * A* on tiles.
 *   sx, sy, gx, gy        start and goal TILES
 *   blocked(tx, ty)       true where nothing may stand
 *   step(ax, ay, bx, by)  true when a move between two open neighbours is
 *                         allowed (ledges, climbs); default: always
 *   maxExpand, pad, maxWindow
 * Returns { path: [[tx,ty],...] from start to the reached node, complete,
 *           expanded } -- `complete` false for a partial path. `path` is null
 *           only when the start itself is enclosed.
 */
export function findPath(opts) {
  const { sx, sy, gx, gy } = opts;
  const blocked = opts.blocked;
  const step = opts.step || (() => true);
  const maxExpand = opts.maxExpand || NAV_MAX_EXPAND;
  const pad = opts.pad == null ? NAV_WINDOW_PAD : opts.pad;
  const maxW = opts.maxWindow || NAV_WINDOW_MAX;
  // The window: the start/goal box plus padding, clamped to maxW around the
  // start (a goal beyond it is reached partially, toward it).
  let x0 = Math.min(sx, gx) - pad, x1 = Math.max(sx, gx) + pad;
  let y0 = Math.min(sy, gy) - pad, y1 = Math.max(sy, gy) + pad;
  const half = Math.floor(maxW / 2);
  x0 = Math.max(x0, sx - half); x1 = Math.min(x1, sx + half);
  y0 = Math.max(y0, sy - half); y1 = Math.min(y1, sy + half);
  if (opts.bounds) {
    x0 = Math.max(x0, opts.bounds.x0); y0 = Math.max(y0, opts.bounds.y0);
    x1 = Math.min(x1, opts.bounds.x1); y1 = Math.min(y1, opts.bounds.y1);
  }
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  if (W <= 0 || H <= 0) return { path: null, complete: false, expanded: 0 };
  const N = W * H;
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  // 0 unknown, 1 open, 2 blocked -- the blocked callback asked once a tile.
  const seen = new Uint8Array(N);
  const isOpen = (lx, ly) => {
    const i = ly * W + lx;
    if (!seen[i]) seen[i] = blocked(lx + x0, ly + y0) ? 2 : 1;
    return seen[i] === 1;
  };
  const inWin = (tx, ty) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1;
  if (!inWin(sx, sy)) return { path: null, complete: false, expanded: 0 };
  // A binary heap of (f, index) in typed arrays, grown on demand.
  let cap = 1024, hn = 0;
  let heapI = new Int32Array(cap), heapF = new Float32Array(cap);
  const push = (i, f) => {
    if (hn === cap) {
      cap *= 2;
      const ni = new Int32Array(cap); ni.set(heapI); heapI = ni;
      const nf = new Float32Array(cap); nf.set(heapF); heapF = nf;
    }
    let c = hn++;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heapF[p] <= f) break;
      heapI[c] = heapI[p]; heapF[c] = heapF[p];
      c = p;
    }
    heapI[c] = i; heapF[c] = f;
  };
  const pop = () => {
    const top = heapI[0];
    hn--;
    if (hn > 0) {
      const li = heapI[hn], lf = heapF[hn];
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        if (l >= hn) break;
        const r = l + 1;
        const m = (r < hn && heapF[r] < heapF[l]) ? r : l;
        if (heapF[m] >= lf) break;
        heapI[c] = heapI[m]; heapF[c] = heapF[m];
        c = m;
      }
      heapI[c] = li; heapF[c] = lf;
    }
    return top;
  };
  const si = (sy - y0) * W + (sx - x0);
  // The start may sit on a tile the grid calls blocked (a body brushing a
  // wall); it is treated as open so the search can leave it.
  seen[si] = 1;
  g[si] = 0;
  push(si, octile(sx, sy, gx, gy));
  const goalIn = inWin(gx, gy);
  const gi = goalIn ? (gy - y0) * W + (gx - x0) : -1;
  let best = si, bestH = octile(sx, sy, gx, gy);
  let expanded = 0, complete = false;
  const costAt = opts.costAt || null;
  // Weighted A*: a touch greedy (1.2 by default) -- paths within a fifth of
  // the shortest, for far fewer expansions. 1 gives the true shortest.
  const wH = opts.weight || 1.2;
  while (hn > 0 && expanded < maxExpand) {
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    expanded++;
    if (cur === gi) { best = cur; complete = true; break; }
    const cx = cur % W, cy = (cur - cx) / W;
    const wx = cx + x0, wy = cy + y0;
    const h = octile(wx, wy, gx, gy);
    if (h < bestH) { bestH = h; best = cur; }
    const gc = g[cur];
    for (let d = 0; d < 8; d++) {
      const dx = DX[d], dy = DY[d];
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (closed[ni]) continue;
      if (!isOpen(nx, ny)) continue;
      // No corner cutting: a diagonal needs both of its orthogonals open.
      if (d >= 4 && (!isOpen(cx + dx, cy) || !isOpen(cx, cy + dy))) continue;
      if (!step(wx, wy, nx + x0, ny + y0)) continue;
      const ng = gc + DC[d] * (costAt ? costAt(nx + x0, ny + y0) : 1);
      if (ng >= g[ni]) continue;
      g[ni] = ng; came[ni] = cur;
      push(ni, ng + wH * octile(nx + x0, ny + y0, gx, gy));
    }
  }
  const out = [];
  for (let i = best; i !== -1; i = came[i]) {
    const lx = i % W, ly = (i - lx) / W;
    out.push([lx + x0, ly + y0]);
    if (i === si) break;
  }
  out.reverse();
  return { path: out, complete, expanded };
}

/**
 * Can a straight walk go from tile A to tile B? Samples the segment at
 * quarter-tile steps; every tile it enters must be open and every change of
 * tile an allowed step. Used by the smoother and by a mover's "can I see
 * my goal?" test.
 */
export function lineClear(ax, ay, bx, by, blocked, step = null) {
  const dx = bx - ax, dy = by - ay;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 4));
  let px = ax, py = ay;
  for (let k = 1; k <= n; k++) {
    const fx = ax + (dx * k) / n, fy = ay + (dy * k) / n;
    const tx = Math.round(fx), ty = Math.round(fy);
    if (tx === px && ty === py) continue;
    if (blocked(tx, ty)) return false;
    // A diagonal crossing between tiles must not clip a blocked corner.
    if (tx !== px && ty !== py && (blocked(tx, py) || blocked(px, ty))) return false;
    if (step && !step(px, py, tx, ty)) return false;
    px = tx; py = ty;
  }
  return true;
}

/** String-pulling over a tile path. Keeps the first and last points. */
export function smoothPath(path, blocked, step = null) {
  if (!path || path.length <= 2) return path ? path.slice() : path;
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !lineClear(path[i][0], path[i][1], path[j][0], path[j][1], blocked, step)) j--;
    out.push(path[j]);
    i = j;
  }
  return out;
}

/** Nothing here disagrees with itself: a small maze solved both ways. */
export function navFaults() {
  const out = [];
  // A 12x7 room with a wall down the middle and one gap at the bottom.
  const W = 12, H = 7;
  const wall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || (x === 6 && y < 6);
  const r = findPath({ sx: 1, sy: 1, gx: 10, gy: 1, blocked: wall });
  if (!r.complete) out.push('the maze has a way round and the search did not find it');
  else if (!r.path.some(([x, y]) => x === 6 && y === 6)) out.push('the path did not go through the gap');
  const sm = smoothPath(r.path, wall);
  if (!(sm.length >= 3 && sm.length < r.path.length)) out.push('smoothing should keep the corner and drop the rest');
  const shut = (x, y) => wall(x, y) || (x === 6 && y === 6);
  const p = findPath({ sx: 1, sy: 1, gx: 10, gy: 1, blocked: shut });
  if (p.complete) out.push('a sealed wall must not be walked through');
  // A ledge: stepping from x=3 to x=4 is refused, only the ramp row allows it.
  const ledge = (ax, ay, bx, by) => !((ax === 3 && bx === 4) || (ax === 4 && bx === 3)) || (ay === 5 && by === 5);
  const L = findPath({ sx: 1, sy: 1, gx: 8, gy: 1, blocked: (x, y) => x < 0 || y < 0 || x >= W || y >= H, step: ledge });
  if (!L.complete || !L.path.some(([x, y]) => y === 5)) out.push('a ledge should send the path round by the ramp');
  return out;
}
