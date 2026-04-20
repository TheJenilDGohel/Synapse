---
phase: 41-resource-links-mcp-spec
plan: 01
subsystem: mcp-common-framework
tags: [rlink, mime, resource-link, tool-utils, framework, mcp-2025-06-18]
requires:
  - src/mcp/common/tool-utils.ts
  - src/mcp/common/schemas.ts
  - "@modelcontextprotocol/sdk ResourceLinkSchema"
provides:
  - getMimeTypeFromPath(absPath) -> string | undefined
  - buildResourceLink(absPath, description?) -> ResourceLink
  - ResourceLink interface (type='resource_link', uri, name, description?, mimeType?)
  - ToolResponseOptions.resourceLinks channel
  - ToolResponsePayload.resource_links channel
  - toolResult(result, format, title, resourceLinks?) 4-arg signature
affects:
  - src/mcp/common/mime.ts (new)
  - src/mcp/common/tool-utils.ts (additive extension)
  - src/mcp/common/index.ts (barrel re-exports)
tech-stack:
  added: []
  patterns:
    - "Additive interface widening (ToolResult.content union)"
    - "Optional-arg precedence (explicit 4th arg > payload channel)"
    - "Readonly frozen lookup table (Object.freeze mime map)"
key-files:
  created:
    - src/mcp/common/mime.ts
  modified:
    - src/mcp/common/tool-utils.ts
    - src/mcp/common/index.ts
decisions:
  - "Explicit 4th resourceLinks parameter on toolResult() takes precedence over payload.resource_links channel; zero-ambiguity merge rule for Plan 02"
  - "file://${path.resolve(p)} URI format (not file:/// literal triple-slash) — POSIX yields canonical file:///abs, Windows yields file://C:\\ matching VS Code's MCP convention"
  - "17-entry mime table (spec required ≥16): .ts .tsx .js .jsx .mjs .cjs .json .md .yaml .yml .toml .py .go .rs .html .css .txt"
  - "ToolResult.content union is additive — text-only callers stay type-compatible without churn"
requirements:
  - RLINK-03
metrics:
  duration_seconds: 200
  tasks_completed: 3
  files_changed: 3
  commits: 3
  completed_date: 2026-04-13
---

# Phase 41 Plan 01: Resource-Link Framework Primitives Summary

**One-liner:** MCP 2025-06-18 resource_link plumbing — new mime helper, ResourceLink type, and a 4th-parameter channel through ToolResponsePayload/toolResult that leaves every existing caller byte-identical.

## What Was Built

### 1. `src/mcp/common/mime.ts` (new, 79 lines)

Three symbols, zero runtime deps beyond `node:path`:

| Symbol | Kind | Purpose |
|---|---|---|
| `ResourceLink` | `interface` | Strict subset of MCP SDK ResourceLinkSchema — only `type`, `uri`, `name`, `description?`, `mimeType?`. Intentionally omits `size`, `icons`, `annotations`, `_meta`, `title`. |
| `getMimeTypeFromPath(absPath)` | `function` | Returns MIME string or `undefined`. Extension lookup is case-insensitive (`path.extname().toLowerCase()`). |
| `buildResourceLink(absPath, description?)` | `function` | Returns a canonical `{ type: 'resource_link', uri, name, description?, mimeType? }` block. Uses `path.resolve()` so relative paths still work, produces `file://` URIs. |

**Mime table — 17 entries** (plan floor was 16):
`.ts` `.tsx` → text/typescript
`.js` `.jsx` `.mjs` `.cjs` → text/javascript
`.json` → application/json
`.md` → text/markdown
`.yaml` `.yml` → text/yaml
`.toml` → text/toml
`.py` → text/x-python
`.go` → text/x-go
`.rs` → text/x-rust
`.html` → text/html
`.css` → text/css
`.txt` → text/plain

Frozen via `Object.freeze` so callers cannot mutate at runtime.

### 2. `src/mcp/common/tool-utils.ts` (301 lines, was 260 — still ≤320 budget)

Four surgical edits, all additive:

**Edit A — Import (line 3):**
```typescript
import type { ResourceLink } from './mime.js';
```

**Edit B — `ToolResult.content[]` union broadened:**
```typescript
interface ToolResult {
  structuredContent: { data: unknown; meta: Record<string, unknown> };
  content: Array<
    | { type: 'text'; text: string }
    | ResourceLink
  >;
}
```
Existing text-only emitters stay type-compatible — the union is a superset of the pre-Phase-41 shape.

**Edit C — Payload channel threaded through 5 surfaces:**
- `ToolResponseOptions.resourceLinks?: ResourceLink[]` — handler-facing option.
- `ToolResponsePayload.resource_links?: ResourceLink[]` — wire field (snake_case to match MCP spec style).
- `createToolResponse(data, { resourceLinks })` — only writes the field when the array is non-empty, keeping existing payloads byte-identical.
- `NormalizedPayload.resourceLinks: ResourceLink[]` — always an array (empty for non-file tools).
- `normalizeToolResponsePayload` — reads `payload.resource_links` defensively (`Array.isArray` guard), falls back to `[]`.

**Edit D — `toolResult()` now 4-arg:**
```typescript
export function toolResult(
  result: unknown,
  responseFormat: string = 'json',
  markdownTitle: string = 'Result',
  resourceLinks?: ResourceLink[]
): ToolResult
```

**Precedence rule (zero-ambiguity for Plan 02):**
```typescript
const effectiveLinks = (resourceLinks && resourceLinks.length > 0)
  ? resourceLinks             // explicit 4th arg wins
  : normalized.resourceLinks; // fall back to payload channel
```

If `effectiveLinks.length > 0`, links are appended to `content[]` **after** the text block. If zero, behavior is byte-identical to the pre-Phase-41 3-arg signature (RLINK-03 fallback guarantee).

### 3. `src/mcp/common/index.ts` (36 lines, was 32 — still ≤45 budget)

Three new re-exports at EOF:
```typescript
export { getMimeTypeFromPath, buildResourceLink } from './mime.js';
export type { ResourceLink } from './mime.js';
```

Plan 02 handlers import from `./common` or `./common/mime.js` — both paths work.

## Commits

| Hash | Task | Message |
|---|---|---|
| `3a319d3` | 1 | feat(41-01): add mime helper with ResourceLink type and buildResourceLink |
| `eab796a` | 2 | feat(41-01): thread resource_links through ToolResponsePayload and toolResult |
| `bb5104c` | 3 | feat(41-01): re-export mime helpers and ResourceLink type from common barrel |

## Verification Results

| Check | Status |
|---|---|
| `npm run build` (tsc, 0 errors) | PASS |
| `npm test` — 165 pass / 0 fail / 0 skip | PASS (baseline preserved) |
| `src/mcp/common/mime.ts` ≤ 80 lines | PASS (79) |
| `src/mcp/common/tool-utils.ts` ≤ 320 lines | PASS (301) |
| `src/mcp/common/index.ts` ≤ 45 lines | PASS (36) |
| Zero files touched under `src/mcp/tools/` | PASS |
| Zero files touched under `test/` | PASS |
| Runtime: legacy 1-arg `toolResult(data)` works | PASS |
| Runtime: legacy 3-arg `toolResult(data, fmt, title)` works | PASS |
| Runtime: explicit 4th arg emits 2 content blocks | PASS |
| Runtime: payload channel emits 2 content blocks | PASS |
| Runtime: explicit 4th arg takes precedence over payload channel | PASS |
| Runtime: `createToolResponse(data)` (no links) omits `resource_links` key | PASS |

## Plan 02 — Exact Contract

Plan 02's handlers in `src/mcp/tools/retrieval.ts` will import and use:

```typescript
// Option A — barrel (preferred for consistency with existing code):
import { buildResourceLink, getMimeTypeFromPath } from '../common/index.js';
import type { ResourceLink } from '../common/index.js';

// Option B — direct:
import { buildResourceLink, getMimeTypeFromPath } from '../common/mime.js';
import type { ResourceLink } from '../common/mime.js';
```

**Two equivalent plumbing paths available — pick whichever reads better per handler:**

```typescript
// Path 1 — payload channel (recommended: keeps handler return-type uniform):
return createToolResponse(normalized, {
  meta: { ... },
  note: '...',
  resourceLinks: [ buildResourceLink(absPath, `chunk ${start}-${end} of ${total}`) ]
});
// The registrar's toolResult() pickup is automatic via normalizeToolResponsePayload.

// Path 2 — explicit 4th arg (only useful if handler bypasses createToolResponse):
toolResult(data, 'json', 'Title', [ buildResourceLink(absPath, '...') ]);
```

**Behavior guarantees for Plan 02:**
1. `buildResourceLink('/abs/path/foo.ts', 'chunk 10-80 of 320 lines')` returns:
   ```json
   {
     "type": "resource_link",
     "uri": "file:///abs/path/foo.ts",
     "name": "foo.ts",
     "description": "chunk 10-80 of 320 lines",
     "mimeType": "text/typescript"
   }
   ```
2. Unknown extensions → `mimeType` field is omitted (not `undefined`, not `null`).
3. Empty/undefined `description` → `description` field is omitted.
4. `resourceLinks: []` (empty array) → `content[]` stays at length 1 (text only).
5. `content[]` ordering is always `[text, link1, link2, ...]` — text is always first.
6. `structuredContent.data` is untouched by the resource_link channel — Plan 02 tests can assert no-drift on `structuredContent`.

**For dedup across multiple matches in `search_code` / `search_files`:** Plan 02 must dedupe by absolute path *before* calling `buildResourceLink` — this plan's helpers are per-path, not per-match.

## Deviations from Plan

None. The plan executed exactly as written.

Minor implementation note: the initial write of `mime.ts` was 82 lines (two over the 80-line target), caused by a 12-line docblock on `buildResourceLink`. Tightened to a 7-line docblock before committing, landing at 79 lines. No behavior change; file structure, exports, and logic all identical to the plan spec.

## Known Stubs

None. Plan 01 is framework-only — no UI rendering, no hardcoded empty values flowing to users. The new `resource_links` field on `ToolResponsePayload` is legitimately optional: non-file tools do not set it, and the absence of the field is the intended "no links" signal.

## Self-Check: PASSED

- File `src/mcp/common/mime.ts` — FOUND
- File `src/mcp/common/tool-utils.ts` — FOUND (modified)
- File `src/mcp/common/index.ts` — FOUND (modified)
- Commit `3a319d3` — FOUND
- Commit `eab796a` — FOUND
- Commit `bb5104c` — FOUND
- Build — PASSES (tsc, 0 errors)
- Baseline tests — PASS (165/165)
