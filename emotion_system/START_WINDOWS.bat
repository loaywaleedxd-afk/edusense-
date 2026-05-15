@echo off
title EduSense — Classroom Emotion Detection System
color 0A

echo.
echo  ███████╗██████╗ ██╗   ██╗███████╗███████╗███╗   ██╗███████╗███████╗
echo  ██╔════╝██╔══██╗██║   ██║██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
echo  █████╗  ██║  ██║██║   ██║███████╗█████╗  ██╔██╗ ██║███████╗█████╗
echo  ██╔══╝  ██║  ██║██║   ██║╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝
echo  ███████╗██████╔╝╚██████╔╝███████║███████╗██║ ╚████║███████║███████╗
echo  ╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
echo.
echo  Classroom Emotion Detection and Statistical Analysis System
echo  ──────────────────────────────────────────────────────────
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ from python.org
    pause & exit /b 1
)

:: Check R
Rscript --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] R not found. R analysis features will be limited.
    echo           Install R from https://cran.r-project.org
) else (
    echo [OK] R detected
)

echo.
echo [1/4] Installing Python dependencies...
cd backend
pip install -r requirements.txt --quiet
if errorlevel 1 (echo [ERROR] pip install failed & pause & exit /b 1)
echo [OK] Python packages installed

echo.
echo [2/4] Installing R packages...
cd ..\r_analysis
Rscript install_packages.R
echo [OK] R packages ready

echo.
echo [3/4] Starting Python backend (port 8000)...
cd ..\backend
start "EduSense Backend" cmd /k "uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

echo.
echo [4/4] Starting R Shiny dashboard (port 3001)...
cd ..\r_analysis
start "EduSense R Shiny" cmd /k "Rscript -e \"shiny::runApp('shiny_dashboard.R', port=3001, host='0.0.0.0')\""
timeout /t 2 /nobreak >nul

echo.
echo ══════════════════════════════════════════════
echo  ✅ EduSense is RUNNING
echo ══════════════════════════════════════════════
echo.
echo  🌐 Main Portal (HTML):  Open frontend\index.html in browser
echo  🔗 Python API:          http://localhost:8000
echo  📊 API Docs:            http://localhost:8000/docs
echo  📈 R Shiny Dashboard:   http://localhost:3001
echo.
echo  Demo Logins:
echo    Student  → s001     / demo123
echo    Doctor   → dr.smith / demo123
echo    Admin    → admin    / demo123
echo.
echo  Press any key to open the portal in your browser...
pause >nul

start "" "%~dp0frontend\index.html"
