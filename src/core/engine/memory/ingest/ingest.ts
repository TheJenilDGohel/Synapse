import crypto from 'node:crypto';
import fs from 'node:fs';
import { nowIso, cleanString } from '../utils/index.js';
import { storeEntry } from '../store/entries.js';
import { addTriple } from '../knowledge-graph/kg.js';
import { checkDuplicate } from '../store/dedup.js';
import type {
  Adapter, EmbeddingService, ConversationTurn, ExtractedEntity, TripleDef,
  IngestOpts, IngestResult
} from '../types/index.js';
export { extractEntities } from './entity-extractor.js';
export { extractEntitiesAsync, configureNER, getNERStatus } from './entity-extractor.js';
export { MemoryClassifierService } from './classifier-service.js';
export type { ClassificationOutput } from './classifier-service.js';

/**
 * Compute SHA-256 hash of a string.
 */
function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

interface ConversationSourceRow {
  id: string;
  ingested_at: string;
  turn_count: number;
}

/**
 * Check if a file has already been ingested (same path + hash).
 */
import { checkAlreadyIngested, recordSource } from './dedup-source.js';

import { parseMarkdownConversation } from './parsers/markdown.js';
import { parseJsonConversation } from './parsers/json.js';

// Entity extraction moved to ./entity-extractor.ts to break circular dependency
// Re-exported above via: export { extractEntities } from './entity-extractor.js';
import { extractEntities, extractEntitiesAsync } from './entity-extractor.js';
import { MemoryClassifierService } from './classifier-service.js';

// Singleton classifier instance (lazy-loaded when enabled)
let _classifierService: MemoryClassifierService | null = null;
let _classifierEnabled = false;

/**
 * Configure the memory classifier for auto-typing.
 * Call this once during app initialization when SYNAPSE_CLASSIFIER_ENABLED=true.
 */
export function configureClassifier(enabled: boolean, options?: { model?: string; cacheDir?: string; confidenceThreshold?: number }): void {
  _classifierEnabled = enabled;
  if (enabled) {
    _classifierService = new MemoryClassifierService(options);
  } else {
    _classifierService = null;
  }
}

/**
 * Get the current classifier service status.
 */
export function getClassifierStatus() {
  if (!_classifierEnabled || !_classifierService) {
    return { enabled: false, model: '', available: false, categories: [] };
  }
  return _classifierService.getStatus();
}

/**
 * Generate KG triples from extracted entities within a conversation turn.
 * Creates "mentioned_in" relationships between entities and the source turn.
 * Creates "co_occurs_with" between entities mentioned in the same turn.
 */
function buildTriples(entities: ExtractedEntity[], turnRole: string, sourceMemoryId: string): TripleDef[] {
  const triples: TripleDef[] = [];

  // Each entity "mentioned_in" conversation by role
  for (const entity of entities) {
    triples.push({
      subjectName: entity.name,
      predicate: 'mentioned_by',
      objectName: turnRole,
      sourceMemoryId,
      sourceType: 'conversation_ingestion',
      confidence: 0.7
    });
  }

  // Co-occurrence: pairs of entities in same turn
  for (let i = 0; i < entities.length && i < 10; i++) {
    for (let j = i + 1; j < entities.length && j < 10; j++) {
      triples.push({
        subjectName: entities[i].name,
        predicate: 'co_occurs_with',
        objectName: entities[j].name,
        sourceMemoryId,
        sourceType: 'conversation_ingestion',
        confidence: 0.5
      });
    }
  }

  return triples;
}

// --- Main ingestion pipelines ---

interface IngestMeta {
  filePath: string;
  fileHash: string;
  nest: string;
  branch: string;
  agentId: string;
  format: string;
}

/**
 * Ingest a Markdown conversation into memory entries and KG triples.
 */
export async function ingestMarkdown(
  adapter: Adapter,
  embeddingService: EmbeddingService | null,
  opts: IngestOpts = {}
): Promise<IngestResult> {
  const filePath = cleanString(opts.filePath, 1000) || '';
  let rawContent = (opts.content as string) || '';

  if (!rawContent && filePath) {
    try {
      rawContent = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new Error(`Cannot read file: ${filePath} — ${(err as Error).message}`, { cause: err });
    }
  }

  if (!rawContent) {
    throw new Error('content or filePath is required');
  }

  const fileHash = sha256(rawContent);

  // Check re-ingestion
  if (filePath) {
    const existing = await checkAlreadyIngested(adapter, filePath, fileHash);
    if (existing) {
      return {
        skipped: true,
        reason: 'already_ingested',
        source_id: existing.id,
        ingested_at: existing.ingested_at,
        turn_count: existing.turn_count
      };
    }
  }

  const turns = parseMarkdownConversation(rawContent);
  if (turns.length === 0) {
    return { skipped: true, reason: 'no_turns_found', turn_count: 0 };
  }

  return _ingestTurns(adapter, embeddingService, turns, {
    filePath,
    fileHash,
    nest: opts.nest || '',
    branch: opts.branch || '',
    agentId: opts.agentId || '',
    format: 'markdown'
  });
}

/**
 * Ingest a JSON conversation into memory entries and KG triples.
 */
export async function ingestJson(
  adapter: Adapter,
  embeddingService: EmbeddingService | null,
  opts: IngestOpts = {}
): Promise<IngestResult> {
  const filePath = cleanString(opts.filePath, 1000) || '';
  let rawContent: unknown = opts.content;

  if (!rawContent && filePath) {
    try {
      rawContent = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new Error(`Cannot read file: ${filePath} — ${(err as Error).message}`, { cause: err });
    }
  }

  if (!rawContent) {
    throw new Error('content or filePath is required');
  }

  // Normalize to string for hashing
  const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
  const fileHash = sha256(contentStr);

  // Check re-ingestion
  if (filePath) {
    const existing = await checkAlreadyIngested(adapter, filePath, fileHash);
    if (existing) {
      return {
        skipped: true,
        reason: 'already_ingested',
        source_id: existing.id,
        ingested_at: existing.ingested_at,
        turn_count: existing.turn_count
      };
    }
  }

  const turns = parseJsonConversation(rawContent);
  if (turns.length === 0) {
    return { skipped: true, reason: 'no_turns_found', turn_count: 0 };
  }

  return _ingestTurns(adapter, embeddingService, turns, {
    filePath,
    fileHash,
    nest: opts.nest || '',
    branch: opts.branch || '',
    agentId: opts.agentId || '',
    format: 'json'
  });
}

/**
 * Core ingestion pipeline shared by Markdown and JSON parsers.
 * Processes turns: dedup check, store as memory, extract entities, create KG triples.
 */
async function _ingestTurns(
  adapter: Adapter,
  embeddingService: EmbeddingService | null,
  turns: ConversationTurn[],
  meta: IngestMeta
): Promise<IngestResult> {
  const results: IngestResult = {
    skipped: false,
    format: meta.format,
    turn_count: turns.length,
    stored_count: 0,
    dedup_skipped: 0,
    entities_extracted: 0,
    triples_created: 0,
    memory_ids: [],
    errors: []
  };

  // Build a fake store-like object for storeEntry and checkDuplicate
  const storeProxy = {
    enabled: true,
    adapter,
    embeddingService: embeddingService || null,
    dbPath: '',
    requestedBackend: 'node-sqlite',
    selectedBackend: 'node-sqlite' as string | null,
    init: async () => {},
    getMeta: async (key: string) => {
      const row = await adapter.get<{ value: string }>('SELECT value FROM memory_meta WHERE key = ?', [key]);
      return row ? row.value : null;
    }
  };

  for (const turn of turns) {
    try {
      // Dedup check per turn
      const dedupResult = await checkDuplicate(adapter, embeddingService, turn.content, {
        threshold: 0.92,
        nest: meta.nest,
        branch: meta.branch
      });

      if (dedupResult.isDuplicate) {
        results.dedup_skipped!++;
        continue;
      }

      // Store as memory entry
      const turnTitle = `${turn.role} (turn ${turn.index + 1})`;
      const entryResult = await storeEntry(storeProxy, {
        kind: 'conversation',
        title: turnTitle,
        content: turn.content,
        summary: turn.content.slice(0, 280),
        nest: meta.nest,
        branch: meta.branch,
        agent_id: meta.agentId,
        source_type: `conversation_${meta.format}`,
        source_ref: meta.filePath || '',
        tags: ['conversation', turn.role],
        importance: 30,
        confidence: 0.8
      });

      if (!entryResult.created) {
        results.dedup_skipped!++;
        continue;
      }

      const memoryId = entryResult.memory!.id;
      results.memory_ids!.push(memoryId);
      results.stored_count!++;

      // Entity extraction (use async NER-enhanced version when available)
      let entities: ExtractedEntity[];
      try {
        entities = await extractEntitiesAsync(turn.content);
      } catch {
        // Fall back to sync regex-only extraction
        entities = extractEntities(turn.content);
      }
      results.entities_extracted! += entities.length;

      // Auto-classify memory type if classifier is enabled and no explicit kind was set
      if (_classifierEnabled && _classifierService) {
        try {
          const classification = await _classifierService.classify(turn.content);
          if (classification) {
            // Store auto_type as a tag — does NOT override the 'kind' field
            // which remains 'conversation'. The auto_type is a classification signal.
            const autoTypeTag = `auto_type:${classification.auto_type}`;
            const confidenceTag = `auto_confidence:${Math.round(classification.confidence * 100)}`;
            // Update the stored entry with classification metadata
            try {
              await adapter.run(
                `UPDATE memories SET tags_json = json_insert(tags_json, '$[#]', ?, '$[#]', ?)
                 WHERE id = ?`,
                [autoTypeTag, confidenceTag, memoryId]
              );
            } catch {
              // Non-fatal: SQLite json_insert may not be available in all builds.
              // Fall back to reading + rewriting tags.
              try {
                const row = await adapter.get<{ tags_json: string }>(
                  'SELECT tags_json FROM memories WHERE id = ?', [memoryId]
                );
                if (row) {
                  const tags: string[] = JSON.parse(row.tags_json || '[]');
                  tags.push(autoTypeTag, confidenceTag);
                  await adapter.run(
                    'UPDATE memories SET tags_json = ? WHERE id = ?',
                    [JSON.stringify(tags), memoryId]
                  );
                }
              } catch {
                // Best-effort — classification metadata is non-critical
              }
            }
          }
        } catch {
          // Non-fatal: classification failure should never break ingestion
        }
      }

      // Create KG triples
      const tripleDefs = buildTriples(entities, turn.role, memoryId);
      for (const td of tripleDefs) {
        try {
          await addTriple(adapter, {
            subjectName: td.subjectName,
            predicate: td.predicate,
            objectName: td.objectName,
            sourceMemoryId: td.sourceMemoryId,
            sourceType: td.sourceType,
            confidence: td.confidence
          });
          results.triples_created!++;
        } catch {
          // Non-fatal: skip individual triple failures
        }
      }
    } catch (err) {
      results.errors!.push({ turn_index: turn.index, error: (err as Error).message });
    }
  }

  // Record source file for re-ingestion tracking
  if (meta.filePath) {
    const srcRecord = await recordSource(adapter, {
      filePath: meta.filePath,
      fileHash: meta.fileHash,
      turnCount: results.stored_count!,
      memoryIds: results.memory_ids!
    });
    results.source_id = srcRecord.id;
  }

  return results;
}
