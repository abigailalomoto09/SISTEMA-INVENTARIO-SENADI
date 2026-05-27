$sqlPath = Join-Path $PSScriptRoot "..\inventario_dtic_2026_final.sql"

Write-Host "==> Corrigiendo terminaciones '.0' en códigos de inventario_dtic_2026_final.sql" -ForegroundColor Cyan
$content = Get-Content -Path $sqlPath -Raw

# Expresión regular que busca números enteros seguidos de .0 encerrados en comillas simples
$fixedContent = [regex]::Replace($content, "'(\d+)\.0'", "'`$1'")

Set-Content -Path $sqlPath -Value $fixedContent -Encoding UTF8

Write-Host "✅ Limpieza completada. Códigos SBYE restaurados a enteros." -ForegroundColor Green