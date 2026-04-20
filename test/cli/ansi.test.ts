import test from 'node:test';
import assert from 'node:assert/strict';
import { c, symbol, bar, box, rule } from '../../src/cli/ansi.js';

// Helper to manipulate process state for testing
const originalIsTTY = process.stdout.isTTY;
const originalNoColor = process.env.NO_COLOR;

function setTTY(v: boolean | undefined) {
  Object.defineProperty(process.stdout, 'isTTY', {
    value: v,
    configurable: true
  });
}

function setNoColor(v: string | undefined) {
  if (v === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = v;
  }
}

test('isColorEnabled logic through c.green', () => {
  // Test TTY + NO_COLOR=undefined -> Color ON
  setTTY(true);
  setNoColor(undefined);
  assert.ok(c.green('x').includes('\x1b[32m'), 'Should have ANSI green code');

  // Test TTY + NO_COLOR=1 -> Color OFF
  setTTY(true);
  setNoColor('1');
  assert.strictEqual(c.green('x'), 'x', 'Should be plain text when NO_COLOR set');

  // Test non-TTY + NO_COLOR=undefined -> Color OFF
  setTTY(false);
  setNoColor(undefined);
  assert.strictEqual(c.green('x'), 'x', 'Should be plain text when not TTY');

  // Cleanup
  setTTY(originalIsTTY);
  setNoColor(originalNoColor);
});

test('symbol fallbacks', () => {
  // TTY
  setTTY(true);
  setNoColor(undefined);
  assert.ok(symbol.ok().includes('✓'));

  // non-TTY
  setTTY(false);
  assert.strictEqual(symbol.ok(), 'OK');
  assert.strictEqual(symbol.fail(), 'FAIL');
  assert.strictEqual(symbol.warn(), 'WARN');
  assert.strictEqual(symbol.info(), 'INFO');

  // Cleanup
  setTTY(originalIsTTY);
});

test('box fallbacks', () => {
  // TTY
  setTTY(true);
  assert.ok(box.top().includes('╔'));
  assert.ok(box.row('test').includes('║'));

  // non-TTY
  setTTY(false);
  assert.ok(box.top().startsWith('+'));
  assert.ok(box.row('test').startsWith('|'));
  assert.ok(box.divider().includes('-'));

  // Cleanup
  setTTY(originalIsTTY);
});

test('bar fallbacks', () => {
  // TTY
  setTTY(true);
  const ttyBar = bar(5, 10, 10);
  assert.ok(ttyBar.includes('█'));
  assert.ok(ttyBar.includes('5/10'));

  // non-TTY
  setTTY(false);
  const asciiBar = bar(5, 10, 10);
  assert.ok(asciiBar.includes('###'));
  assert.ok(asciiBar.includes('['));

  // Cleanup
  setTTY(originalIsTTY);
});

test('rule fallbacks', () => {
  // TTY
  setTTY(true);
  assert.ok(rule('Label').includes('─'));
  assert.ok(rule('Label').includes('Label'));

  // non-TTY
  setTTY(false);
  assert.ok(rule('Label').includes('-'));
  assert.ok(!rule('Label').includes('─'));

  // Cleanup
  setTTY(originalIsTTY);
});
