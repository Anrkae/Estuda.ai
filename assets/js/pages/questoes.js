document.addEventListener('DOMContentLoaded', async () => {
  const QUESTOES_JSON_URL = '../assets/data/questoes.json';
  const STORAGE_KEY_RESOLVIDAS = 'questoesResolvidas';

  let todasQuestoes = [];
  let questoesFiltradas = [];
  let questoesExibidas = [];
  let questionsDataStore = {};
  let resolvidas = [];

  let currentSessionStats = {
    id: null,
    totalQuestions: 0,
    answeredCount: 0,
    correctCount: 0,
    disciplina: null
  };

  // ELEMENTOS
  const campoBusca = document.getElementById('campoBusca');
  const filtroDisciplina = new Choices('#filtroDisciplina', { removeItemButton: true });
  const filtroAssunto = new Choices('#filtroAssunto', { removeItemButton: true });
  const filtroTipo = new Choices('#filtroTipo', { removeItemButton: true });
  const filtroDificuldade = new Choices('#filtroDificuldade', { removeItemButton: true });
  const filtroAno = new Choices('#filtroAno', { removeItemButton: true });

  const numeroQuestoes = document.getElementById('numeroQuestoes');
  const questoesOutput = document.getElementById('questoesOutput');
  const buscarQuestoes = document.getElementById('buscarQuestoes');
  const finalizeButton = document.getElementById('finalizeButton');

  const drawer = document.getElementById('drawerFiltros');
  const backdrop = document.getElementById('drawerBackdrop');
  const abrirDrawer = document.getElementById('abrirDrawerFiltros');
  const aplicarFiltros = document.getElementById('aplicarFiltros');
  const redefinirFiltros = document.getElementById('redefinirFiltros');

  // UTILITÁRIOS

  const embaralhar = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const getValorSelecionado = (name) =>
    document.querySelector(`input[name="${name}"]:checked`)?.value || 'todas';

  const salvarResolvida = (id, correta) => {
    if (!resolvidas.some(q => q.id === id)) {
      resolvidas.push({ id, correta });
      localStorage.setItem(STORAGE_KEY_RESOLVIDAS, JSON.stringify(resolvidas));
    }
  };

  const carregarResolvidas = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_RESOLVIDAS)) || [];
    } catch {
      return [];
    }
  };

  const preencherFiltros = () => {
    const disciplinas = [...new Set(todasQuestoes.map(q => q.disciplina))].sort();
    const assuntos = [...new Set(todasQuestoes.map(q => q.assunto))].sort();
    const anos = [...new Set(todasQuestoes.map(q => q.metadata?.ano))].sort((a, b) => b - a);

    filtroDisciplina.setChoices(disciplinas.map(d => ({ value: d, label: d })), 'value', 'label', true);
    filtroAssunto.setChoices(assuntos.map(a => ({ value: a, label: a })), 'value', 'label', true);
    filtroAno.setChoices(anos.map(a => ({ value: a, label: a })), 'value', 'label', true);
  };

  const exibirQuestoes = (lista) => {
    questoesOutput.innerHTML = '';
    questionsDataStore = {};

    lista.forEach((q, idx) => {
      const id = `q-${q.id}`;
      questionsDataStore[id] = q;

      const div = document.createElement('div');
      div.className = 'question-item';
      div.id = id;

      div.innerHTML = `
        <p class="question-text"><strong>${idx + 1}.</strong> ${q.enunciado}</p>
        ${q.metadata?.fonte || q.metadata?.ano ? `
          <div class="question-meta">
            ${q.metadata.fonte ? `<span class="meta-source">${q.metadata.fonte}</span>` : ''}
            ${q.metadata.fonte && q.metadata.ano ? ' | ' : ''}
            ${q.metadata.ano ? `<span class="meta-year">${q.metadata.ano}</span>` : ''}
          </div>` : ''}
        <div class="options-container">
          ${q.opcoes.map(op => `
            <button class="option-btn" data-value="${op.letra}">
              <span class="option-letter">${op.letra}</span>
              <span class="option-content">${op.texto}</span>
            </button>
          `).join('')}
        </div>
        <div class="feedback-area">
          <div class="feedback-message"></div>
          <button class="confirm-answer-btn" disabled>Responder</button>
          ${q.resolucao ? '<button class="view-resolution-btn" style="display:none;">Gabarito</button>' : ''}
        </div>
        ${q.resolucao ? `<div class="resolution-area" style="display:none;"><strong>Resolução:</strong><br>${q.resolucao}</div>` : ''}
      `;

      questoesOutput.appendChild(div);
    });
  };

  const aplicarFiltrosAvancados = () => {
    const termo = campoBusca.value.toLowerCase().trim();
    const disciplinas = filtroDisciplina.getValue(true);
    const assuntos = filtroAssunto.getValue(true);
    const tipos = filtroTipo.getValue(true);
    const dificuldades = filtroDificuldade.getValue(true);
    const anos = filtroAno.getValue(true);
    const modo = getValorSelecionado('filtroResolvidas');

    questoesFiltradas = todasQuestoes.filter(q => {
      const resolvida = resolvidas.find(r => r.id === q.id);
      const acertou = resolvida?.correta;

      if (modo === 'resolvidas' && !resolvida) return false;
      if (modo === 'nao_resolvidas' && resolvida) return false;
      if (modo === 'corretas' && acertou !== true) return false;
      if (modo === 'erradas' && acertou !== false) return false;

      return (
        (!termo || q.enunciado.toLowerCase().includes(termo)) &&
        (!disciplinas.length || disciplinas.includes(q.disciplina)) &&
        (!assuntos.length || assuntos.includes(q.assunto)) &&
        (!tipos.length || tipos.includes(q.tipo)) &&
        (!dificuldades.length || dificuldades.includes(q.dificuldade)) &&
        (!anos.length || anos.includes(q.metadata?.ano))
      );
    });

    console.log('Filtros aplicados. Total filtrado:', questoesFiltradas.length);
  };

  const buscarQuestoesSelecionadas = () => {
    aplicarFiltrosAvancados();

    const qtd = parseInt(numeroQuestoes.value) || 5;
    if (!questoesFiltradas.length) {
      questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão encontrada.</p>';
      return;
    }

    questoesExibidas = embaralhar(questoesFiltradas).slice(0, qtd);
    exibirQuestoes(questoesExibidas);

    iniciarSessao(questoesExibidas);
  };

  const iniciarSessao = (questoes) => {
    currentSessionStats = {
      id: `sess-${Date.now()}`,
      totalQuestions: questoes.length,
      answeredCount: 0,
      correctCount: 0,
      disciplina: questoes[0]?.disciplina || "Diversas"
    };
    finalizeButton.style.display = 'inline-flex';

    if (window.timerPopupAPI?.startSession) {
      window.timerPopupAPI.startSession(questoes.length, currentSessionStats.disciplina);
    }
  };

  const finalizarSessao = (abrir = true) => {
    if (!currentSessionStats.id) return;
    if (window.timerPopupAPI?.stopTimer) window.timerPopupAPI.stopTimer();
    if (abrir && window.timerPopupAPI?.openPanel) window.timerPopupAPI.openPanel();
    finalizeButton.style.display = 'none';
    currentSessionStats = {
      id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null
    };
  };

  const selecionarOpcao = (btn) => {
    const container = btn.closest('.question-item');
    if (!container || container.classList.contains('answered')) return;
    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected-preview'));
    btn.classList.add('selected-preview');
    container.dataset.selected = btn.dataset.value;
    container.querySelector('.confirm-answer-btn').disabled = false;
  };

  const responderQuestao = (btn) => {
    const container = btn.closest('.question-item');
    const id = container.id;
    const questao = questionsDataStore[id];
    const resposta = container.dataset.selected;
    if (!questao || !resposta || container.classList.contains('answered')) return;

    const correta = questao.resposta_correta;
    const acertou = resposta === correta;
    container.classList.add('answered', acertou ? 'correct' : 'incorrect');

    container.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === resposta) b.classList.add('selected');
      if (b.dataset.value === correta) b.classList.add('correct-answer-highlight');
    });

    container.querySelector('.feedback-message').textContent = acertou
      ? 'Resposta Correta!'
      : `Incorreto. A resposta correta é: ${correta}`;

    const gabaritoBtn = container.querySelector('.view-resolution-btn');
    if (gabaritoBtn) gabaritoBtn.style.display = 'inline-flex';

    currentSessionStats.answeredCount++;
    if (acertou) currentSessionStats.correctCount++;

    salvarResolvida(questao.id, acertou);

    if (window.timerPopupAPI?.updateStats) {
      window.timerPopupAPI.updateStats(currentSessionStats.answeredCount, currentSessionStats.correctCount);
    }

    if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
      finalizarSessao(true);
    }
  };

  // EVENTOS

  questoesOutput.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('option-btn')) selecionarOpcao(btn);
    if (btn.classList.contains('confirm-answer-btn')) responderQuestao(btn);
    if (btn.classList.contains('view-resolution-btn')) {
      const area = btn.closest('.question-item').querySelector('.resolution-area');
      const visivel = area.style.display === 'block';
      area.style.display = visivel ? 'none' : 'block';
      btn.textContent = visivel ? 'Gabarito' : 'Ocultar Gabarito';
    }
  });

  buscarQuestoes.addEventListener('click', buscarQuestoesSelecionadas);
  finalizeButton.addEventListener('click', () => finalizarSessao(true));

  abrirDrawer.addEventListener('click', () => {
    drawer.classList.add('open');
    backdrop.classList.add('active');
  });

  backdrop.addEventListener('click', () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('active');
  });

  aplicarFiltros.addEventListener('click', () => {
    aplicarFiltrosAvancados();
    drawer.classList.remove('open');
    backdrop.classList.remove('active');
  });

  redefinirFiltros.addEventListener('click', () => {
    filtroTipo.clearStore();
    filtroDificuldade.clearStore();
    filtroAno.clearStore();
    document.querySelector('input[name="filtroResolvidas"][value="todas"]').checked = true;
  });

  // INICIALIZAÇÃO
  resolvidas = carregarResolvidas();
  const res = await fetch(QUESTOES_JSON_URL);
  todasQuestoes = await res.json();
  preencherFiltros();
});