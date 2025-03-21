// Variáveis globais
let minutos = 0;
let horas = 0;
let cronometro;

const timerEl = document.getElementById('timer');
const questoesEl = document.getElementById('questoes');
const acertosEl = document.getElementById('acertos');
const totalQuestoesEl = document.getElementById('totalQuestoes');
const mediaDiariaEl = document.getElementById('mediaDiaria');

let questoes = 0;
let acertos = 0;
let erros = 0;

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
    questoes += q;
    erros = q - a; // O número de erros é o total de questões menos os acertos
  }
  if (!isNaN(a) && a >= 0) {
    acertos += a;
  }

  questoesEl.textContent = questoes;
  acertosEl.textContent = acertos;
  totalQuestoesEl.textContent = questoes;

  // Atualizando a média diária
  let mediaDiaria = questoes / (horas + minutos / 60);
  mediaDiariaEl.textContent = mediaDiaria.toFixed(1);

  // Atualizando as barras de acertos e erros
  const porcentAcertos = (acertos / questoes) * 100;
  const porcentErros = (erros / questoes) * 100;

  // Ajustando as larguras das barras
  document.querySelector('.bar .acertos').style.width = `${porcentAcertos}%`;
  document.querySelector('.bar .erros').style.width = `${porcentErros}%`;
}
