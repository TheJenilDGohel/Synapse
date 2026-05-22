import type { IPredictionEngine, SessionSignal, PredictedContext, IMemoryService } from '../../interfaces/services.js';

export class DeadReckoningEngine implements IPredictionEngine {
  constructor(
    private memory: IMemoryService,
    private db: any
  ) {}

  async predictContext(signal: SessionSignal): Promise<PredictedContext> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    let cooccurrenceScore = 0;
    let relatedFiles: string[] = [];

    if (dbAdapter && signal.currentFile) {
      const cooccurrences = await dbAdapter.all(`
        SELECT file_b, session_count, last_seen 
        FROM file_cooccurrence 
        WHERE file_a = ? 
        ORDER BY session_count DESC, last_seen DESC 
        LIMIT 5
      `, [signal.currentFile]);
      
      if (cooccurrences && cooccurrences.length > 0) {
        relatedFiles = cooccurrences.map((r: any) => r.file_b);
        cooccurrenceScore = 0.4;
      }
    }

    let memoryEntries: string[] = [];
    let kgEntities: string[] = [];
    let semanticScore = 0;
    
    if (signal.activeSymbols && signal.activeSymbols.length > 0) {
      const searchRes = await this.memory.searchTriples({ query: signal.activeSymbols.join(' '), limit: 5 });
      if (searchRes && searchRes.items) {
        kgEntities = searchRes.items.map((i: any) => i.subject_id);
        semanticScore = 0.4;
      }
    }

    const recencyScore = 0.2;
    const confidence = cooccurrenceScore + semanticScore + recencyScore;

    return {
      confidence: Math.min(confidence, 1.0),
      memoryEntries,
      kgEntities,
      relatedFiles,
      rationale: `Predicted based on ${relatedFiles.length} historical file patterns and ${kgEntities.length} semantic connections.`,
      predictedAt: new Date()
    };
  }

  async recordSessionOutcome(signal: SessionSignal, predicted: PredictedContext, actualFilesTouched: string[]): Promise<void> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter || actualFilesTouched.length === 0) return;

    const now = Date.now();
    for (let i = 0; i < actualFilesTouched.length; i++) {
      for (let j = 0; j < actualFilesTouched.length; j++) {
        if (i === j) continue;
        const fileA = actualFilesTouched[i];
        const fileB = actualFilesTouched[j];
        
        await dbAdapter.run(`
          INSERT INTO file_cooccurrence (file_a, file_b, session_count, last_seen)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(file_a, file_b) DO UPDATE SET 
            session_count = session_count + 1,
            last_seen = ?
        `, [fileA, fileB, now, now]);
      }
    }

    const sessionId = `sess_${Math.random().toString(36).slice(2, 9)}`;
    await dbAdapter.run(`
      INSERT INTO session_patterns (id, files_touched, tools_called, session_date, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `, [
      sessionId,
      JSON.stringify(actualFilesTouched),
      JSON.stringify(signal.recentTools),
      now,
      Date.now() - signal.sessionStartedAt.getTime()
    ]);
  }
}