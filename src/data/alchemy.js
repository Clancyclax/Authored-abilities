// ===========================================================================
// ROUND 218 -- WHAT AN ALCHEMY STONE MAKES.
//
// The user, item 6.1:
//
//   "Alchemy stones are a great example of a stone that should generate
//    abilities based around elixers, potions, and oils.
//    6.1.1 Abilities that trigger buffs (tied to the essence) when drinking
//          potions
//    6.1.1.1 Rank ups grant extra potion charges, allow auto potion use at
//            low health, grant a chance for triggers to chip off twice.
//    6.1.2 Abilities that reduce the cooldown of potion when the player does
//          something (tied to the essence)
//    6.1.2.1 Rankups improve potions, make potions heal health and restore
//            mana, or mana and stamina, or stamina and health.
//    6.1.3 Abilities that allow the player to self buff x(10 to 30 stacks) of
//          an oil related to their essence to their weapon.
//    6.1.3.1 Rank ups increase stacks, or regenerate stacks based on actions."
//
// Three families, and the user wrote the rank ladder for each one, so the
// ladders below are theirs rather than invented: this file is a transcription
// with numbers filled in, not a design.
//
// ---------------------------------------------------------------------------
// "TIED TO THE ESSENCE" IS THE LOAD-BEARING PHRASE.
//
// It appears in 6.1.1 and 6.1.2 and again as "an oil related to their essence"
// in 6.1.3, which is three times in one item. So none of these three is a
// generic potion perk with a stone's name on it. The buff a draught grants,
// the resource a catalyst returns and the oil a weapon carries all take the
// ESSENCE's element, which means a Fire essence with an Alchemy stone coats
// its blade in something that burns and an Ice essence in something that
// does not.
//
// The stone decides you are an alchemist. The essence decides what you brew.
// That is the round-206 rule -- "essence guides, stone decides" -- read from
// the other end, and it is the same rule.
//
// ---------------------------------------------------------------------------
// ALLOWING IS NOT REACHING.
//
// Round 76 learned this about summons: `summon_creature` was correct, well
// formed, and appeared in 25 kits out of 10,000, because a category in the
// pool competes with the essence's signature and the stone's lever for six to
// eight seats. Three new categories added to the table and left to compete
// would have been three more that never arrived.
//
// So an alchemy socket gets a RESERVED SEAT, the way the stone door, the
// attack floor, the rare seat and the summon seat all do. Gated on the
// STONE's family, because the user's sentence is about what an alchemy stone
// makes, and offered once per kit so four Alchemy stones in one slot do not
// produce four oils.
// ===========================================================================

/** The four stones this file is about. Read off the catalogue by family at
 *  the call site rather than listed there, so a fifth alchemy stone is
 *  covered by existing; this is here for the faults to check against. */
export const ALCHEMY_FAMILY = 'alchemy';

export const ALCHEMY_RANKS = ['iron', 'bronze', 'silver', 'gold'];

// ---------------------------------------------------------------------------
// 6.1.1 -- THE DRAUGHT. Drinking grants a buff, and the ladder is the user's:
// "extra potion charges, allow auto potion use at low health, grant a chance
// for triggers to chip off twice."
//
// `charges` is extra uses before the cooldown applies, which is what "extra
// potion charges" means against a system whose potions are gated by a
// sixty-second timer rather than by a count.
// ---------------------------------------------------------------------------
export const DRAUGHT = {
  iron: { secs: 8, charges: 0, autoAt: 0, twice: 0 },
  bronze: { secs: 10, charges: 1, autoAt: 0, twice: 0 },
  silver: { secs: 12, charges: 1, autoAt: 0.25, twice: 0 },
  gold: { secs: 14, charges: 2, autoAt: 0.3, twice: 0.25 },
};

/** What the draught grants, by the essence's element. The buff is the
 *  element's own advantage rather than a flat number, so the ability reads as
 *  that essence's alchemy and not as a potion perk. */
export const DRAUGHT_BOON = {
  fire: { key: 'dmg_fire', amount: 0.25, word: 'your fire damage' },
  frost: { key: 'dmg_frost', amount: 0.25, word: 'your frost damage' },
  lightning: { key: 'dmg_lightning', amount: 0.25, word: 'your lightning damage' },
  nature: { key: 'dmg_nature', amount: 0.25, word: 'your nature damage' },
  shadow: { key: 'dmg_shadow', amount: 0.25, word: 'your shadow damage' },
  radiant: { key: 'dmg_radiant', amount: 0.25, word: 'your radiant damage' },
  physical: { key: 'dmg_physical', amount: 0.25, word: 'your physical damage' },
};

// ---------------------------------------------------------------------------
// 6.1.2 -- THE CATALYST. An action takes seconds off the potion timer, and
// the rank ladder is the user's second list: "Rankups improve potions, make
// potions heal health and restore mana, or mana and stamina, or stamina and
// health."
//
// Three pairings, and WHICH pair an ability gets is seeded off the socket
// rather than climbed through -- the user wrote them with "or", not "then".
// ---------------------------------------------------------------------------
export const CATALYST = {
  iron: { secs: 4, restores: 0 },
  bronze: { secs: 6, restores: 1 },
  silver: { secs: 8, restores: 2 },
  gold: { secs: 10, restores: 2 },
};

/** The user's three pairs, in their order. */
export const CATALYST_PAIRS = [
  ['health', 'mana'],
  ['mana', 'stamina'],
  ['stamina', 'health'],
];

/** What counts as "the player does something". One per ability, seeded, so a
 *  kit with two catalysts is not the same catalyst twice. */
export const CATALYST_TRIGGERS = [
  { key: 'kill', text: 'each time you kill something' },
  { key: 'crit', text: 'on every critical strike' },
  { key: 'special', text: 'each time you land a special attack' },
];

// ---------------------------------------------------------------------------
// 6.1.3 -- THE OIL. "self buff x(10 to 30 stacks) of an oil related to their
// essence to their weapon", and the ladder is "increase stacks, or regenerate
// stacks based on actions."
//
// The band is the user's own: ten at iron, thirty at gold.
// ---------------------------------------------------------------------------
export const OIL = {
  iron: { stacks: 10, regen: null },
  bronze: { stacks: 16, regen: 'kill' },
  silver: { stacks: 22, regen: 'kill' },
  gold: { stacks: 30, regen: 'crit' },
};

/** What the oil does when a stack is spent, by the essence's element. Each is
 *  a condition the game already applies, so an oil is not a new damage path --
 *  it is the essence's own affliction arriving on weapon hits. */
export const OIL_EFFECT = {
  fire: { dot: 'burn', word: 'burning' },
  frost: { dot: 'frostbite', word: 'freezing' },
  lightning: { dot: 'shocked', word: 'shocking' },
  nature: { dot: 'poison', word: 'envenoming' },
  shadow: { dot: 'unholy', word: 'withering' },
  radiant: { dot: 'holy', word: 'searing' },
  physical: { dot: 'bleed', word: 'bleeding' },
};

export const OIL_ELEMENTS = Object.keys(OIL_EFFECT);

/** Which of the three an alchemy socket makes. Seeded, so a kit holding two
 *  alchemy stones gets two different ones rather than the same twice. */
export const ALCHEMY_KINDS = ['draught', 'catalyst', 'oil'];

/** The element this socket brews in -- the ESSENCE's, not the stone's. */
export function brewElement(element) {
  const el = element || 'physical';
  return OIL_EFFECT[el] ? el : 'physical';
}

/** The rank row for a kind, clamped to the ladder. */
export function alchemyAt(kind, rank) {
  const table = kind === 'draught' ? DRAUGHT : kind === 'catalyst' ? CATALYST : OIL;
  return table[ALCHEMY_RANKS.includes(rank) ? rank : 'iron'];
}

/**
 * The sentence the card prints, built from the rank row rather than written
 * per ability -- round 215's rule applies here too, and the IRON line has to
 * read as what the ability IS rather than as an improvement on nothing.
 */
export function alchemyClause(kind, rank, element, extra = {}) {
  const r = alchemyAt(kind, rank);
  const el = brewElement(element);
  if (kind === 'draught') {
    const boon = DRAUGHT_BOON[el];
    const bits = [`Drinking a potion raises ${boon.word} by ${Math.round(boon.amount * 100)}% for ${r.secs}s.`];
    if (r.charges) bits.push(`You carry ${r.charges} extra ${r.charges === 1 ? 'draught' : 'draughts'} before the cooldown applies.`);
    if (r.autoAt) bits.push(`Below ${Math.round(r.autoAt * 100)}% health you drink without being told.`);
    if (r.twice) bits.push(`${Math.round(r.twice * 100)}% of the time the draught takes hold twice.`);
    return bits.join(' ');
  }
  if (kind === 'catalyst') {
    const trig = extra.trigger || CATALYST_TRIGGERS[0];
    const bits = [`${cap(trig.text)}, ${r.secs}s comes off your potion cooldown.`];
    if (r.restores) {
      const pair = (extra.pair || CATALYST_PAIRS[0]).slice(0, r.restores + 0);
      bits.push(`Your potions restore ${listOf(pair)} as well as what they were brewed for.`);
    }
    return bits.join(' ');
  }
  const eff = OIL_EFFECT[el];
  const bits = [`Coats your weapon with ${r.stacks} stacks of ${el} oil; each hit spends one, ${eff.word} what it strikes.`];
  if (r.regen) {
    bits.push(r.regen === 'kill'
      ? 'A kill puts a stack back on.'
      : 'A critical strike puts two stacks back on.');
  }
  return bits.join(' ');
}

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
function listOf(w) {
  if (!w || !w.length) return '';
  if (w.length === 1) return w[0];
  return `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
}

// ===========================================================================
// FAULTS.
// ===========================================================================

export function alchemyFaults() {
  const out = [];

  // --- every rank exists, and the ladder only goes up --------------------
  for (const [kind, table] of [['draught', DRAUGHT], ['catalyst', CATALYST], ['oil', OIL]]) {
    for (const r of ALCHEMY_RANKS) if (!table[r]) out.push(`${kind} has no ${r} rung`);
    const key = kind === 'oil' ? 'stacks' : 'secs';
    let prev = -1;
    for (const r of ALCHEMY_RANKS) {
      const v = (table[r] || {})[key];
      if (typeof v !== 'number') { out.push(`${kind}'s ${r} has no ${key}`); continue; }
      if (v < prev) out.push(`${kind}'s ${key} falls at ${r} (${prev} -> ${v})`);
      prev = v;
    }
  }
  // The user's own band, asserted as their numbers rather than as "some".
  if (OIL.iron.stacks !== 10) out.push(`an oil starts at ${OIL.iron.stacks} stacks; the user said ten`);
  if (OIL.gold.stacks !== 30) out.push(`an oil caps at ${OIL.gold.stacks} stacks; the user said thirty`);

  // --- the three rank-up promises are actually kept ----------------------
  // 6.1.1.1 named three, and a ladder that grows a number but never delivers
  // one of them is the item half-done with a full-looking table.
  if (!ALCHEMY_RANKS.some(r => DRAUGHT[r].charges > 0)) out.push('no draught rank grants extra charges');
  if (!ALCHEMY_RANKS.some(r => DRAUGHT[r].autoAt > 0)) out.push('no draught rank drinks at low health');
  if (!ALCHEMY_RANKS.some(r => DRAUGHT[r].twice > 0)) out.push('no draught rank lets the trigger chip twice');
  if (!ALCHEMY_RANKS.some(r => OIL[r].regen)) out.push('no oil rank regenerates stacks');
  if (!ALCHEMY_RANKS.some(r => CATALYST[r].restores >= 2)) out.push('no catalyst rank restores a pair');

  // --- "tied to the essence" ---------------------------------------------
  // Every element the generator can hand this file must have a boon and an
  // oil, or an essence of that element silently brews nothing.
  for (const el of OIL_ELEMENTS) {
    if (!DRAUGHT_BOON[el]) out.push(`${el} has an oil and no draught boon`);
  }
  for (const el of Object.keys(DRAUGHT_BOON)) {
    if (!OIL_EFFECT[el]) out.push(`${el} has a draught boon and no oil`);
  }
  if (brewElement('nonsense') !== 'physical') out.push('an unknown element does not fall back to physical');

  // --- the pairs are the user's three, in their order ---------------------
  const want = 'health+mana|mana+stamina|stamina+health';
  const got = CATALYST_PAIRS.map(p => p.join('+')).join('|');
  if (got !== want) out.push(`the catalyst pairs are ${got}, not the user's ${want}`);

  // --- the clause says what it does, at every rank ------------------------
  for (const kind of ALCHEMY_KINDS) {
    for (const r of ALCHEMY_RANKS) {
      for (const el of OIL_ELEMENTS) {
        const t = alchemyClause(kind, r, el, { trigger: CATALYST_TRIGGERS[0], pair: CATALYST_PAIRS[0] });
        if (!t || t.length < 30) out.push(`${kind} at ${r} (${el}) says nothing worth reading`);
        if (!/[.!?]$/.test(t.trim())) out.push(`${kind} at ${r} (${el}) does not end`);
        if (/\bundefined\b|\bNaN\b|\[object/.test(t)) out.push(`${kind} at ${r} (${el}): ${t.slice(0, 60)}`);
      }
    }
  }
  // ...and it names the element it was tied to, which is the whole of the
  // user's "tied to the essence".
  for (const el of OIL_ELEMENTS) {
    const oil = alchemyClause('oil', 'gold', el);
    if (!oil.includes(el)) out.push(`a ${el} oil does not mention ${el}`);
  }

  return out;
}
