import { parentPort, workerData } from 'node:worker_threads';
import { EnrichmentRuntime } from './runtime.js';
import { buildEnrichmentPrompt, parseEnrichmentResponse } from './model.js';

/**
 * Enrichment Worker - Runs LLM inference in a separate thread.
 */

async function main() {
  if (!parentPort) return;

  const runtime = new EnrichmentRuntime({
    device: workerData.device,
    dtype: workerData.dtype,
    modelId: workerData.modelId,
    cacheDir: workerData.cacheDir
  });

  parentPort.on('message', async (message) => {
    if (message.type === 'enrich') {
      try {
        const { code, id } = message.payload;
        const prompt = buildEnrichmentPrompt(code);
        const response = await runtime.generate(prompt);
        const metadata = parseEnrichmentResponse(response);

        parentPort?.postMessage({
          type: 'enrich_result',
          payload: { id, metadata }
        });
      } catch (error) {
        parentPort?.postMessage({
          type: 'enrich_error',
          payload: { id: message.payload.id, error: String(error) }
        });
      }
    }
  });

  // Signal ready
  parentPort.postMessage({ type: 'ready' });
}

main().catch(console.error);
