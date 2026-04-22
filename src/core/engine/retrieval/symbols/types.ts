export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'method'
  | 'variable'
  | 'struct'
  | 'trait'
  | 'enum'
  | 'module'
  | 'call'
  | 'reference'
  | 'import';

export interface SymbolEntry {
  id: string;
  file_path: string;
  symbol_name: string;
  symbol_kind: SymbolKind;
  node_type: string | null;
  line_start: number;
  line_end: number;
  scope_path: string;
  language: string;
  is_definition: number;
  is_export: number;
  context_text: string;
  indexed_at: string;
}

export interface SymbolMatch {
  file: string;
  line_start: number;
  line_end: number;
  text: string;
  kind: SymbolKind;
  scope_path: string;
  language: string;
  is_export: boolean;
}

export interface FindCallersResult {
  symbol: string;
  count: number;
  callers: SymbolMatch[];
}

export interface FindDefinitionResult {
  symbol: string;
  count: number;
  definitions: SymbolMatch[];
}

export interface FindImplementationsResult {
  symbol: string;
  count: number;
  implementations: SymbolMatch[];
}

export interface RenamePreviewEntry {
  file: string;
  line: number;
  original_text: string;
  preview_text: string;
  kind: SymbolKind;
}

export interface RenamePreviewResult {
  old_name: string;
  new_name: string;
  total_changes: number;
  files_affected: number;
  changes: RenamePreviewEntry[];
}

export interface SymbolQueryOptions {
  projectPath?: string;
  language?: string;
  maxResults?: number;
}
