import {
  LANG_BY_EXT,
  DECL_TYPES_BY_LANG,
  LANGUAGE_LOADERS,
  LANGUAGE_PACKAGES,
  TREE_SITTER_PACKAGE,
  getExt
} from './languages.js';
import type { ChunkSlice, TreeSitterNode } from './ast-utils.js';
import { summarizeImports, buildScopePath, makeLineSlices } from './ast-utils.js';

interface ChunkInput {
  filePath: string;
  text: string;
  chunkLines: number;
  chunkOverlap: number;
}

interface BuildAstInput extends ChunkInput {
  languageId: string;
}

interface CandidateNode {
  start_line: number;
  end_line: number;
  span: number;
  scope_path: string;
}

interface AstChunkerStats {
  ast_chunks: number;
  fallback_chunks: number;
}

export interface AstChunkerStatus {
  enabled: boolean;
  supported_languages: string[];
  optional_dependencies: string[];
  missing_dependencies: string[];
  missing_dependency_reasons: Record<string, string>;
  warning: string | null;
  active_languages: string[];
  fallback_languages: string[];
  ast_chunks: number;
  fallback_chunks: number;
}

export class AstChunker {
  parserModulePromise: Promise<unknown> | null;
  languagePromises: Map<string, Promise<unknown>>;
  parserByLanguage: Map<string, unknown>;
  treeSitterUnavailable: boolean;
  treeSitterUnavailableReason: string;
  activeLanguages: Set<string>;
  fallbackLanguages: Set<string>;
  missingDependencies: Set<string>;
  missingDependencyReasons: Map<string, string>;
  stats: AstChunkerStats;

  constructor() {
    this.parserModulePromise = null;
    this.languagePromises = new Map();
    this.parserByLanguage = new Map();
    this.treeSitterUnavailable = false;
    this.treeSitterUnavailableReason = '';
    this.activeLanguages = new Set();
    this.fallbackLanguages = new Set();
    this.missingDependencies = new Set();
    this.missingDependencyReasons = new Map();
    this.stats = {
      ast_chunks: 0,
      fallback_chunks: 0
    };
  }

  noteMissingDependency(packageName: string, error?: unknown): void {
    if (!packageName) return;
    this.missingDependencies.add(packageName);
    if (error) this.missingDependencyReasons.set(packageName, String((error as Error)?.message || error));
  }

  resolveLanguageId(filePath: string): string | null {
    return LANG_BY_EXT[getExt(filePath)] || null;
  }

  async getParserModule(): Promise<unknown> {
    if (this.treeSitterUnavailable) return null;
    if (!this.parserModulePromise) {
      this.parserModulePromise = import('tree-sitter').catch((error: unknown) => {
        this.treeSitterUnavailable = true;
        this.treeSitterUnavailableReason = String((error as Error)?.message || error || '');
        this.noteMissingDependency(TREE_SITTER_PACKAGE, error);
        return null;
      });
    }
    return this.parserModulePromise;
  }

  async getLanguage(languageId: string): Promise<unknown> {
    if (this.languagePromises.has(languageId)) return this.languagePromises.get(languageId)!;

    const loader = LANGUAGE_LOADERS[languageId];
    if (!loader) {
      this.languagePromises.set(languageId, Promise.resolve(null));
      return null;
    }

    const promise = loader().catch((error: unknown) => {
      this.noteMissingDependency(LANGUAGE_PACKAGES[languageId], error);
      return null;
    });
    this.languagePromises.set(languageId, promise);
    return promise;
  }

  async getParser(languageId: string): Promise<{ parse: (text: string) => { rootNode: TreeSitterNode } } | null> {
    if (this.parserByLanguage.has(languageId)) return this.parserByLanguage.get(languageId) as ReturnType<typeof this.getParser> extends Promise<infer R> ? R : never;

    const parserModule = await this.getParserModule() as { default?: new () => unknown } | null;
    if (!parserModule) return null;
    const Parser = (parserModule as { default?: new () => unknown }).default || parserModule;
    if (!Parser) return null;

    const language = await this.getLanguage(languageId);
    if (!language) {
      this.fallbackLanguages.add(languageId);
      return null;
    }

    const parser = new (Parser as new () => { setLanguage: (lang: unknown) => void; parse: (text: string) => { rootNode: TreeSitterNode } })();
    parser.setLanguage(language);
    this.parserByLanguage.set(languageId, parser);
    this.activeLanguages.add(languageId);
    return parser;
  }

  collectCandidateNodes(root: TreeSitterNode, languageId: string): TreeSitterNode[] {
    const declTypes = DECL_TYPES_BY_LANG[languageId] || new Set<string>();
    const nodes: TreeSitterNode[] = [];
    const stack: (TreeSitterNode | null)[] = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;
      if (declTypes.has(node.type)) nodes.push(node);
      if (Array.isArray(node.namedChildren)) {
        for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) {
          stack.push(node.namedChildren[i]);
        }
      }
    }
    return nodes;
  }

  toAstSlices({ filePath, text, chunkLines, chunkOverlap }: ChunkInput): Promise<ChunkSlice[] | null> | null {
    const languageId = this.resolveLanguageId(filePath);
    if (!languageId) return null;

    return this.buildAstSlices({ filePath, text, chunkLines, chunkOverlap, languageId });
  }

  async buildAstSlices({ text, chunkLines, chunkOverlap, languageId }: BuildAstInput): Promise<ChunkSlice[] | null> {
    try {
      const parser = await this.getParser(languageId);
      if (!parser) return null;

      const lines = String(text || '').split(/\r?\n/);
      const tree = parser.parse(String(text || ''));
      const root = tree?.rootNode;
      if (!root) return null;

      const importSummary = summarizeImports(text, languageId);
      const candidates: CandidateNode[] = this.collectCandidateNodes(root, languageId)
        .map((node) => {
          const start = (node.startPosition?.row ?? 0) + 1;
          const end = (node.endPosition?.row ?? 0) + 1;
          const span = end - start + 1;
          return {
            start_line: start,
            end_line: end,
            span,
            scope_path: buildScopePath(node, languageId)
          };
        })
        .filter((item) => item.span >= 2)
        .sort((a, b) => a.start_line - b.start_line || a.end_line - b.end_line);

      if (candidates.length === 0) return null;

      const slices: ChunkSlice[] = [];
      const maxSpan = Math.max(chunkLines * 3, chunkLines + chunkOverlap);
      for (const item of candidates) {
        if (item.end_line < item.start_line) continue;

        if (item.span <= maxSpan) {
          const rawText = lines.slice(item.start_line - 1, item.end_line).join('\n');
          if (!rawText.trim()) continue;
          const semanticText = [
            item.scope_path ? `scope_path: ${item.scope_path}` : '',
            importSummary ? `imports: ${importSummary}` : '',
            rawText
          ].filter(Boolean).join('\n');
          slices.push({
            start_line: item.start_line,
            end_line: item.end_line,
            raw_text: rawText,
            semantic_text: semanticText,
            scope_path: item.scope_path
          });
          continue;
        }

        const partSlices = makeLineSlices(
          lines.slice(item.start_line - 1, item.end_line),
          chunkLines,
          chunkOverlap
        );
        for (const part of partSlices) {
          const start = item.start_line + part.start_line - 1;
          const end = item.start_line + part.end_line - 1;
          const semanticText = [
            item.scope_path ? `scope_path: ${item.scope_path}` : '',
            importSummary ? `imports: ${importSummary}` : '',
            part.raw_text
          ].filter(Boolean).join('\n');
          slices.push({
            start_line: start,
            end_line: end,
            raw_text: part.raw_text,
            semantic_text: semanticText,
            scope_path: item.scope_path
          });
        }
      }

      if (slices.length === 0) return null;

      const deduped: ChunkSlice[] = [];
      const seen = new Set<string>();
      for (const item of slices) {
        const key = `${item.start_line}:${item.end_line}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
      }
      this.activeLanguages.add(languageId);
      this.stats.ast_chunks += deduped.length;
      return deduped;
    } catch {
      this.fallbackLanguages.add(languageId);
      return null;
    }
  }

  async chunk({ filePath, text, chunkLines, chunkOverlap }: ChunkInput): Promise<ChunkSlice[]> {
    const lines = String(text || '').split(/\r?\n/);
    const astSlices = await this.toAstSlices({ filePath, text, chunkLines, chunkOverlap });
    if (Array.isArray(astSlices) && astSlices.length > 0) return astSlices;
    const languageId = this.resolveLanguageId(filePath);
    if (languageId) this.fallbackLanguages.add(languageId);
    const fallback = makeLineSlices(lines, chunkLines, chunkOverlap);
    this.stats.fallback_chunks += fallback.length;
    return fallback;
  }

  getStatus(): AstChunkerStatus {
    const supportedLanguages = Object.keys(LANGUAGE_LOADERS);
    const missingDependencies = Array.from(this.missingDependencies).sort();
    const missingDependencyReasons = Object.fromEntries(
      Array.from(this.missingDependencyReasons.entries()).sort(([a], [b]) => a.localeCompare(b))
    );
    const warning = this.treeSitterUnavailable
      ? `AST chunking is disabled because optional package "${TREE_SITTER_PACKAGE}" is unavailable. Install optional tree-sitter dependencies or use line-based fallback chunking.`
      : (missingDependencies.length > 0
        ? `AST chunking is partially degraded because optional parser packages are unavailable: ${missingDependencies.join(', ')}. Synapse will continue with line-based fallback chunking for affected languages.`
        : null);

    return {
      enabled: !this.treeSitterUnavailable,
      supported_languages: supportedLanguages,
      optional_dependencies: [TREE_SITTER_PACKAGE, ...Object.values(LANGUAGE_PACKAGES)],
      missing_dependencies: missingDependencies,
      missing_dependency_reasons: missingDependencyReasons,
      warning,
      active_languages: Array.from(this.activeLanguages).sort(),
      fallback_languages: Array.from(this.fallbackLanguages).sort(),
      ast_chunks: this.stats.ast_chunks,
      fallback_chunks: this.stats.fallback_chunks
    };
  }
}
