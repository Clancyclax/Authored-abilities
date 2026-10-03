// ---------------------------------------------------------------------------
// ROUND 148 -- THE TEST ESTATE STOPS RENDERING AT SHIPPING RESOLUTION.
//
// Round 146 raised the backing store to 1920 x 1200 for the reason the user
// asked: the renderer was producing 17% of the pixels on the screen and the
// other 83% were nearest-neighbour duplicates. On a machine with a graphics
// card that costs nothing.
//
// THIS CONTAINER HAS NO GRAPHICS CARD. Chromium falls back to SwiftShader,
// which shades every pixel on the CPU, so the render cost is directly
// proportional to the backing store -- four times the pixels, four times the
// work, measured as 46.2ms -> 228.5ms a frame. The whole test estate pays it,
// every suite, every run.
//
// AND NO SUITE IN THE ESTATE JUDGES THE PICTURE. They assert positions, counts,
// state and text; not one of them looks at a pixel. So the render size is a
// knob that only the harness ever needs to turn, and the shipping build never
// touches.
//
// THE PROPERTY THAT MAKES IT SAFE, and it is the whole safety argument:
//
//     the camera zoom scales by the SAME factor as the canvas
//
// so the visible world stays 768 x 480 world units at every setting. A suite
// that counts what is on screen, or asks whether something is off it, sees
// exactly what it saw before. test_round148_render.cjs asserts this rather
// than trusting this paragraph.
//
//   ?render=0.5&filter=nearest   -> 960 x 600, nearest sampling
//   (nothing)                    -> 1920 x 1200, linear. What ships.
// ---------------------------------------------------------------------------

// The shipping backing store. These MUST match what src/main.js ships, and the
// suite asserts that they do -- two numbers in two files that have to agree is
// this project's own fault class 2, and the check is what stops them drifting.
export const BASE_W = 1920;
export const BASE_H = 1200;

// Below this the game is smaller than a phone and something is wrong with the
// caller; above it there is no point, because the scale exists to make the
// estate cheaper. A value outside the range is clamped rather than honoured:
// `?render=99` should give a normal build, not a 190-megapixel canvas that
// takes the container down.
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 1;

/** Read the knob out of a query string. Defaults to 1 -- the shipping build
 *  passes nothing and gets full resolution.
 *
 *  Takes the search string rather than reading `location` itself so it can be
 *  tested without a browser, and so there is one place that decides. */
export function renderScaleFrom(search) {
  const raw = new URLSearchParams(search || '').get('render');
  if (raw === null) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));
}

/** 'nearest' or 'linear'. Nearest is the second half of the saving and it is
 *  not optional: measured, `?render=0.5` alone gave 73.8ms a frame and
 *  `?render=0.5&filter=nearest` gave 44.7ms. Bilinear sampling is four texture
 *  reads per pixel in scalar code on a software rasteriser, and no suite in the
 *  estate looks at the picture. */
export function renderFilterFrom(search) {
  return new URLSearchParams(search || '').get('filter') === 'nearest'
    ? 'nearest' : 'linear';
}

const SEARCH = (typeof location !== 'undefined' && location.search) || '';

export const RENDER_SCALE = renderScaleFrom(SEARCH);
export const RENDER_FILTER = renderFilterFrom(SEARCH);
export const RENDER_W = Math.round(BASE_W * RENDER_SCALE);
export const RENDER_H = Math.round(BASE_H * RENDER_SCALE);
