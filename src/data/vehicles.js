// ===========================================================================
// ROUND 196 -- NINE MODES OF TRANSPORT.
//
// The user: "Create 10 different color variations for each vehicle and
// transports are for sale in every city. Add a new vendor in the adventurer
// society market hall."
//
// WHAT THIS ROUND DOES AND WHAT IT DOES NOT. The ask covers four systems --
// the vehicles themselves, a vendor, travelling in one, and nine interiors up
// to an 80x80 dragon-house on three levels with its own merchant hall. Asked
// where to stop, the user chose VEHICLES AND THE VENDOR. So this file is
// written whole: every number the later rounds need is authored here now --
// the terrain a vehicle may cross, the ambush chance a tile of travel carries,
// the shape of each interior -- and those rounds read it rather than deriving
// it again from the brief. What this round USES is the art, the prices, the
// colourways and the shop.
//
// THE COLOURWAYS ARE PAINTED, NOT DELIVERED. Ten finished sheets per vehicle
// would be ninety files and about 90 MB of atlas for something the player sees
// one of. The game already paints a townsperson's clothes at runtime off a
// colour map (townFolk.js, round 134's trick), and a vehicle is an easier
// subject than a person: no skin, no hair, just hull and trim. So colourway 1
// is the art as it was drawn and the other nine are turned from it on a canvas
// the first time anybody looks at one.
//
// PRICES ARE THE USER'S, IN THE USER'S UNITS. Written as `{ rank, amount }`
// and converted through inventory.js's own 100:1 ladder, so "50 bronze" in the
// brief is `{ rank: 'bronze', amount: 50 }` here and nothing has to be
// re-derived by hand into normal-coin units.
// ===========================================================================
import { COIN_RANKS, COIN_CONVERSION } from './inventory.js';
import { packRgb, rgbToHsv, rotateHue, tintTo } from './townFolk.js';

/** The cell every vehicle sheet is packed at (tools/sheet_round196_vehicles.py). */
export const VEHICLE_CELL = 128;

/**
 * A vehicle's motion cycle, as the tool measured it.
 *
 * EVERY FRAME THE DELIVERY SHIPPED, AT A CONSTANT RATE. Two corrections from
 * the user, and the second one undoes a mistake the first one only half
 * caught. "Do not reduce the frame count on a single vehicle" killed the
 * importer's cap, so the beetle skitters on seventeen frames and the metal
 * wagon rolls on fifteen. But `frameMs` was still `720 / frames`, which fits
 * every cycle into the same 720 ms -- so the seventeen-frame beetle played at
 * 42 ms a frame and the seven-frame van at 103, and the extra frames bought
 * nothing but speed. "Some movements are more complex and require more
 * frames": the frames are there to show more of the motion, not to show the
 * same motion faster. So the RATE is constant and the CYCLE is as long as the
 * motion is complex.
 *
 * NOT PRELOADED THIS ROUND. Riding one is the next round; nine sheets of up to
 * 2176 x 1024 on the GPU buy nothing while the only place a vehicle appears is
 * a shop list. The sheets are on disk and this is what says so.
 */
export const VEHICLE_FRAME_MS = 70;      // ~14 fps, the rate the art is drawn for
const MOVE = (art, framesPerDir) => ({
  sheet: `${art}_move`, cell: VEHICLE_CELL, framesPerDir,
  frameMs: VEHICLE_FRAME_MS, cycleMs: framesPerDir * VEHICLE_FRAME_MS, footY: 127,
});

/**
 * THE TEN COLOURWAYS.
 *
 * `hue` turns every coloured ramp on the hull by that many degrees; `tint`
 * pulls the greys -- plate, iron, canvas, stone -- towards a colour, because
 * turning the hue of a grey does nothing at all and half of what these
 * vehicles are made of is grey.
 *
 * The first is the art as delivered and costs no texture, which is why it is
 * first: a player who never opens the colour list still gets the thing the
 * artist drew.
 */
export const VEHICLE_COLOURS = [
  { id: 'asbuilt', name: 'As built', hue: 0, tint: null },
  { id: 'oxblood', name: 'Oxblood', hue: 340, tint: [122, 52, 52] },
  { id: 'forest', name: 'Forest green', hue: 100, tint: [58, 96, 62] },
  { id: 'deepsea', name: 'Deep sea', hue: 200, tint: [46, 78, 110] },
  { id: 'amber', name: 'Amber', hue: 35, tint: [156, 114, 48] },
  { id: 'plum', name: 'Plum', hue: 290, tint: [86, 58, 104] },
  { id: 'verdigris', name: 'Verdigris', hue: 160, tint: [58, 110, 98] },
  { id: 'bone', name: 'Bone', hue: 45, tint: [196, 186, 162] },
  { id: 'ink', name: 'Ink', hue: 225, tint: [48, 50, 66] },
  { id: 'rose', name: 'Rose gold', hue: 15, tint: [178, 124, 110] },
];
export const VEHICLE_COLOUR_BY_ID = Object.fromEntries(VEHICLE_COLOURS.map(c => [c.id, c]));

/** Terrain a vehicle may cross. The user's own division: "the Beetle,
 *  clockwork house, covered wagons and camper vans are all ground only
 *  transport, the ship, dragon, and airboat are all terrain able to cross
 *  oceans and mountain tiles." */
export const TERRAIN_GROUND = 'ground';
export const TERRAIN_ANY = 'any';

/**
 * The nine, in the order the vendor lists them: cheapest first, which is also
 * worst-protected first.
 *
 * `ambush` is the chance that arriving in a new OVERWORLD SQUARE is met by
 * monsters -- the user's "monsters regularly attack you when you enter a new
 * tile 30% chance", with the tile confirmed as a square rather than a cell or
 * a world tile. Nothing reads it yet; the travel round does.
 *
 * `interior` is the shape the later round has to build. `plan` is the user's
 * own description of it, kept verbatim rather than translated into fields that
 * would lose what they asked for.
 */
export const VEHICLES = [
  {
    id: 'wagon_wood', name: 'Covered wagon', art: 'veh_wagon_wood',
    move: MOVE('veh_wagon_wood', 11),
    price: { rank: 'bronze', amount: 50 }, terrain: TERRAIN_GROUND, ambush: 0.30,
    blurb: 'Timber, canvas and two axles. It goes where a road goes and it is not proof against anything.',
    interior: { shape: 'rect', w: 10, h: 20, levels: 1, bedrooms: 0, rooms: false,
      plan: 'Interior is 10x20 tiles, no bedrooms' },
  },
  {
    id: 'wagon_metal', name: 'Plated wagon', art: 'veh_wagon_metal',
    move: MOVE('veh_wagon_metal', 15),
    price: { rank: 'bronze', amount: 100 }, terrain: TERRAIN_GROUND, ambush: 0.30,
    blurb: 'The same wagon under sheet steel. Heavier, louder, and it still draws exactly as much trouble.',
    interior: { shape: 'rect', w: 10, h: 20, levels: 1, bedrooms: 0, rooms: false,
      plan: 'Interior is 10x20 tiles, no bedrooms' },
  },
  {
    id: 'clockwork_house', name: 'Clockwork house', art: 'veh_clockwork_house',
    move: MOVE('veh_clockwork_house', 8),
    price: { rank: 'bronze', amount: 120 }, terrain: TERRAIN_GROUND, ambush: 0.30,
    blurb: 'A cottage on six brass legs, with a clock on the front that is right about as often as it is wound.',
    interior: { shape: 'rect', w: 25, h: 25, levels: 1, bedrooms: 0, rooms: true,
      plan: 'Interior is 25x25 tiles, small rooms' },
  },
  {
    id: 'beetle', name: 'Dome beetle', art: 'veh_beetle',
    move: MOVE('veh_beetle', 17),
    price: { rank: 'bronze', amount: 130 }, terrain: TERRAIN_GROUND, ambush: 0.30,
    blurb: 'It is alive, it is the size of a barn, and the glass on its back is the only window it has.',
    interior: { shape: 'circle', diameter: 40, levels: 1, bedrooms: 0, rooms: true,
      plan: 'interior is circular, 40 tile diameter, small rooms' },
  },
  {
    id: 'van_steel', name: 'Steel camper', art: 'veh_van_steel',
    move: MOVE('veh_van_steel', 7),
    price: { rank: 'bronze', amount: 140 }, terrain: TERRAIN_GROUND, ambush: 0.15,
    blurb: 'Riveted plate and a visor slit for a windscreen. Nothing on the road argues with it twice.',
    interior: { shape: 'rect', w: 15, h: 20, levels: 1, bedrooms: 0, rooms: false,
      plan: 'Interior is 15x20 tiles, no bedrooms' },
  },
  {
    id: 'van_rune', name: 'Rune camper', art: 'veh_van_rune',
    move: MOVE('veh_van_rune', 9),
    price: { rank: 'bronze', amount: 150 }, terrain: TERRAIN_GROUND, ambush: 0.15,
    blurb: 'Silver filigree over the same frame, and the filigree is not decoration.',
    interior: { shape: 'rect', w: 15, h: 20, levels: 1, bedrooms: 0, rooms: false,
      plan: 'Interior is 15x20 tiles, no bedrooms' },
  },
  {
    id: 'airboat', name: 'Bayou airboat', art: 'veh_airboat',
    move: MOVE('veh_airboat', 9),
    price: { rank: 'silver', amount: 50 }, terrain: TERRAIN_ANY, ambush: 0.05,
    blurb: 'A houseboat that has given up on water. The fan at the back is louder than the swamp it came from.',
    interior: { shape: 'rect', w: 40, h: 40, levels: 1, bedrooms: 4, rooms: true,
      plan: 'Interior is 40x40 tiles, w/ bedrooms' },
  },
  {
    id: 'skyship', name: 'Skyship', art: 'veh_skyship',
    move: MOVE('veh_skyship', 11),
    price: { rank: 'silver', amount: 80 }, terrain: TERRAIN_ANY, ambush: 0.03,
    blurb: 'Full sails on cloud. Whatever holds it up is not the wind, and the crew do not discuss it.',
    interior: { shape: 'rect', w: 40, h: 80, levels: 1, bedrooms: 6, rooms: true,
      features: ['captains_quarters', 'main_deck'],
      plan: 'Interior is 40x80 tiles, bedrooms, captains quarters, main deck' },
  },
  {
    id: 'dragonhouse', name: 'Dragon house', art: 'veh_dragonhouse',
    move: MOVE('veh_dragonhouse', 8),
    price: { rank: 'gold', amount: 10 }, terrain: TERRAIN_ANY, ambush: 0,
    blurb: 'A white dragon with a house on its back, and nothing in the world troubles either of them.',
    interior: { shape: 'rect', w: 80, h: 80, levels: 3, bedrooms: 8, rooms: true,
      features: ['merchant_hall', 'auctioneer', 'blacksmith'],
      plan: 'Interior is 80x80 tiles, bedrooms, 3 levels, auctioneer and blacksmith in a merchant hall' },
  },
];
export const VEHICLE_BY_ID = Object.fromEntries(VEHICLES.map(v => [v.id, v]));

// ---------------------------------------------------------------------------
// PRICES
// ---------------------------------------------------------------------------

// ===========================================================================
// ROUND 267 -- WHAT THE YARDMASTER WILL SELL YOU YET.
//
//   "there was an ask to reduce his options to only the first 5 items on the
//    list until the player was in Act 2 Part 2"
//
// THE FIRST FIVE, IN THE ORDER THIS FILE DECLARES THEM, which is the order the
// prices climb: the two wagons, the clockwork house, the beetle and the first
// camper. What it holds back is the pair at the top of the ground list and all
// three of the things that cross water and air -- the ship, the airboat and
// the dragon house. That is the right cut for a reason the table already
// encodes: `TERRAIN_ANY` is what those three have in common, and a player who
// can cross the sea in Act 1 can reach Act 3's region before the story does.
//
// THE ACT NUMBER IS A CONSTANT AND NOT A LITERAL, because "Act 2 Part 2" is
// his phrase and this table's is 2.5 (`ACTS` in acts.js: Act 2 is Ontaria,
// Act 2.5 is Sirukh Sands, and there is no other "part 2" of Act 2 in the
// spine). If he meant something else, this line is the whole change.
// ===========================================================================
export const VEHICLE_EARLY_COUNT = 5;
export const VEHICLE_FULL_STOCK_ACT = 2.5;

/** The list as it stands at `act`. Everything, once the story has got far
 *  enough; the first five before that. */
export function vehiclesForAct(act) {
  return (act >= VEHICLE_FULL_STOCK_ACT) ? VEHICLES : VEHICLES.slice(0, VEHICLE_EARLY_COUNT);
}

/** A price in normal-coin units, which is what `spendCoins` takes. */
export function vehiclePriceValue(price) {
  const i = COIN_RANKS.indexOf(price.rank);
  if (i < 0) return Infinity;
  return price.amount * Math.pow(COIN_CONVERSION, i);
}

/** "50 bronze" -- the way the user wrote it and the way a shop should say it. */
export function vehiclePriceText(price) {
  return `${price.amount} ${price.rank}`;
}

// ---------------------------------------------------------------------------
// THE PAINT
// ---------------------------------------------------------------------------

/** A ramp is worth turning if this many pixels are in it. Lower than the folk
 *  threshold because a vehicle sheet is one object rather than eight poses of
 *  a person, so its smaller parts -- lanterns, trim, a clock face -- carry
 *  fewer pixels and are exactly the parts worth turning. */
export const VEH_RAMP_MIN_PX = 24;
/** Greys inside this value window are hull. Below it is outline, above it is
 *  specular highlight, and tinting either of those makes a vehicle look like a
 *  sticker rather than a painted thing. */
export const VEH_GREY_V = [0.18, 0.92];

/**
 * The colours in a vehicle sheet, grouped into ramps.
 *
 * Same shape as `analyseFolk`'s output minus the parts that only make sense on
 * a person. A vehicle has no face to find, so this is the second half of that
 * function and none of the first.
 */
export function analyseVehicle(pixels, width, height) {
  const counts = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 40) continue;
    const k = packRgb(pixels[i], pixels[i + 1], pixels[i + 2]);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const groups = new Map();
  for (const [k, n] of counts) {
    const [h, s] = rgbToHsv((k >> 16) & 255, (k >> 8) & 255, k & 255);
    const key = s < 0.12 ? 'grey' : `${Math.floor(h / 30)}|${s < 0.34 ? 0 : 1}`;
    let g = groups.get(key);
    if (!g) { g = { key, cols: [], n: 0 }; groups.set(key, g); }
    g.cols.push(k); g.n += n;
  }
  const ramps = [...groups.values()].filter(g => g.n >= VEH_RAMP_MIN_PX).sort((a, b) => b.n - a.n);
  return { ramps, pixels: counts.size };
}

/** One colourway, as a Map of packed-rgb to packed-rgb. */
export function vehicleLut(an, colourId) {
  const c = VEHICLE_COLOUR_BY_ID[colourId];
  const lut = new Map();
  if (!c || c.id === VEHICLE_COLOURS[0].id) return lut;
  const un = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];
  for (const r of an.ramps) {
    if (r.key === 'grey') {
      if (!c.tint) continue;
      for (const k of r.cols) {
        const v = Math.max(...un(k)) / 255;
        if (v >= VEH_GREY_V[0] && v <= VEH_GREY_V[1]) lut.set(k, packRgb(...tintTo(...un(k), c.tint)));
      }
      continue;
    }
    for (const k of r.cols) lut.set(k, packRgb(...rotateHue(...un(k), c.hue)));
  }
  return lut;
}

/** The texture key a painted vehicle is baked under. The first colourway is
 *  the sheet itself, so it costs no texture and is always available. */
export function vehicleArtKey(art, colourId) {
  return (!colourId || colourId === VEHICLE_COLOURS[0].id) ? art : `${art}~${colourId}`;
}

/** What the player owns, as the save carries it. */
export function ownedVehicles(player) {
  return (player && Array.isArray(player.vehicles)) ? player.vehicles : [];
}

/** Does this party already own one of these, in any colour? */
export function ownsVehicle(player, id) {
  return ownedVehicles(player).some(v => v && v.id === id);
}

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------

export function vehicleFaults() {
  const out = [];
  const ids = new Set();
  for (const v of VEHICLES) {
    if (ids.has(v.id)) out.push(`${v.id}: two vehicles share an id`);
    ids.add(v.id);
    if (!v.art || !v.art.startsWith('veh_')) out.push(`${v.id}: no art sheet`);
    if (!COIN_RANKS.includes(v.price.rank)) out.push(`${v.id}: price in ${v.price.rank}, which is not a coin`);
    if (!(v.price.amount > 0)) out.push(`${v.id}: price of ${v.price.amount}`);
    if (v.terrain !== TERRAIN_GROUND && v.terrain !== TERRAIN_ANY) out.push(`${v.id}: terrain ${v.terrain}`);
    if (!(v.ambush >= 0 && v.ambush <= 1)) out.push(`${v.id}: ambush ${v.ambush}`);
    const it = v.interior;
    if (!it || !it.plan) out.push(`${v.id}: no interior plan`);
    else if (it.shape === 'rect' && !(it.w > 0 && it.h > 0)) out.push(`${v.id}: interior ${it.w}x${it.h}`);
    else if (it.shape === 'circle' && !(it.diameter > 0)) out.push(`${v.id}: interior diameter ${it.diameter}`);
    if (!v.blurb) out.push(`${v.id}: nothing to say about it`);
  }
  // The ladder has to climb. A vendor listing cheapest-first that is not
  // actually cheapest-first is how a player buys the wrong thing.
  for (let i = 1; i < VEHICLES.length; i++) {
    const a = vehiclePriceValue(VEHICLES[i - 1].price), b = vehiclePriceValue(VEHICLES[i].price);
    if (b <= a) out.push(`${VEHICLES[i].id}: costs no more than ${VEHICLES[i - 1].id}`);
  }
  // ...and so does the safety: what you pay for is not being jumped.
  for (let i = 1; i < VEHICLES.length; i++) {
    if (VEHICLES[i].ambush > VEHICLES[i - 1].ambush) {
      out.push(`${VEHICLES[i].id}: costs more than ${VEHICLES[i - 1].id} and is ambushed more`);
    }
  }
  if (VEHICLE_COLOURS.length !== 10) out.push(`${VEHICLE_COLOURS.length} colourways, and the ask was ten`);
  const cids = new Set(VEHICLE_COLOURS.map(c => c.id));
  if (cids.size !== VEHICLE_COLOURS.length) out.push('two colourways share an id');
  return out;
}
