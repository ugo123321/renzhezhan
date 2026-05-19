@echo off
cd /d "%~dp0"
echo Starting Ninja Slash at http://localhost:8080
echo Open this URL in your browser.
start http://localhost:8080
python -m http.server 8080
