document.addEventListener('DOMContentLoaded', () => {

    let sessoesEstudo = [];
    let graficoLinha = null;
    let graficoDisciplinas = null;

    const selectIntervalo = document.getElementById('intervaloGrafico');
    const selectMetricaDisciplinas = document.getElementById('metricaGraficoDisciplinas');
    const canvasEstudos = document.getElementById('graficoEstudos');
    const canvasDisciplinas = document.getElementById('graficoDisciplinas');
    const containerGraficoDisciplinas = document.querySelector('.grafico-disciplinas-container');
    const constanciaDiasEl = document.getElementById('constancia-dias');
    const focoTextoEl = document.getElementById('foco-texto');
    const constanciaWrapperEl = document.querySelector('.constancia-wrapper');

    function carregarDados() {
        try {
            sessoesEstudo = JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
             sessoesEstudo.forEach(s => { if(s.data && typeof s.data === 'string') { s.data = new Date(s.data); }});
        } catch (e) {
            console.error("Erro ao carregar/parsear sessoesEstudo:", e);
            sessoesEstudo = [];
        }
    }

    function ultimosDias(dataObj, dias) {
        if (!dataObj || !(dataObj instanceof Date) || isNaN(dataObj.getTime())) return false;
        const hoje = new Date();
        const diasAtras = new Date();
        diasAtras.setHours(0, 0, 0, 0);
        diasAtras.setDate(hoje.getDate() - (dias - 1));
        const d = new Date(dataObj);
        d.setHours(0, 0, 0, 0);
        hoje.setHours(23, 59, 59, 999);
        return d >= diasAtras && d <= hoje;
    }

    function obterIntervalo() { return selectIntervalo ? parseInt(selectIntervalo.value) : 7; }

    function calcularConstancia(sessoes) {
        let diasConstancia = 0;
        if (!sessoes || sessoes.length === 0) return 0;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const datasComSessao = new Set();
        sessoes.forEach(s => {
            if(s.data && s.data instanceof Date && !isNaN(s.data.getTime())) {
                const ano = s.data.getFullYear();
                const mes = String(s.data.getMonth() + 1).padStart(2, '0');
                const dia = String(s.data.getDate()).padStart(2, '0');
                datasComSessao.add(`${ano}-${mes}-${dia}`);
            } else if (s.data && typeof s.data === 'string') {
                 const dateStrMatch = s.data.match(/^(\d{4})-(\d{2})-(\d{2})/);
                 if(dateStrMatch) datasComSessao.add(dateStrMatch[0]);
            }
        });
        for (let i = 0; ; i++) {
            const diaVerificar = new Date(hoje); diaVerificar.setDate(hoje.getDate() - i);
            const ano = diaVerificar.getFullYear(); const mes = String(diaVerificar.getMonth() + 1).padStart(2, '0'); const dia = String(diaVerificar.getDate()).padStart(2, '0');
            const diaFormatado = `${ano}-${mes}-${dia}`;
            if (datasComSessao.has(diaFormatado)) { diasConstancia++; } else { break; }
        }
        return diasConstancia;
    }

    function formatarDataResumida(data) {
        if (!data || !(data instanceof Date)) return '';
        return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Fortaleza' });
    }

    function interpolarCor(cor1, cor2, fator, opacidade = 0.7) {
        const r = Math.round(cor1[0] + (cor2[0] - cor1[0]) * fator); const g = Math.round(cor1[1] + (cor2[1] - cor1[1]) * fator); const b = Math.round(cor1[2] + (cor2[2] - cor1[2]) * fator);
        return `rgba(${r}, ${g}, ${b}, ${opacidade})`;
    }

    function obterCorAcertos(taxa, opacidade = 0.7) {
        if (taxa < 50) return `rgba(239, 83, 80, ${opacidade})`;
        if (taxa < 75) return `rgba(255, 193, 7, ${opacidade})`;
        return `rgba(102, 187, 106, ${opacidade})`;
    }

    function atualizarGraficoLinha(sessoesFiltradas, intervalo) {
        if (!canvasEstudos) return;
        const ctx = canvasEstudos.getContext('2d'); if (!ctx) return;
        const labels = []; let questoesPorUnidade = []; let acertosPorUnidade = []; const hoje = new Date();

        if (intervalo === 7) {
             const dataMap = {}; sessoesFiltradas.forEach(s => { if (!s.data) return; const key = s.data.toISOString().split('T')[0]; if (!dataMap[key]) dataMap[key] = { questoes: 0, acertos: 0 }; dataMap[key].questoes += s.questoes || 0; dataMap[key].acertos += s.acertos || 0; });
             for (let i = 6; i >= 0; i--) { const dia = new Date(hoje); dia.setDate(hoje.getDate() - i); const df = dia.toISOString().split('T')[0]; labels.push(dia.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Fortaleza' }).substring(0, 3)); questoesPorUnidade.push(dataMap[df]?.questoes || 0); acertosPorUnidade.push(dataMap[df]?.acertos || 0); }
        } else if (intervalo === 30) {
            questoesPorUnidade = [0, 0, 0, 0]; acertosPorUnidade = [0, 0, 0, 0]; const fim0 = new Date(hoje); fim0.setHours(0,0,0,0); const fim1 = new Date(hoje); fim1.setDate(hoje.getDate() - 7); fim1.setHours(0,0,0,0); const fim2 = new Date(hoje); fim2.setDate(hoje.getDate() - 14); fim2.setHours(0,0,0,0); const fim3 = new Date(hoje); fim3.setDate(hoje.getDate() - 21); fim3.setHours(0,0,0,0); const ini = new Date(hoje); ini.setDate(hoje.getDate() - 28); ini.setHours(0,0,0,0);
            labels.push(...[`${formatarDataResumida(ini)} - ${formatarDataResumida(fim3)}`, `${formatarDataResumida(new Date(fim3.getTime() + 864e5))} - ${formatarDataResumida(fim2)}`, `${formatarDataResumida(new Date(fim2.getTime() + 864e5))} - ${formatarDataResumida(fim1)}`, `${formatarDataResumida(new Date(fim1.getTime() + 864e5))} - ${formatarDataResumida(fim0)}`]);
            sessoesFiltradas.forEach(s => { if (!s.data) return; const sd = new Date(s.data); sd.setHours(0,0,0,0); if (sd >= ini && sd <= fim3) { questoesPorUnidade[0] += s.questoes || 0; acertosPorUnidade[0] += s.acertos || 0; } else if (sd > fim3 && sd <= fim2) { questoesPorUnidade[1] += s.questoes || 0; acertosPorUnidade[1] += s.acertos || 0; } else if (sd > fim2 && sd <= fim1) { questoesPorUnidade[2] += s.questoes || 0; acertosPorUnidade[2] += s.acertos || 0; } else if (sd > fim1 && sd <= fim0) { questoesPorUnidade[3] += s.questoes || 0; acertosPorUnidade[3] += s.acertos || 0; } });
        } else if (intervalo === 365) {
            const dataMap = {}; sessoesFiltradas.forEach(s => { if (!s.data) return; const key = s.data.toISOString().substring(0, 7); if (!dataMap[key]) dataMap[key] = { questoes: 0, acertos: 0 }; dataMap[key].questoes += s.questoes || 0; dataMap[key].acertos += s.acertos || 0; });
            const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]; const y = hoje.getFullYear(); const mo = hoje.getMonth();
            for (let i = 11; i >= 0; i--) { let mi = (mo - i + 12) % 12; let yr = (mo - i < 0) ? y - 1 : y; labels.push(m[mi]); const k = `${yr}-${String(mi + 1).padStart(2, '0')}`; questoesPorUnidade.push(dataMap[k]?.questoes || 0); acertosPorUnidade.push(dataMap[k]?.acertos || 0); }
        }

        let opts = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { ticks: { display: true } }, y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: false } } }, plugins: { legend: { position: 'bottom' } } };
        if (intervalo === 30) { if (!opts.scales.x.ticks) opts.scales.x.ticks = {}; opts.scales.x.ticks.display = false; }

        if (graficoLinha) graficoLinha.destroy();
        graficoLinha = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [ { label: 'Questões Corretas', data: acertosPorUnidade, borderColor: 'rgba(76, 175, 80, 1)', backgroundColor: 'rgba(76, 175, 80, 0.2)', borderWidth: 2, tension: 0.3, yAxisID: 'y', order: 2 }, { label: 'Questões Resolvidas', data: questoesPorUnidade, borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)', borderWidth: 2, tension: 0.3, yAxisID: 'y', order: 1 } ] }, options: opts });
    }

    function atualizarGraficoDisciplinas() {
        if (!canvasDisciplinas || !containerGraficoDisciplinas) { if(containerGraficoDisciplinas) containerGraficoDisciplinas.style.display = 'none'; return; }
        const ctxDisciplinas = canvasDisciplinas.getContext('2d'); if (!ctxDisciplinas) { containerGraficoDisciplinas.style.display = 'none'; return; }
        const intervalo = obterIntervalo(); const metrica = selectMetricaDisciplinas ? selectMetricaDisciplinas.value : 'tempo';
        const sessoesAtuais = sessoesEstudo && sessoesEstudo.length > 0 ? sessoesEstudo : JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
        const sessoesFiltradas = sessoesAtuais.filter(s => s.data && ultimosDias(s.data, intervalo)); const statsPorDisciplina = {};
        sessoesFiltradas.forEach(s => { const nome = s.disciplina || "?"; if (!statsPorDisciplina[nome]) statsPorDisciplina[nome] = { t: 0, q: 0, a: 0 }; statsPorDisciplina[nome].t += s.tempo || 0; statsPorDisciplina[nome].q += s.questoes || 0; statsPorDisciplina[nome].a += s.acertos || 0; });
        const temDados = Object.keys(statsPorDisciplina).length > 0; containerGraficoDisciplinas.style.display = temDados ? 'block' : 'none';
        if (!temDados) { if (graficoDisciplinas) { graficoDisciplinas.destroy(); graficoDisciplinas = null; } return; }
        const labels = Object.keys(statsPorDisciplina); let dados = []; let labelM = '';
        switch (metrica) { case 'tempo': labelM = 'Tempo (min)'; dados = labels.map(d => statsPorDisciplina[d].t); break; case 'questoes': labelM = 'Questões'; dados = labels.map(d => statsPorDisciplina[d].q); break; case 'acertos': labelM = 'Acertos (%)'; dados = labels.map(d => statsPorDisciplina[d].q > 0 ? Math.round(statsPorDisciplina[d].a * 100 / statsPorDisciplina[d].q) : 0); break; default: labelM = 'Tempo (min)'; dados = labels.map(d => statsPorDisciplina[d].t); }
        const combined = labels.map((l, i) => ({ l, d: dados[i] })); combined.sort((a, b) => b.d - a.d); const sortedL = combined.map(i => i.l); const sortedD = combined.map(i => i.d);
        let bgC = []; let bdC = []; const cI = [209, 196, 233]; const cF = [81, 45, 168];
        if (metrica === 'acertos') { bgC = sortedD.map(t => obterCorAcertos(t, 0.7)); bdC = sortedD.map(t => obterCorAcertos(t, 1)); } else { const min = Math.min(...sortedD); const max = Math.max(...sortedD); const r = max - min; bgC = sortedD.map(v => interpolarCor(cI, cF, r === 0 ? 0.5 : (v - min) / r, 0.7)); bdC = sortedD.map(v => interpolarCor(cI, cF, r === 0 ? 0.5 : (v - min) / r, 1)); }
        if (graficoDisciplinas) graficoDisciplinas.destroy();
        graficoDisciplinas = new Chart(ctxDisciplinas, { type: 'bar', data: { labels: sortedL, datasets: [{ label: labelM, data: sortedD, backgroundColor: bgC, borderColor: bdC, borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, title: { display: true, text: labelM }, grid: { display: false } }, y: { ticks: { autoSkip: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { let l = ctx.dataset.label || ''; if (l) l += ': '; let v = ctx.raw; if (metrica === 'acertos') v += '%'; else if (metrica === 'tempo') v += ' min'; l += v; return l; } } } } } });
    }

    function atualizarGraficoConstancia(numDias = 15) {
        if (!constanciaDiasEl) return;
        constanciaDiasEl.innerHTML = '';

        const sessoesAtuais = sessoesEstudo && sessoesEstudo.length > 0 ? sessoesEstudo : JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
        if (sessoesAtuais.length === 0 && constanciaDiasEl) {
            constanciaDiasEl.innerHTML = '<p style="color:#888;font-size:0.9em;width:100%;text-align:center;">Sem registros.</p>';
            return;
        }

        const datasComSessao = new Set();
        sessoesAtuais.forEach(s => {
             if(s.data && s.data instanceof Date && !isNaN(s.data.getTime())) {
                 const a = s.data.getFullYear(); const m = String(s.data.getMonth() + 1).padStart(2, '0'); const d = String(s.data.getDate()).padStart(2, '0');
                 datasComSessao.add(`${a}-${m}-${d}`);
             } else if (s.data && typeof s.data === 'string') {
                 const m = s.data.match(/^(\d{4})-(\d{2})-(\d{2})/);
                 if(m) datasComSessao.add(m[0]);
             }
        });

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        for (let i = 0; i < numDias; i++) {
            const diaVerificar = new Date(hoje);
            diaVerificar.setDate(hoje.getDate() - i);

            const ano = diaVerificar.getFullYear();
            const mes = String(diaVerificar.getMonth() + 1).padStart(2, '0');
            const dia = String(diaVerificar.getDate()).padStart(2, '0');
            const diaFormatado = `${ano}-${mes}-${dia}`;
            const estudouNesteDia = datasComSessao.has(diaFormatado);

            const diaConstanciaDiv = document.createElement('div');
            diaConstanciaDiv.classList.add('dia-constancia');
            diaConstanciaDiv.classList.add(estudouNesteDia ? 'estudou' : 'nao-estudou');
            const dataLegivel = diaVerificar.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' });
            diaConstanciaDiv.setAttribute('title', `${dataLegivel} - ${estudouNesteDia ? 'Estudou' : 'Não estudou'}`);

            constanciaDiasEl.appendChild(diaConstanciaDiv);
        }
    }

    function atualizarTudo() {
        carregarDados();
        const intervalo = obterIntervalo();
        const sessoesFiltradasIntervalo = sessoesEstudo.filter(s => s.data && ultimosDias(s.data, intervalo));
        const tempoTotal = sessoesFiltradasIntervalo.reduce((s, i) => s + (i.tempo || 0), 0); const qTotal = sessoesFiltradasIntervalo.reduce((s, i) => s + (i.questoes || 0), 0); const aTotal = sessoesFiltradasIntervalo.reduce((s, i) => s + (i.acertos || 0), 0); const txAcertos = qTotal > 0 ? Math.round((aTotal / qTotal) * 100) : 0; const diasConst = calcularConstancia(sessoesEstudo);
        const tEl = document.getElementById('tempo-total'); if (tEl) { const h = Math.floor(tempoTotal / 60); const m = tempoTotal % 60; tEl.innerText = `${h}h ${m}min`; }
        const qEl = document.getElementById('questoes-semana'); if (qEl) qEl.innerText = qTotal;
        const aEl = document.getElementById('acertos-semana'); if (aEl) aEl.innerText = `${txAcertos}%`;
        const cEl = document.getElementById('dias-constancia'); if (cEl) cEl.innerText = `${diasConst} dia${diasConst !== 1 ? 's' : ''}`;
        if (focoTextoEl) { if (diasConst > 0) { focoTextoEl.innerHTML = `Você está a ${diasConst} ${diasConst === 1 ? 'dia' : 'dias'} no foco! <i class="fas fa-fire" style="color:#ff7043;"></i>`; } else { focoTextoEl.textContent = "Continue estudando para criar uma sequência!"; } }
        atualizarGraficoLinha(sessoesFiltradasIntervalo, intervalo);
        atualizarGraficoDisciplinas();
        atualizarGraficoConstancia(15);
    }

    window.appContext = window.appContext || {};
    window.appContext.atualizarTudo = atualizarTudo;

    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudo);
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', atualizarGraficoDisciplinas);

    atualizarTudo();

});
