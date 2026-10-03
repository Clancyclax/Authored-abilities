// Player rank tiers + the rank-up visual effect. The original prototype has
// no rank/tier concept to port -- this is a new system built to spec, not
// a port. The FX art itself (a 32x32, 17-frame "glowing figure pulses
// rhythmically" animation) is a real asset (see extract_rankup_fx.py for
// where it came from and how it was recolored into the 5 rank variants
// below, stacked as rows of public/assets/rankup_aura.png).

// RESTORED round 5: the pre-Iron 'normal' rank, ported from the original
// prototype's v0.34 rule -- "a character starts at Normal -- not yet Iron at
// all -- until every one of the 4 attributes has been bonded to an essence
// (the 3 regular slots plus the confluence slot, one attribute each)."
// Forming the confluence (equipping all 3 essences) completes that bonding
// and lifts the character to Iron -- see WorldScene's _equipEssence/
// _closeInventory (the rank-up aura plays when the inventory screen closes,
// per this round's spec).
export const RANK_ORDER = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
export const RANK_LABELS = { normal: 'Normal', iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };
// Matches extract_rankup_fx.py's RANKS dict order/colors -- used for the
// small rank badge in the HUD frame, not the sprite (that's real recolored
// art, this is just a UI accent dot). 'normal' has no aura row (you never
// rank INTO normal -- see RANK_AURA_ROW below).
export const RANK_COLORS = { normal: '#9e9e9e', iron: '#8b93a6', bronze: '#c97a3d', silver: '#e7e9ec', gold: '#f4c430', diamond: '#4fd8ea' };
// Row index into public/assets/rankup_aura.png for each rank's recolored
// aura variant. The sheet has exactly 5 rows (iron..diamond -- see
// extract_rankup_fx.py's RANKS dict); 'normal' is deliberately absent
// since no rank-up ever lands ON normal. Introduced because RANK_ORDER
// gained 'normal' at index 0 this round -- indexOf() into RANK_ORDER would
// now be off by one against the sprite sheet.
export const RANK_AURA_ROW = { iron: 0, bronze: 1, silver: 2, gold: 3, diamond: 4 };

export const RANKUP_CELL = 32;
export const RANKUP_FRAME_COUNT = 17;
export const RANKUP_FRAME_MS = 130; // ported from the source GIF's own per-frame duration

// Rank <- player level. No original formula to port; picked to land a
// rank-up roughly every 4-5 levels early on. Easy to retune -- everything
// else (the FX trigger, the HUD badge) just reads whatever rankForLevel
// returns.
//
// RESTORED round 5: rankForLevel now takes hasConfluence -- while the
// character's confluence hasn't formed (i.e. not all 4 attributes are
// bonded), the rank is hard-floored at 'normal' no matter how much banked
// XP meditation has accumulated, per the original's v0.34 rule quoted at
// the top of this file. Once the confluence exists, iron is immediate
// (floor level 1) and the higher tiers stay meditation/level-driven
// exactly as before.
export const RANK_LEVEL_FLOOR = { normal: 0, iron: 1, bronze: 5, silver: 10, gold: 15, diamond: 20 };

// ROUND 44 -- the party needs the player's standing as a CONTINUOUS number
// (which rank, plus how far through it), because "roughly 10% ahead of or
// behind the player's exact rank status" is not a quantity you can express
// on an integer rank index. Derived from the same floors above rather than
// as a second copy of the progression, so retuning the floors retunes this.
// ROUND 74 (item 7) -- `rankStanding` IS DELETED. It mapped the round-5
// whole-player level (banked xp / 100) onto the floors above, and round 47
// replaced that progression with the per-essence one in essenceRank.js.
// Its one caller -- the party's rank offsets -- reads
// `essenceRank.js playerStandingFrom(...).standing` now, which returns the
// same shape (rank index plus the fraction through that rank) computed from
// the essences the game actually levels. RANK_LEVEL_FLOOR is kept: it is what
// `rankForLevel` reads, and that is still how a brand-new character's rank is
// named before any essence exists.
export function rankForLevel(level, hasConfluence) {
  if (!hasConfluence) return 'normal';
  let rank = 'iron';
  for (const r of RANK_ORDER) {
    if (r === 'normal') continue;
    if (level >= RANK_LEVEL_FLOOR[r]) rank = r;
  }
  return rank;
}
