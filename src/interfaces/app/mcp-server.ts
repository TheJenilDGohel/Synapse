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

  // Intercept and format Zod validation errors to return clean business messages
  const originalValidateToolInput = (server as any).validateToolInput.bind(server);
  (server as any).validateToolInput = async function (tool: any, args: any, toolName: string) {
    try {
      return await originalValidateToolInput(tool, args, toolName);
    } catch (error: any) {
      if (error && error.message && error.message.includes('Input validation error:')) {
        let cleanMessage = error.message
          .replace(/^Input validation error:\s*/i, '')
          .replace(/Invalid arguments for tool \w+:\s*/i, '');
        
        let detail = cleanMessage;
        if (detail.toLowerCase().includes("required at 'action'")) {
          detail = "Missing required parameter 'action'. Supported actions are: 'files', 'code', 'hybrid', 'find'.";
        } else if (detail.toLowerCase().includes("required at 'query'")) {
          detail = "Missing required parameter 'query'.";
        } else {
          detail = detail
            .replace(/Required at '([^']+)'/g, "Missing required parameter '$1'")
            .replace(/Invalid enum value\. Expected '([^']+)', received '([^']+)' at '([^']+)'/g, "Invalid value '$2' for parameter '$3'. Expected one of: $1")
            .replace(/Expected string, received (\w+) at '([^']+)'/g, "Parameter '$2' must be a string (received $1)")
            .replace(/Expected boolean, received (\w+) at '([^']+)'/g, "Parameter '$2' must be a boolean (received $1)")
            .replace(/Expected number, received (\w+) at '([^']+)'/g, "Parameter '$2' must be a number (received $1)");
        }
        throw new Error(`Validation Error for tool '${toolName}': ${detail}`);
      }
      throw error;
    }
  };

  registerAppTools(server, runtime, services);

  if (!runtime.hasRipgrep) {
    process.stderr.write(
      `[synapse] warning: ripgrep (rg) not found — search_code and search_hybrid ` +
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
    console.error('[synapse] fatal:', error);
    process.exit(1);
  });
}
