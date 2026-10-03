// ===========================================================================
// ROUND 197 -- THE INSIDE OF EVERY VEHICLE.
//
// The user gave each of the nine a plan, and these are those plans:
//
//   10x20, no bedrooms ................ the two covered wagons
//   15x20, no bedrooms ................ the two campers
//   25x25, small rooms ................ the clockwork house
//   circular, 40 across, small rooms .. the beetle
//   40x40 with bedrooms ............... the airboat
//   40x80, bedrooms, captain's quarters, main deck .... the skyship
//   80x80, bedrooms, 3 levels, auctioneer and blacksmith
//     in a merchant hall .............. the dragon house
//
// GENERATED, NOT AUTHORED, and that is a decision rather than a shortcut. The
// nine share one grammar -- a door at one end, a stove and a table where a
// crew eats, beds along a wall if the plan says bedrooms, storage against the
// walls that have nothing else -- and writing nine hand-placed prop lists
// would be nine chances to put a bed in a doorway. What IS authored is the
// grammar and the exceptions: the beetle's round floor, the skyship's deck,
// the dragon house's merchant hall and its three levels.
//
// WHY THEY ARE REAL ROOMS. Round 195 builds the south one region at a time
// into a spare slot because twelve regions will not fit in memory at once.
// These fit: with them in it the packer's last occupied row is 130 of the
// interior band's 176 (see INTERIOR_BAND_TILES, which this round grew from 128
// to exactly that measurement plus a margin, and says why). And a
// party can park a wagon in one region and walk into another, so a single
// shared slot would mean the wagon's inside stops existing the moment anybody
// boards a skyship. These are homes.
// ===========================================================================
import { VEHICLES } from './vehicles.js';

/** A vehicle's interior room id, from its vehicle id. One function so the
 *  scene and the data cannot disagree about the name. */
export function vehicleRoomId(vehicleId, level = 0) {
  return level ? `veh_${vehicleId}_l${level + 1}` : `veh_${vehicleId}`;
}

/** The floor each kind of vehicle is boarded with. `hall` is the boards of a
 *  wagon and a ship alike; `marble` is what a dragon's house is paved in. */
const FLOOR = { dragonhouse: 'marble', skyship: 'hall', airboat: 'hall' };

/** What a level is called, so a banner says where you are rather than what
 *  you are in. */
const LEVEL_NAME = ['', 'Upper deck', 'Top floor'];

/**
 * The rectangle a level occupies. A circle is drawn as its bounding square and
 * the corners are filled as void -- `shape: 'circle'` is carried through to the
 * room so the wall builder can round it.
 */
function boxOf(v) {
  const it = v.interior;
  if (it.shape === 'circle') return { w: it.diameter, h: it.diameter };
  return { w: it.w, h: it.h };
}

/**
 * ONE LEVEL'S FURNITURE.
 *
 * Laid out by rule against the room's own size, in this order, because that is
 * the order a room is read: the way out first (nothing may stand on it), then
 * the things a plan names (beds, a hall, a deck), then the things that make a
 * space look lived in, in whatever is left. Every prop is placed on a tile that
 * has been checked against the ones already placed, so the layout cannot bury
 * its own door however the numbers change.
 */
function furnish(v, level, w, h) {
  const props = [];
  const taken = new Set();
  const free = (tx, ty) => tx > 0 && ty > 0 && tx < w - 1 && ty < h - 1 && !taken.has(`${tx},${ty}`);
  const put = (key, tx, ty) => {
    if (!free(tx, ty)) return false;
    taken.add(`${tx},${ty}`);
    props.push({ key, tx, ty });
    return true;
  };
  // The doorway and the tiles either side of it stay clear.
  const door = { tx: 1, ty: Math.floor(h / 2) };
  for (let d = -1; d <= 1; d++) taken.add(`${door.tx},${door.ty + d}`);
  taken.add(`${door.tx + 1},${door.ty}`);
  props.push({ key: 'doorMat', tx: door.tx, ty: door.ty });

  const it = v.interior;
  const big = w >= 25;

  // --- what the plan names ------------------------------------------------
  // WHERE THE BEDS GO. On the only floor there is, unless there are several --
  // in which case they go upstairs, which is where a house puts them and which
  // also stops a three-level dragon house having its hall, its forge and its
  // beds all in one room while two floors stand empty.
  const bedLevel = (it.levels || 1) > 1 ? 1 : 0;
  if (it.bedrooms && level === bedLevel) {
    // Along the far wall, in pairs, which is how a crew sleeps on a ship.
    const beds = ['bedRough', 'bedIron', 'bedQuilt'];
    let n = 0;
    for (let ty = 2; ty < h - 2 && n < it.bedrooms; ty += 3) {
      if (put(beds[n % beds.length], w - 2, ty)) n++;
      if (n < it.bedrooms && put(beds[(n + 1) % beds.length], w - 4, ty)) n++;
    }
  }
  if ((it.features || []).includes('captains_quarters') && level === 0) {
    put('bedCanopy', w - 3, 2);
    put('tableDark', w - 5, 3);
    put('chairPadded', w - 6, 3);
    put('paintPortrait', w - 2, 1);
  }
  if ((it.features || []).includes('main_deck') && level === 0) {
    // The deck is the long open half: barrels and rope-ends down one side and
    // nothing at all down the middle, because a deck you cannot walk is scenery.
    for (let ty = 4; ty < h - 4; ty += 5) { put('barrelStack', 2, ty); put('crateProduce', 3, ty + 2); }
  }
  if ((it.features || []).includes('merchant_hall') && level === 0) {
    put('rostrum', Math.floor(w / 2), 3);
    put('coinCase', Math.floor(w / 2) - 2, 2);
    put('gemCase', Math.floor(w / 2) + 2, 2);
    put('anvil', Math.floor(w / 2) - 6, 4);
    put('forgeSmall', Math.floor(w / 2) - 8, 3);
    put('weaponRack', Math.floor(w / 2) + 6, 4);
    put('armourPile', Math.floor(w / 2) + 8, 3);
    for (let tx = 4; tx < w - 4; tx += 6) put('marketStall', tx, 7);
  }

  // --- where anybody lives -------------------------------------------------
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  put(big ? 'stoveIron' : 'potbelly', w - 2, 1);
  put(big ? 'tableRoundBig' : 'tableSmall', cx, cy);
  put('stoolWood', cx - 1, cy + 1);
  put('stoolWood', cx + 1, cy + 1);
  if (big) { put('fireplaceLit', 1, 1); put('rockingChair', 3, 2); }

  // --- and the walls it has left -------------------------------------------
  // An upper floor is somebody's rooms rather than a hold, so it is dressed
  // with the things a room has: seats, chests, a washstand, a light.
  if (level > 0) {
    for (let ty = 6; ty < h - 6; ty += 7) {
      put('benchWood', 3, ty); put('sideboard', 5, ty);
      put('chairPadded', w - 6, ty); put('tableSmall', w - 8, ty);
    }
  }
  const wall = ['barrelStack', 'sacks', 'crateProduce', 'workbench', 'sideboard', 'washTub'];
  let i = 0;
  for (let tx = 2; tx < w - 1; tx += big ? 4 : 3) {
    if (put(wall[i % wall.length], tx, 1)) i++;
    if (put(wall[(i + 2) % wall.length], tx, h - 2)) i++;
  }
  // A light every so often, so a long room is not a tunnel.
  for (let ty = 3; ty < h - 2; ty += 8) { put('brazierIron', 1, ty); put('brazierIron', w - 2, ty); }
  return { props, door };
}

/** The people in the dragon house's merchant hall, which is the only interior
 *  of the nine the user staffed. Their shop ids are their own, so the hall is
 *  not a copy of a city's block: what is on it is what a dragon carries. */
function merchantHallNpcs(w) {
  const cx = Math.floor(w / 2);
  return [
    {
      name: 'Hallmaster Ondrey Vaux', artKey: 'npc_auctioneer_m', facing: 'south',
      tx: cx, ty: 5, shopId: 'auction',
      dialogue: "We hold a block at eight thousand feet. The lots are the same lots; the view is better and the bidding is quieter.",
    },
    {
      name: 'Smith Berrin Osk', artKey: 'npc_muscular_adventurer_v1', facing: 'south',
      tx: cx - 7, ty: 5, benchKey: 'blacksmith',
      dialogue: "A forge on a dragon's back. The heat is the easy part -- it is the draught that took me a year to get right.",
    },
  ];
}

/**
 * The nine (eleven rooms: the dragon house is three).
 *
 * `lazy` for the reason the civic halls are: a room the party visits between
 * journeys should not hold sprites for the whole session.
 */
export const VEHICLE_ROOMS = [];
for (const v of VEHICLES) {
  const { w, h } = boxOf(v);
  const levels = v.interior.levels || 1;
  for (let lv = 0; lv < levels; lv++) {
    const id = vehicleRoomId(v.id, lv);
    const { props, door } = furnish(v, lv, w, h);
    const room = {
      id,
      building: null,
      noExterior: true,
      lazy: true,
      vehicle: v.id,
      level: lv,
      shape: v.interior.shape,
      name: lv ? `${v.name} — ${LEVEL_NAME[lv] || `level ${lv + 1}`}` : v.name,
      enterLabel: `go inside the ${v.name.toLowerCase()}`,
      floor: FLOOR[v.id] || 'hall',
      // A starting position only: `resiteInteriorsIntoBand` repacks every room
      // into the reserved band, which is the whole reason that function exists.
      x: 400, y: 40000 + VEHICLE_ROOMS.length * 200,
      w, h,
      door: { at: door.ty, span: 0 },
      props,
      npcs: (lv === 0 && (v.interior.features || []).includes('merchant_hall'))
        ? merchantHallNpcs(w) : [],
    };
    // THE STAIRS. One door per neighbouring level, which is why round 197
    // taught a room to hold more than one: the middle floor of the dragon
    // house needs a way up and a way down, and until this round `inner` was
    // a single door and would have had to choose.
    const stairs = [];
    if (lv > 0) {
      stairs.push({ tx: 2, ty: 2, toRoom: vehicleRoomId(v.id, lv - 1),
        label: lv === 1 ? 'go back down' : 'take the stair down' });
    }
    if (lv < levels - 1) {
      stairs.push({ tx: w - 3, ty: 2, toRoom: vehicleRoomId(v.id, lv + 1),
        label: 'take the stair up' });
    }
    if (stairs.length) room.inners = stairs;
    VEHICLE_ROOMS.push(room);
  }
}
export const VEHICLE_ROOM_BY_ID = Object.fromEntries(VEHICLE_ROOMS.map(r => [r.id, r]));

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------

export function vehicleInteriorFaults() {
  const out = [];
  for (const v of VEHICLES) {
    const levels = v.interior.levels || 1;
    for (let lv = 0; lv < levels; lv++) {
      const r = VEHICLE_ROOM_BY_ID[vehicleRoomId(v.id, lv)];
      if (!r) { out.push(`${v.id} has no level ${lv + 1}`); continue; }
      const { w, h } = boxOf(v);
      if (r.w !== w || r.h !== h) out.push(`${r.id} is ${r.w}x${r.h}, not ${w}x${h}`);
      if (!r.props.length) out.push(`${r.id} is empty`);
      // Nothing may stand on the way out, at any level.
      const doorTy = r.door.at;
      const onDoor = r.props.filter(p => p.tx === 1 && Math.abs(p.ty - doorTy) <= 1 && p.key !== 'doorMat');
      if (onDoor.length) out.push(`${r.id} has ${onDoor.length} props in its doorway`);
      // ...and no two things on one tile.
      const seen = new Set();
      for (const p of r.props) {
        const k = `${p.tx},${p.ty}`;
        if (seen.has(k)) out.push(`${r.id} stacks two props on ${k}`);
        seen.add(k);
        if (p.tx < 0 || p.ty < 0 || p.tx >= r.w || p.ty >= r.h) out.push(`${r.id}'s ${p.key} is outside it`);
      }
    }
  }
  // The plans the user wrote, checked against what was built.
  // ACROSS EVERY LEVEL, not just the ground floor: a three-level house puts its
  // beds upstairs, which is the whole reason `bedLevel` exists.
  const beds = (v) => VEHICLE_ROOMS.filter(r => r.vehicle === v.id)
    .reduce((n, r) => n + r.props.filter(p => p.key.startsWith('bed')).length, 0);
  for (const v of VEHICLES) {
    const n = beds(v);
    if (v.interior.bedrooms && !n) out.push(`${v.id} was promised bedrooms and has none`);
    if (!v.interior.bedrooms && n) out.push(`${v.id} has ${n} beds and its plan says none`);
  }
  const hall = VEHICLE_ROOM_BY_ID[vehicleRoomId('dragonhouse')];
  if (!hall || (hall.npcs || []).length !== 2) out.push('the merchant hall is not staffed');
  else {
    if (!hall.npcs.some(n => n.shopId === 'auction')) out.push('the merchant hall has no auctioneer');
    if (!hall.npcs.some(n => n.benchKey === 'blacksmith')) out.push('the merchant hall has no blacksmith');
  }
  const dragonLevels = VEHICLE_ROOMS.filter(r => r.vehicle === 'dragonhouse').length;
  if (dragonLevels !== 3) out.push(`the dragon house has ${dragonLevels} levels, not 3`);
  // Every stair leads somewhere, and somewhere leads back.
  for (const r of VEHICLE_ROOMS) {
    for (const d of (r.inners || [])) {
      const to = VEHICLE_ROOM_BY_ID[d.toRoom];
      if (!to) { out.push(`${r.id}'s stair goes nowhere`); continue; }
      if (!(to.inners || []).some(b => b.toRoom === r.id)) out.push(`${r.id} -> ${to.id} is one way`);
    }
  }
  return out;
}

// ============================================================================
// ROUND 200 -- THE INSIDE GROWS WITH THE CREW.
//
// The user, in one item and three sub-items:
//
//   "4) Transport interiors should evolve as the party grows and ranks up.
//    4.1) Rooms or sleeping areas should be a reflection of the character
//         using them
//    4.2) early on these will likely be barebones as the party is low rank and
//         relatively poor"
//
// WHAT THAT ASKS FOR, PRECISELY. Not that the wagon gets bigger -- the nine
// plans above are the plans, and the user wrote them. What changes is what is
// IN it: an empty wagon when you are alone at Normal, a corner with a bedroll
// in it the day Zeke joins, and four quarters that read as four different
// people's rooms by the time the team is Silver.
//
// THREE RULES, AND THEY DO DIFFERENT WORK.
//
// 1. A QUARTER EXISTS BECAUSE SOMEBODY LIVES IN IT. `crew` is the recruited
//    roster, and the number of quarters is its length. A member dismissed to
//    the transport still has a room -- that is where they are -- so this reads
//    `recruited`, not `_activeParty`. The wagon is their home whether or not
//    they walked out of it this morning.
//
// 2. WHAT IS IN IT IS WHO THEY ARE. `QUARTER_CHARACTER` is one line per
//    member, off what party.js already says about them: Zeke was a farmer and
//    is a healer, Encykla reads, Aedia sharpens things, Benjamin is the wall.
//    Not a mood table -- these are the props the game already has, chosen to
//    be recognisable at a glance from the doorway.
//
// 3. HOW GOOD IT IS IS THEIR RANK. `QUARTER_TIER` is the "barebones early"
//    half, and it is the half that is easy to get wrong by being generous. At
//    Normal a quarter is a bedroll on the floor and nothing else. Iron buys a
//    frame. Bronze buys the character props -- which is to say a companion's
//    room does not say anything about them until they can afford for it to,
//    which is the read the ask is after. Silver adds the comforts and Gold the
//    portrait.
//
// AND THE WALLS BETWEEN THEM ARE KIT PIECES, which is round 200's other half
// arriving in the one interior the player will see most. A quarter is a stub
// of wall and a pillar rather than a full partition: a wagon is not a
// boarding house, and two courses of timber read as "this corner is Zeke's"
// without closing the room in.
// ============================================================================

/** The rank ladder, as a number, so a quarter can be asked "how far up". */
const QUARTER_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold'];
export function quarterTierOf(rank) {
  const i = QUARTER_RANKS.indexOf(String(rank || 'normal').toLowerCase());
  return i < 0 ? 0 : i;
}

/** What each tier of rank affords. Cumulative: a Silver quarter has
 *  everything a Bronze one has. The FIRST entry is deliberately almost
 *  nothing -- see rule 3. */
export const QUARTER_TIER = [
  { bed: 'bedRough', extras: 0, light: false, rug: false, label: 'a bedroll' },
  { bed: 'bedRough', extras: 0, light: true, rug: false, label: 'a bunk' },
  { bed: 'bedIron', extras: 2, light: true, rug: false, label: 'a bunk and their things' },
  { bed: 'bedQuilt', extras: 3, light: true, rug: true, label: 'a proper room' },
  { bed: 'bedCanopy', extras: 4, light: true, rug: true, label: 'quarters' },
];

/** Who each companion is, in furniture. `extras` are taken in order, so a
 *  Bronze member gets the two that say the most about them. */
export const QUARTER_CHARACTER = {
  // A farmer who became a healer. The tools he kept and the herbs he dries.
  zeke: { extras: ['handcart', 'sacks', 'workbench', 'benchWood'], note: 'the farm he left' },
  // The twin who reads. Round 49: Lightning, Wind and Vast, and the Storm.
  encykla: { extras: ['scrollStand', 'tableSmall', 'chairPadded', 'paintLandscape'],
    note: 'everything she has read twice' },
  // The twin who fights. Knife, Adept, Foot -- she keeps an edge on things.
  aedia: { extras: ['weaponRack', 'choppingBlock', 'stoolSquare', 'benchIron'],
    note: 'a whetstone and no ornament' },
  // The wall. Shield, Iron, Pangolin.
  benjamin: { extras: ['armourPile', 'anvilStand', 'benchStone', 'shrineNiche'],
    note: 'plate, laid out the same way every night' },
  // Prism came up out of the sewer with nothing and has kept the habit.
  prism: { extras: ['crateProduce', 'stoolWood', 'washTub', 'sideboard'],
    note: 'what fits in a crate' },
};

const QUARTER_DEFAULT = { extras: ['crateProduce', 'stoolWood', 'benchWood', 'sideboard'], note: '' };

/**
 * The quarters, as props and kit pieces, for one crew in one vehicle level.
 *
 * Returns `{ props, kit, quarters }` -- `quarters` being what each member's
 * corner came out as, which is what the "talk to the team" screen reads to
 * tell the player whose room is whose without walking them round it.
 *
 * LAID ALONG THE BACK WALL, in the order the crew joined, because that is the
 * order the player will look for them in. Each takes a two-tile-deep bay; a
 * vehicle too small to hold a bay simply returns nothing, which is the correct
 * answer for a ten-by-twenty covered wagon with four people in it -- they
 * sleep in the open part, and the beds `furnish` already laid are theirs.
 */
export function vehicleQuarters(v, level, crew, taken = new Set(), extraBays = 0) {
  const { w, h } = boxOf(v);
  const it = v.interior;
  const out = { props: [], kit: [], quarters: [] };
  if (!crew || !crew.length) return out;
  // Quarters go where the beds go, and for the same reason.
  const bedLevel = (it.levels || 1) > 1 ? 1 : 0;
  if (level !== bedLevel) return out;
  // BAY WIDTH IS FOUR TILES and a bay needs the depth for a bed and a thing
  // beside it. Below that the vehicle has no room to give anybody a corner.
  const BAY = 4;
  const usable = h - 6;
  if (w < 14 || usable < BAY) return out;
  // ROUND 200 (3.4) -- "larger accommodations". The vehicle-essence boon buys
  // bays the hull does not have room for, which is the only sense in which a
  // wagon's inside can get bigger without the wagon getting bigger: the plan
  // is the user's and does not move, so what the boon buys is that the plan is
  // used harder -- bunks packed three to a bay's depth rather than two.
  const fits = Math.floor(usable / BAY) + Math.max(0, Math.floor(extraBays));
  const free = (tx, ty) => tx > 0 && ty > 0 && tx < w - 1 && ty < h - 1 && !taken.has(`${tx},${ty}`);
  const put = (key, tx, ty) => {
    if (!free(tx, ty)) return false;
    taken.add(`${tx},${ty}`);
    out.props.push({ key, tx, ty });
    return true;
  };
  crew.slice(0, fits).forEach((m, i) => {
    const tier = QUARTER_TIER[Math.min(QUARTER_TIER.length - 1, quarterTierOf(m.rank))];
    const who = QUARTER_CHARACTER[m.id] || QUARTER_DEFAULT;
    const ty = 3 + i * BAY;
    const bx = w - 3;                       // the back wall, two in from the edge
    put(tier.bed, bx, ty);
    // The character props, as many as the rank affords.
    let n = 0;
    for (const key of who.extras) {
      if (n >= tier.extras) break;
      if (put(key, bx - 1 - n, ty + 1)) n++;
    }
    if (tier.light) put('brazierBowl', bx, ty + 2);
    if (tier.rug) put('benchSlab', bx - 2, ty);
    // THE PARTITION. A stub of wall between this bay and the next, closed at
    // its inner end by a pillar -- two pieces, not a row of them, because the
    // point is to mark the corner rather than to build a cabin.
    if (i < crew.length - 1 && i < fits - 1) {
      out.kit.push({ key: 'wallNorth', tx: bx, ty: ty + BAY - 1 });
      out.kit.push({ key: 'wallNorth', tx: bx - 1, ty: ty + BAY - 1 });
      out.kit.push({ key: 'pillarNorth', tx: bx - 2, ty: ty + BAY - 1 });
    }
    out.quarters.push({ id: m.id, name: m.name, rank: m.rank, tx: bx, ty,
      label: tier.label, note: who.note });
  });
  return out;
}

/**
 * The material a vehicle's fittings are built of. A wagon is timber, a ship's
 * quarters are timber, a dragon's house is stone, and the clockwork house is
 * the grey of its own plating -- read off the vehicle's floor, which already
 * makes the same distinction.
 */
export function vehicleKitMaterial(v) {
  if ((FLOOR[v.id] || 'hall') === 'marble') return 'greybrick';
  if (v.id === 'clockwork' || v.id === 'beetle') return 'darkstone';
  return 'log';
}

/**
 * ROUND 200 -- the whole of a vehicle level's contents for a given crew.
 *
 * `furnish` is re-run rather than patched, because it is a pure function of
 * the plan and re-running it is the only way to be sure the quarters are laid
 * against the same `taken` set the fittings were -- which is what stops a bed
 * landing on the stove. The room's stored props are the empty-crew case, and
 * this returns that same layout when `crew` is empty.
 */
export function furnishVehicleLevel(v, level, crew, extraBays = 0) {
  const { w, h } = boxOf(v);
  const base = furnish(v, level, w, h);
  const taken = new Set(base.props.map(p => `${p.tx},${p.ty}`));
  const q = vehicleQuarters(v, level, crew || [], taken, extraBays);
  return {
    props: base.props.concat(q.props),
    kit: q.kit.length ? { material: vehicleKitMaterial(v), pieces: q.kit } : null,
    quarters: q.quarters,
    door: base.door,
  };
}
