@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  EduSense — Production build for Hostinger
REM
REM  USAGE:
REM    1. Edit BACKEND_URL below to your Railway/Render backend URL
REM    2. Edit SITE_URL below to your Hostinger domain
REM    3. Double-click this file (or run from cmd)
REM    4. Upload the generated  dist\  folder contents to Hostinger public_html
REM ─────────────────────────────────────────────────────────────────────────────

SET BACKEND_URL=https://your-app.up.railway.app
SET SITE_URL=https://yourdomain.com

echo.
echo [1/3] Writing production .env ...
(
echo VITE_SMTP_USER=edusense.system@gmail.com
echo VITE_SMTP_PASS=wnxp zahn wzhu nxnx
echo VITE_APP_URL=%SITE_URL%
echo VITE_API_URL=%BACKEND_URL%
) > .env.production.local

echo [2/3] Building frontend ...
call npm run build -- --mode production
IF ERRORLEVEL 1 (
    echo.
    echo ERROR: Build failed. Check the output above.
    pause
    exit /b 1
)

echo [3/3] Done!
echo.
echo  Upload everything inside  dist\  to your Hostinger public_html folder.
echo  (Make sure .htaccess is also uploaded — it may be hidden in your file manager)
echo.
pause
