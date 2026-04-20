/** Knowledge graph entity, triple, and traversal types. */
import type { AutoLinkedEntity, AutoLinkedTriple } from './entries.js';

// ---------------------------------------------------------------------------
// Knowledge graph entities and triples
// ---------------------------------------------------------------------------

export interface KgEntity {
  id: string;
  name: string;
  entity_type: string;
  properties_json: string;
  memory_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface KgEntityWithRelations extends KgEntity {
  properties: Record<string, unknown>;
  outgoing: KgTriple[];
  incoming: KgTriple[];
}

export interface KgTriple {
  id: string;
  subject_id: string;
  predicate: string;
  object_id: string;
  valid_from: string | null;
  valid_to: string | null;
  confidence: number;
  source_memory_id: string | null;
  source_type: string;
  created_at: string;
  recorded_at: string;
}

export interface KgTripleWithNames extends KgTriple {
  subject_name: string;
  object_name: string;
}

export interface AddEntityInput {
  name: string;
  type?: string;
  properties?: Record<string, unknown>;
  memoryId?: string;
}

export interface AddEntityResult extends KgEntity {
  created: boolean;
}

export interface AddTripleInput {
  subjectId?: string;
  subjectName?: string;
  predicate: string;
  objectId?: string;
  objectName?: string;
  validFrom?: string | null;
  validTo?: string | null;
  confidence?: number;
  sourceMemoryId?: string | null;
  sourceType?: string;
}

export interface TripleContradiction {
  existing_triple_id: string;
  existing_object_id: string;
  existing_object_name: string;
}

export interface AddTripleResult {
  id: string;
  subject_id: string;
  predicate: string;
  object_id: string;
  valid_from: string | null;
  valid_to: string | null;
  confidence: number;
  source_memory_id: string | null;
  source_type: string;
  created_at: string;
  recorded_at: string;
  contradictions: TripleContradiction[];
  has_contradiction: boolean;
}

export interface AutoLinkResult {
  auto_linked_entities: AutoLinkedEntity[];
  auto_triples: AutoLinkedTriple[];
}

export interface BackfillResult {
  memories_scanned: number;
  memories_linked: number;
  triples_created: number;
  errors: number;
}

export interface InvalidateTripleResult {
  id: string;
  valid_to: string;
  invalidated: boolean;
}

export interface DeleteEntityResult {
  deleted: boolean;
  entity_id: string;
  triples_removed: number;
}

export interface DeleteEntityBatchResult {
  deleted: number;
  triples_removed: number;
  errors: Array<{ index: number; message: string }>;
}

export interface DeleteTripleBatchResult {
  deleted: number;
  errors: Array<{ index: number; message: string }>;
}

export interface QueryRelationshipsResult {
  entity_id: string;
  direction: string;
  count: number;
  triples: KgTripleWithNames[];
}

export interface KgStats {
  entities: number;
  triples: number;
  active_triples: number;
  by_predicate: Array<{ predicate: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Graph traversal
// ---------------------------------------------------------------------------

export interface TraverseGraphOpts {
  startEntityId: string;
  maxHops?: number;
  direction?: 'outgoing' | 'incoming' | 'both';
}

export interface TraverseGraphResult {
  start_entity_id: string;
  max_hops: number;
  direction: string;
  discovered_count: number;
  entities: Array<{
    entity_id: string;
    name: string;
    entity_type: string;
    depth: number;
    path: string[];
  }>;
}

export interface DiscoverBridgesOpts {
  nest?: string;
  /** When 'cross-branch', find bridges across branches within the given nest instead of across nests. */
  mode?: 'cross-nest' | 'cross-branch';
}

export interface BridgeEntry {
  triple_id: string;
  subject_id: string;
  subject_name: string;
  predicate: string;
  object_id: string;
  object_name: string;
  subject_nest: string;
  object_nest: string;
  subject_type?: string;
  object_type?: string;
  subject_branch?: string;
  object_branch?: string;
}

export interface DiscoverBridgesResult {
  filter_nest: string | null;
  bridge_count: number;
  bridges: BridgeEntry[];
  insights: string[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Project backfill
// ---------------------------------------------------------------------------

export interface ProjectBackfillOpts {
  rootPath: string;
  dryRun?: boolean;
}

export interface ProjectBackfillProject {
  path: string;
  name: string;
  language: string;
  marker: string;
  status: 'backfilled' | 'would_backfill' | 'skipped_has_memories' | 'error';
  error?: string;
}

export interface ProjectBackfillResult {
  root_path: string;
  projects_found: number;
  projects_backfilled: number;
  projects_skipped: number;
  dry_run: boolean;
  projects: ProjectBackfillProject[];
}
