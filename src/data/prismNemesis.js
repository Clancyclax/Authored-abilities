// ============================================================================
// ROUND 276 -- PRISM, AGAINST YOU.
//
//   "4.1) Prism isn't a bad person by nature and the players influence over
//         her isnt enough to recruit her if you're an outlaw.
//    4.2) Ultimately Prism becomes the players most difficult challenge in
//         the outlaw route. Ambushing the player and hunting them regularly.
//         Vanishing before death only to randomly attack again.
//    4.2.1) Prism's build in this case should be a system generated counter
//           build to the player.
//    4.2.2.1) if the player is a lich than Prism is going to have fire, pure,
//             and light essences. With significant bonuses against undead.
//    4.2.2.2) If the player is tanky Prism will end up with a heavy affliction
//             build and movement abilities to stay out of range."
//
// Pure: read the player, choose the counter. The scene side (ambush, fight,
// vanish, return) is scenes/prismNemesisMixin.js.
//
// THE READ. Five questions, asked in this order, first answer wins:
//   1. Undeath lich?      fire + pure + light, and undead take far more
//   2. Undeath vampire?   sun + pure + light, and her blows spoil healing
//   3. Tanky?             venom + blight + swift: afflictions that armour does
//                         not stop, and legs to stay out of reach
//   4. A healer?          fire + lightning + sin: burst, and her blows spoil
//                         healing
//   5. Otherwise, by reach: a melee player gets a kiter (bow + wind + swift);
//      a ranged one gets a gap-closer (swift + knife + shield).
// Every trio is checked against the restricted essences: Prism is not an
// outlaw and never carries Death or Corrupt.
// ============================================================================
import { RESTRICTED_IDS } from './restricted.js';

export const PRISM_COUNTERS = {
  lich: {
    essences: ['fire', 'essPure', 'essLight'], style: 'holy',
    undeadBane: 0.75, healSpoil: 0, kite: false, afflict: false,
    says: "Fire, and light, and something clean. I studied what you became. I brought the answer.",
  },
  vampire: {
    essences: ['essSun', 'essPure', 'essLight'], style: 'holy',
    undeadBane: 0.6, healSpoil: 0.5, kite: false, afflict: false,
    says: "You drink. I made myself something that burns going down.",
  },
  tank: {
    essences: ['essVenom', 'essBlight', 'essSwift'], style: 'affliction',
    undeadBane: 0, healSpoil: 0, kite: true, afflict: true,
    says: "You are very hard to hit. So I stopped hitting you.",
  },
  healer: {
    essences: ['fire', 'essLightning', 'essSin'], style: 'burst',
    undeadBane: 0, healSpoil: 0.5, kite: false, afflict: false,
    says: "You mend everything. Let's see you mend all of it at once.",
  },
  melee: {
    essences: ['essBow', 'essWind', 'essSwift'], style: 'kite',
    undeadBane: 0, healSpoil: 0, kite: true, afflict: false,
    says: "Everything you do, you do up close. I will not be close.",
  },
  ranged: {
    essences: ['essSwift', 'essKnife', 'essShield'], style: 'closer',
    undeadBane: 0, healSpoil: 0, kite: false, afflict: false,
    says: "You like distance. I don't give it.",
  },
};

/**
 * Which counter this player earns. `read` is a plain description of the
 * player, so the rule can be asked without a scene:
 *   { form, primary, armor, maxHp, lean }
 *   form     'lich' | 'vampire' | null      (Undeath's form)
 *   primary  the build class's primary role ('tank' | 'dps' | 'healing' | 'support')
 *   armor    0..0.8
 *   lean     'melee' | 'ranged'
 */
export function counterKeyFor(read = {}) {
  if (read.form === 'lich') return 'lich';
  if (read.form === 'vampire') return 'vampire';
  if (read.primary === 'tank' || (read.armor || 0) >= 0.45) return 'tank';
  if (read.primary === 'healing') return 'healer';
  return read.lean === 'ranged' ? 'ranged' : 'melee';
}

export function counterFor(read) {
  const key = counterKeyFor(read);
  return { key, ...PRISM_COUNTERS[key] };
}

// ============================================================================
// ROUND 277 -- HER RHYTHM, AS RULED.
//
//   "1.1) She only comes for an outlaw
//    1.2) She arrives with double your health.
//    1.3) At 15% of her health instead of dying she smoke bombs and vanishes.
//    1.4) Prism attacks randomly from Iron through Gold anywhere outside.
//    1.5) Her attacks can't occur more frequently than every 35 minutes and
//         shouldn't be longer than 2 hours apart.
//    1.6) She can ambush a player right after they leave a cave, astral
//         space, or building."
//
// Round 276 had her at 3.2x health growing 10% a meeting, a fifth-health
// vanish, and a four-to-seven MINUTE gap. All four are replaced here: the
// same double every time, 15%, and a gap of 35 to 120 minutes of play.
// ============================================================================

/** She arrives with this many times the player's health, every time. */
export const PRISM_HP_MULT = 2;

/**
 * Her numbers, scaled to the player rather than to a region: double the
 * player's health, and a blow that grows with rank. `encounters` is kept in
 * the signature for old callers and no longer grows her.
 */
export function prismNemesisStats(playerMaxHp, rankIdx, encounters = 0) {   // eslint-disable-line no-unused-vars
  const hp = Math.round(Math.max(80, (playerMaxHp || 40) * PRISM_HP_MULT));
  const dmg = Math.max(6, Math.round((playerMaxHp || 40) * 0.075 * (1 + 0.05 * rankIdx)));
  return { hp, dmg, speed: 150 + 8 * rankIdx };
}

/** At this share of her health she smoke-bombs and is gone. */
export const PRISM_VANISH_AT = 0.15;
/** The ranks she hunts in: Iron through Gold. */
export const PRISM_RANKS = ['iron', 'bronze', 'silver', 'gold'];
/** Seconds of play between attacks: never under 35 minutes, never over 2 hours. */
export const PRISM_GAP_MIN = 35 * 60;
export const PRISM_GAP_MAX = 120 * 60;
/** Once the 35 minutes are up, the chance she is waiting at a door you step
 *  out of (a building, a cave or den, an astral space). */
export const PRISM_DOOR_CHANCE = 0.35;
/** A gap, rolled. */
export function rollPrismGap(rand = Math.random) {
  return PRISM_GAP_MIN + rand() * (PRISM_GAP_MAX - PRISM_GAP_MIN);
}
/** Round 276's names, kept so nothing importing them breaks: the gap is now
 *  the ruled window and the first attack waits for the same window. */
export const PRISM_AMBUSH_GAP = [PRISM_GAP_MIN, PRISM_GAP_MAX];
export const PRISM_FIRST_AMBUSH = PRISM_GAP_MIN;

/** Nothing here disagrees with itself. */
export function prismNemesisFaults(essenceIds = null) {
  const out = [];
  for (const [k, c] of Object.entries(PRISM_COUNTERS)) {
    if (!c.essences || c.essences.length !== 3) out.push(`${k}: three essences`);
    if (c.essences.some(e => RESTRICTED_IDS.includes(e))) out.push(`${k}: Prism never carries a restricted essence`);
    if (essenceIds) for (const e of c.essences) if (!essenceIds.includes(e)) out.push(`${k}: no essence ${e}`);
  }
  const lich = PRISM_COUNTERS.lich.essences.slice().sort().join();
  if (lich !== ['essLight', 'essPure', 'fire'].sort().join()) out.push('the lich counter is fire, pure and light, as ruled');
  if (!(PRISM_COUNTERS.lich.undeadBane > 0.5)) out.push('significant bonuses against undead');
  if (!PRISM_COUNTERS.tank.afflict || !PRISM_COUNTERS.tank.kite) out.push('the tank counter is affliction and movement');
  if (PRISM_HP_MULT !== 2) out.push('she arrives with double your health');
  if (PRISM_VANISH_AT !== 0.15) out.push('she vanishes at 15%');
  if (PRISM_GAP_MIN !== 2100 || PRISM_GAP_MAX !== 7200) out.push('35 minutes to 2 hours between attacks');
  if (PRISM_RANKS.join() !== 'iron,bronze,silver,gold') out.push('Iron through Gold');
  return out;
}
