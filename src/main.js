// Sparkstone -- Phaser 3 port, entry point.
//
// Phaser is vendored as a static prebuilt ESM bundle at public/vendor/
// (phaser.esm.min.js, straight from the official phaserjs/phaser repo's
// dist/ folder, MIT-licensed -- see public/vendor/PHASER_LICENSE.md) and
// imported directly as a browser-native ES module. There is no npm install
// and no bundler/build step: this whole project runs by serving the
// directory root with any static file server and opening index.html.
//
// (Why: this sandbox has no live npm registry access, which made the
// originally-planned Vite dev/build pipeline non-viable here. Phaser ships
// ready-to-use browser bundles in its own repo, so vendoring one directly
// sidesteps the need for npm entirely. A real Vite pipeline can be added
// later in an environment with normal registry access -- nothing about the
// project structure below depends on this choice, since `import Phaser from
// '...'` is exactly what a bundled setup would also write.)
import Phaser from '../public/vendor/phaser.esm.min.js';
import WorldScene from './scenes/WorldScene.js';
import { RENDER_W, RENDER_H, RENDER_SCALE, RENDER_FILTER } from './data/renderScale.js';

// ROUND 146 -- THE BACKING STORE STOPS BEING A QUARTER OF THE SCREEN.
//
// Measured on the r145 tree in a 2560 x 1440 window (tools/probe_upscale_pipeline.cjs):
//
//   canvas backing store              960 x 600     0.58 MP
//   #game-root transform              x 2.4
//   canvas as it reaches the screen   2304 x 1440   3.32 MP
//   player idle frame 64px source     192px on screen -- a 3.0x upscale, NEAREST
//
// The renderer was producing 17% of the pixels being displayed and the other
// 83% were nearest-neighbour duplicates. Round 92 answered "the game only takes
// up 25% of my screen" by CSS-scaling the box: that fixed the SIZE and left the
// RESOLUTION alone, and this is the other half of it.
//
// `pixelArt: true` samples NEAREST, which is right for hand-authored pixel art
// and wrong for this project -- the art is soft painterly render, and nearest
// at 3x turns every soft edge into a staircase.
//
// No art is touched. The camera's zoom doubles alongside (WORLD_ZOOM in
// WorldScene.js), so the visible world is unchanged at 768 x 480 units; the
// canvas keeps its 960 x 600 LAYOUT box below, so no HTML UI moves.
const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // ROUND 148 -- the SHIPPING numbers come through renderScale.js, which
  // returns them unchanged unless a `?render=` is on the URL. Nothing but the
  // test harness ever puts one there; see that file for why the estate wants
  // a smaller canvas and why it is safe.
  width: RENDER_W,               // ROUND 146 -- 1920, was 960
  height: RENDER_H,              // ROUND 146 -- 1200, was 600
  backgroundColor: '#3a5a3a',
  // ROUND 148 -- linear unless the harness asks for nearest. Bilinear is free
  // on a GPU and four scalar texture reads per pixel without one, and no suite
  // looks at the picture.
  pixelArt: RENDER_FILTER === 'nearest',   // ROUND 146 -- false ships
  antialias: RENDER_FILTER !== 'nearest',
  // ROUND 146 -- roundPixels stays TRUE, and this is a measurement, not the
  // brief. The brief asked for `false` and said to keep `true` if slowly-moving
  // sprites shimmer. Measured both ways with tools/probe_round146_frames.cjs --
  // a diagonal walk, a building's rendered screen position sampled every frame,
  // counting steps that reverse direction. See ROUND146_NOTES.md for what the
  // two runs said and why this is the one that shipped.
  roundPixels: true,
  input: {
    gamepad: true,
  },
  scene: [WorldScene],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);

// ROUND 146 -- THE BACKING STORE GREW; THE LAYOUT BOX DID NOT.
//
// Everything about this page's geometry is built on the canvas being 960 x 600
// in CSS pixels: #game-root is that size, the 40-odd HTML panels are positioned
// inside it, and fitGameRoot() scales the whole box by one number. Pinning the
// canvas's CSS size here means the only thing that changed is how many pixels
// the renderer puts INSIDE that box -- which is the entire point of the round,
// and the reason no UI element had to move.
// ROUND 148 -- the LAYOUT box is 960 x 600 whatever the backing store is, so a
// reduced-resolution test run has the same page geometry as the shipping build
// and every HTML-positioned panel is where it was. That is why the suites can
// run at half size without a single coordinate assertion moving.
game.canvas.style.width = '960px';
game.canvas.style.height = '600px';

window.__sparkstoneGame = game;

// ===========================================================================
// ROUND 151 -- THE PAGE SAYS WHEN IT IS RUNNING A ROUND THAT IS NO LONGER
// THERE.
//
// The user, having run the rebuild:
//
//   "I've also updated using rebuild sparkstone to 150 but the version was
//    reading 140"
//
// -- on the published site. The folder on his Desktop was verified as r150
// before it deployed and the push reported success. So ten rounds of work had
// been delivered, built, published and not seen, and the only thing that ever
// said so was him reading a number on the title screen and thinking it looked
// wrong.
//
// TWO NUMBERS THAT MUST AGREE, and the point is that they come from different
// files fetched at different times:
//
//   `?v=` on this module's own URL -- stamped into index.html at BUILD time by
//         rebuild_desktop.sh, out of version.js. It travels with index.html.
//   GAME_VERSION                   -- imported from src/data/version.js, a
//         separate request the browser may answer from its own cache.
//
// If index.html is current and version.js is not, they differ, and that is
// proof of a stale cache rather than a guess about one. Nothing else in the
// page can tell the difference: a cached module graph looks exactly like a
// correct one from the inside.
//
// IT ONLY SPEAKS WHEN THERE IS SOMETHING TO SAY. No `?v=` means a dev server
// or a hand-served folder, where the stamp is not applied and a mismatch would
// be meaningless; matching numbers say nothing at all.
import('./data/version.js').then(({ GAME_VERSION }) => {
  const stamped = new URL(import.meta.url).searchParams.get('v');
  if (!stamped || String(stamped) === String(GAME_VERSION)) return;
  const el = document.createElement('div');
  el.id = 'staleBuildBanner';
  el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;'
    + 'background:#7a1f1f;color:#ffe9e9;font:13px/1.45 system-ui;'
    + 'padding:8px 14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.5)';
  el.textContent = `This page was built for round ${stamped} but is running round `
    + `${GAME_VERSION} out of your browser cache. Reload with Ctrl+Shift+R `
    + `(Cmd+Shift+R on a Mac) to get round ${stamped}.`;
  document.body.appendChild(el);
  // Said in the console as well, because a banner is easy to dismiss and hard
  // to paste into a message.
  console.warn(`[sparkstone] stale build: index.html is round ${stamped}, `
    + `version.js is round ${GAME_VERSION}`);
}).catch(() => {});
