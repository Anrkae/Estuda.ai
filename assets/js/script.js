document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc",
        authDomain: "estudaai-ddb6a.firebaseapp.com",
        projectId: "estudaai-ddb6a",
        storageBucket: "estudaai-ddb6a.appspot.com",
        messagingSenderId: "974312409515",
        appId: "1:974312409515:web:ef635d71abf934241d6aee"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let currentUID = null;

    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#666';
    Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.05)';
    Chart.defaults.plugins.legend.labels.boxWidth = 15;
    Chart.defaults.plugins.legend.labels.padding = 20;
    Chart.defaults.layout.padding = 10;
    Chart.defaults.elements.line.tension = 0.35;
    Chart.defaults.elements.line.borderWidth = 2.5;
    Chart.defaults.elements.point.radius = 3;
    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.elements.point.backgroundColor = '#fff';
    Chart.defaults.elements.bar.borderRadius = 8;
    Chart.defaults.elements.bar.borderSkipped = false;

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
    // Elementos para exibir estatísticas
    const tempoTotalEl = document.getElementById('tempo-total');
    const questoesSemanaEl = document.getElementById('questoes-semana');
    const acertosSemanaEl = document.getElementById('acertos-semana');
    const diasConstanciaEl = document.getElementById('dias-constancia');


    async function carregarDadosFirestore() {
        if (!currentUID) {
            console.log("RELATORIO: Usuário não logado. Não é possível carregar sessoesEstudo.");
            sessoesEstudo = [];
            atualizarVisualizacaoSemDados("Faça login para ver seus relatórios de estudo.");
            return;
        }

        console.log("RELATORIO: Carregando sessoesEstudo do Firestore para UID:", currentUID);
        try {
            const userDocRef = db.collection('users').doc(currentUID);
            const doc = await userDocRef.get();

            if (doc.exists) {
                const userData = doc.data();
                sessoesEstudo = (userData.sessoesEstudo || []).map(sessao => {
                    let dataProcessada = null;
                    if (sessao.data) {
                        if (sessao.data.toDate) { // Timestamp do Firestore
                            dataProcessada = sessao.data.toDate();
                        } else if (typeof sessao.data === 'string') { // String ISO
                            const parsedDate = new Date(sessao.data);
                            if (!isNaN(parsedDate.getTime())) dataProcessada = parsedDate;
                            else console.warn("RELATORIO: Formato de data string inválido:", sessao.data);
                        } else if (typeof sessao.data === 'number') { // Timestamp Unix (milissegundos)
                            const parsedDate = new Date(sessao.data);
                            if (!isNaN(parsedDate.getTime())) dataProcessada = parsedDate;
                             else console.warn("RELATORIO: Formato de data number inválido:", sessao.data);
                        } else {
                            console.warn("RELATORIO: Tipo de data não reconhecido:", sessao.data);
                        }
                    }
                    return { ...sessao, data: dataProcessada };
                }).filter(sessao => sessao.data instanceof Date && !isNaN(sessao.data.getTime()));
                
                console.log("RELATORIO: sessoesEstudo carregadas:", sessoesEstudo.length, "sessões válidas.");
            } else {
                console.log("RELATORIO: Documento do usuário não encontrado. Nenhuma sessão carregada.");
                sessoesEstudo = [];
            }
        } catch (e) {
            console.error("RELATORIO: Erro ao carregar sessoesEstudo do Firestore:", e);
            sessoesEstudo = [];
        }
        
        if (sessoesEstudo.length === 0 && currentUID) {
            atualizarVisualizacaoSemDados("Ainda não há sessões de estudo registradas.");
        } else if (!currentUID) {
             atualizarVisualizacaoSemDados("Faça login para ver seus relatórios.");
        }
    }
    
    function atualizarVisualizacaoSemDados(mensagem = "Sem dados para exibir.") {
        if (graficoLinha) { graficoLinha.destroy(); graficoLinha = null; }
        if (graficoDisciplinas) { graficoDisciplinas.destroy(); graficoDisciplinas = null; }
        
        if(canvasEstudos && canvasEstudos.getContext('2d')) {
            canvasEstudos.getContext('2d').clearRect(0, 0, canvasEstudos.width, canvasEstudos.height);
        }
        if(canvasDisciplinas && containerGraficoDisciplinas) {
            if (canvasDisciplinas.getContext('2d')) {
                canvasDisciplinas.getContext('2d').clearRect(0, 0, canvasDisciplinas.width, canvasDisciplinas.height);
            }
            containerGraficoDisciplinas.style.display = 'none';
        }
        if(constanciaDiasEl) constanciaDiasEl.innerHTML = `<p class="placeholder-mensagem">${mensagem}</p>`;
        
        if (tempoTotalEl) tempoTotalEl.innerText = `-`;
        if (questoesSemanaEl) questoesSemanaEl.innerText = `-`;
        if (acertosSemanaEl) acertosSemanaEl.innerText = `- %`;
        if (diasConstanciaEl) diasConstanciaEl.innerText = `- dia(s)`;
        if (focoTextoEl) focoTextoEl.innerHTML = mensagem.includes("login") ? "Faça login para acompanhar seu foco." : "Comece a registrar seus estudos!";
    }

    function ultimosDias(dataObj, dias) {
        if (!dataObj || !(dataObj instanceof Date) || isNaN(dataObj.getTime())) return false;
        const hoje = new Date(); const diasAtras = new Date();
        diasAtras.setHours(0, 0, 0, 0); diasAtras.setDate(hoje.getDate() - (dias - 1));
        const d = new Date(dataObj); d.setHours(0, 0, 0, 0);
        hoje.setHours(23, 59, 59, 999);
        return d >= diasAtras && d <= hoje;
    }
    function obterIntervalo() { return selectIntervalo ? parseInt(selectIntervalo.value) : 7; }
    function calcularConstancia(sessoes) {
        let diasConstancia = 0; if (!sessoes || sessoes.length === 0) return 0;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const datasComSessao = new Set();
        sessoes.forEach(s => {
            if (s.data && s.data instanceof Date && !isNaN(s.data.getTime())) {
                datasComSessao.add(`${s.data.getFullYear()}-${String(s.data.getMonth() + 1).padStart(2, '0')}-${String(s.data.getDate()).padStart(2, '0')}`);
            }
        });
        for (let i = 0; ; i++) {
            const diaVerificar = new Date(hoje); diaVerificar.setDate(hoje.getDate() - i);
            const diaFormatado = `${diaVerificar.getFullYear()}-${String(diaVerificar.getMonth() + 1).padStart(2, '0')}-${String(diaVerificar.getDate()).padStart(2, '0')}`;
            if (datasComSessao.has(diaFormatado)) { diasConstancia++; } else { break; }
        }
        return diasConstancia;
    }
    function formatarDataResumida(data) {
        if (!data || !(data instanceof Date)) return '';
        return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Fortaleza' });
    }
    function interpolarCor(cor1RGB, cor2RGB, fator, opacidade = 0.7) {
        const r = Math.round(cor1RGB[0] + (cor2RGB[0] - cor1RGB[0]) * fator);
        const g = Math.round(cor1RGB[1] + (cor2RGB[1] - cor1RGB[1]) * fator);
        const b = Math.round(cor1RGB[2] + (cor2RGB[2] - cor1RGB[2]) * fator);
        return `rgba(${r}, ${g}, ${b}, ${opacidade})`;
    }
    function obterCorAcertos(taxa, opacidade = 0.85) {
        if (taxa < 50) return `rgba(231, 76, 60, ${opacidade})`;
        if (taxa < 75) return `rgba(241, 196, 15, ${opacidade})`;
        return `rgba(46, 204, 113, ${opacidade})`;
    }

    function atualizarGraficoLinha(sessoesFiltradas, intervalo) {
        if (!canvasEstudos) return;
        const ctx = canvasEstudos.getContext('2d'); if (!ctx) return;
        
        if (sessoesFiltradas.length === 0) {
             if (graficoLinha) graficoLinha.destroy();
             graficoLinha = null; 
             ctx.clearRect(0, 0, canvasEstudos.width, canvasEstudos.height);
             return;
        }
        const labels = []; let questoesPorUnidade = []; let acertosPorUnidade = []; const hoje = new Date();
        if (intervalo === 7) {
            const dataMap = {}; 
            sessoesFiltradas.forEach(s => { 
                if (!s.data || !(s.data instanceof Date) || isNaN(s.data.getTime())) return; 
                const key = s.data.toISOString().split('T')[0]; 
                if (!dataMap[key]) dataMap[key] = { questoes: 0, acertos: 0 }; 
                dataMap[key].questoes += Number(s.questoes) || 0; 
                dataMap[key].acertos += Number(s.acertos) || 0; 
            });
            for (let i = 6; i >= 0; i--) { 
                const dia = new Date(hoje); dia.setDate(hoje.getDate() - i); 
                const df = dia.toISOString().split('T')[0]; 
                labels.push(dia.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Fortaleza' }).substring(0, 3)); 
                questoesPorUnidade.push(dataMap[df]?.questoes || 0); 
                acertosPorUnidade.push(dataMap[df]?.acertos || 0); 
            }
        } else if (intervalo === 30) {
            questoesPorUnidade = [0, 0, 0, 0]; acertosPorUnidade = [0, 0, 0, 0]; 
            const fim0 = new Date(hoje); fim0.setHours(0,0,0,0);
            const fim1 = new Date(hoje); fim1.setDate(hoje.getDate() - 7); fim1.setHours(0,0,0,0);
            const fim2 = new Date(hoje); fim2.setDate(hoje.getDate() - 14); fim2.setHours(0,0,0,0);
            const fim3 = new Date(hoje); fim3.setDate(hoje.getDate() - 21); fim3.setHours(0,0,0,0);
            const ini = new Date(hoje); ini.setDate(hoje.getDate() - 28); ini.setHours(0,0,0,0); // Correto para cobrir até 28 dias atrás (4 semanas)
            
            labels.push(
                `${formatarDataResumida(ini)} - ${formatarDataResumida(new Date(fim3.getTime() - 1))}`, // Semana 4
                `${formatarDataResumida(fim3)} - ${formatarDataResumida(new Date(fim2.getTime() - 1))}`, // Semana 3
                `${formatarDataResumida(fim2)} - ${formatarDataResumida(new Date(fim1.getTime() - 1))}`, // Semana 2
                `${formatarDataResumida(fim1)} - ${formatarDataResumida(fim0)}`  // Semana 1 (mais recente)
            );
            sessoesFiltradas.forEach(s => { 
                if (!s.data || !(s.data instanceof Date) || isNaN(s.data.getTime())) return; 
                const sd = new Date(s.data); sd.setHours(0,0,0,0);
                if (sd >= ini && sd < fim3)       { questoesPorUnidade[0] += Number(s.questoes) || 0; acertosPorUnidade[0] += Number(s.acertos) || 0; } 
                else if (sd >= fim3 && sd < fim2) { questoesPorUnidade[1] += Number(s.questoes) || 0; acertosPorUnidade[1] += Number(s.acertos) || 0; } 
                else if (sd >= fim2 && sd < fim1) { questoesPorUnidade[2] += Number(s.questoes) || 0; acertosPorUnidade[2] += Number(s.acertos) || 0; } 
                else if (sd >= fim1 && sd <= fim0) { questoesPorUnidade[3] += Number(s.questoes) || 0; acertosPorUnidade[3] += Number(s.acertos) || 0; }
            });
        } else if (intervalo === 365) {
            const dataMap = {}; 
            sessoesFiltradas.forEach(s => { 
                if (!s.data || !(s.data instanceof Date) || isNaN(s.data.getTime())) return; 
                const key = s.data.toISOString().substring(0, 7); // YYYY-MM
                if (!dataMap[key]) dataMap[key] = { questoes: 0, acertos: 0 }; 
                dataMap[key].questoes += Number(s.questoes) || 0; 
                dataMap[key].acertos += Number(s.acertos) || 0; 
            });
            const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]; 
            const currentFullYear = hoje.getFullYear(); const currentMonthIndex = hoje.getMonth();
            for (let i = 11; i >= 0; i--) { 
                let monthIdx = (currentMonthIndex - i + 12) % 12; 
                let yearForLabel = (currentMonthIndex - i < 0) ? currentFullYear - 1 : currentFullYear; 
                labels.push(m[monthIdx]); 
                const k = `${yearForLabel}-${String(monthIdx + 1).padStart(2, '0')}`; 
                questoesPorUnidade.push(dataMap[k]?.questoes || 0); 
                acertosPorUnidade.push(dataMap[k]?.acertos || 0); 
            }
        }
        const corAcertosLinha = 'rgba(46, 204, 113, 1)'; const corAcertosLinhaBg = 'rgba(46, 204, 113, 0.15)';
        const corResolvidasLinha = 'rgba(52, 152, 219, 1)'; const corResolvidasLinhaBg = 'rgba(52, 152, 219, 0.15)';
        let opts = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, }, scales: { x: { ticks: { display: true, color: '#888', }, grid: { display: true, } }, y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: false }, grid: { color: 'rgba(0, 0, 0, 0.05)', }, ticks: { color: '#888', padding: 10, stepSize: 1 } } }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: false, pointStyle: 'circle', padding: 25, color: '#555' } }, tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.75)', titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 4, displayColors: true, boxPadding: 5, } } };
        if (intervalo === 30 && opts.scales && opts.scales.x && opts.scales.x.ticks) { opts.scales.x.ticks.display = true; } // Mantido true para ver os ranges de semana
        if (graficoLinha) graficoLinha.destroy();
        graficoLinha = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [ { label: 'Questões Corretas', data: acertosPorUnidade, borderColor: corAcertosLinha, backgroundColor: corAcertosLinhaBg, pointBorderColor: corAcertosLinha, pointHoverBackgroundColor: corAcertosLinha, pointHoverBorderColor: '#fff', fill: true, yAxisID: 'y', order: 2 }, { label: 'Questões Resolvidas', data: questoesPorUnidade, borderColor: corResolvidasLinha, backgroundColor: corResolvidasLinhaBg, pointBorderColor: corResolvidasLinha, pointHoverBackgroundColor: corResolvidasLinha, pointHoverBorderColor: '#fff', fill: true, yAxisID: 'y', order: 1 } ] }, options: opts });
    }

    function atualizarGraficoDisciplinas() {
        if (!canvasDisciplinas || !containerGraficoDisciplinas) { if (containerGraficoDisciplinas) containerGraficoDisciplinas.style.display = 'none'; return; }
        const ctxDisciplinas = canvasDisciplinas.getContext('2d'); if (!ctxDisciplinas) { containerGraficoDisciplinas.style.display = 'none'; return; }
        const intervalo = obterIntervalo(); const metrica = selectMetricaDisciplinas ? selectMetricaDisciplinas.value : 'tempo';
        const sessoesAtuais = sessoesEstudo || []; 
        const sessoesFiltradas = sessoesAtuais.filter(s => s.data && ultimosDias(s.data, intervalo)); 
        if (sessoesFiltradas.length === 0) {
            containerGraficoDisciplinas.style.display = 'none';
            if (graficoDisciplinas) { graficoDisciplinas.destroy(); graficoDisciplinas = null;}
            return;
        }
        const statsPorDisciplina = {};
        sessoesFiltradas.forEach(s => { const nome = s.disciplina || "?"; if (!statsPorDisciplina[nome]) statsPorDisciplina[nome] = { t: 0, q: 0, a: 0 }; statsPorDisciplina[nome].t += Number(s.tempo) || 0; statsPorDisciplina[nome].q += Number(s.questoes) || 0; statsPorDisciplina[nome].a += Number(s.acertos) || 0; });
        const temDados = Object.keys(statsPorDisciplina).length > 0; 
        containerGraficoDisciplinas.style.display = temDados ? 'block' : 'none';
        if (!temDados) { if (graficoDisciplinas) { graficoDisciplinas.destroy(); graficoDisciplinas = null; } return; }
        const labels = Object.keys(statsPorDisciplina); let dados = []; let labelM = '';
        switch (metrica) { case 'tempo': labelM = 'Tempo (min)'; dados = labels.map(d => statsPorDisciplina[d].t); break; case 'questoes': labelM = 'Questões'; dados = labels.map(d => statsPorDisciplina[d].q); break; case 'acertos': labelM = 'Acertos (%)'; dados = labels.map(d => statsPorDisciplina[d].q > 0 ? Math.round(statsPorDisciplina[d].a * 100 / statsPorDisciplina[d].q) : 0); break; default: labelM = 'Tempo (min)'; dados = labels.map(d => statsPorDisciplina[d].t); }
        const combined = labels.map((l, i) => ({ l, d: dados[i] })); combined.sort((a, b) => b.d - a.d); const sortedL = combined.map(i => i.l); const sortedD = combined.map(i => i.d);
        const corInterpolarInicio = [224, 242, 241]; const corInterpolarFim = [0, 109, 119];
        let bgC = []; let bdC = [];
        if (metrica === 'acertos') { bgC = sortedD.map(t => obterCorAcertos(t, 0.85)); bdC = sortedD.map(t => obterCorAcertos(t, 1)); }
        else { const min = Math.min(...sortedD.filter(d => typeof d === 'number' && !isNaN(d) )); const max = Math.max(...sortedD.filter(d => typeof d === 'number' && !isNaN(d) )); const r = (max - min === 0 && max !== 0) ? max : (max-min); bgC = sortedD.map(v => interpolarCor(corInterpolarInicio, corInterpolarFim, r === 0 ? 0.5 : (v - min) / r, 0.85)); bdC = sortedD.map(v => interpolarCor(corInterpolarInicio, corInterpolarFim, r === 0 ? 0.5 : (v - min) / r, 1)); }
        if (graficoDisciplinas) graficoDisciplinas.destroy();
        graficoDisciplinas = new Chart(ctxDisciplinas, { type: 'bar', data: { labels: sortedL, datasets: [{ label: labelM, data: sortedD, backgroundColor: bgC, borderColor: bdC, borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, title: { display: true, text: labelM, font: { size: 13, weight: '500' }, color: '#555' }, grid: { display: false }, ticks: { color: '#888', padding: 5, stepSize: 1 } }, y: { ticks: { autoSkip: false, color: '#555', font: { weight: '500' }, padding: 10, }, grid: { display: true, color: 'rgba(0, 0, 0, 0.03)', } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.75)', titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 4, displayColors: true, boxPadding: 5, callbacks: { label: function (ctx) { let l = ctx.dataset.label || ''; if (l) l += ': '; let v = ctx.raw; if (metrica === 'acertos') v += '%'; else if (metrica === 'tempo') v += ' min'; l += v; return l; } } } } } });
    }

    function atualizarGraficoConstancia(numDias = 15) {
        if (!constanciaDiasEl) return;
        constanciaDiasEl.innerHTML = '';
        const sessoesAtuais = sessoesEstudo || [];
        if (sessoesAtuais.length === 0 && constanciaDiasEl) {
            constanciaDiasEl.innerHTML = '<p class="placeholder-mensagem">Sem registros para exibir a constância.</p>';
            return;
        }
        const datasComSessao = new Set();
        sessoesAtuais.forEach(s => { if (s.data && s.data instanceof Date && !isNaN(s.data.getTime())) { const a = s.data.getFullYear(); const m = String(s.data.getMonth() + 1).padStart(2, '0'); const d = String(s.data.getDate()).padStart(2, '0'); datasComSessao.add(`${a}-${m}-${d}`); } });
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        for (let i = 0; i < numDias; i++) {
            const diaVerificar = new Date(hoje); diaVerificar.setDate(hoje.getDate() - i);
            const ano = diaVerificar.getFullYear(); const mes = String(diaVerificar.getMonth() + 1).padStart(2, '0'); const dia = String(diaVerificar.getDate()).padStart(2, '0');
            const diaFormatado = `${ano}-${mes}-${dia}`; const estudouNesteDia = datasComSessao.has(diaFormatado);
            const diaConstanciaDiv = document.createElement('div'); diaConstanciaDiv.classList.add('dia-constancia'); diaConstanciaDiv.classList.add(estudouNesteDia ? 'estudou' : 'nao-estudou');
            const dataLegivel = diaVerificar.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' });
            diaConstanciaDiv.setAttribute('title', `${dataLegivel} - ${estudouNesteDia ? 'Estudou' : 'Não estudou'}`);
            constanciaDiasEl.appendChild(diaConstanciaDiv);
        }
    }

    function atualizarTudoComDadosCarregados() {
        if (!currentUID && (!sessoesEstudo || sessoesEstudo.length === 0)) {
            console.log("RELATORIO: Nenhum usuário ou dados para exibir.");
            // A UI já foi limpa/ajustada por carregarDadosFirestore ou onAuthStateChanged
            return;
        }
        
        const intervalo = obterIntervalo();
        const sessoesFiltradasIntervalo = (sessoesEstudo || []).filter(s => s.data && ultimosDias(s.data, intervalo));
        
        if ((!sessoesEstudo || sessoesEstudo.length === 0) && currentUID) {
            // Logado mas sem sessões
            if (tempoTotalEl) tempoTotalEl.innerText = `0h 0min`;
            if (questoesSemanaEl) questoesSemanaEl.innerText = `0`;
            if (acertosSemanaEl) acertosSemanaEl.innerText = `0%`;
            if (diasConstanciaEl) diasConstanciaEl.innerText = `0 dias`;
            if (focoTextoEl) focoTextoEl.textContent = "Comece a registrar seus estudos para ver seu progresso!";
        } else if (sessoesEstudo && sessoesEstudo.length > 0) {
            const tempoTotal = sessoesFiltradasIntervalo.reduce((s, i) => s + (Number(i.tempo) || 0), 0); 
            const qTotal = sessoesFiltradasIntervalo.reduce((s, i) => s + (Number(i.questoes) || 0), 0); 
            const aTotal = sessoesFiltradasIntervalo.reduce((s, i) => s + (Number(i.acertos) || 0), 0); 
            const txAcertos = qTotal > 0 ? Math.round((aTotal / qTotal) * 100) : 0; 
            const diasConst = calcularConstancia(sessoesEstudo);

            if (tempoTotalEl) { const h = Math.floor(tempoTotal / 60); const m = tempoTotal % 60; tempoTotalEl.innerText = `${h}h ${m}min`; }
            if (questoesSemanaEl) questoesSemanaEl.innerText = qTotal;
            if (acertosSemanaEl) acertosSemanaEl.innerText = `${txAcertos}%`;
            if (diasConstanciaEl) diasConstanciaEl.innerText = `${diasConst} dia${diasConst !== 1 ? 's' : ''}`;
            if (focoTextoEl) { if (diasConst > 0) { focoTextoEl.innerHTML = `Você está a ${diasConst} ${diasConst === 1 ? 'dia' : 'dias'} no foco! <i class="fas fa-fire" style="color:#ff7043;"></i>`; } else { focoTextoEl.textContent = "Continue estudando para criar uma sequência!"; } }
        }
        
        atualizarGraficoLinha(sessoesFiltradasIntervalo, intervalo);
        atualizarGraficoDisciplinas(); 
        atualizarGraficoConstancia(15);
    }
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUID = user.uid;
            console.log("RELATORIO: Usuário logado, UID:", currentUID);
            if (constanciaDiasEl && (!constanciaDiasEl.querySelector('p') || !constanciaDiasEl.querySelector('p').textContent.includes("Carregando"))) {
                 if (constanciaDiasEl.querySelector('p.placeholder-mensagem')) { // Se houver mensagem de "Faça login"
                    constanciaDiasEl.querySelector('p.placeholder-mensagem').textContent = 'Carregando seus dados...';
                 } else {
                    constanciaDiasEl.innerHTML = '<p class="placeholder-mensagem" style="color:#888;font-size:0.9em;width:100%;text-align:center;">Carregando seus dados...</p>';
                 }
            }
            await carregarDadosFirestore(); 
            atualizarTudoComDadosCarregados(); 
        } else {
            currentUID = null;
            sessoesEstudo = []; 
            console.log("RELATORIO: Nenhum usuário logado.");
            atualizarTudoComDadosCarregados(); 
        }
    });

    window.appContext = window.appContext || {};
    window.appContext.atualizarRelatorios = atualizarTudoComDadosCarregados;

    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudoComDadosCarregados);
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', () => {
        // A função atualizarGraficoDisciplinas já usa a variável global sessoesEstudo que é carregada do Firestore.
        // Ela também internamente refiltra pelo intervalo, o que é bom.
        if(currentUID) { // Só atualiza se estiver logado e dados potencialmente carregados
             atualizarGraficoDisciplinas();
        }
    });
});