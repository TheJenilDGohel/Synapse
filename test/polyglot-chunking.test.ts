import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { AstChunker } from '../src/core/engine/retrieval/chunker/service.ts';

describe('Polyglot AST Chunking', () => {
  const chunker = new AstChunker();

  test('Python chunking', async () => {
    const text = fs.readFileSync(path.join(process.cwd(), 'test/fixtures/polyglot/sample.py'), 'utf8');
    const chunks = await chunker.chunk({ filePath: 'sample.py', text, chunkLines: 50, chunkOverlap: 10 });
    assert.ok(chunks.length >= 2, 'Should extract Python chunks');
  });

  test('Go chunking', async () => {
    const text = fs.readFileSync(path.join(process.cwd(), 'test/fixtures/polyglot/sample.go'), 'utf8');
    const chunks = await chunker.chunk({ filePath: 'sample.go', text, chunkLines: 50, chunkOverlap: 10 });
    assert.ok(chunks.length >= 2, 'Should extract Go chunks');
  });

  test('Rust chunking', async () => {
    const text = fs.readFileSync(path.join(process.cwd(), 'test/fixtures/polyglot/sample.rs'), 'utf8');
    const chunks = await chunker.chunk({ filePath: 'sample.rs', text, chunkLines: 50, chunkOverlap: 10 });
    assert.ok(chunks.length >= 2, 'Should extract Rust chunks');
  });
});
