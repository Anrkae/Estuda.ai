document.addEventListener('DOMContentLoaded', async () => {
    let questoesJson = [];
    let questionsDataStore = {};
    let currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
    
    const campoBusca = document.getElementById('campoBusca');
    const filtroDisciplina = new Choices('#filtroDisciplina', { removeItemButton: true });
    const filtroAssunto = new Choices('#filtroAssunto', { removeItemButton: true });
    const numeroQuestoes = document.getElementById('numeroQuestoes');
    const buscarQuestoes = document.getElementById('buscarQuestoes');
    const finalizeButton = document.getElementById('finalizeButton');
    const questoesOutput = document.getElementById('questoesOutput');
    
    async function carregarQuestoes() {
        const response = await fetch('../assets/data/questoes.json');
        questoesJson = await response.json();
        preencherFiltros(questoesJson);
    }
    
    function preencherFiltros(questoes) {
        const disciplinas = [...new Set(questoes.map(q => q.disciplina))];
        const assuntos = [...new Set(questoes.map(q => q.assunto))];
        filtroDisciplina.setChoices(disciplinas.map(d => ({ value: d, label: d })), 'value', 'label', true);
        filtroAssunto.setChoices(assuntos.map(a => ({ value: a, label: a })), 'value', 'label', true);
    }
    
    function iniciarSessao(questoes, disciplina) {
        currentSessionStats = {
            id: `sess-${Date.now()}`,
            totalQuestions: questoes.length,
            answeredCount: 0,
            correctCount: 0,
            disciplina: disciplina,
            startTime: Date.now()
        };
        finalizeButton.style.display = 'inline-flex';
        if (window.timerPopupAPI?.startSession) window.timerPopupAPI.startSession(questoes.length, disciplina);
        if (window.timerPopupAPI?.openPanel) window.timerPopupAPI.openPanel();
    }
    
    function finalizarSessao(abrirPainel = true) {
        if (!currentSessionStats.id) return;
        if (window.timerPopupAPI?.stopTimer) window.timerPopupAPI.stopTimer();
        if (abrirPainel && window.timerPopupAPI?.openPanel) window.timerPopupAPI.openPanel();
        finalizeButton.style.display = 'none';
        questionsDataStore = {};
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
    }
    
    function atualizarStatus(isCorreta) {
        if (!currentSessionStats.id) return;
        currentSessionStats.answeredCount++;
        if (isCorreta) currentSessionStats.correctCount++;
        if (window.timerPopupAPI?.updateStats) {
            window.timerPopupAPI.updateStats(currentSessionStats.answeredCount, currentSessionStats.correctCount);
        }
        if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
            finalizarSessao(true);
        }
    }
    
    function exibirQuestoes(questoes) {
        questoesOutput.innerHTML = '';
        questionsDataStore = {};
        
        questoes.forEach((q, index) => {
            const id = `q-${Date.now()}-${index}`;
            questionsDataStore[id] = q;
            
            const div = document.createElement('div');
            div.className = 'question-item';
            div.id = id;
            
            const enunciado = document.createElement('p');
            enunciado.className = 'question-text';
            enunciado.innerHTML = `<strong>${index + 1}.</strong> ${q.enunciado}`;
            div.appendChild(enunciado);
            
            if (q.metadata?.fonte || q.metadata?.ano) {
                const meta = document.createElement('div');
                meta.className = 'question-meta';
                if (q.metadata.fonte) meta.innerHTML += `<span class="meta-source">${q.metadata.fonte}</span>`;
                if (q.metadata.fonte && q.metadata.ano) meta.innerHTML += ` <span class="meta-separator">|</span> `;
                if (q.metadata.ano) meta.innerHTML += `<span class="meta-year">${q.metadata.ano}</span>`;
                div.appendChild(meta);
            }
            
            const opcoes = document.createElement('div');
            opcoes.className = 'options-container';
            
            q.opcoes.forEach(op => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.dataset.value = op.letra;
                btn.innerHTML = `<span class="option-letter">${op.letra}</span><span class="option-content">${op.texto}</span>`;
                btn.addEventListener('click', () => selecionarOpcao(btn));
                opcoes.appendChild(btn);
            });
            
            div.appendChild(opcoes);
            
            const feedback = document.createElement('div');
            feedback.className = 'feedback-area';
            const msg = document.createElement('div');
            msg.className = 'feedback-message';
            feedback.appendChild(msg);
            
            const responder = document.createElement('button');
            responder.className = 'confirm-answer-btn';
            responder.textContent = 'Responder';
            responder.disabled = true;
            responder.addEventListener('click', () => confirmarResposta(div, responder));
            feedback.appendChild(responder);
            
            if (q.resolucao) {
                const gabarito = document.createElement('button');
                gabarito.className = 'view-resolution-btn';
                gabarito.textContent = 'Gabarito';
                gabarito.style.display = 'none';
                gabarito.addEventListener('click', () => {
                    const res = div.querySelector('.resolution-area');
                    const visivel = res.style.display === 'block';
                    res.style.display = visivel ? 'none' : 'block';
                    gabarito.textContent = visivel ? 'Gabarito' : 'Ocultar Gabarito';
                });
                feedback.appendChild(gabarito);
                
                const resolucao = document.createElement('div');
                resolucao.className = 'resolution-area';
                resolucao.innerHTML = `<strong>Resolução:</strong><br>${q.resolucao}`;
                resolucao.style.display = 'none';
                div.appendChild(resolucao);
            }
            
            div.appendChild(feedback);
            questoesOutput.appendChild(div);
        });
    }
    
    function selecionarOpcao(btn) {
        const item = btn.closest('.question-item');
        if (item.classList.contains('answered')) return;
        item.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected-preview'));
        btn.classList.add('selected-preview');
        const confirmar = item.querySelector('.confirm-answer-btn');
        confirmar.disabled = false;
        item.dataset.selected = btn.dataset.value;
    }
    
    function confirmarResposta(item, btn) {
        const id = item.id;
        const q = questionsDataStore[id];
        const resposta = item.dataset.selected;
        if (!resposta || !q || item.classList.contains('answered')) return;
        
        const correta = q.resposta_correta;
        const acertou = resposta === correta;
        item.classList.add('answered', acertou ? 'correct' : 'incorrect');
        
        item.querySelectorAll('.option-btn').forEach(b => {
            b.disabled = true;
            if (b.dataset.value === resposta) b.classList.add('selected');
            if (b.dataset.value === correta) b.classList.add('correct-answer-highlight');
        });
        
        btn.disabled = true;
        const msg = item.querySelector('.feedback-message');
        msg.textContent = acertou ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correta}`;
        msg.style.display = 'block';
        
        const gabarito = item.querySelector('.view-resolution-btn');
        if (gabarito) gabarito.style.display = 'inline-flex';
        
        atualizarStatus(acertou);
    }
    
    buscarQuestoes.addEventListener('click', () => {
        const termo = campoBusca.value.trim().toLowerCase();
        const disciplinas = filtroDisciplina.getValue(true);
        const assuntos = filtroAssunto.getValue(true);
        const qtd = parseInt(numeroQuestoes.value, 10) || 5;
        
        let filtradas = questoesJson.filter(q =>
            (!termo || q.enunciado.toLowerCase().includes(termo)) &&
            (!disciplinas.length || disciplinas.includes(q.disciplina)) &&
            (!assuntos.length || assuntos.includes(q.assunto))
        );
        
        if (!filtradas.length) {
            questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão encontrada.</p>';
            return;
        }
        
        const selecionadas = filtradas.sort(() => 0.5 - Math.random()).slice(0, qtd);
        exibirQuestoes(selecionadas);
        iniciarSessao(selecionadas, disciplinas.join(', ') || 'Diversas');
    });
    
    finalizeButton.addEventListener('click', () => {
        finalizarSessao(true);
    });
    
    await carregarQuestoes();
});