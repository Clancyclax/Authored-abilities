// ============================================================================
// ROUND 281 -- POTIONS THAT POUR.
//
//   "regular potions should restore health over time. Average being over 4
//    seconds. This creates further variety as potions have different
//    potencies some in 2 seconds others as slow as 10 seconds."
//
// A coloured potion's amount is spread evenly over its `overSecs`
// (potions.js), paid out every frame through the same doors an instant
// potion uses -- `_healPlayer` for health, a clamp for mana and stamina -- so
// anything that modifies healing modifies a poured draught too. Two potions
// drunk together pour side by side; each keeps its own clock.
// ============================================================================

export const PotionMixin = {
  _startPotionPour(def) {
    const p = this.player;
    if (!p || !def || !def.overSecs) return;
    // The ticks below heal quietly (sixty small heals a second must not each
    // be billed as a benefit), so the draught is billed once, here, where it
    // is drunk -- the same one charge an instant potion pays.
    if (def.hp && this._chargeForBenefit) this._chargeForBenefit(p);
    // ROUND 282 -- a worn "Heal over time effects have increased strength
    // and duration" reaches a pouring draught too: it IS a heal over time.
    const hb = (p.itemFx && p.itemFx.hotBoost) || 0;
    const secs = def.overSecs * (1 + hb);
    (p.potionPours = p.potionPours || []).push({
      id: def.id, t: secs, total: secs,
      hp: (def.hp || 0) * (1 + hb), mana: def.mana || 0, stamina: def.stamina || 0,
      // What has been paid so far, so rounding across frames never loses or
      // invents a point: the last frame pays exactly what is left.
      paid: { hp: 0, mana: 0, stamina: 0 },
    });
  },

  _tickPotionPours(dt) {
    const p = this.player;
    if (!p || !p.potionPours || !p.potionPours.length || !(dt > 0)) return;
    if (p.dead) { p.potionPours = []; return; }
    for (const pour of p.potionPours) {
      const step = Math.min(dt, pour.t);
      pour.t -= step;
      const done = 1 - pour.t / pour.total;
      for (const k of ['hp', 'mana', 'stamina']) {
        if (!pour[k]) continue;
        const owed = pour.t <= 1e-6 ? pour[k] : pour[k] * done;
        const give = owed - pour.paid[k];
        if (give <= 0) continue;
        pour.paid[k] += give;
        if (k === 'hp') this._healPlayer(give, { quiet: true });
        else if (k === 'mana') p.mana = Math.min(p.maxMana, p.mana + give);
        else p.stamina = Math.min(p.maxStamina, p.stamina + give);
      }
    }
    p.potionPours = p.potionPours.filter(x => x.t > 1e-6);
  },
};
