import test from 'node:test';
import assert from 'node:assert';
import { DeadReckoningEngine } from '../../src/core/engine/intelligence/prediction.js';

test('DeadReckoningEngine - Edge cases: empty history (new install)', async () => {
  const dbAdapterMock = {
    all: async () => [],
    run: async () => {}
  };

  const memoryMock = {
    store: { adapter: dbAdapterMock },
    searchTriples: async () => ({ items: [] })
  };

  const engine = new DeadReckoningEngine(memoryMock as any, dbAdapterMock);
  
  const result = await engine.predictContext({
    currentFile: 'src/index.ts',
    recentFiles: [],
    recentTools: [],
    activeSymbols: [],
    sessionStartedAt: new Date()
  });

  assert.strictEqual(result.confidence, 0.2); // Recency score only
  assert.strictEqual(result.relatedFiles.length, 0);
  assert.strictEqual(result.kgEntities.length, 0);
});

test('DeadReckoningEngine - Integration: Session outcome recording', async () => {
  let queries: string[] = [];
  const dbAdapterMock = {
    all: async () => [],
    run: async (sql: string) => { queries.push(sql); }
  };

  const memoryMock = {
    store: { adapter: dbAdapterMock },
  };

  const engine = new DeadReckoningEngine(memoryMock as any, dbAdapterMock);
  await engine.recordSessionOutcome(
    { recentFiles: [], recentTools: [], activeSymbols: [], sessionStartedAt: new Date() },
    { confidence: 0, memoryEntries: [], kgEntities: [], relatedFiles: [], rationale: '', predictedAt: new Date() },
    ['fileA.ts', 'fileB.ts']
  );

  assert.ok(queries.length > 0);
});