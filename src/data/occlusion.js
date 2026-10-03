// ===========================================================================
// ROUND 250 -- SHADOWS.
//
// The user, on the lighting plan: "I'm onboard with the masking using
// occlusion keying off of the obstacle rectangles and collision data."
//
// Round 249 landed the mask and left the honest gap named in its own commit: a
// lamp lights through a wall. This closes it.
//
// THE SHAPE OF THE ANSWER, and why it costs almost nothing. A light's shadow
// depends on two things: where the light is, and where the walls are. For a
// LAMP POST both are fixed for the life of the world -- the lamp does not move
// and neither does the house next to it -- so its shadows can be worked out
// ONCE and replayed every frame. Only lights that move (a fireball, the
// player's own bubble) have to do the work per frame, and those get plain
// circles, because a projectile crossing a street for half a second does not
// earn a shadow volume.
//
// SHADOW QUADS, NOT A VISIBILITY POLYGON. The textbook answer is to build the
// polygon of everything the light CAN see, by sorting every obstacle corner by
// angle and sweeping. That is the right algorithm for one light and a hundred
// walls; it is the wrong one here, because it has to be rebuilt whenever the
// obstacle set changes and it produces a shape that is awkward to draw with a
// soft edge. Instead each obstacle casts its own quad AWAY from the light, and
// those quads are painted back over the lit area. Union by overdraw: two
// shadows that overlap are just drawn twice, which costs nothing and looks the
// same.
//
// WHY THIS FILE IS PURE. The geometry is the part that is easy to get subtly
// wrong -- a silhouette picked from the wrong pair of corners gives a shadow
// that leans the wrong way, and it looks plausible in a screenshot until you
// walk round it. So it takes numbers and returns numbers, and the suite checks
// it against cases whose answers can be worked out by hand.
// ===========================================================================

/** How far past the light's own radius a shadow quad is extended. Shadows are
 *  cast to beyond the lit area so the quad always covers the light it is
 *  cutting, rather than stopping short and leaving a lit crescent. */
export const SHADOW_OVERSHOOT = 1.6;

/** An obstacle nearer to the light than this is ignored. A lamp standing
 *  inside its own post's collision box would otherwise shadow everything. */
export const SHADOW_MIN_DIST = 6;

/**
 * The four corners of a rectangle given as a centre and half-extents.
 * Kept as a function because every caller was writing it out and two of them
 * wrote it differently.
 */
export function rectCorners(cx, cy, hw, hh) {
  return [
    [cx - hw, cy - hh], [cx + hw, cy - hh],
    [cx + hw, cy + hh], [cx - hw, cy + hh],
  ];
}

/**
 * The shadow one rectangle casts from a light at (lx, ly).
 *
 * Returns `[[x,y] x 4]` -- the silhouette pair and their two projections -- or
 * null when this obstacle casts nothing worth drawing.
 *
 * THE SILHOUETTE IS THE ANGULAR EXTREME PAIR. For a convex shape the edge of
 * its shadow is cast by the two corners furthest apart in ANGLE as seen from
 * the light, not the two furthest apart in space -- those are the diagonal,
 * which is wrong whenever the light is off to one side. Angles are compared
 * relative to the direction of the shape's centre so the comparison does not
 * break across the -pi/+pi seam, which is the bug this comment exists to stop
 * somebody reintroducing.
 */
export function shadowQuad(lx, ly, cx, cy, hw, hh, reach) {
  const dx = cx - lx, dy = cy - ly;
  const dist = Math.hypot(dx, dy);
  if (dist < SHADOW_MIN_DIST) return null;         // the light is on top of it
  if (dist - Math.hypot(hw, hh) > reach) return null;   // out of the light
  // ...AND THE LIGHT CAN BE INSIDE A BOX IT IS NOT NEAR THE CENTRE OF, which
  // is not a hypothetical: a run of wall tiles merges into one long thin
  // rectangle, and a lamp two tiles down the street from its midpoint sits
  // well inside that rectangle's span while being 144 units from its centre.
  // Measured on the only lamp in the world with a wall beside it, where the
  // silhouette came back folded and the ground behind the wall stayed lit.
  // A light inside a caster casts nothing: there is no outside to shade.
  if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) return null;
  const base = Math.atan2(dy, dx);
  const corners = rectCorners(cx, cy, hw, hh);
  let lo = null, hi = null, loA = Infinity, hiA = -Infinity;
  for (const c of corners) {
    const a = Math.atan2(c[1] - ly, c[0] - lx);
    // Relative to the centre's bearing, wrapped into (-pi, pi]. Comparing raw
    // atan2 values puts a shape straddling the seam at both extremes at once.
    let rel = a - base;
    while (rel <= -Math.PI) rel += Math.PI * 2;
    while (rel > Math.PI) rel -= Math.PI * 2;
    if (rel < loA) { loA = rel; lo = c; }
    if (rel > hiA) { hiA = rel; hi = c; }
  }
  if (!lo || !hi || lo === hi) return null;
  const far = reach * SHADOW_OVERSHOOT;
  const push = (c) => {
    const ux = c[0] - lx, uy = c[1] - ly;
    const l = Math.hypot(ux, uy) || 1;
    return [c[0] + (ux / l) * far, c[1] + (uy / l) * far];
  };
  // Wound so the quad is simple (non self-intersecting): near pair in one
  // order, far pair in the reverse.
  return [lo, hi, push(hi), push(lo)];
}

/**
 * Every shadow a light casts, as quads in coordinates RELATIVE TO THE LIGHT.
 *
 * Relative, because that is what makes baking work. The isometric projection
 * is linear, so a point's screen position is the light's screen position plus
 * the projection of the offset -- which means a quad baked once as offsets can
 * be drawn at any screen position the lamp ends up at, without re-running any
 * of this. Bake in absolute coordinates and the cache is invalidated by the
 * camera moving, which is every frame.
 */
export function bakeShadows(lx, ly, obstacles, reach) {
  const out = [];
  for (const o of obstacles) {
    const hw = o.hw ?? o.radius ?? 0;
    const hh = o.hh ?? o.radius ?? 0;
    if (!(hw > 0) || !(hh > 0)) continue;
    const q = shadowQuad(lx, ly, o.x, o.y, hw, hh, reach);
    if (!q) continue;
    out.push(q.map(([x, y]) => [x - lx, y - ly]));
  }
  return out;
}

/**
 * Is this point in shadow from a light at the origin?
 *
 * Not used by the renderer -- which paints the quads rather than asking per
 * pixel -- but it is how the suite checks that a shadow actually falls where
 * a person would expect, which is the only way to test geometry that is
 * otherwise judged by eye.
 */
export function inShadow(px, py, quads) {
  for (const q of quads) {
    let inside = false;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      const [xi, yi] = q[i], [xj, yj] = q[j];
      const hit = ((yi > py) !== (yj > py))
        && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi);
      if (hit) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// CHOOSING WHAT CASTS.
//
// Everything solid near a lamp could cast, and near a city gate that is a
// wall run, a guard house, four rocks and a parked wagon. A cap is needed --
// the bake is one-off but it is one-off DURING PLAY, when the viewport pools
// the lamp in -- and the interesting question is which ones to keep.
//
// NOT THE NEAREST. Sorted by distance, forty pebbles in a forest crowd out the
// house behind them, and the house is the one the user noticed light passing
// through. Sorted by ANGULAR SIZE -- how much of the view from the lamp the
// thing actually covers -- the house wins, which is the same ordering the eye
// uses when it decides a shadow is missing.
// ---------------------------------------------------------------------------

/** How many casters one light will bake. Past this the rest are pebbles. */
export const SHADOW_MAX_CASTERS = 40;

/** A collision DISC's half-extent as a square, as a fraction of its radius.
 *  A building's radius is sized to stop a body walking into the art, which is
 *  wider than the walls; the square inscribed in it is closer to the footprint
 *  than the square around it, and a shadow that is too wide is the one people
 *  notice. */
export const SHADOW_DISC_INSET = 0.72;

/** World reach for a light whose radius is given in SCREEN pixels. Under this
 *  projection a unit of world measures between 0.71 and 1.41 screen px
 *  depending on its direction, so a world reach of 1.45x the screen radius is
 *  the smallest that cannot cull something able to cast into the lit disc. */
export const SHADOW_REACH_SLACK = 1.45;

/**
 * The casters for a light at (lx, ly), in angular-size order, capped.
 *
 * `items` are `{ x, y, radius }` (a collision disc) or `{ x, y, hw, hh }` (a
 * rectangle, which is what a merged run of solid tiles is). Returns
 * `{ x, y, hw, hh }` either way, so the caller has one shape to bake from.
 */
export function castersFor(lx, ly, items, reach, cap = SHADOW_MAX_CASTERS) {
  const scored = [];
  for (const o of items) {
    let hw = o.hw, hh = o.hh;
    if (hw === undefined && o.radius > 0) hw = hh = o.radius * SHADOW_DISC_INSET;
    if (!(hw > 0) || !(hh > 0)) continue;
    const d = Math.hypot(o.x - lx, o.y - ly);
    if (d > reach) continue;
    if (d < SHADOW_MIN_DIST) continue;
    // Angular size, near enough: the half-extent over the distance. Not an
    // exact subtended angle -- it does not need to be, it needs to put the
    // house above the pebble and it does.
    scored.push({ x: o.x, y: o.y, hw, hh, w: Math.max(hw, hh) / d });
  }
  scored.sort((a, b) => b.w - a.w);
  return scored.slice(0, cap).map(({ x, y, hw, hh }) => ({ x, y, hw, hh }));
}

/**
 * Baked quads, put through a projection.
 *
 * `project(dx, dy)` takes a WORLD offset and returns a SCREEN offset -- which
 * is only meaningful because the projection is linear, and that is the whole
 * reason the bake is done in offsets. `riseY` is added to every y: a lamp's
 * light hangs at the lantern while its shadows radiate from the post's foot,
 * so the quads sit that far below the centre of the light they are cutting.
 */
export function projectQuads(quads, project, riseY = 0) {
  return quads.map(q => q.map(([dx, dy]) => {
    const p = project(dx, dy);
    return [p.x, p.y + riseY];
  }));
}

/** Faults: the things that would make a shadow wrong rather than absent. */
export function occlusionFaults() {
  const out = [];
  if (!(SHADOW_OVERSHOOT > 1)) out.push('shadows stop short of the light they cut');
  if (!(SHADOW_MIN_DIST > 0)) out.push('a light inside a wall is not handled');
  // A wall due east of a light must shadow the ground FURTHER east and
  // nothing to the west. This is the property the whole file exists for, so
  // it is asserted here as well as in the suite -- a fault check that only
  // repeats the constants is not checking the thing.
  const q = shadowQuad(0, 0, 100, 0, 10, 10, 200);
  if (!q) out.push('a wall in front of a light casts nothing');
  else {
    const shade = [q.map(([x, y]) => [x, y])];
    if (!inShadow(160, 0, shade)) out.push('the ground behind a wall is lit');
    if (inShadow(-60, 0, shade)) out.push('the ground in front of a wall is shadowed');
    if (inShadow(0, 160, shade)) out.push('a wall shadows a direction it does not face');
  }
  // The cap must prefer the big thing to the near thing, which is the ordering
  // rule and not an implementation detail: a house at 120 beats a pebble at 40.
  const picked = castersFor(0, 0, [
    { x: 40, y: 0, radius: 15 },
    { x: 120, y: 0, radius: 92 },
  ], 400, 1);
  if (!picked.length || picked[0].x !== 120) out.push('the cap keeps pebbles over houses');
  if (!(SHADOW_REACH_SLACK >= Math.SQRT2)) out.push('the world reach can cull a caster that reaches');
  if (!(SHADOW_DISC_INSET > 0 && SHADOW_DISC_INSET <= 1)) out.push('a disc inset outside (0,1]');
  return out;
}
