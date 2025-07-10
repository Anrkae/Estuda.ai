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
        
        const embaralhar = arr => [...arr].sort(() => Math.random() - 0.5);
        const getValorSelecionado = name =>
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
    const assuntos = [...new Set(
      todasQuestoes.flatMap(q => {
        if (Array.isArray(q.assuntos)) return q.assuntos;
        if (Array.isArray(q.assunto)) return q.assunto;
        return [q.assunto || q.assuntos].filter(Boolean);
      })
    )].sort();

    filtroDisciplina.setChoices(disciplinas.map(d => ({ value: d, label: d })), 'value', 'label', true);
    filtroAno.setChoices(anos.map(a => ({ value: a, label: a })), 'value', 'label', true);
    filtroAssunto.setChoices(assuntos.map(a => ({ value: a, label: a })), 'value', 'label', true);
  };

  const atualizarAssuntosPorDisciplina = disciplinasSelecionadas => {
    let assuntos;
    if (!disciplinasSelecionadas.length) {
      assuntos = [...new Set(
        todasQuestoes.flatMap(q => {
          if (Array.isArray(q.assuntos)) return q.assuntos;
          if (Array.isArray(q.assunto)) return q.assunto;
          return [q.assunto || q.assuntos].filter(Boolean);
        })
      )];
    } else {
      assuntos = [...new Set(
        todasQuestoes
          .filter(q => disciplinasSelecionadas.includes(q.disciplina))
          .flatMap(q => {
            if (Array.isArray(q.assuntos)) return q.assuntos;
            if (Array.isArray(q.assunto)) return q.assunto;
            return [q.assunto || q.assuntos].filter(Boolean);
          })
      )];
    }
    filtroAssunto.clearStore();
    filtroAssunto.setChoices(assuntos.map(a => ({ value: a, label: a })), 'value', 'label', true);
  };

  document.querySelector('#filtroDisciplina').addEventListener('change', () => {
    const sel = filtroDisciplina.getValue(true);
    atualizarAssuntosPorDisciplina(sel);
  });

  const exibirQuestoes = lista => {
    questoesOutput.innerHTML = '';
    questionsDataStore = {};

    lista.forEach((q, i) => {
      const id = `q-${q.id}`;
      questionsDataStore[id] = q;
      const temContexto = q.contexto?.trim();
      const temImagem = q.imagem_url?.trim();
      const assuntosTags = (Array.isArray(q.assuntos) ? q.assuntos :
        Array.isArray(q.assunto) ? q.assunto :
        [q.assunto || q.assuntos].filter(Boolean)).map(a => `<span class="tag-assunto">${a}</span>`).join(' ');

      const div = document.createElement('div');
      div.className = 'question-item';
      div.id = id;
      div.innerHTML = `
        ${q.metadata?.fonte || q.metadata?.ano ? `<div class="question-meta">
          ${q.metadata.fonte ? `<span class="meta-source">${q.metadata.fonte}</span>` : ''}
          ${q.metadata.fonte && q.metadata.ano ? ' | ' : ''}
          ${q.metadata.ano ? `<span class="meta-year">${q.metadata.ano}</span>` : ''}
        </div>` : ''}
        <div class="question-tags">${assuntosTags}<span class="tag-dificuldade">${q.dificuldade || ''}</span></div>
        <p class="question-text"><strong>${i + 1}.</strong> ${q.enunciado}</p>
        ${temContexto ? `<button class="btn-contexto toggle-btn" data-target="ctx-${id}">Texto associado +</button>
          <div class="contexto-content toggle-content oculto" id="ctx-${id}">${q.contexto}</div>` : ''}
        ${temImagem ? `<button class="btn-imagem toggle-btn" data-target="img-${id}">Ver imagem +</button>
          <div class="imagem-content toggle-content oculto" id="img-${id}">
            <img src="${q.imagem_url}" style="max-width:100%">
          </div>` : ''}
        <div class="options-container">
          ${q.opcoes.map(op => `
            <button class="option-btn" data-value="${op.letra}">
              <span class="option-letter">${op.letra}</span>
              <span class="option-content">${op.texto}</span>
              <span class="corte-btn" title="Cortar alternativa" data-letra="${op.letra}" style="display:none;">
                <i class="fas fa-scissors"></i>
              </span>
            </button>
          `).join('')}
        </div>
        <div class="feedback-area">
          <div class="feedback-message"></div>
          <button class="confirm-answer-btn" disabled>Responder</button>
          ${q.resolucao ? '<button class="view-resolution-btn" style="display:none;">Gabarito</button>' : ''}
        </div>
        ${q.resolucao ? `<div class="resolution-area oculto"><strong>Resolução:</strong><br>${q.resolucao}</div>` : ''}
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

      const temas = Array.isArray(q.assuntos) ? q.assuntos :
        Array.isArray(q.assunto) ? q.assunto :
        [q.assunto || q.assuntos].filter(Boolean);

      return (
        (!termo || q.enunciado.toLowerCase().includes(termo)) &&
        (!disciplinas.length || disciplinas.includes(q.disciplina)) &&
        (!assuntos.length || temas.some(a => assuntos.includes(a))) &&
        (!tipos.length || tipos.includes(q.tipo)) &&
        (!dificuldades.length || dificuldades.includes(q.dificuldade)) &&
        (!anos.length || anos.includes(q.metadata?.ano))
      );
    });
  };

  const selecionarOpcao = (btn) => {
    const container = btn.closest('.question-item');
    if (!container || container.classList.contains('answered')) return;
    if (btn.classList.contains('cortada')) return;

    container.querySelectorAll('.option-btn').forEach(opt => {
      const corte = opt.querySelector('.corte-btn');
      opt.classList.remove('selected-preview');
      if (!opt.classList.contains('cortada')) {
        if (corte) corte.style.display = 'none';
      }
    });

    container.dataset.selected = btn.dataset.value;
    btn.classList.add('selected-preview');

    const corteBtn = btn.querySelector('.corte-btn');
    if (corteBtn) corteBtn.style.display = 'inline-flex';

    const confirmBtn = container.querySelector('.confirm-answer-btn');
    if (confirmBtn) confirmBtn.disabled = false;
  };

  questoesOutput.addEventListener('click', (e) => {
    const target = e.target;
    if (target.closest('.corte-btn')) {
      const corteBtn = target.closest('.corte-btn');
      const container = corteBtn.closest('.question-item');
      const letra = corteBtn.dataset.letra;
      const alt = container.querySelector(`.option-btn[data-value="${letra}"]`);
      if (!alt) return;

      const isCortada = alt.classList.toggle('cortada');

      if (isCortada) {
        alt.classList.remove('selected-preview');
        delete container.dataset.selected;
        corteBtn.innerHTML = '<i class="fas fa-rotate-left"></i>';
        container.querySelector('.confirm-answer-btn').disabled = true;
      } else {
        corteBtn.innerHTML = '<i class="fas fa-scissors"></i>';
      }

      corteBtn.style.display = 'inline-flex';
      return;
    }

    const optBtn = target.closest('.option-btn');
    if (optBtn) {
      selecionarOpcao(optBtn);
      return;
    }
  });
  buscarQuestoes.addEventListener('click', () => {
  aplicarFiltrosAvancados();
  const qtd = parseInt(numeroQuestoes.value) || 5;
  
  if (!questoesFiltradas.length) {
    questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão encontrada.</p>';
    return;
  }
  
  questoesExibidas = embaralhar(questoesFiltradas).slice(0, qtd);
  exibirQuestoes(questoesExibidas);
  
  currentSessionStats = {
    id: `sess-${Date.now()}`,
    totalQuestions: questoesExibidas.length,
    answeredCount: 0,
    correctCount: 0,
    disciplina: questoesExibidas[0]?.disciplina || 'Diversas'
  };
  
  finalizeButton.style.display = 'inline-flex';
  
  if (window.timerPopupAPI?.startSession) {
    window.timerPopupAPI.startSession(
      currentSessionStats.totalQuestions,
      currentSessionStats.disciplina
    );
  }
});

finalizeButton.addEventListener('click', () => {
  if (window.timerPopupAPI?.stopTimer) window.timerPopupAPI.stopTimer();
  if (window.timerPopupAPI?.openPanel) window.timerPopupAPI.openPanel();
  finalizeButton.style.display = 'none';
  currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null };
});

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

// Carrega tudo
resolvidas = carregarResolvidas();
todasQuestoes = await (await fetch(QUESTOES_JSON_URL)).json();
preencherFiltros();
});