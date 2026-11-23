@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================
echo   AGY Context · 会话顶栏标签补丁 一键移除程序
echo ======================================================
echo.
echo 正在安全移除会话顶栏标签补丁（保留原生侧栏插件、汉化与猫娘挂件）...
echo.
node setup.cjs --unpatch-header --kill --relaunch
if errorlevel 1 (
  echo.
  echo [!] 移除失败，请检查权限后重试。
  pause
  exit /b 1
)
echo.
echo [√] 已移除顶栏标签补丁，Antigravity 已重新启动！
timeout /t 3 >nul
