import { Adapter } from '../types/engine.js';
import { 
  MemoryEntry, 
  MemoryEntryWithRevisions, 
  StoreEntryInput, 
  StoreEntryResult, 
  RecallInput,
  MemoryEntryRow
} from '../engine/memory/types/index.js';

/**
 * High-level service for interacting with the cognitive memory.
 */
export interface IMemoryService {
  getStatus(): Promise<Record<string, unknown>>;
  listEntries(opts?: any): Promise<any>;
  getEntry(id: string): Promise<MemoryEntryWithRevisions | null>;
  storeEntry(input: StoreEntryInput): Promise<StoreEntryResult>;
  recall(args: RecallInput): Promise<any>;
  deleteEntry(id: string): Promise<any>;
  close(): Promise<void>;
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
  searchHybrid(opts: any): Promise<any>;
  searchCode(opts: any): any[];
}

/**
 * Registry for all core services.
 */
export interface IServiceRegistry {
  getMemory(): IMemoryService;
  getEmbedding(): IEmbeddingService;
  getSearch(): ISearchService;
}
