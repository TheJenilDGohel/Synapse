Write-Host "=== PLATFORM ==="
Write-Host ([System.Environment]::OSVersion.VersionString)

Write-Host "=== UNINSTALL ANY EXISTING ==="
try { npm uninstall -g synapse-cortex 2>$null } catch {}

Write-Host "=== FRESH INSTALL TIMER ==="
Measure-Command { npm install -g synapse-cortex@beta }

Write-Host "=== VERSION CHECK ==="
try {
    node bin/synapse.js --version
} catch {
    Write-Host "FAIL: no version output"
}

Write-Host "=== SETUP WITHOUT RG ==="
$env:PATH_BACKUP = $env:PATH
# Remove ripgrep from PATH
$env:PATH = ($env:PATH -split ';' | Where-Object { $_ -notmatch 'ripgrep' }) -join ';'

try {
    node bin/synapse.js setup
    Write-Host "Exit code: $LASTEXITCODE"
} catch {
    Write-Host "Setup failed"
}
$env:PATH = $env:PATH_BACKUP

Write-Host "=== DOCTOR ==="
try {
    node bin/synapse.js doctor
} catch {
    Write-Host "Doctor failed with exit code $LASTEXITCODE"
}

Write-Host "=== START (3 second timeout) ==="
$process = Start-Process node -ArgumentList "bin/synapse.js start" -PassThru -NoNewWindow
Start-Sleep -Seconds 3
if (!$process.HasExited) {
    Stop-Process -Id $process.Id -Force
    Write-Host "Start exit: Success (Did not crash immediately)"
} else {
    Write-Host "Start exit: $LASTEXITCODE"
}
