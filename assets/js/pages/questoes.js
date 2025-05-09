// assets/js/pages/questoes.js

document.addEventListener('DOMContentLoaded', () => {

    // === Elementos do DOM ===
    const assuntoInput = document.getElementById('assuntoInput');
    const bibliografiaInput = document.getElementById('bibliografiaInput');
    const disciplinaSelect = document.getElementById('disciplinaSelect');
    const numQuestoesInput = document.getElementById('numQuestoesInput');
    const tipoQuestaoSelect = document.getElementById('tipoQuestaoSelect');
    const nivelQuestaoSelect = document.getElementById('nivelQuestaoSelect');
    const generateButton = document.getElementById('generateButton');
    const questoesOutput = document.getElementById('questoesOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const finalizeButton = document.getElementById('finalizeButton');
    const generatorBlock = generateButton ? generateButton.closest('.bloco') : null;
    // Pode adicionar um elemento para mostrar o status da geração (ex: "Gerando...", "Processando...")
    const generationStatusElement = document.getElementById('generationStatus'); // Assumindo que você adicionou um <p id="generationStatus"></p>

    // === Elementos do Popup ===
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupCloseButton = document.getElementById('popupCloseButton');

    // === Endpoints das Funções Netlify Assíncronas ===
    const START_GENERATION_URL = '/.netlify/functions/startGeneration';
    const CHECK_GENERATION_URL = '/.netlify/functions/checkGeneration';

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // --- Variáveis Globais ---
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null;
    let questionsDataStore = {};
    let pollingIntervalId = null; // Para controlar o intervalo de polling
    let currentTaskId = null; // Para armazenar o ID da tarefa atual

    // === Função: Popular Dropdown de Disciplinas ===
    function populateDisciplinaDropdown() {
        // ... (código da função populateDisciplinaDropdown) ...
        const storedData = localStorage.getItem(DISCIPLINAS_STORAGE_KEY);
        disciplinaSelect.innerHTML = '<option value="">-- Selecione a Disciplina --</option>';
        if (storedData) {
            try {
                const disciplinas = JSON.parse(storedData);
                if (Array.isArray(disciplinas) && disciplinas.every(item => typeof item === 'object' && item !== null && typeof item.nome === 'string')) {
                    disciplinas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
                    disciplinas.forEach(disciplinaObj => {
                        const nomeDisciplina = disciplinaObj.nome.trim();
                        if (nomeDisciplina) {
                            const option = document.createElement('option');
                            option.value = nomeDisciplina;
                            option.textContent = nomeDisciplina;
                            disciplinaSelect.appendChild(option);
                        }
                    });
                } else {
                    console.warn(`Dados em localStorage['${DISCIPLINAS_STORAGE_KEY}'] não são um array de objetos com a propriedade 'nome' string.`);
                }
            } catch (error) {
                console.error(`Erro ao parsear ou processar disciplinas do localStorage ('${DISCIPLINAS_STORAGE_KEY}'):`, error);
            }
        } else {
            console.log(`Nenhuma disciplina encontrada em localStorage['${DISCIPLINAS_STORAGE_KEY}'].`);
        }
    }

    // === Event Listeners ===
    generateButton.addEventListener('click', handleGenerateQuestions);
    finalizeButton.addEventListener('click', () => finalizeSession(true));

    questoesOutput.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.option-btn, .option-btn *')) {
             const optionBtn = target.closest('.option-btn');
             if (optionBtn && !optionBtn.disabled) { handleOptionClick(optionBtn); }
        }
        else if (target.matches('.confirm-answer-btn')) { if (!target.disabled) { handleConfirmAnswer(target); } }
        else if (target.matches('.view-resolution-btn')) { if (!target.disabled) { handleViewResolution(target); } }
    });

    // Limpa o intervalo de polling ao sair ou recarregar a página
    window.addEventListener('beforeunload', () => {
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
            console.log("Polling interval cleared on beforeunload.");
        }
         // Chama finalizeSession, que já verifica se há sessão ativa
         handleBeforeUnload(); // Reusa a lógica existente
    });

     // Reusa a lógica de finalização de sessão
     function handleBeforeUnload() { if (currentSessionStats.id && currentSessionStats.totalQuestions > 0 && currentSessionStats.answeredCount < currentSessionStats.totalQuestions) { console.log("beforeunload: Finalizando sessão ativa incompleta..."); finalizeSession(false); } else { console.log("beforeunload: Nenhuma sessão ativa para finalizar ou já completa."); } }


    // === Event Listeners do Popup ===
    if (popupCloseButton) {
        popupCloseButton.addEventListener('click', hidePopup);
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (event) => {
            if (event.target === popupOverlay) {
                hidePopup();
            }
        });
    }

    // === Chamar a função para popular o dropdown ===
    populateDisciplinaDropdown();


    // === Funções Auxiliares de UI ===
    function showLoading(isLoading, message = 'Gerando...') {
        hidePopup();
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
        assuntoInput.disabled = isLoading;
        bibliografiaInput.disabled = isLoading;
        disciplinaSelect.disabled = isLoading;
        numQuestoesInput.disabled = isLoading;
        tipoQuestaoSelect.disabled = isLoading;
        nivelQuestaoSelect.disabled = isLoading;

        // Atualiza elemento de status de geração
        if(generationStatusElement) {
             generationStatusElement.textContent = isLoading ? message : '';
             generationStatusElement.style.display = isLoading ? 'block' : 'none';
        }
    }


    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        finalizeButton.style.display = 'none';
        questionsDataStore = {};
        currentTaskId = null; // Limpa o ID da tarefa
        if (pollingIntervalId) { // Garante que o polling é parado
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
             console.log("Polling interval cleared during state reset.");
        }
         showLoading(false, ''); // Esconde loading e status message
        console.log("Estado da sessão e armazenamento de questões resetados.");
    }

    function clearOutput() {
        questoesOutput.innerHTML = '';
        hidePopup();
        console.log("Output clear.");
    }

    // === Funções do Popup ===
    function showPopup(message, type = 'info', autoCloseDelay = null) {
         if (!popupOverlay || !popupMessageBox || !popupContent) { console.error("Elementos do Popup não encontrados no DOM."); alert(message); return; }
         if (popupTimeoutId) { clearTimeout(popupTimeoutId); popupTimeoutId = null; }
         popupContent.textContent = message;
         popupMessageBox.className = `popup-message-box ${type}`;
         popupOverlay.classList.add('visible');
         if (autoCloseDelay && typeof autoCloseDelay === 'number' && autoCloseDelay > 0) { popupTimeoutId = setTimeout(hidePopup, autoCloseDelay); }
     }

    function hidePopup() {
        if (popupTimeoutId) { clearTimeout(popupTimeoutId); popupTimeoutId = null; }
        if (popupOverlay) { popupOverlay.classList.remove('visible'); }
    }

    function showError(message) {
        questoesOutput.innerHTML = ''; // Limpa output em caso de erro final
        showPopup(message, 'error');
        resetSessionState(); // Reseta TUDO em caso de erro na geração ou polling final
        showLoading(false); // Garante que loading/status suma
    }

    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null);
    }

     // === Função: Salvar Resumo da Sessão === (Não muda)
     function saveSessionSummary() {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        console.log("Tentando salvar resumo da sessão ID:", currentSessionStats.id);
        let durationMs = 0; if(currentSessionStats.startTime) { durationMs = Date.now() - currentSessionStats.startTime; }
        let durationFromTimer = null;
        if (window.timerPopupAPI && typeof window.timerPopupAPI.getDuration === 'function') {
            try { durationFromTimer = window.timerPopupAPI.getDuration(); if (typeof durationFromTimer === 'object' && durationFromTimer !== null && typeof durationFromTimer.ms === 'number') { durationMs = durationFromTimer.ms; } else if (typeof durationFromTimer === 'number') { durationMs = durationFromTimer; } console.log("Duração obtida do timerPopupAPI:", durationMs); } catch (e) { console.error("Erro ao chamar getDuration:", e); }
        } else { console.warn("Função timerPopupAPI.getDuration() não encontrada. Usando cálculo manual."); }
        const summary = { id: currentSessionStats.id, timestamp: new Date().toISOString(), disciplina: currentSessionStats.disciplina, totalQuestions: currentSessionStats.totalQuestions, answeredCount: currentSessionStats.answeredCount, correctCount: currentSessionStats.correctCount, durationMs: durationMs };
        try { const existingSummaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || '[]'); if (!Array.isArray(existingSummaries)) throw new Error("Formato inválido no localStorage"); const index = existingSummaries.findIndex(s => s.id === summary.id); if (index === -1) { existingSummaries.push(summary); } else { existingSummaries[index] = summary; } localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries)); console.log(`Resumo da sessão ${summary.id} salvo com sucesso.`); } catch (error) { console.error("Erro ao salvar resumo da sessão no localStorage:", error); showStatus("Erro ao salvar o resumo da sessão.", "error"); }
    }

    // === Função: Finalizar Sessão de Estudo === (Não muda na lógica, mas chamada diferente)
    function finalizeSession(openPanel = false) {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        const sessionId = currentSessionStats.id;
        console.log(`Finalizando sessão ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { try { console.log("Chamando timerPopupAPI.stopTimer()"); window.timerPopupAPI.stopTimer(); } catch (e) { console.error("Erro ao chamar stopTimer:", e); } } else { console.warn('Função timerPopupAPI.stopTimer() não encontrada.'); }
        saveSessionSummary();
        const wasActive = currentSessionStats.id !== null;
        resetSessionState(); // <-- Reset já limpa o pollingIntervalId

        if (openPanel && wasActive) { console.log("finalizeSession: Attempting to open panel."); if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') { try { console.log("Chamando timerPopupAPI.openPanel()"); window.timerPopupAPI.openPanel(); } catch (e) { console.error("Erro ao chamar openPanel:", e); showStatus("Sessão finalizada e salva. Painel não disponível.", "info"); } } else { console.warn('Função timerPopupAPI.openPanel() não encontrada.'); showStatus("Sessão finalizada e salva. Painel não disponível.", "info"); } } else if (wasActive) { console.log("finalizeSession: Not opening panel."); showStatus("Sessão finalizada e salva.", "success"); } else { console.log("finalizeSession: No active session to finalize."); }
        console.log(`Sessão ${sessionId} finalizada.`);
    }


     // === Função: Exibir Questões Parseadas (Recebe dados já parseados do backend) === (Não muda)
    function displayParsedQuestions(questionsArray) {
         questoesOutput.innerHTML = '';
         questionsDataStore = {};
         if (!questionsArray || questionsArray.length === 0) {
             questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada pelo servidor.</p>';
             return;
         }
         questionsArray.forEach((qData, index) => {
             questionsDataStore[qData.id] = qData;

             const questionDiv = document.createElement('div');
             questionDiv.className = 'question-item';
             questionDiv.id = qData.id;
             questionDiv.dataset.questionType = qData.type;
             questionDiv.dataset.answered = 'false';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 questionDiv.dataset.correctAnswer = qData.correctAnswer || '';
                 questionDiv.dataset.selectedOption = '';
             }

             if (qData.metaSource || qData.metaYear) { /* ... meta div code ... */
                 const metaDiv = document.createElement('div'); metaDiv.className = 'question-meta';
                 if (qData.metaSource) { const sourceSpan = document.createElement('span'); sourceSpan.className = 'meta-source'; sourceSpan.textContent = qData.metaSource; metaDiv.appendChild(sourceSpan); }
                 if (qData.metaSource && qData.metaYear) { const separatorSpan = document.createElement('span'); separatorSpan.className = 'meta-separator'; separatorSpan.textContent = ' - '; metaDiv.appendChild(separatorSpan); }
                 if (qData.metaYear) { const yearSpan = document.createElement('span'); yearSpan.className = 'meta-year'; yearSpan.textContent = qData.metaYear; metaDiv.appendChild(yearSpan); }
                 questionDiv.appendChild(metaDiv);
             }

             const questionText = document.createElement('p'); questionText.className = 'question-text';
             const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
             questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`;
             questionDiv.appendChild(questionText);

             if (qData.image) { /* ... image code ... */
                 const imgElement = document.createElement('img'); imgElement.src = qData.image; imgElement.alt = `Imagem para a questão ${index + 1}`; imgElement.className = 'question-image';
                 imgElement.onerror = () => { console.warn(`Erro ao carregar imagem: ${qData.image} para questão ${qData.id}`); imgElement.alt = `Erro ao carregar imagem para a questão ${index + 1}`; imgElement.style.display = 'none'; const errorMsg = document.createElement('p'); errorMsg.className = 'image-load-error'; errorMsg.textContent = `[Erro ao carregar imagem: ${qData.image}]`; imgElement.parentNode.insertBefore(errorMsg, imgElement.nextSibling); };
                 questionDiv.appendChild(imgElement);
             }

             if (qData.type === 'error') { questionDiv.classList.add('question-error'); questoesOutput.appendChild(questionDiv); return; }

             const optionsContainer = document.createElement('div'); optionsContainer.className = 'options-container';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') { /* ... options code ... */
                 const optionKeys = (qData.type === 'multipla_escolha') ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort() : ['V', 'F'];
                 optionKeys.forEach(key => { if (qData.options[key] !== undefined) { const optionButton = document.createElement('button'); optionButton.className = 'option-btn'; optionButton.dataset.value = key; const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;"); const letterHTML = `<span class="option-letter">${key})</span>`; let contentText = ''; if (qData.type === 'verdadeiro_falso') { const label = (key === 'V') ? 'Verdadeiro' : 'Falso'; const text = (sanitizedOptionText && sanitizedOptionText.toLowerCase() !== 'verdadeiro' && sanitizedOptionText.toLowerCase() !== 'falso') ? `: ${sanitizedOptionText}` : ''; contentText = `${label}${text}`; } else { contentText = sanitizedOptionText; } const contentHTML = `<span class="option-content">${contentText.replace(/\n/g, '<br>')}</span>`; optionButton.innerHTML = letterHTML + contentHTML; optionsContainer.appendChild(optionButton); } });
             } else if (qData.type === 'dissertativa_curta') { /* ... dissertative info code ... */
                 const answerP = document.createElement('p'); answerP.className = 'dissertative-info'; let dissertativeText = `<i>Questão dissertativa.`; if(qData.suggestedAnswer) { const sanitizedAnswer = qData.suggestedAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;"); dissertativeText += ` Resposta Sugerida: ${sanitizedAnswer}`; } else { dissertativeText += ` Resposta não interativa.`; } dissertativeText += `</i>`; answerP.innerHTML = dissertativeText; optionsContainer.appendChild(answerP);
             }
             questionDiv.appendChild(optionsContainer);

             const feedbackArea = document.createElement('div'); feedbackArea.className = 'feedback-area';
             const feedbackDiv = document.createElement('div'); feedbackDiv.className = 'feedback-message'; feedbackDiv.style.display = 'none'; feedbackArea.appendChild(feedbackDiv);

             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') { /* ... confirm button code ... */
                 const confirmButton = document.createElement('button'); confirmButton.className = 'confirm-answer-btn'; confirmButton.textContent = 'Responder'; confirmButton.disabled = true; feedbackArea.appendChild(confirmButton);
             }

             if (qData.resolution) { /* ... view resolution button code ... */
                 const resolutionButton = document.createElement('button'); resolutionButton.className = 'view-resolution-btn'; resolutionButton.textContent = 'Ver Resolução'; resolutionButton.dataset.questionId = qData.id; resolutionButton.style.display = 'none'; feedbackArea.appendChild(resolutionButton);
             }

             questionDiv.appendChild(feedbackArea);

             if (qData.resolution) { /* ... resolution area code ... */
                 const resolutionDiv = document.createElement('div'); resolutionDiv.className = 'resolution-area'; resolutionDiv.style.display = 'none'; questionDiv.appendChild(resolutionDiv);
             }

             questoesOutput.appendChild(questionDiv);
         });
    }

    // === Funções de Interação com Questões (Não mudam) ===
    function handleOptionClick(clickedButton) { /* ... code ... */
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmButton.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
     }

    function handleConfirmAnswer(confirmButton) { /* ... code ... */
         console.log("handleConfirmAnswer triggered for button:", confirmButton); const questionDiv = confirmButton.closest('.question-item'); console.log("Associated questionDiv:", questionDiv); if (!questionDiv) { console.error("Não foi possível encontrar o .question-item pai do botão."); return; } const userAnswer = questionDiv.dataset.selectedOption; const isAnswered = questionDiv.dataset.answered === 'true'; console.log("Checking conditions: ", { userAnswer: userAnswer, isAnswered: isAnswered, sessionId: currentSessionStats.id }); if (!userAnswer || isAnswered) { console.warn("Tentativa de confirmar resposta inválida: Nenhuma opção selecionada ou questão já respondida.", { selectedOption: userAnswer, isAnswered: isAnswered }); confirmButton.style.opacity = '0.5'; setTimeout(() => { confirmButton.style.opacity = '1'; }, 300); return; } if (!currentSessionStats.id) { console.warn("Tentativa de responder sem sessão ativa."); showStatus("Erro: Sessão não iniciada.", "error"); return; } console.log("Passed initial checks. Proceeding with answer evaluation...");
         const correctAnswer = questionDiv.dataset.correctAnswer;
         const isCorrect = userAnswer === correctAnswer;
         const feedbackDiv = questionDiv.querySelector('.feedback-message');
         const allOptionButtons = questionDiv.querySelectorAll('.option-btn');
         const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer);
         const resolutionButton = questionDiv.querySelector('.view-resolution-btn');

         console.log(`Confirmando resposta para ${questionDiv.id}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`);
         questionDiv.dataset.answered = 'true';
         questionDiv.classList.add('answered');
         questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');

         allOptionButtons.forEach(btn => {
             btn.disabled = true;
             btn.classList.remove('selected-preview');
             if (btn.dataset.value === userAnswer) { btn.classList.add('selected-user-answer'); }
             if (btn.dataset.value === correctAnswer) { btn.classList.add('correct-answer-highlight'); }
         });

         confirmButton.disabled = true;

         if (feedbackDiv) { feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`; feedbackDiv.className = `feedback-message ${isCorrect ? 'correct' : 'incorrect'}`; feedbackDiv.style.display = 'block'; } else { console.warn("Elemento .feedback-message não encontrado para", questionDiv.id); }

         if (resolutionButton) { resolutionButton.style.display = 'inline-flex'; console.log(`Botão 'Ver Resolução' exibido para ${questionDiv.id}`); }

         currentSessionStats.answeredCount++; if (isCorrect) { currentSessionStats.correctCount++; } console.log('Sessão atual:', currentSessionStats);

         if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') { try { window.timerPopupAPI.updateStats( currentSessionStats.answeredCount, currentSessionStats.correctCount ); } catch(e) { console.error("Erro ao chamar updateStats:", e); } } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); }

         if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions && currentSessionStats.totalQuestions > 0) {
             console.log("Todas as questões foram respondidas!");
             showStatus("Simulado concluído! Verifique o painel de tempo.", "success");
             finalizeSession(true);
         }
     }

    function handleViewResolution(resolutionButton) { /* ... code ... */
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector('.resolution-area') : null;
        const questionData = questionsDataStore[questionId];

        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) {
            console.error(`Erro ao tentar mostrar resolução para questão ${questionId}. Elementos ou dados não encontrados.`, { questionDivExists: !!questionDiv, resolutionAreaExists: !!resolutionArea, questionDataExists: !!questionData, hasResolution: questionData?.resolution });
            showStatus("Erro ao carregar a resolução.", "error");
            return;
        }

        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, '<br>')}`;
        resolutionArea.style.display = 'block';

        resolutionButton.disabled = true;

        console.log(`Resolução exibida para ${questionId}`);
    }


    // === Função Principal: Gerar Questões (INICIA A TAREFA E COMEÇA O POLLING) ===
    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id) {
             console.log("Gerando novas questões, finalizando sessão anterior...");
             finalizeSession(false); // Finaliza a sessão anterior silenciosamente
        }

        // Limpa qualquer polling anterior pendente
        if (pollingIntervalId) {
             clearInterval(pollingIntervalId);
             pollingIntervalId = null;
             console.log("Cleared previous polling interval.");
        }
        currentTaskId = null; // Limpa o ID da tarefa anterior

        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value;

        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { numQuestoesInput.focus(); return showError("Número de questões inválido (1-20)."); }
        if (!nivelQuestao) { nivelQuestaoSelect.focus(); return showError("Por favor, selecione o Nível das questões."); }
        if (!tipoQuestao) { tipoQuestaoSelect.focus(); return showError("Por favor, selecione o Tipo de Questão."); }


        const disciplinaParaSessao = disciplinaSelecionada || "Geral";

        console.log(`Iniciando geração assíncrona via Netlify Function...`);
        showLoading(true, 'Iniciando geração...'); // Mostra loading e status inicial
        clearOutput(); // Limpa a área de questões

        // === Dados para enviar para a função START ===
        const requestBodyToStartFunction = {
            assunto: assunto,
            bibliografia: bibliografia,
            disciplinaSelecionada: disciplinaSelecionada,
            numQuestoes: numQuestoes,
            tipoQuestao: tipoQuestao,
            nivelQuestao: nivelQuestao
        };

        try {
            // === Chama a função Netlify para INICIAR a geração ===
            const startResponse = await fetch(START_GENERATION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBodyToStartFunction)
            });

             const startResponseData = await startResponse.json();
             console.log("Resposta da função Start Generation:", startResponseData);

             if (!startResponse.ok) {
                 // A função Start Generation retornou um erro
                 const errorMessage = startResponseData.error || `Erro ao iniciar a geração (Status: ${startResponse.status})`;
                 console.error(`Erro retornado pela função Start Generation (Status ${startResponse.status}):`, startResponseData);
                 showError(`Erro ao iniciar a geração: ${errorMessage}`);
                 resetSessionState();
                 return; // Para aqui, não inicia o polling
             }

             // Geração iniciada com sucesso, obtemos o ID da tarefa
             currentTaskId = startResponseData.taskId;
             if (!currentTaskId) {
                  console.error("Função Start Generation não retornou um Task ID.");
                  showError("Erro interno do servidor: ID da tarefa não recebido.");
                  resetSessionState();
                  return;
             }

             console.log(`Tarefa iniciada com ID: ${currentTaskId}. Iniciando polling...`);
             showLoading(true, 'Gerando questões...'); // Atualiza a mensagem de status

             // === Inicia o Polling ===
             // Polla a função CHECK a cada X milissegundos
             const POLLING_INTERVAL = 3000; // Polla a cada 3 segundos (ajuste conforme necessário)

             pollingIntervalId = setInterval(async () => {
                 console.log(`Polling status para Task ID: ${currentTaskId}...`);
                 try {
                     const checkResponse = await fetch(`${CHECK_GENERATION_URL}?taskId=${currentTaskId}`, {
                         method: 'GET', // Polling geralmente usa GET
                         headers: { 'Content-Type': 'application/json' }
                     });

                     const checkResponseData = await checkResponse.json();
                     console.log(`Resposta do Polling (${currentTaskId}):`, checkResponseData);

                     if (!checkResponse.ok) {
                          // Função Check retornou um erro (ex: Task ID não encontrado, erro interno)
                          const errorMessage = checkResponseData.message || `Erro ao verificar status da tarefa (Status: ${checkResponse.status})`;
                          console.error(`Erro retornado pela função Check Generation (Status ${checkResponse.status}):`, checkResponseData);
                          // Limpa o polling e mostra erro
                          showError(`Erro durante a geração assíncrona: ${errorMessage}`);
                          // resetSessionState já é chamado por showError
                          return; // Sai do callback do intervalo
                     }

                     // Verifica o status retornado pela função Check
                     const status = checkResponseData.status;

                     if (status === 'COMPLETED') {
                         // === Tarefa Concluída com Sucesso ===
                         clearInterval(pollingIntervalId); // Para o polling
                         pollingIntervalId = null;
                         console.log(`Tarefa ${currentTaskId} COMPLETED. Exibindo resultados.`);

                         const { questionsArray, totalValidQuestions, errorQuestionsCount, finishReason } = checkResponseData.data;

                         displayParsedQuestions(questionsArray); // Exibe as questões recebidas

                         if (totalValidQuestions > 0) {
                             // Inicia a nova sessão
                             currentSessionStats = {
                                 id: `sess-${Date.now()}`, // Novo ID de sessão para o frontend
                                 totalQuestions: totalValidQuestions,
                                 answeredCount: 0,
                                 correctCount: 0,
                                 disciplina: disciplinaParaSessao,
                                 startTime: Date.now()
                             };
                             console.log("Nova sessão iniciada após geração assíncrona:", currentSessionStats);

                             if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') { try { console.log(`Iniciando sessão no Timer Popup ID: ${currentSessionStats.id}`); window.timerPopupAPI.startSession( currentSessionStats.totalQuestions, currentSessionStats.disciplina ); console.log("Polling SUCCESS: Called startSession."); } catch (e) { console.error("Erro ao chamar startSession:", e); } finalizeButton.style.display = 'inline-flex'; } else { console.warn('API do Timer Popup (startSession) não encontrada.'); finalizeButton.style.display = 'inline-flex'; }

                             let successMsg = `Geradas ${totalValidQuestions} questões válidas! Acompanhe a sessão no painel abaixo.`;
                             if (questionsArray.length !== totalValidQuestions) {
                                 successMsg += ` (${errorQuestionsCount} questão(ões) com erro de formatação.)`;
                                 showStatus(successMsg, 'warning');
                             } else {
                                  showStatus(successMsg, 'success');
                             }

                             // Minimizando e rolando
                             if (generatorBlock && !generatorBlock.classList.contains('minimizado')) { console.log("Minimizando bloco do gerador..."); const minimizeButton = generatorBlock.querySelector('.botao-minimizar'); if (minimizeButton) { minimizeButton.click(); } else { generatorBlock.classList.add('minimizado'); const toggleIcon = generatorBlock.querySelector('.botao-minimizar i'); if (toggleIcon) { toggleIcon.classList.remove('fa-minus'); toggleIcon.classList.add('fa-plus'); if (generatorBlock.querySelector('.botao-minimizar')) { generatorBlock.querySelector('.botao-minimizar').setAttribute('aria-label', 'Expandir'); } } } }
                             setTimeout(() => { questoesOutput.scrollIntoView({ behavior: 'smooth', block: 'start' }); console.log("Rolando para o topo da área de questões..."); }, 100);

                         } else {
                             // Nenhuma questão válida na resposta final
                              if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                                   showError("Nenhuma questão válida gerada pela API. Verifique os logs do servidor/Netlify Function Logs para detalhes.");
                               } else {
                                    showError("Erro: Nenhuma questão válida foi retornada pelo servidor após a geração.");
                               }
                              resetSessionState(); // Garante reset completo
                         }

                         // Avisos sobre o motivo de término
                          if (finishReason && finishReason !== 'stop' && finishReason !== 'length') {
                              console.warn("Geração da API pode ter sido interrompida pelo motivo:", finishReason);
                          } else if (finishReason === 'length' && totalValidQuestions < numQuestoes) {
                              console.warn("Geração interrompida por MAX_TOKENS (length) no backend.");
                          }

                         showLoading(false, ''); // Esconde loading e status

                     } else if (status === 'ERROR') {
                         // === Tarefa Concluída com Erro ===
                         clearInterval(pollingIntervalId); // Para o polling
                         pollingIntervalId = null;
                         console.error(`Tarefa ${currentTaskId} terminou com ERRO:`, checkResponseData.message);
                         // Mostra o erro retornado pela função CHECK
                         showError(`Falha na geração de questões: ${checkResponseData.message || 'Erro desconhecido.'}`);
                         // resetSessionState já é chamado por showError

                     } else if (status === 'PENDING' || status === 'STARTED') {
                         // === Tarefa ainda Pendente ===
                         console.log(`Tarefa ${currentTaskId} ainda pendente... Continuando polling.`);
                         // Opcional: Atualizar a mensagem de status na UI
                         showLoading(true, 'Gerando questões...'); // Mantém loading e status

                     } else if (status === 'NOT_FOUND') {
                          // === Tarefa não encontrada (provavelmente erro ou expirou) ===
                          clearInterval(pollingIntervalId); // Para o polling
                          pollingIntervalId = null;
                          console.error(`Tarefa ${currentTaskId} não encontrada durante polling.`);
                          showError("A tarefa de geração não foi encontrada. Pode ter expirado ou encontrado um erro inesperado no servidor.");
                          // resetSessionState já é chamado por showError

                     } else {
                         // === Status Desconhecido ===
                          clearInterval(pollingIntervalId); // Para o polling
                          pollingIntervalId = null;
                          console.error(`Polling retornou status desconhecido para ${currentTaskId}:`, status);
                          showError(`Erro inesperado: Status da tarefa desconhecido (${status}).`);
                          // resetSessionState já é chamado por showError
                     }

                 } catch (pollingError) {
                     // Erro na requisição de polling (rede, etc.)
                     console.error(`Erro durante a requisição de polling para ${currentTaskId}:`, pollingError);
                     clearInterval(pollingIntervalId); // Para o polling
                     pollingIntervalId = null;
                     showError(`Erro de comunicação durante a espera pela geração: ${pollingError.message || 'Falha desconhecida.'}`);
                     // resetSessionState já é chamado por showError
                 }
             }, POLLING_INTERVAL); // Fim do setInterval

        } catch (error) {
            // Erro na requisição INICIAL para a função START
            console.error("Falha na requisição para a função Start Generation:", error);
            showError(`Erro ao solicitar a geração: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState(); // Garante reset completo
        } finally {
            // O showLoading(false) final agora é chamado APENAS quando o polling terminar (sucesso ou erro)
            // showLoading(false); // REMOVIDO daqui
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded

