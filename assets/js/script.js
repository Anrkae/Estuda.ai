// Variáveis globais
let questoesResolvidas = 0;
let acertos = 0;
let cronometro;

const questoesEl = document.getElementById('questoes');
const acertosEl = document.getElementById('acertos');
const acertosBar = document.getElementById('acertos-bar');
const errosBar = document.getElementById('erros-bar');

// Funções de Timer
function startTimer() {
  if (!cronometro) {
    cronometro = setInterval(() => {
      minutos++;
      if (minutos >= 60) {
        minutos = 0;
        horas++;
      }
      atualizarTimer();
    }, 60000);
  }
}

function stopTimer() {
  clearInterval(cronometro);
  cronometro = null;
}

function atualizarTimer() {
  const formatar = (num) => num.toString().padStart(2, '0');
  timerEl.textContent = `${formatar(horas)}:${formatar(minutos)}`;
}

// Funções de Questões
function registrarQuestoes(event) {
  event.preventDefault(); // Evita o comportamento padrão de envio do formulário

  // Pega os valores dos inputs
  const totalQuestoes = parseInt(document.getElementById('total-questoes').value);
  const acertosQuestoes = parseInt(document.getElementById('acertos-questoes').value);

  if (!isNaN(totalQuestoes) && totalQuestoes >= 0) {
    questoesResolvidas += totalQuestoes;
  }
  if (!isNaN(acertosQuestoes) && acertosQuestoes >= 0) {
    acertos += acertosQuestoes;
  }

  // Atualiza as estatísticas na tela
  questoesEl.textContent = questoesResolvidas;
  acertosEl.textContent = acertos;

  // Atualiza as barras de progresso
  atualizarBarras();
}

// Atualiza as barras de acertos e erros
function atualizarBarras() {
  // Calcular a quantidade de erros
  let erros = questoesResolvidas - acertos;

  // Atualizar as larguras das barras de progresso
  const percentualAcertos = (acertos / questoesResolvidas) * 100 || 0;
  const percentualErros = (erros / questoesResolvidas) * 100 || 0;

  acertosBar.style.width = `${percentualAcertos}%`;
  errosBar.style.width = `${percentualErros}%`;
}

// Adiciona o evento de envio do formulário
document.getElementById('form-questoes').addEventListener('submit', registrarQuestoes);
