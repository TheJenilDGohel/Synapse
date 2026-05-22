import { 
  MemoryEntryWithRevisions, 
  StoreEntryInput, 
  StoreEntryResult, 
  RecallInput
} from '../engine/memory/types/index.js';

/**
 * Interface for Knowledge Graph operations.
 */
export interface IKnowledgeGraphService {
  addEntity(opts: Record<string, unknown>): Promise<any>;
  addTriple(opts: Record<string, unknown>): Promise<any>;
  addEntityBatch(opts: Record<string, unknown>): Promise<any>;
  addTripleBatch(opts: Record<string, unknown>): Promise<any>;
  listEntities(opts: Record<string, unknown>): Promise<any>;
  queryEntityRelationships(entityId: string, opts: Record<string, unknown>): Promise<any>;
  invalidateTriple(tripleId: string, validTo?: string | null): Promise<any>;
  queryTriplesAsOf(entityId: string, asOfDate: string, mode?: 'event' | 'transaction'): Promise<any>;
  getEntityTimeline(entityId: string): Promise<any>;
  getKgStats(): Promise<any>;
  deleteEntity(entityId: string): Promise<any>;
  deleteEntityBatch(args: { entity_ids: string[] }): Promise<any>;
  deleteTripleBatch(args: { triple_ids: string[] }): Promise<any>;
  traverseGraph(opts: Record<string, unknown>): Promise<any>;
  discoverBridges(opts: Record<string, unknown>): Promise<any>;
  backfillMemoryKgLinks(opts: Record<string, unknown>): Promise<any>;
  searchTriples(args: { query: string; limit?: number }): Promise<any>;
}

/**
 * Interface for Taxonomy and Branch management.
 */
export interface ITaxonomyService {
  listNests(): Promise<any>;
  listBranches(nest: string): Promise<any>;
  getTaxonomyTree(): Promise<any>;
  manageBranches(opts: Record<string, unknown>): Promise<any>;
}

/**
 * Interface for Ingestion operations.
 */
export interface IIngestionEngine {
  ingestMarkdown(opts: Record<string, unknown>): Promise<any>;
  ingestJson(opts: Record<string, unknown>): Promise<any>;
}

/**
 * Interface for Durable Storage operations.
 */
export interface IDurableStore {
  hooks: any;
}

/**
 * High-level service for interacting with the cognitive memory.
 */
export interface IMemoryService extends IKnowledgeGraphService, ITaxonomyService, IIngestionEngine {
  // Core Memory
  getStatus(): Promise<Record<string, unknown>>;
  listEntries(opts: Record<string, unknown>): Promise<any>;
  getEntry(id: string): Promise<MemoryEntryWithRevisions | null>;
  storeEntry(input: StoreEntryInput | Record<string, unknown>): Promise<StoreEntryResult | any>;
  storeEntryBatch(args: { memories: Array<Record<string, unknown>>; response_format?: 'minimal' | 'verbose' }): Promise<any>;
  updateEntry(id: string, patch: Record<string, unknown>): Promise<any>;
  deleteEntry(id: string): Promise<any>;
  deleteEntryBatch(args: { ids: string[] }): Promise<any>;
  recall(args: RecallInput | Record<string, unknown>): Promise<any>;
  close(): Promise<void>;

  // Events
  captureEvent(args: Record<string, unknown>): Promise<any>;
  listEvents(opts: Record<string, unknown>): Promise<any>;

  // Relations
  suggestRelations(id: string, opts: { threshold: number; maxResults: number }): Promise<any>;
  addRelation(sourceId: string, targetId: string, relationType: string): Promise<any>;
  removeRelation(sourceId: string, targetId: string): Promise<any>;
  getRelated(id: string): Promise<any>;

  // Diary
  writeDiaryEntry(opts: Record<string, unknown>): Promise<any>;
  readDiaryEntries(opts: Record<string, unknown>): Promise<any>;

  // Utility
  checkDuplicate(content: string, opts: Record<string, unknown>): Promise<any>;
  audit(): Promise<any>;
  scanAndBackfillProjects(opts: Record<string, unknown>): Promise<any>;
  whatsNew(args: Record<string, unknown>): Promise<any>;
  getFileMemoryHints(filePath: string, suggestUpdate?: boolean): Promise<any>;

  // Store access
  store: IDurableStore;
}

/**
 * Workflow and task-specific services.
 */
export interface IMemoryWorkflowService {
  getTaskContext(args: Record<string, unknown>): Promise<any>;
  captureOutcome(args: Record<string, unknown>): Promise<any>;
  agentPrime(args: Record<string, unknown>): Promise<any>;
  teach(args: Record<string, unknown>): Promise<any>;
}

/**
 * Service for embedding text into vectors.
 */
export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
  isEnabled(): boolean;
}

/**
 * Service for hybrid lexical+semantic search.
 */
export interface ISearchService {
  searchHybrid(opts: Record<string, unknown>): Promise<any>;
  searchCode(opts: Record<string, unknown>): any[];
  searchFiles(opts: Record<string, unknown>): any[];
  getSymbol(opts: Record<string, unknown>): any;
  findUsages(opts: Record<string, unknown>): any;
}

/**
 * Service for symbol search and navigation.
 */
export interface ISymbolSearchService {
  searchSymbols(opts: Record<string, unknown>): Promise<any>;
  getSymbolInfo(opts: Record<string, unknown>): Promise<any>;
  findCallersSymbol(opts: {
    symbol: string;
    projectPath?: string;
    language?: string;
    maxResults?: number;
  }): any;
  findDefinitionSymbol(opts: {
    symbol: string;
    projectPath?: string;
    language?: string;
  }): any;
  findImplementationsSymbol(opts: {
    interfaceName: string;
    projectPath?: string;
    language?: string;
    maxResults?: number;
  }): any;
  renamePreviewSymbol(opts: {
    oldName: string;
    newName: string;
    projectPath?: string;
    maxResults?: number;
  }): any;
}

/**
 * Service for workspace management.
 */
export interface IWorkspaceService {
  listRoots(): any[];
  listProjects(rootPath: string | undefined, max: number): any[];
  normalizeTarget(inputPath: string): string;
  safeReadText(filePath: string): string;
  projectTree(projectPath: string, maxDepth: number, maxEntries: number, compact?: boolean): any;
  readFileChunk(filePath: string, startLine: number, endLine: number, maxWidth: number, mode?: 'lines' | 'signatures'): Promise<any>;
  summarizeProject(projectPath: string, maxFiles: number): any;
  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
  listWorkspaces?(): Promise<any>;
  getWorkspaceInfo?(name: string): Promise<any>;
  setWorkspaceContext?(name: string): Promise<any>;
}

/**
 * Service for vector index maintenance.
 */
export interface IVectorIndexService {
  getVectorStats(): Promise<any>;
  rebuildIndex(): Promise<any>;
  getStatus(): any;
  indexProject(opts: Record<string, unknown>): Promise<any>;
}

/**
 * Service for system updates.
 */
export interface IUpdateService {
  getStatus(opts: { force: boolean; channel?: string }): Promise<any>;
  selfUpdate(opts: {
    approvedByUser: boolean;
    dryRun: boolean;
    version: string;
    reinstallSkill: boolean;
  }): Promise<any>;
}

/**
 * Intelligence & Prevention Services
 */

export interface SessionSignal {
  currentFile?: string;
  recentFiles: string[];
  recentTools: string[];
  activeSymbols: string[];
  sessionStartedAt: Date;
}

export interface PredictedContext {
  confidence: number;
  memoryEntries: string[];
  kgEntities: string[];
  relatedFiles: string[];
  rationale: string;
  predictedAt: Date;
}

export interface IPredictionEngine {
  predictContext(signal: SessionSignal): Promise<PredictedContext>;
  recordSessionOutcome(
    signal: SessionSignal,
    predicted: PredictedContext,
    actualFilesTouched: string[]
  ): Promise<void>;
}

export type MistakeCategory =
  | 'race_condition'
  | 'memory_leak'
  | 'unhandled_promise'
  | 'n_plus_one_query'
  | 'missing_error_boundary'
  | 'improper_cache_invalidation'
  | 'circular_dependency'
  | 'missing_null_check'
  | 'architectural_coupling'
  | 'performance_regression'
  | 'custom';

export interface MistakePattern {
  id: string;
  category: MistakeCategory;
  title: string;
  description: string;
  codeSignature: string;
  languages: string[];
  triggeredBy: string[];
  resolution: string;
  firstEncountered: Date;
  timesTriggered: number;
  sourceFile?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImmuneWarning {
  patternId: string;
  title: string;
  severity: MistakePattern['severity'];
  message: string;
  originalContext: string;
  resolution: string;
  confidence: number;
  matchedIn: string;
}

export interface IImmuneSystem {
  recordMistake(pattern: Omit<MistakePattern, 'id' | 'firstEncountered' | 'timesTriggered'>): Promise<string>;
  scanForPatterns(code: string, language: string, filePath: string): Promise<ImmuneWarning[]>;
  listPatterns(category?: MistakeCategory): Promise<MistakePattern[]>;
  dismissWarning(patternId: string, reason: string): Promise<void>;
  getMistakeHistory(): Promise<{ pattern: MistakePattern; triggeredCount: number }[]>;
}

export interface ArchitecturalProposal {
  description: string;
  technologies: string[];
  pattern: string;
  affectedEntities?: string[];
  context?: string;
}

export interface FailureMode {
  title: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high' | 'catastrophic';
  source: 'your_history' | 'pattern_library' | 'technology_specific';
  sourceDetail: string;
  mitigation: string;
  detectedAt?: string;
}

export interface PreMortemReport {
  proposal: ArchitecturalProposal;
  failureModes: FailureMode[];
  historicalPrecedents: {
    decision: string;
    outcome: string;
    date: Date;
    entityId: string;
  }[];
  recommendation: 'proceed' | 'proceed_with_caution' | 'reconsider';
  recommendationRationale: string;
  generatedAt: Date;
}

export interface IPreMortemEngine {
  analyze(proposal: ArchitecturalProposal): Promise<PreMortemReport>;
  getPatternLibrary(pattern: string): Promise<FailureMode[]>;
  addToPatternLibrary(failure: Omit<FailureMode, 'source'> & { technology: string }): Promise<void>;
}

/**
 * Registry for all core services.
 */
export interface IServiceRegistry {
  getMemory(): IMemoryService;
  getEmbedding(): IEmbeddingService;
  getSearch(): ISearchService;
  getSymbolSearch?(): ISymbolSearchService;
  getWorkspace?(): IWorkspaceService;
  getVectorIndex?(): IVectorIndexService;
  getUpdate?(): IUpdateService;
  getMemoryWorkflow?(): IMemoryWorkflowService;
  getPrediction?(): IPredictionEngine;
  getImmuneSystem?(): IImmuneSystem;
  getPreMortem?(): IPreMortemEngine;
}
