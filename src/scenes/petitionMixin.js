// ============================================================================
// ROUND 295 -- 5.9 IN THE SCENE: THE RECORD, PRISM'S NOTES, THE PETITION.
//
// data/divisionRecord.js is the record's pages and data/petition.js is the
// meeting's words and its gate. This file is the rest:
//
//   THE RECORD   A bandit city's captain posts its pages in order
//                (`_recordAddendum`). Each is an ordinary contract built by
//                `_makeOffer` (`_recordOffer`), reported to the captain in
//                person (`_reportRecordPage`). Two pages end on a choice, and
//                the dirty way is a civilian death.
//   THE NOTES    Prism leaves one after every fight she walks away from
//                (`_prismLeaveNote`, called from `_prismVanish`).
//   THE MEETING  When the gate opens (`_petitionReady`), Prism's next visit is
//                a parley, not a fight. The adjudicator walks in behind her
//                (`_spawnAdjudicator`), the player hands over the record, each
//                outlaw companion in the party answers for themselves, and the
//                Society reinstates the player and whoever it pardoned
//                (`_grantPetition`).
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { REGION_BY_ID } from '../data/regions.js';
import { seededRng } from '../data/awakening.js';
import { BANDIT_CITY_BY_ID } from '../data/banditCities.js';
import { ACT4_FIRST } from '../data/division.js';
import { depravityState, addDepravity, cleanHands, hasEmbraced } from '../data/depravity.js';
import { redemptionState, OUTLAW_BY_ID } from '../data/outlawCompanions.js';
import {
  RECORD_BY_ID, RECORD_NEED, recordState, nextRecordPage, recordPagesHeld, recordQuestId,
} from '../data/divisionRecord.js';
import {
  ADJUDICATOR, petitionOpen, companionVerdict, prismNoteFor, PETITION_LINES, PETITION_ANSWERS,
} from '../data/petition.js';

/** How long after the gate opens, at least, before Prism comes to talk. */
export const PARLEY_AFTER_S = 30;
/** Walk this far from the meeting and it is off until her next visit. */
export const PARLEY_LEAVE_TILES = 45;
/** Where she stops, and where the adjudicator starts from. */
const PARLEY_STAND = 3 * TILE;
const ADJ_START = 9 * TILE;
const ADJ_SPEED = 70;

export const PetitionMixin = {
  // ---------------------------------------------------------------- record --

  /** A bandit captain's pages: the next one to take, or the one to report. */
  _recordAddendum(npc) {
    const body = [], choices = [];
    if (!npc || !npc.captain || !npc.banditCity || !this._onOutlawRoute || !this._onOutlawRoute()) return { body, choices };
    const p = this.player;
    const page = nextRecordPage(p, npc.banditCity);
    const held = recordPagesHeld(p);
    if (page) {
      const q = (p.quests || []).find(x => x.id === recordQuestId(page));
      if (!q) {
        body.push(page.open);
        choices.push({ label: `Take the job: ${page.title}`, act: `recordTake|${page.id}` });
      } else if (this._questDone(q)) {
        choices.push({ label: `Report: ${page.title}`, act: `recordReport|${page.id}` });
      } else {
        body.push(`"${page.title}. I'm still waiting on you."`);
      }
    }
    if (held) body.push(`[ The record of the Division: ${held} of ${RECORD_NEED} pages. ]`);
    return { body, choices };
  },

  /** The contract under a page, built once and kept. */
  _recordOffer(page) {
    if (!page) return null;
    const id = recordQuestId(page);
    this._recordOffers = this._recordOffers || {};
    if (this._recordOffers[id]) return this._recordOffers[id];
    const city = BANDIT_CITY_BY_ID[page.city];
    const region = city && REGION_BY_ID[city.region];
    if (!region) return null;
    let offer = null;
    for (const kind of page.kinds) {
      for (let a = 0; a < 4 && !offer; a++) offer = this._makeOffer(kind, id, region, seededRng(`${id}|${a}`), null);
      if (offer) break;
    }
    if (!offer) return null;
    offer.id = id;
    offer.recordPage = page.id;
    offer.title = page.title;
    offer.desc = page.brief;
    offer.premise = page.open;
    this._recordOffers[id] = offer;
    return offer;
  },

  _takeRecordPage(pageId) {
    const page = RECORD_BY_ID[pageId];
    const p = this.player;
    if (!page || nextRecordPage(p, page.city) !== page) { this._closeDialogue(); return null; }
    p.quests = p.quests || [];
    if (p.quests.some(q => q.id === recordQuestId(page))) { this._closeDialogue(); return null; }
    const offer = this._recordOffer(page);
    if (!offer) {
      this._floatText(this.world.x, this.world.y - 52, 'Nothing to work with here right now.', '#ffb347');
      return null;
    }
    const q = { ...offer, state: 'active', have: 0 };
    delete q.taken;
    q.takenDay = this._dayIndex ? this._dayIndex() : 0;
    if (q.kind === 'den' && this._layTrail) this._layTrail(q);
    if (q.kind === 'case' && this._placeCaseWitnesses) { q.heard = []; this._placeCaseWitnesses(q); }
    if ((q.kind === 'hunt' || q.kind === 'plague') && this._spawnBountyTargetFor) this._spawnBountyTargetFor(q);
    this._autoTrackQuest(q);
    p.quests.push(q);
    this._closeDialogue();
    this._floatText(this.world.x, this.world.y - 46, `Taken: ${page.title}`, '#ffd54f');
    return q;
  },

  /** Reported to the captain. A page with a choice asks it first. */
  _reportRecordPage(pageId) {
    const page = RECORD_BY_ID[pageId];
    const p = this.player;
    if (!page) return false;
    const q = (p.quests || []).find(x => x.id === recordQuestId(page));
    if (!q || !this._questDone(q)) return false;
    this._turnInBounty(q, { fromChain: true });
    p.quests = (p.quests || []).filter(x => x !== q);
    if (this._recordOffers) delete this._recordOffers[q.id];
    if (page.choice) {
      this._recordPending = page.id;
      this._openDialogue(this._recordCaptainName(page), `${page.done}\n\n${page.choice.prompt}`, null, [
        { label: page.choice.clean.label, act: `recordChoice|${page.id}|clean` },
        { label: page.choice.dirty.label, act: `recordChoice|${page.id}|dirty` },
      ]);
      return true;
    }
    this._grantRecordPage(page, null, page.done);
    return true;
  },

  _recordChoice(pageId, way) {
    const page = RECORD_BY_ID[pageId];
    if (!page || !page.choice || this._recordPending !== pageId) return false;
    this._recordPending = null;
    const dirty = way === 'dirty';
    // The crew's way is a person dead who did not have to be: a civilian, by
    // his definition (townsfolk and merchants), and the petition counts it.
    if (dirty) addDepravity(this.player, 'civilian', 1, page.title);
    this._grantRecordPage(page, dirty ? 'dirty' : 'clean', page.choice[dirty ? 'dirty' : 'clean'].reply);
    return true;
  },

  _grantRecordPage(page, way, said) {
    const r = recordState(this.player);
    if (!r.pages.includes(page.id)) r.pages.push(page.id);
    r.cursor[page.city] = (r.cursor[page.city] || 0) + 1;
    if (way) r.choices[page.id] = way;
    const n = r.pages.length;
    const lines = [said, `[ A page for the record: ${page.page.title}. ]\n\n"${page.page.text}"`,
      `[ The record of the Division: ${n} of ${RECORD_NEED} pages. ]`];
    if (n === RECORD_NEED) lines.push('[ The record is enough to petition the Society with, at Silver and before the surge, if your hands are clean. ]');
    this._openDialogue(this._recordCaptainName(page), lines.join('\n\n'));
    this._floatText(this.world.x, this.world.y - 52, `Record: ${n}/${RECORD_NEED}`, '#ce93d8');
  },

  _recordCaptainName(page) {
    const c = BANDIT_CITY_BY_ID[page.city];
    return c ? `${c.captain}, captain of ${c.name}` : 'The captain';
  },

  // ----------------------------------------------------------------- notes --

  /** After a fight she walked away from: a note, both ways. */
  _prismLeaveNote(x, y) {
    const p = this.player;
    p.prismNotes = p.prismNotes || [];
    const n = p.prismNotes.length + 1;
    const clean = cleanHands(p) && !hasEmbraced(p);
    const text = prismNoteFor(n, clean);
    p.prismNotes.push({ n, clean, text, day: this._dayIndex ? this._dayIndex() : 0 });
    this._floatText(x, y - 34, 'She left a note', '#f8bbd0');
    const show = () => { if (!this._dialogueOpen) this._openDialogue('A note from Prism', text); };
    if (this.time && this.time.delayedCall) this.time.delayedCall(900, show); else show();
    return text;
  },

  // -------------------------------------------------------------- petition --

  /** The gate, read off the scene. */
  _petitionStatus() {
    const p = this.player;
    return petitionOpen(p, {
      outlaw: !!(this._onOutlawRoute && this._onOutlawRoute()),
      rank: this._prismPlayerRank ? this._prismPlayerRank() : (p.rank || 'normal'),
      surgeBegun: !!p.surgeBegun,
      civilians: depravityState(p).civilians || 0,
      pages: recordPagesHeld(p),
    });
  },

  _petitionReady() { return this._petitionStatus().ok; },

  /** She came to talk. Called from `_spawnPrismNemesis`. */
  _beginParley(c) {
    c.parley = true;
    c.hostile = false;
    c.parleyT = 0;
    this._parley = { prism: c, official: null, x: this.world.x, y: this.world.y };
    this._openDialogue('Prism', PETITION_LINES.parley);
  },

  /** Her, while she waits; and the adjudicator, walking in. */
  _moveParley(c, dt) {
    const pl = this._parley;
    const dx = this.world.x - c.x, dy = this.world.y - c.y, d = Math.hypot(dx, dy) || 1;
    if (d > PARLEY_LEAVE_TILES * TILE || this._insideRoom) { this._endParley('left'); return; }
    if (d > PARLEY_STAND) {
      const step = c.speed * dt;
      if (this._personStep) this._personStep(c, this.world.x, this.world.y, step);
      else { c.x += (dx / d) * step; c.y += (dy / d) * step; }
    }
    const sp = isoProject(c.x, c.y);
    c.sprite.setPosition(sp.x, sp.y);
    c.sprite.setDepth(isoDepth(c.x, c.y));
    c.sprite.setFrame(dirRow(facingFromMove(dx, dy) || 'south'));
    if (!pl) return;
    if (!this._dialogueOpen) c.parleyT = (c.parleyT || 0) + dt;
    if (!pl.official && c.parleyT > 2) pl.official = this._spawnAdjudicator(c);
    const o = pl.official;
    if (o && o.walking) {
      const ox = this.world.x - o.x, oy = this.world.y - o.y, od = Math.hypot(ox, oy) || 1;
      if (od <= 2 * TILE) {
        o.walking = false;
        this._floatText(o.x, o.y - 56, ADJUDICATOR.short, '#cfd8dc');
      } else {
        const st = ADJ_SPEED * dt;
        if (this._personStep) this._personStep(o, this.world.x, this.world.y, st);
        else { o.x += (ox / od) * st; o.y += (oy / od) * st; }
      }
      const op = isoProject(o.x, o.y);
      o.sprite.setPosition(op.x, op.y);
      o.sprite.setDepth(isoDepth(o.x, o.y));
      o.sprite.setFrame(dirRow(facingFromMove(ox, oy) || 'south'));
    }
  },

  /** The adjudicator, as a person on the road you can talk to. */
  _spawnAdjudicator(c) {
    const key = ADJUDICATOR.art.find(k => this.textures.exists(k) && NPC_ART[k]);
    const th = Math.atan2(c.y - this.world.y, c.x - this.world.x);
    let x = this.world.x + Math.cos(th) * ADJ_START, y = this.world.y + Math.sin(th) * ADJ_START;
    for (let a = 0; a < 10 && (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 14)); a++) {
      x = this.world.x + Math.cos(th + a * 0.5) * ADJ_START; y = this.world.y + Math.sin(th + a * 0.5) * ADJ_START;
    }
    const n = {
      name: ADJUDICATOR.name, x, y, facing: 'south', sprite: null, shopId: null,
      adjudicator: true, walking: true, artKey: key || null,
      dialogue: `${PETITION_LINES.arrive}\n\n${ADJUDICATOR.dialogue}\n\n${PETITION_LINES.intro}`,
    };
    if (key) {
      const art = NPC_ART[key];
      const sp = isoProject(x, y);
      n.sprite = this.add.sprite(sp.x, sp.y, key, dirRow('south'));
      n.sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
      n.sprite.setScale(art.scale || 1);
      n.sprite.setDepth(isoDepth(x, y));
    } else {
      // No art loaded (a test harness): she still arrives, as a marker.
      const sp = isoProject(x, y);
      n.sprite = this.add.circle(sp.x, sp.y - 20, 8, 0x90a4ae, 1);
      n.sprite.setFrame = () => {};
    }
    (this.npcs = this.npcs || []).push(n);
    this._floatText(this.world.x, this.world.y - 60, 'The adjudicator is coming', '#cfd8dc');
    return n;
  },

  /** The meeting is over, one way or the other. */
  _endParley(how) {
    const pl = this._parley;
    this._parley = null;
    if (pl && pl.official) {
      const o = pl.official;
      if (o.sprite && o.sprite.destroy) o.sprite.destroy();
      this.npcs = (this.npcs || []).filter(n => n !== o);
    }
    if (pl && pl.prism && pl.prism.alive) this._prismVanish(pl.prism, 'withdraws');
    if (how === 'left') {
      this._floatText(this.world.x, this.world.y - 52, 'Prism has gone', '#f8bbd0');
      // She will try again soon; the gate is still open.
      const st = this._prismNemesisState();
      st.sinceT = 0;
    }
  },

  /** On the adjudicator: hand over the record. */
  _petitionAddendum(npc) {
    const body = [], choices = [];
    if (!npc || !npc.adjudicator || (this.player.petition && this.player.petition.done)) return { body, choices };
    if (this._petitionReady()) choices.push({ label: 'Hand over the record', act: 'petition|start' });
    return { body, choices };
  },

  /** The petition, one page at a time. */
  _petitionAct(cmd) {
    const p = this.player;
    const parts = String(cmd).split('|');
    if (parts[0] === 'start') {
      if (!this._petitionReady()) return false;
      const titles = recordState(p).pages.map(id => RECORD_BY_ID[id]).filter(Boolean)
        .map(pg => pg.page.title.toLowerCase()).join(', ');
      const civ = depravityState(p).civilians || 0;
      const crew = (this.party || []).filter(m => m && m.outlaw && m.recruited && PETITION_ANSWERS[m.id]);
      this._petitionFlow = { crew: crew.map(m => m.id), i: 0, pardoned: [], refused: [] };
      const text = `${PETITION_LINES.read(titles)}\n\n${civ ? PETITION_LINES.hands1 : PETITION_LINES.hands0}`;
      this._openDialogue(ADJUDICATOR.name, text, null, [{ label: 'Go on', act: 'petition|next' }]);
      return true;
    }
    const f = this._petitionFlow;
    if (!f) return false;
    if (parts[0] === 'vouch') {
      const [, id, yes] = parts;
      const m = (this.party || []).find(x => x.id === id);
      const name = m ? m.name : id;
      if (yes === 'yes') f.pardoned.push(id); else f.refused.push(id);
      this._openDialogue(ADJUDICATOR.name, yes === 'yes' ? PETITION_LINES.vouchYes(name) : PETITION_LINES.vouchNo(name),
        null, [{ label: 'Go on', act: 'petition|next' }]);
      return true;
    }
    if (parts[0] === 'next') {
      if (f.i < f.crew.length) {
        const id = f.crew[f.i];
        const first = f.i === 0;
        f.i++;
        const m = (this.party || []).find(x => x.id === id);
        const name = m ? m.name : id;
        const state = redemptionState((p.redemption || {})[id]);
        const way = companionVerdict(state);
        const a = PETITION_ANSWERS[id];
        const text = `${first ? `${PETITION_LINES.crew}\n\n` : ''}${a.ask}\n\n${a[state]}`;
        if (way === 'vouch') {
          this._openDialogue(ADJUDICATOR.name, `${text}\n\n${PETITION_LINES.vouchAsk(name)}`, null, [
            { label: `Vouch for ${name}`, act: `petition|vouch|${id}|yes` },
            { label: 'Say nothing', act: `petition|vouch|${id}|no` },
          ]);
        } else {
          (way === 'pardoned' ? f.pardoned : f.refused).push(id);
          this._openDialogue(ADJUDICATOR.name, text, null, [{ label: 'Go on', act: 'petition|next' }]);
        }
        return true;
      }
      this._grantPetition();
      return true;
    }
    return false;
  },

  /** Reinstated: the record is the Society's, and so is the player again. */
  _grantPetition() {
    const p = this.player;
    const f = this._petitionFlow || { crew: [], pardoned: [], refused: [] };
    this._petitionFlow = null;
    // The law.
    p.outlaw = {};
    const st = this._societyState();
    st.hunted = false;
    st.outlawed = false;
    st.suspended = false;
    st.joined = true;
    if (!st.rank) st.rank = p.rank || 'normal';
    for (const c of (this._liveHunters ? this._liveHunters() : [])) {
      c.alive = false; c.despawned = true; if (c.sprite) c.sprite.destroy();
    }
    // The crew.
    p.pardoned = p.pardoned || {};
    for (const id of f.pardoned) p.pardoned[id] = true;
    for (const id of f.refused) {
      const m = (this.party || []).find(x => x.id === id);
      if (!m) continue;
      m.recruited = false; m.benched = false; m.temporary = false; m.target = null;
      if (Number.isFinite(m.homeX)) { m.x = m.homeX; m.y = m.homeY; }
    }
    p.petition = {
      done: true, day: this._dayIndex ? this._dayIndex() : 0,
      pardoned: f.pardoned.slice(), refused: f.refused.slice(), pages: recordState(p).pages.slice(),
    };
    p.divisionWitness = true;
    // Prism walks back with you.
    const names = f.pardoned.map(id => ((this.party || []).find(x => x.id === id) || OUTLAW_BY_ID[id] || { name: id }).name);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] || '');
    const pl = this._parley;
    if (pl && pl.prism && pl.prism.alive) {
      const c = pl.prism;
      c.alive = false; c.despawned = true;
      if (c.sprite && c.sprite.destroy) c.sprite.destroy();
    }
    const pm = (this.party || []).find(m => m.id === 'prism');
    if (pm) {
      if (pm.sprite) pm.sprite.setVisible(true);
      if (!pm.recruited) {
        pm.x = this.world.x + 30; pm.y = this.world.y + 20;
        p.prismArrived = true;
        this._recruitPartyMember(pm);
      }
    }
    p.prismReturned = true;
    this._openDialogue(ADJUDICATOR.name, `${PETITION_LINES.verdict(list)}\n\n${PETITION_LINES.verdictNote}`);
    this._floatText(this.world.x, this.world.y - 60, 'Reinstated', '#a5d6a7');
    // The adjudicator goes back the way she came once you have read it.
    if (pl && pl.official) {
      const o = pl.official;
      const gone = () => {
        if (o.sprite && o.sprite.destroy) o.sprite.destroy();
        this.npcs = (this.npcs || []).filter(n => n !== o);
      };
      if (this.time && this.time.delayedCall) this.time.delayedCall(6000, gone); else gone();
    }
    this._parley = null;
    if (this._refreshTeamTabButton) this._refreshTeamTabButton();
    return p.petition;
  },

  /** The surge broke first: the petition is closed for good. */
  _petitionOnSurge() {
    const p = this.player;
    if (!p || (p.petition && p.petition.done)) return;
    if (!this._onOutlawRoute || !this._onOutlawRoute()) return;
    p.petition = { ...(p.petition || {}), closed: 'surge' };
  },

  /** Act 4 opens on the witness, once. Called from `_divisionAdvance`. */
  _witnessAct4() {
    const p = this.player;
    if (!p.divisionWitness || p._witnessTold) return false;
    const st = this._divisionStage && this._divisionStage();
    if (!st || st.id !== ACT4_FIRST) return false;
    p._witnessTold = true;
    this._openDialogue('A letter from the Society', PETITION_LINES.act4);
    return true;
  },
};
