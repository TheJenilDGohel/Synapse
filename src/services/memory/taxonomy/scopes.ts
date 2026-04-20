import crypto from 'node:crypto';
import { nowIso, cleanString, clampInt } from '../utils.js';
import type { Adapter, DiaryEntry, WriteDiaryInput, ReadDiaryInput, ReadDiaryResult } from '../types.js';

/**
 * Write a private diary entry for an agent.
 * Diary entries are isolated -- only the owning agent can read them.
 */
export async function writeDiaryEntry(adapter: Adapter, { agentId, content, topic }: WriteDiaryInput): Promise<DiaryEntry> {
  if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
    throw new Error('agent_id is required for diary entries');
  }
  const cleanContent = cleanString(content, 20000);
  if (!cleanContent) {
    throw new Error('content is required for diary entries');
  }

  const id = `diary_${crypto.randomUUID().replace(/-/g, '')}`;
  const cleanTopic = cleanString(topic, 200);
  const createdAt = nowIso();

  await adapter.run(
    `INSERT INTO agent_diary (id, agent_id, content, topic, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, agentId.trim(), cleanContent, cleanTopic, createdAt]
  );

  return {
    id,
    agent_id: agentId.trim(),
    content: cleanContent,
    topic: cleanTopic,
    created_at: createdAt
  };
}

/**
 * Read recent diary entries for a specific agent.
 * Only returns entries belonging to the requesting agent.
 */
export async function readDiaryEntries(adapter: Adapter, { agentId, topic, limit = 20, offset = 0 }: ReadDiaryInput): Promise<ReadDiaryResult> {
  if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
    throw new Error('agent_id is required to read diary entries');
  }

  const safeLimit = clampInt(limit, 20, 1, 100);
  const safeOffset = clampInt(offset, 0, 0, 100000);

  const filters: string[] = ['agent_id = ?'];
  const params: unknown[] = [agentId.trim()];

  if (topic) {
    filters.push('topic = ?');
    params.push(cleanString(topic, 200));
  }

  const where = filters.join(' AND ');

  const countRow = await adapter.get<{ c: number }>(
    `SELECT COUNT(*) AS c FROM agent_diary WHERE ${where}`,
    params
  );

  const rows = await adapter.all<DiaryEntry>(
    `SELECT id, agent_id, content, topic, created_at
       FROM agent_diary
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );

  const total = countRow?.c || 0;

  return {
    agent_id: agentId.trim(),
    total_count: total,
    count: rows.length,
    limit: safeLimit,
    offset: safeOffset,
    has_more: safeOffset + rows.length < total,
    items: rows
  };
}
