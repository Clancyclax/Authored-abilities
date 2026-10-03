// ===========================================================================
// ROUND 51 -- LEVER CHARTERS: what an essence is allowed to REFUSE.
//
// The user, on the generated roster: "I'm not seeing enough separation between
// builds... I really want each build to feel somewhat unique instead of the
// same generic build with some flavor text."
//
// Measured before this file existed, over 1,200 generated abilities:
//
//   - `projectileBall` was 16.3% of everything. One ability in six.
//   - Two random 20-ability builds shared 41.7% of their template multiset,
//     and the most-alike pair shared 73.9%.
//   - Probing sixteen different stones against one essence, nearly every
//     candidate pool offered the same core five: bolt, ring, aura, perception,
//     triggered passive.
//   - Within 196 generated bolts there were 108 distinct `_leverRider` values
//     but only 11 distinct `base` damages and 5 distinct projectile speeds.
//     The variety was a garnish on an identical dish.
//
// The structural cause is that an essence could only ever REORDER one shared
// pool of categories. The bias list nudges what gets tried first; nothing
// could say "Renewal does not produce a plain damage bolt." So every essence,
// eventually, produced one.
//
// This file is that missing "no". Each of the nineteen levers gets a charter:
// the effect FAMILIES it may produce, and the families it may not. An essence
// inherits the union of its motif levers' charters, and a deny beats an allow.
// All 146 essences get a shape from this without a line of per-essence
// authoring -- the marquee jobs (round 51 phase 7) then narrow it further.
//
// Families are named at a coarser grain than templates on purpose. "Renewal
// may not deal direct damage" is a design statement; "Renewal may not use
// projectileBall" is an implementation detail that would need rewriting the
// first time a new damage template landed.
// ===========================================================================

/**
 * Effect families. A category may belong to more than one -- a leeching bolt
 * is both damage and siphon, an armour summon is both a summon and a shield --
 * and a deny on ANY of a category's families removes it.
 *
 * Several families have no categories behind them yet (`cleanse`, `resource`,
 * `tether`). They are named here because the charters are the design document
 * as much as the code, and a lever that will be allowed to cleanse once phase 2
 * lands should say so now rather than being edited later and silently changing
 * what every essence carrying it can do.
 */
export const EFFECT_FAMILIES = [
  'damage_direct',    // deals damage on use
  'damage_overtime',  // afflictions, ground effects, delayed payloads
  'heal',             // restores health
  'cleanse',          // removes afflictions                       (phase 2)
  'resource',         // restores mana or stamina                  (phase 2)
  'shield',           // absorbs, armour, resistances, immunity
  'buff_self',        // combat buffs that only ever help the caster
  'buff_ally',        // buffs and heals that reach other people
  'attribute',        // long-lived attribute growth
  'control',          // slows, weakens, freezes, confuses
  'tether',           // leashes, pulls, movement punishment        (phase 4)
  'movement',         // dashes, blinks, haste
  'summon',           // familiars and conjured gear
  'aura',             // persistent radius effects
  'perception',       // sight, reveals, weak points
  'stealth',          // concealment and ambush
  'taunt',            // threat and forced targeting
  'reflect',          // thorns, returns, counters
  'trigger',          // conditional passives that fire on an event
  'weapon',           // weapon affinities
  'fate',             // rerolls and guaranteed outcomes
  'utility',          // travel, convenience
];

/**
 * Category key -> the families it belongs to.
 *
 * `attr_boost` is deliberately `attribute` rather than `buff_self`: it is the
 * round-6 "Strength of Atlas" pattern, a staple of every build, and an essence
 * that refuses selfish COMBAT buffs (see `allies` below) should still be able
 * to grow. Splitting it out is what lets `allies` deny `buff_self` without
 * taking the staple away from every support build in the game.
 */
export const CATEGORY_FAMILIES = {
  // --- damage ---
  ranged_damage:            ['damage_direct'],
  ranged_aoe:               ['damage_direct'],
  self_active_aoe:          ['damage_direct'],
  martial_sunder:           ['damage_direct'],
  martial_distance:         ['damage_direct'],
  martial_reaper:           ['damage_direct'],
  ranged_leech:             ['damage_direct'],
  // ROUND 51 -- these two are BOTH. Measured on the first pass: marking them
  // damage_overtime alone let every mend essence keep a bolt, because a bolt
  // that also applies a burn is still a bolt -- `ranged_dot` generates a
  // projectileBall with a real `base` and a dot rider on top, and `aoe_dot_ring`
  // an aoeRing the same way. A refusal of direct damage that a damage-over-time
  // label could walk around would not be a refusal.
  //
  // A pure affliction with no impact damage is a phase-2 template, and when it
  // exists it gets `damage_overtime` on its own.
  ranged_dot:               ['damage_direct', 'damage_overtime'],
  aoe_dot_ring:             ['damage_direct', 'damage_overtime'],
  imbue_strike:             ['damage_overtime', 'buff_self'],
  // ROUND 55 -- the three new shapes. A breath and a volley are plainly direct
  // damage; the pierce passive is a buff to the bearer's own output, which is
  // `buff_self` rather than `damage_direct` because it deals none itself and an
  // essence that refuses to hurt people should still be able to refuse it.
  ranged_cone:              ['damage_direct'],
  ranged_volley:            ['damage_direct'],
  passive_element_pierce:   ['buff_self'],
  // ROUND 56 -- barriers, reflection, cadence.
  //
  // A blocking wall is `control` and NOT damage: it deals none, and an essence
  // that refuses to hurt people should still be allowed to put a rock in the
  // way. The burning and collapsing walls do harm and say so, which is what
  // keeps a Renewal from laying a line of fire.
  barrier_block:            ['control', 'shield'],
  barrier_burn:             ['damage_direct', 'damage_overtime', 'control'],
  barrier_pull:             ['control', 'tether'],
  reflect_spell:            ['reflect', 'shield'],
  reflect_damage:           ['reflect'],
  // ROUND 57 -- returning the affliction rather than the blow. Filed under
  // control as well as reflect: what comes back is a debuff, and inflicting
  // debuffs is what the control family is.
  reflect_debuff:           ['reflect', 'control'],
  cooldown_passive:         ['buff_self'],

  // --- restoration ---
  self_active_heal:         ['heal'],
  self_active_hot:          ['heal'],
  aoe_heal_pulse:           ['heal', 'buff_ally'],
  // ROUND 55 -- the user's two worked HoT cases. The bloom reaches allies, so
  // it is buff_ally as well as heal; the troll reflex is a trigger that mends.
  bloom_field:              ['heal', 'buff_ally'],
  triggered_regen_on_hit:   ['heal', 'trigger'],

  // --- protection ---
  self_active_absorb:       ['shield'],
  self_active_armor:        ['shield'],
  self_active_immunity:     ['shield'],
  thorns_active:            ['reflect'],

  // --- self buffs ---
  // ROUND 76 (item 5) -- and the ONE ability in the game that buffs somebody
  // else. Filed under `buff_ally` rather than `buff_self`, which is the whole
  // point of it: an essence charterd for self-buffs does not get to hand its
  // strength to the team, and an essence about allies does.
  party_buff:               ['buff_ally'],
  self_active_damage:       ['buff_self'],
  self_active_crit:         ['buff_self'],
  reach_buff:               ['buff_self'],
  self_passive_buff:        ['buff_self'],
  attr_boost:               ['attribute'],
  // ROUND 203 -- the self-transformation. BOTH families, and the pair is the
  // decision: its largest clause is an attribute grant ("a significant
  // increase to the [Spirit] attribute"), which is round 6's staple and is
  // why `attribute` was split out in the first place -- but unlike
  // `attr_boost` it is a timed combat buff you press, and an essence that
  // refuses selfish combat buffs should not get one through the attribute
  // door. Naming only `attribute` would have been that hole; naming only
  // `buff_self` would have denied it to every support build for the reason
  // the note above rejects.
  self_transformation:      ['attribute', 'buff_self'],

  // --- control ---
  aoe_weaken:               ['control'],
  confuse_turn:             ['control'],
  self_active_timefreeze:   ['control'],

  // --- movement ---
  movement_dash:            ['movement'],
  movement_teleport:        ['movement'],
  movement_haste_active:    ['movement'],
  movement_passive:         ['movement'],
  // ROUND 77 -- the two power passives.
  //
  // Both are filed even though both are reached OFF-CHARTER: `charterAllows`
  // returns true for an uncategorised key ("no opinion, let it through"), so a
  // missing entry would not have broken either ability -- which is exactly why
  // it needs to be here. An unfiled category is a silent hole in the one table
  // that decides what an essence is willing to do, and the next round to reach
  // one of these through an ordinary route would find no opinion where there
  // should be one. Caught by test_round51_charters, which asserts the table is
  // TOTAL for precisely this reason.
  //
  // `buff_self` for the one-handed grip: it deals nothing and changes only what
  // its bearer can hold, so an essence that refuses to hurt people can still
  // carry it. `movement` for water walking, which is what crossing a lake is.
  two_hand_wield:           ['buff_self'],
  water_walk:               ['movement'],
  town_portal:              ['utility'],

  // --- auras ---
  self_passive_aoe:         ['aura', 'damage_direct'],
  self_passive_heal:        ['aura', 'heal'],
  self_passive_slow_aura:   ['aura', 'control'],
  self_passive_weaken_aura: ['aura', 'control'],
  // ROUND 58 -- a warding field shields; it does not control anything.
  self_passive_ward_aura:   ['aura', 'shield', 'buff_self'],

  // --- summons ---
  summon_bonded:            ['summon'],
  // ROUND 59 -- the active summons. Filed under damage as well as summon,
  // because unlike a bonded familiar these exist to kill things: a charter
  // that called them summon-only would have kept them out of every offensive
  // essence in the game, which is exactly where they belong.
  summon_creature:          ['summon', 'damage_direct'],
  summon_turret:            ['summon', 'damage_direct'],
  summon_trap:              ['summon', 'damage_direct', 'control'],
  // ===== ROUND 104 =========================================================
  //
  // Caught by test_round51_charters, exactly as the round-75 note two hundred
  // lines below predicted it would be: a category with no family is silently
  // exempt from the charter system through `charterAllows`'s "uncategorised:
  // no opinion, let it through" fallback. Seven new categories arrived this
  // round and all seven were sitting in that hole.
  //
  //   restore_*        `mend` -- handing a resource back is the mending
  //                    family's business, which is also why they carry the
  //                    `renew` lever gate. NOT `buff_self`: a battery is not
  //                    a buff, and filing it as one would let every essence
  //                    that may buff itself reach a mana font.
  //   unarmed_focus    `weapon` and `buff_self`. `weapon` is what its door in
  //                    awakening.js already opens, and having the family
  //                    agree with the door means the two cannot drift.
  //   triggered_*      `trigger` plus what each one actually DOES -- the same
  //                    filing the round-75 stacking block uses, and for the
  //                    same reason: a trigger is a delivery mechanism, so the
  //                    charter has to see the payload as well.
  // ROUND 105 -- and these eight said `mend`, which is a LEVER and not a
  // family, and the two vocabularies are not the same vocabulary.
  //
  // That is worse than leaving a category unfiled. An unfiled category takes
  // `charterAllows`'s "uncategorised: no opinion, let it through" fallback and
  // is merely exempt; a category filed under a family that does not exist
  // fails `fams.some(f => charter.allow.has(f))` for EVERY charter and is
  // refused outright. `cleanse_one` reached 0 of 400 random kits, and a
  // deliberately-built healer trio with mending stones did not have it either.
  //
  // `cleanse` and `resource` were declared in EFFECT_FAMILIES several rounds
  // ago with the comment "no categories behind them yet ... phase 2". Phase 2
  // is this round; these are the categories.
  cleanse_one:              ['cleanse'],
  dispel_one:               ['cleanse'],
  cleanse_mass:             ['cleanse'],
  dispel_mass:              ['cleanse'],
  restore_mana:             ['resource'],
  restore_stamina:          ['resource'],
  restore_mana_over_time:   ['resource'],
  restore_stamina_over_time: ['resource'],
  unarmed_focus:            ['weapon', 'buff_self'],
  triggered_strike_restore: ['trigger', 'resource'],
  // ROUND 105 -- `triggered_reactive` shipped earlier this round with no
  // family at all, which is the hole the note at the top of this block
  // describes and which test_round51_charters exists to find. It reaches
  // thirteen triggers and pays out whatever its essence can, so `trigger` is
  // the only honest filing: the payload is not fixed in the row.
  triggered_reactive:       ['trigger'],
  triggered_spend_bolt:     ['trigger', 'damage_direct'],

  // ROUND 105 -- the nine that close the buff and debuff coverage rows.
  // Filed by WHAT THEY DO rather than by the template they share, which is the
  // whole reason the charter is keyed on category rather than on template: all
  // seven `statBuff` rows are one runtime and seven different design claims,
  // and an essence that refuses selfish combat buffs should still be allowed
  // to buff a companion's healing.
  buff_damage_type:         ['buff_self', 'damage_direct'],
  buff_cast_speed:          ['buff_self'],
  buff_dodge:               ['buff_self', 'shield'],
  // `buff_ally` and NOT `buff_self`: raising healing received is a support
  // ability whoever it lands on, and filing it as a selfish buff would put it
  // behind the exact deny that support levers carry.
  buff_healing_received:    ['buff_ally', 'heal'],
  buff_regen_health:        ['heal', 'buff_self'],
  buff_regen_mana:          ['resource', 'buff_self'],
  buff_regen_stamina:       ['resource', 'buff_self'],
  // `fate` because it is a reroll of a spent resource in everything but name,
  // which is also why its lever gate is the fate lever.
  cooldown_reset:           ['fate', 'buff_self'],
  ability_lock:             ['control'],
  ranged_distant:           ['damage_direct'],
  triggered_strike_mana_over_time:    ['trigger', 'resource'],
  triggered_strike_stamina_over_time: ['trigger', 'resource'],

  summon_weapon:            ['summon', 'weapon'],
  summon_armor:             ['summon', 'shield'],
  summon_gear:              ['summon'],

  // ROUND 75 -- THE STACKING FAMILY.
  //
  // These are `rareOnly` and are offered on the 1-in-40 rare seat, but they
  // still pass through the charter like everything else -- so an essence that
  // refuses to hurt things must not be handed Jason's Mark of Sin just because
  // the socket rolled rare. Filed by what each SHAPE actually does:
  //
  //   boon    builds on your own actions and pays into yourself. `trigger`
  //           because it fires on an event, `buff_self` because that is what
  //           the payout is.
  //   mark    builds on an ENEMY and detonates. `damage_direct` is the whole
  //           point of it, and `trigger` for the same reason as the boon.
  //   ledger  builds from what is done TO you. `reflect` is exactly the family
  //           for that -- thorns and returns and counters -- and it is what
  //           lets a defensive essence reach one while an assassin's does not.
  //
  // Caught by test_round51_charters, which asserts every category has a family
  // and would otherwise have let three new ones through `charterAllows`'s
  // "uncategorised: no opinion, let it through" fallback -- silently exempt
  // from the charter system entirely, which for the rarest and most
  // build-defining abilities in the game is the worst place to be exempt.
  stack_boon:               ['trigger', 'buff_self'],
  stack_mark:               ['trigger', 'damage_direct'],
  stack_ledger:             ['trigger', 'reflect', 'damage_direct'],

  // --- the rest ---
  perception:               ['perception'],
  weapon_affinity:          ['weapon'],
  // ROUND 115 (item 9) -- `weapon_might` arrived in round 112 and was never
  // given a family here, so it has been silently exempt from the whole charter
  // system since (see `charterAllows`' uncategorised fallback) and
  // `test_round51_charters` has been reporting it as "every ability category is
  // assigned a family :: [weapon_might]".
  //
  // 'weapon', because that is what it is: the user's own words for it were
  // "+1 power, increased damage with special attacks, reduced stamina costs
  // when swinging a weapon", which is a weapon passive by every reading. It
  // sits beside `weapon_affinity` and answers to the same charters, so an
  // essence that has no business with weapons no longer gets one by default.
  weapon_might:             ['weapon'],
  fate_reroll:              ['fate'],
  passive_conditional:      ['trigger'],
  triggered_wounded_fury:   ['trigger'],
  triggered_kill_bolt:      ['trigger'],
  triggered_crit_empower:   ['trigger'],
  triggered_crit_drought:   ['trigger'],
  taunt_pull:               ['taunt'],
  stealth_veil:             ['stealth'],

  // ===== ROUND 176 -- THE SEVEN VIRULENCES ===============================
  //
  // Caught by `test_round51_charters` again, and by the same hole round 104's
  // note two hundred lines above describes: a category with no family is
  // silently exempt from the whole charter system through `charterAllows`'s
  // "uncategorised: no opinion, let it through" fallback. Round 164 added the
  // virulence passives and all seven landed in it, and the suite has reported
  // them by name every run since.
  //
  // `damage_overtime`, and only that. A virulence does not deal damage of its
  // own -- it makes an affliction you already apply land on something that
  // was immune to it -- so its family is the family of the thing it enables.
  // That is what stops a renewal essence being handed "your poisons now work
  // on the bloodless", which is precisely the polarity round 52 wrote down:
  // *"renew may produce nothing that harms."*
  //
  // NOT `weapon` and NOT `trigger`, though every one of them is a passive:
  // filing them by their KIND rather than by their effect is what put
  // `weapon_might` in this table with the wrong family in the first place.
  virulence_poison:         ['damage_overtime'],
  virulence_bleed:          ['damage_overtime'],
  virulence_curse:          ['damage_overtime'],
  virulence_burn:           ['damage_overtime'],
  virulence_holy:           ['damage_overtime'],
  virulence_unholy:         ['damage_overtime'],
  virulence_all:            ['damage_overtime'],
};

/**
 * The nineteen charters.
 *
 * `may` is what this lever contributes to an essence's allowed space. `mayNot`
 * is what it takes OFF the table for the whole essence, whatever its other
 * levers say -- that asymmetry is the point. An essence that carries `mend`
 * cannot buy its way back to a damage bolt by also carrying `raw`; a healer
 * with a violent streak expresses it as a weapon or an affliction, not as a
 * bolt with a heal-flavoured name.
 *
 * `signature` names the mechanic that belongs to this lever and nothing else.
 * Most are phase 2-6 work; they are recorded here so the charter reads as the
 * whole design rather than only the half that exists today.
 */
export const LEVER_CHARTERS = {
  mend: {
    may: ['heal', 'cleanse', 'resource', 'buff_ally', 'aura', 'summon', 'trigger', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'conversion',   // afflictions removed become healing
  },
  // ROUND 108 -- `ward` became bulwark + absolve, and the CHARTER had to move
  // with it. Left keyed on the old names it simply stopped matching: the
  // charter for 51 essences evaporated, and the suite caught it as
  // "18 of 148 deny damage_direct" against a band of 45-80. A charter that
  // matches nothing is not a permissive charter, it is no charter.
  bulwark: {
    may: ['shield', 'reflect', 'aura', 'trigger', 'buff_self', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'payout',       // the shield's remainder pays out on expiry
  },
  absolve: {
    // The cleansing half. It keeps ward's refusal of direct damage -- an
    // essence whose business is undoing harm does not deal it -- and trades
    // `reflect` for the two families that ARE its subject.
    may: ['cleanse', 'heal', 'aura', 'trigger', 'buff_self', 'buff_ally', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'conversion',   // what is lifted off becomes something else
  },
  // ROUND 108 -- and `bind` became anchor + muzzle. Round 51's note below is
  // why NEITHER half refuses direct damage: Might is raw + burst + bind, and a
  // deny beats an allow, so denying here made the archetypal attack essence
  // unable to produce an attack.
  anchor: {
    may: ['control', 'tether', 'aura', 'trigger', 'damage_overtime', 'damage_direct'],
    mayNot: [],
    signature: 'punish_on_move',   // taking the ground means punishing leaving it
  },
  muzzle: {
    may: ['control', 'aura', 'trigger', 'damage_overtime', 'damage_direct'],
    mayNot: [],
    signature: 'punish_on_action',
  },
  allies: {
    may: ['heal', 'buff_ally', 'aura', 'shield', 'summon', 'attribute'],
    // "May not: self-only buffs." An essence about the people standing with
    // you does not produce a buff only you can feel.
    mayNot: ['buff_self'],
    signature: 'ally_scaling',
  },
  raw: {
    may: ['damage_direct', 'buff_self', 'weapon', 'attribute', 'perception'],
    mayNot: ['control', 'utility'],
    signature: 'escalation',   // no cooldown, climbing cost
  },
  burst: {
    may: ['damage_direct', 'buff_self', 'attribute'],
    mayNot: ['damage_overtime'],
    signature: 'charge',
  },
  linger: {
    may: ['damage_overtime', 'aura', 'trigger', 'control', 'attribute'],
    mayNot: [],
    signature: 'detonation',
  },
  // ROUND 52 -- lingering's mending polarity, and the charter is the whole
  // reason it had to be its own lever rather than a branch inside `linger`.
  // `may` is a union across an essence's levers, so a Renewal that carried
  // `linger` inherited `damage_overtime` and `control` whether or not the
  // flavour hook ever used them -- which is how a healer's kit acquired a
  // hex, a freeze and a Burn. This list admits nothing that harms, and
  // `mayNot: ['damage_direct']` says so twice, since deny beats allow when a
  // motif pairs this with something bloodier.
  renew: {
    may: ['heal', 'aura', 'trigger', 'buff_ally', 'resource', 'cleanse', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'persistence',
  },
  chain: {
    may: ['control', 'tether', 'damage_direct', 'buff_ally', 'aura', 'movement'],
    mayNot: ['stealth'],
    signature: 'tether',
  },
  swift: {
    may: ['movement', 'buff_self', 'trigger', 'weapon', 'attribute'],
    mayNot: [],
    signature: 'refund',       // cooldown returned per enemy hit
  },
  siphon: {
    may: ['damage_direct', 'damage_overtime', 'heal', 'resource', 'trigger'],
    mayNot: [],
    signature: 'conversion',   // damage dealt becomes a resource
  },
  reach: {
    may: ['damage_direct', 'damage_overtime', 'control', 'perception', 'aura'],
    mayNot: [],
    signature: 'distance_scaling',
  },
  stalk: {
    // Deliberately NO damage_direct. Stalk is the opener -- crit, marks, first
    // strikes -- and its damage arrives through a weapon or a critical hit,
    // not through a bolt. This one omission is most of what makes a Foot build
    // stop looking like every other build.
    may: ['buff_self', 'stealth', 'perception', 'trigger', 'weapon', 'attribute'],
    mayNot: ['taunt'],
    signature: 'opener',
  },
  call: {
    may: ['summon', 'buff_ally', 'aura', 'attribute'],
    mayNot: [],
    signature: 'inheritance',  // the summon carries your afflictions
  },
  shift: {
    may: ['movement', 'control', 'utility', 'trigger'],
    mayNot: [],
    signature: 'swap',
  },
  turn: {
    may: ['reflect', 'shield', 'trigger', 'aura'],
    mayNot: [],
    signature: 'return',
  },
  fate: {
    may: ['fate', 'trigger', 'buff_self', 'attribute'],
    mayNot: [],
    signature: 'reroll',
  },
  taunt: {
    may: ['taunt', 'shield', 'aura', 'control', 'attribute'],
    mayNot: ['stealth'],
    signature: 'threat_defence',
  },
  stealth: {
    // Not `aura` in mayNot, though the two are thematically opposed: the
    // kit-completing aura probe (round 47) guarantees every kit one aura, and
    // a lever that vetoed it would leave a stealth build a piece short. Round
    // 49 already handles the real tension -- a damaging aura is suppressed
    // while the veil holds.
    may: ['stealth', 'movement', 'buff_self', 'perception', 'trigger'],
    mayNot: ['taunt'],
    signature: 'break_for_bonus',
  },
};

/**
 * The allowed and denied family sets for a set of levers.
 *
 * Deny wins. An essence with no recognised levers gets an empty charter, which
 * `charterAllows` reads as "no opinion" and lets everything through -- that is
 * the correct behaviour for a confluence or for anything a caller hands in
 * from outside the catalog, and it is why this can be added to a live
 * generator without stranding the essences it does not know about.
 */
export function charterFor(levers) {
  const allow = new Set(), deny = new Set();
  if (!levers || !levers.length) return { allow, deny, empty: true };
  let known = 0;
  for (const lv of levers) {
    const c = LEVER_CHARTERS[lv];
    if (!c) continue;
    known++;
    for (const f of c.may) allow.add(f);
    for (const f of c.mayNot) deny.add(f);
  }
  return { allow, deny, empty: known === 0 };
}

/** Does this charter permit a category? */
export function charterAllows(charter, categoryKey) {
  if (!charter || charter.empty) return true;
  const fams = CATEGORY_FAMILIES[categoryKey];
  if (!fams) return true;            // uncategorised: no opinion, let it through
  for (const f of fams) if (charter.deny.has(f)) return false;
  return fams.some(f => charter.allow.has(f));
}

/** Can an ability of this category deal direct damage? Read by the kit-level
 *  one-damage-option guarantee (the user's answer to round 51's question 4:
 *  "yes, but guarantee one damage option"). */
export function categoryDeals(categoryKey) {
  const fams = CATEGORY_FAMILIES[categoryKey] || [];
  return fams.includes('damage_direct') || fams.includes('damage_overtime')
      || fams.includes('weapon') || fams.includes('summon');
}

/** The families a category belongs to. Exported for the audit and the tests. */
export function familiesOf(categoryKey) { return CATEGORY_FAMILIES[categoryKey] || []; }

/**
 * ROUND 110 -- FILE A COMPOSED CATEGORY UNDER ITS FAMILIES.
 *
 * `charterAllows` ends with "uncategorised: no opinion, let it through", which
 * is the right fallback for a category nobody has classified yet and a DISASTER
 * for a category that is generated. Composed keys are not in the table, so
 * every composed ability sailed past every charter -- and composed abilities
 * are most of the pool.
 *
 * The measured consequence, from test_round51_charters: Foot (swift, stalk,
 * stealth -- a charter that refuses direct damage) offered a damage bolt in
 * 38 of 40 pools. Round 51's entire apparatus for making an essence MEAN
 * something was silently off for everything the composer produced.
 *
 * This is round 105's phantom-family fault turned inside out. There, a category
 * filed under a family that did not exist was denied by every charter. Here, a
 * category filed under nothing was allowed by all of them. Both come from the
 * same place: the charter can only judge what it can look up.
 */
export function registerCategoryFamilies(key, families) {
  if (!key || !families || !families.length) return;
  const known = families.filter(f => EFFECT_FAMILIES.includes(f));
  // A family that is not real would put the row back in round 105's hole, so
  // an unrecognised name is dropped rather than filed.
  if (known.length) CATEGORY_FAMILIES[key] = known;
}
