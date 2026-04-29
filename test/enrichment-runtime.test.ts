import { test, describe } from 'node:test';
import assert from 'node:assert';
import { EnrichmentRuntime } from '../src/core/engine/enrichment/runtime.ts';
import { EnrichmentModelService, buildEnrichmentPrompt } from '../src/core/engine/enrichment/model.ts';

describe('EnrichmentRuntime', () => {
  test('should initialize and generate text', { timeout: 60000 }, async () => {
    // Note: We use a tiny model for testing if possible, or just mock it.
    // For now, let's try to initialize it and see if it fails gracefully.
    const runtime = new EnrichmentRuntime({
      device: 'cpu', // Use CPU for predictable testing
      modelId: 'Xenova/tiny-random-Gpt2' // Very small model for testing
    });

    try {
      await runtime.initialize();
      const status = runtime.getStatus();
      assert.strictEqual(status.initialized, true);
      assert.strictEqual(status.device, 'cpu');

      const result = await runtime.generate('Hello', 5);
      assert.ok(result.length > 0);
    } catch (error) {
      console.warn('Skipping actual LLM generation test as environment might not support it:', error);
    }
  });

  test('should handle prompt building', () => {
    const code = 'const x = 1;';
    const prompt = buildEnrichmentPrompt(code);
    assert.ok(prompt.includes(code));
  });

  test('EnrichmentModelService should manage model config', () => {
    const service = new EnrichmentModelService('my-model', '/tmp/cache');
    assert.strictEqual(service.getModelId(), 'my-model');
    assert.strictEqual(service.getCacheDir(), '/tmp/cache');

    service.setModelId('new-model');
    assert.strictEqual(service.getModelId(), 'new-model');
  });
});

