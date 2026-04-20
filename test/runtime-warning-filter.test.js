import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSuppressRuntimeWarning } from '../src/runtime/warning-filter.js';

test('suppresses only sqlite experimental warning', () => {
  assert.equal(
    shouldSuppressRuntimeWarning('SQLite is an experimental feature and might change at any time', ['ExperimentalWarning']),
    true
  );
  assert.equal(
    shouldSuppressRuntimeWarning('Some other warning', ['ExperimentalWarning']),
    false
  );
  assert.equal(
    shouldSuppressRuntimeWarning('SQLite is an experimental feature and might change at any time', ['DeprecationWarning']),
    false
  );
});
