import type { IImmuneSystem, MistakePattern, MistakeCategory, ImmuneWarning, IMemoryService } from '../../interfaces/services.js';
import { randomUUID } from 'crypto';

export class ImmuneSystemEngine implements IImmuneSystem {
  constructor(
    private memory: IMemoryService,
    private db: any
  ) {}

  async recordMistake(pattern: Omit<MistakePattern, 'id' | 'firstEncountered' | 'timesTriggered'>): Promise<string> {
    const id = `ptn_${randomUUID().replace(/-/g, '')}`;
    const now = Date.now();
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    
    if (dbAdapter) {
      await dbAdapter.run(`
        INSERT INTO mistake_patterns (
          id, category, title, description, code_signature, languages, triggered_by, resolution, first_encountered, times_triggered, source_file, severity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `, [
        id,
        pattern.category,
        pattern.title,
        pattern.description,
        pattern.codeSignature,
        JSON.stringify(pattern.languages || []),
        JSON.stringify(pattern.triggeredBy || []),
        pattern.resolution,
        now,
        pattern.sourceFile || null,
        pattern.severity
      ]);

      await dbAdapter.run(`
        INSERT INTO mistake_patterns_fts (rowid, title, description, code_signature, resolution)
        VALUES (last_insert_rowid(), ?, ?, ?, ?)
      `, [pattern.title, pattern.description, pattern.codeSignature, pattern.resolution]);
    }
    return id;
  }

  async scanForPatterns(code: string, language: string, filePath: string): Promise<ImmuneWarning[]> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter) return [];

    const warnings: ImmuneWarning[] = [];
    
    const results = await dbAdapter.all(`
      SELECT p.*, bm25(mistake_patterns_fts) as score
      FROM mistake_patterns p
      JOIN mistake_patterns_fts fts ON p.rowid = fts.rowid
      WHERE fts MATCH ? AND p.dismissed = 0
      ORDER BY score LIMIT 5
    `, [code]);
    
    for (const r of results) {
      warnings.push({
        patternId: r.id,
        title: r.title,
        severity: r.severity as any,
        message: `This pattern matches a mistake you made: ${r.title}`,
        originalContext: r.description,
        resolution: r.resolution,
        confidence: 0.8,
        matchedIn: filePath
      });
      
      await dbAdapter.run(`
        INSERT INTO immune_warnings_log (id, pattern_id, fired_at, file_path, confidence)
        VALUES (?, ?, ?, ?, ?)
      `, [`wrn_${randomUUID().replace(/-/g, '')}`, r.id, Date.now(), filePath, 0.8]);
      
      await dbAdapter.run(`
        UPDATE mistake_patterns SET times_triggered = times_triggered + 1 WHERE id = ?
      `, [r.id]);
    }

    return warnings;
  }

  async listPatterns(category?: MistakeCategory): Promise<MistakePattern[]> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter) return [];

    if (category) {
      const rows = await dbAdapter.all('SELECT * FROM mistake_patterns WHERE category = ?', [category]);
      return rows.map((r: any) => this.mapRow(r));
    } else {
      const rows = await dbAdapter.all('SELECT * FROM mistake_patterns');
      return rows.map((r: any) => this.mapRow(r));
    }
  }

  async dismissWarning(patternId: string, reason: string): Promise<void> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter) return;
    await dbAdapter.run('UPDATE mistake_patterns SET dismissed = 1, dismissed_reason = ? WHERE id = ?', [reason, patternId]);
  }

  async getMistakeHistory(): Promise<{ pattern: MistakePattern; triggeredCount: number }[]> {
    const patterns = await this.listPatterns();
    return patterns.map(p => ({ pattern: p, triggeredCount: p.timesTriggered })).sort((a, b) => b.triggeredCount - a.triggeredCount);
  }

  private mapRow(r: any): MistakePattern {
    return {
      id: r.id,
      category: r.category as MistakeCategory,
      title: r.title,
      description: r.description,
      codeSignature: r.code_signature,
      languages: JSON.parse(r.languages),
      triggeredBy: JSON.parse(r.triggered_by),
      resolution: r.resolution,
      firstEncountered: new Date(r.first_encountered),
      timesTriggered: r.times_triggered,
      sourceFile: r.source_file,
      severity: r.severity
    };
  }
}