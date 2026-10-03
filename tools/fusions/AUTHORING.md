# Authoring essence × stone fusions

You are hand-writing the abilities a player gets when an essence absorbs an awakening stone in **Sparkstone**, a fan game of *He Who Fights With Monsters*. The project owner's words:

> "Every single essence/awakening stone combination needs to feel equally good. The generator is making too many moves feel generic or mad libs."

> "Notice how thematic it feels, interesting effects merging life and fire."

> "if a player exclusively used awakening stones of fire on every playthrough with the life essence they wouldn't get the exact same abilities every time. They should get similar feeling, or equally thematic abilities."

So for each pair you write **four** abilities. Each one must be a *fusion*: its **mechanic** is about the essence **and** about the stone together. The game picks one of the four for a character's socket.

## The bar: what a fusion is

These are the Life essence with the Fire stone, which the owner called "phenomenal":

- **Cauterize Wounds**: Sacrifice 10% of your maximum health and inflict 4 stacks of [Burning] on yourself. Then dispel every hostile necrotic, poison, burning and bleeding effect on you, and gain a stack of [Healing Balm] for each effect dispelled. [Healing Balm]: heal 3 health a second for 5 seconds.
- **Searing Renewal**: Throws a bolt of fire that deals 8 damage and sets the target [Burning] for 3 damage a second for 5 seconds. Every point of damage that Burning deals heals you.
- **Hearthfire**: Lights a fire at your feet for 8 seconds, 3 tiles across. You and your allies inside it regain 4 health a second; enemies inside it take 4 fire damage a second.
- **Rekindle**: When your health falls below 30%, you burst into flame: you regain 30% of your maximum health over 5 seconds, and every enemy within 3 tiles takes 15 fire damage.

Each one is something only life *and* fire would do. A burn that heals you; a hearth; a phoenix.

**The test:** cover the essence's name and then the stone's name. Could you still tell which essence and which stone this is from the mechanic alone? If swapping the stone for a different one would leave the ability unchanged apart from its element or a noun, it is not a fusion. Rewrite it.

**What fails the bar:**

- "Fires a bolt of fire" for every essence that meets a Fire stone. The element alone is not a fusion.
- "Claw Teeth", "Healer Plates", "Adept Scutes": the stone's name glued to a body part. These are mad libs.
- Any sentence that describes a picture instead of a mechanic.

**How to get there.** Think about what the essence *is* in the books:

- its powers;
- its affinities;
- the abilities canon gives it.

Then think about what the stone *does*, which is wider than its element:

- **Blood:** bleeding, blood price, drain, frenzy.
- **Ice:** brittleness, preservation, slowing, shattering.
- **Feast:** consumption, gorging, sharing a meal.
- **Fox:** trickery, misdirection, cunning.
- **Wheel:** rolling, cycles, momentum.

Find where the two meet.

`brief/essences.json` and `brief/stones.json` give each one's name, family, phrase and description. The essence's `levers` are the kinds of thing it does (`mend`, `burst`, `bind`, `allies`, and so on). Use these together with your knowledge of the books.

## A worked example (Axe essence, Blood stone)

`examples/essAxe__stoneBlood.json` passes the validator. Read it before you start. It holds:

- **Opening Vein:** a chop that bleeds the target, weakens its armour and spreads your afflictions on it to nearby enemies.
- **Red Harvest:** a whirling sweep that always crits and heals you for part of the damage.
- **Battle Flush:** a short damage surge.
- **Butcher's Rhythm:** killing an enemy gives you a burst of health regeneration.

## The four, in this order

| # | What | Rules |
|---|---|---|
| 0 | **Attack** | `kind: "active"`, `category: "attack"`, `base` > 0, a `role` (table below). |
| 1 | **Attack** | Same rules as #0, but a **different template** (shape) and a **different role** from #0. |
| 2 | **Active, not an attack** | A buff, a defence, a heal, movement, a summon, a cleanse or restore, and so on. |
| 3 | **Passive** | A triggered passive, a stat or conditional passive, a bonded familiar, a stacking passive, passive movement, and so on. |

- At least one of the two attacks must be **single-target**: `projectileBall`, `sunderStrike`, `rangeStrike`, `stackStrike`, `imbueStrike` or `chainStrike`.
- Between them, #0 and #1 should be two different ways to fight, not the same blow twice.

### Attack roles

A damage kit needs attacks with different jobs. Give each attack a role, and include the role's own field.

| role | cooldown | must also have one of | typical damage at iron |
|---|---|---|---|
| `basic` | 0.6–1.0 s, `"spammable": true` | — (low damage, very low cost) | 3–6 |
| `resource` | 0.8–1.2 s | `hpCostPct` (0.03–0.08, costs that share of max health), `consumeAffliction: true` (needs one of your afflictions on the target and uses it up), `chargesMax` (3–5; kills give charges back) | 6–10 |
| `medium` | 8–60 s | `knockback` (64–112 units), `stunOnHit` (0.8–1.6 s), `spreadAfflictions` (96–144 units: your afflictions on the target spread to enemies that close), `chargeTo` (160–256 units: you rush to the target first) | 10–24 |
| `long` | 60–7200 s | `bossPct` (0.03–0.08 of a boss's or elite's max health), `guaranteedCrit: true`, `partyBuffOnHit: {"pct":0.15–0.25,"dur":10–20}`, `ignoreArmor: true`, `ignoreResist: true`, `explodeRadius` (96–128 units, with `"splashFrac": 0.8`) | 25–60 |
| `execute` | 10–20 s, **single-target only** | `requiresTargetBelow` (0.2–0.3: usable only at or below that share of health), `consumeAfflictionsPer` (0.5–0.7: uses up every affliction you have on the target, with that much more damage for each) | 15–35 |

- Spread the roles across the 24 stones of a run. Do not make every pair basic + medium.
- 32 units = 1 tile. In the description, say "tiles", never pixels or units.

## Writing the spec

Each fusion is a JSON object in the game's own ability format.

- **Fields:** run `node tools/fusions/vocab.mjs` to list the allowed templates, and `node tools/fusions/vocab.mjs <template> [...]` to see one template's fields. The data is in `vocab.json`, which covers every template the game can run. For each one it gives a real `example`, its `usualFields` and its `optionalFields`. Use the same field names, with the same shapes. Do not invent fields; the game ignores what it doesn't read, so an invented field is a lie on the card.
- **Required on every fusion:** `name`, `kind`, `category`, `template`, `element`, `desc`.
- **Required on every active:** `cooldown`.
- **Leave out `cost`;** the game assigns it.
- **Elements:** `physical`, `fire`, `frost`, `lightning`, `nature`, `shadow`, `radiant`, `water`, `ice`, `rock`, `earth`, `sand`, `wind`, `light`, `dark`, `plant`, `life`, `death`, `blood`, `poison`, `necrotic`, `curse`, `arcane`, `slashing`, `blunt`, `piercing`, `resonating`, `disruptive`.

**Riders you may add to most templates** (copy the shape from `vocab.json`):

- `dot`: damage over time, `{"dmgPerTick","ticks","tickMs","critChance","label"}`. Use a condition's own label, for example "Burning", "Bleeding" or "Poisoned".
  - On a Life or Renewal essence, add `"healFrac": 0–1`: that share of the burn's damage heals you.
- `debuff`: `{"key","chance","duration","stacks":1,"potency":1}`. `key` must be one of `brief/debuff_keys.txt`. Name the condition in the description in brackets, for example [Slowed].
- `leech`: 0–0.4, heals you for that share of the damage dealt.
- `chain`: `{"count","radius","frac"}` **together with** `chainCount`, `chainRange` and `chainDamagePct` (all three must match).
- `explodeRadius`.
- `sunder`: `{"amount","duration"}`.
- `scaleOn`, `scalePer` and `scaleCap`, scaling on one of:
  - `targetStamina` (attacks only)
  - `targetAfflictions` (attacks only)
  - `selfDepletion`
  - `distanceTravelled`
  - `alliesNear`
- `hasteOnUse`: `{"pct","duration"}`.
- `armorBonus`, `regenPerSec`, `dodgeBonus`.

**Triggered passives:**

```json
{"template": "triggeredPassive", "category": "triggered", "isTriggered": true, "cooldown": 6,
 "trigger": {"on": "...", "cooldown": 6},
 "effect": {...}}
```

- `trigger.on` is one of:
  - `hpBelow`, `kill`, `crit`, `critDrought`, `hurtNonFire`, `strike`
  - `spendMana`, `spendStamina`, `moveDistance`
  - `gainHealth`, `gainMana`, `gainStamina`
  - `fullHealth`, `fullMana`, `fullStamina`
  - `emptyHealth`, `emptyMana`, `emptyStamina`
  - `inflictCondition`, `conditionExpired`
- `effect` is one of:

| kind | fields |
|---|---|
| `regenBurst` | `perSec`, `duration` |
| `physicalDamageMult` | `amount` (0.2–1.0), `duration` |
| `nextSpellDamage` | `amount`, `charges` |
| `critChance` | `amount`, `duration` |
| `boltNearest` | `damage`, `range` |
| `restoreResource` | `resource` (`mana` or `stamina`), `amount` |
| `restoreResourceOverTime` | `resource`, `perSec`, `duration` |
| `wardBurst` | `frac` (≤0.35), `duration` |
| `lifedrainBuff` | `amount` (≤0.5), `duration` |
| `healingTakenBuff` | `amount` (≤0.6), `duration` |

**Not allowed (the generator places these itself):** `aura`, `perception`, `altResource`, `weaponAffinity`, `unarmedFocus`, `twoHandWield`, `transform`, `townPortal`.

**Iron-rank power** (the game scales everything up with rank):

- **Shields:** 12–30.
- **Heals:** 10–30 at once, or 2–5 a second.
- **Self buffs:** +15–40% for 10–30 s.
- **Passives:** modest, +5–15%.
- **Cooldowns:** at least **3 times** any duration the ability has (`buffDuration`, `shieldDuration` and so on). This doesn't apply to attack roles, which follow the table.

## The name and the description

Standing rules from the owner:

> "The NAME carries flavour; the DESCRIPTION states the mechanic."

> "Stop putting fluff into ability descriptions."

**The name:**

- 1 to 4 words, at most 30 characters, in Title Case.
- **No word from the essence's or the stone's name.** "Searing Renewal", not "Fire Life". "Opening Vein", not "Blood Axe".
- No canon ability's name (see `brief/canon_names.txt`).
- Unique among every fusion you write for this essence.
- Vary the patterns you use for names.

**The description:**

- Second person and present tense, 1 to 3 sentences.
- Plain and exact: every effect in the fields, with **its numbers**. The validator checks that `base`, the `dot` damage per tick, `shieldAmount`, `healAmount` and `hotPerSec` each appear as written. Durations are in seconds and distances in tiles.
- Nothing the fields don't do, and nothing the fields do left out.
- Do not state cost or cooldown; the card prints those.
- No filler: no "simply", "as if", "somehow", "it does not…", "the way a…", "like a…", "hungry", "patient", "stubborn", no metaphors and no lines about what it isn't.
- Good: "Throws a bolt of fire that deals 8 damage and sets the target [Burning] for 3 damage a second for 5 seconds. Every point of damage that Burning deals heals you."

## Hard rules

- **Life (`essLife`) and Renewal (`heal`):** every fusion must give, restore or drain health. Use one of:
  - `leech`;
  - a heal template;
  - `dot.healFrac`;
  - `regenPerSec`;
  - a `regenBurst` or `lifedrainBuff` effect.
- **Nothing at diamond rank.**
- **Stay within the vocabulary.** If your idea needs a mechanic the game doesn't have, choose the nearest one it does have and describe what it actually does.
- **Vary across the run.** Across your 24 stones, don't reuse the same template and rider combination more than a few times. Every pair should read as its own idea.

## What reviewers keep having to fix

Nine reviewed runs rewrote between 5 and 50 fusions each. Avoid these from the start:

- **Write damage as "deals N damage", lower case, mid-sentence or after a subject.** The card rescales that phrase with rank. "takes N damage" and a sentence that starts "Deals N" are not rescaled, so the card's "Numbers now" line disagrees with the description.
- **Give a summon or escort its own duration,** different from the buff or taunt it comes with. Two equal durations in one description stop the card from substituting either.
- **Say everything the fields do.** Commonly left out: a summon's `itemBuffs`, the move speed on a stealth veil, the real multiplier on a range buff, cast-speed scaling on a heal pulse, a wall's length.
- **Do not claim what the template does not show.** `explodeRadius` on a `sunderStrike` prints no splash on the card; pick a template that has it.
- **No stone-swap clones.** The same template and rider with the element or a noun changed is one idea used twice. Reviewers found three basic cones with a 25% debuff in one run, four `stackStrike` executes in another, and `sunderStrike` on 17 of 48 attacks in a third.
- **The essence must be in the mechanic, not in an adjective.** "Plated", "steel-tipped" or an animal body part in the description is not the essence. Neither is the stone when it appears only in the name.
- **Spread your names.** Count the words you have used. One run had six "X and Y", six "...Wing", four "Echo" and four "Night"; a pair should not repeat a word between its four names either.
- **A timed regeneration needs a template that has one.** `regenPerSec` on an active is permanent passive regen in the game; use a buff or heal-over-time template for "for N seconds".

## Files and process

1. Write each pair to `tools/fusions/out/<essenceId>/<stoneId>.json` as `{"essence":"<essenceId>","stone":"<stoneId>","fusions":[#0,#1,#2,#3]}`.
2. Run `node tools/fusions/validate.mjs <essenceId> <stoneId> <stoneId> ...` from the repo root, `/home/user/Authored-abilities`, listing **your** stones. It checks those files, including names already used by this essence's other files, and prints what fails.
3. Fix and re-run until it reports `"failed": {}` and no duplicate names.
4. Do not edit any other file in the repo.
