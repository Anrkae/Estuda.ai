// Armazenamento local (mantém ao fechar o site)
let estudos = JSON.parse(localStorage.getItem('estudos')) || [];
let questoes = JSON.parse(localStorage.getItem('questoes')) || [];

// Salva no localStorage sempre que algo muda
function salvarDados() {
    localStorage.setItem('estudos', JSON.stringify(estudos));
    localStorage.setItem('questoes', JSON.stringify(questoes));
}

// Filtra os últimos 7 dias
function ultimos7Dias(data) {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 6);
    const d = new Date(data);
    return d >= seteDiasAtras && d <= hoje;
}

// Atualiza o resumo da semana
function atualizarResumo() {
    const estudosSemana = estudos.filter(e => ultimos7Dias(e.data));
    const questoesSemana = questoes.filter(q => ultimos7Dias(q.data));

    const minutosTotais = estudosSemana.reduce((soma, e) => soma + e.minutos, 0);
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    document.getElementById('tempo-total').innerText = `${horas}h ${minutos}min`;

    const totalQuestoes = questoesSemana.reduce((soma, q) => soma + q.total, 0);
    const totalAcertos = questoesSemana.reduce((soma, q) => soma + q.acertos, 0);

    document.getElementById('questoes-semana').innerText = totalQuestoes;
    const taxa = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
    document.getElementById('acertos-semana').innerText = `${taxa}%`;
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

// Primeira carga
atualizarResumo();
