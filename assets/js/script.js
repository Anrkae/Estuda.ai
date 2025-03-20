let minutos = 0;
let horas = 0;
let cronometro;

const timerEl = document.getElementById("timer");
const questoesEl = document.getElementById("questoes");
const acertosEl = document.getElementById("acertos");
const questoesResolvidasEl = document.getElementById("questoes-resolvidas");

let questoes = 0;
let acertos = 0;

function startTimer() {
  if (!cronometro) {
    cronometro = setInterval(() => {
      minutos++;
      if (minutos >= 60) {
        minutos = 0;
        horas++;
      }
      atualizarTimer();
    }, 60000); // Atualiza de minuto em minuto
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

function registrarQuestoes() {
  let q = prompt("Quantas questões resolveu?");
  let a = prompt("Quantas acertou?");
  q = parseInt(q);
  a = parseInt(a);

  if (!isNaN(q) && q >= 0) {
    questoes += q;
  }
  if (!isNaN(a) && a >= 0) {
    acertos += a;
  }

  questoesEl.textContent = questoes;
  acertosEl.textContent = acertos;
  questoesResolvidasEl.textContent = questoes;
}

document.addEventListener("DOMContentLoaded", function() {
  // Inicializando as variáveis de exibição
  questoesEl.textContent = questoes;
  acertosEl.textContent = acertos;
});
