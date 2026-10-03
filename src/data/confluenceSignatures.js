// ===========================================================================
// ROUND 55 -- THE TWENTY MARQUEE CONFLUENCES.
//
// The user picked the split: "20 Marquee authored, rest derived". These are the
// twenty. The other eighty-one derive from the trio's spine plus their concept
// vocabulary (confluenceConcepts.js), which the user reviewed and approved.
//
// The specification is their own Dragon list, which is worth restating because
// every set below is built to the same standard:
//
//   "A breath attack like a dragon
//    A storm of fireballs shooting 3 fireballs in seperate directions
//    Dragon scales to reduce damage taken or resist fire
//    Dragon fire passive that buffs all fire into dragonfire which can't be
//    resisted."
//
// Three of those four had no template in the game. `breathCone`, `volley` and
// `elementPierce` were added this round for them, and once they existed the
// other nineteen confluences had shapes worth having too -- a Hydra that
// regrows, a Kraken that drags, a Fortress that will not move.
//
// DESCRIPTIONS ARE MECHANICAL. The user's rule, from the wording pass:
// "The name has flavor but mechanically the ability just channels the name into
// an effect. It doesnt say 'Relentless Assualt: The power of a might charge
// repeated strikes with repeating power of might'. It says 'Each use of this
// attack in quick succession increases the damage of this attack...'" So the
// names below carry the myth and the descriptions say what happens.
//
// A marquee signature is a NAME and a CATEGORY, not a fixed set of numbers.
// The numbers still come from the essence's rank, the stone in the socket and
// the build's spine, so a Dragon assembled by three burst essences and one
// assembled by three menders both get Dragonbreath and it is a different
// ability in each. Authoring the mechanic outright would have thrown that away.
// ===========================================================================

export const CONFLUENCE_SIGNATURES = {
  Dragon: [
    { name: 'Dragonbreath', catKey: 'ranged_cone',
      desc: 'Breathes a wide cone of fire, burning everything caught in front of you.' },
    { name: 'Firestorm', catKey: 'ranged_volley',
      desc: 'Looses several fireballs at once, spread apart so they cover the ground ahead.' },
    { name: 'Dragon Scales', catKey: 'self_active_armor',
      desc: 'Plates of scale close over you, blunting every blow and turning aside fire.' },
    { name: 'Dragonfire', catKey: 'passive_element_pierce',
      desc: 'Your fire becomes dragonfire, and nothing resists it.' },
    { name: 'Hoardclaw', catKey: 'summon_weapon',
      desc: 'Conjures a taloned blade. Every strike with it leaves a burn in the wound.' },
  ],
  Phoenix: [
    { name: 'Immolation', catKey: 'self_active_aoe',
      desc: 'Burns outward from where you stand, catching everything within reach.' },
    { name: 'From the Ash', catKey: 'fate_reroll',
      desc: 'The fire that finishes you starts you again. A killing blow is refused and you rise where you fell.' },
    { name: 'Kindled Plume', catKey: 'self_passive_aoe',
      desc: 'A standing field of fire that burns whatever comes close to you.' },
    { name: 'Rebirth', catKey: 'self_active_hot',
      desc: 'Restores health steadily, and keeps restoring it after the fight has moved on.' },
    { name: 'Emberflight', catKey: 'movement_dash',
      desc: 'A burst of movement that leaves fire in the space you crossed.' },
  ],
  Hydra: [
    { name: 'Manystrike', catKey: 'ranged_volley',
      desc: 'Several heads strike at once, each at a different enemy.' },
    { name: 'Regrowth', catKey: 'triggered_regen_on_hit',
      desc: 'Cut a head away and two grow back. Being wounded by anything but fire starts the wound closing.' },
    { name: 'Venomjaw', catKey: 'ranged_dot',
      desc: 'A bite that carries venom, poisoning the target well after the jaw has let go.' },
    { name: 'Second Head', catKey: 'summon_bonded',
      desc: 'A second head grows and fights alongside you, striking on its own.' },
    { name: 'Undiminished', catKey: 'self_active_hot',
      desc: 'Cutting a piece away has never made there be less of you. Restores health over several seconds.' },
  ],
  Volcano: [
    { name: 'Eruption', catKey: 'self_active_aoe',
      desc: 'The ground opens around you, dealing heavy damage to everything nearby.' },
    { name: 'Magma Flow', catKey: 'aoe_dot_ring',
      desc: 'Lays a ring of molten ground that keeps burning whatever stands in it.' },
    { name: 'Ashfall', catKey: 'aoe_weaken',
      desc: 'Ash covers the field, stripping armour and slowing everything caught under it.' },
    { name: 'Pyroclast', catKey: 'ranged_cone',
      desc: 'A cone of superheated ash and stone, hurled forward across everything ahead.' },
    { name: 'Crust', catKey: 'self_active_armor',
      desc: 'Cooled rock closes over you and blunts every blow taken.' },
  ],
  Kraken: [
    { name: 'Drag Under', catKey: 'aoe_weaken',
      desc: 'Tentacles take hold of everything nearby, slowing it and tearing at its armour.' },
    { name: 'Constrict', catKey: 'martial_sunder',
      desc: 'A crushing hold that breaks armour and leaves the target easier to wound.' },
    { name: 'Ink', catKey: 'stealth_veil',
      desc: 'A cloud of ink hides you. Enemies lose track of you until you attack.' },
    { name: 'Abyssal Reach', catKey: 'martial_distance',
      desc: 'A limb that strikes far further than anything your size should reach.' },
    { name: 'Deep Hold', catKey: 'summon_bonded',
      desc: 'A tentacle rises beside you and strikes whatever comes near.' },
  ],
  Leviathan: [
    { name: 'Sounding', catKey: 'self_active_aoe',
      desc: 'A displacement of water that strikes everything around you at once.' },
    { name: 'Breach', catKey: 'movement_dash',
      desc: 'A surge forward that carries you through whatever is in the way.' },
    { name: 'Hull-Thick Hide', catKey: 'self_active_armor',
      desc: 'Hide as thick as a hull. Every blow taken is blunted while it holds.' },
    { name: 'Deepdrag', catKey: 'self_passive_slow_aura',
      desc: 'The water around you drags. Enemies nearby move as though wading.' },
    { name: 'Swallow Whole', catKey: 'martial_reaper',
      desc: 'A finishing blow against a wounded enemy, hitting far harder the closer they are to death.' },
  ],
  Thunderbird: [
    { name: 'Thunderclap', catKey: 'self_active_aoe',
      desc: 'A peal of thunder that strikes everything around you.' },
    { name: 'Stormcall', catKey: 'ranged_volley',
      desc: 'Several bolts of lightning fall at once, spread across the ground ahead.' },
    { name: 'Riding the Front', catKey: 'movement_haste_active',
      desc: 'The storm carries you. Your movement speed climbs sharply for a while.' },
    { name: 'Stormfeather', catKey: 'passive_element_pierce',
      desc: 'Your lightning cannot be resisted.' },
    { name: 'Rainshadow', catKey: 'self_passive_aoe',
      desc: 'A standing field of falling charge that shocks whatever stands near you.' },
  ],
  Griffin: [
    { name: 'Stoop', catKey: 'movement_dash',
      desc: 'A diving rush that closes the distance faster than anything can answer.' },
    { name: 'Rend', catKey: 'martial_sunder',
      desc: 'Fore-talons that open armour and leave the wound exposed.' },
    { name: 'Keen Eye', catKey: 'perception',
      desc: 'The hunting bird’s sight. You see further and read what you are looking at.' },
    { name: 'Barred Wing', catKey: 'self_active_absorb',
      desc: 'A wing raised across you, absorbing damage until it is beaten down.' },
    { name: 'Sovereign of the Air', catKey: 'attr_boost',
      desc: 'The air holds you the way ground holds other people, and the bond deepens at every rank.' },
  ],
  Gorgon: [
    { name: 'Stone Gaze', catKey: 'self_active_timefreeze',
      desc: 'Everything that meets your eye is held motionless for a few seconds.' },
    { name: 'Serpent Crown', catKey: 'ranged_dot',
      desc: 'A snake strikes from your hair, leaving venom that works long after the bite.' },
    { name: 'Petrifying Stare', catKey: 'aoe_weaken',
      desc: 'Enemies nearby stiffen: slower, and far easier to wound.' },
    { name: 'Unblinking', catKey: 'self_active_crit',
      desc: 'You do not look away. Your critical hit chance rises sharply for a while.' },
    { name: 'Coil', catKey: 'martial_distance',
      desc: 'A coiled strike that reaches much further than it appears to.' },
  ],
  Manticore: [
    { name: 'Quill Volley', catKey: 'ranged_volley',
      desc: 'Looses a spread of barbed quills from the tail, several at once.' },
    { name: 'Barbed Tail', catKey: 'ranged_dot',
      desc: 'A barb that lodges and keeps working, poisoning long after it lands.' },
    { name: 'Spine and Jaw', catKey: 'martial_reaper',
      desc: 'A finishing blow that hits far harder the more wounded the target already is.' },
    { name: 'Man-Faced Terror', catKey: 'taunt_pull',
      desc: 'Every enemy nearby turns to face you and comes for you instead.' },
    { name: 'Lion Shoulder', catKey: 'self_active_damage',
      desc: 'Sets the whole weight of the body behind every blow for a while.' },
  ],
  Minotaur: [
    { name: 'Gore', catKey: 'martial_sunder',
      desc: 'A lowered horn that breaks armour open and leaves the wound exposed.' },
    { name: 'Charge', catKey: 'movement_dash',
      desc: 'A headlong rush that carries you through whatever stands in the way.' },
    { name: 'Labyrinth', catKey: 'self_passive_slow_aura',
      desc: 'The ground around you becomes a maze. Enemies nearby cannot move at speed.' },
    { name: 'Bellow', catKey: 'taunt_pull',
      desc: 'A roar that pulls every nearby enemy onto you and off everyone behind you.' },
    { name: 'Bull Hide', catKey: 'self_active_armor',
      desc: 'Hide thickens across you, blunting every blow while it holds.' },
  ],
  Behemoth: [
    { name: 'Underfoot', catKey: 'self_active_aoe',
      desc: 'Everything around you is struck as your weight comes down.' },
    { name: 'Immovable', catKey: 'self_active_immunity',
      desc: 'For a few seconds nothing can bring you below one health.' },
    { name: 'Hillside Hide', catKey: 'self_active_armor',
      desc: 'Hide like a hillside. Every blow taken is blunted while it holds.' },
    { name: 'Bulk', catKey: 'attr_boost',
      desc: 'You take up more room than you did, and go on taking up more at every rank.' },
    { name: 'Shoulder Through', catKey: 'martial_distance',
      desc: 'A shoulder with more reach than arm, and the weight behind it to use it.' },
  ],
  Juggernaut: [
    { name: 'Gathering Weight', catKey: 'self_active_damage',
      desc: 'Once started, you do not slow. Your damage climbs sharply for a while.' },
    { name: 'Grind Down', catKey: 'martial_sunder',
      desc: 'A rolling blow that breaks armour and leaves it broken.' },
    { name: 'Unstoppable', catKey: 'self_active_immunity',
      desc: 'Stopping you becomes a separate problem. For a few seconds nothing can put you below one health.' },
    { name: 'Flatten', catKey: 'ranged_cone',
      desc: 'Everything in a wide swathe ahead of you is struck at once.' },
    { name: 'Crushed Track', catKey: 'self_passive_slow_aura',
      desc: 'The ground you have crossed is ruined. Enemies near you move slower for it.' },
  ],
  Fortress: [
    { name: 'Curtain Wall', catKey: 'self_active_absorb',
      desc: 'A wall of stone rises across you and absorbs damage until it is broken down.' },
    { name: 'Arrow Slit', catKey: 'thorns_active',
      desc: 'Whatever strikes the wall is answered through it. A share of damage taken is returned.' },
    { name: 'Garrison', catKey: 'summon_bonded',
      desc: 'A defender takes up position beside you and strikes what comes near.' },
    { name: 'Shut the Gate', catKey: 'taunt_pull',
      desc: 'Every nearby enemy is drawn onto you and away from everyone behind you.' },
    { name: 'Unbreached', catKey: 'self_active_armor',
      desc: 'Stone closes over you, blunting every blow while it holds.' },
  ],
  Undeath: [
    { name: 'Cold Hand', catKey: 'ranged_leech',
      desc: 'A grasping bolt that takes a share of the damage it deals and returns it to you as health.' },
    { name: 'Refuse the Grave', catKey: 'fate_reroll',
      desc: 'A killing blow taken is refused outright, and you are left standing.' },
    { name: 'Grave Chill', catKey: 'aoe_dot_ring',
      desc: 'A ring of grave-cold that keeps rotting whatever stands in it.' },
    { name: 'Risen', catKey: 'summon_bonded',
      desc: 'Something that should be still gets up and fights beside you.' },
    { name: 'Unquiet Flesh', catKey: 'triggered_regen_on_hit',
      desc: 'A body that was told to stop and did not. Taking a wound from anything but fire starts it mending.' },
  ],
  Doom: [
    { name: 'Appointed Hour', catKey: 'ranged_damage',
      desc: 'A sentence passed on one enemy. It resolves later, and reads the state they are in when it does.' },
    { name: 'Tolling', catKey: 'aoe_weaken',
      desc: 'A bell only they can hear. Enemies nearby are slowed and their armour fails.' },
    { name: 'Numbered Days', catKey: 'ranged_dot',
      desc: 'A mark that keeps working, taking more with every count.' },
    { name: 'Sealed Name', catKey: 'martial_reaper',
      desc: 'A finishing blow that hits far harder the closer the target is to the end.' },
    { name: 'Certainty', catKey: 'passive_conditional',
      desc: 'A knack that pays off under one circumstance, and pays off completely.' },
  ],
  Troll: [
    { name: 'Knitting Flesh', catKey: 'triggered_regen_on_hit',
      desc: 'Being wounded starts the wound closing again — unless the wound was made by fire.' },
    { name: 'Long Arm', catKey: 'martial_distance',
      desc: 'A reach far longer than it looks, and heavier at the end of it.' },
    { name: 'Thick Hide', catKey: 'self_active_armor',
      desc: 'Hide too coarse to cut cleanly. Every blow taken lands blunted while it holds.' },
    { name: 'Regrown', catKey: 'self_active_hot',
      desc: 'Restores health steadily over several seconds, and does not stop early.' },
    { name: 'Club', catKey: 'martial_sunder',
      desc: 'A heavy swing that breaks armour open and leaves the wound exposed.' },
  ],
  Chimera: [
    { name: 'Third Throat', catKey: 'ranged_cone',
      desc: 'A borrowed head breathes a cone of harm across everything ahead of you.' },
    { name: 'Grafted Hide', catKey: 'self_active_armor',
      desc: 'Mismatched hide closes over you and blunts every blow taken.' },
    { name: 'Wrong Limb', catKey: 'martial_distance',
      desc: 'A limb that does not belong to you strikes from outside your own reach.' },
    { name: 'Many-Natured', catKey: 'attr_boost',
      desc: 'Three natures pulling one way for once. The bond deepens at every rank.' },
    { name: 'Borrowed Head', catKey: 'summon_bonded',
      desc: 'One of your other heads detaches and fights beside you.' },
  ],
  Swarm: [
    { name: 'Boil Out', catKey: 'ranged_volley',
      desc: 'The swarm splits and goes several ways at once, each part striking on its own.' },
    { name: 'Cover Them', catKey: 'aoe_dot_ring',
      desc: 'A crawling ring that keeps stripping whatever stands in it.' },
    { name: 'Strip to the Bone', catKey: 'martial_reaper',
      desc: 'The swarm settles on what is already failing, and very little of it comes back up.' },
    { name: 'Numberless', catKey: 'summon_bonded',
      desc: 'Part of the swarm splits off and fights beside you.' },
    { name: 'Single Mind', catKey: 'self_passive_aoe',
      desc: 'A standing cloud around you that keeps biting whatever comes close.' },
  ],
  Wendigo: [
    { name: 'Famine', catKey: 'ranged_leech',
      desc: 'A hungering bolt that takes a share of the damage it deals and returns it to you as health.' },
    { name: 'Rime Mouth', catKey: 'ranged_dot',
      desc: 'A bite of frost that keeps working long after the cold has touched.' },
    { name: 'Long Stride', catKey: 'movement_passive',
      desc: 'Your movement speed is permanently increased.' },
    { name: 'Never Full', catKey: 'triggered_crit_empower',
      desc: 'A critical hit feeds the hunger, and the next blow lands harder for it.' },
    { name: 'Starved Shape', catKey: 'stealth_veil',
      desc: 'You thin to almost nothing. Enemies notice you far later, and the veil breaks when you attack.' },
  ],
};

/** The marquee names, for the tests and the review export. */
export const MARQUEE_CONFLUENCES = Object.keys(CONFLUENCE_SIGNATURES);

/** Signatures for a confluence def, or an empty list for the derived eighty-one. */
export function confluenceSignaturesFor(name) {
  return CONFLUENCE_SIGNATURES[name] || [];
}
