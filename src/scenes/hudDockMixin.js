// ============================================================================
// ROUND 280 -- THE ACTION DOCK, THE PASSIVE BAR AND THE POTION SLOTS.
//
// From the user's mockup:
//   "2.1) Added 2 potion/consumption slots (these are still set in the
//         players bag but now can be seen)"
//   "2.2) Changing the action bars to a dynamic active ability section on
//         top, and a smaller dynamic passive ability section below."
//   "2.3) Essence colors should be more evident in the players UI. The
//         borders and backgrounds of abilities should be tied to their
//         essence color..."
// And his answers: passives toggle by CLICK only (no keys); the potion slots
// keep [ and ] / D-pad left and right; frames use all four essence colours
// as segments (the CSS ring), each ability its own essence's colour.
//
// The active bar is still `#hotbar`, built by `_updateHotbarDom`; this file
// only gives its cells their colour. The passive bar and the potion slots are
// new, and each is rebuilt only when what it shows changes -- this runs every
// frame, and round 11 already taught this project what per-frame DOM costs.
// ============================================================================
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import { CONSUMABLE_DEFS } from '../data/inventory.js';
import { DPAD_ACTIONS, KEY_LABEL } from '../data/hotkeys.js';
import { itemIconUrl } from './itemIconMixin.js';   // ROUND 281 -- the pack's bottles

/** A consumable's flask colour, read off what it restores. */
function flaskColour(def) {
  if (!def) return null;
  if (def.hp) return '#e53935';
  if (def.mana) return '#42a5f5';
  if (def.stamina) return '#8bc34a';
  return '#d4a24c';   // a dish: something cooked
}

function flaskSvg(colour) {
  const c = colour || '#6b6f7a';
  return `<svg viewBox="0 0 34 42" aria-hidden="true">
    <rect x="13" y="2" width="8" height="4" rx="1" fill="#8d6e4a"/>
    <path d="M14 6 h6 v7 l7 9 a11 11 0 1 1 -20 0 l7 -9 z" fill="rgba(255,255,255,0.10)" stroke="#cfd8dc" stroke-width="1.2"/>
    <path d="M8.6 24 h16.8 a10 10 0 1 1 -16.8 0 z" fill="${c}"/>
    <ellipse cx="13" cy="28" rx="2.2" ry="3.4" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}

export const HudDockMixin = {
  /** The colour an ability's cell takes: its essence's, the confluence's
   *  for a confluence ability, the ability's own as a last resort. */
  _abilityTone(key) {
    const p = this.player;
    const e = p && p.knownAbilities && p.knownAbilities[key];
    if (!e) return null;
    if (e.essenceId === 'confluence') return (p.confluence && p.confluence.color) || (e.ability && e.ability.color) || null;
    const def = e.essenceId && ESSENCE_CATALOG[e.essenceId];
    return (def && def.color) || (e.ability && e.ability.color) || null;
  },

  /** Tint every filled cell of the active bar (and the hand cells after it). */
  _toneHotbarCells() {
    const el = document.getElementById('hotbar');
    if (!el) return;
    const p = this.player;
    const keys = [...(p.hotbar || []).slice(0, el.childElementCount)];
    const cells = el.children;
    const hb = p.handBinds || {};
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const key = c.dataset.handbind ? hb[c.dataset.handbind] : keys[i];
      const tone = key ? this._abilityTone(key) : null;
      if ((c._tone || null) === tone) continue;
      c._tone = tone;
      if (tone) c.style.setProperty('--tone', tone); else c.style.removeProperty('--tone');
    }
  },

  /** The passive bar: one cell per passive, click to switch it. */
  _updatePassiveBarDom() {
    const el = document.getElementById('passiveBar');
    if (!el) return;
    const p = this.player;
    const keys = this._passiveAbilityKeys || [];
    const known = p.knownAbilities || {};
    const sig = keys.map(k => {
      const e = known[k];
      return e && e.ability ? `${k}|${e.ability.name}|${this._passiveOn(k) ? 1 : 0}|${this._abilitySourceIconUrl(k) ? 1 : 0}` : '';
    }).join('~');
    if (this._passiveBarSig === sig) return;
    this._passiveBarSig = sig;
    el.innerHTML = '';
    for (const k of keys) {
      const e = known[k];
      if (!e || !e.ability) continue;
      const on = this._passiveOn(k);
      const cell = document.createElement('div');
      cell.className = `passive-cell${on ? '' : ' off'}`;
      cell.dataset.abilitykey = k;
      cell.title = `${e.ability.name} — ${on ? 'on' : 'off'} (click to switch ${on ? 'off' : 'on'})`;
      const tone = this._abilityTone(k);
      if (tone) cell.style.setProperty('--tone', tone);
      const url = this._abilitySourceIconUrl(k);
      const icon = document.createElement('div');
      icon.className = 'pc-icon';
      icon.style.background = url ? `url(${url}) center/contain no-repeat` : (tone || e.ability.color || '#555');
      cell.appendChild(icon);
      const st = document.createElement('div');
      st.className = 'pc-state';
      st.textContent = on ? 'ON' : 'OFF';
      cell.appendChild(st);
      cell.addEventListener('click', () => {
        this._togglePassive(k);
        this._passiveBarSig = null;
        if (this._inventoryOpen && this._renderInventory) this._renderInventory();
      });
      el.appendChild(cell);
    }
  },

  /** The two potion slots, as bound in the bag. Click drinks. */
  _updatePotionHud() {
    const el = document.getElementById('potionHud');
    if (!el) return;
    const p = this.player;
    const slots = p.potionSlots || [];
    const acts = ['potionLeft', 'potionRight'].map(a => DPAD_ACTIONS.find(d => d.action === a));
    const n = Math.min(2, slots.length || 2);
    const state = [];
    for (let i = 0; i < n; i++) {
      const id = slots[i] || null;
      const held = id ? this._potionCount(id) : 0;
      const cd = this._potionSlotCd(i);
      state.push({ id, held, cd, cdMax: this._potionCooldown() || 60 });
    }
    const sig = state.map(s => `${s.id}|${s.held}|${Math.ceil(s.cd)}`).join('~');
    if (this._potionHudSig === sig) return;
    const rebuild = !this._potionHudSig || el.childElementCount !== n
      || state.some((s, i) => (this._potionHudIds || [])[i] !== s.id);
    this._potionHudSig = sig;
    this._potionHudIds = state.map(s => s.id);
    if (rebuild) {
      el.innerHTML = '';
      state.forEach((s, i) => {
        const def = s.id ? CONSUMABLE_DEFS[s.id] : null;
        const a = acts[i];
        const cell = document.createElement('div');
        cell.className = `potion-slot${def ? '' : ' empty'}`;
        cell.dataset.potion = String(i);
        const keys = a ? ` (${KEY_LABEL[a.key] || a.key} · ${a.label})` : '';
        cell.title = (def ? `${def.name} — ${def.desc}` : 'Empty: bind a consumable on the Equipment page') + keys;
        const url = s.id ? itemIconUrl('consumable', s.id) : null;
        cell.innerHTML = (url ? `<img class="ps-img" src="${url}" alt="">` : flaskSvg(flaskColour(def)))
          + `<div class="ps-cd"></div><div class="ps-cdnum"></div><div class="ps-count"></div>`
          + `<div class="ps-key">${a ? (KEY_LABEL[a.key] || a.key) : ''}<i>${a ? a.label : ''}</i></div>`;
        cell.addEventListener('click', () => { this._usePotionSlot(i); });
        el.appendChild(cell);
      });
    }
    state.forEach((s, i) => {
      const cell = el.children[i];
      if (!cell) return;
      cell.querySelector('.ps-count').textContent = s.id ? String(s.held) : '';
      const frac = s.cd > 0 ? Math.min(1, s.cd / s.cdMax) : 0;
      cell.querySelector('.ps-cd').style.height = `${Math.round(frac * 100)}%`;
      cell.querySelector('.ps-cdnum').textContent = s.cd > 0 ? `${Math.ceil(s.cd)}s` : '';
    });
  },

  /** HP, mana and stamina, as numbers inside their bars. */
  _updateBarTexts() {
    const p = this.player;
    const fmt = (v) => Math.max(0, Math.round(v || 0)).toLocaleString('en-US');
    const rows = [['barHp', p.hp, p.maxHp], ['barMana', p.mana, p.maxMana], ['barStamina', p.stamina, p.maxStamina]];
    for (const [id, v, m] of rows) {
      const t = `${fmt(v)} / ${fmt(m)}`;
      this._barTextCache = this._barTextCache || {};
      if (this._barTextCache[id] === t) continue;
      this._barTextCache[id] = t;
      const el = document.querySelector(`#${id} .bar-text`);
      if (el) el.textContent = t;
    }
  },

  /** Everything the dock draws, once a frame, after the hotbar. */
  _updateDock() {
    if (!this.player) return;
    this._toneHotbarCells();
    this._updatePassiveBarDom();
    this._updatePotionHud();
    this._updateBarTexts();
  },
};
