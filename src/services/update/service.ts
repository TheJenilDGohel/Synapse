import fs from 'node:fs';
import path from 'node:path';
import { buildLocalnestPaths } from '../../runtime/home-layout.js';
import {
  parseIsoTime,
  compareVersions,
  defaultRunner,
  parseLatestVersion,
  normalizeUpdateChannel,
  buildInstallCommand,
  buildSkillSyncCommand
} from './helpers.js';
import type { CommandRunner, UpdateChannel } from './helpers.js';

export { compareVersions };

export interface UpdateStatus {
  package_name: string;
  current_version: string;
  latest_version: string;
  update_channel: string;
  is_outdated?: boolean;
  checked_via?: string;
  source?: string;
  last_checked_at?: string | null;
  last_check_ok?: boolean;
  error?: string | null;
  recommend_update_prompt?: boolean;
  next_check_after_minutes?: number;
  cache_path?: string;
  stale?: boolean;
  [key: string]: unknown;
}

export interface StatusMetadata {
  checked_at_ms: number | null;
  checked_age_minutes: number | null;
  next_check_at: string | null;
  using_cached_data: boolean;
  can_attempt_update: boolean;
  recommendation: string;
}

export interface CommandResult {
  command: string;
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
}

export interface CommandAvailability {
  command: string;
  available: boolean;
  status: number | null;
  error: string | null;
  stderr: string | null;
}

export interface UpdateServiceOptions {
  synapseHome: string;
  packageName: string;
  currentVersion: string;
  checkIntervalMinutes: number;
  failureBackoffMinutes: number;
  commandRunner?: CommandRunner;
}

export class UpdateService {
  synapseHome: string;
  packageName: string;
  currentVersion: string;
  checkIntervalMinutes: number;
  failureBackoffMinutes: number;
  commandRunner: CommandRunner;
  cachePath: string;

  constructor({
    synapseHome,
    packageName,
    currentVersion,
    checkIntervalMinutes,
    failureBackoffMinutes,
    commandRunner = defaultRunner
  }: UpdateServiceOptions) {
    this.synapseHome = synapseHome;
    this.packageName = packageName;
    this.currentVersion = currentVersion;
    this.checkIntervalMinutes = checkIntervalMinutes;
    this.failureBackoffMinutes = failureBackoffMinutes;
    this.commandRunner = commandRunner;
    this.cachePath = (buildLocalnestPaths(synapseHome) as { updateStatusPath: string }).updateStatusPath;
  }

  normalizeStatusRecord(status: Partial<UpdateStatus> | null): UpdateStatus {
    const input = status && typeof status === 'object' ? status : {} as Partial<UpdateStatus>;
    const latestVersion = input.latest_version || this.currentVersion;
    const updateChannel = normalizeUpdateChannel(input.update_channel as string) || 'stable';
    return {
      ...input,
      package_name: this.packageName,
      current_version: this.currentVersion,
      latest_version: latestVersion,
      update_channel: updateChannel
    };
  }

  readCache(): UpdateStatus | null {
    try {
      if (!fs.existsSync(this.cachePath)) return null;
      const parsed = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object') return null;
      // Preserve the on-disk current_version so version-drift detection in
      // shouldRefresh / getCachedStatus can see whether the running binary
      // has advanced past what the cache knew about. normalizeStatusRecord
      // would otherwise stomp current_version to this.currentVersion.
      const input = parsed as Partial<UpdateStatus>;
      const normalized = this.normalizeStatusRecord(input);
      if (typeof input.current_version === 'string' && input.current_version) {
        normalized.current_version = input.current_version;
      }
      return normalized;
    } catch {
      return null;
    }
  }

  writeCache(data: Partial<UpdateStatus>): void {
    fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
    fs.writeFileSync(this.cachePath, `${JSON.stringify(this.normalizeStatusRecord(data), null, 2)}\n`, 'utf8');
  }

  shouldRefresh(cache: UpdateStatus | null, now: number, force: boolean): boolean {
    if (force) return true;
    if (!cache?.last_checked_at) return true;
    if (!cache.latest_version) return true;
    // Invalidate when the running binary has moved past what the cache knew.
    // e.g. user upgrades Synapse 0.0.3 -> 0.1.0 locally; the cache still
    // carries latest_version=0.0.3 from before the upgrade and would otherwise
    // surface a stale "latest" that predates the installed binary.
    if (cache.current_version && cache.current_version !== this.currentVersion) return true;
    const ageMs = now - parseIsoTime(cache.last_checked_at);
    const backoffMinutes = cache.last_check_ok ? this.checkIntervalMinutes : this.failureBackoffMinutes;
    return ageMs >= backoffMinutes * 60 * 1000;
  }

  buildStatusMetadata(status: UpdateStatus | null, now: number = Date.now()): StatusMetadata {
    const checkedAtMs = parseIsoTime(status?.last_checked_at);
    const nextCheckAfterMinutes = Number.isFinite(status?.next_check_after_minutes)
      ? status!.next_check_after_minutes!
      : 0;
    const nextCheckAtMs = checkedAtMs > 0 && nextCheckAfterMinutes > 0
      ? checkedAtMs + (nextCheckAfterMinutes * 60 * 1000)
      : 0;
    const usingCachedData = status?.source === 'cache' || status?.source === 'cache-fallback';
    const canAttemptUpdate = Boolean(status?.is_outdated);
    let recommendation = 'up_to_date';
    if (status?.is_outdated) recommendation = 'update_available';
    else if (status?.source === 'cache-fallback' || status?.source === 'error') recommendation = 'retry_later';

    return {
      checked_at_ms: checkedAtMs || null,
      checked_age_minutes: checkedAtMs > 0 ? Math.max(0, Math.floor((now - checkedAtMs) / 60000)) : null,
      next_check_at: nextCheckAtMs > 0 ? new Date(nextCheckAtMs).toISOString() : null,
      using_cached_data: usingCachedData,
      can_attempt_update: canAttemptUpdate,
      recommendation
    };
  }

  withStatusMetadata(status: Partial<UpdateStatus>, now: number = Date.now()): UpdateStatus & StatusMetadata {
    const normalized = this.normalizeStatusRecord(status);
    return {
      ...normalized,
      ...this.buildStatusMetadata(normalized, now)
    };
  }

  getCachedStatus(now: number = Date.now()): UpdateStatus & StatusMetadata {
    const cache = this.readCache();
    if (cache) {
      const versionDrift = Boolean(
        cache.current_version && cache.current_version !== this.currentVersion
      );
      const stale = this.shouldRefresh(cache, now, false);
      // When the running binary has drifted past the cached current_version,
      // the cached latest_version can no longer be trusted to reflect reality
      // (e.g. cache says latest=0.0.3 but we are now running 0.1.0). Neutralize
      // to "current == latest, not outdated" and flag stale so warmCheck or
      // the next explicit getStatus() call can refresh.
      const safeLatest = versionDrift ? this.currentVersion : cache.latest_version;
      const safeOutdated = versionDrift ? false : Boolean(cache.is_outdated);
      return this.withStatusMetadata({
        ...cache,
        current_version: this.currentVersion,
        latest_version: safeLatest,
        is_outdated: safeOutdated,
        stale,
        source: 'cache'
      }, now);
    }

    return this.withStatusMetadata({
      package_name: this.packageName,
      current_version: this.currentVersion,
      latest_version: this.currentVersion,
      update_channel: 'stable',
      is_outdated: false,
      checked_via: 'npm view',
      source: 'uninitialized',
      last_checked_at: null,
      last_check_ok: false,
      error: null,
      recommend_update_prompt: false,
      next_check_after_minutes: this.checkIntervalMinutes,
      cache_path: this.cachePath
    }, now);
  }

  checkLatestFromNpm(channel: string = 'stable'): string {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const normalizedChannel = normalizeUpdateChannel(channel) || 'stable';
    const field = normalizedChannel === 'beta' ? 'dist-tags.beta' : 'version';
    const run = this.commandRunner(npmCmd, ['view', this.packageName, field, '--json'], {
      timeoutMs: 12000
    });
    if (run?.error) {
      throw new Error(`npm view failed: ${run.error.message || run.error}`);
    }
    if (run?.status !== 0) {
      const stderr = String(run?.stderr || '').trim();
      throw new Error(`npm view exited with code ${run.status}${stderr ? `: ${stderr}` : ''}`);
    }
    const latest = parseLatestVersion(run?.stdout);
    if (!latest) {
      throw new Error(`Unable to parse npm ${normalizedChannel} version response`);
    }
    return latest;
  }

  async getStatus({ force = false, channel = 'stable' }: { force?: boolean; channel?: string } = {}): Promise<UpdateStatus & StatusMetadata> {
    const now = Date.now();
    const cache = this.readCache();
    const normalizedChannel = normalizeUpdateChannel(channel) || 'stable';

    if (!this.shouldRefresh(cache, now, force) && cache && (cache.update_channel || 'stable') === normalizedChannel) {
      return this.withStatusMetadata({
        ...cache,
        stale: false,
        source: 'cache'
      }, now);
    }

    try {
      const latestVersion = this.checkLatestFromNpm(normalizedChannel);
      const isOutdated = compareVersions(latestVersion, this.currentVersion) > 0;
      const refreshed: UpdateStatus = {
        package_name: this.packageName,
        current_version: this.currentVersion,
        latest_version: latestVersion,
        update_channel: normalizedChannel,
        is_outdated: isOutdated,
        checked_via: 'npm view',
        source: 'live',
        last_checked_at: new Date(now).toISOString(),
        last_check_ok: true,
        error: null,
        recommend_update_prompt: isOutdated,
        next_check_after_minutes: this.checkIntervalMinutes,
        cache_path: this.cachePath
      };
      this.writeCache(refreshed);
      return this.withStatusMetadata(refreshed, now);
    } catch (error) {
      const fallbackLatest = cache?.latest_version || this.currentVersion;
      const fallbackChannel = cache?.update_channel || normalizedChannel;
      const isOutdated = compareVersions(fallbackLatest, this.currentVersion) > 0;
      const failed: UpdateStatus = {
        package_name: this.packageName,
        current_version: this.currentVersion,
        latest_version: fallbackLatest,
        update_channel: fallbackChannel,
        is_outdated: isOutdated,
        checked_via: 'npm view',
        source: cache ? 'cache-fallback' : 'error',
        last_checked_at: new Date(now).toISOString(),
        last_check_ok: false,
        error: String((error as Error)?.message || error),
        recommend_update_prompt: isOutdated,
        next_check_after_minutes: this.failureBackoffMinutes,
        cache_path: this.cachePath
      };
      this.writeCache(failed);
      return this.withStatusMetadata(failed, now);
    }
  }

  async warmCheck(): Promise<void> {
    await this.getStatus({ force: false });
  }

  runCommand(command: string, args: string[]): CommandResult {
    const run = this.commandRunner(command, args, { timeoutMs: 180000 });
    return {
      command: [command, ...args].join(' '),
      ok: Boolean(run && run.status === 0 && !run.error),
      status: run?.status ?? null,
      stdout: String(run?.stdout || '').trim(),
      stderr: String(run?.stderr || '').trim(),
      error: run?.error ? String(run.error.message || run.error) : null
    };
  }

  validateCommandAvailability(command: string, args: string[] = ['--help']): CommandAvailability {
    const result = this.commandRunner(command, args, { timeoutMs: 12000 });
    return {
      command: [command, ...args].join(' '),
      available: Boolean(result && result.status === 0 && !result.error),
      status: result?.status ?? null,
      error: result?.error ? String(result.error.message || result.error) : null,
      stderr: String(result?.stderr || '').trim() || null
    };
  }

  buildDryRunValidation({ reinstallSkill, version = 'latest' }: { reinstallSkill: boolean; version?: string }): { ok: boolean; checks: CommandAvailability[] } {
    const installStep = buildInstallCommand(this.packageName, version);
    const checks: CommandAvailability[] = [
      this.validateCommandAvailability(installStep.command)
    ];
    if (reinstallSkill) {
      const skillStep = buildSkillSyncCommand();
      const helpArgs = [...skillStep.args.filter((arg) => arg !== '--force'), '--help'];
      checks.push(this.validateCommandAvailability(skillStep.command, helpArgs));
    }
    return {
      ok: checks.every((item) => item.available),
      checks
    };
  }

  async selfUpdate({ approvedByUser = false, dryRun = false, version = 'latest', reinstallSkill = true }: {
    approvedByUser?: boolean;
    dryRun?: boolean;
    version?: string;
    reinstallSkill?: boolean;
  } = {}): Promise<Record<string, unknown>> {
    if (!approvedByUser) {
      return {
        ok: false,
        skipped: true,
        reason: 'approval_required',
        message: 'User approval is required. Ask: "Synapse has a newer version. Update now?"'
      };
    }

    const installStep = buildInstallCommand(this.packageName, version);
    const skillStep = buildSkillSyncCommand();
    const planned = [
      [installStep.command, ...installStep.args].join(' '),
      reinstallSkill ? [skillStep.command, ...skillStep.args].join(' ') : null
    ].filter(Boolean) as string[];

    if (dryRun) {
      const validation = this.buildDryRunValidation({ reinstallSkill, version });
      return {
        ok: validation.ok,
        skipped: true,
        dry_run: true,
        validation,
        planned_commands: planned,
        restart_required: true
      };
    }

    const installResult = this.runCommand(installStep.command, installStep.args);
    if (!installResult.ok) {
      return {
        ok: false,
        step: 'npm_install',
        restart_required: false,
        planned_commands: planned,
        install: installResult
      };
    }

    let skillResult: CommandResult | null = null;
    if (reinstallSkill) {
      skillResult = this.runCommand(skillStep.command, skillStep.args);
      if (!skillResult.ok) {
        return {
          ok: false,
          step: 'skill_sync',
          restart_required: false,
          planned_commands: planned,
          install: installResult,
          skill_sync: skillResult
        };
      }
    }

    const status = await this.getStatus({ force: true, channel: normalizeUpdateChannel(version) || 'stable' });
    return {
      ok: true,
      step: 'completed',
      restart_required: true,
      planned_commands: planned,
      install: installResult,
      skill_sync: skillResult,
      update_status: status
    };
  }
}
