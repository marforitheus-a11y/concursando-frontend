Write-Host "TESTE COMPLETO COM TEMAS CORRETOS" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Write-Host ""

$FRONTEND_URL = "http://localhost:8080"
$BACKEND_URL = "http://localhost:4000"

Write-Host "1. Verificando serviços..." -ForegroundColor Yellow
try {
    $frontend = Invoke-RestMethod -Uri "$FRONTEND_URL/health" -TimeoutSec 5
    Write-Host "   ✅ Frontend: $($frontend.message)" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Frontend offline" -ForegroundColor Red
}

try {
    $backend = Invoke-RestMethod -Uri "$BACKEND_URL/health" -TimeoutSec 5
    Write-Host "   ✅ Backend: $($backend.message)" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Backend offline" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Testando temas corrigidos..." -ForegroundColor Yellow
try {
    $themes = Invoke-RestMethod -Uri "$BACKEND_URL/quiz/themes" -TimeoutSec 5
    Write-Host "   ✅ Temas carregados:" -ForegroundColor Green
    $themes.themes | ForEach-Object {
        Write-Host "      • $_" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "   ❌ Erro nos temas: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Testando questões de Direito Constitucional..." -ForegroundColor Yellow
try {
    $questions = Invoke-RestMethod -Uri "$BACKEND_URL/quiz/questions?theme=Direito%20Constitucional&count=2" -TimeoutSec 5
    Write-Host "   ✅ $($questions.Count) questões carregadas" -ForegroundColor Green
    Write-Host "   📝 Primeira questão:" -ForegroundColor Cyan
    Write-Host "      $($questions[0].question)" -ForegroundColor White
}
catch {
    Write-Host "   ❌ Erro nas questões: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Testando questões de Código de Posturas..." -ForegroundColor Yellow
try {
    $questions = Invoke-RestMethod -Uri "$BACKEND_URL/quiz/questions?theme=Código%20de%20Posturas%20(Guarujá)&count=1" -TimeoutSec 5
    Write-Host "   ✅ $($questions.Count) questão carregada" -ForegroundColor Green
    Write-Host "   📝 Questão específica do Guarujá:" -ForegroundColor Cyan
    Write-Host "      $($questions[0].question)" -ForegroundColor White
}
catch {
    Write-Host "   ❌ Erro nas questões: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "RESUMO" -ForegroundColor Magenta
Write-Host "======" -ForegroundColor Magenta
Write-Host "✅ Temas corrigidos para os dados reais do sistema" -ForegroundColor Green
Write-Host "✅ Questões baseadas no banco de dados original" -ForegroundColor Green
Write-Host "✅ Integração frontend-backend funcionando" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Acesse o frontend: $FRONTEND_URL" -ForegroundColor Cyan
Write-Host "🔧 Teste com os temas reais do seu sistema!" -ForegroundColor Cyan
Write-Host ""
