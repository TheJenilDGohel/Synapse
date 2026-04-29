import { z } from 'zod';
import { IDEMPOTENT_WRITE_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import { BATCH_RESULT_SCHEMA } from '../common/schemas.js';

interface MemoryService {
  scanAndBackfillProjects(opts: Record<string, unknown>): Promise<unknown>;
}

export interface RegisterBackfillToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  memory: MemoryService;
}

export function registerBackfillTools({
  registerJsonTool,
  memory
}: RegisterBackfillToolsOptions): void {
  registerJsonTool(
    ['synapse_project_backfill'],
    {
      title: 'Project Backfill',
      description: 'Scan a directory for projects and create seed memory entries for those with zero existing memories. Detects package.json, Cargo.toml, go.mod, pyproject.toml, pom.xml, build.gradle, and .git. Use dry_run=true to preview without writing.',
      inputSchema: {
        root_path: z.string().min(1).max(1000),
        dry_run: z.boolean().default(false)
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: BATCH_RESULT_SCHEMA
    },
    async ({ root_path, dry_run }: Record<string, unknown>) =>
      memory.scanAndBackfillProjects({ rootPath: root_path, dryRun: dry_run })
  );
}
