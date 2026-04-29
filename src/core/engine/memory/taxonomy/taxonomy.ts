import type {
  Adapter,
  NestListItem,
  BranchListItem,
  TaxonomyNest,
  TaxonomyTree,
  BranchManageInput,
  BranchManageResult,
  StaleBranchListItem
} from '../types/index.js';

export async function listNests(adapter: Adapter): Promise<{ nests: NestListItem[] }> {
  const rows = await adapter.all<NestListItem>(
    `SELECT nest, COUNT(*) AS count
       FROM memory_entries
      WHERE status = 'active' AND nest != ''
      GROUP BY nest
      ORDER BY count DESC, nest ASC`
  );
  return {
    nests: rows.map(r => ({ nest: r.nest, count: r.count }))
  };
}

export async function listBranches(adapter: Adapter, nest: string): Promise<{ nest: string; branches: BranchListItem[] }> {
  if (!nest) throw new Error('nest parameter is required');
  const rows = await adapter.all<BranchListItem>(
    `SELECT branch,
            COUNT(*) AS count,
            MAX(COALESCE(last_recalled_at, updated_at, created_at)) AS last_used_at
       FROM memory_entries
      WHERE status = 'active' AND nest = ? AND branch != ''
      GROUP BY branch
      ORDER BY count DESC, branch ASC`,
    [nest]
  );
  return {
    nest,
    branches: rows.map(r => ({
      branch: r.branch,
      count: r.count,
      last_used_at: r.last_used_at ?? null,
      days_since_last_used: toDaysSince(r.last_used_at)
    }))
  };
}

interface TaxonomyRow {
  nest: string;
  branch: string;
  count: number;
}

export async function getTaxonomyTree(adapter: Adapter): Promise<TaxonomyTree> {
  const rows = await adapter.all<TaxonomyRow>(
    `SELECT COALESCE(NULLIF(nest, ''), '(default)') AS nest,
            COALESCE(NULLIF(branch, ''), '(default)') AS branch,
            COUNT(*) AS count
       FROM memory_entries
      WHERE status = 'active'
      GROUP BY 1, 2
      ORDER BY 1 ASC, count DESC, 2 ASC`
  );

  const nestMap = new Map<string, TaxonomyNest>();
  for (const row of rows) {
    if (!nestMap.has(row.nest)) {
      nestMap.set(row.nest, { nest: row.nest, count: 0, branches: [] });
    }
    const entry = nestMap.get(row.nest)!;
    entry.count += row.count;
    if (row.branch && row.branch !== '') {
      entry.branches.push({ branch: row.branch, count: row.count });
    }
  }

  const kgEntityCount = await adapter.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kg_entities'
  );
  const kgTripleCount = await adapter.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kg_triples WHERE valid_to IS NULL'
  );

  const nests = Array.from(nestMap.values());
  return {
    total_nests: nests.length,
    total_branches: nests.reduce((sum, n) => sum + n.branches.length, 0),
    total_memories: nests.reduce((sum, n) => sum + n.count, 0),
    total_kg_entities: kgEntityCount?.count ?? 0,
    total_kg_triples: kgTripleCount?.count ?? 0,
    nests
  };
}

function toDaysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
}

async function assertNestExists(adapter: Adapter, nest: string): Promise<void> {
  const row = await adapter.get<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM memory_entries
      WHERE status = 'active' AND nest = ?`,
    [nest]
  );
  if (!row?.count) throw new Error(`nest '${nest}' not found`);
}

async function countBranch(adapter: Adapter, nest: string, branch: string): Promise<number> {
  const row = await adapter.get<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM memory_entries
      WHERE status = 'active' AND nest = ? AND branch = ?`,
    [nest, branch]
  );
  return row?.count ?? 0;
}

async function listStaleBranches(adapter: Adapter, nest: string, olderThanDays: number): Promise<StaleBranchListItem[]> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const rows = await adapter.all<StaleBranchListItem>(
    `SELECT branch,
            COUNT(*) AS count,
            MAX(COALESCE(last_recalled_at, updated_at, created_at)) AS last_used_at
       FROM memory_entries
      WHERE status = 'active'
        AND nest = ?
        AND branch != ''
      GROUP BY branch
      HAVING last_used_at < ?
      ORDER BY last_used_at ASC, count ASC, branch ASC`,
    [nest, cutoff]
  );
  return rows.map((row) => ({
    branch: row.branch,
    count: row.count,
    last_used_at: row.last_used_at ?? null,
    days_since_last_used: toDaysSince(row.last_used_at)
  }));
}

export async function manageBranches(adapter: Adapter, input: BranchManageInput): Promise<BranchManageResult> {
  const action = input.action;
  const nest = String(input.nest || '').trim();
  if (!nest) throw new Error('nest is required');

  await assertNestExists(adapter, nest);

  if (action === 'list_stale') {
    const olderThanDays = Math.max(1, Math.floor(Number(input.olderThanDays) || 30));
    const items = await listStaleBranches(adapter, nest, olderThanDays);
    return {
      action,
      nest,
      older_than_days: olderThanDays,
      count: items.length,
      items,
      message: items.length
        ? `Found ${items.length} stale branch(es) in nest '${nest}' older than ${olderThanDays} day(s)`
        : `No stale branches found in nest '${nest}' older than ${olderThanDays} day(s)`
    };
  }

  if (action === 'delete') {
    const branch = String(input.branch || '').trim();
    if (!branch) throw new Error('branch is required for delete');
    const deletedCount = await countBranch(adapter, nest, branch);
    if (!deletedCount) throw new Error(`branch '${branch}' not found in nest '${nest}'`);
    await adapter.run(
      `UPDATE memory_entries
          SET branch = ''
        WHERE status = 'active' AND nest = ? AND branch = ?`,
      [nest, branch]
    );
    return {
      action,
      nest,
      branch,
      deleted_count: deletedCount,
      message: `Cleared branch '${branch}' from ${deletedCount} memory item(s) in nest '${nest}'`
    };
  }

  const fromBranch = String(input.fromBranch || '').trim();
  const toBranch = String(input.toBranch || '').trim();
  if (!fromBranch) throw new Error('from_branch is required');
  if (!toBranch) throw new Error('to_branch is required');
  if (fromBranch === toBranch) throw new Error('from_branch and to_branch must differ');

  const movedCount = await countBranch(adapter, nest, fromBranch);
  if (!movedCount) throw new Error(`branch '${fromBranch}' not found in nest '${nest}'`);
  const targetExistingCount = await countBranch(adapter, nest, toBranch);

  await adapter.run(
    `UPDATE memory_entries
        SET branch = ?
      WHERE status = 'active' AND nest = ? AND branch = ?`,
    [toBranch, nest, fromBranch]
  );

  return {
    action,
    nest,
    from_branch: fromBranch,
    to_branch: toBranch,
    moved_count: movedCount,
    target_existing_count: targetExistingCount,
    message: action === 'merge'
      ? `Merged ${movedCount} memory item(s) from '${fromBranch}' into '${toBranch}' in nest '${nest}'`
      : `Renamed branch '${fromBranch}' to '${toBranch}' for ${movedCount} memory item(s) in nest '${nest}'`
  };
}
