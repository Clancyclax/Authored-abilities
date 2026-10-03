// ============================================================================
// ROUND 188 -- THE OTHER CITIES, LAID OUT ON A GRID WITH DISTRICTS.
//
//   "Take the rules from cadence, size, spacing, aristocratic mansions,
//    temples, adventure society, auction house, blacksmith, trees, overlap,
//    rivers, ponds, streets, etc. Use these rules and increase the size of all
//    of the other cities and generate roads. The other cities can be laid out
//    in more of a grid but should have separate market, temple, housing, and
//    aristocracy sections."
//
// Answers the user gave when asked: three times the size, as Cadence was; the
// five cities (Cadence is the sixth, and is traced, not generated); every
// city gets all eight gods' temples; Harrowmoor's hand-laid wall is replaced
// by the generated one.
//
// THIS FILE IS THE PLAN ONLY -- pure, deterministic, and free of the scene.
// It says where the streets, districts, parks, estates and market square go,
// in tile offsets from the city's centre. WorldScene stamps it
// (`_stampGridCity`), builds on it (`_buildGridCity`) and walls it, putting
// every building through the same placement rules Cadence's go through
// (`_cadenceSiteProblem`). Keeping the plan out of the scene is what lets the
// data lane and the suites ask it questions without booting a world.
//
// THE SHAPE, for a city of half-width H:
//
//      +----------------- ring road (3 wide, just inside the wall) -----+
//      |  district A        |avenue|        district B                  |
//      |   (street grid)    |  5   |         (street grid)              |
//      |--------------------+ plaza+------------------------------------|
//      |  district C        |      |         district D                 |
//      |                    |      |                                    |
//      +----------------------------------------------------------------+
//
//   * Two avenues, five wide, cross at the centre and run to the ring road on
//     all four sides; the plaza is the square round the crossing.
//   * The four quadrants are the four districts -- market, temple, housing,
//     aristocracy -- in an order seeded by the city's id, so no two cities
//     are the same map rotated.
//   * Market, temple and housing quadrants are cut into blocks by three-wide
//     streets every GRID_BLOCK tiles.
//   * The aristocracy quadrant has no street grid. It is fenced estates, one
//     mansion each, with a corridor road between them -- the rule the user
//     gave Cadence's quarter: "only run roads between the estate properties".
//   * The temple quarter is a precinct of Cadence's size -- three blocks by
//     three at the plaza corner -- and the rest of its quadrant is houses
//     (`annex`), so the eight temples stand together rather than one to a
//     sixty-tile field.
//   * A few blocks of the housing and temple quarters are parks: grass, with
//     one pond (laid by the scene, 5 x 7 water, as in Cadence).
//   * One market block nearest the plaza is left clear and paved: the market
//     square the stalls walk out from.
// ============================================================================

/** Each city's half-width in tiles: THREE TIMES the square it had, as Cadence
 *  was tripled. The base is what each city's floor measured before this round
 *  (Harrowmoor's off the hand-laid circuit, the others off their square). */
export const GRID_CITY_BASE_HALF = {
  ont_city: 62, ele_city: 72, bra_city: 86, sir_town: 32, cin_slag: 24,
};
export const GRID_CITY_SCALE = 3;
export const GRID_CITIES = Object.fromEntries(
  Object.entries(GRID_CITY_BASE_HALF).map(([id, h]) => [id, h * GRID_CITY_SCALE]));

export const GRID_AVENUE_W = 5;       // the two avenues through the centre
export const GRID_STREET_W = 3;       // the block streets and the ring road
export const GRID_BLOCK = 36;         // street pitch, avenue edge to street
export const GRID_PLAZA_HALF = 26;    // the square round the crossing
export const GRID_ESTATE_TARGET = 64; // an estate plot's side, before fitting
export const GRID_ESTATE_GAP = 9;     // corridor between two plots (road + verges)
export const GRID_ESTATE_MIN = 34;    // smaller than this is a garden, not an estate
export const GRID_PARK_SHARE = 0.14;  // of the housing and temple blocks

/** How many blocks out from the avenues, each way, the temple precinct runs.
 *  Three by three less the plaza's corner is eight blocks: one per god. The
 *  whole quadrant was the first build's precinct, and a quarter of Vashra
 *  holding eight temples was paving with a chapel in it every sixty tiles --
 *  Cadence's is ninety-odd tiles across, and that is the size this keeps. */
const TEMPLE_BANDS = 3;

/** The four district names, in a stable order. */
export const GRID_DISTRICTS = ['market', 'temple', 'housing', 'aristocracy'];

/** mulberry32 on a string hash -- deterministic, and ours, so the plan does
 *  not depend on the scene's generator. */
export function gridRng(key) {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The plan. All coordinates are tile offsets from the city centre, rects are
 * inclusive { x0, y0, x1, y1 }.
 */
export function planGridCity(id, H) {
  const rng = gridRng(`grid-city|${id}`);
  const aW = (GRID_AVENUE_W - 1) / 2;        // 2: avenue tiles -2..2
  const sW = (GRID_STREET_W - 1) / 2;        // 1: street tiles -1..1
  const ringC = H - 2;                       // ring road centre line (tiles H-3..H-1)
  const inner = ringC - sW - 1;              // last tile inside the ring
  const streets = [];
  const hStreet = (y, x0, x1, half) => streets.push({ x0, x1, y0: y - half, y1: y + half });
  const vStreet = (x, y0, y1, half) => streets.push({ y0, y1, x0: x - half, x1: x + half });

  // Avenues, edge to edge; the ring road just inside the edge.
  hStreet(0, -H, H, aW);
  vStreet(0, -H, H, aW);
  hStreet(-ringC, -ringC - sW, ringC + sW, sW);
  hStreet(ringC, -ringC - sW, ringC + sW, sW);
  vStreet(-ringC, -ringC - sW, ringC + sW, sW);
  vStreet(ringC, -ringC - sW, ringC + sW, sW);

  // The districts: four quadrants, in a seeded order.
  const order = GRID_DISTRICTS.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]];   // NW, NE, SW, SE
  const districts = {};
  quads.forEach(([sx, sy], i) => {
    const a0 = aW + 1, a1 = inner;
    districts[order[i]] = {
      sx, sy,
      x0: sx < 0 ? -a1 : a0, x1: sx < 0 ? -a0 : a1,
      y0: sy < 0 ? -a1 : a0, y1: sy < 0 ? -a0 : a1,
    };
  });

  // The street lines a quadrant is cut by, measured outward from the avenue.
  const lines = [];
  for (let k = 1; aW + k * GRID_BLOCK < inner - GRID_BLOCK / 2; k++) lines.push(aW + k * GRID_BLOCK);

  const blocks = { market: [], temple: [], housing: [] };
  const annexRects = [];
  const edgeStreets = { north: [0], south: [0], west: [0], east: [0] };
  for (const name of ['market', 'temple', 'housing']) {
    const d = districts[name];
    // Streets: every line, both directions, across the quadrant to the ring.
    for (const L of lines) {
      vStreet(d.sx * L, d.y0, d.y1, sW);
      hStreet(d.sy * L, d.x0, d.x1, sW);
      (d.sy < 0 ? edgeStreets.north : edgeStreets.south).push(d.sx * L);
      (d.sx < 0 ? edgeStreets.west : edgeStreets.east).push(d.sy * L);
    }
    // Blocks: the cells between lines, avenue and ring.
    const cuts = [aW, ...lines, ringC];
    for (let i = 0; i + 1 < cuts.length; i++) {
      for (let j = 0; j + 1 < cuts.length; j++) {
        const u0 = cuts[i] + (i === 0 ? 1 : sW + 1);
        const u1 = cuts[i + 1] - (sW + 1);
        const v0 = cuts[j] + (j === 0 ? 1 : sW + 1);
        const v1 = cuts[j + 1] - (sW + 1);
        if (u1 - u0 < 8 || v1 - v0 < 8) continue;
        const x0 = d.sx < 0 ? -u1 : u0, x1 = d.sx < 0 ? -u0 : u1;
        const y0 = d.sy < 0 ? -v1 : v0, y1 = d.sy < 0 ? -v0 : v1;
        // The plaza is nobody's block: any block that reaches into the square
        // round the crossing is left as paving, which makes the plaza run out
        // to the first street on every side -- a grand square at the centre
        // of the city, where its story buildings already stand.
        if (Math.min(Math.abs(x0), Math.abs(x1)) <= GRID_PLAZA_HALF
            && Math.min(Math.abs(y0), Math.abs(y1)) <= GRID_PLAZA_HALF) continue;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        // The temple precinct is the first TEMPLE_BANDS blocks out from the
        // avenues each way; the quadrant's blocks beyond it are houses.
        const annex = name === 'temple' && (i >= TEMPLE_BANDS || j >= TEMPLE_BANDS);
        blocks[annex ? 'housing' : name].push({ x0, y0, x1, y1, d: Math.hypot(cx, cy), annex: annex || undefined });
      }
    }
    if (name === 'temple' && cuts.length - 1 > TEMPLE_BANDS) {
      // The district's own rect shrinks to the precinct, and what is left of
      // the quadrant -- an L round its outer corner -- is recorded as the
      // housing annex, two rects.
      const lim = cuts[TEMPLE_BANDS] - 1 - sW;          // last tile of the precinct
      const a0 = aW + 1;
      const rect = (u0, u1, v0, v1) => ({
        x0: d.sx < 0 ? -u1 : u0, x1: d.sx < 0 ? -u0 : u1,
        y0: d.sy < 0 ? -v1 : v0, y1: d.sy < 0 ? -v0 : v1,
      });
      annexRects.push(rect(lim + 1, inner, a0, inner), rect(a0, lim, lim + 1, inner));
      Object.assign(d, rect(a0, lim, a0, lim));
    }
  }

  // The market square: the market block nearest the plaza, kept clear.
  const mk = blocks.market.slice().sort((a, b) => a.d - b.d)[0] || null;
  const marketSquare = mk ? { x0: mk.x0, y0: mk.y0, x1: mk.x1, y1: mk.y1 } : null;
  if (mk) mk.square = true;

  // Parks: a share of the housing and temple blocks, never the ones nearest
  // the plaza (the town's front door is paved), chosen by the seeded draw.
  const parks = [];
  for (const name of ['housing', 'temple']) {
    const pool = blocks[name].filter(b => b.d > GRID_PLAZA_HALF * 1.6);
    const n = Math.max(1, Math.round(blocks[name].length * GRID_PARK_SHARE));
    for (let k = 0; k < n && pool.length; k++) {
      const i = Math.floor(rng() * pool.length);
      const b = pool.splice(i, 1)[0];
      b.park = true;
      parks.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, district: name });
    }
  }

  // The aristocracy: estates on a fitted grid, corridors between them.
  const q = districts.aristocracy;
  // The estates start past the plaza, so the square is the same on all four
  // sides; the strip between the plaza and the avenue is left open.
  const e0 = GRID_PLAZA_HALF + 1;
  const span = inner - e0 + 1;                // tiles across the quadrant
  let n = Math.max(1, Math.floor((span + GRID_ESTATE_GAP) / (GRID_ESTATE_TARGET + GRID_ESTATE_GAP)));
  let P = Math.floor((span - (n - 1) * GRID_ESTATE_GAP) / n);
  while (n > 1 && P < GRID_ESTATE_MIN) { n--; P = Math.floor((span - (n - 1) * GRID_ESTATE_GAP) / n); }
  const plots = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Three tiles in from the avenue and the corridors, so a fence panel's
      // art stops short of the carriageway beside it.
      const u0 = e0 + i * (P + GRID_ESTATE_GAP) + 3, u1 = u0 + P - 5;
      const v0 = e0 + j * (P + GRID_ESTATE_GAP) + 3, v1 = v0 + P - 5;
      const x0 = q.sx < 0 ? -u1 : u0, x1 = q.sx < 0 ? -u0 : u1;
      const y0 = q.sy < 0 ? -v1 : v0, y1 = q.sy < 0 ? -v0 : v1;
      // The one way in faces the corridor that leads back toward the avenue
      // -- or, for the plots against the avenue, the avenue itself.
      const gateSide = q.sx < 0 ? 'east' : 'west';
      plots.push({ x0, y0, x1, y1, gateSide });
    }
  }
  // Corridor roads between plot columns and rows, avenue to ring.
  for (let i = 1; i < n; i++) {
    const c = e0 + i * (P + GRID_ESTATE_GAP) - Math.ceil(GRID_ESTATE_GAP / 2) + 1;
    vStreet(q.sx * c, q.y0, q.y1, sW);
    hStreet(q.sy * c, q.x0, q.x1, sW);
    (q.sy < 0 ? edgeStreets.north : edgeStreets.south).push(q.sx * c);
    (q.sx < 0 ? edgeStreets.west : edgeStreets.east).push(q.sy * c);
  }
  // Mansions forty tiles apart at least -- the user's rule for the quarter.
  // A plot too small to keep two mansions forty apart keeps one of them.
  const mansions = plots.map((p, i) => ({
    x: Math.round((p.x0 + p.x1) / 2) + 3, y: Math.round((p.y0 + p.y1) / 2) + 3, plot: i,
  }));
  const keptMansions = [];
  for (const m of mansions) {
    if (keptMansions.every(k => Math.max(Math.abs(k.x - m.x), Math.abs(k.y - m.y)) >= 40)) keptMansions.push(m);
  }

  for (const k of Object.keys(edgeStreets)) edgeStreets[k] = [...new Set(edgeStreets[k])].sort((a, b) => a - b);

  return {
    id, half: H, ringC, inner,
    avenueHalf: aW, streetHalf: sW,
    order, districts, annex: annexRects, streets, blocks, parks, marketSquare,
    plaza: { x0: -GRID_PLAZA_HALF, y0: -GRID_PLAZA_HALF, x1: GRID_PLAZA_HALF, y1: GRID_PLAZA_HALF },
    plots, plotSize: P, mansions: keptMansions,
    edgeStreets,
  };
}

/**
 * Carry one of the region's roads into the city through a gate.
 *
 * Roads in the data START (or end) on the city's centre, as they did when the
 * cities were a third the size. Each is walked out to where it leaves the
 * wall's rectangle; the gate goes on that side, on the nearest street that
 * reaches it, and the road is rerouted to arrive SQUARE to the wall there --
 * the way Cadence's three were -- then runs on to wherever it went before.
 *
 * `pts` are tile offsets from the centre. `wall` is the wall's rectangle.
 * Returns { points, side, at } with points in the same frame, the first of
 * them on the street inside the gate; or null if the road does not touch the
 * city at all.
 */
export function rerouteIntoGridCity(plan, wall, pts, reach = 24) {
  const inside = (p) => p[0] > wall.x0 && p[0] < wall.x1 && p[1] > wall.y0 && p[1] < wall.y1;
  if (!pts.length) return null;
  let list = pts.map(p => [p[0], p[1]]);
  let reversed = false;
  if (!inside(list[0]) && inside(list[list.length - 1])) { list.reverse(); reversed = true; }
  if (!inside(list[0])) return null;
  let k = 1;
  while (k < list.length && inside(list[k])) k++;
  if (k >= list.length) {
    // The whole road is inside the new city: it was a stub to an old gate.
    // Carry it on, in its own direction, out past the wall.
    const a = list[0], b = list[list.length - 1];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const far = Math.max(wall.x1 - wall.x0, wall.y1 - wall.y0);
    list.push([Math.round(b[0] + dx * far), Math.round(b[1] + dy * far)]);
  }
  // Where the leaving segment crosses the rectangle.
  const a = list[k - 1], b = list[k];
  const ts = [];
  const push = (t, side) => { if (t >= 0 && t <= 1) ts.push({ t, side }); };
  if (b[0] !== a[0]) {
    push((wall.x0 - a[0]) / (b[0] - a[0]), 'west');
    push((wall.x1 - a[0]) / (b[0] - a[0]), 'east');
  }
  if (b[1] !== a[1]) {
    push((wall.y0 - a[1]) / (b[1] - a[1]), 'north');
    push((wall.y1 - a[1]) / (b[1] - a[1]), 'south');
  }
  ts.sort((u, v) => u.t - v.t);
  const hit = ts.find(h => {
    const x = a[0] + (b[0] - a[0]) * h.t, y = a[1] + (b[1] - a[1]) * h.t;
    return x >= wall.x0 - 0.01 && x <= wall.x1 + 0.01 && y >= wall.y0 - 0.01 && y <= wall.y1 + 0.01;
  }) || ts[0];
  const side = hit.side;
  const along = (side === 'north' || side === 'south')
    ? a[0] + (b[0] - a[0]) * hit.t : a[1] + (b[1] - a[1]) * hit.t;
  // Onto the nearest street that reaches this side, kept off the corners.
  const cands = plan.edgeStreets[side].filter(v => Math.abs(v) <= plan.inner - 20);
  const at = cands.reduce((best, v) => Math.abs(v - along) < Math.abs(best - along) ? v : best, cands[0] ?? 0);
  const H = plan.half;
  const n = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[side];
  const fixed = { north: wall.y0, south: wall.y1, west: wall.x0, east: wall.x1 }[side];
  const onLine = (off) => (side === 'north' || side === 'south') ? [at, off] : [off, at];
  const start = onLine(n[0] + n[1] > 0 ? H - 2 : -(H - 2));          // on the ring road
  const out = onLine(fixed + (n[0] + n[1]) * reach);                  // square to the wall
  const rest = list.slice(k);
  // Skip what the reroute already reaches past.
  while (rest.length > 1 && Math.hypot(rest[0][0] - out[0], rest[0][1] - out[1]) < reach) rest.shift();
  let points = [start, out, ...rest];
  if (reversed) points = points.slice().reverse();
  return { points, side, at, reversed };
}
