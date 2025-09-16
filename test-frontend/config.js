// ==================================================================
// CONFIGURAÇÃO PARA AMBIENTE DE TESTE - FRONTEND OTIMIZADO
// ==================================================================

// Configuração da API para o backend modular
const CONFIG = {
    // Backend modular rodando na porta 4000
    API_URL: 'http://localhost:4000',
    
    // Endpoints do backend modular
    ENDPOINTS: {
        // Autenticação
        LOGIN: '/auth/login',
        SIGNUP: '/auth/signup',
        VERIFY_TOKEN: '/auth/verify',
        
        // Usuário
        PROFILE: '/auth/profile',
        UPDATE_PROFILE: '/auth/profile',
        DELETE_ACCOUNT: '/auth/delete',
        EXPORT_DATA: '/auth/export',
        
        // Quiz
        THEMES: '/quiz/themes',
        QUESTIONS: '/quiz/questions',
        SUBMIT: '/quiz/submit',
        HISTORY: '/quiz/history',
        REPORT_ERROR: '/quiz/report-error',
        
        // Admin (se necessário)
        ADMIN_DASHBOARD: '/admin/dashboard',
        ADMIN_USERS: '/admin/users'
    },
    
    // Configurações de timeout
    TIMEOUT: 15000,
    
    // Versão do frontend
    VERSION: '2.0.0-test'
};

// Utilitários de API
class ApiClient {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.timeout = CONFIG.TIMEOUT;
    }

    // Método para fazer requisições com timeout
    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const url = this.baseURL + endpoint;
            const token = localStorage.getItem('token');
            
            const defaultOptions = {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            };
            
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Timeout: A requisição demorou muito para responder');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // Métodos específicos
    async login(loginIdentifier, password) {
        return this.request(CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ loginIdentifier, password })
        });
    }

    async signup(userData) {
        return this.request(CONFIG.ENDPOINTS.SIGNUP, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getThemes() {
        return this.request(CONFIG.ENDPOINTS.THEMES);
    }

    async getQuestions(theme, count = 10) {
        return this.request(`${CONFIG.ENDPOINTS.QUESTIONS}?theme=${encodeURIComponent(theme)}&count=${count}`);
    }

    async submitQuiz(answers) {
        return this.request(CONFIG.ENDPOINTS.SUBMIT, {
            method: 'POST',
            body: JSON.stringify(answers)
        });
    }

    async getHistory() {
        return this.request(CONFIG.ENDPOINTS.HISTORY);
    }

    async reportError(errorData) {
        return this.request(CONFIG.ENDPOINTS.REPORT_ERROR, {
            method: 'POST',
            body: JSON.stringify(errorData)
        });
    }
}

// Instância global do cliente da API
window.apiClient = new ApiClient();

// Utilitários de token JWT
window.TokenUtils = {
    parse(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    },

    isExpired(token) {
        const decoded = this.parse(token);
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
    },

    getUserFromToken(token) {
        const decoded = this.parse(token);
        return decoded ? {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            isAdmin: decoded.isAdmin || false
        } : null;
    }
};

// Verificação de autenticação
window.AuthGuard = {
    check() {
        const token = localStorage.getItem('token');
        if (!token || TokenUtils.isExpired(token)) {
            this.redirectToLogin();
            return false;
        }
        return true;
    },

    redirectToLogin() {
        localStorage.clear();
        window.location.href = 'index.html';
    },

    getCurrentUser() {
        const token = localStorage.getItem('token');
        return token ? TokenUtils.getUserFromToken(token) : null;
    }
};

console.log('🚀 Config carregado - Frontend Test v' + CONFIG.VERSION);
console.log('📡 API URL:', CONFIG.API_URL);
