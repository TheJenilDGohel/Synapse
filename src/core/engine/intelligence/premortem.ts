import type { IPreMortemEngine, ArchitecturalProposal, PreMortemReport, FailureMode, IMemoryService, IImmuneSystem } from '../../interfaces/services.js';
import { randomUUID } from 'crypto';

export class PreMortemEngine implements IPreMortemEngine {
  constructor(
    private memory: IMemoryService,
    private immuneSystem: IImmuneSystem,
    private db: any
  ) {}

  async analyze(proposal: ArchitecturalProposal): Promise<PreMortemReport> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter) throw new Error('Database adapter unavailable');

    const failureModes: FailureMode[] = [];

    // Source 1: KG History
    try {
      const kgResults = await this.memory.searchTriples({
        query: [...proposal.technologies, proposal.pattern].join(' '),
        limit: 10
      });
      if (kgResults?.items) {
        for (const item of kgResults.items) {
          if (item.predicate === 'caused' || item.predicate === 'replaced') {
            failureModes.push({
              title: `Historical issue with ${item.subject_id}`,
              description: `Past decision related to ${item.subject_id} ${item.predicate} ${item.object_id}`,
              likelihood: 'medium',
              severity: 'medium',
              source: 'your_history',
              sourceDetail: `You encountered this regarding ${item.subject_id}`,
              mitigation: 'Review past architecture decisions and adjust.'
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // Source 2: Pattern Library
    const placeholders = proposal.technologies.map(() => '?').join(',');
    const libraryMatches = await dbAdapter.all(`
      SELECT * FROM failure_pattern_library 
      WHERE technology IN (${placeholders}) OR pattern = ?
      ORDER BY severity DESC, likelihood DESC
      LIMIT 15
    `, [...proposal.technologies, proposal.pattern]);

    for (const match of libraryMatches) {
      failureModes.push({
        title: match.title,
        description: match.description,
        likelihood: match.likelihood as any,
        severity: match.severity as any,
        source: 'pattern_library',
        sourceDetail: match.source_url || 'Built-in pattern library',
        mitigation: match.mitigation
      });
    }

    // Source 3: Immune System Cross-reference
    const immuneMatches = await this.immuneSystem.scanForPatterns(
      proposal.description + ' ' + (proposal.context || ''),
      'text',
      'premortem'
    );
    for (const match of immuneMatches) {
      failureModes.push({
        title: match.title,
        description: match.message,
        likelihood: 'high',
        severity: match.severity === 'critical' ? 'catastrophic' : match.severity as any,
        source: 'your_history',
        sourceDetail: match.originalContext,
        mitigation: match.resolution
      });
    }

    // Sort and Cap
    const severityScore = { 'low': 1, 'medium': 2, 'high': 3, 'catastrophic': 4 } as Record<string, number>;
    const likelihoodScore = { 'low': 1, 'medium': 2, 'high': 3 } as Record<string, number>;
    
    failureModes.sort((a, b) => {
      const scoreA = (severityScore[a.severity] || 0) * (likelihoodScore[a.likelihood] || 0);
      const scoreB = (severityScore[b.severity] || 0) * (likelihoodScore[b.likelihood] || 0);
      return scoreB - scoreA;
    });

    const finalModes = failureModes.slice(0, 8);
    let recommendation: 'proceed' | 'proceed_with_caution' | 'reconsider' = 'proceed';
    let rationale = 'No significant historical or pattern-based risks found.';

    const hasCatastrophic = finalModes.some(m => m.severity === 'catastrophic');
    const highCount = finalModes.filter(m => m.severity === 'high').length;

    if (hasCatastrophic || highCount >= 3) {
      recommendation = 'reconsider';
      rationale = 'High risk of failure based on historical precedents and known failure patterns.';
    } else if (highCount > 0 || finalModes.some(m => m.severity === 'medium')) {
      recommendation = 'proceed_with_caution';
      rationale = 'Some risks identified. Review mitigations carefully before proceeding.';
    }

    const reportId = `pm_${randomUUID().replace(/-/g, '')}`;
    const report: PreMortemReport = {
      proposal,
      failureModes: finalModes,
      historicalPrecedents: [],
      recommendation,
      recommendationRationale: rationale,
      generatedAt: new Date()
    };

    await dbAdapter.run(`
      INSERT INTO premortem_reports (id, proposal_json, report_json, created_at)
      VALUES (?, ?, ?, ?)
    `, [reportId, JSON.stringify(proposal), JSON.stringify(report), Date.now()]);

    return report;
  }

  async getPatternLibrary(pattern: string): Promise<FailureMode[]> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter) return [];

    const rows = await dbAdapter.all(`
      SELECT * FROM failure_pattern_library WHERE pattern = ? OR technology = ?
    `, [pattern, pattern]);

    return rows.map((r: any) => ({
      title: r.title,
      description: r.description,
      likelihood: r.likelihood as any,
      severity: r.severity as any,
      source: 'pattern_library',
      sourceDetail: r.source_url || '',
      mitigation: r.mitigation
    }));
  }

  async addToPatternLibrary(failure: Omit<FailureMode, 'source'> & { technology: string }): Promise<void> {
    const memoryAny = this.memory as any;
    const dbAdapter = memoryAny.store?.adapter;
    if (!dbAdapter) return;

    await dbAdapter.run(`
      INSERT INTO failure_pattern_library (
        id, technology, pattern, title, description, likelihood, severity, mitigation, source_url, created_at, is_builtin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      `fpl_${randomUUID().replace(/-/g, '')}`,
      failure.technology,
      '', // pattern
      failure.title,
      failure.description,
      failure.likelihood,
      failure.severity,
      failure.mitigation,
      failure.sourceDetail,
      Date.now()
    ]);
  }
}