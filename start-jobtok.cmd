@echo off
rem Starts the JobTok database, API and app. See scripts/start-local.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
pause
