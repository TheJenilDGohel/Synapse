/** Recall, ingestion, hook, and proactive hint types. */
import type { MemoryEntry } from './entries.js';

// ---------------------------------------------------------------------------
// Recall
// ---------------------------------------------------------------------------

export interface RecallInput {
  query: string;
  projectPath?: string;
  topic?: string;
  feature?: string;
  branchName?: string;
  rootPath?: string;
  kind?: string;
  nest?: string;
  branch?: string;
  agentId?: string;
  actorId?: string;
  tags?: string[];
  limit?: number;
}

export interface RelatedFact {
  entity_id: string;
  entity_name: string;
  predicate: string;
  related_entity_id: string;
  related_entity_name: string;
  direction: 'outgoing' | 'incoming';
}

export interface RecallResultItem {
  score: number;
  raw_score: number;
  memory: MemoryEntry;
  related_facts?: RelatedFact[];
}

export interface RecallResult {
  query: string;
  count: number;
  items: RecallResultItem[];
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  role: string;
  content: string;
  index: number;
  timestamp?: string | null;
}

export interface ExtractedEntity {
  name: string;
  type: string;
}

export interface TripleDef {
  subjectName: string;
  predicate: string;
  objectName: string;
  sourceMemoryId: string;
  sourceType: string;
  confidence: number;
}

export interface IngestOpts {
  filePath?: string;
  content?: string | unknown[];
  nest?: string;
  branch?: string;
  agentId?: string;
}

export interface IngestResult {
  skipped: boolean;
  reason?: string;
  source_id?: string;
  ingested_at?: string;
  turn_count?: number;
  format?: string;
  stored_count?: number;
  dedup_skipped?: number;
  entities_extracted?: number;
  triples_created?: number;
  memory_ids?: string[];
  errors?: Array<{ turn_index: number; error: string }>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface HookContext {
  event: string;
  [key: string]: unknown;
}

export type HookListener = (payload: unknown, context?: HookContext) => Promise<HookListenerResult | void>;

export interface HookListenerResult {
  cancel?: boolean;
  reason?: string;
  payload?: unknown;
}

export interface HookEmitResult {
  cancelled: boolean;
  payload: unknown;
  reason?: string;
}

export interface HookStats {
  enabled: boolean;
  total_listeners: number;
  events: Record<string, number>;
}

export interface HookHandle {
  remove: () => void;
}

// ---------------------------------------------------------------------------
// Proactive hints
// ---------------------------------------------------------------------------

export interface ProactiveHint {
  memory_id: string;
  title: string;
  importance: number;
  kind: string;
  summary_excerpt: string;
  suggest_update: boolean;
}

export interface ProactiveHintResult {
  file_path: string;
  hints: ProactiveHint[];
}
