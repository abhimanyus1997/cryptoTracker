@ECHO OFF

ECHO Starting virtual environment
ECHO ------------------------------

@REM ECHO Deactivating old environments
TITLE "cryptoTracker Flask Server - abhimanyus1997"


ECHO ----------Opening Scripts----------
CD "env\Scripts"


ECHO ----------Executing venv using CMD----------
cmd.exe /c activate.bat


@REM ECHO ----------Exporting environment----------
@REM python /c pip install pip-chill
@REM python pip-chill --no-version > requirements.txt

COLOR 5
ECHO ----------Starting Flask Server----------
python main.py

COLOR
