document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÕES E CONSTANTES ---
    const QUESTOES_JSON_URL = '../assets/data/questoes.json';
    const PRE_CONFIGURADOS_PATH = '../assets/data/simulados/';
    const PRE_CONFIGURADOS = [
        { name: 'Selecione um simulado...', url: '' },
        { name: 'Simulado 07/2025', url: `${PRE_CONFIGURADOS_PATH}Simulado.json` },
        { name: 'Simulado 2 07/2025', url: `${PRE_CONFIGURADOS_PATH}simulado2.json` }
    ];
    const STORAGE_KEY_RESOLVIDAS = 'questoesResolvidas';
    const STORAGE_KEY_HISTORICO = 'historicoSimulados';

    // --- SELEÇÃO DE ELEMENTOS DA DOM ---
    const dom = {
        setupScreen: document.getElementById('setup-screen'),
        simuladoScreen: document.getElementById('simulado-screen'),
        resultsScreen: document.getElementById('results-screen'),
        historyScreen: document.getElementById('history-screen'),
        pauseOverlay: document.getElementById('pause-overlay'),
        confirmModal: document.getElementById('confirm-modal'),
        preConfigCheckbox: document.getElementById('pre-config-checkbox'),
        preConfigSelectContainer: document.getElementById('pre-config-select-container'),
        manualFiltersContainer: document.getElementById('manual-filters-container'),
        startSimuladoBtn: document.getElementById('start-simulado-btn'),
        historyBtn: document.getElementById('history-btn'),
        backToSetupBtn: document.getElementById('back-to-setup-btn'),
        historyList: document.getElementById('history-list'),
        timeDisplay: document.getElementById('time-display'),
        pauseBtn: document.getElementById('pause-btn'),
        resumeBtn: document.getElementById('resume-btn'),
        questionsContainer: document.getElementById('questions-container'),
        reviewContainer: document.getElementById('review-container'),
        reviewBtn: document.getElementById('review-btn'),
        reviewFilterMainBtn: document.getElementById('review-filter-main-btn'),
        reviewFilterOptions: document.getElementById('review-filter-options'),
        reviewQuestionsArea: document.getElementById('review-questions-area'),
        restartSimuladoBtn: document.getElementById('restart-simulado-btn'),
        disciplinePerformanceList: document.getElementById('discipline-performance-list'),
        preConfigSelect: document.getElementById('pre-config-select'),
        numQuestionsInput: document.getElementById('num-questions'),
        simuladoTimeInput: document.getElementById('simulado-time'),
        prevDisciplineBtn: document.getElementById('prev-discipline-btn'),
        nextDisciplineBtn: document.getElementById('next-discipline-btn'),
        currentDisciplineTitle: document.getElementById('current-discipline-title'),
        finishBtn: document.getElementById('finish-btn'),
        forceFinishBtn: document.getElementById('force-finish-btn'),
        resultsChartEl: document.getElementById('results-chart'),
        correctCountEl: document.getElementById('correct-count'),
        incorrectCountEl: document.getElementById('incorrect-count'),
        unansweredCountEl: document.getElementById('unanswered-count'),
        percentageEl: document.getElementById('percentage-count')
    };

    // --- INSTÂNCIAS DE BIBLIOTECAS ---
    const choices = {
        disciplina: new Choices(dom.manualFiltersContainer.querySelector('#filtroDisciplina'), { removeItemButton: true, placeholder: true, placeholderValue: 'Todas' }),
        assunto: new Choices(dom.manualFiltersContainer.querySelector('#filtroAssunto'), { removeItemButton: true, placeholder: true, placeholderValue: 'Todos' }),
        dificuldade: new Choices(dom.manualFiltersContainer.querySelector('#filtroDificuldade'), { removeItemButton: true, placeholder: true, placeholderValue: 'Todos' })
    };

    // --- ESTADO DO APLICATIVO ---
    const state = {
        todasQuestoes: [],
        simuladoQuestoes: [],
        questoesAgrupadas: {},
        disciplinasDoSimulado: [],
        currentDisciplinaIndex: 0,
        userAnswers: {},
        timerInterval: null,
        resultsChart: null,
        simuladoStartTime: 0,
        remainingTime: 0,
        isPaused: false,
        markedQuestions: new Set(),
        confirmCallback: null
    };

    // --- FUNÇÕES DE STORAGE ---
    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
    const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    // --- INICIALIZAÇÃO E CONFIGURAÇÃO ---
    async function inicializar() {
        try {
            const response = await fetch(QUESTOES_JSON_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            state.todasQuestoes = await response.json();
            configurarFiltros();
            configurarPreConfigurados();
            vincularEventos();
        } catch (error) {
            console.error("Falha crítica ao carregar questões:", error);
            showConfirmationModal("Não foi possível carregar o banco de questões. Verifique sua conexão ou o arquivo de dados.");
        }
    }

    function configurarFiltros() {
        const disciplinas = [...new Set(state.todasQuestoes.map(q => q.disciplina))].sort();
        choices.disciplina.setChoices(disciplinas.map(d => ({ value: d, label: d })), 'value', 'label', false);
        atualizarAssuntosPorDisciplina();
    }

    function configurarPreConfigurados() {
        PRE_CONFIGURADOS.forEach(simulado => {
            const option = document.createElement('option');
            option.value = simulado.url;
            option.textContent = simulado.name;
            dom.preConfigSelect.appendChild(option);
        });
    }

    function atualizarAssuntosPorDisciplina() {
        const disciplinasSelecionadas = choices.disciplina.getValue(true);
        let assuntosDisponiveis = (disciplinasSelecionadas.length === 0) 
            ? state.todasQuestoes.flatMap(q => q.assuntos || q.assunto || []) 
            : state.todasQuestoes.filter(q => disciplinasSelecionadas.includes(q.disciplina)).flatMap(q => q.assuntos || q.assunto || []);
        const uniqueAssuntos = [...new Set(assuntosDisponiveis)].sort();
        choices.assunto.setChoices(uniqueAssuntos.map(a => ({ value: a, label: a })), 'value', 'label', false);
    }

    // --- LÓGICA PRINCIPAL DO SIMULADO ---
    const embaralhar = (array) => [...array].sort(() => Math.random() - 0.5);

    async function iniciarSimulado() {
        let questoesParaSimulado = [];
        const numQuestions = parseInt(dom.numQuestionsInput.value, 10);

        if (dom.preConfigCheckbox.checked) {
            const url = dom.preConfigSelect.value;
            if (!url) { showConfirmationModal('Por favor, selecione um simulado pré-configurado.'); return; }
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Não foi possível carregar o simulado de ${url}`);
                questoesParaSimulado = await response.json();
            } catch (error) { console.error(error); showConfirmationModal(error.message); return; }
        } else {
            const discs = choices.disciplina.getValue(true);
            const assSel = choices.assunto.getValue(true);
            const diffs = choices.dificuldade.getValue(true);
            questoesParaSimulado = state.todasQuestoes.filter(q => {
                const temas = Array.isArray(q.assuntos) ? q.assuntos : [q.assunto].filter(Boolean);
                return (!discs.length || discs.includes(q.disciplina)) && 
                       (!assSel.length || temas.some(a => assSel.includes(a))) && 
                       (!diffs.length || diffs.includes(q.dificuldade));
            });
        }

        state.simuladoQuestoes = embaralhar(questoesParaSimulado).slice(0, numQuestions);
        if (state.simuladoQuestoes.length === 0) { showConfirmationModal("Nenhuma questão foi encontrada com os filtros selecionados. Tente uma busca mais ampla."); return; }

        state.userAnswers = {};
        state.markedQuestions.clear();
        state.simuladoStartTime = Date.now();
        state.questoesAgrupadas = state.simuladoQuestoes.reduce((acc, questao) => {
            (acc[questao.disciplina] = acc[questao.disciplina] || []).push(questao);
            return acc;
        }, {});
        state.disciplinasDoSimulado = Object.keys(state.questoesAgrupadas);
        state.currentDisciplinaIndex = 0;
        
        [dom.setupScreen, dom.historyScreen, dom.resultsScreen, dom.pauseOverlay, dom.reviewContainer].forEach(el => el.classList.add('hidden'));
        dom.simuladoScreen.classList.remove('hidden');
        
        exibirDisciplinaAtual();
        iniciarTimer(parseInt(dom.simuladoTimeInput.value, 10) * 60);
    }

    function exibirDisciplinaAtual() {
        const disciplinaAtual = state.disciplinasDoSimulado[state.currentDisciplinaIndex];
        dom.currentDisciplineTitle.textContent = disciplinaAtual;
        dom.questionsContainer.innerHTML = '';
        let questionCounter = state.simuladoQuestoes.indexOf(state.questoesAgrupadas[disciplinaAtual][0]);

        state.questoesAgrupadas[disciplinaAtual].forEach(questao => {
            questionCounter++;
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            questionItem.id = `q-${questao.id}`;
            const isAnswered = !!state.userAnswers[questionItem.id];
            const isMarked = state.markedQuestions.has(String(questao.id));

            questionItem.innerHTML = `
                <div class="question-header">
                    <div class="question-meta">${questao.metadata?.fonte || ''} ${questao.metadata?.ano || ''}</div>
                    <button class="mark-btn ${isMarked ? 'marked' : ''}" aria-label="Marcar questão"><i class="fas fa-flag"></i></button>
                </div>
                <div class="question-tags">${(Array.isArray(questao.assuntos) ? questao.assuntos : [questao.assunto].filter(Boolean)).map(a => `<span class="tag-assunto">${a}</span>`).join('')}<span class="tag-dificuldade">${questao.dificuldade || ''}</span></div>
                <p class="question-text"><strong>${questionCounter}.</strong> ${questao.enunciado}</p>
                ${questao.contexto ? `
                  <div class="question-context">
                    <button class="btn-contexto toggle-btn" data-target="ctx-${questao.id}">Contexto +</button>
                    <div id="ctx-${questao.id}" class="toggle-content oculto" >
                      ${questao.contexto}
                    </div>
                  </div>
                ` : ''}
                
                <div class="options-container ${isAnswered ? 'answered' : ''}">${questao.opcoes.map(op => `<button class="option-btn" data-value="${op.letra}"><span class="option-letter">${op.letra}</span><span class="option-content">${op.texto}</span></button>`).join('')}</div>
                <div class="feedback-area">
                    <button class="btn btn-secondary cancel-answer-btn ${isAnswered ? '' : 'hidden'}">Cancelar Resposta</button>
                    <button class="btn btn-primary confirm-answer-btn" disabled>${isAnswered ? 'Respondido' : 'Responder'}</button>
                </div>`;
            
            if (isAnswered) { questionItem.querySelector(`.option-btn[data-value="${state.userAnswers[questionItem.id]}"]`).classList.add('selected-preview'); }
            dom.questionsContainer.appendChild(questionItem);
        });
        atualizarNavDisciplina();
    }
    
    function atualizarNavDisciplina() {
        dom.prevDisciplineBtn.disabled = state.currentDisciplinaIndex === 0;
        dom.nextDisciplineBtn.disabled = state.currentDisciplinaIndex >= state.disciplinasDoSimulado.length - 1;
    }

    function handleQuestionClick(event) {
        const target = event.target;
        const questionItem = target.closest('.question-item');
        if (!questionItem) return;
        const questionId = questionItem.id.replace('q-', '');

        if (target.classList.contains('toggle-btn')) {
            const contentId = target.dataset.target;
            const contentArea = document.getElementById(contentId);
            if (contentArea) {
                const isHidden = contentArea.classList.toggle('oculto');
                target.textContent = isHidden ? 'Contexto +' : 'Contexto -';
            }
            return;
        }

        if (target.closest('.mark-btn')) {
            const markBtn = target.closest('.mark-btn');
            markBtn.classList.toggle('marked');
            if (state.markedQuestions.has(questionId)) {
                state.markedQuestions.delete(questionId);
            } else {
                state.markedQuestions.add(questionId);
            }
            return;
        }

        if (target.classList.contains('cancel-answer-btn')) {
            delete state.userAnswers[questionItem.id];
            
            const optionsContainer = questionItem.querySelector('.options-container');
            optionsContainer.classList.remove('answered');
            optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
                btn.classList.remove('selected-preview');
                btn.disabled = false;
            });

            delete questionItem.dataset.selectedValue;

            const confirmBtn = questionItem.querySelector('.confirm-answer-btn');
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Responder';
            
            target.classList.add('hidden');
            questionItem.classList.remove('answered-flash');

            return;
        }

        if (questionItem.querySelector('.options-container.answered')) return;

        if (target.closest('.option-btn')) {
            const selectedBtn = target.closest('.option-btn');
            questionItem.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected-preview'));
            selectedBtn.classList.add('selected-preview');
            questionItem.dataset.selectedValue = selectedBtn.dataset.value;
            questionItem.querySelector('.confirm-answer-btn').disabled = false;
            return;
        }

        if (target.classList.contains('confirm-answer-btn')) {
            const answer = questionItem.dataset.selectedValue;
            if (!answer) {
                showConfirmationModal("Por favor, selecione uma alternativa.");
                return;
            }
            state.userAnswers[questionItem.id] = answer;
            questionItem.querySelector('.options-container').classList.add('answered');
            target.textContent = 'Respondido';
            target.disabled = true;

            questionItem.querySelector('.cancel-answer-btn').classList.remove('hidden');

            questionItem.classList.add('answered-flash');
            setTimeout(() => questionItem.classList.remove('answered-flash'), 700);
            return;
        }

        questionItem.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected-preview'));
        delete questionItem.dataset.selectedValue;
        questionItem.querySelector('.confirm-answer-btn').disabled = true;
    }


    // --- CONTROLE DE TEMPO E PAUSA ---
    function iniciarTimer(duration) {
        state.remainingTime = duration; state.isPaused = false; clearInterval(state.timerInterval);
        const startTime = Date.now();
        state.timerInterval = setInterval(() => {
            if (state.isPaused) return;
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const currentRemaining = duration - elapsed;
            state.remainingTime = currentRemaining;
            const minutes = Math.floor(currentRemaining / 60), seconds = currentRemaining % 60;
            dom.timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            if (currentRemaining <= 0) { clearInterval(state.timerInterval); finalizarSimulado(); }
        }, 1000);
    }

    function pausarSimulado() { state.isPaused = true; clearInterval(state.timerInterval); dom.pauseOverlay.classList.remove('hidden'); }
    function retomarSimulado() { state.isPaused = false; dom.pauseOverlay.classList.add('hidden'); iniciarTimer(state.remainingTime); }

    // --- FINALIZAÇÃO, RESULTADOS, HISTÓRICO E REVISÃO ---
    function finalizarSimulado() {
        clearInterval(state.timerInterval);
        const timeTaken = Math.round((Date.now() - state.simuladoStartTime) / 1000);
        let correct = 0, incorrect = 0, unanswered = 0;
        
        state.simuladoQuestoes.forEach(q => {
            const userAnswer = state.userAnswers[`q-${q.id}`];
            if (!userAnswer) unanswered++;
            else if (userAnswer === q.resposta_correta) correct++;
            else incorrect++;
        });
        
        const total = state.simuladoQuestoes.length;
        const percentage = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
        
        const summary = { correct, incorrect, unanswered, total, percentage, timeTaken };
        salvarHistoricoSimulado(summary);

        dom.correctCountEl.textContent = correct; 
        dom.incorrectCountEl.textContent = incorrect;
        dom.unansweredCountEl.textContent = unanswered; 
        dom.percentageEl.textContent = `${percentage}%`;
        
        dom.simuladoScreen.classList.add('hidden');
        dom.resultsScreen.classList.remove('hidden');
        exibirGraficoResultados(correct, incorrect, unanswered);
        exibirDesempenhoDisciplina();
    }

    function salvarSessaoQuestoes() {
        let resolvidas = getFromStorage(STORAGE_KEY_RESOLVIDAS);
        const resolvidasMap = new Map(resolvidas.map(r => [r.id, r]));
        state.simuladoQuestoes.forEach(questao => {
            const userAnswer = state.userAnswers[`q-${questao.id}`];
            if (userAnswer) { resolvidasMap.set(questao.id, { id: questao.id, correta: userAnswer === questao.resposta_correta }); }
        });
        saveToStorage(STORAGE_KEY_RESOLVIDAS, Array.from(resolvidasMap.values()));
    }

    function salvarHistoricoSimulado(summary) {
        let historico = getFromStorage(STORAGE_KEY_HISTORICO);

        const sessaoCompleta = {
            id: `sim-${state.simuladoStartTime}`,
            date: new Date().toISOString(),
            summary: summary,
            questoes: state.simuladoQuestoes,
            userAnswers: state.userAnswers,
            markedQuestions: Array.from(state.markedQuestions)
        };

        historico.unshift(sessaoCompleta);
        saveToStorage(STORAGE_KEY_HISTORICO, historico);
    }

    function carregarSessaoParaRevisao(sessionId) {
        const historico = getFromStorage(STORAGE_KEY_HISTORICO);
        const sessao = historico.find(s => s.id === sessionId);

        if (!sessao) {
            showConfirmationModal("Sessão do histórico não encontrada.");
            return;
        }

        state.simuladoQuestoes = sessao.questoes;
        state.userAnswers = sessao.userAnswers;
        state.markedQuestions = new Set(sessao.markedQuestions);

        const { correct, incorrect, unanswered, percentage } = sessao.summary;
        dom.correctCountEl.textContent = correct;
        dom.incorrectCountEl.textContent = incorrect;
        dom.unansweredCountEl.textContent = unanswered;
        dom.percentageEl.textContent = `${percentage}%`;
        exibirGraficoResultados(correct, incorrect, unanswered);
        exibirDesempenhoDisciplina();

        dom.historyScreen.classList.add('hidden');
        dom.resultsScreen.classList.remove('hidden');
        
        if (dom.reviewContainer.classList.contains('hidden')) {
            toggleRevisao();
        } else {
            exibirRevisao('all');
        }
    }

    function exibirHistorico() {
        dom.setupScreen.classList.add('hidden');
        dom.resultsScreen.classList.add('hidden');
        dom.historyScreen.classList.remove('hidden');
        
        const historico = getFromStorage(STORAGE_KEY_HISTORICO);
        dom.historyList.innerHTML = historico.length === 0 ? '<p>Nenhum simulado foi concluído ainda.</p>' : '';
        
        historico.forEach(item => {
            const date = new Date(item.date);
            const formattedDate = `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'history-item';
            itemEl.dataset.sessionId = item.id;
            
            itemEl.innerHTML = `
                <div class="history-item-info">
                    <div class="history-item-date">${formattedDate}</div>
                    <div class="history-item-score">
                        <i class="fas fa-check-circle correct"></i> ${item.summary.correct} / ${item.summary.total}
                    </div>
                </div>
                <div class="history-item-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
            dom.historyList.appendChild(itemEl);
        });
    }

    function exibirDesempenhoDisciplina() {
        dom.disciplinePerformanceList.innerHTML = '';
        const performance = {};
        state.simuladoQuestoes.forEach(q => {
            const disc = q.disciplina;
            if (!performance[disc]) performance[disc] = { correct: 0, total: 0 };
            performance[disc].total++;
            if (state.userAnswers[`q-${q.id}`] === q.resposta_correta) { performance[disc].correct++; }
        });
        for (const disc in performance) {
            const item = performance[disc];
            const perc = item.total > 0 ? ((item.correct / item.total) * 100).toFixed(0) : 0;
            const itemEl = document.createElement('div');
            itemEl.className = 'discipline-perf-item';
            itemEl.innerHTML = `<span class="name">${disc}</span> <span class="stats">${item.correct}/${item.total} (${perc}%)</span>`;
            dom.disciplinePerformanceList.appendChild(itemEl);
        }
    }

    function exibirGraficoResultados(correct, incorrect, unanswered) {
        if (state.resultsChart) state.resultsChart.destroy();
        state.resultsChart = new Chart(dom.resultsChartEl, { type: 'doughnut', data: { labels: ['Acertos', 'Erros', 'Em Branco'], datasets: [{ data: [correct, incorrect, unanswered], backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(108, 117, 125, 0.8)'], borderColor: ['#28a745', '#dc3545', '#6c757d'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } } });
    }

    function toggleRevisao() {
        const isHidden = dom.reviewContainer.classList.toggle('hidden');
        if (!isHidden) {
            exibirRevisao('all');
            dom.reviewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function exibirRevisao(filter) {
        dom.reviewFilterOptions.querySelectorAll('.review-filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
        dom.reviewQuestionsArea.innerHTML = '';
        let filteredQuestions = state.simuladoQuestoes.filter(q => {
            const userAnswer = state.userAnswers[`q-${q.id}`];
            switch (filter) {
                case 'incorrect': return userAnswer && userAnswer !== q.resposta_correta;
                case 'unanswered': return !userAnswer;
                case 'marked': return state.markedQuestions.has(String(q.id));
                default: return true;
            }
        });

        if (filteredQuestions.length === 0) {
            dom.reviewQuestionsArea.innerHTML = `<p class="empty-state" style="text-align: center; padding: 20px;">Nenhuma questão para exibir neste filtro.</p>`;
            return;
        }

        filteredQuestions.forEach((questao, index) => {
            const userAnswer = state.userAnswers[`q-${questao.id}`];
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-question';
            let optionsHtml = questao.opcoes.map(op => {
                let optionClass = '';
                if (op.letra === questao.resposta_correta) optionClass = 'correct-answer';
                if (op.letra === userAnswer) optionClass += ' selected';
                if (op.letra === userAnswer && userAnswer !== questao.resposta_correta) optionClass += ' wrong-answer';
                return `<div class="option-btn ${optionClass}"><span class="option-letter">${op.letra}</span><span class="option-content">${op.texto}</span></div>`;
            }).join('');

            reviewItem.innerHTML = `
                <p><strong>${index + 1}. ${questao.enunciado}</strong></p>
                
                ${questao.contexto ? `
                  <div class="question-context">
                    <button class="btn-contexto toggle-btn" data-target="review-ctx-${questao.id}">Contexto +</button>
                    <div id="review-ctx-${questao.id}" class="toggle-content oculto">
                      ${questao.contexto}
                    </div>
                  </div>
                ` : ''}

                <div class="options-container">${optionsHtml}</div>
                <div class="feedback-area">
                    ${questao.resolucao ? `<button class="btn btn-secondary view-resolution-btn">Ver Resolução</button>` : ''}
                </div>
                ${questao.resolucao ? `<div class="resolution-area hidden">${questao.resolucao}</div>` : ''}
            `;
            dom.reviewQuestionsArea.appendChild(reviewItem);
        });
    }

    // --- MODAL DE CONFIRMAÇÃO ---
    function showConfirmationModal(text, onConfirm) {
        const modalTitle = dom.confirmModal.querySelector('#confirm-modal-title');
        const modalText = dom.confirmModal.querySelector('#confirm-modal-text');
        const confirmBtn = dom.confirmModal.querySelector('#confirm-modal-confirm-btn');
        const cancelBtn = dom.confirmModal.querySelector('#confirm-modal-cancel-btn');

        modalText.textContent = text;
        state.confirmCallback = onConfirm;

        if (!onConfirm) {
            modalTitle.textContent = "Aviso";
            confirmBtn.classList.add('hidden');
            cancelBtn.textContent = "Fechar";
        } else {
            modalTitle.textContent = "Confirmar Ação";
            confirmBtn.classList.remove('hidden');
            cancelBtn.textContent = "Cancelar";
        }
        
        dom.confirmModal.classList.remove('hidden');
    }

    function hideConfirmModal() {
        dom.confirmModal.classList.add('hidden');
        state.confirmCallback = null;
    }
    
    // --- VINCULAÇÃO DE EVENTOS ---
    function vincularEventos() {
        dom.startSimuladoBtn.addEventListener('click', iniciarSimulado);
        dom.historyBtn.addEventListener('click', exibirHistorico);
        dom.backToSetupBtn.addEventListener('click', () => { dom.historyScreen.classList.add('hidden'); dom.setupScreen.classList.remove('hidden'); });
        dom.pauseBtn.addEventListener('click', pausarSimulado);
        dom.resumeBtn.addEventListener('click', retomarSimulado);
        dom.questionsContainer.addEventListener('click', handleQuestionClick);
        
        dom.historyList.addEventListener('click', (e) => {
            const item = e.target.closest('.history-item');
            if (item && item.dataset.sessionId) {
                carregarSessaoParaRevisao(item.dataset.sessionId);
            }
        });
        
        dom.reviewBtn.addEventListener('click', toggleRevisao);
        dom.reviewFilterMainBtn.addEventListener('click', () => dom.reviewFilterOptions.classList.toggle('hidden'));
        dom.reviewFilterOptions.addEventListener('click', (e) => { if (e.target.matches('.review-filter-btn')) { exibirRevisao(e.target.dataset.filter); dom.reviewFilterOptions.classList.add('hidden'); } });
        
        dom.reviewQuestionsArea.addEventListener('click', (e) => {
            const target = e.target;
            // Lógica para o botão 'Ver Resolução'
            if (target.matches('.view-resolution-btn')) {
                const resArea = target.closest('.review-question').querySelector('.resolution-area');
                if(resArea) {
                    const isHidden = resArea.classList.toggle('hidden');
                    target.textContent = isHidden ? 'Ver Resolução' : 'Ocultar Resolução';
                }
            }
            // Lógica para o botão 'Contexto'
            if (target.matches('.toggle-btn')) {
                const contentId = target.dataset.target;
                const contentArea = document.getElementById(contentId);
                if (contentArea) {
                    const isHidden = contentArea.classList.toggle('oculto');
                    target.textContent = isHidden ? 'Contexto +' : 'Contexto -';
                }
            }
        });

        dom.prevDisciplineBtn.addEventListener('click', () => { if (state.currentDisciplinaIndex > 0) { state.currentDisciplinaIndex--; exibirDisciplinaAtual(); } });
        dom.nextDisciplineBtn.addEventListener('click', () => { if (state.currentDisciplinaIndex < state.disciplinasDoSimulado.length - 1) { state.currentDisciplinaIndex++; exibirDisciplinaAtual(); } });
        dom.finishBtn.addEventListener('click', () => showConfirmationModal("Tem certeza que deseja finalizar e ver seu resultado?", finalizarSimulado));
        dom.forceFinishBtn.addEventListener('click', () => showConfirmationModal("Tem certeza que deseja finalizar o simulado?", finalizarSimulado));
        dom.restartSimuladoBtn.addEventListener('click', () => { dom.resultsScreen.classList.add('hidden'); dom.setupScreen.classList.remove('hidden'); });
        dom.confirmModal.querySelector('#confirm-modal-confirm-btn').addEventListener('click', () => { if (state.confirmCallback) { state.confirmCallback(); } hideConfirmModal(); });
        dom.confirmModal.querySelector('#confirm-modal-cancel-btn').addEventListener('click', hideConfirmModal);
        document.addEventListener('click', (e) => { if (!dom.reviewFilterMainBtn.contains(e.target) && !dom.reviewFilterOptions.contains(e.target)) { dom.reviewFilterOptions.classList.add('hidden'); } });
        dom.preConfigCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            dom.manualFiltersContainer.classList.toggle('disabled', isChecked);
            dom.preConfigSelectContainer.classList.toggle('hidden', !isChecked);
            Object.values(choices).forEach(c => isChecked ? c.disable() : c.enable());
        });
        dom.manualFiltersContainer.querySelector('#filtroDisciplina').addEventListener('change', atualizarAssuntosPorDisciplina);
    }
    // --- INICIALIZAÇÃO DO SCRIPT ---
    inicializar();
});

document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('discipline-nav');
    const sentinel = document.getElementById('sticky-sentinel');
    const questions = document.getElementById('questions-container');
    
    if (nav && sentinel && questions) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    const navHeight = nav.offsetHeight;
                    nav.classList.add('stuck');
                    questions.style.transform = `translateY(${navHeight}px)`;
                } else {
                    nav.classList.remove('stuck');
                    questions.style.transform = 'translateY(0px)';
                }
            },
            {
                rootMargin: "-77px 0px 0px 0px",
                threshold: 0
            }
        );
        
        observer.observe(sentinel);
    }
});