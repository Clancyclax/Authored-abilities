// ===========================================================================
// ROUND 247 -- THE CHRYSALIS GOLEM.
//
// Canon, from the user's own posting of Neil's growth abilities in round 238:
// the Chrysalis Golem is summoned, seals itself, and comes out as something
// suited to what it found. The art arrived this round -- eleven forms, each
// with eight directions and its own animations -- and with it the rule:
//
//   "various forms it can transform into based on the hazards observed when
//    it's summoned"
//   "golem reacts to what I identified and anything else that seems relevant,
//    afflictions, dispelling, fast enemies, hard hitting enemies"
//   "All of the transformations should have recolored versions for every
//    damage type to represent what they were getting hit with prior to the
//    Chrysalis."
//   "The last 2 frames of the transforms_into_a_crystal should be held for the
//    10 seconds the golem spends in its chrysalis, use the idle death
//    animation faded for the crystal exploding and the new form popping out."
//   "The Chrysalis golem should also be a silver rank enemy you can rarely
//    find wherever silver rank enemies occur."
//
// TWO INDEPENDENT AXES, and keeping them independent is the whole design.
// WHICH FORM is a question about the hazard -- what is out there and what it
// is doing. WHAT COLOUR is a question about the damage the golem itself took
// before it sealed. A fire-tinted serpent and a fire-tinted knight are both
// reachable, and so are a shadow-tinted one of each; the cross product is the
// point rather than an accident, because the two facts they encode are
// unrelated.
//
// THE FORM IS CHOSEN BY THE STRONGEST HAZARD, NOT BY A PRIORITY LIST. A table
// of "if poison then insect, else if fast then serpent" is a list whose order
// is doing the deciding, and the order would be invisible to anybody reading
// the outcome. Each form instead declares what it ANSWERS, and the hazard
// reading scores every form against what was actually observed. Ties break on
// the form's own `weight`, which is the only place a preference is written
// down, and it is written down once.
// ===========================================================================

/** The ten seconds the golem spends sealed, in played seconds. The user's own
 *  number, and it is long: a chrysalis that resolved in two seconds would be a
 *  cast animation rather than a decision the fight has to wait through. */
export const CHRYSALIS_SECONDS = 10;

/** The last N frames of `transforms_into_a_crystal` are held for the whole
 *  seal. Two, as asked -- one would read as a freeze and three starts to look
 *  like a stutter at this frame rate. */
export const CHRYSALIS_HOLD_FRAMES = 2;

/** How the crystal comes apart: the BASE form's own death animation, played
 *  faded, while the new form arrives. Reusing the death is the user's
 *  instruction and it is also the right art -- a golem's death IS a crystal
 *  coming apart, so there was never a second animation to draw. */
export const CHRYSALIS_BREAK_ANIM = 'Death';
export const CHRYSALIS_BREAK_ALPHA = 0.55;
export const CHRYSALIS_BREAK_SECONDS = 0.9;

// ---------------------------------------------------------------------------
// THE FORMS.
//
// `dir` is the folder the art arrived in, and it is kept verbatim rather than
// tidied: the build script writes sheets keyed on it, and a prettier name here
// would be a second spelling of the same thing to keep in step.
//
// `answers` is what this form is FOR. The hazard reading scores a form by how
// much of what it observed this form answers, so a form that answers nothing
// observed is never chosen and a form that answers two of three beats one that
// answers one.
// ---------------------------------------------------------------------------
export const CHRYSALIS_FORMS = [
  {
    key: 'base', dir: 'Idle', weight: 0,
    name: 'Chrysalis Golem',
    answers: [],
    blurb: 'Unsealed and undecided. What it becomes is up to what it meets.',
  },
  {
    key: 'knight', dir: 'a_crystaline_knight', weight: 5,
    name: 'Bulwark Form',
    answers: ['hardHitters', 'outnumbered'],
    // The only form with a Taunt, which is what makes it the one that answers
    // being outnumbered: it can take the fight onto itself.
    taunt: true,
    blurb: 'Faceted plate and a greatsword. It stands where the blows land.',
  },
  {
    key: 'plates', dir: 'crystal_armor_plates', weight: 4,
    name: 'Carapace Form',
    answers: ['hardHitters', 'physical'],
    blurb: 'Overlapping crystal plate. Made for one enormous hit at a time.',
  },
  {
    key: 'blades', dir: 'Skinny_with_blade_ar', weight: 4,
    name: 'Shearing Form',
    answers: ['armoured', 'outnumbered'],
    blurb: 'Thin, and edged along both arms. It answers armour with leverage.',
  },
  {
    key: 'werewolf', dir: 'a_crystaline_werewol', weight: 4,
    name: 'Hunting Form',
    answers: ['fastEnemies', 'fleeing'],
    blurb: 'Low and loping. Built to catch the thing that will not stand still.',
  },
  {
    key: 'serpent', dir: 'A_crystal_serpent_wi', weight: 3,
    name: 'Coil Form',
    answers: ['fastEnemies', 'confined'],
    // Its run is a slither, which is the one place the animation names differ
    // between forms -- see `runAnimFor`.
    runAnim: 'Slither_Running',
    blurb: 'It does not chase so much as arrive. Corridors belong to it.',
  },
  {
    key: 'insect', dir: 'a_crystal_insect_wi', weight: 3,
    name: 'Chitin Form',
    answers: ['afflictions', 'poison'],
    blurb: 'Sealed at every seam. Nothing gets into it, which is the point.',
  },
  {
    key: 'trex', dir: 'A_T-Rex_made_of_Crys', weight: 5,
    name: 'Saurian Form',
    answers: ['hardHitters', 'bigTarget'],
    blurb: 'Enormous, and unhurried about it.',
  },
  {
    key: 'longneck', dir: 'a_long_neck_and_cro', weight: 3,
    name: 'Reaching Form',
    answers: ['ranged', 'bigTarget'],
    blurb: 'All neck and reach. It fights the thing standing behind the thing.',
  },
  {
    key: 'slime', dir: 'A_blob_or_slime_mons', weight: 3,
    name: 'Rendering Form',
    answers: ['dispelling', 'magic'],
    blurb: 'It has no shape to unmake, which is its whole argument with a mage.',
  },
  {
    key: 'golden', dir: 'golden_light_glowing', weight: 6,
    name: 'Mending Form',
    answers: ['alliesHurt', 'attrition'],
    // The one form with no Attack animation at all, which is not an omission:
    // it is a support form and the art says so. `canAttack` is read by the
    // summon runtime so it never tries to play a swing that does not exist.
    canAttack: false,
    healAnim: 'Healing',
    blurb: 'It stops fighting and starts keeping everyone else standing.',
  },
];

export const FORM_BY_KEY = Object.fromEntries(CHRYSALIS_FORMS.map(f => [f.key, f]));

/**
 * THE HAZARDS the golem reads when it is summoned.
 *
 * Named here rather than inferred at the call site, so what the golem can
 * notice is a list somebody can read and add to -- the user's "anything else
 * that seems relevant" is this list growing, not a new branch in the runtime.
 */
export const HAZARDS = [
  'hardHitters',   // something out there hits for a large share of max HP
  'fastEnemies',   // something moves faster than the summoner
  'outnumbered',   // more of them than of us
  'armoured',      // high physical resistance in the pack
  'afflictions',   // the summoner or an ally is carrying conditions
  'poison',        // ...specifically the poison family
  'dispelling',    // something out there strips buffs
  'magic',         // the damage coming in is mostly non-physical
  'physical',      // ...or mostly physical
  'ranged',        // they are attacking from outside melee
  'fleeing',       // they are running from us
  'confined',      // fought indoors or in a den
  'bigTarget',     // a single large enemy rather than a pack
  'alliesHurt',    // the party is below a health threshold
  'attrition',     // the fight has run long
];

/**
 * Which form answers this hazard reading best.
 *
 * `observed` is a set (or array) of hazard names. Scoring, not priority: a
 * form gets a point per hazard it answers, and `weight` breaks ties. With
 * nothing observed the golem stays as it is, which is the honest answer --
 * there was nothing to react to.
 */
export function formFor(observed = []) {
  const seen = new Set(observed);
  if (!seen.size) return FORM_BY_KEY.base;
  let best = FORM_BY_KEY.base, bestScore = 0, bestWeight = -1;
  for (const f of CHRYSALIS_FORMS) {
    if (f.key === 'base') continue;
    const score = f.answers.reduce((n, a) => n + (seen.has(a) ? 1 : 0), 0);
    if (!score) continue;
    if (score > bestScore || (score === bestScore && f.weight > bestWeight)) {
      best = f; bestScore = score; bestWeight = f.weight;
    }
  }
  return best;
}

/** What this form calls its movement animation. Only the serpent differs. */
export function runAnimFor(form) {
  if (!form) return 'Running';
  if (form.runAnim) return form.runAnim;
  return form.key === 'base' ? 'Walking' : 'Running';
}

// ---------------------------------------------------------------------------
// THE DAMAGE-TYPE RECOLOURS.
//
// stats.js declares 29 damage types and several are distinctions nobody can
// see on a crystal: slashing, blunt, piercing and physical are one look; frost
// and ice are one; death and necrotic are one. EVERY ONE OF THE 29 RESOLVES TO
// A RECOLOUR -- that is the instruction -- but they resolve through TINTS, so
// the number of files is the number of appearances rather than the number of
// names. `chrysalisFaults` refuses a damage type with no tint, which is what
// stops this drifting the next time stats.js grows a row.
// ---------------------------------------------------------------------------
export const TINT_FOR_DAMAGE = {
  fire: 'fire', frost: 'frost', ice: 'frost',
  lightning: 'lightning',
  nature: 'nature', plant: 'nature', life: 'nature',
  shadow: 'shadow', dark: 'shadow',
  radiant: 'radiant', light: 'radiant',
  water: 'water',
  rock: 'earth', earth: 'earth', sand: 'earth',
  wind: 'wind',
  blood: 'blood',
  poison: 'poison',
  death: 'necrotic', necrotic: 'necrotic', curse: 'necrotic',
  arcane: 'arcane',
  slashing: 'physical', blunt: 'physical', piercing: 'physical', physical: 'physical',
  resonating: 'resonating', disruptive: 'resonating',
  transcendent: 'transcendent',
};

/** Every tint the build script writes a folder for. */
export const TINTS = ['base', ...new Set(Object.values(TINT_FOR_DAMAGE))];

/** The tint for what this golem was last hit by. `base` when it was not hit,
 *  which is a real case: a golem summoned into a quiet room. */
export function tintFor(damageType) {
  if (!damageType) return 'base';
  return TINT_FOR_DAMAGE[damageType] || 'base';
}

/** The texture key one form's one animation is loaded under. One spelling,
 *  used by the loader, the runtime and the build script's output path. */
export function sheetKey(formKey, anim, tint = 'base') {
  const f = FORM_BY_KEY[formKey];
  return `chrys_${tint}_${(f ? f.dir : formKey)}__${anim}`;
}

export function chrysalisFaults(damageTypes = Object.keys(TINT_FOR_DAMAGE)) {
  const out = [];
  const keys = new Set();
  for (const f of CHRYSALIS_FORMS) {
    if (keys.has(f.key)) out.push(`two forms share the key ${f.key}`);
    keys.add(f.key);
    if (!f.dir) out.push(`${f.key}: has no art folder`);
    if (!f.name) out.push(`${f.key}: has no name`);
    for (const a of (f.answers || [])) {
      if (!HAZARDS.includes(a)) out.push(`${f.key}: answers ${a}, which is not a hazard`);
    }
  }
  // Every hazard must be answered by somebody, or it is a thing the golem can
  // notice and can do nothing about -- the census fault, in its usual shape.
  for (const h of HAZARDS) {
    if (!CHRYSALIS_FORMS.some(f => (f.answers || []).includes(h))) {
      out.push(`nothing answers the hazard ${h}`);
    }
  }
  // ...and every form must answer something, or it is art nobody will see.
  for (const f of CHRYSALIS_FORMS) {
    if (f.key !== 'base' && !(f.answers || []).length) out.push(`${f.key}: answers nothing`);
  }
  // Every damage type resolves to a tint that exists.
  for (const d of damageTypes) {
    const t = TINT_FOR_DAMAGE[d];
    if (!t) out.push(`damage type ${d} has no tint`);
    else if (!TINTS.includes(t)) out.push(`${d} maps to ${t}, which is not a tint`);
  }
  // The support form must not be asked for an attack it does not have.
  const gold = FORM_BY_KEY.golden;
  if (gold && gold.canAttack !== false) out.push('the mending form is marked as able to attack');
  return out;
}
