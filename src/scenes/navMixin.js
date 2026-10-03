// ============================================================================
// ROUND 292 -- PATHING, IN THE SCENE.
//
//   "1) It's time to start working on pathing for all NPCs."
//
// data/navGrid.js is the search. This file is what the search walks on and
// how a mover asks for a way:
//
//   THE GRID   a tile is blocked where nothing may stand: water and lava (a
//              separate bit, so a flier or a water-walker can ignore it), the
//              void, painted solid tiles, every static obstacle's disc
//              (buildings' tiles are already solid), every forest tree -- the
//              full list, not the viewport's pooled few -- and inside the
//              interior district, the rooms' walls and furniture. Built a
//              64x64-tile chunk at a time, on first ask, and dropped when the
//              static grid is rebuilt.
//   THE STEPS  between two open tiles, the elevation field decides: up a
//              ledge only by a ramp or a climb (or `climb` levels for a wall
//              runner), down one only for a body that can drop (`drop`).
//   THE AIM    `_navAim(agent, x, y, gx, gy, opts)` is the one call a mover
//              makes. It answers the point to walk toward right now: the goal
//              itself when the straight line to it is clear, otherwise the
//              next corner of a path, which it keeps on the agent and replans
//              when the goal moves or the path goes stale. Null means "no way
//              found (or not this frame)", and the mover does what it always
//              did. So a mover's own step -- its collision, its unsticking,
//              its animation -- is untouched; only where it aims changes.
//   THE BUDGET searches share a per-frame budget of expansions, so a crowd
//              that all lose sight of the player at once spreads its thinking
//              over a few frames instead of stalling one.
// ============================================================================
import { TILE } from '../data/iso.js';
import { MAP_TILES_TOTAL } from '../data/regions.js';
import { isWaterTile } from '../data/town.js';
import { insideInteriorDistrict, TILE_VOID } from '../data/interiors.js';
import { findPath, lineClear, smoothPath } from '../data/navGrid.js';

const N = MAP_TILES_TOTAL;
export const NAV_CHUNK = 64;
/** A body this wide is assumed when rasterising discs: a tile is blocked
 *  when its centre is within an obstacle's radius plus this. */
export const NAV_BODY = 12;
/** Expansions shared by every search in one frame. */
export const NAV_FRAME_BUDGET = 12000;
/** One search's own ceiling. */
export const NAV_SEARCH_MAX = 5000;
/** A path is replanned when the goal has moved this far from where it was. */
export const NAV_REPLAN_MOVE = 72;
/** ...or when it is this old (ms). */
export const NAV_REPLAN_AGE = 3500;
/** After a failed search, this long before the same agent tries again (ms). */
export const NAV_FAIL_WAIT = 900;
/** A waypoint counts as reached within this distance. */
export const NAV_REACH = 18;
/** Calls without closing on a waypoint before it is given up. */
export const NAV_STALL_CALLS = 24;
/** How long (ms) a clear-line answer is reused while nothing has moved much. */
export const NAV_CLEAR_HOLD = 200;
/** Guards further than this from the player patrol as they always did. */
export const NAV_GUARD_RADIUS = 1600;

const BIT_SOLID = 1, BIT_WATER = 2;

export const NavMixin = {
  /** Drop every cached chunk -- the static world changed. */
  _navInvalidate() {
    this._navChunks = new Map();
    this._navTreeTiles = null;
    this._navVersion = (this._navVersion || 0) + 1;
  },

  /** Every forest tree's trunk, as the tiles it blocks. Built once. */
  _navTrees() {
    if (this._navTreeTiles) return this._navTreeTiles;
    const set = new Set();
    const add = (t) => {
      if (!t) return;
      const r = (t.radius || 10) + NAV_BODY;
      const tx0 = Math.floor((t.x - r) / TILE), tx1 = Math.floor((t.x + r) / TILE);
      const ty0 = Math.floor((t.y - r) / TILE), ty1 = Math.floor((t.y + r) / TILE);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
        if (Math.hypot(cx - t.x, cy - t.y) < r) set.add(ty * N + tx);
      }
    };
    for (const t of (this.forestTrees || [])) add(t);
    this._navTreeTiles = set;
    return set;
  },

  /** One 64x64 chunk of blocked bits, built on first ask. */
  _navChunk(ckx, cky) {
    if (!this._navChunks) this._navInvalidate();
    const key = cky * 4096 + ckx;
    let c = this._navChunks.get(key);
    if (c) return c;
    c = new Uint8Array(NAV_CHUNK * NAV_CHUNK);
    const tx0 = ckx * NAV_CHUNK, ty0 = cky * NAV_CHUNK;
    const tt = this.tileType;
    const solid = this._solidTiles;
    const trees = this._navTrees();
    for (let ly = 0; ly < NAV_CHUNK; ly++) {
      const ty = ty0 + ly;
      for (let lx = 0; lx < NAV_CHUNK; lx++) {
        const tx = tx0 + lx;
        const i = ly * NAV_CHUNK + lx;
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) { c[i] = BIT_SOLID; continue; }
        const k = ty * N + tx;
        const t = tt ? tt[k] : 0;
        if (t === TILE_VOID) { c[i] = BIT_SOLID; continue; }
        if (isWaterTile(t)) c[i] |= BIT_WATER;
        if ((solid && solid.has(k)) || trees.has(k)) c[i] |= BIT_SOLID;
      }
    }
    // Discs: the static obstacles near this chunk, and in the interior
    // district the rooms' own solids.
    const wx0 = tx0 * TILE, wy0 = ty0 * TILE, span = NAV_CHUNK * TILE;
    const disc = (ox, oy, r) => {
      const rr = r + NAV_BODY;
      const ax = Math.max(tx0, Math.floor((ox - rr) / TILE)), bx = Math.min(tx0 + NAV_CHUNK - 1, Math.floor((ox + rr) / TILE));
      const ay = Math.max(ty0, Math.floor((oy - rr) / TILE)), by = Math.min(ty0 + NAV_CHUNK - 1, Math.floor((oy + rr) / TILE));
      for (let ty = ay; ty <= by; ty++) for (let tx = ax; tx <= bx; tx++) {
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
        if (Math.hypot(cx - ox, cy - oy) < rr) c[(ty - ty0) * NAV_CHUNK + (tx - tx0)] |= BIT_SOLID;
      }
    };
    if (this._staticNear) {
      const mid = span / 2;
      for (const o of this._staticNear(wx0 + mid, wy0 + mid, mid * 1.5)) {
        if (!o || o.hw > 0) continue;
        if (o.x < wx0 - 160 || o.x > wx0 + span + 160 || o.y < wy0 - 160 || o.y > wy0 + span + 160) continue;
        disc(o.x, o.y, o.radius || 0);
      }
    }
    if (insideInteriorDistrict(wx0 + 1, wy0 + 1) || insideInteriorDistrict(wx0 + span - 1, wy0 + span - 1)
        || insideInteriorDistrict(wx0 + span / 2, wy0 + span / 2)) {
      for (const s of (this.interiorSolids || [])) {
        if (s.x < wx0 - 200 || s.x > wx0 + span + 200 || s.y < wy0 - 200 || s.y > wy0 + span + 200) continue;
        disc(s.x, s.y, s.radius || 0);
      }
    }
    this._navChunks.set(key, c);
    return c;
  },

  /** The bits for one tile. */
  _navBits(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return BIT_SOLID;
    const ckx = Math.floor(tx / NAV_CHUNK), cky = Math.floor(ty / NAV_CHUNK);
    return this._navChunk(ckx, cky)[(ty - cky * NAV_CHUNK) * NAV_CHUNK + (tx - ckx * NAV_CHUNK)];
  },

  /** A blocked(tx, ty) callback for these options. */
  _navBlockedFn(opts = {}, goalTx = null, goalTy = null) {
    const water = !!opts.water;
    return (tx, ty) => {
      // The goal's own tile is always open: whoever is being walked to may
      // stand against a trunk or a wall, and the last step is the mover's.
      if (tx === goalTx && ty === goalTy) return false;
      const b = this._navBits(tx, ty);
      return (b & BIT_SOLID) !== 0 || (!water && (b & BIT_WATER) !== 0);
    };
  },

  /** A step(ax, ay, bx, by) callback: the elevation field's rules, or null
   *  when there is no elevation to ask. */
  _navStepFn(opts = {}) {
    const elev = this._elev;
    if (!elev || !elev.box) return null;
    const drop = !!opts.drop, climb = opts.climb || 0;
    const h = TILE / 2, K = 4;
    // Walked in quarter-tile steps, the way a body actually crosses it: a
    // ramp rises a whole level over a couple of tiles, so centre to centre is
    // more than a ledge step while every small step along it is not.
    return (ax, ay, bx, by) => {
      let px = ax * TILE + h, py = ay * TILE + h;
      const dx = (bx - ax) * TILE / K, dy = (by - ay) * TILE / K;
      for (let k = 0; k < K; k++) {
        const nx = px + dx, ny = py + dy;
        if (!elev.stepAllowed(px, py, nx, ny, drop, null, climb)) return false;
        px = nx; py = ny;
      }
      return true;
    };
  },

  /** Frame start: the search budget refills. */
  _navFrame() { this._navBudget = NAV_FRAME_BUDGET; },

  /**
   * A path from one world point to another, as world waypoints (the start
   * excluded), or null when nothing was found or the frame's budget is spent.
   * `.complete` on the array says whether it reaches the goal.
   */
  _navFind(x, y, gx, gy, opts = {}) {
    if (this._navBudget == null) this._navBudget = NAV_FRAME_BUDGET;
    if (this._navBudget < 400) return null;
    const sx = Math.floor(x / TILE), sy = Math.floor(y / TILE);
    const tx = Math.floor(gx / TILE), ty = Math.floor(gy / TILE);
    const blocked = this._navBlockedFn(opts, tx, ty);
    const step = this._navStepFn(opts);
    let best = null;
    // Tight first; a wider window if the tight one could not get round.
    for (const pad of [12, 48]) {
      const max = Math.min(NAV_SEARCH_MAX, this._navBudget);
      if (max < 400) break;
      const r = findPath({ sx, sy, gx: tx, gy: ty, blocked, step, maxExpand: max, pad, maxWindow: opts.window || 180 });
      this._navBudget -= r.expanded;
      this._navSearches = (this._navSearches || 0) + 1;
      if (r.path && (!best || r.complete)) best = r;
      if (r.complete) break;
    }
    if (!best || !best.path || best.path.length < 2) return null;
    // Smoothing never cuts across a change of height: on a ramp or a drop the
    // path keeps its tile-by-tile corners, which the search already walked in
    // small steps, instead of a shortcut a body could not follow.
    const elev = this._elev;
    const flatStep = step && elev
      ? (ax, ay, bx, by) => step(ax, ay, bx, by) && !elev.isRamp(ax, ay) && !elev.isRamp(bx, by)
        && elev.tileHeight(ax, ay) === elev.tileHeight(bx, by)
      : step;
    const sm = smoothPath(best.path, blocked, flatStep);
    const out = sm.slice(1).map(([px, py]) => ({ x: (px + 0.5) * TILE, y: (py + 0.5) * TILE }));
    // The last point is the goal itself when the path reaches its tile.
    if (best.complete && out.length) out[out.length - 1] = { x: gx, y: gy };
    out.complete = best.complete;
    return out;
  },

  /** Is the straight way from here to there open, ledges included? */
  _navClear(x, y, gx, gy, opts = {}) {
    const sx = Math.floor(x / TILE), sy = Math.floor(y / TILE);
    const tx = Math.floor(gx / TILE), ty = Math.floor(gy / TILE);
    if (sx === tx && sy === ty) return true;
    return lineClear(sx, sy, tx, ty, this._navBlockedFn(opts, tx, ty), this._navStepFn(opts));
  },

  /**
   * THE ONE CALL A MOVER MAKES. Where should `agent`, standing at (x, y) and
   * wanting (gx, gy), walk toward right now? The goal itself when the way is
   * clear; the next corner of a path otherwise; null when no way was found
   * (the mover then does what it always did).
   */
  _navAim(agent, x, y, gx, gy, opts = {}) {
    if (!agent) return null;
    const now = (this.time && this.time.now) || 0;
    const st = agent._nav || (agent._nav = { path: null, i: 0, gx: 0, gy: 0, t: -1e9, failT: -1e9, ver: 0 });
    if (st.ver !== this._navVersion) { st.path = null; st.ver = this._navVersion; }
    // Clear line: straight at it, and forget any old path. The answer is
    // kept for a fifth of a second while the goal stays put, so a patrol or a
    // crowd is not re-tracing the same line every frame.
    const sameGoal = Math.abs((st.clearGx || 0) - gx) < 24 && Math.abs((st.clearGy || 0) - gy) < 24;
    let clear;
    if (sameGoal && now - (st.clearT || -1e9) < NAV_CLEAR_HOLD && Math.hypot(x - st.clearX, y - st.clearY) < 24) clear = st.clear;
    else {
      clear = this._navClear(x, y, gx, gy, opts);
      st.clear = clear; st.clearT = now; st.clearGx = gx; st.clearGy = gy; st.clearX = x; st.clearY = y;
    }
    if (clear) { st.path = null; agent._navUsed = false; return { x: gx, y: gy }; }
    const moved = Math.hypot(st.gx - gx, st.gy - gy);
    const fresh = st.path && st.i < st.path.length && moved < NAV_REPLAN_MOVE && now - st.t < NAV_REPLAN_AGE;
    if (!fresh) {
      if (now - st.failT < NAV_FAIL_WAIT) return null;
      const path = this._navFind(x, y, gx, gy, opts);
      if (!path || !path.length) { st.failT = now; st.path = null; return null; }
      st.path = path; st.i = 0; st.gx = gx; st.gy = gy; st.t = now;
      agent._navPaths = (agent._navPaths || 0) + 1;
    }
    // Past the waypoints already reached, and past any the agent can already
    // see beyond (it may have been pushed along).
    while (st.i < st.path.length - 1 && Math.hypot(st.path[st.i].x - x, st.path[st.i].y - y) < NAV_REACH) st.i++;
    if (st.i < st.path.length - 1 && this._navClear(x, y, st.path[st.i + 1].x, st.path[st.i + 1].y, opts)) st.i++;
    // A waypoint the body is not closing on (a rock the grid let through, a
    // push from a fight) is given up after a short while: the next one, or,
    // at the end of the path, a fresh search.
    const wd = Math.hypot(st.path[st.i].x - x, st.path[st.i].y - y);
    // Measured against the CLOSEST it has been to this waypoint, so a body
    // rocking back and forth still counts as not getting there.
    if (st.lastI !== st.i) { st.lastI = st.i; st.bestD = wd; st.stall = 0; }
    else if (wd < st.bestD - 0.5) { st.bestD = wd; st.stall = 0; }
    else st.stall = (st.stall || 0) + 1;
    if (st.stall > NAV_STALL_CALLS) {
      st.stall = 0;
      if (st.i < st.path.length - 1) st.i++;
      else { st.path = null; st.failT = now; agent._navUsed = false; return null; }
    }
    agent._navUsed = true;
    return st.path[st.i];
  },

  /**
   * ROUND 292 -- ONE STEP FOR A PERSON WHO IS AFTER SOMEBODY. The sewer
   * cultist, the realm camps, the road bandits, the bandit towns, the
   * evaluation camps and the hunters all had the same three lines: a straight
   * step at the target, refused outright by a wall or water, no sidestep and
   * no way round. They share this now: the path's next corner when the
   * straight way is blocked, the step, and one sidestep either way before
   * standing still. Returns true when the body moved.
   */
  _personStep(c, tx, ty, step, r = 12) {
    const aim = (this._navAim && this._navAim(c, c.x, c.y, tx, ty, {})) || { x: tx, y: ty };
    const ax = aim.x - c.x, ay = aim.y - c.y;
    const ad = Math.hypot(ax, ay) || 1;
    const ux = ax / ad, uy = ay / ad;
    const len = Math.min(step, ad);
    const free = (x, y) => !this._collidesObstacle(x, y, r) && !this._isWaterAt(x, y);
    for (const [vx, vy] of [[ux, uy], [ux - uy, uy + ux], [ux + uy, uy - ux]]) {
      const n = Math.hypot(vx, vy) || 1;
      const nx = c.x + (vx / n) * len, ny = c.y + (vy / n) * len;
      if (free(nx, ny)) { c.x = nx; c.y = ny; return true; }
    }
    return false;
  },
};
