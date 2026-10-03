// ============================================================================
// ROUND 274 -- THE SOCIETY'S HUNTERS.
//
//   "3) Outlaws and those with restricted essences are hunted by the adventure
//       society with initially solo adventurers coming after the player, and
//       eventually whole teams of up to 6 adventurers. The level of
//       adventurers sent after the player is based on the region, so a gold
//       rank player in Nek would be slaughtering iron rank adventurers. This
//       in mind if the player is greater than 1 rank higher than the region
//       adventurers will leave them alone unless attacked."
//   "1.1) Adventurer society and guards hunt you down if they find out"
//
// Pure: who the hunters are, how many, how strong, and when they come. The
// scene side is scenes/huntMixin.js.
// ============================================================================
import { RANK_ORDER } from './ranks.js';

/** What rank the Society's people are, region by region. Nek is iron, per
 *  the ruling's own example; the rest follow their wildlife. */
export const REGION_HUNTER_RANK = {
  nek: 'iron', ontaria: 'iron', sirukh: 'bronze', elehyd: 'bronze',
  bratugal: 'silver', cinder: 'silver', ixcuatl: 'gold',
};

export const HUNT_MAX_TEAM = 6;
export const HUNT_FIRST_SECONDS = 60;      // after being found out, before the first comes
export const HUNT_GAP_SECONDS = [150, 260];  // between parties
export const HUNT_ESCAPE_TILES = 110;     // outrun a party this far and it gives up

/** A team is one more than the teams already beaten, to six. */
export function huntTeamSize(teamsBeaten) {
  return Math.max(1, Math.min(HUNT_MAX_TEAM, 1 + (teamsBeaten || 0)));
}

/** The region's hunter rank index. */
export function hunterRankIdx(regionId) {
  return Math.max(0, RANK_ORDER.indexOf(REGION_HUNTER_RANK[regionId] || 'iron'));
}

/** "Greater than 1 rank higher than the region": left alone. */
export function huntersLeaveAlone(playerRank, regionId) {
  const p = Math.max(0, RANK_ORDER.indexOf(playerRank || 'normal'));
  return p - hunterRankIdx(regionId) > 1;
}

/** A hunter's numbers. Adventurers are sturdier than road crews of the same
 *  rank: they are trained, equipped and paid to finish the job. */
export function hunterStats(rankIdx, lead = false) {
  const i = Math.max(0, Math.min(4, rankIdx));
  const hp = Math.round([40, 90, 190, 350, 620][i] * (lead ? 1.6 : 1));
  const dmg = Math.round([5, 9, 15, 25, 40][i] * (lead ? 1.25 : 1));
  return { hp, dmg, speed: 120 + i * 6 };
}

export const HUNTER_MODELS = ['npc_grizzled_adventurer', 'npc_female_adventurer', 'npc_muscular_adventurer'];
const FIRST = ['Ilse', 'Doran', 'Maeve', 'Corvin', 'Tamsin', 'Reyes', 'Hal', 'Oona', 'Brisk', 'Senna', 'Jory', 'Wren'];
const LAST = ['Maron', 'Ashby', 'Kell', 'Draycott', 'Venn', 'Holloway', 'Pike', 'Sorrel', 'Quist', 'Barrow'];

/** A hunter's name, stable for a seed. */
export function hunterName(seed) {
  const n = Math.abs(seed | 0);
  return `${FIRST[n % FIRST.length]} ${LAST[Math.floor(n / FIRST.length) % LAST.length]}`;
}

/** What a party's leader says when they find you. */
export const HUNTER_CRIES = [
  'By order of the Adventure Society. Stand where you are.',
  'There is a price on you. There is no price on how.',
  'You should have stayed where nobody knew you.',
  'The Society does not forget a name.',
];

/** Nothing here disagrees with itself. */
export function huntFaults(regionIds = null) {
  const out = [];
  if (huntTeamSize(0) !== 1 || huntTeamSize(99) !== HUNT_MAX_TEAM) out.push('team size runs 1 to 6');
  if (REGION_HUNTER_RANK.nek !== 'iron') out.push('Nek sends iron, per the ruling');
  if (!huntersLeaveAlone('gold', 'nek') || huntersLeaveAlone('bronze', 'nek')) out.push('left alone only at more than one rank above');
  if (regionIds) for (const r of regionIds) if (!REGION_HUNTER_RANK[r]) out.push(`${r}: no hunter rank`);
  for (const r of Object.values(REGION_HUNTER_RANK)) if (r === 'diamond') out.push('no diamond-rank content');
  return out;
}
