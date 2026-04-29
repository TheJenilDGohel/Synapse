#!/usr/bin/env node

import { DatabaseSync } from 'node:sqlite';
import * as sqliteVec from 'sqlite-vec';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

/**
 * Benchmark 10M vector scale for Synapse.
 * Generates synthetic vectors to test retrieval performance at scale.
 */

const DIMENSIONS = 384;
const BATCH_SIZE = 10000;
const TARGET_COUNT = process.env.TARGET_COUNT ? parseInt(process.env.TARGET_COUNT) : 100000; // Default 100k for faster test, set to 10M for full test

async function main() {
  const dbPath = path.join(process.cwd(), 'benchmark-10m.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new DatabaseSync(dbPath, { allowExtension: true });
  db.loadExtension(sqliteVec.getLoadablePath());

  console.log(`Starting benchmark with ${TARGET_COUNT} vectors...`);
  
  // Setup tables
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA synchronous=NORMAL');
  db.exec('CREATE TABLE chunks(id INTEGER PRIMARY KEY, file_path TEXT, start_line INTEGER, end_line INTEGER, preview TEXT)');
  db.exec(`CREATE VIRTUAL TABLE vec_chunks USING vec1(chunk_rowid integer primary key, embedding float[${DIMENSIONS}])`);
  db.exec('CREATE INDEX IF NOT EXISTS vec_chunks_embedding_idx ON vec_chunks(embedding) USING ivf8');

  const stmtInsertChunk = db.prepare('INSERT INTO chunks(file_path, start_line, end_line, preview) VALUES (?, ?, ?, ?)');
  const stmtInsertVec = db.prepare('INSERT INTO vec_chunks(chunk_rowid, embedding) VALUES (?, ?)');

  let inserted = 0;
  const startAt = performance.now();

  while (inserted < TARGET_COUNT) {
    db.exec('BEGIN TRANSACTION');
    for (let i = 0; i < BATCH_SIZE && inserted < TARGET_COUNT; i++) {
      inserted++;
      const rowid = inserted;
      stmtInsertChunk.run('synthetic_file.ts', rowid, rowid + 1, 'synthetic preview');
      
      // Generate random unit vector
      const vec = new Float32Array(DIMENSIONS);
      for (let j = 0; j < DIMENSIONS; j++) vec[j] = Math.random();
      // Use BigInt to ensure node:sqlite passes it as an integer to the extension
      stmtInsertVec.run(BigInt(rowid), JSON.stringify(Array.from(vec)));
    }
    db.exec('COMMIT');
    if (inserted % 50000 === 0) {
      console.log(`Inserted ${inserted}/${TARGET_COUNT}...`);
    }
  }

  const indexingTime = performance.now() - startAt;
  console.log(`Indexed ${TARGET_COUNT} vectors in ${(indexingTime / 1000).toFixed(2)}s`);

  // Run search benchmark
  const queryVec = new Float32Array(DIMENSIONS);
  for (let j = 0; j < DIMENSIONS; j++) queryVec[j] = Math.random();
  const queryJson = JSON.stringify(Array.from(queryVec));

  console.log('Running search benchmark (k=100)...');
  const searchStart = performance.now();
  const repeats = 10;
  for (let i = 0; i < repeats; i++) {
    db.prepare(`
      SELECT v.chunk_rowid, v.distance
      FROM vec_chunks v
      WHERE v.embedding MATCH ? AND k = 100 AND probes = 10
      ORDER BY v.distance ASC
    `).all(queryJson);
  }
  const searchTime = (performance.now() - searchStart) / repeats;
  console.log(`Average search time: ${searchTime.toFixed(2)}ms`);

  db.close();
  // fs.unlinkSync(dbPath);
}

main().catch(console.error);
