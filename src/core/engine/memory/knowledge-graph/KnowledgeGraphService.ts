import { IKnowledgeGraphService } from '../../../interfaces/services.js';
import type { Adapter } from '../types/index.js';
import {
  addEntity as addEntityFn,
  getEntity as getEntityFn,
  addTriple as addTripleFn,
  invalidateTriple as invalidateTripleFn,
  queryEntityRelationships as queryEntityRelationshipsFn,
  listEntities as listEntitiesFn,
  queryTriplesAsOf as queryTriplesAsOfFn,
  getEntityTimeline as getEntityTimelineFn,
  getKgStats as getKgStatsFn,
  deleteEntity as deleteEntityFn
} from './kg.js';
import {
  addEntityBatch as addEntityBatchFn,
  addTripleBatch as addTripleBatchFn,
  deleteEntityBatch as deleteEntityBatchFn,
  deleteTripleBatch as deleteTripleBatchFn
} from './kg-batch.js';
import { traverseGraph as traverseGraphFn, discoverBridges as discoverBridgesFn } from './graph.js';
import { backfillMemoryKgLinks as backfillMemoryKgLinksFn } from './auto-link.js';
import { searchTriples as searchTriplesFn } from './kg-search.js';

export class KnowledgeGraphService implements IKnowledgeGraphService {
  constructor(private adapter: Adapter) {}

  async addEntity(args: any) {
    return addEntityFn(this.adapter, args);
  }

  async getEntity(entityId: string) {
    return getEntityFn(this.adapter, entityId);
  }

  async addTriple(args: any) {
    return addTripleFn(this.adapter, args);
  }

  async invalidateTriple(tripleId: string, validTo?: string | null) {
    return invalidateTripleFn(this.adapter, tripleId, validTo || undefined);
  }

  async queryEntityRelationships(entityId: string, opts: any) {
    return queryEntityRelationshipsFn(this.adapter, entityId, opts);
  }

  async listEntities(opts: any = {}) {
    return listEntitiesFn(this.adapter, opts);
  }

  async queryTriplesAsOf(entityId: string, asOfDate: string, mode?: 'event' | 'transaction') {
    return queryTriplesAsOfFn(this.adapter, entityId, asOfDate, mode);
  }

  async getEntityTimeline(entityId: string) {
    return getEntityTimelineFn(this.adapter, entityId);
  }

  async getKgStats() {
    return getKgStatsFn(this.adapter);
  }

  async deleteEntity(entityId: string) {
    return deleteEntityFn(this.adapter, entityId);
  }

  async addEntityBatch(args: any) {
    return addEntityBatchFn(this.adapter, args);
  }

  async addTripleBatch(args: any) {
    return addTripleBatchFn(this.adapter, args);
  }

  async deleteEntityBatch(args: { entity_ids: string[] }) {
    return deleteEntityBatchFn(this.adapter, args);
  }

  async deleteTripleBatch(args: { triple_ids: string[] }) {
    return deleteTripleBatchFn(this.adapter, args);
  }

  async traverseGraph(args: any) {
    return traverseGraphFn(this.adapter, args);
  }

  async discoverBridges(args: any) {
    return discoverBridgesFn(this.adapter, args);
  }

  async backfillMemoryKgLinks(opts: any = {}) {
    return backfillMemoryKgLinksFn(this.adapter, opts);
  }

  async searchTriples(args: { query: string; limit?: number }) {
    return searchTriplesFn(this.adapter, args);
  }
}
