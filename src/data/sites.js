// ============================================================================
// ROUND 63 -- PLACES WORTH WALKING TO.
//
// The user: "The world needs little vignettes and unique setpieces through the
// regions... The intent is to build a rich world with interesting unique sights
// scattered throughout." And, separately: "Per lore locations of thematically
// appropriate intensity spawn awakening stones occasionally and essences more
// rarely" -- Jason finding a blood essence in a sacrificial chamber, an
// awakening stone of the Feast in a pot of stew, a water essence at the mouth
// of rushing water.
//
// Those are one system, not two. A site is a place with a THEME, and the theme
// is what decides both what it looks like and what it can give up. The blood
// essence is not a random drop that happened to land in the cult chamber; it is
// in the cult chamber because that is where blood is.
//
// THE RARITY RULE, from the user: "The stone spawns themselves should be
// semi-rare even if the locations are not and finding a stone in one is
// intended to be a fun bonus of exploration not the easy way to collect your
// essences or awakening stones." So a site is usually just a sight. The
// chances below are per VISIT-CYCLE, not per approach, and essences sit well
// under stones because the user asked for stones "occasionally" and essences
// "more rarely".
//
// Item pools are resolved against the live catalogues by keyword rather than
// hand-listed, so a stone added in a later round joins the sites it belongs to
// without anyone remembering to come back here.
// ============================================================================

/** Per visit-cycle. Deliberately low -- see the rarity rule above. */
export const SITE_STONE_CHANCE = 0.22;
export const SITE_ESSENCE_CHANCE = 0.07;
/** How long before a picked-over site can hold something again (seconds). */
export const SITE_REFRESH_SECONDS = 900;

/**
 * tier: the lowest region index this site may appear in. The user: "Monsters
 * should still be appropriate to the region/rank. (i.e no dragons in Region 1)"
 * -- and the same restraint applies to the places themselves. A magma vent in
 * the starting meadow would say the wrong thing about where the player is.
 */
export const SITE_TYPES = {
  stoneCircle: {
    key: 'stoneCircle', tier: 0, label: 'The Standing Stones',
    blurb: 'Nine stones set on end, older than the road that avoids them.',
    theme: /\brock|\bearth|mountain|monolith|\brune|menhir|granite|slate|boulder|\bstanding/i,
    build: { kind: 'ring', prop: 'rock', count: 9, radius: 96 },
  },
  farmFields: {
    key: 'farmFields', tier: 0, label: 'The Long Fields',
    blurb: 'Furrows still holding their line, and something still growing in them.',
    theme: /plant|growth|seed|harvest|root|vine|grain|bloom|field|orchard|thorn|briar/i,
    build: { kind: 'yard', prop: 'barn', count: 1, scatter: 'crop', radius: 128 },
  },
  riverMouth: {
    key: 'riverMouth', tier: 0, label: 'The Race',
    blurb: 'Where the water narrows and shouts. Things wash up here.',
    theme: /fish|river|water|stream|tide|current|flow|rain|wave|deep|spring/i,
    needsWater: true,
    build: { kind: 'scatter', prop: 'rock', count: 6, radius: 88 },
  },
  hollowTree: {
    key: 'hollowTree', tier: 0, label: 'The Hollow',
    blurb: 'A trunk you could stand inside, and something has.',
    theme: /swarm|hive|nest|bird|beast|honey|wing|feather|hunt|fang|claw/i,
    build: { kind: 'grove', prop: 'tree', count: 5, radius: 84 },
  },
  battlefield: {
    key: 'battlefield', tier: 1, label: 'The Turned Ground',
    blurb: 'Nobody farms here. The ploughs kept finding things.',
    theme: /war|blood|battle|banner|valor|fallen|steel|iron|sword|shield|carrion/i,
    build: { kind: 'scatter', prop: 'rock', count: 7, radius: 112 },
  },
  mineCave: {
    key: 'mineCave', tier: 1, label: 'The Old Workings',
    blurb: 'A mine mouth, timbered and long abandoned. The seam was not exhausted.',
    theme: /\biron|\bore\b|metal|steel|forge|\bpick|delve|\bmine\b|anvil|hammer|copper|coal/i,
    build: { kind: 'mouth', prop: 'cave', count: 1, scatter: 'rock', radius: 100 },
    // ROUND 173 -- A DEN'S OWN LIST IS THE LEVER, AND THE BAND TABLE IS NOT.
    //
    // The eight new families went into REGION_DEN_FAMILIES and the probe
    // reported them in wells and realms and in ZERO caves. The band table does
    // not place anything: `denFamiliesFor` INTERSECTS a site's own list with
    // the band, so widening the band alone widened nothing, and a check that
    // read REGION_DEN_FAMILIES would have called it placed. The new names have
    // to be here, on the caves whose fiction wants them.
    den: true, denFamilies: ['slime', 'spider', 'skeleton', 'quillFiend', 'shellborn'],
    palette: 'rustwork',
  },
  shrine: {
    key: 'shrine', tier: 1, label: 'The Kept Shrine',
    blurb: 'Somebody still leaves offerings, and nobody admits to it.',
    theme: /\blight|radiant|divine|\bholy|grace|\bsun\b|dawn|blessing|prayer|saint|halo/i,
    // ROUND 63 -- `research`, not `portal`. Round 45 asserts that a portal
    // stands on its own square, and scattering shrine portals across four
    // regions made that assertion find one of MINE instead of the town's. A
    // small stone building reads as a kept shrine at least as well.
    build: { kind: 'yard', prop: 'research', count: 1, radius: 76 },
  },
  crystalHollow: {
    key: 'crystalHollow', tier: 1, label: 'The Glasswork',
    blurb: 'The ground here rings when you walk on it.',
    theme: /crystal|glass|prism|shard|quartz|gleam|mirror|refract|facet|ice|frost/i,
    build: { kind: 'ring', prop: 'rock', count: 6, radius: 72 },
    palette: 'rime',
  },
  magmaCave: {
    key: 'magmaCave', tier: 2, label: 'The Vent',
    blurb: 'The cave breathes out, and the breath is hot.',
    theme: /fire|flame|ember|magma|lava|forge|cinder|ash|scorch|burn|smoke/i,
    build: { kind: 'mouth', prop: 'cave', count: 1, scatter: 'rock', radius: 108 },
    den: true, denFamilies: ['hellhound', 'elemental', 'chimera', 'shellborn', 'sixArmApe'],
    palette: 'ember',
  },
  barrow: {
    key: 'barrow', tier: 2, label: 'The Sunken Barrow',
    blurb: 'A door in a hillside, and the hillside is the wrong shape.',
    theme: /shadow|death|undeath|bone|grave|tomb|wraith|dusk|umbra|rot|silence/i,
    build: { kind: 'mouth', prop: 'cave', count: 1, radius: 92 },
    den: true, denFamilies: ['skeleton', 'shade', 'bat', 'spiritSerpent', 'harbinger'],
    palette: 'bonefield',
  },
  rainbowGrove: {
    key: 'rainbowGrove', tier: 2, label: 'The Turning Grove',
    blurb: 'Every tree is a different colour and none of them are the right one.',
    theme: /dimension|prism|rainbow|shift|gate|between|veil|elsewhere|fold|portal|weft/i,
    build: { kind: 'grove', prop: 'tree', count: 9, radius: 104, rainbow: true },
    // The one site that must NOT take a palette: the point of the turning
    // grove is that every tree is a different colour, and a palette is one
    // colour for the whole place. They cancel each other out.
    noTouch: true,
  },
  cultChamber: {
    key: 'cultChamber', tier: 2, label: 'The Red Room',
    blurb: 'The stains go up the walls. Somebody was thorough, and recently.',
    theme: /blood|sacrifice|cult|ritual|vein|crimson|offering|heart|feast|hunger/i,
    build: { kind: 'mouth', prop: 'cave', count: 1, radius: 84 },
    den: true, denFamilies: ['shade', 'demon', 'bat', 'gnoll', 'spiritSerpent'],
    // The user's own example: "deep blood red trees and stones in a blood cult
    // hideout".
    palette: 'blood',
  },
  // ROUND 64 -- the rest of the user's example: "...hidden inside what from the
  // outside looks like a normal barn".
  //
  // This is the one site in the game whose OUTSIDE is deliberately boring. It
  // declares `innerPalette` rather than `palette`, so the blood is inside the
  // room and the barn in the field is a barn in a field; and `noTouch`, so the
  // touch roll can never hand it a colour and give the game away. The whole
  // effect is that nothing about the approach is worth remarking on.
  hiddenLair: {
    key: 'hiddenLair', tier: 2, label: 'The Field Barn',
    blurb: 'A barn standing on its own. The doors are shut and nobody works the field.',
    theme: /blood|sacrifice|cult|ritual|vein|crimson|offering|heart|feast|hunger/i,
    build: { kind: 'yard', prop: 'barn', count: 1, radius: 96 },
    den: true, denFamilies: ['shade', 'demon', 'skeleton', 'gnoll', 'steelRaptor'],
    innerPalette: 'blood',
    noTouch: true,
  },
};

export const SITE_KEYS = Object.keys(SITE_TYPES);

/**
 * Which monster families a den may hold at this region index.
 *
 * The user was explicit: "no dragons in Region 1". A den declares the families
 * that fit its FICTION, and the region decides which of those it is allowed to
 * actually spawn -- so a magma vent in region 2 holds elementals rather than
 * being cancelled outright for wanting a hellhound.
 */
export const REGION_DEN_FAMILIES = [
  ['slime', 'wolf', 'spider', 'boar', 'bat', 'quillFiend'],
  ['slime', 'wolf', 'spider', 'boar', 'bat', 'skeleton', 'raptor', 'lizard',
   // ROUND 173
   'quillFiend', 'gnoll', 'spiritSerpent'],
  ['spider', 'skeleton', 'raptor', 'lizard', 'shade', 'hellhound', 'elemental',
   'gnoll', 'spiritSerpent', 'steelRaptor', 'shellborn'],
  ['skeleton', 'shade', 'hellhound', 'elemental', 'chimera', 'demon', 'hydra', 'dragon',
   'shellborn', 'harbinger', 'sixArmApe', 'tidalTroll'],
];

/**
 * ROUND 103 -- THE SECOND ARGUMENT IS A TIER, NOT A REGION INDEX.
 *
 * It was a region index, and the two were the same number for exactly as long
 * as there were four regions: The Nek is index 0 and tier 0, Ontaria 1 and 1,
 * Elehyd 2 and 2, Bratugal 3 and 3. Round 103 added three more and the
 * coincidence broke -- Sirukh is index 4, clamped to 3, so every den on an Act
 * II island drew Bratugal's family list and held hellhounds, chimeras and
 * dragons. Caught by test_round63's own "no den holds a monster its region
 * forbids", which reported `magmaCave@4:hellhound`.
 *
 * The table is still four rows because a den's danger has four steps; what
 * changed is that the caller has to say which step, and `regionDenTier` in
 * regions.js is what answers that from a region's own declared spawn tiers.
 * Renamed rather than reinterpreted so no caller can keep passing an index
 * and be silently right for the first four regions.
 */
export function denFamiliesFor(site, tier) {
  const allowed = REGION_DEN_FAMILIES[Math.max(0, Math.min(3, tier))] || [];
  const want = site.denFamilies || [];
  const both = want.filter(f => allowed.includes(f));
  // A den whose own families are all too dangerous here falls back to what the
  // region does allow, rather than shipping an empty cave.
  return both.length ? both : allowed.slice(0, 3);
}

/**
 * The stones and essences a site can give up, resolved against the live
 * catalogues by keyword.
 *
 * Matching on the id AND the display name, because the two carry different
 * words: `stoneFeast` is matched by the id, "Awakening Stone of the Cauldron"
 * by the name. A site that matches nothing returns an empty pool and simply
 * never holds an item -- which is a silent failure, so `siteThemeGaps` below
 * exists to make it a loud one.
 */
/**
 * The `stone`/`ess` prefix is a NAMESPACE, not a theme word.
 *
 * Matching the raw id made the standing stones match 180 of the 180 stones in
 * the game -- every id begins with the literal string "stone", so a site whose
 * theme mentions rock matched all of them and became a universal dispenser
 * wearing a themed label. Stripped before testing.
 */
function themeText(id, def) {
  const bare = String(id).replace(/^(stone|ess)(?=[A-Z])/, '');
  return `${bare} ${(def && def.name) || ''}`;
}

export function sitePools(site, stoneCatalog, essenceCatalog, essences, paletteKey = null) {
  const re = site.theme;
  const pre = paletteKey ? PALETTE_THEME[paletteKey] : null;
  const hit = (id, def) => {
    const t = themeText(id, def);
    return re.test(t) || (pre ? pre.test(t) : false);
  };
  // ROUND 65 -- a god's own stone is never in a landmark. `godOnly` is the
  // same flag the drop table and the shop shelves read; a Divine stone the
  // player could stumble over in a cave would make the disciple chain that
  // pays it pointless.
  const stones = Object.keys(stoneCatalog || {})
    .filter(id => !(stoneCatalog[id] && stoneCatalog[id].godOnly))
    .filter(id => hit(id, stoneCatalog[id]));
  const ess = Object.keys(essenceCatalog || {})
    .filter(id => (!essences || essences[id]) && hit(id, essenceCatalog[id]));
  return { stones, essences: ess };
}

/** Every site type must be able to give up SOMETHING, or it is scenery that
 *  lies about being worth visiting. Asserted by the round-63 suite. */
export function siteThemeGaps(stoneCatalog, essenceCatalog, essences) {
  const bad = [];
  for (const key of SITE_KEYS) {
    const p = sitePools(SITE_TYPES[key], stoneCatalog, essenceCatalog, essences);
    if (!p.stones.length) bad.push(`${key}:no-stones`);
    if (!p.essences.length) bad.push(`${key}:no-essences`);
  }
  return bad;
}

/** How many sites a region carries. Enough to meet several on a crossing,
 *  few enough that meeting one still registers. */
export const SITES_PER_REGION = 14;

// ============================================================================
// ROUND 64 -- WHICH PLACES THE PALETTES TAKE.
//
// "...to be used in a SUBSET of the landmarks" (emphasis the design's, not the
// user's, but it is the operative word). Two routes in:
//
//  1. A site type whose fiction IS an element declares its palette outright --
//     the cult chamber is blood because the user said so, the vent is ember,
//     the workings are rustwork, the glasswork is rime, the barrow is bleached.
//     Five of the twelve types, always.
//
//  2. Any other type can be TOUCHED: a seeded minority of individual sites get
//     a palette they do not normally have, so the same Hollow is an ordinary
//     hollow in one region and the Bloodstruck Hollow in another. This is what
//     makes a palette a discovery rather than a label -- if every hollow were
//     the same colour there would be nothing to find.
//
// Touched sites announce themselves: `paletteLabel` renames them and
// `paletteBlurb` says what happened, because a red grove still calling itself
// The Hollow reads as a rendering fault rather than as a place.
// ============================================================================

/**
 * The lowest region index a palette may appear in, on the same logic that gates
 * the sites and the dens: "no dragons in Region 1". The gentle strangenesses
 * (gold, rust, bleached, acid green) can happen anywhere; blood and prismfold
 * want a region that has already turned hostile; voidfall is the last region's
 * alone.
 */
export const PALETTE_TIER = {
  verdigris: 0, gilt: 0, bonefield: 0, rustwork: 0,
  rime: 1, ember: 1, stormglass: 1,
  blood: 2, prismfold: 2,
  voidfall: 3,
};

/** Roughly one landmark in five, over the seven types that can be touched. */
export const SITE_TOUCH_CHANCE = 0.22;

export function touchPalettesFor(regionIndex) {
  const idx = Math.max(0, Math.min(3, regionIndex));
  return Object.keys(PALETTE_TIER).filter(k => PALETTE_TIER[k] <= idx);
}

/**
 * The palette this particular site wears, or null.
 *
 * `gateRoll` and `pickRoll` are two independent uniforms rather than one reused
 * twice: deriving the choice from the gate's own value ties which palette
 * appears to how narrowly it qualified, which is a correlation nobody wants and
 * nobody would ever go looking for.
 */
export function sitePaletteFor(type, regionIndex, gateRoll, pickRoll) {
  if (!type) return null;
  if (type.palette) return type.palette;
  if (type.noTouch) return null;
  if (gateRoll >= SITE_TOUCH_CHANCE) return null;
  const pool = touchPalettesFor(regionIndex);
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(pickRoll * pool.length))];
}

/**
 * What a palette adds to a site's item pool.
 *
 * A place that has gone blood-red holds blood-themed things. Without this the
 * Bloodstruck Hollow would still be handing out bird stones from the hollow's
 * own theme, which reads as the colour being paint rather than being what
 * happened here. The site's ORIGINAL theme is kept as well, not replaced -- it
 * is still a hollow.
 */
export const PALETTE_THEME = {
  blood: /blood|sacrifice|cult|ritual|vein|crimson|offering|heart|feast|hunger/i,
  ember: /fire|flame|ember|magma|lava|cinder|\bash|scorch|burn|smoke/i,
  rime: /frost|\bice\b|chill|freeze|rime|winter|glacier|\bcold|snow/i,
  stormglass: /lightning|storm|thunder|shock|spark|volt|bolt|charge|arc\b/i,
  verdigris: /plant|growth|nature|vine|root|bloom|thorn|verdant|leaf|seed|briar/i,
  voidfall: /shadow|void|\bdark|umbra|abyss|dusk|eclipse|silence|night/i,
  gilt: /\blight|radiant|divine|\bholy|\bsun\b|dawn|\bgold|gild|halo|grace|blessing/i,
  bonefield: /\bbone|grave|\bash|dust|husk|wither|\bpale|tomb|carrion/i,
  rustwork: /\biron|\bore\b|metal|steel|rust|forge|anvil|hammer|\bpick|copper/i,
  prismfold: /dimension|prism|rainbow|shift|gate|between|veil|fold|portal|elsewhere|weft/i,
};

/**
 * Every palette must name items that exist, or a touched site quietly stops
 * holding anything.
 *
 * ROUND 178 -- the line here used to read "Asserted by the round-64 suite
 * alongside siteThemeGaps", and it was wrong in both halves: no suite has
 * ever called this function, and the suite that asserts `siteThemeGaps` is
 * round 63's, not round 64's. This one was written beside a real check,
 * described as running with it, and left. A comment claiming a check runs is
 * WORSE than no comment at all, because the next reader stops looking. It is
 * in the data lane now, which is what the sentence was describing all along.
 *
 * Takes its catalogues as arguments -- calling it with none returns twenty
 * findings, every one of them the empty pools it was handed.
 */
export function paletteThemeGaps(stoneCatalog, essenceCatalog, essences) {
  const bad = [];
  for (const key of Object.keys(PALETTE_THEME)) {
    const p = sitePools({ theme: PALETTE_THEME[key] }, stoneCatalog, essenceCatalog, essences);
    if (!p.stones.length) bad.push(`${key}:no-stones`);
    if (!p.essences.length) bad.push(`${key}:no-essences`);
  }
  return bad;
}
