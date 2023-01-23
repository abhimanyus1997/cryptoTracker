@ECHO OFF

ECHO Starting virtual environment
ECHO ------------------------------

@REM ECHO Deactivating old environments
TITLE "cryptoTracker Flask Server - abhimanyus1997"

COLOR 1
ECHO ----------Opening Scripts----------
CD "env\Scripts"

COLOR 2
ECHO ----------Executing venv using CMD----------
cmd.exe /c activate.bat

COLOR 5
ECHO ----------Starting Flask Server----------
cd ..\..\Flask
python app.py

COLOR
