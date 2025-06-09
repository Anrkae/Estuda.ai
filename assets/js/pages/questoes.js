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

    if (currentSessionStats.id) finalizeSession(false);

    const assunto = assuntoInput.value.trim();
    const bibliografia = bibliografiaInput.value.trim();
    const disciplinaSelecionada = disciplinaSelect.value;
    const numQuestoes = parseInt(numQuestoesInput.value, 10);
    const tipoQuestao = tipoQuestaoSelect.value;
    const nivelQuestao = nivelQuestaoSelect.value;

    if (!assunto) return assuntoInput.focus(), showError("Por favor, informe o Assunto Principal.");
    if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) return numQuestoesInput.focus(), showError("Número de questões inválido (1–20).");
    if (!nivelQuestao) return nivelQuestaoSelect.focus(), showError("Por favor, selecione o Nível das questões.");

    showLoading(true);
    clearOutput();

    const apiKey = localStorage.getItem('temp_gemini_api_key_val');
    if (!apiKey) {
        showError("API Key não encontrada no localStorage.");
        showLoading(false);
        return;
    }

    const modelo = "qwen-2-7b-instruct:free";
    const endpoint = "https://openrouter.ai/api/v1/chat/completions";

    const currentYear = new Date().getFullYear();
    const disciplinaParaSessao = disciplinaSelecionada || "Geral";

    let prompt = `Você é um gerador automático de questões de concursos públicos e exames técnicos.`;
    prompt += ` Gere exatamente ${numQuestoes} questões sobre "${assunto}".\n`;
    prompt += `Disciplina: "${disciplinaParaSessao}".\n`;
    prompt += `Nível: ${nivelQuestao.toUpperCase()}.\n`;
    if (bibliografia) prompt += `Use como referência a bibliografia: "${bibliografia}".\n`;

    prompt += `
REQUISITOS ABSOLUTOS (SIGA À RISCA, SEM DESVIAR):

1. FORMATO ESTRITO:
  • Cada questão deve começar com: [Q] Enunciado completo.
  • Depois, insira:
    [META_SOURCE] Origem da questão. Ex: "Disciplina: ${disciplinaParaSessao}, Assunto: ${assunto}"
    [META_YEAR] ${currentYear}
  • Se necessário, inclua:
    [IMG] URL_da_imagem ou descrição extremamente detalhada.
  • Alternativas e gabarito:
    ${tipoQuestao === 'multipla_escolha' ? `
      [A] Alternativa A
      [B] Alternativa B
      [C] Alternativa C
      [D] Alternativa D
      [R] Letra da resposta correta (A, B, C ou D)` : tipoQuestao === 'verdadeiro_falso' ? `
      [V] Verdadeiro
      [F] Falso
      [R] V ou F` : `
      [G] Gabarito objetivo da resposta esperada`}
  • Resolução obrigatória: [RES] Texto completo da explicação didática.

2. SAÍDA OBRIGATÓRIA:
  • Separe as questões com "[SEP]".
  • Não adicione introduções, explicações, comentários, numeração ou conteúdo fora do formato especificado.
  • Gere SOMENTE o conteúdo estruturado no padrão acima. Nenhuma frase fora do modelo.

3. QUALIDADE:
  • Seja 100% preciso, didático e objetivo.
  • Corrija erros, evite ambiguidade e forneça conteúdo tecnicamente correto.
  • Calcule corretamente se necessário. Evite questões com múltiplas interpretações.

IMPORTANTE: não gere menos do que ${numQuestoes} questões. Nunca quebre o formato nem repita blocos.

EXEMPLO:
[Q] Qual é a função do ribossomo nas células eucarióticas?
[META_SOURCE] Biologia Celular - Organelas
[META_YEAR] ${currentYear}
[A] Produção de ATP
[B] Digestão celular
[C] Síntese de proteínas
[D] Transporte de íons
[R] C
[RES] O ribossomo é responsável pela síntese de proteínas. Ele lê o RNA mensageiro e monta cadeias de aminoácidos. [SEP]
`;

    try {
        const resposta = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelo,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!resposta.ok) {
            const erroTexto = await resposta.text();
            throw new Error(`Erro HTTP ${resposta.status}: ${erroTexto}`);
        }

        const data = await resposta.json();
        const texto = data?.choices?.[0]?.message?.content;

        if (!texto) throw new Error("Resposta da IA veio vazia ou malformada.");

        const questionsArray = parseGeneratedText(texto, tipoQuestao);
        displayParsedQuestions(questionsArray);

        const validQuestions = questionsArray.filter(q => q.type !== 'error');
        const totalValid = validQuestions.length;
        const errors = questionsArray.length - totalValid;

        if (totalValid > 0) {
            currentSessionStats = {
                id: `sess-${Date.now()}`,
                totalQuestions: totalValid,
                answeredCount: 0,
                correctCount: 0,
                disciplina: disciplinaParaSessao,
                startTime: Date.now()
            };
            finalizeButton.style.display = 'inline-flex';
            showStatus(`Geradas ${totalValid} questões com OpenRouter (${modelo}).`, errors > 0 ? 'warning' : 'success');
        } else {
            showError("Nenhuma questão válida foi gerada.");
            resetSessionState();
        }
    } catch (err) {
        console.error("Erro ao gerar questões com OpenRouter:", err);
        showError(`Erro: ${err.message}`);
        resetSessionState();
    } finally {
        showLoading(false);
    }
}
});
