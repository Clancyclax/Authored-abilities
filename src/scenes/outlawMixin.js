// ============================================================================
// ROUND 271 -- THE SOCIETY AND THE RESTRICTED ESSENCES, IN THE SCENE.
//
//   "1.1) Adventurer society and guards hunt you down if they find out (You go
//         in to register or gain them while registered)
//    1.4) For players with a restricted essence but not the undeath confluence
//         the adventure society will administer a personality test and send
//         you on a mission to wipe out a cult somewhere on the map to
//         evaluate you."
//
// The rules themselves are pure and live in data/restricted.js. This file is
// the part that needs a scene: finding out, the test's pages, the cult camp
// on the map, and the report that ends it.
//
// HOW THE SOCIETY FINDS OUT, and nothing else:
//   - you walk up to the desk to register              (_societyScreensApplicant)
//   - you bond one while you are on their books         (_restrictedCheck)
// Bonding one in a field while unregistered tells nobody anything. The
// Society's state records what it has already weighed (`seenRestricted`,
// `clearedFor`), so a reload never "finds out" twice.
//
// WHAT HUNTED MEANS IN THIS ROUND: the desk will not serve you and the board
// will not take your name. The hunters themselves are round 274's; the flag
// they read is set here, so a save made now is hunted then.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { REGION_BY_ID, REGION_TILES, regionDenTier, regionOrigin, allSettlements } from '../data/regions.js';
import { CULT_BY_SLUG, cultistArtKey } from '../data/cultists.js';
import { RANK_ORDER } from '../data/ranks.js';
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import {
  UNDEATH, RESTRICTED_ESSENCES, restrictedHeld, societyVerdict,
  PERSONALITY_TEST, testBand, TEST_REMARKS, EVAL_NEED, evaluationCult,
} from '../data/restricted.js';

const EVAL_SPAWN_RANGE = 60;   // tiles: the camp is peopled when you come this close
const EVAL_LEASH = 16;         // tiles: they defend the camp, not the region
const EVAL_NOTICE = 9;         // tiles: and they see you coming at this

const essName = (id) => (RESTRICTED_ESSENCES[id] && RESTRICTED_ESSENCES[id].name)
  || (ESSENCE_CATALOG[id] && ESSENCE_CATALOG[id].name) || id;

export const OutlawMixin = {
  /** What the Society currently holds against you, as one word. */
  _societyStanding() {
    const st = this._societyState();
    if (st.hunted) return 'hunted';
    if (st.suspended) return 'suspended';
    if (st.evaluation && st.evaluation.stage && st.evaluation.stage !== 'passed') return 'evaluating';
    if (st.joined) return 'member';
    return 'none';
  },

  /** The verdict on what the player has bonded right now. */
  _restrictedVerdict() {
    const p = this.player;
    const st = this._societyState();
    return societyVerdict({
      slotEssence: p.slotEssence,
      confluenceName: p.confluence && !p.confluence.divine ? p.confluence.name : null,
      clearedFor: st.clearedFor,
    });
  },

  /**
   * Called after every rebuild. Only a MEMBER can be found out this way --
   * "gain them while registered" -- and only once per essence.
   */
  _restrictedCheck() {
    const p = this.player;
    if (!p || !Array.isArray(p.slotEssence)) return null;
    const st = this._societyState();
    const held = restrictedHeld(p.slotEssence);
    const undeath = !!(p.confluence && !p.confluence.divine && p.confluence.name === UNDEATH);
    const seen = new Set(st.seenRestricted || []);
    const fresh = held.filter(id => !seen.has(id));
    const freshUndeath = undeath && !st.seenUndeath;
    if (!st.joined || st.hunted) {
      return null;
    }
    if (!fresh.length && !freshUndeath) return null;
    st.seenRestricted = [...new Set([...(st.seenRestricted || []), ...held])];
    if (undeath) st.seenUndeath = true;
    const verdict = this._restrictedVerdict();
    if (verdict === 'hunt') {
      this._societyDeclareHunted('bonded');
      return 'hunt';
    }
    if (verdict === 'evaluate') {
      st.suspended = true;
      st.evaluation = { stage: 'test', answers: [], essences: held.slice() };
      const names = held.map(essName).join(' and ');
      this._societyNotice('The Adventure Society',
        [`Word travels. The Society knows you have bonded ${names}.`,
          'Your membership is suspended until you sit their assessment. '
          + 'Go to the desk at any Society hall.'].join('\n\n'));
      return 'evaluate';
    }
    return null;
  },

  /** Tell the player, without talking over a conversation that is open. */
  _societyNotice(title, text) {
    if (this._dialogueOpen || this._creatorOpen || this._act0Running) {
      this._floatText(this.world.x, this.world.y - 60, title, '#ef9a9a');
      (this._pendingSocietyNotices = this._pendingSocietyNotices || []).push({ title, text });
      return;
    }
    this._openDialogue(title, text);
  },

  /** Deliver anything held back by an open conversation. Cheap per frame. */
  _flushSocietyNotices() {
    const q = this._pendingSocietyNotices;
    if (!q || !q.length || this._dialogueOpen || this._creatorOpen || this._act0Running) return;
    const n = q.shift();
    this._openDialogue(n.title, n.text);
  },

  /** Undeath. No test, no appeal: struck off, and hunted. */
  _societyDeclareHunted(how) {
    const st = this._societyState();
    if (st.hunted) return false;
    st.hunted = true;
    st.joined = false;
    st.suspended = false;
    st.evaluation = null;
    st.huntedDay = this._dayIndex ? this._dayIndex() : 0;
    // Any Society contract in hand is void: the Society does not pay people it
    // is hunting.
    for (const q of (this.player.quests || [])) {
      if ((q.society || q.kind === 'evaluation') && q.state === 'active') q.state = 'void';
    }
    if (this._regularsLeave) this._regularsLeave();   // ROUND 275 -- they want nothing to do with you
    const lines = how === 'register'
      ? ['The clerk reads your aura and puts the pen down very slowly.',
        '"Undeath." The word is said loudly enough for the whole hall.',
        '"You are not registered. You are not welcome. And you are not leaving this '
        + 'hall without every member in it knowing your face."',
        '[ The Adventure Society is hunting you. ]']
      : ['Word travels faster than you do.',
        'The Society has learned that you carry the Undeath confluence. Your name is struck '
        + 'from their books and posted in every hall.',
        '[ The Adventure Society is hunting you. ]'];
    this._societyNotice('The Adventure Society', lines.join('\n\n'));
    return true;
  },

  /**
   * Registration, screened. Returns true when the screen has taken over the
   * conversation (so `_joinSociety` stops), false when the applicant is clear.
   */
  _societyScreensApplicant() {
    const st = this._societyState();
    const verdict = this._restrictedVerdict();
    if (verdict === 'clear') return false;
    const held = restrictedHeld(this.player.slotEssence);
    st.seenRestricted = [...new Set([...(st.seenRestricted || []), ...held])];
    if (verdict === 'hunt') {
      st.seenUndeath = true;
      this._societyDeclareHunted('register');
      return true;
    }
    st.evaluation = st.evaluation && st.evaluation.stage === 'test'
      ? st.evaluation : { stage: 'test', answers: [], essences: held.slice() };
    this._societyTestIntro();
    return true;
  },

  /** The desk explains before it asks. */
  _societyTestIntro() {
    const st = this._societyState();
    const names = restrictedHeld(this.player.slotEssence).map(essName).join(' and ');
    const body = [
      `The clerk looks at your aura, then at you. "${names}. You know we cannot simply put that on the books."`,
      '"There is an assessment. Five questions, and then some work. Answer honestly -- '
      + 'the work is decided by the answers, not the other way round."',
    ];
    this._openDialogue('The Adventure Society', body.join('\n\n'), null,
      [{ label: 'Sit the assessment', act: 'socTest|0|-1' },
        { label: 'Not now', act: 'socTestLater' }]);
    st.evaluation.stage = 'test';
  },

  /** One page of the test. `qi` is the question to show; `prev` the answer
   *  just given to the one before it (-1 on the first page). */
  _societyTestPage(qi, prev) {
    const st = this._societyState();
    const ev = st.evaluation || (st.evaluation = { stage: 'test', answers: [] });
    if (qi > 0 && prev >= 0) ev.answers[qi - 1] = prev;
    if (qi >= PERSONALITY_TEST.length) { this._societyTestScore(); return; }
    const t = PERSONALITY_TEST[qi];
    this._openDialogue(`Assessment — ${qi + 1} of ${PERSONALITY_TEST.length}`, t.q, null,
      t.answers.map((a, i) => ({ label: a.label, act: `socTest|${qi + 1}|${i}` })));
  },

  /** Score it, set the work, and say both. */
  _societyTestScore() {
    const st = this._societyState();
    const ev = st.evaluation;
    let total = 0;
    PERSONALITY_TEST.forEach((t, i) => {
      const a = t.answers[ev.answers[i]];
      total += a ? a.score : 0;
    });
    ev.score = total;
    ev.band = testBand(total);
    const q = this._makeEvaluationQuest(ev.band);
    if (!q) {
      this._openDialogue('The Adventure Society',
        'The clerk searches the files and frowns. "Nothing suitable is posted near here. Come back tomorrow."');
      return;
    }
    ev.stage = 'mission';
    ev.questId = q.id;
    this.player.quests.push(q);
    this._autoTrackQuest(q);
    const cult = CULT_BY_SLUG[q.cult];
    this._openDialogue('The Adventure Society', [
      TEST_REMARKS[ev.band],
      `"There is a cult camped out in the open: ${cult.name}. ${cult.blurb}"`,
      `"Put ${q.need} of them down, then come back to any Society desk. If you do that, `
      + 'you are one of ours, whatever you carry."',
      '[ The camp is marked on your map. ]',
    ].join('\n\n'));
  },

  /** The evaluation's quest: a cult camp in this region, pinned on the map. */
  _makeEvaluationQuest(band) {
    const region = this.currentRegion || REGION_BY_ID.nek;
    if (!region) return null;
    const rankIdx = Math.max(0, RANK_ORDER.indexOf(this.player.rank || 'normal'));
    const base = Math.min(rankIdx, regionDenTier(region));
    const st = this._societyState();
    const n = (st.evalCount = (st.evalCount || 0) + 1);
    const { cult, tier } = evaluationCult(base, band, n + rankIdx);
    const at = this._evaluationCampSite(region, n);
    if (!cult || !at) return null;
    const need = EVAL_NEED[band];
    const clerk = (this._lastTalkNpc && this._lastTalkNpc.name) || null;
    return {
      id: `society|eval|${n}`, kind: 'evaluation', state: 'active', have: 0, need,
      title: `Assessment: ${cult.name}`,
      desc: `The Society wants ${need} of ${cult.name} dead, as proof of what you are.`,
      cult: cult.slug, tier, region: region.id, campX: at.x, campY: at.y,
      band, fromNpc: clerk, reward: 0, star: 0,
    };
  },

  /** Somewhere open, off the roads' towns, in this region. */
  _evaluationCampSite(region, seed = 1) {
    const o = regionOrigin(region);
    const x0 = o.x, y0 = o.y, x1 = o.x + REGION_TILES * TILE, y1 = o.y + REGION_TILES * TILE;
    const towns = allSettlements().filter(s => s.region === region.id)
      .map(s => ({ ...this._settlementCentreWorld(region, s), r: ((s.radius || 20) + 30) * TILE }));
    let h = (seed * 2654435761) >>> 0;
    const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
    for (let i = 0; i < 80; i++) {
      const th = rnd() * Math.PI * 2;
      const d = (70 + rnd() * 90 + i) * TILE;
      const x = this.world.x + Math.cos(th) * d, y = this.world.y + Math.sin(th) * d;
      if (x < x0 + 20 * TILE || y < y0 + 20 * TILE || x > x1 - 20 * TILE || y > y1 - 20 * TILE) continue;
      if (towns.some(t => Math.hypot(t.x - x, t.y - y) < t.r)) continue;
      if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 24)) continue;
      return { x, y };
    }
    return null;
  },

  /** The live evaluation quest, if there is one. */
  _evaluationQuest() {
    return (this.player.quests || []).find(q => q.kind === 'evaluation' && q.state === 'active') || null;
  },

  /** People the camp, when you come near it; move them while they live. */
  _updateEvalCamps(dt) {
    this._flushSocietyNotices();
    const q = this._evaluationQuest();
    if (!q) return;
    this._evalCamps = this._evalCamps || {};
    const dCamp = Math.hypot(this.world.x - q.campX, this.world.y - q.campY);
    if (!this._evalCamps[q.id] && !this._insideRoom && dCamp < EVAL_SPAWN_RANGE * TILE) {
      this._evalCamps[q.id] = { people: this._spawnEvalCamp(q) };
    }
    const camp = this._evalCamps[q.id];
    if (!camp) return;
    for (const c of camp.people) {
      if (!c.alive || !c.sprite) continue;
      const dx = this.world.x - c.x, dy = this.world.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!c.hostile && !this._insideRoom && d < EVAL_NOTICE * TILE) {
        for (const o of camp.people) o.hostile = true;
        const cult = CULT_BY_SLUG[q.cult];
        if (cult && !camp.cried) { camp.cried = true; this._floatText(c.x, c.y - 44, cult.cry, '#ce93d8'); }
      }
      if (!c.hostile || this._insideRoom) continue;
      const far = Math.hypot(c.x - c.homeX, c.y - c.homeY) > EVAL_LEASH * TILE;
      const tx = far ? c.homeX : this.world.x, ty = far ? c.homeY : this.world.y;
      const ddx = tx - c.x, ddy = ty - c.y, dd = Math.hypot(ddx, ddy) || 1;
      if (dd > 26) {
        this._personStep(c, tx, ty, c.speed * dt);   // ROUND 292 -- by a path, see navMixin
        const p = isoProject(c.x, c.y);
        c.sprite.setPosition(p.x, p.y);
        c.sprite.setDepth(isoDepth(c.x, c.y));
        this._npcWalkFrame(c, c.artKey, facingFromMove(ddx, ddy) || 'south', true, dt);
      } else if (!far) {
        this._npcWalkFrame(c, c.artKey, facingFromMove(ddx, ddy) || 'south', false, dt);
        c.swingT = (c.swingT || 0) - dt;
        if (c.swingT <= 0) {
          c.swingT = 1.5;
          this._monsterHitPlayer(this._personFace(c, 'bandit'), c.damage, false);
        }
      }
    }
  },

  /**
   * The camp's people. They live in `_banditFolk` -- the list the swing, the
   * targeting and `_damagePerson` already walk for people -- tagged `campOf`
   * so the bandit AI leaves them to this file.
   */
  _spawnEvalCamp(q) {
    const cult = CULT_BY_SLUG[q.cult];
    if (!cult) return [];
    const left = Math.max(0, (q.need || 0) - (q.have || 0));
    const tier = Math.max(0, Math.min(4, q.tier || 0));
    const hp = [34, 70, 140, 260, 460][tier];
    const dmg = [4, 7, 12, 20, 32][tier];
    const out = [];
    for (let i = 0; i < left; i++) {
      const th = (i / Math.max(1, left)) * Math.PI * 2;
      const r = (2.5 + (i % 3) * 1.5) * TILE;
      let x = q.campX + Math.cos(th) * r, y = q.campY + Math.sin(th) * r;
      if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 12)) { x = q.campX; y = q.campY; }
      const artKey = cultistArtKey(cult.slug, i);
      const key = this.textures.exists(artKey) ? artKey : null;
      const p = isoProject(x, y);
      const sprite = key ? this.add.sprite(p.x, p.y, key, dirRow('south'))
                         : this.add.ellipse(p.x, p.y, 26, 40, 0x6a1b9a);
      const art = key ? NPC_ART[key] : null;
      if (art && sprite.setOrigin) {
        sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
        sprite.setScale(art.scale || 1);
      }
      sprite.setDepth(isoDepth(x, y));
      const c = {
        uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
        campOf: q.id, cult: cult.slug, name: `${cult.name} — initiate`,
        artKey: key, texKey: key, which: i, tier, sprite,
        x, y, homeX: x, homeY: y, hp, maxHp: hp, damage: dmg,
        alive: true, hostile: false, speed: 60 + tier * 6, swingT: 0,
      };
      (this._banditFolk = this._banditFolk || []).push(c);
      out.push(c);
    }
    return out;
  },

  /** One of the camp fell. Counted on the quest, which is what the save keeps. */
  _evalCampKill(c) {
    const q = (this.player.quests || []).find(x => x.id === c.campOf);
    if (!q || q.state !== 'active') return;
    q.have = Math.min(q.need, (q.have || 0) + 1);
    if (q.have >= q.need) {
      this._floatText(this.world.x, this.world.y - 60, 'Assessment complete — report to the Society', '#a5d6a7');
    }
  },

  /** The desk's lines when the Society has something on file. `null` hands
   *  the conversation back to the ordinary ladder. */
  _societyRestrictedLines(who, staff) {
    const st = this._societyState();
    if (st.hunted) {
      return { body: ['"You have some nerve walking in here."',
        'Nobody in the hall will serve you. Several of them are reaching for weapons.'], choices: [] };
    }
    const ev = st.evaluation;
    if (!ev || ev.stage === 'passed') return null;
    if (who !== 'clerk') {
      return { body: [`"Your assessment is with the desk. ${staff.clerk} has your file."`], choices: [] };
    }
    if (ev.stage === 'test') {
      return { body: ['"You still owe us an assessment."'],
        choices: [{ label: 'Sit the assessment', act: 'socTest|0|-1' }] };
    }
    const q = (this.player.quests || []).find(x => x.id === ev.questId);
    if (!q || q.state === 'void') {
      // Lost -- a quest dropped from the log. The work is set again, not waived.
      ev.stage = 'test';
      return { body: ['"We have no record of you finishing the work. We will start again."'],
        choices: [{ label: 'Sit the assessment', act: 'socTest|0|-1' }] };
    }
    if (this._questDone(q)) {
      return { body: ['"Let me see it." The clerk reads the reports from the camp twice.'],
        choices: [{ label: 'Report: the assessment', act: 'socEvalReport' }] };
    }
    return { body: [`"The assessment stands: ${q.desc}"`, `In progress — ${q.have || 0} / ${q.need}.`], choices: [] };
  },

  /** The work is done: on the books, cleared for what you carry. */
  _reportEvaluation() {
    const st = this._societyState();
    const ev = st.evaluation;
    const q = ev && (this.player.quests || []).find(x => x.id === ev.questId);
    if (!q || !this._questDone(q)) return;
    q.state = 'done';
    this.player.quests = this.player.quests.filter(x => x !== q);
    ev.stage = 'passed';
    st.clearedFor = [...new Set([...(st.clearedFor || []), ...restrictedHeld(this.player.slotEssence)])];
    st.suspended = false;
    const wasMember = st.joined;
    if (!wasMember) {
      st.joined = true;
      st.rank = ['normal', 'iron', 'bronze', 'silver', 'gold'].includes(this.player.rank) ? this.player.rank : 'normal';
      st.stars = 1;
      st.done = 0;
      if (!st.everRanks.includes(st.rank)) st.everRanks.push(st.rank);
    }
    this._openDialogue('The Adventure Society', [
      '"That will do." The clerk stamps the file.',
      wasMember ? '"Your membership is restored."' : `"Registered at ${st.rank}. One star. Same as everyone."`,
      '"You will be watched, and you know why. Do not give anyone a reason."',
    ].join('\n\n'));
  },

  /** What the board says when the Society will not take your name. */
  _societyBar() {
    const st = this._societyState();
    if (st.hunted) return { code: 'hunted', why: 'The Society is hunting you. It will not post your name.' };
    if (st.suspended) return { code: 'suspended', why: 'Your membership is suspended until you sit the Society\'s assessment.' };
    return null;
  },
};
