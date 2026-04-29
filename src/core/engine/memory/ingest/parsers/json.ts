import { cleanString } from '../../utils/index.js';
import { normalizeRole } from './markdown.js';
import type { ConversationTurn } from '../../types/index.js';

/**
 * Parse a JSON conversation (array of {role, content, timestamp?}).
 * Returns [{role, content, timestamp, index}].
 */
export function parseJsonConversation(data: unknown): ConversationTurn[] {
  if (!data) return [];
  let arr: unknown[] | null = null;
  if (typeof data === 'string') {
    try {
      arr = JSON.parse(data) as unknown[];
    } catch {
      return [];
    }
  } else if (Array.isArray(data)) {
    arr = data;
  }
  if (!Array.isArray(arr)) return [];

  const turns: ConversationTurn[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const role = cleanString(item.role as string, 50);
    const content = cleanString(item.content as string, 50000);
    if (!role || !content) continue;
    turns.push({
      role: normalizeRole(role),
      content,
      timestamp: (item.timestamp as string) || null,
      index: turns.length
    });
  }
  return turns;
}
