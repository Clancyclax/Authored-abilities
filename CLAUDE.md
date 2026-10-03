# Sparkstone fusion authoring: cloud session brief

This repo is a lean copy of the game "By Love or by Fear" (an isometric HWFWM fan game) holding only what the **fusion authoring run** needs: the game's data code under `src/` (read-only here) and the pipeline under `tools/fusions/`. There is no art and no browser in this repo. Do not change anything under `src/` except the generated `src/data/fusions/`.

## The job

Hand-author an ability fusion for every essence x awakening-stone pair, 4 fusions per pair (attack, a second attack of a different shape/role, a non-attack active, a passive). The work is split into **1,185 batches** ("chunks": one essence with up to 24 stones; 28,195 pairs in all), in priority order, the pairs a player is most likely to hold first. Each batch goes through two stages: an **author** writes and validates it, then an independent **reviewer** rewrites the weak fusions and re-validates.

State when this repo was cut (see `tools/fusions/PROGRESS.md`, regenerate with `node tools/fusions/status.mjs`): 122 batches written, 94 of them reviewed, 2,929 pairs assembled.

The binding standard is `tools/fusions/AUTHORING.md`. Read it completely before authoring or reviewing, and make sure every agent you start does too.

## First thing, every session

```
bash tools/fusions/set_repo_path.sh      # points the wave script and brief at this folder
node tools/fusions/status.mjs            # where we are; prints the next batches
node tools/fusions/status.mjs --json 126 # the next 126 items; "R:<id>" means review only
```

## Running a wave

Use `tools/fusions/wave.workflow.js` with the Workflow tool, with `args` a JSON array of items (`"essApe__01"` = author then review; `"R:essApe__01"` = review only). The owner has asked for workflows to be used for this run. Rules learned the hard way:

- **Six runs per wave.** Three runs holding only `R:` items split evenly, and three runs holding the next 60 new batches split evenly (20 each). Review-only items must be in their own runs: in a mixed run they queue behind every author and never get done.
- The owner's measured pace on one subscription window was about 16 batches written plus 21 reviews. Here the limit is the credit balance, not a window, so size the waves to what is left (see "Spending the credit").
- A batch counts only once its agent has run `node tools/fusions/mark.mjs <id> authored` (or `reviewed`). A batch cut off part-way is picked up again by a later author.
- If the Workflow tool is not available in this session, do the same with the Agent tool: one subagent per batch, up to ~10 at a time, using the author and review prompts in `wave.workflow.js` verbatim (they are the text of `authorPrompt` and `reviewPrompt`).
- Validators check against the game's own code: `node tools/fusions/validate.mjs <essence> <stone> ...`. A batch is good only when it reports `"failed": {}` and `"duplicateNames": []`.

## Checkpoint after every wave, and before launching the next

```
node tools/fusions/assemble.mjs          # ships validated pairs into src/data/fusions/ ; expect "rejectedCount": 0
node tools/fusions/status.mjs
git add -A && git commit -m "Fusion run: <n> written / <n> reviewed" && git push
```

Push to the branch this session works on. The owner collects the work with `tools/fusions/bring_back.sh` (it copies only per-chunk files, so there are never conflicts with the game repo). Never rewrite or reorder existing files outside the batch you were given.

## Spending the credit

The $250 credit covers cloud sessions only, and expires 4 Nov 2026. Authoring a batch and reviewing it each cost several hundred thousand tokens of agent work, so the credit will not finish the 1,063 batches left; the priority order is what matters, so always take the next batches in order and never skip ahead. After the first wave, tell the owner what it cost (the usage menu shows the balance) and how many batches it finished, so he can see the rate. Stop and report rather than start a wave you cannot finish.

## Model quality, measured

Reviewers were told to rewrite anything below the bar. Of 96 fusions per batch, Opus-written batches had a reviewer rewrite a median of 37 (range 5 to 70). Three Sonnet-written batches were rewritten 47, 77 and 82 of 96, so **author with Opus and review with Opus if the credit allows it**; if cost forces a choice, spend it on the reviewer.

## What the owner has said (binding)

- "The NAME carries flavour; the DESCRIPTION states the mechanic." "Stop putting fluff into ability descriptions."
- "Cannon abilities are EXACT they are not to be modified without direct approval to do so."
- "Every single essence/awakening stone combination needs to feel equally good. The generator is making too many moves feel generic or mad libs."
- Never descope the essence and awakening-stone architecture. No recolours on temples. No diamond-rank content.
- Tabular exports are CSV (`node tools/fusions/export_csv.mjs <out.csv>`).
- Don't overcorrect; ask questions as needed. When he says to drop something, drop it for good. No status-poll spam: if something is wedged, change approach.
- Commits stay on the working branch; nothing is merged for him.

## Reviewer fault list (also in AUTHORING.md)

Write damage as "deals N damage" lower-case; give summons and escorts their own duration; say everything the fields do and claim nothing the template does not show (for example `explodeRadius` on `sunderStrike` prints no splash); no stone-swap clones; the essence must be in the mechanic, not an adjective; vary names (no repeated "Verb the Noun" or participle patterns); the "move N% faster after using it" rider must not be stamped on everything; `regenPerSec` on an active is permanent passive regen.
