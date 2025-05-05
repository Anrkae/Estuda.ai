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

    // === Configuração da API ===
    // !!! ATENÇÃO: Mova a chave para um backend em produção !!!
    const GEMINI_API_KEY = 'AIzaSyDfmegc9Aue6YlTphmcVV0p_I9rgsKVXKs'; // Sua chave Gemini
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // --- Variáveis Globais ---
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null; // Para controlar o fechamento automático do popup
    let questionsDataStore = {}; // Armazena dados completos das questões (incluindo resolução)

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
        if (target.matches('.option-btn')) { if (!target.disabled) { handleOptionClick(target); } }
        else if (target.matches('.confirm-answer-btn')) { if (!target.disabled) { handleConfirmAnswer(target); } }
        else if (target.matches('.view-resolution-btn')) { if (!target.disabled) { handleViewResolution(target); } } // NOVO: Listener para botão de resolução
    });

    window.addEventListener('beforeunload', handleBeforeUnload);

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
    function showLoading(isLoading) {
        hidePopup();
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        finalizeButton.style.display = 'none';
        questionsDataStore = {}; // Limpa o armazenamento de dados das questões
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
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null;
        }
        popupContent.textContent = message;
        popupMessageBox.className = `popup-message-box ${type}`;
        popupOverlay.classList.add('visible');
        if (autoCloseDelay && typeof autoCloseDelay === 'number' && autoCloseDelay > 0) {
            popupTimeoutId = setTimeout(hidePopup, autoCloseDelay);
        }
    }

    function hidePopup() {
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null;
        }
        if (popupOverlay) {
            popupOverlay.classList.remove('visible');
        }
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

    // === Função: Finalizar Sessão de Estudo ===
    function finalizeSession(openPanel = false) {
        if (currentSessionStats.totalQuestions === 0 || !currentSessionStats.id) return;
        const sessionId = currentSessionStats.id; console.log(`Finalizando sessão ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { try { console.log("Chamando timerPopupAPI.stopTimer()"); window.timerPopupAPI.stopTimer(); } catch (e) { console.error("Erro ao chamar stopTimer:", e); } } else { console.warn('Função timerPopupAPI.stopTimer() não encontrada.'); }
        saveSessionSummary(); const wasActive = currentSessionStats.id; resetSessionState();
        if (openPanel && wasActive) { console.log("finalizeSession: Condition openPanel=true met. Attempting to open panel."); if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') { try { console.log("Chamando timerPopupAPI.openPanel()"); window.timerPopupAPI.openPanel(); } catch (e) { console.error("Erro ao chamar openPanel:", e); } } else { console.warn('Função timerPopupAPI.openPanel() não encontrada.'); showStatus("Sessão finalizada e salva. Painel não disponível.", "info"); } } else if (wasActive) { console.log("finalizeSession: Condition openPanel=false met. NOT opening panel."); showStatus("Sessão finalizada e salva.", "success"); } console.log(`Sessão ${sessionId} finalizada.`);
    }

     // === Função: Lidar com Saída da Página ===
     function handleBeforeUnload(event) { if (currentSessionStats.id && currentSessionStats.totalQuestions > 0) { console.log("beforeunload: Finalizando sessão ativa..."); finalizeSession(false); } }

    // === Função: Parsear o Texto da API ===
    function parseGeneratedText(text, expectedType) {
        const questions = [];
        const startIndex = Math.min(
            text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity,
            text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity
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
                    text: '',
                    options: {},
                    correctAnswer: null,
                    type: expectedType,
                    answered: false,
                    resolution: null, // NOVO: Campo para resolução
                    image: null       // NOVO: Campo para imagem (URL ou descrição)
                };

                // Extrai o enunciado [Q]
                const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]|$)/i);
                if (qMatch && qMatch[1]) {
                    questionData.text = qMatch[1].trim();
                } else {
                     const linesBeforeOption = block.split(/\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]/i)[0];
                     questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                     if (!questionData.text) {
                         console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes das opções/resposta/imagem/resolução.`);
                         throw new Error("Enunciado [Q] não encontrado ou vazio.");
                     }
                 }

                // Extrai opções, resposta, imagem e resolução
                const lines = block.trim().split('\n');
                let foundCorrectAnswerMarker = false;
                let foundResolutionMarker = false; // NOVO

                lines.forEach(line => {
                    line = line.trim();
                    if (/^\[A\]/i.test(line)) questionData.options['A'] = line.substring(3).trim();
                    else if (/^\[B\]/i.test(line)) questionData.options['B'] = line.substring(3).trim();
                    else if (/^\[C\]/i.test(line)) questionData.options['C'] = line.substring(3).trim();
                    else if (/^\[D\]/i.test(line)) questionData.options['D'] = line.substring(3).trim();
                    else if (/^\[V\]/i.test(line)) questionData.options['V'] = line.substring(3).trim() || 'Verdadeiro';
                    else if (/^\[F\]/i.test(line)) questionData.options['F'] = line.substring(3).trim() || 'Falso';
                    else if (/^\[R\]/i.test(line)) {
                        questionData.correctAnswer = line.substring(3).trim();
                        foundCorrectAnswerMarker = true;
                    } else if (/^\[G\]/i.test(line)) {
                        questionData.suggestedAnswer = line.substring(3).trim(); // Mantido para dissertativa
                        foundCorrectAnswerMarker = true;
                    } else if (/^\[IMG\]/i.test(line)) { // NOVO: Extrai Imagem
                        questionData.image = line.substring(5).trim();
                    } else if (/^\[RES\]/i.test(line)) { // NOVO: Extrai Resolução
                        questionData.resolution = line.substring(5).trim();
                        foundResolutionMarker = true;
                    }
                });

                // Validação específica do tipo
                if (expectedType === 'multipla_escolha' || expectedType === 'verdadeiro_falso') {
                    if (!foundCorrectAnswerMarker) throw new Error(`Marcador de resposta [R] não encontrado.`);
                    if (!questionData.correctAnswer) throw new Error(`Valor da resposta [R] está vazio.`);
                    if (Object.keys(questionData.options).length === 0) throw new Error(`Nenhuma opção ([A],[B]... ou [V],[F]) encontrada.`);
                    if (!foundResolutionMarker) throw new Error(`Resolução [RES] não encontrada.`); // NOVO: Exige resolução
                    if (!questionData.resolution) throw new Error(`Valor da resolução [RES] está vazio.`); // NOVO: Exige resolução

                    if (expectedType === 'multipla_escolha') {
                        const upperCaseCorrect = questionData.correctAnswer.toUpperCase();
                        if (!['A', 'B', 'C', 'D'].includes(upperCaseCorrect)) throw new Error(`Resposta [R] "${questionData.correctAnswer}" inválida. Use A, B, C ou D.`);
                        if (!questionData.options[upperCaseCorrect]) throw new Error(`Resposta [R] "${upperCaseCorrect}" não corresponde a nenhuma opção [${Object.keys(questionData.options).join(', ')}] fornecida.`);
                        questionData.correctAnswer = upperCaseCorrect;
                    } else { // verdadeiro_falso
                        const upperCaseCorrect = questionData.correctAnswer.toUpperCase();
                        if (upperCaseCorrect === 'VERDADEIRO' || upperCaseCorrect === 'V') questionData.correctAnswer = 'V';
                        else if (upperCaseCorrect === 'FALSO' || upperCaseCorrect === 'F') questionData.correctAnswer = 'F';
                        else throw new Error(`Resposta [R] "${questionData.correctAnswer}" inválida para V/F. Use V ou F.`);
                        if (questionData.options['V'] === undefined) questionData.options['V'] = 'Verdadeiro';
                        if (questionData.options['F'] === undefined) questionData.options['F'] = 'Falso';
                    }
                } else if (expectedType === 'dissertativa_curta') {
                    if (!foundCorrectAnswerMarker) throw new Error(`Gabarito [G] não encontrado.`);
                    if (!questionData.suggestedAnswer) throw new Error(`Valor do gabarito [G] está vazio.`);
                    // Resolução [RES] é opcional para dissertativa, mas se [RES] existir, o valor não pode ser vazio
                    if (foundResolutionMarker && !questionData.resolution) throw new Error(`Valor da resolução [RES] está vazio.`);
                }

                questions.push(questionData);

            } catch (error) {
                console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco Original:\n---\n", block, "\n---");
                questions.push({
                    id: `q-error-${Date.now()}-${index}`,
                    text: `Erro ao carregar esta questão (${error.message}). Verifique o console para detalhes. Bloco: ${block.substring(0, 100)}...`,
                    type: 'error',
                    options: {}, correctAnswer: null, resolution: null, image: null
                });
            }
        });
        return questions;
    }


    // === Função: Exibir Questões Parseadas ===
    function displayParsedQuestions(questionsArray) {
         questoesOutput.innerHTML = '';
         questionsDataStore = {}; // Limpa antes de adicionar novas
         if (!questionsArray || questionsArray.length === 0) {
             questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada.</p>';
             return;
         }
         questionsArray.forEach((qData, index) => {
             // Armazena dados completos para uso posterior (resolução)
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

             const questionText = document.createElement('p');
             questionText.className = 'question-text';
             const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
             questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`;
             questionDiv.appendChild(questionText);

             // NOVO: Adiciona imagem se existir
             if (qData.image) {
                 const imgElement = document.createElement('img');
                 imgElement.src = qData.image; // Assume que é uma URL válida
                 imgElement.alt = `Imagem para a questão ${index + 1}`;
                 imgElement.className = 'question-image';
                 // Adiciona tratamento de erro básico para a imagem
                 imgElement.onerror = () => {
                     console.warn(`Erro ao carregar imagem: ${qData.image} para questão ${qData.id}`);
                     imgElement.alt = `Erro ao carregar imagem para a questão ${index + 1}`;
                     // Opcional: Esconder a imagem ou mostrar um placeholder
                     // imgElement.style.display = 'none';
                 };
                 questionDiv.appendChild(imgElement);
             }

             if (qData.type === 'error') {
                 questionDiv.classList.add('question-error');
                 questoesOutput.appendChild(questionDiv);
                 return; // Pula o resto para questões com erro
             }

             const optionsContainer = document.createElement('div');
             optionsContainer.className = 'options-container';
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 const optionKeys = (qData.type === 'multipla_escolha') ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort() : ['V', 'F'];
                 optionKeys.forEach(key => {
                     if (qData.options[key] !== undefined) {
                         const optionButton = document.createElement('button');
                         optionButton.className = 'option-btn';
                         optionButton.dataset.value = key;
                         const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                         let buttonText = '';
                         if (qData.type === 'verdadeiro_falso') {
                             buttonText = (key === 'V') ? 'Verdadeiro' : 'Falso';
                             if(sanitizedOptionText && sanitizedOptionText !== 'Verdadeiro' && sanitizedOptionText !== 'Falso') {
                                 buttonText += `: ${sanitizedOptionText}`;
                             }
                         } else {
                             buttonText = `${key}) ${sanitizedOptionText}`;
                         }
                         optionButton.textContent = buttonText;
                         optionsContainer.appendChild(optionButton);
                     }
                 });
             } else if (qData.type === 'dissertativa_curta') {
                 const answerP = document.createElement('p');
                 answerP.className = 'dissertative-info';
                 let dissertativeText = `<i>Questão dissertativa.`;
                 if(qData.suggestedAnswer) {
                     const sanitizedAnswer = qData.suggestedAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                     dissertativeText += ` Resposta Sugerida: ${sanitizedAnswer}`;
                 } else {
                     dissertativeText += ` Resposta não interativa.`;
                 }
                 dissertativeText += `</i>`;
                 answerP.innerHTML = dissertativeText;
                 optionsContainer.appendChild(answerP);
             }
             questionDiv.appendChild(optionsContainer);

             // Feedback Area (agora contém feedback, botão responder E botão resolução)
             const feedbackArea = document.createElement('div');
             feedbackArea.className = 'feedback-area';

             const feedbackDiv = document.createElement('div');
             feedbackDiv.className = 'feedback-message';
             feedbackDiv.style.display = 'none';
             feedbackArea.appendChild(feedbackDiv);

             // Botão Responder (apenas para múltipla escolha e V/F)
             if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') {
                 const confirmButton = document.createElement('button');
                 confirmButton.className = 'confirm-answer-btn';
                 confirmButton.textContent = 'Responder';
                 confirmButton.disabled = true;
                 feedbackArea.appendChild(confirmButton);
             }

             // NOVO: Botão Ver Resolução (para todos os tipos, exceto erro)
             if (qData.resolution) { // Só adiciona se houver resolução
                 const resolutionButton = document.createElement('button');
                 resolutionButton.className = 'view-resolution-btn';
                 resolutionButton.textContent = 'Ver Resolução';
                 resolutionButton.dataset.questionId = qData.id; // Liga botão à questão
                 resolutionButton.style.display = 'none'; // Começa escondido
                 feedbackArea.appendChild(resolutionButton);
             }

             questionDiv.appendChild(feedbackArea);

             // NOVO: Área para exibir a resolução (começa vazia e escondida)
             if (qData.resolution) {
                 const resolutionDiv = document.createElement('div');
                 resolutionDiv.className = 'resolution-area';
                 resolutionDiv.style.display = 'none';
                 // O conteúdo será adicionado ao clicar no botão
                 questionDiv.appendChild(resolutionDiv);
             }

             questoesOutput.appendChild(questionDiv);
         });
    }

    // === Função: Lidar com Clique na OPÇÃO (Seleciona, não confirma) ===
    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmAnswerBtn.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
     }

    // === Função: Lidar com Clique no Botão RESPONDER (Confirma a resposta) ===
    function handleConfirmAnswer(confirmButton) {
         console.log("handleConfirmAnswer triggered for button:", confirmButton); const questionDiv = confirmButton.closest('.question-item'); console.log("Associated questionDiv:", questionDiv); if (!questionDiv) { console.error("Não foi possível encontrar o .question-item pai do botão."); return; } const userAnswer = questionDiv.dataset.selectedOption; const isAnswered = questionDiv.dataset.answered === 'true'; console.log("Checking conditions: ", { userAnswer: userAnswer, isAnswered: isAnswered, sessionId: currentSessionStats.id }); if (!userAnswer || isAnswered) { console.warn("Tentativa de confirmar resposta inválida: Nenhuma opção selecionada ou questão já respondida.", { selectedOption: userAnswer, isAnswered: isAnswered }); confirmButton.style.opacity = '0.5'; setTimeout(() => { confirmButton.style.opacity = '1'; }, 300); return; } if (!currentSessionStats.id) { console.warn("Tentativa de responder sem sessão ativa."); showStatus("Erro: Sessão não iniciada.", "error"); return; } console.log("Passed initial checks. Proceeding with answer evaluation..."); const correctAnswer = questionDiv.dataset.correctAnswer; const isCorrect = userAnswer === correctAnswer; const feedbackDiv = questionDiv.querySelector('.feedback-message'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer);
         const resolutionButton = questionDiv.querySelector('.view-resolution-btn'); // NOVO: Pega o botão de resolução

         console.log(`Confirmando resposta para ${questionDiv.id}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`); questionDiv.dataset.answered = 'true'; questionDiv.classList.add('answered'); questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect'); allOptionButtons.forEach(btn => { btn.disabled = true; btn.classList.remove('selected-preview'); if (btn === originallySelectedButton) { btn.classList.add('selected'); } if (btn.dataset.value === correctAnswer) { btn.classList.add('correct-answer-highlight'); } }); confirmButton.disabled = true; if (feedbackDiv) { feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`; feedbackDiv.style.display = 'block'; } else { console.warn("Elemento .feedback-message não encontrado para", questionDiv.id); }

         // NOVO: Mostra o botão 'Ver Resolução' após responder
         if (resolutionButton) {
             resolutionButton.style.display = 'inline-flex';
             console.log(`Botão 'Ver Resolução' exibido para ${questionDiv.id}`);
         }

         currentSessionStats.answeredCount++; if (isCorrect) { currentSessionStats.correctCount++; } console.log('Sessão atual:', currentSessionStats); if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') { try { window.timerPopupAPI.updateStats( currentSessionStats.answeredCount, currentSessionStats.correctCount ); } catch(e) { console.error("Erro ao chamar updateStats:", e); } } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); } if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) { console.log("Todas as questões foram respondidas!"); showStatus("Simulado concluído! Verifique o painel de tempo.", "success"); finalizeSession(true); }
     }

    // === NOVO: Função para Lidar com Clique no Botão VER RESOLUÇÃO ===
    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questionId;
        const questionDiv = document.getElementById(questionId);
        const resolutionArea = questionDiv ? questionDiv.querySelector('.resolution-area') : null;
        const questionData = questionsDataStore[questionId];

        if (!questionDiv || !resolutionArea || !questionData || !questionData.resolution) {
            console.error(`Erro ao tentar mostrar resolução para questão ${questionId}. Elementos ou dados não encontrados.`);
            showStatus("Erro ao carregar a resolução.", "error");
            return;
        }

        // Preenche e mostra a área de resolução
        // Sanitiza a resolução antes de inserir como HTML
        const sanitizedResolution = questionData.resolution.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolutionArea.innerHTML = `<strong>Resolução:</strong><br>${sanitizedResolution.replace(/\n/g, '<br>')}`;
        resolutionArea.style.display = 'block';

        // Opcional: Desabilitar ou esconder o botão após clique
        resolutionButton.disabled = true;
        // resolutionButton.style.display = 'none';

        console.log(`Resolução exibida para ${questionId}`);
    }

    // === Função Principal: Gerar Questões ===
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
        if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza') || GEMINI_API_KEY.length < 30) { return showError("Erro Crítico: Chave da API Gemini inválida ou ausente."); }

        const disciplinaParaSessao = disciplinaSelecionada || "Geral";

        console.log(`Iniciando geração... Assunto: ${assunto}, Nível: ${nivelQuestao}`);
        showLoading(true);
        clearOutput();

        // 4. Construir Prompt (Atualizado para Imagem e Resolução)
        let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre o Assunto Principal "${assunto}".\n`;
        if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
        prompt += `Nível de dificuldade desejado: ${nivelQuestao}.\n`;
        if (bibliografia) prompt += `Use a seguinte Bibliografia como inspiração/referência (se aplicável ao assunto): "${bibliografia}".\n`;
        prompt += `Tipo de questão desejada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;
        prompt += `Formato de saída OBRIGATÓRIO:\n`;
        prompt += `- Separe CADA questão completa (enunciado, imagem?, opções/gabarito, resposta, resolução) usando APENAS "[SEP]" como separador.\n`;
        prompt += `- Dentro de cada bloco de questão:\n`;
        prompt += `  - Inicie o enunciado OBRIGATORIAMENTE com "[Q] ".\n`;
        prompt += `  - (Opcional) Se a questão NECESSITAR de uma imagem para ser compreendida (ex: gráfico, mapa, figura geométrica), adicione uma URL pública da imagem (preferencialmente) ou uma descrição detalhada da imagem que você geraria, usando EXATAMENTE o formato "[IMG] URL_ou_descrição_detalhada". Use isso RARAMENTE, apenas quando essencial.\n`;
        switch (tipoQuestao) {
            case 'multipla_escolha': prompt += `  - Para CADA alternativa, use EXATAMENTE o formato "[A] texto da alternativa A", "[B] texto da B", etc. (Use A, B, C, D).\n  - Indique a resposta correta usando "[R] " seguido APENAS pela LETRA maiúscula correta (A, B, C ou D). Ex: "[R] C".\n`; break;
            case 'verdadeiro_falso': prompt += `  - Forneça a afirmação no enunciado [Q].\n  - Use "[V]" (pode adicionar justificativa curta após) ou deixe vazio.\n  - Use "[F]" (pode adicionar justificativa curta após) ou deixe vazio.\n  - Indique a resposta correta usando "[R] " seguido APENAS por "V" ou "F". Ex: "[R] V".\n`; break;
            case 'dissertativa_curta': prompt += `  - Forneça uma resposta/gabarito curto e direto usando "[G] ". Ex: "[G] Pedro Álvares Cabral.".\n`; break;
        }
        prompt += `  - Forneça uma resolução/explicação DETALHADA para a questão (mesmo para dissertativas), usando OBRIGATORIAMENTE o formato "[RES] Texto da explicação detalhada...". A explicação deve justificar a resposta correta e, se aplicável, por que as outras estão incorretas.\n`;
        prompt += `Exemplo Múltipla Escolha com Resolução:
[Q] Qual a capital da França?
[A] Londres
[B] Berlim
[C] Paris
[D] Madri
[R] C
[RES] Paris é a capital e maior cidade da França, localizada no norte do país, às margens do rio Sena. Londres é a capital da Inglaterra, Berlim da Alemanha e Madri da Espanha.
[SEP]
`;
        prompt += `Exemplo V/F com Imagem e Resolução:
[Q] A imagem abaixo mostra um triângulo equilátero?
[IMG] https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Regular_triangle.svg/200px-Regular_triangle.svg.png
[V]
[F]
[R] V
[RES] Sim, a imagem mostra um triângulo equilátero, que possui todos os três lados de igual comprimento e todos os três ângulos internos iguais a 60 graus.
[SEP]
`;
        prompt += `
IMPORTANTE: Siga ESTRITAMENTE o formato pedido usando os marcadores ([Q], [IMG], [A], [B], [C], [D], [V], [F], [R], [G], [RES], [SEP]). NÃO adicione NENHUMA outra formatação, numeração automática, texto introdutório ou comentários fora do formato especificado. Gere APENAS o texto das questões conforme solicitado. Certifique-se de que TODAS as questões de múltipla escolha e V/F tenham o marcador [RES] com uma explicação.`;

        try {
            const requestBody = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { "temperature": 0.7, "maxOutputTokens": 450 * numQuestoes + 300 }, safetySettings: [ {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}, {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}, {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}, {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"} ]};
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
             if (!response.ok) { let errorBodyText = await response.text(); console.error("Raw API Error Response:", errorBodyText); let errorBody = {}; try { errorBody = JSON.parse(errorBodyText); } catch (e) {} const detailMessage = errorBody?.error?.message || `Erro HTTP ${response.status}`; if (detailMessage.includes("API key not valid")) { throw new Error("Falha na API Gemini: A Chave da API configurada não é válida."); } else { throw new Error(`Falha na comunicação com a API Gemini: ${detailMessage}`); } }
            const data = await response.json();
            if (data.promptFeedback?.blockReason) { console.error("Conteúdo bloqueado pela API:", data.promptFeedback); let blockDetails = `Motivo: ${data.promptFeedback.blockReason}`; if(data.promptFeedback.safetyRatings?.length > 0) { const blockedCategory = data.promptFeedback.safetyRatings.find(r => r.blocked)?.category; if (blockedCategory) blockDetails += ` - Categoria: ${blockedCategory}`; } showError(`A solicitação foi bloqueada por filtros de segurança (${blockDetails}). Tente reformular.`); return; }
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content?.parts?.length > 0 || !data.candidates[0].content.parts[0].text) { console.error("Resposta inesperada da API (sem candidatos/conteúdo válido):", data); showError("Erro: A API retornou uma resposta vazia ou em formato inesperado."); return; }

            const rawTextFromAPI = data.candidates[0].content.parts[0].text;
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
                     let successMsg = `Geradas ${totalValidQuestions} questões! Acompanhe a sessão no painel abaixo.`;
                     if (totalValidQuestions < numQuestoes) {
                         successMsg = `Geradas ${totalValidQuestions} de ${numQuestoes} solicitadas. Acompanhe a sessão no painel abaixo!`;
                     }
                     if (errorQuestionsCount > 0) {
                         successMsg += ` (${errorQuestionsCount} questão(ões) tiveram erro no processamento.)`;
                         showStatus(successMsg, 'warning');
                     } else {
                         showStatus(successMsg, 'success');
                     }

                } else { console.warn('API do Timer Popup (startSession) não encontrada.'); finalizeButton.style.display = 'inline-flex'; showStatus('Questões geradas, mas o timer externo não pôde ser iniciado.', 'warning'); }

                if (generatorBlock && !generatorBlock.classList.contains('minimizado')) {
                    console.log("Minimizando bloco do gerador...");
                    generatorBlock.classList.add('minimizado');
                    const toggleBtn = generatorBlock.querySelector('.botao-minimizar');
                    const toggleIcon = toggleBtn ? toggleBtn.querySelector('i') : null;
                    if (toggleIcon) {
                        toggleIcon.classList.remove('fa-minus');
                        toggleIcon.classList.add('fa-plus');
                        if (toggleBtn) toggleBtn.setAttribute('aria-label', 'Expandir');
                    }
                }

                setTimeout(() => {
                    window.scroll({ top: 0, behavior: 'smooth' });
                    console.log("Rolando para o topo da página...");
                }, 100);

            } else {
                 if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                     showError(questionsArray[0].text);
                 } else if (errorQuestionsCount > 0) {
                     showError(`Erro: ${errorQuestionsCount} questão(ões) retornada(s) pela API tiveram erro no processamento e nenhuma foi válida. Verifique o console.`);
                 } else {
                     showError("Erro: Nenhuma questão foi retornada pela API ou o formato estava totalmente irreconhecível.");
                 }
                 resetSessionState();
             }

            const finishReason = data.candidates[0].finishReason;
             if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') { console.warn("Geração da API pode ter sido interrompida:", finishReason); showStatus(`Atenção: Geração pode ter sido interrompida (${finishReason}).`, 'warning'); }
             else if (finishReason === 'MAX_TOKENS' && totalValidQuestions < numQuestoes) { console.warn("Geração interrompida por MAX_TOKENS."); showStatus(`Atenção: Limite de texto atingido. ${totalValidQuestions} de ${numQuestoes} questões geradas.`, 'warning'); }

        } catch (error) {
            console.error("Falha na requisição ou processamento:", error);
            showError(`Erro durante a geração: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState();
        } finally {
            showLoading(false);
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded