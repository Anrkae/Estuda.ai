document.addEventListener('DOMContentLoaded', () => {

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

    const popupOverlay = document.getElementById('popupOverlay');
    const popupMessageBox = document.getElementById('popupMessageBox');
    const popupContent = document.getElementById('popupContent');
    const popupCloseButton = document.getElementById('popupCloseButton');

    const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
    const GEMINI_MODEL = 'gemini-1.5-flash-latest';
    const TEMP_API_KEY_STORAGE_ITEM = 'temp_gemini_api_key_val';

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null;
    let questionsDataStore = {};

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

    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
            console.error("Elementos do Popup não encontrados no DOM.");
            alert(message);
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

    function finalizeSession(openPanel = false) {
        if (currentSessionStats.totalQuestions === 0 || !currentSessionStats.id) return;
        const sessionId = currentSessionStats.id; console.log(`Finalizando sessão ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { try { console.log("Chamando timerPopupAPI.stopTimer()"); window.timerPopupAPI.stopTimer(); } catch (e) { console.error("Erro ao chamar stopTimer:", e); } } else { console.warn('Função timerPopupAPI.stopTimer() não encontrada.'); }
        saveSessionSummary(); const wasActive = currentSessionStats.id; resetSessionState();
        if (openPanel && wasActive) { console.log("finalizeSession: Condition openPanel=true met. Attempting to open panel."); if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') { try { console.log("Chamando timerPopupAPI.openPanel()"); window.timerPopupAPI.openPanel(); } catch (e) { console.error("Erro ao chamar openPanel:", e); } } else { console.warn('Função timerPopupAPI.openPanel() não encontrada.'); showStatus("Sessão finalizada e salva. Painel não disponível.", "info"); } } else if (wasActive) { console.log("finalizeSession: Condition openPanel=false met. NOT opening panel."); showStatus("Sessão finalizada e salva.", "success"); } console.log(`Sessão ${sessionId} finalizada.`);
    }

     function handleBeforeUnload(event) { if (currentSessionStats.id && currentSessionStats.totalQuestions > 0) { console.log("beforeunload: Finalizando sessão ativa..."); finalizeSession(false); } }

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
                     if (!foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Marcador de resposta [R] não encontrado.`);
                     if (!questionData.correctAnswer && foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Valor da resposta [R] está vazio.`);
                     if (Object.keys(questionData.options).length === 0) console.warn(`Bloco ${index+1}: Nenhuma opção ([A],[B]... ou [V],[F]) encontrada.`);
                     if (!foundResolutionMarker) console.warn(`Bloco ${index+1}: Resolução [RES] não encontrada.`);
                     if (!questionData.resolution && foundResolutionMarker) console.warn(`Bloco ${index+1}: Valor da resolução [RES] está vazio.`);
                    if (expectedType === 'multipla_escolha') {
                        const upperCaseCorrect = (questionData.correctAnswer || '').toUpperCase();
                        if (foundCorrectAnswerMarker && !['A', 'B', 'C', 'D'].includes(upperCaseCorrect)) console.warn(`Bloco ${index+1}: Resposta [R] "${questionData.correctAnswer}" inválida. Use A, B, C ou D.`);
                         if (foundCorrectAnswerMarker && questionData.options[upperCaseCorrect] === undefined) console.warn(`Bloco ${index+1}: Resposta [R] "${upperCaseCorrect}" não corresponde a nenhuma opção fornecida.`);
                        if (foundCorrectAnswerMarker) questionData.correctAnswer = upperCaseCorrect;
                    } else {
                        const upperCaseCorrect = (questionData.correctAnswer || '').toUpperCase();
                        if (upperCaseCorrect === 'VERDADEIRO' || upperCaseCorrect === 'V') questionData.correctAnswer = 'V';
                        else if (upperCaseCorrect === 'FALSO' || upperCaseCorrect === 'F') questionData.correctAnswer = 'F';
                         else if (foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Resposta [R] "${questionData.correctAnswer}" inválida para V/F. Use V ou F.`);
                         if (questionData.options['V'] === undefined) questionData.options['V'] = 'Verdadeiro';
                         if (questionData.options['F'] === undefined) questionData.options['F'] = 'Falso';
                    }
                } else if (expectedType === 'dissertativa_curta') {
                    if (!foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Gabarito [G] não encontrado.`);
                    if (!questionData.suggestedAnswer && foundCorrectAnswerMarker) console.warn(`Bloco ${index+1}: Valor do gabarito [G] está vazio.`);
                    if (foundResolutionMarker && !questionData.resolution) console.warn(`Bloco ${index+1}: Valor da resolução [RES] está vazio.`);
                }

                 if (!questionData.text) {
                      console.error(`Erro ao processar bloco ${index + 1}: Enunciado [Q] vazio.`);
                       questions.push({
                           id: `q-error-${Date.now()}-${index}`, text: `Erro ao carregar esta questão: Enunciado vazio.`,
                           type: 'error', options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
                       });
                 } else if (questionData.type !== 'error') {
                     questions.push(questionData);
                 }
            } catch (error) {
                console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco Original:\n---\n", block, "\n---");
                questions.push({
                    id: `q-error-${Date.now()}-${index}`,
                    text: `Erro ao carregar esta questão (${error.message}). Verifique o console.`,
                    type: 'error', options: {}, correctAnswer: null, resolution: null, image: null, metaSource: null, metaYear: null
                });
            }
        });
        return questions;
    }

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
                 const answerP = document.createElement('p'); answerP.className = 'dissertative-info';
                 let dissertativeText = `<i>Questão dissertativa.`;
                 if(qData.suggestedAnswer) { const sanitizedAnswer = qData.suggestedAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;"); dissertativeText += ` Resposta Sugerida: ${sanitizedAnswer}`; }
                 else { dissertativeText += ` Resposta não interativa.`; }
                 dissertativeText += `</i>`; answerP.innerHTML = dissertativeText;
                 optionsContainer.appendChild(answerP);
             }
             questionDiv.appendChild(optionsContainer);

             const feedbackArea = document.createElement('div'); feedbackArea.className = 'feedback-area';
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

    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmAnswerBtn.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
    }

    function handleConfirmAnswer(confirmButton) {
         console.log("handleConfirmAnswer triggered for button:", confirmButton); const questionDiv = confirmButton.closest('.question-item'); console.log("Associated questionDiv:", questionDiv); if (!questionDiv) { console.error("Não foi possível encontrar o .question-item pai do botão."); return; } const userAnswer = questionDiv.dataset.selectedOption; const isAnswered = questionDiv.dataset.answered === 'true'; console.log("Checking conditions: ", { userAnswer: userAnswer, isAnswered: isAnswered, sessionId: currentSessionStats.id }); if (!userAnswer || isAnswered) { console.warn("Tentativa de confirmar resposta inválida: Nenhuma opção selecionada ou questão já respondida.", { selectedOption: userAnswer, isAnswered: isAnswered }); confirmButton.style.opacity = '0.5'; setTimeout(() => { confirmButton.style.opacity = '1'; }, 300); return; } if (!currentSessionStats.id) { console.warn("Tentativa de responder sem sessão ativa."); showStatus("Erro: Sessão não iniciada.", "error"); return; } console.log("Passed initial checks. Proceeding with answer evaluation..."); const correctAnswer = questionDiv.dataset.correctAnswer; const isCorrect = userAnswer === correctAnswer; const feedbackDiv = questionDiv.querySelector('.feedback-message'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer);
         const resolutionButton = questionDiv.querySelector('.view-resolution-btn');
         console.log(`Confirmando resposta para ${questionDiv.id}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`); questionDiv.dataset.answered = 'true'; questionDiv.classList.add('answered'); questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect'); allOptionButtons.forEach(btn => { btn.disabled = true; btn.classList.remove('selected-preview'); if (btn === originallySelectedButton) { btn.classList.add('selected'); } if (btn.dataset.value === correctAnswer) { btn.classList.add('correct-answer-highlight'); } }); confirmButton.disabled = true; if (feedbackDiv) { feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`; feedbackDiv.style.display = 'block'; } else { console.warn("Elemento .feedback-message não encontrado para", questionDiv.id); }
         if (resolutionButton) { resolutionButton.style.display = 'inline-flex'; console.log(`Botão 'Ver Resolução' exibido para ${questionDiv.id}`); }
         currentSessionStats.answeredCount++; if (isCorrect) { currentSessionStats.correctCount++; } console.log('Sessão atual:', currentSessionStats); if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') { try { window.timerPopupAPI.updateStats( currentSessionStats.answeredCount, currentSessionStats.correctCount ); } catch(e) { console.error("Erro ao chamar updateStats:", e); } } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); } if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) { console.log("Todas as questões foram respondidas!"); showStatus("Simulado concluído! Verifique o painel de tempo.", "success"); finalizeSession(true); }
    }

    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector('.resolution-area') : null;
        const questionData = questionsDataStore[questionId];
        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) { console.error(`Erro ao tentar mostrar resolução para questão ${questionId}. Elementos ou dados não encontrados.`); showStatus("Erro ao carregar a resolução.", "error"); return; }
        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, '<br>')}`;
        resolutionArea.style.display = 'block';
        resolutionButton.disabled = true;
        console.log(`Resolução exibida para ${questionId}`);
    }

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
        if (!GEMINI_MODEL) { return showError("Erro Crítico: Modelo da API Gemini não configurado."); }

        showLoading(true);
        clearOutput();
        
        let fetchedApiKey;
        try {
            const apiKeyResponse = await fetch('/.netlify/functions/get-api-key');
            if (!apiKeyResponse.ok) {
                let errorMsg = `Falha ao buscar a API Key: ${apiKeyResponse.status}`;
                try {
                    const errorData = await apiKeyResponse.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore parsing error, use status code */ }
                throw new Error(errorMsg);
            }
            const apiKeyData = await apiKeyResponse.json();
            fetchedApiKey = apiKeyData.apiKey;
            if (!fetchedApiKey) {
                throw new Error('API Key não recebida da função Netlify ou está vazia.');
            }
            localStorage.setItem(TEMP_API_KEY_STORAGE_ITEM, fetchedApiKey);
        } catch (error) {
            console.error("Erro ao obter a API Key da função Netlify:", error);
            showError(`Erro ao obter a API Key: ${error.message}`);
            localStorage.removeItem(TEMP_API_KEY_STORAGE_ITEM);
            showLoading(false);
            return;
        }

        const disciplinaParaSessao = disciplinaSelecionada || "Geral";
        console.log(`Iniciando geração com Gemini... Assunto: ${assunto}, Nível: ${nivelQuestao}, Modelo: ${GEMINI_MODEL}`);
        
        const currentYear = new Date().getFullYear();
        let prompt = `Você é um assistente especialista na criação de questões para concursos públicos e exames de alta complexidade.\n`;
        prompt += `Sua tarefa é gerar EXATAMENTE ${numQuestoes} questão(ões) sobre o Assunto Principal: "${assunto}".\n`;
        if (disciplinaSelecionada) {
            prompt += `Considere o contexto específico da Disciplina: "${disciplinaSelecionada}".\n`;
        }
        prompt += `O Nível de Dificuldade das questões deve ser ESTRITAMENTE: ${nivelQuestao.toUpperCase()}. A complexidade, o vocabulário técnico e os conceitos abordados devem ser perfeitamente consistentes com este nível.\n`;
        if (bibliografia) {
            prompt += `Utilize a seguinte Bibliografia como principal fonte de inspiração e referência, se aplicável e relevante ao assunto: "${bibliografia}". As questões devem refletir o conteúdo e o estilo encontrados nesta bibliografia.\n`;
        }
        prompt += `Tipo de questão solicitada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha com quatro alternativas (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;
        prompt += `REQUISITOS CRÍTICOS PARA QUALIDADE E FORMATO:\n`;
        prompt += `1. PRECISÃO E RELEVÂNCIA: As questões devem ser factualmente corretas, precisas, claras, sem ambiguidades e altamente relevantes para o assunto, disciplina e nível especificados. O conteúdo deve ser rigoroso e adequado para preparação para concursos públicos.\n`;
        prompt += `2. METADADOS OBRIGATÓRIOS: Para CADA questão, IMEDIATAMENTE após o marcador [Q] e ANTES de qualquer outro marcador de opção ou resposta, inclua:\n`;
        prompt += `   - Fonte/Contexto: Use o formato "[META_SOURCE] Texto da fonte ou contexto". Ex: "Disciplina: ${disciplinaParaSessao}, Assunto: ${assunto}", ou o nome de um edital/banca, se a bibliografia sugerir.\n`;
        prompt += `   - Ano de Referência: Use o formato "[META_YEAR] Ano". Priorize ${currentYear} ou um ano relevante se a bibliografia ou o assunto indicarem (ex: ano de uma lei específica).\n`;
        prompt += `3. FORMATAÇÃO ESTRITA DE SAÍDA (NÃO DESVIE DESTE FORMATO):\n`;
        prompt += `   - Separe CADA questão completa (enunciado, metadados, imagem opcional, opções/gabarito, resposta correta e resolução detalhada) usando EXCLUSIVAMENTE "[SEP]" como separador. Nenhum texto ou caractere adicional entre blocos de questão.\n`;
        prompt += `   - DENTRO DE CADA BLOCO DE QUESTÃO:\n`;
        prompt += `     - Enunciado: OBRIGATORIAMENTE inicie com "[Q] ". Deve ser claro e completo.\n`;
        prompt += `     - Imagem (Opcional e Raro): Se ABSOLUTAMENTE NECESSÁRIO para a compreensão da questão, use "[IMG] URL_válida_da_imagem_ou_descrição_extremamente_detalhada_da_imagem". Use com moderação.\n`;
        prompt += `     - Alternativas/Gabarito:\n`;
        if (tipoQuestao === 'multipla_escolha') {
            prompt += `       - Para CADA uma das QUATRO alternativas, use o formato: "[A] Texto da alternativa A", "[B] Texto da alternativa B", etc. As alternativas devem ser plausíveis, mas apenas UMA deve ser inequivocamente correta.\n`;
            prompt += `       - Resposta Correta: Indique a resposta usando "[R] " seguido APENAS pela LETRA maiúscula da alternativa correta (A, B, C ou D).\n`;
        } else if (tipoQuestao === 'verdadeiro_falso') {
            prompt += `       - A afirmação estará no enunciado [Q].\n`;
            prompt += `       - Use "[V]" para a opção Verdadeiro (pode deixar o texto da opção vazio ou preencher com "Verdadeiro").\n`;
            prompt += `       - Use "[F]" para a opção Falso (pode deixar o texto da opção vazio ou preencher com "Falso").\n`;
            prompt += `       - Resposta Correta: Indique a resposta usando "[R] " seguido APENAS por "V" ou "F".\n`;
        } else {
            prompt += `       - Gabarito Esperado: Forneça uma resposta modelo concisa e direta usando "[G] Texto do gabarito esperado.".\n`;
        }
        prompt += `     - Resolução Detalhada ([RES]): OBRIGATORIAMENTE forneça uma resolução detalhada e didática usando "[RES] Texto da resolução.". Esta resolução deve explicar claramente por que a resposta correta é correta e, para múltipla escolha, por que as demais são incorretas. Para dissertativas, deve detalhar os pontos chave da resposta esperada.\n`;
        prompt += `4. FOCO NO CONTEÚDO: Gere APENAS o texto das questões conforme o formato. NÃO inclua introduções, despedidas, comentários, numeração automática fora do enunciado, ou qualquer texto que não faça parte das questões formatadas.\n`;
        prompt += `EXEMPLO DE QUESTÃO DE MÚLTIPLA ESCOLHA (NÍVEL MÉDIO):\n`;
        prompt += `[Q] De acordo com a Constituição Federal de 1988, qual princípio da administração pública NÃO está expressamente listado no caput do Art. 37?\n`;
        prompt += `[META_SOURCE] Direito Constitucional, Art. 37 CF/88\n`;
        prompt += `[META_YEAR] ${currentYear}\n`;
        prompt += `[A] Legalidade\n`;
        prompt += `[B] Eficiência\n`;
        prompt += `[C] Razoabilidade\n`;
        prompt += `[D] Publicidade\n`;
        prompt += `[R] C\n`;
        prompt += `[RES] O caput do Art. 37 da Constituição Federal de 1988 estabelece que a administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência (LIMPE). O princípio da Razoabilidade, embora aplicado na administração pública, não está expressamente listado no caput do Art. 37, sendo uma construção doutrinária e jurisprudencial.\n`;
        prompt += `[SEP]\n`;
        prompt += `Certifique-se de que TODAS as questões solicitadas sejam geradas, sigam TODOS os requisitos e o formato ESTRITO. A qualidade e precisão são cruciais.\n`;

        try {
            const apiKeyForGeminiCall = localStorage.getItem(TEMP_API_KEY_STORAGE_ITEM);
            if (!apiKeyForGeminiCall) {
                 throw new Error("API Key não encontrada no localStorage para a chamada Gemini. Isso não deveria acontecer se a busca inicial foi bem-sucedida.");
            }

            const requestBody = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 800 * numQuestoes + 500,
                },
            };

            const fullApiUrl = `${GEMINI_API_URL_BASE}${GEMINI_MODEL}:generateContent?key=${apiKeyForGeminiCall}`;

            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

             if (!response.ok) {
                 let errorBodyText = await response.text();
                 console.error("Raw Gemini API Error Response:", errorBodyText);
                 let errorBody = {};
                 try { errorBody = JSON.parse(errorBodyText); } catch (e) { console.error("Erro ao parsear erro JSON da Gemini:", e); }
                 const detailMessage = errorBody?.error?.message || `Erro HTTP ${response.status}`;
                 if (response.status === 400 && detailMessage.includes("API key not valid")) {
                     throw new Error("Falha na API Gemini: A Chave da API fornecida não é válida.");
                 } else if (response.status === 403) {
                     throw new Error(`Falha na API Gemini: Acesso proibido. Verifique as permissões da chave. ${detailMessage}`);
                 } else if (response.status === 429) {
                     throw new Error(`Falha na API Gemini: Limite de requisições atingido. Tente novamente mais tarde. ${detailMessage}`);
                 } else if (errorBody?.error?.status === "INVALID_ARGUMENT" && errorBody?.error?.message?.includes("resource name")){
                     throw new Error(`Falha na API Gemini: Modelo "${GEMINI_MODEL}" inválido ou não encontrado. Verifique o nome do modelo. ${detailMessage}`);
                 }
                 else {
                     throw new Error(`Falha na comunicação com a API Gemini: ${detailMessage}`);
                 }
             }

            const data = await response.json();
            console.log("Resposta completa da API Gemini:", data);

            if (data.error) {
                console.error("Erro retornado pela API Gemini:", data.error);
                const errorMessage = data.error.message || data.error.status || 'Erro desconhecido retornado pela API Gemini.';
                showError(`Erro da API Gemini: ${errorMessage}`);
                resetSessionState();
                return;
            }

            let rawTextFromAPI = '';
            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content && data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0 && data.candidates[0].content.parts[0].text) {
                rawTextFromAPI = data.candidates[0].content.parts[0].text;
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                 console.error("Prompt bloqueado pela API Gemini:", data.promptFeedback);
                 const blockReason = data.promptFeedback.blockReason;
                 const safetyRatings = data.promptFeedback.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ');
                 showError(`Erro: Seu prompt foi bloqueado pela API Gemini devido a: ${blockReason}. Detalhes: ${safetyRatings}. Tente reformular o assunto.`);
                 resetSessionState();
                 return;
            }
            else {
                console.error("Resposta inesperada da API Gemini (sem conteúdo válido):", data);
                showError("Erro: A API Gemini retornou uma resposta vazia ou em formato inesperado.");
                resetSessionState();
                return;
            }

            console.log("Texto cru extraído da API Gemini:", rawTextFromAPI);
            const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);
            displayParsedQuestions(questionsArray);

            const validQuestions = questionsArray.filter(q => q.type !== 'error');
            const totalValidQuestions = validQuestions.length;
            const errorQuestionsCount = questionsArray.length - totalValidQuestions;

            if (totalValidQuestions > 0) {
                currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: totalValidQuestions, answeredCount: 0, correctCount: 0, disciplina: disciplinaParaSessao, startTime: Date.now() };
                console.log("Nova sessão iniciada:", currentSessionStats);

                if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
                     try { console.log(`Iniciando sessão no Timer Popup ID: ${currentSessionStats.id}`); window.timerPopupAPI.startSession( currentSessionStats.totalQuestions, currentSessionStats.disciplina ); console.log("handleGenerateQuestions SUCCESS: Called startSession."); } catch (e) { console.error("Erro ao chamar startSession:", e); }
                     finalizeButton.style.display = 'inline-flex';
                     let successMsg = `Geradas ${totalValidQuestions} questões com Gemini! Acompanhe a sessão no painel abaixo.`;
                     if (totalValidQuestions < numQuestoes) {
                         successMsg = `Geradas ${totalValidQuestions} de ${numQuestoes} solicitadas com Gemini. Acompanhe a sessão no painel abaixo!`;
                     }
                     if (errorQuestionsCount > 0) {
                         successMsg += ` (${errorQuestionsCount} questão(ões) tiveram erro no processamento.)`;
                         showStatus(successMsg, 'warning');
                     } else {
                         showStatus(successMsg, 'success');
                     }

                } else { console.warn('API do Timer Popup (startSession) não encontrada.'); finalizeButton.style.display = 'inline-flex'; showStatus('Questões geradas com Gemini, mas o timer externo não pôde ser iniciado.', 'warning'); }

                if (generatorBlock && !generatorBlock.classList.contains('minimizado')) {
                    console.log("Minimizando bloco do gerador...");
                    const minimizeButton = generatorBlock.querySelector('.botao-minimizar');
                     if (minimizeButton) {
                         minimizeButton.click();
                     } else {
                         generatorBlock.classList.add('minimizado');
                         const toggleIcon = generatorBlock.querySelector('.botao-minimizar i');
                         if (toggleIcon) {
                             toggleIcon.classList.remove('fa-minus');
                             toggleIcon.classList.add('fa-plus');
                             if (generatorBlock.querySelector('.botao-minimizar')) {
                                 generatorBlock.querySelector('.botao-minimizar').setAttribute('aria-label', 'Expandir');
                             }
                         }
                     }
                }
                setTimeout(() => {
                     questoesOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     console.log("Rolando para o topo da área de questões...");
                }, 100);

            } else {
                 if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                     showError(questionsArray[0].text);
                 } else if (errorQuestionsCount > 0) {
                     showError(`Erro: ${errorQuestionsCount} questão(ões) retornada(s) pela API Gemini tiveram erro no processamento e nenhuma foi válida. Verifique o console.`);
                 } else {
                     showError("Erro: Nenhuma questão foi retornada pela API Gemini ou o formato estava totalmente irreconhecível.");
                 }
                 resetSessionState();
             }

            let finishReason = null;
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                finishReason = data.candidates[0].finishReason;
            }

            if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
                 console.warn("Geração da API Gemini pode ter sido interrompida:", finishReason);
                 showStatus(`Atenção: Geração Gemini pode ter sido interrompida (${finishReason}).`, 'warning');
            } else if (finishReason === 'MAX_TOKENS' && totalValidQuestions < numQuestoes) {
                 console.warn("Geração Gemini interrompida por MAX_TOKENS.");
                 showStatus(`Atenção: Limite de texto Gemini atingido. ${totalValidQuestions} de ${numQuestoes} questões geradas.`, 'warning');
            }

        } catch (error) {
            console.error("Falha na requisição ou processamento com Gemini:", error);
            showError(`Erro durante a geração com Gemini: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState();
        } finally {
            localStorage.removeItem(TEMP_API_KEY_STORAGE_ITEM);
            showLoading(false);
        }
    }
});
