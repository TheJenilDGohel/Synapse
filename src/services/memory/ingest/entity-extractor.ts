/**
 * Regex-based entity extraction from text.
 * Extracted to its own module to avoid circular dependency:
 * ingest.ts -> entries.ts -> auto-link.ts -> ingest.ts
 */
import type { ExtractedEntity } from '../types.js';

interface EntityPattern {
  regex: RegExp;
  type: string;
}

// Patterns for extracting named entities from text
const ENTITY_PATTERNS: EntityPattern[] = [
  // Capitalized multi-word noun phrases (2-4 words): "Machine Learning", "Knowledge Graph Core"
  { regex: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g, type: 'concept' },
  // Quoted terms as entities: "knowledge graph", 'entity extraction'
  { regex: /["']([A-Za-z][A-Za-z0-9\s_-]{2,40})["']/g, type: 'concept' },
  // File paths: /src/foo.js, ./bar/baz.ts
  { regex: /(?:^|\s)((?:\.?\/?)?(?:[\w.-]+\/)+[\w.-]+\.[a-z]{1,5})\b/g, type: 'file' },
  // URLs
  { regex: /(https?:\/\/[^\s)<>"']+)/g, type: 'url' },
  // ALL_CAPS identifiers (likely constants or acronyms, 2-20 chars)
  { regex: /\b([A-Z][A-Z0-9_]{2,19})\b/g, type: 'concept' }
];

// Common English words to skip as entities
const STOP_WORDS = new Set([
  'the', 'this', 'that', 'these', 'those', 'with', 'from', 'into', 'have',
  'been', 'were', 'will', 'would', 'could', 'should', 'does', 'did', 'has',
  'each', 'every', 'some', 'many', 'much', 'more', 'most', 'other', 'another',
  'both', 'here', 'there', 'when', 'where', 'what', 'which', 'while', 'after',
  'before', 'above', 'below', 'between', 'through', 'during', 'about', 'against',
  'also', 'just', 'only', 'very', 'then', 'than', 'such', 'like', 'over',
  'however', 'therefore', 'because', 'since', 'until', 'although', 'though',
  'still', 'even', 'well', 'back', 'make', 'made', 'take', 'took', 'give',
  'gave', 'come', 'came', 'want', 'need', 'know', 'knew', 'think', 'thought',
  'look', 'find', 'found', 'tell', 'told', 'ask', 'asked', 'work', 'worked',
  'call', 'called', 'try', 'tried', 'keep', 'kept', 'let', 'begin', 'began',
  'seem', 'seemed', 'help', 'helped', 'show', 'showed', 'hear', 'heard',
  'play', 'played', 'run', 'ran', 'move', 'moved', 'live', 'lived',
  'NOT', 'AND', 'THE', 'FOR', 'BUT', 'NOR', 'YET', 'NULL', 'TRUE', 'FALSE',
  'TODO', 'NOTE', 'SEE'
]);

/**
 * Extract entities from text using regex heuristics.
 * Returns [{name, type}] with deduplication.
 */
export function extractEntities(text: string): ExtractedEntity[] {
  if (!text || typeof text !== 'string') return [];
  const seen = new Set<string>();
  const entities: ExtractedEntity[] = [];

  for (const { regex, type } of ENTITY_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const raw = (match[1] || match[0]).trim();
      if (raw.length < 2 || raw.length > 100) continue;
      const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
      if (STOP_WORDS.has(normalized) || STOP_WORDS.has(raw)) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      entities.push({ name: raw, type });
    }
  }

  return entities.slice(0, 50);
}
