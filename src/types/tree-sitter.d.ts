declare module 'tree-sitter' {
  class Parser {
    constructor();
    setLanguage(language: any): void;
    parse(input: string | ((index: number, position: any) => string), oldTree?: any, options?: {bufferSize?: number, includedRanges?: any[]}): any;
    getLanguage(): any;
    getLogger(): any;
    setLogger(logFunc: ((message: string, params: {[key: string]: any}, type: 'parse' | 'lex') => void) | null | undefined): void;
  }
  export default Parser;
  export const Query: any;
  export const Tree: any;
  export const SyntaxNode: any;
  export const TreeCursor: any;
  export const LookaheadIterator: any;
}
