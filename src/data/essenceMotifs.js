// ROUND 48 -- ONE MOTIF PER ESSENCE.
//
// The user's ask, verbatim:
//
//   "Essences in particular are not seeming to pull enough weight in
//    determining how an awakening stone effects the output. An awakening stone
//    of fire in an ape essence shouldn't be a simple 'gain 15% crit chance' or
//    'throw a fireball' but should take a look at the intersection between the
//    two with more weight on the essence itself."
//
// See essenceLevers.js for the split this encodes: the ESSENCE supplies the
// mechanical LEVER and the body it acts on, the STONE supplies the material.
// Their Ape x Fire examples are the specification -- "thick fur" is
// ward + fire, "ape arms" is reach, "ape make fire" is chain + fire, and
// "apes together strong" is allies + fire.
//
// Every essence in the catalog is authored individually rather than inheriting
// a family default. That was a deliberate call by the user, and it is what
// stops Ape and Bear -- both 'beast' -- producing the same abilities. Checked:
// all 26 multi-essence families have internally distinct lever sets.
//
// FIELDS
//   levers  2-4 keys from LEVERS, most characteristic first. This decides what
//           KIND of mechanic the essence produces.
//   parts   concrete nouns the essence gives a character; these become names.
//   verbs   present-tense actions, for attack names.
//   adjs    modifiers.
//   body    one clause: what bonding this essence does to a body.
//
// Seven entries -- Potent, Elemental, Vast, Serene, Harmonic, Gathering and
// Myriad -- are the user's own definitions, written by them after reviewing
// the drafts, and should not be second-guessed.
//
// ROUND 49 -- the `taunt` lever ("Drawing monsters to the tank and away from
// the team") is on ELEVEN essences and no more, and the shortness of the list
// is the point: a lever every essence carries is a lever that distinguishes
// nothing, and the user has already told us once what that failure looks like
// ("more like mad libs"). The eleven are the guard family and the essences
// whose OWN body clause already describes standing in front of something --
// Armour, Shield, Iron, Resolute, Cage and Pangolin (plate and bars), Bear and
// Cattle (the bulk that a pack has to come through), Turtle (the shell others
// get behind), Dog (whose motif verbs already include 'guard'), and Chicken,
// which needed no argument at all: its authored body clause reads "you are all
// fuss and feathers until the flock is threatened, and then you are between it
// and the threat", which is a taunt written out as a sentence.
//
// Deliberately NOT given it: Goat, Tree, Spike, Coral, Bone, Crocodile and the
// rest of the ward-leaning catalog. Being hard to kill is not the same claim as
// being the one who gets hit, and those essences make the first claim only.

import { LEVERS } from './essenceLevers.js';

// ROUND 108 -- THE TABLE BELOW IS THE AUTHOR'S OWN WORDS, AND IT KEEPS SAYING
// `bind` AND `ward`.
//
// Round 105 split those two levers into anchor/muzzle and bulwark/absolve, and
// applying the split means deciding what each of 88 essences meant. That
// decision lives in leverSplit.js WITH ITS EVIDENCE -- the verbs and body text
// that chose each half -- and it is applied here, on the way out.
//
// Rewriting the 88 `levers` arrays in place was the other option and is worse
// in a way that matters: it would destroy the input the decision was made
// from. Keeping the raw table means `leverSplitFaults` can still check the
// mapping against the roster in BOTH directions, and means the split can be
// read, argued with and changed without an archaeology dig. `ESSENCE_MOTIFS`
// is what everything else imports and it carries the 21-lever vocabulary.
export const ESSENCE_MOTIFS_RAW = {
  // ROUND 73 -- the two alchemy essences, added with the potion slots. A motif
  // is what `charterForEssence` derives an essence's whole charter FROM, so an
  // essence without one gets an empty charter and generates nothing -- which is
  // what test_round51_charters caught the moment these two were added
  // ("146 of 148"). Fault class 2, and the estate did its job.
  //
  // `mend` and `renew` are the spine: alchemy in this setting is what is in the
  // bottle. `linger` on the Elixir is its other half -- the acid, and the
  // reason the family's dot is Corrosion.
  essAlchemy: { levers: ['mend', 'renew', 'raw'],
    parts: ['tincture', 'retort', 'reagent', 'distillate', 'sublimate', 'philtre'],
    verbs: ['distil', 'transmute', 'decant', 'temper'],
    adjs: ['distilled', 'sublimed', 'tempered', 'rectified'],
    body: 'what was one thing becomes another, and the change keeps working after it is done' },
  essElixir: { levers: ['renew', 'mend', 'linger'],
    parts: ['draught', 'phial', 'cordial', 'quintessence', 'elixir', 'decoction'],
    verbs: ['restore', 'steep', 'infuse', 'quicken'],
    adjs: ['perfected', 'steeped', 'quickening', 'unfailing'],
    body: 'the draught goes on giving long after the cup is empty' },

  avatar: {
    levers: ['call', 'burst', 'ward'],
    parts: ['mantle', 'crown', 'gilt skin', 'effigy', 'avatar-form', 'standard'],
    verbs: ['embody', 'manifest', 'ascend', 'invoke'], adjs: ['transcendent', 'embodied', 'gilded', 'sovereign'],
    body: 'the will takes a shape of its own and the stone walks beside you wearing it',
  },
  essAdept: {
    levers: ['stalk', 'swift', 'shift'],
    parts: ['hands', 'footwork', 'wrist', 'blade-form', 'poise', 'reflex', 'drilled stance'],
    verbs: ['flick', 'slip', 'strike', 'sidestep'], adjs: ['practiced', 'deft', 'schooled', 'quick'],
    body: 'the hands stop hesitating, the feet stop being where the blow lands',
  },
  essApe: {
    levers: ['reach', 'allies', 'raw', 'ward'],
    parts: ['fur', 'arms', 'fists', 'knuckles', 'hide', 'troop', 'roar'],
    verbs: ['pound', 'hurl', 'swing', 'thrash'], adjs: ['thick', 'long', 'brute', 'shaggy'],
    body: 'the arms lengthen and the hide thickens',
  },
  essArmour: {
    levers: ['ward', 'taunt', 'bind', 'raw'],
    parts: ['plates', 'greaves', 'pauldrons', 'visor', 'gorget', 'mail'],
    verbs: ['shrug', 'shoulder', 'bear', 'turn'], adjs: ['layered', 'plated', 'riveted', 'unflinching'],
    body: 'plates lock over the joints and the flinch goes out of the shoulders',
  },
  essAxe: {
    levers: ['raw', 'burst', 'chain'],
    parts: ['haft', 'axehead', 'bit', 'cheek', 'wedge', 'notch', 'shoulder'],
    verbs: ['cleave', 'chop', 'hew', 'split', 'fell'], adjs: ['heavy', 'keen', 'falling', 'broad'],
    body: 'the shoulders load and the hands close on a haft that is not there',
  },
  essBalance: {
    levers: ['mend', 'fate', 'ward'],
    parts: ['scales', 'fulcrum', 'counterweight', 'plumb line', 'even keel', 'tared beam'],
    verbs: ['level', 'offset', 'settle', 'redress'], adjs: ['balanced', 'evened', 'counterweighted', 'equal'],
    body: 'whatever runs lowest in you refills fastest, and whatever runs full refills slowest',
  },
  essBat: {
    levers: ['swift', 'stealth', 'siphon', 'shift'],
    parts: ['wings', 'needle teeth', 'ears', 'membrane', 'hooked claws', 'shriek', 'roost'],
    verbs: ['flit', 'bite', 'swoop', 'shriek'], adjs: ['leathery', 'darting', 'sightless', 'nocturnal'],
    body: 'the ears widen and the arms stretch out into leather',
  },
  essBear: {
    levers: ['raw', 'ward', 'taunt', 'burst'],
    parts: ['paws', 'shoulders', 'pelt', 'maw', 'gut', 'forelimbs', 'bellow'],
    verbs: ['maul', 'crush', 'rear', 'batter'], adjs: ['lumbering', 'broad', 'dense', 'ursine'],
    body: 'the shoulders broaden and the pelt mats down over slabbed muscle',
  },
  essBee: {
    levers: ['allies', 'chain', 'linger'],
    parts: ['stinger', 'wings', 'hive', 'drones', 'pollen', 'comb', 'antennae'],
    verbs: ['sting', 'swarm', 'dart', 'hum'], adjs: ['tireless', 'humming', 'barbed', 'golden'],
    body: 'wings blur at the shoulders and a stinger sets under the wrist',
  },
  essBird: {
    levers: ['shift', 'swift', 'reach'],
    parts: ['wings', 'talons', 'beak', 'feathers', 'hollow bones', 'keel'],
    verbs: ['dive', 'soar', 'peck', 'wheel'], adjs: ['hollow', 'feathered', 'lofted', 'quick'],
    body: 'the bones hollow out and feathers push through the shoulders',
  },
  essBlight: {
    levers: ['linger', 'chain', 'bind'],
    parts: ['canker', 'spores', 'black veins', 'pustules', 'mould', 'sores', 'wilting hand'],
    verbs: ['rot', 'wither', 'fester', 'blacken', 'spread'], adjs: ['creeping', 'sour', 'blackened', 'fetid'],
    body: 'the veins darken and something under the skin starts spreading outward',
  },
  essBlood: {
    levers: ['siphon', 'linger', 'raw'],
    parts: ['veins', 'heart', 'arteries', 'clots', 'scabs', 'spatter'],
    verbs: ['bleed', 'drain', 'pump', 'let'], adjs: ['hot', 'red', 'thin', 'clotted'],
    body: 'the veins run hot and stand up under the skin',
  },
  essBone: {
    levers: ['ward', 'call', 'raw'],
    parts: ['ribs', 'marrow', 'skull', 'spurs', 'vertebrae', 'femur', 'shards'],
    verbs: ['splinter', 'gnash', 'impale', 'rattle'], adjs: ['bleached', 'jagged', 'old', 'brittle'],
    body: 'the ribs thicken and spurs push out along the forearms',
  },
  essBow: {
    levers: ['reach', 'stalk', 'burst'],
    parts: ['string', 'limbs', 'nock', 'arrow', 'quiver', 'fletching', 'bracer'],
    verbs: ['loose', 'draw', 'sight', 'skewer'], adjs: ['drawn', 'taut', 'far', 'straight'],
    body: 'the shoulders take on a draw weight and the eye ranges everything it lands on',
  },
  essBrush: {
    levers: ['bind', 'ward', 'linger'],
    parts: ['brambles', 'thicket', 'briar', 'bracken', 'burrs', 'nettles'],
    verbs: ['tangle', 'scratch', 'choke', 'snag'], adjs: ['wild', 'snarled', 'thorny', 'overgrown'],
    body: 'briar pushes out through the skin and the ground goes thorny where you stand',
  },
  essCage: {
    levers: ['bind', 'ward', 'taunt', 'call'],
    parts: ['bars', 'lock', 'hinge', 'latch', 'iron ribs', 'key'],
    verbs: ['shut', 'clamp', 'pen', 'enclose'], adjs: ['barred', 'shut', 'iron', 'unyielding'],
    body: 'the ribs harden into bars and the flinch goes out of the stance',
  },
  essCat: {
    levers: ['stalk', 'stealth', 'swift', 'shift'],
    parts: ['paws', 'whiskers', 'retractable claws', 'night eyes', 'soft pads', 'arched back'],
    verbs: ['pounce', 'rake', 'swipe', 'slink', 'spring'], adjs: ['silent', 'soft', 'quick', 'night-eyed'],
    body: 'the footfalls go silent and the pupils open past their edges',
  },
  essCattle: {
    levers: ['raw', 'ward', 'taunt', 'allies'],
    parts: ['horns', 'hooves', 'shoulders', 'yoke', 'herd', 'flank', 'haunches'],
    verbs: ['trample', 'gore', 'shove', 'plod'], adjs: ['broad', 'patient', 'heavy', 'placid'],
    body: 'the shoulders broaden and the neck thickens into a yoke',
  },
  essChain: {
    levers: ['bind', 'reach', 'chain'],
    parts: ['links', 'shackles', 'hooks', 'manacles', 'anchor', 'flail', 'winch'],
    verbs: ['lash', 'snare', 'wrap', 'haul', 'moor'], adjs: ['iron', 'taut', 'rattling', 'linked'],
    body: 'iron links spool out of the palms and cinch around the wrists',
  },
  essClaw: {
    levers: ['stalk', 'linger', 'swift'],
    parts: ['talons', 'nails', 'hooks', 'sheaths', 'furrows', 'gashes', 'forepaws'],
    verbs: ['rend', 'rake', 'shred', 'flay'], adjs: ['hooked', 'keen', 'ragged', 'rending'],
    body: 'the fingernails harden into hooks and the hands learn where things open',
  },
  essCloth: {
    levers: ['call', 'bind', 'ward'],
    parts: ['bandages', 'wraps', 'banner', 'shroud', 'bolt of cloth', 'hem', 'sash'],
    verbs: ['wrap', 'stitch', 'smother', 'furl'], adjs: ['woven', 'tattered', 'coarse', 'silken'],
    body: 'thread runs out of the palms and wraps whatever the hands settle on',
  },
  essCloud: {
    levers: ['shift', 'ward', 'linger'],
    parts: ['mist', 'fogbank', 'thunderhead', 'dew', 'vapour', 'shroud'],
    verbs: ['drift', 'billow', 'roll', 'thin'], adjs: ['weightless', 'drifting', 'diffuse', 'damp'],
    body: 'the weight drains out of the limbs and the outline goes soft',
  },
  essCold: {
    levers: ['bind', 'linger', 'ward'],
    parts: ['rime', 'frost-breath', 'icicles', 'hoarfrost', 'chilblains', 'ice crust'],
    verbs: ['freeze', 'still', 'numb', 'frost', 'crack'], adjs: ['deep', 'biting', 'white', 'slow'],
    body: 'the breath fogs indoors and the skin takes a crust of rime',
  },
  essCoral: {
    levers: ['ward', 'linger', 'call'],
    parts: ['polyps', 'reef', 'crust', 'spurs', 'ridges', 'shell plate'],
    verbs: ['encrust', 'calcify', 'accrete', 'graze'], adjs: ['brittle', 'stony', 'barnacled', 'slow-grown'],
    body: 'a stony crust creeps out along the skin and hardens into ridges',
  },
  essCorrupt: {
    levers: ['linger', 'siphon', 'chain'],
    parts: ['sores', 'black veins', 'ichor', 'spores', 'blight', 'canker', 'fumes'],
    verbs: ['rot', 'fester', 'spread', 'taint', 'slough'], adjs: ['sweet', 'rotten', 'creeping', 'blackened'],
    body: 'the veins darken and the touch starts leaving sores behind it',
  },
  essCrocodile: {
    levers: ['bind', 'stalk', 'ward'],
    parts: ['jaws', 'scutes', 'tail', 'teeth', 'gullet', 'plates', 'waterline'],
    verbs: ['clamp', 'roll', 'drag', 'snap'], adjs: ['patient', 'cold', 'armoured', 'sunken'],
    body: 'the jaw sets heavier and rows of scute rise along the back',
  },
  essCrystal: {
    levers: ['ward', 'chain', 'bind'],
    parts: ['facets', 'shards', 'prisms', 'lattice', 'spurs', 'geode'],
    verbs: ['refract', 'shatter', 'splinter', 'spike'], adjs: ['faceted', 'clear', 'brittle', 'perfect'],
    body: 'facets grow out along the forearms and the stance stops wavering',
  },
  essDance: {
    levers: ['swift', 'shift', 'allies'],
    parts: ['heels', 'toes', 'hem', 'ribbons', 'tambour', 'anklets'],
    verbs: ['whirl', 'step', 'sway', 'reel'], adjs: ['tireless', 'whirling', 'light-footed', 'giddy'],
    body: 'the heels never quite settle and the hips learn to turn first',
  },
  essDeath: {
    levers: ['linger', 'siphon', 'bind'],
    parts: ['shroud', 'pall', 'passing bell', 'grave dust', 'cold hands', 'bier'],
    verbs: ['still', 'quiet', 'wither', 'close'], adjs: ['cold', 'quiet', 'final', 'grey'],
    body: 'the breath slows until it barely fogs and the hands go cold',
  },
  essDeep: {
    levers: ['bind', 'ward', 'linger'],
    parts: ['brine', 'gills', 'undertow', 'trench', 'ballast', 'seabed', 'blackwater'],
    verbs: ['crush', 'drown', 'swallow', 'press', 'submerge'], adjs: ['crushing', 'lightless', 'briny', 'fathomless'],
    body: 'the lungs learn cold water and the bones take pressure without complaint',
  },
  essDeer: {
    levers: ['shift', 'swift', 'stalk'],
    parts: ['hooves', 'antlers', 'ears', 'haunches', 'tendons', 'withers', 'flanks'],
    verbs: ['bound', 'startle', 'vault', 'gore'], adjs: ['sudden', 'light-footed', 'skittish', 'slender'],
    body: 'the ears turn on their own and the legs coil for a bound already underway',
  },
  essDimension: {
    levers: ['shift', 'reach', 'chain'],
    parts: ['fold', 'seam', 'aperture', 'rift', 'threshold', 'pocket', 'corner'],
    verbs: ['fold', 'step', 'invert', 'cross'], adjs: ['folded', 'distant', 'seamless', 'nested'],
    body: 'a seam opens a step behind the heels and never quite closes',
  },
  essDiscord: {
    levers: ['turn', 'bind', 'chain'],
    parts: ['cracked bell', 'off-key horn', 'splintered chime', 'grinding gears', 'raw nerve', 'gnashed teeth'],
    verbs: ['jangle', 'grate', 'unstring', 'jar'], adjs: ['sour', 'grating', 'cracked', 'off-key'],
    body: 'the voice splits into two that disagree and the teeth grind',
  },
  essDog: {
    levers: ['allies', 'stalk', 'taunt', 'swift'],
    parts: ['fangs', 'muzzle', 'snout', 'pack', 'scruff', 'collar', 'haunches'],
    verbs: ['bite', 'harry', 'hound', 'snap', 'guard'], adjs: ['loyal', 'keen-nosed', 'steadfast', 'shaggy'],
    body: 'the jaw sets and the nose takes a scent it will not put down',
  },
  essDuck: {
    levers: ['shift', 'ward', 'swift'],
    parts: ['wings', 'webbed feet', 'down', 'oiled feathers', 'bill', 'wake'],
    verbs: ['paddle', 'flap', 'dabble', 'skim'], adjs: ['oiled', 'buoyant', 'unruffled', 'downy'],
    body: 'the feathers oil over and the feet web out flat',
  },
  essDust: {
    levers: ['linger', 'bind', 'ward'],
    parts: ['grit', 'motes', 'powder', 'ashfall', 'shroud', 'dune', 'sandblast'],
    verbs: ['choke', 'blind', 'settle', 'scour', 'smother'], adjs: ['grey', 'powdery', 'dry', 'settling'],
    body: 'the skin dries to a fine grey and every step raises a cloud',
  },
  essEarth: {
    levers: ['ward', 'bind', 'raw'],
    parts: ['spurs', 'slabs', 'gravel', 'crust', 'boulders', 'plinth', 'grit'],
    verbs: ['crush', 'heave', 'sunder', 'erupt'], adjs: ['jagged', 'unmoving', 'heavy', 'stony'],
    body: 'the skin crusts over with stone and the feet stop being easy to move',
  },
  essEcho: {
    levers: ['chain', 'stalk', 'linger'],
    parts: ['ears', 'chime', 'toll', 'refrain', 'ringing', 'hollow'],
    verbs: ['repeat', 'ring', 'answer', 'redouble'], adjs: ['returning', 'doubled', 'faint', 'ringing'],
    body: 'every sound you make comes back a half-beat late and lands harder',
  },
  essElemental: {
    levers: ['raw', 'linger', 'ward', 'chain'],
    parts: ['core', 'seams', 'boiling veins', 'stone hide', 'stormline', 'tide-channel'],
    verbs: ['erupt', 'freeze', 'flood', 'gust', 'quake'], adjs: ['raw', 'elemental', 'unbanked', 'primal'],
    body: 'the natural world couples straight into the matrix and fuels everything it does',
  },
  essEye: {
    levers: ['stalk', 'reach', 'bind'],
    parts: ['pupil', 'iris', 'lashes', 'eyelid', 'stare', 'third eye', 'optic nerve'],
    verbs: ['stare', 'fix', 'pierce', 'watch', 'mark'], adjs: ['unblinking', 'wide', 'glassy', 'lidless'],
    body: 'the lids stop closing and the stare tracks what has not moved yet',
  },
  essFeast: {
    levers: ['mend', 'allies', 'siphon'],
    parts: ['table', 'platter', 'cup', 'carving knife', 'trencher', 'grease'],
    verbs: ['gorge', 'carve', 'pour', 'share'], adjs: ['laden', 'rich', 'brimming', 'heaped'],
    body: 'the belly fills and the hands come away greased',
  },
  essFeeble: {
    levers: ['bind', 'siphon', 'linger'],
    parts: ['tremor', 'wasted arm', 'thin blood', 'sunken eye', 'slack grip', 'grey teeth', 'husk'],
    verbs: ['sap', 'wither', 'unstring', 'buckle'], adjs: ['wasted', 'trembling', 'hollow', 'shrunken'],
    body: 'the grip goes slack and whatever it closes on goes slacker still',
  },
  essFish: {
    levers: ['allies', 'swift', 'ward'],
    parts: ['scales', 'fins', 'gills', 'shoal', 'tail', 'flank'],
    verbs: ['dart', 'school', 'glide', 'slip'], adjs: ['silver', 'slick', 'cold', 'schooling'],
    body: 'gills open behind the jaw and the skin goes over to scale',
  },
  essFlea: {
    levers: ['shift', 'swift', 'siphon'],
    parts: ['spring legs', 'proboscis', 'bristles', 'carapace', 'mouthparts', 'itch'],
    verbs: ['leap', 'bite', 'vault', 'nip'], adjs: ['tiny', 'springing', 'unswattable', 'restless'],
    body: 'the legs coil into springs and the mouth sharpens to a needle',
  },
  essFlesh: {
    levers: ['siphon', 'mend', 'burst'],
    parts: ['sinew', 'gristle', 'scar-tissue', 'raw meat', 'knitted skin', 'open wound', 'fat'],
    verbs: ['tear', 'knit', 'spend', 'graft', 'bleed'], adjs: ['living', 'raw', 'red', 'swollen'],
    body: 'wounds close as fast as they open and the body pays for each one',
  },
  essFoot: {
    // ROUND 51 -- was ['swift','linger','raw']. The user, specifying what a Foot
    // build should feel like: "The foot essence should increase movement speed,
    // critical hit chance, grant a stealth ability." `raw` was letting Foot
    // produce plain damage bolts and `linger` was letting it produce afflictions,
    // which is why Foot+Wind and Foot+Sin generated the same two abilities with
    // a different damage word. Speed, the opener, and going quiet.
    levers: ['swift', 'stalk', 'stealth'],
    parts: ['soles', 'heels', 'calves', 'boot tread', 'arches', 'footprints'],
    verbs: ['march', 'stomp', 'stride', 'kick'], adjs: ['callused', 'flat', 'steady', 'unresting'],
    body: 'the soles thicken to callus and the calves knot tight',
  },
  essFork: {
    levers: ['chain', 'reach', 'bind'],
    parts: ['tines', 'prongs', 'haft', 'crossbar', 'butt-spike', 'forkhead'],
    verbs: ['thrust', 'pin', 'split', 'jab', 'lever'], adjs: ['forked', 'twin', 'long-hafted', 'pronged'],
    body: 'the arms set into a two-handed brace and the reach forks into two points',
  },
  essFox: {
    levers: ['shift', 'stealth', 'stalk', 'swift'],
    parts: ['brush', 'muzzle', 'whiskers', 'den', 'snout', 'burrow', 'ear-tufts'],
    verbs: ['slip', 'feint', 'dart', 'filch'], adjs: ['sly', 'quick', 'russet', 'slippery'],
    body: 'the tail counterweights every turn and the feet stop making noise',
  },
  essFrog: {
    levers: ['shift', 'reach', 'linger'],
    parts: ['hind legs', 'tongue', 'throat sac', 'webbed toes', 'slick skin', 'spawn'],
    verbs: ['leap', 'gulp', 'vault', 'snatch'], adjs: ['slick', 'squat', 'damp', 'springing'],
    body: 'the hind legs thicken and the tongue learns a much longer reach',
  },
  essFungus: {
    levers: ['linger', 'chain', 'mend'],
    parts: ['spores', 'mycelium', 'caps', 'gills', 'rot', 'threads'],
    verbs: ['bloom', 'spread', 'creep', 'seed'], adjs: ['damp', 'creeping', 'soft', 'quiet'],
    body: 'mycelium laces through the flesh and caps push up along the arms',
  },
  essGathering: {
    levers: ['fate', 'siphon', 'allies'],
    parts: ['full hands', 'laden pack', 'gleaning', 'harvest', 'open seam', 'drawstring'],
    verbs: ['gather', 'glean', 'draw', 'reap'], adjs: ['bountiful', 'laden', 'gathering', 'plentiful'],
    body: 'the world gives up more to you than it does to anyone standing beside you',
  },
  essGlass: {
    levers: ['stalk', 'burst', 'ward'],
    parts: ['shards', 'panes', 'edges', 'splinters', 'lens', 'facets'],
    verbs: ['shatter', 'slice', 'splinter', 'refract'], adjs: ['brittle', 'clear', 'keen', 'razor-thin'],
    body: 'the skin goes clear and hard and rings when it is struck',
  },
  essGoat: {
    levers: ['ward', 'burst', 'shift'],
    parts: ['horns', 'hooves', 'skull-plate', 'beard', 'coat', 'cud', 'crag'],
    verbs: ['butt', 'clamber', 'stomp', 'trample', 'bleat'], adjs: ['sure-footed', 'stubborn', 'horned', 'scrappy'],
    body: 'the skull plates thicken and the feet stop caring what they stand on',
  },
  essGrowth: {
    levers: ['allies', 'call', 'bind'],
    parts: ['shoots', 'runners', 'new wood', 'growth rings', 'bramble', 'canopy'],
    verbs: ['swell', 'overrun', 'root', 'flourish'], adjs: ['unstoppable', 'swelling', 'verdant', 'overgrown'],
    body: 'everything you own gets bigger -- allies, summons, and the ground itself closes around what you fight',
  },
  essGun: {
    levers: ['burst', 'stalk', 'reach'],
    parts: ['barrel', 'hammer', 'muzzle', 'shot', 'trigger', 'powder horn'],
    verbs: ['fire', 'level', 'crack', 'sight'], adjs: ['loaded', 'levelled', 'sudden', 'patient'],
    body: 'the hands go still and the arm learns to hold a line',
  },
  essHair: {
    levers: ['bind', 'reach', 'chain'],
    parts: ['strands', 'braid', 'tresses', 'scalp', 'plait', 'hair-net', 'follicles'],
    verbs: ['lash', 'snare', 'weave', 'tangle', 'wind'], adjs: ['fine', 'countless', 'coiled', 'silken'],
    body: 'the scalp prickles and strands come out longer than they went in',
  },
  essHammer: {
    levers: ['raw', 'bind', 'burst'],
    parts: ['hammerhead', 'haft', 'anvil', 'wedge', 'sledge', 'dents'],
    verbs: ['flatten', 'smash', 'drive', 'pound'], adjs: ['blunt', 'heavy', 'flat', 'dead-weight'],
    body: 'the arms hang heavier and the knuckles set like driven nails',
  },
  essHand: {
    levers: ['call', 'swift', 'stalk'],
    parts: ['palm', 'fingers', 'knuckles', 'thumb', 'tongs', 'awl', 'handprint'],
    verbs: ['grip', 'wring', 'shape', 'clamp', 'forge'], adjs: ['steady', 'calloused', 'deft', 'sure'],
    body: 'the fingers stop shaking and the palms harden where tools sit',
  },
  essHarmonic: {
    levers: ['fate', 'allies', 'chain'],
    parts: ['tuning fork', 'sympathetic string', 'overtones', 'nodes', 'chime', 'battle-song'],
    verbs: ['resonate', 'answer', 'tune', 'ring'], adjs: ['harmonic', 'resonant', 'sympathetic', 'tuned'],
    body: 'the bones find the frequency of the fight and start answering it in kind',
  },
  essHeidel: {
    levers: ['swift', 'raw', 'bind'],
    parts: ['hooves', 'withers', 'mane', 'flanks', 'hide', 'haunches'],
    verbs: ['trample', 'charge', 'kick', 'stampede'], adjs: ['drumming', 'broad', 'heavy-shod', 'untiring'],
    body: 'the legs build into haunches and the stride stops costing anything',
  },
  essHook: {
    levers: ['bind', 'reach', 'raw'],
    parts: ['barb', 'gaff', 'shaft', 'line', 'flukes', 'crook'],
    verbs: ['snag', 'haul', 'yank', 'drag'], adjs: ['barbed', 'crooked', 'biting', 'taut'],
    body: 'the arm ends in a barb and the wrist learns to haul',
  },
  essHorse: {
    levers: ['swift', 'raw', 'shift'],
    parts: ['hooves', 'mane', 'withers', 'flanks', 'hocks', 'shod heel', 'long legs'],
    verbs: ['trample', 'charge', 'stamp', 'bolt', 'kick'], adjs: ['thundering', 'tireless', 'long-legged', 'headlong'],
    body: 'the legs lengthen at the hock and the stride stops needing rest',
  },
  essHunger: {
    levers: ['siphon', 'chain', 'raw'],
    parts: ['maw', 'gullet', 'gnashing teeth', 'hollow gut', 'lean ribs', 'bite'],
    verbs: ['devour', 'gnaw', 'swallow', 'strip'], adjs: ['hollow', 'gaunt', 'ravenous', 'empty'],
    body: 'the stomach hollows out and the jaw unhinges past its own hinge',
  },
  essHunt: {
    levers: ['stalk', 'stealth', 'swift', 'bind'],
    parts: ['spoor', 'tracks', 'scent-trail', 'snare', 'nostrils', 'quarry-mark', 'blind'],
    verbs: ['track', 'close', 'flush', 'corner', 'pounce'], adjs: ['keen', 'closing', 'downwind', 'unhurried'],
    body: 'the nose sharpens and the feet learn to fall quiet on the follow',
  },
  essIce: {
    levers: ['bind', 'ward', 'linger'],
    parts: ['rime', 'shards', 'icicles', 'frost', 'glaze', 'hoar', 'floe'],
    verbs: ['freeze', 'still', 'numb', 'splinter'], adjs: ['biting', 'brittle', 'clear', 'locked'],
    body: 'the breath fogs permanently and rime creeps out along whatever you touch',
  },
  essIron: {
    levers: ['raw', 'ward', 'taunt', 'linger'],
    parts: ['nails', 'ingot', 'spikes', 'chain', 'filings', 'rust', 'bar'],
    verbs: ['hammer', 'drive', 'pin', 'batter'], adjs: ['cold', 'blunt', 'unbending', 'red-rusted'],
    body: 'the bones take on a cold weight and the knuckles ring when struck',
  },
  essKnife: {
    levers: ['stalk', 'stealth', 'swift', 'linger'],
    parts: ['edge', 'point', 'sheath', 'grip', 'sleeve', 'whetstone'],
    verbs: ['slip', 'stab', 'nick', 'gut'], adjs: ['hidden', 'keen', 'narrow', 'quiet'],
    body: 'the hands learn to keep a point out of sight',
  },
  essKnowledge: {
    levers: ['stalk', 'bind', 'fate'],
    parts: ['weak point', 'tell', 'index', 'margin', 'ledger', 'turning page'],
    verbs: ['read', 'anticipate', 'expose', 'annotate'], adjs: ['studied', 'foreread', 'annotated', 'known'],
    body: 'you know where it is thin, how much it has left, and which way it will move',
  },
  essLife: {
    levers: ['mend', 'ward', 'allies'],
    parts: ['sap', 'shoots', 'new skin', 'roots', 'seed', 'quick flesh'],
    verbs: ['knit', 'sprout', 'bloom', 'root'], adjs: ['green', 'stubborn', 'quick', 'budding'],
    body: 'torn skin knits over green and the pulse steadies',
  },
  essLight: {
    levers: ['reach', 'burst', 'bind'],
    parts: ['beam', 'glare', 'halo', 'ray', 'flare', 'lantern', 'noon'],
    verbs: ['blaze', 'sear', 'dazzle', 'shine'], adjs: ['blinding', 'white', 'searing', 'clear'],
    body: 'the eyes stop needing lamps and a hard white glare comes off the skin',
  },
  essLightning: {
    levers: ['chain', 'swift', 'burst'],
    parts: ['arcs', 'sparks', 'filaments', 'static', 'forks', 'fulgurite', 'scorched air'],
    verbs: ['arc', 'crackle', 'jolt', 'leap'], adjs: ['forked', 'white-hot', 'crackling', 'instant'],
    body: 'the nerves fire ahead of the thought and static stands the hair on end',
  },
  essLizard: {
    levers: ['stealth', 'stalk', 'mend', 'shift'],
    parts: ['tail', 'dewlap', 'claws', 'scutes', 'shed skin', 'toe pads'],
    verbs: ['skitter', 'bask', 'regrow', 'scrabble'], adjs: ['cold-blooded', 'sun-warmed', 'dry', 'motionless'],
    body: 'the skin goes over to scutes and a dropped tail starts growing back',
  },
  essLocust: {
    levers: ['chain', 'siphon', 'call', 'swift'],
    parts: ['swarm', 'mandibles', 'wingcase', 'thorax', 'husks', 'drone'],
    verbs: ['swarm', 'strip', 'devour', 'descend'], adjs: ['ravenous', 'countless', 'rasping', 'droning'],
    body: 'the jaws double and a drone starts up behind the ribs',
  },
  essLurker: {
    levers: ['stealth', 'stalk', 'burst', 'bind'],
    parts: ['tendrils', 'sunken sockets', 'undertow', 'crawlspace', 'trapdoor jaw', 'silt'],
    verbs: ['lurk', 'drag', 'seize', 'surface'], adjs: ['submerged', 'unlit', 'cold-handed', 'waiting'],
    body: 'the weight settles low and something beneath you starts keeping watch',
  },
  essMagic: {
    // ===== ROUND 236 -- THE ESSENCE WHOSE PARTS KNEW AND WHOSE LEVERS DID NOT
    //
    // The user, on finding [Crystallise Mana] in two characters' kits: "Humphry
    // got Crystalize Mana from the Magic Essence, Neil got it from the shield
    // essence. This is a cannon example of the same exact ability being
    // generated by different kits and different essences WHERE THE LEVERS
    // OVERLAP."
    //
    // Checked against this table, that sentence was false of us. Magic's levers
    // were burst, reach and linger -- which between them gate impact, explode,
    // drain, move, refresh, travel, dot, debuff and the three over-time
    // restores, and NOT `shield`, `recover` or `innervate`. So the Magic essence
    // could not produce a thing that hands mana back or turns a blow aside, and
    // [Crystallise Mana] does both.
    //
    // THE ROW'S OWN NOUNS HAD ALREADY SAID SO. `parts` below reads "glyph,
    // sigil, casting circle, ley thread, MANA-WELL, long channel" -- the flavour
    // half of this motif has known Magic is about a reservoir of mana since
    // round 48, and the mechanical half never did. One motif, two halves,
    // disagreeing: this project's fault class 2 wearing a different coat.
    //
    // `renew` IS THE ONE LEVER THAT FIXES IT and it is not a reach: round 105
    // moved all seven resource restores and recovery-rate buffs onto it, and its
    // gates are `hot, iot, rot, heal, innervate, recover, SHIELD, buff,
    // summon_terrain`. That `shield` is what makes the user's sentence true --
    // Shield reaches the ability through `bulwark` (gates shield) and Magic
    // through `renew` (gates shield AND innervate), so the OVERLAP IS IN THE
    // GATES rather than in the lever names, and the ability sits in it.
    //
    // It also helps a population problem `renew`'s own comment names: it sat on
    // three essences out of a hundred and forty-eight.
    //
    // MEASURED, over 300 Magic abilities across 60 kits: the count is unchanged
    // at 300, recovery-shaped abilities go 66 -> 79, shield-shaped 4 -> 5. Small
    // and real, and the smallness is the appended position doing its job --
    // Magic gained reach into recovery without losing anything it already did.
    // Round 225's lesson is why the figure is written down rather than assumed:
    // a change that measures zero is a change that should be reverted.
    //
    // APPENDED RATHER THAN FRONTED. `leverForCategory` gives a category to
    // whichever lever names it earliest, so putting `renew` first would hand it
    // every category the three incumbents currently win. The claim being made
    // here is that Magic CAN produce these, not that it stops producing what it
    // already does.
    levers: ['burst', 'reach', 'linger', 'renew'],
    parts: ['glyph', 'sigil', 'casting circle', 'ley thread', 'mana-well', 'long channel'],
    verbs: ['channel', 'unravel', 'cast', 'sustain'], adjs: ['arcane', 'complex', 'long-channelled', 'deep'],
    body: 'the spells get longer, larger and stranger, and they carry arcane rather than elemental force',
  },
  essMalign: {
    levers: ['linger', 'stealth', 'bind', 'siphon'],
    parts: ['shadow', 'evil eye', 'hex-mark', 'black tongue', 'sneer', 'brand', 'muttering'],
    verbs: ['curse', 'hex', 'mutter', 'gnaw'], adjs: ['spiteful', 'quiet', 'crooked', 'ill-wishing'],
    body: 'the shadow underfoot thickens and stops matching what you do',
  },
  essManatee: {
    levers: ['ward', 'mend', 'linger'],
    parts: ['blubber', 'flippers', 'fluke', 'ribs', 'lip-bristles', 'ballast', 'paddle-bones'],
    verbs: ['drift', 'absorb', 'surface', 'wallow'], adjs: ['unhurried', 'buoyant', 'padded', 'soft'],
    body: 'a hand of blubber settles under the skin and the breath stretches long',
  },
  essMirror: {
    levers: ['ward', 'call', 'shift'],
    parts: ['glass', 'silvered skin', 'shard', 'twin', 'frame', 'pane'],
    verbs: ['reflect', 'answer', 'double', 'return'], adjs: ['silvered', 'answering', 'flawless', 'inverted'],
    body: 'the skin takes a silver sheen and copies the last blow it was shown',
  },
  essMonkey: {
    levers: ['swift', 'shift', 'siphon'],
    parts: ['fingers', 'prehensile tail', 'thumbs', 'palms', 'nimble wrists', 'pilfered trinket'],
    verbs: ['snatch', 'scamper', 'filch', 'vault', 'fling'], adjs: ['clever', 'nimble', 'light-fingered', 'restless'],
    body: 'the fingers find new joints and the tail takes a grip of its own',
  },
  essMoon: {
    levers: ['stalk', 'stealth', 'mend', 'bind'],
    parts: ['crescent', 'pale disc', 'tide', 'silver scar', 'moonlit path', 'halo'],
    verbs: ['wane', 'pull', 'silver', 'unveil'], adjs: ['pale', 'silver', 'waxing', 'cold'],
    body: 'the skin pales to silver and starts pulling at everything loose nearby',
  },
  essMouse: {
    levers: ['stealth', 'shift', 'swift', 'stalk'],
    parts: ['whiskers', 'incisors', 'tail', 'burrow', 'paws', 'nest', 'gnaw-hole'],
    verbs: ['scurry', 'dart', 'nibble', 'squeak', 'slip'], adjs: ['small', 'quick', 'unseen', 'nervous'],
    body: 'the bones go light and the whiskers read the room before you do',
  },
  essMyriad: {
    levers: ['chain', 'turn', 'call'],
    parts: ['doubles', 'after-images', 'swarm', 'facets', 'mirror-selves', 'split blow'],
    verbs: ['split', 'multiply', 'swarm', 'spread'], adjs: ['myriad', 'countless', 'manifold', 'swarming'],
    body: 'every blow finds a second target and a third, and the outline blurs into several',
  },
  essNeedle: {
    levers: ['stalk', 'swift', 'linger'],
    parts: ['needle-point', 'pins', 'barb', 'quills', 'stitches', 'needle eye'],
    verbs: ['prick', 'thread', 'pierce', 'jab'], adjs: ['precise', 'fine', 'slender', 'hairline'],
    body: 'the fingertips sharpen to points and every silhouette shows its gaps',
  },
  essNet: {
    levers: ['bind', 'call', 'reach'],
    parts: ['mesh', 'cords', 'weights', 'knots', 'float', 'trawl'],
    verbs: ['cast', 'snare', 'tangle', 'draw'], adjs: ['woven', 'weighted', 'knotted', 'closing'],
    body: 'cord grows from the fingers and knots itself as it comes',
  },
  essOctopus: {
    levers: ['reach', 'bind', 'shift'],
    parts: ['tentacles', 'suckers', 'beak', 'ink cloud', 'mantle', 'eight arms', 'soft skull'],
    verbs: ['coil', 'grip', 'squeeze', 'pull', 'ink'], adjs: ['boneless', 'unhurried', 'slick', 'sucking'],
    body: 'the bones give up their stiffness and the arms find eight ways to hold on',
  },
  essOmen: {
    levers: ['burst', 'call', 'linger'],
    parts: ['portent', 'harbinger', 'slow star', 'cast bones', 'tolling', 'long shadow'],
    verbs: ['foretell', 'gather', 'loom', 'arrive'], adjs: ['inevitable', 'slow-coming', 'portentous', 'heavy'],
    body: 'everything you send takes its time arriving, and arrives with the weight of a thing foretold',
  },
  essPangolin: {
    levers: ['ward', 'bind', 'taunt', 'raw'],
    parts: ['scales', 'plates', 'digging claws', 'keeled tail', 'ridge', 'lamellae', 'armoured brow'],
    verbs: ['curl', 'deflect', 'rake', 'shoulder'], adjs: ['overlapping', 'plated', 'unflinching', 'hard-edged'],
    body: 'the skin sets into overlapping plates that grind when you turn',
  },
  essPaper: {
    levers: ['call', 'ward', 'bind'],
    parts: ['sheets', 'scrolls', 'seals', 'ink', 'folded charms', 'tally-marks', 'pages'],
    verbs: ['inscribe', 'fold', 'seal', 'sign'], adjs: ['written', 'folded', 'crisp', 'indelible'],
    body: 'the palms print with wet ink and folded charms fill every pocket',
  },
  essPlant: {
    levers: ['mend', 'siphon', 'bind'],
    parts: ['roots', 'stem', 'leaves', 'sap', 'seeds', 'creepers'],
    verbs: ['root', 'drink', 'coil', 'spread'], adjs: ['patient', 'green', 'deep-set', 'slow'],
    body: 'roots work down out of the heels and hold you there drinking',
  },
  essChicken: {
    levers: ['allies', 'taunt', 'ward', 'swift'],
    parts: ['feathers', 'brood', 'roost', 'spur', 'ruffled crest', 'clutch'],
    verbs: ['flap', 'scratch', 'peck', 'fuss'], adjs: ['stubborn', 'ruffled', 'broody', 'unbothered'],
    body: 'you are all fuss and feathers until the flock is threatened, and then you are between it and the threat',
  },
  essPotent: {
    levers: ['burst', 'raw', 'reach'],
    parts: ['matrix', 'marrow', 'arc-line', 'core', 'overcharge', 'clenched fist', 'lava-vein'],
    verbs: ['blast', 'erupt', 'discharge', 'overload'], adjs: ['concentrated', 'overcharged', 'dense', 'searing'],
    body: 'the magical matrix packs tight and discharges harder than the body should survive',
  },
  essPure: {
    levers: ['mend', 'ward', 'fate'],
    parts: ['clear water', 'clean edge', 'unclouded lens', 'distillate', 'solvent', 'white light'],
    verbs: ['purge', 'cleanse', 'scour', 'clarify'], adjs: ['pure', 'undiluted', 'unclouded', 'clean'],
    body: 'nothing foreign is allowed to stay in you -- not poison, not burn, not even a holy affliction',
  },
  essRabbit: {
    levers: ['swift', 'shift', 'stalk'],
    parts: ['hind legs', 'long ears', 'whiskers', 'burrow', 'twitching nose', 'scut'],
    verbs: ['bolt', 'dart', 'bound', 'thump'], adjs: ['skittish', 'nimble', 'twitchy', 'small'],
    body: 'the ears lengthen and the hind legs coil up under you',
  },
  essRake: {
    levers: ['reach', 'linger', 'bind'],
    parts: ['teeth', 'rake-head', 'handle', 'furrow', 'heap', 'scratchmarks', 'stubble'],
    verbs: ['drag', 'comb', 'scrape', 'gather'], adjs: ['toothed', 'level', 'raked', 'braced'],
    body: 'the shoulders square and the grip sets wide along a long toothed head',
  },
  essRat: {
    levers: ['call', 'shift', 'swift'],
    parts: ['swarm', 'incisors', 'bare tail', 'nest', 'gnaw-holes', 'litter', 'scrabbling feet'],
    verbs: ['scurry', 'gnaw', 'swarm', 'squeeze'], adjs: ['scrawny', 'teeming', 'filthy', 'nimble'],
    body: 'the ribs narrow enough to fit anywhere and something always comes out of the dark behind you',
  },
  essResolute: {
    levers: ['ward', 'taunt', 'raw', 'linger'],
    parts: ['planted foot', 'set jaw', 'braced knee', 'locked spine', 'anchor', 'callus'],
    verbs: ['hold', 'brace', 'endure', 'stand'], adjs: ['immovable', 'planted', 'stubborn', 'set'],
    body: 'the feet root to the ground and the knees refuse to unlock',
  },
  essRune: {
    levers: ['linger', 'ward', 'call'],
    parts: ['glyph', 'sigil', 'graven mark', 'stylus', 'tablet', 'seal', 'chisel'],
    verbs: ['carve', 'inscribe', 'etch', 'set'], adjs: ['graven', 'carved', 'binding', 'ink-black'],
    body: 'marks cut themselves into the skin and stay legible under it',
  },
  essSand: {
    levers: ['bind', 'linger', 'ward'],
    parts: ['grains', 'grit', 'dunes', 'hourglass', 'drifts', 'sandskin'],
    verbs: ['scour', 'bury', 'blind', 'drift'], adjs: ['dry', 'numberless', 'grinding', 'shifting'],
    body: 'the body loosens into grit that pours away and packs itself again',
  },
  essSceptre: {
    levers: ['allies', 'reach', 'bind'],
    parts: ['rod', 'orb', 'finial', 'gilt shaft', 'crown-head', 'signet', 'standard'],
    verbs: ['command', 'raise', 'point', 'rap', 'proclaim'], adjs: ['raised', 'gilded', 'imperious', 'ceremonial'],
    body: 'the spine straightens and the arm learns to hold something up without tiring',
  },
  essSerene: {
    levers: ['mend', 'ward', 'fate'],
    parts: ['still water', 'unrippled surface', 'slow pulse', 'open palms', 'basin', 'calm'],
    verbs: ['settle', 'soothe', 'cleanse', 'still'], adjs: ['serene', 'untroubled', 'unrippled', 'slow'],
    body: 'the pulse drops to a slow count and nothing that lands on you is allowed to ripple',
  },
  essShark: {
    levers: ['stalk', 'siphon', 'swift'],
    parts: ['jaws', 'tooth rows', 'dorsal fin', 'snout', 'rough hide', 'wake'],
    verbs: ['circle', 'tear', 'rip', 'close in'], adjs: ['circling', 'grey', 'ravenous', 'unblinking'],
    body: 'the teeth come in through the gums in rows and blood carries a long way',
  },
  essShield: {
    levers: ['ward', 'taunt', 'allies', 'bind'],
    parts: ['boss', 'rim', 'straps', 'facing', 'bulwark', 'shieldwall'],
    verbs: ['block', 'shove', 'bash', 'turn'], adjs: ['raised', 'broad', 'unbroken', 'steadfast'],
    body: 'the forearm broadens into a facing and the shoulder learns to take weight',
  },
  essShimmer: {
    levers: ['stalk', 'bind', 'ward'],
    parts: ['motes', 'prism', 'glare', 'revealed seam', 'lantern-glow', 'false edge'],
    verbs: ['reveal', 'dazzle', 'expose', 'kindle'], adjs: ['shimmering', 'revealing', 'bright', 'unhidden'],
    body: 'the dark is held off you and everything hiding in it -- weak points, illusions -- is shown up',
  },
  essShip: {
    levers: ['shift', 'swift', 'ward'],
    parts: ['sail', 'keel', 'hull', 'prow', 'rigging', 'anchor', 'mast'],
    verbs: ['sail', 'ram', 'heel', 'launch'], adjs: ['leaning', 'salt-worn', 'seaworthy', 'canvas'],
    body: 'canvas fills at your back and the ribs set themselves like a hull',
  },
  essShovel: {
    levers: ['raw', 'bind', 'linger'],
    parts: ['blade', 'spade-edge', 'shaft', 'treadplate', 'ditch', 'mound', 'clod'],
    verbs: ['dig', 'bury', 'clout', 'heave', 'flatten'], adjs: ['blunt', 'heavy', 'turned', 'flat'],
    body: 'the shoulders broaden and the hands settle into a grip that moves earth',
  },
  essSickle: {
    levers: ['chain', 'siphon', 'reach'],
    parts: ['curved blade', 'hook', 'haft', 'whetstone', 'swathe', 'sheaf', 'stubble'],
    verbs: ['reap', 'sweep', 'hook', 'gather'], adjs: ['curved', 'honed', 'sweeping', 'crescent'],
    body: 'the wrist learns a curve and everything at hip height starts reading as standing grain',
  },
  essSin: {
    levers: ['siphon', 'linger', 'call'],
    parts: ['shadow', 'brand', 'stain', 'mark', 'shackle', 'crooked smile'],
    verbs: ['covet', 'tempt', 'indulge', 'corrupt'], adjs: ['cherished', 'crooked', 'sweet', 'unrepentant'],
    body: 'the shadow behind you thickens and starts taking a cut of everything you touch',
  },
  essSkunk: {
    levers: ['linger', 'ward', 'bind'],
    parts: ['musk gland', 'spray', 'striped pelt', 'brush tail', 'reek', 'paws'],
    verbs: ['spray', 'foul', 'stamp', 'taint'], adjs: ['rank', 'striped', 'lingering', 'acrid'],
    body: 'a gland swells at the base of the spine and the pelt takes a warning stripe',
  },
  essSloth: {
    levers: ['ward', 'linger', 'bind'],
    parts: ['curved hooks', 'shaggy coat', 'slow heartbeat', 'mossed fur', 'long forelimbs', 'locked grip'],
    verbs: ['hang', 'outlast', 'swing', 'settle'], adjs: ['unhurried', 'ponderous', 'deliberate', 'moss-grown'],
    body: 'the pulse slows to a count you can hear and nothing hurries the hands',
  },
  essSmoke: {
    levers: ['stealth', 'shift', 'bind', 'linger'],
    parts: ['plume', 'veil', 'soot', 'haze', 'wisps', 'char'],
    verbs: ['billow', 'smother', 'curl', 'vanish'], adjs: ['choking', 'thin', 'sooty', 'drifting'],
    body: 'the outline frays into plumes that will not hold a shape',
  },
  essSnake: {
    levers: ['linger', 'stealth', 'stalk', 'bind'],
    parts: ['fangs', 'venom sacs', 'coils', 'forked tongue', 'rattle', 'shed skin', 'belly'],
    verbs: ['strike', 'coil', 'envenom', 'constrict', 'hiss'], adjs: ['venomous', 'coiled', 'still', 'sinuous'],
    body: 'the spine loosens joint by joint and the mouth fills with venom',
  },
  essSong: {
    levers: ['allies', 'reach', 'linger'],
    parts: ['throat', 'refrain', 'chorus', 'held note', 'lungs', 'verse', 'hum'],
    verbs: ['sing', 'carry', 'swell', 'lift'], adjs: ['carrying', 'long-breathed', 'sung', 'tuneful'],
    body: 'the lungs deepen and the voice starts reaching further than the room allows',
  },
  essSpear: {
    levers: ['reach', 'raw', 'ward'],
    parts: ['shaft', 'spearhead', 'haft', 'butt-spike', 'crossbar', 'ferrule'],
    verbs: ['thrust', 'skewer', 'lunge', 'plant'], adjs: ['level', 'long-hafted', 'braced', 'straight'],
    body: 'the arms learn a longer line and the front foot plants without being told',
  },
  essSpider: {
    levers: ['bind', 'stealth', 'stalk', 'siphon'],
    parts: ['silk', 'spinnerets', 'fangs', 'eight legs', 'venom sac', 'egg sac'],
    verbs: ['wrap', 'truss', 'bite', 'wait'], adjs: ['patient', 'silken', 'many-legged', 'venomous'],
    body: 'spinnerets open at the wrists and the legs multiply',
  },
  essSpike: {
    levers: ['ward', 'stalk', 'bind'],
    parts: ['barb', 'thorn', 'spur', 'quill', 'caltrop', 'needle-bone', 'tip'],
    verbs: ['impale', 'jab', 'pierce', 'skewer', 'prick'], adjs: ['waiting', 'barbed', 'fine-pointed', 'bristling'],
    body: 'points push up through the skin and do not go back down',
  },
  essStaff: {
    levers: ['reach', 'bind', 'ward'],
    parts: ['shaft', 'ferrule', 'butt-end', 'grip wrap', 'crook', 'walking pole'],
    verbs: ['sweep', 'thrust', 'vault', 'rap'], adjs: ['long', 'worn', 'straight', 'braced'],
    body: 'the grip hardens around a length of seasoned wood and the stride lengthens',
  },
  essStar: {
    levers: ['reach', 'burst', 'call'],
    parts: ['corona', 'meteor', 'constellation', 'starfall', 'cinders', 'firmament'],
    verbs: ['fall', 'burn', 'ignite', 'wheel', 'plummet'], adjs: ['distant', 'cold', 'burning', 'wheeling'],
    body: 'the eyes take on a pinprick glare and something very far off starts answering',
  },
  essSun: {
    levers: ['stalk', 'reach', 'burst', 'mend'],
    parts: ['glare', 'corona', 'beams', 'disc', 'sunspots', 'afterimage', 'shadowless ground'],
    verbs: ['blaze', 'reveal', 'bleach', 'scald'], adjs: ['blinding', 'high', 'golden', 'shadowless'],
    body: 'the eyes stop needing to adjust and nothing standing near you keeps a shadow',
  },
  essSwift: {
    levers: ['swift', 'shift', 'stalk'],
    parts: ['heels', 'tendons', 'stride', 'afterimage', 'quick hands', 'light feet'],
    verbs: ['dash', 'flicker', 'outpace', 'blink'], adjs: ['quicksilver', 'headlong', 'light', 'early'],
    body: 'the tendons shorten and the world takes a half-step longer to arrive',
  },
  essSword: {
    levers: ['raw', 'reach', 'swift'],
    parts: ['blade', 'hilt', 'crossguard', 'pommel', 'scabbard', 'fuller'],
    verbs: ['cleave', 'parry', 'draw', 'thrust'], adjs: ['drawn', 'bright', 'balanced', 'long'],
    body: 'the arm falls into a guard and the wrist learns the weight of steel',
  },
  essTechnology: {
    levers: ['call', 'swift', 'ward'],
    parts: ['cogs', 'pistons', 'clockwork arm', 'bolts', 'springs', 'gauges'],
    verbs: ['assemble', 'crank', 'rivet', 'deploy'], adjs: ['clever', 'geared', 'ticking', 'machined'],
    body: 'the hands pick up a rhythm of their own and something inside starts ticking',
  },
  essTentacle: {
    levers: ['reach', 'bind', 'siphon'],
    parts: ['tendrils', 'suckers', 'coils', 'boneless arms', 'barbed cups', 'ink'],
    verbs: ['coil', 'constrict', 'lash', 'drag'], adjs: ['boneless', 'clinging', 'writhing', 'cold'],
    body: 'the arms go boneless and sprout rows of suckers down their length',
  },
  essThread: {
    levers: ['bind', 'chain', 'call'],
    parts: ['strand', 'spool', 'needle', 'seam', 'knot', 'skein', 'stitches'],
    verbs: ['stitch', 'sew', 'tether', 'unravel', 'cinch'], adjs: ['fine', 'knotted', 'woven', 'drawn'],
    body: 'the fingertips trail strands that catch on whatever passes close',
  },
  essTrap: {
    levers: ['call', 'bind', 'linger'],
    parts: ['snare', 'tripwire', 'pit', 'iron teeth', 'spring', 'deadfall', 'bait'],
    verbs: ['set', 'spring', 'snare', 'rig'], adjs: ['hidden', 'sprung', 'toothed', 'waiting'],
    body: 'the hands start setting things down that were not in them a moment before',
  },
  essTree: {
    levers: ['ward', 'reach', 'raw'],
    parts: ['bark', 'boughs', 'trunk', 'canopy', 'heartwood', 'knots'],
    verbs: ['loom', 'sway', 'shade', 'topple'], adjs: ['standing', 'broad', 'ringed', 'old-growth'],
    body: 'the skin hardens into bark and the reach goes up as far as it goes out',
  },
  essTrowel: {
    levers: ['call', 'ward', 'raw'],
    parts: ['trowel', 'mortar', 'brick course', 'plumb line', 'chisel', 'set stone'],
    verbs: ['lay', 'seal', 'raise', 'trim'], adjs: ['level', 'plumb', 'squared', 'set'],
    body: 'the hands learn mortar and a plumb line hangs from the wrist',
  },
  essTurtle: {
    levers: ['ward', 'mend', 'taunt', 'linger'],
    parts: ['shell', 'carapace', 'plastron', 'scutes', 'leathery neck', 'clawed feet'],
    verbs: ['withdraw', 'hunker', 'plod', 'clamp'], adjs: ['armoured', 'plated', 'unbothered', 'thick-shelled'],
    body: 'plates grow in across the back and the neck learns to disappear',
  },
  essVast: {
    levers: ['reach', 'burst', 'shift'],
    parts: ['horizon', 'gulf', 'far shore', 'span', 'vanishing point', 'sightline'],
    verbs: ['span', 'sweep', 'encompass', 'reach'], adjs: ['vast', 'borderless', 'far-flung', 'immense'],
    body: 'distance stops being a cost and every reach and radius grows with it',
  },
  essVehicle: {
    levers: ['shift', 'swift', 'call'],
    parts: ['wheels', 'axle', 'spokes', 'harness', 'yoke', 'ruts'],
    verbs: ['roll', 'barrel', 'ram', 'career', 'trundle'], adjs: ['rolling', 'wheeled', 'headlong', 'road-worn'],
    body: 'the feet turn over like wheels and the ground starts passing under them unasked',
  },
  essVenom: {
    levers: ['linger', 'siphon', 'bind'],
    parts: ['fangs', 'glands', 'sacs', 'stained teeth', 'ichor', 'blackened veins', 'needle'],
    verbs: ['envenom', 'seep', 'fester', 'spit'], adjs: ['slow-working', 'bitter', 'septic', 'creeping'],
    body: 'glands swell behind the jaw and everything you open stays open longer',
  },
  essVisage: {
    levers: ['shift', 'bind', 'call'],
    parts: ['mask', 'borrowed face', 'features', 'reflection', 'stare', 'double'],
    verbs: ['wear', 'mimic', 'unsettle', 'shed'], adjs: ['worn', 'borrowed', 'familiar', 'unplaceable'],
    body: 'the features go loose and settle into a face that is not the one you had',
  },
  essVoid: {
    levers: ['siphon', 'stealth', 'bind', 'shift'],
    parts: ['maw', 'hollow', 'gulf', 'starless pit', 'empty hand', 'dark seam'],
    verbs: ['swallow', 'unmake', 'drink', 'collapse'], adjs: ['hungry', 'starless', 'empty', 'silent'],
    body: 'a hollow opens under the ribs and the edges of you stop being certain',
  },
  essWasp: {
    levers: ['linger', 'swift', 'ward'],
    parts: ['stinger', 'venom sac', 'narrow waist', 'papery wings', 'mandibles', 'nest'],
    verbs: ['sting', 'swarm', 'dart', 'envenom', 'needle'], adjs: ['vindictive', 'venomous', 'buzzing', 'narrow'],
    body: 'the waist pinches in and a barb sets itself under the last rib',
  },
  essWater: {
    levers: ['raw', 'bind', 'mend'],
    parts: ['current', 'undertow', 'depths', 'wave', 'spray', 'flood'],
    verbs: ['drown', 'crush', 'surge', 'swell'], adjs: ['deep', 'crushing', 'cold', 'brimming'],
    body: 'the lungs learn to take pressure and the low places in you fill up',
  },
  essWhale: {
    levers: ['reach', 'raw', 'allies'],
    parts: ['song', 'flukes', 'blowhole', 'baleen', 'blubber', 'breaching back', 'pod'],
    verbs: ['breach', 'bellow', 'sound', 'engulf', 'slam'], adjs: ['vast', 'slow', 'low', 'sounding'],
    body: 'the ribs widen and the breath goes long enough to hold a note underwater',
  },
  essWheel: {
    levers: ['swift', 'shift', 'raw'],
    parts: ['rim', 'spokes', 'axle', 'hub', 'tread', 'bearings', 'ruts'],
    verbs: ['roll', 'spin', 'careen', 'turn'], adjs: ['turning', 'ceaseless', 'round', 'geared'],
    body: 'the joints start turning instead of hinging and stopping costs more than going',
  },
  essWhip: {
    levers: ['reach', 'bind', 'chain'],
    parts: ['lash', 'coils', 'thong', 'whip-tip', 'plait', 'handle'],
    verbs: ['crack', 'lash', 'whirl', 'catch'], adjs: ['cracking', 'coiled', 'supple', 'stinging'],
    body: 'the arm pays out a braided length of leather that answers like a wrist',
  },
  essWind: {
    levers: ['swift', 'reach', 'bind'],
    parts: ['gust', 'gale', 'slipstream', 'squall', 'draught', 'keening'],
    verbs: ['gust', 'scour', 'buffet', 'howl'], adjs: ['razor', 'restless', 'keening', 'headlong'],
    body: 'the air will not stop moving over the skin and the step gets pushed along',
  },
  essWing: {
    levers: ['shift', 'swift', 'reach'],
    parts: ['pinions', 'primary feathers', 'hollow bones', 'wing-root', 'keel', 'downdraught'],
    verbs: ['beat', 'soar', 'stoop', 'lift', 'veer'], adjs: ['beating', 'broad-winged', 'airborne', 'weightless'],
    body: 'the bones hollow out and the back opens along two new joints',
  },
  essWolf: {
    levers: ['allies', 'stalk', 'swift'],
    parts: ['fangs', 'muzzle', 'pack', 'hackles', 'howl', 'claws'],
    verbs: ['hunt', 'harry', 'snap', 'run down'], adjs: ['lean', 'grey', 'bristling', 'wary'],
    body: 'the jaw lengthens into a muzzle and the hackles come up',
  },
  essWood: {
    levers: ['mend', 'ward', 'bind'],
    parts: ['bark', 'grain', 'roots', 'sap', 'knots', 'rings', 'green shoots'],
    verbs: ['root', 'sprout', 'knit', 'thicken', 'creak'], adjs: ['green', 'grained', 'seasoned', 'living'],
    body: 'the skin roughens into bark and cuts close over with new grain',
  },
  essZeal: {
    levers: ['siphon', 'fate', 'burst'],
    parts: ['last breath', 'red edge', 'set jaw', 'oath-brand', 'empty vein', 'raised standard'],
    verbs: ['press', 'burn', 'spend', 'refuse'], adjs: ['unrelenting', 'unquenchable', 'unstopping', 'zealous'],
    body: 'what you deal comes back as life and what you spend comes back as force, and zero is a place you fight from',
  },
  fire: {
    levers: ['linger', 'burst', 'chain'],
    parts: ['embers', 'cinders', 'coals', 'tongues', 'soot', 'scorchmarks', 'wick'],
    verbs: ['sear', 'kindle', 'scorch', 'flare'], adjs: ['searing', 'smouldering', 'bright', 'ashen'],
    body: 'the blood runs hot enough to cook and embers bank under the skin',
  },
  heal: {
    // ROUND 51 -- was ['mend','linger','allies']. The user: "A renewal essence
    // should essentially generate all versions of healing powers and abilities,
    // maybe mana restoration." `linger` is the affliction lever; on a healer it
    // was the route by which Renewal + Fire produced "Purifying Bloom, 7 dmg,
    // +2x4 Burn". Warding belongs with mending far better than rotting does.
    //
    // ROUND 52 -- and the lingering comes back, as `renew`. The user read the
    // removal and diagnosed it exactly: "this might have been why Renewal
    // generated a linger lever, perhaps linger needs split into linger damage
    // vs linger healing." It did, and it is. Renewal has the strongest claim
    // in the game on "and it keeps working afterwards", so taking the word
    // away from it in round 51 was treating the symptom -- the word was right,
    // the only polarity the generator knew was wrong. Fourth in the order, so
    // `mend` still leads and the kit is a healer's before it is anything else.
    levers: ['mend', 'allies', 'ward', 'renew'],
    parts: ['new skin', 'scars', 'pulse', 'sap-rise', 'bloom', 'clean breath'],
    verbs: ['close', 'knit', 'quicken', 'return'], adjs: ['turning', 'unhurried', 'warm', 'second'],
    body: 'cuts start closing on the pace of a season instead of a body',
  },
  might: {
    levers: ['raw', 'burst', 'bind'],
    parts: ['shoulders', 'grip', 'sinew', 'spine', 'jaw', 'haymaker'],
    verbs: ['heave', 'crush', 'slam', 'overbear'], adjs: ['overwhelming', 'sheer', 'bruising', 'heavy'],
    body: 'the shoulders broaden and every joint sets like cooling iron',
  },
  shadow: {
    levers: ['stalk', 'stealth', 'siphon', 'shift'],
    parts: ['shade', 'shadow-hands', 'maw', 'gloom-cloak', 'pitch', 'dusk', 'soft places'],
    verbs: ['devour', 'swallow', 'smother', 'creep'], adjs: ['devouring', 'lightless', 'black', 'unlit'],
    body: 'the outline blurs and the light stops landing where you are',
  },
};

import { splitLeversFor } from './leverSplit.js';

/** The motifs everything reads: the raw table with `bind` and `ward` replaced
 *  by the halves leverSplit.js assigns. An essence with no entry keeps its old
 *  lever untouched -- and `leverSplitFaults` reports that rather than letting
 *  it pass as deliberate. */
export const ESSENCE_MOTIFS = Object.fromEntries(
  Object.entries(ESSENCE_MOTIFS_RAW).map(([id, m]) => [id,
    { ...m, levers: splitLeversFor(id, m.levers || []) }]));

/** Every motif's levers, validated once at module load. A typo'd lever would
 *  otherwise fail silently as "this essence just has no bias", which is
 *  exactly the invisible degradation this whole round exists to remove. */
const _legal = new Set(Object.keys(LEVERS));
for (const [id, m] of Object.entries(ESSENCE_MOTIFS)) {
  for (const l of m.levers) {
    if (!_legal.has(l)) throw new Error(`essenceMotifs: ${id} has unknown lever ${l}`);
  }
}

export function motifFor(essenceId) {
  return ESSENCE_MOTIFS[essenceId] || null;
}
