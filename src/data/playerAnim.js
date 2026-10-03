// Player body-atlas layout constants, ported 1:1 from sparkstone_prototype.html
// (BODY_TYPE_ATLASES / PLAYER_FRAME / ATTACK_* / RUN_* constants, ~line 7052-7130).
// Measured directly off the extracted PNGs and cross-checked against the
// original's own cell-size math -- these numbers are exact, not estimated.
//
// Three separate spritesheets, three separate grids, three separate foot
// anchors (NOT scaled/interchangeable versions of each other -- the original
// bakes each pose set independently and says so explicitly in its own
// comments). All three use PLAYER_DIR_ORDER's 8-direction order (see iso.js)
// for whichever axis is "direction" in their grid.

export const PLAYER_DIR_ORDER = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
export function dirRow(facing) {
  const i = PLAYER_DIR_ORDER.indexOf(facing);
  return i < 0 ? 2 : i; // fall back to 'south' like the original's `?? 2`
}

// --- Idle: 512x64, 1 row x 8 cols, cell=64. Column = direction. Single static
// pose per direction, no animation.
export const IDLE_CELL = 64;
export const IDLE_FOOT_X = 32, IDLE_FOOT_Y = 61;
export const IDLE_ORIGIN_X = IDLE_FOOT_X / IDLE_CELL, IDLE_ORIGIN_Y = IDLE_FOOT_Y / IDLE_CELL;

// --- Attack: 1564x736, 8 rows x 17 cols, cell=92. Row = direction, col = swing
// frame. NOT fixed-fps -- sampled proportionally against the weapon's own
// swingDuration (col = min(16, floor(p*17)), p = elapsed/duration).
export const ATTACK_CELL = 92;
export const ATTACK_FRAMES_PER_DIR = 17;
export const ATTACK_FOOT_X = 44.5, ATTACK_FOOT_Y = 75;
export const ATTACK_ORIGIN_X = ATTACK_FOOT_X / ATTACK_CELL, ATTACK_ORIGIN_Y = ATTACK_FOOT_Y / ATTACK_CELL;

// --- Run: 5888x92, 1 row x 64 cols, cell=92. Column = direction*8 + frame (8
// dirs x 8 frames packed side by side). 90ms/frame (~11.11fps), free-running,
// always loops.
export const RUN_CELL = 92;
export const RUN_FRAMES_PER_DIR = 8;
export const RUN_FRAME_MS = 90;
export const RUN_FOOT_X = 45.75, RUN_FOOT_Y = 78;
export const RUN_ORIGIN_X = RUN_FOOT_X / RUN_CELL, RUN_ORIGIN_Y = RUN_FOOT_Y / RUN_CELL;

// --- Meditate / Ooze: 1564x184, 2 rows x 17 cols, cell=92. Row = body type
// (see BODY_TYPE_ROWS -- NOT direction; these are stationary town actions
// with a single camera-facing pose, same as the rank-up aura has no facing
// either), col = frame. Manually time-stepped like every other multi-frame
// sheet in this project (see WorldScene.js's _updateMeditation/_updateOoze
// -- NOT Phaser's sprite.play()/AnimationState, which lags real time badly
// under this sandbox's software-rendered WebGL, see ranks.js's header for
// the fuller writeup of that bug). New this round -- see
// extract_meditate_ooze.py for where the art came from and the foot-anchor
// measurement that produced FOOT_X/FOOT_Y below.
export const MEDITATE_CELL = 92;
export const MEDITATE_FRAME_COUNT = 17;
export const MEDITATE_FRAME_MS = 200; // ported from the source GIFs' own per-frame duration
export const MEDITATE_FOOT_X = 44, MEDITATE_FOOT_Y = 78;
export const MEDITATE_ORIGIN_X = MEDITATE_FOOT_X / MEDITATE_CELL, MEDITATE_ORIGIN_Y = MEDITATE_FOOT_Y / MEDITATE_CELL;
// The last 2 frames (indices 15-16) are what "hold" loops between while
// meditation is toggled on -- see _updateMeditation.
export const MEDITATE_HOLD_FRAMES = [15, 16];

export const OOZE_CELL = 92;
export const OOZE_FRAME_COUNT = 17;
export const OOZE_FRAME_MS = 200; // ported from the source GIFs' own per-frame duration
export const OOZE_FOOT_X = 45, OOZE_FOOT_Y = 80;
export const OOZE_ORIGIN_X = OOZE_FOOT_X / OOZE_CELL, OOZE_ORIGIN_Y = OOZE_FOOT_Y / OOZE_CELL;

// Row order for both sheets above -- matches how extract_meditate_ooze.py
// stacked them (confirmed against each source GIF's own first frame,
// pixel-for-pixel identical to player_idle.png/player_f_idle.png's
// south-facing frame for m_muscular/f_muscular respectively).
export const BODY_TYPE_ROWS = { f_muscular: 0, m_muscular: 1 };

// Default appearance (line ~3937 of the original): m_muscular body, bald
// (default hairstyle draws no hair layer at all), no recolors. This port
// starts from that same default -- hair/gear/customization is later work.
export const DEFAULT_BODY_TYPE = 'm_muscular';

// Default weapon -- the 'sword' row from the original's weapon table (line
// ~1461), used verbatim as the starting/only weapon for this pass. Other
// weapons (axe/hammer/spear/dagger, each with their own range/arc/cooldown/
// swingType) are real data in the original but not ported yet.
export const DEFAULT_WEAPON = {
  id: 'sword',
  base: 8,        // base damage
  cooldown: 0.42, // seconds between swings
  range: 46,      // px, extended by the target's own radius at hit-test time
  arc: 100,       // degrees, full cone width centered on aim angle
  swingDuration: 0.18, // seconds the attack animation plays over
};
