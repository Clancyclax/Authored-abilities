// ===========================================================================
// ROUND 190 (item 7) -- HIDDEN BUILD CLASSES.
//
//   "In order to promote synergy we will create hidden build classifications
//    based on confluence essences. This will inform the generator how to fill
//    the ability slots after a confluence essence is slotted. Prior to the
//    confluence essence the essences themselves will be the primary driver of
//    abilities. However after slotting a confluence essence the primary
//    driver will be the synergy overall."
//
// The table is the "Confluence Classes" tab of the user's HWFWM TTRPG sheet,
// transcribed row for row (100 confluences). Ziz has no row there and takes
// DEFAULT_CLASS. Never shown to the player: it only steers which candidate a
// socket takes (`classPull`) and how many of the twenty are active
// (`activeTargetFor`).
//
//   PRIMARY   (one of)  dps      -- the majority of actives are attacks
//                       tank     -- half the actives are defensive
//                       healing  -- half the actives heal
//                       support  -- half the actives support
//   SECONDARY (three)   burst buff debuff dot hot summoning shield healing
//                       terrain movement defensive passive
//                       (`passive` trades active slots for passive ones)
//   TERTIARY            melee / ranged / aoe -- which way the kit LEANS is
//                       read off the other essences (a sword essence leans
//                       melee, a magic one ranged); AOE rides on whichever.
// ===========================================================================

export const CONFLUENCE_CLASSES = {
  Action: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee'] },
  Alchemy: { primary: 'support', secondary: ['healing', 'buff', 'debuff'], tertiary: ['ranged', 'aoe'] },
  Ambush: { primary: 'dps', secondary: ['burst', 'dot', 'passive'], tertiary: ['melee'] },
  Animate: { primary: 'dps', secondary: ['summoning', 'dot', 'debuff'], tertiary: ['ranged'] },
  Anzu: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['ranged', 'aoe'] },
  Arsenal: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged'] },
  Avatar: { primary: 'dps', secondary: ['burst', 'summoning'], tertiary: ['melee', 'ranged'] },
  Battlefield: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['aoe', 'ranged'] },
  Behemoth: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee'] },
  Boundary: { primary: 'tank', secondary: ['defensive', 'terrain', 'debuff'], tertiary: ['melee', 'ranged'] },
  Bounty: { primary: 'healing', secondary: ['healing', 'buff', 'debuff'], tertiary: ['aoe', 'ranged'] },
  Cataclysm: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['aoe', 'ranged'] },
  Chaotic: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged', 'aoe'] },
  Charlatan: { primary: 'support', secondary: ['buff', 'debuff', 'movement'], tertiary: ['melee'] },
  Chimera: { primary: 'dps', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Cyborg: { primary: 'tank', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged'] },
  Cycle: { primary: 'dps', secondary: ['burst', 'dot', 'buff'], tertiary: ['melee', 'ranged'] },
  Dawn: { primary: 'dps', secondary: ['burst', 'dot', 'buff'], tertiary: ['melee', 'ranged'] },
  Desolate: { primary: 'dps', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Discordant: { primary: 'dps', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Doom: { primary: 'dps', secondary: ['dot', 'debuff', 'summoning'], tertiary: ['melee', 'ranged'] },
  Doppelganger: { primary: 'support', secondary: ['buff', 'debuff', 'passive'], tertiary: ['ranged', 'aoe'] },
  Dragon: { primary: 'dps', secondary: ['burst', 'passive', 'buff'], tertiary: ['melee', 'ranged'] },
  Eclipse: { primary: 'dps', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Edifice: { primary: 'support', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Effigy: { primary: 'support', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Empower: { primary: 'support', secondary: ['buff', 'shield', 'healing'], tertiary: ['ranged'] },
  Fertile: { primary: 'healing', secondary: ['buff', 'healing', 'hot'], tertiary: ['ranged'] },
  Fey: { primary: 'support', secondary: ['debuff', 'buff', 'dot'], tertiary: ['ranged'] },
  Firebird: { primary: 'dps', secondary: ['burst', 'dot', 'hot'], tertiary: ['melee', 'ranged', 'aoe'] },
  Force: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged'] },
  Forge: { primary: 'tank', secondary: ['defensive', 'dot', 'passive'], tertiary: ['melee'] },
  Fortress: { primary: 'tank', secondary: ['defensive', 'hot', 'passive'], tertiary: ['melee'] },
  Garuda: { primary: 'dps', secondary: ['burst', 'defensive', 'movement'], tertiary: ['melee', 'ranged', 'aoe'] },
  Gate: { primary: 'support', secondary: ['movement', 'burst', 'debuff'], tertiary: ['aoe', 'ranged'] },
  Glimeron: { primary: 'support', secondary: ['debuff', 'dot', 'hot'], tertiary: ['ranged'] },
  Gorgon: { primary: 'dps', secondary: ['debuff', 'buff', 'dot'], tertiary: ['ranged', 'melee'] },
  Griffin: { primary: 'dps', secondary: ['burst', 'movement', 'buff'], tertiary: ['melee', 'ranged'] },
  Guardian: { primary: 'tank', secondary: ['defensive', 'buff', 'passive'], tertiary: ['melee'] },
  Harpy: { primary: 'dps', secondary: ['burst', 'movement', 'dot'], tertiary: ['melee'] },
  Harvest: { primary: 'healing', secondary: ['buff', 'healing', 'hot'], tertiary: ['ranged', 'melee'] },
  Hydra: { primary: 'dps', secondary: ['dot', 'hot', 'passive'], tertiary: ['melee', 'aoe'] },
  Immortal: { primary: 'tank', secondary: ['defensive', 'buff', 'hot'], tertiary: ['melee'] },
  Juggernaut: { primary: 'tank', secondary: ['defensive', 'burst', 'passive'], tertiary: ['melee'] },
  Karmic: { primary: 'dps', secondary: ['buff', 'debuff', 'passive'], tertiary: ['melee'] },
  Kraken: { primary: 'dps', secondary: ['defensive', 'buff', 'dot'], tertiary: ['ranged'] },
  Leviathan: { primary: 'tank', secondary: ['defensive', 'buff', 'burst'], tertiary: ['melee'] },
  Lotus: { primary: 'dps', secondary: ['burst', 'dot', 'buff'], tertiary: ['melee'] },
  Magitech: { primary: 'dps', secondary: ['burst', 'dot', 'hot'], tertiary: ['ranged'] },
  Manticore: { primary: 'dps', secondary: ['burst', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Master: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged'] },
  Ministration: { primary: 'support', secondary: ['buff', 'debuff', 'passive'], tertiary: ['melee', 'ranged'] },
  Minotaur: { primary: 'dps', secondary: ['defensive', 'buff', 'passive'], tertiary: ['melee'] },
  Mirage: { primary: 'support', secondary: ['buff', 'debuff', 'passive'], tertiary: ['melee', 'ranged'] },
  Monolith: { primary: 'tank', secondary: ['defensive', 'defensive', 'passive'], tertiary: ['melee'] },
  Mystic: { primary: 'dps', secondary: ['burst', 'dot', 'hot'], tertiary: ['ranged', 'aoe'] },
  Nebula: { primary: 'dps', secondary: ['burst', 'dot', 'buff'], tertiary: ['ranged', 'aoe'] },
  Nemesis: { primary: 'dps', secondary: ['summoning', 'debuff', 'dot'], tertiary: ['melee', 'ranged'] },
  Network: { primary: 'support', secondary: ['buff', 'passive', 'movement'], tertiary: ['ranged'] },
  Oasis: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['aoe', 'ranged'] },
  Ocean: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['aoe', 'ranged'] },
  Onslaught: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['aoe', 'melee'] },
  Phantasmagoria: { primary: 'dps', secondary: ['debuff', 'dot', 'summoning'], tertiary: ['aoe', 'ranged'] },
  Phoenix: { primary: 'dps', secondary: ['burst', 'summoning', 'dot'], tertiary: ['melee', 'ranged', 'aoe'] },
  Predatory: { primary: 'dps', secondary: ['burst', 'dot'], tertiary: ['melee', 'ranged'] },
  Prison: { primary: 'tank', secondary: ['defensive', 'defensive', 'debuff'], tertiary: ['melee', 'ranged'] },
  Prosperity: { primary: 'healing', secondary: ['buff', 'shield', 'healing'], tertiary: ['ranged', 'aoe'] },
  Refracting: { primary: 'support', secondary: ['debuff', 'buff', 'dot'], tertiary: ['ranged', 'aoe'] },
  Resonating: { primary: 'support', secondary: ['debuff', 'buff', 'hot'], tertiary: ['ranged', 'aoe'] },
  Roc: { primary: 'dps', secondary: ['summoning', 'burst'], tertiary: ['melee', 'ranged'] },
  Sacrifice: { primary: 'tank', secondary: ['buff', 'defensive', 'passive'], tertiary: ['melee'] },
  Scribe: { primary: 'support', secondary: ['buff', 'debuff', 'passive'], tertiary: ['melee', 'ranged'] },
  Serpent: { primary: 'dps', secondary: ['burst', 'dot', 'summoning'], tertiary: ['melee', 'ranged'] },
  Simulacrum: { primary: 'support', secondary: ['debuff', 'dot', 'summoning'], tertiary: ['melee', 'ranged'] },
  Skirmish: { primary: 'dps', secondary: ['burst', 'dot', 'passive'], tertiary: ['melee', 'ranged'] },
  Sky: { primary: 'dps', secondary: ['burst', 'movement', 'passive'], tertiary: ['melee', 'ranged'] },
  Soaring: { primary: 'dps', secondary: ['burst', 'movement', 'passive'], tertiary: ['melee', 'ranged'] },
  Sovereign: { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged'] },
  Stellar: { primary: 'dps', secondary: ['burst', 'movement', 'passive'], tertiary: ['ranged', 'aoe'] },
  Storm: { primary: 'dps', secondary: ['burst', 'dot', 'debuff'], tertiary: ['ranged', 'aoe'] },
  Succubus: { primary: 'dps', secondary: ['debuff', 'dot', 'summoning'], tertiary: ['melee', 'ranged'] },
  Swarm: { primary: 'dps', secondary: ['summoning', 'dot', 'debuff'], tertiary: ['melee', 'ranged'] },
  Talisman: { primary: 'support', secondary: ['debuff', 'dot', 'summoning'], tertiary: ['ranged', 'aoe'] },
  Thunderbird: { primary: 'dps', secondary: ['burst', 'dot', 'summoning'], tertiary: ['melee', 'ranged', 'aoe'] },
  Time: { primary: 'support', secondary: ['buff', 'shield', 'debuff'], tertiary: ['ranged', 'aoe'] },
  Tranquil: { primary: 'healing', secondary: ['buff', 'shield', 'hot'], tertiary: ['ranged', 'aoe'] },
  Transfiguration: { primary: 'dps', secondary: ['buff', 'passive', 'burst'], tertiary: ['melee', 'ranged'] },
  Transgression: { primary: 'dps', secondary: ['debuff', 'dot', 'summoning'], tertiary: ['melee', 'ranged'] },
  Troll: { primary: 'dps', secondary: ['burst', 'defensive', 'passive'], tertiary: ['melee', 'ranged'] },
  Twilight: { primary: 'dps', secondary: ['burst', 'debuff', 'dot'], tertiary: ['melee', 'ranged'] },
  Undeath: { primary: 'dps', secondary: ['debuff', 'dot', 'summoning'], tertiary: ['melee', 'ranged'] },
  Unity: { primary: 'dps', secondary: ['summoning', 'healing', 'buff'], tertiary: ['melee', 'ranged', 'aoe'] },
  Verdant: { primary: 'healing', secondary: ['shield', 'healing', 'buff'], tertiary: ['ranged', 'aoe'] },
  Vessel: { primary: 'dps', secondary: ['burst', 'buff', 'summoning'], tertiary: ['melee', 'ranged'] },
  Vision: { primary: 'support', secondary: ['buff', 'passive', 'debuff'], tertiary: ['ranged', 'aoe'] },
  Volcano: { primary: 'dps', secondary: ['burst', 'defensive', 'buff'], tertiary: ['melee', 'ranged'] },
  Vortex: { primary: 'dps', secondary: ['burst', 'dot', 'buff'], tertiary: ['melee', 'ranged'] },
  Weave: { primary: 'support', secondary: ['debuff', 'buff', 'passive'], tertiary: ['melee', 'ranged'] },
  Wendigo: { primary: 'dps', secondary: ['burst', 'summoning', 'passive'], tertiary: ['melee'] },
  Wrath: { primary: 'dps', secondary: ['burst', 'buff', 'dot'], tertiary: ['melee', 'ranged'] },
};
export const DEFAULT_CLASS = { primary: 'dps', secondary: ['burst', 'buff', 'passive'], tertiary: ['melee', 'ranged'] };

export const PRIMARY_ROLES = ['dps', 'tank', 'healing', 'support'];
export const SECONDARY_TAGS = ['burst', 'buff', 'debuff', 'dot', 'hot', 'summoning', 'shield',
  'healing', 'terrain', 'movement', 'defensive', 'passive'];

/** Twenty abilities, eight to fourteen of them active (7.5.1, 7.5.3-4). */
export const KIT_TOTAL = 20;
export const ACTIVE_MIN = 8;
export const ACTIVE_MAX = 14;
export const ACTIVE_DEFAULT = 12;
/** A `passive` secondary gives up this many active slots to passives. */
export const PASSIVE_SECONDARY_SHIFT = 2;

export function confluenceClassFor(name) {
  const row = name && CONFLUENCE_CLASSES[name];
  const c = row || DEFAULT_CLASS;
  return { name: name || null, primary: c.primary, secondary: [...new Set(c.secondary)], tertiary: [...c.tertiary], authored: !!row };
}

export function activeTargetFor(cls) {
  let n = ACTIVE_DEFAULT;
  if (cls && cls.secondary.includes('passive')) n -= PASSIVE_SECONDARY_SHIFT;
  // A dps class that is not also passive leans one further into actives.
  if (cls && cls.primary === 'dps' && !cls.secondary.includes('passive')) n += 1;
  return Math.max(ACTIVE_MIN, Math.min(ACTIVE_MAX, n));
}

// --------------------------------------------------------------------------
// THE LEAN (7.4, 7.5.7-8) -- melee or ranged, read off the essences.
// --------------------------------------------------------------------------
const RANGED_WEAPONS = new Set(['bow', 'crossbow', 'staff', 'javelin']);
const MELEE_FAMILIES = new Set(['blade', 'bludgeon', 'polearm', 'force', 'beast', 'guard', 'earth', 'serpent', 'blood', 'smallbeast']);
const RANGED_FAMILIES = new Set(['ranged', 'mind', 'light', 'fire', 'cold', 'storm', 'air', 'space', 'death', 'water', 'alchemy', 'craft', 'dark', 'life', 'flyer', 'aquatic', 'order', 'identity', 'motion']);

/** +1 melee, -1 ranged, 0 no opinion. `weaponOf` is weaponIdentityOf. */
export function essenceLeanScore(essDef, weaponOf) {
  if (!essDef) return 0;
  const w = weaponOf ? weaponOf(essDef) : null;
  if (w) return RANGED_WEAPONS.has(w) ? -2 : 2;   // a weapon is the loudest statement
  if (MELEE_FAMILIES.has(essDef.family)) return 1;
  if (RANGED_FAMILIES.has(essDef.family)) return -1;
  return 0;
}

/** The kit's class: the confluence's row, with its lean decided by the three
 *  essences among the tertiary options the row allows. */
export function kitClassFor(confName, essDefs, weaponOf) {
  const cls = confluenceClassFor(confName);
  const score = (essDefs || []).reduce((n, e) => n + essenceLeanScore(e, weaponOf), 0);
  const canMelee = cls.tertiary.includes('melee');
  const canRanged = cls.tertiary.includes('ranged');
  let lean;
  if (canMelee && !canRanged) lean = 'melee';
  else if (canRanged && !canMelee) lean = 'ranged';
  else lean = score > 0 ? 'melee' : (score < 0 ? 'ranged' : (canMelee ? 'melee' : 'ranged'));
  cls.lean = lean;
  cls.aoe = cls.tertiary.includes('aoe');
  cls.activeTarget = activeTargetFor(cls);
  return cls;
}

// --------------------------------------------------------------------------
// WHAT AN ABILITY IS, in the class's vocabulary.
// --------------------------------------------------------------------------
const MELEE_TEMPLATES = new Set(['sunderStrike', 'imbueStrike', 'chainStrike', 'stackStrike', 'aoeRing',
  'breathCone', 'confuseTurn', 'tauntPull', 'weakenRing', 'thornsBuff']);
const RANGED_TEMPLATES = new Set(['projectileBall', 'volley', 'rangeStrike', 'abilityLock', 'corpseBlast', 'corpseMine']);
const AOE_TEMPLATES = new Set(['aoeRing', 'breathCone', 'weakenRing', 'corpseBlast', 'corpseMiasma', 'corpseMine',
  'timeFreeze', 'bloomField', 'aoeHealPulse', 'partyBuff']);
const DEFENSIVE_TEMPLATES = new Set(['absorbShield', 'armorBuff', 'immunityBuff', 'reflectWard', 'thornsBuff',
  'barrierWall', 'tauntPull', 'statBuff']);
const HEALING_TEMPLATES = new Set(['selfHeal', 'selfHot', 'aoeHealPulse', 'bloomField', 'cleanse', 'corpseDrain', 'resourceRestore']);
const SUPPORT_TEMPLATES = new Set(['partyBuff', 'weakenRing', 'abilityLock', 'confuseTurn', 'timeFreeze',
  'cooldownReset', 'dispelStrike', 'aoeHealPulse', 'bloomField', 'rangeBuff', 'cleanse']);
const SUMMON_TEMPLATES = new Set(['activeSummon', 'summonBonded', 'raiseDead', 'summonWeapon', 'summonArmor', 'summonGear']);
const TERRAIN_TEMPLATES = new Set(['barrierWall', 'bloomField', 'corpseMiasma', 'timeFreeze', 'corpseMine']);
const DEBUFF_TEMPLATES = new Set(['weakenRing', 'abilityLock', 'confuseTurn', 'timeFreeze', 'sunderStrike', 'dispelStrike']);
const BUFF_TEMPLATES = new Set(['selfPower', 'selfCritBuff', 'statBuff', 'partyBuff', 'rangeBuff', 'movementHaste', 'cooldownReset']);

export function abilityRoles(a, dealsFn) {
  const t = a.template, cat = a.category;
  const deals = dealsFn ? dealsFn(a) : (typeof a.base === 'number' && a.base > 0);
  const active = a.kind === 'active';
  const r = {};
  r.attack = active && cat === 'attack' && deals;
  r.defensive = cat === 'defensive' || DEFENSIVE_TEMPLATES.has(t);
  r.healing = cat === 'healing' || HEALING_TEMPLATES.has(t) || !!a.healAmount;
  r.support = SUPPORT_TEMPLATES.has(t) || a.healScope === 'party' || a.healScope === 'ally';
  r.burst = r.attack && (a.cooldown || 0) >= 5 || t === 'selfPower' || t === 'selfCritBuff';
  r.buff = cat === 'buff' || BUFF_TEMPLATES.has(t);
  r.debuff = !!a.debuff || DEBUFF_TEMPLATES.has(t) || !!a.bindOnHit;
  r.dot = !!a.dot || t === 'corpseMiasma' || t === 'stackStrike';
  r.hot = t === 'selfHot' || t === 'bloomField' || !!a.hot || !!a.regenPerSec;
  r.summoning = cat === 'summon' || SUMMON_TEMPLATES.has(t) || /summon/.test(cat || '');
  r.shield = t === 'absorbShield' || !!a.shieldPerTick;
  r.terrain = TERRAIN_TEMPLATES.has(t) || a.summonKind === 'trap';
  r.movement = cat === 'movement';
  r.passive = a.kind === 'passive';
  // Support also covers any non-attack active whose whole job is a buff or a
  // debuff -- the sheet's support rows are Buff/Debuff rows.
  if (active && !r.attack && !r.defensive && (r.buff || r.debuff)) r.support = true;
  // reach, for attacks
  let melee = MELEE_TEMPLATES.has(t), ranged = RANGED_TEMPLATES.has(t);
  if (a.requiresWeapon) {
    const w = a.requiresWeapon;
    if (RANGED_WEAPONS.has(w)) { ranged = true; melee = false; } else { melee = true; ranged = false; }
  }
  r.melee = r.attack && melee;
  r.ranged = r.attack && ranged && !melee;
  r.aoe = r.attack && (AOE_TEMPLATES.has(t) || !!a.explodeRadius) || (AOE_TEMPLATES.has(t) && active);
  return r;
}

/** The share of actives the PRIMARY wants: dps a majority of attacks, every
 *  other primary half its actives in its own role. */
export function primaryQuota(cls, activeTarget) {
  if (!cls) return 0;
  return cls.primary === 'dps' ? Math.floor(activeTarget / 2) + 1 : Math.ceil(activeTarget / 2);
}
export function primaryRoleOf(cls) {
  return { dps: 'attack', tank: 'defensive', healing: 'healing', support: 'support' }[cls.primary] || 'attack';
}

/**
 * How much a candidate is worth to the class, given what the kit holds so
 * far. Tuned against the kit builder's other pulls (a signature is 250, a
 * weapon 120-200): the class is the main driver after the confluence, so the
 * primary quota is worth as much as a weapon, a secondary tag a third of
 * that, and the lean decides between two attacks outright.
 */
export function classPull(c, cls, kit, dealsFn) {
  if (!cls) return 0;
  const r = abilityRoles(c, dealsFn);
  let pull = 0;
  const role = primaryRoleOf(cls);
  if (c.kind === 'active' && r[role] && kit.primary < kit.primaryQuota) pull += 150;
  for (const tag of cls.secondary) {
    if (tag === 'passive') continue;
    if (!r[tag]) continue;
    const have = kit.tags[tag] || 0;
    pull += have < 2 ? 70 : (have < 4 ? 30 : 5);
  }
  if (r.attack) {
    if (cls.lean === 'melee') pull += r.melee ? 60 : (r.ranged ? -60 : 0);
    else pull += r.ranged ? 60 : (r.melee ? -60 : 0);
    if (cls.aoe && r.aoe) pull += 35;
  }
  return pull;
}

/** Tally a kit in the class's vocabulary, for classPull. */
export function tallyKit(list, cls, dealsFn) {
  const out = { primary: 0, tags: {}, melee: 0, ranged: 0, actives: 0 };
  const role = cls ? primaryRoleOf(cls) : 'attack';
  for (const a of list) {
    const r = abilityRoles(a, dealsFn);
    if (a.kind === 'active') out.actives++;
    if (a.kind === 'active' && r[role]) out.primary++;
    for (const t of SECONDARY_TAGS) if (r[t]) out.tags[t] = (out.tags[t] || 0) + 1;
    if (r.melee) out.melee++;
    if (r.ranged) out.ranged++;
  }
  return out;
}

// --------------------------------------------------------------------------
// ROUND 296 -- THE KIT'S IDENTITY: DPS, OR SUPPORT / TANK / HEALER.
//
// The user: "Unless a kit identity is primarily support, tank, or healer the
// kit should be 75% attacks." Asked how, he chose "15 of 20 are attacks": a
// DPS kit lifts round 190's 8-14 active cap, takes 15 attacks, and the other
// five are its aura, its perception, a buff, a way to move and one passive.
// "Leave support, healing, and tank identities alone for now" -- so those
// kits keep round 190's shape exactly.
//
// With a confluence the class says which. Before one forms, the three
// essences vote with their lead lever, and a kit is anything but DPS only
// when two of the three agree on it.
// --------------------------------------------------------------------------
// ROUND 297 -- "Lets cut that back to minimum 10." Ten attacks is the floor;
// the shape around them is round 190's.
export const DPS_ATTACKS = 10;
export const DPS_ACTIVES = 12;
export const DPS_ATTACK_SHARE = DPS_ATTACKS / KIT_TOTAL;
export const DPS_ACTIVE_SHARE = DPS_ACTIVES / KIT_TOTAL;

const LEVER_IDENTITY = {
  mend: 'healing', renew: 'healing',
  allies: 'support', absolve: 'support',
  bulwark: 'tank', taunt: 'tank', anchor: 'tank',
};

/** 'dps' | 'tank' | 'healing' | 'support'. `leverLists` is each essence's
 *  motif levers, lead first. */
export function kitIdentityFor(kitClass, leverLists) {
  // ROUND 298 -- "Count it as support": when two of the three essences lead
  // with mending or the team, the kit is a support kit (or a healing one, by
  // which way the leads lean) whatever the confluence's class says.
  const care = (leverLists || []).map(l => (l || [])[0]).filter(l => ['mend', 'renew', 'allies', 'absolve'].includes(l));
  if (care.length >= 2) {
    const heal = care.filter(l => l === 'mend' || l === 'renew').length;
    return heal > care.length - heal ? 'healing' : 'support';
  }
  if (kitClass && kitClass.primary) return kitClass.primary;
  const votes = {};
  for (const levers of (leverLists || [])) {
    const id = LEVER_IDENTITY[(levers || [])[0]];
    if (id) votes[id] = (votes[id] || 0) + 1;
  }
  const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? top[0] : 'dps';
}

/** ROUND 296 -- the kit's shape, by identity: a DPS kit is 15+ actives of 20
 *  (its attacks plus a buff and a way to move); the others keep 8-14. */
export function kitShapeOk(identity, active, total = KIT_TOTAL) {
  if (total !== KIT_TOTAL) return false;
  void identity;   // ROUND 297 -- every identity is 8-14 actives again
  return active >= ACTIVE_MIN && active <= ACTIVE_MAX;
}
