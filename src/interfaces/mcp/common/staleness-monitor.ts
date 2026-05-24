interface VectorIndex {
  checkStaleness(): Promise<{ stale: boolean; stale_count: number; total_indexed: number; stale_files: string[]; deleted_files: string[] }>;
  indexFiles(opts: { paths: string[]; deleted_paths?: string[] }): Promise<unknown>;
}

type LogFn = (msg: string) => void;

export function startStalenessMonitor(
  vectorIndex: VectorIndex,
  intervalMinutes: number,
  log: LogFn = process.stderr.write.bind(process.stderr)
): ReturnType<typeof setInterval> | null {
  if (!intervalMinutes || intervalMinutes <= 0) return null;

  const intervalMs = intervalMinutes * 60 * 1000;
  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const staleness = await vectorIndex.checkStaleness();
      if (!staleness.stale) return;

      log(
        `[synapse-sweep] index stale (${staleness.stale_count}/${staleness.total_indexed} files changed) — re-indexing incrementally\n`
      );

      await vectorIndex.indexFiles({
        paths: staleness.stale_files,
        deleted_paths: staleness.deleted_files
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      log(`[synapse-sweep] error: ${error?.message || err}\n`);
    } finally {
      running = false;
    }
  }, intervalMs);

  timer.unref();
  return timer;
}
