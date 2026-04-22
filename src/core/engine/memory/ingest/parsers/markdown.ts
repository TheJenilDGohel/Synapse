import type { ConversationTurn } from '../../types/index.js';

const ROLE_PATTERNS: RegExp[] = [
  /^##\s+(user|assistant|system|human|ai)\s*$/i,
  /^\*\*(user|assistant|system|human|ai)\s*:\*\*/i,
  /^(user|assistant|system|human|ai)\s*:\s*/i
];

export function normalizeRole(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'human') return 'user';
  if (lower === 'ai') return 'assistant';
  return lower;
}

/**
 * Parse a Markdown conversation into turns.
 * Supports: ## Role, **Role:**, Role: prefixes.
 * Returns [{role, content, index}].
 */
export function parseMarkdownConversation(text: string): ConversationTurn[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const turns: ConversationTurn[] = [];
  let currentRole: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of ROLE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        if (currentRole && currentLines.length > 0) {
          const content = currentLines.join('\n').trim();
          if (content) {
            turns.push({ role: normalizeRole(currentRole), content, index: turns.length });
          }
        }
        currentRole = match[1];
        currentLines = [];
        // For inline content after "Role: text", capture remainder
        const remainder = line.replace(pattern, '').trim();
        if (remainder) currentLines.push(remainder);
        matched = true;
        break;
      }
    }
    if (!matched && currentRole) {
      currentLines.push(line);
    }
  }

  // Flush last turn
  if (currentRole && currentLines.length > 0) {
    const content = currentLines.join('\n').trim();
    if (content) {
      turns.push({ role: normalizeRole(currentRole), content, index: turns.length });
    }
  }

  return turns;
}
