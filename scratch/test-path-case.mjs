import path from 'node:path';
const r1 = 'C:\\Jenil';
const r2 = 'c:\\jenil';
const rel = path.relative(r1, r2);
console.log(`Relative between '${r1}' and '${r2}': '${rel}'`);
console.log(`rel === '': ${rel === ''}`);
