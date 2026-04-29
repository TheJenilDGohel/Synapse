import type { Adapter } from '../types/index.js';
import * as crypto from 'node:crypto';

export interface ConversationSourceRow {
  id: string;
  ingested_at: string;
  turn_count: number;
}

function nowIso(): string {
  return new Date().toISOString();
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
export async function recordSource(
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
