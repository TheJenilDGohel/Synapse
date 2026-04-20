#!/usr/bin/env -S node --import tsx/esm
import { forwardDeprecatedCommand } from './_shared.js';

await forwardDeprecatedCommand({
  metaUrl: import.meta.url,
  legacyCommand: 'synapse-mcp-setup',
  replacementCommand: 'synapse setup',
  commandArgs: ['setup']
});
