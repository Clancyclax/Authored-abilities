// ============================================================================
// ROUND 285 -- "BY LOVE OR BY FEAR", AND THE LIST THAT CAME WITH THE NAME.
//
// The helpers this round needs that are not one-line edits at a call site.
// Each is named for the item it answers.
// ============================================================================

import { facingFromMove } from '../data/iso.js';

/** An essence named for a weapon, and the weapon. */
const QM_ESSENCE_WEAPON = { essSword: 'sword', essHammer: 'hammer', essAxe: 'axe', essSpear: 'spear',
  essWhip: 'whip', essStaff: 'staff', essBow: 'bow' };

export const Round285Mixin = {
  /** (15) The attract screen or the BOOT title is up: nobody is playing yet.
   *  The title shown over a running game (F9) is the game paused, not a boot,
   *  and is not this. */
  _bootTitleUp() {
    if (this._attractOpen) return true;
    if (!this._titleOpen) return false;
    const el = typeof document !== 'undefined' ? document.getElementById('titleScreen') : null;
    return !(el && el.classList.contains('in-game'));
  },

  /** (5) "Guildmaster Yorin must mark the society on the minimap when asked
   *  about it." The Society topic, asked of him, puts the hall's door on the
   *  map and he says so. Returns what he says. */
  _topicSideEffects(id, npc, said) {
    if (id !== 'society' || !npc) return said;
    const yorin = npc.grantsEssence || npc.societyMaster || /yorin/i.test(npc.name || '');
    if (!yorin || !this.player) return said;
    this.player.societyMarked = true;
    this._serviceMarkCache = null;
    const hall = this._serviceMarks().find(m => m.id === 'guild');
    if (!hall) return said;
    this._societyMarkedAt = { x: hall.x, y: hall.y };
    if (this._drawMinimap) this._drawMinimap();
    return `${said}\n\nThe hall is marked on your map -- the square with the gold edge. Can't miss it.`;
  },

  /** (14) What the Society quartermaster's rack always carries: a hammer,
   *  and the weapon any socketed essence is named for. */
  _quartermasterAlways() {
    const out = ['hammer'];
    for (const id of ((this.player && this.player.slotEssence) || [])) {
      const w = QM_ESSENCE_WEAPON[id];
      if (w && !out.includes(w)) out.push(w);
    }
    return out;
  },

  /** (4) A companion walking somewhere that is NOT the player: a straight
   *  line, with a sidestep either way round an obstacle, and no catch-up
   *  teleport. `speed` is units per second. */
  _walkNoCatchup(m, goal, dt, speed = 150) {
    const dx = goal.x - m.x, dy = goal.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) { m.anim = 'idle'; return true; }
    const step = speed * dt;
    // ROUND 292 -- by a path when the straight line is blocked.
    const aim = (this._navAim && this._navAim(m, m.x, m.y, goal.x, goal.y, { drop: true })) || goal;
    const ax = aim.x - m.x, ay = aim.y - m.y;
    const ad = Math.hypot(ax, ay) || 1;
    const ux = ax / ad, uy = ay / ad;
    const tries = [[ux, uy], [ux - uy, uy + ux], [ux + uy, uy - ux], [-uy, ux], [uy, -ux]];
    for (const [tx, ty] of tries) {
      const n = Math.hypot(tx, ty) || 1;
      const nx = m.x + (tx / n) * step, ny = m.y + (ty / n) * step;
      if (this._collidesObstacle(nx, ny, 14) || this._isWaterAt(nx, ny)) continue;
      m.x = nx; m.y = ny; break;
    }
    m.facing = facingFromMove(ux, uy) || m.facing;
    m.anim = 'walk';
    m.walkHoldUntil = this.time.now + 250;
    return false;
  },
};

