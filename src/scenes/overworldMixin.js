// ============================================================================
// ROUND 194 -- THE OVERWORLD, AND THE SQUARES UNDER IT.
//
// The user: "Change to the transition between regions. On exiting a region the
// player moves to an overworld map ... Upon a player choosing to enter a square
// a playable map is generated based on the pixels present within that square."
//
// THREE PIECES, AND THEY ARE DELIBERATELY SEPARATE:
//
//   src/data/overworld.js     the grid, the biome index, the rank zones, and
//                             the rules about where a party may go
//   src/data/overworldGen.js  a PURE planner: cells in, region-shaped plan out
//   this file                 the screen, and turning a plan into ground
//
// WHY A GENERATED SQUARE IS A REGION. Everything this game can build --
// settlements, roads, steadings, spawn groups -- is written against the region
// shape. So a square becomes a region object in the one free world slot (2,1),
// is handed to those same builders, and is torn down again when the party
// leaves. The alternative was a second set of builders, which is how a project
// ends up with two definitions of a town.
//
// WHAT PERSISTS. The seed never changes (item 4.2), so the land, the towns and
// the cave mouths are the same every visit. What the save remembers is what the
// party EMPTIED -- `player.overworld.cleared` -- so a looted cave stays looted
// while the monsters come back.
// ============================================================================
import {
  OW_COLS, OW_ROWS, OW_SQUARE, OW_SQ_COLS, OW_SQ_ROWS, OW_TILES_PER_CELL,
  OW_VIEW_COLS, OW_VIEW_ROWS, OW_MAJOR, BIOMES, BIOME_BY_ID,
  squareCells, squareStats, squareRank, squareName, squareKey, namedRegionAt,
  canEnterSquare, canStepTo, inGrid, squareBox, OW_REGIONS, decodeBiomeIndex, familyOf,
  SHEETS, sheetOf, sqColsOf, sqRowsOf, registerSouthSheet,
} from '../data/overworld.js';
import {
  SOUTH_REGIONS, SOUTH_BY_ID, SOUTH_CROSSING,
  SOUTH_COLS, SOUTH_ROWS, SOUTH_BOX_CELLS, SOUTH_TILES_PER_CELL,
} from '../data/south.js';
import { planSquare, GEN_SLOT, GEN_TILES, GEN_REGION_PREFIX, genRng, cellAtTile, isLandCell } from '../data/overworldGen.js';
import { REGIONS, REGION_BY_ID, REGION_TILES, regionOrigin, regionPoint } from '../data/regions.js';
import { TILE_GRASS, TILE_WATER_LIGHT, TILE_WATER_DEEP } from '../data/town.js';
import { TILE_ACCENT } from '../data/regions.js';
import { RANK_ORDER } from '../data/ranks.js';
import { villagerNameFor } from '../data/quests.js';
// ROUND 197 -- what the party rides, and what that lets them cross.
import {
  VEHICLES, VEHICLE_BY_ID, ownedVehicles, TERRAIN_ANY, TERRAIN_GROUND, VEHICLE_CELL,
} from '../data/vehicles.js';
import { dirRow } from '../data/playerAnim.js';

const TILE_PX = 32;                       // the game's tile, in world units
const OW_RANK_TINT = {
  iron: 'rgba(200,200,200,0.00)', bronze: 'rgba(205,127,50,0.13)',
  silver: 'rgba(192,192,214,0.13)', gold: 'rgba(255,205,60,0.15)',
  diamond: 'rgba(120,230,255,0.17)',
};

export const OverworldMixin = {
  // ------------------------------------------------------------------ data --
  /** The biome index, decoded once from the loaded image. One byte per cell. */
  _owCells(sheetId = null) {
    const id = sheetId || this._owSheetId();
    const sh = sheetOf(id);
    this._owCellCache = this._owCellCache || {};
    if (this._owCellCache[id]) return this._owCellCache[id];
    if (!this.textures.exists(sh.asset)) return null;
    const src = this.textures.get(sh.asset).getSourceImage();
    const cnv = document.createElement('canvas');
    cnv.width = sh.cols; cnv.height = sh.rows;
    const ctx = cnv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    this._owCellCache[id] = decodeBiomeIndex(ctx.getImageData(0, 0, sh.cols, sh.rows), id);
    return this._owCellCache[id];
  },

  /** Which sheet the party is reading: the continent they are standing on. */
  _owSheetId() {
    if (this._owSheet) return this._owSheet;
    const st = this.player && this.player.overworld;
    return (st && st.sheet) || 'north';
  },

  /** The twelve southern regions, handed to the map once. */
  _owEnsureSouth() {
    if (!SHEETS.south.regions.length) {
      registerSouthSheet(SOUTH_REGIONS, { cols: SOUTH_COLS, rows: SOUTH_ROWS,
        boxCells: SOUTH_BOX_CELLS, tilesPerCell: SOUTH_TILES_PER_CELL });
    }
  },

  /** The same index, once, painted in biome colours -- what the screen draws.
   *  Rendering 780,000 cells per keypress would be a slideshow; rendering it
   *  once and blitting a window is a frame. */
  _owColourCanvas(sheetId = null) {
    const id = sheetId || this._owSheetId();
    const sh = sheetOf(id);
    this._owColourCnv = this._owColourCnv || {};
    if (this._owColourCnv[id]) return this._owColourCnv[id];
    const cells = this._owCells(id);
    if (!cells) return null;
    const cnv = document.createElement('canvas');
    cnv.width = sh.cols; cnv.height = sh.rows;
    const ctx = cnv.getContext('2d');
    const img = ctx.createImageData(OW_COLS, OW_ROWS);
    const pal = BIOMES.map(b => {
      const n = parseInt(b.colour.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    });
    for (let i = 0, p = 0; i < cells.length; i++, p += 4) {
      const c = pal[cells[i]] || pal[5];
      img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]; img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this._owColourCnv[id] = cnv;
    return cnv;
  },

  /** The travelling party's record. Lives on `player` so the save carries it
   *  with no save code (the rule saves.js states). */
  _owState() {
    const p = this.player;
    if (!p) return null;
    p.overworld = p.overworld || { at: null, cleared: {} };
    if (!p.overworld.cleared) p.overworld.cleared = {};
    return p.overworld;
  },

  /** What the party has emptied in one square. */
  _owClearedFor(sx, sy) {
    const st = this._owState();
    if (!st) return { chests: [], caves: [] };
    const k = squareKey(sx, sy);
    st.cleared[k] = st.cleared[k] || { chests: [], caves: [], visits: 0 };
    return st.cleared[k];
  },

  /** Which square the party is standing in: a generated one knows, and a named
   *  region is looked up by its box. */
  _owSquareNow() {
    const reg = this.currentRegion;
    const st = this._owState();
    const sheet = this._owSheetId();
    // ROUND 195 -- THE SHEET DECIDES FIRST. Sailing south leaves the party
    // standing in a northern region until they land, and reading the region
    // first put the cursor back on the Nek the moment the southern map opened.
    if (sheet === 'south') {
      if (reg && reg.authoredSouth) {
        const a2 = SOUTH_BY_ID[reg.id];
        if (a2) return { sx: Math.floor(a2.cellBox[0] / OW_SQUARE), sy: Math.floor(a2.cellBox[1] / OW_SQUARE) };
      }
      if (st && st.at) return { ...st.at };
      const w = SOUTH_BY_ID[SOUTH_CROSSING.to];
      return { sx: Math.floor(w.cellBox[0] / OW_SQUARE), sy: Math.floor(w.cellBox[1] / OW_SQUARE) };
    }
    if (reg && reg.square) return { ...reg.square };
    if (st && st.at) return { ...st.at };
    const owr = reg && OW_REGIONS.find(r => r.id === reg.id);
    if (owr) {
      return { sx: Math.floor(((owr.c0 + owr.c1) / 2) / OW_SQUARE), sy: Math.floor(((owr.r0 + owr.r1) / 2) / OW_SQUARE) };
    }
    return { sx: 20, sy: 7 };   // the Nek, which is where a new game starts
  },

  // ---------------------------------------------------------------- screen --
  /**
   * OPEN THE MAP. Item 1: "The player should be able to see the major grid as
   * 4 across 3 down" -- so the window is 800 x 600 cells, four major cells by
   * three, centred on where the party is standing.
   */
  _openOverworld(opts = {}) {
    if (this._overworldOpen) return;
    this._owEnsureSouth();
    this._owSheet = this._owSheetId();
    if (!this._owCells()) {
      this._floatText(this.world.x, this.world.y - 46, 'The map is not to hand.', '#ffcc80');
      return;
    }
    const el = document.getElementById('overworldPanel');
    if (!el) return;
    this._overworldOpen = true;
    // ROUND 200 -- "Mounts are currently not for the overworld map." The check
    // is in `_canMount` as well, which stops you getting on while the map is
    // up; this is the other half, for the player who was already riding when
    // they opened it. Not forced: opening a map is not being unhorsed.
    if (this._dismount) this._dismount(false, null);
    this._owFrom = opts.from || 'map';
    const at = this._owSquareNow();
    this._owCursor = { sx: at.sx, sy: at.sy };
    this._owHome = { sx: at.sx, sy: at.sy };
    el.style.display = 'block';
    this._drawOverworld();
  },

  _closeOverworld() {
    if (!this._overworldOpen) return;
    this._overworldOpen = false;
    const el = document.getElementById('overworldPanel');
    if (el) el.style.display = 'none';
  },

  /** Arrow keys and the D-pad walk the cursor; water and the map edge stop it
   *  (item 3), and it says why rather than simply refusing. */
  _owMove(dx, dy) {
    if (!this._overworldOpen) return;
    const cur = this._owCursor;
    const nx = cur.sx + dx, ny = cur.sy + dy;
    const cells = this._owCells();
    // ROUND 200 (3.8) -- "the ability to climb mountains or cross ocean in a
    // transport should be tied to higher ranks (i.e. silver or gold)".
    //
    // The two boons are exactly the two arguments `canStepTo` already takes,
    // which is what made them the right two to pick: `ocean` grants the boat
    // and `climb` clears the wheels. Nothing new in the overworld's own rules.
    // Only while actually travelling in something -- a boon that let a party
    // on foot walk into the sea would be a different feature.
    const riding = !!this._owVehicle();
    const step = canStepTo(cells, nx, ny, {
      boat: this._owHasBoat() || (riding && this._vehicleBoon && this._vehicleBoon('ocean') > 0),
      wheels: this._owOnWheels() && !(riding && this._vehicleBoon && this._vehicleBoon('climb') > 0),
      sheet: this._owSheetId(),
    });
    if (!step.ok) { this._owSay = step.why; this._drawOverworld(); return; }
    this._owCursor = { sx: nx, sy: ny };
    this._owSay = null;
    this._drawOverworld();
  },

  /**
   * ROUND 197 -- WHAT THE PARTY IS TRAVELLING IN, if anything.
   *
   * `player.vehicleActive` is an id from `player.vehicles`, which is where
   * round 196's yardmaster puts what you bought. Null means on foot, and on
   * foot is exactly what the overworld was before this round: no new refusal
   * and no new permission. A vehicle is a thing you get into.
   */
  _owVehicle() {
    const p = this.player;
    if (!p || !p.vehicleActive) return null;
    const owned = ownedVehicles(p).find(v => v && v.id === p.vehicleActive);
    return owned ? VEHICLE_BY_ID[owned.id] || null : null;
  },

  /** The vehicles the party could be travelling in, in the order they are
   *  listed for sale, plus "on foot" at the front. */
  _owVehicleCycle() {
    const ids = ownedVehicles(this.player).map(v => v.id);
    return [null, ...VEHICLES.filter(v => ids.includes(v.id)).map(v => v.id)];
  },

  /** Get in, get out, or change to the next one. The map's own key, because
   *  the map is where the choice matters. */
  _owNextVehicle() {
    const ring = this._owVehicleCycle();
    if (ring.length < 2) {
      this._owSay = 'You have nothing to travel in. The Society market sells transport.';
      this._drawOverworld();
      return;
    }
    const at = Math.max(0, ring.indexOf(this.player.vehicleActive || null));
    const next = ring[(at + 1) % ring.length];
    this.player.vehicleActive = next;
    const v = next ? VEHICLE_BY_ID[next] : null;
    this._owSay = v ? `Travelling by ${v.name.toLowerCase()}.` : 'On foot.';
    this._drawOverworld();
  },

  /** Something that floats: the boat flag round 194 left as a hook, and now
   *  also any vehicle the user put on the ocean-and-mountain side. */
  _owHasBoat() {
    const p = this.player;
    if (p && (p.boat || (p.passiveMods && p.passiveMods.waterWalk))) return true;
    const v = this._owVehicle();
    return !!v && v.terrain === TERRAIN_ANY;
  },

  /** ...and something that cannot climb. See MOUNTAIN_SHUT in overworld.js. */
  _owOnWheels() {
    const v = this._owVehicle();
    return !!v && v.terrain === TERRAIN_GROUND;
  },

  /** Enter the square under the cursor (item 6), if the party may. */
  _owEnter() {
    if (!this._overworldOpen) return;
    const { sx, sy } = this._owCursor;
    const sheet = this._owSheetId();
    const cells = this._owCells();
    const rank = this._playerRankStanding ? this._playerRankStanding().rank : 'iron';

    const verdict = canEnterSquare(cells, sx, sy,
      { rank, boat: this._owHasBoat(), wheels: this._owOnWheels(), sheet });
    if (!verdict.ok) {
      this._owSay = verdict.why;
      this._drawOverworld();
      return;
    }
    this._closeOverworld();
    // An authored southern region is built from its own entry; everything else
    // is generated from the pixels under it.
    if (verdict.authored && verdict.named) this._buildSouthRegion(verdict.named.id);
    else this._buildOverworldSquare(sx, sy);
    this._owRollAmbush(sx, sy);
  },

  /**
   * ROUND 197 -- WHAT IS WAITING WHEN YOU ARRIVE.
   *
   *   "monsters regularly attack you when you enter a new tile 30% chance"
   *
   * ONE ROLL PER SQUARE TRAVELLED, which is the reading the user confirmed --
   * not per cell (dozens a square) and not per world tile (constant combat).
   * The chance is the vehicle's: 30% in a wagon, 15% in a camper, 5% in the
   * airboat, 3% in the skyship, nothing at all on the dragon.
   *
   * ON FOOT THERE IS NO ROLL. A party that walked here has always met whatever
   * the square spawned and nothing more; the ambush is the price of covering
   * ground quickly, so it belongs to the thing covering it.
   *
   * SEEDED ON THE SQUARE AND THE VISIT, so it cannot be re-rolled by walking
   * out and back in -- the trick every daily shelf in this game uses, for the
   * same reason.
   */
  _owRollAmbush(sx, sy) {
    const v = this._owVehicle();
    if (!v || !(v.ambush > 0)) return 0;
    const rec = this._owClearedFor(sx, sy);
    const roll = genRng(((sx * 73856093) ^ (sy * 19349663) ^ ((rec.visits || 1) * 83492791)) >>> 0, 3)();
    // ROUND 200 (3.2) -- "Reduced chance of encounters". A fraction OFF the
    // vehicle's own chance rather than a flat subtraction, so a skyship (3%)
    // and a covered wagon (30%) both feel the same proportion of it -- a flat
    // number would either do nothing to the wagon or make the skyship immune.
    // Floored at a tenth of the vehicle's own rate: quiet roads, not empty
    // ones, because an ambush that can never happen is content deleted.
    const quiet = Math.min(0.9, this._vehicleBoon ? this._vehicleBoon('encounter') : 0);
    if (roll >= v.ambush * (1 - quiet)) return 0;
    const n = this._owAmbushParty(v, sx, sy);
    if (n > 0) {
      this._floatText(this.world.x, this.world.y - 46,
        'Ambush on the road!', '#ef9a9a');
      this._showLocationBanner && this._showLocationBanner('Ambushed',
        `Something was waiting for the ${v.name.toLowerCase()}.`);
    }
    return n;
  },

  /** The ambushers themselves: a handful of whatever this ground already
   *  spawns, put close enough to be a fight rather than a sighting. Drawn from
   *  the region's OWN spawn groups, so an ambush in the Cinderwaste is a
   *  Cinderwaste ambush and nothing here has to know a monster table. */
  _owAmbushParty(v, sx = null, sy = null) {
    const reg = this.currentRegion;
    if (!reg || !this._spawnMonster) return 0;
    const mine = (this.spawnGroups || []).filter(g => g.region === reg.id && g.key);
    if (!mine.length) return 0;
    const rng = genRng((reg.index * 2654435761) >>> 0, 11);
    // ROUND 199 -- ONE AMBUSH IN THREE IS PEOPLE.
    //
    // Round 197 drew the ambush from the region's own spawn groups so that a
    // hold-up in the Cinderwaste is a Cinderwaste hold-up and nothing here has
    // to know a monster table. That is still the rule -- and a road robbery
    // is the one thing in this game that ought not to be an animal. Round 196
    // imported three bandits and a pirate and round 199 gave them a swing, so
    // a share of the roll comes out as a CREW, graded to the same ground the
    // monsters are graded to.
    //
    // A third rather than half: the crews are six and the monster roster is
    // ninety-odd, so an even split would make a wagon journey feel like a
    // series of muggings. Rolled off the same seeded stream as everything
    // else here, so walking out of a square and back in cannot re-roll it.
    if (rng() < 0.34 && this._owAmbushCrew) {
      const made = this._owAmbushCrew(rng, sx, sy);
      if (made) return made;
    }
    const g = mine[Math.floor(rng() * mine.length)];
    const want = 2 + Math.floor(rng() * 3);
    let made = 0;
    for (let i = 0; i < want; i++) {
      const th = rng() * Math.PI * 2, d = TILE_PX * (7 + rng() * 5);
      const x = this.world.x + Math.cos(th) * d, y = this.world.y + Math.sin(th) * d;
      if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 18)) continue;
      // Through the same door every other spawn in the game goes through, with
      // a spawn point of its own so the ambushers behave like anything else
      // that lives here once the fight starts.
      const sp = { x, y, ox: 0, oy: 0, cooldown: 0, group: g };
      const m = this._spawnMonster(g.key, x, y, sp, null);
      // ROUND 200 (3.3) -- "Better loot from encounters while in a transport."
      //
      // MARKED ON THE MONSTER, not paid out here, and that is the important
      // half: an ambusher that dropped its extra the moment it spawned would
      // pay whether or not you beat it. `lootMult` is read by the drop when
      // the thing actually dies, so 3.3 means what it says -- what was waiting
      // for the wagon is carrying more, and you have to take it off them.
      if (m) {
        m.group = g;
        const rich = this._vehicleBoon ? this._vehicleBoon('loot') : 0;
        if (rich > 0) m.lootMult = 1 + rich;
        this.spawnPoints.push(sp); made++;
      }
    }
    return made;
  },

  /**
   * ROUND 199 -- the crew half of the ambush.
   *
   * Through `_spawnBandit`, which is round 95's door and already gives them
   * the ordinary damage path in both directions -- they hit you through
   * `_monsterHitPlayer` and you hit them through `_hitBandits`, so a bandit's
   * blow is dodged, blocked and answered by thorns like anything else's and
   * yours crits on them like anything else. What it wanted was a contract, and
   * this crew has none; `{ ambush: true }` is the whole of the difference, and
   * `_updateBandits` reads it to mean "come for the player, there is no cart".
   *
   * Graded to the square rather than rolled, the same way an escort's crew is
   * graded to its contract: a Quiet Trade hold-up on normal ground would make
   * the roster decoration.
   */
  _owAmbushCrew(rng, sx = null, sy = null) {
    if (!this._spawnBandit || !this._crewForTier) return 0;
    const reg = this.currentRegion;
    // The SQUARE's rank, not the region's -- an ambush happens on the square
    // the party just walked into, and that is the number the map has already
    // shown them in the rank wash before they stepped on it.
    const rank = (sx !== null && sy !== null)
      ? squareRank(sx, sy, this._owSheetId()) : 'normal';
    const tier = Math.max(0, Math.min(4, RANK_ORDER.indexOf(rank)));
    const crew = this._crewForTier(tier, `ow|${sx},${sy}`);
    if (!crew) return 0;
    const q = { id: `ow-ambush|${reg ? reg.id : 'x'}`, tier, ambush: true, state: 'active' };
    const want = 2 + Math.floor(rng() * 3);
    let made = 0;
    for (let i = 0; i < want; i++) {
      const th = rng() * Math.PI * 2, d = TILE_PX * (7 + rng() * 5);
      const x = this.world.x + Math.cos(th) * d, y = this.world.y + Math.sin(th) * d;
      if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 18)) continue;
      // A different body each time, so a crew of four is four people.
      const which = (i + Math.floor(rng() * 9)) % 9;
      if (this._spawnBandit(q, crew, which, x, y)) made++;
    }
    if (made) this._owSay = `${crew.name} come out of the scrub.`;
    return made;
  },

  /**
   * THE ONE DOOR, ON ITS OWN KEY.
   *
   * The crossing squares are also ordinary places -- Wallgate is a region and
   * the northern port is a square like any other -- so E always means "go
   * here" and the packet has its own key. Sharing E made landing at Wallgate
   * impossible: the same press that should have put the party ashore put them
   * back on the boat.
   */
  _owSail() {
    if (!this._overworldOpen) return;
    const { sx, sy } = this._owCursor;
    const sheet = this._owSheetId();
    const cross = this._owCrossingAt(sx, sy, sheet);
    if (!cross) { this._owSay = 'No packet calls here.'; this._drawOverworld(); return; }
    const rank = this._playerRankStanding ? this._playerRankStanding().rank : 'iron';
    if (RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(SOUTH_CROSSING.requiredRank)) {
      this._owSay = SOUTH_CROSSING.refuse;
      this._drawOverworld();
      return;
    }
    this._closeOverworld();
    this._owSailTo(cross);
  },

  /** Is this square the crossing, and which way does it go? */
  _owCrossingAt(sx, sy, sheet) {
    const c = SOUTH_CROSSING;
    if (sheet === 'north' && sx === c.fromSquare.sx && sy === c.fromSquare.sy) return { dir: 'south' };
    if (sheet === 'south') {
      const r = SOUTH_BY_ID[c.to];
      if (r) {
        const b = { sx: Math.floor(r.cellBox[0] / OW_SQUARE), sy: Math.floor(r.cellBox[1] / OW_SQUARE) };
        if (sx === b.sx && sy === b.sy) return { dir: 'north' };
      }
    }
    return null;
  },

  /** Take the packet. The sheet changes, the map reopens on the far shore, and
   *  the party picks where to land -- the crossing is a passage, not a
   *  teleport into a region they did not choose. */
  _owSailTo(cross) {
    const st = this._owState();
    if (cross.dir === 'south') {
      const w0 = SOUTH_BY_ID[SOUTH_CROSSING.to];
      const land = { sx: Math.floor(w0.cellBox[0] / OW_SQUARE), sy: Math.floor(w0.cellBox[1] / OW_SQUARE) };
      if (st) { st.sheet = 'south'; st.at = land; st.inSquare = false; }
      this._owSheet = 'south';
      this._floatText(this.world.x, this.world.y - 46, SOUTH_CROSSING.allow, '#9ad8ff');
      const r = SOUTH_BY_ID[SOUTH_CROSSING.to];
      this._owCursor = { sx: Math.floor(r.cellBox[0] / OW_SQUARE), sy: Math.floor(r.cellBox[1] / OW_SQUARE) };
    } else {
      if (st) { st.sheet = 'north'; st.at = { ...SOUTH_CROSSING.fromSquare }; st.inSquare = false; }
      this._owSheet = 'north';
      this._owCursor = { ...SOUTH_CROSSING.fromSquare };
    }
    this._owHome = { ...this._owCursor };
    this._overworldOpen = false;
    this._openOverworld({ from: 'crossing' });
  },

  _drawOverworld() {
    const canvas = document.getElementById('overworldCanvas');
    const sheetId = this._owSheetId();
    const sh = sheetOf(sheetId);
    const base = this._owColourCanvas(sheetId);
    if (!canvas || !base) return;
    const stage = canvas.parentElement;
    const w = Math.max(480, Math.min(1180, (stage ? stage.clientWidth : 960)));
    // The southern sheet is taller than it is wide, so the window is turned:
    // four major cells across and three down on the north, three across and
    // four down on the south, which keeps a square a square on both.
    const tall = sh.rows > sh.cols;
    const viewC = tall ? OW_MAJOR * 3 : OW_VIEW_COLS;
    const viewR = tall ? OW_MAJOR * 4 : OW_VIEW_ROWS;
    const h = Math.round(w * (viewR / viewC));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    const cells = this._owCells(sheetId);
    const cur = this._owCursor;
    const scale = w / viewC;                     // canvas px per overworld cell

    // The window, clamped so the map never scrolls off its own edge.
    let vx = (cur.sx + 0.5) * OW_SQUARE - viewC / 2;
    let vy = (cur.sy + 0.5) * OW_SQUARE - viewR / 2;
    vx = Math.max(0, Math.min(Math.max(0, sh.cols - viewC), vx));
    vy = Math.max(0, Math.min(Math.max(0, sh.rows - viewR), vy));
    const px = (c) => (c - vx) * scale, py = (r) => (r - vy) * scale;

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, vx, vy, viewC, viewR, 0, 0, w, h);

    // Rank wash, a square at a time, so the map says what it will cost before
    // the party walks into it.
    const s0 = Math.floor(vx / OW_SQUARE), s1 = Math.ceil((vx + viewC) / OW_SQUARE);
    const t0 = Math.floor(vy / OW_SQUARE), t1 = Math.ceil((vy + viewR) / OW_SQUARE);
    const myRank = this._playerRankStanding ? this._playerRankStanding().rank : 'iron';
    const myIdx = RANK_ORDER.indexOf(myRank);
    for (let sy = t0; sy < t1; sy++) {
      for (let sx = s0; sx < s1; sx++) {
        if (!inGrid(sx, sy, sheetId)) continue;
        const b = squareBox(sx, sy);
        const x = px(b.c0), y = py(b.r0), sw = OW_SQUARE * scale;
        const rank = squareRank(sx, sy, sheetId);
        ctx.fillStyle = OW_RANK_TINT[rank] || 'rgba(0,0,0,0)';
        ctx.fillRect(x, y, sw, sw);
        // Out of reach: too strong, or wet, and shaded so it reads at a glance.
        const st = squareStats(cells, sx, sy, sheetId);
        const tooStrong = RANK_ORDER.indexOf(rank) > Math.max(1, myIdx);
        const wet = st.land < 0.12 && !this._owHasBoat()
          && !(namedRegionAt(sx, sy, sheetId) && sh.regionsEnterable);
        if (tooStrong || wet) {
          ctx.fillStyle = wet ? 'rgba(6,10,26,0.42)' : 'rgba(20,0,0,0.34)';
          ctx.fillRect(x, y, sw, sw);
        }
      }
    }

    // The grid: every square, and the major lines the user's own map draws.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    for (let c = Math.ceil(vx / OW_SQUARE) * OW_SQUARE; c <= vx + viewC; c += OW_SQUARE) {
      ctx.moveTo(Math.round(px(c)) + 0.5, 0); ctx.lineTo(Math.round(px(c)) + 0.5, h);
    }
    for (let r = Math.ceil(vy / OW_SQUARE) * OW_SQUARE; r <= vy + viewR; r += OW_SQUARE) {
      ctx.moveTo(0, Math.round(py(r)) + 0.5); ctx.lineTo(w, Math.round(py(r)) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,102,0.55)';
    ctx.beginPath();
    for (let c = Math.ceil(vx / OW_MAJOR) * OW_MAJOR; c <= vx + viewC; c += OW_MAJOR) {
      ctx.moveTo(Math.round(px(c)) + 0.5, 0); ctx.lineTo(Math.round(px(c)) + 0.5, h);
    }
    for (let r = Math.ceil(vy / OW_MAJOR) * OW_MAJOR; r <= vy + viewR; r += OW_MAJOR) {
      ctx.moveTo(0, Math.round(py(r)) + 0.5); ctx.lineTo(w, Math.round(py(r)) + 0.5);
    }
    ctx.stroke();

    // The named regions, boxed and labelled the way the user's map has them.
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const r of sh.regions) {
      if (r.c1 < vx || r.c0 > vx + viewC || r.r1 < vy || r.r0 > vy + viewR) continue;
      // An authored southern region is a place the party can GO, so it is
      // drawn in the colour the map uses for somewhere reachable rather than
      // in the north's "this has its own roads" gold.
      ctx.strokeStyle = r.authored ? 'rgba(154,216,255,0.95)' : 'rgba(255,214,102,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px(r.c0), py(r.r0), (r.c1 - r.c0) * scale, (r.r1 - r.r0) * scale);
      ctx.fillStyle = r.authored ? '#9ad8ff' : '#ffd666';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
      const lx = px((r.c0 + r.c1) / 2), ly = py(r.r0) - 5;
      ctx.strokeText(r.name, lx, ly); ctx.fillText(r.name, lx, ly);
      ctx.font = '11px system-ui, sans-serif';
      for (const [name, c, rr] of r.places) {
        const x = px(c), y = py(rr);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
        ctx.strokeText(name, x, y - 5); ctx.fillText(name, x, y - 5);
      }
      ctx.font = 'bold 13px system-ui, sans-serif';
    }

    // THE CROSSING, marked on both shores.
    {
      const c = SOUTH_CROSSING;
      let at = null;
      if (sheetId === 'north') at = { sx: c.fromSquare.sx, sy: c.fromSquare.sy };
      else {
        const r = SOUTH_BY_ID[c.to];
        if (r) at = { sx: Math.floor(r.cellBox[0] / OW_SQUARE), sy: Math.floor(r.cellBox[1] / OW_SQUARE) };
      }
      if (at) {
        const b = squareBox(at.sx, at.sy);
        const x = px(b.c0) + OW_SQUARE * scale / 2, y = py(b.r0) + OW_SQUARE * scale / 2;
        ctx.fillStyle = '#ffd666';
        ctx.beginPath(); ctx.arc(x, y, Math.max(3, scale * 3), 0, Math.PI * 2); ctx.fill();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
        const t = sheetId === 'north' ? 'the southern packet' : 'the packet home';
        ctx.strokeText(t, x, y - 10); ctx.fillText(t, x, y - 10);
      }
    }

    // Where the party is, and where the cursor is.
    //
    // ROUND 199 -- AND WHAT THE PARTY IS TRAVELLING IN, DRAWN.
    //
    // Round 197 put you in a wagon and the map said so in a line of text under
    // it. The blue box was the same blue box whether you were walking or on a
    // dragon, which is the one screen where the difference decides what you
    // can cross. It is drawn now: the vehicle's own south-facing cell, in the
    // colourway you bought, sitting on the square the party is standing on.
    // On foot it is the box it always was.
    const home = this._owHome || this._owSquareNow();
    const hb = squareBox(home.sx, home.sy);
    this._owDrawVehicleMarker(ctx, px(hb.c0), py(hb.r0), OW_SQUARE * scale);
    ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2;
    ctx.strokeRect(px(hb.c0) + 2, py(hb.r0) + 2, OW_SQUARE * scale - 4, OW_SQUARE * scale - 4);
    const cb = squareBox(cur.sx, cur.sy);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.strokeRect(px(cb.c0) + 1, py(cb.r0) + 1, OW_SQUARE * scale - 2, OW_SQUARE * scale - 2);

    this._owWriteDetail();
  },

  /**
   * ROUND 199 -- the active vehicle, drawn on the party's square.
   *
   * Straight onto the map's own 2D context from the Phaser texture's source
   * image, rather than through `_vehicleIconUrl`: that one builds a data URL
   * for an `<img>` in the shop row, and this is already a canvas. The south
   * cell, because the map is looked down on and south is the pose every one of
   * these sheets leads with.
   *
   * Returns whether it drew, so a caller can tell "on foot" from "the texture
   * has not loaded yet" -- and both fall back to the box, which is what round
   * 198's notes would call not letting a missing thing look like a choice.
   */
  _owDrawVehicleMarker(ctx, x, y, size) {
    const v = this._owVehicle ? this._owVehicle() : null;
    if (!v) return false;
    const owned = ownedVehicles(this.player).find(o => o && o.id === v.id);
    const texKey = this._vehicleTexture(v.art, owned && owned.colour);
    if (!texKey || !this.textures.exists(texKey)) return false;
    try {
      const src = this.textures.get(texKey).getSourceImage();
      const col = dirRow('south');
      // Inset a little so the square's own outline still reads as the square.
      const d = Math.max(8, Math.round(size * 0.78));
      const off = Math.round((size - d) / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, col * VEHICLE_CELL, 0, VEHICLE_CELL, VEHICLE_CELL,
        Math.round(x) + off, Math.round(y) + off, d, d);
      return true;
    } catch (e) {
      return false;
    }
  },

  /** The line under the map: what the cursor is over, and whether the party
   *  may go there. */
  _owWriteDetail() {
    const el = document.getElementById('overworldDetail');
    if (!el) return;
    const sheetId = this._owSheetId();
    const cells = this._owCells(sheetId);
    const { sx, sy } = this._owCursor;
    const named = namedRegionAt(sx, sy, sheetId);
    const st = squareStats(cells, sx, sy, sheetId);
    const rank = squareRank(sx, sy, sheetId);
    const name = named ? named.name : squareName(cells, sx, sy, null, sheetId);
    const myRank = this._playerRankStanding ? this._playerRankStanding().rank : 'iron';
    const cross = this._owCrossingAt(sx, sy, sheetId);
    const verdict = canEnterSquare(cells, sx, sy, { rank: myRank, boat: this._owHasBoat(), sheet: sheetId });
    const mix = BIOMES
      .map(b => ({ b, n: st.hist[b.id] }))
      .filter(x => x.n > st.total * 0.06)
      .sort((a, b2) => b2.n - a.n)
      .slice(0, 3)
      .map(x => `${x.b.name} ${Math.round(x.n / st.total * 100)}%`)
      .join(' · ');
    const cleared = this._owState() && this._owState().cleared[`${sheetId}:${squareKey(sx, sy)}`];
    const rows = [
      `<b>${name}</b>`
      + ` <span class="ow-rank ow-${rank}">${rank[0].toUpperCase() + rank.slice(1)} rank</span>`
      + (named && named.authored ? ` <span class="ow-mix">${(SOUTH_BY_ID[named.id] || {}).blurb || ''}</span>` : ''),
      `<span class="ow-mix">${mix || 'open water'}${st.river ? ' · a river runs through it' : ''}</span>`,
      verdict.ok
        ? `<span class="ow-ok">Press E to travel here${cleared && cleared.visits ? ` · visited ${cleared.visits}×` : ''}</span>`
        : `<span class="ow-no">${this._owSay || verdict.why}</span>`,
      cross ? `<span class="ow-ok">Press F to take ${sheetId === 'north' ? 'the southern packet' : 'the packet home'}</span>` : '',
      // ROUND 197 -- what you are travelling in, and what it costs you. The
      // ambush chance is printed HERE and nowhere else, because here is the
      // only place it is about to be rolled.
      (() => {
        const v = this._owVehicle();
        const owned = ownedVehicles(this.player).length;
        if (!v) {
          return owned
            ? '<span class="ow-mix">On foot · press V to travel by one of yours</span>'
            : '<span class="ow-mix">On foot</span>';
        }
        const risk = v.ambush > 0
          ? `${Math.round(v.ambush * 100)}% ambushed on arrival`
          : 'nothing waits for it';
        return `<span class="ow-mix">By ${v.name.toLowerCase()} · `
          + `${v.terrain === TERRAIN_ANY ? 'crosses ocean and mountain' : 'roads and open ground'}`
          + ` · ${risk} · V to change</span>`;
      })(),
    ];
    el.innerHTML = rows.join('<br>');
  },

  // --------------------------------------------------------------- the map --
  /**
   * BUILD A SQUARE AND STAND IN IT.
   *
   * The order matters and each step says why: the old square has to be gone
   * before the new one is laid, the ground has to exist before anything is
   * placed on it, and the party has to be moved before the viewports are told
   * to rebuild -- they draw what is around the player.
   */
  _buildOverworldSquare(sx, sy) {
    const cells = this._owCells();
    if (!cells) return null;
    const mine = squareCells(cells, sx, sy);
    const plan = planSquare(mine, sx, sy, {
      rank: squareRank(sx, sy),
      surge: !!(this.player && this.player.surgeStarted),
    });
    const region = plan.region;

    this._teardownGeneratedSquare();

    // The square joins the roster while it exists, which is what makes every
    // position->region lookup (ground art, rock palette, chests, spawn gaps)
    // see it. `_teardownGeneratedSquare` takes it out again.
    REGIONS.push(region);
    REGION_BY_ID[region.id] = region;
    this._genRegion = region;
    this._genPlan = plan;

    this._paintOverworldSquare(region, mine);
    this._placeOverworldContent(region, plan, mine);

    const st = this._owState();
    if (st) {
      st.at = { sx, sy };
      // `inSquare` is what a LOAD reads: a save taken in a generated square has
      // to rebuild it before the party can stand in it, and a save taken in an
      // authored region must not.
      st.inSquare = true;
      const rec = this._owClearedFor(sx, sy);
      rec.visits = (rec.visits || 0) + 1;
    }

    // Stand the party in the middle of it -- and SNAP THE CAMERA, which is
    // the difference between arriving and watching the camera fly across the
    // continent for eight seconds with nothing drawn under it. The follow is
    // a 0.12 lerp; a square is half a world away from the last one.
    const at = regionPoint(region, region.arrival);
    this.world.x = at.x; this.world.y = at.y;
    this.currentRegion = region;
    this._insideRoom = null;
    if (this.teleportTo) this.teleportTo(at.x, at.y);
    this._updateSpawnActivation && this._updateSpawnActivation(true);
    this._updateGroundViewport && this._updateGroundViewport(true);
    this._updateForestViewport && this._updateForestViewport(true);
    this._updateRockViewport && this._updateRockViewport(true);
    this._updateStaticViewport && this._updateStaticViewport(true);
    this._updateFloraViewport && this._updateFloraViewport(true);
    this._buildMinimapTerrainCache && this._buildMinimapTerrainCache();
    this._drawMinimap && this._drawMinimap();
    this._showLocationBanner && this._showLocationBanner(region.name, region.blurb);
    return region;
  },

  /**
   * ROUND 195 -- ONE OF THE TWELVE, BUILT ON ARRIVAL.
   *
   * The southern regions are authored (src/data/south.js) rather than
   * generated, but they are built the same way a generated square is: into the
   * spare world slot, one at a time, through the builders the northern regions
   * use at boot. That is the whole reason the grid did not have to grow -- see
   * the measurements in south.js's header.
   *
   * The difference from `_buildOverworldSquare` is only where the plan comes
   * from: `_stampRegion` does the ground here, because an authored region
   * carries its own ocean, peaks, lakes and rivers and those are the geography
   * the user's map was measured into.
   */
  _buildSouthRegion(id) {
    const authored = SOUTH_BY_ID[id];
    if (!authored) return null;
    this._teardownGeneratedSquare();

    // A copy, in the spare slot, with the fields the runtime needs. The
    // authored entry itself is never mutated: it is data, and a build that
    // edits its own source is a build that cannot be repeated.
    const region = {
      ...authored,
      col: GEN_SLOT.col, row: GEN_SLOT.row,
      generated: true, authoredSouth: true,
      square: null, exits: [],
    };
    REGIONS.push(region);
    REGION_BY_ID[region.id] = region;
    this._genRegion = region;
    this._genPlan = null;

    // The ground, from the region's own bands -- the same call `_buildGround`
    // makes for every northern region at boot.
    const t0 = region.col * REGION_TILES, u0 = region.row * REGION_TILES;
    for (let ty = 0; ty < REGION_TILES; ty++) {
      for (let tx = 0; tx < REGION_TILES; tx++) this._setTile(t0 + tx, u0 + ty, TILE_GRASS);
    }
    this._stampRegion(region);

    // ...and the content, through the same builders.
    for (const st of (region.settlements || [])) this._buildSettlement(region, st);
    // The keepers those settlements just staged. `_buildSettlement` queues a
    // shopkeeper per service onto `_pendingNpcs` rather than pushing one,
    // because at boot `_buildNpcs` runs afterwards and ASSIGNS `this.npcs`.
    // Out here nothing runs afterwards, so the queue is drained on the spot.
    this._drainPendingNpcs && this._drainPendingNpcs();
    this._buildGenericDoorways && this._buildGenericDoorways();
    this._scatterSouthCover(region);
    this._peopleSouthSettlements(region);
    this._buildRegionSpawnGroups(region);

    const at = regionPoint(region, region.arrival);
    const CLEAR = 20 * TILE_PX;
    this.spawnGroups = (this.spawnGroups || []).filter(g => !(g.region === region.id
      && Math.hypot((g.homeX || 0) - at.x, (g.homeY || 0) - at.y) < CLEAR));
    this.spawnPoints = (this.spawnPoints || []).filter(sp => !sp.group || sp.group.region !== region.id
      || Math.hypot(sp.x - at.x, sp.y - at.y) >= CLEAR);

    const st = this._owState();
    if (st) {
      st.sheet = 'south';
      st.at = { sx: Math.floor(authored.cellBox[0] / OW_SQUARE), sy: Math.floor(authored.cellBox[1] / OW_SQUARE) };
      st.inSquare = true;
      const rec = this._owClearedFor(st.at.sx, st.at.sy);
      rec.visits = (rec.visits || 0) + 1;
    }

    this.world.x = at.x; this.world.y = at.y;
    this.currentRegion = region;
    this._insideRoom = null;
    if (this.teleportTo) this.teleportTo(at.x, at.y);
    this._updateSpawnActivation && this._updateSpawnActivation(true);
    this._updateGroundViewport && this._updateGroundViewport(true);
    this._updateForestViewport && this._updateForestViewport(true);
    this._updateRockViewport && this._updateRockViewport(true);
    this._updateStaticViewport && this._updateStaticViewport(true);
    this._updateFloraViewport && this._updateFloraViewport(true);
    this._buildMinimapTerrainCache && this._buildMinimapTerrainCache();
    this._drawMinimap && this._drawMinimap();
    this._showLocationBanner && this._showLocationBanner(region.name, region.blurb);
    return region;
  },

  /** Trees and rocks for an authored southern region, at its own densities.
   *  Same contract as the generated squares': append, keep id === index. */
  _scatterSouthCover(region) {
    const o = regionOrigin(region);
    const rng = genRng(region.index * 2654435761 >>> 0, 5);
    this.forestTrees = this.forestTrees || [];
    this.obstacles = this.obstacles || [];
    const artKeys = this.forestTrees.length
      ? [...new Set(this.forestTrees.slice(0, 200).map(t => t.artKey))] : ['pine'];
    const cells = 48;                                  // a coarse lattice over the region
    const step = REGION_TILES / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const nTree = Math.floor(region.forestDensity * 2.2 + (rng() < (region.forestDensity * 2.2) % 1 ? 1 : 0));
        for (let i = 0; i < nTree; i++) {
          const x = o.x + (c + rng()) * step * TILE_PX, y = o.y + (r + rng()) * step * TILE_PX;
          if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 20)) continue;
          this.forestTrees.push({ id: this.forestTrees.length, x, y,
            artKey: artKeys[Math.floor(rng() * artKeys.length)], facing: 'south', palette: null, radius: 14 });
        }
        const nRock = Math.floor(region.rockDensity * 0.9 + (rng() < (region.rockDensity * 0.9) % 1 ? 1 : 0));
        for (let i = 0; i < nRock; i++) {
          const x = o.x + (c + rng()) * step * TILE_PX, y = o.y + (r + rng()) * step * TILE_PX;
          if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 24)) continue;
          this.obstacles.push({ id: this.obstacles.length, x, y, radius: 18,
            frame: Math.floor(rng() * 8), palette: region.rockPalette || null, sprite: null });
        }
      }
    }
    this._rebuildStaticGrid && this._rebuildStaticGrid();
  },

  /**
   * Somebody lives in the twelve. Their STORIES are the next round's work --
   * this is who is standing in the street when you walk in.
   *
   * TWO KINDS, and the difference matters. `_spawnTownFolk` makes crowd:
   * sprites with a life and a leash that cannot be spoken to, which is what
   * fills a town. The first few of each settlement are then ALSO put on
   * `this.npcs` with a name and a line, the way round 178's refugees are, so
   * that a southern town has people in it and not only traffic. The comment
   * that round left is the whole argument: "a city full of scenery is the
   * same city with more sprites in it."
   *
   * The floor this is written against is test_round65's -- twelve npcs in
   * every region -- and the keepers `_buildSettlement` stages are counted
   * towards it too, so the named share is deliberately generous: three
   * settlements at four named each clears it without the shops.
   */
  _peopleSouthSettlements(region) {
    if (!this._spawnTownFolk) return 0;
    const rng = genRng((region.index * 40503) >>> 0, 9);
    const MODELS = ['npc_farmer', 'npc_peasant_man', 'npc_cheerful_peasant_girl', 'npc_townsman'];
    const LINES = [
      'The packet only calls when the weather lets it. Weeks, sometimes.',
      'North of the water? Then you are the first I have met who came by choice.',
      'Whatever it is out past the fields, it was here before we were.',
      'We keep the gate shut after dark and nobody has to be told twice.',
      'Trade is trade. Your coin spends the same as anybody’s.',
      'Ask at the board if you want work. There is always work.',
    ];
    let named = 0;
    for (const st of (region.settlements || [])) {
      const at = st._centre || regionPoint(region, st.at);
      const n = Math.max(4, Math.round(st.houses * 0.8));
      const wantNamed = st.kind === 'city' ? 6 : 4;
      let mine = 0;
      for (let i = 0; i < n; i++) {
        // A SPOT IS LOOKED FOR, not tried once. The first version rolled a
        // point and gave up on it if it was water or a wall, which cost a
        // coastal town a quarter of its people -- Sandwatch came out with 16
        // of 22 -- and test_round65's floor is that a settlement gets the
        // crowd it asked for. Ten rolls, widening, the way `_stageSettlementFolk`
        // nudges a named villager off the ground it cannot stand on.
        let x = 0, y = 0, found = false;
        for (let a = 0; a < 10 && !found; a++) {
          const th = rng() * Math.PI * 2, d = TILE_PX * (1 + rng() * st.radius * (0.8 + a * 0.15));
          x = at.x + Math.cos(th) * d; y = at.y + Math.sin(th) * d;
          found = !this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 14);
        }
        if (!found) continue;
        const e = this._spawnTownFolk(MODELS[Math.floor(rng() * MODELS.length)],
          Math.floor(rng() * 3), x, y, `${st.id}|${i}`);
        if (!e) continue;
        e.home = { x, y };
        e.settlement = st.id;
        if (mine >= wantNamed) continue;
        mine++;
        e.name = villagerNameFor(`south|${st.id}|${i}`);
        e.dialogue = LINES[Math.floor(rng() * LINES.length)];
        e.villager = true;
        this.npcs = this.npcs || [];
        this.npcs.push(e);
        named++;
      }
    }
    return named;
  },

  /** Everything the last generated square put in the world, removed. */
  _teardownGeneratedSquare() {
    const old = this._genRegion;
    if (!old) return;
    const o = regionOrigin(old);
    const x0 = o.x, y0 = o.y, x1 = o.x + REGION_TILES * TILE_PX, y1 = o.y + REGION_TILES * TILE_PX;
    const inside = (e) => e && e.x >= x0 && e.x < x1 && e.y >= y0 && e.y < y1;
    const insideW = (e) => e && e.wx >= x0 && e.wx < x1 && e.wy >= y0 && e.wy < y1;

    for (const b of (this.buildings || []).filter(inside)) {
      if (b.structure && this._unplaceStructure) this._unplaceStructure(b);
      else if (this._unplaceTownBuilding) this._unplaceTownBuilding(b);
      else if (this._unplaceBuilding) this._unplaceBuilding(b);
    }
    this.buildings = (this.buildings || []).filter(b => !inside(b));
    this._occludables = (this._occludables || []).filter(b => !inside(b));
    this.structures = (this.structures || []).filter(b => !inside(b));
    this._cityWalls = (this._cityWalls || []).filter(b => !inside(b));

    for (const p of (this.cityProps || []).filter(inside)) if (p.sprite) p.sprite.destroy();
    this.cityProps = (this.cityProps || []).filter(p => !inside(p));

    // Trees and rocks are addressed BY ARRAY INDEX (`t.id === forestTrees[id]`),
    // so removing some means renumbering the rest and dropping every sprite
    // that was keyed on the old numbers. Getting this wrong draws one tree as
    // another, which is the kind of fault that looks like a texture bug.
    if (this._treeTiles) {
      for (const [, spr] of this._treeTiles) { spr.setVisible(false); this._treePool.push(spr); }
      this._treeTiles.clear(); this._treeViewKey = '';
    }
    if (this._rockSprites) {
      for (const [, spr] of this._rockSprites) { spr.setVisible(false); this._rockPool.push(spr); }
      this._rockSprites.clear(); this._rockViewKey = '';
    }
    this.forestTrees = (this.forestTrees || []).filter(t => !inside(t)).map((t, i) => ({ ...t, id: i }));
    this.obstacles = (this.obstacles || []).filter(ob => !inside(ob)).map((ob, i) => ({ ...ob, id: i, sprite: null }));
    this._rebuildStaticGrid && this._rebuildStaticGrid();

    this.doorways = (this.doorways || []).filter(d => !(d.x >= x0 && d.x < x1 && d.y >= y0 && d.y < y1));
    this.questBoards = (this.questBoards || []).filter(q => !inside(q));
    this.harvestNodes = (this.harvestNodes || []).filter(n => !inside(n));
    this.chests = (this.chests || []).filter(c => !inside(c)).map((c, i) => ({ ...c, id: i }));
    this.sites = (this.sites || []).filter(s => !inside(s));
    this._steadings = (this._steadings || []).filter(s => !inside(s));

    for (const m of (this.monsters || []).filter(insideW)) { if (m.sprite) m.sprite.destroy(); m.alive = false; }
    this.monsters = (this.monsters || []).filter(m => !insideW(m));
    this.spawnGroups = (this.spawnGroups || []).filter(g => g.region !== old.id);
    this.spawnPoints = (this.spawnPoints || []).filter(sp => !sp.group || sp.group.region !== old.id);

    for (const n of (this.npcs || []).filter(inside)) if (n.sprite) n.sprite.destroy();
    this.npcs = (this.npcs || []).filter(n => !inside(n));
    for (const f of (this.townFolk || []).filter(inside)) if (f.sprite) f.sprite.destroy();
    this.townFolk = (this.townFolk || []).filter(f => !inside(f));
    this.villagers = (this.villagers || []).filter(v => !inside(v));

    // ...and the slot itself goes back to open water.
    const t0 = old.col * REGION_TILES, u0 = old.row * REGION_TILES;
    for (let ty = 0; ty < REGION_TILES; ty++) {
      for (let tx = 0; tx < REGION_TILES; tx++) this._setTile(t0 + tx, u0 + ty, TILE_WATER_DEEP);
    }

    const i = REGIONS.indexOf(old);
    if (i >= 0) REGIONS.splice(i, 1);
    delete REGION_BY_ID[old.id];
    this._genRegion = null;
    this._genPlan = null;
  },

  /**
   * THE GROUND, PAINTED FROM THE PIXELS.
   *
   * The user: "If a big river runs through the square on the overworld map a
   * river better run through the generated location." So water is not
   * decoration here -- ocean, lake and river cells become real water tiles, and
   * a river's cells are joined to their neighbours so the watercourse is
   * continuous rather than a row of ponds.
   *
   * One cell is 20.48 tiles. The cell boundary is dithered on a position hash
   * so a biome edge reads as a coastline rather than as graph paper.
   */
  _paintOverworldSquare(region, cells) {
    const t0 = region.col * REGION_TILES, u0 = region.row * REGION_TILES;
    const domId = (this._genPlan && this._genPlan.stats.dominant) || 5;
    const domFamily = familyOf(domId);

    // Everything outside the square is open sea: the edge of the playable map.
    for (let ty = 0; ty < REGION_TILES; ty++) {
      for (let tx = 0; tx < REGION_TILES; tx++) {
        if (tx < GEN_TILES && ty < GEN_TILES) continue;
        this._setTile(t0 + tx, u0 + ty, TILE_WATER_DEEP);
      }
    }

    const hash = (x, y) => {
      let h = Math.imul(x, 0x27d4eb2f) ^ Math.imul(y, 0x165667b1);
      h = Math.imul(h ^ (h >>> 15), 0x2545f491);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    for (let ty = 0; ty < GEN_TILES; ty++) {
      for (let tx = 0; tx < GEN_TILES; tx++) {
        // The cell this tile sits in, with a little jitter at the seam so the
        // change of ground is ragged.
        const fx = tx / OW_TILES_PER_CELL, fy = ty / OW_TILES_PER_CELL;
        const jx = Math.min(OW_SQUARE - 1, Math.max(0, Math.floor(fx + (hash(tx, ty) - 0.5) * 0.5)));
        const jy = Math.min(OW_SQUARE - 1, Math.max(0, Math.floor(fy + (hash(ty, tx) - 0.5) * 0.5)));
        const id = cells[jy * OW_SQUARE + jx];
        const b = BIOME_BY_ID[id] || BIOME_BY_ID[5];
        let t;
        if (b.water === 'deep') t = TILE_WATER_DEEP;
        else if (b.water) t = TILE_WATER_LIGHT;
        // The accent pack is the square's OTHER ground, so it is used where the
        // cell is a different family of country -- rock in a forest, sand in a
        // grassland -- and not merely a different shade of the same one.
        else t = (familyOf(id) === domFamily) ? TILE_GRASS : TILE_ACCENT;
        this._setTile(t0 + tx, u0 + ty, t);
      }
    }

    // THE RIVERS, JOINED UP. A river cell is one or two cells wide on the
    // overworld, which is most of a square's width in tiles; what is drawn is a
    // channel through the middle of each river cell, carried into every river
    // neighbour so the course is continuous.
    const RIVER_HALF = Math.round(OW_TILES_PER_CELL * 0.22);
    const stroke = (ax, ay, bx, by, half) => {
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(ax + (bx - ax) * (i / steps));
        const y = Math.round(ay + (by - ay) * (i / steps));
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            if (dx * dx + dy * dy > half * half) continue;
            const px = x + dx, py = y + dy;
            if (px < 0 || py < 0 || px >= GEN_TILES || py >= GEN_TILES) continue;
            this._setTile(t0 + px, u0 + py, TILE_WATER_LIGHT);
          }
        }
      }
    };
    const centre = (c, r) => ({ x: (c + 0.5) * OW_TILES_PER_CELL, y: (r + 0.5) * OW_TILES_PER_CELL });
    for (let r = 0; r < OW_SQUARE; r++) {
      for (let c = 0; c < OW_SQUARE; c++) {
        if (cells[r * OW_SQUARE + c] !== 10) continue;
        const a = centre(c, r);
        stroke(a.x, a.y, a.x, a.y, RIVER_HALF);
        for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
          const c2 = c + dc, r2 = r + dr;
          if (c2 < 0 || r2 < 0 || c2 >= OW_SQUARE || r2 >= OW_SQUARE) continue;
          if (cells[r2 * OW_SQUARE + c2] !== 10) continue;
          const b2 = centre(c2, r2);
          stroke(a.x, a.y, b2.x, b2.y, RIVER_HALF);
        }
      }
    }
  },

  /** The towns, the farms, the caves, the roads and the monsters -- all of it
   *  through the builders the authored regions use. */
  _placeOverworldContent(region, plan, cells) {
    const o = { tx: region.col * REGION_TILES, ty: region.row * REGION_TILES };
    const rng = genRng(plan.seed, 7);
    const surge = plan.surge;

    for (const road of (region.roads || [])) this._stampRoad(o, road);
    for (const st of (region.settlements || [])) {
      this._stampSettlement(region, o, st);
      this._buildSettlement(region, st);
    }


    // The farms, hung off the road between the towns the way roadside
    // steadings are everywhere else.
    for (let i = 0; i < plan.farms.length; i++) {
      const f = plan.farms[i];
      const p = regionPoint(region, { tx: f.tx, ty: f.ty });
      const ang = rng() * Math.PI * 2;
      const leg = { a: { x: p.x - Math.cos(ang) * 200, y: p.y - Math.sin(ang) * 200 },
        b: { x: p.x + Math.cos(ang) * 200, y: p.y + Math.sin(ang) * 200 }, len: 400 };
      const made = this._layOneSteading(region, {
        cx: p.x, cy: p.y, ux: -Math.sin(ang), uy: Math.cos(ang), side: i % 2 ? 1 : -1, leg,
      }, genRng(f.seed, 3), i);
      if (made) {
        this._steadings = this._steadings || [];
        this._steadings.push(made);
      }
    }
    // The caves. `_placeStructure` is the same door every cave mouth in the
    // game is placed through, so they behave like caves rather than like props.
    for (const c of plan.caves) {
      const p = regionPoint(region, { tx: c.tx, ty: c.ty });
      this._placeStructure('cave', Math.round(p.x / TILE_PX) * TILE_PX, Math.round(p.y / TILE_PX) * TILE_PX,
        { facing: 'south', radius: 28 });
    }
    // ...and a door for each of them, plus the towns' own, through the pass
    // that hangs every other doorway in the world.
    this._buildGenericDoorways && this._buildGenericDoorways();

    this._scatterOverworldCover(region, plan, cells);
    // 4.3 -- ruins and bodies after the surge, neighbours before it.
    if (surge) this._ruinGeneratedSettlements(region, plan);
    else this._peopleGeneratedSettlements(region, plan);
    this._buildRegionSpawnGroups(region);
    // ...and nothing waiting on the doorstep. A pack ON the arrival point is
    // an ambush the party never chose, and the first square built in testing
    // set the player on fire before they could read the banner.
    const at = regionPoint(region, region.arrival);
    const CLEAR = 20 * TILE_PX;
    this.spawnGroups = (this.spawnGroups || []).filter(g => !(g.region === region.id
      && Math.hypot((g.homeX || 0) - at.x, (g.homeY || 0) - at.y) < CLEAR));
    this.spawnPoints = (this.spawnPoints || []).filter(sp => !sp.group || sp.group.region !== region.id
      || Math.hypot(sp.x - at.x, sp.y - at.y) >= CLEAR);
  },

  /**
   * TREES AND ROCKS, AT THE DENSITY THE PIXELS ASKED FOR.
   *
   * Not `_buildForest`: that pass plants the whole world and rebuilds three
   * caches doing it. This plants one square, appends to the same two arrays
   * everything else reads, and keeps `id === index`, which is the contract the
   * forest and rock viewports are written against.
   */
  _scatterOverworldCover(region, plan, cells) {
    const o = regionOrigin(region);
    const rng = genRng(plan.seed, 11);
    this.forestTrees = this.forestTrees || [];
    this.obstacles = this.obstacles || [];
    const species = null;   // the square's own mix, taken from what the world already plants
    const artKeys = species && species.length ? species
      : (this.forestTrees.length ? [...new Set(this.forestTrees.slice(0, 200).map(t => t.artKey))] : ['pine']);

    const perCell = 2.2;
    for (let r = 0; r < OW_SQUARE; r++) {
      for (let c = 0; c < OW_SQUARE; c++) {
        const b = BIOME_BY_ID[cells[r * OW_SQUARE + c]];
        if (!b || b.water) continue;
        const nTree = Math.floor(b.tree * perCell + (rng() < (b.tree * perCell) % 1 ? 1 : 0));
        for (let i = 0; i < nTree; i++) {
          const tx = (c + rng()) * OW_TILES_PER_CELL, ty = (r + rng()) * OW_TILES_PER_CELL;
          if (tx >= GEN_TILES || ty >= GEN_TILES) continue;
          const x = o.x + tx * TILE_PX, y = o.y + ty * TILE_PX;
          if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 20)) continue;
          this.forestTrees.push({
            id: this.forestTrees.length, x, y,
            artKey: artKeys[Math.floor(rng() * artKeys.length)],
            facing: 'south', palette: null, radius: 14,
          });
        }
        const nRock = Math.floor(b.rock * 0.9 + (rng() < (b.rock * 0.9) % 1 ? 1 : 0));
        for (let i = 0; i < nRock; i++) {
          const tx = (c + rng()) * OW_TILES_PER_CELL, ty = (r + rng()) * OW_TILES_PER_CELL;
          if (tx >= GEN_TILES || ty >= GEN_TILES) continue;
          const x = o.x + tx * TILE_PX, y = o.y + ty * TILE_PX;
          if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 24)) continue;
          this.obstacles.push({
            id: this.obstacles.length, x, y, radius: 18,
            frame: Math.floor(rng() * 8), palette: region.rockPalette || null, sprite: null,
          });
        }
      }
    }
    this._rebuildStaticGrid && this._rebuildStaticGrid();
  },

  /**
   * 4.3 -- "the houses and small towns are replaced with ruins, bodies, and
   * rubbles after the monster surge starts."
   *
   * The fallen cities already do exactly this, and through one function:
   * `_scatterBurnedRubble(regionId, city)` puts burned remains against the
   * buildings of a settlement. A generated town after the surge gets the same
   * treatment, plus a body or two at the doors and nobody living in it -- the
   * folk pass below is skipped while the surge is on.
   */
  _ruinGeneratedSettlements(region, plan) {
    const rng = genRng(plan.seed, 23);
    for (const st of (region.settlements || [])) {
      const at = st._centre || regionPoint(region, st.at);
      this._scatterBurnedRubble && this._scatterBurnedRubble(`${region.id}:${st.id}`, { st, at });
      if (!this._corpseFromPerson) continue;
      const bodies = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < bodies; i++) {
        const th = rng() * Math.PI * 2, d = TILE_PX * (2 + rng() * st.radius * 0.6);
        const x = at.x + Math.cos(th) * d, y = at.y + Math.sin(th) * d;
        if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 14)) continue;
        this._corpseFromPerson(x, y, 'npc_peasant_man', { name: 'a villager', loot: [] });
      }
    }
  },

  /** ...and while the surge is not on, somebody lives there. */
  _peopleGeneratedSettlements(region, plan) {
    if (!this._spawnTownFolk) return;
    const rng = genRng(plan.seed, 29);
    const MODELS = ['npc_farmer', 'npc_peasant_man', 'npc_cheerful_peasant_girl', 'npc_townsman'];
    for (const st of (region.settlements || [])) {
      const at = st._centre || regionPoint(region, st.at);
      const n = Math.max(2, Math.round(st.houses * 0.7));
      for (let i = 0; i < n; i++) {
        const th = rng() * Math.PI * 2, d = TILE_PX * (1 + rng() * st.radius * 0.8);
        const x = at.x + Math.cos(th) * d, y = at.y + Math.sin(th) * d;
        if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 14)) continue;
        this._spawnTownFolk(MODELS[Math.floor(rng() * MODELS.length)],
          Math.floor(rng() * 3), x, y, `${st.id}|${i}`);
      }
    }
  },

  /** Is the party standing in a generated square right now? */
  _inGeneratedSquare() {
    return !!(this.currentRegion && this.currentRegion.generated);
  },

  /** A load lands the party wherever the save left them -- including in a
   *  square that has to be built again first. Called at the end of `_doLoad`. */
  _restoreOverworldSquare() {
    const st = this._owState();
    if (!st || !st.inSquare || !st.at) return false;
    const was = { x: this.world.x, y: this.world.y };
    const region = this._buildOverworldSquare(st.at.sx, st.at.sy);
    if (!region) return false;
    // Back to the exact spot, not the arrival point: the square is the same
    // square every time (item 4.2), so where they were standing is still there.
    const o = regionOrigin(region);
    if (was.x >= o.x && was.x < o.x + REGION_TILES * TILE_PX
      && was.y >= o.y && was.y < o.y + REGION_TILES * TILE_PX) {
      this.world.x = was.x; this.world.y = was.y;
    }
    return true;
  },
};
