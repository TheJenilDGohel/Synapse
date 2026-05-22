import test from 'node:test';
import assert from 'node:assert';
import { ImmuneSystemEngine } from '../../src/core/engine/intelligence/immune.js';

test('ImmuneSystemEngine - Edge cases: very large files (immune scan)', async () => {
  const dbAdapterMock = {
    all: async () => [],
    run: async () => {}
  };

  const memoryMock = {
    store: { adapter: dbAdapterMock }
  };

  const engine = new ImmuneSystemEngine(memoryMock as any, dbAdapterMock);
  
  const largeCode = 'const a = 1;\n'.repeat(10000);
  
  // Should not throw or crash
  const result = await engine.scanForPatterns(largeCode, 'typescript', 'large.ts');
  assert.strictEqual(result.length, 0);
});

test('ImmuneSystemEngine - Integration: Pattern recording', async () => {
  let queries: string[] = [];
  const dbAdapterMock = {
    all: async () => [],
    run: async (sql: string) => { queries.push(sql); }
  };

  const memoryMock = {
    store: { adapter: dbAdapterMock },
  };

  const engine = new ImmuneSystemEngine(memoryMock as any, dbAdapterMock);
  
  const id = await engine.recordMistake({
    title: 'Test Mistake',
    category: 'custom',
    description: 'Something failed',
    codeSignature: 'console.log()',
    resolution: 'Remove console.log',
    severity: 'low',
    languages: ['ts'],
    triggeredBy: []
  });

  assert.ok(id.startsWith('ptn_'));
  assert.ok(queries.length >= 2); // insert pattern + insert fts
});