@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================
echo   AGY Context · 会话顶栏标签补丁 一键安装程序
echo ======================================================
echo.
echo 正在同步插件并安装「对话 / 上下文 / 编队 / 洞察」会话顶栏标签...
echo (独立隔离注入，自动保留中文汉化与猫娘挂件补丁，并安全重启 Antigravity)
echo.
node setup.cjs --patch-header --kill --relaunch
if errorlevel 1 (
  echo.
  echo [!] 安装遇到问题，请确认已安装 Node.js 18+ 且拥有 Antigravity 目录写入权限。
  pause
  exit /b 1
)
echo.
echo [√] 安装完成！Antigravity 已重启，会话顶栏标签已激活！
timeout /t 3 >nul
