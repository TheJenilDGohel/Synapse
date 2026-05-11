import path from 'node:path';

export const LANG_BY_EXT: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.phtml': 'php',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.kts': 'kotlin',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.lua': 'lua',
  '.dart': 'dart',
  '.scala': 'scala'
};

export const DECL_TYPES_BY_LANG: Record<string, Set<string>> = {
  javascript: new Set(['function_declaration', 'method_definition', 'class_declaration']),
  typescript: new Set(['function_declaration', 'method_definition', 'class_declaration', 'interface_declaration', 'type_alias_declaration', 'enum_declaration']),
  tsx: new Set(['function_declaration', 'method_definition', 'class_declaration', 'interface_declaration', 'type_alias_declaration', 'enum_declaration']),
  python: new Set(['function_definition', 'class_definition']),
  go: new Set(['function_declaration', 'method_declaration', 'type_declaration']),
  rust: new Set(['function_item', 'struct_item', 'impl_item', 'trait_item', 'enum_item', 'mod_item']),
  java: new Set(['class_declaration', 'interface_declaration', 'enum_declaration', 'method_declaration', 'constructor_declaration', 'record_declaration']),
  c: new Set(['function_definition', 'struct_specifier']),
  cpp: new Set(['function_definition', 'class_specifier', 'struct_specifier', 'namespace_definition']),
  csharp: new Set(['class_declaration', 'struct_declaration', 'interface_declaration', 'enum_declaration', 'method_declaration', 'constructor_declaration', 'record_declaration']),
  ruby: new Set(['class', 'module', 'method']),
  php: new Set(['class_declaration', 'interface_declaration', 'trait_declaration', 'function_definition', 'method_declaration', 'enum_declaration']),
  bash: new Set(['function_definition']),
  kotlin: new Set(['class_declaration', 'interface_declaration', 'object_declaration', 'function_declaration', 'enum_class_body']),
  swift: new Set(['class_declaration', 'struct_declaration', 'enum_declaration', 'protocol_declaration', 'function_declaration']),
  lua: new Set(['function_declaration']),
  dart: new Set(['class_definition', 'function_signature', 'function_body', 'enum_type']),
  scala: new Set(['class_definition', 'object_definition', 'trait_definition', 'function_definition'])
};

export type LanguageLoader = () => Promise<unknown>;

export const LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  javascript: async () => { const mod = await import('tree-sitter-javascript'); return mod.default || mod; },
  python: async () => { const mod = await import('tree-sitter-python'); return mod.default || mod; },
  go: async () => { const mod = await import('tree-sitter-go'); return mod.default || mod; },
  bash: async () => { const mod = await import('tree-sitter-bash'); return mod.default || mod; },
  lua: async () => { const mod = await import('tree-sitter-lua'); return mod.default || mod; },
  dart: async () => { const mod = await import('tree-sitter-dart'); return mod.default || mod; },
  typescript: async () => { const mod = await import('tree-sitter-typescript'); return (mod.default || mod).typescript; },
  tsx: async () => { const mod = await import('tree-sitter-typescript'); return (mod.default || mod).tsx; },
  rust: async () => { const mod = await import('tree-sitter-rust'); return mod.default || mod; }
};

export const TREE_SITTER_PACKAGE = 'tree-sitter';

export const LANGUAGE_PACKAGES: Record<string, string> = {
  javascript: 'tree-sitter-javascript',
  python: 'tree-sitter-python',
  go: 'tree-sitter-go',
  bash: 'tree-sitter-bash',
  lua: 'tree-sitter-lua',
  dart: 'tree-sitter-dart',
  typescript: 'tree-sitter-typescript',
  tsx: 'tree-sitter-typescript',
  rust: 'tree-sitter-rust'
};

export function getExt(filePath: string): string {
  return path.extname(String(filePath || '')).toLowerCase();
}
