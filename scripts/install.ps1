# Synapse Universal Installer for Windows
# Usage: irm https://raw.githubusercontent.com/TheJenilDGohel/Synapse/main/scripts/install.ps1 | iex

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Synapse Universal Installer" -ForegroundColor Cyan
Write-Host "  ----------------------------" -ForegroundColor Gray
Write-Host ""

# 1. Check for Node.js
Write-Host "[1/3] Checking environment..." -NoNewline
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host " Error: Node.js is not installed. Please install it from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node --version
Write-Host " OK ($nodeVersion)" -ForegroundColor Green

# 2. Install Synapse
Write-Host "[2/3] Installing Synapse via NPM..."
npm install -g synapse-cortex

# 3. Trigger Onboarding
Write-Host "[3/3] Launching neural link..."
synapse onboard

Write-Host ""
Write-Host "  Setup Complete! Type 'synapse' to get started." -ForegroundColor Green
Write-Host ""
