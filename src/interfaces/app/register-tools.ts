import {
  DEFAULT_MAX_READ_LINES,
  DEFAULT_MAX_RESULTS
} from '../../core/runtime/config.js';
import { SERVER_NAME, SERVER_VERSION } from '../../core/runtime/version.js';
import {
  RESPONSE_FORMAT_SCHEMA,
  MEMORY_KIND_SCHEMA,
  MEMORY_STATUS_SCHEMA,
  MEMORY_SCOPE_SCHEMA,
  MEMORY_LINK_SCHEMA,
  MEMORY_EVENT_TYPE_SCHEMA,
  MEMORY_EVENT_STATUS_SCHEMA,
  // Phase 40: output archetypes (consumed by Plan 02 per-tool assignments)
  SEARCH_RESULT_SCHEMA,
  TRIPLE_RESULT_SCHEMA,
  STATUS_RESULT_SCHEMA,
  BATCH_RESULT_SCHEMA,
  MEMORY_RESULT_SCHEMA,
  ACK_RESULT_SCHEMA,
  BUNDLE_RESULT_SCHEMA,
  FREEFORM_RESULT_SCHEMA
} from '../mcp/index.js';
import {
  createJsonToolRegistrar,
  paginateItems,
  createServerStatusBuilder,
  buildUsageGuide,
  registerCoreTools,
  registerMemoryWorkflowTools,
  registerMemoryTools,
  registerRetrievalTools,
  registerGraphTools,
  registerSymbolTools
} from '../mcp/index.js';
import { MemoryWorkflowService } from '../../core/engine/index.js';

export function registerAppTools(server: any, runtime: any, services: any): void {
  const registerJsonTool = createJsonToolRegistrar(server, RESPONSE_FORMAT_SCHEMA, runtime.synapseHome);
  const buildServerStatus = createServerStatusBuilder({
    serverName: SERVER_NAME,
    serverVersion: SERVER_VERSION,
    runtime,
    workspace: services.workspace,
    memory: services.memory,
    updates: services.updates,
    getActiveIndexBackend: services.getActiveIndexBackend,
    vectorIndex: services.vectorIndex
  });
  const memoryWorkflow = new MemoryWorkflowService({
    memory: services.memory,
    getRuntimeSummary: async () => buildServerStatus(),
    search: services.search,
    vectorIndex: services.vectorIndex
  });
  const sharedSchemas = {
    MEMORY_KIND_SCHEMA,
    MEMORY_STATUS_SCHEMA,
    MEMORY_SCOPE_SCHEMA,
    MEMORY_LINK_SCHEMA,
    MEMORY_EVENT_TYPE_SCHEMA,
    MEMORY_EVENT_STATUS_SCHEMA,
    // Phase 40: output archetypes (consumed by Plan 02 per-tool assignments)
    OUTPUT_SEARCH_RESULT_SCHEMA: SEARCH_RESULT_SCHEMA,
    OUTPUT_TRIPLE_RESULT_SCHEMA: TRIPLE_RESULT_SCHEMA,
    OUTPUT_STATUS_RESULT_SCHEMA: STATUS_RESULT_SCHEMA,
    OUTPUT_BATCH_RESULT_SCHEMA: BATCH_RESULT_SCHEMA,
    OUTPUT_MEMORY_RESULT_SCHEMA: MEMORY_RESULT_SCHEMA,
    OUTPUT_ACK_RESULT_SCHEMA: ACK_RESULT_SCHEMA,
    OUTPUT_BUNDLE_RESULT_SCHEMA: BUNDLE_RESULT_SCHEMA,
    OUTPUT_FREEFORM_RESULT_SCHEMA: FREEFORM_RESULT_SCHEMA
  };

  registerCoreTools({
    registerJsonTool,
    buildServerStatus,
    buildUsageGuide,
    updates: services.updates,
    getLastHealthReport: services.getLastHealthReport ?? (() => null),
    memory: services.memory,
    vectorIndex: services.vectorIndex,
    getMemoryAdapter: () => (services.memory as any).getAdapter?.() ?? null,
    memoryDbPath: runtime.memoryDbPath
  });

  registerMemoryWorkflowTools({
    registerJsonTool,
    schemas: sharedSchemas,
    memoryWorkflow
  });

  registerMemoryTools({
    registerJsonTool,
    schemas: sharedSchemas,
    memory: services.memory,
    memoryWorkflow
  });

  registerRetrievalTools({
    registerJsonTool,
    paginateItems,
    workspace: services.workspace,
    search: services.search,
    defaultMaxReadLines: DEFAULT_MAX_READ_LINES,
    defaultMaxResults: DEFAULT_MAX_RESULTS,
    memory: services.memory
  });

  registerGraphTools({
    registerJsonTool,
    schemas: sharedSchemas,
    memory: services.memory
  });

  registerSymbolTools({
    registerJsonTool,
    search: services.symbolSearch,
    coreSearch: services.search,
    defaultMaxResults: DEFAULT_MAX_RESULTS
  });
}
