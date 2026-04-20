import { tokenize } from '../core/tokenizer.js';
import {
  normalizeSymbolInput,
  buildSymbolWordPattern,
  buildDefinitionPattern,
  classifySymbolLine
} from '../core/symbol-search.js';
import {
  searchCode as runSearchCode,
  fastSearchWithRipgrep as runFastSearchWithRipgrep,
  searchFiles as runSearchFiles
} from './lexical-search.js';
import type { LexicalMatch, FileMatch } from './lexical-search.js';
import { isGenericShortQuery } from './query-utils.js';
import { fuseRankAndRerank } from './hybrid-ranking.js';
import type { FusedResult, RerankerMeta } from './hybrid-ranking.js';
import { maybeBootstrapSemanticIndex } from './auto-index.js';
import type { SemanticResult, AutoIndexMeta } from './auto-index.js';
import type { FindCallersResult, FindDefinitionResult, FindImplementationsResult, RenamePreviewResult } from '../symbols/types.js';

interface WorkspaceLike {
  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
  normalizeTarget(base: string): string;
  walkDirectories(base: string): Iterable<{ files: string[] }>;
  isLikelyTextFile(filePath: string): boolean;
  safeReadText(filePath: string): string;
}

interface VectorIndexLike {
  semanticSearch(opts: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    maxResults: number;
    minScore: number;
  }): Promise<SemanticResult[]>;
  indexProject(opts: {
    projectPath?: string;
    allRoots?: boolean;
    force: boolean;
    maxFiles: number;
  }): Promise<{ indexed_files?: number; failed_files?: { path: string; error: string }[] }>;
  checkStaleness(): Promise<{ stale: boolean }>;
}

interface RerankerLike {
  isEnabled?: () => boolean;
  rerank(query: string, candidates: FusedResult[]): Promise<number[]>;
}

interface SymbolIndexLike {
  findCallers(symbol: string, opts?: Record<string, unknown>): FindCallersResult;
  findDefinition(symbol: string, opts?: Record<string, unknown>): FindDefinitionResult;
  findImplementations(interfaceName: string, opts?: Record<string, unknown>): FindImplementationsResult;
  renamePreview(oldName: string, newName: string, opts?: Record<string, unknown>): RenamePreviewResult;
}

export interface SymbolResult {
  file: string;
  start_line: number;
  end_line: number;
  text: string;
}

export interface GetSymbolResult {
  symbol: string;
  count: number;
  definitions: SymbolResult[];
  exports: SymbolResult[];
}

export interface UsageResult {
  file: string;
  line: number;
  kind: string;
  text: string;
  context_before?: string[];
  context_after?: string[];
}

export interface FindUsagesResult {
  symbol: string;
  count: number;
  usages: UsageResult[];
}

export interface StalenessInfo {
  stale: boolean;
  [key: string]: unknown;
}

export interface HybridSearchResult {
  query: string;
  lexical_hits: number;
  semantic_hits: number;
  ranking_mode: string;
  auto_index: AutoIndexMeta | null;
  reranker: RerankerMeta;
  index_stale: boolean | null;
  index_staleness: StalenessInfo | null;
  results: FusedResult[];
}

export interface SearchServiceOptions {
  workspace: WorkspaceLike;
  ignoreDirs: Iterable<string>;
  hasRipgrep: boolean;
  rgTimeoutMs: number;
  maxFileBytes: number;
  vectorIndex: VectorIndexLike | null;
  reranker?: RerankerLike | null;
  rerankerMinCandidates?: number;
  rerankerTopN?: number;
  symbolIndex?: SymbolIndexLike | null;
}

export class SearchService {
  workspace: WorkspaceLike;
  ignoreDirs: Iterable<string>;
  hasRipgrep: boolean;
  rgTimeoutMs: number;
  maxFileBytes: number;
  vectorIndex: VectorIndexLike | null;
  reranker: RerankerLike | null;
  rerankerMinCandidates: number;
  rerankerTopN: number;
  autoIndexedScopes: Set<string>;
  defaultAutoIndexMaxFiles: number;
  symbolIndex: SymbolIndexLike | null;

  constructor({
    workspace,
    ignoreDirs,
    hasRipgrep,
    rgTimeoutMs,
    maxFileBytes,
    vectorIndex,
    reranker,
    rerankerMinCandidates = 15,
    rerankerTopN = 25,
    symbolIndex = null
  }: SearchServiceOptions) {
    this.workspace = workspace;
    this.ignoreDirs = ignoreDirs;
    this.hasRipgrep = hasRipgrep;
    this.rgTimeoutMs = rgTimeoutMs;
    this.maxFileBytes = maxFileBytes;
    this.vectorIndex = vectorIndex;
    this.reranker = reranker || null;
    this.rerankerMinCandidates = Math.max(1, rerankerMinCandidates);
    this.rerankerTopN = Math.max(1, rerankerTopN);
    this.autoIndexedScopes = new Set();
    this.defaultAutoIndexMaxFiles = 20000;
    this.symbolIndex = symbolIndex;
  }

  searchCode({ query, projectPath, allRoots, glob, maxResults, caseSensitive, contextLines = 0, useRegex = false }: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    glob: string;
    maxResults: number;
    caseSensitive: boolean;
    contextLines?: number;
    useRegex?: boolean;
  }): LexicalMatch[] {
    return runSearchCode({
      workspace: this.workspace,
      hasRipgrep: this.hasRipgrep,
      query,
      projectPath,
      allRoots,
      glob,
      maxResults,
      caseSensitive,
      contextLines,
      useRegex,
      fastSearchWithRipgrepFn: (args) => this.fastSearchWithRipgrep(args)
    });
  }

  fastSearchWithRipgrep({ query, base, glob, caseSensitive, maxResults, contextLines = 0, useRegex = false }: {
    query: string;
    base: string;
    glob: string;
    caseSensitive: boolean;
    maxResults: number;
    contextLines?: number;
    useRegex?: boolean;
  }): LexicalMatch[] {
    return runFastSearchWithRipgrep({
      query,
      base,
      glob,
      caseSensitive,
      maxResults,
      contextLines,
      useRegex,
      maxFileBytes: this.maxFileBytes,
      ignoreDirs: this.ignoreDirs,
      rgTimeoutMs: this.rgTimeoutMs
    });
  }

  searchFiles({ query, projectPath, allRoots, maxResults, caseSensitive }: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    maxResults: number;
    caseSensitive: boolean;
  }): FileMatch[] {
    return runSearchFiles({
      workspace: this.workspace,
      hasRipgrep: this.hasRipgrep,
      ignoreDirs: this.ignoreDirs,
      rgTimeoutMs: this.rgTimeoutMs,
      query,
      projectPath,
      allRoots,
      maxResults,
      caseSensitive
    });
  }

  getSymbol({ symbol, projectPath, allRoots, glob = '*', maxResults = 100, caseSensitive = false }: {
    symbol: string;
    projectPath?: string;
    allRoots?: boolean;
    glob?: string;
    maxResults?: number;
    caseSensitive?: boolean;
  }): GetSymbolResult {
    const normalized = normalizeSymbolInput(symbol);
    if (!normalized) throw new Error('symbol is required');

    const rows = this.searchCode({
      query: buildDefinitionPattern(normalized),
      projectPath,
      allRoots,
      glob,
      maxResults,
      caseSensitive,
      useRegex: true,
      contextLines: 0
    });

    const definitions: SymbolResult[] = [];
    const exports: SymbolResult[] = [];
    for (const row of rows) {
      const classification = classifySymbolLine(row.text, normalized);
      const item: SymbolResult = {
        file: row.file,
        start_line: row.line,
        end_line: row.line,
        text: row.text
      };
      if (classification === 'definition') definitions.push(item);
      if (/\bexport\b|module\.exports|exports\./i.test(row.text)) exports.push(item);
    }

    return {
      symbol: normalized,
      count: rows.length,
      definitions,
      exports
    };
  }

  findUsages({ symbol, projectPath, allRoots, glob = '*', maxResults = 200, caseSensitive = false, contextLines = 0 }: {
    symbol: string;
    projectPath?: string;
    allRoots?: boolean;
    glob?: string;
    maxResults?: number;
    caseSensitive?: boolean;
    contextLines?: number;
  }): FindUsagesResult {
    const normalized = normalizeSymbolInput(symbol);
    if (!normalized) throw new Error('symbol is required');

    const rows = this.searchCode({
      query: buildSymbolWordPattern(normalized),
      projectPath,
      allRoots,
      glob,
      maxResults,
      caseSensitive,
      useRegex: true,
      contextLines
    });

    const usages: UsageResult[] = [];
    for (const row of rows) {
      const kind = classifySymbolLine(row.text, normalized);
      if (kind !== 'call' && kind !== 'import') continue;
      usages.push({
        file: row.file,
        line: row.line,
        kind,
        text: row.text,
        ...(Array.isArray(row.context_before) ? { context_before: row.context_before } : {}),
        ...(Array.isArray(row.context_after) ? { context_after: row.context_after } : {})
      });
    }

    return {
      symbol: normalized,
      count: usages.length,
      usages
    };
  }

  // -- Symbol-index-powered queries (with regex fallback) --

  findCallersSymbol(opts: { symbol: string; projectPath?: string; language?: string; maxResults?: number }): FindCallersResult {
    if (this.symbolIndex) return this.symbolIndex.findCallers(opts.symbol, opts);
    const r = this.findUsages({ symbol: opts.symbol, projectPath: opts.projectPath, maxResults: opts.maxResults || 100, caseSensitive: false, glob: '*' });
    const calls = r.usages.filter(u => u.kind === 'call');
    return { symbol: r.symbol, count: calls.length, callers: calls.map(u => ({
      file: u.file, line_start: u.line, line_end: u.line, text: u.text, kind: 'call' as const, scope_path: '', language: '', is_export: false
    })) };
  }

  findDefinitionSymbol(opts: { symbol: string; projectPath?: string; language?: string }): FindDefinitionResult {
    if (this.symbolIndex) return this.symbolIndex.findDefinition(opts.symbol, opts);
    const r = this.getSymbol({ symbol: opts.symbol, projectPath: opts.projectPath, caseSensitive: false });
    return { symbol: r.symbol, count: r.definitions.length, definitions: r.definitions.map(d => ({
      file: d.file, line_start: d.start_line, line_end: d.end_line, text: d.text, kind: 'function' as const, scope_path: '', language: '', is_export: false
    })) };
  }

  findImplementationsSymbol(opts: { interfaceName: string; projectPath?: string; language?: string; maxResults?: number }): FindImplementationsResult {
    if (this.symbolIndex) return this.symbolIndex.findImplementations(opts.interfaceName, opts);
    const rows = this.searchCode({ query: `implements ${opts.interfaceName}`, projectPath: opts.projectPath, glob: '*', maxResults: opts.maxResults || 100, caseSensitive: false });
    return { symbol: opts.interfaceName, count: rows.length, implementations: rows.map(r => ({
      file: r.file, line_start: r.line, line_end: r.line, text: r.text, kind: 'class' as const, scope_path: '', language: '', is_export: false
    })) };
  }

  renamePreviewSymbol(opts: { oldName: string; newName: string; projectPath?: string; maxResults?: number }): RenamePreviewResult {
    if (this.symbolIndex) return this.symbolIndex.renamePreview(opts.oldName, opts.newName, opts);
    const rows = this.searchCode({ query: buildSymbolWordPattern(opts.oldName), projectPath: opts.projectPath, glob: '*', maxResults: opts.maxResults || 500, caseSensitive: true, useRegex: true });
    const esc = opts.oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc}\\b`, 'g');
    const filesSet = new Set<string>();
    const changes = rows.map(r => { filesSet.add(r.file); return { file: r.file, line: r.line, original_text: r.text, preview_text: r.text.replace(re, opts.newName), kind: (classifySymbolLine(r.text, opts.oldName) || 'reference') as any }; });
    return { old_name: opts.oldName, new_name: opts.newName, total_changes: changes.length, files_affected: filesSet.size, changes };
  }

  async searchHybrid({
    query,
    projectPath,
    allRoots,
    glob,
    maxResults,
    caseSensitive,
    minSemanticScore,
    autoIndex = true,
    useReranker = false
  }: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    glob: string;
    maxResults: number;
    caseSensitive: boolean;
    minSemanticScore: number;
    autoIndex?: boolean;
    useReranker?: boolean;
  }): Promise<HybridSearchResult> {
    const queryTerms = tokenize(query).slice(0, 12);
    const genericShortQuery = isGenericShortQuery(queryTerms);
    const lexical = this.searchCode({
      query,
      projectPath,
      allRoots,
      glob,
      maxResults: maxResults * 3,
      caseSensitive
    });

    const bootstrapped = await maybeBootstrapSemanticIndex({
      vectorIndex: this.vectorIndex,
      autoIndex,
      autoIndexedScopes: this.autoIndexedScopes,
      getScopeKey: () => this.buildScopeKey(projectPath, allRoots),
      projectPath,
      allRoots,
      query,
      maxResults,
      minSemanticScore,
      defaultAutoIndexMaxFiles: this.defaultAutoIndexMaxFiles
    });
    const semantic = bootstrapped.semantic;
    const autoIndexMeta = bootstrapped.autoIndexMeta;

    const ranked = await fuseRankAndRerank({
      query,
      lexical,
      semantic,
      queryTerms,
      allRoots,
      genericShortQuery,
      useReranker,
      reranker: this.reranker,
      rerankerMinCandidates: this.rerankerMinCandidates,
      rerankerTopN: this.rerankerTopN,
      maxResults
    });

    let indexStaleness: StalenessInfo | null = null;
    if (this.vectorIndex) {
      try {
        indexStaleness = await this.vectorIndex.checkStaleness() as StalenessInfo;
      } catch {
        // non-fatal
      }
    }

    return {
      query,
      lexical_hits: lexical.length,
      semantic_hits: semantic.length,
      ranking_mode: ranked.rankingMode,
      auto_index: autoIndexMeta,
      reranker: ranked.reranker,
      index_stale: indexStaleness?.stale ?? null,
      index_staleness: indexStaleness,
      results: ranked.results
    };
  }

  buildScopeKey(projectPath: string | undefined, allRoots: boolean | undefined): string {
    const bases = this.workspace.resolveSearchBases(projectPath, allRoots);
    const normalized = bases.map((base) => this.workspace.normalizeTarget(base)).sort();
    return normalized.join('||');
  }
}
