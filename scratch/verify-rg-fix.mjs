import assert from 'node:assert/strict';

function parseRipgrepPlainOutput(out, maxResults) {
  const matches = [];
  const lines = out.split(/\r?\n/).filter(Boolean);
  for (const row of lines) {
    let startSearch = 0;
    if (row.length > 2 && row[1] === ':' && /[a-zA-Z]/.test(row[0]) && (row[2] === '\\' || row[2] === '/')) {
      startSearch = 2;
    }

    const first = row.indexOf(':', startSearch);
    if (first <= 0) continue;
    const second = row.indexOf(':', first + 1);
    if (second <= first) continue;

    const file = row.slice(0, first);
    const lineNumRaw = row.slice(first + 1, second);
    const line = Number.parseInt(lineNumRaw, 10);
    const text = row.slice(second + 1).trim();

    if (!Number.isFinite(line)) continue;
    matches.push({ file, line, text });
    if (matches.length >= maxResults) break;
  }
  return matches;
}

// Windows Mock (Absolute)
const winOut = 'C:\\Jenil\\localnest\\src\\app.ts:10:console.log("hello")';
const winMatches = parseRipgrepPlainOutput(winOut, 10);
console.log('Windows Match:', winMatches[0]);
assert.equal(winMatches[0].file, 'C:\\Jenil\\localnest\\src\\app.ts');
assert.equal(winMatches[0].line, 10);
console.log('SUCCESS: Windows absolute path parsed correctly.');
