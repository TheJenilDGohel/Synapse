#!/usr/bin/env node
// Loci Post-Tool Hook for Claude Code
//
// Runs after tool calls to auto-capture outcomes into memory.
// Triggers on: Bash, Edit, Write, MultiEdit (tools that change things)
//
// How it works:
// 1. Reads tool result from stdin (Claude Code hook protocol)
// 2. Detects meaningful outcomes (file changes, commands run)
// 3. Calls `loci capture-outcome` CLI to save into memory
//
// The hook gracefully degrades: if loci CLI isn't on PATH or
// the MCP server isn't running, it outputs {} and exits cleanly.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const DEBOUNCE_FILE = path.join(os.tmpdir(), 'loci-post-hook-last.json');
const DEBOUNCE_MS = 60000; // 60s between captures
const LOCI_CLI = path.resolve(__dirname, '..', '..', 'bin', 'loci.cjs');

let input = '';
const stdinTimeout = setTimeout(() => {
  process.stdout.write('{}');
  process.exit(0);
}, 7000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};

    // Only capture on write/edit/bash
    if (!['Edit', 'Write', 'Bash', 'MultiEdit'].includes(toolName)) {
      process.stdout.write('{}');
      process.exit(0);
    }

    // Debounce — avoid hammering memory on rapid successive edits
    try {
      const last = JSON.parse(fs.readFileSync(DEBOUNCE_FILE, 'utf8'));
      if (Date.now() - last.ts < DEBOUNCE_MS) {
        process.stdout.write('{}');
        process.exit(0);
      }
    } catch { /* no debounce file or parse error — proceed */ }

    // Build summary from tool input. Use path.basename so the summary is
    // correct on Windows (where file_path uses back-slashes) and POSIX.
    const filePath = toolInput.file_path || '';
    const command = toolInput.command || '';
    const summary = filePath
      ? `Modified ${path.basename(filePath)}`
      : command
        ? `Ran: ${command.slice(0, 100)}`
        : `Used ${toolName}`;

    // Capture outcome into memory via CLI. Execution via process.execPath
    // securely invokes the CLI without a shell, avoiding command injection risks.
    const result = spawnSync(process.execPath, [LOCI_CLI, 'capture-outcome', '--json', '--task', summary, '--summary', summary], {
      encoding: 'utf8',
      timeout: 5000,
      shell: false,
      env: { ...process.env, LOCI_MEMORY_ENABLED: 'true' }
    });

    // Update debounce timestamp on success
    if (result.status === 0) {
      try { fs.writeFileSync(DEBOUNCE_FILE, JSON.stringify({ ts: Date.now() })); } catch { /* ignore */ }
    }

    process.stdout.write('{}');
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }
});
