import test from 'node:test';
import assert from 'node:assert/strict';
import { startStalenessMonitor } from '../src/mcp/index.js';

test('startStalenessMonitor skips overlapping reindex runs', async () => {
  const logs = [];
  let checkCount = 0;
  let indexCalls = 0;

  const vectorIndex = {
    checkStaleness() {
      checkCount += 1;
      return {
        stale: true,
        stale_count: 1,
        total_indexed: 10
      };
    },
    async indexProject() {
      indexCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  };

  const timer = startStalenessMonitor(vectorIndex, 0.0005, (line) => logs.push(line));
  assert.ok(timer);

  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(indexCalls, 1);
  clearInterval(timer);
  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.ok(checkCount >= 1);
  assert.ok(logs.some((line) => line.includes('re-indexing')));
  assert.equal(indexCalls, 1);
});

test('startStalenessMonitor returns null when disabled', () => {
  const timer = startStalenessMonitor({
    checkStaleness() {
      throw new Error('should not run');
    },
    async indexProject() {}
  }, 0);

  assert.equal(timer, null);
});
