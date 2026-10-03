// ============================================================================
// ROUND 287 -- HIS THIRD PASTE, RUNNING (batch03, first half).
//
//   "Missing cannon abilities (save this time)"
//   "All cannon abilities need to be working in game, add effects as needed"
//   Rungs the game has no system for: "In-game analogues" (round 284).
//
// Same shape as canonRuntimeMixin.js: `_canonPrecheck4` before the cost,
// `_canon_<key>` for the cast, `_tickCanon4` every frame, and a handful of
// named hooks the rest of the game calls. The card is always his text; the
// numbers are canonRuntime.js. Where a rung needed an analogue, the comment on
// its handler says which, so the notes can list them for his review.
// ============================================================================
import { conditionDef, hasTag, TAG } from '../data/debuffs.js';
import { CANON_RT, reached, rankAt } from '../data/canonRuntime.js';
import { isoProject, isoDepth } from '../data/iso.js';
import { subtypeOf, monsterThreatTier } from '../data/monsters.js';
import { formFor, tintFor } from '../data/chrysalis.js';
import { monsterDebuffsCached } from '../data/monsterDebuffs.js';
import { CANON_CAST_KEYS } from './canonRuntimeMixin.js';
import { CANON_TEXT } from '../data/canonText.js';

/** The pastes this layer casts. */
export const CANON4_CAST_KEYS = [
  'instantAdept', 'blessingOfRelentlessness', 'blessingOfReadiness',
  'astralLantern', 'mirrorMagic', 'powerThief', 'powerLock', 'bagOfTricks',
  'lightningTether', 'forceTether', 'pitOfTheReaper', 'runeTrap', 'baitAndSwitch',
  'absorbingShield', 'manaShield', 'bolster', 'chrysalisGolem', 'giantsMight',
  'fountainOfLife', 'grandRenewal', 'wrathOfTheMagister', 'toolsOfTheMagister',
  'bloodMagic', 'juxtapose', 'enactRitual', 'runeMantle', 'runeGate',
  'spiritReaper', 'shieldBreaker', 'spartoi',
];
for (const k of CANON4_CAST_KEYS) CANON_CAST_KEYS.add(k);
/** Held (passive) pastes this layer runs. */
export const CANON4_PASSIVE_KEYS = ['masterful', 'lordOfMagic', 'eldritchEyes', 'dragonsMightAura'];

const rankPow = (rank) => 1 + 0.5 * rankAt(rank);
const RANKS_ALL = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
const rankIdx = (r) => Math.max(0, RANKS_ALL.indexOf(String(r || 'normal').toLowerCase()));
const col = (hex) => (typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex);

/** Harmful conditions a "non-wound" cleanse reaches: everything harmful that
 *  is not a wound. */
const isWound = (d) => d && (hasTag(d, 'wound') || hasTag(d, 'wounding') || /wound/i.test(d.label || ''));

/** Wrath of the Magister's colours: what each does in this game. */
const WRATH = {
  red: { label: 'Red', color: '#ef5350' },
  yellow: { label: 'Yellow', color: '#ffee58' },
  pink: { label: 'Pink', color: '#f48fb1' },
  green: { label: 'Green', color: '#66bb6a' },
  purple: { label: 'Purple', color: '#ab47bc' },
  orange: { label: 'Orange', color: '#ffa726' },
  blue: { label: 'Blue', color: '#42a5f5' },
};

/** Rune Mantle's runes: "Each rune is associated with a specific effect that
 *  affects the ally or an enemy." */
const MANTLE_RUNES = ['ward', 'mend', 'spark', 'bind', 'haste'];

/** Bag of Tricks bronze: "gain a random boon". */
const BAG_BOONS = [
  { id: 'keen', label: 'Keen', dmg: 0.08 },
  { id: 'sturdy', label: 'Sturdy', armor: 0.04 },
  { id: 'swift', label: 'Swift', speed: 0.05 },
  { id: 'warding', label: 'Warding', dr: 0.04 },
];

export const CanonRuntime4Mixin = {
  // ==========================================================================
  // SMALL THINGS
  // ==========================================================================
  _c4() {
    if (!this._c4State) this._c4State = { runes: [], fountains: [], circles: [], decoys: [], lamps: [], afterFx: [] };
    return this._c4State;
  },
  _c4Here(x, y, r) { return Math.hypot(x - this.world.x, y - this.world.y) <= r; },
  /** An ally for a spell that names one. `self`: fall back to the caster. */
  _c4Ally(range, self = false) {
    const al = this._canonAlly(range);
    if (al) return al;
    return self ? { kind: 'player', ref: this.player, x: this.world.x, y: this.world.y } : null;
  },
  /** Where an aimed conjuration lands: the target if there is one in reach,
   *  else `dist` ahead along the aim. */
  _c4AimPoint(range, dist = 110) {
    const t = this._canonTarget(range);
    if (t) return { x: t.wx, y: t.wy, t };
    const ang = this.player.aimAngle || 0;
    return { x: this.world.x + Math.cos(ang) * dist, y: this.world.y + Math.sin(ang) * dist, t: null };
  },
  _c4Monsters(x, y, r) {
    return (this.monsters || []).filter(m => m.alive && !m.person && Math.hypot(m.wx - x, m.wy - y) <= r + ((m.type && m.type.radius) || 0));
  },
  _c4Ring(x, y, r, color) { if (this._spawnRingFx) this._spawnRingFx(x, y, r, color); },
  _c4Float(x, y, text, color) { this._floatText(x, y, text, color || '#b39ddb'); },
  /** Is this held passive on, and at what rank? */
  _c4Held(ck) {
    if (!this._canonPassiveOn(ck)) return null;
    return this._canonHeldRank(ck);
  },
  /** Heal a {kind, ref} ally, or the player. */
  _c4Heal(t, amount, color = '#a5d6a7') {
    if (!(amount > 0)) return;
    if (!t || t.kind === 'player') { this._healFriendly({ kind: 'player' }, Math.round(amount), color); return; }
    this._healFriendly(t, Math.round(amount), color);
  },
  /** Knock a monster along a direction, honouring its momentum resistance. */
  _c4Shove(m, ux, uy, dist) {
    if (!m || !m.alive) return;
    const res = this._momentumResist ? this._momentumResist(m) : 0;
    const d = dist * (1 - Math.min(0.9, res || 0));
    const mv = this._tryMove ? this._tryMove(m.wx, m.wy, ux * d, uy * d, (m.type && m.type.radius) || 10) : { wx: m.wx + ux * d, wy: m.wy + uy * d };
    m.wx = mv.wx; m.wy = mv.wy;
  },

  // ==========================================================================
  // BEFORE THE COST
  // ==========================================================================
  /** Recasts that do not start a new cast: they end or fire the thing the
   *  last one left standing, and cost nothing. */
  _canonFreeRecast(ck) {
    const s = this._c4();
    const p = this.player;
    if (ck === 'lightningTether') return !!s.lightningRod;
    if (ck === 'forceTether') return !!s.forceRod;
    if (ck === 'manaShield') return !!(p.canonManaShield && p.canonManaShield.on);
    if (ck === 'runeTrap') {
      const k = this._canonKeyFor('runeTrap');
      const mode = k ? this._canonModeOf('runeTrap', this._canonRankOf(k)) : null;
      return !!(s.runes.length && mode && mode.id !== 'prox');
    }
    if (ck === 'grandRenewal') return !!(p.canonChannel && p.canonChannel.kind === 'renewal');
    if (ck === 'wrathOfTheMagister') return !!(p.canonChannel && p.canonChannel.kind === 'void');
    return !!(this._canonFreeRecast5 && this._canonFreeRecast5(ck));   // ROUND 288
  },

  _canonPrecheck4(ck, a, rank, rt, mode, spec, key) {
    const p = this.player;
    const say = (t) => { this._canonSay(`${a.name} — ${t}`); return null; };
    // A free recast keeps the cooldown that is already running.
    if (this._canonFreeRecast(ck)) {
      spec.cost = null; spec.costs = null;
      this._canonCtx.free = true;
      this._canonCtx.keepCd = (p.abilityCdByKey && p.abilityCdByKey[key]) || 0;
      return spec;
    }
    const needEnemy = (range) => {
      const t = this._canonTarget(range);
      if (!t) return false;
      this._canonCtx.target = t;
      return true;
    };
    switch (ck) {
      case 'blessingOfRelentlessness': {
        // "Reset all cooldowns of a single ally of bronze-rank or below."
        const al = this._canonAlly(rt.range);
        if (!al) return say('no ally in reach');
        const r = al.kind === 'party' ? rankIdx(al.ref.rank) : 1;
        if (r > rankIdx('bronze')) return say(`${al.ref.name || 'that ally'} is above bronze rank`);
        this._canonCtx.ally = al;
        return spec;
      }
      case 'blessingOfReadiness': {
        // "This spell can only affect an ally and not yourself."
        const al = this._canonAlly(rt.range);
        if (!al || al.kind !== 'party') return say('no ally in reach');
        this._canonCtx.ally = al;
        return spec;
      }
      case 'bolster': {
        // "Cannot be used on self."
        const al = this._canonAlly(rt.range);
        if (!al || al.kind !== 'party') return say('no ally in reach');
        this._canonCtx.ally = al;
        return spec;
      }
      case 'giantsMight': {
        this._canonCtx.ally = this._c4Ally(rt.range, true);
        return spec;
      }
      case 'absorbingShield': case 'runeMantle': {
        this._canonCtx.ally = this._c4Ally(rt.range, true);
        return spec;
      }
      case 'grandRenewal': {
        this._canonCtx.ally = this._targets && this._targets.ally ? this._c4Ally(rt.range, true) : { kind: 'player', ref: p, x: this.world.x, y: this.world.y };
        return spec;
      }
      case 'powerThief': {
        if (mode && mode.id === 'use') {
          if (!p.canonStolen) return say('nothing stolen');
          this._canonCtx.target = this._canonTarget(rt.range);
          return spec;
        }
        // "This ability cannot be used again until the copied ability is used."
        if (p.canonStolen) return say(`use ${p.canonStolen.label} first`);
        if (!needEnemy(rt.range)) return say('no target');
        return spec;
      }
      case 'powerLock': case 'juxtapose': {
        if (!needEnemy(rt.range)) return say('no target');
        if (ck === 'juxtapose' && this._canonTeleportShut && false) return null;
        return spec;
      }
      case 'wrathOfTheMagister': {
        if (mode && mode.id === 'circle') return spec;
        if (!needEnemy(rt.range)) return say('no target');
        return spec;
      }
      case 'mirrorMagic': {
        // "For a short time after a nearby ally uses a spell, you may use the
        //  same spell one time ... the same cost and cooldown as the original."
        const m = this._mirrorable;
        const now = this._clockT || 0;
        if (!m || now - m.at > rt.window || m.used) return say('no spell to mirror');
        const ab = m.ability;
        spec.cost = ab.cost && ab.cost.type ? { type: ab.cost.type, amount: ab.cost.amount || 0 } : { type: 'mana', amount: 8 };
        spec.cooldown = ab.cooldown || 0;
        return spec;
      }
      case 'spiritReaper': case 'shieldBreaker': {
        if (ck === 'shieldBreaker' && !this._canonHeavyInHand()) return say('needs a heavy weapon');
        return spec;
      }
      case 'bloodMagic': {
        const frac = mode && mode.id === 'ritual' ? CANON_RT.bloodMagic.ritualHpFrac : CANON_RT.bloodMagic.hpFrac;
        if (p.hp <= p.maxHp * frac + 1) return say('not enough life');
        return spec;
      }
      case 'runeGate': case 'bagOfTricks': {
        if (mode && mode.id === 'trick') {
          const w = p.hands.right || p.hands.left;
          if (!w) return say('no weapon equipped');
        }
        if (mode && mode.id === 'gate' && this._canonTeleportShut()) return null;
        return spec;
      }
      case 'baitAndSwitch': {
        if (!(this._targets && this._targets.ally) && this._canonTeleportShut()) return null;
        return spec;
      }
      default: return this._canonPrecheck5 ? this._canonPrecheck5(ck, a, rank, rt, mode, spec, key) : spec;   // ROUND 288
    }
  },

  // ==========================================================================
  // ADEPT
  // ==========================================================================
  /** Instant Adept: the transformation (round 201's `instantAdept`), and its
   *  bronze and silver rungs while it lasts. */
  _canon_instantAdept(a, key, rank) {
    if (this._applyTransform) this._applyTransform(a, rank);
    this.player.canonAdept = { rank, hits: 0 };
    this._c4Ring(this.world.x, this.world.y, 70, a.color || '#ffd54f');
  },
  /** Bronze: "wall-running and water-walking" -- water under foot, and a
   *  ledge climbed at a run (the analogue for a wall). */
  _instantAdeptMove() {
    const p = this.player;
    const t = p.transform;
    if (!t || t.key !== 'instantAdept' || !p.canonAdept) return null;
    return reached(p.canonAdept.rank, 'bronze') ? { water: true, ledgeUp: true } : null;
  },
  /** How many levels the player can take UP a ledge right now, on foot. */
  _canClimbNow() {
    const m = this._instantAdeptMove && this._instantAdeptMove();
    const m5 = this._canonMove5 ? this._canonMove5().climb : 0;   // ROUND 288 -- Free Runner, flight
    return Math.max(m && m.ledgeUp ? 1.05 : 0, m5 || 0);
  },
  /** Silver: "additional special attacks ... based on equipped weapons".
   *  Every fourth landed swing while transformed is a special attack shaped
   *  by the weapon in hand. Called from the swing hit. */
  _instantAdeptSwing(m) {
    const p = this.player;
    const st = p.canonAdept;
    if (!st || !p.transform || p.transform.key !== 'instantAdept' || !reached(st.rank, 'silver') || !m || !m.alive) return;
    st.hits = (st.hits || 0) + 1;
    if (st.hits % CANON_RT.instantAdept.strikeEvery) return;
    const w = p.hands.right || p.hands.left || 'unarmed';
    const id = String((this._weaponBaseId ? this._weaponBaseId(w) : w) || '');
    const dmg = Math.max(2, Math.round((p.dmg || 10) * CANON_RT.instantAdept.strikeMult * rankPow(st.rank)));
    if (/bow|gun|crossbow|sling/i.test(id)) {
      for (const o of this._c4Monsters(m.wx, m.wy, 90)) this._canonHurt(o, dmg, 'physical');
      this._c4Float(m.wx, m.wy - 40, 'Volley', '#ffd54f');
    } else if (/knife|dagger|sword|blade|sickle/i.test(id)) {
      this._canonHurt(m, dmg, 'physical'); this._canonInflict(m, 'bleed');
      this._c4Float(m.wx, m.wy - 40, 'Flurry', '#ffd54f');
    } else {
      this._canonHurt(m, dmg, 'physical'); this._c4Shove(m, (m.wx - this.world.x) / 40, (m.wy - this.world.y) / 40, 30);
      this._c4Float(m.wx, m.wy - 40, 'Crush', '#ffd54f');
    }
  },

  /** "Reset all cooldowns of a single ally of bronze-rank or below." Bronze:
   *  "a powerful, ongoing mana and stamina recovery effect." */
  _canon_blessingOfRelentlessness(a, key, rank, ctx) {
    const rt = CANON_RT.blessingOfRelentlessness;
    const al = ctx.ally;
    if (!al) return;
    if (al.kind === 'party') {
      const m = al.ref;
      for (const slot of (m.kit || [])) slot.cd = 0;
      m.castCd = 0; m.atkCd = 0;
      if (reached(rank, 'bronze')) m.canonRelentless = { t: rt.regenSecs, mana: rt.manaPerSec * rankPow(rank), stamina: rt.staminaPerSec * rankPow(rank) };
      this._c4Float(m.x, m.y - 50, 'Relentless', a.color || '#fff59d');
    } else if (al.kind === 'summon') {
      al.ref.atkT = 0;
    }
    this._c4Ring(al.x, al.y, 50, a.color || '#fff59d');
    this._relentlessCasts = (this._relentlessCasts || 0) + 1;
  },

  /** "The cooldown of the next ability used by the target is reduced by up
   *  to one minute. The cooldown of this ability is equal to the time taken."
   *  Bronze: up to ten minutes. Silver: "can be used one additional time
   *  while on cooldown. The cooldown incurred by the second use is added to
   *  the original." Here the clock is written when the ally's ability is. */
  _canon_blessingOfReadiness(a, key, rank, ctx) {
    const rt = CANON_RT.blessingOfReadiness;
    const m = ctx.ally && ctx.ally.ref;
    if (!m) return;
    const p = this.player;
    const cap = reached(rank, 'bronze') ? rt.capBronze : rt.capIron;
    const st = p.canonReadiness || (p.canonReadiness = { uses: 0, banked: 0 });
    st.uses += 1;
    m.canonReadiness = { cap, key, t: rt.window, second: reached(rank, 'silver') && st.uses === 1 };
    // Until the ally spends it, the clock sits at its floor; a silver first
    // use leaves the second one open.
    p.abilityCdByKey[key] = rt.floor;
    this._c4Float(m.x, m.y - 50, 'Ready', a.color || '#fff59d');
  },
  /** The ally's next ability, as its cooldown is written. */
  _readinessSpent(m, pick) {
    const r = m && m.canonReadiness;
    if (!r || !pick) return;
    const p = this.player;
    const removed = Math.min(r.cap, pick.cd || 0);
    pick.cd = Math.max(0, (pick.cd || 0) - removed);
    m.canonReadiness = null;
    const st = p.canonReadiness || (p.canonReadiness = { uses: 0, banked: 0 });
    st.banked += Math.max(CANON_RT.blessingOfReadiness.floor, removed);
    const silverFirst = r.second;
    if (!silverFirst) {
      p.abilityCdByKey[r.key] = Math.max(p.abilityCdByKey[r.key] || 0, st.banked);
      st.uses = 0; st.banked = 0;
    }
    this._c4Float(m.x, m.y - 50, `-${Math.round(removed)}s`, '#fff59d');
    this._readinessTaken = (this._readinessTaken || 0) + removed;
  },

  // ==========================================================================
  // MAGIC
  // ==========================================================================
  /** Astral Lantern: summoned (Lamp), subsumed into the eyes (Lamp again),
   *  released (Lamp again); Beam from the eyes; Core refilled with mana. */
  _canon_astralLantern(a, key, rank, ctx) {
    const rt = CANON_RT.astralLantern;
    const p = this.player;
    const L = p.canonLantern || (p.canonLantern = { out: false, subsumed: false, core: rt.coreMax });
    const mode = ctx.mode ? ctx.mode.id : 'lantern';
    if (mode === 'refill') {
      L.core = Math.min(rt.coreMax, L.core + rt.refill);
      this._canonSay(`${a.name}: core ${Math.round(L.core)}`, '#b39ddb');
      return;
    }
    if (mode === 'beam') {
      if (!L.subsumed) { this._canonSay(`${a.name} — not in your eyes`); p.mana += 8; return; }
      const t = this._canonTarget(rt.beamRange);
      if (!t) { this._canonSay(`${a.name} — no target`); p.mana += 8; return; }
      if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, '#b39ddb', 0, rt.beamRange, true);
      this._canonHurt(t, rt.beamDmg * this._canonPow(a, rank), 'disruptive');
      return;
    }
    if (!L.out && !L.subsumed) { L.out = true; L.core = Math.max(L.core, rt.coreMax * 0.5); }
    else if (L.out) { L.out = false; L.subsumed = true; this._canonSay('Lantern: in your eyes', '#b39ddb'); }
    else { L.subsumed = false; L.out = true; this._canonSay('Lantern: out', '#b39ddb'); }
    this._recomputeDerivedStats();
    if (this._rebuildFamiliars) this._rebuildFamiliars();
  },

  /** Power Thief: a magical bolt that steals; then the stolen thing, once. */
  _canon_powerThief(a, key, rank, ctx) {
    const rt = CANON_RT.powerThief;
    const p = this.player;
    if (ctx.mode && ctx.mode.id === 'use') { this._useStolen(a, rank, ctx.target); return; }
    const t = ctx.target;
    if (!t || !t.alive) return;
    if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, '#7e57c2', 0, rt.range, true);
    this._canonHurt(t, rt.dmg * this._canonPow(a, rank), 'disruptive');
    const list = this._monsterAbilities(t);
    // Bronze: "You can choose a specific ability of the target." The pick is
    // the strongest one it has (the badge cannot name a monster's skills).
    const pick = reached(rank, 'bronze') ? list[0] : list[Math.floor(Math.random() * list.length)];
    if (!pick) return;
    p.canonStolen = { ...pick, from: t, t: rt.keepSecs, rank };
    t.canonStolen = pick.kind;
    (p.canonModes = p.canonModes || {}).powerThief = 'use';
    this._c4Float(t.wx, t.wy - 46, `Stolen: ${pick.label}`, '#b39ddb');
    this._powerThefts = (this._powerThefts || 0) + 1;
  },
  /** What a monster can "use": the inherent abilities of this game's
   *  creatures, strongest first. */
  _monsterAbilities(m) {
    const out = [];
    const ty = m.type || {};
    if (m.gait === 'kite' || ty.gait === 'kite') out.push({ kind: 'shot', label: `${ty.name || 'its'} shot`, element: m.dmgElement || null });
    if (this._isWarder && this._isWarder(m)) out.push({ kind: 'ward', label: 'Ward' });
    const debs = monsterDebuffsCached(m.key, ty.family, m.dmgElement) || [];
    const first = debs.find(e => e && (e.key || e.debuff) && conditionDef(e.key || e.debuff));
    if (first) { const k = first.key || first.debuff; out.push({ kind: 'debuff', label: conditionDef(k).label, debuff: k }); }
    if (m.dmgElement) out.push({ kind: 'bolt', label: `${m.dmgElement} bolt`, element: m.dmgElement });
    if (ty.dmgType === 'magical' || /elemental|ethereal/.test(subtypeOf(m) || '')) out.push({ kind: 'bolt', label: 'Arcane bolt', element: m.dmgElement || 'disruptive' });
    out.push({ kind: 'frenzy', label: 'Frenzy' });
    return out;
  },
  /** "functions at your rank, not the rank of the target. You may not use the
   *  ability more than once." Then the target has it back. */
  _useStolen(a, rank, target) {
    const p = this.player;
    const s = p.canonStolen;
    if (!s) return;
    const rt = CANON_RT.powerThief;
    const pow = this._canonPow(a, s.rank || rank);
    const t = target && target.alive ? target : this._canonTarget(rt.range);
    if ((s.kind === 'shot' || s.kind === 'bolt' || s.kind === 'debuff') && t) {
      if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, '#7e57c2', 0, rt.range, true);
      this._canonHurt(t, rt.useDmg * pow, s.element || (s.kind === 'shot' ? 'physical' : 'disruptive'));
      if (s.debuff) this._canonInflict(t, s.debuff);
    } else if (s.kind === 'ward') {
      p.canonAbsorb = { t: CANON_RT.absorbingShield.secs, rank: s.rank || rank, mot: false };
    } else {
      p.buffs.speed = { mult: 1.25, t: 6 };
      p.canonFrenzyT = 6;
    }
    this._c4Float(this.world.x, this.world.y - 50, s.label, '#b39ddb');
    if (s.from) s.from.canonStolen = null;
    p.canonStolen = null;
    (p.canonModes = p.canonModes || {}).powerThief = 'steal';
    this._stolenUsed = (this._stolenUsed || 0) + 1;
  },

  /** Power Lock: a curse. "When the target uses an ability, a random other
   *  ability also goes on cooldown ... If the target has no other abilities,
   *  the cooldown on the ability used is doubled." Bronze: the mana it would
   *  have cost, or "disruptive-force damage commensurate". */
  _canon_powerLock(a, key, rank, ctx) {
    const t = ctx.target;
    if (!t || !t.alive) return;
    t.canonPowerLock = { t: CANON_RT.powerLock.secs, rank };
    this._canonLink(t, '#7e57c2');
    this._c4Float(t.wx, t.wy - 40, a.name, '#b39ddb');
  },
  /** Called whenever a monster uses something: a swing, a shot, a ward. */
  _canonMonsterActed(m, kind, victim = null) {
    if (!m || !m.alive) return;
    if (this._canonMonsterActed5) this._canonMonsterActed5(m, kind, victim);   // ROUND 288 -- [Bad Karma]
    if (!m.alive) return;
    const L = m.canonPowerLock;
    if (L && L.t > 0) {
      const others = this._monsterAbilities(m).filter(x => x.kind !== kind && x.kind !== 'frenzy');
      if (others.length) {
        // The other ability goes on cooldown as if used: the shooter's shot
        // and the swing share one clock here, so it is that clock, again.
        m.atkCd = Math.max(m.atkCd || 0, (m.type.atkCooldown || 1) * 2);
      } else {
        m.atkCd = (m.atkCd || m.type.atkCooldown || 1) * 2;
      }
      if (reached(L.rank, 'bronze')) {
        const hit = Math.max(1, Math.round((m.type.atkDamage || 6) * CANON_RT.powerLock.disruptFrac * rankPow(L.rank)));
        this._canonHurt(m, hit, 'disruptive');
      }
      this._powerLockTrips = (this._powerLockTrips || 0) + 1;
    }
    // Wrath of the Magister, Purple: "Expending mana harms the target."
    const w = m.canonWrath;
    if (w && w.purple > 0) {
      this._canonHurt(m, Math.max(1, Math.round((m.type.atkDamage || 6) * CANON_RT.wrathOfTheMagister.purpleFrac)), 'disruptive');
    }
  },

  /** Wrath of the Magister. Each colour lands on the locked target and they
   *  add up; Void channels; bronze's circle is a place. */
  _canon_wrathOfTheMagister(a, key, rank, ctx) {
    const rt = CANON_RT.wrathOfTheMagister;
    const p = this.player;
    if (ctx.free) {   // a second press during the Void channel lets it go
      p.canonChannel = null;
      this._canonSay('Void released', '#ce93d8');
      p.abilityCdByKey[key] = ctx.keepCd;
      return;
    }
    const mode = ctx.mode ? ctx.mode.id : 'red';
    if (mode === 'circle') {
      this._c4Circle('wrath', rt.circleSecs, rt.circleRadius, rt.circleBonus * rankPow(rank), a.color || '#ce93d8');
      return;
    }
    const t = ctx.target;
    if (!t || !t.alive) return;
    if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, (WRATH[mode] || { color: '#ce93d8' }).color, 0, rt.range, true);
    if (mode === 'void') {
      // "This effect requires magic to be channelled into the target at an
      //  extreme mana cost until sufficient mana has been channelled."
      p.canonChannel = { kind: 'void', target: t, fed: 0, rank, a };
      this._canonSay('Void: channelling', '#ce93d8');
      return;
    }
    const w = t.canonWrath || (t.canonWrath = {});
    const secs = rt.secs;
    w[mode] = secs;
    switch (mode) {
      case 'red': this._canonInflict(t, 'burn', rt.burnStacks); break;
      case 'yellow': this._canonInflict(t, 'slowAttack'); break;       // abilities cost more: slower to use
      case 'pink': this._canonInflict(t, 'vulnerable'); break;         // resistances reduced
      case 'green': this._canonInflict(t, 'poison', rt.poisonStacks); break;   // its blood poisons it
      case 'blue': this._canonInflict(t, 'slowMove'); break;
      default: break;                                                  // purple, orange: read by hooks
    }
    // "frost burn if combined with blue/red"
    if ((w.red > 0 && w.blue > 0) && !w.frostBurnT) {
      w.frostBurnT = secs;
      this._canonHurt(t, rt.frostBurn * this._canonPow(a, rank), 'cold');
      this._c4Float(t.wx, t.wy - 46, 'Frost burn', '#b3e5fc');
    }
    this._c4Float(t.wx, t.wy - 36, WRATH[mode] ? WRATH[mode].label : mode, WRATH[mode] ? WRATH[mode].color : '#ce93d8');
  },

  _canon_toolsOfTheMagister(a, key, rank, ctx) {
    const rt = CANON_RT.toolsOfTheMagister;
    if (ctx.mode && ctx.mode.id === 'circle') {
      this._c4Circle('tools', rt.circleSecs, rt.circleRadius, rt.circleBonus * rankPow(rank), a.color || '#ce93d8');
      return;
    }
    // Iron: "Utilise specialty magic tools, vehicles and weapons" -- held: the
    // magical-tools proficiency and vehicles, while the ability is known.
    this._canonSay(`${a.name}: your tools answer you`, '#ce93d8');
  },
  /** A ritual circle: "the magical attacks of spells, staves and wands have
   *  increased effect" (Wrath) / "the magical attack of a staff or wand"
   *  (Tools). Blood Magic's ritual charge and a mana lamp feed it. */
  _c4Circle(kind, secs, radius, bonus, color) {
    const s = this._c4();
    const boost = this._ritualBoost();
    s.circles = s.circles.filter(c => c.kind !== kind);
    s.circles.push({ kind, x: this.world.x, y: this.world.y, t: secs * boost, radius: radius * boost, bonus: bonus * boost, color });
    this._c4Ring(this.world.x, this.world.y, radius, color);
    this._canonSay(kind === 'wrath' ? 'Magister’s circle' : 'Ritual circle', color);
  },
  /** Standing in a circle: the bonus to magical attacks. */
  _c4CircleBonus(staffOnly = false) {
    let b = 0;
    for (const c of this._c4().circles) {
      if (c.t <= 0 || Math.hypot(c.x - this.world.x, c.y - this.world.y) > c.radius) continue;
      if (staffOnly || c.kind === 'wrath' || c.kind === 'tools') b = Math.max(b, c.bonus);
    }
    return b;
  },

  // ==========================================================================
  // MIRROR, DIMENSION
  // ==========================================================================
  /** A companion just cast: Mirror Magic can use it, Bolster lifts it, and
   *  Blessing of Readiness is waiting for it. Returns a damage multiplier. */
  _canonPartyCastHook(m, ability) {
    if (!m || !ability) return 1;
    let mult = 1;
    if (this._canonKeyFor('mirrorMagic') && Math.hypot(m.x - this.world.x, m.y - this.world.y) <= CANON_RT.mirrorMagic.allyRange) {
      this._mirrorable = { ability, from: m, at: this._clockT || 0, used: false };
    }
    if (m.canonBolster && m.canonBolster.t > 0) {
      mult *= m.canonBolster.mult;
      if (m.canonBolster.costCut) m.mana = Math.min(m.maxMana || 100, (m.mana || 0) + (m.canonBolster.costCut));
      this._c4Float(m.x, m.y - 58, 'Bolstered', '#9ccc65');
      m.canonBolster = null;
      this._bolsterSpent = (this._bolsterSpent || 0) + 1;
    }
    return mult;
  },
  /** "you may use the same spell one time. The strength of the spell you cast
   *  is based on the rank of this ability and your attributes." */
  _canon_mirrorMagic(a, key, rank) {
    const rec = this._mirrorable;
    if (!rec) return;
    rec.used = true;
    const t = this._canonTarget(CANON_RT.mirrorMagic.range);
    const me = { x: this.world.x, y: this.world.y, target: t, hp: this.player.hp, maxHp: this.player.maxHp, name: 'You', kind: 'player' };
    const mult = this._canonPow(a, rank) * ((this.player.dmg || 10) / 10);
    try { this._guardCastAbility(me, rec.ability, mult); } catch (e) { /* a spell the mirror cannot hold */ }
    this.player.hp = Math.min(this.player.maxHp, Math.max(this.player.hp, me.hp));
    this._c4Float(this.world.x, this.world.y - 58, `Mirrored: ${rec.ability.name}`, '#e1f5fe');
    this._mirrorCasts = (this._mirrorCasts || 0) + 1;
  },

  /** Bag of Tricks: "a personal, dimensional storage space" (the vault,
   *  opened wherever you are); silver's weapon strike. */
  _canon_bagOfTricks(a, key, rank, ctx) {
    if (ctx.mode && ctx.mode.id === 'trick') {
      const t = this._canonTarget(120);
      this._canonStrike(a, key, rank, { bonusMult: CANON_RT.bagOfTricks.strikeMult, reach: 120 });
      if (t) this._c4Float(t.wx, t.wy - 40, 'Trick', '#ce93d8');
      return;
    }
    if (this._openVault) this._openVault();
    this._bagOpened = (this._bagOpened || 0) + 1;
  },
  /** Bronze: gear equipped while the Bag is held carries a random boon.
   *  Rolled once per item, kept on the item. */
  _bagBoonFor(item) {
    if (!item) return null;
    const r = this._canonHeldRank('bagOfTricks');
    if (!r || !reached(r, 'bronze')) return null;
    const roll = () => BAG_BOONS[Math.floor(Math.random() * BAG_BOONS.length)].id;
    let id;
    if (typeof item === 'object') { if (!item.bagBoon) item.bagBoon = roll(); id = item.bagBoon; }
    else {   // a weapon in hand is an id: its boon is kept beside it
      const map = this.player.canonBagBoons || (this.player.canonBagBoons = {});
      if (!map[item]) map[item] = roll();
      id = map[item];
    }
    return BAG_BOONS.find(b => b.id === id) || null;
  },

  /** Juxtapose: "Swap the location of two allies and/or enemies." The
   *  target, and the nearest other creature it can be seen beside. */
  _canon_juxtapose(a, key, rank, ctx) {
    const rt = CANON_RT.juxtapose;
    const t = ctx.target;
    const p = this.player;
    const held = (e) => Object.keys((e && e.debuffs) || {}).some(k => { const d = conditionDef(k); return d && d.blocksTeleport; });
    let other = null, bd = Infinity;
    for (const m of (this.monsters || [])) {
      if (!m.alive || m === t || m.person) continue;
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d <= rt.secondRange && d < bd) { other = { kind: 'monster', ref: m, x: m.wx, y: m.wy }; bd = d; }
    }
    for (const al of this._canonAllies()) {
      const d = Math.hypot(al.x - this.world.x, al.y - this.world.y);
      if (d <= rt.secondRange && d < bd) { other = al; bd = d; }
    }
    // "If an ally resists or otherwise prevents the effect, this ability is
    //  negated but the cooldown is reduced to 30 seconds."
    if (!t || !other || held(t) || (other.kind === 'monster' && held(other.ref))) {
      this._canonSay(`${a.name} — negated`);
      p.abilityCdByKey[key] = rt.resistedCd;
      return;
    }
    const tx = t.wx, ty = t.wy;
    t.wx = other.x; t.wy = other.y;
    if (other.kind === 'monster') { other.ref.wx = tx; other.ref.wy = ty; }
    else if (other.kind === 'party') { other.ref.x = tx; other.ref.y = ty; }
    else if (other.kind === 'summon') { other.ref.wx = tx; other.ref.wy = ty; }
    this._c4Ring(tx, ty, 34, '#ce93d8'); this._c4Ring(t.wx, t.wy, 34, '#ce93d8');
    for (const e of [t, other.kind === 'monster' ? other.ref : null]) {
      if (!e) continue;
      if (reached(rank, 'bronze')) e.canonJuxtaT = rt.vulnSecs;   // "additional damage from all sources"
      if (reached(rank, 'silver')) this._canonInflict(e, 'inescapable');
    }
    this._juxtaposed = (this._juxtaposed || 0) + 1;
  },

  // ==========================================================================
  // TRAP
  // ==========================================================================
  _canon_lightningTether(a, key, rank, ctx) {
    const s = this._c4();
    if (ctx.free || s.lightningRod) {
      // "If the rod is destroyed or removed from its location then a stroke of
      //  lightning strikes the nearest enemy before chaining ..."
      this._lightningBurst(s.lightningRod);
      s.lightningRod = null;
      if (ctx.free) this.player.abilityCdByKey[key] = ctx.keepCd;
      return;
    }
    s.lightningRod = { x: this.world.x, y: this.world.y, rank, a, links: [], boltT: 0, tick: 0, region: this.currentRegion, room: this._insideRoom || null };
    this._c4Ring(this.world.x, this.world.y, 30, '#fff176');
  },
  _lightningBurst(rod) {
    if (!rod) return;
    const rt = CANON_RT.lightningTether;
    const pow = this._canonPow(rod.a, rod.rank);
    const hit = new Set();
    let from = { wx: rod.x, wy: rod.y };
    for (let i = 0; i < 40; i++) {
      let best = null, bd = Infinity;
      for (const m of this._c4Monsters(rod.x, rod.y, rt.burstReach)) {
        if (hit.has(m)) continue;
        const d = Math.hypot(m.wx - from.wx, m.wy - from.wy);
        if ((i === 0 || d <= rt.chainHop) && d < bd) { best = m; bd = d; }
      }
      if (!best) break;
      hit.add(best);
      this._canonHurt(best, rt.burst * pow, 'lightning');
      this._canonInflict(best, 'stun');
      from = best;
    }
    this._c4Ring(rod.x, rod.y, 60, '#fff176');
    this._lightningBursts = (this._lightningBursts || 0) + 1;
    this._lightningBurstHits = hit.size;
  },
  _tickLightningRod(dt) {
    const s = this._c4();
    const rod = s.lightningRod;
    if (!rod) return;
    if (rod.region !== this.currentRegion || (rod.room || null) !== (this._insideRoom || null)) { s.lightningRod = null; return; }
    const rt = CANON_RT.lightningTether;
    const pow = this._canonPow(rod.a, rod.rank);
    const max = rt.links[rod.rank] || 1;
    // Keep the chain: rod -> nearest in reach -> nearest to that -> ...
    rod.links = rod.links.filter(m => m && m.alive);
    if (!rod.links.length) {
      const first = this._c4Monsters(rod.x, rod.y, rt.reach).sort((p, q) => Math.hypot(p.wx - rod.x, p.wy - rod.y) - Math.hypot(q.wx - rod.x, q.wy - rod.y))[0];
      if (first) rod.links = [first];
    }
    while (rod.links.length && rod.links.length < max) {
      const last = rod.links[rod.links.length - 1];
      const nx = this._c4Monsters(last.wx, last.wy, rt.chainHop).filter(m => !rod.links.includes(m))
        .sort((p, q) => Math.hypot(p.wx - last.wx, p.wy - last.wy) - Math.hypot(q.wx - last.wx, q.wy - last.wy))[0];
      if (!nx) break;
      rod.links.push(nx);
    }
    // A link that has stretched past its reach snaps (and the chain behind it).
    for (let i = 0; i < rod.links.length; i++) {
      const prev = i === 0 ? { wx: rod.x, wy: rod.y } : rod.links[i - 1];
      const m = rod.links[i];
      if (Math.hypot(m.wx - prev.wx, m.wy - prev.wy) > rt.reach * 1.6) { rod.links.length = i; break; }
    }
    rod.tick -= dt;
    if (rod.tick <= 0) {
      rod.tick = 1;
      // "a negligible amount of ongoing electricity damage that scales upward
      //  based on the length of the tether."
      for (let i = 0; i < rod.links.length; i++) {
        const prev = i === 0 ? { wx: rod.x, wy: rod.y } : rod.links[i - 1];
        const m = rod.links[i];
        const len = Math.hypot(m.wx - prev.wx, m.wy - prev.wy);
        this._canonHurt(m, (rt.perSec + len * rt.perLen) * pow, 'lightning');
      }
    }
    // Silver: "If tethered enemies are close together, each short tether emits
    // electrical projectile attacks at random non-tethered enemies."
    if (reached(rod.rank, 'silver')) {
      rod.boltT -= dt;
      if (rod.boltT <= 0) {
        rod.boltT = rt.boltEvery;
        for (let i = 1; i < rod.links.length; i++) {
          const m0 = rod.links[i - 1], m1 = rod.links[i];
          if (Math.hypot(m1.wx - m0.wx, m1.wy - m0.wy) > rt.shortTether) continue;
          const mx = (m0.wx + m1.wx) / 2, my = (m0.wy + m1.wy) / 2;
          const free = this._c4Monsters(mx, my, rt.boltReach).filter(m => !rod.links.includes(m));
          const tgt = free[Math.floor(Math.random() * free.length)];
          if (tgt) { this._canonHurt(tgt, rt.boltDmg * pow, 'lightning'); this._tetherBolts = (this._tetherBolts || 0) + 1; }
        }
      }
    }
  },

  _canon_forceTether(a, key, rank, ctx) {
    const s = this._c4();
    if (ctx.free || s.forceRod) {
      // Taken up: "If the rod is destroyed or removed from its location then it
      // explodes in a wave of disruptive-force damage."
      this._forceRodBlast(s.forceRod, 'removed');
      s.forceRod = null;
      if (ctx.free) this.player.abilityCdByKey[key] = ctx.keepCd;
      return;
    }
    const rt = CANON_RT.forceTether;
    s.forceRod = { x: this.world.x, y: this.world.y, rank, a, tethered: new Set(), fieldHp: rt.fieldHp * rankPow(rank), tick: 0, last: new Map(), region: this.currentRegion, room: this._insideRoom || null };
    this._c4Ring(this.world.x, this.world.y, 30, '#80deea');
  },
  _forceRodBlast(rod, why) {
    if (!rod) return;
    const rt = CANON_RT.forceTether;
    const pow = this._canonPow(rod.a, rod.rank);
    const [dmg, radius, el] = why === 'rupture' ? [rt.rupture, rt.ruptureRadius, 'resonating'] : [rt.removed, rt.removedRadius, 'disruptive'];
    for (const m of this._c4Monsters(rod.x, rod.y, radius)) this._canonHurt(m, dmg * pow, el);
    this._c4Ring(rod.x, rod.y, radius, why === 'rupture' ? '#80deea' : '#ce93d8');
    this._forceBlasts = (this._forceBlasts || 0) + 1;
  },
  _tickForceRod(dt) {
    const s = this._c4();
    const rod = s.forceRod;
    if (!rod) return;
    const p = this.player;
    if (rod.region !== this.currentRegion || (rod.room || null) !== (this._insideRoom || null)) { s.forceRod = null; return; }
    const rt = CANON_RT.forceTether;
    // "Cost: Low mana-per-second." Out of mana, the rod goes.
    const drain = rt.drainPerSec * dt;
    if (p.mana < drain) { this._forceRodBlast(rod, 'removed'); s.forceRod = null; this._canonSay('Force Tether — out of mana'); return; }
    p.mana -= drain;
    const pow = this._canonPow(rod.a, rod.rank);
    const pull = (reached(rod.rank, 'bronze') ? rt.pullBronze : rt.pull);
    // "Untethered enemies who enter within range of the rod become tethered."
    for (const m of this._c4Monsters(rod.x, rod.y, rt.reach)) {
      if (!rod.tethered.has(m)) {
        rod.tethered.add(m);
        if (reached(rod.rank, 'silver')) this._canonInflict(m, 'inescapable');
      }
    }
    rod.tick -= dt;
    const tick = rod.tick <= 0;
    if (tick) rod.tick = 1;
    for (const m of [...rod.tethered]) {
      if (!m.alive) { rod.tethered.delete(m); continue; }
      const dx = rod.x - m.wx, dy = rod.y - m.wy;
      const d = Math.hypot(dx, dy) || 1;
      const lastD = rod.last.get(m);
      // Silver: "Moving or being moved against the pull of the tether causes
      // the tether to inflict resonating-force damage, escalating with distance."
      if (reached(rod.rank, 'silver') && lastD !== undefined && d > lastD + 0.5) {
        this._canonHurt(m, Math.max(1, (d - lastD) * rt.againstPerUnit * d * 0.1 * pow), 'resonating');
      }
      if (d > rt.fieldRadius + 8) this._c4Shove(m, dx / d, dy / d, Math.min(d - rt.fieldRadius, pull * dt));
      rod.last.set(m, Math.hypot(rod.x - m.wx, rod.y - m.wy));
      // "protected by a force field that inflicts moderate resonating-force
      //  damage to anyone in contact with it."
      if (tick && d <= rt.fieldRadius + ((m.type && m.type.radius) || 0) + 10) {
        this._canonHurt(m, rt.fieldDmg * pow, 'resonating');
        rod.fieldHp -= (m.type && m.type.atkDamage) || 4;
      }
    }
    // "If the force field is ruptured, it explodes in a wave of
    //  resonating-force damage."
    if (rod.fieldHp <= 0) { this._forceRodBlast(rod, 'rupture'); rod.fieldHp = rt.fieldHp * rankPow(rod.rank); }
  },

  _canon_pitOfTheReaper(a, key, rank) {
    const rt = CANON_RT.pitOfTheReaper;
    const s = this._c4();
    // "If this spell is cast again while a pit already exists, the existing
    //  pit vanishes, depositing anyone inside upon the surface."
    if (s.pit) this._closePit();
    const at = this._c4AimPoint(rt.range, 120);
    s.pit = { x: at.x, y: at.y, rank, a, tick: 0, t: rt.maxSecs, inside: new Set(), region: this.currentRegion, room: this._insideRoom || null };
    this._c4Ring(at.x, at.y, rt.radius, '#4a148c');
  },
  _closePit() {
    const s = this._c4();
    if (!s.pit) return;
    for (const m of s.pit.inside) if (m && m.alive) m.rootT = 0;
    s.pit = null;
  },
  _tickPit(dt) {
    const s = this._c4();
    const pit = s.pit;
    if (!pit) return;
    if (pit.region !== this.currentRegion || (pit.room || null) !== (this._insideRoom || null)) { this._closePit(); return; }
    pit.t -= dt;
    if (pit.t <= 0) { this._closePit(); return; }
    const rt = CANON_RT.pitOfTheReaper;
    const pow = this._canonPow(pit.a, pit.rank);
    // Silver: "Shadow tentacles drag enemies into the pit."
    if (reached(pit.rank, 'silver')) {
      for (const m of this._c4Monsters(pit.x, pit.y, rt.dragReach)) {
        const dx = pit.x - m.wx, dy = pit.y - m.wy, d = Math.hypot(dx, dy) || 1;
        if (d > rt.radius * 0.6) this._c4Shove(m, dx / d, dy / d, rt.drag * dt);
      }
    }
    pit.tick -= dt;
    const tick = pit.tick <= 0;
    if (tick) pit.tick = 1;
    for (const m of this._c4Monsters(pit.x, pit.y, rt.radius)) {
      pit.inside.add(m);
      m.rootT = Math.max(m.rootT || 0, 0.4);   // fallen in: it does not walk out
      if (tick) this._canonHurt(m, rt.dps * pow, 'necrotic');
    }
    // Iron: "Anyone inside the pit" -- the caster too, until bronze ("The
    // ability user and their allies may stand on the pit without falling in").
    if (!reached(pit.rank, 'bronze') && Math.hypot(this.world.x - pit.x, this.world.y - pit.y) <= rt.radius) {
      this.player.canonPitSlow = 0.3;
      if (tick) { this.player.hp = Math.max(1, this.player.hp - rt.selfDps); this._pitSelfHurt = (this._pitSelfHurt || 0) + 1; }
    }
  },

  /** Bait and Switch: "Teleport self or nearby ally to a nearby location.
   *  The subject is rendered invisible for a brief period, leaving behind a
   *  lifelike illusion. The illusion has no substance or aura." */
  _canon_baitAndSwitch(a, key, rank) {
    const p = this.player;
    const ally = this._targets && this._targets.ally ? this._canonAlly(260) : null;
    const s = this._c4();
    if (ally && ally.kind === 'party') {
      const m = ally.ref;
      s.decoys.push({ x: m.x, y: m.y, t: 4, name: m.name, of: m });
      this._c4Taunt(s.decoys[s.decoys.length - 1], m.x, m.y);
      const ang = Math.atan2(m.y - this.world.y, m.x - this.world.x);
      const spot = this._c4BlinkSpot(m.x, m.y, ang, 140);
      m.x = spot.x; m.y = spot.y;
      m.stealth = { t: 3 };
      this._c4Ring(m.x, m.y, 30, '#ce93d8');
      return;
    }
    const dec = { x: this.world.x, y: this.world.y, t: 4, name: 'You', of: p };
    s.decoys.push(dec);
    this._c4Taunt(dec, dec.x, dec.y);
    const spot = this._c4BlinkSpot(this.world.x, this.world.y, p.aimAngle || 0, 150);
    this.teleportTo ? this.teleportTo(spot.x, spot.y) : (this.world.x = spot.x, this.world.y = spot.y);
    if (this._applyStealth) this._applyStealth({ t: 3, alpha: 0.25, aggroMult: 0, speedPct: 0, name: a.name });
    this._c4Ring(spot.x, spot.y, 30, '#ce93d8');
    this._baitSwitches = (this._baitSwitches || 0) + 1;
  },
  /** The farthest open ground along a line, up to `dist`. */
  _c4BlinkSpot(x, y, ang, dist) {
    let best = { x, y };
    for (let d = 16; d <= dist; d += 8) {
      const nx = x + Math.cos(ang) * d, ny = y + Math.sin(ang) * d;
      if (this._collidesObstacle(nx, ny, 12) || this._isWaterAt(nx, ny)) continue;
      best = { x: nx, y: ny };
    }
    return best;
  },
  /** An illusion the pack turns on: every monster that was after the subject. */
  _c4Taunt(dec, x, y) {
    const src = { kind: 'decoy', ref: dec, name: dec.name, pos: () => ({ x: dec.x, y: dec.y }), alive: () => dec.t > 0 };
    let n = 0;
    for (const m of this._c4Monsters(x, y, 360)) {
      if (m.state !== 'chase' && !(m.taunt)) continue;
      m.taunt = { srcX: x, srcY: y, until: (this._combatClock || 0) + dec.t, src, threatMult: 1 };
      n++;
    }
    dec.fooled = n;
  },

  // ==========================================================================
  // RUNE
  // ==========================================================================
  _canon_runeTrap(a, key, rank, ctx) {
    const s = this._c4();
    const rt = CANON_RT.runeTrap;
    if (ctx.free) {
      for (const r of s.runes.slice()) this._runeBlow(r);
      this.player.abilityCdByKey[key] = ctx.keepCd;
      return;
    }
    const mode = ctx.mode ? ctx.mode.id : 'both';
    s.runes.push({ x: this.world.x, y: this.world.y, t: rt.secs, rank, a, mode, region: this.currentRegion, room: this._insideRoom || null });
    this._c4Ring(this.world.x, this.world.y, 24, '#ffab40');
  },
  _runeBlow(r) {
    const s = this._c4();
    const rt = CANON_RT.runeTrap;
    const i = s.runes.indexOf(r);
    if (i >= 0) s.runes.splice(i, 1);
    const pow = this._canonPow(r.a, r.rank);
    const hit = this._c4Monsters(r.x, r.y, rt.radius);
    for (const m of hit) {
      this._canonHurt(m, rt.dmg * pow, 'disruptive');
      // Bronze: "Enemies affected by the rune trap will be the source of a
      // secondary explosion after a brief period."
      if (reached(r.rank, 'bronze')) s.afterFx.push({ kind: 'runeEcho', m, t: rt.secondaryAfter, pow });
    }
    this._c4Ring(r.x, r.y, rt.radius, '#ffab40');
    this._runeBlasts = (this._runeBlasts || 0) + 1;
  },
  _tickRunes(dt) {
    const s = this._c4();
    const rt = CANON_RT.runeTrap;
    for (const r of s.runes.slice()) {
      r.t -= dt;
      if (r.t <= 0 || r.region !== this.currentRegion) { s.runes.splice(s.runes.indexOf(r), 1); continue; }
      if (r.mode !== 'cast' && this._c4Monsters(r.x, r.y, rt.trigger).length) this._runeBlow(r);
    }
    for (const e of s.afterFx.slice()) {
      e.t -= dt;
      if (e.t > 0) continue;
      s.afterFx.splice(s.afterFx.indexOf(e), 1);
      if (e.kind === 'runeEcho') {
        const x = e.m.wx, y = e.m.wy;
        for (const m of this._c4Monsters(x, y, rt.secondaryRadius)) this._canonHurt(m, rt.dmg * rt.secondaryFrac * e.pow, 'disruptive');
        this._c4Ring(x, y, rt.secondaryRadius, '#ffab40');
        this._runeEchoes = (this._runeEchoes || 0) + 1;
      }
    }
  },

  /** Rune Mantle: "Bestow a ring of random runes around an ally ... Attacks
   *  against the ally trigger the destruction of a random rune." Bronze's
   *  moderate-mana variant: every ally nearby. */
  _canon_runeMantle(a, key, rank, ctx) {
    const rt = CANON_RT.runeMantle;
    const make = () => ({ runes: Array.from({ length: rt.runes }, () => MANTLE_RUNES[Math.floor(Math.random() * MANTLE_RUNES.length)]), t: rt.secs, rank, pow: this._canonPow(a, rank) });
    const on = (al) => {
      if (!al || al.kind === 'player') this.player.canonMantle = make();
      else al.ref.canonMantle = make();
      this._c4Ring(al ? al.x : this.world.x, al ? al.y : this.world.y, 30, '#ffab40');
    };
    if (ctx.mode && ctx.mode.id === 'all') {
      on(null);
      for (const al of this._canonAllies()) if (Math.hypot(al.x - this.world.x, al.y - this.world.y) <= rt.allRange) on(al);
      return;
    }
    on(ctx.ally && ctx.ally.kind !== 'player' ? ctx.ally : null);
  },
  /** A blow on a mantled one: a rune breaks. Returns the damage left. */
  _mantleTakes(bearer, attacker, dmg, isPlayer) {
    const M = bearer && bearer.canonMantle;
    if (!M || !(M.t > 0) || !M.runes.length) return dmg;
    const i = Math.floor(Math.random() * M.runes.length);
    const rune = M.runes.splice(i, 1)[0];
    const rt = CANON_RT.runeMantle;
    const x = isPlayer ? this.world.x : bearer.x, y = isPlayer ? this.world.y : bearer.y;
    this._mantleBroken = (this._mantleBroken || 0) + 1;
    this._c4Float(x, y - 50, `Rune: ${rune}`, '#ffab40');
    switch (rune) {
      case 'ward': return 0;
      case 'mend': {
        const max = isPlayer ? this.player.maxHp : bearer.maxHp;
        if (isPlayer) this._c4Heal(null, max * rt.mend); else bearer.hp = Math.min(bearer.maxHp, bearer.hp + max * rt.mend);
        return dmg;
      }
      case 'spark': if (attacker && attacker.alive) this._canonHurt(attacker, rt.spark * M.pow, 'lightning'); return dmg;
      case 'bind': if (attacker && attacker.alive) this._canonInflict(attacker, 'stun'); return dmg;
      case 'haste': if (isPlayer) this.player.buffs.speed = { mult: 1.3, t: rt.hasteSecs }; return dmg;
      default: return dmg;
    }
  },

  /** Rune Gate: the storage space (iron), and group teleportation (bronze):
   *  everyone with you, to anywhere you have been. */
  _canon_runeGate(a, key, rank, ctx) {
    if (ctx.mode && ctx.mode.id === 'gate') {
      const places = this._canonVisitedPlaces ? this._canonVisitedPlaces() : [];
      if (!places.length) { this._canonSay(`${a.name} — nowhere you have been`); return; }
      this._pendingRuneGate = { places };
      const here = this.currentRegion;
      const choices = places.slice(0, 12).map((pl, i) => ({ act: `runeGate|${i}`, label: `${pl.name}${pl.region !== here ? ` (${pl.region.name})` : ''}` }));
      this._openDialogue(a.name, 'The runes of the gate turn. Where does it open?', null, choices);
      return;
    }
    if (this._openVault) this._openVault();
    this._c4Ring(this.world.x, this.world.y, 40, '#ffab40');
  },
  _takeRuneGate(i) {
    const g = this._pendingRuneGate;
    this._pendingRuneGate = null;
    const pl = g && g.places[i];
    if (!pl) return false;
    this._c4Ring(this.world.x, this.world.y, 60, '#ffab40');
    this.teleportTo(pl.x + 40, pl.y + 40);
    let n = 0;
    for (const m of (this._activeParty ? this._activeParty() : [])) { m.x = this.world.x + 30 * (n + 1); m.y = this.world.y + 20; n++; }
    this._c4Ring(this.world.x, this.world.y, 60, '#ffab40');
    this._runeGates = (this._runeGates || 0) + 1;
    return true;
  },

  /** Enact Ritual: diagrams (iron) -- the crafting bench's ritual, drawn
   *  wherever you are; altering an item (bronze) -- the weapon in hand, its
   *  power raised for a while; mana lamps (silver). */
  _canon_enactRitual(a, key, rank, ctx) {
    const rt = CANON_RT.enactRitual;
    const mode = ctx.mode ? ctx.mode.id : 'draw';
    const p = this.player;
    if (mode === 'alter') {
      p.canonAlterT = rt.alterSecs * this._ritualBoost();
      this._canonSay('Ritual: the weapon is altered', '#ffab40');
      if (this._recomputeDerivedStats) this._recomputeDerivedStats();
      return;
    }
    if (mode === 'lamp') {
      const s = this._c4();
      s.lamps = [{ x: this.world.x + 24, y: this.world.y - 10, mana: 0, region: this.currentRegion }];
      this._c4Ring(this.world.x + 24, this.world.y - 10, 20, '#fff59d');
      return;
    }
    if (this._openCraftBench) this._openCraftBench('jewelcrafter', 'Enact Ritual');
  },
  /** How much a ritual is enhanced right now: Blood Magic's charge and a mana
   *  lamp's refined mana, spent. */
  _ritualBoost() {
    const p = this.player;
    let b = 1;
    if (p.canonBloodRitual) { b *= p.canonBloodRitual; p.canonBloodRitual = 0; this._bloodRituals = (this._bloodRituals || 0) + 1; }
    const lamp = this._c4().lamps[0];
    if (lamp && lamp.mana > 0) { b *= 1 + lamp.mana * CANON_RT.enactRitual.lampToRitual; lamp.mana = 0; }
    return b;
  },

  // ==========================================================================
  // SHIELD
  // ==========================================================================
  _canon_absorbingShield(a, key, rank, ctx) {
    const rt = CANON_RT.absorbingShield;
    const al = ctx.ally;
    const sh = { t: rt.secs, rank, pow: this._canonPow(a, rank), mot: true };
    if (!al || al.kind === 'player') this.player.canonAbsorb = sh;
    else al.ref.canonAbsorb = sh;
    this._c4Ring(al ? al.x : this.world.x, al ? al.y : this.world.y, 34, '#81d4fa');
  },
  /** "negates an incoming attack and generates mana-over-time with a strength
   *  that scales with the amount of damage negated. High-damage attacks of
   *  gold-rank or higher may not be entirely negated." Bronze: "Attacks made
   *  against the shield drain health and mana from the attacker and bestow
   *  it upon the recipient." */
  _absorbTakes(bearer, m, dmg, isPlayer) {
    const sh = bearer && bearer.canonAbsorb;
    if (!sh || !(sh.t > 0)) return dmg;
    const rt = CANON_RT.absorbingShield;
    const gold = !!(m && m.key && monsterThreatTier(m.key) >= rankIdx('gold'));
    const pass = gold ? dmg * rt.goldPass : 0;
    const negated = dmg - pass;
    bearer.canonAbsorb = null;
    if (sh.mot) {
      const per = negated * rt.motShare / rt.motSecs;
      if (isPlayer) this.player.canonMot = { perSec: per, t: rt.motSecs };
      else bearer.canonMot = { perSec: per, t: rt.motSecs };
    }
    if (reached(sh.rank, 'bronze') && m && m.alive) {
      const d = Math.max(1, Math.round(negated * rt.drainShare));
      this._canonHurt(m, d, 'necrotic');
      if (isPlayer) { this._c4Heal(null, d); this.player.mana = Math.min(this.player.maxMana, this.player.mana + d * 0.5); }
      else { bearer.hp = Math.min(bearer.maxHp, bearer.hp + d); bearer.mana = Math.min(bearer.maxMana || 100, (bearer.mana || 0) + d * 0.5); }
    }
    const x = isPlayer ? this.world.x : bearer.x, y = isPlayer ? this.world.y : bearer.y;
    this._c4Float(x, y - 46, 'Absorbed', '#81d4fa');
    this._absorbed = (this._absorbed || 0) + negated;
    return pass;
  },

  /** Mana Shield, a toggle: "Absorbing an attack consumes mana proportional
   *  to the damage absorbed." Bronze: less. */
  _canon_manaShield(a, key, rank, ctx) {
    const p = this.player;
    if (ctx.free) {
      p.canonManaShield = null;
      this._canonSay('Mana Shield down', '#90caf9');
      return;
    }
    p.canonManaShield = { on: true, rank };
    this._canonSay('Mana Shield up', '#90caf9');
  },
  _manaShieldTakes(dmg) {
    const ms = this.player.canonManaShield;
    if (!ms || !ms.on) return dmg;
    const rt = CANON_RT.manaShield;
    const per = reached(ms.rank, 'bronze') ? rt.perPointBronze : rt.perPoint;
    const p = this.player;
    const can = Math.min(dmg, p.mana / per);
    p.mana -= can * per;
    this._manaShielded = (this._manaShielded || 0) + can;
    return dmg - can;
  },

  // ==========================================================================
  // GROWTH, RENEWAL
  // ==========================================================================
  _canon_bolster(a, key, rank, ctx) {
    const m = ctx.ally && ctx.ally.ref;
    if (!m) return;
    const rt = CANON_RT.bolster;
    // Bronze: "Mana and stamina costs of the affected ability are reduced."
    m.canonBolster = { t: 60, mult: rt.mult * (1 + 0.25 * rankAt(rank)), costCut: reached(rank, 'bronze') ? 10 : 0 };
    this._applyDebuff && conditionDef('bolstered') && this._applyDebuff(m, 'bolstered', { fromPlayer: true, source: this.player });
    this._c4Float(m.x, m.y - 50, 'Bolster', a.color || '#9ccc65');
  },

  _canon_giantsMight(a, key, rank, ctx) {
    const rt = CANON_RT.giantsMight;
    const al = ctx.ally;
    const secs = rt.secs;
    if (!al || al.kind === 'player') {
      this._applyDebuff(this.player, 'giantsMight', { duration: secs, fromPlayer: true, source: this.player });
      this.player.canonGiantT = secs;
      this._recomputeDerivedStats();
    } else if (al.kind === 'party') {
      const m = al.ref;
      this._applyDebuff(m, 'giantsMight', { duration: secs, fromPlayer: true, source: this.player });
      m.canonGiant = { t: secs, mult: rt.allyDmg, dr: reached(rank, 'bronze') ? 0.2 : 0 };
    } else if (al.kind === 'summon') {
      al.ref.dmg = Math.round((al.ref.dmg || 4) * rt.allyDmg);
      al.ref.canonGiantT = secs;
    }
    this._c4Ring(al ? al.x : this.world.x, al ? al.y : this.world.y, 44, '#8d6e63');
  },

  _canon_chrysalisGolem(a, key, rank) {
    const rt = CANON_RT.chrysalisGolem;
    const rec = this._spawnSummon({
      ...a, name: 'Chrysalis Golem', summonKind: 'creature', summonFamily: 'slimeGolem',
      chrysalis: true, summonDuration: rt.secs, summonTemporary: false,
      summonDmg: Math.round(rt.dmg * this._canonPow(a, rank)), summonRange: 60, summonInterval: 1.2,
      summonMoves: true, summonHpMult: rt.hp,
    });
    if (!rec) return;
    rec.canonGolem = { rank, spikeT: rt.spikeEvery, absorbed: null };
    // Iron and bronze hatch the plain form; silver's is "better adapted to
    // the environment" -- the form the ground under it asks for.
    if (rec.chrysalis && rec.chrysalis.outcome && !reached(rank, 'silver')) {
      rec.chrysalis.outcome = { ...rec.chrysalis.outcome, form: formFor([]), hazards: [] };
    }
  },
  _tickGolems(dt) {
    const rt = CANON_RT.chrysalisGolem;
    for (const s of (this._summons || [])) {
      const g = s.canonGolem;
      if (!g || !(s.hp > 0)) continue;
      const sealed = this._chrysalisSealed && this._chrysalisSealed(s);
      if (!sealed) continue;
      // Silver: "Chrysalis state resolves more quickly."
      if (reached(g.rank, 'silver') && s.chrysalis && s.chrysalis.phase === 'sealing') s.chrysalis.t += dt;
      // Bronze: "Shoots spikes while in the chrysalis state."
      if (reached(g.rank, 'bronze')) {
        g.spikeT -= dt;
        if (g.spikeT <= 0) {
          g.spikeT = rt.spikeEvery;
          const t = this._nearestLiveMonster(s.wx, s.wy, rt.spikeRange);
          if (t) { this._canonHurt(t, rt.spikeDmg * rankPow(g.rank), 'physical'); this._golemSpikes = (this._golemSpikes || 0) + 1; }
        }
      }
    }
  },

  _canon_fountainOfLife(a, key, rank) {
    const rt = CANON_RT.fountainOfLife;
    const al = this._targets && this._targets.ally ? this._canonAlly(260) : null;
    const x = al ? al.x : this.world.x, y = al ? al.y : this.world.y;
    this._c4().fountains.push({ x, y, t: rt.secs, tick: 0, rank, pow: this._canonPow(a, rank), region: this.currentRegion });
    this._c4Ring(x, y, rt.radius, '#81d4fa');
  },
  _tickFountains(dt) {
    const s = this._c4();
    const rt = CANON_RT.fountainOfLife;
    for (const f of s.fountains.slice()) {
      f.t -= dt; f.tick -= dt;
      if (f.t <= 0 || f.region !== this.currentRegion) { s.fountains.splice(s.fountains.indexOf(f), 1); continue; }
      if (f.tick > 0) continue;
      f.tick = 1;
      const amt = rt.perSec * f.pow;
      if (Math.hypot(this.world.x - f.x, this.world.y - f.y) <= rt.radius && this.player.hp < this.player.maxHp) this._healPlayer(amt);
      for (const al of this._canonAllies()) {
        if (Math.hypot(al.x - f.x, al.y - f.y) > rt.radius) continue;
        al.ref.hp = Math.min(al.ref.maxHp || al.ref.hp, al.ref.hp + amt);
      }
      this._fountainTicks = (this._fountainTicks || 0) + 1;
    }
  },

  /** Grand Renewal: a ritual, channelled. "cleanses all non-wound
   *  afflictions." Bronze: quicker. Silver: several people, the healing
   *  split, and wounds too. */
  _canon_grandRenewal(a, key, rank, ctx) {
    const rt = CANON_RT.grandRenewal;
    const p = this.player;
    if (ctx.free) { p.canonChannel = null; this._canonSay('Ritual abandoned', '#a5d6a7'); p.abilityCdByKey[key] = ctx.keepCd; return; }
    p.canonChannel = {
      kind: 'renewal', t: reached(rank, 'bronze') ? rt.channelBronze : rt.channel,
      x: this.world.x, y: this.world.y, ally: ctx.ally, rank, a, boost: this._ritualBoost(),
    };
    this._c4Ring(this.world.x, this.world.y, 60, '#a5d6a7');
    this._canonSay('The ritual circle...', '#a5d6a7');
  },
  _finishRenewal(ch) {
    const rt = CANON_RT.grandRenewal;
    const p = this.player;
    const heal = (who, share) => {
      const e = who.kind === 'player' ? p : who.ref;
      const max = who.kind === 'player' ? p.maxHp : (e.maxHp || 100);
      for (const k of Object.keys(e.debuffs || {})) {
        const d = conditionDef(k);
        if (!d || d.helpful) continue;
        if (isWound(d) && !reached(ch.rank, 'silver')) continue;
        delete e.debuffs[k];
        this._renewalCleansed = (this._renewalCleansed || 0) + 1;
      }
      const amt = max * rt.healFrac * share * ch.boost * (reached(ch.rank, 'silver') ? 1.25 : 1);
      if (who.kind === 'player') this._healPlayer(amt); else e.hp = Math.min(max, e.hp + amt);
    };
    let who = [ch.ally || { kind: 'player' }];
    if (reached(ch.rank, 'silver')) {
      who = [{ kind: 'player' }, ...this._canonAllies().filter(al => Math.hypot(al.x - this.world.x, al.y - this.world.y) <= rt.splitRadius)];
    }
    for (const w of who) heal(w, 1 / who.length);
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    this._c4Ring(this.world.x, this.world.y, 90, '#a5d6a7');
    this._canonSay('Grand Renewal', '#a5d6a7');
    this._renewals = (this._renewals || 0) + 1;
  },
  _tickChannel(dt) {
    const p = this.player;
    const ch = p.canonChannel;
    if (!ch) return;
    if (ch.kind === 'renewal') {
      if (Math.hypot(this.world.x - ch.x, this.world.y - ch.y) > 12) { p.canonChannel = null; this._canonSay('Ritual broken', '#a5d6a7'); return; }
      ch.t -= dt;
      if (ch.t <= 0) { p.canonChannel = null; this._finishRenewal(ch); }
      return;
    }
    if (ch.kind === 'void') {
      const rt = CANON_RT.wrathOfTheMagister;
      const t = ch.target;
      if (!t || !t.alive || Math.hypot(t.wx - this.world.x, t.wy - this.world.y) > rt.range * 1.2) { p.canonChannel = null; return; }
      const need = rt.voidPerSec * dt;
      if (p.mana < need) { p.canonChannel = null; this._canonSay('Void: out of mana', '#ce93d8'); return; }
      p.mana -= need; ch.fed += need;
      if (this._drawLegendaryBeam) this._drawLegendaryBeam(t, '#4a148c', 0, rt.range, false);
      if (ch.fed >= rt.voidNeed) {
        p.canonChannel = null;
        if (this._legendBeamG) this._legendBeamG.clear();
        // "unmake reality in a localised area, creating an annihilating void
        //  sphere inside the target."
        this._canonHurt(t, rt.voidDmg * this._canonPow(ch.a, ch.rank), 'disruptive');
        this._c4Ring(t.wx, t.wy, 50, '#4a148c');
        this._voidSpheres = (this._voidSpheres || 0) + 1;
      }
    }
  },

  // ==========================================================================
  // BLOOD
  // ==========================================================================
  _canon_bloodMagic(a, key, rank, ctx) {
    const rt = CANON_RT.bloodMagic;
    const p = this.player;
    const mode = ctx.mode ? ctx.mode.id : 'mana';
    if (mode === 'ritual') {
      const cost = Math.round(p.maxHp * rt.ritualHpFrac);
      p.hp = Math.max(1, p.hp - cost);
      p.canonBloodRitual = rt.ritualMult;
      this._canonSay('Blood for the next ritual', '#b71c1c');
      return;
    }
    if (mode === 'spell') {
      const cost = Math.round(p.maxHp * rt.spellHpFrac);
      p.hp = Math.max(1, p.hp - cost);
      p.canonBloodSpellT = rt.spellSecs;
      this._canonSay('Blood in the spell', '#b71c1c');
      return;
    }
    const cost = Math.round(p.maxHp * rt.hpFrac);
    p.hp = Math.max(1, p.hp - cost);
    p.mana = Math.min(p.maxMana, p.mana + cost * rt.manaPerHp);
    this._c4Float(this.world.x, this.world.y - 50, `+${Math.round(cost * rt.manaPerHp)} mana`, '#b71c1c');
    this._bloodToMana = (this._bloodToMana || 0) + 1;
  },

  // ==========================================================================
  // MIGHT, MAGIC STRIKES, DRAGON
  // ==========================================================================
  _canon_spiritReaper(a, key, rank) {
    this._canonStrike(a, key, rank);
  },
  /** "Inflicts additional disruptive-force damage and drains mana. Has
   *  additional effect against incorporeal or semi-corporeal creatures."
   *  Bronze [Stunned], silver [Radiant Echo], on the incorporeal. */
  _canonHit_spiritReaper(a, m, rank) {
    const rt = CANON_RT.spiritReaper;
    const eth = subtypeOf(m) === 'ethereal';
    const pow = this._canonPow(a, rank) * (eth ? rt.etherealMult : 1);
    this._canonHurt(m, rt.bonus * pow, 'disruptive');
    const p = this.player;
    p.mana = Math.min(p.maxMana, p.mana + rt.manaDrain * rankPow(rank));
    if (eth && reached(rank, 'bronze')) this._canonInflict(m, 'stun');
    if (eth && reached(rank, 'silver')) this._canonInflict(m, 'radiantEcho');
    this._spiritReaps = (this._spiritReaps || 0) + 1;
    return null;
  },
  _canon_shieldBreaker(a, key, rank) {
    this._canonStrike(a, key, rank);
  },
  /** "additional resonating-force damage, highly effective against physical
   *  defences" (it ignores armour); bronze "Damage to rigid material is
   *  significantly increased"; silver [Vibrant Echo]. */
  _canonHit_shieldBreaker(a, m, rank) {
    const rt = CANON_RT.shieldBreaker;
    const rigid = /mineral|mechanical/.test(subtypeOf(m) || '') || ((m.type && m.type.armor) || 0) >= 0.3;
    const pow = this._canonPow(a, rank) * (rigid && reached(rank, 'bronze') ? rt.rigidMult : 1);
    this._canonHurt(m, rt.bonus * pow, 'resonating');
    if (reached(rank, 'silver')) this._canonInflict(m, 'vibrantEcho');
    this._shieldBreaks = (this._shieldBreaks || 0) + 1;
    return null;
  },

  _canon_spartoi(a, key, rank) {
    const rt = CANON_RT.spartoi;
    const n = rt.count[rank] || 3;
    const boost = this._ritualBoost();
    let made = 0;
    for (let i = 0; i < n; i++) {
      const rec = this._spawnSummon({
        ...a, name: 'Dragon-tooth Warrior', summonKind: 'creature', summonFamily: 'skeleton',
        summonDuration: rt.secs, summonTemporary: false, summonMoves: true,
        summonDmg: Math.round(rt.dmg * this._canonPow(a, rank) * boost), summonRange: 50, summonInterval: 1.1,
        summonHpMult: rt.hp * boost, color: '#ff7043',
      });
      if (rec) { rec.canonSpartoi = true; made++; }
    }
    this._spartoiRaised = made;
    this._c4Ring(this.world.x, this.world.y, 80, '#ff7043');
  },

  // ==========================================================================
  // EVERY FRAME
  // ==========================================================================
  _tickCanon4(dt) {
    const p = this.player;
    const s = this._c4();
    p.canonPitSlow = 0;
    this._tickLightningRod(dt);
    this._tickForceRod(dt);
    this._tickPit(dt);
    this._tickRunes(dt);
    this._tickFountains(dt);
    this._tickChannel(dt);
    this._tickGolems(dt);
    this._tickLantern(dt);
    this._tickCanonAuras4(dt);
    // Timers on the player.
    for (const f of ['canonBloodSpellT', 'canonAlterT', 'canonGiantT', 'canonFrenzyT']) if (p[f] > 0) p[f] = Math.max(0, p[f] - dt);
    if (p.canonAlterT === 0 && p._alterWas) { p._alterWas = false; this._recomputeDerivedStats(); }
    if (p.canonAlterT > 0) p._alterWas = true;
    if (p.canonAbsorb && (p.canonAbsorb.t -= dt) <= 0) p.canonAbsorb = null;
    if (p.canonMantle && (p.canonMantle.t -= dt) <= 0) p.canonMantle = null;
    if (p.canonMot) {
      p.canonMot.t -= dt;
      p.mana = Math.min(p.maxMana, p.mana + p.canonMot.perSec * dt);
      if (p.canonMot.t <= 0) p.canonMot = null;
    }
    if (p.canonStolen) {
      p.canonStolen.t -= dt;
      // "If not used within 24 hours, the copied ability is lost, restoring
      //  the target's ability to use it."
      if (p.canonStolen.t <= 0) {
        if (p.canonStolen.from) p.canonStolen.from.canonStolen = null;
        p.canonStolen = null;
        (p.canonModes = p.canonModes || {}).powerThief = 'steal';
      }
    }
    for (const c of s.circles) c.t -= dt;
    s.circles = s.circles.filter(c => c.t > 0);
    for (const d of s.decoys) d.t -= dt;
    s.decoys = s.decoys.filter(d => d.t > 0);
    for (const l of s.lamps) {
      if (l.region !== this.currentRegion) continue;
      l.mana = Math.min(CANON_RT.enactRitual.lampMax, l.mana + CANON_RT.enactRitual.lampRate * dt);
    }
    // Companions: what this layer left on them.
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      for (const f of ['canonAbsorb', 'canonMantle']) if (m[f] && (m[f].t -= dt) <= 0) m[f] = null;
      if (m.canonReadiness && (m.canonReadiness.t -= dt) <= 0) m.canonReadiness = null;
      if (m.canonBolster && (m.canonBolster.t -= dt) <= 0) m.canonBolster = null;
      if (m.canonGiant && (m.canonGiant.t -= dt) <= 0) m.canonGiant = null;
      if (m.canonMot) { m.canonMot.t -= dt; m.mana = Math.min(m.maxMana || 100, (m.mana || 0) + m.canonMot.perSec * dt); if (m.canonMot.t <= 0) m.canonMot = null; }
      if (m.canonRelentless) {
        const r = m.canonRelentless;
        r.t -= dt;
        m.mana = Math.min(m.maxMana || 100, (m.mana || 0) + r.mana * dt);
        m.stamina = Math.min(m.maxStamina || 100, (m.stamina || 0) + r.stamina * dt);
        if (r.t <= 0) m.canonRelentless = null;
      }
    }
    for (const m of (this.monsters || [])) {
      if (m.canonPowerLock && (m.canonPowerLock.t -= dt) <= 0) m.canonPowerLock = null;
      if (m.canonJuxtaT > 0) m.canonJuxtaT -= dt;
      const w = m.canonWrath;
      if (w) {
        let any = false;
        for (const k of Object.keys(w)) { if (w[k] > 0) { w[k] -= dt; any = true; } }
        if (!any) m.canonWrath = null;
      }
    }
    this._drawCanon4();
  },

  /** Masterful, Lord of Magic, Dragon's Might, Eldritch Eyes: what the held
   *  passives do each frame. */
  _tickCanonAuras4(dt) {
    const p = this.player;
    const allies = (r) => (this._activeParty ? this._activeParty() : []).filter(m => m.downT <= 0 && Math.hypot(m.x - this.world.x, m.y - this.world.y) <= r);
    const projected = !this._auraProjected || this._auraProjected();
    // Masterful: "Abilities of allies within the aura come off cooldown more
    // quickly." The bearer stands in their own aura.
    const ms = this._c4Held('masterful');
    if (ms && projected) {
      const rt = CANON_RT.masterful;
      const extra = dt * rt.rate * rankPow(ms);
      for (const k of Object.keys(p.abilityCdByKey || {})) p.abilityCdByKey[k] = Math.max(0, p.abilityCdByKey[k] - extra);
      for (const m of allies(rt.radius)) {
        for (const slot of (m.kit || [])) slot.cd = Math.max(0, (slot.cd || 0) - extra);
        m.castCd = Math.max(0, (m.castCd || 0) - extra);
      }
      this._masterfulT = (this._masterfulT || 0) + extra;
    }
    // Lord of Magic: "gives mana-per-second".
    const lm = this._c4Held('lordOfMagic');
    if (lm && projected) {
      const rt = CANON_RT.lordOfMagic;
      const add = rt.manaPerSec * rankPow(lm) * dt;
      p.mana = Math.min(p.maxMana, p.mana + add);
      for (const m of allies(rt.radius)) m.mana = Math.min(m.maxMana || 100, (m.mana || 0) + add);
      this._lordManaGiven = (this._lordManaGiven || 0) + add;
    }
    // Dragon's Might: "Allies have increased [Power] and [Spirit]" -- the
    // condition round 238 built, kept on everyone in the field.
    const dm = this._c4Held('dragonsMightAura');
    this._dmT = (this._dmT || 0) - dt;
    if (dm && projected && this._dmT <= 0) {
      this._dmT = 2;
      const rt = CANON_RT.dragonsMightAura;
      const was = !!(p.debuffs && p.debuffs.dragonsMight);
      this._applyDebuff(p, 'dragonsMight', { fromPlayer: true, source: p });
      for (const m of allies(rt.radius)) this._applyDebuff(m, 'dragonsMight', { fromPlayer: true, source: p });
      if (!was) this._recomputeDerivedStats();
    }
    // Eldritch Eyes: "See the flows of Mana" -- magic that hides does not
    // hide from them. The Astral Lantern (out or in the eyes) reveals too.
    const ee = this._c4Held('eldritchEyes');
    const L = p.canonLantern;
    const lanternSees = L && (L.out || L.subsumed);
    if (ee || lanternSees) {
      const r = Math.max(ee ? CANON_RT.eldritchEyes.revealRadius : 0, lanternSees ? CANON_RT.astralLantern.revealRadius : 0);
      for (const m of this._c4Monsters(this.world.x, this.world.y, r)) {
        const magical = !ee || (m.type && m.type.dmgType === 'magical') || m.dmgElement || lanternSees;
        if (!magical) continue;
        if (m.stealth && m.stealth.t > 0) { m.stealth.t = 0; m.stealth = null; this._c4Revealed = (this._c4Revealed || 0) + 1; }
        if (m.lurk && lanternSees) {
          m.lurk = false; m.ambushReady = false;
          if (m.sprite && m.sprite.active) m.sprite.setAlpha(1);
          if (this._unfold) this._unfold(m);
          this._c4Float(m.wx, m.wy - 30, 'Seen', '#b39ddb');
          this._c4Revealed = (this._c4Revealed || 0) + 1;
        }
      }
    }
  },

  /** The lantern's core: "naturally replenishes over time", and is spent on
   *  its bolts and its interceptions. */
  _tickLantern(dt) {
    const L = this.player.canonLantern;
    if (!L) return;
    if (!this._canonKeyFor('astralLantern')) { if (L.out || L.subsumed) { L.out = false; L.subsumed = false; this._recomputeDerivedStats(); this._rebuildFamiliars && this._rebuildFamiliars(); } return; }
    const rt = CANON_RT.astralLantern;
    L.core = Math.min(rt.coreMax, L.core + rt.coreRegen * dt);
  },

  // ==========================================================================
  // HOOKS THE REST OF THE GAME CALLS
  // ==========================================================================
  /** Stat pass: held passives and standing effects. */
  _canonPassiveMods4(mods) {
    const p = this.player;
    if (this._canonPassiveMods5) this._canonPassiveMods5(mods);   // ROUND 288
    // Astral Lantern, while out: a familiar that zaps in disruptive force.
    const L = p.canonLantern;
    if (L && L.out) {
      const k = this._canonKeyFor('astralLantern');
      if (k) {
        const a = p.knownAbilities[k].ability;
        const r = this._canonRankOf(k);
        const rt = CANON_RT.astralLantern;
        mods.familiars.push({
          name: 'Astral Lantern', canonKey: 'astralLantern', canonRank: r, color: a.color || '#b39ddb',
          familiarRange: rt.zapRange, familiarInterval: rt.zapEvery,
          familiarDmg: Math.max(1, Math.round(rt.zapDmg * rankPow(r))), essenceId: a.essenceId,
        });
      }
    }
    // Tools of the Magister (iron): the magical tools, vehicles and weapons.
    if (this._canonKeyFor('toolsOfTheMagister')) {
      mods.prof = mods.prof || {};
      mods.prof.magicalTools = true;
      mods.prof.vehicles = true;
    }
    // Eldritch Eyes: the ley sense.
    if (this._c4Held('eldritchEyes')) mods.leySight = true;
    // Lord of Magic: "increases Resistance to mana drain effects".
    if (this._c4Held('lordOfMagic')) mods.manaDrainResist = Math.max(mods.manaDrainResist || 0, CANON_RT.lordOfMagic.drainResist);
    // Enact Ritual, bronze: the weapon in hand, altered.
    if (p.canonAlterT > 0) mods.dmgMult = (mods.dmgMult || 1) * (1 + CANON_RT.enactRitual.alterBonus);
    // Bag of Tricks, bronze: each worn piece's boon.
    if (this._canonHeldRank('bagOfTricks')) {
      // "Weapons, shields and armour": rings and amulets are neither.
      const g = p.gear || {};
      const worn = [p.hands && p.hands.right, p.hands && p.hands.left, ...['helmet', 'chest', 'shield', 'gloves', 'belt', 'legs', 'boots'].map(k => g[k])];
      for (const it of worn) {
        const b = this._bagBoonFor(it);
        if (!b) continue;
        if (b.dmg) mods.dmgMult = (mods.dmgMult || 1) * (1 + b.dmg);
        if (b.armor) mods.armorBonus = (mods.armorBonus || 0) + b.armor;
        if (b.speed) mods.moveSpeedPct = (mods.moveSpeedPct || 0) + b.speed;
        if (b.dr) mods.damageReduction = (mods.damageReduction || 0) + b.dr;
      }
    }
  },

  /** The aura list entry for a held canon aura, or null. */
  _canonAura4(a, key) {
    if (!a || !(CANON4_PASSIVE_KEYS.includes(a.canonKey) || a.canonKey === 'cleansingBreeze')) return null;
    const r = this._canonRankOf(key);
    const rt = CANON_RT[a.canonKey] || {};
    return { ...a, debuff: null, auraRadius: rt.radius || a.auraRadius || 180, canonRank: r, auraKey: a.canonKey, auraLabel: a.name, canonAura4: true };
  },

  /** The lantern's bolt: "bolts of disruptive-force, consuming small amounts
   *  of core energy". Returns true when this layer handled the zap. */
  _canonFamiliarStrike4(f, m) {
    if (!f.a || f.a.canonKey !== 'astralLantern') return undefined;
    const L = this.player.canonLantern;
    const rt = CANON_RT.astralLantern;
    if (!L || L.core < rt.zapCost) return true;   // out of core: it waits
    L.core -= rt.zapCost;
    this._canonHurt(m, f.a.familiarDmg, 'disruptive');
    this._lanternZaps = (this._lanternZaps || 0) + 1;
    return true;
  },

  /** A monster's blow on its way to the player. */
  _canonMeetsBlow4(m, dmg, shot) {
    const p = this.player;
    if (this._canonMeetsBlow5) { dmg = this._canonMeetsBlow5(m, dmg, shot); if (!(dmg > 0)) return 0; }   // ROUND 288
    if (p.canonMantle) { dmg = this._mantleTakes(p, m, dmg, true); if (!(dmg > 0)) return 0; }
    if (p.canonAbsorb) { dmg = this._absorbTakes(p, m, dmg, true); if (!(dmg > 0)) return 0; }
    if (p.canonManaShield && p.canonManaShield.on) { dmg = this._manaShieldTakes(dmg); if (!(dmg > 0)) return 0; }
    // Giant's Might bronze on the caster: "resistance to physical damage".
    return dmg;
  },
  /** A companion's hit, before it lands. */
  _canonPartyMeetsBlow(m, dmg, src) {
    if (m.canonMantle) { dmg = this._mantleTakes(m, src, dmg, false); if (!(dmg > 0)) return 0; }
    if (m.canonAbsorb) { dmg = this._absorbTakes(m, src, dmg, false); if (!(dmg > 0)) return 0; }
    if (m.canonGiant && m.canonGiant.dr) dmg *= (1 - m.canonGiant.dr);
    return dmg;
  },
  /** A monster's bolt, before it reaches the player: the Astral Lantern
   *  "can intercept and negate magical projectiles. Negating powerful
   *  projectiles consumes core energy." Gold Chrysalis Golem: "draws in
   *  hostile magic". */
  _canonInterceptShot4(s) {
    if (this._canonInterceptShot5 && this._canonInterceptShot5(s)) return true;   // ROUND 288
    const magical = !!(s && (s.element || (s.src && s.src.type && s.src.type.dmgType === 'magical')));
    if (!magical) return false;
    for (const g of (this._summons || [])) {
      if (!g.canonGolem || !reached(g.canonGolem.rank, 'gold') || !(this._chrysalisSealed && this._chrysalisSealed(g))) continue;
      if (Math.hypot(s.wx - g.wx, s.wy - g.wy) > CANON_RT.chrysalisGolem.absorbRadius) continue;
      g.canonGolem.absorbed = s.element || 'disruptive';
      // "evolving to counter the absorbed magic": the hatch takes the colour
      // of what it drank.
      if (g.chrysalis && g.chrysalis.outcome) { g.chrysalis.outcome = { ...g.chrysalis.outcome, tint: tintFor(g.canonGolem.absorbed) }; g.chrysalis.tint = g.chrysalis.outcome.tint; }
      this._golemDrank = (this._golemDrank || 0) + 1;
      return true;
    }
    const L = this.player.canonLantern;
    if (!L || !L.out) return false;
    const rt = CANON_RT.astralLantern;
    if (Math.hypot(s.wx - this.world.x, s.wy - this.world.y) > rt.interceptRadius) return false;
    const cost = Math.max(1, (s.dmg || 4) * rt.interceptPer);
    if (L.core < cost) return false;
    L.core -= cost;
    this._c4Float(s.wx, s.wy - 20, 'Negated', '#b39ddb');
    this._lanternNegated = (this._lanternNegated || 0) + 1;
    return true;
  },
  /** Damage a monster takes, multiplied: Orange ("increased damage from all
   *  sources"), Juxtapose bronze, Dragon Fire, a blood-fuelled spell, a
   *  magister's circle. */
  _canonTakenMult4(m, el, credit) {
    let k = 1;
    const w = m && m.canonWrath;
    if (w && w.orange > 0) k *= 1 + CANON_RT.wrathOfTheMagister.orangeTaken;
    if (m && m.canonJuxtaT > 0) k *= 1 + CANON_RT.juxtapose.vulnTaken;
    if (!credit) return k;
    const p = this.player;
    const magical = el && el !== 'physical';
    if (el === 'fire') {
      const dm = this._c4Held('dragonsMightAura');
      if (dm && reached(dm, 'bronze')) k *= CANON_RT.dragonsMightAura.dragonFire;
    }
    if (magical && p.canonBloodSpellT > 0) k *= CANON_RT.bloodMagic.spellMult;
    if (magical) k *= 1 + this._c4CircleBonus();
    return k;
  },

  // ==========================================================================
  // DRAWING
  // ==========================================================================
  _drawCanon4() {
    if (!this.add || !this.add.graphics) return;
    const s = this._c4();
    const p = this.player;
    const any = s.lightningRod || s.forceRod || s.pit || s.runes.length || s.fountains.length || s.circles.length
      || s.decoys.length || s.lamps.length || (p.canonMantle) || (p.canonAbsorb) || (p.canonManaShield && p.canonManaShield.on)
      || (p.canonChannel && p.canonChannel.kind === 'renewal');
    let g = this._c4G;
    if (!any) { if (g) { g.clear(); } return; }
    if (!g || !g.scene) { g = this._c4G = this.add.graphics(); }
    g.clear();
    g.setDepth(isoDepth(this.world.x, this.world.y) + 2);
    const now = (this.time && this.time.now) || 0;
    const P = (x, y) => isoProject(x, y);
    const ring = (x, y, r, c, a, w = 2) => {
      const o = P(x, y);
      g.lineStyle(w, col(c), a);
      g.strokeEllipse(o.x, o.y, r * 2, r);
    };
    const line = (x0, y0, x1, y1, c, a, w = 2, lift = 18) => {
      const o = P(x0, y0), q = P(x1, y1);
      g.lineStyle(w, col(c), a); g.beginPath(); g.moveTo(o.x, o.y - lift); g.lineTo(q.x, q.y - lift); g.strokePath();
    };
    const rod = (x, y, c) => {
      const o = P(x, y);
      g.lineStyle(3, col(c), 1); g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x, o.y - 30); g.strokePath();
      g.fillStyle(col(c), 0.9); g.fillCircle(o.x, o.y - 31, 3.5);
    };
    if (s.lightningRod) {
      const r = s.lightningRod;
      rod(r.x, r.y, '#fff176');
      let px = r.x, py = r.y;
      for (const m of r.links) {
        const jit = Math.sin(now / 40 + m.wx) * 3;
        line(px, py, m.wx, m.wy + jit, '#fff59d', 0.9, 2);
        px = m.wx; py = m.wy;
      }
    }
    if (s.forceRod) {
      const r = s.forceRod;
      rod(r.x, r.y, '#80deea');
      ring(r.x, r.y, CANON_RT.forceTether.fieldRadius, '#80deea', 0.5 + 0.2 * Math.sin(now / 120), 2);
      for (const m of r.tethered) if (m.alive) line(r.x, r.y, m.wx, m.wy, '#b2ebf2', 0.55, 1.5);
    }
    if (s.pit) {
      const o = P(s.pit.x, s.pit.y);
      const R = CANON_RT.pitOfTheReaper.radius;
      g.fillStyle(0x12001f, 0.8); g.fillEllipse(o.x, o.y, R * 2, R);
      g.lineStyle(2, 0x6a1b9a, 0.8); g.strokeEllipse(o.x, o.y, R * 2, R);
    }
    for (const r of s.runes) {
      const o = P(r.x, r.y);
      g.lineStyle(2, 0xffab40, 0.6 + 0.3 * Math.sin(now / 150)); g.strokeEllipse(o.x, o.y, 36, 18);
      g.lineStyle(1.5, 0xffe0b2, 0.8); g.strokeTriangle(o.x - 8, o.y + 3, o.x + 8, o.y + 3, o.x, o.y - 8);
    }
    for (const f of s.fountains) {
      const o = P(f.x, f.y);
      g.fillStyle(0xb3e5fc, 0.85); g.fillEllipse(o.x, o.y - 46, 26, 10);
      g.lineStyle(2, 0xe1f5fe, 0.9); g.strokeEllipse(o.x, o.y - 46, 26, 10);
      for (let i = 0; i < 6; i++) {
        const u = ((now / 500) + i / 6) % 1;
        const ang = i * Math.PI / 3;
        g.fillStyle(0x81d4fa, 0.8 - u * 0.6);
        g.fillCircle(o.x + Math.cos(ang) * 40 * u, o.y - 46 + (46 * u * u) + Math.sin(ang) * 18 * u, 2);
      }
      ring(f.x, f.y, CANON_RT.fountainOfLife.radius, '#81d4fa', 0.25, 1);
    }
    for (const c of s.circles) {
      ring(c.x, c.y, c.radius, c.color, 0.55, 2);
      ring(c.x, c.y, c.radius * 0.8, c.color, 0.3, 1);
    }
    for (const d of s.decoys) {
      const o = P(d.x, d.y);
      g.fillStyle(0xe1bee7, 0.35 + 0.1 * Math.sin(now / 90)); g.fillEllipse(o.x, o.y - 22, 18, 40);
    }
    for (const l of s.lamps) {
      if (l.region !== this.currentRegion) continue;
      const o = P(l.x, l.y);
      const k = l.mana / CANON_RT.enactRitual.lampMax;
      g.fillStyle(0xfff59d, 0.4 + 0.5 * k); g.fillCircle(o.x, o.y - 24, 4 + 3 * k);
      g.lineStyle(1.5, 0xffecb3, 0.9); g.strokeCircle(o.x, o.y - 24, 7);
    }
    if (p.canonMantle && p.canonMantle.runes.length) {
      const o = P(this.world.x, this.world.y);
      const n = p.canonMantle.runes.length;
      for (let i = 0; i < n; i++) {
        const ang = now / 600 + i * 2 * Math.PI / n;
        g.fillStyle(0xffab40, 0.9); g.fillCircle(o.x + Math.cos(ang) * 22, o.y - 24 + Math.sin(ang) * 10, 2.6);
      }
    }
    if (p.canonAbsorb) ring(this.world.x, this.world.y, 20, '#81d4fa', 0.7, 2);
    if (p.canonManaShield && p.canonManaShield.on) ring(this.world.x, this.world.y, 18, '#90caf9', 0.35 + 0.15 * Math.sin(now / 200), 1.5);
    if (p.canonChannel && p.canonChannel.kind === 'renewal') ring(p.canonChannel.x, p.canonChannel.y, 60, '#a5d6a7', 0.6, 2);
  },
};
