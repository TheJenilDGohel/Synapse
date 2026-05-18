#!/usr/bin/env node

import {
  createMemoryWorkflow,
  hasHelpFlag,
  parseArg,
  parseBooleanArg,
  parseCsvArg,
  parseNumberArg,
  printCaptureOutcomeHelp,
  readJsonInput,
  printJson,
  c,
  symbol
} from './memory-workflow-cli-utils.mjs';

function parseLinks(argv, jsonInput) {
  const raw = parseArg(argv, 'links-json');
  if (raw) return JSON.parse(raw);
  return Array.isArray(jsonInput.links) ? jsonInput.links : [];
}

async function main() {
  const argv = process.argv.slice(2);
  if (hasHelpFlag(argv)) {
    printCaptureOutcomeHelp();
    return;
  }
  const jsonInput = await readJsonInput(argv);
  const { workflow } = await createMemoryWorkflow();
  const argTags = parseCsvArg(argv, 'tags');

  const input = {
    ...jsonInput,
    task: parseArg(argv, 'task') || jsonInput.task,
    title: parseArg(argv, 'title') || jsonInput.title,
    summary: parseArg(argv, 'summary') || jsonInput.summary,
    details: parseArg(argv, 'details') || jsonInput.details,
    content: parseArg(argv, 'content') || jsonInput.content,
    event_type: parseArg(argv, 'event-type') || jsonInput.event_type || jsonInput.eventType,
    status: parseArg(argv, 'status') || jsonInput.status,
    kind: parseArg(argv, 'kind') || jsonInput.kind,
    importance: parseNumberArg(argv, 'importance', jsonInput.importance),
    confidence: parseNumberArg(argv, 'confidence', jsonInput.confidence),
    files_changed: parseNumberArg(argv, 'files-changed', jsonInput.files_changed ?? jsonInput.filesChanged),
    has_tests: parseBooleanArg(argv, 'has-tests', jsonInput.has_tests ?? jsonInput.hasTests ?? false),
    tags: argTags.length > 0 ? argTags : (jsonInput.tags || []),
    links: parseLinks(argv, jsonInput),
    root_path: parseArg(argv, 'root-path') || jsonInput.root_path || jsonInput.rootPath,
    project_path: parseArg(argv, 'project-path') || jsonInput.project_path || jsonInput.projectPath,
    branch_name: parseArg(argv, 'branch-name') || jsonInput.branch_name || jsonInput.branchName,
    topic: parseArg(argv, 'topic') || jsonInput.topic,
    feature: parseArg(argv, 'feature') || jsonInput.feature,
    source_ref: parseArg(argv, 'source-ref') || jsonInput.source_ref || jsonInput.sourceRef
  };

  const result = await workflow.captureOutcome(input);
  printJson(result);
}

main().catch((error) => {
  console.error(`${symbol.fail()} ${c.red.bold('Error:')} ${error?.message || String(error)}`);
  process.exit(1);
});
