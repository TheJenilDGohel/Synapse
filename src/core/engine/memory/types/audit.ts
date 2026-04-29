/** What's-New temporal awareness and self-audit dashboard types. */

// ---------------------------------------------------------------------------
// What's New (temporal awareness)
// ---------------------------------------------------------------------------

export interface WhatsNewInput {
  since: string;
  agentId?: string;
  projectPath?: string;
  limit?: number;
}

export interface WhatsNewMemoryItem {
  id: string;
  title: string;
  kind: string;
  created_at: string;
}

export interface WhatsNewTripleItem {
  id: string;
  subject_name: string;
  predicate: string;
  object_name: string;
  created_at: string;
}

export interface WhatsNewCommitItem {
  id: number;
  title: string;
  event_type: string;
  created_at: string;
}

export interface WhatsNewResult {
  since: string;
  resolved_from: 'timestamp' | 'last_session' | 'epoch';
  new_memories: { count: number; items: WhatsNewMemoryItem[] };
  new_triples: { count: number; items: WhatsNewTripleItem[] };
  files_changed: { count: number; paths: string[] };
  recent_commits: { count: number; items: WhatsNewCommitItem[] };
  summary: string;
}

// ---------------------------------------------------------------------------
// Self-Audit Dashboard
// ---------------------------------------------------------------------------

export interface AuditProjectCoverage {
  total_projects: number;
  projects_with_memories: number;
  projects_without_memories: number;
  total_memories: number;
  projects: Array<{ project_path: string; memory_count: number }>;
}

export interface AuditKgDensity {
  total_entities: number;
  total_triples: number;
  active_triples: number;
  orphaned_entities: number;
  orphaned_entity_list: Array<{ id: string; name: string; entity_type: string }>;
  duplicate_triples: number;
  duplicate_triple_details: Array<{
    subject_id: string;
    predicate: string;
    object_id: string;
    count: number;
  }>;
  connected_components: number;
}

export interface AuditNestHealth {
  memories_without_nest: number;
  memories_without_branch: number;
  broken_bridges: number;
  broken_bridge_list: Array<{
    triple_id: string;
    subject_id: string;
    object_id: string;
    predicate: string;
    issue: string;
  }>;
}

export interface AuditStaleMemoryItem {
  id: string;
  title: string;
  importance: number;
  recall_count: number;
  created_at: string;
  last_recalled_at: string | null;
}

export interface AuditStaleMemories {
  stale_count: number;
  never_recalled_count: number;
  low_importance_count: number;
  stale_items: AuditStaleMemoryItem[];
}

export interface AuditSuggestion {
  category: 'coverage' | 'kg_density' | 'nest_health' | 'stale';
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface AuditResult {
  audited_at: string;
  health_score: number;
  project_coverage: AuditProjectCoverage;
  kg_density: AuditKgDensity;
  nest_health: AuditNestHealth;
  stale_memories: AuditStaleMemories;
  suggestions: AuditSuggestion[];
  summary: string;
}
