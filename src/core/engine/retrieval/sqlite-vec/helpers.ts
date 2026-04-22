import path from 'node:path';

export interface FileStat {
  mtimeMs: number;
  size: number;
}

export function makeFileSignature(st: FileStat): string {
  return `${st.mtimeMs}:${st.size}`;
}

export function isUnderBase(filePath: string, bases: string[]): boolean {
  const abs = path.resolve(filePath);
  return bases.some((base) => {
    const rel = path.relative(base, abs);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

export function stripTrailingSeparators(value: string): string {
  return value.replace(/[\\/]+$/g, '');
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function scoreFromVecDistance(distance: number): number {
  const raw = Number(distance);
  if (!Number.isFinite(raw)) return 0;
  return 1 / (1 + Math.max(0, raw));
}

export interface BaseScopeClause {
  where: string;
  params: string[];
}

export function buildBaseScopeClause(bases: string[], column: string = 'file_path'): BaseScopeClause {
  const clauses: string[] = [];
  const params: string[] = [];
  for (const base of bases) {
    const trimmed = stripTrailingSeparators(base);
    const slashDescendants = `${trimmed}/%`;
    const backslashDescendants = `${trimmed}\\%`;
    clauses.push(`(${column} = ? OR ${column} LIKE ? OR ${column} LIKE ?)`);
    params.push(base, slashDescendants, backslashDescendants);
  }
  return {
    where: clauses.length > 0 ? clauses.join(' OR ') : '1=0',
    params
  };
}
