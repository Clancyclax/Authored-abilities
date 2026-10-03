// ============================================================================
// ROUND 279 -- EVERY PASSIVE HAS A SWITCH.
//
//   "Midnight Eyes is a passive ability with a toggle. All passive abilities
//    should be something a player can toggle on and off at will."
//
// ONE RECORD, ONE READER. `player.passivesOff` maps an ability key to the
// NAME of the passive that was switched off there. Keys are positional
// (slot:socket), so a re-socket can put a different passive behind the same
// key; storing the name means a switch belongs to the ability it was flipped
// on, and a stale one is dropped on the next kit rebuild instead of silently
// switching off whatever arrives in that socket next.
//
// Every reader of a passive's EFFECT asks `_liveKnown()` rather than
// `player.knownAbilities`: the stat aggregation, the mastery, arsenal,
// conjured-item, damage-transfer, stacking, kill-extension and undeath
// passes. The roster, the hotbar and the kit itself keep reading the whole
// kit, because a switched-off passive is still an ability you have -- it is
// just not running.
//
// No gate, no cost, no cooldown: "at will". Auras keep their own
// project/retract control beside this one (see the note on `_togglePassive`).
// ============================================================================

import { auraLockedBy } from '../data/debuffs.js';

export const PassiveToggleMixin = {
  /** Is the passive at this key running? Actives always answer yes. */
  _passiveOn(key) {
    const p = this.player;
    const e = p && p.knownAbilities && p.knownAbilities[key];
    if (!e || !e.ability || e.ability.kind !== 'passive') return true;
    const off = p.passivesOff;
    return !(off && off[key] && off[key] === e.ability.name);
  },

  /** The kit as it is RUNNING: every known ability except switched-off
   *  passives. Same shape as `player.knownAbilities`. */
  _liveKnown() {
    const p = this.player;
    const known = (p && p.knownAbilities) || {};
    const off = p && p.passivesOff;
    if (!off || !Object.keys(off).length) return known;
    const out = {};
    for (const [k, e] of Object.entries(known)) if (this._passiveOn(k)) out[k] = e;
    return out;
  },

  /** Forget switches whose passive is no longer in that socket. */
  _prunePassivesOff() {
    const p = this.player;
    if (!p || !p.passivesOff) return;
    for (const [k, name] of Object.entries(p.passivesOff)) {
      const e = p.knownAbilities && p.knownAbilities[k];
      if (!e || !e.ability || e.ability.kind !== 'passive' || e.ability.name !== name) delete p.passivesOff[k];
    }
  },

  /**
   * Flip one passive. Everything a passive feeds is rebuilt from the live kit
   * in the same breath, so the switch takes effect this frame: stats and
   * senses (`_recomputeDerivedStats`), familiars and aura rings
   * (`_rebuildFamiliars`), conjured relics (`_reconcileConjuredItems`) and
   * damage lends (`_rebuildDmgTransfer`).
   *
   * An aura switched OFF is gone entirely -- no field, no effect on its bearer.
   * That is a different thing from RETRACTING it (round 121), which keeps its
   * effect on the bearer and is the trained skill; the two controls are kept
   * apart so neither replaces the other.
   */
  _togglePassive(key, want) {
    const p = this.player;
    const e = p && p.knownAbilities && p.knownAbilities[key];
    if (!e || !e.ability || e.ability.kind !== 'passive') return null;
    p.passivesOff = p.passivesOff || {};
    const on = typeof want === 'boolean' ? want : !this._passiveOn(key);
    // ROUND 281 -- an aura is only switched off by someone who has learned to
    // control it: the same training, and the same [Mark of Sin]-style lock,
    // that pulling it in already answers to.
    if (!on && e.ability.template === 'aura') {
      if (!p.auraTrained) { if (this._refuseAuraControl) this._refuseAuraControl(); return null; }
      const lock = auraLockedBy(p);
      if (lock) {
        if (this._floatText && this.world) {
          this._floatText(this.world.x, this.world.y - 46, `${lock.label} holds your aura open`, '#ffb300');
        }
        return null;
      }
    }
    if (on) delete p.passivesOff[key];
    else p.passivesOff[key] = e.ability.name;
    this._passiveToggleVersion = (this._passiveToggleVersion || 0) + 1;
    this._stackAbilCache = null;
    // The relic first: a conjured item's buffs reach the stats through the
    // equipped gear, so it has to be gone (or back) before they are summed.
    // Switched back on, it returns to the backpack, the way a newly conjured
    // relic always arrives.
    if (this._reconcileConjuredItems) this._reconcileConjuredItems();
    if (this._rebuildDmgTransfer) this._rebuildDmgTransfer();
    this._recomputeDerivedStats();
    if (this._rebuildFamiliars) this._rebuildFamiliars();
    this._passiveToggles = (this._passiveToggles || 0) + 1;
    if (this._floatText && this.world) {
      this._floatText(this.world.x, this.world.y - 46,
        `${e.ability.name}: ${on ? 'on' : 'off'}`, on ? '#a5d6a7' : '#90a4ae');
    }
    return on;
  },
};
