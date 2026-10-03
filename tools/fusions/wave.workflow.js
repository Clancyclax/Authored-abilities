export const meta = {
  name: 'author-fusions-wave',
  description: 'Hand-author essence x stone fusions in priority order: per chunk (one essence, up to 24 stones) an author writes 4 fusions per pair and validates, then a reviewer rewrites weak ones and re-validates',
  phases: [
    { title: 'Author', detail: 'one agent per chunk writes and validates its pairs' },
    { title: 'Review', detail: 'an independent reviewer fixes weak fusions in place' },
  ],
}

const REPO = 'REPO_ROOT'
const AUTHOR_SCHEMA = {
  type: 'object',
  properties: { pairsWritten: { type: 'number' }, validatorPasses: { type: 'boolean' }, notes: { type: 'string' } },
  required: ['pairsWritten', 'validatorPasses', 'notes'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    pairsReviewed: { type: 'number' }, fusionsRewritten: { type: 'number' }, validatorPasses: { type: 'boolean' },
    commonProblems: { type: 'array', items: { type: 'string' } },
  },
  required: ['pairsReviewed', 'fusionsRewritten', 'validatorPasses', 'commonProblems'],
}

const TOOLS = `Helpers (run from ${REPO}):
  node tools/fusions/chunk.mjs ID          -- your essence, your stones, any note, and your validate command
  node tools/fusions/vocab.mjs [template]  -- allowed templates; one template's fields and a real example
  node tools/fusions/card.mjs ESSENCE STONE -- the in-game cards for a pair, as a player reads them at iron (check "Numbers now" against your description; the rank ladder can move numbers)
Do NOT read the game's source under src/ -- the brief, vocab.mjs, card.mjs and the validator are everything you need. Put any scratch files under /tmp/ID_* only (other runs share the scratchpad).`

function authorPrompt(id) {
  return `You are hand-authoring ability fusions for the Sparkstone game repo at ${REPO}. Your run is chunk ${id}.

Read ${REPO}/tools/fusions/AUTHORING.md first, completely; its rules are binding. Then read ${REPO}/tools/fusions/examples/essAxe__stoneBlood.json.
${TOOLS.replace(/ID/g, id)}

Start with: node tools/fusions/chunk.mjs ${id}
(Some of your files may already exist from an interrupted earlier run: read them and finish or rewrite them to this standard.)

For EACH pair, before writing, settle one line in your head: "<essence> is about A; <stone> is about B; together they make C." Every one of the four fusions must carry BOTH halves. Reviewers of earlier runs found the most common failure was a fusion that showed only the stone (a fire cone, a bat dodge buff) with the essence's identity missing, followed by repeated motifs across a run ("throws a stone" five times). Avoid both. Keep the run varied: templates, riders, triggers, roles and naming patterns.

Work economically; every tool call costs. Look up all the templates you expect to use in ONE vocab.mjs call. Design all your pairs first, then write ALL the files with ONE script (under /tmp/${id}_write.py or .mjs) rather than one tool call per file. Then run the validate command chunk.mjs printed, fix, and re-run until "failed" is {} and "duplicateNames" is []. Spot-check three or four pairs with card.mjs. Edit only your own files.

When the validator passes, run: node tools/fusions/mark.mjs ${id} authored

Return pairsWritten, whether the validator passes, and a one-line note.`
}

function reviewPrompt(id) {
  return `You are the quality reviewer for hand-authored ability fusions in the Sparkstone game repo at ${REPO}, chunk ${id}. An author just wrote them; find what falls short of the brief and FIX it in place.

Read ${REPO}/tools/fusions/AUTHORING.md completely first; it is the standard. The owner's bar: "Every single essence/awakening stone combination needs to feel equally good. The generator is making too many moves feel generic or mad libs." Of the Life x Fire set: "Notice how thematic it feels, interesting effects merging life and fire."
${TOOLS.replace(/ID/g, id)}

Start with: node tools/fusions/chunk.mjs ${id}   (then read every file it covers under tools/fusions/out/<essence>/)

Be skeptical. For every fusion:
1. FUSION TEST: is the mechanic about this essence AND this stone? If the essence's identity is missing, or the stone could be swapped with only the element or a noun changing, rewrite it.
2. The description states exactly what the fields do, with their numbers; nothing the fields do not do; no filler, metaphor or pictures. Check the card with card.mjs: if "Numbers now" disagrees with the description (the rank ladder can change a figure), fix the description or the fields.
3. Names are evocative, not mad-libs, and no naming pattern repeats across the run.
4. Numbers sane for iron and the role (the brief's tables).
5. Variety across the run: rewrite repeats of the same template + rider idea.

Work economically: read all the files in one or two tool calls, decide every change, then apply them with one script. Then run the validate command and fix until it passes. Edit only these files.

When the validator passes, run: node tools/fusions/mark.mjs ${id} reviewed

Return pairs reviewed, fusions rewritten, whether the validator passes, and the most common problems (short phrases).`
}

// An item is a chunk id (author, then review) or "R:<chunk id>" (already
// written; review only). tools/fusions/status.mjs --json prints the list.
const results = await pipeline(
  args,
  (item) => (item.startsWith('R:')
    ? Promise.resolve({ skipped: true })
    : agent(authorPrompt(item), { label: `author:${item}`, phase: 'Author', schema: AUTHOR_SCHEMA })),
  (a, item) => {
    const id = item.replace(/^R:/, '')
    if (a && !a.skipped && !a.validatorPasses) return { id, author: a, review: null }
    return agent(reviewPrompt(id), { label: `review:${id}`, phase: 'Review', schema: REVIEW_SCHEMA })
      .then(r => ({ id, author: a, review: r }))
  },
)
const done = results.filter(Boolean)
log(`${done.length} of ${args.length} chunks authored and reviewed`)
return done.map(d => ({ id: d.id, ok: !!(d.review && d.review.validatorPasses), rewritten: d.review && d.review.fusionsRewritten, problems: (d.review && d.review.commonProblems || []).slice(0, 3) }))
