# Phase: Tool Context Optimization - Research

**Researched:** 2024-05-23
**Domain:** Model Context Protocol (MCP) / Context Management
**Confidence:** HIGH

## Summary

The Loci platform currently exposes 76 MCP tools. While functionally rich, this large toolset imposes a significant "context tax" on every interaction. Each tool definition (name, description, and JSON schema for parameters) consumes tokens. At an estimated average of 200 tokens per tool, the total overhead is approximately **15,200 tokens**.

This overhead reduces the available "effective context" for task history, code analysis, and complex reasoning. For models with 32k-128k context windows, this is a non-trivial percentage (12% to 47%) of the total capacity.

**Primary recommendation:** Implement "Category Bundling" for high-density domains (Knowledge Graph, Memory Store) and transition to a "Tiered Discovery" model using the existing `synapse_help` tool to reduce the active tool count by ~60%.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tool Registration | MCP Server | — | Controls which tools are exposed to the LLM. |
| Context Compression | MCP Common | — | Handles output truncation and repetition collapsing. |
| Tool Categorization | App Interface | Tool Modules | Determines how tools are grouped and bundled. |
| Demand-Driven Discovery | LLM Agent | `synapse_help` | The agent decides when it needs more specialized tools. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | ^1.0.0 | MCP protocol implementation | [VERIFIED: package.json] |
| `zod` | ^3.23.0 | Schema definition and validation | [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `crypto` | Built-in | Generating hashes for output "teeing" | For large output logging. |

## Tool Distribution Analysis

Based on an audit of `src/interfaces/mcp/tools/*.ts`:

| Category | File(s) | Tool Count | Primary Purpose |
|----------|---------|------------|-----------------|
| **Knowledge Graph** | `graph-tools.ts`, `kg-delete-tools.ts` | 27 | Entity/Triple management, traversal, taxonomy. |
| **Memory Store** | `memory-store.ts`, `backfill-tools.ts` | 14 | Memory CRUD, relations, events. |
| **Retrieval** | `retrieval.ts`, `retrieval-workspace.ts`, `find-tools.ts` | 15 | File system access, code search, workspace management. |
| **Workflow** | `memory-workflow.ts` | 7 | High-level agent actions (learn, reflect, teach). |
| **Core/System** | `core.ts` | 6 | Status, health, help, updates. |
| **Audit/Analysis** | `audit-tools.ts`, `symbol-tools.ts` | 5 | Symbol extraction, memory auditing. |
| **Backup** | `backup-tools.ts` | 2 | Database backup and restore. |
| **TOTAL** | | **76** | |

### Estimated Token Overhead
- **Fixed Overhead per Tool:** ~50 tokens (Name + Description + Schema boilerplate).
- **Variable Overhead per Parameter:** ~30 tokens (Name + Type + Description).
- **Average Parameters per Tool:** 5.
- **Estimated Average Tokens per Tool:** 50 + (5 * 30) = **200 tokens**.
- **Total Overhead:** 76 * 200 = **15,200 tokens**. [ASSUMED: based on standard tokenization rates]

## Context Compression Strategies

### 1. Multi-Purpose "Controller" Tools (Bundling)
**What:** Combine related tools into a single tool entry using a discriminated union for the `action` parameter.
**Example:** Consolidate 27 KG tools into 3-4 specialized controllers: `synapse_kg_modify`, `synapse_kg_query`, `synapse_kg_admin`.
**Impact:** Reduces fixed overhead. 27 tools @ 200 tokens = 5,400 tokens. 4 bundled tools @ 600 tokens = 2,400 tokens. **Save: 3,000 tokens (55% reduction for KG).**

### 2. Tiered Discovery (Demand-Driven Loading)
**What:** Register only "Core" and "Gateway" tools (e.g., retrieval, help, workflow) by default.
**How:** 
- The agent starts with ~15 essential tools.
- If a task requires KG or specialized Memory Store tools, the agent uses `synapse_help` to identify the needed capability.
- The agent calls `synapse_enable_feature(feature: 'kg')` to register those tools.
**Impact:** Drastic reduction in baseline context (from 15k tokens to ~3k tokens).
**Risk:** Some MCP clients do not support dynamic tool list updates without a restart.

### 3. Schema Minimization
**What:** Aggressively prune Zod schemas and descriptions.
**Patterns:**
- Use short, punchy descriptions (1 sentence max).
- Remove redundant field constraints that the model doesn't need to know (e.g., `min(1)`, `max(400)` descriptions).
- Use `z.any()` or `z.record()` for complex objects instead of deeply nested schemas where the model's behavior is guided by text instructions anyway.

### 4. Project-Based Filtering
**What:** Only load tools relevant to the detected project type.
**Example:** If no Knowledge Graph database is initialized or configured, don't load KG tools.

## Recommended Architectural Path: "Loci Dynamic Tooling"

### Phase 1: Immediate Bundling (The "Controller" Pattern)
Refactor high-count categories into multi-purpose tools.
- `synapse_memory_store` (handles list, get, store, update, delete).
- `synapse_kg_entity_manage` (handles entity CRUD).
- `synapse_kg_triple_manage` (handles triple CRUD and batch).
- `synapse_workspace_config` (handles roots, ignores).

### Phase 2: Metadata-Only Shadow Tools
Modify the server to return a minimal list of tools by default.
- Include a `synapse_tools_index` (or use `synapse_help`) that contains a compact text-only listing of all 76 capabilities.
- When the agent sees a capability it needs in the index, it calls `synapse_load_tools(category: 'kg')`.

### Phase 3: Profile-Based Initialization
Allow the user to specify a `tool_profile` in `loci.json` or `.env`.
- `minimal`: Core + Retrieval.
- `standard`: Core + Retrieval + Memory.
- `full`: Everything.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Custom estimator | `js-tiktoken` or `gpt-tokenizer` | Accuracy matters for dynamic loading decisions. |
| MCP Protocol | Custom JSON-RPC | `@modelcontextprotocol/sdk` | Compliance and future-proofing. |
| Schema Compression | Manual string stripping | Zod internal schema access | Programmatic minimization is safer and more consistent. |

## Common Pitfalls

### Pitfall 1: Breaking Client Cache
**What goes wrong:** Dynamic tool loading is ignored by the client (e.g., Claude Desktop, VSCode).
**How to avoid:** Investigate if the client supports the `notifications/tools/list_changed` message from the MCP spec.

### Pitfall 2: Schema Complexity Bloat
**What goes wrong:** Bundling 10 tools into 1 makes the `inputSchema` so complex (massive discriminated union) that it uses *more* tokens than the separate tools.
**How to avoid:** Only bundle tools with high parameter overlap or very simple schemas.

### Pitfall 3: Agent Confusion
**What goes wrong:** The agent is "blind" to capabilities because they are hidden behind a `help` tool.
**How to avoid:** Ensure the "Gateway" tools (Help/Status) always provide a hint about hidden capabilities.

## Code Examples

### Pattern: Multi-Purpose Tool with Discriminated Union
```typescript
// Proposed bundled KG tool
registerJsonTool(
  'synapse_kg_entity_manage',
  {
    title: 'KG Entity Management',
    description: 'Unified tool for entity CRUD operations.',
    inputSchema: {
      action: z.enum(['add', 'update', 'delete', 'get']),
      payload: z.discriminatedUnion('action', [
        z.object({ action: z.literal('add'), name: z.string(), type: z.string() }),
        z.object({ action: z.literal('update'), id: z.string(), properties: z.record(z.any()) }),
        // ...
      ])
    },
    // ...
  },
  async ({ action, payload }) => { /* ... */ }
);
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Average tool definition uses 200 tokens | Summary | Actual cost could be higher or lower depending on model tokenizer. |
| A2 | MCP clients support `list_changed` notification | Strategies | If unsupported, dynamic loading requires server restart. |

## Sources

### Primary (HIGH confidence)
- `src/interfaces/mcp/tools/*.ts` - Code audit of current toolset.
- `src/interfaces/mcp/common/tool-utils.ts` - Tool registration implementation.
- `src/interfaces/app/register-tools.ts` - Initialization logic.

### Secondary (MEDIUM confidence)
- MCP Specification (modelcontextprotocol.io) - Tool annotation and notification specs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly from codebase.
- Architecture: HIGH - Analysis of current vs proposed patterns.
- Pitfalls: MEDIUM - Dependent on third-party MCP client behavior.

**Research date:** 2024-05-23
**Valid until:** 2024-06-23
