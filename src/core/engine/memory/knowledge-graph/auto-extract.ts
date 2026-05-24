import type { EnrichmentService } from '../../enrichment/service.js';
import { addEntity, addTriple } from './kg.js';
import type { Adapter } from '../types/index.js';
import type { ExtractedGraphData } from '../../enrichment/model.js';

/**
 * Automatically extract Knowledge Graph nodes and relationships from 
 * a memory entry using on-device inference (Phase 3).
 */
export async function autoExtract(
  adapter: Adapter,
  enrichmentService: EnrichmentService | null,
  memoryId: string,
  content: string
): Promise<void> {
  if (!enrichmentService || !memoryId || !content) return;

  try {
    const data: ExtractedGraphData = await enrichmentService.extractGraph(memoryId, content);

    if (!data || data.confidence < 0.7 || data.is_hypothetical || data.is_negation) {
      return;
    }

    // 1. Add Entities
    if (Array.isArray(data.entities)) {
      for (const entity of data.entities) {
        try {
          await addEntity(adapter, {
            name: entity.name,
            type: entity.type as any,
            memoryId
          });
        } catch { /* skip individual errors */ }
      }
    }

    // 2. Add Triples
    if (Array.isArray(data.relationships)) {
      for (const rel of data.relationships) {
        try {
          await addTriple(adapter, {
            subjectName: rel.from,
            predicate: rel.relation,
            objectName: rel.to,
            sourceMemoryId: memoryId,
            sourceType: 'auto_extraction',
            confidence: data.confidence
          });
        } catch { /* skip individual errors */ }
      }
    }
  } catch (error: any) {
    // Non-blocking: extraction failure does not break memory storage
    // console.warn(`[synapse:kg-auto-extract] extraction failed for memory ${memoryId}:`, error?.message || error);
  }
}
