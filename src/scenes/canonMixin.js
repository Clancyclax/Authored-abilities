// ============================================================================
// ROUND 278 -- CANON ABILITIES, AT RUNTIME.
//
// The scene half of the canon layer: what a canon ability DOES when it is
// cast, where the book's rungs say it plainly enough to be run as written.
//
//   _applyCanonRungs(a, t, rank)   every condition each reached rung names,
//                                  onto one target, in the book's order.
//
// "Inflicts or refreshes [X]" is honoured as written: if the target already
// carries X the application refreshes it rather than adding an instance --
// unless something the target carries says X can stack ([Exsanguination]:
// "[Bleeding] can stack"). "Inflicts an instance of [X]" always adds one.
// Which verb a rung uses is read off the rung's own sentence, so the rule is
// the text's and not a list of ours.
// ============================================================================
import { conditionDef, debuffMagnitude } from '../data/debuffs.js';
import { CANON_TEXT } from '../data/canonText.js';
import { isoProject, isoDepth } from '../data/iso.js';

const RANKS = ['iron', 'bronze', 'silver', 'gold', 'diamond'];

/** For each condition a rung names: does the rung say "inflicts or refreshes"
 *  it? Read off the text; the exemplar's own rungs are the fallback where the
 *  user's text has not been sent yet. */
export function refreshOnlyKeys(a, rank) {
  const out = new Set();
  const t = a && a.canonKey ? CANON_TEXT[a.canonKey] : null;
  const rungs = (t && t.rungs) || (a && a.rankEffects) || {};
  const conds = (a && a.rankConditions) || {};
  for (const r of RANKS) {
    const text = String(rungs[r] || '');
    if (/inflicts or refreshes/i.test(text)) {
      // "Inflicts or refreshes the [Bleeding] and [Sacrificial Victim]
      // afflictions": every condition that rung names is refreshed, not
      // stacked.
      for (const k of (conds[r] || [])) out.add(k);
    }
    if (r === rank) break;
  }
  return out;
}

/** Can this condition stack on this target? Canon: [Exsanguination] lets
 *  [Bleeding] stack; nothing else in the table answers the question yet. */
function mayStack(t, key) {
  if (key !== 'bleed') return true;
  return !!(t && t.debuffs && t.debuffs.exsanguination);
}

export const CanonMixin = {
  _applyCanonRungs(a, t, rank = 'iron') {
    if (!a || !t || !t.alive) return [];
    const at = Math.max(0, RANKS.indexOf(rank));
    const refresh = refreshOnlyKeys(a, rank);
    const landed = [];
    // Gold's [Exsanguination] first when it is reached, so this very cast's
    // [Bleeding] is already allowed to stack.
    const order = [];
    for (let i = 0; i <= at && i < RANKS.length; i++) {
      for (const k of ((a.rankConditions || {})[RANKS[i]] || [])) order.push(k);
    }
    order.sort((x, y) => (y === 'exsanguination') - (x === 'exsanguination'));
    for (const key of order) {
      if (!conditionDef(key)) continue;
      const held = t.debuffs && t.debuffs[key];
      const opts = { fromPlayer: true, source: this.player };
      if (held && refresh.has(key) && !mayStack(t, key)) {
        // Refresh: the same instance count, the clock reset.
        const before = held.stacks || 1;
        const got = this._applyDebuff(t, key, opts);
        if (got) { got.stacks = before; got.mag = debuffMagnitude(conditionDef(key), before, got.potency || 1); }
        if (got) landed.push(key);
        continue;
      }
      if (this._applyDebuff(t, key, opts)) landed.push(key);
    }
    this._canonRungsLanded = (this._canonRungsLanded || 0) + landed.length;
    return landed;
  },

  /** A thin line from the caster to the target, gone in a moment: the curse
   *  goes where you are looking, not through the air. */
  _spawnAfflictionLink(t, color) {
    if (!t || !this.add || !this.add.graphics) return;
    const a = isoProject(this.world.x, this.world.y);
    const b = isoProject(t.wx, t.wy);
    const g = this.add.graphics();
    const c = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : (color || 0xb71c1c);
    g.lineStyle(2, c, 0.85);
    g.beginPath(); g.moveTo(a.x, a.y - 24); g.lineTo(b.x, b.y - 20); g.strokePath();
    g.setDepth(isoDepth(t.wx, t.wy) + 30000);
    if (this.tweens) this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
    else g.destroy();
  },
};
