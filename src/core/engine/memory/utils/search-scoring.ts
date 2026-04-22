import { tokenize } from '../../retrieval/core/tokenizer.js';
import type { Scope, Link, MemoryEntryRow } from '../types/index.js';
import { normalizeLinks, ensureArray } from './formatting.js';

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
