import test from 'node:test';
import assert from 'node:assert/strict';

test('create-services module imports successfully', async () => {
  const mod = await import('../src/app/create-services.js');
  assert.equal(typeof mod.createServices, 'function');
});

test('register-tools module imports successfully', async () => {
  const mod = await import('../src/app/register-tools.js');
  assert.equal(typeof mod.registerAppTools, 'function');
});
