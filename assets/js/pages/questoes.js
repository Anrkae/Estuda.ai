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

    // === Elementos do Popup ===
    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupCloseButton = document.getElementById('popupCloseButton');

    // === Configuração para chamada direta à API Google Gemini (APÓS BUSCAR CHAVE) ===
    // A CHAVE API SERÁ BUSCADA DO BACKEND E USADA TEMPORARIAMENTE
    // const GEMINI_API_KEY = 'SUA_CHAVE_AQUI'; // REMOVIDO! NÃO DEIXE A CHAVE AQUI.
    const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
    const GEMINI_MODEL_TO_USE = 'gemini-1.5-flash-latest'; // Modelo a ser usado
    const TEMP_API_KEY_STORAGE_ID = 'temp_gk_val_session'; // ID para localStorage (mais específico)

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // --- Variáveis Globais ---
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null;
    let questionsDataStore = {};

    // === Função: Popular Dropdown de Disciplinas ===
    function populateDisciplinaDropdown() {
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

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (popupCloseButton) popupCloseButton.addEventListener('click', hidePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) hidePopup(); });

    populateDisciplinaDropdown();

    // === Funções Auxiliares de UI ===
    function showLoading(isLoading) {
        hidePopup();
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        finalizeButton.style.display = 'none';
        questionsDataStore = {};
        console.log("Estado da sessão e armazenamento de questões resetados.");
    }

    function clearOutput() {
        questoesOutput.innerHTML = '';
        hidePopup();
        console.log("Output clear.");
    }

    // === Funções do Popup ===
    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
            console.error("Elementos do Popup não encontrados no DOM.");
            alert(message); // Fallback
            return;
        }
        if (popupTimeoutId) { clearTimeout(popupTimeoutId); popupTimeoutId = null; }
        popupContent.textContent = message;
        popupMessageBox.className = `popup-message-box ${type}`;
        popupOverlay.classList.add('visible');
        if (autoCloseDelay && typeof autoCloseDelay === 'number' && autoCloseDelay > 0) {
            popupTimeoutId = setTimeout(hidePopup, autoCloseDelay);
        }
    }

    function hidePopup() {
        if (popupTimeoutId) { clearTimeout(popupTimeoutId); popupTimeoutId = null; }
        if (popupOverlay) popupOverlay.classList.remove('visible');
    }

    function showError(message) {
        questoesOutput.innerHTML = '';
        showPopup(message, 'error');
        resetSessionState();
        showLoading(false);
    }

    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null);
    }

    // === Função: Salvar Resumo da Sessão ===
    // (Mantida a versão melhorada que tenta pegar duração do timerPopupAPI)
    function saveSessionSummary() {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        console.log("Tentando salvar resumo da sessão ID:", currentSessionStats.id);
        let durationMs = 0;
        if (currentSessionStats.startTime) {
            durationMs = Date.now() - currentSessionStats.startTime;
        }

        let durationFromTimer = null;
        if (window.timerPopupAPI && typeof window.timerPopupAPI.getDuration === 'function') {
            try {
                durationFromTimer = window.timerPopupAPI.getDuration();
                if (typeof durationFromTimer === 'object' && durationFromTimer !== null && typeof durationFromTimer.ms === 'number') {
                    durationMs = durationFromTimer.ms;
                } else if (typeof durationFromTimer === 'number') {
                    durationMs = durationFromTimer;
                }
                console.log("Duração obtida do timerPopupAPI:", durationMs);
            } catch (e) {
                console.error("Erro ao chamar getDuration:", e);
            }
        } else {
            // Removido console.warn para não poluir tanto, já que é esperado em alguns casos.
            // console.warn("Função timerPopupAPI.getDuration() não encontrada. Usando cálculo manual da duração.");
        }

        const summary = {
            id: currentSessionStats.id,
            timestamp: new Date().toISOString(),
            disciplina: currentSessionStats.disciplina,
            totalQuestions: currentSessionStats.totalQuestions,
            answeredCount: currentSessionStats.answeredCount,
            correctCount: currentSessionStats.correctCount,
            durationMs: durationMs
        };
        try {
            const existingSummaries = JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY) || '[]');
            if (!Array.isArray(existingSummaries)) throw new Error("Formato inválido no localStorage");
            const index = existingSummaries.findIndex(s => s.id === summary.id);
            if (index === -1) {
                existingSummaries.push(summary);
            } else {
                existingSummaries[index] = summary;
            }
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries));
            console.log(`Resumo da sessão ${summary.id} salvo/atualizado. Respondidas: ${summary.answeredCount}/${summary.totalQuestions}, Duração: ${summary.durationMs}ms`);
        } catch (error) {
            console.error("Erro ao salvar resumo da sessão no localStorage:", error);
            showStatus("Erro ao salvar o resumo da sessão.", "error");
        }
    }

    // === Função: Finalizar Sessão de Estudo ===
    function finalizeSession(openPanel = false) {
        if (currentSessionStats.totalQuestions === 0 || !currentSessionStats.id) return;
        const sessionId = currentSessionStats.id; console.log(`Finalizando sessão ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { try { console.log("Chamando timerPopupAPI.stopTimer()"); window.timerPopupAPI.stopTimer(); } catch (e) { console.error("Erro ao chamar stopTimer:", e); } } else { console.warn('Função timerPopupAPI.stopTimer() não encontrada.'); }
        saveSessionSummary(); // Salva o estado final
        const wasActive = currentSessionStats.id; resetSessionState();
        if (openPanel && wasActive) { console.log("finalizeSession: Condition openPanel=true met. Attempting to open panel."); if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') { try { console.log("Chamando timerPopupAPI.openPanel()"); window.timerPopupAPI.openPanel(); } catch (e) { console.error("Erro ao chamar openPanel:", e); } } else { console.warn('Função timerPopupAPI.openPanel() não encontrada.'); showStatus("Sessão finalizada e salva. Painel não disponível.", "info"); } } else if (wasActive) { console.log("finalizeSession: Condition openPanel=false met. NOT opening panel."); showStatus("Sessão finalizada e salva.", "success"); } console.log(`Sessão ${sessionId} finalizada.`);
    }

    // === Função: Lidar com Saída da Página ===
    function handleBeforeUnload(event) { if (currentSessionStats.id && currentSessionStats.totalQuestions > 0) { console.log("beforeunload: Finalizando sessão ativa..."); finalizeSession(false); } }

    // === Função: Parsear o Texto da API ===
    // (Esta função permanece a mesma)
    function parseGeneratedText(text, expectedType) {
        const questions = [];
        const startIndex = Math.min(
            text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity,
            text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity,
            text.indexOf("[META_SOURCE]") !== -1 ? text.indexOf("[META_SOURCE]") : Infinity,
            text.indexOf("[META_YEAR]") !== -1 ? text.indexOf("[META_YEAR]") : Infinity
        );
        const relevantText = startIndex !== Infinity ? text.substring(startIndex) : text;
        const questionBlocks = relevantText.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() !== '' && block.trim().toUpperCase().startsWith('[Q]'));

        if (questionBlocks.length === 0 && relevantText.trim() !== '') {
             console.warn("Nenhum bloco [SEP] encontrado ou nenhum bloco começa com [Q]. Tentando tratar como questão única se começar com [Q].");
             if (relevantText.trim().toUpperCase().startsWith('[Q]')) {
                 questionBlocks.push(relevantText.trim());
             } else {
                 console.error("Texto da API não reconhecido. Não começa com [Q] e não tem [SEP]s válidos:", relevantText);
                 return [{ id: `q-error-parse-${Date.now()}-global`, text: `Erro Crítico: Formato da resposta da API irreconhecível. Nenhum bloco [Q]...[SEP] detectado.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null }];
             }
        }

        questionBlocks.forEach((block, index) => {
            try {
                const questionData = {
                    id: `q-${Date.now()}-${index}`,
                    text: '', options: {}, correctAnswer: null, type: expectedType,
                    answered: false, resolution: null, image: null,
                    metaSource: null, metaYear: null
                };

                const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]|$)/i);
                if (qMatch && qMatch[1]) {
                    questionData.text = qMatch[1].trim();
                } else {
                     const linesBeforeOption = block.split(/\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]/i)[0];
                     questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                     if (!questionData.text) console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes dos marcadores.`);
                 }

                const lines = block.trim().split('\n');
                let foundCorrectAnswerMarker = false;
                let foundResolutionMarker = false;

                lines.forEach(line => {
                    line = line.trim();
                    if (/^\[META_SOURCE\]/i.test(line)) { questionData.metaSource = line.substring(13).trim(); }
                    else if (/^\[META_YEAR\]/i.test(line)) { questionData.metaYear = line.substring(11).trim(); }
                    else if (/^\[A\]/i.test(line)) questionData.options['A'] = line.substring(3).trim();
                    else if (/^\[B\]/i.test(line)) questionData.options['B'] = line.substring(3).trim();
                    else if (/^\[C\]/i.test(line)) questionData.options['C'] = line.substring(3).trim();
                    else if (/^\[D\]/i.test(line)) questionData.options['D'] = line.substring(3).trim();
                    else if (/^\[V\]/i.test(line)) questionData.options['V'] = line.substring(3).trim() || 'Verdadeiro';
                    else if (/^\[F\]/i.test(line)) questionData.options['F'] = line.substring(3).trim() || 'Falso';
                    else if (/^\[R\]/i.test(line)) { questionData.correctAnswer = line.substring(3).trim(); foundCorrectAnswerMarker = true; }
                    else if (/^\[G\]/i.test(line)) { questionData.suggestedAnswer = line.substring(3).trim(); foundCorrectAnswerMarker = true; }
                    else if (/^\[IMG\]/i.test(line)) { questionData.image = line.substring(5).trim(); }
                    else if (/^\[RES\]/i.test(line)) { questionData.resolution = line.substring(5).trim(); foundResolutionMarker = true; }
                });

                 if (expectedType === 'multipla_escolha' || expectedType === 'verdadeiro_falso') {
                     // ... (validações como no seu código original) ...
                 } else if (expectedType === 'dissertativa_curta') {
                    // ... (validações como no seu código original) ...
                 }

                 if (!questionData.text) {
                      console.error(`Erro ao processar bloco ${index + 1}: Enunciado [Q] vazio.`);
                       questions.push({ id: `q-error-${Date.now()}-${index}`, text: `Erro ao carregar esta questão: Enunciado vazio.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null });
                 } else if (questionData.type !== 'error') {
                     questions.push(questionData);
                 }
            } catch (error) {
                console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco Original:\n---\n", block, "\n---");
                questions.push({ id: `q-error-${Date.now()}-${index}`, text: `Erro ao carregar esta questão (${error.message}). Verifique o console.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null });
            }
        });
        return questions;
    }

    // === Função: Exibir Questões Parseadas ===
    // (Esta função permanece a mesma)
    function displayParsedQuestions(questionsArray) {
         questoesOutput.innerHTML = '';
         questionsDataStore = {};
         if (!questionsArray || questionsArray.length === 0) {
             questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada.</p>';
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

             if (qData.metaSource || qData.metaYear) {
                 const metaDiv = document.createElement('div'); metaDiv.className = 'question-meta';
                 if (qData.metaSource) { const sourceSpan = document.createElement('span'); sourceSpan.className = 'meta-source'; sourceSpan.textContent = qData.metaSource; metaDiv.appendChild(sourceSpan); }
                 if (qData.metaSource && qData.metaYear) { const separatorSpan = document.createElement('span'); separatorSpan.className = 'meta-separator'; separatorSpan.textContent = ' - '; metaDiv.appendChild(separatorSpan); }
                 if (qData.metaYear) { const yearSpan = document.createElement('span'); yearSpan.className = 'meta-year'; yearSpan.textContent = qData.metaYear; metaDiv.appendChild(yearSpan); }
                 questionDiv.appendChild(metaDiv);
             }

             const questionText = document.createElement('p');
             questionText.className = 'question-text';
             const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
             questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`;
             questionDiv.appendChild(questionText);

             if (qData.image) {
                 const imgElement = document.createElement('img'); imgElement.src = qData.image;
                 imgElement.alt = `Imagem para a questão ${index + 1}`; imgElement.className = 'question-image';
                 imgElement.onerror = () => { console.warn(`Erro ao carregar imagem: ${qData.image} para questão ${qData.id}`); imgElement.alt = `Erro ao carregar imagem para a questão ${index + 1}`; };
                 questionDiv.appendChild(imgElement);
             }

             if (qData.type === 'error') {
                 questionDiv.classList.add('question-error');
                 questoesOutput.appendChild(questionDiv);
                 return;
             }

             const optionsContainer = document.createElement('div'); optionsContainer.className = 'options-container';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                // ... (lógica de criação de botões de opção como no seu código original) ...
                 const optionKeys = (qData.type === 'multipla_escolha') ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort() : ['V', 'F'];
                 optionKeys.forEach(key => {
                     if (qData.options[key] !== undefined) {
                         const optionButton = document.createElement('button'); optionButton.className = 'option-btn'; optionButton.dataset.value = key;
                         const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                         const letterHTML = `<span class="option-letter">${key}</span>`; let contentText = '';
                         if (qData.type === 'verdadeiro_falso') { const label = (key === 'V') ? 'Verdadeiro' : 'Falso'; const text = sanitizedOptionText && sanitizedOptionText !== 'Verdadeiro' && sanitizedOptionText !== 'Falso' ? `: ${sanitizedOptionText}` : ''; contentText = `${label}${text}`; }
                         else { contentText = sanitizedOptionText; }
                         const contentHTML = `<span class="option-content">${contentText.replace(/\n/g, '<br>')}</span>`;
                         optionButton.innerHTML = letterHTML + contentHTML;
                         optionsContainer.appendChild(optionButton);
                     }
                 });
             } else if (qData.type === 'dissertativa_curta') {
                // ... (lógica para questão dissertativa como no seu código original) ...
                 const answerP = document.createElement('p'); answerP.className = 'dissertative-info';
                 let dissertativeText = `<i>Questão dissertativa.`;
                 if(qData.suggestedAnswer) { const sanitizedAnswer = qData.suggestedAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;"); dissertativeText += ` Resposta Sugerida: ${sanitizedAnswer}`; }
                 else { dissertativeText += ` Resposta não interativa.`; }
                 dissertativeText += `</i>`; answerP.innerHTML = dissertativeText;
                 optionsContainer.appendChild(answerP);
             }
             questionDiv.appendChild(optionsContainer);

             const feedbackArea = document.createElement('div'); feedbackArea.className = 'feedback-area';
            // ... (restante da criação da UI da questão como no seu código original) ...
             const feedbackDiv = document.createElement('div'); feedbackDiv.className = 'feedback-message'; feedbackDiv.style.display = 'none'; feedbackArea.appendChild(feedbackDiv);
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 const confirmButton = document.createElement('button'); confirmButton.className = 'confirm-answer-btn'; confirmButton.textContent = 'Responder'; confirmButton.disabled = true; feedbackArea.appendChild(confirmButton);
             }
             if (qData.resolution) {
                 const resolutionButton = document.createElement('button'); resolutionButton.className = 'view-resolution-btn'; resolutionButton.textContent = 'Ver Resolução'; resolutionButton.dataset.questionId = qData.id; resolutionButton.style.display = 'none'; feedbackArea.appendChild(resolutionButton);
             }
             questionDiv.appendChild(feedbackArea);
             if (qData.resolution) {
                 const resolutionDiv = document.createElement('div'); resolutionDiv.className = 'resolution-area'; resolutionDiv.style.display = 'none'; questionDiv.appendChild(resolutionDiv);
             }
             questoesOutput.appendChild(questionDiv);
         });
    }

    // === Funções de Interação com Questões ===
    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmAnswerBtn.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
    }

    // (Mantida a versão que salva a sessão após cada resposta)
    function handleConfirmAnswer(confirmButton) {
        console.log("handleConfirmAnswer triggered for button:", confirmButton);
        const questionDiv = confirmButton.closest('.question-item');
        if (!questionDiv) { /* ... erro ... */ return; }
        const userAnswer = questionDiv.dataset.selectedOption;
        const isAnswered = questionDiv.dataset.answered === 'true';
        if (!userAnswer || isAnswered) { /* ... aviso ... */ return; }
        if (!currentSessionStats.id) { /* ... aviso ... */ return; }

        const correctAnswer = questionDiv.dataset.correctAnswer;
        const isCorrect = userAnswer === correctAnswer;
        // ... (lógica de UI para feedback, como no seu código original)
         const feedbackDiv = questionDiv.querySelector('.feedback-message'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer);
         const resolutionButton = questionDiv.querySelector('.view-resolution-btn');
         questionDiv.dataset.answered = 'true'; questionDiv.classList.add('answered'); questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect'); allOptionButtons.forEach(btn => { btn.disabled = true; btn.classList.remove('selected-preview'); if (btn === originallySelectedButton) { btn.classList.add('selected'); } if (btn.dataset.value === correctAnswer) { btn.classList.add('correct-answer-highlight'); } }); confirmButton.disabled = true; if (feedbackDiv) { feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`; feedbackDiv.style.display = 'block'; }
         if (resolutionButton) { resolutionButton.style.display = 'inline-flex';}


        currentSessionStats.answeredCount++;
        if (isCorrect) { currentSessionStats.correctCount++; }
        console.log('Sessão atual (antes de salvar):', currentSessionStats);

        saveSessionSummary(); // Salva o progresso

        if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') {
            try { window.timerPopupAPI.updateStats(currentSessionStats.answeredCount, currentSessionStats.correctCount); }
            catch(e) { console.error("Erro ao chamar updateStats:", e); }
        } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); }

        if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
            console.log("Todas as questões foram respondidas!");
            showStatus("Simulado concluído! Verifique o painel de tempo.", "success");
            finalizeSession(true);
        }
    }

    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector('.resolution-area') : null;
        const questionData = questionsDataStore[questionId];
        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) { console.error(`Erro ao tentar mostrar resolução para questão ${questionId}.`); showStatus("Erro ao carregar a resolução.", "error"); return; }
        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, '<br>')}`;
        resolutionArea.style.display = 'block';
        resolutionButton.disabled = true;
        console.log(`Resolução exibida para ${questionId}`);
    }

    // === Função Principal: Gerar Questões (COM BUSCA TEMPORÁRIA DE CHAVE) ===
    async function handleGenerateQuestions() {
        hidePopup();
        if (currentSessionStats.id) {
            console.log("Gerando novas questões, finalizando sessão anterior...");
            finalizeSession(false);
        }

        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value;

        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { numQuestoesInput.focus(); return showError("Número de questões inválido (1-20)."); }
        if (!nivelQuestao) { nivelQuestaoSelect.focus(); return showError("Por favor, selecione o Nível das questões."); }
        if (!GEMINI_MODEL_TO_USE) { return showError("Erro Crítico: Modelo da API Gemini não configurado no frontend."); }


        const disciplinaParaSessao = disciplinaSelecionada || "Geral";
        console.log(`Iniciando geração com Gemini... Assunto: ${assunto}, Nível: ${nivelQuestao}, Modelo: ${GEMINI_MODEL_TO_USE}`);
        showLoading(true);
        clearOutput();

        let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre o Assunto Principal "${assunto}".\n`;
        if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
        prompt += `GENERE AS QUESTÕES COM NÍVEL DE DIFICULDADE ESTRITAMENTE: ${nivelQuestao.toUpperCase()}.\n`;
        prompt += `A complexidade, vocabulário e conceitos abordados devem ser consistentes com o nível ${nivelQuestao.toUpperCase()}.\n`;
        if (bibliografia) prompt += `Use a seguinte Bibliografia como inspiração/referência (se aplicável ao assunto): "${bibliografia}".\n`;
        prompt += `Tipo de questão desejada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;
        prompt += `Para cada questão, inclua os seguintes metadados IMEDIATAMENTE APÓS o marcador [Q] e ANTES de quaisquer outros marcadores ([A], [B], [V], [F], [G], [R], [IMG], [RES]).\n`;
        prompt += `- Fonte/Assunto: Use EXATAMENTE o formato "[META_SOURCE] Texto da fonte ou assunto".\n`;
        prompt += `- Ano de Geração/Referência: Use EXATAMENTE o formato "[META_YEAR] Ano".\n`;
        const currentYear = new Date().getFullYear();
        prompt += `Utilize o ano atual (${currentYear}) como padrão.\n`;
        prompt += `Formato de saída OBRIGATÓRIO:\n`;
        prompt += `- Separe CADA questão completa usando APENAS "[SEP]" como separador.\n`;
        prompt += `- Dentro de cada bloco de questão:\n`;
        prompt += `  - Inicie o enunciado OBRIGATORIAMENTE com "[Q] ".\n`;
        prompt += `  - (Opcional) Se a questão NECESSITAR de uma imagem... use EXATAMENTE o formato "[IMG] URL_ou_descrição_detalhada".\n`;
        switch (tipoQuestao) {
            case 'multipla_escolha': prompt += `  - Para CADA alternativa, use EXATAMENTE o formato "[A] texto...".\n  - Indique a resposta correta usando "[R] " seguido APENAS pela LETRA maiúscula (A, B, C ou D).\n`; break;
            case 'verdadeiro_falso': prompt += `  - Forneça a afirmação no enunciado [Q].\n  - Use "[V]" ou deixe vazio.\n  - Use "[F]" ou deixe vazio.\n  - Indique a resposta correta usando "[R] " seguido APENAS por "V" ou "F".\n`; break;
            case 'dissertativa_curta': prompt += `  - Forneça uma resposta/gabarito curto e direto usando "[G] ".\n`; break;
        }
        prompt += `  - Forneça uma resolução/explicação DETALHADA... usando OBRIGATORIAMENTE o formato "[RES] Texto...".\n`;
        prompt += `Exemplo Múltipla Escolha:\n[Q] ...\n[META_SOURCE] ...\n[META_YEAR] ...\n[A] ...\n[R] ...\n[RES] ...\n[SEP]\n`;
        prompt += `IMPORTANTE: Siga ESTRITAMENTE o formato. NÃO adicione NENHUMA outra formatação. Gere APENAS o texto das questões.`;

        let tempApiKeyFromBackend = null;

        try {
            console.log("Buscando API key da Netlify Function...");
            const keyResponse = await fetch('/.netlify/functions/get-api-key', { method: 'GET' });

            if (!keyResponse.ok) {
                const errorData = await keyResponse.json().catch(() => ({ error: "Falha ao buscar chave, resposta não JSON."}));
                throw new Error(`Falha ao buscar API key do backend: ${keyResponse.status} ${errorData.error || keyResponse.statusText}`);
            }
            const keyData = await keyResponse.json();
            tempApiKeyFromBackend = keyData.apiKey;

            if (!tempApiKeyFromBackend) {
                throw new Error("API key não foi recebida do backend.");
            }
            // ATENÇÃO: RISCO DE SEGURANÇA! A CHAVE ESTÁ NO CLIENTE AGORA.
            localStorage.setItem(TEMP_API_KEY_STORAGE_ID, tempApiKeyFromBackend);
            console.warn("AVISO DE SEGURANÇA: Chave da API temporariamente no localStorage.");


            const requestBodyToGemini = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500 * numQuestoes + 400,
                },
            };

            const fullApiUrl = `${GEMINI_API_URL_BASE}${GEMINI_MODEL_TO_USE}:generateContent?key=${tempApiKeyFromBackend}`;

            console.log("Fazendo chamada direta para a API Gemini...");
            const geminiApiResponse = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBodyToGemini)
            });

            const responseBodyText = await geminiApiResponse.text();
            let dataFromGemini;
            try {
                dataFromGemini = JSON.parse(responseBodyText);
            } catch (e) {
                console.error("Erro ao parsear resposta JSON da API Gemini:", responseBodyText);
                throw new Error(`Resposta inválida da API Gemini: ${geminiApiResponse.status}. Detalhe limitado: ${responseBodyText.substring(0,100)}...`);
            }

            if (!geminiApiResponse.ok) {
                const apiError = dataFromGemini.error || {};
                const detailMessage = apiError.message || `Erro HTTP ${geminiApiResponse.status} da API Gemini.`;
                 if (geminiApiResponse.status === 400 && detailMessage.includes("API key not valid")) {
                     throw new Error("Falha na API Gemini: A Chave da API (obtida do backend) não é válida.");
                 }
                throw new Error(detailMessage);
            }

            console.log("Resposta completa da API Gemini (direta):", dataFromGemini);

            let rawTextFromAPI = '';
            if (dataFromGemini.candidates && dataFromGemini.candidates.length > 0 &&
                dataFromGemini.candidates[0].content && dataFromGemini.candidates[0].content.parts &&
                dataFromGemini.candidates[0].content.parts.length > 0 && dataFromGemini.candidates[0].content.parts[0].text) {
                rawTextFromAPI = dataFromGemini.candidates[0].content.parts[0].text;
            } else if (dataFromGemini.promptFeedback && dataFromGemini.promptFeedback.blockReason) {
                 console.error("Prompt bloqueado pela API Gemini:", dataFromGemini.promptFeedback);
                 const blockReason = dataFromGemini.promptFeedback.blockReason;
                 const safetyRatings = dataFromGemini.promptFeedback.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ') || 'N/A';
                 throw new Error(`Seu prompt foi bloqueado pela API Gemini devido a: ${blockReason}. Detalhes: ${safetyRatings}.`);
            } else {
                console.error("Resposta inesperada da API Gemini (sem conteúdo válido):", dataFromGemini);
                throw new Error("Erro: A API Gemini retornou uma resposta vazia ou em formato inesperado.");
            }

            console.log("Texto cru extraído da API Gemini (direta):", rawTextFromAPI);

            const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);
            displayParsedQuestions(questionsArray);

            const validQuestions = questionsArray.filter(q => q.type !== 'error');
            const totalValidQuestions = validQuestions.length;
            // const errorQuestionsCount = questionsArray.length - totalValidQuestions; // Você já tinha isso

            if (totalValidQuestions > 0) {
                currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: totalValidQuestions, answeredCount: 0, correctCount: 0, disciplina: disciplinaParaSessao, startTime: Date.now() };
                console.log("Nova sessão iniciada:", currentSessionStats);

                if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
                     try { /* ... chamada ao startSession ... */ } catch (e) { console.error("Erro ao chamar startSession:", e); }
                     finalizeButton.style.display = 'inline-flex';
                     // ... mensagens de sucesso/aviso ...
                } else { /* ... aviso timer não encontrado ... */ }

                // ... (lógica de minimizar bloco e scrollIntoView como antes) ...
            } else {
                // ... (lógica de erro se nenhuma questão válida foi gerada) ...
                 if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                     showError(questionsArray[0].text);
                 } else { //  if (errorQuestionsCount > 0) ...
                     showError(`Erro: Nenhuma questão válida retornada pela API. Verifique o console.`);
                 }
                 resetSessionState();
            }

            let finishReason = null;
            if (dataFromGemini.candidates && dataFromGemini.candidates.length > 0 && dataFromGemini.candidates[0].finishReason) {
                finishReason = dataFromGemini.candidates[0].finishReason;
            }
            // ... (lógica de finishReason como antes) ...

        } catch (error) {
            console.error("Falha no fluxo de geração de questões:", error);
            showError(`Erro durante a geração: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState();
        } finally {
            // REMOVER A CHAVE DO LOCALSTORAGE - ESSENCIAL!
            if (localStorage.getItem(TEMP_API_KEY_STORAGE_ID)) {
                localStorage.removeItem(TEMP_API_KEY_STORAGE_ID);
                console.warn("AVISO DE SEGURANÇA: Chave da API temporária removida do localStorage.");
            }
            tempApiKeyFromBackend = null; // Limpa a variável da memória
            showLoading(false);
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded
