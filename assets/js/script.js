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
function registrarQuestoes() {
  let q = prompt('Quantas questões resolveu?');
  let a = prompt('Quantas acertou?');
  q = parseInt(q);
  a = parseInt(a);

  if (!isNaN(q) && q >= 0) {
    questoesResolvidas += q;
  }
  if (!isNaN(a) && a >= 0) {
    acertos += a;
  }

  questoesEl.textContent = questoesResolvidas;
  acertosEl.textContent = acertos;
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
