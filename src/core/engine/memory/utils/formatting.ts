import type { Scope, ScopeInput, Link } from '../types/index.js';

export function nowIso(): string {
  return new Date().toISOString();
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function cleanString(value: unknown, maxLength = 0): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!maxLength || trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trim();
}

export function normalizeWhitespace(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function truncateText(value: unknown, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized || normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}\u2026`;
}

export function firstSentence(value: unknown, maxLength = 240): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  return truncateText(sentence.replace(/[.!?]+$/, ''), maxLength);
}

export function humanizeLabel(value: unknown): string {
  const cleaned = normalizeWhitespace(String(value || '').replace(/[_-]+/g, ' '));
  if (!cleaned) return '';
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ensureArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 50);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value || []);
}

export function normalizeScope(scope: ScopeInput = {}): Scope {
  return {
    root_path: cleanString(scope.root_path || scope.rootPath),
    project_path: cleanString(scope.project_path || scope.projectPath),
    branch_name: cleanString(scope.branch_name || scope.branchName, 200),
    topic: cleanString(scope.topic, 200),
    feature: cleanString(scope.feature, 200)
  };
}

export function normalizeLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: unknown): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      path: cleanString(item.path as string, 4000),
      line: Number.isFinite(item.line) ? item.line as number : null,
      label: cleanString(item.label as string, 200)
    }))
    .filter((item) => item.path)
    .slice(0, 50);
}
