import { clampInt } from '../utils.js';
import type { Adapter, ListEventsResult, EventListItem } from '../types.js';

interface ListEventsOpts {
  limit?: number;
  offset?: number;
  projectPath?: string;
}

interface EventRow {
  id: number;
  event_type: string;
  title: string;
  summary: string;
  status: string;
  signal_score: number;
  promoted_memory_id: string | null;
  scope_project_path: string;
  topic: string;
  feature: string;
  tags_json: string;
  source_ref: string;
  created_at: string;
}

export async function listEvents(adapter: Adapter, { limit = 20, offset = 0, projectPath }: ListEventsOpts = {}): Promise<ListEventsResult> {
  const filters: string[] = [];
  const params: unknown[] = [];
  if (projectPath) {
    filters.push('scope_project_path = ?');
    params.push(projectPath);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countRow = await adapter.get<{ c: number }>(`SELECT COUNT(*) AS c FROM memory_events ${where}`, params);
  const safeLimit = clampInt(limit, 20, 1, 200);
  const safeOffset = clampInt(offset, 0, 0, 100000);
  const rows = await adapter.all<EventRow>(
    `SELECT id, event_type, title, summary, status, signal_score, promoted_memory_id,
            scope_project_path, topic, feature, tags_json, source_ref, created_at
       FROM memory_events
       ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );
  return {
    total_count: countRow?.c || 0,
    count: rows.length,
    limit: safeLimit,
    offset: safeOffset,
    has_more: safeOffset + rows.length < (countRow?.c || 0),
    next_offset: safeOffset + rows.length < (countRow?.c || 0) ? safeOffset + rows.length : null,
    items: rows.map((row): EventListItem => ({
      id: row.id,
      event_type: row.event_type,
      title: row.title,
      summary: row.summary,
      status: row.status,
      signal_score: row.signal_score,
      promoted_memory_id: row.promoted_memory_id,
      scope_project_path: row.scope_project_path,
      topic: row.topic,
      feature: row.feature,
      tags: JSON.parse(row.tags_json || '[]'),
      source_ref: row.source_ref,
      created_at: row.created_at
    }))
  };
}
