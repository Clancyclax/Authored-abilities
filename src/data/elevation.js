// ============================================================================
// ROUND 285 (item 18) -- ELEVATION: raised ground, ledges and the ways up.
//
//   "Start adding elevation to maps, so gliding lets players jump off ledges."
//
// THE SHAPE, and it is deliberately a first step rather than a terrain engine:
//
//   * A PLATEAU is a blob of tiles one level above the ground, and a large
//     one may carry a second level on its crown. Levels are whole numbers;
//     iso.js draws each level ELEV_PX higher.
//   * A RAMP is the way up: a two-tile flight of steps off one edge, whose
//     height falls smoothly from the plateau to the ground along its length.
//     Walking is allowed wherever the ground under your feet changes by less
//     than a step (LEDGE_STEP) between one footfall and the next -- so a ramp
//     is walkable in both directions and a cliff is not.
//   * A LEDGE is any other edge. You cannot climb one. You cannot walk off one
//     either -- unless you are GLIDING (the Cloak of Night's glide or flight,
//     or Dragon Wings), in which case you jump off and glide down.
//
// This module is pure: it plans plateaus against a `free(tx, ty)` predicate
// the scene supplies (so it never places a cliff across a road, a building or
// a river) and answers height questions. The scene draws and enforces.
// ============================================================================

export const LEDGE_STEP = 0.3;          // the most height one footfall may change
export const PLATEAUS_PER_REGION = 14;
export const RAMP_LEN = 8;              // tiles of earth ramp per level (the user: "8 tiles per level")
export const DIRS = { S: [0, 1], E: [1, 0], N: [0, -1], W: [-1, 0] };
export const RAMP_WIDTH = 2;

/** A small deterministic PRNG, so a region's high ground is the same every
 *  time the world is built. */
export function elevRng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (Math.imul(s ^ ch.charCodeAt(0), 2654435761) >>> 0);
  s = s || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * The height field. Sparse -- a Map of raised tiles -- because a plateau
 * covers a few hundred tiles of a four-million-tile world, and `height` is
 * asked for every object drawn every frame.
 */
export class ElevationField {
  constructor(mapTiles, tile) {
    this.N = mapTiles;
    this.T = tile;
    this.level = new Map();     // tile index -> whole level of the ground there
    this.ramp = new Map();      // tile index -> ramp descriptor
    this.plateaus = [];
    this.box = null;            // bounding box of everything raised, in tiles
    this.cue = new Set();       // top tiles tinted to show a hidden flight below
    this.climbs = new Map();    // "a|b" tile-index pairs joined by a ladder or vines -> style
    this.bridges = new Map();   // tile index -> deck level (a rope bridge over lower ground)
  }

  _grow(tx, ty) {
    const b = this.box;
    if (!b) { this.box = { x0: tx, y0: ty, x1: tx, y1: ty }; return; }
    if (tx < b.x0) b.x0 = tx; if (tx > b.x1) b.x1 = tx;
    if (ty < b.y0) b.y0 = ty; if (ty > b.y1) b.y1 = ty;
  }

  setLevel(tx, ty, L) {
    const k = ty * this.N + tx;
    if (L > (this.level.get(k) || 0)) this.level.set(k, L);
    this._grow(tx, ty);
  }

  levelAt(tx, ty) { return this.level.get(ty * this.N + tx) || 0; }

  /** Set a tile's level outright (an authored map may lower as well as raise). */
  setExact(tx, ty, L) {
    const k = ty * this.N + tx;
    if (L > 0) this.level.set(k, L); else this.level.delete(k);
    this.ramp.delete(k);
    this._grow(tx, ty);
  }

  /** An authored ramp over a tile rectangle, running DOWNHILL toward `dir`. */
  addRamp(x, y, w, h, dir, hi, lo, style = 'ramp') {
    const T = this.T;
    const desc = dir === 'S' ? { axis: 'y', sign: 1, from: y * T, len: h * T }
      : dir === 'N' ? { axis: 'y', sign: -1, from: (y + h) * T, len: h * T }
        : dir === 'E' ? { axis: 'x', sign: 1, from: x * T, len: w * T }
          : { axis: 'x', sign: -1, from: (x + w) * T, len: w * T };
    Object.assign(desc, { hi, lo, style });
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) { this.ramp.set(ty * this.N + tx, desc); this._grow(tx, ty); }
    }
    return desc;
  }

  /** A ladder or vines up a cliff face, joining the top tile and the tile at
   *  its foot. Walkable both ways whatever the drop. */
  addClimb(tx, ty, fx, fy, style = 'ladder') {
    const a = ty * this.N + tx, b = fy * this.N + fx;
    this.climbs.set(`${a}|${b}`, style);
    this.climbs.set(`${b}|${a}`, style);
    this._grow(tx, ty); this._grow(fx, fy);
  }

  /** A rope bridge deck at `deck` over tile (tx, ty). */
  addBridge(tx, ty, deck) { this.bridges.set(ty * this.N + tx, deck); this._grow(tx, ty); }
  isBridge(tx, ty) { return this.bridges.has(ty * this.N + tx); }

  climbAt(tx, ty, fx, fy) { return this.climbs.get(`${ty * this.N + tx}|${fy * this.N + fx}`) || null; }

  rampStyle(tx, ty) { const r = this.ramp.get(ty * this.N + tx); return r ? (r.style || 'ramp') : null; }

  /** Height (in levels) of the ground at a world point. Continuous on a ramp,
   *  whole everywhere else. */
  height(wx, wy, fromH = null) {
    if (!this.box) return 0;
    const tx = Math.floor(wx / this.T), ty = Math.floor(wy / this.T);
    const b = this.box;
    if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) return 0;
    const k = ty * this.N + tx;
    // A rope bridge is its deck to anyone arriving at deck height, and the
    // ground under it to anyone walking below (round 286).
    if (this.bridges.size) {
      const deck = this.bridges.get(k);
      if (deck != null) return (fromH != null && fromH < deck - LEDGE_STEP) ? (this.level.get(k) || 0) : deck;
    }
    const r = this.ramp.get(k);
    if (r) {
      // Along the ramp's axis: `hi` at `from`, falling to `lo` over `len`.
      const along = r.axis === 'x' ? (wx - r.from) * r.sign : (wy - r.from) * r.sign;
      const f = Math.max(0, Math.min(1, along / r.len));
      return r.hi + (r.lo - r.hi) * f;
    }
    return this.level.get(k) || 0;
  }

  /** The height a tile is DRAWN at: its centre's height. A ramp tile draws as
   *  a step, which is what a flight of steps looks like. */
  tileHeight(tx, ty) {
    return this.height((tx + 0.5) * this.T, (ty + 0.5) * this.T);
  }

  isRamp(tx, ty) { return this.ramp.has(ty * this.N + tx); }

  /** Can something move from one point to the next on foot? `glide` lets it
   *  go down any drop, never up one. */
  stepAllowed(x0, y0, x1, y1, glide = false, fromH = null, climb = 0) {
    if (!this.box) return true;
    const h0 = this.height(x0, y0, fromH), h1 = this.height(x1, y1, h0);
    const d = h1 - h0;
    if ((d > LEDGE_STEP || d < -LEDGE_STEP) && this.climbs.size) {
      const T = this.T;
      const a = Math.floor(y0 / T) * this.N + Math.floor(x0 / T), b = Math.floor(y1 / T) * this.N + Math.floor(x1 / T);
      if (a !== b && this.climbs.has(`${a}|${b}`)) return true;
    }
    // ROUND 287 -- `climb`: a wall run or a step on air takes a ledge up to
    // that many levels (Instant Adept's wall-running, and round 288's).
    if (d > LEDGE_STEP) return d <= climb;
    if (d < -LEDGE_STEP) return !!glide;
    return true;
  }
}

/**
 * Plan a region's plateaus.
 *
 * `free(tx, ty)` answers whether a tile may be raised (open natural ground,
 * nothing built or placed on it). A plateau is kept only if every tile it
 * would raise -- and a margin around it, and its steps and their landing --
 * is free, so a cliff never cuts a road, a yard or a camp in half.
 */
export function planPlateaus(region, bounds, free, rand, count = PLATEAUS_PER_REGION, centreOk = null, opts = {}) {
  count = count || PLATEAUS_PER_REGION;
  const out = [];
  const taken = [];
  const MARGIN = 3;
  let tries = 0;
  while (out.length < count && tries < count * 60) {
    tries++;
    const blockedW = opts.blocked || (() => false);
    const pickC = opts.pickCentre ? opts.pickCentre(rand) : null;
    if (opts.pickCentre && !pickC) { if (opts.stats) opts.stats.noCentre = (opts.stats.noCentre || 0) + 1; continue; }
    const cx = pickC ? pickC[0] : Math.floor(bounds.x0 + 60 + rand() * (bounds.x1 - bounds.x0 - 120));
    const cy = pickC ? pickC[1] : Math.floor(bounds.y0 + 60 + rand() * (bounds.y1 - bounds.y0 - 120));
    if (taken.some(t => Math.hypot(t.x - cx, t.y - cy) < t.r + 26)) { if (opts.stats) opts.stats.spacing = (opts.stats.spacing || 0) + 1; continue; }
    // A blob: two to four overlapping ellipses, which reads as a natural
    // outcrop rather than a stamped disc.
    const lobes = [];
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, d = i ? 2 + rand() * 4 : 0;
      const big = opts.big ? 2.5 : 0;
      lobes.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d,
        rx: 3.5 + big + rand() * 4, ry: 3.5 + big + rand() * 4 });
    }
    const inBlob = (tx, ty, shrink = 0) => lobes.some(l => {
      const rx = l.rx - shrink, ry = l.ry - shrink;
      if (rx <= 0.5 || ry <= 0.5) return false;
      const dx = (tx + 0.5 - l.x) / rx, dy = (ty + 0.5 - l.y) / ry;
      return dx * dx + dy * dy <= 1;
    });
    if (!(opts.centreFree || free)(cx, cy) || (centreOk && !centreOk(cx, cy))) { if (opts.stats) opts.stats.centreBad = (opts.stats.centreBad || 0) + 1; continue; }
    const R = opts.big ? 17 : 14;
    const tiles = [];
    const S = 2 * (R + MARGIN) + 1, o = R + MARGIN;
    const mask = new Uint8Array(S * S);
    for (let ty = cy - R; ty <= cy + R; ty++) {
      for (let tx = cx - R; tx <= cx + R; tx++) {
        if (!inBlob(tx, ty)) continue;
        tiles.push([tx, ty]);
        // Dilate as we go: the blob and MARGIN tiles round it must be free.
        for (let dy = -MARGIN; dy <= MARGIN; dy++) {
          for (let dx = -MARGIN; dx <= MARGIN; dx++) {
            mask[(ty - cy + o + dy) * S + (tx - cx + o + dx)] = 1;
          }
        }
      }
    }
    if (tiles.length < 20) { if (opts.stats) opts.stats.small = (opts.stats.small || 0) + 1; continue; }
    if (opts.needWater && tiles.filter(([x, y]) => blockedW(x, y)).length < opts.needWater) { if (opts.stats) opts.stats.dry = (opts.stats.dry || 0) + 1; continue; }
    let ok = true;
    for (let i = 0; i < mask.length && ok; i++) {
      if (!mask[i]) continue;
      const tx = cx - o + (i % S), ty = cy - o + Math.floor(i / S);
      if (!free(tx, ty)) ok = false;
    }
    if (!ok) { if (opts.stats) opts.stats.notFree = (opts.stats.notFree || 0) + 1; continue; }
    const set = smooth(new Set(tiles.map(([x, y]) => `${x},${y}`)));
    // Smoothing may have filled a notch at the rim; it must be free too.
    let ok3 = true;
    for (const k of set) { const [x, y] = k.split(',').map(Number); if (!free(x, y)) { ok3 = false; break; } }
    if (!ok3) { if (opts.stats) opts.stats.smoothNotFree = (opts.stats.smoothNotFree || 0) + 1; continue; }
    tiles.length = 0;
    for (const k of set) tiles.push(k.split(',').map(Number));
    const has = (x, y) => set.has(`${x},${y}`);
    // The crown: a second level on the big ones, three tiles in from the rim.
    const crownSet = tiles.length >= 90
      ? smooth(new Set(tiles.filter(([x, y]) => inBlob(x, y, 3)).map(([x, y]) => `${x},${y}`)), set)
      : new Set();
    const crown = [...crownSet].map(k => k.split(',').map(Number));
    // A third level on the biggest mountains' outcrops.
    const peakSet = (opts.maxLevel >= 3 && crownSet.size >= 40)
      ? smooth(new Set([...crownSet].filter(k => { const [x, y] = k.split(',').map(Number); return inBlob(x, y, 6); })), crownSet)
      : new Set();
    const peak = [...peakSet].map(k => k.split(',').map(Number));
    // THE WAYS UP (round 286, the user's answers to the mockups):
    //   "8 tiles per level" -- the way up from the ground is a long earth
    //   ramp; "ramps should be grass/earth in grassy outdoor areas".
    //   Hidden-side ramps are allowed, "but color the connecting tiles on
    //   the top as a visual queue".
    //   Upper levels, where there is no room for eight tiles, take stone
    //   stairs (two tiles a level).
    const ramps = [];
    const climbs = [];
    const levelOf = (x, y) => peakSet.has(`${x},${y}`) ? 3 : crownSet.has(`${x},${y}`) ? 2 : set.has(`${x},${y}`) ? 1 : 0;
    const used = new Set();
    const blocked = opts.blocked || (() => false);
    const findWay = (level, len, style, dirs, only = null) => {
      // Rim tiles of `level`: tiles at that level with a lower neighbour in `dir`.
      for (const dir of dirs) {
        const [dx, dy] = DIRS[dir];
        const px = dy !== 0 ? 1 : 0, py = dx !== 0 ? 1 : 0;
        const cands = [];
        for (const k of (level === 1 ? set : level === 2 ? crownSet : peakSet)) {
          if (only && !only.has(k)) continue;
          const [x, y] = k.split(',').map(Number);
          let good = true;
          for (let w = 0; w < RAMP_WIDTH && good; w++) {
            const ex = x + px * w, ey = y + py * w;
            if (levelOf(ex, ey) !== level || blocked(ex, ey)) good = false;
            // The flight runs out over ground exactly one level lower,
            // and lands on it too.
            for (let st = 1; st <= len + 1 && good; st++) {
              const sx = ex + dx * st, sy = ey + dy * st;
              if (levelOf(sx, sy) !== level - 1 || used.has(`${sx},${sy}`) || blocked(sx, sy)) good = false;
              else if (level === 1 && !free(sx, sy)) good = false;
            }
          }
          if (good) cands.push([x, y]);
        }
        if (!cands.length) continue;
        const [x, y] = cands[Math.floor(rand() * cands.length)];
        const w = dx !== 0 ? len : RAMP_WIDTH, h = dy !== 0 ? len : RAMP_WIDTH;
        const rx = dx > 0 ? x + 1 : dx < 0 ? x - len : x;
        const ry = dy > 0 ? y + 1 : dy < 0 ? y - len : y;
        const tilesR = [];
        for (let ty = ry; ty < ry + h; ty++) for (let tx = rx; tx < rx + w; tx++) { tilesR.push([tx, ty]); used.add(`${tx},${ty}`); }
        // The cue: the top tiles that lead onto a flight the cliff hides.
        const cue = [];
        if (dir === 'N' || dir === 'W') {
          for (let wi = 0; wi < RAMP_WIDTH; wi++) for (let back = 0; back < 2; back++) {
            cue.push([x + px * wi - dx * back, y + py * wi - dy * back]);
          }
        }
        return { dir, x: rx, y: ry, w, h, hi: level, lo: level - 1, style, tiles: tilesR, cue };
      }
      return null;
    };
    const order = (visibleBias) => {
      const vis = rand() < 0.5 ? ['S', 'E'] : ['E', 'S'];
      const hid = rand() < 0.5 ? ['N', 'W'] : ['W', 'N'];
      return rand() < visibleBias ? [...vis, ...hid] : [...hid, ...vis];
    };
    const r1 = findWay(1, RAMP_LEN, 'ramp', order(0.7));
    if (!r1) { if (opts.stats) opts.stats.noRamp = (opts.stats.noRamp || 0) + 1; continue; }
    ramps.push(r1);
    if (crown.length >= 12) {
      const r2 = findWay(2, 2, 'stairs', order(0.8));
      if (r2) ramps.push(r2);
      else { crownSet.clear(); crown.length = 0; peakSet.clear(); peak.length = 0; }
    }
    if (peak.length >= 8) {
      const r3 = findWay(3, 2, 'stairs', order(0.8));
      if (r3) ramps.push(r3);
      else { peakSet.clear(); peak.length = 0; }
    }
    // "ladders or climbable vines ... not everywhere but some places": a
    // second, quicker way up the visible face of some outcrops.
    if (rand() < (opts.climbChance == null ? 0.35 : opts.climbChance)) {
      const cands = [];
      for (const k of set) {
        const [x, y] = k.split(',').map(Number);
        if (levelOf(x, y) !== 1) continue;
        for (const dir of ['S', 'E']) {
          const [dx, dy] = DIRS[dir];
          const fx = x + dx, fy = y + dy;
          if (levelOf(fx, fy) === 0 && free(fx, fy) && !used.has(`${fx},${fy}`)
            && free(fx + dx, fy + dy) && !used.has(`${fx + dx},${fy + dy}`)) cands.push({ top: [x, y], foot: [fx, fy], dir });
        }
      }
      if (cands.length) {
        const c = cands[Math.floor(rand() * cands.length)];
        climbs.push({ ...c, style: opts.climbStyle || 'ladder' });
      }
    }
    // Nothing is kept that could strand a player: every raised tile must walk
    // to the ground on foot (see `strandedTiles`). The box reaches past the
    // longest flight so its foot is inside it. A river through the outcrop
    // cuts it in two, so each stranded piece is offered its own way down
    // before the outcrop is given up on.
    const xs = tiles.map(t => t[0]), ys = tiles.map(t => t[1]);
    const pad = RAMP_LEN + 3;
    const pbox = { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad };
    const strandedNow = () => {
      const probe = new ElevationField(1 << 16, 32);
      applyPlateaus(probe, [{ tiles, crown, peak, ramps, climbs }]);
      return strandedTiles(probe, pbox, blocked);
    };
    let left = strandedNow();
    for (let tries = 0; left.length && tries < 4; tries++) {
      const only = new Set(left.map(t => t.join(',')));
      const lv = Math.min(...left.map(([x, y]) => levelOf(x, y)));
      const extra = lv === 1 ? findWay(1, RAMP_LEN, 'ramp', order(0.7), only) || findWay(1, 2, 'stairs', order(0.7), only)
        : findWay(lv, 2, 'stairs', order(0.8), only);
      if (!extra) break;
      ramps.push(extra);
      left = strandedNow();
    }
    if (left.length) { if (opts.stats) opts.stats.stranded = (opts.stats.stranded || 0) + 1; continue; }
    out.push({ region, cx, cy, tiles, crown, peak, ramps, climbs });
    taken.push({ x: cx, y: cy, r: R });
  }
  return out;
}

/**
 * Close the notches and trim the spurs of a tile set. A one-tile bay in a
 * cliff reads as a stray flap of rock, and a one-tile spur as a stray step;
 * neither is what a hillside looks like. `within` bounds growth (a crown
 * must stay on its plateau).
 */
function smooth(set, within = null) {
  const n4 = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
  for (let pass = 0; pass < 3; pass++) {
    const add = [];
    for (const k of set) {
      const [x, y] = k.split(',').map(Number);
      for (const [nx, ny] of n4(x, y)) {
        const nk = `${nx},${ny}`;
        if (set.has(nk) || (within && !within.has(nk))) continue;
        const c = n4(nx, ny).filter(([a, b]) => set.has(`${a},${b}`)).length;
        if (c >= 3) add.push(nk);
      }
    }
    if (!add.length) break;
    for (const k of add) set.add(k);
  }
  for (const k of [...set]) {
    const [x, y] = k.split(',').map(Number);
    if (n4(x, y).filter(([a, b]) => set.has(`${a},${b}`)).length <= 1) set.delete(k);
  }
  return set;
}

/** Write a plan into a field. */
export function applyPlateaus(field, plans) {
  for (const p of plans) {
    for (const [tx, ty] of p.tiles) field.setLevel(tx, ty, 1);
    for (const [tx, ty] of (p.crown || [])) field.setLevel(tx, ty, 2);
    for (const [tx, ty] of (p.peak || [])) field.setLevel(tx, ty, 3);
    for (const r of p.ramps) {
      field.addRamp(r.x, r.y, r.w, r.h, r.dir, r.hi, r.lo, r.style);
      for (const [tx, ty] of (r.cue || [])) field.cue.add(ty * field.N + tx);
    }
    for (const c of (p.climbs || [])) field.addClimb(c.top[0], c.top[1], c.foot[0], c.foot[1], c.style);
    field.plateaus.push(p);
  }
  return field;
}

/**
 * ROUND 285 -- THE STUCK TEST. Every raised tile inside `box` (tile bounds)
 * must be able to walk to the ground and back without gliding. Walked tile to
 * tile along the straight line between centres, sampled every few units with
 * the same `stepAllowed` rule the player moves by, so a pass here means a
 * player really can. `blocked(tx, ty)` marks tiles nobody can stand on
 * (water, walls). Returns the stranded tiles.
 */
export function strandedTiles(field, box, blocked = () => false) {
  const T = field.T;
  // ROUND 289 -- numeric keys and a flat fast path: the probe runs for every
  // plateau the generator tries, and round 43's world-build budget felt it.
  const W = box.x1 - box.x0 + 1, H = box.y1 - box.y0 + 1;
  const idx = (x, y) => (y - box.y0) * W + (x - box.x0);
  const seen = new Uint8Array(Math.max(0, W * H));
  const walk = (ax, ay, bx, by) => {
    // Two tiles at one height, neither a ramp nor a bridge: flat ground.
    const ha = field.tileHeight(ax, ay), hb = field.tileHeight(bx, by);
    if (ha === hb && !field.isRamp(ax, ay) && !field.isRamp(bx, by)
      && !(field.isBridge && (field.isBridge(ax, ay) || field.isBridge(bx, by)))) return true;
    const x0 = (ax + 0.5) * T, y0 = (ay + 0.5) * T, x1 = (bx + 0.5) * T, y1 = (by + 0.5) * T;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const pa = [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n];
      const pb = [x0 + (x1 - x0) * (i + 1) / n, y0 + (y1 - y0) * (i + 1) / n];
      if (!field.stepAllowed(pa[0], pa[1], pb[0], pb[1], false)) return false;
    }
    return true;
  };
  const q = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (blocked(x, y)) continue;
      if (field.tileHeight(x, y) === 0 && !field.isRamp(x, y)) { seen[idx(x, y)] = 1; q.push(x, y); }
    }
  }
  while (q.length) {
    const y = q.pop(), x = q.pop();
    for (let d = 0; d < 4; d++) {
      const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (nx < box.x0 || ny < box.y0 || nx > box.x1 || ny > box.y1) continue;
      const k = idx(nx, ny);
      if (seen[k] || blocked(nx, ny)) continue;
      // Both ways: down to where we came from, and back up.
      if (!walk(nx, ny, x, y) || !walk(x, y, nx, ny)) continue;
      seen[k] = 1; q.push(nx, ny);
    }
  }
  const out = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (blocked(x, y) || seen[idx(x, y)]) continue;
      if (field.tileHeight(x, y) > 0) out.push([x, y]);
    }
  }
  return out;
}

/**
 * ROUND 286 -- CANYONS, on the approved mockup B:
 *
 *   north mesa  level 2      (its cliff faces the camera)
 *   bench       level 1, 3 wide ("wider as needed", dressed with rocks)
 *   floor       level 0, open at both ends
 *   south rim   level 1      (one lower than the north, "this is good", so
 *                             the floor stays visible)
 *
 * Ways in: the floor at either end; an 8-tile earth ramp off the bench's
 * east end; an 8-tile ramp off the south rim's visible face; stone stairs
 * from the mesa down to the bench; and a rope bridge from the bench to the
 * south rim across the floor ("Should canyons get rope bridges" -- "Yes").
 * Every canyon passes the stuck test before it is kept.
 */
export function planCanyons(region, bounds, free, rand, count = 2, centreOk = null, stats = null) {
  const st = (k) => { if (stats) stats[k] = (stats[k] || 0) + 1; };
  const out = [];
  let tries = 0;
  const NM = 7, B = 3, F = 6, SR = 6, H = NM + B + F + SR;
  while (out.length < count && tries < count * 80) {
    tries++;
    const L = 40 + Math.floor(rand() * 24);
    const x0 = Math.floor(bounds.x0 + 60 + rand() * (bounds.x1 - bounds.x0 - 120 - L));
    const y0 = Math.floor(bounds.y0 + 60 + rand() * (bounds.y1 - bounds.y0 - 120 - H - 12));
    if (centreOk && !centreOk(x0 + (L >> 1), y0 + (H >> 1))) { st('centre'); continue; }
    // The whole footprint, its margin, and the ramps' run-outs must be free.
    let ok = true;
    for (let y = y0 - 3; y < y0 + H + RAMP_LEN + 4 && ok; y++) {
      for (let x = x0 - 3; x < x0 + L + RAMP_LEN + 4; x++) if (!free(x, y)) { ok = false; break; }
    }
    if (!ok) { st('notFree'); continue; }
    const tiles = [];   // [x, y, level]
    for (let y = 0; y < H; y++) {
      const lv = y < NM ? 2 : y < NM + B ? 1 : y < NM + B + F ? 0 : 1;
      if (!lv) continue;
      for (let x = 0; x < L; x++) tiles.push([x0 + x, y0 + y, lv]);
    }
    const ramps = [];
    // Bench -> plain, off its east end, running east.
    ramps.push({ dir: 'E', x: x0 + L, y: y0 + NM, w: RAMP_LEN, h: B, hi: 1, lo: 0, style: 'ramp' });
    // South rim -> plain, off its visible south face.
    const sx = x0 + 6 + Math.floor(rand() * (L - 14));
    ramps.push({ dir: 'S', x: sx, y: y0 + H, w: RAMP_WIDTH, h: RAMP_LEN, hi: 1, lo: 0, style: 'ramp' });
    // Mesa -> bench, stone stairs in two places.
    for (const fx of [0.25, 0.7]) {
      const x = x0 + Math.floor(L * fx);
      ramps.push({ dir: 'S', x, y: y0 + NM, w: RAMP_WIDTH, h: 2, hi: 2, lo: 1, style: 'stairs' });
    }
    // The bridge: bench to south rim, mid-canyon, clear of the stairs.
    const bx = x0 + Math.floor(L * 0.48);
    const bridges = [];
    for (let y = y0 + NM + B; y < y0 + NM + B + F; y++) for (let x = bx; x < bx + 2; x++) bridges.push([x, y, 1]);
    // Rocks on the bench, away from the stairs and the bridge ends.
    const rocks = [];
    for (let i = 0; i < Math.floor(L / 9); i++) {
      const x = x0 + 2 + Math.floor(rand() * (L - 12));
      if (Math.abs(x - bx) < 4 || ramps.some(r => r.style === 'stairs' && Math.abs(r.x - x) < 4)) continue;
      rocks.push([x, y0 + NM + (rand() < 0.5 ? 0 : 2)]);
    }
    const plan = { region, kind: 'canyon', x0, y0, L, H, tiles, ramps, bridges, rocks,
      cx: x0 + L / 2, cy: y0 + H / 2 };
    const probe = new ElevationField(1 << 16, 32);
    applyCanyons(probe, [plan]);
    if (strandedTiles(probe, { x0: x0 - 4, y0: y0 - 4, x1: x0 + L + RAMP_LEN + 3, y1: y0 + H + RAMP_LEN + 3 }).length) { st('stranded'); continue; }
    if (out.some(o => Math.abs(o.cx - plan.cx) < L + 40 && Math.abs(o.cy - plan.cy) < H + 40)) continue;
    out.push(plan);
  }
  return out;
}

export function applyCanyons(field, plans) {
  for (const c of plans) {
    for (const [x, y, lv] of c.tiles) field.setExact(x, y, lv);
    for (const r of c.ramps) field.addRamp(r.x, r.y, r.w, r.h, r.dir, r.hi, r.lo, r.style);
    for (const [x, y, deck] of c.bridges) field.addBridge(x, y, deck);
    field.plateaus.push({ ...c, tiles: c.tiles.map(([x, y]) => [x, y]), crown: [], climbs: [] });
  }
  return field;
}
