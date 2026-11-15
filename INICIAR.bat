@echo off
REM ============================================================
REM  Busqueda del Tesoro AR - LDCV
REM  Doble clic para: instalar dependencias, correr pruebas y
REM  levantar la app en http://localhost:5173
REM  Registro completo en iniciar-log.txt
REM ============================================================
chcp 65001 >nul
cd /d "%~dp0"
set "LOG=%~dp0iniciar-log.txt"
echo ==== INICIO %date% %time% > "%LOG%"

REM Si Node se acaba de instalar y Windows no refresco el PATH
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
REM Node portable (sin permisos de administrador): descomprimir en .\node\
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"

where node >> "%LOG%" 2>&1
if errorlevel 1 (
  echo NODE_NO_INSTALADO >> "%LOG%"
  echo.
  echo  Falta Node.js. Opciones:
  echo   1^) Instalar la version LTS desde https://nodejs.org  ^(Windows Installer .msi^)
  echo   2^) Sin permisos de administrador: descargar el .zip de Node para Windows x64,
  echo      descomprimirlo y renombrar la carpeta a "node" dentro de este proyecto.
  echo.
  pause
  exit /b 1
)
node -v >> "%LOG%" 2>&1

echo.
echo  Instalando dependencias (1-2 minutos la primera vez)...
echo ==== NPM INSTALL >> "%LOG%"
call npm install --no-fund --no-audit >> "%LOG%" 2>&1
if errorlevel 1 (
  echo  ERROR en la instalacion. Revise iniciar-log.txt
  pause
  exit /b 1
)

echo  Corriendo pruebas...
echo ==== NPM TEST >> "%LOG%"
call npm test >> "%LOG%" 2>&1
if errorlevel 1 (
  echo  ATENCION: alguna prueba fallo. Revise iniciar-log.txt
) else (
  echo  Pruebas OK.
)

echo.
echo  Levantando la app. Abra en Chrome:  localhost:5173/?demo
echo  (no cierre la ventana "Servidor LDCV")
start "Servidor LDCV - no cerrar" cmd /k "set SIN_HTTPS=1&& npx vite --host --port 5173 --strictPort"
timeout /t 4 >nul
start "" "http://localhost:5173/?demo"
echo ==== SERVIDOR_LANZADO >> "%LOG%"
