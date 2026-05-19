interface VectorIndex {
  checkStaleness(): Promise<{ stale: boolean; stale_count: number; total_indexed: number }>;
  indexProject(opts: { allRoots: boolean; force: boolean }): Promise<unknown>;
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
        `[synapse-sweep] index stale (${staleness.stale_count}/${staleness.total_indexed} files changed) — re-indexing\n`
      );
      await vectorIndex.indexProject({ allRoots: true, force: false });
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
