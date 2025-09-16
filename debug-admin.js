// Script para executar no console do navegador na página admin
// Cria reportes de teste e testa a exclusão de questões

async function debugAdminFunctions() {
    const token = localStorage.getItem('token');
    const API_URL = 'https://quiz-backend-ov0o.onrender.com';
    
    console.log('=== DEBUG ADMIN FUNCTIONS ===');
    console.log('Token:', token ? 'presente' : 'ausente');
    console.log('API_URL:', API_URL);
    
    // 1. Criar reportes de teste
    console.log('\n--- CRIANDO REPORTES DE TESTE ---');
    try {
        const createResponse = await fetch(`${API_URL}/admin/create-test-reports`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Create reports status:', createResponse.status);
        if (createResponse.ok) {
            const result = await createResponse.json();
            console.log('Reportes criados:', result);
        } else {
            const error = await createResponse.text();
            console.error('Erro ao criar reportes:', error);
        }
    } catch (error) {
        console.error('Erro na criação de reportes:', error);
    }
    
    // 2. Testar carregamento de reportes
    console.log('\n--- TESTANDO CARREGAMENTO DE REPORTES ---');
    try {
        const reportsResponse = await fetch(`${API_URL}/admin/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Reports status:', reportsResponse.status);
        if (reportsResponse.ok) {
            const reports = await reportsResponse.json();
            console.log('Reportes encontrados:', reports.length);
            console.log('Dados dos reportes:', reports);
        } else {
            const error = await reportsResponse.text();
            console.error('Erro ao carregar reportes:', error);
        }
    } catch (error) {
        console.error('Erro no carregamento de reportes:', error);
    }
    
    // 3. Testar exclusão de questão
    console.log('\n--- TESTANDO EXCLUSÃO DE QUESTÃO ---');
    try {
        const questionsResponse = await fetch(`${API_URL}/admin/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (questionsResponse.ok) {
            const questions = await questionsResponse.json();
            console.log('Questões disponíveis:', questions.length);
            
            if (questions.length > 0) {
                const questionId = questions[0].id;
                console.log('Testando exclusão da questão ID:', questionId);
                
                // Primeiro verificar dependências
                console.log('Verificando dependências da questão...');
                const depResponse = await fetch(`${API_URL}/admin/questions/${questionId}/dependencies`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (depResponse.ok) {
                    const dependencies = await depResponse.json();
                    console.log('Dependências encontradas:', dependencies);
                } else {
                    console.log('Erro ao verificar dependências:', depResponse.status);
                }
                
                // Agora tentar excluir
                const deleteResponse = await fetch(`${API_URL}/admin/questions/${questionId}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Delete status:', deleteResponse.status);
                console.log('Delete ok:', deleteResponse.ok);
                
                if (deleteResponse.ok) {
                    const result = await deleteResponse.json();
                    console.log('Exclusão bem-sucedida:', result);
                } else {
                    const error = await deleteResponse.text();
                    console.error('Erro na exclusão:', error);
                }
            } else {
                console.log('Nenhuma questão disponível para testar exclusão');
            }
        }
    } catch (error) {
        console.error('Erro no teste de exclusão:', error);
    }
    
    console.log('\n=== FIM DO DEBUG ===');
}

// Execute esta função no console:
console.log('Execute: debugAdminFunctions()');
