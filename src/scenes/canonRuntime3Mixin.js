// ============================================================================
// ROUND 284 -- HIS CANON ABILITIES, RUNNING (part 3): Renewal and Growth,
// Shield and Magic, Wing, and Might; and the hooks every blow on the player
// passes through.
// ============================================================================
import { conditionDef, hasTag } from '../data/debuffs.js';
import { CANON_RT, reached, rankAt, depletionRestore } from '../data/canonRuntime.js';
import { isoProject, isoDepth } from '../data/iso.js';
import { subtypeOf } from '../data/monsters.js';

const rankPow = (rank) => 1 + 0.5 * rankAt(rank);
/** "Requires a heavy weapon." */
export const HEAVY_WEAPON_BASES = new Set(['hammer', 'axe', 'scythe']);
/** "Damages certain targets that are inimical to life force, such as most
 *  forms of undead." */
const INIMICAL_TO_LIFE = new Set(['undead']);
/** The canon weapons the conjure reconcile builds, and what each is built on. */
export const CANON_WEAPONS = {
  razorWingSword: { base: 'sword', name: 'Razor-Wing Sword', color: '#b0bec5' },
  // "Conjures a huge sword in the shape of a dragon's wing." Two hands.
  dragonWingSword: { base: 'sword', name: 'Dragon Wing Sword', color: '#ff7043', baseMult: 1.6, forceHands: 2, heavy: true },
  bladeOfDoom: { base: 'sword', name: 'Ruin, the Blade of Tribulation', color: '#6a1b9a' },
};

export const CanonRuntime3Mixin = {
  // ==========================================================================
  // CONJURED WEAPONS
  // ==========================================================================
  /** The weapon def a canon conjuration is built as (called from the
   *  conjure reconcile). */
  _canonWeaponDef(a, key, WEAPONS) {
    const cw = CANON_WEAPONS[a.canonKey];
    if (!cw || !WEAPONS[cw.base]) return null;
    const b = WEAPONS[cw.base];
    const def = {
      ...b, id: `conjured:${key}`, baseId: cw.base, name: cw.name, color: cw.color,
      conjured: true, conjuredBy: key, canonKey: a.canonKey,
      base: Math.round(b.base * (cw.baseMult || 1) * rankPow(this._canonRankOf(key))),
    };
    if (cw.forceHands) def.forceHands = cw.forceHands;
    if (cw.heavy) def.heavy = true;
    return def;
  },
  /** Cast: make sure it exists, and take it in hand. */
  _canonConjureAndWield(a, key) {
    const wid = `conjured:${key}`;
    if (!this._conjuredWeaponDefs || !this._conjuredWeaponDefs[wid]) this._reconcileConjuredItems && this._reconcileConjuredItems();
    if (a.canonKey === 'bladeOfDoom') this._refreshBladeForm();
    if (!this.player.ownedWeapons.has(wid)) { this._canonSay(`${a.name} — nothing answers`); return false; }
    const p = this.player;
    if (p.hands.right !== wid && p.hands.left !== wid) {
      this._equipWeaponHand(wid, 'right');
      if (this._isTwoHanded(wid)) p.hands.left = null;
    }
    this._floatText(this.world.x, this.world.y - 46, (this._weaponDef(wid) || {}).name || a.name, a.color || '#ffffff');
    this._recomputeDerivedStats();
    return true;
  },
  /** Is a heavy weapon in hand? */
  _canonHeavyInHand() {
    const h = this.player.hands || {};
    for (const wid of [h.right, h.left]) {
      if (!wid) continue;
      const d = this._weaponDef(wid);
      if (!d) continue;
      if (d.heavy || HEAVY_WEAPON_BASES.has(d.baseId || d.id)) return true;
    }
    return false;
  },
  /** Is this canon weapon in hand? */
  _canonWielding(ck) {
    const h = this.player.hands || {};
    for (const wid of [h.right, h.left]) {
      const d = wid && this._weaponDef(wid);
      if (d && d.canonKey === ck) return d;
    }
    return null;
  },

  // ==========================================================================
  // RENEWAL AND GROWTH
  // ==========================================================================
  /** Life Bolt: "Delivers life energy though a projectile, giving a small
   *  burst of instantaneous healing. Damages certain targets that are
   *  inimical to life force, such as most forms of undead." At an ally if one
   *  is chosen, at an undead enemy if that is the target, else at yourself. */
  _canon_lifeBolt(a, key, rank) {
    const rt = CANON_RT.lifeBolt;
    const pow = this._canonPow(a, rank);
    const enemy = this._canonTarget(rt.range);
    if (enemy && INIMICAL_TO_LIFE.has(subtypeOf(enemy))) {
      this._canonBolt(a, key, rank, enemy, { heal: 0, dmg: rt.undeadDmg * pow, element: 'radiant' });
      return;
    }
    const ally = this._targets && this._targets.ally ? this._canonAlly(rt.range) : null;
    if (ally) {
      // The bolt to a friend lands where it is thrown; drawn as the line it
      // flies along.
      if (this._drawLegendaryBeam) this._drawLegendaryBeam({ wx: ally.x, wy: ally.y }, a.color || '#a5d6a7', 0, rt.range, true);
      this._canonLifeHeal(ally, rt.heal * pow, rank);
      return;
    }
    this._canonLifeHeal(null, rt.heal * pow, rank);
  },
  /** The heal landing, on an ally or on the player. */
  _canonLifeHeal(ally, amount, rank) {
    const rt = CANON_RT.lifeBolt;
    if (ally && ally.kind === 'party') {
      const m = ally.ref;
      m.hp = Math.min(m.maxHp, m.hp + amount);
      if (reached(rank, 'bronze')) m.canonHot = { perSec: rt.hotPerSec * rankPow(rank), t: rt.hotSecs };
      this._floatText(m.x, m.y - 30, `+${Math.round(amount)}`, '#a5d6a7');
    } else if (ally && ally.kind === 'summon') {
      const s = ally.ref;
      s.hp = Math.min(s.maxHp || s.hp, s.hp + amount);
    } else {
      this._healPlayer(Math.round(amount), { quiet: false });
      // Bronze: "Bestows a mild, ongoing healing effect."
      if (reached(rank, 'bronze')) this._applyHot({ kind: 'player' }, rt.hotPerSec * rankPow(rank), rt.hotSecs);
    }
    this._lifeBoltHeals = (this._lifeBoltHeals || 0) + 1;
  },
  /** A canon bolt: a projectile that remembers what threw it. */
  _canonBolt(a, key, rank, target, fx) {
    const rt = CANON_RT[a.canonKey] || {};
    const speed = rt.speed || 300;
    const ang = Math.atan2(target.wy - this.world.y, target.wx - this.world.x);
    const p = isoProject(this.world.x, this.world.y);
    const color = parseInt(String(a.color || '#a5d6a7').replace('#', '').slice(0, 6), 16);
    const sprite = this.add.circle(p.x, p.y, 6, color);
    sprite.setDepth(isoDepth(this.world.x, this.world.y) + 100000);
    const dist = Math.hypot(target.wx - this.world.x, target.wy - this.world.y);
    this.projectiles.push({
      wx: this.world.x, wy: this.world.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      homing: target.alive ? target : null, homeTurn: 6, speed, radius: 7,
      dmg: Math.max(0, Math.round(fx.dmg || 0)), life: dist / speed + 0.4, sprite,
      critChance: 0, critMult: 1, executeThreshold: 0, element: fx.element || null,
      dot: null, leech: 0, leechOverTime: null, debuff: null, fx: null, flight: null, flightT: 0,
      explodeRadius: 0, color, pierce: 1,
      physical: !!fx.physical,
      canonAbility: { ...a, _canonKnownKey: key, _canonRank: rank }, canonFx: fx,
    });
  },
  _canon_herosMoment(a, key, rank, ctx) {
    const rt = CANON_RT.herosMoment;
    const ally = ctx.ally;
    if (!ally) return;
    // "increasing all attributes and resistances by a significant amount. They
    //  receive damage reduction, their maximum mana and stamina are increased
    //  and they gain ongoing mana and stamina recovery. They ignore the effects
    //  of rank-disparity. When this effect ends, they are temporarily
    //  debilitated, suffering the inverse of all previous effects."
    const hero = { t: rt.buffSecs, tail: rt.buffSecs / 2, rank, bronze: reached(rank, 'bronze') };
    ally.ref.canonHero = hero;
    this._floatText(ally.x, ally.y - 40, "Hero's Moment", a.color || '#ffd54f');
    this._spawnRingFx(ally.x, ally.y, 60, a.color || '#ffd54f');
    this._herosMoments = (this._herosMoments || 0) + 1;
  },
  /** What Hero's Moment does to an ally's blows: more, and bronze's "essence
   *  abilities have increased effect" more again; less during the tail. */
  _canonAllyDmgMult(c) {
    const h = c && c.canonHero;
    if (!h) return 1;
    if (h.t > 0) return 1.4 * (h.bronze ? 1.2 : 1);
    if (h.tail > 0) return 0.7;
    return 1;
  },
  _canonAllyTakenMult(c) {
    const h = c && c.canonHero;
    if (!h) return 1;
    if (h.t > 0) return 0.75;
    if (h.tail > 0) return 1.3;
    return 1;
  },
  _tickCanonAllies(dt) {
    for (const x of [...(this.party || []), ...(this._summons || [])]) {
      const h = x.canonHero;
      if (h) {
        if (h.t > 0) {
          h.t -= dt;
          x.mana = Math.min(x.maxMana || x.mana || 0, (x.mana || 0) + 4 * dt);
          x.stamina = Math.min(x.maxStamina || x.stamina || 0, (x.stamina || 0) + 4 * dt);
        } else if (h.tail > 0) h.tail -= dt;
        else delete x.canonHero;
      }
      const hot = x.canonHot;
      if (hot) {
        hot.t -= dt;
        if (x.hp != null && x.maxHp) x.hp = Math.min(x.maxHp, x.hp + hot.perSec * dt);
        if (hot.t <= 0) delete x.canonHot;
      }
    }
  },

  /** Verdant Cage: laid on the target. "More effective in areas already
   *  containing plant life." */
  _canon_verdantCage(a, key, rank, ctx) {
    const rt = CANON_RT.verdantCage;
    const t = ctx.target;
    if (!t || !t.alive) return;
    const life = this._plantLifeAt ? this._plantLifeAt(t.wx, t.wy) : 0;
    const secs = rt.rootSecs * (0.75 + 0.75 * Math.max(0, Math.min(1, life)));
    const d = this._applyDebuff(t, 'verdantCage', { duration: secs, fromPlayer: true, source: this.player });
    t.rootT = Math.max(t.rootT || 0, secs);
    if (d) d.canonCage = { rank, tick: 0, life };
    (this._canonCages = this._canonCages || []).push({ m: t, rank, tick: 2, t: secs });
    this._canonLink(t, a.color || '#66bb6a');
    this._floatText(t.wx, t.wy - 34, a.name, a.color || '#66bb6a');
  },
  _tickCanonCages(dt) {
    const list = this._canonCages;
    if (!list || !list.length) return;
    const rt = CANON_RT.verdantCage;
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      c.t -= dt; c.tick -= dt;
      const m = c.m;
      if (!m || !m.alive || c.t <= 0 || !(m.debuffs && m.debuffs.verdantCage)) { list.splice(i, 1); continue; }
      if (c.tick > 0) continue;
      c.tick = 2;
      // Bronze: "Binding plants have damaging thorns."
      if (reached(c.rank, 'bronze')) this._canonHurt(m, rt.thornDmg * rankPow(c.rank), 'nature');
      // Silver: "Thorns inflict poison. The type of poison is determined by
      // the surrounding environment."
      if (reached(c.rank, 'silver')) {
        const key = this._environmentPoison ? this._environmentPoison(conditionDef('verdantCage'), m.wx, m.wy) : 'poison';
        if (key) this._canonInflict(m, key);
        this._cagePoisoned = (this._cagePoisoned || 0) + 1;
      }
    }
  },

  // ==========================================================================
  // SHIELD AND MAGIC
  // ==========================================================================
  /** Reaper's Redoubt: "Take allies into a dimensional space briefly while
   *  flooding the area with death energy". The space is untouchable time:
   *  you and your companions cannot be struck while it lasts. */
  _canon_reapersRedoubt(a, key, rank) {
    const rt = CANON_RT.reapersRedoubt;
    const p = this.player;
    const pow = this._canonPow(a, rank);
    p.canonPhase = { t: rt.phaseSecs, rank, manaLeft: reached(rank, 'bronze') ? p.maxMana * rt.manaFrac : 0 };
    p.invuln = Math.max(p.invuln || 0, rt.phaseSecs);
    for (const m of (this._activeParty ? this._activeParty() : [])) m.canonPhaseT = rt.phaseSecs;
    if (this.playerSprite) this.playerSprite.setAlpha(0.35);
    for (const m of (this.monsters || [])) {
      if (!m.alive || Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > rt.radius + ((m.type && m.type.radius) || 0)) continue;
      this._canonHurt(m, rt.disruptive * pow, 'disruptive');
      this._canonHurt(m, rt.necrotic * pow, 'necrotic');
      this._canonInflict(m, 'creepingDeath', rt.creeping);
      // Silver: "Enemies are afflicted with [Death's Grip]"
      if (reached(rank, 'silver')) this._canonInflict(m, 'deathsGrip');
    }
    this._spawnRingFx(this.world.x, this.world.y, rt.radius, a.color || '#455a64');
    this._redoubts = (this._redoubts || 0) + 1;
  },
  _tickCanonPhase(dt) {
    const p = this.player;
    const ph = p.canonPhase;
    for (const m of (this.party || [])) if (m.canonPhaseT > 0) m.canonPhaseT -= dt;
    if (!ph) return;
    ph.t -= dt;
    // Bronze: "Allies undergo extreme mana replenishment while in the
    // dimensional space."
    if (ph.manaLeft > 0) {
      const give = Math.min(ph.manaLeft, (ph.manaLeft / Math.max(0.1, ph.t + dt)) * dt);
      ph.manaLeft -= give;
      p.mana = Math.min(p.maxMana, p.mana + give);
      for (const m of (this._activeParty ? this._activeParty() : [])) if (m.maxMana) m.mana = Math.min(m.maxMana, (m.mana || 0) + give);
    }
    if (ph.t <= 0) {
      p.canonPhase = null;
      if (this.playerSprite) this.playerSprite.setAlpha(1);
    }
  },

  /** Crystallise Mana: one more crystal each cast, up to the rank's count --
   *  round 234's crystals, finally given a caster. */
  _canon_crystalliseMana(a, key, rank) {
    const rt = CANON_RT.crystalliseMana;
    const byRank = (a.crystals && a.crystals.byRank) || { iron: 1, bronze: 3, silver: 5, gold: 5 };
    const max = byRank[rank] || 1;
    const p = this.player;
    let b = p.buffs.manaCrystals;
    // Silver: "Absorbed projectiles can be redirected at enemies" -- a cast
    // with every crystal up throws one back.
    if (b && reached(rank, 'silver') && (b.crystals || []).some(c => c.stored)) {
      if (this._redirectCrystal()) return;
    }
    const have = b ? (b.count || 1) : 0;
    const count = Math.min(max, have + 1);
    p.buffs.manaCrystals = b = {
      ...(b || {}), t: 1e9, dispellable: true, count, max: count,
      regenPerSec: rt.regenPerSec * rankPow(rank), burstMana: rt.burstMana, inactiveSeconds: rt.inactiveSeconds,
      intercepts: reached(rank, 'bronze'), absorbs: reached(rank, 'silver'), absorbFrac: 1, convertPerSec: rt.convertPerSec,
    };
    this._crystalState && this._crystalState();
    this._floatText(this.world.x, this.world.y - 46, `${a.name} (${count})`, a.color || '#80deea');
  },

  /** Burst Shield: "Create a short-lived shield that negates an incoming
   *  attack and explodes out". */
  _canon_burstShield(a, key, rank) {
    const rt = CANON_RT.burstShield;
    this.player.canonBurst = { t: rt.shieldSecs, rank, strikes: 1, a };
    this._floatText(this.world.x, this.world.y - 46, a.name, a.color || '#4fc3f7');
  },
  /** The blow meets the shield. Returns what gets through. */
  _burstShieldTakes(m, dmg) {
    const sh = this.player.canonBurst;
    if (!sh || sh.t <= 0) return dmg;
    const rt = CANON_RT.burstShield;
    // "High-damage attacks of silver-rank or higher may not be entirely
    //  negated."
    let left = 0;
    const tier = this._monsterRankIndex ? this._monsterRankIndex(m) : 0;
    if (tier >= 3 && dmg > this.player.maxHp * 0.25) left = Math.round(dmg * rt.silverPassFrac);
    // [Slow Learner]: "Attacking a barrier while subject to this affliction
    // extends the duration of the barrier and allows it to block an
    // additional attack."
    if (this._feedBarrier) this._feedBarrier(m, sh);
    sh.strikes -= 1;
    if (sh.strikes <= 0) {
      this.player.canonBurst = null;
      this._burstShieldExplodes(sh);
    }
    this._burstNegated = (this._burstNegated || 0) + 1;
    return left;
  },
  _burstShieldExplodes(sh) {
    const rt = CANON_RT.burstShield;
    const pow = this._canonPow(sh.a, sh.rank);
    for (const m of (this.monsters || [])) {
      if (!m.alive) continue;
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d > rt.radius + ((m.type && m.type.radius) || 0)) continue;
      // "knocking back nearby enemies and inflicting concussive damage"
      this._canonHurt(m, rt.dmg * pow, 'resonating');
      const ang = Math.atan2(m.wy - this.world.y, m.wx - this.world.x);
      const push = rt.knockback * (1 - (this._momentumResist ? this._momentumResist(m) : 0));
      m.wx += Math.cos(ang) * push; m.wy += Math.sin(ang) * push;
      if (reached(sh.rank, 'bronze')) this._canonInflict(m, 'vibrantEcho');
      if (reached(sh.rank, 'silver')) this._canonInflict(m, 'slowLearner');
    }
    this._spawnRingFx(this.world.x, this.world.y, rt.radius, (sh.a && sh.a.color) || '#4fc3f7');
    this._burstExplosions = (this._burstExplosions || 0) + 1;
  },

  // ==========================================================================
  // WING
  // ==========================================================================
  _canon_razorWingSword(a, key, rank) {
    const rt = CANON_RT.razorWingSword;
    // Bronze: "Feathers from the wing sword can be used as projectiles." A
    // cast with the sword already in hand throws them.
    if (reached(rank, 'bronze') && this._canonWielding('razorWingSword')) {
      const p = this.player;
      if (p.stamina < rt.featherCost) { this._canonSay('Winded!'); return; }
      p.stamina -= rt.featherCost;
      const t = this._canonTarget(300);
      const base = t ? Math.atan2(t.wy - this.world.y, t.wx - this.world.x) : (p.aimAngle || 0);
      for (let i = 0; i < rt.feathers; i++) {
        const ang = base + (i - (rt.feathers - 1) / 2) * 0.18;
        const aim = { wx: this.world.x + Math.cos(ang) * 300, wy: this.world.y + Math.sin(ang) * 300 };
        this._canonBolt({ ...a, color: '#cfd8dc' }, key, rank, aim, { dmg: rt.featherDmg * this._canonPow(a, rank), element: null, physical: true });
      }
      this._feathersThrown = (this._feathersThrown || 0) + rt.feathers;
      return;
    }
    this._canonConjureAndWield(a, key);
  },
  /** "Movement powers are enhanced while wielding it." */
  _canonMoveBonus() {
    // ROUND 288 -- and Avatar of Speed: "Your movement abilities have increased effect."
    return (this._canonWielding('razorWingSword') ? CANON_RT.razorWingSword.moveBonus : 0) + (this._canonMoveEffect5 ? this._canonMoveEffect5() : 0);
  },

  /** Flying Leap: a leap along the aim, opening round 234's combination
   *  window. */
  _canon_flyingLeap(a, key, rank) {
    const rt = CANON_RT.flyingLeap;
    const dist = rt.dist * (1 + this._canonMoveBonus());
    const moved = this._canonLeap(dist, this.player.aimAngle || 0, a);
    const byRank = a.combinationByRank || {};
    const c = byRank[reached(rank, 'bronze') ? 'bronze' : 'iron'] || { physical: 0.35, any: 0 };
    this._openCombination({ name: a.name, combination: { seconds: rt.window, physical: c.physical, any: c.any } });
    this.player.buffs.combination.movement = true;
    this._flyingLeaps = (this._flyingLeaps || 0) + (moved ? 1 : 0);
  },
  /** Move along an angle until something stops it. Returns the distance
   *  covered. `through` lets it pass bodies (Dive Bomb's silver). */
  _canonLeap(dist, ang, a) {
    const sx = this.world.x, sy = this.world.y;
    let best = null;
    for (let d = 8; d <= dist; d += 8) {
      const nx = sx + Math.cos(ang) * d, ny = sy + Math.sin(ang) * d;
      if (this._collidesObstacle(nx, ny, 12) || this._isWaterAt(nx, ny)) break;
      // ROUND 286 -- a leap goes DOWN off any ledge (it is a leap), never up
      // a cliff.
      if (this._elev && this._elev.box) {
        const px = best ? best.nx : sx, py = best ? best.ny : sy;
        if (!this._elev.stepAllowed(px, py, nx, ny, true)) break;
      }
      best = { nx, ny, d };
    }
    if (!best) return 0;
    this.world.x = best.nx; this.world.y = best.ny;
    if (this._updatePlayerSprite) this._updatePlayerSprite(false);
    const pf = this._pendingMoveFx;
    this._pendingMoveFx = null;
    if (pf && pf.family === 'dashstreak' && this._playStreakFx) this._playStreakFx(pf, sx, sy, best.nx, best.ny);
    return best.d;
  },

  /** Dive Bomb: "Accelerate down to attack a target from above; can be
   *  combined with normal or special melee attacks." */
  _canon_diveBomb(a, key, rank, ctx) {
    const rt = CANON_RT.diveBomb;
    const t = ctx.target;
    if (!t || !t.alive) return;
    const sx = this.world.x, sy = this.world.y;
    const ang = Math.atan2(t.wy - sy, t.wx - sx);
    const dist = Math.max(0, Math.hypot(t.wx - sx, t.wy - sy) - 28);
    const pow = this._canonPow(a, rank);
    // Silver: "Striking enemies and obstacles other than the designated target
    // does not end this ability unless the attack's momentum is fully
    // arrested." Everything on the line is struck on the way down.
    if (reached(rank, 'silver')) {
      for (const m of (this.monsters || [])) {
        if (!m.alive || m === t) continue;
        const L = Math.hypot(t.wx - sx, t.wy - sy) || 1;
        const u = ((m.wx - sx) * (t.wx - sx) + (m.wy - sy) * (t.wy - sy)) / (L * L);
        if (u < 0 || u > 1) continue;
        if (Math.hypot(sx + u * (t.wx - sx) - m.wx, sy + u * (t.wy - sy) - m.wy) <= 30) this._canonHurt(m, rt.pathDmg * pow, 'physical');
      }
      this.world.x = sx + Math.cos(ang) * dist; this.world.y = sy + Math.sin(ang) * dist;
      if (this._updatePlayerSprite) this._updatePlayerSprite(false);
    } else {
      this._canonLeap(dist, ang, a);
    }
    // "Physical damage from these attacks is increased." Silver: "All damage
    // from melee weapons and melee special attacks combined with this
    // ability is increased, regardless of damage type."
    this._openCombination({ name: a.name, combination: { seconds: rt.window, physical: rt.physical, any: reached(rank, 'silver') ? rt.any : 0 } });
    this.player.buffs.combination.movement = true;
    // "No falling damage is suffered when using this ability, even if the
    //  attack misses." (No fall in this world to suffer.)
    // Bronze: "A resonating-force shockwave is produced from the impact point."
    if (reached(rank, 'bronze')) {
      for (const m of (this.monsters || [])) {
        if (m.alive && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= rt.shockRadius + ((m.type && m.type.radius) || 0)) {
          this._canonHurt(m, rt.shockDmg * pow, 'resonating');
        }
      }
      this._spawnRingFx(this.world.x, this.world.y, rt.shockRadius, a.color || '#90caf9');
    }
    this._diveBombs = (this._diveBombs || 0) + 1;
  },

  _canon_dragonWingSword(a, key, rank) {
    this._canonConjureAndWield(a, key);
  },
  /** "Special attacks with the movement subtype performed with this weapon
   *  inflict additional damage." Bronze: "Normal and special attacks made
   *  with this weapon inflict fire damage and inflict the [Burning]
   *  condition." */
  _dragonSwordHit(weapon, m, special, rank, baseDmg) {
    const rt = CANON_RT.dragonWingSword;
    const combo = this.player.buffs.combination;
    if (combo && combo.movement && combo.t > 0) this._canonHurt(m, (baseDmg || weapon.base) * rt.movementSpecialBonus, 'physical');
    if (reached(rank, 'bronze')) {
      this._canonHurt(m, Math.max(1, (baseDmg || weapon.base) * 0.35), 'fire');
      this._canonInflict(m, 'burn');
    }
  },

  /** Dragon Wings: a toggle, paid by the second. */
  _canon_dragonWings(a, key, rank) {
    const p = this.player;
    p.canonWings = p.canonWings && p.canonWings.on ? { on: false } : { on: true, rank, buffetT: 0 };
    this._floatText(this.world.x, this.world.y - 46, p.canonWings.on ? 'Wings unfurl' : 'Wings fold away', a.color || '#ff7043');
    this._recomputeDerivedStats();
  },
  _wingsOn() {
    const w = this.player && this.player.canonWings;
    return !!(w && w.on);
  },
  /** Bronze: "allowing them to be used for crude attacks to the sides and
   *  rear." */
  _wingBuffet(dt, w) {
    const rt = CANON_RT.dragonWings;
    w.buffetT = (w.buffetT || 0) - dt;
    if (w.buffetT > 0) return;
    w.buffetT = rt.buffetEvery;
    const aim = this.player.aimAngle || 0;
    let hit = 0;
    for (const m of (this.monsters || [])) {
      if (!m.alive) continue;
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d > rt.buffetReach + ((m.type && m.type.radius) || 0)) continue;
      const rel = Math.abs(((Math.atan2(m.wy - this.world.y, m.wx - this.world.x) - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (rel < Math.PI / 3) continue;   // in front: the wings are not for that
      this._canonHurt(m, rt.buffetDmg * rankPow(w.rank || 'bronze'), 'physical');
      hit++;
    }
    this._wingBuffets = (this._wingBuffets || 0) + hit;
  },
  /** Bronze: "The wings have strong damage resistance and very strong fire
   *  resistance." They are between you and a blow from the side or behind,
   *  and a fire blow from anywhere. */
  _wingsTake(m, dmg) {
    if (!this._wingsOn()) return dmg;
    const r = this._canonHeldRank('dragonWings') || 'iron';
    if (!reached(r, 'bronze')) return dmg;
    const rt = CANON_RT.dragonWings;
    const el = m && (m.dmgElement || (m.type && m.type.element));
    if (el === 'fire') return Math.round(dmg * (1 - rt.fireDR));
    const aim = this.player.aimAngle || 0;
    const rel = Math.abs(((Math.atan2(m.wy - this.world.y, m.wx - this.world.x) - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return rel >= Math.PI / 3 ? Math.round(dmg * (1 - rt.rearDR)) : dmg;
  },
  /** What the wings, the cloak and the wing sword do to movement. */
  _canonMovement() {
    const cloak = this._cloakMoves ? this._cloakMoves() : { water: false, lava: false, speed: 0 };
    const wings = this._wingsOn();
    const m5 = this._canonMove5 ? this._canonMove5() : { water: false, speed: 0 };   // ROUND 288
    // "Manifest wings that are powerful but lack agility." Fast in a line,
    // over water and fire alike.
    return {
      water: cloak.water || wings || !!(this._instantAdeptMove && this._instantAdeptMove()) || m5.water,   // ROUND 287/288
      lava: cloak.lava || wings,
      speed: (cloak.speed || 0) + (wings ? CANON_RT.dragonWings.speed : 0) + this._canonMoveBonus() / 3 + m5.speed,
    };
  },

  // ==========================================================================
  // MIGHT
  // ==========================================================================
  _canon_immortality(a, key, rank, ctx) {
    const p = this.player;
    const rt = CANON_RT.immortality;
    if (ctx.mode && ctx.mode.id === 'purge') {
      // Silver: "Gain a long cooldown purgation ability that removes all
      // afflictions from the user ignoring any restrictions or immunities to
      // purgation."
      const map = p.debuffs || {};
      let n = 0;
      for (const k of Object.keys(map)) {
        const d = conditionDef(k);
        if (!d || d.helpful) continue;
        delete map[k]; n++;
      }
      this._recomputeDerivedStats();
      this._floatText(this.world.x, this.world.y - 50, `Purged ${n}`, '#ffd54f');
      this._immortalityPurges = (this._immortalityPurges || 0) + 1;
      return;
    }
    this._immortalityRestore(rank);
  },
  /** "Instantly restore a large portion of health, mana, and stamina. Amount
   *  restored is based on how depleted health, mana, and stamina are". */
  _immortalityRestore(rank) {
    const p = this.player;
    const rt = CANON_RT.immortality;
    const took = {};
    for (const [pool, max] of [['hp', 'maxHp'], ['mana', 'maxMana'], ['stamina', 'maxStamina']]) {
      const add = depletionRestore(p[pool], p[max], rt.restoreShare);
      const ongoing = reached(rank, 'bronze') ? depletionRestore(p[pool] + add, p[max], rt.ongoingShare) : 0;
      p[pool] = Math.min(p[max], p[pool] + add);
      took[pool] = add;
      // Bronze: "Gain ongoing health, mana, and stamina recovery effects. The
      // strength of these effects is based on how depleted health, mana, and
      // stamina are when the ability is activated."
      if (ongoing > 0) (p.canonRecovery = p.canonRecovery || {})[pool] = { perSec: ongoing / rt.ongoingSecs, t: rt.ongoingSecs };
    }
    this._floatText(this.world.x, this.world.y - 50, `Immortality +${Math.round(took.hp)} HP`, '#ffd54f');
    this._immortalityRestores = (this._immortalityRestores || 0) + 1;
    return took;
  },
  _tickCanonRecovery(dt) {
    const p = this.player;
    const r = p.canonRecovery;
    if (!r) return;
    for (const [pool, max] of [['hp', 'maxHp'], ['mana', 'maxMana'], ['stamina', 'maxStamina']]) {
      const x = r[pool];
      if (!x) continue;
      p[pool] = Math.min(p[max], p[pool] + x.perSec * dt);
      x.t -= dt;
      if (x.t <= 0) delete r[pool];
    }
  },
  /** Gold: "This ability can automatically activate to bring someone back
   *  from the dead, even reconstituting bodies that are destroyed." Kept
   *  armed while Immortality is off cooldown: the death door already reads
   *  `buffs.immortality`, and a fallen companion is raised on the spot. */
  _tickImmortalityGold() {
    const k = this._canonKeyFor('immortality');
    if (!k) return;
    const r = this._canonRankOf(k);
    const p = this.player;
    if (!reached(r, 'gold')) return;
    const ready = !(p.abilityCdByKey[k] > 0);
    if (ready && !p.buffs.immortality) p.buffs.immortality = { charges: 1, restoreFrac: CANON_RT.immortality.reviveFrac, canon: true, t: 1e9 };
    if (!ready && p.buffs.immortality && p.buffs.immortality.canon) delete p.buffs.immortality;
    if (ready) {
      for (const m of (this._activeParty ? this._activeParty() : [])) {
        if (!(m.downT > 0)) continue;
        m.downT = 0; m.hp = m.maxHp;
        const a = p.knownAbilities[k].ability;
        p.abilityCdByKey[k] = a.cooldown || 14400;
        this._floatText(m.x, m.y - 40, 'Immortality', '#ffd54f');
        this._immortalityRaised = (this._immortalityRaised || 0) + 1;
        break;
      }
    }
  },
  /** The death door spent the charge: that was the ability. */
  _immortalityRevived() {
    const k = this._canonKeyFor('immortality');
    if (!k) return;
    const a = this.player.knownAbilities[k].ability;
    this.player.abilityCdByKey[k] = a.cooldown || 14400;
    this._immortalityRestore('bronze');
  },

  /** Relentless Assault: a special strike that escalates with each quick use
   *  (round 233's streak machinery, given a caller). */
  _canon_relentlessAssault(a, key, rank) {
    // The streak was counted and the multiplier worked out by the cast door
    // (`_noteScalingCast`, `_conditionScaled`) before this runs. "Damage is of
    // the same type caused by a normal attack": the swing's own damage, raised
    // by the streak, rides the strike as a bonus of the weapon's own type.
    const spec = { ...a };
    spec.streakTiers = (a.streakTiers || []).filter((t, i) => reached(rank, i === 0 ? 'bronze' : 'silver'));
    if (!reached(rank, 'silver')) spec.streakDispel = null;
    const held = this.player.hands.right || this.player.hands.left;
    const wdef = (held && this._weaponDef(held)) || { base: 4 };
    const swing = this._legendaryBaseDmg ? this._legendaryBaseDmg(wdef) : wdef.base;
    const dm = ((this.player.passiveMods || {}).dmgMult) || 1;
    const extra = Math.max(0, swing * ((a._scaleMult || 1) - 1));
    this._lastStrikeTarget = null;
    this._canonStrike(spec, key, rank, { base: extra / dm, element: null });
    // "After a threshold of successive attacks is reached, escalating
    //  resonating-force [bronze] / disruptive-force [silver] damage is dealt
    //  with each attack" -- and at silver, boons dispelled.
    const t = this._lastStrikeTarget;
    if (t && t.alive) {
      for (const tier of this._streakTiers(spec)) this._canonHurt(t, tier.dmg * rankPow(rank), tier.element);
      if (spec.streakDispel && this._streakDispelCount) {
        const n = this._streakDispelCount(spec);
        if (n > 0 && this._dispelFrom) this._relentlessDispelled = (this._relentlessDispelled || 0) + this._dispelFrom(t, n).length;
      }
    }
    this._relentless = (this._relentless || 0) + 1;
  },

  /** Unstoppable Force: "Melee attack with massive momentum, dealing large
   *  amounts of additional resonating-force and disruptive-force damage." */
  _canon_unstoppableForce(a, key, rank) {
    const rt = CANON_RT.unstoppableForce;
    const pow = this._canonPow(a, rank);
    this._canonUnstoppable = { rank, pow, struck: [] };
    let hits = 0;
    try { hits = this._canonStrike(a, key, rank, { base: 0 }); } finally {
      const st = this._canonUnstoppable;
      this._canonUnstoppable = null;
      // Bronze: "For each enemy struck the cooldown of this ability and the
      // cost of the next use of this ability are reduced."
      if (reached(rank, 'bronze') && st.struck.length) this._payPerHitRefund(a, key, st.struck.length);
      // Silver: "Attack generates a blast wave of resonating-force and
      // disruptive-force damage originating from each enemy struck"
      if (reached(rank, 'silver')) {
        for (const from of st.struck) {
          for (const m of (this.monsters || [])) {
            if (!m.alive || m === from) continue;
            if (Math.hypot(m.wx - from.wx, m.wy - from.wy) > rt.blastRadius) continue;
            this._canonHurt(m, rt.blastDmg * pow, 'resonating');
            this._canonHurt(m, rt.blastDmg * pow, 'disruptive');
          }
          this._spawnRingFx(from.wx, from.wy, rt.blastRadius, a.color || '#ff8a65');
        }
      }
    }
    void hits;
  },
  _canonHit_unstoppableForce(a, m, rank) {
    const rt = CANON_RT.unstoppableForce;
    const st = this._canonUnstoppable;
    const pow = st ? st.pow : this._canonPow(a, rank);
    this._canonHurt(m, rt.bonusDmg * pow, 'resonating');
    this._canonHurt(m, rt.bonusDmg * pow, 'disruptive');
    const ang = Math.atan2(m.wy - this.world.y, m.wx - this.world.x);
    const push = rt.knockback * (1 - (this._momentumResist ? this._momentumResist(m) : 0));
    if (m.alive) { m.wx += Math.cos(ang) * push; m.wy += Math.sin(ang) * push; }
    if (st) st.struck.push(m);
    return null;
  },
  _canonHit_relentlessAssault(a, m) {
    this._lastStrikeTarget = m;
    return null;
  },

  // ==========================================================================
  // THE BLOW ON THE PLAYER, AND THE BOLT
  // ==========================================================================
  /** Every canon thing that stands between a blow and the player. Returns
   *  the damage left (0 = none). `shot` is true for a monster's bolt. */
  _canonMeetsBlow(m, dmg, shot) {
    if (this._hegemonyOnAttack) this._hegemonyOnAttack(m);
    if (this._canonHarmed5) this._canonHarmed5(m, dmg, shot);   // ROUND 288 -- karma counts a blow even when it is negated
    if (this.player.canonPhase && this.player.canonPhase.t > 0) return 0;
    if (this.player.canonBurst) { dmg = this._burstShieldTakes(m, dmg); if (!(dmg > 0)) return 0; }
    if (this._cloakMeetsBlow) { dmg = this._cloakMeetsBlow(m, dmg, shot); if (!(dmg > 0)) return 0; }
    dmg = this._wingsTake(m, dmg);
    if (this._canonMeetsBlow4) { dmg = this._canonMeetsBlow4(m, dmg, shot); if (!(dmg > 0)) return 0; }   // ROUND 287
    return dmg;
  },
  /** A monster's bolt, before it reaches the player: the razor-wing feathers
   *  at silver ("animated to intercept physical projectiles"). */
  _canonInterceptShot(s) {
    if (this._canonInterceptShot4 && this._canonInterceptShot4(s)) return true;   // ROUND 287
    const w = this._canonWielding('razorWingSword');
    if (!w) return false;
    const r = this._canonHeldRank('razorWingSword') || 'iron';
    if (!reached(r, 'silver')) return false;
    const src = s && s.src;
    if (src && src.type && src.type.dmgType === 'magical') return false;
    if (Math.random() >= CANON_RT.razorWingSword.interceptChance) return false;
    this._floatText(this.world.x, this.world.y - 46, 'Feathers intercept', '#cfd8dc');
    this._featherIntercepts = (this._featherIntercepts || 0) + 1;
    return true;
  },
  _tickCanonMisc(dt) {
    this._tickCanonAllies(dt);
    this._tickCanonCages(dt);
    this._tickCanonPhase(dt);
    this._tickCanonRecovery(dt);
    const b = this.player.canonBurst;
    if (b) { b.t -= dt; if (b.t <= 0) this.player.canonBurst = null; }
  },
};
