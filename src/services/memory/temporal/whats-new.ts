/**
 * Temporal awareness: "What's New" cross-session delta query.
 *
 * Returns new memories, KG triples, changed files, and recent commits
 * since a given timestamp or last session.
 */

import type {
  Adapter,
  WhatsNewInput,
  WhatsNewResult,
  WhatsNewMemoryItem,
  WhatsNewTripleItem,
  WhatsNewCommitItem
} from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO timestamp as short date for summaries. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/** Check whether a string looks like an ISO 8601 timestamp. */
function isIsoTimestamp(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s);
}

const EPOCH = '1970-01-01T00:00:00Z';

// ---------------------------------------------------------------------------
// resolveLastSession
// ---------------------------------------------------------------------------

/**
 * Resolve the most recent `created_at` for the given agent + project scope.
 * Returns epoch if nothing matches.
 */
export async function resolveLastSession(
  adapter: Adapter,
  agentId?: string | null,
  projectPath?: string | null
): Promise<string> {
  const row = await adapter.get<{ last_ts: string | null }>(
    `SELECT MAX(created_at) AS last_ts
       FROM memory_entries
      WHERE (agent_id = ? OR ? IS NULL OR ? = '')
        AND (scope_project_path = ? OR ? IS NULL OR ? = '')`,
    [
      agentId ?? null, agentId ?? null, agentId ?? null,
      projectPath ?? null, projectPath ?? null, projectPath ?? null
    ]
  );
  return row?.last_ts || EPOCH;
}

// ---------------------------------------------------------------------------
// Sub-queries
// ---------------------------------------------------------------------------

async function queryNewMemories(
  adapter: Adapter,
  since: string,
  agentId: string | null,
  projectPath: string | null,
  limit: number
): Promise<{ count: number; items: WhatsNewMemoryItem[] }> {
  const whereClause = `WHERE created_at > ?
        AND (agent_id = ? OR ? IS NULL)
        AND (scope_project_path = ? OR ? IS NULL)`;
  const params = [since, agentId, agentId, projectPath, projectPath];

  const countRow = await adapter.get<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM memory_entries ${whereClause}`,
    params
  );
  const count = countRow?.cnt ?? 0;

  const items = await adapter.all<WhatsNewMemoryItem>(
    `SELECT id, title, kind, created_at FROM memory_entries
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, limit]
  );

  return { count, items };
}

async function queryNewTriples(
  adapter: Adapter,
  since: string,
  limit: number
): Promise<{ count: number; items: WhatsNewTripleItem[] }> {
  const countRow = await adapter.get<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM kg_triples WHERE created_at > ?`,
    [since]
  );
  const count = countRow?.cnt ?? 0;

  const items = await adapter.all<WhatsNewTripleItem>(
    `SELECT t.id, s.name AS subject_name, t.predicate, o.name AS object_name, t.created_at
       FROM kg_triples t
       JOIN kg_entities s ON s.id = t.subject_id
       JOIN kg_entities o ON o.id = t.object_id
      WHERE t.created_at > ?
      ORDER BY t.created_at DESC
      LIMIT ?`,
    [since, limit]
  );

  return { count, items };
}

async function queryFilesChanged(
  adapter: Adapter,
  since: string,
  agentId: string | null,
  projectPath: string | null,
  limit: number
): Promise<{ count: number; paths: string[] }> {
  const rows = await adapter.all<{ links_json: string }>(
    `SELECT DISTINCT links_json FROM memory_entries
      WHERE created_at > ?
        AND links_json != '[]'
        AND (agent_id = ? OR ? IS NULL)
        AND (scope_project_path = ? OR ? IS NULL)`,
    [since, agentId, agentId, projectPath, projectPath]
  );

  const pathSet = new Set<string>();
  for (const row of rows) {
    try {
      const links: Array<{ path?: string }> = JSON.parse(row.links_json);
      for (const link of links) {
        if (link.path) pathSet.add(link.path);
      }
    } catch {
      // skip malformed JSON
    }
  }

  const allPaths = Array.from(pathSet);
  return {
    count: allPaths.length,
    paths: allPaths.slice(0, limit)
  };
}

async function queryRecentCommits(
  adapter: Adapter,
  since: string,
  projectPath: string | null,
  limit: number
): Promise<{ count: number; items: WhatsNewCommitItem[] }> {
  const countRow = await adapter.get<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM memory_events
      WHERE created_at > ?
        AND event_type IN ('commit', 'pr_merge', 'deploy', 'release')
        AND (scope_project_path = ? OR ? IS NULL)`,
    [since, projectPath, projectPath]
  );
  const count = countRow?.cnt ?? 0;

  const items = await adapter.all<WhatsNewCommitItem>(
    `SELECT id, title, event_type, created_at FROM memory_events
      WHERE created_at > ?
        AND event_type IN ('commit', 'pr_merge', 'deploy', 'release')
        AND (scope_project_path = ? OR ? IS NULL)
      ORDER BY created_at DESC
      LIMIT ?`,
    [since, projectPath, projectPath, limit]
  );

  return { count, items };
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(
  memoriesCount: number,
  triplesCount: number,
  filesCount: number,
  commitsCount: number,
  sinceShort: string
): string {
  if (memoriesCount === 0 && triplesCount === 0 && filesCount === 0 && commitsCount === 0) {
    return `No changes since ${sinceShort}`;
  }

  const parts: string[] = [];
  if (memoriesCount > 0) parts.push(`${memoriesCount} new memories`);
  if (triplesCount > 0) parts.push(`${triplesCount} new triples`);
  if (filesCount > 0) parts.push(`${filesCount} files changed`);
  if (commitsCount > 0) parts.push(`${commitsCount} commits`);

  let summary = parts.join(', ') + ` since ${sinceShort}`;
  if (summary.length > 200) {
    summary = summary.slice(0, 197) + '...';
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Cross-session delta query: returns new memories, KG triples, file changes,
 * and recent commits since a given timestamp or last session.
 */
export async function whatsNew(
  adapter: Adapter,
  input: WhatsNewInput
): Promise<WhatsNewResult> {
  const { since: sinceRaw, agentId, projectPath, limit: rawLimit } = input;
  const limit = rawLimit ?? 10;
  const agentParam = agentId || null;
  const projectParam = projectPath || null;

  // Resolve since
  let resolvedSince: string;
  let resolvedFrom: 'timestamp' | 'last_session' | 'epoch';

  if (sinceRaw === 'last_session') {
    resolvedSince = await resolveLastSession(adapter, agentParam, projectParam);
    resolvedFrom = resolvedSince === EPOCH ? 'epoch' : 'last_session';
  } else if (isIsoTimestamp(sinceRaw)) {
    resolvedSince = sinceRaw;
    resolvedFrom = 'timestamp';
  } else {
    // Fallback: treat as epoch
    resolvedSince = EPOCH;
    resolvedFrom = 'epoch';
  }

  // Run all sub-queries
  const [newMemories, newTriples, filesChanged, recentCommits] = await Promise.all([
    queryNewMemories(adapter, resolvedSince, agentParam, projectParam, limit),
    queryNewTriples(adapter, resolvedSince, limit),
    queryFilesChanged(adapter, resolvedSince, agentParam, projectParam, limit),
    queryRecentCommits(adapter, resolvedSince, projectParam, limit)
  ]);

  const summary = buildSummary(
    newMemories.count,
    newTriples.count,
    filesChanged.count,
    recentCommits.count,
    shortDate(resolvedSince)
  );

  return {
    since: resolvedSince,
    resolved_from: resolvedFrom,
    new_memories: newMemories,
    new_triples: newTriples,
    files_changed: filesChanged,
    recent_commits: recentCommits,
    summary
  };
}
