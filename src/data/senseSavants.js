// ============================================================================
// ROUND 282 -- THE ONLY WAY A KIT HOLDS MORE THAN ONE AURA OR PERCEPTION.
//
//   "Reminder that multiple aura abilities or multiple perception abilities
//    should only occur when a very rare <.5% chance passive ability to allow
//    that.
//    2.1) Something like "Aura Savant" or "Aura weaver" with abilities like
//    Effect iron "Increase your aura range by 20%, allows the development of
//    additional aura abilities, 1 on each essence (up to 4)"
//    2.2) "Many phased eyes", "prismatic eyes", "compound eyes" with abilities
//    like Effect iron " Perception abilities have increased range and effect,
//    allows the development of additional perception abilities 1 on each
//    essence (up to 4)."
//    2.3) These are extremely rare abilities and when 1 is rolled its mutually
//    exclusive with the other."
//
// Before this round the caps were raised by a hash with nothing in the kit to
// show for it: a player could hold two auras and no ability saying why. Now
// the raise IS an ability -- a passive the kit carries, on its card, with a
// switch like every passive -- and without one the caps are one each.
//
// One roll per kit, on the essence trio, so a kit keeps its savant across
// reloads: 3 in 1000 roll the aura savant, and 2 in 1000 the eyes. The eyes
// also keep round 190's ruling ("This ability will only ever occur with an
// omen, vision, or lurker essence and when paired with an appropriately
// thematic awakening stone"), so they are rarer still in practice. One number
// decides both, so a kit can never hold the two.
// ============================================================================

export const AURA_SAVANT_NAMES = ['Aura Savant', 'Aura Weaver'];
export const EYES_SAVANT_NAMES = ['Many-Phased Eyes', 'Prismatic Eyes', 'Compound Eyes'];

/** Per thousand kits. */
export const SAVANT_PER_MILLE = { aura: 3, eyes: 2 };

/** The user's own iron rungs, as written. */
export const AURA_SAVANT_IRON = 'Increase your aura range by 20%, allows the development of additional aura abilities, 1 on each essence (up to 4)';
export const EYES_SAVANT_IRON = 'Perception abilities have increased range and effect, allows the development of additional perception abilities 1 on each essence (up to 4).';

/** How many of the kind a savant allows: one per essence, up to four. */
export const SAVANT_CAP = 4;

/**
 * Which savant, if any, this kit rolls.
 * @param {number} h       a stable hash of the essence trio
 * @param {boolean} eyesOk the round-190 theme gate for the eyes
 */
export function savantFor(h, eyesOk) {
  const r = Math.abs(h) % 1000;
  if (r < SAVANT_PER_MILLE.aura) return 'aura';
  if (r < SAVANT_PER_MILLE.aura + SAVANT_PER_MILLE.eyes && eyesOk) return 'eyes';
  return null;
}

/** The savant as an ability spec. */
export function savantSpec(kind, h, color = '#e0e0e0') {
  const names = kind === 'aura' ? AURA_SAVANT_NAMES : EYES_SAVANT_NAMES;
  const name = names[Math.abs(h >> 3) % names.length];
  const iron = kind === 'aura' ? AURA_SAVANT_IRON : EYES_SAVANT_IRON;
  return {
    name, kind: 'passive', category: 'passive buff',
    template: kind === 'aura' ? 'auraSavant' : 'eyesSavant',
    savant: kind,
    // The user's iron rung, printed as the iron effect; no separate sentence.
    desc: '',
    rankEffects: { iron },
    // What the iron rung does, as numbers the scene reads.
    auraRangePct: kind === 'aura' ? 0.2 : 0,
    perceptionBoost: kind === 'eyes' ? 0.2 : 0,
    color, rare: true,
  };
}
