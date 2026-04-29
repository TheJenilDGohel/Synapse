import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { LANG_BY_EXT, getExt, DECL_TYPES_BY_LANG } from '../chunker/languages.js';
import { getNodeName, buildScopePath } from '../chunker/ast-utils.js';
import type { TreeSitterNode } from '../chunker/ast-utils.js';
import type { SymbolEntry, SymbolKind } from './types.js';

const TAG_QUERIES = new Map<string, any>();

// -- Regex patterns per language for definition extraction --

const TS_JS_DEF_PATTERNS: RegExp[] = [
  /\b(function)\s+(\w+)/,
  /\b(class)\s+(\w+)/,
  /\b(interface)\s+(\w+)/,
  /\b(type)\s+(\w+)\s*[=<]/,
  /\b(enum)\s+(\w+)/,
  /\b(const|let|var)\s+(\w+)\s*[=:]/
];

const PYTHON_DEF_PATTERNS: RegExp[] = [
  /\b(def)\s+(\w+)/,
  /\b(class)\s+(\w+)/
];

const GO_DEF_PATTERNS: RegExp[] = [
  /\b(func)\s+(\w+)/,
  /\b(type)\s+(\w+)\s+(struct|interface)/
];

const RUST_DEF_PATTERNS: RegExp[] = [
  /\b(fn)\s+(\w+)/,
  /\b(struct)\s+(\w+)/,
  /\b(enum)\s+(\w+)/,
  /\b(trait)\s+(\w+)/,
  /\b(impl)\s+(?:\w+\s+for\s+)?(\w+)/
];

const DEF_PATTERNS: Record<string, RegExp[]> = {
  typescript: TS_JS_DEF_PATTERNS,
  tsx: TS_JS_DEF_PATTERNS,
  javascript: TS_JS_DEF_PATTERNS.filter(p => {
    const src = p.source;
    return !src.includes('interface') && !src.includes('type');
  }),
  python: PYTHON_DEF_PATTERNS,
  go: GO_DEF_PATTERNS,
  rust: RUST_DEF_PATTERNS
};

const KEYWORD_TO_KIND: Record<string, SymbolKind> = {
  function: 'function',
  class: 'class',
  interface: 'interface',
  type: 'type',
  enum: 'enum',
  const: 'variable',
  let: 'variable',
  var: 'variable',
  def: 'function',
  func: 'function',
  fn: 'function',
  struct: 'struct',
  trait: 'trait',
  impl: 'struct'
};

const EXPORT_PATTERN = /\b(export|pub)\b|^module\.exports|^exports\./;

function makeId(): string {
  return crypto.randomUUID();
}

function cap(text: string, maxLen = 200): string {
  const trimmed = text.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

// -- Regex-based extraction --

export function extractSymbolsRegex(
  filePath: string,
  text: string,
  languageId: string
): SymbolEntry[] {
  const patterns = DEF_PATTERNS[languageId];
  if (!patterns) return [];

  const lines = text.split(/\r?\n/);
  const entries: SymbolEntry[] = [];
  const now = new Date().toISOString();
  const definedSymbols = new Set<string>();

  // First pass: definitions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      const m = pattern.exec(line);
      if (!m) continue;

      const keyword = m[1].toLowerCase();
      const name = m[2];
      if (!name || name.length < 2) continue;

      const kind = KEYWORD_TO_KIND[keyword] || 'function';
      const isExport = EXPORT_PATTERN.test(line) ? 1 : 0;

      entries.push({
        id: makeId(),
        file_path: filePath,
        symbol_name: name,
        symbol_kind: kind,
        node_type: null,
        line_start: i + 1,
        line_end: i + 1,
        scope_path: '',
        language: languageId,
        is_definition: 1,
        is_export: isExport,
        context_text: cap(line),
        indexed_at: now
      });
      definedSymbols.add(name);
      break; // one match per line is enough
    }
  }

  // Second pass: call sites for known symbols
  if (definedSymbols.size > 0) {
    const symbolList = [...definedSymbols];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that are already recorded as definitions
      if (entries.some(e => e.line_start === i + 1 && e.is_definition === 1)) continue;

      for (const sym of symbolList) {
        const callRe = new RegExp(`\\b${escapeRegex(sym)}\\s*\\(`);
        if (callRe.test(line)) {
          entries.push({
            id: makeId(),
            file_path: filePath,
            symbol_name: sym,
            symbol_kind: 'call',
            node_type: null,
            line_start: i + 1,
            line_end: i + 1,
            scope_path: '',
            language: languageId,
            is_definition: 0,
            is_export: 0,
            context_text: cap(line),
            indexed_at: now
          });
        }
      }
    }
  }

  return entries;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// -- Tree-sitter extraction --

interface ParserLike {
  parse: (text: string) => { rootNode: TreeSitterNode };
}

const AST_CALL_TYPES = new Set([
  'call_expression',      // JS/TS
  'function_call',        // Python, Rust
  'call_expression',      // Go
]);

function walkNodes(root: TreeSitterNode, visitor: (node: TreeSitterNode) => void): void {
  const stack: TreeSitterNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    visitor(node);
    if (Array.isArray(node.namedChildren)) {
      for (let i = node.namedChildren.length - 1; i >= 0; i--) {
        stack.push(node.namedChildren[i]);
      }
    }
  }
}

export async function extractSymbolsTreeSitter(
  filePath: string,
  text: string,
  languageId: string,
  parser: ParserLike,
  language: any
): Promise<SymbolEntry[]> {
  const declTypes = DECL_TYPES_BY_LANG[languageId];
  if (!declTypes) return [];

  let tree: { rootNode: TreeSitterNode };
  try {
    tree = parser.parse(text);
  } catch {
    return [];
  }

  const entries: SymbolEntry[] = [];
  const now = new Date().toISOString();

  let query: any = null;
  if (!TAG_QUERIES.has(languageId)) {
    const qPath = path.join(process.cwd(), 'src/core/engine/retrieval/symbols/queries', `${languageId}-tags.scm`);
    if (fs.existsSync(qPath)) {
      const source = fs.readFileSync(qPath, 'utf8');
      try {
        const TreeSitter = await import('tree-sitter');
        const Query = (TreeSitter as any).Query || (TreeSitter as any).default?.Query;
        const q = new Query(language, source);
        TAG_QUERIES.set(languageId, q);
      } catch (e) { TAG_QUERIES.set(languageId, null); }
    } else {
      TAG_QUERIES.set(languageId, null);
    }
  }
  query = TAG_QUERIES.get(languageId);

  if (query) {
    for (const match of query.matches(tree.rootNode)) {
      const defCap = match.captures.find((c: any) => c.name.startsWith('definition.') || c.name.startsWith('reference.'));
      const nameCap = match.captures.find((c: any) => c.name === 'name');
      if (!defCap || !nameCap) continue;

      const isDef = defCap.name.startsWith('definition.');
      const kind = defCap.name.split('.')[1] || 'function';
      const name = nameCap.node.text;
      const node = defCap.node;

      entries.push({
        id: makeId(),
        file_path: filePath,
        symbol_name: name,
        symbol_kind: kind as SymbolKind,
        node_type: node.type,
        line_start: (node.startPosition?.row ?? 0) + 1,
        line_end: (node.endPosition?.row ?? 0) + 1,
        scope_path: buildScopePath(node, languageId),
        language: languageId,
        is_definition: isDef ? 1 : 0,
        is_export: isExportedNode(node, languageId) ? 1 : 0,
        context_text: cap((node.text || '').split(/\r?\n/)[0] || ''),
        indexed_at: now
      });
    }
    return entries;
  }

  walkNodes(tree.rootNode, (node) => {
    // Declaration nodes
    if (declTypes.has(node.type)) {
      const name = getNodeName(node);
      if (!name || name.length < 2) return;

      const startLine = (node.startPosition?.row ?? 0) + 1;
      const endLine = (node.endPosition?.row ?? 0) + 1;
      const kind = astNodeTypeToKind(node.type, languageId);
      const isExport = isExportedNode(node, languageId);
      const scopePath = buildScopePath(node, languageId);
      const contextText = cap(
        (node.text || '').split(/\r?\n/)[0] || ''
      );

      entries.push({
        id: makeId(),
        file_path: filePath,
        symbol_name: name,
        symbol_kind: kind,
        node_type: node.type,
        line_start: startLine,
        line_end: endLine,
        scope_path: scopePath,
        language: languageId,
        is_definition: 1,
        is_export: isExport ? 1 : 0,
        context_text: contextText,
        indexed_at: now
      });
    }

    // Call sites
    if (AST_CALL_TYPES.has(node.type)) {
      const name = getCallName(node);
      if (!name || name.length < 2) return;

      const startLine = (node.startPosition?.row ?? 0) + 1;
      const endLine = (node.endPosition?.row ?? 0) + 1;
      const scopePath = buildScopePath(node, languageId);

      entries.push({
        id: makeId(),
        file_path: filePath,
        symbol_name: name,
        symbol_kind: 'call',
        node_type: node.type,
        line_start: startLine,
        line_end: endLine,
        scope_path: scopePath,
        language: languageId,
        is_definition: 0,
        is_export: 0,
        context_text: cap(
          (node.text || '').split(/\r?\n/)[0] || ''
        ),
        indexed_at: now
      });
    }
  });

  return entries;
}

function getCallName(node: TreeSitterNode): string {
  // Try 'function' field first (JS/TS call_expression)
  if (typeof node.childForFieldName === 'function') {
    const fnNode = node.childForFieldName('function');
    if (fnNode) {
      // For member expressions like obj.method(), get just the method name
      if (fnNode.type === 'member_expression' || fnNode.type === 'attribute') {
        const prop = fnNode.childForFieldName?.('property') || fnNode.childForFieldName?.('attribute');
        if (prop?.text) return prop.text.trim();
      }
      if (fnNode.type === 'identifier' && fnNode.text) return fnNode.text.trim();
    }
  }
  return getNodeName(node);
}

function astNodeTypeToKind(nodeType: string, _languageId: string): SymbolKind {
  if (nodeType.includes('function') || nodeType.includes('method')) return 'function';
  if (nodeType.includes('class')) return 'class';
  if (nodeType.includes('interface')) return 'interface';
  if (nodeType.includes('type_alias')) return 'type';
  if (nodeType.includes('enum')) return 'enum';
  if (nodeType.includes('struct')) return 'struct';
  if (nodeType.includes('trait') || nodeType.includes('protocol')) return 'trait';
  if (nodeType.includes('impl')) return 'struct';
  if (nodeType.includes('mod')) return 'module';
  return 'function';
}

function isExportedNode(node: TreeSitterNode, languageId: string): boolean {
  const parent = node.parent;
  if (!parent) return false;

  if (['typescript', 'tsx', 'javascript'].includes(languageId)) {
    return parent.type === 'export_statement';
  }
  if (languageId === 'rust') {
    // Check for visibility modifier 'pub'
    const text = (node.text || '').split(/\r?\n/)[0] || '';
    return /\bpub\b/.test(text);
  }
  return false;
}

// -- Orchestrator --

interface AstChunkerLike {
  resolveLanguageId(filePath: string): string | null;
  getParser(languageId: string): Promise<ParserLike | null>;
  getLanguage(languageId: string): Promise<any>;
}

export async function extractSymbolsFromFile(
  filePath: string,
  text: string,
  astChunker?: AstChunkerLike | null
): Promise<SymbolEntry[]> {
  const ext = getExt(filePath);
  const languageId = LANG_BY_EXT[ext];
  if (!languageId) return [];
  if (!DEF_PATTERNS[languageId]) return [];

  // Try tree-sitter first if available
  if (astChunker) {
    try {
      const parser = await astChunker.getParser(languageId);
      const language = await astChunker.getLanguage(languageId);
      if (parser && language) {
        const tsEntries = await extractSymbolsTreeSitter(filePath, text, languageId, parser, language);
        if (tsEntries.length > 0) {
          // Merge with regex results: tree-sitter entries win on conflicts
          const regexEntries = extractSymbolsRegex(filePath, text, languageId);
          return mergeEntries(tsEntries, regexEntries);
        }
      }
    } catch {
      // Fall through to regex
    }
  }

  return extractSymbolsRegex(filePath, text, languageId);
}

function mergeEntries(primary: SymbolEntry[], secondary: SymbolEntry[]): SymbolEntry[] {
  // Primary (tree-sitter) entries take precedence.
  // Add secondary entries only if no primary entry covers the same (symbol, line, kind).
  const seen = new Set<string>();
  for (const e of primary) {
    seen.add(`${e.symbol_name}:${e.line_start}:${e.symbol_kind}`);
  }
  const merged = [...primary];
  for (const e of secondary) {
    const key = `${e.symbol_name}:${e.line_start}:${e.symbol_kind}`;
    if (!seen.has(key)) {
      merged.push(e);
      seen.add(key);
    }
  }
  return merged;
}
