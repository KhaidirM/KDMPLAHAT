@echo off
cd /d "%~dp0"
echo KDKMP Lahat preview is running at http://localhost:8000
echo Keep this window open while using the app. Press Ctrl+C to stop.
py -m http.server 8000
