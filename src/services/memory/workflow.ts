import type { MemoryService } from './service.js';
import type { Link } from './types.js';
import { agentPrime as agentPrimeFn, type AgentPrimeInput, type AgentPrimeResult } from './workflow/agent-prime.js';
import { teach as teachFn, type TeachInput, type TeachResult } from './workflow/teach.js';

function cleanText(value: unknown, maxLength = 0): string {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!maxLength || normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).trim();
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values || []) {
    const cleaned = cleanText(value, 200);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 50);
}

function deriveQuery(input: Record<string, unknown>): string {
  return cleanText(
    input.query ||
    input.task ||
    input.title ||
    input.summary ||
    input.details ||
    input.content,
    500
  );
}

function defaultEventStatus(eventType: string, explicitStatus: unknown): string {
  const cleaned = cleanText(explicitStatus, 40);
  if (cleaned) return cleaned;
  return eventType === 'bugfix' ? 'resolved' : 'completed';
}

interface CompactMemoryStatus {
  enabled: boolean;
  auto_capture: boolean;
  consent_done: boolean;
  backend_available: boolean;
  requested_backend: string;
  selected_backend: string | null;
  total_entries: number;
  total_events: number;
}

function compactMemoryStatus(status: Record<string, unknown>): CompactMemoryStatus {
  const backend = status.backend as Record<string, unknown> | undefined;
  const store = status.store as Record<string, unknown> | undefined;
  return {
    enabled: status.enabled as boolean,
    auto_capture: status.auto_capture as boolean,
    consent_done: status.consent_done as boolean,
    backend_available: (backend?.available as boolean) || false,
    requested_backend: (backend?.requested as string) || (status.requested_backend as string),
    selected_backend: (backend?.selected as string) || null,
    total_entries: (store?.total_entries as number) || 0,
    total_events: (store?.total_events as number) || 0
  };
}

interface WorkflowConfig {
  memory: MemoryService;
  getRuntimeSummary?: (() => Promise<Record<string, unknown> | null>) | null;
  search?: { searchHybrid(opts: Record<string, unknown>): Promise<unknown> } | null;
}

export class MemoryWorkflowService {
  private memory: MemoryService;
  private getRuntimeSummary: (() => Promise<Record<string, unknown> | null>) | null;
  private search: { searchHybrid(opts: Record<string, unknown>): Promise<unknown> } | null;

  constructor({ memory, getRuntimeSummary = null, search = null }: WorkflowConfig) {
    this.memory = memory;
    this.getRuntimeSummary = getRuntimeSummary;
    this.search = search;
  }

  async getTaskContext(input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const query = deriveQuery(input);
    const memoryStatus = await this.memory.getStatus();
    const runtime = this.getRuntimeSummary ? await this.getRuntimeSummary() : null;
    const memorySummary = compactMemoryStatus(memoryStatus);
    const canRecall = memorySummary.enabled && memorySummary.backend_available;

    let recall: Record<string, unknown> = {
      attempted: false,
      skipped_reason: ''
    };

    if (!query) {
      recall.skipped_reason = 'empty_query';
    } else if (!memorySummary.enabled) {
      recall.skipped_reason = 'memory_disabled';
    } else if (!memorySummary.backend_available) {
      recall.skipped_reason = 'backend_unavailable';
    } else {
      const recalled = await this.memory.recall({
        query,
        rootPath: input.root_path as string || input.rootPath as string,
        projectPath: input.project_path as string || input.projectPath as string,
        branchName: input.branch_name as string || input.branchName as string,
        topic: input.topic as string,
        feature: input.feature as string,
        kind: input.kind as string,
        limit: input.limit as number
      });
      recall = {
        attempted: true,
        skipped_reason: '',
        ...recalled
      };
    }

    const guidance: string[] = canRecall
      ? [
        'Use recalled items as hints, then verify them with search/read tools before concluding.',
        (recall.attempted && (recall.count as number) > 0)
          ? 'Relevant project memory was found; check the linked files and current code before reusing the prior approach.'
          : 'No matching memory was found; continue with retrieval tools and capture the outcome if the work produces durable knowledge.'
      ]
      : [
        'Memory is disabled or unavailable on this runtime; rely on retrieval tools only.'
      ];

    return {
      query,
      scope: {
        root_path: (input.root_path as string) || (input.rootPath as string) || '',
        project_path: (input.project_path as string) || (input.projectPath as string) || '',
        branch_name: (input.branch_name as string) || (input.branchName as string) || '',
        topic: (input.topic as string) || '',
        feature: (input.feature as string) || ''
      },
      runtime,
      memory: memorySummary,
      recall,
      guidance
    };
  }

  async captureOutcome(input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const memoryStatus = await this.memory.getStatus();
    const runtime = this.getRuntimeSummary ? await this.getRuntimeSummary() : null;
    const memorySummary = compactMemoryStatus(memoryStatus);

    if (!memorySummary.enabled) {
      return {
        captured: false,
        skipped_reason: 'memory_disabled',
        runtime,
        memory: memorySummary
      };
    }

    if (!memorySummary.backend_available) {
      return {
        captured: false,
        skipped_reason: 'backend_unavailable',
        runtime,
        memory: memorySummary
      };
    }

    const eventType = cleanText(input.event_type || input.eventType || input.outcome_type || 'task', 60) || 'task';
    const task = cleanText(input.task || input.title, 400);
    const summary = cleanText(input.summary, 4000);
    const details = cleanText(input.details || input.content, 20000);
    const fallbackContent = cleanText([summary, details, task].filter(Boolean).join('. '), 20000);

    if (!task && !summary && !details) {
      throw new Error('task, summary, or details is required');
    }

    const captureInput = {
      event_type: eventType,
      status: defaultEventStatus(eventType, input.status),
      title: task || summary || details,
      summary,
      content: details || fallbackContent,
      kind: input.kind as string | undefined,
      importance: input.importance as number | undefined,
      confidence: input.confidence as number | undefined,
      files_changed: (input.files_changed ?? input.filesChanged ?? 0) as number,
      has_tests: (input.has_tests ?? input.hasTests ?? false) as boolean,
      tags: uniqueStrings([
        ...((input.tags as string[]) || []),
        input.topic,
        input.feature
      ]),
      links: Array.isArray(input.links) ? (input.links as Link[]).slice(0, 50) : [],
      scope: {
        root_path: (input.root_path as string) || (input.rootPath as string),
        project_path: (input.project_path as string) || (input.projectPath as string),
        branch_name: (input.branch_name as string) || (input.branchName as string),
        topic: input.topic as string,
        feature: input.feature as string
      },
      nest: input.nest as string | undefined,
      branch: input.branch as string | undefined,
      source_ref: cleanText(input.source_ref || input.sourceRef, 1000)
    };

    const result = await this.memory.captureEvent(captureInput);
    return {
      captured: true,
      runtime,
      memory: memorySummary,
      event: captureInput,
      result
    };
  }

  async agentPrime(input: Record<string, unknown>): Promise<AgentPrimeResult> {
    return agentPrimeFn(
      { memory: this.memory, search: this.search },
      input as unknown as AgentPrimeInput
    );
  }

  async teach(input: Record<string, unknown>): Promise<TeachResult> {
    const result = await teachFn(
      { storeEntry: (args) => this.memory.storeEntry(args) },
      input as unknown as TeachInput
    );
    // Emit hook event for extensibility
    if (this.memory.store?.hooks) {
      try {
        await this.memory.store.hooks.emit('after:teach', result);
      } catch {
        // Non-blocking
      }
    }
    return result;
  }
}
