const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para o quiz
app.get('/quiz.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'quiz.html'));
});

// Rota para verificar status
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Frontend de teste funcionando!',
        version: '2.0.0-test',
        backend: 'http://localhost:4000'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ======================================');
    console.log('   FRONTEND DE TESTE INICIADO!');
    console.log('🚀 ======================================');
    console.log('');
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log('🔧 Backend:  http://localhost:4000');
    console.log('');
    console.log('📋 Funcionalidades:');
    console.log('   • Login/Cadastro otimizado');
    console.log('   • Sistema de quiz com API modular');
    console.log('   • Interface responsiva');
    console.log('   • Conexão com backend modular');
    console.log('');
    console.log('🔗 Acesse: http://localhost:8080');
    console.log('');
});

// Tratamento de erros
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

module.exports = app;
