import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryWorkflowService } from '../src/services/memory/index.js';

function createMemoryStub({
  status = {
    enabled: true,
    auto_capture: false,
    consent_done: true,
    backend: {
      available: true,
      requested: 'auto',
      selected: 'node-sqlite'
    },
    store: {
      total_entries: 3,
      total_events: 7
    }
  },
  recallResult = {
    query: 'auth refresh',
    count: 1,
    items: [{ score: 0.9, raw_score: 4.2, memory: { id: 'mem_1' } }]
  },
  captureResult = {
    event_id: 1,
    status: 'promoted',
    promoted_memory_id: 'mem_2'
  }
} = {}) {
  return {
    getStatus: async () => status,
    recall: async (input) => ({ ...recallResult, query: input.query }),
    captureEvent: async (input) => ({ ...captureResult, event_type: input.event_type })
  };
}

test('getTaskContext recalls memory when enabled and query is present', async () => {
  const service = new MemoryWorkflowService({
    memory: createMemoryStub(),
    getRuntimeSummary: async () => ({ name: 'synapse', version: 'test' })
  });

  const out = await service.getTaskContext({
    task: 'Fix auth refresh race',
    project_path: '/repo/app',
    topic: 'auth'
  });

  assert.equal(out.query, 'Fix auth refresh race');
  assert.equal(out.recall.attempted, true);
  assert.equal(out.recall.count, 1);
  assert.equal(out.memory.backend_available, true);
  assert.equal(out.runtime.name, 'synapse');
});

test('getTaskContext skips recall cleanly when memory is disabled', async () => {
  const service = new MemoryWorkflowService({
    memory: createMemoryStub({
      status: {
        enabled: false,
        auto_capture: false,
        consent_done: false,
        backend: { available: false, requested: 'auto', selected: null },
        store: { total_entries: 0, total_events: 0 }
      }
    })
  });

  const out = await service.getTaskContext({
    task: 'Inspect project architecture'
  });

  assert.equal(out.recall.attempted, false);
  assert.equal(out.recall.skipped_reason, 'memory_disabled');
  assert.match(out.guidance[0], /Memory is disabled or unavailable/);
});

test('captureOutcome maps simple task payload into captureEvent input', async () => {
  let received = null;
  const memory = createMemoryStub();
  memory.captureEvent = async (input) => {
    received = input;
    return {
      event_id: 2,
      status: 'promoted',
      promoted_memory_id: 'mem_3',
      event_type: input.event_type
    };
  };

  const service = new MemoryWorkflowService({ memory });
  const out = await service.captureOutcome({
    task: 'Fix auth refresh race',
    summary: 'Serialize concurrent refresh requests.',
    details: 'Queue refreshes and retry original request once.',
    event_type: 'bugfix',
    project_path: '/repo/app',
    topic: 'auth',
    files_changed: 2,
    has_tests: true
  });

  assert.equal(out.captured, true);
  assert.equal(received.event_type, 'bugfix');
  assert.equal(received.status, 'resolved');
  assert.equal(received.title, 'Fix auth refresh race');
  assert.deepEqual(received.scope, {
    root_path: undefined,
    project_path: '/repo/app',
    branch_name: undefined,
    topic: 'auth',
    feature: undefined
  });
  assert.deepEqual(received.tags, ['auth']);
});

test('captureOutcome skips cleanly when backend is unavailable', async () => {
  const service = new MemoryWorkflowService({
    memory: createMemoryStub({
      status: {
        enabled: true,
        auto_capture: false,
        consent_done: true,
        backend: {
          available: false,
          requested: 'auto',
          selected: null
        },
        store: {
          total_entries: 0,
          total_events: 0
        }
      }
    })
  });

  const out = await service.captureOutcome({
    task: 'Remember preferred release flow'
  });

  assert.equal(out.captured, false);
  assert.equal(out.skipped_reason, 'backend_unavailable');
});
