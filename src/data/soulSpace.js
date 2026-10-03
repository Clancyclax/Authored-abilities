// ============================================================================
// ROUND 130 -- THE SOUL SPACE. SILVER AND GOLD ARE FULL SCREEN.
//
// The user, when the garden was first asked for:
//
//   "silver 1 being a transition to a soul space where you now have a seperate
//    map to explore that is your 3 esseece fields growing from 1 set of 9 rows
//    to 9 sets of 9 rows, with any summons from your abilities wandering
//    around and with dialogue talking about their place in the astral and
//    finally gold where instead of flowers you now have forests and flowers,
//    with meandering paths. Summons still wandering around."
//
// and, this round:
//
//   "Then start on Silver and Gold which are full screen. The player should be
//    able to interact in this screen with their followers but no companions
//    should be visible. Clicking to meditate again should snap you back to the
//    player and stop the meditation animation."
//
// ---------------------------------------------------------------------------
// WHY THIS IS A ROOM AND NOT A PANEL
// ---------------------------------------------------------------------------
//
// Up to Bronze the garden is a window over the player's head, because up to
// Bronze it is something you LOOK at. At Silver it becomes somewhere you ARE,
// and the game already knows how to do that: the astral realms are rooms in
// their own tile band, stamped on entry, that the player is teleported into and
// walks around with ordinary movement and ordinary collision. A soul space
// built any other way would be a second implementation of interiors.
//
// So this file describes a ROOM GRID, in exactly the shape `realmGrid` returns
// for an astral realm, and everything downstream -- floor stamping, collision,
// viewport culling, the camera -- is the machinery that was already there.
//
// ---------------------------------------------------------------------------
// SIZE
// ---------------------------------------------------------------------------
//
// 64 tiles a side, not the realms' 224. A realm is a place you go on an
// expedition; this is a place you sit down inside for as long as a meditation
// lasts, and 224 tiles is eight to twelve minutes of walking (astral.js says
// so). Sixty-four is about forty seconds corner to corner, which is a garden
// you can cross rather than a wilderness you can get lost in.
// ============================================================================

import { RANK_ORDER } from './ranks.js';

/** Tiles a side. See the note above -- deliberately far smaller than a realm. */
// ROUND 130, SECOND PASS -- 44, not 64. Screenshotted at 64: the player
// arrives twenty-four tiles from the nearest plot, walks across an acre of
// empty marble to reach it, and the space reads as a car park with some
// gardening at the far end. A soul should be somewhere you arrive already
// inside. Forty-four puts the first field four tiles from where you land.
export const SOUL_TILES = 44;

/** Which value means what in the grid `soulGrid()` returns. Matches the
 *  astral realms' own encoding so `tileAt` can be the same three lines. */
export const SOUL_VOID = 0;    // outside the soul: wall
export const SOUL_GROUND = 1;  // the path between the plots -- earth
export const SOUL_BED = 2;     // a planted field -- grass, walkable, sown over

/** The four plots, in slot order, as tile rectangles inside the grid.
 *
 *  LAID OUT AROUND A CENTRAL PATH rather than in a row. The player walks in at
 *  the south and the plots open to either side, so every one of them is
 *  somewhere you arrive at instead of something you file past -- and the
 *  confluence, which is the fourth, sits at the head of the space where the
 *  path ends, because it is what the other three add up to.
 */
export const SOUL_PLOTS = [
  { slot: 0, x: 4,  y: 22, w: 14, h: 12 },   // near left -- four tiles in
  { slot: 1, x: 26, y: 22, w: 14, h: 12 },   // near right
  { slot: 2, x: 4,  y: 6,  w: 14, h: 12 },   // far left
  { slot: 3, x: 24, y: 4,  w: 16, h: 14 },   // the confluence, at the head
];

/** How far apart the clumps of planting stand, in tiles.
 *
 *  A GRID, NOT A SCATTER. The first cut placed sixteen clumps at random
 *  positions inside each plot and the result read as weeds on waste ground --
 *  a field is a field because it is PLANTED, in rows, and the eye reads
 *  regularity as cultivation. Three tiles is dense enough that the clumps
 *  touch at the scale they are drawn. */
export const SOUL_CLUMP_STEP = 3;

/** Every planting position in a plot, in tile coordinates. Pure, so the same
 *  soul is planted the same way every time somebody sits down in it. */
export function soulPlantingFor(plot) {
  const out = [];
  for (let y = plot.y + 1; y < plot.y + plot.h - 1; y += SOUL_CLUMP_STEP) {
    for (let x = plot.x + 1; x < plot.x + plot.w - 1; x += SOUL_CLUMP_STEP) {
      out.push({ x, y });
    }
  }
  return out;
}

/** Where the player lands. South edge, on the path, facing up the space. */
export const SOUL_ENTRY = { x: 22, y: 38 };

/**
 * The grid, built once and cached. Pure: the same soul space every time, which
 * is what lets a player learn their way around it.
 *
 * A BORDER OF VOID, a walkable interior, and the four plots marked. The plots
 * are WALKABLE -- you can stand in your own fields; they are a different tile
 * only so the scene knows where to plant.
 */
let CACHE = null;
export function soulGrid() {
  if (CACHE) return CACHE;
  const size = SOUL_TILES;
  const grid = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Two tiles of wall all the way round, so the edge reads as an edge
      // rather than as the map running out.
      const wall = x < 2 || y < 2 || x >= size - 2 || y >= size - 2;
      grid[y * size + x] = wall ? SOUL_VOID : SOUL_GROUND;
    }
  }
  for (const p of SOUL_PLOTS) {
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) {
        if (x > 1 && y > 1 && x < size - 2 && y < size - 2) grid[y * size + x] = SOUL_BED;
      }
    }
  }
  CACHE = { size, grid, entry: { ...SOUL_ENTRY } };
  return CACHE;
}

/** Is this standing full-screen, or a window over the player's head? */
export function soulSpaceRank(rank) {
  return RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf('silver');
}

// ---------------------------------------------------------------------------
// WHAT THE FOLLOWERS SAY
//
// "with dialogue talking about their place in the astral"
//
// A familiar in the soul space is not a pet standing in a field -- it is a
// thing the player's own essences made, standing inside the player. So every
// line is about that relationship from the creature's side, and none of them
// are about the weather.
//
// Keyed by the creature's FAMILY where there is something family-specific to
// say, with a general bank behind it. A summon whose family has no entry still
// speaks; it just speaks as a summon rather than as a bird.
// ---------------------------------------------------------------------------
export const SOUL_TALK = {
  bird: [
    "I can see the edges of you from up there. You are wider than you think and thinner at the top.",
    "There is no sky here, strictly. I fly anyway. You have not objected, so I assume it is allowed.",
  ],
  slime: [
    "I am mostly your water. I want you to know I am careful with it.",
    "Nothing here has a shape until you look at it. I am trying not to take that personally.",
  ],
  wolf: [
    "I know the borders of this place by smell. They move when you are frightened.",
    "There is a part of the far field I do not go into. You have not been there either.",
  ],
  dragon: [
    "Small, for a soul. It will do. It is growing and I am patient, which is the arrangement.",
    "Out there I am a thing you cast. In here I am a thing you ARE. I prefer in here.",
  ],
  elemental: [
    "I do not persist out there. In here I have never once stopped existing. Consider what that means.",
    "You built a field and I stand in it. That is the whole of my theology.",
  ],
  demon: [
    "You made me out of what you had. I have made my peace with what you had.",
    "The astral does not care what I am. You do. That turns out to be the part that matters.",
  ],
  skeleton: [
    "Everything in here is a thought you kept. I am one of the ones you kept twice.",
    "The soil remembers every rank you have been. So do I. You were much worse.",
  ],
};

export const SOUL_TALK_GENERAL = [
  "This is the inside of you. I am told most people never come and look.",
  "When you rank up the fields get bigger and I get further to walk. I am not complaining. I am mentioning it.",
  "Out there I last as long as the spell. In here I am standing in the thing that casts it.",
  "Everything growing here you paid for with something you killed. I thought you should hear it said.",
  "You keep the astral tidy. I have been in others. You would not believe some of them.",
  "I have a place here. That is more than most summoned things get, and I know it.",
];

/** What one follower says, chosen by family and then by how many times they
 *  have been asked -- so a second press gets a second line rather than the
 *  same one, and the bank does not flicker between two presses. */
export function soulTalkFor(family, asked) {
  const bank = (family && SOUL_TALK[family]) || null;
  const n = Math.max(0, asked | 0);
  if (bank && n < bank.length) return bank[n];
  return SOUL_TALK_GENERAL[(n - (bank ? bank.length : 0)) % SOUL_TALK_GENERAL.length];
}

/** The page shown on arrival, once per sitting. Says where you are and how to
 *  leave, because a full-screen takeover with no way out stated is a trap. */
export const SOUL_ARRIVAL = {
  name: 'Your Soul',
  text:
    "The light changes, and you are standing in it.\n\n"
    + "Your essences are here as ground -- planted, tended, and further off than "
    + "they were the last time you looked. Whatever you have been feeding them, "
    + "they have been eating.\n\n"
    + "Anything you have summoned is here too, walking about as though it lives "
    + "here. It does.\n\n"
    + "[ Walk where you like. Press M again to come back. ]",
};

/** Everything this file promises, checked. */
export function soulSpaceFaults() {
  const out = [];
  const g = soulGrid();
  if (g.size !== SOUL_TILES) out.push('the grid is not the size it says');
  // A SOUL YOU CAN WALK ACROSS. Every plot has to be reachable from the entry,
  // or a player would arrive in a garden with a field they can see and never
  // stand in -- which is the exact failure a hand-drawn layout invites.
  const seen = new Uint8Array(g.size * g.size);
  const stack = [[g.entry.x, g.entry.y]];
  const walk = (v) => v === SOUL_GROUND || v === SOUL_BED;
  if (!walk(g.grid[g.entry.y * g.size + g.entry.x])) out.push('the entry tile is not walkable');
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= g.size || y >= g.size) continue;
    const i = y * g.size + x;
    if (seen[i] || !walk(g.grid[i])) continue;
    seen[i] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (const p of SOUL_PLOTS) {
    let any = false;
    for (let y = p.y; y < p.y + p.h && !any; y++) {
      for (let x = p.x; x < p.x + p.w && !any; x++) {
        if (seen[y * g.size + x]) any = true;
      }
    }
    if (!any) out.push(`plot ${p.slot} cannot be walked to`);
    if (p.x < 2 || p.y < 2 || p.x + p.w > g.size - 2 || p.y + p.h > g.size - 2) {
      out.push(`plot ${p.slot} runs through the wall`);
    }
  }
  // Four plots, one per progressing slot -- the same four the window draws.
  if (SOUL_PLOTS.length !== 4) out.push(`${SOUL_PLOTS.length} plots; the player has four slots`);
  if (new Set(SOUL_PLOTS.map(p => p.slot)).size !== 4) out.push('two plots claim the same slot');
  // No two plots overlap, or one essence's field would be planted on another's.
  for (let i = 0; i < SOUL_PLOTS.length; i++) {
    for (let j = i + 1; j < SOUL_PLOTS.length; j++) {
      const a = SOUL_PLOTS[i], b = SOUL_PLOTS[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        out.push(`plots ${a.slot} and ${b.slot} overlap`);
      }
    }
  }
  // The rank gate is the user's: Silver and Gold, and nothing below.
  if (soulSpaceRank('bronze') || !soulSpaceRank('silver') || !soulSpaceRank('gold')) {
    out.push('the full-screen gate is not silver-and-above');
  }
  // Everything speaks, and says something about being here.
  for (const [fam, bank] of Object.entries(SOUL_TALK)) {
    if (!bank.length) out.push(`${fam}: no lines`);
    for (const l of bank) if (!l || l.length < 30) out.push(`${fam}: a line too short to be one`);
  }
  if (SOUL_TALK_GENERAL.length < 4) out.push('the general bank is too thin to avoid repeating');
  // EVERY PLOT IS ACTUALLY PLANTED. A plot whose grid came out empty -- too
  // small for the step, or a step that grew past it -- would be an essence
  // with bare ground where its field should be, and nothing else would say so.
  for (const p of SOUL_PLOTS) {
    const n = soulPlantingFor(p).length;
    if (n < 9) out.push(`plot ${p.slot} has only ${n} clumps in it`);
    for (const c of soulPlantingFor(p)) {
      if (c.x < p.x || c.y < p.y || c.x >= p.x + p.w || c.y >= p.y + p.h) {
        out.push(`plot ${p.slot} plants outside itself`);
        break;
      }
    }
  }
  // ...and the player lands within sight of one. The whole point of the second
  // pass was that they did not.
  {
    const near = Math.min(...SOUL_PLOTS.map(p =>
      Math.hypot(Math.max(0, Math.max(p.x - SOUL_ENTRY.x, SOUL_ENTRY.x - (p.x + p.w))),
                 Math.max(0, Math.max(p.y - SOUL_ENTRY.y, SOUL_ENTRY.y - (p.y + p.h))))));
    if (near > 8) out.push(`the nearest plot is ${Math.round(near)} tiles from where you arrive`);
  }
  // A follower asked many times keeps talking rather than returning undefined.
  for (let n = 0; n < 40; n++) {
    if (!soulTalkFor('bird', n)) out.push(`bird runs out of things to say at ${n}`);
    if (!soulTalkFor(null, n)) out.push(`a familiar with no family runs dry at ${n}`);
  }
  // The arrival page has to say how to leave. A full-screen takeover that does
  // not is a trap, whatever else it is.
  if (!/press m/i.test(SOUL_ARRIVAL.text)) out.push('the arrival page does not say how to leave');
  return out;
}
