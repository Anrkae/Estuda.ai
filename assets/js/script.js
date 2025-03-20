let minutos = 0;
let horas = 0;
let cronometro;

const timerEl = document.getElementById("timer");
const questoesEl = document.getElementById("questoes");
const acertosEl = document.getElementById("acertos");
const totalQuestoesEl = document.getElementById("totalQuestoes");

let questoes = 0;
let acertos = 0;

// Cronômetro
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

// Menu lateral
function abrirMenu() {
  document.getElementById("menu-lateral").style.width = "250px";
}

function fecharMenu() {
  document.getElementById("menu-lateral").style.width = "0";
}

// Tema: Detectar tema do sistema
window.onload = () => {
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo) {
    document.body.classList.toggle('dark', temaSalvo === 'dark');
  } else {
    const prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark', prefereEscuro);
  }
};

// Alternar tema manual
function toggleTema() {
  document.body.classList.toggle('dark');
  const temaAtual = document.body.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('tema', temaAtual);
}
