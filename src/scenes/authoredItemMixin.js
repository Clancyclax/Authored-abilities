// ============================================================================
// ROUND 284 -- HIS FIVE ITEMS, IN PLAY.
//
// The data and the analogues are authoredItems.js; this is where the lines
// with no ordinary effect shape behind them are read. Each reader is named
// after the line it answers.
// ============================================================================
import { WEAPONS } from '../data/weapons.js';
import { AUTHORED_ITEMS, authoredKeyOf, authoredWid, authoredGearItem, authoredWeaponDef,
  rollAuthoredDrop, authoredCardLines, oasisDrainPerSec, OASIS_MAX } from '../data/authoredItems.js';
import { conditionDef } from '../data/debuffs.js';
import { CARNIVOROUS_PLANT_FAMILIES } from '../data/monsters.js';   // ROUND 285 -- the Trowel

/** "Highly effective against cutting and piercing damage, less effective
 *  against blunt damage." Fangs, claws, horns, stings and blades. */
const CUTTING_FAMILIES = new Set(['wolf', 'spider', 'raptor', 'hellhound', 'direbuck', 'hornram', 'scorpion',
  'mantis', 'whitelion', 'cobra', 'crocodile', 'sharkcrab', 'gnoll', 'lizard', 'bat', 'spinosaurus', 'trex',
  'dragon', 'chimera', 'hydra', 'medusa', 'quillFiend', 'spiritSerpent', 'steelRaptor', 'glasscat', 'demon', 'birdangel']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const AuthoredItemMixin = {
  _authoredWeaponDef(wid) {
    const key = authoredKeyOf(wid);
    if (!key) return null;
    this._authoredDefCache = this._authoredDefCache || {};
    if (!this._authoredDefCache[wid]) this._authoredDefCache[wid] = authoredWeaponDef(key, WEAPONS);
    return this._authoredDefCache[wid];
  },
  _authoredTipHtml(wid) {
    const key = authoredKeyOf(wid);
    if (!key) return '';
    return authoredCardLines(key).slice(1).map(l => `<div class="tip-buff tip-fx">${esc(l)}</div>`).join('');
  },

  /** A kill: is one of his items on it? Themed, rare. */
  _authoredDropFor(m, x, y, cultist = false) {
    const fam = (m && (m.family || (m.type && m.type.family))) || null;
    const rankIdx = m && this._monsterRankIndex ? this._monsterRankIndex(m) : 0;
    const key = rollAuthoredDrop(Math.random, { family: fam, rankIdx, cultist });
    if (!key) return null;
    if (AUTHORED_ITEMS[key].weapon) this._dropLoot(x, y, { kind: 'weapon', id: authoredWid(key) });
    else {
      this._authoredUid = (this._authoredUid || 0) + 1;
      this._dropLoot(x, y, { kind: 'gear', item: authoredGearItem(key, `auth-${key}-${Date.now()}-${this._authoredUid}`) });
    }
    this._authoredDrops = (this._authoredDrops || 0) + 1;
    return key;
  },

  // --- [Dark Hydra Robe] ------------------------------------------------------
  /** "Highly effective against cutting and piercing damage": a blow from a
   *  fang, claw or blade is lighter. */
  _authoredCutDR(m, dmg) {
    // [Robes of the Astral Verdict]: "Damage reduction against
    // disruptive-force damage."
    const force = (this.player.itemFx && this.player.itemFx.forceDR) || {};
    const el = m && (m.dmgElement || (m.type && m.type.element));
    if (el && force[el]) dmg = Math.round(dmg * (1 - Math.min(0.75, force[el])));
    const cut = (this.player.itemFx && this.player.itemFx.cutDR) || 0;
    if (!cut || !m) return dmg;
    const fam = m.family || (m.type && m.type.family);
    const person = !!(m.personKind || m.person);
    return (person || CUTTING_FAMILIES.has(fam)) ? Math.round(dmg * (1 - cut)) : dmg;
  },
  /** "Rapidly repairs damage": an armour-breaking affliction on the wearer
   *  lasts a fraction as long. Read in `_applyDebuff`. */
  _authoredArmourMends(def) {
    const f = (this.player.itemFx && this.player.itemFx.armourMends) || 0;
    return f && def && (def.rate === 'armor' || (def.rates && def.rates.includes('armor'))) ? f : 1;
  },

  // --- [Trowel of the Blood Cult] ---------------------------------------------
  /** "Improves health of carnivorous plants." */
  _authoredPlantHp(rec) {
    const f = (this.player.itemFx && this.player.itemFx.plantSummonHp) || 0;
    if (!f || !rec || !CARNIVOROUS_PLANT_FAMILIES.has(rec.family)) return;   // ROUND 285 -- every carnivorous plant
    rec.maxHp = Math.round((rec.maxHp || rec.hp || 1) * (1 + f));
    rec.hp = rec.maxHp;
    rec.trowelled = true;
  },

  // --- [Night Fang] -----------------------------------------------------------
  /** "Attacks ignore bronze rank damage reduction and poison resistance." */
  _nightFangIgnores(weapon, m) {
    if (!weapon || weapon.authored !== 'nightFang' || !m) return false;
    const idx = this._monsterRankIndex ? this._monsterRankIndex(m) : 0;
    return idx <= 2;
  },
  /** "Inflicts [Umbral Snake Venom]." Through a poison immunity too, for
   *  anything bronze or below. */
  _nightFangHit(weapon, m) {
    if (!weapon || weapon.authored !== 'nightFang' || !m || !m.alive) return;
    this._applyDebuff(m, 'umbralSnakeVenom', { stacks: 1, fromPlayer: true, source: this.player,
      pierceImmunity: this._nightFangIgnores(weapon, m) });
    this._nightFangVenom = (this._nightFangVenom || 0) + 1;
  },

  // --- [Oasis Bracelet] -------------------------------------------------------
  _oasisOn() { return !!(this.player.itemFx && this.player.itemFx.oasis); },
  _tickOasis(dt) {
    const p = this.player;
    if (!this._oasisOn()) return;
    if (p.oasisEnergy == null) p.oasisEnergy = OASIS_MAX;
    // "Consume a water quintessence gem to completely refill bracelet energy."
    if (p.oasisEnergy <= 0 && p.itemFx.oasisRefill) {
      const inv = p.inventory || {};
      const i = (inv.quintessence || []).findIndex(x => String(x).startsWith('quintWater'));
      if (i >= 0) {
        inv.quintessence.splice(i, 1);
        p.oasisEnergy = OASIS_MAX;
        this._floatText(this.world.x, this.world.y - 50, 'Oasis Bracelet drinks a Water Quintessence', '#4fc3f7');
        this._oasisRefills = (this._oasisRefills || 0) + 1;
      }
    }
    if (p.oasisEnergy <= 0) return;
    // "Bracelet energy is consumed at a varying rate according to climate."
    const reg = this.currentRegion && this.currentRegion.id;
    p.oasisEnergy = Math.max(0, p.oasisEnergy - oasisDrainPerSec(this._insideRoom ? null : reg, 0) * dt);
    // "Keeps the wearer cool and refreshed."
    const regen = p.itemFx.staminaRegen || 0;
    if (regen > 0 && p.stamina < p.maxStamina) p.stamina = Math.min(p.maxStamina, p.stamina + p.maxStamina * 0.02 * regen * dt);
  },
  /** "Reduces incoming fire and heat damage. This rapidly consumes bracelet
   *  energy." */
  _oasisFireDR(m, dmg) {
    const p = this.player;
    const dr = (p.itemFx && p.itemFx.oasisFireDR) || 0;
    const el = m && (m.dmgElement || (m.type && m.type.element));
    if (!dr || el !== 'fire' || !(p.oasisEnergy > 0)) return dmg;
    const saved = Math.round(dmg * dr);
    p.oasisEnergy = Math.max(0, p.oasisEnergy - saved);
    this._oasisSaved = (this._oasisSaved || 0) + saved;
    return dmg - saved;
  },
};
