@echo off
title EduSense Python GUI
color 0B
echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║   EduSense — Python GUI Launcher          ║
echo  ║   Classroom Emotion Detection System      ║
echo  ╚═══════════════════════════════════════════╝
echo.

python --version >nul 2>&1
if errorlevel 1 (echo [ERROR] Python not found & pause & exit /b 1)

echo [1/2] Installing GUI dependencies...
pip install customtkinter Pillow opencv-python --quiet
echo [OK] Dependencies ready

echo [2/2] Starting EduSense GUI...
python emotion_system\gui\app.py

pause
