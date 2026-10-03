// NPC atlas layout, ported from sparkstone_prototype.html lines ~8595-8636
// (SHOPKEEPER_CELL/GUILDMASTER_CELL/NPC_ART). Both are real extracted art:
// 512x64 PNGs, 8 direction-columns x 1 row, static (no animation frames at
// all -- confirmed against the original's own comment: "Static NPC, no
// animation needed").
//
// NEW round 3: 10 new humanoid NPCs (user-uploaded PixelLab art, same
// 512x64/8-column layout, extracted by extract_round3.py) plus a SOFT
// palette-variant system for every non-monster NPC -- the user's own words:
// "for all NPCs that are not monsters please [do] a very soft set of
// palette swaps to allow for more variety in NPC interaction." Each base
// NPC art key optionally has one or more `_v1`/`_v2` sibling atlases (built
// by the same extraction script, capped at a +-18deg hue shift and small
// sat/val nudges -- deliberately much gentler than the monster roster's
// bold recolors, so a variant reads as "the same person, slightly different
// coloring" rather than a different character). Every variant is registered
// as its own independent NPC_ART entry with the exact same footX/footY/
// scale as its base (they're pixel-identical recolors of the same source
// art, so the anchor never changes) -- callers just treat a variant artKey
// as an ordinary NPC art key like any other.

export const NPC_CELL = 64;

// Shared foot-anchor convention for every NPC in this file (base game +
// round 3): built with NPC_BASELINE_MARGIN=1 in extract_round3.py, i.e. the
// sprite's feet sit 1px up from the bottom of its 64px cell -- same anchor
// shopkeeper/guildmaster already used, so every new NPC (and every variant
// of every NPC) lines up on the ground the same way with zero per-entry
// tuning.
const STANDARD_ANCHOR = { footX: 32, footY: 63, scale: 1.0 };

// ===========================================================================
// ROUND 134 (item 4) -- AN NPC THAT WALKS.
//
// The user: "Cultist is not utilizing the movement animation. This was already
// uploaded, please ensure all character with movement animations have them
// active (and recolored as needed to match the static variant)"
//
// Until this round NO entry in this file had more than one frame per
// direction. Every `npc_*.png` is 8 x 64 -- one static pose per direction --
// so a cultist charging across a camp was that pose, translated. The four
// party members and the named cast have had walk cycles since round 46, but
// they live in CHAR_ART and read through `_drawPartyMember`; nothing on this
// side of the fence had a second state to be in.
//
// `walk` is that second state, and it is OPTIONAL: an entry without one is
// exactly what it was. It carries its own cell and its own foot because the
// delivery's running frames are 92px against the rotations' 64, and the two
// therefore need different origins -- `_npcWalkFrame` is the one place that
// arithmetic lives.
//
// ONLY THE MAN. The drop contains one model's running frames; the woman's
// static sheet has no animation to attach, so `npc_cultist_woman` and its ten
// recolours keep the single pose. Named here rather than left implicit,
// because "half the cult animates" is a fact about the art we have and not an
// oversight to be found later.
const CULT_WALK = (key) => ({
  sheet: `${key}_walk`, cell: 92, framesPerDir: 8, frameMs: 90, footX: 46, footY: 78,
});

// ===========================================================================
// ROUND 172 -- ELEVEN MORE WALK CYCLES.
//
// The user: "Also added walking animations for a number of the NPCs, color the
// new animations as needed to support the color work done previously. This
// should reduce (or eliminate) the number of NPCs that move around without
// moving their legs."
//
// Every number below was MEASURED by tools/sheet_round172_walks.py rather than
// typed: the cell is the largest frame in the delivery, the foot is where the
// south pose's lowest opaque pixel lands, and which character each delivery IS
// was decided by comparing its south rotation against every idle sheet in the
// game -- not by reading the folder name, which is the prompt that made it.
// Ten matched a character already in the roster at 1.000 against a best
// runner-up of 0.616. The eleventh matched nobody (0.475, flat) and came in as
// a new character with rotations of his own.
//
// The `_v1`/`_v2` walks are DERIVED, not delivered: the colour map is read off
// the pair of idle sheets and replayed onto the walk frames, so a recoloured
// person keeps their clothes the moment they start moving. Round 134's trick,
// reused.
// ===========================================================================
const WALK = (sheet, cell, framesPerDir, footX, footY) => ({
  sheet, cell, framesPerDir, frameMs: Math.round(720 / framesPerDir), footX, footY,
});

// ROUND 199 -- AND A SWING, FOR THE PEOPLE WHO FIGHT BACK.
//
// Round 196 imported three bandits and a pirate with `_attack` sheets beside
// their `_walk` sheets, and round 197's notes closed with the admission that
// the attack sheets were "still on disk unread". They are read here.
//
// Sampled PROPORTIONALLY against the swing rather than at a fixed frame rate,
// the way the player's own attack is (see playerAnim.js's ATTACK_* note): a
// swing that lands after 0.55 s and one that lands after 1.2 s should both
// show the whole arc and land on its last frame, and a fixed `frameMs` shows
// part of it twice or not at all.
//
// The anchors were measured, not guessed: each sheet's south row was cropped
// and its silhouette's bottom edge compared with the same model's walk sheet,
// because the FEET are the thing that must not move when the texture swaps.
// The brute's attack art sits four pixels higher in its cell than his walk
// does, and the bandit woman's whole sheet is a tighter 64 -- she is the one
// who casts, and her fireball pose is drawn to a different grid.
const ATTACK = (sheet, cell, framesPerDir, footX, footY, bandDy = 0) => ({
  sheet, cell, framesPerDir, footX, footY, bandDy,
});

// ROUND 192 -- AND THE REST. Eight deliveries (zombie, wight, goliath, mage,
// the three priests, the cultist woman) matched by tools/sheet_round192_walks.py
// the same way round 172's were, with every recoloured variant -- god robes and
// cult colours included -- derived from its idle colour map. Four characters
// still have no cycle anywhere in the uploads: townsman, plate knight,
// noblewoman and adventurous girl.
export const NPC_ART = {
  shopkeeper: { footX: 32, footY: 63, scale: 1.0, walk: WALK('shopkeeper_walk', 92, 8, 46, 79) },

  guildmaster: { footX: 30, footY: 62, scale: 1.0, walk: WALK('guildmaster_walk', 88, 8, 44, 76) },

  // NEW round 3: soft palette variants of the two existing NPCs -- lets
  // WorldScene place a second "shopkeeper-shaped" or "guildmaster-shaped"
  // townsperson elsewhere in town without needing brand new source art.
  shopkeeper_v1: { ...STANDARD_ANCHOR, walk: WALK('shopkeeper_v1_walk', 92, 8, 46, 79) },

  shopkeeper_v2: { ...STANDARD_ANCHOR, walk: WALK('shopkeeper_v2_walk', 92, 8, 46, 79) },

  guildmaster_v1: { ...STANDARD_ANCHOR, walk: WALK('guildmaster_v1_walk', 88, 8, 44, 76) },

  guildmaster_v2: { ...STANDARD_ANCHOR, walk: WALK('guildmaster_v2_walk', 88, 8, 44, 76) },

  // --- NEW round 3: 10 new humanoid NPCs, each with a base + 2 soft
  // variants (npc_<key>, npc_<key>_v1, npc_<key>_v2).
  // ROUND 172 -- a character the delivery brought with it. He matched nothing
  // in the roster (0.475 against the shopkeeper, with the next two at 0.470
  // and 0.449 -- a flat spread, which is what "nobody we have" looks like), so
  // he is his own key rather than a walk cycle forced onto the wrong man.
  npc_bearded_adventurer: { ...STANDARD_ANCHOR,
    walk: WALK('npc_bearded_adventurer_walk', 88, 8, 44, 80) },
  npc_muscular_adventurer: { ...STANDARD_ANCHOR, walk: WALK('npc_muscular_adventurer_walk', 88, 8, 44, 78) },

  npc_muscular_adventurer_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_muscular_adventurer_v1_walk', 88, 8, 44, 78) },

  npc_muscular_adventurer_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_muscular_adventurer_v2_walk', 88, 8, 44, 78) },

  npc_posh_noble_girl: { ...STANDARD_ANCHOR, walk: WALK('npc_posh_noble_girl_walk', 88, 8, 44, 77) },

  npc_posh_noble_girl_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_posh_noble_girl_v1_walk', 88, 8, 44, 77) },

  npc_posh_noble_girl_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_posh_noble_girl_v2_walk', 88, 8, 44, 77) },

  npc_noble_standing: { ...STANDARD_ANCHOR, walk: WALK('npc_noble_standing_walk', 88, 8, 44, 77) },

  npc_noble_standing_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_noble_standing_v1_walk', 88, 8, 44, 77) },

  npc_noble_standing_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_noble_standing_v2_walk', 88, 8, 44, 77) },

  npc_female_adventurer: { ...STANDARD_ANCHOR, walk: WALK('npc_female_adventurer_walk', 88, 8, 44, 73) },

  npc_female_adventurer_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_female_adventurer_v1_walk', 88, 8, 44, 73) },

  npc_female_adventurer_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_female_adventurer_v2_walk', 88, 8, 44, 73) },

  npc_farmer: { ...STANDARD_ANCHOR, walk: WALK('npc_farmer_walk', 88, 8, 44, 75) },

  npc_farmer_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_farmer_v1_walk', 88, 8, 44, 75) },

  npc_farmer_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_farmer_v2_walk', 88, 8, 44, 75) },

  npc_peasant_man: { ...STANDARD_ANCHOR, walk: WALK('npc_peasant_man_walk', 92, 8, 46, 78) },

  npc_peasant_man_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_peasant_man_v1_walk', 92, 8, 46, 78) },

  npc_peasant_man_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_peasant_man_v2_walk', 92, 8, 46, 78) },

  npc_cheerful_peasant_girl: { ...STANDARD_ANCHOR, walk: WALK('npc_cheerful_peasant_girl_walk', 88, 8, 44, 76) },

  npc_cheerful_peasant_girl_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_cheerful_peasant_girl_v1_walk', 88, 8, 44, 76) },

  npc_cheerful_peasant_girl_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_cheerful_peasant_girl_v2_walk', 88, 8, 44, 76) },

  npc_grizzled_adventurer: { ...STANDARD_ANCHOR, walk: WALK('npc_grizzled_adventurer_walk', 88, 8, 44, 74) },

  npc_grizzled_adventurer_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_grizzled_adventurer_v1_walk', 88, 8, 44, 74) },

  npc_grizzled_adventurer_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_grizzled_adventurer_v2_walk', 88, 8, 44, 74) },

// ===========================================================================
// ROUND 78 (items 4, 5, 10) -- THE NEW CAST.
//
// Ten 8-rotation models and seventy sheets, built by
// extract_round78_characters.py. Same convention as everything above: one
// column per PLAYER_DIR_ORDER direction, feet 1px off the bottom of the cell.
//
// THE GOLIATH IS 96px AND EVERYTHING ELSE IS 64. That is the only reason
// `cell` exists on these entries: the loader read NPC_CELL for every key, so a
// 96px sheet loaded at 64 would have been eight frames of the wrong third of
// the art. The field is optional and absent everywhere it would be 64, so no
// existing entry changes.
//
// The palettes are NOT interchangeable decoration:
//   *_<cult>   ten cults, each keyed to the essence its build is drawn from
//              (see cultists.js) -- so the colour tells you what is about to
//              happen to you.
//   *_<god>    eight priests, coloured from their own god's temple ramp.
//   *_v1..v4   four more of the same person, for the town and the roads.
// ===========================================================================
  // ROUND 193 -- npc_adventurous_girl and npc_noblewoman are GONE, art and all.
  // The girl's model became Aedia (her south pose scores 1.000 against
  // char_aedia_idle), so a crowd drawn from it was a plaza full of companions;
  // the noblewoman is round 50's legless model, banned from the rosters since
  // then and asked for twice more. Both sheets are deleted from public/assets,
  // so an art key naming either one now fails the roster validator below
  // rather than quietly drawing nobody.
  npc_cultist_woman: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_walk', 92, 8, 46, 77) },
  npc_cultist_woman_bone: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_bone_walk', 92, 8, 46, 77) },
  npc_cultist_woman_blood: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_blood_walk', 92, 8, 46, 77) },
  npc_cultist_woman_undeath: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_undeath_walk', 92, 8, 46, 77) },
  npc_cultist_woman_ash: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_ash_walk', 92, 8, 46, 77) },
  npc_cultist_woman_void: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_void_walk', 92, 8, 46, 77) },
  npc_cultist_woman_sin: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_sin_walk', 92, 8, 46, 77) },
  npc_cultist_woman_blight: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_blight_walk', 92, 8, 46, 77) },
  npc_cultist_woman_storm: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_storm_walk', 92, 8, 46, 77) },
  npc_cultist_woman_deep: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_deep_walk', 92, 8, 46, 77) },
  npc_cultist_woman_gold: { ...STANDARD_ANCHOR, walk: WALK('npc_cultist_woman_gold_walk', 92, 8, 46, 77) },
  npc_cultist_man: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man') },
  npc_cultist_man_bone: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_bone') },
  npc_cultist_man_blood: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_blood') },
  npc_cultist_man_undeath: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_undeath') },
  npc_cultist_man_ash: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_ash') },
  npc_cultist_man_void: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_void') },
  npc_cultist_man_sin: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_sin') },
  npc_cultist_man_blight: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_blight') },
  npc_cultist_man_storm: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_storm') },
  npc_cultist_man_deep: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_deep') },
  npc_cultist_man_gold: { ...STANDARD_ANCHOR, walk: CULT_WALK('npc_cultist_man_gold') },
  npc_zombie: { ...STANDARD_ANCHOR, walk: WALK('npc_zombie_walk', 84, 8, 42, 70) },
  npc_zombie_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_zombie_v1_walk', 84, 8, 42, 70) },
  npc_zombie_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_zombie_v2_walk', 84, 8, 42, 70) },
  npc_zombie_v3: { ...STANDARD_ANCHOR, walk: WALK('npc_zombie_v3_walk', 84, 8, 42, 70) },
  npc_zombie_v4: { ...STANDARD_ANCHOR, walk: WALK('npc_zombie_v4_walk', 84, 8, 42, 70) },
  npc_wight: { ...STANDARD_ANCHOR, walk: WALK('npc_wight_walk', 76, 8, 38, 63) },
  npc_wight_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_wight_v1_walk', 76, 8, 38, 63) },
  npc_wight_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_wight_v2_walk', 76, 8, 38, 63) },
  npc_wight_v3: { ...STANDARD_ANCHOR, walk: WALK('npc_wight_v3_walk', 76, 8, 38, 63) },
  npc_wight_v4: { ...STANDARD_ANCHOR, walk: WALK('npc_wight_v4_walk', 76, 8, 38, 63) },
  npc_goliath: { ...STANDARD_ANCHOR, cell: 96, walk: WALK('npc_goliath_walk', 132, 8, 66, 120) },
  npc_goliath_v1: { ...STANDARD_ANCHOR, cell: 96, walk: WALK('npc_goliath_v1_walk', 132, 8, 66, 120) },
  npc_goliath_v2: { ...STANDARD_ANCHOR, cell: 96, walk: WALK('npc_goliath_v2_walk', 132, 8, 66, 120) },
  npc_goliath_v3: { ...STANDARD_ANCHOR, cell: 96, walk: WALK('npc_goliath_v3_walk', 132, 8, 66, 120) },
  npc_goliath_v4: { ...STANDARD_ANCHOR, cell: 96, walk: WALK('npc_goliath_v4_walk', 132, 8, 66, 120) },
  npc_townsman: { ...STANDARD_ANCHOR, walk: WALK('npc_townsman_walk', 88, 8, 44, 75) },
  npc_townsman_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_townsman_v1_walk', 88, 8, 44, 75) },
  npc_townsman_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_townsman_v2_walk', 88, 8, 44, 75) },
  npc_townsman_v3: { ...STANDARD_ANCHOR, walk: WALK('npc_townsman_v3_walk', 88, 8, 44, 75) },
  npc_townsman_v4: { ...STANDARD_ANCHOR, walk: WALK('npc_townsman_v4_walk', 88, 8, 44, 75) },
  npc_plate: { ...STANDARD_ANCHOR, walk: WALK('npc_plate_walk', 84, 8, 42, 71) },
  npc_plate_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_plate_v1_walk', 84, 8, 42, 71) },
  npc_plate_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_plate_v2_walk', 84, 8, 42, 71) },
  npc_plate_v3: { ...STANDARD_ANCHOR, walk: WALK('npc_plate_v3_walk', 84, 8, 42, 71) },
  npc_plate_v4: { ...STANDARD_ANCHOR, walk: WALK('npc_plate_v4_walk', 84, 8, 42, 71) },
  npc_mage: { ...STANDARD_ANCHOR, walk: WALK('npc_mage_walk', 88, 6, 44, 68) },
  npc_mage_v1: { ...STANDARD_ANCHOR, walk: WALK('npc_mage_v1_walk', 88, 6, 44, 68) },
  npc_mage_v2: { ...STANDARD_ANCHOR, walk: WALK('npc_mage_v2_walk', 88, 6, 44, 68) },
  npc_mage_v3: { ...STANDARD_ANCHOR, walk: WALK('npc_mage_v3_walk', 88, 6, 44, 68) },
  npc_mage_v4: { ...STANDARD_ANCHOR, walk: WALK('npc_mage_v4_walk', 88, 6, 44, 68) },
  npc_priest_m: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_walk', 88, 8, 44, 79) },
  npc_priest_m_war: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_war_walk', 88, 8, 44, 79) },
  npc_priest_m_dominion: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_dominion_walk', 88, 8, 44, 79) },
  npc_priest_m_heros: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_heros_walk', 88, 8, 44, 79) },
  npc_priest_m_knowledge: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_knowledge_walk', 88, 8, 44, 79) },
  npc_priest_m_liberty: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_liberty_walk', 88, 8, 44, 79) },
  npc_priest_m_healing: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_healing_walk', 88, 8, 44, 79) },
  npc_priest_m_purity: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_purity_walk', 88, 8, 44, 79) },
  npc_priest_m_death: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_m_death_walk', 88, 8, 44, 79) },
  npc_priest_old: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_walk', 88, 8, 44, 75) },
  npc_priest_old_war: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_war_walk', 88, 8, 44, 75) },
  npc_priest_old_dominion: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_dominion_walk', 88, 8, 44, 75) },
  npc_priest_old_heros: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_heros_walk', 88, 8, 44, 75) },
  npc_priest_old_knowledge: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_knowledge_walk', 88, 8, 44, 75) },
  npc_priest_old_liberty: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_liberty_walk', 88, 8, 44, 75) },
  npc_priest_old_healing: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_healing_walk', 88, 8, 44, 75) },
  npc_priest_old_purity: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_purity_walk', 88, 8, 44, 75) },
  npc_priest_old_death: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_old_death_walk', 88, 8, 44, 75) },
  npc_priest_f: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_walk', 88, 8, 44, 74) },
  npc_priest_f_war: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_war_walk', 88, 8, 44, 74) },
  npc_priest_f_dominion: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_dominion_walk', 88, 8, 44, 74) },
  npc_priest_f_heros: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_heros_walk', 88, 8, 44, 74) },
  npc_priest_f_knowledge: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_knowledge_walk', 88, 8, 44, 74) },
  npc_priest_f_liberty: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_liberty_walk', 88, 8, 44, 74) },
  npc_priest_f_healing: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_healing_walk', 88, 8, 44, 74) },
  npc_priest_f_purity: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_purity_walk', 88, 8, 44, 74) },
  npc_priest_f_death: { ...STANDARD_ANCHOR, walk: WALK('npc_priest_f_death_walk', 88, 8, 44, 74) },

  // =========================================================================
  // ROUND 196 -- FIFTEEN MORE PEOPLE.
  //
  //   "Additional NPCs for recoloring and distribution to further increase
  //    variety in enemies and townsfolk. Each will have at least a movement
  //    and death animation (bodies should still be generated off of the last
  //    frame of the death animation). Many of them will have spell and attack
  //    animations."
  //
  // Every number below was MEASURED by tools/sheet_round196_npcs.py: the cell
  // is the largest frame in the delivery and the foot is where the south
  // pose's lowest opaque pixel lands. None of the fifteen is anybody the game
  // already has -- round 172's identification exists to answer that question
  // and the answer here is "nobody", fifteen times, so each comes in as a new
  // character with rotations of their own.
  //
  // NO `_v1`/`_v2` KEYS. Round 3's characters carry painted variants as files;
  // these fifteen are recoloured at RUNTIME instead (townFolk.js), which is
  // eight variants apiece for no files. See FOLK_MODELS.
  //
  // Their DEATHS are in deathArt.js and their attack sheets are on disk
  // unread: the round that makes bandits something you fight is the round
  // that loads them.
  // a crate under one arm, which is why he stands in markets
  npc_merchant: { ...STANDARD_ANCHOR, walk: WALK('npc_merchant_walk', 88, 8, 44, 78) },
  npc_confident_woman: { ...STANDARD_ANCHOR, walk: WALK('npc_confident_woman_walk', 88, 8, 44, 76) },
  npc_sporty_woman: { ...STANDARD_ANCHOR, walk: WALK('npc_sporty_woman_walk', 84, 8, 42, 68) },
  // two attack animations: a punch combination and a kick
  npc_sleek_woman: { ...STANDARD_ANCHOR, walk: WALK('npc_sleek_woman_walk', 92, 8, 46, 79) },
  npc_patterned_man: { ...STANDARD_ANCHOR, walk: WALK('npc_patterned_man_walk', 88, 8, 44, 77) },
  npc_hiker_m: { ...STANDARD_ANCHOR, walk: WALK('npc_hiker_m_walk', 88, 8, 44, 77) },
  // her run ships five directions; the other three are mirrored (see the tool)
  npc_hiker_f: { ...STANDARD_ANCHOR, walk: WALK('npc_hiker_f_walk', 92, 8, 46, 80) },
  npc_shield_adventurer: { ...STANDARD_ANCHOR, walk: WALK('npc_shield_adventurer_walk', 88, 8, 44, 74) },
  npc_auctioneer_m: { ...STANDARD_ANCHOR, walk: WALK('npc_auctioneer_m_walk', 92, 8, 46, 78) },
  npc_auctioneer_f: { ...STANDARD_ANCHOR, walk: WALK('npc_auctioneer_f_walk', 92, 8, 46, 81) },
  // two attack animations: a thrust and a brace
  npc_city_guard: { ...STANDARD_ANCHOR, walk: WALK('npc_city_guard_walk', 92, 8, 46, 78) },
  // the only one of the fifteen who casts -- her attack is a fireball
  npc_bandit_woman: { ...STANDARD_ANCHOR, walk: WALK('npc_bandit_woman_walk', 88, 8, 44, 75) , attack: ATTACK('npc_bandit_woman_attack', 64, 6, 32, 63, 2) },
  npc_bandit_brute: { ...STANDARD_ANCHOR, walk: WALK('npc_bandit_brute_walk', 92, 8, 46, 80) , attack: ATTACK('npc_bandit_brute_attack', 92, 13, 46, 76, 13) },
  npc_bandit_skinny: { ...STANDARD_ANCHOR, walk: WALK('npc_bandit_skinny_walk', 88, 8, 44, 74) , attack: ATTACK('npc_bandit_skinny_attack', 88, 13, 44, 74, 11) },
  npc_pirate: { ...STANDARD_ANCHOR, walk: WALK('npc_pirate_walk', 88, 8, 44, 75) , attack: ATTACK('npc_pirate_attack', 88, 13, 44, 74, 11) },
};

// Interaction radius, ported verbatim (NPC_INTERACT_RADIUS, line ~5803) --
// shared by NPCs and the quest board in the original, same here.
export const NPC_INTERACT_RADIUS = 46;

// Placement + dialogue -- new positions for this port's small test town
// (the original places these relative to GUILD_LOT, which doesn't exist in
// this test map). Guildmaster's dialogue line is the original's actual text
// (line ~3757-3767); the shopkeeper's is new flavor text since the original
// shopkeeper NPC has no dialogue field (shopId NPCs skip straight to the
// shop screen on interact, no flavor line).
//
// NEW round 3: 13 more NPCs added below the original 2 -- the 10 new
// characters (one instance each) plus 3 extra placements that deliberately
// reuse an existing base art key's soft variant (npc_farmer_v1,
// guildmaster_v1, shopkeeper_v2) instead of new art, to actually demonstrate
// the "more variety in NPC interaction" ask: the town now has more than one
// farmer-shaped and more than one guildmaster-shaped person in it, and they
// don't look identical. All 15 positions were checked against
// town.js's classifyTile (never on a TILE_STREET tile) and against
// computeBuildingSpots() (kept clear of every building's footprint) before
// being hand-picked -- see the round-3 planning notes. Three clusters:
// a "town square" knot of adventurers near the guild/plaza, a small noble
// enclave near a building on the west side, and a fenced farmstead yard
// (see town.js's buildFenceYard, used by WorldScene._buildFenceYard) placed
// just past the town's east edge -- deliberately outside the dense in-town
// building ring so the fence itself stays visible instead of vanishing
// behind house rooftops (an earlier in-town placement did exactly that; see
// MIGRATION_PLAN.md), which doubles as "the last farmstead before the
// wilderness" flavor-wise.
// v3 (round 4): every offset below is the original round-3 offset * 3, the
// SAME uniform factor town.js's whole layout was rescaled by this round (see
// that file's header comment) -- this keeps every NPC in the same RELATIVE
// spot (town square / noble enclave / farmstead yard) at the new, bigger
// town scale instead of suddenly reading as clustered in a tiny corner of a
// much larger town.
export function buildNpcList(townX, townY) {
  return [
    {
      name: 'Guildmaster Yorin', artKey: 'guildmaster', facing: 'south',
      x: townX - 210, y: townY - 120,
      dialogue: "Welcome to the Adventurers' Guild! Check the quest board for monster bounties — bring back proof of the kill and I'll see you paid.",
      shopId: null,
      // ROUND 19 -- the guildmaster hands a new arrival their first essence.
      // `grantsEssence` is the flag WorldScene._openDialogue looks for; the
      // line is the user's, verbatim, and is shown INSTEAD of the standard
      // greeting on the one visit where the grant happens.
      grantsEssence: true,
      greetingOnGrant: "An outworlder are ya? You look like one of those chumps from Minnesota probably going to need this to survive.",
    },
    // ===================================================================
    // ROUND 78 (bug 1) -- BRAM IS IN THE SHOP NOW.
    //
    // The user: "The smith is standing in the square but should be in the
    // shop." He was, and he was also a SECOND weapon vendor -- Emberhold
    // Smithy has had a working counter inside it since round 22, so the
    // square held a duplicate of a shop twenty paces away, in the open, with
    // no dialogue and no building behind him. A player who found Bram first
    // never had a reason to open the smithy door at all, which is most of the
    // point of having built the room.
    //
    // He moves to the smith's desk by the east wall (see INTERIOR_ROOMS
    // 'blacksmith'), and the counter comes with him: Hessa keeps the forge
    // and gives up the shop, so the smithy has one till rather than two.
    // ===================================================================

    // --- Town square: adventurers milling around near the guild ---
    {
      name: 'Elsie Vantree', artKey: 'npc_cheerful_peasant_girl', facing: 'southwest',
      x: townX + 450, y: townY + 180,
      dialogue: "First bounty of my life is up on that board. Wish me luck — or don't, if you're planning to take it before I do.",
      shopId: null,
    },
    {
      name: 'Dorran Kell', artKey: 'npc_muscular_adventurer', facing: 'southeast',
      x: townX - 450, y: townY + 180,
      dialogue: "Iron rank, three years running. Nothing wrong with taking your time on the way up, whatever the Diamond-ranks say.",
      shopId: null,
    },
    {
      name: 'Old Bracken', artKey: 'npc_grizzled_adventurer', facing: 'north',
      x: townX, y: townY + 450,
      dialogue: "Seen more hunters die from a slime they underestimated than a dragon they respected. Chew on that before your first bounty.",
      shopId: null,
    },
    {
      name: 'Rin Sable', artKey: 'npc_female_adventurer', facing: 'east',
      x: townX - 330, y: townY + 360,
      dialogue: "Panterimp packs have been bolder near the tree line lately. Might be worth a look if the board's light on bounties.",
      shopId: null,
    },

    // --- Noble enclave, west side of town ---
    // ROUND 50 -- Lady Ilsevet is gone. "The model for Lady Ilsevet should be
    // removed, it had no legs." npc_noblewoman is the only roster entry using
    // that art, so pulling her pulls the broken model off the map entirely
    // rather than leaving it to be picked up by some later placement; the
    // enclave still has Priss Meadowlark and Lord Ashford standing in it.
    // ROUND 269 (item 11) -- and now it has neither. "Ashford / Meadowlark
    // relocation -- Inside a mansion." They live in the aristocratic
    // quarter's first two houses; see NAMED_RESIDENTS in mansions.js, which
    // carries their own lines across unchanged.

    // --- Farmstead yard, east side of town, inside the wrought iron fence
    // (see town.js's buildFenceYard / WorldScene._buildFenceYard, also
    // rescaled 3x this round) ---
    {
      name: 'Tam Holloway', artKey: 'npc_farmer', facing: 'south',
      x: townX + 1281, y: townY + 1872,
      dialogue: "Fence keeps the boars off the turnips, mostly. 'Mostly' being the operative word — you should see what a gemtusk does to a fence post.",
      shopId: null,
    },
    {
      name: 'Wick Holloway', artKey: 'npc_farmer_v1', facing: 'west', // soft-variant reuse: Tam's brother, same base art, gently recolored
      x: townX + 1401, y: townY + 1962,
      dialogue: "Tam's the one who talks to every hunter that walks by. I just work the field. Suits me fine.",
      shopId: null,
    },
    {
      name: 'Garrick Dell', artKey: 'npc_peasant_man', facing: 'north',
      x: townX + 1311, y: townY + 1977,
      dialogue: "Rent the Holloways' back field for my goats. Good grazing, good fence — that iron one's new, keeps everything a lot calmer around here.",
      shopId: null,
    },
    {
      name: 'Nessa Vane', artKey: 'npc_cheerful_peasant_girl', facing: 'southwest',
      x: townX + 1431, y: townY + 1857,
      dialogue: "You're a real bounty hunter? I've never talked to one before! Is it true duskfangs count as one bounty even if there's a whole colony?",
      shopId: null,
    },

    // --- Two more ambient townsfolk, reusing existing base art with a soft
    // variant recolor instead of new art -- exactly the "more variety
    // without more art" case the soft-palette system exists for ---
    {
      name: 'Old Rurik', artKey: 'guildmaster_v1', facing: 'south',
      x: townX + 300, y: townY + 390,
      dialogue: "Retired from hunting years back. Still can't walk past that quest board without reading every posting on it, force of habit.",
      shopId: null,
    },
    {
      name: 'Mira the Weaver', artKey: 'shopkeeper_v2', facing: 'north',
      x: townX + 1050, y: townY - 420,
      dialogue: "I'll take cindermaw fur off your hands if you've got any — spins into a surprisingly warm cloth, once you get the smell out.",
      shopId: null,
    },
  ];
}

// ============================================================================
// ROUND 65 -- THE OTHER TOWNS GET PEOPLE.
//
// The user: "generating of the same level of detail present in the first region
// as in the other regions."
//
// Measured, that gap was stark. Cadence has fourteen named townsfolk with
// written dialogue (buildNpcList above). Harrowmoor, Little Gale, Sailmend,
// Cobb Point, Karsk Landing and Vashra had, between all six of them, one
// generated shopkeeper each saying the same sentence.
//
// So: thirty-one named people across the six, placed by an offset from their
// own settlement's centre exactly the way the capital's fourteen are placed off
// townOrigin. Their lines do three jobs at once -- they say where you are, they
// say what that region is like, and (deliberately) they carry the STORY beats
// DESIGN_STORY.md has for that region, which until now existed only in the
// document: the Division gone underground in Ontaria, the portal specialist who
// will not appear below Gold in Elehyd, and Vashra's disappearances and its
// noble houses.
//
// This is rumour, not questline. Nothing here can be accepted, completed or
// failed; it is the world talking about things the player will later be able to
// do something about, which is what makes a questline feel like it was always
// coming rather than switched on.
// ============================================================================

// ART NOTE: `npc_noblewoman` is deliberately absent. Round 50 found that model
// is drawn without legs and asserts, to this day, that nothing in the world
// uses it -- which is exactly the assertion that caught four of these folk on
// their first run. `npc_posh_noble_girl` is the intact noble model.
export const SETTLEMENT_FOLK = {
  // --- Ontaria: the coast, and the Division gone quiet ---------------------
  ont_city: [
    { name: 'Harbourmaster Quenn', art: 'npc_grizzled_adventurer', ox: -120, oy: -40,
      line: "Harrowmoor runs on tides and ledgers. Miss either one and you'll be swimming home." },
    { name: 'Sella Marsh', art: 'npc_posh_noble_girl', ox: 140, oy: -60,
      line: "There was a research house on the hill. Chartered, respectable, gone in a night — and nobody official will say the word 'Division' out loud." },
    { name: 'Cutter Bly', art: 'npc_peasant_man', ox: -60, oy: 130,
      line: "Folk go down to the water at odd hours and come back with nothing wet on them. Draw your own conclusions; I've drawn mine." },
    { name: 'Ledgerman Voss', art: 'npc_noble_standing', ox: 110, oy: 90,
      line: "Everything that leaves this port is written down twice. What worries me is the cargo that's written down neither time." },
    { name: 'Wren Tallowe', art: 'npc_cheerful_peasant_girl', ox: 20, oy: -150,
      line: "My aunt says the sea's been giving things back lately. She says it like it's weather." },
  ],
  ont_west: [
    { name: 'Overseer Halm', art: 'npc_noble_standing', ox: -90, oy: -50,
      line: "Little Gale belongs to the company. The houses, the boats, the dock — and, if you ask the company, the people in them." },
    { name: 'Bette Coldwater', art: 'npc_farmer', ox: 80, oy: 60,
      line: "You're paid in company scrip and you spend it at the company store. It's not slavery. It's just arithmetic that only works one way." },
    { name: 'Nim', art: 'npc_female_adventurer_v1', ox: 0, oy: 120,
      line: "I'm saving to leave. I've been saving to leave for four years. Ask me again next year." },
  ],
  ont_village_a: [
    { name: 'Sailmaker Oduin', art: 'npc_peasant_man', ox: -70, oy: 40,
      line: "Sailmend mends sails. It's not a clever name and we're not a clever village, and both of those have kept us alive." },
    { name: 'Goodwife Prell', art: 'npc_cheerful_peasant_girl', ox: 60, oy: -50,
      line: "The board's over there and the tea's over here. Do the board first, you'll want the tea after." },
    { name: 'Old Sten', art: 'npc_grizzled_adventurer', ox: 40, oy: 110,
      line: "Forty years on that water. The only thing I ever saw out there that frightened me was a boat with nobody rowing it." },
  ],
  ont_village_b: [
    { name: 'Reeve Marchand', art: 'npc_noble_standing', ox: -80, oy: -30,
      line: "Cobb Point is three families and a jetty. We settle our own arguments and we'd thank the capital to keep settling its own." },
    { name: 'Tessa Rooke', art: 'npc_female_adventurer', ox: 70, oy: 70,
      line: "There's a cave down the coast the tide only opens twice a month. I've never gone in. I've thought about it every day for a year." },
    { name: 'Little Pol', art: 'npc_cheerful_peasant_girl', ox: -20, oy: 120,
      line: "Da says not to talk to adventurers. Da also says not to talk to strangers, and you're both, so I'm being very brave." },
  ],
  // --- Elehyd: the badlands, and the way out that will not open ------------
  ele_city: [
    { name: 'Portmaster Krevic', art: 'npc_grizzled_adventurer', ox: -110, oy: -50,
      line: "Karsk Landing is the last place with walls. West of here the road gives up and so does everything else." },
    { name: 'Sable Ashgrave', art: 'npc_posh_noble_girl', ox: 120, oy: -40,
      line: "A man came through asking after portal work. He said he'd be back when someone here was worth opening a door for. He has not been back." },
    { name: 'Digger Naess', art: 'npc_farmer', ox: -50, oy: 110,
      line: "Nothing rots in this ground. We bury them deep and we bury them with iron, and we still check the cairns every spring." },
    { name: 'Coldwright Ilm', art: 'npc_peasant_man', ox: 90, oy: 80,
      line: "The peaks north have ice that never runs. Whatever's up there drinking it, I'd rather not meet." },
    { name: 'Vane the Quiet', art: 'npc_muscular_adventurer', ox: 10, oy: -140,
      line: "..." },
  ],
  // --- Bratugal: the king's city, and what it has stopped noticing ---------
  bra_city: [
    { name: 'Chamberlain Ossa', art: 'npc_posh_noble_girl', ox: -130, oy: -60,
      line: "Vashra is the finest city in the world and I am required to say so. Take the second half of that sentence as seriously as the first." },
    { name: 'House Steward Bellic', art: 'npc_noble_standing', ox: 140, oy: -50,
      line: "Nine noble houses sit the council. A king sits above it. Councils have been known to reconsider such arrangements." },
    { name: 'Tally Shore', art: 'npc_cheerful_peasant_girl', ox: -60, oy: 140,
      line: "Three off our street this season. The watch writes it down and the writing is the whole of what they do." },
    { name: 'Physician Aur', art: 'npc_female_adventurer', ox: 100, oy: 110,
      line: "They come in ill and they leave — that is what the ledger says. I have stopped being able to say where they leave to." },
    { name: 'Fenmarcher Dol', art: 'npc_grizzled_adventurer', ox: 0, oy: -160,
      line: "West is swamp, and past the swamp is more swamp, and past that somebody has built something they did not want seen." },
    { name: 'Gilt Marren', art: 'npc_posh_noble_girl', ox: -140, oy: 90,
      line: "Everyone worth knowing is at court. Everyone worth watching is not." },
  ],

  // ==========================================================================
  // ROUND 178 -- THE FOURTEEN SETTLEMENTS WITH NOBODY IN THEM.
  //
  // Round 65 gave named people to six settlements and fixed the gap it had
  // measured. It did not measure the other fifteen. Counted this round:
  //
  //   settlements in the world ....................... 22
  //   with authored folk ............................. 6   (round 65)
  //   Cadence, whose fourteen come from buildNpcList .. 1
  //   with NOBODY ..................................... 15
  //
  // and of those fifteen, TEN are the three regions the surge has never
  // spoken to -- Sirukh Sands, the Cinderwaste and Ixcuatl, which between
  // them did not hold a single named person. Three whole countries in which
  // every human being said the one generated shopkeeper's sentence.
  //
  // Fourteen are populated below. THE FIFTEENTH IS DELIBERATE: the Stepped
  // City is `kind: 'ruin'` and its region's own blurb says nobody has lived
  // there in a long time, so putting three people in it to make a number
  // even would contradict the map. Its emptiness is asserted rather than
  // left to be read as an oversight -- see settlementFolkFaults below.
  //
  // Same rules as round 65: rumour, not questline; placed by an offset from
  // their own settlement's centre; and the lines carry that region's story
  // beat rather than describing the scenery the player is already standing
  // in. AND, new this round, they are inside the round-171 slop gate, which
  // had never been pointed at this file -- the largest pool of authored
  // prose in the game was the one pool nothing measured.
  // ==========================================================================

  // --- The Nek: the two hamlets the capital does not think about -----------
  nek_hamlet_1: [
    { name: 'Aldis Roke', art: 'npc_farmer', ox: -70, oy: 60,
      line: "Cadence is two days that way and it might as well be two countries. They send us tax collectors and weather warnings. We'd prefer the weather." },
    { name: 'Nan Pell', art: 'npc_cheerful_peasant_girl', ox: 80, oy: -40,
      line: "Riders came through asking how many of us there are. Not who. How many." },
    { name: 'Brant Ashcombe', art: 'npc_peasant_man', ox: 10, oy: 130,
      line: "I've walked these fields thirty years. Last spring something walked them beside me for half a mile and I never saw it." },
  ],
  nek_hamlet_2: [
    { name: 'Crossward Tibb', art: 'npc_townsman', ox: -90, oy: -50,
      line: "Four roads meet here, so we hear everything twice and believe it once." },
    { name: 'Maren Ost', art: 'npc_female_adventurer', ox: 100, oy: 70,
      line: "Adventurers come through on their way to somewhere better. You can tell the ones who'll come back — they ask about the water." },
    { name: 'Old Sarrow', art: 'npc_grizzled_adventurer', ox: -20, oy: 140,
      line: "The fen takes a person about every other year. It's taken three since midsummer." },
  ],

  // --- Elehyd: hard ground, and what the ground will not do ----------------
  ele_hamlet_1: [
    { name: 'Hettie Varn', art: 'npc_peasant_man', ox: -100, oy: 50,
      line: "Coldharrow has one warm month and we spend it getting ready for the other eleven." },
    { name: 'Stonecutter Uld', art: 'npc_muscular_adventurer', ox: 90, oy: -60,
      line: "Everything here is built out of what's already here. There's no forest to argue with." },
    { name: 'Pella Dunn', art: 'npc_posh_noble_girl_v2', ox: 0, oy: 130,
      line: "There's a road to the peaks. It's a good road. Nobody uses it and nobody will tell me why." },
  ],
  ele_hamlet_2: [
    { name: 'Cairnwarden Bes', art: 'npc_priest_old', ox: -80, oy: -70,
      line: "I walk the markers on the first of every month and I count them. The number has been right for eleven years and I have not stopped counting." },
    { name: 'Tolm Greave', art: 'npc_farmer', ox: 110, oy: 40,
      line: "Karsk Landing buries with iron. We do too. You'll notice nobody down there calls it superstition." },
    { name: 'Wick', art: 'npc_cheerful_peasant_girl', ox: -10, oy: 120,
      line: "My brother says the cairns move. My brother says a lot of things, but he's stopped saying that one where our mother can hear." },
  ],

  // --- Bratugal: the swamp, and the city that stopped noticing it ----------
  bra_hamlet_1: [
    { name: 'Stiltwright Oma', art: 'npc_farmer', ox: -90, oy: 60,
      line: "Everything stands on legs here. When the water comes up, the house is fine and the garden is gone." },
    { name: 'Jessa Reed', art: 'npc_cheerful_peasant_girl_v2', ox: 100, oy: -50,
      line: "Vashra takes what we send and sends back nothing. That's not a complaint, it's a schedule." },
    { name: 'Old Duhn', art: 'npc_peasant_man', ox: 20, oy: 130,
      line: "Two of ours went to the city for work this season. We've had no letter. Nobody in a swamp expects a letter, but you'd like one." },
  ],
  bra_hamlet_2: [
    { name: 'Thorn-cutter Vell', art: 'npc_muscular_adventurer', ox: -100, oy: -40,
      line: "The path closes behind you at about the rate you cut it. Sleep in the middle and you wake up somewhere with no way out." },
    { name: 'Sister Ipp', art: 'npc_priest_f', ox: 90, oy: 80,
      line: "People walk into the green and don't walk out. The city calls that the jungle. We've started calling it something else." },
    { name: 'Harl Bittersedge', art: 'npc_grizzled_adventurer', ox: 0, oy: -140,
      line: "I hunted this forest for twenty years. There's a stretch east I won't take money to enter now." },
  ],

  // --- Sirukh Sands: salt, reef and what the water gives back --------------
  sir_town: [
    { name: 'Reefpilot Oja', art: 'npc_female_adventurer', ox: -130, oy: -50,
      line: "Nobody sails into Tolbrand Quay without a pilot. The reef's marked on every chart and the charts are all wrong by about a boat's width." },
    { name: 'Salter Gaunt', art: 'npc_peasant_man', ox: 120, oy: -60,
      line: "Salt out, everything else in. The whole island eats because a flat white field does nothing for nine months and then pays for a year." },
    { name: 'Wreckwarden Ibbs', art: 'npc_grizzled_adventurer', ox: -60, oy: 130,
      line: "Four hulls on the reef this year and two of them were empty when they struck. Empty ships don't steer themselves onto rock." },
    { name: 'Mira Tolbrand', art: 'npc_posh_noble_girl', ox: 110, oy: 100,
      line: "My family's name is on the quay, the warehouse and the debt. Ask which of the three is largest." },
  ],
  sir_village: [
    { name: 'Panwalker Hess', art: 'npc_farmer', ox: -90, oy: 50,
      line: "You rake the pan at dawn and at dusk. In between you stay off it, unless you'd like to learn what the sun does to a person out here." },
    { name: 'Yura Sabel', art: 'npc_cheerful_peasant_girl', ox: 100, oy: -40,
      line: "There's a gate in the salt with no wall on either side of it. It was here before the village. We just built up to it." },
    { name: 'Toll-taker Ansh', art: 'npc_townsman', ox: 10, oy: 130,
      line: "Everything crossing the pan pays here. Everything crossing at night doesn't, and I've stopped going out to ask why." },
  ],
  sir_hamlet: [
    { name: 'Dunn Marek', art: 'npc_peasant_man', ox: -80, oy: -60,
      line: "The dunes move about a house-length a year. We've rebuilt Dunmouth twice in my lifetime, a little further back each time." },
    { name: 'Hafsa Quill', art: 'npc_female_adventurer_v2', ox: 90, oy: 60,
      line: "Things surface when the sand shifts. Old things, and once something that was not old at all." },
    { name: 'Well-keeper Otta', art: 'npc_priest_f', ox: 0, oy: 130,
      line: "One well, and I hold the key to it. That's not power. It's just the least popular job on the island." },
  ],

  // --- The Cinderwaste: people who work heat, and the rock that runs -------
  cin_camp: [
    { name: 'Stationmaster Gorr', art: 'npc_townsman', ox: -100, oy: -50,
      line: "Eleven of us live at Ashfall and every one came here to get indoors. There's nothing else to come for." },
    { name: 'Cinder Ivet', art: 'npc_female_adventurer', ox: 110, oy: 40,
      line: "Watch the ground, not the horizon. The flows crust over black and the crust holds for exactly as long as it holds." },
    { name: 'Hobb Kettleman', art: 'npc_peasant_man', ox: 0, oy: 130,
      line: "Everything up from Elehyd comes through here because there's no other way through. Everything going back has fewer people on it than it did." },
  ],
  cin_slag: [
    { name: 'Slagmaster Deyne', art: 'npc_muscular_adventurer', ox: -90, oy: 60,
      line: "We pour off what the rock doesn't want and sell the rest. Elehyd calls it filthy work and Elehyd buys every bar of it." },
    { name: 'Rell Ashgood', art: 'npc_grizzled_adventurer', ox: 100, oy: -50,
      line: "I've fished a man out of a channel. I'd rather talk about almost anything else, so I'll say this once — don't test a crust because it looks cold." },
    { name: 'Tamsin Ore', art: 'npc_cheerful_peasant_girl', ox: 10, oy: 130,
      line: "Born here, which surprises people. They expect the Cinderwaste to be somewhere you get sent." },
  ],
  cin_relay: [
    { name: 'Kilnwarden Sooth', art: 'npc_peasant_man', ox: -80, oy: -60,
      line: "The kilns never go out. Relighting one costs a week, and we've never once had a week to spare." },
    { name: 'Post-rider Enna', art: 'npc_cheerful_peasant_girl_v1', ox: 90, oy: 50,
      line: "I ride Kiln Halt to Ashfall and back. Six hours, and about four of them are deciding where to put my feet." },
    { name: 'Vart', art: 'npc_bearded_adventurer', ox: 0, oy: 130,
      line: "Something's been taking heat out of the flows south of here. Rock that ran last year sits cold and nobody's pleased about it." },
  ],

  // --- Ixcuatl: an expedition, not a country ------------------------------
  ixc_camp: [
    { name: 'Expedition Lead Caro', art: 'npc_mage', ox: -110, oy: -50,
      line: "Lastlight Camp is the last place with a name that somebody alive gave it. Everything past this is named by the people who left." },
    { name: 'Quartermaster Ebb', art: 'npc_townsman', ox: 120, oy: 40,
      line: "I count the party out in the morning and in at night. The evening count is the one I do twice." },
    { name: 'Dig-hand Solla', art: 'npc_posh_noble_girl_v1', ox: 0, oy: 130,
      line: "Everyone here's paid by the season and nobody talks about what they'll do after. You notice that once and then you can't stop noticing it." },
  ],
  ixc_dig: [
    { name: 'Trenchmaster Kollo', art: 'npc_muscular_adventurer', ox: -90, oy: 60,
      line: "The Cut goes down through nine layers of city. Nine. Somebody built here, and somebody built on top of them, and so on, nine times." },
    { name: 'Scholar Teyn', art: 'npc_mage', ox: 100, oy: -50,
      line: "Every layer has the same street plan. Nobody copies a plan for nine generations unless they were told to." },
    { name: 'Vasso', art: 'npc_grizzled_adventurer', ox: 10, oy: 130,
      line: "I'm hired to stand at the top of the trench facing outward. I've never once been told what I'm facing." },
  ],
  ixc_post: [
    { name: 'Posthand Merrow', art: 'npc_peasant_man', ox: -80, oy: -60,
      line: "Kepen Rest is a roof and a fire, four days from anywhere. People arrive here talking and leave here quiet." },
    { name: 'Sister Anneth', art: 'npc_priest_f', ox: 90, oy: 50,
      line: "I came to bury whoever needed it. I've buried two in a year and turned away nine who wanted to go further in." },
    { name: 'Bern Hathaway', art: 'npc_bearded_adventurer', ox: 0, oy: 130,
      line: "You'll hear the Stepped City's got gold in it. It's got stairs in it. I've been as far as the stairs." },
  ],
};

/** Every settlement id that has authored folk. */
export const FOLK_SETTLEMENTS = Object.keys(SETTLEMENT_FOLK);

/**
 * ROUND 178 -- THE SETTLEMENT THAT IS MEANT TO BE EMPTY.
 *
 * Fourteen of the fifteen silent settlements were populated this round. The
 * Stepped City was not, on purpose, and an intentional absence that nothing
 * states is indistinguishable from the oversight it replaced -- which is the
 * exact fault this round spent its other half removing. So it is named here,
 * and `settlementFolkFaults` asserts BOTH directions: everything else has
 * people, and this one does not.
 */
export const DELIBERATELY_UNPEOPLED = ['ixc_ruin'];

/** Round 65 gave Karsk Landing a character whose whole joke is that he does
 *  not speak. A length rule that cannot tell him from an unwritten line would
 *  have to be loosened for everyone; he is named instead. */
export const WORDLESS_FOLK = ['ele_city/Vane the Quiet'];

/**
 * ROUND 178 -- faults a suite can assert without booting the game.
 *
 * Takes the region table rather than importing it, because regions.js already
 * imports from here and a cycle between the two would be paid for at load.
 */
export function settlementFolkFaults(regions) {
  const out = [];
  const seen = new Set();
  const unpeopled = new Set(DELIBERATELY_UNPEOPLED);
  for (const r of (regions || [])) {
    for (const st of (r.settlements || [])) {
      const id = st.id;
      seen.add(id);
      const folk = SETTLEMENT_FOLK[id];
      // Cadence is the one settlement whose people come from buildNpcList
      // instead, so it is not expected here and must not be counted as a hole.
      if (id === 'nek_city') {
        if (folk) out.push(`${id} has SETTLEMENT_FOLK as well as buildNpcList`);
        continue;
      }
      if (unpeopled.has(id)) {
        if (folk && folk.length) out.push(`${id} is declared unpeopled and has ${folk.length} folk`);
        continue;
      }
      if (!folk || !folk.length) out.push(`${id} (${st.name}) has nobody in it`);
    }
  }
  for (const id of Object.keys(SETTLEMENT_FOLK)) {
    if (!seen.has(id)) out.push(`${id} has folk but is in no region`);
  }
  for (const id of DELIBERATELY_UNPEOPLED) {
    if (!seen.has(id)) out.push(`${id} is declared unpeopled and is not a settlement`);
  }
  for (const [id, pool] of Object.entries(SETTLEMENT_FOLK)) {
    const names = new Set();
    for (const f of pool) {
      if (!f.name) out.push(`${id}: a folk has no name`);
      if (names.has(f.name)) out.push(`${id}: two people called ${f.name}`);
      names.add(f.name);
      // An unknown art key is drawn as nothing at all -- _stageSettlementFolk
      // `continue`s past it, so the person simply is not there and no error is
      // raised. Round 50's legless model is banned by name for the same reason
      // it is banned everywhere else.
      if (!NPC_ART[f.art]) out.push(`${id}/${f.name}: unknown art '${f.art}'`);
      if (f.art === 'npc_noblewoman') out.push(`${id}/${f.name}: uses the legless model`);
      if (f.art === 'npc_adventurous_girl') out.push(`${id}/${f.name}: uses Aedia's model`);
      const wordless = WORDLESS_FOLK.includes(`${id}/${f.name}`);
      if (!f.line) out.push(`${id}/${f.name}: no line at all`);
      else if (!wordless && f.line.length < 20) out.push(`${id}/${f.name}: no line worth reading`);
      else if (wordless && f.line.length >= 20) out.push(`${id}/${f.name}: declared wordless and talks`);
      if (!Number.isFinite(f.ox) || !Number.isFinite(f.oy)) out.push(`${id}/${f.name}: no offset`);
    }
  }
  return out;
}

/** How many named people the world's settlements carry, for the suite: a
 *  count that quietly returns to Cadence-only is the failure this exists to
 *  prevent. */
export function folkCount() {
  return Object.values(SETTLEMENT_FOLK).reduce((n, l) => n + l.length, 0);
}
