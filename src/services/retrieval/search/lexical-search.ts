import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { RG_BIN } from '../../../runtime/platform.js';
import {
  escapeRegex,
  globToRegExp,
  validateRegex,
  buildLineMatcher,
  splitPendingContextByLine
} from './query-utils.js';
import type { PendingContextItem } from './query-utils.js';

export interface LexicalMatch {
  file: string;
  line: number;
  text: string;
  context_before?: string[];
  context_after?: string[];
}

export interface FileMatch {
  file: string;
  relative_path: string;
  name: string;
}

interface WorkspaceLike {
  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
  normalizeTarget(base: string): string;
  walkDirectories(base: string): Iterable<{ files: string[] }>;
  isLikelyTextFile(filePath: string): boolean;
  safeReadText(filePath: string): string;
}

function parseRipgrepPlainOutput(out: string, maxResults: number): LexicalMatch[] {
  const matches: LexicalMatch[] = [];
  const lines = out.split(/\r?\n/).filter(Boolean);
  for (const row of lines) {
    const first = row.indexOf(':');
    if (first <= 0) continue;
    const second = row.indexOf(':', first + 1);
    if (second <= first) continue;

    const file = row.slice(0, first);
    const lineNumRaw = row.slice(first + 1, second);
    const line = Number.parseInt(lineNumRaw, 10);
    const text = row.slice(second + 1).trim();

    if (!Number.isFinite(line)) continue;
    matches.push({ file, line, text });
    if (matches.length >= maxResults) break;
  }
  return matches;
}

function parseRipgrepJsonOutput(out: string, maxResults: number): LexicalMatch[] {
  const matches: LexicalMatch[] = [];
  const ctxBuffer = new Map<string, PendingContextItem[]>();
  const lastMatchByFile = new Map<string, LexicalMatch>();
  const trailingNl = /\n$/;

  for (const raw of out.split(/\r?\n/)) {
    if (!raw) continue;
    let obj: { type: string; data: { path?: { text: string }; line_number: number; lines?: { text: string } } };
    try { obj = JSON.parse(raw); } catch { continue; }

    if (obj.type === 'match') {
      const file = obj.data.path?.text || '';
      const line = obj.data.line_number;
      const text = (obj.data.lines?.text || '').replace(trailingNl, '').trim();
      const split = splitPendingContextByLine(ctxBuffer.get(file), line);
      if (split.remaining.length > 0) {
        ctxBuffer.set(file, split.remaining);
      } else {
        ctxBuffer.delete(file);
      }

      const match: LexicalMatch = { file, line, text, context_before: split.before, context_after: [] };
      matches.push(match);
      lastMatchByFile.set(file, match);
      if (matches.length >= maxResults) break;
    } else if (obj.type === 'context') {
      const file = obj.data.path?.text || '';
      const ctxLine = obj.data.line_number;
      const ctxText = (obj.data.lines?.text || '').replace(trailingNl, '');
      const lastMatch = lastMatchByFile.get(file);
      if (lastMatch && ctxLine > lastMatch.line) {
        lastMatch.context_after!.push(ctxText);
      } else {
        if (!ctxBuffer.has(file)) ctxBuffer.set(file, []);
        ctxBuffer.get(file)!.push({ line: ctxLine, text: ctxText });
      }
    }
  }

  return matches;
}

export interface FastRipgrepOptions {
  query: string;
  base: string;
  glob: string;
  caseSensitive: boolean;
  maxResults: number;
  contextLines?: number;
  useRegex?: boolean;
  maxFileBytes: number;
  ignoreDirs: Iterable<string>;
  rgTimeoutMs: number;
}

export function fastSearchWithRipgrep({
  query,
  base,
  glob,
  caseSensitive,
  maxResults,
  contextLines = 0,
  useRegex = false,
  maxFileBytes,
  ignoreDirs,
  rgTimeoutMs
}: FastRipgrepOptions): LexicalMatch[] {
  const args: string[] = [
    '--line-number',
    '--no-heading',
    '--color',
    'never',
    '--no-ignore-messages',
    '--max-filesize',
    `${Math.max(1, Math.floor(maxFileBytes / 1024))}K`
  ];

  if (!useRegex) args.push('--fixed-strings');
  if (!caseSensitive) args.push('-i');
  if (glob && glob !== '*') args.push('--glob', glob);

  for (const ignored of ignoreDirs) {
    args.push('--glob', `!**/${ignored}/**`);
  }

  const ctxN = Math.max(0, Math.min(10, contextLines || 0));
  if (ctxN > 0) {
    args.push('--json', '-C', String(ctxN));
  }

  args.push(query, base);

  const run = spawnSync(RG_BIN, args, {
    encoding: 'utf8',
    timeout: rgTimeoutMs,
    maxBuffer: 32 * 1024 * 1024
  });

  if (run.error) throw run.error;

  const out = run.stdout || '';
  if (!out.trim()) return [];

  return ctxN > 0
    ? parseRipgrepJsonOutput(out, maxResults)
    : parseRipgrepPlainOutput(out, maxResults);
}

export interface WalkSearchOptions {
  workspace: WorkspaceLike;
  base: string;
  lineMatcher: (line: string) => boolean;
  wildcardPattern: RegExp;
  maxResults: number;
  into: LexicalMatch[];
  contextLines?: number;
}

export function searchWithFilesystemWalk({
  workspace,
  base,
  lineMatcher,
  wildcardPattern,
  maxResults,
  into,
  contextLines = 0
}: WalkSearchOptions): void {
  for (const { files } of workspace.walkDirectories(base)) {
    for (const filePath of files) {
      if (!workspace.isLikelyTextFile(filePath)) continue;

      const rel = path.relative(base, filePath).split(path.sep).join('/');
      if (!wildcardPattern.test(rel)) continue;

      let text: string;
      try {
        text = workspace.safeReadText(filePath);
      } catch {
        continue;
      }

      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        if (!lineMatcher(lines[i])) continue;

        const result: LexicalMatch = { file: filePath, line: i + 1, text: lines[i].trim() };
        if (contextLines > 0) {
          result.context_before = lines.slice(Math.max(0, i - contextLines), i);
          result.context_after = lines.slice(i + 1, i + 1 + contextLines);
        }
        into.push(result);
        if (into.length >= maxResults) return;
      }
    }
  }
}

export interface SearchCodeOptions {
  workspace: WorkspaceLike;
  hasRipgrep: boolean;
  query: string;
  projectPath?: string;
  allRoots?: boolean;
  glob: string;
  maxResults: number;
  caseSensitive: boolean;
  contextLines?: number;
  useRegex?: boolean;
  fastSearchWithRipgrepFn: (args: {
    query: string;
    base: string;
    glob: string;
    caseSensitive: boolean;
    maxResults: number;
    contextLines: number;
    useRegex: boolean;
  }) => LexicalMatch[];
}

export function searchCode({
  workspace,
  hasRipgrep,
  query,
  projectPath,
  allRoots,
  glob,
  maxResults,
  caseSensitive,
  contextLines = 0,
  useRegex = false,
  fastSearchWithRipgrepFn
}: SearchCodeOptions): LexicalMatch[] {
  const bases = workspace.resolveSearchBases(projectPath, allRoots);
  for (const base of bases) {
    const normalized = workspace.normalizeTarget(base);
    if (normalized !== base) {
      throw new Error('Resolved base path mismatch');
    }
  }

  if (useRegex) {
    const check = validateRegex(query);
    if (!check.valid) {
      throw new Error(`Invalid regex: ${check.reason}`);
    }
  }

  const lineMatcher = buildLineMatcher({ query, useRegex, caseSensitive });
  const wildcardPattern = globToRegExp(glob);
  const matches: LexicalMatch[] = [];

  for (const base of bases) {
    if (hasRipgrep) {
      try {
        const fastMatches = fastSearchWithRipgrepFn({
          query,
          base,
          glob,
          caseSensitive,
          maxResults: maxResults - matches.length,
          contextLines,
          useRegex
        });
        matches.push(...fastMatches);
        if (matches.length >= maxResults) return matches.slice(0, maxResults);
        continue;
      } catch {
        // Fallback to JS scanner.
      }
    }

    searchWithFilesystemWalk({
      workspace,
      base,
      lineMatcher,
      wildcardPattern,
      maxResults,
      into: matches,
      contextLines
    });

    if (matches.length >= maxResults) return matches.slice(0, maxResults);
  }

  return matches.slice(0, maxResults);
}

export interface SearchFilesOptions {
  workspace: WorkspaceLike;
  hasRipgrep: boolean;
  ignoreDirs: Iterable<string>;
  rgTimeoutMs: number;
  query: string;
  projectPath?: string;
  allRoots?: boolean;
  maxResults: number;
  caseSensitive: boolean;
}

export function searchFiles({
  workspace,
  hasRipgrep,
  ignoreDirs,
  rgTimeoutMs,
  query,
  projectPath,
  allRoots,
  maxResults,
  caseSensitive
}: SearchFilesOptions): FileMatch[] {
  const bases = workspace.resolveSearchBases(projectPath, allRoots);
  const regex = new RegExp(escapeRegex(query), caseSensitive ? '' : 'i');
  const results: FileMatch[] = [];

  for (const base of bases) {
    if (hasRipgrep) {
      try {
        const args: string[] = ['--files', '--no-ignore-messages'];
        for (const ignored of ignoreDirs) {
          args.push('--glob', `!**/${ignored}/**`);
        }
        args.push(base);

        const run = spawnSync(RG_BIN, args, {
          encoding: 'utf8',
          timeout: rgTimeoutMs,
          maxBuffer: 32 * 1024 * 1024
        });

        if (!run.error && run.stdout) {
          for (const filePath of run.stdout.split(/\r?\n/).filter(Boolean)) {
            if (!regex.test(filePath)) continue;
            const rel = path.relative(base, filePath).split(path.sep).join('/');
            results.push({ file: filePath, relative_path: rel, name: path.basename(filePath) });
            if (results.length >= maxResults) return results;
          }
          continue;
        }
      } catch {
        // fall through to walk
      }
    }

    for (const { files } of workspace.walkDirectories(base)) {
      for (const filePath of files) {
        if (!regex.test(filePath)) continue;
        const rel = path.relative(base, filePath).split(path.sep).join('/');
        results.push({ file: filePath, relative_path: rel, name: path.basename(filePath) });
        if (results.length >= maxResults) return results;
      }
    }
  }

  return results;
}
