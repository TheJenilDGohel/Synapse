import { Database } from 'sqlite-vec';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// Seed patterns
const patterns = [
  {
    technology: 'redis',
    pattern: 'caching',
    title: 'Cache stampede on cold start',
    description: 'When cache is empty or expires, many concurrent requests hit the database simultaneously.',
    likelihood: 'high',
    severity: 'high',
    mitigation: 'Implement a locking mechanism or probabilistic early expiration (XFetch) to ensure only one process recalculates the cache.',
    source_url: 'https://en.wikipedia.org/wiki/Cache_stampede'
  },
  {
    technology: 'redis',
    pattern: 'caching',
    title: 'Stale cache on write-through failure',
    description: 'Database is updated but cache update fails, leading to persistent stale reads.',
    likelihood: 'medium',
    severity: 'high',
    mitigation: 'Use cache-aside with short TTLs or a robust CDC (Change Data Capture) pipeline.',
    source_url: ''
  },
  {
    technology: 'postgresql',
    pattern: 'orm',
    title: 'N+1 query under ORM abstraction',
    description: 'Loading a collection of items and their relations results in 1 query for the items + N queries for relations.',
    likelihood: 'high',
    severity: 'medium',
    mitigation: 'Use eager loading (e.g. JOINs or IN clauses) explicitly instead of lazy loading relationships.',
    source_url: ''
  },
  {
    technology: 'node',
    pattern: 'async',
    title: 'Race condition on shared mutable state',
    description: 'Multiple asynchronous operations modify a shared variable unpredictably.',
    likelihood: 'medium',
    severity: 'high',
    mitigation: 'Avoid shared mutable state in async workflows. Use pure functions or transactional state updates.',
    source_url: ''
  },
  {
    technology: 'node',
    pattern: 'async',
    title: 'Unhandled Promise rejection silently swallowed',
    description: 'A rejected promise lacks a .catch() handler, causing silent failures or process crashes.',
    likelihood: 'high',
    severity: 'medium',
    mitigation: 'Ensure all promises have error handling or use global unhandledRejection listeners.',
    source_url: ''
  },
  {
    technology: 'jwt',
    pattern: 'authentication',
    title: 'JWT without rotation strategy',
    description: 'Long-lived JWTs cannot be revoked effectively if compromised.',
    likelihood: 'medium',
    severity: 'high',
    mitigation: 'Use short-lived access tokens with rotating refresh tokens stored securely.',
    source_url: ''
  }
];

export async function seedFailurePatterns(dbPath: string) {
  // In a real execution, we'd import the sqlite bindings. 
  // For this script, we assume the DB schema is already migrated.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);

  const stmt = db.prepare(`
    INSERT INTO failure_pattern_library (
      id, technology, pattern, title, description, likelihood, severity, mitigation, source_url, created_at, is_builtin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  let count = 0;
  for (const p of patterns) {
    const exists = db.prepare('SELECT 1 FROM failure_pattern_library WHERE title = ?').get(p.title);
    if (!exists) {
      stmt.run(
        `fpl_${randomUUID().replace(/-/g, '')}`,
        p.technology,
        p.pattern,
        p.title,
        p.description,
        p.likelihood,
        p.severity,
        p.mitigation,
        p.source_url,
        Date.now()
      );
      count++;
    }
  }
  
  console.log(`Seeded ${count} built-in failure patterns.`);
  db.close();
}

const dbPath = process.env.SYNAPSE_DB_PATH;
if (dbPath && require.main === module) {
  seedFailurePatterns(dbPath).catch(console.error);
}
