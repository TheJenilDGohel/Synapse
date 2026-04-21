import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRipgrepPlainOutput } from '../src/services/retrieval/search/lexical-search.ts';

test('parseRipgrepPlainOutput handles Windows absolute paths with drive letters', () => {
  const input = 'C:\\Users\\devje\\synapse\\src\\main.ts:10:function main() {';
  const results = parseRipgrepPlainOutput(input, 10);
  
  assert.equal(results.length, 1);
  assert.equal(results[0].file, 'C:\\Users\\devje\\synapse\\src\\main.ts');
  assert.equal(results[0].line, 10);
  assert.equal(results[0].text, 'function main() {');
});

test('parseRipgrepPlainOutput handles standard POSIX paths', () => {
  const input = '/usr/src/app/main.js:20:const x = 1;';
  const results = parseRipgrepPlainOutput(input);
  
  assert.equal(results.length, 1);
  assert.equal(results[0].file, '/usr/src/app/main.js');
  assert.equal(results[0].line, 20);
  assert.equal(results[0].text, 'const x = 1;');
});

test('parseRipgrepPlainOutput handles paths with multiple colons (non-drive letter)', () => {
  const input = 'data:text/plain:5:hello:world';
  const results = parseRipgrepPlainOutput(input);
  
  assert.equal(results.length, 1);
  assert.equal(results[0].file, 'data:text/plain');
  assert.equal(results[0].line, 5);
  assert.equal(results[0].text, 'hello:world');
});

test('parseRipgrepPlainOutput ignores invalid lines', () => {
  const input = 'just some text without colons\nfile:not-a-number:text';
  const results = parseRipgrepPlainOutput(input);
  
  assert.equal(results.length, 0);
});
