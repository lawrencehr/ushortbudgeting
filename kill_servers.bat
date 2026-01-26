@echo off
echo ===================================================
echo   Stopping Budget App Servers
echo ===================================================
echo.
echo WARNING: This will terminate ALL running Node.js and Python processes.
echo Ensure you have saved work in other applications using these runtimes.
echo.
pause
echo.
echo Killing Node.js processes...
taskkill /IM node.exe /F
echo.
echo Killing Python processes...
taskkill /IM python.exe /F
echo.
echo ===================================================
echo   Cleanup Complete.
echo   You can now try running start_app.bat again.
echo ===================================================
pause
