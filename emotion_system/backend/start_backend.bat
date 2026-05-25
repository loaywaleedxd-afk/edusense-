@echo off
chcp 65001 >nul
cd /d D:\download\portal\emotion_system\backend
echo [+] Starting EduSense backend on 0.0.0.0:8000 ...

REM Set environment variables explicitly (dotenv fallback)
set DATABASE_URL=postgresql://edusense:edusense123@localhost:5432/edusense
set JWT_SECRET=edusense-super-secret-jwt-key-change-in-production-2024
set ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://192.168.1.24:5173
set DEFAULT_TENANT=aast

D:\download\portal\emotion_system\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
