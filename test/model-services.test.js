import test from 'node:test';
import assert from 'node:assert/strict';
import { EmbeddingService, RerankerService } from '../src/services/retrieval/index.js';

test('embedding service reports unavailable before first successful model load', () => {
  const service = new EmbeddingService({ provider: 'huggingface', model: 'x', cacheDir: '/tmp' });
  const status = service.getStatus();

  assert.equal(status.enabled, true);
  assert.equal(status.available, false);
});

test('reranker distinguishes relevant and irrelevant text with direct model inference', async () => {
  const service = new RerankerService({
    provider: 'huggingface',
    model: 'cross-encoder/ms-marco-MiniLM-L-6-v2'
  });

  service._getModelBundle = async () => ({
    tokenizer: async (query, { text_pair: text }) => ({ query, text }),
    model: async ({ query, text }) => ({
      logits: {
        data: [query.includes('jwt') && text.includes('token') ? 3 : -3]
      }
    })
  });

  const relevant = await service.score('jwt auth token', 'jwt token validation middleware');
  const irrelevant = await service.score('jwt auth token', 'banana mango smoothie recipe');

  assert.ok(relevant > irrelevant, `expected relevant > irrelevant, got ${relevant} vs ${irrelevant}`);
  assert.ok(relevant > 0.5, `expected relevant score > 0.5, got ${relevant}`);
  assert.ok(irrelevant < 0.5, `expected irrelevant score < 0.5, got ${irrelevant}`);
});
