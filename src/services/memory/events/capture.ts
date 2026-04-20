import {
  nowIso, cleanString, normalizeScope, deriveSummary, deriveTitle,
  ensureArray, normalizeLinks, stableJson
} from '../utils.js';
import {
  computeSignalScore,
  getPromotionThreshold,
  mergeText,
  findMergeCandidate
} from './heuristics.js';
import { checkDuplicate } from '../store/dedup.js';
import type {
  Adapter, EmbeddingService, CaptureEventInput, CaptureEventResult,
  StoreEntryInput, MemoryEntryWithRevisions, Link
} from '../types.js';
export { recall } from '../store/recall.js';
export { listEvents } from './list.js';

interface CaptureHelpers {
  storeEntry: (input: StoreEntryInput) => Promise<{ created: boolean; duplicate: boolean; memory: MemoryEntryWithRevisions | null }>;
  updateEntry: (id: string, patch: Record<string, unknown>) => Promise<MemoryEntryWithRevisions | null>;
  embeddingService: EmbeddingService | null;
}

export async function captureEvent(
  adapter: Adapter,
  input: CaptureEventInput,
  { storeEntry, updateEntry, embeddingService }: CaptureHelpers
): Promise<CaptureEventResult> {
  const scope = normalizeScope(input.scope);
  const eventType = cleanString(input.event_type || input.eventType || 'task', 60) || 'task';
  const rawContent = cleanString(input.content, 20000);
  const summary = deriveSummary(input.summary, rawContent);
  const content = rawContent || summary;
  const title = deriveTitle({
    title: input.title,
    summary,
    content,
    eventType,
    scope
  });
  const tags = ensureArray(input.tags);
  const links = normalizeLinks(input.links);
  const sourceRef = cleanString(input.source_ref || input.sourceRef, 1000);
  const createdAt = nowIso();
  const signalScore = computeSignalScore({
    eventType,
    status: input.status,
    importance: input.importance,
    filesChanged: input.files_changed || input.filesChanged,
    hasTests: input.has_tests || input.hasTests,
    tags,
    title,
    content,
    summary
  });
  const promotionThreshold = getPromotionThreshold({
    eventType,
    status: input.status,
    title,
    summary,
    content
  });

  if (!title) throw new Error('title is required');
  if (!content && !summary) throw new Error('content or summary is required');

  const record = {
    eventType,
    title,
    summary,
    content: content || summary,
    scope,
    tags,
    links,
    sourceRef,
    signalScore,
    status: signalScore >= promotionThreshold ? 'processed' : 'ignored'
  };

  let promotedMemoryId: string | null = null;
  if (signalScore >= promotionThreshold) {
    const dedupResult = await checkDuplicate(adapter, embeddingService, content || summary, {
      nest: input.nest,
      branch: input.branch,
      projectPath: scope.project_path
    });
    if (dedupResult.isDuplicate) {
      record.status = 'duplicate';
      promotedMemoryId = dedupResult.match!.id;
    }

    if (record.status !== 'duplicate') {
    const memoryKind = input.kind || (eventType === 'preference' ? 'preference' : 'knowledge');
    const mergeTarget = await findMergeCandidate(adapter, {
      kind: memoryKind,
      title,
      summary,
      content: content || summary,
      scope,
      tags
    });

    if (mergeTarget) {
      const merged = await updateEntry(mergeTarget.id, {
        summary: mergeText(mergeTarget.summary, summary),
        content: mergeText(mergeTarget.content, content || summary),
        tags: Array.from(new Set([...(mergeTarget.tags || []), ...tags])),
        links: Array.from(new Map(
          [...(mergeTarget.links || []), ...links].map((item: Link) => [`${item.path}:${item.line || 0}`, item])
        ).values()),
        importance: Math.max(
          mergeTarget.importance || 0,
          input.importance || 0,
          Math.min(95, Math.round(signalScore * 20))
        ),
        confidence: Math.max(
          mergeTarget.confidence || 0,
          input.confidence || 0,
          Math.min(0.95, 0.45 + (signalScore * 0.1))
        ),
        change_note: `Auto-captured merge from ${eventType} event`
      });
      promotedMemoryId = merged?.id || null;
      record.status = 'merged';
    } else {
      const result = await storeEntry({
        kind: memoryKind,
        title,
        summary,
        content: content || summary,
        status: input.memory_status || 'active',
        importance: input.importance === undefined ? Math.min(95, Math.round(signalScore * 20)) : input.importance,
        confidence: input.confidence === undefined ? Math.min(0.95, 0.45 + (signalScore * 0.1)) : input.confidence,
        tags,
        links,
        scope,
        nest: input.nest,
        branch: input.branch,
        source_type: 'capture-event',
        source_ref: sourceRef,
        change_note: `Auto-captured from ${eventType} event`
      });
      promotedMemoryId = result.memory?.id || null;
      record.status = result.duplicate ? 'duplicate' : 'promoted';
    }
    }
  }

  const insert = await adapter.run(
    `INSERT INTO memory_events(
      event_type, title, summary, content, status, signal_score, promoted_memory_id,
      scope_root_path, scope_project_path, scope_branch_name, topic, feature,
      tags_json, links_json, source_ref, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.eventType,
      record.title,
      record.summary,
      record.content,
      record.status,
      signalScore,
      promotedMemoryId,
      scope.root_path,
      scope.project_path,
      scope.branch_name,
      scope.topic,
      scope.feature,
      stableJson(tags),
      stableJson(links),
      sourceRef,
      createdAt
    ]
  );

  return {
    event_id: insert.lastInsertRowid,
    event_type: eventType,
    signal_score: Number(signalScore.toFixed(2)),
    promotion_threshold: Number(promotionThreshold.toFixed(2)),
    status: record.status,
    promoted_memory_id: promotedMemoryId
  };
}
