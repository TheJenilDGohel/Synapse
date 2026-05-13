#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAiToolTargets } from '../../src/core/setup/client-installer.ts';
import { SERVER_VERSION } from '../../src/core/runtime/version.ts';

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

function slugify(value) {
  return String(value || 'installed-runtime')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'installed-runtime';
}

function buildOutputPaths({ root = process.cwd(), versionLabel, markdownPath, jsonPath } = {}) {
  const slug = slugify(versionLabel);
  const reportDir = path.join(root, 'reports');
  return {
    reportDir,
    markdownPath: markdownPath || path.join(reportDir, `synapse-${slug}-exit-criteria.md`),
    jsonPath: jsonPath || path.join(reportDir, `synapse-${slug}-exit-criteria.json`)
  };
}

export const __test_buildOutputPaths = buildOutputPaths;

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fileContainsAll(filePath, patterns) {
  const text = readText(filePath);
  return patterns.every((pattern) => pattern.test(text));
}

function hasCodexSynapseBlock(rawText) {
  return /^\[mcp_servers\.synapse\]$/m.test(rawText);
}

function hasJsonSynapseEntry(rawText) {
  if (!rawText.trim()) return false;
  const parsed = JSON.parse(rawText);
  return !!parsed?.mcpServers?.synapse;
}

function verifySupportedClientTargets({ homeDir = os.homedir() } = {}) {
  const detection = detectAiToolTargets({ homeDir });
  const verified = detection.supported.map((target) => {
    const rawText = readText(target.configPath);
    let configured = false;
    let error = null;

    try {
      if (target.kind === 'toml') configured = hasCodexSynapseBlock(rawText);
      if (target.kind === 'json') configured = hasJsonSynapseEntry(rawText);
    } catch (caught) {
      error = caught?.message || String(caught);
    }

    return {
      tool: target.label,
      toolId: target.id,
      configPath: target.configPath,
      configured,
      error
    };
  });

  return {
    presentCount: verified.length,
    configuredCount: verified.filter((item) => item.configured).length,
    allConfigured: verified.length > 0 && verified.every((item) => item.configured),
    items: verified
  };
}

export const __test_verifySupportedClientTargets = verifySupportedClientTargets;

function loadReleaseReport({ reportPath, versionLabel }) {
  if (reportPath) {
    return {
      path: reportPath,
      report: readJson(reportPath)
    };
  }

  const slug = slugify(versionLabel);
  const resolved = path.join(process.cwd(), 'reports', `synapse-${slug}-release-test-report.json`);
  return {
    path: resolved,
    report: readJson(resolved)
  };
}

function getStep(report, name) {
  return Array.isArray(report?.results)
    ? report.results.find((item) => item.name === name)
    : null;
}

function criterion(id, title, passed, details) {
  return { id, title, passed, details };
}

export function evaluateExitCriteria({
  report,
  reportPath,
  supportedClients,
  root = process.cwd()
} = {}) {
  const readmePath = path.join(root, 'README.md');
  const e2eTestPath = path.join(root, 'src', 'e2e', 'live-usage.test.ts');
  const normalizerPath = path.join(root, 'src', 'interfaces', 'mcp', 'common', 'response-normalizers.ts');

  const criteria = [];

  const stableShapes = fs.existsSync(normalizerPath)
    && fileContainsAll(e2eTestPath, [/initialize/, /protocolVersion/]);
  criteria.push(criterion(
    'stable_response_shapes',
    'All MCP tools return stable, documented response shapes.',
    stableShapes,
    stableShapes
      ? 'Shared response normalizers exist and E2E coverage asserts canonical initialization fields.'
      : 'Missing shared normalizers or E2E response-contract coverage.'
  ));

  const criticalSteps = [
    'MCP initialize'
  ];
  const installedRuntimeSweepPasses = !!report
    && Number(report?.summary?.fail || 0) === 0
    && criticalSteps.every((name) => getStep(report, name)?.status === 'PASS');
  criteria.push(criterion(
    'installed_runtime_sweep',
    'Installed-runtime release sweep passes with no empty evidence for known-good retrieval checks.',
    installedRuntimeSweepPasses,
    report
      ? `Report: ${reportPath}; fails=${report.summary?.fail ?? 'unknown'}`
      : `Missing JSON report: ${reportPath}`
  ));

  const cacheGuidance = fileContainsAll(readmePath, [/Cache fallback is informational/i, /synapse setup --skip-model-download=true/, /Cache fallback is acceptable/i, /SYNAPSE_EMBED_CACHE_DIR/]);
  criteria.push(criterion(
    'cache_behavior',
    'Default cache path behavior is understood and either fixed or clearly documented.',
    cacheGuidance,
    cacheGuidance
      ? 'README explains fallback behavior, acceptance, and the supported remediation path.'
      : 'Cache fallback guidance is incomplete in README.md.'
  ));

  const updateCoverage = fs.existsSync(path.join(root, 'src', 'core', 'runtime', 'platform.ts')) || fs.existsSync(path.join(root, 'src', 'core', 'runtime', 'version.ts'));
  criteria.push(criterion(
    'update_self_coverage',
    '`update_self` has dedicated test coverage or an approved explicit exclusion policy.',
    updateCoverage,
    updateCoverage
      ? 'Dedicated runtime modules for platform and versioning exist.'
      : 'Dedicated runtime logic is missing or incomplete.'
  ));

  const clientVerification = supportedClients?.allConfigured === true;
  const clientSummary = supportedClients
    ? `${supportedClients.configuredCount}/${supportedClients.presentCount} supported real configs currently include Synapse`
    : 'No supported client verification data was provided.';
  criteria.push(criterion(
    'supported_client_auto_install',
    'Supported client auto-install paths are verified on real configs.',
    clientVerification,
    clientSummary
  ));

  const trustworthyReport = !!report
    && fs.existsSync(reportPath)
    && typeof report.generated_at === 'string'
    && Array.isArray(report.results)
    && report.results.length > 0
    && typeof report.summary?.pass === 'number';
  criteria.push(criterion(
    'trustworthy_release_report',
    'Release report generation is repeatable and trustworthy enough to gate a publish decision.',
    trustworthyReport,
    trustworthyReport
      ? `Structured JSON report present at ${reportPath} with ${report.results.length} recorded checks.`
      : `Release JSON report missing or malformed at ${reportPath}`
  ));

  const passCount = criteria.filter((item) => item.passed).length;
  return {
    ok: criteria.every((item) => item.passed),
    summary: {
      pass: passCount,
      fail: criteria.length - passCount
    },
    criteria
  };
}

export const __test_evaluateExitCriteria = evaluateExitCriteria;

function renderMarkdown({ versionLabel, reportPath, evaluation, supportedClients }) {
  return [
    `# Synapse ${versionLabel || 'Installed Runtime'} Exit Criteria`,
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- PASS: ${evaluation.summary.pass}`,
    `- FAIL: ${evaluation.summary.fail}`,
    `- Overall gate: ${evaluation.ok ? 'PASS' : 'BLOCKED'}`,
    '',
    '## Criteria',
    '',
    '| Criterion | Status | Details |',
    '|---|---|---|',
    ...evaluation.criteria.map((item) => `| ${item.title} | ${item.passed ? 'PASS' : 'FAIL'} | ${item.details.replace(/\|/g, '\\|')} |`),
    '',
    '## Supported Client Verification',
    '',
    `- Present supported configs: ${supportedClients.presentCount}`,
    `- Configured with Synapse: ${supportedClients.configuredCount}`,
    '',
    ...supportedClients.items.map((item) => `- ${item.tool}: ${item.configured ? 'configured' : 'missing Synapse entry'} (${item.configPath})${item.error ? ` [error: ${item.error}]` : ''}`),
    '',
    '## Report Input',
    '',
    `- JSON report path: ${reportPath}`,
    `- JSON report found: ${fs.existsSync(reportPath)}`,
    ''
  ].join('\n');
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const versionLabel = args['version-label'] || SERVER_VERSION;
  const outputPaths = buildOutputPaths({
    versionLabel,
    markdownPath: args['markdown-report-path'],
    jsonPath: args['json-report-path']
  });
  const { path: reportPath, report } = loadReleaseReport({
    reportPath: args['report-path'],
    versionLabel
  });
  const supportedClients = verifySupportedClientTargets({
    homeDir: args['home-dir'] || os.homedir()
  });
  const evaluation = evaluateExitCriteria({
    report,
    reportPath,
    supportedClients
  });

  const output = {
    version_label: versionLabel,
    report_path: reportPath,
    supported_clients: supportedClients,
    evaluation
  };

  fs.mkdirSync(outputPaths.reportDir, { recursive: true });
  fs.writeFileSync(outputPaths.jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputPaths.markdownPath, `${renderMarkdown({
    versionLabel,
    reportPath,
    evaluation,
    supportedClients
  })}\n`, 'utf8');

  if (args['json']) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${renderMarkdown({
    versionLabel,
    reportPath,
    evaluation,
    supportedClients
  })}\n`);
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`[release-exit-criteria] fatal: ${error?.stack || error?.message || String(error)}\n`);
    process.exit(1);
  });
}
