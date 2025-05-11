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

    // === Configuração da API OpenRouter ===
    const OPENROUTER_API_URL = `https://openrouter.ai/api/v1/chat/completions`;
    const OPENROUTER_MODEL = 'deepseek/deepseek-prover-v2:free'; // Ou o modelo que você preferir

    const RESULTS_STORAGE_KEY = 'sessoesEstudo';
    const DISCIPLINAS_STORAGE_KEY = 'disciplinas';

    // === Função para buscar a API Key da Netlify Function ===
    async function getOpenRouterApiKeyFromNetlify() {
        // Cache simples na window para evitar múltiplas chamadas na mesma sessão de página
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
                } catch (e) { /* ignora se não conseguir parsear json do erro */ }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (!data.apiKey) {
                throw new Error("Chave da API não recebida da função Netlify.");
            }
            window.openRouterApiKey = data.apiKey; // Armazena em cache
            return data.apiKey;
        } catch (error) {
            console.error("Erro crítico ao buscar a API Key da Netlify Function:", error);
            const outputElement = document.getElementById('questoesOutput'); 
            const loadingIndicatorElement = document.getElementById('loadingIndicator');
            const generateButtonElement = document.getElementById('generateButton');

            if (loadingIndicatorElement) loadingIndicatorElement.style.display = 'none';
            if (generateButtonElement) generateButtonElement.disabled = false;

            if (typeof showError === 'function') { 
                showError(`Falha crítica ao obter configuração da API: ${error.message}. A geração de questões não pode continuar. Por favor, recarregue a página ou contate o suporte.`);
            } else if (outputElement) {
                outputElement.innerHTML = `<p style="color: red; font-weight: bold;">Falha crítica ao obter configuração da API: ${error.message}. A geração de questões não pode continuar. Por favor, recarregue a página ou contate o suporte.</p>`;
            }
            return null; // Retorna null para indicar falha na obtenção da chave
        }
    }

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
        if (target.matches('.option-btn, .option-btn *')) {
             const optionBtn = target.closest('.option-btn');
             if (optionBtn && !optionBtn.disabled) { handleOptionClick(optionBtn); }
        }
        else if (target.matches('.confirm-answer-btn')) { if (!target.disabled) { handleConfirmAnswer(target); } }
        else if (target.matches('.view-resolution-btn')) { if (!target.disabled) { handleViewResolution(target); } }
    });

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
                         console.warn(`Bloco ${index+1}: Não encontrou [Q] nem texto antes dos marcadores.`);
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
                    } else if (foundResolutionMarker) {
                        questionData.resolution += '\n' + line;
                    }
                });
                if (!questionData.text) {
                    console.warn(`Questão ${index + 1} sem enunciado [Q]. Bloco:`, block);
                    questionData.text = "Erro: Enunciado da questão não encontrado.";
                    questionData.type = 'error';
                }
                if (Object.keys(questionData.options).length === 0 && (expectedType === 'ME' || expectedType === 'VF')) {
                    console.warn(`Questão ${index + 1} (${expectedType}) sem opções [A/B/C/D] ou [V/F]. Bloco:`, block);
                }
                if (!foundCorrectAnswerMarker && (expectedType === 'ME' || expectedType === 'VF')) {
                    console.warn(`Questão ${index + 1} (${expectedType}) sem gabarito [R]. Bloco:`, block);
                }
                questions.push(questionData);
                questionsDataStore[questionData.id] = questionData;
            } catch (parseError) {
                console.error(`Erro ao parsear bloco de questão ${index + 1}:`, parseError, "Bloco:", block);
                questions.push({
                    id: `q-error-parse-${Date.now()}-${index}`,
                    text: `Erro ao processar esta questão (Bloco ${index + 1}). Verifique o console para detalhes.`,
                    type: 'error',
                    options: {}, correctAnswer: null, resolution: null, image: null
                });
            }
        });
        return questions;
    }

    function renderQuestions(questions, numTotal) {
        clearOutput();
        finalizeButton.style.display = 'block';
        currentSessionStats.totalQuestions = numTotal;
        currentSessionStats.answeredCount = 0;
        currentSessionStats.correctCount = 0;
        currentSessionStats.id = `sessao-${Date.now()}`;
        currentSessionStats.startTime = Date.now();
        currentSessionStats.disciplina = disciplinaSelect.value;
        if (window.timerPopupAPI && typeof window.timerPopupAPI.startTimer === 'function') {
            try {
                window.timerPopupAPI.startTimer({
                    sessionId: currentSessionStats.id,
                    disciplina: currentSessionStats.disciplina,
                    totalQuestoes: currentSessionStats.totalQuestions
                });
            } catch (e) {
                console.error("Erro ao chamar startTimer:", e);
            }
        } else {
            console.warn('Função timerPopupAPI.startTimer() não encontrada.');
        }
        if (!questions || questions.length === 0) {
            showError("Nenhuma questão foi gerada ou recebida corretamente.");
            return;
        }
        questions.forEach((qData, index) => {
            if (qData.type === 'error') {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'questao-item error-item';
                errorDiv.innerHTML = `<p class="questao-texto"><strong>Questão ${index + 1}:</strong> ${qData.text}</p>`;
                questoesOutput.appendChild(errorDiv);
                return;
            }
            const questionDiv = document.createElement('div');
            questionDiv.className = 'questao-item';
            questionDiv.id = qData.id;
            let questionHTML = `<p class="questao-texto"><strong>Questão ${index + 1}:</strong> ${qData.text}</p>`;
            if (qData.metaSource || qData.metaYear) {
                questionHTML += `<div class="meta-info">`;
                if (qData.metaSource) questionHTML += `<span class="meta-source">Fonte/Assunto: ${qData.metaSource}</span>`;
                if (qData.metaYear) questionHTML += `<span class="meta-year">Ano: ${qData.metaYear}</span>`;
                questionHTML += `</div>`;
            }
            if (qData.image) {
                questionHTML += `<img src="${qData.image}" alt="Imagem da questão ${index + 1}" class="questao-imagem">`;
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
            questionHTML += `<button class="view-resolution-btn" data-questao-id="${qData.id}" style="display: none;">Ver Resolução</button>`;
            questionHTML += `<div class="feedback-container" data-questao-id="${qData.id}"></div>`;
            questionHTML += `<div class="resolution-container" data-questao-id="${qData.id}" style="display: none;"></div>`;
            questionDiv.innerHTML = questionHTML;
            questoesOutput.appendChild(questionDiv);
        });
        showStatus(`Sessão de estudo iniciada com ${numTotal} questões.`, 'info');
    }

    function handleOptionClick(optionButton) {
        const questionId = optionButton.dataset.questaoId;
        const selectedOptionKey = optionButton.dataset.opcao;
        const questionDiv = document.getElementById(questionId);
        questionDiv.querySelectorAll('.option-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });
        optionButton.classList.add('selected');
        const confirmButton = questionDiv.querySelector('.confirm-answer-btn');
        if (confirmButton) {
            confirmButton.disabled = false;
        }
        questionsDataStore[questionId].selectedOption = selectedOptionKey;
    }

    function handleConfirmAnswer(confirmButton) {
        const questionId = confirmButton.dataset.questaoId;
        const questionData = questionsDataStore[questionId];
        const questionDiv = document.getElementById(questionId);
        const feedbackDiv = questionDiv.querySelector('.feedback-container');
        const resolutionButton = questionDiv.querySelector('.view-resolution-btn');
        const selectedOptionButton = questionDiv.querySelector('.option-btn.selected');
        if (!selectedOptionButton) {
            showStatus("Por favor, selecione uma opção antes de confirmar.", "warning");
            return;
        }
        const userAnswer = selectedOptionButton.dataset.opcao;
        const isCorrect = userAnswer === questionData.correctAnswer;
        feedbackDiv.innerHTML = isCorrect ?
            '<p class="feedback-correto">Resposta Correta!</p>' :
            `<p class="feedback-incorreto">Resposta Incorreta. A resposta correta era: ${questionData.correctAnswer}</p>`;
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
            showStatus("Todas as questões foram respondidas! Sessão concluída.", "success");
        }
    }

    function handleViewResolution(resolutionButton) {
        const questionId = resolutionButton.dataset.questaoId;
        const questionData = questionsDataStore[questionId];
        const questionDiv = document.getElementById(questionId);
        const resolutionDiv = questionDiv.querySelector('.resolution-container');
        if (questionData.resolution) {
            resolutionDiv.innerHTML = `<p class="resolution-title">Resolução:</p><p>${questionData.resolution.replace(/\n/g, '<br>')}</p>`;
            resolutionDiv.style.display = resolutionDiv.style.display === 'none' ? 'block' : 'none';
        } else {
            resolutionDiv.innerHTML = '<p>Nenhuma resolução disponível para esta questão.</p>';
            resolutionDiv.style.display = 'block';
        }
    }

    async function handleGenerateQuestions() {
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
            showError("Por favor, forneça um assunto ou uma bibliografia.");
            return;
        }
        if (isNaN(numQuestoes) || numQuestoes <= 0 || numQuestoes > 20) {
            showError("Número de questões inválido. Insira um valor entre 1 e 20.");
            return;
        }

        showLoading(true);
        clearOutput();
        resetSessionState();

        let promptContext = `Disciplina: ${disciplina}. `;
        if (assunto) promptContext += `Assunto Principal: ${assunto}. `;
        if (bibliografia) promptContext += `Baseado na bibliografia: ${bibliografia}. `;

        const tipoQuestaoDesc = {
            'ME': 'múltipla escolha com 4 alternativas (A, B, C, D)',
            'VF': 'verdadeiro ou falso (V ou F)',
            'D': 'dissertativa curta'
        }[tipoQuestao];

        const nivelQuestaoDesc = {
            'F': 'fácil',
            'M': 'médio',
            'DIF': 'difícil'
        }[nivelQuestao];

        let prompt = `
Você é um assistente especialista em criar questões para estudo e concursos.
Siga RIGOROSAMENTE o formato de saída especificado. NÃO adicione NENHUMA introdução, observação ou texto fora do formato.
Gere ${numQuestoes} questões do tipo "${tipoQuestaoDesc}" sobre o seguinte contexto:
${promptContext}
Nível de dificuldade: ${nivelQuestaoDesc}.

Formato OBRIGATÓRIO para CADA questão:
[Q] Enunciado da questão aqui. Pode incluir quebras de linha.
[META_SOURCE] Nome da Fonte Principal ou Assunto Detalhado (ex: "Lei 8.112/90 Art. 5 a 10" ou "Revolução Francesa - Período Jacobino")
[META_YEAR] Ano da Questão ou da Fonte (ex: "2023" ou "FCC 2019" ou "Livro X - 2010")
(Para múltipla escolha - ME):
[A] Texto da alternativa A.
[B] Texto da alternativa B.
[C] Texto da alternativa C.
[D] Texto da alternativa D.
[R] Letra da alternativa correta (A, B, C ou D).
(Para verdadeiro ou falso - VF):
[V] Afirmativa (se a questão for para julgar uma única afirmativa como V ou F).
[F] (Opcional, se [V] for usado, este campo não é necessário. Se a questão tiver duas opções explícitas "Verdadeiro" e "Falso" para escolher, use [V] e [F] como opções)
[R] Resposta correta (V ou F).
(Para dissertativa - D):
(Não adicione [A], [B], [C], [D], [V], [F] ou [R] para questões dissertativas)
[IMG] (Opcional) URL de uma imagem relevante para a questão, se aplicável. Use URLs HTTPS.
[RES] (Opcional) Resolução detalhada ou comentário sobre a questão. Pode incluir quebras de linha.

Separe CADA questão completa (do [Q] até o final de seus campos, incluindo [RES] se houver) com o marcador:
[SEP]

Exemplo para Múltipla Escolha:
[Q] Qual a capital da França?
[META_SOURCE] Geografia Europeia
[META_YEAR] 2024
[A] Berlim
[B] Madrid
[C] Paris
[D] Roma
[R] C
[RES] Paris é a capital e maior cidade da França.
[SEP]

Exemplo para Verdadeiro ou Falso:
[Q] O sol gira em torno da Terra.
[META_SOURCE] Astronomia Básica
[META_YEAR] 2024
[V] O sol gira em torno da Terra. (Este campo é opcional se a pergunta for direta para julgar V ou F)
[R] F
[RES] A Terra gira em torno do Sol (heliocentrismo).
[SEP]

Exemplo para Dissertativa:
[Q] Explique o conceito de fotossíntese.
[META_SOURCE] Biologia Celular
[META_YEAR] 2024
[RES] Fotossíntese é o processo pelo qual plantas e outros organismos convertem luz solar em energia química...
[SEP]

GERAR ${numQuestoes} QUESTÕES AGORA:
        `.trim();

        const referer = window.location.href;
        const title = document.title || 'Gerador de Questões';

        try {
            const apiKey = await getOpenRouterApiKeyFromNetlify();
            if (!apiKey) {
                showLoading(false);
                // A função getOpenRouterApiKeyFromNetlify já deve ter mostrado um erro na UI.
                return; // Interrompe a execução se a chave não for obtida.
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
                    errorMessage += ` Resposta não JSON: ${errorBody.substring(0, 200)}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                const generatedText = data.choices[0].message.content;
                const parsedQuestions = parseGeneratedText(generatedText, tipoQuestao);
                renderQuestions(parsedQuestions, numQuestoes);
            } else {
                console.error("Resposta da API não contém o conteúdo esperado:", data);
                showError("A API não retornou dados no formato esperado. Verifique o console.");
            }

        } catch (error) {
            console.error("Erro ao gerar questões:", error);
            // Se o erro for da obtenção da chave, ele já foi tratado em getOpenRouterApiKeyFromNetlify
            // Mas se for outro erro (ex: da API OpenRouter), mostramos aqui.
            if (!error.message.includes("Falha crítica ao obter configuração da API")) {
                 showError(`Erro ao gerar questões: ${error.message}`);
            }
        } finally {
            showLoading(false);
        }
    }
});
