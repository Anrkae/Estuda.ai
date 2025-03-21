// Variáveis globais
let questoesResolvidas = 0;
let acertos = 0;
let cronometro;

const questoesEl = document.getElementById('questoes');
const acertosEl = document.getElementById('acertos');

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
  atualizarGrafico();
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

// Inicialização do gráfico com Chart.js
const ctx = document.getElementById('myChart').getContext('2d');
const myChart = new Chart(ctx, {
  type: 'bar', // Tipo de gráfico
  data: {
    labels: ['Acertos', 'Erros'], // Labels para o gráfico
    datasets: [{
      label: 'Desempenho',
      data: [0, 0], // Dados iniciais de acertos e erros
      backgroundColor: ['#4caf50', '#f44336'], // Cores
      borderColor: ['#4caf50', '#f44336'],
      borderWidth: 1
    }]
  },
  options: {
    indexAxis: 'y', // Barra horizontal
    responsive: true,
    scales: {
      x: {
        beginAtZero: true
      }
    }
  }
});

// Atualiza o gráfico quando as questões são registradas
function atualizarGrafico() {
  // Calcular a quantidade de erros
  let erros = questoesResolvidas - acertos;

  // Atualizar o gráfico
  myChart.data.datasets[0].data = [acertos, erros];
  myChart.update();
}
