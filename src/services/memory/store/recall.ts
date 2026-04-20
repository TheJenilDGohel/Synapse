import {
  nowIso,
  clampInt,
  splitTerms,
  scoreTokenOverlap,
  textContainsAllTerms,
  normalizeRecallScore,
  scoreScopeMatch,
  deserializeEntry
} from '../utils.js';
import { extractEntities } from '../ingest/ingest.js';
import { normalizeEntityId } from '../knowledge-graph/kg.js';
import type { Adapter, MemoryEntryRow, RecallInput, RecallResult, RecallResultItem, MemoryEntry, RelatedFact } from '../types.js';

export async function recall(adapter: Adapter, {
  query,
  projectPath,
  topic,
  feature,
  branchName,
  rootPath,
  kind,
  nest,
  branch,
  agentId,
  actorId,
  tags,
  limit = 10
}: RecallInput): Promise<RecallResult> {
  const safeLimit = clampInt(limit, 10, 1, 50);
  const filters: string[] = ['status = ?'];
  const params: unknown[] = ['active'];

  if (agentId) {
    // Agent sees own memories + global memories (agent_id = '')
    filters.push("(agent_id = ? OR agent_id = '')");
    params.push(agentId);
  } else {
    // No agent specified -- only show global memories
    filters.push("agent_id = ''");
  }

  if (projectPath) {
    filters.push('(scope_project_path = ? OR scope_project_path = \'\')');
    params.push(projectPath);
  }
  if (topic) {
    filters.push('(topic = ? OR topic = \'\')');
    params.push(topic);
  }
  if (kind) {
    filters.push('kind = ?');
    params.push(kind);
  }
  if (nest) {
    filters.push('nest = ?');
    params.push(nest);
  }
  if (branch) {
    filters.push('branch = ?');
    params.push(branch);
  }
  if (actorId) {
    // ACTOR-03: exact-match filter — not a scope-broadening rule like agentId
    filters.push('actor_id = ?');
    params.push(actorId);
  }
  if (tags && tags.length > 0) {
    // Require ALL specified tags to be present (AND semantics)
    for (const tag of tags) {
      filters.push(
        `EXISTS (SELECT 1 FROM JSON_EACH(tags_json) WHERE JSON_EACH.value = ?)`
      );
      params.push(tag);
    }
  }

  const rows = await adapter.all<MemoryEntryRow>(
    `SELECT *
       FROM memory_entries
      WHERE ${filters.join(' AND ')}
      ORDER BY importance DESC, updated_at DESC
      LIMIT 500`,
    params
  );

  const terms = splitTerms(query);
  const ranked: Array<{ score: number; entry: MemoryEntry }> = rows
    .map((row) => {
      const searchTerms: string[] = JSON.parse(row.search_terms_json || '[]');
      const haystack = [
        row.title,
        row.summary,
        row.content,
        row.topic,
        row.feature,
        row.tags_json
      ].join('\n').toLowerCase();

      let score = row.importance / 100;
      score += scoreTokenOverlap(terms, searchTerms) * 6;
      for (const term of terms) {
        if (row.title.toLowerCase().includes(term)) score += 5;
        if (row.summary.toLowerCase().includes(term)) score += 3;
        if (row.content.toLowerCase().includes(term)) score += 1.5;
        if (haystack.includes(term)) score += 1;
      }
      if (terms.length > 1 && textContainsAllTerms(`${row.title} ${row.summary}`, terms)) score += 3;
      score += scoreScopeMatch(row, {
        root_path: rootPath,
        project_path: projectPath,
        branch_name: branchName,
        topic,
        feature,
        nest,
        branch
      });
      if (row.last_recalled_at) score += Math.min(row.recall_count || 0, 5) * 0.1;
      if (row.kind === 'preference') score += 0.25;
      if (row.kind === 'feedback') score += 2.0;

      // Feature 12: auto-decay based on age and recall frequency
      const ageDays = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recallFactor = Math.min(1, ((row.recall_count || 0) + 1) / 3);
      const recencyFactor = 1 / (1 + ageDays / 90);
      const decay = 0.3 + 0.7 * recallFactor * recencyFactor;
      score *= decay;

      return {
        score,
        entry: deserializeEntry(row)
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);

  // FUSE-04: Enrich top-N results with 1-hop KG neighbors
  const KG_ENRICH_LIMIT = 5;
  const MAX_FACTS_PER_ITEM = 10;

  for (let i = 0; i < Math.min(ranked.length, KG_ENRICH_LIMIT); i++) {
    try {
      const item = ranked[i];
      const entities = extractEntities(
        `${item.entry.title} ${item.entry.summary} ${item.entry.content}`
      );
      const facts: RelatedFact[] = [];
      const seenTriples = new Set<string>();

      for (const entity of entities.slice(0, 5)) {
        const entityId = normalizeEntityId(entity.name);
        if (!entityId) continue;

        const exists = await adapter.get<{ id: string }>(
          'SELECT id FROM kg_entities WHERE id = ?',
          [entityId]
        );
        if (!exists) continue;

        const triples = await adapter.all<{
          id: string; subject_id: string; predicate: string; object_id: string;
          subject_name: string; object_name: string;
        }>(
          `SELECT t.id, t.subject_id, t.predicate, t.object_id,
                  s.name AS subject_name, o.name AS object_name
             FROM kg_triples t
             JOIN kg_entities s ON s.id = t.subject_id
             JOIN kg_entities o ON o.id = t.object_id
            WHERE (t.subject_id = ? OR t.object_id = ?)
              AND t.valid_to IS NULL
            LIMIT 10`,
          [entityId, entityId]
        );

        for (const t of triples) {
          if (seenTriples.has(t.id)) continue;
          seenTriples.add(t.id);
          if (facts.length >= MAX_FACTS_PER_ITEM) break;

          const direction = t.subject_id === entityId ? 'outgoing' : 'incoming';
          facts.push({
            entity_id: entityId,
            entity_name: entity.name,
            predicate: t.predicate,
            related_entity_id: direction === 'outgoing' ? t.object_id : t.subject_id,
            related_entity_name: direction === 'outgoing' ? t.object_name : t.subject_name,
            direction
          });
        }

        if (facts.length >= MAX_FACTS_PER_ITEM) break;
      }

      (item as { related_facts?: RelatedFact[] }).related_facts = facts;
    } catch {
      // Non-blocking: KG enrichment failure does not break recall
    }
  }

  const recalledAt = nowIso();
  if (ranked.length > 0) {
    const ids = ranked.map((item) => item.entry.id);
    const placeholders = ids.map(() => '?').join(', ');
    await adapter.run(
      `UPDATE memory_entries
          SET last_recalled_at = ?, recall_count = recall_count + 1
        WHERE id IN (${placeholders})`,
      [recalledAt, ...ids]
    );
    for (const item of ranked) {
      item.entry.last_recalled_at = recalledAt;
      item.entry.recall_count += 1;
    }
  }

  return {
    query,
    count: ranked.length,
    items: ranked.map((item): RecallResultItem => ({
      score: Number(normalizeRecallScore(item.score).toFixed(3)),
      raw_score: Number(item.score.toFixed(3)),
      memory: item.entry,
      related_facts: (item as { related_facts?: RelatedFact[] }).related_facts || []
    }))
  };
}
