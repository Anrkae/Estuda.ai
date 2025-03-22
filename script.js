let estudos = JSON.parse(localStorage.getItem('estudos')) || [];
let questoes = JSON.parse(localStorage.getItem('questoes')) || [];

function salvarDados() {
    localStorage.setItem('estudos', JSON.stringify(estudos));
    localStorage.setItem('questoes', JSON.stringify(questoes));
}

function ultimos7Dias(data) {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 6);
    const d = new Date(data);
    return d >= seteDiasAtras && d <= hoje;
}

function atualizarResumo() {
    const intervalo = obterIntervalo();  // Pega o intervalo selecionado no dropdown

    const estudosSemana = estudos.filter(e => ultimosDias(e.data, intervalo));
    const questoesSemana = questoes.filter(q => ultimosDias(q.data, intervalo));

    const minutosTotais = estudosSemana.reduce((soma, e) => soma + e.minutos, 0);
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    document.getElementById('tempo-total').innerText = `${horas}h ${minutos}min`;

    const totalQuestoes = questoesSemana.reduce((soma, q) => soma + q.total, 0);
    const totalAcertos = questoesSemana.reduce((soma, q) => soma + q.acertos, 0);

    document.getElementById('questoes-semana').innerText = totalQuestoes;
    const taxa = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
    document.getElementById('acertos-semana').innerText = `${taxa}%`;

    atualizarGrafico(estudosSemana, questoesSemana, intervalo);
}

function registrarEstudo() {
    const tempo = prompt("Quanto tempo estudou? (em minutos)");
    const minutos = parseInt(tempo);
    if (!isNaN(minutos) && minutos > 0) {
        estudos.push({ minutos: minutos, data: new Date().toISOString() });
        salvarDados();
        atualizarResumo();
    }
}

function registrarQuestoes() {
    const total = prompt("Quantas questões resolveu?");
    const acertos = prompt("Quantas acertou?");
    const t = parseInt(total);
    const a = parseInt(acertos);
    if (!isNaN(t) && !isNaN(a) && t > 0 && a >= 0 && a <= t) {
        questoes.push({ total: t, acertos: a, data: new Date().toISOString() });
        salvarDados();
        atualizarResumo();
    }
}

let grafico = null;

function obterIntervalo() {
    const intervalo = document.getElementById('intervaloGrafico').value;
    return parseInt(intervalo);
}

function ultimosDias(data, dias) {
    const hoje = new Date();
    const diasAtras = new Date();
    diasAtras.setDate(hoje.getDate() - dias);
    const d = new Date(data);
    return d >= diasAtras && d <= hoje;
}

function atualizarGrafico(estudosSemana, questoesSemana, intervalo) {
    const dias = [];
    const minutosPorDia = [];
    const questoesPorDia = [];

    const hoje = new Date();
    if (intervalo === 7) {
        // Para os últimos 7 dias, usamos o formato de dias da semana (Seg, Ter, Qua...)
        for (let i = 6; i >= 0; i--) {
            const dia = new Date();
            dia.setDate(hoje.getDate() - i);
            const dataFormatada = dia.toISOString().split('T')[0];

            dias.push(dia.toLocaleDateString('pt-BR', { weekday: 'short' }));

            const minutosDia = estudosSemana
                .filter(e => e.data.startsWith(dataFormatada))
                .reduce((soma, e) => soma + e.minutos, 0);
            minutosPorDia.push(minutosDia);

            const questoesDia = questoesSemana
                .filter(q => q.data.startsWith(dataFormatada))
                .reduce((soma, q) => soma + q.total, 0);
            questoesPorDia.push(questoesDia);
        }
    } else if (intervalo === 30) {
        // Para os últimos 30 dias, não exibimos nada no eixo X
        for (let i = 29; i >= 0; i--) {
            const dia = new Date();
            dia.setDate(hoje.getDate() - i);

            dias.push("");  // Deixa vazio para não exibir nada
            const minutosDia = estudosSemana
                .filter(e => e.data.startsWith(dia.toISOString().split('T')[0]))
                .reduce((soma, e) => soma + e.minutos, 0);
            minutosPorDia.push(minutosDia);

            const questoesDia = questoesSemana
                .filter(q => q.data.startsWith(dia.toISOString().split('T')[0]))
                .reduce((soma, q) => soma + q.total, 0);
            questoesPorDia.push(questoesDia);
        }
    } else if (intervalo === 365) {
        // Para o último ano, exibe os meses do ano (Jan, Fev, Mar, etc.)
        const meses = [
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
        ];
        for (let i = 11; i >= 0; i--) {
            const mes = new Date();
            mes.setMonth(i);
            const mesFormatado = mes.toISOString().split('T')[0].slice(0, 7);

            dias.push(meses[i]);

            const minutosMes = estudosSemana
                .filter(e => e.data.startsWith(mesFormatado))
                .reduce((soma, e) => soma + e.minutos, 0);
            minutosPorDia.push(minutosMes);

            const questoesMes = questoesSemana
                .filter(q => q.data.startsWith(mesFormatado))
                .reduce((soma, q) => soma + q.total, 0);
            questoesPorDia.push(questoesMes);
        }
    }

    if (grafico) grafico.destroy();

    const ctx = document.getElementById('graficoEstudos').getContext('2d');
    grafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dias,
            datasets: [
                {
                    label: 'Minutos Estudados',
                    data: minutosPorDia,
                    fill: false,
                    borderColor: 'rgba(76, 175, 80, 0.6)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 2,
                    pointBackgroundColor: 'rgba(76, 175, 80, 0.8)',
                    pointBorderColor: 'rgba(76, 175, 80, 1)',
                    lineTension: 0.4
                },
                {
                    label: 'Questões Resolvidas',
                    data: questoesPorDia,
                    fill: false,
                    borderColor: 'rgba(33, 150, 243, 0.6)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 2,
                    pointBackgroundColor: 'rgba(33, 150, 243, 0.8)',
                    pointBorderColor: 'rgba(33, 150, 243, 1)',
                    lineTension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 2 }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Funcionalidade do Sidebar
function toggleSidebar() {
    document.body.classList.toggle('sidebar-ativa');
}

atualizarResumo();
