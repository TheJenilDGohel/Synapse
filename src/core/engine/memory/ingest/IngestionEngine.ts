import { IIngestionEngine } from '../../../interfaces/services.js';
import type { Adapter, EmbeddingService, IngestOpts } from '../types/index.js';
import { ingestMarkdown as ingestMarkdownFn, ingestJson as ingestJsonFn } from '../ingest/ingest.js';
import { MemoryHooks } from '../events/hooks.js';

export class IngestionEngine implements IIngestionEngine {
  constructor(
    private adapter: Adapter,
    private embeddingService: EmbeddingService | null,
    private hooks: MemoryHooks
  ) {}

  async ingestMarkdown(opts: IngestOpts = {}) {
    const hookResult = await this.hooks.emit('before:ingest', { type: 'markdown', opts });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { type: string; opts: IngestOpts };
    const result = await ingestMarkdownFn(this.adapter, this.embeddingService, payload.opts);
    await this.hooks.emit('after:ingest', result);
    return result;
  }

  async ingestJson(opts: IngestOpts = {}) {
    const hookResult = await this.hooks.emit('before:ingest', { type: 'json', opts });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { type: string; opts: IngestOpts };
    const result = await ingestJsonFn(this.adapter, this.embeddingService, payload.opts);
    await this.hooks.emit('after:ingest', result);
    return result;
  }
}
