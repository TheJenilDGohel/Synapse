import {
  cleanString,
  hasStrongMemorySignal,
  looksExploratory,
  computeMemorySimilarity,
  deserializeEntry
} from '../utils.js';
import type { Adapter, MemoryEntry, MemoryEntryRow, Scope, SignalScoreInput, PromotionThresholdInput, MergeCandidateInput } from '../types.js';

export function computeSignalScore({
  eventType,
  status,
  importance,
  filesChanged,
  hasTests,
  tags,
  title,
  content,
  summary
}: SignalScoreInput): number {
  let score = 0;
  const normalizedType = String(eventType || '').toLowerCase();
  const normalizedStatus = String(status || '').toLowerCase();
  const text = `${title || ''}\n${summary || ''}\n${content || ''}`.toLowerCase();

  if (['bugfix', 'decision', 'review', 'preference'].includes(normalizedType)) score += 2;
  if (['completed', 'resolved', 'merged'].includes(normalizedStatus)) score += 1.5;
  if (normalizedType === 'task' && ['completed', 'resolved', 'merged'].includes(normalizedStatus)) score += 0.75;
  if (Number.isFinite(Number(importance))) score += Math.min(2, Number(importance) / 50);
  if (Number.isFinite(Number(filesChanged)) && Number(filesChanged) > 0) score += Math.min(1.5, Number(filesChanged) * 0.2);
  if (hasTests) score += 0.75;
  if ((tags || []).length > 0) score += Math.min(1, (tags || []).length * 0.2);
  if (hasStrongMemorySignal(text)) score += 1;
  if (looksExploratory(text) && !hasStrongMemorySignal(text)) score -= 1.5;

  return Math.max(0, score);
}

export function getPromotionThreshold({ eventType, status, title, summary, content }: PromotionThresholdInput): number {
  const normalizedType = String(eventType || '').toLowerCase();
  const normalizedStatus = String(status || '').toLowerCase();
  const text = `${title || ''}\n${summary || ''}\n${content || ''}`.toLowerCase();

  let threshold = 3;
  if (['preference', 'decision'].includes(normalizedType)) threshold = 2.25;
  else if (['bugfix', 'review'].includes(normalizedType)) threshold = 2.5;
  else if (normalizedType === 'task' && ['completed', 'resolved', 'merged'].includes(normalizedStatus)) threshold = 2.75;

  if (looksExploratory(text) && !hasStrongMemorySignal(text)) {
    threshold += 0.75;
  }

  return threshold;
}

export function mergeText(existing: string, incoming: string): string {
  const base = cleanString(existing, 20000);
  const next = cleanString(incoming, 20000);
  if (!next) return base;
  if (!base) return next;
  if (base.includes(next)) return base;
  return `${base}\n\n${next}`.slice(0, 20000).trim();
}

export async function findMergeCandidate(
  adapter: Adapter,
  { kind, title, summary, content, scope, tags }: MergeCandidateInput
): Promise<MemoryEntry | null> {
  const candidates = await adapter.all<MemoryEntryRow>(
    `SELECT *
       FROM memory_entries
      WHERE status = 'active'
        AND kind = ?
        AND scope_project_path = ?
      ORDER BY updated_at DESC
      LIMIT 25`,
    [kind, scope.project_path]
  );

  const target = { title, summary, content, scope, tags };
  for (const row of candidates) {
    const similarity = computeMemorySimilarity(
      {
        title: row.title,
        summary: row.summary,
        content: row.content,
        scope: {
          root_path: row.scope_root_path,
          project_path: row.scope_project_path,
          branch_name: row.scope_branch_name,
          topic: row.topic,
          feature: row.feature
        },
        tags: JSON.parse(row.tags_json || '[]'),
        links: JSON.parse(row.links_json || '[]'),
        sourceRef: row.source_ref
      },
      target
    );

    if (similarity >= 0.5) {
      return deserializeEntry(row);
    }
  }

  return null;
}
