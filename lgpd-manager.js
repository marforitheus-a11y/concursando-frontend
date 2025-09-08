// Funcionalidades LGPD para gerenciamento de consentimentos
class LGPDManager {
    constructor() {
        this.apiBase = '/';
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        this.loadConsents();
        this.setupEventListeners();
        this.updateConsentUI();
    }

    async loadConsents() {
        try {
            const response = await fetch(`${this.apiBase}user/consents`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentConsents = data.consents;
                this.updateConsentToggles();
            }
        } catch (error) {
            console.error('Erro ao carregar consentimentos:', error);
        }
    }

    updateConsentToggles() {
        if (!this.currentConsents) return;

        // Atualizar toggles na interface
        const toggles = {
            'performance-toggle': this.currentConsents.performance_analysis,
            'personalization-toggle': this.currentConsents.personalization,
            'marketing-toggle': this.currentConsents.marketing_emails,
            'analytics-toggle': this.currentConsents.analytics_cookies
        };

        Object.entries(toggles).forEach(([id, value]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = value;
                // Atualizar visual do toggle
                const container = toggle.closest('.consent-toggle');
                if (container) {
                    container.classList.toggle('active', value);
                }
            }
        });

        // Atualizar informações de última atualização
        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated && this.currentConsents.last_updated) {
            const date = new Date(this.currentConsents.last_updated);
            lastUpdated.textContent = `Última atualização: ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR')}`;
        }
    }

    setupEventListeners() {
        // Toggles de consentimento
        const toggles = document.querySelectorAll('.consent-toggle input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.updateConsent(toggle);
            });
        });

        // Botão de salvar alterações
        const saveButton = document.getElementById('save-consents');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveConsents();
            });
        }

        // Botão de exportar dados
        const exportButton = document.getElementById('export-data');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.requestDataExport();
            });
        }

        // Botão de excluir conta
        const deleteButton = document.getElementById('delete-account');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.requestAccountDeletion();
            });
        }

        // Botão de cancelar exclusão
        const cancelDeleteButton = document.getElementById('cancel-deletion');
        if (cancelDeleteButton) {
            cancelDeleteButton.addEventListener('click', () => {
                this.cancelAccountDeletion();
            });
        }
    }

    updateConsent(toggle) {
        const container = toggle.closest('.consent-toggle');
        if (container) {
            container.classList.toggle('active', toggle.checked);
        }

        // Mostrar botão de salvar se houver mudanças
        this.showSaveButton();
    }

    showSaveButton() {
        const saveButton = document.getElementById('save-consents');
        if (saveButton) {
            saveButton.style.display = 'block';
            saveButton.classList.add('pulse');
            setTimeout(() => saveButton.classList.remove('pulse'), 1000);
        }
    }

    async saveConsents() {
        const consents = {
            performance: document.getElementById('performance-toggle')?.checked || false,
            personalization: document.getElementById('personalization-toggle')?.checked || false,
            marketing: document.getElementById('marketing-toggle')?.checked || false,
            analytics: document.getElementById('analytics-toggle')?.checked || false
        };

        try {
            const response = await fetch(`${this.apiBase}user/consents`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ consents })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Consentimentos atualizados com sucesso!', 'success');
                this.hideSaveButton();
                this.loadConsents(); // Recarregar para pegar dados atualizados
            } else {
                this.showNotification(data.message || 'Erro ao atualizar consentimentos', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar consentimentos:', error);
            this.showNotification('Erro de conexão ao salvar consentimentos', 'error');
        }
    }

    hideSaveButton() {
        const saveButton = document.getElementById('save-consents');
        if (saveButton) {
            saveButton.style.display = 'none';
        }
    }

    async requestDataExport() {
        if (!confirm('Deseja solicitar a exportação de todos os seus dados pessoais? Você receberá um email com o link para download em até 72 horas.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}user/export-data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Solicitação de exportação criada com sucesso! Você receberá um email em até 72 horas.', 'success');
            } else {
                this.showNotification(data.message || 'Erro ao solicitar exportação', 'error');
            }
        } catch (error) {
            console.error('Erro ao solicitar exportação:', error);
            this.showNotification('Erro de conexão ao solicitar exportação', 'error');
        }
    }

    async requestAccountDeletion() {
        const confirmation = prompt('Para confirmar a exclusão da sua conta, digite: EXCLUIR MINHA CONTA');
        
        if (confirmation !== 'EXCLUIR MINHA CONTA') {
            this.showNotification('Confirmação incorreta. Exclusão cancelada.', 'warning');
            return;
        }

        if (!confirm('ATENÇÃO: Esta ação é irreversível! Sua conta será excluída permanentemente em 30 dias. Tem certeza?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}user/delete-account`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ confirmation })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Solicitação de exclusão registrada. Sua conta será excluída em 30 dias.', 'warning');
                this.showCancelDeletionOption();
            } else {
                this.showNotification(data.message || 'Erro ao solicitar exclusão', 'error');
            }
        } catch (error) {
            console.error('Erro ao solicitar exclusão:', error);
            this.showNotification('Erro de conexão ao solicitar exclusão', 'error');
        }
    }

    async cancelAccountDeletion() {
        if (!confirm('Deseja cancelar a solicitação de exclusão da sua conta?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}user/cancel-deletion`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Solicitação de exclusão cancelada com sucesso!', 'success');
                this.hideCancelDeletionOption();
            } else {
                this.showNotification(data.message || 'Erro ao cancelar exclusão', 'error');
            }
        } catch (error) {
            console.error('Erro ao cancelar exclusão:', error);
            this.showNotification('Erro de conexão ao cancelar exclusão', 'error');
        }
    }

    showCancelDeletionOption() {
        const cancelButton = document.getElementById('cancel-deletion');
        if (cancelButton) {
            cancelButton.style.display = 'block';
        }
    }

    hideCancelDeletionOption() {
        const cancelButton = document.getElementById('cancel-deletion');
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Remover notificação anterior se existir
        const existingNotification = document.querySelector('.lgpd-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.className = `lgpd-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Adicionar estilos se não existirem
        if (!document.querySelector('#lgpd-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'lgpd-notification-styles';
            styles.textContent = `
                .lgpd-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    padding: 16px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    animation: slideIn 0.3s ease-out;
                }
                .lgpd-notification.success { background: #d4edda; border-left: 4px solid #28a745; color: #155724; }
                .lgpd-notification.error { background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24; }
                .lgpd-notification.warning { background: #fff3cd; border-left: 4px solid #ffc107; color: #856404; }
                .lgpd-notification.info { background: #d1ecf1; border-left: 4px solid #17a2b8; color: #0c5460; }
                .notification-content { display: flex; align-items: center; gap: 10px; }
                .notification-close { background: none; border: none; font-size: 18px; cursor: pointer; margin-left: auto; }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .pulse { animation: pulse 1s; }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto remover após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    updateConsentUI() {
        // Atualizar interface com base nos consentimentos atuais
        this.loadDataRequests();
    }

    async loadDataRequests() {
        try {
            const response = await fetch(`${this.apiBase}user/data-requests`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayDataRequests(data.requests);
            }
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
        }
    }

    displayDataRequests(requests) {
        const container = document.getElementById('data-requests-history');
        if (!container || !requests) return;

        if (requests.length === 0) {
            container.innerHTML = '<p class="no-requests">Nenhuma solicitação encontrada.</p>';
            return;
        }

        const html = requests.map(request => {
            const date = new Date(request.requested_at).toLocaleDateString('pt-BR');
            const statusClass = request.status === 'completed' ? 'success' : 
                               request.status === 'pending' ? 'warning' : 
                               request.status === 'processing' ? 'info' : 'error';
            
            return `
                <div class="request-item ${statusClass}">
                    <div class="request-header">
                        <span class="request-type">${this.getRequestTypeLabel(request.request_type)}</span>
                        <span class="request-status status-${request.status}">${this.getStatusLabel(request.status)}</span>
                    </div>
                    <div class="request-date">Solicitado em: ${date}</div>
                    ${request.response_details ? `<div class="request-response">${request.response_details}</div>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    getRequestTypeLabel(type) {
        const labels = {
            'export': 'Exportação de Dados',
            'delete': 'Exclusão de Conta',
            'correction': 'Correção de Dados',
            'information': 'Informações sobre Dados',
            'portability': 'Portabilidade de Dados'
        };
        return labels[type] || type;
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'Pendente',
            'processing': 'Em Processamento',
            'completed': 'Concluído',
            'cancelled': 'Cancelado',
            'denied': 'Negado'
        };
        return labels[status] || status;
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos na página de consentimentos
    if (document.getElementById('consents-container') || document.querySelector('.consent-toggle')) {
        new LGPDManager();
    }
});

// Função para validar consentimentos no cadastro
function validateSignupConsents() {
    const requiredConsents = ['consent-essential', 'consent-terms'];
    let valid = true;

    requiredConsents.forEach(id => {
        const checkbox = document.getElementById(id);
        if (!checkbox || !checkbox.checked) {
            valid = false;
            if (checkbox) {
                checkbox.style.border = '2px solid #dc3545';
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) {
                    label.style.color = '#dc3545';
                }
            }
        }
    });

    if (!valid) {
        alert('Por favor, aceite os consentimentos obrigatórios para continuar.');
    }

    return valid;
}

// Função para coletar consentimentos do formulário de cadastro
function getSignupConsents() {
    return {
        essential: document.getElementById('consent-essential')?.checked || false,
        terms: document.getElementById('consent-terms')?.checked || false,
        privacy: document.getElementById('consent-privacy')?.checked || false,
        performance: document.getElementById('consent-performance')?.checked || false,
        personalization: document.getElementById('consent-personalization')?.checked || false,
        marketing: document.getElementById('consent-marketing')?.checked || false,
        analytics: document.getElementById('consent-analytics')?.checked || false
    };
}
