/**
 * Hybrid entity extraction from text.
 * 
 * Combines regex-based heuristics (fast, zero-overhead) with optional
 * BERT-NER model extraction (higher quality, opt-in).
 * 
 * When NER is enabled, both extractors run and results are merged with
 * deduplication. NER entities take precedence over regex matches for
 * the same entity name (they have better type classification).
 * 
 * Extracted to its own module to avoid circular dependency:
 * ingest.ts -> entries.ts -> auto-link.ts -> ingest.ts
 */
import type { ExtractedEntity } from '../types/index.js';
import { NERService } from './ner-service.js';
import type { NERServiceOptions } from './ner-service.js';

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

// Singleton NER service instance (lazy-loaded when enabled)
let _nerService: NERService | null = null;
let _nerEnabled = false;

/**
 * Configure the NER service for entity extraction.
 * Call this once during app initialization when LOCI_NER_ENABLED=true.
 */
export function configureNER(enabled: boolean, options?: NERServiceOptions): void {
  _nerEnabled = enabled;
  if (enabled) {
    _nerService = new NERService(options);
  } else {
    _nerService = null;
  }
}

/**
 * Get the current NER service status.
 */
export function getNERStatus() {
  if (!_nerEnabled || !_nerService) {
    return { enabled: false, model: '', available: false };
  }
  return _nerService.getStatus();
}

/**
 * Extract entities from text using regex heuristics.
 * Returns [{name, type}] with deduplication.
 */
export function extractEntitiesRegex(text: string): ExtractedEntity[] {
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

/**
 * Extract entities from text using the best available method.
 * 
 * When NER is enabled: runs BERT-NER + regex, merges results.
 * NER entities take precedence for duplicate names (better type info).
 * 
 * When NER is disabled: falls back to regex-only (original behavior).
 */
export async function extractEntitiesAsync(text: string): Promise<ExtractedEntity[]> {
  const regexEntities = extractEntitiesRegex(text);

  if (!_nerEnabled || !_nerService) {
    return regexEntities;
  }

  try {
    const nerEntities = await _nerService.extractEntities(text);

    // Merge: NER entities take priority for same name
    const merged = new Map<string, ExtractedEntity>();

    // Add regex entities first
    for (const entity of regexEntities) {
      const key = entity.name.toLowerCase().replace(/\s+/g, ' ');
      merged.set(key, entity);
    }

    // NER entities override regex (better type classification)
    for (const entity of nerEntities) {
      const key = entity.name.toLowerCase().replace(/\s+/g, ' ');
      merged.set(key, entity);
    }

    return Array.from(merged.values()).slice(0, 50);
  } catch {
    // If NER fails, gracefully fall back to regex-only
    return regexEntities;
  }
}

/**
 * Synchronous entity extraction (regex-only).
 * Backwards compatible — this is the original function signature.
 */
export function extractEntities(text: string): ExtractedEntity[] {
  return extractEntitiesRegex(text);
}
