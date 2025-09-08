// Conta.js - Sistema de gerenciamento de conta moderna
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

function resolveApiUrl() {
    try {
        const u = new URL(window.location.href);
        const fromParam = u.searchParams.get('api');
        if (fromParam) { localStorage.setItem('api_url', fromParam); return fromParam; }
    } catch (_) { /* ignore */ }
    const stored = localStorage.getItem('api_url');
    if (stored) return stored;
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    return isLocal ? 'http://localhost:3000' : 'https://quiz-api-z4ri.onrender.com';
}

const API_URL = resolveApiUrl();

if (!token) {
    window.location.href = 'index.html';
}

let originalData = {};
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
    loadAccountData();
    setupEventListeners();
});

function setupEventListeners() {
    const editBtn = document.getElementById('edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const logoutBtn = document.getElementById('logout-btn');

    editBtn?.addEventListener('click', enterEditMode);
    saveBtn?.addEventListener('click', saveChanges);
    cancelBtn?.addEventListener('click', cancelEdit);
    logoutBtn?.addEventListener('click', logout);
}

async function loadAccountData() {
    try {
        showMessage('Carregando informações da conta...', 'info');
        
        const response = await fetch(`${API_URL}/account/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados da conta');
        }

        const data = await response.json();
        originalData = { ...data };
        populateForm(data);
        hideMessage();

    } catch (error) {
        console.error('Erro ao carregar conta:', error);
        showMessage('Erro ao carregar informações da conta. Usando dados locais.', 'error');
        loadFallbackData();
    }
}

function populateForm(data) {
    document.getElementById('username').value = data.username || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('full_name').value = data.full_name || data.name || '';
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('created_at').value = data.created_at ? 
        new Date(data.created_at).toLocaleDateString('pt-BR') : 'Não informado';
    document.getElementById('subscription_status').value = data.subscription_expires_at ? 
        `Ativo até ${new Date(data.subscription_expires_at).toLocaleDateString('pt-BR')}` : 'Gratuito';
}

function loadFallbackData() {
    const fallbackData = {
        username: username || 'Usuário',
        email: '',
        full_name: '',
        phone: '',
        created_at: new Date().toISOString(),
        subscription_status: 'Gratuito'
    };
    
    originalData = { ...fallbackData };
    populateForm(fallbackData);
}

function enterEditMode() {
    isEditMode = true;
    
    // Enable form fields
    const editableFields = ['email', 'full_name', 'phone', 'current_password', 'new_password'];
    editableFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.disabled = false;
        }
    });

    // Show/hide buttons
    document.getElementById('edit-btn').style.display = 'none';
    document.getElementById('save-btn').style.display = 'inline-flex';
    document.getElementById('cancel-btn').style.display = 'inline-flex';
    document.getElementById('password-section').style.display = 'block';

    // Add edit mode class
    document.getElementById('account-form').classList.add('edit-mode');

    showMessage('Modo de edição ativado. Altere os campos desejados e clique em "Salvar".', 'info');
}

function cancelEdit() {
    isEditMode = false;
    
    // Restore original values
    populateForm(originalData);
    
    exitEditMode();
    showMessage('Alterações canceladas.', 'info');
}

function exitEditMode() {
    // Disable form fields
    const editableFields = ['email', 'full_name', 'phone', 'current_password', 'new_password'];
    editableFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.disabled = true;
            if (field.includes('password')) {
                element.value = '';
            }
        }
    });

    // Show/hide buttons
    document.getElementById('edit-btn').style.display = 'inline-flex';
    document.getElementById('save-btn').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
    document.getElementById('password-section').style.display = 'none';

    // Remove edit mode class
    document.getElementById('account-form').classList.remove('edit-mode');
}

async function saveChanges() {
    try {
        const formData = new FormData(document.getElementById('account-form'));
        const updateData = {};
        
        // Collect changed data
        const fields = ['email', 'full_name', 'phone'];
        fields.forEach(field => {
            const value = formData.get(field);
            if (value && value !== originalData[field]) {
                updateData[field] = value;
            }
        });

        // Handle password change
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        if (currentPassword && newPassword) {
            updateData.current_password = currentPassword;
            updateData.new_password = newPassword;
        }

        if (Object.keys(updateData).length === 0) {
            showMessage('Nenhuma alteração detectada.', 'info');
            exitEditMode();
            return;
        }

        showMessage('Salvando alterações...', 'info');

        const response = await fetch(`${API_URL}/account/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar alterações');
        }

        const updatedData = await response.json();
        originalData = { ...originalData, ...updatedData };
        
        exitEditMode();
        showMessage('Informações atualizadas com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao salvar:', error);
        showMessage(error.message || 'Erro ao salvar alterações.', 'error');
    }
}

function showMessage(text, type = 'info') {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `
        <div class="${type}-message">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${text}
        </div>
    `;
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            hideMessage();
        }, type === 'success' ? 3000 : 5000);
    }
}

function hideMessage() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        try {
            fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    }
}