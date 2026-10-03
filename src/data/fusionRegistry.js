// ============================================================================
// ROUND 298 -- THE HAND-AUTHORED FUSIONS (item 1.1).
//
// "Every single essence/awakening stone combination needs to feel equally
// good. The generator is making too many moves feel generic or mad libs."
// Answered: "Hand author by priority but I want to be authoring all of them
// today."
//
// Each essence's fusions live in src/data/fusions/<essenceId>.js as
// `{ <stoneId>: [attack, attack, active, passive] }`, written by hand to
// tools/fusions/AUTHORING.md and checked by tools/fusions/validate.mjs. They
// are loaded per essence (a few hundred KB each, so not all at once) and
// registered here; the generator reads this table synchronously and offers a
// pair's fusions ahead of anything it would compose.
// ============================================================================

export const FUSIONS = {};
const pending = {};

export function registerFusions(essenceId, table) {
  if (essenceId && table && typeof table === 'object') FUSIONS[essenceId] = table;
}

export function fusionsFor(essenceId, stoneId) {
  const t = essenceId && FUSIONS[essenceId];
  const list = t && stoneId ? t[stoneId] : null;
  return Array.isArray(list) && list.length ? list : null;
}

export function fusionsLoaded(essenceId) {
  return !!FUSIONS[essenceId] || pending[essenceId] === 'none';
}

/** Load the fusion files for these essences (browser or node). Resolves when
 *  every one is registered or known to have none. */
export function loadFusions(essenceIds) {
  const ids = [...new Set((essenceIds || []).filter(Boolean))];
  return Promise.all(ids.map((id) => {
    if (FUSIONS[id] || pending[id] === 'none') return Promise.resolve();
    if (pending[id] instanceof Promise) return pending[id];
    pending[id] = import(`./fusions/${id}.js`)
      .then((m) => { registerFusions(id, m.default || m.FUSIONS); pending[id] = 'done'; })
      .catch(() => { pending[id] = 'none'; });
    return pending[id];
  }));
}
