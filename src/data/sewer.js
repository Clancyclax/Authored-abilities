// ===========================================================================
// ROUND 82 -- THE SEWER. The game's new opening.
//
//   "The player awakes in a large sewer surrounded by the skeletal remains of
//    a cult lets say a cult trying to summon a being from the astral."
//
//   "Instead of knowledge explaining everything to them right away the player
//    is forced to explore. A maze of tunnels, but if the player follows the
//    water they go the right direction."
//
// WHY THIS IS AN ASCII MAP AND NOT A GENERATOR.
//
// A generated maze can be solvable and still not be *readable*: the whole
// design rests on one promise -- follow the water and you are going the right
// way -- and that promise has to be true at every junction, which is a
// property of the specific layout rather than of the algorithm that made it.
// Authoring it means the route is visible in the source, the dead ends are
// deliberate, and the user can move a wall by typing a character.
//
// It is also the only representation where the water route can be CHECKED.
// `sewerFaults()` below walks the map and asserts the promise mechanically:
// every junction on the true path has water adjacent, no dead end does, and
// the exit is reachable. A maze whose signpost lies in one corridor is worse
// than a maze with no signpost at all.
//
// THE LEGEND
//   #  wall (drawn as void -- unlit stone, and free: the renderer already
//      draws TILE_VOID, so the maze costs no sprites at all)
//   .  wet brick walkway
//   ~  the channel. Impassable, because `isWaterTile` answers true for it,
//      which means every mover in the game already refuses to enter it.
//   S  where the player wakes, in the ritual circle
//   X  the ladder out, in the final chamber
//   C  the cultist
//   A  the rift into the astral (ROUND 92) -- shut until the prologue is over
//   w  a weapon on the floor      a  a piece of armour
//   p  a potion                   e  an essence or stone
//   s  a slime
//   b  a bone pile (scenery, the cult's remains)
//   W  the FIRST SWORD (ROUND 115) -- the one the player used to start holding
//   g  the slime standing over it, at half the strength of the others
//   ^  a standing hazard (ROUND 115): it hurts whatever walks onto it, and
//      what walks onto it is as often a slime as it is the player
//
// THE ROUTE, for anyone reading the map rather than the code: the channel
// leaves the ritual circle at the top left, runs east along the top, turns
// south down the middle of the map, and empties into the cultist's chamber at
// the bottom right. Every corridor that touches the channel is on the way.
// Every corridor that does not is a dead end with something in it -- which is
// the other half of the deal, and the reason exploring is worth doing.
// ===========================================================================

// The cultist in the last room is a member of one of the ten authored cults,
// not a bespoke antagonist -- see SEWER_CULTIST below. cultists.js is pure
// data and imports nothing, so this cannot form a cycle.
import { cultistArtKey } from './cultists.js';

/** The chamber grid the map is carved on. Exported because the fault checker
 *  below reconstructs the maze from it -- a doorway is only identifiable as a
 *  doorway if you know where the walls between chambers are supposed to be. */
// ROUND 133 -- ELEVEN, FIVE, FOUR. The user: "Make the sewer corridors twice
// as wide and rebuild the sewer to enable easier pathing." A doorway cannot be
// wider than the wall it is cut in, so doubling the corridor from three tiles
// to six moves the chamber up with it; and twenty rooms instead of thirty-five
// is the "easier pathing" half, because a shorter maze is one with fewer
// chances to lose a companion in it. See tools/build_round133_sewer.py.
export const SEWER_CELL = 11;
export const SEWER_COLS = 5;
export const SEWER_ROWS = 4;

/**
 * ROUND 84 -- HOW FAR YOU CAN SEE DOWN HERE.
 *
 *   "Visibility in the sewer should be only 8x8 squares"
 *
 * FOUR TILES IN EVERY DIRECTION -- eight tiles of ground across the window,
 * plus the one the player is standing on, so the lit block is 9x9 counting
 * their own square. There is no even-sided window that is also centred, and an
 * off-centre one slides as you turn around, which is worse than a tile either
 * way.
 *
 * A SQUARE, not a circle, because the maze is drawn on squares: a circular
 * falloff makes a straight corridor appear to bulge in the middle. Chebyshev
 * distance is the same shape as the thing being lit.
 *
 * WHY THIS IS THE WHOLE DESIGN AND NOT AN EFFECT. A maze you can see all of is
 * a picture of a maze. The channel only means anything -- "follow the water and
 * you are going the right direction" -- if the alternative is not knowing, and
 * until this round the player could see every dead end in the chamber they
 * stood in and pick the one with loot in it by looking. Eight tiles is a little
 * wider than one chamber, so you can see the doorway you came in by and the
 * one you are heading for, and nothing beyond either.
 */
export const SEWER_SIGHT_TILES = 8;
/** Four either side. Derived rather than written twice. */
export const SEWER_SIGHT_RADIUS = Math.floor(SEWER_SIGHT_TILES / 2);

// ===========================================================================
// ROUND 260 (item 4.3) -- "The sewer should be darker".
//
// The sewer's darkness has never been the night mask. It is a per-tile TINT,
// and has been since round 84: `_applySewerFog` walks every ground tile in
// the viewport and paints it lit, remembered, or not at all. Lit was
// 0xffffff -- which is to say, "lit" meant "as bright as the art was drawn",
// and the only darkness in the maze was the part you could not see.
//
// SEWER_GLOOM is what lit means now. It is also what makes a torch mean
// anything: there is nothing for a light to add to white, so item 4.3's two
// halves are one change and this constant is the first half of it.
//
// SEWER_DIM comes down with it. 0x7e was "remembered" measured against a lit
// state of pure white; leaving it there while lit drops to 0x8e puts the two
// within a hair of each other and stops the fog drawing the distinction it
// exists to draw. 0x4a against 0x8e is the ratio 0x7e held against 0xff.
//
// HERE RATHER THAN IN THE SCENE because a suite has to be able to name them:
// test_round82 counts lit tiles, and it counted them by comparing the tint to
// a literal 0xffffff -- which is exactly the kind of number that is correct
// until the round that changes it and then silently measures nothing.
// ===========================================================================
export const SEWER_GLOOM = 0x8e8ea0;
export const SEWER_DIM = 0x4a4a58;

/** The map. Every row must be the same length; checked. */
export const SEWER_MAP = [
  // ROUND 133 -- re-laid six tiles wide. Regenerated, not edited: the
  // channel is only an honest signpost if it runs along the spanning
  // tree's unique start->exit path, and that is a property of the whole
  // layout rather than of any one row. sewerFaults() checks it either way.
  // ROUND 134 (item 3) -- and the LADDER is searched for rather than
  // offset from the cultist, so it comes up clear of the channel.
  // ladder at (52,40), 5 tiles clear of the channel
  // 56 x 45, seed 133133, 6-wide corridors, 8 chambers on the route, 12 dead ends
  // marks: S=1 X=1 C=1 A=1 W=1 g=1 w=3 e=8 a=11 p=11 s=8 b=9 ^=8
  '########################################################',
  '#..........#..........#..........#..........#..........#',
  '#.....................#.....................#..........#',
  '#.b.....bW.g..........#....s................#....s.....#',
  '#.....................#.....................#..........#',
  '#....S..~~~~~~~....^..#.a..e..p....a..e..p..#.a..e..p..#',
  '#.....................#.....................#..........#',
  '#.....................#.....................#..........#',
  '#..b.......#....~.....#..........#..........#..........#',
  '#..........#....~.....#..........#..........#..........#',
  '#..........#....~.....#..........#..........#..........#',
  '#############...~..#####......################......####',
  '#^.....^...#....~.....#..........#..........#..........#',
  '#...............~......................................#',
  '#...............~.....................s................#',
  '#......................................................#',
  '#.a..e..p....^.....~~~~~~~....^....a..e..p....a..e..p..#',
  '#......................................................#',
  '#............................s.........................#',
  '#..........#..........#....~.....#..........#..........#',
  '#..........#..........#....~.....#..........#..........#',
  '#..........#..........#....~.....#..........#..........#',
  '#############......#####...~..##########################',
  '#..........#..........#....~.....#..........#..........#',
  '#.....................#....~...........................#',
  '#....s................#....~.....................s.....#',
  '#.....................#................................#',
  '#.a..e..p....a..e..p..#.^.....~~~~~~~....^....a..w..p..#',
  '#.....................#................................#',
  '#.....................#.................s..............#',
  '#..........#..........#..........#....~.....#..........#',
  '#..........#..........#..........#....~.....#..........#',
  '#..........#..........#..........#....~.....#..........#',
  '##......#####......#####......#####...~..###############',
  '#..........#..........#..........#....~.....#..........#',
  '#..........#..........#..........#....~.......b.....b..#',
  '#..........#....s.....#..........#....~................#',
  '#..........#..........#..........#..............b......#',
  '#.a..w..p..#.a..w..p..#....A.....#.^.....~~~~~~~.C.....#',
  '#..........#..........#..........#................b....#',
  '#..........#..........#..........#..................X..#',
  '#..........#..........#..........#..........#.b.....b..#',
  '#..........#..........#..........#..........#..........#',
  '#..........#..........#..........#..........#..........#',
  '########################################################',
];

// ROUND 82 -- THE CULTIST'S ROOM IS THE MAZE'S OWN LAST CHAMBER.
//
// An earlier draft gave him a separate little map linked to the main one. That
// is a second coordinate system, a third doorway kind and one more thing to get
// wrong, for a room that already exists: the far end of a spanning tree is the
// deepest room in the maze by construction. He stands in it, Knowledge's last
// line fires on the way in, and the ladder is behind him.

// ---------------------------------------------------------------------------
// KNOWLEDGE'S TIDBITS -- GONE, AND WHERE THEY WENT (ROUND 92)
// ---------------------------------------------------------------------------
//
// Six lines stood here, fired by walking onto six numbered tiles.
//
//   "The text of knowledge's introduction needs heavy improvement. It
//    currently is very overtly AI written and doesn't feel accurate to the
//    world."
//
//   "The pacing of knowledges advice doesn't make sense. After improving the
//    text itself the triggers need to be relevant to the information."
//
// Both halves of that are now answered in src/data/knowledge.js, which holds
// everything she says and fires each line off the EVENT it is about rather
// than off a floor tile. The tile was a guess about what the player had done,
// and it was wrong in both directions -- the essence lecture fired whether or
// not the player had ever seen an essence, and they had not: the 'e' marks in
// the map above are STONES, and the first essence in the game is the cultist's
// drop, two chambers further on.
//
// The numbered marks have come out of the map with them. Nothing in this file
// knows about Knowledge any more, which is the right amount for a file about
// a maze.

// ---------------------------------------------------------------------------
// THE CULTIST
// ---------------------------------------------------------------------------
//
//   "the player finds the last room and has to defeat a severely weakned
//    cultist who reveals they were trying to summon an apocalypse beast before
//    attacking the player."
//
// SEVERELY WEAKENED is a stat line, not a description: he is a normal-rank
// humanoid with a fraction of the health his rank would carry, because the
// player fighting him has no essences, no abilities and whatever weapon they
// found on the floor. This is the first fight in the game and it has to be
// winnable with a stick.
export const SEWER_CULTIST = {
  name: 'Sereth Vane',
  /** HE BELONGS TO AN AUTHORED CULT, not to a one-off.
   *
   *  The Unmade (`void`) are the ten cults' own answer to this prologue --
   *  "they believe the world is a mistake with a correction available" -- so
   *  the thing they were pulling through is the correction. Round 83 places
   *  the ten cults in the world; this is the first of them the player meets,
   *  and it costs nothing to have him already be one of them rather than a
   *  stranger who is retconned into a group later. */
  cult: 'void',
  // ART. `npc_cultist_a` did not exist -- the fallback drew him as a purple
  // ellipse, which the round-82 screenshot pass caught. The real key comes
  // from `cultistArtKey`, so a rename of the models moves this with it, and
  // the man model is used because the woman model is the one the audit found
  // the extractor named inconsistently.
  artKey: cultistArtKey('void', 1),
  /**
   * ROUND 267 -- "1) Sereth Vane has too much health."
   *
   * COUNTED IN SWINGS, WHICH IS THE UNIT THE FIGHT IS ACTUALLY FELT IN. The
   * player meets him with the sword off the floor beside the skeleton and
   * nothing else: no essences, no abilities, no crit chance worth the name.
   * That swing is `weapon.base 8 * WEAPON_DAMAGE_MULT 0.85 * 1 * 1` = 7, on a
   * 0.42s cooldown. At 46 he took SEVEN of them -- near three seconds of
   * holding the button down, in a room with one enemy in it, before the player
   * has been given a single thing to press instead. That is the length of a
   * boss bar, not of a first fight.
   *
   * 28 is four swings. Long enough that he has to be fought and the dodge is
   * worth learning, short enough that the prologue does not end with a chore.
   * Written as the arithmetic rather than as the number so that the next time
   * the sword moves, this moves with it.
   */
  hp: 28, damage: 4, speed: 34,
  // What he says before he attacks. Delivered as dialogue, then the fight
  // starts on its own -- he does not wait to be attacked, because a man who
  // has just told you what he did does not.
  reveal: [
    'You are not one of them.',
    'Do you know what we had? Do you know what was COMING?\n\n'
      + 'Not a spirit. Not a messenger. We reached past all of that. '
      + 'We had a hand on something that eats worlds and we were pulling it through, '
      + 'and it was going to arrive here, in the wet, under a city that would never have seen it coming.',
    'And it took them. All of them. It reached back down the same thread and it took them '
      + 'and it left me — it LEFT me, to lie here and understand it.\n\n'
      + 'You woke up in my circle. You are the only thing down here that is still warm.',
  ],
  /** The essence he always drops.
   *
   *  "(who should always drop 1 rare or better essence)" -- so this is a
   *  floor, not a roll: the drop is filtered and rolled from the real
   *  catalogue, so it is a genuine essence of genuine value and not a
   *  scripted stand-in.
   *
   *  ROUND 267 -- "any essence uncommon rarity or higher. With rarity properly
   *  weighing the results." The floor drops a grade and stops being a LIST of
   *  the grades that pass: it is one name, read against
   *  `ESSENCE_RARITY_LADDER`, so a grade added above Legendary later does not
   *  leave this line quietly wrong. Why the floor moved: at Rare-and-above the
   *  eligible pool is 31 essences and the roll effectively hands out a build --
   *  at Uncommon it is 56, weighted 40/14/6/2, so an Uncommon is the common
   *  case, a Legendary is one prologue in eighty, and the first essence a
   *  player owns varies the way the rest of the game's drops do. */
  dropRarityFloor: 'Uncommon',
};

// ===========================================================================
// ROUND 115 -- THE HAZARDS, AND THE SWORD YOU NO LONGER START WITH.
//
//   "Add some obvious traps in the sewers that can hurt the player and the
//    monsters. This will enable the player to lure the enemies into these
//    traps at the start when they are most vulnerable and better portrays
//    someone scrambling to survive."
//
//   "No more starting with a sword, the player can find a sword in the closest
//    room. The slime guarding it should be 50% weaker than even the other
//    sewer slimes."
//
// THE TWO ASKS ARE ONE ASK. Until this round the prologue opened with a sword
// already in the player's hand and nothing in the world that could be used
// against anything -- so "scrambling to survive" was a thing the room was
// dressed as rather than a thing the player did. Taking the sword away creates
// the two minutes the hazards are for, and the hazards are what make those two
// minutes playable instead of merely lethal.
//
// A HAZARD IS NOT AN ABILITY TRAP. `summon_trap` (round 75) is a thing the
// player lays; these are things the sewer already has and neither side owns.
// That is the whole design: it fires on WHOEVER stands on it. A hazard that
// only hurt monsters would be a weapon lying on the floor, and a hazard that
// only hurt the player would be a tax.
//
// OBVIOUS, in the user's word, is a requirement and not a description: each
// one is drawn on the floor at full brightness with a name over it the first
// time it is seen. A hidden trap in a maze where you can see four tiles is a
// coin flip, and a coin flip cannot be lured anything onto.
//
// The numbers are set against what is actually down there. A prologue slime
// carries 8-20 health (`SEWER_HP_MULT`), so a jaw trap kills the small ones
// outright and takes half of a violet; the player has 40, so the same trap is
// a serious mistake and not a death. Both of those have to be true at once or
// the mechanic is either a joke or a wall.
// ===========================================================================

/**
 * The three hazards, by what they are.
 *
 * `art` names a TRAP_GROUPS key in trapArt.js rather than a cell index --
 * WorldScene owns the art, this file owns the mechanic, and neither has to
 * import the other's table.
 */
export const SEWER_TRAP_KINDS = {
  // A rat-catcher's, left set and forgotten. Small, so it has to be stepped
  // on rather than walked near, and it takes a chunk out of anything that does.
  jaw: { key: 'jaw', label: 'Rusted jaw trap', damage: 16, radius: 22, rearm: 7,
         art: 'jaw', colour: '#cfd8dc', pin: 1.1 },
  // A collapsed floor grate over the spill below. Wide and shallow: the one
  // you back into while fighting something else.
  spikes: { key: 'spikes', label: 'Broken grate', damage: 10, radius: 38, rearm: 4,
            art: 'caltrop', colour: '#a1887f', pin: 0 },
  // A split pressure pipe. The widest and the slowest to build up again, so it
  // is the one worth planning a fight around.
  steam: { key: 'steam', label: 'Split steam pipe', damage: 12, radius: 44, rearm: 9,
           art: 'mine', colour: '#e0f7fa', pin: 0 },
};
/** Reading order, so which mark is which kind is a fact about the map. */
export const SEWER_TRAP_ORDER = ['jaw', 'spikes', 'steam'];

/**
 * The `^` marks, given kinds.
 *
 * Cycled through the three in reading order rather than hashed. A hash would
 * be one line shorter and would make "which trap is in the waking room" a
 * question nobody can answer by looking at the map, which is the property this
 * whole file was written to keep.
 */
export function sewerTraps(map = SEWER_MAP) {
  const marks = parseSewer(map).marks.traps;
  return marks.map((m, i) => ({ ...m, ...SEWER_TRAP_KINDS[SEWER_TRAP_ORDER[i % SEWER_TRAP_ORDER.length]] }));
}

/**
 * How much weaker the slime standing over the first sword is.
 *
 * "50% weaker than even the other sewer slimes" -- so it is half of what a
 * sewer slime already is, which is itself 70% of the roster's. Applied to
 * BOTH health and damage: a slime with full damage and half health is not a
 * weaker slime, it is a shorter fight with the same chance of killing an
 * unarmed man.
 */
export const SEWER_GUARD_MULT = 0.5;

// ---------------------------------------------------------------------------
// The map, parsed
// ---------------------------------------------------------------------------

/** Everything the placer needs, derived from the ASCII once. */
export function parseSewer(map = SEWER_MAP) {
  const marks = { start: null, exit: null, cultist: null, rift: null, weapons: [],
                  armour: [], potions: [], essences: [], slimes: [], bones: [],
                  // ROUND 115
                  traps: [], sword: null, guard: null };
  const walk = [];   // walkable tile coords
  const water = [];
  for (let ty = 0; ty < map.length; ty++) {
    for (let tx = 0; tx < map[ty].length; tx++) {
      const c = map[ty][tx];
      if (c === '#') continue;
      if (c === '~') { water.push({ tx, ty }); continue; }
      walk.push({ tx, ty });
      if (c === 'S') marks.start = { tx, ty };
      else if (c === 'X') marks.exit = { tx, ty };
      else if (c === 'C') marks.cultist = { tx, ty };
      else if (c === 'A') marks.rift = { tx, ty };
      else if (c === 'w') marks.weapons.push({ tx, ty });
      else if (c === 'a') marks.armour.push({ tx, ty });
      else if (c === 'p') marks.potions.push({ tx, ty });
      else if (c === 'e') marks.essences.push({ tx, ty });
      else if (c === 's') marks.slimes.push({ tx, ty });
      else if (c === 'b') marks.bones.push({ tx, ty });
      else if (c === '^') marks.traps.push({ tx, ty });
      else if (c === 'W') marks.sword = { tx, ty };
      else if (c === 'g') marks.guard = { tx, ty };
    }
  }
  return { w: map[0].length, h: map.length, marks, walk, water };
}

/** Flood fill from a tile across walkable ground. Used by the fault checker
 *  and by nothing else -- the game does no pathing in here. */
function reachable(map, from) {
  const seen = new Set();
  const key = (t) => `${t.tx},${t.ty}`;
  const open = [from];
  seen.add(key(from));
  while (open.length) {
    const c = open.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tx = c.tx + dx, ty = c.ty + dy;
      if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[ty].length) continue;
      const ch = map[ty][tx];
      if (ch === '#' || ch === '~') continue;
      const k = `${tx},${ty}`;
      if (seen.has(k)) continue;
      seen.add(k); open.push({ tx, ty });
    }
  }
  return seen;
}

/**
 * The map checked against its own promises.
 *
 * THE PROMISE IS NOT "there is water somewhere". It is:
 *
 *     at every junction, the doorway with water in it is the one that takes
 *     you onward, and every doorway without water is a dead end
 *
 * -- and that is a claim about the maze's SHAPE, so it is checked against the
 * shape. The map is carved on a known chamber grid (SEWER_CELL/COLS/ROWS), so
 * the checker can rebuild the chamber graph from the ASCII, find which
 * doorways carry water, and assert that the watered ones form a simple path
 * from the start chamber to the cultist's and that no other doorway is marked.
 *
 * An earlier version of this function asserted that the channel was ONE
 * connected body. That was a fact about the first draft rather than a
 * requirement of the design -- the channel is deliberately in runs, one per
 * junction -- and it failed on a map that was correct. Checking the shape
 * rather than the plumbing is the fix.
 */
export function sewerFaults() {
  const out = [];
  const map = SEWER_MAP;
  const width = map[0].length;
  map.forEach((row, i) => {
    if (row.length !== width) out.push(`row ${i} is ${row.length} wide, not ${width}`);
  });
  if (out.length) return out;   // every check below indexes the grid

  const p = parseSewer(map);
  if (!p.marks.start) out.push('no start tile (S)');
  if (!p.marks.exit) out.push('no ladder out (X)');
  if (!p.marks.cultist) out.push('no cultist (C)');
  if (!p.water.length) out.push('there is no channel to follow');

  // ROUND 134 (item 3) -- THE LADDER COMES UP ON DRY PAVING.
  //
  // The user: "Going back into the sewers gets you stuck in the water. Move
  // the sewer exit (and if you reenter) away from the water."
  //
  // Re-entry lands BESIDE the ladder, so the clearance the arrival needs is
  // the ladder's clearance minus one. Two clear tiles is the smallest number
  // that leaves a dry landing on every side of it, so that is what is asked
  // for. Written as a check rather than left to the generator because the
  // generator is a script somebody runs and this file is what ships: round
  // 92's re-entry offset was correct against round 82's map and wrong against
  // round 133's, and nothing said so for a round.
  if (p.marks.exit && p.water.length) {
    const { tx, ty } = p.marks.exit;
    let gap = 99;
    for (const w of p.water) {
      gap = Math.min(gap, Math.max(Math.abs(w.tx - tx), Math.abs(w.ty - ty)));
    }
    if (gap < 2) out.push(`the ladder out is ${gap} tile(s) from the channel — `
      + 'a player coming back down lands in the water');
  }

  // ROUND 92 -- THE RIFT, AND WHERE IT IS ALLOWED TO BE.
  //
  //   "at a different portion of the maze lead to an astral space. During the
  //    prologue the player has no way to sense it but if they go back later
  //    they will find a full iron/bronze rank astral space"
  //
  // "A different portion" is the requirement and it is checkable: the rift
  // must be OFF the water route. A rift in a route chamber is a rift the
  // player walks past on their way out of the prologue, and the whole idea is
  // a place that was there the first time and could not be reached.
  if (!p.marks.rift) {
    out.push('no rift into the astral (A)');
  } else {
    const rc = { cx: Math.floor(p.marks.rift.tx / SEWER_CELL),
                 cy: Math.floor(p.marks.rift.ty / SEWER_CELL) };
    const wetCells = new Set();
    for (let ty = 0; ty < map.length; ty++) {
      for (let tx = 0; tx < map[ty].length; tx++) {
        if (map[ty][tx] === '~') {
          wetCells.add(`${Math.floor(tx / SEWER_CELL)},${Math.floor(ty / SEWER_CELL)}`);
        }
      }
    }
    if (wetCells.has(`${rc.cx},${rc.cy}`)) {
      out.push('the rift stands in a route chamber -- the player cannot walk past it');
    }
    const sc = p.marks.start
      ? `${Math.floor(p.marks.start.tx / SEWER_CELL)},${Math.floor(p.marks.start.ty / SEWER_CELL)}` : null;
    if (sc === `${rc.cx},${rc.cy}`) out.push('the rift is in the chamber the player wakes in');
  }

  // --- reachability, from where the player actually wakes -------------------
  if (p.marks.start) {
    const seen = reachable(map, p.marks.start);
    const cut = p.walk.filter(t => !seen.has(`${t.tx},${t.ty}`));
    if (cut.length) {
      out.push(`${cut.length} walkable tiles are cut off from the start `
        + `(first: ${cut.slice(0, 3).map(t => `${t.tx},${t.ty}`).join(' ')})`);
    }
    const all = [...p.marks.weapons, ...p.marks.armour, ...p.marks.potions,
                 ...p.marks.essences, ...p.marks.slimes, ...p.marks.traps,
                 p.marks.exit, p.marks.cultist, p.marks.rift,
                 p.marks.sword, p.marks.guard];
    for (const m of all) {
      if (m && !seen.has(`${m.tx},${m.ty}`)) out.push(`a placement at ${m.tx},${m.ty} is unreachable`);
    }
  }

  // --- the signpost actually signposts --------------------------------------
  const cellOf = (t) => ({ cx: Math.floor(t.tx / SEWER_CELL), cy: Math.floor(t.ty / SEWER_CELL) });
  const key = (c) => `${c.cx},${c.cy}`;
  const openAt = (tx, ty) => ty >= 0 && ty < map.length && tx >= 0 && tx < map[ty].length
    && map[ty][tx] !== '#';
  const wetAt = (tx, ty) => openAt(tx, ty) && map[ty][tx] === '~';

  // Every wall line between two chambers: is it open, and is it wet?
  const doors = [];
  for (let cy = 0; cy < SEWER_ROWS; cy++) {
    for (let cx = 0; cx < SEWER_COLS; cx++) {
      if (cx + 1 < SEWER_COLS) {
        const x = (cx + 1) * SEWER_CELL;
        let open = false, wet = false;
        for (let y = cy * SEWER_CELL + 1; y < (cy + 1) * SEWER_CELL; y++) {
          if (openAt(x, y)) open = true;
          // Wet WITHIN two tiles of the wall line counts as marking it: the
          // channel runs through the doorway and a short way either side, so
          // it can be seen from inside the chamber.
          for (let d = -2; d <= 2; d++) if (wetAt(x + d, y)) wet = true;
        }
        if (open) doors.push({ a: { cx, cy }, b: { cx: cx + 1, cy }, wet });
      }
      if (cy + 1 < SEWER_ROWS) {
        const y = (cy + 1) * SEWER_CELL;
        let open = false, wet = false;
        for (let x = cx * SEWER_CELL + 1; x < (cx + 1) * SEWER_CELL; x++) {
          if (openAt(x, y)) open = true;
          for (let d = -2; d <= 2; d++) if (wetAt(x, y + d)) wet = true;
        }
        if (open) doors.push({ a: { cx, cy }, b: { cx, cy: cy + 1 }, wet });
      }
    }
  }

  const startCell = p.marks.start ? cellOf(p.marks.start) : null;
  const endCell = p.marks.cultist ? cellOf(p.marks.cultist) : null;
  const wet = doors.filter(d => d.wet);
  if (startCell && endCell) {
    // Walk the WET doorways only. If the signpost is honest this reaches the
    // cultist, and it does so without ever offering a choice.
    const adj = {};
    for (const d of wet) {
      (adj[key(d.a)] = adj[key(d.a)] || []).push(key(d.b));
      (adj[key(d.b)] = adj[key(d.b)] || []).push(key(d.a));
    }
    const seen = new Set([key(startCell)]);
    const queue = [key(startCell)];
    while (queue.length) {
      for (const n of (adj[queue.shift()] || [])) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    if (!seen.has(key(endCell))) {
      out.push('following the water does NOT reach the cultist — the signpost lies');
    }
    // And it must not fan out: a watered doorway leading somewhere the route
    // does not go is a signpost pointing two ways.
    if (seen.size !== wet.length + 1) {
      out.push(`the watered doorways are not a single path: ${wet.length} wet doors `
        + `span ${seen.size} chambers`);
    }
  }
  if (!wet.length) out.push('no doorway is marked with water');

  // --- ROUND 83: THE FURNITURE DID NOT SEAL ANYTHING -----------------------
  //
  // Props are solid. A hundred and forty of them placed by a hash is a hundred
  // and forty chances to wall off a chamber, and the failure would be silent:
  // the maze still looks finished, the player just cannot get to the loot in
  // one dead end and has no way of knowing why.
  //
  // So the reachability proof is run a second time with the props treated as
  // walls -- and PESSIMISTICALLY, blocking each prop's four neighbours too,
  // because a prop's collision radius is `tiles * TILE / 2` and the big ones
  // are wider than the tile they stand on. If the sewer is connected under
  // that assumption it is certainly connected in the game. It also means this
  // check needs no import of INTERIOR_PROPS, which would be a cycle
  // (interiors.js imports this file).
  if (p.marks.start) {
    const blocked = new Set();
    for (const pr of SEWER_PROPS) {
      blocked.add(`${pr.tx},${pr.ty}`);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        blocked.add(`${pr.tx + dx},${pr.ty + dy}`);
      }
    }
    const dressed = map.map((row, ty) => row.split('').map((ch, tx) =>
      (ch === '.' && blocked.has(`${tx},${ty}`)) ? '#' : ch).join(''));
    const seenD = reachable(dressed, p.marks.start);
    // Only the things the player must reach. A bare floor tile lost behind a
    // stack of crates is set dressing doing its job; a WEAPON lost behind one
    // is a bug.
    const must = [...p.marks.weapons, ...p.marks.armour,
                  ...p.marks.potions, ...p.marks.essences,
                  p.marks.exit, p.marks.cultist, p.marks.rift].filter(Boolean);
    for (const m of must) {
      if (!seenD.has(`${m.tx},${m.ty}`)) {
        out.push(`the dressing walls off the placement at ${m.tx},${m.ty}`);
      }
    }
    for (const pr of SEWER_PROPS) {
      if (map[pr.ty] === undefined || map[pr.ty][pr.tx] !== '.') {
        out.push(`a prop stands on '${map[pr.ty] && map[pr.ty][pr.tx]}' at ${pr.tx},${pr.ty}`);
      }
      if (nearDoorway((x, y) => (y < 0 || y >= map.length || x < 0 || x >= map[0].length)
        ? '#' : map[y][x], pr.tx, pr.ty)) {
        out.push(`a prop stands in a doorway mouth at ${pr.tx},${pr.ty}`);
      }
      // ROUND 115, BUG 2 -- and nothing solid within two tiles of the ladder,
      // which is where a returning player is put down. See the placer.
      if (p.marks.exit && Math.max(Math.abs(pr.tx - p.marks.exit.tx),
                                   Math.abs(pr.ty - p.marks.exit.ty)) <= 2) {
        out.push(`a ${pr.key} stands on the ladder tile at ${pr.tx},${pr.ty} -- `
          + 'a player coming back down lands inside it');
      }
    }
  }

  // --- ROUND 115: THE HAZARDS ----------------------------------------------
  //
  // Three things have to be true of a hazard or it is not one. It must be
  // somewhere a fight can happen (not in a doorway mouth, where it is
  // unavoidable rather than lurable); it must not be under the player when
  // they wake up; and there must be one near the beginning, because "at the
  // start when they are most vulnerable" is the whole reason they exist and a
  // map that put all nine in the last chamber would pass every other check.
  const traps = p.marks.traps;
  if (!traps.length) out.push('no hazards in the sewer (^)');
  const atCh = (x, y) => (y < 0 || y >= map.length || x < 0 || x >= map[0].length) ? '#' : map[y][x];
  for (const t of traps) {
    if (nearDoorway(atCh, t.tx, t.ty)) {
      out.push(`a hazard stands in a doorway mouth at ${t.tx},${t.ty} -- it cannot be walked around`);
    }
    if (p.marks.start && Math.max(Math.abs(t.tx - p.marks.start.tx),
                                  Math.abs(t.ty - p.marks.start.ty)) < 3) {
      out.push(`a hazard at ${t.tx},${t.ty} is close enough to wake up on`);
    }
    for (const u of traps) {
      if (u === t) continue;
      if (Math.max(Math.abs(t.tx - u.tx), Math.abs(t.ty - u.ty)) <= 1) {
        out.push(`two hazards touch at ${t.tx},${t.ty} and ${u.tx},${u.ty}`);
      }
    }
  }
  if (p.marks.start && traps.length) {
    const sc = { cx: Math.floor(p.marks.start.tx / SEWER_CELL), cy: Math.floor(p.marks.start.ty / SEWER_CELL) };
    const early = traps.filter(t => Math.abs(Math.floor(t.tx / SEWER_CELL) - sc.cx)
      + Math.abs(Math.floor(t.ty / SEWER_CELL) - sc.cy) <= 1);
    if (early.length < 2) {
      out.push(`only ${early.length} hazard(s) within a chamber of the start -- `
        + 'the point of them is the opening');
    }
  }

  // --- ROUND 115: THE FIRST SWORD, AS ROUND 261 RE-SITES IT -----------------
  //
  //   4.1) "The sewer should have 3 weapon spawns (outside of the initial
  //         sword which should be found right next to the skeleton at spawn)"
  //
  // ROUND 115 READ "the closest room" AS "NOT THIS ONE", and checked for it:
  // the sword's chamber had to be exactly one step from the start, and step 0
  // was a fault reading "nothing is found". That was a fair reading of round
  // 115's sentence and it is not what this sentence says. The sword is beside
  // a body in the circle the player wakes in, and the check is now the ask:
  // same chamber, and within a couple of tiles of one of the dead.
  //
  // Both checks are kept as CHECKS rather than one replaced by a comment,
  // because the thing that makes this safe to move is that the guard, the
  // no-ordinary-slime rule and the reachability sweep below all still hold
  // against the new position.
  if (!p.marks.sword) {
    out.push('no first sword (W) -- the player starts with nothing and finds nothing');
  } else if (p.marks.start) {
    const sc = { cx: Math.floor(p.marks.start.tx / SEWER_CELL), cy: Math.floor(p.marks.start.ty / SEWER_CELL) };
    const wc = { cx: Math.floor(p.marks.sword.tx / SEWER_CELL), cy: Math.floor(p.marks.sword.ty / SEWER_CELL) };
    if (sc.cx !== wc.cx || sc.cy !== wc.cy) {
      out.push('the first sword is not in the chamber the player wakes in');
    }
    // "right next to the skeleton": measured against the bodies the map
    // actually places, not against a coordinate typed here.
    let near = 99;
    for (const bmark of p.marks.bones) {
      near = Math.min(near, Math.max(Math.abs(bmark.tx - p.marks.sword.tx),
                                     Math.abs(bmark.ty - p.marks.sword.ty)));
    }
    if (near > 2) out.push(`the first sword is ${near} tiles from the nearest body`);
  }
  if (!p.marks.guard) {
    out.push('nothing guards the first sword (g)');
  } else if (p.marks.sword) {
    const d = Math.max(Math.abs(p.marks.guard.tx - p.marks.sword.tx),
                       Math.abs(p.marks.guard.ty - p.marks.sword.ty));
    if (d > 2) out.push(`the guard is ${d} tiles from the sword it guards`);
  }
  // And no ORDINARY slime shares the sword's chamber: the first fight in the
  // game is meant to be the halved one, and a full-strength slime standing
  // beside it makes which one the player meets first a matter of which way
  // they walked in.
  if (p.marks.sword) {
    const wc = `${Math.floor(p.marks.sword.tx / SEWER_CELL)},${Math.floor(p.marks.sword.ty / SEWER_CELL)}`;
    for (const s of p.marks.slimes) {
      if (`${Math.floor(s.tx / SEWER_CELL)},${Math.floor(s.ty / SEWER_CELL)}` === wc) {
        out.push(`a full-strength slime shares the sword's chamber at ${s.tx},${s.ty}`);
      }
    }
  }

  return out;
}

// ===========================================================================
// ROUND 83 -- POPULATING IT.
//
//   "This should make for an acceptable sewer backdrop. Then populate."
//
// The backdrop is the two recoloured tiles. This is what stands on it.
//
// GENERATED FROM THE MAP, NOT SCATTERED AT RUNTIME. `SEWER_ROOM.props` is the
// same shape every other interior's prop list is -- `{ key, tx, ty }` -- so
// the props are drawn, depth-sorted, room-tagged and given collision by the
// pass that already does that for the smithy and the temple. Nothing new draws
// anything. What is new is only that this list is computed rather than typed,
// because 35 chambers of hand-placed furniture is not a table anyone would
// keep correct.
//
// WHAT EACH CHAMBER GETS, and why it differs:
//
//   * THE START is the ritual. The cult set up here and the player wakes in
//     what is left of it, so it gets the idol, the podium, the shrine niche
//     and the amphorae -- objects that say a ceremony happened, standing among
//     the bones the map already places.
//   * A ROUTE CHAMBER gets almost nothing: a barrel against a wall, a brazier.
//     The route has to stay READABLE. A player following the water is looking
//     for the next doorway, and clutter on the path is the one place clutter
//     costs something.
//   * A DEAD END gets the clutter instead -- crates, sacks, a handcart, a wash
//     tub -- because a dead end is where the loot is, and the reward for
//     turning off the route should look like somewhere worth having turned
//     off for. This is the same deal the maze itself makes, dressed.
//   * THE LAST CHAMBER is the ritual again, bigger and burning.
//
// AND NOTHING IS PLACED WHERE IT COULD BLOCK THE WAY. Props are solid: a
// barrel in a doorway is a maze that cannot be finished. So a prop tile must
// be next to a wall, must not be within two tiles of a chamber's wall line
// (which is where the doorways are), and must not already carry a mark. The
// fault checker then re-runs the reachability proof WITH the props treated as
// walls, so "the props did not seal anything" is checked rather than argued.
// ===========================================================================

/** Which props suit which kind of chamber. Keys are INTERIOR_PROPS keys --
 *  the same catalogue the smithy furnishes itself from, because a sewer full
 *  of dumped town objects is exactly what a sewer under a town holds. */
export const SEWER_DRESSING = {
  // The cult's staging ground, at the start and again at the end.
  ritual: ['idol', 'podiumCarved', 'shrineNiche', 'amphora', 'scrollStand',
           'brazierBowl', 'brazierIron', 'podiumPale'],
  // On the route: sparse, and mostly light.
  route: ['barrelStack', 'brazierIron', 'amphora', 'sacks'],
  // Off the route: the dumping ground.
  // `crateProduce` was in here and came out again: it is a market crate of
  // bright fruit, and a dozen of them lit the tunnels up like a greengrocer's.
  // What is dumped in a sewer is what nobody wanted.
  dead: ['barrelStack', 'sacks', 'handcart', 'washTub', 'jugCluster',
         'benchSlab', 'amphora', 'jugGlazed'],
};

/** Deterministic hash -> unit float. The dressing must be the same on every
 *  boot and in every suite run, so this takes the tile's own coordinates
 *  rather than Math.random. */
function tileRoll(tx, ty, salt) {
  let h = (tx * 73856093) ^ (ty * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The chambers the water runs through, as a Set of "cx,cy". Rebuilt from the
 *  map rather than remembered from the generator, so the dressing and the
 *  fault checker agree with the ASCII and not with each other. */
function routeCells(map) {
  const on = new Set();
  for (let ty = 0; ty < map.length; ty++) {
    for (let tx = 0; tx < map[ty].length; tx++) {
      if (map[ty][tx] === '~') {
        on.add(`${Math.floor(tx / SEWER_CELL)},${Math.floor(ty / SEWER_CELL)}`);
      }
    }
  }
  return on;
}

/** Is this tile in the mouth of a doorway?
 *
 *  A doorway is a run of open tiles ON a chamber wall line. Any tile within
 *  one step of such a tile is standing in the way of somebody coming through,
 *  so nothing solid may go there. Shared by the placer and the fault checker
 *  so both agree on what a doorway is. */
function nearDoorway(at, tx, ty) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx, y = ty + dy;
      const onWallLine = (x % SEWER_CELL === 0) || (y % SEWER_CELL === 0);
      if (onWallLine && at(x, y) !== '#') return true;
    }
  }
  return false;
}

/**
 * The sewer's furniture, computed from the map.
 *
 * Returns `[{ key, tx, ty }]` in the shape INTERIOR_ROOMS props take.
 */
export function sewerProps(map = SEWER_MAP) {
  const out = [];
  const h = map.length, w = map[0].length;
  const at = (tx, ty) => (ty < 0 || ty >= h || tx < 0 || tx >= w) ? '#' : map[ty][tx];
  const route = routeCells(map);
  const p = parseSewer(map);
  const startCell = p.marks.start
    ? `${Math.floor(p.marks.start.tx / SEWER_CELL)},${Math.floor(p.marks.start.ty / SEWER_CELL)}` : null;
  const endCell = p.marks.cultist
    ? `${Math.floor(p.marks.cultist.tx / SEWER_CELL)},${Math.floor(p.marks.cultist.ty / SEWER_CELL)}` : null;

  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      // Bare floor only. A tile carrying any mark already has a job.
      if (at(tx, ty) !== '.') continue;
      // KEEP OUT OF THE DOORWAY MOUTHS -- stated as what it is, rather than
      // as an offset range.
      //
      // Two earlier attempts at this were arithmetic about cell offsets, and
      // both were wrong in the same instructive way. A chamber's interior is
      // offsets 1..6 and the wall line is offset 0, so the ONLY tiles that
      // touch a wall are 1 and 6 -- which means "stay two tiles off the wall
      // line" and "stand against a wall" are contradictory, and the rules
      // together left six props in the whole sewer.
      //
      // What actually matters is not distance from a wall line but whether a
      // tile stands in front of a HOLE in one. So that is the test: a tile is
      // rejected if any tile touching it lies on a chamber wall line and is
      // open. It reads as the thing being avoided, and it stays correct if the
      // maze is regenerated with different doorways.
      if (nearDoorway(at, tx, ty)) continue;
      // ROUND 115, BUG 2 -- KEEP OFF THE LADDER.
      //
      //   "If the player exits the sewers and reenters they can get stuck.
      //    Remove the brazier at the sewer exit."
      //
      // There was a brazier at the sewer exit: `brazierIron` at 44,32, one
      // diagonal step from the ladder at 45,33. The reachability filter below
      // did not catch it because it asks whether the exit can be REACHED from
      // the start, and it could -- the player walks to the ladder and climbs
      // out perfectly well. Coming back DOWN is the other direction, and it
      // does not walk: `_enterSewerFromTown` puts the player on the ladder
      // tile, standing inside a solid disc, with the resolver pushing them
      // into the wall behind it.
      //
      // So the rule is stated as what it is -- nothing solid stands where the
      // player is put down -- rather than as one brazier removed by name. Two
      // tiles, because a big prop's collision radius is wider than its tile.
      if (p.marks.exit && Math.max(Math.abs(tx - p.marks.exit.tx),
                                   Math.abs(ty - p.marks.exit.ty)) <= 2) continue;
      // Against something. A barrel in open floor reads as dropped; a barrel
      // with its back to a wall reads as put there.
      const touchesWall = at(tx - 1, ty) === '#' || at(tx + 1, ty) === '#'
        || at(tx, ty - 1) === '#' || at(tx, ty + 1) === '#';
      // ...or beside the channel, where a sewer's own equipment would stand.
      const touchesWater = at(tx - 1, ty) === '~' || at(tx + 1, ty) === '~'
        || at(tx, ty - 1) === '~' || at(tx, ty + 1) === '~';
      if (!touchesWall && !touchesWater) continue;

      const cell = `${Math.floor(tx / SEWER_CELL)},${Math.floor(ty / SEWER_CELL)}`;
      const ritual = cell === startCell || cell === endCell;
      const onRoute = route.has(cell);
      const set = ritual ? SEWER_DRESSING.ritual
        : onRoute ? SEWER_DRESSING.route : SEWER_DRESSING.dead;
      // How often. The ritual rooms are dressed heavily, dead ends well, the
      // route barely -- see the header for why the route stays clear.
      //
      // THINNED after looking at it. The first numbers were half again as
      // high and the dead ends came out packed wall to wall, which reads as a
      // warehouse rather than as a place things have been dumped over years --
      // and, more to the point, buried the loot the dead end exists to hold.
      const chance = ritual ? 0.50 : onRoute ? 0.09 : 0.24;
      if (tileRoll(tx, ty, 1) >= chance) continue;
      out.push({ key: set[Math.floor(tileRoll(tx, ty, 2) * set.length)], tx, ty });
    }
  }

  // --- AND NOW REFUSE THE ONES THAT WOULD SEAL SOMETHING OFF ---------------
  //
  // Everything above is local: this tile is bare, this tile is against a wall,
  // this tile is not in a doorway. None of that can see that four separately
  // reasonable barrels have just closed the only way into a dead end -- which
  // the fault checker caught on its first run, five placements walled off.
  //
  // Density cannot fix it either. Turning the dice down makes a sealed chamber
  // rarer without making it impossible, and "rare" is the worst kind of bug to
  // own: it survives the round it was introduced in and surfaces three rounds
  // later as a player wondering why a corridor goes nowhere.
  //
  // So placement is a filter rather than a roll. Each candidate is accepted
  // only if, with it and every prop accepted before it standing in the way,
  // every placement the player must reach is still reachable. Rejected props
  // are simply not there -- the chamber gets one fewer crate, which nobody can
  // see, instead of a wall nobody can pass.
  const must = [...p.marks.weapons, ...p.marks.armour,
                ...p.marks.potions, ...p.marks.essences,
                p.marks.exit, p.marks.cultist, p.marks.rift].filter(Boolean);
  if (!p.marks.start) return out;

  const blocked = new Set();
  // The same pessimism the fault checker uses: a prop blocks its own tile and
  // its four neighbours, because collision radius is `tiles * TILE / 2` and
  // the big pieces are wider than the tile they stand on.
  const spread = (t) => [`${t.tx},${t.ty}`, `${t.tx + 1},${t.ty}`, `${t.tx - 1},${t.ty}`,
                         `${t.tx},${t.ty + 1}`, `${t.tx},${t.ty - 1}`];
  const stillOpen = () => {
    const dressed = map.map((row, ty) => row.split('').map((ch, tx) =>
      (ch === '.' && blocked.has(`${tx},${ty}`)) ? '#' : ch).join(''));
    const seen = reachable(dressed, p.marks.start);
    return must.every(m => seen.has(`${m.tx},${m.ty}`));
  };

  const kept = [];
  for (const prop of out) {
    const added = spread(prop).filter(k => !blocked.has(k));
    for (const k of added) blocked.add(k);
    if (stillOpen()) {
      kept.push(prop);
    } else {
      for (const k of added) blocked.delete(k);
    }
  }
  return kept;
}

/** Computed once at module load, so it is data by the time any room list is
 *  read and a suite can count it without building a world. */
export const SEWER_PROPS = sewerProps();

// ===========================================================================
// ROUND 260 -- THE TORCHES, AND WHY THEY ARE ON THE ROUTE AND NOWHERE ELSE.
//
//   4.3) "The sewer should be darker, and have torches in the new lighting
//         system to cast light along the main path."
//
// THE LIT CORRIDOR IS THE SAME PROMISE THE WATER IS. This file's whole design
// rests on one sentence -- follow the water and you are going the right way --
// and a torch that could be in any corridor would be a second signpost that
// contradicts the first. So a torch goes only in a chamber the channel runs
// through, and `sewerTorchFaults` below asserts it: not one torch in a dead
// end, and no chamber on the route left entirely dark.
//
// AND THEY GO IN AFTER THE DRESSING, reading the props as occupied ground,
// rather than the other way round. Placing them first would move every barrel
// in the sewer, which would silently change the layout eight suites already
// count -- and there is no reason to: a torch fits where a barrel does not.
// ===========================================================================

/** Tiles between one torch and the next, Chebyshev. A chamber is eleven
 *  across, so at most two fit along either axis of one: measured, 18 torches
 *  across the eight chambers the water runs through, two in most of them and
 *  four in the widest. A walk between pools of light rather than a lit road. */
export const SEWER_TORCH_SPACING = 7;

export function sewerTorches(map = SEWER_MAP, props = SEWER_PROPS) {
  const out = [];
  const h = map.length, w = map[0].length;
  const at = (tx, ty) => (ty < 0 || ty >= h || tx < 0 || tx >= w) ? '#' : map[ty][tx];
  const p = parseSewer(map);
  const route = routeCells(map);
  const startCell = p.marks.start
    ? `${Math.floor(p.marks.start.tx / SEWER_CELL)},${Math.floor(p.marks.start.ty / SEWER_CELL)}` : null;
  const endCell = p.marks.cultist
    ? `${Math.floor(p.marks.cultist.tx / SEWER_CELL)},${Math.floor(p.marks.cultist.ty / SEWER_CELL)}` : null;
  // The chambers a torch may stand in: the ones the water runs through, plus
  // the two the player is guaranteed to be in -- the circle they wake in and
  // the room the cultist is standing in. Those two are the route's ends and
  // are on it already; naming them is what makes that survive a re-lay of the
  // map rather than being a thing that happens to be true today.
  const lit = new Set(route);
  if (startCell) lit.add(startCell);
  if (endCell) lit.add(endCell);

  const taken = new Set((props || []).map(q => `${q.tx},${q.ty}`));
  const far = (tx, ty) => out.every(q =>
    Math.max(Math.abs(q.tx - tx), Math.abs(q.ty - ty)) >= SEWER_TORCH_SPACING);

  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      if (at(tx, ty) !== '.') continue;
      if (taken.has(`${tx},${ty}`)) continue;
      const cell = `${Math.floor(tx / SEWER_CELL)},${Math.floor(ty / SEWER_CELL)}`;
      if (!lit.has(cell)) continue;
      // A torch is jammed into a wall, not stood in the middle of a room.
      const touchesWall = at(tx - 1, ty) === '#' || at(tx + 1, ty) === '#'
        || at(tx, ty - 1) === '#' || at(tx, ty + 1) === '#';
      if (!touchesWall) continue;
      // The same two exclusions the dressing makes, and for the same reasons:
      // nothing stands in a doorway's mouth, and nothing stands where the
      // player is put down when they climb back in. A torch does not collide,
      // but it does draw over the ladder, and round 115 paid for that once.
      if (nearDoorway(at, tx, ty)) continue;
      if (p.marks.exit && Math.max(Math.abs(tx - p.marks.exit.tx),
                                   Math.abs(ty - p.marks.exit.ty)) <= 2) continue;
      if (!far(tx, ty)) continue;
      out.push({ tx, ty, cell });
    }
  }
  return out;
}

export const SEWER_TORCHES = sewerTorches();

// ===========================================================================
// ROUND 261 -- THE ALCOVES, AND WHAT IS IN THEM.
//
//   4)     "Objects in the sewers need to be moved into chests."
//   4.1)   "The sewer should have 3 weapon spawns (outside of the initial
//           sword which should be found right next to the skeleton at spawn)"
//   4.1.1) "The weapon spawns should be random."
//   4.2)   "The sewers should have 2 awakening stone spawns in the chests,
//           and 2 off the beaten path"
//   4.2.1) "These should be thematic to the sewer, and the ritual i.e. water,
//           crocodile, bat, frog, fungus, spider, dark, and dimension"
//
// THE MAP ALREADY HAD THE SHAPE AND NOBODY HAD NOTICED. Every one of the
// eleven dead ends carries the same three marks in the same arrangement --
// `a . . e . . p` or `a . . w . . p`, armour, a middle mark, a potion -- and
// every one of those chambers is off the water route. That is an ALCOVE, and
// it is what a chest belongs in. So the chest stands on the middle mark and
// holds what the other two were; nothing is placed by a new rule and no
// coordinate is typed here.
//
// WHICH MEANS 4.1 IS ALREADY TRUE AND WAS NEVER STATED. Three of the eleven
// middle marks are `w` and eight are `e`, so there are exactly three weapon
// alcoves -- and `sewerLootFaults` now says so out loud, which is the
// difference between a number that is right and a number that is held.
//
// 4.2 IS TWO AND TWO OUT OF EIGHT, AND WHICH TWO IS A DESIGN CHOICE:
//
//   - the two SHALLOWEST stone alcoves put their stone in the chest, because
//     the first chest a player opens is where they learn that a chest can
//     hold one at all;
//   - the two DEEPEST leave theirs lying on the floor where the alcove's
//     armour used to be -- "off the beaten path" measured as walking distance
//     through the maze rather than asserted.
//
// Depth is a BFS from the tile the player wakes on, so re-laying the maze
// moves these with it.
//
// 4.2.1 IS A NAMED LIST. All eight of his words are stones the catalogue
// already has, and they are drawn WEIGHTED BY THE GAME'S OWN RARITY rather
// than uniformly: Dimension is Legendary, and one prologue in four handing
// out a legendary would be the prologue rewriting the economy. Weighted, it
// is a little under one run in eighty, which is what a legendary in a sewer
// ought to be.
// ===========================================================================

/** The eight the user named, in his order. Ids rather than words, so a rename
 *  in the catalogue breaks the build instead of silently emptying the pool --
 *  `sewerLootFaults` checks every one against STONE_CATALOG. */
export const SEWER_STONES = [
  'stoneWater', 'stoneCrocodile', 'stoneBat', 'stoneFrog',
  'stoneFungus', 'stoneSpider', 'stoneDark', 'stoneDimension',
];

/** Two in chests, two on the floor. Both halves of 4.2, named rather than
 *  counted out of a loop. */
export const SEWER_CHEST_STONES = 2;
export const SEWER_LOOSE_STONES = 2;

/** Walking distance from the start to every walkable tile, in tiles. Used to
 *  say which alcove is deep and which is near the door without anybody
 *  deciding it by eye. */
function sewerDepths(map, from) {
  const h = map.length, w = map[0].length;
  const dist = new Map();
  if (!from) return dist;
  const q = [{ tx: from.tx, ty: from.ty, d: 0 }];
  dist.set(`${from.tx},${from.ty}`, 0);
  while (q.length) {
    const cur = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tx = cur.tx + dx, ty = cur.ty + dy;
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
      const ch = map[ty][tx];
      if (ch === '#' || ch === '~') continue;
      const k = `${tx},${ty}`;
      if (dist.has(k)) continue;
      dist.set(k, cur.d + 1);
      q.push({ tx, ty, d: cur.d + 1 });
    }
  }
  return dist;
}

/**
 * The alcoves, their chests, and the four stones.
 *
 * Returns plans, not items: how many pieces of gear a chest holds and whether
 * it holds a weapon or a stone. WHICH sword and WHICH stone is rolled by the
 * scene off the run's own seed, because 4.1.1 and round 132's stone rule are
 * both about the run rather than about the map.
 */
export function sewerLoot(map = SEWER_MAP) {
  const p = parseSewer(map);
  const route = routeCells(map);
  const cellOf = (m) => `${Math.floor(m.tx / SEWER_CELL)},${Math.floor(m.ty / SEWER_CELL)}`;
  const alcoves = new Map();
  const get = (m) => {
    const cell = cellOf(m);
    let a = alcoves.get(cell);
    if (!a) {
      a = { cell, onRoute: route.has(cell), at: null, kind: null,
            gearAt: [], potionAt: [], weapon: false, stone: null,
            looseAt: null, depth: Infinity };
      alcoves.set(cell, a);
    }
    return a;
  };
  // The middle mark is the chest. `armourAt` is remembered because a loose
  // stone lies where the armour used to -- a spot the map already says is a
  // place something is left, so nothing has to go looking for one.
  for (const m of p.marks.armour) {
    const a = get(m);
    a.gearAt = a.gearAt || []; a.gearAt.push(m);
    a.armourAt = a.armourAt || m;
  }
  for (const m of p.marks.potions) {
    const a = get(m);
    a.potionAt = a.potionAt || []; a.potionAt.push(m);
  }
  for (const m of p.marks.essences) { const a = get(m); a.at = m; a.kind = 'e'; }
  for (const m of p.marks.weapons) { const a = get(m); a.at = m; a.kind = 'w'; a.weapon = true; }

  const dist = sewerDepths(map, p.marks.start);
  for (const a of alcoves.values()) {
    if (a.at) a.depth = dist.get(`${a.at.tx},${a.at.ty}`);
    if (a.depth === undefined) a.depth = Infinity;
  }

  // THE STONE ALCOVES, BY DEPTH. Ties broken by tile so the layout is the
  // same on every boot and in every suite run.
  const stoneAlcoves = [...alcoves.values()].filter(a => a.kind === 'e')
    .sort((x, y) => (x.depth - y.depth) || (x.at.ty - y.at.ty) || (x.at.tx - y.at.tx));
  for (let i = 0; i < SEWER_CHEST_STONES && i < stoneAlcoves.length; i++) {
    stoneAlcoves[i].stone = 'chest';
  }
  for (let i = 0; i < SEWER_LOOSE_STONES; i++) {
    const a = stoneAlcoves[stoneAlcoves.length - 1 - i];
    if (!a || a.stone) continue;
    a.stone = 'loose';
    a.looseAt = a.armourAt || a.at;
    // ITS ARMOUR GAVE UP THE SPOT. The stone lies where the armour used to,
    // so that chest holds one piece fewer -- which is the honest accounting
    // and also the reason the two deepest alcoves are the ones chosen: a
    // player who walks that far gets a stone in the hand instead of a boot in
    // a box.
    a.gearAt = a.gearAt.filter(m => !(m.tx === a.looseAt.tx && m.ty === a.looseAt.ty));
  }

  const chests = [...alcoves.values()].filter(a => a.at)
    .sort((x, y) => (x.at.ty - y.at.ty) || (x.at.tx - y.at.tx))
    .map(a => ({ tx: a.at.tx, ty: a.at.ty, cell: a.cell, onRoute: a.onRoute,
                 gear: a.gearAt.length, potion: a.potionAt.length,
                 gearAt: a.gearAt, potionAt: a.potionAt,
                 weapon: a.weapon, stone: a.stone === 'chest', depth: a.depth }));
  const looseStones = [...alcoves.values()].filter(a => a.stone === 'loose')
    .sort((x, y) => (x.looseAt.ty - y.looseAt.ty) || (x.looseAt.tx - y.looseAt.tx))
    .map(a => ({ tx: a.looseAt.tx, ty: a.looseAt.ty, cell: a.cell,
                 onRoute: a.onRoute, depth: a.depth }));
  return { chests, looseStones, sword: p.marks.sword || null };
}

export const SEWER_LOOT = sewerLoot();

/** What would make the prologue's loot a worse prologue. */
export function sewerLootFaults(map = SEWER_MAP, loot = SEWER_LOOT, stoneCatalog = null) {
  const out = [];
  const { chests, looseStones } = loot;
  if (!chests.length) out.push('no chests at all -- everything is still on the floor');
  // 4.1: THREE, said as a property of the map rather than held as a number.
  const weapons = chests.filter(c => c.weapon).length;
  if (weapons !== 3) out.push(`${weapons} weapon spawns, not 3`);
  // 4.2: two and two.
  const inChests = chests.filter(c => c.stone).length;
  if (inChests !== SEWER_CHEST_STONES) {
    out.push(`${inChests} stones in chests, not ${SEWER_CHEST_STONES}`);
  }
  if (looseStones.length !== SEWER_LOOSE_STONES) {
    out.push(`${looseStones.length} loose stones, not ${SEWER_LOOSE_STONES}`);
  }
  // "OFF THE BEATEN PATH", MEASURED. A loose stone in a chamber the channel
  // runs through is a stone the player picks up on their way out without ever
  // leaving the route, which is the opposite of the ask.
  for (const s of looseStones) {
    if (s.onRoute) out.push(`a loose stone at ${s.tx},${s.ty} is on the water route`);
  }
  // ...and the deep ones are the loose ones, which is the whole choice.
  const deepestChest = Math.max(...chests.filter(c => c.stone).map(c => c.depth), 0);
  for (const s of looseStones) {
    if (s.depth <= deepestChest) {
      out.push(`a loose stone at ${s.tx},${s.ty} is nearer the start than a chest stone`);
    }
  }
  // Nothing may share a tile: a chest standing on a floor stone hides it.
  const seen = new Set();
  for (const q of [...chests, ...looseStones]) {
    const k = `${q.tx},${q.ty}`;
    if (seen.has(k)) out.push(`two things at ${k}`);
    seen.add(k);
  }
  // Every chest must hold SOMETHING, or it is furniture that lies to you.
  for (const c of chests) {
    if (!c.gear && !c.potion && !c.weapon && !c.stone) out.push(`the chest at ${c.tx},${c.ty} is empty`);
    if (map[c.ty][c.tx] === '#') out.push(`the chest at ${c.tx},${c.ty} is in a wall`);
  }
  // 4.2.1: every stone he named must actually be a stone.
  if (stoneCatalog) {
    for (const id of SEWER_STONES) {
      if (!stoneCatalog[id]) out.push(`${id} is not in the stone catalogue`);
    }
  }
  if (SEWER_STONES.length !== new Set(SEWER_STONES).size) out.push('a stone is named twice');
  return out;
}

/** What would make the torches a worse signpost than no torches. */
export function sewerTorchFaults(map = SEWER_MAP, torches = SEWER_TORCHES) {
  const out = [];
  const route = routeCells(map);
  const p = parseSewer(map);
  const startCell = p.marks.start
    ? `${Math.floor(p.marks.start.tx / SEWER_CELL)},${Math.floor(p.marks.start.ty / SEWER_CELL)}` : null;
  const endCell = p.marks.cultist
    ? `${Math.floor(p.marks.cultist.tx / SEWER_CELL)},${Math.floor(p.marks.cultist.ty / SEWER_CELL)}` : null;
  const lit = new Set(route);
  if (startCell) lit.add(startCell);
  if (endCell) lit.add(endCell);
  const seen = new Set();
  for (const t of torches) {
    if (map[t.ty][t.tx] !== '.') out.push(`torch at ${t.tx},${t.ty} is not on bare floor`);
    // THE PROMISE. A torch off the route is a signpost pointing into a hole.
    if (!lit.has(t.cell)) out.push(`torch at ${t.tx},${t.ty} is in a dead end (${t.cell})`);
    const k = `${t.tx},${t.ty}`;
    if (seen.has(k)) out.push(`two torches at ${k}`);
    seen.add(k);
  }
  for (const a of torches) {
    for (const b of torches) {
      if (a === b) continue;
      if (Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty)) < SEWER_TORCH_SPACING) {
        out.push(`torches at ${a.tx},${a.ty} and ${b.tx},${b.ty} are on top of each other`);
      }
    }
  }
  // ...and the other half: a chamber on the route with no torch in it is a
  // stretch of the main path that is as dark as a dead end, which is the
  // failure this whole placement exists to avoid.
  const withTorch = new Set(torches.map(t => t.cell));
  for (const cell of lit) {
    if (!withTorch.has(cell)) out.push(`chamber ${cell} is on the route and unlit`);
  }
  return out;
}

/** How many of each thing the map places -- printed by the suite so a change
 *  to the map is visible as a change in the counts. */
export function sewerCensus() {
  const p = parseSewer();
  return {
    tiles: p.walk.length, water: p.water.length,
    rift: p.marks.rift ? 1 : 0,
    weapons: p.marks.weapons.length, armour: p.marks.armour.length,
    potions: p.marks.potions.length, essences: p.marks.essences.length,
    slimes: p.marks.slimes.length, bones: p.marks.bones.length,
    traps: p.marks.traps.length,
    sword: p.marks.sword ? 1 : 0, guard: p.marks.guard ? 1 : 0,
  };
}
