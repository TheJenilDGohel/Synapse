# Graph Report - .  (2026-04-13)

## Corpus Check
- Large corpus: 300 files · ~184,992 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1090 nodes · 1433 edges · 185 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `MemoryStore` - 51 edges
2. `MemoryService` - 49 edges
3. `SqliteVecIndexService` - 18 edges
4. `WorkspaceService` - 17 edges
5. `UpdateService` - 16 edges
6. `c()` - 14 edges
7. `SymbolIndexService` - 13 edges
8. `SearchService` - 13 edges
9. `run()` - 13 edges
10. `Temporal Knowledge Graph` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Temporal Knowledge Graph (valid_from/valid_to)` --semantically_similar_to--> `Temporal Knowledge Graph`  [INFERRED] [semantically similar]
  localnest-docs/docs/guides/architecture.md → README.md
- `Hybrid Search (RRF Merge)` --semantically_similar_to--> `Hybrid Search (Lexical + Semantic RRF)`  [INFERRED] [semantically similar]
  localnest-docs/docs/guides/architecture.md → README.md
- `LocalNest Brand Identity` --references--> `LocalNest MCP`  [INFERRED]
  localnest-docs/static/img/social-card.svg → README.md
- `Temporal Knowledge Graph` --semantically_similar_to--> `Temporal Knowledge Graph`  [INFERRED] [semantically similar]
  localnest-docs/docs/versions/0.0.7-beta.2/overview.md → README.md
- `Semantic Duplicate Detection` --semantically_similar_to--> `Semantic Deduplication (0.92 cosine gate)`  [INFERRED] [semantically similar]
  localnest-docs/docs/versions/0.0.7-beta.2/overview.md → README.md

## Hyperedges (group relationships)
- **LocalNest Core Feature Set** — readme_localnest_mcp, readme_temporal_knowledge_graph, readme_hybrid_search, readme_agent_memory, readme_hooks_system, readme_nest_branch_hierarchy, readme_sqlite_backend, readme_semantic_dedup, readme_batch_operations [EXTRACTED 1.00]
- **Knowledge Graph Tool Group** — tools_kg_entities, tools_kg_triples, tools_kg_temporal, tools_kg_traversal, readme_temporal_knowledge_graph [EXTRACTED 1.00]
- **Memory Tool Group** — tools_memory_workflow, tools_memory_crud, tools_memory_relations, readme_agent_memory, readme_nest_branch_hierarchy [EXTRACTED 1.00]
- **Retrieval Pipeline Components** — architecture_retrieval_pipeline, readme_ripgrep, readme_huggingface_embeddings, readme_reranker, readme_sqlite_vec, readme_ast_chunking [EXTRACTED 1.00]
- **SQLite-for-Everything Design Rationale** — claude_md_alternatives, claude_md_tech_stack, architecture_design_decisions, readme_sqlite_backend, readme_multi_hop_traversal [EXTRACTED 1.00]
- **v0.0.7-beta.2 Major Feature Set** — version_0_0_7_beta2, feature_temporal_kg, feature_multihop_traversal, feature_nest_branch_hierarchy, feature_semantic_dedup, feature_conversation_ingestion, feature_hooks_system, feature_cli_first, feature_agent_diary [EXTRACTED 1.00]
- **LocalNest MCP Skill Commands** — cmd_selftest, cmd_onboard, cmd_teach, cmd_fact, cmd_recall, cmd_status, cmd_find, cmd_prime, cmd_search, cmd_remember [EXTRACTED 1.00]
- **Agentic Workflow Tools v0.2.0** — readme_agent_prime, readme_localnest_find, readme_localnest_teach, readme_localnest_audit, readme_terse_responses, readme_auto_inference [EXTRACTED 1.00]
- **Retrieval Backend Evaluation** — concept_sqlite_vec, concept_lancedb, concept_qdrant, concept_vec1 [EXTRACTED 0.90]
- **Hybrid Search Pipeline** — concept_hybrid_search, concept_ripgrep, concept_miniLM, concept_sqlite_vec [EXTRACTED 0.95]

## Communities

### Community 0 - "Architecture & Core Design"
Cohesion: 0.04
Nodes (66): Design Decisions (stdio-only, local-first, SQLite-for-everything), Hooks Pipeline (pre/post/cancel/transform), Knowledge Graph Pipeline, Memory Pipeline (event→dedup→score→promote), Retrieval Pipeline (lexical+semantic+RRF), Release v0.2.0 (2026-04-10), Alternatives Considered (Neo4j/ChromaDB/better-sqlite3 rejected), Tech Stack Decision (Node.js 22+, TypeScript, node:sqlite, zero new deps) (+58 more)

### Community 1 - "KG Store Layer"
Cohesion: 0.07
Nodes (1): MemoryStore

### Community 2 - "SQLite Vec + Embedding Service"
Cohesion: 0.07
Nodes (7): EmbeddingLRUCache, EmbeddingService, normalizeProvider(), RerankerService, SearchService, sigmoid(), VectorIndexService

### Community 3 - "Memory Service"
Cohesion: 0.08
Nodes (2): MemoryService, parseNodeMajor()

### Community 4 - "CLI Helpers & Install"
Cohesion: 0.09
Nodes (24): buildBaseScopeClause(), buildInstallCommand(), chunkFile(), compareVersions(), detectProjectMarkers(), isUnderBase(), isUnderRoots(), listProjects() (+16 more)

### Community 5 - "Search Utilities"
Cohesion: 0.11
Nodes (14): buildSearchTerms(), cleanString(), computeMemorySimilarity(), deriveSummary(), deriveTitle(), ensureArray(), firstSentence(), humanizeLabel() (+6 more)

### Community 6 - "Dashboard & Audit"
Cohesion: 0.12
Nodes (24): auditKgDensity(), auditNestHealth(), auditProjectCoverage(), auditStaleMemories(), buildSummary(), collectData(), computeHealthScore(), createMemoryService() (+16 more)

### Community 7 - "Response Normalizers"
Cohesion: 0.08
Nodes (4): normalizeCaptureOutcomeResult(), normalizeMemoryStatus(), normalizeUpdateSelfResult(), normalizeUpdateStatus()

### Community 8 - "ANSI / Terminal UI"
Cohesion: 0.15
Nodes (23): badge(), blue(), bold(), boxBottom(), boxEmpty(), boxLine(), boxTop(), c() (+15 more)

### Community 9 - "Knowledge Graph Module"
Cohesion: 0.16
Nodes (13): addEntity(), createMemoryService(), ensureEntity(), formatDate(), handleAdd(), handleQuery(), handleStats(), handleTimeline() (+5 more)

### Community 10 - "Vector Index Service"
Cohesion: 0.21
Nodes (1): SqliteVecIndexService

### Community 11 - "MCP Tool Surface (Docs)"
Cohesion: 0.12
Nodes (18): LocalNest Architecture Guide, localnest:fact Command, localnest:recall Command, 72 MCP Tool Surface, Hybrid Search (RRF Merge), Knowledge Graph Subsystem, LanceDB (Alternative Backend Candidate), Xenova/all-MiniLM-L6-v2 Embedding Model (+10 more)

### Community 12 - "Workspace & Project Service"
Cohesion: 0.12
Nodes (1): WorkspaceService

### Community 13 - "Update Service"
Cohesion: 0.27
Nodes (1): UpdateService

### Community 14 - "Conversation Ingest"
Cohesion: 0.27
Nodes (15): buildTriples(), checkAlreadyIngested(), createMemoryService(), detectFormat(), ingestJson(), ingestMarkdown(), _ingestTurns(), normalizeRole() (+7 more)

### Community 15 - "Symbol Index & Docusaurus"
Cohesion: 0.24
Nodes (1): SymbolIndexService

### Community 16 - "Self-Test Suite"
Cohesion: 0.26
Nodes (14): checkDedup(), checkEmbeddings(), checkFileSearch(), checkHooks(), checkKnowledgeGraph(), checkMemoryBackend(), checkMemoryCrud(), checkRuntime() (+6 more)

### Community 17 - "Config & Runtime"
Cohesion: 0.29
Nodes (12): buildRuntimeConfig(), detectRipgrep(), expandHome(), normalizeRootEntry(), parseBoolean(), parseConfigFileRoots(), parseConfigFileSettings(), parseIntEnv() (+4 more)

### Community 18 - "Client Installer"
Cohesion: 0.31
Nodes (12): backupFile(), buildCodexLocalnestBlock(), detectAiToolTargets(), ensureDir(), installIntoCodexTarget(), installIntoJsonTarget(), installLocalnestIntoDetectedClients(), isPlainObject() (+4 more)

### Community 19 - "Hooks System"
Cohesion: 0.16
Nodes (1): MemoryHooks

### Community 20 - "Memory CLI"
Cohesion: 0.44
Nodes (12): confirm(), createMemoryService(), formatDate(), handleAdd(), handleDelete(), handleList(), handleSearch(), handleShow() (+4 more)

### Community 21 - "Onboard & Environment"
Cohesion: 0.33
Nodes (12): detectEnvironment(), getCommandVersion(), resultLine(), run(), runDoctor(), runHooksInstall(), runOnboard(), runSetup() (+4 more)

### Community 22 - "Workflow & Memory Format"
Cohesion: 0.3
Nodes (6): cleanText(), compactMemoryStatus(), defaultEventStatus(), deriveQuery(), MemoryWorkflowService, uniqueStrings()

### Community 23 - "AST Chunker"
Cohesion: 0.29
Nodes (1): AstChunker

### Community 24 - "Code Extractor"
Cohesion: 0.27
Nodes (8): cap(), escapeRegex(), extractSymbolsFromFile(), extractSymbolsRegex(), extractSymbolsTreeSitter(), makeId(), mergeEntries(), walkNodes()

### Community 25 - "Module Group 25"
Cohesion: 0.44
Nodes (10): confirm(), getSkillModule(), handleInstall(), handleList(), handleRemove(), readSkillMeta(), run(), scanInstalledSkills() (+2 more)

### Community 26 - "Module Group 26"
Cohesion: 0.4
Nodes (9): buildLocalnestPaths(), migrateLocalnestHomeLayout(), moveIfNeeded(), moveSqliteFamily(), resolveConfigPath(), resolveLocalnestHome(), resolveWritableModelCacheDir(), sanitizeOwnerToken() (+1 more)

### Community 27 - "Module Group 27"
Cohesion: 0.38
Nodes (9): buildSummary(), isIsoTimestamp(), queryFilesChanged(), queryNewMemories(), queryNewTriples(), queryRecentCommits(), resolveLastSession(), shortDate() (+1 more)

### Community 28 - "Module Group 28"
Cohesion: 0.24
Nodes (3): ensureSqliteVecTable(), getVecTableDefinition(), shouldRebuildVecTable()

### Community 29 - "Module Group 29"
Cohesion: 0.31
Nodes (4): buildLocalnestCommandArgv(), forwardDeprecatedCommand(), importRelative(), printDeprecationWarning()

### Community 30 - "Module Group 30"
Cohesion: 0.46
Nodes (7): detectGlobalNpmRoot(), ensureSqliteVecExtension(), findMatchingBinary(), findSqliteVecExtensionPath(), getPlatformBinaryNames(), safeReadDir(), splitSearchDirs()

### Community 31 - "Module Group 31"
Cohesion: 0.36
Nodes (4): buildHealthSummary(), buildMemoryGuidance(), buildMemorySummary(), createServerStatusBuilder()

### Community 32 - "Module Group 32"
Cohesion: 0.32
Nodes (3): normalizeToolResponsePayload(), renderMarkdown(), toolResult()

### Community 33 - "Module Group 33"
Cohesion: 0.29
Nodes (1): NodeSqliteAdapter

### Community 34 - "Module Group 34"
Cohesion: 0.25
Nodes (1): BatchSizeExceededError

### Community 35 - "Module Group 35"
Cohesion: 0.43
Nodes (5): deleteEntry(), embedMemory(), getEntry(), storeEntry(), updateEntry()

### Community 36 - "Module Group 36"
Cohesion: 0.54
Nodes (7): agentPrime(), buildSuggestedActions(), clamp(), enforceResponseSize(), gatherEntities(), getRecentChanges(), truncate()

### Community 37 - "Module Group 37"
Cohesion: 0.46
Nodes (7): clampLimit(), fetchCodeResults(), fetchMemoryResults(), fetchTripleResults(), itemKey(), rrfFuse(), unifiedFind()

### Community 38 - "Module Group 38"
Cohesion: 0.29
Nodes (2): applyDfDeltaFromTerms(), applyDfDeltaFromTermsJson()

### Community 39 - "Module Group 39"
Cohesion: 0.43
Nodes (6): buildWhereClause(), escapeRegex(), findCallers(), findDefinition(), findImplementations(), renamePreview()

### Community 40 - "Module Group 40"
Cohesion: 0.25
Nodes (0): 

### Community 41 - "Module Group 41"
Cohesion: 0.48
Nodes (5): bootRetrieval(), makeFakeSearch(), makeFakeVectorIndex(), makeFakeWorkspace(), makeHandlerCapture()

### Community 42 - "Module Group 42"
Cohesion: 0.38
Nodes (4): BatchSizeExceededError, embedMemorySafe(), preparePayload(), storeEntryBatch()

### Community 43 - "Module Group 43"
Cohesion: 0.38
Nodes (3): normalizeModel(), normalizeProvider(), normalizeUpgradeConfig()

### Community 44 - "Module Group 44"
Cohesion: 0.43
Nodes (5): fastSearchWithRipgrep(), parseRipgrepJsonOutput(), parseRipgrepPlainOutput(), searchCode(), searchWithFilesystemWalk()

### Community 45 - "Module Group 45"
Cohesion: 0.62
Nodes (6): handleConfig(), handleStart(), handleStatus(), run(), writeError(), writeJson()

### Community 46 - "Module Group 46"
Cohesion: 0.38
Nodes (3): generateFish(), getCommandDesc(), getVerbDesc()

### Community 47 - "Module Group 47"
Cohesion: 0.33
Nodes (0): 

### Community 48 - "Module Group 48"
Cohesion: 0.6
Nodes (5): backupFile(), defaultIndex(), defaultMemory(), ensureConfigUpgraded(), safeWriteJson()

### Community 49 - "Module Group 49"
Cohesion: 0.6
Nodes (5): applyRrfAdjustments(), buildFusedBase(), computeRankingMode(), fuseRankAndRerank(), maybeApplyReranker()

### Community 50 - "Module Group 50"
Cohesion: 0.4
Nodes (2): bm25Idf(), bm25Score()

### Community 51 - "Module Group 51"
Cohesion: 0.6
Nodes (4): buildDefinitionPattern(), buildSymbolWordPattern(), classifySymbolLine(), escapeRegex()

### Community 52 - "Module Group 52"
Cohesion: 0.4
Nodes (0): 

### Community 53 - "Module Group 53"
Cohesion: 0.4
Nodes (0): 

### Community 54 - "Module Group 54"
Cohesion: 0.4
Nodes (0): 

### Community 55 - "Module Group 55"
Cohesion: 0.4
Nodes (0): 

### Community 56 - "Module Group 56"
Cohesion: 0.4
Nodes (0): 

### Community 57 - "Module Group 57"
Cohesion: 0.5
Nodes (2): buildScopePath(), getNodeName()

### Community 58 - "Module Group 58"
Cohesion: 0.4
Nodes (0): 

### Community 59 - "Module Group 59"
Cohesion: 0.5
Nodes (0): 

### Community 60 - "Module Group 60"
Cohesion: 0.67
Nodes (2): extensionName(), installSpawn()

### Community 61 - "Module Group 61"
Cohesion: 0.5
Nodes (0): 

### Community 62 - "Module Group 62"
Cohesion: 0.5
Nodes (0): 

### Community 63 - "Module Group 63"
Cohesion: 0.83
Nodes (3): createServices(), createVectorIndex(), createWorkspace()

### Community 64 - "Module Group 64"
Cohesion: 0.83
Nodes (3): installRuntimeWarningFilter(), shouldSuppressRuntimeWarning(), warningType()

### Community 65 - "Module Group 65"
Cohesion: 0.5
Nodes (0): 

### Community 66 - "Module Group 66"
Cohesion: 0.83
Nodes (3): backfillMemoryKgLinks(), extractAndLink(), _extractAndLinkInner()

### Community 67 - "Module Group 67"
Cohesion: 0.5
Nodes (0): 

### Community 68 - "Module Group 68"
Cohesion: 0.67
Nodes (2): scanAndBackfillProjects(), walkProjects()

### Community 69 - "Module Group 69"
Cohesion: 0.67
Nodes (0): 

### Community 70 - "Module Group 70"
Cohesion: 0.67
Nodes (0): 

### Community 71 - "Module Group 71"
Cohesion: 0.67
Nodes (0): 

### Community 72 - "Module Group 72"
Cohesion: 0.67
Nodes (0): 

### Community 73 - "Module Group 73"
Cohesion: 0.67
Nodes (0): 

### Community 74 - "Module Group 74"
Cohesion: 0.67
Nodes (0): 

### Community 75 - "Module Group 75"
Cohesion: 0.67
Nodes (0): 

### Community 76 - "Module Group 76"
Cohesion: 0.67
Nodes (0): 

### Community 77 - "Module Group 77"
Cohesion: 1.0
Nodes (2): buildResourceLink(), getMimeTypeFromPath()

### Community 78 - "Module Group 78"
Cohesion: 1.0
Nodes (2): getFileMemoryHints(), queryHintsByPath()

### Community 79 - "Module Group 79"
Cohesion: 0.67
Nodes (0): 

### Community 80 - "Module Group 80"
Cohesion: 0.67
Nodes (0): 

### Community 81 - "Module Group 81"
Cohesion: 0.67
Nodes (0): 

### Community 82 - "Module Group 82"
Cohesion: 0.67
Nodes (0): 

### Community 83 - "Module Group 83"
Cohesion: 0.67
Nodes (0): 

### Community 84 - "Module Group 84"
Cohesion: 0.67
Nodes (3): Opt-in Local Memory Store, LocalNest v0.0.3, LocalNest v0.0.4-beta.4

### Community 85 - "Module Group 85"
Cohesion: 0.67
Nodes (3): Hugging Face Embeddings Runtime, sqlite-vec Extension, LocalNest v0.0.4-beta.7

### Community 86 - "Module Group 86"
Cohesion: 0.67
Nodes (3): localnest:prime Command, Agent Prime Cold-Start Pattern, localnest_agent_prime Tool

### Community 87 - "Module Group 87"
Cohesion: 0.67
Nodes (3): localnest:find Command, Reciprocal Rank Fusion Cross-Source Ranking, localnest_find Tool

### Community 88 - "Module Group 88"
Cohesion: 0.67
Nodes (3): Node.js 22+ Requirement, node:sqlite Built-in Module, localnest-node-compat Skill

### Community 89 - "Module Group 89"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Module Group 90"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Module Group 91"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Module Group 92"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Module Group 93"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Module Group 94"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Module Group 95"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Module Group 96"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Module Group 97"
Cohesion: 1.0
Nodes (0): 

### Community 98 - "Module Group 98"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Module Group 99"
Cohesion: 1.0
Nodes (0): 

### Community 100 - "Module Group 100"
Cohesion: 1.0
Nodes (0): 

### Community 101 - "Module Group 101"
Cohesion: 1.0
Nodes (0): 

### Community 102 - "Module Group 102"
Cohesion: 1.0
Nodes (0): 

### Community 103 - "Module Group 103"
Cohesion: 1.0
Nodes (0): 

### Community 104 - "Module Group 104"
Cohesion: 1.0
Nodes (0): 

### Community 105 - "Module Group 105"
Cohesion: 1.0
Nodes (0): 

### Community 106 - "Module Group 106"
Cohesion: 1.0
Nodes (0): 

### Community 107 - "Module Group 107"
Cohesion: 1.0
Nodes (0): 

### Community 108 - "Module Group 108"
Cohesion: 1.0
Nodes (0): 

### Community 109 - "Module Group 109"
Cohesion: 1.0
Nodes (0): 

### Community 110 - "Module Group 110"
Cohesion: 1.0
Nodes (0): 

### Community 111 - "Module Group 111"
Cohesion: 1.0
Nodes (0): 

### Community 112 - "Module Group 112"
Cohesion: 1.0
Nodes (0): 

### Community 113 - "Module Group 113"
Cohesion: 1.0
Nodes (0): 

### Community 114 - "Module Group 114"
Cohesion: 1.0
Nodes (0): 

### Community 115 - "Module Group 115"
Cohesion: 1.0
Nodes (0): 

### Community 116 - "Module Group 116"
Cohesion: 1.0
Nodes (0): 

### Community 117 - "Module Group 117"
Cohesion: 1.0
Nodes (0): 

### Community 118 - "Module Group 118"
Cohesion: 1.0
Nodes (0): 

### Community 119 - "Module Group 119"
Cohesion: 1.0
Nodes (0): 

### Community 120 - "Module Group 120"
Cohesion: 1.0
Nodes (0): 

### Community 121 - "Module Group 121"
Cohesion: 1.0
Nodes (0): 

### Community 122 - "Module Group 122"
Cohesion: 1.0
Nodes (0): 

### Community 123 - "Module Group 123"
Cohesion: 1.0
Nodes (0): 

### Community 124 - "Module Group 124"
Cohesion: 1.0
Nodes (2): Indexing Model (chunk→term+embedding→SQLite), AST-Aware Chunking

### Community 125 - "Module Group 125"
Cohesion: 1.0
Nodes (2): TypeScript Migration (96 .ts files), Release v0.1.0 (2026-04-09)

### Community 126 - "Module Group 126"
Cohesion: 1.0
Nodes (2): nest:* Slash Commands (11 agentic orchestration), LocalNest v0.0.7-beta.3

### Community 127 - "Module Group 127"
Cohesion: 1.0
Nodes (2): localnest:remember Command, localnest_memory_store Tool (reference)

### Community 128 - "Module Group 128"
Cohesion: 1.0
Nodes (2): localnest doctor CLI Tool, localnest-mcp-runtime Skill

### Community 129 - "Module Group 129"
Cohesion: 1.0
Nodes (0): 

### Community 130 - "Module Group 130"
Cohesion: 1.0
Nodes (0): 

### Community 131 - "Module Group 131"
Cohesion: 1.0
Nodes (0): 

### Community 132 - "Module Group 132"
Cohesion: 1.0
Nodes (0): 

### Community 133 - "Module Group 133"
Cohesion: 1.0
Nodes (0): 

### Community 134 - "Module Group 134"
Cohesion: 1.0
Nodes (0): 

### Community 135 - "Module Group 135"
Cohesion: 1.0
Nodes (0): 

### Community 136 - "Module Group 136"
Cohesion: 1.0
Nodes (0): 

### Community 137 - "Module Group 137"
Cohesion: 1.0
Nodes (0): 

### Community 138 - "Module Group 138"
Cohesion: 1.0
Nodes (0): 

### Community 139 - "Module Group 139"
Cohesion: 1.0
Nodes (0): 

### Community 140 - "Module Group 140"
Cohesion: 1.0
Nodes (0): 

### Community 141 - "Module Group 141"
Cohesion: 1.0
Nodes (0): 

### Community 142 - "Module Group 142"
Cohesion: 1.0
Nodes (0): 

### Community 143 - "Module Group 143"
Cohesion: 1.0
Nodes (0): 

### Community 144 - "Module Group 144"
Cohesion: 1.0
Nodes (0): 

### Community 145 - "Module Group 145"
Cohesion: 1.0
Nodes (0): 

### Community 146 - "Module Group 146"
Cohesion: 1.0
Nodes (0): 

### Community 147 - "Module Group 147"
Cohesion: 1.0
Nodes (0): 

### Community 148 - "Module Group 148"
Cohesion: 1.0
Nodes (0): 

### Community 149 - "Module Group 149"
Cohesion: 1.0
Nodes (0): 

### Community 150 - "Module Group 150"
Cohesion: 1.0
Nodes (0): 

### Community 151 - "Module Group 151"
Cohesion: 1.0
Nodes (0): 

### Community 152 - "Module Group 152"
Cohesion: 1.0
Nodes (0): 

### Community 153 - "Module Group 153"
Cohesion: 1.0
Nodes (0): 

### Community 154 - "Module Group 154"
Cohesion: 1.0
Nodes (1): localnest_teach Tool (behavior modifiers)

### Community 155 - "Module Group 155"
Cohesion: 1.0
Nodes (1): localnest_audit Tool (self-audit)

### Community 156 - "Module Group 156"
Cohesion: 1.0
Nodes (1): Auto-Inference for memory_store

### Community 157 - "Module Group 157"
Cohesion: 1.0
Nodes (1): Symbol-Aware Code Intelligence

### Community 158 - "Module Group 158"
Cohesion: 1.0
Nodes (1): Auto-Migration (config schema)

### Community 159 - "Module Group 159"
Cohesion: 1.0
Nodes (1): Boot Sequence (6 steps)

### Community 160 - "Module Group 160"
Cohesion: 1.0
Nodes (1): Background Runtime Monitors

### Community 161 - "Module Group 161"
Cohesion: 1.0
Nodes (1): Security Policy (path traversal, command injection)

### Community 162 - "Module Group 162"
Cohesion: 1.0
Nodes (1): Indexing Tools (index_status, index_project)

### Community 163 - "Module Group 163"
Cohesion: 1.0
Nodes (1): Agent Diary Tools

### Community 164 - "Module Group 164"
Cohesion: 1.0
Nodes (1): CLI Reference (localnest noun verb)

### Community 165 - "Module Group 165"
Cohesion: 1.0
Nodes (1): LocalNest main branch

### Community 166 - "Module Group 166"
Cohesion: 1.0
Nodes (1): Conversation Ingestion

### Community 167 - "Module Group 167"
Cohesion: 1.0
Nodes (1): 13-Client Skill Distribution

### Community 168 - "Module Group 168"
Cohesion: 1.0
Nodes (1): LocalNest v0.0.1-beta.1

### Community 169 - "Module Group 169"
Cohesion: 1.0
Nodes (1): MemoryHooks Pub-Sub System

### Community 170 - "Module Group 170"
Cohesion: 1.0
Nodes (1): Nest/Branch Taxonomy

### Community 171 - "Module Group 171"
Cohesion: 1.0
Nodes (1): README Translation Policy

### Community 172 - "Module Group 172"
Cohesion: 1.0
Nodes (1): Setup Install Guide

### Community 173 - "Module Group 173"
Cohesion: 1.0
Nodes (1): Version Selection Guide

### Community 174 - "Module Group 174"
Cohesion: 1.0
Nodes (1): Config Schema Version 3

### Community 175 - "Module Group 175"
Cohesion: 1.0
Nodes (1): 13 AI Client Skill Support

### Community 176 - "Module Group 176"
Cohesion: 1.0
Nodes (1): localnest-mcp npm Package

### Community 177 - "Module Group 177"
Cohesion: 1.0
Nodes (1): localnest_search_hybrid Tool (reference)

### Community 178 - "Module Group 178"
Cohesion: 1.0
Nodes (1): localnest_kg_timeline Tool

### Community 179 - "Module Group 179"
Cohesion: 1.0
Nodes (1): localnest_graph_traverse Tool

### Community 180 - "Module Group 180"
Cohesion: 1.0
Nodes (1): localnest:selftest Command

### Community 181 - "Module Group 181"
Cohesion: 1.0
Nodes (1): localnest:onboard Command

### Community 182 - "Module Group 182"
Cohesion: 1.0
Nodes (1): localnest:teach Command

### Community 183 - "Module Group 183"
Cohesion: 1.0
Nodes (1): localnest:status Command

### Community 184 - "Module Group 184"
Cohesion: 1.0
Nodes (1): LocalNest MCP Troubleshooting Guide

## Knowledge Gaps
- **92 isolated node(s):** `sqlite-vec Index Backend`, `Contradiction Detection`, `localnest_teach Tool (behavior modifiers)`, `localnest_audit Tool (self-audit)`, `Conversation Ingestion (Markdown/JSON)` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module Group 89`** (2 nodes): `docusaurus.config.ts`, `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 90`** (2 nodes): `bin-shared.test.js`, `assertVersionCommand()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 91`** (2 nodes): `memory-workflow-service.test.js`, `createMemoryStub()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 92`** (2 nodes): `update-service.test.js`, `makeTempHome()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 93`** (2 nodes): `search-service-coverage.test.js`, `makeTempDir()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 94`** (2 nodes): `config-migrator.test.js`, `makeTempDir()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 95`** (2 nodes): `cli-help.test.js`, `runHelp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 96`** (2 nodes): `mcp-server.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 97`** (2 nodes): `register-tools.ts`, `registerAppTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 98`** (2 nodes): `find-tools.ts`, `registerFindTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 99`** (2 nodes): `audit-tools.ts`, `registerAuditTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 100`** (2 nodes): `symbol-tools.ts`, `registerSymbolTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 101`** (2 nodes): `memory-store.ts`, `registerMemoryStoreTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 102`** (2 nodes): `core.ts`, `registerCoreTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 103`** (2 nodes): `graph-tools.ts`, `registerGraphTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 104`** (2 nodes): `memory-workflow.ts`, `registerMemoryWorkflowTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 105`** (2 nodes): `retrieval.ts`, `registerRetrievalTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 106`** (2 nodes): `kg-delete-tools.ts`, `registerKgDeleteTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 107`** (2 nodes): `backfill-tools.ts`, `registerBackfillTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 108`** (2 nodes): `staleness-monitor.ts`, `startStalenessMonitor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 109`** (2 nodes): `kg-search.ts`, `searchTriples()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 110`** (2 nodes): `list.ts`, `listEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 111`** (2 nodes): `capture.ts`, `captureEvent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 112`** (2 nodes): `dedup.ts`, `checkDuplicate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 113`** (2 nodes): `recall.ts`, `recall()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 114`** (2 nodes): `teach.ts`, `teach()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 115`** (2 nodes): `entity-extractor.ts`, `extractEntities()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 116`** (2 nodes): `semantic-search.ts`, `semanticSearch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 117`** (2 nodes): `languages.ts`, `getExt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 118`** (2 nodes): `auto-index.ts`, `maybeBootstrapSemanticIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 119`** (2 nodes): `options.ts`, `parseGlobalOptions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 120`** (2 nodes): `spinner.ts`, `startSpinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 121`** (2 nodes): `parse-flags.ts`, `parseFlags()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 122`** (2 nodes): `tool-count.ts`, `countToolRegistrations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 123`** (2 nodes): `localnest.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 124`** (2 nodes): `Indexing Model (chunk→term+embedding→SQLite)`, `AST-Aware Chunking`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 125`** (2 nodes): `TypeScript Migration (96 .ts files)`, `Release v0.1.0 (2026-04-09)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 126`** (2 nodes): `nest:* Slash Commands (11 agentic orchestration)`, `LocalNest v0.0.7-beta.3`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 127`** (2 nodes): `localnest:remember Command`, `localnest_memory_store Tool (reference)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 128`** (2 nodes): `localnest doctor CLI Tool`, `localnest-mcp-runtime Skill`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 129`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 130`** (1 nodes): `sidebars.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 131`** (1 nodes): `search-service.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 132`** (1 nodes): `sqlite-vec-index-service.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 133`** (1 nodes): `model-services.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 134`** (1 nodes): `release-exit-criteria.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 135`** (1 nodes): `staleness-monitor.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 136`** (1 nodes): `upgrade-assistant.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 137`** (1 nodes): `runtime-warning-filter.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 138`** (1 nodes): `create-services-import.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 139`** (1 nodes): `install-localnest-skill.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 140`** (1 nodes): `mcp-runtime-start.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 141`** (1 nodes): `status-builder.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 142`** (1 nodes): `release-test-installed-runtime.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 143`** (1 nodes): `version.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 144`** (1 nodes): `tree-sitter.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 145`** (1 nodes): `schemas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 146`** (1 nodes): `localnest-mcp-setup.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 147`** (1 nodes): `localnest-mcp-task-context.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 148`** (1 nodes): `localnest-mcp-upgrade.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 149`** (1 nodes): `localnest-mcp-install-skill.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 150`** (1 nodes): `_shared.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 151`** (1 nodes): `localnest-mcp-doctor.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 152`** (1 nodes): `localnest-mcp.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 153`** (1 nodes): `localnest-mcp-capture-outcome.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 154`** (1 nodes): `localnest_teach Tool (behavior modifiers)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 155`** (1 nodes): `localnest_audit Tool (self-audit)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 156`** (1 nodes): `Auto-Inference for memory_store`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 157`** (1 nodes): `Symbol-Aware Code Intelligence`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 158`** (1 nodes): `Auto-Migration (config schema)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 159`** (1 nodes): `Boot Sequence (6 steps)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 160`** (1 nodes): `Background Runtime Monitors`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 161`** (1 nodes): `Security Policy (path traversal, command injection)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 162`** (1 nodes): `Indexing Tools (index_status, index_project)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 163`** (1 nodes): `Agent Diary Tools`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 164`** (1 nodes): `CLI Reference (localnest noun verb)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 165`** (1 nodes): `LocalNest main branch`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 166`** (1 nodes): `Conversation Ingestion`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 167`** (1 nodes): `13-Client Skill Distribution`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 168`** (1 nodes): `LocalNest v0.0.1-beta.1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 169`** (1 nodes): `MemoryHooks Pub-Sub System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 170`** (1 nodes): `Nest/Branch Taxonomy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 171`** (1 nodes): `README Translation Policy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 172`** (1 nodes): `Setup Install Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 173`** (1 nodes): `Version Selection Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 174`** (1 nodes): `Config Schema Version 3`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 175`** (1 nodes): `13 AI Client Skill Support`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 176`** (1 nodes): `localnest-mcp npm Package`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 177`** (1 nodes): `localnest_search_hybrid Tool (reference)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 178`** (1 nodes): `localnest_kg_timeline Tool`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 179`** (1 nodes): `localnest_graph_traverse Tool`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 180`** (1 nodes): `localnest:selftest Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 181`** (1 nodes): `localnest:onboard Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 182`** (1 nodes): `localnest:teach Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 183`** (1 nodes): `localnest:status Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 184`** (1 nodes): `LocalNest MCP Troubleshooting Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MemoryService` connect `Memory Service` to `SQLite Vec + Embedding Service`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `SqliteVecIndexService` connect `Vector Index Service` to `SQLite Vec + Embedding Service`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `WorkspaceService` connect `Workspace & Project Service` to `SQLite Vec + Embedding Service`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `sqlite-vec Index Backend`, `Contradiction Detection`, `localnest_teach Tool (behavior modifiers)` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture & Core Design` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `KG Store Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `SQLite Vec + Embedding Service` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._