import { IDurableStore } from '../../../interfaces/services.js';
import type { Adapter, StoreEntryInput, UpdateEntryPatch, ListEntriesOpts } from '../types/index.js';
import {
  listEntries as listMemoryEntries,
  getEntry as getMemoryEntry,
  storeEntry as storeMemoryEntry,
  updateEntry as updateMemoryEntry,
  deleteEntry as deleteMemoryEntry
} from './entries.js';
import { storeEntryBatch as storeEntryBatchFn, deleteEntryBatch as deleteEntryBatchFn } from './entries-batch.js';
import { MemoryHooks } from '../events/hooks.js';

export class DurableStore implements IDurableStore {
  public hooks: MemoryHooks;

  constructor(private adapter: Adapter) {
    this.hooks = new MemoryHooks();
  }

  async listEntries(args: ListEntriesOpts) {
    return listMemoryEntries(this as any, args);
  }

  async getEntry(id: string) {
    return getMemoryEntry(this as any, id);
  }

  async storeEntry(input: StoreEntryInput) {
    const hookResult = await this.hooks.emit('before:store', input);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await storeMemoryEntry(this as any, hookResult.payload as StoreEntryInput);
    await this.hooks.emit('after:store', result);
    return result;
  }

  async storeEntryBatch(input: any) {
    const hookResult = await this.hooks.emit('before:store:batch', input);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await storeEntryBatchFn(this as any, hookResult.payload as any);
    await this.hooks.emit('after:store:batch', result);
    return result;
  }

  async updateEntry(id: string, patch: UpdateEntryPatch = {}) {
    const hookResult = await this.hooks.emit('before:update', { id, patch });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { id: string; patch: UpdateEntryPatch };
    const result = await updateMemoryEntry(this as any, payload.id, payload.patch);
    await this.hooks.emit('after:update', result);
    return result;
  }

  async deleteEntry(id: string) {
    const hookResult = await this.hooks.emit('before:delete', { id });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { id: string };
    const result = await deleteMemoryEntry(this as any, payload.id);
    await this.hooks.emit('after:delete', result);
    return result;
  }

  async deleteEntryBatch(input: any) {
    const hookResult = await this.hooks.emit('before:delete:batch', input);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await deleteEntryBatchFn(this as any, hookResult.payload as any);
    await this.hooks.emit('after:delete:batch', result);
    return result;
  }
}
