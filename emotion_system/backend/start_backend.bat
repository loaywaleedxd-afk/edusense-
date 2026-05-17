@echo off
cd /d D:\download\portal\emotion_system\backend
C:\Users\ABC\AppData\Local\Programs\Python\Python310\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
