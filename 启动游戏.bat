@echo off
chcp 65001 >nul
cd /d %~dp0
echo 正在启动游戏服务器...
start "" http://localhost:8080
node server.js
pause
