// ============================================================================
// ROUND 284 -- HIS CANON ABILITIES, RUNNING.
//
//   "All cannon abilities need to be working in game, add effects as needed"
//
// Before this round a canon ability reached a kit only once its mechanics had
// been checked against his text (`RUNTIME_READY`), and two had been: Hemorrhage
// and Midnight Eyes. The other thirty-one had exemplars, and rounds 228-235 had
// built most of their CONDITIONS -- but the cast side was generic templates
// that did something else, or nothing (a `martialStrike` with no weapon rider
// swung at nobody; a `drain` template had no branch at all).
//
// So every canon cast now comes here first. `_castCanon` owns the whole cast
// for a canon ability; the generic template never runs for one. Its pieces:
//
//   _canonPrecheck   before the cost: a target in reach, a body, an ally, the
//                    mode's price, the secondary costs -- refuse and spend
//                    nothing, the way Hemorrhage already did.
//   _castCanon       after the cost and cooldown: what the ability DOES.
//   _canonOnHit      the one door a canon ability's hit comes through (bolts,
//                    special strikes, conjured weapons) -- its rungs' conditions.
//   _tickCanon       every frame: toggles that drain, auras, familiars.
//
// The text on the card is his, always (canonText.js). The numbers and the
// in-game analogues are canonRuntime.js.
// ============================================================================
import { conditionDef } from '../data/debuffs.js';
import { hasTag, TAG } from '../data/debuffs.js';
import { CANON_RT, CANON_MODES, modeFor, nextMode, modesAt, reached, rankAt } from '../data/canonRuntime.js';
import { isBloodless, subtypeOf } from '../data/monsters.js';
import { isoProject, isoDepth } from '../data/iso.js';
import { coinPurseValue, spendCoins, COIN_RANKS, COIN_CONVERSION } from '../data/inventory.js';

/** Afflictions [Feast of Absolution] eats: "curses, diseases, poisons and
 *  unholy afflictions" -- and holy ones too, from an ally. */
const FEAST_TAGS = ['curse', 'disease', 'poison', 'unholy'];
/** "each curse, disease, poison and unholy affliction" (Punition, Inexorable
 *  Doom, Sin Eater's gold). */
const DOOM_TAGS = FEAST_TAGS;

/** Canon keys whose cast this layer owns. Hemorrhage keeps round 278's
 *  targetAffliction path; Midnight Eyes is a passive. */
export const CANON_CAST_KEYS = new Set([
  'lifeBolt', 'herosMoment', 'verdantCage', 'reapersRedoubt', 'crystalliseMana', 'burstShield',
  'razorWingSword', 'flyingLeap', 'dragonWingSword', 'dragonWings', 'diveBomb',
  'immortality', 'relentlessAssault', 'unstoppableForce',
  'cloakOfNight', 'pathOfShadows', 'handOfTheReaper',
  'bloodHarvest', 'leechBite', 'feastOfBlood', 'sanguineHorror',
  'punish', 'feastOfAbsolution', 'castigate',
  'inexorableDoom', 'punition', 'bladeOfDoom', 'verdict', 'avatarOfDoom',
]);

const rankPow = (rank) => 1 + 0.5 * rankAt(rank);

export const CanonRuntimeMixin = {
  // --------------------------------------------------------------------------
  // SMALL THINGS EVERYONE BELOW ASKS
  // --------------------------------------------------------------------------
  _canonRankOf(key) {
    return (this._abilityRankFor ? this._abilityRankFor(key) : 'iron') || 'iron';
  },
  /** The key in knownAbilities that holds this canon ability, if any. */
  _canonKeyFor(canonKey) {
    const known = (this.player && this.player.knownAbilities) || {};
    return Object.keys(known).find(k => known[k] && known[k].ability && known[k].ability.canonKey === canonKey) || null;
  },
  /** The rank a canon ability is held at, or null if it is not held. */
  _canonHeldRank(canonKey) {
    const k = this._canonKeyFor(canonKey);
    return k ? this._canonRankOf(k) : null;
  },
  _canonModeOf(canonKey, rank) {
    const chosen = ((this.player && this.player.canonModes) || {})[canonKey];
    return modeFor(canonKey, rank, chosen);
  },
  /** The badge click: the next mode this rank has unlocked. */
  _cycleCanonMode(key) {
    const e = this.player.knownAbilities[key];
    const ck = e && e.ability && e.ability.canonKey;
    if (!ck || !CANON_MODES[ck]) return null;
    const rank = this._canonRankOf(key);
    const cur = this._canonModeOf(ck, rank);
    const nx = nextMode(ck, rank, cur && cur.id);
    if (!nx) return null;
    (this.player.canonModes = this.player.canonModes || {})[ck] = nx.id;
    this._floatText(this.world.x, this.world.y - 46, `${e.ability.name}: ${nx.label}`, e.ability.color || '#ffffff');
    // A cloak already worn changes what it is doing at once.
    if (ck === 'cloakOfNight' && this.player.canonCloak && this.player.canonCloak.on) this.player.canonCloak.mode = nx.id;
    if (ck === 'bladeOfDoom') this._refreshBladeForm && this._refreshBladeForm();
    this._canonModeSig = null;
    return nx.id;
  },
  /** The multiplier on a canon ability's own numbers: its level scale and
   *  half again per rank. */
  _canonPow(a, rank) {
    return ((a && a._scale) || 1) * rankPow(rank) * ((this.player.passiveMods && this.player.passiveMods.dmgMult) || 1);
  },
  /** Deal a canon ability's damage. `element` 'physical' goes through armour. */
  _canonHurt(m, amount, element) {
    if (!m || !m.alive || !(amount > 0)) return 0;
    const phys = !element || element === 'physical';
    return this._damageMonster(m, Math.max(1, Math.round(amount)), true, phys, phys ? null : element) || 0;
  },
  /** An enemy for a laid-on spell: the selected one if it is in reach, else
   *  the nearest. */
  _canonTarget(range) {
    const sel = this._currentTarget ? this._currentTarget('enemy') : null;
    if (sel && sel.alive && !sel.person && Math.hypot(sel.wx - this.world.x, sel.wy - this.world.y) <= range + ((sel.type && sel.type.radius) || 0)) return sel;
    return this._nearestMonsterWithin(range);
  },
  /** Allies: the companions on their feet, and the player's creature summons. */
  _canonAllies() {
    const out = [];
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      if (m.downT > 0 || m.benched) continue;
      out.push({ kind: 'party', ref: m, x: m.x, y: m.y });
    }
    for (const s of (this._summons || [])) {
      if (s.kind === 'creature' && s.hp > 0) out.push({ kind: 'summon', ref: s, x: s.wx, y: s.wy });
    }
    return out;
  },
  /** The chosen ally: the ally selection if one is set, else the nearest. */
  _canonAlly(range) {
    const sel = this._targets && this._targets.ally;
    const all = this._canonAllies();
    if (sel) {
      const hit = all.find(x => x.ref === sel);
      if (hit && Math.hypot(hit.x - this.world.x, hit.y - this.world.y) <= range) return hit;
    }
    let best = null, bd = Infinity;
    for (const x of all) {
      const d = Math.hypot(x.x - this.world.x, x.y - this.world.y);
      if (d <= range && d < bd) { best = x; bd = d; }
    }
    return best;
  },
  /** What kind of ground this is, for Verdant Cage. */
  _canonBiome() {
    if (this._insideRoom) return 'indoors';
    const id = this.currentRegion && this.currentRegion.id;
    return ({ nek: 'forest', ontaria: 'plain', elehyd: 'mountain', bratugal: 'swamp',
      sirukh: 'desert', cinder: 'ash', ixcuatl: 'jungle' })[id] || 'plain';
  },
  _canonSay(text, color) {
    this._floatText(this.world.x, this.world.y - 44, text, color || '#90a4ae');
  },
  _canonLink(t, color) {
    if (this._spawnAfflictionLink && t) this._spawnAfflictionLink(t, color);
  },
  /** Every condition this ability's reached rungs name that lands on the
   *  TARGET (the helpful ones are the caster's, and each ability says where
   *  those go). */
  _canonTargetRungs(a, rank) {
    const out = [];
    const rc = a.rankConditions || {};
    for (const r of ['iron', 'bronze', 'silver', 'gold']) {
      if (!reached(rank, r)) break;
      for (const k of (rc[r] || [])) {
        const d = conditionDef(k);
        if (d && !d.helpful) out.push(k);
      }
    }
    return out;
  },
  /** Afflictions on a thing carrying any of these tags, and how many
   *  instances. */
  _canonCountTagged(e, tags) {
    const map = (e && e.debuffs) || {};
    let kinds = 0, instances = 0;
    for (const k of Object.keys(map)) {
      const d = conditionDef(k);
      if (!d || d.helpful) continue;
      if (!tags.some(t => hasTag(d, t))) continue;
      kinds++;
      instances += map[k].stacks || 1;
    }
    return { kinds, instances };
  },
  /** "Inflicts or refreshes": refresh a held one rather than stack it. */
  _canonRefreshOrInflict(t, key, opts = {}) {
    const held = t.debuffs && t.debuffs[key];
    // `noCompanions`: his text names every condition a canon ability brings.
    // Round 201 made [Mark of Sin] ride along with every [Sin]; Punish and
    // Hegemony's texts do not say so, and Castigate names it itself.
    if (held) {
      const before = held.stacks || 1;
      const got = this._applyDebuff(t, key, { ...opts, fromPlayer: true, source: this.player, noCompanions: true });
      if (got) got.stacks = before;
      return { got, refreshed: true };
    }
    return { got: this._applyDebuff(t, key, { ...opts, fromPlayer: true, source: this.player, noCompanions: true }), refreshed: false };
  },
  _canonInflict(t, key, stacks = 1, opts = {}) {
    if (!t || !conditionDef(key)) return null;
    return this._applyDebuff(t, key, { stacks, ...opts, fromPlayer: true, source: this.player, noCompanions: true });
  },
  /** A boon on the caster. */
  _canonBoon(key, stacks = 1) {
    if (!conditionDef(key)) return null;
    const got = this._applyDebuff(this.player, key, { stacks, fromPlayer: true, source: this.player });
    if (got && this._recomputeDerivedStats) this._recomputeDerivedStats();
    return got;
  },

  // --------------------------------------------------------------------------
  // BEFORE THE COST
  // --------------------------------------------------------------------------
  /** Does this cast skip the ability's own cooldown? A mode with a cooldown
   *  of its own (a gate, Immortality's purge) answers to that instead. */
  _canonSkipsAbilityCd(a, key) {
    if (!a || !a.canonKey || !CANON_CAST_KEYS.has(a.canonKey)) return false;
    // ROUND 287 -- a recast that ends or fires what the last cast left
    // standing (a rod, a rune, a channel) answers to no clock.
    if (this._canonFreeRecast && this._canonFreeRecast(a.canonKey)) return true;
    const m = this._canonModeOf(a.canonKey, this._canonRankOf(key));
    return !!(m && m.cdKey);
  },

  /** Returns the spec to cast with (the mode's price laid over it), or null
   *  to refuse. Nothing is paid on a refusal. */
  _canonPrecheck(a, key) {
    if (!a || !a.canonKey || !CANON_CAST_KEYS.has(a.canonKey)) return a;
    const ck = a.canonKey;
    const rank = this._canonRankOf(key);
    const rt = CANON_RT[ck] || {};
    const p = this.player;
    let spec = { ...a };
    delete spec.drain;   // a canon toggle drains through its own clock (_tickCanon)
    delete spec.variesCooldown;   // a mode's clock, not the generic `varies` rule
    const mode = this._canonModeOf(ck, rank);
    this._canonCtx = { key, rank, mode, target: null, ally: null };
    if (mode) {
      if (mode.cost !== undefined) spec.cost = mode.cost;
      if (mode.cooldown !== undefined) spec.cooldown = mode.cooldown;
      if (mode.cdKey) {
        const left = ((p.canonCd || {})[mode.cdKey]) || 0;
        if (left > 0) { this._canonSay(`${a.name} (${mode.label}) — ${Math.ceil(left)}s`); return null; }
        spec.cooldown = 0;
      }
    }
    // The secondary prices ("extreme mana, extreme stamina, extreme health").
    if (Array.isArray(a.costs) && a.costs.length > 1) {
      for (const c of a.costs) {
        const pool = c.type === 'health' ? 'hp' : c.type;
        const amt = c.type === 'health' ? Math.round(p.maxHp * (rt.healthCostFrac || 0.3)) : c.amount;
        if ((p[pool] || 0) <= amt && pool === 'hp') { this._canonSay(`${a.name} — not enough health`); return null; }
        if ((p[pool] || 0) < amt) { this._canonSay(`${a.name} — not enough ${c.type}`); return null; }
      }
    }
    const needTarget = (range, what = 'no target') => {
      const t = this._canonTarget(range);
      if (!t) { this._canonSay(`${a.name} — ${what}`); return false; }
      this._canonCtx.target = t;
      return true;
    };
    switch (ck) {
      case 'verdantCage': if (!needTarget(rt.range)) return null; break;
      case 'castigate': if (!needTarget(rt.range)) return null; break;
      case 'inexorableDoom': if (!needTarget(rt.range)) return null; break;
      case 'punition': if (!(mode && mode.area) && !needTarget(rt.range)) return null; break;
      case 'verdict': if (!(mode && mode.id === 'standing') && !needTarget(rt.range)) return null; break;
      case 'feastOfBlood': {
        if (mode && mode.id === 'wide') {
          const n = (this.monsters || []).filter(m => m.alive && this._canonBleeding(m)
            && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= rt.wide).length;
          if (!n) { this._canonSay(`${a.name} — nothing bleeding`); return null; }
          break;
        }
        const t = this._canonTarget(rt.range);
        if (!t) { this._canonSay(`${a.name} — no target`); return null; }
        // "Only affects targets with bleeding wounds or who are suffering
        //  from the [Bleeding] affliction."
        if (!this._canonBleeding(t)) { this._canonSay(`${a.name} — it is not bleeding`); return null; }
        this._canonCtx.target = t;
        break;
      }
      case 'feastOfAbsolution': {
        if (mode && mode.id === 'wide') break;
        // "This ability cannot be used on self." An ally if one is chosen,
        // else the enemy in front.
        const ally = this._targets && this._targets.ally ? this._canonAlly(rt.range) : null;
        if (ally) { this._canonCtx.ally = ally; break; }
        if (!needTarget(rt.range)) return null;
        break;
      }
      case 'herosMoment': {
        // "Bestow a powerful boon on an ally" -- never the caster.
        const ally = this._canonAlly(rt.range);
        if (!ally) { this._canonSay(`${a.name} — no ally in reach`); return null; }
        this._canonCtx.ally = ally;
        break;
      }
      case 'bloodHarvest': {
        const bodies = this._canonHarvestBodies(rank);
        if (!bodies.length) { this._canonSay(`${a.name} — no body with blood in reach`); return null; }
        this._canonCtx.bodies = bodies;
        break;
      }
      case 'lifeBolt': break;
      case 'diveBomb': if (!needTarget(rt.range, 'nothing to dive on')) return null; break;
      case 'unstoppableForce': {
        // "Requires a heavy weapon."
        if (!this._canonHeavyInHand()) { this._canonSay(`${a.name} — needs a heavy weapon`); return null; }
        break;
      }
      case 'avatarOfDoom': {
        if (!p.canonAvatarBound) {
          const short = this._canonAvatarShort();
          if (short.length) { this._canonSay(`${a.name} — needs ${short.join(', ')}`, '#ce93d8'); return null; }
        }
        break;
      }
      case 'immortality': {
        if (mode && mode.id === 'purge') spec.cost = null;
        break;
      }
      case 'pathOfShadows': {
        if (this._canonTeleportShut()) return null;
        break;
      }
      default: {
        // ROUND 287 -- his third paste's checks (canonRuntime4Mixin.js).
        if (this._canonPrecheck4) {
          const r = this._canonPrecheck4(ck, a, rank, rt, mode, spec, key);
          if (!r) return null;
          spec = r;
        }
        break;
      }
    }
    return spec;
  },

  _canonBleeding(m) {
    return !!(m && m.debuffs && (m.debuffs.bleed || Object.keys(m.debuffs).some(k => {
      const d = conditionDef(k); return d && hasTag(d, 'blood') && hasTag(d, TAG.affliction);
    })));
  },

  // --------------------------------------------------------------------------
  // THE CAST
  // --------------------------------------------------------------------------
  /** Runs a canon ability. Returns true when it owned the cast. */
  _castCanon(a, key) {
    if (!a || !a.canonKey || !CANON_CAST_KEYS.has(a.canonKey)) return false;
    const ctx = (this._canonCtx && this._canonCtx.key === key) ? this._canonCtx : { key, rank: this._canonRankOf(key), mode: null };
    this._canonCtx = null;
    const fn = this[`_canon_${a.canonKey}`];
    if (!fn) return false;
    // The secondary prices, now the first has been paid.
    if (Array.isArray(a.costs) && a.costs.length > 1) {
      const p = this.player;
      const primary = a.cost && a.cost.type;
      for (const c of a.costs) {
        if (c.type === primary) continue;
        if (c.type === 'health') p.hp = Math.max(1, p.hp - Math.round(p.maxHp * ((CANON_RT[a.canonKey] || {}).healthCostFrac || 0.3)));
        else if (c.type === 'stamina') p.stamina = Math.max(0, p.stamina - c.amount);
        else if (c.type === 'mana') p.mana = Math.max(0, p.mana - c.amount);
      }
    }
    // A mode with its own clock starts it now.
    const m = ctx.mode;
    if (m && m.cdKey && m.cooldown > 0) {
      const cd = (this.player.canonCd = this.player.canonCd || {});
      cd[m.cdKey] = Math.max(cd[m.cdKey] || 0, m.cooldown);
      if (m.alsoIncurs) {
        const other = (CANON_MODES[a.canonKey] || []).find(x => x.cdKey === m.alsoIncurs || x.id === m.alsoIncurs);
        if (other) cd[m.alsoIncurs] = Math.max(cd[m.alsoIncurs] || 0, other.cooldown || 0);
      }
    }
    fn.call(this, a, key, ctx.rank || 'iron', ctx);
    this._canonCasts = (this._canonCasts || 0) + 1;
    return true;
  },

  // --------------------------------------------------------------------------
  // THE ONE DOOR A CANON HIT COMES THROUGH
  // --------------------------------------------------------------------------
  /** Called from `_applyAbilityDebuff` for a canon ability (special strikes,
   *  canon bolts). Applies what its reached rungs inflict, with the verbs his
   *  text uses, plus each ability's own on-hit clause. */
  _canonOnHit(a, m, fromGear = true) {
    if (fromGear && m && m.alive) this._craftedStrike(m);
    if (!a || !m || !m.alive) return null;
    const key = a._canonKnownKey || this._canonKeyFor(a.canonKey);
    const rank = a._canonRank || (key ? this._canonRankOf(key) : 'iron');
    const hook = this[`_canonHit_${a.canonKey}`];
    if (hook) return hook.call(this, a, m, rank);
    // Default: every reached rung's target conditions, as Hemorrhage does.
    if (this._applyCanonRungs) this._applyCanonRungs(a, m, rank);
    return null;
  },

  /** A special strike made for a canon ability, with whatever is in hand. */
  _canonStrike(a, key, rank, extra = {}) {
    const p = this.player;
    const held = p.hands.right || p.hands.left || null;
    const req = held ? (this._weaponBaseId ? this._weaponBaseId(held) : held) : 'unarmed';
    const spec = { ...a, requiresWeapon: held || 'unarmed', _canonKnownKey: key, _canonRank: rank, ...extra };
    void req;
    return this._specialStrike(spec) || 0;
  },

  // --------------------------------------------------------------------------
  // EVERY FRAME
  // --------------------------------------------------------------------------
  _tickCanon(dt) {
    const p = this.player;
    if (!p || !(dt > 0)) return;
    if (p.canonCd) for (const k of Object.keys(p.canonCd)) p.canonCd[k] = Math.max(0, p.canonCd[k] - dt);
    if (p.dead) return;
    const run = (name) => { const f = this[name]; if (f) f.call(this, dt); };
    run('_tickCanonToggles');
    run('_tickSinEater');
    run('_tickHegemony');
    run('_tickCanonFamiliars');
    run('_tickCanonFields');
    run('_tickCanonOverheal');
    run('_tickImmortalityGold');
    run('_tickCanonMisc');
    run('_tickCanon4');   // ROUND 287
    run('_tickCanon5');   // ROUND 288
  },

  /** The hotbar badge for an ability with modes, or '' for one without. */
  _canonModeBadge(key) {
    const e = this.player.knownAbilities && this.player.knownAbilities[key];
    const ck = e && e.ability && e.ability.canonKey;
    if (!ck || !CANON_MODES[ck]) return '';
    const rank = this._canonRankOf(key);
    if (modesAt(ck, rank).length < 2 && ck !== 'cloakOfNight') return '';
    const m = this._canonModeOf(ck, rank);
    return m ? m.label : '';
  },

  /** The badge on a hotbar cell: the mode in use, click to change it. */
  _setHotbarModeBadge(index, key) {
    const bar = typeof document !== 'undefined' && document.getElementById('hotbar');
    const el = bar && bar.children[index];
    if (!el) return;
    const label = this._canonModeBadge(key);
    let b = el.querySelector('.slot-mode');
    if (!label) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.className = 'slot-mode';
      b.addEventListener('mousedown', (e) => { e.stopPropagation(); });
      b.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        const k = b.dataset.abilitykey;
        if (k) { this._cycleCanonMode(k); b.textContent = this._canonModeBadge(k); }
      });
      el.appendChild(b);
    }
    b.dataset.abilitykey = key;
    if (b.textContent !== label) b.textContent = label;
    const e = this.player.knownAbilities[key];
    b.title = `${e.ability.name}: ${label} (click to change)`;
  },

  // ==========================================================================
  // BLOOD
  // ==========================================================================
  /** Bodies Blood Harvest can drink: recently dead, with blood. */
  _canonHarvestBodies(rank) {
    const rt = CANON_RT.bloodHarvest;
    const r = (reached(rank, 'bronze') ? rt.wide : rt.reach) * (this._reachMult ? this._reachMult() : 1);
    const near = (this._corpsesNear ? this._corpsesNear(this.world.x, this.world.y, r) : [])
      .filter(c => !isBloodless({ family: c.family }));
    // "Affects any number of bodies in a wide area" from bronze; one before.
    return reached(rank, 'bronze') ? near : near.slice(0, 1);
  },

  _canon_bloodHarvest(a, key, rank, ctx) {
    const rt = CANON_RT.bloodHarvest;
    const p = this.player;
    const bodies = ctx.bodies || this._canonHarvestBodies(rank);
    let got = { hp: 0, stamina: 0, mana: 0 };
    let drained = 0;
    for (const c of bodies) {
      const share = rt.restore * (1 + rt.rankBonus * (c.rank || 0)) * ((a._scale) || 1);
      for (const [pool, max] of [['hp', 'maxHp'], ['stamina', 'maxStamina'], ['mana', 'maxMana']]) {
        const add = p[max] * share;
        const before = p[pool];
        p[pool] = this._canonOverfill ? this._canonOverfill(pool, add) : Math.min(p[max], p[pool] + add);
        got[pool] += p[pool] - before;
      }
      if (this._drainLineFx) this._drainLineFx(c, a.color || '#b71c1c');
      this._consumeCorpse(c);
      drained++;
      // "Gain an instance of [Blood Frenzy] for each corpse drained, up to a
      //  threshold determined by current rank. After reaching the threshold,
      //  gain instances of [Blood of the Immortal] instead."
      if (reached(rank, 'silver')) {
        const cap = rank === 'gold' ? 3 : 2;
        const fr = p.debuffs && p.debuffs.bloodFrenzy;
        if (!fr || (fr.stacks || 0) < cap) this._canonBoon('bloodFrenzy');
        else this._canonBoon('bloodOfTheImmortal');
      }
      // "Gain [Strength of My Enemies] for each corpse drained, up to a
      //  maximum threshold then gain [Endless Power]"
      if (reached(rank, 'gold')) {
        const s = p.debuffs && p.debuffs.strengthOfMyEnemies;
        const cap = (conditionDef('strengthOfMyEnemies') || {}).stackCap || 3;
        if (!s || (s.stacks || 0) < cap) this._canonBoon('strengthOfMyEnemies');
        else this._canonBoon('endlessPower');
      }
    }
    this._canonHarvested = (this._canonHarvested || 0) + drained;
    this._floatText(this.world.x, this.world.y - 50, `${a.name} ×${drained}: +${Math.round(got.hp)} HP`, a.color || '#b71c1c');
  },

  /** Leech Bite: a special strike; the rungs land through `_canonHit_leechBite`. */
  _canon_leechBite(a, key, rank) {
    this._canonStrike(a, key, rank);
  },
  _canonHit_leechBite(a, m, rank) {
    const rt = CANON_RT.leechBite;
    const p = this.player;
    // "Inflicts or refreshes the [Bleeding] condition. Drains a small amount
    //  of health and stamina when refreshing the [Bleeding] condition."
    const r = this._canonRefreshOrInflict(m, 'bleed');
    if (r.refreshed) {
      const hp = Math.max(1, Math.round(p.maxHp * rt.drainHp * rankPow(rank)));
      const st = Math.max(1, Math.round(p.maxStamina * rt.drainStamina));
      this._canonHurt(m, hp, 'necrotic');
      this._canonDrainHeal(hp, 'hp');
      p.stamina = Math.min(p.maxStamina, p.stamina + st);
      this._leechRefreshDrains = (this._leechRefreshDrains || 0) + 1;
    }
    if (reached(rank, 'bronze')) this._canonInflict(m, 'leechToxin');                 // an instance
    if (reached(rank, 'silver')) this._canonRefreshOrInflict(m, 'taintedMeridians');   // inflicts or refreshes
    if (reached(rank, 'gold')) this._canonInflict(m, 'thiefOfLife');
    return null;
  },

  /** A drain's heal: [Blood Glutton] and the Raiment make drains stronger, and
   *  from Sin Eater's silver a drain may overfill. */
  _canonDrainHeal(amount, pool = 'hp') {
    const p = this.player;
    const own = this._ownAmp ? this._ownAmp(p, 'drain') : 0;
    const worn = (p.itemFx && p.itemFx.drainBoost) || 0;   // the Sanguine Raiment
    const gain = amount * (1 + own + worn);
    const max = pool === 'hp' ? p.maxHp : pool === 'mana' ? p.maxMana : p.maxStamina;
    if (pool === 'hp' && this._healPlayer && !this._canonOverfillOn()) { this._healPlayer(Math.round(gain), { quiet: true }); return gain; }
    p[pool] = this._canonOverfill ? this._canonOverfill(pool, gain) : Math.min(max, p[pool] + gain);
    return gain;
  },

  _canon_feastOfBlood(a, key, rank, ctx) {
    const rt = CANON_RT.feastOfBlood;
    const p = this.player;
    const wide = ctx.mode && ctx.mode.id === 'wide';
    const victims = wide
      ? (this.monsters || []).filter(m => m.alive && this._canonBleeding(m) && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= rt.wide)
      : [ctx.target].filter(Boolean);
    let total = 0;
    for (const m of victims) {
      let dmg = rt.base * this._canonPow(a, rank);
      // "Drains additional health and stamina for each instance of poison on
      //  the target."
      if (reached(rank, 'bronze')) dmg *= 1 + rt.perPoison * this._canonCountTagged(m, ['poison']).instances;
      dmg *= 1 + (this._taggedAmp ? this._taggedAmp(m, 'drain') : 0);
      const dealt = this._canonHurt(m, dmg, 'necrotic') || dmg;
      total += dealt;
      this._canonDrainHeal(dealt, 'hp');
      p.stamina = Math.min(p.maxStamina, p.stamina + dealt * rt.staminaShare);
      this._canonLink(m, a.color || '#b71c1c');
      // "Gain an instance of [Blood Glutton] for each victim."
      if (reached(rank, 'gold')) this._canonBoon('bloodGlutton');
    }
    this._feastDrained = (this._feastDrained || 0) + total;
    this._floatText(this.world.x, this.world.y - 50, `${a.name}${wide ? ` ×${victims.length}` : ''}`, a.color || '#b71c1c');
  },

  // ==========================================================================
  // SIN
  // ==========================================================================
  _canon_punish(a, key, rank) {
    this._canonStrike(a, key, rank, { base: CANON_RT.punish.bonus * this._canonPow(a, rank) / (((this.player.passiveMods || {}).dmgMult) || 1), element: 'necrotic' });
  },
  _canonHit_punish(a, m, rank) {
    const rt = CANON_RT.punish;
    const map = m.debuffs || {};
    const sin = map.sin && map.sin.stacks > 0;
    const pen = map.penance && map.penance.stacks > 0;
    // "If the enemy struck has no instances of [Sin] but does have instances
    //  of [Penance], they do not suffer [Sin] or [Wages of Sin]. They instead
    //  suffer transcendent damage from this ability in place of necrotic
    //  damage and suffer an additional instance of [Penance] and instances of
    //  [Penance] do not drop off for a short period."
    if (reached(rank, 'silver') && !sin && pen) {
      this._canonHurt(m, rt.bonus * this._canonPow(a, rank) * 0.5, 'transcendent');
      const got = this._canonInflict(m, 'penance');
      if (got) got.holdT = rt.penanceHoldSecs;
      this._punishPenance = (this._punishPenance || 0) + 1;
    } else {
      // "Inflicts necrotic damage and the [Sin] affliction."
      this._canonInflict(m, 'sin');
      // "If the target has any instances of [Sin] they suffer an instance of
      //  the [Wages of Sin] affliction."
      if (reached(rank, 'silver') && sin) this._canonInflict(m, 'wagesOfSin');
    }
    if (reached(rank, 'bronze')) this._canonRefreshOrInflict(m, 'priceOfAbsolution');
    if (reached(rank, 'gold')) this._canonInflict(m, 'thiefOfSpirit');
    return null;
  },

  _canon_feastOfAbsolution(a, key, rank, ctx) {
    const rt = CANON_RT.feastOfAbsolution;
    const wide = ctx.mode && ctx.mode.id === 'wide';
    const targets = [];
    if (wide) {
      for (const m of (this.monsters || [])) {
        if (m.alive && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= rt.wide
          && this._canonCountTagged(m, FEAST_TAGS).kinds) targets.push({ e: m, ally: false });
      }
      for (const x of this._canonAllies()) {
        if (Math.hypot(x.x - this.world.x, x.y - this.world.y) <= rt.wide) targets.push({ e: x.ref, ally: true });
      }
    } else if (ctx.ally) targets.push({ e: ctx.ally.ref, ally: true });
    else if (ctx.target) targets.push({ e: ctx.target, ally: false });
    let total = 0;
    for (const t of targets) total += this._feastAbsolve(a, t.e, t.ally, rank);
    this._floatText(this.world.x, this.world.y - 50, `${a.name}: ${total} cleansed`, a.color || '#fff59d');
  },
  /** One target of Feast of Absolution. Returns how many were cleansed. */
  _feastAbsolve(a, e, isAlly, rank) {
    const rt = CANON_RT.feastOfAbsolution;
    const p = this.player;
    const map = e.debuffs || {};
    const tags = isAlly ? [...FEAST_TAGS, 'holy'] : FEAST_TAGS;
    // "This ability circumvents all effects that prevent cleansing." So the
    // entries are taken off directly, not through the cleanse door's locks --
    // and the after-cleanse hook still runs, so [Price of Absolution] and
    // [Penitence] answer as they would to any cleanse.
    const removed = [];
    for (const k of Object.keys(map)) {
      const d = conditionDef(k);
      if (!d || d.helpful) continue;
      if (!tags.some(t2 => hasTag(d, t2))) continue;
      const n = map[k].stacks || 1;
      for (let i = 0; i < n; i++) removed.push(d);
      delete map[k];
    }
    if (!removed.length) return 0;
    const count = new Set(removed.map(d => d.key)).size;
    if (this._afterCleanse) this._afterCleanse(e, removed);
    // "Recover stamina and mana for each affliction cleansed."
    p.stamina = Math.min(p.maxStamina, p.stamina + p.maxStamina * rt.perCleansed * count);
    p.mana = Math.min(p.maxMana, p.mana + p.maxMana * rt.perCleansed * count);
    if (!isAlly && reached(rank, 'bronze') && e.alive) {
      // "Enemies suffer an instance each of [Penance] and [Legacy of Sin] for
      //  each condition cleansed from them."
      this._canonInflict(e, 'penance', count);
      this._canonInflict(e, 'legacyOfSin', count);
    }
    if (isAlly && reached(rank, 'gold')) {
      // "Affected allies gain an instance of [Resistant] and an instance of
      //  [Integrity] for each condition cleansed from them."
      this._applyDebuff(e, 'resistant', { stacks: count, fromPlayer: true, source: p });
      this._applyDebuff(e, 'integrity', { stacks: count, fromPlayer: true, source: p });
    }
    // Sin Eater: "cleanse an affliction using essence abilities".
    if (this._sinEaterNote) this._sinEaterNote(count);
    if (e.wx != null) this._canonLink(e, a.color || '#fff59d');
    this._feastAbsolved = (this._feastAbsolved || 0) + count;
    return count;
  },

  _canon_castigate(a, key, rank, ctx) {
    const rt = CANON_RT.castigate;
    const t = ctx.target;
    if (!t || !t.alive) return;
    // "Burns a painful brand into the target, inflicting slight transcendent
    //  damage and the [Sin] and [Mark of Sin] conditions."
    this._canonHurt(t, rt.dmg * this._canonPow(a, rank), 'transcendent');
    this._canonInflict(t, 'sin');
    const mark = this._canonInflict(t, 'markOfSin');
    if (mark) {
      mark.markedBy = 'player';
      // "[Mark of Sin] imparts resistance to cleanse effects."
      if (reached(rank, 'gold')) mark.cleanseResist = rt.markCleanseResist;
    }
    if (reached(rank, 'bronze')) {
      this._canonRefreshOrInflict(t, 'weightOfSin');
      this._canonBoon('marshalOfJudgement');
    }
    if (reached(rank, 'silver')) this._canonInflict(t, 'mortality');
    this._canonLink(t, a.color || '#fff59d');
    this._floatText(t.wx, t.wy - 34, a.name, a.color || '#fff59d');
  },
};
