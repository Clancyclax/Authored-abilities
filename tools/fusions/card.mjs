// node tools/fusions/card.mjs <essenceId> <stoneId>  -- the in-game cards for a
// pair's fusions, exactly as a player will read them at iron (cost, ladder and
// all). Check the "Numbers now" line against your description.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const A = await import(path.join(ROOT, 'src/data/awakening.js'));
const C = await import(path.join(ROOT, 'src/data/abilityCard.js'));
const { ESSENCES } = await import(path.join(ROOT, 'src/data/abilities.js'));
const [ess, stone] = process.argv.slice(2);
const doc = JSON.parse(fs.readFileSync(path.join(HERE, 'out', ess, `${stone}.json`), 'utf8'));
for (const f of doc.fusions) {
  const a = A.prepareFusion(f, { ...ESSENCES[ess], id: ess }, stone);
  console.log(C.abilityCardLines(a, { rank: 'iron', level: 0, progress: 0 }).join('\n'));
  console.log('---');
}
