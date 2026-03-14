$queries = @(
    "Peluqueria Stylo Marbella",
    "Restaurante Los Mellizos Marbella",
    "Hotel El Fuerte Marbella",
    "Chiringuito Victors Beach Marbella",
    "Da Bruno Marbella"
)

Write-Host "--- INICIANDO PRUEBA DE ESTRÉS Y CONCURRENCIA ---" -ForegroundColor Cyan
Write-Host "Lanzando $($queries.Count) peticiones simultáneas..."

$jobs = foreach ($q in $queries) {
    Start-Job -ScriptBlock {
        param($query)
        $body = @{ query = @{ q = $query; depth = 1 } } | ConvertTo-Json
        $start = Get-Date
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:8092/webhook/scraper/go" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 600
            $end = Get-Date
            $duration = ($end - $start).TotalSeconds
            return "SUCCESS: '$query' en $($duration)s - Tipo: $($resp.type)"
        } catch {
            return "FAILED: '$query' - Error: $($_.Exception.Message)"
        }
    } -ArgumentList $q
}

Write-Host "Esperando resultados (el Rate Limiter espaciará las ejecuciones)..."
$results = Wait-Job $jobs | Receive-Job
$results | ForEach-Object { Write-Host $_ }

Write-Host "--- PRUEBA FINALIZADA ---" -ForegroundColor Cyan
