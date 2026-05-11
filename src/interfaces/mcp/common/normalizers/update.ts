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
  stale: boolean;
  stale_warning: string | null;
}

export function normalizeUpdateStatus(result: Record<string, unknown> | null | undefined): NormalizedUpdateStatus {
  const checkedAgeMinutes = (result?.checked_age_minutes as number | null | undefined) ?? null;
  const stale = Boolean(result?.stale);
  const staleWarning = stale
    ? `Version check is stale${Number.isFinite(checkedAgeMinutes) ? ` (${checkedAgeMinutes} minutes old)` : ''}. Run synapse_update_status to refresh.`
    : null;
  return {
    package_name: (result?.package_name as string | null | undefined) || null,
    update_channel: (result?.update_channel as string | null | undefined) || 'stable',
    channel: (result?.update_channel as string | null | undefined) || 'stable',
    current_version: (result?.current_version as string | null | undefined) || null,
    latest_version: (result?.latest_version as string | null | undefined) || null,
    current: (result?.current_version as string | null | undefined) || null,
    latest: (result?.latest_version as string | null | undefined) || null,
    is_outdated: Boolean(result?.is_outdated),
    checked_via: (result?.checked_via as string | null | undefined) || null,
    source: (result?.source as string | null | undefined) || null,
    last_checked_at: (result?.last_checked_at as string | null | undefined) || null,
    last_check_ok: (result?.last_check_ok as boolean | null | undefined) ?? null,
    error: (result?.error as string | null | undefined) || null,
    recommend_update_prompt: Boolean(result?.recommend_update_prompt),
    next_check_after_minutes: (result?.next_check_after_minutes as number | null | undefined) ?? null,
    cache_path: (result?.cache_path as string | null | undefined) || null,
    checked_at_ms: (result?.checked_at_ms as number | null | undefined) ?? null,
    checked_age_minutes: checkedAgeMinutes,
    next_check_at: (result?.next_check_at as string | null | undefined) || null,
    using_cached_data: Boolean(result?.using_cached_data),
    can_attempt_update: Boolean(result?.can_attempt_update),
    recommendation: (result?.recommendation as string | null | undefined) || 'up_to_date',
    stale,
    stale_warning: staleWarning
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

export function normalizeUpdateSelfResult(result: Record<string, unknown> | null | undefined): NormalizedUpdateSelfResult {
  return {
    ...(result || {}),
    ok: Boolean(result?.ok),
    skipped: Boolean(result?.skipped),
    dry_run: Boolean(result?.dry_run),
    restart_required: Boolean(result?.restart_required),
    reason: (result?.reason as string | null | undefined) || null,
    message: (result?.message as string | null | undefined) || null,
    step: (result?.step as string | null | undefined) || null,
    planned_commands: Array.isArray(result?.planned_commands) ? (result?.planned_commands as string[]) : [],
    validation: result?.validation || null,
    install: result?.install || null,
    skill_sync: result?.skill_sync || null,
    update_status: result?.update_status ? normalizeUpdateStatus(result.update_status as Record<string, unknown>) : null
  };
}
