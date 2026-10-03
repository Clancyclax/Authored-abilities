# Round 298: a full build, a start-up guard, and the hand-authoring run

Your instructions this round: "Workflow, everything: start the full authoring run today, highest priority first." Then: "Need to keep track of the work. The usage sessions are small enough that you may not finish." Then: "At the next break I need a full build onto my desktop. The last update didn't work. Game is stuck at this screen".

## The stuck screen, and the full build

**What is on your Desktop:** `SparkstoneWeb-r298-part1.zip` to `-part22.zip`, a complete build. Run `Rebuild Sparkstone-web.sh` as usual; it needs nothing else.

**What I found about the stuck screen.**

- The `Sparkstone-web` folder on your Desktop was rebuilt at 00:28 UTC and its source files match round 297 exactly, with the art in place. I could not find a fault in the files.
- The same round-297 files start cleanly here in a fresh browser.
- I could not load your GitHub Pages site from here, so I have not seen the error itself. The cause is not confirmed.
- The screen in your picture (the frame, the clock at 08:00, the Map box, no world) is what the page shows when the game's code fails to load at all. Round 264 had the same picture, from a browser mixing files of two rounds.

**What this build does about it.** `index.html` now has a start-up guard:

1. If the game has not started 3 seconds after an error, the page refetches every code file fresh from the site and reloads once.
2. If it still cannot start, the page says "Sparkstone could not start." and prints the error, with a Reload button.

So after this deploy the page either fixes itself or tells you what is wrong. **If you see that panel, send me the text in it.**

- I tested the guard on this build with one code file made to look like an older round's (a missing export):
  - served stale once, the page reloaded itself and the game started;
  - left stale, the page showed the panel with the browser's error in it.
- The full build was started in a browser from the packed folder before it was split: round 298, no errors, no missing files.

**One thing that differs from a normal full build.** The 17 tinted Chrysalis sprite folders are not kept in the repo, and the copies in my workspace were broken. I copied the 595 sheets back from your Desktop `Sparkstone-web` folder, unchanged, into this build.

## Where the run stands

- **Written so far:** 1,369 essence-and-stone pairs, 4 fusions each (5,476 abilities). They are in this build.
  - That is 58 essences, each with its 24 most common stones, plus Life with Fire.
  - **It is 4.9% of the 28,195 pairs.** 58 of 1,185 batches.
- **Reviewed so far:** the first two essences (Adept and Ape). The other 56 batches are written and pass the automatic checks. They have not had their second read.
- **The run is paused.** I stopped the authors to build and deliver this full build. It resumes next.
- **The pace, plainly:** a usage session writes about 30 batches before the session limit stops every agent, and the main conversation with them. At that rate the whole run is about 40 sessions. It will not finish today or this week at the current limits.
- **The live record** is `FUSION_PROGRESS.md` on your Desktop (in the repo as `tools/fusions/PROGRESS.md`). It lists what is written, what is reviewed, what is next and how to resume. I update it at every checkpoint, before starting agents, so a session that ends early loses nothing.
- **`Sparkstone_Fusions_r298.csv`** on your Desktop lists every fusion written so far: essence, stone, name, role, description and whether it has been reviewed. Reading a few dozen rows is the fastest way to judge the quality.

## What a pair gets

Each pair gets four abilities, written to be about the essence and the stone together:

1. an attack;
2. a second attack, of a different shape and with a different job;
3. an active that is not an attack (a buff, a defence, a heal, movement, a summon);
4. a passive.

Three examples, as written:

| Pair | Fusion | What it does |
|---|---|---|
| Ape + Chain | **Tethered Weight** | Flings a weight on a chain for 7 damage; it then leaps to 2 more enemies within 3 tiles, each hit dealing 50% of that. It holds 4 charges, and each kill gives one back. |
| Ape + Chain | **Hauled In** | Hauls up to 4 enemies within 6 tiles onto you and holds their attention for 6 seconds. |
| Adept + Cage | **Snare Shot** | Fires a weighted snare that deals 12 damage to the first enemy it meets, stuns it for 1 second and leaves it [Pinned] for 3 seconds. |
| Adept + Cage | **Shut Every Door** | Holds every creature within 4 tiles in place for 3 seconds. |
| Axe + Blood | **Opening Vein** | A downward chop that deals 14 damage, makes the target [Bleeding] for 3 damage a second for 6 seconds and leaves it 15% easier to wound for 6 seconds. Your afflictions on the target spread to every enemy within 3.5 tiles. |

**My read of the quality.** These are clearly better than "Claw Teeth" and "Healer Plates": each has a mechanic of its own and a real name. They are not all at the level of your Life with Fire set. The first review found the commonest fault was a fusion that showed only the stone, with the essence missing (a plain fire cone on Adept + Fire, for example), and it rewrote 32 of the first 192. The author brief now warns against that. Please read some of the CSV and tell me if the bar is right before the run goes much further.

## How they reach a character

- When a socket's essence and stone have fusions, the game offers them ahead of anything it would compose.
- Each essence's fusions are a file of their own, loaded when a character holds that essence. A socket is not locked while its file is loading.
- The kit's shape still holds: 8 to 14 actives, at least 10 attacks in a damage kit, and all five attack roles. A fusion attack carries its own role.
- In a test of 1,440 sockets that had fusions, 64% took one. The rest are mostly the second resource, the aura and the perception, which every damage kit still gets from the generator.
- A fusion's name is never changed. Its written sentence always comes first; the kit may add a clause after it (a rotation bonus, or the weapon the essence teaches).
- Where more than one fusion fits a socket, the character's seed chooses.
- Old saves keep what they have. New sockets get fusions.

## Life with Fire is now eight

"Fold into 1.1". Four more were written in the run, to sit beside your four:

| Fusion | What it does |
|---|---|
| **Sear Shut** | Throws a brand of fire that deals 7 damage, sets the target [Burning] for 2 damage a second for 4 seconds and leaves it [Enervated] for 6 seconds. You heal for 20% of the damage dealt. Holds 4 charges, and each kill restores one. |
| **Kindred Blaze** | A ring of flame that deals 26 damage to every enemy within 4 tiles and sets them [Burning] for 3 damage a second for 5 seconds. You heal for 20% of the damage dealt, and you and your allies deal 20% more damage for 15 seconds. |
| **Fever Pitch** | For 8 seconds you regenerate 3 health a second, and 25% of the damage you take is dealt back to its source as fire. |
| **Salamander at Heel** | A bonded salamander fights beside you, striking for 4 damage every 1.4 seconds and setting enemies [Burning]. You regenerate 1 health a second. |

A character gets one of the eight. These four have not been reviewed yet.

## Support trios count as support

"Count it as support". When two of a kit's three essences lead with mending or with the team, the kit is a healing or support kit, whatever its build class says. Dance, Pure and Balance is now a healing kit, not a damage kit with ten attacks.

## Fixes

- **Burn figures on cards.** A card rewrote "[Bleeding] for 3 damage a second" with the hit's damage, so it read "for 18 damage a second". The burn's own number now stays, and the hit's "deals N damage" figure follows the ability's rank.

## Decision for you

**The pace.** Each batch (one essence with 24 stones) takes an author and a reviewer, and a session's limit covers about 30 batches. The options:

1. **Keep going as is,** most likely pairs first, a session at a time. About 40 sessions for everything. Every common essence with every common stone (the pairs most players will actually hold) is about 330 batches, so roughly 11 sessions.
2. **Drop the separate review** and have each author check their own work. Roughly twice as fast, with more weak fusions getting through. I'd then review by sampling.
3. **Stop at the common pairs** and leave rare essences and rare stones to the generator until later.

I'd take option 1 and reassess after you've read the CSV. If the quality is already where you want it, option 2 halves the cost.

## Tests

- **New: `test_round298.cjs`, 15 checks.** It covers:
  - every shipped fusion renders its card;
  - kits hold fusions, with the name as written and the written sentence leading;
  - the character seed chooses among a pair's fusions;
  - support trios count as support;
  - in game, a socket is not locked while its essence's fusion file is loading, and takes a fusion once it arrives.
  - the start-up guard is in `index.html` ahead of the game's code, the list of code files it refetches is complete, and a clean start raises no panel.
- **The guard's two failure cases** (a stale file, a broken file) were run by hand against the packed build, as described at the top. They need a server that misbehaves on purpose, so they are not in the suite.
- **Also run this round:** `test_round297.cjs` (21 pass) and `test_round296.cjs` (22 pass). I did not re-run the wider regression batch after the guard was added; your CI run covers it.
- **`tools/fusions/validate.mjs`** checks every pair against the game's own code before it ships: the shape exists and has its fields, the card prints no `undefined`, the description states its numbers, names don't reuse the essence's or stone's word, and Life and Renewal fusions give, restore or drain health.
