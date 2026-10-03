import { REGIONS as WORLD_REGIONS } from './regions.js';
// ============================================================================
// ROUND 67 -- SOUND.
//
// The engine has supported it since round 43 ("gets sound support as a side
// effect of switching engines") and the game has been silent for twenty-four
// rounds. Round 65's review listed it as the oldest open item in the project.
//
// The user supplied five music tracks and five ambiance beds, and is holding
// back "a large amount of spell and weapon sounds" until this exists. So the
// design goal is not "play the ten files we have" -- it is a bus architecture
// those hundreds of files can be poured into later without a second system.
//
// -------------------------------------------------------------------------
// FOUR BUSES, BECAUSE THE USER ASKED FOR FOUR SLIDERS
// -------------------------------------------------------------------------
//   master     everything, multiplied into the other three
//   music      the scored tracks
//   ambiance   the environmental beds, which run UNDER the music
//   spells     ability and weapon sound effects
//
// Effective volume is always `master * bus`, so pulling master to zero is a
// real mute and no bus can escape it. Stored per-slider so a player who muted
// music and then turns master back up gets music still muted, which is what
// every mixer in every game does and what people expect.
//
// -------------------------------------------------------------------------
// MUSIC AND AMBIANCE ARE DIFFERENT THINGS
// -------------------------------------------------------------------------
// Music is chosen by CONTEXT -- what you are doing and where you are standing.
// Ambiance is chosen by PLACE and TIME -- what the world outside sounds like.
// They layer: Region 1's forest bed keeps running under the Region 1 theme,
// and when you step into a cave the music changes to something eerie while the
// bed drops away, because a cave does not have birdsong in it.
//
// Both crossfade rather than cut. A hard switch at a region boundary is the
// single most noticeable thing bad game audio does.
// ============================================================================

// ROUND 68 -- audio.js imports the rosters it claims to cover.
//
// HANDOFF's fault class 2 is "a table keyed off a list that does not cover the
// roster", and it has bitten this project in three separate rounds. The only
// defence that works is for the table and the roster to be checkable against
// each other in one place, so audioFaults() below reads the real lists rather
// than a copy of them written down here.
import { WEAPON_ORDER, SWINGABLE_WEAPON_IDS } from './weapons.js';
import { MONSTER_FAMILIES } from './monsterArt.js';
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { FX_POOLS } from './fxLibrary.js';
import { ELEMENT_TYPES, DAMAGE_TYPES, DAMAGE_TYPE_KEYS } from './stats.js';
import { BODY_TYPES } from './appearance.js';
// ROUND 77 -- the character themes are keyed by companion, so the roster of
// companions is the roster this file has to be checkable against.
import { COMPANION_ARCS } from './companionStory.js';

/** The mixer's buses, in slider order. `master` first because it gates the rest. */
export const BUSES = ['master', 'music', 'ambiance', 'spells'];

export const BUS_LABELS = {
  master: 'Overall sound',
  music: 'Music',
  ambiance: 'Ambiance',
  spells: 'Spells',
};

/** Sensible starting mix: music present but under the world, effects forward. */
export const DEFAULT_VOLUMES = { master: 0.8, music: 0.5, ambiance: 0.45, spells: 0.7 };

/** Where the mix lives between runs. Its own key, not the save file: a mix is a
 *  property of the player's speakers, not of their character. */
export const VOLUME_STORE = 'sparkstone.volumes';

/** Seconds. Long enough to read as a transition, short enough not to muddy. */
export const CROSSFADE = 2.0;

// ---------------------------------------------------------------------------
// MUSIC
// ---------------------------------------------------------------------------

/**
 * `when` is evaluated against a small context object built by the scene:
 *
 *   { titleScreen, region, insideRoom, roomId, inCave, inSewer, night }
 *
 * FIRST MATCH WINS, so the list is ordered most specific first. That ordering
 * is the whole selection algorithm -- there is no scoring, no priority number
 * to keep in sync with anything, and adding a track means putting it in the
 * right place in one list.
 */
/** ROUND 104 -- regions the world has and nobody has scored yet.
 *  Named here so `checkAudio` can keep asserting that every OTHER region has a
 *  theme. It is a list of missing art, and the check immediately below the
 *  loop that uses it verifies both halves: every id is a real region, and none
 *  of them has quietly acquired a theme. Same shape, and the same reason, as
 *  ARMORED_ART_GAPS in armoredPlayer.js. */
/** ROUND 147 -- EMPTY, AND THAT IS THE POINT.
 *
 *  The Cinderwaste was the last one and the user sent its track, so every
 *  region the world has is scored. Kept as an empty list rather than deleted
 *  along with the two checks that read it: they still assert something real --
 *  that every region has a theme, and that this list never disagrees with the
 *  table -- and an empty list is where the eighth region will be written down
 *  on the day it arrives without a track. */
export const REGIONS_WITHOUT_THEME = [];

export const MUSIC = [
  {
    key: 'music_start_menu', file: 'music_start_menu.mp3',
    name: 'By Love or by Fear',   // ROUND 285 -- the game's name now
    when: (c) => c.titleScreen,
  },
  // =========================================================================
  // ROUND 77 -- THE CHARACTER THEMES.
  //
  // Four tracks arrived named for people rather than places, which is a kind
  // of cue this game has never had. Every rule in this list until now answers
  // "where is the player standing"; a character theme answers "who is
  // talking", and that is not a fact about the world.
  //
  // It is still ONE selection algorithm, because the alternative was a second
  // music system running beside this one and racing it for the same output.
  // The scene sets `charTheme` to a track key when a companion tells you the
  // next step of their story and clears it CHAR_THEME_HOLD seconds later; the
  // four rules below are just `c.charTheme === <own key>`. First-match-wins
  // does the rest, and the crossfade in and back out is the same crossfade a
  // region crossing uses.
  //
  // Placed directly under the title screen and ABOVE every room, cave and
  // region rule, because a companion's theme is deliberately triggered and
  // everything below is ambient. The one thing that outranks it is the main
  // menu, which is not part of the world at all.
  //
  // WHY A HOLD AND NOT THE DIALOGUE BOX. The obvious wiring is "play while the
  // box is open", and it is wrong: an arc step is read in five to fifteen
  // seconds and CROSSFADE is two seconds at each end, so the player would hear
  // a fade-in, four seconds of an intro, and a fade-out. A theme you cannot
  // hear is worse than no theme. The hold lets the track get somewhere, and it
  // ends on its own rather than on a keypress.
  // =========================================================================
  {
    key: 'music_char_zeke', file: 'music_char_zeke.mp3',
    name: "Zeke's Theme",
    when: (c) => c.charTheme === 'music_char_zeke',
  },
  {
    // ONE THEME, TWO SISTERS. The user shipped a single "Britanica Sister's
    // Theme" for a pair of twins who tell the same history differently, and
    // the apostrophe in their own filename is where it is on purpose. Both
    // Encykla and Aedia raise this.
    key: 'music_char_britanica', file: 'music_char_britanica.mp3',
    name: "The Britanica Sisters",
    when: (c) => c.charTheme === 'music_char_britanica',
  },
  {
    key: 'music_char_benjamin_sad', file: 'music_char_benjamin_sad.mp3',
    name: 'Benjamin (what was taken)',
    when: (c) => c.charTheme === 'music_char_benjamin_sad',
  },
  {
    key: 'music_char_benjamin', file: 'music_char_benjamin.mp3',
    name: 'Benjamin Iskarys',
    when: (c) => c.charTheme === 'music_char_benjamin',
  },
  {
    key: 'music_division', file: 'music_division.mp3',
    name: 'The Division of Essence',
    // The user: "a track specific to the division building interior".
    when: (c) => c.roomId === 'division_lab',
  },
  // ROUND 68 -- the interiors that got their own score.
  //
  // These sit ABOVE the cave rule and above every region rule, because the
  // list is first-match-wins and a room you are standing inside is more
  // specific than the country it is in. Below `division_lab` only because that
  // is one named room and these are classes of room.
  // ROUND 133 -- THE SOCIETY'S TWO ROOMS.
  //
  // The user sent both tracks and said what they are for: "A main hall where
  // zeke, Prism, and other random adventurers hang out (with the adventure
  // society theme) and a side room (With the item shop theme) that's the
  // adventurer society market."
  //
  // THE MARKET IS TESTED FIRST, and the order is load-bearing rather than
  // tidy: this list is first-match-wins, and every market room's id begins
  // with the hall's ('guild_market' is a `guild` room by prefix). Hall-first
  // would have played the Society theme in the market and the Item Shop theme
  // nowhere at all.
  //
  // PREFIX, NOT EQUALITY. `music_auction` below keys on `roomId === 'auction'`
  // and therefore misses all nine per-city Auction Houses, whose ids are
  // `auction_ont_city` and the like -- a silent gap since round 103 cloned
  // them. The Society halls clone the same way, so these two match the family
  // rather than the one room, and a player in Ontaria's Society Hall hears
  // what a player in Cadence's hears.
  {
    key: 'music_market', file: 'music_market.mp3',
    name: 'The Society Market',
    when: (c) => typeof c.roomId === 'string' && c.roomId.startsWith('guild_market'),
  },
  {
    key: 'music_society', file: 'music_society.mp3',
    name: 'The Adventure Society',
    when: (c) => typeof c.roomId === 'string'
      && (c.roomId === 'guild' || c.roomId.startsWith('guild_')),
  },
  {
    key: 'music_auction', file: 'music_auction.mp3',
    name: 'Under the Hammer',
    when: (c) => c.roomId === 'auction',
  },
  {
    // The user shipped the temple theme cut TWICE -- one for regions 1-3 and a
    // separate one for region 4 -- so the split is theirs, not a guess. Region
    // 4 is tested first because it is the narrower of the two claims; the
    // other one then catches every remaining temple without having to name
    // three regions it does not care about individually.
    key: 'music_temple_bratugal', file: 'music_temple_bratugal.mp3',
    name: 'Temple of the Gods (Bratugal)',
    when: (c) => isTempleRoom(c.roomId) && c.region === 'bratugal',
  },
  {
    key: 'music_temple', file: 'music_temple.mp3',
    name: 'Temple of the Gods',
    when: (c) => isTempleRoom(c.roomId),
  },
  {
    // ROUND 70 -- ASTRAL SPACE, on the portal square.
    //
    // AN INTERIM HOME, and flagged as one. The track is named for Act 2's
    // secret aperture to the player's astral space (DESIGN_STORY.md:82), and
    // Act 2 is not built -- `astral` appears nowhere in src/. Rather than hold
    // the track unreferenced the way Credits Music is held, it scores the one
    // place in the game that is already about stepping out of the world: the
    // eight-menhir portal square at Karsk Landing, which the story audit found
    // has terrain, a rank gate and two lines of dialogue and no atmosphere at
    // all. Moving it to the aperture when Act 2 exists is one `when` clause.
    //
    // Above the region rules because it is a PLACE inside a region, and below
    // the interiors because standing in a temple beats standing on a square.
    key: 'music_astral', file: 'music_astral.mp3',
    name: 'Astral Space',
    when: (c) => c.onPortalSquare,
  },
  // =========================================================================
  // ROUND 172 -- TWO TRACKS THE USER SENT, AND BOTH GO AT THE TOP.
  //
  //   "Added music for the boss fight, and a track to kick off at the start of
  //    the monster surge. (Monster surge should probably kick off whenever the
  //    player is dealing with large waves of monsters during the surge)"
  //
  // FIRST-MATCH-WINS IS THE WHOLE ALGORITHM, so a fight track has to be above
  // every PLACE track or the place swallows it -- a well boss is in a sewer,
  // and `music_sewer` would win every time. The same reason round 104 put the
  // sewer above the cave, applied to a row that is about what is happening
  // rather than about where you are.
  //
  // AND THE BOSS IS ABOVE THE SURGE. A surge boss is both, and "there is a
  // boss in front of me" is the more specific claim.
  // =========================================================================
  {
    key: 'music_boss', file: 'music_boss.mp3',
    name: 'Boss Fight',
    when: (c) => c.bossFight,
  },
  {
    // TWO WAYS IN, which is the user's own sentence read literally: the track
    // "kicks off at the start of the monster surge" AND "whenever the player
    // is dealing with large waves of monsters during the surge". The first is
    // a moment and the second is a condition, so the scene holds a short
    // window open when the surge begins and reports the wave the rest of the
    // time.
    key: 'music_surge', file: 'music_surge.mp3',
    name: 'The Monster Surge',
    when: (c) => c.surgeOpening || c.surgeWave,
  },
  {
    // ROUND 104 -- THE SEWER HAS ITS OWN SCORE, and it goes ABOVE the cave
    // rule rather than beside it. `inCave` is true under the sewer (its room
    // is an interior and the eerie track was what played down there), so a row
    // placed below would never be reached: first-match-wins means the more
    // specific claim has to be tested first. Same reason temple sits above
    // cave.
    key: 'music_sewer', file: 'music_sewer.mp3',
    name: 'The Sewers',
    when: (c) => c.inSewer,
  },
  {
    key: 'music_eerie', file: 'music_eerie.mp3',
    name: 'Something Down Here',
    // The user's words for this one were "cave eerie music". It also covers
    // barrows and lairs, which are caves by another name, and any interior
    // dark enough to want it.
    when: (c) => c.inCave,
  },
  // ROUND 73 -- A REGION THEME IS WILDERNESS MUSIC, AND A CITY IS NOT WILDERNESS.
  //
  // The user: "the region 1 music should not play in the city, but should start
  // up when you depart the city into the wilderness."
  //
  // Every one of the four themes was gated on `c.region` alone. `_audioContext`
  // has computed `inSettlement` since round 68 and the AMBIANCE selector reads
  // it -- `musicFor` never did, so standing in Cadence fell through the title,
  // room, portal and cave rules and landed on The Nek. A field read by one of
  // its two consumers and not the other.
  //
  // The four `!c.inSettlement` clauses below are the whole change. There is
  // deliberately NO city music track behind them: a city gets the city
  // ambiance bed and no theme, which is what the user described, and the theme
  // resumes on its own the moment `_inSettlementNow()` goes false -- the
  // settlement radius already has a generous 400-unit floor, so "departing"
  // happens at the outskirts rather than at the wall.
  // =========================================================================
  // ROUND 77 -- TWO CITIES GET A THEME BACK.
  //
  // Round 73 removed music from cities on the user's instruction and the note
  // above says why: "there is deliberately NO city music track behind them: a
  // city gets the city ambiance bed and no theme". That was correct for the
  // tracks that existed. The user has now written city themes for Harrowmoor
  // and Karsk Landing, so those two cities stop being silent and the other
  // two do not -- which is the same rule as before ("play what exists"), not a
  // reversal of it.
  //
  // Cadence and Vashra still get the city bed alone. When their themes arrive
  // this is two more rows.
  //
  // ABOVE the wilderness rules and gated on the same `inSettlement` flag,
  // inverted. The two halves of that flag now both lead somewhere, so a
  // region boundary and a city gate are the same kind of event to the mixer
  // and crossfade the same way.
  // =========================================================================
  {
    key: 'music_city_region2', file: 'music_city_region2.mp3',
    name: 'Harrowmoor',
    when: (c) => c.region === 'ontaria' && c.inSettlement,
  },
  {
    key: 'music_city_region3', file: 'music_city_region3.mp3',
    name: 'Karsk Landing',
    when: (c) => c.region === 'elehyd' && c.inSettlement,
  },
  {
    // ROUND 190 (item 10) -- "I've added some music for the city on the
    // island." Sirukh Sands is the island (a hot island of dunes and salt pan,
    // ringed by reef water); Tolbrand Quay is its city. Every settlement on
    // it plays this, the same rule the two city themes above follow.
    key: 'music_city_island', file: 'music_city_island.mp3',
    name: 'Tolbrand Quay',
    when: (c) => c.region === 'sirukh' && c.inSettlement,
  },
  {
    // ROUND 147 -- A HOUSE ON ITS OWN.
    //
    // THIS ROW SITS ABOVE THE REGION THEMES ON PURPOSE, and the first cut got
    // it wrong: appended at the end of the table it could never once have
    // played. `musicFor` stops at the FIRST match, so a rule that is a subset
    // of another -- out in region X, and also standing at a lone house -- has
    // to be tested before the rule it is a subset of. The city themes are at
    // the top of this table for exactly the same reason.
    //
    // Round 145 gave 57 lone dwellings somebody to live in: steadings,
    // lakeshore cabins, stilt shacks out in Bratugal's bog. This is the mood
    // for walking up to one, and it hands back to the region's own theme when
    // the player walks away.
    key: 'music_wilderness_house', file: 'music_wilderness_house.mp3',
    name: 'A House on its Own',
    when: (c) => c.atLoneHome && !c.inSettlement,
  },
  {
    key: 'music_region1', file: 'music_region1.mp3',
    name: 'The Nek',
    when: (c) => c.region === 'nek' && !c.inSettlement,
  },
  {
    // ROUND 68 -- Ontaria has a theme. Round 67 shipped `musicFor` returning
    // null here on purpose and said so in the comment above it; this is that
    // hole filled, not a fallback finally added.
    key: 'music_region2', file: 'music_region2.mp3',
    name: 'Ontaria',
    when: (c) => c.region === 'ontaria' && !c.inSettlement,
  },
  {
    key: 'music_region3', file: 'music_region3.mp3',
    name: 'Elehyd',
    when: (c) => c.region === 'elehyd' && !c.inSettlement,
  },
  {
    // ROUND 70 -- and Bratugal. Every region has a theme now; `musicFor`'s
    // header note about null being a real answer for Ontaria and Bratugal has
    // outlived both of its examples, which is the outcome it wanted.
    key: 'music_region4', file: 'music_region4.mp3',
    name: 'Bratugal',
    when: (c) => c.region === 'bratugal' && !c.inSettlement,
  },
  // =========================================================================
  // ROUND 104 -- TWO OF THE THREE NEW REGIONS GET A THEME.
  //
  // NAMED KEYS, not music_region5 and music_region7. The four rows above were
  // numbered when the world had four regions and the number was unambiguous.
  // It is not any more: Sirukh is the FIFTH region and REGIONS index 4, and
  // Ixcuatl is the seventh and index 6. Round 103 lost most of a day to
  // `regionIndex` meaning both a position and a tier -- a number that means
  // two things stops meaning both -- and there is no reason to mint two more.
  // The existing four keys stay as they are; renaming them would break every
  // save that has a track key in it for no gain.
  //
  // THE CINDERWASTE HAS NO THEME. Three tracks arrived and it was not one of
  // them, so region 6 falls through to no music, exactly as Ontaria and
  // Bratugal did between rounds 67 and 70. That is a hole, not a fallback:
  // when its track exists this is one more row.
  //
  // ROUND 147 -- and it is. The user sent it, so this is the one more row the
  // note above promised, and the hole is closed: every region has a theme.
  // =========================================================================
  {
    key: 'music_sirukh', file: 'music_sirukh.mp3',
    name: 'Sirukh Sands',
    when: (c) => c.region === 'sirukh' && !c.inSettlement,
  },
  {
    key: 'music_ixcuatl', file: 'music_ixcuatl.mp3',
    name: 'The Abandoned City',
    when: (c) => c.region === 'ixcuatl' && !c.inSettlement,
  },
  // =========================================================================
  // ROUND 147 -- THE TWO TRACKS THE USER SENT.
  // =========================================================================
  {
    key: 'music_cinder', file: 'music_cinder.mp3',
    name: 'The Cinderwaste',
    when: (c) => c.region === 'cinder' && !c.inSettlement,
  },
];

// ---------------------------------------------------------------------------
// ROUND 77 -- WHO RAISES WHICH THEME
// ---------------------------------------------------------------------------

/** Seconds a character theme holds after the line is told. Long enough for the
 *  track to reach something, short enough that the world comes back while the
 *  player is still near the person who raised it. */
export const CHAR_THEME_HOLD = 80;

/**
 * Companion id -> the theme they raise, or a function of how many steps of
 * their arc they have told.
 *
 * BENJAMIN HAS TWO AND THE SPLIT IS THE ARC'S OWN SHAPE. Steps 1-5 are the
 * losing of it -- the kit, the word for it, the house, the name taken, the
 * childhood that went with it. Step 6 is the sentence where he turns ("I have
 * had five years and I have thought it through") and step 7 is what he has
 * instead. So the sad theme covers 1-5 and his own covers 6-7, and the change
 * of music IS the turn. Splitting anywhere else -- at the midpoint, or at the
 * last step -- would score the words without scoring what they do.
 *
 * `told` is the count AFTER this step, which is what _talkToCompanion has
 * incremented by the time it asks.
 */
export const COMPANION_THEMES = {
  zeke: () => 'music_char_zeke',
  encykla: () => 'music_char_britanica',
  aedia: () => 'music_char_britanica',
  benjamin: (told) => (told >= 6 ? 'music_char_benjamin' : 'music_char_benjamin_sad'),
};

/** The track a companion raises for this step, or null for a companion with
 *  no theme yet. Returns null rather than a fallback: Rob Collins picking up
 *  Zeke's music would be worse than Rob Collins in silence. */
export function companionTheme(companionId, told = 1) {
  const f = COMPANION_THEMES[companionId];
  return typeof f === 'function' ? (f(told) || null) : null;
}

/**
 * ROUND 77 -- TRACKS THAT ARE HERE AND ARE NOT PLACED YET.
 *
 * Round 70 held the Astral Space track by leaving it out of every table and
 * writing a sentence about it in a comment, and that sentence is the only
 * record that the file exists. Six rounds later nobody would find it.
 *
 * So held tracks get a list. It is not read by `allAudioFiles` -- nothing here
 * is fetched by the running game -- but the file IS shipped, so the round that
 * builds the place it belongs in has the track sitting there waiting rather
 * than needing it re-uploaded.
 *
 * `music_astral_mine`: the user's words, on being asked whether to build the
 * mines this round -- "Astral spaces will eventually exist in many regions and
 * have many different interiors which deserve a variety of music. The Astral
 * space Mine can just be held onto until the correct location is created."
 * The existing `music_astral` stays on the Karsk Landing portal square.
 */
export const HELD_MUSIC = [
  { key: 'music_astral_mine', file: 'music_astral_mine.mp3',
    name: 'Astral Space (Mine)',
    waitingFor: 'an astral-space mine interior in Elehyd' },
];

/** The eight temple interiors are `temple_<god>` (see TEMPLE_ROOMS in
 *  interiors.js). Kept as a function rather than a hardcoded list of eight so a
 *  ninth god cannot end up with a silent temple -- fault class 2 in HANDOFF.md
 *  is a table keyed off a list that stopped covering the roster. */
export function isTempleRoom(roomId) {
  return typeof roomId === 'string' && roomId.startsWith('temple_');
}

/**
 * Which track should be playing, or null for silence.
 *
 * NULL IS A REAL ANSWER. Ontaria and Bratugal have no theme yet, and the
 * honest behaviour there is the ambiance bed alone -- not Region 1's music
 * playing in the wrong country because a fallback felt tidier.
 */
export function musicFor(ctx) {
  for (const t of MUSIC) { if (t.when(ctx)) return t; }
  return null;
}

// ---------------------------------------------------------------------------
// AMBIANCE
// ---------------------------------------------------------------------------

/**
 * One bed per region, and per time of day where the user supplied both.
 *
 * `night: true/false` entries are tried against the clock first; an entry with
 * no `night` field matches either. Region 3 shipped a NIGHT track only, so it
 * is marked as such and Elehyd is silent by day rather than playing a night
 * bed under a noon sky.
 */
export const AMBIANCE = [
  { key: 'amb_region1', file: 'amb_region1.mp3', region: 'nek', name: 'Forest, after rain' },
  { key: 'amb_region2', file: 'amb_region2.mp3', region: 'ontaria', name: 'Night forest' },
  { key: 'amb_region3_night', file: 'amb_region3_night.mp3', region: 'elehyd', night: true, name: 'Mountain crickets' },
  // ROUND 68 -- "OhmLab_remote mountain forest ambiance is region 3 daytime",
  // the user's words. Elehyd was the one region that answered null by day.
  { key: 'amb_region3_day', file: 'amb_region3_day.mp3', region: 'elehyd', night: false, name: 'Remote mountain forest' },
  { key: 'amb_region4_day', file: 'amb_region4_day.mp3', region: 'bratugal', night: false, name: 'Jungle, daytime' },
  { key: 'amb_region4_night', file: 'amb_region4_night.mp3', region: 'bratugal', night: true, name: 'Jungle, night' },
];

/**
 * ROUND 68 -- THE SETTLEMENT BED, which overrules the regional one.
 *
 * A city at night does not sound like the forest it was built in. This is
 * checked BEFORE the regional list, so standing in Cadence after dark gives
 * the square rather than The Nek's trees -- and stepping back out of the gates
 * crossfades to the trees again, through the same machinery as a region
 * crossing, because it goes through the same `ambianceFor`.
 *
 * ROUND 73 -- DAY IS COVERED NOW, BY THE SAME BED, ON THE USER'S CORRECTION:
 * "The nighttime city track is not actually night specific, just only for use
 * in cities."
 *
 * Round 68 read the FILENAME as a claim about the recording and gated it
 * `night: true` on that basis -- the note above still argues the case. The
 * person who recorded it says otherwise, and they are the authority on what
 * their own file is. `amb_city_night` is a city bed; the `_night` in its name
 * is a naming convention, not a statement about content. That is this
 * project's fourth fault class, committed against an audio file for the second
 * time (round 69's `amb_ducks_*` was the first).
 *
 * `night` is left OFF rather than set to false: `ambianceFor` treats an absent
 * `night` as "matches either", which is exactly the claim being made.
 */
export const SETTLEMENT_AMBIANCE = [
  { key: 'amb_city_night', file: 'amb_city_night.mp3', name: 'City square' },
];

/**
 * ROUND 68 -- POSITIONAL AMBIANCE, a second bed that layers UNDER the first.
 *
 * The user: "Ocean waves is proximity based region 2 ambiance when close to the
 * ocean." That is a different question from the one `ambianceFor` answers.
 * Region and clock are global facts; a river is a thing you walk up to. So
 * this is its own channel rather than more rows in AMBIANCE -- a coastal wood
 * in Ontaria should be forest AND surf, not surf INSTEAD OF forest, and one
 * list that can only return a single answer cannot express that.
 *
 * `nearTiles` is the radius the scene tests, in tiles. `region: null` means any.
 *
 * Ocean is Ontaria-only because Ontaria is the only region with an `ocean`
 * block in regions.js -- keyed off the same data the coastline is stamped
 * from, so the sound cannot outlive the water. Rivers exist in more than one
 * region, so the river bed asks the geometry rather than the region name.
 */
export const POSITIONAL_AMBIANCE = [
  { key: 'amb_ocean', file: 'amb_ocean.mp3', kind: 'ocean', region: 'ontaria', nearTiles: 14, name: 'Ocean waves' },
  { key: 'amb_river', file: 'amb_river.mp3', kind: 'river', region: null, nearTiles: 7, name: "River's edge" },
];

/**
 * ROUND 68 -- OCCASIONAL ONE-SHOTS over the bed.
 *
 * The user, about the 11.4-second howl: "an occasional nighttime sound not
 * meant for a sprite." So it is not a wolf's voice -- no monster owns it, and
 * it fires whether or not there is a wolf on the map. It is the night having
 * something in it.
 *
 * `everyMin`/`everyMax` are the seconds between attempts. The window is wide
 * because a predictable one is worse than none: a howl every 90 seconds on the
 * dot stops being the woods and becomes a metronome.
 */
export const AMBIENT_ONESHOTS = [
  {
    key: 'amb_wolf_howl', file: 'amb_wolf_howl.mp3', name: 'Distant howl',
    everyMin: 70, everyMax: 190,
    // Outdoors, at night, out in the country. Not in a city -- a wolf howling
    // over the auction house is a joke rather than atmosphere.
    when: (c) => !c.insideRoom && !c.titleScreen && c.night && !c.inSettlement,
  },
  {
    key: 'amb_ducks_a', file: 'amb_ducks_a.mp3', name: 'Ducks', pool: 'ducks',
    everyMin: 40, everyMax: 120,
    when: (c) => !c.insideRoom && !c.titleScreen && !c.night && c.nearWater,
  },
  { key: 'amb_ducks_b', file: 'amb_ducks_b.mp3', name: 'Ducks', pool: 'ducks' },
  { key: 'amb_ducks_c', file: 'amb_ducks_c.mp3', name: 'Ducks', pool: 'ducks' },
];

/**
 * The bed for a place and a time, or null.
 *
 * Indoors is silent: a room is defined by not being outside, and running the
 * forest through the smithy wall is the thing that makes ambiance feel fake.
 */
export function ambianceFor(ctx) {
  // The title screen gets its theme and nothing else. A forest running under
  // the main menu is somebody's world leaking into the frame around it.
  if (ctx.titleScreen) return null;
  if (ctx.insideRoom) return null;
  // ROUND 68 -- the settlement bed wins over the regional one where it applies.
  if (ctx.inSettlement) {
    const s = SETTLEMENT_AMBIANCE.find(a => a.night === undefined || a.night === !!ctx.night);
    if (s) return s;
  }
  const inRegion = AMBIANCE.filter(a => a.region === ctx.region);
  if (!inRegion.length) return null;
  const timed = inRegion.filter(a => a.night === undefined || a.night === !!ctx.night);
  return timed[0] || null;
}

/**
 * ROUND 68 -- the layered bed, or null.
 *
 * The scene answers `nearOcean` / `nearRiver` from the SAME geometry the
 * terrain is stamped from, so this cannot claim surf where there is no water.
 * Ocean is tested first: standing at a river mouth on the Ontarian coast, the
 * sea is the bigger sound.
 */
export function positionalAmbianceFor(ctx) {
  if (ctx.titleScreen || ctx.insideRoom) return null;
  for (const p of POSITIONAL_AMBIANCE) {
    if (p.region && p.region !== ctx.region) continue;
    if (p.kind === 'ocean' && ctx.nearOcean) return p;
    if (p.kind === 'river' && ctx.nearRiver) return p;
  }
  return null;
}

/** Every one-shot whose conditions hold right now, with its pool-mates. */
export function ambientOneshotsFor(ctx) {
  return AMBIENT_ONESHOTS.filter(o => typeof o.when === 'function' && o.when(ctx));
}

/** The keys a one-shot may actually play: itself, or any member of its pool. */
export function oneshotPool(o) {
  if (!o.pool) return [o.key];
  return AMBIENT_ONESHOTS.filter(x => x.pool === o.pool).map(x => x.key);
}

// ---------------------------------------------------------------------------
// SPELLS -- the bus the user's next upload lands in
// ---------------------------------------------------------------------------

// ROUND 68 -- the roster arrived, and it does not fit ONE key.
//
// Round 67 left `spellSfxFor(family, template)` against an empty list and
// called the path wired. It was not: nothing in 21,345 lines ever called
// `_playSpellSfx`. So this round both fills the roster and builds the call
// sites, and the first thing the real files showed is that "family + template"
// cannot address them. What arrived was four different kinds of thing:
//
//   a weapon swing   keyed by weapons.js id      (dagger ... whip)
//   an ability       keyed by element, then fx family, then template
//   a monster        keyed by monsters.js family (trex, dragon, chimera ...)
//   an essence       keyed by essenceCatalog id  (essChicken, essGoat ...)
//
// Four keyspaces, four tables. Collapsing them into one list with four
// optional fields was the first draft and it was worse: every lookup had to
// know which fields to leave undefined, and a typo in one silently matched a
// row meant for another kind. Separate tables cannot cross-match at all.
//
// Every value is an ARRAY, even where there is one file. Variants are the
// difference between a sword that sounds like a sword and a sword that sounds
// like a sample, and a single-element array costs nothing to read.

/** Weapon swings, keyed by the ids in SWINGABLE_WEAPON_IDS (weapons.js). */
export const WEAPON_SFX = {
  dagger: ['sfx_wpn_dagger'],
  sword: ['sfx_wpn_sword_a', 'sfx_wpn_sword_b', 'sfx_wpn_sword_c'],
  hammer: ['sfx_wpn_hammer'],
  axe: ['sfx_wpn_axe_a', 'sfx_wpn_axe_b'],
  spear: ['sfx_wpn_spear'],
  scythe: ['sfx_wpn_scythe'],
  whip: ['sfx_wpn_whip_a', 'sfx_wpn_whip_b'],
  // ROUND 74 -- the ranged four, built from clips the game already ships.
  // No bowstring, no crank and no thrown-spear recording exists, and
  // `audioFaults` refuses to let a weapon ship silent, so each of these is
  // the nearest existing sound rather than nothing: the whip's crack IS a
  // string snapping, the gust IS a shaft in flight, and the spear clip is
  // literally a spear being thrown. The crossbow borrows the dagger's sharp
  // release for the trigger and the whip's second crack for the string.
  // These are stand-ins in the round-73 sense -- audible, identifiable, and
  // a list of exactly what four recordings the next audio drop needs.
  // ROUND 104 -- unarmed. No recorded punch exists, so this is a stand-in in
  // the round-73 sense: the dagger's short sharp release is the closest thing
  // the library holds to a fist landing, and naming it here says exactly which
  // recording the next audio drop should replace it with.
  unarmed: ['sfx_wpn_dagger'],
  javelin: ['sfx_wpn_spear', 'sfx_fx_gust'],
  staff: ['sfx_buff_instant'],
  bow: ['sfx_wpn_whip_a', 'sfx_fx_gust'],
  crossbow: ['sfx_wpn_dagger', 'sfx_wpn_whip_b'],
};

/**
 * Monster vocals, keyed by the families in monsters.js.
 *
 * NINE OF EIGHTEEN FAMILIES HAVE NO VOICE, and they are left out rather than
 * given the nearest animal: slime, bat, shade, raptor, wolf, demon, slimeGolem,
 * elemental, skeleton. A shade is a humanoid shadow and a skeleton has no
 * throat; handing either one a lion is worse than silence. `monsterSfxFor`
 * returns null for them and the scene plays nothing.
 *
 * Wolf is on that list DESPITE the game shipping a wolf howl, because the user
 * placed that file himself: "an occasional nighttime sound not meant for a
 * sprite." It is in AMBIENT_ONESHOTS instead.
 */
export const MONSTER_SFX = {
  trex: ['sfx_mon_trex'],
  spinosaurus: ['sfx_mon_trex'],
  dragon: ['sfx_mon_dragon_breath', 'sfx_mon_dragon_snarl'],
  hydra: ['sfx_mon_dragon_snarl'],
  // The Triskelith is lion, goat and serpent -- so it gets the lion, and the
  // goat and the hiss are reachable through it too.
  chimera: ['sfx_mon_lion', 'sfx_mon_lion_roar_a', 'sfx_mon_lion_roar_b'],
  boar: ['sfx_mon_snort'],
  hellhound: ['sfx_mon_snort'],
  lizard: ['sfx_mon_hiss'],
  spider: ['sfx_mon_chitter'],
  // ROUND 69 -- three of the nine silent families got real, non-animal voices.
  // These are the ones round 68 said would need sources that are not an
  // animal recording, and they arrived: a body-crunch for the Boneguard, a wet
  // vocal for the Ichorling, a scream for the Hexbound.
  raptor: ['sfx_mon_raptor'],
  // ROUND 71 -- bat and elemental, which round 70's gap list called out as
  // needing non-animal sources. The Elementum gets four, because it is one
  // family covering stone, fire and construct and a single clip would make
  // every Elementum the same Elementum.
  bat: ['sfx_mon_bat_a', 'sfx_mon_bat_b'],
  elemental: ['sfx_mon_elem_stone', 'sfx_mon_elem_fire', 'sfx_mon_elem_moan', 'sfx_mon_elem_hiss'],
  skeleton: ['sfx_mon_skeleton'],
  slime: ['sfx_mon_slime'],
  slimeGolem: ['sfx_mon_slime'],
  demon: ['sfx_mon_demon'],

  // ===== ROUND 75 -- TEN OF THE THIRTEEN NEW FAMILIES ====================
  //
  // Voiced from the clips the game already has, and ONLY where the match is
  // honest. The rule is round 68's and it has not changed: "handing either one
  // a lion is worse than silence."
  //
  // The snort is doing the most work here and it earns it -- a ram, a bull and
  // a buck all snort, and that is one recording covering three animals that
  // genuinely make that noise rather than one recording standing in for three
  // that do not.
  hornram: ['sfx_mon_snort'],
  minotaur: ['sfx_mon_snort'],
  direbuck: ['sfx_mon_snort'],
  // The Snowmane IS a lion, so it takes the lion clips directly rather than
  // through the chimera's borrowing.
  whitelion: ['sfx_mon_lion', 'sfx_mon_lion_roar_a', 'sfx_mon_lion_roar_b'],
  // A cobra hisses. The gorgon's hair is snakes, which is the same sound from
  // a dozen small throats and is the one thing everyone knows about her.
  cobra: ['sfx_mon_hiss'],
  medusa: ['sfx_mon_hiss'],
  // Arthropods, and the chitter was recorded for one.
  mantis: ['sfx_mon_chitter'],
  scorpion: ['sfx_mon_chitter'],
  // A big reptile's roar. The trex clip is the only one in the library and a
  // crocodile is the only new family it fits.
  crocodile: ['sfx_mon_trex'],
  // Wet and vocal, which is what the slime clip is and what a croak is.
  giantToad: ['sfx_mon_slime'],

  // ===== ROUND 176 -- SIX OF ROUND 173'S EIGHT ==========================
  //
  // Round 173 added eight families and gave none of them a voice, which
  // `test_round71` has reported every run since as thirteen silent families
  // against five declared. The check was doing its job and nobody acted on it.
  //
  // Round 68's rule decides each one and has not changed: *"handing either one
  // a lion is worse than silence."* Six have an honest clip in the library and
  // two do not; the two are declared below rather than left out, so the next
  // audio drop has an exact target.
  //
  // The Ironclaw is a raptor whatever it is made of, and the raptor clip was
  // recorded for exactly that shape.
  steelRaptor: ['sfx_mon_raptor'],
  // The two ETHEREAL ones take the elemental bank rather than an animal,
  // which is the whole reason round 71 commissioned that bank: a wisp and a
  // herald of doom do not have throats, and the moan is a non-animal source.
  spiritSerpent: ['sfx_mon_elem_hiss', 'sfx_mon_elem_moan'],
  harbinger: ['sfx_mon_elem_moan'],
  // The Carcanid is a shelled thing, and round 75 already settled that the
  // chitter covers arthropods (mantis, scorpion). The stone clip is in because
  // its subtype is `mineral` and half of what you hear should be the shell.
  shellborn: ['sfx_mon_chitter', 'sfx_mon_elem_stone'],
  // Round 173's own words for the Silverquill: "a demon with spikes, which is
  // meat and malice and nothing else". The demon clip is not a substitution
  // here, it is the description.
  quillFiend: ['sfx_mon_demon'],
  // The Reefwarden is mostly reef and it comes out of the water. Wet, and big
  // enough to be slow -- the same pairing the giant toad got, plus the moan
  // because a troll is not a frog.
  tidalTroll: ['sfx_mon_slime', 'sfx_mon_elem_moan'],

  // ===== ROUND 200 -- THREE OF THE FIVE NEW FAMILIES ====================
  //
  // Round 68's rule, unchanged and applied twice more: *"handing either one a
  // lion is worse than silence."* Three of the five have an honest clip on the
  // shelf and two do not, and the two are declared below rather than left out
  // -- which is what round 176 learned the hard way when eight unvoiced
  // families sat inside a red check for three rounds.
  //
  // The Shardfang is a sabertooth. It is made of glass and it is still a big
  // cat, which is what the lion bank was recorded for -- and the stone clip
  // rides along because its subtype is `mineral` and half of what you should
  // hear is the material (the same pairing round 176 gave the Carcanid).
  glasscat: ['sfx_mon_lion', 'sfx_mon_elem_stone'],
  // The Reefjaw is a crab with a shark's body: an arthropod, and round 75
  // settled that the chitter covers those. Wet, because it comes out of the
  // sea -- the Reefwarden's own pairing one line above.
  sharkcrab: ['sfx_mon_chitter', 'sfx_mon_slime'],
  // The Blossomire is a hydra. The hydra's own clips are the hiss bank, and a
  // five-headed thing hissing from five throats is the sound this already is;
  // the moan is in because it is flora rather than an animal and part of what
  // you hear should not have a throat behind it.
  flowerhydra: ['sfx_mon_hiss', 'sfx_mon_elem_moan'],
  // ROUND 285 -- the three carnivorous plants, on the Blossomire's reasoning:
  // flora, so part of what you hear has no throat behind it (the moan). The
  // two with mouths hiss; the vines are a wet creak, the slime bank.
  bloomimp: ['sfx_mon_elem_moan'],
  snapmaw: ['sfx_mon_hiss', 'sfx_mon_elem_moan'],
  vinegrasp: ['sfx_mon_slime', 'sfx_mon_elem_moan'],
};

/**
 * ROUND 75 -- THE THREE NEW FAMILIES THAT STAY SILENT, and why.
 *
 * Declared rather than omitted, so the next audio drop has an exact target and
 * so a test can assert the list rather than an ever-growing count.
 *
 *   yeti          a hulking primate. The closest clip is a lion roar, and a
 *                 yeti is not a cat -- this is precisely the substitution
 *                 round 68's rule exists to refuse.
 *   phoenix       a great firebird. There is no bird recording in the library
 *                 at all.
 *   thunderbird   the same, and a roc's cry would want to be enormous.
 *
 * All three still DIE audibly: MONSTER_DEATH_SFX is total on purpose (see its
 * own note), so a silent family is silent when it notices you, not when you
 * kill it.
 */
export const ROUND75_SILENT_FAMILIES = ['yeti', 'phoenix', 'thunderbird'];

/**
 * ROUND 176 -- THE TWO OF ROUND 173'S EIGHT THAT STAY SILENT, and why.
 *
 *   gnoll        the Palefang is a hyena on two legs and there is no hyena
 *                recording in this library. A snort is a ruminant and a demon
 *                snarl is a demon; a cackle is the one thing everybody knows
 *                about the animal and it is the one thing not on the shelf.
 *   sixArmApe    the Hexarm is a hulking primate, which is round 75's yeti
 *                sentence word for word: the closest clip is a lion roar and
 *                an ape is not a cat. Refusing it twice for the same reason is
 *                the rule working, not an oversight repeated.
 *
 * Both still die audibly -- MONSTER_DEATH_SFX is total on purpose.
 */
export const ROUND176_SILENT_FAMILIES = ['gnoll', 'sixArmApe'];

/**
 * ROUND 200 -- THE TWO OF ROUND 200'S FIVE THAT STAY SILENT, and why.
 *
 *   birdangel    the Halowing is a winged figure, and round 75 already refused
 *                the phoenix and the thunderbird for the same reason: there is
 *                no bird recording in this library at all. A third refusal on
 *                the same grounds is the rule working rather than an oversight
 *                repeated -- and it means the next audio drop has one clear
 *                target that would voice three families at once.
 *   demonsloth   the Dreadloth is a hulking primate, which is round 75's yeti
 *                sentence and round 176's Hexarm sentence word for word: the
 *                nearest clip is a lion roar and this is not a cat. The demon
 *                snarl was considered and refused -- it is a caster's voice in
 *                this library (see the Silverquill) and the Dreadloth is a
 *                charging animal, not a caster.
 *
 * Both still die audibly -- MONSTER_DEATH_SFX is total on purpose.
 */
export const ROUND200_SILENT_FAMILIES = ['birdangel', 'demonsloth'];

/**
 * ROUND 176 -- EVERY FAMILY THAT IS SILENT ON PURPOSE, in one place.
 *
 * `test_round71` asserted the silent list as a literal array of five, and its
 * own comment gives the reason that matters: *"the point of naming them is
 * that a family going silent by ACCIDENT still fails this."* That is exactly
 * right, and spelling the names in the test instead of here meant the test had
 * to be edited every time a deliberate silence was added -- so a real
 * accidental silence and a pending audio drop looked identical, and the suite
 * sat red for three rounds while eight unvoiced families went unnoticed.
 *
 * Declared here, the test compares the build against a DECISION. Round 71's
 * own two are included: a humanoid shadow has no throat, and the wolf howl is
 * a night ambient by the user's instruction rather than a monster vocal.
 */
export const SILENT_FAMILIES = [
  'shade', 'wolf',                                  // round 71
  ...ROUND75_SILENT_FAMILIES,                       // yeti, phoenix, thunderbird
  ...ROUND176_SILENT_FAMILIES,                      // gnoll, sixArmApe
  ...ROUND200_SILENT_FAMILIES,                      // birdangel, demonsloth
];

/**
 * ROUND 69 -- DEATH, which is a different question from a vocal.
 *
 * A vocal says what a thing is. A death says a thing you did just worked, and
 * that makes it the one cue in this system the player has EARNED. It is also
 * the only one where "the nearest animal" is not a compromise: the user sent a
 * generic monster death precisely so every family can have one, so the table
 * below is total -- `monsterDeathSfxFor` never returns null.
 *
 * That totality is why this is a separate table rather than more rows in
 * MONSTER_SFX. Nine families have no voice on purpose and must stay silent
 * when they notice you; all eighteen die.
 *
 * Wolf is the interesting case: the Panterimp has no living voice, because the
 * one wolf recording is a night ambient by the user's own instruction. It has
 * a death.
 */
export const MONSTER_DEATH_SFX = {
  dragon: ['sfx_death_dragon'],
  wolf: ['sfx_death_wolf'],
  hellhound: ['sfx_death_wolf'],
  skeleton: ['sfx_death_skeleton'],
  slime: ['sfx_death_slime'],
  slimeGolem: ['sfx_death_slime'],
  demon: ['sfx_death_demon'],
  elemental: ['sfx_death_elemental'],
};

/** Everything without a death of its own. Two clips, so a pack does not die
 *  eleven times to the same sample. */
export const MONSTER_DEATH_GENERIC = ['sfx_death_generic_a', 'sfx_death_generic_b'];

/**
 * NO COOLDOWN, at the user's explicit direction: "Yes, no cooldown at all."
 *
 * So the crowding problem is solved by MIXING rather than by gating -- see
 * `deathSfxMix`. Every death is heard, which is what was asked for; six at
 * once are just not six times as loud.
 */
export const DEATH_SFX_NO_COOLDOWN = true;

/**
 * Equal-power scaling for simultaneous deaths.
 *
 * `n` is how many have fired in the last quarter second. Dividing by sqrt(n)
 * is the same rule a mixer uses for uncorrelated sources: two clips at 0.71
 * sum to about the loudness of one at 1.0. An area-of-effect kill on six
 * monsters therefore reads as a volley rather than as clipping, and no death
 * has been suppressed to get there.
 */
export function deathSfxMix(n) {
  return 1 / Math.sqrt(Math.max(1, n));
}

/**
 * Seconds between vocals from the same FAMILY. The user's number: "a per family
 * cooldown on monster sounds is a good idea, but it really only needs to be 12
 * seconds or so."
 *
 * Per family and not per monster, deliberately. Six wolves are a pack, and a
 * pack that answers a cue six times in one second is the noise this prevents;
 * a per-monster cooldown would have let all six through and only stopped each
 * one repeating.
 */
export const MONSTER_SFX_COOLDOWN = 12;

/** Chance a monster already in combat vocalises on a given swing. The user
 *  asked for "occasionally during combat", not every attack -- and the cooldown
 *  above is the hard ceiling under this. */
export const MONSTER_COMBAT_VOCAL_CHANCE = 0.25;

/** Seconds between attempts at an idle vocal from a monster near the player. */
export const MONSTER_IDLE_MIN = 9;
export const MONSTER_IDLE_MAX = 26;

/** Essence-flavoured ability sounds, keyed by essenceCatalog id. Checked before
 *  the elemental table, so a Chicken ability clucks rather than sounding like
 *  whatever colour it happens to be cut in. */
export const ESSENCE_SFX = {
  essChicken: ['sfx_ess_chicken', 'sfx_fowl_chicken_b'],
  essGoat: ['sfx_ess_goat'],
  essSnake: ['sfx_mon_hiss'],
  essSpider: ['sfx_mon_chitter'],
};

/**
 * ROUND 69 -- THE SUMMONED FOWL.
 *
 * The user: "The chicken essence should have on occasion a summon chicken
 * ability. Use the chicken sounds for a summoned chicken, same goes for the
 * duck."
 *
 * The chicken half already existed and nobody had noticed: `essChicken`'s
 * hand-authored `summon_bonded` signature has put a walking chicken beside its
 * owner since round 50. It has simply never made a sound.
 *
 * The duck half did not. `summons.js` has carried DUCK_CELL and the extracted
 * duck_idle / duck_run sheets since round 24 behind a comment saying the art
 * is ready and the mechanic is not -- but the mechanic arrived in round 50 and
 * the duck was never connected to it. `essDuck` is a real Common essence.
 * Round 69 gives it the body it already had art for.
 *
 * Keyed by the essence, because that is what decides which bird you get.
 */
export const FOWL_SFX = {
  essChicken: ['sfx_ess_chicken', 'sfx_fowl_chicken_b'],
  essDuck: ['amb_ducks_a', 'amb_ducks_b', 'amb_ducks_c'],
};

// ---------------------------------------------------------------------------
// ROUND 71 -- THE PLAYER'S OWN VOICE
// ---------------------------------------------------------------------------
//
// The user recorded two full sets, one per body type, and split the attack
// grunt by weapon weight: "Light attack is for daggers, axes, swords, spears,
// and whips. Heavy attack is for Warhammers and scythes."
//
// KEYED BY THE m_/f_ PREFIX, NOT BY THE TWO ATLAS IDS. `BODY_TYPES` has eight
// entries and only two are `available: true` -- but the other six are real ids
// that the character creator's stepper skips today and may not skip tomorrow.
// A table keyed on `m_muscular` and `f_muscular` would go silent the moment
// `m_heavy` was enabled, which is fault class 2 exactly: a table keyed off a
// list that stopped covering the roster. `audioFaults` checks all EIGHT
// resolve, available or not.
export const PLAYER_VOICE = {
  m: {
    light: 'sfx_pc_m_light', heavy: 'sfx_pc_m_heavy', spell: 'sfx_pc_m_spell',
    hurt: 'sfx_pc_m_hurt', healed: 'sfx_pc_m_healed', death: 'sfx_pc_m_death',
  },
  f: {
    light: 'sfx_pc_f_light', heavy: 'sfx_pc_f_heavy', spell: 'sfx_pc_f_spell',
    hurt: 'sfx_pc_f_hurt', healed: 'sfx_pc_f_healed', death: 'sfx_pc_f_death',
  },
};

export const PLAYER_VOICE_EVENTS = ['light', 'heavy', 'spell', 'hurt', 'healed', 'death'];

/** The user's split, verbatim. Everything not named here is a light attack --
 *  the default is the larger group, so a weapon added later grunts rather than
 *  falling silent. */
// ROUND 74 -- the crossbow joins them. The split is about the EFFORT the
// grunt describes, not about the weapon's weight class in the shop: spanning
// a crossbow is the only thing on the ranged shelf that takes a heave. A bow
// is drawn, a javelin is thrown and a staff is pointed, so all three stay
// light with the other five.
export const HEAVY_WEAPONS = ['hammer', 'scythe', 'crossbow'];

export function weaponVoiceEvent(weaponId) {
  return HEAVY_WEAPONS.includes(weaponId) ? 'heavy' : 'light';
}

/** One line of voice, or null. `bodyType` is an appearance id like
 *  'm_muscular'; anything unrecognised falls to body type 1 rather than going
 *  silent, because a missing grunt reads as the button not working. */
export function playerVoiceFor(bodyType, event) {
  const set = PLAYER_VOICE[String(bodyType || '').startsWith('f') ? 'f' : 'm'];
  return (set && set[event]) || null;
}

/** Seconds between one player vocalisation and the next, per EVENT.
 *
 * Attack grunts are rationed hard: a dagger swings every 0.2s and a voice on
 * every swing is a person hyperventilating. Hurt and healed are rationed
 * because damage-over-time ticks and heal-over-time pulses arrive in bursts.
 * Death is not rationed at all -- it happens once. */
export const PLAYER_VOICE_COOLDOWN = {
  light: 3.2, heavy: 3.2, spell: 2.4, hurt: 2.0, healed: 3.0, death: 0,
};

/** Chance a swing is voiced at all, on top of the cooldown. Two gates rather
 *  than one long cooldown: a fixed interval makes the grunt sound scheduled,
 *  and this is what keeps it feeling like exertion. */
export const PLAYER_VOICE_ATTACK_CHANCE = 0.45;

/** Seconds between a familiar's occasional call. Wide, and long: a bird that
 *  talks every four seconds stops being company and becomes a car alarm. */
export const FOWL_CALL_MIN = 14;
export const FOWL_CALL_MAX = 44;

export function fowlSfxFor(essenceId, rng) { return _pick(FOWL_SFX[essenceId], rng); }

/**
 * Ability sounds. Three levels, most specific first, exactly like MUSIC.
 *
 *   template  a named mechanic     (absorbShield, teleport, dash ...)
 *   family    an fx pool           (leechspiral, boltstrike ...)
 *   element   one of the six       (fire, frost, lightning, nature, shadow, radiant)
 *
 * Template beats family beats element because a mechanic is a stronger claim
 * than a look: a shield that happens to be cut in fire should still sound like
 * a shield going up. The element row is the floor -- with all six covered, any
 * generated ability in the game gets SOMETHING, which for a generator that can
 * produce ten thousand of them is the only reachable definition of complete.
 */
export const SPELL_SFX = [
  // --- by template: the named mechanics --------------------------------
  { key: 'sfx_shield_cast', file: 'sfx_shield_cast.mp3', template: 'absorbShield' },
  { key: 'sfx_shield_cast', file: 'sfx_shield_cast.mp3', template: 'immunityBuff' },
  { key: 'sfx_heal', file: 'sfx_heal.mp3', template: 'selfHeal' },
  { key: 'sfx_heal', file: 'sfx_heal.mp3', template: 'aoeHealPulse' },
  { key: 'sfx_heal', file: 'sfx_heal.mp3', template: 'selfHot' },
  { key: 'sfx_teleport', file: 'sfx_teleport.mp3', template: 'teleport' },
  { key: 'sfx_portal', file: 'sfx_portal.mp3', template: 'townPortal' },
  { key: 'sfx_dash', file: 'sfx_dash.mp3', template: 'dash' },
  { key: 'sfx_dash', file: 'sfx_dash.mp3', template: 'movementHaste' },
  { key: 'sfx_vine', file: 'sfx_vine.mp3', template: 'thornsBuff' },
  // ROUND 71 -- the buffs and debuffs, which until now fell through to their
  // element. These are the templates round 70's gap list named: a large share
  // of every generated kit is a self-buff or a hex, and hearing the colour of
  // the spell rather than what it DOES is the least informative answer the
  // three-level lookup can give.
  { key: 'sfx_buff_instant', file: 'sfx_buff_instant.mp3', template: 'selfPower' },
  { key: 'sfx_buff_ancient', file: 'sfx_buff_ancient.mp3', template: 'selfCritBuff' },
  { key: 'sfx_buff_ancient', file: 'sfx_buff_ancient.mp3', template: 'imbueStrike' },
  { key: 'sfx_buff_fortify', file: 'sfx_buff_fortify.mp3', template: 'armorBuff' },
  { key: 'sfx_debuff_magic', file: 'sfx_debuff_magic.mp3', template: 'weakenRing' },
  { key: 'sfx_debuff_a', file: 'sfx_debuff_a.mp3', template: 'sunderStrike' },
  { key: 'sfx_debuff_b', file: 'sfx_debuff_b.mp3', template: 'sunderStrike' },
  // --- by fx family: the look the library chose ------------------------
  { key: 'sfx_drain_a', file: 'sfx_drain_a.mp3', family: 'leechspiral' },
  { key: 'sfx_drain_b', file: 'sfx_drain_b.mp3', family: 'leechspiral' },
  { key: 'sfx_lightning_bolt', file: 'sfx_lightning_bolt.mp3', family: 'boltstrike' },
  { key: 'sfx_lightning_streak', file: 'sfx_lightning_streak.mp3', family: 'lightning' },
  { key: 'sfx_lightning_streak', file: 'sfx_lightning_streak.mp3', family: 'chainext' },
  { key: 'sfx_fire_burst', file: 'sfx_fire_burst.mp3', family: 'explosion' },
  { key: 'sfx_vine', file: 'sfx_vine.mp3', family: 'thornshield' },
  { key: 'sfx_portal', file: 'sfx_portal.mp3', family: 'goldring' },
  { key: 'sfx_water', file: 'sfx_water.mp3', family: 'bubble' },
  // ROUND 68 -- THE TWO PHYSICAL FAMILIES.
  //
  // `impact` (239 effects) and `slash` (172) are round 60's own words for "the
  // ordinary landed blow" and "the swing of a weapon" -- 411 of the library's
  // 1,050 effects, and between them they carry most of what a martial ability
  // looks like. Answering them here rather than letting them fall to the
  // element floor is the difference between a hammer-blow ability sounding
  // like a blow and sounding like whatever colour it happens to be cut in.
  { key: 'sfx_wpn_hammer', file: 'sfx_wpn_hammer.mp3', family: 'impact' },
  { key: 'sfx_wpn_sword_c', file: 'sfx_wpn_sword_c.mp3', family: 'slash' },
  // ROUND 71 -- two more of the ten pools that had nothing of their own.
  // `rain` takes the storm because it IS the weather family (there is no
  // weather system in this game -- rain is an fx pool), and `puff` takes the
  // gust.
  { key: 'sfx_fx_rain', file: 'sfx_fx_rain.mp3', family: 'rain' },
  { key: 'sfx_fx_gust', file: 'sfx_fx_gust.mp3', family: 'puff' },
  { key: 'sfx_debuff_a', file: 'sfx_debuff_a.mp3', family: 'sigil' },
  { key: 'sfx_debuff_b', file: 'sfx_debuff_b.mp3', family: 'sigil' },
  { key: 'sfx_buff_ancient', file: 'sfx_buff_ancient.mp3', family: 'runecircle' },
  // --- by element: the floor, all SEVEN covered ------------------------
  { key: 'sfx_fire_bolt', file: 'sfx_fire_bolt.mp3', element: 'fire' },
  { key: 'sfx_fire_blaze', file: 'sfx_fire_blaze.mp3', element: 'fire' },
  { key: 'sfx_freeze', file: 'sfx_freeze.mp3', element: 'frost' },
  { key: 'sfx_lightning_bolt', file: 'sfx_lightning_bolt.mp3', element: 'lightning' },
  { key: 'sfx_poison', file: 'sfx_poison.mp3', element: 'nature' },
  { key: 'sfx_drain_a', file: 'sfx_drain_a.mp3', element: 'shadow' },
  { key: 'sfx_heal', file: 'sfx_heal.mp3', element: 'radiant' },
  // ROUND 68 -- AND PHYSICAL, WHICH IS NOT IN ELEMENT_TYPES AND IS EVERYWHERE.
  //
  // awakening.js says it in capitals: "PHYSICAL IS NOT AN ELEMENT. materialFor
  // returns 'physical' for a great many stones and there is no
  // resist_physical stat; ELEMENT_TYPES is the six magical channels."
  //
  // True of the damage model, and a trap for this table. Abilities really do
  // carry `element: 'physical'`, so a floor built on ELEMENT_TYPES has a hole
  // in it exactly where the most common martial abilities live -- and the
  // fault check validated against ELEMENT_TYPES, so it certified the hole as
  // covered. Round 68's own suite caught it by casting a real generated kit
  // and finding a taunt and a projectile silent. Seven values, not six.
  //
  // ROUND 69 -- and it is a real impact now. Round 68 answered `physical` with
  // `sfx_dash`, a cloth whoosh, and flagged it as the weakest mapping in the
  // roster; the user sent an impact in the next batch. This is the commonest
  // element on a generated ability, so it is the row that gets heard most.
  { key: 'sfx_impact_physical', file: 'sfx_impact_physical.mp3', element: 'physical' },
];

/** Every element value an ABILITY can carry, which is not the same list as the
 *  six damage channels -- see the note on `physical` above. The sound floor is
 *  checked against this, because this is what actually turns up at runtime. */
export const SFX_ELEMENTS = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant', 'physical'];

/**
 * ROUND 71 -- THE RANK-UP PAIR.
 *
 * Two sounds, and the second one has a precise cue. The user: "when the rank
 * up animation switches to the ooze pouring out start the post rank up purge
 * sound." That switch is a real function -- `_triggerOoze`, chained as
 * `_triggerRankUp`'s onComplete -- so the purge is played there rather than on
 * a timer counted from the fanfare. A timer would drift the moment
 * RANKUP_FRAME_MS is ever retuned.
 */
export const RANKUP_SFX = ['sfx_rankup', 'sfx_rankup_purge'];

/** Sounds with no lookup at all -- the scene plays these by key directly. */
export const DIRECT_SFX = [
  { key: 'sfx_shield_hit', file: 'sfx_shield_hit.mp3', name: 'Shield absorbs a blow' },
  { key: 'sfx_dodge', file: 'sfx_dodge.mp3', name: 'A blow goes wide' },
];

const _pick = (arr, rng) => (!arr || !arr.length ? null
  : arr[Math.floor((typeof rng === 'function' ? rng() : Math.random()) * arr.length) % arr.length]);

/** A swing sound for a weapon id, or null. */
export function weaponSfxFor(weaponId, rng) { return _pick(WEAPON_SFX[weaponId], rng); }

/** A vocal for a monster family, or null for the ones that have no voice. */
export function monsterSfxFor(family, rng) { return _pick(MONSTER_SFX[family], rng); }

/**
 * A death cry for a monster family. NEVER NULL for a real family -- unlike a
 * vocal, every family dies, and the user sent a generic death so that could be
 * true. An unknown family still falls through to the generic rather than
 * returning null, because a family this table has not heard of is a roster
 * change, and a roster change should not silently mute a cue.
 */
export function monsterDeathSfxFor(family, rng) {
  return _pick(MONSTER_DEATH_SFX[family], rng) || _pick(MONSTER_DEATH_GENERIC, rng);
}

/** An essence's own sound, or null. */
export function essenceSfxFor(essenceId, rng) { return _pick(ESSENCE_SFX[essenceId], rng); }

/**
 * The sound for one ability.
 *
 * Takes an object, not positional arguments. Round 67's signature was
 * `(family, template)` and this round needed a third and fourth field; adding
 * them positionally is how a call site ends up passing an element where a
 * template goes and matching nothing for four rounds without anyone noticing.
 */
export function spellSfxFor({ essence = null, template = null, family = null, element = null } = {}, rng) {
  if (essence && ESSENCE_SFX[essence]) return essenceSfxFor(essence, rng);
  const at = (field, val) => {
    if (!val) return null;
    const rows = SPELL_SFX.filter(s => s[field] === val);
    return rows.length ? _pick(rows, rng).key : null;
  };
  // ROUND 105 -- the element row is asked for the SFX CHANNEL, not the raw
  // damage type. The taxonomy's twenty-four types arrived this round and the
  // sound library has seven channels; DAMAGE_TYPES carries the mapping, so a
  // `water` ability sounds like frost and a `sand` one sounds physical rather
  // than falling through to silence. Without this the element floor -- the
  // last thing between a generated ability and no sound at all -- would have
  // a seventeen-type hole in it, which is exactly the fault `audioFaults`
  // caught in round 68 and the reason that check exists.
  const channel = (element && DAMAGE_TYPES[element] && DAMAGE_TYPES[element].sfx) || element;
  return at('template', template) || at('family', family) || at('element', channel) || null;
}

/**
 * ROUND 68 -- WHAT THE BOOT ACTUALLY WAITS FOR.
 *
 * Round 68's first pass loaded all 62 files in `preload`, and time-to-world
 * went from 14.6 SECONDS TO 46.7. Measured, after two suites that had always
 * waited 30 seconds for the world started dying. Twenty-three megabytes of new
 * music, decoded before the title screen would draw.
 *
 * The split is obvious once the numbers are in front of you:
 *
 *     40 sfx files ......  0.8 MB      music + ambiance ...  40.6 MB
 *
 * The effects are a rounding error and must be instant -- a swing that is
 * silent for the first four seconds of play reads as broken. The music is
 * enormous and almost none of it is needed at boot: Ontaria's theme is needed
 * in Ontaria, the temple theme inside a temple, Elehyd's daytime bed in Elehyd
 * by day. Exactly ONE track has to exist before the player sees anything, and
 * it is the one playing on the title screen.
 *
 * So: the title track and every effect are eager (~3.7 MB, less than round
 * 67's 18 MB), and the other twenty-one beds and themes stream in behind the
 * world. `_playMusic` and friends decline to start a track that has not landed
 * yet and are retried by the mixer's own one-second timer, so a track that
 * arrives late simply starts late instead of being skipped.
 */
export const EAGER_MUSIC_KEY = 'music_start_menu';

/** Every key that must exist before it is first wanted, rather than being
 *  fetched when the mixer asks. Effects, the title track -- and the fowl.
 *
 *  ROUND 69 -- the fowl are here because of a bug this round's own suite
 *  caught. The duck's three clips are the SAME files the pond ambience uses,
 *  so they are named `amb_ducks_*` and the eager filter -- which keys off the
 *  `sfx_` prefix -- put them in the deferred half. A summoned duck would have
 *  been mute until the player happened to stand near water. A prefix is a
 *  naming convention, not a statement about when a sound is needed; the
 *  membership test now asks the tables. 118 KB. */
const FOWL_KEYS = new Set(Object.values(FOWL_SFX).flat());

export function eagerAudioFiles() {
  return allAudioFiles().filter(f =>
    f.key === EAGER_MUSIC_KEY || f.key.startsWith('sfx_') || FOWL_KEYS.has(f.key));
}

/**
 * The complement of the eager set, computed FROM it rather than by repeating
 * its rule inverted.
 *
 * Round 69 added the fowl to the eager predicate and left this one alone, and
 * the two lists stopped partitioning: `amb_ducks_a` was in both, so it was
 * fetched eagerly and then queued again on demand. Two copies of a predicate
 * are one predicate and one bug waiting for the next edit -- `audioFaults`
 * now asserts the split is exact.
 */
export function deferredAudioFiles() {
  const eager = new Set(eagerAudioFiles().map(f => f.key));
  return allAudioFiles().filter(f => !eager.has(f.key));
}

/** Everything the loader has to fetch, in one list, deduplicated by key --
 *  several tables deliberately point at the same file (the hiss is a
 *  Quillrunner AND the Snake essence) and the loader must fetch it once. */
export function allAudioFiles() {
  const out = new Map();
  const add = (key, file) => { if (key && file && !out.has(key)) out.set(key, { key, file }); };
  for (const t of [...MUSIC, ...AMBIANCE, ...SETTLEMENT_AMBIANCE, ...POSITIONAL_AMBIANCE,
    ...AMBIENT_ONESHOTS, ...SPELL_SFX, ...DIRECT_SFX]) add(t.key, t.file);
  // The three keyed tables store bare keys, so their files are derived. One
  // rule, `<key>.mp3`, and audioFaults() checks every table obeys it.
  for (const tbl of [WEAPON_SFX, MONSTER_SFX, MONSTER_DEATH_SFX, ESSENCE_SFX, FOWL_SFX]) {
    for (const keys of Object.values(tbl)) for (const k of keys) add(k, `${k}.mp3`);
  }
  for (const k of MONSTER_DEATH_GENERIC) add(k, `${k}.mp3`);
  // ROUND 71 -- the player's voice, and the rank-up pair.
  for (const set of Object.values(PLAYER_VOICE)) for (const k of Object.values(set)) add(k, `${k}.mp3`);
  for (const k of RANKUP_SFX) add(k, `${k}.mp3`);
  return [...out.values()];
}

/** Clamp and fill a stored mix, so a corrupt or partial store cannot mute the
 *  game with no way back. */
export function normaliseVolumes(v) {
  const out = { ...DEFAULT_VOLUMES };
  // `v &&` first, and `=== undefined` rather than a truthiness test.
  //
  // The first version was `Number(v && v[b])`, and Number(null) is 0 -- a
  // FINITE number -- so a player with no stored mix had every bus overwritten
  // with silence and the game shipped muted by default. Measured on a fresh
  // profile: {master:0, music:0, ambiance:0, spells:0}. A legitimate stored 0
  // still has to survive, which is why this cannot go back to truthiness.
  if (!v || typeof v !== 'object') return out;
  for (const b of BUSES) {
    if (v[b] === undefined || v[b] === null) continue;
    const n = Number(v[b]);
    if (Number.isFinite(n)) out[b] = Math.max(0, Math.min(1, n));
  }
  return out;
}

/** Faults a suite can assert without booting the game. */
export function audioFaults() {
  const out = [];
  // A track list is one row per key: two entries sharing a key means the second
  // is unreachable, because musicFor/ambianceFor stop at the first match.
  const keys = new Set();
  for (const t of [...MUSIC, ...AMBIANCE, ...SETTLEMENT_AMBIANCE, ...POSITIONAL_AMBIANCE,
    ...AMBIENT_ONESHOTS, ...DIRECT_SFX]) {
    if (keys.has(t.key)) out.push(`duplicate audio key ${t.key}`);
    keys.add(t.key);
    if (!t.file) out.push(`${t.key} has no file`);
    if (!t.name) out.push(`${t.key} has no name`);
  }
  // ROUND 68 -- SPELL_SFX is the exception, and deliberately so: one sound
  // answers to a template AND an element, so a repeated key there is the table
  // working. What must NOT happen is the same key naming two different files.
  const fileFor = new Map();
  for (const s of SPELL_SFX) {
    if (!s.file) { out.push(`${s.key} has no file`); continue; }
    if (fileFor.has(s.key) && fileFor.get(s.key) !== s.file) {
      out.push(`${s.key} names two files (${fileFor.get(s.key)}, ${s.file})`);
    }
    fileFor.set(s.key, s.file);
  }
  // Every region the game has must be answerable -- either with a bed or with a
  // deliberate null. A region absent from AMBIANCE is fine; a region named in
  // AMBIANCE that the world does not have is a typo.
  // ROUND 104 -- THIS LIST WAS A LIE FOR AN ENTIRE ROUND.
  //
  // It was hand-written in round 68 when the world had four regions, and round
  // 103 added three more without touching it. Everything below that iterates
  // `REGIONS` -- the "every region has a theme outside its settlements" check,
  // the wilderness-leak check, the unknown-region check -- has been certifying
  // four of seven ever since, and reported nothing, because a check that walks
  // a short list finds no faults in what the list omits. HANDOFF fault class 2
  // exactly: a table keyed off a roster it stopped covering.
  //
  // So it is not a list any more. It is derived from the regions the game
  // actually has, and the next region added is covered the day it is added.
  const REGIONS = WORLD_REGIONS.map(r => r.id);
  for (const a of AMBIANCE) {
    if (!REGIONS.includes(a.region)) out.push(`${a.key} names unknown region ${a.region}`);
  }
  for (const b of BUSES) {
    if (!(b in DEFAULT_VOLUMES)) out.push(`bus ${b} has no default volume`);
    if (!(b in BUS_LABELS)) out.push(`bus ${b} has no label`);
  }
  // The selector must never return a track whose `when` cannot be true: a rule
  // that can never fire is a track nobody will ever hear.
  const probes = [
    // ROUND 104 -- the four hand-written region probes are derived now, for the
    // same reason the REGIONS list above is: three regions arrived in round 103
    // and a hand-written roster does not notice. Both halves of `inSettlement`
    // are probed because both halves now lead somewhere.
    ...REGIONS.map(region => ({ region })),
    ...REGIONS.map(region => ({ region, inSettlement: true })),
    { titleScreen: true }, { inCave: true }, { inSewer: true }, { roomId: 'division_lab' },
    { roomId: 'auction' }, { roomId: 'temple_war' },
    // ROUND 133 -- the Society's two rooms, and their per-city clones. Both
    // spellings are probed because both are real: `guild` is Cadence's hall
    // and `guild_ont_city` is Harrowmoor's, and a prefix rule that matched
    // only one of them would be half a rule. The guard caught these the
    // moment the tracks were added, which is the whole reason it exists --
    // the comment below says a new state is a new row here, and this is that.
    { roomId: 'guild' }, { roomId: 'guild_ont_city' },
    { roomId: 'guild_market' }, { roomId: 'guild_market_ont_city' },
    { roomId: 'temple_war', region: 'bratugal' },
    { onPortalSquare: true },
    // ROUND 77 -- the new situations. A probe list is a roster of the states
    // the world can be in, so a new state is a new row here; leaving it out
    // and relaxing the check instead is how a reachability guard rots into a
    // guard that certifies nothing.
    { charTheme: 'music_char_zeke' }, { charTheme: 'music_char_britanica' },
    { charTheme: 'music_char_benjamin' }, { charTheme: 'music_char_benjamin_sad' },
    // ROUND 147 -- standing at a house on its own, out in the country. A new
    // state, so a new row, exactly as the note above requires -- and the guard
    // earned it immediately: the wilderness-house track was first appended to
    // the END of the table, where a region theme matches before it ever could,
    // and this reported "music_wilderness_house can never play".
    { atLoneHome: true, region: 'nek' },
    // ROUND 172 -- the two the user sent, and the guard earned its keep again:
    // it reported "music_boss can never play" and "music_surge can never play"
    // the moment the rows went in, because a probe list is a roster of the
    // states the world can be in and neither of these states existed yet.
    // Both are about what is HAPPENING rather than where the player is, which
    // is why they are the first two rows in the table.
    { bossFight: true }, { bossFight: true, inSewer: true },
    { surgeWave: true }, { surgeOpening: true },
  ];
  for (const t of MUSIC) {
    if (!probes.some(p => { try { return t.when(p); } catch (e) { return false; } })) {
      out.push(`${t.key} can never play`);
    }
  }
  // ROUND 73 -- and the rule the region themes were just given, asserted as a
  // rule rather than trusted as four edits.
  //
  // ROUND 77 -- THE RULE, RESTATED, BECAUSE THE FACT CHANGED AND THE RULE DID
  // NOT. Round 73 wrote this as "a city returns null", which was the right
  // assertion while no city theme existed and became a false one the moment
  // Harrowmoor and Karsk Landing got their own tracks. The temptation was to
  // delete the check; the bug it was written to catch is still live.
  //
  // What round 73 actually fixed was Cadence playing THE NEK -- a wilderness
  // theme leaking into a city because the region rules never read
  // `inSettlement`. So that is what this asserts now: inside a city you get
  // that city's own theme or you get nothing, and in neither case do you get
  // the country outside the wall. Cadence and Vashra still answer null and
  // that is still correct; they are not exempted, they simply have no theme
  // to find.
  // ROUND 104 -- and the leak test stops asking the KEY what it is.
  //
  // It read `/^music_region\d$/`, which is a naming convention doing the work
  // of a fact (HANDOFF fault class 4). Sirukh's and Ixcuatl's themes are named
  // for their places rather than numbered -- see the note on those rows -- so
  // the old pattern would have called neither a wilderness theme and waved
  // both through if they leaked into a town.
  //
  // The rule never needed the key. A leak IS the two answers being the same
  // track: if standing inside the walls and standing outside them return one
  // track, the wilderness theme followed the player in. That holds for any
  // naming scheme, including ones nobody has invented yet.
  for (const region of REGIONS) {
    const inCity = musicFor({ region, inSettlement: true });
    const wild = musicFor({ region, inSettlement: false });
    if (inCity && wild && inCity.key === wild.key) {
      out.push(`wilderness theme ${inCity.key} plays inside a ${region} settlement`);
    }
    // And the mirror: a city theme must not follow the player out of the gate.
    const outside = musicFor({ region, inSettlement: false });
    if (outside && /^music_city_/.test(outside.key)) {
      out.push(`city theme ${outside.key} plays out in ${region}`);
    }
    // ROUND 104 -- a region with no theme is now a NAMED hole rather than a
    // check that had to be softened. The Cinderwaste has no track because none
    // was written; that is a gap in the art, not a bug in the selector, and
    // listing it here keeps the guarantee live for the other six. The two
    // assertions after the loop stop the list itself from rotting -- a stale
    // exemption is the thing that would quietly turn this check off again.
    if (!musicFor({ region }) && !REGIONS_WITHOUT_THEME.includes(region)) {
      out.push(`${region} has no theme outside its settlements`);
    }
  }
  for (const region of REGIONS_WITHOUT_THEME) {
    if (!REGIONS.includes(region)) out.push(`${region} is exempted from having a theme and is not a region`);
    else if (musicFor({ region })) out.push(`${region} has a theme and is still listed as having none`);
  }
  // The city bed answers at every hour, which is the whole of round 73's
  // correction to it. Checked at both, so re-adding `night: true` fails here.
  for (const night of [true, false]) {
    const bed = ambianceFor({ inSettlement: true, night, region: 'nek' });
    if (!bed || bed.key !== 'amb_city_night') {
      out.push(`no city ambiance at ${night ? 'night' : 'day'}`);
    }
  }

  // ------------------------------------------------------------------------
  // ROUND 68 -- the four keyed tables, checked against the real rosters.
  //
  // Each of these is a fault this project has actually shipped before, in
  // another table: a key nothing reads, a key naming a thing that does not
  // exist, and a roster entry the table forgot.
  // ------------------------------------------------------------------------

  // Every weapon that can be SWUNG must have a swing sound. Not "should" --
  // a silent swing reads as the button not having worked.
  //
  // ROUND 104 -- SWINGABLE_WEAPON_IDS, not WEAPON_ORDER. The two were the same
  // list until unarmed existed: WEAPON_ORDER is what is on the shop shelves,
  // and unarmed is on no shelf. Reading the shop list here would have demanded
  // a sound for everything purchasable and accepted silence from the one
  // attack every character in the game can always make.
  for (const w of SWINGABLE_WEAPON_IDS) {
    if (!WEAPON_SFX[w] || !WEAPON_SFX[w].length) out.push(`weapon ${w} has no swing sound`);
  }
  for (const w of Object.keys(WEAPON_SFX)) {
    if (!SWINGABLE_WEAPON_IDS.includes(w)) out.push(`WEAPON_SFX names unknown weapon ${w}`);
  }
  // A monster family may legitimately have no voice; naming one that does not
  // exist is always a typo.
  for (const f of Object.keys(MONSTER_SFX)) {
    if (!MONSTER_FAMILIES.includes(f)) out.push(`MONSTER_SFX names unknown family ${f}`);
  }
  for (const e of Object.keys(ESSENCE_SFX)) {
    if (!ESSENCE_CATALOG[e]) out.push(`ESSENCE_SFX names unknown essence ${e}`);
  }
  // ROUND 69 -- the death table and the fowl.
  for (const f of Object.keys(MONSTER_DEATH_SFX)) {
    if (!MONSTER_FAMILIES.includes(f)) out.push(`MONSTER_DEATH_SFX names unknown family ${f}`);
  }
  if (!MONSTER_DEATH_GENERIC.length) out.push('no generic death sound');
  // EVERY family must die audibly. This is the assertion that makes the death
  // table total, and it is checked against the real roster rather than against
  // the table's own keys -- fault class 2 is a table checked against itself.
  for (const f of MONSTER_FAMILIES) {
    if (!monsterDeathSfxFor(f)) out.push(`family ${f} has no death sound`);
  }
  for (const e of Object.keys(FOWL_SFX)) {
    if (!ESSENCE_CATALOG[e]) out.push(`FOWL_SFX names unknown essence ${e}`);
  }
  // ROUND 71 -- EVERY body type resolves to a full voice, including the six
  // the character creator does not offer yet. See PLAYER_VOICE.
  for (const b of BODY_TYPES) {
    for (const ev of PLAYER_VOICE_EVENTS) {
      if (!playerVoiceFor(b.id, ev)) out.push(`body ${b.id} has no ${ev} voice`);
    }
  }
  for (const ev of PLAYER_VOICE_EVENTS) {
    if (PLAYER_VOICE_COOLDOWN[ev] === undefined) out.push(`voice event ${ev} has no cooldown`);
  }
  // The weapon split must cover the roster: every weapon lands on light or
  // heavy, and a heavy weapon named here must actually exist.
  for (const w of HEAVY_WEAPONS) {
    if (!WEAPON_ORDER.includes(w)) out.push(`HEAVY_WEAPONS names unknown weapon ${w}`);
  }
  // ROUND 104 -- the swingable list here too. The player grunts when they
  // swing, and they swing with their fists.
  for (const w of SWINGABLE_WEAPON_IDS) {
    const ev = weaponVoiceEvent(w);
    if (ev !== 'light' && ev !== 'heavy') out.push(`weapon ${w} maps to no voice event`);
  }
  // Every element must be answerable, because the element row is the floor the
  // generator falls through to. A missing one is thousands of silent abilities.
  //
  // Checked against SFX_ELEMENTS, not ELEMENT_TYPES. The first version of this
  // check used ELEMENT_TYPES and therefore certified a floor with a hole in it:
  // `physical` is not one of the six damage channels but is on a great many
  // abilities, so the check passed and the abilities were silent. A guard that
  // reads a narrower list than the runtime does is worse than no guard.
  for (const el of SFX_ELEMENTS) {
    if (!SPELL_SFX.some(s => s.element === el)) out.push(`no sound for element ${el}`);
  }
  if (ELEMENT_TYPES.some(e => !SFX_ELEMENTS.includes(e))) {
    out.push('SFX_ELEMENTS no longer covers ELEMENT_TYPES');
  }
  // ROUND 105 -- and every DAMAGE TYPE must reach a real channel. The check
  // above covers the six geared elements; there are twenty-eight damage types
  // now, and a type whose `sfx` names a channel that does not exist is a
  // silent ability the same as a missing element row was.
  for (const t of DAMAGE_TYPE_KEYS) {
    const ch = DAMAGE_TYPES[t].sfx;
    if (!SFX_ELEMENTS.includes(ch)) out.push(`damage type ${t} maps to unknown sfx channel ${ch}`);
    if (!spellSfxFor({ element: t })) out.push(`damage type ${t} has no sound`);
  }
  for (const s of SPELL_SFX) {
    if (s.element && !SFX_ELEMENTS.includes(s.element)) out.push(`${s.key} names unknown element ${s.element}`);
    if (s.family && !FX_POOLS[s.family]) out.push(`${s.key} names unknown fx family ${s.family}`);
    if (!s.element && !s.family && !s.template) out.push(`${s.key} matches nothing`);
  }
  // A one-shot with no `when` must belong to a pool whose leader has one, or it
  // can never be reached -- the exact shape of "a field read by nothing".
  for (const o of AMBIENT_ONESHOTS) {
    if (typeof o.when === 'function') continue;
    if (!o.pool || !AMBIENT_ONESHOTS.some(x => x.pool === o.pool && typeof x.when === 'function')) {
      out.push(`${o.key} can never play`);
    }
  }
  // ROUND 69 -- the eager/deferred split must be an exact partition. It stopped
  // being one the moment the eager rule grew a second clause.
  {
    const e = eagerAudioFiles().map(f => f.key);
    const d = deferredAudioFiles().map(f => f.key);
    const all = allAudioFiles().length;
    if (e.length + d.length !== all) out.push(`load split is not a partition: ${e.length}+${d.length} != ${all}`);
    const both = e.filter(k => d.includes(k));
    if (both.length) out.push(`in both load halves: ${both.join(',')}`);
  }
  // The derived-filename rule the loader depends on.
  for (const tbl of [WEAPON_SFX, MONSTER_SFX, MONSTER_DEATH_SFX, ESSENCE_SFX]) {
    for (const keys of Object.values(tbl)) {
      for (const k of keys) if (!/^sfx_[a-z0-9_]+$/.test(k)) out.push(`${k} is not a well-formed sfx key`);
    }
  }
  // FOWL_SFX is the exception to the sfx_ naming rule: the duck's three clips
  // are the SAME files the pond ambience uses, and renaming them to satisfy a
  // convention would ship the bytes twice.
  for (const keys of Object.values(FOWL_SFX)) {
    for (const k of keys) if (!/^(sfx|amb)_[a-z0-9_]+$/.test(k)) out.push(`${k} is not a well-formed audio key`);
  }

  // ------------------------------------------------------------------------
  // ROUND 77 -- the character themes, against the real companion roster.
  //
  // COMPANION_ARCS is the list of people who can raise a theme, so it is the
  // list this is checked against. A theme keyed to a companion who does not
  // exist is a typo that would simply never play, and this project has
  // shipped that exact shape of bug in four other tables.
  // ------------------------------------------------------------------------
  {
    const musicKeys = new Set(MUSIC.map(t => t.key));
    for (const [id, f] of Object.entries(COMPANION_THEMES)) {
      if (!COMPANION_ARCS[id]) out.push(`COMPANION_THEMES names unknown companion ${id}`);
      // Every step of every arc must resolve to a track that is IN the list.
      // A chooser is a function, so the only honest check is to run it over
      // the whole domain rather than to read the one branch that is obvious.
      const steps = (COMPANION_ARCS[id] || []).length || 1;
      for (let told = 1; told <= steps; told++) {
        const k = f(told);
        if (!k) out.push(`${id} step ${told} resolves to no theme`);
        else if (!musicKeys.has(k)) out.push(`${id} step ${told} names track ${k}, which is not in MUSIC`);
      }
    }
    // A held track that is ALSO in MUSIC is not held -- it is playing, and the
    // list saying otherwise is a lie the next round would believe.
    for (const h of HELD_MUSIC) {
      if (musicKeys.has(h.key)) out.push(`${h.key} is in HELD_MUSIC and in MUSIC`);
      if (!h.waitingFor) out.push(`${h.key} is held with no note of what it is waiting for`);
    }
    // The character rules are gated on `charTheme` and nothing else, so each
    // must be unreachable when the scene has not set it. A rule that matched
    // on an empty context would seize the music permanently.
    const idle = { titleScreen: false, region: 'nek', insideRoom: false, roomId: null,
      inCave: false, night: false, inSettlement: false, onPortalSquare: false, charTheme: null };
    const got = musicFor(idle);
    if (got && got.key.startsWith('music_char_')) {
      out.push(`${got.key} plays with no companion talking`);
    }
  }
  return out;
}
