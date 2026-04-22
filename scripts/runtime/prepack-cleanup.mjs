#!/usr/bin/env node

/**
 * Prepack cleanup — removes native-binary-heavy packages from node_modules before
 * npm packs this git dep into a tarball for global install.
 *
 * onnxruntime-node bundles multi-platform binaries and its downloaded .node files
 * cause TAR_ENTRY_ERRORS when npm packs the prepared git dep directory, leaving
 * the destination in a broken state. Removing them here ensures the pack is clean.
 * After the pack is extracted to the final global location, npm installs these deps
 * fresh from the registry (which works fine).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(HERE, '..', '..');
const NODE_MODULES = path.join(PKG_ROOT, 'node_modules');

const HEAVY = [
  'onnxruntime-node',
  'onnxruntime-web',
  'onnxruntime-common',
  'sharp',
];

const HEAVY_SCOPES = [
  '@img',
];

if (!fs.existsSync(NODE_MODULES)) process.exit(0);



for (const pkg of HEAVY) {
  const p = path.join(NODE_MODULES, pkg);
  if (fs.existsSync(p)) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

for (const scope of HEAVY_SCOPES) {
  const p = path.join(NODE_MODULES, scope);
  if (fs.existsSync(p)) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

// Also clean nested @huggingface/transformers/node_modules if it has its own onnxruntime
const hfNodeModules = path.join(NODE_MODULES, '@huggingface', 'transformers', 'node_modules');
if (fs.existsSync(hfNodeModules)) {
  for (const pkg of HEAVY) {
    const p = path.join(hfNodeModules, pkg);
    if (fs.existsSync(p)) {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  }
}
