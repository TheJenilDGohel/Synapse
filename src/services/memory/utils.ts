import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { tokenize } from '../retrieval/core/tokenizer.js';
import type { Scope, ScopeInput, Link, MemoryEntry, MemoryEntryRow } from './types.js';

export function nowIso(): string {
  return new Date().toISOString();
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function cleanString(value: unknown, maxLength = 0): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!maxLength || trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trim();
}

export function normalizeWhitespace(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function truncateText(value: unknown, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized || normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}\u2026`;
}

export function firstSentence(value: unknown, maxLength = 240): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  return truncateText(sentence.replace(/[.!?]+$/, ''), maxLength);
}

export function looksGenericTitle(value: unknown): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return true;
  if (normalized.length < 10) return true;
  if (/^(task|update|progress|work|fix|bugfix|review|decision|note|memory|change|done|completed|wip|misc|issue)$/.test(normalized)) {
    return true;
  }
  return /^(looked at|worked on|checked|updated|fixed issue|misc|progress on)\b/.test(normalized);
}

export function humanizeLabel(value: unknown): string {
  const cleaned = normalizeWhitespace(String(value || '').replace(/[_-]+/g, ' '));
  if (!cleaned) return '';
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function deriveSummary(summary: unknown, content: unknown): string {
  const explicit = truncateText(summary, 4000);
  if (explicit) return explicit;
  return truncateText(firstSentence(content, 280), 4000);
}

export function deriveTitle({ title, summary, content, eventType, scope }: {
  title: unknown;
  summary: unknown;
  content: unknown;
  eventType: string;
  scope: Scope;
}): string {
  const explicit = truncateText(title, 400);
  if (explicit && !looksGenericTitle(explicit)) return explicit;

  const fromSummary = firstSentence(summary, 120);
  if (fromSummary && !looksGenericTitle(fromSummary)) return truncateText(fromSummary, 400);

  const fromContent = firstSentence(content, 120);
  if (fromContent && !looksGenericTitle(fromContent)) return truncateText(fromContent, 400);

  const scopeLabel = humanizeLabel(scope.feature || scope.topic);
  const eventLabel = humanizeLabel(eventType || 'memory');
  return truncateText(`${eventLabel}${scopeLabel ? ` for ${scopeLabel}` : ''}`, 400) || 'Project memory';
}

export function ensureArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 50);
}

/** Infer the current git branch name. Returns empty string on failure. */
export function inferGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

const TOPIC_RULES: Array<[RegExp, string]> = [
  [/\b(bug|fix|error|crash|exception|broken|failing|issue)\b/i, 'bugfix'],
  [/\b(decid|decision|chose|pick|prefer|select|went with)\b/i, 'decision'],
  [/\b(review|audit|check|inspect|feedback|finding)\b/i, 'review'],
  [/\b(learn|pattern|convention|always|never|must|should|rule)\b/i, 'knowledge'],
  [/\b(config|setup|install|deploy|ci|cd|pipeline)\b/i, 'configuration'],
  [/\b(refactor|clean|extract|split|rename|restructure)\b/i, 'refactoring'],
  [/\b(test|spec|assert|expect|coverage|unit|e2e)\b/i, 'testing'],
];

/** Classify content into a topic using keyword rules. */
export function inferTopic(content: string): string {
  if (!content) return 'general';
  const text = content.slice(0, 1000).toLowerCase();
  for (const [pattern, topic] of TOPIC_RULES) {
    if (pattern.test(text)) return topic;
  }
  return 'general';
}

const TAG_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'not', 'are', 'was',
  'were', 'been', 'have', 'has', 'had', 'will', 'can', 'could', 'would',
  'should', 'may', 'might', 'shall', 'its', 'use', 'used', 'using', 'new',
  'also', 'but', 'when', 'then', 'than', 'all', 'each', 'any', 'some',
  'into', 'over', 'after', 'before', 'between', 'under', 'about', 'such',
  'only', 'other', 'more', 'most', 'very', 'just', 'like', 'well', 'back',
]);

/** Extract candidate tags from title + content using identifier patterns. */
export function inferTags(title: string, content: string): string[] {
  const text = `${title || ''} ${(content || '').slice(0, 300)}`.toLowerCase();
  const identifiers = new Set<string>();

  // camelCase and PascalCase words (split on case boundaries)
  for (const m of text.matchAll(/[a-z][a-zA-Z0-9]{2,30}/g)) {
    const word = m[0].toLowerCase();
    if (!TAG_STOP_WORDS.has(word) && word.length >= 3) identifiers.add(word);
  }

  // snake_case and hyphenated terms
  for (const m of text.matchAll(/[a-z][a-z0-9]*[-_][a-z0-9_-]{1,30}/g)) {
    const word = m[0].toLowerCase();
    if (word.length >= 4) identifiers.add(word);
  }

  return Array.from(identifiers).slice(0, 5);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value || []);
}

export function normalizeScope(scope: ScopeInput = {}): Scope {
  return {
    root_path: cleanString(scope.root_path || scope.rootPath),
    project_path: cleanString(scope.project_path || scope.projectPath),
    branch_name: cleanString(scope.branch_name || scope.branchName, 200),
    topic: cleanString(scope.topic, 200),
    feature: cleanString(scope.feature, 200)
  };
}

export function normalizeLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: unknown): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      path: cleanString(item.path as string, 4000),
      line: Number.isFinite(item.line) ? item.line as number : null,
      label: cleanString(item.label as string, 200)
    }))
    .filter((item) => item.path)
    .slice(0, 50);
}

export function makeFingerprint({ kind, title, summary, content, scope, tags }: {
  kind: string;
  title: string;
  summary: string;
  content: string;
  scope: Scope;
  tags: string[];
}): string {
  const payload = [
    cleanString(kind, 40).toLowerCase(),
    cleanString(title, 400).toLowerCase(),
    cleanString(summary, 4000).toLowerCase(),
    cleanString(content, 20000).toLowerCase(),
    scope.project_path.toLowerCase(),
    scope.topic.toLowerCase(),
    scope.feature.toLowerCase(),
    ensureArray(tags).join('|').toLowerCase()
  ].join('\n');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function generateMemoryId(): string {
  return `mem_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function splitTerms(query: string): string[] {
  return tokenize(String(query || '')).slice(0, 20);
}

export function buildSearchTerms({ title, summary, content, scope, tags, links, sourceRef }: {
  title: string;
  summary: string;
  content: string;
  scope: Scope;
  tags: string[];
  links: Link[];
  sourceRef: string;
}): string[] {
  return Array.from(new Set(tokenize([
    title,
    summary,
    content,
    scope.root_path,
    scope.project_path,
    scope.branch_name,
    scope.topic,
    scope.feature,
    ensureArray(tags).join(' '),
    normalizeLinks(links).map((item) => `${item.label || ''} ${item.path}`).join(' '),
    sourceRef
  ].join('\n')))).slice(0, 200);
}

export function hasStrongMemorySignal(text: string): boolean {
  return /fix|resolved|decided|remember|always|never|prefer|constraint|important|must|should/.test(text);
}

export function looksExploratory(text: string): boolean {
  return /explor|looked at|opened files|read files|investigat|inspect|understand layout|browsed|scanned/.test(text);
}

export function scoreTokenOverlap(queryTerms: string[], candidateTerms: string[]): number {
  if (queryTerms.length === 0 || candidateTerms.length === 0) return 0;
  const candidateSet = new Set(candidateTerms);
  let hits = 0;
  for (const term of queryTerms) {
    if (candidateSet.has(term)) hits += 1;
  }
  return hits / Math.max(1, queryTerms.length);
}

export function textContainsAllTerms(text: string, terms: string[]): boolean {
  const haystack = String(text || '').toLowerCase();
  return terms.length > 0 && terms.every((term) => haystack.includes(term));
}

export function normalizeRecallScore(rawScore: number): number {
  const numeric = Number(rawScore);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return 1 - Math.exp(-numeric / 12);
}

export function scoreScopeMatch(row: MemoryEntryRow, scope: Record<string, string | undefined> = {}): number {
  let score = 0;
  if (scope.project_path && row.scope_project_path === scope.project_path) score += 3;
  if (scope.topic && row.topic === scope.topic) score += 2;
  if (scope.feature && row.feature === scope.feature) score += 1.5;
  if (scope.branch_name && row.scope_branch_name === scope.branch_name) score += 1;
  if (scope.root_path && row.scope_root_path === scope.root_path) score += 1;
  if (scope.nest && row.nest === scope.nest) score += 2.5;
  if (scope.branch && row.branch === scope.branch) score += 1.5;
  return score;
}

export function computeMemorySimilarity(
  a: { title: string; summary: string; content: string; scope: Scope; tags: string[]; links: Link[]; sourceRef: string },
  b: { title: string; summary: string; content: string; scope: Scope; tags: string[]; links?: Link[]; sourceRef?: string }
): number {
  const aTerms = new Set(buildSearchTerms(a));
  const bTerms = new Set(buildSearchTerms({
    ...b,
    links: b.links || [],
    sourceRef: b.sourceRef || ''
  }));
  if (aTerms.size === 0 || bTerms.size === 0) return 0;

  let intersection = 0;
  for (const term of aTerms) {
    if (bTerms.has(term)) intersection += 1;
  }
  return intersection / Math.max(aTerms.size, bTerms.size);
}

export function deserializeEntry(row: MemoryEntryRow): MemoryEntry {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    content: row.content,
    status: row.status,
    importance: row.importance,
    confidence: row.confidence,
    scope_root_path: row.scope_root_path,
    scope_project_path: row.scope_project_path,
    scope_branch_name: row.scope_branch_name,
    topic: row.topic,
    feature: row.feature,
    nest: row.nest || '',
    branch: row.branch || '',
    agent_id: row.agent_id || '',
    actor_id: row.actor_id || '',
    tags: JSON.parse(row.tags_json || '[]'),
    links: JSON.parse(row.links_json || '[]'),
    source_type: row.source_type,
    source_ref: row.source_ref,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_recalled_at: row.last_recalled_at,
    recall_count: row.recall_count
  };
}
