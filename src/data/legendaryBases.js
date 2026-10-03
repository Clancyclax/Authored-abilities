// ROUND 283 -- which ordinary weapon each authored legendary is built on.
// Its own file (no imports) so proficiencies.js can resolve a legendary's
// weapon id to the proficiency of its base without an import cycle.
export const LEGENDARY_BASES = { spellLance: 'staff', magistersTithe: 'staff', dreadSalvation: 'sword' };
// ROUND 284 -- and his authored weapons ([Night Fang], a knife).
export const AUTHORED_WEAPON_BASES = { nightFang: 'dagger' };
export function legendaryBaseOf(wid) {
  const s = String(wid || '');
  if (s.startsWith('authored_')) return AUTHORED_WEAPON_BASES[s.slice(9)] || null;
  return s.startsWith('legendary_') ? (LEGENDARY_BASES[s.slice(10)] || null) : null;
}
