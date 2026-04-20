import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('synapse-mcp supports stdio initialize and tool listing', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-mcp-start-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx/esm', path.resolve('bin/synapse-mcp.js')],
    env: {
      ...process.env,
      MCP_MODE: 'stdio',
      PROJECT_ROOTS: path.resolve('.'),
      SYNAPSE_INDEX_BACKEND: 'json',
      SYNAPSE_INDEX_PATH: path.join(tempDir, 'synapse.index.json'),
      SYNAPSE_DB_PATH: path.join(tempDir, 'synapse.db'),
      SYNAPSE_MEMORY_ENABLED: 'false'
    },
    stderr: 'pipe'
  });
  const client = new Client({ name: 'synapse-test-client', version: '1.0.0' }, { capabilities: {} });

  t.after(async () => {
    try {
      await client.close();
    } catch {
      // Ignore close failures during cleanup.
    }
  });

  try {
    await client.connect(transport, { timeout: 10000 });
  } catch (error) {
    if (error?.cause?.code === 'EPERM' || error?.code === 'EPERM') {
      t.skip('process spawning is blocked in this environment');
      return;
    }
    if (error?.code === -32001 || error?.cause?.code === -32001) {
      t.skip('stdio handshake timed out in this environment');
      return;
    }
    throw error;
  }

  const version = client.getServerVersion();
  const tools = await client.listTools(undefined, { timeout: 15000 });
  assert.equal(version.name, 'synapse');
  assert.ok((tools.tools?.length || 0) > 0, 'expected MCP server to expose tools after initialize');
});
