function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeSymbolInput(symbol: string): string {
  return String(symbol || '').trim();
}

export function buildSymbolWordPattern(symbol: string): string {
  const escaped = escapeRegex(symbol);
  return `\\b${escaped}\\b`;
}

export function buildDefinitionPattern(symbol: string): string {
  const sym = escapeRegex(symbol);
  const word = `\\b${sym}\\b`;
  const defLike = [
    `\\b(?:function|class|interface|type|enum)\\s+${sym}\\b`,
    `\\b(?:const|let|var)\\s+${sym}\\b`,
    `\\b(?:def|func|fn|struct|trait|impl)\\s+${sym}\\b`,
    `\\b${sym}\\s*[:=]\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>)`
  ].join('|');
  const exportLike = [
    `\\bexport\\s+(?:default\\s+)?(?:function|class|const|let|var|interface|type|enum)\\s+${sym}\\b`,
    `\\bexport\\s*\\{[^}]*${word}[^}]*\\}`,
    `\\bmodule\\.exports\\.${sym}\\b`,
    `\\bexports\\.${sym}\\b`
  ].join('|');
  return `(?:${defLike}|${exportLike})`;
}

export type SymbolClassification = 'import' | 'call' | 'definition' | 'reference';

export function classifySymbolLine(lineText: string, symbol: string): SymbolClassification | null {
  const text = String(lineText || '');
  const sym = escapeRegex(symbol);
  const word = new RegExp(`\\b${sym}\\b`);
  if (!word.test(text)) return null;

  const importPattern = new RegExp(
    `(?:^|\\s)(?:import|from|require\\s*\\(|#include\\s*[<"]|using\\s+|use\\s+.*${sym}|extern\\s+)`,
    'i'
  );
  if (importPattern.test(text)) return 'import';

  const callPattern = new RegExp(`\\b${sym}\\s*\\(`);
  if (callPattern.test(text)) return 'call';

  const defPattern = new RegExp(buildDefinitionPattern(symbol), 'i');
  if (defPattern.test(text)) return 'definition';

  return 'reference';
}
