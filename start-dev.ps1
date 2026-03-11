$ErrorActionPreference = "Stop"

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "Starting Django backend on http://127.0.0.1:8000 ..."
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$backendPath'; .\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000"
)

Start-Sleep -Seconds 2

Write-Host "Starting Vite frontend on default port ..."
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendPath'; npm run dev"
)

Write-Host "Frontend and backend launch commands have been started."
