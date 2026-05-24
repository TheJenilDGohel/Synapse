# Synapse Milestone Roadmap: M2 - Adaptive Indexing & Multi-Root Intelligence

## 🎯 Milestone Goal
Expand Synapse's reach and responsiveness by optimizing background adaptive indexing and synthesizing context across multiple project roots.

## 🏁 Slices

- [x] **S01: Optimize Staleness Monitor** `risk:low` `depends:[]`
  > After this: The existing `Staleness Monitor` is more efficient, using hash-based checks to trigger delta-indexing without full project scans.
- [x] **S02: Incremental Delta-Indexing** `risk:high` `depends:[S01]`
  > After this: Detection of a stale file triggers an incremental re-index of *only* that file, visible in the `synapse_system_manage` index status.
- [x] **S03: Multi-Root Workspace Discovery** `risk:medium` `depends:[]`
  > After this: The system correctly identifies and lists all available project roots in a complex directory structure.
- [ ] **S04: Unified Multi-Root Search** `risk:medium` `depends:[S03]`
  > After this: `synapse_search` returns results from multiple roots in a single call when scoped to the workspace.
- [ ] **S05: Cross-Root Symbol Resolution** `risk:medium` `depends:[S04]`
  > After this: `synapse_symbol_query` can find the definition of a symbol in `Root B` when requested from `Root A`.
- [ ] **S06: Adaptive Indexing Optimization & UI Status** `risk:low` `depends:[S02]`
  > After this: Indexing is throttled/debounced, and users can see the indexing progress via `synapse_health`.
- [ ] **S07: Final Integrated Workspace Acceptance** `risk:low` `depends:[S05, S06]`
  > After this: A full end-to-end demo of a 3-root workspace with real-time semantic search and cross-root navigation is successful.

## 🛠️ Verification Classes
- **Class 1: Sweep Propagation**: Verify detected file changes trigger indexing.
- **Class 2: Semantic Update Latency**: Measure time from sweep to search relevance.
- **Class 3: Cross-Root Result Merging**: Ensure BM25 and Vector scores are normalized across roots.

## 🏗️ Boundary Map
- `S01 -> S02`: Sweep Event -> Index Trigger.
- `S03 -> S04`: Root Registry -> Search Scope.
- `S04 -> S05`: Unified Search -> Cross-Root Symbol Map.
- `S02 -> S06`: Raw Indexing -> Throttled UI Status.
