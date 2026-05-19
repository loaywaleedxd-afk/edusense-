@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  EduSense — Production build for Hostinger VPS (Docker deployment)
REM
REM  Since nginx proxies /api/ → backend on the same domain,
REM  the frontend uses relative API paths (no absolute URL needed).
REM
REM  Run this on your local PC, then upload dist\ to the VPS.
REM ─────────────────────────────────────────────────────────────────────────────

echo [1/3] Writing production .env (relative API, no hardcoded URL) ...
(
echo VITE_SMTP_USER=edusense.system@gmail.com
echo VITE_SMTP_PASS=wnxp zahn wzhu nxnx
echo VITE_APP_URL=https://yourdomain.com
echo VITE_API_URL=
) > .env.production.local

echo [2/3] Building frontend ...
call npm run build
IF ERRORLEVEL 1 (
    echo.
    echo ERROR: Build failed. Check output above.
    pause
    exit /b 1
)

echo [3/3] Done!
echo.
echo  Next: copy the  dist\  folder to your VPS at:
echo    /root/portal/Ddownloadedusense-web/dist/
echo.
echo  Use WinSCP or run:
echo    scp -r dist root^@YOUR_VPS_IP:/root/portal/Ddownloadedusense-web/
echo.
pause
