/** Relation, diary, and taxonomy types. */
import type { MemoryEntry } from './entries.js';

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export interface MemoryRelation {
  source_id: string;
  target_id: string;
  relation_type: string;
  created_at: string;
}

export interface RelationSuggestion {
  memory_id: string;
  title: string;
  similarity: number;
}

export interface SuggestRelationsResult {
  id: string;
  source_title: string;
  count: number;
  threshold: number;
  using_embeddings: boolean;
  suggestions: RelationSuggestion[];
}

export interface AddRelationResult {
  source_id: string;
  target_id: string;
  relation_type: string;
}

export interface RemoveRelationResult {
  removed: boolean;
  source_id: string;
  target_id: string;
}

export interface RelatedItem {
  relation_type: string;
  direction: string;
  memory: MemoryEntry;
}

export interface GetRelatedResult {
  id: string;
  count: number;
  related: RelatedItem[];
}

// ---------------------------------------------------------------------------
// Diary (agent scopes)
// ---------------------------------------------------------------------------

export interface DiaryEntry {
  id: string;
  agent_id: string;
  content: string;
  topic: string;
  created_at: string;
}

export interface WriteDiaryInput {
  agentId: string;
  content: string;
  topic?: string;
}

export interface ReadDiaryInput {
  agentId: string;
  topic?: string;
  limit?: number;
  offset?: number;
}

export interface ReadDiaryResult {
  agent_id: string;
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  items: DiaryEntry[];
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export interface NestListItem {
  nest: string;
  count: number;
}

export interface BranchListItem {
  branch: string;
  count: number;
}

export interface TaxonomyNest {
  nest: string;
  count: number;
  branches: BranchListItem[];
}

export interface TaxonomyTree {
  total_nests: number;
  total_branches: number;
  total_memories: number;
  total_kg_entities?: number;
  total_kg_triples?: number;
  nests: TaxonomyNest[];
}
