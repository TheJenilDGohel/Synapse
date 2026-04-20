---
name: localnest-node-compat
description: "Use when making LocalNest work cleanly across different Node versions, especially around built-in modules, optional native dependencies, version gating, and compatibility fallbacks."
user-invocable: false
---

# LocalNest Node Compat

Use this skill for Node-version compatibility work, especially when a feature depends on:
- `node:sqlite`
- optional native packages
- Node-specific built-ins or API availability

## Quick Start

1. Determine the exact API and version boundary first.
2. Keep newer Node behavior unchanged unless the task explicitly changes it.
3. Prefer capability gating and fallback over broad engine bumps when the product should still work in reduced mode.

## Workflow

### 1. Identify the real boundary

Do not stop at package `engines`.
Find the exact API dependency:
- module availability
- method availability
- extension-loading support
- native package install and runtime requirements

### 2. Separate install-time from runtime failures

Check both:
- package install failures from native deps
- runtime crashes from unsupported built-ins or imports

### 3. Gate features, not the whole product

When possible:
- keep core MCP and search functionality working
- disable only incompatible features
- print a precise warning with version and action

### 4. Verify the published shape

Compatibility fixes are incomplete until you inspect:
- installed package metadata
- optional vs hard dependencies
- global CLI behavior

## Guardrails

- Avoid static imports of version-gated modules in shared entry points.
- Do not claim support for a Node range unless setup and startup both degrade cleanly there.
- If optional native dependencies are used, status output must explain missing capability.

## Reference

- [version-boundaries.md](./references/version-boundaries.md)
