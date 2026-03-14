$BackendUrl = "http://localhost:8082"
$Query = "Pizzeria Carlos Rincon"

Write-Host "--- TEST START ---"

# Test 1: Health
try {
    Invoke-WebRequest -Uri "$BackendUrl/webhook/scraper/go" -Method Options -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Host "Check 1: Backend Alive -> OK"
} catch {
    Write-Host "Check 1: Backend Alive -> FAIL"
    exit 1
}

# Test 2: First Search
Write-Host "`nCheck 2: First Search (Cold Cache)"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$body = @{ query = @{ q = $Query } } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/webhook/scraper/go" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 300
    $sw.Stop()
    $elapsed = $sw.Elapsed.TotalSeconds
    
    Write-Host "Result Type: $($response.type)"
    Write-Host "Time: $($elapsed) seconds"
    Write-Host "Cached: $($response.cached)"
    
    if ($elapsed -lt 60) {
        Write-Host "Performance: EXCELLENT (<60s)"
    } else {
        Write-Host "Performance: SLOW (>$elapsed)"
    }
} catch {
    Write-Host "Check 2: Failed. $_"
    exit 1
}

# Test 3: Second Search
Write-Host "`nCheck 3: Second Search (Hot Cache)"
$sw.Restart()
try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/webhook/scraper/go" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    $sw.Stop()
    $elapsed = $sw.Elapsed.TotalSeconds
    
    Write-Host "Time: $($elapsed) seconds"
    Write-Host "Cached: $($response.cached)"
    
    if ($response.cached) {
        Write-Host "Cache Status: HIT (Success)"
    } else {
        Write-Host "Cache Status: MISS (Fail)"
    }
} catch {
    Write-Host "Check 3: Failed. $_"
}

Write-Host "`n--- TEST END ---"
