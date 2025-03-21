// Dados simulados (depois será dinâmico)
let tempoEstudadoHoje = 0; // em minutos
let questoesResolvidasHoje = 0;
let acertosHoje = 0;

// Atualiza o resumo
function atualizarResumo() {
    const horas = Math.floor(tempoEstudadoHoje / 60);
    const minutos = tempoEstudadoHoje % 60;
    document.getElementById('tempo-total').innerText = `${horas}h ${minutos}min`;

    document.getElementById('questoes-dia').innerText = questoesResolvidasHoje;

    const taxa = questoesResolvidasHoje > 0 ? Math.round((acertosHoje / questoesResolvidasHoje) * 100) : 0;
    document.getElementById('acertos-dia').innerText = `${taxa}%`;
}

function registrarEstudo() {
    const tempo = prompt("Quanto tempo estudou? (em minutos)");
    const minutos = parseInt(tempo);
    if (!isNaN(minutos) && minutos > 0) {
        tempoEstudadoHoje += minutos;
        atualizarResumo();
    }
}

function registrarQuestoes() {
    const total = prompt("Quantas questões resolveu?");
    const acertos = prompt("Quantas acertou?");
    const t = parseInt(total);
    const a = parseInt(acertos);
    if (!isNaN(t) && !isNaN(a) && t > 0 && a >= 0 && a <= t) {
        questoesResolvidasHoje += t;
        acertosHoje += a;
        atualizarResumo();
    }
}

// Primeira carga
atualizarResumo();
