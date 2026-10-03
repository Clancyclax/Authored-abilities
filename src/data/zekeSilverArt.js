// ROUND 189 -- ZEKE AT SILVER. Written by tools/build_round189_zeke.py from
// the delivered PixelLab pack; the entry has CHAR_ART's own shape and is
// merged into it by WorldScene at load, so the loader and the companion draw
// read it like any other character.
//
// `cast` and `death` are states round 46's characters never had: the draw
// plays `cast` for a companion's spell and `death` while they are down (see
// `_partyDownPose`). `southOnly`: the swing, the cast and the death were drawn
// facing the camera only, and play that way in every direction.
export const ZEKE_SILVER_ART = {
  "cell": 144,
  "footX": 72,
  "footY": 103,
  "animKeys": [
    "idle",
    "walk",
    "attack",
    "cast",
    "death"
  ],
  "anims": {
    "idle": {
      "sheet": "char_zekeSilver_idle.png",
      "framesPerDir": 1,
      "frameMs": 0,
      "foot": 103,
      "source": "rotations"
    },
    "walk": {
      "sheet": "char_zekeSilver_walk.png",
      "framesPerDir": 8,
      "frameMs": 80,
      "foot": 104,
      "source": "running"
    },
    "attack": {
      "sheet": "char_zekeSilver_attack.png",
      "framesPerDir": 17,
      "frameMs": 45,
      "foot": 94,
      "source": "The_warrior_shifts_his_weight_driving_his_heels_in"
    },
    "cast": {
      "sheet": "char_zekeSilver_cast.png",
      "framesPerDir": 13,
      "frameMs": 77,
      "foot": 104,
      "source": "The_warrior_heaves_the_massive_scythe_upward_with"
    },
    "death": {
      "sheet": "char_zekeSilver_death.png",
      "framesPerDir": 13,
      "frameMs": 0,
      "foot": 104,
      "source": "The_warriors_knees_buckle_under_immense_weight_as"
    }
  },
  "southOnly": {
    "attack": true,
    "cast": true,
    "death": true
  }
};

/** The rank at which Zeke puts on this art. */
export const ZEKE_SILVER_RANK = 'silver';
