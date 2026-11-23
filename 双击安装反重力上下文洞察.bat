@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================
echo   AGY Context · 反重力上下文洞察 一键安装程序
echo ======================================================
echo.
node setup.cjs
if errorlevel 1 (
  echo.
  echo [!] 安装失败，请确认已安装 Node.js 18+。
  pause
  exit /b 1
)
echo.
echo [√] 安装完成！请在 Antigravity 中打开插件页或侧栏查看。
pause
