---
phase: quick
plan: 260409-kaa
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
  - CONTRIBUTING.md
  - synapse-docs/docs/guides/architecture.md
autonomous: true
requirements: [BRAND-IDENTITY, LINK-FIX]

must_haves:
  truths:
    - "README opens with the new tagline 'Your AI's home base' and nest-metaphor story"
    - "All internal links in README, CONTRIBUTING, and architecture.md point to correct post-restructuring paths"
    - "SEO keyword clusters appear naturally in headings, first paragraphs, and feature descriptions"
    - "Architecture guide source layout tree reflects the new memory/ subdirectory structure"
  artifacts:
    - path: "README.md"
      provides: "Brand identity + fixed links"
      contains: "Your AI's home base"
    - path: "CONTRIBUTING.md"
      provides: "Fixed guide references"
      contains: "synapse-docs/docs/guides"
    - path: "synapse-docs/docs/guides/architecture.md"
      provides: "Updated source layout + inline refs"
      contains: "knowledge-graph/"
  key_links:
    - from: "README.md"
      to: "synapse-docs/docs/guides/architecture.md"
      via: "relative link"
      pattern: "synapse-docs/docs/guides/architecture\\.md"
    - from: "README.md"
      to: "synapse-docs/docs/i18n/"
      via: "relative links for all 13 translations"
      pattern: "synapse-docs/docs/i18n/README\\."
    - from: "CONTRIBUTING.md"
      to: "synapse-docs/docs/guides/"
      via: "relative links"
      pattern: "synapse-docs/docs/guides/"
---

<objective>
Apply Synapse brand identity (tagline, nest metaphor, SEO keywords) to README.md and fix all broken internal links across README.md, CONTRIBUTING.md, and architecture.md caused by the folder restructuring.

Purpose: Establish warm, protective brand voice and ensure all doc cross-references work after guides/ and readme/ moved to synapse-docs/docs/.
Output: Three updated files with brand identity and correct paths.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260409-kaa-create-synapse-brand-identity-and-upda/260409-kaa-CONTEXT.md
@README.md
@CONTRIBUTING.md
@synapse-docs/docs/guides/architecture.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply brand identity to README.md and fix all broken links</name>
  <files>README.md</files>
  <action>
Edit README.md with the following changes:

**Brand identity (per locked decisions in CONTEXT.md):**

1. Replace line 13 tagline `**Your codebase. Your AI. Your machine — no cloud, no leaks, no surprises.**` with:
   `**Your AI's home base.**`

2. Replace lines 15-17 (the description + feature bar) with a branded version that weaves the nest metaphor warmly:
   - Lead with the nest metaphor: Synapse is where your AI builds its nest — on YOUR machine. It learns, remembers, and protects your code. The nest grows with you but never leaves home.
   - Weave SEO keywords naturally: "local MCP server", "private AI coding assistant", "persistent AI memory", "semantic code search", "AI knowledge graph", "no-cloud AI tools", "local-first development"
   - Keep the feature stat bar (52 MCP tools, TypeScript, etc.) but integrate it into the new voice
   - Tone: warm and protective, like a guardian — per the "Warm & Protective" decision

3. In the "Why Synapse?" section (line 48+): Weave SEO terms "offline AI code tools", "private code assistant", "local-first development" into the opening paragraph naturally. Keep the existing content but warm the tone slightly with the nest metaphor where it fits organically. Do NOT force metaphors into technical tables.

4. In the "Memory" section heading area (line 351+): Add "persistent AI memory" and "AI knowledge graph" keywords naturally in the opening paragraph.

**Link fixes (all broken by restructuring):**

5. Line 19: Change `./guides/architecture.md` to `./synapse-docs/docs/guides/architecture.md`

6. Line 23: Change all `./readme/README.XX-XX.md` links to `./synapse-docs/docs/i18n/README.XX-XX.md` (13 translation links)

7. Line 25: Change `./readme/TRANSLATION_POLICY.md` to `./synapse-docs/docs/i18n/TRANSLATION_POLICY.md`

8. Line 494: Change `./guides/architecture.md` to `./synapse-docs/docs/guides/architecture.md`

Keep all other content exactly as-is. Do not add or remove sections. The nest metaphor should feel organic in intro/overview sections and fade to technical in feature tables.
  </action>
  <verify>grep -c "Your AI's home base" README.md && grep -c "synapse-docs/docs/guides/architecture.md" README.md && grep -c "synapse-docs/docs/i18n/" README.md | head -1</verify>
  <done>README.md has new tagline "Your AI's home base", nest metaphor story in intro, SEO keywords woven through headings and descriptions, and all 16 broken links (2 architecture, 13 i18n, 1 translation policy) point to synapse-docs/ paths</done>
</task>

<task type="auto">
  <name>Task 2: Fix broken links in CONTRIBUTING.md</name>
  <files>CONTRIBUTING.md</files>
  <action>
Edit CONTRIBUTING.md with these link fixes:

1. Line 50: Change `[`guides/architecture.md`](./guides/architecture.md)` to `[`synapse-docs/docs/guides/architecture.md`](./synapse-docs/docs/guides/architecture.md)`

2. Line 51: Change `[`guides/future-retrieval-roadmap.md`](./guides/future-retrieval-roadmap.md)` to `[`synapse-docs/docs/guides/future-retrieval-roadmap.md`](./synapse-docs/docs/guides/future-retrieval-roadmap.md)`

No other changes. Keep all existing content intact.
  </action>
  <verify>grep "synapse-docs/docs/guides" CONTRIBUTING.md | wc -l</verify>
  <done>Both guide references in CONTRIBUTING.md point to synapse-docs/docs/guides/ paths (2 links fixed)</done>
</task>

<task type="auto">
  <name>Task 3: Update architecture.md source layout and inline file references</name>
  <files>synapse-docs/docs/guides/architecture.md</files>
  <action>
Edit synapse-docs/docs/guides/architecture.md with these changes:

**Source layout tree (lines 454-490):** Replace the flat memory/ listing with the new subdirectory structure:

```
│   ├── memory/
│   │   ├── schema.ts        # table DDL + forward-only migrations (v1-v9)
│   │   ├── store.ts         # MemoryStore facade — wires all modules together
│   │   ├── service.ts       # MemoryService — backend detection, public API
│   │   ├── hooks.ts         # MemoryHooks pub-sub system
│   │   ├── workflow.ts      # high-level workflow helpers
│   │   ├── adapter.ts       # SQLite adapter abstraction
│   │   ├── utils.ts         # shared helpers (nowIso, cleanString, stableJson)
│   │   ├── events/
│   │   │   ├── capture.ts   # event capture + signal scoring
│   │   │   ├── heuristics.ts # signal score computation
│   │   │   └── list.ts      # event listing
│   │   ├── ingest/
│   │   │   └── ingest.ts    # conversation ingestion (markdown + JSON)
│   │   ├── knowledge-graph/
│   │   │   ├── graph.ts     # recursive CTE traversal + bridge discovery
│   │   │   ├── kg.ts        # knowledge graph entities + triples
│   │   │   └── relations.ts # legacy bidirectional relations
│   │   ├── store/
│   │   │   ├── dedup.ts     # semantic duplicate detection via cosine similarity
│   │   │   ├── entries.ts   # CRUD for memory_entries
│   │   │   └── recall.ts    # recall queries with filtering and ranking
│   │   └── taxonomy/
│   │       ├── scopes.ts    # agent diary + agent-scoped isolation
│   │       └── taxonomy.ts  # nest/branch hierarchy queries
```

**Inline file references — update parenthetical refs to show subdirectory paths:**
- Line 137: `kg.ts` and `graph.ts` -> `knowledge-graph/kg.ts` and `knowledge-graph/graph.ts`
- Line 139: `(kg.ts)` -> `(knowledge-graph/kg.ts)`
- Line 165: `(graph.ts)` -> `(knowledge-graph/graph.ts)`
- Line 184: `(relations.ts)` -> `(knowledge-graph/relations.ts)`
- Line 190: `taxonomy.ts` -> `taxonomy/taxonomy.ts`
- Line 215: `(scopes.ts)` -> `(taxonomy/scopes.ts)`
- Line 230: `(dedup.ts)` -> `(store/dedup.ts)`
- Line 253: `(ingest.ts)` -> `(ingest/ingest.ts)`
- Line 303: `(hooks.ts)` -> stays as `(hooks.ts)` (hooks.ts did NOT move, stays at memory root)

Keep all other content exactly as-is. The file-path example in the entity extraction table (line 285, `src/services/memory/kg.ts`) is showing a pattern example, update it to `src/services/memory/knowledge-graph/kg.ts` for accuracy.
  </action>
  <verify>grep -c "knowledge-graph/" synapse-docs/docs/guides/architecture.md && grep -c "taxonomy/" synapse-docs/docs/guides/architecture.md && grep "events/" synapse-docs/docs/guides/architecture.md | head -3</verify>
  <done>Architecture guide source layout tree shows 5 new subdirectories (events/, ingest/, knowledge-graph/, store/, taxonomy/) and all inline file refs use correct subdirectory paths</done>
</task>

</tasks>

<verification>
1. `grep "Your AI's home base" README.md` — returns the tagline line
2. `grep -c "\\./readme/" README.md` — returns 0 (no old readme/ links remain)
3. `grep -c "\\./guides/" README.md` — returns 0 (no old guides/ links remain)
4. `grep -c "\\./guides/" CONTRIBUTING.md` — returns 0 (no old guides/ links remain)
5. `grep "knowledge-graph/" synapse-docs/docs/guides/architecture.md | wc -l` — returns 5+ (subdirectory refs present)
6. `grep -c "event-capture\\.ts\\|event-heuristics\\.ts\\|event-list\\.ts" synapse-docs/docs/guides/architecture.md` — returns 0 (old flat file names gone from source layout)
</verification>

<success_criteria>
- README.md opens with "Your AI's home base" tagline and nest metaphor intro
- SEO keywords from all 3 clusters appear naturally throughout README.md
- All 16 broken links in README.md point to synapse-docs/ paths
- Both broken links in CONTRIBUTING.md point to synapse-docs/ paths
- Architecture guide source layout reflects the 5 new memory/ subdirectories
- All inline file references in architecture.md use subdirectory-qualified paths
- No new files created — only existing files edited
</success_criteria>

<output>
After completion, create `.planning/quick/260409-kaa-create-synapse-brand-identity-and-upda/260409-kaa-SUMMARY.md`
</output>
