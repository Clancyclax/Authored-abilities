// ===========================================================================
// ROUND 81 ITEM 3 -- THE PERFORMANCE BUDGETS, IN ONE PLACE.
//
//   "Increase the display cap by 30%"
//
// The display-list cap has existed since round 43 as a number typed into two
// different suites, and nothing in the game itself declared it. That is how a
// budget drifts: round 43 wrote `r.children < 4000`, round 66 wrote
// `ins.displayAfter < 4000`, and raising it meant finding both and hoping
// there was not a third. It is one export now, and both suites import it.
//
// WHAT THE CAP IS. Phaser's display list is every Game Object the scene is
// drawing -- sprites, images, text, graphics. It is not a hard engine limit;
// it is a self-imposed budget, because this scene is a whole open world and
// the cost of drawing scales with the count. Round 43 introduced it after the
// forest build went quadratic, and the discipline it enforces is that new
// content arrives POOLED BY VIEWPORT (draw what is near, not what exists) --
// which is how the rocks, the trees, the flora, the city props and the road
// priests are all built.
//
// ROUND 81 -- 4000 -> 5200, at the user's instruction and by their arithmetic.
//
// It had been red since round 79 and was at 4,075 after round 80's larger city
// walls. The honest options were "raise it" or "spend a round pooling the wall
// sprites", and the user chose the first. Worth recording what that buys:
// 1,125 objects of headroom on a measured 4,075, which is about where the
// figure sat before round 78's new content arrived. The reason it is a real
// choice rather than a rubber stamp is that the number is a proxy for frame
// cost on the weakest machine the game is expected to run on, and nothing here
// measures that -- so if the game starts to feel heavy, this is the first
// number to look at and the walls are the first thing to pool.
// ROUND 158 -- 5200 -> 7800, at the user's instruction, +50%.
//
// IT HAD BEEN RED FOR AT LEAST FIVE ROUNDS AND NOBODY WAS LOOKING. Measured
// on three trees: r153 6042, r156 6016, r157 6012. So it went over somewhere
// before round 153 and has drifted DOWN slightly since -- round 157's twenty
// sewer rooms are lazy and cost nothing until a door is opened. A budget that
// has been over for five rounds is not a budget, it is a warning light nobody
// resets, and that is the actual fault here rather than the number.
//
// WHAT THE LIST IS MADE OF, measured at 1280x900 standing in Cadence:
//
//   5,976 objects  (4,282 of them visible)
//   3,619  61%  GROUND -- grassTile 1503, cityTile 1459, cityStone~road 657
//     919  15%  WALLS  -- wallBack 244, wallTrim 231, castle_wall x3 444
//     409   7%  BUILDINGS -- structures, townPool, structuresXl, singletons
//     321   5%  INTERIOR PROPS
//     708  12%  everything else
//
// The ground is viewport-pooled and is SUPPOSED to be most of it -- that is
// the discipline this cap exists to enforce. The walls are not pooled, and
// round 81's note already named them: "the walls are the first thing to pool".
// They still are. 919 objects is most of a round's worth of headroom sitting
// in a subsystem that draws masonry the player is standing a mile from.
//
// WHY NOT DOUBLE IT. The non-ground part of the whole game is 2,357 objects.
// A cap of 10,400 would leave 4,424 of headroom on today's build -- nearly
// twice the total of every building, wall, prop and interior in the world. At
// that point the game could double all of its content and this check would
// never fire, which is the same as deleting it. 7,800 leaves 1,824, which is
// several rounds of pooled content and still trips on a new UNPOOLED
// subsystem -- and tripping on those is the entire job.
//
// NOTHING HERE MEASURES FRAME TIME, and an attempt to measure it in the test
// container returned 800ms frames, which is the headless renderer and not the
// game. Round 81's sentence stands unchanged and is the reason this is a real
// choice rather than a rubber stamp: this number is a PROXY for frame cost on
// the weakest machine the game is expected to run on. The proxy is now sized
// so that it can still say no.
export const DISPLAY_LIST_CAP = 7800;

/** What the cap was before, kept so a suite can say how much room was added
 *  rather than just asserting the new number. */
export const DISPLAY_LIST_CAP_PREVIOUS = 5200;

/**
 * ROUND 158 -- AND A FLOOR UNDER THE BUDGET, so raising it has a limit.
 *
 * The failure this round is fixing is not "the number was too small"; it is
 * that the number sat red for five rounds. The failure a raise invites is the
 * opposite one -- a cap so far above the build that it can never go red again,
 * which reads as green forever and means nothing.
 *
 * So the suite now asserts BOTH ends: the world fits under the cap, and the
 * cap is not more than this much bigger than the world. If a future round
 * wants more headroom than this allows, it has to pool something instead --
 * which is the choice round 81 said was the honest alternative and did not
 * make enforceable.
 */
// ===========================================================================
// ROUND 184 -- AND THE NUMBER ABOVE IS NOT RENDER-INDEPENDENT, WHICH IS WHY
// THE CHECK ON IT HAD BEEN RED FOR EIGHT ROUNDS.
//
// `run_fast.sh` runs the whole estate at SPARKSTONE_RENDER=0.5 (round 148, a
// speed optimisation: 73.8ms a frame became 44.7ms). Round 158 measured the
// cap standing in Cadence at FULL render and got 5,976. Measured this round,
// same place, same build:
//
//   full render   6,078 objects   4,388 of them visible
//   half render   4,574 objects   4,387 of them visible
//
// The VISIBLE count is identical. What changes is the pooled-but-offscreen
// margin the viewport keeps, which is sized off the render scale -- so the
// total is a fact about the harness as much as about the world, and a budget
// read from it under the runner is a budget compared against a different
// world than the one it was set for. That is this project's fault class 7 in
// its purest form: the probe changing the thing it measures.
//
// WHAT IT COST. Round 180 read the inflated slack, concluded the world had
// lost 1,500 objects, and bisected three source trees to find when -- getting
// 75%, 75% and 73%. Every one of those was the render scale. Three agreeing
// measurements of the wrong quantity look exactly like a confirmed finding,
// and the variable being changed was never the one that mattered.
//
// So the budget is expressed against WHAT IS DRAWN. The headroom intent is
// carried over unchanged: round 158 chose 7,800 against 5,976 (a 1.305
// multiple) and its visible count was 4,282, so the same multiple gives 5,588
// -- rounded to 5,600. Today's build sits at 4,388 visible, 28% slack, and it
// reads the same whichever render scale the harness is using.
//
// ROUND 191 -- RE-MEASURED, AND LOWER. Round 188 rebuilt Cadence on the grid
// and the visible count in the same place fell to 3,520 (measured on round
// 188's own tree) and 3,560 today -- the grid city simply draws less than the
// spiral did. Against 5,600 that is 57% slack, and a cap that far above the
// world is the "formality" round 158 warned about: it could not say no to a
// new unpooled subsystem of 1,500 objects. Same 1.305 multiple as round 158,
// against what is drawn now: 3,560 x 1.305 = 4,646, rounded to 4,650.
export const DISPLAY_LIST_VISIBLE_CAP = 4650;

export const DISPLAY_LIST_HEADROOM_MAX = 0.45;
