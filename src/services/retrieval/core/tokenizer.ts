const CODE_STOPWORDS = new Set([
  'return', 'const', 'let', 'var', 'function', 'class', 'import', 'export',
  'from', 'default', 'new', 'this', 'if', 'else', 'for', 'while', 'do',
  'try', 'catch', 'throw', 'async', 'await', 'of', 'in', 'true', 'false',
  'null', 'undefined', 'void', 'static', 'public', 'private', 'protected',
  'extends', 'implements', 'interface', 'type', 'enum', 'namespace'
]);

/**
 * Tokenize code text into searchable sub-tokens.
 *
 * Handles:
 *   - camelCase / PascalCase splitting: getUserById -> get, user, by, id
 *   - snake_case: user_profile_service -> user, profile, service
 *   - kebab-case: react-query -> react, query
 *   - digit boundaries: react18 -> react, 18; v2 -> v, 2
 *   - compound alias: getuserbyid emitted alongside split tokens for exact-match bonus
 *   - code stopword filtering (const, return, etc.)
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const rawWords = text.split(/[^\w-]+/);

  for (const raw of rawWords) {
    if (!raw) continue;

    // Kebab-case: react-query -> ['react', 'query']
    const kebabParts = raw.split('-').filter(Boolean);

    for (const part of kebabParts) {
      // camelCase / PascalCase split:
      //   getUserById -> get_User_By_Id  -> ['get','user','by','id']
      //   XMLParser   -> XML_Parser      -> ['xml','parser']
      const camelSplit = part
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase()
        .split('_')
        .filter(Boolean);

      // Digit boundary: react18 -> ['react','18'], v2 -> ['v','2']
      const subTokens: string[] = [];
      for (const seg of camelSplit) {
        const digitSplit = seg.split(/(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/);
        for (const s of digitSplit) subTokens.push(s);
      }

      // Length gate: min 2, max 40; drop stopwords
      const valid = subTokens.filter(
        (t) => t.length >= 2 && t.length <= 40 && !CODE_STOPWORDS.has(t)
      );

      // Emit compound alias when:
      //   - multiple sub-tokens exist (exact-match bonus, e.g. getuserbyid)
      //   - OR zero valid sub-tokens (the compound is the only token, e.g. v2)
      // Skip when exactly one sub-token -- that token is already emitted below.
      const compound = part.toLowerCase();
      if (
        compound.length >= 2 &&
        compound.length <= 40 &&
        (valid.length !== 1 || compound !== valid[0]) &&
        !CODE_STOPWORDS.has(compound)
      ) {
        if (!seen.has(compound)) {
          seen.add(compound);
          tokens.push(compound);
        }
      }

      for (const t of valid) {
        if (!seen.has(t)) {
          seen.add(t);
          tokens.push(t);
        }
      }
    }
  }

  return tokens;
}

export function toSparsePairs(tokens: string[], maxTerms: number): [string, number][] {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return Array.from(tf.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms);
}
