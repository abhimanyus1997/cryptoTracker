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

ECHO "Starting Django Server"
ECHO "------------------------------"
cd ..\..\django\cryptotracker\
py manage.py runserver


echo "The program has completed"
