// ============================================================================
// ROUND 274 -- THE HUNT, IN THE SCENE.
//
// Two arms of the law, one rule for when they come:
//
//   THE SOCIETY'S HUNTERS  -- anyone the Society is hunting (Undeath found
//     out, or an outlaw struck off) is found, wherever they are outdoors, by a
//     party of adventurers of the REGION's rank: one at first, one more for
//     every party beaten, to six. More than one rank above the region, and
//     they leave you be -- unless you go for them first.
//
//   THE GUARDS  -- the watch and the posted guards turn on a hunted player,
//     and on an outlaw in the region they are outlawed in, and they fight
//     through the ordinary damage door both ways.
//
// Hunters are PEOPLE, on `_banditFolk` beside the road crews, so the swing,
// the targeting, the aura contest and `_damagePerson` all already know them;
// `hunter: true` keeps the crew AI's hands off them.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { RANK_ORDER } from '../data/ranks.js';
import { isOutlawIn } from '../data/restricted.js';
import { BANDIT_CITY_BY_REGION } from '../data/banditCities.js';
import {
  huntTeamSize, hunterRankIdx, huntersLeaveAlone, hunterStats, hunterName, HUNTER_MODELS,
  HUNTER_CRIES, HUNT_FIRST_SECONDS, HUNT_GAP_SECONDS, HUNT_ESCAPE_TILES,
} from '../data/hunters.js';

const GUARD_HUNT_TILES = 16;

export const HuntMixin = {
  _huntState() {
    const p = this.player;
    p.hunt = p.hunt || { teamsBeaten: 0, nextT: HUNT_FIRST_SECONDS, provokedUntil: 0, parties: 0 };
    return p.hunt;
  },

  /** Is the Society hunting the player at all? */
  _societyHunting() {
    const st = this.player && this.player.society;
    return !!(st && st.hunted);
  },

  /** Would the law in this place turn on the player? */
  _lawHuntsHere() {
    const rid = this.currentRegion && this.currentRegion.id;
    return this._societyHunting() || isOutlawIn(this.player, rid);
  },

  /** Hunters out now, alive. */
  _liveHunters() {
    return (this._banditFolk || []).filter(c => c.hunter && c.alive && !c.despawned);
  },

  _updateHunters(dt) {
    const rid = this.currentRegion && this.currentRegion.id;
    const live = this._liveHunters();
    // Move the ones already out.
    for (const c of live) this._moveHunter(c, dt);
    // Outran them: the party gives up and goes home.
    if (live.length && live.every(c => Math.hypot(c.x - this.world.x, c.y - this.world.y) > HUNT_ESCAPE_TILES * TILE)) {
      for (const c of live) { c.alive = false; c.despawned = true; if (c.sprite) c.sprite.destroy(); }
      this._floatText(this.world.x, this.world.y - 60, 'The hunters have lost your trail', '#90caf9');
    }
    if (!this._societyHunting() || !rid || this._insideRoom || this._overworldOpen || live.length) return;
    if (this._dialogueOpen || this._creatorOpen || this._act0Running) return;
    const h = this._huntState();
    h.nextT -= dt;
    if (h.nextT > 0) return;
    const [lo, hi] = HUNT_GAP_SECONDS;
    h.nextT = lo + Math.random() * (hi - lo);
    const now = this.time ? this.time.now : 0;
    if (huntersLeaveAlone(this.player.rank, rid) && !(h.provokedUntil > now)) return;
    this._spawnHuntParty(rid);
  },

  /** A party, of the region's rank, sized by how many have gone before. */
  _spawnHuntParty(regionId) {
    const h = this._huntState();
    const size = huntTeamSize(h.teamsBeaten);
    const ri = hunterRankIdx(regionId);
    h.parties = (h.parties || 0) + 1;
    const party = `hunt${h.parties}`;
    const th0 = Math.random() * Math.PI * 2;
    const made = [];
    for (let i = 0; i < size; i++) {
      const lead = i === 0;
      let x = this.world.x, y = this.world.y;
      for (let a = 0; a < 14; a++) {
        const th = th0 + (i - size / 2) * 0.18 + a * 0.4;
        const r = (20 + (i % 2) * 2) * TILE;
        x = this.world.x + Math.cos(th) * r; y = this.world.y + Math.sin(th) * r;
        if (!this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 14)) break;
      }
      const model = HUNTER_MODELS[(h.parties + i) % HUNTER_MODELS.length];
      const key = this.textures.exists(model) ? model : null;
      if (!key) continue;
      const art = NPC_ART[key] || { footX: 32, footY: 63, scale: 1 };
      const p = isoProject(x, y);
      const sprite = this.add.sprite(p.x, p.y, key, dirRow('south'));
      sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
      sprite.setScale(art.scale || 1);
      sprite.setDepth(isoDepth(x, y));
      const st = hunterStats(ri, lead);
      const name = `${hunterName(h.parties * 7 + i * 13)}, Society ${RANK_ORDER[ri]}`;
      const c = {
        uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
        hunter: true, party, lead, name, sprite, artKey: key, texKey: key, which: 0,
        tier: ri, rank: RANK_ORDER[ri], rankLevel: 5,
        x, y, hp: st.hp, maxHp: st.hp, damage: st.dmg, speed: st.speed,
        alive: true, hostile: true, swingT: 0.8,
      };
      (this._banditFolk = this._banditFolk || []).push(c);
      made.push(c);
    }
    if (made.length) {
      const cry = HUNTER_CRIES[h.parties % HUNTER_CRIES.length];
      this._floatText(made[0].x, made[0].y - 48, cry, '#90caf9');
      this._floatText(this.world.x, this.world.y - 64,
        made.length === 1 ? 'A Society hunter has found you' : `A Society party of ${made.length} has found you`, '#ef9a9a');
    }
    return made;
  },

  _moveHunter(c, dt) {
    if (!c.sprite || this._insideRoom) return;
    const now = this.time ? this.time.now : 0;
    const h = this._huntState();
    const rid = this.currentRegion && this.currentRegion.id;
    // Left alone means LEFT ALONE: they keep their distance unless provoked.
    const passive = huntersLeaveAlone(this.player.rank, rid) && !(h.provokedUntil > now);
    const ddx = this.world.x - c.x, ddy = this.world.y - c.y, dd = Math.hypot(ddx, ddy) || 1;
    if (passive) return;
    if (dd > 26) {
      this._personStep(c, this.world.x, this.world.y, c.speed * dt);   // ROUND 292 -- by a path, see navMixin
      const p = isoProject(c.x, c.y);
      c.sprite.setPosition(p.x, p.y);
      c.sprite.setDepth(isoDepth(c.x, c.y));
      if (this._npcWalkFrame) this._npcWalkFrame(c, c.artKey, facingFromMove(ddx, ddy) || 'south', true, dt);
    } else {
      if (this._npcWalkFrame) this._npcWalkFrame(c, c.artKey, facingFromMove(ddx, ddy) || 'south', false, dt);
      c.swingT = (c.swingT || 0) - dt;
      if (c.swingT <= 0) {
        c.swingT = 1.3;
        this._monsterHitPlayer(this._personFace(c, 'bandit'), c.damage, false);
      }
    }
  },

  /** The player struck a hunter: provoked, even if they were leaving you be. */
  _hunterStruck(c) {
    const h = this._huntState();
    h.provokedUntil = (this.time ? this.time.now : 0) + 5 * 60 * 1000;
  },

  /** A hunter fell. A party wiped out means the next one is bigger. */
  _hunterKilled(c) {
    const others = this._liveHunters().filter(x => x.party === c.party && x !== c);
    if (others.length) return;
    const h = this._huntState();
    h.teamsBeaten = (h.teamsBeaten || 0) + 1;
    this._floatText(this.world.x, this.world.y - 64,
      `The Society will send ${huntTeamSize(h.teamsBeaten)} next time`, '#ef9a9a');
  },

  /** Is the player an outlaw in this region? */
  _outlawIn(regionId) { return isOutlawIn(this.player, regionId); },

  /** Where a hunted player wakes: the region's bandit city, if it stands. */
  _banditHaven(regionId) {
    const c = BANDIT_CITY_BY_REGION[regionId];
    if (!c || !this._banditCityCentre) return null;
    if (this._banditCityState && this._banditCityState(c.id).cleared) return null;
    const at = this._banditCityCentre(c);
    return at ? { x: at.x + 2 * TILE, y: at.y + 6 * TILE } : null;
  },

  // ------------------------------------------------------------- guards ----
  /** The player, as a target a guard can hold. */
  _playerFace() {
    if (this._playerFaceObj) return this._playerFaceObj;
    const s = this;
    this._playerFaceObj = {
      isPlayer: true, type: { name: 'you', radius: 12, atkCooldown: 1 },
      get alive() { return !!(s.player && s.player.hp > 0); },
      get wx() { return s.world.x; },
      get wy() { return s.world.y; },
    };
    return this._playerFaceObj;
  },

  /** Does this guard go for the player right now? */
  _guardHuntsPlayer(g, anchor) {
    if (!this._lawHuntsHere() || this._insideRoom || !(this.player.hp > 0)) return null;
    const a = anchor || g.post || { x: g.x, y: g.y };
    const reach = (g.post ? (g.aggroTiles || GUARD_HUNT_TILES) : GUARD_HUNT_TILES + 8) * TILE;
    if (Math.hypot(this.world.x - a.x, this.world.y - a.y) > reach) return null;
    if (!g.huntCried) { g.huntCried = true; this._floatText(g.x, g.y - 48, 'You! Stop right there!', '#90caf9'); }
    return this._playerFace();
  },

  /** A guard's blow on the player, through the one door every blow uses. */
  _guardHitsPlayer(g, dmg) {
    this._monsterHitPlayer(this._personFace(g, 'guard'), dmg, false);
  },

  /** The player's swing on guards who are after them. */
  _hitHostileGuards(range, amount) {
    let hit = false;
    for (const g of (this.guards || [])) {
      if (!g.target || !g.target.isPlayer || g.state === 'downed') continue;
      if (Math.hypot(g.x - this.world.x, g.y - this.world.y) > range + 20) continue;
      this._hitGuard(g, amount);
      hit = true;
    }
    return hit;
  },

  /** One blow on a guard. Guards are not killed: they fall back and recover. */
  _hitGuard(g, amount) {
    if (!g || g.state === 'downed') return 0;
    g.hp = Math.max(0, (g.hp || 0) - amount);
    this._floatText(g.x, g.y - 40, String(Math.round(amount)), '#ffffff');
    if (g.hp <= 0) {
      g.state = 'downed'; g.anim = 'idle'; g.target = null;
      g.recoverT = 45;
      this._floatText(g.x, g.y - 52, `${g.name} falls back!`, '#ffcc80');
    }
    return amount;
  },
};
