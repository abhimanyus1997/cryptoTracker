@ECHO OFF

ECHO Starting virtual environment
ECHO ------------------------------

ECHO Deactivating old environments
ECHO ------------------------------
python virtualenv deactivate

ECHO "Opening Scripts"
ECHO "------------------------------"
CD "env\Scripts"

ECHO "Executing venv using Powershell"
ECHO "------------------------------"
powershell.exe -command "activate.ps1"
ECHO "                              "

ECHO "Starting Flask Server"
ECHO "------------------------------"
cd ..\..\Flask
flask --app server run --host=0.0.0.0


echo "The program has completed"
