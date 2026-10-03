// ============================================================================
// ROUND 272 -- UNDEATH: THE LICH AND THE VAMPIRE.
//
//   "1.5) Having the undeath confluence should be very powerful.
//    1.5.1) depending on the other essences the player should become either a
//           lich raising hordes of undead, or a vampire draining life and
//           power from other essence users.
//    1.5.2) Every single ability gained with those confluences should tied to
//           one of those 2 identities exclusively"
//
// Pure: which of the two a trio becomes, what each form is worth at each
// rank, and the rider that ties every confluence ability to its form. The
// scene side (raising, drinking, stealing power) is scenes/undeathMixin.js.
//
// WHICH FORM. The two essences beside the restricted one decide: blood,
// hunger, bats, beasts and faces lean vampire; bone, magic, the mind, the
// dark and the cold lean lich. An exact essence counts twice what its family
// does. A trio that leans neither way is settled by a stable hash of its ids,
// so the same trio always becomes the same thing.
//
// EXCLUSIVE. Every ability the Undeath confluence grants carries exactly one
// form's rider, and the form's own signature abilities replace the shared
// Undeath list -- so a lich is never handed a drinking bolt and a vampire is
// never handed a thrall.
// ============================================================================
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { RANK_ORDER } from './ranks.js';
import { RESTRICTED_ESSENCES } from './restricted.js';

export const LICH = 'lich';
export const VAMPIRE = 'vampire';
export const UNDEATH_FORMS = [LICH, VAMPIRE];

const LEAN = {
  vampire: {
    ids: ['essBlood', 'essBat', 'essHunger', 'essFeast', 'essFlesh', 'essVisage', 'essMirror',
      'essWolf', 'essMoon', 'essLurker', 'essSin', 'essSwift', 'essDance', 'essCat', 'essVenom', 'essClaw'],
    families: ['blood', 'beast', 'flyer', 'identity', 'smallbeast', 'serpent', 'motion'],
  },
  lich: {
    ids: ['essBone', 'essMagic', 'essKnowledge', 'essRune', 'essOmen', 'essBlight', 'essFeeble',
      'essDust', 'essVoid', 'essMalign', 'shadow', 'essCold', 'essIce', 'essPaper', 'essEye', 'essEcho'],
    families: ['mind', 'death', 'dark', 'cold', 'earth', 'space', 'craft'],
  },
};

function stableHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** How hard an essence leans each way. */
export function formLean(id) {
  const fam = (ESSENCE_CATALOG[id] || {}).family;
  const out = { lich: 0, vampire: 0 };
  for (const f of UNDEATH_FORMS) {
    if (LEAN[f].ids.includes(id)) out[f] += 2;
    else if (fam && LEAN[f].families.includes(fam)) out[f] += 1;
  }
  return out;
}

/** The form a trio's Undeath takes. */
export function undeathForm(ids) {
  const list = (ids || []).filter(Boolean).slice().sort();
  const score = { lich: 0, vampire: 0 };
  for (const id of list) {
    if (RESTRICTED_ESSENCES[id]) continue;
    const l = formLean(id);
    score.lich += l.lich; score.vampire += l.vampire;
  }
  if (score.lich !== score.vampire) return score.lich > score.vampire ? LICH : VAMPIRE;
  return stableHash(list.join(',')) % 2 ? VAMPIRE : LICH;
}

/**
 * What the form itself is worth, by rank. The confluence's own power, on top
 * of anything its abilities do -- "very powerful" is a floor, not a lever.
 */
export function undeathPower(form, rank = 'normal') {
  const ri = Math.max(0, RANK_ORDER.indexOf(rank));
  if (form === LICH) {
    return {
      form,
      tempCap: 4 + 2 * ri,                // raised dead at once: 4 at Normal, 12 at Gold
      thrallSeconds: 30 + 6 * ri,         // how long a thrall stands
      thrallMight: 0.15 + 0.1 * ri,       // thralls hit this much harder
      killRise: 0.12 + 0.04 * ri,         // any kill near you may simply get up
      shadowResist: 0.25,
    };
  }
  return {
    form,
    lifesteal: 0.06 + 0.02 * ri,          // every blow you land drinks this share
    powerPerStack: 0.05,                  // stolen from an essence user, per stack
    maxStacks: 3 + ri,
    stackSeconds: 15,
    shadowResist: 0.25,
  };
}

/** The form's own signatures, replacing the shared Undeath list. Every
 *  catKey here exists in awakening's category table; the suite checks. */
export const UNDEATH_SIGNATURES = {
  lich: [
    { name: 'Raise the Legion', catKey: 'raise_dead',
      desc: 'The nearest dead stand up on your word and turn on whatever is still breathing.' },
    { name: 'Bone Retinue', catKey: 'summon_bonded',
      desc: 'Something that should be still gets up and walks at your side, and stays.' },
    { name: 'Grave Chill', catKey: 'aoe_dot_ring',
      desc: 'A ring of grave-cold that keeps rotting whatever stands in it.' },
    { name: 'Phylactery', catKey: 'fate_reroll',
      desc: 'Your death is kept somewhere else. A killing blow is refused, and you are left standing.' },
  ],
  vampire: [
    { name: 'Cold Hand', catKey: 'ranged_leech',
      desc: 'A grasping bolt that takes a share of the damage it deals and returns it to you as health.' },
    { name: 'Sanguine Feast', catKey: 'corpse_drain', mech: { resource: 'hp' },
      desc: 'The blood of the fallen runs to you across the ground and into the wounds.' },
    { name: 'Unquiet Flesh', catKey: 'triggered_regen_on_hit',
      desc: 'A body that was told to stop and did not. Taking a wound from anything but fire starts it mending.' },
    { name: 'Crimson Thirst', catKey: 'ranged_leech',
      desc: 'A lash of red that drinks deeper the more it has already taken.' },
  ],
};

/**
 * The categories a form may be offered at all. A vampire does not raise the
 * dead and a lich does not drink: the confluence's sockets are never offered
 * the other form's kind of ability, which is what keeps the two exclusive
 * before any rider is written.
 */
const FORM_FORBIDS = {
  vampire: /^(summon_(bonded|creature|turret|trap)|raise_dead|corpse_(blast|mine|miasma))$/,
  lich: /^(ranged_leech|corpse_drain)$/,
};
export function formAllowsCategory(form, catKey) {
  const re = FORM_FORBIDS[form];
  return !re || !re.test(String(catKey || ''));
}

/** The other form's words, and what this form says instead. Applied to the
 *  confluence's ability NAMES, so a lich is never handed "Vampiric Dagger". */
const NAME_SWAPS = {
  lich: [[/\bVampiric\b/g, 'Necrotic'], [/\bSanguine\b/g, 'Sepulchral'], [/\bBlood\b/g, 'Bone'],
    [/\bThirst\b/g, 'Hunger of the Grave'], [/\bFeast\b/g, 'Wake']],
  vampire: [[/\bGrave\b/g, 'Tomb'], [/\bBone\b/g, 'Blood'], [/\bLegion\b/g, 'Court'],
    [/\bThrall\b/g, 'Kiss'], [/\bRisen\b/g, 'Thirsting'], [/\bGraveyard\b/g, 'Night Court'],
    [/\bLich\w*/g, 'Nosferatu'], [/\bOssuary\b/g, 'Crypt']],
};
export function formName(name, form) {
  let out = String(name || '');
  for (const [re, to] of (NAME_SWAPS[form] || [])) out = out.replace(re, to);
  return out;
}

/** Does this spec deal damage? Asked of the spec, not the category, so a
 *  drain bolt and a burning ring count the same. */
function hurts(a) {
  if (!a || a.kind !== 'active') return false;
  if (a.template === 'raiseDead' || a.template === 'corpseDrain') return false;
  return (a.base || 0) > 0 || !!a.dot || a.template === 'corpseBlast' || a.template === 'corpseMine';
}
function summons(a) {
  return !!a && (a.template === 'activeSummon' || a.template === 'raiseDead' || !!a.summonFamily
    || /summon/.test(a.catKey || ''));
}

/**
 * Tie one confluence ability to its form. Returns a NEW spec; idempotent, so a
 * locked ability passed through twice is not ridden twice.
 */
export function applyUndeathForm(a, form, rank = 'normal') {
  if (!a || !form || a.undeathForm) return a;
  const pw = undeathPower(form, rank);
  const out = { ...a, undeathForm: form, name: formName(a.name, form) };
  // A lich's abilities do not drink. Whatever a lever added is taken back off.
  if (form === LICH) { out.leech = 0; out.leechOverTime = null; }
  const add = (s) => { out.desc = `${String(out.desc || '').trim()} ${s}`.trim(); };
  if (form === LICH) {
    if (a.kind !== 'active') {
      out.thrallChance = 0.1;
      add('[Lich] Every kill within 8 tiles has a further one-in-ten chance to rise as your thrall.');
    } else if (summons(a)) {
      out.summonCount = (a.summonCount || 1) + 1;
      add('[Lich] One more of your dead rises with every cast.');
    } else if (hurts(a)) {
      out.deathmark = 6;
      add('[Lich] Anything it strikes that dies within 6 seconds rises as your thrall.');
    } else {
      out.raiseOnCast = true;
      add('[Lich] Casting it also raises the nearest body within 9 tiles as your thrall.');
    }
  } else {
    if (a.kind !== 'active') {
      out.lifestealBoon = 0.03;
      add('[Vampire] Every blow you land returns a further 3% of its damage as health.');
    } else if (hurts(a)) {
      out.vampLeech = 0.2;
      out.powerDrain = true;
      add(`[Vampire] It drinks a fifth of the damage it deals as health. Against an essence user it also drinks their power: +${Math.round(pw.powerPerStack * 100)}% damage for ${pw.stackSeconds}s, stacking.`);
    } else {
      out.drainOnCast = { radius: 96, amount: Math.max(3, Math.round((a.base || a.healAmount || 8) * 0.6)) };
      add(`[Vampire] Casting it drinks ${out.drainOnCast.amount} health from every enemy within 3 tiles.`);
    }
  }
  return out;
}

/** What the confluence's innate says first: which of the two you are. */
export const UNDEATH_INTRO = {
  lich: 'You are a lich: what you kill does not stay dead, and everything this confluence grants raises more of it.',
  vampire: 'You are a vampire: your blows drink, and essence users bleed their power into you.',
};

/** The form's standing card line, for the confluence's own entry. */
export function undeathFormLine(form, rank = 'normal') {
  const pw = undeathPower(form, rank);
  if (form === LICH) {
    return `Lich — up to ${pw.tempCap} raised dead at once, each standing ${pw.thrallSeconds}s and hitting `
      + `${Math.round(pw.thrallMight * 100)}% harder; any kill within 8 tiles has a ${Math.round(pw.killRise * 100)}% chance to rise.`;
  }
  return `Vampire — every blow you land drinks ${Math.round(pw.lifesteal * 100)}% of its damage as health; `
    + `essence users bleed power into you (+${Math.round(pw.powerPerStack * 100)}% damage a stack, up to ${pw.maxStacks}, ${pw.stackSeconds}s).`;
}

/** Nothing here disagrees with itself. `catKeys` is the category table's keys. */
export function undeathFaults(catKeys = null) {
  const out = [];
  for (const f of UNDEATH_FORMS) {
    for (const s of UNDEATH_SIGNATURES[f]) {
      if (catKeys && !catKeys.has(s.catKey)) out.push(`${f}/${s.name}: no category ${s.catKey}`);
    }
    for (const id of LEAN[f].ids) if (!ESSENCE_CATALOG[id]) out.push(`${f}: no essence ${id}`);
  }
  const both = LEAN.lich.ids.filter(id => LEAN.vampire.ids.includes(id));
  if (both.length) out.push(`leans both ways: ${both.join(',')}`);
  return out;
}
