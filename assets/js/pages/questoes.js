// assets/js/pages/questoes.js (ou Simulados.js)

document.addEventListener('DOMContentLoaded', () => {

    // === Elementos do DOM ===
    const assuntoInput = document.getElementById('assuntoInput');
    const bibliografiaInput = document.getElementById('bibliografiaInput');
    const disciplinaSelect = document.getElementById('disciplinaSelect');
    const numQuestoesInput = document.getElementById('numQuestoesInput');
    const tipoQuestaoSelect = document.getElementById('tipoQuestaoSelect');
    const nivelQuestaoSelect = document.getElementById('nivelQuestaoSelect'); // NOVO: Input Nível
    const generateButton = document.getElementById('generateButton');
    const questoesOutput = document.getElementById('questoesOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    // Removidos: errorDisplay e statusMessage (agora são popups)
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
    });

    window.addEventListener('beforeunload', handleBeforeUnload);

    // === Event Listeners do Popup ===
    if (popupCloseButton) {
        popupCloseButton.addEventListener('click', hidePopup);
    }
    if (popupOverlay) {
        // Fecha ao clicar no fundo (fora da caixa de mensagem)
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
        hidePopup(); // Esconde qualquer popup ao mostrar loading
        loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        generateButton.disabled = isLoading;
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        finalizeButton.style.display = 'none';
        console.log("Estado da sessão resetado.");
    }

    function clearOutput() {
        questoesOutput.innerHTML = '';
        hidePopup(); // Esconde popups ao limpar
        console.log("Output clear.");
    }

    // === Funções do Popup ===
    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
            console.error("Elementos do Popup não encontrados no DOM.");
            alert(message); // Fallback para alert simples
            return;
        }

        // Limpa timeout anterior se houver
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null;
        }

        popupContent.textContent = message;
        // Define a classe da caixa de mensagem para estilização (error, success, info, warning)
        popupMessageBox.className = `popup-message-box ${type}`;
        popupOverlay.classList.add('visible'); // Usa classe para controlar visibilidade e transição

        // Define fechamento automático se um delay for fornecido
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

    // --- Funções showStatus e showError atualizadas para usar o Popup ---
    function showError(message) {
        questoesOutput.innerHTML = ''; // Limpa questões se houver erro grave
        showPopup(message, 'error'); // Mostra popup de erro, sem auto-fechar
        resetSessionState();
        showLoading(false); // Garante que loading pare
    }

    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null); // Auto-fecha para success/info/warning após 5s
    }
    // --- Fim das funções de Popup ---


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
        // Tentativa de remover texto introdutório antes do primeiro [Q] ou [SEP]
        const startIndex = Math.min(
            text.indexOf("[Q]") !== -1 ? text.indexOf("[Q]") : Infinity,
            text.indexOf("[SEP]") !== -1 ? text.indexOf("[SEP]") : Infinity
        );
        const relevantText = startIndex !== Infinity ? text.substring(startIndex) : text; // Se não achar, usa o texto todo

        const questionBlocks = relevantText.trim().split(/\s*\[SEP\]\s*/i).filter(block => block.trim() !== '' && block.trim().toUpperCase().startsWith('[Q]')); // Garante que blocos comecem com [Q]

        if (questionBlocks.length === 0 && relevantText.trim() !== '') {
             console.warn("Nenhum bloco [SEP] encontrado ou nenhum bloco começa com [Q]. Tentando tratar como questão única se começar com [Q].");
             if (relevantText.trim().toUpperCase().startsWith('[Q]')) {
                 questionBlocks.push(relevantText.trim());
             } else {
                 console.error("Texto da API não reconhecido. Não começa com [Q] e não tem [SEP]s válidos:", relevantText);
                 // Retorna um erro que será pego posteriormente
                 return [{ id: `q-error-parse-${Date.now()}-global`, text: `Erro Crítico: Formato da resposta da API irreconhecível. Nenhum bloco [Q]...[SEP] detectado.`, type: 'error', options: {}, correctAnswer: null }];
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
                    answered: false
                };

                // Extrai o enunciado [Q]
                const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|$)/i);
                if (qMatch && qMatch[1]) {
                    questionData.text = qMatch[1].trim();
                } else {
                     // Fallback se [Q] estiver colado ou ausente, pega tudo até a primeira opção/resposta
                     const linesBeforeOption = block.split(/\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]/i)[0];
                     questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                     if (!questionData.text) {
                         console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes das opções/resposta.`);
                         throw new Error("Enunciado [Q] não encontrado ou vazio.");
                     }
                 }

                // Extrai opções e resposta
                const lines = block.trim().split('\n');
                let foundCorrectAnswerMarker = false; // Flag para [R] ou [G]

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
                        questionData.suggestedAnswer = line.substring(3).trim();
                        foundCorrectAnswerMarker = true; // Marca como 'resposta' encontrada para dissertativa
                    }
                });

                // Validação específica do tipo
                if (expectedType === 'multipla_escolha' || expectedType === 'verdadeiro_falso') {
                    if (!foundCorrectAnswerMarker) throw new Error(`Marcador de resposta [R] não encontrado.`);
                    if (!questionData.correctAnswer) throw new Error(`Valor da resposta [R] está vazio.`);
                    if (Object.keys(questionData.options).length === 0) throw new Error(`Nenhuma opção ([A],[B]... ou [V],[F]) encontrada.`);

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
                        // Garante que as chaves V/F existam no objeto options
                        if (questionData.options['V'] === undefined) questionData.options['V'] = 'Verdadeiro';
                        if (questionData.options['F'] === undefined) questionData.options['F'] = 'Falso';
                    }
                } else if (expectedType === 'dissertativa_curta') {
                    if (!foundCorrectAnswerMarker) throw new Error(`Gabarito [G] não encontrado.`);
                    if (!questionData.suggestedAnswer) throw new Error(`Valor do gabarito [G] está vazio.`);
                }

                questions.push(questionData);

            } catch (error) {
                console.error(`Erro ao processar bloco ${index + 1}:`, error, "\nBloco Original:\n---\n", block, "\n---");
                questions.push({
                    id: `q-error-${Date.now()}-${index}`,
                    text: `Erro ao carregar esta questão (${error.message}). Verifique o console para detalhes. Bloco: ${block.substring(0, 100)}...`, // Mostra início do bloco problemático
                    type: 'error',
                    options: {},
                    correctAnswer: null
                });
            }
        });
        return questions;
    }


    // === Função: Exibir Questões Parseadas ===
    function displayParsedQuestions(questionsArray) {
         questoesOutput.innerHTML = ''; if (!questionsArray || questionsArray.length === 0) { questoesOutput.innerHTML = '<p class="empty-state">Nenhuma questão foi gerada ou processada.</p>'; return; }
         questionsArray.forEach((qData, index) => { const questionDiv = document.createElement('div'); questionDiv.className = 'question-item'; questionDiv.id = qData.id; questionDiv.dataset.questionType = qData.type; questionDiv.dataset.answered = 'false'; if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') { questionDiv.dataset.correctAnswer = qData.correctAnswer || ''; questionDiv.dataset.selectedOption = ''; } const questionText = document.createElement('p'); questionText.className = 'question-text'; const sanitizedText = qData.text.replace(/</g, "&lt;").replace(/>/g, "&gt;"); questionText.innerHTML = `<strong>${index + 1}.</strong> ${sanitizedText.replace(/\n/g, '<br>')}`; questionDiv.appendChild(questionText); if (qData.type === 'error') { questionDiv.classList.add('question-error'); questoesOutput.appendChild(questionDiv); return; } const optionsContainer = document.createElement('div'); optionsContainer.className = 'options-container'; if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') { const optionKeys = (qData.type === 'multipla_escolha') ? Object.keys(qData.options).filter(k => ['A','B','C','D'].includes(k)).sort() : ['V', 'F']; optionKeys.forEach(key => { if (qData.options[key] !== undefined) { const optionButton = document.createElement('button'); optionButton.className = 'option-btn'; optionButton.dataset.value = key; const sanitizedOptionText = (qData.options[key] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;"); let buttonText = ''; if (qData.type === 'verdadeiro_falso') { buttonText = (key === 'V') ? 'Verdadeiro' : 'Falso'; if(sanitizedOptionText && sanitizedOptionText !== 'Verdadeiro' && sanitizedOptionText !== 'Falso') { buttonText += `: ${sanitizedOptionText}`; } } else { buttonText = `${key}) ${sanitizedOptionText}`; } optionButton.textContent = buttonText; optionsContainer.appendChild(optionButton); } }); } else if (qData.type === 'dissertativa_curta') { const answerP = document.createElement('p'); answerP.className = 'dissertative-info'; let dissertativeText = `<i>Questão dissertativa.`; if(qData.suggestedAnswer) { const sanitizedAnswer = qData.suggestedAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;"); dissertativeText += ` Resposta Sugerida: ${sanitizedAnswer}`; } else { dissertativeText += ` Resposta não interativa.`; } dissertativeText += `</i>`; answerP.innerHTML = dissertativeText; optionsContainer.appendChild(answerP); } questionDiv.appendChild(optionsContainer); if (qData.type === 'multipla_escolha' || qData.type === 'verdadeiro_falso') { const feedbackArea = document.createElement('div'); feedbackArea.className = 'feedback-area'; const feedbackDiv = document.createElement('div'); feedbackDiv.className = 'feedback-message'; feedbackDiv.style.display = 'none'; feedbackArea.appendChild(feedbackDiv); const confirmButton = document.createElement('button'); confirmButton.className = 'confirm-answer-btn'; confirmButton.textContent = 'Responder'; confirmButton.disabled = true; feedbackArea.appendChild(confirmButton); questionDiv.appendChild(feedbackArea); } questoesOutput.appendChild(questionDiv); });
    }

    // === Função: Lidar com Clique na OPÇÃO (Seleciona, não confirma) ===
    function handleOptionClick(clickedButton) {
        const questionDiv = clickedButton.closest('.question-item'); if (!questionDiv || questionDiv.dataset.answered === 'true') { return; } const confirmAnswerBtn = questionDiv.querySelector('.confirm-answer-btn'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const selectedValue = clickedButton.dataset.value; allOptionButtons.forEach(btn => btn.classList.remove('selected-preview')); clickedButton.classList.add('selected-preview'); questionDiv.dataset.selectedOption = selectedValue; console.log(`Set selectedOption=${selectedValue} on ${questionDiv.id}`); if (confirmAnswerBtn) { confirmAnswerBtn.disabled = false; console.log(`Enabled confirm button for ${questionDiv.id}`); } else { console.error("Botão .confirm-answer-btn não encontrado para", questionDiv.id); }
     }

    // === Função: Lidar com Clique no Botão RESPONDER (Confirma a resposta) ===
    function handleConfirmAnswer(confirmButton) {
         console.log("handleConfirmAnswer triggered for button:", confirmButton); const questionDiv = confirmButton.closest('.question-item'); console.log("Associated questionDiv:", questionDiv); if (!questionDiv) { console.error("Não foi possível encontrar o .question-item pai do botão."); return; } const userAnswer = questionDiv.dataset.selectedOption; const isAnswered = questionDiv.dataset.answered === 'true'; console.log("Checking conditions: ", { userAnswer: userAnswer, isAnswered: isAnswered, sessionId: currentSessionStats.id }); if (!userAnswer || isAnswered) { console.warn("Tentativa de confirmar resposta inválida: Nenhuma opção selecionada ou questão já respondida.", { selectedOption: userAnswer, isAnswered: isAnswered }); confirmButton.style.opacity = '0.5'; setTimeout(() => { confirmButton.style.opacity = '1'; }, 300); return; } if (!currentSessionStats.id) { console.warn("Tentativa de responder sem sessão ativa."); showStatus("Erro: Sessão não iniciada.", "error"); return; } console.log("Passed initial checks. Proceeding with answer evaluation..."); const correctAnswer = questionDiv.dataset.correctAnswer; const isCorrect = userAnswer === correctAnswer; const feedbackDiv = questionDiv.querySelector('.feedback-message'); const allOptionButtons = questionDiv.querySelectorAll('.option-btn'); const originallySelectedButton = Array.from(allOptionButtons).find(btn => btn.dataset.value === userAnswer); console.log(`Confirmando resposta para ${questionDiv.id}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`); questionDiv.dataset.answered = 'true'; questionDiv.classList.add('answered'); questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect'); allOptionButtons.forEach(btn => { btn.disabled = true; btn.classList.remove('selected-preview'); if (btn === originallySelectedButton) { btn.classList.add('selected'); } if (btn.dataset.value === correctAnswer) { btn.classList.add('correct-answer-highlight'); } }); confirmButton.disabled = true; if (feedbackDiv) { feedbackDiv.textContent = isCorrect ? 'Resposta Correta!' : `Incorreto. A resposta correta é: ${correctAnswer}`; feedbackDiv.style.display = 'block'; } else { console.warn("Elemento .feedback-message não encontrado para", questionDiv.id); } currentSessionStats.answeredCount++; if (isCorrect) { currentSessionStats.correctCount++; } console.log('Sessão atual:', currentSessionStats); if (window.timerPopupAPI && typeof window.timerPopupAPI.updateStats === 'function') { try { window.timerPopupAPI.updateStats( currentSessionStats.answeredCount, currentSessionStats.correctCount ); } catch(e) { console.error("Erro ao chamar updateStats:", e); } } else { console.warn('API do Timer Popup (updateStats) não encontrada.'); } if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) { console.log("Todas as questões foram respondidas!"); showStatus("Simulado concluído! Verifique o painel de tempo.", "success"); finalizeSession(true); }
     }

    // === Função Principal: Gerar Questões ===
    async function handleGenerateQuestions() {
        // 0. Finalizar sessão anterior e esconder popups
        hidePopup(); // Esconde popup antes de começar
        if (currentSessionStats.id) {
             console.log("Gerando novas questões, finalizando sessão anterior...");
             finalizeSession(false); // Finaliza sem abrir painel
        }

        // 1. Ler Inputs
        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplinaSelecionada = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value; // NOVO: Ler valor do nível

        // 2. Validar Inputs
        if (!assunto) { assuntoInput.focus(); return showError("Por favor, informe o Assunto Principal."); }
        if (isNaN(numQuestoes) || numQuestoes < 1 || numQuestoes > 20) { numQuestoesInput.focus(); return showError("Número de questões inválido (1-20)."); }
        if (!nivelQuestao) { nivelQuestaoSelect.focus(); return showError("Por favor, selecione o Nível das questões."); } // Validação básica para nível
        if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza') || GEMINI_API_KEY.length < 30) { return showError("Erro Crítico: Chave da API Gemini inválida ou ausente."); }

        const disciplinaParaSessao = disciplinaSelecionada || "Geral";

        // 3. Preparar UI
        console.log(`Iniciando geração... Assunto: ${assunto}, Nível: ${nivelQuestao}`);
        showLoading(true); // showLoading já chama hidePopup()
        clearOutput(); // clearOutput também chama hidePopup()

        // 4. Construir Prompt (Adicionado Nível)
        let prompt = `Gere ${numQuestoes} questão(ões) EXCLUSIVAMENTE sobre o Assunto Principal "${assunto}".\n`;
        if (disciplinaSelecionada) prompt += `Considere o contexto da Disciplina: "${disciplinaSelecionada}".\n`;
        prompt += `Nível de dificuldade desejado: ${nivelQuestao}.\n`; // NOVO: Incluir nível no prompt
        if (bibliografia) prompt += `Use a seguinte Bibliografia como inspiração/referência (se aplicável ao assunto): "${bibliografia}".\n`;
        prompt += `Tipo de questão desejada: ${tipoQuestao === 'multipla_escolha' ? 'Múltipla Escolha (A, B, C, D)' : tipoQuestao === 'verdadeiro_falso' ? 'Verdadeiro/Falso (V/F)' : 'Dissertativa Curta'}.\n`;
        prompt += `Formato de saída OBRIGATÓRIO:\n`;
        prompt += `- Separe CADA questão completa (enunciado, opções/gabarito, resposta) usando APENAS "[SEP]" como separador.\n`;
        prompt += `- Dentro de cada bloco de questão:\n`;
        prompt += `  - Inicie o enunciado OBRIGATORIAMENTE com "[Q] ".\n`;
        switch (tipoQuestao) {
            case 'multipla_escolha': prompt += `  - Para CADA alternativa, use EXATAMENTE o formato "[A] texto da alternativa A", "[B] texto da B", etc. (Use A, B, C, D).\n  - Indique a resposta correta usando "[R] " seguido APENAS pela LETRA maiúscula correta (A, B, C ou D). Ex: "[R] C".\nExemplo Múltipla Escolha:\n[Q] Qual a capital da França?\n[A] Londres\n[B] Berlim\n[C] Paris\n[D] Madri\n[R] C\n[SEP]\n`; break;
            case 'verdadeiro_falso': prompt += `  - Forneça a afirmação no enunciado [Q].\n  - Use "[V]" (pode adicionar justificativa curta após, ex: "[V] Sim, está correto pois...") ou deixe vazio.\n  - Use "[F]" (pode adicionar justificativa curta após, ex: "[F] Não, o correto seria...") ou deixe vazio.\n  - Indique a resposta correta usando "[R] " seguido APENAS por "V" ou "F". Ex: "[R] V".\nExemplo Verdadeiro/Falso:\n[Q] A Terra é plana?\n[V]\n[F] A Terra é um geoide.\n[R] F\n[SEP]\n`; break;
            case 'dissertativa_curta': prompt += `  - Forneça uma resposta/gabarito curto e direto usando "[G] ". Ex: "[G] Pedro Álvares Cabral.".\nExemplo Dissertativa Curta:\n[Q] Quem descobriu o Brasil?\n[G] Pedro Álvares Cabral.\n[SEP]\n`; break;
        }
        prompt += `\nIMPORTANTE: Siga ESTRITAMENTE o formato pedido usando os marcadores ([Q], [A], [B], [C], [D], [V], [F], [R], [G], [SEP]). NÃO adicione NENHUMA outra formatação, numeração automática, texto introdutório ou comentários fora do formato especificado. Gere APENAS o texto das questões conforme solicitado.`;

        // 5. Chamar API
        try {
            const requestBody = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { "temperature": 0.7, "maxOutputTokens": 350 * numQuestoes + 250 }, safetySettings: [ {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}, {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}, {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}, {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"} ]};
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
             if (!response.ok) { let errorBodyText = await response.text(); console.error("Raw API Error Response:", errorBodyText); let errorBody = {}; try { errorBody = JSON.parse(errorBodyText); } catch (e) {} const detailMessage = errorBody?.error?.message || `Erro HTTP ${response.status}`; if (detailMessage.includes("API key not valid")) { throw new Error("Falha na API Gemini: A Chave da API configurada não é válida."); } else { throw new Error(`Falha na comunicação com a API Gemini: ${detailMessage}`); } }
            const data = await response.json();
            if (data.promptFeedback?.blockReason) { console.error("Conteúdo bloqueado pela API:", data.promptFeedback); let blockDetails = `Motivo: ${data.promptFeedback.blockReason}`; if(data.promptFeedback.safetyRatings?.length > 0) { const blockedCategory = data.promptFeedback.safetyRatings.find(r => r.blocked)?.category; if (blockedCategory) blockDetails += ` - Categoria: ${blockedCategory}`; } showError(`A solicitação foi bloqueada por filtros de segurança (${blockDetails}). Tente reformular.`); return; }
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content?.parts?.length > 0 || !data.candidates[0].content.parts[0].text) { console.error("Resposta inesperada da API (sem candidatos/conteúdo válido):", data); showError("Erro: A API retornou uma resposta vazia ou em formato inesperado."); return; }

            // 6. Processar Resposta Válida
            const rawTextFromAPI = data.candidates[0].content.parts[0].text;
            const questionsArray = parseGeneratedText(rawTextFromAPI, tipoQuestao);
            displayParsedQuestions(questionsArray); // Exibe mesmo que haja erros parciais

            const validQuestions = questionsArray.filter(q => q.type !== 'error');
            const totalValidQuestions = validQuestions.length;
            const errorQuestionsCount = questionsArray.length - totalValidQuestions;

            if (totalValidQuestions > 0) {
                // INICIA A NOVA SESSÃO
                currentSessionStats = { id: `sess-${Date.now()}`, totalQuestions: totalValidQuestions, answeredCount: 0, correctCount: 0, disciplina: disciplinaParaSessao, startTime: Date.now() };
                console.log("Nova sessão iniciada:", currentSessionStats);

                // Inicia o timer no painel externo (se existir)
                if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
                     try { console.log(`Iniciando sessão no Timer Popup ID: ${currentSessionStats.id}`); window.timerPopupAPI.startSession( currentSessionStats.totalQuestions, currentSessionStats.disciplina ); console.log("handleGenerateQuestions SUCCESS: Called startSession."); } catch (e) { console.error("Erro ao chamar startSession:", e); }
                     finalizeButton.style.display = 'inline-flex';
                     // Mensagem de sucesso ajustada
                     let successMsg = `Geradas ${totalValidQuestions} questões! Acompanhe a sessão no painel abaixo.`;
                     if (totalValidQuestions < numQuestoes) {
                         successMsg = `Geradas ${totalValidQuestions} de ${numQuestoes} solicitadas. Acompanhe a sessão no painel abaixo!`;
                     }
                     if (errorQuestionsCount > 0) {
                         successMsg += ` (${errorQuestionsCount} questão(ões) tiveram erro no processamento.)`;
                         showStatus(successMsg, 'warning'); // Mostra como aviso se houve erros parciais
                     } else {
                         showStatus(successMsg, 'success'); // Mostra como sucesso se tudo ok
                     }

                } else { console.warn('API do Timer Popup (startSession) não encontrada.'); finalizeButton.style.display = 'inline-flex'; showStatus('Questões geradas, mas o timer externo não pôde ser iniciado.', 'warning'); }

                // Minimizar o bloco do formulário
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

                // Rolar para o TOPO da página
                setTimeout(() => {
                    window.scroll({ top: 0, behavior: 'smooth' });
                    console.log("Rolando para o topo da página...");
                }, 100);


            } else { // Nenhuma questão válida foi gerada
                 if (questionsArray.length > 0 && questionsArray.every(q => q.type === 'error')) {
                     // Se parseGeneratedText retornou apenas erros (incluindo o erro crítico de parse)
                     showError(questionsArray[0].text); // Mostra a mensagem de erro do primeiro item (pode ser o erro global)
                 } else if (errorQuestionsCount > 0) {
                     showError(`Erro: ${errorQuestionsCount} questão(ões) retornada(s) pela API tiveram erro no processamento e nenhuma foi válida. Verifique o console.`);
                 } else {
                     showError("Erro: Nenhuma questão foi retornada pela API ou o formato estava totalmente irreconhecível.");
                 }
                 resetSessionState();
             }

            // Avisa se a API interrompeu a geração
            const finishReason = data.candidates[0].finishReason;
             if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') { console.warn("Geração da API pode ter sido interrompida:", finishReason); showStatus(`Atenção: Geração pode ter sido interrompida (${finishReason}).`, 'warning'); }
             else if (finishReason === 'MAX_TOKENS' && totalValidQuestions < numQuestoes) { console.warn("Geração interrompida por MAX_TOKENS."); showStatus(`Atenção: Limite de texto atingido. ${totalValidQuestions} de ${numQuestoes} questões geradas.`, 'warning'); }

        } catch (error) {
            console.error("Falha na requisição ou processamento:", error);
            showError(`Erro durante a geração: ${error.message || 'Falha desconhecida.'}`);
            resetSessionState(); // Garante reset em caso de erro na chamada
        } finally {
            showLoading(false);
        }
    } // Fim de handleGenerateQuestions

}); // Fim do DOMContentLoaded
