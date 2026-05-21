# Milestone 2: Adaptive Indexing & Multi-Root Intelligence

## Project Description
Expand Synapse's reach and responsiveness by implementing background adaptive indexing and synthesizing context across multiple project roots. This milestone transforms Synapse from a single-repo helper into a truly workspace-aware context engine that scales with the developer.

## Why This Milestone
Current indexing is mostly manual or triggered by explicit tool calls. As projects grow and developers switch between repositories, Synapse needs to automatically keep its semantic index current without user intervention. Furthermore, "Multi-Root" support is essential for modern monorepo and microservice architectures where context often spans multiple directories.

## User-Visible Outcome
- Users see "Indexing..." status indicators in the background as they work (during periodic sweeps).
- Semantic search (`synapse_search`) automatically includes results from all open project roots without explicit path configuration.
- Symbol jumps (`synapse_symbol_query`) correctly resolve definitions across repository boundaries within the same workspace.

## Completion Class
Operational / Integration.

## Final Integrated Acceptance
- Setup a workspace with 3 related projects (e.g., frontend, backend, shared-lib).
- Modify a function in `shared-lib`.
- Perform a hybrid search in `backend` and see the updated function context within the next sweep interval (e.g., 5-10 mins) without manual re-indexing.
- Jump to definition from `frontend` and land in `shared-lib`.

## Architectural Decisions

### Optimized Staleness Monitor
Enhance the existing `StalenessMonitor` to use hash-based delta detection.
- **Rationale**: Periodic polling is significantly lighter on system resources than a real-time file watcher while still providing sufficient "Adaptive Indexing" for most development workflows.
- **Alternatives**: Real-time File Watcher (rejected due to high system overhead).

### Multi-Root Retrieval Synthesis
Update `McpResponseMapper` and retrieval services to automatically aggregate results from all configured roots when `all_roots: true` is set (or as default).
- **Rationale**: Seamlessly bridge the gap between decoupled microservices.

## Error Handling Strategy
- **Sweep Failures**: Gracefully retry the sweep if a transient I/O error occurs.
- **Merge Conflicts in KG**: Ensure temporal triples are appended correctly even if multiple roots update simultaneously.

## Risks and Unknowns
- **Index Drift**: Ensure the hash-based check is 100% reliable to prevent files from being skipped during sweeps.
- **Scale Limits**: Very large workspaces with hundreds of thousands of files might still make periodic sweeps slow; optimization of the "staleness check" itself is key.

## Existing Codebase / Prior Art
- `VectorIndexService`: Current foundation for semantic search.
- `WorkspaceService`: Handles root management.
- `StalenessMonitor`: Current periodic sweep implementation.

## Relevant Requirements
- **M2-REQ-01**: Automatic background delta-indexing.
- **M2-REQ-02**: Cross-root symbol resolution.
- **M2-REQ-03**: Workspace-wide semantic search.

## Scope
- **In Scope**: Background delta-indexing, Multi-root search/symbol synthesis, Optimized staleness sweep.
- **Out of Scope**: Real-time file watching, Cloud-based indexing.

## Technical Constraints
- Must remain local-first (no external API calls for indexing).
- Maintain low CPU/Memory footprint during sweeps.

## Integration Points
- `synapse_search` (Search Controller)
- `synapse_symbol_query` (Symbol Controller)
- `synapse_system_manage` (Status updates)

## Testing Requirements
- Unit tests for the hash-based staleness logic.
- Integration tests with multiple dummy roots.
- Performance benchmarks for sweep duration on medium/large repos.

## Acceptance Criteria
- [ ] Adaptive indexing triggers automatically on the next sweep cycle after a change.
- [ ] Search results are merged from at least 2 roots correctly.
- [ ] Definition jump works across roots.

## Open Questions
- Should we persist the "last indexed" state per file to speed up startup? (Current thinking: Yes, via SQLite hash table).
