/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NormalizedUpdateStatus {
  package_name: string | null;
  update_channel: string;
  channel: string;
  current_version: string | null;
  latest_version: string | null;
  current: string | null;
  latest: string | null;
  is_outdated: boolean;
  checked_via: string | null;
  source: string | null;
  last_checked_at: string | null;
  last_check_ok: boolean | null;
  error: string | null;
  recommend_update_prompt: boolean;
  next_check_after_minutes: number | null;
  cache_path: string | null;
  checked_at_ms: number | null;
  checked_age_minutes: number | null;
  next_check_at: string | null;
  using_cached_data: boolean;
  can_attempt_update: boolean;
  recommendation: string;
}

export function normalizeUpdateStatus(result: any): NormalizedUpdateStatus {
  return {
    package_name: result?.package_name || null,
    update_channel: result?.update_channel || 'stable',
    channel: result?.update_channel || 'stable',
    current_version: result?.current_version || null,
    latest_version: result?.latest_version || null,
    current: result?.current_version || null,
    latest: result?.latest_version || null,
    is_outdated: Boolean(result?.is_outdated),
    checked_via: result?.checked_via || null,
    source: result?.source || null,
    last_checked_at: result?.last_checked_at || null,
    last_check_ok: result?.last_check_ok ?? null,
    error: result?.error || null,
    recommend_update_prompt: Boolean(result?.recommend_update_prompt),
    next_check_after_minutes: result?.next_check_after_minutes ?? null,
    cache_path: result?.cache_path || null,
    checked_at_ms: result?.checked_at_ms ?? null,
    checked_age_minutes: result?.checked_age_minutes ?? null,
    next_check_at: result?.next_check_at || null,
    using_cached_data: Boolean(result?.using_cached_data),
    can_attempt_update: Boolean(result?.can_attempt_update),
    recommendation: result?.recommendation || 'up_to_date'
  };
}

export interface NormalizedUpdateSelfResult {
  ok: boolean;
  skipped: boolean;
  dry_run: boolean;
  restart_required: boolean;
  reason: string | null;
  message: string | null;
  step: string | null;
  planned_commands: string[];
  validation: unknown;
  install: unknown;
  skill_sync: unknown;
  update_status: NormalizedUpdateStatus | null;
  [key: string]: unknown;
}

export function normalizeUpdateSelfResult(result: any): NormalizedUpdateSelfResult {
  return {
    ...result,
    ok: Boolean(result?.ok),
    skipped: Boolean(result?.skipped),
    dry_run: Boolean(result?.dry_run),
    restart_required: Boolean(result?.restart_required),
    reason: result?.reason || null,
    message: result?.message || null,
    step: result?.step || null,
    planned_commands: Array.isArray(result?.planned_commands) ? result.planned_commands : [],
    validation: result?.validation || null,
    install: result?.install || null,
    skill_sync: result?.skill_sync || null,
    update_status: result?.update_status ? normalizeUpdateStatus(result.update_status) : null
  };
}
