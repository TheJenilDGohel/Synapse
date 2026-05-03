#!/usr/bin/env node
// Install Synapse hooks into Claude Code settings.json
//
// Usage: node scripts/hooks/install-hooks.js
//   or:  synapse hooks install
//
// Adds pre-tool and post-tool hooks that auto-retrieve and auto-save
// memory context during AI coding sessions.
//
// Resolution strategy:
//   1. Find this package's root via __dirname traversal
//   2. Use absolute, quoted paths so spaces in directory names work
//   3. Detect existing hooks to avoid duplicates

const fs = require('fs');
const path = require('path');
const os = require('os');

// Resolve the package root: this file is at <root>/scripts/hooks/install-hooks.js
const PKG_ROOT = path.resolve(__dirname, '..', '..');
const HOOKS_DIR = path.join(PKG_ROOT, 'scripts', 'hooks');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const PRE_HOOK = path.join(HOOKS_DIR, 'synapse-pre-tool.cjs');
const POST_HOOK = path.join(HOOKS_DIR, 'synapse-post-tool.cjs');

function readSettings(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(filePath, settings) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function hasSynapseHook(hookArray, scriptName, exactPath) {
  if (!Array.isArray(hookArray)) return false;
  return hookArray.some(entry =>
    entry.hooks?.some(h => {
      const isMatch = h.command?.includes(scriptName);
      if (!isMatch) return false;
      // If we have an exactPath, ensure it matches too.
      // This allows updating stale paths from previous installations.
      if (exactPath) {
        return h.command?.includes(exactPath);
      }
      return true;
    })
  );
}

function hookCommand(scriptPath) {
  // Always quote the path to handle spaces in directory names
  return `node "${scriptPath}"`;
}

function installToSettings(settingsPath) {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) settings.hooks = {};

  let changed = false;

  // Pre-tool hook (memory context retrieval + agent_prime SOP enforcement).
  // Matcher includes mcp__synapse__.* so the hook can observe agent_prime
  // calls and clear the "session not primed" reminder.
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
  
  // Clean up stale synapse hooks first if they point to different paths
  const otherPathPre = settings.hooks.PreToolUse.filter(e => 
    e.hooks?.some(h => h.command?.includes('synapse-pre-tool') && !h.command?.includes(PRE_HOOK))
  );
  if (otherPathPre.length > 0) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(e => 
      !e.hooks?.some(h => h.command?.includes('synapse-pre-tool'))
    );
    changed = true;
  }

  if (!hasSynapseHook(settings.hooks.PreToolUse, 'synapse-pre-tool', PRE_HOOK)) {
    settings.hooks.PreToolUse.push({
      matcher: 'Edit|Write|Bash|MultiEdit|mcp__synapse__.*',
      hooks: [{
        type: 'command',
        command: hookCommand(PRE_HOOK),
        timeout: 8000
      }]
    });
    changed = true;
  }

  // Post-tool hook (outcome capture)
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

  // Clean up stale synapse hooks first if they point to different paths
  const otherPathPost = settings.hooks.PostToolUse.filter(e => 
    e.hooks?.some(h => h.command?.includes('synapse-post-tool') && !h.command?.includes(POST_HOOK))
  );
  if (otherPathPost.length > 0) {
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(e => 
      !e.hooks?.some(h => h.command?.includes('synapse-post-tool'))
    );
    changed = true;
  }

  if (!hasSynapseHook(settings.hooks.PostToolUse, 'synapse-post-tool', POST_HOOK)) {
    settings.hooks.PostToolUse.push({
      matcher: 'Bash|Edit|Write|MultiEdit',
      hooks: [{
        type: 'command',
        command: hookCommand(POST_HOOK),
        timeout: 8000
      }]
    });
    changed = true;
  }

  if (changed) {
    writeSettings(settingsPath, settings);
  }

  return changed;
}

function main() {
  // Verify hook files exist
  if (!fs.existsSync(PRE_HOOK)) {
    console.error(`[synapse] Hook file not found: ${PRE_HOOK}`);
    console.error('[synapse] Package may be corrupted. Reinstall with: npm install -g synapse-cortex');
    process.exit(1);
  }

  console.log(`[synapse] Package root: ${PKG_ROOT}`);
  console.log(`[synapse] Hook scripts: ${HOOKS_DIR}`);

  // Install to global ~/.claude/settings.json
  const globalChanged = installToSettings(SETTINGS_PATH);
  if (globalChanged) {
    console.log(`[synapse] Installed hooks in ${SETTINGS_PATH}`);
  } else {
    console.log('[synapse] Hooks already present in global settings');
  }

  console.log('');
  console.log('[synapse] Pre-tool hook:  auto memory retrieval before Edit/Write/Bash');
  console.log('[synapse] Post-tool hook: auto outcome capture after Edit/Write/Bash');
  console.log('');
  console.log('[synapse] Check status: synapse hooks status');
}

main();
