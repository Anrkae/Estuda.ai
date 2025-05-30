document.addEventListener('DOMContentLoaded', () => {

    // Define um tamanho de fonte base.
    Chart.defaults.font.size = 12;
    // Cor padrão para textos (rótulos dos eixos, legendas não especificadas).
    Chart.defaults.color = '#666';
    // Cor padrão para bordas, como linhas de grade (se visíveis).
    Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.05)';
    // Configurações padrão para a legenda.
    Chart.defaults.plugins.legend.labels.boxWidth = 15; // Largura da "caixinha" de cor na legenda.
    Chart.defaults.plugins.legend.labels.padding = 20; // Espaçamento entre itens da legenda.
    // Adiciona um preenchimento interno ao redor da área do gráfico.
    Chart.defaults.layout.padding = 10;

    // Linhas (para gráficos de linha)
    Chart.defaults.elements.line.tension = 0.35; // Suaviza as curvas da linha (0 = reto, 1 = muito curvo).
    Chart.defaults.elements.line.borderWidth = 2.5; // Espessura da linha.

    // Pontos (em gráficos de linha)
    Chart.defaults.elements.point.radius = 3; // Raio dos pontos nos dados.
    Chart.defaults.elements.point.hoverRadius = 5; // Raio dos pontos ao passar o mouse.
    Chart.defaults.elements.point.backgroundColor = '#fff'; // Cor de fundo do ponto (para criar efeito de borda).

    // Barras (para gráficos de barra)
    Chart.defaults.elements.bar.borderRadius = 8; // Arredonda os cantos das barras.
    Chart.defaults.elements.bar.borderSkipped = false; // Garante que o borderRadius seja aplicado em todas as pontas.


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
            sessoesEstudo.forEach(s => { if (s.data && typeof s.data === 'string') { s.data = new Date(s.data); } });
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
            if (s.data && s.data instanceof Date && !isNaN(s.data.getTime())) {
                const ano = s.data.getFullYear();
                const mes = String(s.data.getMonth() + 1).padStart(2, '0');
                const dia = String(s.data.getDate()).padStart(2, '0');
                datasComSessao.add(`${ano}-${mes}-${dia}`);
            } else if (s.data && typeof s.data === 'string') {
                const dateStrMatch = s.data.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (dateStrMatch) datasComSessao.add(dateStrMatch[0]);
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

    // Função para interpolar cores, útil para gradientes em gráficos de barras (não acertos).
    function interpolarCor(cor1RGB, cor2RGB, fator, opacidade = 0.7) {
        const r = Math.round(cor1RGB[0] + (cor2RGB[0] - cor1RGB[0]) * fator);
        const g = Math.round(cor1RGB[1] + (cor2RGB[1] - cor1RGB[1]) * fator);
        const b = Math.round(cor1RGB[2] + (cor2RGB[2] - cor1RGB[2]) * fator);
        return `rgba(${r}, ${g}, ${b}, ${opacidade})`;
    }

    // Cores para o gráfico de desempenho por acertos.
    // Opacidade padrão aumentada para cores mais sólidas e modernas.
    function obterCorAcertos(taxa, opacidade = 0.85) {
        if (taxa < 50) return `rgba(231, 76, 60, ${opacidade})`; // Vermelho (Alizarin - Flat UI Colors)
        if (taxa < 75) return `rgba(241, 196, 15, ${opacidade})`; // Amarelo (Sun Flower - Flat UI Colors)
        return `rgba(46, 204, 113, ${opacidade})`; // Verde (Emerald - Flat UI Colors)
    }

    function atualizarGraficoLinha(sessoesFiltradas, intervalo) {
        if (!canvasEstudos) return;
        const ctx = canvasEstudos.getContext('2d'); if (!ctx) return;
        const labels = []; let questoesPorUnidade = []; let acertosPorUnidade = []; const hoje = new Date();

        // Lógica de preparo dos dados (mantida como no original)
        if (intervalo === 7) {
            const dataMap = {}; sessoesFiltradas.forEach(s => { if (!s.data) return; const key = s.data.toISOString().split('T')[0]; if (!dataMap[key]) dataMap[key] = { questoes: 0, acertos: 0 }; dataMap[key].questoes += s.questoes || 0; dataMap[key].acertos += s.acertos || 0; });
            for (let i = 6; i >= 0; i--) { const dia = new Date(hoje); dia.setDate(hoje.getDate() - i); const df = dia.toISOString().split('T')[0]; labels.push(dia.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Fortaleza' }).substring(0, 3)); questoesPorUnidade.push(dataMap[df]?.questoes || 0); acertosPorUnidade.push(dataMap[df]?.acertos || 0); }
        } else if (intervalo === 30) {
            questoesPorUnidade = [0, 0, 0, 0]; acertosPorUnidade = [0, 0, 0, 0]; const fim0 = new Date(hoje); fim0.setHours(0, 0, 0, 0); const fim1 = new Date(hoje); fim1.setDate(hoje.getDate() - 7); fim1.setHours(0, 0, 0, 0); const fim2 = new Date(hoje); fim2.setDate(hoje.getDate() - 14); fim2.setHours(0, 0, 0, 0); const fim3 = new Date(hoje); fim3.setDate(hoje.getDate() - 21); fim3.setHours(0, 0, 0, 0); const ini = new Date(hoje); ini.setDate(hoje.getDate() - 28); ini.setHours(0, 0, 0, 0);
            labels.push(...[`${formatarDataResumida(ini)} - ${formatarDataResumida(fim3)}`, `${formatarDataResumida(new Date(fim3.getTime() + 864e5))} - ${formatarDataResumida(fim2)}`, `${formatarDataResumida(new Date(fim2.getTime() + 864e5))} - ${formatarDataResumida(fim1)}`, `${formatarDataResumida(new Date(fim1.getTime() + 864e5))} - ${formatarDataResumida(fim0)}`]);
            sessoesFiltradas.forEach(s => { if (!s.data) return; const sd = new Date(s.data); sd.setHours(0, 0, 0, 0); if (sd >= ini && sd <= fim3) { questoesPorUnidade[0] += s.questoes || 0; acertosPorUnidade[0] += s.acertos || 0; } else if (sd > fim3 && sd <= fim2) { questoesPorUnidade[1] += s.questoes || 0; acertosPorUnidade[1] += s.acertos || 0; } else if (sd > fim2 && sd <= fim1) { questoesPorUnidade[2] += s.questoes || 0; acertosPorUnidade[2] += s.acertos || 0; } else if (sd > fim1 && sd <= fim0) { questoesPorUnidade[3] += s.questoes || 0; acertosPorUnidade[3] += s.acertos || 0; } });
        } else if (intervalo === 365) {
            const dataMap = {}; sessoesFiltradas.forEach(s => { if (!s.data) return; const key = s.data.toISOString().substring(0, 7); if (!dataMap[key]) dataMap[key] = { questoes: 0, acertos: 0 }; dataMap[key].questoes += s.questoes || 0; dataMap[key].acertos += s.acertos || 0; });
            const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]; const y = hoje.getFullYear(); const mo = hoje.getMonth();
            for (let i = 11; i >= 0; i--) { let mi = (mo - i + 12) % 12; let yr = (mo - i < 0) ? y - 1 : y; labels.push(m[mi]); const k = `${yr}-${String(mi + 1).padStart(2, '0')}`; questoesPorUnidade.push(dataMap[k]?.questoes || 0); acertosPorUnidade.push(dataMap[k]?.acertos || 0); }
        }

        // --- Novas Cores para o Gráfico de Linha ---
        // Use cores mais vibrantes ou pastéis, dependendo da sua preferência.
        // Exemplo com tons "flat" e modernos:
        const corAcertosLinha = 'rgba(46, 204, 113, 1)';   // Verde (Emerald)
        const corAcertosLinhaBg = 'rgba(46, 204, 113, 0.15)'; // Fundo com baixa opacidade
        const corResolvidasLinha = 'rgba(52, 152, 219, 1)'; // Azul (Peter River)
        const corResolvidasLinhaBg = 'rgba(52, 152, 219, 0.15)';

        // --- Opções Detalhadas para o Gráfico de Linha ---
        let opts = {
            responsive: true, // O gráfico se ajusta ao tamanho do container.
            maintainAspectRatio: false, // Permite definir altura independente da largura.
            interaction: {
                mode: 'index', // Mostra tooltips para todos os datasets no mesmo índice do eixo X.
                intersect: false, // Tooltip aparece mesmo sem passar exatamente sobre o ponto.
            },
            scales: {
                x: { // Configurações do eixo X
                    ticks: {
                        display: true, // Mostrar os rótulos (labels) do eixo X.
                        color: '#888', // Cor dos rótulos (datas, dias da semana).
                    },
                    grid: {
                        display: true, // Remove as linhas de grade verticais (visual mais limpo).
                        // drawBorder: false, // Opcional: remove a linha principal do eixo X.
                    }
                },
                y: { // Configurações do eixo Y
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true, // Começa o eixo Y do zero.
                    title: {
                        display: false // Título do eixo Y (geralmente desnecessário se a legenda é clara).
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)', // Linhas de grade horizontais bem sutis.
                        // drawBorder: false, // Opcional: remove a linha principal do eixo Y.
                    },
                    ticks: {
                        color: '#888', // Cor dos números no eixo Y.
                        padding: 10, // Espaçamento entre os números e a linha do eixo.
                        // Exemplo de callback para formatar os números (adicionar " Q" para questões)
                        // callback: function(value) { if (Number.isInteger(value)) return value + ' Q'; return value; }
                    }
                }
            },
            plugins: { // Configurações de plugins como legenda e tooltips.
                legend: {
                    position: 'bottom', // Posição da legenda.
                    labels: {
                        usePointStyle: false, // Usa bolinhas (ou o estilo do ponto) na legenda.
                        pointStyle: 'circle', // Define o estilo do ponto como círculo.
                        padding: 25, // Espaçamento entre os itens da legenda.
                        color: '#555' // Cor do texto da legenda.
                    }
                },
                tooltip: { // Configurações do balão de informação que aparece ao passar o mouse.
                    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Fundo do tooltip.
                    titleFont: { size: 14, weight: 'bold' }, // Fonte do título do tooltip.
                    bodyFont: { size: 12 }, // Fonte do corpo do tooltip.
                    padding: 10, // Preenchimento interno do tooltip.
                    cornerRadius: 4, // Bordas arredondadas para o tooltip.
                    displayColors: true, // Mostra a caixinha de cor ao lado de cada item no tooltip.
                    boxPadding: 5, // Espaçamento dentro da caixinha de cor.
                }
            }
        };

        if (intervalo === 30) { // Esconde os labels do eixo X para o intervalo de 30 dias se forem muitos
            if (!opts.scales.x.ticks) opts.scales.x.ticks = {};
            opts.scales.x.ticks.display = false;
        }

        if (graficoLinha) graficoLinha.destroy();
        graficoLinha = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Questões Corretas',
                        data: acertosPorUnidade,
                        borderColor: corAcertosLinha,
                        backgroundColor: corAcertosLinhaBg,
                        pointBorderColor: corAcertosLinha, // Cor da borda do ponto.
                        pointHoverBackgroundColor: corAcertosLinha, // Cor de fundo do ponto no hover.
                        pointHoverBorderColor: '#fff', // Cor da borda do ponto no hover.
                        fill: true, // Preenche a área abaixo da linha.
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        label: 'Questões Resolvidas',
                        data: questoesPorUnidade,
                        borderColor: corResolvidasLinha,
                        backgroundColor: corResolvidasLinhaBg,
                        pointBorderColor: corResolvidasLinha,
                        pointHoverBackgroundColor: corResolvidasLinha,
                        pointHoverBorderColor: '#fff',
                        fill: true,
                        yAxisID: 'y',
                        order: 1
                    }
                ]
            },
            options: opts
        });
    }

    function atualizarGraficoDisciplinas() {
        if (!canvasDisciplinas || !containerGraficoDisciplinas) { if (containerGraficoDisciplinas) containerGraficoDisciplinas.style.display = 'none'; return; }
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

        // --- Cores Base para Interpolação no Gráfico de Barras (Tempo/Questões) ---
        // Escolha cores que criem um gradiente agradável.
        // Exemplo: de um azul esverdeado bem claro para um escuro.
        const corInterpolarInicio = [224, 242, 241]; // Ex: Tealish White
        const corInterpolarFim = [0, 109, 119];     // Ex: Dark Teal

        let bgC = []; let bdC = [];
        if (metrica === 'acertos') {
            bgC = sortedD.map(t => obterCorAcertos(t, 0.85)); // Opacidade ligeiramente maior
            bdC = sortedD.map(t => obterCorAcertos(t, 1));   // Borda sólida
        } else {
            const min = Math.min(...sortedD); const max = Math.max(...sortedD); const r = max - min;
            // Usa as novas cores base para interpolar
            bgC = sortedD.map(v => interpolarCor(corInterpolarInicio, corInterpolarFim, r === 0 ? 0.5 : (v - min) / r, 0.85));
            bdC = sortedD.map(v => interpolarCor(corInterpolarInicio, corInterpolarFim, r === 0 ? 0.5 : (v - min) / r, 1));
        }

        if (graficoDisciplinas) graficoDisciplinas.destroy();
        graficoDisciplinas = new Chart(ctxDisciplinas, {
            type: 'bar',
            data: {
                labels: sortedL,
                datasets: [{
                    label: labelM,
                    data: sortedD,
                    backgroundColor: bgC,
                    borderColor: bdC,
                    borderWidth: 1
                    // borderRadius: 6, // Já definido globalmente
                }]
            },
            // --- Opções Detalhadas para o Gráfico de Barras ---
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Torna o gráfico de barras horizontal.
                scales: {
                    x: { // Eixo X (valores)
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: labelM, // Título do eixo X (ex: "Tempo (min)")
                            font: { size: 13, weight: '500' }, // Fonte do título.
                            color: '#555' // Cor do título.
                        },
                        grid: {
                            display: false // Remove linhas de grade verticais.
                        },
                        ticks: {
                            color: '#888', // Cor dos números no eixo X.
                            padding: 5,
                        }
                    },
                    y: { // Eixo Y (disciplinas)
                        ticks: {
                            autoSkip: false, // Garante que todos os nomes de disciplina apareçam.
                            color: '#555', // Cor dos nomes das disciplinas.
                            font: { weight: '500' }, // Deixa o nome da disciplina um pouco mais forte.
                            padding: 10, // Espaçamento.
                        },
                        grid: {
                            display: true, // Mostra linhas de grade horizontais.
                            color: 'rgba(0, 0, 0, 0.03)', // Linhas de grade muito sutis.
                            // drawBorder: false, // Opcional
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Geralmente desnecessário para gráfico de barras com uma só série.
                    },
                    tooltip: { // Configurações de tooltip consistentes com o gráfico de linha.
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 10,
                        cornerRadius: 4,
                        displayColors: true, // Mostra a cor da barra no tooltip.
                        boxPadding: 5,
                        callbacks: { // Mantém a formatação original do label do tooltip.
                            label: function (ctx) {
                                let l = ctx.dataset.label || '';
                                if (l) l += ': ';
                                let v = ctx.raw;
                                if (metrica === 'acertos') v += '%';
                                else if (metrica === 'tempo') v += ' min';
                                l += v;
                                return l;
                            }
                        }
                    }
                }
            }
        });
    }

    function atualizarGraficoConstancia(numDias = 15) {
        if (!constanciaDiasEl) return;
        constanciaDiasEl.innerHTML = '';

        const sessoesAtuais = sessoesEstudo && sessoesEstudo.length > 0 ? sessoesEstudo : JSON.parse(localStorage.getItem('sessoesEstudo')) || [];
        if (sessoesAtuais.length === 0 && constanciaDiasEl) {
            constanciaDiasEl.innerHTML = '<p style="color:#888;font-size:0.9em;width:100%;text-align:center;">Sem registros para exibir a constância.</p>';
            return;
        }

        const datasComSessao = new Set();
        sessoesAtuais.forEach(s => {
            if (s.data && s.data instanceof Date && !isNaN(s.data.getTime())) {
                const a = s.data.getFullYear(); const m = String(s.data.getMonth() + 1).padStart(2, '0'); const d = String(s.data.getDate()).padStart(2, '0');
                datasComSessao.add(`${a}-${m}-${d}`);
            } else if (s.data && typeof s.data === 'string') {
                const match = s.data.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (match) datasComSessao.add(match[0]);
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
        atualizarGraficoConstancia(15); // Você pode ajustar o número de dias aqui
    }

    // Permite que outras partes da aplicação (se houver) chamem a atualização.
    window.appContext = window.appContext || {};
    window.appContext.atualizarTudo = atualizarTudo;

    if (selectIntervalo) selectIntervalo.addEventListener('change', atualizarTudo);
    if (selectMetricaDisciplinas) selectMetricaDisciplinas.addEventListener('change', atualizarGraficoDisciplinas);

    atualizarTudo();
});
