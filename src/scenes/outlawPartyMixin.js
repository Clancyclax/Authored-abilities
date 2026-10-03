// ============================================================================
// ROUND 275 -- THE OUTLAW COMPANIONS, IN THE SCENE.
//
// data/outlawCompanions.js holds who they are. This file puts them in the
// world and on the team:
//
//   ART       until their own models arrive, each wears a bandit body in their
//             crew's colours -- baked once into a `char_outlaw_<id>_idle`
//             sheet so the party renderer draws them exactly as it draws Zeke
//   WHERE     in their bandit city, a few tiles off its centre
//   WHO WILL  an outlaw joins only a player on the outlaw route (hunted by the
//             Society, or an outlaw anywhere); a regular companion joins only
//             a player who is not -- and a regular already on the team walks
//             away the moment the player crosses over
//   THE ARC   told a beat at a time like everyone's, with two beats that ask
//             the player something; the answers are the redemption, and the
//             last beat is whichever ending they add up to
// ============================================================================
import { TILE } from '../data/iso.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { CHAR_ART } from '../data/characterManifest.js';
import { PARTY_BY_ID } from '../data/party.js';
import { COMPANION_ARCS, COMPANION_IDLE, BANTER } from '../data/companionStory.js';
import { banditModelFor } from '../data/bandits.js';
import { BANDIT_CITY_BY_ID } from '../data/banditCities.js';
import { OUTLAW_COMPANIONS, OUTLAW_BY_ID, OUTLAW_BANTER, redemptionState, toned } from '../data/outlawCompanions.js';
import { companionTone } from '../data/depravity.js';

/** The arcs, idle lines and banter join the shared tables once, at import.
 *  ROUND 291 -- the last beat carries the "unsure" ending as its written line
 *  (so the story checks read a real sentence) and `dynamic: 'ending'`, which
 *  `_outlawLine` swaps for whichever ending the answers came to. */
for (const c of OUTLAW_COMPANIONS) {
  if (!COMPANION_ARCS[c.id]) {
    COMPANION_ARCS[c.id] = [
      ...c.arc,
      { id: `${c.id}_end`, need: { told: c.arc.length, rank: 'silver' }, line: c.endings.unsure, dynamic: 'ending' },
    ];
  }
  if (!COMPANION_IDLE[c.id]) COMPANION_IDLE[c.id] = [c.greet, c.meditate];
}
for (const b of OUTLAW_BANTER) if (!BANTER.includes(b)) BANTER.push(b);

/** A regular companion's word to a player who has crossed over. */
const REGULAR_REFUSAL = {
  prism: "I liked you. I think I still do. But I know what you did, and I will not stand next to it.",
  zeke: "I keep people standing. I won't keep you standing while you knock others down.",
};
const REGULAR_LEAVING = "I didn't sign on for this. I'm done.";

export const OutlawPartyMixin = {
  /** Is the player on the outlaw route? */
  _onOutlawRoute() {
    const p = this.player;
    if (!p) return false;
    if (p.society && p.society.hunted) return true;
    return !!(p.outlaw && Object.keys(p.outlaw).length);
  },

  /** The outlaw definitions, as PARTY entries, with their art baked. Called
   *  by `_buildParty` before it builds anyone. */
  _outlawPartyDefs() {
    const out = [];
    for (const c of OUTLAW_COMPANIONS) {
      const art = this._bakeOutlawArt(c);
      if (!art) continue;
      const city = BANDIT_CITY_BY_ID[c.city];
      if (!city) continue;
      const spot = c.spot || { dx: 4, dy: 6 };
      const def = {
        ...c, outlaw: true, art,
        recruitAt: { tx: city.at.tx + spot.dx, ty: city.at.ty + spot.dy },
      };
      PARTY_BY_ID[c.id] = def;
      out.push(def);
    }
    return out;
  },

  /** One companion's bandit body, in their crew's colours, as a char sheet. */
  _bakeOutlawArt(c) {
    const key = `outlaw_${c.id}`;
    const texKey = `char_${key}_idle`;
    const model = banditModelFor(c.model);
    const base = model && NPC_ART[model.key];
    if (!base) return null;
    if (!this.textures.exists(texKey)) {
      const painted = this._banditTexture ? this._banditTexture(c.crew, c.model) : null;
      const src = painted && this.textures.exists(painted) ? this.textures.get(painted).getSourceImage()
        : (this.textures.exists(model.key) ? this.textures.get(model.key).getSourceImage() : null);
      if (!src) return null;
      try {
        this.textures.addSpriteSheet(texKey, src, { frameWidth: NPC_CELL, frameHeight: NPC_CELL });
      } catch (e) { return null; }
    }
    if (!CHAR_ART[key]) {
      const footX = base.footX || 32, footY = base.footY || 63;
      CHAR_ART[key] = {
        cell: NPC_CELL, footX, footY, synthetic: true,
        animKeys: ['idle'],
        anims: { idle: { sheet: null, framesPerDir: 1, frameMs: 0, foot: footY, source: 'bandit' } },
      };
    }
    return key;
  },

  /** What a member says instead of joining, or null when they would join. */
  _recruitRefusal(m) {
    if (!m) return null;
    const outlawRoute = this._onOutlawRoute();
    // ROUND 295 (5.9) -- a companion the Society pardoned with you walks with you lawful.
    const pardoned = !!(this.player && this.player.pardoned && this.player.pardoned[m.id]);
    if (m.outlaw && !outlawRoute && !pardoned) return (OUTLAW_BY_ID[m.id] || {}).refuse || 'Not you. Not yet.';
    if (!m.outlaw && outlawRoute) return REGULAR_REFUSAL[m.id] || "I know what you are now. Keep walking.";
    return null;
  },

  /** The player crossed over: the regulars on the team walk away. */
  _regularsLeave() {
    const gone = [];
    for (const m of (this.party || [])) {
      if (!m || m.outlaw || !m.recruited) continue;
      m.recruited = false;
      m.benched = false;
      m.temporary = false;
      m.target = null;
      if (Number.isFinite(m.homeX)) { m.x = m.homeX; m.y = m.homeY; }
      gone.push(m.name);
      this._floatText(this.world.x, this.world.y - 60 - gone.length * 14, `${m.name}: "${REGULAR_REFUSAL[m.id] || REGULAR_LEAVING}"`, '#ef9a9a');
    }
    if (gone.length && this._refreshTeamTabButton) this._refreshTeamTabButton();
    return gone;
  },

  /** An arc step's choices, for an outlaw's asking beat. */
  _outlawAskChoices(m, step) {
    if (!m || !m.outlaw || !step || !step.ask) return [];
    return [
      { label: step.ask.redeem.label, act: `outlawAsk|${m.id}|${step.id}|redeem` },
      { label: step.ask.harden.label, act: `outlawAsk|${m.id}|${step.id}|harden` },
    ];
  },

  /** An answer given. Recorded once per beat. */
  _outlawAnswer(id, stepId, way) {
    const c = OUTLAW_BY_ID[id];
    const step = c && c.arc.find(s => s.id === stepId);
    if (!step || !step.ask) return null;
    const p = this.player;
    p.outlawAnswers = p.outlawAnswers || {};
    const key = `${id}|${stepId}`;
    if (!p.outlawAnswers[key]) {
      p.outlawAnswers[key] = way;
      p.redemption = p.redemption || {};
      if (way === 'redeem') p.redemption[id] = (p.redemption[id] || 0) + 1;
    }
    const reply = way === 'redeem' ? step.ask.redeem.reply : step.ask.harden.reply;
    this._openDialogue(c.name, reply);
    return reply;
  },

  /** The line a step says: an outlaw's last beat is whichever ending the
   *  answers came to. */
  _outlawLine(m, step) {
    if (!step) return '';
    const c = m && OUTLAW_BY_ID[m.id];
    if (!c) return step.line;
    if (step.dynamic === 'ending') {
      const state = redemptionState((this.player.redemption || {})[m.id]);
      return c.endings[state] || step.line;
    }
    // ROUND 291 (5.8) -- in the tone the player has earned.
    return toned(step, companionTone(this.player));
  },

  /** ROUND 291 (5.8) -- an outlaw's idle lines, in the player's tone. Null
   *  for anyone who is not an outlaw, so the shared table answers for them. */
  _outlawIdle(m) {
    const c = m && OUTLAW_BY_ID[m.id];
    if (!c) return null;
    const evil = companionTone(this.player) === 'evil';
    return evil ? [c.greetEvil || c.greet, c.meditateEvil || c.meditate] : [c.greet, c.meditate];
  },
};
