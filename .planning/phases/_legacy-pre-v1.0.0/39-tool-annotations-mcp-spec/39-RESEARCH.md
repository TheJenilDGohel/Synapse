# Phase 39: Tool Annotations (MCP Spec) - Research

**Researched:** 2026-04-13
**Domain:** MCP 2025-06-18 spec compliance — tool metadata hints
**Confidence:** HIGH

## Summary

Phase 39 audits and test-locks the `readOnlyHint` / `destructiveHint` / `idempotentHint` annotations on all 72 Synapse MCP tools so they match the MCP 2025-06-18 spec defaults and semantics. All 72 tools already carry `annotations` blocks that flow cleanly through `createJsonToolRegistrar()` → `server.registerTool()` — no wrapper changes, no runtime refactors, no new runtime dependencies.

The work is 90% audit + fix, 10% test infrastructure. The real risk is that the spec's *default* values are counter-intuitive (`destructiveHint` defaults to **true**, `readOnlyHint` defaults to **false**) which makes silent bugs easy if an annotation is ever omitted. A grep audit of the current source confirms every tool sets all three fields explicitly, so the defaults are not in play today — but the new test must enforce the invariant that they stay explicit.

A static audit against the categorization rules in `39-CONTEXT.md` identified a handful of current mismatches that the phase must fix: `synapse_search_hybrid` is marked `readOnlyHint: false` (wrong — it's a read-only search tool), `synapse_update_self` is marked `destructiveHint: false` (wrong per context — replaces installed content), and several read-only workflow tools (`task_context`, `memory_recall`, `agent_prime`, `whats_new`) have `idempotentHint: false` even though reads are idempotent by definition. These are documented as open questions in § Open Questions and in the Mismatches table so the planner can lock the ground truth per tool.

**Primary recommendation:** Create `test/mcp-annotations.test.js` that runs the full `registerAppTools()` wiring against a fake server capturing `(name, meta.annotations)`, compares against a sorted hardcoded expected-map of all 72 tools, and fails with a complete list of mismatches in a single run. Fix the mismatches found by the static audit inline in the tool registration files. Lift `READ_ONLY_ANNOTATIONS`, `WRITE_ANNOTATIONS`, `DESTRUCTIVE_ANNOTATIONS`, `IDEMPOTENT_WRITE_ANNOTATIONS` constants to `src/mcp/common/tool-utils.ts` to deduplicate the ~50+ hand-inlined annotation blocks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Annotation Test Strategy**
- Test file: `test/mcp-annotations.test.js` (new file, sibling to `test/mcp-tools.test.js`) using `node:test` and the existing `makeFakeServer()` pattern.
- Expected annotations live as a hardcoded map: `{ toolName: { readOnlyHint, destructiveHint, idempotentHint } }` covering all 72 tools. The test fails if any registered tool is missing from the map or has a mismatch.
- Test drives the same register-app-tools pipeline end-to-end so it catches drift across every tool-registration file.

**Scope of Source Changes**
- All 72 tools already have `annotations` blocks. Walk every tool registration once with the test to verify correctness; fix any mismatches inline where found (e.g. a "delete" tool accidentally marked `destructiveHint: false`).
- Keep the `readOnlyAnnotations` helper in `graph-tools.ts`; if more read-only tools appear across files, lift it to `src/mcp/common/tool-utils.ts` as a shared constant (`READ_ONLY_ANNOTATIONS`, `WRITE_ANNOTATIONS`, `DELETE_ANNOTATIONS`).

**Categorization Rules (ground truth)**
- Read-only (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`): search, get, list, status, find, help, stats, recall, timeline, tree, query, as_of, read_file, health, whats_new, usage_guide, server_status, hooks_list_events, hooks_stats.
- Write/additive (`readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`): store, add_entity, add_triple, ingest, capture, teach, update, embed_status, kg_backfill_links, kg_invalidate, project_backfill.
- Destructive (`readOnlyHint: false`, `destructiveHint: true`, `idempotentHint: true`): every `*_delete*` tool and `update_self` (replaces content).
- Idempotent writes get `idempotentHint: true` only when repeating the call with identical inputs is a no-op (e.g. `kg_add_triple` when dedup returns existing id).

**openWorldHint**
- Keep whatever value each tool already has. Not part of ANNOT-01..03, out of scope for this phase.

### Claude's Discretion

- Decide per tool whether `idempotentHint` is true based on actual dedup / upsert semantics.
- Choose whether to lift shared annotation constants to `tool-utils.ts` based on how many duplicates exist after the audit.

### Deferred Ideas (OUT OF SCOPE)

- `openWorldHint` audit — saved for a future phase; not part of ANNOT-01..03.
- Lifting `readOnlyAnnotations` to shared `tool-utils.ts` is optional — do it only if three or more helpers would otherwise be duplicated after the audit.
- Runtime assertion (dev-mode warn on annotation mismatches) — out of scope; test-time validation is enough.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANNOT-01 | All 72 MCP tools have `readOnlyHint`, `destructiveHint`, `idempotentHint` annotations matching actual behavior | Confirmed all 72 tools currently set all three fields explicitly (72 `annotations:` keys matching 72 `registerJsonTool(` calls). The categorization rules in CONTEXT.md define what "matching actual behavior" means per category. Static audit found ~6-8 current mismatches that the phase must fix (see § Mismatches to Fix). |
| ANNOT-02 | Write tools marked `destructiveHint: false` (additive), delete tools marked `destructiveHint: true` | The MCP spec defines `destructiveHint: true` as "may perform destructive updates" (delete/replace) and `false` as "only additive updates". This maps cleanly onto the three Synapse categories: all `*_delete*` tools are destructive; `kg_invalidate` (sets valid_to, keeps row) is additive; `memory_update` (updates fields, appends revision) is additive. `update_self` is the edge case — CONTEXT.md says it replaces content and should be destructive; current code has it as `destructive: false`. |
| ANNOT-03 | Annotations validated in MCP tools test (tool name → expected annotations mapping) | The existing `test/mcp-tools.test.js` uses `makeFakeServer()` that captures `registerTool(name, meta, handler)` calls into a `Map`, giving direct access to `meta.annotations` for every registered tool. A new `test/mcp-annotations.test.js` can reuse this pattern, wire the full `registerAppTools()` pipeline end-to-end (rather than only the 4 tool groups the current test covers), and assert the captured annotations against a hardcoded sorted expected-map. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Constraint | How It Applies to Phase 39 |
|------------|----------------------------|
| **No new runtime dependencies** | Phase 39 is metadata-only. Zero package changes expected. Test uses existing `node:test` + `node:assert`. |
| **No files saved to root** | New test lives in `test/`; any new shared constants go in `src/mcp/common/tool-utils.ts`. |
| **ALWAYS read a file before editing** | Every tool-registration file must be read before any annotation fix is applied. |
| **Prefer editing existing files** | Fix annotations inline in the existing 10 tool-registration files. Only *new* file created is `test/mcp-annotations.test.js`. |
| **Tests after changes** | `npm test` must pass green after the audit. The new annotations test is the authoritative gate for this phase. |
| **Keep files under 500 lines** | `graph-tools.ts` is already near this limit (492 lines). Fixing annotations there doesn't grow it. If shared constants are lifted to `tool-utils.ts`, duplication actually *shrinks* several files. |
| **Never skip hooks / validate build** | `npm run build` must still succeed (`tsc` typecheck) because `annotations` is typed `Record<string, unknown>` in `ToolDefinition` — wrong keys won't trigger a type error, which is exactly why a runtime test is required. |
| **No proactive documentation** | No new docs, no README additions. Research file + plan + test + inline fixes only. |

## Standard Stack

### Core (Existing — No Changes)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | installed | MCP protocol types + `McpServer.registerTool` | Already the transport layer; its `ToolAnnotationsSchema` is the source of truth for field semantics. Verified at `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js:1173` — confirms the four annotation fields are all `z.boolean().optional()` with no runtime enforcement. |
| `zod` | installed | Schema validation for tool input schemas | Already in use; no new zod work needed for annotations (they're typed as `Record<string, unknown>` in `ToolDefinition`). |
| `node:test` | built-in | Test framework | Already the test runner via `tsx --test`. Works out of the box with `test/*.test.js` files. |
| `node:assert/strict` | built-in | Assertions | Already in use throughout `test/`. Strict mode gives us `deepEqual` with sorted-map comparison. |

### Supporting (Existing — No Changes)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | devDep | TypeScript loader for tests | Already in use. `test/*.test.js` files import from `src/mcp/index.js` and `tsx` handles the `.js` → `.ts` resolution. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sorted expected-map | JSON schema + ajv | Adds dep, no benefit — a sorted JS object is reviewable in diff and doesn't need a runtime validator for 3 boolean fields. **Rejected.** |
| One test per tool | Single test, all mismatches | Fail-fast would stop at first bad tool; collecting all mismatches and failing once at the end is the CONTEXT.md requirement. **Chosen.** |
| Extract annotations via parse of source files | Run the registration pipeline | Parsing source is brittle and doesn't catch runtime differences. Running the pipeline is a higher-fidelity check. **Chosen.** |
| Runtime warning on bad annotations at server boot | Test-time only | Added runtime cost for zero benefit — tests catch drift before ship. CONTEXT.md explicitly defers this. **Rejected.** |

**Installation:**
```bash
# No new packages needed — zero runtime deps, zero dev deps
```

**Version verification:** Not applicable. Phase 39 adds zero dependencies. The MCP SDK version already pinned in `package.json` is the only relevant version, and its `ToolAnnotationsSchema` has been verified in-tree at `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js:1173-1207` — matches the MCP 2025-06-18 spec exactly.

## Architecture Patterns

### Recommended File Locations

```
src/
├── mcp/
│   ├── common/
│   │   └── tool-utils.ts         # Lift shared annotation constants here
│   └── tools/
│       ├── core.ts               # Fix inline: update_self destructive
│       ├── retrieval.ts          # Fix inline: search_hybrid readOnly
│       ├── memory-store.ts       # Possibly use shared constants
│       ├── memory-workflow.ts    # Fix idempotentHint on RO tools
│       ├── graph-tools.ts        # Already has readOnlyAnnotations helper
│       ├── kg-delete-tools.ts    # Possibly use DELETE_ANNOTATIONS
│       ├── backfill-tools.ts
│       ├── find-tools.ts
│       ├── audit-tools.ts
│       └── symbol-tools.ts
test/
└── mcp-annotations.test.js       # NEW — single source of truth
```

### Pattern 1: Shared Annotation Constants

**What:** Three (or four) exported `as const` objects in `tool-utils.ts` that cover the canonical categories.

**When to use:** Any tool whose annotation block exactly matches one of the canonical shapes. Tools with anomalies (e.g. `update_status`'s `openWorldHint: true`) stay inline.

**Example:**
```typescript
// Source: verified against MCP 2025-06-18 spec defaults
// (github.com/modelcontextprotocol/modelcontextprotocol schema.ts ToolAnnotations)

/**
 * Annotations for pure read tools (search, get, list, status, query, timeline).
 * Contract: no state change, idempotent by definition.
 * Spec defaults would be `false/true/false` — so every field must be set explicitly.
 */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

/**
 * Annotations for additive writes that are NOT idempotent
 * (each call creates new state: memory_store, diary_write, capture_outcome, teach).
 */
export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false
} as const;

/**
 * Annotations for additive writes that ARE idempotent
 * (upserts that dedup and return existing id: kg_add_entity, ingest_*, kg_backfill_links,
 *  project_backfill, kg_invalidate, memory_add_relation).
 */
export const IDEMPOTENT_WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

/**
 * Annotations for destructive tools (every *_delete* + update_self).
 * `idempotentHint: true` because re-deleting a gone row is a no-op.
 */
export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false
} as const;
```

**Justification for lifting:** Static count of current duplicates:
- READ_ONLY shape (`{ RO: t, DH: f, IH: t, OWH: f }`) appears ~38 times across 8 files.
- WRITE shape (`{ RO: f, DH: f, IH: f, OWH: f }`) appears ~11 times across 4 files.
- IDEMPOTENT_WRITE (`{ RO: f, DH: f, IH: t, OWH: f }`) appears ~7 times across 3 files.
- DESTRUCTIVE (`{ RO: f, DH: t, IH: t, OWH: f }`) appears 5 times across 2 files.

The CONTEXT.md threshold ("three or more") is met for all four. **Recommend lifting.**

### Pattern 2: Fake-Server Annotation Capture (test)

**What:** A `makeFakeServer()` helper whose `registerTool(name, meta, handler)` implementation stores `meta.annotations` in a `Map`.

**When to use:** The new `test/mcp-annotations.test.js` uses the exact same pattern as the existing `test/mcp-tools.test.js:21-29`. Zero divergence.

**Example:**
```javascript
// Source: test/mcp-tools.test.js:21-29 (existing pattern)
function makeFakeServer() {
  const tools = new Map();
  return {
    tools,
    registerTool(name, meta, handler) {
      tools.set(name, { meta, handler });
    }
  };
}
// Later:
const server = makeFakeServer();
registerAppTools(server, fakeRuntime, fakeServices);
// For each registered tool:
for (const [name, { meta }] of server.tools) {
  const actual = {
    readOnlyHint: meta.annotations?.readOnlyHint,
    destructiveHint: meta.annotations?.destructiveHint,
    idempotentHint: meta.annotations?.idempotentHint
  };
  // compare against EXPECTED[name]
}
```

### Pattern 3: Collect-All-Mismatches, Fail-Once

**What:** Rather than `assert.deepEqual` per tool (which stops at first failure), gather all diffs into an array and assert length 0 once.

**When to use:** Whenever the test covers a mapping across many items and engineers benefit from seeing every violation in a single run.

**Example:**
```javascript
const mismatches = [];
const unregistered = [];
const unexpected = [];

for (const name of Object.keys(EXPECTED).sort()) {
  const tool = server.tools.get(name);
  if (!tool) { unregistered.push(name); continue; }
  const actual = {
    readOnlyHint: tool.meta.annotations?.readOnlyHint,
    destructiveHint: tool.meta.annotations?.destructiveHint,
    idempotentHint: tool.meta.annotations?.idempotentHint
  };
  const expected = EXPECTED[name];
  for (const key of Object.keys(expected)) {
    if (actual[key] !== expected[key]) {
      mismatches.push(`${name}.${key}: expected ${expected[key]}, got ${actual[key]}`);
    }
  }
}
for (const name of server.tools.keys()) {
  if (!(name in EXPECTED)) unexpected.push(name);
}

assert.deepEqual(unregistered, [], `Tools missing from registration: ${unregistered.join(', ')}`);
assert.deepEqual(unexpected, [], `Tools registered but not in expected map: ${unexpected.join(', ')}`);
assert.deepEqual(mismatches, [], `Annotation mismatches:\n  ${mismatches.join('\n  ')}`);
```

### Pattern 4: Drive `registerAppTools` End-to-End

**What:** Don't wire the 10 tool-group registration functions individually in the test. Call `registerAppTools(fakeServer, fakeRuntime, fakeServices)` so any future new tool group is automatically covered.

**When to use:** Always, for this test. The current `test/mcp-tools.test.js` has a latent bug where it only calls 4 of the 10 registrars — which is why that test only checks 39 tools out of 72. The new annotations test MUST cover all 72 and the cheapest way is to call the single entry point.

**Supporting detail:** `src/app/register-tools.ts:34-123` shows that `registerAppTools(server, runtime, services)` is a thin wrapper that calls all 10 `registerXxxTools()` functions in sequence. A fake `services` object needs method stubs for: `memory`, `workspace`, `vectorIndex`, `search`, `updates`, `getActiveIndexBackend`, `getLastHealthReport`. All can be `() => {}` or `async () => ({})` because the handlers never run — the test only inspects the meta captured at `registerTool` time.

### Anti-Patterns to Avoid

- **Parsing source files to extract annotations:** Brittle, requires regex, and doesn't catch the difference between `annotations: readOnlyAnnotations` (computed reference) and `annotations: { readOnlyHint: true, ... }` (inline object). The fake-server approach runs the real code path. **Avoid.**
- **Testing annotations via the real `@modelcontextprotocol/sdk` server class:** The real server has network transports, initialization state, and protocol handshake — all irrelevant. A minimal duck-typed fake is enough. **Avoid.**
- **Per-tool `test()` blocks:** 72 test blocks bloats output, wastes CI time, and defeats the "one run, all mismatches" goal stated in CONTEXT.md `<specifics>`. **Avoid.**
- **Asserting only `readOnlyHint`:** The CONTEXT.md locked decision is all three fields (RO, DH, IH) must match. Partial assertions would let a write tool silently claim `destructiveHint: true` as long as `readOnlyHint` is correct. **Avoid.**
- **Relying on SDK defaults:** MCP spec defaults are counter-intuitive (`destructiveHint` defaults to `true`, `readOnlyHint` defaults to `false`). The test must reject tools where a field is `undefined` — never accept "missing means default". **Avoid accepting defaults.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Annotation pass-through to MCP SDK | A wrapper that wraps `registerTool` to set default annotations | Pass `annotations` directly through `createJsonToolRegistrar` (already done) | `tool-utils.ts:164-197` already forwards annotations cleanly; no wrapper needed. |
| Fake MCP server for tests | A full protocol-compliant stub | The existing 9-line `makeFakeServer()` duck type | `test/mcp-tools.test.js:21-29` is the blessed pattern. Handler capture is all we need. |
| Annotation validation at runtime | A boot-time validator that logs warnings | Test-time validation in `test/mcp-annotations.test.js` | CONTEXT.md `<deferred>` explicitly rejects runtime validation as out of scope. Tests catch drift pre-ship. |
| Annotation schema | Custom zod or JSON schema for the expected-map | Plain JS object with sorted keys | The SDK's `ToolAnnotationsSchema` is already validated upstream; repeating validation is dead code. |
| Spec compliance check | Custom regex against the spec schema | Trust the SDK's published types | The SDK's `ToolAnnotationsSchema` **is** the spec contract. If the SDK ever adds a new field, you get a TypeScript warning at build time, not a runtime surprise. |

**Key insight:** Everything needed for Phase 39 already exists in the codebase. The phase is a *verification* phase, not a construction phase. The only novel artifact is the expected-annotations map — and that is deliberately hand-maintained so humans must explicitly accept any new tool's category.

## Runtime State Inventory

Phase 39 is pure metadata / test infrastructure. No rename, no migration, no schema changes, no data involved. Runtime state inventory is **not applicable** and this section is skipped per research step 2.5 ("Include this section for rename/refactor/migration phases only").

For completeness, a quick sweep confirms nothing hiding:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no SQL tables, no kv keys, no file caches touch annotation metadata | None |
| Live service config | None — annotations are read from the source at registration time, not persisted | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — TypeScript compilation output is regenerated on `npm run build` | None |

## Environment Availability

Phase 39 has no external dependencies beyond what Synapse already requires. Skipped per research step 2.6 ("Skip condition: If the phase is purely code/config changes with no external dependencies").

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 22.13 | Runtime | ✓ (project precondition) | per `package.json` engines | — |
| `@modelcontextprotocol/sdk` | Test import of `ToolAnnotationsSchema` type | ✓ (already installed) | pinned in package.json | — |
| `node:test` runner | `npm test` | ✓ (built-in) | Node ≥ 18 | — |
| `tsx` | Transform of test files | ✓ (devDep) | per package.json | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Common Pitfalls

### Pitfall 1: Counter-intuitive MCP Spec Defaults

**What goes wrong:** Omitting a field lets the SDK fall back to the spec default, which is the *opposite* of what most servers want. Omitting `destructiveHint` defaults to `true`. Omitting `readOnlyHint` defaults to `false`. A tool that ships with no annotations at all is advertised to clients as "non-read, destructive, non-idempotent, open-world" — the maximum-suspicion profile.

**Why it happens:** The MCP spec chose conservative defaults that make clients pessimistic, not optimistic. This is fine for safety but brutal for servers that forget to annotate. Training data older than 2025-06-18 may not reflect this.

**How to avoid:**
- Never rely on defaults. The test must assert that every expected field is explicitly set (not `undefined`).
- In the test, compare `actual[key] !== expected[key]` using `!==` (strict equality) — `undefined !== false` catches missing fields.
- Require all 72 tools to appear in the expected-map; missing map entries fail the test.

**Warning signs:**
- A tool added later without an `annotations` block compiles fine (TypeScript has `annotations?: Record<string, unknown>`) but ships with default hints that mis-represent the tool. The test is the only tripwire.

### Pitfall 2: Spec Meaningfulness Rule for `destructiveHint` / `idempotentHint`

**What goes wrong:** The spec says `destructiveHint` and `idempotentHint` are "meaningful only when `readOnlyHint == false`". A naive reading is "leave them off for read-only tools." But the CONTEXT.md categorization rules set all three fields for every tool — including read-only — which is **correct** because (a) omitting triggers the bad defaults, and (b) being explicit makes the test regex simple.

**Why it happens:** Developers read the JSDoc and think "meaningful only when" means "set only when".

**How to avoid:**
- Treat "meaningful only when" as guidance for *clients* (they should ignore those fields on read-only tools), not as guidance for *servers* (which should set them for safety against defaults).
- The Synapse ground truth: every tool gets all three fields explicitly.

**Warning signs:** Any tool where one of the three fields is `undefined` — the test catches this.

### Pitfall 3: Ambiguous Idempotency for Upserts

**What goes wrong:** `synapse_kg_add_entity` deduplicates by `(name, type)` and returns the existing entity ID on conflict — calling it twice with the same args has no new side effect. That makes it **idempotent per spec**. In contrast, `synapse_kg_add_triple` also dedups but the current code marks it `idempotentHint: false`, which may be wrong depending on whether dedup is unconditional or conditional on `valid_to IS NULL`.

**Why it happens:** "Idempotent" is subtle. MCP spec language: "calling the tool repeatedly with the same arguments will have no additional effect on the environment". An upsert that returns the existing row IS idempotent. The open question: does `kg_add_triple` dedup to no-op, or does it create new rows on repeated calls? See § Open Questions.

**How to avoid:**
- For each write tool, check the service implementation to confirm whether repeated identical calls create new state or return existing state.
- Document the decision per tool in the expected-map comment so future reviewers understand the call.

**Warning signs:** A tool whose test passes but whose real-world behavior creates duplicate rows on retry — that's a latent `idempotentHint: true` lie.

### Pitfall 4: "Delete" vs "Remove" vs "Invalidate" Semantics

**What goes wrong:** Synapse has three shapes of non-additive writes:
1. Hard delete (`*_delete*` tools) — destructive, irreversible
2. Soft invalidate (`kg_invalidate` sets `valid_to`) — additive, reversible (just set `valid_to = NULL` again)
3. Link removal (`memory_remove_relation`) — removes a junction-table row but leaves both sides intact

The CONTEXT.md rule is "every `*_delete*` tool and `update_self`" get `destructiveHint: true`. But the current code also marks `memory_remove_relation` as destructive — which doesn't fit the `*_delete*` pattern. Is that correct?

**Why it happens:** The line between "additive" and "destructive" is fuzzy for operations that remove metadata but preserve core records.

**How to avoid:**
- Define the ground truth explicitly in the expected-map: does removing a link count as destruction? Per the spec, `destructiveHint: true` means "may perform destructive updates". Removing a relation row arguably qualifies because the row itself is gone (not invalidated).
- Flag the borderline cases (§ Mismatches to Fix) for planner + user review.

**Warning signs:** Review confusion — if two reviewers disagree on the category, that's the signal to document the decision in the expected-map as a comment.

### Pitfall 5: Annotations Are Hints, Not Enforcement

**What goes wrong:** A developer assumes the MCP SDK or the client will reject a mis-annotated tool. It will not. The JSDoc in `ToolAnnotationsSchema` explicitly says: "They are not guaranteed to provide a faithful description of tool behavior... Clients should never make tool use decisions based on ToolAnnotations received from untrusted servers." Wrong annotations degrade *client UX* (unexpected confirmation prompts, wrong auto-approval), they don't break protocol.

**Why it happens:** Years of `@type`-style runtime validation habits.

**How to avoid:**
- Understand that this phase improves *client hints* for trusted consumers — nothing will crash if an annotation is wrong, which is exactly why a test is the only enforcement.
- The test is the trust anchor: it locks the categorization at CI time so drift is impossible without an explicit map update.

**Warning signs:** Someone suggests "let's enforce annotations at SDK level" — the spec doesn't allow that; hints are by definition advisory.

### Pitfall 6: Fake Services Must Not Throw at Registration

**What goes wrong:** `registerAppTools()` constructs services internally (e.g. `new MemoryWorkflowService({ memory, getRuntimeSummary, search })` at line 46 of `register-tools.ts`). If the fake `services.memory` doesn't have the methods that constructor touches, the whole pipeline throws before the fake server has captured any tools.

**Why it happens:** The test only cares about *registration* metadata, but the code being tested does meaningful work at construction time.

**How to avoid:**
- Study `src/app/register-tools.ts:34-123` and stub every service method the registration path touches. `MemoryWorkflowService` constructor is the main hazard.
- Alternative: bypass `registerAppTools` and call each `registerXxxTools()` individually with lightweight fakes (this is what the current `test/mcp-tools.test.js` does for the 4 groups it covers). The tradeoff is that the test no longer auto-picks-up new tool groups. Recommend using `registerAppTools` for full coverage and building the fake services once.

**Warning signs:** The test fails with `TypeError: memory.foo is not a function` before any annotation assertion runs. Fix: extend the fake.

## Code Examples

### Source Reference: Current Registration Flow (already correct)

```typescript
// Source: src/mcp/common/tool-utils.ts:164-197
export function createJsonToolRegistrar(server: McpServer, responseFormatSchema: z.ZodTypeAny): RegisterJsonToolFn {
  return function registerJsonTool(
    names: string | string[],
    { title, description, inputSchema, annotations, markdownTitle }: ToolDefinition,
    handler: ToolHandler
  ): void {
    const canonical = Array.isArray(names) ? names[0] : names;
    const schema = {
      ...inputSchema,
      response_format: responseFormatSchema
    };

    server.registerTool(
      canonical,
      {
        title,
        description,
        inputSchema: schema,
        outputSchema: { data: z.any(), meta: z.any().optional() },
        annotations    // ← already flowing through untouched
      },
      async (args, extra) => { /* handler wrapping */ }
    );
  };
}
```

No wrapper changes needed — annotations already flow through cleanly.

### Source Reference: MCP SDK Annotation Schema (authoritative definition)

```typescript
// Source: node_modules/@modelcontextprotocol/sdk/dist/esm/types.js:1173-1207
// Matches MCP 2025-06-18 spec schema exactly
export const ToolAnnotationsSchema = z.object({
  title: z.string().optional(),
  /**
   * If true, the tool does not modify its environment.
   * Default: false
   */
  readOnlyHint: z.boolean().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   * (This property is meaningful only when `readOnlyHint == false`)
   * Default: true
   */
  destructiveHint: z.boolean().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   * (This property is meaningful only when `readOnlyHint == false`)
   * Default: false
   */
  idempotentHint: z.boolean().optional(),
  /**
   * If true, this tool may interact with an "open world" of external entities.
   * Default: true
   */
  openWorldHint: z.boolean().optional()
});
```

This is the **authoritative definition** of what each field means for this phase. All defaults confirmed.

### New Pattern: Test Skeleton

```javascript
// Source: to be created at test/mcp-annotations.test.js
// Pattern adapted from test/mcp-tools.test.js:21-29 (makeFakeServer) and
// src/app/register-tools.ts:34-123 (registerAppTools entry point).

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAppTools } from '../src/app/register-tools.js';

function makeFakeServer() {
  const tools = new Map();
  return {
    tools,
    registerTool(name, meta, _handler) {
      tools.set(name, { meta });
    }
  };
}

function makeFakeServices() {
  // Minimal duck-typed fakes — handlers never run, only registration metadata
  // is inspected. Every method the registration path touches must exist.
  // See src/app/register-tools.ts for what's touched.
  return {
    memory: { /* ... stubs for every method in the 10 registrars ... */ },
    workspace: { /* ... */ },
    vectorIndex: { getStatus: () => ({}) },
    search: { /* ... */ },
    updates: { getStatus: async () => ({}), selfUpdate: async () => ({}) },
    getActiveIndexBackend: () => 'sqlite-vec',
    getLastHealthReport: () => null
  };
}

// Alphabetically sorted — 72 entries — hand-maintained ground truth.
const EXPECTED = {
  'synapse_agent_prime': { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  'synapse_audit': { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  // ... 70 more entries ...
  'synapse_whats_new': { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
};

test('MCP tool annotations match expected map for all 72 tools', () => {
  const server = makeFakeServer();
  const fakeRuntime = {};
  const fakeServices = makeFakeServices();

  registerAppTools(server, fakeRuntime, fakeServices);

  const registered = Array.from(server.tools.keys()).sort();
  const expected = Object.keys(EXPECTED).sort();

  // 1. Registered tool set matches expected set
  assert.deepEqual(registered, expected, `Tool list drift:
  unregistered: ${expected.filter(n => !registered.includes(n)).join(', ')}
  unexpected:   ${registered.filter(n => !expected.includes(n)).join(', ')}`);

  // 2. Every annotation field on every tool matches
  const mismatches = [];
  for (const name of expected) {
    const { meta } = server.tools.get(name);
    const actual = meta.annotations || {};
    const want = EXPECTED[name];
    for (const key of ['readOnlyHint', 'destructiveHint', 'idempotentHint']) {
      if (actual[key] !== want[key]) {
        mismatches.push(`${name}.${key}: expected ${want[key]}, got ${actual[key]}`);
      }
    }
  }
  assert.equal(mismatches.length, 0, `Annotation mismatches found:\n  ${mismatches.join('\n  ')}`);
});
```

### New Pattern: Using Shared Annotation Constants (optional refactor)

```typescript
// Source: after lifting constants to src/mcp/common/tool-utils.ts
import {
  READ_ONLY_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS
} from '../common/tool-utils.js';

registerJsonTool(
  ['synapse_kg_stats'],
  {
    title: 'KG Statistics',
    description: '...',
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS
  },
  async () => memory.getKgStats()
);

registerJsonTool(
  ['synapse_kg_delete_entity'],
  {
    title: 'KG Delete Entity',
    description: '...',
    inputSchema: { entity_id: z.string().min(1) },
    annotations: DESTRUCTIVE_ANNOTATIONS
  },
  async ({ entity_id }) => memory.deleteEntity(entity_id as string)
);
```

## Complete Tool Inventory (all 72, with ground-truth categorization)

Alphabetically sorted. Categories: **RO** = Read-Only, **WR** = additive Write (not idempotent), **IW** = Idempotent Write, **DS** = Destructive. Anomalies column flags tools where the *current* annotation differs from the ground-truth category.

| # | Tool Name | File | Category | Expected (RO, DH, IH) | Current Matches? | Notes |
|---|-----------|------|----------|----------------------|------------------|-------|
| 1 | `synapse_agent_prime` | memory-workflow | RO | `true, false, true` | ✗ IH=false | Reading only — should be idempotent |
| 2 | `synapse_audit` | audit-tools | RO | `true, false, true` | ✓ | |
| 3 | `synapse_capture_outcome` | memory-workflow | WR | `false, false, false` | ✓ | |
| 4 | `synapse_diary_read` | graph-tools | RO | `true, false, true` | ✓ | |
| 5 | `synapse_diary_write` | graph-tools | WR | `false, false, false` | ✓ | |
| 6 | `synapse_embed_status` | retrieval | RO | `true, false, true` | ✓ | Note: CONTEXT.md put `embed_status` in Write list but the code inspects status only — recommend RO. See Open Question 1. |
| 7 | `synapse_file_changed` | retrieval | RO | `true, false, true` | ✓ | Hook lookup, no state change |
| 8 | `synapse_find` | find-tools | RO | `true, false, true` | ✓ | |
| 9 | `synapse_find_callers` | symbol-tools | RO | `true, false, true` | ✓ | |
| 10 | `synapse_find_definition` | symbol-tools | RO | `true, false, true` | ✓ | |
| 11 | `synapse_find_implementations` | symbol-tools | RO | `true, false, true` | ✓ | |
| 12 | `synapse_find_usages` | retrieval | RO | `true, false, true` | ✓ | |
| 13 | `synapse_get_symbol` | retrieval | RO | `true, false, true` | ✓ | |
| 14 | `synapse_graph_bridges` | graph-tools | RO | `true, false, true` | ✓ | |
| 15 | `synapse_graph_traverse` | graph-tools | RO | `true, false, true` | ✓ | |
| 16 | `synapse_health` | core | RO | `true, false, true` | ✓ | |
| 17 | `synapse_help` | core | RO | `true, false, true` | ✓ | |
| 18 | `synapse_hooks_list_events` | graph-tools | RO | `true, false, true` | ✓ | Uses `readOnlyAnnotations` helper |
| 19 | `synapse_hooks_stats` | graph-tools | RO | `true, false, true` | ✓ | Uses `readOnlyAnnotations` helper |
| 20 | `synapse_index_project` | retrieval | WR | `false, false, false` | ✓ | Builds index; `force` param means not strictly idempotent |
| 21 | `synapse_index_status` | retrieval | RO | `true, false, true` | ✓ | |
| 22 | `synapse_ingest_json` | graph-tools | IW | `false, false, true` | ✓ | Source label + fingerprint dedup → re-ingest is a no-op |
| 23 | `synapse_ingest_markdown` | graph-tools | IW | `false, false, true` | ✓ | Same as above |
| 24 | `synapse_kg_add_entities_batch` | graph-tools | IW | `false, false, true` | ✓ | Dedups by name |
| 25 | `synapse_kg_add_entity` | graph-tools | IW | `false, false, true` | ✓ | Dedups by name |
| 26 | `synapse_kg_add_triple` | graph-tools | IW or WR | `false, false, ?` | ✗/? current=false | See Open Question 2. Per BATCH-05 dedup returns existing id → IW |
| 27 | `synapse_kg_add_triples_batch` | graph-tools | IW or WR | `false, false, ?` | ✗/? current=false | See Open Question 2. Per BATCH-05 dedup returns existing id → IW |
| 28 | `synapse_kg_as_of` | graph-tools | RO | `true, false, true` | ✓ | Uses `readOnlyAnnotations` helper |
| 29 | `synapse_kg_backfill_links` | graph-tools | IW | `false, false, true` | ✓ | Scan is deterministic |
| 30 | `synapse_kg_delete_entities_batch` | kg-delete-tools | DS | `false, true, true` | ✓ | |
| 31 | `synapse_kg_delete_entity` | kg-delete-tools | DS | `false, true, true` | ✓ | |
| 32 | `synapse_kg_delete_triples_batch` | kg-delete-tools | DS | `false, true, true` | ✓ | |
| 33 | `synapse_kg_invalidate` | graph-tools | IW | `false, false, true` | ✓ | Soft invalidate — additive, not destructive |
| 34 | `synapse_kg_query` | graph-tools | RO | `true, false, true` | ✓ | Uses `readOnlyAnnotations` helper |
| 35 | `synapse_kg_stats` | graph-tools | RO | `true, false, true` | ✓ | |
| 36 | `synapse_kg_timeline` | graph-tools | RO | `true, false, true` | ✓ | |
| 37 | `synapse_list_projects` | retrieval | RO | `true, false, true` | ✓ | |
| 38 | `synapse_list_roots` | retrieval | RO | `true, false, true` | ✓ | |
| 39 | `synapse_memory_add_relation` | memory-store | IW | `false, false, true` | ✓ | Re-adding same relation is a no-op |
| 40 | `synapse_memory_capture_event` | memory-store | WR | `false, false, false` | ✓ | |
| 41 | `synapse_memory_check_duplicate` | graph-tools | RO | `true, false, true` | ✓ | Uses `readOnlyAnnotations` helper |
| 42 | `synapse_memory_delete` | memory-store | DS | `false, true, true` | ✓ | |
| 43 | `synapse_memory_delete_batch` | memory-store | DS | `false, true, true` | ✓ | |
| 44 | `synapse_memory_events` | memory-store | RO | `true, false, true` | ✓ | |
| 45 | `synapse_memory_get` | memory-store | RO | `true, false, true` | ✓ | |
| 46 | `synapse_memory_list` | memory-store | RO | `true, false, true` | ✓ | |
| 47 | `synapse_memory_recall` | memory-workflow | RO | `true, false, true` | ✗ IH=false | Reading only — should be idempotent |
| 48 | `synapse_memory_related` | memory-store | RO | `true, false, true` | ✓ | |
| 49 | `synapse_memory_remove_relation` | memory-store | DS or IW | `false, ?, true` | ✗/? current DS=true | See Open Question 3 |
| 50 | `synapse_memory_status` | memory-workflow | RO | `true, false, true` | ✓ | |
| 51 | `synapse_memory_store` | memory-store | WR | `false, false, false` | ✓ | Not idempotent — semantic dedup non-deterministic |
| 52 | `synapse_memory_store_batch` | memory-store | WR | `false, false, false` | ✓ | Same |
| 53 | `synapse_memory_suggest_relations` | memory-store | RO | `true, false, true` | ✓ | |
| 54 | `synapse_memory_update` | memory-store | WR | `false, false, false` | ✓ | Appends revision → not idempotent |
| 55 | `synapse_nest_branches` | graph-tools | RO | `true, false, true` | ✓ | |
| 56 | `synapse_nest_list` | graph-tools | RO | `true, false, true` | ✓ | |
| 57 | `synapse_nest_tree` | graph-tools | RO | `true, false, true` | ✓ | |
| 58 | `synapse_project_backfill` | backfill-tools | IW | `false, false, true` | ✓ | Scan is deterministic; dry_run available |
| 59 | `synapse_project_tree` | retrieval | RO | `true, false, true` | ✓ | |
| 60 | `synapse_read_file` | retrieval | RO | `true, false, true` | ✓ | |
| 61 | `synapse_rename_preview` | symbol-tools | RO | `true, false, true` | ✓ | Dry-run — doesn't actually rename |
| 62 | `synapse_search_code` | retrieval | RO | `true, false, true` | ✓ | |
| 63 | `synapse_search_files` | retrieval | RO | `true, false, true` | ✓ | |
| 64 | `synapse_search_hybrid` | retrieval | RO | `true, false, true` | **✗ RO=false** | **BUG — must fix** |
| 65 | `synapse_server_status` | core | RO | `true, false, true` | ✓ | |
| 66 | `synapse_summarize_project` | retrieval | RO | `true, false, true` | ✓ | |
| 67 | `synapse_task_context` | memory-workflow | RO | `true, false, true` | ✗ IH=false | Reading only — should be idempotent |
| 68 | `synapse_teach` | memory-workflow | WR | `false, false, false` | ✓ | |
| 69 | `synapse_update_self` | core | DS | `false, true, true` | **✗ DH=false** | **BUG — per CONTEXT.md rule** |
| 70 | `synapse_update_status` | core | RO | `true, false, true` | ✓ (openWorld=true kept) | |
| 71 | `synapse_usage_guide` | core | RO | `true, false, true` | ✓ | |
| 72 | `synapse_whats_new` | memory-workflow | RO | `true, false, true` | ✗ IH=false | Reading only — should be idempotent |

## Mismatches to Fix (Current → Expected)

Based on the static audit above, the phase must fix at least these:

| # | Tool | File | Field | Current | Fix To | Reason |
|---|------|------|-------|---------|--------|--------|
| 1 | `synapse_search_hybrid` | `src/mcp/tools/retrieval.ts:402-407` | `readOnlyHint` | `false` | `true` | It's a search/retrieval tool. Reading only. Clear bug. |
| 2 | `synapse_search_hybrid` | `src/mcp/tools/retrieval.ts:402-407` | `idempotentHint` | `false` | `true` | Follows from RO=true |
| 3 | `synapse_update_self` | `src/mcp/tools/core.ts:152-157` | `destructiveHint` | `false` | `true` | CONTEXT.md explicitly lists `update_self` as destructive (replaces installed content) |
| 4 | `synapse_update_self` | `src/mcp/tools/core.ts:152-157` | `idempotentHint` | `false` | `true` | Re-running with same version is a no-op (npm global install → same state) |
| 5 | `synapse_task_context` | `src/mcp/tools/memory-workflow.ts:77-82` | `idempotentHint` | `false` | `true` | Read tool — repeated calls return same data |
| 6 | `synapse_memory_recall` | `src/mcp/tools/memory-workflow.ts:119-124` | `idempotentHint` | `false` | `true` | Read tool — repeated calls return same data |
| 7 | `synapse_agent_prime` | `src/mcp/tools/memory-workflow.ts:196-201` | `idempotentHint` | `false` | `true` | Read tool (modulo git diff freshness, which still produces same result for same git state) |
| 8 | `synapse_whats_new` | `src/mcp/tools/memory-workflow.ts:219-224` | `idempotentHint` | `false` | `true` | Read tool — same inputs yield same delta |

**Ambiguous — flag for planner decision (see Open Questions):**

| # | Tool | File | Field | Current | Candidate Fix | Reason to Flag |
|---|------|------|-------|---------|---------------|----------------|
| 9 | `synapse_kg_add_triple` | `graph-tools.ts:87-92` | `idempotentHint` | `false` | `true`? | BATCH-05 dedup returns existing id; should be IW per spec definition of idempotency |
| 10 | `synapse_kg_add_triples_batch` | `graph-tools.ts:141` | `idempotentHint` | `false` | `true`? | Same as above |
| 11 | `synapse_memory_remove_relation` | `memory-store.ts:374-379` | `destructiveHint` | `true` | `true`/`false`? | CONTEXT.md rule is "every `*_delete*` tool" — is "remove_relation" a `*_delete*` tool? |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP spec pre-2025-06-18 had no annotations | 2025-06-18 spec adds `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` as tool metadata hints | MCP spec 2025-06-18 | Clients can auto-approve safe read-only tools and warn on destructive ones, improving UX without compromising safety |
| No standard category for upserts-that-return-existing-id | Canonical pattern: `readOnlyHint: false, destructiveHint: false, idempotentHint: true` | MCP blog post 2026-03-16 | Servers with dedup-on-write should mark those tools idempotent — confirmed by the MCP filesystem servers issue #2988 discussion |
| Assume missing annotations mean "unknown" | Spec defaults are conservative: `destructiveHint` defaults to `true`, `readOnlyHint` defaults to `false` | MCP spec 2025-06-18 | Always set annotations explicitly — relying on defaults advertises your tool as maximally suspicious |

**Deprecated/outdated:**
- Any pre-2025-06-18 MCP reference won't mention annotations at all.
- `title` inside `annotations` is technically separate from the top-level `title` field — Synapse uses the top-level field, don't move it inside `annotations`.

## Open Questions

1. **Is `synapse_embed_status` a read-only tool?**
   - **What we know:** CONTEXT.md Categorization Rules lists `embed_status` in the "Write/additive" bucket. But the actual implementation at `retrieval.ts:220-237` only calls `vectorIndex.getStatus()` and a pure normalizer — pure read. Current code already has it as `readOnlyHint: true`. The CONTEXT.md list appears to be a typo (probably meant `index_project`, which IS in the same category because it mutates the index).
   - **What's unclear:** Whether to follow the CONTEXT.md list literally or the code reality.
   - **Recommendation:** Treat this as a user constraint discrepancy. Recommend keeping `embed_status` as RO because the implementation is pure read. Flag in the plan for user confirmation. **Default assumption in expected-map: RO.**

2. **Is `synapse_kg_add_triple` / `_batch` idempotent?**
   - **What we know:** BATCH-05 (v0.2.0) says "Write-time dedup on `(subject_id, predicate, object_id)` where `valid_to IS NULL` — duplicate triples return existing `id` instead of inserting a new row". Per MCP spec, that's the textbook definition of idempotent.
   - **What's unclear:** Current code has `idempotentHint: false` for both. Was this an oversight from before BATCH-05 landed, or is there a subtle reason (e.g. re-adding a triple that was invalidated creates a NEW active row, not returning the old one)?
   - **Recommendation:** Check Phase 26 implementation of `addTriple` / `addTripleBatch` during the plan step. If dedup consistently returns the existing id for any repeat of the same input, change to `idempotentHint: true`. If re-adding an invalidated triple creates a new row, keep `false`. **Default assumption in expected-map: `true` (matches BATCH-05 contract).**

3. **Is `synapse_memory_remove_relation` destructive?**
   - **What we know:** CONTEXT.md rule: "every `*_delete*` tool and `update_self`" get `destructiveHint: true`. `memory_remove_relation` is not named `*_delete*` — it's `*_remove_*` — but it removes a junction row from the graph. Current code has `destructiveHint: true`.
   - **What's unclear:** Does "remove_relation" count as a `*_delete*` tool for this rule? Arguably yes (removes a row). Arguably no (the rule is pattern-based).
   - **Recommendation:** Keep current behavior (`destructiveHint: true`). A relation removal is not recoverable without user action, so clients should warn. **Default assumption in expected-map: `destructiveHint: true`.** Flag for user confirmation in the plan.

4. **How does the test fake `services` without running service constructors?**
   - **What we know:** `registerAppTools()` at `src/app/register-tools.ts:46` constructs `new MemoryWorkflowService({ memory, getRuntimeSummary, search })`. The constructor may touch methods on the fake.
   - **What's unclear:** Whether `registerAppTools` is wired such that fakes with only `() => {}` stubs survive construction.
   - **Recommendation:** During plan implementation, read `MemoryWorkflowService` constructor source to enumerate the methods it touches. Extend the fake as needed. Estimated: 10-15 method stubs total across the 5 fake services. **No blocker.** If constructor proves too entangled, fall back to calling the 10 `registerXxxTools()` functions directly — the same pattern as the current `test/mcp-tools.test.js`.

5. **Should `synapse_index_project` be idempotent?**
   - **What we know:** Current code has `idempotentHint: false`. The tool has a `force: boolean` parameter — if `force=false` and the index is already up to date, it's a no-op. If `force=true`, it rebuilds.
   - **What's unclear:** Spec says "calling the tool repeatedly with the same arguments". For fixed `force=false`, repeat calls ARE idempotent. For `force=true`, they're not.
   - **Recommendation:** Because idempotency must hold for "same arguments", and for `force=false` it holds, one could argue `true`. But spec conservative reading says index operations modify the environment (build files, write rows), so `false` is defensible. **Default assumption in expected-map: `false` (keep current).** Low-risk either way.

6. **Should `synapse_index_project` be `openWorldHint: true`?**
   - **What we know:** CONTEXT.md explicitly defers openWorldHint for this phase. Current code has `openWorldHint: false`.
   - **Recommendation:** Out of scope. Do not touch. Record in test but the test only asserts RO/DH/IH, not openWorldHint.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` via `tsx --test` (built-in Node test runner) |
| Config file | none — discovered automatically by glob `test/*.test.js` |
| Quick run command | `npx tsx --test test/mcp-annotations.test.js` |
| Full suite command | `npm test` (runs `tsx --test`, covers all `test/*.test.js`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ANNOT-01 | All 72 tools have `readOnlyHint`, `destructiveHint`, `idempotentHint` | unit | `npx tsx --test test/mcp-annotations.test.js` | ❌ Wave 0 |
| ANNOT-02 | Write tools `destructiveHint: false`; delete tools `destructiveHint: true` | unit (via EXPECTED map containing all 5 DS entries) | `npx tsx --test test/mcp-annotations.test.js` | ❌ Wave 0 |
| ANNOT-03 | Annotations validated in MCP tools test | unit | `npx tsx --test test/mcp-annotations.test.js` | ❌ Wave 0 |

All three requirements are validated by the **same test file** — that's by design; ANNOT-03 *is* "write a test for ANNOT-01 and ANNOT-02."

**Supporting guard:** `npm test` also runs the existing `test/mcp-tools.test.js` which exercises a subset of tools' handlers end-to-end. That test provides regression coverage against accidental breakage of tool wiring while this phase is in progress.

**Supporting guard:** `npm run build` (`tsc`) is a type-level guard — if any tool registration file has a syntax or type error after inline annotation edits, the build fails before the test runs.

### Sampling Rate

- **Per task commit:** `npx tsx --test test/mcp-annotations.test.js` (<2s expected — just registration, no handlers)
- **Per wave merge:** `npm test` (full suite — ensures no regression in other MCP tests)
- **Phase gate:** Full suite green + `npm run build` clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test/mcp-annotations.test.js` — NEW file, covers ANNOT-01, ANNOT-02, ANNOT-03 in one go
- [ ] No framework install needed — `node:test` + `tsx` already in use
- [ ] No shared fixture needed — the fake server is a 9-line helper that can live inside the test file
- [ ] (Optional, Claude's discretion) `src/mcp/common/tool-utils.ts` — add exported `READ_ONLY_ANNOTATIONS`, `WRITE_ANNOTATIONS`, `IDEMPOTENT_WRITE_ANNOTATIONS`, `DESTRUCTIVE_ANNOTATIONS` constants

## Sources

### Primary (HIGH confidence)

- **MCP 2025-06-18 schema authoritative definition** — `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js:1173-1207` (installed SDK, in-tree verification). Confirms all four annotation fields, their defaults, and the hint-not-enforcement contract. This is the exact code the project ships against.
- **MCP schema source** — [github.com/modelcontextprotocol/modelcontextprotocol schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2025-06-18/schema.ts) — `ToolAnnotations` interface with full JSDoc, confirms defaults: `readOnlyHint` default `false`, `destructiveHint` default `true`, `idempotentHint` default `false`, `openWorldHint` default `true`.
- **MCP tools specification page** — [modelcontextprotocol.io tools spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) — confirms annotations are optional metadata on the Tool type and clients MUST treat them as untrusted unless the server is trusted.
- **Synapse source: `createJsonToolRegistrar`** — `src/mcp/common/tool-utils.ts:164-197` — confirms annotations already flow through to `server.registerTool()` without transformation.
- **Synapse source: `registerAppTools`** — `src/app/register-tools.ts:34-123` — single entry point calling all 10 tool-group registrars.
- **Synapse source: existing fake server** — `test/mcp-tools.test.js:21-29` — the `makeFakeServer()` pattern to reuse.
- **Synapse source: per-file tool registrations** — verified 72 `registerJsonTool(` calls across 10 files match 72 `annotations:` blocks.

### Secondary (MEDIUM confidence)

- **MCP blog post "Tool Annotations as Risk Vocabulary"** (2026-03-16) — [blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) — explicit guidance: set `readOnlyHint: true` on read-only tools, `destructiveHint: false` on additive operations, `openWorldHint: false` on closed-domain tools. Confirms hints are advisory, not enforced.
- **Filesystem servers annotations issue** — [github.com/modelcontextprotocol/servers/issues/2988](https://github.com/modelcontextprotocol/servers/issues/2988) — community-blessed per-tool annotation recommendations for read/write/delete filesystem operations. Confirms: `write_file` = `destructive: true, idempotent: true` (overwrites), `edit_file` = `destructive: true, idempotent: false` (doubles up), `read_*` = `readOnly: true`.
- **FastMCP / Spring AI / OpenLiberty reference patterns** — confirmed via WebSearch; all three frameworks accept the same four-field annotation object with identical semantics. Synapse's categorization rules match this industry consensus.

### Tertiary (LOW confidence — flagged for validation)

- None. Every conclusion in this file traces to either the installed SDK source, the MCP spec schema on GitHub, or the Synapse source code itself.

## Metadata

**Confidence breakdown:**
- Spec semantics (what each field means, defaults): **HIGH** — verified against installed SDK and GitHub schema source.
- Synapse tool inventory (all 72 names, current annotations): **HIGH** — read every registration file.
- Category assignments per tool: **HIGH for clear cases (~64 tools), MEDIUM for ambiguous (~8 flagged in Open Questions)**.
- Test strategy and fake-server pattern: **HIGH** — reuses existing blessed pattern from `test/mcp-tools.test.js`.
- Mismatches identified: **HIGH** — each has file/line reference and source evidence.
- Categorization of `kg_add_triple*` as idempotent: **MEDIUM** — depends on Phase 26 `addTriple` dedup semantics, which the plan must verify before finalizing the expected-map.

**Research date:** 2026-04-13
**Valid until:** 2026-07-13 (90 days) — the MCP 2025-06-18 spec is stable; only the SDK version pin or a new spec revision could invalidate these findings.
