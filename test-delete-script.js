// Execute este código no console do navegador (F12) na página admin.html

// Função de teste para verificar se a exclusão funciona
async function testDeleteQuestion() {
    // Primeiro vamos ver se temos token
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'presente' : 'ausente');
    
    if (!token) {
        console.log('Faça login primeiro!');
        return;
    }
    
    // Vamos primeiro buscar as questões para ver qual ID podemos usar
    try {
        const response = await fetch('http://localhost:3000/admin/questions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const questions = await response.json();
            console.log('Questões disponíveis:', questions);
            
            if (questions.length > 0) {
                const questionId = questions[0].id;
                console.log('Testando exclusão da questão ID:', questionId);
                
                // Agora vamos tentar excluir
                const deleteResponse = await fetch(`http://localhost:3000/admin/questions/${questionId}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Delete Response status:', deleteResponse.status);
                console.log('Delete Response ok:', deleteResponse.ok);
                
                if (deleteResponse.ok) {
                    const result = await deleteResponse.json();
                    console.log('Sucesso!', result);
                } else {
                    const error = await deleteResponse.json();
                    console.log('Erro na exclusão:', error);
                }
            } else {
                console.log('Nenhuma questão encontrada para testar');
            }
        } else {
            console.log('Erro ao buscar questões:', response.status);
        }
    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

// Execute esta função:
console.log('Execute: testDeleteQuestion()');
