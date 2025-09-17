// desempenho.js
const API_URL = 'https://quiz-api-z4ri.onrender.com';
const token = localStorage.getItem('token');

async function fetchJSON(url) {
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function init() {
  try {
    const histories = await fetchJSON(`${API_URL}/history`);
    if (!histories || histories.length === 0) {
      document.getElementById('summary-text').textContent = 'Nenhuma tentativa encontrada.';
      return;
    }
    // aggregate per theme across all histories
    const themeAgg = {}; // tid -> { total, correct }
    const detailPromises = histories.map(h => fetchJSON(`${API_URL}/history/${h.id}`).catch(e => { console.warn('history detail failed', e); return []; }));
    const allDetails = await Promise.all(detailPromises);
    allDetails.forEach(rows => {
      rows.forEach(r => {
        const tid = r.theme_id || 'sem_tema';
        if (!themeAgg[tid]) themeAgg[tid] = { total:0, correct:0 };
        themeAgg[tid].total += 1;
        if (r.is_correct) themeAgg[tid].correct += 1;
      });
    });
    // load themes for mapping
    const themes = await fetchJSON(`${API_URL}/themes`);
    const themeMap = {}; themes.forEach(t => { themeMap[t.id] = t.name || t.name; });
    themeMap['sem_tema'] = 'Sem Tema';

    // setup chart
    const ctx = document.getElementById('themesChart').getContext('2d');
    // create chart and use Chart.js internal legend positioned below the chart
    let chart = new Chart(ctx, {
      type: 'pie',
      data: { labels: [], datasets: [{ label: '', data: [], backgroundColor: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          // legend disabled (cards provide the details)
          legend: { display: false },
          tooltip: { enabled: true }
        },
        layout: { padding: { bottom: 12, top: 6 } }
      }
    });

    // Build aggregate array from themeAgg
    const arr = Object.keys(themeAgg).map(tid => ({ tid, name: themeMap[tid] || 'Sem Tema', ...themeAgg[tid], pct: Math.round((themeAgg[tid].correct / themeAgg[tid].total) * 100) }));
    arr.sort((a,b)=> b.total - a.total);

    // populate theme-select
    const themeSelect = document.getElementById('theme-select');
    themeSelect.innerHTML = '';
    const allOpt = document.createElement('option'); allOpt.value = '__all__'; allOpt.textContent = 'Todos os temas'; themeSelect.appendChild(allOpt);
    arr.forEach(a => { const o = document.createElement('option'); o.value = a.tid; o.textContent = `${a.name} — ${a.pct}% (${a.total})`; themeSelect.appendChild(o); });

    async function renderForTheme(selectedTid) {
      document.getElementById('summary-text').textContent = 'Carregando dados...';
      const groupsEl = document.getElementById('groups'); groupsEl.innerHTML = '';
      // Build deduplicated arrays: aggregate by theme name to avoid duplicated legend entries
      const displayArr = selectedTid === '__all__' ? arr : arr.filter(x => String(x.tid) === String(selectedTid));
      const aggByName = {};
      displayArr.forEach((g,i)=>{
        const name = g.name || `Tema ${g.tid}`;
        const c = `hsl(${(i*37)%360} 70% 55% / 0.85)`;
        if (!aggByName[name]) aggByName[name] = { total:0, correct:0, color:c };
        aggByName[name].total += g.total;
        aggByName[name].correct += g.correct;
      });

      const labels = Object.keys(aggByName);
      const counts = labels.map(l => aggByName[l].total);
      const colors = labels.map(l => aggByName[l].color);

      // render aggregated group cards (one per deduplicated theme name)
      labels.forEach((label, idx) => {
        const data = aggByName[label];
        const total = data.total;
        const correct = data.correct;
        const pct = total ? Math.round((correct/total)*100) : 0;

        const card = document.createElement('div');
        card.className = 'quiz-card theme-card';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.marginBottom = '10px';
        card.style.padding = '16px 20px'; // Mais padding
        card.style.minHeight = '60px'; // Altura mínima maior

        const left = document.createElement('div'); 
        left.style.flex = '1'; 
        left.style.marginRight = '20px'; // Mais espaço entre esquerda e direita
        left.style.maxWidth = 'calc(100% - 140px)'; // Limitar largura para não comprimir o lado direito
        
        const title = document.createElement('div'); 
        title.style.fontWeight = '700'; 
        title.style.fontSize = '1rem'; // Tamanho de fonte maior
        title.style.lineHeight = '1.4';
        title.style.marginBottom = '4px';
        title.style.wordWrap = 'break-word'; // Quebra de linha se necessário
        title.textContent = label;
        
        const meta = document.createElement('div'); 
        meta.style.color = 'var(--muted)'; 
        meta.style.fontSize = '0.875rem'; // Slightly larger
        meta.style.lineHeight = '1.3';
        meta.textContent = `${total} questões — ${pct}% acertos`;
        left.appendChild(title); left.appendChild(meta);

        const right = document.createElement('div'); 
        right.style.minWidth = '120px'; 
        right.style.textAlign = 'right';
        right.style.flexShrink = '0'; // Não comprimir
        
        const pctEl = document.createElement('div'); 
        pctEl.style.fontWeight = '800'; 
        pctEl.style.fontSize = '1.25rem'; // Maior
        pctEl.style.lineHeight = '1.2';
        pctEl.style.marginBottom = '2px';
        pctEl.textContent = `${pct}%`;
        
        const countsText = document.createElement('div'); 
        countsText.style.color = 'var(--muted)'; 
        countsText.style.fontSize = '0.75rem';
        countsText.style.lineHeight = '1.3';
        countsText.textContent = `${correct} acertos • ${total - correct} erros`;
        right.appendChild(pctEl); right.appendChild(countsText);

        card.appendChild(left); card.appendChild(right);
        const details = document.createElement('div'); details.style.width='100%'; details.style.overflow='hidden'; details.style.maxHeight='0'; details.style.transition='max-height .28s ease'; details.style.padding='0 12px';
        const detailsInner = document.createElement('div'); detailsInner.style.padding='10px 0'; detailsInner.style.color='var(--muted)'; detailsInner.textContent = `Acertos: ${correct} — Erros: ${total - correct} — Percentual: ${pct}%`;
        details.appendChild(detailsInner);
        card.appendChild(details);
        let expanded=false;
        card.addEventListener('click', ()=>{
          expanded = !expanded;
          details.style.maxHeight = expanded ? '120px' : '0';
        });

        groupsEl.appendChild(card);
      });

      // update chart
      chart.data.labels = labels;
      chart.data.datasets[0].data = counts;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();

  // Chart.js internal legend will render below the chart; no custom legend is created here.

      // Calcular percentual total de acertos
      const totalQuestions = Object.values(themeAgg).reduce((s,x)=>s+x.total,0);
      const totalCorrect = Object.values(themeAgg).reduce((s,x)=>s+x.correct,0);
      const totalPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      
      document.getElementById('summary-text').textContent = `Temas presentes: ${arr.length} — Total: ${totalQuestions} questões — Acertos gerais: ${totalPercentage}% (${totalCorrect}/${totalQuestions})`;
    }

    // initial render (all themes)
    renderForTheme('__all__');
    document.getElementById('theme-select').addEventListener('change', (e)=> renderForTheme(e.target.value));

  } catch (err) {
    console.error('Desempenho init failed', err);
    document.getElementById('summary-text').textContent = 'Erro ao carregar desempenho.';
  }
}

window.addEventListener('DOMContentLoaded', init);
