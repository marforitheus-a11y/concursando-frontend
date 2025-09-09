// ==================================================================
// ARQUIVO quiz.js (ATUALIZADO COM FEEDBACK VISUAL E GRID DE TEMAS)
// ==================================================================

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
    // no token => redirect to login
    window.location.href = 'index.html';
}

let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;
let lastMessageTimestamp = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DE ELEMENTOS ---
    const mainContent = document.getElementById('main-content');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const logoutBtnMenu = document.getElementById('logout-btn-menu');
    const modal = document.getElementById('global-message-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // --- LÓGICA DO MENU LATERAL ---
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => { 
        sidebarMenu.classList.add('active'); 
        menuOverlay.classList.add('active'); 
    });
    if (menuOverlay) menuOverlay.addEventListener('click', () => { 
        sidebarMenu.classList.remove('active'); 
        menuOverlay.classList.remove('active'); 
    });
    if (logoutBtnMenu) {
        logoutBtnMenu.addEventListener('click', async () => {
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });
            } finally {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            }
        });
    }

    // --- LÓGICA DO MODAL DE MENSAGEM ---
    if (modal && closeModalBtn) {
        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
        setInterval(() => checkForMessages(modal), 15000);
    }

    // --- CARREGAMENTO INICIAL DO CONTEÚDO ---
    loadThemes();
    
    // --- CARREGAR ESTATÍSTICAS DO CABEÇALHO ---
    updateHeaderStats();
    
    // --- EVENT LISTENER PARA INICIAR SIMULADO ---
    const startQuizBtn = document.getElementById('start-quiz');
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', () => {
            startQuizFromNewInterface();
        });
    }
});

async function updateHeaderStats() {
    try {
        // Atualizar timer (começar do zero)
        const timerElement = document.getElementById('quiz-timer');
        if (timerElement) {
            timerElement.textContent = '00:00';
        }

        // Atualizar contador de questões
        const questionCountElement = document.getElementById('quiz-question-count');
        if (questionCountElement) {
            questionCountElement.textContent = '0 / 0';
        }

        // Buscar estatísticas do usuário
        const response = await fetch(`${API_URL}/user/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const stats = await response.json();
            
            // Atualizar precisão baseada nas estatísticas do usuário
            const accuracyElement = document.getElementById('quiz-accuracy');
            if (accuracyElement && stats.accuracy !== undefined) {
                accuracyElement.textContent = `${Math.round(stats.accuracy)}%`;
            } else if (accuracyElement) {
                accuracyElement.textContent = '0%';
            }
        } else {
            // Fallback para valores padrão
            const accuracyElement = document.getElementById('quiz-accuracy');
            if (accuracyElement) {
                accuracyElement.textContent = '0%';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Manter valores padrão em caso de erro
    }
}


// --- FUNÇÕES DE LÓGICA DO QUIZ ---

async function loadThemes() {
    try {
        const response = await fetch(`${API_URL}/themes`, { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        const themes = await response.json();
        
        populateSubjectSelect(themes);
        setupThemeSelection(themes);
    } catch (error) {
        console.error("Erro em loadThemes:", error);
        showError('Não foi possível carregar as disciplinas. Verifique sua conexão.');
    }
}

function populateSubjectSelect(themes) {
    const subjectSelect = document.getElementById('subject-select');
    if (!subjectSelect) {
        console.error('Elemento subject-select não encontrado');
        return;
    }

    // Clear existing options except the first one
    subjectSelect.innerHTML = '<option value="">Selecione uma disciplina</option>';

    // Group themes by category
    const grouped = {};
    themes.forEach(theme => {
        const categoryId = theme.category_id || 'uncategorized';
        const categoryName = theme.category_name || 'Sem categoria';
        
        if (!grouped[categoryId]) {
            grouped[categoryId] = {
                id: categoryId,
                name: categoryName,
                themes: []
            };
        }
        grouped[categoryId].themes.push(theme);
    });

    // Add options to select
    Object.values(grouped).forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.name} (${category.themes.length} temas)`;
        subjectSelect.appendChild(option);
    });
}

function setupThemeSelection(allThemes) {
    const subjectSelect = document.getElementById('subject-select');
    
    // Remover container existente se houver
    const existingContainer = document.getElementById('themes-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Criar container para temas
    const themesContainer = document.createElement('div');
    themesContainer.id = 'themes-container';
    themesContainer.innerHTML = `
        <div class="quiz-form-section" id="themes-section" style="display: none;">
            <h3><i class="fas fa-list"></i> Selecione os Temas</h3>
            <div id="themes-list" class="themes-list"></div>
        </div>
    `;
    
    // Inserir após a seção de disciplina (que é a primeira)
    const disciplineSection = document.querySelector('.quiz-form-section');
    if (disciplineSection && disciplineSection.parentNode) {
        // Inserir após a seção de disciplina
        disciplineSection.parentNode.insertBefore(themesContainer, disciplineSection.nextSibling);
    }

    // Event listener para mudança de disciplina
    subjectSelect.addEventListener('change', function() {
        const selectedCategoryId = this.value;
        const themesSection = document.getElementById('themes-section');
        const themesList = document.getElementById('themes-list');
        
        if (selectedCategoryId) {
            // Filtrar temas da categoria selecionada
            const categoryThemes = allThemes.filter(theme => 
                theme.category_id == selectedCategoryId
            );
            
            if (categoryThemes.length > 0) {
                // Mostrar seção de temas
                themesSection.style.display = 'block';
                
                // Gerar lista de temas (DESMARCAR por padrão, usuário seleciona o que quer)
                themesList.innerHTML = categoryThemes.map(theme => `
                    <div class="theme-item">
                        <label class="theme-label">
                            <input type="checkbox" name="theme" value="${theme.id}">
                            <div class="theme-info">
                                <span class="theme-name">${theme.name}</span>
                                <span class="theme-count">${theme.question_count || 0} questões</span>
                            </div>
                        </label>
                    </div>
                `).join('');
                
                // Adicionar CSS para os temas se não existir
                if (!document.getElementById('themes-styles')) {
                    const style = document.createElement('style');
                    style.id = 'themes-styles';
                    style.textContent = `
                        .themes-list {
                            display: grid;
                            gap: 0.75rem;
                            margin-top: 1rem;
                        }
                        
                        .theme-item {
                            background: rgba(255, 255, 255, 0.7);
                            border: 2px solid #e5e7eb;
                            border-radius: 12px;
                            padding: 1rem;
                            transition: all 0.2s ease;
                        }
                        
                        .theme-item:hover {
                            border-color: #4f46e5;
                            background: rgba(255, 255, 255, 0.9);
                        }
                        
                        .theme-label {
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            cursor: pointer;
                            width: 100%;
                        }
                        
                        .theme-label input[type="checkbox"] {
                            width: 18px;
                            height: 18px;
                            accent-color: #4f46e5;
                        }
                        
                        .theme-info {
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                            flex: 1;
                        }
                        
                        .theme-name {
                            font-weight: 500;
                            color: #374151;
                        }
                        
                        .theme-count {
                            font-size: 0.875rem;
                            color: #6b7280;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            // Esconder seção de temas
            themesSection.style.display = 'none';
        }
    });
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #fee2e2;
        color: #dc2626;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        border: 1px solid #fecaca;
    `;
    errorDiv.textContent = message;
    
    const setupDiv = document.getElementById('quiz-setup');
    if (setupDiv) {
        setupDiv.insertBefore(errorDiv, setupDiv.firstChild);
    }
}

function displaySetupScreen(mainContent, themes = []) {
        // group themes by category
        const grouped = {};
        const uncategorized = { id: '__uncategorized__', name: 'Sem categoria', themes: [] };
        themes.forEach(t => {
            // use parent category as top-level group when available, and keep subcategory info on the theme
            const topId = t.parent_cat_id || t.category_id || uncategorized.id;
            const topName = t.parent_cat_name || t.category_name || 'Sem categoria';
            if (!grouped[topId]) grouped[topId] = { id: topId, name: topName, themes: [] };
            // attach subcategory info to theme object for later grouping in UI
            t._subcategory_id = t.category_id || null;
            t._subcategory_name = (t.category_id && t.category_name) ? t.category_name : 'Sem subcategoria';
            grouped[topId].themes.push(t);
        });

        const groups = Object.values(grouped);
        if (uncategorized.themes.length) groups.push(uncategorized);

        // build category checkboxes (one per group)
    // compute category map and subcategories for selects
    const categoryMap = {};
    groups.forEach(g => { categoryMap[g.id] = { id: g.id, name: g.name, themes: g.themes, subcats: {} }; });
    // try to infer subcategory_id from themes and group them
    groups.forEach(g => {
        g.themes.forEach(t => {
            // use the _subcategory_* fields we attached earlier (was mistakenly using non-underscored props)
            const subId = t._subcategory_id || '__uncat__';
            const subName = t._subcategory_name || (subId === '__uncat__' ? 'Sem subcategoria' : 'Subcategoria');
            if (!categoryMap[g.id].subcats[subId]) categoryMap[g.id].subcats[subId] = { id: subId, name: subName, themes: [] };
            categoryMap[g.id].subcats[subId].themes.push(t);
        });
    });

    // build discipline (category) select options
    const disciplineOptions = Object.values(categoryMap).map(g => `<option value="${g.id}">${g.name} (${g.themes.length})</option>`).join('\n');

        let themeHTML = '';
        if (groups.length === 0) {
            themeHTML = '<p>Nenhum tema encontrado. Adicione um tema no Painel de Admin.</p>';
        } else {
            // controls row with discipline/subject selects
            // Note: removed 'Assunto' select for improved mobile layout. Only 'Disciplina' is shown.
            themeHTML = `<div class="select-pair"><div class="select-box"><label class="select-label">Disciplina</label><select id="discipline-select"><option value="">Selecione a disciplina</option>${disciplineOptions}</select></div></div>`;
            // build flattened rows for table: only theme, question_count and description (keep catId for filtering)
            const rows = [];
            Object.values(categoryMap).forEach(cat => {
                const seen = new Set();
                Object.values(cat.subcats).forEach(sub => {
                    sub.themes.forEach(theme => {
                        if (seen.has(theme.id)) return;
                        seen.add(theme.id);
                        rows.push({ catId: cat.id, subId: theme._subcategory_id || '', themeId: theme.id, themeName: theme.name, desc: theme.description || '', question_count: theme.question_count || 0 });
                    });
                });
            });

                                    // render as a flex-based list with two columns: Tema (checkbox + title/desc) and Quantidade de questões
                                    // header uses id #themes-table-head so JS can toggle visibility when no discipline selected
                                    themeHTML += `<div class="scroll-table" style="margin-top:12px"><div class="themes-table"><div id="themes-table-head" class="themes-head"><div class="head-left">Tema</div><div class="head-count">Quantidade de questões</div></div><div class="themes-body">`;
                                    rows.forEach(r => {
                                            const subAttr = r.subId ? ` data-sub-id="${r.subId}"` : '';
                                            themeHTML += `
                                                <div class="theme-row" data-cat-id="${r.catId}" data-theme-id="${r.themeId}" data-qcount="${r.question_count}"${subAttr}>
                                                    <label class="theme-left">
                                                        <input type="checkbox" name="theme" value="${r.themeId}">
                                                        <div>
                                                            <div class="theme-name">${r.themeName}</div>
                                                            <div class="theme-desc">${r.desc}</div>
                                                        </div>
                                                    </label>
                                                    <div class="theme-count">${r.question_count}</div>
                                                </div>`;
                                    });
                                    themeHTML += `</div></div></div>`;
        }

        mainContent.innerHTML = `
        <div id="setup-screen">
            <h2>Crie seu Simulado</h2>
            <div id="theme-selection">
                <h3>1. Selecione os Temas</h3>
                ${themeHTML}
            </div>
                        <div class="controls-row">
                            <div style="display:flex;gap:8px;align-items:center">
                                <label style="font-weight:600">Dificuldades:</label>
                                <label><input type="checkbox" name="difficulty" value="easy" checked> Fácil</label>
                                <label><input type="checkbox" name="difficulty" value="medium"> Média</label>
                                <label><input type="checkbox" name="difficulty" value="hard"> Difícil</label>
                            </div>
                            <input type="number" id="question-count" value="5" min="1" class="input" style="width:120px">
                            <button id="start-btn" class="btn-main">Iniciar Simulado</button>
                        </div>
        </div>
    `;
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => startQuiz(mainContent));
    // allow Enter key on question count to start
    const questionCountInput = document.getElementById('question-count');
    if (questionCountInput) questionCountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startBtn.click();
    });
    // when difficulty checkboxes change or themes change, update available counts
    function getSelectedDifficulties() {
        return Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(cb => cb.value);
    }
    async function refreshCountsForSelectedThemes() {
        const selectedThemes = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
        const difficulties = getSelectedDifficulties();
        const countInput = document.getElementById('question-count');
        if (selectedThemes.length === 0) return;
        try {
            // Try primary endpoint, then fall back to compatibility aliases (handles older backends)
            async function tryCounts() {
                // 1) POST /questions/counts
                let r = await fetch(`${API_URL}/questions/counts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ themeIds: selectedThemes })
                });
                if (r.ok) return r.json();
                // 2) GET /questions/counts?themeIds=1,2
                r = await fetch(`${API_URL}/questions/counts?themeIds=${encodeURIComponent(selectedThemes.join(','))}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (r.ok) return r.json();
                // 3) POST /questions/count
                r = await fetch(`${API_URL}/questions/count`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ themeIds: selectedThemes })
                });
                if (r.ok) return r.json();
                // 4) GET /questions/count?themeIds=...
                r = await fetch(`${API_URL}/questions/count?themeIds=${encodeURIComponent(selectedThemes.join(','))}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (r.ok) return r.json();
                throw new Error('Nenhuma rota /questions/count(s) disponível');
            }

            const data = await tryCounts();
            // compute total: if single difficulty selected, show only that difficulty count;
            // if multiple selected, sum them
            let total = 0;
            if (difficulties.length === 1) {
                const d = difficulties[0];
                total = Number(data[d] || 0);
            } else {
                difficulties.forEach(d => { if (data[d]) total += Number(data[d]); });
            }
            // set max and value accordingly
            countInput.max = String(total);
            const startBtnEl = document.getElementById('start-btn');
            if (total <= 0) {
                countInput.value = 0;
                if (startBtnEl) startBtnEl.disabled = true;
            } else {
                const cur = parseInt(countInput.value, 10) || 0;
                // keep current if within range, otherwise set to total (or 1 as minimum)
                const newVal = Math.min(Math.max(cur, 1), total);
                countInput.value = newVal;
                if (startBtnEl) startBtnEl.disabled = false;
            }
        } catch (err) {
            console.warn('refreshCounts failed', err);
            // Fallback: sum selected themes' per-theme counts if available; otherwise keep Start enabled with a default max
            const rows = Array.from(document.querySelectorAll('.theme-row input[name="theme"]:checked')).map(cb => cb.closest('.theme-row'));
            let total = rows.reduce((sum, row) => sum + (parseInt(row.getAttribute('data-qcount'), 10) || 0), 0);
            // Deep fallback: try to infer availability by requesting many questions and counting the response length
            if (!total) {
                try {
                    const controller = new AbortController();
                    const t = setTimeout(() => controller.abort(), 5000);
                    const r = await fetch(`${API_URL}/questions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ themeIds: selectedThemes, count: 9999, difficulties }),
                        signal: controller.signal
                    });
                    clearTimeout(t);
                    if (r.ok) {
                        const arr = await r.json();
                        if (Array.isArray(arr)) total = arr.length;
                    }
                } catch (_) { /* ignore */ }
            }
            const startBtnEl = document.getElementById('start-btn');
            if (total > 0) {
                countInput.max = String(total);
                const cur = parseInt(countInput.value, 10) || 0;
                const newVal = Math.min(Math.max(cur, 1), total);
                countInput.value = newVal;
                if (startBtnEl) startBtnEl.disabled = false;
            } else {
                countInput.max = '200';
                if (!countInput.value || parseInt(countInput.value, 10) <= 0) countInput.value = 5;
                if (startBtnEl) startBtnEl.disabled = false;
            }
        }
    }
    // wire difficulty and theme checkboxes to refresh counts
    document.querySelectorAll('input[name="difficulty"]').forEach(cb => cb.addEventListener('change', refreshCountsForSelectedThemes));
    // also refresh when theme checkboxes change
    document.addEventListener('change', (e) => { if (e.target && e.target.name === 'theme') refreshCountsForSelectedThemes(); });
    // run once to initialize counts (in case themes are pre-selected)
    setTimeout(() => refreshCountsForSelectedThemes(), 250);
    // try to populate per-theme counts from server for accuracy
    (async function hydrateThemeCounts() {
        try {
            const ids = Array.from(document.querySelectorAll('.theme-row[data-theme-id]')).map(r => parseInt(r.getAttribute('data-theme-id'), 10)).filter(Boolean);
            if (ids.length === 0) return;
            // prefer a single call returning counts grouped by theme
            let r = await fetch(`${API_URL}/questions/counts-by-theme?themeIds=${encodeURIComponent(ids.join(','))}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!r.ok) {
                // fallback to POST
                r = await fetch(`${API_URL}/questions/counts-by-theme`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ themeIds: ids })
                });
            }
            if (r.ok) {
                const data = await r.json(); // { [themeId]: { easy, medium, hard } }
                Array.from(document.querySelectorAll('.theme-row[data-theme-id]')).forEach(row => {
                    const tid = parseInt(row.getAttribute('data-theme-id'), 10);
                    const counts = data[tid];
                    if (counts) {
                        const total = Number(counts.easy || 0) + Number(counts.medium || 0) + Number(counts.hard || 0);
                        row.setAttribute('data-qcount', String(total));
                        const el = row.querySelector('.theme-count');
                        if (el) el.textContent = String(total);
                    }
                });
            }
        } catch (_) { /* silent; UI already shows base counts */ }
    })();
    // discipline select behavior: filter rows by selected discipline
    const disciplineSelect = document.getElementById('discipline-select');
    // subjectSelect intentionally omitted (removed from DOM for mobile-friendly layout)

    // helper: build subject options for a discipline
    // simplified: no subject select; just update visibility based on discipline
    function populateSubjectsForDiscipline(did) {
        // no subject select in this layout; just update theme row visibility
        updateThemeRowsVisibility();
    }

    // show/hide table header when a discipline is selected
    function toggleTableHeader() {
        const thead = document.getElementById('themes-table-head');
        if (!thead) return;
        // header is a flex-based div now; show when a discipline is selected
        if (disciplineSelect.value) thead.style.display = 'flex';
        else thead.style.display = 'none';
    }

    function updateThemeRowsVisibility() {
        const did = disciplineSelect.value;
        const sid = null; // subject not used in new layout
        // select the div-based theme rows (refactor from table -> flex rows)
        const rows = Array.from(document.querySelectorAll('.theme-row[data-cat-id]'));
        rows.forEach(r => {
            const cid = r.getAttribute('data-cat-id');
            const rowSub = r.getAttribute('data-sub-id');
            // hide if no discipline selected
            if (!did) { r.style.display = 'none'; return; }
            // hide rows that don't belong to the selected discipline
            if (cid !== did) { r.style.display = 'none'; return; }
            // subject filtering removed in this layout
            // otherwise show
            r.style.display = '';
        });
    }

    disciplineSelect.addEventListener('change', (e) => populateSubjectsForDiscipline(e.target.value));
    // initially hide all rows until selection
    updateThemeRowsVisibility();
    // initialize header visibility
    toggleTableHeader();

    disciplineSelect.addEventListener('change', toggleTableHeader);
}

async function startQuizFromNewInterface() {
    // Coletar temas selecionados
    const selectedThemeIds = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
    
    // Coletar dificuldades selecionadas
    const difficultyCheckboxes = [
        document.getElementById('difficulty-easy'),
        document.getElementById('difficulty-medium'),
        document.getElementById('difficulty-hard')
    ];
    const selectedDifficulties = difficultyCheckboxes
        .filter(cb => cb && cb.checked)
        .map(cb => cb.value);
    
    // Coletar número de questões
    const questionCountInput = document.getElementById('question-count');
    const numQuestions = questionCountInput ? parseInt(questionCountInput.value, 10) : 5;
    
    // Validações
    if (selectedDifficulties.length === 0) {
        alert('Por favor, selecione pelo menos uma dificuldade.');
        return;
    }
    
    if (selectedThemeIds.length === 0) {
        alert('Por favor, selecione pelo menos um tema.');
        return;
    }
    
    if (isNaN(numQuestions) || numQuestions <= 0) {
        alert('Número de questões inválido.');
        return;
    }
    
    try {
        // Mostrar loading
        const startBtn = document.getElementById('start-quiz');
        if (!startBtn) return;
        
        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        startBtn.disabled = true;
        
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                themeIds: selectedThemeIds, 
                count: numQuestions, 
                difficulties: selectedDifficulties 
            })
        });
        
        if (!response.ok) {
            const txt = await response.text();
            console.error('Erro ao buscar questões:', response.status, txt);
            alert('Não foi possível buscar questões do servidor.');
            // Restaurar botão em caso de erro
            startBtn.innerHTML = originalText;
            startBtn.disabled = false;
            return;
        }
        
        questionsToAsk = await response.json();
        
        if (!questionsToAsk || questionsToAsk.length === 0) {
            alert('Não foram encontradas questões para os temas e dificuldades selecionados.');
            // Restaurar botão em caso de erro
            startBtn.innerHTML = originalText;
            startBtn.disabled = false;
            return;
        }
        
        // Inicializar variáveis do quiz
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        
        // Esconder setup e mostrar quiz
        document.getElementById('quiz-setup').style.display = 'none';
        document.getElementById('quiz-content').style.display = 'block';
        
        // Inicializar barra de progresso
        const progressFill = document.getElementById('quiz-progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
            
            // Adicionar texto de porcentagem inicial
            const progressContainer = progressFill.parentElement;
            let progressText = progressContainer.querySelector('.quiz-progress-text');
            if (!progressText) {
                progressText = document.createElement('div');
                progressText.className = 'quiz-progress-text';
                progressContainer.appendChild(progressText);
            }
            progressText.textContent = '0%';
        }
        
        // Iniciar primeira questão
        displayQuestion();
        
        // Restaurar botão após sucesso
        startBtn.innerHTML = originalText;
        startBtn.disabled = false;
        
    } catch (error) {
        console.error('Erro ao iniciar simulado:', error);
        alert('Erro ao iniciar simulado. Tente novamente.');
        
        // Restaurar botão em caso de erro
        const startBtn = document.getElementById('start-quiz');
        if (startBtn) {
            startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Simulado';
            startBtn.disabled = false;
        }
    }
}

async function startQuiz(mainContent) {
    const selectedThemeIds = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
    const numQuestions = parseInt(document.getElementById('question-count').value, 10);
    const selectedDifficulties = Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(cb => cb.value);
    if (selectedDifficulties.length === 0) { alert('Por favor, selecione pelo menos uma dificuldade.'); return; }
    if (selectedThemeIds.length === 0) { alert("Por favor, selecione pelo menos um tema."); return; }
    if (isNaN(numQuestions) || numQuestions <= 0) { alert(`Número de questões inválido.`); return; }

    try {
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ themeIds: selectedThemeIds, count: numQuestions, difficulties: selectedDifficulties })
        });
        if (!response.ok) {
            const txt = await response.text();
            console.error('startQuiz fetch questions failed', response.status, txt);
            alert('Não foi possível buscar questões do servidor.');
            return;
        }
        questionsToAsk = await response.json();
        if (!questionsToAsk || questionsToAsk.length === 0) {
            alert('Não foi possível buscar questões para os temas selecionados.');
            return;
        }
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        displayQuestion(mainContent);
    } catch (error) {
        alert('Erro ao buscar questões.');
        console.error(error);
    }
}

function displayQuestion(mainContent = null) {
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D', 'E'];
    
    // Usar o container específico se mainContent não for fornecido
    const questionContainer = mainContent || document.getElementById('quiz-question');
    if (!questionContainer) {
        console.error('Container de questão não encontrado');
        return;
    }
    
    // Atualizar contador de questões no cabeçalho
    const questionCountElement = document.getElementById('quiz-question-count');
    if (questionCountElement) {
        questionCountElement.textContent = `${currentQuestionIndex + 1} / ${questionsToAsk.length}`;
    }
    
    // Atualizar barra de progresso
    const progressFill = document.getElementById('quiz-progress-fill');
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / questionsToAsk.length) * 100;
        progressFill.style.width = `${Math.round(progress)}%`;
        
        // Adicionar ou atualizar texto de porcentagem
        const progressContainer = progressFill.parentElement;
        let progressText = progressContainer.querySelector('.quiz-progress-text');
        if (!progressText) {
            progressText = document.createElement('div');
            progressText.className = 'quiz-progress-text';
            progressContainer.appendChild(progressText);
        }
        progressText.textContent = `${Math.round(progress)}%`;
    }
    
    const optionsHTML = currentQuestion.options.map((option, index) => 
        `<div class="quiz-option" data-index="${index}">
            <span class="option-letter">${letters[index]}</span>
            <span class="option-text">${option}</span>
        </div>`
    ).join('');

    questionContainer.innerHTML = `
        <div class="quiz-question-header">
            <h3>Questão ${currentQuestionIndex + 1} de ${questionsToAsk.length}</h3>
            <div class="quiz-theme">${currentQuestion.theme_name || 'Tema'}</div>
        </div>
        
        <div class="quiz-question-text">
            ${currentQuestion.question}
        </div>
        
        <div class="quiz-options">
            ${optionsHTML}
        </div>
        
        <div class="quiz-actions">
            <button id="quiz-respond-btn" class="quiz-btn quiz-btn-primary" disabled>
                <i class="fas fa-check"></i>
                Responder
            </button>
            <button id="quiz-skip-btn" class="quiz-btn quiz-btn-secondary">
                <i class="fas fa-forward"></i>
                Pular
            </button>
        </div>
    `;

    // Adicionar CSS para questões se não existir
    if (!document.getElementById('quiz-question-styles')) {
        const style = document.createElement('style');
        style.id = 'quiz-question-styles';
        style.textContent = `
            .quiz-question-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .quiz-question-header h3 {
                color: #4f46e5;
                margin-bottom: 0.5rem;
            }
            
            .quiz-theme {
                background: #e0e7ff;
                color: #4f46e5;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                display: inline-block;
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .quiz-question-text {
                background: rgba(255, 255, 255, 0.9);
                padding: 2rem;
                border-radius: 16px;
                margin-bottom: 2rem;
                font-size: 1.125rem;
                line-height: 1.6;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }
            
            .quiz-options {
                display: grid;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .quiz-option {
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 1rem 1.5rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .quiz-option:hover {
                border-color: #4f46e5;
                background: rgba(255, 255, 255, 1);
                transform: translateY(-1px);
            }
            
            .quiz-option.selected {
                border-color: #4f46e5;
                background: #f0f4ff;
            }
            
            .option-letter {
                background: #4f46e5;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                flex-shrink: 0;
            }
            
            .option-text {
                flex: 1;
                font-size: 1rem;
            }
            
            .quiz-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            
            .quiz-btn {
                padding: 0.75rem 2rem;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .quiz-btn-primary {
                background: #4f46e5;
                color: white;
            }
            
            .quiz-btn-primary:hover:not(:disabled) {
                background: #4338ca;
                transform: translateY(-1px);
            }
            
            .quiz-btn-primary:disabled {
                background: #9ca3af;
                cursor: not-allowed;
            }
            
            .quiz-btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 2px solid #e5e7eb;
            }
            
            .quiz-btn-secondary:hover {
                background: #e5e7eb;
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }

    // Event listeners para seleção de opções
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remover seleção anterior
            document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
            
            // Selecionar esta opção
            this.classList.add('selected');
            
            // Habilitar botão responder
            const respondBtn = document.getElementById('quiz-respond-btn');
            if (respondBtn) {
                respondBtn.disabled = false;
            }
        });
    });

    // Event listener para responder
    const respondBtn = document.getElementById('quiz-respond-btn');
    if (respondBtn) {
        respondBtn.addEventListener('click', () => {
            const selectedOption = document.querySelector('.quiz-option.selected');
            if (!selectedOption) {
                alert('Selecione uma opção antes de responder.');
                return;
            }
            
            // Chamar selectAnswer para mostrar feedback visual
            selectAnswer(selectedOption, mainContent);
        });
    }

    // Event listener para pular
    const skipBtn = document.getElementById('quiz-skip-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            userAnswers.push(-1); // -1 indica questão pulada
            nextQuestion();
        });
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < questionsToAsk.length) {
        displayQuestion();
    } else {
        showQuizResults();
    }
}

function showQuizResults() {
    const accuracy = questionsToAsk.length > 0 ? Math.round((score / questionsToAsk.length) * 100) : 0;
    
    // Atualizar estatísticas no cabeçalho
    const accuracyElement = document.getElementById('quiz-accuracy');
    if (accuracyElement) {
        accuracyElement.textContent = `${accuracy}%`;
    }
    
    const questionContainer = document.getElementById('quiz-question');
    if (questionContainer) {
        questionContainer.innerHTML = `
            <div class="quiz-results">
                <div class="results-header">
                    <h2>Simulado Concluído!</h2>
                    <div class="results-score">
                        <span class="score-number">${score}</span>
                        <span class="score-total">/ ${questionsToAsk.length}</span>
                    </div>
                    <div class="results-percentage">${accuracy}%</div>
                </div>
                
                <div class="results-stats">
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Acertos: ${score}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-times-circle"></i>
                        <span>Erros: ${questionsToAsk.length - score}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span>Tempo: <span id="final-time">--:--</span></span>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button id="new-quiz-btn" class="quiz-btn quiz-btn-primary">
                        <i class="fas fa-redo"></i>
                        Novo Simulado
                    </button>
                    <button id="review-btn" class="quiz-btn quiz-btn-secondary">
                        <i class="fas fa-eye"></i>
                        Revisar Questões
                    </button>
                    <button id="report-general-btn" class="quiz-btn quiz-btn-outline">
                        <i class="fas fa-flag"></i>
                        Reportar Questão
                    </button>
                </div>
            </div>
        `;
        
        // Event listener para novo simulado
        const newQuizBtn = document.getElementById('new-quiz-btn');
        if (newQuizBtn) {
            newQuizBtn.addEventListener('click', () => {
                // Reset das variáveis do quiz
                score = 0;
                currentQuestionIndex = 0;
                userAnswers = [];
                questionsToAsk = [];
                
                document.getElementById('quiz-content').style.display = 'none';
                document.getElementById('quiz-setup').style.display = 'block';
                
                // Reset do timer
                const timerElement = document.getElementById('quiz-timer');
                if (timerElement) {
                    timerElement.textContent = '00:00';
                }
            });
        }
        
        // Event listener para revisar questões
        const reviewBtn = document.getElementById('review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => {
                showReviewQuestions();
            });
        }
        
        // Event listener para reportar questão geral
        const reportGeneralBtn = document.getElementById('report-general-btn');
        if (reportGeneralBtn) {
            reportGeneralBtn.addEventListener('click', () => {
                showReportSelection();
            });
        }
    }
}

function showReviewQuestions() {
    const questionContainer = document.getElementById('quiz-question');
    if (!questionContainer) return;
    
    let reviewHTML = `
        <div class="quiz-review">
            <div class="review-header">
                <h2>Revisão de Questões</h2>
                <button id="back-to-results-btn" class="quiz-btn quiz-btn-secondary">
                    <i class="fas fa-arrow-left"></i>
                    Voltar aos Resultados
                </button>
            </div>
            <div class="review-questions">
    `;
    
    questionsToAsk.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer && userAnswer.isCorrect;
        const statusClass = isCorrect ? 'correct' : 'incorrect';
        const statusIcon = isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle';
        
        reviewHTML += `
            <div class="review-question ${statusClass}">
                <div class="review-question-header">
                    <span class="question-number">Questão ${index + 1}</span>
                    <div class="question-header-actions">
                        <span class="question-status">
                            <i class="${statusIcon}"></i>
                            ${isCorrect ? 'Correta' : 'Incorreta'}
                        </span>
                        <button class="report-question-btn" onclick="openReportModal(questionsToAsk[${index}])">
                            <i class="fas fa-flag"></i>
                            Reportar
                        </button>
                    </div>
                </div>
                <div class="review-question-text">
                    ${question.question}
                </div>
                <div class="review-options">
                    ${question.options.map((option, optIndex) => {
                        const isUserAnswer = userAnswer && userAnswer.selectedOption === option;
                        const isCorrectAnswer = option === question.answer;
                        let optionClass = '';
                        if (isCorrectAnswer) optionClass = 'correct-answer';
                        if (isUserAnswer && !isCorrectAnswer) optionClass = 'user-wrong-answer';
                        
                        return `
                            <div class="review-option ${optionClass}">
                                <span class="option-letter">${String.fromCharCode(65 + optIndex)}</span>
                                <span class="option-text">${option}</span>
                                ${isUserAnswer ? '<i class="fas fa-user"></i>' : ''}
                                ${isCorrectAnswer ? '<i class="fas fa-check"></i>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    reviewHTML += `
            </div>
        </div>
    `;
    
    questionContainer.innerHTML = reviewHTML;
    
    // Event listener para voltar aos resultados
    const backBtn = document.getElementById('back-to-results-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showQuizResults();
        });
    }
}

function showReportSelection() {
    const questionContainer = document.getElementById('quiz-question');
    if (!questionContainer) return;
    
    let reportHTML = `
        <div class="quiz-report-selection">
            <div class="report-selection-header">
                <h2>Reportar Questão</h2>
                <p>Selecione a questão que deseja reportar:</p>
                <button id="back-to-results-from-report-btn" class="quiz-btn quiz-btn-secondary">
                    <i class="fas fa-arrow-left"></i>
                    Voltar aos Resultados
                </button>
            </div>
            <div class="report-selection-questions">
    `;
    
    questionsToAsk.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer && userAnswer.isCorrect;
        const statusClass = isCorrect ? 'correct' : 'incorrect';
        const statusIcon = isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle';
        
        reportHTML += `
            <div class="report-selection-question ${statusClass}">
                <div class="report-question-info">
                    <div class="report-question-header">
                        <span class="question-number">Questão ${index + 1}</span>
                        <span class="question-status">
                            <i class="${statusIcon}"></i>
                            ${isCorrect ? 'Correta' : 'Incorreta'}
                        </span>
                    </div>
                    <div class="report-question-preview">
                        ${question.question.length > 150 ? question.question.substring(0, 150) + '...' : question.question}
                    </div>
                </div>
                <button class="report-select-btn" onclick="openReportModal(questionsToAsk[${index}])">
                    <i class="fas fa-flag"></i>
                    Reportar Esta
                </button>
            </div>
        `;
    });
    
    reportHTML += `
            </div>
        </div>
    `;
    
    questionContainer.innerHTML = reportHTML;
    
    // Event listener para voltar aos resultados
    const backBtn = document.getElementById('back-to-results-from-report-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showQuizResults();
        });
    }
}

function openReportModal(question) {
    const modal = document.getElementById('report-modal');
    if (!modal) return;
    
    // Preencher informações da questão
    document.getElementById('report-question-id').value = question.id;
    document.getElementById('report-question-preview').textContent = question.question;
    document.getElementById('report-details').value = '';
    document.getElementById('report-type').value = 'content'; // Reset para primeira opção
    
    modal.style.display = 'flex';
    
    // Event listener para cancelar
    document.getElementById('cancel-report').onclick = () => { 
        modal.style.display = 'none'; 
    };
    
    // Event listener para o formulário
    const form = document.getElementById('report-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const qid = document.getElementById('report-question-id').value;
        const type = document.getElementById('report-type').value;
        const details = document.getElementById('report-details').value || '';
        
        try {
            const resp = await fetch(`${API_URL}/report-error`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    questionId: qid, 
                    errorType: type, 
                    details 
                })
            });
            
            if (!resp.ok) {
                const t = await resp.text();
                alert('Erro ao enviar reporte: ' + t);
                return;
            }
            
            alert('Reporte enviado com sucesso! Obrigado pela colaboração.');
            modal.style.display = 'none';
            
        } catch (err) {
            console.error('Erro ao enviar reporte:', err);
            alert('Erro ao enviar reporte. Tente novamente mais tarde.');
        }
    };
}

function selectAnswer(selectedElement, mainContent) {
    const selectedOptionText = selectedElement.querySelector('.option-text').textContent.trim();
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    
    // Verificar se a resposta está correta
    const isCorrect = selectedOptionText === currentQuestion.answer;

    // Bloquear outras interações
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.style.pointerEvents = 'none';
    });

    // Aplicar estilos visuais
    if (isCorrect) {
        score++;
        selectedElement.style.backgroundColor = '#dcfce7';
        selectedElement.style.borderColor = '#16a34a';
        selectedElement.style.color = '#16a34a';
    } else {
        selectedElement.style.backgroundColor = '#fef2f2';
        selectedElement.style.borderColor = '#dc2626';
        selectedElement.style.color = '#dc2626';
        
        // Destacar a resposta correta
        document.querySelectorAll('.quiz-option').forEach(opt => {
            const optionText = opt.querySelector('.option-text').textContent.trim();
            if (optionText === currentQuestion.answer) {
                opt.style.backgroundColor = '#dcfce7';
                opt.style.borderColor = '#16a34a';
                opt.style.color = '#16a34a';
            }
        });
    }

    // Guardar resposta do usuário
    userAnswers.push({
        questionId: currentQuestion.id,
        selectedOption: selectedOptionText,
        isCorrect: isCorrect
    });

    // Avançar para próxima questão após delay
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

async function showResults(mainContent) {
    mainContent.innerHTML = `<h2>Finalizando simulado...</h2>`;
    try {
        const response = await fetch(`${API_URL}/quiz/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                score: score,
                totalQuestions: questionsToAsk.length,
                answers: userAnswers
            })
        });
        if (!response.ok) {
            const t = await response.text();
            console.error('showResults finish failed', response.status, t);
        } else {
            await response.json();
        }
    } catch (error) {
        // Log network or unexpected errors but do not block the user flow.
        console.error('Erro ao enviar resultado ao servidor:', error);
    } finally {
        // Always keep the local result and redirect so the user doesn't see a fatal error UI.
        try {
            sessionStorage.setItem('lastQuizResults', JSON.stringify({
                score: score,
                total: questionsToAsk.length,
                questions: questionsToAsk,
                userAnswers: userAnswers
            }));
        } catch (e) {
            // If sessionStorage fails, still proceed to redirect; the results page can handle no data.
            console.error('Falha ao gravar lastQuizResults localmente:', e);
        }
        window.location.href = 'resultados.html';
    }
}

async function checkForMessages(modal) {
    const modalContent = document.getElementById('global-message-content');
    const modalImage = document.getElementById('global-message-image');
    try {
        const response = await fetch(`${API_URL}/message`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.status === 204) return;
        if (!response.ok) {
            const t = await response.text();
            console.error('checkForMessages failed', response.status, t);
            return;
        }
        const messageData = await response.json();
        if (messageData.timestamp !== lastMessageTimestamp) {
            modalContent.textContent = messageData.content;
            if (messageData.imageUrl) {
                modalImage.src = messageData.imageUrl;
                modalImage.style.display = 'block';
            } else {
                modalImage.style.display = 'none';
            }
            modal.style.display = 'flex';
            lastMessageTimestamp = messageData.timestamp;
        }
    } catch (error) {
        console.error("Erro ao buscar mensagem global:", error);
    }
}