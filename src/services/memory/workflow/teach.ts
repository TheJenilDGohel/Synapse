/**
 * Behavior Modification: teach
 *
 * Stores a durable high-importance feedback memory from a user instruction.
 * Teach memories auto-surface in agent_prime via the recall scoring boost
 * for kind='feedback' entries.
 */

import type { ScopeInput, StoreEntryInput } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TeachInput {
  instruction: string;
  importance?: number;
  tags?: string[];
  nest?: string;
  branch?: string;
  scope?: ScopeInput;
}

export interface TeachResult {
  taught: boolean;
  duplicate?: boolean;
  memory_id?: string;
  existing_memory_id?: string;
  instruction: string;
  importance: number;
  kind: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_IMPORTANCE = 95;
const MIN_IMPORTANCE = 70;
const MAX_IMPORTANCE = 100;
const MAX_TITLE_LEN = 80;

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

interface TeachDeps {
  storeEntry(input: StoreEntryInput): Promise<{
    created?: boolean;
    duplicate?: boolean;
    memory?: { id: string } | null;
    cancelled?: boolean;
    reason?: string;
  }>;
}

export async function teach(
  deps: TeachDeps,
  input: TeachInput
): Promise<TeachResult> {
  const instruction = (input.instruction || '').trim();
  if (!instruction) {
    throw new Error('instruction is required');
  }

  const rawImportance = input.importance ?? DEFAULT_IMPORTANCE;
  const importance = Math.max(MIN_IMPORTANCE, Math.min(MAX_IMPORTANCE, rawImportance));
  const userTags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : [];
  const tags = ['teach', ...userTags.filter((t) => t !== 'teach')];
  const titlePrefix = '[teach]';
  const titleBody = instruction.length > MAX_TITLE_LEN
    ? instruction.slice(0, MAX_TITLE_LEN - 3) + '...'
    : instruction;
  const title = `${titlePrefix} ${titleBody}`;

  const storeInput: StoreEntryInput = {
    kind: 'feedback',
    title,
    summary: instruction,
    content: instruction,
    importance,
    confidence: 1.0,
    tags,
    source_type: 'teach',
    nest: input.nest,
    branch: input.branch,
    scope: input.scope
  };

  const result = await deps.storeEntry(storeInput);

  if (result.duplicate) {
    return {
      taught: false,
      duplicate: true,
      existing_memory_id: result.memory?.id || undefined,
      instruction,
      importance,
      kind: 'feedback',
      tags
    };
  }

  return {
    taught: true,
    memory_id: result.memory?.id || undefined,
    instruction,
    importance,
    kind: 'feedback',
    tags
  };
}
