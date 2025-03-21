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

function toggleDateOptions() {
  const options = document.getElementById('date-options');
  options.style.display = options.style.display === 'none' ? 'block' : 'none';
}

function toggleDateInputs() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  startDateInput.style.display = startDateInput.style.display === 'none' ? 'block' : 'none';
  endDateInput.style.display = endDateInput.style.display === 'none' ? 'block' : 'none';

  if (startDateInput.style.display === 'block' && endDateInput.style.display === 'block') {
    // Inicializando o Flatpickr apenas quando os inputs de data estiverem visíveis
    flatpickr("#startDate", {
      dateFormat: "Y-m-d",
      onChange: function(selectedDates) {
        console.log("Data Início:", selectedDates);
      }
    });

    flatpickr("#endDate", {
      dateFormat: "Y-m-d",
      onChange: function(selectedDates) {
        console.log("Data Fim:", selectedDates);
      }
    });
  }
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
}
