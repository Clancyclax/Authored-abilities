// ============================================================================
// ROUND 285 (items 9-12) -- THE RANK-UP LINES, PAID.
//
//   "Implement all 95 now."
//
// rankLadders.js gives every generated ability one rung per rank: a sentence
// and the fields it grants. Ninety of those fields were read by nothing, so a
// card could promise "it lifts one condition as it heals" and the heal would
// lift nothing. rungRuntime.js folds every reached rung onto the ability that
// is cast (`foldRungGrants`); this file is where each of them happens.
//
// HOW IT HANGS TOGETHER
//
//   * THE CAST. `_castKnownAbilityCore` is wrapped: `_rungPreCast` answers the
//     rungs that change WHETHER a press casts (a second charge, a recall, a
//     recalled summon, a hold's silencing second cast); the raw cast runs with
//     `_rungCastA` set to the ability it is resolving, so every hit and heal
//     inside it knows its rungs; `_rungPostCast` then reads what the cast
//     changed (a snapshot diff: the player's position, buffs, shield, summons,
//     and the monsters it took hold of) and applies the rest.
//   * THE HOOKS. Small calls from the choke points already in WorldScene:
//     `_damageMonster` (a hit), `_killMonster` (a kill), `_critChanceVs` (a
//     crit), `_healPlayer` / `_healFriendly` / `_healTargets` (a heal), the
//     player's damage path (a ward), `_applyDebuff` (a condition), the summon
//     loop, the monster loop (a hold ending), and the passive fold.
//   * NOTHING HERE MAY BREAK A FRAME. Every hook is guarded; a rung that finds
//     nothing to act on does nothing.
//
// Where a rung's premise did not exist in the game (nothing pushes the
// player; nothing dispels your buffs; conjured pieces never decay) its words
// were changed to a real effect in the same spirit, and rankLadders.js says
// which. The notes list every rung with what it does.
// ============================================================================
import { TILE } from '../data/iso.js';
import { conditionDef, hasTag, TAG } from '../data/debuffs.js';

const CRIT_MULT = 1.5;               // combat.js CRIT_BASE_MULT
const CHARGE_WINDOW_MS = 4000;       // "a second time within 4s"
const RECALL_WINDOW_MS = 6000;       // how long a stride keeps the way back open
const ECHO_DELAY_MS = 350;           // "a moment later"
const HEAL_ECHO_WINDOW_MS = 30000;   // how long a mend listens for a team crit
const COMBAT_QUIET_S = 5;            // a fight has started after this long without one

const isAfflicted = (m) => !!(m && (m.dot || (m.debuffs && Object.keys(m.debuffs).length) || m.sunderT > 0));
const monHeld = (m) => !!(m && ((m.frozenT || 0) > 0 || (m.confusedT || 0) > 0 || (m.rootT || 0) > 0
  || (m.debuffs && (m.debuffs.stun || m.debuffs.freeze))));

export const RungRuntimeMixin = {
  // ==========================================================================
  // THE CAST
  // ==========================================================================
  _castKnownAbilityCore(key, opts = {}) {
    let pre = null;
    try { pre = this._rungPreCast(key, opts); } catch (e) { pre = null; }
    if (pre && pre.handled) return;
    const snap = this._rungSnapshot();
    const was = { a: this._rungCastA, ctx: this._rungHitCtx, d: this._rungDispatched, k: this._rungDispatchKey };
    this._rungDispatched = null;
    this._rungDispatchKey = key;
    try {
      return this._castKnownAbilityCoreRaw(key, opts);
    } finally {
      const d = this._rungDispatched && this._rungDispatched.key === key ? this._rungDispatched : null;
      this._rungCastA = was.a; this._rungHitCtx = was.ctx; this._rungDispatched = was.d; this._rungDispatchKey = was.k;
      if (pre && pre.restoreCd != null && this.player && this.player.abilityCdByKey) {
        this.player.abilityCdByKey[key] = pre.restoreCd;
      }
      if (d) { try { this._rungPostCast(key, d.a, snap); } catch (e) { this._rungErr = String(e); } }
    }
  },

  /** Called by the raw cast at the point it commits (cost paid, cooldown set)
   *  and hands the ability to its template. */
  _rungMarkDispatch(key, a) {
    if (!a || a.canonKey) return;
    this._rungDispatched = { key, a };
    this._rungCastA = a;
    this._rungHitCtx = a;
    (this._rungCastAt = this._rungCastAt || {})[key] = this.time.now;
  },

  /** The rungs that decide whether a press casts at all. */
  _rungPreCast(key, opts) {
    if (opts && opts.finishing) return null;
    const p = this.player;
    const a = this._scaledAbility && this._scaledAbility(key);
    if (!p || !a) return null;
    const now = this.time.now;
    // (stride, gold) "it can be used a second time to return exactly where you left"
    const rc = this._rungRecall && this._rungRecall[key];
    if (rc && now <= rc.until) {
      delete this._rungRecall[key];
      this.world.x = rc.x; this.world.y = rc.y;
      if (this._updatePlayerSprite) this._updatePlayerSprite(false);
      this._spawnRingFx && this._spawnRingFx(rc.x, rc.y, 40, a.color);
      this._floatText(this.world.x, this.world.y - 40, `${a.name} — back`, a.color);
      this._rungRecalled = (this._rungRecalled || 0) + 1;
      return { handled: true };
    }
    // (called, silver) "it may be recalled and sent back out without paying again"
    if (a.summonRecall) {
      const mine = (this._summons || []).filter(s => s && s.rungKey === key && s.hp !== 0);
      if (mine.length) {
        for (const s of mine) this._rungRemoveSummon(s);
        (this._rungFree = this._rungFree || {})[key] = true;
        p.abilityCdByKey[key] = 0;
        this._floatText(this.world.x, this.world.y - 40, `${a.name} recalled`, a.color);
        this._rungSummonRecalls = (this._rungSummonRecalls || 0) + 1;
        return { handled: true };
      }
    }
    // (hold, silver) "a second cast while it holds stops them acting for the rest of it"
    const sl = this._rungSilence && this._rungSilence[key];
    if (sl) {
      const still = sl.mons.filter(m => m && m.alive && m._rungHold && m._rungHold.key === key && now < m._rungHold.until);
      delete this._rungSilence[key];
      if (still.length) {
        for (const m of still) {
          const left = Math.max(0.5, (m._rungHold.until - now) / 1000);
          this._applyDebuff(m, 'stun', { duration: left, fromPlayer: true, source: p });
          m.atkCd = Math.max(m.atkCd || 0, left);
        }
        this._floatText(this.world.x, this.world.y - 40, `${a.name} — silenced ${still.length}`, a.color);
        this._rungSilenced = (this._rungSilenced || 0) + still.length;
        return { handled: true };
      }
    }
    // (stride, silver) "it may be used a second time within 4s before it cools"
    const ch = this._rungCharges && this._rungCharges[key];
    if (ch && (p.abilityCdByKey[key] || 0) > 0 && now <= ch.until && ch.left > 0) {
      ch.left -= 1;
      const restore = p.abilityCdByKey[key];
      p.abilityCdByKey[key] = 0;
      this._rungChargeUsed = (this._rungChargeUsed || 0) + 1;
      return { restoreCd: restore };
    }
    return null;
  },

  /** A cast that costs nothing. Asked by `_payAbilityCost`. */
  _rungFreeCast(a) {
    if (!a || !this._rungDispatchKey) return false;
    const key = this._rungDispatchKey;
    // A recalled summon's second sending.
    if (this._rungFree && this._rungFree[key]) { delete this._rungFree[key]; this._rungFreeCasts = (this._rungFreeCasts || 0) + 1; return true; }
    // (repeat, iron) "the first attack of a succession costs nothing"
    if (a.runFreeOpener && a.scaleOn === 'successiveUses') {
      const st = this._scaleStreak && this._scaleStreak[a.name];
      const live = st && this._streakWindowMs && (this.time.now - st.at <= this._streakWindowMs(a));
      if (!live) { this._rungFreeCasts = (this._rungFreeCasts || 0) + 1; return true; }
    }
    // (strike, silver) "every third use costs nothing"
    if (a.everyThirdFree > 0) {
      const c = this._rungUseCount = this._rungUseCount || {};
      c[key] = (c[key] || 0) + 1;
      if (c[key] % a.everyThirdFree === 0) {
        this._floatText(this.world.x, this.world.y - 58, 'Free', a.color || '#fff59d');
        this._rungFreeCasts = (this._rungFreeCasts || 0) + 1;
        return true;
      }
    }
    return false;
  },

  _rungSnapshot() {
    const p = this.player;
    if (!p) return null;
    const buffs = {};
    for (const [k, b] of Object.entries(p.buffs || {})) if (b) buffs[k] = { ref: b, t: b.t };
    const stat = {};
    for (const [k, b] of Object.entries(p.statBuffs || {})) if (b) stat[k] = { ref: b, t: b.t };
    const mons = new Map();
    const ox = this.world.x, oy = this.world.y;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || Math.abs(m.wx - ox) > 900 || Math.abs(m.wy - oy) > 900) continue;
      mons.set(m, { f: m.frozenT || 0, c: m.confusedT || 0, r: m.rootT || 0,
        tu: (m.taunt && m.taunt.until) || 0, atk: m.atkCd || 0,
        st: m.debuffs && m.debuffs.stun ? m.debuffs.stun.t : 0,
        fz: m.debuffs && m.debuffs.freeze ? m.debuffs.freeze.t : 0,
        sp: m.debuffs && m.debuffs.suppressed ? m.debuffs.suppressed.t : 0,
        sl: m.slowT || 0 });
    }
    return { x: ox, y: oy, buffs, stat, shield: p.shield || null, shieldAmt: p.shield ? p.shield.amount : 0,
      summons: new Set(this._summons || []), mons, t: this.time.now };
  },

  _rungPostCast(key, a, snap) {
    if (!a || !snap) return;
    const p = this.player;
    const now = this.time.now;
    // ---- what the cast changed -------------------------------------------
    const moved = Math.hypot(this.world.x - snap.x, this.world.y - snap.y);
    const newShield = p.shield && (p.shield !== snap.shield || p.shield.amount > snap.shieldAmt) ? p.shield : null;
    const newBuffs = [];
    for (const [k, b] of Object.entries(p.buffs || {})) {
      if (!b) continue;
      const was = snap.buffs[k];
      if (!was || was.ref !== b || (b.t || 0) > (was.t || 0) + 0.01) newBuffs.push(k);
    }
    const newStat = [];
    for (const [k, b] of Object.entries(p.statBuffs || {})) {
      if (!b) continue;
      const was = snap.stat[k];
      if (!was || was.ref !== b || (b.t || 0) > (was.t || 0) + 0.01) newStat.push(k);
    }
    const newSummons = (this._summons || []).filter(s => !snap.summons.has(s));
    const held = [];
    for (const [m, o] of snap.mons) {
      if (!m.alive) continue;
      const st = m.debuffs && m.debuffs.stun ? m.debuffs.stun.t : 0;
      const fz = m.debuffs && m.debuffs.freeze ? m.debuffs.freeze.t : 0;
      const sp = m.debuffs && m.debuffs.suppressed ? m.debuffs.suppressed.t : 0;
      const tu = (m.taunt && m.taunt.until) || 0;
      if ((m.frozenT || 0) > o.f + 0.01 || (m.confusedT || 0) > o.c + 0.01 || (m.rootT || 0) > o.r + 0.01
        || st > o.st + 0.01 || fz > o.fz + 0.01 || sp > o.sp + 0.01 || tu > o.tu + 0.01
        || ((a.template === 'abilityLock') && (m.atkCd || 0) > o.atk + 0.5)) held.push(m);
    }
    const ctx = { key, a, snap, moved, newShield, newBuffs, newStat, newSummons, held, now };
    this._rungLastPost = { key, moved: Math.round(moved), shield: !!newShield, buffs: newBuffs.slice(),
      stat: newStat.slice(), summons: newSummons.length, held: held.length };
    this._rungStride(ctx);
    this._rungGuard(ctx);
    this._rungMendPost(ctx);
    this._rungCalled(ctx);
    this._rungHold(ctx);
    this._rungBoonPost(ctx);
  },

  // ==========================================================================
  // STRIDE
  // ==========================================================================
  _rungStride(c) {
    const { a, key, snap, moved, now } = c;
    const p = this.player;
    if (a.breaksRoot || a.usableRooted) {
      const all = !!a.usableRooted;
      let freed = 0;
      for (const k of Object.keys(p.debuffs || {})) {
        const d = conditionDef(k);
        if (!d) continue;
        const holds = (hasTag(d, TAG.control) && d.stopsMove) || d.rate === 'moveSpeed';
        if (!holds) continue;
        delete p.debuffs[k];
        freed++;
        if (!all) break;
      }
      if (freed) {
        this._floatText(this.world.x, this.world.y - 52, freed > 1 ? `Free (${freed})` : 'Free', a.color || '#b3e5fc');
        this._rungFreed = (this._rungFreed || 0) + freed;
      }
    }
    if (a.breaksTracking) {
      let lost = 0;
      for (const m of (this.monsters || [])) {
        if (!m.alive || m.state !== 'chase') continue;
        if (Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= 3 * TILE) continue;
        m.state = 'wander'; m.taunt = null; m._rungLostT = 4;
        lost++;
      }
      this._rungTracksLost = (this._rungTracksLost || 0) + lost;
    }
    if (a.iframes > 0) {
      p.buffs.rungIframes = { t: a.iframes };
      this._rungIframed = (this._rungIframed || 0) + 1;
    }
    if (a.pathKnockaside) {
      const ax = snap.x, ay = snap.y, bx = this.world.x, by = this.world.y;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      let n = 0;
      for (const m of (this.monsters || [])) {
        if (!m.alive) continue;
        let t = ((m.wx - ax) * dx + (m.wy - ay) * dy) / (L * L);
        t = Math.max(0, Math.min(1, t));
        const px = ax + dx * t, py = ay + dy * t;
        const d = Math.hypot(m.wx - px, m.wy - py);
        if (d > (m.type ? m.type.radius || 12 : 12) + 28) continue;
        const nx = moved > 1 ? -dy / L : (m.wx - bx) / (Math.hypot(m.wx - bx, m.wy - by) || 1);
        const ny = moved > 1 ? dx / L : (m.wy - by) / (Math.hypot(m.wx - bx, m.wy - by) || 1);
        const side = ((m.wx - px) * nx + (m.wy - py) * ny) >= 0 ? 1 : -1;
        this._rungShove(m, nx * side, ny * side, 56);
        n++;
      }
      this._rungKnocked = (this._rungKnocked || 0) + n;
    }
    if (a.departRoot > 0) {
      let n = 0;
      for (const m of (this.monsters || [])) {
        if (!m.alive) continue;
        if (Math.hypot(m.wx - snap.x, m.wy - snap.y) > 1.5 * TILE + ((m.type && m.type.radius) || 0)) continue;
        m.rootT = Math.max(m.rootT || 0, a.departRoot);
        n++;
      }
      (this._rungRootZones = this._rungRootZones || []).push({ x: snap.x, y: snap.y, until: now + a.departRoot * 1000, dur: a.departRoot });
      this._rungRooted = (this._rungRooted || 0) + n;
    }
    if (a.charges > 1) {
      const ch = (this._rungCharges = this._rungCharges || {})[key];
      if (!ch || now > ch.until) this._rungCharges[key] = { left: a.charges - 1, until: now + CHARGE_WINDOW_MS };
    }
    if (a.killResets > 0) (this._rungKillReset = this._rungKillReset || {})[key] = now + a.killResets * 1000;
    if (a.arriveKnockback > 0) {
      let n = 0;
      for (const m of (this.monsters || [])) {
        if (!m.alive) continue;
        const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
        if (d > a.arriveKnockback + ((m.type && m.type.radius) || 0)) continue;
        this._rungShove(m, (m.wx - this.world.x) / (d || 1), (m.wy - this.world.y) / (d || 1), a.arriveKnockback);
        n++;
      }
      this._rungKnocked = (this._rungKnocked || 0) + n;
    }
    if (a.recall) (this._rungRecall = this._rungRecall || {})[key] = { x: snap.x, y: snap.y, until: now + RECALL_WINDOW_MS };
    if (a.arriveGuaranteedCrit) {
      const g = p.buffs.guaranteedCrit;
      p.buffs.guaranteedCrit = { strikes: Math.max(1, g ? g.strikes || 0 : 0), bonus: 1, t: 12 };
      this._rungNextCrit = true;
    }
  },

  /** Push a monster, refusing walls and water. */
  _rungShove(m, ux, uy, dist) {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const nx = m.wx + ux * dist / steps, ny = m.wy + uy * dist / steps;
      if (this._collidesObstacle && this._collidesObstacle(nx, ny, (m.type && m.type.radius) || 12)) break;
      if (this._isWaterAt && this._isWaterAt(nx, ny)) break;
      m.wx = nx; m.wy = ny;
    }
  },

  /** Every frame: the ground a stride left holds whoever walks onto it; the
   *  hurt-threshold for doubling passives; the fight-start prime; holds that
   *  have ended; companion and summon wards running down. */
  _tickRungs(dt) {
    const now = this.time.now;
    const p = this.player;
    if (!p) return;
    if (p.buffs && p.buffs.rungIframes) {
      p.buffs.rungIframes.t -= dt;
      if (p.buffs.rungIframes.t <= 0) delete p.buffs.rungIframes;
    }
    if (this._rungRootZones && this._rungRootZones.length) {
      this._rungRootZones = this._rungRootZones.filter(z => now < z.until);
      for (const z of this._rungRootZones) {
        for (const m of (this.monsters || [])) {
          if (!m.alive || (m.rootT || 0) > 0) continue;
          if (Math.hypot(m.wx - z.x, m.wy - z.y) <= 1.5 * TILE) m.rootT = Math.max(0.3, (z.until - now) / 1000);
        }
      }
    }
    // holds that have ended
    for (const m of (this.monsters || [])) {
      const h = m && m._rungHold;
      if (!h) continue;
      if (!m.alive) { m._rungHold = null; continue; }
      if (monHeld(m) && now < h.until + 250) continue;
      if (now < h.until && monHeld(m)) continue;
      if (h.slowOnEnd > 0) {
        this._applyDebuff(m, 'slowMove', { duration: h.slowOnEnd, potency: 1, fromPlayer: true, source: p });
        m.slowPct = Math.max(m.slowPct || 0, 0.3); m.slowT = Math.max(m.slowT || 0, h.slowOnEnd);
        this._rungSlowedAfter = (this._rungSlowedAfter || 0) + 1;
      }
      if (h.breakCostsTurn) {
        const cd = (m.type && m.type.atkCooldown) || 1.2;
        m.atkCd = Math.max(m.atkCd || 0, cd);
        m.telegraph = null;
        this._rungTurnsCost = (this._rungTurnsCost || 0) + 1;
      }
      m._rungHold = null;
    }
    // companion shields run down
    for (const c of (this.party || [])) {
      if (c && c.rungShield) {
        c.rungShield.t -= dt;
        if (c.rungShield.t <= 0 || c.rungShield.amount <= 0) c.rungShield = null;
      }
    }
    // standing: the hurt threshold, suppression and the soul space change the fold
    const hurt = p.hp < p.maxHp * 0.5;
    const sup = !!(this._isSuppressed && this._isSuppressed(p));
    const soul = !!(this._inSoulSpace && this._inSoulSpace());
    const sig = `${hurt}|${sup}|${soul}`;
    if (this._rungStandingSig !== sig) {
      const first = this._rungStandingSig === undefined;
      this._rungStandingSig = sig;
      if (!first && this._rungHasStanding && this._recomputeDerivedStats) this._recomputeDerivedStats();
    }
    // the fight starts
    const quiet = this._combatQuietT || 0;
    if (quiet < 0.05 && (this._rungWasQuiet || 0) >= COMBAT_QUIET_S) this._rungFightStarts();
    this._rungWasQuiet = quiet;
    // standing: allies within reach share it
    this._rungPartyT = (this._rungPartyT || 0) - dt;
    if (this._rungPartyT <= 0) { this._rungPartyT = 0.5; this._rungShareStanding(); }
  },

  // ==========================================================================
  // STRIKE
  // ==========================================================================
  /** A crit the rungs force: on the afflicted, and the next blow after a
   *  stride. Asked by `_critChanceVs` and at a bolt's impact. */
  _rungForceCrit(a, m) {
    if (!a || !m) return false;
    if (a.critOnAfflicted && isAfflicted(m)) { this._rungAfflictedCrits = (this._rungAfflictedCrits || 0) + 1; return true; }
    return false;
  },

  /** A hit from the ability now resolving. Returns the damage to deal. */
  _rungOnHit(m, dmg, element) {
    const a = this._rungHitCtx;
    if (!a || !m || !(dmg > 0)) return dmg;
    // (hold, bronze) "anything it holds takes 20% more from every source" --
    // read for every hit, so it lives in `_rungHeldAmp` below.
    // (strike, bronze) "the first thing it hits in a fight takes double"
    if (a.openerDouble && !m._rungOpened && m.hp >= m.maxHp) {
      m._rungOpened = true;
      dmg *= 2;
      this._floatText(m.wx, m.wy - 44, 'Opener!', a.color || '#ffcc80');
      this._rungOpeners = (this._rungOpeners || 0) + 1;
    }
    // (strike, bronze) "it strikes a second time for a third, a moment later"
    if (a.echoStrike > 0 && !this._rungEchoing) {
      const echo = Math.max(1, Math.round(dmg * a.echoStrike));
      const src = a;
      this.time.delayedCall(ECHO_DELAY_MS, () => {
        if (!m.alive) return;
        const was = this._rungHitCtx; this._rungEchoing = true; this._rungHitCtx = src;
        try { this._damageMonster(m, echo, true, false, element); } finally { this._rungHitCtx = was; this._rungEchoing = false; }
        this._rungEchoes = (this._rungEchoes || 0) + 1;
      });
    }
    // (strike, gold) "it hits everything in a line behind its target as well"
    if (a.lineThrough && !this._rungLining) {
      const dx = m.wx - this.world.x, dy = m.wy - this.world.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      const behind = (this.monsters || []).filter(o => {
        if (!o.alive || o === m) return false;
        const t = (o.wx - m.wx) * ux + (o.wy - m.wy) * uy;
        if (t <= 0 || t > 6 * TILE) return false;
        const off = Math.abs((o.wx - m.wx) * -uy + (o.wy - m.wy) * ux);
        return off <= ((o.type && o.type.radius) || 12) + 14;
      });
      if (behind.length) {
        this._rungLining = true;
        try { for (const o of behind) this._damageMonster(o, dmg, true, false, element); } finally { this._rungLining = false; }
        this._rungLined = (this._rungLined || 0) + behind.length;
      }
    }
    return dmg;
  },

  /** (hold, bronze) the amp on a held target, for every hit from any source. */
  _rungHeldAmp(m) {
    const h = m && m._rungHold;
    if (!h || !(h.amp > 0) || this.time.now >= h.until) return 0;
    return h.amp;
  },

  /** (strike, silver) "it cannot be blocked": a ward on its target does not
   *  lessen it. */
  _rungUnblockable() {
    const a = this._rungHitCtx;
    return !!(a && a.unavoidable);
  },

  /** A kill, and which ability landed it. */
  _rungOnKill(m) {
    const a = this._rungHitCtx;
    const p = this.player;
    const now = this.time.now;
    // (stride, silver) "a kill within 3s of arriving clears its cooldown"
    for (const [k, until] of Object.entries(this._rungKillReset || {})) {
      if (now <= until) { p.abilityCdByKey[k] = 0; delete this._rungKillReset[k]; this._rungResets = (this._rungResets || 0) + 1; }
    }
    // (guard, gold) "a kill while it holds puts it back up at full"
    const sh = p.shield;
    if (sh && sh.rung && sh.rung.wardKillRestores && sh.maxAmount > 0) {
      sh.amount = sh.maxAmount;
      this._floatText(this.world.x, this.world.y - 60, 'Ward restored', '#4fc3f7');
      this._rungWardRestored = (this._rungWardRestored || 0) + 1;
    }
    if (!a) return;
    const key = this._rungDispatchKey || (this._rungDispatched && this._rungDispatched.key);
    // (strike, iron) "it costs nothing at all when it finishes something"
    if (a.freeOnKill && a.cost && a.cost.amount > 0) {
      const pool = a.cost.type === 'stamina' ? 'stamina' : 'mana';
      const cap = pool === 'stamina' ? p.maxStamina : p.maxMana;
      p[pool] = Math.min(cap, (p[pool] || 0) + a.cost.amount);
      this._rungRefunded = (this._rungRefunded || 0) + a.cost.amount;
    }
    // (strike, gold) "a kill with it refreshes every other cooldown you have"
    if (a.killRefreshesAll) {
      for (const k of Object.keys(p.abilityCdByKey || {})) if (k !== key) p.abilityCdByKey[k] = 0;
      this._floatText(this.world.x, this.world.y - 60, 'Refreshed', a.color || '#fff59d');
      this._rungRefreshedAll = (this._rungRefreshedAll || 0) + 1;
    }
  },

  // ==========================================================================
  // MEND
  // ==========================================================================
  /** Who a heal lands on, widened by the rungs. Asked by `_healTargets`. */
  _rungHealTargets(list, scope, includeHealthy) {
    const a = this._rungCastA;
    if (!a || !list) return list;
    let out = list;
    const worst = () => {
      let best = null, bf = includeHealthy ? Infinity : 0.999;
      for (const t of this._friendlyBodies({ x: this.world.x, y: this.world.y }, !!a.healSummons)) {
        if (t._d > 360) continue;
        const h = this._bodyHp(t);
        const f = h.hp / Math.max(1, h.max);
        if (f < bf && !out.some(o => o === t || (o.ref && o.ref === t.ref) || (o.kind === 'player' && t.kind === 'player'))) { bf = f; best = t; }
      }
      return best;
    };
    // (mend, iron) "it finds whoever is worst off"
    if (a.healPicksWorst && (!scope || scope === 'self')) {
      const w = worst();
      if (w) { out = [w]; this._rungPickedWorst = (this._rungPickedWorst || 0) + 1; }
    }
    // (mend, silver) "it reaches one further ally"
    if (a.healExtraTarget > 0) {
      for (let i = 0; i < a.healExtraTarget; i++) {
        const w = worst();
        if (!w) break;
        out = out.concat([w]);
        this._rungExtraHealed = (this._rungExtraHealed || 0) + 1;
      }
    }
    return out;
  },

  /** `_healTargets`, widened by the mend rungs of the ability resolving. */
  _healTargets(scope, includeHealthy = false, caster = null, spec = null) {
    const out = this._healTargetsRaw(scope, includeHealthy, caster, spec);
    if (caster || !this._rungCastA) return out;
    return this._rungHealTargets(out, scope, includeHealthy);
  },

  /** A heal about to land on the player: the uncuttable rung. Returns the
   *  cut to use. */
  _rungHealCut(cut) {
    const a = this._rungCastA;
    if (a && a.healUncuttable && cut > 0) { this._rungUncut = (this._rungUncut || 0) + 1; return 0; }
    return cut;
  },

  /** A heal that has landed. `t` is `{kind:'player'}` or a body handle. */
  _rungHealed(t, amount, missing) {
    const a = this._rungCastA;
    if (!a || !(amount > 0) || this._rungInHeal) return;
    this._rungInHeal = true;
    try { this._rungHealedInner(a, t, amount, missing); } finally { this._rungInHeal = false; }
  },

  _rungHealedInner(a, t, amount, missing) {
    const ent = !t || t.kind === 'player' ? this.player : t.ref;
    this._rungHealLog = this._rungHealLog || [];
    // (mend, iron) "it lifts one condition as it heals"
    if (a.cleanseOnHeal > 0 && ent && ent.debuffs && Object.keys(ent.debuffs).length) {
      const seen = (this._rungCleansed = this._rungCleansed || new WeakSet());
      if (!seen.has(ent) || this._rungCleanseCast !== this._rungDispatched) {
        this._rungCleanseCast = this._rungDispatched;
        const gone = this._cleanseConditions(ent, { tag: null, count: a.cleanseOnHeal }) || [];
        if (gone.length) this._rungLifted = (this._rungLifted || 0) + gone.length;
      }
    }
    // (mend, bronze) "healing past full becomes a shield that lasts 6s"
    if (a.overhealShield > 0 && ent === this.player) {
      const over = Math.max(0, Math.round(amount - (missing || 0)));
      if (over > 0) {
        const sh = this.player.shield;
        if (sh && sh.kind === 'timed' && sh.source === 'own') { sh.amount += over; sh.t = Math.max(sh.t, a.overhealShield); }
        else this.player.shield = { kind: 'timed', source: 'own', costPerPoint: 1, amount: over, strikes: 0, t: a.overhealShield, maxAmount: over };
        this._rungOverheal = (this._rungOverheal || 0) + over;
      }
    }
    // (mend, bronze) "it keeps mending for 4s after it lands"
    if (a.healTrail > 0) {
      const per = Math.max(1, Math.round(amount * 0.25 / a.healTrail));
      this._applyHot(t && t.kind !== 'player' ? t : { kind: 'player' }, per, a.healTrail);
      this._rungTrails = (this._rungTrails || 0) + 1;
    }
    this._rungHealLog.push({ t, amount });
  },

  _rungMendPost(c) {
    const { a, key, now } = c;
    const p = this.player;
    // (mend, gold) "it works on the downed, and brings them up at a quarter health"
    if (a.revives > 0 && (a.healAmount || a.hotPerSec || a.healOnUse || this._rungHealLog)) {
      for (const m of (this.party || [])) {
        if (!m || !m.recruited || !(m.downT > 0)) continue;
        if (Math.hypot(m.x - this.world.x, m.y - this.world.y) > 360) continue;
        m.downT = 0;
        m.hp = Math.max(1, Math.round(m.maxHp * a.revives));
        this._floatText(m.x, m.y - 40, `${m.name} rises`, a.color || '#a5d6a7');
        this._rungRevived = (this._rungRevived || 0) + 1;
      }
    }
    // (mend, silver) "a critical strike anywhere on your team triggers it again for a quarter"
    if (a.healEchoOnCrit > 0 && this._rungHealLog && this._rungHealLog.length) {
      this._rungHealEcho = { key, frac: a.healEchoOnCrit, log: this._rungHealLog.slice(), until: now + HEAL_ECHO_WINDOW_MS, next: 0, color: a.color };
    }
    // (mend, gold) "it leaves a mending that outlasts your death"
    if (a.healPersists) {
      const total = (this._rungHealLog || []).reduce((s, x) => s + (x.amount || 0), 0);
      // Listens for your death for as long as the ability takes to come round.
      p.rungPersistMend = { perSec: Math.max(1, Math.round(total * 0.1)), until: now + Math.max(30, (a.cooldown || 0)) * 1000 };
    }
    this._rungHealLog = null;
  },

  /** A cast in progress that "cannot be interrupted". */
  _rungUninterruptible() {
    const c = this.player && this.player.casting;
    if (!c) return false;
    const a = this._scaledAbility ? this._scaledAbility(c.key) : null;
    return !!(a && (a.wardQuickCast || a.boonInstant));
  },

  /** A mend with "it finds whoever is worst off" that pays through the plain
   *  player heal (a heal-on-use rider): the heal goes to the worst-off
   *  companion instead, when one is worse off than you. True if redirected. */
  _rungRedirectHeal(amount) {
    const a = this._rungCastA;
    if (!a || !a.healPicksWorst || this._rungInHeal || this._rungRedirecting) return false;
    const p = this.player;
    let best = null, bf = p.hp / Math.max(1, p.maxHp);
    for (const c of (this.party || [])) {
      if (!c || !c.recruited || c.downT > 0 || !(c.maxHp > 0)) continue;
      if (Math.hypot(c.x - this.world.x, c.y - this.world.y) > 360) continue;
      const f = c.hp / c.maxHp;
      if (f < bf) { bf = f; best = c; }
    }
    if (!best) return false;
    this._rungRedirecting = true;
    try { this._healFriendly({ kind: 'party', ref: best, x: best.x, y: best.y }, Math.round(amount), a.color || '#aed581'); }
    finally { this._rungRedirecting = false; }
    this._rungPickedWorst = (this._rungPickedWorst || 0) + 1;
    return true;
  },

  /** A crit landed somewhere on the team: a mend listening for one repeats. */
  _rungTeamCrit() {
    const e = this._rungHealEcho;
    const now = this.time.now;
    if (!e || now > e.until || now < e.next) return;
    e.next = now + 1000;
    for (const x of e.log) {
      const amt = Math.max(1, Math.round((x.amount || 0) * e.frac));
      if (!x.t || x.t.kind === 'player') this._healPlayer(amt, { quiet: true });
      else if (x.t.ref && x.t.ref.hp > 0) x.t.ref.hp = Math.min(x.t.ref.maxHp || x.t.ref.hp, x.t.ref.hp + amt);
    }
    this._floatText(this.world.x, this.world.y - 60, 'Echoed mend', e.color || '#a5d6a7');
    this._rungHealEchoes = (this._rungHealEchoes || 0) + 1;
  },

  /** You fell. (mend, gold) "it leaves a mending that outlasts your death":
   *  every companion near you is mended for 10s after you go down; (standing,
   *  gold) "it keeps working for 30s after you die": your companions carry
   *  the passive's benefit for that long. */
  _rungOnDeath() {
    const p = this.player;
    const now = this.time.now;
    const pm = p && p.rungPersistMend;
    if (pm && pm.until > now) {
      for (const c of (this.party || [])) {
        if (!c || !c.recruited || c.downT > 0) continue;
        if (Math.hypot(c.x - this.world.x, c.y - this.world.y) > 480) continue;
        c.hot = { perSec: Math.max(pm.perSec, Math.round((c.maxHp || 40) * 0.1)), t: 10 };
        this._rungPersisted = (this._rungPersisted || 0) + 1;
      }
    }
    const out = p && p.passiveMods && p.passiveMods.rungOutlasts;
    if (out > 0) this._rungAfterDeath = { until: now + out * 1000 };
  },

  /** At respawn: arms that are in your hands when you rise. */
  _rungOnRespawn() {
    // (conjured, gold) "it stays through your death and is in your hands when you rise"
    try { this._rungConjureRespawn(); } catch (e) { /* never block a respawn */ }
  },

  // ==========================================================================
  // GUARD
  // ==========================================================================
  _rungGuard(c) {
    const { a, newShield, newBuffs, now } = c;
    const p = this.player;
    const wardy = a.wardTyped || a.wardSummons || a.breakStagger || a.wardThorns || a.wardAnchors
      || a.wardRefunds || a.wardScope || a.wardSlowsAttacker || a.wardEatsConditions || a.wardRemainderHeals
      || a.wardRefit || a.wardNullifiesBreaker || a.wardScopeParty || a.wardUndispellable || a.wardKillRestores;
    if (!wardy) return;
    const flags = {};
    for (const k of ['wardTyped', 'wardSummons', 'breakStagger', 'wardThorns', 'wardAnchors', 'wardRefunds',
      'wardSlowsAttacker', 'wardEatsConditions', 'wardRemainderHeals', 'wardRefit', 'wardNullifiesBreaker',
      'wardUndispellable', 'wardKillRestores']) if (a[k]) flags[k] = a[k];
    let dur = 0;
    if (newShield) {
      newShield.rung = flags;
      newShield.maxAmount = Math.max(newShield.maxAmount || 0, newShield.amount || 0);
      newShield.refits = a.wardRefit ? 1 : 0;
      if (a.wardTyped) newShield.rungTyped = true;
      dur = newShield.t || 0;
    }
    for (const k of newBuffs) {
      const b = p.buffs[k];
      if (!b) continue;
      b.rung = flags;
      if (a.wardTyped && k === 'armor') b.typed = true;
      dur = Math.max(dur, b.t || 0);
    }
    // A ward that is neither a shield nor a buff (a wall, a taunt) still
    // "holds" for its own clock.
    if (!dur) dur = a.shieldDuration || a.buffDuration || a.immunityDuration || a.wallDuration || a.duration || 6;
    this._rungWard = { key: c.key, a, flags, until: now + dur * 1000, shield: newShield || null };
    // (guard, silver/gold) the nearest ally, or the whole team at half
    const amount = newShield ? (newShield.amount || 0) : 0;
    const give = (m, frac) => {
      const amt = amount > 0 ? Math.round(amount * frac) : Math.round((m.maxHp || 40) * 0.2 * frac);
      if (amt <= 0) return;
      m.rungShield = { amount: amt, t: dur, flags };
      this._floatText(m.x, m.y - 40, `+${amt} ward`, a.color || '#4fc3f7');
      this._rungAllyWarded = (this._rungAllyWarded || 0) + 1;
    };
    const allies = (this.party || []).filter(m => m && m.recruited && !m.dismissed && !(m.downT > 0));
    if (a.wardScopeParty > 0) {
      for (const m of allies) if (Math.hypot(m.x - this.world.x, m.y - this.world.y) <= 6 * TILE) give(m, a.wardScopeParty);
    } else if (a.wardScope === 'ally') {
      let best = null, bd = Infinity;
      for (const m of allies) { const d = Math.hypot(m.x - this.world.x, m.y - this.world.y); if (d < bd) { bd = d; best = m; } }
      if (best && bd <= 360) give(best, 1);
    }
  },

  /** Is a ward from a guard rung holding right now? Returns its flags. */
  _rungWardHolds() {
    const w = this._rungWard;
    if (!w) return null;
    const now = this.time.now;
    if (w.shield) {
      const sh = this.player.shield;
      if (sh !== w.shield || !(sh.amount > 0 || sh.strikes > 0)) {
        if (now > w.until) { this._rungWard = null; return null; }
        return w.shield === sh ? w.flags : null;
      }
      return w.flags;
    }
    if (now > w.until) { this._rungWard = null; return null; }
    return w.flags;
  },

  /** Suppression switches wards off, unless the ward says otherwise. */
  _rungWardSuppressed() {
    const p = this.player;
    if (!this._isSuppressed || !this._isSuppressed(p)) return false;
    const sh = p.shield;
    return !(sh && sh.rung && sh.rung.wardUndispellable);
  },

  /** The player is about to be struck. Returns the blow, maybe changed, and
   *  may shift part of it onto a summon. Called before the shield is read. */
  _rungBeforeBlow(m, taken) {
    const p = this.player;
    // (guard, iron) "it goes up the instant you are struck" -- a passive ward
    // raises its shield when a blow lands and none is up (10s apart).
    if (taken > 0 && !(p.shield && p.shield.amount > 0) && this.time.now >= (this._rungOnHitWardAt || 0)) {
      const kit = this._liveKnown ? this._liveKnown() : (p.knownAbilities || {});
      for (const [key, e] of Object.entries(kit)) {
        const a0 = e && e.ability;
        if (!a0 || a0.kind !== 'passive') continue;
        const a = this._scaledAbility ? (this._scaledAbility(key) || a0) : a0;
        if (!a.wardOnHit) continue;
        const amt = Math.max(1, Math.round(a.shieldAmount || p.maxHp * 0.15));
        p.shield = { kind: 'timed', source: 'own', costPerPoint: 1, amount: amt, strikes: 0, t: a.shieldDuration || 6, maxAmount: amt };
        this._rungOnHitWardAt = this.time.now + 10000;
        this._rungWardOnHit = (this._rungWardOnHit || 0) + 1;
        break;
      }
    }
    // (stride, bronze) "you are untouchable for the 0.4s it takes"
    if (p.buffs && p.buffs.rungIframes) { this._rungIframeSaves = (this._rungIframeSaves || 0) + 1; return 0; }
    // (called, gold) "what it calls shares half of every blow meant for you"
    if (taken > 0) {
      const s = (this._summons || []).find(x => x && x.rungFlags && x.rungFlags.summonSharesDamage > 0 && x.hp > 0);
      if (s) {
        const part = Math.round(taken * s.rungFlags.summonSharesDamage);
        if (part > 0) {
          taken -= part;
          this._rungSummonTakes(s, part, m);
          this._rungShared = (this._rungShared || 0) + part;
        }
      }
    }
    return taken;
  },

  /** The shield just absorbed `absorbed` of a blow from `m`; `broke` says
   *  whether it is now spent. Returns how much of the blow still lands. */
  _rungShieldTook(m, sh, absorbed, broke, taken) {
    const f = sh && sh.rung;
    if (!f) return taken;
    const p = this.player;
    if (absorbed > 0) {
      if (f.wardThorns > 0 && m && m.alive) {
        const back = Math.max(1, Math.round(absorbed * f.wardThorns));
        this._damageMonster(m, back, true, false, m.dmgElement || null);
        this._rungWardThorns = (this._rungWardThorns || 0) + back;
      }
      if (f.wardRefunds > 0) {
        p.stamina = Math.min(p.maxStamina, (p.stamina || 0) + absorbed * f.wardRefunds);
        this._rungWardRefund = (this._rungWardRefund || 0) + absorbed * f.wardRefunds;
      }
    }
    if (broke) {
      if (f.breakStagger > 0 && m && m.alive) {
        this._applyDebuff(m, 'stun', { duration: f.breakStagger, fromPlayer: true, source: p });
        m.atkCd = Math.max(m.atkCd || 0, f.breakStagger);
        m.telegraph = null;
        this._rungStaggered = (this._rungStaggered || 0) + 1;
      }
      if (f.wardNullifiesBreaker) { this._rungNullified = (this._rungNullified || 0) + 1; taken = 0; }
      if (f.wardRefit && sh.refits > 0) {
        sh.refits -= 1;
        sh.amount = Math.max(1, Math.round((sh.maxAmount || absorbed) * f.wardRefit));
        this._floatText(this.world.x, this.world.y - 60, 'The ward re-forms', '#4fc3f7');
        this._rungRefit = (this._rungRefit || 0) + 1;
      }
    }
    return taken;
  },

  /** Whoever struck you while a guard rung's ward held. */
  _rungStruckThroughWard(m) {
    const f = this._rungWardHolds();
    if (!f || !m || !m.alive) return;
    if (f.wardSlowsAttacker > 0) {
      this._applyDebuff(m, 'slowMove', { duration: 3, potency: 1, fromPlayer: true, source: this.player });
      m.slowPct = Math.max(m.slowPct || 0, f.wardSlowsAttacker); m.slowT = Math.max(m.slowT || 0, 3);
      this._rungWardSlowed = (this._rungWardSlowed || 0) + 1;
    }
  },

  /** A condition is about to land on the player. False = refused. */
  _rungAllowPlayerCondition(key) {
    const def = conditionDef(key);
    if (!def) return true;
    const p = this.player;
    // (guard, bronze) "while it holds, nothing can root, freeze or slow you"
    const f = this._rungWardHolds();
    if (f && f.wardAnchors && ((hasTag(def, TAG.control) && def.stopsMove) || def.rate === 'moveSpeed')) {
      this._rungAnchored = (this._rungAnchored || 0) + 1;
      return false;
    }
    // (guard, silver) "it absorbs conditions as well as damage, one at a time"
    const sh = p.shield;
    if (sh && sh.rung && sh.rung.wardEatsConditions && (sh.amount || 0) > 0) {
      const bite = Math.max(1, Math.round((sh.maxAmount || sh.amount) * 0.1));
      sh.amount = Math.max(0, sh.amount - bite);
      this._floatText(this.world.x, this.world.y - 50, `${def.label} absorbed`, '#4fc3f7');
      this._rungAteCondition = (this._rungAteCondition || 0) + 1;
      return false;
    }
    // (conjured, gold) "armour-breaking afflictions do not take hold on you"
    if ((def.rate === 'armor' || (Array.isArray(def.rates) && def.rates.includes('armor'))) && this._rungConjuredUnbreakable()) {
      this._rungUnsundered = (this._rungUnsundered || 0) + 1;
      return false;
    }
    return true;
  },

  /** (guard, silver) a shield that runs out on its clock heals what is left. */
  _rungShieldExpired(sh) {
    if (!sh || !sh.rung || !sh.rung.wardRemainderHeals) return;
    const left = Math.round(sh.amount || 0);
    if (left <= 0) return;
    this._healPlayer(left, { quiet: true });
    this._floatText(this.world.x, this.world.y - 50, `+${left} (ward)`, '#80deea');
    this._rungRemainderHealed = (this._rungRemainderHealed || 0) + left;
  },

  /** A companion is struck: its rung ward takes the blow first. */
  _rungPartyShield(m, dmg) {
    const s = m && m.rungShield;
    if (!s || !(s.amount > 0) || !(dmg > 0)) return dmg;
    const take = Math.min(s.amount, dmg);
    s.amount -= take;
    this._rungAllyAbsorbed = (this._rungAllyAbsorbed || 0) + take;
    if (s.amount <= 0) m.rungShield = null;
    return dmg - take;
  },

  // ==========================================================================
  // CALLED
  // ==========================================================================
  _rungCalled(c) {
    const { a, key, newSummons } = c;
    if (!newSummons.length) return;
    const flags = {};
    for (const k of ['summonInherits', 'summonSharesHeals', 'summonScalesOnAfflictions', 'summonDeathblow',
      'summonRespawns', 'summonSharesDamage']) if (a[k]) flags[k] = a[k];
    const target = this._currentTarget ? this._currentTarget('enemy') : null;
    const last = (target && target.alive) ? target : (this._rungLastStruck && this._rungLastStruck.alive ? this._rungLastStruck : null);
    for (const s of newSummons) {
      s.rungKey = key;
      s.rungFlags = flags;
      s.rungRespawns = a.summonRespawns || 0;
      if (a.summonWard && s.maxHp > 0) { s.rungShield = Math.round(s.maxHp * 0.3); this._rungSummonWarded = (this._rungSummonWarded || 0) + 1; }
      if (a.summonArrivesAttacking) { s.atkT = 0; this._rungArrivedSwinging = (this._rungArrivedSwinging || 0) + 1; }
      if (a.summonTaunts && last && this._applyTaunt) {
        const src = s.tauntSrc || { kind: 'summon', ref: s, pos: () => ({ x: s.wx, y: s.wy }),
          alive: () => s.hp !== 0 && (this._summons || []).includes(s) };
        const until = (this._combatClock || 0) + 6;
        last.taunt = { srcX: s.wx, srcY: s.wy, until, src, threatMult: 1 };
        last.state = 'chase';
        this._rungSummonTaunts = (this._rungSummonTaunts || 0) + 1;
      }
    }
    // (called, silver) "a second may stand at once" -- one of an ability's
    // own at a time otherwise (per sending, for a sending of several).
    const per = Math.max(1, a.summonCount || 1);
    const cap = per * Math.max(1, a.summonCap || 1);
    const mine = (this._summons || []).filter(s => s && s.rungKey === key && s.kind === 'creature');
    while (mine.length > cap) { const old = mine.shift(); this._rungRemoveSummon(old); }
  },

  _rungRemoveSummon(s) {
    const i = (this._summons || []).indexOf(s);
    if (i < 0) return;
    if (s.sprite && s.sprite.active) s.sprite.destroy();
    this._summons.splice(i, 1);
  },

  /** A summon's own blow: what it carries, and how hard. Returns the damage. */
  _rungSummonBlow(s, m, dmg) {
    const f = s && s.rungFlags;
    if (!f || !m) return dmg;
    if (f.summonScalesOnAfflictions) {
      let n = m.dot && m.dot.credit !== false ? 1 : 0;
      for (const d of Object.values(m.debuffs || {})) if (d && d.fromPlayer) n++;
      if (n > 0) { dmg = Math.round(dmg * (1 + 0.15 * n)); this._rungSummonScaled = (this._rungSummonScaled || 0) + 1; }
    }
    return dmg;
  },

  _rungSummonAfter(s, m) {
    const f = s && s.rungFlags;
    if (!f || !f.summonInherits || !m || !m.alive) return;
    const last = this._rungLastAffliction;
    if (!last) return;
    if (last.dot) this._applyDot(m, { ...last.dot });
    else if (last.key) this._applyDebuff(m, last.key, { fromPlayer: true, source: this.player });
    this._rungInherited = (this._rungInherited || 0) + 1;
  },

  /** A summon of a rung ability takes `dmg` (from a blow on it, or a share of
   *  yours). Handles its ward, its fall, its parting blow and its return. */
  _rungSummonTakes(s, dmg, m) {
    if (!s) return;
    if (s.rungShield > 0) { const k = Math.min(s.rungShield, dmg); s.rungShield -= k; dmg -= k; }
    if (dmg <= 0) return;
    s.hp -= dmg;
    this._floatText(s.wx, s.wy - 26, `-${Math.round(dmg)}`, '#ef9a9a');
    if (s.hp <= 0 && !this._rungSummonFell(s, m)) {
      this._rungRemoveSummon(s);
      this._summonsLost = (this._summonsLost || 0) + 1;
    }
  },

  /** A rung summon has fallen. Returns true if it stood again. */
  _rungSummonFell(s, m) {
    const f = s && s.rungFlags;
    if (f && f.summonDeathblow && m && m.alive) {
      this._damageMonster(m, Math.max(1, Math.round((s.dmg || 4) * 2)), true, false, s.element || null);
      this._floatText(m.wx, m.wy - 40, `${s.name}'s last blow`, s.color || '#ffcc80');
      this._rungDeathblows = (this._rungDeathblows || 0) + 1;
    }
    if (s && s.rungRespawns > 0) {
      s.rungRespawns -= 1;
      s.hp = s.maxHp;
      s.t = Math.max(s.t || 0, 10);
      this._floatText(s.wx, s.wy - 34, `${s.name} stands again`, s.color || '#a5d6a7');
      this._rungRespawned = (this._rungRespawned || 0) + 1;
      return true;
    }
    return false;
  },

  /** A heal landed on you: summons that share your heals are mended too. */
  _rungSummonsShareHeal(amount) {
    if (!(amount > 0)) return;
    for (const s of (this._summons || [])) {
      if (!s || !s.rungFlags || !s.rungFlags.summonSharesHeals || !(s.maxHp > 0)) continue;
      s.hp = Math.min(s.maxHp, s.hp + amount);
      this._rungSummonHealed = (this._rungSummonHealed || 0) + 1;
    }
  },

  // ==========================================================================
  // HOLD
  // ==========================================================================
  _rungHold(c) {
    const { a, key, held, now } = c;
    const flags = a.slowOnEnd || a.holdBlocksHealing || a.holdActsFirst || a.holdAmplifies || a.holdSpreads
      || a.holdLongerOnAfflicted || a.holdSilences || a.breakCostsTurn || a.holdSeals || a.holdChains || a.extraTargets;
    if (!flags || !held.length) return;
    const holdLeft = (m) => Math.max(m.frozenT || 0, m.confusedT || 0, m.rootT || 0,
      (m.debuffs && m.debuffs.stun && m.debuffs.stun.t) || 0, (m.debuffs && m.debuffs.freeze && m.debuffs.freeze.t) || 0,
      (m.debuffs && m.debuffs.suppressed && m.debuffs.suppressed.t) || 0,
      m.taunt && m.taunt.until ? Math.max(0, m.taunt.until - (this._combatClock || 0)) : 0, 1);
    const mark = (m) => {
      // (hold, silver) "it holds half as long again on anything already afflicted"
      if (a.holdLongerOnAfflicted && isAfflicted(m)) {
        const k = 1 + a.holdLongerOnAfflicted;
        if (m.frozenT > 0) m.frozenT *= k;
        if (m.confusedT > 0) m.confusedT *= k;
        if (m.rootT > 0) m.rootT *= k;
        for (const q of ['stun', 'freeze', 'suppressed']) if (m.debuffs && m.debuffs[q]) m.debuffs[q].t *= k;
        this._rungHeldLonger = (this._rungHeldLonger || 0) + 1;
      }
      const dur = holdLeft(m);
      m._rungHold = { key, until: now + dur * 1000, amp: a.holdAmplifies || 0,
        blocksHeal: !!(a.holdBlocksHealing || a.holdSeals), seals: !!a.holdSeals,
        slowOnEnd: a.slowOnEnd || 0, breakCostsTurn: !!a.breakCostsTurn };
      // (hold, iron) "it lands before they can act"
      if (a.holdActsFirst) {
        m.telegraph = null; m.attackT = 0;
        m.atkCd = Math.max(m.atkCd || 0, (m.type && m.type.atkCooldown) || 1);
        this._rungInterrupted = (this._rungInterrupted || 0) + 1;
      }
      // (hold, gold) "whatever it holds cannot be healed or shielded by anything else"
      if (a.holdSeals && m.buffs) { delete m.buffs.regen; delete m.buffs.bulwark; }
    };
    for (const m of held) mark(m);
    const copyHold = (from, to, frac) => {
      if (from.frozenT > 0) { to.frozenT = Math.max(to.frozenT || 0, from.frozenT * frac); if (to.sprite && to.sprite.setTint) to.sprite.setTint(0x99ccff); }
      if (from.confusedT > 0) to.confusedT = Math.max(to.confusedT || 0, from.confusedT * frac);
      if (from.rootT > 0) to.rootT = Math.max(to.rootT || 0, from.rootT * frac);
      for (const q of ['stun', 'freeze', 'suppressed']) {
        if (from.debuffs && from.debuffs[q]) this._applyDebuff(to, q, { duration: from.debuffs[q].t * frac, fromPlayer: true, source: this.player });
      }
      if (from.taunt && from.taunt.src) to.taunt = { ...from.taunt };
      mark(to);
    };
    const others = (m0, r) => (this.monsters || []).filter(o => o.alive && !held.includes(o) && !o._rungHold
      && Math.hypot(o.wx - m0.wx, o.wy - m0.wy) <= r).sort((x, y) =>
      Math.hypot(x.wx - m0.wx, x.wy - m0.wy) - Math.hypot(y.wx - m0.wx, y.wy - m0.wy));
    // (hold, bronze) "it spreads to whatever they were about to strike" -- the
    // nearest other foe within 3 tiles of the first held.
    if (a.holdSpreads) {
      const o = others(held[0], 3 * TILE)[0];
      if (o) { copyHold(held[0], o, 1); this._rungSpread = (this._rungSpread || 0) + 1; }
    }
    // (hold, bronze) "it reaches one more target": the nearest foe it missed.
    if (a.extraTargets > 0) {
      for (let i = 0; i < a.extraTargets; i++) {
        const o = others({ wx: this.world.x, wy: this.world.y }, 6 * TILE)[0];
        if (!o) break;
        copyHold(held[0], o, 1);
        this._rungExtraHeld = (this._rungExtraHeld || 0) + 1;
      }
    }
    // (hold, gold) "it holds a second target for half as long"
    if (a.holdChains > 0) {
      const tgt = this._currentTarget ? this._currentTarget('enemy') : null;
      const o = (tgt && tgt.alive && !held.includes(tgt) && !tgt._rungHold) ? tgt : others(held[0], 6 * TILE)[0];
      if (o) { copyHold(held[0], o, a.holdChains); this._rungChained = (this._rungChained || 0) + 1; }
    }
    // (hold, silver) arm the silencing second cast
    if (a.holdSilences) (this._rungSilence = this._rungSilence || {})[key] = { mons: held.slice() };
  },

  /** Asked where a monster heals or is warded: is a hold stopping it? */
  _rungNoMonsterHeal(m) {
    const h = m && m._rungHold;
    return !!(h && h.blocksHeal && this.time.now < h.until);
  },
  _rungNoMonsterWard(m) {
    const h = m && m._rungHold;
    return !!(h && h.seals && this.time.now < h.until);
  },

  /** (hold, silver) "nothing below your own rank may resist it": the control
   *  diminishing return is skipped for them while this cast resolves. */
  _rungIgnoresDr(m) {
    const a = this._rungCastA;
    if (!a || !a.ignoreDrBelowRank || !m) return false;
    const mine = this._playerRankIndex ? this._playerRankIndex() : 0;
    const theirs = this._monsterRankIndex ? this._monsterRankIndex(m) : 0;
    if (theirs < mine) { this._rungDrIgnored = (this._rungDrIgnored || 0) + 1; return true; }
    return false;
  },

  // ==========================================================================
  // BOON (the fields are applied by `applyBoonSteps`; this is the one that
  // needs a clock of its own -- nothing)
  // ==========================================================================
  _rungBoonPost() {},

  // ==========================================================================
  // CONJURED
  // ==========================================================================
  /** The scaled conjuring ability for a conjured piece. */
  _rungConjurer(key) {
    const a = this._scaledAbility ? this._scaledAbility(key) : null;
    return a || (this.player.knownAbilities[key] && this.player.knownAbilities[key].ability) || null;
  },

  /** After `_reconcileConjuredItems` has run: the conjured rungs that shape
   *  the pieces themselves. */
  _rungConjureAfterReconcile() {
    const p = this.player;
    if (!p) return;
    // weapons
    for (const [wid, key] of (p.conjuredWeapons || new Map())) {
      const a = this._rungConjurer(key);
      const def = this._conjuredWeaponDefs && this._conjuredWeaponDefs[wid];
      if (!a || !def || def.canonForm) continue;
      if (a.conjureRarityStep && !def._rungRarity) { def.base = Math.round(def.base * 1.15); def._rungRarity = true; }
      // (conjured, bronze) "it conjures a second piece for your other hand"
      if (a.conjureSecond) { p.weaponCounts = p.weaponCounts || {}; p.weaponCounts[wid] = Math.max(2, p.weaponCounts[wid] || 1); }
      // (conjured, iron) "it conjures straight into your hand"
      if (a.conjureToHand && !def._rungHanded) {
        def._rungHanded = true;
        const h = p.hands || (p.hands = { left: null, right: null });
        if (h.left !== wid && h.right !== wid) {
          const free = !h.right ? 'right' : (!h.left ? 'left' : null);
          if (free) { h[free] = wid; this._rungToHand = (this._rungToHand || 0) + 1; }
        }
      }
    }
    // armour and gear
    const pieces = [...(p.inventory.gearItems || []), ...Object.values(p.gear || {})].filter(g => g && g.conjuredBy);
    for (const g of pieces) {
      const a = this._rungConjurer(g.conjuredBy);
      if (!a) continue;
      if (a.conjureRarityStep && !g._rungRarity && g.rarity !== 'Legendary') {
        g._rungRarity = true;
        g.rarity = 'Legendary';
        for (const b of (g.buffs || [])) if (typeof b.amount === 'number') b.amount = Math.round(b.amount * 1.2 * 1000) / 1000;
      }
      if (a.conjureShareable) g.shareable = true;
      if (a.conjureToHand && !g._rungHanded && g.slot) {
        g._rungHanded = true;
        const slot = g.slot === 'ring' ? (p.gear.ring1 ? 'ring2' : 'ring1') : g.slot;
        if (slot in (p.gear || {}) && !p.gear[slot] && (p.inventory.gearItems || []).includes(g)) {
          p.inventory.gearItems.splice(p.inventory.gearItems.indexOf(g), 1);
          p.gear[slot] = g;
          this._rungToHand = (this._rungToHand || 0) + 1;
        }
      }
      // (conjured, gold) "it conjures a matched set rather than a single piece"
      if (a.conjureSet && !g._rungSetMade) {
        g._rungSetMade = true;
        const want = ['helm', 'gloves', 'boots', 'legs', 'chest'].filter(sl => sl !== g.slot);
        for (const sl of want.slice(0, 3)) {
          const piece = { ...g, uid: `${g.uid || g.id || 'conj'}-set-${sl}`, slot: sl, name: `${g.name} (${sl})`,
            buffs: (g.buffs || []).map(b => ({ ...b, amount: typeof b.amount === 'number' ? Math.round(b.amount * 0.5 * 1000) / 1000 : b.amount })),
            _rungSetMade: true, _rungSetOf: g.uid || g.id };
          p.inventory.gearItems.push(piece);
          this._rungSetPieces = (this._rungSetPieces || 0) + 1;
        }
      }
      // (conjured, bronze) a second piece: a spare, for the other ring or to hand on
      if (a.conjureSecond && !g._rungSecond && !g._rungSetOf) {
        g._rungSecond = true;
        p.inventory.gearItems.push({ ...g, uid: `${g.uid || g.id || 'conj'}-2`, _rungSecond: true, _rungSpare: true });
        this._rungSecondPieces = (this._rungSecondPieces || 0) + 1;
      }
    }
  },

  /** Are you wearing or wielding a conjured piece that "cannot be sundered"? */
  _rungConjuredUnbreakable() {
    const p = this.player;
    for (const g of Object.values(p.gear || {})) if (g && g.conjuredBy) { const a = this._rungConjurer(g.conjuredBy); if (a && a.conjureUnbreakable) return true; }
    for (const [wid, key] of (p.conjuredWeapons || new Map())) {
      if (p.hands && (p.hands.left === wid || p.hands.right === wid)) { const a = this._rungConjurer(key); if (a && a.conjureUnbreakable) return true; }
    }
    return false;
  },

  /** (conjured, iron) "it takes the element of whatever you last struck". */
  _rungConjureElement(m) {
    const p = this.player;
    this._rungLastStruck = m;
    if (!p || !p.conjuredWeapons || !m) return;
    const el = m.dmgElement || (m.type && m.type.element) || null;
    if (!el) return;
    for (const [wid, key] of p.conjuredWeapons) {
      const a = this._rungConjurer(key);
      const def = this._conjuredWeaponDefs && this._conjuredWeaponDefs[wid];
      if (!a || !def || !a.conjureMatchesElement || def.canonForm) continue;
      if (def.element !== el) { def.element = el; this._rungMatched = (this._rungMatched || 0) + 1; }
    }
  },

  /** Is this conjured piece one that is never left with your body? */
  _rungKeepsOnDeath(itemOrWid) {
    const p = this.player;
    const key = typeof itemOrWid === 'string' ? (p.conjuredWeapons && p.conjuredWeapons.get(itemOrWid)) : (itemOrWid && itemOrWid.conjuredBy);
    if (!key) return false;
    const a = this._rungConjurer(key);
    return !!(a && (a.noDecay || a.conjurePersists));
  },

  /** At respawn: the conjured pieces that are "in your hands when you rise". */
  _rungConjureRespawn() {
    const p = this.player;
    for (const [wid, key] of (p.conjuredWeapons || new Map())) {
      const a = this._rungConjurer(key);
      if (!a || !a.conjurePersists) continue;
      const h = p.hands || (p.hands = { left: null, right: null });
      if (h.left === wid || h.right === wid) continue;
      if (!h.right) h.right = wid; else if (!h.left) h.left = wid;
      this._rungRisenArmed = (this._rungRisenArmed || 0) + 1;
    }
  },

  /** (conjured, silver) "each dawn it is reforged, keeping the better". */
  _rungConjureDawn() {
    const p = this.player;
    for (const [wid, key] of (p.conjuredWeapons || new Map())) {
      const a = this._rungConjurer(key);
      const def = this._conjuredWeaponDefs && this._conjuredWeaponDefs[wid];
      if (!a || !def || !a.conjureReforges || def.canonForm) continue;
      const roll = 1 + Math.random() * 0.1;
      const next = Math.round((def._rungForgeBase || def.base) * roll);
      def._rungForgeBase = def._rungForgeBase || def.base;
      if (next > def.base) { def.base = next; this._rungReforged = (this._rungReforged || 0) + 1; }
    }
    for (const g of [...(p.inventory.gearItems || []), ...Object.values(p.gear || {})]) {
      if (!g || !g.conjuredBy) continue;
      const a = this._rungConjurer(g.conjuredBy);
      if (!a || !a.conjureReforges) continue;
      for (const b of (g.buffs || [])) {
        if (typeof b.amount !== 'number' || b.inherent) continue;
        const next = Math.round(b.amount * (1 + Math.random() * 0.1) * 1000) / 1000;
        if (next > b.amount) { b.amount = next; this._rungReforged = (this._rungReforged || 0) + 1; }
      }
    }
  },

  /** (conjured, silver) "what it conjures carries the affix of the piece it
   *  replaced". Called when a conjured piece is equipped over `old`. */
  _rungConjureTakesAffix(item, old) {
    if (!item || !item.conjuredBy || !old || old.conjuredBy) return;
    const a = this._rungConjurer(item.conjuredBy);
    if (!a || !a.conjureKeepsAffix) return;
    const fx = (old.effects || []).map(e => ({ ...e }));
    if (!fx.length) return;
    item.effects = [...(item.effects || []).filter(e => !e._rungAffix), ...fx.map(e => ({ ...e, _rungAffix: true }))];
    this._rungAffixKept = (this._rungAffixKept || 0) + 1;
  },

  /** (conjured, bronze) a swing that reaches nothing throws the conjured
   *  weapon at the nearest foe within 5 tiles; it comes back. */
  _rungConjureThrow(wid, weapon) {
    const p = this.player;
    const key = p.conjuredWeapons && p.conjuredWeapons.get(wid);
    const a = key ? this._rungConjurer(key) : null;
    if (!a || !a.conjureThrown) return false;
    if (this.time.now < (this._rungThrowAt || 0)) return false;
    let best = null, bd = 5 * TILE;
    for (const m of (this.monsters || [])) {
      if (!m.alive) continue;
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d <= ((weapon && weapon.range) || 60) + 8) return false;
      if (d < bd) { bd = d; best = m; }
    }
    if (!best) return false;
    this._rungThrowAt = this.time.now + 900;
    const dmg = Math.max(1, Math.round(((weapon && weapon.base) || 5) * ((p.passiveMods && p.passiveMods.dmgMult) || 1)));
    this._damageMonster(best, dmg, true, !(weapon && weapon.element), (weapon && weapon.element) || null);
    this._floatText(best.wx, best.wy - 40, 'Thrown — and back', a.color || '#ffe082');
    this._rungThrown = (this._rungThrown || 0) + 1;
    return true;
  },

  // ==========================================================================
  // STANDING
  // ==========================================================================
  /** The passive fold asks, per passive: does it count right now, and how
   *  much. Returns null to skip it, or the (maybe scaled) ability. */
  _rungStandingGate(a, key, kit) {
    if (!a) return a;
    const p = this.player;
    this._rungHasStanding = this._rungHasStanding || !!(a.worksInSoulSpace || a.doublesWhenHurt || a.unsuppressable
      || a.worksSuppressed || a.extendsToParty || a.extendsToSummons || a.extendsToMount || a.stacksWithItself);
    // Suppression shuts the kit off; these rungs keep it on.
    if (this._isSuppressed && this._isSuppressed(p) && !(a.worksSuppressed || a.unsuppressable)) {
      this._rungSuppressedOff = (this._rungSuppressedOff || 0) + 1;
      return null;
    }
    // ROUND 294 -- every passive works in the soul space (the rung that said
    // so is retired; "functioning in the soul space doesn't count").
    let k = 1;
    if (a.doublesWhenHurt && p.hp < p.maxHp * 0.5) k *= 2;
    if (a.stacksWithItself > 0 && kit) {
      const twin = Object.entries(kit).some(([k2, e]) => k2 !== key && e && e.ability
        && e.ability.kind === 'passive' && e.ability.template === a.template
        && (e.ability.buffKind || null) === (a.buffKind || null));
      if (twin) k *= 1 + a.stacksWithItself;
    }
    if (k === 1) return a;
    return scalePassive(a, k);
  },

  /** After the passive fold: the standing rungs that reach beyond you. */
  _rungStandingExtend(mods, kit) {
    mods.rungSummonDmg = 1; mods.rungSummonHp = 1; mods.rungSummonDr = 0;
    mods.rungMountSpeed = 0; mods.rungParty = null;
    for (const [key, e] of Object.entries(kit || {})) {
      const a0 = e && e.ability;
      if (!a0 || a0.kind !== 'passive') continue;
      const a = this._scaledAbility ? (this._scaledAbility(key) || a0) : a0;
      const give = passiveGives(a);
      if (a.extendsToSummons || a.unlimitedRange) {
        if (a.extendsToSummons) {
          mods.rungSummonDmg *= 1 + give.dmg;
          mods.rungSummonHp *= 1 + give.hp;
          mods.rungSummonDr = Math.min(0.6, mods.rungSummonDr + give.armor);
        }
      }
      if (a.extendsToMount) mods.rungMountSpeed += give.speed;
      if (a.extendsToParty) {
        const q = mods.rungParty || (mods.rungParty = { range: 0, dmg: 0, dr: 0, speed: 0 });
        q.range = Math.max(q.range, a.unlimitedRange ? Infinity : a.extendsToParty);
        q.dmg += give.dmg; q.dr = Math.min(0.6, q.dr + give.armor); q.speed += give.speed;
      }
      if (a.outlastsDeath) mods.rungOutlasts = Math.max(mods.rungOutlasts || 0, a.outlastsDeath);
      if (a.unsuppressable) mods.rungUnsuppressable = true;
    }
  },

  /** Companions within reach carry what a party-extending passive gives. */
  _rungShareStanding() {
    const pm = this.player && this.player.passiveMods;
    let q = pm && pm.rungParty;
    // (standing, gold) after your death, every ally carries it for its span.
    if (this._rungAfterDeath && this.time.now < this._rungAfterDeath.until) {
      q = { range: Infinity, dmg: ((q && q.dmg) || 0) + 0.1, dr: Math.min(0.6, ((q && q.dr) || 0) + 0.1), speed: (q && q.speed) || 0 };
      this._rungOutlastShared = (this._rungOutlastShared || 0) + 1;
    }
    for (const c of (this.party || [])) {
      if (!c || !c.recruited) continue;
      if (!q) { c.rungStanding = null; continue; }
      const near = q.range === Infinity || Math.hypot(c.x - this.world.x, c.y - this.world.y) <= q.range;
      c.rungStanding = near ? { dmg: q.dmg, dr: q.dr, speed: q.speed } : null;
      if (near) this._rungPartyShared = (this._rungPartyShared || 0) + 1;
    }
  },

  /** The first blow of a fight: passives that are "already working when a
   *  fight starts" arrive primed. */
  _rungFightStarts() {
    const p = this.player;
    const kit = this._liveKnown ? this._liveKnown() : (p.knownAbilities || {});
    for (const [key, e] of Object.entries(kit)) {
      const a0 = e && e.ability;
      if (!a0 || a0.kind !== 'passive') continue;
      const a = this._scaledAbility ? (this._scaledAbility(key) || a0) : a0;
      if (!a.worksOutOfCombat) continue;
      if (a.template === 'triggeredPassive' && this._fireTrigger) {
        try { this._fireTrigger(key, a, { primed: true }); } catch (err) { /* a trigger that needs a target */ }
      } else if (a.template === 'stacking') {
        p.stacks = p.stacks || {};
        const max = a.stackMax || a.maxStacks || 5;
        p.stacks[key] = { n: max, decayT: a.stackDecay || 6 };
      } else {
        (this._rungPrimed = this._rungPrimed || {})[key] = this.time.now + 5000;
      }
      this._rungPrimedCount = (this._rungPrimedCount || 0) + 1;
    }
  },

  /** A condition applied by the player: kept for "carries your afflictions". */
  _rungNotePlayerAffliction(key, dot) {
    this._rungLastAffliction = dot ? { dot } : { key };
  },
};

/** A passive at `k` times its magnitude. */
function scalePassive(a, k) {
  const out = { ...a };
  for (const f of ['amount', 'moveSpeedPct', 'cooldownReduction', 'reflectFrac', 'reflectChance', 'thornsFrac',
    'weaponDmgPct', 'damageReduction', 'armorBonus', 'critChance', 'critDamage', 'regenPerSec', 'resistNonPhysical',
    'rangePct', 'attackSpeedPct', 'specialAtkPct', 'unarmedPct', 'auraRangePct', 'perceptionBoost']) {
    if (typeof out[f] === 'number') out[f] = out[f] * k;
  }
  if (out.resist && typeof out.resist.amount === 'number') out.resist = { ...out.resist, amount: out.resist.amount * k };
  return out;
}

/** What a passive gives, in the three terms a companion or a summon can use. */
function passiveGives(a) {
  const g = { dmg: 0, hp: 0, armor: 0, speed: 0 };
  if (a.template === 'passiveBuff') {
    if (a.buffKind === 'dmg') g.dmg += a.amount || 0;
    else if (a.buffKind === 'maxHp') g.hp += a.amount || 0;
    else if (a.buffKind === 'armor') g.armor += a.amount || 0;
    else if (a.buffKind === 'crit') g.dmg += (a.amount || 0) * 0.5;
  }
  if (a.moveSpeedPct) g.speed += a.moveSpeedPct;
  if (a.damageReduction) g.armor += Math.min(0.3, (a.damageReduction || 0) / 20);
  if (a.armorBonus) g.armor += a.armorBonus;
  if (a.weaponDmgPct) g.dmg += a.weaponDmgPct;
  if (a.regenPerSec) g.hp += 0.05;
  // Every passive is worth something to whoever it reaches: the floor.
  if (!g.dmg && !g.hp && !g.armor && !g.speed) { g.dmg = 0.05; g.armor = 0.05; }
  return g;
}
