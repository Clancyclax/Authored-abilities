// ============================================================================
// ROUND 288 -- HIS THIRD PASTE, RUNNING (batch03, the movement half): Swift,
// Wind, Balance, Mystic.
//
//   "Maps need to add verticality ... This finally grants some value to
//    gliding and flying skills."
//
// Round 286 built the ledges; these are the abilities that get over them.
// Leaf on the Wind glides (and flies at silver); Cloud Step, Free Runner and
// Wind Wave take a ledge UP; Eternal Moment slows the world. Same shape as
// canonRuntime4Mixin.js: a precheck, `_canon_<key>`, a tick, named hooks.
// ============================================================================
import { conditionDef, hasTag, TAG } from '../data/debuffs.js';
import { CANON_RT, reached, rankAt } from '../data/canonRuntime.js';
import { isoDepth } from '../data/iso.js';
import { subtypeOf, monsterThreatTier } from '../data/monsters.js';
import { CANON_CAST_KEYS } from './canonRuntimeMixin.js';

export const CANON5_CAST_KEYS = [
  'avatarOfSpeed', 'betweenTheRaindrops', 'eternalMoment', 'windBlade', 'leafOnTheWind', 'windWave',
  'equilibrium', 'cloudStep', 'momentOfOneness', 'manaTide', 'eldritchImbalance', 'denyTheReaper', 'mirageStep',
];
for (const k of CANON5_CAST_KEYS) CANON_CAST_KEYS.add(k);
export const CANON5_PASSIVE_KEYS = [
  'freeRunner', 'alacritysReward', 'cleansingBreeze', 'childOfTheCelestialWind', 'karmicWarrior',
  'strongSoul', 'sightBeyondSight', 'immortalFist', 'radiantFist',
];

const rankPow = (rank) => 1 + 0.5 * rankAt(rank);
/** "curses, diseases, magic afflictions, poisons and unholy afflictions" */
const BREEZE_TAGS = ['curse', 'disease', 'magic', 'poison', 'unholy'];
/** Canon movement abilities, for Avatar of Speed. */
const MOVE_KEYS = new Set(['flyingLeap', 'diveBomb', 'cloudStep', 'mirageStep', 'windWave', 'pathOfShadows', 'baitAndSwitch', 'leafOnTheWind', 'momentOfOneness']);
const isMoveAbility = (a) => !!a && (MOVE_KEYS.has(a.canonKey) || a.template === 'dash' || a.template === 'teleport' || a.category === 'movement');
/** Wind-related and dimension abilities, for Child of the Celestial Wind. */
const WIND_KEYS = new Set(['windBlade', 'windWave', 'leafOnTheWind', 'cleansingBreeze']);

export const CanonRuntime5Mixin = {
  // ==========================================================================
  // SMALL THINGS
  // ==========================================================================
  _c5() {
    if (!this._c5State) this._c5State = { moving: false, speed: 0, turnT: 9, lastAng: null, lastDry: null, wetStillT: 0, mists: [], images: [], lastSwingT: -9, combo: 0, comboT: 0, dropT: 0, dropLevels: 0, lastH: 0 };
    return this._c5State;
  },
  _c5Held(ck) {
    if (!this._canonPassiveOn(ck)) return null;
    return this._canonHeldRank(ck);
  },
  _c5Unarmed() { const p = this.player; return !(p.hands && (p.hands.right || p.hands.left)); },
  /** "within mist, fog or cloud": the spray at a waterfall's foot (round 286)
   *  and Cloud Step's own mist. */
  _c5InMist() {
    if (this._nearWaterfall && this._nearWaterfall(96)) return true;
    return this._c5().mists.some(m => m.t > 0 && Math.hypot(m.x - this.world.x, m.y - this.world.y) <= m.r);
  },
  _c5Charges(ck, rank) {
    const rt = CANON_RT[ck];
    const p = this.player;
    const all = p.canonCharges || (p.canonCharges = {});
    const max = rt.charges[rank] || 1;
    const c = all[ck] || (all[ck] = { n: max, t: 0 });
    if (c.n > max) c.n = max;
    c.max = max;
    return c;
  },
  _c5Step(dist, ang, climb = 1.05, water = true) {
    const sx = this.world.x, sy = this.world.y;
    let best = null;
    for (let d = 8; d <= dist; d += 8) {
      const nx = sx + Math.cos(ang) * d, ny = sy + Math.sin(ang) * d;
      if (this._collidesObstacle(nx, ny, 12)) break;
      if (!water && this._isWaterAt(nx, ny)) break;
      if (this._elev && this._elev.box) {
        const px = best ? best.nx : sx, py = best ? best.ny : sy;
        if (!this._elev.stepAllowed(px, py, nx, ny, true, null, climb)) break;
      }
      best = { nx, ny, d };
    }
    // Never finish a step standing in water you cannot walk on.
    while (best && this._isWaterAt(best.nx, best.ny) && !this._canonMovement().water) {
      const d = best.d - 8;
      if (d < 8) { best = null; break; }
      best = { nx: sx + Math.cos(ang) * d, ny: sy + Math.sin(ang) * d, d };
    }
    if (!best) return 0;
    this.world.x = best.nx; this.world.y = best.ny;
    if (this._updatePlayerSprite) this._updatePlayerSprite(false);
    return best.d;
  },

  // ==========================================================================
  // BEFORE THE COST
  // ==========================================================================
  _canonFreeRecast5(ck) {
    const p = this.player;
    if (ck === 'betweenTheRaindrops') return !!p.canonRaindrops;
    if (ck === 'leafOnTheWind') return !!p.canonLeaf;
    if (ck === 'equilibrium') return !!p.canonMeditate;
    if (ck === 'eldritchImbalance') return !!p.canonImbalance;
    if (ck === 'eternalMoment') return !!(p.canonMoment && p.canonMoment.t > 0);
    return false;
  },
  _canonPrecheck5(ck, a, rank, rt, mode, spec, key) {
    const p = this.player;
    const say = (t) => { this._canonSay(`${a.name} — ${t}`); return null; };
    switch (ck) {
      case 'eternalMoment': {
        // The price is by the second; it needs at least the first second.
        const r = CANON_RT.eternalMoment;
        if (p.mana < r.drain * 0.5 || p.stamina < r.drain * 0.5) return say('not enough mana and stamina');
        return spec;
      }
      case 'windBlade': case 'denyTheReaper': {
        const t = this._canonTarget(rt.range);
        if (!t) return say('no target');
        this._canonCtx.target = t;
        return spec;
      }
      case 'eldritchImbalance': {
        const t = this._canonTarget(rt.range);
        if (!t) return say('no target');
        this._canonCtx.target = t;
        return spec;
      }
      case 'cloudStep': {
        if (mode && mode.id === 'mist') return spec;
        // "This ability can be used while all steps are on cooldown at an
        //  extreme mana cost per step. If used within mist, fog or cloud, this
        //  ability has no cooldown." Silver: the price on cooldown is very high.
        const c = this._c5Charges('cloudStep', rank);
        if (this._c5InMist()) { this._canonCtx.mist = true; return spec; }
        if (c.n <= 0) {
          const amt = reached(rank, 'silver') ? rt.onCdSilver : rt.onCdExtreme;
          spec.cost = { type: 'mana', amount: amt }; spec.costs = null;
          this._canonCtx.overdraw = true;
        }
        return spec;
      }
      case 'mirageStep': {
        const c = this._c5Charges('mirageStep', rank);
        if (c.n <= 0) return say(`${Math.ceil(c.t)}s`);
        if (this._canonTeleportShut()) return null;
        return spec;
      }
      case 'avatarOfSpeed': {
        if (!reached(rank, 'silver')) return say('held (its silver rung is the press)');
        const left = (p.canonCd || {}).avatarReset || 0;
        if (left > 0) return say(`${Math.ceil(left)}s`);
        return spec;
      }
      case 'manaTide': return spec;
      default: return spec;
    }
  },

  // ==========================================================================
  // SWIFT
  // ==========================================================================
  /** Avatar of Speed silver: "Reset the cooldown of all your movement
   *  abilities. This effect has a cooldown equal to total time negated from
   *  the cooldowns of all affected abilities." */
  _canon_avatarOfSpeed(a, key, rank) {
    const p = this.player;
    let negated = 0;
    for (const [k, e] of Object.entries(p.knownAbilities || {})) {
      if (!e || !e.ability || !isMoveAbility(e.ability)) continue;
      negated += p.abilityCdByKey[k] || 0;
      p.abilityCdByKey[k] = 0;
    }
    for (const ck of ['cloudStep', 'mirageStep']) {
      const c = p.canonCharges && p.canonCharges[ck];
      if (c && c.n < (c.max || 1)) { negated += (c.max - c.n) * (CANON_RT[ck].recharge[rank] || CANON_RT[ck].recharge || 15); c.n = c.max; c.t = 0; }
    }
    (p.canonCd = p.canonCd || {}).avatarReset = negated;
    this._canonSay(`Movement ready (${Math.round(negated)}s)`, '#ffd54f');
    this._avatarResets = (this._avatarResets || 0) + 1;
  },

  /** Between the Raindrops: a toggle, paid by the second. */
  _canon_betweenTheRaindrops(a, key, rank, ctx) {
    const p = this.player;
    if (ctx.free) { p.canonRaindrops = null; this._canonSay('Between the Raindrops — off', '#81d4fa'); return; }
    p.canonRaindrops = { rank };
    this._canonSay('Between the Raindrops', '#81d4fa');
  },

  /** Eternal Moment: "Operate at a highly accelerated speed for one second of
   *  actual time" -- the world slows around you for 1, 2 or 3 seconds, and
   *  the price runs by the second. */
  _canon_eternalMoment(a, key, rank, ctx) {
    const p = this.player;
    if (ctx.free) { p.canonMoment = null; return; }
    const rt = CANON_RT.eternalMoment;
    p.canonMoment = { t: rt.secs[rank] || 1, rank };
    this._canonSay('Eternal Moment', '#e1f5fe');
    this._eternalMoments = (this._eternalMoments || 0) + 1;
  },
  /** The multiplier on everyone else's clock. */
  _worldTimeScale() {
    const m = this.player && this.player.canonMoment;
    return m && m.t > 0 ? CANON_RT.eternalMoment.scale : 1;
  },

  // ==========================================================================
  // WIND
  // ==========================================================================
  /** Wind Blade: "a cutting projectile of air". Bronze: longer as it flies,
   *  and it tracks. Silver: "Blades explode on impact, detonating a horizontal
   *  ring of cutting force from each penetrated enemy." */
  _canon_windBlade(a, key, rank, ctx) {
    const rt = CANON_RT.windBlade;
    const t = ctx.target;
    if (!t) return;
    const pow = this._canonPow(a, rank) * this._celestialWind(a);
    this._canonBolt(a, key, rank, t, { dmg: rt.dmg * pow, element: null, physical: true });
    const pr = this.projectiles[this.projectiles.length - 1];
    if (pr) {
      if (!reached(rank, 'bronze')) pr.homing = null;
      else pr.growBlade = true;
      pr.pierce = reached(rank, 'silver') ? 3 : 1;
      pr.speed = rt.speed;
      if (pr.sprite && pr.sprite.setScale) pr.sprite.setScale(1.2, 0.5);
    }
  },
  _canonHit_windBlade(a, m, rank) {
    const rt = CANON_RT.windBlade;
    const pow = this._canonPow(a, rank);
    if (reached(rank, 'silver')) {
      for (const o of (this.monsters || [])) {
        if (!o.alive || o === m || Math.hypot(o.wx - m.wx, o.wy - m.wy) > rt.ringRadius) continue;
        this._canonHurt(o, rt.dmg * rt.ringFrac * pow, 'physical');
      }
      if (this._spawnRingFx) this._spawnRingFx(m.wx, m.wy, rt.ringRadius, '#e0f7fa');
      this._windRings = (this._windRings || 0) + 1;
    }
    this._celestialWindHit(m);
    return null;
  },

  /** Leaf on the Wind: glide (iron), fly (silver), paid by the second. */
  _canon_leafOnTheWind(a, key, rank, ctx) {
    const p = this.player;
    if (ctx.free) { p.canonLeaf = null; this._canonSay('Leaf on the Wind — landed', '#b2dfdb'); return; }
    p.canonLeaf = { rank, fly: !!(ctx.mode && ctx.mode.id === 'fly') };
    this._canonSay(p.canonLeaf.fly ? 'Flying' : 'Gliding', '#b2dfdb');
  },
  /** A glide source (elevationMixin `_canGlideNow`). */
  _canonGlide5() {
    const p = this.player;
    return !!(p && p.canonLeaf);
  },

  /** Wind Wave: "a powerful blast of air that can push away enemies and
   *  physical projectiles. Can be used to launch into the air or move rapidly
   *  while already airborne." Bronze: magical projectiles too. Silver's Wave. */
  _canon_windWave(a, key, rank, ctx) {
    const rt = CANON_RT.windWave;
    const p = this.player;
    const ang = p.aimAngle || 0;
    const boost = this._celestialWind(a);
    const sx = this.world.x, sy = this.world.y;
    if (ctx.mode && ctx.mode.id === 'wave') {
      // "The strength of the wave can be amplified by dropping from a high
      //  altitude ... User suffers no damage from ground impacts."
      const st = this._c5();
      const drop = st.dropT > 0 ? st.dropLevels : 0;
      const push = rt.wavePush * boost * (1 + drop * rt.dropMult);
      for (const m of (this.monsters || [])) {
        if (!m.alive) continue;
        const dx = m.wx - sx, dy = m.wy - sy, d = Math.hypot(dx, dy) || 1;
        if (d > rt.waveRadius) continue;
        this._c4Shove(m, dx / d, dy / d, push * (1 - d / (rt.waveRadius * 1.5)));
        this._celestialWindHit(m);
      }
      this._clearShots5(sx, sy, rt.waveRadius, reached(rank, 'bronze'));
      if (this._spawnRingFx) this._spawnRingFx(sx, sy, rt.waveRadius, '#e0f7fa');
      this._windWaves = (this._windWaves || 0) + 1;
      this._windWaveDrop = drop;
      return;
    }
    let pushed = 0;
    for (const m of (this.monsters || [])) {
      if (!m.alive) continue;
      const dx = m.wx - sx, dy = m.wy - sy, d = Math.hypot(dx, dy) || 1;
      if (d > rt.cone) continue;
      let da = Math.atan2(dy, dx) - ang;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      if (Math.abs(da) > rt.arc) continue;
      this._c4Shove(m, dx / d, dy / d, rt.push * boost);
      this._celestialWindHit(m);
      pushed++;
    }
    this._clearShots5(sx, sy, rt.cone, reached(rank, 'bronze'), ang, rt.arc);
    // Airborne (gliding): a rapid move along the aim. On the ground: a
    // launch, the other way from the blast, that can land a level up.
    if (this._canGlideNow && this._canGlideNow()) this._c5Step(rt.airDash, ang, 0, true);
    else if (ctx.mode) this._c5Step(rt.hop, ang + Math.PI, 1.05, false);
    this._windBlasts = (this._windBlasts || 0) + 1;
    this._windPushed = pushed;
  },
  /** Remove the monster shots a blast of wind takes: physical ones, and
   *  magical ones at bronze. */
  _clearShots5(x, y, r, magical, ang = null, arc = Math.PI) {
    const shots = this._monsterShots || [];
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const dx = s.wx - x, dy = s.wy - y, d = Math.hypot(dx, dy);
      if (d > r) continue;
      if (ang !== null) {
        let da = Math.atan2(dy, dx) - ang;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        if (Math.abs(da) > arc) continue;
      }
      const isMagic = !!(s.element || (s.src && s.src.type && s.src.type.dmgType === 'magical'));
      if (isMagic && !magical) continue;
      if (s.sprite && s.sprite.destroy) s.sprite.destroy();
      shots.splice(i, 1);
      this._windDeflected = (this._windDeflected || 0) + 1;
    }
  },
  /** Child of the Celestial Wind bronze: "All your dimension and wind-related
   *  abilities have increased effect." */
  _celestialWind(a) {
    const r = this._c5Held('childOfTheCelestialWind');
    if (!r || !reached(r, 'bronze') || !a) return 1;
    const wind = WIND_KEYS.has(a.canonKey) || /dimension|wind/i.test(String((a.canonKey && '') || a.element || ''));
    return wind ? 1 + CANON_RT.childOfTheCelestialWind.windBonus : 1;
  },
  /** ...and "enemies subjected to your wind-related abilities suffer
   *  disruptive-force damage." */
  _celestialWindHit(m) {
    const r = this._c5Held('childOfTheCelestialWind');
    if (!r || !reached(r, 'bronze') || !m || !m.alive) return;
    this._canonHurt(m, CANON_RT.childOfTheCelestialWind.windDisruptive * rankPow(r), 'disruptive');
  },

  // ==========================================================================
  // BALANCE
  // ==========================================================================
  /** Equilibrium: "Meditate to slowly accrue instances of [Integrity], up to
   *  an instance threshold based on the [Recovery] attribute. Instances
   *  quickly drop off when meditation ends." Pressed to sit; moving stands. */
  _canon_equilibrium(a, key, rank, ctx) {
    const p = this.player;
    if (ctx.free) { p.canonMeditate = null; return; }
    p.canonMeditate = { rank, t: 0, x: this.world.x, y: this.world.y };
    this._canonSay('Meditating', '#a5d6a7');
  },

  /** Cloud Step: "Take a single step on air as if it were solid ground,
   *  becoming intangible for a brief moment." A step that takes a ledge up or
   *  a gap of water, and a moment nothing can touch. */
  _canon_cloudStep(a, key, rank, ctx) {
    const rt = CANON_RT.cloudStep;
    const p = this.player;
    if (ctx.mode && ctx.mode.id === 'mist') {
      // Bronze: "a short-lived mist ... The mist is too thin to obscure
      // vision." Silver: wider and longer.
      const sil = reached(rank, 'silver');
      this._c5().mists.push({ x: this.world.x, y: this.world.y, t: sil ? rt.mistSilver : rt.mistSecs, r: sil ? rt.mistSilverRadius : rt.mistRadius });
      if (this._spawnRingFx) this._spawnRingFx(this.world.x, this.world.y, sil ? rt.mistSilverRadius : rt.mistRadius, '#eceff1');
      return;
    }
    const c = this._c5Charges('cloudStep', rank);
    if (!ctx.mist && !ctx.overdraw) { c.n = Math.max(0, c.n - 1); if (c.t <= 0) c.t = rt.recharge; }
    const moved = this._c5Step(rt.dist, p.aimAngle || 0, 1.05, true);
    const inMist = !!ctx.mist;
    const secs = inMist && reached(rank, 'silver') ? rt.intangibleMist : rt.intangible;
    p.invuln = Math.max(p.invuln || 0, secs);
    p.canonIntangible = { t: secs, rank, after: reached(rank, 'bronze') ? rt.reduceAfter : 0 };
    this._cloudSteps = (this._cloudSteps || 0) + (moved ? 1 : 0);
  },

  /** Moment of Oneness: "Become immune to all damage and afflictions for 1
   *  second. The next melee attack within four seconds inflicts all damage and
   *  afflictions on the struck enemy. If no enemies are attacked, the damage
   *  and conditions are suffered retroactively." */
  _canon_momentOfOneness(a, key, rank) {
    const rt = CANON_RT.momentOfOneness;
    this.player.canonOneness = { immuneT: rt.immune, windowT: rt.immune + rt.window, dmg: 0, conds: [] };
    this._canonSay('Oneness', '#fff9c4');
  },

  /** Deny the Reaper: "Target enemy suffers a small amount of transcendent
   *  damage and you are healed for a small amount. As a counter-execute
   *  effect, the damage and healing scale exponentially with your own level
   *  of injury." */
  _canon_denyTheReaper(a, key, rank, ctx) {
    const rt = CANON_RT.denyTheReaper;
    const t = ctx.target;
    if (!t || !t.alive) return;
    const p = this.player;
    const injury = Math.max(0, Math.min(1, 1 - p.hp / Math.max(1, p.maxHp)));
    const k = Math.exp(rt.curve * injury) * this._canonPow(a, rank);
    this._canonHurt(t, rt.dmg * k, 'transcendent');
    this._healPlayer(rt.heal * k);
    if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, '#fff9c4', 0, rt.range, true);
    this._denyScale = +k.toFixed(2);
  },

  /** Mana Tide: "Draw mana from the astral to replenish allies. Mana recovery
   *  begins slowly and escalates over time." Bronze: spending mana raises it.
   *  Silver: mana spent makes what it bought stronger. */
  _canon_manaTide(a, key, rank) {
    const rt = CANON_RT.manaTide;
    this.player.canonTide = { t: rt.secs, age: 0, rank, spent: 0, lastMana: this.player.mana };
    if (this._spawnRingFx) this._spawnRingFx(this.world.x, this.world.y, rt.radius, '#9fa8da');
  },

  /** Eldritch Imbalance: a channel that draws the target's mana (every
   *  creature here carries a notional pool), or at silver the instant
   *  withering execute that "scales with low mana instead of low health". */
  _canon_eldritchImbalance(a, key, rank, ctx) {
    const rt = CANON_RT.eldritchImbalance;
    const p = this.player;
    if (ctx.free) { p.canonImbalance = null; this._canonSay('Channel released', '#9fa8da'); return; }
    const t = ctx.target;
    if (!t || !t.alive) return;
    if (t.canonMana == null) t.canonMana = 1;
    if (ctx.mode && ctx.mode.id === 'instant') {
      const low = 1 - Math.max(0, Math.min(1, t.canonMana));
      this._canonHurt(t, rt.instantDmg * Math.exp(rt.instantCurve * low) * this._canonPow(a, rank), 'necrotic');
      this._imbalanceInstant = (this._imbalanceInstant || 0) + 1;
      return;
    }
    p.canonImbalance = { target: t, rank, tick: rt.imbalanceEvery, a };
  },

  // ==========================================================================
  // MYSTIC
  // ==========================================================================
  /** Mirage Step: "Move instantaneously to a nearby location, leaving an
   *  afterimage behind." Bronze: attacking an afterimage traps the attacker.
   *  Silver: afterimages fire dimensional blades. */
  _canon_mirageStep(a, key, rank) {
    const rt = CANON_RT.mirageStep;
    const c = this._c5Charges('mirageStep', rank);
    c.n = Math.max(0, c.n - 1);
    if (c.t <= 0) c.t = rt.recharge[rank] || 40;
    const img = { x: this.world.x, y: this.world.y, t: rt.imageSecs, rank, bladeT: rt.bladeEvery, trapped: new Set() };
    this._c5().images.push(img);
    // The pack takes the image, as Bait and Switch's does.
    const s4 = this._c4 ? this._c4() : null;
    if (s4 && this._c4Taunt) { const dec = { x: img.x, y: img.y, t: img.t, name: 'You' }; img.dec = dec; s4.decoys.push(dec); this._c4Taunt(dec, img.x, img.y); }
    const spot = this._c4BlinkSpot ? this._c4BlinkSpot(this.world.x, this.world.y, this.player.aimAngle || 0, rt.dist) : { x: this.world.x, y: this.world.y };
    this.teleportTo ? this.teleportTo(spot.x, spot.y) : (this.world.x = spot.x, this.world.y = spot.y);
    this._mirageSteps = (this._mirageSteps || 0) + 1;
  },

  // ==========================================================================
  // EVERY FRAME
  // ==========================================================================
  _tickCanon5(rdt) {
    const p = this.player;
    const st = this._c5();
    const dt = rdt;
    // --- how the player is moving -----------------------------------------
    const lx = st.lx == null ? this.world.x : st.lx, ly = st.ly == null ? this.world.y : st.ly;
    const vx = (this.world.x - lx) / Math.max(1e-3, dt), vy = (this.world.y - ly) / Math.max(1e-3, dt);
    st.lx = this.world.x; st.ly = this.world.y;
    st.speed = Math.hypot(vx, vy);
    st.moving = st.speed > 20 && st.speed < 2000;
    if (st.moving) {
      const ang = Math.atan2(vy, vx);
      if (st.lastAng != null) {
        let da = Math.abs(ang - st.lastAng); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > 0.6) st.turnT = 0;
      }
      st.lastAng = ang;
    }
    st.turnT += dt;
    const wet = this._isWaterAt(this.world.x, this.world.y);
    // ROUND 290 (his answer) -- Free Runner needs a RUN-UP: "probably requires
    // at least 2 seconds of movement before its active." `runT` is how long
    // you have kept moving; a quarter-second of standing on dry ground ends
    // the run (on water, stopping is `wetStillT`'s business: you fall).
    if (st.moving) { st.runT = (st.runT || 0) + dt; st.dryStillT = 0; }
    else if (!wet) { st.dryStillT = (st.dryStillT || 0) + dt; if (st.dryStillT > CANON_RT.freeRunner.runGrace) st.runT = 0; }
    const frWasOn = !!st.frOn;
    st.frOn = !!this._c5Held('freeRunner') && (st.runT || 0) >= CANON_RT.freeRunner.runUp;
    if (st.frOn && !frWasOn) { this._freeRunnerOn = (this._freeRunnerOn || 0) + 1; this._canonSay('Free Runner', '#81d4fa'); }
    if (!wet) st.lastDry = { x: this.world.x, y: this.world.y };
    // Height: a drop recorded for Wind Wave's silver amplification.
    const h = this._playerLayerH == null ? 0 : this._playerLayerH;
    if (st.lastH - h > 0.5) { st.dropLevels = Math.round(st.lastH - h); st.dropT = 1; }
    st.lastH = h;
    if (st.dropT > 0) st.dropT -= dt;

    // --- Eternal Moment ------------------------------------------------------
    const mo = p.canonMoment;
    if (mo && mo.t > 0) {
      const d = CANON_RT.eternalMoment.drain * dt;
      if (p.mana < d || p.stamina < d) { p.canonMoment = null; }
      else { p.mana -= d; p.stamina -= d; mo.t -= dt; if (mo.t <= 0) p.canonMoment = null; }
    }

    // --- Free Runner: water under a moving foot ------------------------------
    const fr = this._c5Held('freeRunner');
    if (fr) {
      const rt = CANON_RT.freeRunner;
      if (wet && !this._c5OtherWater()) {
        // "Low stamina and mana per second cost to run on walls and water.
        //  Momentum must be maintained ... to prevent falling."
        p.mana = Math.max(0, p.mana - rt.drainMana * dt);
        p.stamina = Math.max(0, p.stamina - rt.drainStamina * dt);
        st.wetStillT = st.moving ? 0 : st.wetStillT + dt;
        if (st.wetStillT > rt.fallAfter || p.mana <= 0 || p.stamina <= 0) {
          st.wetStillT = 0; st.runT = 0; st.frOn = false;
          if (st.lastDry) { this.teleportTo ? this.teleportTo(st.lastDry.x, st.lastDry.y) : (this.world.x = st.lastDry.x, this.world.y = st.lastDry.y); }
          this._canonSay('Splash — keep moving on water', '#81d4fa');
          this._freeRunnerFalls = (this._freeRunnerFalls || 0) + 1;
        }
      } else st.wetStillT = 0;
      // Bronze: "Enhanced ... spatial sense" -- an ambush is seen before it springs.
      if (reached(fr, 'bronze')) this._c5Reveal(rt.senseRadius);
    }
    const sb = this._c5Held('sightBeyondSight');
    if (sb && reached(sb, 'bronze')) this._c5Reveal(CANON_RT.sightBeyondSight.revealRadius);

    // --- Avatar of Speed bronze: [Momentum] while moving at speed -----------
    const av = this._canonHeldRank('avatarOfSpeed');
    if (av && reached(av, 'bronze')) {
      const rt = CANON_RT.avatarOfSpeed;
      st.momT = (st.momT || 0) + dt;
      if (st.moving && st.speed >= rt.fastSpeed) {
        const every = rt.momentumEvery * Math.max(0.3, rt.fastSpeed * 2 / st.speed);
        if (st.momT >= every) { st.momT = 0; this._applyDebuff(p, 'momentum', { stacks: 1, fromPlayer: true, source: p }); }
      } else if (st.momT >= rt.momentumLoseEvery && p.debuffs && p.debuffs.momentum) {
        // "instances are lost quickly while not moving"
        st.momT = 0;
        const m = p.debuffs.momentum;
        m.stacks = (m.stacks || 1) - 1;
        if (m.stacks <= 0) delete p.debuffs.momentum;
      }
    }

    // --- Alacrity's Reward ---------------------------------------------------
    const ar = this._c5Held('alacritysReward');
    if (ar) {
      const rt = CANON_RT.alacritysReward;
      const spirit = (p.attributes && p.attributes.spirit) || (p.attrs && p.attrs.spirit) || 10;
      const cap = Math.min(rt.cap, rt.base + Math.floor(spirit / rt.spiritPer));
      // "Rate of instance acquisition is increased proportionally with speed."
      st.antT = (st.antT || 0) + dt * (1 + (st.moving ? st.speed / 120 : 0));
      const have = (p.debuffs && p.debuffs.blessingOfAnticipation && p.debuffs.blessingOfAnticipation.stacks) || 0;
      if (st.antT >= rt.every && have < cap) {
        st.antT = 0;
        this._applyDebuff(p, 'blessingOfAnticipation', { stacks: 1, fromPlayer: true, source: p, capBonus: Math.max(0, cap - 10) });
      }
    }

    // --- toggles paid by the second ----------------------------------------
    if (p.canonRaindrops) {
      const rt = CANON_RT.betweenTheRaindrops;
      const dm = rt.drainMana * dt, ds = rt.drainStamina * dt;
      if (p.mana < dm || p.stamina < ds) { p.canonRaindrops = null; this._canonSay('Between the Raindrops — spent', '#81d4fa'); }
      else { p.mana -= dm; p.stamina -= ds; }
    }
    if (p.canonLeaf) {
      const rt = CANON_RT.leafOnTheWind;
      const r = p.canonLeaf.rank;
      // Silver: "Fly for moderate mana-per-second ... Gliding no longer costs mana."
      // ROUND 290 (his answer: "Yes, this sounds good") -- silver: "using
      // winds to carry others with you when you fly. Carrying others
      // increases the ongoing mana cost and incurs a speed penalty, both
      // scaling with the number of people carried." Every standing companion
      // near you while you FLY is carried; `_partyWalkTo` lets a carried one
      // over a ledge or water, and nobody else.
      const party = this._activeParty ? this._activeParty() : [];
      let carried = 0;
      for (const m of party) {
        m.canonCarried = !!(p.canonLeaf.fly && !(m.downT > 0) && Math.hypot(m.x - this.world.x, m.y - this.world.y) <= rt.carryRadius);
        if (m.canonCarried) carried++;
      }
      p.canonLeaf.carried = carried;
      const per = p.canonLeaf.fly ? rt.drainFly * (1 + rt.carryMana * carried) : (reached(r, 'silver') ? 0 : reached(r, 'bronze') ? rt.drainBronze : rt.drainIron);
      const d = per * dt;
      if (p.mana < d) { p.canonLeaf = null; this._canonSay('Leaf on the Wind — out of mana', '#b2dfdb'); }
      else p.mana -= d;
    }
    if (!p.canonLeaf || !p.canonLeaf.fly) for (const m of (this.party || [])) if (m.canonCarried) m.canonCarried = false;

    // --- Equilibrium -----------------------------------------------------------
    const med = p.canonMeditate;
    if (med) {
      const rt = CANON_RT.equilibrium;
      if (Math.hypot(this.world.x - med.x, this.world.y - med.y) > 6) { p.canonMeditate = null; this._canonSay('Meditation ends', '#a5d6a7'); }
      else {
        med.t += dt;
        const rec = (p.attributes && p.attributes.recovery) || (p.attrs && p.attrs.recovery) || 10;
        const cap = Math.min(rt.cap, rt.base + Math.floor(rec / rt.recoveryPer));
        const have = (p.debuffs && p.debuffs.integrity && p.debuffs.integrity.stacks) || 0;
        if (med.t >= rt.every) {
          med.t = 0;
          if (have < cap) this._applyDebuff(p, 'integrity', { stacks: 1, fromPlayer: true, source: p, capBonus: Math.max(0, cap - 5) });
        }
        st.medDropT = 0;
      }
    }
    if (!p.canonMeditate && this._canonKeyFor('equilibrium') && p.debuffs && p.debuffs.integrity && p.debuffs.integrity.fromMeditation !== false) {
      // "Instances quickly drop off when meditation ends."
      st.medDropT = (st.medDropT || 0) + dt;
      if (st.medDropT >= CANON_RT.equilibrium.dropEvery && st.hadMeditated) {
        st.medDropT = 0;
        const g = p.debuffs.integrity;
        g.stacks = (g.stacks || 1) - 1;
        if (g.stacks <= 0) { delete p.debuffs.integrity; st.hadMeditated = false; }
      }
    }
    if (p.canonMeditate) st.hadMeditated = true;

    // --- Cloud Step / Mirage Step charges ---------------------------------------
    for (const ck of ['cloudStep', 'mirageStep']) {
      const c = p.canonCharges && p.canonCharges[ck];
      if (!c || c.n >= (c.max || 1)) continue;
      c.t -= dt;
      if (c.t <= 0) {
        c.n += 1;
        const r = this._canonHeldRank(ck) || 'iron';
        const every = ck === 'cloudStep' ? CANON_RT.cloudStep.recharge : (CANON_RT.mirageStep.recharge[r] || 40);
        c.t = c.n < (c.max || 1) ? every : 0;
      }
    }
    if (p.canonIntangible) {
      const it = p.canonIntangible;
      it.t -= dt;
      if (it.t <= 0 && it.after > 0) { it.reduceT = it.after; it.after = 0; }
      if (it.reduceT > 0) it.reduceT -= dt;
      if (it.t <= 0 && !(it.reduceT > 0)) p.canonIntangible = null;
    }
    for (const m of st.mists) m.t -= dt;
    st.mists = st.mists.filter(m => m.t > 0);

    // --- Mirage Step images ------------------------------------------------------
    for (const img of st.images) {
      img.t -= dt;
      const rt = CANON_RT.mirageStep;
      // Bronze: "Attacking an afterimage creates a disorienting, short-lived,
      // dimensionally distorted illusion space that traps the attacker."
      if (reached(img.rank, 'bronze')) {
        for (const m of (this.monsters || [])) {
          if (!m.alive || img.trapped.has(m)) continue;
          if (Math.hypot(m.wx - img.x, m.wy - img.y) > ((m.type && m.type.radius) || 10) + 22) continue;
          img.trapped.add(m);
          m.rootT = Math.max(m.rootT || 0, rt.trapSecs);
          m.confusedT = Math.max(m.confusedT || 0, rt.trapSecs);
          this._floatText(m.wx, m.wy - 34, 'Trapped', '#ce93d8');
          this._mirageTraps = (this._mirageTraps || 0) + 1;
        }
      }
      // Silver: "fire dimensional blades throughout their duration at random
      // enemies, inflicting sharp and resonating-force damage."
      if (reached(img.rank, 'silver')) {
        img.bladeT -= dt;
        if (img.bladeT <= 0) {
          img.bladeT = rt.bladeEvery;
          const near = (this.monsters || []).filter(m => m.alive && Math.hypot(m.wx - img.x, m.wy - img.y) <= rt.bladeReach);
          const t = near[Math.floor(Math.random() * near.length)];
          if (t) { this._canonHurt(t, rt.bladeDmg * rankPow(img.rank), 'physical'); this._canonHurt(t, rt.bladeDmg * rankPow(img.rank) * 0.5, 'resonating'); this._mirageBlades = (this._mirageBlades || 0) + 1; }
        }
      }
    }
    st.images = st.images.filter(i => i.t > 0);

    // --- Moment of Oneness ---------------------------------------------------------
    const on = p.canonOneness;
    if (on) {
      on.immuneT -= dt; on.windowT -= dt;
      if (on.windowT <= 0) {
        // "the damage and conditions are suffered retroactively"
        p.canonOneness = null;
        if (on.dmg > 0) p.hp = Math.max(1, p.hp - on.dmg);
        for (const c of on.conds) this._applyDebuff(p, c.key, { ...c.opts, _oneness: true });
        if (on.dmg > 0 || on.conds.length) this._canonSay('Oneness: it catches up with you', '#ffab91');
        this._onenessBack = (this._onenessBack || 0) + 1;
      }
    }

    // --- Mana Tide -------------------------------------------------------------
    const tide = p.canonTide;
    if (tide) {
      const rt = CANON_RT.manaTide;
      tide.t -= dt; tide.age += dt;
      // Bronze: "increase their mana recovery by spending mana".
      if (p.mana < tide.lastMana) tide.spent += tide.lastMana - p.mana;
      const rate = Math.min(rt.cap, rt.base + rt.perSec * tide.age + (reached(tide.rank, 'bronze') ? tide.spent * rt.spendShare : 0));
      p.mana = Math.min(p.maxMana, p.mana + rate * dt);
      for (const m of (this._activeParty ? this._activeParty() : [])) {
        if (m.downT > 0 || Math.hypot(m.x - this.world.x, m.y - this.world.y) > rt.radius) continue;
        m.mana = Math.min(m.maxMana || 100, (m.mana || 0) + rate * dt);
      }
      tide.lastMana = p.mana;
      tide.rate = rate;
      if (tide.t <= 0) p.canonTide = null;
    }

    // --- Eldritch Imbalance channel -------------------------------------------------
    const im = p.canonImbalance;
    if (im) {
      const rt = CANON_RT.eldritchImbalance;
      const t = im.target;
      if (!t || !t.alive || Math.hypot(t.wx - this.world.x, t.wy - this.world.y) > rt.range * 1.2) p.canonImbalance = null;
      else {
        if (t.canonMana == null) t.canonMana = 1;
        const imb = (t.debuffs && t.debuffs.manaImbalance && t.debuffs.manaImbalance.stacks) || 0;
        // "Level of drain scales higher based on the target's current mana
        //  relative to their maximum mana."
        const rate = rt.drain * t.canonMana * (1 + rt.perImbalance * imb) * rankPow(im.rank);
        const got = Math.min(rate * dt, t.canonMana * 100);
        t.canonMana = Math.max(0, t.canonMana - got / 100);
        p.mana = Math.min(p.maxMana, p.mana + got);
        this._imbalanceDrained = (this._imbalanceDrained || 0) + got;
        if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, '#7986cb', 0, rt.range, false, { inward: true });
        // Bronze: "periodically inflicts [Mana Imbalance] on enemies with less
        // mana than the caster."
        im.tick -= dt;
        if (im.tick <= 0) {
          im.tick = rt.imbalanceEvery;
          if (reached(im.rank, 'bronze') && t.canonMana < p.mana / Math.max(1, p.maxMana)) this._canonInflict(t, 'manaImbalance');
        }
      }
      if (!p.canonImbalance && this._legendBeamG) this._legendBeamG.clear();
    }
    for (const m of (this.monsters || [])) if (m.canonMana != null && m.canonMana < 1 && !(im && im.target === m)) m.canonMana = Math.min(1, m.canonMana + 0.02 * dt);

    // --- Karmic Warrior bronze: [Karmic Sacrifice] while anyone has [Bad Karma] ---
    const kw = this._c5Held('karmicWarrior');
    if (kw && reached(kw, 'bronze')) {
      const bad = (this.monsters || []).some(m => m.alive && m.debuffs && m.debuffs.badKarma);
      if (bad) {
        if (!p.debuffs || !p.debuffs.karmicSacrifice) this._applyDebuff(p, 'karmicSacrifice', { fromPlayer: true, source: p });
        else p.debuffs.karmicSacrifice.t = Math.max(p.debuffs.karmicSacrifice.t || 0, 3);
        const good = (p.debuffs.goodKarma && p.debuffs.goodKarma.stacks) || 0;
        const heal = p.maxHp * CANON_RT.karmicWarrior.sacrificeHeal * (1 + good) * dt;
        if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + heal);
      } else if (p.debuffs && p.debuffs.karmicSacrifice) {
        // "This effect immediately ends if there are no enemies suffering from
        //  [Bad Karma]."
        delete p.debuffs.karmicSacrifice;
      }
    }

    // --- Cleansing Breeze bronze: continually cleansed --------------------------
    const cb = this._c5Held('cleansingBreeze');
    if (cb && reached(cb, 'bronze') && (!this._auraProjected || this._auraProjected())) {
      st.breezeT = (st.breezeT || 0) - dt;
      if (st.breezeT <= 0) {
        st.breezeT = CANON_RT.cleansingBreeze.cleanseEvery;
        const who = [{ e: p, isPlayer: true }, ...(this._activeParty ? this._activeParty() : [])
          .filter(m => m.downT <= 0 && Math.hypot(m.x - this.world.x, m.y - this.world.y) <= CANON_RT.cleansingBreeze.radius).map(m => ({ e: m }))];
        for (const w of who) {
          for (const tag of BREEZE_TAGS) {
            const got = this._cleanseConditions(w.e, { tag, count: 1 });
            if (got.length) {
              this._breezeCleansed = (this._breezeCleansed || 0) + got.length;
              // Silver: "When this ability cleanses an affliction from an ally
              // they gain an instance of [Integrity]."
              if (reached(cb, 'silver')) this._applyDebuff(w.e, 'integrity', { stacks: 1, fromPlayer: true, source: p });
              break;
            }
          }
        }
      }
    }
    // Fist combo decays; a caught spell's effects are held off for a beat.
    if (st.comboT > 0) { st.comboT -= dt; if (st.comboT <= 0) st.combo = 0; }
    if (this._noDebuffRollT > 0) this._noDebuffRollT -= dt;
    this._drawCanon5(dt);
  },
  /** ROUND 290 -- "Create a sort of speed particle effect to show that the
   *  player has activated free runner." Pale streaks that spawn around the
   *  runner and stream out behind, opposite the way you are going. */
  _drawCanon5(dt) {
    const st = this._c5();
    const on = st.frOn && st.moving;
    st.streaks = st.streaks || [];
    if (on && this.playerSprite) {
      st.streakAcc = (st.streakAcc || 0) + dt * CANON_RT.freeRunner.streaksPerSec;
      const ang = st.lastAng || 0;
      // screen-space direction of travel (iso: x' = x - y, y' = (x + y) / 2)
      const sx = Math.cos(ang) - Math.sin(ang), sy = (Math.cos(ang) + Math.sin(ang)) / 2;
      const n = Math.hypot(sx, sy) || 1;
      while (st.streakAcc >= 1) {
        st.streakAcc -= 1;
        // Held RELATIVE to the runner, so they hug you at any frame rate.
        const side = (Math.random() - 0.5) * 30, up = 10 + Math.random() * 34, back = 2 + Math.random() * 10;
        st.streaks.push({ ox: (-sy / n) * side - (sx / n) * back, oy: -up + (sx / n) * side * 0.5 - (sy / n) * back,
          dx: -sx / n, dy: -sy / n, len: 22 + Math.random() * 22, t: 0.45, t0: 0.45 });
      }
    }
    if (!st.streaks.length || !this.playerSprite) { if (this._c5G) this._c5G.clear(); if (!this.playerSprite) st.streaks = []; return; }
    let g = this._c5G;
    if (!g || !g.scene) {
      if (!this.add || !this.add.graphics) return;
      g = this._c5G = this.add.graphics();
      // Drawn about (0,0) and pinned to the sprite AFTER the frame's movement,
      // so the streaks sit on the runner however far a frame carries him.
      if (this.events && this.events.on) this.events.on('postupdate', () => {
        const gg = this._c5G, ps = this.playerSprite;
        if (gg && gg.scene && ps) { gg.setPosition(ps.x, ps.y); gg.setDepth((ps.depth || 0) + 1); }
      });
    }
    g.clear();
    g.setPosition(this.playerSprite.x, this.playerSprite.y);
    g.setDepth(isoDepth(this.world.x, this.world.y) + 1);
    const px = 0, py = 0;
    for (const k of st.streaks) {
      k.t -= dt; k.ox += k.dx * 70 * dt; k.oy += k.dy * 70 * dt;
      const a = Math.max(0, k.t / k.t0);
      const x0 = px + k.ox, y0 = py + k.oy, x1 = x0 + k.dx * k.len * (0.6 + 0.4 * a), y1 = y0 + k.dy * k.len * (0.6 + 0.4 * a);
      g.lineStyle(5, 0x81d4fa, 0.45 * a); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath();
      g.lineStyle(2, 0xffffff, 0.95 * a); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath();
    }
    st.streaks = st.streaks.filter(k => k.t > 0);
    this._freeRunnerStreaks = st.streaks.length;
  },
  /** Something else already carries the player over water. */
  _c5OtherWater() {
    const p = this.player;
    return !!((p.passiveMods && p.passiveMods.waterWalk) || (this._mountCrosses && this._mountCrosses('water'))
      || (p.canonLeaf && p.canonLeaf.fly) || (this._instantAdeptMove && this._instantAdeptMove()));
  },
  _c5Reveal(r) {
    for (const m of (this.monsters || [])) {
      if (!m.alive || !m.lurk) continue;
      if (Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > r) continue;
      m.lurk = false; m.ambushReady = false;
      if (m.sprite && m.sprite.active) m.sprite.setAlpha(1);
      if (this._unfold) this._unfold(m);
      this._floatText(m.wx, m.wy - 30, 'Sensed', '#fff59d');
      this._c5Sensed = (this._c5Sensed || 0) + 1;
    }
  },

  // ==========================================================================
  // HOOKS
  // ==========================================================================
  /** Movement: water, speed, and how far up a ledge you can go. */
  _canonMove5() {
    const p = this.player;
    const st = this._c5();
    let speed = 0, water = false, climb = 0;
    const fr = this._c5Held('freeRunner');
    if (fr) {
      const rt = CANON_RT.freeRunner;
      speed += rt.speed * rankPow(fr);
      // "run on walls and water": once the run-up is done (round 290, two
      // seconds of moving -- `st.frOn`) you cross water and take a ledge.
      if (st.frOn) { water = true; climb = Math.max(climb, 1.05); }
      // Silver: "combine with glide and flight powers to travel beyond normal
      // top glide, flight and running speeds".
      if (reached(fr, 'silver') && this._canGlideNow && this._canGlideNow() && st.moving) speed += rt.glideSpeed;
    }
    if (p.canonRaindrops) {
      const rt = CANON_RT.betweenTheRaindrops;
      if (reached(p.canonRaindrops.rank, 'bronze')) speed += st.turnT <= rt.erraticWindow ? rt.erraticSpeed : rt.straightSpeed;
    }
    if (p.canonLeaf) {
      const rt = CANON_RT.leafOnTheWind;
      speed += (p.canonLeaf.fly ? rt.flySpeed : rt.speed) * this._celestialWind({ canonKey: 'leafOnTheWind' });
      if (p.canonLeaf.fly && p.canonLeaf.carried) speed -= rt.carrySlow * p.canonLeaf.carried;
      if (p.canonLeaf.fly) { water = true; climb = Math.max(climb, 3.05); }
    }
    return { speed, water, climb };
  },
  /** The dodge roll: Between the Raindrops. */
  _canonDodge5() {
    const r = this.player.canonRaindrops;
    if (!r) return 0;
    const rt = CANON_RT.betweenTheRaindrops;
    return rt.dodge + (reached(r.rank, 'silver') ? rt.dodgeSilver : 0);
  },
  /** Avatar of Speed: movement abilities cost less. */
  _canonCostCut5(a) {
    return this._canonHeldRank('avatarOfSpeed') && isMoveAbility(a) ? CANON_RT.avatarOfSpeed.costCut : 0;
  },
  /** Avatar of Speed: "Your movement abilities have increased effect." */
  _canonMoveEffect5() {
    return this._canonHeldRank('avatarOfSpeed') ? CANON_RT.avatarOfSpeed.effect : 0;
  },
  /** Mana and stamina recovery: Cleansing Breeze bronze, Leaf on the Wind
   *  bronze ("Strong winds increase your rate of stamina and mana recovery"
   *  -- high ground is where the wind is strong). */
  _canonRegen5(pool) {
    if (pool !== 'Mana' && pool !== 'Stamina') return 1;
    let k = 1;
    const cb = this._c5Held('cleansingBreeze');
    if (cb && reached(cb, 'bronze')) k += CANON_RT.cleansingBreeze.regenBoost;
    const leaf = this._canonHeldRank('leafOnTheWind');
    if (leaf && reached(leaf, 'bronze') && (this._playerLayerH || 0) >= 2) k += CANON_RT.leafOnTheWind.highRegen;
    return k;
  },
  /** Stack ceiling for helpful conditions: Child of the Celestial Wind
   *  silver, "Boons with maximum effect thresholds have their maximum
   *  thresholds increased." */
  _canonCapBonus5(def) {
    const r = this._c5Held('childOfTheCelestialWind');
    return r && reached(r, 'silver') && def && def.helpful ? CANON_RT.childOfTheCelestialWind.capBonus : 0;
  },
  /** Can the player's blows touch the incorporeal? Strong Soul ("You can
   *  physically interact with incorporeal entities") and Radiant Fist. */
  _canonTouchesSpirit() {
    if (this._c5Held('strongSoul')) return true;
    return !!(this._c5Held('radiantFist') && this._c5Unarmed());
  },

  /** The door every condition on the player comes through. True refuses it. */
  _canonDoor5(key, def, opts = {}) {
    const p = this.player;
    if (!def || opts._oneness) return false;
    // Moment of Oneness: "immune to ... afflictions", kept for later.
    const on = p.canonOneness;
    if (on && on.immuneT > 0 && !def.helpful) { on.conds.push({ key, opts: { stacks: opts.stacks || 1 } }); return true; }
    // Strong Soul bronze: "You cannot receive unholy boons."
    const ss = this._c5Held('strongSoul');
    if (def.helpful && ss && reached(ss, 'bronze') && hasTag(def, TAG.unholy)) return true;
    if (def.helpful) return false;
    // Karmic Warrior iron: "when subjected to damage or any harmful effect,
    // even if the damage and/or effect was wholly negated."
    if (!opts.fromPlayer) this._karmaStruck(opts.source && opts.source.alive !== undefined ? opts.source : null);
    // Cleansing Breeze: "increased resistance to curses, diseases, magic
    // afflictions, poisons and unholy afflictions".
    let chance = 0;
    const cb = this._c5Held('cleansingBreeze');
    if (cb && BREEZE_TAGS.some(t => hasTag(def, t))) chance += CANON_RT.cleansingBreeze.resist;
    // Strong Soul: "Resistance to dimensional or astral effects" (iron) and
    // "curse, magic and unholy resistance" (bronze).
    if (ss && def.blocksTeleport) chance += CANON_RT.strongSoul.resist;
    if (ss && reached(ss, 'bronze') && ['curse', 'magic', 'unholy'].some(t => hasTag(def, t))) chance += CANON_RT.strongSoul.resist;
    // Child of the Celestial Wind bronze: "increased resistance to dimension
    // and wind-based effects".
    const cw = this._c5Held('childOfTheCelestialWind');
    if (cw && reached(cw, 'bronze') && def.blocksTeleport) chance += CANON_RT.childOfTheCelestialWind.resist;
    if (chance > 0 && Math.random() < Math.min(0.75, chance)) {
      this._floatText(this.world.x, this.world.y - 46, `${def.label} resisted`, '#e0f7fa');
      this._c5Resisted = (this._c5Resisted || 0) + 1;
      return true;
    }
    return false;
  },

  /** Karmic Warrior, when harm comes at you: [Agent of Karma]; bronze
   *  [Good Karma] for suffering it, and [Bad Karma] on whoever sent it. */
  _karmaStruck(m) {
    const kw = this._c5Held('karmicWarrior');
    if (!kw) return;
    const p = this.player;
    this._applyDebuff(p, 'agentOfKarma', { stacks: 1, fromPlayer: true, source: p });
    if (reached(kw, 'bronze')) {
      this._applyDebuff(p, 'goodKarma', { stacks: 1, fromPlayer: true, source: p });
      if (m && m.alive) this._canonInflict(m, 'badKarma');
    }
    this._karmaStruckN = (this._karmaStruckN || 0) + 1;
  },
  /** Bronze: "Gain an instance of [Good Karma] when healing others,
   *  cleansing others". Called from the friendly-heal door. */
  _karmaGave() {
    const kw = this._c5Held('karmicWarrior');
    if (kw && reached(kw, 'bronze')) this._applyDebuff(this.player, 'goodKarma', { stacks: 1, fromPlayer: true, source: this.player });
  },
  /** A monster died. Karmic Warrior silver: "When an enemy with [Bad Karma]
   *  dies or is destroyed, your cooldowns are reduced for each instance of
   *  [Good Karma] you have." */
  _canonMonsterDied5(m) {
    if (!m || !m.debuffs || !m.debuffs.badKarma) return;
    const kw = this._c5Held('karmicWarrior');
    if (!kw || !reached(kw, 'silver')) return;
    const p = this.player;
    const good = (p.debuffs && p.debuffs.goodKarma && p.debuffs.goodKarma.stacks) || 0;
    const cut = good * CANON_RT.karmicWarrior.silverCdPerGood;
    if (!(cut > 0)) return;
    for (const k of Object.keys(p.abilityCdByKey || {})) p.abilityCdByKey[k] = Math.max(0, p.abilityCdByKey[k] - cut);
    this._karmaCdCut = (this._karmaCdCut || 0) + cut;
  },
  /** A monster attacked someone. [Bad Karma]: "Suffer ... transcendent damage
   *  when making an attack ... against anyone without the [Karmic Sacrifice]
   *  boon." */
  _canonMonsterActed5(m, kind, victim) {
    const bk = m && m.debuffs && m.debuffs.badKarma;
    if (!bk) return;
    const p = this.player;
    const protectedVictim = victim === 'player' ? !!(p.debuffs && p.debuffs.karmicSacrifice) : false;
    if (protectedVictim) return;
    this._canonHurt(m, CANON_RT.karmicWarrior.badDmg * (bk.stacks || 1), 'transcendent');
    this._badKarmaBites = (this._badKarmaBites || 0) + 1;
  },

  /** Harm on its way, before anything negates it (karma counts even then). */
  _canonHarmed5(m) {
    if (m && !m.person) this._karmaStruck(m);
  },
  /** A monster's blow on its way to the player. */
  _canonMeetsBlow5(m, dmg, shot) {
    const p = this.player;
    // Moment of Oneness: "immune to all damage", banked for the next strike.
    const on = p.canonOneness;
    if (on && on.immuneT > 0) { on.dmg += dmg; this._floatText(this.world.x, this.world.y - 46, 'Oneness', '#fff9c4'); return 0; }
    // Cloud Step: intangible; bronze "The next attack suffered within a brief
    // period after the intangibility ends is significantly reduced."
    const it = p.canonIntangible;
    if (it && it.t > 0) return 0;
    if (it && it.reduceT > 0) { dmg *= 1 - CANON_RT.cloudStep.reduce; p.canonIntangible = null; }
    const el = (m && m.dmgElement) || null;
    const physical = !el && !(m && m.type && m.type.dmgType === 'magical');
    // The fists: "negate all damage from actively intercepted attacks" (Immortal,
    // physical) and "Negate any non-damage effects" (Radiant, the rest).
    const st = this._c5();
    const now = this._clockT || 0;
    if (this._c5Unarmed() && now - st.lastSwingT <= CANON_RT.immortalFist.window) {
      const im = this._c5Held('immortalFist');
      if (im && physical && Math.random() < CANON_RT.immortalFist.intercept) {
        const gold = m && m.key && monsterThreatTier(m.key) >= 4;
        this._floatText(this.world.x, this.world.y - 46, 'Intercepted', '#ffcc80');
        this._fistIntercepts = (this._fistIntercepts || 0) + 1;
        if (reached(im, 'bronze')) this._applyDebuff(p, 'momentum', { stacks: 1, fromPlayer: true, source: p });
        if (!gold) return 0;
        dmg *= 0.3;   // "Not all damage from very powerful attacks will be negated."
      }
      const rf = this._c5Held('radiantFist');
      if (rf && !physical && Math.random() < CANON_RT.radiantFist.intercept) {
        this._noDebuffRollT = 0.2;
        this._floatText(this.world.x, this.world.y - 46, 'Caught', '#b39ddb');
        this._fistCatches = (this._fistCatches || 0) + 1;
        if (reached(rf, 'bronze')) this._applyDebuff(p, 'impervious', { stacks: 1, fromPlayer: true, source: p });
      }
    }
    // Alacrity's Reward: "Consume instances to negate an amount of incoming
    // damage per instance consumed."
    const ant = p.debuffs && p.debuffs.blessingOfAnticipation;
    if (ant && dmg > 0) {
      const per = CANON_RT.alacritysReward.negatePer * rankPow(this._canonHeldRank('alacritysReward') || 'iron');
      const need = Math.min(ant.stacks || 1, Math.ceil(dmg / per));
      ant.stacks = (ant.stacks || 1) - need;
      if (ant.stacks <= 0) delete p.debuffs.blessingOfAnticipation;
      dmg = Math.max(0, dmg - need * per);
      this._anticipated = (this._anticipated || 0) + need;
      if (!(dmg > 0)) { this._floatText(this.world.x, this.world.y - 46, 'Anticipated', '#fff59d'); return 0; }
    }
    // Strong Soul: "Disruptive-force damage dealt to you is reduced by a
    // large amount; other damage dealt to you is reduced by a small amount."
    const ss = this._c5Held('strongSoul');
    if (ss) {
      const rt = CANON_RT.strongSoul;
      let dr = el === 'disruptive' ? rt.disruptiveDR : rt.otherDR;
      // Bronze: "Each instance of a holy boon on you increases the damage
      // reduction of this ability."
      if (reached(ss, 'bronze')) {
        let holy = 0;
        for (const k of Object.keys(p.debuffs || {})) { const d = conditionDef(k); if (d && d.helpful && hasTag(d, TAG.holy)) holy += p.debuffs[k].stacks || 1; }
        dr += Math.min(rt.holyCap, holy * rt.perHoly);
      }
      dmg *= 1 - dr;
    }
    // Child of the Celestial Wind: "damage reduction to disruptive-force damage".
    if (el === 'disruptive' && this._c5Held('childOfTheCelestialWind')) dmg *= 1 - CANON_RT.childOfTheCelestialWind.disruptiveDR;
    // [Impervious]: "damage reduction is gained against non-physical damage".
    const imp = p.debuffs && p.debuffs.impervious;
    if (imp && !physical) dmg *= 1 - Math.min(0.4, 0.05 * (imp.stacks || 1));
    // [Good Karma]: "Damage from enemies with [Bad Karma] is reduced."
    const gk = p.debuffs && p.debuffs.goodKarma;
    if (gk && m && m.debuffs && m.debuffs.badKarma) dmg *= 1 - Math.min(0.3, CANON_RT.karmicWarrior.goodDR * (gk.stacks || 1));
    return dmg;
  },
  /** Radiant Fist bronze: "Gain mana when intercepting magical projectiles",
   *  and silver's answer. */
  _canonInterceptShot5(s) {
    const rf = this._c5Held('radiantFist');
    if (!rf || !reached(rf, 'bronze') || !this._c5Unarmed()) return false;
    const magical = !!(s && (s.element || (s.src && s.src.type && s.src.type.dmgType === 'magical')));
    if (!magical) return false;
    if (Math.hypot(s.wx - this.world.x, s.wy - this.world.y) > 40) return false;
    if (Math.random() >= CANON_RT.radiantFist.intercept) return false;
    const p = this.player;
    p.mana = Math.min(p.maxMana, p.mana + CANON_RT.radiantFist.manaOnCatch);
    // Silver: "After intercepting a magical projectile you may make a
    // disruptive-force projectile attack."
    if (reached(rf, 'silver') && s.src && s.src.alive) {
      this._canonHurt(s.src, CANON_RT.radiantFist.boltDmg * rankPow(rf), 'disruptive');
      this._fistReturns = (this._fistReturns || 0) + 1;
    }
    this._floatText(s.wx, s.wy - 20, 'Caught', '#b39ddb');
    this._fistCatches = (this._fistCatches || 0) + 1;
    return true;
  },
  /** A basic swing landed. [Momentum] spent; the fists; Oneness released. */
  _canonSwing5(m) {
    if (!m || !m.alive) return;
    const p = this.player;
    const st = this._c5();
    const now = this._clockT || 0;
    st.lastSwingT = now;
    // [Momentum]: "When making an attack, all instances are consumed to
    // inflict resonating-force damage."
    const mo = p.debuffs && p.debuffs.momentum;
    if (mo) {
      const n = mo.stacks || 1;
      delete p.debuffs.momentum;
      this._canonHurt(m, CANON_RT.avatarOfSpeed.momentumDmg * n * rankPow(this._canonHeldRank('avatarOfSpeed') || this._canonHeldRank('immortalFist') || 'iron'), 'resonating');
      this._momentumSpent = (this._momentumSpent || 0) + n;
    }
    if (this._c5Unarmed()) {
      const im = this._c5Held('immortalFist');
      const rf = this._c5Held('radiantFist');
      let combo = 1;
      if (im && reached(im, 'silver')) {
        // "Damage increases with each blow when making rapid, consecutive attacks."
        st.combo = st.comboT > 0 ? st.combo + 1 : 0;
        st.comboT = CANON_RT.immortalFist.comboEvery;
        combo = 1 + Math.min(CANON_RT.immortalFist.comboCap, st.combo * CANON_RT.immortalFist.comboPer);
      }
      if (im) this._canonHurt(m, CANON_RT.immortalFist.bonus * rankPow(im) * combo, 'resonating');
      if (rf) this._canonHurt(m, CANON_RT.radiantFist.bonus * rankPow(rf) * combo * (subtypeOf(m) === 'ethereal' ? 2 : 1), 'disruptive');
      this._fistHits = (this._fistHits || 0) + ((im || rf) ? 1 : 0);
    }
    // Moment of Oneness: "The next melee attack within four seconds inflicts
    // all damage and afflictions on the struck enemy."
    const on = p.canonOneness;
    if (on && on.immuneT <= 0 && on.windowT > 0) {
      p.canonOneness = null;
      if (on.dmg > 0) this._canonHurt(m, on.dmg, 'transcendent');
      for (const c of on.conds) this._canonInflict(m, c.key, c.opts.stacks || 1);
      this._onenessReturned = (this._onenessReturned || 0) + 1;
      this._floatText(m.wx, m.wy - 40, 'Returned', '#fff9c4');
    }
  },
  /** Stat pass. */
  _canonPassiveMods5(mods) {
    const fr = this._c5Held('freeRunner');
    // Bronze: "Enhanced balance" -- harder to knock over.
    if (fr && reached(fr, 'bronze')) mods.momentumResist = Math.max(mods.momentumResist || 0, CANON_RT.freeRunner.knockResist);
    const sb = this._c5Held('sightBeyondSight');
    if (sb) { mods.auraSenseBonus = Math.max(mods.auraSenseBonus || 0, CANON_RT.sightBeyondSight.auraSense); mods.auraSight = true; }
  },
};
