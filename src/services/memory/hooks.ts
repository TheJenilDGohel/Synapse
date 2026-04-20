import type { HookListener, HookEmitResult, HookStats, HookHandle, HookContext } from './types.js';

const VALID_EVENTS = new Set([
  // Memory entry lifecycle
  'before:store', 'after:store',
  'before:update', 'after:update',
  'before:delete', 'after:delete',
  'before:recall', 'after:recall',

  // Knowledge graph
  'before:kg:addEntity', 'after:kg:addEntity',
  'before:kg:addTriple', 'after:kg:addTriple',
  'before:kg:invalidate', 'after:kg:invalidate',

  // Graph traversal
  'before:graph:traverse', 'after:graph:traverse',
  'before:graph:bridges', 'after:graph:bridges',

  // Agent diary
  'before:diary:write', 'after:diary:write',

  // Ingestion
  'before:ingest', 'after:ingest',

  // File proactive hooks
  'after:file:read', 'after:file:changed',

  // Teach
  'after:teach',

  // Dedup
  'before:dedup', 'after:dedup',

  // Taxonomy
  'before:nest:list', 'after:nest:list',

  // Catch-all
  'before:*', 'after:*',
  'error'
]);

export class MemoryHooks {
  private _listeners: Map<string, HookListener[]>;
  private _enabled: boolean;

  constructor() {
    this._listeners = new Map();
    this._enabled = true;
  }

  on(event: string, fn: HookListener): HookHandle {
    if (typeof fn !== 'function') throw new Error('Hook listener must be a function');
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(fn);
    return {
      remove: () => {
        const arr = this._listeners.get(event);
        if (arr) {
          const idx = arr.indexOf(fn);
          if (idx !== -1) arr.splice(idx, 1);
        }
      }
    };
  }

  once(event: string, fn: HookListener): HookHandle {
    const handle = this.on(event, async (...args: Parameters<HookListener>) => {
      handle.remove();
      return fn(...args);
    });
    return handle;
  }

  async emit(event: string, payload: unknown, context: Record<string, unknown> = {}): Promise<HookEmitResult> {
    if (!this._enabled) return { cancelled: false, payload };

    const listeners: HookListener[] = [
      ...(this._listeners.get(event) || []),
      ...(event.startsWith('before:') ? (this._listeners.get('before:*') || []) : []),
      ...(event.startsWith('after:') ? (this._listeners.get('after:*') || []) : [])
    ];

    let currentPayload = payload;
    for (const fn of listeners) {
      try {
        const result = await fn(currentPayload, { event, ...context } as HookContext);
        if (result && typeof result === 'object') {
          if (result.cancel === true) {
            return { cancelled: true, payload: currentPayload, reason: result.reason || 'cancelled by hook' };
          }
          if (result.payload !== undefined) {
            currentPayload = result.payload;
          }
        }
      } catch (err) {
        await this._emitError(event, err, currentPayload);
      }
    }

    return { cancelled: false, payload: currentPayload };
  }

  private async _emitError(sourceEvent: string, error: unknown, payload: unknown): Promise<void> {
    const errorListeners = this._listeners.get('error') || [];
    for (const fn of errorListeners) {
      try {
        await fn({ sourceEvent, error, payload });
      } catch {
        // Swallow errors in error handlers to prevent infinite loops
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this._enabled = Boolean(enabled);
  }

  getStats(): HookStats {
    const stats: Record<string, number> = {};
    for (const [event, listeners] of this._listeners) {
      if (listeners.length > 0) {
        stats[event] = listeners.length;
      }
    }
    return {
      enabled: this._enabled,
      total_listeners: Array.from(this._listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
      events: stats
    };
  }

  removeAll(event?: string): void {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  static validEvents(): string[] {
    return [...VALID_EVENTS];
  }
}
