#!/usr/bin/env node
// Synapse Pre-Tool Hook for Claude Code
//
// Runs before tool calls to:
//   1. Enforce session-scoped "agent_prime first" SOP via a marker file
//   2. Inject relevant memory context after the session has been primed
//
// Triggers on: Edit, Write, Bash, MultiEdit, Read, Grep, mcp__synapse__*
//
// How it works:
// 1. Reads tool call info from stdin (Claude Code hook protocol)
// 2. If the tool is synapse_agent_prime → write the session marker, exit
// 3. If the tool is a substantive work tool AND the session marker is missing
//    → emit a STRONG, sticky reminder demanding agent_prime be called
// 4. Otherwise, fall back to debounced memory recall and append it as soft
//    additionalContext.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const TMP_DIR = os.tmpdir();
const DEBOUNCE_FILE = path.join(TMP_DIR, 'synapse-pre-hook-last.json');
const DEBOUNCE_MS = 30000; // 30s between memory context retrievals
const SHOUT_DEBOUNCE_MS = 60000; // throttle the strong reminder to once/minute
const WORK_TOOLS = new Set(['Edit', 'Write', 'Bash', 'MultiEdit', 'Read', 'Grep']);
const SYNAPSE_BIN = path.join(__dirname, '..', '..', 'bin', 'synapse.cjs');

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
    const sessionId = data.session_id || data.sessionId || '';

    const sessionKey = sessionKeyFor(sessionId, toolInput);
    const markerPath = path.join(TMP_DIR, `synapse-prime-${sessionKey}.flag`);

    // 1. Detect any synapse_agent_prime call and persist the session marker.
    if (isAgentPrimeTool(toolName)) {
      try { fs.writeFileSync(markerPath, String(Date.now())); } catch { /* ignore */ }
      process.stdout.write('{}');
      process.exit(0);
    }

    // 2. Only act on substantive work tools — everything else passes through.
    if (!WORK_TOOLS.has(toolName)) {
      process.stdout.write('{}');
      process.exit(0);
    }

    const primed = sessionPrimed(markerPath);

    // 3. If not primed, shout (throttled) — strong, formatted reminder.
    if (!primed && shouldShoutNow()) {
      const shout = buildShoutContext();
      process.stdout.write(JSON.stringify({ additionalContext: shout }));
      process.exit(0);
    }

    // 4. Debounced memory recall — only when primed (or shouted recently).
    if (debounced()) {
      process.stdout.write('{}');
      process.exit(0);
    }
    try { fs.writeFileSync(DEBOUNCE_FILE, JSON.stringify({ ts: Date.now() })); } catch { /* ignore */ }

    const filePath = toolInput.file_path || toolInput.path || toolInput.command || '';
    const query = toolInput.task || toolInput.query || filePath.split('/').pop() || '';

    if (!query) {
      process.stdout.write('{}');
      process.exit(0);
    }

    const result = spawnSync(process.execPath, [SYNAPSE_BIN, 'memory', 'prime', query, '--json'], {
      encoding: 'utf8',
      timeout: 8000,
      env: { ...process.env, SYNAPSE_MEMORY_ENABLED: 'true' }
    });

    if (result.status !== 0 || !result.stdout) {
      process.stdout.write('{}');
      process.exit(0);
    }

    let contextStr = '';
    try {
      const parsed = JSON.parse(result.stdout);

      contextStr = `\n[SYNAPSE EXPERT STEERING]\nSOP: Session is primed. Continue with confidence — recalled context below.\n`;

      const memories = (parsed.memories || []).slice(0, 3);
      if (memories.length > 0) {
        contextStr += `\nPAST KNOWLEDGE:\n${memories.map(m => `- ${m.title}: ${m.summary || ''}`).join('\n')}\n`;
      }

      const entities = (parsed.entities || []).slice(0, 3);
      if (entities.length > 0) {
        contextStr += `\nKEY CONCEPTS:\n${entities.map(e => `- ${e.name} (${e.type})`).join('\n')}\n`;
      }

      const actions = (parsed.suggested_actions || []).slice(0, 2);
      if (actions.length > 0) {
        contextStr += `\nSUGGESTED ACTIONS:\n${actions.map(a => `-> ${a}`).join('\n')}\n`;
      }
    } catch { /* parsing failed */ }

    if (!contextStr.trim()) {
      process.stdout.write('{}');
      process.exit(0);
    }

    process.stdout.write(JSON.stringify({ additionalContext: contextStr }));
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }
});

function isAgentPrimeTool(toolName) {
  if (!toolName) return false;
  // Match any MCP wrapper variant or bare tool name.
  return /(?:^|__)synapse_agent_prime$/.test(toolName);
}

function sessionKeyFor(sessionId, toolInput) {
  if (sessionId) return crypto.createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 12);
  // Fall back to cwd hash if Claude Code did not provide a session id.
  const cwd = (toolInput && toolInput.cwd) || process.cwd();
  return crypto.createHash('sha256').update(String(cwd)).digest('hex').slice(0, 12);
}

function sessionPrimed(markerPath) {
  try {
    return fs.statSync(markerPath).isFile();
  } catch {
    return false;
  }
}

function debounced() {
  try {
    const last = JSON.parse(fs.readFileSync(DEBOUNCE_FILE, 'utf8'));
    return Date.now() - last.ts < DEBOUNCE_MS;
  } catch {
    return false;
  }
}

function shouldShoutNow() {
  const shoutFile = path.join(TMP_DIR, 'synapse-shout-last.json');
  try {
    const last = JSON.parse(fs.readFileSync(shoutFile, 'utf8'));
    if (Date.now() - last.ts < SHOUT_DEBOUNCE_MS) return false;
  } catch { /* no prior shout */ }
  try { fs.writeFileSync(shoutFile, JSON.stringify({ ts: Date.now() })); } catch { /* ignore */ }
  return true;
}

function buildShoutContext() {
  return [
    '',
    '================================================================',
    '[ACTION REQUIRED] Synapse session is NOT primed.',
    '================================================================',
    '',
    'You MUST call mcp__synapse__synapse_agent_prime BEFORE the next',
    'Edit / Write / Bash / MultiEdit on this codebase. Skipping it leads',
    'to lost context, duplicated work, and stale assumptions — this hook',
    'will keep firing until agent_prime has been invoked at least once',
    'this session.',
    '',
    'Do this now:',
    '  1. Call mcp__synapse__synapse_agent_prime with a short task',
    '     description (the work you are about to do).',
    '  2. Then continue with your planned tool call.',
    '',
    'This is a hard SOP, not a suggestion.',
    '================================================================',
    ''
  ].join('\n');
}
