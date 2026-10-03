// ============================================================================
// ROUND 276 -- PRISM, AGAINST YOU, IN THE SCENE.
//
// data/prismNemesis.js reads the player and chooses her counter. This file is
// the rest: she finds you (outdoors, every 35 minutes to 2 hours, once you are on the
// outlaw route and have come up out of the sewer), she fights the way her
// counter says, and at 15% of her health she smoke-bombs -- never killed --
// until next time.
//
//   holy        (vs a lich or a vampire)  she closes and strikes; undead take
//               far more, and she burns your raised dead off the field
//   affliction  (vs a tank)  she keeps her distance and poisons: the poison is
//               paid straight from health, which armour does not touch
//   kite        (vs melee)   she keeps her distance and shoots
//   closer      (vs ranged)  she will not stay at range; she steps in
//   burst       (vs a healer) harder, faster blows
//   healSpoil   (vampire, healer counters)  healing reaches you at half while
//               she is on the field
//
// She is a PERSON on `_banditFolk` like the hunters, `nemesis: true`, and her
// blows and shots come through the ordinary doors.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { PARLEY_AFTER_S } from './petitionMixin.js';
import { dirRow } from '../data/playerAnim.js';
import { CHAR_ART } from '../data/characterManifest.js';
import { RANK_ORDER } from '../data/ranks.js';
import {
  counterFor, prismNemesisStats, PRISM_VANISH_AT, PRISM_RANKS, PRISM_GAP_MIN, PRISM_DOOR_CHANCE, rollPrismGap,
} from '../data/prismNemesis.js';

const KITE_BAND = [6 * TILE, 9 * TILE];
const SHOT_SPEED = 260;
const SHOT_RANGE = 12 * TILE;

export const PrismNemesisMixin = {
  _prismNemesisState() {
    const p = this.player;
    p.prismNemesis = p.prismNemesis || { encounters: 0, vanishes: 0, counter: null };
    const st = p.prismNemesis;
    // ROUND 277 -- the clock is seconds of play since she last came (or since
    // the route began), and the attack falls due somewhere in 35-120 minutes.
    // A round-276 save carries `nextT` instead; it starts the new clock.
    if (typeof st.sinceT !== 'number') { st.sinceT = 0; st.dueT = rollPrismGap(); delete st.nextT; }
    return st;
  },

  /** The player's rank, as her Iron-through-Gold window reads it. */
  _prismPlayerRank() {
    const p = this.player;
    const st = this._playerRankStanding ? this._playerRankStanding() : null;
    return (st && st.rank && st.rank !== 'normal') ? st.rank : (p.rank || 'normal');
  },

  /** What she reads off the player. */
  _prismReadPlayer() {
    const p = this.player;
    const conf = p.confluence && !p.confluence.divine ? p.confluence : null;
    const bc = p.buildClass || {};
    const armor = this._playerArmor ? this._playerArmor() : ((p.minorStats && p.minorStats.armor) || 0);
    const weapon = p.weapon || (p.hands && (p.hands.right || p.hands.left)) || '';
    const lean = bc.lean || (/bow|crossbow|staff|wand|javelin/.test(String(weapon)) ? 'ranged' : 'melee');
    return { form: conf && conf.name === 'Undeath' ? conf.form : null, primary: bc.primary || null, armor, lean };
  },

  /** She is live now, if she is. */
  _prismNemesis() {
    return (this._banditFolk || []).find(c => c.nemesis && c.alive && !c.despawned) || null;
  },

  // ROUND 277 -- WHEN SHE COMES.
  //
  // Only for an outlaw (1.1), only while the player is Iron through Gold, and
  // only outdoors -- anywhere outdoors (1.4). The clock runs on play time,
  // indoors and out, so a player who spends an hour in a dungeon comes out to
  // an attack that is due. Never sooner than 35 minutes after the last one;
  // at the 2-hour mark she comes at the first chance (1.5). And once the 35
  // minutes are up, stepping out of a building, a cave or an astral space
  // may find her waiting at the door (1.6).
  _updatePrismNemesis(dt) {
    const live = this._prismNemesis();
    if (live) { this._movePrismNemesis(live, dt); return; }
    if (!this._onOutlawRoute || !this._onOutlawRoute()) return;
    const p = this.player;
    if (!p.sewerDone || p.dead) return;
    if (!PRISM_RANKS.includes(this._prismPlayerRank())) return;
    const st = this._prismNemesisState();
    st.sinceT += dt;
    const inside = !!this._insideRoom;
    if (st.wasInside && !inside) {
      // Just stepped out. The door is armed for a moment, once, by a roll.
      st.doorT = 2.5;
      st.doorArmed = Math.random() < PRISM_DOOR_CHANCE;
    }
    st.wasInside = inside;
    if (st.doorT > 0) st.doorT -= dt;
    if (inside || this._overworldOpen || this._dialogueOpen || this._creatorOpen || this._act0Running) return;
    // ROUND 295 (5.9) -- once the petition can be made, her next visit is to
    // talk, and it comes soon rather than on the fight clock.
    const parley = !!(this._petitionReady && this._petitionReady());
    const atDoor = st.doorT > 0;
    if (parley) {
      if (st.sinceT < PARLEY_AFTER_S) return;
    } else {
      if (st.sinceT < PRISM_GAP_MIN) return;
      const due = st.sinceT >= st.dueT;
      if (!due && !(atDoor && st.doorArmed)) return;
    }
    const c = this._spawnPrismNemesis({ atDoor, parley });
    if (c) { st.sinceT = 0; st.dueT = rollPrismGap(); st.doorT = 0; st.doorArmed = false; }
  },

  /** Her, with a counter to whatever the player is today. */
  _spawnPrismNemesis(opts = {}) {
    const st = this._prismNemesisState();
    const read = this._prismReadPlayer();
    const counter = counterFor(read);
    st.counter = counter.key;
    const art = CHAR_ART.prism;
    const key = this.textures.exists('char_prism_idle') ? 'char_prism_idle' : null;
    if (!key || !art) return null;
    // At a door she is already close; out in the open she comes in from range.
    const R = (opts.atDoor ? 5 : 14) * TILE;
    const th = Math.random() * Math.PI * 2;
    let x = this.world.x + Math.cos(th) * R, y = this.world.y + Math.sin(th) * R;
    for (let a = 0; a < 10 && (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 14)); a++) {
      x = this.world.x + Math.cos(th + a * 0.6) * R; y = this.world.y + Math.sin(th + a * 0.6) * R;
    }
    const p = isoProject(x, y);
    const sprite = this.add.sprite(p.x, p.y, key, dirRow('south'));
    sprite.setOrigin(art.footX / art.cell, art.footY / art.cell);
    sprite.setScale(0.9);
    sprite.setDepth(isoDepth(x, y));
    const ri = Math.max(0, RANK_ORDER.indexOf(this.player.rank || 'normal'));
    const s = prismNemesisStats(this.player.maxHp || 40, ri, st.encounters);
    const c = {
      uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
      nemesis: true, name: 'Prism', sprite, artKey: key, texKey: key, which: 0,
      tier: Math.min(4, ri), rank: this.player.rank || 'normal', rankLevel: 9,
      x, y, hp: s.hp, maxHp: s.hp, damage: s.dmg, speed: s.speed,
      alive: true, hostile: true, swingT: 1, shotT: 1.5, dashT: 4, smiteT: 1,
      counter, atDoor: !!opts.atDoor,
    };
    (this._banditFolk = this._banditFolk || []).push(c);
    // ROUND 295 (5.9) -- not a fight: she has brought somebody.
    if (opts.parley && this._beginParley) {
      const pm0 = (this.party || []).find(m => m.id === 'prism');
      if (pm0 && pm0.sprite) pm0.sprite.setVisible(false);
      this._beginParley(c);
      return c;
    }
    st.encounters = (st.encounters || 0) + 1;
    // Party Prism steps out of the world while this one is in it.
    const pm = (this.party || []).find(m => m.id === 'prism');
    if (pm && pm.sprite) pm.sprite.setVisible(false);
    if (counter.healSpoil) this._healSpoil = { frac: counter.healSpoil };
    if (st.encounters === 1) {
      this._openDialogue('Prism', `"I heard what you did. Everyone has."\n\n"${counter.says}"`);
    } else {
      this._floatText(x, y - 50, counter.says, '#f48fb1');
    }
    return c;
  },

  _movePrismNemesis(c, dt) {
    if (!c.sprite) return;
    if (c.parley && this._moveParley) { this._moveParley(c, dt); return; }
    if (this._insideRoom || this.player.dead) { this._prismVanish(c, 'withdraws'); return; }
    const k = c.counter || {};
    const bane = (this.player.confluence && this.player.confluence.name === 'Undeath') ? (k.undeadBane || 0) : 0;
    const ddx = this.world.x - c.x, ddy = this.world.y - c.y, dd = Math.hypot(ddx, ddy) || 1;
    const keepAway = k.kite || k.afflict;
    let mx = 0, my = 0;
    if (keepAway) {
      if (dd < KITE_BAND[0]) { mx = -ddx / dd; my = -ddy / dd; }
      else if (dd > KITE_BAND[1]) { mx = ddx / dd; my = ddy / dd; }
    } else if (dd > 26) { mx = ddx / dd; my = ddy / dd; }
    // The closer steps in: a short blink when you have made distance.
    if (k.style === 'closer') {
      c.dashT -= dt;
      if (c.dashT <= 0 && dd > 5 * TILE) {
        c.dashT = 4;
        c.x = this.world.x - (ddx / dd) * 40; c.y = this.world.y - (ddy / dd) * 40;
        this._floatText(c.x, c.y - 44, 'Blink', '#f48fb1');
      }
    }
    if (mx || my) {
      const step = c.speed * dt;
      // ROUND 292 -- closing in, she takes the path round (navMixin); backing
      // off to her kiting band she steps straight, as before.
      const closing = mx * ddx + my * ddy > 0;
      if (closing && this._personStep) this._personStep(c, this.world.x, this.world.y, step);
      else {
        const nx = c.x + mx * step, ny = c.y + my * step;
        if (!this._collidesObstacle(nx, ny, 12) && !this._isWaterAt(nx, ny)) { c.x = nx; c.y = ny; }
      }
    }
    const p = isoProject(c.x, c.y);
    c.sprite.setPosition(p.x, p.y);
    c.sprite.setDepth(isoDepth(c.x, c.y));
    c.sprite.setFrame(dirRow(facingFromMove(ddx, ddy) || 'south'));
    const face = this._personFace(c, 'bandit');
    if (keepAway) {
      // Shots, from range.
      c.shotT -= dt;
      if (c.shotT <= 0 && dd <= SHOT_RANGE) {
        c.shotT = k.afflict ? 1.6 : 1.1;
        this._prismShot(c, face, ddx / dd, ddy / dd, Math.round(c.damage * (1 + bane)));
        if (k.afflict) this._prismPoison = { perSec: Math.max(1, Math.round(c.damage * 0.35)), until: (this.time ? this.time.now : 0) + 5000 };
      }
    } else if (dd <= 30) {
      c.swingT -= dt;
      if (c.swingT <= 0) {
        c.swingT = k.style === 'burst' ? 0.8 : 1.1;
        const dmg = Math.round(c.damage * (k.style === 'burst' ? 1.35 : 1) * (1 + bane));
        this._monsterHitPlayer(face, dmg, false);
      }
    }
    // Your raised dead burn.
    if (k.undeadBane) {
      c.smiteT -= dt;
      if (c.smiteT <= 0) {
        c.smiteT = 1;
        this._prismSmiteThralls(c);
      }
    }
    this._tickPrismPoison(dt);
  },

  /** A shot from her, through the monster-shot machinery and so the ordinary
   *  door when it lands. */
  _prismShot(c, face, ux, uy, dmg) {
    const wx = c.x + ux * 20, wy = c.y + uy * 20;
    const p = isoProject(wx, wy);
    const sprite = this.add.circle(p.x, p.y - 14, 5, c.counter && c.counter.afflict ? 0x7cb342 : 0xfff59d, 0.95);
    sprite.setDepth(isoDepth(wx, wy) + 40000);
    (this._monsterShots = this._monsterShots || []).push({
      wx, wy, vx: ux * SHOT_SPEED, vy: uy * SHOT_SPEED, dmg, life: 1.4, sprite, src: face, crit: 0, critMult: 1.5,
      element: c.counter && c.counter.afflict ? 'poison' : 'radiant',
    });
    this._prismShots = (this._prismShots || 0) + 1;
  },

  /** Poison paid straight from health: armour does not stop it. */
  _tickPrismPoison(dt) {
    const pz = this._prismPoison;
    if (!pz) return;
    const now = this.time ? this.time.now : 0;
    if (pz.until <= now || this.player.dead) { this._prismPoison = null; return; }
    pz.acc = (pz.acc || 0) + pz.perSec * dt;
    if (pz.acc >= 1) {
      const n = Math.floor(pz.acc);
      pz.acc -= n;
      this.player.hp -= n;
      this._prismPoisoned = (this._prismPoisoned || 0) + n;
    }
  },

  /** Up to two of the player's raised dead, burned away. */
  _prismSmiteThralls(c) {
    const list = (this._summons || []).filter(s => s && (s.thrall || s.raised)
      && Math.hypot((s.wx || 0) - c.x, (s.wy || 0) - c.y) < 10 * TILE).slice(0, 2);
    for (const s of list) {
      const i = this._summons.indexOf(s);
      if (i >= 0) this._summons.splice(i, 1);
      if (s.sprite && s.sprite.destroy) s.sprite.destroy();
      this._floatText(s.wx, s.wy - 30, 'Burned away', '#fff59d');
      this._prismBurned = (this._prismBurned || 0) + 1;
    }
    return list.length;
  },

  /** A blow on her. She never falls: at 15% of her health she smoke-bombs. */
  _prismNemesisHit(c, amount) {
    if (!c || !c.alive) return false;
    if (c.parley) return false;   // ROUND 295 -- she came to talk
    c.hp = Math.max(0, c.hp - amount);
    this._floatText(c.x, c.y - 30, String(Math.round(amount)), '#ffffff');
    if (c.hp <= c.maxHp * PRISM_VANISH_AT) this._prismVanish(c, 'vanishes');
    return true;
  },

  _prismVanish(c, how) {
    if (!c || !c.alive) return;
    c.alive = false; c.despawned = true;
    if (c.sprite) {
      const sp = c.sprite;
      if (this.tweens) this.tweens.add({ targets: sp, alpha: 0, duration: 380, onComplete: () => sp.destroy() });
      else sp.destroy();
    }
    const st = this._prismNemesisState();
    if (how === 'vanishes') {
      st.vanishes = (st.vanishes || 0) + 1;
      this._prismSmokeBomb(c.x, c.y);
      this._floatText(c.x, c.y - 50, '"Not today."', '#f48fb1');
      // ROUND 295 (O2) -- and she leaves a note.
      if (!c.parley && this._prismLeaveNote) this._prismLeaveNote(c.x, c.y);
    }
    this._healSpoil = null;
    const pm = (this.party || []).find(m => m.id === 'prism');
    if (pm && pm.sprite) pm.sprite.setVisible(true);
  },

  /** ROUND 277 (1.3) -- a smoke bomb: a grey burst where she stood. */
  _prismSmokeBomb(x, y) {
    this._prismSmokeBombs = (this._prismSmokeBombs || 0) + 1;
    if (!this.add || !this.add.circle) return;
    const p = isoProject(x, y);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const puff = this.add.circle(p.x + Math.cos(a) * 6, p.y - 18 + Math.sin(a) * 4, 10, 0x9e9e9e, 0.8);
      puff.setDepth(isoDepth(x, y) + 40000);
      if (this.tweens) {
        this.tweens.add({ targets: puff, x: p.x + Math.cos(a) * 34, y: p.y - 22 + Math.sin(a) * 18,
          scale: 2.4, alpha: 0, duration: 900, onComplete: () => puff.destroy() });
      } else puff.destroy();
    }
  },

  /** How much of a heal she takes away, while she is on the field. */
  _prismHealSpoil() {
    return (this._healSpoil && this._prismNemesis()) ? (this._healSpoil.frac || 0) : 0;
  },
};
