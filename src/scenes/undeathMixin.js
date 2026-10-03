// ============================================================================
// ROUND 272 -- UNDEATH IN THE SCENE: RAISING, DRINKING, STEALING POWER.
//
// data/undeath.js decides which form a player is and writes the rider on each
// of the confluence's abilities. This file is what those riders DO:
//
//   LICH     deathmark    -- struck, then dead within the window: it rises
//            raiseOnCast  -- casting raises the nearest body
//            thrallChance -- (passive) any kill nearby may simply get up
//            the form     -- more raised dead at once, longer, harder
//
//   VAMPIRE  vampLeech    -- the ability drinks a share of what it deals
//            drainOnCast  -- casting drinks from everything close
//            lifesteal    -- (the form, and passives) every blow drinks
//            the form     -- an essence user's power bleeds into you, stacking
//
// Hooks, each one line in WorldScene: the cast wrapper, `_damageMonster`'s
// door, the swing, the kill, the summon cap, the person hits, and the stats.
// ============================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { SUMMON_TEMP_CAP } from '../data/summonRoles.js';
import { undeathPower, LICH, VAMPIRE } from '../data/undeath.js';

const THRALL_REACH = 8 * TILE;
const RAISE_REACH = 9 * TILE;

export const UndeathMixin = {
  /** `{ form, pw }` for an Undeath player, else null. */
  _undeathState() {
    const c = this.player && this.player.confluence;
    if (!c || c.divine || c.name !== 'Undeath' || !c.form) return null;
    return { form: c.form, pw: undeathPower(c.form, this.player.rank || 'normal') };
  },

  /** Sum of a passive rider across the confluence's known abilities. */
  _undeathPassiveSum(field) {
    // ROUND 279 -- only passives that are switched on count.
    const known = this._liveKnown ? this._liveKnown() : ((this.player && this.player.knownAbilities) || {});
    let n = 0;
    for (const e of Object.values(known)) {
      const a = e && e.ability;
      if (a && a.kind !== 'active' && typeof a[field] === 'number') n += a[field];
    }
    return n;
  },

  /** The cast, wrapped: the cast's own hits know which ability they came
   *  from, and a cast that happened pays its after-effects. */
  _undeathWrapCast(base, key, opts) {
    const entry = this.player && this.player.knownAbilities && this.player.knownAbilities[key];
    const a = entry && entry.ability;
    if (!a || !a.undeathForm) return base.call(this, key, opts);
    const cds = this.player.abilityCdByKey || {};
    const before = cds[key] || 0;
    const prev = this._undeathCastAbility;
    this._undeathCastAbility = a;
    let out;
    try { out = base.call(this, key, opts); } finally { this._undeathCastAbility = prev; }
    const after = (this.player.abilityCdByKey || {})[key] || 0;
    if (after > before + 1e-6) this._undeathAfterCast(a);
    return out;
  },

  /** What a successful cast does besides itself. */
  _undeathAfterCast(a) {
    if (a.raiseOnCast) {
      const c = (this._corpsesNear ? this._corpsesNear(this.world.x, this.world.y, RAISE_REACH) : [])[0];
      if (c) { this._raiseThrall(c.x, c.y); if (this._consumeCorpse) this._consumeCorpse(c); }
    }
    if (a.drainOnCast) {
      const r = a.drainOnCast.radius || 96, amt = a.drainOnCast.amount || 5;
      let drank = 0;
      for (const m of (this.monsters || [])) {
        if (!m.alive || Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > r + ((m.type && m.type.radius) || 0)) continue;
        this._damageMonster(m, amt, true, false, 'shadow');
        drank += amt;
      }
      for (const f of (this._personHostiles ? this._personHostiles() : [])) {
        if (!f.alive || Math.hypot(f.wx - this.world.x, f.wy - this.world.y) > r) continue;
        this._damageMonster(f, amt, true, false, 'shadow');
        drank += amt;
      }
      if (drank > 0) {
        this._healPlayer(drank, { quiet: true });
        this._floatText(this.world.x, this.world.y - 34, `+${drank} HP`, 0xc62828);
      }
      this._undeathDrank = (this._undeathDrank || 0) + drank;
    }
  },

  /** An Undeath ability's blow landed on `m` for `dmg`. */
  _undeathOnHit(m, dmg, a) {
    if (!m || !a || !a.undeathForm || !(dmg > 0)) return;
    if (a.undeathForm === LICH && a.deathmark && !m.person) {
      m.deathmarkUntil = (this.time ? this.time.now : 0) + a.deathmark * 1000;
    }
    if (a.undeathForm === VAMPIRE && a.vampLeech) {
      const back = Math.max(1, Math.round(dmg * a.vampLeech));
      this._healPlayer(back, { quiet: true });
      this._undeathDrank = (this._undeathDrank || 0) + back;
    }
  },

  /** A weapon blow on a creature: the vampire's standing lifesteal. */
  _undeathSwing(m, dmg) {
    const st = this._undeathState();
    if (!st || st.form !== VAMPIRE || !(dmg > 0)) return;
    const frac = st.pw.lifesteal + this._undeathPassiveSum('lifestealBoon');
    const back = Math.max(1, Math.round(dmg * frac));
    this._healPlayer(back, { quiet: true });
    this._undeathDrank = (this._undeathDrank || 0) + back;
  },

  /** Any blow on an essence user (a person): life, and a stack of power. */
  _undeathPersonHit(c, dmg) {
    const st = this._undeathState();
    if (!st || st.form !== VAMPIRE || !(dmg > 0)) return;
    const frac = st.pw.lifesteal + this._undeathPassiveSum('lifestealBoon');
    this._healPlayer(Math.max(1, Math.round(dmg * frac)), { quiet: true });
    const now = this.time ? this.time.now : 0;
    const s = this._stolenPower && this._stolenPower.until > now ? this._stolenPower : { stacks: 0 };
    s.stacks = Math.min(st.pw.maxStacks, s.stacks + 1);
    s.until = now + st.pw.stackSeconds * 1000;
    this._stolenPower = s;
    if (c && Number.isFinite(c.x)) this._floatText(c.x, c.y - 48, `Power drunk ×${s.stacks}`, '#e57373');
  },

  /** The damage multiplier stolen power gives the player's side right now. */
  _undeathPowerMult() {
    const s = this._stolenPower;
    const st = s && this._undeathState();
    if (!s || !st || st.form !== VAMPIRE) return 1;
    if (s.until <= (this.time ? this.time.now : 0)) { this._stolenPower = null; return 1; }
    return 1 + s.stacks * st.pw.powerPerStack;
  },

  /** A creature died. A lich's dead do not stay down. */
  _undeathOnKill(m) {
    const st = this._undeathState();
    if (!st || st.form !== LICH || !m) return false;
    const now = this.time ? this.time.now : 0;
    let rise = !!(m.deathmarkUntil && m.deathmarkUntil > now);
    if (!rise && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= THRALL_REACH) {
      const chance = st.pw.killRise + this._undeathPassiveSum('thrallChance');
      rise = Math.random() < chance;
    }
    if (!rise) return false;
    this._raiseThrall(m.wx, m.wy);
    return true;
  },

  /** One thrall, standing where the body fell. */
  _raiseThrall(x, y) {
    const st = this._undeathState();
    const pw = st && st.form === LICH ? st.pw : undeathPower(LICH, this.player.rank || 'normal');
    const base = Math.max(4, Math.round(((this.player.confluence && this.player.confluence.base) || 8) * (1 + pw.thrallMight)));
    const rec = this._spawnSummon({
      name: 'Thrall', template: 'activeSummon', summonKind: 'creature', summonFamily: 'skeleton',
      summonTemporary: true, summonDuration: pw.thrallSeconds, summonMoves: true,
      summonDmg: base, summonRange: 60, color: '#b0bec5', base,
    });
    if (rec) {
      rec.wx = x; rec.wy = y; rec.raised = true; rec.thrall = true;
      const p = isoProject(x, y);
      if (rec.sprite) { rec.sprite.setPosition(p.x, p.y); rec.sprite.setDepth(isoDepth(x, y) + 4); }
      this._thrallsRaised = (this._thrallsRaised || 0) + 1;
      this._floatText(x, y - 40, 'Rises', '#b0bec5');
    }
    return rec;
  },

  /** How many short-lived summons may stand at once. A lich's horde. */
  _undeathTempCap() {
    const st = this._undeathState();
    return st && st.form === LICH ? Math.max(SUMMON_TEMP_CAP, st.pw.tempCap) : SUMMON_TEMP_CAP;
  },

  /** The form's standing stats, folded into the passive mods. */
  _undeathMods(mods) {
    const st = this._undeathState();
    if (!st || !mods) return;
    mods.resistBonus = mods.resistBonus || {};
    mods.resistBonus.shadow = (mods.resistBonus.shadow || 0) + st.pw.shadowResist;
  },
};
