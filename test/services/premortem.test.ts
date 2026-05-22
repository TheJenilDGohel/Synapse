import test from 'node:test';
import assert from 'node:assert';
import { PreMortemEngine } from '../../src/core/engine/intelligence/premortem.js';

test('PreMortemEngine - Edge cases: unknown technology with no library match', async () => {
  const dbAdapterMock = {
    all: async () => [],
    run: async () => {}
  };

  const immuneMock = {
    scanForPatterns: async () => []
  };

  const memoryMock = {
    store: { adapter: dbAdapterMock },
    searchTriples: async () => ({ items: [] })
  };

  const engine = new PreMortemEngine(memoryMock as any, immuneMock as any, dbAdapterMock);
  
  const result = await engine.analyze({
    description: 'Using alien tech',
    technologies: ['alien-tech-db'],
    pattern: 'teleportation'
  });

  assert.strictEqual(result.failureModes.length, 0);
  assert.strictEqual(result.recommendation, 'proceed');
});

test('PreMortemEngine - Integration: Pre-mortem analysis', async () => {
  const dbAdapterMock = {
    all: async () => [
      { title: 'Test Library Match', description: 'Failed due to X', likelihood: 'high', severity: 'high' }
    ],
    run: async () => {}
  };

  const immuneMock = {
    scanForPatterns: async () => [
      { title: 'Test Immune Match', message: 'You failed here', severity: 'high', originalContext: 'Context', resolution: 'Fix it' }
    ]
  };

  const memoryMock = {
    store: { adapter: dbAdapterMock },
    searchTriples: async () => ({ items: [
      { subject_id: 'TestEntity', predicate: 'caused', object_id: 'Failure' }
    ] })
  };

  const engine = new PreMortemEngine(memoryMock as any, immuneMock as any, dbAdapterMock);
  
  const result = await engine.analyze({
    description: 'Test Proposal',
    technologies: ['redis'],
    pattern: 'caching'
  });

  assert.strictEqual(result.failureModes.length, 3); // 1 from KG, 1 from Library, 1 from Immune
  assert.strictEqual(result.recommendation, 'proceed_with_caution'); // 2 high severity modes trigger proceed_with_caution
});