# Runs the Flutter app on an emulator/device wired to the LOCAL Supabase stack.
# Usage: .\scripts\run_mobile.ps1 [-DeviceId emulator-5554]
param(
  [string]$DeviceId = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# anon/publishable key from the running local stack
$status = supabase --workdir $root status --output json 2>$null | ConvertFrom-Json
if (-not $status) {
  Write-Error "Local Supabase is not running. Start it with: supabase start"
}
$key = $status.ANON_KEY
if (-not $key) { $key = $status.PUBLISHABLE_KEY }

# Android emulator reaches the host via 10.0.2.2
$url = "http://10.0.2.2:54321"

$deviceArg = @()
if ($DeviceId) { $deviceArg = @("-d", $DeviceId) }

Set-Location "$root\apps\mobile"
flutter run @deviceArg `
  --dart-define=SUPABASE_URL=$url `
  --dart-define=SUPABASE_ANON_KEY=$key
