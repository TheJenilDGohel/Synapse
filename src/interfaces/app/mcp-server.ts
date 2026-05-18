#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  SERVER_NAME,
  SERVER_VERSION,
  applyConsolePolicy,
  buildRuntimeConfig,
  installRuntimeWarningFilter
} from '../../core/runtime/index.js';
import { buildRipgrepHelpMessage, startStalenessMonitor, startHealthMonitor } from '../mcp/index.js';
import { createServices } from './create-services.js';
import { registerAppTools } from './register-tools.js';

if (!process.env.DART_SUPPRESS_ANALYTICS) {
  process.env.DART_SUPPRESS_ANALYTICS = 'true';
}

installRuntimeWarningFilter();

export async function main(): Promise<void> {
  const runtime = buildRuntimeConfig(process.env);
  applyConsolePolicy(runtime.disableConsoleOutput);

  if (runtime.mcpMode !== 'stdio') {
    throw new Error('Unsupported MCP_MODE. Use MCP_MODE=stdio for MCP clients.');
  }

  const services = await createServices(runtime);
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  registerAppTools(server, runtime, services);

  if (!runtime.hasRipgrep) {
    process.stderr.write(
      `[loci] warning: ripgrep (rg) not found — search_code and search_hybrid ` +
      `will use slower JS fallback. ${buildRipgrepHelpMessage()}\n`
    );
  }

  startStalenessMonitor(services.vectorIndex as any, runtime.indexSweepIntervalMinutes);
  const { getLastReport: getLastHealthReport } = startHealthMonitor(
    services.vectorIndex as any,
    services.memory as any,
    runtime.healthMonitorIntervalMinutes
  );
  services.getLastHealthReport = getLastHealthReport;

  // StdioServerTransport adds listeners but does not resume stdin itself.
  process.stdin.resume();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  setInterval(() => {}, 60_000);
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  main().catch((error: unknown) => {
    console.error('[loci] fatal:', error);
    process.exit(1);
  });
}
