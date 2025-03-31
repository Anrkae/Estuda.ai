// Em /assets/js/script.js
document.addEventListener('DOMContentLoaded', () => {

    // Lógica de dados e gráfico (localStorage, funções, etc.)
    let estudos = JSON.parse(localStorage.getItem('estudos')) || [];
    let questoes = JSON.parse(localStorage.getItem('questoes')) || [];
    let grafico = null;

    function salvarDados() {
        // Garante que estamos salvando os arrays atuais
        localStorage.setItem('estudos', JSON.stringify(estudos));
        localStorage.setItem('questoes', JSON.stringify(questoes));
        console.log("Dados salvos:", { estudos, questoes }); // Log para depuração
    }

    function ultimosDias(data, dias) {
        const hoje = new Date();
        const diasAtras = new Date();
        // Define a hora para 00:00:00 para incluir o dia inteiro
        diasAtras.setHours(0, 0, 0, 0);
        diasAtras.setDate(hoje.getDate() - (dias - 1)); // Inclui o dia atual no período

        const d = typeof data === 'string' ? new Date(data) : data;
        if (isNaN(d.getTime())) return false;
        // Define a hora da data do evento para comparar dias inteiros
        d.setHours(0,0,0,0);

        // Compara se a data 'd' está entre 'diasAtras' e 'hoje' (ajustado para incluir hoje)
        return d >= diasAtras && d <= hoje;
     }

    function obterIntervalo() {
        const select = document.getElementById('intervaloGrafico');
        return select ? parseInt(select.value) : 7;
    }

    function atualizarGrafico(estudosFiltrados, questoesFiltradas, intervalo) {
        const labels = [];
        const minutosPorUnidade = [];
        const questoesPorUnidade = [];
        const hoje = new Date();

        try {
            // Lógica para preparar labels e dados (7, 30, 365 dias)
            // (Mantida como você enviou, com pequenas correções de data/formato)
            if (intervalo === 7) {
                for (let i = 6; i >= 0; i--) {
                    const dia = new Date();
                    dia.setDate(hoje.getDate() - i);
                    const dataFormatada = dia.toISOString().split('T')[0];
                    labels.push(dia.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0,3));
                    const minutosDia = estudosFiltrados.filter(e => e.data && e.data.startsWith(dataFormatada)).reduce((soma, e) => soma + e.minutos, 0);
                    minutosPorUnidade.push(minutosDia);
                    const questoesDia = questoesFiltradas.filter(q => q.data && q.data.startsWith(dataFormatada)).reduce((soma, q) => soma + q.total, 0);
                    questoesPorUnidade.push(questoesDia);
                }
            } else if (intervalo === 30) {
                 for (let i = 29; i >= 0; i--) {
                     const dia = new Date();
                     dia.setDate(hoje.getDate() - i);
                     const dataFormatada = dia.toISOString().split('T')[0];
                     labels.push( (i % 5 === 0 || i === 0) ? dia.toLocaleDateString('pt-BR', {day:'numeric', month:'numeric'}) : '' ); // Exibe a cada 5 dias e o último
                     const minutosDia = estudosFiltrados.filter(e => e.data && e.data.startsWith(dataFormatada)).reduce((soma, e) => soma + e.minutos, 0);
                     minutosPorUnidade.push(minutosDia);
                     const questoesDia = questoesFiltradas.filter(q => q.data && q.data.startsWith(dataFormatada)).reduce((soma, q) => soma + q.total, 0);
                     questoesPorUnidade.push(questoesDia);
                 }
            } else if (intervalo === 365) {
                const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const anoAtual = hoje.getFullYear();
                const mesAtual = hoje.getMonth();
                for (let i = 0; i < 12; i++) {
                    let mesIndex = (mesAtual - i + 12) % 12;
                    let ano = anoAtual;
                    if (mesIndex > mesAtual) { ano--; }
                    labels.unshift(meses[mesIndex]);
                    const mesFormatado = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
                    const minutosMes = estudosFiltrados.filter(e => e.data && e.data.startsWith(mesFormatado)).reduce((soma, e) => soma + e.minutos, 0);
                    minutosPorUnidade.unshift(minutosMes);
                    const questoesMes = questoesFiltradas.filter(q => q.data && q.data.startsWith(mesFormatado)).reduce((soma, q) => soma + q.total, 0);
                    questoesPorUnidade.unshift(questoesMes);
                }
            }

            const canvas = document.getElementById('graficoEstudos');
            if (!canvas) {
                // Não loga erro se o canvas não existe, apenas não tenta desenhar
                // console.error("Elemento canvas #graficoEstudos não encontrado.");
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                 console.error("Não foi possível obter o contexto 2D do canvas.");
                 return;
             }

            if (grafico) {
                grafico.destroy();
            }

            grafico = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                         {
                             label: 'Minutos Estudados', data: minutosPorUnidade, fill: false, borderColor: 'rgba(76, 175, 80, 0.8)', borderWidth: 2, tension: 0.4, pointRadius: 3, pointBackgroundColor: 'rgba(76, 175, 80, 1)'
                         },
                         {
                             label: 'Questões Resolvidas', data: questoesPorUnidade, fill: false, borderColor: 'rgba(33, 150, 243, 0.8)', borderWidth: 2, tension: 0.4, pointRadius: 3, pointBackgroundColor: 'rgba(33, 150, 243, 1)'
                         }
                    ]
                },
                options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     scales: { y: { beginAtZero: true } },
                     plugins: { legend: { position: 'bottom' } }
                }
            });
         } catch (error) {
             console.error("Erro ao gerar/atualizar gráfico:", error);
         }
    }

     function atualizarResumo() {
         const intervalo = obterIntervalo();
         const estudosFiltrados = estudos.filter(e => ultimosDias(e.data, intervalo));
         const questoesFiltradas = questoes.filter(q => ultimosDias(q.data, intervalo));

         // Atualiza cards de resumo (Apenas se os elementos existirem na página atual)
         const tempoTotalEl = document.getElementById('tempo-total');
         if(tempoTotalEl) {
             const minutosTotais = estudosFiltrados.reduce((soma, e) => soma + e.minutos, 0);
             const horas = Math.floor(minutosTotais / 60);
             const minutos = minutosTotais % 60;
             tempoTotalEl.innerText = `${horas}h ${minutos}min`;
         }

         const totalQuestoes = questoesFiltradas.reduce((soma, q) => soma + q.total, 0);
         const totalAcertos = questoesFiltradas.reduce((soma, q) => soma + q.acertos, 0);

         const questoesSemanaEl = document.getElementById('questoes-semana');
         if(questoesSemanaEl) questoesSemanaEl.innerText = totalQuestoes;

         const taxa = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
         const acertosSemanaEl = document.getElementById('acertos-semana');
         if(acertosSemanaEl) acertosSemanaEl.innerText = `${taxa}%`;

         // Chama a atualização do gráfico APENAS se o canvas existir
         if (document.getElementById('graficoEstudos')) {
             atualizarGrafico(estudosFiltrados, questoesFiltradas, intervalo);
         }
     }

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // PARTE ADICIONADA: Expor variáveis e funções para outros scripts
    window.appContext = window.appContext || {};
    window.appContext.estudos = estudos; // Expõe a referência ao array
    window.appContext.questoes = questoes; // Expõe a referência ao array
    window.appContext.salvarDados = salvarDados; // Expõe a função
    window.appContext.atualizarResumo = atualizarResumo; // Expõe a função
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    // --- Inicialização ---
    const selectIntervalo = document.getElementById('intervaloGrafico');
     if (selectIntervalo) {
         selectIntervalo.addEventListener('change', atualizarResumo);
     }

    // Chamada inicial para carregar resumo e gráfico (SE elementos existirem)
     if (document.getElementById('tempo-total') && document.getElementById('graficoEstudos')) {
        atualizarResumo();
     }

}); // Fim do DOMContentLoaded
      
