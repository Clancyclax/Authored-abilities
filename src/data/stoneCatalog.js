// ROUND 9 -- the FULL awakening stone catalog: every one of the 180 stones
// from the user's HWFWM_TTRPG.xlsx "Awakening Stones" sheet (names and
// rarities verbatim), each with an authored description in the established
// voice, a thematic FAMILY (drives ability-generation bias and DoT flavor
// -- see awakening.js's FAMILY_TRAITS), a theme color, and a flavor phrase
// woven into generated ability descriptions.
//
// The `family` taxonomy is what makes "a variety of abilities per essence
// and awakening stone combination" real: a Wolf stone leans bonded-summon
// and hunt-senses, a Shield stone leans conjured armor, a Venom stone
// leans lingering-poison bolts, a Dimension stone leans blinks -- 28
// families total, each with its own category bias.
//
// Sprites: 12 stones have hand-picked gem art (itemArt.js STONE_SPRITES);
// every other stone falls back to a deterministic hash into the restored
// 61-gem pool -- the prototype's own drawExtraGemIcon technique -- until
// the next sprite upload adds coverage.
export const STONE_CATALOG = {
  stoneAbsolution: { name: 'Absolution', rarity: 'Epic', family: 'order', color: '#e8eaf6', phrase: 'sins washed clean', desc: 'Holding it feels like being forgiven for something you never confessed.' },
  stoneAdept: { name: 'Adept', rarity: 'Common', family: 'mind', color: '#90caf9', phrase: 'practiced mastery', desc: 'Tasks feel half-learned already while it sits in your pocket.' },
  stoneAdventure: { name: 'Adventure', rarity: 'Rare', family: 'motion', color: '#ffb74d', phrase: 'the open road', desc: 'It points no particular direction, yet always seems eager to leave.' },
  stoneApe: { name: 'Ape', rarity: 'Common', family: 'beast', color: '#8d6e63', phrase: 'brute cunning', desc: 'Rough-knuckled to the touch. It grips back.' },
  stoneApocalypse: { name: 'Apocalypse', rarity: 'Legendary', family: 'death', color: '#b71c1c', phrase: 'the world\'s ending', desc: 'Everything reflected in its surface looks like ash.' },
  stoneArmour: { name: 'Armour', rarity: 'Common', family: 'guard', color: '#90a4ae', phrase: 'layered steel', desc: 'It rings like a struck breastplate when tapped.' },
  // ROUND 78 -- STONES KEEP THEIR NAMES. The user, when I renamed this one to
  // follow its essence: "Awakening stones can share names." So the rule (no
  // confluence may also be a regular essence) is about ESSENCES, and the stone
  // catalogue is a separate keyspace that may name a concept the confluence
  // list also names -- a Stone of Wrath is not the Wrath confluence, and five
  // other stones (Karmic, Sky, Undeath, Vision, Wrath) have always done this.
  stoneAvatar: { name: 'Avatar', rarity: 'Legendary', family: 'identity', color: '#ffd54f', phrase: 'transcendent form', desc: 'Your reflection in it stands a little taller than you do.' },
  stoneAxe: { name: 'Axe', rarity: 'Common', family: 'bludgeon', color: '#a1887f', phrase: 'the falling edge', desc: 'One side of it is always, somehow, the sharp side.' },
  // ROUND 73 -- THE ALCHEMY STONES, added because the potion slots needed
  // something to reduce their cooldown and there was nothing. The user asked
  // for these by name: "Awakening stones and Essences that might reduce this
  // time should exist, such as alchemy related stones."
  //
  // `potionCd` is the fraction each one takes off the 60-second potion
  // cooldown, and it is READ -- see POTION_CD_PER_STONE and
  // `_recomputeDerivedStats` in WorldScene. It is on the stone rather than
  // derived from the family so the four can differ: a Catalyst is about speed
  // and takes more off than an Antidote, which is about what is in the bottle.
  // They stack, and the total is capped, so a full rack of them is a build
  // rather than an exploit.
  stoneAlchemy: { name: 'Alchemy', rarity: 'Uncommon', family: 'alchemy', color: '#a5d6a7', phrase: 'the patient transmutation', potionCd: 0.12, desc: 'Left in a pouch overnight, it turns one copper coin in there to something almost gold.' },
  stoneAntidote: { name: 'Antidote', rarity: 'Common', family: 'alchemy', color: '#c5e1a5', phrase: 'the drawn poison', potionCd: 0.08, desc: 'Bitter to hold. The bitterness fades from whatever it touches, into it.' },
  stoneCatalyst: { name: 'Catalyst', rarity: 'Rare', family: 'alchemy', color: '#80deea', phrase: 'the unspent spark', potionCd: 0.18, desc: 'It is never consumed by anything it starts, and it starts a great deal.' },
  stoneCrucible: { name: 'Crucible', rarity: 'Epic', family: 'alchemy', color: '#ffab91', phrase: 'the refining fire', potionCd: 0.15, desc: 'Warm on one face and cold on the other, and it will not say which is which.' },
  stoneBalance: { name: 'Balance', rarity: 'Uncommon', family: 'order', color: '#b0bec5', phrase: 'perfect equilibrium', desc: 'It cannot be made to tip, roll, or fall. It simply settles.' },
  stoneBat: { name: 'Bat', rarity: 'Common', family: 'flyer', color: '#616161', phrase: 'wings in the dark', desc: 'It twitches at sounds too high to hear.' },
  stoneBear: { name: 'Bear', rarity: 'Common', family: 'beast', color: '#795548', phrase: 'ursine bulk', desc: 'Heavier every time you doubt yourself.' },
  stoneBee: { name: 'Bee', rarity: 'Common', family: 'flyer', color: '#fdd835', phrase: 'the tireless swarm', desc: 'It hums, faintly and industriously, dawn to dusk.' },
  stoneBird: { name: 'Bird', rarity: 'Common', family: 'flyer', color: '#81d4fa', phrase: 'effortless flight', desc: 'Toss it and it falls just a little slower than it should.' },
  stoneBlight: { name: 'Blight', rarity: 'Unknown', family: 'death', color: '#827717', phrase: 'creeping rot', desc: 'Grass yellows in a neat ring wherever it rests overnight.' },
  stoneBlood: { name: 'Blood', rarity: 'Uncommon', family: 'blood', color: '#c62828', phrase: 'burning blood', desc: 'It beats, very slowly, when held against the skin.' },
  stoneBone: { name: 'Bone', rarity: 'Uncommon', family: 'death', color: '#e0e0e0', phrase: 'old marrow', desc: 'Dry, porous, and older than any grave you\'ve ever seen.' },
  stoneBow: { name: 'Bow', rarity: 'Common', family: 'ranged', color: '#a5d6a7', phrase: 'the drawn string', desc: 'It hums with tension, like a string held at full draw.' },
  stoneBrush: { name: 'Brush', rarity: 'Unknown', family: 'life', color: '#7cb342', phrase: 'wild undergrowth', desc: 'Tiny burrs cling to it that no one ever finds the plant for.' },
  stoneCage: { name: 'Cage', rarity: 'Common', family: 'guard', color: '#78909c', phrase: 'closing bars', desc: 'Small things circle it warily, as if the door might still shut.' },
  stoneCat: { name: 'Cat', rarity: 'Common', family: 'smallbeast', color: '#ffb74d', phrase: 'silent paws', desc: 'It lands face-up no matter how it\'s dropped.' },
  stoneCattle: { name: 'Cattle', rarity: 'Common', family: 'beast', color: '#bcaaa4', phrase: 'patient strength', desc: 'Warm, placid, and impossible to hurry.' },
  stoneCelestial: { name: 'Celestial', rarity: 'Legendary', family: 'light', color: '#b3e5fc', phrase: 'the high heavens', desc: 'On clear nights it hangs a fraction above your palm.' },
  stoneChain: { name: 'Chain', rarity: 'Common', family: 'craft', color: '#9e9e9e', phrase: 'binding links', desc: 'Whatever pouch it\'s kept in, the drawstring knots itself.' },
  stoneChampion: { name: 'Champion', rarity: 'Epic', family: 'force', color: '#ffca28', phrase: 'the victor\'s roar', desc: 'It sits heaviest in the hand of whoever just lost.' },
  stoneClaw: { name: 'Claw', rarity: 'Uncommon', family: 'blade', color: '#ff8a65', phrase: 'rending talons', desc: 'Its edges catch on everything, though it looks perfectly smooth.' },
  stoneCloth: { name: 'Cloth', rarity: 'Common', family: 'craft', color: '#f8bbd0', phrase: 'woven thread', desc: 'Soft-surfaced stone that folds light around itself like drapery.' },
  stoneCloud: { name: 'Cloud', rarity: 'Uncommon', family: 'air', color: '#eceff1', phrase: 'drifting vapor', desc: 'It weighs almost nothing on cloudy days.' },
  stoneCold: { name: 'Cold', rarity: 'Uncommon', family: 'cold', color: '#b2ebf2', phrase: 'the deep chill', desc: 'Frost forms on its shadow, not its surface.' },
  stoneCoral: { name: 'Coral', rarity: 'Common', family: 'aquatic', color: '#ff8a80', phrase: 'living reef', desc: 'It grows, imperceptibly, and only ever underwater.' },
  stoneCorrupt: { name: 'Corrupt', rarity: 'Epic', family: 'death', color: '#6a1b9a', phrase: 'sweet decay', desc: 'Beautiful, and everything near it slowly becomes less so.' },
  stoneCrocodile: { name: 'Crocodile', rarity: 'Common', family: 'aquatic', color: '#689f38', phrase: 'the patient jaw', desc: 'It waits. That is all it does, and it does it perfectly.' },
  stoneCrystal: { name: 'Crystal', rarity: 'Rare', family: 'earth', color: '#e1bee7', phrase: 'perfect lattice', desc: 'Light entering it comes out sorted by color, and slightly late.' },
  stoneCrops: { name: 'Crops', rarity: 'Divine', family: 'life', color: '#dce775', phrase: 'the golden harvest', desc: 'Fields within sight of it never fail. Farmers fight wars over less.' },
  stoneDance: { name: 'Dance', rarity: 'Uncommon', family: 'motion', color: '#f48fb1', phrase: 'the endless step', desc: 'It rocks in time to music only it can hear.' },
  stoneDark: { name: 'Dark', rarity: 'Uncommon', family: 'dark', color: '#7e57c2', phrase: 'devouring shadow', desc: 'Seems to drink the light around it.' },
  stoneDeath: { name: 'Death', rarity: 'Uncommon', family: 'death', color: '#455a64', phrase: 'the final quiet', desc: 'Flies will not land on it.' },
  stoneDeep: { name: 'Deep', rarity: 'Rare', family: 'water', color: '#1a237e', phrase: 'crushing fathoms', desc: 'Press it to your ear: pressure, cold, and something singing far below.' },
  stoneDeer: { name: 'Deer', rarity: 'Common', family: 'smallbeast', color: '#bcaaa4', phrase: 'startled grace', desc: 'It is always the first thing in the room to notice you.' },
  stoneDefiance: { name: 'Defiance', rarity: 'Epic', family: 'force', color: '#ef5350', phrase: 'the unbowed will', desc: 'It has never once rolled the way it was thrown.' },
  stoneDimension: { name: 'Dimension', rarity: 'Legendary', family: 'space', color: '#7e57c2', phrase: 'folded space', desc: 'Its far side is farther away than it should be.' },
  stoneDiscord: { name: 'Discord', rarity: 'Epic', family: 'dark', color: '#8e24aa', phrase: 'grinding dissonance', desc: 'Two of them in one room will not stop arguing, silently.' },
  stoneDog: { name: 'Dog', rarity: 'Common', family: 'beast', color: '#a1887f', phrase: 'loyal fangs', desc: 'It is inexplicably pleased to see you, every single time.' },
  stoneDominion: { name: 'Dominion', rarity: 'Divine', family: 'identity', color: '#ffd54f', phrase: 'sovereign right', desc: 'Other stones arrange themselves around it when no one is watching.' },
  stoneDuck: { name: 'Duck', rarity: 'Common', family: 'flyer', color: '#aed581', phrase: 'unbothered calm', desc: 'Water rolls off it. So, somehow, does misfortune.' },
  stoneDust: { name: 'Dust', rarity: 'Uncommon', family: 'earth', color: '#bcaaa4', phrase: 'the settling grey', desc: 'It is always the last thing to settle and the first to rise.' },
  stoneEarth: { name: 'Earth', rarity: 'Common', family: 'earth', color: '#a1887f', phrase: 'jagged stone', desc: 'Heavy and dense, older than the hills it was pulled from.' },
  stoneEcho: { name: 'Echo', rarity: 'Rare', family: 'mind', color: '#b39ddb', phrase: 'returning sound', desc: 'Speak near it and your words come back a heartbeat late, slightly kinder.' },
  stoneElastic: { name: 'Elastic', rarity: 'Epic', family: 'space', color: '#80cbc4', phrase: 'yielding rebound', desc: 'Squeeze it and it takes your hand\'s shape; let go and it forgets, slowly.' },
  stoneElemental: { name: 'Elemental', rarity: 'Epic', family: 'identity', color: '#4dd0e1', phrase: 'raw element', desc: 'Warm on one face, cold on another, humming on a third.' },
  stoneEye: { name: 'Eye', rarity: 'Common', family: 'mind', color: '#4fc3f7', phrase: 'the unblinking gaze', desc: 'You can never quite shake the feeling that it has noticed you first.' },
  stoneFeast: { name: 'Feast', rarity: 'Common', family: 'blood', color: '#ff7043', phrase: 'the laden table', desc: 'Food near it never spoils, and never lasts either.' },
  stoneFeeble: { name: 'Feeble', rarity: 'Unknown', family: 'death', color: '#9e9e9e', phrase: 'stolen strength', desc: 'Lifting it is easy. Putting it down leaves you tired.' },
  stoneFire: { name: 'Fire', rarity: 'Common', family: 'fire', color: '#ff7043', phrase: 'searing flame', desc: 'Warm to the touch, with a slow inner smoulder that never quite goes out.' },
  stoneFish: { name: 'Fish', rarity: 'Common', family: 'aquatic', color: '#4fc3f7', phrase: 'the silver shoal', desc: 'It slips from your grip exactly as often as it wants to.' },
  stoneFlea: { name: 'Flea', rarity: 'Common', family: 'smallbeast', color: '#8d6e63', phrase: 'impossible leaps', desc: 'Blink and it is on the other side of the table.' },
  stoneFlesh: { name: 'Flesh', rarity: 'Uncommon', family: 'blood', color: '#ef9a9a', phrase: 'living meat', desc: 'Warm. Faintly yielding. Best not held for long.' },
  stoneFocus: { name: 'Focus', rarity: 'Uncommon', family: 'mind', color: '#7986cb', phrase: 'narrowed intent', desc: 'The room grows quieter the longer you look at it.' },
  stoneFoot: { name: 'Foot', rarity: 'Common', family: 'motion', color: '#bcaaa4', phrase: 'the long march', desc: 'Roads feel shorter with it in your boot. Not comfortable -- shorter.' },
  stoneFork: { name: 'Fork', rarity: 'Common', family: 'polearm', color: '#b0bec5', phrase: 'the branching point', desc: 'It always comes to rest pointing two ways at once.' },
  stoneFox: { name: 'Fox', rarity: 'Common', family: 'smallbeast', color: '#ff8a65', phrase: 'sly mischief', desc: 'Count your coins after handling it. The count will be right -- barely.' },
  stoneFrog: { name: 'Frog', rarity: 'Common', family: 'aquatic', color: '#81c784', phrase: 'sudden springs', desc: 'Damp, patient, and gone the moment you glance away.' },
  stoneFungus: { name: 'Fungus', rarity: 'Common', family: 'life', color: '#bcaaa4', phrase: 'quiet spores', desc: 'It was slightly larger this morning. It always was.' },
  stoneGathering: { name: 'Gathering', rarity: 'Rare', family: 'space', color: '#9575cd', phrase: 'drawn-together things', desc: 'Lost buttons, stray pins, old keys -- they all end up beside it.' },
  stoneGlass: { name: 'Glass', rarity: 'Uncommon', family: 'earth', color: '#e0f7fa', phrase: 'fragile clarity', desc: 'Transparent from one side only. It chooses which.' },
  stoneGoat: { name: 'Goat', rarity: 'Common', family: 'beast', color: '#bcaaa4', phrase: 'sure-footed stubbornness', desc: 'It cannot be knocked off any surface it decides to occupy.' },
  stoneGrazen: { name: 'Grazen', rarity: 'Common', family: 'beast', color: '#a1887f', phrase: 'herd-warm patience', desc: 'A steady, grazing warmth, like a barn in winter.' },
  stoneGrowth: { name: 'Growth', rarity: 'Uncommon', family: 'life', color: '#8bc34a', phrase: 'unstoppable growth', desc: 'Fine green tendrils cross its surface -- more of them each morning.' },
  stoneGun: { name: 'Gun', rarity: 'Common', family: 'ranged', color: '#78909c', phrase: 'the sudden report', desc: 'It smells faintly of smoke that hasn\'t happened yet.' },
  stoneHair: { name: 'Hair', rarity: 'Common', family: 'craft', color: '#8d6e63', phrase: 'ten thousand strands', desc: 'Fine filaments cover it, always combed, never by you.' },
  stoneHammer: { name: 'Hammer', rarity: 'Common', family: 'bludgeon', color: '#6d4c41', phrase: 'the flattening blow', desc: 'Everything it rests on ends up slightly more level.' },
  stoneHand: { name: 'Hand', rarity: 'Common', family: 'craft', color: '#ffcc80', phrase: 'the steady grip', desc: 'It fits every palm perfectly, including ones far too small.' },
  stoneHarmonic: { name: 'Harmonic', rarity: 'Epic', family: 'order', color: '#81d4fa', phrase: 'perfect resonance', desc: 'Hum any note near it and the note comes back in tune.' },
  stoneHealer: { name: 'Healer', rarity: 'Divine', family: 'life', color: '#a5d6a7', phrase: 'the mending touch', desc: 'Old scars ache less in the room where it is kept.' },
  stoneHeidel: { name: 'Heidel', rarity: 'Common', family: 'beast', color: '#a1887f', phrase: 'tireless hooves', desc: 'It is warm the way a long-ridden mount is warm.' },
  stoneHook: { name: 'Hook', rarity: 'Common', family: 'polearm', color: '#90a4ae', phrase: 'the catching barb', desc: 'Whatever you reach for, it is somehow already snagged on this.' },
  stoneHorse: { name: 'Horse', rarity: 'Common', family: 'motion', color: '#8d6e63', phrase: 'thundering gallop', desc: 'Hold it and distant hoofbeats keep your heart\'s time.' },
  stoneHunger: { name: 'Hunger', rarity: 'Rare', family: 'blood', color: '#d32f2f', phrase: 'the empty maw', desc: 'It is lighter after meals. Yours.' },
  stoneHunt: { name: 'Hunt', rarity: 'Common', family: 'mind', color: '#8bc34a', phrase: 'the closing chase', desc: 'It warms when something you\'re looking for is near.' },
  stoneIce: { name: 'Ice', rarity: 'Uncommon', family: 'cold', color: '#81d4fa', phrase: 'biting frost', desc: 'Stays frozen in a closed fist on a summer day.' },
  stoneInevitability: { name: 'Inevitability', rarity: 'Epic', family: 'space', color: '#546e7a', phrase: 'what must come', desc: 'Drop it, and it lands where it was always going to.' },
  stoneIron: { name: 'Iron', rarity: 'Common', family: 'guard', color: '#8b93a6', phrase: 'cold iron', desc: 'Cold, grey, and utterly unyielding.' },
  stoneJudgement: { name: 'Judgement', rarity: 'Rare', family: 'order', color: '#ffd54f', phrase: 'the weighed verdict', desc: 'Liars find its surface uncomfortably warm.' },
  stoneJustice: { name: 'Justice', rarity: 'Divine', family: 'order', color: '#fff176', phrase: 'the leveled scale', desc: 'Stolen goods carried beside it grow unbearably heavy.' },
  stoneKarmic: { name: 'Karmic', rarity: 'Legendary', family: 'order', color: '#ce93d8', phrase: 'debts repaid', desc: 'Kindness done while carrying it has a way of circling back armed.' },
  stoneKnife: { name: 'Knife', rarity: 'Common', family: 'blade', color: '#e0e0e0', phrase: 'the hidden edge', desc: 'It is always closer to hand than you remember leaving it.' },
  stoneKnowledge: { name: 'Knowledge', rarity: 'Uncommon', family: 'mind', color: '#9fa8da', phrase: 'the turning page', desc: 'Books left open near it are found open to the useful part.' },
  stoneLife: { name: 'Life', rarity: 'Uncommon', family: 'life', color: '#aed581', phrase: 'stubborn vitality', desc: 'Cut flowers last weeks in the same room as it.' },
  stoneLight: { name: 'Light', rarity: 'Uncommon', family: 'light', color: '#ffd54f', phrase: 'blinding light', desc: 'Glows softly at dusk, like a coal of pure daylight.' },
  stoneLightning: { name: 'Lightning', rarity: 'Uncommon', family: 'storm', color: '#fff176', phrase: 'arcing lightning', desc: 'Crackles faintly when two are carried together.' },
  stoneLizard: { name: 'Lizard', rarity: 'Common', family: 'serpent', color: '#9ccc65', phrase: 'cold-blooded stillness', desc: 'It suns itself. On overcast days it sulks.' },
  stoneLocust: { name: 'Locust', rarity: 'Common', family: 'flyer', color: '#c0ca33', phrase: 'the devouring cloud', desc: 'Grain stores count themselves nervously around it.' },
  stoneLurker: { name: 'Lurker', rarity: 'Unknown', family: 'dark', color: '#37474f', phrase: 'the watcher below', desc: 'It is always in the darkest corner of wherever it is kept.' },
  stoneMagic: { name: 'Magic', rarity: 'Common', family: 'mind', color: '#ba68c8', phrase: 'raw arcana', desc: 'Candlelight bends toward it, just slightly, like a bow.' },
  stoneMagus: { name: 'Magus', rarity: 'Common', family: 'mind', color: '#9575cd', phrase: 'the practiced word', desc: 'Written spells near it correct their own spelling.' },
  stoneMalign: { name: 'Malign', rarity: 'Epic', family: 'dark', color: '#7b1fa2', phrase: 'patient spite', desc: 'It has never done anything wrong that anyone could prove.' },
  stoneManatee: { name: 'Manatee', rarity: 'Common', family: 'aquatic', color: '#90a4ae', phrase: 'unhurried drift', desc: 'Nothing about your day feels urgent while you hold it.' },
  stoneMight: { name: 'Might', rarity: 'Common', family: 'force', color: '#ffab40', phrase: 'overwhelming force', desc: 'Jars open easily in the household that keeps it.' },
  stoneMirror: { name: 'Mirror', rarity: 'Uncommon', family: 'identity', color: '#cfd8dc', phrase: 'the answering image', desc: 'Its reflection of you is a half-second behind, and knows it.' },
  stoneMoment: { name: 'Moment', rarity: 'Epic', family: 'space', color: '#4dd0e1', phrase: 'the held instant', desc: 'Water drips slower beside it. Guests stay longer.' },
  stoneMonkey: { name: 'Monkey', rarity: 'Common', family: 'smallbeast', color: '#a1887f', phrase: 'clever fingers', desc: 'Knots tied around it are found untied, and neatly coiled.' },
  stoneMoon: { name: 'Moon', rarity: 'Rare', family: 'light', color: '#e8eaf6', phrase: 'the pale tide-puller', desc: 'It waxes and wanes a day behind the sky.' },
  stoneMouse: { name: 'Mouse', rarity: 'Common', family: 'smallbeast', color: '#bdbdbd', phrase: 'unseen scurrying', desc: 'Cats stare at it for hours. It outlasts them.' },
  stoneMyriad: { name: 'Myriad', rarity: 'Legendary', family: 'space', color: '#b39ddb', phrase: 'countless selves', desc: 'Every glance finds a slightly different stone.' },
  stoneNeedle: { name: 'Needle', rarity: 'Common', family: 'blade', color: '#eeeeee', phrase: 'the precise point', desc: 'It finds the gap in everything -- cloth, armor, arguments.' },
  stoneNet: { name: 'Net', rarity: 'Common', family: 'craft', color: '#a5d6a7', phrase: 'the closing mesh', desc: 'Things dropped near it are caught before they land. Usually by it.' },
  stoneOctopus: { name: 'Octopus', rarity: 'Common', family: 'aquatic', color: '#ce93d8', phrase: 'eight patient arms', desc: 'It has moved. No one has ever seen it move.' },
  stoneOmen: { name: 'Omen', rarity: 'Epic', family: 'mind', color: '#ffb74d', phrase: 'the read sign', desc: 'Birds cross the sky above it in numbers that mean something.' },
  stoneOmens: { name: 'Omens', rarity: 'Epic', family: 'mind', color: '#ff8a65', phrase: 'converging portents', desc: 'Its warnings come in threes, and the third is always right.' },
  stonePangolin: { name: 'Pangolin', rarity: 'Common', family: 'guard', color: '#bcaaa4', phrase: 'overlapping scales', desc: 'Rolled against danger, its seams simply vanish.' },
  stonePaper: { name: 'Paper', rarity: 'Common', family: 'craft', color: '#fff9c4', phrase: 'the written word', desc: 'Feather-light, and impossible to tear along the grain of your intent.' },
  stonePeace: { name: 'Peace', rarity: 'Divine', family: 'order', color: '#c5e1a5', phrase: 'the laid-down blade', desc: 'Arguments in its presence trail off, unembarrassed, unfinished.' },
  stonePersistence: { name: 'Persistence', rarity: 'Rare', family: 'force', color: '#8d6e63', phrase: 'the unbroken effort', desc: 'Dripping water wore a channel in it once. It grew back.' },
  stonePlant: { name: 'Plant', rarity: 'Common', family: 'life', color: '#81c784', phrase: 'patient rootwork', desc: 'Left on soil, it is found half-buried by morning -- roots down.' },
  stonePotent: { name: 'Potent', rarity: 'Epic', family: 'force', color: '#ff7043', phrase: 'concentrated power', desc: 'Everything brewed, forged, or sworn near it comes out stronger.' },
  stonePreparation: { name: 'Preparation', rarity: 'Uncommon', family: 'mind', color: '#a5d6a7', phrase: 'the readied plan', desc: 'You packed exactly what you needed today. It approves.' },
  stonePure: { name: 'Pure', rarity: 'Uncommon', family: 'light', color: '#ffffff', phrase: 'undiluted essence', desc: 'Water clears beside it. So, briefly, do intentions.' },
  stonePurgation: { name: 'Purgation', rarity: 'Epic', family: 'order', color: '#ffab91', phrase: 'the cleansing burn', desc: 'It is warm the way a fever breaking is warm.' },
  stoneRabbit: { name: 'Rabbit', rarity: 'Common', family: 'smallbeast', color: '#f5f5f5', phrase: 'the bolting sprint', desc: 'It is soft, alert, and already gone.' },
  stoneRain: { name: 'Rain', rarity: 'Common', family: 'water', color: '#90caf9', phrase: 'the falling grey', desc: 'It is always the first thing in the house to smell the storm.' },
  stoneRake: { name: 'Rake', rarity: 'Common', family: 'polearm', color: '#a1887f', phrase: 'gathered leavings', desc: 'The ground around it is always suspiciously tidy.' },
  stoneRat: { name: 'Rat', rarity: 'Common', family: 'smallbeast', color: '#9e9e9e', phrase: 'the surviving swarm', desc: 'Whatever happens to the ship, this will not go down with it.' },
  stoneReach: { name: 'Reach', rarity: 'Uncommon', family: 'space', color: '#80deea', phrase: 'the extended grasp', desc: 'Shelf-top things are, around it, mysteriously within arm\'s length.' },
  stoneReaper: { name: 'Reaper', rarity: 'Legendary', family: 'death', color: '#7e57c2', phrase: 'the final harvest', desc: 'Wheat bows as you pass while you carry it. So do old soldiers.' },
  stoneRebirth: { name: 'Rebirth', rarity: 'Legendary', family: 'life', color: '#ff8a50', phrase: 'the returning flame', desc: 'Broken beside it, things are later found mended -- and changed.' },
  stoneRenewal: { name: 'Renewal', rarity: 'Epic', family: 'life', color: '#66bb6a', phrase: 'the turning season', desc: 'It smells faintly of the first day of spring, all year.' },
  stoneResolute: { name: 'Resolute', rarity: 'Rare', family: 'force', color: '#78909c', phrase: 'the planted foot', desc: 'Once set down deliberately, it takes two hands to lift.' },
  stoneRuin: { name: 'Ruin', rarity: 'Rare', family: 'death', color: '#8d6e63', phrase: 'what remains', desc: 'It looks like the last standing stone of something vast.' },
  stoneRune: { name: 'Rune', rarity: 'Epic', family: 'mind', color: '#ffcc80', phrase: 'the graven word', desc: 'Markings surface and fade on it, always almost legible.' },
  stoneSand: { name: 'Sand', rarity: 'Uncommon', family: 'earth', color: '#ffe082', phrase: 'numberless grains', desc: 'It sheds a pinch of sand daily and never grows smaller.' },
  stoneSceptre: { name: 'Sceptre', rarity: 'Common', family: 'polearm', color: '#ffd54f', phrase: 'the raised authority', desc: 'Held aloft, it makes any announcement feel official.' },
  stoneSerene: { name: 'Serene', rarity: 'Rare', family: 'order', color: '#b2dfdb', phrase: 'untroubled water', desc: 'Your breathing slows to match something inside it.' },
  stoneShark: { name: 'Shark', rarity: 'Common', family: 'aquatic', color: '#78909c', phrase: 'the circling hunger', desc: 'It drifts toward the smell of blood, an inch an hour.' },
  stoneShield: { name: 'Shield', rarity: 'Common', family: 'guard', color: '#4fc3f7', phrase: 'the raised guard', desc: 'Thrown objects miss whoever carries it, narrowly, every time.' },
  stoneShimmer: { name: 'Shimmer', rarity: 'Epic', family: 'light', color: '#f8bbd0', phrase: 'dancing light', desc: 'It is never quite the color you remember it being.' },
  stoneShip: { name: 'Ship', rarity: 'Common', family: 'motion', color: '#8d6e63', phrase: 'the leaning sail', desc: 'It rocks gently at rest, riding a swell that isn\'t there.' },
  stoneShovel: { name: 'Shovel', rarity: 'Common', family: 'polearm', color: '#a1887f', phrase: 'turned earth', desc: 'Soil parts around it eagerly, as if remembering.' },
  stoneSickle: { name: 'Sickle', rarity: 'Common', family: 'blade', color: '#c5e1a5', phrase: 'the curved harvest', desc: 'Grass leans toward it, offering.' },
  stoneSin: { name: 'Sin', rarity: 'Legendary', family: 'dark', color: '#880e4f', phrase: 'the cherished wrong', desc: 'It is exactly as heavy as the worst thing you ever did.' },
  stoneSkunk: { name: 'Skunk', rarity: 'Common', family: 'smallbeast', color: '#424242', phrase: 'the lingering warning', desc: 'Nothing hunts it twice.' },
  stoneSky: { name: 'Sky', rarity: 'Epic', family: 'air', color: '#81d4fa', phrase: 'the open blue', desc: 'Looking at it too long gives you vertigo -- upward.' },
  stoneSloth: { name: 'Sloth', rarity: 'Common', family: 'beast', color: '#a1887f', phrase: 'unhurried certainty', desc: 'It gets everywhere it means to go. Eventually.' },
  stoneSmoke: { name: 'Smoke', rarity: 'Uncommon', family: 'dark', color: '#90a4ae', phrase: 'the vanishing veil', desc: 'Its edges blur when watched directly.' },
  stoneSnake: { name: 'Snake', rarity: 'Common', family: 'serpent', color: '#9ccc65', phrase: 'venomous patience', desc: 'It is warmer on the side facing you.' },
  stoneSong: { name: 'Song', rarity: 'Uncommon', family: 'order', color: '#f48fb1', phrase: 'the carrying melody', desc: 'Hum near it and strangers hum your tune for days.' },
  stoneSpear: { name: 'Spear', rarity: 'Common', family: 'polearm', color: '#7c93a3', phrase: 'the thrown point', desc: 'It always comes to rest aimed at the door.' },
  stoneSpider: { name: 'Spider', rarity: 'Common', family: 'serpent', color: '#616161', phrase: 'the patient web', desc: 'Fine silk lines anchor it to the room, respun nightly.' },
  stoneSpike: { name: 'Spike', rarity: 'Common', family: 'blade', color: '#90a4ae', phrase: 'the waiting point', desc: 'However it is set down, something sharp faces up.' },
  stoneStaff: { name: 'Staff', rarity: 'Common', family: 'polearm', color: '#a1887f', phrase: 'the traveler\'s third leg', desc: 'Lean on it in spirit and it holds.' },
  stoneStar: { name: 'Star', rarity: 'Rare', family: 'light', color: '#fff59d', phrase: 'the distant fire', desc: 'It twinkles. Stones should not twinkle.' },
  stoneStars: { name: 'Stars', rarity: 'Epic', family: 'light', color: '#e1bee7', phrase: 'the wheeling host', desc: 'Pinpricks of light drift across it in constellations no chart shows.' },
  stoneSun: { name: 'Sun', rarity: 'Rare', family: 'light', color: '#ffb300', phrase: 'the noon blaze', desc: 'Shadows near it fall at noon\'s angle, all day.' },
  stoneSurge: { name: 'Surge', rarity: 'Epic', family: 'storm', color: '#4dd0e1', phrase: 'the rising crest', desc: 'Everything it touches happens slightly more at once.' },
  stoneSwift: { name: 'Swift', rarity: 'Common', family: 'motion', color: '#4dd0e1', phrase: 'quicksilver speed', desc: 'It always seems to reach your hand a moment before you go looking for it.' },
  stoneSword: { name: 'Sword', rarity: 'Common', family: 'blade', color: '#d7dee3', phrase: 'the drawn blade', desc: 'It sings, very quietly, when drawn across a whetstone it never needs.' },
  stoneTechnology: { name: 'Technology', rarity: 'Common', family: 'craft', color: '#80cbc4', phrase: 'clever mechanism', desc: 'Fine seams cross its surface. Sometimes they are elsewhere.' },
  stoneTentacle: { name: 'Tentacle', rarity: 'Epic', family: 'aquatic', color: '#7e57c2', phrase: 'the grasping deep', desc: 'It is holding something. It has always been holding something.' },
  stoneThread: { name: 'Thread', rarity: 'Common', family: 'craft', color: '#f8bbd0', phrase: 'the binding strand', desc: 'A single loose thread trails from it, connected to nothing, taut.' },
  stoneTrap: { name: 'Trap', rarity: 'Common', family: 'craft', color: '#8d6e63', phrase: 'the sprung jaw', desc: 'Reaching for it always takes a heartbeat of courage.' },
  stoneTree: { name: 'Tree', rarity: 'Common', family: 'life', color: '#66bb6a', phrase: 'the standing green', desc: 'Rings mark its heart, one more each year.' },
  stoneTrowel: { name: 'Trowel', rarity: 'Common', family: 'polearm', color: '#bcaaa4', phrase: 'the mason\'s line', desc: 'Walls raised near it stand truer than the plumb line says.' },
  stoneTurtle: { name: 'Turtle', rarity: 'Common', family: 'guard', color: '#81c784', phrase: 'the patient shell', desc: 'Nothing has ever gotten into it. Nothing has seen it try.' },
  stoneUndeath: { name: 'Undeath', rarity: 'Divine', family: 'death', color: '#78909c', phrase: 'the refused grave', desc: 'It is cold, and it is not resting.' },
  stoneVast: { name: 'Vast', rarity: 'Legendary', family: 'space', color: '#9575cd', phrase: 'the borderless whole', desc: 'It is small in the hand and enormous in the mind.' },
  // ROUND 294 -- stoneVehicle removed: "Remove the awakening stone of the vehicle from the game.
  // The essence should stay but the stone just doesn't work thematically." Saves that
  // socketed it are moved to Wheel (WorldScene `_rebuildAbilities`, RETIRED_STONES).
  stoneVenom: { name: 'Venom', rarity: 'Uncommon', family: 'serpent', color: '#9ccc65', phrase: 'slow-working poison', desc: 'A drop of something beads on it, forever about to fall.' },
  stoneVisage: { name: 'Visage', rarity: 'Legendary', family: 'identity', color: '#ce93d8', phrase: 'the worn face', desc: 'From the corner of the eye it has features. Familiar ones.' },
  stoneVision: { name: 'Vision', rarity: 'Uncommon', family: 'mind', color: '#4fc3f7', phrase: 'the far sight', desc: 'Stare through it at the horizon and the horizon steps closer.' },
  stoneVoid: { name: 'Void', rarity: 'Legendary', family: 'dark', color: '#311b92', phrase: 'the hungry nothing', desc: 'It casts no shadow. It is one.' },
  stoneWar: { name: 'War', rarity: 'Divine', family: 'force', color: '#c62828', phrase: 'the marching drum', desc: 'Steel within a room of it will not stay sheathed unattended.' },
  stoneWasp: { name: 'Wasp', rarity: 'Common', family: 'flyer', color: '#fdd835', phrase: 'the vindictive sting', desc: 'It remembers being swatted at. It remembers everything.' },
  stoneWater: { name: 'Water', rarity: 'Common', family: 'water', color: '#29b6f6', phrase: 'crushing water', desc: 'Cool and faintly damp, no matter how long it\'s carried.' },
  stoneWhale: { name: 'Whale', rarity: 'Common', family: 'aquatic', color: '#546e7a', phrase: 'the deep song', desc: 'Press it to your chest and something enormous answers, far away.' },
  stoneWheel: { name: 'Wheel', rarity: 'Common', family: 'motion', color: '#a1887f', phrase: 'the turning rim', desc: 'It rolls uphill exactly as easily as down.' },
  stoneWhip: { name: 'Whip', rarity: 'Common', family: 'blade', color: '#8d6e63', phrase: 'the cracking lash', desc: 'Snap your wrist while holding it and the air flinches.' },
  stoneWind: { name: 'Wind', rarity: 'Common', family: 'air', color: '#b2ff59', phrase: 'razor wind', desc: 'Unnaturally light. Hums faintly in a stiff breeze.' },
  stoneWing: { name: 'Wing', rarity: 'Epic', family: 'flyer', color: '#e1f5fe', phrase: 'the beating pinion', desc: 'Falling with it in hand takes noticeably longer than it should.' },
  stoneWolf: { name: 'Wolf', rarity: 'Common', family: 'beast', color: '#90a4ae', phrase: 'the pack\'s teeth', desc: 'Alone it is quiet. Near others of its kind it is warm.' },
  stoneWood: { name: 'Wood', rarity: 'Unknown', family: 'life', color: '#8d6e63', phrase: 'living grain', desc: 'It is stone to the eye and timber to the palm.' },
  stoneWrath: { name: 'Wrath', rarity: 'Uncommon', family: 'force', color: '#e53935', phrase: 'banked fury', desc: 'It is hot-tempered glass-smooth rage, patiently waiting for a reason.' },
  stoneZeal: { name: 'Zeal', rarity: 'Rare', family: 'force', color: '#ff7043', phrase: 'burning conviction', desc: 'Held aloft, it makes any cause feel briefly, dangerously simple.' },
};

// ROUND 65 -- THE GODS' OWN STONES.
//
// Eight Divine-rarity stones, one per god, paid by the region-1 chapter of that
// god's DISCIPLE chain. They join the catalogue rather than living in a
// parallel list, so a god stone sockets, generates abilities, draws its icon
// and reads its tooltip through exactly the same code as the other 180 -- the
// alternative was a second stone system that would have had to be taught to
// every one of those places separately.
//
// What they must NOT do is turn up anywhere else. `godOnly` marks them, and
// the three places a stone can otherwise reach a player -- the monster drop
// table, a shop shelf, and a landmark's find -- all filter on it. A stone the
// god gives you personally, that a spider could also drop, is not a reward.
import { godStoneEntries } from './godQuests.js';
Object.assign(STONE_CATALOG, godStoneEntries());

/** True for a stone only a god may hand over. */
export function isGodStone(id) {
  const s = STONE_CATALOG[id];
  return !!(s && s.godOnly);
}
/** Which god's, or null. */
export function godOfStone(id) {
  const s = STONE_CATALOG[id];
  return (s && s.godOnly) || null;
}

// Compatibility exports -- inventory.js re-exports these so every existing
// STONE_DEFS/STONE_IDS consumer keeps working unchanged.
export const STONE_DEFS = Object.fromEntries(Object.entries(STONE_CATALOG).map(([id, s]) => [id, {
  id, name: `Awakening Stone of ${s.name}`, rarity: s.rarity, desc: s.desc,
}]));
export const STONE_IDS = Object.keys(STONE_CATALOG);

// Rarity drop weights (round 9): commons carry the loot table, the divine
// stones are once-a-campaign finds. 'Unknown' (the sheet's five oddities)
// drops about like a rare.
export const STONE_RARITY_WEIGHTS = { Common: 100, Uncommon: 40, Rare: 14, Epic: 6, Legendary: 2, Divine: 1, Unknown: 12 };
export function rollStoneDrop(rng = Math.random) {
  // ROUND 65 -- the god stones are excluded here rather than given weight 0,
  // because a weight of zero is still an entry somebody can later "fix".
  const pool = STONE_IDS.filter(id => !STONE_CATALOG[id].godOnly);
  let total = 0;
  for (const id of pool) total += STONE_RARITY_WEIGHTS[STONE_CATALOG[id].rarity] || 10;
  let r = rng() * total;
  for (const id of pool) {
    r -= STONE_RARITY_WEIGHTS[STONE_CATALOG[id].rarity] || 10;
    if (r <= 0) return id;
  }
  return pool[0];
}

/** ROUND 294 -- stones taken out of the game, and what a save holding one gets
 *  instead. Applied once per rebuild; a retired id never reaches the generator. */
export const RETIRED_STONES = { stoneVehicle: 'stoneWheel' };
