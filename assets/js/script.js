// Variáveis globais
let minutos = 0;
let horas = 0;
let cronometro;

const timerEl = document.getElementById('timer');
const questoesEl = document.getElementById('questoes');
const acertosEl = document.getElementById('acertos');
const totalQuestoesEl = document.getElementById('totalQuestoes');

let questoes = 0;
let acertos = 0;

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
  }
  if (!isNaN(a) && a >= 0) {
    acertos += a;
  }

  questoesEl.textContent = questoes;
  acertosEl.textContent = acertos;
  totalQuestoesEl.textContent = questoes;
  atualizarGraficoDesempenho();
}

// Função para atualizar o gráfico de desempenho
function atualizarGraficoDesempenho() {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  
  const total = questoes || 1;  // Para evitar divisão por zero
  const acertosPorcentagem = (acertos / total) * 100;
  const errosPorcentagem = 100 - acertosPorcentagem;

  // Criação ou atualização do gráfico
  if (window.performanceChart) {
    window.performanceChart.data.datasets[0].data = [acertosPorcentagem, errosPorcentagem];
    window.performanceChart.update();
  } else {
    window.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Acertos', 'Erros'],
        datasets: [{
          label: 'Desempenho',
          data: [acertosPorcentagem, errosPorcentagem],
          backgroundColor: ['#4caf50', '#f44336'], // verde para acertos, vermelho para erros
          borderColor: ['#388e3c', '#d32f2f'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 14
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 14
              },
              stepSize: 20,
              max: 100
            }
          }
        }
      }
    });
  }
}

// Funções de Data
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

  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

function toggleDateOptions() {
  const options = document.getElementById('date-options');
  options.style.display = options.style.display === 'none' ? 'block' : 'none';
}

function toggleCalendar() {
  const customDate = document.getElementById('custom-date');
  customDate.style.display = customDate.style.display === 'none' ? 'block' : 'none';

  if (customDate.style.display === 'block') {
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

function resetDates() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
}
