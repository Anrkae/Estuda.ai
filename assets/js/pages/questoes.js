// questoes_completo.js - Atualizado com suporte a múltiplos assuntos e corte de alternativas

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
    const anos = [...new Set(todasQuestoes.map(q => q.metadata?.ano))].sort((a, b) => b - a);
    const assuntos = [...new Set(todasQuestoes.flatMap(q => q.assunto || []))];

    filtroDisciplina.setChoices(disciplinas.map(d => ({ value: d, label: d })), 'value', 'label', true);
    filtroAno.setChoices(anos.map(a => ({ value: a, label: a })), 'value', 'label', true);
    filtroAssunto.setChoices(assuntos.map(a => ({ value: a, label: a })), 'value', 'label', true);
  };

  const atualizarAssuntosPorDisciplina = (disciplinasSelecionadas) => {
    let assuntosFiltrados = [];
    if (disciplinasSelecionadas.length === 0) {
      assuntosFiltrados = [...new Set(todasQuestoes.flatMap(q => q.assunto || []))];
    } else {
      assuntosFiltrados = [
        ...new Set(
          todasQuestoes
            .filter(q => disciplinasSelecionadas.includes(q.disciplina))
            .flatMap(q => q.assunto || [])
        )
      ];
    }
    filtroAssunto.clearStore();
    filtroAssunto.setChoices(assuntosFiltrados.map(a => ({ value: a, label: a })), 'value', 'label', true);
  };

  document.querySelector('#filtroDisciplina').addEventListener('change', () => {
    const disciplinasSelecionadas = filtroDisciplina.getValue(true);
    atualizarAssuntosPorDisciplina(disciplinasSelecionadas);
  });

  const exibirQuestoes = (lista) => {
    questoesOutput.innerHTML = '';
    questionsDataStore = {};

    lista.forEach((q, idx) => {
      const id = `q-${q.id}`;
      questionsDataStore[id] = q;

      const temContexto = q.contexto && q.contexto.trim() !== '';
      const temImagem = q.imagem_url && q.imagem_url.trim() !== '';

      const div = document.createElement('div');
      div.className = 'question-item';
      div.id = id;

      div.innerHTML = `
        ${q.metadata?.fonte || q.metadata?.ano ? `
          <div class="question-meta">
            ${q.metadata.fonte ? `<span class="meta-source">${q.metadata.fonte}</span>` : ''}
            ${q.metadata.fonte && q.metadata.ano ? ' | ' : ''}
            ${q.metadata.ano ? `<span class="meta-year">${q.metadata.ano}</span>` : ''}
          </div>` : ''}

        <div class="question-tags">
          ${Array.isArray(q.assunto) ? q.assunto.map(a => `<span class="tag-assunto">${a}</span>`).join(' ') : ''}
          ${q.dificuldade ? `<span class="tag-dificuldade">${q.dificuldade}</span>` : ''}
        </div>

        <p class="question-text"><strong>${idx + 1}.</strong> ${q.enunciado}</p>

        ${temContexto ? `
          <button class="btn-contexto toggle-btn" data-target="contexto-${id}">Texto associado +</button>
          <div class="contexto-content toggle-content oculto" id="contexto-${id}">${q.contexto}</div>
        ` : ''}

        ${temImagem ? `
          <button class="btn-imagem toggle-btn" data-target="imagem-${id}">Ver imagem +</button>
          <div class="imagem-content toggle-content oculto" id="imagem-${id}">
            <img src="${q.imagem_url}" alt="Imagem da questão" style="max-width: 100%;">
          </div>
        ` : ''}

        <div class="options-container">
          ${q.opcoes.map(op => `
            <button class="option-btn" data-value="${op.letra}">
              <span class="option-letter">${op.letra}</span>
              <span class="option-content">${op.texto}</span>
              <button class="corte-btn" title="Cortar alternativa" data-letra="${op.letra}" style="display: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </button>
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
        (!assuntos.length || (Array.isArray(q.assunto) && q.assunto.some(a => assuntos.includes(a)))) &&
        (!tipos.length || tipos.includes(q.tipo)) &&
        (!dificuldades.length || dificuldades.includes(q.dificuldade)) &&
        (!anos.length || anos.includes(q.metadata?.ano))
      );
    });
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
    if (btn.classList.contains('cortada')) return;

    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected-preview'));
    container.dataset.selected = btn.dataset.value;
    btn.classList.add('selected-preview');

    container.querySelectorAll('.corte-btn').forEach(c => {
      const letra = c.dataset.letra;
      c.style.display = (letra === btn.dataset.value) ? 'inline-flex' : 'none';
    });

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
    if (btn.classList.contains('toggle-btn')) {
      const targetId = btn.dataset.target;
      const alvo = document.getElementById(targetId);
      if (alvo) alvo.classList.toggle('oculto');
    }
    if (btn.classList.contains('corte-btn')) {
      const container = btn.closest('.question-item');
      const letra = btn.dataset.letra;
      const alt = container.querySelector(`.option-btn[data-value="${letra}"]`);
      if (!alt) return;

      const isCortada = alt.classList.toggle('cortada');
      if (isCortada) {
        alt.classList.remove('selected-preview');
        delete container.dataset.selected;
        container.querySelector('.confirm-answer-btn').disabled = true;
        btn.setAttribute('title', 'Restaurar alternativa');
      } else {
        btn.setAttribute('title', 'Cortar alternativa');
      }
      btn.style.display = 'inline-flex';
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

  resolvidas = carregarResolvidas();
  const res = await fetch(QUESTOES_JSON_URL);
  todasQuestoes = await res.json();
  preencherFiltros();
});
