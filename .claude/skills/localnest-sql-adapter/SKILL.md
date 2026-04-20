---
name: localnest-sql-adapter
description: "Use when changing LocalNest SQLite-backed indexing or memory code, especially adapter boundaries, extension loading, migrations, backend fallback behavior, or sqlite-vec runtime loading."
user-invocable: false
---

# LocalNest SQL Adapter

Use this skill when working on LocalNest database access in:
- `src/services/retrieval/sqlite-vec/`
- `src/services/memory/`
- `src/app/create-services.ts`
- runtime/setup code that selects SQLite backends

## Quick Start

1. Find direct DB bindings first.
2. Separate adapter-selection changes from query/schema changes.
3. Preserve current Node 22 behavior unless the task explicitly changes defaults.
4. Test retrieval and memory paths independently.

## Workflow

### 1. Map the current DB entry points

Check for:
- direct imports of `node:sqlite`
- direct DB constructors
- extension loading calls
- transaction wrappers
- schema and migration helpers

### 2. Contain the blast radius

When introducing a new adapter or backend path:
- keep query semantics unchanged first
- avoid mixing schema edits with adapter refactors
- keep the active default path identical for current users until compatibility is proven

### 3. Verify extension-sensitive behavior

For sqlite-vec work, confirm:
- connection creation allows extension loading
- `vec0` path resolution still works
- status output reports whether the extension actually loaded

### 4. Test both data planes

Do not stop at retrieval tests if memory also touches SQLite.
At minimum, cover:
- index creation
- re-index and update behavior
- semantic search fallback behavior
- memory backend detection and status

## Guardrails

- Do not eagerly import `node:sqlite` from general-purpose barrel modules.
- Prefer lazy imports for sqlite-specific code paths.
- If adding compatibility adapters, keep them behind explicit selection until verified.
- Surface adapter and backend choice in status output so failures are diagnosable.

## Reference

- [checklist.md](./references/checklist.md)
