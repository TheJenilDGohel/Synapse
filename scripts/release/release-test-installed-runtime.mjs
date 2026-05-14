#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { setTimeout as delay } from 'node:timers/promises';

function parseCliArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

export const __test_parseCliArgs = parseCliArgs;

function nowIso() {
  return new Date().toISOString();
}

function summarize(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.slice(0, 160);
  const text = JSON.stringify(value);
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

function resultCount(value) {
  if (Array.isArray(value)) return value.length;
  if (Number.isFinite(value?.count)) return value.count;
  if (Array.isArray(value?.items)) return value.items.length;
  if (Array.isArray(value?.entries)) return value.entries.length;
  if (Array.isArray(value?.lines)) return value.lines.length;
  if (typeof value?.content === 'string') return value.content.split(/\r?\n/).filter(Boolean).length;
  return 0;
}

function safeToolResult(result) {
  if (!result) return null;
  if (result.structuredContent?.data !== undefined) return result.structuredContent.data;
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (result.content?.[0]?.text) return result.content[0].text;
  return result;
}

function getMemoryId(value) {
  return value?.id || value?.memory?.id || null;
}

function getMemoryTitle(value) {
  return value?.title || value?.memory?.title || '';
}

function assertFields(value, fields, label) {
  for (const field of fields) {
    if (value?.[field] === undefined) {
      throw new Error(`${label} missing required field ${field}`);
    }
  }
}

function isLockedMessage(value) {
  return typeof value === 'string' && /database is locked/i.test(value);
}

function buildDefaultConfig(overrides = {}) {
  const root = process.cwd();
  const reportDir = path.join(root, 'reports');
  const versionLabel = overrides.versionLabel || 'installed-runtime';
  const slug = String(versionLabel).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'installed-runtime';
  const synapseHome = path.join(os.homedir(), '.synapse');
  return {
    root,
    projectPath: root,
    filePath: path.join(root, 'README.md'),
    searchFileQuery: 'README',
    searchCodeQuery: 'synapse_list_roots',
    reportDir,
    markdownReportPath: overrides.markdownReportPath || path.join(reportDir, `synapse-${slug}-release-test-report.md`),
    jsonReportPath: overrides.jsonReportPath || path.join(reportDir, `synapse-${slug}-release-test-report.json`),
    reportTitle: `Synapse ${overrides.versionLabel || 'Installed Runtime'} Release Test Report`,
    configPath: path.join(synapseHome, 'config', 'synapse.config.json'),
    dbPath: path.join(synapseHome, 'data', 'synapse.db'),
    indexPath: path.join(synapseHome, 'data', 'synapse.index.json'),
    runtimeLabel: overrides.runtimeLabel || 'globally installed `synapse`',
    versionLabel: overrides.versionLabel || 'installed-runtime',
    command: overrides.command || 'synapse'
  };
}

export const __test_buildDefaultConfig = buildDefaultConfig;

export async function runInstalledRuntimeReleaseTest(options = {}) {
  const config = buildDefaultConfig(options);
  fs.mkdirSync(config.reportDir, { recursive: true });

  const tempReleaseHome = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-release-runtime-'));
  const tempMemoryDb = path.join(tempReleaseHome, 'synapse.memory.db');
  const tempIndexDb = path.join(tempReleaseHome, 'synapse.db');
  const tempIndexJson = path.join(tempReleaseHome, 'synapse.index.json');
  const env = {
    ...process.env,
    MCP_MODE: 'stdio',
    SYNAPSE_CONFIG: config.configPath,
    SYNAPSE_INDEX_BACKEND: 'sqlite-vec',
    SYNAPSE_DB_PATH: tempIndexDb,
    SYNAPSE_INDEX_PATH: tempIndexJson,
    SYNAPSE_MEMORY_ENABLED: 'true',
    SYNAPSE_MEMORY_BACKEND: 'auto',
    SYNAPSE_MEMORY_DB_PATH: tempMemoryDb
  };

  let transport;
  let client;
  let stderrOutput = '';
  const results = [];
  let toolList;
  let tempMemoryA = null;
  let tempMemoryB = null;
  let indexStatus = null;
  let cleanupSummary = { temp_memory_deleted: false };

  const createClientPair = async (envOverrides = {}) => {
    const nextTransport = new StdioClientTransport({
      command: config.command,
      args: [],
      env: {
        ...env,
        ...envOverrides
      },
      stderr: 'pipe'
    });
    nextTransport.stderr?.on('data', (chunk) => {
      stderrOutput += chunk.toString('utf8');
    });
    const nextClient = new Client({
      name: 'synapse-release-smoke',
      version: '2026.5.0'
    }, {
      capabilities: {}
    });
    return { nextClient, nextTransport };
  };

  const record = async (name, fn, optionsForStep = {}) => {
    const startedAt = Date.now();
    const stderrOffset = stderrOutput.length;
    process.stderr.write(`[release-test-installed-runtime] start ${name}\n`);
    try {
      const value = await fn();
      if (typeof optionsForStep.verify === 'function') optionsForStep.verify(value);
      const durationMs = Date.now() - startedAt;
      const stderrDelta = stderrOutput.slice(stderrOffset).trim();
      process.stderr.write(`[release-test-installed-runtime] pass ${name} (${durationMs}ms)\n`);
      results.push({
        name,
        status: 'PASS',
        durationMs,
        details: optionsForStep.details ? optionsForStep.details(value) : summarize(value),
        stderr: stderrDelta || null
      });
      return value;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const stderrDelta = stderrOutput.slice(stderrOffset).trim();
      process.stderr.write(`[release-test-installed-runtime] ${optionsForStep.allowFailure ? 'warn' : 'fail'} ${name} (${durationMs}ms): ${error?.message || String(error)}\n`);
      results.push({
        name,
        status: optionsForStep.allowFailure ? 'WARN' : 'FAIL',
        durationMs,
        details: error?.message || String(error),
        stderr: stderrDelta || null
      });
      if (!optionsForStep.allowFailure) throw error;
      return null;
    }
  };

  let initialize = null;
  try {
    const initializeStartedAt = Date.now();
    const initializeStderrOffset = stderrOutput.length;
    process.stderr.write('[release-test-installed-runtime] start MCP initialize\n');
    try {
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        ({ nextClient: client, nextTransport: transport } = await createClientPair());
        try {
          await client.connect(transport, { timeout: 10000 });
          initialize = client.getServerVersion();
          if (attempt > 1) {
            stderrOutput += `\n[release-test-installed-runtime] initialize recovered after attempt ${attempt}\n`;
          }
          break;
        } catch (error) {
          lastError = error;
          try {
            await client.close();
          } catch {
            // Ignore close failures during retry cleanup.
          }
          client = null;
          transport = null;
          if (attempt < 3) {
            await delay(200 * attempt);
            continue;
          }
        }
      }
      if (!initialize) throw lastError || new Error('MCP initialize failed');
      const durationMs = Date.now() - initializeStartedAt;
      const stderrDelta = stderrOutput.slice(initializeStderrOffset).trim();
      process.stderr.write(`[release-test-installed-runtime] pass MCP initialize (${durationMs}ms)\n`);
      results.push({
        name: 'MCP initialize',
        status: 'PASS',
        durationMs,
        details: `${initialize?.name || 'unknown'} ${initialize?.version || ''}`.trim(),
        stderr: stderrDelta || null
      });
    } catch (error) {
      const durationMs = Date.now() - initializeStartedAt;
      const stderrDelta = stderrOutput.slice(initializeStderrOffset).trim();
      process.stderr.write(`[release-test-installed-runtime] fail MCP initialize (${durationMs}ms): ${error?.message || String(error)}\n`);
      results.push({
        name: 'MCP initialize',
        status: 'FAIL',
        durationMs,
        details: error?.message || String(error),
        stderr: stderrDelta || null
      });
      throw error;
    }

    const toolsListResult = await record('tools/list', async () => client.listTools(undefined, { timeout: 15000 }), {
      details: (value) => `${value.tools?.length || 0} tools exposed`,
      verify: (value) => {
        if (!Array.isArray(value.tools) || value.tools.length === 0) {
          throw new Error('expected tools/list to expose at least one MCP tool');
        }
      }
    });
    toolList = toolsListResult.tools || [];

    const callTool = (name, args = {}, timeoutMs = 30000) =>
      client.callTool({ name, arguments: args }, undefined, { timeout: timeoutMs });

    await record('synapse_server_status', async () => {
      let lastValue = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        lastValue = safeToolResult(await callTool('synapse_server_status'));
        if (lastValue?.name !== undefined && !isLockedMessage(lastValue)) {
          return lastValue;
        }
        if (attempt < 3) {
          await delay(300 * attempt);
        }
      }
      return lastValue;
    }, {
      details: (value) => `version=${value.version}, roots=${value.roots?.length || 0}, backend=${value.vector_index?.backend || value.vector_index?.requested_backend || ''}`,
      verify: (value) => {
        assertFields(value || {}, ['name', 'version', 'updates'], 'synapse_server_status');
      }
    });
    await record('synapse_usage_guide', async () => safeToolResult(await callTool('synapse_usage_guide', { response_format: 'markdown' })), {
      details: (value) => typeof value === 'string' ? 'markdown returned' : summarize(value)
    });
    await record('synapse_list_roots', async () => safeToolResult(await callTool('synapse_list_roots')), {
      details: (value) => `${value.items?.length || 0} roots`
    });
    await record('synapse_list_projects', async () => safeToolResult(await callTool('synapse_list_projects', { root_path: path.dirname(config.projectPath) })), {
      details: (value) => `${value.items?.length || 0} first-level projects`
    });
    await record('synapse_project_tree', async () => safeToolResult(await callTool('synapse_project_tree', { project_path: config.projectPath, max_depth: 2 })), {
      details: (value) => `${resultCount(value)} top-level entries`,
      verify: (value) => {
        if (resultCount(value) <= 0) throw new Error('expected non-empty project tree for the target project');
      }
    });
    indexStatus = await record('synapse_index_status', async () => safeToolResult(await callTool('synapse_index_status')), {
      details: (value) => `backend=${value.backend}, total_files=${value.total_files}`,
      verify: (value) => {
        assertFields(value || {}, ['backend', 'total_files'], 'synapse_index_status');
      }
    });
    await record('synapse_embed_status', async () => safeToolResult(await callTool('synapse_embed_status')), {
      details: (value) => `ready=${value.ready ?? ''}, provider=${value.provider || ''}`,
      verify: (value) => {
        assertFields(value || {}, ['ready', 'provider', 'model'], 'synapse_embed_status');
      }
    });
    if ((indexStatus?.total_files || 0) > 0) {
      await record('synapse_index_project', async () => ({
        skipped: true,
        reason: 'existing_index_available',
        total_files: indexStatus.total_files
      }), {
        details: (value) => `skipped (${value.reason}), total_files=${value.total_files}`
      });
    } else {
      await record('synapse_index_project', async () => safeToolResult(await callTool('synapse_index_project', {
        project_path: config.projectPath
      }, 300000)), {
        details: (value) => {
          const failedCount = value.failed_file_count ?? value.failed_files?.length ?? 0;
          const failedSample = Array.isArray(value.failed_file_samples) && value.failed_file_samples.length > 0
            ? value.failed_file_samples.map((item) => item.path || item.file || '').filter(Boolean).join(', ')
            : '';
          return failedSample
            ? `indexed_files=${value.indexed_files}, failed_files=${failedCount}, failed_sample=${failedSample}`
            : `indexed_files=${value.indexed_files}, failed_files=${failedCount}`;
        },
        verify: (value) => {
          assertFields(value || {}, ['indexed_files', 'failed_files'], 'synapse_index_project');
        }
      });
    }
    await record('synapse_search_files', async () => safeToolResult(await callTool('synapse_search_files', {
      project_path: config.projectPath,
      query: config.searchFileQuery,
      max_results: 10
    })), {
      details: (value) => `${resultCount(value)} matches`,
      verify: (value) => {
        if (resultCount(value) <= 0) throw new Error(`expected at least one file match for query ${JSON.stringify(config.searchFileQuery)}`);
      }
    });
    await record('synapse_search_code', async () => safeToolResult(await callTool('synapse_search_code', {
      project_path: config.projectPath,
      query: config.searchCodeQuery,
      max_results: 5,
      context_lines: 1
    })), {
      details: (value) => `${resultCount(value)} matches`,
      verify: (value) => {
        if (resultCount(value) <= 0) throw new Error(`expected at least one code match for query ${JSON.stringify(config.searchCodeQuery)}`);
      }
    });
    await record('synapse_search_hybrid', async () => safeToolResult(await callTool('synapse_search_hybrid', {
      project_path: config.projectPath,
      query: 'memory workflow',
      max_results: 5,
      auto_index: false
    }, 60000)), {
      details: (value) => `ranking_mode=${value.ranking_mode || ''}, results=${value.results?.length || 0}`
    });
    await record('synapse_get_symbol', async () => safeToolResult(await callTool('synapse_get_symbol', {
      project_path: config.projectPath,
      symbol: 'buildRuntimeConfig',
      max_results: 5
    })), {
      details: (value) => `definitions=${value.definitions?.length || 0}, exports=${value.exports?.length || 0}`
    });
    await record('synapse_find_usages', async () => safeToolResult(await callTool('synapse_find_usages', {
      project_path: config.projectPath,
      symbol: 'buildRuntimeConfig',
      max_results: 10
    })), {
      details: (value) => `usages=${value.usages?.length || 0}`
    });
    await record('synapse_read_file', async () => safeToolResult(await callTool('synapse_read_file', {
      path: config.filePath,
      start_line: 1,
      end_line: 20
    })), {
      details: (value) => `${resultCount(value)} lines returned`,
      verify: (value) => {
        if (resultCount(value) <= 0) throw new Error(`expected non-empty file content for ${config.filePath}`);
        assertFields(value || {}, ['path', 'start_line', 'end_line'], 'synapse_read_file');
      }
    });
    await record('synapse_summarize_project', async () => safeToolResult(await callTool('synapse_summarize_project', {
      project_path: config.projectPath
    }, 60000)), {
      details: (value) => summarize(value.summary || value)
    });
    await record('synapse_memory_status', async () => safeToolResult(await callTool('synapse_memory_status')), {
      details: (value) => `enabled=${value.enabled}, backend=${value.selected_backend || value.requested_backend || ''}`
    });
    await record('synapse_task_context', async () => safeToolResult(await callTool('synapse_task_context', {
      task: `${config.versionLabel} release test`,
      project_path: config.projectPath,
      limit: 5
    })), {
      details: (value) => `recall=${value.recall?.count || 0}`
    });
    await record('synapse_memory_recall', async () => safeToolResult(await callTool('synapse_memory_recall', {
      query: 'release smoke test',
      project_path: config.projectPath,
      limit: 5
    })), {
      details: (value) => `count=${value.count || value.items?.length || 0}`
    });
    await record('synapse_task_context empty-memory', async () => safeToolResult(await callTool('synapse_task_context', {
      query: 'empty memory verification',
      project_path: config.projectPath,
      limit: 5
    })), {
      details: (value) => `recall=${value.recall?.count || 0}, attempted=${value.recall?.attempted}`,
      verify: (value) => {
        if (value.recall?.count !== 0) throw new Error('expected empty-memory task context to return zero recalled items');
      }
    });
    await record('synapse_memory_recall empty-memory', async () => safeToolResult(await callTool('synapse_memory_recall', {
      query: 'empty memory verification',
      project_path: config.projectPath,
      limit: 5
    })), {
      details: (value) => `count=${value.count || 0}`,
      verify: (value) => {
        if ((value.count || 0) !== 0) throw new Error('expected empty-memory recall to return zero items');
      }
    });

    tempMemoryA = await record('synapse_memory_store A', async () => safeToolResult(await callTool('synapse_memory_store', {
      title: `${config.versionLabel} release smoke temp A`,
      summary: 'temporary memory for release smoke test',
      content: `temporary memory A created during ${config.versionLabel} release smoke test`,
      kind: 'knowledge',
      status: 'active',
      scope: { project_path: config.projectPath },
      tags: ['release-test', 'temp']
    })), {
      details: (value) => `id=${getMemoryId(value)}`
    });
    tempMemoryB = await record('synapse_memory_store B', async () => safeToolResult(await callTool('synapse_memory_store', {
      title: `${config.versionLabel} release smoke temp B`,
      summary: 'temporary related memory for release smoke test',
      content: `temporary memory B created during ${config.versionLabel} release smoke test`,
      kind: 'knowledge',
      status: 'active',
      scope: { project_path: config.projectPath },
      tags: ['release-test', 'temp']
    })), {
      details: (value) => `id=${getMemoryId(value)}`
    });
    await record('synapse_memory_list', async () => safeToolResult(await callTool('synapse_memory_list', {
      project_path: config.projectPath,
      limit: 10
    })), {
      details: (value) => `count=${value.count || value.items?.length || 0}`
    });
    await record('synapse_memory_get', async () => safeToolResult(await callTool('synapse_memory_get', {
      id: getMemoryId(tempMemoryA)
    })), {
      details: (value) => `title=${getMemoryTitle(value)}`
    });
    await record('synapse_memory_update', async () => safeToolResult(await callTool('synapse_memory_update', {
      id: getMemoryId(tempMemoryA),
      summary: 'updated temporary memory for release smoke test',
      change_note: 'release smoke update'
    })), {
      details: (value) => `id=${getMemoryId(value)}`
    });
    await record('synapse_memory_suggest_relations', async () => safeToolResult(await callTool('synapse_memory_suggest_relations', {
      id: getMemoryId(tempMemoryA),
      threshold: 0.0,
      max_results: 5
    }, 60000)), {
      details: (value) => `suggestions=${value.suggestions?.length || 0}`
    });
    await record('synapse_memory_add_relation', async () => safeToolResult(await callTool('synapse_memory_add_relation', {
      source_id: getMemoryId(tempMemoryA),
      target_id: getMemoryId(tempMemoryB),
      relation_type: 'related'
    })), {
      details: (value) => `${value.source_id || getMemoryId(tempMemoryA)} -> ${value.target_id || getMemoryId(tempMemoryB)}`
    });
    await record('synapse_memory_related', async () => safeToolResult(await callTool('synapse_memory_related', {
      id: getMemoryId(tempMemoryA)
    })), {
      details: (value) => `related=${value.count || value.related?.length || 0}`
    });
    await record('synapse_memory_remove_relation', async () => safeToolResult(await callTool('synapse_memory_remove_relation', {
      source_id: getMemoryId(tempMemoryA),
      target_id: getMemoryId(tempMemoryB)
    })), {
      details: (value) => `removed=${value.removed}`
    });
    await record('synapse_memory_capture_event', async () => safeToolResult(await callTool('synapse_memory_capture_event', {
      event_type: 'task',
      status: 'completed',
      title: `${config.versionLabel} release smoke event`,
      summary: `temporary event for ${config.versionLabel} release smoke test`,
      scope: { project_path: config.projectPath }
    })), {
      details: (value) => `status=${value.status || value.result?.status || ''}`
    });
    await record('synapse_memory_events', async () => safeToolResult(await callTool('synapse_memory_events', {
      project_path: config.projectPath,
      limit: 5
    })), {
      details: (value) => `count=${value.count || value.items?.length || 0}`
    });
    await record('synapse_capture_outcome', async () => safeToolResult(await callTool('synapse_capture_outcome', {
      task: `${config.versionLabel} release smoke`,
      summary: 'tool capture outcome executed',
      project_path: config.projectPath,
      files_changed: 0,
      has_tests: true
    })), {
      details: (value) => `captured=${value.captured}`
    });

    await record('synapse_update_status', async () => safeToolResult(await callTool('synapse_update_status', { force_check: false }, 20000)), {
      allowFailure: true,
      details: (value) => `current=${value.current || ''}, latest=${value.latest || ''}, outdated=${value.is_outdated ?? ''}`
    });

    results.push({
      name: 'synapse_update_self',
      status: 'SKIP',
      durationMs: 0,
      details: 'Skipped in release sweep because self-update mutates the installed global runtime.',
      stderr: null
    });

    if (getMemoryId(tempMemoryA)) {
      await record('synapse_memory_delete A', async () => safeToolResult(await callTool('synapse_memory_delete', { id: getMemoryId(tempMemoryA) })), {
        details: (value) => `deleted=${value.deleted}`
      });
    }
    if (getMemoryId(tempMemoryB)) {
      await record('synapse_memory_delete B', async () => safeToolResult(await callTool('synapse_memory_delete', { id: getMemoryId(tempMemoryB) })), {
        details: (value) => `deleted=${value.deleted}`
      });
    }

    const cleanupCheck = await callTool('synapse_memory_list', { project_path: config.projectPath, limit: 50 }).catch(() => null);
    const cleanupData = safeToolResult(cleanupCheck);
    const remainingTempEntries = Array.isArray(cleanupData?.items)
      ? cleanupData.items.filter((item) => new RegExp(`${config.versionLabel} release smoke temp`, 'i').test(item.title || ''))
      : [];
    cleanupSummary.temp_memory_deleted = remainingTempEntries.length === 0;

    results.push({
      name: 'disabled-memory variant checks',
      status: 'SKIP',
      durationMs: 0,
      details: 'Skipped in installed-runtime sweep because alternate-env MCP launches can contend on the live shared retrieval database; covered by repo tests instead.',
      stderr: null
    });
    results.push({
      name: 'backend-unavailable variant checks',
      status: 'SKIP',
      durationMs: 0,
      details: 'Skipped in installed-runtime sweep because alternate-env MCP launches can contend on the live shared retrieval database; covered by repo tests instead.',
      stderr: null
    });

    const passCount = results.filter((item) => item.status === 'PASS').length;
    const warnCount = results.filter((item) => item.status === 'WARN').length;
    const failCount = results.filter((item) => item.status === 'FAIL').length;
    const skipCount = results.filter((item) => item.status === 'SKIP').length;

    const reportObject = {
      title: config.reportTitle,
      generated_at: nowIso(),
      host: os.hostname(),
      project_path: config.projectPath,
      runtime_label: config.runtimeLabel,
      version_label: config.versionLabel,
      installed_runtime: {
        name: initialize?.name || 'synapse',
        version: initialize?.version || 'unknown'
      },
      summary: {
        pass: passCount,
        warn: warnCount,
        fail: failCount,
        skip: skipCount,
        exposed_tools: toolList.length
      },
      temporary_artifacts: {
        temp_release_home: tempReleaseHome,
        temp_memory_db: tempMemoryDb,
        temp_memory_deleted: cleanupSummary.temp_memory_deleted
      },
      results,
      stderr: stderrOutput.trim() || ''
    };

    const report = [
      `# ${config.reportTitle}`,
      '',
      `Date: ${reportObject.generated_at}`,
      `Host: ${reportObject.host}`,
      `Project: ${config.projectPath}`,
      `Installed runtime: ${reportObject.installed_runtime.name} ${reportObject.installed_runtime.version}`,
      '',
      '## Scope',
      '',
      `- Target runtime: ${config.runtimeLabel}`,
      `- Version under test: \`${config.versionLabel}\``,
      '- Transport: MCP stdio handshake against installed binary',
      `- Config: \`${config.configPath}\``,
      '',
      '## Summary',
      '',
      `- PASS: ${passCount}`,
      `- WARN: ${warnCount}`,
      `- FAIL: ${failCount}`,
      `- SKIP: ${skipCount}`,
      `- Exposed MCP tools: ${toolList.length}`,
      '',
      '## Results',
      '',
      '| Check | Status | Details |',
      '|---|---|---|',
      ...results.map((item) => `| ${item.name} | ${item.status} | ${String(item.details).replace(/\|/g, '\\|')} |`),
      '',
      '## Temporary Artifacts',
      '',
      `- Temp release home: \`${tempReleaseHome}\``,
      `- Temp memory db: \`${tempMemoryDb}\``,
      `- Cleanup verified: temporary memory deleted=${cleanupSummary.temp_memory_deleted}`,
      '',
      '## Notes',
      '',
      '- `synapse_update_self` was intentionally skipped because it mutates the live global install and is not appropriate for a release verification sweep.',
      '- Memory store/update/relation/delete flow was exercised against an isolated temporary memory database, then cleanup was verified for the temporary entries created by this test.',
      '- Event-based workflow tools in this sweep used the isolated temporary memory database rather than the user\'s real event log.',
      '',
      '## Per-Step Stderr',
      '',
      ...results.filter((item) => item.stderr).length > 0
        ? results.filter((item) => item.stderr).flatMap((item) => [
          `### ${item.name}`,
          '',
          '```text',
          item.stderr,
          '```',
          ''
        ])
        : ['(none)', ''],
      '## Stderr',
      '',
      '```text',
      reportObject.stderr || '(none)',
      '```'
    ].join('\n');

    fs.writeFileSync(config.markdownReportPath, `${report}\n`, 'utf8');
    fs.writeFileSync(config.jsonReportPath, `${JSON.stringify(reportObject, null, 2)}\n`, 'utf8');
    process.stdout.write(`${report}\n`);
    return reportObject;
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close failures during final cleanup.
    }
    fs.rmSync(tempReleaseHome, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  await runInstalledRuntimeReleaseTest({
    versionLabel: args['version-label'],
    runtimeLabel: args['runtime-label'],
    markdownReportPath: args['markdown-report-path'],
    jsonReportPath: args['json-report-path']
  });
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`[release-test-installed-runtime] fatal: ${error?.stack || error?.message || String(error)}\n`);
    process.exit(1);
  });
}
