// ===========================================================================
// ROUND 269 -- THE MANSIONS, AND WHO LIVES IN THEM.
//
//   10) "Aristocratic estates" -- asked which reading: "option 2 [nobles,
//       servants, guards walking the grounds of each estate] but also large
//       multi level and multi room interiors."
//   11) "Ashford / Meadowlark relocation" -- "Inside a mansion".
//
// WHAT THERE WAS. Twenty-three mansions stand in the game -- four in Cadence's
// aristocratic quarter, nineteen across the five grid cities -- and every one
// of them was entered through the generic door pass, which sends a player into
// the house pool: a cottage with a hearth and a stool. A mansion was a house
// with a bigger picture outside.
//
// WHAT A MANSION IS NOW. Eight rooms on two floors, joined the way the Society
// hall and its market are joined (round 263's rule: every internal way through
// is a door or a stair, on a north or west wall, facing the way that wall
// implies):
//
//   ground floor   foyer -- parlour, dining hall -- kitchen
//                  foyer -- stairs up
//   upper floor    landing -- master bedroom, study, guest room
//
// A POOL, NOT ONE SET PER MANSION. Twenty-three mansions at eight rooms is 184
// rooms, which would nearly double the interior band for places a player visits
// a handful of times. The house pool already solved this -- a small number of
// rooms, re-dressed for whichever building you walk into (`_undressHouseRoom`)
// -- and this is the same machinery at mansion size: MANSION_POOL sets, each
// dressed on entry with THAT estate's furniture and THAT estate's household.
// The household is seeded off the estate, so the same house is the same family
// every time you visit it, and the two named nobles are always at home.
// ===========================================================================
import { FURN_WALL_TILES } from './furniture.js';

export const MANSION_POOL = 2;

/**
 * The rooms of one mansion. `links` are the ways through, in THIS room's tile
 * coordinates; the far room's link back is declared on the far room, so both
 * ends are authored and `mansionFaults` checks they agree.
 *
 * Every link is on the north wall (ty 1, facing south-west) or the west wall
 * (tx 1, facing south-east) -- the two back runs; the other two draw nothing.
 */
export const MANSION_ROOMS = [
  { key: 'foyer', level: 0, name: 'The entrance hall', w: 18, h: 14, floor: 'marble',
    links: [
      { to: 'landing', tx: 9, ty: 1, piece: 'stairFull', face: 'north', label: 'go upstairs' },
      { to: 'parlour', tx: 1, ty: 6, piece: 'doorWood', face: 'southeast', label: 'go through to the parlour' },
      { to: 'dining', tx: 14, ty: 1, piece: 'doorWood', face: 'southwest', label: 'go through to the dining hall' },
    ] },
  { key: 'parlour', level: 0, name: 'The parlour', w: 14, h: 11, floor: 'hall',
    links: [{ to: 'foyer', tx: 1, ty: 5, piece: 'doorWood', face: 'southeast', label: 'go back to the entrance hall' }] },
  { key: 'dining', level: 0, name: 'The dining hall', w: 18, h: 11, floor: 'hall',
    links: [
      { to: 'foyer', tx: 1, ty: 5, piece: 'doorWood', face: 'southeast', label: 'go back to the entrance hall' },
      { to: 'kitchen', tx: 14, ty: 1, piece: 'doorWood', face: 'southwest', label: 'go through to the kitchen' },
    ] },
  { key: 'kitchen', level: 0, name: 'The kitchen', w: 12, h: 10, floor: 'forge',
    links: [{ to: 'dining', tx: 1, ty: 5, piece: 'doorWood', face: 'southeast', label: 'go back to the dining hall' }] },
  { key: 'landing', level: 1, name: 'The upper landing', w: 18, h: 11, floor: 'hall',
    links: [
      { to: 'foyer', tx: 1, ty: 5, piece: 'stairFull', face: 'west', label: 'go downstairs' },
      { to: 'master', tx: 4, ty: 1, piece: 'doorWood', face: 'southwest', label: 'go into the master bedroom' },
      { to: 'study', tx: 9, ty: 1, piece: 'doorWood', face: 'southwest', label: 'go into the study' },
      { to: 'guest', tx: 14, ty: 1, piece: 'doorWood', face: 'southwest', label: 'go into the guest room' },
    ] },
  { key: 'master', level: 1, name: 'The master bedroom', w: 16, h: 12, floor: 'hall',
    links: [{ to: 'landing', tx: 1, ty: 6, piece: 'doorWood', face: 'southeast', label: 'go back to the landing' }] },
  { key: 'study', level: 1, name: 'The study', w: 14, h: 11, floor: 'hall',
    links: [{ to: 'landing', tx: 1, ty: 5, piece: 'doorWood', face: 'southeast', label: 'go back to the landing' }] },
  { key: 'guest', level: 1, name: 'The guest room', w: 12, h: 10, floor: 'hall',
    links: [{ to: 'landing', tx: 1, ty: 5, piece: 'doorWood', face: 'southeast', label: 'go back to the landing' }] },
];
export const MANSION_ROOM_BY_KEY = Object.fromEntries(MANSION_ROOMS.map(r => [r.key, r]));

export const mansionRoomId = (set, key) => `mansion_${set}_${key}`;

/**
 * The furniture. Everything stands at least FURN_WALL_TILES off the back
 * walls -- round 267's rule -- except the pieces that belong against one (a
 * fireplace, a portrait, a sideboard), which are round-23 props drawn flush.
 * The fancy table throughout: this is where the polished one lives.
 */
const F = FURN_WALL_TILES;
export const MANSION_FURNISH = {
  foyer: [
    { key: 'sculpture', tx: 4, ty: 1 }, { key: 'sculpture', tx: 12, ty: 1 },
    { key: 'paintPortrait', tx: 1, ty: 3 }, { key: 'paintLandscape', tx: 1, ty: 10 },
    { key: 'vasePorcelain', tx: 6, ty: F + 1 }, { key: 'vasePorcelain', tx: 12, ty: F + 1 },
    { key: 'rugRound', tx: 9, ty: 7 },
    { key: 'planter', tx: 3, ty: 11 }, { key: 'planter', tx: 15, ty: 11 },
  ],
  parlour: [
    { key: 'fireplaceLit', tx: 7, ty: 1 }, { key: 'paintPortrait', tx: 11, ty: 1 },
    { key: 'rugRound', tx: 7, ty: 5 },
    { key: 'tableSmall', tx: 7, ty: 5 },
    { key: 'chairPadded', tx: 5, ty: 5 }, { key: 'chairPadded', tx: 9, ty: 5 },
    { key: 'benchRed', tx: 7, ty: 8 },
    { key: 'vaseGlass', tx: 11, ty: 7 },
  ],
  dining: [
    { key: 'fireplaceLit', tx: 8, ty: 1 }, { key: 'sideboard', tx: 4, ty: 1 },
    { key: 'paintLandscape', tx: 11, ty: 1 },
    { key: 'tableLong', tx: 6, ty: 6 }, { key: 'tableLong', tx: 10, ty: 6 },
    { key: 'chairPadded', tx: 5, ty: 4 }, { key: 'chairPadded', tx: 8, ty: 4 },
    { key: 'chairPadded', tx: 11, ty: 4 }, { key: 'chairPadded', tx: 5, ty: 8 },
    { key: 'chairPadded', tx: 8, ty: 8 }, { key: 'chairPadded', tx: 11, ty: 8 },
  ],
  kitchen: [
    { key: 'stoveTiled', tx: 4, ty: 1 }, { key: 'washTub', tx: 7, ty: 1 },
    { key: 'tableRound', tx: 6, ty: 5 }, { key: 'stoolWood', tx: 4, ty: 5 },
    { key: 'barrelStack', tx: 9, ty: 2 }, { key: 'sacks', tx: 9, ty: 7 },
    { key: 'crateProduce', tx: 3, ty: 8 },
  ],
  landing: [
    { key: 'paintPortrait', tx: 6, ty: 1 }, { key: 'paintPortrait', tx: 11, ty: 1 },
    { key: 'rugRound', tx: 9, ty: 6 },
    { key: 'benchRed', tx: 6, ty: 8 }, { key: 'vasePorcelain', tx: 13, ty: 8 },
  ],
  master: [
    { key: 'fireplaceLit', tx: 10, ty: 1 },
    { key: 'bedCanopy', tx: 5, ty: F + 1 },
    { key: 'nightWood', tx: 3, ty: F }, { key: 'nightWood', tx: 7, ty: F },
    { key: 'rugRound', tx: 8, ty: 7 },
    { key: 'sideboard', tx: 1, ty: 9 }, { key: 'chairPadded', tx: 12, ty: 7 },
  ],
  study: [
    { key: 'scrollStand', tx: 4, ty: 1 }, { key: 'scrollStand', tx: 6, ty: 1 },
    { key: 'scrollStand', tx: 8, ty: 1 }, { key: 'gemCase', tx: 11, ty: 1 },
    { key: 'tableLong', tx: 7, ty: 6 }, { key: 'chairPadded', tx: 7, ty: 4 },
    { key: 'rugRound', tx: 7, ty: 6 }, { key: 'paintLandscape', tx: 1, ty: 8 },
  ],
  guest: [
    { key: 'bedFluffy', tx: 4, ty: F }, { key: 'nightWood', tx: 7, ty: F },
    { key: 'rugRound', tx: 6, ty: 6 }, { key: 'chairPadded', tx: 9, ty: 6 },
    { key: 'paintLandscape', tx: 9, ty: 1 },
  ],
};

/** The pool of rooms, ready for INTERIOR_ROOMS. Positions are placeholders;
 *  `resiteInteriorsIntoBand` repacks every room, as it does the vehicles'. */
export function buildMansionPool() {
  const rooms = [];
  for (let set = 0; set < MANSION_POOL; set++) {
    for (const def of MANSION_ROOMS) {
      const id = mansionRoomId(set, def.key);
      const room = {
        id, building: null, noExterior: true, lazy: true,
        mansionSet: set, mansionKey: def.key, level: def.level,
        name: def.name,
        enterLabel: 'go into the house',
        floor: def.floor,
        x: 400, y: 60000 + rooms.length * 200, w: def.w, h: def.h,
        // Only the foyer opens onto the street; the others' `door` is a
        // placeholder the wall builder needs, closed off like the vehicles'.
        door: def.key === 'foyer' ? { at: Math.floor(def.w / 2) - 1, span: 2 } : { at: 1, span: 0 },
        inners: def.links.map(l => ({ tx: l.tx, ty: l.ty, toRoom: mansionRoomId(set, l.to), label: l.label })),
        props: mansionProps(def.key),
        npcs: [],
      };
      rooms.push(room);
    }
  }
  return rooms;
}

/** A room's furniture plus the pieces its ways through stand on. */
export function mansionProps(key) {
  const def = MANSION_ROOM_BY_KEY[key];
  if (!def) return [];
  const props = (MANSION_FURNISH[key] || []).map(p => ({ ...p }));
  for (const l of def.links) props.push({ key: l.piece, face: l.face, tx: l.tx, ty: l.ty });
  return props;
}

// ---------------------------------------------------------------------------
// THE HOUSEHOLDS.
// ---------------------------------------------------------------------------
const HOUSES = ['Vandermere', 'Hollowell', 'Carrow', 'Linfield', 'Ostrander', 'Brightwater',
  'Talmarsh', 'Everly', 'Quillon', 'Ravensholt', 'Dunmore', 'Sallowmere', 'Pembrook',
  'Wexley', 'Harrowgate', 'Thornbury', 'Aldercott', 'Greyholm', 'Marchbank', 'Westerly'];
const LORDS = ['Aldric', 'Casimir', 'Edmund', 'Florian', 'Gideon', 'Lucan', 'Percival', 'Rupert'];
const LADIES = ['Adeline', 'Beatrix', 'Celestine', 'Isolde', 'Lavinia', 'Octavia', 'Rosalind', 'Vivienne'];
const SERVANT_M = ['Abel', 'Corwin', 'Dunstan', 'Hobb', 'Jory', 'Osric', 'Tamsin', 'Wat'];
const SERVANT_F = ['Agnes', 'Bess', 'Elsie', 'Hester', 'Maud', 'Nell', 'Peg', 'Rosie'];

/** A small seeded stream, so a household is the same household every visit. */
function rngFor(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

/**
 * The two nobles who stood in round 50's "noble enclave, west side of town".
 * That spot predates the aristocratic quarter by 137 rounds; they live in its
 * first two houses now, which are what their surnames were always the names
 * of. Their own lines, kept -- Lord Ashford's portraits were always of
 * himself standing near a house, and now it is his.
 */
export const NAMED_RESIDENTS = {
  'nek_city:0': {
    house: 'Ashford',
    people: [{
      name: 'Lord Ashford', artKey: 'npc_noble_standing', room: 'study', tx: 7, ty: 8, facing: 'south',
      dialogue: "I've commissioned three portraits of myself standing near this house. None of them capture it. Perhaps a fourth.",
    }],
  },
  'nek_city:1': {
    house: 'Meadowlark',
    people: [{
      name: 'Priss Meadowlark', artKey: 'npc_posh_noble_girl', room: 'parlour', tx: 4, ty: 8, facing: 'southeast',
      dialogue: "Is it true a wyrm's hoard is really just bones and old coin? Positively disappointing, if so.",
    }],
  },
};

/**
 * Everybody in one estate: indoors (by room) and on the grounds.
 *
 * `estateKey` is `<settlement>:<estate index>`. The household is a noble and
 * their spouse, a steward, a cook, a maid; the grounds get a gardener and two
 * gate guards. The named residents replace the generated head of house.
 */
export function mansionHousehold(estateKey) {
  const rng = rngFor(`household|${estateKey}`);
  const named = NAMED_RESIDENTS[estateKey];
  const house = named ? named.house : pick(rng, HOUSES);
  const lord = pick(rng, LORDS), lady = pick(rng, LADIES);
  const indoor = [];
  if (named) indoor.push(...named.people.map(p => ({ ...p })));
  else {
    indoor.push({ name: `Lord ${lord} ${house}`, artKey: pick(rng, ['npc_noble_standing', 'npc_noble_standing_v1', 'npc_noble_standing_v2', 'npc_patterned_man']),
      room: 'study', tx: 7, ty: 8, facing: 'south',
      dialogue: pick(rng, [
        'You are standing in a house that has been in my family for nine generations. Do mind the rug.',
        'The Adventure Society sends someone round every spring to ask for a donation. Are you the one this spring?',
        'My grandfather built the east wing to spite his brother. The brother is dead and the east wing is still here, which I take to be the point.',
      ]) });
  }
  indoor.push({ name: `Lady ${lady} ${house}`, artKey: pick(rng, ['npc_posh_noble_girl_v1', 'npc_sleek_woman', 'npc_confident_woman']),
    room: named && named.people.some(p => p.room === 'parlour') ? 'landing' : 'parlour',
    tx: 9, ty: 7, facing: 'southwest',
    dialogue: pick(rng, [
      'We do not receive visitors before noon, as a rule. You appear to be an exception to several.',
      'If you are here about the garden party, it has been cancelled. If you are here about anything else, it has also been cancelled.',
      'The portraits are all of people who were very important once. That is what portraits are for.',
    ]) });
  indoor.push({ name: `${pick(rng, SERVANT_M)}, the steward`, artKey: pick(rng, ['npc_townsman', 'npc_townsman_v2', 'npc_patterned_man']),
    room: 'foyer', tx: 12, ty: 9, facing: 'south',
    dialogue: `Welcome to the house of ${house}. You will wipe your boots, and you will not touch the sculptures.` });
  indoor.push({ name: `${pick(rng, SERVANT_F)}, the cook`, artKey: pick(rng, ['npc_cheerful_peasant_girl', 'npc_cheerful_peasant_girl_v1']),
    room: 'kitchen', tx: 7, ty: 7, facing: 'southwest',
    dialogue: 'Out of my kitchen unless you are carrying onions. Are you carrying onions?' });
  indoor.push({ name: `${pick(rng, SERVANT_F)}, a maid`, artKey: pick(rng, ['npc_cheerful_peasant_girl_v2', 'npc_townsman_v3']),
    room: 'master', tx: 11, ty: 9, facing: 'south',
    dialogue: 'The bed is made, the fire is laid, and nobody has thanked me for either since the old lord died.' });
  const grounds = [
    { name: `${pick(rng, SERVANT_M)}, the gardener`, artKey: pick(rng, ['npc_farmer', 'npc_farmer_v1', 'npc_peasant_man']),
      where: 'lawn', facing: 'south',
      dialogue: `Forty years I've kept the ${house} lawns. The lawns have not noticed.` },
    { name: `House ${house} guard`, artKey: 'npc_city_guard', where: 'gateL', facing: 'south', guardPost: true,
      dialogue: `This is the ${house} estate. State your business or keep walking.` },
    { name: `House ${house} guard`, artKey: 'npc_city_guard', where: 'gateR', facing: 'south', guardPost: true,
      dialogue: 'The family is not receiving. The family is never receiving.' },
  ];
  return { house, indoor, grounds };
}

/** Faults a suite can assert without booting: every link has a way back, on a
 *  wall a door may hang on, and every household member stands in a real room. */
export function mansionFaults() {
  const out = [];
  for (const def of MANSION_ROOMS) {
    for (const l of def.links) {
      const far = MANSION_ROOM_BY_KEY[l.to];
      if (!far) { out.push(`${def.key} -> ${l.to}: no such room`); continue; }
      if (!far.links.some(b => b.to === def.key)) out.push(`${def.key} -> ${l.to} is one way`);
      const north = l.ty === 1 && l.tx >= 2, west = l.tx === 1;
      if (!north && !west) out.push(`${def.key}: way to ${l.to} is not on a back wall`);
      if (l.piece === 'doorWood' && north && l.face !== 'southwest') out.push(`${def.key}: north door faces ${l.face}`);
      if (l.piece === 'doorWood' && west && l.face !== 'southeast') out.push(`${def.key}: west door faces ${l.face}`);
      if (l.tx >= def.w - 2 || l.ty >= def.h - 2) out.push(`${def.key}: way to ${l.to} is off the floor`);
    }
  }
  for (const key of ['nek_city:0', 'nek_city:1', 'ont_city:2']) {
    const h = mansionHousehold(key);
    for (const p of h.indoor) if (!MANSION_ROOM_BY_KEY[p.room]) out.push(`${key}: ${p.name} is in no room`);
  }
  return out;
}
