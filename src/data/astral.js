import { ACT_ORDER } from './acts.js';
import { REGION_TILES } from './regions.js';
// ============================================================================
// ROUND 88 -- THE ASTRAL PORTALS, AND WHAT IS ON THE OTHER SIDE.
//
// The user's ask, verbatim:
//
//   "Astral portals should be placed hidden in each region which take the
//    player to a very different environment maybe 1/3 the size of a region
//    map. This should often be the location of a cult, rare monsters and
//    nodes, and/or quest objectives."
//
// HOW YOU FIND ONE, and this is the answer that made the feature worth
// building rather than a fifth kind of landmark: AURA SENSE.
//
// Round 85 built `auraSenseTiles(rankIdx)` -- at Iron you feel living things
// ten tiles out through walls and dark, further at every rank above. It has
// been a combat convenience since the day it shipped. A portal that is
// invisible until your aura sense reaches it turns that number into a reason
// to rank up: the world does not get easier as you climb, it gets LARGER, and
// a Gold-rank character walking ground they cleared at Iron finds something
// that was there the whole time. Nothing else in the build rewards perception
// with content.
//
// So a portal is not marked, not on the map, and not mentioned by anybody. It
// is a thin place that you feel before you see.
//
// ONE PER REGION, four in the world, each a genuinely different environment --
// not a recoloured cave. The Nek's is a drowned shore under a dead sky;
// Ontaria's is an orchard that grew through the wrong side of something;
// Elehyd's is the inside of a storm; Bratugal's is the ash of a city that the
// astral kept after the world let it go.
//
// WHAT IS IN THEM, in the user's own order: a cult, rare monsters, nodes.
// `cultists.js` has held ten authored cults since round 78 and been imported
// by nothing -- the Society's third-star contracts (society.js) use five of
// them, and these use four more. Between the two features every cult in the
// file is finally somewhere.
// ============================================================================

import { CULT_BY_SLUG } from './cultists.js';
// ROUND 90 -- the node tier band. Imported rather than restated: the realms
// sit one rung above their region and there must be exactly one place that
// says so, or the two copies drift and the realm quietly stops being worth
// walking into.
import { realmStockTiers, NODES_PER_REALM, STOCK_FAMILIES } from './crafting.js';

/**
 * How big a realm is.
 *
 * The ask was "maybe 1/3 the size of a region map". A region is 1024 tiles a
 * side, so a third is 341, and 341 x 341 x 4 realms is 465,000 tiles of world
 * to reserve and paint. Two things bound it below that:
 *
 *   - The interior band is 128 rows and 44 of them are spare, so ANY realm
 *     needs the band grown; the growth also widens the world map's frame,
 *     which is why `_drawFlatMap` had to be pointed at WORLD_TILES.
 *   - A realm is stamped tile by tile. Doing four of them at world build would
 *     add over a million writes to a build round 43 already asserts should
 *     take about a second and which is currently taking three and a half.
 *
 * 224 is what those two allow: 22% of a region a side, four of them in a
 * 448x448 block, and each one STAMPED ON ENTRY rather than at build, so the
 * cost is paid by the player who walks through the portal and by nobody else.
 * It is smaller than the ask and it is not a room -- 50,176 tiles is twenty-
 * eight times the sewer, which takes eight to twelve minutes to walk.
 */
export const REALM_TILES = 224;

/** Rows to add to the interior band to hold them, two by two, with margin. */
export const ASTRAL_BAND_TILES = 480;

// ===========================================================================
// ROUND 92 -- A FIFTH REALM, AND IT IS NOT A REGION'S.
//
//   "at a different portion of the maze lead to an astral space. During the
//    prologue the player has no way to sense it but if they go back later they
//    will find a full iron/bronze rank astral space where the cult that summon
//    you is hiding out. This is where the player can find out about exactly
//    what the cult was up to when they accidentally summoned the player as an
//    outworlder."
//
// The other four hang off a region and are found by walking near a portal.
// This one hangs off the SEWER: the rift is a mark on the prologue's map and
// it opens off a dead end the player almost certainly walked past on the way
// out, which is the whole trick -- a place that was there the first time and
// could not be reached, rather than a place added afterwards.
//
// IT FITS THE EXISTING BAND, at no cost to the world's size. The realms are
// laid out two by two in a 480-row band and a fifth would have meant a third
// ROW (694 rows needed, 480 available) and therefore a bigger map, a bigger
// minimap cache and a migration for every save. Laid three ACROSS instead, the
// fifth is the second row's first slot: 462 rows needed, 480 available, and
// the band is 2656 tiles wide so there is room for eleven columns before width
// is a question. Nothing outside interiors.js changes.
export const REALM_IDS = ['astral_nek', 'astral_ontaria', 'astral_elehyd', 'astral_bratugal',
  'astral_undercity'];

/**
 * The four realms.
 *
 * `ground` / `accent` are the two tile ids the terrain is painted from and
 * `voidFrac` is how much of the realm is nothing at all -- the astral is not
 * a continuous surface, and a realm you can walk across in a straight line is
 * a field with a strange sky. `pools` is a COUNT of standing-water discs, not
 * a fraction -- named for what it is, after the first draft called it `water`
 * and made it look like a percentage it was never going to reach.
 *
 * `cult` is a slug from cultists.js. `families` is the rare quarry, and it is
 * deliberately drawn from the top of the roster: the reason to come here is
 * that the things in here are not in the region outside.
 */
export const REALMS = {
  astral_nek: {
    id: 'astral_nek', region: 'nek',
    name: 'The Drowned Shore',
    blurb: 'A tide that came in a very long time ago and was never told to leave.',
    enterLabel: 'step through',
    floor: 'ice',
    voidFrac: 0.42, pools: 7,
    cult: 'deep',
    // ROUND 173 -- AND THESE NAMES NOW MEAN SOMETHING.
    //
    // `wraith`, `drake` and `revenant` were never families in
    // MONSTER_FAMILY_BASE. `_buildRealmContents` asks `denMonsterKeys` for
    // them, finds nothing at family level, and falls through to EVERY KEY AT
    // THE TIER -- so the astral realms have been drawing generic tier-matched
    // monsters this whole time while declaring a quarry they never spawned.
    // Silent, because the fallback is the same shape as a hit.
    //
    // The eight new families are exactly the right sort of thing to be out
    // there: a drifting serpent, a hooded caster and a machine belong in an
    // astral space more than a boar does.
    families: ['spiritSerpent', 'slime', 'spider'],
    nodes: ['Fibre', 'Wood'],
    // What Knowledge says the first time. One line, because the point of the
    // place is that nobody explains it.
    firstLine: 'You are not in The Nek. Do not look for the sun; it is not that kind of sky.',
  },
  astral_ontaria: {
    id: 'astral_ontaria', region: 'ontaria',
    name: 'The Wrong Orchard',
    blurb: 'Rows, and a harvest, and the rows go the wrong way when you are not looking at them.',
    enterLabel: 'step through',
    floor: 'forge',
    voidFrac: 0.30, pools: 4,
    cult: 'blight',
    families: ['boar', 'spider', 'quillFiend'],
    nodes: ['Wood', 'Fibre'],
    firstLine: 'Somebody planted this. That is the part worth being frightened of.',
  },
  astral_elehyd: {
    id: 'astral_elehyd', region: 'elehyd',
    name: 'The Standing Storm',
    blurb: 'Weather that stopped. You are inside the part that would have been lightning.',
    enterLabel: 'step through',
    floor: 'ice',
    voidFrac: 0.52, pools: 2,
    cult: 'storm',
    // ROUND 173 -- `saberCanis` was here and IS NOT A FAMILY. It is retired
    // (no art was ever sent for it, see the note at the top of monsters.js),
    // so `denMonsterKeys` matched nothing, fell through its second fallback,
    // and filled a storm realm with whatever happened to sit at the tier --
    // the identical fault this round found in `wraith`/`drake`/`revenant` and
    // fixed, reintroduced by the fix. The probe now asks every realm.
    families: ['steelRaptor', 'spiritSerpent', 'bat'],
    nodes: ['Metal'],
    firstLine: 'It has been about to break for four hundred years. Try not to be the thing that finishes it.',
  },
  astral_bratugal: {
    id: 'astral_bratugal', region: 'bratugal',
    name: 'The Kept City',
    blurb: 'Streets, doorways, a square with a well in it, and no reason for any of it to be here.',
    enterLabel: 'step through',
    floor: 'marble',
    voidFrac: 0.36, pools: 2,
    cult: 'ash',
    families: ['harbinger', 'spiritSerpent', 'shellborn'],
    nodes: ['Metal', 'Wood'],
    firstLine: 'The world let this go. Something else did not. Walk carefully; it is still somebody\'s.',
  },
  // ROUND 92 -- WHERE THE UNMADE WENT.
  //
  // Sereth Vane's cult, and Sereth Vane's account of what happened: they had
  // "a hand on something that eats worlds and we were pulling it through", and
  // it reached back down the thread and took everyone in the circle except
  // him. What it left in the circle instead was the player.
  //
  // So this is the rest of that sentence. The ones who were not in the room
  // are still here, still working, and they know precisely what came through
  // the hole they made, because they have been looking at the same problem for
  // however long the player has been away.
  //
  // `region: 'nek'` is true -- it is under Cadence -- and `hidden` is what
  // keeps it out of the region-portal table, which is keyed by region and
  // would otherwise have two entries fighting over 'nek'. It is not reached by
  // a portal in a field; it is reached by a rift in the prologue's own maze.
  astral_undercity: {
    id: 'astral_undercity', region: 'nek', hidden: true,
    name: 'The Correction',
    blurb: 'The room the ritual was really in. The sewer was only where it touched.',
    enterLabel: 'step through',
    floor: 'forge',
    // Tighter and more solid than the region realms. This is a place somebody
    // has been living in and working in, not a drowned shore -- and the fight
    // the player came for is the camp, so the walk to it should be short.
    voidFrac: 0.34, pools: 1,
    cult: 'void',
    families: ['spiritSerpent', 'harbinger', 'sixArmApe'],
    nodes: ['Metal', 'Fibre'],
    firstLine: 'Ah. So that is where the rest of them went.',
    // ROUND 92 -- WHAT THE CULT WAS ACTUALLY DOING.
    //
    //   "This is where the player can find out about exactly what the cult was
    //    up to when they accidentally summoned the player as an outworlder."
    //
    // Sereth Vane's account in the sewer is what a man at the bottom of a hole
    // believes: they had hold of something that eats worlds, it took everyone
    // but him, and the player was left in the circle. He is not lying and he
    // is not right -- he was the far end of the rope and could not see the
    // near end.
    //
    // The hierophant is the near end. Three pages, in the shape the sewer
    // cultist's reveal already uses (`_sewerCultistSpeaks` and its
    // `sewerCultist|n` acts), because there is no reason for a second
    // conversation machine and every reason for the two revelations to feel
    // like halves of one thing.
    //
    // THE ANSWER, so a later round does not have to reconstruct it: an
    // outworlder is not a thing you can summon. What The Unmade did was open a
    // hole and reach through it, and something on the other side used the hole
    // in the direction it was already open. The player is not a prize, a
    // weapon or a mistake in the ritual -- they are what came the other way
    // while the door was held. Which is worse for the cult than being wrong
    // would have been, and is why this camp is still working.
    leaderName: 'Hierophant Iselde Marrow',
    reveal: [
      'Stop there. You are the one who came out of the circle.\n\n'
        + 'No — do not tell me your name. I have spent a season not knowing it '
        + 'and I would like to see whether I can finish.',
      'We did not summon you. I want that said plainly, because I imagine '
        + 'somebody down in the wet told you we did.\n\n'
        + 'What we opened was a DOOR. One door, held for as long as thirteen '
        + 'people could hold it, onto something enormous that we had every '
        + 'intention of pulling through it and no intention whatsoever of '
        + 'letting go. That is what a correction costs. We knew.',
      'And while we were holding it open — pulling, all of us, in one '
        + 'direction — something used it in the OTHER.\n\n'
        + 'It came the wrong way down our own rope, took every hand off it but '
        + 'Sereth\'s, and put you in the circle where the thing we wanted '
        + 'should have been standing.\n\n'
        + 'So no. We did not summon you, and that is the part that keeps me '
        + 'here. Somebody did. I would very much like to know who, and I am '
        + 'not going to find out with you standing in my camp.',
    ],
  },
};

export const REALM_LIST = REALM_IDS.map(id => REALMS[id]);
/** The region-portal table. `hidden` realms are excluded BY NAME rather than
 *  by position: the undercity's region is genuinely 'nek', and without the
 *  filter it and The Drowned Shore would fight over that key and whichever was
 *  declared last would win the region's portal. */
/**
 * ROUND 179 -- THE THREE ACT REGIONS WITH NO ASTRAL REALM YET.
 *
 * The user folded Sirukh Sands, the Cinderwaste and Ixcuatl into the acts, and
 * widening `astralFaults` from the old hardcoded four to ACT_ORDER promptly
 * reported all three. It is right to report them: a region the player spends a
 * whole act in with no way into the astral is a gap, not a design.
 *
 * Authoring three realms -- contents, cult, stock tiers, nodes -- is more than
 * the round that found it could carry, so the gap is DECLARED. The check
 * asserts this list in both directions, which is what stops a declared gap
 * becoming a permanent one: the day Sirukh gets a realm, the suite fails until
 * somebody deletes the name.
 */
export const ASTRAL_PENDING_REGIONS = ['sirukh', 'cinder', 'ixcuatl'];

export const REALM_BY_REGION = Object.fromEntries(
  REALM_LIST.filter(r => !r.hidden).map(r => [r.region, r]));

/**
 * HOW CLOSE YOU HAVE TO BE. The portal is revealed when the player's aura
 * sense reaches it, so the discovery radius IS `auraSenseTiles(rank)` -- not a
 * number of its own. That is the whole design: it is not "a hidden thing with
 * a reveal radius", it is "a thing you can only perceive with a sense you earn".
 *
 * A Normal-rank character has no aura sense at all (AURA_SENSE_TILES[0] is 0),
 * so the portals are strictly Iron-and-up content and a new player cannot
 * stumble into a realm full of revenants. That falls out of the rank table
 * rather than being gated separately, which is the point.
 */
export const PORTAL_REVEAL_BONUS_TILES = 4;

export function portalRevealTiles(auraTiles) {
  return auraTiles > 0 ? auraTiles + PORTAL_REVEAL_BONUS_TILES : 0;
}

// ---------------------------------------------------------------------------
// Deterministic RNG, local for the same reason caveShapes.js keeps one.
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = hash(seed) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/**
 * Where a region's portal stands, in region-local tiles.
 *
 * Seeded off the region id, so it is in the same place in every run of every
 * save -- a thin place is a property of the world, not of the visit. Kept away
 * from the region's own middle (where the settlements are) and off the very
 * edge (where the region boundary lives), because a portal you trip over on
 * the road is not hidden and one in the corner is not findable.
 */
export function portalTileFor(regionId) {
  const r = rng(`astral|${regionId}`);
  const band = 0.18 + r() * 0.24;          // 18%-42% of the way out from centre
  const a = r() * Math.PI * 2;
  // ROUND 144 -- REGION_TILES, not the 1024 it was when this was written.
  //
  // The world doubled this round, and a portal placed against a hard-coded
  // half-width would have sat in the north-west QUARTER of every region -- on
  // the road in some of them and nowhere near the "18%-42% of the way out from
  // centre" this function's own comment promises. Nothing would have errored;
  // the portals would simply have been in the wrong place for ever.
  const half = REGION_TILES / 2;
  return {
    tx: Math.round(half + Math.cos(a) * half * (0.42 + band)),
    ty: Math.round(half + Math.sin(a) * half * (0.42 + band)),
  };
}

/**
 * The realm's terrain, as a grid. 1 = ground, 2 = water, 0 = the astral void.
 *
 * Islands rather than a landscape: discs of ground scattered on nothing, with
 * causeways joining them, then everything unreachable from the arrival point
 * removed -- the same rule caveShapes.js keeps, and for the same reason. An
 * island you can see and cannot reach is worse than no island.
 */
export function buildRealmGrid(realmId) {
  const spec = REALMS[realmId];
  if (!spec) return null;
  const N = REALM_TILES;
  const g = new Uint8Array(N * N);
  const r = rng(`realm|${realmId}`);
  const at = (x, y) => y * N + x;
  const disc = (cx, cy, rad, v) => {
    for (let y = Math.max(1, Math.floor(cy - rad)); y <= Math.min(N - 2, Math.ceil(cy + rad)); y++) {
      for (let x = Math.max(1, Math.floor(cx - rad)); x <= Math.min(N - 2, Math.ceil(cx + rad)); x++) {
        const dx = x - cx, dy = (y - cy) * 1.2;
        if (dx * dx + dy * dy <= rad * rad) g[at(x, y)] = v;
      }
    }
  };
  const link = (x0, y0, x1, y1, w) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w, 1);
    }
  };
  // The arrival island, always at the south edge, always solid: you have to
  // land on something.
  const entry = { x: Math.floor(N / 2), y: N - 18 };
  disc(entry.x, entry.y, 12, 1);
  // A ring of major islands, sized to leave roughly `voidFrac` of the realm
  // empty, plus a scatter of small ones.
  const want = Math.round(N * N * (1 - spec.voidFrac));
  const centres = [[entry.x, entry.y]];
  let guard = 0;
  const count = () => { let n = 0; for (let i = 0; i < g.length; i++) if (g[i]) n++; return n; };
  while (count() < want && guard++ < 400) {
    const cx = 14 + r() * (N - 28), cy = 10 + r() * (N - 26);
    const rad = 8 + r() * 22;
    disc(cx, cy, rad, 1);
    // Join it to the nearest island already placed, so the realm is one place.
    let best = centres[0], bd = Infinity;
    for (const c of centres) {
      const d = Math.hypot(c[0] - cx, c[1] - cy);
      if (d < bd) { bd = d; best = c; }
    }
    link(best[0], best[1], cx, cy, 2.4 + r() * 1.6);
    centres.push([cx, cy]);
  }
  // Water, on the ground, where the realm asks for it.
  const pools = spec.pools || 0;
  for (let i = 0; i < pools; i++) {
    const c = centres[Math.floor(r() * centres.length)];
    disc(c[0] + (r() - 0.5) * 16, c[1] + (r() - 0.5) * 16, 3 + r() * 5, 2);
  }
  // Reachability from the arrival island. Water is not walkable, so it is not
  // a bridge -- a causeway cut by a pool is a causeway that does not join.
  const seen = new Uint8Array(N * N);
  const stack = [at(entry.x, entry.y)];
  seen[stack[0]] = 1;
  while (stack.length) {
    const k = stack.pop();
    const x = k % N, y = (k - x) / N;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= N - 1 || ny >= N - 1) continue;
      const nk = at(nx, ny);
      if (seen[nk] || g[nk] !== 1) continue;
      seen[nk] = 1; stack.push(nk);
    }
  }
  for (let i = 0; i < g.length; i++) if (g[i] === 1 && !seen[i]) g[i] = 0;
  // A pool sitting on ground that got pruned is a pool in the void.
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== 2) continue;
    const x = i % N, y = (i - x) / N;
    let touches = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = at(Math.max(0, Math.min(N - 1, x + dx)), Math.max(0, Math.min(N - 1, y + dy)));
      if (seen[k]) { touches = true; break; }
    }
    if (!touches) g[i] = 0;
  }
  return { grid: g, entry, size: N };
}

const REALM_CACHE = new Map();
export function realmGrid(realmId) {
  let v = REALM_CACHE.get(realmId);
  if (!v) { v = buildRealmGrid(realmId); REALM_CACHE.set(realmId, v); }
  return v;
}

// ===========================================================================
// ROUND 90 -- WHAT LIVES IN A REALM.
//
// Round 88 built the ground and left it empty: four realms of terrain with a
// cult slug, a family list and a node list written down and nothing standing
// on any of it. This is the other half.
//
// THE THREAT RULING, verbatim: "3, mostly but with a few solo monsters of the
// next rank up wandering around." Option 3 was "the same rank as the region
// outside, but denser" -- so a realm is not a difficulty spike, it is a
// PRESSURE spike. You are not outclassed; you are outnumbered, and the thing
// you cannot fight is walking around somewhere on the same island.
//
// That distinction is what makes a realm a place rather than a boss room. A
// player who is ready for the region is ready for the realm right up until
// they meet the wanderer, and then the question is whether they can leave --
// which is a far better question than "can I win this fight".
//
// Bratugal is the exception that proves the rule: gold is the ceiling
// everywhere ("no region is actually diamond rank and no monsters should be
// diamond rank"), so The Kept City's wanderers are gold like its packs and
// are drawn instead from the hardest families it has. A rank above gold would
// be the one piece of diamond content in the build.
// ===========================================================================

/** The pack tier a realm fights at, matched to its region, and the tier its
 *  lone wanderers fight at. Never past 4. */
export const REALM_TIERS = {
  astral_nek:      { pack: 1, solo: 2 },
  astral_ontaria:  { pack: 2, solo: 3 },
  astral_elehyd:   { pack: 3, solo: 4 },
  astral_bratugal: { pack: 4, solo: 4 },
  // ROUND 92 -- "a full iron/bronze rank astral space". Iron packs, bronze
  // wanderers: a real step up from a prologue fought at normal rank with
  // whatever was on the floor, and reachable by the time a player has any
  // reason to go back down.
  astral_undercity: { pack: 1, solo: 2 },
};

/**
 * ROUND 92 -- the realm the sewer's rift opens onto.
 *
 * Declared here rather than in sewer.js because astral.js is the file that
 * knows what a realm id means, and sewer.js already imports nothing but
 * cultists.js. `astralFaults` asserts that every hidden realm is this one, so
 * a fifth realm added without a way in is a fault rather than a surprise.
 */
export const HIDDEN_REALM_FROM_SEWER = 'astral_undercity';

/** How much denser a realm is than the region outside. The region places packs
 *  across a million tiles; a realm is a fiftieth of that area and carries this
 *  many packs, which works out at roughly three times the region's density. */
export const REALM_PACKS = 16;
export const REALM_PACK_SIZE = [3, 8];
/** "A few solo monsters of the next rank up." Four is a few: enough that you
 *  will meet one, few enough that meeting one is an event. */
export const REALM_SOLOS = 4;
/** The camp. Twelve and a leader -- a cult that has had somewhere safe to
 *  stand for a long time, which is what an astral realm is for them. */
export const REALM_CAMP_SIZE = 12;
export const CAMP_RADIUS_TILES = 9;

/**
 * Everything that stands in a realm, placed on ground the generator already
 * proved reachable.
 *
 * Returns `{ camp, packs, solos, nodes }` in REALM-LOCAL tiles, deterministic
 * from the realm id -- so a realm has the same camp in the same place in every
 * run of every save, exactly as its terrain does. A thin place is a property
 * of the world, not of the visit.
 *
 * EVERY POINT IS TAKEN FROM THE REACHABLE SET, never from the grid at large.
 * That is the promise `astralFaults` checks, and it is the same promise round
 * 88 made about the terrain itself: a camp you can see across a gap you cannot
 * cross is worse than no camp.
 */
export function realmContents(realmId) {
  const spec = REALMS[realmId];
  const r0 = realmGrid(realmId);
  if (!spec || !r0) return null;
  const N = r0.size;
  const g = r0.grid;
  const entry = r0.entry;

  // The reachable ground, as a list. `buildRealmGrid` already pruned anything
  // unreachable to void, so ground IS reachable -- but this is read off the
  // grid rather than assumed, because "already pruned" is exactly the kind of
  // claim that stops being true when somebody edits the generator.
  const open = [];
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== 1) continue;
    const x = i % N, y = (i - x) / N;
    open.push([x, y]);
  }
  if (!open.length) return { camp: null, packs: [], solos: [], nodes: [] };

  const r = rng(`contents|${realmId}`);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const taken = [];
  /** A ground tile at least `apart` from everything already placed and at
   *  least `fromEntry` from where the player lands. Falls back to any open
   *  tile rather than returning nothing -- an empty realm is worse than a
   *  crowded one. */
  const pick = (apart, fromEntry) => {
    for (let t = 0; t < 260; t++) {
      const p = open[Math.floor(r() * open.length)];
      if (dist(p, [entry.x, entry.y]) < fromEntry) continue;
      if (taken.some(q => dist(p, q) < apart)) continue;
      taken.push(p);
      return { tx: p[0], ty: p[1] };
    }
    const p = open[Math.floor(r() * open.length)];
    taken.push(p);
    return { tx: p[0], ty: p[1] };
  };

  const tiers = REALM_TIERS[realmId] || { pack: 1, solo: 2 };
  const fam = spec.families;

  // --- THE CULT CAMP ------------------------------------------------------
  // Placed FIRST and furthest from the arrival island, because it is the thing
  // the realm is for: the cult came here to be somewhere nobody walks past.
  // Its members are scattered inside a radius rather than laid out on a grid;
  // a camp that reads as a formation reads as a spawner.
  const seat = pick(0, Math.floor(N * 0.42));
  const camp = {
    cult: spec.cult,
    tx: seat.tx, ty: seat.ty,
    radius: CAMP_RADIUS_TILES,
    tier: tiers.pack,
    members: [],
  };
  for (let i = 0; i < REALM_CAMP_SIZE; i++) {
    // Rejection-sampled onto ground: a cultist standing in the void is the
    // exact fault this function exists to not have.
    let placed = null;
    for (let t = 0; t < 60 && !placed; t++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * CAMP_RADIUS_TILES;
      const x = Math.round(seat.tx + Math.cos(a) * rad);
      const y = Math.round(seat.ty + Math.sin(a) * rad);
      if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1) continue;
      if (g[y * N + x] !== 1) continue;
      placed = { tx: x, ty: y };
    }
    camp.members.push(placed || { tx: seat.tx, ty: seat.ty });
  }
  // The leader stands at the seat itself, one tier above their followers --
  // which is the same shape the world's own dens use and the reason a camp is
  // a fight rather than a queue.
  camp.leader = { tx: seat.tx, ty: seat.ty, tier: Math.min(4, tiers.pack + 1) };

  // --- THE PACKS ----------------------------------------------------------
  const packs = [];
  for (let i = 0; i < REALM_PACKS; i++) {
    const at = pick(11, 22);
    const [lo, hi] = REALM_PACK_SIZE;
    packs.push({
      tx: at.tx, ty: at.ty,
      // ONE SPECIES REPEATED, which is the world's own rule for a pack
      // (regions.js: "a group is one SPECIES repeated") rather than a second
      // rule invented here.
      family: fam[Math.floor(r() * fam.length)],
      tier: tiers.pack,
      size: lo + Math.floor(r() * (hi - lo + 1)),
    });
  }

  // --- THE WANDERERS ------------------------------------------------------
  const solos = [];
  for (let i = 0; i < REALM_SOLOS; i++) {
    const at = pick(26, 34);
    solos.push({
      tx: at.tx, ty: at.ty,
      // The hardest family the realm has, for the ones that outrank the packs.
      family: fam[i % fam.length],
      tier: tiers.solo,
      size: 1, roams: true,
    });
  }

  // --- THE NODES ----------------------------------------------------------
  // The realm's own `nodes` list names STOCK FAMILIES ('Metal', 'Wood',
  // 'Fibre') and the tiers come from crafting.js -- one rung above the region
  // outside, which is the whole material reason to come here. The tier band is
  // imported rather than restated: two copies of a gate is one gate and one
  // lie waiting to happen.
  const nodes = [];
  const tierBand = realmStockTiers(spec.region);
  for (let i = 0; i < NODES_PER_REALM; i++) {
    const at = pick(9, 14);
    const family = String(spec.nodes[i % spec.nodes.length]).toLowerCase();
    nodes.push({
      tx: at.tx, ty: at.ty,
      family,
      tier: tierBand[i % tierBand.length],
    });
  }

  return { camp, packs, solos, nodes };
}

const CONTENTS_CACHE = new Map();
export function realmContentsFor(realmId) {
  let v = CONTENTS_CACHE.get(realmId);
  if (!v) { v = realmContents(realmId); CONTENTS_CACHE.set(realmId, v); }
  return v;
}

export function realmCensus() {
  const out = {};
  for (const id of REALM_IDS) {
    const r = realmGrid(id);
    let ground = 0, water = 0;
    for (let i = 0; i < r.grid.length; i++) { if (r.grid[i] === 1) ground++; else if (r.grid[i] === 2) water++; }
    out[id] = { ground, water, voidPct: Math.round(100 * (1 - (ground + water) / r.grid.length)) };
  }
  return out;
}

/**
 * The fault check.
 *
 * The promises here are the ones that are invisible from reading the table:
 * that every realm is one connected place, that the arrival point is solid
 * ground, that each names a real cult, that no two share one, and that a
 * realm is actually a realm rather than a field with a few holes in it.
 */
export function astralFaults() {
  const out = [];
  const cults = [];
  for (const id of REALM_IDS) {
    const spec = REALMS[id];
    if (!spec) { out.push(`${id} has no spec`); continue; }
    for (const f of ['name', 'blurb', 'region', 'cult', 'firstLine', 'floor']) {
      if (!spec[f]) out.push(`${id} has no ${f}`);
    }
    if (spec.cult && !CULT_BY_SLUG[spec.cult]) out.push(`${id} names unknown cult ${spec.cult}`);
    if (spec.cult) cults.push(spec.cult);
    if (!(spec.families || []).length) out.push(`${id} has no rare quarry`);
    if (!(spec.nodes || []).length) out.push(`${id} has no harvest nodes`);
    const r = realmGrid(id);
    if (!r) { out.push(`${id} generates nothing`); continue; }
    const N = r.size;
    if (r.grid[r.entry.y * N + r.entry.x] !== 1) out.push(`${id}: you arrive in the void`);
    let ground = 0;
    for (let i = 0; i < r.grid.length; i++) if (r.grid[i] === 1) ground++;
    const frac = ground / r.grid.length;
    if (frac < 0.18) out.push(`${id} is ${Math.round(frac * 100)}% ground -- too little to walk`);
    if (frac > 0.85) out.push(`${id} is ${Math.round(frac * 100)}% ground -- that is a field, not the astral`);
    // Connectivity, asserted rather than assumed: the generator prunes, so a
    // failure here means the prune itself is wrong.
    const seen = new Uint8Array(N * N);
    const stack = [r.entry.y * N + r.entry.x];
    seen[stack[0]] = 1;
    let reach = 0;
    while (stack.length) {
      const k = stack.pop(); reach++;
      const x = k % N, y = (k - x) / N;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const nk = ny * N + nx;
        if (seen[nk] || r.grid[nk] !== 1) continue;
        seen[nk] = 1; stack.push(nk);
      }
    }
    if (reach !== ground) out.push(`${id}: ${ground - reach} ground tiles are islands you cannot reach`);
  }
  if (new Set(cults).size !== cults.length) out.push('two realms are held by the same cult');
  // One PORTAL per region, and every region has one.
  //
  // ROUND 92 -- scoped to the realms a portal actually opens onto. The
  // undercity's region is genuinely 'nek' (it is under Cadence) and it is
  // reached from the sewer rather than from a portal in a field, so counting
  // it here would report a collision that is not one. The `hidden` flag is the
  // same thing REALM_BY_REGION filters on, so the check and the table cannot
  // disagree about which realms are a region's.
  const portalRealms = REALM_LIST.filter(r => !r.hidden);
  const regions = portalRealms.map(r => r.region);
  if (new Set(regions).size !== regions.length) out.push('two realms open off the same region');
  // ROUND 179 -- the four this asked about were the old spine. The question
  // it is really asking is "does every region the player spends an act in have
  // a way into the astral", and that is ACT_ORDER. Sirukh Sands, the
  // Cinderwaste and Ixcuatl are acts now; if they have no portal, that is a
  // finding rather than something this check should be blind to.
  // ...and the three the user's seven-act ordering brought in do not have one
  // yet. That is a REAL GAP and it is named rather than papered over: the
  // check asserts BOTH directions, so every region outside this list must have
  // a portal, and every region IN it must still be missing one. Author a realm
  // for Sirukh Sands and this fails until the name comes out of the list,
  // which is the only way a known gap closes rather than being forgotten.
  for (const rg of ACT_ORDER) {
    const pending = ASTRAL_PENDING_REGIONS.includes(rg);
    if (!REALM_BY_REGION[rg] && !pending) out.push(`${rg} has no astral portal`);
    if (REALM_BY_REGION[rg] && pending) {
      out.push(`${rg} has a portal now -- take it out of ASTRAL_PENDING_REGIONS`);
    }
  }
  // ...and a hidden realm has to be reachable by SOMETHING. It has no portal
  // by definition, so the only thing that can open it is a named way in; the
  // sewer's rift is that, and this asserts the two agree on the id. Without
  // this a typo in either file is a realm that is generated, populated and
  // unreachable, which nothing else here would notice.
  for (const r of REALM_LIST.filter(x => x.hidden)) {
    if (r.id !== HIDDEN_REALM_FROM_SEWER) {
      out.push(`${r.id} is hidden and nothing opens it`);
    }
  }
  // The reveal has to be earned. A Normal-rank character must not be able to
  // find one, or the gating is a lie.
  if (portalRevealTiles(0) !== 0) out.push('a rankless character can find a portal');
  if (portalRevealTiles(10) <= 10) out.push('aura sense does not extend to portals');

  // ---- ROUND 90: what stands in them -------------------------------------
  //
  // The promise is the same one round 88 made about the ground and it is the
  // only one worth checking here: EVERYTHING STANDS ON REACHABLE GROUND. A
  // cult camp across a gap you cannot cross is worse than no cult camp, and it
  // is invisible to every amount of reading -- the placement code looks
  // correct either way.
  for (const id of REALM_IDS) {
    const spec = REALMS[id];
    const r = realmGrid(id);
    const c = realmContentsFor(id);
    if (!c) { out.push(`${id} has no contents`); continue; }
    const N = r.size;
    const onGround = (p) => p && r.grid[p.ty * N + p.tx] === 1;
    if (!c.camp) out.push(`${id} has no cult camp`);
    else {
      if (c.camp.cult !== spec.cult) out.push(`${id}'s camp is held by ${c.camp.cult}, not ${spec.cult}`);
      if (!onGround(c.camp)) out.push(`${id}'s camp seat is in the void`);
      if (!onGround(c.camp.leader)) out.push(`${id}'s cult leader is in the void`);
      if (c.camp.members.length !== REALM_CAMP_SIZE) {
        out.push(`${id}'s camp has ${c.camp.members.length} cultists, expected ${REALM_CAMP_SIZE}`);
      }
      const drowned = c.camp.members.filter(m => !onGround(m)).length;
      if (drowned) out.push(`${id}: ${drowned} cultists stand in the void`);
      // The camp is what the realm is FOR, so it is not next to the door.
      const d = Math.hypot(c.camp.tx - r.entry.x, c.camp.ty - r.entry.y);
      if (d < N * 0.25) out.push(`${id}'s camp is ${Math.round(d)} tiles from the arrival point`);
    }
    if (c.packs.length !== REALM_PACKS) out.push(`${id} has ${c.packs.length} packs, expected ${REALM_PACKS}`);
    if (c.solos.length !== REALM_SOLOS) out.push(`${id} has ${c.solos.length} wanderers, expected ${REALM_SOLOS}`);
    if (c.nodes.length !== NODES_PER_REALM) out.push(`${id} has ${c.nodes.length} nodes, expected ${NODES_PER_REALM}`);
    for (const [what, list] of [['pack', c.packs], ['wanderer', c.solos], ['node', c.nodes]]) {
      const off = list.filter(p => !onGround(p)).length;
      if (off) out.push(`${id}: ${off} ${what}s stand in the void`);
    }
    // THE THREAT RULING. Packs at the region's own rank, a few solos one rung
    // above, and never past gold -- "no monsters should be diamond rank".
    const t = REALM_TIERS[id];
    if (!t) { out.push(`${id} has no tier band`); continue; }
    if (c.packs.some(p => p.tier !== t.pack)) out.push(`${id}'s packs are not at its own rank`);
    if (t.solo < t.pack) out.push(`${id}'s wanderers are weaker than its packs`);
    for (const p of [...c.packs, ...c.solos]) {
      if (p.tier > 4) out.push(`${id} spawns a diamond-rank monster`);
      if (!spec.families.includes(p.family)) out.push(`${id} spawns a ${p.family}, which is not its quarry`);
    }
    if (c.camp.leader.tier > 4) out.push(`${id}'s cult leader is diamond rank`);
    // Denser than the region, which is the whole ruling: option 3 was "the same
    // rank as the region but denser". A realm with fewer monsters than a
    // comparable stretch of region is not option 3, it is a quiet field.
    const mobs = c.packs.reduce((n, p) => n + p.size, 0);
    if (mobs < 40) out.push(`${id} holds ${mobs} pack monsters -- not denser than the region`);
    // Nodes: real families, and a tier the region outside cannot offer.
    const band = realmStockTiers(spec.region);
    for (const n of c.nodes) {
      if (!STOCK_FAMILIES.includes(n.family)) out.push(`${id} has a ${n.family} node, which is not a stock family`);
      if (!band.includes(n.tier)) out.push(`${id}'s node tier ${n.tier} is not in its band ${band}`);
      if (n.tier > 4) out.push(`${id} has a diamond-rank node`);
    }
    // Every family the realm declares must actually be used by something, or
    // it is a line in a table that never reaches the ground.
    const used = new Set([...c.packs, ...c.solos].map(p => p.family));
    for (const f of spec.families) if (!used.has(f)) out.push(`${id} declares ${f} and spawns none`);
    const nodeFams = new Set(c.nodes.map(n => n.family));
    for (const f of spec.nodes) {
      if (!nodeFams.has(String(f).toLowerCase())) out.push(`${id} declares ${f} nodes and places none`);
    }
    // Deterministic: the same realm twice is the same realm.
    const again = realmContents(id);
    if (JSON.stringify(again.camp) !== JSON.stringify(c.camp)) {
      out.push(`${id}'s camp moves between visits`);
    }
  }
  return out;
}
