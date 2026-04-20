export interface SemanticResult {
  file: string;
  start_line: number;
  end_line: number;
  snippet: string;
  semantic_score: number;
}

export interface AutoIndexMeta {
  attempted: boolean;
  scope: string;
  success?: boolean;
  skipped_reason?: string;
  indexed_files?: number | null;
  failed_files?: number | null;
  error?: string;
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
}

export interface BootstrapOptions {
  vectorIndex: VectorIndexLike | null;
  autoIndex: boolean;
  autoIndexedScopes: Set<string>;
  getScopeKey: () => string;
  projectPath?: string;
  allRoots?: boolean;
  query: string;
  maxResults: number;
  minSemanticScore: number;
  defaultAutoIndexMaxFiles: number;
}

export interface BootstrapResult {
  semantic: SemanticResult[];
  autoIndexMeta: AutoIndexMeta | null;
}

export async function maybeBootstrapSemanticIndex({
  vectorIndex,
  autoIndex,
  autoIndexedScopes,
  getScopeKey,
  projectPath,
  allRoots,
  query,
  maxResults,
  minSemanticScore,
  defaultAutoIndexMaxFiles
}: BootstrapOptions): Promise<BootstrapResult> {
  let semantic: SemanticResult[] = vectorIndex
    ? await vectorIndex.semanticSearch({
      query,
      projectPath,
      allRoots,
      maxResults: maxResults * 3,
      minScore: minSemanticScore
    })
    : [];
  let autoIndexMeta: AutoIndexMeta | null = null;

  if (!vectorIndex || autoIndex === false || semantic.length > 0) {
    return { semantic, autoIndexMeta };
  }
  const scopeKey = typeof getScopeKey === 'function' ? getScopeKey() : '';

  if (autoIndexedScopes.has(scopeKey)) {
    return {
      semantic,
      autoIndexMeta: {
        attempted: false,
        scope: scopeKey,
        skipped_reason: 'already_attempted_for_scope'
      }
    };
  }

  autoIndexedScopes.add(scopeKey);
  try {
    const indexResult = await vectorIndex.indexProject({
      projectPath,
      allRoots,
      force: false,
      maxFiles: defaultAutoIndexMaxFiles
    });
    semantic = await vectorIndex.semanticSearch({
      query,
      projectPath,
      allRoots,
      maxResults: maxResults * 3,
      minScore: minSemanticScore
    });
    autoIndexMeta = {
      attempted: true,
      scope: scopeKey,
      success: true,
      indexed_files: indexResult?.indexed_files ?? null,
      failed_files: Array.isArray(indexResult?.failed_files) ? indexResult.failed_files.length : null
    };
  } catch (error) {
    autoIndexMeta = {
      attempted: true,
      scope: scopeKey,
      success: false,
      error: String((error as Error)?.message || error)
    };
  }

  return { semantic, autoIndexMeta };
}
