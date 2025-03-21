// Variáveis globais
let questoes = 0;
let acertos = 0;
let totalQuestoes = 0;

// Elementos dos indicadores
const questoesEl = document.getElementById('questoes');
const acertosEl = document.getElementById('acertos');
const totalQuestoesEl = document.getElementById('totalQuestoes');

// Função para abrir/fechar o dropdown
function toggleDropdown() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Função para configurar o intervalo de datas
function setDateRange(range) {
    let startDate = '';
    let endDate = new Date();

    switch (range) {
        case '24h':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            break;
    }

    // Atualizar os indicadores com valores fictícios baseados no intervalo
    // (Aqui, você pode integrar com os dados reais conforme necessário)
    questoes = Math.floor(Math.random() * 100);  // Simulando números de questões
    acertos = Math.floor(Math.random() * questoes);  // Simulando acertos
    totalQuestoes = questoes + acertos;  // Somando os valores

    // Atualizando os elementos na interface
    questoesEl.textContent = questoes;
    acertosEl.textContent = acertos;
    totalQuestoesEl.textContent = totalQuestoes;
    
    // Fechar o dropdown após seleção
    document.getElementById("myDropdown").classList.remove("show");
}

// Função para redefinir os dados
function resetData() {
    questoes = 0;
    acertos = 0;
    totalQuestoes = 0;

    // Atualizando os indicadores para 0
    questoesEl.textContent = questoes;
    acertosEl.textContent = acertos;
    totalQuestoesEl.textContent = totalQuestoes;
    
    // Fechar o dropdown
    document.getElementById("myDropdown").classList.remove("show");
}

// Função para garantir que o dropdown funcione ao clicar fora dele
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}
