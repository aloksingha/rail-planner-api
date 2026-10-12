# TicketsPro API Comprehensive Test Script
$baseUrl = "https://rail-planner-api.onrender.com"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Testing TicketsPro Live APIs on Render   " -ForegroundColor Cyan
Write-Host " Target: $baseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

function Run-Test {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host -NoNewline "[TEST] $Name... "
    try {
        $result = & $Action
        Write-Host "PASSED" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkRed
        return $null
    }
}

# 1. Health Check
$health = Run-Test "Health Check (/health)" {
    Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
}

# 2. Upstream RailRadar Integration
$railradar = Run-Test "Upstream RailRadar Provider (/test-api)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/test-api" -Method Get
    if ($res.status -ne "success") { throw "Upstream API error" }
    $res
}

# 3. Public Settings
$settings = Run-Test "Public Settings (/api/settings)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/settings" -Method Get
    if (-not $res.success) { throw "Failed to load settings" }
    $res
}

# 4. Corridor Pricing Rules
$corridors = Run-Test "Corridor Rules (/api/corridors)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/corridors" -Method Get
    if (-not $res.success) { throw "Failed to load corridors" }
    $res
}

# 5. Station Autocomplete & Search
$stations = Run-Test "Station Search (/api/stations/search?query=DELHI)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/stations/search?query=DELHI" -Method Get
    if (-not $res.success) { throw "Failed to search stations" }
    $res
}

# 6. Train Search Between Stations
$trains = Run-Test "Train Search (/api/trains/getTrainOn)" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/trains/getTrainOn?from=NDLS&to=CNB&date=2026-10-15" -Method Get
    if (-not $res.success) { throw "Failed to search trains" }
    $res
}

# 7. Authentication (Bypass Login)
$token = $null
$auth = Run-Test "Authentication Bypass (/api/auth/bypass)" {
    $body = @{ email = "admin@ticketspro.in"; password = "admin@733215" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/bypass" -Method Post -Body $body -ContentType "application/json"
    if (-not $res.token) { throw "Token not received" }
    $res
}

if ($auth) {
    $token = $auth.token
    $headers = @{ Authorization = "Bearer $token" }

    # 8. Admin User List
    Run-Test "Admin Users List (/api/admin/users)" {
        $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/users?limit=5" -Method Get -Headers $headers
        if (-not $res.success) { throw "Failed to fetch admin users" }
        $res
    }

    # 9. Admin Dashboard Stats
    Run-Test "Admin Dashboard Stats (/api/admin/stats)" {
        $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/stats" -Method Get -Headers $headers
        $res
    }

    # 10. Coupons Management
    Run-Test "Coupons List (/api/coupons)" {
        Invoke-RestMethod -Uri "$baseUrl/api/coupons" -Method Get -Headers $headers
    }
}

# 11. Diagnostic Test Endpoints (Once deployed / running locally)
Write-Host "`nTesting Diagnostic & Health Endpoints (/api/test/*):" -ForegroundColor Yellow
Run-Test "Diagnostic Ping (/api/test/ping)" {
    Invoke-RestMethod -Uri "$baseUrl/api/test/ping" -Method Get
}

Run-Test "Diagnostic DB Latency (/api/test/db)" {
    Invoke-RestMethod -Uri "$baseUrl/api/test/db" -Method Get
}

Run-Test "Diagnostic Cache (/api/test/cache)" {
    Invoke-RestMethod -Uri "$baseUrl/api/test/cache" -Method Get
}

Run-Test "Diagnostic Env Config (/api/test/env)" {
    Invoke-RestMethod -Uri "$baseUrl/api/test/env" -Method Get
}

Run-Test "Diagnostic Full Scorecard (/api/test/all)" {
    Invoke-RestMethod -Uri "$baseUrl/api/test/all" -Method Get
}

Write-Host "`nAll API tests completed!" -ForegroundColor Cyan
