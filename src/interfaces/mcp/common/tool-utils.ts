import { z } from 'zod';
import { FREEFORM_RESULT_SCHEMA } from './schemas.js';
import type { ResourceLink } from './mime.js';

export const RESPONSE_SCHEMA_VERSION = '1.0';

/**
 * Shared MCP tool annotation constants — MCP 2025-06-18 spec.
 *
 * These lift the inlined annotation blocks from individual tool registration
 * files (39-RESEARCH.md § "Justification for lifting" counts:
 *   READ_ONLY appears ~38 times across 8 files,
 *   WRITE appears ~11 times across 4 files,
 *   IDEMPOTENT_WRITE appears ~7 times across 3 files,
 *   DESTRUCTIVE appears 5 times across 2 files).
 *
 * Naming note (CONTEXT.md drift — Claude's Discretion):
 *   CONTEXT.md originally specified READ_ONLY / WRITE / DELETE. This file
 *   exports four constants with two renames/additions:
 *     - DELETE_ANNOTATIONS → DESTRUCTIVE_ANNOTATIONS (bucket also covers
 *       update_self and memory_remove_relation, which are destructive but
 *       not deletes; name mirrors the MCP SDK `destructiveHint` field).
 *     - IDEMPOTENT_WRITE_ANNOTATIONS is a new fourth bucket for dedup-upsert
 *       writes (kg_add_triples_batch, kg_add_entity, ingest_*, etc.) —
 *       destructive=false, readOnly=false, idempotent=true.
 *   See Plan 39-01 <constant_naming_rationale> for full justification.
 *
 * Source: MCP SDK ToolAnnotationsSchema (node_modules/@modelcontextprotocol/sdk
 * dist/esm/types.js:1173-1207). Spec defaults are counter-intuitive
 * (destructiveHint defaults to `true`, readOnlyHint defaults to `false`), so
 * every tool MUST set all four fields explicitly — never rely on defaults.
 */

/** Pure read tools (search, get, list, status, query, timeline, tree, ...). */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

/** Additive writes that are NOT idempotent (each call creates new state: memory_store, diary_write, capture_outcome, teach, kg_add_triple single). */
export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false
} as const;

/** Additive writes that ARE idempotent (upserts dedup and return existing id: kg_add_entity, kg_add_triples_batch, ingest_*, kg_invalidate, kg_backfill_links, project_backfill, memory_add_relation). */
export const IDEMPOTENT_WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

/** Destructive tools (every *_delete* + memory_remove_relation; update_self also destructive but keeps openWorldHint:true inline). idempotentHint: true because re-deleting a gone row is a no-op. */
export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false
} as const;

function renderMarkdown(value: unknown, heading: string = 'Result'): string {
  if (value === null || value === undefined) {
    return `## ${heading}\n\nnull`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `## ${heading}\n\n- (empty)`;
    const preview = value
      .map((item) => `- \`${JSON.stringify(item)}\``)
      .join('\n');
    return `## ${heading}\n\n${preview}`;
  }
  if (typeof value === 'object') {
    const lines = Object.entries(value as Record<string, unknown>).map(([key, innerValue]) => (
      `- **${key}**: \`${typeof innerValue === 'string' ? innerValue : JSON.stringify(innerValue)}\``
    ));
    return `## ${heading}\n\n${lines.join('\n')}`;
  }
  return `## ${heading}\n\n${String(value)}`;
}

export interface ToolResponseOptions {
  meta?: Record<string, unknown> | null;
  note?: string;
  // Phase 41 (RLINK-01..03): handlers may pass resource_link content blocks
  // that flow through createToolResponse -> normalizeToolResponsePayload ->
  // toolResult and get appended to content[] after the text block.
  resourceLinks?: ResourceLink[];
}

export interface ToolResponsePayload {
  __synapse_tool_response: true;
  data: unknown;
  meta: Record<string, unknown> | null;
  note: string;
  // Phase 41: optional resource_link channel — undefined for non-file tools.
  resource_links?: ResourceLink[];
}

export function createToolResponse(data: unknown, { meta = null, note = '', resourceLinks }: ToolResponseOptions = {}): ToolResponsePayload {
  const payload: ToolResponsePayload = {
    __synapse_tool_response: true,
    data,
    meta,
    note
  };
  if (resourceLinks && resourceLinks.length > 0) {
    payload.resource_links = resourceLinks;
  }
  return payload;
}

interface NormalizedPayload {
  data: unknown;
  meta: Record<string, unknown> | null;
  note: string;
  resourceLinks: ResourceLink[];
}

function normalizeToolResponsePayload(result: unknown): NormalizedPayload {
  if (result && typeof result === 'object' && (result as ToolResponsePayload).__synapse_tool_response) {
    const payload = result as ToolResponsePayload;
    return {
      data: payload.data,
      meta: payload.meta || null,
      note: payload.note || '',
      resourceLinks: Array.isArray(payload.resource_links) ? payload.resource_links : []
    };
  }

  return {
    data: result,
    meta: null,
    note: '',
    resourceLinks: []
  };
}

// Phase 41 (RLINK-01..03): content[] now carries text AND optional resource_link
// blocks. Existing callers that emit only { type: 'text', text: '...' } stay
// type-compatible — the union is additive.
interface ToolResult {
  structuredContent: { data: unknown; meta: Record<string, unknown> };
  content: Array<
    | { type: 'text'; text: string }
    | ResourceLink
  >;
}

// Exported for unit testing — see Phase 40 Plan 02 Task 3 (STRUCT-01).
// Phase 41 (RLINK-01..03): added optional resourceLinks 4th parameter. When
// present and non-empty, the links are appended to content[] AFTER the text
// block. When omitted (or empty), behavior is byte-identical to the pre-Phase-41
// 3-arg signature — that is the RLINK-03 backwards-compat guarantee.
export function toolResult(
  result: unknown,
  responseFormat: string = 'json',
  markdownTitle: string = 'Result',
  resourceLinks?: ResourceLink[]
): ToolResult {
  const normalized = normalizeToolResponsePayload(result);
  const { data, meta, note } = normalized;
  // Resource links from the explicit 4th param take precedence; fall back to
  // any links that were threaded through createToolResponse/payload channel.
  const effectiveLinks = (resourceLinks && resourceLinks.length > 0)
    ? resourceLinks
    : normalized.resourceLinks;
  const mergedMeta: Record<string, unknown> = {
    schema_version: RESPONSE_SCHEMA_VERSION,
    ...(meta || {})
  };
  const text = responseFormat === 'markdown'
    ? `${note ? `${note}\n\n` : ''}${renderMarkdown(data, markdownTitle)}`
    : `${note ? `${note}\n\n` : ''}${JSON.stringify(data, null, 2)}`;
  const content: Array<{ type: 'text'; text: string } | ResourceLink> = [
    { type: 'text', text }
  ];
  if (effectiveLinks.length > 0) {
    content.push(...effectiveLinks);
  }
  return {
    structuredContent: { data, meta: mergedMeta },
    content
  };
}

export interface PaginatedResult<T> {
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  items: T[];
}

export function paginateItems<T>(items: T[], limit: number | undefined, offset: number | undefined): PaginatedResult<T> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(1000, limit!)) : 100;
  const safeOffset = Number.isFinite(offset) ? Math.max(0, offset!) : 0;
  const totalCount = items.length;
  const paged = items.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + safeLimit;
  return {
    total_count: totalCount,
    count: paged.length,
    limit: safeLimit,
    offset: safeOffset,
    has_more: nextOffset < totalCount,
    next_offset: nextOffset < totalCount ? nextOffset : null,
    items: paged
  };
}

export function buildRipgrepHelpMessage(): string {
  let install: string;
  if (process.platform === 'win32') {
    install = 'Install ripgrep: winget install BurntSushi.ripgrep.MSVC';
  } else if (process.platform === 'darwin') {
    install = 'Install ripgrep: brew install ripgrep';
  } else {
    install = 'Install ripgrep: sudo apt-get install ripgrep';
  }

  return [
    'ripgrep (rg) is required by synapse for fast code search.',
    install,
    'If rg is installed but MCP still fails, set PATH in your MCP client env.',
    'Run doctor for detailed checks: synapse doctor'
  ].join(' ');
}

type ToolHandler = (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;

interface ToolDefinition {
  title: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  annotations?: Record<string, unknown>;
  markdownTitle?: string;
  outputSchema?: { data: z.ZodTypeAny; meta: z.ZodTypeAny };
}

interface McpServer {
  registerTool(
    name: string,
    options: {
      title: string;
      description: string;
      inputSchema: Record<string, z.ZodTypeAny>;
      outputSchema: { data: z.ZodTypeAny; meta: z.ZodTypeAny };
      annotations?: Record<string, unknown>;
    },
    handler: (args: Record<string, unknown>, extra: unknown) => Promise<ToolResult>
  ): void;
}

export type RegisterJsonToolFn = (
  names: string | string[],
  definition: ToolDefinition,
  handler: ToolHandler
) => void;

export function createJsonToolRegistrar(server: McpServer, responseFormatSchema: z.ZodTypeAny): RegisterJsonToolFn {
  return function registerJsonTool(
    names: string | string[],
    { title, description, inputSchema, annotations, markdownTitle, outputSchema }: ToolDefinition,
    handler: ToolHandler
  ): void {
    const canonical = Array.isArray(names) ? names[0] : names;
    const schema = {
      ...inputSchema,
      response_format: responseFormatSchema
    };

    server.registerTool(
      canonical,
      {
        title,
        description,
        inputSchema: schema,
        outputSchema: outputSchema ?? {
          data: FREEFORM_RESULT_SCHEMA.data,
          meta: FREEFORM_RESULT_SCHEMA.meta
        },
        annotations
      },
      async (args: Record<string, unknown>, extra: unknown) => {
        const incoming = args || {};
        const responseFormat = (incoming.response_format as string) || 'json';
        const toolArgs = { ...incoming };
        delete toolArgs.response_format;
        const data = await handler(toolArgs, extra);
        return toolResult(data, responseFormat, markdownTitle || title);
      }
    );
  };
}
