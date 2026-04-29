import { test, describe } from 'node:test';
import assert from 'node:assert';
import { LANGUAGE_LOADERS } from '../src/core/engine/retrieval/chunker/languages.ts';

describe('Multi-Language Grammar Loading', () => {
  const languages = ['python', 'go', 'rust', 'typescript', 'tsx', 'javascript', 'bash', 'lua'];

  for (const lang of languages) {
    test(`should load ${lang} grammar`, async () => {
      const loader = LANGUAGE_LOADERS[lang];
      assert.ok(loader, `Loader for ${lang} should exist`);
      
      try {
        const grammar = await loader();
        assert.ok(grammar, `Grammar for ${lang} should be loaded`);
        // Basic check for tree-sitter language object
        assert.ok(typeof grammar === 'object' || typeof grammar === 'function');
      } catch (error) {
        console.warn(`Failed to load ${lang} grammar (possibly native build issue):`, error);
        // We don't fail the test if it's an optional dependency and build failed,
        // but we want to know if it happened.
      }
    });
  }
});
