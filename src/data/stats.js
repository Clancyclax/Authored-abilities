// ROUND 10 -- the MINOR STAT system, per the user's spec: "minor stats are
// HP, Stamina, Mana, crit chance, crit damage, elemental resistance
// (specific to each magical damage type), block chance, dodge chance, HP
// recovery rate, stamina recovery rate, mana recovery rate, weapon attack
// speed, spell cast speed, cooldown reduction," with the MAJOR attributes
// (Power/Spirit/Speed/Recovery) each influencing a few minor stats
// thematically, and rarity-tiered items rolling minor-stat buffs.
//
// Major -> minor influences (thematically assigned, one place to retune):
// ROUND 58 -- FOUR TIMES THE IMPACT, and this comment is now COMPLETE.
//
// The user: "Because a character will get so few attribute points they should
// be more impactful, lets start with 4 times larger impact."
//
// Every coefficient below is 4x its round-10 value. The reason it works is the
// round-6 economy: a point is not something you buy, it is a bond plus a rank
// step plus the occasional passive, so a character runs 0-8 points in an
// attribute across a whole game. At the old rates one point of Spirit bought 4%
// cast speed, which is not a decision anybody feels.
//
// Two effects are NEW this round, both at the post-multiplier rate the user
// named rather than 4x some smaller number.
//
//   Power    -> max HP (+60/pt), crit damage (+0.20x/pt), block (+6%/pt),
//               ARMOUR (+1.6%/pt)
//   Speed    -> max Stamina (+48/pt), weapon attack speed (+16%/pt),
//               dodge (+6%/pt), MOVEMENT SPEED (+12%/pt)   [new, round 58]
//   Spirit   -> max Mana (+48/pt), spell cast speed (+16%/pt), crit chance
//               (+4%/pt), ALL elemental resistances (+8%/pt),
//               AURA RANGE (+12%/pt)                       [new, round 58]
//   Recovery -> HP recovery (+1% max/s per pt -- HP regen exists at all only
//               through Recovery, items and abilities), stamina recovery and
//               mana recovery (+2% max/s per pt on the 1.5%/s base)
//   (The user's own example held: Speed affects weapon attack speed, and
//   never HP recovery.)
//
// ARMOUR was missing from this list for thirty-one rounds. It was added to
// Power in round 27 with a comment beside the code and this block -- which
// exists precisely to be the one place the major->minor map is written down --
// was never updated. Anything that is true of an attribute belongs HERE.
//
// Item rarity ladder -- SAME terminology as essence/awakening stones, with
// the classic color progression white/green/blue/purple/orange/red:
//   Common (white):    basic damage/speed only -- NO minor stat buffs
//   Uncommon (green):  1 minor stat buff at base magnitude
//   Rare (blue):       2 buffs, or 1 at +25%
//   Epic (purple):     3 buffs, or fewer at compounding +25% each step
//   Legendary (orange): 4 buffs, same trade
//   Divine (red):      5 buffs, same trade
// Formalized: a tier has `slots` buff slots; an item rolls n <= slots
// buffs, each at base * 1.25^(slots - n). Summoned relics (awakening.js)
// always roll at EPIC tier on top of their ability-specific impact.

// --- Elemental damage types ("specific to each magical damage type") ----
//
// ROUND 105 -- THESE SIX ARE NOT "THE DAMAGE TYPES" ANY MORE. They are the six
// a player can GEAR FOR: each has a `resist_<e>` minor stat, an item-buff roll,
// a warding name and a row on the character sheet. See DAMAGE_TYPES below for
// the full twenty-four, and read the note there before adding to this list --
// a seventh entry here is six new UI rows and a new item affix, which is a
// different decision from adding a damage type.
import { rollItemEffects, itemDescription, growthConditionsFor, growEffects, SET_CHANCE } from './itemEffects.js';   // ROUND 282
export const ELEMENT_TYPES = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];
export const ELEMENT_LABEL = { fire: 'Fire', frost: 'Frost', lightning: 'Lightning', nature: 'Nature', shadow: 'Shadow', radiant: 'Radiant' };

// ===========================================================================
// ROUND 105 -- THE TWENTY-FOUR DAMAGE TYPES.
//
// The user's ability taxonomy names twenty-four; the game had six. Asked how
// resistance should work across that many, they chose: "Every type real,
// resistance defaults to zero" -- a monster declares only the two or three it
// actually cares about, and nothing silently resists a type nobody thought
// about.
//
// THE HAPPY PART: the damage path already works this way and nobody planned
// it. Both mitigation sites read `st[`resist_${type}`]` and fall through when
// the key is absent, so a type with no resistance stat resists at zero by
// construction. Adding twenty-four types therefore required NO change to how
// damage is applied -- which is worth stating, because the alternative reading
// ("24 types means 24 minor stats") would have added eighteen rows to the
// character sheet, eighteen item affixes and eighteen buff-roll entries to
// express a default of zero.
//
// So the two lists answer different questions and that is the whole design:
//
//   ELEMENT_TYPES   what you can GEAR against. Six, with stats and UI.
//   DAMAGE_TYPES    what an ability can BE. Twenty-four, resisted at zero
//                   unless something specifically grants resistance.
//
// Fields:
//   label      what the player is told
//   source     'stone' (a stone family supplies it), 'weapon' (the weapon
//              does), or 'special' (the two anti-mitigation types)
//   geared     true for the six with a resist_* stat
//   vsArmour   DAMAGE multiplier when the target's protection is armour
//   vsResist   DAMAGE multiplier when the target's protection is resistance
//   sfx        which SFX_ELEMENTS channel it sounds like (audio.js)
//
// RESONATING AND DISRUPTIVE FORCE. The user's own definitions: resonating is
// good against physical protection, disruptive force against magical. The
// HWFWM wiki returned 402 to every fetch this round, so these are built from
// what the user wrote rather than from a verified primary source, and this
// comment says so rather than implying a check that did not happen. The game
// already splits the two mitigation paths -- armour answers untyped damage,
// resistances answer typed -- so both have somewhere real to land.
// ===========================================================================
const DT = (label, source, opts = {}) => ({ label, source, geared: false, vsArmour: 1, vsResist: 1, sfx: 'physical', ...opts });
export const DAMAGE_TYPES = {
  // ---- the six that carry a resistance stat --------------------------------
  fire:      DT('Fire', 'stone', { geared: true, sfx: 'fire' }),
  frost:     DT('Frost', 'stone', { geared: true, sfx: 'frost' }),
  lightning: DT('Lightning', 'stone', { geared: true, sfx: 'lightning' }),
  nature:    DT('Nature', 'stone', { geared: true, sfx: 'nature' }),
  shadow:    DT('Shadow', 'stone', { geared: true, sfx: 'shadow' }),
  radiant:   DT('Radiant', 'stone', { geared: true, sfx: 'radiant' }),
  // ---- the elemental additions --------------------------------------------
  water:     DT('Water', 'stone', { sfx: 'frost' }),
  ice:       DT('Ice', 'stone', { sfx: 'frost' }),
  rock:      DT('Rock', 'stone', { sfx: 'physical' }),
  earth:     DT('Earth', 'stone', { sfx: 'nature' }),
  sand:      DT('Sand', 'stone', { sfx: 'physical' }),
  wind:      DT('Wind', 'stone', { sfx: 'lightning' }),
  light:     DT('Light', 'stone', { sfx: 'radiant' }),
  dark:      DT('Dark', 'stone', { sfx: 'shadow' }),
  plant:     DT('Plant', 'stone', { sfx: 'nature' }),
  life:      DT('Life', 'stone', { sfx: 'radiant' }),
  death:     DT('Death', 'stone', { sfx: 'shadow' }),
  blood:     DT('Blood', 'stone', { sfx: 'physical' }),
  poison:    DT('Poison', 'stone', { sfx: 'nature' }),
  necrotic:  DT('Necrotic', 'stone', { sfx: 'shadow' }),
  curse:     DT('Curse', 'stone', { sfx: 'shadow' }),
  arcane:    DT('Arcane', 'stone', { sfx: 'lightning' }),
  // ---- the weapon's own three, plus untyped -------------------------------
  //
  // A sword slashes, a hammer is blunt, a spear pierces. That makes weapon
  // choice a damage-type decision, which it has never been -- see
  // WEAPON_DAMAGE_TYPE in weapons.js.
  slashing:  DT('Slashing', 'weapon', { sfx: 'physical' }),
  blunt:     DT('Blunt', 'weapon', { sfx: 'physical' }),
  piercing:  DT('Piercing', 'weapon', { sfx: 'physical' }),
  physical:  DT('Physical', 'weapon', { sfx: 'physical' }),
  // ---- the two that beat a KIND of mitigation ------------------------------
  // ROUND 105 -- the user's own numbers, given when the draft spec proposed
  // halving the mitigation instead: "should be twice as effective against the
  // correct target and half as effective against the incorrect target."
  //
  // A DAMAGE multiplier keyed on which protection the target actually uses,
  // and it cuts both ways -- which is what makes carrying one a real choice
  // rather than a strict upgrade. A resonating build tears through plate and
  // struggles against a wraith; a disruptive build is the reverse.
  resonating: DT('Resonating Force', 'special', { sfx: 'lightning', vsArmour: 2, vsResist: 0.5 }),
  disruptive: DT('Disruptive Force', 'special', { sfx: 'shadow', vsArmour: 0.5, vsResist: 2 }),
  // ===== ROUND 201 -- THE TWENTY-FIFTH, AND THE ONLY ONE THAT IGNORES BOTH ==
  //
  // Canon, [Castigate]: "inflicting slight transcendent damage". Transcendent
  // damage in the books is what beats a defence rather than what a defence is
  // rated against -- it is the answer to a thing that cannot otherwise be hurt.
  //
  // The two above beat a KIND of mitigation and pay for it against the other
  // kind. This one beats BOTH, and so it cannot be priced the same way: a type
  // that is twice as good against everything and half as good against nothing
  // is a strict upgrade, which round 105 explicitly refused to add. The price
  // is in the word canon uses -- "slight" -- and it is charged where it
  // belongs, on the ABILITY's damage figure rather than in this table, via
  // TRANSCENDENT_DAMAGE_CUT below. An ability typed transcendent deals a
  // fraction of what the same ability would deal typed anything else, and in
  // exchange nothing reduces it.
  //
  // `pierces` is the field, not a third vsX multiplier, because the mechanic is
  // that mitigation does not apply at all rather than that it applies at 1.0 --
  // a flat armour subtraction is not a multiplier and a multiplier of one would
  // not have stopped it.
  transcendent: DT('Transcendent', 'special', { sfx: 'radiant', pierces: true }),
};
/** ROUND 201 -- what "slight" costs. An ability whose element is transcendent
 *  deals this fraction of its rolled damage, and takes nothing off in return.
 *  Read by the damage path, not by the generator, so a hand-written spec and a
 *  generated one are charged identically. */
export const TRANSCENDENT_DAMAGE_CUT = 0.45;
/** Does this damage type ignore mitigation entirely? */
export function damagePierces(type) {
  return !!(DAMAGE_TYPES[type] && DAMAGE_TYPES[type].pierces);
}
export const DAMAGE_TYPE_KEYS = Object.keys(DAMAGE_TYPES);
/** Label for any damage type, including the six that predate the table. */
export function damageTypeLabel(t) {
  return (DAMAGE_TYPES[t] && DAMAGE_TYPES[t].label) || ELEMENT_LABEL[t] || t || 'Untyped';
}
/**
 * ROUND 105 -- WHICH MITIGATION ANSWERS THIS DAMAGE TYPE.
 *
 * Round 27 set the rule and it does not change: "plate stops teeth and does
 * nothing at all about a hexbound's magic." Typed damage is answered by
 * resistance, untyped by armour, and the split is what makes a caster monster
 * dangerous to an armoured hunter.
 *
 * That rule was expressed as `if (element && st[resist_element]) ... else if
 * (!element && st.armor)`, which worked while every type had a resistance stat
 * and breaks the moment `slashing` and `sand` exist: a hit typed `slashing`
 * has no `resist_slashing`, so it fell out of the first branch, and `!element`
 * fails the second, and it took NO mitigation from anything.
 *
 * So the branch keys on what the type IS, not on whether a stat happens to be
 * non-zero. A weapon-source type is physical damage with a name and armour
 * answers it; everything else is typed and resistance answers it, defaulting
 * to zero exactly as the user chose. Untyped stays with armour.
 */
export function damageMitigationKind(type) {
  if (!type) return 'armour';
  const d = DAMAGE_TYPES[type];
  if (!d) return ELEMENT_TYPES.includes(type) ? 'resist' : 'armour';
  // ROUND 201 -- a piercing type answers to neither. Returned as a third value
  // rather than as 'resist' against a resistance nobody has, because a
  // resistance nobody has TODAY is a resistance somebody gears for tomorrow,
  // and transcendent damage is supposed to stay unanswerable.
  if (d.pierces) return 'none';
  return d.source === 'weapon' ? 'armour' : 'resist';
}

/**
 * The damage multiplier for this type against a target protected THAT way.
 *
 * The draft spec had this as a multiplier on the MITIGATION -- halving armour
 * rather than doubling damage -- on the argument that "good against physical
 * protection" is a statement about the protection. The user's answer settled
 * it, and it is better than the draft for a reason the draft missed: halving
 * armour does nothing at all to a target with no armour, so a resonating build
 * would have been strictly better against everything and merely unexciting
 * against some of it. Doubling AND halving cuts both ways, which is what makes
 * carrying one a choice.
 *
 * Returns 1 for every ordinary type, so this is a no-op on the whole roster
 * except the two types written to care.
 */
export function damageFactorVs(type, mitigationKind) {
  const d = DAMAGE_TYPES[type];
  if (!d) return 1;
  return mitigationKind === 'armour' ? d.vsArmour : d.vsResist;
}
// Which monster families deal typed (magical) damage -- everything else
// hits physically (dodge/block/DR apply; resistances don't).
export const FAMILY_ELEMENT = {
  hellhound: 'fire', dragon: 'fire', elemental: 'lightning',
  hydra: 'nature', spider: 'nature', lizard: 'nature',
  skeleton: 'shadow', bat: 'shadow',
  chimera: 'fire', slimeGolem: 'nature',
  // ROUND 27 -- the two round-24 families were carrying dmgType 'magical'
  // with no element, which left them falling through the resist check into
  // the ARMOUR check: plate would have stopped a hexbound's magic. Typed now.
  shade: 'shadow', demon: 'shadow',
};

// --- Minor stat registry -------------------------------------------------
// kind: 'flat' renders as integer, 'pct' as percentage, 'mult' as x-factor,
// 'ratePct' as %-of-max-per-second.
export const MINOR_STATS = [
  { key: 'maxHp', label: 'Max HP', kind: 'flat' },
  { key: 'maxStamina', label: 'Max Stamina', kind: 'flat' },
  { key: 'maxMana', label: 'Max Mana', kind: 'flat' },
  { key: 'critChance', label: 'Crit Chance', kind: 'pct' },
  { key: 'critDamage', label: 'Crit Damage', kind: 'mult' },
  // ROUND 27 -- the user's ask: "A new minor stat should be added called
  // 'Armor' which shields, chests, belts, gloves, boots, all have. Armor
  // should reduce physical (see non magical) damage by a flat percentage
  // capping at 80%." Physical ONLY -- elemental damage goes through the
  // resist_* stats below and is deliberately untouched by armour, which is
  // what makes a caster monster dangerous to a heavily armoured hunter.
  { key: 'armor', label: 'Armor', kind: 'pct' },
  { key: 'blockChance', label: 'Block Chance', kind: 'pct' },
  { key: 'dodgeChance', label: 'Dodge Chance', kind: 'pct' },
  { key: 'hpRegen', label: 'HP Recovery', kind: 'ratePct' },
  { key: 'staminaRegen', label: 'Stamina Recovery', kind: 'ratePct' },
  { key: 'manaRegen', label: 'Mana Recovery', kind: 'ratePct' },
  { key: 'attackSpeed', label: 'Weapon Attack Speed', kind: 'pct' },
  // ROUND 58 -- cast speed has THREE jobs, and the third is now official rather
  // than a quirk. The user: "AOE healpulse scaling with cast speed is an
  // interesting quirk but it can become official."
  //   1. shortens every ability cooldown
  //   2. shortens the round-57 cast bar
  //   3. increases the size of an aoeHealPulse heal, 1:1
  // The third had never been written down anywhere -- not in this registry, not
  // in the ability's own description -- so a Spirit build got a bigger pulse
  // heal than its stats line promised and no way to know why.
  { key: 'castSpeed', label: 'Spell Cast Speed', kind: 'pct' },
  { key: 'cooldownReduction', label: 'Cooldown Reduction', kind: 'pct' },
  // ROUND 58 -- the two the user added to Speed and Spirit. Registered here so
  // they appear on the character sheet like every other stat; a stat the player
  // has and cannot see is a stat they cannot build around.
  { key: 'moveSpeed', label: 'Movement Speed', kind: 'pct' },
  { key: 'auraRange', label: 'Aura Range', kind: 'pct' },
  ...ELEMENT_TYPES.map(e => ({ key: `resist_${e}`, label: `${ELEMENT_LABEL[e]} Resistance`, kind: 'pct', element: e })),
];
export const MINOR_STAT_BY_KEY = Object.fromEntries(MINOR_STATS.map(s => [s.key, s]));

// Caps -- speeds/CDR at 50%, dodge/block at 60%, resists at 75%.
// ROUND 27 -- "Armor should reduce physical (see non magical) damage by a
// flat percentage capping at 80%." One number, exported so the runtime's
// timed armour buffs re-cap against the same ceiling the stat stack uses.
export const ARMOR_CAP = 0.80;
// ROUND 58 -- moveSpeed and auraRange are capped too, and both numbers are set
// against something already in the game rather than picked. Sprint is +55%, so
// a movement cap of 60% means deep Speed investment is worth about a permanent
// sprint and no more -- a character who outruns their own sprint by 2x has left
// the movement system behind. Aura range doubles at most, because the ring is
// drawn and a field wider than the screen stops reading as a field.
export const MOVE_SPEED_CAP = 0.6;
export const AURA_RANGE_CAP = 1.0;
// ROUND 58 -- the two speed caps lift from 50% to 65%, and this is a
// consequence of the 4x rather than a separate opinion.
//
// At 16%/pt they were reached at 3.1 points, and a character runs to about 8
// (bond + three rank steps at Gold + an attr-boost passive granting 1 + steps).
// So five of eight points bought nothing, which is the exact opposite of "so
// few attribute points they should be more impactful" -- and worse, every
// attack-speed and cast-speed affix on every item became dead the moment a
// build reached three points.
//
// 65% moves saturation to ~4.1 points, so a bound attribute at Gold is the
// ceiling and everything below it still has gear headroom. The floor it implies
// is deliberate and reachable only by a build that has committed to it: a
// cooldown at 0.35 x 0.5 = 17.5% of its authored value needs maxed Spirit AND
// maxed cooldown gear.
const CAPS = {
  attackSpeed: 0.65, castSpeed: 0.65, cooldownReduction: 0.5,
  dodgeChance: 0.6, blockChance: 0.6, armor: ARMOR_CAP,
  moveSpeed: MOVE_SPEED_CAP, auraRange: AURA_RANGE_CAP,
};
for (const e of ELEMENT_TYPES) CAPS[`resist_${e}`] = 0.75;

// ---------------------------------------------------------------------------
// ROUND 58 -- THE ATTRIBUTE COEFFICIENTS, in one table.
//
// Previously these were sixteen literals scattered through computeMinorStats,
// which is why the round-27 armour line could be added without the header
// comment noticing and stay undocumented for thirty-one rounds. A retune is now
// one edit to one table, and the suite reads THIS to check the header agrees
// with the code rather than trusting either.
//
// Every number is 4x its round-10 value except the two marked NEW, which the
// user specified at their final rate ("after the increase").
// ---------------------------------------------------------------------------
export const ATTR_MULTIPLIER = 4;
export const ATTR_SCALE = {
  power:    { maxHp: 60, critDamage: 0.20, blockChance: 0.06, armor: 0.016 },
  speed:    { maxStamina: 48, attackSpeed: 0.16, dodgeChance: 0.06, moveSpeed: 0.12 },
  spirit:   { maxMana: 48, castSpeed: 0.16, critChance: 0.04, resist: 0.08, auraRange: 0.12 },
  recovery: { hpRegen: 0.01, staminaRegen: 0.02, manaRegen: 0.02 },
};

// What each attribute feeds, for the sheet and for the suite's header check.
export const ATTR_FEEDS = {
  power: ['maxHp', 'critDamage', 'blockChance', 'armor'],
  speed: ['maxStamina', 'attackSpeed', 'dodgeChance', 'moveSpeed'],
  spirit: ['maxMana', 'castSpeed', 'critChance', 'resist', 'auraRange'],
  recovery: ['hpRegen', 'staminaRegen', 'manaRegen'],
};

// Base values before attributes/items/passives.
const BASE = {
  maxHp: 40, maxStamina: 50, maxMana: 30,
  critChance: 0.05, critDamage: 1.5, blockChance: 0, dodgeChance: 0, armor: 0,
  hpRegen: 0, staminaRegen: 0.015, manaRegen: 0.015,
  attackSpeed: 0, castSpeed: 0, cooldownReduction: 0,
  // ROUND 58 -- both start at zero: a character with no Speed moves at the
  // base rate, and one with no Spirit has auras exactly as wide as authored.
  moveSpeed: 0, auraRange: 0,
};
for (const e of ELEMENT_TYPES) BASE[`resist_${e}`] = 0;

// The full minor-stat computation. attrs = {power, spirit, speed,
// recovery}; itemBuffLists = array of buff arrays ([{stat, amount}, ...])
// from every equipped gear item AND every known summoned relic;
// passiveMods = player.passiveMods (round 5-6 passive abilities feed crit
// etc. through here so there is ONE stat stack).
export function computeMinorStats(attrs, itemBuffLists = [], passiveMods = null) {
  const m = { ...BASE };
  // Major-stat influences (see header).
  m.maxHp += attrs.power * ATTR_SCALE.power.maxHp;
  m.critDamage += attrs.power * ATTR_SCALE.power.critDamage;
  m.blockChance += attrs.power * ATTR_SCALE.power.blockChance;
  // Power carries armour the same way it carries block -- a stronger hunter
  // wears heavier plate. Gear is still where most armour comes from.
  m.armor += attrs.power * ATTR_SCALE.power.armor;
  m.maxStamina += attrs.speed * ATTR_SCALE.speed.maxStamina;
  m.attackSpeed += attrs.speed * ATTR_SCALE.speed.attackSpeed;
  m.dodgeChance += attrs.speed * ATTR_SCALE.speed.dodgeChance;
  // ROUND 58 -- "Speed (after the increase should also add a 12% movement
  // speed increase.)" The one attribute effect a player feels every second of
  // play rather than only in combat.
  m.moveSpeed += attrs.speed * ATTR_SCALE.speed.moveSpeed;
  m.maxMana += attrs.spirit * ATTR_SCALE.spirit.maxMana;
  m.castSpeed += attrs.spirit * ATTR_SCALE.spirit.castSpeed;
  m.critChance += attrs.spirit * ATTR_SCALE.spirit.critChance;
  for (const e of ELEMENT_TYPES) m[`resist_${e}`] += attrs.spirit * ATTR_SCALE.spirit.resist;
  // ROUND 58 -- "Spirit (after the increase) should also increase the range of
  // aura abilities by 12% per point." A standing field is the one thing in the
  // kit whose value is its footprint, so this is Spirit buying area rather than
  // another rate.
  m.auraRange += attrs.spirit * ATTR_SCALE.spirit.auraRange;
  m.hpRegen += attrs.recovery * ATTR_SCALE.recovery.hpRegen;
  m.staminaRegen += attrs.recovery * ATTR_SCALE.recovery.staminaRegen;
  m.manaRegen += attrs.recovery * ATTR_SCALE.recovery.manaRegen;
  // Item + relic buffs.
  for (const buffs of itemBuffLists) {
    for (const b of (buffs || [])) {
      if (m[b.stat] !== undefined) m[b.stat] += b.amount;
    }
  }
  // Passive-ability contributions (crit passives, maxHp passives).
  if (passiveMods) {
    m.critChance += passiveMods.critChance || 0;
    m.critDamage += passiveMods.critDamage || 0;
    m.maxHp += passiveMods.maxHpBonus || 0;
    // ROUND 27: passive armour (the 'armor' passiveBuff kind and summoned
    // armour relics) joins the same stack as gear armour, so the 80% cap
    // below is the ONE place armour is limited.
    m.armor += passiveMods.armorBonus || 0;
    // ROUND 58 -- RESISTANCE FROM ABILITIES.
    //
    // "Elemental resistance should also come from some passive abilities,
    //  buffs, and aura abilities not exclusively gear."
    //
    // It was gear-only, and not by design: the `ward` lever has been writing
    // `spec.resist` onto abilities since round 48, the stats line has been
    // printing "+11% shadow resistance", the description has been promising it
    // -- and NOTHING read the field. Correct text, correct spec line, no
    // effect. The same round-48 fault the taunt adapter was written to catch.
    if (passiveMods.resistBonus) {
      for (const e of ELEMENT_TYPES) m[`resist_${e}`] += passiveMods.resistBonus[e] || 0;
    }
  }
  // Caps.
  for (const [k, cap] of Object.entries(CAPS)) m[k] = Math.min(m[k], cap);
  return m;
}

// Display formatting for one stat value.
export function formatMinorStat(key, value) {
  const def = MINOR_STAT_BY_KEY[key];
  if (!def) return String(value);
  if (def.kind === 'flat') return String(Math.round(value));
  if (def.kind === 'mult') return `${value.toFixed(2)}x`;
  if (def.kind === 'ratePct') return `${(value * 100).toFixed(1)}%/s`;
  return `${Math.round(value * 100)}%`;
}

// --- Rarity tiers --------------------------------------------------------
export const RARITY_TIERS = [
  { key: 'Common', color: '#ffffff', word: 'white', slots: 0, weight: 42 },
  { key: 'Uncommon', color: '#66bb6a', word: 'green', slots: 1, weight: 32 },
  { key: 'Rare', color: '#4fc3f7', word: 'blue', slots: 2, weight: 16 },
  { key: 'Epic', color: '#ba68c8', word: 'purple', slots: 3, weight: 7 },
  // ROUND 282 -- "Legendary items should be extremely rare .001% chance."
  // One in a hundred thousand rolls (0.00097 of the 97 total). And Divine is
  // never rolled: asked, the user made it the gods' items only, which the
  // divine set (round 65) already grants.
  { key: 'Legendary', color: '#ffb74d', word: 'orange', slots: 4, weight: 0.00097 },
  { key: 'Divine', color: '#ef5350', word: 'red', slots: 5, weight: 0 },
];
export const RARITY_BY_KEY = Object.fromEntries(RARITY_TIERS.map(t => [t.key, t]));

// Base (green-tier) magnitudes per rollable minor stat.
export const BUFF_BASE = {
  maxHp: 8, maxStamina: 6, maxMana: 6,
  critChance: 0.03, critDamage: 0.10, blockChance: 0.04, dodgeChance: 0.03, armor: 0.03,
  hpRegen: 0.002, staminaRegen: 0.005, manaRegen: 0.005,
  attackSpeed: 0.05, castSpeed: 0.05, cooldownReduction: 0.04,
};
for (const e of ELEMENT_TYPES) BUFF_BASE[`resist_${e}`] = 0.08;
const ROLLABLE = Object.keys(BUFF_BASE);

// Rolls the buff list for a tier: n <= slots buffs, each at
// base * 1.25^(slots - n) -- the user's own blue-tier rule ("2 minor stat
// buffs or 1 minor stat buff thats 25% higher then green"), generalized.
export function rollBuffs(tierKey, rng = Math.random) {
  const tier = RARITY_BY_KEY[tierKey];
  if (!tier || tier.slots === 0) return [];
  const n = 1 + Math.floor(rng() * tier.slots);
  const mult = Math.pow(1.25, tier.slots - n);
  const pool = [...ROLLABLE];
  const buffs = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    const stat = pool.splice(idx, 1)[0];
    const base = BUFF_BASE[stat];
    const amount = MINOR_STAT_BY_KEY[stat].kind === 'flat' ? Math.round(base * mult) : base * mult;
    buffs.push({ stat, amount });
  }
  return buffs;
}

/** ROUND 291 -- "Better to combine the same stat, otherwise its confusing
 *  for the calculation on the players side." A piece's inherent armour and a
 *  rolled armour bonus stay two buffs in the DATA (crafting and the rungs
 *  scale them differently), but every place that SHOWS a piece's buffs shows
 *  one line per stat, summed, in the order the stats first appear. */
export function mergedBuffs(buffs) {
  const out = [], at = new Map();
  for (const b of (buffs || [])) {
    if (!b || typeof b.amount !== 'number') { out.push(b); continue; }
    const i = at.get(b.stat);
    if (i === undefined) { at.set(b.stat, out.length); out.push({ stat: b.stat, amount: b.amount }); continue; }
    const flat = MINOR_STAT_BY_KEY[b.stat] && MINOR_STAT_BY_KEY[b.stat].kind === 'flat';
    const sum = out[i].amount + b.amount;
    out[i].amount = flat ? Math.round(sum) : Math.round(sum * 1000) / 1000;
  }
  return out;
}

export function formatBuff(b) {
  const def = MINOR_STAT_BY_KEY[b && b.stat];
  // ROUND 49 -- NEVER THROW ON A STAT WE DO NOT KNOW.
  //
  // This line was `MINOR_STAT_BY_KEY[b.stat].kind`, and an unrecognised stat
  // took the whole inventory screen down with "Cannot read properties of
  // undefined (reading 'kind')" -- the render is a .map() over every item, so
  // one bad buff on one item blanks the page rather than one row.
  //
  // A UI formatter is the wrong place to enforce a data contract. It is a leaf
  // called from four render paths and it cannot fix anything; what it can do is
  // stay legible and let the integrity check (see validateDataIds) be the thing
  // that actually complains. So an unknown stat prints its own key and the
  // number, which is more useful to whoever has to debug it than a blank
  // screen was.
  if (!def) {
    const n = (b && typeof b.amount === 'number') ? b.amount : 0;
    return `+${Number.isInteger(n) ? n : n.toFixed(2)} ${(b && b.stat) || 'unknown'}`;
  }
  const v = def.kind === 'flat' ? `+${Math.round(b.amount)}` :
    def.kind === 'mult' ? `+${b.amount.toFixed(2)}x` :
    def.kind === 'ratePct' ? `+${(b.amount * 100).toFixed(1)}%/s` :
    `+${Math.round(b.amount * 100)}%`;
  return `${v} ${def.label}`;
}

// --- Dropped gear items --------------------------------------------------
// ROUND 27 -- CHEST and SHIELD joined the paperdoll. They had been the
// conjured relics' territory, which was fine while armour was decorative and
// is not fine now that it carries a stat: the ask names "shields, chests,
// belts, gloves, boots" as the things that have Armor, and two of those had
// nowhere to be equipped. The summoned body/weapon relics still exist and
// still stack their own buffs on top -- this adds slots, it does not take
// anything away from the summon abilities.
// ROUND 31 -- `amulet` becomes a REAL gear slot. It had a paperdoll cell
// since round 6 but nothing that could occupy it, which is why a summoned
// relic was parked there and why a "Signet" -- a ring word -- ended up
// labelled as the player's necklace. A slot that can hold a real item can be
// given real nouns, and then the name and the art agree by construction
// rather than by a keyword guess. ("Only the proper art and names should be
// in each slot.")
// ROUND 35 -- `legs` is a real slot. The drop included 16 leather trouser
// designs and the game had nowhere to put them; the order below is
// anatomical (belt -> legs -> boots) because the paperdoll lays slots out in
// this order and armorPaint.js keys its regions off body position.
// ROUND 38 -- shield left the gear slots: "The shield is not it's own slot
// but a left hand or right hand item." Shield ITEMS still exist, still roll
// and still carry inherent armour (SLOT_ARMOR keeps its entry); what changed
// is where one goes when equipped -- into a free HAND, alongside weapons.
// GEAR_ROLL_SLOTS keeps shields droppable now that the random slot pick no
// longer includes them.
export const GEAR_SLOTS = ['helmet', 'chest', 'gloves', 'belt', 'legs', 'boots', 'ring', 'amulet'];
export const GEAR_ROLL_SLOTS = [...GEAR_SLOTS, 'shield'];
export const GEAR_SLOT_LABEL = {
  helmet: 'Helmet', chest: 'Chest', shield: 'Shield',
  gloves: 'Gloves', belt: 'Belt', legs: 'Legs', boots: 'Boots', ring: 'Ring', amulet: 'Amulet',
};   // shield label kept: shield items still name themselves by it
// Which slots are ARMOUR -- i.e. carry an inherent Armor value before any
// random buffs. The ring is the odd one out and stays the accessory slot,
// which is also the slot the guildmaster's starter set deliberately skips.
export const ARMOR_SLOTS = ['helmet', 'chest', 'gloves', 'belt', 'legs', 'boots'];
// Inherent armour by slot, at Common. A full Common set is 0.24 -- meaningful
// but a long way off the 80% cap, so armour stays something you improve
// rather than something you solve. Weighted by how much of a body each piece
// actually covers: a chest plate is worth four belts.
// ROUND 35 -- legs at 0.05 sits second only to the chest, which is what the
// coverage weighting above implies: trousers cover more of a body than a
// helm (0.045) or boots (0.03). A full Common set goes 0.24 -> 0.29, still
// a long way off the 0.80 cap, so the "improve it, don't solve it" intent
// survives the extra piece.
const SLOT_ARMOR = { chest: 0.07, shield: 0.06, legs: 0.05, helmet: 0.045, gloves: 0.025, belt: 0.02, boots: 0.03 };
const SLOT_NOUN = {
  helmet: ['Helm', 'Casque', 'Circlet'], chest: ['Cuirass', 'Hauberk', 'Breastplate'],
  shield: ['Shield', 'Bulwark', 'Aegis'], gloves: ['Gauntlets', 'Gloves', 'Grips'],
  belt: ['Girdle', 'Belt', 'Sash'], boots: ['Greaves', 'Boots', 'Treads'],
  // Leg words only. Deliberately kept clear of the boots list -- "Greaves"
  // is historically shin armour and already lives there, so reusing it here
  // would reintroduce exactly the round-29 complaint about a slot showing
  // another slot's noun.
  legs: ['Leggings', 'Trousers', 'Breeches', 'Chausses'],
  // Ring words only in the ring slot, necklace words only in the amulet
  // slot. This is the whole fix for "a signet is in the amulet spot but that
  // needs to be a necklace": the slot picks the noun, so it cannot happen.
  ring: ['Ring', 'Band', 'Signet'],
  amulet: ['Amulet', 'Pendant', 'Necklace', 'Torc', 'Locket'],
};
const RARITY_PREFIX = {
  Common: ['Worn', 'Plain', 'Simple', 'Sturdy'],
  Uncommon: ['Runed', 'Keen', 'Hardy', 'Polished'],
  Rare: ['Enchanted', 'Gleaming', 'Tempered', 'Warded'],
  Epic: ['Exalted', 'Sorcerous', 'Stormforged', 'Regal'],
  Legendary: ['Mythic', 'Sunforged', 'Dragonbone', 'Kingsmark'],
  Divine: ['Divine', 'Godwrought', 'Celestial', 'Worldshaper'],
};
const STAT_SUFFIX = {
  maxHp: 'of Vigor', maxStamina: 'of Endurance', maxMana: 'of the Wellspring',
  critChance: 'of the Hawk', critDamage: 'of Ruin', blockChance: 'of the Wall',
  armor: 'of the Bulwark',
  dodgeChance: 'of the Fox', hpRegen: 'of Mending', staminaRegen: 'of the Marathon',
  manaRegen: 'of Clarity', attackSpeed: 'of the Zephyr', castSpeed: 'of Quicksilver',
  cooldownReduction: 'of Readiness',
  resist_fire: 'of Ember-Warding', resist_frost: 'of Winter-Warding',
  resist_lightning: 'of Storm-Warding', resist_nature: 'of Thorn-Warding',
  resist_shadow: 'of Dusk-Warding', resist_radiant: 'of Dawn-Warding',
};

// ROUND 35 -- the element an item's ART should be tinted with, or null.
//
// Read off the item's own rolled buffs rather than stored as a separate
// field, so it needs no migration and cannot drift out of sync with what
// the tooltip says: if the item grants Ember-Warding, it looks like fire.
// The first resist_* buff wins -- items can roll more than one, and a
// single icon can only show one colour, so "the first one rolled" is the
// rule rather than an arbitrary priority order between elements.
export function itemElement(item) {
  if (!item || !item.buffs) return null;
  for (const b of item.buffs) {
    if (b && typeof b.stat === 'string' && b.stat.startsWith('resist_')) {
      const e = b.stat.slice(7);
      if (ELEMENT_TYPES.includes(e)) return e;
    }
  }
  return null;
}

export function rollGearRarity(rng = Math.random) {
  const total = RARITY_TIERS.reduce((s, t) => s + t.weight, 0);
  let r = rng() * total;
  for (const t of RARITY_TIERS) { r -= t.weight; if (r <= 0) return t.key; }
  return 'Common';
}

let nextGearUid = 1;
/**
 * A slot's inherent armour.
 *
 * ROUND 74 (item 8) -- KEYED ON RANK, NOT RARITY. Since round 10 this read
 * `1 + tier * 0.3`, so a Divine cuirass carried 2.5x a Common one's armour and
 * rarity was the only thing that made steel tougher. That is what made the
 * user's rule unrepresentable: an Uncommon Bronze breastplate cannot be
 * tougher than a Legendary Iron one while rarity alone multiplies the number,
 * and no rank ladder that respects ARMOR_CAP can out-multiply a 2.2x head
 * start. See the note on GEAR_CAPPED_STAT_EXPONENT for the full argument.
 *
 * Rarity has not lost anything it was ever really for: it still decides how
 * many buffs a piece rolls and how concentrated they are (RARITY_TIERS.slots,
 * rollBuffs), which is the difference between a plain plate and a famous one.
 *
 * `rank`/`level` default to Iron 0, so the round-65 god-armour call site and
 * anything else passing two arguments gets exactly what it got before.
 */
export function slotArmorFor(slot, rank = 'iron', level = 0) {
  const base = SLOT_ARMOR[slot];
  if (!base) return 0;
  const soft = Math.pow(gearRankMult(rank) * gearLevelMult(level), GEAR_CAPPED_STAT_EXPONENT);
  return Math.round(base * soft * 1000) / 1000;
}

// ===========================================================================
// ROUND 74 (item 8) -- ITEM RANK AND ITEM LEVEL.
//
// The user:
//
//   "There should be an item rank and item level system for gear. You should
//    not be able to equip an item above your rank. An uncommon bronze rank
//    item should be better then a legendary iron rank item."
//
// Before this round an item was a rarity and nothing else. That gave the whole
// game ONE axis of gear progression with six notches on it, which is why a
// Legendary dropped in the first hour was still the best thing a Gold-rank
// character owned -- there was no way for the world to hand out better steel
// as you climbed, only rarer steel.
//
// TWO AXES NOW, and the user's sentence is what sets their relative weight:
//
//   RARITY  how well this particular piece rolled. Common..Divine, six
//           notches, +25% each. This is the axis that already existed and it
//           is unchanged -- it still decides how many buffs a piece carries.
//   RANK    what tier of the world it came from. Iron..Gold, and a rank is
//           worth GEAR_RANK_STEP of the rarity axis end to end.
//   LEVEL   0-9 within a rank, the same ten-step ladder essences climb, worth
//           up to +30% across the rank.
//
// GEAR_RANK_STEP = 2.2 is SOLVED from the user's sentence, not chosen. An
// Uncommon (1.25) at one rank up must beat a Legendary (2.0) at the rank
// below, so the step must exceed 2.0/1.25 = 1.6. At 2.2:
//
//   Legendary Iron 0 ....... 2.00      Uncommon Bronze 0 ...... 2.75   ✓
//   Legendary Iron 9 ....... 2.60      Uncommon Bronze 0 ...... 2.75   ✓
//   Divine Iron 9 .......... 2.93      Common Bronze 0 ........ 2.20
//
// -- so the rule the user stated holds even at the extreme ends of both
// ranks, while a PERFECT piece of the lower rank still edges out a poor piece
// of the higher one. That last property is deliberate: it means a Divine you
// found early stays worth carrying for a while rather than being obsoleted by
// the first grey drop of the next rank.
//
// No diamond, per the standing rule.
export const GEAR_RANKS = ['iron', 'bronze', 'silver', 'gold'];
export const GEAR_RANK_STEP = 2.2;
export const GEAR_LEVELS_PER_RANK = 10;
export const GEAR_LEVEL_SPAN = 0.3;

/**
 * ROUND 74 -- WHY THE COMPARISON SCALE AND THE STAT CURVE ARE TWO NUMBERS.
 *
 * `gearPower` above is the comparison scale and it is geometric, because the
 * user's sentence is about ranks being worth a lot. The STAT MAGNITUDES cannot
 * all follow it, and this is not a tuning preference -- it is arithmetic:
 *
 *   A flat stat has no ceiling. +8 max HP at Iron becoming +111 at Gold 9 is
 *   fine and is what an end-game piece should look like.
 *
 *   A PERCENTAGE stat lives in a bounded space with a cap (CAPS, below:
 *   armour 0.80, dodge 0.60, resist 0.75). A chest plate starts at 0.112
 *   armour -- already a seventh of the ceiling -- so multiplying it by 13.8
 *   does not make a better chest plate, it makes one chest plate that reaches
 *   the cap on its own and four other armour slots that do nothing. Measured:
 *   0.112 x 13.84 = 1.55, clamped to 0.80 by a single item.
 *
 * So flat stats take the full multiplier and capped ones take its CUBE ROOT,
 * which lands a Gold 9 chest at 0.269 -- more than twice an Iron piece, still
 * leaving every other slot something to contribute before the cap.
 *
 * AND INHERENT ARMOUR IS RANK-DRIVEN, NOT RARITY-DRIVEN. That is the other
 * half of making the user's sentence true rather than merely representable.
 * Rarity's job is how MANY buffs a piece rolled -- that is what RARITY_TIERS
 * `slots` has always meant. Letting it also multiply the armour by up to 2.2x
 * made a Legendary Iron breastplate genuinely tougher than an Uncommon Bronze
 * one whatever the ranks said, and no rank ladder that respects the cap can
 * out-multiply that. Rarity = how well it rolled; rank = how good the steel
 * is. The two axes now mean different things instead of both meaning "better".
 *
 * One honest limit, stated rather than hidden: a Legendary that rolls a SINGLE
 * buff gets `rollBuffs`'s concentration bonus (1.25^3 = 1.95x), so on that one
 * stat it can still edge an Uncommon of the next rank up. The user's rule is
 * enforced exactly where a player acts on it -- `gearPower`, the comparison on
 * the card, and the inherent armour every armour piece carries.
 */
export const GEAR_CAPPED_STAT_EXPONENT = 1 / 3;

/** Where a rank sits on the gear ladder. Anything unrecognised is Iron --
 *  including 'normal', because a Normal-rank character's starting kit is
 *  ordinary steel and there is no tier below Iron for gear to occupy. */
export function gearRankIndex(rank) {
  const i = GEAR_RANKS.indexOf(String(rank || 'iron'));
  return i < 0 ? 0 : i;
}
export function gearRankMult(rank) {
  return Math.pow(GEAR_RANK_STEP, gearRankIndex(rank));
}
export function gearLevelMult(level) {
  const l = Math.max(0, Math.min(GEAR_LEVELS_PER_RANK - 1, level || 0));
  return 1 + (l / (GEAR_LEVELS_PER_RANK - 1)) * GEAR_LEVEL_SPAN;
}
export function gearRarityMult(rarity) {
  return 1 + Math.max(0, RARITY_TIERS.findIndex(t => t.key === rarity)) * 0.25;
}

/** One number for "how good is this piece", across all three axes. This is
 *  what the comparison tooltip ranks by and what the user's sentence is about.
 *  An item written before round 74 carries no rank or level and scores as
 *  Iron 0, which is what it was. */
export function gearPower(item) {
  if (!item) return 0;
  return Math.round(gearRarityMult(item.rarity) * gearRankMult(item.rank)
    * gearLevelMult(item.level) * 100) / 100;
}

/** "You should not be able to equip an item above your rank." Compared on the
 *  GEAR ladder, so a Normal-rank character can still wear the Iron gear they
 *  start the game in -- refusing that would leave a new player naked. */
export function canEquipGear(item, playerRank) {
  // ROUND 284 -- [Dark Hydra Robe]: "Adapts to fit the wearer, within a
  // certain range." One rank of give.
  return gearRankIndex(item && item.rank) <= gearRankIndex(playerRank) + ((item && item.fitsAbove) || 0);
}

/** How a piece names its own standing, for a card or a row: "Bronze 4". */
export function gearRankLabel(item) {
  if (!item) return '';
  const r = GEAR_RANKS[gearRankIndex(item.rank)];
  return `${r.charAt(0).toUpperCase()}${r.slice(1)} ${Math.max(0, Math.min(9, item.level || 0))}`;
}

export function rollGearItem(rng = Math.random, forcedSlot = null, forcedRarity = null,
  rank = 'iron', level = 0) {
  const slot = forcedSlot || GEAR_ROLL_SLOTS[Math.floor(rng() * GEAR_ROLL_SLOTS.length)];
  const rarity = forcedRarity || rollGearRarity(rng);
  const buffs = rollBuffs(rarity, rng);
  // The inherent armour is prepended as an ordinary buff rather than living in
  // a separate field, so every existing consumer -- the stat stack, the
  // paperdoll tooltip, the item table -- picks it up with no changes at all.
  // ROUND 74 -- the Iron-0 base. The rank/level curve is applied to it below,
  // in the same loop as every rolled buff, rather than here: applying it in
  // both places would square it, and one multiplication site is one place to
  // be wrong.
  const inherent = slotArmorFor(slot);
  if (inherent > 0) buffs.unshift({ stat: 'armor', amount: inherent, inherent: true });
  // ROUND 74 (item 8) -- and the rank/level multiplier is applied to every one
  // of them, inherent armour included. Applied to the AMOUNTS rather than kept
  // as a separate multiplier read at stat time, for the reason the inherent
  // armour is a buff in the first place: every consumer that already reads a
  // buff list -- the stat stack, the paperdoll, the comparison tooltip, the
  // sell value -- then sees the true number with no changes at all. The rarity
  // multiplier is NOT included here; rarity's contribution is the number of
  // buffs a piece carries, which `rollBuffs` has always decided.
  const power = gearRankMult(rank) * gearLevelMult(level);
  if (power !== 1) {
    const soft = Math.pow(power, GEAR_CAPPED_STAT_EXPONENT);
    for (const b of buffs) {
      const flat = MINOR_STAT_BY_KEY[b.stat] && MINOR_STAT_BY_KEY[b.stat].kind === 'flat';
      b.amount = flat
        ? Math.round(b.amount * power)
        : Math.round(b.amount * soft * 1000) / 1000;
    }
  }
  const prefix = RARITY_PREFIX[rarity][Math.floor(rng() * RARITY_PREFIX[rarity].length)];
  const noun = SLOT_NOUN[slot][Math.floor(rng() * SLOT_NOUN[slot].length)];
  // Named after a ROLLED buff, not the inherent armour -- otherwise every
  // armour piece in the game would be "of the Bulwark".
  const rolled = buffs.find(b => !b.inherent);
  const suffix = rolled ? ` ${STAT_SUFFIX[rolled.stat] || ''}` : '';
  // ROUND 282 -- "Effects on top of stat lines". The stat roll above is
  // untouched; an Uncommon-or-better item may also carry effects, a maker's
  // description and type tags (itemEffects.js). The effect roll uses its own
  // stream, seeded by ONE draw of this one.
  const extra = gearExtras(rng, slot, rarity, GEAR_RANKS[gearRankIndex(rank)], noun);
  return {
    uid: nextGearUid++,
    ...extra,
    slot, rarity,
    // ROUND 74 -- normalised through the same helpers everything else reads,
    // so an out-of-range argument cannot put an item on a rung that does not
    // exist. `level` is clamped into 0-9 the way the essence ladder is.
    rank: GEAR_RANKS[gearRankIndex(rank)],
    level: Math.max(0, Math.min(GEAR_LEVELS_PER_RANK - 1, Math.round(level || 0))),
    name: extra.name || `${prefix} ${noun}${suffix}`.trim(),
    buffs,
  };
}

/** ROUND 283 -- THE RITUAL, ON A PIECE OF GEAR. One rank up: every rolled
 *  stat moves by the same rank multiplier `rollGearItem` applied at the roll
 *  (flat stats by the whole step, capped ones by the softened step), the
 *  effects grow with it, and the next rank's conditions replace these. The
 *  item's level is kept. Returns false at gold, the top. */
export function growGearItem(item, rng = Math.random) {
  if (!item) return false;
  const from = GEAR_RANKS[gearRankIndex(item.rank)];
  const i = GEAR_RANKS.indexOf(from);
  const to = GEAR_RANKS[i + 1];
  if (!to || to === 'diamond') return false;
  const step = gearRankMult(to) / gearRankMult(from);
  const soft = Math.pow(step, GEAR_CAPPED_STAT_EXPONENT);
  for (const b of (item.buffs || [])) {
    const flat = MINOR_STAT_BY_KEY[b.stat] && MINOR_STAT_BY_KEY[b.stat].kind === 'flat';
    b.amount = flat ? Math.round(b.amount * step) : Math.round(b.amount * soft * 1000) / 1000;
  }
  growEffects(item.effects, from, to);
  item.rank = to;
  item.growth = growthConditionsFor(rng, item);
  return true;
}

/** ROUND 282 -- the effect half of an item: effects, description, tags,
 *  set membership (Epic and up) and growth conditions (Legendary). */
function gearExtras(rng, slot, rarity, rank, noun) {
  const seed = Math.floor(rng() * 4294967296);
  if (rarity === 'Common' || rarity === 'Divine') return {};
  let s = (seed >>> 0) || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const probe = { slot, rarity, rank, noun };
  const effects = rollItemEffects(r, probe);
  if (!effects.length) return {};
  const d = itemDescription(r, probe);
  const out = { effects, desc: d.desc, typeTags: d.tags };
  // Named for what it is made of, as his are ([Dark Hydra Robe], [Night Fang]).
  const mat = d.material || d.metal || '';
  if (mat) {
    const title = mat.replace(/^(a|an) /, '').split(' ')
      .map(w => w.replace(/(?<!s)s$/, '')).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    out.name = `${title} ${noun}`;
  }
  if ((rarity === 'Epic' || rarity === 'Legendary') && mat && r() < SET_CHANCE) out.set = mat;
  if (rarity === 'Legendary') out.growth = growthConditionsFor(r, probe);
  return out;
}
