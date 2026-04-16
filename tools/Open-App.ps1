param(
    [string]$Url = "http://localhost:8080/SistemaInventarioV3/"
)

$ErrorActionPreference = "Stop"

Write-Host "Abriendo aplicacion en: $Url" -ForegroundColor Cyan
Start-Process $Url
