@echo off
echo ==========================================
echo   SHORTKINGS: Launching App...
echo ==========================================

echo.
echo [Back] Starting Backend (Port 8000)...
REM Activate venv from root and run backend
start "ShortKings Backend" cmd /k "call venv\Scripts\activate && python backend/main.py"

echo.
echo [Front] Starting Frontend (Port 3000)...
if exist "budget-app\frontend\package.json" (
    REM Run on port 3000
    start "ShortKings Budget App" cmd /k "cd budget-app\frontend && npm run dev"
) else (
    echo Frontend not found at budget-app\frontend. Please check layout.
)

echo.
echo App is running!
echo Backend: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
