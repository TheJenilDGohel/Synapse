interface WarningObject {
  type?: string;
  message?: string;
}

type WarningArg = string | WarningObject | undefined | null;

function warningType(args: unknown[] = []): string {
  const first = args[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'type' in first && typeof (first as WarningObject).type === 'string') {
    return (first as WarningObject).type!;
  }
  return '';
}

export function shouldSuppressRuntimeWarning(warning: WarningArg, args: unknown[] = []): boolean {
  const type = warningType(args);
  const message = String((warning as WarningObject)?.message || warning || '');
  return type === 'ExperimentalWarning' && message.includes('SQLite is an experimental feature');
}

interface WrappedEmitWarning {
  (warning: string | Error, ...args: unknown[]): void;
  __synapseWrapped?: boolean;
  __synapseOriginal?: typeof process.emitWarning;
}

export function installRuntimeWarningFilter(): void {
  const original = process.emitWarning as WrappedEmitWarning;
  if (original.__synapseWrapped) return;

  const wrappedEmitWarning: WrappedEmitWarning = function wrappedEmitWarning(
    warning: string | Error,
    ...args: unknown[]
  ): void {
    if (shouldSuppressRuntimeWarning(warning as WarningArg, args)) {
      return;
    }
    return (original as Function).call(process, warning, ...args);
  };

  wrappedEmitWarning.__synapseWrapped = true;
  wrappedEmitWarning.__synapseOriginal = original as typeof process.emitWarning;
  process.emitWarning = wrappedEmitWarning as typeof process.emitWarning;
}
