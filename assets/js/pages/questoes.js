// questoes_completo.js — Ajustes: corte fora do botão, responderQuestao, filtros e FontAwesome

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
  const campoBusca       = document.getElementById('campoBusca');
  const filtroDisciplina = new Choices('#filtroDisciplina', { removeItemButton: true });
  const filtroAssunto    = new Choices('#filtroAssunto',    { removeItemButton: true });
  const filtroTipo       = new Choices('#filtroTipo',       { removeItemButton: true });
  const filtroDificuldade= new Choices('#filtroDificuldade',{ removeItemButton: true });
  const filtroAno        = new Choices('#filtroAno',        { removeItemButton: true });

  const numeroQuestoes = document.getElementById('numeroQuestoes');
  const questoesOutput = document.getElementById('questoesOutput');
  const buscarQuestoes = document.getElementById('buscarQuestoes');
  const finalizeButton = document.getElementById('finalizeButton');

  const drawer         = document.getElementById('drawerFiltros');
  const backdrop       = document.getElementById('drawerBackdrop');
  const abrirDrawer    = document.getElementById('abrirDrawerFiltros');
  const aplicarFiltros = document.getElementById('aplicarFiltros');
  const redefinirFiltros = document.getElementById('redefinirFiltros');

  // UTILITÁRIOS
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
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_RESOLVIDAS)) || []; }
    catch { return []; }
  };

  // Função de resposta
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
    
    container.querySelector('.feedback-message').textContent = acertou ?
      'Resposta Correta!' :
      `Incorreto. A resposta correta é: ${correta}`;
    
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

  // Preencher filtros
  const preencherFiltros = () => {
    const disciplinas = [...new Set(todasQuestoes.map(q => q.disciplina))].sort();
    const anos = [...new Set(todasQuestoes.map(q => q.metadata?.ano))].sort((a,b)=>b-a);
    const assuntos = [...new Set(
      todasQuestoes.flatMap(q => {
        if (Array.isArray(q.assuntos)) return q.assuntos;
        if (Array.isArray(q.assunto))  return q.assunto;
        return [q.assunto || q.assuntos].filter(Boolean);
      })
    )].sort();

    filtroDisciplina.setChoices(disciplinas.map(d=>({value:d,label:d})), 'value','label', true);
    filtroAno.setChoices(anos.map(a=>({value:a,label:a})), 'value','label', true);
    filtroAssunto.setChoices(assuntos.map(a=>({value:a,label:a})), 'value','label', true);
  };

  const atualizarAssuntosPorDisciplina = sel => {
    let lista = [];
    if (!sel.length) {
      lista = todasQuestoes.flatMap(q =>
        Array.isArray(q.assuntos) ? q.assuntos :
        Array.isArray(q.assunto)  ? q.assunto  :
        [q.assunto || q.assuntos].filter(Boolean)
      );
    } else {
      lista = todasQuestoes
        .filter(q => sel.includes(q.disciplina))
        .flatMap(q =>
          Array.isArray(q.assuntos) ? q.assuntos :
          Array.isArray(q.assunto)  ? q.assunto  :
          [q.assunto || q.assuntos].filter(Boolean)
        );
    }
    const uniq = [...new Set(lista)].sort();
    filtroAssunto.clearStore();
    filtroAssunto.setChoices(uniq.map(a=>({value:a,label:a})), 'value','label', true);
  };
  document.querySelector('#filtroDisciplina').addEventListener('change', () => {
    atualizarAssuntosPorDisciplina(filtroDisciplina.getValue(true));
  });

  // Exibir questões
  const exibirQuestoes = lista => {
    questoesOutput.innerHTML = '';
    questionsDataStore = {};
    lista.forEach((q,i) => {
      const id = `q-${q.id}`;
      questionsDataStore[id] = q;
      const hasCtx = q.contexto?.trim();
      const hasImg = q.imagem_url?.trim();
      const tagsAssuntos = (Array.isArray(q.assuntos)?q.assuntos:(Array.isArray(q.assunto)?q.assunto:[q.assunto||q.assuntos]).filter(Boolean))
        .map(a=>`<span class="tag-assunto">${a}</span>`).join(' ');

      const div = document.createElement('div');
      div.className = 'question-item';
      div.id = id;
      div.innerHTML = `
        ${q.metadata?.fonte||q.metadata?.ano
          ? `<div class="question-meta">
               ${q.metadata.fonte?`<span class="meta-source">${q.metadata.fonte}</span>`:''}
               ${q.metadata.fonte&&q.metadata.ano?' | ':''}
               ${q.metadata.ano?`<span class="meta-year">${q.metadata.ano}</span>`:''}
             </div>`
          : ''}
        <div class="question-tags">
          ${tagsAssuntos}
          <span class="tag-dificuldade">${q.dificuldade||''}</span>
        </div>
        <p class="question-text"><strong>${i+1}.</strong> ${q.enunciado}</p>
        ${hasCtx
          ? `<button class="btn-contexto toggle-btn" data-target="ctx-${id}">Texto associado +</button>
             <div id="ctx-${id}" class="contexto-content toggle-content oculto">${q.contexto}</div>`
          : ''}
        ${hasImg
          ? `<button class="btn-imagem toggle-btn" data-target="img-${id}">Ver imagem +</button>
             <div id="img-${id}" class="imagem-content toggle-content oculto">
               <img src="${q.imagem_url}" style="max-width:100%">
             </div>`
          : ''}
        <div class="options-container">
          ${q.opcoes.map(op=>`
            <div class="option-wrapper">
              <button class="option-btn" data-value="${op.letra}">
                <span class="option-letter">${op.letra}</span>
                <span class="option-content">${op.texto}</span>
              </button>
              <span class="corte-btn" title="Cortar alternativa" data-letra="${op.letra}" style="display:none;">
                <i class="fas fa-scissors"></i>
              </span>
            </div>
          `).join('')}
        </div>
        <div class="feedback-area">
          <div class="feedback-message"></div>
          <button class="confirm-answer-btn" disabled>Responder</button>
          ${q.resolucao?'<button class="view-resolution-btn" style="display:none;">Gabarito</button>':''}
        </div>
        ${q.resolucao?`<div class="resolution-area oculto"><strong>Resolução:</strong><br>${q.resolucao}</div>`:''}
      `;
      questoesOutput.appendChild(div);
    });
  };

  // Filtros avançados
  const aplicarFiltrosAvancados = () => {
    const termo = campoBusca.value.toLowerCase().trim();
    const discs = filtroDisciplina.getValue(true);
    const assSel= filtroAssunto.getValue(true);
    const tip  = filtroTipo.getValue(true);
    const diff = filtroDificuldade.getValue(true);
    const anosArr = filtroAno.getValue(true);
    const modo = getValorSelecionado('filtroResolvidas');

    questoesFiltradas = todasQuestoes.filter(q=>{
      const r= resolvidas.find(x=>x.id===q.id);
      const c= r?.correta;
      if(modo==='resolvidas'&&!r) return false;
      if(modo==='nao_resolvidas'&&r) return false;
      if(modo==='corretas'&&c!==true) return false;
      if(modo==='erradas'&&c!==false) return false;

      const temas = Array.isArray(q.assuntos)?q.assuntos:
                    Array.isArray(q.assunto)?q.assunto:
                    [q.assunto||q.assuntos].filter(Boolean);

      return (!termo||q.enunciado.toLowerCase().includes(termo))
          && (!discs.length||discs.includes(q.disciplina))
          && (!assSel.length||temas.some(a=>assSel.includes(a)))
          && (!tip.length||tip.includes(q.tipo))
          && (!diff.length||diff.includes(q.dificuldade))
          && (!anosArr.length||anosArr.includes(q.metadata?.ano));
    });
  };

  // Seleção de alternativa
  const selecionarOpcao = btn => {
    const wrp = btn.closest('.option-wrapper');
    const container = btn.closest('.question-item');
    if(!container||container.classList.contains('answered')||btn.classList.contains('cortada')) return;

    container.querySelectorAll('.option-btn').forEach(o=>{
      o.classList.remove('selected-preview');
      const corte = o.closest('.option-wrapper').querySelector('.corte-btn');
      if(corte) corte.style.display='none';
    });

    btn.classList.add('selected-preview');
    container.dataset.selected = btn.dataset.value;

    const corteBtn = btn.closest('.option-wrapper').querySelector('.corte-btn');
    if(corteBtn) corteBtn.style.display='inline-flex';

    container.querySelector('.confirm-answer-btn').disabled = false;
  };

  // Eventos de clique
  questoesOutput.addEventListener('click', e => {
    const t = e.target;

    // Cortar/Restaurar
    if(t.closest('.corte-btn')){
      e.stopPropagation();
      const corteBtn = t.closest('.corte-btn');
      const container = corteBtn.closest('.question-item');
      const letra = corteBtn.dataset.letra;
      const altBtn = container.querySelector(`.option-btn[data-value="${letra}"]`);
      if(!altBtn) return;
      const cortada = altBtn.classList.toggle('cortada');
      corteBtn.innerHTML = cortada
        ? '<i class="fas fa-rotate-left"></i>'
        : '<i class="fas fa-scissors"></i>';
      if(cortada){
        altBtn.classList.remove('selected-preview');
        delete container.dataset.selected;
        container.querySelector('.confirm-answer-btn').disabled=true;
      }
      corteBtn.style.display='inline-flex';
      return;
    }

    // Selecionar
    const opt = t.closest('.option-btn');
    if(opt){
      selecionarOpcao(opt);
      return;
    }

    // Responder
    if(t.classList.contains('confirm-answer-btn')){
      responderQuestao(t);
      return;
    }

    // Outras ações (view-resolution, toggle-btn, etc.) podem seguir aqui...
  });

  // Botões principais
  buscarQuestoes.addEventListener('click', async ()=>{
    aplicarFiltrosAvancados();
    const qtd = parseInt(numeroQuestoes.value)||5;
    if(!questoesFiltradas.length){
      questoesOutput.innerHTML='<p class="empty-state">Nenhuma questão encontrada.</p>';
      return;
    }
    questoesExibidas = embaralhar(questoesFiltradas).slice(0,qtd);
    exibirQuestoes(questoesExibidas);
    currentSessionStats = {
      id: `sess-${Date.now()}`,
      totalQuestions: questoesExibidas.length,
      answeredCount: 0,
      correctCount: 0,
      disciplina: questoesExibidas[0]?.disciplina||'Diversas'
    };
    finalizeButton.style.display='inline-flex';
    if(window.timerPopupAPI?.startSession){
      window.timerPopupAPI.startSession(currentSessionStats.totalQuestions, currentSessionStats.disciplina);
    }
  });

  finalizeButton.addEventListener('click', ()=>{
    if(window.timerPopupAPI?.stopTimer) window.timerPopupAPI.stopTimer();
    if(window.timerPopupAPI?.openPanel) window.timerPopupAPI.openPanel();
    finalizeButton.style.display='none';
    currentSessionStats = { id:null, totalQuestions:0, answeredCount:0, correctCount:0, disciplina:null };
  });

  abrirDrawer.addEventListener('click', ()=>{
    drawer.classList.add('open');
    backdrop.classList.add('active');
  });
  backdrop.addEventListener('click', ()=>{
    drawer.classList.remove('open');
    backdrop.classList.remove('active');
  });
  aplicarFiltros.addEventListener('click', ()=>{
    aplicarFiltrosAvancados();
    drawer.classList.remove('open');
    backdrop.classList.remove('active');
  });
  redefinirFiltros.addEventListener('click', ()=>{
    filtroTipo.clearStore();
    filtroDificuldade.clearStore();
    filtroAno.clearStore();
    document.querySelector('input[name="filtroResolvidas"][value="todas"]').checked = true;
  });

  // Carregamento inicial
  resolvidas     = carregarResolvidas();
  todasQuestoes  = await (await fetch(QUESTOES_JSON_URL)).json();
  preencherFiltros();
});