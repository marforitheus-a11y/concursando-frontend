# Script de Monitoramento - Ambiente de Teste
# Monitora o status dos serviços e executa testes automáticos

Write-Host ""
Write-Host "🔍 MONITOR DO AMBIENTE DE TESTE" -ForegroundColor Magenta
Write-Host "===============================" -ForegroundColor Magenta
Write-Host ""

function Test-ServiceHealth {
    param($Name, $Url, $Color)
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/health" -Method GET -TimeoutSec 5
        Write-Host "✅ $Name`: " -NoNewline -ForegroundColor Green
        Write-Host "$($response.message)" -ForegroundColor $Color
        return $true
    }
    catch {
        Write-Host "❌ $Name`: " -NoNewline -ForegroundColor Red
        Write-Host "OFFLINE" -ForegroundColor Red
        return $false
    }
}

function Test-QuickAPI {
    try {
        # Teste rápido de login
        $loginData = '{"loginIdentifier":"testeuser","password":"123456"}'
        $login = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" -Method POST -ContentType "application/json" -Body $loginData -TimeoutSec 5
        
        if ($login.success) {
            Write-Host "✅ API Funcionando: Login OK" -ForegroundColor Green
        }
        
        # Teste de temas
        $themes = Invoke-RestMethod -Uri "http://localhost:4000/quiz/themes" -Method GET -TimeoutSec 5
        Write-Host "✅ API Funcionando: $($themes.themes.Count) temas disponíveis" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "❌ API com problemas: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Loop de monitoramento
$iteration = 1
while ($true) {
    Clear-Host
    Write-Host ""
    Write-Host "🔍 MONITOR - Iteração #$iteration" -ForegroundColor Magenta
    Write-Host "Timestamp: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
    Write-Host "===============================" -ForegroundColor Magenta
    Write-Host ""
    
    # Testar serviços
    $frontendOK = Test-ServiceHealth "Frontend" "http://localhost:8080" "Cyan"
    $backendOK = Test-ServiceHealth "Backend " "http://localhost:4000" "Yellow"
    
    Write-Host ""
    
    if ($frontendOK -and $backendOK) {
        Write-Host "🚀 SISTEMA OPERACIONAL" -ForegroundColor Green
        Write-Host ""
        
        # Teste rápido da API
        Test-QuickAPI | Out-Null
        
        Write-Host ""
        Write-Host "📊 URLs Ativas:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:8080" -ForegroundColor White
        Write-Host "   Backend:  http://localhost:4000" -ForegroundColor White
        
    } else {
        Write-Host "⚠️  SISTEMA COM PROBLEMAS" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Verifique se os serviços estão rodando:" -ForegroundColor Yellow
        Write-Host "   Frontend: npm start (pasta test-frontend)" -ForegroundColor White
        Write-Host "   Backend:  node app-simple.js (pasta test-modular)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar o monitor..." -ForegroundColor Gray
    Write-Host ""
    
    # Aguardar 10 segundos
    Start-Sleep -Seconds 10
    $iteration++
}
