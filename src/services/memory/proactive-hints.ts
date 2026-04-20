/**
 * Proactive memory hints — surfaces high-importance memories linked to a
 * file path so agents receive context automatically on read or change.
 *
 * Non-blocking: callers should wrap in try/catch.
 */

import path from 'node:path';
import type { Adapter, ProactiveHint, ProactiveHintResult } from './types.js';

const IMPORTANCE_THRESHOLD = 70;
const MAX_HINTS = 5;
const SUMMARY_EXCERPT_LENGTH = 120;

interface HintRow {
  id: string;
  title: string;
  importance: number;
  kind: string;
  summary: string;
}

/**
 * Find memories with importance >= 70 that have a link matching
 * the given file path. Returns up to 5 hints, sorted by importance desc.
 *
 * Non-blocking: callers should wrap in try/catch.
 */
export async function getFileMemoryHints(
  adapter: Adapter,
  filePath: string,
  suggestUpdate: boolean = false
): Promise<ProactiveHintResult> {
  const normalizedPath = path.resolve(filePath);

  // Try exact match first, then normalized path
  let rows = await queryHintsByPath(adapter, filePath);
  if (rows.length === 0 && normalizedPath !== filePath) {
    rows = await queryHintsByPath(adapter, normalizedPath);
  }

  const hints: ProactiveHint[] = rows.map(row => ({
    memory_id: row.id,
    title: row.title,
    importance: row.importance,
    kind: row.kind,
    summary_excerpt: row.summary.length > SUMMARY_EXCERPT_LENGTH
      ? row.summary.slice(0, SUMMARY_EXCERPT_LENGTH) + '...'
      : row.summary,
    suggest_update: suggestUpdate
  }));

  return { file_path: filePath, hints };
}

async function queryHintsByPath(
  adapter: Adapter,
  filePath: string
): Promise<HintRow[]> {
  return adapter.all<HintRow>(
    `SELECT DISTINCT me.id, me.title, me.importance, me.kind, me.summary
       FROM memory_entries me, JSON_EACH(me.links_json) AS je
      WHERE me.importance >= ?
        AND me.status = 'active'
        AND JSON_EXTRACT(je.value, '$.path') = ?
      ORDER BY me.importance DESC
      LIMIT ?`,
    [IMPORTANCE_THRESHOLD, filePath, MAX_HINTS]
  );
}
