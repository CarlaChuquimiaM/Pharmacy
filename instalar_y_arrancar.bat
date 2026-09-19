@echo off
cd /d %~dp0backend

if not exist venv (
    echo Creando entorno virtual de Python...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -r requirements.txt

echo Preparando base de datos...
python seed.py

echo Iniciando el sistema...
python run.py

pause
