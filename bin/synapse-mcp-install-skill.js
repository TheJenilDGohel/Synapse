#!/usr/bin/env -S node --import tsx/esm
import { forwardDeprecatedCommand } from './_shared.js';

await forwardDeprecatedCommand({
  metaUrl: import.meta.url,
  legacyCommand: 'synapse-mcp-install-skill',
  replacementCommand: 'synapse skill install',
  commandArgs: ['skill', 'install']
});
