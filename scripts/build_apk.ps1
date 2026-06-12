# Builds a release APK with Supabase credentials baked in via --dart-define.
# NEVER build a distributable APK without these — the app will boot with an
# empty host and login will fail.
# Usage: .\scripts\build_apk.ps1 -SupabaseUrl https://xxx.supabase.co -AnonKey sb_publishable_...
param(
  [Parameter(Mandatory = $true)][string]$SupabaseUrl,
  [Parameter(Mandatory = $true)][string]$AnonKey
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Set-Location "$root\apps\mobile"
flutter build apk --release `
  --dart-define=SUPABASE_URL=$SupabaseUrl `
  --dart-define=SUPABASE_ANON_KEY=$AnonKey

Write-Host "`nAPK: apps\mobile\build\app\outputs\flutter-apk\app-release.apk"
