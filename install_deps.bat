@echo off
echo ==========================================
echo   SHORTKINGS: Installing Dependencies...
echo ==========================================

echo.
echo [1/3] Setting up Python Backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
echo Activating venv and installing requirements...
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo.
echo [2/3] Setting up Node.js Frontend...
if exist "frontend\package.json" (
    cd frontend
    echo Installing npm packages...
    call npm install
    cd ..
) else (
    echo Frontend not found yet. Skipping npm install.
)

echo.
echo ==========================================
echo   INSTALLATION COMPLETE!
echo ==========================================
pause
