/** Memory entry, store, and dedup types. */
import type { Link, ScopeInput } from './adapter.js';

// ---------------------------------------------------------------------------
// Memory entry (as stored / returned)
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  id: string;
  kind: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  importance: number;
  confidence: number;
  scope_root_path: string;
  scope_project_path: string;
  scope_branch_name: string;
  topic: string;
  feature: string;
  nest: string;
  branch: string;
  agent_id: string;
  actor_id: string;
  tags: string[];
  links: Link[];
  source_type: string;
  source_ref: string;
  created_at: string;
  updated_at: string;
  last_recalled_at: string | null;
  recall_count: number;
}

/** Raw DB row before JSON fields are parsed. */
export interface MemoryEntryRow {
  id: string;
  kind: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  importance: number;
  confidence: number;
  scope_root_path: string;
  scope_project_path: string;
  scope_branch_name: string;
  topic: string;
  feature: string;
  nest: string;
  branch: string;
  agent_id: string;
  actor_id: string;
  tags_json: string;
  search_terms_json: string;
  links_json: string;
  source_type: string;
  source_ref: string;
  fingerprint: string;
  embedding_json: string | null;
  created_at: string;
  updated_at: string;
  last_recalled_at: string | null;
  recall_count: number;
}

export interface MemoryRevision {
  revision: number;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  links: Link[];
  change_note: string;
  created_at: string;
}

export interface MemoryRevisionRow {
  id?: number;
  memory_id: string;
  revision: number;
  title: string;
  summary: string;
  content: string;
  tags_json: string;
  links_json: string;
  change_note: string;
  created_at: string;
}

export interface MemoryEntryWithRevisions extends MemoryEntry {
  revisions: MemoryRevision[];
}

// ---------------------------------------------------------------------------
// Dedup
// ---------------------------------------------------------------------------

export interface DuplicateMatch {
  id: string;
  title: string;
  similarity: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  match?: DuplicateMatch;
}

export interface DuplicateCheckOpts {
  threshold?: number;
  nest?: string;
  branch?: string;
  projectPath?: string;
}

// ---------------------------------------------------------------------------
// Embedding service (external dependency interface)
// ---------------------------------------------------------------------------

export interface EmbeddingService {
  isEnabled(): boolean;
  embed(text: string): Promise<number[]>;
}

// ---------------------------------------------------------------------------
// Auto-link results (used by StoreEntryResult and KG module)
// ---------------------------------------------------------------------------

export interface AutoLinkedEntity {
  entity_id: string;
  name: string;
  entity_type: string;
}

export interface AutoLinkedTriple {
  triple_id: string;
  subject: string;
  predicate: string;
  object: string;
}

// ---------------------------------------------------------------------------
// Store input / result
// ---------------------------------------------------------------------------

export interface StoreEntryInput {
  kind?: string;
  title?: string;
  summary?: string;
  content: string;
  status?: string;
  importance?: number;
  confidence?: number;
  tags?: string[];
  links?: Link[];
  scope?: ScopeInput;
  nest?: string;
  branch?: string;
  agent_id?: string;
  actor_id?: string;
  source_type?: string;
  sourceType?: string;
  source_ref?: string;
  sourceRef?: string;
  change_note?: string;
  dedup_threshold?: number;
  event_type?: string;
  memory_status?: string;
}

export interface StoreEntryResult {
  created: boolean;
  duplicate: boolean;
  semantic_match?: DuplicateMatch;
  memory: MemoryEntryWithRevisions | null;
  cancelled?: boolean;
  reason?: string;
  auto_linked_entities?: AutoLinkedEntity[];
  auto_triples?: AutoLinkedTriple[];
}

export interface UpdateEntryPatch {
  kind?: string;
  title?: string;
  summary?: string;
  content?: string;
  status?: string;
  importance?: number;
  confidence?: number;
  tags?: string[];
  links?: Link[];
  scope?: ScopeInput;
  nest?: string;
  branch?: string;
  source_type?: string;
  source_ref?: string;
  change_note?: string;
}

export interface DeleteEntryResult {
  deleted: boolean;
  id: string;
}

// ---------------------------------------------------------------------------
// Store-level list / status
// ---------------------------------------------------------------------------

export interface ListEntriesOpts {
  kind?: string;
  status?: string;
  projectPath?: string;
  topic?: string;
  nest?: string;
  branch?: string;
  actorId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ListEntriesResult {
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  items: MemoryEntry[];
}

export interface StoreStatusResult {
  enabled: boolean;
  db_path: string;
  db_exists: boolean;
  requested_backend: string;
  selected_backend: string | null;
  initialized: boolean;
  schema_version?: number;
  total_entries?: number;
  total_revisions?: number;
  total_events?: number;
  total_relations?: number;
}
