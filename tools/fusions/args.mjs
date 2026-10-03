// node tools/fusions/args.mjs <from> <to> -> the workflow args for chunks [from, to)
import fs from 'fs';
const C = JSON.parse(fs.readFileSync('tools/fusions/chunks.json', 'utf8'));
const E = JSON.parse(fs.readFileSync('tools/fusions/brief/essences.json', 'utf8'));
const S = JSON.parse(fs.readFileSync('tools/fusions/brief/stones.json', 'utf8'));
const [from, to] = process.argv.slice(2).map(Number);
const out = C.slice(from, to).map((c, i) => {
  const e = E[c.essence];
  return { n: from + i, id: c.id, essence: c.essence,
    essenceLine: `${e.name} (${c.essence}; ${e.rarity}, family ${e.family}; "${e.phrase}"; levers ${e.levers.join(', ')}${e.healthRule ? '; HEALTH RULE APPLIES' : ''}). Catalogue: ${e.desc}`,
    stones: c.stones,
    stoneLines: c.stones.map(s => `${s}: ${S[s].name} (${S[s].rarity}, family ${S[s].family}; "${S[s].phrase}") ${S[s].desc}`) };
});
process.stdout.write(JSON.stringify(out));
