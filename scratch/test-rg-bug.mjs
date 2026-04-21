import assert from 'node:assert/strict';

function parseRipgrepPlainOutput(out, maxResults) {
  const matches = [];
  const lines = out.split(/\r?\n/).filter(Boolean);
  for (const row of lines) {
    const first = row.indexOf(':');
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

// POSIX Mock
const posixOut = 'src/app.ts:10:console.log("hello")';
const posixMatches = parseRipgrepPlainOutput(posixOut, 10);
console.log('POSIX Match:', posixMatches[0]);
assert.equal(posixMatches[0].file, 'src/app.ts');
assert.equal(posixMatches[0].line, 10);

// Windows Mock (Absolute)
const winOut = 'C:\\Jenil\\localnest\\src\\app.ts:10:console.log("hello")';
const winMatches = parseRipgrepPlainOutput(winOut, 10);
console.log('Windows Match:', winMatches[0]);
try {
  assert.equal(winMatches[0].file, 'C:\\Jenil\\localnest\\src\\app.ts');
} catch (e) {
  console.log('FAILED as expected:', winMatches[0].file, 'instead of full path');
}
