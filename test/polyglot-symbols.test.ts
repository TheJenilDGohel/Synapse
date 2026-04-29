import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { extractSymbolsFromFile } from '../src/core/engine/retrieval/symbols/extractor.ts';
import { AstChunker } from '../src/core/engine/retrieval/chunker/service.ts';

describe('Polyglot Symbol Extraction', () => {
  const chunker = new AstChunker();
  const fixturesDir = path.join(process.cwd(), 'test/fixtures/polyglot');

  test('Python symbol extraction', async () => {
    const filePath = path.join(fixturesDir, 'sample.py');
    const text = fs.readFileSync(filePath, 'utf8');
    const symbols = await extractSymbolsFromFile(filePath, text, chunker);

    const definitions = symbols.filter(s => s.is_definition === 1);
    const calls = symbols.filter(s => s.is_definition === 0 || s.symbol_kind === 'call');

    const symbolNames = definitions.map(s => s.symbol_name);
    assert.ok(symbolNames.includes('global_func'), 'Should find global_func definition');
    assert.ok(symbolNames.includes('MyClass'), 'Should find MyClass definition');
    assert.ok(symbolNames.includes('method'), 'Should find method definition');

    // Fixture doesn't have calls, but we assert the array exists
    assert.ok(Array.isArray(calls), 'Calls array should exist');
  });

  test('Go symbol extraction', async () => {
    const filePath = path.join(fixturesDir, 'sample.go');
    const text = fs.readFileSync(filePath, 'utf8');
    const symbols = await extractSymbolsFromFile(filePath, text, chunker);

    const definitions = symbols.filter(s => s.is_definition === 1);
    const symbolNames = definitions.map(s => s.symbol_name);

    assert.ok(symbolNames.includes('MyStruct'), 'Should find MyStruct definition');
    assert.ok(symbolNames.includes('Method'), 'Should find Method definition');
    assert.ok(symbolNames.includes('GlobalFunc'), 'Should find GlobalFunc definition');
  });

  test('Rust symbol extraction', async () => {
    const filePath = path.join(fixturesDir, 'sample.rs');
    const text = fs.readFileSync(filePath, 'utf8');
    const symbols = await extractSymbolsFromFile(filePath, text, chunker);

    const definitions = symbols.filter(s => s.is_definition === 1);
    const symbolNames = definitions.map(s => s.symbol_name);

    assert.ok(symbolNames.includes('MyStruct'), 'Should find MyStruct definition');
    assert.ok(symbolNames.includes('method'), 'Should find method definition');
    assert.ok(symbolNames.includes('global_func'), 'Should find global_func definition');
  });
});
