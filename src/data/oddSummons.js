// ROUND 76 (item 2.2) -- THE ODD SUMMONS: A SOLID IRON COW.
//
// The user, in full:
//
//   "a large number of models in the game exist solely to be used as odd
//    summons. The summons can have color palettes that would normally be
//    unacceptable, a solid iron cow, or solid gold duck... An iron essence
//    with a awakening stone of the bull might give you an iron cow, or with an
//    awakening stone of the bird an iron duck. These would have defensive
//    auras and a taunts of their own."
//
// and, asked how many: "Curated set, ~15-20 combos."
//
// THE GRAMMAR IS THE WHOLE DESIGN, and it is the user's own sentence read
// literally: the ESSENCE supplies the SUBSTANCE and the STONE supplies the
// SHAPE. Iron + Bull is an iron bull. Iron + Bird is an iron duck. Nothing
// here invents a rule; it writes down the one already in the request.
//
// WHY A CURATED TABLE AND NOT A PRODUCT. Eighteen materials times forty
// creature stones is seven hundred combinations, and the honest answer to
// "which of those are funny" is about twenty. A glass lion is a good joke; a
// glass flea is nothing at all, and a wooden whale is a boat. Generating all
// of them would mean most odd summons are not odd, they are noise -- and the
// user asked for a curated set for exactly that reason.
//
// WHY THE JOKE IS ALSO A MECHANIC. An odd summon is not a reskin: it takes
// the sixth summon role, `guard`, and it is the only thing that has it. A
// guardian deals NO damage. It stands between the player and the pack, shouts
// at what is nearest, and soaks. That is one job -- the user's cap rule holds
// ("each summon can really only do 1 of these things"), and the defensive aura
// and the taunt are not two jobs, they are the two halves of tanking.
//
// So a minion build that wants a front line has to spend slots on things that
// cannot kill anything, and a player who found the Cast-Iron Duck did not
// find a joke item, they found the reason their duck build survives a pack.
//
// WHAT MAKES THEM ODD ON SCREEN. The material is a luminance remap of the
// creature's own atlas, through the same pixel loop the world palettes use
// (`remapPixelsWithLut`, palettes.js) -- so a solid iron minotaur is the
// minotaur's own shading with iron's ramp under it, not a flat tint. A tint
// would have made a brown cow into a browner cow; the remap makes it metal.
import { rampLut } from './palettes.js';
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { MONSTER_ART } from './monsterArt.js';

/**
 * THE MATERIALS. Same authoring rules as the world palettes: six stops,
 * monotonically brightening, spanning enough luminance that the creature's
 * own shading survives (see `oddSummonFaults`). A ramp that failed either
 * rule would flatten the animal into a silhouette, which is precisely the
 * failure mode `setTint` has and this exists to avoid.
 */
export const SUMMON_MATERIALS = {
  iron: {
    key: 'iron', name: 'Iron', adj: 'Cast-Iron', color: '#8d9aa6',
    // Cold and blue-grey rather than neutral: a neutral grey ramp reads as
    // "the sprite lost its colour", and a bug and a design decision must not
    // look the same.
    // THE FLOOR IS LIFTED OFF BLACK, and it took looking at the sheet to see
    // why. At 0x0a0d10 the darkest stop, an iron Cindermaw -- already the
    // darkest body in the roster -- came out a near-solid silhouette with two
    // horns. A material whose low end is black turns every dark animal into
    // its own outline, which is the exact failure a luminance remap exists to
    // avoid. Same correction applied to bone below.
    ramp: [0x1a2027, 0x2e363e, 0x4c5761, 0x74818d, 0x9fadb9, 0xdae3ea],
  },
  gold: {
    key: 'gold', name: 'Gold', adj: 'Gilded', color: '#e8c14a',
    ramp: [0x140d02, 0x453006, 0x7d5c0d, 0xb98c1a, 0xe8c14a, 0xfff2b0],
  },
  crystal: {
    key: 'crystal', name: 'Crystal', adj: 'Crystalline', color: '#7fd8ea',
    ramp: [0x061218, 0x123a4a, 0x1f6b84, 0x38a2bc, 0x7fd8ea, 0xe4fbff],
  },
  glass: {
    key: 'glass', name: 'Glass', adj: 'Glass', color: '#b9e6dd',
    ramp: [0x0a1512, 0x1e3d38, 0x3a6f66, 0x6aa79c, 0xb9e6dd, 0xf6fffc],
  },
  stone: {
    key: 'stone', name: 'Granite', adj: 'Granite', color: '#8b8479',
    ramp: [0x0d0c0a, 0x2a2724, 0x4d4842, 0x726b62, 0x9c948a, 0xd2ccc2],
  },
  bone: {
    key: 'bone', name: 'Bone', adj: 'Bone', color: '#ddd6bc',
    ramp: [0x24211a, 0x413d2b, 0x6b654a, 0x9a936e, 0xc8c19d, 0xf6f2de],
  },
  ember: {
    key: 'ember', name: 'Ember', adj: 'Ember', color: '#f0821a',
    ramp: [0x0c0402, 0x3a1204, 0x7e2c05, 0xc25a0b, 0xf0921e, 0xffe08c],
  },
  ice: {
    key: 'ice', name: 'Ice', adj: 'Rime', color: '#8fd6ee',
    ramp: [0x040e16, 0x0f3046, 0x1e6288, 0x4a9cc4, 0x8fd6ee, 0xeafcff],
  },
  shadow: {
    key: 'shadow', name: 'Shadow', adj: 'Umbral', color: '#6a5c96',
    // The darkest ramp in the set, and it still spans far enough to keep the
    // creature's edges: a shadow summon the player cannot make out is not
    // atmospheric, it is invisible, which is round 73's whole complaint.
    ramp: [0x050410, 0x140f2c, 0x2a2050, 0x453878, 0x6f60a8, 0xb2a4e0],
  },
  wood: {
    key: 'wood', name: 'Wood', adj: 'Carved', color: '#a8763e',
    ramp: [0x0f0904, 0x2f1e0c, 0x59391a, 0x86602e, 0xb08a4e, 0xdfc189],
  },
};
export const SUMMON_MATERIAL_KEYS = Object.keys(SUMMON_MATERIALS);

const MATERIAL_LUT_CACHE = new Map();
/** 256 -> rgb for a material, built once. Fed to `remapPixelsWithLut`. */
export function materialLut(key) {
  if (MATERIAL_LUT_CACHE.has(key)) return MATERIAL_LUT_CACHE.get(key);
  const m = SUMMON_MATERIALS[key];
  if (!m) return null;
  const lut = rampLut(m.ramp);
  MATERIAL_LUT_CACHE.set(key, lut);
  return lut;
}

/**
 * THE BODIES an odd summon can wear.
 *
 * Two kinds, and the split is about where the art lives rather than about
 * anything the player sees. A `family` body is a row of MONSTER_ART -- five
 * shades, an attack animation, the atlas arithmetic every monster uses. A
 * `sheet` body is one of the three standalone summon sheets the game has been
 * carrying unused since round 73 (`src/data/summons.js`): the duck, the
 * chicken and the humanoid dragon, single-design, no attack frames.
 *
 * The duck and the chicken are the reason this feature exists at all. Their
 * art has been loaded every session since round 73 and drawn never, because
 * "the duck and chicken are meant to be summons, not monsters" and there was
 * no summon worth being a duck. An iron duck is that summon.
 */
export const ODD_SUMMON_BODIES = {
  minotaur: { kind: 'family', family: 'minotaur' },
  whitelion: { kind: 'family', family: 'whitelion' },
  direbuck: { kind: 'family', family: 'direbuck' },
  hornram: { kind: 'family', family: 'hornram' },
  boar: { kind: 'family', family: 'boar' },
  yeti: { kind: 'family', family: 'yeti' },
  wolf: { kind: 'family', family: 'wolf' },
  spider: { kind: 'family', family: 'spider' },
  cobra: { kind: 'family', family: 'cobra' },
  giantToad: { kind: 'family', family: 'giantToad' },
  crocodile: { kind: 'family', family: 'crocodile' },
  duck: { kind: 'sheet', sheet: 'duck' },
  chicken: { kind: 'sheet', sheet: 'chicken' },
};

/**
 * WHICH ESSENCES MEAN A SUBSTANCE, and which stones mean a SHAPE.
 *
 * THIS IS THE FIX FOR A MEASURED FAILURE, and it is worth writing down. The
 * first version of this table keyed rows on one exact essence and one exact
 * stone -- `essIron|stoneCattle` and nineteen more. Every structural check
 * passed and the pool offered all twenty when the pair came up. Then the kits
 * were rolled: TWO characters in four hundred ever held one.
 *
 * The arithmetic was never going to allow anything else. A character holds
 * three essences and sixteen stones, so twelve essence-stone pairs out of
 * 148 x 184 -- twenty exact rows is under one percent of characters. That is
 * not rare content, it is content nobody sees, which is the failure this
 * file's own header warns about one paragraph earlier and then walked into.
 *
 * So a row matches a SUBSTANCE and a SHAPE rather than an id and an id. Iron
 * is what an Iron essence means, and also what Armour, Shield, Chain and Cage
 * mean; a bull is what the Cattle stone means, and also the Grazen and the
 * Heidel -- the two beasts of burden this setting has instead of oxen. No new
 * names, no new rows, no new art: the same twenty guardians, reachable.
 *
 * Both lists are deliberately SHORT. Every id added here is a claim that this
 * essence really is made of that substance, and the moment the lists get
 * generous -- Might as iron because it is hard, Blood as ember because it is
 * red -- the odd summons stop being a discovery and become the default answer
 * for half the game's essences.
 */
export const MATERIAL_ESSENCES = {
  iron: ['essIron', 'essArmour', 'essShield', 'essChain', 'essCage'],
  // No Gold essence exists and inventing one for a joke would be the tail
  // wagging the dog. Gold is what the light essences mean when they are a
  // material rather than a colour.
  gold: ['essSun', 'essStar', 'essShimmer', 'essPure'],
  crystal: ['essCrystal', 'essRune', 'essMagic'],
  glass: ['essGlass', 'essMirror', 'essVisage'],
  stone: ['essEarth', 'essSand', 'essDust'],
  bone: ['essBone', 'essDeath', 'essCorrupt', 'essFeeble'],
  // The one-entry list, and left alone. Fire is the only essence in its own
  // family and there is nothing else in the catalogue that means "made of
  // burning" -- Blood is red, which is not the same claim.
  ember: ['fire'],
  ice: ['essIce', 'essCold'],
  shadow: ['essSmoke', 'essVoid', 'essLurker', 'essMalign'],
  wood: ['essWood', 'essTree', 'essPlant', 'essBrush'],
};

export const SHAPE_STONES = {
  bull: ['stoneCattle', 'stoneGrazen', 'stoneHeidel'],
  bird: ['stoneBird', 'stoneWing', 'stoneSky'],
  duck: ['stoneDuck', 'stoneRain', 'stoneShip'],
  fowl: ['stoneFeast', 'stoneCrops'],
  hound: ['stoneDog', 'stoneHunt', 'stoneFox'],
  cat: ['stoneCat', 'stoneClaw'],
  serpent: ['stoneSnake', 'stoneVenom', 'stoneLizard'],
  spider: ['stoneSpider', 'stoneThread', 'stoneNet'],
  frog: ['stoneFrog', 'stoneFish'],
  bear: ['stoneBear', 'stoneApe', 'stoneMonkey'],
  deer: ['stoneDeer', 'stoneSwift'],
  wolf: ['stoneWolf', 'stoneMoon'],
  ram: ['stoneGoat', 'stoneChampion', 'stoneDefiance'],
  croc: ['stoneCrocodile', 'stoneShark'],
  turtle: ['stoneTurtle', 'stonePangolin'],
};

/**
 * THE CURATED TABLE -- twenty guardians.
 *
 * Each row is: the substance, the shape, the body that shape is drawn with,
 * and a name in the project's voice -- "the name carries flavour, the
 * description states the mechanic", so nothing here is called "Iron Guardian
 * Summon". The description is generated from the mechanic at build time (see
 * `oddSummonDesc`) and says what it does.
 *
 * Three of these are the user's own examples, written down first as the anchor
 * for the rest: iron + bull, iron + bird, and the solid gold duck.
 */
export const ODD_SUMMON_ROWS = [
  // --- the user's three, first -------------------------------------------
  { material: 'iron', shape: 'bull', body: 'minotaur', name: 'The Ploughshare',
    flavour: 'Someone melted down a season of farm tools and it stood up.' },
  { material: 'iron', shape: 'bird', body: 'duck', name: 'Cast-Iron Duck',
    flavour: 'It should not float. It does, and it does not explain itself.' },
  { material: 'gold', shape: 'bird', body: 'duck', name: 'The Golden Goose',
    flavour: 'Worth more than the adventurer holding its leash, and it knows.' },

  // --- iron, the workhorse -----------------------------------------------
  // WAS iron+duck, called Anvil-Bill, until the twenty were rendered side by
  // side: an iron duck from the `duck` shape and an iron duck from the `bird`
  // shape are the same material on the same body, so the sheet had two names
  // over one picture. Nothing in the data could have caught that -- the rows
  // differ in every field the fault check reads. Bone is a material the set
  // used once and the joke survives the move intact.
  { material: 'bone', shape: 'duck', body: 'duck', name: 'The Wishbone',
    flavour: 'Snapped in half by two people who both got what they asked for.' },
  { material: 'iron', shape: 'fowl', body: 'chicken', name: 'Sunday Roast',
    flavour: 'Every stewpot in the province has been ruined trying.' },
  // WAS the hellhound body. Measured after the render: the Cindermaw's art has
  // a median luminance of 37 against the Bullwarden's 84, and even with the
  // range stretch (palettes.js `lumaRange`) an iron one comes out a silhouette
  // with two horns. A luminance remap cannot rescue a sheet that is mostly
  // shadow, and no amount of ramp tuning changes that -- the honest answer for
  // a CURATED table is that this body does not take a material, so it does not
  // get one. The Panterimp sits at 95 and reads as iron immediately.
  { material: 'iron', shape: 'hound', body: 'wolf', name: 'The Gate Latch',
    flavour: 'It sits where you leave it until something tries the door.' },

  // --- the mineral substances ---------------------------------------------
  { material: 'crystal', shape: 'bull', body: 'minotaur', name: 'The Chandelier',
    flavour: 'It rings, faintly, in the key of whatever is about to hit it.' },
  { material: 'crystal', shape: 'spider', body: 'spider', name: 'The Lattice',
    flavour: 'Eight legs of cut glass, and it walks without a single chime.' },
  { material: 'crystal', shape: 'turtle', body: 'boar', name: 'The Geode',
    // There is no turtle in the roster, so the turtle shape gets the animal
    // the game HAS that means the same thing: a Gemtusk is a boar wearing its
    // own armour. A shape supplies the idea, not a literal species.
    flavour: 'Gemtusk all the way through, which is not how a Gemtusk works.' },
  { material: 'glass', shape: 'cat', body: 'whitelion', name: 'The Vitrine',
    flavour: 'You can see the fight happening on the other side of it.' },
  { material: 'glass', shape: 'serpent', body: 'cobra', name: 'The Decanter',
    flavour: 'Full of something. Nobody has ever got the stopper out.' },
  { material: 'stone', shape: 'frog', body: 'giantToad', name: 'The Milestone',
    flavour: 'Roadside for a century, and it has decided to come along.' },
  { material: 'stone', shape: 'bear', body: 'yeti', name: 'The Cairn',
    flavour: 'Stacked by hands that meant it as a warning, not a summons.' },
  { material: 'stone', shape: 'croc', body: 'crocodile', name: 'The Riverbed',
    flavour: 'Silt and old flood-stone, holding the shape the water left.' },

  // --- the elemental substances -------------------------------------------
  { material: 'ice', shape: 'deer', body: 'direbuck', name: 'The Thaw-Never',
    flavour: 'It leaves no tracks, only a colder patch that lasts a week.' },
  { material: 'ice', shape: 'wolf', body: 'wolf', name: 'The Long Winter',
    flavour: 'The pack it belonged to is a hundred years under the drift.' },
  { material: 'ember', shape: 'ram', body: 'hornram', name: 'The Forge Ram',
    flavour: 'Struck sparks off a stone wall, then went through the wall.' },
  { material: 'bone', shape: 'bear', body: 'yeti', name: 'The Reliquary',
    flavour: 'Assembled from a great many animals, none of them this one.' },
  { material: 'shadow', shape: 'bird', body: 'duck', name: 'The Rumour',
    // The set needs one that is not funny, and a shadow duck is the funniest
    // thing here right up until it is the thing standing between the player
    // and a Direjaw.
    flavour: 'Nobody who saw it agrees on what it was. All of them ran.' },
  { material: 'wood', shape: 'bear', body: 'yeti', name: 'The Green Man',
    flavour: 'Carved by somebody who had only ever had a bear described to them.' },
];

/**
 * The expanded lookup: every (essence, stone) pair any row answers to.
 *
 * Built once at module load rather than searched per call, because this is
 * consulted for every socket of every kit ever rolled and a linear scan of
 * twenty rows times two id lists is exactly the sort of thing that only shows
 * up as "kit generation got slower" three rounds later.
 */
export const ODD_SUMMONS = (() => {
  const out = {};
  for (const row of ODD_SUMMON_ROWS) {
    for (const e of (MATERIAL_ESSENCES[row.material] || [])) {
      for (const st of (SHAPE_STONES[row.shape] || [])) out[`${e}|${st}`] = row;
    }
  }
  return out;
})();

/** How many PAIRS reach a guardian -- the reach, not the roster. */
export const ODD_SUMMON_PAIRS = Object.keys(ODD_SUMMONS).length;

/** How many there are, so the suite pins a floor rather than a magic number. */
export const ODD_SUMMON_COUNT = ODD_SUMMON_ROWS.length;

/**
 * The guardian's numbers. One place, read by the scene and by the suite.
 *
 * DELIBERATELY MODEST. A bodyguard that halved incoming damage and held six
 * monsters would make every other defensive ability in the game a worse
 * version of a duck. It reduces by a tenth, holds three, and re-shouts every
 * eight seconds -- enough that the player can feel the difference in a pack
 * fight, not enough to be the answer to one.
 */
export const ODD_GUARD = {
  /** Incoming damage the player takes off while inside the aura. */
  auraPct: 0.10,
  auraRadius: 190,
  /** The taunt it shouts on its own clock. */
  tauntRadius: 210,
  tauntDuration: 5,
  tauntMax: 3,
  tauntEvery: 8,
  /**
   * Its own hit points, as a fraction of the player's maximum.
   *
   * A guardian HAS to be killable. A taunt from something that cannot die is
   * not a tank, it is a permanent crowd-control field with no counterplay, and
   * a pack that can kill the duck is what makes calling the duck a decision.
   */
  hpPct: 0.55,
  /**
   * How long it stands, and how long before it can be called again.
   *
   * PINNED TO THE MILDEST CORNER OF THE EXISTING SPECTRUM -- not to numbers of
   * its own. The user's summon bands are 30s-3min of life against a 2-10min
   * cooldown, and round 59's suite checks every generated summon against them.
   * The first draft here pinned 240s/90s, which is outside both ends: 98
   * violations, caught by that suite the first time it ran.
   *
   * Which is the right correction and not a grudging one. The spectrum trades
   * LIFE for POWER -- shorter and dearer means stronger -- and a guardian has
   * no power to trade, so it belongs at the weak end: the longest life the
   * bands allow on the cheapest cooldown they allow. That is a real position
   * on the existing curve rather than an exemption from it, and it is still
   * three minutes up on a two-minute cooldown, which is the "constant summons"
   * the user asked for.
   *
   * Left to the roll it came out at 78 seconds on an eight-minute cooldown -- a
   * bodyguard present for a sixth of the time, and useless as the front line
   * of a build.
   */
  duration: 180,
  cooldown: 120,
};

/** The key this table is looked up by. */
export function oddSummonKey(essId, stoneId) { return `${essId}|${stoneId}`; }

/**
 * The odd summon for an (essence, stone) pair, or null.
 *
 * Null is the overwhelmingly common answer and that is the point: 189 pairs
 * against 148 essences x 184 stones means an odd summon is something a player
 * FINDS, and a table that answered every pair would make it wallpaper.
 */
export function oddSummonFor(essId, stoneId) {
  if (!essId || !stoneId) return null;
  const row = ODD_SUMMONS[oddSummonKey(essId, stoneId)];
  if (!row) return null;
  const mat = SUMMON_MATERIALS[row.material];
  const body = ODD_SUMMON_BODIES[row.body];
  if (!mat || !body) return null;
  // The key identifies the GUARDIAN, not the pair that reached it. Nine
  // pairs on average lead to each row, and keying by the pair would let one
  // kit hold two Ploughshares (Iron+Cattle in one socket, Shield+Grazen in
  // another) that every downstream identity check read as different things.
  return { key: `${row.material}+${row.shape}`, ...row, mat, bodyDef: body };
}

/**
 * The description, generated from the numbers rather than typed beside them.
 *
 * "The name carries flavour, the description states the mechanic" -- so The
 * Ploughshare's card says what a guardian does, in the same words for all
 * twenty, and the flavour line carries the joke.
 */
export function oddSummonDesc(row) {
  const pct = Math.round(ODD_GUARD.auraPct * 100);
  const noun = row.mat.name.toLowerCase();
  const a = /^[aeiou]/.test(noun) ? 'an' : 'a';
  return `Calls ${a} ${noun} guardian that deals no damage. `
    + `It taunts up to ${ODD_GUARD.tauntMax} nearby foes every ${ODD_GUARD.tauntEvery}s `
    + `and reduces damage you take by ${pct}% while you are near it.`;
}

/**
 * Everything wrong with this table, as a list, so a fault prints which row
 * broke which rule instead of a bare assertion failure.
 *
 * The ramp rules are the world palettes' own (palettes.js `rampFaults`),
 * applied here because a material is a ramp and the same two mistakes -- a
 * non-monotonic ramp inverting the shading, a narrow one flattening the
 * creature to a silhouette -- are available to make twice.
 */
export function oddSummonFaults() {
  const bad = [];
  const luma = (c) => 0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255);
  for (const [k, m] of Object.entries(SUMMON_MATERIALS)) {
    if (!Array.isArray(m.ramp) || m.ramp.length < 4) { bad.push(`${k}:too-few-stops`); continue; }
    if (m.ramp.some(v => typeof v !== 'number' || !Number.isFinite(v))) { bad.push(`${k}:bad-stop`); continue; }
    let prev = -1;
    for (const s of m.ramp) {
      if (luma(s) <= prev) { bad.push(`${k}:not-monotonic`); break; }
      prev = luma(s);
    }
    const span = luma(m.ramp[m.ramp.length - 1]) - luma(m.ramp[0]);
    if (span < 100) bad.push(`${k}:flat(${Math.round(span)})`);
  }
  const names = new Set();
  const shapesUsed = new Set(), materialsUsed = new Set();
  const pairs = new Set();
  // WHAT THE SPRITE SHEET ACTUALLY IS. A guardian's picture is exactly
  // (material, body) -- the shape only chooses which body, and the material
  // remap flattens the body's own palette shades to one. So two rows sharing
  // both are TWO NAMES OVER ONE PICTURE, and every other check in this
  // function passes on them: they differ in shape, in name, in flavour, in the
  // stones that reach them.
  //
  // Round 76 shipped exactly that in its first draft -- an iron duck from the
  // `bird` shape and an iron duck from the `duck` shape -- and it was found by
  // rendering the twenty side by side, not by any assertion. This is that
  // finding written down so it cannot come back.
  const pictures = {};
  for (const row of ODD_SUMMON_ROWS) {
    const pic = `${row.material}|${row.body}`;
    if (pictures[pic]) bad.push(`${row.name}:same picture as ${pictures[pic]} (${pic})`);
    pictures[pic] = row.name;
  }
  for (const row of ODD_SUMMON_ROWS) {
    const k = `${row.material}+${row.shape}`;
    if (!SUMMON_MATERIALS[row.material]) bad.push(`${k}:no-material(${row.material})`);
    if (!MATERIAL_ESSENCES[row.material]) bad.push(`${k}:no-essence-list(${row.material})`);
    if (!SHAPE_STONES[row.shape]) bad.push(`${k}:no-stone-list(${row.shape})`);
    if (!ODD_SUMMON_BODIES[row.body]) bad.push(`${k}:no-body(${row.body})`);
    if (!row.name) bad.push(`${k}:unnamed`);
    if (names.has(row.name)) bad.push(`${k}:duplicate-name(${row.name})`);
    names.add(row.name);
    if (!row.flavour) bad.push(`${k}:no-flavour`);
    // TWO ROWS ON THE SAME (material, shape) would make one of them
    // unreachable -- the index below is a map, so the second silently wins
    // every pair and the first is a name that exists and never appears.
    if (pairs.has(k)) bad.push(`${k}:duplicate-pair`);
    pairs.add(k);
    materialsUsed.add(row.material); shapesUsed.add(row.shape);
  }
  // THE CHECK THAT ACTUALLY MATTERS. A typo'd essence or stone id makes every
  // row using that list unreachable and nothing anywhere fails -- the lookup
  // simply never matches, which is this project's fault class 1 wearing a
  // table for a hat. `stoneBoar` was in the first draft of this file and does
  // not exist; it cost one run of this function to find.
  for (const [m, ids] of Object.entries(MATERIAL_ESSENCES)) {
    if (!SUMMON_MATERIALS[m]) bad.push(`essences ${m}:no-such-material`);
    if (!materialsUsed.has(m)) bad.push(`essences ${m}:unused`);
    for (const e of ids) if (!ESSENCE_CATALOG[e]) bad.push(`essences ${m}:no-such-essence(${e})`);
  }
  for (const [sh, ids] of Object.entries(SHAPE_STONES)) {
    if (!shapesUsed.has(sh)) bad.push(`stones ${sh}:unused`);
    for (const st of ids) if (!STONE_CATALOG[st]) bad.push(`stones ${sh}:no-such-stone(${st})`);
  }
  // A stone id claimed by two shapes would give one pair two answers, and
  // which one wins depends on row order -- a real bug that reads as a typo.
  const stoneOwner = {};
  for (const [sh, ids] of Object.entries(SHAPE_STONES)) {
    for (const st of ids) {
      if (stoneOwner[st]) bad.push(`stones ${st}:claimed by ${stoneOwner[st]} and ${sh}`);
      stoneOwner[st] = sh;
    }
  }
  const essOwner = {};
  for (const [m, ids] of Object.entries(MATERIAL_ESSENCES)) {
    for (const e of ids) {
      if (essOwner[e]) bad.push(`essences ${e}:claimed by ${essOwner[e]} and ${m}`);
      essOwner[e] = m;
    }
  }
  // A body that names a monster family the atlas does not carry would spawn
  // the fallback dot and look exactly like a summon that failed.
  for (const [k, b] of Object.entries(ODD_SUMMON_BODIES)) {
    if (b.kind === 'family' && !MONSTER_ART[b.family]) bad.push(`body ${k}:no-art(${b.family})`);
    // And a body nothing uses is dead data: the table is curated, so an
    // unused body is a row somebody meant to write and did not.
    if (!ODD_SUMMON_ROWS.some(r => r.body === k)) bad.push(`body ${k}:unused`);
  }
  return bad;
}
