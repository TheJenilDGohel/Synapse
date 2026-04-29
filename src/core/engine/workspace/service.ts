import {
  normalizeTarget as normalizeTargetFn,
  resolveSearchBases as resolveSearchBasesFn,
  listProjects as listProjectsFn,
  projectTree as projectTreeFn,
  summarizeProject as summarizeProjectFn,
  readFileChunk as readFileChunkFn,
  readLinesWindowStream as readLinesWindowStreamFn,
  walkDirectories as walkDirectoriesFn,
  isLikelyTextFile as isLikelyTextFileFn,
  safeReadText as safeReadTextFn,
  isUnderRoots as isUnderRootsFn,
  splitRootIntoProjects as splitRootIntoProjectsFn,
  looksLikeProjectDir as looksLikeProjectDirFn,
  detectProjectMarkers as detectProjectMarkersFn
} from './helpers.js';
import type {
  WorkspaceRoot,
  WalkEntry,
  ProjectEntry,
  ProjectSummary,
  FileChunkResult
} from './helpers.js';

export interface WorkspaceServiceOptions {
  roots: WorkspaceRoot[];
  ignoreDirs: Set<string>;
  textExtensions: Set<string>;
  projectMarkerFiles: Set<string>;
  projectHintDirs: Set<string>;
  extraProjectMarkers: Set<string>;
  maxFileBytes: number;
  autoProjectSplit: boolean;
  maxAutoProjects: number;
  forceSplitChildren: boolean;
}

export class WorkspaceService {
  roots: WorkspaceRoot[];
  ignoreDirs: Set<string>;
  textExtensions: Set<string>;
  projectMarkerFiles: Set<string>;
  projectHintDirs: Set<string>;
  extraProjectMarkers: Set<string>;
  maxFileBytes: number;
  autoProjectSplit: boolean;
  maxAutoProjects: number;
  forceSplitChildren: boolean;

  constructor({
    roots,
    ignoreDirs,
    textExtensions,
    projectMarkerFiles,
    projectHintDirs,
    extraProjectMarkers,
    maxFileBytes,
    autoProjectSplit,
    maxAutoProjects,
    forceSplitChildren
  }: WorkspaceServiceOptions) {
    this.roots = roots;
    this.ignoreDirs = ignoreDirs;
    this.textExtensions = textExtensions;
    this.projectMarkerFiles = projectMarkerFiles;
    this.projectHintDirs = projectHintDirs;
    this.extraProjectMarkers = extraProjectMarkers;
    this.maxFileBytes = maxFileBytes;
    this.autoProjectSplit = autoProjectSplit;
    this.maxAutoProjects = maxAutoProjects;
    this.forceSplitChildren = forceSplitChildren;
  }

  listRoots(): WorkspaceRoot[] {
    return this.roots;
  }

  normalizeTarget(inputPath: string): string {
    return normalizeTargetFn(this, inputPath);
  }

  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[] {
    return resolveSearchBasesFn(this, projectPath, allRoots);
  }

  listProjects(rootPath: string | undefined, maxEntries: number): ProjectEntry[] {
    return listProjectsFn(this, rootPath, maxEntries);
  }

  projectTree(projectPath: string, maxDepth: number, maxEntries: number): string[] {
    return projectTreeFn(this, projectPath, maxDepth, maxEntries);
  }

  summarizeProject(projectPath: string, maxFiles: number): ProjectSummary {
    return summarizeProjectFn(this, projectPath, maxFiles);
  }

  async readFileChunk(requestedPath: string, startLine: number, endLine: number, maxSpan: number): Promise<FileChunkResult> {
    return readFileChunkFn(this, requestedPath, startLine, endLine, maxSpan);
  }

  async readLinesWindowStream(filePath: string, from: number, to: number): Promise<{ lines: string[]; totalLines: number }> {
    return readLinesWindowStreamFn(filePath, from, to);
  }

  *walkDirectories(base: string): Generator<WalkEntry> {
    yield * walkDirectoriesFn(this, base);
  }

  isLikelyTextFile(filePath: string): boolean {
    return isLikelyTextFileFn(this, filePath);
  }

  safeReadText(filePath: string): string {
    return safeReadTextFn(this, filePath);
  }

  isUnderRoots(targetPath: string): boolean {
    return isUnderRootsFn(this, targetPath);
  }

  splitRootIntoProjects(rootPath: string): string[] {
    return splitRootIntoProjectsFn(this, rootPath);
  }

  looksLikeProjectDir(dirPath: string): boolean {
    return looksLikeProjectDirFn(this, dirPath);
  }

  detectProjectMarkers(projectPath: string): string[] {
    return detectProjectMarkersFn(projectPath);
  }
}
