// ============================================================================
// ROUND 298 -- THE FUSION VALIDATOR.
//
//   node tools/fusions/validate.mjs <essenceId> [stoneId ...]
//
// Checks the authored fusions in tools/fusions/out/<essenceId>/<stoneId>.json
// against the game's own code: the template exists and its runtime fields are
// there, the card renders with no `undefined` or `NaN`, the description states
// the mechanic with its own numbers and no filler, the pair holds the four the
// brief asks for, and the user's standing rules hold. Prints a JSON report and
// exits 1 when anything fails.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const A = await import(path.join(ROOT, 'src/data/awakening.js'));
const Card = await import(path.join(ROOT, 'src/data/abilityCard.js'));
const D = await import(path.join(ROOT, 'src/data/debuffs.js'));
const ST = await import(path.join(ROOT, 'src/data/stats.js'));
const SC = await import(path.join(ROOT, 'src/data/abilityScaling.js'));
const I = await import(path.join(ROOT, 'src/data/essenceIdentity.js'));
const R = await import(path.join(ROOT, 'src/data/attackRoles.js'));
const ESS = JSON.parse(fs.readFileSync(path.join(HERE, 'brief/essences.json'), 'utf8'));
const STONES = JSON.parse(fs.readFileSync(path.join(HERE, 'brief/stones.json'), 'utf8'));
const VOCAB = JSON.parse(fs.readFileSync(path.join(HERE, 'vocab.json'), 'utf8'));
const CANON = new Set(fs.readFileSync(path.join(HERE, 'brief/canon_names.txt'), 'utf8').split('\n').map(x => x.trim().toLowerCase()).filter(Boolean));

export const BANNED_TEMPLATES = new Set(['aura', 'perception', 'townPortal', 'altResource', 'transform',
  'weaponAffinity', 'unarmedFocus', 'twoHandWield', 'cauterize', 'hearthfire', 'rekindle']);
export const TEMPLATES = new Set(VOCAB.map(v => v.template).filter(t => !BANNED_TEMPLATES.has(t)));
const ELEMENTS = new Set(Object.keys(ST.DAMAGE_TYPES).filter(e => e !== 'transcendent'));
const SCALE_OK = new Set(SC.SCALE_MODE_KEYS.filter(k => k !== 'successiveUses'));
// Fields that are generic across templates: never demanded per template.
const GENERIC = new Set(['kind', 'category', 'template', 'element', 'cost', 'cooldown', 'scaleOn', 'scalePer',
  'scaleCap', 'scaleDelay', 'rangeBand', 'reachUnits', 'hasteOnUse', 'escort', 'summonAnimal', 'castTime',
  'aoeBand', 'requiresWeapon', 'bloodSurrogate', 'familiarCreatureName', 'familiarFamily', 'shieldCostPerPoint',
  'shieldSource', 'shieldKind', 'debuff', 'dot', 'leech', 'regenPerSec', 'armorBonus', 'resist', 'dodgeBonus']);
const REQUIRED = Object.fromEntries(VOCAB.map(v => [v.template, v.usualFields.filter(f => !GENERIC.has(f))]));
// Filler: pictures of a mechanic rather than the mechanic ("Stop putting
// fluff into ability descriptions"; "The NAME carries flavour; the
// DESCRIPTION states the mechanic").
const FLUFF = [/\bit does not\b/i, /\bdoes not miss\b/i, /\bas if\b/i, /\bsomehow\b/i, /\bsimply\b/i,
  /\bdeclines? to\b/i, /\bhas opinions\b/i, /\bkeeps at it\b/i, /\bwhatever\b/i, /\bnot fast\b/i,
  /\bno one\b/i, /\bthe way (a|an|the)\b/i, /\blike a\b/i, /\bthe job\b/i, /\bwhere a body\b/i,
  /\bthe point\b/i, /\bin the air\b/i, /\bhungry\b/i, /\bpatient\b/i, /\bstubborn\b/i, /\bopinion/i];
const ROLE_RULES = {
  basic: (a) => a.spammable === true && a.cooldown >= 0.6 && a.cooldown <= 1.0,
  resource: (a) => a.cooldown >= 0.8 && a.cooldown <= 1.2 && (a.hpCostPct > 0 || a.consumeAffliction === true || a.chargesMax > 0),
  medium: (a) => a.cooldown >= 8 && a.cooldown <= 60 && (a.knockback > 0 || a.stunOnHit > 0 || a.spreadAfflictions > 0 || a.chargeTo > 0),
  long: (a) => a.cooldown >= 60 && a.cooldown <= 7200 && (a.bossPct > 0 || a.guaranteedCrit === true || !!a.partyBuffOnHit
    || a.ignoreArmor === true || a.ignoreResist === true || a.explodeRadius > 0),
  execute: (a) => a.cooldown >= 10 && a.cooldown <= 20 && (a.requiresTargetBelow > 0 || a.consumeAfflictionsPer > 0),
};
const ROLE_HELP = {
  basic: 'spammable: true, cooldown 0.6-1.0',
  resource: 'cooldown 0.8-1.2 and one of hpCostPct / consumeAffliction: true / chargesMax',
  medium: 'cooldown 8-60 and one of knockback / stunOnHit / spreadAfflictions / chargeTo',
  long: 'cooldown 60-7200 and one of bossPct / guaranteedCrit / partyBuffOnHit / ignoreArmor / ignoreResist / explodeRadius',
  execute: 'cooldown 10-20 and one of requiresTargetBelow / consumeAfflictionsPer (single-target templates only)',
};
const words = (s) => String(s || '').toLowerCase().split(/[^a-z']+/).filter(Boolean);

function prepare(spec) {
  const a = JSON.parse(JSON.stringify(spec));
  if (a.kind === 'active' && !a.cost) A.assignAbilityCost(a, null);
  a.stats = A.statsLineFor(a);
  try { a.rankAspects = A.rankAspectsFor(a); } catch (e) { a.rankAspects = []; }
  return a;
}

export function checkFusion(spec, ctx) {
  const errs = [];
  const e = (m) => errs.push(m);
  if (!spec || typeof spec !== 'object') return ['not an object'];
  if (!spec.name || typeof spec.name !== 'string') e('name missing');
  else {
    const w = spec.name.trim().split(/\s+/);
    if (w.length > 4 || spec.name.length > 30) e(`name "${spec.name}" is longer than 4 words / 30 characters`);
    if (CANON.has(spec.name.trim().toLowerCase())) e(`name "${spec.name}" is a canon ability's name`);
    const nameW = new Set(words(spec.name));
    for (const bad of [...words(ctx.essence.name), ...words(ctx.stone.name)]) {
      if (bad.length > 2 && nameW.has(bad)) e(`name "${spec.name}" uses the word "${bad}" from the essence or stone name (mad-libs naming; name the fusion itself)`);
    }
  }
  if (!['active', 'passive'].includes(spec.kind)) e('kind must be active or passive');
  if (!TEMPLATES.has(spec.template)) e(`template "${spec.template}" is not allowed (allowed: ${[...TEMPLATES].join(', ')})`);
  if (!ELEMENTS.has(spec.element)) e(`element "${spec.element}" is not one of ${[...ELEMENTS].join(', ')}`);
  for (const f of (REQUIRED[spec.template] || [])) if (spec[f] === undefined || spec[f] === null) e(`template ${spec.template} needs field "${f}" (see vocab.json example)`);
  if (spec.kind === 'active' && !(spec.cooldown > 0)) e('an active needs a cooldown > 0');
  if (spec.scaleOn && !SCALE_OK.has(spec.scaleOn)) e(`scaleOn "${spec.scaleOn}" not allowed`);
  if (spec.scaleOn && !(spec.scalePer > 0 && spec.scaleCap >= spec.scalePer)) e('scaleOn needs scalePer > 0 and scaleCap >= scalePer');
  if (spec.scaleOn && SC.SCALE_MODES[spec.scaleOn] && SC.SCALE_MODES[spec.scaleOn].needsTarget && !(spec.base > 0)) e(`scaleOn ${spec.scaleOn} reads a target; only an attack can use it`);
  if (spec.debuff) {
    if (typeof spec.debuff !== 'object' || !D.DEBUFFS[spec.debuff.key]) e(`debuff.key "${spec.debuff && spec.debuff.key}" is not a condition in debuffs.js`);
    else if (!(spec.debuff.chance > 0 && spec.debuff.chance <= 1 && spec.debuff.duration > 0)) e('debuff needs chance (0-1] and duration');
  }
  if (spec.dot && !(spec.dot.dmgPerTick > 0 && spec.dot.ticks > 0 && spec.dot.tickMs > 0 && spec.dot.label)) e('dot needs dmgPerTick, ticks, tickMs, label');
  if (spec.trigger && !A.TRIGGER_KINDS.includes(spec.trigger.on)) e(`trigger.on "${spec.trigger.on}" not one of ${A.TRIGGER_KINDS.join(', ')}`);
  if (spec.effect && !A.TRIGGER_EFFECT_KINDS.includes(spec.effect.kind)) e(`effect.kind "${spec.effect.kind}" not one of ${A.TRIGGER_EFFECT_KINDS.join(', ')}`);
  // Round 220: a cooldown at least three times an effect's duration.
  if (spec.kind === 'active' && spec.cooldown > 0 && !spec.role) {
    for (const [k, v] of Object.entries(spec)) {
      if (/Duration$/.test(k) && typeof v === 'number' && v > 0 && spec.cooldown < 3 * v) e(`cooldown ${spec.cooldown}s is under 3x ${k} ${v}s`);
    }
  }
  // The description: the mechanic, with its numbers.
  const desc = String(spec.desc || '');
  if (desc.length < 30 || desc.length > 420) e(`desc length ${desc.length} (30-420)`);
  for (const re of FLUFF) if (re.test(desc)) e(`desc filler: matches ${re}`);
  if (A.isFilledTemplateDesc(desc)) e('desc reads as filler (isFilledTemplateDesc)');
  const nums = (desc.match(/\d+(\.\d+)?/g) || []).map(Number);
  const need = (v, label) => { if (typeof v === 'number' && v > 0 && !nums.includes(v) && !nums.includes(Math.round(v * 100))) e(`desc does not state ${label} ${v}`); };
  need(spec.base, 'base damage');
  if (spec.dot) need(spec.dot.dmgPerTick, 'dot damage');
  need(spec.shieldAmount, 'shieldAmount');
  need(spec.healAmount, 'healAmount');
  need(spec.hotPerSec, 'hotPerSec');
  // Ranks and card.
  let a = null;
  try { a = prepare(spec); } catch (err) { e(`statsLineFor/cost threw: ${String(err).slice(0, 160)}`); }
  if (a) {
    if (/undefined|NaN/.test(a.stats || '')) e(`stats line has undefined/NaN: ${a.stats}`);
    let lines = [];
    try { lines = Card.abilityCardLines(a, { rank: 'iron', level: 0, progress: 0 }); } catch (err) { e(`card threw: ${String(err).slice(0, 160)}`); }
    const bad = lines.filter(l => /undefined|NaN|\[object/.test(l));
    if (bad.length) e(`card line: ${bad[0].slice(0, 160)}`);
    const cat = A.abilityCategoryOf(a);
    if (spec.category && cat !== spec.category) e(`category "${spec.category}" but the game reads it as "${cat}"`);
  }
  // Life and Renewal: about health (round 296, kept narrow in round 297).
  if (ctx.essence.healthRule && !I.hasHealthEffect(spec)) e('a Life/Renewal fusion must give, restore or drain health (leech, healOnUse with _healthRider, dot.healFrac, regenPerSec, a heal template...)');
  return errs;
}

export function checkPair(doc, essId, stoneId) {
  const out = [];
  const essence = ESS[essId], stone = STONES[stoneId];
  if (!essence || !stone) return [`unknown essence ${essId} or stone ${stoneId}`];
  if (!doc || doc.essence !== essId || doc.stone !== stoneId || !Array.isArray(doc.fusions)) return ['file must be {"essence","stone","fusions":[...]} for this pair'];
  const f = doc.fusions;
  if (f.length !== 4) out.push(`needs exactly 4 fusions, has ${f.length}`);
  f.forEach((s, i) => { for (const m of checkFusion(s, { essence, stone })) out.push(`#${i} ${s && s.name}: ${m}`); });
  const isAtk = (s) => s && s.kind === 'active' && s.base > 0 && s.category === 'attack';
  const [a0, a1, x2, p3] = f;
  if (!isAtk(a0) || !isAtk(a1)) out.push('#0 and #1 must be attacks (kind active, category attack, base > 0)');
  else {
    if (a0.template === a1.template) out.push('#0 and #1 must be different shapes (templates)');
    if (!R.suitableRoles(a0).has('execute') && !R.suitableRoles(a1).has('execute')) out.push('one of the two attacks must be single-target (projectileBall, sunderStrike, rangeStrike, stackStrike, imbueStrike, chainStrike)');
    for (const [i, s] of [[0, a0], [1, a1]]) {
      if (!ROLE_RULES[s.role]) out.push(`#${i} needs role: one of ${Object.keys(ROLE_RULES).join(', ')}`);
      else if (!ROLE_RULES[s.role](s)) out.push(`#${i} role ${s.role} needs ${ROLE_HELP[s.role]}`);
      if (s.role === 'execute' && !R.suitableRoles(s).has('execute')) out.push(`#${i} execute needs a single-target template`);
    }
    if (a0.role && a0.role === a1.role) out.push('#0 and #1 must have different roles');
  }
  if (!x2 || x2.kind !== 'active' || (x2.category === 'attack')) out.push('#2 must be an active that is not an attack (buff, defensive, healing, movement, summon, restore...)');
  if (!p3 || p3.kind !== 'passive') out.push('#3 must be a passive');
  return out;
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [essId, ...stoneArgs] = process.argv.slice(2);
  const dir = path.join(HERE, 'out', essId || '');
  const files = stoneArgs.length ? stoneArgs.map(s => `${s}.json`) : (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : []);
  const report = { essence: essId, files: files.length, ok: 0, failed: {}, duplicateNames: [] };
  const names = new Map();
  // Names already taken by this essence's other files (another run's stones).
  const others = new Map();
  if (stoneArgs.length && fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && !files.includes(f))) {
      try { for (const s of (JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).fusions || [])) others.set(String(s && s.name || '').toLowerCase(), f.replace(/\.json$/, '')); } catch (err) { /* another run mid-write */ }
    }
  }
  for (const file of files) {
    const stoneId = file.replace(/\.json$/, '');
    let doc = null;
    try { doc = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch (err) { report.failed[stoneId] = [`unreadable JSON: ${String(err).slice(0, 120)}`]; continue; }
    const errs = checkPair(doc, essId, stoneId);
    for (const s of (doc.fusions || [])) {
      const k = String(s && s.name || '').toLowerCase();
      if (names.has(k)) report.duplicateNames.push(`${s.name} (${names.get(k)} and ${stoneId})`);
      else if (others.has(k)) report.duplicateNames.push(`${s.name} (already used for ${others.get(k)}; pick another)`);
      else names.set(k, stoneId);
    }
    if (errs.length) report.failed[stoneId] = errs; else report.ok++;
  }
  console.log(JSON.stringify(report, null, 1));
  process.exit(Object.keys(report.failed).length || report.duplicateNames.length ? 1 : 0);
}
