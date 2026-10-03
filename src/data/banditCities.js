// ============================================================================
// ROUND 273 -- THE BANDIT CITIES.
//
//   "2.1) Every region should have a small (20% the size of Cadence) city
//         controlled by bandits.
//    2.2) The implication being they killed the people who originally lived
//         there and took over. (Houses should have bodies and or a skeleton)
//    2.3) Bandit cities are Neutral to the player unless attacked or
//         threatened.
//    2.4) Bandit cities have all the goods regular cities have at a 50%
//         markup from various bandit merchants
//    2.5) This enables even players with a restricted essence to continue to
//         progress through the game albeit in a different fashion
//    2.6) For normal players the bandit city will be a major adventure
//         society quest to clear out the town.
//    2.7) Bandit cities have their own quests to kill or steal from regular
//         citizens
//    2.8) Bandit cities will have a hidden church to the dark gods, undeath,
//         destruction, deception.
//    2.9) Taking a quest from them is fine, but actually starting it will
//         permanently mark you as an outlaw within that region as well as
//         instantly get you kicked from the adventure society."
//
// SIZE. Cadence has 251 houses; a fifth of that is fifty. Each city here is a
// walled `city` settlement of 48 houses plus its merchants, built by the same
// generator every other city is -- so it has streets, walls, a board, doors
// and interiors like anywhere else, and every system that reads settlements
// (the map, the roads, the region rank) reads these too.
//
// WHERE. One per region, placed on land measured to be dry and clear (a
// 110-tile window with no water in it, 400+ tiles from any other settlement or
// exit). The measurement is tools/probe_bandit_sites; the numbers are copied
// here because settlement positions are data, not something to re-roll.
// ============================================================================
import { RANK_ORDER } from './ranks.js';

export const BANDIT_CITY_HOUSES = 48;
export const BANDIT_CITY_RADIUS = 44;
export const BANDIT_MARKUP = 1.5;

/** The services a bandit city trades in: everything a city sells. */
export const BANDIT_SERVICES = ['tavern', 'blacksmith', 'auction', 'weapon'];

export const BANDIT_CITIES = [
  { id: 'bc_nek', region: 'nek', name: 'Gallowsreach', formerName: 'Hollin Ford',
    at: { tx: 1760, ty: 1700 }, crew: 'roadwolves', captain: 'Brannoc Six-Fingers',
    took: 'The Roadwolves came in off the east road one harvest and never left. Hollin Ford had three hundred people.' },
  { id: 'bc_ont', region: 'ontaria', name: 'Tollmarket', formerName: 'Sedge Crossing',
    at: { tx: 1700, ty: 680 }, crew: 'toll', captain: 'Warden Oskar Vell',
    took: 'The Toll put a chain across the river road and charged the town for the privilege of living in it, until the town stopped paying.' },
  { id: 'bc_ele', region: 'elehyd', name: 'Cinderwatch', formerName: 'Marrow Hill',
    at: { tx: 1640, ty: 260 }, crew: 'ashcart', captain: 'Aldous Greave',
    took: 'The Ashcart Men burned the granary to make a point, then the chapel, then everything with a lock on it.' },
  { id: 'bc_bra', region: 'bratugal', name: 'Magpie Roost', formerName: 'Wren Stead',
    at: { tx: 560, ty: 1160 }, crew: 'magpie', captain: 'Mother Corvine',
    took: 'The Magpie Company counts everything. They counted Wren Stead, and then they counted the graves.' },
  { id: 'bc_sir', region: 'sirukh', name: 'Shareholt', formerName: 'Tarrow Quay',
    at: { tx: 1640, ty: 1700 }, crew: 'ironshare', captain: 'Hask the Divider',
    took: 'The Iron Share offered even shares to anyone who set down their tools. Tarrow Quay kept its tools.' },
  { id: 'bc_cin', region: 'cinder', name: 'Hush', formerName: 'Emberfall',
    at: { tx: 320, ty: 1760 }, crew: 'quiettrade', captain: 'the Factor',
    took: 'Nobody heard the Quiet Trade arrive in Emberfall. That was rather the point.' },
  { id: 'bc_ixc', region: 'ixcuatl', name: 'Blackmarch', formerName: 'Kalen Terrace',
    at: { tx: 320, ty: 1700 }, crew: 'quiettrade', captain: 'Sister Vesk',
    took: 'Kalen Terrace sold passage south. Blackmarch sells it back to you, at a price.' },
];

export const BANDIT_CITY_BY_ID = Object.fromEntries(BANDIT_CITIES.map(c => [c.id, c]));
export const BANDIT_CITY_BY_REGION = Object.fromEntries(BANDIT_CITIES.map(c => [c.region, c]));

/** The settlement entry each city contributes to its region. */
export function banditSettlement(c) {
  return {
    id: c.id, name: c.name, kind: 'city', at: { ...c.at }, radius: BANDIT_CITY_RADIUS,
    houses: BANDIT_CITY_HOUSES, bandit: true, crew: c.crew,
  };
}

// ----------------------------------------------------------------------------
// THE HIDDEN CHURCH. Three gods the temples of the free cities do not name.
// ----------------------------------------------------------------------------
export const DARK_GODS = [
  { id: 'undeath', name: 'The Unburied', aspect: 'Undeath',
    line: 'Nothing that has been is ever finished. It is only waiting to be asked back.' },
  { id: 'destruction', name: 'The Ashen Mouth', aspect: 'Destruction',
    line: 'Every wall is a promise. Every promise can be broken, and should be.' },
  { id: 'deception', name: 'The Veiled Hand', aspect: 'Deception',
    line: 'The truth is only the lie that everyone has agreed to stop checking.' },
  // ROUND 291 -- "a priest of Avarice (new dark goddess)" -- Jole's.
  { id: 'avarice', name: 'Avarice', aspect: 'Greed', goddess: true,
    line: 'Everything is owed. Everything is paid. I am only the one who keeps the book.' },
];

// ----------------------------------------------------------------------------
// THE BANDIT BOARD. "Quests to kill or steal from regular citizens."
// ----------------------------------------------------------------------------
export const BANDIT_JOB_KINDS = ['banditKill', 'banditTheft'];
export const BANDIT_JOB_PAY = { banditKill: [40, 90, 180, 340, 600], banditTheft: [25, 60, 120, 220, 400] };

/** A region's bandit rank, for pay and for the hunters. */
export function banditTierFor(regionTier) {
  return Math.max(0, Math.min(RANK_ORDER.length - 2, regionTier || 0));
}

/** How many of the city's crew the Society's clearance asks for. */
export const CLEARANCE_NEED = 12;

/** Nothing here disagrees with itself. `crews` is the crew table's slugs,
 *  `regions` the region ids. */
export function banditCityFaults(crews = null, regions = null) {
  const out = [];
  const seen = new Set();
  for (const c of BANDIT_CITIES) {
    if (seen.has(c.region)) out.push(`${c.region}: two bandit cities`);
    seen.add(c.region);
    if (crews && !crews.includes(c.crew)) out.push(`${c.id}: no crew ${c.crew}`);
    if (!c.captain || !c.took || !c.formerName) out.push(`${c.id}: missing captain, story or former name`);
  }
  if (regions) for (const r of regions) if (!seen.has(r)) out.push(`${r}: no bandit city`);
  if (DARK_GODS.map(g => g.aspect).join() !== 'Undeath,Destruction,Deception,Greed') out.push('the dark gods are undeath, destruction, deception and greed (Avarice)');
  return out;
}
