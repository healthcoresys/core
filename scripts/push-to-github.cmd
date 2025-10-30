@echo off
REM Windows CMD wrapper to run the PowerShell push script

setlocal
set SCRIPT_DIR=%~dp0

where powershell >nul 2>nul
if errorlevel 1 (
  echo ^[ERROR^] powershell.exe not found in PATH.
  echo Install PowerShell or run the .ps1 directly from a PowerShell session.
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%push-to-github.ps1" %*

endlocal
