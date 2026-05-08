import { DECL_TYPES_BY_LANG } from './languages.js';

export interface ChunkSlice {
  start_line: number;
  end_line: number;
  raw_text: string;
  semantic_text: string;
  scope_path: string;
}

export interface TreeSitterNode {
  type: string;
  text?: string;
  parent?: TreeSitterNode | null;
  namedChildren?: TreeSitterNode[];
  startPosition?: { row: number };
  endPosition?: { row: number };
  childForFieldName?: (name: string) => TreeSitterNode | null;
}

export function summarizeImports(text: string, languageId: string): string {
  const lines = String(text || '').split(/\r?\n/);
  const imports: string[] = [];

  const push = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed) return;
    imports.push(trimmed.slice(0, 140));
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (imports.length >= 12) break;

    if (['javascript', 'typescript', 'tsx'].includes(languageId)) {
      if (/^import\s+/.test(trimmed) || /^const\s+\w+\s*=\s*require\(/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'python') {
      if (/^(import\s+|from\s+\S+\s+import\s+)/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'go') {
      if (/^import\s+/.test(trimmed) || trimmed === 'import (') push(line);
      continue;
    }
    if (languageId === 'rust') {
      if (/^use\s+/.test(trimmed) || /^mod\s+/.test(trimmed)) push(line);
      continue;
    }
    if (['java', 'kotlin', 'scala'].includes(languageId)) {
      if (/^import\s+/.test(trimmed) || /^package\s+/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'csharp') {
      if (/^using\s+/.test(trimmed) || /^namespace\s+/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'php') {
      if (/^use\s+/.test(trimmed) || /^require(_once)?\s*/.test(trimmed) || /^include(_once)?\s*/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'swift') {
      if (/^import\s+/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'ruby') {
      if (/^require\s+/.test(trimmed) || /^require_relative\s+/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'lua') {
      if (/^local\s+\w+\s*=\s*require\(/.test(trimmed)) push(line);
      continue;
    }
    if (languageId === 'dart') {
      if (/^import\s+/.test(trimmed) || /^part\s+/.test(trimmed)) push(line);
      continue;
    }
  }

  return imports.join(' | ');
}

export function getNodeName(node: TreeSitterNode | null, cache?: WeakMap<TreeSitterNode, string>): string {
  if (!node) return '';
  if (cache?.has(node)) return cache.get(node)!;

  try {
    const named = typeof node.childForFieldName === 'function' ? node.childForFieldName('name') : null;
    if (named && typeof named.text === 'string' && named.text.trim()) {
      const name = named.text.trim();
      cache?.set(node, name);
      return name;
    }
  } catch {
    // no-op
  }

  const stack: (TreeSitterNode | null)[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) continue;
    if (cur.type === 'identifier' && typeof cur.text === 'string' && cur.text.trim()) {
      const name = cur.text.trim();
      cache?.set(node, name);
      return name;
    }
    if (Array.isArray(cur.namedChildren)) {
      for (let i = cur.namedChildren.length - 1; i >= 0; i -= 1) {
        stack.push(cur.namedChildren[i]);
      }
    }
  }
  return '';
}

export function buildScopePath(node: TreeSitterNode, languageId: string, cache?: WeakMap<TreeSitterNode, string>): string {
  const declTypes = DECL_TYPES_BY_LANG[languageId] || new Set<string>();
  const parts: string[] = [];
  let cur: TreeSitterNode | null | undefined = node;
  while (cur) {
    if (declTypes.has(cur.type)) {
      const name = getNodeName(cur, cache);
      if (name) parts.push(name);
    }
    cur = cur.parent || null;
  }
  return parts.reverse().join(' > ');
}

/**
 * Optimized AST context for rendering and chunking.
 * Uses a WeakMap to cache node names during a single pass traversal.
 */
export interface ASTRenderContext {
  nameMap: WeakMap<TreeSitterNode, string>;
}

/**
 * Builds an AST render context in a single pass.
 */
export function buildASTRenderContext(root: TreeSitterNode, languageId?: string): ASTRenderContext {
  const nameMap = new WeakMap<TreeSitterNode, string>();
  const declTypes = languageId ? (DECL_TYPES_BY_LANG[languageId] || new Set<string>()) : null;

  // Single pass to pre-populate nameMap for all nodes
  const stack: TreeSitterNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    
    // Heuristic: only pre-populate for known declaration types if languageId is provided
    // Otherwise, we let getNodeName handle it on demand and cache it.
    if (!declTypes || declTypes.has(node.type)) {
      getNodeName(node, nameMap);
    }
    
    if (Array.isArray(node.namedChildren)) {
      for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) {
        stack.push(node.namedChildren[i]);
      }
    }
  }
  return { nameMap };
}

export function makeLineSlices(lines: string[], chunkLines: number, chunkOverlap: number): ChunkSlice[] {
  const slices: ChunkSlice[] = [];
  const step = Math.max(1, chunkLines - chunkOverlap);
  for (let start = 1; start <= lines.length; start += step) {
    const end = Math.min(lines.length, start + chunkLines - 1);
    const rawText = lines.slice(start - 1, end).join('\n');
    if (rawText.trim()) {
      slices.push({
        start_line: start,
        end_line: end,
        raw_text: rawText,
        semantic_text: rawText,
        scope_path: ''
      });
    }
  }
  return slices;
}
