---
name: loci-node-compat
version: 2026.5.0
description: Expert system for maintaining Node.js version compatibility and graceful feature degradation in Loci.
category: tools
tags: [node-js, compatibility, version-gating, native-dependencies, polyfills]
allowed-tools:
  - Read
  - Write
---

# Node Compatibility Expert

Master cross-version Node.js engineering for Loci. This skill ensures that the application remains stable from Node 18 through Node 23+, handling native dependency variations and API availability boundaries with precision.

## Core Concepts

### 1. Capability Gating
Instead of hard engine bumps, Loci prefers gating specific features (like the SQLite-backed memory subsystem) based on the availability of built-in modules or specific method signatures.

### 2. Lazy Import Isolation
Compatibility is protected by isolating version-sensitive imports behind `async import()` or lazy-loading patterns. This prevents top-level crashes in shared entry points like the CLI or common utilities.

### 3. Graceful Degradation
When a runtime requirement isn't met (e.g., missing `node:sqlite`), Loci identifies the gap, disables only the affected tools, and provides a clear, actionable diagnostic through `synapse_health`.

## Code Examples

### Example 1: Safe Feature Gating
Checking for module availability without crashing the process.
```javascript
async function isMemorySupported() {
  try {
    // node:sqlite is available in Node 22.5+
    await import('node:sqlite');
    return true;
  } catch {
    return false;
  }
}
```

### Example 2: Version-Agnostic Error Handling
Handling differences in error properties across Node versions.
```javascript
try {
  // sensitive operation
} catch (err) {
  // Compatibility: code property might be missing or different in older Node
  const errorCode = err.code || (err.message.includes('MODULE_NOT_FOUND') ? 'MODULE_NOT_FOUND' : 'UNKNOWN');
  handleError(errorCode);
}
```

## Best Practices

1. **Gate Features, Not the Engine**: Keep core search working on Node 18 even if memory requires Node 22.
2. **Avoid Top-Level Versioned Imports**: Never import a module that might be missing at the top level of a shared utility file.
3. **Actionable Status**: If a feature is disabled, the `synapse_health` output must reflect the gap.
4. **Test the Published Shape**: High-version features often behave differently when bundled/published via npm than in the development tree.

## Troubleshooting

### Issue: "Module not found" at startup
**Solution**: Scan for static imports in `src/cli/index.ts` or barrel exports that are pulling in version-gated modules too early.

### Issue: Native build failures
**Solution**: Ensure that optional dependencies are correctly marked in `package.json` and that the code handles their absence at runtime.

## References

- [Node.js Compatibility Table](https://node.green/)
- [Loci Version Boundaries](./references/version-boundaries.md)
