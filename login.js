// ARQUIVO login.js - Sistema Moderno com LGPD
// ==================================================================
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:3000' 
    : 'https://quiz-api-z4ri.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');

    const nameGroup = document.getElementById('name-group');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    let isLoginMode = true;

    // Alternar entre Login e Cadastro
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.textContent.includes('Entrar')) {
                isLoginMode = true;
                nameGroup.style.display = 'none';
                usernameInput.placeholder = "Usuário ou E-mail";
                submitBtn.textContent = "Entrar";
                
                // Ocultar seção LGPD no login
                const lgpdSection = document.getElementById('lgpd-consents');
                if (lgpdSection) lgpdSection.style.display = 'none';
            } else {
                isLoginMode = false;
                nameGroup.style.display = 'block';
                usernameInput.placeholder = "Nome de usuário";
                submitBtn.textContent = "Criar Conta";
                
                // Mostrar seção LGPD no cadastro
                const lgpdSection = document.getElementById('lgpd-consents');
                if (lgpdSection) lgpdSection.style.display = 'block';
            }
            errorMessage.textContent = '';
        });
    });

    // Submeter o formulário
    authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (isLoginMode) {
            handleLogin();
        } else {
            handleSignup();
        }
    });

    // Decodificar JWT
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // Fetch com timeout
    function fetchWithTimeout(resource, options = {}) {
        const { timeout = 15000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        return fetch(resource, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
    }

    // Login
    async function handleLogin() {
        errorMessage.textContent = 'Entrando...';
        errorMessage.style.color = 'var(--primary)';

        const loginIdentifier = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!loginIdentifier || !password) {
            errorMessage.textContent = 'Preencha todos os campos.';
            errorMessage.style.color = '#ef4444';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        try {
            const response = await fetchWithTimeout(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginIdentifier, password }),
                timeout: 15000,
            });

            const result = await response.json();

            if (response.ok && result.token) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                // Show success message
                errorMessage.textContent = 'Login realizado com sucesso! Redirecionando...';
                errorMessage.style.color = '#10b981';
                
                setTimeout(() => {
                    window.location.href = 'quiz.html';
                }, 1000);
            } else {
                errorMessage.textContent = result.message || 'Erro no login.';
                errorMessage.style.color = '#ef4444';
            }
        } catch (error) {
            console.error('Erro no login:', error);
            if (error.name === 'AbortError') {
                errorMessage.textContent = 'Timeout: servidor demorou para responder.';
            } else {
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            }
            errorMessage.style.color = '#ef4444';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    }

    // Signup com LGPD
    async function handleSignup() {
        errorMessage.textContent = '';

        const name = document.getElementById('name')?.value.trim();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validações básicas
        if (!name || !username || !email || !password) {
            errorMessage.textContent = 'Preencha todos os campos obrigatórios.';
            errorMessage.style.color = '#ef4444';
            return;
        }

        // Validar consentimentos LGPD obrigatórios
        const essentialConsent = document.getElementById('consent-essential');
        const termsConsent = document.getElementById('consent-terms');

        if (!essentialConsent?.checked || !termsConsent?.checked) {
            errorMessage.textContent = 'É necessário aceitar os consentimentos obrigatórios.';
            errorMessage.style.color = '#ef4444';
            return;
        }

        // Coletar todos os consentimentos
        const consents = {
            essential: essentialConsent.checked,
            termsAccepted: termsConsent.checked,
            privacyPolicyAccepted: document.getElementById('consent-privacy')?.checked || false,
            performance: document.getElementById('consent-performance')?.checked || false,
            personalization: document.getElementById('consent-personalization')?.checked || false,
            marketing: document.getElementById('consent-marketing')?.checked || false,
            analytics: document.getElementById('consent-analytics')?.checked || false
        };

        const gdprCompliance = {
            ipAddress: 'unknown', // Em produção, o servidor captura isso
            userAgent: navigator.userAgent,
            consentMethod: 'explicit_checkbox'
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
        errorMessage.textContent = 'Criando sua conta...';
        errorMessage.style.color = 'var(--primary)';

        try {
            const response = await fetchWithTimeout(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    username,
                    email,
                    password,
                    consents,
                    gdprCompliance
                }),
                timeout: 15000,
            });

            const result = await response.json();

            if (response.ok) {
                // Mostrar modal de sucesso
                showSuccessModal(result, consents);
            } else {
                errorMessage.textContent = result.message || 'Erro ao criar conta.';
                errorMessage.style.color = '#ef4444';
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            if (error.name === 'AbortError') {
                errorMessage.textContent = 'Timeout: servidor demorou para responder.';
            } else {
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            }
            errorMessage.style.color = '#ef4444';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Criar Conta';
        }
    }

    // Modal de sucesso no cadastro
    function showSuccessModal(result, consents) {
        const modal = document.createElement('div');
        modal.className = 'success-modal';
        modal.innerHTML = `
            <div class="success-modal-content">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Conta criada com sucesso!</h3>
                <p>Bem-vindo(a), <strong>${result.user?.name || 'usuário'}</strong>!</p>
                
                <div class="consent-summary">
                    <h4><i class="fas fa-shield-alt"></i> Resumo dos Consentimentos</h4>
                    <div class="consent-list">
                        <div class="consent-item ${consents.essential ? 'accepted' : 'denied'}">
                            <i class="fas ${consents.essential ? 'fa-check' : 'fa-times'}"></i>
                            <span>Dados Essenciais ${consents.essential ? '(Aceito)' : '(Negado)'}</span>
                        </div>
                        <div class="consent-item ${consents.termsAccepted ? 'accepted' : 'denied'}">
                            <i class="fas ${consents.termsAccepted ? 'fa-check' : 'fa-times'}"></i>
                            <span>Termos de Uso ${consents.termsAccepted ? '(Aceito)' : '(Negado)'}</span>
                        </div>
                        <div class="consent-item ${consents.performance ? 'accepted' : 'denied'}">
                            <i class="fas ${consents.performance ? 'fa-check' : 'fa-times'}"></i>
                            <span>Análise de Performance ${consents.performance ? '(Aceito)' : '(Negado)'}</span>
                        </div>
                        <div class="consent-item ${consents.marketing ? 'accepted' : 'denied'}">
                            <i class="fas ${consents.marketing ? 'fa-check' : 'fa-times'}"></i>
                            <span>E-mails Marketing ${consents.marketing ? '(Aceito)' : '(Negado)'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button onclick="this.closest('.success-modal').remove(); switchToLogin();" class="btn-primary">
                        <i class="fas fa-sign-in-alt"></i> Fazer Login
                    </button>
                </div>
                
                <p class="gdpr-note">
                    <i class="fas fa-info-circle"></i>
                    Você pode alterar seus consentimentos a qualquer momento em 
                    <a href="gerenciar-consentimentos.html" target="_blank">Configurações de Privacidade</a>
                </p>
            </div>
        `;

        // Adicionar estilos do modal
        const styles = document.createElement('style');
        styles.textContent = `
            .success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .success-modal-content {
                background: white;
                border-radius: var(--radius-2xl);
                padding: var(--space-2xl);
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                text-align: center;
                box-shadow: var(--shadow-2xl);
                animation: slideInUp 0.4s ease;
            }
            
            .success-icon {
                font-size: 4rem;
                color: #10b981;
                margin-bottom: var(--space-lg);
            }
            
            .success-modal-content h3 {
                color: var(--text-primary);
                margin-bottom: var(--space-md);
                font-size: 1.5rem;
            }
            
            .consent-summary {
                background: var(--gray-50);
                border-radius: var(--radius-lg);
                padding: var(--space-lg);
                margin: var(--space-lg) 0;
                text-align: left;
            }
            
            .consent-summary h4 {
                color: var(--primary);
                margin-bottom: var(--space-md);
                display: flex;
                align-items: center;
                gap: var(--space-xs);
            }
            
            .consent-item {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                margin-bottom: var(--space-xs);
                font-size: 0.9rem;
            }
            
            .consent-item.accepted { color: #10b981; }
            .consent-item.denied { color: var(--gray-500); }
            
            .gdpr-note {
                font-size: 0.8rem;
                color: var(--gray-600);
                margin-top: var(--space-lg);
                padding-top: var(--space-md);
                border-top: 1px solid var(--gray-200);
            }
            
            .gdpr-note a {
                color: var(--primary);
                text-decoration: none;
            }
            
            .gdpr-note a:hover {
                text-decoration: underline;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideInUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(modal);
    }

    // Função para trocar para modo login
    window.switchToLogin = function() {
        const loginBtn = document.querySelector('.toggle-btn');
        if (loginBtn) {
            loginBtn.click();
        }
    };
});
            let data = null;
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { message: text };
            }

            if (!response.ok) {
                const msg = data && data.message ? data.message : `Erro do servidor (${response.status})`;
                throw new Error(msg);
            }

            if (data && data.token) {
                localStorage.setItem('token', data.token);
                const payload = parseJwt(data.token) || {};
                if (payload.username) localStorage.setItem('username', payload.username);

                if (payload && payload.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'quiz.html';
                }
            } else {
                throw new Error('Resposta inválida do servidor.');
            }
        } catch (error) {
            const msg = (error && error.message) ? error.message : 'Erro ao fazer login.';
            errorMessage.textContent = msg;
            errorMessage.style.color = 'red';
            console.error('handleLogin error:', error);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; }
        }
    }

    // Cadastro
    async function handleSignup() {
        errorMessage.textContent = 'Criando conta...';
        errorMessage.style.color = 'orange';

        const name = document.getElementById('name').value.trim();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!name || !username || !email || !password) {
            errorMessage.textContent = 'Preencha todos os campos.';
            errorMessage.style.color = 'red';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            errorMessage.textContent = 'Conta criada com sucesso! Faça o login.';
            errorMessage.style.color = 'lightgreen';

            setTimeout(() => {
                toggleButtons[0].click(); // Volta para login
            }, 2000);

        } catch (error) {
            errorMessage.textContent = error.message || 'Erro ao criar conta.';
            errorMessage.style.color = 'red';
        }
    }
});