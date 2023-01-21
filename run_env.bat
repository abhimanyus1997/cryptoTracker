@ECHO OFF

ECHO "Starting virtual environment"

ECHO "Deactivating old environments"
python virtualenv deactivate

ECHO "Opening Scripts"
CD "env\Scripts"

ECHO "Executing venv using Powershell"
powershell.exe -command "activate.ps1"
echo "The program has completed"
