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

    const { score, total, questions, userAnswers } = lastQuizData;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;

    let reviewHTML = `
        <div class="score-summary">
            <h1>Resultado Final</h1>
            <p>Você acertou <strong>${score} de ${total}</strong> questões</p>
            <p class="percentage">Aproveitamento: <strong>${percentage}%</strong></p>
        </div>
        <h3 class="review-title">Revisão do Gabarito</h3>
    `;

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        reviewHTML += `<div class="review-question">`;
        reviewHTML += `<h4>Questão ${index + 1}</h4>`;
        reviewHTML += `<p class="question-text">${q.question}</p>`;
        reviewHTML += `<ul class="options">`;

        const letters = ['A', 'B', 'C', 'D', 'E'];
        q.options.forEach((option, optionIndex) => {
            let className = '';

            if (option === q.answer) {
                className = 'correct';
            }
            if (option === userAnswer.selectedOption && !userAnswer.isCorrect) {
                className = 'incorrect';
            }

            reviewHTML += `
                <li class="option ${className}">
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
        if (!userAnswer.isCorrect) {
            reviewHTML += `<p class="feedback"><strong>Sua resposta:</strong> ${userAnswer.selectedOption}</p>`;
        }
        reviewHTML += `</div>`;
    });

    resultDetails.innerHTML = reviewHTML;
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