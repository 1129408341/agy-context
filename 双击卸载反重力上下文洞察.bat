@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================
echo   AGY Context · 反重力上下文洞察 一键卸载程序
echo ======================================================
echo.
node setup.cjs --uninstall
pause
