import { IServiceRegistry, IMemoryService, IEmbeddingService, ISearchService } from '../interfaces/services.js';
import { MemoryService } from '../engine/memory/service.js';
import { EmbeddingService } from '../engine/retrieval/embedding/service.js';
import { SearchService } from '../engine/retrieval/search/service.js';
import { buildRuntimeConfig, IGNORE_DIRS, TEXT_EXTENSIONS, PROJECT_MARKER_FILES, PROJECT_HINT_DIRS, DEFAULT_MAX_FILE_BYTES } from './config.js';
import { WorkspaceService } from '../engine/workspace/service.js';

export class CoreServiceRegistry implements IServiceRegistry {
  private _memory: IMemoryService | null = null;
  private _embedding: IEmbeddingService | null = null;
  private _search: ISearchService | null = null;

  getMemory(): IMemoryService {
    if (!this._memory) {
      const runtime = buildRuntimeConfig();
      const embedding = this.getEmbedding();
      this._memory = new MemoryService({
        synapseHome: runtime.synapseHome,
        enabled: runtime.memoryEnabled,
        backend: runtime.memoryBackend,
        dbPath: runtime.memoryDbPath,
        autoCapture: runtime.memoryAutoCapture,
        consentDone: runtime.memoryConsentDone,
        embeddingService: embedding as any,
      }) as unknown as IMemoryService;
    }
    return this._memory!;
  }

  getEmbedding(): IEmbeddingService {
    if (!this._embedding) {
      const runtime = buildRuntimeConfig();
      this._embedding = new EmbeddingService({
        provider: runtime.embeddingProvider,
        model: runtime.embeddingModel,
        cacheDir: runtime.embeddingCacheDir,
      }) as any;
    }
    return this._embedding!;
  }

  getSearch(): ISearchService {
    if (!this._search) {
      const runtime = buildRuntimeConfig();
      const workspace = new WorkspaceService({
        roots: runtime.roots,
        ignoreDirs: IGNORE_DIRS,
        textExtensions: TEXT_EXTENSIONS,
        projectMarkerFiles: PROJECT_MARKER_FILES,
        projectHintDirs: PROJECT_HINT_DIRS,
        extraProjectMarkers: runtime.extraProjectMarkers,
        maxFileBytes: DEFAULT_MAX_FILE_BYTES,
        autoProjectSplit: runtime.autoProjectSplit,
        maxAutoProjects: runtime.maxAutoProjects,
        forceSplitChildren: runtime.forceSplitChildren,
      });
      
      this._search = new SearchService({
        workspace: workspace as any,
        ignoreDirs: IGNORE_DIRS,
        hasRipgrep: runtime.hasRipgrep,
        rgTimeoutMs: runtime.rgTimeoutMs,
        maxFileBytes: DEFAULT_MAX_FILE_BYTES,
        vectorIndex: null, // load from memory service
      }) as any;
    }
    return this._search!;
  }
}

/**
 * Global singleton for convenient access, although DI is preferred.
 */
export const services = new CoreServiceRegistry();
