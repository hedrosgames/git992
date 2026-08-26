@echo off
setlocal
:: ============================================================
:: Git Hedros - Launcher Oficial
:: Duplo clique: sobe o servidor Node em background e abre o painel
:: ============================================================

set PORT=3000
set HOST=127.0.0.1

:: Diretorios base
set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "APP_DIR=%ROOT_DIR%\_app"
set "SERVER=%APP_DIR%\server.js"
set "HTML=%APP_DIR%\Git Hedros.html"

:: Se ja estiver em execucao, apenas abre o painel no navegador
netstat -ano | findstr %HOST%:%PORT% | findstr LISTENING >nul
if %errorlevel%==0 (
  start "" "%HTML%"
  exit /b
)

:: Localiza executavel do Node.js
set "NODE_CMD=node"
where node >nul 2>&1
if %errorlevel% neq 0 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_CMD=C:\Program Files\nodejs\node.exe"
  )
)

:: Sobe o servidor em background e abre o navegador assim que a porta 3000 responder
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '%NODE_CMD%' -ArgumentList '%SERVER%' -WorkingDirectory '%ROOT_DIR%' -WindowStyle Hidden; for ($i=0; $i -lt 30; $i++) { if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { Start-Process '%HTML%'; break }; Start-Sleep -Milliseconds 400 }"

exit /b
