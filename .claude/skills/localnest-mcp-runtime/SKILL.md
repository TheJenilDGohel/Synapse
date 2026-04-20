---
name: localnest-mcp-runtime
description: "Use when changing LocalNest MCP startup, setup, doctor, config generation, tool wiring, installed-package behavior, or runtime fallback behavior across environments."
user-invocable: false
---

# LocalNest MCP Runtime

Use this skill when touching:
- `scripts/runtime/`
- `src/mcp/`
- `src/app/`
- client config generation or setup and doctor flows

## Quick Start

1. Test the installed CLI path, not only the repo source path.
2. Treat setup, doctor, and server startup as separate runtime surfaces.
3. Prefer explicit warnings and controlled fallback over raw module errors.

## Workflow

### 1. Reproduce on the runtime surface

Choose the narrowest entry point:
- `localnest setup`
- `localnest doctor`
- `localnest start`
- MCP tool status and index tools

### 2. Check import timing

For runtime compatibility bugs, inspect:
- barrel exports
- top-level imports in CLI and setup code
- lazy imports intended to protect optional backends

### 3. Keep setup honest

Setup should:
- detect incompatible Node and runtime constraints early
- choose safe defaults for unsupported environments
- explain disabled features precisely

### 4. Keep doctor useful

Doctor and status output should answer:
- what backend is active
- why a fallback happened
- what the user must install or upgrade

## Guardrails

- Never rely on a fallback that can be bypassed by an earlier top-level import.
- Avoid setup flows that recommend unsupported defaults.
- Keep user-facing warnings concrete: feature, reason, required version, action.
- When packaging changes matter, inspect the installed global package as well as local source.

## Reference

- [smoke-tests.md](./references/smoke-tests.md)
