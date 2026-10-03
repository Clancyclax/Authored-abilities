// ============================================================================
// ROUND 134 (item 6) -- THE EDITOR'S OWN FILE.
//
// The user: "Maps and cities should be editable within the sparkstone editor
// tool on the desktop", and, asked what was missing, named two things: city
// layouts -- the buildings inside a settlement -- and region terrain, the
// biome bands and the coastline.
//
// Both are expressible in data the game already reads or now reads:
//
//   placed    src/data/placed.js -- round 107's override layer. A `structure`
//             entry puts a building on a tile; this round's `blank` entry
//             takes one away, by claiming ground the town generator must keep
//             off. Move is the two together.
//   terrain   this round -- a list of painted rectangles, each naming one of
//             the five terrain surfaces, rasterised over `tileType` after
//             every generator has had its say.
//
// WHY THEY LIVE HERE AND NOT IN `regions.js`.
//
// The editor writes `regions.js` by SURGICAL BYTE EDIT: it finds the exact
// span of a coordinate or an array and replaces those bytes, so an edit to a
// road cannot disturb the four hundred lines of comment around it. That works
// because every array it touches already exists in the file at a known place.
//
// `placed` and `terrain` do not. Six of the seven regions have neither, so
// writing one means INSERTING a property into a region object -- finding the
// right brace, guessing the indentation, and hoping the next edit finds the
// same place. That is the class of operation that turns a 1,100-line authored
// file into an unparseable one, and `regions.js` is the file that describes
// the world.
//
// So the editor writes THIS file instead, whole, every time. A whole-file
// rewrite cannot corrupt anything; it diffs cleanly because the emitter is
// deterministic; and `regions.js` stays a file a person authored rather than
// a file a tool has been editing around the edges of.
//
// The shape is one entry per region id, and every field is optional -- a
// region with nothing edited is simply absent.
//
// HAND EDITS ARE FINE. Nothing here is generated from anything; it is just
// data, and the data lane checks it exactly as it checks the arrays inside
// `regions.js`. The editor is the convenient way to write it, not the only
// one.
// ============================================================================

// ROUND 187 -- CADENCE'S HAND-LAID RAMPART IS GONE FROM THIS FILE.
//
//   "Remove my handplaced walls, fill in the gaps on the border walls"
//
// Sixty-two stones, laid in the editor around a capital 127 tiles across. The
// capital is 443 tiles across now, traced from a new drawing, and moved 130
// tiles west to step out of the river -- so the circuit enclosed nothing and
// stood inside the new city cutting it in half. Round 187 had already stopped
// READING them as Cadence's wall (nek_city came off HAND_WALLED); this deletes
// the stones themselves, which is what the user asked for and what stops them
// being drawn as loose masonry in the middle of the streets.
//
// ONLY THE `nek` BLOCK. Ontaria's 78 hand-laid stones are Harrowmoor's rampart
// and are untouched -- ont_city is still in HAND_WALLED and still walled by
// hand. The delete was scoped to the nek region's own lines rather than run
// over the file.
export const REGION_EDITS = {
  nek: {
    placed: [
      { kind: 'blank', at: { tx: 830, ty: 1350 }, radius: 5 },
      { kind: 'blank', at: { tx: 917, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 923, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 928, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 933, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 933, ty: 1082 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1081 }, radius: 1 },
      { kind: 'blank', at: { tx: 932, ty: 1081 }, radius: 1 },
      { kind: 'blank', at: { tx: 931, ty: 1078 }, radius: 1 },
      { kind: 'blank', at: { tx: 936, ty: 1077 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1076 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1069 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1063 }, radius: 1 },
      { kind: 'blank', at: { tx: 914, ty: 1084 }, radius: 4 },
      { kind: 'blank', at: { tx: 902, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 897, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 897, ty: 1085 }, radius: 4 },
      { kind: 'blank', at: { tx: 892, ty: 1082 }, radius: 4 },
      { kind: 'blank', at: { tx: 887, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 901, ty: 1090 }, radius: 4 },
      { kind: 'blank', at: { tx: 894, ty: 1090 }, radius: 4 },
      { kind: 'blank', at: { tx: 892, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 881, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 876, ty: 1079 }, radius: 1 },
      { kind: 'blank', at: { tx: 876, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 871, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 866, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 860, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 854, ty: 1081 }, radius: 4 },
      { kind: 'blank', at: { tx: 848, ty: 1084 }, radius: 4 },
      { kind: 'blank', at: { tx: 843, ty: 1088 }, radius: 4 },
      { kind: 'blank', at: { tx: 855, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 850, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 845, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 839, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1074 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1070 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1064 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1059 }, radius: 1 },
      { kind: 'blank', at: { tx: 842, ty: 1062 }, radius: 4 },
      { kind: 'blank', at: { tx: 834, ty: 1054 }, radius: 1 },
      { kind: 'blank', at: { tx: 842, ty: 1050 }, radius: 4 },
      { kind: 'blank', at: { tx: 842, ty: 1038 }, radius: 4 },
      { kind: 'blank', at: { tx: 834, ty: 1049 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1043 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1038 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1033 }, radius: 1 },
      { kind: 'blank', at: { tx: 842, ty: 1026 }, radius: 4 },
      { kind: 'blank', at: { tx: 842, ty: 1014 }, radius: 4 },
      { kind: 'blank', at: { tx: 834, ty: 1028 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1022 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1017 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1012 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1007 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 1001 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 990 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 985 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 979 }, radius: 1 },
      { kind: 'blank', at: { tx: 834, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 839, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 845, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 850, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 855, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 860, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 866, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 871, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 876, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 881, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 887, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 892, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 902, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 897, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 921, ty: 1063 }, radius: 4 },
      { kind: 'blank', at: { tx: 921, ty: 1062 }, radius: 4 },
      { kind: 'blank', at: { tx: 921, ty: 1050 }, radius: 4 },
      { kind: 'blank', at: { tx: 921, ty: 1038 }, radius: 4 },
      { kind: 'blank', at: { tx: 934, ty: 1058 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1053 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1048 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1042 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1037 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1032 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1027 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1021 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1016 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1011 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1006 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 1000 }, radius: 1 },
      { kind: 'blank', at: { tx: 940, ty: 1014 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 995 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 990 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 985 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 979 }, radius: 1 },
      { kind: 'blank', at: { tx: 934, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 921, ty: 978 }, radius: 4 },
      { kind: 'blank', at: { tx: 928, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 923, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 917, ty: 974 }, radius: 1 },
      { kind: 'blank', at: { tx: 842, ty: 987 }, radius: 4 },
      { kind: 'blank', at: { tx: 800, ty: 1278 }, radius: 4 },
      { kind: 'structure', key: 'barn_v1', at: { tx: 805, ty: 1283 }, facing: 'northeast' },
      { kind: 'blank', at: { tx: 782, ty: 1295 }, radius: 4 },
      { kind: 'structure', key: 'barn', at: { tx: 785, ty: 1302 }, facing: 'northeast' },
      { kind: 'blank', at: { tx: 757, ty: 1311 }, radius: 4 },
      { kind: 'structure', key: 'shack_v1', at: { tx: 760, ty: 1316 }, facing: 'northeast' },
      { kind: 'blank', at: { tx: 388, ty: 1648 }, radius: 4 },
      { kind: 'blank', at: { tx: 379, ty: 1668 }, radius: 4 },
      { kind: 'structure', key: 'shack_v2', at: { tx: 388, ty: 1669 }, facing: 'southeast' },
      { kind: 'blank', at: { tx: 397, ty: 1647 }, radius: 4 },
      { kind: 'structure', key: 'farmhouse_v1', at: { tx: 393, ty: 1652 }, facing: 'southwest' },
      { kind: 'blank', at: { tx: 392, ty: 1653 }, radius: 4 },
      { kind: 'blank', at: { tx: 402, ty: 1644 }, radius: 4 },
      { kind: 'blank', at: { tx: 411, ty: 1666 }, radius: 4 },
      { kind: 'blank', at: { tx: 414, ty: 1668 }, radius: 2 },
      { kind: 'blank', at: { tx: 414, ty: 1657 }, radius: 4 },
      { kind: 'blank', at: { tx: 423, ty: 1653 }, radius: 4 },
      { kind: 'structure', key: 'shack_v1', at: { tx: 408, ty: 1684 }, facing: 'northeast' },
      // ROUND 187 -- THE MARKET MOVES TO THE MARKET DISTRICT. This cluster
      // (six awnings round a statue) and the blanks that keep the generator
      // off the base layer's statue were laid on the old city's market, and
      // the city was rebuilt round them: they stood in the corridor between
      // two estates. Moved as a unit, shape unchanged -- the awnings by
      // (-237,+42) to the clear 21-tile square at (-105..-85, -3..17) from
      // the origin, the blanks by (-230,0) with the statue they guard.
      { kind: 'blank', at: { tx: 668, ty: 1022 }, radius: 2 },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 659, ty: 1035 } },
      { kind: 'blank', at: { tx: 668, ty: 1026 }, radius: 2 },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 654, ty: 1027 } },
      { kind: 'blank', at: { tx: 662, ty: 1022 }, radius: 2 },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 664, ty: 1035 } },
      { kind: 'blank', at: { tx: 659, ty: 1020 }, radius: 2 },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 654, ty: 1035 } },
      { kind: 'blank', at: { tx: 662, ty: 1026 }, radius: 2 },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 659, ty: 1027 } },
      { kind: 'blank', at: { tx: 659, ty: 1026 }, radius: 2 },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 664, ty: 1027 } },
      { kind: 'blank', at: { tx: 662, ty: 1024 }, radius: 2 },
      { kind: 'blank', at: { tx: 666, ty: 1024 }, radius: 2 },
      { kind: 'blank', at: { tx: 668, ty: 1024 }, radius: 2 },
      // ROUND 137 -- nudged one tile off 447,511, which is the base layer's
      // own `cityProp statue`. `placedFaults` refuses two entries on a tile and
      // was right to: this blank and that statue are different layers arguing
      // about one square. At radius 2 the statue's tile is 32 units away and
      // the clear is 64, so it is still inside the hole -- the suppression is
      // unchanged and only the bookkeeping moved.
      { kind: 'blank', at: { tx: 659, ty: 1024 }, radius: 2 },
      { kind: 'cityProp', key: 'statue', at: { tx: 659, ty: 1031 } },
    ],
    terrain: [
      { type: 'rough', at: { tx: 815, ty: 1360 }, w: 24, h: 8 },
      { type: 'rough', at: { tx: 720, ty: 1314 }, w: 6, h: 6 },
      { type: 'rough', at: { tx: 724, ty: 1313 }, w: 6, h: 6 },
      { type: 'rough', at: { tx: 721, ty: 1311 }, w: 6, h: 6 },
      { type: 'rough', at: { tx: 723, ty: 1313 }, w: 6, h: 6 },
      { type: 'rough', at: { tx: 721, ty: 1310 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 722, ty: 1312 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 720, ty: 1313 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 726, ty: 1313 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 725, ty: 1313 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 724, ty: 1310 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 714, ty: 1312 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 711, ty: 1314 }, w: 6, h: 6 },
      { type: 'ground', at: { tx: 712, ty: 1316 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 713, ty: 1319 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 712, ty: 1318 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 713, ty: 1318 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 715, ty: 1318 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 714, ty: 1319 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 714, ty: 1318 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 712, ty: 1317 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 713, ty: 1317 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 713, ty: 1316 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 714, ty: 1315 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 717, ty: 1318 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 716, ty: 1318 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 719, ty: 1317 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 718, ty: 1317 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 718, ty: 1316 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 718, ty: 1315 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 718, ty: 1314 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 719, ty: 1313 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 718, ty: 1313 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 718, ty: 1312 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 717, ty: 1312 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 717, ty: 1313 }, w: 1, h: 1 },
      { type: 'ground', at: { tx: 719, ty: 1315 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 716, ty: 1318 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 714, ty: 1319 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 710, ty: 1318 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 710, ty: 1317 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 711, ty: 1315 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 713, ty: 1314 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 716, ty: 1313 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 718, ty: 1315 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 717, ty: 1317 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 716, ty: 1317 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 715, ty: 1316 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 715, ty: 1312 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 716, ty: 1310 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 716, ty: 1309 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 716, ty: 1311 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 714, ty: 1316 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 712, ty: 1318 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 718, ty: 1313 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 719, ty: 1316 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 719, ty: 1318 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 717, ty: 1319 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 715, ty: 1319 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 713, ty: 1317 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 712, ty: 1314 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 713, ty: 1312 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 714, ty: 1311 }, w: 11, h: 11 },
      { type: 'ground', at: { tx: 715, ty: 1311 }, w: 11, h: 11 },
    ],
  },
  // ROUND 188 -- HARROWMOOR IS REBUILT THREE TIMES THE SIZE, 140 TILES NORTH.
  //
  //   "Replace with generated wall" -- the user, asked what should happen to
  //   the rampart he laid once the city grew.
  //
  // So the 78 hand-laid stones are deleted (the city gets Cadence's generated
  // circuit, gates and arches), and so are the 174 blanks that fell inside the
  // new city: each was an erasure of something in the OLD layout, and in the
  // new one they would only have punched holes in its streets' furniture. His
  // three awnings and the fountain beside them moved with the market, by
  // (+30, -76), onto the new market square. Elehyd's eleven stones and 54
  // blanks were Karsk Landing's and went the same way, for the same reason.
  ontaria: {
    placed: [
      { kind: 'blank', at: { tx: 540, ty: 557 }, radius: 1 },
      { kind: 'blank', at: { tx: 540, ty: 559 }, radius: 1 },
      { kind: 'blank', at: { tx: 545, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 543, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 541, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 548, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 552, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 556, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 559, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 561, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 566, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 569, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 564, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 573, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 580, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 586, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 592, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 596, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 590, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 588, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 584, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 582, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 578, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 576, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 594, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 606, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 608, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 604, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 610, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 616, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 622, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 620, ty: 559 }, radius: 4 },
      { kind: 'blank', at: { tx: 614, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 612, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 628, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 622, ty: 562 }, radius: 1 },
      { kind: 'blank', at: { tx: 631, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 626, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 624, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 633, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 624, ty: 562 }, radius: 1 },
      { kind: 'blank', at: { tx: 637, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 643, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 641, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 639, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 635, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 648, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 645, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 652, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 659, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 657, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 655, ty: 560 }, radius: 1 },
      { kind: 'blank', at: { tx: 660, ty: 559 }, radius: 1 },
      { kind: 'blank', at: { tx: 662, ty: 562 }, radius: 1 },
      { kind: 'blank', at: { tx: 660, ty: 557 }, radius: 1 },
      { kind: 'scenery', key: 'tree', at: { tx: 663, ty: 549 } },
      { kind: 'scenery', key: 'tree', at: { tx: 669, ty: 449 } },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 623, ty: 413 } },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 617, ty: 413 } },
      { kind: 'cityProp', key: 'stallAwning', at: { tx: 617, ty: 419 } },
      { kind: 'cityProp', key: 'fountain', at: { tx: 625, ty: 421 } },
    ],
  },
  elehyd: {
    placed: [
    ],
  },
};

/**
 * Fold the overlay into a region list, in place.
 *
 * IN PLACE, and called once from `regions.js` as the list is built, because
 * everything downstream reads `REGIONS` and `REGION_BY_ID` directly -- there
 * are some hundreds of those reads and none of them should have to know an
 * overlay exists.
 *
 * CONCATENATED, NOT REPLACED, for `placed`: a region may carry hand-authored
 * placements in `regions.js` itself (round 107 put four there), and the
 * editor's file must add to them rather than silently delete somebody's
 * fountain. `terrain` concatenates for the same reason, and because two
 * strokes over the same ground resolve by order -- later wins -- which is what
 * a paint tool does.
 */
export function applyRegionEdits(regions, edits = REGION_EDITS) {
  for (const r of regions) {
    const e = edits[r.id];
    if (!e) continue;
    if (e.placed && e.placed.length) r.placed = [...(r.placed || []), ...e.placed];
    if (e.terrain && e.terrain.length) r.terrain = [...(r.terrain || []), ...e.terrain];
  }
  return regions;
}

/** Faults in the overlay's own SHAPE -- an entry for a region that does not
 *  exist, or a field that is not one of the two. The CONTENTS are checked by
 *  `placedFaults` and `terrainFaults` once the overlay has been folded in,
 *  which is the only way to check them against the region they land on. */
export function regionEditFaults(edits, regionIds) {
  const out = [];
  const known = new Set(regionIds);
  for (const [id, e] of Object.entries(edits || {})) {
    if (!known.has(id)) { out.push(`REGION_EDITS.${id} is not a region`); continue; }
    if (!e || typeof e !== 'object') { out.push(`REGION_EDITS.${id} is not an object`); continue; }
    for (const k of Object.keys(e)) {
      if (k !== 'placed' && k !== 'terrain') {
        out.push(`REGION_EDITS.${id}.${k} is not an editable field (placed, terrain)`);
      } else if (!Array.isArray(e[k])) {
        out.push(`REGION_EDITS.${id}.${k} is not an array`);
      }
    }
  }
  return out;
}
