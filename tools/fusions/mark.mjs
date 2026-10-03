// node tools/fusions/mark.mjs <chunkId> authored|reviewed
// Records that a chunk's pairs are written (and pass the validator) or have
// been through review. One small file per chunk and stage, so runs working in
// parallel never write the same file. status.mjs reads these.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [id, stage] = process.argv.slice(2);
if (!id || !['authored', 'reviewed'].includes(stage)) { console.log('usage: mark.mjs <chunkId> authored|reviewed'); process.exit(1); }
const C = JSON.parse(fs.readFileSync(path.join(HERE, 'chunks.json'), 'utf8'));
const c = C.find(x => x.id === id);
if (!c) { console.log(`no chunk ${id}`); process.exit(1); }
const missing = c.stones.filter(s => !fs.existsSync(path.join(HERE, 'out', c.essence, `${s}.json`)));
if (missing.length) { console.log(`not marked: ${missing.length} pair files missing (${missing.slice(0, 5).join(', ')})`); process.exit(1); }
fs.mkdirSync(path.join(HERE, 'done'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'done', `${id}.${stage}`), new Date().toISOString() + '\n');
console.log(`marked ${id} ${stage}`);
