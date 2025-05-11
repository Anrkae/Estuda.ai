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

    // === ConfiguraÃ§Ã£o da API OpenRouter === 
    // A CHAVE DA API SERÃ BUSCADA DA NETLIFY FUNCTION
    const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;
    const OPENROUTER_MODEL = 'openai/gpt-3.5-turbo'; // Ou o modelo que vocÃª preferir

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // === FunÃ§Ã£o para buscar a API Key da Netlify Function ===
    async function getOpenRouterApiKeyFromNetlify() {
        // Cache simples na window para evitar mÃºltiplas chamadas na mesma sessÃ£o de pÃ¡gina
        if (window.openRouterApiKey) {
            return window.openRouterApiKey;
        }
        try {
            const response = await fetch("/.netlify/functions/getApiKey"); // Endpoint da Netlify Function
            if (!response.ok) {
                let errorMsg = `Erro HTTP ${response.status} ao buscar chave da API.`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* ignora se nÃ£o conseguir parsear json do erro */ }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (!data.apiKey) {
                throw new Error("Chave da API nÃ£o recebida da funÃ§Ã£o Netlify.");
            }
            window.openRouterApiKey = data.apiKey; // Armazena em cache
            return data.apiKey;
        } catch (error) {
            console.error("Erro crÃ­tico ao buscar a API Key da Netlify Function:", error);
            // Tenta usar a funÃ§Ã£o showError global se existir, senÃ£o um fallback
            if (typeof showError === 'function') { 
                showError(`Falha crÃ­tica ao obter configuraÃ§Ã£o da API: ${error.message}. A geraÃ§Ã£o de questÃµes nÃ£o pode continuar. Por favor, recarregue a pÃ¡gina ou contate o suporte.`);
            } else if (questoesOutput) {
                questoesOutput.innerHTML = `<p style="color: red; font-weight: bold;">Falha crÃ­tica ao obter configuraÃ§Ã£o da API: ${error.message}. A geraÃ§Ã£o de questÃµes nÃ£o pode continuar. Por favor, recarregue a pÃ¡gina ou contate o suporte.</p>`;
            }
            // Garante que o loading seja desativado
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (generateButton) generateButton.disabled = false;
            return null; // Retorna null para indicar falha na obtenÃ§Ã£o da chave
        }
    }

    // --- VariÃ¡veis Globais ---
    let currentSessionStats = {
        id: null, totalQuestions: 0, answeredCount: 0,
        correctCount: 0, disciplina: null, startTime: null
    };
    let popupTimeoutId = null; // Para controlar o fechamento automÃ¡tico do popup
    let questionsDataStore = {}; // Armazena dados completos das questÃµes (incluindo resoluÃ§Ã£o)


    // === FunÃ§Ã£o: Popular Dropdown de Disciplinas ===
    function populateDisciplinaDropdown() {
        if (!disciplinaSelect) return; // Adiciona verificaÃ§Ã£o se o elemento existe
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
                    console.warn(`Dados em localStorage['${DISCIPLINAS_STORAGE_KEY}'] nÃ£o sÃ£o um array de objetos com a propriedade 'nome' string.`);
                }
            } catch (error) {
                console.error(`Erro ao parsear ou processar disciplinas do localStorage ('${DISCIPLINAS_STORAGE_KEY}'):`, error);
            }
        } else {
            console.log(`Nenhuma disciplina encontrada em localStorage['${DISCIPLINAS_STORAGE_KEY}'].`);
        }
    }

    // === Event Listeners ===
    if (generateButton) generateButton.addEventListener('click', handleGenerateQuestions);
    if (finalizeButton) finalizeButton.addEventListener('click', () => finalizeSession(true));

    if (questoesOutput) {
        questoesOutput.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('.option-btn, .option-btn *')) {
                 const optionBtn = target.closest('.option-btn');
                 if (optionBtn && !optionBtn.disabled) { handleOptionClick(optionBtn); }
            }
            else if (target.matches('.confirm-answer-btn')) { if (!target.disabled) { handleConfirmAnswer(target); } }
            else if (target.matches('.view-resolution-btn')) { if (!target.disabled) { handleViewResolution(target); } }
        });
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

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

    populateDisciplinaDropdown();


    // === FunÃ§Ãµes Auxiliares de UI ===
    function showLoading(isLoading) {
        if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'inline-flex' : 'none';
        if (generateButton) generateButton.disabled = isLoading;
        if (isLoading) hidePopup(); // Esconde popups quando o loading inicia
    }

    function resetSessionState() {
        currentSessionStats = { id: null, totalQuestions: 0, answeredCount: 0, correctCount: 0, disciplina: null, startTime: null };
        if (finalizeButton) finalizeButton.style.display = 'none';
        questionsDataStore = {};
        console.log("Estado da sessÃ£o e armazenamento de questÃµes resetados.");
    }

    function clearOutput() {
        if (questoesOutput) questoesOutput.innerHTML = '';
        hidePopup();
        console.log("Output clear.");
    }

    // === FunÃ§Ãµes do Popup ===
    function showPopup(message, type = 'info', autoCloseDelay = null) {
        if (!popupOverlay || !popupMessageBox || !popupContent) {
            console.error("Elementos do Popup nÃ£o encontrados no DOM.");
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
        if (questoesOutput) questoesOutput.innerHTML = '';
        showPopup(message, 'error');
        resetSessionState();
        showLoading(false);
    }

    function showStatus(message, type = 'info') {
        const autoClose = (type === 'success' || type === 'info' || type === 'warning');
        showPopup(message, type, autoClose ? 5000 : null);
    }

     // === FunÃ§Ã£o: Salvar Resumo da SessÃ£o ===
     function saveSessionSummary() {
        if (!currentSessionStats.id || currentSessionStats.totalQuestions === 0) return;
        console.log("Tentando salvar resumo da sessÃ£o ID:", currentSessionStats.id);
        let durationMs = 0; if(currentSessionStats.startTime) { durationMs = Date.now() - currentSessionStats.startTime; }
        let durationFromTimer = null;
        if (window.timerPopupAPI && typeof window.timerPopupAPI.getDuration === 'function') {
            try { 
                durationFromTimer = window.timerPopupAPI.getDuration(); 
                if (typeof durationFromTimer === 'object' && durationFromTimer !== null && typeof durationFromTimer.ms === 'number') { 
                    durationMs = durationFromTimer.ms; 
                } else if (typeof durationFromTimer === 'number') { 
                    durationMs = durationFromTimer; 
                } 
                console.log("DuraÃ§Ã£o obtida do timerPopupAPI:", durationMs); 
            } catch (e) { 
                console.error("Erro ao chamar getDuration:", e); 
            }
        } else { 
            console.warn("FunÃ§Ã£o timerPopupAPI.getDuration() nÃ£o encontrada. Usando cÃ¡lculo manual."); 
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
            if (!Array.isArray(existingSummaries)) throw new Error("Formato invÃ¡lido no localStorage"); 
            const index = existingSummaries.findIndex(s => s.id === summary.id); 
            if (index === -1) { 
                existingSummaries.push(summary); 
            } else { 
                existingSummaries[index] = summary; 
            } 
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(existingSummaries)); 
            console.log(`Resumo da sessÃ£o ${summary.id} salvo com sucesso.`); 
        } catch (error) { 
            console.error("Erro ao salvar resumo da sessÃ£o no localStorage:", error); 
            showStatus("Erro ao salvar o resumo da sessÃ£o.", "error"); 
        }
    }

    // === FunÃ§Ã£o: Finalizar SessÃ£o de Estudo ===
    function finalizeSession(openPanel = false) {
        if (currentSessionStats.totalQuestions === 0 || !currentSessionStats.id) return;
        const sessionId = currentSessionStats.id; 
        console.log(`Finalizando sessÃ£o ID: ${sessionId}. Flag openPanel=${openPanel}`);
        if (window.timerPopupAPI && typeof window.timerPopupAPI.stopTimer === 'function') { 
            try { 
                console.log("Chamando timerPopupAPI.stopTimer()"); 
                window.timerPopupAPI.stopTimer(); 
            } catch (e) { 
                console.error("Erro ao chamar stopTimer:", e); 
            } 
        } else { 
            console.warn('FunÃ§Ã£o timerPopupAPI.stopTimer() nÃ£o encontrada.'); 
        }
        saveSessionSummary(); 
        const wasActive = currentSessionStats.id; 
        resetSessionState();
        if (openPanel && wasActive) { 
            console.log("finalizeSession: Condition openPanel=true met. Attempting to open panel."); 
            if (window.timerPopupAPI && typeof window.timerPopupAPI.openPanel === 'function') { 
                try { 
                    console.log("Chamando timerPopupAPI.openPanel()"); 
                    window.timerPopupAPI.openPanel(); 
                } catch (e) { 
                    console.error("Erro ao chamar openPanel:", e); 
                } 
            } else { 
                console.warn('FunÃ§Ã£o timerPopupAPI.openPanel() nÃ£o encontrada.'); 
                showStatus("SessÃ£o finalizada e salva. Painel nÃ£o disponÃ­vel.", "info"); 
            } 
        } else if (wasActive) { 
            console.log("finalizeSession: Condition openPanel=false met. NOT opening panel."); 
            showStatus("SessÃ£o finalizada e salva.", "success"); 
        } 
        console.log(`SessÃ£o ${sessionId} finalizada.`);
    }

     // === FunÃ§Ã£o: Lidar com SaÃ­da da PÃ¡gina ===
     function handleBeforeUnload(event) { 
         if (currentSessionStats.id && currentSessionStats.totalQuestions > 0) { 
             console.log("beforeunload: Finalizando sessÃ£o ativa..."); 
             finalizeSession(false); 
         } 
     }

    // === FunÃ§Ã£o: Parsear o Texto da API ===
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
             console.warn("Nenhum bloco [SEP] encontrado ou nenhum bloco comeÃ§a com [Q]. Tentando tratar como questÃ£o Ãºnica se comeÃ§ar com [Q].");
             if (relevantText.trim().toUpperCase().startsWith('[Q]')) {
                 questionBlocks.push(relevantText.trim());
             } else {
                 console.error("Texto da API nÃ£o reconhecido. NÃ£o comeÃ§a com [Q] e nÃ£o tem [SEP]s vÃ¡lidos:", relevantText);
                 return [{ id: `q-error-parse-${Date.now()}-global`, text: `Erro CrÃ­tico: Formato da resposta da API irreconhecÃ­vel. Nenhum bloco [Q]...[SEP] detectado.`, type: 'error', options: {}, correctAnswer: null, resolution: null, image: null }];
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
                    resolution: null,
                    image: null,
                    metaSource: null,
                    metaYear: null
                };
                const qMatch = block.match(/\[Q\]([\s\S]*?)(?:\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]|$)/i);
                if (qMatch && qMatch[1]) {
                    questionData.text = qMatch[1].trim();
                } else {
                     const linesBeforeOption = block.split(/\[META_SOURCE\]|\[META_YEAR\]|\[A\]|\[B\]|\[C\]|\[D\]|\[V\]|\[F\]|\[G\]|\[R\]|\[IMG\]|\[RES\]/i)[0];
                     questionData.text = linesBeforeOption.replace(/^\[Q\]/i, '').trim();
                     if (!questionData.text) {
                         console.warn(`Bloco ${index+1}: NÃ£o encontrou [Q] nem texto antes dos marcadores.`);
                     }
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
                    else if (/^\[R\]/i.test(line)) {
                        questionData.correctAnswer = line.substring(3).trim().toUpperCase();
                        foundCorrectAnswerMarker = true;
                    } else if (/^\[IMG\]/i.test(line)) {
                        questionData.image = line.substring(5).trim();
                    } else if (/^\[RES\]/i.test(line)) {
                        questionData.resolution = line.substring(5).trim();
                        foundResolutionMarker = true;
                    } else if (foundResolutionMarker && questionData.resolution !== null) { // Evita adicionar a linhas de resoluÃ§Ã£o se ela for null
                        questionData.resolution += '\n' + line;
                    }
                });
                if (!questionData.text) {
                    console.warn(`QuestÃ£o ${index + 1} sem enunciado [Q]. Bloco:`, block);
                    questionData.text = "Erro: Enunciado da questÃ£o nÃ£o encontrado.";
                    questionData.type = 'error';
                }
                if (Object.keys(questionData.options).length === 0 && (expectedType === 'ME' || expectedType === 'VF')) {
                    console.warn(`QuestÃ£o ${index + 1} (${expectedType}) sem opÃ§Ãµes [A/B/C/D] ou [V/F]. Bloco:`, block);
                }
                if (!foundCorrectAnswerMarker && (expectedType === 'ME' || expectedType === 'VF')) {
                    console.warn(`QuestÃ£o ${index + 1} (${expectedType}) sem gabarito [R]. Bloco:`, block);
                }
                questions.push(questionData);
                questionsDataStore[questionData.id] = questionData;
            } catch (parseError) {
                console.error(`Erro ao parsear bloco de questÃ£o ${index + 1}:`, parseError, "Bloco:", block);
                questions.push({
                    id: `q-error-parse-${Date.now()}-${index}`,
                    text: `Erro ao processar esta questÃ£o (Bloco ${index + 1}). Verifique o console para detalhes.`,
                    type: 'error',
                    options: {}, correctAnswer: null, resolution: null, image: null
                });
            }
        });
        return questions;
    }

    function renderQuestions(questions, numTotal) {
        clearOutput();
        if (finalizeButton) finalizeButton.style.display = 'block';
        currentSessionStats.totalQuestions = numTotal;
        currentSessionStats.answeredCount = 0;
        currentSessionStats.correctCount = 0;
        currentSessionStats.id = `sessao-${Date.now()}`;
        currentSessionStats.startTime = Date.now();
        currentSessionStats.disciplina = disciplinaSelect ? disciplinaSelect.value : 'N/A';
        
        if (window.timerPopupAPI && typeof window.timerPopupAPI.startSession === 'function') {
            window.timerPopupAPI.startSession(currentSessionStats.totalQuestions, currentSessionStats.disciplina);
        }

        if (!questions || questions.length === 0) {
            showError("Nenhuma questÃ£o foi gerada ou recebida corretamente.");
            return;
        }

        questions.forEach((qData, index) => {
            if (!questoesOutput) return;
            if (qData.type === 'error') {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'questao-item error-item';
                errorDiv.innerHTML = `<p class="questao-texto"><strong>QuestÃ£o ${index + 1}:</strong> ${qData.text}</p>`;
                questoesOutput.appendChild(errorDiv);
                return;
            }
            const questionDiv = document.createElement('div');
            questionDiv.className = 'questao-item';
            questionDiv.id = qData.id;
            let questionHTML = `<p class="questao-texto"><strong>QuestÃ£o ${index + 1}:</strong> ${qData.text}</p>`;
            if (qData.metaSource || qData.metaYear) {
                questionHTML += `<div class="meta-info">`;
                if (qData.metaSource) questionHTML += `<span class="meta-source">Fonte/Assunto: ${qData.metaSource}</span>`;
                if (qData.metaYear) questionHTML += `<span class="meta-year">Ano: ${qData.metaYear}</span>`;
                questionHTML += `</div>`;
            }
            if (qData.image) {
                questionHTML += `<img src="${qData.image}" alt="Imagem da questÃ£o ${index + 1}" class="questao-imagem">`;
            }
            if (qData.type === 'ME' || qData.type === 'VF') {
                questionHTML += '<div class="opcoes-container">';
                for (const key in qData.options) {
                    questionHTML += `
                        <button class="option-btn" data-questao-id="${qData.id}" data-opcao="${key}">
                            <span class="option-letter">${key})</span>
                            <span class="option-text">${qData.options[key]}</span>
                        </button>
                    `;
                }
                questionHTML += '</div>';
                questionHTML += `<button class="confirm-answer-btn" data-questao-id="${qData.id}" disabled>Confirmar Resposta</button>`;
            } else if (qData.type === 'D') {
                questionHTML += `<textarea class="dissertativa-input" data-questao-id="${qData.id}" placeholder="Digite sua resposta aqui..."></textarea>`;
            }
            questionHTML += `<button class="view-resolution-btn" data-questao-id="${qData.id}" style="display: none;">Ver ResoluÃ§Ã£o</button>`;
            questionHTML += `<div class="feedback-container" data-questao-id="${qData.id}"></div>`;
            questionHTML += `<div class="resolution-container" data-questao-id="${qData.id}" style="display: none;"></div>`;
            questionDiv.innerHTML = questionHTML;
            questoesOutput.appendChild(questionDiv);
        });
        showStatus(`SessÃ£o de estudo iniciada com ${numTotal} questÃµes.`, 'info');
    }

    function handleOptionClick(optionButton) {
        const questionId = optionButton.dataset.questaoId;
        const questionDiv = document.getElementById(questionId);
        if (!questionDiv) return;
        questionDiv.querySelectorAll('.option-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });
        optionButton.classList.add('selected');
        const confirmButton = questionDiv.querySelector('.confirm-answer-btn');
        if (confirmButton) {
            confirmButton.disabled = false;
        }
        if (questionsDataStore[questionId]) {
            questionsDataStore[questionId].selectedOption = optionButton.dataset.opcao;
        }
    }

    function handleConfirmAnswer(confirmButton) {
        const questionId = confirmButton.dataset.questaoId;
        const questionData = questionsDataStore[questionId];
        const questionDiv = document.getElementById(questionId);
        if (!questionData || !questionDiv) return;

        const feedbackDiv = questionDiv.querySelector('.feedback-container');
        const resolutionButton = questionDiv.querySelector('.view-resolution-btn');
        const selectedOptionButton = questionDiv.querySelector('.option-btn.selected');
        
        if (!selectedOptionButton) {
            showStatus("Por favor, selecione uma opÃ§Ã£o antes de confirmar.", "warning");
            return;
        }

        const userAnswer = selectedOptionButton.dataset.opcao;
        const isCorrect = userAnswer === questionData.correctAnswer;

        if (feedbackDiv) {
            feedbackDiv.innerHTML = isCorrect ?
                '<p class="feedback-correto">Resposta Correta!</p>' :
                `<p class="feedback-incorreto">Resposta Incorreta. A resposta correta era: ${questionData.correctAnswer}</p>`;
        }

        questionDiv.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.opcao === questionData.correctAnswer) {
                btn.classList.add('correct');
            }
            if (btn.dataset.opcao === userAnswer && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });
        confirmButton.disabled = true;
        if (resolutionButton && questionData.resolution) {
            resolutionButton.style.display = 'inline-block';
        }
        if (!questionData.answered) {
            questionData.answered = true;
            currentSessionStats.answeredCount++;
            if (isCorrect) {
                currentSessionStats.correctCount++;
            }
            saveSessionSummary();
        }
        if (currentSessionStats.answeredCount === currentSessionStats.totalQuestions) {
            showStatus("Todas as questÃµes foram respondidas! SessÃ£o concluÃ­da.", "success");
        }
    }

    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questaoId;
        const questionData = questionsDataStore[questionId];
        const questionDiv = document.getElementById(questionId);
        if (!questionData || !questionDiv) return;

        const resolutionDiv = questionDiv.querySelector('.resolution-container');
        if (resolutionDiv) {
            if (questionData.resolution) {
                resolutionDiv.innerHTML = `<p class="resolution-title">ResoluÃ§Ã£o:</p><p>${questionData.resolution.replace(/\n/g, '<br>')}</p>`;
                resolutionDiv.style.display = resolutionDiv.style.display === 'none' ? 'block' : 'none';
            } else {
                resolutionDiv.innerHTML = '<p>Nenhuma resoluÃ§Ã£o disponÃ­vel para esta questÃ£o.</p>';
                resolutionDiv.style.display = 'block';
            }
        }
    }

    async function handleGenerateQuestions() {
        // ValidaÃ§Ãµes de entrada
        if (!disciplinaSelect || !assuntoInput || !bibliografiaInput || !numQuestoesInput || !tipoQuestaoSelect || !nivelQuestaoSelect) {
            showError("Um ou mais elementos do formulÃ¡rio nÃ£o foram encontrados. Verifique o HTML.");
            return;
        }
        const assunto = assuntoInput.value.trim();
        const bibliografia = bibliografiaInput.value.trim();
        const disciplina = disciplinaSelect.value;
        const numQuestoes = parseInt(numQuestoesInput.value, 10);
        const tipoQuestao = tipoQuestaoSelect.value;
        const nivelQuestao = nivelQuestaoSelect.value;

        if (!disciplina) {
            showError("Por favor, selecione uma disciplina.");
            return;
        }
        if (!assunto && !bibliografia) {
            showError("Por favor, forneÃ§a um assunto ou uma bibliografia.");
            return;
        }
        if (isNaN(numQuestoes) || numQuestoes <= 0 || numQuestoes > 20) {
            showError("NÃºmero de questÃµes invÃ¡lido. Insira um valor entre 1 e 20.");
            return;
        }

        showLoading(true);
        clearOutput();
        resetSessionState();

        let promptContext = `Disciplina: ${disciplina}. `;
        if (assunto) promptContext += `Assunto Principal: ${assunto}. `;
        if (bibliografia) promptContext += `Baseado na bibliografia: ${bibliografia}. `;

        const tipoQuestaoDesc = {
            'ME': 'mÃºltipla escolha com 4 alternativas (A, B, C, D)',
            'VF': 'verdadeiro ou falso (V ou F)',
            'D': 'dissertativa curta'
        }[tipoQuestao];

        const nivelQuestaoDesc = {
            'F': 'fÃ¡cil',
            'M': 'mÃ©dio',
            'DIF': 'difÃ­cil'
        }[nivelQuestao];

        let prompt = `
VocÃª Ã© um assistente especialista em criar questÃµes para estudo e concursos.
Siga RIGOROSAMENTE o formato de saÃ­da especificado. NÃƒO adicione NENHUMA introduÃ§Ã£o, observaÃ§Ã£o ou texto fora do formato.
Gere ${numQuestoes} questÃµes do tipo "${tipoQuestaoDesc}" sobre o seguinte contexto:
${promptContext}
NÃ­vel de dificuldade: ${nivelQuestaoDesc}.

Formato OBRIGATÃ“RIO para CADA questÃ£o:
[Q] Enunciado da questÃ£o aqui. Pode incluir quebras de linha.
[META_SOURCE] Nome da Fonte Principal ou Assunto Detalhado (ex: "Lei 8.112/90 Art. 5 a 10" ou "RevoluÃ§Ã£o Francesa - PerÃ­odo Jacobino")
[META_YEAR] Ano da QuestÃ£o ou da Fonte (ex: "2023" ou "FCC 2019" ou "Livro X - 2010")
(Para mÃºltipla escolha - ME):
[A] Texto da alternativa A.
[B] Texto da alternativa B.
[C] Texto da alternativa C.
[D] Texto da alternativa D.
[R] Letra da alternativa correta (A, B, C ou D).
(Para verdadeiro ou falso - VF):
[V] Afirmativa (se a questÃ£o for para julgar uma Ãºnica afirmativa como V ou F).
[F] (Opcional, se [V] for usado, este campo nÃ£o Ã© necessÃ¡rio. Se a questÃ£o tiver duas opÃ§Ãµes explÃ­citas "Verdadeiro" e "Falso" para escolher, use [V] e [F] como opÃ§Ãµes)
[R] Resposta correta (V ou F).
(Para dissertativa - D):
(NÃ£o adicione [A], [B], [C], [D], [V], [F] ou [R] para questÃµes dissertativas)
[IMG] (Opcional) URL de uma imagem relevante para a questÃ£o, se aplicÃ¡vel. Use URLs HTTPS.
[RES] (Opcional) ResoluÃ§Ã£o detalhada ou comentÃ¡rio sobre a questÃ£o. Pode incluir quebras de linha.

Separe CADA questÃ£o completa (do [Q] atÃ© o final de seus campos, incluindo [RES] se houver) com o marcador:
[SEP]

Exemplo para MÃºltipla Escolha:
[Q] Qual a capital da FranÃ§a?
[META_SOURCE] Geografia Europeia
[META_YEAR] 2024
[A] Berlim
[B] Madrid
[C] Paris
[D] Roma
[R] C
[RES] Paris Ã© a capital e maior cidade da FranÃ§a.
[SEP]

Exemplo para Verdadeiro ou Falso:
[Q] O sol gira em torno da Terra.
[META_SOURCE] Astronomia BÃ¡sica
[META_YEAR] 2024
[V] O sol gira em torno da Terra. (Este campo Ã© opcional se a pergunta for direta para julgar V ou F)
[R] F
[RES] A Terra gira em torno do Sol (heliocentrismo).
[SEP]

Exemplo para Dissertativa:
[Q] Explique o conceito de fotossÃ­ntese.
[META_SOURCE] Biologia Celular
[META_YEAR] 2024
[RES] FotossÃ­ntese Ã© o processo pelo qual plantas e outros organismos convertem luz solar em energia quÃ­mica...
[SEP]

GERAR ${numQuestoes} QUESTÃ•ES AGORA:
        `.trim();

        const referer = window.location.href;
        const title = document.title || 'Gerador de QuestÃµes';

        try {
            const apiKey = await getOpenRouterApiKeyFromNetlify();
            if (!apiKey) {
                // A funÃ§Ã£o getOpenRouterApiKeyFromNetlify jÃ¡ deve ter mostrado um erro na UI e desativado o loading.
                return; // Interrompe a execuÃ§Ã£o se a chave nÃ£o for obtida.
            }

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': referer,
                    'X-Title': title
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage = `Erro da API OpenRouter: ${response.status} ${response.statusText}.`;
                try {
                    const errorJson = JSON.parse(errorBody);
                    if (errorJson.error && errorJson.error.message) {
                        errorMessage += ` Detalhes: ${errorJson.error.message}`;
                    }
                } catch (e) {
                    errorMessage += ` Resposta nÃ£o JSON: ${errorBody.substring(0, 200)}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                const generatedText = data.choices[0].message.content;
                const parsedQuestions = parseGeneratedText(generatedText, tipoQuestao);
                renderQuestions(parsedQuestions, numQuestoes);
            } else {
                console.error("Resposta da API nÃ£o contÃ©m o conteÃºdo esperado:", data);
                showError("A API nÃ£o retornou dados no formato esperado. Verifique o console.");
            }

        } catch (error) {
            console.error("Erro ao gerar questÃµes:", error);
            // Se o erro for da obtenÃ§Ã£o da chave, ele jÃ¡ foi tratado em getOpenRouterApiKeyFromNetlify
            // Mas se for outro erro (ex: da API OpenRouter), mostramos aqui, 
            // a menos que a mensagem de erro jÃ¡ indique falha na obtenÃ§Ã£o da API key.
            if (!error.message.includes("Falha crÃ­tica ao obter configuraÃ§Ã£o da API")) {
                 showError(`Erro ao gerar questÃµes: ${error.message}`);
            }
        } finally {
            showLoading(false);
        }
    }
});
