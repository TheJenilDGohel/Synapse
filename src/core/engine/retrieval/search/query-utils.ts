import { tokenize } from '../core/tokenizer.js';

const GENERIC_QUERY_TOKENS = new Set([
  'search', 'config', 'configuration', 'memory', 'index', 'indexing', 'tool',
  'tools', 'server', 'client', 'setup', 'docs', 'documentation', 'query',
  'result', 'results', 'hybrid', 'semantic', 'lexical', 'code', 'file', 'files',
  'project', 'root', 'storage', 'pattern', 'architecture'
]);

export interface PendingContextItem {
  line: number;
  text: string;
}

export interface SplitContextResult {
  before: string[];
  remaining: PendingContextItem[];
}

export interface RegexValidation {
  valid: boolean;
  reason?: string;
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function globToRegExp(glob: string): RegExp {
  return new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')}$`
  );
}

export function validateRegex(pattern: string): RegexValidation {
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (e) {
    return { valid: false, reason: (e as Error).message };
  }
}

export function buildLineMatcher({ query, useRegex, caseSensitive }: { query: string; useRegex: boolean; caseSensitive: boolean }): (line: string) => boolean {
  if (useRegex) {
    const regex = new RegExp(query, caseSensitive ? '' : 'i');
    return (line: string) => regex.test(line);
  }

  if (caseSensitive) {
    return (line: string) => line.includes(query);
  }

  const normalizedNeedle = query.toLowerCase();
  return (line: string) => line.toLowerCase().includes(normalizedNeedle);
}

export function scorePathAffinity(filePath: string, queryTerms: string[]): number {
  if (!filePath || queryTerms.length === 0) return 0;
  const pathTerms = new Set(tokenize(String(filePath || '')));
  let hits = 0;
  for (const term of queryTerms) {
    if (pathTerms.has(term)) hits += 1;
  }
  return hits / Math.max(1, queryTerms.length);
}

export function isGenericShortQuery(queryTerms: string[]): boolean {
  return queryTerms.length > 0 &&
    queryTerms.length <= 2 &&
    queryTerms.every((term) => GENERIC_QUERY_TOKENS.has(term));
}

export function splitPendingContextByLine(pending: PendingContextItem[] | undefined, matchLine: number): SplitContextResult {
  if (!pending || pending.length === 0) {
    return { before: [], remaining: [] };
  }

  const before: string[] = [];
  let splitIdx = pending.length;
  for (let i = 0; i < pending.length; i += 1) {
    const item = pending[i];
    if (item.line < matchLine) {
      before.push(item.text);
      continue;
    }
    splitIdx = i;
    break;
  }

  return {
    before,
    remaining: splitIdx < pending.length ? pending.slice(splitIdx) : []
  };
}
