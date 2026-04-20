import fs from 'node:fs';

const WAL_CHECKPOINT_BYTES = 32 * 1024 * 1024;  // 32MB
const DB_WARN_BYTES = 512 * 1024 * 1024;         // 512MB

interface HealthReport {
  checked_at: string;
  issues: string[];
  warnings: string[];
  actions: string[];
  ok: boolean;
}

interface SqliteStatement {
  get(...params: unknown[]): Record<string, unknown> | undefined;
  run(...params: unknown[]): { changes: number };
}

interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

interface VectorIndexLike {
  db?: SqliteDb;
  dbPath?: string;
}

interface MemoryStoreLike {
  store?: {
    adapter?: {
      db?: SqliteDb;
    };
  };
}

type LogFn = (msg: string) => void;

function runIndexChecks(vectorIndex: VectorIndexLike | null | undefined, report: HealthReport): void {
  const db = vectorIndex?.db;
  if (!db) return;

  try {
    const walPath = `${vectorIndex.dbPath}-wal`;
    let walSize = 0;
    try { walSize = fs.statSync(walPath).size; } catch { /* no WAL file yet */ }
    if (walSize > WAL_CHECKPOINT_BYTES) {
      db.exec('PRAGMA wal_checkpoint(PASSIVE)');
      report.actions.push(`wal_checkpoint(${Math.round(walSize / 1024 / 1024)}MB)`);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.warnings.push(`wal_checkpoint: ${error?.message || err}`);
  }

  try {
    const row = db.prepare('PRAGMA quick_check').get() as { quick_check?: string } | undefined;
    if (row?.quick_check !== 'ok') {
      report.issues.push('index_db_integrity');
      report.warnings.push(`quick_check: ${row?.quick_check}`);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.issues.push('index_db_integrity');
    report.warnings.push(`quick_check failed: ${error?.message || err}`);
  }

  try {
    const result = db.prepare(
      'DELETE FROM chunks WHERE file_path NOT IN (SELECT path FROM files)'
    ).run();
    if (result.changes > 0) {
      report.actions.push(`orphan_chunks(${result.changes})`);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.warnings.push(`orphan_chunks: ${error?.message || err}`);
  }

  try {
    const result = db.prepare('DELETE FROM term_df WHERE df = 0').run();
    if (result.changes > 0) {
      report.actions.push(`term_df_prune(${result.changes})`);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.warnings.push(`term_df_prune: ${error?.message || err}`);
  }

  try {
    const stat = fs.statSync(vectorIndex.dbPath!);
    if (stat.size > DB_WARN_BYTES) {
      report.warnings.push(`index_db_large(${Math.round(stat.size / 1024 / 1024)}MB)`);
    }
  } catch { /* db may not be on disk yet */ }
}

function runMemoryChecks(memory: MemoryStoreLike | null | undefined, report: HealthReport): void {
  const db = memory?.store?.adapter?.db;
  if (!db) return;

  try {
    const row = db.prepare('PRAGMA quick_check').get() as { quick_check?: string } | undefined;
    if (row?.quick_check !== 'ok') {
      report.issues.push('memory_db_integrity');
      report.warnings.push(`memory quick_check: ${row?.quick_check}`);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.issues.push('memory_db_integrity');
    report.warnings.push(`memory quick_check: ${error?.message || err}`);
  }

  // Prune ignored events older than 30 days
  try {
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const r = db.prepare(
      "DELETE FROM memory_events WHERE status = 'ignored' AND created_at < ?"
    ).run(cutoff30);
    if (r.changes > 0) report.actions.push(`ignored_events_pruned(${r.changes})`);
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.warnings.push(`ignored_event_prune: ${error?.message || err}`);
  }

  // Prune all events older than 365 days
  try {
    const cutoff365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const r = db.prepare('DELETE FROM memory_events WHERE created_at < ?').run(cutoff365);
    if (r.changes > 0) report.actions.push(`old_events_pruned(${r.changes})`);
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.warnings.push(`old_event_prune: ${error?.message || err}`);
  }

  // Cap revision history to 50 per memory entry
  try {
    const r = db.prepare(`
      DELETE FROM memory_revisions
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY memory_id ORDER BY revision DESC) AS rn
          FROM memory_revisions
        ) WHERE rn > 50
      )
    `).run();
    if (r.changes > 0) report.actions.push(`old_revisions_pruned(${r.changes})`);
  } catch (err: unknown) {
    const error = err as { message?: string };
    report.warnings.push(`revision_prune: ${error?.message || err}`);
  }
}

export interface HealthMonitorResult {
  timer: ReturnType<typeof setInterval> | null;
  getLastReport: () => HealthReport | null;
}

export function startHealthMonitor(
  vectorIndex: VectorIndexLike | null | undefined,
  memory: MemoryStoreLike | null | undefined,
  intervalMinutes: number,
  log: LogFn = process.stderr.write.bind(process.stderr)
): HealthMonitorResult {
  let lastReport: HealthReport | null = null;

  if (!intervalMinutes || intervalMinutes <= 0) {
    return { timer: null, getLastReport: () => lastReport };
  }

  let running = false;
  const intervalMs = intervalMinutes * 60 * 1000;

  const timer = setInterval(() => {
    if (running) return;
    running = true;

    const report: HealthReport = {
      checked_at: new Date().toISOString(),
      issues: [],
      warnings: [],
      actions: [],
      ok: true
    };

    try {
      runIndexChecks(vectorIndex, report);
      runMemoryChecks(memory, report);
      report.ok = report.issues.length === 0;

      if (report.actions.length > 0 || report.issues.length > 0) {
        log(
          `[synapse-health] ${report.ok ? 'ok' : 'degraded'}` +
          (report.issues.length ? ` issues=[${report.issues.join(',')}]` : '') +
          (report.actions.length ? ` actions=[${report.actions.join(',')}]` : '') +
          '\n'
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      report.issues.push('monitor_error');
      report.warnings.push(error?.message || String(err));
      report.ok = false;
      log(`[synapse-health] error: ${error?.message || err}\n`);
    } finally {
      running = false;
      lastReport = report;
    }
  }, intervalMs);

  timer.unref();
  return { timer, getLastReport: () => lastReport };
}
