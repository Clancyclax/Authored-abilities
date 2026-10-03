// ============================================================================
// ROUND 189 -- BODIES.
//
//   "2.3) Bodies now need to persist after a monster or NPC is killed
//    2.4) Bodies should be generated from the last frame of the "death"
//         animations
//    2.4.1) The metallic raptor, and Phoenix should cycle the last 2 frames of
//           their death animations
//    2.4.2) Bodies become lootable containers instead of coins, awakening
//           stones, and essences appearing on the ground.
//    2.4.3) The looted materials should show as a text on loot"
//
// A kill used to fade its sprite out in half a second and scatter coins and
// items on the ground. Now the death animation plays where it fell (the
// delivered sheets, recoloured to every shade and variant by
// tools/build_round189_deaths.py), its last frame stays as the body, and
// everything the kill produced is INSIDE the body: one E takes it all, each
// thing named as it comes out.
//
// THE ONE DOOR. `_consumeCorpse` is the only way a body stops being a body --
// a player taking what is in it leaves it lying there, but an ability that
// uses it up (round 189's corpse abilities) goes through that door, and the
// door loots first (2.5.2).
//
// Written as a mixin on WorldScene's prototype because the scene is sixty
// thousand lines and this is one idea; everything here reads the scene's own
// helpers and nothing outside calls in except through the handful of methods
// named in the notes on WorldScene.
// ============================================================================
import Phaser from '../../public/vendor/phaser.esm.min.js';
import { isoProject, isoDepth } from '../data/iso.js';
import { DEATH_ART, monsterDeathKey, npcDeathKey } from '../data/deathArt.js';
import { MONSTER_ART, shadeRow } from '../data/monsterArt.js';
import { COIN_LABELS, COIN_COLORS, grantCoins } from '../data/inventory.js';
import { LOOT_REACH, grantLootToPlayer } from '../data/loot.js';
import { monsterLabelFor } from '../data/quests.js';
import {
  CORPSE_REACH, CORPSE_BLAST_HP_FRAC, CORPSE_BLAST_HP_CAP, CORPSE_MINE_TRIGGER,
  CORPSE_MINE_MAX, CORPSE_MIASMA_RADIUS, CORPSE_DRAIN_MAX, RAISE_DEAD_SECONDS, isCorpseTemplate,
} from '../data/corpseAbilities.js';

/** How many bodies the world keeps. The oldest empty one goes first, then the
 *  oldest of any kind -- a field after a long fight keeps its most recent
 *  dead, which are the ones the player can still be looking at. */
export const CORPSE_MAX = 70;
/** One frame of a death animation, ms. The deliveries run 9 to 17 frames;
 *  at 85ms that is three quarters of a second to a second and a half. */
export const DEATH_FRAME_MS = 85;
/** A looping pair (raptor sparks, phoenix embers) turns over this fast. */
const LOOP_FRAME_MS = 160;
/** Bodies further than this from the camera centre are not drawn. */
const CORPSE_DRAW_RANGE = 1800;

export const CorpseMixin = {
  // ------------------------------------------------------------ the art ----
  /** Queue a death sheet if it is not loaded; true when it is ready now. The
   *  sheets are fetched when first needed (a family's first spawn, a crowd's
   *  first death) rather than at boot: 150 sheets and 15 MB the title screen
   *  has no use for. */
  _ensureDeathTexture(key, file, cell) {
    if (!key) return false;
    if (this.textures.exists(key)) return true;
    this._deathPending = this._deathPending || new Set();
    if (this._deathPending.has(key)) return false;
    this._deathPending.add(key);
    try {
      this.load.spritesheet(key, `./public/assets/death/${file}`, { frameWidth: cell, frameHeight: cell });
      this.load.once(`filecomplete-spritesheet-${key}`, () => {
        this._deathPending.delete(key);
        for (const c of (this.corpses || [])) if (c.texKey === key && !c.sprite) this._drawCorpse(c);
      });
      if (!this.load.isLoading()) this.load.start();
    } catch (e) {
      console.warn('[corpses] could not queue', key, e && e.message);
    }
    return false;
  },

  _ensureMonsterDeathArt(family) {
    const d = DEATH_ART.mon[family];
    if (!d) return false;
    return this._ensureDeathTexture(monsterDeathKey(family), `mon_${family}_death.png`, d.cell);
  },

  /** A living NPC texture's death art: the sheet if one was built for it, a
   *  runtime-painted copy for a crowd variant (`folk_<model>_<n>`, painted with
   *  the same LUT its living sprite was), or the base model's for anything
   *  else painted at runtime. Returns { key, def } or null. */
  _npcDeathArtFor(texKey) {
    if (!texKey) return null;
    if (DEATH_ART.npc[texKey]) {
      const key = npcDeathKey(texKey);
      this._ensureDeathTexture(key, `${texKey}_death.png`, DEATH_ART.npc[texKey].cell);
      return { key, def: DEATH_ART.npc[texKey] };
    }
    const folk = /^folk_(npc_[a-z_]+?)_(\d+)$/.exec(texKey);
    if (folk && DEATH_ART.npc[folk[1]]) {
      const base = this._npcDeathArtFor(folk[1]);
      const painted = this._paintFolkDeath(folk[1], Number(folk[2]));
      return painted ? { key: painted, def: base.def } : base;
    }
    // A walk/run sheet, or a painted bandit: the base stem's death.
    // `<model>~bandit_<crew>` (bandits.js) and `<model>~<cult>` style keys
    // are painted copies of a model: the model's own death is the body.
    const stem = texKey.replace(/~.*$/, '').replace(/_(walk|run|attack|stance)$/, '');
    if (stem && stem !== texKey) return this._npcDeathArtFor(stem);
    return null;
  },

  /** A crowd variant's death, painted with its living sprite's own LUT. */
  _paintFolkDeath(model, variant) {
    const src = npcDeathKey(model);
    const key = `death_folk_${model}_${variant}`;
    if (this.textures.exists(key)) return key;
    if (!this.textures.exists(src) || !this._folkDeathLut) return null;
    try {
      const lut = this._folkDeathLut(model, variant);
      if (!lut) return null;
      const img = this.textures.get(src).getSourceImage();
      const cnv = document.createElement('canvas');
      cnv.width = img.width; cnv.height = img.height;
      const ctx = cnv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      this._applyFolkLutTo(data.data, lut);
      ctx.putImageData(data, 0, 0);
      const cell = DEATH_ART.npc[model].cell;
      this._registerRecoloredSpritesheet(key, cnv, cell, cell);
      return key;
    } catch (e) {
      return null;
    }
  },

  // ------------------------------------------------------- making one -----
  /**
   * A monster's body. `loot` is what the kill produced (coins and drops), or
   * an empty list for a kill the player did not land.
   */
  _corpseFromMonster(m, loot = []) {
    if (!m || !m.sprite) return null;
    const fam = m.type && m.type.family;
    const d = fam && DEATH_ART.mon[fam];
    const art = fam && MONSTER_ART[fam];
    const c = this._newCorpse(m.wx, m.wy, {
      name: m.bossName || (m.key ? monsterLabelFor(m.key) : (m.type && m.type.name)) || 'body', loot, maxHp: m.maxHp || m.hp || 10,
      rank: this._monsterRankIndex ? this._monsterRankIndex(m) : 0, family: fam,
    });
    const scale = Math.abs(m.sprite.scaleX || 1);
    // The living sprite, so a body whose sheet lands late can put it away:
    // other passes (the occlusion fade) keep writing its alpha, so it is
    // hidden rather than faded.
    c.living = m.sprite;
    if (d && art && !m.charArt) {
      c.texKey = monsterDeathKey(fam);
      c.row = Math.max(0, shadeRow(fam, m.type.shade));
      c.frames = d.frames; c.cell = d.cell; c.loopLast = d.loopLast;
      c.origin = [(0.5 * art.cell + d.dx) / d.cell, (0.85 * art.cell + d.dy) / d.cell];
      c.scale = scale;
      c.tint = m.sprite.tintTopLeft !== 0xffffff ? m.sprite.tintTopLeft : null;
      this._ensureMonsterDeathArt(fam);
    } else {
      c.fallback = { key: m.sprite.texture.key, frame: m.sprite.frame.name, scale };
    }
    this._drawCorpse(c);
    return c;
  },

  /**
   * A person's body: a bandit, a cultist, a townsperson in a fallen city.
   * `foot` is the living sprite's foot point in its idle cell, which is where
   * the death frame is registered from.
   */
  _corpseFromPerson(x, y, texKey, { scale = 1, foot = null, loot = [], name = 'body', spoil = null,
    fallbackFrame = null } = {}) {
    const c = this._newCorpse(x, y, { name, loot, maxHp: 30, rank: 0, person: true });
    const art = this._npcDeathArtFor(texKey);
    if (art) {
      const d = art.def;
      const fx = foot ? foot[0] : d.idleCell / 2, fy = foot ? foot[1] : d.idleCell - 1;
      c.texKey = art.key; c.row = 0; c.frames = d.frames; c.cell = d.cell; c.loopLast = 0;
      c.origin = [(fx + d.dx) / d.cell, (fy + d.dy) / d.cell];
      c.scale = scale;
    } else if (texKey && this.textures.exists(texKey)) {
      c.fallback = { key: texKey, frame: fallbackFrame != null ? fallbackFrame : 2, scale };
    }
    c.spoil = spoil;   // 2.6 -- 'burnt' or 'blood', painted on the last frame
    c.startDead = !!spoil;   // a fallen city's dead were dead before you came
    c.fallen = !!spoil;
    this._drawCorpse(c);
    return c;
  },

  _newCorpse(x, y, fields) {
    this.corpses = this.corpses || [];
    const c = { x, y, born: this.time.now, animT: 0, sprite: null, looted: false, consumed: false,
      label: null, ...fields };
    c.looted = !(c.loot && c.loot.length);
    this.corpses.push(c);
    // =====================================================================
    // ROUND 244 -- THE BUDGET ATE THE BODY IT WAS MAKING ROOM FOR.
    //
    // The user: "Bodies stop appearing after a certain point and the player is
    // no longer able to loot creatures."
    //
    // "After a certain point" is the whole diagnosis, and the point is a
    // FALLEN CITY. Its dead are `fallen` -- scenery that must stay -- and both
    // eviction passes below excluded them, correctly. What neither pass
    // excluded was `c`, THE CORPSE THIS FUNCTION JUST PUSHED.
    //
    // So once a player has banked CORPSE_MAX bodies that may not be evicted --
    // which one walk through a fallen city does -- every later kill ran this
    // loop, found no looted non-fallen body, fell to the second pass, and the
    // only non-fallen body in the list was the one created a line earlier. It
    // removed it. Every corpse from then on was destroyed in the same frame it
    // was born, so no body appeared and there was nothing to loot, for the
    // rest of the save.
    //
    // THREE THINGS CHANGE, and the first is the fix:
    //
    //   1. `c` IS NEVER A CANDIDATE. A budget that evicts its own new arrival
    //      is not a budget, it is a refusal, and it cannot be seen from
    //      outside because the list length stays exactly at the cap.
    //   2. OLDEST FIRST. `findIndex` took the first row in the array, which is
    //      insertion order, so it happened to be the oldest -- true by
    //      accident and not stated anywhere. Now it is chosen, which also
    //      means it survives any future reordering of the list.
    //   3. THE FALLEN ARE A LAST RESORT, NOT AN ABSOLUTE. They stay while
    //      anything else can go, which is what round 2.6 wanted; but a list
    //      that is ALL fallen must still yield, or the cap silently stops
    //      being a cap and the display list grows without limit. The one let
    //      go is the furthest from the player -- off-screen scenery nobody is
    //      looking at -- rather than the nearest, which is the body they are
    //      standing over.
    // =====================================================================
    const px = this.world ? this.world.x : 0, py = this.world ? this.world.y : 0;
    const evictable = (k) => k !== c && k !== this.nearCorpse;
    const oldest = (pred) => {
      let best = -1, bestBorn = Infinity;
      for (let i = 0; i < this.corpses.length; i++) {
        const k = this.corpses[i];
        if (!evictable(k) || !pred(k)) continue;
        const born = k.born ?? 0;
        if (born < bestBorn) { bestBorn = born; best = i; }
      }
      return best;
    };
    const furthestFallen = () => {
      let best = -1, bestD = -1;
      for (let i = 0; i < this.corpses.length; i++) {
        const k = this.corpses[i];
        if (!evictable(k) || !k.fallen) continue;
        const d = Math.hypot((k.x || 0) - px, (k.y || 0) - py);
        if (d > bestD) { bestD = d; best = i; }
      }
      return best;
    };
    let guard = this.corpses.length + 2;   // a loop that cannot spin
    while (this.corpses.length > CORPSE_MAX && guard-- > 0) {
      let i = oldest(k => k.looted && !k.fallen);
      if (i < 0) i = oldest(k => !k.fallen);
      if (i < 0) i = furthestFallen();
      if (i < 0) break;                     // only `c` and nearCorpse remain
      this._removeCorpse(this.corpses[i]);
    }
    return c;
  },

  _drawCorpse(c) {
    if (c.sprite || c.consumed) return;
    const p = isoProject(c.x, c.y);
    if (c.texKey) {
      if (!this.textures.exists(c.texKey)) return;   // drawn when it lands
      const f0 = c.row * c.frames;
      // A body that arrives late (its sheet was still loading) is already
      // dead: it goes straight to the last frame rather than dying twice.
      const late = c.startDead || this.time.now - c.born > 400;
      c.step = late ? c.frames - 1 : 0;
      c.sprite = this.add.sprite(p.x, p.y, c.texKey, f0 + c.step);
      c.sprite.setOrigin(c.origin[0], c.origin[1]);
      c.sprite.setScale(c.scale);
      if (c.tint) c.sprite.setTint(c.tint);
      if (c.spoil && late) this._spoilCorpse(c);
      if (c.living && c.living.active) c.living.setVisible(false);
      c.living = null;
    } else if (c.fallback) {
      // No death art for this one: its own standing frame, laid on its side
      // and dimmed. Every kill leaves a body; this is the honest version for
      // the few the delivery did not cover.
      c.sprite = this.add.sprite(p.x, p.y, c.fallback.key, c.fallback.frame);
      c.sprite.setOrigin(0.5, 0.6);
      c.sprite.setScale(c.fallback.scale);
      c.sprite.setAngle(80);
      c.sprite.setTint(0x8a8078);
      c.step = 0; c.frames = 1;
    } else {
      return;
    }
    c.sprite.setDepth(isoDepth(c.x, c.y) - 6);
  },

  /** 2.6 -- the fallen city's dead: burnt black, or lying in blood. Painted
   *  once per texture and frame on a canvas, from the body's own last frame. */
  _spoilCorpse(c) {
    if (!c.sprite || !c.spoil || c.spoiled) return;
    const frame = c.row * c.frames + c.frames - 1;
    const key = `${c.texKey}#${c.spoil}#${frame}`;
    if (!this.textures.exists(key)) {
      try {
        const tex = this.textures.get(c.texKey);
        const fr = tex.get(frame);
        const src = tex.getSourceImage();
        const cnv = document.createElement('canvas');
        cnv.width = fr.width; cnv.height = fr.height;
        const g = cnv.getContext('2d', { willReadFrequently: true });
        g.drawImage(src, fr.cutX, fr.cutY, fr.width, fr.height, 0, 0, fr.width, fr.height);
        const img = g.getImageData(0, 0, fr.width, fr.height);
        const px = img.data;
        let seed = frame * 7919 + (c.spoil === 'burnt' ? 13 : 29);
        const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 40) continue;
          const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
          if (c.spoil === 'burnt') {
            // Charred: the colour burned out of it, a little warmth left in
            // the darks, and the odd ember still glowing.
            const v = 18 + lum * 70;
            px[i] = v * 1.15; px[i + 1] = v * 0.95; px[i + 2] = v * 0.85;
            if (rnd() < 0.012) { px[i] = 255; px[i + 1] = 120 + rnd() * 60; px[i + 2] = 20; }
          } else {
            // Blood: soaked from the ground up, darker where it pooled.
            const y = Math.floor(i / 4 / fr.width) / fr.height;
            const soak = Math.min(1, Math.max(0, (y - 0.35) * 1.6)) * (0.55 + rnd() * 0.35);
            px[i] = px[i] * (1 - soak) + 128 * soak;
            px[i + 1] = px[i + 1] * (1 - soak) + 10 * soak;
            px[i + 2] = px[i + 2] * (1 - soak) + 14 * soak;
          }
        }
        g.putImageData(img, 0, 0);
        this.textures.addCanvas(key, cnv);
      } catch (e) {
        return;
      }
    }
    // A pool under the bloody ones, drawn below the body.
    if (c.spoil === 'blood' && !c.pool) {
      const p = isoProject(c.x, c.y);
      c.pool = this.add.ellipse(p.x, p.y + 2, 46 * c.scale, 20 * c.scale, 0x5a0a0e, 0.75);
      c.pool.setDepth(isoDepth(c.x, c.y) - 8);
    }
    const o = [c.sprite.originX, c.sprite.originY];
    c.sprite.setTexture(key);
    c.sprite.setOrigin(o[0], o[1]);
    c.spoiled = true;
  },

  _removeCorpse(c) {
    if (c.sprite) { c.sprite.destroy(); c.sprite = null; }
    if (c.pool) { c.pool.destroy(); c.pool = null; }
    if (c.cloud) { c.cloud.destroy(); c.cloud = null; }
    if (c.label) { c.label.destroy(); c.label = null; }
    c.consumed = true;
    const i = (this.corpses || []).indexOf(c);
    if (i >= 0) this.corpses.splice(i, 1);
    if (this.nearCorpse === c) this.nearCorpse = null;
  },

  // ------------------------------------------------------------ each tick ---
  _updateCorpses(dt) {
    const list = this.corpses;
    if (!list || !list.length) return;
    const ms = dt * 1000;
    const cam = this.cameras.main;
    const view = cam.worldView;
    const cx = view.centerX, cy = view.centerY;
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      // Drawn only near the camera. The display list budget is round 43's
      // and bodies are exactly the thing that grows without a ceiling in a
      // long fight. A body whose sheet has not landed has no sprite yet but
      // is still a body: it can be primed, rot and be looted all the same.
      let on = false;
      if (c.sprite) {
        on = Math.abs(c.sprite.x - cx) < CORPSE_DRAW_RANGE && Math.abs(c.sprite.y - cy) < CORPSE_DRAW_RANGE;
        if (c.sprite.visible !== on) c.sprite.setVisible(on);
        if (c.pool && c.pool.visible !== on) c.pool.setVisible(on);
      }
      // The animation, from elapsed time.
      if (c.sprite && c.frames > 1) {
        c.animT += ms;
        if (c.step < c.frames - 1) {
          const s = Math.min(c.frames - 1, Math.floor(c.animT / DEATH_FRAME_MS));
          if (s !== c.step) {
            c.step = s;
            c.sprite.setFrame(c.row * c.frames + s);
            if (s === c.frames - 1) { c.loopStart = c.animT; if (c.spoil) this._spoilCorpse(c); }
          }
        } else if (c.loopLast >= 2 && on) {
          const k = Math.floor((c.animT - (c.loopStart || 0)) / LOOP_FRAME_MS) % c.loopLast;
          const f = c.row * c.frames + (c.frames - c.loopLast) + k;
          if (c.sprite.frame.name !== f) c.sprite.setFrame(f);
        }
      }
      // A primed body waits for company.
      if (c.mine) {
        c.mine.t -= dt;
        const near = (this.monsters || []).some(m => m.alive
          && Math.hypot(m.wx - c.x, m.wy - c.y) <= CORPSE_MINE_TRIGGER + (m.type.radius || 0));
        if (near) { this._burstCorpse(c, c.mine); continue; }
        if (c.mine.t <= 0) { c.mine = null; if (c.sprite) c.sprite.clearTint(); }
      }
      // A rotting body poisons its cloud.
      if (c.miasma) {
        c.miasma.t -= dt;
        c.miasma.tickT -= dt;
        if (c.miasma.tickT <= 0) {
          c.miasma.tickT = 1;
          for (const m of (this.monsters || [])) {
            if (!m.alive) continue;
            if (Math.hypot(m.wx - c.x, m.wy - c.y) <= c.miasma.radius + (m.type.radius || 0)) {
              this._applyDot(m, c.miasma.dot);
            }
          }
        }
        if (c.cloud) c.cloud.setAlpha(0.18 + 0.1 * Math.sin(this.time.now / 300));
        if (c.miasma.t <= 0) this._removeCorpse(c);
      }
    }
  },

  // ------------------------------------------------------------- looting ---
  _updateCorpseProximity() {
    let best = null, bestD = LOOT_REACH + 18;
    for (const c of (this.corpses || [])) {
      if (c.looted || c.consumed) continue;
      const d = Math.hypot(this.world.x - c.x, this.world.y - c.y);
      if (d <= bestD) { bestD = d; best = c; }
    }
    if (this.nearCorpse && this.nearCorpse !== best && this.nearCorpse.label) {
      this.nearCorpse.label.destroy(); this.nearCorpse.label = null;
    }
    this.nearCorpse = best;
    if (best && !best.label) {
      const p = isoProject(best.x, best.y);
      best.label = this.add.text(p.x, p.y - 36, `${best.name} (${best.loot.length})`, {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#e0d6c2',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5, 1).setDepth(isoDepth(best.x, best.y) + 60000);
    }
  },

  /** A thing a body holds, as the words the float text says. */
  _corpseItemText(it) {
    if (it.kind === 'coins') return { text: `+${it.amount} ${COIN_LABELS[it.rank] || 'coin'}${it.amount === 1 ? '' : 's'}`, color: COIN_COLORS[it.rank] || '#ffd54f' };
    return { text: `+${it.label || it.kind}`, color: it.color || '#ffffff' };
  },

  /**
   * Everything out of the body, into the bag, each thing named above the
   * player as it comes (2.4.3). A thing the bag refuses stays in the body --
   * the same rule floor loot has, so a full bag never eats an item.
   */
  _lootCorpse(c, offset = 0) {
    if (!c || c.looted) return 0;
    const kept = [];
    let n = 0;
    for (const it of c.loot) {
      let ok;
      if (it.kind === 'coins') { grantCoins(this.player.coins, it.rank || 'normal', it.amount); ok = true; }
      else ok = grantLootToPlayer(this.player, it);
      if (!ok) { kept.push(it); continue; }
      const t = this._corpseItemText(it);
      // One line each, stacked, so a body with five things in it reads as
      // five things rather than one smear of text.
      this._floatText(this.world.x, this.world.y - 40 - (n + offset) * 16, t.text, t.color);
      n++;
    }
    c.loot = kept;
    c.looted = kept.length === 0;
    if (c.label) { c.label.destroy(); c.label = null; }
    if (n && this._inventoryOpen) this._renderInventory();
    if (kept.length) this._floatText(this.world.x, this.world.y - 60, 'Bag full', '#ef9a9a');
    return n;
  },

  /**
   * ROUND 190 (updates 1, 1.1, 11) -- E ON A BODY.
   *
   * "looting should loot every corpse in range of your aura at once" -- the
   * reach is your widest aura's radius (a body's own pick-up radius when you
   * have none), and every body in it with anything left is emptied. "When
   * corpses are looted they should disappear into rainbow smoke" -- each body
   * emptied goes up in a puff and is gone. The first time, you and Prism say
   * what everyone is thinking about the smell.
   */
  _lootCorpsesAround(first) {
    const auras = (this.player.passiveMods && this.player.passiveMods.auras) || [];
    let reach = 0;
    for (const a of auras) reach = Math.max(reach, this._auraRadius ? this._auraRadius(a) : (a.auraRadius || 0));
    const list = reach > 0
      ? this._corpsesNear(this.world.x, this.world.y, reach).filter(c => !c.fallen)
      : [];
    if (first && !list.includes(first)) list.unshift(first);
    let n = 0, gone = 0;
    for (const c of list) {
      n += this._lootCorpse(c, n);
      if (c.looted && !c.fallen) { this._rainbowSmoke(c.x, c.y); this._removeCorpse(c); gone++; }
    }
    if (gone && !this.player.corpseSmellSaid) {
      this.player.corpseSmellSaid = true;
      if (this._sayOverhead) {
        this._sayOverhead(this.world, 'Oh, that is foul. That is so much worse than it looked.', '#fff5e6', 4.2);
        const prism = this._prism && this._prism();
        if (prism && prism.recruited) {
          this.time.delayedCall(900, () => this._sayOverhead(prism,
            'Rainbows should not SMELL like that. Who decided rainbows could smell like that?', '#f8bbd0', 4.6));
        }
      }
    }
    return n;
  },

  /** A puff of colour where a body was: a dozen motes cycling the spectrum,
   *  rising and thinning out over a second. */
  _rainbowSmoke(wx, wy) {
    if (!this.add || !isoProject) return;
    const base = isoProject(wx, wy);
    for (let i = 0; i < 14; i++) {
      const hue = (i / 14) * 360;
      const col = Phaser.Display.Color.HSLToColor(hue / 360, 0.85, 0.62).color;
      const r = 5 + Math.random() * 7;
      const puff = this.add.circle(base.x + (Math.random() - 0.5) * 34, base.y - 8 - Math.random() * 14, r, col, 0.75);
      puff.setDepth(isoDepth(wx, wy) + 20);
      this.tweens.add({
        targets: puff,
        y: puff.y - 40 - Math.random() * 30,
        x: puff.x + (Math.random() - 0.5) * 30,
        scale: 1.8 + Math.random(),
        alpha: 0,
        duration: 900 + Math.random() * 500,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  },

  /** THE ONE DOOR out of being a body (2.5.2): loots, then removes. */
  _consumeCorpse(c) {
    if (!c || c.consumed) return;
    if (!c.looted) this._lootCorpse(c);
    this._removeCorpse(c);
  },

  /** Unconsumed bodies within `r` of a point, nearest first. */
  _corpsesNear(x, y, r) {
    return (this.corpses || [])
      .filter(c => !c.consumed && !c.mine && !c.miasma && Math.hypot(c.x - x, c.y - y) <= r)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  },

  // ------------------------------------------------------------- abilities ---
  /** Is there a body for this ability to use? Asked before the cost is paid,
   *  the way round 105's execute condition is, so a corpse ability with no
   *  corpse in reach says so and spends nothing. */
  _corpseAbilityReady(a) {
    if (!isCorpseTemplate(a.template)) return true;
    const reach = (a.range || CORPSE_REACH) * (this._reachMult ? this._reachMult() : 1);
    if (this._corpsesNear(this.world.x, this.world.y, reach).length) return true;
    this._floatText(this.world.x, this.world.y - 40, `${a.name} — no body in reach`, '#90a4ae');
    return false;
  },

  _castCorpseAbility(a) {
    const reach = (a.range || CORPSE_REACH) * (this._reachMult ? this._reachMult() : 1);
    const bodies = this._corpsesNear(this.world.x, this.world.y, reach);
    if (!bodies.length) return;
    const el = this._specElement ? this._specElement(a) : null;
    const dmgMult = (this.player.passiveMods && this.player.passiveMods.dmgMult) || 1;
    if (a.template === 'corpseBlast') {
      this._burstCorpse(bodies[0], { base: a.base, radius: a.explodeRadius, el, color: a.color, dmgMult, hpBonus: true });
    } else if (a.template === 'corpseMine') {
      for (const c of bodies.slice(0, CORPSE_MINE_MAX)) {
        if (!c.looted) this._lootCorpse(c);
        c.mine = { t: a.mineSeconds || 30, base: a.base, radius: a.explodeRadius, el, color: a.color, dmgMult };
        if (c.sprite) c.sprite.setTint(Phaser.Display.Color.HexStringToColor(a.color || '#b0bec5').color);
      }
      this._floatText(this.world.x, this.world.y - 44, `${a.name} ×${Math.min(bodies.length, CORPSE_MINE_MAX)}`, a.color);
    } else if (a.template === 'corpseMiasma') {
      const c = bodies[0];
      if (!c.looted) this._lootCorpse(c);
      const radius = a.explodeRadius || CORPSE_MIASMA_RADIUS;
      c.miasma = { t: a.miasmaSeconds || 8, tickT: 0, radius, dot: a.dot };
      const p = isoProject(c.x, c.y);
      const col = Phaser.Display.Color.HexStringToColor(a.color || '#9ccc65').color;
      c.cloud = this.add.ellipse(p.x, p.y, radius * 2, radius, col, 0.22);
      c.cloud.setDepth(isoDepth(c.x, c.y) - 4);
      this._floatText(c.x, c.y - 40, a.name, a.color);
    } else if (a.template === 'corpseDrain') {
      const res = a.resource === 'mana' ? 'mana' : a.resource === 'stamina' ? 'stamina' : 'hp';
      const maxKey = res === 'hp' ? 'maxHp' : res === 'mana' ? 'maxMana' : 'maxStamina';
      const used = bodies.slice(0, CORPSE_DRAIN_MAX);
      const before = this.player[res];
      this.player[res] = Math.min(this.player[maxKey], before + this.player[maxKey] * (a.drainFrac || 0.07) * used.length);
      for (const c of used) {
        this._drainLineFx(c, a.color);
        this._consumeCorpse(c);
      }
      const got = Math.round(this.player[res] - before);
      this._floatText(this.world.x, this.world.y - 50, `+${got} ${res === 'hp' ? 'health' : res}`, a.color);
    } else if (a.template === 'raiseDead') {
      const c = bodies[0];
      const rec = this._spawnSummon({ ...a, template: 'activeSummon', summonKind: 'creature',
        summonFamily: 'skeleton', summonTemporary: true, summonDuration: RAISE_DEAD_SECONDS,
        summonMoves: true, summonDmg: a.base, summonRange: 60 });
      if (rec) {
        rec.wx = c.x; rec.wy = c.y;
        const p = isoProject(c.x, c.y);
        if (rec.sprite) { rec.sprite.setPosition(p.x, p.y); rec.sprite.setDepth(isoDepth(c.x, c.y) + 4); }
        rec.raised = true;
      }
      this._consumeCorpse(c);
    }
  },

  /** A body bursting, from an ability or a primed body going off. */
  _burstCorpse(c, spec) {
    const x = c.x, y = c.y;
    let dmg = (spec.base || 6) * (spec.dmgMult || 1);
    if (spec.hpBonus) dmg += Math.min((spec.base || 6) * CORPSE_BLAST_HP_CAP, (c.maxHp || 0) * CORPSE_BLAST_HP_FRAC);
    dmg = Math.max(1, Math.round(dmg));
    for (const m of (this.monsters || [])) {
      if (!m.alive) continue;
      if (Math.hypot(m.wx - x, m.wy - y) <= (spec.radius || 115) + (m.type.radius || 0)) {
        this._damageMonster(m, dmg, true, false, spec.el || null);
      }
    }
    if (this._spawnRingFx) this._spawnRingFx(x, y, spec.radius || 115, spec.color || '#c62828');
    this._consumeCorpse(c);
  },

  _drainLineFx(c, color) {
    const a = isoProject(c.x, c.y), b = isoProject(this.world.x, this.world.y);
    const g = this.add.graphics();
    g.lineStyle(3, Phaser.Display.Color.HexStringToColor(color || '#c62828').color, 0.85);
    g.lineBetween(a.x, a.y - 10, b.x, b.y - 20);
    g.setDepth(isoDepth(this.world.x, this.world.y) + 50000);
    this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
  },
};
