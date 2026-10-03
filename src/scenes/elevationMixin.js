// ============================================================================
// ROUND 285 (item 18) -- ELEVATION IN THE WORLD: building it, drawing its
// cliffs, and holding the player to it unless they glide.
//
//   "Start adding elevation to maps, so gliding lets players jump off ledges."
//
// src/data/elevation.js plans the high ground and answers height questions;
// src/data/iso.js draws every world point at its height. This file is the
// scene's half:
//
//   _buildElevation      plans every region's plateaus against what is already
//                        built, and registers the height lookup with iso.js.
//   _elevTileFaces       the cliff faces under a raised tile's two visible
//                        edges, pooled beside the ground tiles they belong to.
//   _elevStepOk          the movement rule: nobody climbs a ledge; only a
//                        glider goes down one.
//   _canGlideNow         the Cloak of Night gliding or flying, or Dragon Wings.
//   _playerGlideLift     the half-second the player takes to glide down.
// ============================================================================
import { setElevationSource, ELEV_PX, ISO_TW, ISO_TH, TILE, isoDepth, isoProject as isoProjectXY, isoProjectFlat } from '../data/iso.js';
import { ElevationField, planPlateaus, applyPlateaus, planCanyons, applyCanyons, elevRng, LEDGE_STEP, strandedTiles } from '../data/elevation.js';
import { REGIONS, REGION_TILES, REGION_BY_ID, arrivalPoint } from '../data/regions.js';
import { VERTICALITY_MOCKUPS, parseMockup, mockupSize } from '../data/verticalityMockups.js';
import { isWaterTile, isRoadTile } from '../data/town.js';
import { INTERIOR_ROOMS, roomEntryPoint } from '../data/interiors.js';
import { caveFamilyFor } from '../data/caveShapes.js';
import { DEN_PACK_SIZE, denMonsterKeys } from '../data/dens.js';
import { denFamiliesFor } from '../data/sites.js';
import { regionAt, regionDenTier } from '../data/regions.js';
import { seededRng } from '../data/awakening.js';
import { MONSTER_TYPES, monsterKeysAtTier, AIRBORNE_FAMILIES } from '../data/monsters.js';

// ROUND 286 -- how each region's high ground is shaped. The mountains
// (Elehyd, the Cinderwaste) get more, bigger outcrops up to three levels; the
// green regions climb by vines, the bare ones by ladders; and some rivers are
// lifted onto high ground so they come off it as waterfalls.
const REGION_ELEV = {
  nek:      { count: 14, climbStyle: 'vines',  falls: 2, canyons: 0 },
  ontaria:  { count: 14, climbStyle: 'vines',  falls: 2, canyons: 1 },
  elehyd:   { count: 24, climbStyle: 'ladder', falls: 3, canyons: 2, big: true, maxLevel: 3, climbChance: 0.5 },
  bratugal: { count: 14, climbStyle: 'vines',  falls: 2, canyons: 1 },
  sirukh:   { count: 16, climbStyle: 'ladder', falls: 0, canyons: 3, maxLevel: 3, climbChance: 0.45 },
  cinder:   { count: 22, climbStyle: 'ladder', falls: 1, canyons: 2, big: true, maxLevel: 3, climbChance: 0.5 },
  ixcuatl:  { count: 14, climbStyle: 'vines',  falls: 3, canyons: 0, climbChance: 0.5 },
};
const RIVER_TILES = new Set([4, 5, 6, 7]);

// The cave behind the falls: "hidden caves behind waterfalls are a gaming
// trope for a reason, do it."
const FALLS_CAVE = {
  name: 'Behind the Falls', enterLabel: 'slip behind the falling water',
  blurb: 'The roar drops to a hiss the moment you are through. Somebody kept things here.',
  rocks: 8, trees: 0, treeScale: 1.2, fights: true, wallPalette: true,
  props: ['idol', 'amphora', 'brazierBowl', 'scrollStand'],
};

// Tile types the mockups paint: packed earth on a ramp, paving on stairs,
// rapids for a river, still water for a pool.
const T_PATH = 1, T_PLAZA = 2, T_POOL = 4, T_RIVER = 6;

// Rock for the cliff faces, per region: the ground the plateau is made of.
const CLIFF_ROCK = {
  nek: [0x7b6b58, 0x5f5242], ontaria: [0x7a6c5a, 0x5d5345], elehyd: [0x8d9aab, 0x6c7888],
  bratugal: [0x6f6553, 0x544c3f], sirukh: [0xb68b5b, 0x8e6a44], cinder: [0x4d3c38, 0x362a27],
  ixcuatl: [0x6a6450, 0x4f4a3c],
};
const CLIFF_LIP = {
  nek: 0x6f8f3a, ontaria: 0x7d9446, elehyd: 0xdfe8f0, bratugal: 0x5f7d34, sirukh: 0xd8b77f,
  cinder: 0x6b4a3a, ixcuatl: 0x4f8a3a,
};

// Arrays on the scene that are NOT things a plateau must leave room for:
// scenery that can stand on high ground, and transient effects.
// ROUND 286 -- and monsters and their spawn points: a pack may live on a
// hill, and counting every spawn point left no room for a canyon anywhere.
const ELEV_SKIP = /tree|rock|flora|grass|ground|pool|tile|float|projectile|pickup|fx|particle|shadow|lamp|puff|spark|trail|swoosh|anim|text|^monsters$|^spawnGroups$/i;

export const ElevationMixin = {
  /** Plan and register the high ground. Called once, late in the build. */
  _buildElevation() {
    if (!this.tileType) return;
    this._stairPaved = new Set();   // ROUND 289
    const N = Math.round(Math.sqrt(this.tileType.length));
    const field = new ElevationField(N, TILE);
    const occupied = this._elevOccupiedTiles(N);
    // ROUND 285 (2.2) -- the authored mockups first, so the generated
    // plateaus stay off them.
    this._verticalitySites = this._stampVerticalityMockups(field, occupied, N);
    for (const reg of REGIONS) {
      const b = { x0: reg.col * REGION_TILES, y0: reg.row * REGION_TILES,
        x1: reg.col * REGION_TILES + REGION_TILES - 1, y1: reg.row * REGION_TILES + REGION_TILES - 1 };
      const free = (tx, ty) => {
        if (tx < b.x0 + 40 || ty < b.y0 + 40 || tx > b.x1 - 40 || ty > b.y1 - 40) return false;
        const k = ty * N + tx;
        if (this.tileType[k] !== 0) return false;              // open natural ground only
        if (this._solidTiles && this._solidTiles.has(k)) return false;
        return !occupied.has(k);
      };
      const rand = elevRng(`elevation|${reg.id}`);
      const settleOk = (cx, cy) => !(this._insideAnySettlement
        && this._insideAnySettlement((cx + 0.5) * TILE, (cy + 0.5) * TILE, 14));
      const ro = REGION_ELEV[reg.id] || {};
      // First the falls: outcrops laid ACROSS a river, so the river runs over
      // high ground and comes off it as a waterfall.
      const water = (tx, ty) => RIVER_TILES.has(this.tileType[ty * N + tx]);
      const wetFree = (tx, ty) => {
        if (tx < b.x0 + 40 || ty < b.y0 + 40 || tx > b.x1 - 40 || ty > b.y1 - 40) return false;
        const k = ty * N + tx;
        const t = this.tileType[k];
        // Open ground, the river, and its banks (the accent tile is the
        // region's rough ground: reeds, shingle, rock).
        if (t !== 0 && t !== 5 && t !== 12 && !RIVER_TILES.has(t)) return false;
        if (this._solidTiles && this._solidTiles.has(k)) return false;
        return !occupied.has(k);
      };
      let fallsPlans = [];
      if (ro.falls) {
        const pickCentre = (r) => {
          for (let i = 0; i < 400; i++) {
            const tx = Math.floor(b.x0 + 60 + r() * (b.x1 - b.x0 - 120));
            const ty = Math.floor(b.y0 + 60 + r() * (b.y1 - b.y0 - 120));
            if (water(tx, ty) && wetFree(tx, ty)) return [tx, ty];
          }
          return null;
        };
        const stats = {};
        fallsPlans = planPlateaus(reg.id, b, wetFree, rand, ro.falls, settleOk,
          { ...ro, pickCentre, centreFree: wetFree, blocked: water, needWater: 6, climbChance: 0, stats });
        (this._elevStats = this._elevStats || {})[`${reg.id}:falls`] = stats;
        applyPlateaus(field, fallsPlans);
        for (const q of fallsPlans) for (const [tx, ty] of q.tiles.concat(q.crown || [])) {
          for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) occupied.add((ty + dy) * N + tx + dx);
        }
        for (const q of fallsPlans) q.falls = true;
      }
      // Canyons next (they want long straight runs of open ground).
      if (ro.canyons) {
        const cplans = planCanyons(reg.id, b, (tx, ty) => free(tx, ty), rand, ro.canyons, settleOk, ((this._elevStats = this._elevStats || {})[`${reg.id}:canyon`] = {}));
        applyCanyons(field, cplans);
        for (const c of cplans) {
          for (let ty = c.y0 - 12; ty < c.y0 + c.H + 20; ty++) for (let tx = c.x0 - 12; tx < c.x0 + c.L + 20; tx++) occupied.add(ty * N + tx);
          for (const r of c.ramps) if (r.style === 'stairs') {
            for (let ty = r.y; ty < r.y + r.h; ty++) for (let tx = r.x; tx < r.x + r.w; tx++) this._paveStair(ty * N + tx);
          }
          this._canyonRocks = (this._canyonRocks || []).concat(c.rocks);
        }
        this._canyons = (this._canyons || []).concat(cplans);
      }
      const plans = planPlateaus(reg.id, b, (tx, ty) => free(tx, ty), rand, ro.count, settleOk, ro);
      applyPlateaus(field, plans);
      // Stone stairs are cut stone: paved. Earth ramps stay the ground they
      // climb ("grass/earth in grassy outdoor areas").
      for (const q of plans.concat(fallsPlans)) for (const r of q.ramps) {
        if (r.style !== 'stairs') continue;
        for (const [tx, ty] of r.tiles) if (!RIVER_TILES.has(this.tileType[ty * N + tx])) this._paveStair(ty * N + tx);
      }
    }
    this._elev = field;
    // The waterfalls: every raised river tile with a lower neighbour on a
    // side the camera sees. Remembered for the mist, the sound, and the caves.
    this._waterfalls = [];
    for (const k of field.level.keys()) {
      const tx = k % N, ty = (k - tx) / N;
      if (!RIVER_TILES.has(this.tileType[k]) && this.tileType[k] !== T_POOL) continue;
      for (const [dx, dy, side] of [[1, 0, 'se'], [0, 1, 'sw']]) {
        const d = field.tileHeight(tx, ty) - field.tileHeight(tx + dx, ty + dy);
        if (d > 0.5) this._waterfalls.push({ tx, ty, side, drop: d,
          footX: (tx + dx + 0.5) * TILE, footY: (ty + dy + 0.5) * TILE });
      }
    }
    this._buildFallsCaves(N);
    this._placeCanyonRocks();
    this._raiseCaveLedges(field);
    this._elevFlush();   // ROUND 289
    this._cliffFaces = this._cliffFaces || new Map();
    this._cliffPool = this._cliffPool || [];
    setElevationSource(field.box ? (wx, wy) => field.height(wx, wy) : null);
    // Anything already standing where the ground just rose is redrawn by the
    // next frame's own positioning; the ground itself is re-streamed now.
    if (this._groundTiles) this._updateGroundViewport(true);
    return field.plateaus.length;
  },

  /**
   * ROUND 285 (2.2) -- stamp the four verticality mockups into the Nek, in
   * open ground within a walk of its arrival road. Each site's footprint (and
   * a margin) is taken out of `occupied` so nothing generated lands on it.
   */
  _stampVerticalityMockups(field, occupied, N) {
    const reg = REGION_BY_ID.nek;
    if (!reg) return [];
    const at = arrivalPoint(reg);
    const ax = Math.floor(at.x / TILE), ay = Math.floor(at.y / TILE);
    const b = { x0: reg.col * REGION_TILES + 40, y0: reg.row * REGION_TILES + 40,
      x1: reg.col * REGION_TILES + REGION_TILES - 40, y1: reg.row * REGION_TILES + REGION_TILES - 40 };
    const ok = (tx, ty) => tx >= b.x0 && ty >= b.y0 && tx <= b.x1 && ty <= b.y1
      && this.tileType[ty * N + tx] === 0 && !(this._solidTiles && this._solidTiles.has(ty * N + tx))
      && !occupied.has(ty * N + tx);
    const sites = [];
    const M = 7;
    for (const m of VERTICALITY_MOCKUPS) {
      const { w, h } = mockupSize(m);
      let found = null;
      // A spiral of candidate corners outward from the arrival road.
      for (let r = 50; r < 500 && !found; r += 6) {
        for (let a = 0; a < 24 && !found; a++) {
          const x0 = Math.round(ax + Math.cos(a / 24 * Math.PI * 2) * r) - (w >> 1);
          const y0 = Math.round(ay + Math.sin(a / 24 * Math.PI * 2) * r) - (h >> 1);
          if (this._insideAnySettlement && this._insideAnySettlement((x0 + w / 2) * TILE, (y0 + h / 2) * TILE, 24)) continue;
          let good = true;
          for (let ty = y0 - M; ty < y0 + h + M && good; ty++) {
            for (let tx = x0 - M; tx < x0 + w + M; tx++) if (!ok(tx, ty)) { good = false; break; }
          }
          if (good) found = { x0, y0 };
        }
      }
      if (!found) continue;
      const { x0, y0 } = found;
      for (const t of parseMockup(m)) {
        const tx = x0 + t.dx, ty = y0 + t.dy;
        field.setExact(tx, ty, t.level);
        if (t.water) this.tileType[ty * N + tx] = t.water === 'river' ? T_RIVER : T_POOL;
      }
      for (const r of m.ramps) {
        field.addRamp(x0 + r.x, y0 + r.y, r.w, r.h, r.dir, r.hi, r.lo, r.style);
        for (let ty = y0 + r.y; ty < y0 + r.y + r.h; ty++) {
          for (let tx = x0 + r.x; tx < x0 + r.x + r.w; tx++) {
            // ROUND 286 -- "ramps should be grass/earth in grassy outdoor
            // areas": only stairs are paved.
            if (r.style === 'stairs') this._paveStair(ty * N + tx);
          }
        }
      }
      for (const c of (m.climbs || [])) {
        const [dx, dy] = { S: [0, 1], E: [1, 0], N: [0, -1], W: [-1, 0] }[c.dir];
        field.addClimb(x0 + c.x, y0 + c.y, x0 + c.x + dx, y0 + c.y + dy, c.style);
      }
      for (let ty = y0 - M - 4; ty < y0 + h + M + 4; ty++) {
        for (let tx = x0 - M - 4; tx < x0 + w + M + 4; tx++) occupied.add(ty * N + tx);
      }
      sites.push({ id: m.id, name: m.name, notes: m.notes, x0, y0, w, h,
        cx: (x0 + w / 2) * TILE, cy: (y0 + h / 2) * TILE });
    }
    // Nothing stands in a river, and nothing grows out of a cliff face.
    if (sites.length) {
      const inside = (x, y) => sites.some(q => {
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        return tx >= q.x0 - 1 && ty >= q.y0 - 1 && tx < q.x0 + q.w + 1 && ty < q.y0 + q.h + 1;
      });
      if (this.forestTrees) {
        this.forestTrees = this.forestTrees.filter(t => !inside(t.x, t.y));
        this.forestTrees.forEach((t, i) => { t.id = i; });
      }
      if (this.obstacles) {
        this.obstacles = this.obstacles.filter(o => o.hw > 0 || o.placedBy === 'hand' || !inside(o.x, o.y));
        this.obstacles.forEach((o, i) => { o.id = i; });
        this._rockSprites = new Map();
      }
      if (this._floraBlocked) {
        const prev = this._floraBlocked;
        this._floraBlocked = (x, y) => inside(x, y) || prev(x, y);
      }
      // ROUND 289 -- once, at the end of the elevation pass (`_elevFlush`),
      // not here: the world-build budget (round 43) had no room for doing it
      // twice.
      // The minimap is not redrawn for the mockups' two small pools: at its
      // scale they are a pixel or two, and the redraw cost ~0.6 s of boot.
      this._elevDirty = { grid: true, views: true, ...(this._elevDirty || {}) };
    }
    return sites;
  },

  /** Every tile a plateau must stay off: people, chests, doors, dens, camps,
   *  spawn points -- anything placed in the world with a position. Read
   *  generically off the scene's arrays so a system added later is avoided
   *  without this file having to learn its name. */
  _elevOccupiedTiles(N) {
    const occ = new Set();
    const mark = (x, y, pad) => {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      for (let dy = -pad; dy <= pad; dy++) {
        for (let dx = -pad; dx <= pad; dx++) occ.add((ty + dy) * N + tx + dx);
      }
    };
    for (const [name, v] of Object.entries(this)) {
      if (!Array.isArray(v) || !v.length || v.length > 60000) continue;
      const obst = /obstacle|static/i.test(name);
      if (!obst && ELEV_SKIP.test(name)) continue;
      for (const e of v) {
        if (!e || typeof e !== 'object') continue;
        const x = typeof e.x === 'number' ? e.x : e.wx, y = typeof e.y === 'number' ? e.y : e.wy;
        if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) continue;
        // Obstacles: only the big built ones. A boulder may sit on a hill.
        if (obst && !(e.hw > 0 || (e.radius || 0) > 30)) continue;
        const big = Math.max(e.hw || 0, e.hh || 0, e.radius || 0);
        mark(x, y, 2 + Math.ceil(big / TILE));
      }
    }
    return occ;
  },

  /** Height of the ground at a world point, in levels. */
  _elevAt(wx, wy) { return this._elev ? this._elev.height(wx, wy) : 0; },

  /** The movement rule. */
  _elevStepOk(x0, y0, x1, y1, glide = false) {
    return !this._elev || this._elev.stepAllowed(x0, y0, x1, y1, glide);
  },

  /** "so gliding lets players jump off ledges": the cloak's glide or flight,
   *  or Dragon Wings. */
  _canGlideNow() {
    const c = this._cloakState ? this._cloakState() : null;
    if (c && (c.mode === 'glide' || c.mode === 'flight')) return true;
    if (this._wingsOn && this._wingsOn()) return true;
    if (this._canonGlide5 && this._canonGlide5()) return true;   // ROUND 288 -- Leaf on the Wind
    // ROUND 286 -- "This finally grants some value to gliding and flying
    // skills": a mount that flies carries you off a ledge too.
    const m = this._mountActive ? this._mountActive() : null;
    return !!(m && (m.flies || (m.family && AIRBORNE_FAMILIES.has(m.family))));
  },

  /** Called by the player's move with where they were and where they went. */
  _elevNoteStep(x0, y0, x1, y1, blockedDown) {
    if (!this._elev) return;
    const h0 = this._elev.height(x0, y0), h1 = this._elev.height(x1, y1);
    if (h0 - h1 > LEDGE_STEP) {
      this._ledgeJumps = (this._ledgeJumps || 0) + 1;
      if (this._floatText) this._floatText(x1, y1 - 40, 'You glide down', '#b3e5fc');
    } else if (blockedDown && this.time && this.time.now > (this._ledgeHintAt || 0)) {
      this._ledgeHintAt = this.time.now + 4000;
      this._ledgeRefusals = (this._ledgeRefusals || 0) + 1;
      if (this._floatText) this._floatText(x0, y0 - 44, 'A ledge -- glide to jump off it', '#cfd8dc');
    }
  },

  /** Screen-pixel offset for the player sprite while gliding down: the
   *  ground drops at once, the body follows it over a moment. */
  _playerGlideLift() {
    if (!this._elev) return 0;
    // What isoProject lifted the sprite by, and where the player really is
    // (under a bridge deck, the ground; on it, the deck).
    const drawnH = this._elev.height(this.world.x, this.world.y);
    const trueH = this._elev.height(this.world.x, this.world.y, this._playerLayerH == null ? null : this._playerLayerH);
    const dt = (this.game && this.game.loop ? this.game.loop.delta : 16) / 1000;
    // ROUND 286 -- both ways: a glide down drifts, and a climb up a ladder
    // or vines rises rather than popping up a level.
    if (this._glideVisH == null || Math.abs(this._glideVisH - trueH) > 3) this._glideVisH = trueH;
    else if (this._glideVisH > trueH) this._glideVisH = Math.max(trueH, this._glideVisH - dt * 2.4);
    else this._glideVisH = Math.min(trueH, this._glideVisH + dt * 3.2);
    return -(this._glideVisH - drawnH) * ELEV_PX;
  },

  // --------------------------------------------------------------------------
  // THE CLIFFS
  // --------------------------------------------------------------------------
  /** A cliff face texture: `side` 'se' (under the tile's east-south edge,
   *  in shadow) or 'sw' (under its south-west edge, lit). Pixel columns, so it
   *  reads as the same pixel art as the ground above it. */
  _cliffTex(side, hpx, regionId, style = 'rock') {
    if (style === 'falls') return this._fallsTex(side, hpx, this._fallsFrame || 0);
    const key = `cliff_${side}_${hpx}_${regionId}_${style}`;
    if (this.textures.exists(key)) return key;
    const W = ISO_TW / 2, E = ISO_TH / 2;
    const SH = 14;   // a shadow cast on the ground at the foot, baked in
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = E + hpx + SH;
    const g = cnv.getContext('2d');
    const [lit, dark] = style === 'stairs' ? [0xb8b2a4, 0x8f897c] : (CLIFF_ROCK[regionId] || CLIFF_ROCK.nek);
    const base = side === 'sw' ? lit : dark;
    const lip = style === 'stairs' ? 0xd9d3c3 : style === 'ramp' ? 0x9a7b55 : (CLIFF_LIP[regionId] || CLIFF_LIP.nek);
    const hex = (c, k) => {
      const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * k)));
      const gg = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * k)));
      const b = Math.min(255, Math.max(0, Math.round((c & 255) * k)));
      return `rgb(${r},${gg},${b})`;
    };
    for (let x = 0; x < W; x++) {
      const top = side === 'se' ? Math.round(E * (1 - (x + 0.5) / W)) : Math.round(E * ((x + 0.5) / W));
      for (let y = 0; y < hpx; y++) {
        // Strata every 6px, a darker foot, and a speckle off a fixed hash.
        const h = ((x * 73856093) ^ ((y + top) * 19349663)) >>> 0;
        let k = 1;
        if (y % 6 === 5) k = 0.82;
        if (y >= hpx - 2) k = 0.72;
        if (h % 11 === 0) k *= 0.9;
        if (h % 13 === 0) k *= 1.08;
        g.fillStyle = y < 2 ? hex(lip, side === 'sw' ? 0.95 : 0.8) : hex(base, k);
        g.fillRect(x, top + y, 1, 1);
      }
      for (let y = 0; y < SH; y++) {
        g.fillStyle = `rgba(12,16,8,${(0.42 * (1 - y / SH) ** 1.4).toFixed(3)})`;
        g.fillRect(x, top + hpx + y, 1, 1);
      }
    }
    this.textures.addCanvas(key, cnv);
    return key;
  },

  /** Falling water: pale streaks down a blue sheet, foam at the foot. */
  _fallsTex(side, hpx, frame = 0) {
    const key = `falls_${side}_${hpx}_${frame}`;
    if (this.textures.exists(key)) return key;
    const W = ISO_TW / 2, E = ISO_TH / 2;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = E + hpx;
    const g = cnv.getContext('2d');
    for (let x = 0; x < W; x++) {
      const top = side === 'se' ? Math.round(E * (1 - (x + 0.5) / W)) : Math.round(E * ((x + 0.5) / W));
      const streak = ((x * 2654435761) >>> 0) % 5;
      for (let y = 0; y < hpx; y++) {
        let c = streak === 0 ? '#e3f4ff' : streak === 1 ? '#a9d8f5' : side === 'sw' ? '#6fb2df' : '#4f93c4';
        // The glints fall: each frame moves them three pixels down.
        if (((y - frame * 3 + x * 3) % 9 + 9) % 9 === 0) c = '#ffffff';
        if (y >= hpx - 3) c = '#f4fbff';
        g.fillStyle = c;
        g.fillRect(x, top + y, 1, 1);
      }
    }
    this.textures.addCanvas(key, cnv);
    return key;
  },

  /** Raise the faces under tile (tx, ty), whose centre is drawn at `p`. */
  _elevTileFaces(tkey, tx, ty, p, h) {
    const f = this._elev;
    this._fallsImgs = this._fallsImgs || new Set();
    const reg = this.currentRegion ? this.currentRegion.id : 'nek';
    const imgs = [];
    const faces = [['se', f.tileHeight(tx + 1, ty)], ['sw', f.tileHeight(tx, ty + 1)]];
    for (const [side, hn] of faces) {
      const d = h - hn;
      if (d <= 0.01) continue;
      const hpx = Math.max(2, Math.round(d * ELEV_PX));
      const wet = isWaterTile(this.tileType[ty * f.N + tx]);
      const bridge = f.isBridge(tx, ty);
      const style = bridge ? 'bridge' : wet ? 'falls' : (f.rampStyle(tx, ty) || 'rock');
      const key = bridge ? this._bridgeFaceTex(side, hpx) : this._cliffTex(side, hpx, reg, style);
      let img = this._cliffPool.pop();
      if (img && img.active) { img.setTexture(key); img.setVisible(true); }
      else { img = this.add.image(0, 0, key); }
      img.setOrigin(0, 0);
      img.setPosition(side === 'se' ? p.x : p.x - ISO_TW / 2, p.y);
      // Just above the lower neighbour's own top (its back corner is 32 on),
      // so the shadow baked under the face lies on it rather than beneath it.
      img.setDepth(isoDepth(tx * TILE, ty * TILE) + 34);
      img.clearTint();
      imgs.push(img);
      if (style === 'falls') { img._falls = { side, hpx }; this._fallsImgs.add(img); }
      else if (img._falls) { this._fallsImgs.delete(img); img._falls = null; }
      // A ladder or vines on this face.
      const nx = side === 'se' ? tx + 1 : tx, ny = side === 'se' ? ty : ty + 1;
      const climb = f.climbAt(tx, ty, nx, ny);
      if (climb) {
        let ov = this._cliffPool.pop();
        const ok = this._climbTex(side, hpx, climb);
        if (ov && ov.active) { ov.setTexture(ok); ov.setVisible(true); } else ov = this.add.image(0, 0, ok);
        ov.setOrigin(0, 0);
        ov.setPosition(side === 'se' ? p.x : p.x - ISO_TW / 2, p.y);
        ov.setDepth(img.depth + 0.5);
        ov.clearTint();
        if (ov._falls) { this._fallsImgs.delete(ov); ov._falls = null; }
        imgs.push(ov);
      }
    }
    if (imgs.length) this._cliffFaces.set(tkey, imgs);
  },

  _elevReleaseFaces(tkey) {
    const imgs = this._cliffFaces && this._cliffFaces.get(tkey);
    if (!imgs) return;
    for (const img of imgs) {
      img.setVisible(false);
      if (img._falls && this._fallsImgs) { this._fallsImgs.delete(img); img._falls = null; }
      this._cliffPool.push(img);
    }
    this._cliffFaces.delete(tkey);
  },

  // --------------------------------------------------------------------------
  // ROUND 286 -- LADDERS AND VINES
  // --------------------------------------------------------------------------
  /** A ladder (two rails and rungs) or a hang of vines over a cliff face. */
  _climbTex(side, hpx, style) {
    const key = `climb_${style}_${side}_${hpx}`;
    if (this.textures.exists(key)) return key;
    const W = ISO_TW / 2, E = ISO_TH / 2;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = E + hpx + 4;
    const g = cnv.getContext('2d');
    const topAt = (x) => side === 'se' ? Math.round(E * (1 - (x + 0.5) / W)) : Math.round(E * ((x + 0.5) / W));
    if (style === 'vines') {
      for (const x0 of [8, 13, 18, 23]) {
        for (let y = -2; y < hpx + 3; y++) {
          const x = x0 + Math.round(Math.sin((y + x0) / 4) * 1.5);
          const top = topAt(Math.max(0, Math.min(W - 1, x)));
          g.fillStyle = (y + x0) % 7 === 0 ? '#7fbf4a' : '#3f7a2c';
          g.fillRect(x, top + y, 1, 1);
          if ((y + x0) % 6 === 0) { g.fillStyle = '#5fa33c'; g.fillRect(x + 1, top + y, 2, 1); }
        }
      }
    } else {
      const rails = [11, 20];
      for (const x of rails) {
        for (let y = -3; y < hpx + 2; y++) {
          const top = topAt(x);
          g.fillStyle = '#6b4a2a'; g.fillRect(x, top + y, 1, 1);
          g.fillStyle = '#8a6238'; g.fillRect(x + 1, top + y, 1, 1);
        }
      }
      for (let y = 2; y < hpx; y += 6) {
        for (let x = rails[0] + 1; x < rails[1]; x++) {
          g.fillStyle = '#9a7244'; g.fillRect(x, topAt(x) + y, 1, 1);
        }
      }
    }
    this.textures.addCanvas(key, cnv);
    return key;
  },

  // --------------------------------------------------------------------------
  // ROUND 286 -- WATERFALLS: they move, they mist, they are heard
  // --------------------------------------------------------------------------
  /** Called every frame from the scene's update. */
  _tickWaterfalls(dt) {
    if (!this._waterfalls || !this._waterfalls.length) return;
    // The falling glints: three frames, a step every 110ms.
    this._fallsT = (this._fallsT || 0) + dt;
    if (this._fallsImgs && this._fallsT > 0.11) {
      this._fallsT = 0;
      this._fallsFrame = ((this._fallsFrame || 0) + 1) % 3;
      for (const img of this._fallsImgs) {
        if (!img.visible || !img._falls) continue;
        img.setTexture(this._fallsTex(img._falls.side, img._falls.hpx, this._fallsFrame));
      }
    }
    if (this._insideRoom) return;
    // Mist at the foot of the falls on screen: soft puffs that rise and fade.
    this._mist = this._mist || [];
    const cam = this.cameras.main.worldView;
    this._mistT = (this._mistT || 0) - dt;
    if (this._mistT <= 0) {
      this._mistT = 0.09;
      const near = [];
      for (const w of this._waterfalls) {
        if (Math.abs(w.footX - this.world.x) > 900 || Math.abs(w.footY - this.world.y) > 900) continue;
        near.push(w);
      }
      if (near.length && this._mist.length < 60) {
        const w = near[Math.floor(Math.random() * near.length)];
        const p = isoProjectXY(w.footX + (Math.random() - 0.5) * 20, w.footY + (Math.random() - 0.5) * 20);
        if (p.x > cam.x - 64 && p.x < cam.x + cam.width + 64 && p.y > cam.y - 64 && p.y < cam.y + cam.height + 64) {
          const img = this.add.image(p.x, p.y - 4, this._mistTex());
          img.setDepth(isoDepth(w.footX, w.footY) + 60);
          img.setAlpha(0.55); img.setScale(0.6 + Math.random() * 0.5);
          this._mist.push({ img, t: 0, life: 1.1 + Math.random() * 0.7, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 10 });
        }
      }
    }
    for (let i = this._mist.length - 1; i >= 0; i--) {
      const m = this._mist[i];
      m.t += dt;
      const f = m.t / m.life;
      if (f >= 1) { m.img.destroy(); this._mist.splice(i, 1); continue; }
      m.img.x += m.vx * dt; m.img.y += m.vy * dt;
      m.img.setAlpha(0.55 * (1 - f));
      m.img.setScale(m.img.scaleX + dt * 0.5);
    }
  },

  _mistTex() {
    const key = 'fallsMist';
    if (this.textures.exists(key)) return key;
    const S = 24, cnv = document.createElement('canvas');
    cnv.width = S; cnv.height = S;
    const g = cnv.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    this.textures.addCanvas(key, cnv);
    return key;
  },

  /** Is the player within earshot of a waterfall? (Plays the river bed.) */
  _nearWaterfall(r = TILE * 10) {
    for (const w of (this._waterfalls || [])) {
      if (Math.abs(w.footX - this.world.x) < r && Math.abs(w.footY - this.world.y) < r) return true;
    }
    return false;
  },

  // --------------------------------------------------------------------------
  // ROUND 286 -- THE CAVE BEHIND THE FALLS
  // --------------------------------------------------------------------------
  /**
   * For each waterfall that drops at least a level onto open ground, a cave
   * behind the water: a spare den room, its own layout, a pack and a chest.
   * The way in is on the dry ground at the foot of the falls, beside the
   * water, and it is found by walking up to the falls and pressing E.
   */
  _buildFallsCaves(N) {
    this._fallsCaves = [];
    if (!this._waterfalls || !this.doorways) return;
    const f = this._elev;
    const done = [];
    for (const w of this._waterfalls) {
      if (w.drop < 0.9) continue;
      if (done.some(d => Math.hypot(d.x - w.footX, d.y - w.footY) < TILE * 30)) continue;
      // Dry, level-0 ground beside the foot of the falls, along the cliff.
      const ftx = Math.floor(w.footX / TILE), fty = Math.floor(w.footY / TILE);
      const along = w.side === 'se' ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      let spot = null;
      for (const [dx, dy] of along) {
        for (let k = 1; k <= 3 && !spot; k++) {
          const tx = ftx + dx * k, ty = fty + dy * k;
          const t = this.tileType[ty * N + tx];
          if (isWaterTile(t) || f.tileHeight(tx, ty) > 0.05) continue;
          const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
          if (this._collidesObstacle(x, y, 10)) continue;
          spot = { x, y };
        }
        if (spot) break;
      }
      if (!spot) continue;
      const room = this._addHiddenCave(spot.x, spot.y, `falls${done.length}|${w.tx},${w.ty}`);
      if (!room) break;   // the spare pool is spent
      done.push(spot);
      this._fallsCaves.push({ x: spot.x, y: spot.y, room: room.id, falls: { tx: w.tx, ty: w.ty } });
      // The mouth: a dark arch in the cliff behind the door, half hidden by
      // the spray -- found by someone who looks.
      const [bx, by] = w.side === 'se' ? [-0.5, 0] : [0, -0.5];
      const mx = spot.x + bx * TILE, my = spot.y + by * TILE;
      const pp = isoProjectFlat(mx, my);
      const mouth = this.add.image(pp.x, pp.y + 2 - f.tileHeight(Math.floor(spot.x / TILE), Math.floor(spot.y / TILE)) * ELEV_PX, this._caveMouthTex());
      mouth.setOrigin(0.5, 1);
      mouth.setScale(1.5);
      // Over the face it is cut into (that face sorts at its tile's back
      // corner + 34, one tile behind the door's).
      mouth.setDepth(isoDepth(Math.floor(spot.x / TILE) * TILE, Math.floor(spot.y / TILE) * TILE) + 3);
      this._fallsCaveMouths = (this._fallsCaveMouths || []).concat(mouth);
    }
  },

  _addHiddenCave(wx, wy, id) {
    const room = INTERIOR_ROOMS.find(r => r.denSlot !== undefined && r._site == null && !r._hiddenCave);
    if (!room) return null;
    const reg = regionAt(wx, wy);
    room._hiddenCave = id;
    room._spec = { ...FALLS_CAVE };
    room._palette = null;
    room.name = FALLS_CAVE.name; room.enterLabel = FALLS_CAVE.enterLabel; room.blurb = FALLS_CAVE.blurb;
    room.floor = reg && reg.id === 'elehyd' ? 'ice' : 'forge';
    room._regionId = reg ? reg.id : null;
    room.caveSeed = `hidden|${id}`;
    room.caveFamily = caveFamilyFor(room.denSlot, 'barrow');
    this._stampRoomTiles(room);
    this._dressDenRoom(room);
    // ROUND 289 -- the grid is rebuilt once for every cave (`_elevFlush`).
    this._elevDirty = { ...(this._elevDirty || {}), grid: true };
    this._rockViewKey = ''; this._treeViewKey = '';
    room._contentsBuilt = false;
    const entry = roomEntryPoint(room);
    this.doorways.push({ kind: 'enter', room, hidden: true, fallsCave: true, x: wx, y: wy, radius: 48,
      label: room.enterLabel, to: { x: entry.x, y: entry.y } });
    this.doorways.push({ kind: 'exit', room, x: entry.x, y: entry.y, radius: 44,
      label: 'step back out through the falls', to: { x: wx, y: wy } });
    const tier = regionDenTier(reg || REGIONS[0]);
    const keys = denMonsterKeys(denFamiliesFor({ denFamilies: ['bloomimp', 'vinegrasp', 'snapmaw', 'slime', 'bat'] }, tier),
      tier, MONSTER_TYPES, monsterKeysAtTier);
    const rng = seededRng(`hidden|${id}`);
    let at = entry, bd = -1;
    for (const t of room.caveFloor()) {
      const c = { x: room.x + (t.tx + 0.5) * TILE, y: room.y + (t.ty + 0.5) * TILE };
      const d = Math.hypot(c.x - entry.x, c.y - entry.y);
      if (d > bd) { bd = d; at = c; }
    }
    if (keys.length && this.spawnGroups) {
      this.spawnGroups.push({ region: reg && reg.id, key: keys[Math.floor(rng() * keys.length)],
        x: at.x, y: at.y, homeX: at.x, homeY: at.y, count: DEN_PACK_SIZE[tier] || 3, tier, label: room.name,
        roams: false, awake: false, cooldown: 0, members: [], den: room.id, spread: TILE * 2.2 });
    }
    const c = this._chestSpotInRoom ? this._chestSpotInRoom(room, rng) : null;
    if (c && this._addChest) this._addChest({ x: c.x, y: c.y, room, where: 'den', regionId: reg && reg.id,
      regionIndex: reg ? reg.index : 0, tier });
    return room;
  },

  // --------------------------------------------------------------------------
  // ROUND 286 -- CANYON DRESSING AND ROPE BRIDGES
  // --------------------------------------------------------------------------
  /** Boulders on the canyon benches: "yes, to props". */
  /** ROUND 289 -- a stone stair is DRAWN paved but stays the ground it was
   *  cut in. Round 286 wrote T_PLAZA into the tile map, and a plaza is a
   *  town's square to everything else that reads it (round 30 found a
   *  "plaza" on a mountainside and measured the wrong settlement). */
  _paveStair(i) {
    (this._stairPaved = this._stairPaved || new Set()).add(i);
  },

  _placeCanyonRocks() {
    const rocks = this._canyonRocks || [];
    if (!rocks.length || !this.obstacles || !this.obstacles.length) return;
    const frames = this.obstacles.map(o => o.frame).filter(f => f != null);
    let i = 0;
    const N = Math.round(Math.sqrt(this.tileType ? this.tileType.length : 0)) || 1;
    for (const [tx, ty] of rocks) {
      const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
      // ROUND 289 -- never on a road, a stair or water (round 21's rule): the
      // bench is dressed before its stairs are paved, so the paving wins.
      const tt = this.tileType ? this.tileType[ty * N + tx] : 0;
      if (isRoadTile(tt) || isWaterTile(tt) || (this._stairPaved && this._stairPaved.has(ty * N + tx))) continue;
      this.obstacles.push({ id: this.obstacles.length, x, y, radius: this.obstacles[0].radius,
        frame: frames[(i++ * 7) % frames.length], flip: i % 2 === 0, sprite: null, placedBy: 'canyon',
        palette: (regionAt(x, y) || {}).rockPalette || null });
    }
    this._rockSprites = new Map();
    this._elevDirty = { ...(this._elevDirty || {}), grid: true };   // ROUND 289 -- see `_elevFlush`
    this._rockViewKey = '';
  },

  /** ROUND 289 -- the rebuilds the elevation pass asked for, done once. */
  _elevFlush() {
    const d = this._elevDirty;
    this._elevDirty = null;
    if (!d) return;
    if (d.grid && this._rebuildStaticGrid) this._rebuildStaticGrid();
    if (d.views) {
      if (this._updateForestViewport) this._updateForestViewport(true);
      if (this._updateRockViewport) this._updateRockViewport(true);
      if (this._updateFloraViewport) this._updateFloraViewport(true);
    }
    if (d.minimap && this._buildMinimapTerrainCache) this._buildMinimapTerrainCache();
  },

  /** The plank deck of a rope bridge, as a ground diamond. */
  _bridgeDeckTex() {
    const key = 'bridgeDeck';
    if (this.textures.exists(key)) return key;
    const W = ISO_TW, H = ISO_TH;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = H;
    const g = cnv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = Math.abs(x + 0.5 - W / 2) / (W / 2) + Math.abs(y + 0.5 - H / 2) / (H / 2);
      if (u > 1) continue;
      // Planks run across the bridge: bands along one diagonal.
      const band = Math.floor((x / 2 + y) / 4);
      const gap = ((x / 2 + y) % 4) < 0.9;
      g.fillStyle = gap ? '#3b2a1a' : (band % 2 ? '#8a6238' : '#9c7244');
      if (u > 0.9) g.fillStyle = '#5a3d22';
      g.fillRect(x, y, 1, 1);
    }
    this.textures.addCanvas(key, cnv);
    return key;
  },

  /** Ropes and posts under a bridge edge: mostly open, so you see through. */
  _bridgeFaceTex(side, hpx) {
    const key = `bridgeFace_${side}_${hpx}`;
    if (this.textures.exists(key)) return key;
    const W = ISO_TW / 2, E = ISO_TH / 2;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = E + hpx;
    const g = cnv.getContext('2d');
    for (let x = 0; x < W; x++) {
      const top = side === 'se' ? Math.round(E * (1 - (x + 0.5) / W)) : Math.round(E * ((x + 0.5) / W));
      // The deck's edge, then a rope sagging under it.
      g.fillStyle = '#5a3d22'; g.fillRect(x, top, 1, 3);
      const sag = Math.round(4 + Math.sin((x / W) * Math.PI) * 5);
      g.fillStyle = '#b89a6a'; g.fillRect(x, top + sag, 1, 1);
    }
    this.textures.addCanvas(key, cnv);
    return key;
  },

  /** Is the player walking UNDER a bridge deck right now? */
  _playerUnderBridge() {
    const f = this._elev;
    if (!f || !f.bridges.size) return false;
    const tx = Math.floor(this.world.x / TILE), ty = Math.floor(this.world.y / TILE);
    if (!f.isBridge(tx, ty)) return false;
    return f.height(this.world.x, this.world.y, this._playerLayerH == null ? null : this._playerLayerH)
      < f.bridges.get(ty * f.N + tx) - LEDGE_STEP;
  },

  // --------------------------------------------------------------------------
  // ROUND 286 -- LEDGES IN THE CAVES ("likely caves as well")
  // --------------------------------------------------------------------------
  /**
   * In each cave (every claimed den and every cave behind the falls), a
   * raised ledge or two on the cave floor, away from the door, reached by
   * stone steps on the side the camera sees and, sometimes, a ladder. Kept
   * only if nothing on it can strand a player.
   */
  _raiseCaveLedges(field) {
    this._caveLedges = [];
    for (const room of INTERIOR_ROOMS) {
      if (!room.caveFamily || typeof room.caveFloor !== 'function') continue;
      if (room._site == null && !room._hiddenCave) continue;
      const floor = room.caveFloor();
      if (!floor || floor.length < 60) continue;
      const ox = Math.round(room.x / TILE), oy = Math.round(room.y / TILE);
      const isFloor = new Set(floor.map(t => `${t.tx},${t.ty}`));
      const rng = seededRng(`ledge|${room.id}`);
      const door = roomEntryPoint(room);
      const dtx = Math.floor(door.x / TILE) - ox, dty = Math.floor(door.y / TILE) - oy;
      const want = floor.length > 160 ? 2 : 1;
      let made = 0;
      for (let tries = 0; tries < 30 && made < want; tries++) {
        const c = floor[Math.floor(rng() * floor.length)];
        if (Math.hypot(c.tx - dtx, c.ty - dty) < 7) continue;
        const rx = 2.5 + rng() * 2, ry = 2.5 + rng() * 2;
        const tiles = floor.filter(t => ((t.tx - c.tx) / rx) ** 2 + ((t.ty - c.ty) / ry) ** 2 <= 1);
        if (tiles.length < 8) continue;
        if (tiles.some(t => field.levelAt(ox + t.tx, oy + t.ty) > 0)) continue;
        const inLedge = new Set(tiles.map(t => `${t.tx},${t.ty}`));
        // Steps: two tiles running south or east off the rim onto floor.
        let steps = null;
        for (const [dir, dx, dy] of [['S', 0, 1], ['E', 1, 0]]) {
          const cands = tiles.filter(t => !inLedge.has(`${t.tx + dx},${t.ty + dy}`)
            && [1, 2, 3].every(k => isFloor.has(`${t.tx + dx * k},${t.ty + dy * k}`) && !inLedge.has(`${t.tx + dx * k},${t.ty + dy * k}`)));
          if (cands.length) { const t = cands[Math.floor(rng() * cands.length)]; steps = { dir, t }; break; }
        }
        if (!steps) continue;
        // Try it on a scratch copy first.
        const probe = new ElevationField(field.N, TILE);
        for (const t of tiles) probe.setExact(ox + t.tx, oy + t.ty, 1);
        const sx = ox + steps.t.tx + (steps.dir === 'E' ? 1 : 0), sy = oy + steps.t.ty + (steps.dir === 'S' ? 1 : 0);
        probe.addRamp(sx, sy, steps.dir === 'E' ? 2 : 1, steps.dir === 'S' ? 2 : 1, steps.dir, 1, 0, 'stairs');
        const xs = tiles.map(t => t.tx), ys = tiles.map(t => t.ty);
        const box = { x0: ox + Math.min(...xs) - 4, y0: oy + Math.min(...ys) - 4, x1: ox + Math.max(...xs) + 4, y1: oy + Math.max(...ys) + 4 };
        const blocked = (x, y) => !isFloor.has(`${x - ox},${y - oy}`);
        if (strandedTiles(probe, box, blocked).length) continue;
        for (const t of tiles) field.setExact(ox + t.tx, oy + t.ty, 1);
        field.addRamp(sx, sy, steps.dir === 'E' ? 2 : 1, steps.dir === 'S' ? 2 : 1, steps.dir, 1, 0, 'stairs');
        this._caveLedges.push({ room: room.id, tiles: tiles.length, x: ox + c.tx, y: oy + c.ty });
        made++;
      }
    }
  },

  _caveMouthTex() {
    const key = 'fallsCaveMouth';
    if (this.textures.exists(key)) return key;
    const W = 22, H = 26, cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = H;
    const g = cnv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - W / 2) / (W / 2), v = (H - y - 0.5) / H;
      // An arch: a half-ellipse on a short straight base.
      const inside = v < 0.35 ? Math.abs(u) < 0.95 : (u * u) / 0.9 + ((v - 0.35) * (v - 0.35)) / 0.42 < 1;
      if (!inside) continue;
      const edge = Math.abs(u) > 0.78 || v > 0.92;
      g.fillStyle = edge ? 'rgba(40,34,30,0.95)' : `rgba(8,8,12,${(0.82 + 0.15 * (1 - v)).toFixed(2)})`;
      g.fillRect(x, y, 1, 1);
    }
    this.textures.addCanvas(key, cnv);
    return key;
  },
};
