@echo off
cd /d "%~dp0"
echo Starting the HITS launch preview...
echo Open http://localhost:5173 in your browser.
echo Keep this window open while rehearsing. Press Ctrl+C to stop.
call npm run dev
pause
