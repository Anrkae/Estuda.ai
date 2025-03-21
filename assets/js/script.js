// Variáveis globais
let minutos = 0;
let horas = 0;
let cronometro;

const timerEl = document.getElementById('timer');
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

  // Atualizando a exibição de questões e acertos
  totalQuestoesEl.textContent = questoes;

  // Calculando e atualizando a média diária
  let mediaDiaria = questoes / (horas + minutos / 60);
  mediaDiariaEl.textContent = mediaDiaria.toFixed(1);

  // Atualizando as barras de acertos e erros no card Estatísticas
  atualizarBarras();

  // Atualizando as barras de acertos e erros no card Desempenho
  atualizarBarrasDesempenho();
}

function atualizarBarras() {
  // Calculando porcentagem de acertos e erros
  const porcentAcertos = (acertos / questoes) * 100;
  const porcentErros = (erros / questoes) * 100;

  // Atualizando as larguras das barras no card Estatísticas
  const barraAcertos = document.querySelector('.bar .acertos');
  const barraErros = document.querySelector('.bar .erros');

  if (barraAcertos && barraErros) {
    barraAcertos.style.width = `${porcentAcertos}%`;
    barraErros.style.width = `${porcentErros}%`;
  }

  // Exibindo as porcentagens de acertos e erros no card Estatísticas
  const porcentAcertosEl = document.querySelector('.bar.acertos + span');
  const porcentErrosEl = document.querySelector('.bar.erros + span');

  if (porcentAcertosEl && porcentErrosEl) {
    porcentAcertosEl.textContent = `${porcentAcertos.toFixed(1)}% Acertos`;
    porcentErrosEl.textContent = `${porcentErros.toFixed(1)}% Erros`;
  }
}

function atualizarBarrasDesempenho() {
  // Calculando porcentagem de acertos e erros para o card de desempenho
  const porcentAcertos = (acertos / questoes) * 100;
  const porcentErros = (erros / questoes) * 100;

  // Atualizando as larguras das barras no card de desempenho
  const barraAcertosDesempenho = document.querySelector('.bar-desempenho .acertos');
  const barraErrosDesempenho = document.querySelector('.bar-desempenho .erros');

  if (barraAcertosDesempenho && barraErrosDesempenho) {
    barraAcertosDesempenho.style.width = `${porcentAcertos}%`;
    barraErrosDesempenho.style.width = `${porcentErros}%`;
  }

  // Exibindo as porcentagens de acertos e erros no card de desempenho
  const porcentAcertosDesempenhoEl = document.querySelector('.bar-desempenho.acertos + span');
  const porcentErrosDesempenhoEl = document.querySelector('.bar-desempenho.erros + span');

  if (porcentAcertosDesempenhoEl && porcentErrosDesempenhoEl) {
    porcentAcertosDesempenhoEl.textContent = `${porcentAcertos.toFixed(1)}% Acertos`;
    porcentErrosDesempenhoEl.textContent = `${porcentErros.toFixed(1)}% Erros`;
  }
}
