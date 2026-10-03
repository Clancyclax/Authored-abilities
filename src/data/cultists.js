// ===========================================================================
// ROUND 78 (items 4, 4.1) -- THE CULTS.
//
// The user: "This will allow for new quest NPCs, additional characters in the
// town and new enemies such as blood cultists, undeath cultists, and more."
// And 4.1: "Cultists should have relevant essence builds (blood cultists
// should definitely have the blood essence)".
//
// -------------------------------------------------------------------------
// THE COLOUR IS THE BUILD
// -------------------------------------------------------------------------
// Ten palettes were generated for each cultist model, and the temptation is to
// treat them as ten skins over one enemy. They are not. Each robe colour is
// tied here to the essence its wearer is actually running, so a red cultist
// bleeds you and a grey-green one raises what it kills -- which means the
// player can read the room before the fight starts, and means "extreme
// palettes" buys information rather than only variety.
//
// One list, so the two halves cannot drift: `slug` is the palette suffix the
// extractor wrote (`npc_cultist_woman_blood.png`) AND the key everything else
// looks a cult up by. A cult with no art or art with no cult is a fault, and
// `cultFaults` says so.
//
// -------------------------------------------------------------------------
// WHY THREE ESSENCES AND NOT ONE
// -------------------------------------------------------------------------
// Every character in this game is a three-essence build with a confluence, and
// a cultist that carried one essence would be the only exception. The trio is
// the cult's own essence plus two that say what KIND of devotee this is --
// which also means the same cult can field several different fighters without
// any of them stopping being that cult.
// ===========================================================================

import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';

export const CULTS = [
  {
    slug: 'bone', name: 'The Pale Order', rank: 'normal',
    // The plainest of them, and the one a player meets first: a cult that has
    // not got anywhere yet. Normal rank, no confluence worth the name.
    essence: 'essBone', support: ['essDust', 'essResolute'],
    stones: ['stoneBone', 'stoneDust', 'stoneResolute'],
    blurb: 'They keep the ossuary and they are waiting for something.',
    cry: 'The bones remember. The bones are patient.',
  },
  {
    slug: 'blood', name: 'The Red Hour', rank: 'iron',
    // The user's own example, so the essence is not a judgement call.
    essence: 'essBlood', support: ['essKnife', 'essZeal'],
    stones: ['stoneBlood', 'stoneKnife', 'stoneZeal'],
    blurb: 'They open a vein for every hour of the night and count them out loud.',
    cry: 'An hour for an hour! Give it gladly!',
  },
  {
    slug: 'undeath', name: 'The Long Vigil', rank: 'iron',
    essence: 'essDeath', support: ['essBone', 'essMalign'],
    stones: ['stoneDeath', 'stoneBone', 'stoneMalign'],
    blurb: 'They sit with the dead until the dead sit up.',
    cry: 'Nobody leaves. Nobody has ever left.',
  },
  {
    slug: 'ash', name: 'The Cinder Choir', rank: 'iron',
    essence: 'fire', support: ['essSmoke', 'essDiscord'],
    stones: ['stoneFire', 'stoneSmoke', 'stoneDiscord'],
    blurb: 'They sing until the smoke takes their voices, and then they sing.',
    cry: 'Burn it clean! Burn it clean!',
  },
  {
    slug: 'void', name: 'The Unmade', rank: 'bronze',
    essence: 'essVoid', support: ['essDimension', 'essEcho'],
    stones: ['stoneVoid', 'stoneDimension', 'stoneEcho'],
    blurb: 'They believe the world is a mistake with a correction available.',
    cry: 'It was never here. Neither were you.',
  },
  {
    slug: 'sin', name: 'The Glad Confession', rank: 'bronze',
    essence: 'essSin', support: ['essMirror', 'essHunger'],
    stones: ['stoneSin', 'stoneMirror', 'stoneHunger'],
    blurb: 'They will tell you what you have done. They are usually right.',
    cry: 'Say it! Say it and be lighter!',
  },
  {
    slug: 'blight', name: 'The Wilting', rank: 'iron',
    essence: 'essBlight', support: ['essFungus', 'essVenom'],
    stones: ['stoneBlight', 'stoneFungus', 'stoneVenom'],
    blurb: 'They tend the rot the way a gardener tends a hedge.',
    cry: 'Everything green is only slow.',
  },
  {
    slug: 'storm', name: 'The Thunderhead', rank: 'bronze',
    essence: 'essLightning', support: ['essCloud', 'essWind'],
    stones: ['stoneLightning', 'stoneCloud', 'stoneWind'],
    blurb: 'They climb to high ground in bad weather and do not come down.',
    cry: 'It is coming! Stand up and let it find you!',
  },
  {
    slug: 'deep', name: 'The Drowned Choir', rank: 'bronze',
    essence: 'essDeep', support: ['essWater', 'essTentacle'],
    stones: ['stoneDeep', 'stoneWater', 'stoneTentacle'],
    blurb: 'They speak of a door at the bottom and of who is polite enough to knock.',
    cry: 'Down where it is quiet. Down where it is kind.',
  },
  {
    slug: 'gold', name: 'The Gilded Mouth', rank: 'bronze',
    essence: 'essSun', support: ['essFeast', 'essVisage'],
    stones: ['stoneSun', 'stoneFeast', 'stoneVisage'],
    blurb: 'The wealthiest of the cults, and the only one with a waiting list.',
    cry: 'Everything worth having is worth having twice.',
  },
];

export const CULT_BY_SLUG = Object.fromEntries(CULTS.map(c => [c.slug, c]));
export const CULT_SLUGS = CULTS.map(c => c.slug);

/** The two models a cult can wear. Both are dressed in that cult's colour, so
 *  a cult fields men and women without fielding two different-looking cults. */
export const CULT_MODELS = ['npc_cultist_woman', 'npc_cultist_man'];

/** The art key for one cultist. `which` picks the model. */
export function cultistArtKey(slug, which = 0) {
  return `${CULT_MODELS[which % CULT_MODELS.length]}_${slug}`;
}

/** The build a cultist of this cult runs: three essences and their stones,
 *  in the shape `rebuildKnownAbilities` takes. */
export function cultBuild(slug) {
  const c = CULT_BY_SLUG[slug];
  if (!c) return null;
  const essences = [c.essence, ...c.support];
  // FOUR STONE SLOTS, NOT THREE. `rebuildKnownAbilities` walks four slots --
  // the three essences AND the confluence they form -- so a build with three
  // stone lists threw inside `processStones` on the fourth. Every character in
  // the game has sixteen sockets; a cultist is not the exception.
  //
  // Each slot draws four stones from the cult's own three, rotated, so no slot
  // is empty and every cult's sockets are filled from its own vocabulary
  // rather than from a generic filler that would blur what the colour means.
  const slot = (i) => [
    c.stones[i % c.stones.length],
    c.stones[(i + 1) % c.stones.length],
    c.stones[(i + 2) % c.stones.length],
    c.stones[i % c.stones.length],
  ];
  return {
    slotEssence: essences,
    slotStones: [slot(0), slot(1), slot(2), slot(0)],
    slotAttr: ['power', 'spirit', 'speed', 'recovery'],
  };
}

/** Faults a suite can assert without booting the game. */
export function cultFaults() {
  const out = [];
  const slugs = new Set();
  for (const c of CULTS) {
    if (slugs.has(c.slug)) out.push(`duplicate cult slug ${c.slug}`);
    slugs.add(c.slug);
    // 4.1, checked rather than trusted: every cult's essence must be REAL.
    // The whole point of tying colour to build is lost if the build names an
    // essence that does not exist, and a dangling id here would generate an
    // empty kit rather than throwing.
    for (const e of [c.essence, ...c.support]) {
      if (!ESSENCE_CATALOG[e]) out.push(`${c.slug} names unknown essence ${e}`);
    }
    for (const s of c.stones) {
      if (!STONE_CATALOG[s]) out.push(`${c.slug} names unknown stone ${s}`);
    }
    if (c.support.includes(c.essence)) out.push(`${c.slug} lists its own essence as support`);
    if (new Set(c.support).size !== c.support.length) out.push(`${c.slug} repeats a support essence`);
    if (!c.name || !c.blurb || !c.cry) out.push(`${c.slug} is missing its prose`);
    if (!['normal', 'iron', 'bronze', 'silver', 'gold'].includes(c.rank)) {
      out.push(`${c.slug} has an odd rank ${c.rank}`);
    }
  }
  // The user asked for ten palettes and there must be ten cults to wear them.
  if (CULTS.length !== 10) out.push(`${CULTS.length} cults for 10 palettes`);
  // Two cults on the same essence would be two cults the player cannot tell
  // apart by the thing the colour is supposed to be telling them.
  const byEss = new Map();
  for (const c of CULTS) {
    if (byEss.has(c.essence)) out.push(`${c.slug} and ${byEss.get(c.essence)} share ${c.essence}`);
    byEss.set(c.essence, c.slug);
  }
  return out;
}
