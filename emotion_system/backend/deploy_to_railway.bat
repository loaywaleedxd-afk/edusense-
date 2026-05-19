@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  EduSense Backend — Deploy to Railway
REM
REM  Prerequisites:
REM    - Install Railway CLI:  npm install -g @railway/cli
REM    - Login:                railway login
REM    - Create project:       railway init   (run once, then commit railway.toml)
REM ─────────────────────────────────────────────────────────────────────────────

echo Checking Railway CLI ...
railway --version
IF ERRORLEVEL 1 (
    echo Railway CLI not found. Install with:  npm install -g @railway/cli
    pause & exit /b 1
)

echo.
echo Deploying backend to Railway ...
railway up --service edusense-backend

echo.
echo Done! Your backend is deploying. Check progress at: https://railway.app
echo.
echo Next steps:
echo   1. In Railway dashboard ^> your service ^> Variables, add:
echo        JWT_SECRET      = (run: python -c "import secrets; print(secrets.token_hex(32))")
echo        DB_PATH         = /data/emotion_system.db
echo        ALLOWED_ORIGINS = https://yourdomain.com,http://localhost:5173
echo        SMTP_USER       = edusense.system@gmail.com
echo        SMTP_PASS       = wnxp zahn wzhu nxnx
echo   2. In Railway ^> Volumes, add a volume mounted at /data
echo   3. Copy your DB: railway run cp emotion_system.db /data/emotion_system.db
echo   4. Get your public URL from Railway dashboard
echo   5. Put that URL into build_for_hostinger.bat as BACKEND_URL
echo.
pause
