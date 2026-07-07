## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Custom Stdio Test Script
- ripgrep available: yes

## Steps to Reproduce
1. Run `synapse setup`.
2. Wait for it to finish successfully.
3. Run `synapse setup` again immediately.

## Expected Behavior
The command should gracefully detect that setup is already complete and either ask for confirmation to overwrite/reconfigure, or exit cleanly indicating it's already set up.

## Actual Behavior
The command silently overwrites configuration without asking for confirmation or complaining.

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
