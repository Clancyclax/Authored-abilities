// ============================================================================
// ROUND 296 -- THE ATTACK ROLES AND THE SECOND RESOURCE, IN PLAY.
//
// data/attackRoles.js decides what each attack in a DPS kit is for and says
// so on its card; data/essenceIdentity.js writes Cauterize Wounds. This file
// makes every one of those sentences do what it says:
//
//   costs     health, an affliction on the target, a charge, Rage / Souls /
//             Shards / Energy (`_rolePrecheck`, `_rolePay`)
//   on a hit  knockback, stun, spread afflictions, a share of a boss's
//             health, a party rally, consumed afflictions and spent resource
//             turned into damage (`_roleOnHit`, from `_damageMonster`)
//   on cast   the rush to the target, resource restores
//   always    the second resource fills and drains (`_altResTick`) and shows
//             as a fourth bar under stamina (`_updateAltBar`)
//
// Every hit an ability lands already carries the ability as `_rungHitCtx`
// (round 285's rung runtime, which bolts also carry to their impact), so the
// roles ride that one context rather than adding a second.
// ============================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { ALT_RESOURCES } from '../data/attackRoles.js';
import { conditionDef } from '../data/debuffs.js';

const SHARD_GAP_MS = 1000;
const RAGE_IDLE_MS = 5000;
const RAGE_DRAIN = 5;
const ENERGY_REGEN = 10;
const ROLE_MULT_MS = 3000;

const isAffliction = (key, def) => !!(def && def.kind === 'affliction');

export const AttackRoleMixin = {
  // ------------------------------------------------------- second resource --

  /** The resource the kit holds, or null. Read off the known abilities. */
  _altResKind() {
    const p = this.player;
    // Folded into the passive mods (so switching the passive off switches
    // the resource off); read off the kit directly until the first fold.
    const m = p && p.passiveMods;
    if (m && 'altRes' in m) return ALT_RESOURCES[m.altRes] ? m.altRes : null;
    for (const v of Object.values((p && p.knownAbilities) || {})) {
      const a = v && v.ability;
      if (a && a.template === 'altResource' && ALT_RESOURCES[a.altRes]) return a.altRes;
    }
    return null;
  },

  _altRes() {
    const p = this.player;
    const kind = this._altResKind();
    if (!kind) { p.altRes = null; return null; }
    const def = ALT_RESOURCES[kind];
    if (!p.altRes || p.altRes.kind !== kind) p.altRes = { kind, cur: kind === 'energy' ? def.max : 0, max: def.max, lastAct: 0 };
    p.altRes.max = def.max;
    return p.altRes;
  },

  _altGain(n) {
    const r = this._altRes();
    if (!r || !(n > 0)) return 0;
    const before = r.cur;
    r.cur = Math.min(r.max, r.cur + n);
    r.lastAct = this.time ? this.time.now : 0;
    return r.cur - before;
  },

  _altResTick(dt) {
    // ROUND 297 -- the Life-and-Fire fusions that run on a clock.
    this._tickHearthfires(dt);
    this._checkRekindle();
    const r = this._altRes();
    if (r) {
      const now = this.time ? this.time.now : 0;
      if (r.kind === 'energy') r.cur = Math.min(r.max, r.cur + ENERGY_REGEN * dt);
      if (r.kind === 'rage' && r.cur > 0 && now - (r.lastAct || 0) > RAGE_IDLE_MS) r.cur = Math.max(0, r.cur - RAGE_DRAIN * dt);
    }
    this._updateAltBar(r);
  },

  /** A fourth bar under stamina, only while the kit has a second resource. */
  _updateAltBar(r) {
    if (typeof document === 'undefined') return;
    let row = document.getElementById('barAlt');
    if (!r) { if (row) row.style.display = 'none'; return; }
    if (!row) {
      const st = document.getElementById('barStamina');
      if (!st || !st.parentNode) return;
      row = document.createElement('div');
      row.className = 'bar-row';
      row.id = 'barAlt';
      row.innerHTML = '<div class="bar-track"><div class="bar-fill"></div><span class="bar-text"></span></div>';
      st.parentNode.insertBefore(row, st.nextSibling);
    }
    row.style.display = '';
    const def = ALT_RESOURCES[r.kind];
    const fill = row.querySelector('.bar-fill');
    const text = row.querySelector('.bar-text');
    const key = `${r.kind}|${Math.floor(r.cur)}`;
    if (this._altBarKey === key) return;
    this._altBarKey = key;
    if (fill) { fill.style.width = `${Math.max(0, Math.min(100, 100 * r.cur / r.max))}%`; fill.style.background = def.color; }
    if (text) text.textContent = `${def.name} ${Math.floor(r.cur)} / ${r.max}`;
  },

  /** A blow the player landed: Rage, and Shards on an afflicted target. */
  _altOnPlayerHit(m) {
    const r = this._altRes();
    if (!r) return;
    if (r.kind === 'rage') this._altGain(4);
    else if (r.kind === 'shards' && this._monAfflictions(m).length) {
      const now = this.time ? this.time.now : 0;
      if (now - (this._shardAt || 0) >= SHARD_GAP_MS) { this._shardAt = now; this._altGain(1); }
    }
  },

  /** The player was hurt: Rage. */
  _altOnPlayerHurt() {
    const r = this._altRes();
    if (r && r.kind === 'rage') this._altGain(6);
  },

  /** A kill: Souls, and a charge back on every ability that holds charges. */
  _roleOnKill(m) {
    const r = this._altRes();
    if (r && r.kind === 'souls') this._altGain(1);
    const p = this.player;
    for (const [key, v] of Object.entries(p.knownAbilities || {})) {
      const a = v && v.ability;
      if (!a || !a.chargesMax) continue;
      const ch = this._roleCharges(key, a);
      p.roleCharges[key] = Math.min(a.chargesMax, ch + 1);
    }
  },

  _roleCharges(key, a) {
    const p = this.player;
    p.roleCharges = p.roleCharges || {};
    if (typeof p.roleCharges[key] !== 'number') p.roleCharges[key] = a.chargesMax;
    return p.roleCharges[key];
  },

  // ----------------------------------------------------------- afflictions --

  /** The afflictions on a creature, by key (a DoT counts as one). */
  _monAfflictions(m) {
    if (!m) return [];
    const out = [];
    for (const [k, v] of Object.entries(m.debuffs || {})) {
      const def = conditionDef(k);
      if (!v) continue;
      if (def ? isAffliction(k, def) : true) out.push(k);
    }
    if (m.dot && m.dot.ticksLeft !== 0) out.push('__dot');
    return out;
  },

  _consumeAfflictions(m, n = Infinity) {
    const keys = this._monAfflictions(m);
    let used = 0;
    for (const k of keys) {
      if (used >= n) break;
      if (k === '__dot') m.dot = null; else delete m.debuffs[k];
      used++;
    }
    return used;
  },

  /** An enemy in reach that carries an affliction. */
  /** How far an ability reaches: a bolt's flight, otherwise its range. A
   *  bolt's `radius` is its collision size, not a reach. */
  _abilityReach(a) {
    const bolt = a && (a.template === 'projectileBall' || a.template === 'volley');
    const raw = bolt ? (a.speed || 260) * (a.projectileLife ?? 1.1) : (a.range || 220);
    return raw * (this._reachMult ? this._reachMult() : 1);
  },

  _afflictedInReach(a) {
    const reach = this._abilityReach(a);
    const sel = this._currentTarget ? this._currentTarget('enemy') : null;
    if (sel && sel.alive && this._monAfflictions(sel).length
      && Math.hypot((sel.wx ?? sel.x) - this.world.x, (sel.wy ?? sel.y) - this.world.y) <= reach) return sel;
    let best = null, bd = Infinity;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || !this._monAfflictions(m).length) continue;
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d <= reach && d < bd) { bd = d; best = m; }
    }
    return best;
  },

  // ---------------------------------------------------------- cost and cast --

  /** Can this be cast at all? Asked before anything is paid. */
  _rolePrecheck(a, key) {
    if (!a) return true;
    const p = this.player;
    const say = (t) => { this._floatText(this.world.x, this.world.y - 40, `${a.name} — ${t}`, '#90a4ae'); return false; };
    if (a.hpCostPct > 0 && p.hp <= Math.ceil(p.maxHp * a.hpCostPct)) return say('not enough health');
    if (a.altCost > 0) { const r = this._altRes(); if (!r || r.cur < a.altCost) return say(`not enough ${(ALT_RESOURCES[a.altResKind] || {}).name || 'resource'}`); }
    if (a.consumeAllAlt > 0) { const r = this._altRes(); if (!r || r.cur < 1) return say(`no ${(ALT_RESOURCES[a.altResKind] || {}).name || 'resource'}`); }
    if (a.chargesMax > 0 && this._roleCharges(key, a) < 1) return say('no charges');
    if ((a.consumeAffliction || a.consumeAfflictionsPer > 0) && !this._afflictedInReach(a)) return say('no afflicted enemy in reach');
    return true;
  },

  /** Pay the role's price and do what happens at the moment of casting. */
  _rolePay(a, key) {
    if (!a) return;
    const p = this.player;
    const now = this.time ? this.time.now : 0;
    if (a.hpCostPct > 0) p.hp = Math.max(1, p.hp - Math.ceil(p.maxHp * a.hpCostPct));
    if (a.altCost > 0) { const r = this._altRes(); if (r) r.cur = Math.max(0, r.cur - a.altCost); }
    if (a.consumeAllAlt > 0) {
      const r = this._altRes();
      const spent = r ? Math.floor(r.cur) : 0;
      if (r) r.cur = 0;
      a._roleMult = { mult: 1 + a.consumeAllAlt * spent, until: now + ROLE_MULT_MS };
    }
    if (a.chargesMax > 0) p.roleCharges[key] = Math.max(0, this._roleCharges(key, a) - 1);
    if (a.consumeAffliction) {
      const m = this._afflictedInReach(a);
      if (m) this._consumeAfflictions(m, 1);
    }
    if (a.altGain > 0) this._altGain(a.altGain);
    if (a.chargeTo > 0) this._roleRush(a);
    a._roleRallied = false;
  },

  /** The rush: to beside the target, before the blow. */
  _roleRush(a) {
    const sel = this._currentTarget ? this._currentTarget('enemy') : null;
    let t = (sel && sel.alive) ? sel : (this._nearestMonsterInCone ? this._nearestMonsterInCone(a.chargeTo, Math.PI / 3) : null);
    if (!t) return false;
    const tx = t.wx ?? t.x, ty = t.wy ?? t.y;
    const dx = tx - this.world.x, dy = ty - this.world.y, d = Math.hypot(dx, dy) || 1;
    if (d > a.chargeTo) return false;
    const stop = Math.max(0, d - 28);
    const nx = this.world.x + (dx / d) * stop, ny = this.world.y + (dy / d) * stop;
    if (this._isWaterAt && this._isWaterAt(nx, ny)) return false;
    if (this._collidesObstacle && this._collidesObstacle(nx, ny, 12)) return false;
    this.world.x = nx; this.world.y = ny;
    if (this._updatePlayerSprite) this._updatePlayerSprite(false);
    this.player.aimAngle = Math.atan2(dy, dx);
    this._roleRushes = (this._roleRushes || 0) + 1;
    return true;
  },

  // ----------------------------------------------------------------- a hit --

  /** Called by `_damageMonster` for a blow from an ability. Returns the damage. */
  _roleOnHit(m, dmg) {
    const a = this._rungHitCtx;
    if (!m || !a) return dmg;
    this._altOnPlayerHit(m);
    if (!a.role && a.template !== 'cauterize') return dmg;
    const now = this.time ? this.time.now : 0;
    if (a._roleMult && a._roleMult.until > now) dmg = Math.round(dmg * a._roleMult.mult);
    if (a.consumeAfflictionsPer > 0) {
      const n = this._consumeAfflictions(m);
      if (n) dmg = Math.round(dmg * (1 + a.consumeAfflictionsPer * n));
      this._roleConsumed = (this._roleConsumed || 0) + n;
    }
    if (a.bossPct > 0 && (this._isBossMonster(m) || m.elite || m.champion)) {
      dmg += Math.round((m.maxHp || 0) * a.bossPct);
    }
    if (a.stunOnHit > 0 && this._applyDebuff) {
      this._applyDebuff(m, 'stun', { duration: a.stunOnHit, fromPlayer: true, source: this.player });
      m.atkCd = Math.max(m.atkCd || 0, a.stunOnHit);
    }
    if (a.knockback > 0) this._roleKnock(m, a.knockback);
    if (a.spreadAfflictions > 0) this._roleSpread(m, a.spreadAfflictions);
    if (a.partyBuffOnHit && !a._roleRallied) {
      a._roleRallied = true;
      this._roleRally(a);
    }
    return dmg;
  },

  _roleKnock(m, dist) {
    const dx = m.wx - this.world.x, dy = m.wy - this.world.y, d = Math.hypot(dx, dy) || 1;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const nx = m.wx + (dx / d) * (dist / steps), ny = m.wy + (dy / d) * (dist / steps);
      if (this._isWaterAt && this._isWaterAt(nx, ny)) break;
      if (this._collidesObstacle && this._collidesObstacle(nx, ny, (m.type && m.type.radius) || 12)) break;
      m.wx = nx; m.wy = ny;
    }
    this._roleKnocks = (this._roleKnocks || 0) + 1;
  },

  _roleSpread(m, radius) {
    const keys = Object.keys(m.debuffs || {});
    let n = 0;
    for (const o of (this.monsters || [])) {
      if (!o || o === m || !o.alive) continue;
      if (Math.hypot(o.wx - m.wx, o.wy - m.wy) > radius) continue;
      for (const k of keys) {
        const src = m.debuffs[k];
        if (!src) continue;
        this._applyDebuff(o, k, { fromPlayer: true, source: this.player, duration: src.t || src.dur || undefined, stacks: src.stacks || 1 });
      }
      if (m.dot && !o.dot) o.dot = { ...m.dot };
      n++;
    }
    this._roleSpreads = (this._roleSpreads || 0) + n;
    return n;
  },

  /** "You and your allies deal X% more damage", through the channels the
   *  party buff already uses: `auraGrant` for companions, `buffs.power` for you. */
  _roleRally(a) {
    const pb = a.partyBuffOnHit;
    const now = this.time ? this.time.now : 0;
    const until = now + pb.dur * 1000;
    for (const c of (this.party || [])) {
      if (!c.recruited || c.downT > 0) continue;
      const cur = c.auraGrant;
      c.auraGrant = {
        power: (cur && cur.power) || 0,
        dmgPct: Math.max(pb.pct, (cur && cur.dmgPct) || 0),
        hastePct: (cur && cur.hastePct) || 0,
        element: (cur && cur.element) || null,
        expires: Math.max(until, (cur && cur.expires) || 0),
      };
    }
    const cur = this.player.buffs.power;
    this.player.buffs.power = { mult: Math.max(1 + pb.pct, cur ? cur.mult : 1), t: Math.max(pb.dur, cur ? cur.t : 0) };
    this._floatText(this.world.x, this.world.y - 48, `+${Math.round(pb.pct * 100)}% damage`, '#ffcc80');
    this._roleRallies = (this._roleRallies || 0) + 1;
  },

  // ---------------------------------------------------------- Hearthfire --

  _castHearthfire(a) {
    const x = this.world.x, y = this.world.y;
    const now = this.time ? this.time.now : 0;
    let gfx = null;
    if (this.add && this.add.ellipse) {
      const p = isoProject(x, y);
      const r = a.fieldRadius || 96;
      gfx = this.add.ellipse(p.x, p.y, r * 2, r, 0xff8a3d, 0.22);
      gfx.setDepth(isoDepth(x, y) - 10);
    }
    (this._hearthfires = this._hearthfires || []).push({
      x, y, r: a.fieldRadius || 96, until: now + (a.fieldDuration || 8) * 1000,
      heal: a.fieldHeal || 4, burn: a.fieldBurn || 4, tick: 0, gfx, name: a.name,
    });
    this._floatText(x, y - 40, a.name, a.color || '#ffb74d');
    return this._hearthfires[this._hearthfires.length - 1];
  },

  _tickHearthfires(dt) {
    const list = this._hearthfires;
    if (!list || !list.length) return;
    const now = this.time ? this.time.now : 0;
    for (const f of list) {
      f.tick += dt;
      while (f.tick >= 1 && now < f.until) {
        f.tick -= 1;
        if (Math.hypot(this.world.x - f.x, this.world.y - f.y) <= f.r) this._healPlayer(f.heal, { quiet: true });
        for (const c of (this.party || [])) {
          if (!c.recruited || c.downT > 0 || !(c.hp > 0)) continue;
          if (Math.hypot(c.x - f.x, c.y - f.y) <= f.r) c.hp = Math.min(c.maxHp || c.hp, c.hp + f.heal);
        }
        for (const m of (this.monsters || [])) {
          if (!m || !m.alive || Math.hypot(m.wx - f.x, m.wy - f.y) > f.r) continue;
          this._damageMonster(m, f.burn, true, false, 'fire');
        }
        this._hearthTicks = (this._hearthTicks || 0) + 1;
      }
      if (now >= f.until && f.gfx && f.gfx.destroy) { f.gfx.destroy(); f.gfx = null; }
    }
    this._hearthfires = list.filter(f => now < f.until);
  },

  // ------------------------------------------------------------ Rekindle --

  /** "When your health falls below 30%, you burst into flame." Read off the
   *  live kit, so a switched-off Rekindle does nothing. */
  _checkRekindle() {
    const p = this.player;
    if (!p || p.dead || !(p.maxHp > 0)) return false;
    const live = this._liveKnown ? this._liveKnown() : (p.knownAbilities || {});
    let a = null;
    for (const v of Object.values(live)) { if (v && v.ability && v.ability.template === 'rekindle') { a = v.ability; break; } }
    if (!a || p.hp / p.maxHp >= (a.rekindleBelow || 0.3)) return false;
    const now = this.time ? this.time.now : 0;
    if (now < (p.rekindleReadyAt || 0)) return false;
    p.rekindleReadyAt = now + (a.rekindleCooldown || 180) * 1000;
    const perSec = Math.max(1, Math.round(p.maxHp * (a.rekindleHealPct || 0.3) / (a.rekindleSeconds || 5)));
    const cur = p.buffs.hot;
    p.buffs.hot = { perSec: (cur && cur.t > 0 ? cur.perSec : 0) + perSec, t: Math.max(a.rekindleSeconds || 5, cur ? cur.t : 0) };
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > (a.rekindleRadius || 96)) continue;
      this._damageMonster(m, a.rekindleBurst || 15, true, false, 'fire');
    }
    if (this._spawnRingFx) this._spawnRingFx(this.world.x, this.world.y, a.rekindleRadius || 96, a.color || '#ff7043');
    this._floatText(this.world.x, this.world.y - 52, a.name, a.color || '#ff7043');
    this._rekindled = (this._rekindled || 0) + 1;
    return true;
  },

  // ---------------------------------------------------- Cauterize Wounds --

  _castCauterize(a) {
    const p = this.player;
    // The health was paid at the door (`_rolePay`, hpCostPct).
    if (a.selfBurnStacks > 0 && this._applyDebuff) {
      this._applyDebuff(p, 'burn', { stacks: a.selfBurnStacks, duration: 4, _shared: true });
    }
    const tags = a.cleanseTags || [];
    let dispelled = 0;
    for (const [k, v] of Object.entries(p.debuffs || {})) {
      const def = conditionDef(k);
      if (!def || def.kind !== 'affliction') continue;
      if (!(def.tags || []).some(t => tags.includes(t))) continue;
      // The burn it just laid counts as the stacks it laid, whatever the
      // condition's own stack cap kept of them: four stacks, four balms.
      const n = k === 'burn' ? Math.max(a.selfBurnStacks || 1, (v && v.stacks) || 1) : Math.max(1, (v && v.stacks) || 1);
      dispelled += n;
      delete p.debuffs[k];
    }
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    if (dispelled > 0 && a.balm) {
      const perSec = a.balm.perSec * dispelled;
      const cur = p.buffs.hot;
      p.buffs.hot = { perSec: (cur && cur.t > 0 ? cur.perSec : 0) + perSec, t: Math.max(a.balm.duration, cur ? cur.t : 0) };
    }
    this._floatText(this.world.x, this.world.y - 46, `${a.name}: ${dispelled} dispelled`, a.color || '#ff7043');
    this._cauterized = (this._cauterized || 0) + 1;
    this._cauterizeLast = dispelled;
    return dispelled;
  },
};

export const ALT_TILE = TILE;
