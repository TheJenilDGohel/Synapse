/** Memory event capture and signal scoring types. */
import type { Link, Scope, ScopeInput } from './adapter.js';

// ---------------------------------------------------------------------------
// Memory events
// ---------------------------------------------------------------------------

export interface MemoryEvent {
  id: number;
  event_type: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  signal_score: number;
  promoted_memory_id: string | null;
  scope_root_path: string;
  scope_project_path: string;
  scope_branch_name: string;
  topic: string;
  feature: string;
  tags_json: string;
  links_json: string;
  source_ref: string;
  created_at: string;
}

export interface CaptureEventInput {
  event_type?: string;
  eventType?: string;
  title?: string;
  summary?: string;
  content?: string;
  status?: string;
  importance?: number;
  confidence?: number;
  files_changed?: number;
  filesChanged?: number;
  has_tests?: boolean;
  hasTests?: boolean;
  tags?: string[];
  links?: Link[];
  scope?: ScopeInput;
  nest?: string;
  branch?: string;
  source_ref?: string;
  sourceRef?: string;
  kind?: string;
  memory_status?: string;
}

export interface CaptureEventResult {
  event_id: number | bigint | null;
  event_type: string;
  signal_score: number;
  promotion_threshold: number;
  status: string;
  promoted_memory_id: string | null;
}

export interface ListEventsResult {
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  items: EventListItem[];
}

export interface EventListItem {
  id: number;
  event_type: string;
  title: string;
  summary: string;
  status: string;
  signal_score: number;
  promoted_memory_id: string | null;
  scope_project_path: string;
  topic: string;
  feature: string;
  tags: string[];
  source_ref: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Signal scoring (event heuristics)
// ---------------------------------------------------------------------------

export interface SignalScoreInput {
  eventType: string;
  status?: string;
  importance?: number;
  filesChanged?: number;
  hasTests?: boolean;
  tags?: string[];
  title: string;
  content: string;
  summary: string;
}

export interface PromotionThresholdInput {
  eventType: string;
  status?: string;
  title: string;
  summary: string;
  content: string;
}

export interface MergeCandidateInput {
  kind: string;
  title: string;
  summary: string;
  content: string;
  scope: Scope;
  tags: string[];
}
