import { DiagnosticService, DoctorCheckResult } from '../../../core/engine/index.js';
import { c, symbol, bar } from '../ansi.js';
import { writeError } from '../output.js';
import type { GlobalOptions } from '../options.js';

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const fix = args.includes('--fix');
  const service = new DiagnosticService();
  
  const isAgent = process.env.AI_AGENT === 'true';
  
  if (!opts.json && !isAgent) {
    console.log(c.bold('Synapse Doctor'));
    console.log('');
  }

  const report = await service.runAll({ fix });

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (!report.ok && service.isStrict()) {
      process.exitCode = 1;
    }
    return;
  }

  for (const r of report.checks) {
    const mark = r.ok ? symbol.ok() : symbol.fail();
    console.log(`${mark} ${c.bold(r.id)}: ${r.detail}`);
    if (!r.ok && r.fix) {
      console.log(`   ${c.yellow('fix:')} ${r.fix}`);
    }
  }

  const passed = report.checks.filter((r) => r.ok).length;
  const failed = report.checks.length - passed;
  
  if (!isAgent) {
    console.log('');
    console.log(`Health: ${bar(passed, report.checks.length)}`);
    console.log('');
  }
  
  if (failed === 0) {
    console.log(`${symbol.ok()} ${c.green('Doctor result: healthy')}`);
  } else {
    console.log(`${symbol.fail()} ${c.red(`Doctor result: ${failed} issue(s) found`)}`);
    if (service.isStrict()) {
       process.exitCode = 1;
    }
  }
}

// Add isStrict helper to DiagnosticService if needed, or just check env here.
// For now, I'll just assume it's NOT strict unless specified.
// Actually, I'll add isStrict to DiagnosticService for consistency.
