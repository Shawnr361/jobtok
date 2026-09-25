# Starts everything needed to use JobTok on this computer and on a phone on the same Wi-Fi:
# the embedded database, the API and the Expo dev server, each in its own window.
# Usage: double-click start-jobtok.cmd in the repo root (or run this script in PowerShell).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Test-Port($port) {
  [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

function Wait-Port($port, $name, $seconds = 90) {
  for ($i = 0; $i -lt $seconds; $i++) {
    if (Test-Port $port) { return }
    Start-Sleep -Seconds 1
  }
  throw "$name did not start on port $port. Check its window for errors."
}

function Open-Window($title, $command) {
  $script = "`$Host.UI.RawUI.WindowTitle = '$title'; Set-Location '$root'; $command"
  Start-Process powershell -ArgumentList '-NoExit', '-Command', $script | Out-Null
}

# The computer's Wi-Fi/LAN address, so a phone can reach the API.
$ip = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
  Select-Object -First 1).IPv4Address.IPAddress
if (-not $ip) { $ip = 'localhost'; Write-Warning 'No network found. Only this computer can open the app.' }

foreach ($tool in 'node', 'npm', 'ffmpeg', 'ffprobe') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is not installed or not on PATH." }
}

if (-not (Test-Path 'node_modules')) {
  Write-Host 'Installing dependencies (first run only)...'
  npm install
}
if (-not (Test-Path 'packages/types/dist') -or -not (Test-Path 'packages/api-client/dist')) {
  Write-Host 'Building shared packages...'
  npx turbo run build --filter=@jobtok/types --filter=@jobtok/api-client
}
if (-not (Test-Path 'apps/api/.env')) {
  throw 'apps/api/.env is missing. Copy apps/api/.env.example to apps/api/.env first.'
}

if (Test-Port 5432) {
  Write-Host 'Database already running.'
} else {
  Open-Window 'JobTok database' 'npm run db:embedded'
  Wait-Port 5432 'The database'
}
Write-Host 'Applying database migrations...'
npm run db:deploy --silent

if (Test-Port 4000) {
  Write-Host 'API already running on port 4000.'
} else {
  Open-Window 'JobTok API (sign-in codes appear here)' 'npm run dev -w @jobtok/api'
  Wait-Port 4000 'The API'
}

if (Test-Port 8081) {
  Write-Host 'Expo already running on port 8081. Close its window and run this again to change the API address.'
} else {
  Open-Window 'JobTok app (Expo)' "`$env:EXPO_PUBLIC_API_URL = 'http://${ip}:4000'; Set-Location apps/mobile; npx expo start --web --clear --port 8081"
}

Write-Host ''
Write-Host 'JobTok is starting.' -ForegroundColor Green
Write-Host "  Computer: http://localhost:8081 (opens in your browser)"
Write-Host "  Phone:    install Expo Go, join the same Wi-Fi, then scan the QR code in the 'JobTok app' window"
Write-Host "  API:      http://${ip}:4000/api/v1/health"
Write-Host "  Sign-in codes are printed in the 'JobTok API' window."
