// ==================================================================
// ARQUIVO resultados.js (ATUALIZADO COM VISUAL MELHORADO)
// ==================================================================
// determine API URL (match other front-end files)
const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? (window.location.origin.includes('vercel.app') ? 'https://quiz-api-z4ri.onrender.com' : window.location.origin)
    : 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const resultDetails = document.getElementById('result-details');
    const lastQuizData = JSON.parse(sessionStorage.getItem('lastQuizResults'));

    if (!lastQuizData) {
        resultDetails.innerHTML = `
            <div class="error-card">
                <p>Nenhum resultado de simulado recente encontrado.</p>
                <a href="quiz.html" class="btn-main">Fazer Novo Simulado</a>
            </div>
        `;
        return;
    }

    const { score, total, questions, userAnswers, selectedThemes, quizDuration } = lastQuizData;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;
    
    // Calcular cor da barra de progresso
    const getProgressColor = (percentage) => {
        if (percentage >= 70) return '#10b981'; // Verde
        if (percentage >= 50) return '#f59e0b'; // Amarelo
        return '#ef4444'; // Vermelho
    };
    
    // Formatar tempo
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    let reviewHTML = `
        <div class="score-summary">
            <h1>Simulado Concluído!</h1>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" data-percentage="${percentage}" style="background: ${getProgressColor(percentage)}"></div>
                </div>
                <div class="progress-text">${percentage}%</div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Acertos: ${score}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-times-circle"></i>
                    <span>Erros: ${total - score}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span>Tempo: ${quizDuration ? formatTime(quizDuration) : '--:--'}</span>
                </div>
            </div>
            
            ${selectedThemes ? `
                <div class="themes-info">
                    <h4>Temas estudados:</h4>
                    <div class="themes-list">
                        ${selectedThemes.map(theme => `<span class="theme-tag">${theme}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="action-buttons">
                <button class="btn-main" id="new-quiz-btn">
                    <i class="fas fa-redo"></i>
                    Novo Simulado
                </button>
                <button class="btn-secondary" id="review-btn">
                    <i class="fas fa-eye"></i>
                    Revisar Questões
                </button>
                <button class="btn-secondary" id="report-general-btn">
                    <i class="fas fa-flag"></i>
                    Reportar Questão
                </button>
            </div>
        </div>
        <h3 class="review-title" style="display: none;">Revisão do Gabarito</h3>
        <div id="questions-review" style="display: none;">
    `;

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        reviewHTML += `<div class="review-question">`;
        reviewHTML += `<h4>Questão ${index + 1}</h4>`;
        reviewHTML += `<p class="question-text">${q.question}</p>`;
        reviewHTML += `<ul class="options">`;

        const letters = ['A', 'B', 'C', 'D', 'E'];
        
        // Função para extrair conteúdo da resposta removendo letras de alternativa
        const extractAnswerContent = (text) => {
            return text.replace(/^[A-Z]\)\s*/, '').trim();
        };
        
        // Função para normalizar texto (mesmo que no quiz.js)
        const normalizeText = (text) => {
            return text.trim()
                       .replace(/\s+/g, ' ')  // Normalizar espaços
                       .toLowerCase()         // Converter para minúsculo
                       .replace(/\u00A0/g, ' ') // Substituir espaços não-quebráveis
                       .replace(/[\u2000-\u200F\u2028-\u202F]/g, ' '); // Outros espaços Unicode
        };
        
        q.options.forEach((option, optionIndex) => {
            let className = '';
            const cleanOption = extractAnswerContent(option);
            const isCorrectAnswer = cleanOption === q.answer || normalizeText(cleanOption) === normalizeText(q.answer);
            const isUserAnswer = cleanOption === userAnswer.selectedOption || normalizeText(cleanOption) === normalizeText(userAnswer.selectedOption);

            // Marcar resposta correta
            if (isCorrectAnswer) {
                className = 'correct';
            }
            
            // Marcar resposta do usuário se estiver incorreta
            if (isUserAnswer && !userAnswer.isCorrect) {
                className = 'incorrect';
            }
            
            // Se o usuário acertou, sua resposta já será marcada como 'correct' pelo primeiro if
            // Adicionar uma indicação visual extra se esta foi a resposta escolhida pelo usuário
            let extraClass = isUserAnswer ? ' user-selected' : '';

            reviewHTML += `
                <li class="option ${className}${extraClass}">
                    <span class="option-letter">
                      <span class="letter">${letters[optionIndex]}</span>
                      <svg class="icon icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      <svg class="icon icon-cross" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="option-text">${option}</span>
                </li>
            `;
        });

        reviewHTML += `</ul>`;
        
        // Sempre mostrar qual foi a resposta do usuário
        if (userAnswer.isCorrect) {
            reviewHTML += `<p class="feedback feedback-correct"><strong>✓ Você acertou!</strong> Sua resposta: ${userAnswer.selectedOption}</p>`;
        } else {
            reviewHTML += `<p class="feedback feedback-incorrect"><strong>✗ Resposta incorreta.</strong> Sua resposta: ${userAnswer.selectedOption}</p>`;
            reviewHTML += `<p class="feedback feedback-correct"><strong>Resposta correta:</strong> ${q.answer}</p>`;
        }
        
        reviewHTML += `</div>`;
    });

    reviewHTML += `</div>`; // Fechar questions-review

    resultDetails.innerHTML = reviewHTML;
    
    // Adicionar CSS para a nova interface se não existir
    if (!document.getElementById('results-modern-styles')) {
        const style = document.createElement('style');
        style.id = 'results-modern-styles';
        style.textContent = `
            .score-summary {
                text-align: center;
                background: rgba(255, 255, 255, 0.95);
                padding: 2rem;
                border-radius: 20px;
                margin-bottom: 2rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            
            .score-summary h1 {
                color: #4f46e5;
                margin-bottom: 2rem;
                font-size: 2.5rem;
                font-weight: 800;
            }
            
            .progress-container {
                position: relative;
                margin: 2rem 0;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #e5e7eb;
                border-radius: 50px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                width: 0%;
                border-radius: 50px;
                transition: width 2s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
            }
            
            .progress-text {
                font-size: 2rem;
                font-weight: 700;
                margin-top: 1rem;
                color: #374151;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1.5rem;
                margin: 2rem 0;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 1.125rem;
                font-weight: 600;
                color: #374151;
            }
            
            .stat-item i {
                font-size: 1.5rem;
            }
            
            .stat-item:nth-child(1) i { color: #10b981; }
            .stat-item:nth-child(2) i { color: #ef4444; }
            .stat-item:nth-child(3) i { color: #3b82f6; }
            
            .themes-info {
                margin: 2rem 0;
                text-align: left;
            }
            
            .themes-info h4 {
                color: #374151;
                margin-bottom: 1rem;
                font-size: 1.125rem;
            }
            
            .themes-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            
            .theme-tag {
                background: #e0e7ff;
                color: #4f46e5;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .action-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .btn-main, .btn-secondary {
                padding: 0.75rem 2rem;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                text-decoration: none;
            }
            
            .btn-main {
                background: #4f46e5;
                color: white;
            }
            
            .btn-main:hover {
                background: #4338ca;
                transform: translateY(-1px);
            }
            
            .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 2px solid #e5e7eb;
            }
            
            .btn-secondary:hover {
                background: #e5e7eb;
                transform: translateY(-1px);
            }
            
            @media (max-width: 768px) {
                .score-summary h1 {
                    font-size: 2rem;
                }
                
                .stats-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .action-buttons {
                    flex-direction: column;
                    align-items: center;
                }
                
                .btn-main, .btn-secondary {
                    width: 100%;
                    max-width: 300px;
                }
            }
            
            /* Estilos para destacar a resposta selecionada pelo usuário */
            .option.user-selected {
                border: 2px solid #4f46e5 !important;
                box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1) !important;
            }
            
            .option.user-selected .option-letter {
                border: 2px solid #4f46e5 !important;
            }
            
            /* Estilos para as mensagens de feedback */
            .feedback {
                margin: 12px 0 8px 0;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.9rem;
            }
            
            .feedback-correct {
                background: #ecfdf5;
                color: #059669;
                border-left: 4px solid #10b981;
            }
            
            .feedback-incorrect {
                background: #fef2f2;
                color: #dc2626;
                border-left: 4px solid #ef4444;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Animar barra de progresso
    setTimeout(() => {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            const targetPercentage = progressFill.getAttribute('data-percentage');
            progressFill.style.width = targetPercentage + '%';
        }
    }, 500);
    
    // Event listeners para botões
    const newQuizBtn = document.getElementById('new-quiz-btn');
    if (newQuizBtn) {
        newQuizBtn.addEventListener('click', () => {
            window.location.href = 'quiz.html';
        });
    }
    
    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
            const reviewSection = document.getElementById('questions-review');
            const reviewTitle = document.querySelector('.review-title');
            if (reviewSection && reviewTitle) {
                reviewSection.style.display = 'block';
                reviewTitle.style.display = 'block';
                reviewBtn.textContent = 'Ocultar Revisão';
                reviewBtn.onclick = () => {
                    reviewSection.style.display = 'none';
                    reviewTitle.style.display = 'none';
                    reviewBtn.textContent = 'Revisar Questões';
                    reviewBtn.onclick = () => reviewBtn.click();
                };
            }
        });
    }

    sessionStorage.removeItem('lastQuizResults');

    // attach report buttons to each question
    document.querySelectorAll('.review-question').forEach((el, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.style.marginTop = '8px';
        btn.textContent = 'Reportar erro';
        btn.addEventListener('click', ()=> openReportModal(idx));
        el.appendChild(btn);
    });

    const reportModal = document.getElementById('report-modal');
    const reportQuestionText = document.getElementById('report-question-text');
    const reportDetails = document.getElementById('report-details');
    const reportSuggestion = document.getElementById('report-suggestion');
    const cancelReport = document.getElementById('cancel-report');
    const submitReport = document.getElementById('submit-report');

    function openReportModal(questionIndex) {
        const q = questions[questionIndex];
        reportQuestionText.textContent = q.question;
        document.getElementById('report-question-id').value = questionIndex;
        reportDetails.value = '';
        reportSuggestion.style.display = 'none';
        reportSuggestion.textContent = '';
        reportModal.style.display = 'flex';
    }

    cancelReport.addEventListener('click', ()=>{ reportModal.style.display = 'none'; });

    submitReport.addEventListener('click', async ()=>{
        const qIndex = parseInt(document.getElementById('report-question-id').value, 10);
        const q = questions[qIndex];
        const detailsText = reportDetails.value.trim();
        if (!detailsText) {
            alert('Descreva o problema antes de enviar.');
            return;
        }
        submitReport.disabled = true;
        submitReport.textContent = 'Enviando...';
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${API_URL}/report-error-correct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ questionIndex: qIndex, question: q, details: detailsText })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.message || 'Erro ao enviar reporte');
            // show AI suggestion if present
            if (data.suggestion) {
                reportSuggestion.style.display = 'block';
                reportSuggestion.innerHTML = `<strong>Sugestão automática da IA:</strong><div style="margin-top:8px">${data.suggestion}</div>`;
            } else {
                reportSuggestion.style.display = 'block';
                reportSuggestion.textContent = 'Reporte enviado. Obrigado!';
            }
        } catch (err) {
            console.error('report failed', err);
            alert(err.message || 'Falha ao enviar reporte.');
        } finally {
            submitReport.disabled = false;
            submitReport.textContent = 'Enviar reporte e pedir correção';
        }
    });
});