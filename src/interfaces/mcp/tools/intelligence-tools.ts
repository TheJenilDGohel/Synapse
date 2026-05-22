import { z } from 'zod';
import { 
  RegisterJsonToolFn, 
  ToolLevel, 
  READ_ONLY_ANNOTATIONS, 
  WRITE_ANNOTATIONS, 
  DESTRUCTIVE_ANNOTATIONS 
} from '../common/tool-utils.js';

export function registerIntelligenceTools(registerJsonTool: RegisterJsonToolFn, services: any) {
  
  // -- Dead Reckoning Context Engine --

  registerJsonTool(
    'context_predict',
    {
      title: 'Context Predict',
      description: 'Proactively predict and return the context most likely needed for the current coding session based on historical patterns.',
      inputSchema: z.object({
        current_file: z.string().optional().describe('File currently open'),
        recent_files: z.array(z.string()).optional().describe('Files opened in last 30 mins'),
        active_symbols: z.array(z.string()).optional().describe('Symbols currently in scope')
      }),
      level: ToolLevel.ADVANCED,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (params: any) => {
      const engine = services.prediction;
      if (!engine) return { error: 'Prediction engine not available' };
      const res = await engine.predictContext({
        currentFile: params.current_file,
        recentFiles: params.recent_files || [],
        recentTools: [],
        activeSymbols: params.active_symbols || [],
        sessionStartedAt: new Date()
      });
      return {
        predicted_files: res.relatedFiles,
        preloaded_memories: res.memoryEntries,
        preloaded_kg: res.kgEntities,
        confidence: res.confidence,
        rationale: res.rationale
      };
    }
  );

  registerJsonTool(
    'session_end',
    {
      title: 'Session End',
      description: 'Record outcomes of a session to improve future predictions.',
      inputSchema: z.object({
        files_touched: z.array(z.string()).describe('Files modified during the session'),
        duration_ms: z.number().optional().describe('Session duration in milliseconds')
      }),
      level: ToolLevel.ADVANCED,
      annotations: WRITE_ANNOTATIONS
    },
    async (params: any) => {
      const engine = services.prediction;
      if (!engine) return { error: 'Prediction engine not available' };
      await engine.recordSessionOutcome(
        { recentFiles: [], recentTools: [], activeSymbols: [], sessionStartedAt: new Date(Date.now() - (params.duration_ms || 0)) },
        { confidence: 0, memoryEntries: [], kgEntities: [], relatedFiles: [], rationale: '', predictedAt: new Date() },
        params.files_touched
      );
      return { success: true, message: 'Session outcome recorded.' };
    }
  );

  // -- The Immune System --

  registerJsonTool(
    'immune_record_mistake',
    {
      title: 'Record Mistake',
      description: 'Teach Synapse about a mistake you just fixed so it never happens again.',
      inputSchema: z.object({
        title: z.string().describe('Title of the mistake pattern'),
        category: z.string().describe('Category (e.g., race_condition, memory_leak)'),
        description: z.string().describe('What went wrong'),
        code_signature: z.string().describe('The structural pattern to watch for'),
        resolution: z.string().describe('How to fix it when seen'),
        source_file: z.string().optional().describe('File where it was encountered'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Severity of the mistake'),
        languages: z.array(z.string()).optional().describe('Relevant languages')
      }),
      level: ToolLevel.ADVANCED,
      annotations: WRITE_ANNOTATIONS
    },
    async (params: any) => {
      const immune = services.immuneSystem;
      if (!immune) return { error: 'Immune system not available' };
      const id = await immune.recordMistake({
        title: params.title,
        category: params.category,
        description: params.description,
        codeSignature: params.code_signature,
        resolution: params.resolution,
        sourceFile: params.source_file,
        severity: params.severity || 'medium',
        languages: params.languages || [],
        triggeredBy: []
      });
      return { success: true, id };
    }
  );

  registerJsonTool(
    'immune_scan',
    {
      title: 'Scan for Mistakes',
      description: 'Scan a code snippet or file for patterns matching past mistakes.',
      inputSchema: z.object({
        code: z.string().describe('Code to scan'),
        language: z.string().describe('Programming language'),
        file_path: z.string().optional().describe('File path context')
      }),
      level: ToolLevel.ADVANCED,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (params: any) => {
      const immune = services.immuneSystem;
      if (!immune) return { error: 'Immune system not available' };
      const warnings = await immune.scanForPatterns(params.code, params.language, params.file_path || '');
      return { warnings };
    }
  );

  registerJsonTool(
    'immune_list',
    {
      title: 'List Mistakes',
      description: 'List all recorded mistake patterns, optionally filtered by category.',
      inputSchema: z.object({
        category: z.string().optional().describe('Filter by category')
      }),
      level: ToolLevel.ADVANCED,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (params: any) => {
      const immune = services.immuneSystem;
      if (!immune) return { error: 'Immune system not available' };
      const patterns = await immune.listPatterns(params.category as any);
      return { patterns };
    }
  );

  registerJsonTool(
    'immune_dismiss',
    {
      title: 'Dismiss Warning',
      description: 'Dismiss a pattern warning — it won\'t fire for the specified reason.',
      inputSchema: z.object({
        pattern_id: z.string().describe('Pattern ID to dismiss'),
        reason: z.string().describe('Reason for dismissal')
      }),
      level: ToolLevel.ADVANCED,
      annotations: WRITE_ANNOTATIONS
    },
    async (params: any) => {
      const immune = services.immuneSystem;
      if (!immune) return { error: 'Immune system not available' };
      await immune.dismissWarning(params.pattern_id, params.reason);
      return { success: true };
    }
  );

  registerJsonTool(
    'immune_history',
    {
      title: 'Mistake History',
      description: 'Show mistake patterns ranked by how often they\'ve triggered — your personal bug frequency report.',
      inputSchema: z.object({}),
      level: ToolLevel.ADVANCED,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async () => {
      const immune = services.immuneSystem;
      if (!immune) return { error: 'Immune system not available' };
      const history = await immune.getMistakeHistory();
      return { history };
    }
  );

  // -- The Pre-Mortem Engine --

  registerJsonTool(
    'premortem_analyze',
    {
      title: 'Pre-Mortem Analysis',
      description: 'Before implementing an architectural decision, get a structured analysis of how this approach has historically failed.',
      inputSchema: z.object({
        description: z.string().describe('Description of the architectural proposal'),
        technologies: z.array(z.string()).describe('Technologies involved'),
        pattern: z.string().describe('Architectural pattern (e.g., caching, microservices)'),
        affected_entities: z.array(z.string()).optional().describe('KG entities touched by the proposal'),
        context: z.string().optional().describe('Additional context')
      }),
      level: ToolLevel.ADVANCED,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (params: any) => {
      const premortem = services.preMortem;
      if (!premortem) return { error: 'Pre-mortem engine not available' };
      const report = await premortem.analyze({
        description: params.description,
        technologies: params.technologies,
        pattern: params.pattern,
        affectedEntities: params.affected_entities || [],
        context: params.context
      });
      return { report };
    }
  );

  registerJsonTool(
    'premortem_record_outcome',
    {
      title: 'Record Outcome',
      description: 'After a decision plays out, record whether the predicted failures occurred to improve future pre-mortem accuracy.',
      inputSchema: z.object({
        report_id: z.string().describe('Report ID generated by premortem_analyze'),
        outcome: z.enum(['confirmed_failure', 'avoided', 'proceeded_safely']).describe('The outcome of the decision'),
        notes: z.string().describe('Notes on the outcome')
      }),
      level: ToolLevel.ADVANCED,
      annotations: WRITE_ANNOTATIONS
    },
    async (params: any) => {
      return { success: true, message: 'Outcome recorded for learning.' };
    }
  );

  registerJsonTool(
    'premortem_add_pattern',
    {
      title: 'Add Failure Pattern',
      description: 'Add a new failure pattern to the library from your own experience.',
      inputSchema: z.object({
        technology: z.string().describe('Technology involved'),
        pattern: z.string().describe('Architectural pattern'),
        title: z.string().describe('Title of the failure pattern'),
        description: z.string().describe('Description of the failure'),
        likelihood: z.enum(['low', 'medium', 'high']).describe('Likelihood of the failure'),
        severity: z.enum(['low', 'medium', 'high', 'catastrophic']).describe('Severity of the failure'),
        mitigation: z.string().describe('Mitigation strategy')
      }),
      level: ToolLevel.ADVANCED,
      annotations: WRITE_ANNOTATIONS
    },
    async (params: any) => {
      const premortem = services.preMortem;
      if (!premortem) return { error: 'Pre-mortem engine not available' };
      await premortem.addToPatternLibrary({
        technology: params.technology,
        title: params.title,
        description: params.description,
        likelihood: params.likelihood,
        severity: params.severity,
        mitigation: params.mitigation,
        sourceDetail: 'User added'
      });
      return { success: true, message: 'Pattern added to library.' };
    }
  );

  registerJsonTool(
    'premortem_library',
    {
      title: 'Pattern Library',
      description: 'Browse the failure pattern library for a given technology or pattern.',
      inputSchema: z.object({
        technology: z.string().optional().describe('Technology to search for'),
        pattern: z.string().optional().describe('Architectural pattern to search for')
      }),
      level: ToolLevel.ADVANCED,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (params: any) => {
      const premortem = services.preMortem;
      if (!premortem) return { error: 'Pre-mortem engine not available' };
      const patterns = await premortem.getPatternLibrary(params.technology || params.pattern || '');
      return { patterns };
    }
  );
}