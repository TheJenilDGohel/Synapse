import { READ_ONLY_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import { BUNDLE_RESULT_SCHEMA } from '../common/schemas.js';

import { IMemoryService } from '../../../core/interfaces/services.js';

export interface RegisterAuditToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  memory: IMemoryService;
}

export function registerAuditTools({
  registerJsonTool,
  memory
}: RegisterAuditToolsOptions): void {
  registerJsonTool(
    'synapse_audit',
    {
      title: 'Audit',
      description:
        'Run a comprehensive self-audit of Synapse health. Returns memory coverage by project, ' +
        'KG density metrics (entities, triples, orphans, duplicates, connected components), ' +
        'unpopulated nests, broken bridges, stale memories, a 0-100 health score, and actionable suggestions. ' +
        'Call once to get a full integrity dashboard.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async () => memory.audit()
  );
}
