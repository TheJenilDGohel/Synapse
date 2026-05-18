import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

test('E2E Live Usage: MCP Server initializes and responds', async () => {
  const binPath = resolve(process.cwd(), 'bin/loci.cjs');

  const serverProcess = spawn('node', [binPath, 'start'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return new Promise<void>((resolvePromise, rejectPromise) => {
    let outputData = '';
    let hasResolved = false;

    // Timeout in case the server hangs or doesn't respond
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        serverProcess.kill();
        rejectPromise(new Error('Test timed out waiting for server response. Output received: ' + outputData));
      }
    }, 15000);

    const cleanup = () => {
      hasResolved = true;
      clearTimeout(timeout);
      serverProcess.kill();
    };

    serverProcess.stderr.on('data', (data) => {
      // MCP servers often log diagnostics to stderr
      console.log(`[Server Stderr]: ${data.toString()}`);
    });

    serverProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      outputData += chunk;
      console.log(`[Server Stdout]: ${chunk}`);

      // Look for the JSON-RPC response to our initialize request
      if (chunk.includes('"jsonrpc":"2.0"') && chunk.includes('"id":1')) {
        try {
          // It might send multiple lines or partial chunks, so we could parse it,
          // but just finding the success response to init is good enough for a basic E2E.
          assert.match(outputData, /"protocolVersion"/);
          assert.match(outputData, /"serverInfo"/);
          cleanup();
          resolvePromise();
        } catch (err) {
          cleanup();
          rejectPromise(err);
        }
      }
    });

    serverProcess.on('error', (err) => {
      cleanup();
      rejectPromise(err);
    });

    serverProcess.on('exit', (code) => {
      if (!hasResolved) {
        cleanup();
        rejectPromise(new Error(`Server exited unexpectedly with code ${code}`));
      }
    });

    // Send an initialize request to the MCP server
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'E2E-Test-Client',
          version: '2026.5.0',
        },
      },
    };

    const message = JSON.stringify(initRequest) + '\n';
    serverProcess.stdin.write(message);
  });
});

process.on('beforeExit', () => {
  process.exit(0);
});
