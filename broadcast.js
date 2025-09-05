// arquivo: broadcast.js
const token = localStorage.getItem('token');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ Sua URL correta aqui

// Proteção da página
if (!token) { window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', () => {
    const broadcastForm = document.getElementById('broadcast-form');
    const broadcastStatus = document.getElementById('broadcast-status');
    const logoutBtn = document.getElementById('logout-btn');
    // Adicione a lógica de logout aqui, se desejar...

    broadcastForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        broadcastStatus.textContent = "Enviando mensagem...";
        const message = e.target.message.value;

        try {
            const response = await fetch(`${API_URL}/admin/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: message })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            broadcastStatus.textContent = result.message;
            broadcastStatus.style.color = 'var(--success-color)';
            broadcastForm.reset();
        } catch (error) {
            broadcastStatus.textContent = `Erro: ${error.message}`;
            broadcastStatus.style.color = 'var(--danger-color)';
        }
    });
});