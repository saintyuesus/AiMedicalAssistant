# 康医助手 - 启动脚本（Windows）
@echo off
echo ========================================
echo   康医助手 · AI 医疗健康助手
echo ========================================
echo.

echo [1/2] 启动后端服务 (FastAPI :8000)...
start "康医助手-后端" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务 (Vite :5173)...
start "康医助手-前端" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 服务启动中，请稍候...
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:8000
echo.
echo 按任意键退出此窗口（服务将继续运行）...
pause >nul
