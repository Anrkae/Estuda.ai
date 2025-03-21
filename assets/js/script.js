let minutos = 0;
let horas = 0;
let cronometro;

const timerEl = document.getElementById('timer');
const questoesEl = document.getElementById('questoes');
const acertosEl = document.getElementById('acertos');
const totalQuestoesEl = document.getElementById('totalQuestoes');

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
  let q = prompt('Quantas questões resolveu?');
  let a = prompt('Quantas acertou?');
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
  totalQuestoesEl.textContent = questoes;
}

function resetDates() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
}

function toggleDateOptions(event) {
  const options = document.getElementById('date-options');
  options.style.display = options.style.display === 'none' ? 'block' : 'none';

  // Impede que o clique no ícone de calendário feche o menu imediatamente
  event.stopPropagation();
}

// Fecha o menu de datas se o clique for fora do ícone de calendário ou do menu
document.addEventListener('click', function(event) {
  const dateOptions = document.getElementById('date-options');
  const calendarIcon = document.querySelector('.calendar-icon');
  
  // Se o clique não for no ícone de calendário ou no menu, fecha o menu
  if (!calendarIcon.contains(event.target) && !dateOptions.contains(event.target)) {
    dateOptions.style.display = 'none';
  }
});

function toggleDateInputs() {
  const inputs = document.getElementById('startDate').style.display === 'block';
  document.getElementById('startDate').style.display = inputs ? 'none' : 'block';
  document.getElementById('endDate').style.display = inputs ? 'none' : 'block';
}

function setDateRange(range) {
  let startDate = '';
  let endDate = '';
  const now = new Date();

  switch (range) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
  }

  // Exibindo intervalo selecionado
  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

  // Fecha o menu após selecionar a data
  document.getElementById('date-options').style.display = 'none';
}
