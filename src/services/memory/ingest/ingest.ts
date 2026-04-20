import crypto from 'node:crypto';
import fs from 'node:fs';
import { nowIso, cleanString } from '../utils.js';
import { storeEntry } from '../store/entries.js';
import { addTriple } from '../knowledge-graph/kg.js';
import { checkDuplicate } from '../store/dedup.js';
import type {
  Adapter, EmbeddingService, ConversationTurn, ExtractedEntity, TripleDef,
  IngestOpts, IngestResult
} from '../types.js';
export { extractEntities } from './entity-extractor.js';

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
export async function checkAlreadyIngested(
  adapter: Adapter,
  filePath: string,
  fileHash: string
): Promise<ConversationSourceRow | null> {
  const row = await adapter.get<ConversationSourceRow>(
    'SELECT id, ingested_at, turn_count FROM conversation_sources WHERE file_path = ? AND file_hash = ?',
    [filePath, fileHash]
  );
  return row || null;
}

/**
 * Record an ingested source file.
 */
async function recordSource(
  adapter: Adapter,
  { filePath, fileHash, turnCount, memoryIds }: { filePath: string; fileHash: string; turnCount: number; memoryIds: string[] }
): Promise<{ id: string; ingested_at: string }> {
  const id = `src_${crypto.randomUUID()}`;
  const now = nowIso();
  await adapter.run(
    `INSERT OR IGNORE INTO conversation_sources (id, file_path, file_hash, turn_count, memory_ids_json, ingested_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, filePath, fileHash, turnCount, JSON.stringify(memoryIds), now]
  );
  return { id, ingested_at: now };
}

// --- Markdown parsing ---

const ROLE_PATTERNS: RegExp[] = [
  /^##\s+(user|assistant|system|human|ai)\s*$/i,
  /^\*\*(user|assistant|system|human|ai)\s*:\*\*/i,
  /^(user|assistant|system|human|ai)\s*:\s*/i
];

function normalizeRole(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'human') return 'user';
  if (lower === 'ai') return 'assistant';
  return lower;
}

/**
 * Parse a Markdown conversation into turns.
 * Supports: ## Role, **Role:**, Role: prefixes.
 * Returns [{role, content, index}].
 */
export function parseMarkdownConversation(text: string): ConversationTurn[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const turns: ConversationTurn[] = [];
  let currentRole: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of ROLE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        if (currentRole && currentLines.length > 0) {
          const content = currentLines.join('\n').trim();
          if (content) {
            turns.push({ role: normalizeRole(currentRole), content, index: turns.length });
          }
        }
        currentRole = match[1];
        currentLines = [];
        // For inline content after "Role: text", capture remainder
        const remainder = line.replace(pattern, '').trim();
        if (remainder) currentLines.push(remainder);
        matched = true;
        break;
      }
    }
    if (!matched && currentRole) {
      currentLines.push(line);
    }
  }

  // Flush last turn
  if (currentRole && currentLines.length > 0) {
    const content = currentLines.join('\n').trim();
    if (content) {
      turns.push({ role: normalizeRole(currentRole), content, index: turns.length });
    }
  }

  return turns;
}

// --- JSON parsing ---

/**
 * Parse a JSON conversation (array of {role, content, timestamp?}).
 * Returns [{role, content, timestamp, index}].
 */
export function parseJsonConversation(data: unknown): ConversationTurn[] {
  if (!data) return [];
  let arr: unknown[] | null = null;
  if (typeof data === 'string') {
    try {
      arr = JSON.parse(data) as unknown[];
    } catch {
      return [];
    }
  } else if (Array.isArray(data)) {
    arr = data;
  }
  if (!Array.isArray(arr)) return [];

  const turns: ConversationTurn[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const role = cleanString(item.role as string, 50);
    const content = cleanString(item.content as string, 50000);
    if (!role || !content) continue;
    turns.push({
      role: normalizeRole(role),
      content,
      timestamp: (item.timestamp as string) || null,
      index: turns.length
    });
  }
  return turns;
}

// Entity extraction moved to ./entity-extractor.ts to break circular dependency
// Re-exported above via: export { extractEntities } from './entity-extractor.js';
import { extractEntities } from './entity-extractor.js';

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

      // Entity extraction
      const entities = extractEntities(turn.content);
      results.entities_extracted! += entities.length;

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
