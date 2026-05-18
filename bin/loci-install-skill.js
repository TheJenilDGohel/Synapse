#!/usr/bin/env -S node --import tsx/esm
import { forwardDeprecatedCommand } from './_shared.js';

await forwardDeprecatedCommand({
  metaUrl: import.meta.url,
  legacyCommand: 'loci-install-skill',
  replacementCommand: 'loci skill install',
  commandArgs: ['skill', 'install']
});
