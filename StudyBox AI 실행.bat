@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PORT=8000"
set "URL=http://localhost:%PORT%"
set "PYTHON_CMD="

py -3 --version >nul 2>&1
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
) else (
  python -c "import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)" >nul 2>&1
  if errorlevel 1 goto :python_not_found
  set "PYTHON_CMD=python"
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 goto :port_in_use

echo StudyBox AI 서버를 시작합니다.
echo 브라우저에서 %URL% 주소를 엽니다.
echo 서버를 종료하려면 이 창에서 Ctrl+C를 누르세요.
echo.

start "" "%URL%"
%PYTHON_CMD% -m http.server %PORT%

echo.
echo StudyBox AI 서버가 종료되었습니다.
endlocal
exit /b

:port_in_use
echo %PORT%번 포트가 이미 사용 중입니다.
echo 실행 중인 서버 창에서 Ctrl+C를 누른 뒤 다시 실행하세요.
pause
endlocal
exit /b 1

:python_not_found
echo Python 3를 찾을 수 없습니다.
echo Python을 설치하거나 PATH 설정을 확인한 뒤 다시 실행하세요.
pause
endlocal
exit /b 1
