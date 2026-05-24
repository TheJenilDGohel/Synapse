/**
 * Enrichment Model - Prompts and data structures for code enrichment.
 */

export interface EnrichmentMetadata {
  intent: string;
  tags: string[];
  dependencies: string[];
  facts: string[];
}

export const ENRICHMENT_PROMPT = `
Analyze the following code chunk and provide enrichment metadata in JSON format.
Focus on:
1. Intent: What is this code trying to achieve? (1-2 sentences)
2. Tags: Conceptual categories (e.g., "authentication", "retry-logic", "ui-component").
3. Dependencies: Key libraries or modules imported/used.
4. Facts: Hard facts like specific error codes, table names, or API endpoints.

Response Format:
{
  "intent": "...",
  "tags": ["...", "..."],
  "dependencies": ["...", "..."],
  "facts": ["...", "..."]
}

Code:
\`\`\`
{{code}}
\`\`\`
`;

export const KG_EXTRACTION_PROMPT = `
Extract entities and relationships from this statement for a technical knowledge graph.
Statement: "{{statement}}"

Return JSON only:
{
  "entities": [{"name": "...", "type": "service|project|team|technology|decision"}],
  "relationships": [{"from": "...", "relation": "depends_on|owns|uses|decided", "to": "..."}],
  "confidence": 0.0-1.0,
  "is_hypothetical": true/false,
  "is_negation": true/false
}

If confidence < 0.7 or is_hypothetical or is_negation: return empty arrays.
`;

export function buildEnrichmentPrompt(code: string): string {
  return ENRICHMENT_PROMPT.replace('{{code}}', code);
}

export function buildKgExtractionPrompt(statement: string): string {
  return KG_EXTRACTION_PROMPT.replace('{{statement}}', statement);
}

export interface ExtractedGraphData {
  entities: Array<{ name: string; type: string }>;
  relationships: Array<{ from: string; relation: string; to: string }>;
  confidence: number;
  is_hypothetical: boolean;
  is_negation: boolean;
}

export function parseKgExtractionResponse(response: string): ExtractedGraphData {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in LLM response');
    const data = JSON.parse(jsonMatch[0]);
    return {
      entities: Array.isArray(data.entities) ? data.entities : [],
      relationships: Array.isArray(data.relationships) ? data.relationships : [],
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      is_hypothetical: !!data.is_hypothetical,
      is_negation: !!data.is_negation
    };
  } catch (error) {
    return { entities: [], relationships: [], confidence: 0, is_hypothetical: false, is_negation: false };
  }
}

export function parseEnrichmentResponse(response: string): EnrichmentMetadata {
  try {
    // Extract JSON from response (handles potential LLM conversational noise)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }
    const data = JSON.parse(jsonMatch[0]);
    return {
      intent: data.intent || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
      facts: Array.isArray(data.facts) ? data.facts : []
    };
  } catch (error) {
    console.error('[enrichment-model] failed to parse response:', error);
    return {
      intent: 'Analysis failed',
      tags: [],
      dependencies: [],
      facts: []
    };
  }
}

/**
 * Service to manage enrichment models and their configuration.
 */
export class EnrichmentModelService {
  private _modelId: string;
  private _cacheDir: string;

  constructor(modelId?: string, cacheDir?: string) {
    this._modelId = modelId || 'Qwen/Qwen2.5-Coder-1.5B-Instruct';
    this._cacheDir = cacheDir || '';
  }

  getModelId(): string {
    return this._modelId;
  }

  getCacheDir(): string {
    return this._cacheDir;
  }

  setModelId(modelId: string): void {
    this._modelId = modelId;
  }

  setCacheDir(cacheDir: string): void {
    this._cacheDir = cacheDir;
  }
}

