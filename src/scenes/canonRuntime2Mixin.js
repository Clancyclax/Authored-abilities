// ============================================================================
// ROUND 284 -- HIS CANON ABILITIES, RUNNING (part 2): the passives and
// familiars of Sin and Blood, all of Doom, and Dark.
//
// See canonRuntimeMixin.js for the shape of the layer. Everything here is
// called from there or from one named hook in WorldScene.
// ============================================================================
import { conditionDef, hasTag, TAG } from '../data/debuffs.js';
import { CANON_RT, reached, rankAt, executeScale } from '../data/canonRuntime.js';
import { isoProject, isoDepth } from '../data/iso.js';
import { coinPurseValue, spendCoins, COIN_RANKS, COIN_CONVERSION } from '../data/inventory.js';
import { REGIONS, regionPoint } from '../data/regions.js';

const DOOM_TAGS = ['curse', 'disease', 'poison', 'unholy'];
const rankPow = (rank) => 1 + 0.5 * rankAt(rank);

export const CanonRuntime2Mixin = {
  // ==========================================================================
  // PASSIVE CONTRIBUTIONS, read once per recompute
  // ==========================================================================
  /** What held canon passives and worn canon conjurations add to the stat
   *  pass. Called at the end of `_recomputeDerivedStats`'s ability sweep. */
  _canonPassiveMods(mods) {
    const p = this.player;
    const rank = (ck) => this._canonHeldRank(ck);
    mods.canonAfflictionResist = 0;
    // [Sin Eater] (iron): "Increased resistance to afflictions."
    const se = this._canonPassiveOn('sinEater') ? rank('sinEater') : null;
    if (se) mods.canonAfflictionResist += CANON_RT.sinEater.resist * rankPow(se);
    // [Resistant]: "Resistance to afflictions is increased."
    const res = p.debuffs && p.debuffs.resistant;
    if (res) mods.canonAfflictionResist += CANON_RT.sinEater.perResistant * (res.stacks || 1);
    // [Hegemony] (iron): "Allies within the aura have increased resistance to
    // afflictions" -- the player stands in their own aura.
    if (this._canonPassiveOn('hegemony') && this._auraProjected && this._auraProjected()) {
      mods.canonAfflictionResist += CANON_RT.hegemony.allyResist;
    }
    mods.canonAfflictionResist = Math.min(0.6, mods.canonAfflictionResist);
    // [Cloak of Night]: "Offers limited physical protection."
    if (p.canonCloak && p.canonCloak.on) mods.armorBonus = (mods.armorBonus || 0) + CANON_RT.cloakOfNight.armor;
    // The two familiars, while summoned.
    const fams = p.canonFamiliars || {};
    for (const ck of ['sanguineHorror', 'avatarOfDoom']) {
      const f = fams[ck];
      if (!f || !f.out) continue;
      const k = this._canonKeyFor(ck);
      if (!k) { f.out = false; continue; }
      const a = p.knownAbilities[k].ability;
      const r = this._canonRankOf(k);
      const rt = CANON_RT[ck];
      mods.familiars.push({
        name: ck === 'sanguineHorror' ? 'Sanguine Horror' : 'Avatar of Doom',
        canonKey: ck, canonRank: r, color: a.color || (ck === 'sanguineHorror' ? '#b71c1c' : '#b39ddb'),
        familiarRange: ck === 'sanguineHorror' ? 90 : (rt.beamRange || 220),
        familiarInterval: ck === 'sanguineHorror' ? rt.interval : (rt.beamEvery || 1),
        familiarDmg: Math.max(1, Math.round((ck === 'sanguineHorror' ? rt.dmg * (rt.rankMult[r] || 1) : rt.beamDmg * rankPow(r)))),
        essenceId: a.essenceId,
      });
    }
    if (this._canonPassiveMods4) this._canonPassiveMods4(mods);   // ROUND 287
  },

  /** Is this canon passive held, and switched on? */
  _canonPassiveOn(ck) {
    const k = this._canonKeyFor(ck);
    if (!k) return false;
    if (this._passiveOn) return this._passiveOn(k);
    return true;
  },

  // ==========================================================================
  // SIN EATER
  // ==========================================================================
  /** A harmful affliction on its way to the player: resisted? Rolled at the
   *  door (`_applyDebuff`). Returns true to refuse it. */
  _canonResistsAffliction(def, opts = {}) {
    if (!def || def.helpful || opts.unresistable) return false;
    if (!hasTag(def, TAG.affliction) && !hasTag(def, TAG.dot)) return false;
    const chance = (this.player.passiveMods && this.player.passiveMods.canonAfflictionResist) || 0;
    if (!(chance > 0) || Math.random() >= chance) return false;
    this._floatText(this.world.x, this.world.y - 46, `${def.label} resisted`, '#fff59d');
    this._canonResisted = (this._canonResisted || 0) + 1;
    this._sinEaterNote(1);
    return true;
  },

  /** "Gain an instance of [Resistant] each time you resist an affliction or
   *  cleanse an affliction using essence abilities." And from bronze, "an
   *  instance of [Integrity] for each affliction you resist or remove". */
  _sinEaterNote(count) {
    if (!(count > 0) || !this._canonPassiveOn('sinEater')) return;
    const r = this._canonHeldRank('sinEater') || 'iron';
    this._applyDebuff(this.player, 'resistant', { stacks: count, fromPlayer: true, source: this.player });
    if (reached(r, 'bronze')) this._applyDebuff(this.player, 'integrity', { stacks: count, fromPlayer: true, source: this.player });
    this._sinEaterBanked = (this._sinEaterBanked || 0) + count;
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
  },

  /** Silver: "Health, mana and stamina gained through your own essence
   *  abilities of the drain and recovery type can exceed the normal maximum.
   *  Excess health, stamina and mana deplete over time until the normal
   *  maximum is reached." */
  _canonOverfillOn() {
    return this._canonPassiveOn('sinEater') && reached(this._canonHeldRank('sinEater') || 'iron', 'silver');
  },
  _canonOverfill(pool, add) {
    const p = this.player;
    const max = pool === 'hp' ? p.maxHp : pool === 'mana' ? p.maxMana : p.maxStamina;
    const cap = this._canonOverfillOn() ? max * CANON_RT.sinEater.overCap : max;
    const cur = p[pool] || 0;
    return Math.max(cur, Math.min(cap, cur + add));
  },
  _tickCanonOverheal(dt) {
    const p = this.player;
    const decay = CANON_RT.sinEater.overDecay;
    for (const [pool, max] of [['hp', 'maxHp'], ['mana', 'maxMana'], ['stamina', 'maxStamina']]) {
      if (p[pool] > p[max]) p[pool] = Math.max(p[max], p[pool] - p[max] * decay * dt);
    }
  },

  /** Gold: "Consume curses, diseases, poisons and unholy afflictions on allies
   *  within your aura over time, triggering all normal effects." */
  _tickSinEater(dt) {
    if (!this._canonPassiveOn('sinEater')) return;
    const r = this._canonHeldRank('sinEater') || 'iron';
    if (!reached(r, 'gold')) return;
    this._sinEaterT = (this._sinEaterT || 0) - dt;
    if (this._sinEaterT > 0) return;
    this._sinEaterT = CANON_RT.sinEater.consumeEvery;
    if (this._auraProjected && !this._auraProjected()) return;
    const reach = Math.max(120, ...((this._auras ? this._auras() : []).map(a => this._auraRadius(a))));
    let eaten = 0;
    for (const x of this._canonAllies()) {
      if (Math.hypot(x.x - this.world.x, x.y - this.world.y) > reach) continue;
      for (const tag of DOOM_TAGS) {
        const got = this._cleanseConditions(x.ref, { tag, count: 1 });
        eaten += got.length;
        if (got.length) break;
      }
    }
    if (eaten) {
      this._sinEaterNote(eaten);
      this._sinEaterEaten = (this._sinEaterEaten || 0) + eaten;
    }
  },

  // ==========================================================================
  // HEGEMONY
  // ==========================================================================
  /** The aura, as the aura list carries it. */
  _hegemonyAura(a, key) {
    const r = this._canonRankOf(key);
    const radius = 170 * (reached(r, 'silver') ? CANON_RT.hegemony.silverRadius : 1);
    return { ...a, debuff: null, auraRadius: radius, canonHegemony: true, canonRank: r, auraKey: 'hegemony', auraLabel: a.name };
  },
  _hegemonyAuraLive() {
    return (this._auras ? this._auras() : []).find(x => x && x.canonHegemony) || null;
  },
  /** "enemies within the aura have their resistance to afflictions reduced.
   *  Enemy resistances are further reduced for each instance of [Sin] they
   *  are suffering from." Monsters here resist an affliction by shortening
   *  it, so reduced resistance is a longer affliction. */
  _hegemonyDurMult(m) {
    const h = this._hegemonyAuraLive();
    if (!h || !m || !this._inAura(h, m)) return 1;
    const sin = (m.debuffs && m.debuffs.sin && m.debuffs.sin.stacks) || 0;
    return 1 + CANON_RT.hegemony.enemyDur + CANON_RT.hegemony.perSin * sin;
  },
  /** Bronze: "Inflicts an instance of [Sin] on enemies that make physical or
   *  magical attacks against allies within the aura. Instances applied in
   *  this way cannot be resisted." Called when a monster's blow lands on the
   *  player or a companion. */
  _hegemonyOnAttack(m) {
    const h = this._hegemonyAuraLive();
    if (!h || !m || !m.alive || !reached(h.canonRank, 'bronze')) return;
    if (!this._inAura(h, m)) return;
    this._applyDebuff(m, 'sin', { stacks: 1, fromPlayer: true, source: this.player, unresistable: true, noCompanions: true });
    this._hegemonySins = (this._hegemonySins || 0) + 1;
  },
  /** Silver: "Transcendent damage dealt by enemies within the aura is
   *  downgraded to either resonating-force or disruptive-force damage,
   *  depending on the source." A blow from a body is resonating; a spell,
   *  disruptive. */
  _hegemonyElement(m, element) {
    if (element !== 'transcendent') return element;
    const h = this._hegemonyAuraLive();
    if (!h || !reached(h.canonRank, 'silver') || !this._inAura(h, m)) return element;
    return (m.type && m.type.dmgType === 'magical') ? 'disruptive' : 'resonating';
  },
  /** Gold: "Aura strength does not have to be split when suppressing multiple
   *  auras." */
  _hegemonyNoSplit() {
    const h = this._hegemonyAuraLive();
    return !!(h && reached(h.canonRank, 'gold'));
  },
  _tickHegemony() {},

  // ==========================================================================
  // SANGUINE HORROR
  // ==========================================================================
  _canon_sanguineHorror(a, key, rank) {
    const p = this.player;
    const fams = (p.canonFamiliars = p.canonFamiliars || {});
    const f = fams.sanguineHorror;
    if (f && f.out) {
      // Recast: into the summoner, or back out. "While subsumed within the
      // summoner, the summoner has accelerated healing and stamina recovery."
      this._toggleSubsume && this._toggleSubsume();
      this._recomputeDerivedStats();
      return;
    }
    fams.sanguineHorror = { out: true, biomass: 1, gripT: CANON_RT.sanguineHorror.gripEvery };
    this._recomputeDerivedStats();
    this._rebuildFamiliars && this._rebuildFamiliars();
    this._floatText(this.world.x, this.world.y - 50, 'A Sanguine Horror answers', a.color || '#b71c1c');
  },
  _canon_avatarOfDoom(a, key, rank) {
    const p = this.player;
    const fams = (p.canonFamiliars = p.canonFamiliars || {});
    const f = fams.avatarOfDoom;
    if (f && f.out) {
      this._toggleSubsume && this._toggleSubsume();
      this._recomputeDerivedStats();
      return;
    }
    // The ritual's materials, once: the bond holds after.
    if (!p.canonAvatarBound) {
      if (!this._canonAvatarPay()) { this._canonSay(`${a.name} — the materials are short`); return; }
      p.canonAvatarBound = true;
    }
    fams.avatarOfDoom = { out: true, orbs: [], dashT: CANON_RT.avatarOfDoom.dashEvery, diveT: CANON_RT.avatarOfDoom.orbDiveEvery,
      shieldT: 0, absorbed: 0 };
    this._recomputeDerivedStats();
    this._rebuildFamiliars && this._rebuildFamiliars();
    this._floatText(this.world.x, this.world.y - 50, 'The Avatar of Doom answers', a.color || '#b39ddb');
  },
  /** "Material requirements: 108 [Radiant Quintessence Gems (Iron)]. 108
   *  [Void Quintessence Gems (Iron)]. 1296 [Iron Rank Spirit Coins]." What
   *  is still missing, as words. Radiant is the game's Light quintessence. */
  _canonAvatarShort() {
    const rt = CANON_RT.avatarOfDoom;
    const inv = this.player.inventory || {};
    const out = [];
    for (const mt of rt.materials) {
      const have = (inv.quintessence || []).filter(x => String(x).startsWith(mt.quint)).length;
      if (have < mt.count) out.push(`${mt.count - have} ${mt.label}`);
    }
    const unit = Math.pow(COIN_CONVERSION, Math.max(0, COIN_RANKS.indexOf(rt.coins.rank)));
    const coins = Math.floor(coinPurseValue(this.player.coins || {}) / unit);
    if (coins < rt.coins.count) out.push(`${rt.coins.count - coins} Iron Rank Spirit Coins`);
    return out;
  },
  _canonAvatarPay() {
    if (this._canonAvatarShort().length) return false;
    const rt = CANON_RT.avatarOfDoom;
    const inv = this.player.inventory;
    for (const mt of rt.materials) {
      let left = mt.count;
      inv.quintessence = inv.quintessence.filter(x => (String(x).startsWith(mt.quint) && left > 0) ? (left--, false) : true);
    }
    const unit = Math.pow(COIN_CONVERSION, Math.max(0, COIN_RANKS.indexOf(rt.coins.rank)));
    spendCoins(this.player.coins, rt.coins.count * unit);
    return true;
  },

  /** A canon familiar's strike, from the familiar tick. Returns true when it
   *  handled the blow. */
  _canonFamiliarStrike(f, m, fx, fy) {
    const ck = f.a && f.a.canonKey;
    if (!ck) return false;
    if (this._canonFamiliarStrike4) { const r4 = this._canonFamiliarStrike4(f, m, fx, fy); if (r4 !== undefined) return r4; }   // ROUND 287
    const p = this.player;
    const st = (p.canonFamiliars || {})[ck] || {};
    const r = f.a.canonRank || 'iron';
    if (ck === 'sanguineHorror') {
      const dealt = this._damageMonster(m, f.a.familiarDmg, true, true, null) || f.a.familiarDmg;
      // "Bites from the leech swarm inflict [Bleeding], [Leech Toxin] and
      //  [Necrotoxin]."
      this._canonRefreshOrInflict(m, 'bleed');
      this._canonInflict(m, 'leechToxin');
      this._canonInflict(m, 'necrotoxin');
      // "Leech attacks drain health and stamina, allowing the rapid
      //  replacement of destroyed biomass." Gold: "Can temporarily exceed
      //  normal mass limits through life drain."
      const rt = CANON_RT.sanguineHorror;
      const cap = reached(r, 'gold') ? rt.massCap : 1;
      st.biomass = Math.min(cap, (st.biomass || 1) + dealt * rt.drainShare * 0.01);
      p.stamina = Math.min(p.maxStamina, p.stamina + dealt * 0.25);
      this._sanguineBites = (this._sanguineBites || 0) + 1;
      return true;
    }
    if (ck === 'avatarOfDoom') {
      // Handled by the orbs in `_tickCanonFamiliars`; the familiar's own zap
      // is its dash, which has its own clock.
      return true;
    }
    return false;
  },

  _tickCanonFamiliars(dt) {
    const p = this.player;
    const fams = p.canonFamiliars;
    if (!fams) return;
    const sub = !!this._familiarsSubsumed;
    // --- Sanguine Horror -----------------------------------------------------
    const sh = fams.sanguineHorror;
    if (sh && sh.out) {
      const rt = CANON_RT.sanguineHorror;
      const r = this._canonHeldRank('sanguineHorror') || 'iron';
      if (sh.biomass > 1) sh.biomass = Math.max(1, sh.biomass - rt.massDecay * dt);
      if (sub) {
        // "Healing and recovery rate is determined by how much biomass was
        //  absorbed and increases with the summoner's level of injury."
        const hurt = Math.max(0, 1 - p.hp / Math.max(1, p.maxHp));
        const rate = rt.subsumedRegen * (sh.biomass || 1) * (1 + 2 * hurt);
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * rate * dt);
        p.stamina = Math.min(p.maxStamina, p.stamina + p.maxStamina * rate * dt);
      } else if (reached(r, 'bronze')) {
        // Bronze: "Ranged entangling attacks can be made using cloth strips.
        // Grips inflict minimal constriction damage but periodically inflict
        // [Leech Toxin] and [Necrotoxin] if an area with an open wound is
        // grabbed or the target is suffering the [Bleeding] condition."
        sh.gripT = (sh.gripT || rt.gripEvery) - dt;
        if (sh.gripT <= 0) {
          sh.gripT = rt.gripEvery;
          const t = this._nearestMonsterWithin(rt.gripRange);
          if (t) {
            t.rootT = Math.max(t.rootT || 0, rt.gripRoot);
            this._damageMonster(t, 1, true, true, null);
            if (this._canonBleeding(t)) { this._canonInflict(t, 'leechToxin'); this._canonInflict(t, 'necrotoxin'); }
            sh.gripped = { m: t, t: rt.gripRoot };
            this._canonLink(t, '#b71c1c');
            this._sanguineGrips = (this._sanguineGrips || 0) + 1;
          }
        }
        // The Raiment's grapple: "Health is continually drained from grappled
        // enemies."
        if (sh.gripped && reached(r, 'silver') && this._canonRaimentWorn()) {
          sh.gripped.t -= dt;
          const g = sh.gripped.m;
          if (g && g.alive && sh.gripped.t > 0) {
            const amt = rt.gripDrainPerSec * dt * rankPow(r);
            this._damageMonster(g, amt, true, false, 'necrotic');
            this._canonDrainHeal(amt, 'hp');
          } else sh.gripped = null;
        }
      }
    }
    // --- Avatar of Doom ------------------------------------------------------
    const av = fams.avatarOfDoom;
    if (av && av.out && !sub) this._tickAvatarOrbs(av, dt);
    if (av && av.out && sub) this._avatarShield(av, dt);
  },

  /** The orbs: "Each orb can make sustained beam attacks. One orb inflicts
   *  disruptive-force damage, the other, resonating-force damage." */
  _tickAvatarOrbs(av, dt) {
    const rt = CANON_RT.avatarOfDoom;
    const r = this._canonHeldRank('avatarOfDoom') || 'iron';
    const n = rt.orbs[r] || 2;
    while (av.orbs.length < n) av.orbs.push({ tick: 0, target: null, onTarget: 0, spentT: 0, i: av.orbs.length });
    av.orbs.length = n;
    // "rapid energy dashes, inflicting disruptive-force damage on enemies in
    //  the path of the dash. Orbs do not attack during the dash."
    av.dashT -= dt;
    if (av.dashT <= 0) {
      av.dashT = rt.dashEvery;
      const t = this._nearestMonsterWithin(rt.beamRange);
      if (t) {
        const dmg = rt.dashDmg * rankPow(r);
        for (const m of (this.monsters || [])) {
          if (!m.alive) continue;
          // On the segment from the summoner to the target.
          const ax = this.world.x, ay = this.world.y, bx = t.wx, by = t.wy;
          const L = Math.hypot(bx - ax, by - ay) || 1;
          const u = ((m.wx - ax) * (bx - ax) + (m.wy - ay) * (by - ay)) / (L * L);
          if (u < 0 || u > 1) continue;
          const d = Math.hypot(ax + u * (bx - ax) - m.wx, ay + u * (by - ay) - m.wy);
          if (d <= 26 + ((m.type && m.type.radius) || 0)) this._damageMonster(m, dmg, true, false, 'disruptive');
        }
        av.idleT = rt.orbIdleSecs;
        this._avatarDashes = (this._avatarDashes || 0) + 1;
        this._drawLegendaryBeam && this._drawLegendaryBeam(t, '#b39ddb', 0, rt.beamRange, true);
      }
    }
    if (av.idleT > 0) { av.idleT -= dt; return; }
    // Silver: "The orbs can be consumed on contact with an enemy to afflict
    // the enemy with an instance of Harbinger of Doom."
    if (reached(r, 'silver')) {
      av.diveT -= dt;
      if (av.diveT <= 0) {
        av.diveT = rt.orbDiveEvery;
        const orb = av.orbs.find(o => !(o.spentT > 0));
        const t = this._nearestMonsterWithin(rt.beamRange);
        if (orb && t) {
          orb.spentT = rt.orbRespawn;
          this._applyDebuff(t, 'harbingerOfDoom', { stacks: 1, fromPlayer: true, source: this.player });
          this._avatarDives = (this._avatarDives || 0) + 1;
        }
      }
      this._avatarShield(av, dt);
    }
    for (const orb of av.orbs) {
      if (orb.spentT > 0) { orb.spentT -= dt; continue; }
      orb.tick -= dt;
      if (orb.tick > 0) continue;
      orb.tick = rt.beamEvery;
      const t = orb.target && orb.target.alive && Math.hypot(orb.target.wx - this.world.x, orb.target.wy - this.world.y) <= rt.beamRange
        ? orb.target : this._nearestMonsterWithin(rt.beamRange);
      if (!t) { orb.target = null; continue; }
      if (t !== orb.target) { orb.target = t; orb.onTarget = 0; }
      const el = orb.i % 2 === 0 ? 'disruptive' : 'resonating';
      const bonus = 1 + Math.min(rt.butterflyAbsorbCap, (av.absorbed || 0) * rt.butterflyAbsorbBonus);
      this._damageMonster(t, Math.max(1, Math.round(rt.beamDmg * rankPow(r) * bonus)), true, false, el);
      orb.onTarget++;
      // "Enemies damaged by the avatar are afflicted with [Vulnerable].
      //  Sustained beam damage will cause additional instances to be accrued."
      if (orb.onTarget === 1 || orb.onTarget % rt.vulnEveryTicks === 0) {
        this._applyDebuff(t, 'vulnerable', { stacks: 1, fromPlayer: true, source: this.player });
      }
      this._avatarBeams = (this._avatarBeams || 0) + 1;
    }
  },
  /** Silver: "orbs now also have the ability to provide the summoner with a
   *  shield." A pooled shield, renewed on its clock. */
  _avatarShield(av, dt) {
    const r = this._canonHeldRank('avatarOfDoom') || 'iron';
    if (!reached(r, 'silver')) return;
    const rt = CANON_RT.avatarOfDoom;
    av.shieldT = (av.shieldT || 0) - dt;
    if (av.shieldT > 0) return;
    av.shieldT = rt.shieldEvery;
    const p = this.player;
    const amount = Math.round(p.maxHp * rt.shieldFrac);
    const cur = p.buffs.absorb;
    if (!cur || (cur.amount || 0) < amount) p.buffs.absorb = { amount, t: rt.shieldEvery, name: 'Avatar orbs' };
    this._avatarShields = (this._avatarShields || 0) + 1;
  },
  /** Gold: "Butterflies can be absorbed to enhance other familiar powers."
   *  Called when a butterfly the avatar's harbinger made comes to its end. */
  _avatarAbsorbButterfly() {
    const av = (this.player.canonFamiliars || {}).avatarOfDoom;
    const r = this._canonHeldRank('avatarOfDoom');
    if (!av || !av.out || !r || !reached(r, 'gold')) return false;
    av.absorbed = (av.absorbed || 0) + 1;
    return true;
  },
  /** Gold: "Butterflies create seeking affliction clouds when destroyed.
   *  Butterflies can be absorbed to enhance other familiar powers." A cloud
   *  where it ended, carrying one of its non-holy afflictions onto what it
   *  finds; and the avatar grows a little on each. */
  _avatarButterflyEnds(pr) {
    if (!this._avatarAbsorbButterfly()) return false;
    const payload = (pr.payload || []).filter(k => { const d = conditionDef(k); return d && !hasTag(d, 'holy'); });
    if (payload.length) {
      (this._canonFields = this._canonFields || []).push({ kind: 'harbingerCloud', x: pr.wx, y: pr.wy, t: 3, tick: 0, payload });
      if (this._spawnRingFx) this._spawnRingFx(pr.wx, pr.wy, 60, '#b39ddb');
    }
    this._avatarClouds = (this._avatarClouds || 0) + 1;
    return true;
  },

  /** What a subsumed canon familiar adds to subsumption. The avatar: "making
   *  the summoner's aura much harder to detect and read". */
  _canonSubsumeBonus() {
    const fams = this.player && this.player.canonFamiliars;
    if (!this._familiarsSubsumed || !fams) return { regen: 0, stealth: 0 };
    return { regen: 0, stealth: (fams.avatarOfDoom && fams.avatarOfDoom.out) ? CANON_RT.avatarOfDoom.subsumedSense : 0 };
  },

  // --- the Raiment ----------------------------------------------------------
  _canonRaimentWorn() {
    const g = this.player.gear || {};
    return Object.values(g).some(x => x && x.canonItem === 'sanguineRaiment');
  },
  /** "Item: [Sanguine Raiment] (silver rank, conjured)" -- his lines, with
   *  the game's effect shapes behind them. Biomass-scaled lines read the
   *  familiar's biomass when the stat pass runs. */
  _canonRaimentItem(key) {
    const bio = (((this.player.canonFamiliars || {}).sanguineHorror || {}).biomass) || 1;
    return {
      uid: `canon:${key}:raiment`, slot: 'chest', rarity: 'Epic', rank: 'silver', level: 0,
      name: 'Sanguine Raiment', conjuredBy: key, sellable: false, canonItem: 'sanguineRaiment',
      desc: 'Conjured robes with the power and resilience of an apocalypse beast', typeTags: 'armour, cloth/leather',
      buffs: [{ stat: 'armor', amount: 0.12, inherent: true }],
      effects: [
        { key: 'raimentArmour', text: 'Increased resistance to damage. Highly effective against cutting and piercing damage, less effective against blunt damage.', buffs: [{ stat: 'armor', amount: 0.06, effect: true }], num: '+6% armour' },
        { key: 'raimentMending', text: 'Heal over time effects have increased strength and duration. This effect scales with the amount of familiar biomass being shared with the summoner and amplifies the passive healing the familiar provides.', fx: { hotBoost: Math.round(0.2 * bio * 100) / 100 }, num: `+${Math.round(20 * bio)}% heal-over-time` },
        { key: 'raimentDrain', text: 'Drain abilities have increased effect. This effect scales with the amount of familiar biomass being shared with the summoner.', fx: { drainBoost: Math.round(0.2 * bio * 100) / 100 }, num: `+${Math.round(20 * bio)}% drain` },
        { key: 'raimentBlood', text: 'Resistance to blood effects in significantly increased.', fx: { tagResist: { blood: 0.5 } }, num: 'blood afflictions 50% shorter' },
        { key: 'raimentGrapple', text: 'Can be used to make ranged grapple attacks. Health is continually drained from grappled enemies.', num: 'the familiar\'s grips drain to you' },
      ],
    };
  },

  // ==========================================================================
  // DOOM
  // ==========================================================================
  _canon_inexorableDoom(a, key, rank, ctx) {
    const t = ctx.target;
    if (!t || !t.alive) return;
    // "Periodically applies an additional instance of each stacking curse,
    //  disease, poison or unholy affliction the target is suffering from."
    const d = this._canonInflict(t, 'inexorableDoom');
    // Gold: "Rate at which additional afflictions are applied is
    // significantly accelerated."
    if (d && reached(rank, 'gold')) { d.deepenEvery = CANON_RT.inexorableDoom.goldDeepenEvery; d.deepenT = Math.min(d.deepenT || 99, d.deepenEvery); }
    if (reached(rank, 'bronze')) this._canonRefreshOrInflict(t, 'inescapable');
    if (reached(rank, 'silver')) this._canonInflict(t, 'persecution');
    this._canonLink(t, a.color || '#7e57c2');
    this._floatText(t.wx, t.wy - 34, a.name, a.color || '#7e57c2');
  },

  _canon_punition(a, key, rank, ctx) {
    const rt = CANON_RT.punition;
    const mode = ctx.mode || { mult: 1 };
    const targets = mode.area
      ? (this.monsters || []).filter(m => m.alive && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= mode.area)
      : [ctx.target].filter(Boolean);
    let hits = 0;
    for (const t of targets) {
      // "Inflicts necrotic damage for each curse, disease, poison and unholy
      //  affliction the target is suffering."
      const n = this._canonCountTagged(t, DOOM_TAGS).kinds;
      if (n) { this._canonHurt(t, rt.perAffliction * n * (mode.mult || 1) * this._canonPow(a, rank), 'necrotic'); hits++; }
      if (reached(rank, 'bronze')) this._canonRefreshOrInflict(t, 'penitence');
      this._canonLink(t, a.color || '#7e57c2');
    }
    if (mode.area) this._spawnRingFx(this.world.x, this.world.y, mode.area, a.color || '#7e57c2');
    // "Consecutive, extreme-cost incantations have truncated incantations."
    const said = mode.truncates && this._punitionLastExtreme && (this.time.now - this._punitionLastExtreme < 4000) ? 'Suffer.' : 'Suffer the cost of your transgressions.';
    this._punitionLastExtreme = mode.truncates ? this.time.now : 0;
    this._floatText(this.world.x, this.world.y - 60, `“${said}”`, a.color || '#7e57c2');
    this._punitionHits = (this._punitionHits || 0) + hits;
  },

  _canon_verdict(a, key, rank, ctx) {
    const rt = CANON_RT.verdict;
    if (ctx.mode && ctx.mode.id === 'standing') {
      // Gold: "Can be used as a wide area ongoing effect with less immediate
      // damage."
      (this._canonFields = this._canonFields || []).push({ kind: 'verdict', x: this.world.x, y: this.world.y, t: rt.standingSecs, tick: 0, a, rank });
      this._spawnRingFx(this.world.x, this.world.y, rt.standingRadius, a.color || '#fff59d');
      return;
    }
    this._verdictStrike(a, ctx.target, rank, 1);
  },
  /** One sentence on one body. `frac` scales the immediate damage. */
  _verdictStrike(a, t, rank, frac) {
    const rt = CANON_RT.verdict;
    if (!t || !t.alive) return 0;
    let base = rt.base;
    // Bronze: "Base damage is increased for each instance of [Penance] on the
    // target."
    if (reached(rank, 'bronze')) base += rt.perPenance * ((t.debuffs && t.debuffs.penance && t.debuffs.penance.stacks) || 0);
    // "As an execute effect, damage scales exponentially with the enemy's
    //  level of injury." [Legacy of Sin] steepens it.
    const legacy = this._executeAmp ? this._executeAmp(t) : 0;
    const scale = executeScale(t.hp, t.maxHp, rt.curve, legacy);
    const dealt = this._canonHurt(t, base * scale * frac * this._canonPow(a, rank), 'transcendent');
    if (reached(rank, 'silver')) {
      const s = this._canonRefreshOrInflict(t, 'sanction');
      if (s.got) s.got.injuryScale = scale;
    }
    this._canonLink(t, a.color || '#fff59d');
    this._verdictLast = { scale, dealt };
    return dealt;
  },

  _tickCanonFields(dt) {
    const list = this._canonFields;
    if (!list || !list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      f.t -= dt;
      f.tick -= dt;
      if (f.kind === 'harbingerCloud' && f.tick <= 0) {
        f.tick = 1;
        // "seeking": it drifts toward the nearest body and afflicts what it
        // reaches.
        const t = this._nearestLiveMonster ? this._nearestLiveMonster(f.x, f.y, 160) : null;
        if (t) { f.x += (t.wx - f.x) * 0.5; f.y += (t.wy - f.y) * 0.5; }
        for (const m of (this.monsters || [])) {
          if (!m.alive || Math.hypot(m.wx - f.x, m.wy - f.y) > 60) continue;
          const k = f.payload[Math.floor(Math.random() * f.payload.length)];
          this._applyDebuff(m, k, { stacks: 1, fromPlayer: true, source: this.player });
        }
      }
      if (f.kind === 'verdict' && f.tick <= 0) {
        f.tick = 1;
        const rt = CANON_RT.verdict;
        for (const m of (this.monsters || [])) {
          if (m.alive && Math.hypot(m.wx - f.x, m.wy - f.y) <= rt.standingRadius) this._verdictStrike(f.a, m, f.rank, rt.standingFrac);
        }
      }
      if (f.t <= 0) list.splice(i, 1);
    }
  },

  /** Blade of Doom: conjure it (the weapon reconcile builds it) and take it
   *  in hand. The form follows the mode badge. */
  _canon_bladeOfDoom(a, key, rank) {
    this._canonConjureAndWield(a, key);
  },
  _refreshBladeForm() {
    const k = this._canonKeyFor('bladeOfDoom');
    if (!k) return;
    const wid = `conjured:${k}`;
    if (this._conjuredWeaponDefs && this._conjuredWeaponDefs[wid]) {
      const form = this._canonModeOf('bladeOfDoom', this._canonRankOf(k));
      const penitent = form && form.id === 'penitent';
      Object.assign(this._conjuredWeaponDefs[wid], {
        name: penitent ? 'Penitent, the Blade of Sacrifice' : 'Ruin, the Blade of Tribulation',
        color: penitent ? '#fff59d' : '#6a1b9a', canonForm: penitent ? 'penitent' : 'ruin',
      });
    }
  },
  /** What the conjured canon weapons do on every hit. Called from the melee
   *  loop for a weapon with a canon source. `special` is true for a special
   *  attack's swing. */
  _canonWeaponHit(weapon, m, special, baseDmg) {
    if (!weapon || !weapon.canonKey || !m || !m.alive) return;
    const k = weapon.conjuredBy;
    const rank = k ? this._canonRankOf(k) : 'iron';
    if (weapon.canonKey === 'bladeOfDoom') {
      const rt = CANON_RT.bladeOfDoom;
      const penitent = weapon.canonForm === 'penitent';
      // "Attacks made with Ruin will inflict an instance of [Vulnerable] and
      //  refresh any wounding effects on the target. Wounding effects
      //  refreshed by Ruin require more healing than normal to negate."
      // Penitent: "an instance of [Price in Blood]" in place of [Vulnerable].
      if (penitent) {
        this._canonInflict(m, 'priceInBlood');
        this._applyDebuff(this.player, 'priceInBlood', { stacks: 1, fromPlayer: true, source: m, _shared: true });
      } else this._canonInflict(m, 'vulnerable');
      this._canonRefreshWounds(m, rt.woundMult);
      if (!penitent && reached(rank, 'bronze')) {
        this._canonInflict(m, 'ruinationBlood');
        this._canonInflict(m, 'ruinationFlesh');
        this._canonInflict(m, 'ruinationSpirit');
      }
      // Gold: "Sword inflicts additional damage for each instance of [Legacy
      // of Sin]"
      if (reached(rank, 'gold')) {
        const n = (m.debuffs && m.debuffs.legacyOfSin && m.debuffs.legacyOfSin.stacks) || 0;
        if (n) this._canonHurt(m, rt.perLegacy * n * rankPow(rank), penitent ? 'transcendent' : 'necrotic');
      }
      this._bladeOfDoomHits = (this._bladeOfDoomHits || 0) + 1;
    } else if (weapon.canonKey === 'dragonWingSword') {
      this._dragonSwordHit && this._dragonSwordHit(weapon, m, special, rank, baseDmg);
    }
  },
  /** Refresh every wounding effect on a target, and make it cost more
   *  healing to negate. */
  _canonRefreshWounds(m, mult) {
    const map = m.debuffs || {};
    for (const k of Object.keys(map)) {
      const d = conditionDef(k);
      if (!d || !hasTag(d, 'wounding')) continue;
      const before = map[k].stacks || 1;
      const got = this._applyDebuff(m, k, { stacks: 1, fromPlayer: true, source: this.player });
      if (got) { got.stacks = before; got.woundMult = Math.max(got.woundMult || 1, mult); }
    }
  },

  // ==========================================================================
  // DARK
  // ==========================================================================
  /** Cloak of Night: cast puts it on (or takes it off); the badge picks what
   *  it is doing. "Cannot be given or taken away" -- so it is worn, not a bag
   *  item. */
  _canon_cloakOfNight(a, key, rank) {
    const p = this.player;
    const cur = p.canonCloak;
    const mode = this._canonModeOf('cloakOfNight', rank);
    if (cur && cur.on && cur.mode === (mode && mode.id)) {
      p.canonCloak = { on: false, mode: cur.mode };
      this._floatText(this.world.x, this.world.y - 46, 'The cloak unravels', a.color || '#5c6bc0');
    } else {
      p.canonCloak = { on: true, mode: mode ? mode.id : 'shadow', rank };
      this._floatText(this.world.x, this.world.y - 46, `Cloak of Night: ${mode ? mode.label : ''}`, a.color || '#5c6bc0');
    }
    this._recomputeDerivedStats();
  },
  /** What the cloak's current mode is doing, for movement and the aggro
   *  reader. */
  _cloakState() {
    const c = this.player && this.player.canonCloak;
    if (!c || !c.on) return null;
    return c;
  },
  _cloakDrainPerSec(c) {
    const rt = CANON_RT.cloakOfNight;
    const r = this._canonHeldRank('cloakOfNight') || 'iron';
    switch (c.mode) {
      // Bronze: "Weight reduction no longer costs mana unless affecting
      // additional people."
      case 'lighten': return reached(r, 'bronze') ? 0 : rt.drain.lighten;
      case 'glide': return rt.drain.glide;
      // "flight for a low ongoing mana cost, increasing to a moderate ongoing
      //  mana cost while in direct sunlight."
      case 'flight': return (!this._insideRoom && (this._darkness || 0) < 0.3) ? rt.drain.flightSun : rt.drain.flight;
      case 'void': return rt.drain.void;
      default: return 0;
    }
  },
  /** The cloak's movement: floating (water walking), gliding, flying. */
  _cloakMoves() {
    const c = this._cloakState();
    if (!c) return { water: false, lava: false, speed: 0 };
    const rt = CANON_RT.cloakOfNight;
    if (c.mode === 'lighten') return { water: true, lava: false, speed: 0 };
    if (c.mode === 'glide') return { water: true, lava: false, speed: rt.glideSpeed };
    if (c.mode === 'flight') return { water: true, lava: true, speed: rt.glideSpeed };
    return { water: false, lava: false, speed: 0 };
  },
  /** Shade: "blend into shadows" -- harder to notice, more so in the dark. */
  _cloakAggroMult() {
    const c = this._cloakState();
    if (!c || c.mode !== 'shadow') return 1;
    const dark = this._insideRoom ? 0.6 : (this._darkness || 0);
    return 1 - CANON_RT.cloakOfNight.shadowSense * (0.5 + 0.5 * dark);
  },
  /** A monster's blow or bolt meeting the cloak. Returns the damage left.
   *  `shot` is true for a bolt. */
  _cloakMeetsBlow(m, dmg, shot) {
    const c = this._cloakState();
    if (!c) return dmg;
    const rt = CANON_RT.cloakOfNight;
    const r = this._canonHeldRank('cloakOfNight') || 'iron';
    // Gold: "Cloak can act as a void portal ... harmlessly allowing attacks
    // to pass through and confusing living entities that go into it."
    if (c.mode === 'void') {
      if (m && m.alive && !shot && this._confuseMonster && !(m.type && ['skeleton', 'slimeGolem', 'elemental', 'shade'].includes(m.type.family))) {
        this._confuseMonster(m, rt.confuseSecs, 0);
      }
      this._cloakVoided = (this._cloakVoided || 0) + 1;
      return 0;
    }
    // Bronze: "Cloak reflexively intercepts projectiles. Highly effective
    // against rapid, weaker attacks, but less effective against powerful,
    // singular attacks."
    if (shot && reached(r, 'bronze')) {
      const weak = dmg <= this.player.maxHp * rt.weakFrac;
      if (Math.random() < (weak ? rt.interceptWeak : rt.interceptStrong)) {
        this._floatText(this.world.x, this.world.y - 46, 'Cloak intercepts', '#9fa8da');
        this._cloakIntercepts = (this._cloakIntercepts || 0) + 1;
        return 0;
      }
    }
    // Silver: "Cloak passively manipulates physical space, slightly shifting
    // the trajectory of incoming attacks."
    if (reached(r, 'silver') && Math.random() < rt.deflect) {
      this._floatText(this.world.x, this.world.y - 46, 'Shifted aside', '#9fa8da');
      this._cloakDeflects = (this._cloakDeflects || 0) + 1;
      return 0;
    }
    return dmg;
  },

  /** Path of Shadows. */
  _canon_pathOfShadows(a, key, rank, ctx) {
    const mode = ctx.mode || { id: 'step' };
    if (mode.id === 'step') { this._shadowStep(a, rank); return; }
    this._openShadowGates(a, mode, rank);
  },
  _canonTeleportShut() {
    const shut = Object.keys(this.player.debuffs || {}).find(k2 => { const d2 = conditionDef(k2); return d2 && d2.blocksTeleport; });
    if (!shut) return false;
    const d2 = conditionDef(shut);
    this._canonSay(`${(d2 && d2.label) || 'Held'}: no way out`, (d2 && d2.color) || '#ce93d8');
    return true;
  },
  /** "Teleport using shadows as a portal. You must be able to see the
   *  destination shadow." Bronze: "You can sense nearby shadows and teleport
   *  to them without requiring a line of sight." */
  _shadowStep(a, rank) {
    const rt = CANON_RT.pathOfShadows;
    const range = reached(rank, 'bronze') ? rt.stepBronze : rt.stepIron;
    const ang = this.player.aimAngle || 0;
    const sx = this.world.x, sy = this.world.y;
    let best = null;
    for (let d = 16; d <= range; d += 8) {
      const nx = sx + Math.cos(ang) * d, ny = sy + Math.sin(ang) * d;
      const blocked = this._collidesObstacle(nx, ny, 12) || this._isWaterAt(nx, ny);
      if (blocked) { if (!reached(rank, 'bronze')) break; continue; }   // the wall ends sight at iron
      best = { nx, ny };
    }
    if (!best) { this._canonSay(`${a.name} — no shadow in sight`); this.player.mana += 6; return; }
    this._spawnRingFx(sx, sy, 40, '#311b92');
    this.teleportTo ? this.teleportTo(best.nx, best.ny) : (this.world.x = best.nx, this.world.y = best.ny);
    this._spawnRingFx(best.nx, best.ny, 40, '#311b92');
    this._shadowSteps = (this._shadowSteps || 0) + 1;
  },
  _allRegions() { return REGIONS; },
  _settlementWorld(r, s) { return s && s.at ? regionPoint(r, s.at) : null; },
  /** Every settlement the player has been to, with where it is. */
  _canonVisitedPlaces() {
    const out = [];
    const REG = this._allRegions ? this._allRegions() : [];
    for (const r of REG) {
      for (const s of (r.settlements || [])) {
        const at = this._settlementWorld ? this._settlementWorld(r, s) : null;
        if (!at) continue;
        if (this._isExplored && !this._isExplored(at.x, at.y)) continue;
        out.push({ id: s.id, name: s.name, region: r, x: at.x, y: at.y });
      }
    }
    return out;
  },
  /** The gate: a list of places, by the mode's reach. Bronze: the region
   *  you are in ("a regional scale"). Silver: "double the range" -- this
   *  region and the ones beside it. Gold: "global distances" -- anywhere. */
  _openShadowGates(a, mode, rank) {
    const here = this.currentRegion;
    const places = this._canonVisitedPlaces().filter(pl => {
      if (mode.id === 'globalGate') return true;
      if (mode.id === 'longGate') return pl.region === here || (here && Math.abs((pl.region.col || 0) - (here.col || 0)) + Math.abs((pl.region.row || 0) - (here.row || 0)) <= 1);
      return pl.region === here;
    });
    if (!places.length) { this._canonSay(`${a.name} — nowhere you have been`); return; }
    this._pendingShadowGate = { mode: mode.id, places };
    const choices = places.slice(0, 12).map((pl, i) => ({ act: `shadowGate|${i}`, label: `${pl.name}${pl.region !== here ? ` (${pl.region.name})` : ''}` }));
    this._openDialogue(a.name, 'A shadow gate opens under your feet. Where does it let out?', null, choices);
  },
  _takeShadowGate(i) {
    const g = this._pendingShadowGate;
    this._pendingShadowGate = null;
    const pl = g && g.places[i];
    if (!pl) return false;
    this._spawnRingFx(this.world.x, this.world.y, 60, '#311b92');
    this.teleportTo(pl.x + 40, pl.y + 40);
    // "Capacity: 1 bronze-rank, living entity" -- the companions who fit
    // come through with you.
    const cap = CANON_RT.pathOfShadows.capacity[this._canonHeldRank('pathOfShadows') || 'iron'] || 0;
    let n = 0;
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      if (n >= cap) break;
      m.x = this.world.x + 30 * (n + 1); m.y = this.world.y + 20; n++;
    }
    this._spawnRingFx(this.world.x, this.world.y, 60, '#311b92');
    this._floatText(this.world.x, this.world.y - 46, pl.name, '#9fa8da');
    this._shadowGates = (this._shadowGates || 0) + 1;
    return true;
  },

  /** Hand of the Reaper: a toggle, paid by the second. */
  _canon_handOfTheReaper(a, key, rank) {
    const p = this.player;
    p.canonHand = p.canonHand && p.canonHand.on ? { on: false } : { on: true, rank, armT: 0 };
    this._floatText(this.world.x, this.world.y - 46, p.canonHand.on ? 'A shadow arm unfolds' : 'The arm withdraws', a.color || '#4a148c');
    if (!p.canonHand.on) this._dismissReaperArms();
  },
  _reaperHand() {
    const h = this.player && this.player.canonHand;
    return h && h.on ? h : null;
  },
  /** A special attack made while the arm is out: more reach, and the arm's
   *  afflictions. Called from `_applyAbilityDebuff` for a strike rider. */
  _reaperArmHit(m) {
    const h = this._reaperHand();
    if (!h || !m || !m.alive) return;
    const r = this._canonHeldRank('handOfTheReaper') || 'iron';
    // "Special attacks made using the arm inflict [Creeping Death] in
    //  addition to other effects." Bronze: [Rigor Mortis]. Silver:
    //  [Weakness of the Flesh].
    this._canonInflict(m, 'creepingDeath');
    if (reached(r, 'bronze')) this._canonInflict(m, 'rigorMortis');
    if (reached(r, 'silver')) this._canonInflict(m, 'weaknessOfTheFlesh');
    this._reaperArmHits = (this._reaperArmHits || 0) + 1;
  },
  /** The connected arms reach further targets: bronze's second arm, and
   *  gold's "Up to six arms may be directly connected to the conjurer." */
  _reaperExtraTargets(first) {
    const h = this._reaperHand();
    if (!h || !first) return [];
    const r = this._canonHeldRank('handOfTheReaper') || 'iron';
    const n = CANON_RT.handOfTheReaper.extraTargets[r] || 0;
    if (!n) return [];
    return (this.monsters || []).filter(m => m.alive && m !== first
      && Math.hypot(m.wx - first.wx, m.wy - first.wy) <= CANON_RT.handOfTheReaper.armReach)
      .slice(0, n);
  },
  /** Silver: "Numerous additional arms can be conjured from nearby shadows
   *  but only arms directly connected to the conjurer can bestow afflictions
   *  and use melee special attacks. The rank of conjured arms not connected
   *  to the conjurer is one rank below that of the conjurer." Gold: "They can
   *  be armed with your conjured weapons." Summons that strike, no
   *  afflictions. */
  _tickReaperArms(dt, h) {
    const r = this._canonHeldRank('handOfTheReaper') || 'iron';
    const want = CANON_RT.handOfTheReaper.freeArms[r] || 0;
    const mine = (this._summons || []).filter(s => s.canonArm);
    if (mine.length >= want) return;
    h.armT = (h.armT || 0) - dt;
    if (h.armT > 0) return;
    h.armT = 1.5;
    const below = Math.max(0, rankAt(r) - 1);
    // Gold: an arm holding a conjured weapon strikes with it.
    const conj = [...(this.player.ownedWeapons || [])].find(w => String(w).startsWith('conjured:'));
    const wdef = conj && this._weaponDef(conj);
    const dmg = Math.round((reached(r, 'gold') && wdef ? wdef.base : CANON_RT.handOfTheReaper.armDmg) * (1 + 0.5 * below));
    const rec = this._spawnSummon({ name: 'Shadow Arm', color: '#4a148c', template: 'activeSummon', summonKind: 'creature',
      summonFamily: null, summonMoves: false, summonDmg: dmg, summonRange: 80, summonInterval: 1.3, summonDuration: 9999, summonTemporary: true });
    if (rec) rec.canonArm = true;
  },
  _dismissReaperArms() {
    const list = this._summons || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].canonArm) continue;
      if (list[i].sprite && list[i].sprite.active) list[i].sprite.destroy();
      list.splice(i, 1);
    }
  },

  /** Every canon toggle's drain, and the arms. */
  _tickCanonToggles(dt) {
    const p = this.player;
    const pay = (perSec, what) => {
      if (!(perSec > 0)) return true;
      const need = perSec * dt;
      if (p.mana < need) { this._canonSay(`${what} — out of mana`); return false; }
      p.mana -= need;
      return true;
    };
    const c = this._cloakState();
    if (c && !pay(this._cloakDrainPerSec(c), 'Cloak of Night')) { p.canonCloak.on = false; this._recomputeDerivedStats(); }
    const h = this._reaperHand();
    if (h) {
      if (!this._canonKeyFor('handOfTheReaper') || !pay(CANON_RT.handOfTheReaper.drain, 'Hand of the Reaper')) { p.canonHand = { on: false }; this._dismissReaperArms(); }
      else this._tickReaperArms(dt, h);
    }
    const w = p.canonWings;
    if (w && w.on) {
      const r = this._canonHeldRank('dragonWings') || 'iron';
      const rt = CANON_RT.dragonWings;
      if (!this._canonKeyFor('dragonWings') || !pay(reached(r, 'bronze') ? rt.drainBronze : rt.drainIron, 'Dragon Wings')) { p.canonWings = { on: false }; this._recomputeDerivedStats(); }
      else if (reached(r, 'bronze') && this._wingBuffet) this._wingBuffet(dt, w);
    }
  },
};
