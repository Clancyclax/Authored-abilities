// ============================================================================
// ROUND 283 -- THE THREE LEGENDARIES, IN THE HAND; AND THE RITUAL THAT GROWS
// THEM.
//
// Their words are the user's (legendaryText.js); their numbers are
// legendaryItems.js. This file is where each line becomes behaviour:
//
//   [Spell Lance of the Magister]  a one-handed staff ("A feature of the
//     legendary staff is that it can be wielded in 1 hand"). TAP fires the
//     explosive bolt that inflicts [Spell Impetus]; HOLD channels the beam,
//     which costs mana and inflicts [Spell Impetus] on a target it is
//     sustained on. While it is in hand, spells cost more mana and do more;
//     more again with the Tithe in the other hand. An offensive spell from
//     its wielder consumes every [Spell Impetus] on the target to hit harder.
//   [Magister's Tithe]  a wand. TAP is the disruptive-force beam that
//     inflicts [Mana Siphon]; HOLD is the mana-draining beam, stronger on a
//     target under [Mana Siphon] (its `amplifyTagged.drain`) and stronger
//     again when both are held.
//   [Dread Salvation]  a special attack made with it that tries to afflict a
//     target immune to the affliction puts an instance on the blade: [Stone
//     Cutter] for a physical immunity, [Spell Breaker] for a magical one.
//     Every attack then deals the instances' extra force damage.
//
// The ritual hall (interiors.js) has a ritualist whose `ritualKey` opens
// `_openRitual`: every growth item the player holds, each condition shown
// met or not, and the ritual offered only when all are met.
// ============================================================================
import {
  AUTHORED_LEGENDARIES, AUTHORED_KEYS, HOLD_SECONDS, PHYSICAL_IMMUNITY_TAGS,
  legendaryWid, legendaryKeyOf, legendaryWeaponDef, legendaryGrowth, legendaryCardLines,
} from '../data/legendaryItems.js';
import { LEGENDARY_TEXT } from '../data/legendaryText.js';
import { nextGrowthRank } from '../data/growthMaterials.js';
import { needStatus, ritualReady, consumeNeeds } from '../data/ritual.js';
import { growGearItem } from '../data/stats.js';
import { conditionDef } from '../data/debuffs.js';
import { subtypeResists, subtypeOf } from '../data/monsters.js';
import { RANK_ORDER } from '../data/ranks.js';
import { isoProject, isoDepth } from '../data/iso.js';

/** The legendary's own colour, for its name wherever it is printed. */
export const LEGENDARY_NAME_COLOR = '#ff9800';
const STONE_CUTTER_DOUBLE = new Set(['mechanical', 'mineral']);
const SPELL_BREAKER_DOUBLE = new Set(['ethereal', 'elemental']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const LegendaryMixin = {
  // --------------------------------------------------------------------------
  // THE RECORD AND THE DEF
  // --------------------------------------------------------------------------
  /** The legendary's record -- its rank and what is on its blade. Made the
   *  first time it is asked for, so a save from before this round, or a
   *  legendary just picked up, reads as an iron one with a clean blade. */
  _legendaryRec(wid) {
    const key = legendaryKeyOf(wid);
    if (!key || !AUTHORED_LEGENDARIES[key] || !this.player) return null;
    const all = (this.player.legendaries = this.player.legendaries || {});
    if (!all[wid]) all[wid] = { key, rank: 'iron', stacks: { stoneCutter: 0, spellBreaker: 0 } };
    const r = all[wid];
    if (!r.stacks) r.stacks = { stoneCutter: 0, spellBreaker: 0 };
    return r;
  },

  /** The weapon def a legendary swings as, rebuilt when its rank changes. */
  _legendaryDef(wid) {
    const rec = this._legendaryRec(wid);
    if (!rec) return null;
    this._legendaryDefCache = this._legendaryDefCache || {};
    const c = this._legendaryDefCache[wid];
    if (c && c.rank === rec.rank) return c.def;
    const def = legendaryWeaponDef(rec.key, rec);
    this._legendaryDefCache[wid] = { rank: rec.rank, def };
    return def;
  },

  /** Is this legendary in either hand? */
  _wieldingLegendary(key) {
    const h = this.player && this.player.hands;
    const wid = legendaryWid(key);
    return !!h && (h.left === wid || h.right === wid);
  },
  _wieldsBothMagister() {
    return this._wieldingLegendary('spellLance') && this._wieldingLegendary('magistersTithe');
  },

  // --------------------------------------------------------------------------
  // TAP -- the first basic attack, from `_doPlayerAttack`'s shot branch.
  // Returns true when the legendary fired its own tap.
  // --------------------------------------------------------------------------
  _legendaryTap(weapon, range, angle, baseDmg, chance, mult) {
    const L = weapon && AUTHORED_LEGENDARIES[weapon.legendary];
    if (!L || !L.tap) return false;
    if (weapon.legendary === 'spellLance') {
      // "Explosive disruptive-force bolt. Inflicts [Spell Impetus]." Force,
      // not an element: it takes no element and no armour.
      this._fireWeaponShot(weapon, range, angle, baseDmg, chance, mult, {
        element: null, physical: false,
        explodeRadius: L.tap.explodeRadius,
        debuff: { key: L.tap.inflict, chance: 1, duration: 0, stacks: 1 },
        splashDebuff: true, legendaryShot: weapon.legendary,
      });
      this._legendaryTaps = (this._legendaryTaps || 0) + 1;
      return true;
    }
    if (weapon.legendary === 'magistersTithe') {
      // "Disruptive-force beam. Inflicts [Mana Siphon]." A beam arrives: the
      // first thing along it, now.
      const t = this._legendaryBeamTarget(L.tap.range);
      this._legendaryTaps = (this._legendaryTaps || 0) + 1;
      if (!t) { this._drawLegendaryBeam(null, weapon.color, angle, L.tap.range, true); return true; }
      const dmg = Math.max(1, Math.round(baseDmg * L.tap.dmgFrac));
      this._damageMonster(t, dmg, true, false, null);
      this._applyAbilityDebuff({ debuff: { key: L.tap.inflict, chance: 1, duration: 0, stacks: 1 } }, t);
      this._drawLegendaryBeam(t, weapon.color, angle, L.tap.range, true);
      return true;
    }
    return false;
  },

  /** What a beam lands on: the selected enemy if it is within reach, else
   *  the nearest. */
  _legendaryBeamTarget(range) {
    const sel = this._currentTarget ? this._currentTarget('enemy') : null;
    if (sel && sel.alive && !sel.person
        && Math.hypot(sel.wx - this.world.x, sel.wy - this.world.y) <= range + ((sel.type && sel.type.radius) || 0)) return sel;
    return this._nearestMonsterWithin(range);
  },

  // --------------------------------------------------------------------------
  // HOLD -- the second basic attack. The press is noted when the tap fires;
  // every frame after, a hand still held past HOLD_SECONDS channels.
  // --------------------------------------------------------------------------
  _noteLegendaryPress(hand) {
    const wid = this.player.hands[hand];
    const key = legendaryKeyOf(wid);
    const L = key && AUTHORED_LEGENDARIES[key];
    if (!L || !L.hold) return;
    (this._legendPress = this._legendPress || {})[hand] = { key, t: 0, tick: 0, since: 0, target: null };
  },

  /** Is the button for this hand down right now? Mouse, key or pad. */
  _handAttackHeld(hand) {
    if (this._isAnyOverlayOpen && this._isAnyOverlayOpen()) return false;
    if (this._mouseHeld && this._mouseHeld[hand]) return true;
    const P = this.constructor.PAD;
    if (hand === 'right' && this.attackKey && this.attackKey.isDown) return true;
    return !!(P && this._padButtonDown && this._padButtonDown(hand === 'left' ? P.L1 : P.R1));
  },

  _tickLegendaryHold(dt) {
    const presses = this._legendPress;
    let drawn = false;
    if (presses) {
      for (const hand of ['right', 'left']) {
        const pr = presses[hand];
        if (!pr) continue;
        if (this.player.hands[hand] !== legendaryWid(pr.key) || !this._handAttackHeld(hand) || this.player.dead) {
          delete presses[hand];
          continue;
        }
        pr.t += dt;
        if (pr.t < HOLD_SECONDS) continue;
        if (this._channelLegendary(hand, pr, dt)) drawn = true;
        else delete presses[hand];
      }
    }
    if (!drawn && this._legendBeamG) { this._legendBeamG.destroy(); this._legendBeamG = null; }
    this._updateLegendHud();
  },

  /** One frame of a held beam. Returns false when the beam stops. */
  _channelLegendary(hand, pr, dt) {
    const L = AUTHORED_LEGENDARIES[pr.key];
    const H = L.hold;
    const p = this.player;
    const weapon = this._weaponDef(p.hands[hand]);
    const t = this._legendaryBeamTarget(H.range);
    if (t !== pr.target) { pr.target = t; pr.since = 0; }
    this._channelingLegendary = pr.key;
    pr.tick += dt;
    while (pr.tick >= H.tick) {
      pr.tick -= H.tick;
      const base = this._legendaryBaseDmg(weapon);
      if (H.kind === 'beam') {
        // "Consumes mana."
        const cost = H.manaPerSec * H.tick;
        if (p.mana < cost) {
          this._floatText(this.world.x, this.world.y - 34, 'Drained!', 0x90a4ae);
          return false;
        }
        p.mana -= cost;
        if (t) {
          this._damageMonster(t, Math.max(1, Math.round(base * H.dmgFrac)), true, false, null);
          // "Sustaining the beam on a target periodically inflicts [Spell
          // Impetus]." Once per `inflictEvery` seconds ON THE SAME TARGET.
          pr.since += H.tick;
          if (pr.since >= H.inflictEvery - 1e-6) {
            pr.since = 0;
            this._applyAbilityDebuff({ debuff: { key: H.inflict, chance: 1, duration: 0, stacks: 1 } }, t, false);
          }
        }
      } else if (H.kind === 'drain' && t) {
        // "Mana draining beam. This effect is increased if wielding both."
        const amp = (1 + (this._taggedAmp ? this._taggedAmp(t, 'drain') : 0))
          * (this._wieldsBothMagister() ? H.bothMult : 1);
        const got = H.manaPerSec * H.tick * amp;
        p.mana = Math.min(p.maxMana, p.mana + got);
        this._legendaryDrained = (this._legendaryDrained || 0) + got;
        this._damageMonster(t, Math.max(1, Math.round(base * H.dmgFrac)), true, false, null);
      }
    }
    this._drawLegendaryBeam(t, weapon && weapon.color, p.aimAngle || 0, H.range, false, { inward: H.kind === 'drain' });
    this._legendaryChannelT = (this._legendaryChannelT || 0) + dt;
    return true;
  },

  /** ROUND 284 -- "Better beam effects." A beam is three strokes (a wide
   *  soft glow, a body, a white-hot core) that breathe, pulses of light that
   *  run along it -- outward for a force beam, INWARD for a draining one, so
   *  the Tithe's mana is seen coming home -- and a burst where it lands.
   *  `opts.inward` for a drain. A tap flashes the same beam once and fades. */
  _drawLegendaryBeam(t, color, angle, range, flash, opts = {}) {
    if (!this.add || !this.add.graphics) return;
    const a = isoProject(this.world.x, this.world.y);
    const bx = t ? t.wx : this.world.x + Math.cos(angle) * range;
    const by = t ? t.wy : this.world.y + Math.sin(angle) * range;
    const b = isoProject(bx, by);
    const c = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : (color || 0x9575cd);
    let g;
    if (flash) g = this.add.graphics();
    else {
      g = this._legendBeamG || (this._legendBeamG = this.add.graphics());
      g.clear();
    }
    const now = (this.time && this.time.now) || 0;
    const breathe = 0.75 + 0.25 * Math.sin(now / 70);
    const ax = a.x, ay = a.y - 26, ex = b.x, ey = b.y - 20;
    const line = (w, col, al) => { g.lineStyle(w, col, al); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.strokePath(); };
    line((flash ? 9 : 12) * breathe, c, 0.16);
    line((flash ? 4 : 5) * breathe, c, 0.55);
    line(flash ? 1.5 : 2, 0xffffff, 0.9);
    // Pulses along it.
    const n = flash ? 3 : 5;
    for (let i = 0; i < n; i++) {
      let u = ((now / (flash ? 180 : 320)) + i / n) % 1;
      if (opts.inward) u = 1 - u;
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(ax + (ex - ax) * u, ay + (ey - ay) * u, 2.2);
      g.fillStyle(c, 0.5);
      g.fillCircle(ax + (ex - ax) * u, ay + (ey - ay) * u, 4.5);
    }
    // Where it lands.
    if (t) {
      const r = 7 + 4 * Math.sin(now / 55);
      g.fillStyle(c, 0.35); g.fillCircle(ex, ey, r + 5);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(ex, ey, Math.max(2, r * 0.45));
      if (opts.inward) { g.lineStyle(1.5, c, 0.8); g.strokeCircle(ex, ey, r + 9 - ((now / 30) % 9)); }
    }
    // The hands it leaves: a small bloom at the caster.
    g.fillStyle(c, 0.3); g.fillCircle(ax, ay, 5 * breathe);
    g.setDepth(isoDepth(Math.max(this.world.x, bx), Math.max(this.world.y, by)) + 30000);
    this._beamFrames = (this._beamFrames || 0) + 1;
    if (flash) {
      if (this.tweens) this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      else g.destroy();
    }
  },

  /** ROUND 284 -- the legendary strip above the bar: [Dread Salvation]'s
   *  instances, and a charge bar while a tap is becoming a hold. Built once,
   *  refreshed only when what it says changes; the bar's width is set every
   *  frame. Hidden when no legendary is in hand. */
  _updateLegendHud() {
    const dock = typeof document !== 'undefined' && document.getElementById('actionDock');
    if (!dock) return;
    let el = document.getElementById('legendHud');
    const p = this.player;
    const held = ['right', 'left'].map(h => ({ h, wid: p.hands[h], key: legendaryKeyOf(p.hands[h]) })).filter(x => x.key);
    if (!held.length) { if (el) el.style.display = 'none'; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'legendHud';
      dock.insertBefore(el, dock.firstChild);
    }
    el.style.display = '';
    const parts = held.map(x => {
      const rec = this._legendaryRec(x.wid);
      const T = LEGENDARY_TEXT[x.key];
      if (x.key === 'dreadSalvation') {
        const s0 = rec.stacks || {};
        return `<span class="lh-item" data-k="dread"><b>${esc(T.name)}</b> <span class="lh-sc" title="[Stone Cutter]: resonating force per instance">◆ Stone Cutter ${s0.stoneCutter || 0}</span> <span class="lh-sb" title="[Spell Breaker]: disruptive force per instance">✦ Spell Breaker ${s0.spellBreaker || 0}</span></span>`;
      }
      return `<span class="lh-item" data-k="${x.key}" data-hand="${x.h}"><b>${esc(T.name)}</b> <span class="lh-charge"><span class="lh-fill"></span></span> <span class="lh-state">tap · hold</span></span>`;
    });
    const sig = parts.join('');
    if (el._sig !== sig) { el._sig = sig; el.innerHTML = sig; }
    // The charge: how far a press has come toward a hold, and full while
    // channelling.
    for (const span of el.querySelectorAll('.lh-item[data-hand]')) {
      const pr = (this._legendPress || {})[span.dataset.hand];
      const frac = pr ? Math.min(1, pr.t / HOLD_SECONDS) : 0;
      const fill = span.querySelector('.lh-fill');
      const st = span.querySelector('.lh-state');
      if (fill) fill.style.width = `${Math.round(frac * 100)}%`;
      const want = !pr ? 'tap · hold' : frac < 1 ? 'charging' : (span.dataset.k === 'magistersTithe' ? 'draining' : 'beam');
      if (st && st.textContent !== want) st.textContent = want;
      span.classList.toggle('lh-live', !!pr && frac >= 1);
    }
  },

  // --------------------------------------------------------------------------
  // THE LANCE AND SPELLS
  // --------------------------------------------------------------------------
  /** An offensive spell: an active, mana-paid, not a weapon special, that
   *  does damage. */
  _isOffensiveSpell(a) {
    if (!a || a.kind !== 'active' || a.requiresWeapon) return false;
    if (a.cost && a.cost.type === 'stamina') return false;
    return (typeof a.base === 'number' && a.base > 0) || !!a.dot;
  },

  /** The Lance's focus, as { cost, dmg }, or null when it does not apply. */
  _lanceFocus() {
    if (!this._wieldingLegendary('spellLance')) return null;
    const f = AUTHORED_LEGENDARIES.spellLance.spellFocus;
    return this._wieldsBothMagister() ? { cost: f.bothCost, dmg: f.bothDmg } : { cost: f.cost, dmg: f.dmg };
  },

  /** "Increase the mana consumption when casting a spell to increase the
   *  effect." The effect half: the cast's own copy of the ability. */
  _lanceFocusAbility(a) {
    const f = this._lanceFocus();
    if (!f || !this._isOffensiveSpell(a)) return a;
    const out = { ...a };
    if (typeof out.base === 'number') out.base = Math.max(1, Math.round(out.base * (1 + f.dmg)));
    if (out.dot && typeof out.dot.dmgPerTick === 'number') {
      out.dot = { ...out.dot, dmgPerTick: Math.max(1, Math.round(out.dot.dmgPerTick * (1 + f.dmg))) };
    }
    out._lanceFocused = true;
    return out;
  },
  /** ...and the mana half, in `_payAbilityCost`. */
  _lanceFocusCost(a, pool) {
    const f = this._lanceFocus();
    if (!f || pool !== 'mana' || !this._isOffensiveSpell(a) || !a.cost) return a;
    return { ...a, cost: { ...a.cost, amount: Math.ceil(a.cost.amount * (1 + f.cost)) } };
  },

  /** "When the recipient suffers an offensive spell from someone wielding
   *  [Spell Lance of the Magister], all instances of [Spell impetus] are
   *  consumed to increase the effect of the spell." */
  _consumeImpetus(m, dmg) {
    const held = m && m.debuffs && m.debuffs.spellImpetus;
    if (!held || !(held.stacks > 0) || !this._wieldingLegendary('spellLance')) return dmg;
    const n = held.stacks;
    delete m.debuffs.spellImpetus;
    const out = Math.round(dmg * (1 + AUTHORED_LEGENDARIES.spellLance.impetusPerStack * n));
    this._impetusConsumed = (this._impetusConsumed || 0) + n;
    if (this._floatText && m.wx != null) this._floatText(m.wx, m.wy - 44, `Impetus ×${n}`, '#9575cd');
    return out;
  },

  // --------------------------------------------------------------------------
  // DREAD SALVATION
  // --------------------------------------------------------------------------
  /** After a special attack's affliction met this target: was it refused by
   *  what the target is? Then the blade takes an instance. */
  _dreadAfterSpecial(weapon, ability, m) {
    if (!weapon || weapon.legendary !== 'dreadSalvation' || !ability || !m) return null;
    const d = ability.debuff;
    const def = d && conditionDef(d.key);
    if (!def) return null;
    const blocked = subtypeResists(m, def.tags || []);
    if (!blocked || (this._piercesImmunity && this._piercesImmunity(blocked))) return null;
    const rec = this._legendaryRec(weapon.id);
    const cap = AUTHORED_LEGENDARIES.dreadSalvation.stackCap;
    const which = PHYSICAL_IMMUNITY_TAGS.includes(blocked) ? 'stoneCutter' : 'spellBreaker';
    rec.stacks[which] = Math.min(cap, (rec.stacks[which] || 0) + 1);
    const label = which === 'stoneCutter' ? 'Stone Cutter' : 'Spell Breaker';
    if (this._floatText) this._floatText(this.world.x, this.world.y - 52, `[${label}] ${rec.stacks[which]}`, '#ffb74d');
    return which;
  },

  /** "All attacks deal additional resonating-force / disruptive-force
   *  damage", per instance, doubled against what each is highly effective
   *  against. Force, not an element, and not stopped by armour. */
  _dreadBladeHit(weapon, m) {
    if (!weapon || weapon.legendary !== 'dreadSalvation' || !m || !m.alive) return 0;
    const rec = this._legendaryRec(weapon.id);
    const s = rec.stacks;
    const per = AUTHORED_LEGENDARIES.dreadSalvation.perStack * weapon.base;
    const st = subtypeOf(m);
    let total = 0;
    if (s.stoneCutter > 0) {
      const v = Math.max(1, Math.round(per * s.stoneCutter * (STONE_CUTTER_DOUBLE.has(st) || ((m.type && m.type.armor) || 0) > 0.2 ? 2 : 1)));
      this._damageMonster(m, v, true, false, null);
      total += v;
    }
    if (s.spellBreaker > 0 && m.alive) {
      const v = Math.max(1, Math.round(per * s.spellBreaker * (SPELL_BREAKER_DOUBLE.has(st) ? 2 : 1)));
      this._damageMonster(m, v, true, false, null);
      total += v;
    }
    return total;
  },

  // --------------------------------------------------------------------------
  // DROPS
  // --------------------------------------------------------------------------
  /** A gear roll came up Legendary: half the time it is one of his three
   *  instead, one the player does not own yet. */
  _authoredLegendaryFor(rng = Math.random) {
    if (rng() >= 0.5) return null;
    const owned = this.player.ownedWeapons || new Set();
    const open = AUTHORED_KEYS.filter(k => !owned.has(legendaryWid(k)));
    if (!open.length) return null;
    return legendaryWid(open[Math.floor(rng() * open.length)]);
  },

  // --------------------------------------------------------------------------
  // THE CARD
  // --------------------------------------------------------------------------
  _legendaryTipHtml(wid) {
    const rec = this._legendaryRec(wid);
    if (!rec) return '';
    return legendaryCardLines(rec.key, rec).slice(1)
      .map(l => `<div class="tip-buff tip-fx">${esc(l)}</div>`).join('');
  },

  // --------------------------------------------------------------------------
  // THE RITUAL
  // --------------------------------------------------------------------------
  /** Every growth item the player holds, with what it needs next. */
  _growthItems() {
    const p = this.player;
    const out = [];
    for (const wid of (p.ownedWeapons || [])) {
      const key = legendaryKeyOf(wid);
      if (!key || !AUTHORED_LEGENDARIES[key]) continue;
      const rec = this._legendaryRec(wid);
      out.push({ kind: 'w', id: wid, name: LEGENDARY_TEXT[key].name, rank: rec.rank, block: legendaryGrowth(key, rec.rank) });
    }
    const gear = [...((p.inventory && p.inventory.gearItems) || []), ...Object.values(p.gear || {})];
    for (const g of gear) {
      if (!g || g.rarity !== 'Legendary') continue;
      out.push({ kind: 'g', id: String(g.uid), name: g.name, rank: g.rank || 'iron', block: g.growth || null, item: g });
    }
    return out;
  },

  /** A bearer may grow an item to their own rank and no further: a piece
   *  grown past its wearer could not be worn. */
  _ritualRankRefusal(to) {
    const mine = RANK_ORDER.indexOf(this.player.rank || 'normal');
    return mine >= RANK_ORDER.indexOf(to) ? null : `The ritual of ${to} ascension needs a ${to}-rank bearer.`;
  },

  _openRitual(npc) {
    const who = (npc && npc.name) || 'Ritualist';
    const items = this._growthItems();
    if (!items.length) {
      this._openDialogue(who, 'The hall grows what can grow. A legendary piece -- a thing with growth '
        + 'conditions written on it -- and what it asks for. Bring me one, and bring me what it needs.', npc);
      return;
    }
    const inv = this.player.inventory;
    const lines = [];
    const choices = [];
    for (const it of items) {
      if (!it.block) { lines.push(`[${it.name}] (${it.rank} rank): fully grown.`); continue; }
      lines.push(`[${it.name}] (${it.rank} rank) -> ${it.block.to}:`);
      it.block.conditions.forEach((c, i) => {
        const st = needStatus(it.block.needs[i], inv, this.player.coins);
        const mark = st.met ? '✓' : '✗';
        const tally = it.block.needs[i] && it.block.needs[i].kind !== 'ritual' ? ` (${st.have}/${st.want})` : '';
        lines.push(`  ${mark} ${c}${tally}`);
      });
      const refusal = this._ritualRankRefusal(it.block.to);
      if (refusal) lines.push(`  ${refusal}`);
      else if (ritualReady(it.block, inv, this.player.coins)) {
        choices.push({ act: `ritual|${it.kind}|${it.id}`, label: `Perform the Ritual of ${it.block.to} ascension: ${esc(it.name)}` });
      }
    }
    this._openDialogue(who, `${choices.length ? 'Everything is here. Say the word.' : 'Not yet. This is what it asks:'}\n\n${lines.join('\n')}`,
      npc, choices);
  },

  /** Consume and grow. Returns the new rank, or null if refused. */
  _performRitual(kind, id) {
    const it = this._growthItems().find(x => x.kind === kind && x.id === id);
    if (!it || !it.block) return null;
    if (this._ritualRankRefusal(it.block.to)) return null;
    const p = this.player;
    if (!consumeNeeds(it.block, p.inventory, p.coins)) return null;
    let to = null;
    if (kind === 'w') {
      const rec = this._legendaryRec(id);
      to = nextGrowthRank(rec.rank);
      rec.rank = to;
    } else if (it.item && growGearItem(it.item)) {
      to = it.item.rank;
    }
    if (!to) return null;
    this._ritualsPerformed = (this._ritualsPerformed || 0) + 1;
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    if (this._inventoryOpen && this._renderInventory) this._renderInventory();
    this._floatText(this.world.x, this.world.y - 56, `${it.name}: ${to} rank`, LEGENDARY_NAME_COLOR);
    return to;
  },
};
