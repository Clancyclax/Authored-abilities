// Summon creature art layout -- duck and chicken, from the user's PixelLab
// uploads ("a duck in a waddling [walk]" / "a stout chicken with bright
// [colors]"). The user's own words: "The duck and chicken are meant to be
// summons, not monsters." Their art is fully extracted and atlased (see
// extract_new_creatures.py and public/assets/duck_*.png / chicken_*.png),
// but there is no summon-casting ability in this game yet -- no ability
// template spawns a friendly, following-or-fighting creature the way
// fire/might/heal/shadow/avatar do their own things (see abilities.js).
// Wiring an actual summon mechanic is real, scoped future work: it needs at
// minimum a new ability template kind, a friendly-unit AI state machine
// (follow the player, maybe fight nearby monsters), and a lifetime/dismiss
// rule, none of which exist yet. This file exists so that work can start
// straight from ready-to-use art instead of nothing, WITHOUT this round
// guessing at a whole unrequested gameplay system to attach it to.
//
// Both creatures are single-design (no color variants) -- unlike the
// hunted monster roster, a "rare gold duck" reads as a joke, not a tier of
// threat, so no palette-variant treatment was applied here, matching the
// original ask being specifically about the MONSTER roster's palettes.
//
// Neither is exported from monsters.js and neither appears in
// MONSTER_TYPES/FAMILY_TEMPERAMENT/the bestiary -- they don't spawn in the
// world and aren't huntable, so they don't belong in a monster codex.

// --- Duck: 48px cell, 8 dir cols x 8-frame run (dirCol*8+frame). Only
// north/south had real running frames in the upload; east/west/diagonals
// fall back to the idle pose repeated across all 8 frames (baked into
// duck_run.png at build time, same graceful-fallback convention as
// hydraWalk's missing northwest / elemental's missing northwest+southwest
// -- no special-case code needed to use it).
//
// ROUND 178 -- THE FLAVOUR ANIMATION THAT WAS NEVER PACKED. This comment
// used to say a 9-frame idle-fidget "is also extracted". It is not. Measured
// off the files: duck_idle.png is 384x48, which is EIGHT 48px cells -- one
// idle pose per direction -- and there is no flavour sheet in public/assets
// at all. The same goes for the chicken's seventeen.
//
// The two counts stay, because they are true about the UPLOAD and are what
// whoever packs those sheets will need. What could not stay is a comment
// saying the work was done: a future round pointing an animation at
// duck_idle.png expecting nine frames would have run a frame past the end of
// an eight-frame sheet, and read whatever was beside it. The sheet geometry
// every summon actually draws from is asserted against the files on disk in
// the data lane now, so the two can no longer disagree in silence.
export const DUCK_CELL = 48;
export const DUCK_RUN_FRAMES = 8;
export const DUCK_FRAME_MS = 90;
/** The upload's fidget animation, NOT a sheet in public/assets. See above. */
export const DUCK_FLAVOR_FRAMES = 9;
export const DUCK_FLAVOR_FRAME_MS = 110;
export const DUCK_DISPLAY_SCALE = 1.04;

// --- Chicken: 52px cell, 8 dir cols x 8-frame run, full 8-dir coverage (no
// fallback needed). The flavour anim (a rhythmic peck/step) is 17 frames IN
// THE UPLOAD and, like the duck's, was never packed -- chicken_idle.png is
// 416x52, eight cells, one pose per direction. See the duck's note above.
export const CHICKEN_CELL = 52;
export const CHICKEN_RUN_FRAMES = 8;
export const CHICKEN_FRAME_MS = 90;
export const CHICKEN_FLAVOR_FRAMES = 17;
export const CHICKEN_FLAVOR_FRAME_MS = 90;
export const CHICKEN_DISPLAY_SCALE = 1.12;

// --- ROUND 73 -- THE HUMANOID DRAGON: the stand-in for any summon with no
// model of its own.
//
// The user: "For all summons where an appropriate model is not available use
// the 'humanoid dragon' I've attached here. This will allow me to identify
// where models are needed vs not working in the future."
//
// So this is a DIAGNOSTIC first and a creature second. What it replaces is a
// 5px coloured circle, which looked identical to a summon that had failed to
// spawn -- and round 73's item 6 was exactly that confusion, an escort with no
// runtime reported as "an invisible summon". A dragon on screen means the
// summon works and wants art; nothing on screen now means the summon is broken.
//
// Same 8-direction layout as the duck and the chicken (see
// extract_round73_dragon.py) so the familiar draw loop indexes it with the same
// `dirCol * FRAMES + frame` arithmetic and needed no new case. Six run frames,
// not eight: that is what the upload carries.
export const DRAGON_CELL = 64;
export const DRAGON_RUN_FRAMES = 6;
export const DRAGON_FRAME_MS = 95;
// Smaller than 1.0 on purpose. At 64px it is the biggest summon sheet in the
// game -- a head taller than the player -- and a stand-in that dominates the
// screen reads as a design decision rather than as a placeholder.
export const DRAGON_DISPLAY_SCALE = 0.72;
