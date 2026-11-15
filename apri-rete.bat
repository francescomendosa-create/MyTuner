@echo off
:: Apre la porta 4789 sul firewall Windows (serve un clic su "Si" in Amministratore)
:: cosi tablet e telefono possono raggiungere MyTuner sul PC.
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Richiedo i privilegi di amministratore...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="MyTuner (porta 4789)" >nul 2>&1
netsh advfirewall firewall add rule name="MyTuner (porta 4789)" dir=in action=allow protocol=TCP localport=4789 profile=private,domain
if %errorlevel% equ 0 (
  echo.
  echo Porta 4789 aperta. Dal tablet, stessa Wi-Fi del PC:
  echo   http://192.168.87.81:4789
  echo.
) else (
  echo Errore nell'apertura della porta.
)
pause
